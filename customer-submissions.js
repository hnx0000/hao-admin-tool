(() => {
  const $ = (id) => document.getElementById(id);
  let projects = [];
  const statuses = ["신규 접수", "확인 중", "검수 완료", "기획 생성", "1차 시안 완료", "고객 컨펌 대기", "실제 제작", "내부 검수", "최종 납품"];
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  const text = (value) => Array.isArray(value) ? value.map((item) => typeof item === "object" ? Object.values(item).filter(Boolean).join(" · ") : item).join("\n") : typeof value === "object" && value ? JSON.stringify(value, null, 2) : String(value || "");
  const keyOf = (project) => String(project.id || project.cloudSubmissionId || project.submissionId || "");
  const receiptOf = (project) => String(project.receiptNo || project.receipt || project.cloudReceiptNo || "미발급");
  const displayName = (project) => String(project.productName || project.projectName || project.clientName || project.companyName || "프로젝트명 미입력");
  const intakeOf = (project) => window.haoIntakeTriage.intake(project);
  const normalized = (project) => window.haoIntakeTriage.apply(project);
  const daysLeft = (project) => Math.max(0, Math.ceil((Date.parse(intakeOf(project).expiresAt) - Date.now()) / 86400000));
  const progressFor = (status) => {
    const map = {
      "신규 접수": [1, "접수 완료", "작성 내용이 정상적으로 접수되었습니다."], "확인 중": [2, "자료 확인 중", "담당 관리자가 작성 내용과 첨부 자료를 확인하고 있습니다."], "검수 완료": [3, "내용 검수 완료", "검수가 완료되어 1차 시안을 준비합니다."], "기획 생성": [4, "1차 시안 제작 중", "촬영·디자인 기획 시안을 제작하고 있습니다."], "1차 시안 완료": [5, "1차 시안 검수·수정", "1차 시안 검수와 보완을 진행하고 있습니다."], "고객 컨펌 대기": [6, "고객 확인·피드백", "고객의 시안 확인과 피드백을 기다리고 있습니다."], "실제 제작": [7, "실제 제작", "촬영 결과를 반영해 상세페이지를 제작하고 있습니다."], "내부 검수": [8, "내부 검수", "완성본을 최종 검수하고 있습니다."], "최종 납품": [9, "최종 납품", "모든 제작과 검수가 완료되었습니다."],
    };
    const [currentStep, stepLabel, customerMessage] = map[status] || map["신규 접수"];
    return { currentStep, totalSteps: 9, stepLabel, customerMessage, updatedAt: new Date().toISOString() };
  };
  const fieldRows = (project) => [
    ["접수번호", receiptOf(project)], ["고객사명", project.companyName || project.clientName], ["브랜드명", project.clientName || project.brandName], ["담당자", project.contactName || project.managerName], ["연락처", project.contactInfo || project.phone], ["이메일", project.email], ["제품명", project.productName], ["카테고리", project.category], ["판매 채널", project.channel], ["타깃 고객", project.targetCustomer], ["한 줄 설명", project.heroSentence || project.oneLine], ["핵심 장점", project.coreStrength || project.features], ["제조·품질·인증", project.productionTrust], ["구매 혜택", project.purchaseBenefit], ["리뷰 키워드", project.reviewKeywords], ["옵션·구성", project.options], ["필수 문구", project.mustInclude], ["금지 표현", project.banWords], ["디자인 무드", project.styleTone || project.imageMemo], ["참고 링크", project.referenceUrls || project.references], ["추가 요청사항", project.additionalNotes || project.clientRequests || project.sourceApplicationText],
  ];

  function selectedProjects() {
    const query = $("search").value.trim().toLowerCase();
    const status = $("statusFilter").value;
    const intakeFilter = $("intakeFilter").value;
    return projects.filter((project) => {
      const intake = intakeOf(project);
      const hay = [project.companyName, project.clientName, project.productName, receiptOf(project)].join(" ").toLowerCase();
      return (!query || hay.includes(query)) && (!status || project.status === status) && (!intakeFilter || intake.status === intakeFilter);
    });
  }

  function renderStats() {
    const promoted = projects.filter((project) => intakeOf(project).status === "promoted").length;
    const needs = projects.length - promoted;
    $("intakeStats").innerHTML = `<span><b>${projects.length}</b> 전체 접수</span><span class="good"><b>${promoted}</b> 프로젝트 자동 등록</span><span class="warn"><b>${needs}</b> 보완 필요</span>`;
  }

  function render() {
    const selected = new URLSearchParams(location.search).get("projectId") || "";
    const filtered = selectedProjects();
    $("count").textContent = `${filtered.length}개 접수`;
    renderStats();
    $("projectList").innerHTML = filtered.length ? filtered.map((project) => {
      const id = keyOf(project); const files = Array.isArray(project.files) ? project.files : Array.isArray(project.cloudFiles) ? project.cloudFiles : [];
      const intake = intakeOf(project); const promoted = intake.status === "promoted";
      const notice = promoted ? "관리자 프로젝트에 자동 등록됨" : `${daysLeft(project)}일 이내 보완 필요 · 이후 자동삭제`;
      const phone = String(project.contactInfo || project.phone || "").replace(/[^0-9+]/g, "");
      const smsBody = encodeURIComponent(`[HAO] ${displayName(project)} 작성률은 ${intake.score}%입니다. ${intake.missing.join(", ")} 항목을 추가 작성해주세요.`);
      return `<details class="project" data-id="${escapeHtml(id)}" ${selected && [id, project.cloudSubmissionId, project.submissionId].map(String).includes(selected) ? "open" : ""}><summary><div class="project-title"><strong>${escapeHtml(displayName(project))}</strong><span>${escapeHtml(project.companyName || project.clientName || "고객사 미입력")} · ${escapeHtml(receiptOf(project))} · ${escapeHtml(notice)}</span><div class="score-track"><i style="width:${intake.score}%"></i></div></div><span class="state ${promoted ? "promoted" : "needs"}">${intake.score}% · ${promoted ? "자동 등록" : "보완 필요"}</span></summary><div class="project-body"><div class="missing-guide ${promoted ? "promoted" : "needs"}"><b>${promoted ? "프로젝트 등록 기준 통과" : "고객 보완 요청 항목"}</b><span>${promoted ? "작성률 60% 이상으로 관리자 프로젝트 메뉴에 표시됩니다." : escapeHtml(intake.missing.join(" · "))}</span></div><div class="project-actions"><select data-status-id="${escapeHtml(id)}">${statuses.map((item) => `<option ${item === (project.status || "신규 접수") ? "selected" : ""}>${item}</option>`).join("")}</select>${!promoted ? `<button class="primary" data-request-supplement="${escapeHtml(id)}">고객 진행조회에 보완 요청 등록</button>${phone ? `<a class="back" href="sms:${escapeHtml(phone)}?body=${smsBody}">문자 작성창 열기</a>` : ""}` : ""}<button class="secondary" data-download-json="${escapeHtml(id)}">JSON 백업</button><a class="back" href="index.html">관리자툴로 돌아가기</a></div><div class="fields">${fieldRows(project).map(([label, value]) => `<div class="field ${String(value || "").length > 110 ? "wide" : ""}"><b>${escapeHtml(label)}</b><span class="${text(value) ? "" : "missing"}">${escapeHtml(text(value) || "미기입·자료없음")}</span></div>`).join("")}</div><section class="files"><h3>첨부 파일 ${files.length}개</h3><div class="file-list">${files.length ? files.map((file, index) => `<button class="file-button" data-file-project="${escapeHtml(id)}" data-file-index="${index}">열기 · ${escapeHtml(file.originalName || file.name || `파일 ${index + 1}`)}</button>`).join("") : '<span class="missing">서버 첨부 파일 없음</span>'}</div></section></div></details>`;
    }).join("") : '<div class="empty">조건에 맞는 고객 작성내용이 없습니다.</div>';
  }

  async function purgeExpired() {
    const expired = projects.filter((project) => window.haoIntakeTriage.isExpired(project));
    for (const project of expired) {
      await window.haoSubmissionSync.permanentlyDeleteProject({ ...project, cloudSubmissionId: keyOf(project) }, displayName(project));
    }
    if (expired.length) projects = projects.filter((project) => !expired.includes(project));
    return expired.length;
  }

  async function loadProjects() {
    $("message").className = "message"; $("message").textContent = "중앙 서버 임시 접수함을 불러오는 중입니다…";
    try {
      projects = (await window.haoSubmissionSync.listProjects()).map(normalized);
      const purged = await purgeExpired();
      $("authPanel").hidden = true;
      $("message").textContent = `서버 연결 완료 · ${projects.length}개 접수 확인${purged ? ` · 30일 경과 미완성 ${purged}건 자동삭제` : ""}`;
      const used = [...new Set(projects.map((item) => item.status || "신규 접수"))];
      $("statusFilter").innerHTML = '<option value="">전체 상태</option>' + used.map((item) => `<option>${escapeHtml(item)}</option>`).join("");
      render();
    } catch (error) {
      $("message").className = "message error"; $("message").textContent = error?.status === 401 ? "관리자 인증 후 서버 전체목록을 확인할 수 있습니다." : error?.message || "서버 목록을 불러오지 못했습니다."; $("authPanel").hidden = false;
    }
  }

  $("authenticate").addEventListener("click", () => { const token = $("adminToken").value.trim(); if (!token) { $("message").textContent = "관리자 키를 입력해주세요."; return; } window.haoSubmissionSync.setAdminToken(token); $("adminToken").value = ""; loadProjects(); });
  $("adminToken").addEventListener("keydown", (event) => { if (event.key === "Enter") $("authenticate").click(); });
  $("refresh").addEventListener("click", loadProjects); $("search").addEventListener("input", render); $("statusFilter").addEventListener("change", render); $("intakeFilter").addEventListener("change", render);
  $("projectList").addEventListener("change", async (event) => { const select = event.target.closest("[data-status-id]"); if (!select) return; const project = projects.find((item) => keyOf(item) === select.dataset.statusId); if (!project) return; const status = select.value; const updated = { ...project, cloudSubmissionId: keyOf(project), status, workflow: { ...(project.workflow || {}), customerProgress: progressFor(status) } }; try { await window.haoSubmissionSync.updateProjectState(updated); Object.assign(project, updated); $("message").className = "message"; $("message").textContent = `${displayName(project)} · ${status} 서버 반영 완료`; render(); } catch (error) { $("message").className = "message error"; $("message").textContent = error?.message || "상태 저장에 실패했습니다."; } });
  $("projectList").addEventListener("click", async (event) => {
    const supplement = event.target.closest("[data-request-supplement]");
    if (supplement) {
      const project = projects.find((item) => keyOf(item) === supplement.dataset.requestSupplement); if (!project) return;
      const intake = intakeOf(project); const message = `작성률 ${intake.score}%입니다. ${intake.missing.join(", ")} 항목을 추가 작성해주세요.`;
      const updated = { ...project, cloudSubmissionId: keyOf(project), workflow: { ...(project.workflow || {}), intake: { ...intake, lastReminderAt: new Date().toISOString(), notification: { channel: "app", status: "sent", smsStatus: "provider-not-connected", message } }, customerProgress: { ...(project.workflow?.customerProgress || progressFor("신규 접수")), stepLabel: "작성 내용 보완 요청", customerMessage: message, updatedAt: new Date().toISOString() } } };
      try { await window.haoSubmissionSync.updateProjectState(updated); Object.assign(project, updated); $("message").textContent = `${displayName(project)} 고객 진행조회에 보완 알림을 등록했습니다.`; render(); } catch (error) { $("message").className = "message error"; $("message").textContent = error?.message || "보완 알림 등록에 실패했습니다."; }
      return;
    }
    const jsonButton = event.target.closest("[data-download-json]");
    if (jsonButton) { const project = projects.find((item) => keyOf(item) === jsonButton.dataset.downloadJson); const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${displayName(project)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return; }
    const fileButton = event.target.closest("[data-file-project]"); if (!fileButton) return; const project = projects.find((item) => keyOf(item) === fileButton.dataset.fileProject); const files = Array.isArray(project?.files) ? project.files : Array.isArray(project?.cloudFiles) ? project.cloudFiles : []; const file = { ...files[Number(fileButton.dataset.fileIndex)], submissionId: keyOf(project) };
    try { fileButton.disabled = true; fileButton.textContent = "불러오는 중…"; const blob = await window.haoSubmissionSync.downloadRemoteFile(file); const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60000); } catch (error) { $("message").className = "message error"; $("message").textContent = error?.message || "첨부 파일을 열지 못했습니다."; } finally { fileButton.disabled = false; render(); }
  });
  if (sessionStorage.getItem("haoSubmissionAdminToken")) loadProjects(); else { $("authPanel").hidden = false; $("message").textContent = "관리자 키를 입력하면 서버 임시 접수함을 불러옵니다."; }
})();
