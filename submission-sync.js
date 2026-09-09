(() => {
  const endpoint = () => String(window.HAO_CONFIG?.submissionApiEndpoint || "").trim().replace(/\/$/, "");
  const rootEndpoint = () => endpoint().replace(/\/api\/submissions$/i, "").replace(/\/$/, "");
  const apiUrl = (path = "") => `${rootEndpoint()}/api/${String(path).replace(/^\//, "")}`;
  const readToken = () => String(sessionStorage.getItem("haoSubmissionAdminToken") || window.HAO_CONFIG?.submissionAdminToken || "").trim();
  let autoSyncTimer = 0;
  let latestChangeNonce = "";
  let syncInFlight = false;
  let stopAutoSync = null;
  const uploads = new Map();

  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.method === "POST" ? 120000 : 30000);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    catch (error) {
      if (error.name === "AbortError") throw new Error("서버 응답 시간이 초과되었습니다. 저장 여부를 확인하거나 같은 접수를 재전송해 주세요.");
      throw error;
    } finally { window.clearTimeout(timeout); }
  }

  function isConfigured() {
    if (typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).get("test") === "1") return false;
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
    let data;
    try { data = await response.json(); }
    catch { const error = new Error(`${fallbackMessage}: 서버 응답이 JSON이 아닙니다 (${response.status}).`); error.status = response.status; throw error; }
    if (!response.ok) {
      const error = new Error(data?.message || `${fallbackMessage} ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function submitProject(project, fileGroups = {}) {
    if (project?.localTestOnly) throw new Error("격리 시험 접수는 중앙 서버로 전송할 수 없습니다.");
    if (!isConfigured()) return { status: "local-only", reason: "submission-api-not-configured" };
    if (!project?.id) throw new Error("접수 ID가 없습니다. 전송을 중단했습니다.");
    if (uploads.has(project.id)) return uploads.get(project.id);
    const pending = uploadProject(project, fileGroups);
    uploads.set(project.id, pending);
    try { return await pending; } finally { uploads.delete(project.id); }
  }

  async function uploadProject(project, fileGroups) {
    const body = new FormData();
    body.append("project", new Blob([JSON.stringify(project)], { type: "application/json" }), "project.json");
    Object.entries(fileGroups).forEach(([group, files]) => Array.from(files || []).forEach((file) => body.append(group, file, file.name)));
    const response = await request(apiUrl("submissions"), { method: "POST", body, headers: { "X-Idempotency-Key": project.id }, cache: "no-store" });
    const result = await responseJson(response, "고객 접수 서버 오류");
    const remote = result.project || result.submission || result;
    if (!remote?.id && !remote?.submissionId && !result?.id && !result?.submissionId) throw new Error("접수 응답에 서버 ID가 없습니다. 접수 완료로 처리하지 않았습니다.");
    return { ...result, status: "synced" };
  }

  function applyServerReceipt(project, result) {
    const remote = result.project || result.submission || result;
    const remoteId = remote.id || remote.submissionId || result.id || result.submissionId;
    const receipt = remote.receiptNo || remote.receipt || remote.reservationNo || result.receiptNo || result.receipt || result.reservationNo || project.receiptNo || "";
    const files = remote.cloudFiles || remote.files || result.files || [];
    return { ...project, cloudSubmissionId: remoteId, receiptNo: receipt, cloudReceiptNo: receipt,
      cloudFiles: Array.isArray(files) ? files : [],
      workflow: { ...project.workflow, cloudSync: { status: "synced", at: new Date().toISOString(), id: remoteId, receiptPending: !receipt } } };
  }

  function reflectStoredReceipt(project) {
    try {
      for (const key of ["customerProjectList", "customerIntakeList"]) {
        const items = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(items) && items.some(item => item.id === project.id)) localStorage.setItem(key, JSON.stringify(items.map(item => item.id === project.id ? { ...item, cloudSubmissionId: project.cloudSubmissionId, receiptNo: project.receiptNo, cloudReceiptNo: project.cloudReceiptNo, cloudFiles: project.cloudFiles, workflow: { ...item.workflow, cloudSync: project.workflow.cloudSync } } : item)));
      }
      for (const key of ["customerProjectInput", "customerIntakeInput"]) {
        const active = JSON.parse(localStorage.getItem(key) || "null");
        if (active?.id === project.id) localStorage.setItem(key, JSON.stringify({ ...active, cloudSubmissionId: project.cloudSubmissionId, receiptNo: project.receiptNo, cloudReceiptNo: project.cloudReceiptNo, cloudFiles: project.cloudFiles, workflow: { ...active.workflow, cloudSync: project.workflow.cloudSync } }));
      }
    } catch (error) { console.warn("서버 접수는 저장되었으나 브라우저 목록 갱신에 실패했습니다.", error); }
    window.dispatchEvent(new CustomEvent("hao:submission-synced", { detail: { project } }));
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
      const project = applyServerReceipt(local.project, result);
      await store.updateSubmissionSync(projectId, "synced", { project, remoteSubmissionId: project.cloudSubmissionId, remoteFiles: project.cloudFiles, syncedAt: Date.now(), lastError: "" });
      reflectStoredReceipt(project);
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
    for (const item of pending.filter(item => !item.project?.localTestOnly).slice(0, 5)) {
      try { results.push(await syncStoredProject(item.projectId)); }
      catch (error) { console.warn("고객 접수 재전송에 실패했습니다.", item.projectId, error); }
    }
    return results;
  }

  async function listProjects() {
    if (!isConfigured()) return [];
    const response = await request(apiUrl("projects"), { headers: { Accept: "application/json", ...adminHeaders() }, cache: "no-store" });
    const data = await responseJson(response, "고객 접수 조회 오류");
    if (data.latestChange?.nonce) latestChangeNonce = data.latestChange.nonce;
    if (!Array.isArray(data) && !Array.isArray(data.projects)) throw new Error("접수 목록 응답 형식이 다릅니다. 기존 목록을 유지합니다.");
    return Array.isArray(data) ? data : data.projects;
  }

  function remoteFileUrl(file) {
    if (!isConfigured() || !file?.submissionId || !file?.id) return "";
    return apiUrl(`projects/${encodeURIComponent(file.submissionId)}/files/${encodeURIComponent(file.id)}`);
  }

  async function downloadRemoteFile(file) {
    const url = remoteFileUrl(file);
    if (!url) throw new Error("서버 파일 주소가 없습니다.");
    const response = await request(url, { headers: adminHeaders(), cache: "no-store" });
    if (!response.ok) await responseJson(response, "서버 파일 다운로드 오류");
    return response.blob();
  }

  async function updateProjectState(project) {
    const remoteId = String(project?.cloudSubmissionId || project?.submissionId || "").trim();
    if (!isConfigured() || !remoteId) return { status: "local-only" };
    const response = await request(apiUrl(`projects/${encodeURIComponent(remoteId)}`), {
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
      const response = await request(apiUrl("changes"), { headers: { Accept: "application/json", ...adminHeaders() }, cache: "no-store" });
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
    stopAutoSync?.();
    window.clearInterval(autoSyncTimer);
    if (!isConfigured()) return () => {};
    autoSyncTimer = window.setInterval(() => checkForChanges(onChange), Math.max(5000, intervalMs));
    const refresh = () => { if (!document.hidden) checkForChanges(onChange); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    stopAutoSync = () => {
      window.clearInterval(autoSyncTimer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
    return stopAutoSync;
  }

  window.addEventListener("online", () => retryPendingProjects().catch(() => {}));
  window.haoSubmissionSync = Object.freeze({
    isConfigured,
    setAdminToken,
    submitProject,
    applyServerReceipt,
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
