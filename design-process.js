(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HAO_DESIGN_PROCESS = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERSION = "hao-design-process-v3";

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

  const SAENGJEUP_SECTIONS = Object.freeze([
    { id: "hero", no: "01", title: "오늘 아침, 어떤 블렌드로 시작할까요?", height: 1900, visualBase: "photo", layout: "fullbleed-hero", asset: "SHOT-01", transition: "병의 세로 실루엣과 원형 캡을 다음 요약 배지로 반복" },
    { id: "summary", no: "02", title: "한눈에 먼저 확인하는 클렌즈 주스 2종", height: 1200, visualBase: "design", layout: "three-summary-cards", asset: "verified-copy", transition: "원형 배지에서 두 제품의 원료 원형 그래픽으로 연결" },
    { id: "choice", no: "03", title: "취향에 맞춰 고르는 두 가지 과일·채소 블렌드", height: 1700, visualBase: "hybrid", layout: "split-choice", asset: "SHOT-01", transition: "좌측 그린·우측 베리의 분할 색면을 각 제품 이야기로 확대" },
    { id: "green", no: "04", title: "클렌즈 그린블렌드", height: 2400, visualBase: "photo", layout: "ingredient-editorial-left", asset: "SHOT-02", transition: "연녹색 배경을 밝은 중립색으로 낮춘 뒤 베리 퍼플로 전환" },
    { id: "berry", no: "05", title: "클렌즈 베리블렌드", height: 2400, visualBase: "photo", layout: "ingredient-editorial-right", asset: "SHOT-03", transition: "검붉은 액상 클로즈업의 곡선을 따르는 장면으로 연결" },
    { id: "texture", no: "06", title: "색과 농도를 실제 액상으로 확인하세요", height: 1500, visualBase: "photo", layout: "macro-pour", asset: "SHOT-04", transition: "액체 흐름을 아래 생활 장면의 세로 동선으로 연결" },
    { id: "moment", no: "07", title: "차갑게 준비해 일상의 음용 순간으로", height: 1700, visualBase: "photo", layout: "lifestyle-sequence", asset: "SHOT-05", transition: "냉장고의 흰 면을 신뢰·라벨 정보의 흰 배경으로 유지" },
    { id: "trust", no: "08", title: "보이는 정보만 정확하게 확인하세요", height: 1600, visualBase: "design", layout: "verified-info-table", asset: "SHOT-06", transition: "얇은 정보 구분선을 보관·음용 안내에도 반복" },
    { id: "price", no: "09", title: "원하는 블렌드를 병당 6,000원에", height: 1500, visualBase: "design", layout: "price-and-option", asset: "verified-copy", transition: "두 옵션 색을 마지막 제품 2종 히어로로 회수" },
    { id: "closing", no: "10", title: "GREEN OR BERRY, 당신의 아침 블렌드", height: 1600, visualBase: "hybrid", layout: "dual-product-closing", asset: "SHOT-01", transition: "종료" },
  ]);

  const SAENGJEUP_SHOTS = Object.freeze([
    {
      id: "SHOT-01", section: "HERO · CHOICE · CLOSING", purpose: "그린과 베리 2종의 선택 구조를 첫 화면에서 즉시 이해",
      products: "그린 1병 + 베리 1병, 라벨 정면, 흰 캡과 병 비율 유지", composition: "두 병 높이를 맞추고 중앙 간격 8~12%, 좌측 그린·우측 베리",
      camera: "정면 0~5도, 70~100mm 중망원 느낌, 수직 왜곡 없음", light: "좌전방 대형 소프트광 + 약한 우측 필, 투명 병 윤곽 분리",
      background: "그린은 연한 올리브, 베리는 짙은 퍼플이 중앙에서 부드럽게 만나는 무광 배경", props: "원료는 병 뒤가 아니라 하단 가장자리에 최소 배치",
      safeArea: "상단 32%, 병 사이 8%는 편집 가능한 카피 공간", retouch: "라벨·액상색·용기 비율 변경 금지", output: "세로 배경 포함 JPG + 제품 누끼 PNG"
    },
    {
      id: "SHOT-02", section: "GREEN STORY", purpose: "그린블렌드의 실제 색과 라벨에 표시된 원료 구성 전달",
      products: "그린블렌드 1병", composition: "병을 우측 40%에 두고 좌측에 원료와 제목 공간",
      camera: "정면보다 10~15도 높은 시점, 70mm 느낌", light: "따뜻한 자연광, 액상 투과는 약하게",
      background: "연녹색·골드 계열", props: "키위·케일·양배추·청포도·사과·파인애플만 사용",
      safeArea: "좌상단 38%", retouch: "라벨에 없는 원료와 함량 표현 금지", output: "세로 4:5 + 원료 개별 누끼"
    },
    {
      id: "SHOT-03", section: "BERRY STORY", purpose: "베리블렌드의 검붉은 액상과 과일 조합 전달",
      products: "베리블렌드 1병", composition: "병을 좌측 42%에 두고 우측에 원료·본문 공간",
      camera: "정면보다 10~15도 높은 시점, 70mm 느낌", light: "뒤쪽 얇은 투과광 + 전면 소프트 필",
      background: "딥 퍼플·비트 레드 계열", props: "블루베리·푸룬·레드비트·배·사과·빌베리만 사용",
      safeArea: "우상단 38%", retouch: "액상색을 보라색 네온처럼 과장 금지", output: "세로 4:5 + 원료 개별 누끼"
    },
    {
      id: "SHOT-04", section: "TEXTURE", purpose: "두 제품의 실제 액상색과 농도를 과장 없이 비교",
      products: "각 제품 1병 + 투명 잔 2개", composition: "좌우 분할, 동일 높이에서 따르는 순간과 잔 표면 클로즈업",
      camera: "45도 탑뷰 1컷 + 측면 매크로 1컷", light: "뒤쪽 스트립광으로 액상 윤곽 확보",
      background: "따뜻한 아이보리 무광", props: "투명 잔 외 장식 최소화",
      safeArea: "중앙 상단 25%", retouch: "점도·거품·색상 합성으로 과장 금지", output: "가로 3:2와 세로 크롭 동시"
    },
    {
      id: "SHOT-05", section: "DRINKING MOMENT", purpose: "냉장 제품을 일상에서 꺼내 마시는 사용 맥락 제공",
      products: "제품 2병, 장면별 1병 사용", composition: "냉장고에서 꺼내기 → 아침 식탁 → 이동 전 손에 드는 3장면",
      camera: "눈높이 생활 시점, 35~50mm", light: "밝은 아침 자연광",
      background: "흰 냉장고·밝은 목재 또는 석재 식탁", props: "간단한 컵·냅킨만 사용",
      safeArea: "장면별 반대쪽 30%", retouch: "체중 감량·디톡스·신체 변화 암시 금지", output: "세로 4:5 3컷"
    },
    {
      id: "SHOT-06", section: "TRUST · PRODUCT INFO", purpose: "제품 라벨·용량·보관 정보를 정확하게 판독",
      products: "각 제품 정면·측면·후면", composition: "수직·수평 정렬, 정보면 평행 촬영",
      camera: "정면 0도, 85~100mm, 왜곡 보정", light: "균일한 복사광, 반사 억제",
      background: "중성 회색 또는 흰색", props: "없음",
      safeArea: "제품 주변 15%", retouch: "문구 재생성 금지, 원본 촬영 후 별도 텍스트 조판", output: "고해상도 JPG + 누끼 PNG"
    }
  ]);

  const REFERENCES = Object.freeze([
    { id: "REF-01", title: "아침에주스 클렌즈 2종", role: "구성·동일 제품군", extract: "2종 히어로, 원료 설명 순서, 제품 선택 구조", doNotCopy: "고유 카피·기존 촬영 사진", useFor: "HERO·CHOICE·GREEN/BERRY" },
    { id: "REF-02", title: "서울우유 알룰로스 그릭", role: "촬영 지시·식품 조판", extract: "제품 수량·상태·소품·금지요소까지 지정하는 촬영 메모", doNotCopy: "그릭요거트 제품·녹색 패키지 그래픽", useFor: "SHOT LIST·TRUST" },
    { id: "REF-03", title: "서울우유 파머스그릭", role: "사진 리듬", extract: "큰 식감 사진과 여백 많은 정보 구간 교차", doNotCopy: "사진·문구·제품 배치", useFor: "TEXTURE·MOMENT" },
    { id: "REF-04", title: "호아비 리치꿀스틱", role: "근거 순서", extract: "스토리→원산지→검사→FAQ로 이어지는 신뢰 흐름", doNotCopy: "브랜드 스토리·인증·시험 수치", useFor: "TRUST·PRODUCT INFO" }
  ]);

  function build(review = {}, selectedDirectionId = "") {
    const directions = Array.isArray(review.directions) ? review.directions : [];
    const selected = directions.find((item) => item.id === selectedDirectionId) || directions.find((item) => item.id === "usage-conversion") || directions[0] || null;
    return {
      version: VERSION,
      phase1: {
        title: "1차 분석 · 상품군/타깃/설득 방향",
        classification: "음식 · 음료",
        primaryTarget: "과일·채소 음료를 일상에서 간편하게 마시려는 고객",
        purchaseReason: "그린·베리 두 가지 선택, 실제 730mL 병 제품, 냉장 음용 편의",
        selectedDirection: selected,
        rejected: directions.filter((item) => item.id !== selected?.id).map((item) => ({ id: item.id, name: item.conceptName, score: item.score })),
        unverified: ["정확한 맛·향 설명", "원재료별 함량", "영양정보", "제조·인증·시험자료", "판매 옵션·배송 조건"]
      },
      phase2: {
        title: "2차 시안 · 디자인/촬영/스크롤 연결",
        designStrategy: "제품 원본 중심의 사용 상황 전환형 + 근거 중심 조판 보완",
        intro: {
          frame: "좌측 그린·우측 베리가 만나는 풀블리드 투톤 촬영 프레임",
          logo: "상단 중앙 서울우유/브랜드 공식 로고 안전영역, 그 아래 아침에주스 제품명",
          typography: "영문 Cleanse Juice는 큰 편집형 산세리프, 한글 정보는 굵은 고딕과 짧은 본문",
          placement: "상단 32% 카피, 중앙 하단 실제 제품 2병, 최하단 선택 안내",
          mandatory: ["아침에주스", "클렌즈 그린블렌드", "클렌즈 베리블렌드", "730mL", "냉장제품", "병당 6,000원(테스트값)"]
        },
        palette: ["#f4f0e6", "#819464", "#b88a4a", "#453242", "#24221f"],
        shots: SAENGJEUP_SHOTS,
        references: REFERENCES,
        sections: SAENGJEUP_SECTIONS,
        targetHeight: SAENGJEUP_SECTIONS.reduce((sum, section) => sum + section.height, 0),
        continuity: [
          "제품 라벨에서 추출한 그린·골드·퍼플을 전체 고정 팔레트로 사용",
          "병 캡과 과일의 원형을 번호 배지·정보 카드에 반복",
          "사진 구간과 정보 구간을 번갈아 배치해 밀도 리듬 유지",
          "각 섹션 하단 문장이 다음 섹션의 질문을 예고",
          "마지막 화면에서 첫 화면의 2종 구도를 다시 사용해 시각적으로 회수"
        ],
        rejectRules: [
          "제품 라벨·로고·병 형태·비율 변경",
          "근거 없는 디톡스·치료·체중 감량 표현",
          "확인되지 않은 원재료 함량·영양·인증·후기 생성",
          "레퍼런스의 고유 카피·제품 사진·그래픽 복제",
          "작은 한글·영양표·법정 고지를 이미지에 굽기"
        ],
        imagePolicy: {
          cutoutUsage: "제품 누끼는 하단 정확 정보 확인 구간에서 최대 1회만 사용하며 프로젝트에 따라 0회 허용",
          stagedVisuals: "누끼는 제품 형태·라벨·액상색 참고 자료로만 사용하고 본문은 실제 촬영 또는 촬영 레퍼런스 이미지로 구성",
          generationGuard: "생성 이미지 안에서 제품·라벨·로고·인증·문구를 재생성하지 않고 제품이 필요한 최종 컷은 실제 촬영물로 교체",
          copyRule: "서브카피는 짧은 구호가 아니라 해당 섹션의 역할을 설명하는 완결된 한 문장으로 조판",
          referenceRule: "모든 사진 구간에 촬영 ref와 디자인 ref를 분리해 구도·빛·소품·안전여백과 조판·정보위계·스크롤 연결을 각각 기록"
        }
      }
    };
  }

  function variantSections(variant) {
    return [
      { id: "hero", no: "01", title: `오늘 아침, ${variant.shortName}로 시작해보세요`, height: 1900, visualBase: "photo", layout: "single-product-fullbleed", asset: "SHOT-01", transition: "병의 세로 실루엣과 원형 캡을 다음 요약 배지로 반복" },
      { id: "summary", no: "02", title: `한눈에 먼저 확인하는 ${variant.shortName}`, height: 1200, visualBase: "design", layout: "three-summary-cards", asset: "verified-copy", transition: "원형 배지에서 원료 원형 그래픽으로 연결" },
      { id: "context", no: "03", title: "냉장고에서 꺼내 간편하게 준비하는 한 병", height: 1700, visualBase: "photo", layout: "morning-context", asset: "SHOT-04", transition: "밝은 생활 배경을 원료 이야기의 자연광으로 유지" },
      { id: "ingredient", no: "04", title: `${variant.shortName}에 담긴 과일·채소`, height: 2400, visualBase: "hybrid", layout: "ingredient-editorial", asset: "SHOT-02", transition: "원료 원형과 액체 곡선을 실제 색·농도 클로즈업으로 확대" },
      { id: "texture", no: "05", title: "색과 농도를 실제 액상으로 확인하세요", height: 2400, visualBase: "photo", layout: "macro-pour", asset: "SHOT-03", transition: "액체 흐름을 병의 세로 실루엣과 음용 동선으로 연결" },
      { id: "package", no: "06", title: "한 병에 담긴 730mL", height: 1500, visualBase: "hybrid", layout: "package-and-scale", asset: "SHOT-01", transition: "제품 누끼의 흰 캡을 보관 안내의 흰 배경으로 유지" },
      { id: "moment", no: "07", title: "차갑게 준비해 일상의 음용 순간으로", height: 1700, visualBase: "photo", layout: "lifestyle-sequence", asset: "SHOT-04", transition: "냉장고의 흰 면을 신뢰·라벨 정보 구간까지 유지" },
      { id: "trust", no: "08", title: "보이는 정보만 정확하게 확인하세요", height: 1600, visualBase: "design", layout: "verified-info-table", asset: "SHOT-05", transition: "얇은 정보 구분선을 가격·구매 판단 구간에 반복" },
      { id: "price", no: "09", title: `${variant.shortName} 병당 6,000원`, height: 1500, visualBase: "design", layout: "single-option-price", asset: "verified-copy", transition: "주조색을 마지막 단일 제품 히어로에서 다시 회수" },
      { id: "closing", no: "10", title: `${variant.productName}, 오늘의 한 병`, height: 1600, visualBase: "hybrid", layout: "single-product-closing", asset: "SHOT-01", transition: "종료" }
    ];
  }

  function variantShots(variant) {
    return [
      { id: "SHOT-01", section: "HERO · PACKAGE · CLOSING", purpose: `${variant.shortName} 단일 제품의 라벨과 병 형태를 정확하게 전달`, products: `${variant.shortName} 1병, 라벨 정면, 흰 캡과 병 비율 유지`, composition: "제품을 중앙보다 8% 아래에 두고 상단 카피 여백 확보", camera: "정면 0~5도, 70~100mm 중망원 느낌, 수직 왜곡 없음", light: "좌전방 대형 소프트광 + 약한 우측 필, 투명 병 윤곽 분리", background: `${variant.visualNote}의 무광 배경`, props: "히어로에서는 원료를 하단 가장자리에만 최소 배치", safeArea: "상단 34%, 좌우 각각 12%", retouch: "라벨·액상색·용기 비율 변경 금지", output: "세로 배경 포함 JPG + 제품 누끼 PNG" },
      { id: "SHOT-02", section: "INGREDIENT", purpose: `${variant.shortName} 라벨에 표시된 원료 구성을 시각화`, products: `${variant.shortName} 1병`, composition: "병을 한쪽 42%에 두고 반대쪽에 원료·제목 공간", camera: "정면보다 10~15도 높은 시점, 70mm 느낌", light: variant.key === "green" ? "따뜻한 자연광, 액상 투과는 약하게" : "뒤쪽 얇은 투과광 + 전면 소프트 필", background: variant.visualNote, props: `${variant.ingredients}만 사용`, safeArea: "제품 반대쪽 상단 38%", retouch: variant.labelGuard, output: "세로 4:5 + 원료 개별 누끼" },
      { id: "SHOT-03", section: "TEXTURE", purpose: `${variant.shortName}의 실제 액상색과 농도를 과장 없이 전달`, products: `${variant.shortName} 1병 + 투명 잔 1개`, composition: "따르는 순간 1컷과 잔 표면 클로즈업 1컷", camera: "45도 탑뷰 + 측면 매크로", light: "뒤쪽 스트립광으로 액상 윤곽 확보", background: "따뜻한 아이보리 무광", props: "투명 잔 외 장식 최소화", safeArea: "중앙 상단 25%", retouch: "점도·거품·색상 합성으로 과장 금지", output: "가로 3:2와 세로 크롭 동시" },
      { id: "SHOT-04", section: "CONTEXT · DRINKING MOMENT", purpose: "냉장 제품을 일상에서 꺼내 마시는 사용 맥락 제공", products: `${variant.shortName} 2병, 장면별 1병 사용`, composition: "냉장고에서 꺼내기 → 아침 식탁 → 이동 전 손에 드는 3장면", camera: "눈높이 생활 시점, 35~50mm", light: "밝은 아침 자연광", background: "흰 냉장고·밝은 목재 또는 석재 식탁", props: "간단한 컵·냅킨만 사용", safeArea: "장면별 반대쪽 30%", retouch: "체중 감량·디톡스·신체 변화 암시 금지", output: "세로 4:5 3컷" },
      { id: "SHOT-05", section: "TRUST · PRODUCT INFO", purpose: "제품 라벨·용량·보관 정보를 정확하게 판독", products: `${variant.shortName} 정면·측면·후면`, composition: "수직·수평 정렬, 정보면 평행 촬영", camera: "정면 0도, 85~100mm, 왜곡 보정", light: "균일한 복사광, 반사 억제", background: "중성 회색 또는 흰색", props: "없음", safeArea: "제품 주변 15%", retouch: "문구 재생성 금지, 원본 촬영 후 별도 텍스트 조판", output: "고해상도 JPG + 누끼 PNG" }
    ];
  }

  function buildVariant(review = {}, selectedDirectionId = "", variantKey = "green") {
    const common = build(review, selectedDirectionId);
    const variant = VARIANTS[variantKey] || VARIANTS.green;
    const sections = variantSections(variant);
    return {
      ...common,
      phase1: { ...common.phase1, outputRule: "공통 분석 결과를 사용하되 그린·베리 상세페이지는 각각 별도 생성" },
      phase2: {
        ...common.phase2,
        title: `2차 시안 · ${variant.productName} 개별 상세페이지`,
        variant,
        designStrategy: `${variant.productName} 단일 제품 원본 중심의 사용 상황 전환형 + 근거 중심 조판 보완`,
        intro: {
          frame: `${variant.visualNote}을 사용한 단일 제품 풀블리드 촬영 프레임`,
          logo: "상단 공식 회사 로고 안전영역, 그 아래 아침에주스와 정확한 제품명",
          typography: "영문 Cleanse Juice는 큰 편집형 산세리프, 한글 정보는 굵은 고딕과 짧은 본문",
          placement: "상단 34% 카피, 중앙 하단 실제 제품 1병, 하단 제품 정보",
          mandatory: ["아침에주스", variant.productName, "730mL", "냉장제품", "병당 6,000원(테스트값)"]
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
          cutoutUsage: "제품 누끼는 하단 정확 정보 확인 구간에서 최대 1회만 사용하며 프로젝트에 따라 0회 허용",
          stagedVisuals: "누끼는 전반 분위기·병 형태·라벨색 참고용이며 본문은 실제 촬영 또는 생성된 촬영 레퍼런스로 구성",
          generationGuard: "생성 이미지에서 제품 패키지를 새로 그리지 않고 실제 촬영 전에는 액상·원료·음용 상황 장면만 사용",
          copyRule: "각 섹션 서브카피는 핵심 장면과 정보 목적을 설명하는 완결된 한 문장",
          referenceRule: "촬영 ref와 디자인 ref를 구분해 실제 촬영 지시와 조판 지시를 함께 제공"
        }
      }
    };
  }

  return { VERSION, VARIANTS, SAENGJEUP_SECTIONS, SAENGJEUP_SHOTS, REFERENCES, build, buildVariant };
});
