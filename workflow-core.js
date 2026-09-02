(() => {
  const SUMMARY_VERSION = "hao-content-summary-v2-semantic";
  const WORKFLOW_VERSION = "hao-detail-workflow-v2-semantic";

  const text = (value) => String(value ?? "").trim();
  const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : text(value) ? [text(value)] : [];
  const unique = (items) => [...new Set(items.filter(Boolean))];
  const lineList = (value) => unique(
    (Array.isArray(value) ? value : String(value || "").split(/\r?\n|,\s*/))
      .map(text)
      .filter(Boolean),
  );
  const valueOrMissing = (value) => text(value) || "미기입";

  function meaningfulCompletedFields(project = {}) {
    const touched = new Set(list(project.customerTouchedFields));
    const fields = [
      "contactName", "contactInfo", "phone", "email", "companyName", "clientName",
      "productName", "majorCategory", "subCategory", "category", "channel", "targetCustomer",
      "buyerConcern", "primaryPurchaseReason", "messagePriority", "emphasis", "deEmphasis",
      "coreStrength", "evidenceBoundary", "productionTrust", "mustInclude", "banWords",
      "visualIdentity", "productImageUsage", "shootingConstraints",
      "referenceUrls", "referenceLikes", "referenceDislikes", "variantRule", "additionalNotes",
    ];
    return fields.filter((key) => text(project[key]) && (touched.size === 0 || touched.has(key)));
  }

  function buildAdminFields(project = {}) {
    const mood = list(project.mood);
    const structure = list(project.structure);
    const colorTone = list(project.colorTone);
    const imageStyle = list(project.imageStyle);
    const avoidStyle = list(project.avoidStyle);
    const productImages = list(project.productImages);
    const brandLogo = list(project.brandLogo);
    const referenceFiles = list(project.referenceFiles);
    const uploaded = [
      productImages.length ? `제품 이미지: ${productImages.join(", ")}` : "",
      brandLogo.length ? `로고/스펙 자료: ${brandLogo.join(", ")}` : "",
      referenceFiles.length ? `참고 이미지/자료: ${referenceFiles.join(", ")}` : "",
    ].filter(Boolean);

    const features = text(project.features) || [project.coreStrength, list(project.strengthTags).join(", ")]
      .map(text).filter(Boolean).join("\n");

    return {
      clientName: text(project.clientName || project.companyName),
      productName: text(project.productName),
      category: text(project.category || [project.majorCategory, project.subCategory].filter(Boolean).join(" / ")),
      channel: text(project.channel),
      dueDate: text(project.dueDate),
      oneLine: text(project.oneLine || project.primaryPurchaseReason || project.coreStrength || project.productName),
      consultSummary: [
        project.language ? `상세페이지 언어: ${text(project.language)}` : "",
        project.contactName ? `담당자명: ${text(project.contactName)}` : "",
        project.contactInfo ? `연락처: ${text(project.contactInfo)}` : "",
        project.email ? `이메일: ${text(project.email)}` : "",
        project.targetCustomer ? `주요 고객: ${text(project.targetCustomer)}` : "",
        project.buyerConcern ? `구매 망설임: ${text(project.buyerConcern)}` : "",
        project.primaryPurchaseReason ? `첫 구매 이유: ${text(project.primaryPurchaseReason)}` : "",
        project.messagePriority ? `메시지 우선순위:\n${text(project.messagePriority)}` : "",
        features ? `제품 특징:\n${features}` : "",
        project.evidenceBoundary ? `사용 가능한 증빙:\n${text(project.evidenceBoundary)}` : "",
        project.visualIdentity ? `제품 시각 정체성:\n${text(project.visualIdentity)}` : "",
        uploaded.length ? `고객 업로드 자료:\n${uploaded.join("\n")}` : "",
        project.additionalNotes ? `고객 추가 요청:\n${text(project.additionalNotes)}` : "",
      ].filter(Boolean).join("\n\n"),
      clientRequests: [
        project.clientRequests,
        project.deEmphasis ? `힘을 뺄 내용: ${text(project.deEmphasis)}` : "",
        project.referenceLikes ? `레퍼런스 선호: ${text(project.referenceLikes)}` : "",
        project.referenceDislikes ? `레퍼런스 비선호: ${text(project.referenceDislikes)}` : "",
        mood.length ? `전체 분위기: ${mood.join(", ")}` : "",
        structure.length ? `구성 방식: ${structure.join(", ")}` : "",
        colorTone.length ? `색감 방향: ${colorTone.join(", ")}` : "",
        imageStyle.length ? `이미지 활용: ${imageStyle.join(", ")}` : "",
      ].map(text).filter(Boolean).join("\n"),
      emphasis: text(project.emphasis || project.primaryPurchaseReason),
      banWords: [project.banWords, avoidStyle.length ? `피하고 싶은 느낌: ${avoidStyle.join(", ")}` : ""]
        .map(text).filter(Boolean).join("\n"),
      mustInclude: text(project.mustInclude || project.productName),
      references: text(project.references || project.referenceUrls),
    };
  }

  function buildContentSummary(project = {}) {
    const adminFields = buildAdminFields(project);
    const options = Array.isArray(project.options)
      ? project.options.map((option) => ({
          name: text(option?.name),
          volume: text(option?.volume),
          price: text(option?.price),
        })).filter((option) => option.name || option.volume || option.price)
      : [];
    const missingMaterials = [];
    if (!list(project.productImages).length) missingMaterials.push("제품 이미지");
    if (!list(project.brandLogo).length) missingMaterials.push("로고/스펙 자료");
    if (!list(project.referenceFiles).length && !text(project.referenceUrls)) missingMaterials.push("참고 이미지/레퍼런스");
    if (!text(project.productionTrust)) missingMaterials.push("생산·인증 근거");

    return {
      version: SUMMARY_VERSION,
      generatedAt: new Date().toISOString(),
      purpose: "고객이 작성한 원문을 보존하면서 관리자 검수와 AI 기획·시안 생성에 필요한 항목으로 1차 정리",
      source: {
        label: text(project.source) || "고객 작성폼",
        customerInputVersion: text(project.customerInputVersion) || "wizard-intake-v1",
        rawText: text(project.sourceApplicationText || project.additionalNotes),
      },
      project: {
        companyName: text(project.companyName || project.clientName),
        clientName: text(project.clientName || project.companyName),
        productName: text(project.productName),
        majorCategory: text(project.majorCategory),
        subCategory: text(project.subCategory),
        category: text(project.category || [project.majorCategory, project.subCategory].filter(Boolean).join(" / ")),
        channel: text(project.channel),
        contactName: text(project.contactName),
        contactInfo: text(project.contactInfo || project.phone),
        email: text(project.email),
        dueDate: text(project.dueDate),
      },
      core: {
        heroSentence: text(project.primaryPurchaseReason || project.heroSentence),
        oneLine: adminFields.oneLine,
        coreStrength: text(project.coreStrength),
        strengthTags: list(project.strengthTags),
        productionTrust: text(project.productionTrust),
        purchaseBenefit: text(project.purchaseBenefit),
        reviewKeywords: text(project.reviewKeywords),
        targetCustomer: text(project.targetCustomer),
      },
      intakeAnalysis: {
        buyer: {
          targetCustomer: text(project.targetCustomer),
          concern: text(project.buyerConcern),
          primaryPurchaseReason: text(project.primaryPurchaseReason),
          messagePriority: lineList(project.messagePriority),
        },
        communication: {
          emphasis: text(project.emphasis),
          deEmphasis: text(project.deEmphasis),
        },
        productTruth: {
          differentiators: text(project.coreStrength),
          allowedEvidence: text(project.evidenceBoundary),
          productionTrust: text(project.productionTrust),
          unverifiedPolicy: "자료에 없는 효능·수치·인증·후기·비교 우위는 확인 필요",
        },
        visualEvidence: {
          identity: text(project.visualIdentity),
          usagePriority: text(project.productImageUsage) || "시각 방향 분석 우선",
          shootingConstraints: text(project.shootingConstraints),
          pixelAnalysisStatus: text(project.visualAnalysisStatus) || "시각 분석 미실행",
        },
        referenceIntent: {
          urls: lineList(project.referenceUrls),
          likes: text(project.referenceLikes),
          dislikes: text(project.referenceDislikes),
        },
        variantRule: text(project.variantRule) || "확인 필요",
      },
      direction: {
        styleTone: text(project.styleTone),
        mood: list(project.mood),
        structure: list(project.structure),
        colorTone: list(project.colorTone),
        imageStyle: list(project.imageStyle),
        avoidStyle: list(project.avoidStyle),
      },
      rules: {
        mustInclude: lineList(project.mustInclude),
        banWords: lineList(project.banWords),
        references: lineList(project.references || project.referenceUrls),
      },
      sales: { options },
      materials: {
        productImages: list(project.productImages),
        brandLogo: list(project.brandLogo),
        referenceFiles: list(project.referenceFiles),
        missing: missingMaterials,
      },
      customerNotes: text(project.additionalNotes || project.sourceApplicationText),
      adminFields,
      verification: {
        status: "검수 전",
        rule: "고객이 입력한 사실과 업로드 자료만 확정 정보로 사용하며, 미기입·미제공 항목은 추정하지 않음",
      },
    };
  }

  function buildContentSummaryText(project = {}) {
    const summary = project.contentSummary?.version ? project.contentSummary : buildContentSummary(project);
    const p = summary.project;
    const core = summary.core;
    const direction = summary.direction;
    const rules = summary.rules;
    const materials = summary.materials;
    const options = summary.sales.options;
    return `${valueOrMissing(p.clientName)} 제품 내용 정리본
${valueOrMissing(p.productName)} | 상세페이지 제작 전 1차 정보 정리

[문서 목적]
고객 작성폼 원문을 임의로 보강하지 않고 관리자 검수와 AI 기획·시안 생성에 필요한 항목으로 정리한 자료입니다.

1. 프로젝트 기본 정보
- 고객사/브랜드: ${valueOrMissing(p.clientName)}
- 제품명: ${valueOrMissing(p.productName)}
- 카테고리: ${valueOrMissing(p.category)}
- 판매처: ${valueOrMissing(p.channel)}
- 담당자: ${valueOrMissing(p.contactName)}
- 연락처: ${valueOrMissing(p.contactInfo)}
- 이메일: ${valueOrMissing(p.email)}
- 납기일: ${valueOrMissing(p.dueDate)}

2. 핵심 제품 정보
- 첫 문장: ${valueOrMissing(core.heroSentence)}
- 한 줄 설명: ${valueOrMissing(core.oneLine)}
- 핵심 경쟁력: ${valueOrMissing(core.coreStrength)}
- 주요 강점: ${core.strengthTags.length ? core.strengthTags.join(", ") : "미기입"}
- 생산·인증 근거: ${valueOrMissing(core.productionTrust)}
- 구매 혜택: ${valueOrMissing(core.purchaseBenefit)}
- 리뷰 키워드: ${valueOrMissing(core.reviewKeywords)}
- 주요 고객: ${valueOrMissing(core.targetCustomer)}

3. 디자인 및 구성 방향
- 표현 유형: ${valueOrMissing(direction.styleTone)}
- 전체 분위기: ${direction.mood.length ? direction.mood.join(", ") : "미기입"}
- 구성 방식: ${direction.structure.length ? direction.structure.join(", ") : "미기입"}
- 색감 방향: ${direction.colorTone.length ? direction.colorTone.join(", ") : "미기입"}
- 이미지 활용: ${direction.imageStyle.length ? direction.imageStyle.join(", ") : "미기입"}
- 피해야 할 느낌: ${direction.avoidStyle.length ? direction.avoidStyle.join(", ") : "미기입"}

4. 판매 옵션
${options.length ? options.map((option, index) => `${index + 1}) ${[option.name, option.volume, option.price].filter(Boolean).join(" / ")}`).join("\n") : "- 미기입"}

5. 필수·금지·참고 정보
- 반드시 포함: ${rules.mustInclude.length ? rules.mustInclude.join(" / ") : "미기입"}
- 금지/주의: ${rules.banWords.length ? rules.banWords.join(" / ") : "미기입"}
- 참고 링크·자료: ${rules.references.length ? rules.references.join(" / ") : "미기입"}

6. 고객 업로드 자료
- 제품 이미지: ${materials.productImages.length ? materials.productImages.join(", ") : "자료없음"}
- 로고/스펙 자료: ${materials.brandLogo.length ? materials.brandLogo.join(", ") : "자료없음"}
- 참고 이미지/자료: ${materials.referenceFiles.length ? materials.referenceFiles.join(", ") : "자료없음"}
- 추가 확인 필요: ${materials.missing.length ? materials.missing.join(", ") : "없음"}

7. 고객 추가 요청 및 원문
${summary.customerNotes || "미기입"}

8. 관리자 검수 기준
- 고객 입력과 제공 자료에서 확인되는 사실만 확정합니다.
- 미기입 항목은 예시 문구나 AI 추정으로 채우지 않습니다.
- 효능, 인증, 수치, 후기, 비교 우위는 근거 자료 확인 전 이미지와 카피에 사용하지 않습니다.
- 검수 완료 후에만 기획 프롬프트와 이미지 시안을 생성합니다.`;
  }

  function normalizeCustomerSubmission(raw = {}) {
    const project = { ...raw };
    project.companyName = text(project.companyName || project.clientName);
    project.clientName = text(project.clientName || project.companyName);
    project.category = text(project.category || [project.majorCategory, project.subCategory].filter(Boolean).join(" / "));
    project.oneLine = text(project.oneLine || project.primaryPurchaseReason || project.coreStrength || project.productName);
    project.features = text(project.features) || [project.coreStrength, list(project.strengthTags).join(", ")]
      .map(text).filter(Boolean).join("\n");
    project.emphasis = text(project.emphasis || project.primaryPurchaseReason);
    project.mustInclude = text(project.mustInclude || project.productName);
    project.references = text(project.references || project.referenceUrls);
    project.customerCompletedFields = meaningfulCompletedFields(project);
    project.contentSummary = buildContentSummary(project);
    project.contentSummaryText = buildContentSummaryText(project);
    project.status = "신규 접수";
    project.workflow = {
      version: WORKFLOW_VERSION,
      intake: { status: "submitted", at: new Date().toISOString() },
      contentSummary: { status: "generated", version: SUMMARY_VERSION, at: new Date().toISOString() },
      adminRegistration: { status: "registered", at: new Date().toISOString() },
      managerReview: { status: "pending", at: "" },
      prompt: { status: "blocked", at: "" },
      imageDraft: { status: "blocked", at: "" },
      foldering: { status: "waiting", at: "" },
      customerProgress: {
        currentStep: 1,
        totalSteps: 9,
        stepLabel: "접수 완료",
        customerMessage: "작성해주신 내용이 정상적으로 접수되었습니다. 담당자가 곧 확인합니다.",
        updatedAt: new Date().toISOString(),
      },
    };
    return project;
  }

  window.haoWorkflow = Object.freeze({
    SUMMARY_VERSION,
    WORKFLOW_VERSION,
    buildAdminFields,
    buildContentSummary,
    buildContentSummaryText,
    normalizeCustomerSubmission,
  });
})();
