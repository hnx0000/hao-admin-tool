(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HAO_DESIGN_PROCESS = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERSION = "hao-design-process-v4-review-driven";

  const VARIANTS = Object.freeze({
    green: {
      key: "green",
      productName: "클렌즈 그린블렌드",
      shortName: "그린블렌드",
      image: "../assets/saengjeup/cleanse-green-original.png",
      accent: "#819464",
      secondary: "#b88a4a",
      dark: "#33412d",
      ingredients: "키위·케일·양배추·청포도·사과·파인애플",
      visualNote: "연녹색과 골드, 밝은 아침 자연광",
      labelGuard: "라벨에 보이는 그린 원료만 사용하고 원료별 함량은 확인 전 표기 금지"
    },
    berry: {
      key: "berry",
      productName: "클렌즈 베리블렌드",
      shortName: "베리블렌드",
      image: "../assets/saengjeup/cleanse-berry-original.png",
      accent: "#513547",
      secondary: "#944653",
      dark: "#241b24",
      ingredients: "블루베리·푸룬·레드비트·배·사과 퓨레·빌베리",
      visualNote: "딥 퍼플과 비트 레드, 얇은 투과광",
      labelGuard: "검붉은 실제 액상색을 유지하고 베리색을 네온처럼 과장 금지"
    }
  });

  const REFERENCES = Object.freeze([
    { id: "REF-01", title: "아침에주스 클렌즈 제품군", role: "구성·동일 제품군", extract: "제품 우선 히어로, 원료 설명 순서, 단일 맛 전개 구조", doNotCopy: "고유 카피·기존 촬영 사진·2종 동시 배치", useFor: "SINGLE PRODUCT HERO·INGREDIENT STORY" },
    { id: "REF-02", title: "서울우유 알룰로스 그릭", role: "촬영 지시·식품 조판", extract: "제품 수량·상태·소품·금지요소까지 지정하는 촬영 메모", doNotCopy: "그릭요거트 제품·녹색 패키지 그래픽", useFor: "SHOT LIST·TRUST" },
    { id: "REF-03", title: "서울우유 파머스그릭", role: "사진 리듬", extract: "큰 식감 사진과 여백 많은 정보 구간 교차", doNotCopy: "사진·문구·제품 배치", useFor: "TEXTURE·MOMENT" },
    { id: "REF-04", title: "호아비 리치꿀스틱", role: "근거 순서", extract: "스토리→원산지→검사→FAQ로 이어지는 신뢰 흐름", doNotCopy: "브랜드 스토리·인증·시험 수치", useFor: "TRUST·PRODUCT INFO" }
  ]);

  function build(review = {}, selectedDirectionId = "", variantKey = "green") {
    const directions = Array.isArray(review.directions) ? review.directions : [];
    const selected = directions.find((item) => item.id === selectedDirectionId) || directions.find((item) => item.id === "usage-conversion") || directions[0] || null;
    const variant = VARIANTS[variantKey] || VARIANTS.green;
    const input = review.input || {};
    const planningColumns = selected?.planningColumns || null;
    const sections = variantSections(variant, input, planningColumns);
    const shots = variantShots(variant).map((shot, index) => ({
      ...shot,
      requestedRole: planningColumns?.left?.shots?.[index]?.role || shot.purpose,
      reuse: false,
      sourceVisualIdentity: input.visualIdentity || "확인 필요",
    }));
    return {
      version: VERSION,
      phase1: {
        title: "1차 분석 · 상품군/타깃/설득 방향",
        classification: [input.majorCategory, input.subCategory].filter(Boolean).join(" · ") || "음식 · 음료",
        primaryTarget: input.targetCustomer || "확인 필요",
        purchaseReason: input.primaryPurchaseReason || input.coreBenefit || `${variant.productName} 단일 제품의 확인된 구매 이유`,
        buyerConcern: input.buyerConcern || "확인 필요",
        messagePriority: input.messagePriority || [],
        emphasis: input.emphasis || "확인 필요",
        deEmphasis: input.deEmphasis || "확인 필요",
        selectedDirection: selected,
        rejected: directions.filter((item) => item.id !== selected?.id).map((item) => ({ id: item.id, name: item.conceptName, score: item.score })),
        unverified: review.validation?.missing?.map((item) => item.label) || ["확인되지 않은 정보"],
        inputAudit: review.inputAudit || null,
        outputRule: "한 상세페이지에는 선택한 맛 한 종류만 사용하며 다른 맛 제품·카피·색상·비교 구조를 절대 섞지 않음"
      },
      phase2: {
        title: `2차 시안 · ${variant.productName} 개별 상세페이지`,
        variant,
        designStrategy: `${variant.productName} 단일 제품 원본 중심 · ${selected?.conceptName || "검토 방향 확인 필요"} · Drive 3열 기획안`,
        intro: {
          frame: `${variant.visualNote}을 사용한 단일 제품 풀블리드 촬영 프레임`,
          logo: "상단 공식 회사 로고 안전영역, 그 아래 아침에주스와 정확한 단일 제품명",
          typography: "영문 Cleanse Juice는 큰 편집형 산세리프, 한글 정보는 굵은 고딕과 짧은 본문",
          placement: "상단 34% 카피, 중앙 하단 선택한 제품 1병, 하단 제품 정보",
          mandatory: input.mustInclude?.length ? input.mustInclude : ["아침에주스", variant.productName, "730mL", "냉장제품"]
        },
        palette: ["#f4f0e6", variant.accent, variant.secondary, variant.dark, "#24221f"],
        shots,
        references: REFERENCES,
        planningColumns,
        referenceProtocol: review.referenceProtocol || null,
        sections,
        targetHeight: sections.reduce((sum, section) => sum + section.height, 0),
        continuity: [
          `${variant.productName} 라벨에서 추출한 주조색만 전체 고정 팔레트로 사용`,
          "병 캡과 과일의 원형을 번호 배지·정보 카드에 반복",
          "사진 구간과 정보 구간을 번갈아 배치해 밀도 리듬 유지",
          "각 섹션 하단 문장이 다음 섹션의 질문을 예고",
          "마지막 화면에서 첫 화면의 동일 단일 제품을 다시 사용해 시각적으로 회수"
        ],
        rejectRules: [
          "한 상세페이지에 그린·베리 두 맛을 함께 노출하거나 선택·비교 구조로 구성",
          "제품 라벨·로고·병 형태·비율 변경",
          "근거 없는 디톡스·치료·체중 감량 표현",
          "확인되지 않은 원재료 함량·영양·인증·후기 생성",
          "레퍼런스의 고유 카피·제품 사진·그래픽 복제",
          "작은 한글·영양표·법정 고지를 이미지에 굽기"
        ],
        imagePolicy: {
          cutoutUsage: "흰 배경 누끼 단독 노출은 최대 1회지만, 실제 제품은 원료·액상·잔과 결합한 촬영 장면에서 반복해 제품이 항상 주피사체가 되게 함",
          stagedVisuals: "제품 없는 감성컷은 사용하지 않고 본문 사진마다 실제 제품 또는 정확한 제품 교체 위치를 포함",
          variantIsolation: `현재 시안은 ${variant.productName} 전용. 다른 맛의 제품·원료·라벨·색상·카피가 하나라도 들어오면 자동 불합격`,
          generationGuard: "생성 이미지 안에서 제품·라벨·로고·인증·문구를 재생성하지 않고 제품이 필요한 최종 컷은 실제 촬영물로 교체",
          copyRule: "서브카피는 짧은 구호가 아니라 해당 섹션의 역할을 설명하는 완결된 한 문장으로 조판",
          referenceRule: "모든 사진 구간에 촬영 ref와 디자인 ref를 분리해 구도·빛·소품·안전여백과 조판·정보위계·스크롤 연결을 각각 기록"
        }
      }
    };
  }

  function variantSections(variant, input = {}, planningColumns = null) {
    const requested = planningColumns?.center?.sections || [];
    const priority = Array.isArray(input.messagePriority) ? input.messagePriority.join(" · ") : String(input.messagePriority || "");
    return [
      { id: "hero", no: "01", title: input.primaryPurchaseReason || `여섯 가지 과일과 채소를 담은 ${variant.productName}`, height: 2300, visualBase: "photo", layout: "product-ingredient-fullbleed", asset: "SHOT-01", transition: "히어로 원료의 원형을 다음 원료 배지로 이어 제품을 화면 중심에 유지" },
      { id: "ingredients", no: "02", title: `키위부터 파인애플까지 ${variant.shortName}를 이루는 여섯 가지`, height: 2100, visualBase: "hybrid", layout: "product-ingredient-orbit", asset: "SHOT-02", transition: "원료 곡선을 제품·원료 통합 촬영 장면의 하단 곡선으로 확대" },
      { id: "ingredientScene", no: "03", title: `한눈에 보이는 ${variant.shortName}의 원료 구성`, height: 2200, visualBase: "photo", layout: "product-dominant-ingredient-scene", asset: "SHOT-02", transition: "제품 라벨의 주조색 면을 액상 촬영 배경의 곡면으로 연결" },
      { id: "liquid", no: "04", title: `보이는 색 그대로 잔에 따른 ${variant.shortName}`, height: 2300, visualBase: "photo", layout: "product-and-pour", asset: "SHOT-03", transition: "병에서 잔으로 흐르는 액체선을 패키지 디테일 구간의 세로선으로 연결" },
      { id: "package", no: "05", title: "흰 캡부터 액상선까지 실제 병을 가까이", height: 2100, visualBase: "hybrid", layout: "package-detail-zoom", asset: "SHOT-04", transition: "앞 컷의 액체선을 병 어깨와 액상선의 매크로 확대 장면으로 연결" },
      { id: "serving", no: "06", title: `병을 열고 잔에 따라 ${variant.shortName}를 마시는 순간`, height: 2000, visualBase: "photo", layout: "product-serving-action", asset: "SHOT-05", transition: "밝은 석재 면을 정확 정보의 흰 배경으로 자연스럽게 전환" },
      { id: "verified", no: "07", title: "확인된 정보만 제품 라벨 그대로", height: 2300, visualBase: "design", layout: "verified-label-table", asset: "SHOT-05", transition: "정보 구분선과 주조색을 마지막 제품 장면에서 다시 회수", sourcePriority: priority || "확인 필요" },
      { id: "closing", no: "08", title: `여섯 가지 원료를 담은 아침에주스 ${variant.productName}`, height: 2200, visualBase: "hybrid", layout: "three-product-closing", asset: "SHOT-06", transition: "종료" }
    ].map((section, index) => ({ ...section, driveSection: requested[index]?.section || section.title, copyRule: requested[index]?.subcopyRule || "제목을 설명하는 한 문장" }));
  }

  function variantShots(variant) {
    return [
      { id: "SHOT-01", section: "HERO", purpose: `${variant.shortName} 제품과 핵심 원료를 첫 화면에서 동시에 인지`, products: `${variant.shortName} 밀봉 1병`, composition: "병을 우측 중앙에 화면 높이 55% 이상으로 배치, 원료는 하단 곡선", camera: "정면 5도, 70~85mm", light: "좌상단 부드러운 아침 자연광", background: "아이보리 스톤 + 저채도 올리브 곡면", props: `${variant.ingredients} 중 확인된 원료만 절제해 사용`, safeArea: "좌상단 38%", retouch: "라벨·액상색·병 비율 변경 금지", output: "세로 4:5 고유 원본" },
      { id: "SHOT-02", section: "INGREDIENT SCENE", purpose: `${variant.shortName}의 여섯 원료 구성을 제품과 함께 전달`, products: `${variant.shortName} 1병`, composition: "제품을 우측에 세워 주피사체로 유지하고 원료 6개를 하단의 낮은 곡선으로 배치", camera: "눈높이보다 약간 높은 10도, 50~70mm", light: "SHOT-01과 동일 광원·색보정", background: "SHOT-01과 동일 아이보리 스톤·올리브", props: variant.ingredients, safeArea: "좌측 38%", retouch: variant.labelGuard, output: "세로 4:5 고유 원본" },
      { id: "SHOT-03", section: "LIQUID POUR", purpose: `${variant.shortName}의 실제 액상색을 병과 잔의 관계로 전달`, products: `${variant.shortName} 1병 + 투명 잔 1개`, composition: "병 좌측·잔 우측, 따르는 액체선이 다음 구간으로 이어짐", camera: "정면 10도, 70mm", light: "SHOT-01과 동일 광원·색보정", background: "SHOT-01과 동일 아이보리 스톤·올리브", props: "투명 잔만 사용", safeArea: "우상단 28%", retouch: "점도·거품·색상 과장 금지", output: "세로 4:5 고유 원본" },
      { id: "SHOT-04", section: "PACKAGE MACRO", purpose: "앞 컷의 액체 흐름을 병 어깨와 액상선의 확대 장면으로 연결", products: `${variant.shortName} 1병`, composition: "흰 캡·투명 병목·액상선이 화면 70%를 채우는 매크로", camera: "100mm 매크로", light: "SHOT-01과 동일 광원·색보정", background: "동일 올리브 곡면을 아웃포커스", props: "없음", safeArea: "좌하단 32%", retouch: "라벨 글자를 새로 생성하지 않음", output: "세로 4:5 고유 원본" },
      { id: "SHOT-05", section: "SERVING", purpose: "제품을 잔 옆에 놓는 실제 음용 행동 전달", products: `${variant.shortName} 1병 + 투명 잔 1개`, composition: "왼손이 제품을 내려놓는 순간, 병 중심·잔 보조", camera: "눈높이 50mm", light: "SHOT-01과 동일 광원·색보정", background: "동일 아이보리 스톤·올리브", props: "손과 투명 잔 외 없음", safeArea: "우상단 30%", retouch: "손 형태와 라벨 왜곡 검수", output: "세로 4:5 고유 원본" },
      { id: "SHOT-06", section: "CLOSING", purpose: "같은 캠페인 분위기에서 단일 맛 제품을 묶음 구성으로 회수", products: `${variant.shortName} 3병`, composition: "전면 1병 라벨 정면, 후면 2병 깊이감 배치", camera: "정면보다 낮은 5도, 70mm", light: "SHOT-01과 동일 광원·색보정", background: "동일 아이보리 스톤·올리브", props: "하단 원료 소량", safeArea: "좌상단 42%", retouch: "동일 맛만 사용, 병 복제 흔적 금지", output: "세로 4:5 고유 원본" }
    ];
  }

  // Backward-compatible exports now resolve to a single-product green draft.
  // They must never contain the removed two-flavor choice/comparison structure.
  const SAENGJEUP_SECTIONS = Object.freeze(variantSections(VARIANTS.green));
  const SAENGJEUP_SHOTS = Object.freeze(variantShots(VARIANTS.green));

  function buildVariant(review = {}, selectedDirectionId = "", variantKey = "green") {
    const common = build(review, selectedDirectionId, variantKey);
    const variant = VARIANTS[variantKey] || VARIANTS.green;
    const sections = variantSections(variant, review.input || {}, common.phase1.selectedDirection?.planningColumns || null);
    return {
      ...common,
      phase1: { ...common.phase1, outputRule: "공통 분석 결과를 사용하되 그린·베리 상세페이지는 각각 별도 생성" },
      phase2: {
        ...common.phase2,
        title: `2차 시안 · ${variant.productName} 개별 상세페이지`,
        variant,
        designStrategy: common.phase2.designStrategy,
        intro: {
          frame: `${variant.visualNote}을 사용한 단일 제품 풀블리드 촬영 프레임`,
          logo: "상단 공식 회사 로고 안전영역, 그 아래 아침에주스와 정확한 제품명",
          typography: "영문 Cleanse Juice는 큰 편집형 산세리프, 한글 정보는 굵은 고딕과 짧은 본문",
          placement: "상단 34% 카피, 중앙 하단 실제 제품 1병, 하단 제품 정보",
          mandatory: review.input?.mustInclude?.length ? review.input.mustInclude : ["아침에주스", variant.productName, "730mL", "냉장제품"]
        },
        palette: ["#f4f0e6", variant.accent, variant.secondary, variant.dark, "#24221f"],
        shots: variantShots(variant),
        sections,
        targetHeight: sections.reduce((sum, section) => sum + section.height, 0),
        continuity: [
          `${variant.productName} 라벨에서 추출한 주조색을 전체 고정 팔레트로 사용`,
          "병 캡과 원료의 원형을 번호 배지·정보 카드에 반복",
          "사진 구간과 정보 구간을 번갈아 배치해 밀도 리듬 유지",
          "각 섹션 하단 문장이 다음 섹션의 질문을 예고",
          "마지막 화면에서 첫 화면의 단일 제품 구도를 다시 사용해 시각적으로 회수"
        ],
        imagePolicy: {
          cutoutUsage: "흰 배경 누끼 단독 노출은 최대 1회지만 실제 제품은 원료·액상·잔과 결합한 장면에서 반복 노출",
          stagedVisuals: "제품 없는 감성컷은 배제하고 각 사진 구간에 실제 제품 또는 정확한 제품 교체 위치를 포함",
          assetReuse: "동일 이미지 파일은 상세페이지 전체에서 1회만 사용. 촬영 레퍼런스·본문·마무리 사이의 재사용도 금지하며 중복 발견 시 자동 불합격",
          campaignConsistency: "모든 고유 컷은 같은 아이보리 스톤 세트·저채도 올리브 곡면·좌상단 자연광·동일 화이트밸런스와 색보정을 유지",
          generationGuard: "생성 장면은 촬영 레퍼런스로 표시하며 최종본에서는 라벨과 병 비율이 보존된 실제 촬영물로 교체",
          copyRule: "각 섹션 서브카피는 핵심 장면과 정보 목적을 설명하는 완결된 한 문장",
          referenceRule: "촬영 ref와 디자인 ref를 구분해 실제 촬영 지시와 조판 지시를 함께 제공"
        }
      }
    };
  }

  return { VERSION, VARIANTS, SAENGJEUP_SECTIONS, SAENGJEUP_SHOTS, REFERENCES, build, buildVariant };
});
