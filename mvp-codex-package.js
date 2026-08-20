(function () {
  "use strict";

  const SCHEMA_VERSION = "hao-codex-job-v1";
  const RESULT_SCHEMA_VERSION = "hao-codex-result-v1";
  const encoder = new TextEncoder();

  const REQUIRED_FIELDS = Object.freeze([
    ["clientName", "고객사명"],
    ["productName", "제품명"],
    ["category", "카테고리"],
    ["oneLine", "한 줄 설명"],
    ["consultSummary", "핵심 제품 정보"],
    ["clientRequests", "고객 요청사항"],
    ["mustInclude", "반드시 포함할 문구"],
    ["banWords", "금지 표현"],
    ["references", "근거·참고자료"],
  ]);

  function elementValue(id) {
    const node = document.getElementById(id);
    if (!node) return "";
    if ("value" in node) return String(node.value || "").trim();
    return String(node.textContent || "").trim();
  }

  function meaningful(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return false;
    return !/^(예\s*[:：]|미기입|입력\s*안함|선택하세요|없음\s*$)/i.test(normalized);
  }

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        if (!["generatedAt", "updatedAt", "createdAt"].includes(key)) result[key] = canonicalize(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  async function sha256(value) {
    const bytes = value instanceof Uint8Array ? value : encoder.encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function json(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  }

  function safeName(value) {
    return String(value || "프로젝트")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 80);
  }

  function activeProject() {
    try {
      return JSON.parse(localStorage.getItem("customerProjectInput") || "{}");
    } catch {
      return {};
    }
  }

  function fieldMetadata(project) {
    const sourceFields = new Set(project.customerTouchedFields || project.customerCompletedFields || []);
    const fieldMap = {
      clientName: elementValue("clientName") || project.clientName || project.companyName,
      productName: elementValue("productName") || project.productName,
      category: elementValue("category") || project.category,
      channel: elementValue("channel") || project.channel,
      targetCustomer: project.targetCustomer || "",
      oneLine: elementValue("oneLine") || project.oneLine || project.heroSentence,
      coreProductInfo: elementValue("consultSummary") || project.features || project.coreStrength,
      clientRequests: elementValue("clientRequests") || project.clientRequests,
      emphasis: elementValue("emphasis") || project.emphasis,
      mustInclude: elementValue("mustInclude") || project.mustInclude,
      banWords: elementValue("banWords") || project.banWords,
      references: elementValue("references") || project.references || project.referenceUrls,
      options: project.options || [],
      additionalNotes: project.additionalNotes || "",
    };
    return Object.fromEntries(Object.entries(fieldMap).map(([key, value]) => {
      const isWritten = Array.isArray(value) ? value.length > 0 : meaningful(value);
      return [key, {
        value,
        status: isWritten ? "작성됨" : "미기입",
        source: sourceFields.has(key) ? "고객 직접 입력" : "관리자 정규화본",
        touched: sourceFields.has(key),
        verified: true,
        verifiedBy: "관리자 검수 승인",
        verifiedAt: project.workflow?.managerReview?.at || "",
        version: project.sourceImportVersion || project.customerInputVersion || "1",
      }];
    }));
  }

  function assetManifest(project) {
    const groups = [
      ["productImages", "제품 이미지"],
      ["brandLogo", "로고·스펙 자료"],
      ["referenceFiles", "참고 이미지·문서"],
      ["videos", "영상"],
      ["certificates", "인증·근거자료"],
    ];
    return groups.map(([key, label]) => {
      const browserRecords = typeof currentCustomerAssetRecords !== "undefined" && Array.isArray(currentCustomerAssetRecords)
        ? currentCustomerAssetRecords.filter((item) => item.group === key).map((item) => item.name)
        : [];
      const names = Array.from(new Set([
        ...(project.assetFolderFiles?.[key] || []),
        ...(Array.isArray(project[key]) ? project[key] : []),
        ...browserRecords,
      ].filter(Boolean)));
      return {
        group: key,
        label,
        status: names.length ? "자료있음" : "자료없음",
        files: names,
        localPath: project.assetFolderPaths?.[key] || "",
        webPaths: project.assetWebPaths?.[key] || {},
        transferRule: "원본은 ZIP에 복제하지 않으며 권한이 있는 경로 또는 안전한 다운로드 절차로 연결",
      };
    });
  }

  function referenceManifest(project) {
    const drive = project.driveReferenceSet || {};
    return {
      projectReferences: String(elementValue("references") || project.references || project.referenceUrls || "")
        .split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
      googleDrive: {
        status: drive.status || window.HAO_CONFIG?.googleDriveConnectionStatus || "not_connected",
        rootFolderUrl: drive.rootFolderUrl || window.HAO_CONFIG?.googleDriveReferenceRootUrl || "",
        planningFolderUrl: drive.planningFolderUrl || window.HAO_CONFIG?.googleDrivePlanningFolderUrl || "",
        productionFolderUrl: drive.productionFolderUrl || window.HAO_CONFIG?.googleDriveProductionFolderUrl || "",
        selectedReferences: drive.selectedReferences || [],
        planningReferenceCount: Number(drive.planningReferenceCount || window.HAO_CONFIG?.googleDrivePlanningReferenceCount || 0),
        productionProjectCount: Number(drive.productionProjectCount || window.HAO_CONFIG?.googleDriveProductionProjectCount || 0),
        accessBoundary: "공개 웹앱은 Drive 링크만 열며 실제 목록·원본 열람은 권한 있는 Google 계정 또는 Codex Drive 커넥터에서 수행",
        useBoundary: "승인된 프레임의 구조·정보 위계·사진 리듬만 분석하며 고유 카피·로고·제품 사진·그래픽은 복제 금지",
      },
      internalLibrary: {
        index: "Google Drive 2026(기획안) + 2026 실제 제작물",
        useBoundary: "내부·외부 출처와 공개 가능 여부를 확인한 항목만 사용",
      },
      externalResearch: {
        allowed: true,
        rule: "네이버 스마트스토어·쿠팡·컬리·자사몰의 최근 실제 판매 페이지를 검색하고 URL·확인일·구조적 특징을 기록",
      },
    };
  }

  function shotList(project) {
    const productName = project.productName || "제품";
    const rows = [
      ["S01", "히어로", "첫 화면 제품 인지", `${productName} 정면 또는 대표 형태`, "정면 15도, 중망원 느낌", "브랜드 무드 배경, 최소 소품", "좌상단→우하단 부드러운 키라이트", "세로 4:5", "좌측 40% 카피 여백", "필수", "최우선"],
      ["S02", "패키지", "외형과 구성 확인", "정면·측면·후면 패키지", "눈높이 정면", "무채색 배경", "균일한 소프트박스", "가로 3:2", "상단 20%", "필수", "최우선"],
      ["S03", "스케일", "실제 크기 판단", "제품과 손 또는 일상 기준물", "45도 탑뷰", "생활 공간", "자연광", "세로 4:5", "우측 35%", "선택", "높음"],
      ["S04", "원료·소재", "핵심 재료 신뢰", "검수된 원료만", "근접 매크로", "절제된 원료 연출", "측면광", "가로 3:2", "하단 25%", "선택", "높음"],
      ["S05", "사용 장면", "실제 사용 맥락", "제품과 타깃 사용 상황", "생활 다큐 시점", "고객 타깃 환경", "자연광+필", "세로 4:5", "상단 30%", "선택", "높음"],
      ["S06", "디테일", "재질·내용물 확인", "라벨·마감·내용물", "매크로", "단색 배경", "림라이트", "정사각", "좌측 30%", "선택", "중간"],
      ["S07", "구성품", "옵션과 수량 판단", "고객이 확정한 구성만", "탑뷰", "정돈된 플랫레이", "균일광", "가로 4:3", "상단 20%", "필수", "높음"],
      ["S08", "근거", "인증·수치 설명 보조", "증빙과 제품", "정면", "정보 조판용 배경", "평면광", "가로 3:2", "중앙 55% 텍스트 영역", "선택", "중간"],
      ["S09", "제품 정보", "법정·정확 정보 조판", "정확한 제품 정면", "왜곡 없는 정면", "흰색 또는 중립 배경", "균일광", "세로 4:5", "우측 55% 정보 영역", "필수", "최우선"],
    ];
    const headers = ["cutId", "section", "purpose", "subject", "angle", "backgroundProps", "lighting", "ratio", "copySafeArea", "cutout", "priority"];
    return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  }

  function planningBrief(project, facts, references) {
    const direction = elementValue("templateA") || "최적 단일 구매 설득 방향";
    const reason = elementValue("templateAReason") || "고객 요청과 제품 사실, 판매 채널, 보유 자료를 교차 분석한 단일 방향";
    return `# ${project.productName || "프로젝트"} 상세페이지 제작 전 기획안\n\n`
      + `- 프로젝트 ID: ${project.id}\n- 고객사: ${project.clientName || project.companyName || "미기입"}\n- 카테고리: ${project.category || "미기입"}\n- 판매 채널: ${project.channel || "미기입"}\n\n`
      + `## 최적 단일 방향\n\n**${direction}**\n\n${reason}\n\n`
      + `선정 기준은 고객 요청, 타깃 구매 고민, 제품 정보, 보유 사진, 촬영 필요도, 규제 위험, 모바일 가독성이다. 여러 시안을 형식적으로 나열하지 않는다.\n\n`
      + `## 고객 사실 요약\n\n- 한 줄 설명: ${facts.oneLine?.value || "미기입"}\n- 핵심 제품 정보: ${facts.coreProductInfo?.value || "미기입"}\n- 고객 요청: ${facts.clientRequests?.value || "미기입"}\n- 반드시 포함: ${facts.mustInclude?.value || "미기입"}\n- 금지 표현: ${facts.banWords?.value || "미기입"}\n\n`
      + `## 권장 흐름\n\n1. 제품 인지와 한 줄 구매 이유\n2. 고객이 제공한 핵심 장점\n3. 원료·제조·근거 정보\n4. 실제 사용 또는 섭취 장면\n5. 구성·옵션·정확 정보\n6. 구매 판단을 돕는 차분한 클로징\n\n`
      + `## 레퍼런스 사용 원칙\n\n${references.googleDrive.useBoundary}\n\n`
      + `## 목표 분량\n\n${String(project.clientName || project.companyName || "").includes("생즙연구소") || String(project.clientName || project.companyName || "").includes("서울우유") ? "전체 세로 17,000~20,000px. 생성 미리보기는 축소본으로 사용하고 섹션별 원본을 조립한다." : "기본 10,000px. 추가 분량은 콘텐츠 필요에 따라 5,000px 단위로 확장한다."}\n\n`
      + `## 제작 원칙\n\n확인되지 않은 효능·옵션·인증·리뷰는 생성하지 않는다. 작은 한글, 표, 영양정보, 법정 고지는 이미지에 굽지 않고 디자이너 조판 안전 영역으로 남긴다.\n`;
  }

  function imageTasks(project, prompt) {
    const segments = [
      ["01_opening", "상단 설득", "제품 인지·한 줄 가치·즉시 판단 근거"],
      ["02_story", "중단 근거", "원료·제품 차이·사용 장면"],
      ["03_decision", "하단 판단", "구성·정보 안전 영역·클로징"],
    ];
    return `# ${project.productName || "프로젝트"} 이미지 작업\n\n`
      + `각 섹션은 방향성 시안과 촬영 레퍼런스를 구분해 생성한다. 실패 시 해당 taskId만 재실행한다.\n\n`
      + segments.map(([id, label, goal]) => `## ${id} · ${label}\n\n- 목적: ${goal}\n- 출력: outputs/${id}.png\n- 상태 기록: result-manifest.json\n- 제품 원본이 없으면 확정 패키지처럼 만들지 말고 촬영 가이드임을 표시\n- 정확한 텍스트 조판을 위한 안전 영역 확보\n\n${prompt}\n`).join("\n");
  }

  function finalPageSpec(project) {
    return `# 최종 상세페이지 규격\n\n- 프로젝트: ${project.productName || "미기입"}\n- 기본 길이: 10,000px\n- 추가 단위: 5,000px\n- 기획+디자인 기본가: 600,000원 / 추가 150,000원\n- 디자인 기본가: 400,000원 / 추가 100,000원\n- PSD 원본 제공: 100,000원 추가\n- 동일 디자인 바리에이션: 신규 제작비의 50% 할인\n\n위 가격은 내부 범위 계산용이며 고객용 이미지에 렌더링하지 않는다. 정확 정보는 편집 가능한 텍스트 레이어로 조판하고, 시안 승인·실촬영물 교체·디자이너 검수·내부 QA·고객 컨펌 전에는 최종 납품으로 표시하지 않는다.\n`;
  }

  function masterInstruction(project, job) {
    return `# Codex 실행 지시\n\n이 폴더는 ${project.productName || "프로젝트"}의 승인된 작업 패키지입니다.\n\n## 실행 원칙\n\n1. job.json과 package-manifest.json의 승인 해시·파일 해시를 먼저 검증합니다.\n2. customer_facts.json의 verified=true 사실만 확정 정보로 사용합니다.\n3. missing_and_unverified.json의 항목은 추정하지 않습니다.\n4. references.json의 출처·사용 범위를 지키며 고유 디자인을 복제하지 않습니다.\n5. planning_brief.md와 shot_list.csv를 기준으로 섹션별 이미지와 촬영 레퍼런스를 구분해 생성합니다.\n6. 작은 한글·표·법정 고지는 이미지에 굽지 않고 조판 안전 영역으로 남깁니다.\n7. 실패한 task만 다시 실행할 수 있도록 taskId별 결과를 저장합니다.\n8. outputs/에 PNG·전체 미리보기·프롬프트·QA 보고서·README를 저장합니다.\n9. result-manifest.template.json을 복사해 result-manifest.json을 작성합니다.\n10. 관리자툴에서 검증할 수 있도록 jobId=${job.jobId}, projectId=${job.projectId}, approvalHash=${job.approvalHash}를 변경하지 않습니다.\n\n이 작업은 OpenAI API 키를 사용하지 않습니다. 현재 Codex 작업 안에서 파일 분석, 필요한 웹 검색, 이미지 생성, 결과 저장을 수행합니다.\n`;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    };
  }

  function concat(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach((part) => { output.set(part, offset); offset += part.length; });
    return output;
  }

  function zipStore(fileMap) {
    const locals = [];
    const centrals = [];
    let localOffset = 0;
    const stamp = dosDateTime();
    Object.entries(fileMap).forEach(([name, content]) => {
      const nameBytes = encoder.encode(name);
      const data = content instanceof Uint8Array ? content : encoder.encode(String(content));
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(local.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, stamp.time, true);
      localView.setUint16(12, stamp.date, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, nameBytes.length, true);
      local.set(nameBytes, 30);
      locals.push(local, data);

      const central = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, stamp.time, true);
      centralView.setUint16(14, stamp.date, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint32(42, localOffset, true);
      central.set(nameBytes, 46);
      centrals.push(central);
      localOffset += local.length + data.length;
    });
    const centralBlock = concat(centrals);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, centrals.length, true);
    endView.setUint16(10, centrals.length, true);
    endView.setUint32(12, centralBlock.length, true);
    endView.setUint32(16, localOffset, true);
    return concat([...locals, centralBlock, end]);
  }

  function download(bytes, fileName, type = "application/zip") {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function preparePackage(options = {}) {
    const project = activeProject();
    if (!project.id) throw new Error("고객 프로젝트를 먼저 불러오세요.");
    if (project.workflow?.managerReview?.status !== "approved") throw new Error("관리자 내용 검수 승인 후에만 작업 패키지를 만들 수 있습니다.");

    const facts = fieldMetadata(project);
    const missing = Object.entries(facts).filter(([, meta]) => meta.status !== "작성됨").map(([key, meta]) => ({ key, ...meta }));
    const requiredMissing = REQUIRED_FIELDS.filter(([id]) => !meaningful(elementValue(id))).map(([id, label]) => ({ id, label }));
    if (requiredMissing.length) throw new Error(`필수 검수 항목을 보완하세요: ${requiredMissing.map((item) => item.label).join(", ")}`);

    const references = referenceManifest(project);
    const assets = assetManifest(project);
    const operatorProfile = window.HAO_OPERATOR_PROFILE || {};
    const approvedSnapshot = canonicalize({ projectId: project.id, facts, references, assets });
    const approvalHash = await sha256(json(approvedSnapshot));
    const jobId = `${safeName(project.id)}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const prompt = options.prompt || elementValue("imageDraftBrief") || "";
    const job = {
      schemaVersion: SCHEMA_VERSION,
      jobId,
      projectId: project.id,
      projectName: project.productName,
      approvalHash,
      approvedAt: project.workflow.managerReview.at,
      executionMode: "codex-manual",
      apiKeyRequired: false,
      operatorContext: {
        operatorName: operatorProfile.operatorName || "",
        projectAlias: operatorProfile.projectAlias || "",
        customerCta: {
          text: operatorProfile.ctaText || "",
          link: operatorProfile.ctaLink || "",
        },
      },
      selectedDirection: {
        name: elementValue("templateA"),
        reason: elementValue("templateAReason"),
      },
      tasks: [
        { id: "01_reference_analysis", type: "research", output: "outputs/reference-analysis.md" },
        { id: "02_planning_qa", type: "planning", output: "outputs/planning-qa.md" },
        { id: "03_opening_image", type: "image", output: "outputs/01_opening.png" },
        { id: "04_story_image", type: "image", output: "outputs/02_story.png" },
        { id: "05_decision_image", type: "image", output: "outputs/03_decision.png" },
        { id: "06_full_preview", type: "compose", output: "outputs/full-preview.png" },
        { id: "07_quality_report", type: "qa", output: "outputs/qa-report.md" },
      ],
    };

    const resultTemplate = {
      schemaVersion: RESULT_SCHEMA_VERSION,
      jobId,
      projectId: project.id,
      approvalHash,
      status: "pending",
      startedAt: "",
      completedAt: "",
      outputs: job.tasks.map((task) => ({ taskId: task.id, status: "pending", files: [], promptFile: "", qaStatus: "pending", error: "" })),
      qa: { status: "pending", warnings: [], factsChanged: false },
      failures: [],
      notes: "",
    };

    const files = {
      "job.json": json(job),
      "customer_facts.json": json({ schemaVersion: "hao-customer-facts-v1", projectId: project.id, approvalHash, fields: facts }),
      "missing_and_unverified.json": json({ projectId: project.id, missing, unverified: [], conflicts: project.contentSummary?.conflicts || [] }),
      "references.json": json(references),
      "asset_manifest.json": json({ projectId: project.id, assets }),
      "planning_brief.md": planningBrief(project, facts, references),
      "shot_list.csv": shotList(project),
      "image_tasks.md": imageTasks(project, prompt),
      "final_page_spec.md": finalPageSpec(project),
      "result-manifest.template.json": json(resultTemplate),
      "tasks/01_reference_analysis.json": json(job.tasks[0]),
      "tasks/02_planning_qa.json": json(job.tasks[1]),
      "tasks/03_opening_image.json": json(job.tasks[2]),
      "tasks/04_story_image.json": json(job.tasks[3]),
      "tasks/05_decision_image.json": json(job.tasks[4]),
      "tasks/06_full_preview.json": json(job.tasks[5]),
      "tasks/07_quality_report.json": json(job.tasks[6]),
    };
    files["RUN_WITH_CODEX.md"] = masterInstruction(project, job);

    const checksums = {};
    for (const [name, content] of Object.entries(files)) checksums[name] = await sha256(content);
    const packageManifest = {
      schemaVersion: "hao-package-manifest-v1",
      jobId,
      projectId: project.id,
      approvalHash,
      fileCount: Object.keys(files).length + 2,
      checksums,
    };
    files["package-manifest.json"] = json(packageManifest);
    files["checksums.sha256"] = `${Object.entries(checksums).map(([name, hash]) => `${hash}  ${name}`).join("\n")}\n`;

    const zipBytes = zipStore(files);
    download(zipBytes, `${safeName(project.clientName || project.companyName)}_${safeName(project.productName)}_Codex_작업패키지_${jobId.slice(-14)}.zip`);
    localStorage.setItem(`haoCodexJob:${project.id}`, json({ ...job, packageSize: zipBytes.length, packageFiles: Object.keys(files) }));
    if (typeof saveImageDraftState === "function") saveImageDraftState({ status: "package-ready", jobId, approvalHash });
    if (typeof setImageGenerationNotice === "function") setImageGenerationNotice("success", "Codex 작업 패키지 생성 완료", "ZIP의 RUN_WITH_CODEX.md를 Codex에서 실행한 뒤 result-manifest.json을 불러오세요.");
    if (typeof updateAiStatus === "function") updateAiStatus(`작업 패키지 준비 완료 · ${jobId} · ${Object.keys(files).length}개 파일`);
    return { job, files, zipBytes };
  }

  function validResultPath(path) {
    const value = String(path || "").replace(/\\/g, "/");
    return Boolean(value) && !value.startsWith("/") && !value.includes("../") && !/^[A-Za-z]:/.test(value);
  }

  function renderResult(manifest) {
    const target = document.getElementById("aiQualityReview");
    if (!target) return;
    const outputs = Array.isArray(manifest.outputs) ? manifest.outputs : [];
    const completed = outputs.filter((item) => item.status === "completed").length;
    const failed = outputs.filter((item) => item.status === "failed").length;
    const warnings = manifest.qa?.warnings || [];
    target.innerHTML = `<strong>Codex 결과 ${escapeHtml(String(manifest.status || "unknown"))}</strong><br>`
      + `완료 ${completed}/${outputs.length} · 실패 ${failed} · QA ${escapeHtml(String(manifest.qa?.status || "미기재"))}`
      + (warnings.length ? `<br>확인: ${warnings.map((item) => escapeHtml(String(item))).join(" / ")}` : "");
  }

  async function importResultManifest(file) {
    if (!file) return;
    let manifest;
    try {
      manifest = JSON.parse(await file.text());
    } catch {
      throw new Error("올바른 JSON 결과 manifest가 아닙니다.");
    }
    const project = activeProject();
    let latestJob = {};
    try { latestJob = JSON.parse(localStorage.getItem(`haoCodexJob:${project.id}`) || "{}"); } catch { latestJob = {}; }
    if (manifest.schemaVersion !== RESULT_SCHEMA_VERSION) throw new Error("지원하지 않는 결과 manifest 버전입니다.");
    if (!latestJob.jobId) throw new Error("이 브라우저에서 먼저 Codex 작업 패키지를 생성하세요.");
    if (manifest.projectId !== project.id || manifest.jobId !== latestJob.jobId || manifest.approvalHash !== latestJob.approvalHash) {
      throw new Error("프로젝트·작업 ID·승인 해시가 현재 패키지와 일치하지 않습니다.");
    }
    const invalidPath = (manifest.outputs || []).flatMap((item) => item.files || []).find((item) => !validResultPath(item.path));
    if (invalidPath) throw new Error("결과 manifest에 허용되지 않는 파일 경로가 있습니다.");
    localStorage.setItem(`haoCodexResult:${project.id}`, json(manifest));
    renderResult(manifest);
    if (typeof saveImageDraftState === "function") saveImageDraftState({ status: manifest.status === "completed" ? "draft" : "result-imported", jobId: manifest.jobId });
    if (typeof setImageGenerationNotice === "function") setImageGenerationNotice("success", "Codex 결과 불러오기 완료", "결과 파일 상태와 QA 보고서를 검증했습니다. 실제 파일은 작업 폴더의 outputs에서 확인하세요.");
    if (typeof updateAiStatus === "function") updateAiStatus(`결과 manifest 연결 완료 · ${manifest.jobId}`);
    return manifest;
  }

  function bind() {
    const button = document.getElementById("importResultManifest");
    const input = document.getElementById("resultManifestInput");
    button?.addEventListener("click", () => input?.click());
    input?.addEventListener("change", async () => {
      try {
        await importResultManifest(input.files?.[0]);
      } catch (error) {
        if (typeof setImageGenerationNotice === "function") setImageGenerationNotice("error", "결과 불러오기 실패", error.message);
        if (typeof updateAiStatus === "function") updateAiStatus(error.message);
      } finally {
        input.value = "";
      }
    });
    const project = activeProject();
    if (project.id) {
      try {
        const manifest = JSON.parse(localStorage.getItem(`haoCodexResult:${project.id}`) || "null");
        if (manifest) renderResult(manifest);
      } catch {
        // 손상된 로컬 결과는 새 manifest를 불러오면 교체됩니다.
      }
    }
  }

  window.haoCodexMvp = Object.freeze({ preparePackage, importResultManifest, sha256, zipStore });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
}());
