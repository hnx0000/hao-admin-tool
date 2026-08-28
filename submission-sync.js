(() => {
  const endpoint = () => String(window.HAO_CONFIG?.submissionApiEndpoint || "").trim().replace(/\/$/, "");
  const rootEndpoint = () => endpoint().replace(/\/api\/submissions$/i, "").replace(/\/$/, "");
  const apiUrl = (path = "") => `${rootEndpoint()}/api/${String(path).replace(/^\//, "")}`;
  const readToken = () => String(sessionStorage.getItem("haoSubmissionAdminToken") || window.HAO_CONFIG?.submissionAdminToken || "").trim();
  let autoSyncTimer = 0;
  let latestChangeNonce = "";
  let syncInFlight = false;

  function isConfigured() {
    return /^https:\/\//i.test(endpoint()) || /^http:\/\/127\.0\.0\.1(?::\d+)?/i.test(endpoint());
  }

  function adminHeaders(jsonBody = false) {
    const token = readToken();
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(jsonBody ? { "Content-Type": "application/json" } : {}) };
  }

  function setAdminToken(token = "") {
    const value = String(token).trim();
    if (value) sessionStorage.setItem("haoSubmissionAdminToken", value);
    else sessionStorage.removeItem("haoSubmissionAdminToken");
  }

  async function responseJson(response, fallbackMessage) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.message || `${fallbackMessage} ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function submitProject(project, fileGroups = {}) {
    if (!isConfigured()) return { status: "local-only", reason: "submission-api-not-configured" };
    const body = new FormData();
    body.append("project", new Blob([JSON.stringify(project)], { type: "application/json" }), "project.json");
    Object.entries(fileGroups).forEach(([group, files]) => Array.from(files || []).forEach((file) => body.append(group, file, file.name)));
    const response = await fetch(apiUrl("submissions"), { method: "POST", body, headers: { "X-Idempotency-Key": project.id }, cache: "no-store" });
    return { status: "synced", ...await responseJson(response, "고객 접수 서버 오류") };
  }

  async function syncStoredProject(projectId) {
    if (!isConfigured()) return { status: "local-only", reason: "submission-api-not-configured" };
    const store = window.customerFileStore;
    if (!store) throw new Error("브라우저 파일 저장소를 열 수 없습니다.");
    const local = await store.getLocalSubmission(projectId);
    if (!local?.project) throw new Error("재전송할 로컬 접수 정보가 없습니다.");
    await store.updateSubmissionSync(projectId, "uploading", { lastError: "" });
    try {
      const result = await submitProject(local.project, await store.fileGroupsForProject(projectId));
      await store.updateSubmissionSync(projectId, "synced", { remoteSubmissionId: result.id || result.submissionId || "", remoteFiles: result.files || [], syncedAt: Date.now(), lastError: "" });
      return result;
    } catch (error) {
      await store.updateSubmissionSync(projectId, "failed", { lastError: error?.message || "업로드 실패" });
      throw error;
    }
  }

  async function retryPendingProjects() {
    if (!isConfigured() || !navigator.onLine || !window.customerFileStore) return [];
    const pending = await window.customerFileStore.listPendingSubmissions();
    const results = [];
    for (const item of pending.slice(0, 5)) {
      try { results.push(await syncStoredProject(item.projectId)); }
      catch (error) { console.warn("고객 접수 재전송에 실패했습니다.", item.projectId, error); }
    }
    return results;
  }

  async function listProjects() {
    if (!isConfigured()) return [];
    const response = await fetch(apiUrl("projects"), { headers: { Accept: "application/json", ...adminHeaders() }, cache: "no-store" });
    const data = await responseJson(response, "고객 접수 조회 오류");
    if (data.latestChange?.nonce) latestChangeNonce = data.latestChange.nonce;
    return Array.isArray(data) ? data : Array.isArray(data.projects) ? data.projects : [];
  }

  function remoteFileUrl(file) {
    if (!isConfigured() || !file?.submissionId || !file?.id) return "";
    return apiUrl(`projects/${encodeURIComponent(file.submissionId)}/files/${encodeURIComponent(file.id)}`);
  }

  async function downloadRemoteFile(file) {
    const url = remoteFileUrl(file);
    if (!url) throw new Error("서버 파일 주소가 없습니다.");
    const response = await fetch(url, { headers: adminHeaders(), cache: "no-store" });
    if (!response.ok) await responseJson(response, "서버 파일 다운로드 오류");
    return response.blob();
  }

  async function updateProjectState(project) {
    const remoteId = String(project?.cloudSubmissionId || project?.submissionId || "").trim();
    if (!isConfigured() || !remoteId) return { status: "local-only" };
    const response = await fetch(apiUrl(`projects/${encodeURIComponent(remoteId)}`), {
      method: "PATCH",
      headers: adminHeaders(true),
      body: JSON.stringify({ status: project.status || "", workflow: project.workflow || {} }),
      cache: "no-store",
    });
    return responseJson(response, "프로젝트 상태 저장 오류");
  }

  async function permanentlyDeleteProject(project, confirmName) {
    const remoteId = String(project?.cloudSubmissionId || project?.submissionId || "").trim();
    if (!isConfigured() || !remoteId) return { status: "local-only" };
    const intentResponse = await fetch(apiUrl(`projects/${encodeURIComponent(remoteId)}/delete-intent`), {
      method: "POST",
      headers: adminHeaders(true),
      body: JSON.stringify({ confirmName }),
      cache: "no-store",
    });
    const intent = await responseJson(intentResponse, "영구삭제 승인 오류");
    const deleteResponse = await fetch(apiUrl(`projects/${encodeURIComponent(remoteId)}`), {
      method: "DELETE",
      headers: { ...adminHeaders(true), "X-Delete-Token": intent.token },
      body: JSON.stringify({ confirmName }),
      cache: "no-store",
    });
    return responseJson(deleteResponse, "서버 영구삭제 오류");
  }

  async function checkForChanges(onChange) {
    if (!isConfigured() || !readToken() || syncInFlight || document.hidden || !navigator.onLine) return;
    syncInFlight = true;
    try {
      const response = await fetch(apiUrl("changes"), { headers: { Accept: "application/json", ...adminHeaders() }, cache: "no-store" });
      const data = await responseJson(response, "변경 상태 조회 오류");
      const nonce = String(data.latestChange?.nonce || "");
      if (nonce && latestChangeNonce && nonce !== latestChangeNonce) await onChange?.(data.latestChange);
      if (nonce) latestChangeNonce = nonce;
    } catch (error) {
      if (error?.status !== 401) console.warn("중앙 서버 자동 동기화 확인 실패", error);
    } finally {
      syncInFlight = false;
    }
  }

  function startAutoSync(onChange, intervalMs = 8000) {
    window.clearInterval(autoSyncTimer);
    if (!isConfigured()) return () => {};
    autoSyncTimer = window.setInterval(() => checkForChanges(onChange), Math.max(5000, intervalMs));
    const refresh = () => { if (!document.hidden) checkForChanges(onChange); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(autoSyncTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }

  window.addEventListener("online", () => retryPendingProjects().catch(() => {}));
  window.haoSubmissionSync = Object.freeze({
    isConfigured,
    setAdminToken,
    submitProject,
    syncStoredProject,
    retryPendingProjects,
    listProjects,
    remoteFileUrl,
    downloadRemoteFile,
    updateProjectState,
    permanentlyDeleteProject,
    startAutoSync,
  });
})();
