// 상세페이지 렌더 엔진 (M5 로 app.js 에서 분리)
//
// sales* / templateMix* / 섹션정렬·제품분석 헬퍼 등, 고객 입력 → 상세페이지
// 마크업 문자열을 만드는 순수 렌더 함수 모음. DOM·localStorage 를 건드리지 않는다.
// IIFE 로 감싸지 않는다 — 클래식 <script> 는 전역 스코프를 공유하므로, 파일만
// 나눠도 app.js 의 나머지 함수와 서로 그대로 보인다. index.html 에서 app.js 보다
// 먼저 로드한다.

function salesSectionStyle(edits = [], index) {
  const color = edits?.[index]?.color;
  const key = activeDraftKeyFromEdits(edits);
  const order = sectionOrderValue(key, index);
  const style = [];
  if (color && color !== "auto") style.push(`--draft-accent:${escapeHtml(color)};`);
  if (order !== index) style.push(`order:${order};`);
  return style.length ? ` style="${style.join("")}"` : "";
}

function activeDraftKeyFromEdits(edits = []) {
  if (edits === sectionEdits.B) return "B";
  return "A";
}

function normalizeSectionOrder(key, length) {
  const existing = Array.isArray(sectionOrders[key]) ? sectionOrders[key] : [];
  const valid = existing.filter((index) => Number.isInteger(index) && index >= 0 && index < length);
  const missing = Array.from({ length }, (_, index) => index).filter((index) => !valid.includes(index));
  const next = [...valid, ...missing];
  sectionOrders[key] = next;
  return next;
}

function sectionOrderValue(key, originalIndex) {
  const order = normalizeSectionOrder(key, Math.max(originalIndex + 1, editableSectionsForDraft(key).length || originalIndex + 1));
  const position = order.indexOf(originalIndex);
  return position >= 0 ? position : originalIndex;
}

function orderedSectionsForDraft(sections = [], key = activeSectionDraft) {
  const order = normalizeSectionOrder(key, sections.length);
  return order.map((originalIndex) => ({
    ...sections[originalIndex],
    __originalIndex: originalIndex,
  })).filter(Boolean);
}

function moveActiveSection(delta) {
  collectSectionEdits();
  const sections = editableSectionsForDraft(activeSectionDraft);
  const order = normalizeSectionOrder(activeSectionDraft, sections.length);
  const currentOriginal = orderedSectionsForDraft(sections, activeSectionDraft)[activeSectionIndex]?.__originalIndex ?? activeSectionIndex;
  const currentPosition = order.indexOf(currentOriginal);
  const nextPosition = Math.min(Math.max(currentPosition + delta, 0), order.length - 1);
  if (currentPosition < 0 || currentPosition === nextPosition) return;
  const [moved] = order.splice(currentPosition, 1);
  order.splice(nextPosition, 0, moved);
  sectionOrders[activeSectionDraft] = order;
  activeSectionIndex = nextPosition;
  renderDraftPreviewsOnly();
  renderSectionEditor();
  scrollActiveDraftSection();
}

function salesSectionClass(edits = [], index, base = "", fallbackVariant = "") {
  const variant = edits?.[index]?.variant && edits[index].variant !== "auto" ? edits[index].variant : fallbackVariant;
  return `${base}${variant && variant !== "auto" ? ` sales-variant-${escapeHtml(variant)}` : ""}`;
}

function salesIndustryCopyDefaults(industry = "commerce", isB = false, dataset = categoryDataset(product().category)) {
  industry = normalizeIndustryKey(industry);
  const defaults = {
    health: {
      storyTitle: isB ? "왜 이 제품을 선택해야 할까요?" : "원료와 패키지가 만든 프리미엄 스토리",
      benefitTitle: isB ? "구매 전 확인해야 할 4가지 포인트" : "하루 루틴에 담은 핵심 가치",
      sceneTitle: isB ? "언제 어디서나 간편하게" : "선물하기 좋은 건강한 루틴",
      trustTitle: "건강식품은 신뢰 정보가 중요합니다",
      infoTitle: "제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 프리미엄 건강 루틴" : "소중한 사람에게 전하는 프리미엄 한 포",
    },
    beauty: {
      storyTitle: isB ? "피부 고민에서 시작하는 선택 이유" : "브랜드 감성과 제형이 만나는 스토리",
      benefitTitle: isB ? "구매 전 확인할 뷰티 포인트" : "루틴 속에서 느껴지는 핵심 가치",
      sceneTitle: isB ? "사용 순서가 바로 보이는 루틴" : "매일 손이 가는 감성 케어 장면",
      trustTitle: "뷰티 제품은 성분과 사용 정보가 중요합니다",
      infoTitle: "사용법과 제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "고민에 맞는 뷰티 루틴 선택" : "나를 위한 감성 케어 루틴",
    },
    living: {
      storyTitle: isB ? "불편함을 해결하는 이유" : "생활 장면에서 시작하는 제품 스토리",
      benefitTitle: isB ? "구매 전 비교해야 할 실용 포인트" : "일상을 더 편하게 만드는 핵심 가치",
      sceneTitle: isB ? "사용 방법이 바로 이해되는 장면" : "공간에 자연스럽게 들어오는 사용 장면",
      trustTitle: "생활용품은 실사용 정보가 중요합니다",
      infoTitle: "구성, 크기, 사용 정보를 확인하세요",
      ctaTitle: isB ? "실용적인 선택을 돕는 구매 포인트" : "일상을 정돈하는 제품 선택",
    },
    fashion: {
      storyTitle: isB ? "스타일 선택을 돕는 포인트" : "브랜드 무드와 착용 스토리",
      benefitTitle: isB ? "구매 전 확인할 핏과 디테일" : "룩을 완성하는 핵심 가치",
      sceneTitle: isB ? "착용 장면과 활용도를 확인하세요" : "일상에 어울리는 스타일링 장면",
      trustTitle: "패션 제품은 소재와 사이즈 정보가 중요합니다",
      infoTitle: "옵션과 제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 스타일 포인트" : "오늘의 룩을 완성하는 선택",
    },
    commerce: {
      storyTitle: isB ? "왜 이 제품을 선택해야 할까요?" : "브랜드와 제품 가치 스토리",
      benefitTitle: isB ? "구매 전 확인해야 할 핵심 포인트" : "제품에 담긴 핵심 가치",
      sceneTitle: isB ? "사용 장면을 빠르게 확인하세요" : "일상 속 자연스러운 사용 장면",
      trustTitle: "구매 전 신뢰 정보가 중요합니다",
      infoTitle: "제품 정보를 한눈에 확인하세요",
      ctaTitle: isB ? "선택이 쉬워지는 구매 포인트" : "가치를 확인하고 선택하세요",
    },
  };
  return defaults[industry] || {
    ...defaults.commerce,
    storyTitle: dataset.sections?.[1] || defaults.commerce.storyTitle,
  };
}

function fallbackUspForIndustry(industry = "commerce") {
  industry = normalizeIndustryKey(industry);
  const map = {
    health: ["원료 신뢰", "프리미엄 구성", "간편한 루틴", "선물용 패키지"],
    beauty: ["감성 제형", "피부 고민 케어", "데일리 루틴", "브랜드 무드"],
    living: ["문제 해결", "사용 편의성", "공간 정돈", "실용적 구성"],
    fashion: ["브랜드 무드", "착용 핏", "소재 디테일", "스타일링"],
    commerce: ["제품 가치", "핵심 장점", "사용 장면", "구매 신뢰"],
  };
  return map[industry] || map.commerce;
}

function autoPolishDraftSections(workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const polish = {
    health: {
      A: {
        variants: ["photo-focus", "editorial", "editorial", "premium-card", "photo-focus", "photo-focus", "editorial", "premium-card", "premium-card", "premium-card"],
        colors: ["#b9822d", "#b88a2a", "#c66b2d", "#c66b2d", "#d7773f", "#b9822d", "#8b6f55", "#b9822d", "#1f1b17", "#1f1b17"],
        imageSlots: ["hero", "origin", "boxPink", "feature", "lifestyle", "giftBag", "trust", "info", "package", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "conversion", "graphic-badge", "photo-focus", "photo-focus", "premium-card", "premium-card", "conversion", "graphic-badge"],
        colors: ["#d16c2f", "#c56a2d", "#d16c2f", "#d16c2f", "#b9822d", "#c56a2d", "#5f5144", "#d16c2f", "#1f1b17", "#1f1b17"],
        imageSlots: ["hero", "stick", "openBox", "feature", "giftBag", "stick", "trust", "info", "openBox", "openBox"],
      },
    },
    beauty: {
      A: {
        variants: ["photo-focus", "editorial", "photo-focus", "editorial", "premium-card", "premium-card", "premium-card"],
        colors: ["#c58b9b", "#d86f86", "#c58b9b", "#d86f86", "#7e5361", "#c58b9b", "#35222a"],
        imageSlots: ["hero", "origin", "feature", "lifestyle", "trust", "info", "package"],
      },
      B: {
        variants: ["graphic-badge", "premium-card", "photo-focus", "graphic-badge", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#d86f86", "#c58b9b", "#d86f86", "#c58b9b", "#7e5361", "#d86f86", "#35222a"],
        imageSlots: ["hero", "feature", "lifestyle", "origin", "trust", "info", "package"],
      },
    },
    living: {
      A: {
        variants: ["photo-focus", "graphic-badge", "premium-card", "photo-focus", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#397577", "#5f7f8b", "#397577", "#5f7f8b", "#203738", "#397577", "#203738"],
        imageSlots: ["hero", "lifestyle", "feature", "lifestyle", "trust", "info", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "premium-card", "photo-focus", "premium-card", "premium-card", "graphic-badge"],
        colors: ["#5f7f8b", "#397577", "#5f7f8b", "#397577", "#203738", "#5f7f8b", "#203738"],
        imageSlots: ["hero", "feature", "lifestyle", "feature", "trust", "info", "package"],
      },
    },
    commerce: {
      A: {
        variants: ["photo-focus", "editorial", "editorial", "premium-card", "photo-focus", "photo-focus", "premium-card", "premium-card", "premium-card", "premium-card"],
        colors: ["#9b7448", "#c66b2d", "#c66b2d", "#9b7448", "#c66b2d", "#9b7448", "#29231e", "#9b7448", "#29231e", "#29231e"],
        imageSlots: ["hero", "origin", "package", "feature", "lifestyle", "giftBag", "trust", "info", "package", "package"],
      },
      B: {
        variants: ["graphic-badge", "graphic-badge", "conversion", "premium-card", "photo-focus", "photo-focus", "premium-card", "premium-card", "conversion", "graphic-badge"],
        colors: ["#c66b2d", "#9b7448", "#c66b2d", "#c66b2d", "#9b7448", "#c66b2d", "#29231e", "#c66b2d", "#29231e", "#29231e"],
        imageSlots: ["hero", "feature", "package", "package", "lifestyle", "stick", "trust", "info", "package", "package"],
      },
    },
  };
  const config = polish[industry] || polish.commerce;
  ["A", "B"].forEach((key) => {
    const sections = editableSectionsForDraft(key);
    const existing = sectionEdits[key] || [];
    if (existing.length && existing.some((edit) => edit && Object.keys(edit).length)) return;
    const keyConfig = config[key] || config.A;
    sectionEdits[key] = sections.map((section, index) => ({
      title: sectionDefaultTitle(section),
      copy: sectionDefaultCopy(section),
      color: keyConfig.colors[index] || "auto",
      imageSlot: keyConfig.imageSlots[index] || section.imageSlot || "hero",
      variant: keyConfig.variants[index] || "auto",
      autoPolished: true,
      manualEdited: false,
    }));
  });
}

function salesImage(images = {}, slot = "hero", alt = "제품 이미지") {
  const src = images?.[slot] || images?.hero;
  if (src) return `<img class="sales-img sales-img-${escapeHtml(slot)}" src="${src}" alt="${escapeHtml(alt)}">`;
  return `
    <div class="sales-image-placeholder sales-placeholder-${escapeHtml(slot)}">
      <i></i>
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(imageSlotVisualCopy(slot))}</span>
    </div>
  `;
}

function salesHeroProductComposition(images = {}, activeSlot = "hero", alt = "제품 이미지", isB = false, industry = inferProductIndustry()) {
  const mainSlot = images?.[activeSlot] ? activeSlot : "hero";
  const mainImage = salesImage(images, mainSlot, alt);
  const stickSrc = images?.stick || images?.feature;
  const packageSrc = images?.package || images?.boxPink;
  const giftSrc = images?.giftBag || images?.lifestyle;
  const accentSrc = industry === "health" ? images?.origin : images?.lifestyle;
  const badge = {
    health: { value: "30P", label: "Gift Ready" },
    beauty: { value: "CARE", label: "Daily Routine" },
    living: { value: "USE", label: "Problem Solved" },
    fashion: { value: "FIT", label: "Style Ready" },
    commerce: { value: "BEST", label: "Product Point" },
  }[industry] || { value: "BEST", label: "Product Point" };
  return `
    <div class="sales-hero-composition ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-hero-ad-stage" aria-hidden="true">
        <span></span>
        <i></i>
        <b>${escapeHtml(isB ? "SHOP DETAIL" : "PREMIUM")}</b>
      </div>
      <div class="sales-hero-main-product">${mainImage}</div>
      ${stickSrc ? `<img class="sales-hero-floating sales-hero-stick" src="${stickSrc}" alt="스틱 제품컷">` : ""}
      ${packageSrc ? `<img class="sales-hero-floating sales-hero-package" src="${packageSrc}" alt="패키지 제품컷">` : ""}
      ${giftSrc ? `<img class="sales-hero-floating sales-hero-gift" src="${giftSrc}" alt="선물 패키지컷">` : ""}
      ${accentSrc ? `<img class="sales-hero-floating sales-hero-accent-image" src="${accentSrc}" alt="제품 무드 보조 이미지">` : ""}
      <div class="sales-hero-composition-badge">
        <b>${escapeHtml(badge.value)}</b>
        <span>${escapeHtml(badge.label)}</span>
      </div>
      <div class="sales-hero-ad-caption">
        <strong>${escapeHtml(isB ? "구매 전 핵심 정보를 한 화면에" : "선물처럼 보이는 프리미엄 첫인상")}</strong>
        <span>${escapeHtml(isB ? "구성 · 휴대성 · 신뢰 정보를 빠르게 확인" : "패키지 · 원료 스토리 · 브랜드 무드 강조")}</span>
      </div>
    </div>
  `;
}

function salesFigmaHeroCanvas(p = product(), images = {}, isB = false, industry = inferProductIndustry(), heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const title = heroTitle || p.productName || "호아비 리치꿀스틱 30포";
  const copy = heroCopy || p.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴";
  const mainPack = isB
    ? (images?.openBox || images?.package || images?.hero)
    : (images?.package || images?.hero || images?.openBox);
  const boxImage = isB ? (images?.boxYellow || images?.openBox || images?.package) : (images?.boxPink || images?.package);
  const stickImage = images?.stick || images?.feature;
  const giftImage = isB ? (images?.boxPink || images?.giftBag || images?.lifestyle) : (images?.giftBag || images?.boxPink || images?.lifestyle);
  const proof = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const mainPoint = highlights?.[0] || proof?.[0] || "프리미엄 원료";
  const label = isB ? "B OPTION / CONVERSION DETAIL" : "A OPTION / PREMIUM DETAIL";
  const visualTitle = isB ? "LITCHI HONEY ROUTINE" : "Hoabee Litchi Honey Stick";
  const cta = isB ? "구성부터 선물 포인트까지 빠르게 확인" : "선물처럼 전하는 프리미엄 건강 루틴";

  return `
    <section class="sales-figma-hero-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-hero-bg-word" aria-hidden="true">${escapeHtml(isB ? "HONEY" : "Hoabee")}</div>
      <div class="figma-hero-copy-block">
        <span>${escapeHtml(label)}</span>
        <h2>${escapeHtml(title)}</h2>
        <strong>${escapeHtml(copy)}</strong>
        <p>${escapeHtml(cta)}</p>
        <div class="figma-hero-proof">
          ${proof.map((item, index) => `<b><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</b>`).join("")}
        </div>
        <div class="figma-hero-cta">
          <em>${escapeHtml(mainPoint)}</em>
          <small>${escapeHtml(isB ? "SHOPPING MALL DETAIL PAGE" : "BRAND GIFT DETAIL PAGE")}</small>
        </div>
      </div>
      <div class="figma-hero-product-stage">
        <div class="figma-hero-glow" aria-hidden="true"></div>
        ${mainPack ? `<img class="figma-pack figma-pack-main" src="${mainPack}" alt="${escapeHtml(title)} 대표 패키지">` : ""}
        ${boxImage ? `<img class="figma-pack figma-pack-box" src="${boxImage}" alt="${escapeHtml(title)} 박스컷">` : ""}
        ${stickImage ? `<img class="figma-pack figma-pack-stick" src="${stickImage}" alt="${escapeHtml(title)} 스틱컷">` : ""}
        ${giftImage ? `<img class="figma-pack figma-pack-gift" src="${giftImage}" alt="${escapeHtml(title)} 선물컷">` : ""}
        <div class="figma-hero-seal">
          <b>${escapeHtml(isB ? "30P" : "GIFT")}</b>
          <span>${escapeHtml(isB ? "easy check" : "premium mood")}</span>
        </div>
      </div>
      <div class="figma-hero-bottom">
        <span>LYCHEE</span>
        <strong>${escapeHtml(visualTitle)}</strong>
        <span>HONEY</span>
      </div>
    </section>
  `;
}

function salesFigmaEditorialCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = []) {
  const ref = images?.referenceSections || [];
  const featureItems = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const mood = isB
    ? { label: "INFORMATION DESIGN", title: "구매 판단이 빠른 정보형 상세 구성", copy: "구성, 휴대성, 선물성, 신뢰 요소를 한눈에 비교할 수 있도록 그래픽 블록으로 정리합니다." }
    : { label: "EDITORIAL BRAND STORY", title: "원료 스토리와 선물 무드를 길게 이어가는 구성", copy: "리치 원료, 꿀의 프리미엄 이미지, 패키지 감성을 긴 스크롤 안에서 자연스럽게 연결합니다." };
  const first = ref[2] || images?.origin || images?.hero;
  const second = ref[5] || images?.lifestyle || images?.package;
  const third = ref[8] || images?.trust || images?.info;

  return `
    <section class="sales-figma-editorial-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-editorial-head">
        <span>${escapeHtml(mood.label)}</span>
        <h3>${escapeHtml(mood.title)}</h3>
        <p>${escapeHtml(mood.copy)}</p>
      </div>
      <div class="figma-editorial-layout">
        <figure class="figma-editorial-large">
          ${first ? `<img src="${first}" alt="상세페이지 대표 섹션 이미지">` : salesImage(images, "origin", "상세페이지 대표 섹션 이미지")}
        </figure>
        <div class="figma-editorial-side">
          <figure>${second ? `<img src="${second}" alt="상세페이지 사용 장면">` : salesImage(images, "lifestyle", "상세페이지 사용 장면")}</figure>
          <figure>${third ? `<img src="${third}" alt="상세페이지 신뢰 정보">` : salesImage(images, "trust", "상세페이지 신뢰 정보")}</figure>
        </div>
        <div class="figma-editorial-copy-card">
          <small>${escapeHtml(isB ? "WHY BUY" : "BRAND VALUE")}</small>
          ${featureItems.map((item, index) => `
            <div>
              <b>${String(index + 1).padStart(2, "0")}</b>
              <strong>${escapeHtml(item)}</strong>
              <span>${escapeHtml(benefitSubcopy(item, index, industry))}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function salesFigmaIngredientShowcaseCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = [], highlights = []) {
  const productCut = isB ? (images?.boxYellow || images?.package) : (images?.boxPink || images?.package);
  const stickCut = images?.stick || images?.feature;
  const openBox = images?.openBox || images?.hero;
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const lead = highlights?.[0] || points[0] || "리치 원료와 프리미엄 꿀";
  const title = isB ? "한 포의 구성과 장점이 바로 보이도록" : "리치와 꿀이 만든 프리미엄 무드";
  const copy = isB
    ? "스틱형 구성, 30포 패키지, 휴대성을 한 화면에서 확인할 수 있게 배치합니다."
    : "원료 스토리와 패키지 비주얼을 함께 보여주어 선물용 건강식품의 첫인상을 강화합니다.";
  const facts = [
    ["LYCHEE", "리치 원료 이미지", "달콤하고 이국적인 원료 스토리"],
    ["HONEY", "프리미엄 꿀 무드", "부드럽고 고급스러운 건강식품 인상"],
    ["STICK", "개별 스틱 포장", "언제 어디서나 간편한 루틴"],
  ];

  return `
    <section class="sales-figma-ingredient-showcase ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-ingredient-copy">
        <span>${escapeHtml(isB ? "PRODUCT VALUE MAP" : "MATERIAL MOOD BOARD")}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <strong>${escapeHtml(lead)}</strong>
      </div>
      <div class="figma-ingredient-visual">
        <div class="figma-ingredient-glow" aria-hidden="true"></div>
        ${productCut ? `<img class="figma-ingredient-pack" src="${productCut}" alt="호아비 패키지 이미지">` : ""}
        ${stickCut ? `<img class="figma-ingredient-stick" src="${stickCut}" alt="호아비 스틱 이미지">` : ""}
        ${openBox ? `<img class="figma-ingredient-open" src="${openBox}" alt="호아비 구성 이미지">` : ""}
      </div>
      <div class="figma-ingredient-facts">
        ${facts.map((fact, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(fact[0])}</b>
            <strong>${escapeHtml(fact[1])}</strong>
            <p>${escapeHtml(fact[2])}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function salesFigmaPurchaseCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = [], highlights = []) {
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const accentLabel = isB ? "PURCHASE CHECK" : "PREMIUM PROOF";
  const title = isB ? "구매 전에 바로 확인해야 할 핵심 정보" : "선물용 건강식품으로 보여줘야 할 신뢰 포인트";
  const copy = isB
    ? "고객이 구매 직전에 궁금해하는 구성, 휴대성, 선물성, 제품 정보를 비교표와 배지로 정리합니다."
    : "프리미엄 무드는 유지하면서 원료, 구성, 패키지, 섭취 루틴을 안정적인 정보 구조로 보여줍니다.";
  const tableRows = [
    ["구성", "30포 구성", "선물/루틴용으로 충분한 구성"],
    ["형태", "스틱 개별 포장", "가방, 사무실, 여행 중 휴대 편리"],
    ["이미지", "리치 + 꿀 원료", "달콤하고 고급스러운 건강식품 인상"],
    ["주의", "과장 효능 표현 제외", "건강식품 광고 리스크를 줄인 문구"],
  ];
  const scene = images?.lifestyle || images?.giftBag || images?.package;
  const product = images?.package || images?.openBox || images?.hero;

  return `
    <section class="sales-figma-purchase-canvas ${isB ? "is-conversion" : "is-premium"}">
      <div class="figma-purchase-head">
        <span>${escapeHtml(accentLabel)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </div>
      <div class="figma-purchase-grid">
        <div class="figma-purchase-photo-card">
          ${scene ? `<img src="${scene}" alt="구매 판단용 제품 이미지">` : salesImage(images, "lifestyle", "구매 판단용 제품 이미지")}
          <b>${escapeHtml(isB ? "실사용/선물 장면" : "프리미엄 패키지 무드")}</b>
        </div>
        <div class="figma-purchase-table-card">
          <table>
            <tbody>
              ${tableRows.map((row) => `
                <tr>
                  <th>${escapeHtml(row[0])}</th>
                  <td><strong>${escapeHtml(row[1])}</strong><span>${escapeHtml(row[2])}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="figma-purchase-point-card">
          ${product ? `<img src="${product}" alt="제품 패키지 이미지">` : ""}
          <div>
            <small>${escapeHtml(isB ? "WHY CHOOSE" : "GIFT READY")}</small>
            <strong>${escapeHtml(highlights?.[0] || points[0] || "프리미엄 원료")}</strong>
            <p>${escapeHtml(isB ? "A/B 시안에서 고객이 빠르게 방향을 고를 수 있도록 핵심 구매 근거를 강조합니다." : "고급스럽고 단정한 무드로 선물용 상세페이지 첫인상을 강화합니다.")}</p>
          </div>
        </div>
      </div>
      <div class="figma-purchase-badges">
        ${points.map((point, index) => `<b><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(point)}</b>`).join("")}
      </div>
    </section>
  `;
}

function salesFigmaConversionDecisionCanvas(images = {}, isB = false, industry = inferProductIndustry(), usp = []) {
  if (!isB) return "";
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const product = images?.openBox || images?.package || images?.hero;
  const stick = images?.stick || images?.feature;
  const rows = [
    ["구성 확인", "30포 구성과 스틱 형태를 먼저 확인"],
    ["휴대성 확인", "가방, 사무실, 외출 상황에 맞는지 확인"],
    ["선물성 확인", "패키지와 쇼핑백 이미지로 선물 수요 판단"],
    ["표현 리스크", "효능 보장 대신 원료/구성 중심 표현"],
  ];

  return `
    <section class="sales-figma-conversion-decision">
      <div class="figma-decision-header">
        <span>CONVERSION DETAIL FLOW</span>
        <h3>고객이 빠르게 선택할 수 있는 구매 판단 구조</h3>
        <p>감성보다 구매 판단 속도를 높이는 B안 전용 구성입니다. 핵심 정보, 비교 기준, CTA가 한 화면 안에서 이어지도록 설계합니다.</p>
      </div>
      <div class="figma-decision-body">
        <div class="figma-decision-score">
          <small>BUYING SCORE</small>
          <strong>4.8</strong>
          <p>구성 · 휴대성 · 선물성 · 정보 신뢰를 기준으로 구매 판단 요소를 앞쪽에 배치합니다.</p>
          <div>${points.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
        </div>
        <div class="figma-decision-matrix">
          ${rows.map((row, index) => `
            <article>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <strong>${escapeHtml(row[0])}</strong>
              <span>${escapeHtml(row[1])}</span>
            </article>
          `).join("")}
        </div>
        <div class="figma-decision-product">
          ${product ? `<img class="decision-product-main" src="${product}" alt="구매 판단 대표 제품 이미지">` : ""}
          ${stick ? `<img class="decision-product-stick" src="${stick}" alt="스틱 제품 이미지">` : ""}
          <em>30P / STICK / GIFT</em>
        </div>
      </div>
    </section>
  `;
}

function salesSectionRibbon(type = "story", isB = false, industry = inferProductIndustry()) {
  const map = {
    story: {
      label: isB ? "01 / MATERIAL CHECK" : "01 / BRAND STORY",
      title: industry === "health" ? "원료 스토리와 제품 무드를 먼저 설계" : "제품의 시작점을 감각적으로 정리",
      points: isB ? ["원료", "구성", "확인"] : ["무드", "스토리", "패키지"],
    },
    benefit: {
      label: isB ? "02 / BUYING REASON" : "02 / VALUE POINT",
      title: isB ? "구매 이유가 바로 보이는 장점 구조" : "제품 가치가 자연스럽게 쌓이는 프리미엄 구조",
      points: isB ? ["비교", "장점", "선택"] : ["가치", "디테일", "루틴"],
    },
    trust: {
      label: isB ? "03 / TRUST CHECK" : "03 / BRAND TRUST",
      title: industry === "health" ? "건강식품 표현 리스크를 줄이는 신뢰 정보 배치" : "고객이 안심하고 선택할 수 있는 확인 구조",
      points: isB ? ["정보", "검수", "안심"] : ["신뢰", "자료", "마감"],
    },
  };
  const data = map[type] || map.story;
  return `
    <div class="sales-section-ribbon sales-section-ribbon-${escapeHtml(type)} ${isB ? "is-conversion" : "is-premium"}">
      <span>${escapeHtml(data.label)}</span>
      <strong>${escapeHtml(data.title)}</strong>
      <div>${data.points.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
    </div>
  `;
}

function imageSlotVisualCopy(slot) {
  const copies = {
    hero: "대표 제품컷 또는 패키지 합성컷",
    origin: "원료/산지/브랜드 스토리 비주얼",
    feature: "제품 디테일과 질감 클로즈업",
    lifestyle: "사용 장면 또는 선물 연출컷",
    package: "패키지 구성과 최종 제품컷",
    trust: "신뢰 자료와 정보 확인 이미지",
    info: "제품 정보표와 구성 안내 이미지",
    boxYellow: "옐로우 박스 단독 제품컷",
    boxPink: "핑크 박스 단독 제품컷",
    openBox: "30포 구성 오픈박스컷",
    giftBag: "선물용 쇼핑백컷",
    stick: "스틱 단독 디테일컷",
  };
  return copies[slot] || "상세페이지용 비주얼";
}

function templateMixHeroDecor(images = {}, isB = false) {
  const items = isB
    ? [
        { slot: "stick", label: "STICK" },
        { slot: "openBox", label: "30P" },
      ]
    : [
        { slot: "stick", label: "STICK" },
        { slot: "giftBag", label: "GIFT" },
      ];
  return `
    <div class="template-mix-hero-decor">
      ${items.map((item, index) => `
        <figure class="decor-product decor-product-${index + 1}">
          ${salesImage(images, item.slot, item.label)}
          <figcaption>${escapeHtml(item.label)}</figcaption>
        </figure>
      `).join("")}
      <span class="decor-badge">${escapeHtml(isB ? "CHECK 30P" : "PREMIUM GIFT")}</span>
    </div>
  `;
}

function templateMixCommerceTable(isB = false, proofItems = []) {
  const rows = isB
    ? [
        ["원료", proofItems[0] || "리치 원료"],
        ["구성", "30포 스틱형"],
        ["편의", proofItems[2] || "휴대 편의성"],
        ["주의", "과장 표현 없이 정보 중심"],
      ]
    : [
        ["무드", "프리미엄 선물형"],
        ["스토리", proofItems[0] || "원료 스토리"],
        ["패키지", proofItems[3] || "선물용 패키지"],
        ["루틴", proofItems[2] || "하루 한 포"],
      ];
  return `
    <div class="template-mix-commerce-table">
      ${rows.map(([label, value]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixReferenceFlow(images = {}, isB = false) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selected = refs.length
    ? (isB ? [refs[0], refs[4], refs[7], refs[10]] : [refs[0], refs[1], refs[5], refs[8]]).filter(Boolean)
    : [];
  const fallback = isB
    ? ["package", "feature", "trust", "info"]
    : ["package", "origin", "lifestyle", "giftBag"];
  const labels = isB
    ? ["첫 화면", "장점", "신뢰", "구매"]
    : ["브랜드", "원료", "선물", "마감"];
  const items = selected.length ? selected : fallback;
  return `
    <section class="template-mix-reference-flow ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "DETAIL FLOW" : "REFERENCE RHYTHM")}</small>
        <h3>${escapeHtml(isB ? "구매 흐름이 끊기지 않도록 구간을 압축합니다" : "기존 상세페이지 무드를 새 시안 흐름에 맞게 재배치합니다")}</h3>
        <p>${escapeHtml(isB ? "첫 화면부터 신뢰, 구성, 최종 선택까지 구매자가 확인하는 순서를 짧은 이미지 흐름으로 보여줍니다." : "원료, 패키지, 선물성, 브랜드 무드가 반복적으로 등장해 실제 긴 상세페이지처럼 보이게 합니다.")}</p>
      </div>
      <div class="template-mix-reference-strip">
        ${items.map((item, index) => `
          <figure>
            ${selected.length ? `<img src="${item}" alt="${escapeHtml(labels[index] || "상세 흐름")}">` : salesImage(images, item, labels[index] || "상세 흐름")}
            <figcaption>${String(index + 1).padStart(2, "0")} ${escapeHtml(labels[index] || "상세")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixConceptDivider(isB = false, proofItems = []) {
  if (isB) {
    const rows = [
      ["일반 꿀스틱", "원료/구성 차이가 잘 보이지 않음"],
      ["호아비 리치꿀스틱", proofItems[0] || "리치 원료와 프리미엄 꿀 조합"],
      ["구매 판단", "30포 구성, 휴대성, 선물성을 함께 확인"],
    ];
    return `
      <section class="template-mix-concept-divider is-conversion">
        <small>COMPARE & CHECK</small>
        <h3>비교하면 선택 이유가 더 빨리 보입니다</h3>
        <div class="template-mix-compare-table">
          ${rows.map(([label, copy]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(copy)}</em></span>`).join("")}
        </div>
      </section>
    `;
  }
  return `
    <section class="template-mix-concept-divider is-premium">
      <small>BRAND MOOD</small>
      <h3>달콤한 원료 스토리가 선물의 첫인상을 만듭니다</h3>
      <p>제품을 설명하기 전에 브랜드 무드와 패키지 이미지를 먼저 보여주면, 단순 건강식품이 아니라 선물하기 좋은 프리미엄 식품처럼 인식됩니다.</p>
      <div>
        <span>Soft Gift</span>
        <span>Ingredient Story</span>
        <span>Premium Routine</span>
      </div>
    </section>
  `;
}

function templateMixVariantSignature(images = {}, isB = false, proofItems = []) {
  if (isB) {
    const rows = [
      ["구성", "30포 스틱형", "한 박스 기준 구성 확인"],
      ["섭취", "개별 포장", "휴대와 보관이 간편"],
      ["선물", "패키지형", "부모님/지인 선물용"],
      ["주의", "식품 표현", "효능 과장 없이 안내"],
    ];
    return `
      <section class="template-mix-conversion-snapshot">
        <div class="conversion-snapshot-head">
          <small>FAST BUYING SNAPSHOT</small>
          <h3>구매자가 궁금해하는 정보를 한 화면에 압축</h3>
          <p>전환형 시안은 감성보다 확인 속도가 중요합니다. 구성, 편의, 선물성, 주의 정보를 먼저 정리합니다.</p>
        </div>
        <div class="conversion-snapshot-grid">
          ${rows.map(([label, value, copy]) => `
            <article>
              <b>${escapeHtml(label)}</b>
              <strong>${escapeHtml(value)}</strong>
              <span>${escapeHtml(copy)}</span>
            </article>
          `).join("")}
        </div>
        <figure>${salesImage(images, "openBox", "구성 확인 제품컷")}</figure>
      </section>
    `;
  }
  return `
    <section class="template-mix-brand-signature">
      <figure>${salesImage(images, "giftBag", "프리미엄 선물 이미지")}</figure>
      <div>
        <small>BRAND SIGNATURE</small>
        <h3>받는 순간부터 선물처럼 느껴지는 건강 루틴</h3>
        <p>프리미엄형 시안은 제품 설명보다 브랜드 첫인상, 패키지 감성, 원료 스토리를 먼저 보여줍니다.</p>
        <blockquote>${escapeHtml(proofItems[0] || "리치 원료와 프리미엄 꿀이 만드는 부드러운 선물 이미지")}</blockquote>
      </div>
    </section>
  `;
}

function templateMixEditorialScene(images = {}, isB = false, proofItems = []) {
  const title = isB
    ? "구매자가 바로 이해하는 제품 구성과 사용 장면"
    : "리치와 꿀이 만드는 부드러운 선물 무드";
  const copy = isB
    ? "제품 컷, 구성 컷, 섭취 장면을 한 화면에 묶어 장점을 설명하지 않아도 자연스럽게 이해되도록 구성합니다."
    : "프리미엄 건강식품은 원료 이미지와 패키지 무드가 함께 보여야 선물 가치가 살아납니다.";
  const tags = isB
    ? ["제품 컷", "구성 안내", "사용 장면", "구매 판단"]
    : ["리치 원료", "프리미엄 꿀", "선물 패키지", "브랜드 무드"];
  return `
    <section class="template-mix-editorial-scene ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-editorial-copy">
        <small>${escapeHtml(isB ? "SHOPPING GUIDE" : "INGREDIENT MOOD")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div class="template-mix-editorial-board">
        <figure class="is-main">${salesImage(images, isB ? "openBox" : "boxPink", "제품 메인 연출컷")}</figure>
        <figure class="is-tall">${salesImage(images, "stick", "스틱 디테일컷")}</figure>
        <figure class="is-wide">${salesImage(images, isB ? "info" : "giftBag", "구성/선물 이미지")}</figure>
      </div>
      <strong>${escapeHtml(proofItems[0] || (isB ? "30포 구성과 휴대성을 한눈에" : "리치 원료와 프리미엄 꿀 조합"))}</strong>
    </section>
  `;
}

function templateMixPhotoDirection(images = {}, isB = false) {
  const shots = isB
    ? [
        ["01", "제품 단독컷", "화이트 배경에서 스틱과 패키지 형태를 명확하게"],
        ["02", "구성 전체컷", "30포 구성, 패키지 내부, 쇼핑백을 한 화면에"],
        ["03", "구매 판단컷", "원료/구성/섭취 편의가 보이도록 정보형 연출"],
      ]
    : [
        ["01", "프리미엄 무드컷", "아이보리/핑크 톤 배경에 패키지와 스틱을 고급스럽게"],
        ["02", "원료 스토리컷", "리치 원료와 꿀 이미지를 부드러운 빛으로 연출"],
        ["03", "선물 패키지컷", "쇼핑백, 패키지, 스틱을 함께 배치해 선물성 강조"],
      ];
  return `
    <section class="template-mix-photo-direction ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "PHOTO PLAN" : "SHOOTING DIRECTION")}</small>
        <h3>${escapeHtml(isB ? "실제 촬영/합성 시 필요한 컷을 먼저 설계합니다" : "초안 이미지는 임시, 최종은 이런 무드로 촬영합니다")}</h3>
      </div>
      <div class="template-mix-photo-grid">
        ${shots.map(([num, title, copy], index) => `
          <article>
            <figure>${salesImage(images, index === 0 ? (isB ? "stick" : "boxPink") : index === 1 ? "openBox" : "giftBag", title)}</figure>
            <span>${escapeHtml(num)}</span>
            <b>${escapeHtml(title)}</b>
            <p>${escapeHtml(copy)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixPurchaseStack(images = {}, isB = false, proofItems = [], highlights = []) {
  const reasons = isB
    ? [
        ["01", "구성", "30포 스틱형이라 선물/데일리 모두 활용"],
        ["02", "편의", "언제 어디서나 한 포씩 간편하게"],
        ["03", "판단", "원료, 구성, 주의사항을 과장 없이 확인"],
      ]
    : [
        ["01", "첫인상", "패키지와 컬러가 선물 가치를 먼저 전달"],
        ["02", "원료감", proofItems[0] || "리치 원료와 프리미엄 꿀 조합"],
        ["03", "루틴", highlights[0] || "하루 한 포로 완성하는 부드러운 건강 루틴"],
      ];
  return `
    <section class="template-mix-purchase-stack ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-choice-panel">
        <small>${escapeHtml(isB ? "WHY BUY" : "WHY GIFT")}</small>
        <h3>${escapeHtml(isB ? "구매 전에 필요한 판단 근거만 압축합니다" : "선물로 선택해야 하는 이유를 감성적으로 정리합니다")}</h3>
        <div>
          ${reasons.map(([num, title, copy]) => `
            <article>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(title)}</b>
              <span>${escapeHtml(copy)}</span>
            </article>
          `).join("")}
        </div>
      </div>
      <figure class="template-mix-purchase-product">
        ${salesImage(images, isB ? "openBox" : "boxPink", "구매 유도 제품컷")}
        <figcaption>${escapeHtml(isB ? "30P CHECK" : "GIFT READY")}</figcaption>
      </figure>
    </section>
  `;
}

function templateMixBenefitShowcase(images = {}, isB = false, proofItems = []) {
  const items = isB
    ? [
        { slot: "stick", label: "STICK", copy: proofItems[2] || "한 포씩 간편한 휴대" },
        { slot: "openBox", label: "30P", copy: "구성품을 한눈에 확인" },
        { slot: "info", label: "INFO", copy: "구매 전 정보 확인" },
      ]
    : [
        { slot: "boxPink", label: "PACKAGE", copy: "선물용 패키지 무드" },
        { slot: "stick", label: "ROUTINE", copy: proofItems[2] || "하루 한 포 루틴" },
        { slot: "giftBag", label: "GIFT", copy: "고급스러운 선물 이미지" },
      ];
  return `
    <div class="template-mix-benefit-showcase">
      ${items.map((item) => `
        <article>
          <figure>${salesImage(images, item.slot, item.label)}</figure>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function templateMixFinalOrderPanel(isB = false) {
  const rows = isB
    ? [
        ["구성", "30포 스틱형"],
        ["포인트", "원료/편의/선물성"],
        ["확인", "제품 정보와 주의사항"],
      ]
    : [
        ["무드", "프리미엄 선물형"],
        ["포인트", "리치 원료와 꿀"],
        ["제안", "하루 한 포 루틴"],
      ];
  return `
    <div class="template-mix-final-order-panel">
      ${rows.map(([label, value]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(value)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixHeroProof(isB = false) {
  const items = isB
    ? [
        ["30P", "구성 확인"],
        ["STICK", "휴대 편의"],
        ["CHECK", "정보 중심"],
      ]
    : [
        ["GIFT", "선물 무드"],
        ["LYCHEE", "원료 스토리"],
        ["PREMIUM", "브랜드 첫인상"],
      ];
  return `
    <div class="template-mix-hero-proof">
      ${items.map(([label, copy]) => `<span><b>${escapeHtml(label)}</b><em>${escapeHtml(copy)}</em></span>`).join("")}
    </div>
  `;
}

function templateMixCampaignCover(images = {}, isB = false, p = product(), proofItems = []) {
  const title = p.productName || "호아비 리치꿀스틱 30포";
  const lead = isB
    ? "구성, 편의성, 선물 포인트를 한 화면에서 빠르게 확인하는 전환형 상세"
    : "리치와 꿀이 전하는 프리미엄 선물 루틴";
  const heroSlot = isB ? "boxYellow" : "boxPink";
  const sideSlot = isB ? "openBox" : "stick";
  const chips = isB
    ? ["30P", "STICK", "INFO", "GIFT"]
    : ["LYCHEE", "HONEY", "PREMIUM", "GIFT"];
  return `
    <section class="template-mix-campaign-cover ${isB ? "is-conversion" : "is-premium"}">
      <div class="campaign-cover-copy">
        <small>${escapeHtml(isB ? "B OPTION / SHOPPING DETAIL" : "A OPTION / BRAND DETAIL")}</small>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(lead)}</p>
        <strong>${escapeHtml(proofItems[0] || (isB ? "구매 전 확인이 쉬운 상세 구성" : "선물처럼 보이는 프리미엄 첫인상"))}</strong>
        <div>
          ${chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("")}
        </div>
      </div>
      <figure class="campaign-cover-main">
        ${salesImage(images, heroSlot, `${title} 대표 제품컷`)}
        <figcaption>${escapeHtml(isB ? "CHECK THE ROUTINE" : "PREMIUM HONEY ROUTINE")}</figcaption>
      </figure>
      <figure class="campaign-cover-sub">
        ${salesImage(images, sideSlot, `${title} 보조 제품컷`)}
      </figure>
      <div class="campaign-cover-index">
        <b>${escapeHtml(isB ? "COMMERCE" : "HOABEE")}</b>
        <span>${escapeHtml(isB ? "구성 / 원료 / 휴대성 / 신뢰" : "브랜드 / 원료 / 선물 / 루틴")}</span>
      </div>
    </section>
  `;
}

function templateMixReferenceHeroBand(images = {}, isB = false, proofItems = []) {
  const refs = Array.isArray(images?.figmaReferences) ? images.figmaReferences : [];
  const detailRefs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const main = refs[0] || detailRefs[1] || images?.origin || images?.hero;
  const sub = isB
    ? (refs[1] || detailRefs[7] || images?.trust || images?.info)
    : (refs[2] || detailRefs[5] || images?.lifestyle || images?.giftBag);
  const productSlot = isB ? "openBox" : "stick";
  const title = isB
    ? "정보와 제품컷을 크게 묶어 구매 판단을 빠르게 만듭니다"
    : "기존 상세의 무드를 살려 실제 판매 페이지처럼 보이게 만듭니다";
  const copy = isB
    ? "전환형 시안은 정보표만 나열하지 않고, 제품 컷과 신뢰 컷을 한 화면 안에서 강하게 보여줍니다."
    : "브랜드 무드, 원료 스토리, 제품 이미지를 큰 비주얼 컷으로 반복해 프리미엄 첫인상을 강화합니다.";
  return `
    <section class="template-mix-reference-hero-band ${isB ? "is-conversion" : "is-premium"}">
      <figure class="reference-hero-main">
        ${main ? `<img src="${main}" alt="${escapeHtml(isB ? "상세페이지 정보 레퍼런스" : "상세페이지 브랜드 레퍼런스")}">` : salesImage(images, "origin", "상세페이지 레퍼런스")}
      </figure>
      <div class="reference-hero-copy">
        <small>${escapeHtml(isB ? "REFERENCE COMMERCE REMIX" : "REFERENCE BRAND REMIX")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>
          ${(proofItems.length ? proofItems : ["원료 스토리", "선물성", "휴대성"]).slice(0, 3).map((item, index) => `
            <span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>
          `).join("")}
        </div>
      </div>
      <figure class="reference-hero-sub">
        ${sub ? `<img src="${sub}" alt="${escapeHtml(isB ? "신뢰 정보 레퍼런스" : "라이프스타일 레퍼런스")}">` : salesImage(images, isB ? "trust" : "lifestyle", "보조 레퍼런스")}
      </figure>
      <figure class="reference-hero-product">
        ${salesImage(images, productSlot, "제품 강조 컷")}
      </figure>
    </section>
  `;
}

function templateMixHeroOfferBar(isB = false, proofItems = []) {
  const offers = isB
    ? [
        ["01", "구성", "30포 스틱형"],
        ["02", "편의", proofItems[2] || "개별 포장"],
        ["03", "확인", "원료/주의 정보"],
      ]
    : [
        ["01", "선물", "고급 패키지"],
        ["02", "원료", proofItems[0] || "리치와 꿀"],
        ["03", "루틴", "하루 한 포"],
      ];
  return `
    <div class="template-mix-hero-offer">
      ${offers.map(([num, label, copy]) => `
        <span>
          <i>${escapeHtml(num)}</i>
          <b>${escapeHtml(label)}</b>
          <em>${escapeHtml(copy)}</em>
        </span>
      `).join("")}
    </div>
  `;
}

function templateMixOfferSequence(images = {}, isB = false, proofItems = []) {
  const rows = isB
    ? [
        { label: "POINT 01", title: "한 포씩 꺼내는 편의성", copy: "외출, 사무실, 선물 상황에서도 부담 없이 전달되는 스틱형 구성", slot: "stick" },
        { label: "POINT 02", title: "30포 구성을 명확하게", copy: "구매자가 가장 먼저 확인하는 구성과 패키지 정보를 이미지로 정리", slot: "openBox" },
        { label: "POINT 03", title: "신뢰 정보는 과장 없이", copy: proofItems[0] || "원료와 정보 중심으로 건강식품의 신뢰감을 만듭니다.", slot: "info" },
      ]
    : [
        { label: "MOOD 01", title: "선물처럼 보이는 패키지", copy: "제품 박스와 스틱 이미지를 크게 사용해 첫인상에서 고급감을 전달", slot: "boxPink" },
        { label: "MOOD 02", title: "리치와 꿀의 원료 스토리", copy: proofItems[0] || "원료 이미지를 감성적으로 풀어 브랜드 기억을 만듭니다.", slot: "origin" },
        { label: "MOOD 03", title: "하루 한 포 루틴 제안", copy: "섭취 장면과 휴대성을 연결해 자연스러운 구매 이유를 만듭니다.", slot: "lifestyle" },
      ];
  return `
    <section class="template-mix-offer-sequence ${isB ? "is-conversion" : "is-premium"}">
      ${rows.map((row, index) => `
        <article class="${index % 2 ? "is-reverse" : ""}">
          <figure>${salesImage(images, row.slot, row.title)}</figure>
          <div>
            <small>${escapeHtml(row.label)}</small>
            <h3>${escapeHtml(row.title)}</h3>
            <p>${escapeHtml(row.copy)}</p>
            <span>${escapeHtml(isB ? "구매 판단을 빠르게 돕는 정보 블록" : "브랜드 무드와 제품 가치를 함께 전달")}</span>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}

function templateMixVisualProofWall(images = {}, isB = false, proofItems = []) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const refSlots = refs.length
    ? (isB ? [refs[2], refs[4], refs[7], refs[9]] : [refs[0], refs[1], refs[5], refs[8]]).filter(Boolean)
    : [];
  const cards = isB
    ? [
        { slot: "stick", label: "Stick", copy: "한 포씩 꺼내 쓰는 편의성" },
        { slot: "openBox", label: "30P", copy: "구성을 바로 확인" },
        { slot: "info", label: "Info", copy: "구매 전 필요한 정보" },
      ]
    : [
        { slot: "boxPink", label: "Mood", copy: "브랜드 첫인상 강화" },
        { slot: "giftBag", label: "Gift", copy: "선물용 이미지 확보" },
        { slot: "stick", label: "Routine", copy: "데일리 루틴 제안" },
      ];
  return `
    <section class="template-mix-proof-wall ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-proof-wall-head">
        <small>${escapeHtml(isB ? "PRODUCT PROOF WALL" : "BRAND VISUAL WALL")}</small>
        <h3>${escapeHtml(isB ? "제품컷과 정보컷을 섞어 구매 판단을 빠르게 만듭니다" : "제품 이미지가 반복되어야 실제 상세페이지처럼 보입니다")}</h3>
        <p>${escapeHtml(proofItems[0] || (isB ? "구성, 편의성, 신뢰 정보를 한 화면 안에서 확인합니다." : "원료 스토리와 패키지 무드를 반복 노출합니다."))}</p>
      </div>
      <div class="template-mix-proof-wall-grid">
        <figure class="is-large">${salesImage(images, isB ? "openBox" : "boxPink", "대표 제품 비주얼")}</figure>
        ${cards.map((item) => `
          <article>
            <figure>${salesImage(images, item.slot, item.label)}</figure>
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
        <div class="template-mix-proof-wall-reference">
          ${(refSlots.length ? refSlots : []).map((src, index) => `
            <img src="${src}" alt="${escapeHtml(`상세페이지 참고 구간 ${index + 1}`)}">
          `).join("")}
          ${!refSlots.length ? cards.map((item) => `<figure>${salesImage(images, item.slot, item.label)}</figure>`).join("") : ""}
        </div>
      </div>
    </section>
  `;
}

function templateMixAdPoster(images = {}, isB = false, p = product(), proofItems = []) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selectedRefs = refs.length
    ? (isB ? [refs[3], refs[5], refs[8]] : [refs[0], refs[2], refs[6]]).filter(Boolean)
    : [];
  const tags = isB
    ? ["30포 구성", "스틱 포장", "정보 확인", "구매 판단"]
    : ["프리미엄 선물", "리치 원료", "브랜드 무드", "데일리 루틴"];
  const title = isB
    ? "제품 정보와 구매 이유가 한 화면에서 보이는 전환형 상세"
    : "첫인상부터 선물처럼 보이게 만드는 프리미엄 상세";
  const copy = isB
    ? "전환형 시안은 예쁜 이미지보다 구매자가 궁금해하는 정보를 빠르게 찾게 하는 것이 중요합니다. 제품컷, 구성컷, 체크 포인트를 한 장의 광고 구간처럼 묶습니다."
    : "프리미엄형 시안은 제품의 감성과 패키지 인상이 먼저 살아야 합니다. 기존 상세 무드와 제품컷을 섞어 실제 브랜드 상세페이지처럼 보이게 구성합니다.";
  const posterRows = isB
    ? [
        ["01", "구성", "30포 스틱형 구성"],
        ["02", "편의", "개별 포장과 휴대성"],
        ["03", "확인", "원료/정보/주의사항"],
      ]
    : [
        ["01", "Mood", "고급스러운 패키지 첫인상"],
        ["02", "Story", proofItems[0] || "리치 원료와 꿀 스토리"],
        ["03", "Gift", "선물용으로 보기 좋은 구성"],
      ];
  return `
    <section class="template-mix-ad-poster ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-ad-copy">
        <small>${escapeHtml(isB ? "COMMERCE AD SECTION" : "PREMIUM AD SECTION")}</small>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
        <div>${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      </div>
      <div class="template-mix-ad-stage">
        <figure class="template-mix-ad-main">
          ${salesImage(images, isB ? "openBox" : "boxPink", p.productName || "제품 메인컷")}
          <figcaption>${escapeHtml(isB ? "BUYING CHECK" : "HOABEE GIFT")}</figcaption>
        </figure>
        <div class="template-mix-ad-reference">
          ${selectedRefs.length ? selectedRefs.map((src, index) => `
            <figure>
              <img src="${src}" alt="${escapeHtml(`상세 레퍼런스 ${index + 1}`)}">
            </figure>
          `).join("") : ["package", "stick", "giftBag"].map((slot, index) => `
            <figure>${salesImage(images, slot, `상세 레퍼런스 ${index + 1}`)}</figure>
          `).join("")}
        </div>
        <div class="template-mix-ad-info">
          ${posterRows.map(([num, label, rowCopy]) => `
            <article>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(label)}</b>
              <span>${escapeHtml(rowCopy)}</span>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function templateMixCommercialBannerSet(images = {}, isB = false, p = product(), proofItems = []) {
  const banners = isB
    ? [
        {
          tone: "orange",
          label: "BUYING POINT",
          title: "구성부터 편의성까지 한 번에 확인",
          copy: "30포 스틱 구성, 휴대성, 선물성을 한 화면에서 빠르게 판단할 수 있도록 제품컷과 정보 배지를 결합합니다.",
          slot: "openBox",
          chips: ["30P", "STICK", "GIFT"],
        },
        {
          tone: "dark",
          label: "TRUST CHECK",
          title: "과장 없이 신뢰감 있게",
          copy: proofItems[0] || "건강식품은 효능 과장보다 원료와 구성 정보를 명확하게 보여주는 것이 중요합니다.",
          slot: "info",
          chips: ["INFO", "CHECK", "SAFE COPY"],
        },
        {
          tone: "light",
          label: "FINAL GUIDE",
          title: "구매 전 마지막 체크 리스트",
          copy: "제품 구성, 섭취 편의, 주의 정보가 정리되어 고객이 망설임 없이 선택할 수 있게 합니다.",
          slot: "stick",
          chips: ["구성", "편의", "주의"],
        },
      ]
    : [
        {
          tone: "orange",
          label: "PREMIUM GIFT",
          title: "선물처럼 보이는 첫인상",
          copy: "패키지 컬러와 제품 이미지를 크게 보여주어 건강식품이 아닌 프리미엄 선물 브랜드처럼 느껴지게 합니다.",
          slot: "boxPink",
          chips: ["GIFT", "PREMIUM", "ROUTINE"],
        },
        {
          tone: "dark",
          label: "BRAND STORY",
          title: "리치와 꿀이 만드는 부드러운 원료 스토리",
          copy: proofItems[0] || "원료의 이미지를 감성적으로 풀어내 제품의 차별점을 자연스럽게 전달합니다.",
          slot: "stick",
          chips: ["LYCHEE", "HONEY", "STORY"],
        },
        {
          tone: "light",
          label: "GIFT PACKAGE",
          title: "받는 순간부터 기분 좋은 구성",
          copy: "쇼핑백, 패키지, 스틱 제품컷을 함께 보여주어 선물용 구매 이유를 강화합니다.",
          slot: "giftBag",
          chips: ["PACKAGE", "SHOPPING BAG", "30P"],
        },
      ];
  return `
    <section class="template-mix-commercial-banners ${isB ? "is-conversion" : "is-premium"}">
      ${banners.map((banner, index) => `
        <article class="commercial-banner is-${escapeHtml(banner.tone)}">
          <div>
            <small>${escapeHtml(banner.label)}</small>
            <h3>${escapeHtml(banner.title)}</h3>
            <p>${escapeHtml(banner.copy)}</p>
            <span>${banner.chips.map((chip) => `<b>${escapeHtml(chip)}</b>`).join("")}</span>
          </div>
          <figure>
            ${salesImage(images, banner.slot, `${p.productName || "제품"} 배너 ${index + 1}`)}
            <figcaption>${String(index + 1).padStart(2, "0")}</figcaption>
          </figure>
        </article>
      `).join("")}
    </section>
  `;
}

function templateMixRoutineFlow(images = {}, isB = false, proofItems = []) {
  const steps = isB
    ? [
        ["01", "제품 확인", "스틱 형태와 30포 구성을 먼저 확인"],
        ["02", "섭취 편의", "가방, 사무실, 외출 상황에서도 간편하게"],
        ["03", "구매 판단", "원료와 패키지 정보를 한 번에 정리"],
      ]
    : [
        ["01", "선물 첫인상", "패키지 컬러와 제품 컷으로 고급스러운 인상 형성"],
        ["02", "원료 스토리", proofItems[0] || "리치와 꿀의 부드러운 원료 이미지 전달"],
        ["03", "데일리 루틴", "하루 한 포를 선물처럼 즐기는 사용 흐름 제안"],
      ];
  const imageSlots = isB ? ["stick", "openBox", "info"] : ["boxPink", "stick", "giftBag"];
  return `
    <section class="template-mix-routine-flow ${isB ? "is-conversion" : "is-premium"}">
      <div class="template-mix-routine-head">
        <small>${escapeHtml(isB ? "HOW TO CHECK" : "ROUTINE STORY")}</small>
        <h3>${escapeHtml(isB ? "고객이 구매 전 확인하는 순서대로 보여줍니다" : "제품이 선물에서 루틴으로 이어지는 장면을 만듭니다")}</h3>
      </div>
      <div class="template-mix-routine-cards">
        ${steps.map(([num, title, copy], index) => `
          <article>
            <figure>${salesImage(images, imageSlots[index], title)}</figure>
            <div>
              <i>${escapeHtml(num)}</i>
              <b>${escapeHtml(title)}</b>
              <span>${escapeHtml(copy)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function templateMixSectionRail(isB = false) {
  const items = isB
    ? ["CHECK", "POINT", "COMPARE", "TRUST", "BUY"]
    : ["MOOD", "STORY", "GIFT", "ROUTINE", "BRAND"];
  return `
    <div class="template-mix-section-rail ${isB ? "is-conversion" : "is-premium"}" aria-hidden="true">
      ${items.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesTemplateMixDetailPage(p, images, isB = false, industry = "commerce", heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const proofItems = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  const storyItems = isB
    ? ["원료 확인", "구성 확인", "휴대 편의", "구매 판단"]
    : ["브랜드 무드", "원료 스토리", "선물 패키지", "데일리 루틴"];
  const mainSlot = isB ? "boxYellow" : "boxPink";
  const subSlot = isB ? "openBox" : "stick";
  const darkTitle = isB ? "나에게 맞는 건강한 루틴을 빠르게 확인" : "선물처럼 전하는 하루 한 포의 프리미엄";
  const finalTitle = isB ? "구매 전 마지막으로 확인하세요" : "고급스러운 선물 루틴 제안";
  const tableItems = [
    { label: "구성", value: "30포 스틱형" },
    { label: "타입", value: "간편 섭취" },
    { label: "무드", value: isB ? "정보 전달형" : "프리미엄 선물형" },
  ];
  const stripSlots = isB
    ? [
        { slot: "stick", label: "STICK", copy: "한 포씩 간편하게" },
        { slot: "openBox", label: "30P", copy: "구성 확인" },
        { slot: "package", label: "PACKAGE", copy: "패키지 정보" },
      ]
    : [
        { slot: "package", label: "PACKAGE", copy: "선물용 첫인상" },
        { slot: "stick", label: "STICK", copy: "데일리 루틴" },
        { slot: "giftBag", label: "GIFT", copy: "프리미엄 무드" },
      ];
  const decisionItems = isB
    ? [
        { label: "01", title: "무엇이 다른가", copy: proofItems[0] || "원료와 구성 차별점" },
        { label: "02", title: "왜 편한가", copy: proofItems[2] || "개별 스틱과 휴대성" },
        { label: "03", title: "왜 선택하는가", copy: proofItems[3] || "선물성과 구매 판단 정보" },
      ]
    : [
        { label: "01", title: "첫인상", copy: "고급스러운 패키지와 선물 무드" },
        { label: "02", title: "스토리", copy: proofItems[0] || "원료가 가진 브랜드 가치" },
        { label: "03", title: "루틴", copy: proofItems[2] || "하루 한 포의 간편한 사용감" },
      ];

  return `
    <div class="sales-template-mix-page ${isB ? "is-conversion" : "is-premium"}">
      ${templateMixSectionRail(isB)}
      ${templateMixCampaignCover(images, isB, p, proofItems)}
      <section class="template-mix-hero">
        <div class="template-mix-copy">
          <small>${escapeHtml(isB ? "B안 - Commerce Template" : "A안 - Premium Template")}</small>
          <h2>${escapeHtml(heroTitle || p.productName || "제품명")}</h2>
          <p>${escapeHtml(heroCopy || "제품 한 줄 설명이 들어갑니다.")}</p>
          <div class="template-mix-mini-cards">
            ${storyItems.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          ${templateMixHeroProof(isB)}
          ${templateMixHeroOfferBar(isB, proofItems)}
        </div>
        <figure class="template-mix-product">
          <span class="template-mix-hero-stamp">${escapeHtml(isB ? "BUYING CHECK" : "PREMIUM GIFT")}</span>
          ${salesImage(images, mainSlot, p.productName || "대표 제품 이미지")}
          ${templateMixHeroDecor(images, isB)}
        </figure>
      </section>

      <section class="template-mix-product-strip">
        ${stripSlots.map((item) => `
          <article>
            <figure>${salesImage(images, item.slot, item.label)}</figure>
            <div>
              <b>${escapeHtml(item.label)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          </article>
        `).join("")}
      </section>

      ${templateMixReferenceHeroBand(images, isB, proofItems)}

      ${templateMixVisualProofWall(images, isB, proofItems)}

      ${templateMixAdPoster(images, isB, p, proofItems)}

      ${templateMixCommercialBannerSet(images, isB, p, proofItems)}

      ${templateMixOfferSequence(images, isB, proofItems)}

      ${templateMixConceptDivider(isB, proofItems)}

      ${templateMixVariantSignature(images, isB, proofItems)}

      ${templateMixEditorialScene(images, isB, proofItems)}

      <section class="template-mix-dark">
        <div>
          <small>${escapeHtml(isB ? "BUYING POINT" : "BRAND STORY")}</small>
          <h3>${escapeHtml(darkTitle)}</h3>
          <p>${escapeHtml(isB ? "정보를 빠르게 확인할 수 있도록 장점, 구성, 신뢰 포인트를 압축해 보여줍니다." : "원료와 패키지 무드가 먼저 느껴지도록 제품 이미지를 크게 배치하고 감성 카피를 더합니다.")}</p>
        </div>
        <figure>${salesImage(images, subSlot, "보조 제품 이미지")}</figure>
      </section>

      <section class="template-mix-benefits">
        <small>KEY POINT</small>
        <h3>${escapeHtml(isB ? "고객이 바로 이해하는 구매 이유" : "브랜드 가치가 보이는 핵심 포인트")}</h3>
        ${templateMixBenefitShowcase(images, isB, proofItems)}
        <div>
          ${proofItems.map((item, index) => `
            <article>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <b>${escapeHtml(item)}</b>
              <span>${escapeHtml(benefitSubcopy(item, index, industry))}</span>
            </article>
          `).join("")}
        </div>
      </section>

      ${templateMixRoutineFlow(images, isB, proofItems)}

      <section class="template-mix-decision">
        <small>${escapeHtml(isB ? "DECISION FLOW" : "PREMIUM FLOW")}</small>
        <h3>${escapeHtml(isB ? "구매 판단 흐름을 순서대로 정리" : "브랜드 가치가 구매 이유로 이어지는 흐름")}</h3>
        <div>
          ${decisionItems.map((item) => `
            <article>
              <i>${escapeHtml(item.label)}</i>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </article>
          `).join("")}
        </div>
        ${templateMixCommerceTable(isB, proofItems)}
      </section>

      <section class="template-mix-split">
        <figure>${salesImage(images, "package", "패키지 이미지")}</figure>
        <div>
          <small>${escapeHtml(isB ? "CHECK LIST" : "GIFT PACKAGE")}</small>
          <h3>${escapeHtml(isB ? "구매 전에 확인할 내용을 정리" : "선물용으로 보기 좋은 구성")}</h3>
          ${tableItems.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.value)}</span>`).join("")}
        </div>
      </section>

      <section class="template-mix-info">
        <small>DETAIL INFORMATION</small>
        <h3>${escapeHtml(isB ? "제품 정보를 한눈에 확인" : "프리미엄 루틴을 완성하는 디테일")}</h3>
        <div class="template-mix-info-grid">
          ${productSpecItems().slice(0, 4).map((item) => `<span><b>${escapeHtml(item.label)}</b><em>${escapeHtml(item.value)}</em></span>`).join("")}
        </div>
        <figure>${salesImage(images, isB ? "info" : "giftBag", "제품 정보 이미지")}</figure>
      </section>

      <section class="template-mix-check">
        <h3>${escapeHtml(isB ? "선택 전 체크 포인트" : "이런 분께 추천합니다")}</h3>
        ${storyItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        <figure>${salesImage(images, "stick", "스틱 제품 이미지")}</figure>
      </section>

      <section class="template-mix-proof">
        <div>
          <small>${escapeHtml(isB ? "TRUST CHECK" : "QUALITY MOOD")}</small>
          <h3>${escapeHtml(isB ? "과장 없이 확인하는 신뢰 정보" : "제품 가치를 차분하게 보여주는 마감 구간")}</h3>
          <p>${escapeHtml(isB ? "건강식품은 효능 과장보다 구성, 원료, 섭취 편의, 주의 정보를 명확히 보여주는 것이 중요합니다." : "프리미엄 이미지는 제품 컷, 여백, 정보 정리가 함께 맞아야 고객이 신뢰합니다.")}</p>
        </div>
        <figure>${salesImage(images, isB ? "trust" : "lifestyle", "신뢰/무드 이미지")}</figure>
      </section>

      ${templateMixReferenceFlow(images, isB)}

      ${templateMixPhotoDirection(images, isB)}

      ${templateMixPurchaseStack(images, isB, proofItems, highlights)}

      <section class="template-mix-final">
        <small>${escapeHtml(isB ? "FINAL CHECK" : "PREMIUM ROUTINE")}</small>
        <h3>${escapeHtml(finalTitle)}</h3>
        <p>${escapeHtml(highlights[0] || proofItems[0] || "고객이 마지막에 선택할 수 있도록 구매 포인트를 다시 정리합니다.")}</p>
        <figure class="template-mix-final-product">${salesImage(images, isB ? "openBox" : "package", "최종 제품 이미지")}</figure>
        ${templateMixFinalOrderPanel(isB)}
        <div class="template-mix-final-badges">
          ${(isB ? ["구성 확인", "정보 정리", "구매 판단"] : ["선물 무드", "원료 스토리", "프리미엄 루틴"]).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <b>${escapeHtml(isB ? "구매 포인트 확인하기" : "선물 구성 확인하기")}</b>
      </section>
    </div>
  `;
}

function salesDetailPageMarkup(label, template, slots, images, dataset, concept, edits = [], blueprint = {}) {
  const p = product();
  const isB = label.includes("B");
  const workflow = latestDesignWorkflow();
  const profile = blueprint.profile || designEngineProfile(label, template, workflow);
  const motiveBadges = salesMotiveBadges(workflow, isB);
  const visualBadges = salesVisualNeedBadges(workflow);
  const industry = normalizeIndustryKey(workflow.analysis?.industry || inferProductIndustry());
  const usp = p.usp.length ? p.usp : fallbackUspForIndustry(industry);
  const highlights = p.highlight.length ? p.highlight : dataset.purchasePoints;
  const industryDefaults = salesIndustryCopyDefaults(industry, isB, dataset);
  const heroTitle = editedValue(edits, 0, "title", slots.productName || p.productName || "호아비 리치꿀스틱 30포");
  const heroCopy = editedValue(edits, 0, "copy", slots.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴");
  const storyTitle = editedValue(edits, 1, "title", industryDefaults.storyTitle);
  const storyCopy = editedValue(edits, 1, "copy", slots.originStory || dataset.mainMessage);
  const benefitTitle = editedValue(edits, 2, "title", industryDefaults.benefitTitle);
  const benefitCopy = editedValue(edits, 2, "copy", slots.benefits || dataset.mainMessage);
  const sceneTitle = editedValue(edits, 3, "title", industryDefaults.sceneTitle);
  const sceneCopy = editedValue(edits, 3, "copy", slots.usageScene || slots.giftMessage || dataset.copyBlocks.cta);
  const trustTitle = editedValue(edits, 4, "title", industryDefaults.trustTitle);
  const trustCopy = editedValue(edits, 4, "copy", slots.trust || dataset.copyBlocks.trust);
  const infoTitle = editedValue(edits, 5, "title", industryDefaults.infoTitle);
  const infoCopy = editedValue(edits, 5, "copy", slots.info || "구성, 원료, 보관 방법을 구매 전 확인하기 쉽게 정리했습니다.");
  const ctaTitle = editedValue(edits, 6, "title", industryDefaults.ctaTitle);
  const ctaCopy = editedValue(edits, 6, "copy", slots.cta || dataset.copyBlocks.cta);
  const heroBadge = isB ? "BUYING POINT" : "PREMIUM GIFT ROUTINE";
  const pageType = isB ? "conversion" : "premium";

  return `
    <div class="sales-detail-page sales-${pageType}">
      ${salesAmbientProductLayer(isB)}
      ${salesTemplateMixDetailPage(p, images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      ${salesCommerceTopper(p, isB)}
      ${salesFigmaHeroCanvas(p, images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      ${salesFigmaIngredientShowcaseCanvas(images, isB, industry, usp, highlights)}
      ${salesPremiumAdDensityPanel(images, isB, industry, heroTitle, heroCopy, usp, highlights)}
      <section class="${salesSectionClass(edits, 0, "sales-hero-section", isB ? "graphic-badge" : "photo-focus")}"${salesSectionStyle(edits, 0)}>
        ${salesHeroDecorLayer(isB)}
        <div class="sales-section-number">01</div>
        <div class="sales-hero-copy">
          <small>${escapeHtml(heroBadge)}</small>
          <h2>${escapeHtml(heroTitle)}</h2>
          <p>${escapeHtml(heroCopy)}</p>
          ${salesHeroQualityBand(isB, workflow)}
          <div class="sales-copy-points">
            ${salesQuickProofItems(isB).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="sales-motive-rail">
            ${motiveBadges.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          <div class="sales-hero-chips">
            ${usp.slice(0, 4).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
          ${salesMoodKeywords(isB)}
          <div class="sales-hero-metrics">
            ${heroBadgeItems().map((item) => `<div><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`).join("")}
          </div>
          ${salesIndustrySignaturePanel(profile, isB)}
          ${salesHeroSpecStrip()}
          ${isB ? salesConversionHeroChecklist(usp) : salesPremiumHeroSignature(highlights)}
          ${salesHeroSignatureStrip(isB, industry)}
          ${salesAdvertisingClaimStack(isB, industry)}
          ${salesCommerceRibbon(isB)}
        </div>
        <div class="sales-hero-visual">
          <div class="sales-hero-visual-stage">
            <div class="sales-hero-orbit" aria-hidden="true"></div>
            ${salesHeroBackdropLabel(isB, p.productName || heroTitle)}
            <div class="sales-hero-frame">${salesHeroProductComposition(images, editedImageSlot(edits, 0, "hero"), heroTitle, isB, industry)}</div>
            ${salesHeroSpotlightNotes(isB, industry)}
            <div class="sales-side-stat">
              <b>${escapeHtml(isB ? "POINT" : "GIFT")}</b>
              <span>${escapeHtml(isB ? "구매 판단을 빠르게 돕는 구성" : "선물용으로 보기 좋은 패키지 무드")}</span>
            </div>
          </div>
          ${salesHeroProductShowcaseRail(images, isB, industry)}
          ${salesHeroEditorialBoard(images, isB, industry)}
          <div class="sales-visual-labels">
            ${usp.slice(0, 3).map((item, index) => `<span>${String(index + 1).padStart(2, "0")} ${escapeHtml(item)}</span>`).join("")}
          </div>
          ${salesHeroCommerceSeals(isB)}
          <div class="sales-floating-card">
            <b>${escapeHtml(isB ? "선택 이유" : "선물 포인트")}</b>
            <span>${escapeHtml(highlights[0] || usp[0])}</span>
          </div>
        </div>
      </section>
      ${salesDetailRhythmStrip(isB, workflow)}
      ${salesShopDetailIndexStrip(isB, industry, usp)}
      ${salesFigmaEditorialCanvas(images, isB, industry, usp)}
      ${salesFigmaPurchaseCanvas(images, isB, industry, usp, highlights)}
      ${salesFigmaConversionDecisionCanvas(images, isB, industry, usp)}

      <section class="${salesSectionClass(edits, 1, "sales-story-section", isB ? "graphic-badge" : "editorial")}"${salesSectionStyle(edits, 1)}>
        <div class="sales-section-number">02</div>
        ${salesSectionRibbon("story", isB, industry)}
        <div class="sales-section-heading">
          <small>INGREDIENT STORY</small>
          <h3>${escapeHtml(storyTitle)}</h3>
          <p>${escapeHtml(storyCopy)}</p>
        </div>
        <div class="sales-story-grid">
          <figure>
            ${salesImage(images, editedImageSlot(edits, 1, "origin"), "원료 스토리 이미지")}
            ${salesImageCaption("Origin visual", "원료와 브랜드 이야기가 느껴지는 대표 이미지")}
          </figure>
          <div class="sales-ingredient-cards">
            ${ingredientItems().map((item) => `
              <div>
                <b>${escapeHtml(item.label)}</b>
                <strong>${escapeHtml(item.value)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
        </div>
        ${salesIngredientScenePanel(images, isB)}
        ${salesEditorialImageStoryBoard(images, isB, industry)}
        ${salesNarrativeBridgePanel(images, isB, industry)}
        ${salesDetailReferenceRemixBoard(images, isB, industry)}
        ${salesLongScrollPreviewBoard(images, isB, industry)}
        ${salesIngredientVisualMap(images, isB, industry)}
        ${isB ? salesConversionCompareBlock() : salesPremiumStoryFlow()}
        ${isB ? "" : salesPremiumBrandStatement(highlights)}
        ${salesProductCompositionStrip(images, isB)}
        ${salesDesignAccentPanel(images, isB)}
        ${salesDesignSystemPanel(profile, isB)}
        <div class="sales-visual-proof-rail">
          <b>촬영/합성 기준</b>
          ${visualBadges.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="${salesSectionClass(edits, 2, "sales-benefit-section", isB ? "graphic-badge" : "premium-card")}"${salesSectionStyle(edits, 2)}>
        <div class="sales-section-number">03</div>
        ${salesSectionRibbon("benefit", isB, industry)}
        <div class="sales-section-heading center">
          <small>${escapeHtml(isB ? "WHY BUY" : "KEY BENEFITS")}</small>
          <h3>${escapeHtml(benefitTitle)}</h3>
          <p>${escapeHtml(benefitCopy)}</p>
        </div>
        <div class="sales-benefit-board">
          ${usp.slice(0, 4).map((item, index) => `
            <div>
              <i>${String(index + 1).padStart(2, "0")}</i>
              <strong>${escapeHtml(item)}</strong>
              <span>${escapeHtml(benefitSubcopy(item, index, workflow.analysis?.industry))}</span>
            </div>
          `).join("")}
        </div>
        ${salesBenefitSummaryStrip(usp, isB)}
        ${salesValueJourneyPanel(usp, isB)}
        ${salesBenefitReasonLadder(usp, isB)}
        ${salesMarketplaceProofPanel(isB, workflow)}
        ${salesDetailAdSpread(images, usp, isB, industry)}
        ${salesFeaturePosterBoard(images, usp, isB, industry)}
        ${salesCommerceComparisonBand(usp, isB, industry)}
        <div class="sales-product-strip">
          ${salesImageCard(images, editedImageSlot(edits, 2, "feature"), "Detail", "제품 디테일", "스틱, 원료, 질감이 보이는 가까운 컷")}
          ${salesImageCard(images, "package", "Package", "패키지 구성", "선물성과 구성품을 한눈에 보여주는 컷")}
          ${salesImageCard(images, "lifestyle", "Routine", "사용 장면", "일상 속 섭취 상황을 자연스럽게 보여주는 컷")}
        </div>
        ${isB ? salesBuyingChecklist(usp) : salesPremiumMoodBand(highlights)}
        ${isB ? salesConversionProofMatrix(usp) : salesPremiumEditorialQuote(highlights)}
        ${isB ? salesConversionDecisionPanel(usp, highlights) : ""}
        ${salesSectionGraphicFooter(isB)}
      </section>

      <section class="${salesSectionClass(edits, 3, "sales-scene-section", "photo-focus")}"${salesSectionStyle(edits, 3)}>
        <div class="sales-section-number">04</div>
        <div class="sales-scene-copy">
          <small>LIFESTYLE SCENE</small>
          <h3>${escapeHtml(sceneTitle)}</h3>
          <p>${escapeHtml(sceneCopy)}</p>
          <div class="sales-scene-list">
            ${photoConcepts().slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
          ${salesSceneMiniShowcase(images, isB)}
        </div>
        <figure>
          ${salesImage(images, editedImageSlot(edits, 3, "lifestyle"), "라이프스타일 이미지")}
          ${salesImageCaption("Lifestyle direction", "초안에서는 임시 이미지로 구성하고, 최종 제작 시 동일한 분위기의 촬영/합성컷으로 교체")}
        </figure>
        ${salesLifestyleShowcase(images, isB)}
      </section>

      <section class="${salesSectionClass(edits, 4, "sales-trust-section", isB ? "premium-card" : "editorial")}"${salesSectionStyle(edits, 4)}>
        <div class="sales-section-number">05</div>
        ${salesSectionRibbon("trust", isB, industry)}
        <div class="sales-section-heading">
          <small>TRUST CHECK</small>
          <h3>${escapeHtml(trustTitle)}</h3>
          <p>${escapeHtml(trustCopy)}</p>
        </div>
        <div class="sales-trust-grid">
          ${trustProofItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${salesTrustSealPanel(isB, workflow)}
        ${salesTrustDocumentPanel(images, isB, workflow)}
        ${salesTrustChecklistPanel(isB, workflow)}
        ${salesTrustCommercePanel(images, isB, workflow)}
        ${salesReviewStyleProofPanel(isB, workflow)}
        <div class="sales-trust-score">
          ${trustScoreItems().map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <b>${escapeHtml(item.value)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        <div class="sales-risk-note">
          ${salesRiskRules(workflow).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>

      <section class="${salesSectionClass(edits, 5, "sales-info-section", isB ? "premium-card" : "editorial")}"${salesSectionStyle(edits, 5)}>
        <div class="sales-section-number">06</div>
        <div class="sales-info-copy">
          <small>PRODUCT INFORMATION</small>
          <h3>${escapeHtml(infoTitle)}</h3>
          <p>${escapeHtml(infoCopy)}</p>
        </div>
        <div class="sales-info-table">
          ${productSpecItems().map((item) => `<div><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></div>`).join("")}
        </div>
        ${salesInfoVisualPanel(images, workflow)}
        ${salesInfoNoticeBar()}
        ${salesPurchaseConfirmPanel(isB, workflow)}
        ${salesPackageUnboxingPanel(images, isB, workflow)}
      </section>

      <section class="${salesSectionClass(edits, 6, "sales-final-section", isB ? "graphic-badge" : "premium-card")}"${salesSectionStyle(edits, 6)}>
        <div class="sales-section-number">07</div>
        <small>${escapeHtml(isB ? "FINAL CHOICE" : "GIFTABLE PREMIUM")}</small>
        <h3>${escapeHtml(ctaTitle)}</h3>
        <p>${escapeHtml(ctaCopy)}</p>
        <div class="sales-final-action">
          <b>${escapeHtml(isB ? "구매 포인트 다시 보기" : "선물용 구성 확인하기")}</b>
          <span>${escapeHtml(p.productName || "제품")} 상세페이지 최종 CTA 영역</span>
        </div>
        ${salesRetailClosingPanel(images, isB, workflow)}
        ${salesFinalCatalogPanel(images, isB, workflow)}
        <div class="sales-final-product">
          ${salesFinalProductStack(images, editedImageSlot(edits, 6, "package"))}
        </div>
        ${salesFinalOfferStack(isB)}
        ${salesCheckoutOfferPanel(isB, workflow)}
        ${salesFinalProofStrip(isB, workflow)}
        ${salesFinalCommerceBar(isB, workflow)}
        ${salesFinalPackageDetail(images, isB, workflow)}
        ${salesFinalDecisionPanel(images, isB, workflow)}
        ${salesRetailDecisionReceipt(isB, workflow)}
        ${salesFinalConversionDeck(images, isB, workflow)}
        <div class="sales-final-badges">
          ${commerceActionItems().map((item) => `<div><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.copy)}</span></div>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function salesHeroCommerceSeals(isB = false) {
  const items = isB
    ? [
        { label: "CHECK", value: "구성 확인" },
        { label: "POINT", value: "구매 이유" },
        { label: "TRUST", value: "정보 검수" },
      ]
    : [
        { label: "30P", value: "선물 구성" },
        { label: "STICK", value: "간편 루틴" },
        { label: "GIFT", value: "패키지 무드" },
      ];
  return `
    <div class="sales-hero-commerce-seals ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <span>
          <b>${escapeHtml(item.label)}</b>
          <small>${escapeHtml(item.value)}</small>
        </span>
      `).join("")}
    </div>
  `;
}

function salesCommerceTopper(p = product(), isB = false) {
  const items = isB
    ? ["구매 포인트", "구성 확인", "주의 정보", "최종 선택"]
    : ["브랜드 스토리", "원료 무드", "선물 패키지", "프리미엄 루틴"];
  return `
    <div class="sales-commerce-topper ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "SHOPPING DETAIL PREVIEW" : "BRAND DETAIL PREVIEW")}</small>
        <strong>${escapeHtml(p.productName || "제품 상세페이지")}</strong>
      </div>
      <nav>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </nav>
      <b>${escapeHtml(isB ? "A/B 구매 설득형" : "A/B 프리미엄 브랜드형")}</b>
    </div>
  `;
}

function salesPremiumAdDensityPanel(images = {}, isB = false, industry = "commerce", heroTitle = "", heroCopy = "", usp = [], highlights = []) {
  const headline = isB ? "구매 전 필요한 정보를 한 화면에 압축" : "선물처럼 보이는 프리미엄 첫인상";
  const subcopy = isB
    ? "가격보다 먼저 확인해야 할 구성, 원료, 휴대성, 신뢰 포인트를 커머스형 카드로 정리합니다."
    : "제품 이미지와 원료 무드를 크게 보여주고, 브랜드 스토리와 선물성을 자연스럽게 연결합니다.";
  const mainSlot = isB ? "openBox" : "package";
  const subSlot = isB ? "stick" : "boxPink";
  const cardItems = (usp.length ? usp : ["원료", "패키지", "휴대성", "선물성"]).slice(0, 4);
  return `
    <section class="sales-advertorial-spread ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-advertorial-copy">
        <small>${escapeHtml(isB ? "COMMERCE DETAIL SYSTEM" : "BRAND DETAIL SYSTEM")}</small>
        <h3>${escapeHtml(headline)}</h3>
        <p>${escapeHtml(heroCopy || subcopy)}</p>
        <div class="sales-advertorial-tags">
          ${cardItems.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="sales-advertorial-visual">
        <figure class="is-main">
          ${salesImage(images, mainSlot, heroTitle || "대표 제품 이미지")}
          <figcaption>${escapeHtml(isB ? "구성 확인 컷" : "대표 패키지 컷")}</figcaption>
        </figure>
        <figure class="is-sub">
          ${salesImage(images, subSlot, "제품 디테일 컷")}
          <figcaption>${escapeHtml(isB ? "섭취/휴대 디테일" : "선물 무드 디테일")}</figcaption>
        </figure>
        <div class="sales-advertorial-proof">
          <strong>${escapeHtml(isB ? "CHECK FLOW" : "PREMIUM FLOW")}</strong>
          ${(highlights.length ? highlights : cardItems).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function salesShopDetailIndexStrip(isB = false, industry = "commerce", usp = []) {
  const items = isB
    ? ["구매 이유", "구성 비교", "신뢰 확인", "최종 선택"]
    : ["브랜드 무드", "원료 스토리", "선물 구성", "프리미엄 루틴"];
  const focus = usp.slice(0, 3);
  return `
    <section class="sales-shop-index-strip ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(normalizeIndustryKey(industry).toUpperCase())} DETAIL FLOW</small>
        <strong>${escapeHtml(isB ? "빠르게 판단되는 상세 흐름" : "천천히 설득되는 브랜드 흐름")}</strong>
      </div>
      <ol>
        ${items.map((item, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span></li>`).join("")}
      </ol>
      <p>${escapeHtml(focus.join(" · ") || "제품 핵심 정보와 구매 판단 요소를 섹션별로 연결합니다.")}</p>
    </section>
  `;
}

function salesFinalCatalogPanel(images = {}, isB = false, workflow = {}) {
  const points = isB
    ? ["구성 확인", "휴대성 확인", "선택 이유 정리"]
    : ["선물 패키지", "원료 무드", "브랜드 신뢰"];
  return `
    <div class="sales-final-catalog-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-final-catalog-copy">
        <small>${escapeHtml(isB ? "LAST CHECK" : "GIFT CHECK")}</small>
        <strong>${escapeHtml(isB ? "마지막 구매 판단을 한 번 더 정리합니다" : "선물하기 전 확인할 프리미엄 구성")}</strong>
        <p>${escapeHtml(isB ? "상세페이지 하단에서 고객이 망설이지 않도록 핵심 정보와 CTA를 다시 묶습니다." : "제품 무드, 패키지, 사용 루틴을 한 화면에서 확인할 수 있게 정리합니다.")}</p>
        <div>
          ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 구매/선물 구성 이미지")}
      </figure>
    </div>
  `;
}

function salesHeroQualityBand(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.heroBand : blocks.A?.heroBand) || designBlockLibraryForIndustry("commerce").heroA;
  return `
    <div class="sales-hero-quality-band ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <article>
          <b>${escapeHtml(item.label)}</b>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function salesHeroProductShowcaseRail(images = {}, isB = false, industry = inferProductIndustry()) {
  const itemMap = {
    health: [
      { slot: "stick", label: "Stick", copy: "개별 스틱" },
      { slot: "package", label: "Package", copy: "선물 패키지" },
      { slot: "openBox", label: "30P", copy: "구성 확인" },
    ],
    beauty: [
      { slot: "feature", label: "Texture", copy: "제형/사용감" },
      { slot: "package", label: "Package", copy: "브랜드 패키지" },
      { slot: "lifestyle", label: "Routine", copy: "데일리 케어" },
    ],
    living: [
      { slot: "feature", label: "Detail", copy: "제품 디테일" },
      { slot: "lifestyle", label: "Use", copy: "사용 장면" },
      { slot: "package", label: "Set", copy: "구성 확인" },
    ],
    fashion: [
      { slot: "feature", label: "Material", copy: "소재 디테일" },
      { slot: "lifestyle", label: "Look", copy: "착용 장면" },
      { slot: "package", label: "Option", copy: "옵션 확인" },
    ],
    commerce: [
      { slot: "feature", label: "Detail", copy: "제품 디테일" },
      { slot: "lifestyle", label: "Use", copy: "사용 장면" },
      { slot: "package", label: "Set", copy: "구성 확인" },
    ],
  };
  const items = itemMap[industry] || itemMap.commerce;
  return `
    <div class="sales-hero-product-rail ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <figure>
          ${salesImage(images, item.slot, item.label)}
          <figcaption>
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function salesHeroEditorialBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const copy = {
    health: isB ? "구성, 휴대성, 선물성을 한 번에 확인하는 구매 판단 컷" : "원료와 패키지 무드를 함께 보여주는 프리미엄 선물 컷",
    beauty: isB ? "제형과 패키지를 빠르게 비교하는 구매 판단 컷" : "브랜드 감성과 제형 무드를 함께 보여주는 뷰티 컷",
    living: isB ? "사용 전후와 구성 정보를 빠르게 이해시키는 실용 컷" : "생활 공간 안에서 제품 가치를 보여주는 연출 컷",
    fashion: isB ? "소재, 핏, 옵션을 빠르게 확인하는 구매 판단 컷" : "브랜드 무드와 착용 이미지를 함께 보여주는 스타일 컷",
    commerce: isB ? "구성, 디테일, 사용 장면을 빠르게 확인하는 구매 판단 컷" : "제품 가치와 브랜드 무드를 함께 보여주는 대표 컷",
  };
  const main = images?.package ? "package" : "hero";
  const sub = images?.stick ? "stick" : "feature";
  const side = images?.giftBag ? "giftBag" : "openBox";
  return `
    <div class="sales-hero-editorial-board ${isB ? "is-conversion" : "is-premium"}">
      <figure class="is-main">${salesImage(images, main, "대표 패키지 연출컷")}</figure>
      <figure class="is-sub">${salesImage(images, sub, "제품 디테일 컷")}</figure>
      <div>
        <small>${escapeHtml(isB ? "DETAIL CUT SYSTEM" : "VISUAL MOOD SYSTEM")}</small>
        <strong>${escapeHtml(copy[industry] || copy.commerce)}</strong>
        <span>${escapeHtml(isB ? "상세 초안에서는 실제 사진을 기반으로 배치하고, 최종 제작 시 동일 톤으로 촬영/합성 보정합니다." : "상품 첫인상, 제품 질감, 선물 이미지를 한 화면에서 자연스럽게 연결합니다.")}</span>
      </div>
      <figure class="is-side">${salesImage(images, side, "보조 제품 연출컷")}</figure>
    </div>
  `;
}

function salesAdvertisingClaimStack(isB = false, industry = inferProductIndustry()) {
  const copy = {
    health: isB
      ? ["성분보다 먼저 보이는 구매 이유", "구성 · 휴대성 · 선물성 · 신뢰 정보"]
      : ["선물하기 좋은 하루 한 포 루틴", "원료 스토리와 패키지 무드가 먼저 느껴지는 구성"],
    beauty: isB
      ? ["텍스처와 루틴을 빠르게 확인", "고민 · 사용감 · 신뢰 정보를 한 흐름으로"]
      : ["브랜드 감성과 제형 무드 중심", "첫인상부터 감각적인 뷰티 루틴으로 연결"],
    living: isB
      ? ["불편함을 바로 해결하는 구매 구조", "문제 · 해결 · 비교 · 사용법을 빠르게 확인"]
      : ["생활 장면 안에서 보이는 실용 가치", "공간과 사용성을 자연스럽게 보여주는 구성"],
    fashion: isB
      ? ["핏과 옵션을 빠르게 비교", "소재 · 착용 · 선택 정보를 한눈에"]
      : ["룩북처럼 시작하는 제품 상세", "스타일 무드와 디테일 컷을 먼저 강조"],
    commerce: isB
      ? ["구매 전 핵심 포인트를 빠르게 확인", "장점 · 구성 · 신뢰 · CTA를 한 흐름으로"]
      : ["브랜드 무드가 먼저 보이는 제품 상세", "제품 가치와 사용 장면을 자연스럽게 연결"],
  };
  const lines = copy[industry] || copy.commerce;
  return `
    <div class="sales-ad-claim-stack ${isB ? "is-conversion" : "is-premium"}">
      <b>${escapeHtml(isB ? "SHOPPING POINT" : "BRAND MESSAGE")}</b>
      <strong>${escapeHtml(lines[0])}</strong>
      <span>${escapeHtml(lines[1])}</span>
    </div>
  `;
}

function salesLongScrollPreviewBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  const selected = refs.length
    ? (isB ? [refs[0], refs[3], refs[5], refs[8], refs[10]] : [refs[0], refs[1], refs[2], refs[6], refs[11]]).filter(Boolean)
    : [];
  const fallbackSlots = isB
    ? ["hero", "feature", "package", "trust", "info"]
    : ["hero", "origin", "package", "lifestyle", "giftBag"];
  const labels = {
    health: isB ? ["첫 화면", "장점", "구성", "신뢰", "구매"] : ["브랜드", "원료", "패키지", "선물", "마감"],
    beauty: isB ? ["첫 화면", "고민", "제형", "루틴", "구매"] : ["브랜드", "감성", "텍스처", "루틴", "마감"],
    living: isB ? ["문제", "해결", "비교", "사용", "구매"] : ["공간", "사용", "디테일", "정리", "마감"],
    commerce: isB ? ["첫 화면", "장점", "구성", "신뢰", "구매"] : ["브랜드", "스토리", "제품", "사용", "마감"],
  };
  const names = labels[industry] || labels.commerce;
  return `
    <div class="sales-long-scroll-preview ${isB ? "is-conversion" : "is-premium"}">
      <div class="long-scroll-copy">
        <small>${escapeHtml(isB ? "LONG DETAIL FLOW" : "SHOPPING DETAIL RHYTHM")}</small>
        <strong>${escapeHtml(isB ? "실제 상세페이지처럼 스크롤 흐름을 먼저 설계합니다" : "브랜드 첫인상부터 마무리 CTA까지 긴 호흡으로 이어집니다")}</strong>
        <p>${escapeHtml(isB ? "구매자는 첫 화면, 장점, 신뢰, 구성, CTA를 순서대로 확인합니다. 이 흐름이 끊기지 않도록 섹션 밀도를 맞춥니다." : "제품 이미지와 원료/사용/패키지 컷이 반복적으로 등장해, 단순 설명이 아니라 판매용 상세 흐름처럼 보이게 합니다.")}</p>
      </div>
      <div class="long-scroll-phone">
        ${(selected.length ? selected : fallbackSlots).map((item, index) => `
          <figure>
            ${selected.length ? `<img src="${item}" alt="${escapeHtml(names[index] || "상세 흐름")}">` : salesImage(images, item, names[index] || "상세 흐름")}
            <figcaption>${String(index + 1).padStart(2, "0")} ${escapeHtml(names[index] || "상세 흐름")}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesDetailAdSpread(images = {}, usp = [], isB = false, industry = inferProductIndustry()) {
  const p = product();
  const mainSlot = images?.package ? "package" : images?.hero ? "hero" : "feature";
  const subSlot = images?.stick ? "stick" : images?.openBox ? "openBox" : "lifestyle";
  const points = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 3);
  const title = {
    health: isB ? "구매 전 확인할 포인트를 광고처럼 정리" : "프리미엄 원료와 패키지를 크게 보여주는 광고형 섹션",
    beauty: isB ? "제형, 사용감, 루틴을 구매 포인트로 정리" : "브랜드 감성과 텍스처가 보이는 뷰티 광고형 섹션",
    living: isB ? "문제 해결 포인트를 한 화면에서 설득" : "생활 장면과 제품 가치를 크게 보여주는 섹션",
    fashion: isB ? "핏, 소재, 옵션을 구매 포인트로 정리" : "룩북처럼 제품 무드를 보여주는 광고형 섹션",
    commerce: isB ? "구매 전 확인할 포인트를 광고처럼 정리" : "제품 가치와 브랜드 무드를 크게 보여주는 광고형 섹션",
  };
  return `
    <div class="sales-detail-ad-spread ${isB ? "is-conversion" : "is-premium"}">
      <div class="ad-spread-copy">
        <small>${escapeHtml(isB ? "COMMERCE AD SECTION" : "EDITORIAL AD SECTION")}</small>
        <strong>${escapeHtml(title[industry] || title.commerce)}</strong>
        <p>${escapeHtml(isB ? "단순 장점 나열 대신 제품 이미지, 숫자, 배지, 비교 포인트를 한 화면에 묶어 구매 판단을 돕습니다." : "상세페이지 중간에 큰 광고 컷을 넣어 제품이 실제 판매 페이지처럼 힘 있게 보이도록 합니다.")}</p>
        <div>
          ${points.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <figure class="ad-spread-main">
        ${salesImage(images, mainSlot, p.productName || "제품 대표 이미지")}
      </figure>
      <figure class="ad-spread-sub">
        ${salesImage(images, subSlot, "제품 보조 이미지")}
      </figure>
      <em>${escapeHtml(isB ? "CHECK BEFORE BUY" : "PREMIUM PRODUCT CUT")}</em>
    </div>
  `;
}

function salesDetailRhythmStrip(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.rhythm : blocks.A?.rhythm) || designBlockLibraryForIndustry("commerce").rhythmA;
  return `
    <div class="sales-detail-rhythm-strip ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesMarketplaceProofPanel(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const cards = (isB ? blocks.B?.proofCards : blocks.A?.proofCards) || designBlockLibraryForIndustry("commerce").proofA;
  const emphasis = isB ? blocks.B?.emphasis : blocks.A?.emphasis;
  return `
    <div class="sales-marketplace-proof ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-marketplace-proof-head">
        <small>${escapeHtml(isB ? "BUYING REASON MAP" : "BRAND VALUE MAP")}</small>
        <strong>${escapeHtml(emphasis || (isB ? "고객이 구매 전에 확인하는 순서대로 설계" : "브랜드 무드와 구매 이유가 자연스럽게 이어지는 구조"))}</strong>
      </div>
      <div class="sales-marketplace-proof-cards">
        ${cards.map((item) => `
          <article>
            <b>${escapeHtml(item.value)}</b>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesCheckoutOfferPanel(isB = false, workflow = latestDesignWorkflow()) {
  const blocks = workflow?.designBlocks || recommendedDesignBlocks(workflow?.analysis || analyzeProductForDesign(), workflow?.decision || designDecisionFromAnalysis(workflow?.analysis || analyzeProductForDesign()));
  const items = (isB ? blocks.B?.checkout : blocks.A?.checkout) || designBlockLibraryForIndustry("commerce").checkoutA;
  return `
    <div class="sales-checkout-offer ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "FINAL CHECK" : "SPECIAL ROUTINE")}</small>
        <strong>${escapeHtml(isB ? "구매 전 마지막 확인 포인트" : "선물하기 좋은 프리미엄 한 포")}</strong>
      </div>
      <ul>
        ${items.map((item) => `<li><b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.copy)}</span></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesIndustrySignaturePanel(profile = {}, isB = false) {
  const industryCopy = {
    health: isB
      ? ["구성 정보", "섭취 편의", "표현 검수"]
      : ["원료 무드", "선물 가치", "신뢰 정보"],
    beauty: isB
      ? ["피부 고민", "제형 포인트", "후기 설득"]
      : ["감성 무드", "텍스처", "브랜드 톤"],
    living: isB
      ? ["문제 상황", "해결 포인트", "비교 정보"]
      : ["깨끗한 사용감", "생활 장면", "실용 정보"],
    fashion: isB
      ? ["옵션 비교", "착용 포인트", "구매 체크"]
      : ["룩북 무드", "소재감", "스타일링"],
    commerce: isB
      ? ["구매 이유", "정보 확인", "CTA"]
      : ["브랜드 무드", "상품 가치", "신뢰"],
  };
  const chips = industryCopy[profile.industry] || industryCopy.commerce;
  return `
    <div class="sales-industry-signature ${isB ? "is-conversion" : "is-premium"}">
      <small>${escapeHtml(profile.name || "AI DESIGN PROFILE")}</small>
      <b>${escapeHtml(profile.focus || profile.imageStrategy || "제품 특성에 맞춘 상세페이지 디자인 전략")}</b>
      <div>
        ${chips.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesDesignSystemPanel(profile = {}, isB = false) {
  const colors = profile.colorSystem || {};
  const flow = Array.isArray(profile.flow) ? profile.flow : ["hero", "story", "benefit", "trust", "info", "cta"];
  const flowLabels = {
    hero: "첫인상",
    story: "스토리",
    benefit: "장점",
    lifestyle: "사용 장면",
    trust: "신뢰",
    info: "정보",
    cta: "구매 유도",
    problem: "문제 제기",
    usage: "사용법",
    compare: "비교",
    lineup: "옵션",
  };
  return `
    <div class="sales-design-system-panel ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>AI DESIGN SYSTEM</small>
        <strong>${escapeHtml(profile.typography || "제품에 맞는 정보 위계와 타이포그래피를 적용합니다")}</strong>
        <p>${escapeHtml(profile.imageStrategy || "대표컷, 사용컷, 정보컷을 상세페이지 흐름에 맞게 배치합니다")}</p>
      </div>
      <ul>
        ${flow.slice(0, 7).map((item, index) => `<li><i>${String(index + 1).padStart(2, "0")}</i><span>${escapeHtml(flowLabels[item] || item)}</span></li>`).join("")}
      </ul>
      <div class="sales-design-swatches">
        <span style="--swatch:${escapeHtml(colors.accent || "#b9822d")}"></span>
        <span style="--swatch:${escapeHtml(colors.bg || "#fffaf0")}"></span>
        <span style="--swatch:${escapeHtml(colors.dark || "#2b241b")}"></span>
      </div>
    </div>
  `;
}

function salesProductCompositionStrip(images = {}, isB = false) {
  const cards = [
    { slot: "stick", label: "Stick", copy: "한 포씩 꺼내기 쉬운 개별 포장" },
    { slot: "openBox", label: "30P", copy: "선물과 데일리 루틴에 맞는 구성" },
    { slot: "giftBag", label: "Gift", copy: "고급스러운 선물 이미지 보강" },
  ];
  return `
    <div class="sales-composition-strip ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(isB ? "구성을 보고 바로 이해하는 제품 쇼케이스" : "프리미엄 패키지 무드를 만드는 구성 쇼케이스")}</strong>
      <div>
        ${cards.map((item) => `
          <article>
            ${salesImage(images, item.slot, item.label)}
            <b>${escapeHtml(item.label)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesAmbientProductLayer(isB = false) {
  return `
    <div class="sales-ambient-layer ${isB ? "is-conversion" : "is-premium"}" aria-hidden="true">
      <span class="ambient-litchi ambient-litchi-1"></span>
      <span class="ambient-litchi ambient-litchi-2"></span>
      <span class="ambient-honey-line ambient-honey-line-1"></span>
      <span class="ambient-honey-line ambient-honey-line-2"></span>
      <span class="ambient-premium-mark">${escapeHtml(isB ? "BUYING POINT" : "LITCHI HONEY")}</span>
    </div>
  `;
}

function salesIngredientScenePanel(images = {}, isB = false) {
  const points = isB
    ? ["제품 선택 이유를 원료-구성-섭취 편의로 빠르게 연결", "구매 전 필요한 정보를 앞쪽에서 바로 확인", "과장 효능 대신 원료와 구성 중심으로 설득"]
    : ["리치 원료와 꿀의 달콤한 이미지를 브랜드 무드로 연결", "프리미엄 패키지와 원료 스토리를 한 컷 안에 구성", "선물용 건강식품처럼 차분하고 신뢰감 있게 표현"];
  return `
    <div class="sales-ingredient-scene-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-ingredient-visual">
        ${salesImage(images, isB ? "stick" : "package", "원료 스토리 제품 이미지")}
        ${images?.boxYellow ? `<img src="${images.boxYellow}" alt="보조 패키지 이미지">` : ""}
      </div>
      <div class="sales-ingredient-copy">
        <small>${escapeHtml(isB ? "Reason Mapping" : "Ingredient Mood")}</small>
        <strong>${escapeHtml(isB ? "구매 이유가 한눈에 들어오는 원료/구성 설계" : "원료 스토리와 패키지 무드가 함께 보이는 프리미엄 장면")}</strong>
        ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesHeroDecorLayer(isB = false) {
  return `
    <div class="sales-hero-decor-layer" aria-hidden="true">
      <span></span>
      <i></i>
      <b>${escapeHtml(isB ? "CHECK / COMPARE / BUY" : "PREMIUM / GIFT / ROUTINE")}</b>
    </div>
  `;
}

function salesHeroBackdropLabel(isB = false, name = "Product") {
  const text = isB ? "BUY NOW" : name.replace(/\s+/g, " ").slice(0, 18);
  return `<strong class="sales-hero-backdrop-label" aria-hidden="true">${escapeHtml(text)}</strong>`;
}

function salesHeroSpotlightNotes(isB = false, industry = inferProductIndustry()) {
  const map = {
    health: isB ? ["30포 구성", "간편 스틱", "선물 가능"] : ["리치 원료", "프리미엄 꿀", "선물 패키지"],
    beauty: isB ? ["제형 확인", "루틴 제안", "성분 체크"] : ["감성 패키지", "텍스처 무드", "데일리 케어"],
    living: isB ? ["문제 해결", "사용 쉬움", "구성 확인"] : ["생활 장면", "실용 구성", "공간 무드"],
    fashion: isB ? ["핏 확인", "소재 체크", "옵션 선택"] : ["룩북 무드", "소재 디테일", "스타일링"],
    commerce: isB ? ["구성 확인", "장점 비교", "구매 판단"] : ["브랜드 무드", "제품 가치", "사용 장면"],
  };
  const items = map[industry] || map.commerce;
  return `
    <div class="sales-hero-spotlight-notes ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesHeroSignatureStrip(isB = false, industry = inferProductIndustry()) {
  const titleMap = {
    health: isB ? "구매 전 꼭 확인할 건강식품 정보 흐름" : "프리미엄 건강식품 브랜드 무드 흐름",
    beauty: isB ? "고민-제형-루틴으로 이어지는 뷰티 선택 흐름" : "감성 제형과 브랜드 무드가 이어지는 뷰티 흐름",
    living: isB ? "문제-해결-사용으로 이어지는 실용 선택 흐름" : "생활 장면과 제품 가치가 이어지는 사용 흐름",
    fashion: isB ? "핏-소재-옵션으로 이어지는 스타일 선택 흐름" : "룩북 무드와 착용 감도가 이어지는 스타일 흐름",
    commerce: isB ? "구매 판단을 빠르게 돕는 정보 흐름" : "제품 가치와 브랜드 무드가 이어지는 상세 흐름",
  };
  return `
    <div class="sales-hero-signature-strip ${isB ? "is-conversion" : "is-premium"}">
      <b>${escapeHtml(isB ? "A/B 시안 B" : "A/B 시안 A")}</b>
      <span>${escapeHtml(titleMap[industry] || titleMap.commerce)}</span>
    </div>
  `;
}

function salesMoodKeywords(isB = false) {
  const items = isB
    ? ["FAST CHECK", "CLEAR INFO", "BUYING REASON"]
    : ["SOFT GIFT", "BRAND STORY", "PREMIUM MOOD"];
  return `
    <div class="sales-mood-keywords">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesValueJourneyPanel(usp = [], isB = false) {
  const items = isB
    ? [
        { label: "원료", title: usp[0] || "리치 원료", copy: "무엇으로 만든 제품인지 먼저 확인" },
        { label: "구성", title: usp[2] || "30포 스틱", copy: "구매 후 받게 되는 구성을 명확히 이해" },
        { label: "편의", title: usp[4] || "휴대 편의성", copy: "언제 어디서나 쓰기 쉬운 이유 확인" },
        { label: "신뢰", title: "주의 정보", copy: "과장 없이 구매 전 확인 정보 정리" },
      ]
    : [
        { label: "Story", title: usp[0] || "리치 원료", copy: "원료 이야기를 프리미엄 첫인상으로 연결" },
        { label: "Package", title: usp[3] || "선물 패키지", copy: "선물용으로 보기 좋은 구성 강조" },
        { label: "Routine", title: usp[2] || "개별 스틱", copy: "하루 한 포 루틴을 감성적으로 제안" },
        { label: "Trust", title: "제품 정보", copy: "건강식품에 필요한 정보와 주의사항 정리" },
      ];
  return `
    <div class="sales-value-journey-panel ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(isB ? "구매 판단 흐름을 한 번에 정리합니다" : "브랜드 가치가 구매 이유로 이어지는 흐름")}</strong>
      <div>
        ${items.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <small>${escapeHtml(item.label)}</small>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesBenefitReasonLadder(usp = [], isB = false) {
  const items = isB
    ? [
        { label: "01", title: "무엇이 다른가", copy: usp[0] || "제품만의 원료/구성 차별점" },
        { label: "02", title: "왜 편한가", copy: usp[2] || "개별 스틱 포장과 휴대 편의성" },
        { label: "03", title: "왜 지금 선택하는가", copy: usp[3] || "선물성과 구매 판단 정보" },
      ]
    : [
        { label: "01", title: "첫인상", copy: "프리미엄 패키지와 고급 식품 이미지" },
        { label: "02", title: "스토리", copy: usp[0] || "리치 원료와 꿀의 브랜드 가치" },
        { label: "03", title: "루틴", copy: usp[2] || "하루 한 포의 간편한 선물 루틴" },
      ];
  return `
    <div class="sales-benefit-reason-ladder ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item) => `
        <article>
          <i>${escapeHtml(item.label)}</i>
          <b>${escapeHtml(item.title)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function salesCommerceRibbon(isB = false) {
  const items = isB
    ? ["비교하기 쉬운 정보", "구매 포인트 압축", "선택 근거 강화"]
    : ["프리미엄 선물 무드", "원료 스토리 중심", "브랜드 신뢰 강화"];
  return `
    <div class="sales-commerce-ribbon ${isB ? "is-conversion" : "is-premium"}">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesPremiumHeroSignature(items = []) {
  const values = (items.length ? items : ["리치 원료", "프리미엄 꿀", "선물용 패키지"]).slice(0, 2);
  return `
    <div class="sales-premium-signature">
      <span>Hoabee Selection</span>
      <strong>좋은 원료와 선물하기 좋은 패키지를 차분하게 보여주는 프리미엄 상세 구성</strong>
      <div>${values.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div>
    </div>
  `;
}

function salesConversionHeroChecklist(usp = []) {
  const items = (usp.length ? usp : ["리치 원료", "30포 구성", "개별 스틱 포장"]).slice(0, 4);
  return `
    <div class="sales-conversion-hero-checklist">
      <strong>구매 전 10초 체크</strong>
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesDesignAccentPanel(images = {}, isB = false) {
  const mainSlot = isB ? "stick" : "package";
  const subSlot = isB ? "openBox" : "giftBag";
  return `
    <div class="sales-design-accent-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-accent-copy">
        <small>${escapeHtml(isB ? "Commerce Layout" : "Brand Mood")}</small>
        <strong>${escapeHtml(isB ? "정보를 빠르게 비교하고 구매 이유를 확인하는 전환형 구성" : "제품의 원료와 패키지 감도를 고급스럽게 쌓는 브랜드형 구성")}</strong>
      </div>
      <div class="sales-accent-products">
        ${salesImage(images, mainSlot, "강조 제품 이미지")}
        ${images?.[subSlot] ? `<img src="${images[subSlot]}" alt="보조 제품 이미지">` : ""}
      </div>
    </div>
  `;
}

function salesSectionGraphicFooter(isB = false) {
  const items = isB
    ? ["비교", "정보", "신뢰", "구매"]
    : ["원료", "패키지", "선물", "루틴"];
  return `
    <div class="sales-section-graphic-footer">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesSceneMiniShowcase(images = {}, isB = false) {
  const items = isB
    ? [
        { slot: "stick", label: "휴대" },
        { slot: "boxPink", label: "구성" },
      ]
    : [
        { slot: "giftBag", label: "선물" },
        { slot: "package", label: "패키지" },
      ];
  return `
    <div class="sales-scene-mini-showcase">
      ${items.map((item) => `
        <div>
          ${salesImage(images, item.slot, item.label)}
          <span>${escapeHtml(item.label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesLifestyleShowcase(images = {}, isB = false) {
  const leftSlot = isB ? "stick" : "giftBag";
  const rightSlot = isB ? "openBox" : "package";
  const title = isB ? "구매 후 사용 장면까지 바로 상상되도록" : "선물로 받았을 때의 첫인상까지 고급스럽게";
  const points = isB
    ? ["가방에 넣기 쉬운 스틱형", "30포 구성으로 루틴 관리", "구매 정보와 사용 장면 연결"]
    : ["프리미엄 패키지 첫인상", "선물용 쇼핑백 무드", "원료 스토리와 브랜드 감도 연결"];
  return `
    <div class="sales-lifestyle-showcase ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Usage Proof" : "Gift Scene")}</small>
        <strong>${escapeHtml(title)}</strong>
        ${points.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <figure>
        ${salesImage(images, leftSlot, "라이프스타일 보조 이미지")}
        ${images?.[rightSlot] ? `<img src="${images[rightSlot]}" alt="라이프스타일 제품 이미지">` : ""}
      </figure>
    </div>
  `;
}

function salesEditorialImageStoryBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const titles = {
    health: isB ? "구매자가 보는 순서대로 원료-구성-섭취 정보를 연결합니다" : "원료 스토리와 선물 패키지의 감도를 한 화면에 묶습니다",
    beauty: isB ? "고민-제형-사용 루틴을 구매 판단 순서로 보여줍니다" : "제형의 감성과 브랜드 패키지를 부드럽게 연결합니다",
    living: isB ? "불편 상황-해결 방식-구성 정보를 순서대로 보여줍니다" : "생활 공간에서 쓰이는 모습을 자연스럽게 보여줍니다",
    fashion: isB ? "소재-핏-스타일링 정보를 빠르게 확인하게 합니다" : "브랜드 무드와 착용 이미지를 스타일 컷처럼 연결합니다",
    commerce: isB ? "제품 디테일-구성-사용 정보를 구매 순서대로 보여줍니다" : "제품 스토리와 브랜드 무드를 한 화면에 묶습니다",
  };
  const items = [
    { slot: "origin", label: "01 Story", fallback: "package" },
    { slot: "feature", label: "02 Detail", fallback: "stick" },
    { slot: "openBox", label: "03 Set", fallback: "package" },
  ];
  return `
    <div class="sales-editorial-image-story ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Image Flow" : "Editorial Flow")}</small>
        <strong>${escapeHtml(titles[industry] || titles.commerce)}</strong>
      </div>
      <div class="sales-editorial-image-row">
        ${items.map((item) => `
          <figure>
            ${salesImage(images, images?.[item.slot] ? item.slot : item.fallback, item.label)}
            <figcaption>${escapeHtml(item.label)}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesFeaturePosterBoard(images = {}, usp = [], isB = false, industry = inferProductIndustry()) {
  const titleMap = {
    health: isB ? "구매 이유를 숫자와 카드로 정리" : "프리미엄 원료와 선물 구성을 포스터처럼 강조",
    beauty: isB ? "피부 고민별 선택 포인트 정리" : "제형과 감성 루틴을 포스터처럼 강조",
    living: isB ? "문제 해결 포인트를 카드로 정리" : "생활 장면과 실용성을 포스터처럼 강조",
    fashion: isB ? "핏과 소재 선택 포인트 정리" : "스타일 무드를 포스터처럼 강조",
    commerce: isB ? "구매 이유를 숫자와 카드로 정리" : "제품 가치와 브랜드 무드를 포스터처럼 강조",
  };
  const mainSlot = images?.openBox ? "openBox" : images?.package ? "package" : "hero";
  const list = (usp.length ? usp : fallbackUspForIndustry(industry)).slice(0, 4);
  return `
    <div class="sales-feature-poster-board ${isB ? "is-conversion" : "is-premium"}">
      <figure>${salesImage(images, mainSlot, "핵심 제품 구성컷")}</figure>
      <div>
        <small>${escapeHtml(isB ? "Reason to Buy" : "Premium Detail Poster")}</small>
        <strong>${escapeHtml(titleMap[industry] || titleMap.commerce)}</strong>
        <div>
          ${list.map((item, index) => `<span><b>${String(index + 1).padStart(2, "0")}</b>${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function salesNarrativeBridgePanel(images = {}, isB = false, industry = inferProductIndustry()) {
  const copyMap = {
    health: isB
      ? ["원료 신뢰", "구성 확인", "섭취 편의", "구매 판단"]
      : ["원료 이야기", "패키지 무드", "선물 이미지", "프리미엄 루틴"],
    beauty: isB
      ? ["고민 확인", "제형 정보", "사용 루틴", "구매 판단"]
      : ["브랜드 감성", "텍스처 무드", "케어 루틴", "감성 마무리"],
    living: isB
      ? ["불편 상황", "해결 방식", "사용 정보", "구매 판단"]
      : ["생활 장면", "제품 사용", "공간 정돈", "실용 가치"],
    fashion: isB
      ? ["핏 확인", "소재 정보", "옵션 선택", "구매 판단"]
      : ["룩북 무드", "소재 디테일", "착용 장면", "스타일 완성"],
    commerce: isB
      ? ["제품 확인", "장점 비교", "사용 정보", "구매 판단"]
      : ["브랜드 무드", "제품 가치", "사용 장면", "선택 이유"],
  };
  const items = copyMap[industry] || copyMap.commerce;
  const mainSlot = isB ? "feature" : "package";
  return `
    <div class="sales-narrative-bridge ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Reading Flow" : "Story Flow")}</small>
        <strong>${escapeHtml(isB ? "고객이 구매 이유를 순서대로 이해하도록 연결합니다" : "브랜드 무드에서 제품 가치까지 자연스럽게 이어줍니다")}</strong>
      </div>
      <figure>
        ${salesImage(images, mainSlot, "스토리 연결 제품 이미지")}
      </figure>
      <ol>
        ${items.map((item, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(item)}</span></li>`).join("")}
      </ol>
    </div>
  `;
}

function salesDetailReferenceRemixBoard(images = {}, isB = false, industry = inferProductIndustry()) {
  const refs = Array.isArray(images?.referenceSections) ? images.referenceSections : [];
  if (!refs.length) return "";
  const selected = isB
    ? [refs[0], refs[4], refs[7], refs[8], refs[10]].filter(Boolean)
    : [refs[0], refs[1], refs[2], refs[6], refs[11]].filter(Boolean);
  const flow = {
    health: isB
      ? ["첫인상", "사용 장면", "구성 확인", "신뢰 자료", "구매 판단"]
      : ["브랜드 무드", "원료 스토리", "제품 가치", "선물 장면", "마무리"],
    beauty: isB
      ? ["제품 첫인상", "고민 확인", "제형 정보", "사용법", "구매 판단"]
      : ["브랜드 감성", "제형 무드", "루틴 장면", "성분 신뢰", "마무리"],
    commerce: isB
      ? ["첫 화면", "장점 확인", "구성 정보", "신뢰 자료", "전환"]
      : ["브랜드", "스토리", "제품 가치", "사용 장면", "마감"],
  };
  const items = flow[industry] || flow.commerce;
  return `
    <div class="sales-reference-remix-board ${isB ? "is-conversion" : "is-premium"}">
      <div class="reference-remix-copy">
        <small>${escapeHtml(isB ? "DETAIL FLOW SYSTEM" : "EDITORIAL DETAIL FLOW")}</small>
        <strong>${escapeHtml(isB ? "구매자가 스크롤하며 확인할 상세 흐름을 압축해서 보여줍니다" : "브랜드 무드와 원료 이야기가 이어지는 상세 흐름을 만듭니다")}</strong>
        <p>${escapeHtml(isB ? "첫 화면부터 정보, 신뢰, 구매 판단까지 끊기지 않도록 섹션의 시각 리듬을 맞춥니다." : "제품 사진, 원료 이미지, 패키지 무드를 한 흐름으로 연결해 실제 상세페이지처럼 보이게 합니다.")}</p>
      </div>
      <div class="reference-remix-strip">
        ${selected.map((src, index) => `
          <figure>
            <img src="${src}" alt="${escapeHtml(items[index] || "상세 흐름 이미지")}">
            <figcaption><b>${String(index + 1).padStart(2, "0")}</b><span>${escapeHtml(items[index] || "상세 흐름")}</span></figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesIngredientVisualMap(images = {}, isB = false, industry = inferProductIndustry()) {
  const text = salesIndustryPanelText(industry, isB);
  const cards = industry === "health"
    ? [
        { title: "리치 원료", copy: "열대 과일의 산뜻한 이미지를 원료 스토리로 표현" },
        { title: "프리미엄 꿀", copy: "달콤함과 선물성을 연결하는 주 원료 무드" },
        { title: "스틱 포장", copy: "언제 어디서나 꺼내기 쉬운 개별 포장 구성" },
      ]
    : text.finalItems.slice(0, 3).map((item) => ({ title: item.label, copy: item.copy }));
  return `
    <div class="sales-ingredient-visual-map ${isB ? "is-conversion" : "is-premium"}">
      <div class="visual-map-copy">
        <small>${escapeHtml(isB ? "KEY MATERIAL MAP" : "ORIGIN MOOD MAP")}</small>
        <strong>${escapeHtml(isB ? "구매자가 확인해야 할 핵심 요소를 한눈에 정리" : "원료와 패키지 감성을 상세페이지 흐름으로 연결")}</strong>
        <p>${escapeHtml(isB ? "텍스트 설명만 두지 않고, 제품 사진과 원료 키워드를 카드형 정보로 묶어 구매 판단 속도를 높입니다." : "사진, 라벨, 컬러 포인트를 함께 배치해 브랜드가 가진 프리미엄 이미지를 먼저 느끼게 합니다.")}</p>
      </div>
      <figure class="visual-map-image">
        ${salesImage(images, images?.openBox ? "openBox" : "origin", "원료와 구성 시각화")}
      </figure>
      <div class="visual-map-cards">
        ${cards.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesCommerceComparisonBand(usp = [], isB = false, industry = inferProductIndustry()) {
  const p = product();
  const rows = [
    { label: "구성", standard: "일반 포장", ours: usp[2] || "개별 스틱 포장" },
    { label: "무드", standard: "기능 설명 중심", ours: isB ? "구매 이유 중심" : "프리미엄 선물 무드" },
    { label: "확인", standard: "텍스트 나열", ours: "이미지+카드+CTA로 빠른 이해" },
  ];
  return `
    <div class="sales-commerce-comparison-band ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "COMPARE & CHOOSE" : "DETAIL VALUE CHECK")}</small>
        <strong>${escapeHtml(isB ? "비교하면 선택 이유가 더 분명해집니다" : "제품 가치가 보이는 방식으로 정리합니다")}</strong>
        <p>${escapeHtml(industry === "health" ? "건강식품은 과장된 효능 표현보다 구성, 원료, 섭취 편의성, 선물성을 차분하게 보여주는 것이 중요합니다." : "제품 특성에 맞는 비교 기준을 만들어 구매자가 빠르게 판단하도록 돕습니다.")}</p>
      </div>
      <table>
        <thead>
          <tr><th>기준</th><th>일반 상세</th><th>${escapeHtml(p.productName || "우리 제품")}</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <th>${escapeHtml(row.label)}</th>
              <td>${escapeHtml(row.standard)}</td>
              <td><b>${escapeHtml(row.ours)}</b></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function salesTrustCommercePanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const rows = text.trustRows.slice(0, 4);
  return `
    <div class="sales-trust-commerce-panel ${isB ? "is-conversion" : "is-premium"}">
      <figure>
        ${salesImage(images, "info", "신뢰 정보 자료")}
      </figure>
      <div>
        <small>${escapeHtml(isB ? "Buyer Safety Check" : "Brand Trust Check")}</small>
        <strong>${escapeHtml(isB ? "고객이 망설이는 정보를 구매 전 체크리스트로 정리합니다" : "프리미엄 인상을 해치지 않게 신뢰 정보를 정돈합니다")}</strong>
        <ul>
          ${rows.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function salesReviewStyleProofPanel(isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const source = salesIndustryPanelText(industry, isB).trustRows;
  const reviews = [
    { name: "구매 전 확인", copy: source[0]?.value || "제품 구성과 정보를 먼저 확인할 수 있어야 합니다." },
    { name: "선물 목적", copy: source[1]?.value || "패키지와 제품 이미지가 선물용으로 적합해야 합니다." },
    { name: "최종 판단", copy: source[2]?.value || "사용 방법과 보관 정보가 명확해야 합니다." },
  ];
  return `
    <div class="sales-review-style-proof ${isB ? "is-conversion" : "is-premium"}">
      <div class="review-proof-head">
        <small>${escapeHtml(isB ? "BUYER CHECK VOICE" : "TRUST VOICE DESIGN")}</small>
        <strong>${escapeHtml(isB ? "고객이 궁금해할 질문을 리뷰형 카드로 먼저 답합니다" : "신뢰 요소를 딱딱한 표가 아니라 브랜드 톤으로 보여줍니다")}</strong>
      </div>
      <div class="review-proof-list">
        ${reviews.map((item, index) => `
          <article>
            <b>${String(index + 1).padStart(2, "0")}</b>
            <strong>${escapeHtml(item.name)}</strong>
            <p>${escapeHtml(item.copy)}</p>
            <span>${escapeHtml(isB ? "구매 판단 포인트" : "브랜드 신뢰 포인트")}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesIndustryPanelText(industry = inferProductIndustry(), isB = false) {
  industry = normalizeIndustryKey(industry);
  const sets = {
    health: {
      infoVisualTitle: "제품 상세 정보는 고객이 구매 전 마지막으로 확인하는 신뢰 영역입니다",
      purchaseTitle: isB ? "구매 전 마지막 확인" : "프리미엄 상세 하단 체크",
      purchaseItems: isB
        ? [
            { title: "구성 확인", copy: "구성, 포장, 섭취 정보를 구매 전 명확히 보여줍니다." },
            { title: "섭취/보관 확인", copy: "사용 방법과 보관 주의사항을 과장 없이 정리합니다." },
            { title: "표현 검수", copy: "건강식품 특성상 의약품 오인 표현을 제외합니다." },
          ]
        : [
            { title: "선물 이미지", copy: "패키지와 구성 무드를 함께 보여주어 선물용 인상을 강화합니다." },
            { title: "원료 스토리", copy: "원료 조합을 프리미엄 식품 무드로 연결합니다." },
            { title: "신뢰 정보", copy: "제품 정보와 주의 문구를 차분하게 배치해 신뢰감을 만듭니다." },
          ],
      trustTitle: isB ? "구매 전 불안 요소를 줄이는 체크 구조" : "프리미엄 건강식품답게 신뢰를 쌓는 검수 구조",
      trustRows: isB
        ? [
            { label: "표현", value: "의약품 오인 표현 제외" },
            { label: "정보", value: "구성/섭취/보관 안내" },
            { label: "이미지", value: "실제 제품 기반 합성" },
            { label: "구매", value: "필수 확인 정보 우선 배치" },
          ]
        : [
            { label: "원료", value: "원료 스토리와 제품 정보 분리" },
            { label: "선물", value: "패키지 가치와 브랜드 무드 강조" },
            { label: "주의", value: "건강식품 표현 리스크 검수" },
            { label: "정보", value: "하단 제품 정보 명확화" },
          ],
      finalTitle: isB ? "구매 전 확인할 내용을 마지막 한 번 더 정리합니다" : "선물하기 좋은 프리미엄 루틴으로 마무리합니다",
      finalCopy: isB ? "제품의 장점, 구성, 주의 정보를 한 화면에서 확인하고 선택할 수 있도록 설계한 전환형 마감 영역입니다." : "제품 이미지와 선물 가치를 함께 보여주어 고객이 긍정적인 첫인상을 유지한 채 선택할 수 있게 합니다.",
      finalItems: isB
        ? [{ label: "구성", copy: "구성 확인" }, { label: "편의", copy: "사용 편의성" }, { label: "정보", copy: "구매 전 정보 정리" }]
        : [{ label: "선물", copy: "부담 없이 전하기 좋은 패키지" }, { label: "원료", copy: "프리미엄 원료 이미지" }, { label: "루틴", copy: "데일리 루틴 제안" }],
    },
    beauty: {
      infoVisualTitle: "성분, 제형, 사용법은 뷰티 제품 선택의 마지막 확인 영역입니다",
      purchaseTitle: isB ? "구매 전 뷰티 체크" : "감성 케어 하단 체크",
      purchaseItems: isB
        ? [
            { title: "피부 고민", copy: "고객 고민과 제품 장점을 빠르게 연결합니다." },
            { title: "제형/사용감", copy: "텍스처와 루틴 이미지를 구매 판단 정보로 정리합니다." },
            { title: "성분/주의", copy: "과장 없이 성분과 사용 주의사항을 확인시킵니다." },
          ]
        : [
            { title: "브랜드 무드", copy: "감성 이미지와 제품 제형을 함께 보여줍니다." },
            { title: "사용 루틴", copy: "매일 쓰는 케어 장면으로 제품 경험을 상상하게 합니다." },
            { title: "신뢰 정보", copy: "성분과 사용 정보를 차분하게 정리합니다." },
          ],
      trustTitle: isB ? "구매 전 성분과 사용 정보를 빠르게 확인" : "감성만큼 중요한 성분/사용 신뢰 구조",
      trustRows: [
        { label: "성분", value: "핵심 성분/제형 정보" },
        { label: "사용", value: "루틴과 사용 순서" },
        { label: "주의", value: "피부/사용 주의사항" },
        { label: "이미지", value: "제형과 패키지 왜곡 금지" },
      ],
      finalTitle: isB ? "내 고민에 맞는 뷰티 루틴 선택" : "감성 케어 루틴으로 마무리합니다",
      finalCopy: isB ? "고민, 제형, 사용법을 한 번 더 확인하고 선택할 수 있도록 구성합니다." : "브랜드 무드와 제품 경험이 이어지도록 부드러운 마감 영역을 만듭니다.",
      finalItems: isB
        ? [{ label: "고민", copy: "피부 고민 확인" }, { label: "제형", copy: "사용감 체크" }, { label: "루틴", copy: "사용 순서 확인" }]
        : [{ label: "Mood", copy: "브랜드 감성" }, { label: "Texture", copy: "제형 이미지" }, { label: "Care", copy: "데일리 루틴" }],
    },
    living: {
      infoVisualTitle: "크기, 구성, 사용법은 생활용품 구매 전 꼭 확인하는 정보입니다",
      purchaseTitle: isB ? "구매 전 실용 체크" : "생활 장면 하단 체크",
      purchaseItems: isB
        ? [
            { title: "문제 확인", copy: "고객이 겪는 불편과 해결 포인트를 연결합니다." },
            { title: "사용법 확인", copy: "설치, 사용, 보관 흐름을 명확하게 정리합니다." },
            { title: "스펙 확인", copy: "크기, 구성, 소재 정보를 구매 전 확인시킵니다." },
          ]
        : [
            { title: "생활 장면", copy: "실제 공간에서 쓰이는 모습을 자연스럽게 보여줍니다." },
            { title: "해결 이미지", copy: "사용 전후의 차이를 시각적으로 전달합니다." },
            { title: "실용 정보", copy: "구성, 크기, 주의사항을 깔끔하게 배치합니다." },
          ],
      trustTitle: isB ? "실사용 전 필요한 정보를 빠르게 확인" : "생활용품답게 실용 정보를 쌓는 구조",
      trustRows: [
        { label: "문제", value: "고객 불편 상황" },
        { label: "해결", value: "제품 사용 후 변화" },
        { label: "스펙", value: "크기/구성/소재" },
        { label: "사용", value: "설치/보관 안내" },
      ],
      finalTitle: isB ? "실용적인 선택을 돕는 마지막 확인" : "일상을 정돈하는 사용 장면으로 마무리합니다",
      finalCopy: isB ? "문제, 해결 방식, 구성 정보를 한 번 더 확인하고 선택하게 만듭니다." : "생활 공간에서 자연스럽게 쓰이는 이미지를 유지하며 제품 선택을 유도합니다.",
      finalItems: isB
        ? [{ label: "문제", copy: "불편 확인" }, { label: "해결", copy: "사용 효과" }, { label: "스펙", copy: "정보 확인" }]
        : [{ label: "Scene", copy: "생활 장면" }, { label: "Use", copy: "사용 흐름" }, { label: "Clean", copy: "정돈 이미지" }],
    },
    commerce: {
      infoVisualTitle: "제품 상세 정보는 고객이 구매 전 마지막으로 확인하는 신뢰 영역입니다",
      purchaseTitle: isB ? "구매 전 마지막 확인" : "상세 하단 체크",
      purchaseItems: isB
        ? [
            { title: "구성 확인", copy: "구성, 옵션, 스펙 정보를 구매 전 명확히 보여줍니다." },
            { title: "사용 확인", copy: "사용 장면과 구매 이유를 연결합니다." },
            { title: "정보 검수", copy: "고객이 오해할 수 있는 표현을 정리합니다." },
          ]
        : [
            { title: "브랜드 이미지", copy: "제품의 첫인상과 브랜드 가치를 강화합니다." },
            { title: "제품 스토리", copy: "구매 이유와 사용 장면을 자연스럽게 연결합니다." },
            { title: "신뢰 정보", copy: "제품 정보와 주의 문구를 차분하게 배치합니다." },
          ],
      trustTitle: isB ? "구매 전 불안 요소를 줄이는 체크 구조" : "브랜드 신뢰를 쌓는 검수 구조",
      trustRows: [
        { label: "정보", value: "구성/스펙 안내" },
        { label: "이미지", value: "실제 제품 기반 표현" },
        { label: "주의", value: "오해 표현 검수" },
        { label: "구매", value: "선택 정보 우선 배치" },
      ],
      finalTitle: isB ? "구매 전 확인할 내용을 마지막 한 번 더 정리합니다" : "제품 가치를 확인하고 선택하게 마무리합니다",
      finalCopy: isB ? "제품의 장점, 구성, 주의 정보를 한 화면에서 확인하고 선택할 수 있도록 설계합니다." : "제품 이미지와 브랜드 가치를 함께 보여주어 긍정적인 첫인상을 유지합니다.",
      finalItems: isB
        ? [{ label: "구성", copy: "구성 확인" }, { label: "장점", copy: "핵심 가치" }, { label: "정보", copy: "구매 전 정보" }]
        : [{ label: "Brand", copy: "브랜드 가치" }, { label: "Point", copy: "제품 장점" }, { label: "Trust", copy: "신뢰 정보" }],
    },
  };
  return sets[industry] || sets.commerce;
}

function salesInfoVisualPanel(images = {}, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), false);
  return `
    <div class="sales-info-visual-panel">
      <div>
        <small>Information Preview</small>
        <strong>${escapeHtml(text.infoVisualTitle)}</strong>
      </div>
      <figure>
        ${salesImage(images, "info", "제품 상세 정보")}
      </figure>
    </div>
  `;
}

function salesPackageUnboxingPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const items = industry === "health"
    ? [
        { slot: "package", title: "패키지", copy: "제품의 첫인상을 만드는 외부 박스" },
        { slot: "openBox", title: "30포 구성", copy: "구성 수량과 내부 정렬을 한눈에 확인" },
        { slot: "stick", title: "개별 스틱", copy: "휴대와 섭취가 쉬운 단위 포장" },
      ]
    : [
        { slot: "package", title: "패키지", copy: "구성품과 패키지 상태 확인" },
        { slot: "feature", title: "디테일", copy: "구매 전 봐야 할 핵심 디테일" },
        { slot: "lifestyle", title: "사용 장면", copy: "실제 사용 상황 예시" },
      ];
  return `
    <div class="sales-package-unboxing ${isB ? "is-conversion" : "is-premium"}">
      <div class="package-unboxing-head">
        <small>${escapeHtml(isB ? "WHAT'S INSIDE" : "PACKAGE EXPERIENCE")}</small>
        <strong>${escapeHtml(isB ? "구성품을 확인하면 구매 불안이 줄어듭니다" : "받는 순간의 인상까지 상세페이지에 담습니다")}</strong>
      </div>
      <div class="package-unboxing-grid">
        ${items.map((item, index) => `
          <figure>
            ${salesImage(images, item.slot, item.title)}
            <figcaption>
              <b>${String(index + 1).padStart(2, "0")} ${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function salesPurchaseConfirmPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.purchaseItems;
  return `
    <div class="sales-purchase-confirm-panel ${isB ? "is-conversion" : "is-premium"}">
      <strong>${escapeHtml(text.purchaseTitle)}</strong>
      <div>
        ${items.map((item, index) => `
          <article>
            <i>${String(index + 1).padStart(2, "0")}</i>
            <b>${escapeHtml(item.title)}</b>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesTrustChecklistPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const rows = text.trustRows;
  return `
    <div class="sales-trust-checklist-panel ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "Final Check" : "Trust Checklist")}</small>
        <strong>${escapeHtml(text.trustTitle)}</strong>
      </div>
      <ul>
        ${rows.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesTrustDocumentPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const docs = text.trustRows.slice(0, 3).map((item) => ({ label: item.label, value: item.value }));
  return `
    <div class="sales-trust-document-panel ${isB ? "is-conversion" : "is-premium"}">
      <figure>${salesImage(images, "info", "제품 정보 이미지")}</figure>
      <div>
        <small>${escapeHtml(isB ? "Purchase Proof" : "Trust Archive")}</small>
        <strong>${escapeHtml(text.trustTitle)}</strong>
        <ul>
          ${docs.map((item) => `<li><b>${escapeHtml(item.label)}</b><span>${escapeHtml(item.value)}</span></li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function salesFinalProductStack(images = {}, activeSlot = "package") {
  const mainSlot = images?.[activeSlot] ? activeSlot : "package";
  return `
    <div class="sales-final-product-stack">
      ${salesImage(images, mainSlot, "최종 제품 이미지")}
      ${images?.stick ? `<img class="sales-final-stick" src="${images.stick}" alt="스틱 제품컷">` : ""}
      ${images?.giftBag ? `<img class="sales-final-gift" src="${images.giftBag}" alt="선물 패키지컷">` : ""}
    </div>
  `;
}

function salesRetailClosingPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const p = product();
  const headlineMap = {
    health: isB ? "구성, 휴대성, 선물성을 확인하고 선택하세요" : "프리미엄 건강 루틴을 선물처럼 제안합니다",
    beauty: isB ? "고민, 제형, 루틴을 확인하고 선택하세요" : "감성적인 데일리 케어 루틴을 제안합니다",
    living: isB ? "문제 해결과 사용 정보를 확인하고 선택하세요" : "일상 속 사용 장면을 자연스럽게 제안합니다",
    fashion: isB ? "핏, 소재, 스타일을 확인하고 선택하세요" : "브랜드 무드가 느껴지는 스타일을 제안합니다",
    commerce: isB ? "구성, 장점, 사용 정보를 확인하고 선택하세요" : "제품의 가치를 한 번 더 제안합니다",
  };
  const badges = salesIndustryPanelText(industry, isB).finalItems.slice(0, 3);
  return `
    <div class="sales-retail-closing-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-retail-closing-copy">
        <small>${escapeHtml(isB ? "Final Purchase Guide" : "Premium Closing Guide")}</small>
        <strong>${escapeHtml(headlineMap[industry] || headlineMap.commerce)}</strong>
        <p>${escapeHtml(p.productName || "제품")}의 핵심 가치와 구매 전 확인 정보를 한 화면에서 정리한 최종 선택 영역입니다.</p>
        <div>
          ${badges.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.copy)}</span>`).join("")}
        </div>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "package", "최종 CTA 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 디테일 이미지">` : ""}
      </figure>
    </div>
  `;
}

function salesFinalCommerceBar(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems.map((item) => item.label).concat(isB ? ["최종 선택"] : ["브랜드 무드"]).slice(0, 4);
  return `
    <div class="sales-final-commerce-bar">
      ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesRetailDecisionReceipt(isB = false, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const points = industry === "health"
    ? ["30포 구성", "개별 스틱", "선물 패키지", "원료 스토리"]
    : salesIndustryPanelText(industry, isB).finalItems.map((item) => item.copy).slice(0, 4);
  return `
    <div class="sales-retail-decision-receipt ${isB ? "is-conversion" : "is-premium"}">
      <div>
        <small>${escapeHtml(isB ? "FINAL BUYING CHECK" : "FINAL GIFT CHECK")}</small>
        <strong>${escapeHtml(p.productName || "제품명")}</strong>
        <p>${escapeHtml(isB ? "마지막 CTA 전에 구매자가 확인할 내용을 영수증처럼 정리합니다." : "선물용 상세페이지의 마지막 인상을 고급스럽게 정리합니다.")}</p>
      </div>
      <ul>
        ${points.map((item) => `<li><span>${escapeHtml(item)}</span><b>READY</b></li>`).join("")}
      </ul>
    </div>
  `;
}

function salesFinalConversionDeck(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const text = salesIndustryPanelText(industry, isB);
  const items = industry === "health"
    ? [
        { title: "원료 스토리", copy: "리치와 꿀의 프리미엄 이미지를 중심으로 구성" },
        { title: "30포 구성", copy: "선물과 데일리 루틴 모두 고려한 패키지" },
        { title: "표현 검수", copy: "의약품 오인 없이 신뢰 정보 중심으로 마감" },
      ]
    : text.finalItems.map((item) => ({ title: item.label, copy: item.copy })).slice(0, 3);
  return `
    <div class="sales-final-conversion-deck ${isB ? "is-conversion" : "is-premium"}">
      <div class="final-deck-copy">
        <small>${escapeHtml(isB ? "READY TO DECIDE" : "READY TO GIFT")}</small>
        <strong>${escapeHtml(isB ? "고객이 선택하기 전에 마지막으로 확인할 내용" : "좋은 첫인상을 끝까지 유지하는 프리미엄 마감")}</strong>
        <p>${escapeHtml(p.productName || "제품")}의 핵심 가치, 구성, 신뢰 정보를 마지막 화면에서 다시 정리합니다.</p>
      </div>
      <figure>
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 구매 유도 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 제품 디테일">` : ""}
      </figure>
      <div class="final-deck-points">
        ${items.map((item, index) => `
          <article>
            <b>${String(index + 1).padStart(2, "0")}</b>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.copy)}</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function salesFinalPackageDetail(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const industry = workflow?.analysis?.industry || inferProductIndustry();
  const slotMap = {
    health: isB
      ? [{ slot: "stick", label: "휴대성" }, { slot: "openBox", label: "구성" }, { slot: "info", label: "정보" }]
      : [{ slot: "package", label: "패키지" }, { slot: "giftBag", label: "선물" }, { slot: "stick", label: "루틴" }],
    beauty: isB
      ? [{ slot: "feature", label: "제형" }, { slot: "lifestyle", label: "루틴" }, { slot: "info", label: "성분" }]
      : [{ slot: "package", label: "패키지" }, { slot: "feature", label: "텍스처" }, { slot: "lifestyle", label: "케어" }],
    living: isB
      ? [{ slot: "feature", label: "디테일" }, { slot: "lifestyle", label: "사용" }, { slot: "info", label: "스펙" }]
      : [{ slot: "lifestyle", label: "장면" }, { slot: "feature", label: "해결" }, { slot: "package", label: "구성" }],
    commerce: isB
      ? [{ slot: "feature", label: "장점" }, { slot: "package", label: "구성" }, { slot: "info", label: "정보" }]
      : [{ slot: "package", label: "패키지" }, { slot: "lifestyle", label: "사용" }, { slot: "feature", label: "디테일" }],
  };
  const slots = slotMap[industry] || slotMap.commerce;
  return `
    <div class="sales-final-package-detail ${isB ? "is-conversion" : "is-premium"}">
      ${slots.map((item) => `
        <figure>
          ${salesImage(images, item.slot, item.label)}
          <figcaption>${escapeHtml(item.label)}</figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function salesFinalDecisionPanel(images = {}, isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems;
  return `
    <div class="sales-final-decision-panel ${isB ? "is-conversion" : "is-premium"}">
      <div class="sales-final-decision-copy">
        <small>${escapeHtml(isB ? "Decision Summary" : "Premium Closing")}</small>
        <strong>${escapeHtml(text.finalTitle)}</strong>
        <p>${escapeHtml(text.finalCopy)}</p>
      </div>
      <div class="sales-final-decision-visual">
        ${salesImage(images, isB ? "openBox" : "giftBag", "최종 선택 제품 이미지")}
        ${images?.stick ? `<img src="${images.stick}" alt="스틱 제품 이미지">` : ""}
      </div>
      <div class="sales-final-decision-list">
        ${items.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.copy)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesPremiumEditorialQuote(items = []) {
  const value = (items.length ? items[0] : "프리미엄 원료와 선물성");
  return `
    <div class="sales-premium-editorial-quote">
      <small>Editorial Message</small>
      <strong>“${escapeHtml(value)}을 첫인상부터 마지막 구매 유도까지 하나의 브랜드 무드로 연결합니다.”</strong>
    </div>
  `;
}

function salesConversionProofMatrix(usp = []) {
  const items = [
    { label: "원료", value: usp[0] || "원료 차별점" },
    { label: "구성", value: usp[2] || "30포 구성" },
    { label: "편의", value: usp[4] || "휴대 편의성" },
    { label: "선물", value: usp[3] || "선물용 패키지" },
  ];
  return `
    <div class="sales-conversion-proof-matrix">
      <strong>구매 판단 매트릭스</strong>
      <div>
        ${items.map((item) => `<span><b>${escapeHtml(item.label)}</b>${escapeHtml(item.value)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesTrustSealPanel(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.trustRows.slice(0, 3).map((item) => `${item.label} ${item.value}`);
  return `
    <div class="sales-trust-seal-panel">
      <strong>${escapeHtml(text.trustTitle)}</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesInfoNoticeBar() {
  const rules = salesRiskRules(latestDesignWorkflow()).slice(0, 3);
  return `
    <div class="sales-info-notice-bar">
      <b>구매 전 확인</b>
      ${rules.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesFinalOfferStack(isB = false) {
  const p = product();
  const items = isB
    ? ["구성 정보 확인", "구매 이유 재확인", "최종 선택 유도"]
    : ["선물용 이미지", "프리미엄 루틴", "패키지 가치"];
  return `
    <div class="sales-final-offer-stack">
      <strong>${escapeHtml(p.productName || "제품")}</strong>
      <div>
        ${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesImageCaption(label, copy) {
  return `
    <figcaption class="sales-image-caption">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(copy)}</span>
    </figcaption>
  `;
}

function salesImageCard(images, slot, label, title, copy) {
  return `
    <div class="sales-image-card">
      ${salesImage(images, slot, title)}
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(title)}</b>
      <small>${escapeHtml(copy)}</small>
    </div>
  `;
}

function salesFinalProofStrip(isB = false, workflow = latestDesignWorkflow()) {
  const text = salesIndustryPanelText(workflow?.analysis?.industry || inferProductIndustry(), isB);
  const items = text.finalItems.map((item) => `${item.label} ${item.copy}`);
  return `
    <div class="sales-final-proof-strip">
      ${items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function salesQuickProofItems(isB = false) {
  const industry = latestDesignWorkflow()?.analysis?.industry || inferProductIndustry();
  const map = {
    health: isB ? ["구매 이유 요약", "구성 정보 정리", "선택 부담 감소"] : ["선물용 패키지", "프리미엄 원료 무드", "간편한 데일리 루틴"],
    beauty: isB ? ["피부 고민 요약", "제형 정보 정리", "루틴 선택 유도"] : ["감성 브랜드 무드", "제형/텍스처 강조", "데일리 케어 루틴"],
    living: isB ? ["불편 포인트 요약", "사용 정보 정리", "실용 선택 유도"] : ["생활 장면 제안", "문제 해결 이미지", "실용적 사용 루틴"],
    fashion: isB ? ["핏/소재 요약", "옵션 정보 정리", "스타일 선택 유도"] : ["룩북 무드", "소재 디테일", "스타일링 제안"],
    commerce: isB ? ["구매 이유 요약", "정보 정리", "선택 부담 감소"] : ["브랜드 이미지", "제품 가치", "사용 장면"],
  };
  if (map[industry]) return map[industry];
  if (isB) {
    return ["구매 이유 요약", "구성 정보 정리", "선택 부담 감소"];
  }
  return ["선물용 패키지", "프리미엄 원료 무드", "간편한 데일리 루틴"];
}

function salesHeroSpecStrip() {
  const specs = productSpecItems().slice(0, 3);
  return `
    <div class="sales-hero-spec-strip">
      ${specs.map((item) => `
        <div>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.value)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesBenefitSummaryStrip(items = [], isB = false) {
  const values = (items.length ? items : ["원료", "구성", "휴대성"]).slice(0, 3);
  return `
    <div class="sales-benefit-summary-strip">
      <strong>${escapeHtml(isB ? "구매 판단 요약" : "프리미엄 가치 요약")}</strong>
      ${values.map((item, index) => `
        <span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(item)}</span>
      `).join("")}
    </div>
  `;
}

function salesMotiveBadges(workflow = latestDesignWorkflow(), isB = false) {
  const motives = workflow?.analysis?.purchaseMotives || [];
  const fallback = isB
    ? ["비교하기 쉬운 구매 포인트", "신뢰 정보 먼저 확인", "구매 전 고민 감소"]
    : ["프리미엄 원료 스토리", "선물하기 좋은 패키지", "하루 한 포 루틴"];
  return (motives.length ? motives : fallback).slice(0, 4);
}

function salesVisualNeedBadges(workflow = latestDesignWorkflow()) {
  const needs = workflow?.analysis?.visualNeeds || [];
  const plan = workflow?.imagePlan || [];
  const fromPlan = plan.slice(0, 4).map((item) => item.usedFor || item.role).filter(Boolean);
  const fallback = ["대표 제품컷", "원료/소재 이미지", "사용 장면컷", "신뢰 정보컷"];
  return (needs.length ? needs : fromPlan.length ? fromPlan : fallback).slice(0, 4);
}

function salesRiskRules(workflow = latestDesignWorkflow()) {
  const rules = workflow?.decision?.riskRules || workflow?.analysis?.risks || [];
  return (rules.length ? rules : ["과장 표현 금지", "원료/구성 명확화", "의약품 오인 방지"]).slice(0, 3);
}

function salesRendererSections(label, template) {
  const p = product();
  const slots = copySlots();
  const dataset = categoryDataset(p.category);
  const isB = label.includes("B");
  const industry = latestDesignWorkflow()?.analysis?.industry || inferProductIndustry(p);
  const defaults = salesIndustryCopyDefaults(industry, isB, dataset);
  const productName = slots.productName || p.productName || "제품명";
  const oneLine = slots.oneLine || "제품 한 줄 설명이 필요합니다.";
  return [
    {
      type: "sales-hero",
      title: productName,
      copy: oneLine,
      imageSlot: "hero",
      variant: isB ? "conversion" : "hero",
      designRole: "첫 화면에서 제품 이미지, 핵심 카피, 구매 포인트를 강하게 보여주는 메인 비주얼",
    },
    {
      type: "sales-story",
      title: defaults.storyTitle,
      copy: slots.originStory || dataset.mainMessage,
      imageSlot: "origin",
      variant: isB ? "comparison" : "story",
      designRole: "원료, 브랜드 배경, 제품이 가진 신뢰감을 설득하는 스토리 영역",
    },
    {
      type: "sales-ad-poster",
      title: isB ? "구매자가 바로 이해하는 광고형 정보 구간" : "선물처럼 보이는 프리미엄 광고형 구간",
      copy: isB
        ? "제품컷, 구성컷, 구매 이유를 한 화면에 묶어 전환형 상세페이지처럼 보여주는 핵심 디자인 구간입니다."
        : "브랜드 무드, 제품 이미지, 기존 상세 레퍼런스 흐름을 섞어 실제 쇼핑몰 상세페이지처럼 보이게 하는 핵심 디자인 구간입니다.",
      imageSlot: isB ? "openBox" : "boxPink",
      variant: isB ? "conversion" : "editorial",
      designRole: "단순 설명 박스가 아니라 제품 이미지와 구매 정보를 광고 배너처럼 결합하는 고밀도 시안 구간",
    },
    {
      type: "sales-benefit",
      title: defaults.benefitTitle,
      copy: slots.benefits || dataset.mainMessage,
      imageSlot: "feature",
      variant: isB ? "cards" : "premium",
      designRole: "장점을 카드, 숫자, 아이콘처럼 빠르게 읽히도록 정리하는 영역",
    },
    {
      type: "sales-scene",
      title: defaults.sceneTitle,
      copy: slots.usageScene || slots.giftMessage || dataset.copyBlocks.cta,
      imageSlot: "lifestyle",
      variant: "scene",
      designRole: "실제 사용 장면과 선물/생활 이미지를 보여주는 이미지 중심 영역",
    },
    {
      type: "sales-photo-plan",
      title: isB ? "최종 촬영/합성에 필요한 제품컷 설계" : "초안 이후 완성도를 높일 촬영 무드 설계",
      copy: isB
        ? "최종 제작 시 필요한 단독컷, 구성컷, 구매 판단컷을 미리 정의해 디자이너와 촬영자가 동일한 방향으로 제작하도록 합니다."
        : "프리미엄 선물 무드, 원료 스토리컷, 패키지컷을 미리 정의해 임시 시안과 최종 제작 방향의 차이를 줄입니다.",
      imageSlot: isB ? "stick" : "giftBag",
      variant: "photo-focus",
      designRole: "임시 이미지와 최종 촬영/합성 방향을 연결하는 제작 지시형 디자인 구간",
    },
    {
      type: "sales-trust",
      title: defaults.trustTitle,
      copy: slots.trust || dataset.copyBlocks.trust,
      imageSlot: "trust",
      variant: "trust",
      designRole: "인증, 주의사항, 원료 정보 등 구매 불안을 줄이는 신뢰 영역",
    },
    {
      type: "sales-info",
      title: defaults.infoTitle,
      copy: slots.info || "구성, 원료, 보관 방법을 구매 전 확인하기 쉽게 정리했습니다.",
      imageSlot: "info",
      variant: "info",
      designRole: "구성품, 용량, 섭취/사용 방법을 표 형태로 정리하는 정보 영역",
    },
    {
      type: "sales-purchase-stack",
      title: isB ? "구매 전 마지막 판단 근거" : "선물로 선택해야 하는 이유",
      copy: isB
        ? "구성, 편의, 신뢰 정보를 마지막에 다시 압축해 고객이 선택하기 쉽게 만드는 구매 설득 구간입니다."
        : "첫인상, 원료감, 루틴 가치를 마지막에 다시 정리해 프리미엄 선물 이미지로 마무리합니다.",
      imageSlot: isB ? "openBox" : "package",
      variant: isB ? "conversion" : "premium",
      designRole: "고객에게 보내기 전 A/B 선택 기준을 명확하게 만드는 구매 설득 마감 구간",
    },
    {
      type: "sales-cta",
      title: defaults.ctaTitle,
      copy: slots.cta || dataset.copyBlocks.cta,
      imageSlot: "package",
      variant: isB ? "conversion" : "cta",
      designRole: "최종 구매 또는 상담 결정을 유도하는 마지막 CTA 영역",
    },
  ];
}

function salesPremiumStoryFlow() {
  return `
    <div class="sales-premium-flow">
      ${storyTimelineItems().slice(0, 3).map((item) => `
        <div>
          <small>${escapeHtml(item.step)}</small>
          <b>${escapeHtml(item.title)}</b>
          <span>${escapeHtml(item.copy)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function salesConversionCompareBlock() {
  return `
    <div class="sales-compare-strip">
      <div class="sales-compare-head">
        <b>Before</b>
        <b>Hoabee</b>
      </div>
      ${comparisonItems().map((item) => `
        <div class="sales-compare-row">
          <span>${escapeHtml(item.before)}</span>
          <strong>${escapeHtml(item.after)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function salesPremiumMoodBand(items = []) {
  const values = (items.length ? items : ["프리미엄 원료", "선물용 패키지", "하루 한 포 루틴"]).slice(0, 3);
  return `
    <div class="sales-premium-mood-band">
      ${values.map((item, index) => `
        <div>
          <i>${String(index + 1).padStart(2, "0")}</i>
          <b>${escapeHtml(item)}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function salesPremiumBrandStatement(items = []) {
  const values = (items.length ? items : ["리치 원료", "프리미엄 꿀", "선물용 패키지"]).slice(0, 3);
  return `
    <div class="sales-brand-statement">
      <small>Brand Mood</small>
      <strong>프리미엄 식품 브랜드처럼 차분하고 신뢰감 있게 보여줍니다</strong>
      <div>
        ${values.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesBuyingChecklist(items = []) {
  const base = (items.length ? items : ["원료 확인", "구성 확인", "휴대성 확인", "선물성 확인"]).slice(0, 4);
  return `
    <div class="sales-buying-checklist">
      <strong>구매 전 체크 포인트</strong>
      <div>
        ${base.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function salesConversionDecisionPanel(usp = [], highlights = []) {
  const p = product();
  const points = [
    { label: "고민", value: "좋은 원료인지 빠르게 확인하고 싶음" },
    { label: "해결", value: (highlights[0] || usp[0] || "제품 핵심 장점") },
    { label: "선택", value: `${p.productName || "제품"}의 구성과 선물성을 한 번에 이해` },
  ];
  return `
    <div class="sales-decision-panel">
      <div>
        <small>Decision Flow</small>
        <strong>구매 전 고민을 짧게 정리하고 바로 선택하게 만드는 구조</strong>
      </div>
      ${points.map((item, index) => `
        <article>
          <i>${String(index + 1).padStart(2, "0")}</i>
          <b>${escapeHtml(item.label)}</b>
          <span>${escapeHtml(item.value)}</span>
        </article>
      `).join("")}
    </div>
  `;
}
