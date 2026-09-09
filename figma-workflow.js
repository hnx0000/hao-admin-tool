(function (root, factory) {
  const concept = root?.HAO_CONCEPT_PROCESS || (typeof module === "object" && module.exports ? require("./concept-process.js") : null);
  const api = factory(concept);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HAO_FIGMA_WORKFLOW = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (concept) {
  "use strict";

  const VERSION = "hao-figma-stable-v3";
  const UNKNOWN = "확인 필요";
  const STAGES = Object.freeze([
    Object.freeze({ id: "facts", number: "01", title: "입력·증빙 잠금", output: "확정 사실 / 확인 필요 분리", owner: "Codex" }),
    Object.freeze({ id: "plan", number: "02", title: "검증형 텍스트 기획", output: "카피·설득 순서·금지 표현", owner: "Codex" }),
    Object.freeze({ id: "structure", number: "03", title: "회색 3열 구조 시안", output: "사진·디자인·텍스트 구역과 코멘트", owner: "Codex + Figma" }),
    Object.freeze({ id: "approval", number: "04", title: "구조 시안 승인", output: "검토 통과 전 다음 단계 잠금", owner: "관리자" }),
    Object.freeze({ id: "sectionGuides", number: "05", title: "섹션별 제작 가이드", output: "이미지 구성·촬영 ref·디자인 흐름", owner: "Codex + ChatGPT 이미지" }),
    Object.freeze({ id: "handoff", number: "06", title: "담당자 인계", output: "승인 시안·고유 이미지·조판 지시", owner: "Codex 완료 지점" }),
    Object.freeze({ id: "humanProduction", number: "07", title: "촬영·디자인·마무리", output: "실제 촬영과 최종 연결 작업", owner: "후속 담당자" }),
  ]);

  const CATEGORY_SECTIONS = Object.freeze({
    "화장품": ["첫 화면·핵심 효익", "피부 고민·사용 상황", "제품의 해결 방식", "제형·사용감", "주요 성분", "사용 부위·순서", "용기·패키지", "시험·인증 근거", "사용 방법", "주의사항", "FAQ", "클로징"],
    "음식": ["첫 화면·구매 이유", "섭취 상황·공감", "핵심 기준 한눈에", "원재료·원산지", "원재료 구성", "제조·조리 방식", "맛·향·식감", "신뢰 근거", "용기·음용 편의", "활용 장면", "섭취 방법", "보관·주의", "구매 구성", "제품 정보", "FAQ", "클로징"],
    "기기": ["첫 화면·핵심 성능", "사용 문제", "해결 방식", "핵심 기능", "사용 전후", "크기·설치 공간", "소재·마감", "소음·전력", "안전성", "사용 방법", "관리 방법", "상세 사양", "서비스·보증", "FAQ", "클로징"],
    "건강기능식품": ["첫 화면·기능성 방향", "섭취 대상", "기능성 원료", "성분 함량", "인증·시험 근거", "섭취 방법·주기", "휴대·편의", "주의사항", "제품 정보", "FAQ", "클로징"],
    "기타제품": ["첫 화면·구매 이유", "사용 상황", "핵심 특징", "소재·구조", "사용 방법", "내구·안전", "구성·규격", "비교 정보", "활용 장면", "주의사항", "FAQ", "클로징"],
  });

  const FIELD_RULES = Object.freeze([
    ["productName", "상품명", ["productName", "projectName"]],
    ["brandName", "브랜드명", ["brandName", "clientName", "companyName"]],
    ["classification", "대분류·세부분류", ["majorCategory", "category"]],
    ["productImage", "제품 원본 이미지", ["productImages"]],
    ["benefit", "핵심 기능 또는 효익", ["coreBenefit", "oneLine", "primaryPurchaseReason"]],
    ["features", "특징과 차별점", ["features", "coreStrength", "emphasis"]],
    ["target", "주요 타깃", ["targetCustomer", "target"]],
    ["price", "가격대", ["priceRange", "price"]],
    ["mood", "원하는 분위기", ["desiredMood", "direction", "visualIdentity"]],
    ["mandatory", "필수 문구·정보", ["mustInclude", "mandatoryCopy"]],
    ["evidence", "인증·수치·후기·시험자료", ["evidence", "evidenceBoundary", "certifications"]],
    ["references", "참고 이미지·상세페이지", ["references", "referenceFiles", "referenceLikes"]],
    ["exclusions", "제외 표현·디자인", ["exclusions", "avoid", "banWords", "referenceDislikes"]],
    ["reviewedNotes", "관리자 검수 원문·보완", ["reviewedNotes"]],
    ["requests", "고객 추가 요청", ["clientRequests", "additionalNotes"]],
    ["buyerConcern", "구매 전 망설임", ["buyerConcern"]],
    ["priority", "메시지 우선순위", ["messagePriority", "emphasis"]],
    ["deEmphasis", "힘을 뺄 내용", ["deEmphasis"]],
    ["visualIdentity", "제품 시각 정체성", ["visualIdentity", "imageMemo"]],
    ["shootingConstraints", "촬영 수량·상태·제약", ["shootingConstraints"]],
    ["referenceIntent", "레퍼런스 선호·비선호", ["referenceLikes", "referenceDislikes"]],
  ]);

  function firstValue(source, keys) {
    for (const key of keys) {
      const value = source?.[key];
      if (Array.isArray(value) && value.length) return value;
      if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return "";
  }

  function asText(value) {
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(" · ");
    if (value && typeof value === "object") return value.name || value.url || "";
    return String(value || "").trim();
  }

  function meaningful(value) {
    return Boolean(asText(value)) && !/^(확인\s*필요|미기입|미입력|미정|없음|미제공|자동 분석|-)$/.test(asText(value));
  }

  function normalizeProject(project) {
    const raw = project && typeof project === "object" ? project : {};
    const parts = asText(raw.category).split(/[\/·>]/).map(v => v.trim());
    const explicitMajor = raw.majorCategory || (concept.TAXONOMY[parts[0]] ? parts[0] : "");
    const explicitSub = raw.subCategory || (concept.TAXONOMY[explicitMajor]?.includes(parts[1]) ? parts[1] : "");
    const images = Array.isArray(raw.productImages) ? raw.productImages : [];
    const remoteImages = (raw.cloudFiles || []).filter(f => f.group === "productImages");
    return {
      ...raw,
      productName: asText(firstValue(raw, ["productName", "projectName"])),
      brandName: asText(firstValue(raw, ["brandName", "clientName", "companyName"])),
      majorCategory: concept.TAXONOMY[explicitMajor] ? explicitMajor : "",
      subCategory: concept.TAXONOMY[explicitMajor]?.includes(explicitSub) ? explicitSub : "",
      productImages: images.length ? images : remoteImages,
      coreBenefit: firstValue(raw, ["primaryPurchaseReason", "coreBenefit", "oneLine"]),
      targetCustomer: firstValue(raw, ["targetCustomer", "target"]),
      desiredMood: firstValue(raw, ["desiredMood", "mood", "styleTone", "direction"]),
      exclusions: firstValue(raw, ["exclusions", "banWords", "referenceDislikes"]),
    };
  }

  function auditFacts(project) {
    const input = normalizeProject(project);
    const fields = FIELD_RULES.map(([id, label, keys]) => {
      const raw = id === "classification" ? `${input.majorCategory}${input.subCategory ? ` · ${input.subCategory}` : ""}` : firstValue(input, keys);
      const provided = id === "classification" ? Boolean(input.majorCategory && input.subCategory) : meaningful(raw);
      return { id, label, value: provided ? asText(raw) : UNKNOWN, provided, confirmed: false, status: provided ? "입력됨 · 원문/증빙 대조 필요" : UNKNOWN };
    });
    const confirmed = fields.filter((field) => field.provided).length;
    return {
      fields,
      confirmed: 0,
      provided: confirmed,
      total: fields.length,
      completionRate: Math.round((confirmed / fields.length) * 100),
      missing: fields.filter((field) => !field.provided).map((field) => field.label),
    };
  }

  function sectionInstruction(title, index, input) {
    const product = input.productName || "제품";
    const visual = asText(firstValue(input, ["visualIdentity", "desiredMood"])) || UNKNOWN;
    const zoneTypes = [
      ["사진+디자인 통합 히어로", "큰 제품·원물 사진 위에 텍스트 안전 영역과 다음 구간 연결 모티프를 함께 설계"],
      ["풀블리드 사진 연결", "사진이 구간 경계에서 잘리지 않고 다음 회색 구역의 배경·곡선으로 이어지게 설계"],
      ["텍스트 중심 단일 페이지", "사진을 억지로 넣지 않고 큰 제목·짧은 설명·검증 항목의 위계로 구성"],
      ["사진 위 정보 오버랩", "사진 여백 안에 근거 패널을 겹쳐 사진과 디자인이 따로 놀지 않게 구성"],
      ["근거·비교 모듈", "표·아이콘·증빙 자료가 필요한 정보 구역을 사진과 분리하되 색·선으로 연결"],
    ];
    const informationOnly = /FAQ|주의|보관|사용·보관|구성·제품 정보|옵션|사양|인증|시험|비교|상세 정보/.test(title);
    const zoneIndex = index === 0 ? 0 : informationOnly ? (/인증|시험|사양|비교/.test(title) ? 4 : 2) : /상황|장면|사용|동작/.test(title) ? 1 : 3;
    const [zoneType, zoneGuide] = zoneTypes[zoneIndex];
    const photoRequired = !informationOnly;
    return {
      id: `section-${String(index + 1).padStart(2, "0")}`,
      number: String(index + 1).padStart(2, "0"),
      title,
      zoneType,
      zoneGuide,
      photoRequired,
      purpose: `${title}에서 ${product}의 확인된 구매 정보를 한 가지 우선순위로 전달`,
      shooting: photoRequired ? `${title} 전용 고유 촬영 레퍼런스 1컷. 제품 원본의 형태·라벨·비율 유지. ${input.shootingConstraints || UNKNOWN}` : "추가 연출 촬영 없음 · 편집 가능한 텍스트/표/실제 증빙 자료로 구성",
      design: `${visual}을 기준으로 사진 안의 여백·곡선·색면을 다음 구간까지 이어서 조판`,
      transition: index === 0 ? "히어로의 핵심 형태를 다음 근거 구간의 그래픽 모티프로 반복" : "이전 구간의 색·선·여백 중 하나를 이어받아 다음 메시지로 전환",
      headline: index === 0 ? asText(input.primaryPurchaseReason || input.coreBenefit) || UNKNOWN : `${title} · 카피 검토 필요`,
      subcopy: UNKNOWN,
      imagePrompt: "",
      reuse: false,
    };
  }

  function buildWorkflow(project, selectedDirectionId = "", edits = {}) {
    if (!concept) throw new Error("상품군 분석 엔진이 로드되지 않았습니다. 새로고침해 주세요.");
    const input = normalizeProject(project);
    const audit = auditFacts(input);
    const safeInput = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === "string" && !meaningful(value) ? "" : value]));
    const review = concept.buildReview(safeInput);
    const directions = review.directions.map(d => ({ ...d, name: d.conceptName, message: d.coreMessage, density: d.informationDensity, image: d.recommendedImages.join(" · ") }));
    const selected = directions.find(d => d.id === selectedDirectionId) || directions.find(d => d.id === review.recommended[0]?.id) || directions[0];
    const sections = selected.sections.map((title, index) => {
      const section = sectionInstruction(title, index, input);
      const edit = edits[section.id] || {};
      for (const key of ["headline", "subcopy", "shooting", "design", "transition"]) if (typeof edit[key] === "string") section[key] = edit[key];
      section.design = edit.design ?? `${selected.typography} / ${selected.layout} / ${section.design}`;
      section.transition = edit.transition ?? (index < selected.sections.length - 1 ? `${title}의 결론에서 다음 '${selected.sections[index + 1]}'의 구매 판단 정보로 연결. 동일 배경·선·여백을 이어받음.` : "사용·주의·구매 판단 정보를 확인하고 마감");
      return section;
    });
    const blockers = [];
    for (const required of ["상품명", "브랜드명", "대분류·세부분류", "제품 원본 이미지", "핵심 기능 또는 효익", "주요 타깃"]) {
      const field = audit.fields.find((item) => item.label === required);
      if (!field?.provided) blockers.push(`${required} 확인 필요`);
    }
    return {
      version: VERSION,
      input,
      audit,
      stages: STAGES,
      directions,
      analysis: review.categoryAnalysis,
      recommended: review.recommended,
      recommendedDirectionIds: review.recommended.map(d => d.id),
      selectedDirectionId: selected.id,
      referenceProtocol: review.referenceProtocol,
      referenceCandidates: selected.planningColumns,
      execution: { status: "structure-prepared", figmaCreated: false, imagesGenerated: false, note: "앱은 구조 시안/도구 인계 패키지를 준비합니다. Figma 또는 이미지 도구 실행 완료를 의미하지 않습니다." },
      sections,
      productionGate: { allowed: blockers.length === 0, blockers },
      structureGate: { required: true, status: "pending", nextStage: "sectionGuides" },
      rules: [
        "이미지를 만들기 전에 Google Drive 승인 시안처럼 회색 3열 구조 시안을 Figma에 먼저 작성한다.",
        "회색 구조 시안에는 각 구간의 사진·디자인·텍스트 영역과 좌우 제작 코멘트를 표시한다.",
        "구조 시안이 관리자 검토를 통과하기 전에는 섹션 이미지 생성과 다음 단계로 넘어가지 않는다.",
        "각 구간은 서로 다른 사진을 사용하며 같은 사진의 확대·크롭 재사용을 금지한다.",
        "제품 원본은 별도 레이어로 합성하고 로고·라벨·문구·형태·비율을 바꾸지 않는다.",
        "제목·본문·수치·법정 정보는 Figma의 편집 가능한 텍스트 레이어로 작성한다.",
        "확인되지 않은 효능·인증·수치·후기·판매 조건은 확인 필요로 남긴다.",
        "단일 텍스트 페이지와 사진이 자연스럽게 연결되는 페이지를 구분하고, 각 구간의 색면·타이포·그래픽이 다음 구간으로 이어져야 한다.",
        "Codex의 완료 지점은 승인된 구조 시안과 섹션별 이미지·촬영·디자인 가이드의 인계까지다. 실제 촬영과 최종 조립은 담당자가 수행한다.",
      ],
      qa: [
        "모든 필수 사실이 원문 또는 증빙과 일치함",
        "제품 원본의 라벨·형태·비율이 보존됨",
        "구간별 이미지 파일이 모두 고유하며 재사용 없음",
        "생성 이미지 안에 제목·설명·수치를 굽지 않음",
        "각 구간의 핵심 메시지가 하나로 명확함",
        "앞뒤 구간의 색·선·여백·사진 동선이 연결됨",
        "모바일 축소 시 제목·제품·근거가 식별됨",
        "미확정 정보는 확인 필요로 표시됨",
      ],
    };
  }

  function validateFigmaUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" && /(^|\.)figma\.com$/i.test(url.hostname) && /\/(design|file)\//.test(url.pathname);
    } catch {
      return false;
    }
  }

  function buildHandoffMarkdown(workflow, state = {}, phase = "structure") {
    const data = workflow?.version ? workflow : buildWorkflow(workflow);
    if (phase === "production" && !isApproved(data, state)) throw new Error("현재 구조 리비전의 관리자 승인이 필요합니다.");
    const facts = data.audit.fields.map((field) => `- ${field.label}: ${field.value}`).join("\n");
    const directions = data.directions.map((item, index) => `${index + 1}. ${item.name} — ${item.message} / ${item.layout} / ${item.image}`).join("\n");
    const sections = data.sections.map((item) => `### ${item.number}. ${item.title}\n- 회색 구조 구역: ${item.zoneType}\n- 구역 설계: ${item.zoneGuide}\n- 제목: ${item.headline}\n- 한 문장 설명: ${item.subcopy}\n- 목적: ${item.purpose}\n- 촬영 레퍼런스: ${item.shooting}\n- 디자인 흐름: ${item.design}\n- 앞뒤 연결: ${item.transition}${phase === "production" ? `\n- 이미지 생성 지시: ${productionPrompt(item, data)}` : ""}`).join("\n\n");
    return `# ${data.input.productName || "상품"} · Figma 상세페이지 작업 패키지\n\n- 프로세스: ${VERSION}\n- 상품군: ${data.input.majorCategory} · ${data.input.subCategory || UNKNOWN}\n- 입력 완성도: ${data.audit.completionRate}%\n- 입력 게이트: ${data.productionGate.allowed ? "통과" : data.productionGate.blockers.join(" · ")}\n- 구조 시안 게이트: 관리자 승인 전 섹션 이미지 생성 금지\n- Codex 완료 지점: 승인된 구조 시안과 섹션별 이미지·촬영·디자인 가이드 인계\n\n## 1. 사실 잠금\n\n${facts}\n\n## 2. 디자인 방향 4개\n\n${directions}\n\n## 3. 회색 3열 구조 시안 고정 규칙\n\n${data.rules.map((rule) => `- ${rule}`).join("\n")}\n\n## 4. 관리자 승인 게이트\n\n- [ ] 회색 3열 구조 시안 검토 통과\n- [ ] 사진·디자인·텍스트 구역 검토\n- [ ] 단일 페이지와 사진 연결 구간 검토\n- [ ] 승인 전 이미지 생성 미진행 확인\n\n## 5. ${phase === "production" ? "승인 후 섹션별 제작 가이드" : "이미지 생성 전 회색 구조 설계"}\n\n${sections}\n\n## 6. Codex 인계 전 QA\n\n${data.qa.map((item) => `- [ ] ${item}`).join("\n")}\n\n## 7. 후속 담당자 업무\n\n- 실제 제품 촬영\n- 승인된 디자인 틀 조판\n- 생성 이미지와 실제 촬영물 연결\n- 최종 상세페이지 마무리와 납품 검수\n`;
  }

  const REVIEW_CHECKS = Object.freeze(["원본·사실·금지표현을 대조함", "회색 3열 구조와 사진/텍스트 구역을 실제 Figma에서 확인함", "섹션 메시지·연결·카피를 검토함", "선택 방향·촬영 수량과 리비전을 확인함"]);
  function projectIds(p = {}) { return [p.id, p.cloudSubmissionId, p.submissionId].filter(Boolean).map(String); }
  function sameProject(a, b) { return projectIds(a).some(id => projectIds(b).includes(id)); }
  function mergeReviewedProject(incoming, local = {}) {
    if (projectIds(local).length && !sameProject(incoming, local)) return incoming;
    const remoteReview = incoming.workflow?.managerReview || {};
    const localReview = local.workflow?.managerReview || {};
    const useLocal = (localReview.at || "") > (remoteReview.at || "");
    const review = useLocal ? localReview : remoteReview;
    const localPlan = local.workflow?.figmaPlanning || {};
    const remotePlan = incoming.workflow?.figmaPlanning || {};
    const plan = (localPlan.updatedAt || "") > (remotePlan.updatedAt || "") ? localPlan : remotePlan;
    return { ...incoming, ...(review.inputSnapshot || {}),
      workflow: { ...incoming.workflow, managerReview: review, ...(Object.keys(plan).length ? {figmaPlanning:plan} : {}) },
      ...(useLocal ? { status: local.status, contentSummary: local.contentSummary, contentSummaryText: local.contentSummaryText } : {}) };
  }
  function resolveProject({ requestedId = "", projects = [], active = {}, handoff = {} } = {}) {
    const id = String(requestedId || "");
    if (id) {
      // Persisted project is authoritative; a legacy global handoff is only a fallback.
      const result = projects.find(p => projectIds(p).includes(id)) || (projectIds(active).includes(id) ? active : null) || (projectIds(handoff).includes(id) ? handoff : null);
      return result || { id, resolutionError: "이 프로젝트의 저장된 입력을 찾지 못했습니다. 관리자툴에서 해당 프로젝트를 불러와 주세요." };
    }
    return projectIds(active).length ? active : projectIds(handoff).length ? handoff : { resolutionError: "고객 프로젝트를 먼저 선택해 주세요." };
  }
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
    return value;
  }
  function signature(data) {
    const { workflow, savedAt, requestedAt, contentSummary, contentSummaryText, ...input } = data.input;
    return JSON.stringify(stable({ version: VERSION, input, direction: data.selectedDirectionId, sections: data.sections, references: data.referenceProtocol }));
  }
  function isApproved(data, state = {}) {
    return data.productionGate.allowed && state.approval?.status === "approved" && state.approval.signature === signature(data)
      && state.approval.figmaUrl === state.figmaUrl && state.approval.revision === state.revision
      && validateFigmaUrl(state.figmaUrl) && Boolean(asText(state.revision)) && REVIEW_CHECKS.every((_, i) => state.approval.checks?.[i] === true);
  }
  function approve(data, state, checks) {
    if (!data.productionGate.allowed) throw new Error(data.productionGate.blockers.join(" · "));
    if (!validateFigmaUrl(state.figmaUrl) || !asText(state.revision)) throw new Error("실제 Figma 구조 시안 주소와 검토 리비전을 입력해 주세요.");
    if (!REVIEW_CHECKS.every((_, i) => checks?.[i] === true)) throw new Error("모든 구조 검토 항목을 직접 확인해 주세요.");
    return { status: "approved", signature: signature(data), figmaUrl: state.figmaUrl, revision: state.revision, checks, reviewedAt: new Date().toISOString(), authority: "browser-admin-review" };
  }
  function productionPrompt(section, data) {
    if (!section.photoRequired) return "이미지 생성 없음 · 실제 증빙과 편집 가능한 텍스트/도표 사용";
    return `${data.input.productName}: ${section.title} 전용 독립 촬영 구성. ${section.shooting}. 시각 정체성: ${data.input.visualIdentity || UNKNOWN}. ${section.design}. ${section.transition}. 제품 원본 별도 레이어 합성. 로고·라벨·비율 불변. 배경·소품·조명만 생성하며 글자를 굽지 않음. 다른 컷 크롭/반전 재사용 금지. 확인되지 않은 원료·효능·수치·인증 표현 금지.`;
  }
  return Object.freeze({ VERSION, UNKNOWN, STAGES, CATEGORY_SECTIONS, REVIEW_CHECKS, normalizeProject, auditFacts, buildWorkflow, buildHandoffMarkdown, validateFigmaUrl, meaningful, sameProject, mergeReviewedProject, resolveProject, signature, isApproved, approve, productionPrompt });
});
