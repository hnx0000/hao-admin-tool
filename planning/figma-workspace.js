/* Project resolution, review state, persistence and rendering are kept out of HTML. */
(() => {
  "use strict";
  const engine = window.HAO_FIGMA_WORKFLOW;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const requestedId = new URLSearchParams(location.search).get("projectId") || "";
  const read = (key, fallback = {}) => { try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch { return fallback; } };
  const list = key => { const value = read(key, []); return Array.isArray(value) ? value : []; };
  function readProject() {
    return engine.resolveProject({ requestedId, projects: [...list("customerProjectList"), ...list("customerIntakeList")], active: read("customerProjectInput"), handoff: read("haoFigmaWorkflowInput") });
  }
  let project, state, workflow, saving = false;
  const stateKey = () => `haoFigmaPlanning:v3:${encodeURIComponent(project.cloudSubmissionId || project.id || "unselected")}`;
  const message = text => { $("#saveStatus").textContent = text; };
  function load() {
    project = readProject();
    // Manager-reviewed snapshot survives a central-server refresh.
    project = { ...project, ...(project.workflow?.managerReview?.inputSnapshot || {}) };
    const local = read(stateKey());
    const server = project.workflow?.figmaPlanning || {};
    state = (local.updatedAt || "") > (server.updatedAt || "") ? local : server;
    rebuild();
  }
  function rebuild() { workflow = engine.buildWorkflow(project, state.selectedDirectionId, state.edits); render(); }
  function storeLocally() {
    state = { ...state, version: engine.VERSION, projectId: project.cloudSubmissionId || project.id, selectedDirectionId: workflow.selectedDirectionId, updatedAt: new Date().toISOString() };
    localStorage.setItem(stateKey(), JSON.stringify(state));
    project = { ...project, workflow: { ...project.workflow, figmaPlanning: state } };
    for (const key of ["customerProjectList", "customerIntakeList"]) {
      const items = list(key);
      if (items.some(p => engine.sameProject(p, project))) localStorage.setItem(key, JSON.stringify(items.map(p => engine.sameProject(p, project) ? { ...p, workflow: { ...p.workflow, figmaPlanning: state } } : p)));
    }
    for (const key of ["customerProjectInput", "haoFigmaWorkflowInput"]) {
      const p = read(key);
      if (engine.sameProject(p, project)) localStorage.setItem(key, JSON.stringify({ ...p, workflow: { ...p.workflow, figmaPlanning: state } }));
    }
  }
  async function persist() {
    try { storeLocally(); } catch (e) { message(`저장 실패: ${e.message}. 브라우저 저장공간을 확인하세요.`); throw e; }
    if (!project.cloudSubmissionId || !window.haoSubmissionSync?.isConfigured()) { message("이 브라우저에 저장됨 · 서버 접수 ID가 없어 중앙 동기화하지 않았습니다."); return; }
    if (saving) return;
    saving = true;
    message("브라우저 저장 완료 · 중앙 서버에 저장 중…");
    const at = state.updatedAt;
    try {
      const result = await window.haoSubmissionSync.updateProjectState(project);
      message(result.status === "local-only" ? "브라우저에만 저장됨 · 서버 연결 확인 필요" : "브라우저·중앙 서버 저장 완료");
    } catch (e) { message(`브라우저에 저장됨 · 중앙 서버 미저장: ${e.message}. 관리자툴에서 인증 후 다시 저장해 주세요.`); }
    finally { saving = false; if (state.updatedAt !== at) await persist(); }
  }
  function protectedAction(action) {
    return async () => { try { await action(); } catch (e) { message(e.message); } };
  }
  function render() {
    $("#version").textContent = engine.VERSION;
    $("#stages").innerHTML = workflow.stages.map(s => `<article class="stage"><span>${s.number} · ${esc(s.owner)}</span><strong>${esc(s.title)}</strong><small>${esc(s.output)}</small></article>`).join("");
    $("#gate").classList.toggle("pass", workflow.productionGate.allowed);
    $("#gate").innerHTML = `<strong>${workflow.productionGate.allowed ? "필수 입력 확보 · 구조 검토 준비" : "입력 보완 필요"}</strong><p>${esc(project.resolutionError || (workflow.productionGate.blockers.join(" · ") || "입력된 내용은 검증된 사실과 다릅니다. 실제 원본·증빙과 대조한 뒤 승인하세요."))}</p>`;
    $("#summary").innerHTML = [["상품",workflow.input.productName],["브랜드",workflow.input.brandName],["분류",[workflow.input.majorCategory,workflow.input.subCategory].filter(Boolean).join(" · ")],["입력률",`${workflow.audit.completionRate}%`]].map(([k,v]) => `<div><span>${esc(k)}</span><strong>${esc(v || "확인 필요")}</strong></div>`).join("");
    $("#meter").style.width = `${workflow.audit.completionRate}%`;
    $("#facts").innerHTML = workflow.audit.fields.map(f => `<div class="fact ${f.provided ? "" : "missing"}"><span>${esc(f.label)} · ${esc(f.status)}</span><strong>${esc(f.value)}</strong></div>`).join("");
    $("#analysisSummary").textContent = `${workflow.analysis.criteria.join(" · ")} / ${workflow.analysis.detailRule} / 참고 DB: ${workflow.analysis.driveReferenceVersion} (기존 패턴 재사용, 원본 재분석 완료를 뜻하지 않음)`;
    $("#directions").innerHTML = workflow.directions.map(d => {
      const recommendation = workflow.recommended.find(r => r.id === d.id);
      return `<article class="direction"><b>${esc(d.name)}</b><strong>${d.score}/100 · ${recommendation ? `추천 ${recommendation.rank}` : "대안"}</strong><p>${esc(d.message)}</p><dl><dt>레이아웃</dt><dd>${esc(d.layout)}</dd><dt>정보 밀도</dt><dd>${esc(d.density)}</dd><dt>사진·조판</dt><dd>${esc(d.image)}</dd></dl><details><summary>점수·선정 이유</summary><p>${esc(recommendation?.reason || d.caution)}</p><p>${Object.entries(d.scoreBreakdown).map(([key,value])=>`${esc(key)}: ${value}`).join(" / ")}</p></details><button type="button" data-direction="${d.id}" ${workflow.selectedDirectionId === d.id ? "disabled" : ""}>${workflow.selectedDirectionId === d.id ? "현재 선택" : "이 방향으로 구조 작성"}</button></article>`;
    }).join("");
    $("#executionStatus").textContent = `${workflow.execution.note} · 기존 Drive 상품군 패턴 기반 / 사진 ${workflow.sections.filter(s => s.photoRequired).length}개 구간, 실제 촬영 컷수는 구조 검토 시 확정`;
    $("#structureBoard").innerHTML = workflow.sections.map(s => `<section class="structure-row" data-section="${s.id}"><div class="column"><h3>${s.number} · 촬영·구역 지시</h3><p>${esc(s.shooting)}</p><p>${esc(s.zoneGuide)}</p><p>제품 원본은 형태 기준. 누끼 반복 노출 금지.</p></div><div class="column center"><div class="gray-section board-row"><span>SECTION ${s.number}</span><h3>${esc(s.title)}</h3><div class="zone-map ${s.photoRequired ? "photo-zone" : "text-zone"}">${s.photoRequired ? "<i>제품 중심 연출 사진 영역<br>이미지 생성 전</i>" : ""}<i>편집 가능한 텍스트<br>${esc(s.headline)}</i><i>디자인·연결 영역</i></div><p>${esc(s.subcopy)}</p></div></div><div class="column"><h3>조판·다음 연결</h3><p>${esc(s.design)}</p><p>${esc(s.transition)}</p><p>출처: ${esc(workflow.analysis.driveReferenceVersion)} · ${esc(workflow.input.referenceLikes || "세부 출처/선호 확인 필요")}</p><details><summary>이 구간 코멘트·문구 수정</summary>${[["headline","제목"],["subcopy","한 문장 설명"],["shooting","촬영 지시"],["design","디자인·출처"],["transition","다음 연결"]].map(([field,label]) => `<label>${label}<textarea data-section-edit="${s.id}" data-field="${field}">${esc(s[field])}</textarea></label>`).join("")}</details></div></section>`).join("");
    $("#figmaUrl").value = state.figmaUrl || "";
    $("#figmaRevision").value = state.revision || "";
    const valid = engine.validateFigmaUrl(state.figmaUrl);
    $("#openFigma").href = valid ? state.figmaUrl : "#";
    $("#openFigma").setAttribute("aria-disabled", String(!valid));
    $("#openFigma").tabIndex = valid ? 0 : -1;
    $("#reviewChecks").innerHTML = engine.REVIEW_CHECKS.map((q,i) => `<label class="check"><input type="checkbox" data-review="${i}"><span>${esc(q)}</span></label>`).join("");
    renderApproval();
  }
  function renderApproval() {
    const approved = engine.isApproved(workflow, state);
    $("#approvalStatus").textContent = approved ? `구조 승인 · ${state.approval.reviewedAt}` : state.approval?.status === "approved" ? "입력·구조·리비전 변경 · 재승인 필요" : "검토 전 · 다음 단계 잠김";
    $("#approvalStatus").classList.toggle("approved", approved);
    for (const selector of ["#sectionProduction", "#handoffQa"]) {
      const panel = $(selector);
      panel.classList.toggle("unlocked", approved);
      [...panel.children].filter(el => !el.classList.contains("lock-banner")).forEach(el => { el.hidden = !approved; el.inert = !approved; });
      panel.querySelector(".lock-banner").hidden = approved;
    }
    $("#sectionGuides").innerHTML = approved ? workflow.sections.map(s => `<article class="guide-card"><span>SECTION ${s.number}</span><h3>${esc(s.title)}</h3><p>${esc(s.shooting)}</p><details><summary>ChatGPT 이미지 생성 지시 보기</summary><p>${esc(engine.productionPrompt(s,workflow))}</p></details></article>`).join("") : "";
    $("#qa").innerHTML = approved ? workflow.qa.map((q,i) => `<label class="check"><input type="checkbox" data-qa="${i}" ${state.qaSignature === engine.signature(workflow) && state.qa?.[i] ? "checked" : ""}><span>${esc(q)}</span></label>`).join("") : "";
    $("#copyPackage").disabled = $("#downloadPackage").disabled = !approved;
    $("#approveStructure").disabled = !workflow.productionGate.allowed || Boolean(project.resolutionError);
    $("#downloadStructure").disabled = $("#downloadStructureJson").disabled = Boolean(project.resolutionError);
  }
  function download(text, extension) {
    const url = URL.createObjectURL(new Blob([text], { type: extension === "json" ? "application/json" : "text/markdown;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${(project.productName || "프로젝트").replace(/[\\/:*?"<>|]/g,"_")}_구조시안.${extension}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("#directions").onclick = async event => {
    const id = event.target.closest("[data-direction]")?.dataset.direction;
    if (!id) return;
    state = { ...state, selectedDirectionId: id, edits: {}, qa: {}, approval: { status: "pending", reason: "방향 변경" } };
    rebuild(); await protectedAction(persist)();
  };
  $("#structureBoard").addEventListener("change", async e => {
    const field = e.target.dataset.field, section = e.target.dataset.sectionEdit;
    if (!field || !section) return;
    state.edits = { ...state.edits, [section]: { ...state.edits?.[section], [field]: e.target.value } };
    workflow = engine.buildWorkflow(project, state.selectedDirectionId, state.edits);
    render(); await protectedAction(persist)();
  });
  $("#saveFigma").onclick = protectedAction(async () => {
    const url = $("#figmaUrl").value.trim();
    if (!engine.validateFigmaUrl(url)) throw new Error("올바른 https://www.figma.com/design/… 주소를 입력하세요.");
    state.figmaUrl = url; state.revision = $("#figmaRevision").value.trim(); await persist(); render();
  });
  for (const id of ["#figmaUrl", "#figmaRevision"]) $(id).addEventListener("input", () => {
    state.figmaUrl = $("#figmaUrl").value.trim(); state.revision = $("#figmaRevision").value.trim(); renderApproval();
  });
  $("#approveStructure").onclick = protectedAction(async () => {
    state.figmaUrl = $("#figmaUrl").value.trim(); state.revision = $("#figmaRevision").value.trim();
    const checks = [...document.querySelectorAll("[data-review]")].map(el => el.checked);
    state.approval = engine.approve(workflow,state,checks); await persist(); renderApproval();
  });
  $("#recallStructure").onclick = protectedAction(async () => { state.approval = {status:"recalled",reviewedAt:new Date().toISOString()}; state.qa={}; await persist(); renderApproval(); });
  $("#qa").onchange = protectedAction(async () => {
    if (!engine.isApproved(workflow,state)) throw new Error("구조 시안 승인이 필요합니다.");
    state.qa = [...document.querySelectorAll("[data-qa]")].map(el => el.checked); state.qaSignature=engine.signature(workflow); await persist();
  });
  $("#downloadStructure").onclick = protectedAction(async () => { await persist(); download(engine.buildHandoffMarkdown(workflow,state,"structure"),"md"); });
  $("#downloadStructureJson").onclick = protectedAction(async () => {
    await persist();
    download(JSON.stringify({ schema:engine.VERSION, projectId:project.cloudSubmissionId || project.id, stage:"structure", status:"prepared-not-executed", signature:engine.signature(workflow), selectedDirectionId:workflow.selectedDirectionId, inputAudit:workflow.audit, sections:workflow.sections, referenceProtocol:workflow.referenceProtocol, rules:workflow.rules, next:"Figma 도구로 회색 구조 보드 작성 → 실제 노드/리비전 연결 → 관리자 승인" },null,2),"json");
  });
  $("#copyPackage").onclick = protectedAction(async () => { await navigator.clipboard.writeText(engine.buildHandoffMarkdown(workflow,state,"production")); message("승인된 제작 가이드 복사 완료 · 실제 이미지 생성은 도구에서 실행해야 합니다."); });
  $("#downloadPackage").onclick = protectedAction(async () => { download(engine.buildHandoffMarkdown(workflow,state,"production"),"md"); });
  $("#reloadProject").onclick = protectedAction(async () => { load(); message("이 프로젝트의 최신 저장 입력을 다시 불러왔습니다."); });
  window.addEventListener("storage", event => { if (["customerProjectList","customerProjectInput",stateKey()].includes(event.key)) { load(); message("다른 화면에서 변경된 정보를 반영했습니다. 승인 상태를 다시 확인하세요."); } });
  try { load(); } catch (e) { message(`작업공간 초기화 실패: ${e.message}`); }
})();
