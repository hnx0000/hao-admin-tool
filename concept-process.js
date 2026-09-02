(function (root, factory) {
  let referenceDataset = root?.COMPANY_REFERENCE_DATASET;
  if (!referenceDataset && typeof module === "object" && module.exports) {
    try { referenceDataset = require("./data/company-reference-dataset.js"); } catch { referenceDataset = null; }
  }
  const api = factory(referenceDataset);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HAO_CONCEPT_PROCESS = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis, function (referenceDataset) {
  "use strict";

  const VERSION = "hao-concept-process-review-v3-drive28";
  const CONFIRM_NEEDED = "확인 필요";

  const TAXONOMY = Object.freeze({
    "화장품": ["여성용", "남성용", "공용"],
    "음식": ["밀키트", "음료", "완성제품"],
    "기기": ["소형가전", "중형가전", "대형가전"],
    "건강기능식품": ["건강기능식품"],
    "기타제품": ["굿즈", "의류", "도구류", "일반제품"],
  });

  const FIELD_DEFINITIONS = Object.freeze([
    ["productName", "상품명"],
    ["brandName", "브랜드명"],
    ["majorCategory", "대분류"],
    ["subCategory", "세부분류"],
    ["productImages", "제품 원본 이미지"],
    ["coreBenefit", "핵심 기능 또는 효익"],
    ["features", "주요 특징과 차별점"],
    ["targetCustomer", "주요 타깃 고객"],
    ["buyerConcern", "구매 직전 망설임"],
    ["primaryPurchaseReason", "첫 화면의 한 가지 구매 이유"],
    ["messagePriority", "강조 순서"],
    ["priceRange", "가격대"],
    ["desiredMood", "원하는 분위기"],
    ["visualIdentity", "제품 시각 정체성"],
    ["shootingConstraints", "촬영 수량·상태·제약"],
    ["mustInclude", "반드시 포함할 문구와 정보"],
    ["evidence", "인증·수치·후기·시험자료"],
    ["references", "참고 이미지 또는 상세페이지"],
    ["referenceIntent", "레퍼런스 선호·비선호"],
    ["exclusions", "제외해야 할 표현과 디자인"],
  ]);

  const CATEGORY_SPECS = Object.freeze({
    "화장품": {
      criteria: ["피부 고민과 사용 목적", "제형과 사용감", "주요 성분", "사용 부위와 순서", "용기·패키지", "감성 이미지와 신뢰 정보 비중", "실제 타깃·브랜드 특성"],
      sectionPool: ["첫 화면과 핵심 효익", "피부 고민 또는 사용 상황", "제품의 해결 방식", "제형과 사용감", "주요 성분", "사용 장면", "사용 순서", "수치·시험·인증", "후기 또는 사회적 증거", "주의사항", "최종 구매 설득"],
      shotFocus: "제형 매크로, 사용 부위, 패키지 재질, 손과 피부의 자연스러운 사용 장면",
      baseColors: ["#f4dadf", "#8f5f70", "#fbf7f6"],
      risk: "효능·임상·저자극 표현은 증빙이 있을 때만 사용",
    },
    "음식": {
      criteria: ["맛과 향", "원재료와 조리 방식", "섭취 상황", "식감과 신선도", "용량과 보관", "세부분류별 조리·음용·플레이팅 특성"],
      sectionPool: ["첫 화면과 핵심 효익", "맛과 섭취 상황", "원재료", "제조 또는 조리 방식", "식감과 신선도", "사용·섭취 방법", "제품 구성", "수치·시험·인증", "보관 방법", "상세 정보와 주의사항", "최종 구매 설득"],
      shotFocus: "실물 제품, 원재료, 온도감, 질감, 자연스러운 섭취·플레이팅 장면",
      baseColors: ["#c77b36", "#5e3322", "#fff7e9"],
      risk: "맛·원산지·함량·영양·신선도는 고객 자료와 증빙 범위만 사용",
    },
    "기기": {
      criteria: ["핵심 기능과 성능", "크기와 설치 공간", "사용 방법", "사용 전후 변화", "소재와 마감", "소음·전력·안전·관리", "세부분류별 휴대·공간·설치 특성"],
      sectionPool: ["첫 화면과 핵심 기능", "사용 전 문제 상황", "제품의 해결 방식", "핵심 성능", "사용 장면", "설치와 사용 방법", "소재와 마감", "소음·전력·안전", "관리 방법", "크기와 상세 사양", "서비스와 주의사항", "최종 구매 설득"],
      shotFocus: "제품 3면, 설치 공간, 손과 사용 동선, 소재 디테일, 크기 비교",
      baseColors: ["#3d708f", "#172b39", "#f2f7fa"],
      risk: "성능 수치·전력·안전·비교 우위는 시험 또는 제조사 자료가 있을 때만 사용",
    },
    "건강기능식품": {
      criteria: ["기능성 원료", "섭취 대상", "섭취 방법과 주기", "성분 함량", "인증과 시험 근거", "휴대성과 섭취 편의성", "주의사항"],
      sectionPool: ["첫 화면과 핵심 효익", "섭취 대상과 상황", "기능성 원료", "성분 함량", "섭취 방법과 주기", "휴대와 편의", "제품 구성", "인증과 시험 근거", "주의사항", "상세 정보", "최종 구매 설득"],
      shotFocus: "제품 원본, 제형, 1회 섭취량, 원료, 휴대 장면, 패키지와 정보면",
      baseColors: ["#9a7434", "#343024", "#fbf7ed"],
      risk: "질병 치료·의학적 효과를 금지하고 식약처 인정 범위를 넘지 않음",
    },
    "기타제품": {
      criteria: ["실제 사용 목적", "사용 상황", "구매 결정 요소", "소재와 내구성", "크기·구성·옵션", "세부분류별 소장·핏·안전 특성"],
      sectionPool: ["첫 화면과 핵심 가치", "고객의 사용 상황", "제품의 해결 방식", "핵심 특징", "소재와 제작", "사용 장면", "사용 방법", "제품 구성", "사이즈와 상세 사양", "주의사항", "최종 구매 설득"],
      shotFocus: "제품 원본, 실제 크기, 소재 디테일, 사용 장면, 구성품과 패키지",
      baseColors: ["#71675c", "#252321", "#f7f4ef"],
      risk: "일반제품은 실제 구매 결정 요소를 먼저 확인하고 확인되지 않은 우위를 만들지 않음",
    },
  });

  const DIRECTION_BLUEPRINTS = Object.freeze([
    {
      id: "brand-editorial",
      conceptName: "브랜드 에디토리얼",
      message: "제품의 존재 이유와 감각적인 첫인상을 긴 호흡으로 전달",
      mood: "절제된 감성, 넓은 여백, 사진 중심",
      typography: "큰 편집형 헤드라인과 짧은 본문",
      layout: "대형 히어로와 풀블리드 사진을 교차하는 비대칭 스크롤",
      material: "자연광, 종이·유리·패브릭 질감, 미세한 그레인",
      density: "낮음",
      productDirection: "제품 원본을 크게 유지하고 브랜드 세계관을 보여주는 소품을 최소 사용",
      imageKinds: ["대형 히어로", "감성 사용 장면", "재질 매크로", "패키지 정물"],
      effect: "브랜드 기억과 프리미엄 인식 강화",
      caution: "감성 이미지가 실제 제품 정보보다 앞서지 않게 핵심 근거 구간 확보",
      sectionBias: ["첫 화면", "사용 상황", "성분", "원료", "사용 장면", "제품 구성", "최종 구매"],
    },
    {
      id: "evidence-trust",
      conceptName: "근거 중심 트러스트",
      message: "검증 가능한 차별점과 구매 판단 정보를 빠르게 이해시키기",
      mood: "정돈된 신뢰감, 차분한 대비, 명확한 정보 위계",
      typography: "굵은 정보형 제목, 읽기 쉬운 본문, 수치·표 전용 조판",
      layout: "요약 카드, 근거 블록, 비교·인증 영역을 규칙적으로 쌓는 그리드",
      material: "깨끗한 배경, 얇은 선, 데이터 카드, 실제 증빙 썸네일",
      density: "높음",
      productDirection: "제품 정면과 정보면을 정확히 보여주고 증빙과 1:1 연결",
      imageKinds: ["제품 정면", "정보면", "인증 자료", "구성·사양 도식"],
      effect: "고관여 고객의 불확실성 감소와 구매 신뢰 강화",
      caution: "증빙 없는 수치·후기·비교표는 빈 자리로 유지",
      sectionBias: ["핵심 효익", "핵심 기능", "핵심 특징", "성분", "원료", "기술", "수치", "인증", "비교", "상세", "주의"],
    },
    {
      id: "usage-conversion",
      conceptName: "사용 상황 전환형",
      message: "고객의 실제 상황에서 제품이 선택되는 이유를 단계적으로 설득",
      mood: "현실적이고 친근한 라이프스타일, 명확한 행동 흐름",
      typography: "상황형 질문 제목과 짧은 해결 문장",
      layout: "문제 장면 → 해결 장면 → 사용법 → 구매 이유로 이어지는 시퀀스",
      material: "생활 공간, 자연스러운 손동작, 전후 맥락, 강조 배지",
      density: "중간",
      productDirection: "사용자와 제품을 같은 장면에 두되 로고와 형태가 가리지 않게 구성",
      imageKinds: ["문제 상황", "사용 장면", "단계별 사용법", "결과 맥락"],
      effect: "사용 상상과 구매 전환을 동시에 강화",
      caution: "근거 없는 사용 전후 효과를 시각적으로 과장하지 않음",
      sectionBias: ["문제", "사용 상황", "해결 방식", "사용 장면", "사용 방법", "섭취", "조리", "최종 구매"],
    },
    {
      id: "product-system",
      conceptName: "제품 구조·디테일형",
      message: "외형·구성·재질·사용 구조를 시각적으로 정확하게 이해시키기",
      mood: "현대적이고 기능적인 제품 스튜디오, 높은 선명도",
      typography: "기능명 중심의 모듈형 제목과 간결한 캡션",
      layout: "제품 중심 히어로, 디테일 확대, 분해·구성, 사양 모듈의 계단식 전개",
      material: "스튜디오 조명, 재질 확대, 투명 오버레이, 정밀한 선형 도식",
      density: "중간~높음",
      productDirection: "원본 비율을 고정한 다각도·디테일 컷과 실제 구성품 중심",
      imageKinds: ["3면 제품 컷", "디테일 확대", "구성품", "크기·사양 비교"],
      effect: "제품 이해도와 구매 후 기대 정확도 향상",
      caution: "원본에 없는 부품·재질·옵션을 도식이나 합성으로 추가하지 않음",
      sectionBias: ["핵심 기능", "핵심 특징", "기술", "제품 구성", "사이즈", "상세 사양", "사용 방법", "주의"],
    },
  ]);

  const CATEGORY_DIRECTION_NAMES = Object.freeze({
    "음식": { "brand-editorial": "원재료 에디토리얼", "evidence-trust": "라벨·원재료 검증형", "usage-conversion": "섭취 순간 설득형", "product-system": "제품·내용물 디테일형" },
    "화장품": { "brand-editorial": "브랜드·제형 에디토리얼", "evidence-trust": "성분·시험 검증형", "usage-conversion": "사용 고민 해결형", "product-system": "용기·제형 디테일형" },
    "기기": { "brand-editorial": "제품 경험 에디토리얼", "evidence-trust": "성능·안전 검증형", "usage-conversion": "사용 문제 해결형", "product-system": "기능·구조 디테일형" },
    "건강기능식품": { "brand-editorial": "섭취 루틴 에디토리얼", "evidence-trust": "기능성 원료 검증형", "usage-conversion": "섭취 대상 설득형", "product-system": "제형·구성 디테일형" },
    "기타제품": { "brand-editorial": "사용 가치 에디토리얼", "evidence-trust": "소재·정보 검증형", "usage-conversion": "사용 상황 해결형", "product-system": "제품 구조 디테일형" },
  });

  const text = (value) => String(value ?? "").trim();
  const array = (value) => Array.isArray(value) ? value.filter(Boolean) : text(value) ? [text(value)] : [];
  const unique = (items) => [...new Set(items.filter(Boolean))];
  const firstValue = (...values) => values.map(text).find(Boolean) || "";

  function inferClassification(raw = {}) {
    const explicitMajor = text(raw.majorCategory || raw.productMajorCategory);
    const explicitSub = text(raw.subCategory || raw.productSubCategory);
    if (TAXONOMY[explicitMajor]) {
      return {
        major: explicitMajor,
        sub: TAXONOMY[explicitMajor].includes(explicitSub) ? explicitSub : "",
        source: "고객·관리자 선택",
      };
    }
    const categoryText = `${raw.category || ""} ${raw.productName || ""}`.toLowerCase();
    const candidates = [
      ["화장품", /화장|뷰티|스킨|크림|세럼|앰플|마스카라|바디워시/],
      ["건강기능식품", /건강기능|영양제|비타민|프로바이오틱|홍삼/],
      ["음식", /식품|음료|주스|밀키트|과자|칩|버터|요거트|그릭|꿀/],
      ["기기", /가전|기기|전자|스마트|디바이스|가습기|청소기/],
      ["기타제품", /의류|굿즈|도구|가방|신발|패션/],
    ];
    const major = candidates.find(([, pattern]) => pattern.test(categoryText))?.[0] || "";
    let sub = "";
    if (major === "화장품") sub = /남성|맨즈|men/i.test(categoryText) ? "남성용" : /여성|우먼|women/i.test(categoryText) ? "여성용" : "공용";
    if (major === "음식") sub = /밀키트/.test(categoryText) ? "밀키트" : /음료|주스|차|커피/.test(categoryText) ? "음료" : "완성제품";
    if (major === "기기") sub = /대형/.test(categoryText) ? "대형가전" : /중형/.test(categoryText) ? "중형가전" : "소형가전";
    if (major === "건강기능식품") sub = "건강기능식품";
    if (major === "기타제품") sub = /굿즈/.test(categoryText) ? "굿즈" : /의류|패션|가방|신발/.test(categoryText) ? "의류" : /도구/.test(categoryText) ? "도구류" : "일반제품";
    return { major, sub, source: major ? "자동 분류 후보 · 관리자 확인 필요" : CONFIRM_NEEDED };
  }

  function normalizeInput(raw = {}) {
    const classification = inferClassification(raw);
    const features = unique([
      ...array(raw.features),
      ...array(raw.strengthTags),
      text(raw.coreStrength),
    ]);
    const evidence = unique([
      ...array(raw.evidence),
      text(raw.evidenceBoundary),
      text(raw.productionTrust),
      text(raw.certifications),
      text(raw.testResults),
    ]);
    const desiredMood = unique([...array(raw.desiredMood), ...array(raw.mood), text(raw.styleTone)])
      .filter((item) => item !== "자동 분석");
    const references = unique([...array(raw.references), ...array(raw.referenceUrls), ...array(raw.referenceFiles)]);
    return {
      source: raw,
      productName: text(raw.productName),
      brandName: firstValue(raw.brandName, raw.clientName, raw.companyName),
      majorCategory: classification.major,
      subCategory: classification.sub,
      classificationSource: classification.source,
      productImages: [...array(raw.productImages)],
      coreBenefit: firstValue(raw.primaryPurchaseReason, raw.coreBenefit, raw.oneLine, raw.heroSentence, raw.coreStrength),
      primaryPurchaseReason: text(raw.primaryPurchaseReason),
      messagePriority: unique(array(raw.messagePriority)),
      buyerConcern: text(raw.buyerConcern),
      features,
      targetCustomer: text(raw.targetCustomer),
      priceRange: firstValue(raw.priceRange, raw.price, raw.sales?.options?.[0]?.price),
      desiredMood,
      emphasis: text(raw.emphasis),
      deEmphasis: text(raw.deEmphasis),
      visualIdentity: text(raw.visualIdentity || raw.imageMemo),
      visualPalette: unique(array(raw.visualPalette)),
      productImageUsage: text(raw.productImageUsage) || "시각 방향 분석 우선",
      shootingConstraints: text(raw.shootingConstraints),
      mustInclude: unique(array(raw.mustInclude)),
      evidence,
      references,
      referenceIntent: {
        likes: text(raw.referenceLikes),
        dislikes: text(raw.referenceDislikes),
      },
      variantRule: text(raw.variantRule) || CONFIRM_NEEDED,
      visualAnalysis: {
        status: text(raw.visualAnalysisStatus) || "시각 분석 미실행",
        observedIdentity: text(raw.visualIdentity || raw.imageMemo),
        rule: "제품 원본의 색·형태·라벨·재질·브랜드 인상을 먼저 분석하고 촬영 예시 생성은 두 번째로 수행",
      },
      salesConditions: {
        purchaseBenefit: text(raw.purchaseBenefit),
        reviewKeywords: text(raw.reviewKeywords),
        seoKeyword: text(raw.seoKeyword),
      },
      exclusions: unique([...array(raw.exclusions), ...array(raw.banWords), ...array(raw.avoidStyle), ...array(raw.avoid)]),
    };
  }

  function validateInput(input) {
    const missing = [];
    FIELD_DEFINITIONS.forEach(([key, label]) => {
      const value = input[key];
      const empty = key === "referenceIntent"
        ? !text(value?.likes) && !text(value?.dislikes)
        : Array.isArray(value) ? value.length === 0 : !text(value);
      if (empty) missing.push({ key, label, status: CONFIRM_NEEDED });
    });
    if (input.majorCategory && !TAXONOMY[input.majorCategory]) missing.push({ key: "majorCategory", label: "지원되는 대분류", status: CONFIRM_NEEDED });
    if (input.majorCategory && input.subCategory && !TAXONOMY[input.majorCategory]?.includes(input.subCategory)) missing.push({ key: "subCategory", label: "대분류에 맞는 세부분류", status: CONFIRM_NEEDED });
    return {
      complete: missing.length === 0,
      completionRate: Math.round(((FIELD_DEFINITIONS.length - missing.length) / FIELD_DEFINITIONS.length) * 100),
      missing,
      blockers: [
        !input.productImages.length && "제품 원본 이미지가 없어 실제 제작 단계는 잠금",
        !input.majorCategory && "상품 대분류 확정 필요",
        !input.subCategory && "세부분류 확정 필요",
      ].filter(Boolean),
    };
  }

  function categoryAnalysis(input) {
    const spec = CATEGORY_SPECS[input.majorCategory] || CATEGORY_SPECS["기타제품"];
    const drivePattern = referenceDataset?.categoryPatterns?.[input.majorCategory]
      || referenceDataset?.categoryPatterns?.["기타제품"]
      || null;
    const details = [];
    if (input.majorCategory === "화장품") details.push(`${input.subCategory || CONFIRM_NEEDED} 표기는 성별 고정관념이 아니라 실제 타깃·브랜드·제품 특성 확인에만 사용`);
    if (input.majorCategory === "음식") {
      const subRules = { "밀키트": "조리 편의, 구성품, 완성 시간", "음료": "청량감·농도·온도·음용 상황", "완성제품": "즉시 섭취성·식감·플레이팅" };
      details.push(subRules[input.subCategory] || "세부 음식 유형 확인 필요");
    }
    if (input.majorCategory === "기기") {
      const subRules = { "소형가전": "휴대성과 편의성", "중형가전": "공간 활용과 성능", "대형가전": "설치·내구성·서비스 신뢰" };
      details.push(subRules[input.subCategory] || "기기 크기와 설치 조건 확인 필요");
    }
    if (input.majorCategory === "기타제품") {
      const subRules = { "굿즈": "소장 가치·팬 경험·한정성·패키지", "의류": "핏·소재·착용감·사이즈·코디", "도구류": "사용 목적·방법·내구성·안전성", "일반제품": "사용 상황과 실제 구매 결정 요소" };
      details.push(subRules[input.subCategory] || "세부 제품 유형 확인 필요");
    }
    return {
      ...spec,
      detailRule: details.join(" · ") || "상품 특성과 고객 자료를 기준으로 분석",
      drivePattern,
      driveReferenceVersion: referenceDataset?.version || "레퍼런스 DB 미연결",
      planningTemplate: referenceDataset?.planningTemplate || null,
    };
  }

  function selectSections(spec, blueprint) {
    if (Array.isArray(spec.drivePattern?.sequence) && spec.drivePattern.sequence.length) {
      const sequence = spec.drivePattern.sequence.slice();
      const bias = blueprint.sectionBias || [];
      if (blueprint.id === "evidence-trust") return sequence.slice().sort((a, b) => bias.some((key) => b.includes(key)) - bias.some((key) => a.includes(key)));
      return sequence;
    }
    const ranked = spec.sectionPool.map((section, index) => ({
      section,
      score: (spec.sectionPool.length - index) + blueprint.sectionBias.reduce((sum, keyword) => sum + (section.includes(keyword) ? 7 : 0), 0),
    }));
    return ranked.sort((a, b) => b.score - a.score).slice(0, 9).sort((a, b) => spec.sectionPool.indexOf(a.section) - spec.sectionPool.indexOf(b.section)).map((item) => item.section);
  }

  function paletteFor(spec, index, input = {}) {
    if (Array.isArray(input.visualPalette) && input.visualPalette.length >= 3) {
      return unique([...input.visualPalette, "#17191d"]).slice(0, 5);
    }
    const accents = ["#d76372", "#2d6f78", "#e08a2e", "#5d5ce2"];
    return [spec.baseColors[2], spec.baseColors[0], index === 0 ? spec.baseColors[1] : accents[index], "#17191d"];
  }

  function buildPlanningColumns(input, analysis, blueprint, sections) {
    const pattern = analysis.drivePattern || {};
    const minimumShots = Number(pattern.minimumShots || 4);
    const shotRoles = Array.isArray(pattern.shotRoles) ? pattern.shotRoles : blueprint.imageKinds;
    const templateColumns = analysis.planningTemplate?.columns || [];
    return {
      template: analysis.planningTemplate?.documentType || "3열 촬영·디자인 상세페이지 기획안",
      similarityTarget: analysis.planningTemplate?.requiredSimilarity || 0.9,
      left: {
        id: "production",
        label: templateColumns.find((item) => item.id === "production")?.label || "촬영·제작 지시",
        productCountAndCondition: input.shootingConstraints || CONFIRM_NEEDED,
        minimumShots,
        shots: shotRoles.map((role, index) => ({
          id: `SHOT-${String(index + 1).padStart(2, "0")}`,
          role,
          reuse: false,
          productRequired: true,
          visualAnchor: input.visualIdentity || CONFIRM_NEEDED,
        })),
        requiredNotes: templateColumns.find((item) => item.id === "production")?.required || [],
      },
      center: {
        id: "pageFlow",
        label: templateColumns.find((item) => item.id === "pageFlow")?.label || "상세페이지 세로 구성",
        opening: pattern.opening || "제품 실물과 핵심 구매 이유",
        sections: sections.map((section, index) => ({
          number: String(index + 1).padStart(2, "0"),
          section,
          headlineRule: "구체적 제품 가치 중심 2줄 이내",
          subcopyRule: "제목을 설명하는 한 문장",
          transitionRule: index < sections.length - 1 ? `이 구간의 결론을 다음 '${sections[index + 1]}'의 이유로 연결` : "제품 정보·주의·FAQ로 마감",
        })),
      },
      right: {
        id: "designReference",
        label: templateColumns.find((item) => item.id === "designReference")?.label || "디자인·조판 레퍼런스",
        source: referenceDataset?.source?.name || "레퍼런스 DB 미연결",
        extractedElements: [
          `3열 기획안 구조와 중앙 장축 흐름`,
          `상품군 패턴: ${pattern.opening || CONFIRM_NEEDED}`,
          `선호 요소: ${input.referenceIntent.likes || CONFIRM_NEEDED}`,
        ],
        doNotCopy: [input.referenceIntent.dislikes || CONFIRM_NEEDED, ...(input.exclusions || [])],
        application: `사진·카피·그래픽을 별도 박스로 분리하지 않고 ${blueprint.layout} 원칙으로 한 구간 안에서 결합`,
      },
    };
  }

  function scoreDirection(input, validation, blueprint, index, sections) {
    const evidenceCount = input.evidence.length;
    const featureCount = input.features.length;
    const moodText = input.desiredMood.join(" ").toLowerCase();
    const moodMatch = blueprint.mood.split(/[,· ]/).filter((token) => token.length > 1 && moodText.includes(token)).length;
    const imageScore = input.productImages.length ? 15 : 8;
    const evidenceBoost = blueprint.id === "evidence-trust" ? Math.min(6, evidenceCount * 2) : Math.min(3, evidenceCount);
    const usageBoost = blueprint.id === "usage-conversion" && input.targetCustomer
      ? 4 + (input.buyerConcern ? 2 : 0) + (input.messagePriority.length ? 2 : 0)
      : 1;
    const detailBoost = blueprint.id === "product-system" ? Math.min(5, featureCount + input.productImages.length) : Math.min(3, featureCount);
    const brandBoost = blueprint.id === "brand-editorial" && input.brandName ? 4 : 2;
    const components = {
      productFit: Math.min(20, 14 + Math.min(6, featureCount + (input.majorCategory ? 2 : 0))),
      brandFit: Math.min(15, 8 + (input.brandName ? 2 : 0) + (input.visualIdentity ? 2 : 0) + Math.min(2, moodMatch) + brandBoost / 2),
      messageClarity: Math.min(15, 7 + (input.primaryPurchaseReason ? 4 : 0) + (input.messagePriority.length ? 2 : 0) + Math.min(2, featureCount)),
      visualQuality: imageScore,
      informationStructure: Math.min(15, 9 + Math.min(6, sections.length - 3)),
      conversion: Math.min(10, 4 + (input.targetCustomer ? 2 : 0) + (input.priceRange ? 1 : 0) + usageBoost / 2),
      differentiation: 5,
      latestDesign: Math.min(5, 2 + (input.references.length ? 1 : 0) + (input.referenceIntent.likes ? 1 : 0) + (input.referenceIntent.dislikes ? 1 : 0)),
    };
    const categoryFit = {
      "화장품": { "brand-editorial": 4, "evidence-trust": 2, "usage-conversion": 2, "product-system": 1 },
      "음식": { "brand-editorial": 2, "evidence-trust": 1, "usage-conversion": 3, "product-system": 0 },
      "기기": { "brand-editorial": 0, "evidence-trust": 3, "usage-conversion": 2, "product-system": 5 },
      "건강기능식품": { "brand-editorial": 1, "evidence-trust": 5, "usage-conversion": 2, "product-system": 1 },
      "기타제품": { "brand-editorial": 2, "evidence-trust": 1, "usage-conversion": 2, "product-system": 3 },
    }[input.majorCategory]?.[blueprint.id] || 0;
    const directionModifier = (blueprint.id === "brand-editorial"
      ? (input.desiredMood.length ? 3 : 0) + (input.references.length ? 1 : 0) - (input.productImages.length ? 0 : 2) - (/감성|추상/.test(input.deEmphasis) ? 4 : 0)
      : blueprint.id === "evidence-trust"
        ? (input.evidence.length ? Math.min(5, input.evidence.length * 2) : -5)
        : blueprint.id === "usage-conversion"
          ? (input.targetCustomer ? 4 : -3)
          : (input.productImages.length ? Math.min(5, input.productImages.length * 2) : -6) + Math.min(2, featureCount)) + categoryFit;
    let score = Object.values(components).reduce((sum, value) => sum + value, 0) + evidenceBoost / 2 + detailBoost / 2 + directionModifier;
    score = (score * 0.94) - Math.min(12, validation.missing.length * 1.5);
    score = Math.max(0, Math.min(validation.complete ? 96 : 94, Math.round(score)));
    // 입력이 충실한 프로젝트에서 모든 방향이 상한점으로 뭉치는 현상을 막는다.
    // 감성·증빙·제품 정보 보유량에 따라 각 방향의 실제 활용 한계를 반영한다.
    const saturationAdjustment = blueprint.id === "brand-editorial"
      ? (input.desiredMood.length ? -1 : -5)
      : blueprint.id === "evidence-trust"
        ? (evidenceCount >= 4 ? 0 : -Math.max(2, 6 - evidenceCount))
        : blueprint.id === "usage-conversion"
          ? 0
          : (featureCount >= 5 ? -1 : -Math.max(2, 6 - featureCount));
    score = Math.max(0, score + saturationAdjustment);
    return { score, components };
  }

  function directionMessage(input, blueprint) {
    if (blueprint.id === "evidence-trust") return `핵심 구매 이유: ${input.primaryPurchaseReason || input.coreBenefit || blueprint.message}. 확인된 자료와 1:1로 연결`;
    if (blueprint.id === "usage-conversion") return `구매 망설임: ${input.buyerConcern || "확인 필요"} → 설득 근거: ${input.primaryPurchaseReason || input.coreBenefit || "확인 필요"}`;
    if (blueprint.id === "product-system") return `제품 시각 기준: ${input.visualIdentity || "확인 필요"}. 이를 훼손하지 않고 제품·구성·내용물을 정확히 설명`;
    return `핵심 구매 이유: ${input.primaryPurchaseReason || input.coreBenefit || blueprint.message}. 제품과 원재료 중심의 편집 흐름으로 전달`;
  }

  function createDirections(input, validation, analysis) {
    return DIRECTION_BLUEPRINTS.map((blueprint, index) => {
      const sections = selectSections(analysis, blueprint);
      const scoring = scoreDirection(input, validation, blueprint, index, sections);
      const planningColumns = buildPlanningColumns(input, analysis, blueprint, sections);
      const shotRoles = analysis.drivePattern?.shotRoles || blueprint.imageKinds;
      return {
        id: blueprint.id,
        conceptName: CATEGORY_DIRECTION_NAMES[input.majorCategory]?.[blueprint.id] || blueprint.conceptName,
        coreMessage: directionMessage(input, blueprint),
        targetCustomer: input.targetCustomer || CONFIRM_NEEDED,
        overallMood: blueprint.mood,
        colors: paletteFor(analysis, index, input),
        typography: blueprint.typography,
        layout: blueprint.layout,
        materialAndEffects: blueprint.material,
        informationDensity: blueprint.density,
        productDirection: `${blueprint.productDirection} · 제품 시각 기준: ${input.visualIdentity || CONFIRM_NEEDED}`,
        recommendedImages: shotRoles,
        sections,
        expectedEffect: blueprint.effect,
        caution: `${blueprint.caution} · ${analysis.risk}`,
        shotFocus: `${analysis.shotFocus} · 최소 ${analysis.drivePattern?.minimumShots || 4}컷, 사진 재사용 금지`,
        planningColumns,
        referenceDbVersion: analysis.driveReferenceVersion,
        score: scoring.score,
        scoreBreakdown: scoring.components,
        disqualified: false,
        disqualifyReasons: [],
      };
    });
  }

  function buildReview(raw = {}) {
    const input = normalizeInput(raw);
    const validation = validateInput(input);
    const analysis = categoryAnalysis(input);
    const directions = createDirections(input, validation, analysis);
    const ranking = directions.slice().sort((a, b) => b.score - a.score);
    const recommended = ranking.slice(0, 2).map((direction, index) => ({
      id: direction.id,
      rank: index + 1,
      score: direction.score,
      reason: `${direction.conceptName}은(는) ${input.majorCategory || "상품군"}의 ${analysis.criteria.slice(0, 2).join("·")}을 ${direction.informationDensity} 정보 밀도로 전달하는 데 적합합니다.`,
    }));
    const inputAudit = {
      confirmedFacts: unique([input.productName, input.brandName, ...input.features, ...input.evidence, ...input.mustInclude]),
      customerPreferences: unique([input.primaryPurchaseReason, ...input.messagePriority, input.emphasis, input.deEmphasis, ...input.desiredMood]),
      visualEvidence: {
        productImages: input.productImages,
        identity: input.visualIdentity || CONFIRM_NEEDED,
        status: input.visualAnalysis.status,
        usagePriority: input.productImageUsage,
        note: input.visualAnalysis.rule,
      },
      references: {
        items: input.references,
        likes: input.referenceIntent.likes || CONFIRM_NEEDED,
        dislikes: input.referenceIntent.dislikes || CONFIRM_NEEDED,
        database: analysis.driveReferenceVersion,
      },
      separatedSalesConditions: input.salesConditions,
      unresolved: validation.missing.map((item) => item.label),
      policy: "확정 사실·고객 희망·판매 조건·분석 가설을 서로 대체하지 않음",
    };
    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      status: "REVIEW_ONLY_NOT_DEFAULT",
      input,
      inputAudit,
      validation,
      categoryAnalysis: analysis,
      directions,
      recommended,
      productionGate: {
        allowed: validation.blockers.length === 0,
        blockers: validation.blockers,
        hardFailRules: ["제품 원본 훼손", "허위 정보", "심각한 가독성 문제", "글자 깨짐", "검증되지 않은 수치·효능·후기"],
      },
      referenceProtocol: {
        sourceCount: referenceDataset?.source?.totalFiles || 0,
        template: referenceDataset?.planningTemplate || null,
        rule: "선택 방향은 좌측 촬영 지시·중앙 장축 구성·우측 디자인 레퍼런스의 3열 기획안으로만 확장",
      },
    };
  }

  return {
    VERSION,
    CONFIRM_NEEDED,
    TAXONOMY,
    FIELD_DEFINITIONS,
    CATEGORY_SPECS,
    DIRECTION_BLUEPRINTS,
    inferClassification,
    normalizeInput,
    validateInput,
    categoryAnalysis,
    createDirections,
    buildPlanningColumns,
    buildReview,
  };
});
