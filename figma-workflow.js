(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HAO_FIGMA_WORKFLOW = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "hao-figma-first-v2-approval-gate";
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
    ["productImage", "제품 원본 이미지", ["productImages", "imageFiles", "uploadedFiles", "referenceFiles"]],
    ["benefit", "핵심 기능 또는 효익", ["coreBenefit", "oneLine", "primaryPurchaseReason"]],
    ["features", "특징과 차별점", ["features", "coreStrength", "emphasis"]],
    ["target", "주요 타깃", ["targetCustomer", "target"]],
    ["price", "가격대", ["priceRange", "price"]],
    ["mood", "원하는 분위기", ["desiredMood", "direction", "visualIdentity"]],
    ["mandatory", "필수 문구·정보", ["mustInclude", "mandatoryCopy"]],
    ["evidence", "인증·수치·후기·시험자료", ["evidence", "evidenceBoundary", "certifications"]],
    ["references", "참고 이미지·상세페이지", ["references", "referenceFiles", "referenceLikes"]],
    ["exclusions", "제외 표현·디자인", ["exclusions", "avoid", "banWords", "referenceDislikes"]],
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
    if (Array.isArray(value)) return value.filter(Boolean).join(" · ");
    if (value && typeof value === "object") return Object.values(value).filter(Boolean).join(" · ");
    return String(value || "").trim();
  }

  function inferMajor(project) {
    const explicit = asText(project.majorCategory).split(/[\/·>]/)[0].trim();
    if (CATEGORY_SECTIONS[explicit]) return explicit;
    const category = asText(project.category);
    if (/화장|스킨|세럼|크림/.test(category)) return "화장품";
    if (/건강기능|건기식|영양제/.test(category)) return "건강기능식품";
    if (/가전|기기|장비/.test(category)) return "기기";
    if (/식품|음식|음료|주스|밀키트/.test(category)) return "음식";
    return "기타제품";
  }

  function normalizeProject(project) {
    const raw = project && typeof project === "object" ? project : {};
    const majorCategory = inferMajor(raw);
    const categoryParts = asText(raw.category).split(/[\/·>]/).map((item) => item.trim()).filter(Boolean);
    return {
      ...raw,
      productName: asText(firstValue(raw, ["productName", "projectName"])),
      brandName: asText(firstValue(raw, ["brandName", "clientName", "companyName"])),
      majorCategory,
      subCategory: asText(raw.subCategory || categoryParts[1] || categoryParts[0]),
    };
  }

  function auditFacts(project) {
    const input = normalizeProject(project);
    const fields = FIELD_RULES.map(([id, label, keys]) => {
      const raw = id === "classification" ? `${input.majorCategory}${input.subCategory ? ` · ${input.subCategory}` : ""}` : firstValue(input, keys);
      const text = asText(raw);
      return { id, label, value: text || UNKNOWN, confirmed: Boolean(text) };
    });
    const confirmed = fields.filter((field) => field.confirmed).length;
    return {
      fields,
      confirmed,
      total: fields.length,
      completionRate: Math.round((confirmed / fields.length) * 100),
      missing: fields.filter((field) => !field.confirmed).map((field) => field.label),
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
    const [zoneType, zoneGuide] = zoneTypes[index % zoneTypes.length];
    return {
      id: `section-${String(index + 1).padStart(2, "0")}`,
      number: String(index + 1).padStart(2, "0"),
      title,
      zoneType,
      zoneGuide,
      purpose: `${title}에서 ${product}의 확인된 구매 정보를 한 가지 우선순위로 전달`,
      shooting: `${title} 전용 고유 촬영 레퍼런스 1컷. 제품 원본의 형태·라벨·비율을 유지하고 앞뒤 구간과 조명·색온도를 연결`,
      design: `${visual}을 기준으로 사진 안의 여백·곡선·색면을 다음 구간까지 이어서 조판`,
      transition: index === 0 ? "히어로의 핵심 형태를 다음 근거 구간의 그래픽 모티프로 반복" : "이전 구간의 색·선·여백 중 하나를 이어받아 다음 메시지로 전환",
      imagePrompt: `세로형 상세페이지의 ${title} 구간에 사용할 광고 촬영 레퍼런스 이미지를 생성한다. ${product}의 원본 제품을 주인공으로 두고 ${zoneGuide}. ${visual}의 색감과 재질을 유지한다. 앞뒤 섹션과 같은 카메라 세계관·광원·색온도를 사용하되 구도와 소품은 이 구간만의 역할에 맞게 새로 만든다. 이미지 안에는 제목, 설명, 숫자, 로고, 인증마크, 가짜 라벨을 생성하지 않는다. 제품 원본의 형태·비율·라벨을 바꾸지 않으며 합성 안전 여백을 남긴다. 같은 사진의 확대·크롭 재사용은 금지한다.`,
      reuse: false,
    };
  }

  function makeDirections(input) {
    const product = input.productName || UNKNOWN;
    return [
      { id: "evidence-led", name: "근거 중심 에디토리얼", message: `${product}의 확인 가능한 사실을 큰 조판과 실제 제품으로 증명`, layout: "대형 사진과 근거 패널을 교차하는 비대칭 장축", density: "중간", image: "제품 중심 촬영 60% · 정보 조판 40%" },
      { id: "scene-led", name: "사용 장면 내러티브", message: "구매자가 제품을 만나는 순간부터 사용까지 시간 순서로 설득", layout: "장면이 다음 장면으로 이어지는 풀블리드 스크롤", density: "낮음→중간", image: "라이프스타일 촬영 70% · 정보 조판 30%" },
      { id: "material-led", name: "원물·재질 몰입형", message: "원재료·제형·소재의 질감을 확대해 제품 특성을 감각적으로 전달", layout: "매크로 이미지와 큰 타이포가 맞물리는 레이어형", density: "낮음", image: "매크로·원물 촬영 75% · 정보 조판 25%" },
      { id: "system-led", name: "기준 비교 시스템형", message: "구매 전에 확인할 기준을 먼저 제시하고 제품이 답하는 구조", layout: "기준 카드·비교·실물 증거가 정렬된 모듈형", density: "높음", image: "제품·증빙 45% · 정보 조판 55%" },
    ];
  }

  function buildWorkflow(project) {
    const input = normalizeProject(project);
    const audit = auditFacts(input);
    const names = CATEGORY_SECTIONS[input.majorCategory] || CATEGORY_SECTIONS["기타제품"];
    const sections = names.map((title, index) => sectionInstruction(title, index, input));
    const directions = makeDirections(input);
    const blockers = [];
    for (const required of ["상품명", "브랜드명", "제품 원본 이미지", "핵심 기능 또는 효익", "주요 타깃"]) {
      const field = audit.fields.find((item) => item.label === required);
      if (!field?.confirmed) blockers.push(`${required} 확인 필요`);
    }
    return {
      version: VERSION,
      input,
      audit,
      stages: STAGES,
      directions,
      recommendedDirectionIds: [directions[0].id, directions[1].id],
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

  function buildHandoffMarkdown(workflow) {
    const data = workflow?.version ? workflow : buildWorkflow(workflow);
    const facts = data.audit.fields.map((field) => `- ${field.label}: ${field.value}`).join("\n");
    const directions = data.directions.map((item, index) => `${index + 1}. ${item.name} — ${item.message} / ${item.layout} / ${item.image}`).join("\n");
    const sections = data.sections.map((item) => `### ${item.number}. ${item.title}\n- 회색 구조 구역: ${item.zoneType}\n- 구역 설계: ${item.zoneGuide}\n- 목적: ${item.purpose}\n- 촬영 레퍼런스: ${item.shooting}\n- 디자인 흐름: ${item.design}\n- 앞뒤 연결: ${item.transition}\n- ChatGPT 이미지 생성 지시: ${item.imagePrompt}`).join("\n\n");
    return `# ${data.input.productName || "상품"} · Figma 상세페이지 작업 패키지\n\n- 프로세스: ${VERSION}\n- 상품군: ${data.input.majorCategory} · ${data.input.subCategory || UNKNOWN}\n- 입력 완성도: ${data.audit.completionRate}%\n- 입력 게이트: ${data.productionGate.allowed ? "통과" : data.productionGate.blockers.join(" · ")}\n- 구조 시안 게이트: 관리자 승인 전 섹션 이미지 생성 금지\n- Codex 완료 지점: 승인된 구조 시안과 섹션별 이미지·촬영·디자인 가이드 인계\n\n## 1. 사실 잠금\n\n${facts}\n\n## 2. 디자인 방향 4개\n\n${directions}\n\n## 3. 회색 3열 구조 시안 고정 규칙\n\n${data.rules.map((rule) => `- ${rule}`).join("\n")}\n\n## 4. 관리자 승인 게이트\n\n- [ ] 회색 3열 구조 시안 검토 통과\n- [ ] 사진·디자인·텍스트 구역 검토\n- [ ] 단일 페이지와 사진 연결 구간 검토\n- [ ] 승인 전 이미지 생성 미진행 확인\n\n## 5. 승인 후 섹션별 제작 가이드\n\n${sections}\n\n## 6. Codex 인계 전 QA\n\n${data.qa.map((item) => `- [ ] ${item}`).join("\n")}\n\n## 7. 후속 담당자 업무\n\n- 실제 제품 촬영\n- 승인된 디자인 틀 조판\n- 생성 이미지와 실제 촬영물 연결\n- 최종 상세페이지 마무리와 납품 검수\n`;
  }

  return Object.freeze({ VERSION, UNKNOWN, STAGES, CATEGORY_SECTIONS, normalizeProject, auditFacts, buildWorkflow, buildHandoffMarkdown, validateFigmaUrl });
});
