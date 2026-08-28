const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const LEADS_KEY = "detailAiLeads";
const PROJECTS_KEY = "detailAiProjects";
const AI_SETTINGS_KEY = "detailAiSettings";
const AI_WORKFLOW_KEY = "detailAiWorkflowRuns";
const CUSTOMER_PROJECT_KEY = "customerProjectInput";
const CUSTOMER_PROJECT_LIST_KEY = "customerProjectList";
let manualTemplateChanged = false;
let activeSectionDraft = "A";
let activeSectionIndex = 0;
let sectionEdits = { A: [], B: [] };
let sectionOrders = { A: [], B: [] };
let currentDesignWorkflow = null;
let pendingDeleteProjectId = "";
let currentCustomerProjectPage = 1;
const CUSTOMER_PROJECTS_PER_PAGE = 10;
let currentCustomerAssetRecords = [];
let customerAssetObjectUrls = [];
let currentCustomerAssetProject = null;
let currentImageDraftObjectUrl = "";
let currentImageGenerationController = null;
let productionRootDirectoryHandle = null;
let currentGeneratedImageDraftFile = null;
const IMAGE_DRAFT_GROUP = "adminImageDraft";
const IMAGE_DRAFT_MODEL = "gpt-image-2";
const IMAGE_DRAFT_SIZE = "1024x1536";
const IMAGE_DRAFT_QUALITY = "high";
const DESIGN_REFERENCE_POLICY = Object.freeze({
  googleDriveRootUrl: window.HAO_CONFIG?.googleDriveReferenceRootUrl || "",
  googleDrivePlanningUrl: window.HAO_CONFIG?.googleDrivePlanningFolderUrl || "",
  googleDriveProductionUrl: window.HAO_CONFIG?.googleDriveProductionFolderUrl || "",
  googleDriveStatus: window.HAO_CONFIG?.googleDriveConnectionStatus || "not_connected",
  planningReferenceCount: Number(window.HAO_CONFIG?.googleDrivePlanningReferenceCount || 0),
  productionProjectCount: Number(window.HAO_CONFIG?.googleDriveProductionProjectCount || 0),
  sharedArchiveLabel: "Google Drive 기획안·실제 제작물 통합 레퍼런스",
  sharedArchiveUrl: window.HAO_CONFIG?.googleDriveReferenceRootUrl || "",
  sharedArchiveStatus: "Drive 권한이 있는 계정에서 열람 가능",
  priority: Object.freeze([
    "고객이 작성한 사실 정보와 고객 업로드 제품 원본",
    "Google Drive 2026(기획안)에서 승인·분류된 제작 전 시안",
    "Google Drive 2026 실제 제작물에서 승인·선별한 섹션 레퍼런스",
    "쿠팡·컬리·스마트스토어의 판매 흐름 분석",
  ]),
});
const PROJECT_PLANNING_PREVIEWS = Object.freeze([
  Object.freeze({
    id: "saengjeup-planning-v1",
    clientToken: "생즙연구소",
    title: "생즙연구소 과일주스 상세페이지 제작 전 기획안 v1",
    imageUrl: "assets/planning/saengjeup-planning-v1.png",
    viewerUrl: "planning/saengjeup-v1.html",
    dimensions: "3,000 × 18,000px",
    targetLength: "최종 상세페이지 17,000~20,000px",
    structure: "왼쪽 촬영 지시 · 중앙 롱페이지 와이어 · 오른쪽 구성 레퍼런스",
    referenceBasis: "Google Drive 2026(기획안) 28개 · 실제 제작 프로젝트 22개 분석",
  }),
  Object.freeze({
    id: "test-connection-planning-v1",
    clientToken: "TEST",
    title: "TEST 이미지 업로드 연결검증 제품 · 1차 촬영 및 디자인 시안 v1",
    imageUrl: "assets/planning/saengjeup-planning-v1.png",
    viewerUrl: "planning/test-connection-v1.html",
    dimensions: "3,000 × 18,000px",
    targetLength: "1차 시안 · 실제 제작 17,000~20,000px 기준",
    structure: "촬영 지시 · 섹션별 와이어 · 참고 구도 · 조판 안전 영역",
    referenceBasis: "Google Drive 2026(기획안) 28개 구조 분석 · 고객 업로드 패키지 도면 연결",
  }),
]);
const AI_DETAIL_PRODUCTION_POLICY = Object.freeze({
  guideFile: "AI_TOOL_GUIDELINES.md",
  sourceOrder: ["고객 원문", "1차 내용정리본", "관리자 검수 수정", "승인된 참고자료"],
  hardRules: [
    "미기입 항목과 근거 없는 효능·인증·수치·후기·비교우위를 추정하지 않는다.",
    "관리자 검수 승인 전에는 프롬프트와 이미지 시안을 생성하지 않는다.",
    "생성 이미지는 방향성 시안이며 정확한 문구·표·법정 고지는 디자이너 조판 영역으로 남긴다.",
    "내용정리본, 사용 프롬프트, 고객 자료, 생성 이미지를 업체별 표준 폴더에 함께 보존한다.",
  ],
});
const IMAGE_DRAFT_SEGMENTS = Object.freeze([
  Object.freeze({
    id: "opening",
    label: "상단 설득",
    progress: "제품 인지와 첫 구매 이유",
    prompt: `이번에는 전체 상세페이지를 한 장에 압축하지 말고 상단 구간만 생성합니다.
- 첫 화면에서 제품명·실물·한 줄 가치가 즉시 보이는 히어로
- 고객이 제공하고 관리자가 검수한 제품 형태·용량·수량·패키지 구성만 사용한 3개 핵심 근거 영역
- 다음 원료 이야기로 자연스럽게 이어지는 하단 전환
- 제품은 모바일 축소 화면에서도 식별될 만큼 크게 표현
- 고객 자료에 없는 구성품·옵션·문구·로고·수치를 임의로 추가하지 않음
- 장면을 반복 배치한 무드 콜라주가 아니라 명확한 판매 설득 흐름으로 구성`,
  }),
  Object.freeze({
    id: "story",
    label: "중단 근거",
    progress: "원료·제품 차이와 사용 장면",
    prompt: `이번에는 전체 상세페이지를 한 장에 압축하지 말고 중단 구간만 생성합니다.
- 고객 자료에 있는 원료와 브랜드 이야기를 먼저 보여주는 에디토리얼 장면
- 실제 제품의 외형·개봉·내용물·질감처럼 검수된 차이를 설명할 수 있는 매크로 장면
- 고객이 명시한 사용·섭취·착용·설치 상황 중 해당 제품에 맞는 실제 생활 장면으로 연결
- 설명 문구를 나중에 조판할 넓고 정돈된 안전 영역 확보
- 인증, 효능, 임의 수치, 후기처럼 고객 자료에 없는 근거는 만들지 않음`,
  }),
  Object.freeze({
    id: "decision",
    label: "하단 판단",
    progress: "구성·선물 가치와 정보 확인",
    prompt: `이번에는 전체 상세페이지를 한 장에 압축하지 말고 하단 구간만 생성합니다.
- 고객이 제공한 실제 패키지와 옵션 구성이 한눈에 보이는 개봉·구성 장면
- 검수된 패키지와 구성품만 활용한 마감 품질·보관·사용 편의 장면
- 제품 정보, 주의사항, 법정 고지를 디자이너가 넣을 수 있는 표·텍스트 안전 영역
- 마지막에 제품을 다시 기억시키는 차분한 클로징 히어로
- 확인되지 않은 구성 수량, 인증 마크, 사은품, 선물 포장, 가격 혜택을 임의로 만들지 않음
- 가격, 할인, 구매 버튼 등 판매 채널 UI는 상세페이지 이미지 안에 만들지 않음`,
  }),
]);
const DETAIL_PAGE_PRODUCTION_STANDARD = Object.freeze({
  defaultService: "planningDesign",
  planningDesign: Object.freeze({
    label: "기획 + 디자인",
    baseHeightPx: 10000,
    basePrice: 600000,
    additionalUnitPx: 5000,
    additionalUnitPrice: 150000,
  }),
  designOnly: Object.freeze({
    label: "디자인",
    baseHeightPx: 10000,
    basePrice: 400000,
    additionalUnitPx: 5000,
    additionalUnitPrice: 100000,
  }),
  psdSourceFee: 100000,
  variationDiscountRate: 0.5,
  longFormProjectRules: Object.freeze({
    "생즙연구소": Object.freeze({ minHeightPx: 17000, maxHeightPx: 20000 }),
    "서울우유": Object.freeze({ minHeightPx: 17000, maxHeightPx: 20000 }),
  }),
});
const SECTION_VARIANT_LABELS = {
  auto: "자동 디자인",
  "premium-card": "프리미엄 카드형",
  "graphic-badge": "그래픽 배지형",
  editorial: "브랜드 에디토리얼형",
  "photo-focus": "제품 사진 강조형",
};
const SECTION_VARIANT_BADGES = {
  auto: "Auto Design",
  "premium-card": "Premium Card",
  "graphic-badge": "Graphic Commerce",
  editorial: "Editorial Story",
  "photo-focus": "Photo Focus",
};
const AI_SERVICE_ROLES = {
  planning: {
    label: "AI 기획 생성",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "제품 분석, 타깃 분석, 상세페이지 섹션 구성, 카피 방향 생성",
  },
  draftSummary: {
    label: "최적 단일 시안 요약",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "최적 단일 상세페이지 방향의 고객용 요약 생성",
  },
  designWorkflow: {
    label: "AI 디자인 워크플로우",
    defaultProvider: "local-design",
    preferredModel: "orchestrator",
    purpose: "상품 분석, 디자인 결정, A/B 전략, 이미지 생성 프롬프트, 품질 기준을 하나의 프로젝트 산출물로 연결",
  },
  imageDesign: {
    label: "이미지/디자인 시안 생성",
    defaultProvider: "rules",
    preferredModel: "image-ai",
    purpose: "제품 이미지 역할 분리, 상세페이지 디자인 블록, 이미지 합성/촬영 방향 생성",
  },
  qualityReview: {
    label: "디자인 품질 검수",
    defaultProvider: "rules",
    preferredModel: "claude",
    purpose: "누락 요소, 표현 리스크, 정보 위계, 디자인 완성도 검토",
  },
  clientMail: {
    label: "고객 발송 메일",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "최적 단일 시안 전달 메일 생성",
  },
  revision: {
    label: "고객 피드백 반영",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "고객 회신 기반 수정 시안과 컨펌 방향 생성",
  },
  psdHandoff: {
    label: "PSD 작업 지시",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "미얀마 디자이너용 바이버 전달 패키지 생성",
  },
  finalMail: {
    label: "최종 납품 메일",
    defaultProvider: "rules",
    preferredModel: "codex-package",
    purpose: "PNG/JPG, 분할페이지, PSD 원본 추가금 안내 메일 생성",
  },
};
const AI_PROVIDERS = {
  codex: {
    label: "Codex 작업 패키지",
    status: "manual",
    run: runRulesProvider,
  },
  claude: {
    label: "Claude",
    status: "planned",
    run: runUnavailableProvider,
  },
  "image-ai": {
    label: "Image Generation AI",
    status: "planned",
    run: runUnavailableProvider,
  },
  "local-design": {
    label: "Local Detail Design Engine",
    status: "active",
    run: runLocalDesignProvider,
  },
  rules: {
    label: "Local Rules",
    status: "active",
    run: runRulesProvider,
  },
};
const AI_ROLE_PROVIDER_MAP = {
  planning: "rules",
  draftSummary: "rules",
  designWorkflow: "local-design",
  imageDesign: "local-design",
  qualityReview: "claude",
  clientMail: "rules",
  revision: "rules",
  psdHandoff: "rules",
  finalMail: "rules",
};
const DETAIL_DESIGN_QUALITY_GATES = [
  {
    label: "긴 세로형 상세 구조",
    signal: "긴 세로형 상세페이지 구조 적용",
    check: (html) => html.includes("sales-detail-page") && (html.match(/sales-.*-section/g)?.length || 0) >= 7,
  },
  {
    label: "히어로 제품 연출",
    signal: "히어로 첫 화면에 제품 판단 카드/제품 쇼케이스 적용",
    check: (html) => html.includes("sales-hero-product-rail") && html.includes("sales-hero-editorial-board"),
  },
  {
    label: "히어로 광고 스테이지",
    signal: "히어로 제품 광고 스테이지/입체 합성 레이어 적용",
    check: (html) => html.includes("sales-hero-ad-stage") && html.includes("sales-hero-ad-caption"),
  },
  {
    label: "첫 화면 시그니처 디자인",
    signal: "브랜드 시그니처 라벨/스팟라이트/첫 화면 디자인 장치 적용",
    check: (html) => html.includes("sales-hero-backdrop-label") && html.includes("sales-hero-signature-strip") && html.includes("sales-hero-spotlight-notes"),
  },
  {
    label: "광고형 첫 화면 메시지",
    signal: "첫 화면에 쇼핑몰 광고형 메시지 스택 적용",
    check: (html) => html.includes("sales-ad-claim-stack"),
  },
  {
    label: "고밀도 광고형 상세 패널",
    signal: "제품 이미지와 구매 포인트를 묶은 고밀도 광고형 패널 적용",
    check: (html) => html.includes("sales-advertorial-spread") && html.includes("sales-advertorial-proof"),
  },
  {
    label: "상세 흐름 인덱스",
    signal: "첫 화면 이후 구매/브랜드 흐름 인덱스 적용",
    check: (html) => html.includes("sales-shop-index-strip"),
  },
  {
    label: "에디토리얼 이미지 스토리",
    signal: "제품 사진 기반 에디토리얼 보드/포스터 보드 적용",
    check: (html) => html.includes("sales-editorial-image-story"),
  },
  {
    label: "중간 설득 흐름 연결",
    signal: "중간 스크롤 구간에 설득 흐름 연결 패널 적용",
    check: (html) => html.includes("sales-narrative-bridge"),
  },
  {
    label: "상세 레퍼런스 흐름 보드",
    signal: "기존 상세페이지 섹션 이미지를 활용한 상세 흐름 보드 적용",
    check: (html) => html.includes("sales-reference-remix-board"),
  },
  {
    label: "긴 스크롤 상세 미리보기",
    signal: "실제 긴 상세페이지 스크롤 흐름 미리보기 적용",
    check: (html) => html.includes("sales-long-scroll-preview"),
  },
  {
    label: "섹션별 디자인 리본",
    signal: "원료/장점/신뢰 섹션별 디자인 리본 적용",
    check: (html) => html.includes("sales-section-ribbon-story") && html.includes("sales-section-ribbon-benefit") && html.includes("sales-section-ribbon-trust"),
  },
  {
    label: "원료/구성 시각화 맵",
    signal: "원료/구성 시각화 맵 적용",
    check: (html) => html.includes("sales-ingredient-visual-map"),
  },
  {
    label: "상품 장점 포스터 보드",
    signal: "핵심 장점 포스터 보드 적용",
    check: (html) => html.includes("sales-feature-poster-board"),
  },
  {
    label: "제품 광고형 스프레드",
    signal: "중간 섹션에 제품 중심 광고형 스프레드 적용",
    check: (html) => html.includes("sales-detail-ad-spread"),
  },
  {
    label: "구매 비교/언박싱 정보 디자인",
    signal: "구매 비교표와 언박싱 구성 패널 적용",
    check: (html) => html.includes("sales-commerce-comparison-band") && html.includes("sales-package-unboxing"),
  },
  {
    label: "쇼핑몰식 최종 CTA",
    signal: "최종 CTA에 쇼핑몰식 구매 확인 패널 적용",
    check: (html) => html.includes("sales-retail-closing-panel") && html.includes("sales-checkout-offer"),
  },
  {
    label: "신뢰/정보 검수 영역",
    signal: "리뷰형 신뢰 카드와 신뢰/정보 검수 패널 적용",
    check: (html) => html.includes("sales-trust-document-panel") && html.includes("sales-info-visual-panel") && html.includes("sales-trust-commerce-panel") && html.includes("sales-review-style-proof"),
  },
  {
    label: "최종 구매 판단 영수증",
    signal: "최종 구매 체크 영수증 적용",
    check: (html) => html.includes("sales-retail-decision-receipt"),
  },
  {
    label: "최종 마감 구매 보드",
    signal: "최종 구매/선물 판단을 묶는 마감 보드 적용",
    check: (html) => html.includes("sales-final-conversion-deck"),
  },
  {
    label: "최종 카탈로그형 확인 패널",
    signal: "최종 CTA 앞에 구매/선물 확인 카탈로그 패널 적용",
    check: (html) => html.includes("sales-final-catalog-panel"),
  },
  {
    label: "A/B 컨셉 차별화",
    signal: "A/B 컨셉 차이 유지",
    check: (html) => html.includes("sales-premium") && html.includes("sales-conversion"),
  },
];
const TEMPLATE_MIX_QUALITY_GATES = [
  {
    label: "고객용 템플릿 믹스 구조",
    check: (html) => html.includes("sales-template-mix-page") && html.includes("template-mix-hero") && html.includes("template-mix-final"),
  },
  {
    label: "상세페이지 흐름 레일",
    check: (html) => html.includes("template-mix-section-rail"),
  },
  {
    label: "섹션 번호 흐름 디자인",
    check: (html) => html.includes("template-mix-section-rail") && html.includes("template-mix-product-strip") && html.includes("template-mix-reference-flow"),
  },
  {
    label: "A/B 긴 상세 비교 구조",
    check: (html) => html.includes("is-premium") && html.includes("is-conversion") && (html.match(/sales-template-mix-page/g)?.length || 0) >= 2,
  },
  {
    label: "첫 화면 제품/카피 구성",
    check: (html) => html.includes("template-mix-copy") && html.includes("template-mix-product") && html.includes("template-mix-mini-cards"),
  },
  {
    label: "광고형 캠페인 커버",
    check: (html) => html.includes("template-mix-campaign-cover") && html.includes("campaign-cover-main") && html.includes("campaign-cover-sub"),
  },
  {
    label: "고객 발송용 렌더 이미지 시안",
    check: (html) => html.includes("rendered-draft-preview") || !html.includes("호아비 리치꿀스틱"),
  },
  {
    label: "첫 화면 구매 정보 레이어",
    check: (html) => html.includes("template-mix-hero-proof") && html.includes("template-mix-hero-stamp") && html.includes("template-mix-hero-offer"),
  },
  {
    label: "히어로 제품 합성 장치",
    check: (html) => html.includes("template-mix-hero-decor") && html.includes("decor-badge"),
  },
  {
    label: "제품 컷 반복 노출",
    check: (html) => html.includes("template-mix-product-strip"),
  },
  {
    label: "실제 상세/피그마 레퍼런스 리믹스",
    check: (html) => html.includes("template-mix-reference-hero-band") && html.includes("reference-hero-main") && html.includes("reference-hero-product"),
  },
  {
    label: "초반 제품/레퍼런스 비주얼 월",
    check: (html) => html.includes("template-mix-proof-wall") && html.includes("template-mix-proof-wall-grid") && html.includes("template-mix-proof-wall-reference"),
  },
  {
    label: "광고형 고밀도 포스터 구간",
    check: (html) => html.includes("template-mix-ad-poster") && html.includes("template-mix-ad-stage") && html.includes("template-mix-ad-reference"),
  },
  {
    label: "쇼핑몰형 광고 배너 3연속 구간",
    check: (html) => html.includes("template-mix-commercial-banners") && html.includes("commercial-banner is-orange") && html.includes("commercial-banner is-dark"),
  },
  {
    label: "교차형 오퍼/제품 시퀀스",
    check: (html) => html.includes("template-mix-offer-sequence") && html.includes("POINT 01") && html.includes("MOOD 01"),
  },
  {
    label: "A/B 컨셉 분기 섹션",
    check: (html) => html.includes("template-mix-concept-divider") && html.includes("template-mix-compare-table"),
  },
  {
    label: "A/B 전용 디자인 시그니처",
    check: (html) => html.includes("template-mix-brand-signature") && html.includes("template-mix-conversion-snapshot"),
  },
  {
    label: "원료/제품 무드 합성 섹션",
    check: (html) => html.includes("template-mix-editorial-scene") && html.includes("template-mix-photo-direction"),
  },
  {
    label: "어두운 강조 구간",
    check: (html) => html.includes("template-mix-dark"),
  },
  {
    label: "장점 카드 섹션",
    check: (html) => html.includes("template-mix-benefits") && html.includes("template-mix-benefit-showcase"),
  },
  {
    label: "구매 판단 흐름 섹션",
    check: (html) => html.includes("template-mix-decision"),
  },
  {
    label: "사용 루틴/장면 흐름 섹션",
    check: (html) => html.includes("template-mix-routine-flow"),
  },
  {
    label: "구매 정보 압축 테이블",
    check: (html) => html.includes("template-mix-commerce-table"),
  },
  {
    label: "패키지/구성 정보 섹션",
    check: (html) => html.includes("template-mix-split") && html.includes("template-mix-info-grid"),
  },
  {
    label: "추천/체크 포인트 섹션",
    check: (html) => html.includes("template-mix-check"),
  },
  {
    label: "신뢰/무드 마감 구간",
    check: (html) => html.includes("template-mix-proof"),
  },
  {
    label: "상세 흐름 레퍼런스 보드",
    check: (html) => html.includes("template-mix-reference-flow") && html.includes("template-mix-reference-strip"),
  },
  {
    label: "구매 설득 마감 모듈",
    check: (html) => html.includes("template-mix-purchase-stack") && html.includes("template-mix-choice-panel"),
  },
  {
    label: "최종 CTA 구간",
    check: (html) => html.includes("template-mix-final"),
  },
  {
    label: "최종 CTA 제품 컷",
    check: (html) => html.includes("template-mix-final-product"),
  },
  {
    label: "최종 선택 이유 배지",
    check: (html) => html.includes("template-mix-final-badges") && html.includes("template-mix-final-order-panel"),
  },
  {
    label: "출력용 고정 섹션 구조",
    check: (html) => html.includes("template-mix-routine-flow") && html.includes("template-mix-purchase-stack") && html.includes("template-mix-final-product"),
  },
  {
    label: "PNG/전체 미리보기 검수 필요",
    check: () => hasRenderedPreviewEvidence(),
  },
];
const DETAIL_DESIGN_OPERATION_SIGNALS = [
  "업종별 디자인 블록 패키지 적용",
  "섹션별 색상/이미지/스타일 자동 폴리싱 적용",
  "이미지 슬롯별 제작 상태 관리",
  "고객 메일/PSD 지시서까지 이미지 기준 연결",
];
const CUSTOMER_READY_SCORE = 90;
const RENDERED_REVIEW_SCORE_CAP = 78;

function value(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function readLeads() {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function readProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeProjects(projects) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function readAiSettings() {
  try {
    return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function ensureProgressAccess(project = {}) {
  const legacyDemoReceipts = new Set(["HAO-HOABI-260828", "HAO-SAENG-260828"]);
  const serverSynced = project.workflow?.cloudSync?.status === "synced";
  if (!serverSynced && legacyDemoReceipts.has(String(project.receiptNo || ""))) {
    const cleaned = { ...project };
    delete cleaned.receiptNo;
    delete cleaned.cloudReceiptNo;
    return cleaned;
  }
  return project;
}

function readCustomerProject() {
  try {
    return ensureProgressAccess(JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_KEY) || "{}"));
  } catch {
    return {};
  }
}

function readCustomerProjects() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_PROJECT_LIST_KEY) || "[]").map(ensureProgressAccess);
  } catch {
    return [];
  }
}

function writeCustomerProjects(projects) {
  localStorage.setItem(CUSTOMER_PROJECT_LIST_KEY, JSON.stringify(projects));
}

function removeRequestedTestProjects() {
  const cleanupKey = "customerProjectCleanup:20260724:asdasd-345drg";
  if (localStorage.getItem(cleanupKey)) return;

  const removalNames = new Set(["asdasd", "345drg"]);
  const matchesRemovalName = (project) => [
    project?.productName,
    project?.projectName,
    project?.clientName,
    project?.companyName,
  ].some((name) => removalNames.has(String(name || "").trim()));

  const projects = readCustomerProjects();
  const remaining = projects.filter((project) => !matchesRemovalName(project));
  if (remaining.length !== projects.length) {
    writeCustomerProjects(remaining);
  }

  const activeProject = readCustomerProject();
  if (matchesRemovalName(activeProject)) {
    if (remaining[0]) {
      localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(remaining[0]));
    } else {
      localStorage.removeItem(CUSTOMER_PROJECT_KEY);
    }
  }

  localStorage.setItem(cleanupKey, "done");
}

function writeAiSettings(settings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}

function readAiWorkflowRuns() {
  try {
    return JSON.parse(localStorage.getItem(AI_WORKFLOW_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAiWorkflowRuns(runs) {
  localStorage.setItem(AI_WORKFLOW_KEY, JSON.stringify(runs.slice(0, 80)));
}

function currentProjectKey() {
  return value("productName") || value("clientName") || "unsaved-project";
}

function projectAiContext(extra = {}) {
  return {
    projectKey: currentProjectKey(),
    product: product(),
    layouts: {
      A: $("#templateA")?.textContent.trim() || "",
      B: $("#templateB")?.textContent.trim() || "",
    },
    outputs: {
      plan: $("#planResult")?.textContent.trim() || "",
      clientMail: $("#clientMailResult")?.textContent.trim() || "",
      revision: $("#revisionResult")?.textContent.trim() || "",
      handoff: $("#handoffResult")?.textContent.trim() || "",
      finalMail: $("#finalMail")?.textContent.trim() || "",
    },
    sectionEdits,
    sectionOrders,
    ...extra,
  };
}

function recordAiWorkflowRun(role, provider, status, detail = {}) {
  const roleConfig = AI_SERVICE_ROLES[role] || { label: role };
  const runs = readAiWorkflowRuns();
  runs.unshift({
    id: `ai-run-${Date.now()}`,
    projectKey: currentProjectKey(),
    role,
    roleLabel: roleConfig.label,
    provider,
    status,
    detail,
    createdAt: new Date().toLocaleString("ko-KR"),
  });
  writeAiWorkflowRuns(runs);
  renderAiWorkflowStatus();
}

function aiRoleLabel(role) {
  return AI_SERVICE_ROLES[role]?.label || role;
}

function providerForRole(role) {
  const settings = readAiSettings();
  const roleConfig = AI_SERVICE_ROLES[role] || {};
  const mappedProvider = settings.roleProviders?.[role] || AI_ROLE_PROVIDER_MAP[role] || roleConfig.defaultProvider || "rules";
  if (mappedProvider === "codex") return "codex";
  if (mappedProvider === "local-design") return "local-design";
  if (mappedProvider === "rules") return "rules";
  return "rules";
}

function aiProviderLabel(provider) {
  return AI_PROVIDERS[provider]?.label || provider;
}

function saveAiArtifact(role, provider, result, meta = {}) {
  const key = `detailAiArtifacts:${currentProjectKey()}`;
  let artifacts = {};
  try {
    artifacts = JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    artifacts = {};
  }
  artifacts[role] = {
    role,
    roleLabel: aiRoleLabel(role),
    provider,
    providerLabel: aiProviderLabel(provider),
    result,
    meta,
    updatedAt: new Date().toLocaleString("ko-KR"),
  };
  localStorage.setItem(key, JSON.stringify(artifacts));
  return artifacts[role];
}

function readAiArtifacts(projectKey = currentProjectKey()) {
  try {
    return JSON.parse(localStorage.getItem(`detailAiArtifacts:${projectKey}`) || "{}");
  } catch {
    return {};
  }
}

async function runRulesProvider({ fallback }) {
  return fallback;
}

async function runLocalDesignProvider({ fallback }) {
  return fallback || "로컬 상세페이지 디자인 엔진으로 결과를 생성했습니다.";
}

async function runUnavailableProvider({ provider, fallback }) {
  return fallback || `${aiProviderLabel(provider)} provider는 아직 연결 전입니다. 현재는 로컬 결과를 사용합니다.`;
}

async function invokeAiRole(role, task, payload, fallback = "") {
  const provider = providerForRole(role);
  recordAiWorkflowRun(role, provider, "started", { task });
  try {
    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.rules;
    const result = await providerConfig.run({
      role,
      provider,
      task,
      fallback,
      payload: {
        ...projectAiContext(),
        ...payload,
        aiRole: AI_SERVICE_ROLES[role],
        provider: providerConfig.label,
      },
    });
    const finalResult = result || fallback;
    saveAiArtifact(role, provider, finalResult, { task, providerStatus: providerConfig.status });
    recordAiWorkflowRun(role, provider, finalResult === fallback ? "fallback" : "completed", { task, providerLabel: providerConfig.label });
    return finalResult;
  } catch (error) {
    recordAiWorkflowRun(role, provider, "failed", { task, message: error.message });
    throw error;
  }
}

function renderAiWorkflowStatus() {
  const target = $("#aiWorkflowStatus");
  if (!target) return;
  const runs = readAiWorkflowRuns().filter((run) => run.projectKey === currentProjectKey()).slice(0, 8);
  if (!runs.length) {
    target.innerHTML = "<p>아직 이 프로젝트에서 실행된 AI 작업이 없습니다.</p>";
    return;
  }
  target.innerHTML = runs.map((run) => `
    <div>
      <b>${escapeHtml(run.roleLabel || aiRoleLabel(run.role))}</b>
      <span>${escapeHtml(aiProviderLabel(run.provider))} · ${escapeHtml(run.status)} · ${escapeHtml(run.createdAt)}</span>
    </div>
  `).join("");
}

function loadAiSettings() {
  writeAiSettings({ mode: "codex-package" });
  updateAiStatus();
}

function saveAiSettings() {
  writeAiSettings({ mode: "codex-package" });
  updateAiStatus("Codex 작업 패키지 방식이 적용되어 있습니다.");
}

function updateAiStatus(message) {
  if (!$("#aiStatus")) return;
  $("#aiStatus").textContent = message || "API 키 없이 승인 DB를 Codex 작업 패키지로 생성합니다.";
}

function updateReferenceStatus() {
  const status = $("#referenceStatus");
  if (!status) return;
  const auto = window.COMPANY_REFERENCE_AUTO;
  const curated = window.COMPANY_REFERENCE_DATASET;
  const total = auto?.total || curated?.summary?.totalFiles || 0;
  const driveConnected = DESIGN_REFERENCE_POLICY.googleDriveStatus === "connected" && Boolean(DESIGN_REFERENCE_POLICY.googleDriveRootUrl);
  status.textContent = total
    ? `참고 상세페이지 ${total}개 분석 데이터 · Google Drive 기획안 ${DESIGN_REFERENCE_POLICY.planningReferenceCount}개 · 제작 프로젝트 ${DESIGN_REFERENCE_POLICY.productionProjectCount}개 연결됨`
    : driveConnected
      ? `Google Drive 기획안 ${DESIGN_REFERENCE_POLICY.planningReferenceCount}개 · 제작 프로젝트 ${DESIGN_REFERENCE_POLICY.productionProjectCount}개 연결됨`
      : "참고 상세페이지 자료가 아직 연결되지 않았습니다.";
}

function renderLeads() {
  const list = $("#leadList");
  if (!list) return;
  const leads = readLeads();
  if (!leads.length) {
    list.textContent = "아직 접수된 고객자료가 없습니다.";
    return;
  }
  list.innerHTML = leads.map((lead) => `
    <article class="lead-item">
      <div>
        <strong>${escapeHtml(lead.productName || "제품명 미입력")}</strong>
        <p>${escapeHtml(lead.source || "접수")} · ${escapeHtml(lead.selectedOption || "옵션 없음")} · ${escapeHtml(lead.createdAt || "")}</p>
        <p>상태: ${escapeHtml(lead.status || "신규 접수")}</p>
        <p>${escapeHtml(lead.serviceType || lead.purpose || "")}</p>
      </div>
      <div class="lead-actions">
        <select class="status-select lead-status" data-id="${escapeHtml(lead.id)}">
          ${["신규 접수", "검토 중", "1차 기획 완료", "1차 시안 완료", "고객 컨펌 대기", "1차 시안 보완 중", "실제 제작 중", "내부 검수 중", "최종 납품 준비", "완료"].map((status) => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="secondary small import-lead" data-id="${escapeHtml(lead.id)}">불러오기</button>
      </div>
    </article>
  `).join("");
  $$(".lead-status").forEach((select) => {
    select.addEventListener("change", () => updateLeadStatus(select.dataset.id, select.value));
  });
  $$(".import-lead").forEach((button) => {
    button.addEventListener("click", () => importLead(button.dataset.id));
  });
}

function updateLeadStatus(id, status) {
  const leads = readLeads().map((lead) => lead.id === id ? { ...lead, status } : lead);
  writeLeads(leads);
  renderLeads();
}

function importLead(id) {
  const lead = readLeads().find((item) => item.id === id);
  if (!lead) return;
  $("#clientName").value = lead.brandName || lead.name || "";
  $("#productName").value = lead.productName || "";
  $("#category").value = lead.category || "";
  $("#channel").value = lead.channel || "고객 입력";
  $("#dueDate").value = lead.dueDate || "";
  $("#oneLine").value = lead.features || lead.freeDraft || "";
  $("#consultSummary").value = [
    `유입 경로: ${lead.source || ""}`,
    `선택 옵션: ${lead.selectedOption || ""}`,
    `고객명: ${lead.name || ""}`,
    `연락처: ${lead.phone || ""}`,
    `이메일: ${lead.email || ""}`,
    lead.targetCustomer ? `타깃고객: ${lead.targetCustomer}` : "",
    lead.purpose ? `제작 목적: ${lead.purpose}` : "",
    lead.serviceType ? `희망 제작 방식: ${lead.serviceType}` : "",
    lead.scope?.length ? `제작 범위: ${lead.scope.join(", ")}` : "",
    lead.summary ? `\n[접수 요약]\n${lead.summary}` : "",
  ].filter(Boolean).join("\n");
  $("#clientRequests").value = lead.moodText || (lead.mood || []).join(", ") || "";
  $("#emphasis").value = lead.emphasis || lead.difference || "";
  $("#banWords").value = lead.avoidText || "";
  $("#mustInclude").value = lead.mustInclude || "";
  $("#references").value = lead.references || "";

  if (lead.mood) {
    setChecked("direction", lead.mood.filter((item) => ["고급스러운", "감성적인", "깔끔한", "귀여운", "신뢰감 있는", "선물용", "정보 전달형", "구매 전환형"].includes(item)).map((item) => {
      if (item === "고급스러운") return "프리미엄 브랜드형";
      if (item === "감성적인") return "감성 스토리형";
      if (item === "귀여운") return "캐주얼/귀여운형";
      if (item === "정보 전달형") return "정보 전달형";
      return item;
    }));
  }

  generateAll();
  updateLeadStatus(id, "검토 중");
  alert("고객 접수 자료를 프로젝트에 불러왔습니다.");
}

function importCustomerProject() {
  const storedData = readCustomerProject();
  const organizedFields = storedData.contentSummary?.adminFields
    || window.haoWorkflow?.buildAdminFields?.(storedData)
    || {};
  const data = { ...storedData, ...organizedFields };
  if (!data.productName) {
    alert("아직 고객이 저장한 프로젝트 작성 내용이 없습니다.");
    return;
  }
  const mood = data.mood || [];
  const structure = data.structure || [];
  const colorTone = data.colorTone || [];
  const imageStyle = data.imageStyle || [];
  const avoidStyle = data.avoidStyle || [];
  const imageAssets = data.imageAssets || [];
  const uploadedFiles = [
    data.productImages?.length ? `제품 이미지 파일: ${data.productImages.join(", ")}` : "",
    data.brandLogo?.length ? `브랜드 로고 파일: ${data.brandLogo.join(", ")}` : "",
    data.referenceFiles?.length ? `참고 상세페이지 파일: ${data.referenceFiles.join(", ")}` : "",
  ].filter(Boolean);

  $("#clientName").value = data.clientName || "";
  $("#productName").value = data.productName || "";
  $("#category").value = data.category || "";
  $("#channel").value = data.channel || "";
  $("#dueDate").value = data.dueDate || "";
  $("#oneLine").value = data.oneLine || "";
  $("#consultSummary").value = [
    data.language ? `상세페이지 언어: ${data.language}` : "",
    data.contactName ? `담당자명: ${data.contactName}` : "",
    data.contactInfo ? `고객 연락처/이메일: ${data.contactInfo}` : "",
    data.phone ? `연락처: ${data.phone}` : "",
    data.source ? `접수 경로: ${data.source}` : "",
    data.targetCustomer ? `주요 고객: ${data.targetCustomer}` : "",
    data.features ? `제품 특징:\n${data.features}` : "",
    data.additionalNotes ? `추가 요청 및 기존 신청서 원문:\n${data.additionalNotes}` : "",
    data.existingDetailStructure?.length ? `기존 상세페이지 구조 분석:\n${data.existingDetailStructure.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    imageAssets.length ? `이미지/촬영본 상태: ${imageAssets.join(", ")}` : "",
    uploadedFiles.length ? uploadedFiles.join("\n") : "",
    data.imageMemo ? `이미지 메모:\n${data.imageMemo}` : "",
    data.savedAt ? `고객 작성 저장일: ${data.savedAt}` : "",
  ].filter(Boolean).join("\n\n");
  $("#clientRequests").value = [
    data.clientRequests || "",
    mood.length ? `선택한 전체 분위기: ${mood.join(", ")}` : "",
    structure.length ? `선택한 구성 방식: ${structure.join(", ")}` : "",
    colorTone.length ? `선택한 색감 방향: ${colorTone.join(", ")}` : "",
    imageStyle.length ? `선택한 이미지 활용: ${imageStyle.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  $("#emphasis").value = data.emphasis || "";
  $("#banWords").value = [
    data.banWords || "",
    avoidStyle.length ? `피하고 싶은 느낌: ${avoidStyle.join(", ")}` : "",
  ].filter(Boolean).join("\n");
  $("#mustInclude").value = data.mustInclude || "";
  $("#references").value = data.references || "";

  const directions = [];
  if (mood.some((item) => item.includes("고급스럽고") || item.includes("신뢰감"))) directions.push("프리미엄 브랜드형");
  if (mood.some((item) => item.includes("따뜻") || item.includes("감성"))) directions.push("감성 스토리형");
  if (mood.some((item) => item.includes("귀엽") || item.includes("친근"))) directions.push("캐주얼/귀여운형");
  if (mood.some((item) => item.includes("전문적") || item.includes("정보"))) directions.push("정보 전달형");
  if (structure.some((item) => item.includes("문제 해결"))) directions.push("문제 해결형");
  if (structure.some((item) => item.includes("제품 설명") || item.includes("후기"))) directions.push("정보 전달형");
  if (structure.some((item) => item.includes("브랜드 스토리") || item.includes("선물용"))) directions.push("감성 스토리형");
  setChecked("direction", [...new Set(directions)]);

  const goals = [];
  if (structure.some((item) => item.includes("구매 전환"))) goals.push("구매 전환");
  if (mood.some((item) => item.includes("신뢰감")) || structure.some((item) => item.includes("신뢰"))) goals.push("브랜드 신뢰");
  if (structure.some((item) => item.includes("제품 설명"))) goals.push("제품 이해");
  if (structure.some((item) => item.includes("선물용"))) goals.push("선물 수요");
  setChecked("goal", [...new Set(goals)]);

  markCustomerFieldCompletion();
  renderProjectReviewGate(storedData);
  updateWorkflowState();
  updateAiStatus("고객 작성 내용과 1차 내용정리본을 불러왔습니다. 내용을 확인한 뒤 ‘내용 검수 완료’를 눌러주세요.");
}

function hasMeaningfulAdminValue(id) {
  const field = document.getElementById(id);
  if (!field) return false;
  const value = String(field.value || "").trim();
  if (!value) return false;
  if (/^(예\s*:|선택해\s*주세요|미입력|없음)$/i.test(value)) return false;
  if (field.placeholder && value === field.placeholder.trim()) return false;
  return true;
}

function markCustomerFieldCompletion() {
  const fieldStates = {
    clientName: hasMeaningfulAdminValue("clientName"),
    productName: hasMeaningfulAdminValue("productName"),
    category: hasMeaningfulAdminValue("category"),
    channel: hasMeaningfulAdminValue("channel"),
    dueDate: hasMeaningfulAdminValue("dueDate"),
    oneLine: hasMeaningfulAdminValue("oneLine"),
    consultSummary: hasMeaningfulAdminValue("consultSummary"),
    clientRequests: hasMeaningfulAdminValue("clientRequests"),
    emphasis: hasMeaningfulAdminValue("emphasis"),
    banWords: hasMeaningfulAdminValue("banWords"),
    mustInclude: hasMeaningfulAdminValue("mustInclude"),
    references: hasMeaningfulAdminValue("references"),
  };

  Object.entries(fieldStates).forEach(([id, complete]) => {
    const field = document.getElementById(id);
    const label = field?.closest("label");
    if (!field || !label) return;
    label.classList.toggle("customer-field-missing", !complete);
    label.classList.toggle("customer-field-complete", complete);
    label.querySelector(".customer-field-status")?.remove();
    const badge = document.createElement("span");
    badge.className = `customer-field-status ${complete ? "complete" : "missing"}`;
    badge.textContent = complete ? "✓ 작성됨" : "! 미기입";
    label.appendChild(badge);
  });
}

function setupBriefTextareaExpandTriggers() {
  $$("#brief textarea").forEach((textarea) => {
    const label = textarea.closest("label");
    if (!label || label.querySelector(".textarea-expand-trigger")) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "textarea-expand-trigger";
    trigger.setAttribute("aria-label", "두 번 클릭해 입력창을 내용에 맞게 확대");
    trigger.title = "더블클릭하면 좌우 입력창 높이가 함께 맞춰집니다";
    trigger.textContent = "↕";
    trigger.addEventListener("click", (event) => event.preventDefault());
    trigger.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const grid = label.parentElement;
      const rowLabels = grid?.classList.contains("two")
        ? Array.from(grid.children).filter((item) => item.matches("label"))
        : [label];
      const labelIndex = Math.max(0, rowLabels.indexOf(label));
      const rowStart = Math.floor(labelIndex / 2) * 2;
      const pairedLabels = rowLabels.slice(rowStart, rowStart + 2);
      const pairedTextareas = pairedLabels.map((item) => item.querySelector("textarea")).filter(Boolean);
      const shouldCollapse = pairedTextareas.some((item) => item.classList.contains("is-auto-expanded"));

      if (shouldCollapse) {
        pairedTextareas.forEach((item) => {
          item.style.height = "";
          item.classList.remove("is-auto-expanded");
        });
      } else {
        pairedTextareas.forEach((item) => { item.style.height = "auto"; });
        const targetHeight = Math.min(
          Math.max(...pairedTextareas.map((item) => item.scrollHeight + 10), 190),
          520
        );
        pairedTextareas.forEach((item) => {
          item.style.height = `${targetHeight}px`;
          item.classList.add("is-auto-expanded");
        });
      }
      pairedLabels.forEach((item) => {
        const pairedTrigger = item.querySelector(".textarea-expand-trigger");
        if (!pairedTrigger) return;
        pairedTrigger.classList.add("active");
        pairedTrigger.textContent = shouldCollapse ? "↺" : "✓";
      });
      window.setTimeout(() => {
        pairedLabels.forEach((item) => {
          const pairedTrigger = item.querySelector(".textarea-expand-trigger");
          if (!pairedTrigger) return;
          pairedTrigger.textContent = "↕";
          pairedTrigger.classList.remove("active");
        });
      }, 900);
    });
    label.appendChild(trigger);
  });
}

function activeCustomerProject() {
  const project = readCustomerProject();
  return project?.id ? project : null;
}

function projectManagerReviewApproved(project = activeCustomerProject()) {
  return project?.workflow?.managerReview?.status === "approved";
}

function projectDriveReferenceReady(project = activeCustomerProject()) {
  if (project?.requiresDriveReference === false) return true;
  return DESIGN_REFERENCE_POLICY.googleDriveStatus === "connected"
    && Boolean(DESIGN_REFERENCE_POLICY.googleDrivePlanningUrl)
    && Boolean(DESIGN_REFERENCE_POLICY.googleDriveProductionUrl);
}

function adminReviewChecks(project = activeCustomerProject()) {
  const field = (id) => hasMeaningfulAdminValue(id);
  return [
    { key: "clientName", label: "고객사명", ok: field("clientName") },
    { key: "productName", label: "제품명", ok: field("productName") },
    { key: "category", label: "카테고리", ok: field("category") },
    { key: "oneLine", label: "한 줄 설명", ok: field("oneLine") },
    { key: "consultSummary", label: "제품 정보", ok: field("consultSummary") },
    { key: "clientRequests", label: "고객 요청", ok: field("clientRequests") },
    { key: "mustInclude", label: "필수 문구", ok: field("mustInclude") },
    { key: "references", label: "근거/참고", ok: field("references") },
  ];
}

function updateGenerateReviewLock(project = activeCustomerProject()) {
  const button = $("#generateAll");
  if (!button) return;
  const reviewPending = Boolean(project?.id) && !projectManagerReviewApproved(project);
  const reviewLocked = reviewPending && adminReviewChecks(project).some((item) => !item.ok);
  const driveLocked = Boolean(project?.id) && !projectDriveReferenceReady(project);
  const locked = reviewLocked || driveLocked;
  button.classList.toggle("is-review-locked", locked);
  button.setAttribute("aria-disabled", locked ? "true" : "false");
  button.title = reviewLocked
    ? "필수 검수 항목을 보완한 뒤 생성할 수 있습니다."
    : driveLocked
      ? "Google Drive 기획안과 실제 제작물 레퍼런스가 연결되어야 생성할 수 있습니다."
      : reviewPending
        ? "현재 내용을 검수 완료로 확정하고 프롬프트와 이미지 시안을 생성합니다."
        : "검수된 내용정리본과 Google Drive 기획안·실제 제작물을 바탕으로 프롬프트와 이미지 시안을 생성합니다.";
}

function renderProjectReviewGate(project = activeCustomerProject()) {
  const gate = $("#projectReviewGate");
  if (!gate) return;
  const title = $("#projectReviewTitle");
  const description = $("#projectReviewDescription");
  const status = $("#projectReviewStatus");
  const checksNode = $("#projectReviewChecks");
  const approveButton = $("#approveProjectReview");
  const summaryButton = $("#downloadContentSummary");

  gate.classList.remove("is-approved", "is-blocked", "is-pending");
  if (!project?.id) {
    gate.classList.add("is-pending");
    if (title) title.textContent = "프로젝트를 불러온 뒤 내용을 검수하세요";
    if (description) description.textContent = "고객 원문과 1차 내용정리본을 비교하고, 사실·누락·증빙 상태를 확인해야 시안 생성이 열립니다.";
    if (status) status.textContent = "프로젝트 미선택";
    if (checksNode) checksNode.innerHTML = "";
    if (approveButton) approveButton.disabled = true;
    if (summaryButton) summaryButton.disabled = true;
    updateGenerateReviewLock(null);
    return;
  }

  const checks = adminReviewChecks(project);
  const missing = checks.filter((item) => !item.ok);
  const approved = projectManagerReviewApproved(project);
  const driveReady = projectDriveReferenceReady(project);
  gate.classList.add(approved ? "is-approved" : missing.length ? "is-blocked" : "is-pending");
  if (title) title.textContent = approved
    ? `${project.productName || "프로젝트"} 내용 검수 완료`
    : `${project.productName || "프로젝트"} 1차 내용정리본 검수`;
  if (description) description.textContent = approved
    ? driveReady
      ? "승인된 정리본과 연결된 Google Drive 기획안·실제 제작물만 구조 참고 기준으로 사용합니다. 아래 필드를 수정하면 다시 검수가 필요합니다."
      : "내용 검수는 완료됐습니다. Google Drive 레퍼런스 연결이 완료되면 생성 단계가 열립니다."
    : missing.length
      ? `필수 항목 ${missing.length}개를 보완한 뒤 검수를 완료하세요. 미제공 증빙은 확정 문구로 사용하지 않습니다.`
      : "고객 원문과 정리된 관리자 필드를 대조한 뒤 검수 완료를 눌러 생성 단계를 여세요.";
  if (status) status.textContent = approved
    ? driveReady ? "✓ 검수 완료 · Drive 연결" : "✓ 검수 완료 · Drive 대기"
    : missing.length ? `보완 ${missing.length}개` : "승인 대기";
  if (checksNode) checksNode.innerHTML = checks.map((item) => `<span class="${item.ok ? "ok" : "missing"}">${item.ok ? "✓" : "!"} ${escapeHtml(item.label)}</span>`).join("");
  if (approveButton) {
    approveButton.disabled = Boolean(missing.length);
    approveButton.textContent = approved ? "검수 완료됨" : "내용 검수 완료";
  }
  if (summaryButton) summaryButton.disabled = false;
  updateGenerateReviewLock(project);
}

function focusProjectReviewGate(message = "") {
  showPanel("projects");
  renderProjectReviewGate();
  const gate = $("#projectReviewGate");
  const description = $("#projectReviewDescription");
  if (message && description) description.textContent = message;
  if (!gate) return;
  gate.classList.remove("needs-attention");
  void gate.offsetWidth;
  gate.classList.add("needs-attention");
  gate.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => gate.classList.remove("needs-attention"), 1800);
  window.setTimeout(() => $("#approveProjectReview")?.focus({ preventScroll: true }), 450);
}

function ensureProjectReviewApprovedForGeneration() {
  const active = activeCustomerProject();
  if (!active) {
    focusProjectReviewGate("고객 프로젝트를 먼저 불러와야 검수와 시안 생성을 진행할 수 있습니다.");
    updateAiStatus("검수할 고객 프로젝트를 먼저 불러와주세요.");
    return false;
  }
  if (projectManagerReviewApproved(active)) return true;

  const missing = adminReviewChecks(active).filter((item) => !item.ok);
  if (missing.length) {
    focusProjectReviewGate(`시안 생성 전 필수 항목 ${missing.length}개를 보완하세요: ${missing.map((item) => item.label).join(", ")}`);
    updateAiStatus(`검수 필수 항목 ${missing.length}개를 보완한 뒤 시안 생성을 다시 실행해주세요.`);
    return false;
  }

  // 관리자가 상단 생성 버튼을 누르는 행위 자체를 최종 검수 확정으로 봅니다.
  // 필수 항목이 모두 채워진 경우에만 승인하므로, 빈 프로젝트가 자동 승인되지는 않습니다.
  approveCurrentProjectReview();
  return projectManagerReviewApproved();
}

function projectFromAdminFields(project = activeCustomerProject()) {
  if (!project) return null;
  return {
    ...project,
    companyName: value("clientName"),
    clientName: value("clientName"),
    productName: value("productName"),
    category: value("category"),
    channel: value("channel"),
    dueDate: value("dueDate"),
    oneLine: value("oneLine"),
    features: value("consultSummary"),
    clientRequests: value("clientRequests"),
    emphasis: value("emphasis"),
    banWords: value("banWords"),
    mustInclude: value("mustInclude"),
    references: value("references"),
  };
}

function persistCustomerProject(project) {
  if (!project?.id) return;
  const projects = readCustomerProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  if (index >= 0) projects[index] = project;
  else projects.unshift(project);
  writeCustomerProjects(projects);
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
}

function approveCurrentProjectReview() {
  const active = activeCustomerProject();
  if (!active) {
    alert("검수할 고객 프로젝트를 먼저 불러와주세요.");
    return;
  }
  const missing = adminReviewChecks(active).filter((item) => !item.ok);
  if (missing.length) {
    alert(`검수 전 필수 항목을 보완해주세요: ${missing.map((item) => item.label).join(", ")}`);
    renderProjectReviewGate(active);
    return;
  }
  const reviewed = projectFromAdminFields(active);
  reviewed.contentSummary = window.haoWorkflow?.buildContentSummary?.(reviewed) || reviewed.contentSummary;
  reviewed.contentSummaryText = window.haoWorkflow?.buildContentSummaryText?.(reviewed) || reviewed.contentSummaryText;
  reviewed.status = "검수 완료";
  const driveReady = projectDriveReferenceReady(reviewed);
  reviewed.workflow = {
    ...(reviewed.workflow || {}),
    managerReview: { status: "approved", at: new Date().toISOString() },
    prompt: { status: driveReady ? "ready" : "blocked", at: "" },
    imageDraft: { status: driveReady ? "ready" : "blocked", at: "" },
  };
  persistCustomerProject(reviewed);
  renderCustomerProjects();
  renderProjectReviewGate(reviewed);
  updateWorkflowState();
  updateAiStatus("관리자 내용 검수가 완료되었습니다. 이제 기획/시안 자동 생성을 실행할 수 있습니다.");
}

function invalidateCurrentProjectReview() {
  const active = activeCustomerProject();
  if (!active || !projectManagerReviewApproved(active)) return;
  const changed = projectFromAdminFields(active);
  changed.status = "확인 중";
  changed.workflow = {
    ...(changed.workflow || {}),
    managerReview: { status: "pending", at: "", reason: "관리자 필드 수정" },
    prompt: { status: "blocked", at: "" },
    imageDraft: { status: "blocked", at: "" },
  };
  persistCustomerProject(changed);
  renderCustomerProjects();
  renderProjectReviewGate(changed);
}

function safeDownloadName(valueText = "프로젝트") {
  return String(valueText || "프로젝트").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_").slice(0, 80);
}

function contentSummaryText(project = activeCustomerProject()) {
  if (!project) return "";
  return project.contentSummaryText
    || window.haoWorkflow?.buildContentSummaryText?.(project)
    || "내용정리본을 생성할 수 없습니다.";
}

function downloadTextFile(fileName, contents, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCurrentContentSummary(project = activeCustomerProject()) {
  if (!project) {
    alert("내용정리본을 받을 프로젝트를 먼저 불러와주세요.");
    return;
  }
  downloadTextFile(`${safeDownloadName(project.productName)}_제품_내용정리본.txt`, contentSummaryText(project));
  updateAiStatus("고객 원문 기반 1차 내용정리본을 내려받았습니다.");
}

function updateProductionFolderStatus(message, connected = Boolean(productionRootDirectoryHandle)) {
  const node = $("#productionFolderStatus");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-connected", connected);
}

async function connectProductionFolder({ quietCancel = false } = {}) {
  if (!("showDirectoryPicker" in window)) {
    updateProductionFolderStatus("이 브라우저는 폴더 직접 저장을 지원하지 않습니다. Chrome 또는 Edge의 HTTPS 주소에서 이용해주세요.", false);
    if (!quietCancel) alert("폴더 자동 저장은 데스크톱 Chrome 또는 Edge에서 지원됩니다.");
    return null;
  }
  try {
    const handle = await window.showDirectoryPicker({ id: "hao-detail-production-root", mode: "readwrite" });
    const permission = await handle.requestPermission?.({ mode: "readwrite" });
    if (permission && permission !== "granted") throw new Error("선택한 폴더에 저장 권한이 없습니다.");
    productionRootDirectoryHandle = handle;
    updateProductionFolderStatus(`✓ ${handle.name} 연결됨 · 생성 완료 시 고객관리/업체별 폴더에 자동 저장됩니다.`, true);
    return handle;
  } catch (error) {
    if (error?.name === "AbortError") {
      updateProductionFolderStatus("폴더 선택을 건너뛰었습니다. 생성 결과는 현재 브라우저에 보관됩니다.", false);
      if (!quietCancel) updateAiStatus("작업 폴더 연결을 취소했습니다.");
      return null;
    }
    updateProductionFolderStatus(error?.message || "작업 폴더를 연결하지 못했습니다.", false);
    if (!quietCancel) alert(error?.message || "작업 폴더를 연결하지 못했습니다.");
    return null;
  }
}

async function childDirectory(parent, name) {
  return parent.getDirectoryHandle(safeDownloadName(name), { create: true });
}

async function writeFolderFile(directory, name, contents) {
  const handle = await directory.getFileHandle(safeDownloadName(name), { create: true });
  const writer = await handle.createWritable();
  await writer.write(contents);
  await writer.close();
}

async function saveProductionBundleToFolder(imageFile = null) {
  const project = activeCustomerProject();
  if (!productionRootDirectoryHandle || !project) return false;

  const customerRoot = await childDirectory(productionRootDirectoryHandle, "고객관리");
  const companyRoot = await childDirectory(customerRoot, project.clientName || project.companyName || "고객사_미입력");
  const intakeDirectory = await childDirectory(companyRoot, "01_고객 작성 내용");
  const promptDirectory = await childDirectory(companyRoot, "02_상세페이지 프롬프트");
  const materialDirectory = await childDirectory(companyRoot, "03_제품 자료");
  const imageDirectory = await childDirectory(companyRoot, "04_생성 이미지");
  const productStem = safeDownloadName(project.productName || "프로젝트");

  await writeFolderFile(intakeDirectory, `${productStem}_제품_내용정리본.txt`, contentSummaryText(project));
  await writeFolderFile(
    intakeDirectory,
    `${productStem}_프로젝트_원본.json`,
    JSON.stringify({ ...project, id: project.id, exportedAt: new Date().toISOString() }, null, 2),
  );

  const brief = $("#imageDraftBrief")?.value.trim() || readImageDraftState().brief || "";
  if (brief) await writeFolderFile(promptDirectory, `${productStem}_상세페이지_이미지생성_프롬프트.txt`, brief);

  const groupDirectories = {
    productImages: await childDirectory(materialDirectory, "01_제품 이미지"),
    brandLogo: await childDirectory(materialDirectory, "02_로고스펙 자료"),
    referenceFiles: await childDirectory(materialDirectory, "03_참고 이미지"),
  };
  let records = currentCustomerAssetRecords.length ? currentCustomerAssetRecords : [];
  if (!records.length && window.customerFileStore?.listProjectFiles) {
    try {
      records = await window.customerFileStore.listProjectFiles(project.id);
    } catch {
      records = [];
    }
  }
  for (const record of records) {
    const target = groupDirectories[record.group];
    if (!target || !record.blob) continue;
    await writeFolderFile(target, record.name || `자료_${Date.now()}`, record.blob);
  }

  if (imageFile) {
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const draftDirectory = await childDirectory(imageDirectory, `${productStem}_상세페이지_시안_${date}`);
    await writeFolderFile(draftDirectory, imageFile.name, imageFile);
    if (brief) await writeFolderFile(draftDirectory, `${productStem}_사용_프롬프트.txt`, brief);
    await writeFolderFile(
      draftDirectory,
      "README.txt",
      "이 폴더는 관리자 검수를 통과한 1차 내용정리본과 프롬프트를 기준으로 생성된 상세페이지 방향성 시안입니다. 최종 판매용 상세페이지는 디자이너 검수와 조판을 거쳐야 합니다.",
    );
  }

  const updated = { ...project };
  updated.workflow = {
    ...(updated.workflow || {}),
    foldering: { status: imageFile ? "completed" : "prepared", at: new Date().toISOString(), root: productionRootDirectoryHandle.name },
  };
  persistCustomerProject(updated);
  updateProductionFolderStatus(`✓ ${productionRootDirectoryHandle.name}/고객관리/${project.clientName || project.companyName} 저장 완료`, true);
  updateAiStatus("내용정리본, 프롬프트, 고객 자료와 생성 이미지를 업체별 작업 폴더에 저장했습니다.");
  return true;
}

function customerProjectReadiness(project) {
  const hasCompletionRecord = Array.isArray(project.customerCompletedFields);
  const completedFields = new Set(project.customerCompletedFields || []);
  const customerCompleted = (field, legacyFallback = false) =>
    hasCompletionRecord ? completedFields.has(field) : Boolean(legacyFallback);
  const fields = [
    { label: "고객사명", complete: customerCompleted("clientName") || customerCompleted("companyName") },
    { label: "제품명", complete: customerCompleted("productName", project.productName) },
    { label: "카테고리", complete: customerCompleted("category") },
    { label: "요청사항", complete: customerCompleted("heroSentence") || customerCompleted("coreStrength") },
    { label: "연락처", complete: Boolean(project.contactInfo || project.contactName || project.phone || project.email) },
    { label: "사진/자료", complete: Boolean(
      (Array.isArray(project.productImages) && project.productImages.length) ||
      (Array.isArray(project.referenceFiles) && project.referenceFiles.length) ||
      customerCompleted("referenceUrls")
    ) },
  ];
  const checks = [
    ...fields.map((field) => field.complete),
    Boolean(project.emphasis || project.clientRequests),
    Boolean(project.language),
    Boolean(project.references || (Array.isArray(project.referenceFiles) && project.referenceFiles.length > 0)),
    Boolean(project.clientName || project.brandName),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const missing = fields.filter((field) => !field.complete).map((field) => field.label);
  return { score, missing, fields };
}

function planningPreviewForProject(project = {}) {
  const identity = [project.clientName, project.companyName, project.brandName, project.productName]
    .filter(Boolean)
    .join(" ");
  return PROJECT_PLANNING_PREVIEWS.find((item) => identity.includes(item.clientToken)) || null;
}

function currentPlanningPreview() {
  return planningPreviewForProject({
    clientName: value("clientName"),
    productName: value("productName"),
  }) || planningPreviewForProject(activeCustomerProject() || {});
}

function planningReviewStorageKey(preview = currentPlanningPreview()) {
  return preview ? `planningReview:${preview.id}:${currentProjectKey()}` : "";
}

function readPlanningReview(preview = currentPlanningPreview()) {
  const key = planningReviewStorageKey(preview);
  if (!key) return { status: "pending", note: "", updatedAt: "" };
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || { status: "pending", note: "", updatedAt: "" };
  } catch {
    return { status: "pending", note: "", updatedAt: "" };
  }
}

function writePlanningReview(next, preview = currentPlanningPreview()) {
  const key = planningReviewStorageKey(preview);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify({
    status: next.status || "pending",
    note: next.note || "",
    updatedAt: new Date().toLocaleString("ko-KR"),
  }));
  renderPlanningReviewCard();
}

function renderPlanningReviewCard() {
  const card = $("#planningReviewCard");
  if (!card) return;
  const preview = currentPlanningPreview();
  card.hidden = !preview;
  const collaboration = $("#planningCollaboration");
  if (collaboration) collaboration.hidden = !preview;
  if (!preview) return;

  const review = readPlanningReview(preview);
  const statusNode = $("#planningReviewStatus");
  const titleNode = $("#planningReviewTitle");
  const metaNode = $("#planningReviewMeta");
  const imageNode = $("#planningReviewImage");
  const openNode = $("#planningReviewOpen");
  const factsNode = $("#planningReviewFacts");
  const noteNode = $("#planningRevisionNote");
  const approveButton = $("#approvePlanningReview");

  if (titleNode) titleNode.textContent = preview.title;
  if (metaNode) metaNode.textContent = `${preview.dimensions} · ${preview.targetLength}`;
  if (imageNode) imageNode.src = preview.imageUrl;
  if (openNode) openNode.href = preview.viewerUrl;
  if (factsNode) factsNode.innerHTML = [preview.structure, preview.referenceBasis, "정확한 문구·표·법정 정보는 승인 후 디자이너가 조판"]
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
  if (noteNode && document.activeElement !== noteNode) noteNode.value = review.note || "";
  if (statusNode) {
    statusNode.className = "planning-review-status";
    if (review.status === "approved") {
      statusNode.classList.add("is-approved");
      statusNode.textContent = "✓ 검수 완료";
    } else if (review.status === "revision") {
      statusNode.classList.add("is-revision");
      statusNode.textContent = "수정 요청";
    } else {
      statusNode.textContent = "검수 전";
    }
    if (review.updatedAt) statusNode.title = `최근 저장 ${review.updatedAt}`;
  }
  if (approveButton) approveButton.textContent = review.status === "approved" ? "관리자 검수 완료됨" : "관리자 검수 완료";
  renderPlanningCollaboration(preview);
}

function planningFeedbackStorageKey(preview = currentPlanningPreview()) {
  const project = activeCustomerProject();
  const projectId = project?.id || currentProjectKey();
  return preview ? `planningFeedback:${preview.id}:${projectId}` : "";
}

function readPlanningFeedback(preview = currentPlanningPreview()) {
  const key = planningFeedbackStorageKey(preview);
  if (!key) return { comments: [], strokes: [], confirmation: { status: "idle", updatedAt: "" } };
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      comments: Array.isArray(value.comments) ? value.comments : [],
      strokes: Array.isArray(value.strokes) ? value.strokes : [],
      confirmation: value.confirmation || { status: "idle", updatedAt: "" },
      updatedAt: value.updatedAt || "",
    };
  } catch {
    return { comments: [], strokes: [], confirmation: { status: "idle", updatedAt: "" } };
  }
}

function writePlanningFeedback(patch = {}, preview = currentPlanningPreview()) {
  const key = planningFeedbackStorageKey(preview);
  if (!key) return null;
  const current = readPlanningFeedback(preview);
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(next));
  renderPlanningCollaboration(preview);
  return next;
}

function planningPhoneLast4(project = activeCustomerProject()) {
  return String(project?.phone || project?.contactInfo || "").replace(/\D/g, "").slice(-4);
}

function planningReceipt(project = activeCustomerProject()) {
  return String(project?.receiptNo || project?.cloudReceiptNo || project?.cloudSubmissionId || project?.id || "").trim();
}

function planningCustomerReviewUrl(preview = currentPlanningPreview()) {
  const project = activeCustomerProject();
  if (!preview || !project) return "customer-review.html";
  const query = new URLSearchParams({
    projectId: project.id,
    previewId: preview.id,
    draft: preview.viewerUrl,
    receipt: planningReceipt(project),
  });
  return `customer-review.html?${query.toString()}`;
}

function renderPlanningCollaboration(preview = currentPlanningPreview()) {
  const target = $("#planningCollaboration");
  if (!target) return;
  target.hidden = !preview;
  if (!preview) return;
  const feedback = readPlanningFeedback(preview);
  const showComments = $("#toggleCustomerComments")?.checked !== false;
  const comments = showComments ? feedback.comments : [];
  const list = $("#planningCommentList");
  const count = $("#planningCommentCount");
  if (count) count.textContent = showComments
    ? `고객 코멘트 ${feedback.comments.length}개 · 브러시 ${feedback.strokes.length}개`
    : "고객 코멘트 숨김";
  if (list) list.innerHTML = comments.length
    ? comments.map((item, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><div><strong>${escapeHtml(item.text || "브러시 표시")}</strong><span>${escapeHtml(item.createdAt || "")}</span></div></li>`).join("")
    : `<li class="empty">${showComments ? "아직 고객이 남긴 코멘트가 없습니다." : "고객 코멘트 표시가 꺼져 있습니다."}</li>`;

  const confirmation = feedback.confirmation || {};
  const statusText = {
    requested: "고객 컨펌 요청 중",
    confirmed: "✓ 고객 컨펌 완료",
    recalled: "컨펌 요청 회수됨",
    idle: "아직 고객 컨펌을 요청하지 않았습니다.",
  }[confirmation.status || "idle"];
  const statusNode = $("#planningConfirmStatus");
  if (statusNode) {
    statusNode.textContent = `${statusText}${confirmation.updatedAt ? ` · ${confirmation.updatedAt}` : ""}`;
    statusNode.dataset.status = confirmation.status || "idle";
  }
  const reviewLink = $("#openCustomerReview");
  if (reviewLink) reviewLink.href = planningCustomerReviewUrl(preview);
  const project = activeCustomerProject();
  const receipt = planningReceipt(project) || "접수번호 미발급";
  const last4 = planningPhoneLast4(project) || "전화번호 확인 필요";
  const guide = $("#planningAccessGuide");
  if (guide) guide.value = `${receipt} / 연락처 뒤 4자리 ${last4}`;
}

function requestPlanningConfirmation() {
  const preview = currentPlanningPreview();
  if (!preview) return;
  const now = new Date().toLocaleString("ko-KR");
  writePlanningFeedback({ confirmation: { status: "requested", updatedAt: now } }, preview);
  const project = activeCustomerProject();
  if (project) {
    const updated = { ...project, status: "고객 컨펌 대기", workflow: { ...(project.workflow || {}), firstDraftConfirmation: { status: "requested", at: new Date().toISOString() } } };
    persistCustomerProject(updated);
  }
  updateAiStatus("고객 컨펌 요청 상태로 변경했습니다. 고객 화면 링크와 접수번호를 전달하세요.");
}

function recallPlanningConfirmation() {
  const preview = currentPlanningPreview();
  if (!preview) return;
  const now = new Date().toLocaleString("ko-KR");
  writePlanningFeedback({ confirmation: { status: "recalled", updatedAt: now } }, preview);
  const project = activeCustomerProject();
  if (project) {
    const updated = { ...project, status: "1차 시안 보완 중", workflow: { ...(project.workflow || {}), firstDraftConfirmation: { status: "recalled", at: new Date().toISOString() } } };
    persistCustomerProject(updated);
  }
  updateAiStatus("고객 컨펌 요청을 회수했습니다. 관리자 코멘트와 고객 피드백을 보완한 뒤 다시 요청할 수 있습니다.");
}

function createPlanningRevisionJob() {
  const preview = currentPlanningPreview();
  const project = activeCustomerProject();
  if (!preview || !project) {
    alert("프로젝트와 1차 시안을 먼저 불러와주세요.");
    return;
  }
  const feedback = readPlanningFeedback(preview);
  const managerNote = $("#planningRevisionNote")?.value.trim() || "없음";
  const customerNotes = feedback.comments.length
    ? feedback.comments.map((item, index) => `${index + 1}. ${item.text || "브러시 표시"}`).join("\n")
    : "없음";
  const contents = `# 1차 시안 부분 보완 지시서\n\n- 프로젝트: ${project.productName || "미기입"}\n- 시안: ${preview.title}\n- 원칙: 완성 상세페이지를 만들지 말고 촬영·구성·조판 기획서만 부분 보완한다.\n- 유지: 고객이 수정 요청하지 않은 섹션, 고객 원본 사실, 제품 패키지 형태\n- 금지: 임의 효능·인증·수치·후기 추가, 완성 디자인으로 변경\n\n## 고객 브러시·코멘트\n\n${customerNotes}\n\n## 관리자 통화·메신저 코멘트\n\n${managerNote}\n\n## 실행\n\n위 요청이 연결된 섹션만 수정하고, 변경 전후와 수정 근거를 기록한 뒤 같은 1차 시안 형식으로 새 버전을 저장한다.\n`;
  downloadTextFile(`${project.productName || "프로젝트"}_1차시안_부분보완.md`, contents, "text/markdown;charset=utf-8");
  updateAiStatus("고객·관리자 코멘트를 합친 Codex 부분 보완 지시서를 만들었습니다.");
}

function prepareFirstPlanningDraft() {
  if (!ensureProjectReviewApprovedForGeneration()) return;
  const preview = currentPlanningPreview();
  if (!preview) {
    alert("이 프로젝트의 1차 촬영·디자인 시안 템플릿이 아직 등록되지 않았습니다.");
    return;
  }
  const project = activeCustomerProject();
  if (project) {
    const updated = { ...project, status: "1차 시안 완료", workflow: { ...(project.workflow || {}), firstDraft: { status: "generated", at: new Date().toISOString(), previewId: preview.id } } };
    persistCustomerProject(updated);
  }
  renderPlanningReviewCard();
  window.open(preview.viewerUrl, "_blank", "noopener,noreferrer");
  updateAiStatus("1차 시안은 촬영·구성·디자인 기획서로 생성했습니다. 실제 촬영 결과를 반영한 완성 상세페이지는 다음 단계에서 제작합니다.");
}

function savePlanningRevision() {
  const preview = currentPlanningPreview();
  if (!preview) return;
  const note = $("#planningRevisionNote")?.value.trim() || "";
  if (!note) {
    alert("수정할 내용을 먼저 입력해주세요.");
    return;
  }
  writePlanningReview({ status: "revision", note }, preview);
  updateAiStatus("기획안 수정 메모를 현재 프로젝트에 저장했습니다.");
}

function approvePlanningReview() {
  const preview = currentPlanningPreview();
  if (!preview) return;
  const note = $("#planningRevisionNote")?.value.trim() || "";
  writePlanningReview({ status: "approved", note }, preview);
  updateAiStatus("1차 촬영·디자인 시안의 관리자 검수를 완료했습니다. 고객 컨펌을 요청하거나 실제 제작 단계로 이동할 수 있습니다.");
}

function planningReviewApproved() {
  const preview = currentPlanningPreview();
  return !preview || readPlanningReview(preview).status === "approved";
}

function ensurePlanningReviewApproved() {
  const preview = currentPlanningPreview();
  if (!preview || planningReviewApproved()) return true;
  showPanel("drafts");
  renderPlanningReviewCard();
  const card = $("#planningReviewCard");
  card?.scrollIntoView({ behavior: "smooth", block: "start" });
  card?.classList.add("needs-attention");
  window.setTimeout(() => card?.classList.remove("needs-attention"), 1600);
  alert("등록된 1차 촬영·디자인 시안을 먼저 확인하고 ‘관리자 검수 완료’를 눌러주세요.");
  return false;
}

function renderCustomerProjects() {
  const list = $("#customerProjectList");
  if (!list) return;
  const projects = readCustomerProjects();
  if (!projects.length) {
    list.textContent = "아직 접수된 고객 작성 내용이 없습니다.";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(projects.length / CUSTOMER_PROJECTS_PER_PAGE));
  currentCustomerProjectPage = Math.min(Math.max(1, currentCustomerProjectPage), totalPages);
  const pageStart = (currentCustomerProjectPage - 1) * CUSTOMER_PROJECTS_PER_PAGE;
  const visibleProjects = projects.slice(pageStart, pageStart + CUSTOMER_PROJECTS_PER_PAGE);
  const statuses = ["신규 접수", "확인 중", "검수 완료", "기획 생성", "시안 제작", "고객 회신 대기", "완료"];
  const projectCards = visibleProjects.map((project) => {
    const readiness = customerProjectReadiness(project);
    const planningPreview = planningPreviewForProject(project);
    const receipt = planningReceipt(project);
    const verify = planningPhoneLast4(project);
    const progressUrl = "https://hao-admin.vigo.co.kr/track.html";
    const cloudStatus = project.workflow?.cloudSync?.status || "local-only";
    const storageText = cloudStatus === "synced"
      ? "브라우저 + 접수 서버 저장 완료"
      : cloudStatus === "failed"
        ? "브라우저 보관 완료 · 서버 재전송 대기"
        : "브라우저 보관 · 접수 서버 연결 필요";
    const readinessText = readiness.missing.length
      ? `보완 필요: ${escapeHtml(readiness.missing.join(", "))}`
      : "바로 시안 생성 가능";
    const fieldCompletion = `<div class="field-completion" aria-label="고객 작성 항목 확인">
      ${readiness.fields.map((field) => `
        <span class="${field.complete ? "complete" : "missing"}">
          <i aria-hidden="true">${field.complete ? "✓" : "○"}</i>
          ${escapeHtml(field.label)}
          ${field.complete ? "" : "<small>미입력</small>"}
        </span>
      `).join("")}
    </div>`;
    return `
      <article class="lead-item ${readiness.missing.length ? "has-missing-fields" : "is-ready"}">
        <div>
          <strong>${escapeHtml(project.productName || "제품명 미입력")}</strong>
          <p>${escapeHtml(project.clientName || "브랜드명 미입력")} · ${escapeHtml(project.category || "카테고리 미선택")} · ${escapeHtml(project.savedAt || "")}</p>
          <p>상태: ${escapeHtml(project.status || "신규 접수")}</p>
          <p class="project-progress-access">접수번호 <b>${escapeHtml(receipt || "미발급")}</b> · 연락처 뒤 4자리 <b>${escapeHtml(verify || "미등록")}</b> · <a href="${escapeHtml(progressUrl)}" target="_blank" rel="noopener">고객 진행조회</a></p>
          <p class="project-storage-line ${escapeHtml(cloudStatus)}"><i aria-hidden="true"></i>${storageText}</p>
          <p class="readiness-line"><b>시안 준비도 ${readiness.score}%</b> · ${readinessText}</p>
          ${planningPreview ? `<p class="planning-available-line">✓ 제작 전 기획안 등록 · ${escapeHtml(planningPreview.dimensions)}</p>` : ""}
          ${fieldCompletion}
        </div>
        <div class="lead-actions">
          <select class="status-select customer-project-status" data-id="${escapeHtml(project.id)}">
            ${statuses.map((status) => `<option ${status === project.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
          <button class="secondary small import-customer-project" data-id="${escapeHtml(project.id)}">불러오기</button>
          ${planningPreview ? `<button class="secondary small open-project-planning" data-id="${escapeHtml(project.id)}">기획안 확인</button>` : ""}
          <div class="project-manage">
            <button class="secondary small project-manage-toggle" type="button" data-id="${escapeHtml(project.id)}" aria-expanded="false">프로젝트 관리</button>
            <div class="project-manage-menu" hidden>
              <button type="button" data-project-action="summary" data-id="${escapeHtml(project.id)}">↓ 1차 내용정리본 받기</button>
              <button type="button" data-project-action="complete" data-id="${escapeHtml(project.id)}">✓ 완료 처리</button>
              <button type="button" data-project-action="reopen" data-id="${escapeHtml(project.id)}">↺ 신규 접수로 변경</button>
              <button class="danger" type="button" data-project-action="delete" data-id="${escapeHtml(project.id)}">접수 내용 삭제</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
  const pagination = totalPages > 1 ? `
    <nav class="customer-project-pagination" aria-label="고객 프로젝트 페이지">
      <button type="button" data-customer-page="${currentCustomerProjectPage - 1}" ${currentCustomerProjectPage === 1 ? "disabled" : ""} aria-label="이전 페이지">‹</button>
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        return `<button type="button" data-customer-page="${page}" class="${page === currentCustomerProjectPage ? "active" : ""}" ${page === currentCustomerProjectPage ? 'aria-current="page"' : ""}>${page}</button>`;
      }).join("")}
      <button type="button" data-customer-page="${currentCustomerProjectPage + 1}" ${currentCustomerProjectPage === totalPages ? "disabled" : ""} aria-label="다음 페이지">›</button>
    </nav>
  ` : "";
  list.innerHTML = projectCards + pagination;

  $$(".customer-project-status").forEach((select) => {
    select.addEventListener("change", () => updateCustomerProjectStatus(select.dataset.id, select.value));
  });
  $$(".import-customer-project").forEach((button) => {
    button.addEventListener("click", () => importCustomerProjectById(button.dataset.id));
  });
  $$(".open-project-planning").forEach((button) => {
    button.addEventListener("click", () => {
      importCustomerProjectById(button.dataset.id);
      showPanel("drafts");
      renderPlanningReviewCard();
    });
  });
  $$(".project-manage-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = button.nextElementSibling;
      const willOpen = menu?.hidden;
      $$(".project-manage-menu").forEach((item) => { item.hidden = true; });
      $$(".project-manage-toggle").forEach((item) => item.setAttribute("aria-expanded", "false"));
      if (menu && willOpen) {
        menu.hidden = false;
        button.setAttribute("aria-expanded", "true");
      }
    });
  });
  $$(".customer-project-pagination [data-customer-page]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      currentCustomerProjectPage = Number(button.dataset.customerPage) || 1;
      renderCustomerProjects();
      list.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  });
}

async function updateCustomerProjectStatus(id, status) {
  const projects = readCustomerProjects().map((project) => project.id === id ? { ...project, status } : project);
  writeCustomerProjects(projects);
  const active = readCustomerProject();
  if (active?.id === id) {
    localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify({ ...active, status }));
  }
  renderCustomerProjects();
  renderProjectReviewGate();
  const changed = projects.find((project) => project.id === id);
  if (changed?.cloudSubmissionId && window.haoSubmissionSync?.updateProjectState) {
    try {
      await window.haoSubmissionSync.updateProjectState(changed);
      updateAiStatus("프로젝트 진행 상태를 중앙 서버에 저장했습니다.");
    } catch (error) {
      if (error?.status === 401 && window.haoSubmissionSync?.setAdminToken) {
        const supplied = window.prompt("중앙 서버 관리자 비밀번호를 입력해주세요.", "") || "";
        if (supplied.trim()) {
          window.haoSubmissionSync.setAdminToken(supplied);
          return updateCustomerProjectStatus(id, status);
        }
      }
      updateAiStatus(error?.message || "중앙 서버 상태 저장에 실패했습니다. 로컬 변경은 유지됩니다.");
    }
  }
}

function requestCustomerProjectDeletion(id) {
  const projects = readCustomerProjects();
  const target = projects.find((project) => project.id === id);
  if (!target) return;
  pendingDeleteProjectId = id;
  const dialog = $("#projectDeleteDialog");
  if ($("#projectDeleteName")) {
    $("#projectDeleteName").textContent = target.productName || target.clientName || "선택한 프로젝트";
  }
  const confirmation = $("#projectDeleteConfirmText");
  if (confirmation) {
    confirmation.value = "";
    confirmation.placeholder = target.productName || target.projectName || target.clientName || target.companyName || "프로젝트명";
  }
  if ($("#projectDeleteError")) $("#projectDeleteError").textContent = "";
  if (dialog?.showModal) dialog.showModal();
}

async function permanentlyDeleteCustomerProject() {
  const id = pendingDeleteProjectId;
  if (!id) return;
  const projects = readCustomerProjects();
  const target = projects.find((project) => project.id === id);
  if (!target) return;
  const confirmName = String(target.productName || target.projectName || target.clientName || target.companyName || "").trim();
  const typedName = String($("#projectDeleteConfirmText")?.value || "").trim();
  const errorNode = $("#projectDeleteError");
  if (!confirmName || typedName !== confirmName) {
    if (errorNode) errorNode.textContent = `확인을 위해 “${confirmName || "프로젝트명"}”을 정확히 입력해주세요.`;
    return;
  }
  const confirmButton = $("#confirmProjectDelete");
  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "서버 확인 중…";
  }
  try {
    if (target.cloudSubmissionId && window.haoSubmissionSync?.isConfigured?.()) {
      try {
        await window.haoSubmissionSync.permanentlyDeleteProject(target, confirmName);
      } catch (error) {
        if (error?.status === 401 && window.haoSubmissionSync?.setAdminToken) {
          const supplied = window.prompt("영구삭제 권한 확인을 위해 중앙 서버 관리자 비밀번호를 입력해주세요.", "") || "";
          if (supplied.trim()) {
            window.haoSubmissionSync.setAdminToken(supplied);
            await window.haoSubmissionSync.permanentlyDeleteProject(target, confirmName);
          } else {
            throw new Error("관리자 인증이 취소되어 삭제하지 않았습니다.");
          }
        } else {
          throw error;
        }
      }
    }
  const remaining = projects.filter((project) => project.id !== id);
  writeCustomerProjects(remaining);
  const active = readCustomerProject();
  if (active?.id === id) {
    if (remaining[0]) {
      localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(remaining[0]));
    } else {
      localStorage.removeItem(CUSTOMER_PROJECT_KEY);
    }
  }
  localStorage.removeItem(`detailAiArtifacts:${id}`);
    await window.customerFileStore?.deleteProjectFiles(id).catch(() => {});
  pendingDeleteProjectId = "";
  $("#projectDeleteDialog")?.close();
  renderCustomerProjects();
  updateWorkflowState();
    updateAiStatus(target.cloudSubmissionId ? "중앙 서버와 현재 브라우저에서 프로젝트를 영구 삭제했습니다." : "현재 브라우저의 로컬 프로젝트를 영구 삭제했습니다.");
  } catch (error) {
    if (errorNode) errorNode.textContent = error?.message || "삭제하지 못했습니다. 서버 연결과 관리자 권한을 확인해주세요.";
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "예, 영구 삭제";
    }
  }
}

function handleProjectManagement(event) {
  const actionButton = event.target.closest("[data-project-action]");
  if (!actionButton) {
    if (!event.target.closest(".project-manage")) {
      $$(".project-manage-menu").forEach((menu) => { menu.hidden = true; });
      $$(".project-manage-toggle").forEach((button) => button.setAttribute("aria-expanded", "false"));
    }
    return;
  }
  const { projectAction: action, id } = actionButton.dataset;
  if (action === "summary") {
    const project = readCustomerProjects().find((item) => item.id === id);
    downloadCurrentContentSummary(project);
  }
  if (action === "complete") updateCustomerProjectStatus(id, "완료");
  if (action === "reopen") updateCustomerProjectStatus(id, "신규 접수");
  if (action === "delete") requestCustomerProjectDeletion(id);
}

function importCustomerProjectById(id) {
  const project = readCustomerProjects().find((item) => item.id === id);
  if (!project) return;
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
  importCustomerProject();
  renderCustomerAssetBoxes(project);
  if (!projectManagerReviewApproved(project)) {
    updateCustomerProjectStatus(id, "확인 중");
  }
  renderProjectReviewGate(readCustomerProject());
  renderPlanningReviewCard();
}

async function renderCustomerAssetBoxes(project = readCustomerProject()) {
  currentCustomerAssetProject = project || null;
  let records = [];
  if (project?.id && window.customerFileStore) {
    try {
      records = await window.customerFileStore.listProjectFiles(project.id);
    } catch (error) {
      console.warn("고객 제출 파일을 불러오지 못했습니다.", error);
    }
  }
  currentCustomerAssetRecords = records;
  const legacyGroups = {
    productImages: project?.productImages || [],
    brandLogo: project?.brandLogo || [],
    referenceFiles: project?.referenceFiles || [],
  };
  $$("[data-customer-assets]").forEach((button) => {
    const group = button.dataset.customerAssets;
    const stored = records.filter((record) => record.group === group);
    const remoteFiles = Array.from(project?.cloudFiles || []).filter((record) => record.group === group);
    const legacyNames = stored.length ? [] : Array.from(legacyGroups[group] || []);
    const folderCount = Number(project?.assetFolderCounts?.[group] || 0);
    const count = stored.length || remoteFiles.length || folderCount || legacyNames.length;
    button.classList.toggle("has-files", count > 0);
    const storageLabel = stored.length ? "브라우저" : remoteFiles.length ? "서버" : "분류폴더";
    button.querySelector("span").textContent = count ? `자료있음 · ${count}개 · ${storageLabel}` : "자료없음";
    button.dataset.legacyNames = legacyNames.join("|");
  });
}

function closeCustomerAssetsDialog() {
  customerAssetObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  customerAssetObjectUrls = [];
  $("#customerAssetsDialog")?.close();
}

function resolveCustomerFolderFileUrl(project, group, name, folderPath) {
  const configuredUrl = project?.assetWebPaths?.[group]?.[name];
  if (configuredUrl) return configuredUrl;

  const isHoabiProject =
    String(project?.seedVersion || "").startsWith("hoabi-complete-") ||
    String(project?.productName || "").includes("호아비 리치꿀스틱");
  if (isHoabiProject) {
    const hoabiWebAssets = {
      productImages: {
        "20251217 호아비 누끼 001.png": "assets/hoabi-mybox/hoabi-stick-single-crop.png",
        "20251217 호아비 누끼 003.png": "assets/hoabi-mybox/hoabi-open-box-30p-crop.png",
        "20251218 호아비 누끼 001.png": "assets/hoabi-mybox/hoabi-package-front-crop.png",
        "20251218 호아비 누끼 002.png": "assets/hoabi-mybox/hoabi-box-yellow-crop.png",
        "20251218 호아비 누끼 003.png": "assets/hoabi-mybox/hoabi-box-pink-crop.png",
        "20251218 호아비 누끼 004.png": "assets/hoabi-mybox/hoabi-shopping-bag-crop.png",
        "hoabi-lifestyle-package.jfif": "assets/hoabi-product/hoabi-lifestyle-package.jfif",
      },
      brandLogo: {
        "hoabi-product-info.jpg": "assets/hoabi-mybox/hoabi-product-info.jpg",
      },
      referenceFiles: {},
    };
    const mappedUrl = hoabiWebAssets[group]?.[name];
    if (mappedUrl) return mappedUrl;
  }

  const filePath = `${String(folderPath || "").replace(/\\/g, "/")}/${name}`;
  return encodeURI(`file:///${filePath}`);
}

function openCustomerAssetsDialog(group) {
  const folderPath = currentCustomerAssetProject?.assetFolderPaths?.[group];
  const labels = { productImages: "제품 이미지", brandLogo: "로고·스펙 자료", referenceFiles: "참고 이미지" };
  const button = $(`[data-customer-assets="${group}"]`);
  const records = currentCustomerAssetRecords.filter((record) => record.group === group);
  const remoteFiles = Array.from(currentCustomerAssetProject?.cloudFiles || []).filter((record) => record.group === group);
  const legacyNames = String(button?.dataset.legacyNames || "").split("|").filter(Boolean);
  const folderFiles = Array.from(currentCustomerAssetProject?.assetFolderFiles?.[group] || []);
  $("#customerAssetsTitle").textContent = labels[group] || "고객 제출 자료";
  const list = $("#customerAssetsList");
  customerAssetObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  customerAssetObjectUrls = [];

  if (!records.length && !remoteFiles.length && !legacyNames.length && !folderFiles.length) {
    list.innerHTML = `<div class="assets-empty"><strong>제출된 자료가 없습니다.</strong><p>고객이 작성폼에 파일을 첨부하면 이곳에서 확인할 수 있습니다.</p></div>`;
  } else if (records.length) {
    list.innerHTML = records.map((record) => {
      const url = URL.createObjectURL(record.blob);
      customerAssetObjectUrls.push(url);
      const preview = record.type.startsWith("image/")
        ? `<img src="${url}" alt="${escapeHtml(record.name)}">`
        : `<div class="file-type-preview">${escapeHtml((record.name.split(".").pop() || "FILE").toUpperCase())}</div>`;
      return `<article class="customer-asset-item">
        ${preview}
        <div><strong>${escapeHtml(record.name)}</strong><small>${Math.max(1, Math.round(record.size / 1024)).toLocaleString()} KB</small></div>
        <a href="${url}" download="${escapeHtml(record.name)}">다운로드</a>
      </article>`;
    }).join("");
  } else if (remoteFiles.length) {
    list.innerHTML = remoteFiles.map((file) => {
      const isImage = String(file.type || "").startsWith("image/");
      const preview = `<div class="file-type-preview remote">${isImage ? "IMG" : escapeHtml((file.name.split(".").pop() || "FILE").toUpperCase())}</div>`;
      return `<article class="customer-asset-item remote-file">
        ${preview}
        <div><strong>${escapeHtml(file.name)}</strong><small>접수 서버 이중 저장 · ${Math.max(1, Math.round(Number(file.size || 0) / 1024)).toLocaleString()} KB</small></div>
        <button type="button" data-remote-file-id="${escapeHtml(file.id)}">서버에서 받기</button>
      </article>`;
    }).join("");
    list.querySelectorAll("[data-remote-file-id]").forEach((downloadButton) => {
      downloadButton.addEventListener("click", async () => {
        const file = remoteFiles.find((item) => item.id === downloadButton.dataset.remoteFileId);
        if (!file || !window.haoSubmissionSync?.downloadRemoteFile) return;
        const originalText = downloadButton.textContent;
        downloadButton.disabled = true;
        downloadButton.textContent = "받는 중…";
        try {
          const blob = await window.haoSubmissionSync.downloadRemoteFile(file);
          const url = URL.createObjectURL(blob);
          customerAssetObjectUrls.push(url);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          link.click();
          downloadButton.textContent = "다운로드 완료";
        } catch (error) {
          downloadButton.textContent = error?.status === 401 ? "관리자 인증 필요" : "다시 시도";
          console.warn("서버 파일 다운로드에 실패했습니다.", error);
        } finally {
          window.setTimeout(() => {
            downloadButton.disabled = false;
            downloadButton.textContent = originalText;
          }, 1800);
        }
      });
    });
  } else if (folderFiles.length && folderPath) {
    list.innerHTML = folderFiles.map((name) => {
      const url = resolveCustomerFolderFileUrl(currentCustomerAssetProject, group, name, folderPath);
      const isWebAsset = !url.startsWith("file:///");
      const isImage = /\.(png|jpe?g|jfif|webp|gif)$/i.test(name);
      const preview = isImage
        ? `<img src="${url}" alt="${escapeHtml(name)}">`
        : `<div class="file-type-preview">${escapeHtml((name.split(".").pop() || "FILE").toUpperCase())}</div>`;
      return `<article class="customer-asset-item">
        ${preview}
        <div><strong>${escapeHtml(name)}</strong><small>03_업체 자료 · 분류 완료</small></div>
        <a href="${url}" target="_blank" rel="noopener">${isWebAsset ? "웹에서 열기" : "원본 열기"}</a>
      </article>`;
    }).join("");
  } else {
    list.innerHTML = legacyNames.map((name) => `<article class="customer-asset-item legacy">
      <div class="file-type-preview">FILE</div>
      <div><strong>${escapeHtml(name)}</strong><small>기존 접수건 · 파일명만 보관됨</small></div>
      <span>원본 없음</span>
    </article>`).join("");
  }
  $("#customerAssetsDialog")?.showModal();
}

function addHoabiCustomerTest(silent = false) {
  const projects = readCustomerProjects();
  const project = {
    id: `customer-project-${Date.now()}`,
    seedVersion: "hoabi-complete-v6-progress",
    customerInputVersion: "wizard-intake-v1",
    source: "고객 작성폼 완성 예시",
    status: "신규 접수",
    savedAt: new Date().toLocaleString("ko-KR"),
    companyName: "호아비",
    clientName: "호아비",
    productName: "호아비 리치꿀스틱 30포",
    category: "식품/건강식품",
    channel: "자사몰, 스마트스토어, 오픈마켓",
    contactName: "호아비 담당자",
    contactInfo: "010-1234-5678",
    phone: "010-1234-5678",
    email: "hoabee@example.com",
    dueDate: "2026-08-15",
    heroSentence: "하루 한 포에 담은 달콤한 리치와 프리미엄 꿀",
    coreStrength: "베트남 리치 원료와 프리미엄 꿀을 한 포에 담아 언제 어디서나 간편하게 즐길 수 있는 30포 스틱형 제품입니다.",
    productionTrust: "원료 입고부터 배합, 충진, 포장까지 체계적인 품질 관리 기준으로 생산하며 관련 원료·제조 자료를 상세페이지 신뢰 구간에 배치합니다.",
    purchaseBenefit: "30포 한 박스로 한 달 루틴을 간편하게 시작할 수 있고, 고급 패키지 구성으로 부모님과 지인 선물용으로도 적합합니다.",
    reviewKeywords: "개별 포장이라 휴대가 편해요, 달콤해서 부담 없이 먹기 좋아요, 패키지가 고급스러워 선물하기 좋아요",
    seoKeyword: "리치꿀스틱, 꿀스틱 30포, 부모님 건강 선물, 휴대용 꿀스틱",
    referenceUrls: "기존 호아비 리치꿀스틱 상세페이지\n브랜드 제공 제품 및 패키지 이미지",
    styleTone: "고급스럽고 신뢰감 있는 프리미엄 정보형",
    oneLine: "베트남 리치와 프리미엄 꿀을 담은 스틱형 건강식품",
    features: "실제 상세페이지 분석 기준: 30포 구성의 개별 스틱 포장 제품. 리치 원료, 꿀, 휴대성, 간편 섭취, 선물용 패키지, 제품 신뢰 자료가 주요 흐름으로 구성되어 있습니다. 기존 상세페이지는 메인 비주얼 → 원료 스토리 → 섭취 편의성 → 활용 장면 → 선물성 → 신뢰/인증 자료 → 제품 정보 순서입니다.",
    targetCustomer: "건강을 챙기고 싶은 30~60대 고객, 부모님 선물 구매층, 바쁜 직장인, 간편한 데일리 건강 루틴을 원하는 고객",
    emphasis: "리치 원료와 꿀의 조합, 30포 구성, 휴대가 간편한 스틱형, 선물용 패키지, 기존 상세페이지의 고급 오렌지/골드 톤, 신뢰 자료 영역",
    mustInclude: "리치꿀스틱, 30포 구성, 휴대가 간편한 스틱형, 프리미엄 원료, 선물용 패키지, 제품 정보/주의사항",
    mood: ["고급스럽고 신뢰감 있는 느낌", "따뜻하고 감성적인 느낌"],
    structure: ["브랜드 스토리 중심", "제품 설명 중심", "선물용 이미지 강조", "후기와 신뢰 요소 강조"],
    colorTone: ["밝고 깨끗한 톤", "고급스러운 톤"],
    imageStyle: ["원료와 소재 강조", "패키지 강조", "아이콘과 카드 정보 활용"],
    imageAssets: ["기존 상세페이지 이미지 있음", "패키지 사진 있음", "연출컷 있음", "촬영 필요", "합성 필요"],
    productImages: ["hoabi-lifestyle-package.jfif", "hoabi-stick-cut.jfif"],
    referenceFiles: [],
    assetFolderPaths: {
      productImages: "C:\\Users\\kimbj\\OneDrive\\문서\\상세페이지 자동화 시스템\\상세페이지 관리자툴\\상세페이지 제작물\\호아비_리치꿀스틱_30포\\03_업체 자료\\01_제품 이미지",
      brandLogo: "C:\\Users\\kimbj\\OneDrive\\문서\\상세페이지 자동화 시스템\\상세페이지 관리자툴\\상세페이지 제작물\\호아비_리치꿀스틱_30포\\03_업체 자료\\02_로고스펙 자료",
      referenceFiles: "C:\\Users\\kimbj\\OneDrive\\문서\\상세페이지 자동화 시스템\\상세페이지 관리자툴\\상세페이지 제작물\\호아비_리치꿀스틱_30포\\03_업체 자료\\03_참고 이미지",
    },
    assetFolderCounts: { productImages: 7, brandLogo: 1, referenceFiles: 0 },
    assetFolderFiles: {
      productImages: [
        "20251217 호아비 누끼 001.png",
        "20251217 호아비 누끼 003.png",
        "20251218 호아비 누끼 001.png",
        "20251218 호아비 누끼 002.png",
        "20251218 호아비 누끼 003.png",
        "20251218 호아비 누끼 004.png",
        "hoabi-lifestyle-package.jfif",
      ],
      brandLogo: ["hoabi-product-info.jpg"],
      referenceFiles: [],
    },
    imageMemo: "원본 상세페이지 파일: C:/Users/mycom/Desktop/2512_호아비리치꿀스틱_(30P)_최종.jpg. 자동화 테스트용으로 assets/hoabi-detail 폴더에 12개 구간 이미지로 분할 저장했습니다. 추가 제품 사진은 assets/hoabi-product/hoabi-lifestyle-package.jfif, assets/hoabi-product/hoabi-stick-cut.jfif 입니다. 초안에는 제공 사진을 우선 배치하고, 최종 제작 시 패키지 대표컷, 원료 합성컷, 섭취컷, 선물 연출컷을 새로 촬영/합성하는 방향이 좋습니다.",
    avoidStyle: ["과한 광고 느낌", "저가형 느낌", "의약품처럼 보이는 표현"],
    clientRequests: "기존 상세페이지의 오렌지/골드 계열 프리미엄 분위기를 유지하되, 더 정돈된 긴 상세페이지 구조로 개선하고 싶습니다. 선물용 건강식품 느낌, 리치 원료 스토리, 스틱형 편의성을 강조해주세요.",
    banWords: "질병 치료, 면역력 향상 보장, 의약품처럼 보이는 표현, 과장 광고 문구는 피해주세요.",
    references: "기존 호아비 상세페이지 원본 이미지 및 분할 참고 이미지: assets/hoabi-detail/hoabi-section-01.jpg ~ hoabi-section-12.jpg. 제공 제품 사진: assets/hoabi-product/hoabi-lifestyle-package.jfif, assets/hoabi-product/hoabi-stick-cut.jfif. 사진 프롬프트 원본: C:/Users/mycom/Desktop/상세 사진 프롬프트.txt",
    existingDetailStructure: [
      "메인 비주얼: 오렌지/골드 그라데이션 배경, 제품 패키지와 영문 제품명 강조",
      "원료 스토리: 리치 이미지와 원료 설명",
      "브랜드 무드: Hoabee 브랜드 블랙/골드 구간",
      "제품 특징: 스틱형 구성, 간편 섭취, 1일 루틴 메시지",
      "사용 장면: 음료/요거트/일상 섭취 연출",
      "선물성: 패키지와 고급스러운 선물 이미지",
      "신뢰 자료: 서류/인증/검사 자료 영역",
      "제품 정보: 원재료, 보관, 주의사항 등 하단 정보",
    ],
    customerTouchedFields: [
      "companyName", "clientName", "productName", "category", "targetCustomer",
      "heroSentence", "coreStrength", "productionTrust", "purchaseBenefit",
      "reviewKeywords", "seoKeyword", "referenceUrls", "productImages", "referenceFiles",
    ],
    customerCompletedFields: [
      "companyName", "clientName", "productName", "category", "targetCustomer",
      "heroSentence", "coreStrength", "productionTrust", "purchaseBenefit",
      "reviewKeywords", "seoKeyword", "referenceUrls",
    ],
  };
  const existingIndex = projects.findIndex((item) =>
    String(item.seedVersion || "").startsWith("hoabi-complete-") ||
    item.productName === "호아비 리치꿀스틱 30포"
  );
  if (existingIndex >= 0) {
    project.id = projects[existingIndex].id || project.id;
    projects.splice(existingIndex, 1);
  }
  projects.unshift(project);
  writeCustomerProjects(projects);
  localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(project));
  renderCustomerProjects();
  updateWorkflowState();
  if (!silent) alert("호아비 실제 상세페이지 기반 테스트 접수건을 추가했습니다. 목록에서 불러오기를 눌러 테스트해보세요.");
}

function restoreHoabiCompleteExampleOnce() {
  const restoreKey = "customerProjectRestore:hoabi-complete-v6-progress";
  if (localStorage.getItem(restoreKey)) return;
  addHoabiCustomerTest(true);
  localStorage.setItem(restoreKey, "done");
}

function restoreImportedCustomerProjectsOnce() {
  const imports = Array.isArray(window.IMPORTED_CUSTOMER_PROJECTS)
    ? window.IMPORTED_CUSTOMER_PROJECTS
    : [];
  if (!imports.length) return;

  const projects = readCustomerProjects();
  let changed = false;
  let newestImportedProject = null;

  imports.slice().reverse().forEach((imported) => {
    const normalizedImported = window.haoWorkflow?.normalizeCustomerSubmission
      ? window.haoWorkflow.normalizeCustomerSubmission(imported)
      : imported;
    const sourceImportId = String(normalizedImported?.sourceImportId || "").trim();
    if (!sourceImportId) return;
    const importKey = `customerProjectImported:${sourceImportId}`;
    const existingIndex = projects.findIndex((project) => project.sourceImportId === sourceImportId);
    const existingProject = existingIndex >= 0 ? projects[existingIndex] : null;
    if (
      existingProject &&
      normalizedImported.sourceImportVersion &&
      existingProject.sourceImportVersion !== normalizedImported.sourceImportVersion
    ) {
      projects[existingIndex] = {
        ...normalizedImported,
        id: existingProject.id,
        savedAt: existingProject.savedAt,
        status: projectManagerReviewApproved(existingProject) ? existingProject.status : normalizedImported.status,
        workflow: projectManagerReviewApproved(existingProject) ? existingProject.workflow : normalizedImported.workflow,
      };
      changed = true;
    }
    const alreadyRegistered = existingIndex >= 0;
    if (localStorage.getItem(importKey) && alreadyRegistered) return;
    if (!alreadyRegistered) {
      const project = {
        id: `customer-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...normalizedImported,
        savedAt: new Date().toLocaleString("ko-KR"),
      };
      projects.unshift(project);
      newestImportedProject = project;
      changed = true;
    }
    localStorage.setItem(importKey, "done");
  });

  if (!changed) return;
  writeCustomerProjects(projects);
  if (newestImportedProject) {
    localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(newestImportedProject));
  }
}

async function syncCustomerProjectsFromCloud({ notify = false } = {}) {
  if (!window.haoSubmissionSync?.isConfigured?.()) {
    if (notify) updateAiStatus("온라인 접수 API가 아직 연결되지 않아 현재 브라우저와 기본 등록 프로젝트만 표시합니다.");
    renderCustomerProjects();
    return [];
  }
  try {
    const remoteProjects = await window.haoSubmissionSync.listProjects();
    const projects = readCustomerProjects();
    remoteProjects.forEach((remote, index) => {
      const normalized = window.haoWorkflow?.normalizeCustomerSubmission
        ? window.haoWorkflow.normalizeCustomerSubmission(remote)
        : remote;
      const remoteId = String(remote.cloudSubmissionId || remote.submissionId || remote.id || `remote-${index}`);
      const existingIndex = projects.findIndex((item) =>
        String(item.cloudSubmissionId || item.submissionId || "") === remoteId
        || (remote.sourceImportId && item.sourceImportId === remote.sourceImportId),
      );
      const incoming = {
        ...normalized,
        id: existingIndex >= 0 ? projects[existingIndex].id : `customer-project-cloud-${remoteId}`,
        cloudSubmissionId: remoteId,
        savedAt: remote.savedAt || new Date().toLocaleString("ko-KR"),
      };
      if (existingIndex >= 0) {
        const local = projects[existingIndex];
        projects[existingIndex] = projectManagerReviewApproved(local)
          ? { ...incoming, status: local.status, workflow: local.workflow, contentSummary: local.contentSummary, contentSummaryText: local.contentSummaryText }
          : incoming;
      } else {
        projects.unshift(incoming);
      }
    });
    writeCustomerProjects(projects);
    renderCustomerProjects();
    if (notify) updateAiStatus(`온라인 고객 접수 ${remoteProjects.length}건을 동기화했습니다.`);
    return remoteProjects;
  } catch (error) {
    if (notify && error?.status === 401 && window.haoSubmissionSync?.setAdminToken) {
      const supplied = window.prompt("접수 서버 관리자 비밀번호를 입력해주세요.", "") || "";
      if (supplied.trim()) {
        window.haoSubmissionSync.setAdminToken(supplied);
        return syncCustomerProjectsFromCloud({ notify: true });
      }
    }
    renderCustomerProjects();
    if (notify) updateAiStatus(error?.message || "온라인 고객 접수를 불러오지 못했습니다.");
    return [];
  }
}

function currentProjectData() {
  return {
    id: `project-${Date.now()}`,
    savedAt: new Date().toLocaleString("ko-KR"),
    status: "AI 기획 완료",
    clientName: value("clientName"),
    productName: value("productName"),
    category: value("category"),
    channel: value("channel"),
    customerType: value("customerType") || "new",
    productionRoute: value("productionRoute") || "figma",
    dueDate: value("dueDate"),
    oneLine: value("oneLine"),
    consultSummary: value("consultSummary"),
    clientRequests: value("clientRequests"),
    emphasis: value("emphasis"),
    banWords: value("banWords"),
    mustInclude: value("mustInclude"),
    references: value("references"),
    contentRatio: value("contentRatio"),
    optionMemo: value("optionMemo"),
    direction: selected("direction"),
    target: selected("target"),
    goal: selected("goal"),
    highlight: selected("highlight"),
    avoid: selected("avoid"),
    usp: selected("usp"),
    layoutA: $("#templateA").textContent.trim(),
    layoutB: $("#templateB").textContent.trim(),
    draftTone: value("draftTone"),
    draftImagePosition: value("draftImagePosition"),
    draftDensity: value("draftDensity"),
    draftMainCopy: value("draftMainCopy"),
    activeSectionDraft,
    sectionEdits,
    sectionOrders,
    planResult: $("#planResult").textContent,
    draftA: $("#draftA").innerText,
    draftB: $("#draftB").innerText,
    clientMail: $("#clientMailResult").textContent,
    clientPreflight: $("#clientPreflightResult")?.innerText || "",
    aiWorkflowRuns: readAiWorkflowRuns().filter((run) => run.projectKey === currentProjectKey()).slice(0, 20),
    aiArtifacts: readAiArtifacts(),
    designWorkflow: currentDesignWorkflow,
    aiQualityReview: $("#aiQualityReview")?.textContent || "",
    revision: $("#revisionResult")?.textContent || "",
    revisionMail: $("#revisionMailResult")?.textContent || "",
    handoff: $("#handoffResult").textContent,
    finalMail: $("#finalMail").textContent,
  };
}

function saveCurrentProject() {
  const project = currentProjectData();
  if (!project.productName) {
    alert("제품명을 입력하거나 접수건을 불러온 뒤 저장해주세요.");
    return;
  }
  const projects = readProjects();
  projects.unshift(project);
  writeProjects(projects);
  renderProjects();
  alert("현재 프로젝트를 저장했습니다.");
}

function renderProjects() {
  const list = $("#projectList");
  if (!list) return;
  const projects = readProjects();
  if (!projects.length) {
    list.textContent = "아직 저장된 프로젝트가 없습니다.";
    return;
  }
  list.innerHTML = projects.map((project) => `
    <article class="lead-item">
      <div>
        <strong>${escapeHtml(project.productName || "제품명 미입력")}</strong>
        <p>${escapeHtml(project.clientName || "고객사 미입력")} · ${escapeHtml(project.savedAt || "")}</p>
        <p>${escapeHtml(productionRouteConfig(project.productionRoute || "figma", project.customerType || "new").customerLabel)} · ${escapeHtml(productionRouteConfig(project.productionRoute || "figma", project.customerType || "new").name)}</p>
        <p>상태: ${escapeHtml(project.status || "저장됨")} · A안 ${escapeHtml(project.layoutA || "")} / B안 ${escapeHtml(project.layoutB || "")}</p>
      </div>
      <div class="lead-actions">
        <select class="status-select project-status" data-id="${escapeHtml(project.id)}">
          ${["1차 기획 완료", "1차 시안 완료", "고객 컨펌 대기", "1차 시안 보완 중", "실제 제작 중", "내부 검수 중", "최종 납품 준비", "완료"].map((status) => `<option ${status === project.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="secondary small load-project" data-id="${escapeHtml(project.id)}">열기</button>
      </div>
    </article>
  `).join("");
  $$(".project-status").forEach((select) => {
    select.addEventListener("change", () => updateProjectStatus(select.dataset.id, select.value));
  });
  $$(".load-project").forEach((button) => {
    button.addEventListener("click", () => loadProject(button.dataset.id));
  });
}

function updateProjectStatus(id, status) {
  const projects = readProjects().map((project) => project.id === id ? { ...project, status } : project);
  writeProjects(projects);
  renderProjects();
}

function loadProject(id) {
  const project = readProjects().find((item) => item.id === id);
  if (!project) return;
  $("#clientName").value = project.clientName || "";
  $("#productName").value = project.productName || "";
  $("#category").value = project.category || "";
  $("#channel").value = project.channel || "";
  if ($("#customerType")) $("#customerType").value = project.customerType || "new";
  if ($("#productionRoute")) $("#productionRoute").value = project.productionRoute || (project.customerType === "existing" ? "psd" : "figma");
  $("#dueDate").value = project.dueDate || "";
  $("#oneLine").value = project.oneLine || "";
  $("#consultSummary").value = project.consultSummary || "";
  $("#clientRequests").value = project.clientRequests || "";
  $("#emphasis").value = project.emphasis || "";
  $("#banWords").value = project.banWords || "";
  $("#mustInclude").value = project.mustInclude || "";
  $("#references").value = project.references || "";
  $("#contentRatio").value = project.contentRatio || "";
  $("#optionMemo").value = project.optionMemo || "";
  setChecked("direction", project.direction || []);
  setChecked("target", project.target || []);
  setChecked("goal", project.goal || []);
  setChecked("highlight", project.highlight || []);
  setChecked("avoid", project.avoid || []);
  setChecked("usp", project.usp || []);
  $("#templateA").textContent = project.layoutA || "풀비주얼 브랜드형";
  $("#templateB").textContent = project.layoutB || "스토리 스크롤형";
  if ($("#draftTone")) $("#draftTone").value = project.draftTone || "premium";
  if ($("#draftImagePosition")) $("#draftImagePosition").value = project.draftImagePosition || "right";
  if ($("#draftDensity")) $("#draftDensity").value = project.draftDensity || "balanced";
  if ($("#draftMainCopy")) $("#draftMainCopy").value = project.draftMainCopy || "";
  activeSectionDraft = project.activeSectionDraft || "A";
  sectionEdits = project.sectionEdits || { A: [], B: [] };
  sectionOrders = project.sectionOrders || { A: [], B: [] };
  if (Array.isArray(project.aiWorkflowRuns) && project.aiWorkflowRuns.length) {
    const existing = readAiWorkflowRuns();
    const existingIds = new Set(existing.map((run) => run.id));
    writeAiWorkflowRuns([...project.aiWorkflowRuns.filter((run) => !existingIds.has(run.id)), ...existing]);
  }
  if (project.aiArtifacts && typeof project.aiArtifacts === "object") {
    localStorage.setItem(`detailAiArtifacts:${currentProjectKey()}`, JSON.stringify(project.aiArtifacts));
  }
  currentDesignWorkflow = project.designWorkflow || project.aiArtifacts?.designWorkflow?.result || null;
  manualTemplateChanged = Boolean(project.layoutA || project.layoutB);
  $("#planResult").textContent = project.planResult || "기획 결과가 여기에 표시됩니다.";
  $("#draftA").innerHTML = `<pre>${escapeHtml(project.draftA || "A안 결과가 여기에 표시됩니다.")}</pre>`;
  $("#draftB").innerHTML = `<pre>${escapeHtml(project.draftB || "B안 결과가 여기에 표시됩니다.")}</pre>`;
  $("#clientMailResult").textContent = project.clientMail || "시안 생성 후 고객에게 보낼 메일 초안이 여기에 표시됩니다.";
  renderClientPreflight(project.clientMail || "");
  if ($("#aiQualityReview")) $("#aiQualityReview").textContent = project.aiQualityReview || "A/B 시안 생성 후 디자인 품질 검수 결과가 표시됩니다.";
  if ($("#revisionResult")) $("#revisionResult").textContent = project.revision || "고객 피드백을 반영한 수정 시안 요약이 여기에 표시됩니다.";
  if ($("#revisionMailResult")) $("#revisionMailResult").textContent = project.revisionMail || "수정 시안 컨펌 요청 메일이 여기에 표시됩니다.";
  $("#handoffResult").textContent = project.handoff || "PSD 작업 지시서와 바이버 메시지가 여기에 표시됩니다.";
  $("#finalMail").textContent = project.finalMail || "최종 납품 메일 초안이 여기에 표시됩니다.";
  renderTemplateLibrary();
  renderSectionLayouts();
  renderPhotoConcepts();
  renderSectionEditor();
  renderAiWorkflowStatus();
  updateActiveDraftView();
  updateRouteSummary();
  updateWorkflowState();
  alert("저장된 프로젝트를 열었습니다.");
}

function selected(name) {
  return $$(`input[name="${name}"]:checked`).map((item) => item.value);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setChecked(name, values) {
  $$(`input[name="${name}"]`).forEach((item) => {
    item.checked = values.includes(item.value);
  });
}

function product() {
  return {
    clientName: value("clientName") || "고객사",
    productName: value("productName") || "제품명",
    category: value("category") || "카테고리",
    customerType: value("customerType") || "new",
    productionRoute: value("productionRoute") || "figma",
    oneLine: value("oneLine") || "제품 한 줄 설명이 필요합니다.",
    direction: selected("direction"),
    target: selected("target"),
    goal: selected("goal"),
    highlight: selected("highlight"),
    avoid: selected("avoid"),
    usp: selected("usp"),
    mustInclude: value("mustInclude"),
    banWords: value("banWords"),
    contentRatio: value("contentRatio"),
    optionMemo: value("optionMemo"),
    consultSummary: value("consultSummary"),
    clientRequests: value("clientRequests"),
    emphasis: value("emphasis"),
    references: value("references"),
    productionStandard: DETAIL_PAGE_PRODUCTION_STANDARD,
  };
}

function detailPageProductionStandardText() {
  const planning = DETAIL_PAGE_PRODUCTION_STANDARD.planningDesign;
  const design = DETAIL_PAGE_PRODUCTION_STANDARD.designOnly;
  return `기본 기준: ${planning.label} ${planning.baseHeightPx.toLocaleString("ko-KR")}px / ${planning.basePrice.toLocaleString("ko-KR")}원
추가 분량: ${planning.additionalUnitPx.toLocaleString("ko-KR")}px당 ${planning.additionalUnitPrice.toLocaleString("ko-KR")}원
디자인 단독: ${design.baseHeightPx.toLocaleString("ko-KR")}px / ${design.basePrice.toLocaleString("ko-KR")}원, 추가 ${design.additionalUnitPx.toLocaleString("ko-KR")}px당 ${design.additionalUnitPrice.toLocaleString("ko-KR")}원
PSD 원본 제공: ${DETAIL_PAGE_PRODUCTION_STANDARD.psdSourceFee.toLocaleString("ko-KR")}원 추가
동일 디자인 기반 바리에이션: 신규 제작비의 ${Math.round((1 - DETAIL_PAGE_PRODUCTION_STANDARD.variationDiscountRate) * 100)}% 금액`;
}

function productionRouteConfig(route = value("productionRoute"), customerType = value("customerType")) {
  const isExisting = customerType === "existing";
  const configs = {
    figma: {
      name: "Google Drive 시안 협업 라인",
      shortName: "Drive 시안 라인",
      goal: "빠른 시안, 실시간 수정, 고객 컨펌 효율",
      result: "시안 이미지 / 작업 패키지 / Export 파일",
      buttons: ["시안 패키지 생성", "Drive 자료 열기", "컨펌 요청", "최종 확정"],
      guide: "신규 고객에게 기본 추천됩니다. Drive 기획안과 실제 제작물을 참고해 시안을 만들고, 디자이너가 확정 문구를 조판하는 흐름입니다.",
    },
    psd: {
      name: "PSD 고퀄리티 제작 라인",
      shortName: "PSD 라인",
      goal: "완성도, 디자인 디테일, 원본 제작 품질",
      result: "PSD 원본 / PNG / JPG",
      buttons: ["AI 이미지 생성", "미얀마 작업 전달", "PSD 다운로드", "최종 납품"],
      guide: "기존 고객에게 기본 추천됩니다. AI 시안을 바탕으로 미얀마 디자이너가 PSD를 최대한 동일하게 구현하는 흐름입니다.",
    },
  };
  return {
    customerLabel: isExisting ? "기존 고객" : "신규 고객",
    ...(configs[route] || configs.figma),
  };
}

function recommendProductionRoute() {
  const customerType = value("customerType");
  const route = value("productionRoute");
  if (!route && $("#productionRoute")) {
    $("#productionRoute").value = customerType === "existing" ? "psd" : "figma";
  }
}

function updateRouteSummary() {
  const config = productionRouteConfig();
  const summary = $("#routeSummary");
  if (summary) {
    summary.innerHTML = `
      <strong>${escapeHtml(config.customerLabel)} · ${escapeHtml(config.name)}</strong>
      <p>${escapeHtml(config.guide)}</p>
      <div class="route-mini-grid">
        <span>목표: ${escapeHtml(config.goal)}</span>
        <span>결과물: ${escapeHtml(config.result)}</span>
      </div>
      <div class="route-flow-badges">
        ${config.buttons.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    `;
  }
  if ($("#routeActionKicker")) $("#routeActionKicker").textContent = `${config.customerLabel} 제작 라인`;
  if ($("#routeActionTitle")) $("#routeActionTitle").textContent = config.name;
  if ($("#routeActionText")) $("#routeActionText").textContent = `${config.goal}을 기준으로 ${config.buttons.join(" → ")} 순서로 진행합니다.`;
  const figmaButtons = ["#generateFigmaBrief", "#openFigmaPlaceholder"];
  figmaButtons.forEach((selector) => {
    const button = $(selector);
    if (button) button.hidden = value("productionRoute") !== "figma";
  });
  const handoffButton = $("#generateHandoff");
  if (handoffButton) {
    handoffButton.textContent = value("productionRoute") === "figma" ? "Drive 시안 작업 패키지 생성" : "PSD 작업 지시서 생성";
  }
  updateReviewRouteGuide();
}

function updateReviewRouteGuide() {
  const target = $("#reviewRouteGuide");
  if (!target) return;
  const route = value("productionRoute") || "figma";
  const guide = route === "figma"
    ? {
        title: "Google Drive 시안 라인 검수 기준",
        items: [
          "전체 시안이 긴 세로형 상세페이지 구조로 정리됨",
          "ad_poster / photo_plan / purchase_stack 구간이 섹션 또는 그룹명으로 구분됨",
          "텍스트와 제품 이미지가 교체 가능한 상태",
          "광고형 포스터 구간이 단순 와이어프레임이 아닌 실제 상세 디자인처럼 보임",
          "고객 컨펌용 PNG/JPG Export 확인",
          "Drive 결과 폴더의 링크/권한/원본 제공 범위 확인",
        ],
      }
    : {
        title: "PSD 라인 검수 기준",
        items: [
          "PSD 섹션별 그룹이 선택 시안의 실제 섹션 순서와 일치",
          "ad_poster / photo_plan / purchase_stack 그룹이 분리되어 있음",
          "텍스트 레이어 수정 가능",
          "제품컷 비율과 라벨이 왜곡되지 않음",
          "AI 시안과 색상, 카드, 배지, CTA, 이미지 배치가 일치",
          "PNG/JPG 미리보기 및 PSD 원본 제공 범위 확인",
        ],
      };
  target.innerHTML = `
    <strong>${escapeHtml(guide.title)}</strong>
    <ul>
      ${guide.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

const CATEGORY_DATASETS = {
  "식품/건강식품": {
    tone: "깨끗함, 신뢰감, 프리미엄, 선물성",
    mainMessage: "원료와 구성의 신뢰감을 바탕으로 간편한 섭취와 선물 가치를 보여줍니다.",
    targetPains: [
      "좋은 원료인지 확인하고 싶음",
      "매일 챙기기 쉬운 제품을 찾음",
      "부모님이나 지인에게 줄 선물용 건강식품을 고민함",
      "과장 광고가 아닌 신뢰감 있는 정보를 원함",
    ],
    purchasePoints: [
      "원료 스토리와 품질 이미지",
      "스틱형/개별 포장 등 섭취 편의성",
      "패키지와 구성에서 느껴지는 선물 가치",
      "구성량, 원산지, 보관법 등 구매 전 확인 정보",
    ],
    sections: [
      "메인 비주얼과 핵심 카피",
      "원료/브랜드 스토리",
      "제품 핵심 장점",
      "섭취 편의성과 휴대성",
      "선물 패키지 연출",
      "구성품/원산지/보관 정보",
      "신뢰 요소와 구매 유도",
    ],
    photoConcepts: [
      "{product} 패키지 정면 대표컷",
      "스틱 개별 포장 누끼컷",
      "원료와 꿀/리치 등 소재를 함께 보여주는 합성 이미지",
      "손에 들고 간편하게 섭취하는 장면",
      "직장인 책상 위 데일리 루틴 컷",
      "부모님 선물용 패키지 연출컷",
      "가방이나 파우치에 넣은 휴대성 컷",
      "전체 구성 펼침컷",
    ],
    copyBlocks: {
      hero: "하루 한 포, 간편하게 챙기는 프리미엄 루틴",
      problem: "좋은 제품을 고르고 싶지만 원료와 구성, 섭취 편의성이 명확하지 않으면 구매를 망설이게 됩니다.",
      trust: "제품 정보는 과장 없이 원료, 구성, 섭취 방법 중심으로 명확하게 전달합니다.",
      cta: "선물용으로도, 데일리 루틴으로도 부담 없이 선택할 수 있도록 마지막 구매 포인트를 정리합니다.",
    },
    caution: [
      "질병 치료, 예방, 완화 표현 금지",
      "면역력 향상 보장, 즉시 효과 등 효능 보장 표현 금지",
      "의약품으로 오인될 수 있는 문구 금지",
      "과장된 후기/전후 비교 표현 주의",
    ],
    psdMemo: [
      "원료컷과 제품컷을 과장되지 않게 고급스럽게 합성",
      "식품/건강식품 특성상 의약품처럼 보이는 그래픽 사용 금지",
      "구성 정보와 섭취 방법은 모바일에서 읽기 쉽게 카드 또는 표로 정리",
    ],
  },
  "뷰티/화장품": {
    tone: "깨끗함, 감성, 성분 신뢰, 브랜드 무드",
    mainMessage: "피부 고민과 성분 포인트를 감각적으로 보여주고 사용 장면으로 기대감을 만듭니다.",
    targetPains: ["성분이 안전한지 궁금함", "내 피부 고민에 맞는지 알고 싶음", "제형과 사용감이 궁금함"],
    purchasePoints: ["성분/원료 포인트", "제형과 사용감", "브랜드 무드", "후기와 신뢰 요소"],
    sections: ["메인 비주얼", "피부 고민 제시", "성분/제형 소개", "사용 방법", "후기/신뢰 요소", "구매 유도"],
    photoConcepts: ["{product} 제품 정면 대표컷", "제형 클로즈업", "성분/원료 합성 이미지", "손에 든 사용 연출컷", "화장대 라이프스타일 컷", "패키지 구성 전체컷", "피부 고민 이미지", "브랜드 무드 배경컷"],
    copyBlocks: {
      hero: "매일의 루틴을 더 산뜻하게 만드는 케어",
      problem: "피부 고민은 다르기 때문에 성분과 사용감을 쉽게 확인할 수 있어야 합니다.",
      trust: "성분, 사용법, 주의사항을 명확하게 정리해 구매 전 불안을 줄입니다.",
      cta: "나에게 맞는 루틴인지 한눈에 판단할 수 있게 구매 포인트를 정리합니다.",
    },
    caution: ["효과 보장 표현 금지", "의학적 치료 표현 금지", "과장된 전후 비교 주의"],
    psdMemo: ["제형컷과 제품컷의 질감 표현 강화", "너무 의료적인 느낌의 그래픽 지양"],
  },
  "생활용품": {
    tone: "실용적, 깔끔함, 문제 해결, 사용 편의성",
    mainMessage: "일상 속 불편함을 제품이 어떻게 해결하는지 쉽고 빠르게 보여줍니다.",
    targetPains: ["사용 전 불편함이 있음", "실제로 편리한지 알고 싶음", "구성/사이즈/사용법을 확인하고 싶음"],
    purchasePoints: ["문제 해결", "사용 편의성", "구성 정보", "비교 포인트"],
    sections: ["문제 제기", "해결 포인트", "제품 장점", "사용 장면", "구성/사이즈 정보", "구매 유도"],
    photoConcepts: ["{product} 대표컷", "사용 전 불편 상황 컷", "사용 장면 연출컷", "제품 디테일컷", "구성품 전체컷", "사이즈 비교컷", "보관/설치 장면", "구매 유도 최종컷"],
    copyBlocks: {
      hero: "일상의 불편함을 더 간단하게",
      problem: "작은 불편함도 반복되면 구매를 고민하게 만드는 이유가 됩니다.",
      trust: "사용법과 구성 정보를 명확하게 보여줘 구매 전 궁금증을 줄입니다.",
      cta: "실제 사용 장면과 장점을 한 번 더 정리해 선택을 돕습니다.",
    },
    caution: ["과도한 비교 비방 금지", "내구성 보장 표현 주의"],
    psdMemo: ["사용 전/후 상황을 명확히 나눠 구성", "정보 카드와 아이콘 적극 활용"],
  },
  "기본": {
    tone: "깔끔함, 정보 전달, 구매 포인트 중심",
    mainMessage: "제품의 핵심 장점과 구매 이유를 명확하게 정리합니다.",
    targetPains: ["제품 장점을 빠르게 이해하고 싶음", "구매 전 필요한 정보를 확인하고 싶음"],
    purchasePoints: ["핵심 장점", "사용 장면", "구성 정보", "구매 유도"],
    sections: ["메인 비주얼", "제품 소개", "핵심 장점", "사용 장면", "제품 정보", "구매 유도"],
    photoConcepts: ["{product} 대표 제품컷", "제품 상세 디테일컷", "사용 장면 연출컷", "구성품 전체컷", "문제 해결 상황컷", "패키지 구성컷", "브랜드 무드 배경컷", "구매 유도용 최종컷"],
    copyBlocks: {
      hero: "제품의 가치를 한눈에 보여주는 상세페이지",
      problem: "고객이 빠르게 이해할 수 있도록 핵심 정보를 정리해야 합니다.",
      trust: "제품 정보와 장점을 명확하게 전달해 구매 판단을 돕습니다.",
      cta: "마지막으로 구매 이유를 정리해 행동을 유도합니다.",
    },
    caution: ["과장 광고 표현 주의", "근거 없는 보장 표현 금지"],
    psdMemo: ["제품 장점이 먼저 보이도록 정보 우선순위 정리"],
  },
};

function categoryDataset(category = product().category) {
  if (category.includes("식품") || category.includes("건강")) return CATEGORY_DATASETS["식품/건강식품"];
  if (category.includes("뷰티") || category.includes("화장품")) return CATEGORY_DATASETS["뷰티/화장품"];
  if (category.includes("생활")) return CATEGORY_DATASETS["생활용품"];
  return CATEGORY_DATASETS["기본"];
}

function templateDataset(template) {
  const libraryItem = templateLibraryItem(template);
  const templateKey = libraryItem?.templateKey || template;
  const categoryTemplates = window.DETAIL_TEMPLATE_DATASET?.categories?.["식품/건강식품"]?.templates || {};
  return categoryTemplates[templateKey] || categoryTemplates["풀비주얼 브랜드형"];
}

function templateVisualClass(template) {
  const libraryItem = templateLibraryItem(template);
  if (libraryItem?.toneClass) return libraryItem.toneClass;
  if (template.includes("스토리")) return "warm";
  if (template.includes("카드") || template.includes("정보")) return "info";
  if (template.includes("전환") || template.includes("문제")) return "problem";
  return "premium";
}

function templateLibraryItem(template) {
  return TEMPLATE_LIBRARY.find((item) => item.name === template || item.id === template);
}

const TEMPLATE_LIBRARY = [
  {
    name: "프리미엄 건강식품 01",
    templateKey: "풀비주얼 브랜드형",
    category: "식품/건강식품",
    purpose: "브랜드",
    difficulty: "고급",
    imageCount: 8,
    mood: "고급/신뢰/선물",
    description: "패키지와 메인 카피를 크게 보여주는 건강식품 프리미엄 상세 템플릿",
    thumb: "full-visual",
    toneClass: "premium",
  },
  {
    name: "선물 패키지형 02",
    templateKey: "풀비주얼 브랜드형",
    category: "식품/건강식품",
    purpose: "선물",
    difficulty: "고급",
    imageCount: 9,
    mood: "선물/고급/브랜드",
    description: "선물용 패키지와 제품 구성을 앞쪽에서 강하게 보여주는 템플릿",
    thumb: "full-visual",
    toneClass: "premium",
  },
  {
    name: "원료 스토리형 01",
    templateKey: "스토리 스크롤형",
    category: "식품/건강식품",
    purpose: "스토리",
    difficulty: "일반",
    imageCount: 8,
    mood: "원료/감성/브랜드",
    description: "원료 이야기와 사용 장면을 순서대로 풀어가는 긴 스크롤 템플릿",
    thumb: "story",
    toneClass: "warm",
  },
  {
    name: "데일리 루틴형 02",
    templateKey: "스토리 스크롤형",
    category: "식품/건강식품",
    purpose: "스토리",
    difficulty: "일반",
    imageCount: 7,
    mood: "일상/간편/감성",
    description: "책상, 가방, 선물 등 일상 장면 중심으로 설득하는 템플릿",
    thumb: "story",
    toneClass: "warm",
  },
  {
    name: "정보 정리형 01",
    templateKey: "카드 정보형",
    category: "식품/건강식품",
    purpose: "정보",
    difficulty: "빠른 제작",
    imageCount: 6,
    mood: "깔끔/정보/신뢰",
    description: "장점, 섭취 방법, 제품 정보를 카드와 표로 빠르게 정리하는 템플릿",
    thumb: "cards",
    toneClass: "info",
  },
  {
    name: "구성표 강조형 02",
    templateKey: "카드 정보형",
    category: "식품/건강식품",
    purpose: "정보",
    difficulty: "빠른 제작",
    imageCount: 5,
    mood: "제품정보/구성/표",
    description: "30포 구성, 원산지, 보관법 등 구매 전 확인 정보를 중심에 두는 템플릿",
    thumb: "cards",
    toneClass: "info",
  },
  {
    name: "구매 설득형 01",
    templateKey: "전환 집중형",
    category: "식품/건강식품",
    purpose: "전환",
    difficulty: "일반",
    imageCount: 7,
    mood: "설득/비교/구매",
    description: "구매 전 고민을 먼저 제시하고 해결 포인트로 전환을 유도하는 템플릿",
    thumb: "conversion",
    toneClass: "problem",
  },
  {
    name: "문제해결 전환형 02",
    templateKey: "전환 집중형",
    category: "생활용품",
    purpose: "전환",
    difficulty: "일반",
    imageCount: 7,
    mood: "문제해결/비교/실용",
    description: "불편함을 제시한 뒤 제품을 해결책으로 보여주는 전환형 템플릿",
    thumb: "conversion",
    toneClass: "problem",
  },
];

const TEMPLATE_RULE_PRESETS = {
  "프리미엄 건강식품 01": {
    profileName: "프리미엄 선물형 상세 템플릿",
    styleKey: "template-premium-gift",
    mode: "brand",
    flow: ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"],
    layoutSignature: "첫 화면 대형 제품컷 + 원료 스토리 + 선물 패키지 + 신뢰 정보",
    visualGrammar: ["큰 제품컷", "아이보리 배경", "골드 포인트", "원료 감성컷", "선물 패키지 강조"],
    editableParts: ["메인 카피", "제품 이미지", "원료 스토리", "브랜드 컬러", "CTA 문구"],
    imageSlots: ["hero", "origin", "openBox", "package", "lifestyle", "trust", "info"],
    blocks: ["editorialHero", "ingredientMood", "benefitCards", "giftPackage", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#b9822d", bg: "#fffaf0", dark: "#2b241b" },
  },
  "선물 패키지형 02": {
    profileName: "프리미엄 패키지 선물 템플릿",
    styleKey: "template-gift-package",
    mode: "brand",
    flow: ["hero", "lifestyle", "story", "benefit", "trust", "info", "cta"],
    layoutSignature: "패키지 구성컷을 앞쪽에 두고 선물 상황을 강하게 보여주는 구조",
    visualGrammar: ["패키지 스택", "쇼핑백/구성컷", "부드러운 그림자", "선물 배지", "고급 여백"],
    editableParts: ["선물 카피", "패키지 이미지", "구성 정보", "브랜드 컬러", "최종 CTA"],
    imageSlots: ["package", "giftBag", "openBox", "hero", "lifestyle", "trust", "info"],
    blocks: ["giftHero", "packageUnboxing", "benefitCards", "usageScene", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#c06f3a", bg: "#fff7ef", dark: "#2f241f" },
  },
  "원료 스토리형 01": {
    profileName: "원료 스토리 스크롤 템플릿",
    styleKey: "template-origin-story",
    mode: "story",
    flow: ["hero", "story", "lifestyle", "benefit", "trust", "info", "cta"],
    layoutSignature: "원료 이미지와 브랜드 이야기를 긴 스크롤 흐름으로 풀어가는 구조",
    visualGrammar: ["원료 클로즈업", "스토리 타임라인", "따뜻한 배경", "문장형 카피", "감성 사진"],
    editableParts: ["원료 문구", "스토리 순서", "이미지 슬롯", "톤 컬러", "마무리 카피"],
    imageSlots: ["origin", "hero", "lifestyle", "feature", "package", "trust", "info"],
    blocks: ["storyHero", "ingredientMood", "editorialStory", "routineScene", "trustProof", "softCta"],
    colorSystem: { accent: "#d7773f", bg: "#fffaf4", dark: "#32231b" },
  },
  "데일리 루틴형 02": {
    profileName: "데일리 루틴 사용 장면 템플릿",
    styleKey: "template-daily-routine",
    mode: "story",
    flow: ["hero", "lifestyle", "benefit", "story", "trust", "info", "cta"],
    layoutSignature: "하루 사용 장면과 휴대성을 중심으로 구매 이유를 쌓는 구조",
    visualGrammar: ["생활 연출컷", "루틴 카드", "스텝 그래픽", "휴대성 배지", "따뜻한 CTA"],
    editableParts: ["사용 장면", "루틴 문구", "제품컷", "배경 톤", "CTA 문구"],
    imageSlots: ["lifestyle", "stick", "hero", "package", "origin", "trust", "info"],
    blocks: ["routineHero", "usageSteps", "benefitCards", "ingredientMood", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#d88945", bg: "#fff8ef", dark: "#2e251d" },
  },
  "정보 정리형 01": {
    profileName: "정보 정리 카드 템플릿",
    styleKey: "template-info-card",
    mode: "information",
    flow: ["hero", "benefit", "info", "lifestyle", "trust", "cta"],
    layoutSignature: "장점, 섭취 방법, 구성 정보를 카드/표로 빠르게 이해시키는 구조",
    visualGrammar: ["카드 그리드", "아이콘 배지", "표 정보", "짧은 카피", "깨끗한 배경"],
    editableParts: ["장점 카드", "구성 정보", "표 문구", "포인트 컬러", "구매 유도문"],
    imageSlots: ["hero", "feature", "openBox", "info", "lifestyle", "trust", "package"],
    blocks: ["summaryHero", "featureCards", "infoTable", "usageSteps", "trustProof", "purchaseCta"],
    colorSystem: { accent: "#397577", bg: "#f7fbfa", dark: "#203738" },
  },
  "구성표 강조형 02": {
    profileName: "구성 정보 강조 템플릿",
    styleKey: "template-product-spec",
    mode: "information",
    flow: ["hero", "info", "benefit", "trust", "lifestyle", "cta"],
    layoutSignature: "제품 구성, 용량, 보관법 같은 구매 전 확인 정보를 앞쪽에 배치",
    visualGrammar: ["구성표", "제품 라인업", "정보 배지", "체크 리스트", "화이트 카드"],
    editableParts: ["제품 정보표", "구성 이미지", "체크 문구", "포인트 컬러", "CTA"],
    imageSlots: ["openBox", "info", "package", "hero", "feature", "trust", "lifestyle"],
    blocks: ["specHero", "infoTable", "featureCards", "trustProof", "usageScene", "purchaseCta"],
    colorSystem: { accent: "#5f7f8b", bg: "#f8fbfc", dark: "#26343a" },
  },
  "구매 설득형 01": {
    profileName: "전환 집중 구매 설득 템플릿",
    styleKey: "template-conversion-check",
    mode: "conversion",
    flow: ["hero", "benefit", "compare", "trust", "info", "lifestyle", "cta"],
    layoutSignature: "구매 고민을 빠르게 정리하고 비교/체크/CTA로 전환시키는 구조",
    visualGrammar: ["강한 헤드라인", "체크 카드", "비교표", "신뢰 배지", "주문 CTA"],
    editableParts: ["구매 포인트", "비교표", "체크 문구", "CTA 색상", "신뢰 근거"],
    imageSlots: ["hero", "stick", "openBox", "package", "trust", "info", "lifestyle"],
    blocks: ["conversionHero", "benefitCards", "comparison", "trustProof", "infoTable", "strongCta"],
    colorSystem: { accent: "#d16c2f", bg: "#fff8ee", dark: "#30251d" },
  },
  "문제해결 전환형 02": {
    profileName: "문제 해결 전환 템플릿",
    styleKey: "template-problem-solution",
    mode: "conversion",
    flow: ["hero", "problem", "benefit", "compare", "lifestyle", "trust", "info", "cta"],
    layoutSignature: "고객 불편함을 먼저 보여주고 제품을 해결책으로 제시하는 구조",
    visualGrammar: ["문제 제기 박스", "해결 카드", "전후 비교", "사용 장면", "명확한 CTA"],
    editableParts: ["문제 문구", "해결 포인트", "비교 영역", "제품 이미지", "CTA"],
    imageSlots: ["lifestyle", "hero", "feature", "package", "trust", "info"],
    blocks: ["problemHero", "solutionCards", "comparison", "usageScene", "trustProof", "strongCta"],
    colorSystem: { accent: "#397577", bg: "#f5fbfa", dark: "#203738" },
  },
};

function templateDesignRules(template) {
  const item = templateLibraryItem(template);
  const rules = TEMPLATE_RULE_PRESETS[template] || TEMPLATE_RULE_PRESETS[item?.name] || {};
  return {
    source: item?.name || template,
    templateKey: item?.templateKey || template,
    canUseAsSkeleton: true,
    ...rules,
  };
}

function copySlots() {
  const p = product();
  const dataset = categoryDataset(p.category);
  const controls = draftControls();
  if ((p.productName || "").includes("호아비") || p.references.includes("hoabi-product")) {
    return {
      productName: p.productName || "호아비 리치꿀스틱 30포",
      oneLine: controls.mainCopy || p.oneLine || "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴",
      originStory: p.emphasis || "베트남 리치 원료와 프리미엄 꿀의 조합을 감성적인 원료 스토리로 보여줍니다.",
      benefits: p.usp.length ? p.usp.join(", ") : "리치 원료, 프리미엄 꿀, 개별 스틱 포장, 선물용 패키지",
      usageScene: "가방, 책상, 선물 패키지 안에서 자연스럽게 꺼내 먹는 간편한 데일리 루틴을 제안합니다.",
      giftMessage: "핑크 패키지와 스틱 구성을 활용해 부모님 선물, 직장 동료 선물, 건강 루틴 선물 이미지를 강조합니다.",
      trust: "건강식품 표현 기준을 지키면서 원료, 구성, 보관, 섭취 정보를 명확하게 정리합니다.",
      info: "30포 구성, 스틱형 포장, 원료 정보, 보관 방법, 주의사항을 구매 전 확인하기 쉽게 보여줍니다.",
      problem: "건강을 챙기고 싶지만 번거로운 제품은 부담스러운 고객에게 간편한 한 포 루틴을 제안합니다.",
      difference: "일반 꿀스틱과 달리 리치 원료 스토리, 프리미엄 패키지, 휴대성을 함께 보여줍니다.",
      cta: "선물하기 좋은 건강한 한 포, 호아비 리치꿀스틱으로 하루 루틴을 시작해보세요.",
    };
  }
  return {
    productName: p.productName || "제품명",
    oneLine: controls.mainCopy || p.oneLine || dataset.mainMessage,
    originStory: p.emphasis || dataset.mainMessage,
    benefits: p.usp.length ? p.usp.join(", ") : dataset.purchasePoints.join(", "),
    usageScene: "간편한 섭취/사용 장면과 일상 속 활용 방식을 보여줍니다.",
    giftMessage: "선물용 패키지와 고급스러운 제품 이미지를 함께 강조합니다.",
    trust: dataset.copyBlocks.trust,
    info: "구성, 원산지, 보관 방법, 주의사항 등 구매 전 확인 정보를 정리합니다.",
    problem: dataset.copyBlocks.problem,
    difference: "원료, 구성, 휴대성, 패키지에서 느껴지는 차별점을 비교해 보여줍니다.",
    cta: dataset.copyBlocks.cta,
  };
}

function draftControls() {
  return {
    tone: value("draftTone") || "premium",
    imagePosition: value("draftImagePosition") || "right",
    density: value("draftDensity") || "balanced",
    mainCopy: value("draftMainCopy"),
  };
}

function draftAccent(tone) {
  const accents = {
    premium: { accent: "#c66b2d", bg: "#fff8ed", dark: "#2f2923" },
    fresh: { accent: "#4f8f68", bg: "#f3faf3", dark: "#223c2d" },
    clean: { accent: "#6f7f8a", bg: "#fbfbf8", dark: "#2f3438" },
    warm: { accent: "#d7773f", bg: "#fff3e8", dark: "#3a2418" },
    dark: { accent: "#b88a4a", bg: "#f7f1e8", dark: "#25211d" },
  };
  return accents[tone] || accents.premium;
}

function photoConcepts() {
  const p = product();
  const name = p.productName || "제품";
  if (name.includes("호아비") || p.references.includes("hoabi-product")) {
    return [
      "가정에서 리치꿀스틱을 음료 또는 요거트와 함께 즐기는 장면",
      "가방이나 파우치에 넣고 야외에서 간편하게 꺼내는 휴대 장면",
      "스틱 포장과 리치꿀 텍스처를 강조한 클로즈업 샷",
      "사람이 스틱을 손에 들고 섭취하는 라이프스타일 장면",
      "핑크/아이보리 배경의 미니멀 스튜디오 제품 세팅",
      "고급 상업 광고 느낌의 패키지 히어로 샷",
      "직장 책상 위에 두고 하루 루틴으로 챙기는 실용 사용 장면",
      "리치 원물과 꿀의 흐름을 함께 보여주는 창의적 합성 장면",
      "상세페이지 첫 화면에 사용할 제품 중심 히어로 컷",
    ];
  }
  return categoryDataset(p.category).photoConcepts.map((item) => item.replace("{product}", name));
}

function detailImageSet() {
  const p = product();
  if (p.productName.includes("호아비") || p.references.includes("hoabi-detail")) {
    return {
      hero: "assets/hoabi-mybox/hoabi-package-front-crop.png",
      origin: "assets/hoabi-detail/hoabi-section-02.jpg",
      feature: "assets/hoabi-mybox/hoabi-stick-single-crop.png",
      lifestyle: "assets/hoabi-product/hoabi-lifestyle-package.jfif",
      package: "assets/hoabi-mybox/hoabi-package-front-crop.png",
      trust: "assets/hoabi-detail/hoabi-section-08.jpg",
      info: "assets/hoabi-mybox/hoabi-product-info.jpg",
      boxYellow: "assets/hoabi-mybox/hoabi-box-yellow-crop.png",
      boxPink: "assets/hoabi-mybox/hoabi-box-pink-crop.png",
      openBox: "assets/hoabi-mybox/hoabi-open-box-30p-crop.png",
      giftBag: "assets/hoabi-mybox/hoabi-shopping-bag-crop.png",
      stick: "assets/hoabi-mybox/hoabi-stick-single-crop.png",
      referenceSections: [
        "assets/hoabi-detail/hoabi-section-01.jpg",
        "assets/hoabi-detail/hoabi-section-02.jpg",
        "assets/hoabi-detail/hoabi-section-03.jpg",
        "assets/hoabi-detail/hoabi-section-04.jpg",
        "assets/hoabi-detail/hoabi-section-05.jpg",
        "assets/hoabi-detail/hoabi-section-06.jpg",
        "assets/hoabi-detail/hoabi-section-07.jpg",
        "assets/hoabi-detail/hoabi-section-08.jpg",
        "assets/hoabi-detail/hoabi-section-09.jpg",
        "assets/hoabi-detail/hoabi-section-10.jpg",
        "assets/hoabi-detail/hoabi-section-11.jpg",
        "assets/hoabi-detail/hoabi-section-12.jpg",
      ],
      figmaReferences: [
        "assets/figma-hoabi/detail-story.jpg",
        "assets/figma-hoabi/detail-trust.jpg",
        "assets/figma-hoabi/lifestyle.jpg",
        "assets/figma-hoabi/open-box.jpg",
      ],
    };
  }
  return null;
}

function templateTone(template) {
  const libraryItem = TEMPLATE_LIBRARY.find((item) => item.name === template);
  const templateKey = libraryItem?.templateKey || template;
  const map = {
    "풀비주얼 브랜드형": {
      tone: "큰 메인 비주얼, 넓은 여백, 제품 중심의 첫인상 구성",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "제품 이미지, 메인 카피, 브랜드 첫인상",
    },
    "스토리 스크롤형": {
      tone: "상황별 장면과 원료 이야기를 순서대로 보여주는 세로형 구성",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "브랜드 스토리, 사용 장면, 선물 상황",
    },
    "카드 정보형": {
      tone: "장점과 정보를 카드, 아이콘, 표로 정리하는 구조",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "제품 장점, 구성, 사용법, 구매 판단 정보",
    },
    "전환 집중형": {
      tone: "구매 포인트와 신뢰 요소를 앞쪽에 배치하는 전환 중심 구조",
      colors: "고객 작성폼의 색감 방향과 담당자 보정값을 기준으로 적용",
      focus: "구매 포인트, 신뢰 요소, 선택 이유",
    },
    "프리미엄 브랜드형": {
      tone: "여백 중심, 고급 타이포그래피, 정돈된 브랜드 무드",
      colors: "아이보리, 화이트, 골드, 오렌지 포인트",
      focus: "원료 가치, 패키지, 선물성, 프리미엄 이미지",
    },
    "감성 스토리형": {
      tone: "따뜻한 사진, 부드러운 카피, 생활 장면 중심",
      colors: "오렌지, 아이보리, 화이트, 부드러운 브라운",
      focus: "선물 상황, 일상 루틴, 감성 구매 동기",
    },
    "정보 전달형": {
      tone: "깔끔한 카드, 아이콘, 표 중심의 명확한 구성",
      colors: "화이트, 라이트그레이, 블루 또는 그린 포인트",
      focus: "제품 장점, 구성, 사용법, 구매 판단 정보",
    },
    "문제 해결형": {
      tone: "고민 제시 후 해결 흐름으로 설득하는 구성",
      colors: "화이트, 라이트그레이, 오렌지 또는 블루 포인트",
      focus: "고객 불편, 해결 포인트, 사용 편의성",
    },
  };
  return map[templateKey] || map["풀비주얼 브랜드형"];
}

function generatePlanText() {
  const p = product();
  const dataset = categoryDataset(p.category);
  const targets = p.target.join(", ") || "주요 타깃 미선택";
  const usps = p.usp.join(", ") || "핵심 USP 미선택";
  const avoids = [...new Set([...p.avoid, ...dataset.caution])].join(", ") || "금지 요소 미선택";

  return `[제품 요약]
제품명: ${p.productName}
카테고리: ${p.category}
제품 한 줄 설명: ${p.oneLine}
카테고리 기준 톤: ${dataset.tone}
핵심 판매 메시지: ${p.emphasis || dataset.mainMessage}

[타깃 분석]
주요 타깃: ${targets}
타깃의 고민:
${dataset.targetPains.map((item, index) => `${index + 1}. ${item}`).join("\n")}

구매 동기:
${dataset.purchasePoints.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[구매 포인트]
1. ${p.usp[0] || dataset.purchasePoints[0]} 중심의 차별화 포인트
2. ${p.usp[1] || dataset.purchasePoints[1]}을 활용한 신뢰감
3. ${p.usp[2] || dataset.purchasePoints[2]}을 통한 구매 설득

[상세페이지 핵심 컨셉]
메인 컨셉: ${p.direction.join(" + ") || "기획 방향"} 상세페이지
전체 톤앤무드: ${p.goal.join(", ") || "구매 전환과 신뢰 형성"}
콘텐츠 비중:
${p.contentRatio || "메인 비주얼 15% / 제품 스토리 20% / 핵심 장점 25% / 신뢰 정보 20% / 구매 유도 20%"}

[상세페이지 전체 흐름]
${dataset.sections.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[섹션별 카피 방향]
메인: ${dataset.copyBlocks.hero}
문제 제기: ${dataset.copyBlocks.problem}
신뢰 문구: ${dataset.copyBlocks.trust}
구매 유도: ${dataset.copyBlocks.cta}

[촬영/합성 방향]
${photoConcepts().map((item, index) => `${index + 1}. ${item}`).join("\n")}

[내부 제작 기본 규격]
${detailPageProductionStandardText()}
기획과 디자인 분량은 기본 10,000px 안에서 완결되도록 구성하고, 분량을 늘릴 때는 5,000px 단위로 섹션을 확장합니다.

[디자이너 전달 메모]
${p.optionMemo || p.clientRequests || dataset.psdMemo.join("\n")}

[고객 입력 핵심 메모]
${p.emphasis || "고객 강조점이 있으면 이 영역에 반영됩니다."}

[광고/표현 주의사항]
피해야 할 요소: ${avoids}
금지 표현: ${p.banWords || "질병 치료, 효능 보장, 의약품 오인 표현"}
`;
}

function isGeneratedText(selector, placeholder) {
  const text = $(selector)?.textContent.trim() || "";
  return text && text !== placeholder && !text.includes("여기에 표시됩니다") && !text.includes("생성 중");
}

function setStepDone(target, done) {
  const step = $(`.step[data-target="${target}"]`);
  if (!step) return;
  step.classList.toggle("done", Boolean(done));
}

function workflowFlags() {
  return {
    hasProject: Boolean(value("productName")),
    hasBrief: Boolean(value("consultSummary") || value("clientRequests") || value("emphasis")),
    hasDrafts: Boolean($("#draftA")?.innerHTML.includes("long-detail-preview")),
    hasClientMail: isGeneratedText("#clientMailResult", "시안 생성 후 고객에게 보낼 메일 초안이 여기에 표시됩니다."),
    hasFeedback: Boolean(value("clientReply") || value("managerMemo")),
    hasRevision: isGeneratedText("#revisionResult", "고객 피드백을 반영한 수정 시안 요약이 여기에 표시됩니다."),
    hasHandoff: isGeneratedText("#handoffResult", "PSD 작업 지시서와 바이버 메시지가 여기에 표시됩니다."),
    hasReview: $$("#review input[type='checkbox']:checked").length > 0,
    hasFinalMail: isGeneratedText("#finalMail", "최종 납품 메일 초안이 여기에 표시됩니다."),
  };
}

function nextWorkflowAction() {
  const flags = workflowFlags();
  if (!flags.hasProject) {
    return {
      target: "projects",
      action: "",
      title: "고객 접수 프로젝트를 먼저 불러오세요",
      detail: "고객 작성폼에서 들어온 접수건을 선택하거나 호아비 테스트 접수건을 추가해 프로젝트를 시작합니다.",
      button: "프로젝트 확인",
    };
  }
  if (!flags.hasBrief) {
    return {
      target: "brief",
      action: "",
      title: "상담/자료 내용을 확인하세요",
      detail: "고객이 입력한 요청사항, 강조점, 금지 표현, 참고자료를 확인한 뒤 부족한 부분만 보완합니다.",
      button: "자료 확인으로 이동",
    };
  }
  if (!flags.hasDrafts) {
    return {
      target: "drafts",
      action: "drafts",
      title: "1차 촬영·디자인 기획 시안을 검수하세요",
      detail: "고객과 정리한 내용을 바탕으로 촬영 구도·섹션 순서·카피 안전 영역을 확인하고 고객 컨펌을 진행합니다.",
      button: "기획안 검수",
    };
  }
  if (!flags.hasClientMail) {
    return {
      target: "drafts",
      action: "clientMail",
      title: "고객에게 보낼 메일 초안을 준비하세요",
      detail: "최적 단일 시안이 생성되었습니다. 발송 전 점검 후 고객에게 검토 메일을 보낼 수 있습니다.",
      button: "메일 초안 생성",
    };
  }
  if (!flags.hasFeedback) {
    return {
      target: "feedback",
      action: "",
      title: "고객 회신을 기다리거나 피드백을 입력하세요",
      detail: "고객이 남긴 수정 요청을 입력하면 섹션별 수정 방향을 정리합니다.",
      button: "피드백 입력",
    };
  }
  if (!flags.hasRevision) {
    return {
      target: "revision",
      action: "revision",
      title: "고객 피드백 기반 수정 시안을 생성하세요",
      detail: "고객 요청을 섹션별 수정사항과 우선순위로 정리하고, 컨펌 요청 메일을 준비합니다.",
      button: "수정 시안 생성",
    };
  }
  if (!flags.hasHandoff) {
    return {
      target: "psd",
      action: "handoff",
      title: "제작 전달 패키지를 생성하세요",
      detail: "최종 컨펌된 시안을 기준으로 PSD 또는 시안 작업 지시서를 생성합니다.",
      button: value("productionRoute") === "figma" ? "시안 패키지 생성" : "PSD 지시서 생성",
    };
  }
  if (!flags.hasReview) {
    return {
      target: "review",
      action: "",
      title: "내부 검수를 진행하세요",
      detail: "디자인 일치, 문구 오류, 이미지 품질, 레이어 구성을 확인해 납품 전 리스크를 줄입니다.",
      button: "검수 화면으로 이동",
    };
  }
  if (!flags.hasFinalMail) {
    return {
      target: "delivery",
      action: "finalMail",
      title: "최종 납품 메일을 생성하세요",
      detail: "PNG/JPG, 분할 이미지, 선택 PSD 원본 등 납품 범위를 확인하고 최종 메일을 준비합니다.",
      button: "납품 메일 생성",
    };
  }
  return {
    target: "delivery",
    action: "",
    title: "프로젝트 납품 준비가 완료되었습니다",
    detail: "최종 파일과 납품 메일을 확인한 뒤 고객에게 전달하면 됩니다.",
    button: "최종 납품 확인",
    done: true,
  };
}

function renderOperatorNextPanel() {
  const panel = $("#operatorNextPanel");
  if (!panel) return;
  const next = nextWorkflowAction();
  panel.classList.toggle("complete", Boolean(next.done));
  panel.innerHTML = `
    <div>
      <span>${next.done ? "완료 대기" : "추천 다음 작업"}</span>
      <strong>${escapeHtml(next.title)}</strong>
      <p>${escapeHtml(next.detail)}</p>
    </div>
    <button class="${next.done ? "secondary" : "primary"} small" id="nextActionButton" type="button" data-next-target="${escapeHtml(next.target)}" data-next-action="${escapeHtml(next.action || "")}">${escapeHtml(next.button)}</button>
  `;
}

function updateWorkflowState() {
  const flags = workflowFlags();
  setStepDone("projects", flags.hasProject);
  setStepDone("brief", flags.hasBrief);
  setStepDone("planning", isGeneratedText("#planResult", "기획 결과가 여기에 표시됩니다."));
  setStepDone("drafts", flags.hasDrafts);
  setStepDone("feedback", flags.hasFeedback);
  setStepDone("revision", flags.hasRevision);
  setStepDone("psd", flags.hasHandoff);
  setStepDone("review", flags.hasReview);
  setStepDone("delivery", flags.hasFinalMail);
  renderOperatorNextPanel();
  renderProductionHandoffPreflight();
  renderPlanningReviewCard();
}

async function generatePlan() {
  const fallback = generatePlanText();
  $("#planResult").textContent = "AI 기획을 생성 중입니다...";
  try {
    const aiText = await invokeAiRole("planning", "상세페이지 AI 기획 결과 생성", {
      product: product(),
      requiredSections: ["제품 요약", "타깃 분석", "구매 포인트", "상세페이지 핵심 컨셉", "상세페이지 전체 흐름", "섹션별 기획", "디자이너 전달 메모", "광고/표현 주의사항"],
    }, fallback);
    $("#planResult").textContent = aiText || fallback;
    updateAiStatus("AI 기획 생성 완료");
  } catch (error) {
    $("#planResult").textContent = `${fallback}\n\n[AI 연결 안내]\nOpenAI 호출에 실패해 규칙 기반 결과로 대체했습니다.\n사유: ${error.message}`;
    updateAiStatus("AI 호출 실패. 규칙 기반 결과로 대체했습니다.");
  }
  updateWorkflowState();
}

async function prepareInternalAiPlanning() {
  const placeholder = "기획 결과가 여기에 표시됩니다.";
  const current = $("#planResult")?.textContent.trim() || "";
  if (!value("productName")) return;
  if (current && current !== placeholder && !current.includes("여기에 표시됩니다")) return;
  const fallback = generatePlanText();
  try {
    const aiText = await invokeAiRole("planning", "백그라운드 상세페이지 기획/디자인 전략 생성", {
      product: product(),
      requiredSections: ["제품 분석", "타깃 분석", "디자인 컨셉", "디자인 전략", "섹션 구성", "레이아웃 설계"],
      hiddenWorkflow: true,
    }, fallback);
    if ($("#planResult")) $("#planResult").textContent = aiText || fallback;
  } catch {
    if ($("#planResult")) $("#planResult").textContent = fallback;
  }
  updateWorkflowState();
}

function draftText(label, template) {
  const p = product();
  const tone = templateTone(template);
  const title = template === "감성 스토리형"
    ? "소중한 사람에게 전하는 달콤한 건강 한 포"
    : template === "정보 전달형"
      ? "한눈에 확인하는 제품의 핵심 가치"
      : template === "문제 해결형"
        ? "매일 챙기기 어려운 루틴, 간편하게 시작하세요"
        : "리치와 꿀이 담긴 하루 한 포의 프리미엄 루틴";

  return `[${label}] ${template}

시안 한 줄 설명:
${tone.focus}을 중심으로 ${p.productName}의 구매 가치를 보여주는 방향입니다.

디자인 톤:
${tone.tone}

주요 색상:
${tone.colors}

메인 카피:
${title}

서브 카피:
${p.oneLine}

섹션 구성:
1. 메인 비주얼
   - 목적: 첫 화면에서 제품 이미지와 핵심 메시지를 전달
   - 이미지 방향: 패키지 정면컷, 제품 연출컷

2. 원료/브랜드 스토리
   - 목적: ${p.usp.join(", ") || "제품 차별점"}을 설득력 있게 소개
   - 이미지 방향: 원료 이미지, 브랜드 감성 이미지

3. 제품 특징
   - 목적: 핵심 장점 3가지를 빠르게 이해시킴
   - 이미지 방향: 아이콘, 카드, 제품 상세컷

4. 선물/사용 장면
   - 목적: 실제 구매 상황을 구체화
   - 이미지 방향: 선물 패키지, 책상/가방/생활 연출

5. 제품 정보
   - 목적: 구성, 원산지, 보관 방법 등 구매 전 정보 정리
   - 이미지 방향: 정보표, 제품 후면, 구성컷

고객 선택 포인트:
${template}은 ${tone.focus}이 중요한 고객에게 적합합니다.

디자이너 작업 메모:
선택 템플릿의 분위기를 유지하고, ${p.avoid.join(", ") || "피해야 할 요소"}는 적용하지 않습니다.`;
}

function isCustomerPreviewMode() {
  return $(".draft-workspace")?.classList.contains("customer-preview-mode") ?? true;
}

function draftMarkup(label, template, options = {}) {
  const tone = templateTone(template);
  const p = product();
  const dataset = categoryDataset(p.category);
  const templateData = templateDataset(template);
  const slots = copySlots();
  const images = detailImageSet();
  const visualClass = templateVisualClass(template);
  const controls = draftControls();
  const blueprint = generateDetailBlueprint(label, template, templateData, controls, latestDesignWorkflow());
  const accent = blueprint.colorSystem || draftAccent(controls.tone);
  const concept = designConcept(label, template);
  const referenceStyle = referenceStyleForDraft(label, template);
  const editKey = label.includes("B") ? "B" : "A";
  const customerOnly = options.customerOnly ?? isCustomerPreviewMode();
  const sections = blueprint.sections;
  const orderedSections = orderedSectionsForDraft(sections, editKey);
  const draftKeyClass = label.includes("B") ? "ab-version-b" : "ab-version-a";
  const previewTitle = label.includes("B") ? "B안 전환 집중형 상세페이지" : "A안 프리미엄 브랜드형 상세페이지";
  const previewCopy = label.includes("B")
    ? "구매 포인트와 신뢰 정보를 앞쪽에 배치해 빠른 선택을 유도하는 방향입니다."
    : "제품 이미지, 원료 스토리, 선물 가치를 고급스럽게 보여주는 방향입니다.";
  const useSalesRenderer = shouldUseSalesDesignRenderer(p, blueprint);
  const templateRules = blueprint.templateRules || templateDesignRules(template);
  const renderedDraft = renderedDraftAsset(label, p);
  const detailSectionsHtml = customerOnly && useSalesRenderer
    ? `<div class="sales-detail-page sales-${label.includes("B") ? "conversion" : "premium"}">${salesAmbientProductLayer(label.includes("B"))}${salesTemplateMixDetailPage(p, images, label.includes("B"), blueprint.profile.industry, slots.productName || p.productName || "제품명", slots.oneLine || dataset.copyBlocks.hero, p.usp.length ? p.usp : fallbackUspForIndustry(blueprint.profile.industry), p.highlight.length ? p.highlight : dataset.purchasePoints)}</div>`
    : useSalesRenderer
    ? salesDetailPageMarkup(label, template, slots, images, dataset, concept, sectionEdits[editKey], blueprint)
    : orderedSections.map((section, index) => {
      const originalIndex = section.__originalIndex ?? index;
      return detailSectionMarkup(section, index, label, template, slots, images, dataset, concept, sectionEdits[editKey]?.[originalIndex], blueprint);
    }).join("");

  return `
    <div class="long-detail-preview ${useSalesRenderer ? "sales-detail-renderer" : ""} ${draftKeyClass} ${visualClass} ${concept.className} industry-${blueprint.profile.industry} style-${blueprint.profile.styleKey} image-${controls.imagePosition} density-${controls.density}" style="--draft-accent:${accent.accent};--draft-bg:${accent.bg};--draft-dark:${accent.dark};">
      <div class="customer-draft-label">
        <span>${escapeHtml(label)}</span>
        <div>
          <strong>${escapeHtml(previewTitle)}</strong>
          <p>${escapeHtml(previewCopy)}</p>
        </div>
      </div>
      <div class="design-concept-strip">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(blueprint.profile.name)}</strong>
        <em>${escapeHtml(referenceStyle.name)} · ${escapeHtml(blueprint.profile.mode)}</em>
      </div>
      <div class="reference-style-strip">
        <b>AI DESIGN STRATEGY</b>
        <span>${escapeHtml(blueprint.summary)}</span>
      </div>
      ${renderedDraft ? `
        <figure class="rendered-draft-preview">
          <img src="${renderedDraft}" alt="${escapeHtml(`${label} 고객 발송용 렌더 시안`)}">
        </figure>
      ` : ""}
      ${detailSectionsHtml}
    </div>
    ${customerOnly ? "" : `<div class="draft-summary">
      <h3>${escapeHtml(label)} ${escapeHtml(template)}</h3>
      <p><strong>형태</strong> 세로형 상세페이지 디자인 시안</p>
      <p><strong>디자인</strong> ${escapeHtml(concept.title)} / ${escapeHtml(referenceStyle.name)}</p>
      <p><strong>메인 카피</strong> ${escapeHtml(slots.oneLine || dataset.copyBlocks.hero)}</p>
      <p><strong>템플릿 의도</strong> ${escapeHtml(templateData?.intent || tone.focus)}</p>
      <ul>
        <li>레이아웃: ${escapeHtml(tone.tone)}</li>
        <li>템플릿 골격: ${escapeHtml(templateRules.layoutSignature || "선택 템플릿 기준 섹션 구조")}</li>
        <li>디자인 문법: ${escapeHtml((templateRules.visualGrammar || []).slice(0, 5).join(" / ") || "제품 이미지, 정보 위계, CTA")}</li>
        <li>수정 가능 영역: ${escapeHtml((templateRules.editableParts || []).slice(0, 5).join(" / ") || "문구 / 이미지 / 색상 / 섹션")}</li>
        <li>생성 전략: ${escapeHtml(blueprint.profile.name)} / ${escapeHtml(blueprint.profile.focus || blueprint.profile.styleKey)}</li>
        <li>이미지 전략: ${escapeHtml(blueprint.profile.imageStrategy)}</li>
        <li>이미지 AI 계획: ${blueprint.imagePlan.length}개 촬영/합성 프롬프트 연결</li>
        <li>적용 기준: 업종, 제품 특성, 고객 선택 방향, 강조 요소</li>
        <li>강조: ${escapeHtml(p.usp.join(", ") || "제품 핵심 USP")}</li>
      </ul>
      <div class="draft-quality-grid">
        <div><b>섹션 수</b><span>${sections.length}개 긴 세로형 구성</span></div>
        <div><b>이미지 구조</b><span>대표컷 / 디테일컷 / 스토리컷 역할 분리</span></div>
        <div><b>디자인 블록</b><span>카드, 비교표, CTA, 신뢰 요소 자동 배치</span></div>
        <div><b>A/B 차별화</b><span>${escapeHtml(concept.keywords)}</span></div>
      </div>
    </div>`}
  `;
}

function renderedDraftAsset(label, p = product()) {
  const isHoabi = (p.productName || "").includes("호아비") || (p.references || "").includes("hoabi");
  if (!isHoabi) return "";
  return label.includes("B")
    ? "assets/rendered-drafts/hoabi-rendered-b.jpg"
    : "assets/rendered-drafts/hoabi-rendered-a.jpg";
}

function referenceStyleForDraft(label, template) {
  const p = product();
  const isB = label.includes("B");
  const isHoabi = (p.productName || "").includes("호아비") || (p.references || "").includes("hoabi");
  if (isHoabi) {
    return isB
      ? {
          id: "hoabi-conversion",
          name: "호아비 정보전달형",
          description: "30포 구성, 휴대성, 선물 패키지, 제품 정보를 빠르게 확인할 수 있는 호아비 전용 구성",
        }
      : {
          id: "hoabi-premium",
          name: "호아비 프리미엄 선물형",
          description: "리치 원료, 프리미엄 꿀, 핑크 패키지, 선물 이미지를 중심으로 구성한 호아비 전용 무드",
        };
  }
  if (p.category.includes("식품") || p.category.includes("건강")) {
    return isB
      ? {
          id: "health-commerce",
          name: "건강식품 정보전달형",
          description: "구성, 섭취 편의성, 신뢰 정보, 구매 판단 요소를 빠르게 정리하는 구성",
        }
      : {
          id: "food-ingredient",
          name: "원료 프리미엄형",
          description: "원료, 패키지, 신뢰 정보, 브랜드 무드를 중심으로 구성",
        };
  }
  if (p.category.includes("생활")) {
    return isB
      ? { id: "premium-lifestyle-product", name: "문제해결 전환형", description: "문제 제기 후 제품 해결 구조를 강하게 배치" }
      : { id: "premium-lifestyle-product", name: "감성 제품컷형", description: "감성 제품컷과 넓은 여백을 중심으로 구성" };
  }
  return isB
    ? { id: "commerce", name: "커머스 전환형", description: "배지, 카드, 비교표 중심의 판매형 구성" }
    : { id: "premium", name: "프리미엄 브랜드형", description: "여백, 사진, 브랜드 무드 중심의 자사몰형 구성" };
}

function designConcept(label, template) {
  const isB = label.includes("B");
  if (isB) {
    return {
      className: "concept-graphic",
      title: "Trendy Graphic Commerce",
      keywords: "Bold Color / Badge / Card / Conversion",
      badge: "TRENDY",
      cta: "구매 포인트 한눈에 보기",
    };
  }
  return {
    className: "concept-premium",
    title: "Premium Brand Editorial",
    keywords: "Luxury / Minimal / White Space / Gift",
    badge: "PREMIUM",
    cta: "프리미엄 선물 루틴 제안",
  };
}

function shouldUseSalesDesignRenderer(p = product(), blueprint = {}) {
  const text = `${p.productName} ${p.category} ${p.references}`.toLowerCase();
  const industry = normalizeIndustryKey(blueprint.profile?.industry || inferProductIndustry(p));
  return ["health", "beauty", "living", "fashion", "commerce"].includes(industry)
    || text.includes("호아비")
    || text.includes("꿀")
    || text.includes("건강");
}

function editedValue(edits = [], index, key, fallback) {
  return edits?.[index]?.[key] || fallback;
}

function editedImageSlot(edits = [], index, fallback) {
  return edits?.[index]?.imageSlot || fallback;
}

// ── 상세페이지 렌더 엔진은 detailpage-render.js 로 분리됨 (M5) ──

function benefitSubcopy(item, index, industry = inferProductIndustry()) {
  industry = normalizeIndustryKey(industry);
  const maps = {
    health: [
      "원료 스토리를 첫 화면부터 설득력 있게 보여줍니다.",
      "고급 식품 이미지와 선물 가치를 함께 전달합니다.",
      "개별 포장과 휴대성을 직관적으로 이해시킵니다.",
      "구성, 정보, 주의사항을 구매 전 확인하기 쉽게 정리합니다.",
    ],
    beauty: [
      "제형과 사용감이 느껴지는 감성 비주얼로 연결합니다.",
      "피부 고민과 제품 장점을 빠르게 매칭해 보여줍니다.",
      "사용 루틴과 사용 장면을 자연스럽게 이해시킵니다.",
      "성분, 사용법, 주의사항을 과장 없이 정리합니다.",
    ],
    living: [
      "고객이 겪는 불편 상황을 먼저 공감하게 만듭니다.",
      "제품 사용 후 달라지는 해결 장면을 직관적으로 보여줍니다.",
      "설치, 사용, 보관 흐름을 빠르게 이해시킵니다.",
      "크기, 구성, 소재 등 구매 판단 정보를 정리합니다.",
    ],
    fashion: [
      "브랜드 무드와 착용 이미지를 룩북처럼 보여줍니다.",
      "소재, 핏, 디테일이 구매 이유로 읽히게 만듭니다.",
      "착용 장면과 스타일링 조합을 자연스럽게 연결합니다.",
      "옵션, 사이즈, 소재 정보를 확인하기 쉽게 정리합니다.",
    ],
    commerce: [
      "제품의 핵심 가치를 첫 화면부터 설득력 있게 보여줍니다.",
      "상품 이미지와 구매 이유를 함께 전달합니다.",
      "사용 장면과 장점을 직관적으로 이해시킵니다.",
      "구성, 정보, 주의사항을 구매 전 확인하기 쉽게 정리합니다.",
    ],
  };
  const map = maps[industry] || maps.commerce;
  return map[index] || `${item}의 구매 이유를 짧고 명확하게 전달합니다.`;
}

function normalizeDesignText(items) {
  return Array.isArray(items) ? items.join(" ") : String(items || "");
}

function normalizeIndustryKey(industry = "commerce") {
  const key = String(industry || "commerce").toLowerCase();
  if (key === "cosmetics" || key === "cosmetic" || key === "beauty") return "beauty";
  if (key === "health" || key === "food" || key === "supplement") return "health";
  if (key === "living" || key === "home") return "living";
  if (key === "fashion" || key === "apparel") return "fashion";
  return key || "commerce";
}

function inferProductIndustry(p = product()) {
  const text = `${p.category} ${p.productName} ${p.oneLine} ${p.emphasis} ${p.clientRequests}`.toLowerCase();
  if (text.includes("화장") || text.includes("뷰티") || text.includes("스킨") || text.includes("앰플") || text.includes("크림") || text.includes("cosmetic") || text.includes("beauty")) return "beauty";
  if (text.includes("생활") || text.includes("청소") || text.includes("주방") || text.includes("수납") || text.includes("가전")) return "living";
  if (text.includes("건강") || text.includes("식품") || text.includes("꿀") || text.includes("스틱") || text.includes("원료")) return "health";
  if (text.includes("패션") || text.includes("의류") || text.includes("신발")) return "fashion";
  return "commerce";
}

function analyzeProductForDesign(p = product()) {
  const industry = inferProductIndustry(p);
  const text = `${p.productName} ${p.category} ${p.oneLine} ${p.emphasis} ${p.mustInclude} ${p.clientRequests} ${normalizeDesignText(p.highlight)} ${normalizeDesignText(p.usp)}`;
  const hasGift = /선물|부모님|패키지|gift/i.test(text);
  const hasIngredient = /원료|성분|리치|꿀|소재|ingredient/i.test(text);
  const hasConvenience = /간편|휴대|스틱|개별|루틴|편의/i.test(text);
  const hasTrust = /인증|검사|신뢰|원산지|서류|정보|주의/i.test(text);
  const riskLevel = industry === "health" || /의약|효능|치료|면역|질병/i.test(`${p.banWords} ${normalizeDesignText(p.avoid)}`)
    ? "high"
    : "normal";
  return {
    industry,
    productType: industry === "health" ? "premium-health-food" : industry,
    purchaseMotives: [
      hasIngredient && "원료/성분 신뢰",
      hasConvenience && "간편 사용/섭취",
      hasGift && "선물 가치",
      hasTrust && "검증 정보",
    ].filter(Boolean),
    visualNeeds: [
      hasIngredient && "원료 또는 소재 이미지",
      hasConvenience && "사용 장면 또는 휴대 장면",
      hasGift && "패키지/선물 연출",
      hasTrust && "인증/검사/정보 자료",
    ].filter(Boolean),
    risks: riskLevel === "high" ? ["과장 효능 표현 금지", "의약품 오인 표현 금지", "검증되지 않은 수치/후기 강조 금지"] : ["과장 광고 표현 주의"],
    positioning: hasGift || p.direction.includes("프리미엄 브랜드형") ? "premium-gift" : "conversion",
  };
}

function designDecisionFromAnalysis(analysis, p = product()) {
  analysis = { ...analysis, industry: normalizeIndustryKey(analysis.industry) };
  const categoryDefaults = {
    health: {
      mood: "premium-trust",
      colors: { primary: "#b9822d", secondary: "#d16c2f", bg: "#fff8ee", dark: "#2b241b" },
      typography: "고급 세리프 포인트와 정돈된 정보형 본문",
      hierarchy: ["원료 스토리", "섭취 편의성", "선물성", "신뢰 자료", "제품 정보"],
    },
    beauty: {
      mood: "sensory-editorial",
      colors: { primary: "#c58b9b", secondary: "#d86f86", bg: "#fff4f7", dark: "#35222a" },
      typography: "얇은 감성 헤드라인과 촉감 중심 본문",
      hierarchy: ["브랜드 무드", "사용감", "핵심 장점", "사용 장면", "신뢰 요소"],
    },
    living: {
      mood: "clean-solution",
      colors: { primary: "#397577", secondary: "#5f7f8b", bg: "#f5fbfa", dark: "#203738" },
      typography: "명확한 정보형 타이틀과 비교가 쉬운 본문",
      hierarchy: ["문제 상황", "해결 방식", "사용법", "비교/설득", "구매 정보"],
    },
    fashion: {
      mood: "editorial-lookbook",
      colors: { primary: "#8b6f55", secondary: "#1f1b17", bg: "#fbf8f4", dark: "#231f1b" },
      typography: "룩북형 큰 제목과 소재/핏 정보",
      hierarchy: ["브랜드 무드", "착용/연출", "디테일", "옵션", "구매 유도"],
    },
    commerce: {
      mood: "premium-commerce",
      colors: { primary: "#9b7448", secondary: "#c66b2d", bg: "#fffaf4", dark: "#29231e" },
      typography: "상품명 중심 타이틀과 구매 판단 본문",
      hierarchy: ["핵심 가치", "장점", "사용 장면", "신뢰 요소", "구매 유도"],
    },
  };
  const base = categoryDefaults[analysis.industry] || categoryDefaults.commerce;
  return {
    ...base,
    targetTone: p.direction.includes("감성 스토리형") ? "emotional" : analysis.positioning,
    mustShow: [...analysis.purchaseMotives, ...analysis.visualNeeds],
    riskRules: analysis.risks,
  };
}

function abStrategyFromDecision(decision, analysis) {
  analysis = { ...analysis, industry: normalizeIndustryKey(analysis.industry) };
  const brandFlow = analysis.industry === "living"
    ? ["hero", "problem", "solution", "benefit", "usage", "trust", "info", "cta"]
    : ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"];
  const conversionFlow = analysis.industry === "beauty"
    ? ["hero", "benefit", "lifestyle", "trust", "info", "cta"]
    : ["hero", "benefit", "compare", "lifestyle", "trust", "info", "cta"];
  return {
    A: {
      name: "Premium Brand Concept",
      mode: "brand",
      focus: "브랜드 무드, 원료/스토리, 선물성, 고급 이미지",
      styleKey: decision.mood,
      colorSystem: { accent: decision.colors.primary, bg: decision.colors.bg, dark: decision.colors.dark },
      flow: brandFlow,
      visualDensity: "editorial-rich",
      ctaTone: "부드러운 구매 제안",
    },
    B: {
      name: "Conversion Commerce Concept",
      mode: "conversion",
      focus: "구매 포인트, 정보 위계, 신뢰 자료, 명확한 CTA",
      styleKey: analysis.industry === "health" ? "trust-commerce" : "bold-commerce",
      colorSystem: { accent: decision.colors.secondary, bg: "#ffffff", dark: decision.colors.dark },
      flow: conversionFlow,
      visualDensity: "commerce-rich",
      ctaTone: "명확한 선택 유도",
    },
  };
}

function designBlockLibraryForIndustry(industry = "commerce") {
  industry = normalizeIndustryKey(industry);
  const library = {
    health: {
      rhythmA: ["PREMIUM STORY", "INGREDIENT TRUST", "GIFT ROUTINE", "SAFE INFO"],
      rhythmB: ["CHECK INGREDIENT", "COMPARE POINT", "TRUST INFO", "BUYING CTA"],
      heroA: [
        { label: "01", title: "Premium Mood", copy: "원료와 패키지가 만든 고급 식품 이미지" },
        { label: "02", title: "Gift Package", copy: "선물용으로 보이는 구성과 첫인상" },
        { label: "03", title: "Daily Routine", copy: "하루 한 포의 간편한 루틴 제안" },
      ],
      heroB: [
        { label: "01", title: "제품 이해", copy: "원료·구성·섭취 편의" },
        { label: "02", title: "구매 판단", copy: "선물성·휴대성·정보 확인" },
        { label: "03", title: "전환 유도", copy: "마지막 CTA까지 연결" },
      ],
      proofA: [
        { value: "Mood", title: "따뜻한 원료 감성", copy: "리치와 꿀의 색감이 느껴지는 부드러운 브랜드 장면" },
        { value: "Gift", title: "고급 선물 이미지", copy: "패키지와 구성품의 프리미엄 인상" },
        { value: "Trust", title: "차분한 정보 정리", copy: "건강식품 표현 기준을 지키며 필요한 정보 전달" },
      ],
      proofB: [
        { value: "01", title: "원료와 구성", copy: "구매 전 확인해야 하는 핵심 정보를 앞쪽에 정리" },
        { value: "02", title: "휴대/섭취 편의", copy: "언제 어디서나 챙길 수 있는 사용 이유 강조" },
        { value: "03", title: "선물 판단", copy: "패키지와 구성품으로 선물 적합성 판단" },
      ],
      checkoutA: [
        { title: "Gift", copy: "선물용 패키지 무드" },
        { title: "Routine", copy: "하루 한 포 프리미엄 루틴" },
        { title: "Premium", copy: "원료 스토리와 제품 구성" },
      ],
      checkoutB: [
        { title: "구성", copy: "30포 스틱형 구성" },
        { title: "사용", copy: "휴대와 섭취가 쉬운 한 포" },
        { title: "확인", copy: "원료/주의 정보 체크" },
      ],
    },
    beauty: {
      rhythmA: ["BRAND GLOW", "TEXTURE CLOSE-UP", "SENSORY ROUTINE", "SOFT PROOF"],
      rhythmB: ["SKIN CONCERN", "BENEFIT CHECK", "ROUTINE STEP", "REVIEW CTA"],
      heroA: [
        { label: "01", title: "Brand Mood", copy: "제품의 감성과 피부 루틴 이미지를 먼저 전달" },
        { label: "02", title: "Texture Visual", copy: "제형과 사용감을 크게 보여주는 비주얼" },
        { label: "03", title: "Daily Care", copy: "일상 루틴으로 이어지는 부드러운 설계" },
      ],
      heroB: [
        { label: "01", title: "피부 고민", copy: "고객이 가진 사용 전 고민을 빠르게 제시" },
        { label: "02", title: "핵심 장점", copy: "제품 특징을 카드와 배지로 명확히 정리" },
        { label: "03", title: "사용 루틴", copy: "언제 어떻게 쓰는지 바로 이해" },
      ],
      proofA: [
        { value: "Glow", title: "감성 제형 무드", copy: "제형, 빛, 색감으로 제품 경험을 먼저 상상하게 구성" },
        { value: "Care", title: "루틴 연결", copy: "사용 장면과 브랜드 이미지를 자연스럽게 연결" },
        { value: "Trust", title: "성분/사용 정보", copy: "과장 없이 필요한 정보와 주의사항을 정리" },
      ],
      proofB: [
        { value: "01", title: "고민별 선택 이유", copy: "구매 전 피부 고민과 제품 특징을 빠르게 연결" },
        { value: "02", title: "제형/사용감 확인", copy: "텍스처와 사용 방법을 이미지 중심으로 정리" },
        { value: "03", title: "후기형 설득", copy: "리뷰 카드처럼 읽히는 신뢰 요소 구성" },
      ],
      checkoutA: [
        { title: "Mood", copy: "브랜드 감성 유지" },
        { title: "Texture", copy: "제형 이미지 강조" },
        { title: "Routine", copy: "사용 순서 연결" },
      ],
      checkoutB: [
        { title: "고민", copy: "피부 고민 확인" },
        { title: "장점", copy: "핵심 기능 정리" },
        { title: "사용", copy: "루틴/사용법 확인" },
      ],
    },
    living: {
      rhythmA: ["PROBLEM SCENE", "CLEAN SOLUTION", "USAGE FLOW", "PRACTICAL CTA"],
      rhythmB: ["BEFORE ISSUE", "SOLUTION CHECK", "COMPARE INFO", "BUY NOW"],
      heroA: [
        { label: "01", title: "생활 문제", copy: "고객이 겪는 불편 상황을 먼저 보여줌" },
        { label: "02", title: "깔끔한 해결", copy: "제품이 해결하는 방식을 직관적으로 제시" },
        { label: "03", title: "사용 장면", copy: "집/사무실/주방 등 실제 사용 맥락 연결" },
      ],
      heroB: [
        { label: "01", title: "문제 확인", copy: "구매 전 불편 포인트를 빠르게 공감" },
        { label: "02", title: "해결 비교", copy: "일반 방법과 제품 사용의 차이 정리" },
        { label: "03", title: "구매 판단", copy: "스펙과 구성 정보를 앞쪽에서 확인" },
      ],
      proofA: [
        { value: "Clean", title: "정돈된 생활 장면", copy: "제품 사용 후 달라지는 장면을 시각적으로 보여줌" },
        { value: "Use", title: "사용 흐름", copy: "설치/사용/보관 과정을 순서대로 구성" },
        { value: "Practical", title: "실용 정보", copy: "크기, 소재, 구성 같은 판단 정보를 정리" },
      ],
      proofB: [
        { value: "01", title: "문제-해결 비교", copy: "왜 필요한지 한눈에 보이는 비교형 구성" },
        { value: "02", title: "사용법/스펙", copy: "설치와 사용 방법을 카드로 빠르게 정리" },
        { value: "03", title: "구매 체크", copy: "사이즈, 구성, 주의사항을 구매 전 확인" },
      ],
      checkoutA: [
        { title: "Scene", copy: "생활 장면 중심" },
        { title: "Use", copy: "사용법 정리" },
        { title: "Clean", copy: "정돈된 이미지" },
      ],
      checkoutB: [
        { title: "문제", copy: "불편 상황 확인" },
        { title: "비교", copy: "해결 방식 비교" },
        { title: "스펙", copy: "구성/크기 확인" },
      ],
    },
    commerce: {
      rhythmA: ["BRAND VALUE", "PRODUCT POINT", "USE SCENE", "FINAL CTA"],
      rhythmB: ["BUYING REASON", "CHECK POINT", "TRUST INFO", "CONVERSION CTA"],
      heroA: [
        { label: "01", title: "Brand Value", copy: "상품의 첫인상과 브랜드 가치를 강조" },
        { label: "02", title: "Product Point", copy: "핵심 장점을 빠르게 이해" },
        { label: "03", title: "Use Scene", copy: "사용 장면으로 구매 이유 연결" },
      ],
      heroB: [
        { label: "01", title: "구매 이유", copy: "핵심 장점과 구매 판단 정보" },
        { label: "02", title: "정보 확인", copy: "구성/스펙/주의사항 정리" },
        { label: "03", title: "선택 유도", copy: "CTA까지 명확히 연결" },
      ],
      proofA: [
        { value: "Brand", title: "브랜드 첫인상", copy: "상품 가치가 먼저 보이는 상세 흐름" },
        { value: "Point", title: "제품 장점", copy: "핵심 장점이 자연스럽게 이어지는 구조" },
        { value: "Trust", title: "신뢰 정보", copy: "구매 전 필요한 정보를 차분히 정리" },
      ],
      proofB: [
        { value: "01", title: "구매 이유 정리", copy: "왜 이 제품을 선택해야 하는지 빠르게 제시" },
        { value: "02", title: "정보 카드", copy: "스펙과 장점을 한눈에 비교" },
        { value: "03", title: "전환 CTA", copy: "마지막 행동까지 흐름 유지" },
      ],
      checkoutA: [
        { title: "Brand", copy: "브랜드 가치" },
        { title: "Point", copy: "제품 장점" },
        { title: "Trust", copy: "신뢰 정보" },
      ],
      checkoutB: [
        { title: "Reason", copy: "구매 이유" },
        { title: "Check", copy: "정보 확인" },
        { title: "CTA", copy: "선택 유도" },
      ],
    },
  };
  return library[industry] || library.commerce;
}

function recommendedDesignBlocks(analysis = analyzeProductForDesign(), decision = designDecisionFromAnalysis(analysis)) {
  const library = designBlockLibraryForIndustry(analysis.industry);
  const giftBoost = analysis.purchaseMotives.includes("선물 가치");
  const trustBoost = analysis.purchaseMotives.includes("검증 정보");
  return {
    industry: analysis.industry,
    mood: decision.mood,
    A: {
      rhythm: library.rhythmA,
      heroBand: library.heroA,
      proofCards: library.proofA,
      checkout: giftBoost ? library.checkoutA : library.checkoutA,
      emphasis: giftBoost ? "선물성/브랜드 무드 강화" : "브랜드 가치와 제품 첫인상 강화",
    },
    B: {
      rhythm: library.rhythmB,
      heroBand: library.heroB,
      proofCards: trustBoost ? library.proofB : library.proofB,
      checkout: library.checkoutB,
      emphasis: trustBoost ? "신뢰 정보와 구매 판단 강화" : "구매 이유와 전환 흐름 강화",
    },
  };
}

function imageGenerationPlanFromWorkflow(analysis, decision, abStrategy, p = product()) {
  const concepts = photoConcepts().slice(0, 8);
  const imageMap = detailImageSet() || {};
  return concepts.map((concept, index) => ({
    id: `image-slot-${String(index + 1).padStart(2, "0")}`,
    slot: imageSlotForPlanIndex(index),
    role: concept,
    prompt: photoPromptText(concept, index),
    usedFor: index < 2 ? "hero/대표 영역" : index < 5 ? "스토리/장점 영역" : "신뢰/구매 유도 영역",
    aiTarget: "GPT Image / Flux / product composite",
    sourceImage: imageMap[imageSlotForPlanIndex(index)] || "",
    note: `${p.productName || "제품"}의 실제 패키지와 로고는 유지하고, 임시 시안에서는 촬영/합성 예정 이미지로 표시합니다.`,
  }));
}

function imageSlotForPlanIndex(index) {
  const slots = ["hero", "stick", "openBox", "package", "giftBag", "origin", "trust", "info"];
  return slots[index] || "hero";
}

function imageSlotProductionStatus(imagePlan = [], p = product()) {
  const sourceMap = detailImageSet() || {};
  const slotActions = {
    hero: {
      status: sourceMap.hero ? "제공 이미지 기반" : "대표컷 촬영 필요",
      tone: "primary",
      finalAction: "제품 비율과 패키지 라벨을 유지한 뒤 배경, 조명, 그림자만 상세페이지 톤에 맞게 보정합니다.",
      customerNote: "대표 제품 이미지는 제공 사진을 기준으로 시안에 반영하고, 최종 제작 시 더 선명한 히어로컷으로 보정합니다.",
      designerNote: "Hero section main product. Keep label readable, add premium background lighting, do not distort package.",
    },
    stick: {
      status: sourceMap.stick ? "제공 이미지 기반" : "스틱 단독컷 필요",
      tone: "primary",
      finalAction: "스틱 단독 이미지를 누끼 또는 라이트 그림자로 정리해 장점/휴대성 섹션에 반복 사용합니다.",
      customerNote: "스틱 단독 이미지는 실제 제품 형태를 유지해 휴대성과 섭취 편의성을 보여주는 영역에 사용합니다.",
      designerNote: "Use as reusable product cut. Preserve stick shape and vertical text. Prefer isolated transparent product layer.",
    },
    openBox: {
      status: sourceMap.openBox ? "제공 이미지 기반" : "구성품 컷 필요",
      tone: "primary",
      finalAction: "30포 구성과 패키지 내부가 보이도록 구성품 이미지를 정보 섹션에 배치합니다.",
      customerNote: "구성품 이미지는 제품 수량과 패키지 구성을 이해하기 쉽게 보여주는 용도로 사용합니다.",
      designerNote: "Show package composition clearly. Use in product info, gift, or purchase confirmation block.",
    },
    package: {
      status: sourceMap.package ? "제공 이미지 기반" : "패키지 정면컷 필요",
      tone: "primary",
      finalAction: "패키지 정면 이미지를 선물성, 브랜드 무드, 최종 CTA 구간에 크게 배치합니다.",
      customerNote: "패키지 이미지는 선물용 분위기와 브랜드 첫인상을 보여주는 핵심 이미지로 사용합니다.",
      designerNote: "Use package as premium gift visual. Keep front readable, add soft shadows and ivory/gold styling.",
    },
    giftBag: {
      status: sourceMap.giftBag ? "제공 이미지 기반" : "선물 연출컷 필요",
      tone: "composite",
      finalAction: "쇼핑백/패키지 이미지를 선물 장면으로 합성하거나 실제 촬영컷으로 교체합니다.",
      customerNote: "선물 연출 이미지는 임시로 방향을 잡고, 최종 제작 시 실제 촬영 또는 합성으로 완성도를 높입니다.",
      designerNote: "Gift mood visual. Composite with soft background and package/bag hierarchy. Avoid cheap event banner feel.",
    },
    origin: {
      status: sourceMap.origin ? "제공 이미지 기반" : "원료 합성 필요",
      tone: "composite",
      finalAction: "리치 원물, 꿀 텍스처, 원료 스토리 이미지를 실제 사진 또는 AI 합성 이미지로 보강합니다.",
      customerNote: "원료 스토리 이미지는 임시 합성 기준이며, 최종 제작 시 리치/꿀 무드를 더 자연스럽게 보강합니다.",
      designerNote: "Ingredient/origin visual. Use litchi and honey texture as supporting scene, no medical efficacy graphics.",
    },
    lifestyle: {
      status: sourceMap.lifestyle ? "제공 이미지 기반" : "사용 장면 촬영 필요",
      tone: "composite",
      finalAction: "일상 사용 장면은 고객 제공 사진이 부족하면 촬영 방향 또는 AI 합성 이미지로 보강합니다.",
      customerNote: "사용 장면 이미지는 최종 촬영/합성 후보이며, 시안에서는 분위기와 배치 방향을 먼저 확인합니다.",
      designerNote: "Lifestyle scene. Product must remain central. Use desk, bag, gift, or daily routine setting.",
    },
    trust: {
      status: sourceMap.trust ? "자료 확인 필요" : "신뢰 자료 필요",
      tone: "check",
      finalAction: "인증서, 원산지, 검사 자료가 있다면 실제 자료로 교체하고 없으면 일반 신뢰 카드로 구성합니다.",
      customerNote: "신뢰 자료 영역은 실제 인증/검사 자료 보유 여부에 따라 최종 이미지가 달라질 수 있습니다.",
      designerNote: "Trust proof area. Use only verified documents. If no proof is provided, use neutral checklist cards.",
    },
    info: {
      status: sourceMap.info ? "정보 이미지 확인 필요" : "상세 정보 자료 필요",
      tone: "check",
      finalAction: "제품 상세 정보, 원재료, 보관 방법, 주의사항은 실제 표기 자료를 기준으로 오탈자 없이 정리합니다.",
      customerNote: "제품 정보 영역은 실제 제품 표기와 최종 스펙 확인 후 반영합니다.",
      designerNote: "Product info area. Match final ingredient/spec label exactly. Keep readable typography.",
    },
  };
  const slots = [...new Set([
    ...imagePlan.map((item) => item.slot).filter(Boolean),
    "hero",
    "stick",
    "openBox",
    "package",
    "giftBag",
    "origin",
    "trust",
    "info",
  ])];
  return slots.map((slot, index) => {
    const action = slotActions[slot] || slotActions.hero;
    const plan = imagePlan.find((item) => item.slot === slot);
    const sourceImage = sourceMap[slot] || plan?.sourceImage || "";
    const hasSource = Boolean(sourceImage);
    const isComposite = action.tone === "composite";
    return {
      id: `image-status-${String(index + 1).padStart(2, "0")}`,
      slot,
      label: imageSlotLabel(slot),
      status: hasSource ? action.status : action.status.replace("제공 이미지 기반", "이미지 필요"),
      statusTone: action.tone,
      sourceImage,
      sourceLabel: hasSource ? "제공 이미지 있음" : "최종 이미지 필요",
      finalAction: action.finalAction,
      customerNote: action.customerNote,
      designerNote: action.designerNote,
      risk: isComposite ? "AI 합성/촬영 시 제품 로고와 패키지 형태 왜곡 금지" : "실제 제품 정보와 라벨 가독성 확인",
      usedFor: plan?.usedFor || "상세페이지 주요 섹션",
    };
  });
}

function clientImageStatusSummary() {
  const statusList = latestDesignWorkflow().imageSlotStatus || imageSlotProductionStatus(latestDesignWorkflow().imagePlan || []);
  return statusList.slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.label}: ${item.sourceLabel} / ${item.customerNote}`
  )).join("\n");
}

function designerImageStatusSummary() {
  const statusList = latestDesignWorkflow().imageSlotStatus || imageSlotProductionStatus(latestDesignWorkflow().imagePlan || []);
  return statusList.slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.label} (${item.status})
   - source: ${item.sourceImage || "final shooting/composite needed"}
   - action: ${item.finalAction}
   - designer note: ${item.designerNote}
   - caution: ${item.risk}`
  )).join("\n");
}

function visualPromptsFromImagePlan(imagePlan = [], analysis = analyzeProductForDesign(), abStrategy = abStrategyFromDecision(designDecisionFromAnalysis(analysis), analysis), p = product()) {
  const avoidRules = (analysis.risks || []).join(", ") || "과장 광고, 의약품 오인, 왜곡된 제품 표현 금지";
  return imagePlan.map((item, index) => {
    const draftKey = index % 2 === 0 ? "A" : "B";
    const strategy = abStrategy[draftKey] || abStrategy.A;
    const concept = draftKey === "A" ? "프리미엄 브랜드형 상세페이지" : "구매 전환형 상세페이지";
    return {
      id: `${item.id}-prompt`,
      draft: draftKey,
      role: item.role,
      usedFor: item.usedFor,
      modelTarget: "GPT Image / Flux / product composite",
      prompt: `${p.productName || "제품"} 상세페이지용 ${item.role} 이미지를 생성합니다. ${concept} 방향이며, ${strategy?.focus || "상품의 구매 이유"}를 보여줘야 합니다. 한국 쇼핑몰 상세페이지에 어울리는 세로형 섹션 비주얼, 제품 이미지를 중심으로 한 자연스러운 합성, 고급 조명, 깨끗한 배경 그래픽, 카피가 올라갈 여백, 카드/배지/그림자 요소를 포함합니다. 제품 로고와 패키지 형태는 왜곡하지 않습니다.`,
      negativePrompt: `질병 치료, 효능 보장, 의약품처럼 보이는 그래픽, 가짜 인증, 깨진 한글, 저가 이벤트 배너 느낌, 제품 라벨 왜곡 금지. 주의사항: ${avoidRules}`,
      placementRule: item.note,
      sourceImage: item.sourceImage || "",
      sourceImages: item.sourceImage ? [item.sourceImage] : [],
    };
  });
}

function runIntegratedDesignWorkflow() {
  const p = product();
  const analysis = analyzeProductForDesign(p);
  const decision = designDecisionFromAnalysis(analysis, p);
  const abStrategy = abStrategyFromDecision(decision, analysis);
  const designBlocks = recommendedDesignBlocks(analysis, decision);
  const imagePlan = imageGenerationPlanFromWorkflow(analysis, decision, abStrategy, p);
  const visualPrompts = visualPromptsFromImagePlan(imagePlan, analysis, abStrategy, p);
  const imageSlotStatus = imageSlotProductionStatus(imagePlan, p);
  const workflow = {
    orchestrator: "Codex",
    roles: {
      chatgpt: "제품 분석, 카피, 섹션 구성",
      claude: "구조 검토, 리스크/누락 검수",
      codex: "화면 구현, 데이터 연결, 워크플로우 관리",
      imageAi: "상세페이지 비주얼/합성 이미지 생성",
    },
    analysis,
    decision,
    abStrategy,
    designBlocks,
    imagePlan,
    imageSlotStatus,
    visualPrompts,
    qualityGate: [
      "A/B 시안의 전략 차이가 명확한가",
      "상품 업종에 맞는 섹션 순서인가",
      "이미지 슬롯의 역할이 명확한가",
      "이미지 슬롯별 제공/임시/촬영/합성 상태가 정리됐는가",
      "이미지 생성 AI용 프롬프트와 금지 프롬프트가 준비됐는가",
      "구매 전환에 필요한 신뢰/정보/CTA가 포함됐는가",
      "금지 표현과 과장 광고 리스크를 피했는가",
    ],
    updatedAt: new Date().toLocaleString("ko-KR"),
  };
  currentDesignWorkflow = workflow;
  recordAiWorkflowRun("designWorkflow", "local-design", "completed", {
    industry: analysis.industry,
    aStrategy: abStrategy.A.name,
    bStrategy: abStrategy.B.name,
  });
  saveAiArtifact("designWorkflow", "local-design", workflow, {
    task: "통합 AI 상세페이지 디자인 워크플로우 생성",
    providerStatus: "active",
  });
  return workflow;
}

function latestDesignWorkflow() {
  if (currentDesignWorkflow) return currentDesignWorkflow;
  const saved = readAiArtifacts()?.designWorkflow?.result;
  if (saved && typeof saved === "object") {
    currentDesignWorkflow = saved;
    return currentDesignWorkflow;
  }
  return runIntegratedDesignWorkflow();
}

function designEngineProfile(label, template, workflow = latestDesignWorkflow()) {
  const p = product();
  const industry = workflow?.analysis?.industry || inferProductIndustry(p);
  const isB = label.includes("B");
  const templateRules = templateDesignRules(template);
  const industryPresets = {
    health: {
      name: "건강식품 프리미엄",
      styleKey: isB ? "trust-commerce" : "premium-trust",
      colorSystem: isB
        ? { accent: "#d16c2f", bg: "#fff8ee", dark: "#30251d" }
        : { accent: "#b9822d", bg: "#fffaf0", dark: "#2b241b" },
      typography: "신뢰감 있는 세리프 포인트 + 정돈된 정보형 본문",
      imageStrategy: "원료컷, 패키지컷, 섭취 장면, 신뢰 자료를 순서대로 배치",
      flow: ["hero", "story", "benefit", "lifestyle", "trust", "info", "cta"],
    },
    beauty: {
      name: "뷰티 감성 브랜드",
      styleKey: isB ? "glow-commerce" : "sensory-editorial",
      colorSystem: isB
        ? { accent: "#d86f86", bg: "#fff4f7", dark: "#35222a" }
        : { accent: "#c58b9b", bg: "#fff8fa", dark: "#2d2427" },
      typography: "얇고 감성적인 헤드라인 + 여백 중심 프리미엄 본문",
      imageStrategy: "제형, 피부 텍스처, 사용 전후 기대감, 브랜드 무드를 크게 배치",
      flow: ["hero", "story", "lifestyle", "benefit", "trust", "info", "cta"],
    },
    living: {
      name: "생활용품 문제해결",
      styleKey: isB ? "problem-commerce" : "clean-solution",
      colorSystem: isB
        ? { accent: "#397577", bg: "#f5fbfa", dark: "#203738" }
        : { accent: "#5f7f8b", bg: "#f8fbfc", dark: "#253237" },
      typography: "명확한 정보형 타이틀 + 비교가 쉬운 실용 본문",
      imageStrategy: "문제 상황, 사용 장면, 전후 비교, 구성품 정보를 명확히 배치",
      flow: ["hero", "problem", "benefit", "usage", "compare", "info", "cta"],
    },
    fashion: {
      name: "패션/잡화 스타일링",
      styleKey: isB ? "trend-commerce" : "editorial-lookbook",
      colorSystem: isB
        ? { accent: "#1f1b17", bg: "#f7f3ef", dark: "#1f1b17" }
        : { accent: "#8b6f55", bg: "#fbf8f4", dark: "#231f1b" },
      typography: "룩북형 큰 제목 + 소재/핏 정보 중심 본문",
      imageStrategy: "착용컷, 소재 디테일, 스타일링 컷, 옵션 정보를 순서대로 배치",
      flow: ["hero", "lifestyle", "benefit", "lineup", "trust", "info", "cta"],
    },
    commerce: {
      name: "커머스 전환형",
      styleKey: isB ? "bold-commerce" : "premium-commerce",
      colorSystem: isB
        ? { accent: "#c66b2d", bg: "#fff7ed", dark: "#2f2923" }
        : { accent: "#9b7448", bg: "#fffaf4", dark: "#29231e" },
      typography: "상품명 중심 타이틀 + 구매 판단 정보형 본문",
      imageStrategy: "제품 대표컷, 특징컷, 사용컷, 정보컷을 균형 있게 배치",
      flow: ["hero", "benefit", "story", "lifestyle", "trust", "info", "cta"],
    },
  };
  const strategy = isB ? workflow?.abStrategy?.B : workflow?.abStrategy?.A;
  const profile = industryPresets[industry] || industryPresets.commerce;
  return {
    ...profile,
    name: templateRules.profileName || strategy?.name || profile.name,
    styleKey: templateRules.styleKey || strategy?.styleKey || profile.styleKey,
    colorSystem: templateRules.colorSystem || strategy?.colorSystem || profile.colorSystem,
    flow: templateRules.flow || strategy?.flow || profile.flow,
    industry,
    mode: templateRules.mode || strategy?.mode || (isB ? "conversion" : "brand"),
    focus: strategy?.focus || "",
    ctaTone: strategy?.ctaTone || "",
    template,
    templateRules,
    direction: p.direction,
    goals: p.goal,
  };
}

function sectionEngineGroup(section) {
  const type = section.type || "";
  if (type.includes("hero") || type === "summary-hero" || type === "product-intro") return "hero";
  if (type.includes("story") || type.includes("origin") || type === "scene-open") return "story";
  if (type.includes("benefit") || type.includes("lineup")) return "benefit";
  if (type.includes("life") || type.includes("routine") || type.includes("use") || type === "gift") return "lifestyle";
  if (type.includes("trust") || type.includes("proof") || type.includes("notice")) return "trust";
  if (type.includes("info") || type.includes("composition")) return "info";
  if (type.includes("compare") || type.includes("problem") || type.includes("solution")) return type.includes("problem") ? "problem" : "compare";
  if (type.includes("closing") || type.includes("cta") || type.includes("purchase")) return "cta";
  return "benefit";
}

function generateDetailBlueprint(label, template, templateData, controls, workflow = latestDesignWorkflow()) {
  const profile = designEngineProfile(label, template, workflow);
  const templateRules = profile.templateRules || templateDesignRules(template);
  const rawSections = (templateData?.sections || []).filter((section) => {
    if (controls.density !== "simple") return true;
    return !["compare", "closing", "gift-proof"].includes(section.type);
  });
  const flowIndex = new Map(profile.flow.map((item, index) => [item, index]));
  const sections = rawSections
    .map((section, originalIndex) => ({
      ...section,
      engineGroup: sectionEngineGroup(section),
      originalIndex,
    }))
    .sort((a, b) => {
      const aGroup = a.engineGroup;
      const bGroup = b.engineGroup;
      if (aGroup === "hero") return -1;
      if (bGroup === "hero") return 1;
      if (aGroup === "cta") return 1;
      if (bGroup === "cta") return -1;
      return (flowIndex.get(aGroup) ?? 50) - (flowIndex.get(bGroup) ?? 50) || a.originalIndex - b.originalIndex;
    });
  return {
    profile,
    sections,
    colorSystem: profile.colorSystem,
    imagePlan: workflow?.imagePlan || [],
    qualityGate: workflow?.qualityGate || [],
    templateRules,
    summary: `${profile.name} / ${templateRules.layoutSignature || profile.typography} / ${profile.imageStrategy}`,
  };
}

function detailSectionMarkup(section, index, label, template, slots, images, dataset, concept, sectionEdit = {}, blueprint = {}) {
  const imageMap = images || {};
  const selectedImageSlot = sectionEdit.imageSlot || section.imageSlot;
  const imageSrc = imageMap[selectedImageSlot];
  const title = sectionEdit.title || (section.titleSlot ? slots[section.titleSlot] : section.title);
  const copy = sectionEdit.copy || slots[section.copySlot] || dataset.mainMessage;
  const variant = sectionDesignVariant(section, index, concept, sectionEdit);
  const recipe = sectionDesignRecipe(section, index, variant, concept, blueprint);
  const variantClass = variant !== "auto" ? `section-variant-${variant}` : "";
  const sectionClass = index === 0 ? `detail-hero has-reference-image ${variantClass}` : `detail-auto-section ${section.type} ${variantClass}`;
  const sectionNo = String(index + 1).padStart(2, "0");
  const safeTitle = title || template;
  const safeCopy = copy || dataset.mainMessage;
  const sectionStyle = `min-height:${section.height}px${sectionEdit.color && sectionEdit.color !== "auto" ? `;--draft-accent:${sectionEdit.color}` : ""}`;
  const designBadge = sectionDesignBadge(variant, concept);
  const recipePanel = sectionRecipePanel(recipe);
  const supportPanels = `${recipePanel}${imageAiSlotPanel(blueprint.imagePlan, index)}`;
  const strategyPanel = detailStrategyPanel(blueprint, label);
  const imagePlaceholderCopy = index === 0 ? "브랜드 대표 비주얼" : "상세 이미지 영역";
  const imageMarkup = imageSrc
    ? `<img class="${index === 0 ? "detail-reference-img hero-img" : "detail-wide-img"}" src="${imageSrc}" alt="${escapeHtml(title || "상세페이지 참고 이미지")}">`
    : `<div class="${index === 0 ? "detail-product-shot hero-empty-shot" : "detail-image-block"}"><b>${escapeHtml(imageSlotLabel(selectedImageSlot))}</b><span>${escapeHtml(imagePlaceholderCopy)}</span></div>`;

  if (index === 0) {
    const heroBadges = heroBadgeItems();
    const heroProof = heroProofItems();
    return `
      <section class="detail-section ${sectionClass}" style="${sectionStyle}">
        ${designBadge}
        <i class="section-accent accent-line"></i>
        <i class="section-accent accent-block"></i>
        <div class="hero-brand-mark">${escapeHtml(concept.badge)}</div>
        <div class="detail-copy-block">
          <p class="detail-kicker">${escapeHtml(concept.title)}</p>
          ${strategyPanel}
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <strong>${escapeHtml(slots.oneLine || dataset.copyBlocks.hero)}</strong>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-hero-tags">
            ${(product().highlight.length ? product().highlight : dataset.purchasePoints).slice(0, 3).map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
          ${heroCustomerValueBar(label, blueprint)}
          <div class="hero-proof-stack">
            ${heroProof.map((item) => `<div><small>${escapeHtml(item.label)}</small><b>${escapeHtml(item.value)}</b></div>`).join("")}
          </div>
          <div class="detail-cta-row">
            ${heroBadges.map((item) => `<b><span>${escapeHtml(item.value)}</span>${escapeHtml(item.label)}</b>`).join("")}
          </div>
          ${healthTrustRibbon(blueprint)}
          <div class="hero-mini-copy">
            <b>${escapeHtml(concept.cta)}</b>
            <span>${escapeHtml(product().productName || "제품")}의 핵심 구매 포인트를 한 화면에 정리했습니다.</span>
          </div>
          ${supportPanels}
        </div>
        <div class="hero-product-stage">
          <div class="hero-product-frame">${imageMarkup}</div>
          <div class="hero-product-spec">
            <b>${escapeHtml(product().productName || "PRODUCT")}</b>
            <span>${escapeHtml((product().usp[0] || dataset.purchasePoints[0] || "핵심 포인트"))}</span>
          </div>
          ${heroMediaStrip(imageMap, selectedImageSlot)}
          <div class="hero-product-caption">
            <b>MAIN VISUAL</b>
            <span>${imageSrc ? "고객 제공/참고 이미지 우선 배치" : "제품 대표컷 필요"}</span>
          </div>
        </div>
      </section>
    `;
  }

  if (section.type === "benefit-grid" || section.type === "quick-benefits" || section.type === "proof-benefits") {
    const items = (product().usp.length ? product().usp : dataset.purchasePoints).slice(0, 4);
    return `
      <section class="detail-section ${sectionClass}" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle || "제품 핵심 장점")}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="detail-feature-grid">
          ${items.map((item, itemIndex) => `<div><i>${featureIcon(itemIndex)}</i><strong>${String(itemIndex + 1).padStart(2, "0")}</strong><span>${escapeHtml(item)}</span></div>`).join("")}
        </div>
        <div class="product-anatomy-grid">
          ${productAnatomyItems().map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <strong>${escapeHtml(item.value)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        <div class="benefit-showcase">
          ${imageSrc ? imageMarkup : `<div class="detail-image-block"><b>${escapeHtml(imageSlotLabel(selectedImageSlot))}</b><span>상세 이미지 영역</span></div>`}
          <div class="benefit-spec-panel">
            <b>POINT SUMMARY</b>
            ${(product().highlight.length ? product().highlight : dataset.purchasePoints).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
        ${imageRoleCard(selectedImageSlot, recipe)}
        <em>템플릿 규칙: ${escapeHtml(section.note || "섹션 목적에 맞춰 이미지와 카피를 배치")}</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type.includes("story") || section.type.includes("origin") || section.type === "scene-open") {
    return `
      <section class="detail-section ${sectionClass} detail-story-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-story-line">
            <i></i><i></i><i></i>
          </div>
          <div class="origin-stat-row">
            <b>Lychee</b>
            <b>Honey</b>
            <b>Daily Stick</b>
          </div>
          <div class="origin-route-panel">
            <strong>INGREDIENT STORY</strong>
            <span>원료 이미지 → 브랜드 메시지 → 구매 신뢰로 이어지는 스토리 섹션</span>
          </div>
          <div class="ingredient-infographic">
            ${ingredientItems().map((item) => `
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
                <p>${escapeHtml(item.copy)}</p>
              </div>
            `).join("")}
          </div>
          <div class="story-timeline-panel">
            ${storyTimelineItems().map((item) => `
              <div>
                <small>${escapeHtml(item.step)}</small>
                <b>${escapeHtml(item.title)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <em>스토리 규칙: 원료, 브랜드 배경, 고객 상황을 순서대로 읽히게 구성합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "trust" || section.type === "product-info" || section.type === "composition") {
    const infoItems = [
      product().mustInclude || "필수 표기 문구",
      product().banWords || "과장/의약품 오인 표현 금지",
      "원산지, 구성, 보관 방법, 주의사항 확인",
    ];
    return `
      <section class="detail-section ${sectionClass} detail-info-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-info-table">
            ${infoItems.map((item) => `<div><b>CHECK</b><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
          <div class="product-spec-sheet">
            ${productSpecItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <strong>${escapeHtml(item.value)}</strong>
              </div>
            `).join("")}
          </div>
          <div class="trust-badge-row">
            <b>원료 확인</b>
            <b>구성 확인</b>
            <b>표현 검수</b>
          </div>
          <div class="cert-panel">
            <strong>SAFE DETAIL CHECK</strong>
            <p>원료, 구성, 보관, 주의사항을 하단 정보 영역에서 한 번 더 검수합니다.</p>
          </div>
          <div class="trust-proof-grid">
            ${trustProofItems().map((item) => `
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <div class="trust-score-strip">
            ${trustScoreItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <b>${escapeHtml(item.value)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          <em>정보 규칙: 고객이 구매 전 확인해야 하는 근거와 주의사항을 명확하게 배치합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "compare" || section.type === "problem" || section.type === "solution") {
    const rows = comparisonItems();
    const conversionCards = conversionReasonCards();
    return `
      <section class="detail-section ${sectionClass} detail-compare-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} COMPARISON</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="compare-board">
          <div class="compare-head">
            <b>일반 선택</b>
            <b>${escapeHtml(product().productName || "우리 제품")}</b>
          </div>
          ${rows.map((row) => `
            <div class="compare-row">
              <span>${escapeHtml(row.before)}</span>
              <strong>${escapeHtml(row.after)}</strong>
            </div>
          `).join("")}
        </div>
        <em>비교 규칙: 경쟁사를 직접 비방하지 않고 제품 선택 이유를 정보 중심으로 정리합니다.</em>
        <div class="conversion-reason-grid">
          ${conversionCards.map((item) => `
            <div>
              <small>${escapeHtml(item.label)}</small>
              <strong>${escapeHtml(item.title)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "social-proof") {
    return `
      <section class="detail-section ${sectionClass} detail-review-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} SOCIAL PROOF</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="review-card-grid">
          ${reviewSnippets().map((review) => `
            <div>
              <b>${escapeHtml(review.title)}</b>
              <p>${escapeHtml(review.copy)}</p>
            </div>
          `).join("")}
        </div>
        <em>리뷰 규칙: 실제 후기처럼 단정하지 않고, 구매 상황과 기대 포인트를 자연스럽게 제안합니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "lineup") {
    return `
      <section class="detail-section ${sectionClass} detail-lineup-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} LINE UP</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="lineup-card-grid">
          ${lineupItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <strong>${escapeHtml(item.value)}</strong>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${imageSrc ? imageMarkup : ""}
        <em>라인업 규칙: 구성, 수량, 사용 상황을 카드로 정리해 구매 판단을 빠르게 돕습니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "usage-process") {
    return `
      <section class="detail-section ${sectionClass} detail-process-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} PROCESS</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="process-step-grid">
          ${processSteps().map((step, stepIndex) => `
            <div>
              <i>${String(stepIndex + 1).padStart(2, "0")}</i>
              <b>${escapeHtml(step.title)}</b>
              <span>${escapeHtml(step.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${imageSrc ? imageMarkup : ""}
        <em>프로세스 규칙: 고객이 실제 사용 장면을 빠르게 이해하도록 3단계 이하로 정리합니다.</em>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "notice") {
    return `
      <section class="detail-section ${sectionClass} detail-notice-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} NOTICE</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
        </div>
        <div class="notice-panel-grid">
          ${noticeItems().map((item) => `
            <div>
              <b>${escapeHtml(item.title)}</b>
              <span>${escapeHtml(item.copy)}</span>
            </div>
          `).join("")}
        </div>
        ${supportPanels}
      </section>
    `;
  }

  if (section.type === "gift" || section.type === "lifestyle" || section.type === "routine" || section.type === "how-to-use") {
    const scenes = photoConcepts().slice(0, 3);
    return `
      <section class="detail-section ${sectionClass} detail-scene-layout" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(sectionKicker(section, concept))}</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="detail-scene-cards">
            ${scenes.map((item, sceneIndex) => `<div><strong>Scene ${sceneIndex + 1}</strong><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
          <div class="scene-mood-board">
            <b>PHOTO DIRECTION</b>
            <span>임시 시안에서는 고객 제공 사진을 사용하고, 최종 제작 시 촬영/합성컷으로 교체합니다.</span>
          </div>
          <em>이미지 규칙: 초안은 임시 사진으로 배치하고 최종은 촬영/합성컷으로 교체합니다.</em>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  if (section.type === "closing" || section.type === "cta" || section.type === "purchase") {
    return `
      <section class="detail-section ${sectionClass} detail-commerce-cta" style="${sectionStyle}">
        ${designBadge}
        <div class="detail-copy-block">
          <p>${escapeHtml(concept.badge)} CLOSING</p>
          <span>${sectionNo}</span>
          <h4>${escapeHtml(safeTitle)}</h4>
          <p>${escapeHtml(safeCopy)}</p>
          <div class="commerce-badge-grid">
            <b>간편 섭취</b>
            <b>선물 패키지</b>
            <b>프리미엄 원료</b>
          </div>
          <div class="final-offer-box">
            <strong>${escapeHtml(product().productName || "제품")}</strong>
            <span>상세페이지 최종 CTA 영역</span>
          </div>
          <div class="purchase-action-panel">
            <b>지금 필요한 정보를 모두 확인했다면</b>
            <strong>${escapeHtml(product().productName || "제품")} 선택 포인트를 다시 확인하세요</strong>
            <span>최종 제작 시 실제 구매 버튼/스토어 정책에 맞춰 교체됩니다.</span>
          </div>
          <div class="commerce-action-stack">
            ${commerceActionItems().map((item) => `
              <div>
                <small>${escapeHtml(item.label)}</small>
                <b>${escapeHtml(item.title)}</b>
                <span>${escapeHtml(item.copy)}</span>
              </div>
            `).join("")}
          </div>
          ${supportPanels}
        </div>
        ${imageMarkup}
      </section>
    `;
  }

  return `
    <section class="detail-section ${sectionClass}" style="${sectionStyle}">
      ${designBadge}
      <div class="detail-copy-block">
        <p>${escapeHtml(sectionKicker(section, concept))}</p>
        <span>${sectionNo}</span>
        <h4>${escapeHtml(safeTitle)}</h4>
        <p>${escapeHtml(safeCopy)}</p>
        <em>임시 이미지: 고객 제공 사진 배치 / 최종: 촬영 또는 합성 이미지로 교체</em>
        ${supportPanels}
      </div>
      ${imageMarkup}
    </section>
  `;
}

function sectionDesignVariant(section, index, concept, edit = {}) {
  if (edit.variant && edit.variant !== "auto") return edit.variant;
  const isGraphic = concept.className === "concept-graphic";
  if ((section.type || "").startsWith("sales-")) {
    if (section.type === "sales-hero") return isGraphic ? "graphic-badge" : "photo-focus";
    if (section.type === "sales-story") return isGraphic ? "graphic-badge" : "editorial";
    if (section.type === "sales-benefit") return isGraphic ? "graphic-badge" : "premium-card";
    if (section.type === "sales-scene") return "photo-focus";
    if (section.type === "sales-trust" || section.type === "sales-info") return isGraphic ? "premium-card" : "editorial";
    if (section.type === "sales-cta") return isGraphic ? "graphic-badge" : "premium-card";
  }
  if (index === 0) return isGraphic ? "graphic-badge" : "photo-focus";
  if (section.type.includes("story") || section.type.includes("origin") || section.type === "scene-open") return isGraphic ? "graphic-badge" : "editorial";
  if (["benefit-grid", "quick-benefits", "proof-benefits", "lineup", "usage-process"].includes(section.type)) return isGraphic ? "graphic-badge" : "premium-card";
  if (["trust", "product-info", "composition", "notice"].includes(section.type)) return isGraphic ? "premium-card" : "editorial";
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(section.type)) return "photo-focus";
  if (["compare", "problem", "solution", "closing", "cta", "purchase"].includes(section.type)) return isGraphic ? "graphic-badge" : "premium-card";
  return isGraphic ? "graphic-badge" : "premium-card";
}

function sectionDesignBadge(variant, concept) {
  return `<div class="section-design-badge">${escapeHtml(SECTION_VARIANT_BADGES[variant] || concept.title)}</div>`;
}

function detailStrategyPanel(blueprint = {}, label = "A안") {
  const profile = blueprint.profile || {};
  const isB = label.includes("B");
  const motives = latestDesignWorkflow()?.analysis?.purchaseMotives || [];
  const items = motives.length ? motives : ["브랜드 무드", "구매 포인트", "신뢰 정보"];
  return `
    <div class="detail-strategy-panel">
      <small>${escapeHtml(isB ? "CONVERSION STRATEGY" : "BRAND STRATEGY")}</small>
      <b>${escapeHtml(profile.focus || profile.name || "AI 상세페이지 전략")}</b>
      <div>
        ${items.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `;
}

function heroCustomerValueBar(label = "A안", blueprint = {}) {
  const isB = label.includes("B");
  const p = product();
  const workflow = latestDesignWorkflow();
  const motives = workflow?.analysis?.purchaseMotives || [];
  const values = isB
    ? [p.usp[0] || "30포 구성", p.usp[1] || "스틱형 포장", motives[0] || "구매 전 확인 정보"]
    : [motives[0] || "프리미엄 원료", motives[1] || "선물 가치", p.usp[2] || "브랜드 무드"];
  return `
    <div class="hero-customer-value-bar">
      ${values.slice(0, 3).map((item, index) => `
        <div>
          <small>${String(index + 1).padStart(2, "0")}</small>
          <b>${escapeHtml(item)}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function sectionDesignRecipe(section, index, variant, concept, blueprint = {}) {
  const type = section.type || "section";
  const isGraphic = concept.className === "concept-graphic";
  const imagePlan = blueprint.imagePlan?.[index % Math.max(blueprint.imagePlan.length, 1)];
  const base = {
    purpose: "제품 정보를 명확하게 전달하고 다음 섹션으로 자연스럽게 이어지게 합니다.",
    image: imagePlan?.role || "제품 사진 또는 관련 라이프스타일 이미지를 사용합니다.",
    hierarchy: "제목, 핵심 문장, 보조 정보 순서로 읽히게 구성합니다.",
  };
  if (index === 0) {
    return {
      purpose: isGraphic ? "첫 화면에서 구매 포인트를 빠르게 각인시키는 전환형 히어로" : "브랜드 첫인상과 제품 이미지를 고급스럽게 각인시키는 히어로",
      image: imagePlan?.role || "제품 대표컷을 가장 크게 사용하고, 패키지 형태와 색상이 잘 보이게 배치",
      hierarchy: isGraphic ? "제품명 → 핵심 배지 → 구매 포인트 → CTA" : "브랜드 무드 → 제품명 → 감성 카피 → 신뢰 포인트",
      variant,
    };
  }
  if (type.includes("story") || type.includes("origin") || type === "scene-open") {
    return {
      purpose: "원료와 브랜드 배경을 설명해 제품의 프리미엄 이유를 설득",
      image: imagePlan?.role || "원료 이미지, 산지 이미지, 브랜드 무드 이미지 또는 합성컷",
      hierarchy: "스토리 타이틀 → 원료/배경 설명 → 핵심 근거 카드",
      variant,
    };
  }
  if (["benefit-grid", "quick-benefits", "proof-benefits"].includes(type)) {
    return {
      purpose: "구매자가 바로 이해할 수 있게 핵심 장점을 카드로 압축",
      image: imagePlan?.role || "제품 디테일컷, 구성컷, 사용 전후 맥락 이미지",
      hierarchy: "핵심 장점 번호 → 짧은 문장 → 보조 요약 패널",
      variant,
    };
  }
  if (["trust", "product-info", "composition", "notice"].includes(type)) {
    return {
      purpose: "구매 전 확인 정보를 정리해 신뢰와 안전성을 보강",
      image: imagePlan?.role || "인증/성적서/제품 정보표/패키지 후면 이미지",
      hierarchy: "확인 항목 → 체크 리스트 → 주의사항",
      variant,
    };
  }
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(type)) {
    return {
      purpose: "실제 사용 장면을 보여줘 고객이 제품을 쓰는 모습을 상상하게 함",
      image: imagePlan?.role || "손에 든 컷, 책상/가방/선물 장면, 라이프스타일 합성컷",
      hierarchy: "사용 상황 → 장면 카드 → 촬영/합성 방향",
      variant,
    };
  }
  if (["compare", "problem", "solution"].includes(type)) {
    return {
      purpose: "제품을 선택해야 하는 이유를 비교와 해결 구조로 설득",
      image: imagePlan?.role || "문제 상황 이미지, 제품 해결 장면, 비교 인포그래픽",
      hierarchy: "일반 선택의 아쉬움 → 우리 제품의 장점 → 선택 근거",
      variant,
    };
  }
  if (["closing", "cta", "purchase"].includes(type)) {
    return {
      purpose: "마지막 구매 판단을 돕고 고객 행동을 유도",
      image: imagePlan?.role || "패키지 전체컷, 최종 제품컷, 선물 세트 연출컷",
      hierarchy: "최종 제안 → 핵심 배지 → 구매 유도 문장",
      variant,
    };
  }
  return { ...base, variant };
}

function sectionRecipePanel(recipe) {
  return `
    <div class="section-recipe-panel">
      <b>DESIGN RECIPE</b>
      <span>${escapeHtml(recipe.purpose)}</span>
      <small>${escapeHtml(recipe.image)}</small>
    </div>
  `;
}

function imageAiSlotPanel(imagePlan = [], index = 0) {
  const item = imagePlan[index % Math.max(imagePlan.length, 1)];
  if (!item) return "";
  return `
    <div class="image-ai-slot-panel">
      <b>IMAGE AI SLOT</b>
      <span>${escapeHtml(item.role)}</span>
      <small>${escapeHtml(item.usedFor)} · ${escapeHtml(item.aiTarget)}</small>
    </div>
  `;
}

function visualPromptForSection(draftKey = activeSectionDraft, section = {}, index = activeSectionIndex) {
  const workflow = latestDesignWorkflow();
  const prompts = workflow.visualPrompts || [];
  const slot = section.imageSlot || "hero";
  const roleText = `${section.type || ""} ${slot} ${imageSlotLabel(slot)}`;
  const byDraft = prompts.filter((item) => item.draft === draftKey);
  return byDraft.find((item) => roleText.includes(item.role) || item.role.includes(slot))
    || byDraft[index % Math.max(byDraft.length, 1)]
    || prompts[index % Math.max(prompts.length, 1)]
    || null;
}

function sectionVisualPromptPanel(prompt, status = null) {
  if (!prompt) return "";
  return `
    <div class="section-visual-prompt-panel">
      <b>이미지 AI 생성 방향</b>
      <p>${escapeHtml(prompt.prompt)}</p>
      ${prompt.sourceImage ? `<em>참고 이미지: ${escapeHtml(prompt.sourceImage)}</em>` : ""}
      ${status ? `
        <div class="section-image-production-note">
          <strong>${escapeHtml(status.label || imageSlotLabel(status.slot || "hero"))} · ${escapeHtml(status.sourceLabel || "이미지 상태 확인")}</strong>
          <span>${escapeHtml(status.finalAction || "시안 기준으로 이미지 제작 방향을 확인합니다.")}</span>
          <small>${escapeHtml(status.designerNote || "제품 형태와 라벨을 왜곡하지 말 것")}</small>
        </div>
      ` : ""}
      <small>금지: ${escapeHtml(prompt.negativePrompt || prompt.negative_prompt || "제품 왜곡, 과장 표현, 깨진 텍스트 금지")}</small>
    </div>
  `;
}

function imageProductionStatusForSlot(slot = "hero") {
  const workflow = latestDesignWorkflow();
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  return statusList.find((item) => item.slot === slot) || statusList.find((item) => item.slot === "hero") || null;
}

function sectionImageProductionBrief(key = activeSectionDraft) {
  const workflow = latestDesignWorkflow();
  const baseSections = editableSectionsForDraft(key);
  const sections = orderedSectionsForDraft(baseSections, key);
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  const statusBySlot = Object.fromEntries(statusList.map((item) => [item.slot, item]));
  if (!sections.length) return "섹션별 이미지 제작 지시 없음. A/B 시안 생성 후 자동 정리됩니다.";
  return sections.map((section, orderIndex) => {
    const originalIndex = section.__originalIndex ?? orderIndex;
    const edit = sectionEdits[key]?.[originalIndex] || {};
    const slot = edit.imageSlot || section.imageSlot || "hero";
    const status = statusBySlot[slot] || statusBySlot.hero || {};
    const prompt = visualPromptForSection(key, { ...section, imageSlot: slot }, originalIndex);
    return `${String(orderIndex + 1).padStart(2, "0")}. ${sectionDefaultTitle(section)}
   - 섹션 역할: ${sectionKicker(section, designConcept(`${key}안`, key === "B" ? ($("#templateB")?.textContent.trim() || "") : ($("#templateA")?.textContent.trim() || "")))}
   - 이미지 슬롯: ${imageSlotLabel(slot)} / ${status.sourceLabel || "이미지 상태 확인 필요"}
   - 제작 방식: ${status.finalAction || "시안 기준으로 제품 이미지를 배치하고, 필요 시 촬영/합성컷으로 교체"}
   - 디자이너 주의: ${status.designerNote || "제품 형태, 로고, 라벨을 왜곡하지 말 것"}
   - 리스크: ${status.risk || "제품 정보와 이미지 가독성 확인"}
   - 생성 프롬프트: ${prompt?.prompt || "해당 섹션의 이미지 프롬프트는 전체 이미지 계획을 기준으로 적용"}`;
  }).join("\n");
}

function psdLayerGroupGuide(key = value("clientChoice").startsWith("B") ? "B" : "A") {
  const sections = orderedSectionsForDraft(editableSectionsForDraft(key), key);
  if (!sections.length) {
    return `01_Hero
02_Story
03_Ad_Poster
04_Benefit
05_Photo_Plan
06_Trust_Info
07_Purchase_Stack
08_Closing_CTA`;
  }
  return sections.map((section, index) => {
    const type = String(section.type || "section").replace(/[^a-zA-Z0-9]+/g, "_");
    const title = sectionDefaultTitle(section).replace(/\s+/g, " ").trim();
    return `${String(index + 1).padStart(2, "0")}_${type}
   - ${title}
   - ${section.designRole || sectionKicker(section)}`;
  }).join("\n");
}

function featureIcon(index) {
  return ["01", "✓", "+", "★"][index] || "•";
}

function imageSlotLabel(slot) {
  const labels = {
    hero: "제품 대표컷",
    origin: "원료 이미지",
    feature: "제품 디테일컷",
    lifestyle: "사용 장면컷",
    package: "패키지컷",
    trust: "신뢰 자료",
    info: "제품 정보",
    boxYellow: "옐로우 박스컷",
    boxPink: "핑크 박스컷",
    openBox: "30포 오픈박스컷",
    giftBag: "선물 쇼핑백컷",
    stick: "스틱 단독컷",
  };
  return labels[slot] || "상세 이미지";
}

function sectionKicker(section = {}, concept = {}) {
  const type = section.type || "";
  if (type === "sales-hero") return "Main Visual";
  if (type === "sales-story") return "Ingredient Story";
  if (type === "sales-benefit") return "Key Benefits";
  if (type === "sales-scene") return "Lifestyle Scene";
  if (type === "sales-trust") return "Trust & Proof";
  if (type === "sales-info") return "Product Information";
  if (type === "sales-cta") return "Final CTA";
  if (type.includes("story") || type.includes("origin") || type === "scene-open") return "Ingredient Story";
  if (["benefit-grid", "quick-benefits", "proof-benefits"].includes(type)) return "Key Benefits";
  if (["trust", "product-info", "composition"].includes(type)) return "Trust & Information";
  if (["gift", "lifestyle", "routine", "how-to-use"].includes(type)) return "Lifestyle Scene";
  if (["compare", "problem", "solution"].includes(type)) return "Why This Product";
  if (type === "social-proof") return "Customer Voice";
  if (type === "lineup") return "Package Lineup";
  if (type === "usage-process") return "How To Enjoy";
  if (type === "notice") return "Essential Notice";
  if (["closing", "cta", "purchase"].includes(type)) return "Final Offer";
  return concept.badge ? `${concept.badge} Detail` : "Detail Point";
}

function heroBadgeItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { value: "30P", label: "구성" },
      { value: "STICK", label: "휴대" },
      { value: "GIFT", label: "선물" },
    ];
  }
  const points = p.usp.length ? p.usp.slice(0, 3) : categoryDataset(p.category).purchasePoints.slice(0, 3);
  return points.map((point, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: point,
  }));
}

function healthTrustRibbon(blueprint = {}) {
  if (blueprint.profile?.industry !== "health") return "";
  const rules = latestDesignWorkflow()?.decision?.riskRules || ["과장 표현 금지", "원료/구성 명확화", "선물 가치 강조"];
  return `
    <div class="health-trust-ribbon">
      <b>HEALTH FOOD CHECK</b>
      ${rules.slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function heroProofItems() {
  const p = product();
  if ((p.productName || "").includes("호아비")) {
    return [
      { label: "TYPE", value: "Stick pouch" },
      { label: "COUNT", value: "30P" },
      { label: "MOOD", value: "Gift premium" },
    ];
  }
  const usp = p.usp.length ? p.usp : ["핵심 장점", "제품 구성", "구매 이유"];
  return usp.slice(0, 3).map((item, index) => ({
    label: ["POINT", "VALUE", "MOOD"][index] || "INFO",
    value: item,
  }));
}

function heroMediaItems(imageMap = {}, activeSlot = "hero") {
  const p = product();
  const isHoabi = (p.productName || "").includes("호아비") || p.references.includes("hoabi-product");
  const baseItems = isHoabi
    ? [
        { slot: "hero", label: "Main", title: "패키지 대표컷", copy: "첫 화면에서 브랜드 무드와 제품 존재감을 크게 보여줍니다." },
        { slot: "feature", label: "Detail", title: "스틱 디테일컷", copy: "개별 포장, 휴대성, 섭취 편의성을 설명하는 컷입니다." },
        { slot: "origin", label: "Story", title: "원료 스토리컷", copy: "리치와 꿀의 원료 이미지를 감성적으로 보강합니다." },
      ]
    : [
        { slot: "hero", label: "Main", title: "제품 대표컷", copy: "상세페이지 첫 화면에 가장 크게 배치할 이미지입니다." },
        { slot: "feature", label: "Detail", title: "제품 특징컷", copy: "핵심 장점과 디테일을 설명할 때 사용합니다." },
        { slot: "lifestyle", label: "Scene", title: "사용 장면컷", copy: "고객이 실제 사용하는 모습을 상상하게 만듭니다." },
      ];

  return baseItems.map((item) => ({
    ...item,
    src: imageMap[item.slot],
    active: item.slot === activeSlot,
  }));
}

function heroMediaStrip(imageMap, activeSlot) {
  return `
    <div class="hero-media-strip">
      ${heroMediaItems(imageMap, activeSlot).map((item) => `
        <div class="${item.active ? "is-active" : ""}">
          ${item.src ? `<img src="${item.src}" alt="${escapeHtml(item.title)}">` : `<i>${escapeHtml(item.label)}</i>`}
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.copy)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function sectionImageDirection(recipe, slot) {
  return `
    <div class="section-image-direction">
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(recipe.image)}</span>
    </div>
  `;
}

function trustProofItems() {
  const p = product();
  if ((p.productName || "").includes("호아비")) {
    return [
      { title: "원료 스토리", copy: "리치와 꿀 조합의 프리미엄 이미지를 중심으로 구성" },
      { title: "표현 검수", copy: "질병 치료, 효능 보장, 의약품 오인 표현 제외" },
      { title: "구성 확인", copy: "30포, 스틱형, 보관 및 섭취 정보를 명확하게 정리" },
    ];
  }
  return [
    { title: "필수 정보", copy: "구성, 소재, 사용법, 주의사항 확인" },
    { title: "표현 검수", copy: "과장 문구와 오인 가능 표현 제거" },
    { title: "구매 판단", copy: "고객이 비교하고 선택할 수 있는 근거 정리" },
  ];
}

function comparisonItems() {
  const p = product();
  const usp = p.usp.length ? p.usp : ["프리미엄 원료", "개별 스틱 포장", "선물용 패키지"];
  return [
    { before: "원료 스토리가 부족함", after: usp[0] || "원료 차별점 강조" },
    { before: "섭취/사용이 번거로움", after: usp[2] || "간편한 사용성" },
    { before: "선물용 이미지가 약함", after: usp[3] || "패키지와 선물성 강조" },
  ];
}

function conversionReasonCards() {
  const p = product();
  const usp = p.usp.length ? p.usp : categoryDataset(p.category).purchasePoints;
  const goals = p.goal.length ? p.goal : ["구매 전환", "제품 이해", "브랜드 신뢰"];
  return [
    {
      label: "Problem",
      title: "구매 전 망설임 제거",
      copy: goals[0] || "구매 전환에 필요한 핵심 이유를 먼저 보여줍니다.",
    },
    {
      label: "Reason",
      title: usp[0] || "제품만의 선택 이유",
      copy: usp[1] || "경쟁 제품과 다른 포인트를 짧고 강하게 정리합니다.",
    },
    {
      label: "Action",
      title: "지금 선택해야 하는 결론",
      copy: usp[2] || "상세페이지 하단 CTA로 자연스럽게 이어지게 만듭니다.",
    },
  ];
}

function productAnatomyItems() {
  const p = product();
  const usp = p.usp.length ? p.usp : categoryDataset(p.category).purchasePoints;
  return [
    { label: "Core", value: usp[0] || "핵심 장점", copy: "첫 구매 판단을 만드는 가장 강한 USP" },
    { label: "Use", value: usp[1] || "사용 편의", copy: "고객이 바로 이해할 수 있는 사용 장면" },
    { label: "Gift", value: usp[2] || "구성/패키지", copy: "선물성 또는 구성 정보를 시각적으로 보강" },
  ];
}

function storyTimelineItems() {
  const p = product();
  if ((p.productName || "").includes("호아비") || p.references.includes("hoabi-product")) {
    return [
      { step: "01", title: "리치 원료", copy: "제품의 차별화 소재를 먼저 인식시킵니다." },
      { step: "02", title: "꿀 블렌딩", copy: "프리미엄 식품 이미지를 연결합니다." },
      { step: "03", title: "스틱 루틴", copy: "간편한 데일리 섭취 장면으로 마무리합니다." },
    ];
  }
  return [
    { step: "01", title: "브랜드 배경", copy: "왜 이 제품을 만들었는지 설명합니다." },
    { step: "02", title: "제품 근거", copy: "핵심 원료나 기능 정보를 정리합니다." },
    { step: "03", title: "사용 장면", copy: "고객 생활 속 적용 장면으로 연결합니다." },
  ];
}

function trustScoreItems() {
  return [
    { label: "표현 검수", value: "SAFE", copy: "과장/의약품 오인 표현 제외" },
    { label: "정보 구조", value: "CLEAR", copy: "구성, 보관, 주의사항 확인" },
    { label: "구매 판단", value: "READY", copy: "고객이 비교할 근거 정리" },
  ];
}

function productSpecItems() {
  const p = product();
  const isHoabi = (p.productName || "").includes("호아비") || p.references.includes("hoabi-product");
  if (isHoabi) {
    return [
      { label: "제품명", value: "호아비 리치꿀스틱" },
      { label: "구성", value: "30포 구성" },
      { label: "형태", value: "개별 스틱 포장" },
      { label: "무드", value: "선물용 프리미엄 건강식품" },
    ];
  }
  return [
    { label: "제품명", value: p.productName || "제품명" },
    { label: "카테고리", value: p.category || "카테고리" },
    { label: "핵심 장점", value: p.usp[0] || categoryDataset(p.category).purchasePoints[0] || "핵심 장점" },
    { label: "구매 목적", value: p.goal[0] || "구매 전환" },
  ];
}

function imageRoleCard(slot, recipe) {
  return `
    <div class="image-role-card">
      <b>${escapeHtml(imageSlotLabel(slot))}</b>
      <span>${escapeHtml(recipe.image)}</span>
      <small>초안은 임시 배치, 최종은 촬영/합성컷으로 교체</small>
    </div>
  `;
}

function commerceActionItems() {
  const p = product();
  return [
    { label: "CHECK", title: "제품 정보 확인", copy: p.mustInclude || "구성, 원료, 사용 방법 확인" },
    { label: "SELECT", title: "선택 이유 정리", copy: p.usp[0] || "핵심 구매 포인트 확인" },
    { label: "ORDER", title: "구매 전환 유도", copy: "스토어 정책에 맞춰 버튼/혜택 영역 적용" },
  ];
}

function ingredientItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { label: "Origin", value: "Litchi", copy: "리치 원료 스토리로 제품의 차별점을 만듭니다." },
      { label: "Blend", value: "Honey", copy: "꿀의 달콤한 이미지로 프리미엄 식품 무드를 강화합니다." },
      { label: "Routine", value: "Stick", copy: "하루 한 포 루틴을 쉽고 직관적으로 보여줍니다." },
    ];
  }
  const points = categoryDataset(p.category).purchasePoints;
  return [
    { label: "Point 01", value: points[0] || "원료", copy: "제품의 첫 번째 선택 이유를 시각화합니다." },
    { label: "Point 02", value: points[1] || "구성", copy: "구매 전 확인할 핵심 정보를 정리합니다." },
    { label: "Point 03", value: points[2] || "사용", copy: "사용 장면과 구매 이유를 연결합니다." },
  ];
}

function lineupItems() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "구성", value: "30포", copy: "매일 챙기기 좋은 스틱형 구성" },
      { title: "형태", value: "Stick", copy: "가방, 사무실, 선물용으로 편리한 개별 포장" },
      { title: "이미지", value: "Gift", copy: "패키지와 원료 스토리를 함께 강조" },
    ];
  }
  return [
    { title: "구성", value: "Set", copy: "제품 구성을 한눈에 정리합니다." },
    { title: "특징", value: "Point", copy: "구매 판단에 필요한 차별점을 보여줍니다." },
    { title: "활용", value: "Use", copy: "사용 장면과 혜택을 연결합니다." },
  ];
}

function processSteps() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "Open", copy: "개별 스틱을 간편하게 뜯어 준비합니다." },
      { title: "Enjoy", copy: "그대로 또는 음료/요거트와 함께 즐깁니다." },
      { title: "Carry", copy: "가방, 사무실, 선물용으로 부담 없이 챙깁니다." },
    ];
  }
  return [
    { title: "준비", copy: "제품을 사용하기 전 필요한 구성을 확인합니다." },
    { title: "사용", copy: "핵심 기능과 사용 방법을 직관적으로 보여줍니다." },
    { title: "보관", copy: "사용 후 관리와 보관 정보를 정리합니다." },
  ];
}

function noticeItems() {
  const p = product();
  const dataset = categoryDataset(p.category);
  return [
    { title: "표현 검수", copy: p.banWords || dataset.caution.join(", ") },
    { title: "필수 정보", copy: p.mustInclude || "구성, 원산지, 보관 방법, 주의사항" },
    { title: "납품 기준", copy: "최종 PNG/JPG 기준, 분할페이지 요청 시 별도 제공, PSD 원본은 추가금 대상" },
  ];
}

function reviewSnippets() {
  const p = product();
  if (p.productName.includes("호아비")) {
    return [
      { title: "부모님 선물용", copy: "부담스럽지 않은 구성과 고급스러운 패키지 이미지가 선물용으로 어울립니다." },
      { title: "직장인 데일리", copy: "가방이나 책상에 두고 하루 한 포 챙기기 쉬운 스틱형 구성입니다." },
      { title: "원료 스토리", copy: "리치와 꿀의 조합을 제품의 프리미엄 이미지로 자연스럽게 연결합니다." },
    ];
  }
  return [
    { title: "구매 전 확인", copy: "제품 장점과 사용 장면을 한눈에 이해할 수 있도록 정리합니다." },
    { title: "사용 상황", copy: "고객이 실제로 사용할 장면을 먼저 상상할 수 있게 구성합니다." },
    { title: "선택 이유", copy: "구성, 편의성, 신뢰 요소를 구매 판단 포인트로 제안합니다." },
  ];
}

function sectionLayoutItems(template) {
  const p = product();
  const templateData = templateDataset(template);
  const blueprint = generateDetailBlueprint("A안", template, templateData, draftControls(), latestDesignWorkflow());
  if (shouldUseSalesDesignRenderer(p, blueprint)) {
    return salesRendererSections(template === "스토리 스크롤형" || template === "전환 집중형" ? "B안" : "A안", template)
      .map((section) => section.title);
  }
  if (templateData?.sections?.length) {
    return templateData.sections.map((section) => section.title || slotsTitle(section.titleSlot) || section.type);
  }
  const dataset = categoryDataset(p.category);
  const baseProduct = p.productName || "제품";
  const uspText = p.usp.join(", ") || "제품 핵심 장점";

  if (template === "풀비주얼 브랜드형") {
    return [
      `${baseProduct} 메인 비주얼과 핵심 카피`,
      dataset.sections[1] || "브랜드/제품 첫인상 소개",
      `${uspText} 중심의 프리미엄 포인트`,
      dataset.sections[4] || "패키지와 선물 이미지 강조",
      dataset.sections[5] || "제품 구성과 사용 방법",
      dataset.sections[6] || "신뢰 요소와 구매 유도",
    ];
  }
  if (template === "스토리 스크롤형") {
    return [
      "고객 상황 또는 선물 장면으로 시작",
      dataset.sections[1] || "브랜드/원료 스토리 소개",
      `${baseProduct}가 필요한 이유`,
      `${uspText} 상세 설명`,
      dataset.sections[4] || "사용 장면과 패키지 연출",
      dataset.sections[6] || "제품 정보와 구매 안내",
    ];
  }
  if (template === "카드 정보형") {
    return [
      `${baseProduct} 핵심 요약`,
      "제품 장점 3~5가지 카드 정리",
      "원료/구성/사용법 정보 블록",
      "구매 전 확인 정보",
      "후기/인증/신뢰 요소",
      "구매 유도 영역",
    ];
  }
  return [
    "구매 전 고민 제시",
    `${baseProduct} 해결 포인트`,
    `${uspText} 비교/설득 영역`,
    "제품 구성과 사용 편의성",
    "신뢰 요소 정리",
    "구매 전환 CTA",
  ];
}

function slotsTitle(slot) {
  if (slot === "productName") return product().productName || "제품명";
  if (slot === "oneLine") return "제품 한 줄 설명";
  return "";
}

function renderSectionLayouts() {
  const layoutA = $("#templateA")?.textContent.trim() || "풀비주얼 브랜드형";
  const layoutB = $("#templateB")?.textContent.trim() || "스토리 스크롤형";
  const targetA = $("#sectionLayoutA");
  const targetB = $("#sectionLayoutB");
  const libraryA = TEMPLATE_LIBRARY.find((item) => item.name === layoutA);
  const libraryB = TEMPLATE_LIBRARY.find((item) => item.name === layoutB);
  const reasonA = libraryA ? templateRecommendation(libraryA) : null;
  const reasonB = libraryB ? templateRecommendation(libraryB) : null;
  if ($("#templateAReason")) {
    $("#templateAReason").textContent = reasonA ? `추천 ${reasonA.score}% · ${reasonA.reason}` : "제품 정보 기반 추천 방향입니다.";
  }
  if ($("#templateBReason")) {
    $("#templateBReason").textContent = reasonB ? `추천 ${reasonB.score}% · ${reasonB.reason}` : "제품 정보 기반 추천 방향입니다.";
  }
  if (targetA) {
    targetA.innerHTML = sectionLayoutItems(layoutA).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if (targetB) {
    targetB.innerHTML = sectionLayoutItems(layoutB).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if ($("#modalSectionA")) {
    $("#modalSectionA").innerHTML = sectionLayoutItems(layoutA).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
  if ($("#modalSectionB")) {
    $("#modalSectionB").innerHTML = sectionLayoutItems(layoutB).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }
}

function editableSectionsForDraft(key = activeSectionDraft) {
  const template = key === "B"
    ? ($("#templateB")?.textContent.trim() || "스토리 스크롤형")
    : ($("#templateA")?.textContent.trim() || "풀비주얼 브랜드형");
  const controls = draftControls();
  const templateData = templateDataset(template);
  const label = key === "B" ? "B안" : "A안";
  const blueprint = generateDetailBlueprint(label, template, templateData, controls, latestDesignWorkflow());
  if (shouldUseSalesDesignRenderer(product(), blueprint)) {
    return salesRendererSections(label, template);
  }
  return blueprint.sections;
}

function sectionDefaultTitle(section) {
  const slots = copySlots();
  return section.titleSlot ? slots[section.titleSlot] : section.title || slotsTitle(section.titleSlot) || "상세 섹션";
}

function sectionDefaultCopy(section) {
  if (section.copy) return section.copy;
  const slots = copySlots();
  const dataset = categoryDataset(product().category);
  return slots[section.copySlot] || dataset.mainMessage;
}

function sectionColorOptions(selected) {
  const options = [
    ["auto", "전체 색상 유지"],
    ["#c56a2d", "오렌지 포인트"],
    ["#b88a2a", "골드 포인트"],
    ["#4f8f5f", "그린 포인트"],
    ["#1f1b17", "블랙 포인트"],
    ["#d86f86", "핑크 포인트"],
  ];
  return options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function sectionVariantOptions(selected) {
  const options = Object.entries(SECTION_VARIANT_LABELS);
  return options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function imageSlotOptions(selected) {
  const slots = ["hero", "feature", "openBox", "package", "boxYellow", "boxPink", "giftBag", "lifestyle", "origin", "trust", "info"];
  return slots.map((slot) => `<option value="${slot}" ${selected === slot ? "selected" : ""}>${imageSlotLabel(slot)}</option>`).join("");
}

function renderSectionEditor() {
  const target = $("#sectionEditList");
  if (!target) return;
  $("[data-edit-draft='A']")?.classList.toggle("active", activeSectionDraft === "A");
  $("[data-edit-draft='B']")?.classList.toggle("active", activeSectionDraft === "B");
  if ($("#studioDraftLabel")) $("#studioDraftLabel").textContent = `${activeSectionDraft}안 편집 중`;
  if ($("#studioTemplateLabel")) {
    $("#studioTemplateLabel").textContent = activeSectionDraft === "B"
      ? ($("#templateB")?.textContent.trim() || "B안")
      : ($("#templateA")?.textContent.trim() || "A안");
  }

  if (!value("productName")) {
    renderStudioSectionList([]);
    target.innerHTML = `
      <div class="empty-draft-guide">
        <strong>프로젝트를 먼저 불러와주세요.</strong>
        <p>고객 접수 목록에서 프로젝트를 선택하면 섹션 수정 항목이 자동으로 열립니다.</p>
      </div>
    `;
    return;
  }

  const baseSections = editableSectionsForDraft(activeSectionDraft);
  const sections = orderedSectionsForDraft(baseSections, activeSectionDraft);
  if (activeSectionIndex >= sections.length) activeSectionIndex = 0;
  if (!sections.length) {
    renderStudioSectionList([]);
    target.innerHTML = `
      <div class="empty-draft-guide">
        <strong>수정할 섹션이 없습니다.</strong>
        <p>A/B 시안을 다시 생성하면 섹션 목록이 표시됩니다.</p>
      </div>
    `;
    return;
  }

  renderStudioSectionList(sections);
  const section = sections[activeSectionIndex];
  const originalIndex = section.__originalIndex ?? activeSectionIndex;
  const edit = sectionEdits[activeSectionDraft]?.[originalIndex] || {};
  const concept = designConcept(`${activeSectionDraft}안`, activeSectionDraft === "B" ? ($("#templateB")?.textContent.trim() || "") : ($("#templateA")?.textContent.trim() || ""));
  const variant = sectionDesignVariant(section, activeSectionIndex, concept, edit);
  const recipe = sectionDesignRecipe(section, activeSectionIndex, variant, concept);
  const title = edit.title || sectionDefaultTitle(section);
  const copy = edit.copy || sectionDefaultCopy(section);
  const imageSlot = edit.imageSlot || section.imageSlot || "hero";
  const color = edit.color || "auto";
  const selectedVariant = edit.variant || "auto";
  const editState = sectionEditState(section, edit);
  const visualPrompt = visualPromptForSection(activeSectionDraft, { ...section, imageSlot }, originalIndex);
  const imageProduction = imageProductionStatusForSlot(imageSlot);
  if ($("#activeSectionTitle")) $("#activeSectionTitle").textContent = `${String(activeSectionIndex + 1).padStart(2, "0")} ${title}`;
  target.innerHTML = `
    <article class="section-edit-card" data-section-index="${originalIndex}">
      <div class="section-edit-card-head">
        <span>${String(activeSectionIndex + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(sectionKicker(section, concept))}</strong>
        <em>${escapeHtml(activeSectionDraft)}안</em>
      </div>
      <div class="section-edit-status-row">
        <mark class="${escapeHtml(editState.className)}">${escapeHtml(editState.label)}</mark>
        <small>${escapeHtml(imageSlotLabel(imageSlot))} · ${escapeHtml(SECTION_VARIANT_LABELS[selectedVariant] || "자동 디자인")}</small>
      </div>
      <div class="section-order-controls">
        <button type="button" data-section-move="-1" ${activeSectionIndex === 0 ? "disabled" : ""}>위로</button>
        <button type="button" data-section-move="1" ${activeSectionIndex === sections.length - 1 ? "disabled" : ""}>아래로</button>
      </div>
      <div class="section-editor-recipe">
        <b>디자인 목적</b>
        <p>${escapeHtml(section.designRole || recipe.purpose)}</p>
        <b>권장 이미지</b>
        <p>${escapeHtml(recipe.image)}</p>
        <b>정보 위계</b>
        <p>${escapeHtml(recipe.hierarchy)}</p>
      </div>
      <label>섹션 제목
        <input data-section-field="title" value="${escapeHtml(title)}">
      </label>
      <label>섹션 설명
        <textarea data-section-field="copy" rows="6">${escapeHtml(copy)}</textarea>
      </label>
      <details class="section-advanced-settings">
        <summary>색상 / 이미지 / 디자인 스타일 조정</summary>
      ${sectionVisualPromptPanel(visualPrompt, imageProduction)}
      <div class="section-edit-row">
        <label>색상
          <select data-section-field="color">${sectionColorOptions(color)}</select>
        </label>
        <label>사진 슬롯
          <select data-section-field="imageSlot">${imageSlotOptions(imageSlot)}</select>
        </label>
      </div>
      <label>디자인 스타일
        <select data-section-field="variant">${sectionVariantOptions(selectedVariant)}</select>
      </label>
      </details>
    </article>
  `;
  target.querySelectorAll("[data-section-field]").forEach((field) => {
    field.addEventListener("input", () => {
      collectSectionEdits();
      renderDraftPreviewsOnly();
    });
    field.addEventListener("change", () => {
      collectSectionEdits();
      renderDraftPreviewsOnly();
    });
  });
  target.querySelectorAll("[data-section-move]").forEach((button) => {
    button.addEventListener("click", () => moveActiveSection(Number(button.dataset.sectionMove || 0)));
  });
  updateActiveDraftView();
}

function collectSectionEdits() {
  const cards = $$(".section-edit-card");
  if (!cards.length) return;
  const next = sectionEdits[activeSectionDraft] || [];
  cards.forEach((card) => {
    const index = Number(card.dataset.sectionIndex || activeSectionIndex);
    const read = (field) => card.querySelector(`[data-section-field="${field}"]`)?.value.trim() || "";
    const previous = next[index] || {};
    next[index] = {
      title: read("title"),
      copy: read("copy"),
      color: read("color") || "auto",
      imageSlot: read("imageSlot") || "hero",
      variant: read("variant") || "auto",
      autoPolished: false,
      manualEdited: previous.autoPolished || previous.manualEdited ? true : Boolean(Object.keys(previous).length),
    };
  });
  sectionEdits[activeSectionDraft] = next;
}

function sectionEditState(section, edit = {}) {
  if (edit.manualEdited) {
    return {
      label: "수동 수정됨",
      className: "section-state-manual",
    };
  }
  if (edit.autoPolished) {
    return {
      label: "AI 자동 폴리싱",
      className: "section-state-ai",
    };
  }
  if (isSectionEdited(section, edit)) {
    return {
      label: "수정됨",
      className: "section-state-manual",
    };
  }
  return {
    label: "기본값",
    className: "section-state-default",
  };
}

function isSectionEdited(section, edit = {}) {
  if (!edit || !Object.keys(edit).length) return false;
  const defaultTitle = sectionDefaultTitle(section);
  const defaultCopy = sectionDefaultCopy(section);
  const defaultImageSlot = section.imageSlot || "hero";
  return Boolean(
    (edit.title && edit.title !== defaultTitle) ||
    (edit.copy && edit.copy !== defaultCopy) ||
    (edit.color && edit.color !== "auto") ||
    (edit.imageSlot && edit.imageSlot !== defaultImageSlot) ||
    (edit.variant && edit.variant !== "auto")
  );
}

function renderStudioSectionList(sections) {
  const target = $("#studioSectionList");
  if (!target) return;
  if (!sections.length) {
    target.innerHTML = `<li>시안 생성 후 섹션이 표시됩니다.</li>`;
    return;
  }
  target.innerHTML = sections.map((section, index) => {
    const originalIndex = section.__originalIndex ?? index;
    const edit = sectionEdits[activeSectionDraft]?.[originalIndex] || {};
    const title = edit.title || sectionDefaultTitle(section);
    const variantLabel = SECTION_VARIANT_LABELS[edit.variant || "auto"] || "자동 디자인";
    const edited = isSectionEdited(section, edit);
    const editState = sectionEditState(section, edit);
    return `
      <li>
        <button class="${index === activeSectionIndex ? "active" : ""} ${edited ? "edited" : ""}" data-section-pick="${index}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <b>${escapeHtml(title)}</b>
          <em><mark class="${escapeHtml(editState.className)}">${escapeHtml(editState.label)}</mark>${escapeHtml(imageSlotLabel(edit.imageSlot || section.imageSlot || "hero"))} · ${escapeHtml(variantLabel)}</em>
        </button>
      </li>
    `;
  }).join("");
  $$("[data-section-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      collectSectionEdits();
      activeSectionIndex = Number(button.dataset.sectionPick || 0);
      renderSectionEditor();
      scrollActiveDraftSection();
    });
  });
}

function scrollActiveDraftSection() {
  const draft = activeSectionDraft === "B" ? $("#draftB") : $("#draftA");
  const section = orderedPreviewSections(draft)[activeSectionIndex];
  section?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function orderedPreviewSections(draft) {
  const sections = Array.from(draft?.querySelectorAll(".detail-section, .sales-detail-page > section") || []);
  return sections.sort((a, b) => {
    const aOrder = Number(getComputedStyle(a).order || 0);
    const bOrder = Number(getComputedStyle(b).order || 0);
    return aOrder - bOrder;
  });
}

function highlightActiveDraftSection() {
  $$(".detail-section.active-edit-section, .sales-detail-page > section.active-edit-section").forEach((section) => {
    section.classList.remove("active-edit-section");
  });
  const draft = activeSectionDraft === "B" ? $("#draftB") : $("#draftA");
  const section = orderedPreviewSections(draft)[activeSectionIndex];
  section?.classList.add("active-edit-section");
}

function updateActiveDraftView() {
  const draftA = $("#draftA");
  const draftB = $("#draftB");
  draftA?.classList.toggle("inactive-preview", activeSectionDraft !== "A");
  draftB?.classList.toggle("inactive-preview", activeSectionDraft !== "B");
  draftA?.classList.toggle("active-preview", activeSectionDraft === "A");
  draftB?.classList.toggle("active-preview", activeSectionDraft === "B");
  highlightActiveDraftSection();
}

function toggleGuideMode() {
  const workspace = $(".draft-workspace");
  if (!workspace) return;
  const hidden = workspace.classList.toggle("customer-preview-mode");
  const button = $("#toggleGuideMode");
  if (button) button.textContent = hidden ? "내부 가이드 보기" : "고객용 미리보기";
  renderDraftPreviewsOnly();
  renderSectionEditor();
}

function applySectionEdits() {
  collectSectionEdits();
  generateDraftsRules();
  renderSectionEditor();
}

function renderDraftPreviewsOnly() {
  if (!value("productName")) return;
  $("#draftA").innerHTML = draftMarkup("A안", $("#templateA").textContent.trim());
  $("#draftB").innerHTML = draftMarkup("B안", $("#templateB").textContent.trim());
  updateActiveDraftView();
  renderDraftQualityDashboard();
  updateWorkflowState();
}

function generateQualityReviewText() {
  const p = product();
  const workflow = latestDesignWorkflow();
  const imageReady = Boolean(p.references || value("references"));
  const hasBanWords = Boolean(p.banWords || p.avoid.length);
  const sections = editableSectionsForDraft("A").length || 0;
  const blocks = workflow.designBlocks || recommendedDesignBlocks(workflow.analysis, workflow.decision);
  const imageStatus = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  const compositeCount = imageStatus.filter((item) => item.statusTone === "composite").length;
  const sourceCount = imageStatus.filter((item) => item.sourceImage).length;
  const designScore = draftDesignQualityScore();
  const readiness = draftCustomerReadiness(designScore);
  const qualitySignals = [
    ...DETAIL_DESIGN_OPERATION_SIGNALS,
    ...DETAIL_DESIGN_QUALITY_GATES.map((gate) => gate.signal),
  ].filter((item, index, list) => list.indexOf(item) === index);
  return `[AI 디자인 품질 검수]
검수 역할: Claude/품질 검수 AI 역할에 해당하는 단계입니다.

1. 상세페이지 구조
- 긴 세로형 섹션 수: ${sections}개
- 업종 판단: ${workflow.analysis.industry}
- A안 전략: ${workflow.abStrategy.A.name} / ${workflow.abStrategy.A.focus}
- B안 전략: ${workflow.abStrategy.B.name} / ${workflow.abStrategy.B.focus}
- A안 디자인 패키지: ${blocks.A?.emphasis || blocks.A?.concept || "프리미엄/브랜드형"}
- B안 디자인 패키지: ${blocks.B?.emphasis || blocks.B?.concept || "전환/정보형"}

2. 이미지 상태
- 현재 이미지 자료: ${imageReady ? "참고 이미지/제품 이미지 정보 있음" : "이미지 자료 보완 필요"}
- 이미지 AI/촬영 슬롯: ${workflow.imagePlan.length}개
- 제공 이미지 사용 슬롯: ${sourceCount}개
- 촬영/합성 보강 슬롯: ${compositeCount}개
- 대표컷, 디테일컷, 사용 장면컷, 신뢰 자료컷 역할을 섹션별로 확인해야 합니다.

3. 디자인 품질
- 내부 디자인 준비도: ${designScore.score}점 / 100점
- 고객 발송 판단: ${readiness.label}
- Claude 실제 검수 상태: ${readiness.claudeStatus}
- A안은 브랜드/프리미엄 무드 중심, B안은 전환/정보 전달 중심으로 구분되어야 합니다.
- 광고형 고밀도 포스터 구간에서 제품 이미지, 레퍼런스 컷, 구매 포인트가 한 화면 안에 결합되어야 합니다.
- 촬영/합성 방향 구간에서 임시 이미지와 최종 제작 이미지의 차이가 고객에게 설명 가능해야 합니다.
- 구매 설득 마감 구간에서 A/B 선택 이유와 최종 CTA가 명확하게 보여야 합니다.
- 섹션별 카드, 비교표, CTA, 신뢰 요소가 단순 박스처럼 보이지 않는지 확인합니다.
- 보완 필요 항목: ${designScore.missing.length ? designScore.missing.join(", ") : "현재 기준에서는 핵심 디자인 장치가 모두 감지됨"}
- 현재 적용된 디자인 신호:
${qualitySignals.map((item, index) => `  ${index + 1}. ${item}`).join("\n")}

4. 표현 리스크
- 금지 표현 관리: ${hasBanWords ? "금지/주의 표현 입력됨" : "금지 표현 보완 필요"}
- 건강식품/기능성 제품은 질병 치료, 효능 보장, 의약품 오인 표현을 제외해야 합니다.

5. 다음 개선 제안
- ${readiness.nextAction}
- 제품 이미지가 부족하면 임시 시안에는 촬영/합성 방향을 명확히 표시합니다.
- 첫 화면에서 제품 이미지가 작거나 여백이 과하면 히어로 이미지 크기와 제품 쇼케이스 레일을 우선 조정합니다.
- 고객에게 보내기 전 A/B 선택 기준과 수정 가능 범위를 메일에 포함합니다.
- 다음 개발 우선순위는 실제 화면 캡처 기준으로 여백, 이미지 크기, 섹션 길이, CTA 밀도를 조정하는 것입니다.`;
}

function draftDesignQualityScore() {
  const html = `${$("#draftA")?.innerHTML || ""}\n${$("#draftB")?.innerHTML || ""}`;
  const isTemplateMixPreview = html.includes("sales-template-mix-page") && !html.includes("sales-story-section");
  const visualGates = isTemplateMixPreview
    ? TEMPLATE_MIX_QUALITY_GATES
    : DETAIL_DESIGN_QUALITY_GATES;
  const checks = [
    ...visualGates.map((gate) => ({ label: gate.label, pass: gate.check(html) })),
    {
      label: "편집 가능한 섹션 상태",
      pass: isTemplateMixPreview
        ? Boolean(sectionEdits.A?.length || sectionEdits.B?.length)
        : html.includes("sales-final-decision-panel") && Boolean(sectionEdits.A?.length || sectionEdits.B?.length),
    },
    { label: "섹션별 이미지 제작 지시", pass: sectionImageProductionBrief("A").includes("생성 프롬프트") && sectionImageProductionBrief("B").includes("생성 프롬프트") },
  ];
  const passed = checks.filter((item) => item.pass).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    missing: checks.filter((item) => !item.pass).map((item) => item.label),
    checks,
    passed,
    total: checks.length,
  };
}

function hasRenderedPreviewEvidence() {
  const artifacts = readAiArtifacts();
  const quality = artifacts.qualityReview;
  const resultText = typeof quality?.result === "string" ? quality.result : "";
  return resultText.includes("rendered_visual_review") || resultText.includes("시안 렌더 검수 완료") || resultText.includes("Figma 렌더 검수 완료") || resultText.includes("PNG 렌더 검수 완료");
}

function recordRenderedPreviewReview(type = "PNG") {
  const label = type === "figma" ? "시안 렌더 검수 완료" : "PNG 렌더 검수 완료";
  const result = `rendered_visual_review\n${label}\nA/B 시안의 실제 출력 화면을 기준으로 제품 이미지 크기, 섹션 여백, CTA 밀도, 텍스트 가독성을 담당자가 확인했습니다.`;
  saveAiArtifact("qualityReview", "rules", result, {
    reviewType: type,
    checkedBy: "담당자",
    checklist: ["제품 이미지 크기", "섹션 여백", "CTA 밀도", "텍스트 가독성", "A/B 컨셉 차이"],
  });
  renderDraftQualityDashboard();
  renderClientPreflight($("#clientMailResult")?.textContent || "");
  updateWorkflowState();
}

function clearRenderedPreviewReview() {
  const artifacts = readAiArtifacts();
  if (artifacts.qualityReview) {
    delete artifacts.qualityReview;
    localStorage.setItem(`detailAiArtifacts:${currentProjectKey()}`, JSON.stringify(artifacts));
  }
  renderDraftQualityDashboard();
  renderClientPreflight($("#clientMailResult")?.textContent || "");
  updateWorkflowState();
}

function draftCustomerReadiness(score = draftDesignQualityScore()) {
  const renderedChecked = hasRenderedPreviewEvidence();
  const cappedScore = renderedChecked ? score.score : Math.min(score.score, RENDERED_REVIEW_SCORE_CAP);
  const isReady = renderedChecked && cappedScore >= CUSTOMER_READY_SCORE && score.missing.length === 0;
  const isPolish = cappedScore >= 72;
  return {
    score: cappedScore,
    rawScore: score.score,
    renderedChecked,
    isReady,
    tone: isReady ? "ready" : isPolish ? "warning" : "weak",
    label: isReady ? "고객 발송 가능" : renderedChecked ? "디자인 디테일 보완 필요" : "시안/PNG 렌더 검수 전",
    claudeStatus: renderedChecked ? "Claude/시각 검수 결과 반영 가능" : "Claude API 연결 전. 현재는 로컬 기준으로 1차 검수",
    nextAction: renderedChecked
      ? (score.missing[0] || "실제 화면 기준 여백, 이미지 크기, CTA 밀도를 마지막으로 확인하세요.")
      : "전체 미리보기 또는 PNG로 렌더링된 시안을 시각 검수해야 고객 발송 가능 여부를 확정할 수 있습니다.",
  };
}

function abDecisionGuide() {
  const workflow = latestDesignWorkflow();
  return {
    A: {
      title: "A안 추천",
      label: "프리미엄 브랜드/감성형",
      focus: workflow.abStrategy?.A?.focus || "브랜드 무드, 원료 스토리, 선물 이미지",
      bestFor: "고급스러운 첫인상, 브랜드 신뢰, 선물용 이미지를 강조하고 싶을 때",
      check: ["따뜻한 프리미엄 톤", "원료/브랜드 스토리", "선물 패키지 무드"],
    },
    B: {
      title: "B안 추천",
      label: "정보 전달/구매 전환형",
      focus: workflow.abStrategy?.B?.focus || "구매 이유, 비교 정보, 구성 확인",
      bestFor: "고객이 제품 장점과 구매 이유를 빠르게 이해해야 할 때",
      check: ["비교표와 체크리스트", "구성/편의성 정보", "강한 구매 판단 CTA"],
    },
  };
}

function renderDraftQualityDashboard() {
  const target = $("#draftQualityDashboard");
  if (!target) return;
  const score = draftDesignQualityScore();
  const readiness = draftCustomerReadiness(score);
  const decision = abDecisionGuide();
  const topChecks = score.checks.slice(0, 9);
  target.className = `draft-quality-dashboard is-${readiness.tone}`;
  target.innerHTML = `
    <div class="quality-score-card">
      <span>고객 발송 준비도</span>
      <strong>${readiness.score}점</strong>
      <p>구조 ${readiness.rawScore}점 · ${score.passed}/${score.total}개 기준 통과</p>
      <em>${escapeHtml(readiness.label)}</em>
    </div>
    <div class="quality-gate-list">
      <span class="${readiness.renderedChecked ? "pass" : "fail"}">
        <b>${readiness.renderedChecked ? "완료" : "필요"}</b>
        시안/PNG 렌더 검수
      </span>
      <span class="${readiness.isReady ? "pass" : "fail"}">
        <b>${readiness.isReady ? "가능" : "대기"}</b>
        Claude 품질 판단
      </span>
      ${topChecks.map((item) => `
        <span class="${item.pass ? "pass" : "fail"}">
          <b>${item.pass ? "통과" : "보완"}</b>
          ${escapeHtml(item.label)}
        </span>
      `).join("")}
    </div>
    <div class="quality-next-action">
      <b>다음 보완 기준</b>
      <span>${escapeHtml(readiness.nextAction)}</span>
      <small>${escapeHtml(readiness.claudeStatus)}</small>
      <div class="render-review-actions">
        <button type="button" data-render-review="png">PNG 검수 완료</button>
        <button type="button" data-render-review="figma">시안 검수 완료</button>
        <button type="button" data-render-review-clear>초기화</button>
      </div>
    </div>
    <div class="ab-decision-guide">
      ${["A", "B"].map((key) => `
        <article class="${key === "B" ? "is-conversion" : "is-premium"}">
          <span>${escapeHtml(decision[key].title)}</span>
          <strong>${escapeHtml(decision[key].label)}</strong>
          <p>${escapeHtml(decision[key].bestFor)}</p>
          <small>${escapeHtml(decision[key].focus)}</small>
          <div>
            ${decision[key].check.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

async function runQualityReview() {
  const fallback = generateQualityReviewText();
  renderDraftQualityDashboard();
  try {
    const review = await invokeAiRole("qualityReview", "A/B 상세페이지 디자인 품질 검수", {
      product: product(),
      layoutA: $("#templateA")?.textContent.trim() || "",
      layoutB: $("#templateB")?.textContent.trim() || "",
      sectionCount: editableSectionsForDraft("A").length,
      instruction: "A/B 시안이 실제 쇼핑몰 상세페이지로 충분한지 검수하고 누락 요소, 이미지 보완점, 표현 리스크, 다음 수정 제안을 작성한다.",
    }, fallback);
    const target = $("#aiQualityReview");
    if (target) target.textContent = review || fallback;
    return review || fallback;
  } catch {
    const target = $("#aiQualityReview");
    if (target) target.textContent = fallback;
    return fallback;
  }
}

function recordImageDesignWorkflow() {
  const workflow = latestDesignWorkflow();
  invokeAiRole("imageDesign", "A/B 상세페이지 이미지 및 디자인 시안 구조 생성", {
    product: product(),
    designWorkflow: workflow,
    imageSet: detailImageSet(),
    photoConcepts: workflow.imagePlan || photoConcepts(),
    layoutA: $("#templateA")?.textContent.trim() || "",
    layoutB: $("#templateB")?.textContent.trim() || "",
    instruction: "고객 제품 사진과 고정 사실을 참조하여 방향성 검토용 긴 세로 이미지 시안 브리프를 만든다. 작은 한글 정보와 수치 표는 이미지에 굽지 않고 디자이너 조판 영역으로 남긴다.",
  }, "고객 자료를 고정한 이미지 시안 생성 브리프를 만들었습니다.");
}

function photoPromptText(concept, index) {
  const p = product();
  const dataset = categoryDataset(p.category);
  const colors = p.direction.includes("프리미엄 브랜드형") || p.highlight.includes("고급스러운 이미지")
    ? "warm ivory background, premium gold accent, clean studio lighting"
    : "clean bright background, natural product lighting";
  const productName = p.productName || "제품";
  const referenceRule = productName.includes("호아비")
    ? "use the exact same Hoabee Litchi Honey Stick product from the reference image, keep package color, logo, stick shape, and product proportions consistent"
    : "use the same product from the provided reference image, keep product shape and branding consistent";
  return `${referenceRule}, ${productName} product detail page image, ${concept}, ${colors}, vertical ecommerce detail page section, Korean premium brand mood, realistic commercial product photography, detailed texture, natural shadow, clean composition, no medical claim, no exaggerated effect, shot ${index + 1}, ${dataset.tone}`;
}

function renderPhotoConcepts() {
  const target = $("#photoConceptList");
  if (!target) return;
  target.innerHTML = photoConcepts().map((item, index) => `
    <li class="prompt-card">
      <strong>${String(index + 1).padStart(2, "0")}</strong>
      <div>
        <span>${escapeHtml(item)}</span>
        <details>
          <summary>프롬프트 보기</summary>
          <code>${escapeHtml(photoPromptText(item, index))}</code>
        </details>
      </div>
    </li>
  `).join("");
  renderPhotoGridPrompt();
  renderImageSlotStatus();
}

function renderImageSlotStatus() {
  const target = $("#imageSlotStatusList");
  if (!target) return;
  const workflow = latestDesignWorkflow();
  const statusList = workflow.imageSlotStatus || imageSlotProductionStatus(workflow.imagePlan || []);
  target.innerHTML = statusList.slice(0, 8).map((item, index) => `
    <article class="image-slot-status-card ${escapeHtml(item.statusTone || "primary")}">
      <div>
        <strong>${String(index + 1).padStart(2, "0")}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
      <b>${escapeHtml(item.status)}</b>
      <p>${escapeHtml(item.finalAction)}</p>
      <small>${escapeHtml(item.sourceLabel)}${item.sourceImage ? ` · ${escapeHtml(item.sourceImage)}` : ""}</small>
    </article>
  `).join("");
}

function photoGridPromptText() {
  const p = product();
  const scenes = photoConcepts().slice(0, 9).map((item, index) => `${index + 1}. ${item}`).join("\n");
  const referenceRule = p.productName.includes("호아비")
    ? "참고 이미지의 호아비 리치꿀스틱 제품을 동일하게 유지하고, 패키지 컬러, 로고 위치, 스틱 형태, 제품 비율이 달라지지 않게 해주세요."
    : "참고 이미지의 동일한 제품을 사용하고, 제품 외형과 브랜드 특징을 일관되게 유지해주세요.";
  return `참고 이미지의 동일한 제품을 사용해, 9개의 서로 다른 현실적인 라이프스타일 제품 사진 장면을 보여주는 3x3 그리드 이미지를 생성해주세요.

${referenceRule}

각 프레임은 서로 다른 사용 상황과 배경 환경을 담고 있어야 합니다. 전체 분위기는 전문적인 상업 광고 사진 스타일, 사실적인 조명, 디테일한 질감 표현, 자연스러운 그림자, 광고 수준의 높은 완성도, 제품이 중심이 되는 깔끔한 구도로 구성해주세요.

[장면 구성]
${scenes}

최종 결과물은 위에서 내려다본 탑다운 형태의 3x3 그리드 레이아웃이며, 하나의 이미지 안에 9개의 분리된 정사각형 프레임으로 구성해주세요. 모든 프레임에서 제품의 외형과 특징은 일관되게 유지하고, 전체적으로 고급스러운 제품 사진 느낌과 극사실주의 스타일로 표현해주세요.

금지: 의약품처럼 보이는 표현, 질병 치료 암시, 과장된 효능 표현, 제품 로고 왜곡, 실제 제품과 다른 패키지 생성`;
}

function renderPhotoGridPrompt() {
  const target = $("#photoGridPrompt");
  if (!target) return;
  target.textContent = photoGridPromptText();
}

function recommendTemplatePair() {
  if (manualTemplateChanged) return;
  const workflow = latestDesignWorkflow();
  if (workflow?.analysis?.industry === "health") {
    if ($("#templateA")) $("#templateA").textContent = "프리미엄 건강식품 01";
    if ($("#templateB")) $("#templateB").textContent = "구매 설득형 01";
    if ($("#templateAReason")) $("#templateAReason").textContent = "원료 스토리, 선물성, 프리미엄 브랜드 무드를 먼저 보여주는 방향입니다.";
    if ($("#templateBReason")) $("#templateBReason").textContent = "구매 포인트, 비교, 신뢰 정보를 앞쪽에 배치하는 전환형 방향입니다.";
    return;
  }
  const ranked = TEMPLATE_LIBRARY
    .filter((item) => item.category === categoryDatasetLabel() || item.category === "식품/건강식품")
    .map((item) => ({ item, recommend: templateRecommendation(item) }))
    .sort((a, b) => b.recommend.score - a.recommend.score);
  const first = ranked[0]?.item || TEMPLATE_LIBRARY[0];
  const second = ranked.find((entry) => entry.item.templateKey !== first.templateKey || entry.item.purpose !== first.purpose)?.item || ranked[1]?.item || TEMPLATE_LIBRARY[2];
  if ($("#templateA") && first) $("#templateA").textContent = first.name;
  if ($("#templateB") && second) $("#templateB").textContent = second.name;
  if ($("#templateAReason")) $("#templateAReason").textContent = first?.description || "제품 정보 기반 추천 방향입니다.";
  if ($("#templateBReason")) $("#templateBReason").textContent = second?.description || "제품 정보 기반 추천 방향입니다.";
}

function categoryDatasetLabel() {
  const category = product().category;
  if (category.includes("식품") || category.includes("건강")) return "식품/건강식품";
  if (category.includes("뷰티") || category.includes("화장품")) return "뷰티/화장품";
  if (category.includes("생활")) return "생활용품";
  return "식품/건강식품";
}

function generateDraftsRules() {
  if (!value("productName")) {
    $("#draftA").innerHTML = `<div class="empty-draft-guide"><strong>프로젝트를 먼저 불러와주세요.</strong><p>고객 접수 목록에서 프로젝트를 열면 제품명, 카피, 이미지가 시안에 자동 반영됩니다.</p></div>`;
    $("#draftB").innerHTML = `<div class="empty-draft-guide"><strong>시안 생성 대기</strong><p>호아비 테스트는 Step 1의 '호아비 1~7 테스트 실행'으로 바로 확인할 수 있습니다.</p></div>`;
    renderSectionEditor();
    updateActiveDraftView();
    renderDraftQualityDashboard();
    updateWorkflowState();
    return;
  }
  currentDesignWorkflow = runIntegratedDesignWorkflow();
  recommendTemplatePair();
  renderSectionLayouts();
  renderPhotoConcepts();
  recordImageDesignWorkflow();
  autoPolishDraftSections(currentDesignWorkflow);
  $("#draftA").innerHTML = draftMarkup("A안", $("#templateA").textContent.trim());
  $("#draftB").innerHTML = draftMarkup("B안", $("#templateB").textContent.trim());
  renderSectionEditor();
  updateActiveDraftView();
  generateClientMail();
  renderDraftQualityDashboard();
  runQualityReview();
  updateWorkflowState();
}

async function prepareImageDraftWorkspace() {
  await prepareInternalAiPlanning();
  generateDraftsRules();
  createImageDraftBrief();
}

async function generateDrafts() {
  if (!ensurePlanningReviewApproved()) return;
  await prepareImageDraftWorkspace();
  return generateImageDraftConcept();
}

function imageDraftStateKey() {
  return `imageDraftWorkflow:${currentProjectKey()}`;
}

function imageDraftProjectId() {
  return currentCustomerAssetProject?.id || readCustomerProject()?.id || currentProjectKey();
}

function readImageDraftState() {
  try {
    return JSON.parse(localStorage.getItem(imageDraftStateKey()) || "{}");
  } catch {
    return {};
  }
}

function saveImageDraftState(patch = {}) {
  const next = {
    ...readImageDraftState(),
    ...patch,
    updatedAt: new Date().toLocaleString("ko-KR"),
  };
  localStorage.setItem(imageDraftStateKey(), JSON.stringify(next));
  renderImageDraftState(next);
  return next;
}

function imageDraftDirectionLabel(direction = value("imageDraftDirection") || "A") {
  return direction === "B"
    ? `${$("#templateB")?.textContent.trim() || "B안"} · 정보/구매 판단 중심`
    : `${$("#templateA")?.textContent.trim() || "A안"} · 브랜드/감성 중심`;
}

function imageDraftFactSummary() {
  const p = product();
  const uploadedNames = currentCustomerAssetRecords
    .filter((item) => item?.name)
    .map((item) => item.name)
    .slice(0, 12);
  return {
    product: p.productName,
    brand: p.clientName,
    category: p.category,
    oneLine: p.oneLine,
    mustInclude: p.mustInclude || "고객 입력 없음",
    avoid: [...p.avoid, p.banWords].filter(Boolean).join(", ") || "과장 효능, 임의 수치, 임의 인증",
    references: p.references || "별도 문구 없음",
    assets: uploadedNames.length ? uploadedNames.join(", ") : "고객 업로드 자료 폴더 기준",
  };
}

function buildImageDraftBrief() {
  const p = product();
  const reviewedProject = activeCustomerProject();
  const reviewedSummary = contentSummaryText(reviewedProject);
  const facts = imageDraftFactSummary();
  const direction = value("imageDraftDirection") || "A";
  const positionLabels = {
    right: "제품을 오른쪽 중심으로 배치",
    left: "제품을 왼쪽 중심으로 배치",
    top: "첫 화면 상단에 제품을 크게 배치",
    full: "제품 중심의 풀 비주얼",
  };
  const densityLabels = {
    balanced: "서로 연결되는 4개 장면과 충분한 조판 여백",
    rich: "서로 연결되는 5~6개 장면과 풍부한 무드 변화",
    simple: "핵심 메시지에 집중한 3개 장면",
  };
  const visualFocusLabels = {
    product: "실제 제품과 패키지의 첫인상",
    ingredient: "고객 자료에 근거한 원료·소재 스토리",
    usage: "자연스러운 사용·섭취 상황",
    gift: "선물 가치와 패키지 경험",
    structure: "전체 정보 흐름과 시각 위계",
  };
  const copyPolicyLabels = {
    hero: "첫 화면에 메인 헤드라인 하나만 사용하고 나머지는 조판 자리로 비움",
    placeholder: "읽을 수 있는 문구를 생성하지 않고 카피 조판용 안전 영역만 확보",
    minimal: "메인 헤드라인 하나와 1~3단어의 짧은 키워드만 제한적으로 사용",
  };
  const mainCopy = value("draftMainCopy") || p.oneLine;
  const goal = value("imageDraftGoal") || "첫 화면의 제품 인지, 고객 자료와의 일치, 디자이너 보정 범위를 확인";
  const production = DETAIL_PAGE_PRODUCTION_STANDARD.planningDesign;
  const projectIdentity = `${facts.brand} ${facts.product}`;
  const matchedLongFormRule = Object.entries(DETAIL_PAGE_PRODUCTION_STANDARD.longFormProjectRules)
    .find(([keyword]) => projectIdentity.includes(keyword))?.[1];
  const targetMinHeightPx = matchedLongFormRule?.minHeightPx || production.baseHeightPx;
  const targetMaxHeightPx = matchedLongFormRule?.maxHeightPx || production.baseHeightPx;
  const directionFocus = direction === "B"
    ? "제품 장점과 구매 이유를 빠르게 이해시키는 정보/구매 판단형"
    : "브랜드 신뢰, 원료 스토리, 선물 가치를 감성적으로 보여주는 브랜드형";

  return `[이미지 시안 생성 브리프]
프로젝트: ${facts.brand} / ${facts.product}
선택 방향: ${imageDraftDirectionLabel(direction)}
검토 목표: ${goal}

[고정 사실 — 절대 바꾸거나 새로 만들지 않음]
- 제품명: ${facts.product}
- 고객사/브랜드: ${facts.brand}
- 카테고리: ${facts.category}
- 한 줄 설명: ${facts.oneLine}
- 반드시 포함: ${facts.mustInclude}
- 금지/주의: ${facts.avoid}
- 고객 참고: ${facts.references}
- 기준 파일: ${facts.assets}

[승인된 1차 내용정리본]
${reviewedSummary || "승인된 내용정리본 없음"}

[상세페이지 AI 제작 툴 기본 지침]
- 기준 파일: ${AI_DETAIL_PRODUCTION_POLICY.guideFile}
- 정보 우선순위: ${AI_DETAIL_PRODUCTION_POLICY.sourceOrder.join(" → ")}
${AI_DETAIL_PRODUCTION_POLICY.hardRules.map((item) => `- ${item}`).join("\n")}

[시각 방향]
- 목적: ${directionFocus}
- 사진 배치: ${positionLabels[value("draftImagePosition")] || positionLabels.right}
- 정보 밀도: ${densityLabels[value("draftDensity")] || densityLabels.balanced}
- 핵심 검토 요소: ${visualFocusLabels[value("imageDraftVisualFocus")] || visualFocusLabels.product}
- 문구 정책: ${copyPolicyLabels[value("imageDraftCopyPolicy")] || copyPolicyLabels.hero}
- 허용된 메인 카피: ${mainCopy}
- 색상은 별도 프리셋을 고르지 말고 고객 로고·패키지·업로드 이미지에서 추출

[레퍼런스 적용 우선순위]
${DESIGN_REFERENCE_POLICY.priority.map((item, index) => `${index + 1}. ${item}`).join("\n")}
- Google Drive 통합 루트: ${DESIGN_REFERENCE_POLICY.googleDriveRootUrl || "미연결"}
- 제작 전 기획안 폴더: ${DESIGN_REFERENCE_POLICY.googleDrivePlanningUrl || "미연결"}
- 실제 제작물 폴더: ${DESIGN_REFERENCE_POLICY.googleDriveProductionUrl || "미연결"}
- 연결 확인 수량: 기획안 ${DESIGN_REFERENCE_POLICY.planningReferenceCount}개 · 실제 제작 프로젝트 ${DESIGN_REFERENCE_POLICY.productionProjectCount}개
- Drive 원본은 접근 권한이 있는 계정과 Codex 커넥터로만 열람하며 공개 페이지에는 파일 자체를 복제하지 않음
- 공유 아카이브: ${DESIGN_REFERENCE_POLICY.sharedArchiveLabel}${DESIGN_REFERENCE_POLICY.sharedArchiveUrl ? ` (${DESIGN_REFERENCE_POLICY.sharedArchiveUrl})` : ` (${DESIGN_REFERENCE_POLICY.sharedArchiveStatus})`}
- Google Drive의 기획안과 실제 제작 자료는 색·카피·레이아웃을 통째로 복제하지 않고 섹션 역할, 정보 밀도, 사진 리듬, 조판 방식만 분석
- 제품군과 판매 목적이 맞지 않는 레퍼런스는 사용하지 않으며, 한 시안에는 핵심 레퍼런스 3~5개만 선별
- 실제 이미지 생성 참조에는 사용 권한이 확인된 고객 자료와 Drive 승인 자료만 넣고, 출처가 불분명한 이미지는 구조 참고에만 사용

[출력물의 정확한 성격]
- 1024×1536 세로 시안 3장을 상단·중단·하단으로 각각 생성한 뒤 하나의 긴 미리보기로 연결
- 실제 제작 목표 전체 세로 길이: ${targetMinHeightPx.toLocaleString("ko-KR")}~${targetMaxHeightPx.toLocaleString("ko-KR")}px
- 생성 이미지는 축소 방향성 미리보기이며 최종 작업은 섹션별 고해상도 원본을 위 목표 길이에 맞춰 조립
- 바로 판매에 쓰는 완성 상세페이지가 아니라, 디자이너가 첫 화면·장면 흐름·색감·사진 합성 방향을 결정하는 컨셉 시안
- 각 구간은 독립적으로 수정할 수 있고, 연결했을 때 색·여백·사진 조명이 자연스럽게 이어져야 함
- 모바일 쇼핑 화면에서 축소해도 제품과 큰 시각 위계가 먼저 읽혀야 함

[내부 제작 범위 규칙 — 이미지 안에 가격이나 견적 문구를 표시하지 않음]
${detailPageProductionStandardText()}
- 이번 시안은 ${targetMinHeightPx.toLocaleString("ko-KR")}~${targetMaxHeightPx.toLocaleString("ko-KR")}px 목표 범위에서 상단 설득·중단 근거·하단 구매 판단을 충분한 섹션으로 확장
- 추가 ${production.additionalUnitPx.toLocaleString("ko-KR")}px가 필요할 때만 별도 콘텐츠 구간을 확장하며, 기본 시안에 불필요한 섹션을 억지로 추가하지 않음
- 위 금액과 할인 규칙은 내부 분량·견적 계산 기준이며 고객용 상세페이지 이미지의 카피나 배지로 렌더링하지 않음

[세로형 시안 흐름]
1. 상단 설득: 실제 제품 히어로 → 한 줄 가치 → 3가지 즉시 판단 근거
2. 중단 근거: 원료·브랜드 이야기 → 제품 차이 → 현실적인 사용/섭취 상황
3. 하단 판단: 구성·선물 맥락 → 제품 정보/주의사항 안전 영역 → 클로징 제품 히어로

[생성 규칙]
- 제공된 참조 이미지가 있으면 제품 사진, 패키지 비율, 로고, 라벨 구조를 가장 높은 우선순위로 고정
- 제품 외형, 패키지 색, 로고를 재해석하지 않고 가상의 맛·원료·구성품을 추가하지 않음
- 인증, 효능, 수치, 원재료, 후기, 비교 우위는 자료에 없으면 생성하지 않음
- 작은 한글 문장, 표, 법정 고지는 이미지 안에 생성하지 않고 조판용 안전 영역으로 비워둠
- 카피 정책에서 허용한 범위를 넘는 읽을 수 없는 가짜 글자, 워터마크, UI 버튼을 만들지 않음
- 실제 촬영과 자연스러운 상업 사진처럼 빛, 재질, 원근, 그림자를 일관되게 표현
- 장식보다 제품 식별성과 장면 간 흐름을 우선하고, 안전 영역은 의도된 여백처럼 정돈
- 같은 제품 사진을 타일처럼 반복하거나 제품과 원료만 늘어놓는 무드 콜라주 방식은 금지
- 레퍼런스의 로고, 고유 문구, 모델, 제품 사진을 복사하거나 다른 고객 시안에 재사용하지 않음
- 절대로 바로 게시 가능한 판매용 최종 상세페이지처럼 만들지 말고 방향성 검토용 이미지 시안으로 출력`;
}

function setImageGenerationNotice(tone = "ready", title = "생성 준비", detail = "고객 자료와 조건을 확인한 뒤 버튼을 누르세요.") {
  const notice = $("#imageGenerationNotice");
  if (!notice) return;
  notice.className = `image-generation-notice is-${tone}`;
  const titleNode = notice.querySelector("strong");
  const detailNode = notice.querySelector("p");
  if (titleNode) titleNode.textContent = title;
  if (detailNode) detailNode.textContent = detail;
}

function setImageGenerationBusy(isBusy) {
  ["generateDrafts", "applyDraftEdits"].forEach((id) => {
    const button = $(`#${id}`);
    if (!button) return;
    button.disabled = isBusy;
    button.classList.toggle("is-generating", isBusy);
  });
  if ($("#generateDrafts")) {
    $("#generateDrafts").textContent = isBusy ? "작업 패키지 생성 중…" : "Codex 작업 패키지 준비";
  }
  if ($("#applyDraftEdits")) {
    $("#applyDraftEdits").textContent = isBusy ? "작업 패키지 생성 중…" : "브리프 생성 + Codex 패키지";
  }
  if ($("#cancelImageGeneration")) $("#cancelImageGeneration").hidden = !isBusy;
}

function imageGenerationErrorMessage(error) {
  const rawMessage = String(error?.message || "");
  if (error?.name === "AbortError") return "작업 패키지 생성을 취소했습니다.";
  return rawMessage || "Codex 작업 패키지를 생성하지 못했습니다.";
}

function isImageGenerationBillingError(error) {
  return false;
}

function base64ImageFile(base64, fileName) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], fileName, { type: "image/png" });
}

function generatedImageDraftFileName(suffix = "") {
  const safeName = String(product().productName || "프로젝트")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const safeSuffix = String(suffix || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_");
  return `${safeName}_상세페이지_방향성시안${safeSuffix ? `_${safeSuffix}` : ""}_${Date.now()}.png`;
}

async function imageDraftReferenceFiles() {
  const allowedGroups = ["productImages", "brandLogo", "referenceFiles"];
  const customerReferences = currentCustomerAssetRecords
    .filter((record) => allowedGroups.includes(record.group) && String(record.type || record.blob?.type || "").startsWith("image/"))
    .sort((a, b) => allowedGroups.indexOf(a.group) - allowedGroups.indexOf(b.group))
    .slice(0, 4)
    .map((record) => ({
      blob: record.blob,
      name: record.name || `customer-reference-${Date.now()}.png`,
      group: record.group,
    }));

  const project = currentCustomerAssetProject;
  if (!customerReferences.length) {
    for (const group of allowedGroups) {
      const folderPath = project?.assetFolderPaths?.[group];
      const names = Array.from(project?.assetFolderFiles?.[group] || []);
      for (const name of names) {
        if (customerReferences.length >= 4 || !/\.(png|jpe?g|jfif|webp)$/i.test(name)) continue;
        const url = resolveCustomerFolderFileUrl(project, group, name, folderPath);
        if (!url || url.startsWith("file:///")) continue;
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          customerReferences.push({ blob: await response.blob(), name, group });
        } catch {
          // 웹에서 읽을 수 없는 로컬 원본은 프롬프트의 파일명 정보만 사용합니다.
        }
      }
    }
  }

  const figmaReferences = [];
  const previewPaths = Array.from(project?.figmaReferenceSet?.previewPaths || []).slice(0, 2);
  for (let index = 0; index < previewPaths.length; index += 1) {
    const url = previewPaths[index];
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!String(blob.type || "").startsWith("image/")) continue;
      figmaReferences.push({
        blob,
        name: `figma-approved-preview-${index + 1}.png`,
        group: "figmaReference",
      });
    } catch {
      // 캐시가 없는 공개 배포 환경에서는 고객 자료만 사용합니다.
    }
  }

  return [...customerReferences.slice(0, 4), ...figmaReferences].slice(0, 6);
}

async function imageFileBitmap(file) {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function stitchImageDraftSegments(files) {
  const bitmaps = [];
  try {
    for (const file of files) bitmaps.push(await imageFileBitmap(file));
    const width = Math.max(...bitmaps.map((bitmap) => bitmap.width));
    const height = bitmaps.reduce((sum, bitmap) => sum + Math.round(bitmap.height * (width / bitmap.width)), 0);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#f7f1e8";
    context.fillRect(0, 0, width, height);
    let y = 0;
    bitmaps.forEach((bitmap) => {
      const segmentHeight = Math.round(bitmap.height * (width / bitmap.width));
      context.drawImage(bitmap, 0, y, width, segmentHeight);
      y += segmentHeight;
    });
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("세 구간 시안을 하나의 미리보기로 연결하지 못했습니다."));
      }, "image/png");
    });
    return new File([blob], generatedImageDraftFileName("전체"), { type: "image/png" });
  } finally {
    bitmaps.forEach((bitmap) => {
      if (typeof bitmap.close === "function") bitmap.close();
    });
  }
}

async function generateImageDraftConcept() {
  if (!ensurePlanningReviewApproved()) return;
  if (!value("productName")) {
    alert("프로젝트를 먼저 불러와주세요.");
    return;
  }
  const prompt = createImageDraftBrief();
  if (!prompt) return;
  setImageGenerationBusy(true);
  saveImageDraftState({ status: "packaging" });

  try {
    setImageGenerationNotice("working", "Codex 작업 패키지 생성 중", "승인된 고객 사실·레퍼런스·기획 브리프의 무결성 해시를 계산하고 있습니다.");
    if (!window.haoCodexMvp?.preparePackage) throw new Error("Codex 작업 패키지 모듈을 불러오지 못했습니다.");
    await window.haoCodexMvp.preparePackage({ prompt });
  } catch (error) {
    const message = imageGenerationErrorMessage(error);
    saveImageDraftState({ status: readImageDraftState().fileName ? "draft" : "brief" });
    setImageGenerationNotice("error", "작업 패키지 생성 실패", message);
    updateAiStatus(message);
  } finally {
    setImageGenerationBusy(false);
  }
}

function setImageDraftPreview(src, fileName = "") {
  const preview = $("#imageDraftPreview");
  const empty = $("#imageDraftEmpty");
  if (!preview || !empty) return;
  preview.src = src;
  preview.hidden = false;
  empty.hidden = true;
  preview.dataset.source = src;
  if ($("#imageDraftFileName")) $("#imageDraftFileName").textContent = fileName || "이미지 시안";
  if ($("#imageDraftTitle")) $("#imageDraftTitle").textContent = "상세페이지 방향성 이미지 시안";
  $("#imageFlowDraft")?.classList.add("done");
}

function clearImageDraftPreview() {
  const preview = $("#imageDraftPreview");
  const empty = $("#imageDraftEmpty");
  if (!preview || !empty) return;
  preview.removeAttribute("src");
  preview.hidden = true;
  empty.hidden = false;
  if ($("#imageDraftFileName")) $("#imageDraftFileName").textContent = "파일 미등록";
  $("#imageFlowDraft")?.classList.remove("done");
}

async function loadStoredImageDraft() {
  const projectId = imageDraftProjectId();
  if (window.customerFileStore?.listProjectFiles && projectId) {
    try {
      const records = await window.customerFileStore.listProjectFiles(projectId);
      const record = records
        .filter((item) => item.group === IMAGE_DRAFT_GROUP)
        .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];
      if (record?.blob) {
        if (currentImageDraftObjectUrl) URL.revokeObjectURL(currentImageDraftObjectUrl);
        currentImageDraftObjectUrl = URL.createObjectURL(record.blob);
        setImageDraftPreview(currentImageDraftObjectUrl, record.name);
        return true;
      }
    } catch {
      // 정적 예시 시안 또는 현재 세션 미리보기로 계속 진행합니다.
    }
  }
  const productName = value("productName");
  if (productName.includes("호아비") || productName.includes("리치꿀스틱")) {
    setImageDraftPreview(
      "assets/generated-concepts/hoabi-detail-page-concept-v2.jpg?v=20260728-09",
      "호아비_리치꿀스틱_상중하_판매전환형_방향성시안_v2.jpg",
    );
    return true;
  }
  return false;
}

function applyImageDraftPresentation(shouldSave = true) {
  const viewport = $("#imageDraftViewport");
  const preview = $("#imageDraftPreview");
  const zoom = Number($("#imageDraftZoom")?.value || 100);
  const fit = value("imageDraftFit") || "contain";
  const position = value("imageDraftPosition") || "center";
  const showCopy = Boolean($("#imageDraftShowCopy")?.checked);
  const overlay = $("#imageDraftCopyOverlay");
  if (!viewport || !preview) return;
  viewport.dataset.fit = fit;
  viewport.dataset.position = position;
  preview.style.objectFit = fit;
  preview.style.objectPosition = position;
  preview.style.transform = `scale(${zoom / 100})`;
  if ($("#imageDraftZoomValue")) $("#imageDraftZoomValue").textContent = `${zoom}%`;
  if (overlay) {
    overlay.textContent = value("draftMainCopy") || product().oneLine;
    overlay.hidden = !showCopy;
  }
  if (shouldSave) {
    saveImageDraftState({ fit, position, zoom, showCopy });
    updateAiStatus("이미지 원본은 유지하고 검토 화면의 보기 방식만 조정했습니다.");
  }
}

function renderImageDraftState(state = readImageDraftState()) {
  if ($("#imageDraftDirection") && state.direction) $("#imageDraftDirection").value = state.direction;
  if ($("#imageDraftGoal") && state.goal !== undefined) $("#imageDraftGoal").value = state.goal;
  if ($("#imageDraftBrief") && state.brief !== undefined) $("#imageDraftBrief").value = state.brief;
  if ($("#imageDraftFit") && state.fit) $("#imageDraftFit").value = state.fit;
  if ($("#imageDraftPosition") && state.position) $("#imageDraftPosition").value = state.position;
  if ($("#imageDraftZoom") && state.zoom) $("#imageDraftZoom").value = state.zoom;
  if ($("#imageDraftShowCopy")) $("#imageDraftShowCopy").checked = Boolean(state.showCopy);
  if ($("#imageDraftStatus")) {
    const statusLabels = {
      brief: "브리프 준비",
      generating: "고품질 생성 중",
      draft: "이미지 시안 등록",
      reviewed: "내부 검토 완료",
      revision: "수정 요청",
      handoff: "디자이너 전달",
    };
    $("#imageDraftStatus").textContent = statusLabels[state.status] || "초안 준비";
  }
  if ($("#imageDraftTitle")) {
    $("#imageDraftTitle").textContent = state.generation?.provider === "openai"
      ? "AI 생성 상세페이지 방향성 시안"
      : "상세페이지 방향성 이미지 시안";
  }
  if ($("#imageDraftUpdatedAt")) {
    $("#imageDraftUpdatedAt").textContent = state.updatedAt ? `최근 기록 ${state.updatedAt}` : "검토 기록 없음";
  }
  if ($("#imageHandoffStatus")) {
    $("#imageHandoffStatus").textContent = state.status === "handoff" ? "전달본 복사 완료" : state.status === "reviewed" ? "검토 완료" : state.status === "revision" ? "수정 요청 중" : "전달 전";
  }
  const log = $("#imageRevisionLog");
  const revisions = Array.isArray(state.revisions) ? state.revisions : [];
  if (log) {
    log.innerHTML = revisions.length
      ? revisions.map((item, index) => `
          <li>
            <span>${String(revisions.length - index).padStart(2, "0")}</span>
            <div><strong>${escapeHtml(item.direction || "수정 요청")}</strong><p>${escapeHtml(item.text)}</p><small>${escapeHtml(item.createdAt || "")}</small></div>
          </li>
        `).join("")
      : `<li class="empty">아직 기록된 수정 요청이 없습니다.</li>`;
  }
  ["imageFlowBrief", "imageFlowDraft", "imageFlowReview", "imageFlowHandoff"].forEach((id) => $(`#${id}`)?.classList.remove("done", "active"));
  if (state.brief) $("#imageFlowBrief")?.classList.add("done");
  else $("#imageFlowBrief")?.classList.add("active");
  if ($("#imageDraftPreview")?.src) $("#imageFlowDraft")?.classList.add("done");
  else if (state.brief) $("#imageFlowDraft")?.classList.add("active");
  if (["reviewed", "revision", "handoff"].includes(state.status)) $("#imageFlowReview")?.classList.add("done");
  if (state.status === "handoff") $("#imageFlowHandoff")?.classList.add("done");
  else if (["reviewed", "revision"].includes(state.status)) $("#imageFlowHandoff")?.classList.add("active");
  applyImageDraftPresentation(false);
}

async function initializeImageDraftWorkflow() {
  if (!$("#imageDraftViewport")) return;
  const state = readImageDraftState();
  renderImageDraftState(state);
  const loaded = await loadStoredImageDraft();
  if (!loaded && !$("#imageDraftPreview")?.src) clearImageDraftPreview();
  renderImageDraftState(state);
}

function createImageDraftBrief() {
  if (!value("productName")) {
    alert("프로젝트를 먼저 불러와주세요.");
    return "";
  }
  if (!projectManagerReviewApproved() && !ensureProjectReviewApprovedForGeneration()) return "";
  if (!projectDriveReferenceReady()) {
    showPanel("projects");
    alert("Google Drive 기획안과 실제 제작물 레퍼런스가 아직 연결되지 않았습니다.");
    updateAiStatus("Google Drive 통합 레퍼런스 연결 상태를 확인해주세요.");
    return "";
  }
  const brief = buildImageDraftBrief();
  if ($("#imageDraftBrief")) $("#imageDraftBrief").value = brief;
  const direction = value("imageDraftDirection") || "A";
  const state = saveImageDraftState({
    direction,
    goal: value("imageDraftGoal"),
    brief,
    status: readImageDraftState().status === "handoff" ? "handoff" : "brief",
  });
  saveAiArtifact("imageDesign", "rules", brief, {
    output: "image-draft-brief",
    direction,
    humanDesignerWorkflow: true,
  });
  const active = activeCustomerProject();
  if (active) {
    const updated = projectFromAdminFields(active);
    updated.status = "기획 생성";
    updated.workflow = {
      ...(updated.workflow || {}),
      prompt: { status: "generated", at: new Date().toISOString() },
      imageDraft: { status: "ready", at: "" },
    };
    persistCustomerProject(updated);
  }
  $("#imageFlowBrief")?.classList.add("done");
  $("#imageFlowDraft")?.classList.add("active");
  updateAiStatus("고객 자료를 고정한 이미지 시안 생성 브리프를 만들었습니다.");
  return state.brief;
}

async function copyPlainText(text, message) {
  if (!String(text || "").trim()) {
    alert("복사할 내용이 없습니다.");
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  updateAiStatus(message);
  return true;
}

async function registerImageDraftFile(file, generation = null) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("PNG, JPG, WEBP 이미지 파일만 등록할 수 있습니다.");
    return;
  }
  if (currentImageDraftObjectUrl) URL.revokeObjectURL(currentImageDraftObjectUrl);
  currentGeneratedImageDraftFile = file;
  currentImageDraftObjectUrl = URL.createObjectURL(file);
  setImageDraftPreview(currentImageDraftObjectUrl, file.name);
  const projectId = imageDraftProjectId();
  try {
    await window.customerFileStore?.saveProjectFileGroup?.(projectId, IMAGE_DRAFT_GROUP, [file]);
  } catch {
    updateAiStatus("시안은 현재 화면에 등록됐지만 브라우저 저장소에는 저장하지 못했습니다.");
  }
  saveImageDraftState({ fileName: file.name, status: "draft", generation });
  const active = activeCustomerProject();
  if (active) {
    const updated = { ...active };
    updated.status = "시안 제작";
    updated.workflow = {
      ...(updated.workflow || {}),
      imageDraft: { status: "generated", at: new Date().toISOString(), fileName: file.name },
    };
    persistCustomerProject(updated);
  }
  if (productionRootDirectoryHandle) {
    try {
      await saveProductionBundleToFolder(file);
    } catch (error) {
      updateProductionFolderStatus(`폴더 저장 실패 · ${error?.message || "권한과 경로를 확인해주세요."}`, false);
      updateAiStatus("이미지는 브라우저에 저장됐지만 작업 폴더 자동 저장에 실패했습니다.");
    }
  }
  updateAiStatus(productionRootDirectoryHandle
    ? "이미지 시안을 등록하고 연결된 업체별 작업 폴더에도 저장했습니다."
    : "이미지 시안을 등록했습니다. 새로고침 후에도 이 브라우저에서 다시 불러옵니다.");
  if (generation?.provider === "openai") {
    requestAnimationFrame(() => {
      $("#imageDraftViewport")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

function completeImageDraftReview() {
  const preview = $("#imageDraftPreview");
  if (!preview?.src || preview.hidden) {
    alert("검토할 이미지 시안을 먼저 등록해주세요.");
    return;
  }
  saveImageDraftState({ status: "reviewed", reviewedAt: new Date().toLocaleString("ko-KR") });
  updateAiStatus("이미지 시안 내부 검토를 완료로 표시했습니다.");
}

function addImageRevisionRequest() {
  const text = value("imageRevisionRequest");
  if (!text) {
    alert("수정 요청 내용을 입력해주세요.");
    return;
  }
  const state = readImageDraftState();
  const revisions = [
    {
      text,
      direction: imageDraftDirectionLabel(state.direction || value("imageDraftDirection")),
      createdAt: new Date().toLocaleString("ko-KR"),
    },
    ...(Array.isArray(state.revisions) ? state.revisions : []),
  ].slice(0, 30);
  saveImageDraftState({ revisions, status: "revision" });
  $("#imageRevisionRequest").value = "";
  updateAiStatus("수정 요청을 기록했습니다.");
}

function designerHandoffText() {
  const state = readImageDraftState();
  const revisions = Array.isArray(state.revisions) ? state.revisions : [];
  return `[디자이너 전달본]
프로젝트: ${product().clientName} / ${product().productName}
선택 방향: ${imageDraftDirectionLabel(state.direction)}
시안 파일: ${state.fileName || $("#imageDraftFileName")?.textContent || "등록된 이미지 시안"}
검토 상태: ${state.status === "reviewed" || state.status === "handoff" ? "내부 검토 완료" : "수정 요청 확인 필요"}

${state.brief || buildImageDraftBrief()}

[수정 요청 기록]
${revisions.length ? revisions.map((item, index) => `${index + 1}. ${item.text} (${item.createdAt})`).join("\n") : "별도 수정 요청 없음"}

[작업 구분]
- 이미지 재생성: 제품 외형, 배경 장면, 원료 연출, 로고 왜곡
- 코드/조판 보정: 이미지 위치·크롭, 정확한 한글 문구, 표·수치·법정 고지, CTA
- 최종 상세페이지 제작은 이미지 시안 승인 후 사람 디자이너가 진행`;
}

async function copyDesignerHandoff() {
  const copied = await copyPlainText(designerHandoffText(), "디자이너 전달본을 복사했습니다.");
  if (copied) saveImageDraftState({ status: "handoff", handedOffAt: new Date().toLocaleString("ko-KR") });
}

function resetImageDraftReviewState() {
  const state = readImageDraftState();
  saveImageDraftState({
    status: state.fileName || $("#imageDraftPreview")?.src ? "draft" : state.brief ? "brief" : "",
    revisions: [],
    reviewedAt: "",
    handedOffAt: "",
  });
  if ($("#imageRevisionRequest")) $("#imageRevisionRequest").value = "";
  updateAiStatus("이미지 파일과 브리프는 유지하고 검토·수정 기록만 초기화했습니다.");
}

// ── 커뮤니케이션·납품 출력은 comms-output.js 로 분리됨 (M5) ──


async function loadSample() {
  $("#clientName").value = "호아비";
  $("#productName").value = "호아비 리치꿀스틱 30포";
  $("#category").value = "건강식품 / 꿀스틱 / 스틱형 식품";
  $("#channel").value = "자사몰, 스마트스토어, 오픈마켓";
  $("#oneLine").value = "베트남 리치와 프리미엄 꿀을 담은 스틱형 건강식품";
  $("#consultSummary").value = "고객은 제품의 프리미엄 이미지와 리치 원료 스토리를 강조하고 싶어 함. 건강식품 특유의 신뢰감과 선물용 이미지를 함께 표현 희망.";
  $("#clientRequests").value = "고급스러운 디자인, 선물용 느낌 강조, 원료 스토리 강조, 신뢰성 있는 구성";
  $("#emphasis").value = "베트남 리치 원료와 프리미엄 꿀의 조합, 30포 구성, 휴대가 간편한 스틱형";
  $("#banWords").value = "질병 치료, 면역력 향상 보장, 의약품 오인 표현, 과장 광고 문구";
  $("#mustInclude").value = "리치꿀스틱, 30포 구성, 휴대가 간편한 스틱형, 프리미엄 원료";
  $("#references").value = "현재 제작된 호아비 리치꿀스틱 상세페이지, 동일 카테고리 꿀스틱/건강스틱 제품";
  $("#contentRatio").value = "브랜드 스토리 25%\n원료 소개 25%\n제품 특징 20%\n신뢰 요소 15%\n구매 유도 15%";
  $("#optionMemo").value = "리치 원산지 스토리를 강조. 선물용 건강식품 이미지 강조. 건강식품 특유의 신뢰감 표현. 과도한 효능 표현 금지.";

  setChecked("direction", ["프리미엄 브랜드형", "감성 스토리형"]);
  setChecked("target", ["건강 관심층", "부모님 선물 구매층", "직장인"]);
  setChecked("goal", ["구매 전환", "브랜드 신뢰", "제품 이해", "선물 수요"]);
  setChecked("highlight", ["원료", "패키지", "선물성", "브랜드 스토리", "휴대성", "고급스러운 이미지"]);
  setChecked("avoid", ["과장 광고", "저가형 느낌", "의약품 오인", "복잡한 디자인", "홈쇼핑 스타일"]);
  setChecked("usp", ["리치 원료", "프리미엄 꿀", "개별 스틱 포장", "선물용 패키지", "휴대 편의성"]);
  await generateAll();
}

async function generateAll() {
  prepareFirstPlanningDraft();
}

async function generateAllFromTopbar() {
  const button = $("#generateAll");
  const hasLoadedProject = Boolean(value("clientName") && value("productName") && value("category"));
  if (!hasLoadedProject) {
    showPanel("projects");
    alert("고객 작성 프로젝트를 먼저 불러와주세요. 고객사명, 제품명, 카테고리가 확인된 뒤 자동 생성을 시작할 수 있습니다.");
    updateAiStatus("프로젝트 불러오기 완료 후 기획/시안 자동 생성을 눌러주세요.");
    return;
  }
  if (!ensureProjectReviewApprovedForGeneration()) return;
  const originalText = button?.textContent || "기획/시안 자동 생성";
  if (button) {
    button.disabled = true;
    button.classList.add("is-preparing");
    button.textContent = "3페이지 이동 · 1차 시안 생성 중…";
  }
  showPanel("drafts");
  updateAiStatus("고객 사실과 Google Drive 2026(기획안) 구조를 기준으로 1차 촬영·디자인 시안을 준비합니다.");

  try {
    await generateAll();
  } catch (error) {
    const message = error?.message || "기획/시안 자동 생성 중 오류가 발생했습니다.";
    updateAiStatus(message);
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove("is-preparing");
      button.textContent = originalText;
    }
  }
}

async function runHoabiFlowTest() {
  addHoabiCustomerTest(true);
  const latest = readCustomerProjects()[0];
  if (latest?.id) {
    localStorage.setItem(CUSTOMER_PROJECT_KEY, JSON.stringify(latest));
    importCustomerProjectById(latest.id);
  }

  if ($("#draftTone")) $("#draftTone").value = "warm";
  if ($("#draftImagePosition")) $("#draftImagePosition").value = "full";
  if ($("#draftDensity")) $("#draftDensity").value = "rich";
  if ($("#draftMainCopy")) $("#draftMainCopy").value = "리치와 꿀이 전하는 하루 한 포의 프리미엄 루틴";

  await generateDrafts();

  if ($("#clientChoice")) $("#clientChoice").value = "A안 선택";
  if ($("#clientReply")) {
    $("#clientReply").value = "A안의 프리미엄 분위기가 좋습니다. 다만 리치 원료 스토리와 선물용 패키지 느낌을 더 강조해주세요. 제품 이미지는 현재 제공한 패키지컷과 스틱 단독컷을 우선 사용하고, 최종에는 고급스러운 촬영/합성컷으로 교체되면 좋겠습니다.";
  }
  if ($("#managerMemo")) {
    $("#managerMemo").value = "담당자 메모: 호아비 제공 제품 사진 2장을 우선 반영. 과장 효능 표현 금지. 핑크/오렌지 계열은 유지하되 저가형 이벤트 느낌은 피할 것.";
  }

  await generateRevision();
  await generateHandoff();
  showPanel("psd");
  updateAiStatus("호아비 1~7 테스트 결과를 생성했습니다.");
}

function applyLayoutToChoice(layoutName) {
  manualTemplateChanged = true;
  const choice = $(".choice[data-choice].active")?.dataset.choice || "A";
  const target = choice === "B" ? $("#templateB") : $("#templateA");
  target.textContent = layoutName;
  $$(".template-card").forEach((card) => card.classList.remove("selected"));
  const selectedCard = $(`.template-card[data-layout="${layoutName}"]`);
  if (selectedCard) selectedCard.classList.add("selected");
  renderSectionLayouts();
  generateDrafts();
}

function templateThumbMarkup(type) {
  if (type === "story") {
    return `<span></span><span></span><span></span>`;
  }
  if (type === "cards") {
    return `<span></span><span></span><span></span><span></span>`;
  }
  if (type === "conversion") {
    return `<span class="top"></span><span class="bar"></span><span class="bar"></span><span class="cta"></span>`;
  }
  return `<span class="hero-text"></span><span class="hero-product"></span><span class="wide-line"></span>`;
}

function templateRecommendation(item) {
  const p = product();
  const joined = [
    ...p.direction,
    ...p.goal,
    ...p.highlight,
    ...p.usp,
    p.emphasis,
    p.clientRequests,
  ].join(" ");
  let score = 55;
  const reasons = [];

  if (item.purpose === "선물" && joined.includes("선물")) {
    score += 22;
    reasons.push("선물성 강조");
  }
  if (item.purpose === "스토리" && (joined.includes("원료") || joined.includes("스토리") || joined.includes("감성"))) {
    score += 20;
    reasons.push("원료/브랜드 스토리 적합");
  }
  if (item.purpose === "브랜드" && (joined.includes("프리미엄") || joined.includes("고급") || joined.includes("브랜드"))) {
    score += 18;
    reasons.push("프리미엄 첫인상 적합");
  }
  if (item.purpose === "정보" && (joined.includes("제품 이해") || joined.includes("신뢰") || joined.includes("구성"))) {
    score += 16;
    reasons.push("정보 정리 적합");
  }
  if (item.purpose === "전환" && (joined.includes("구매") || joined.includes("전환") || joined.includes("문제"))) {
    score += 16;
    reasons.push("구매 설득 적합");
  }
  if (item.difficulty === "빠른 제작") {
    score += 4;
    reasons.push("빠른 제작 가능");
  }

  return {
    score: Math.min(score, 98),
    reason: reasons.slice(0, 2).join(" · ") || "기본 상세페이지 구성에 적합",
  };
}

function renderTemplateLibrary() {
  const library = $("#templateLibrary");
  if (!library) return;
  const category = $("#templateCategoryFilter")?.value || "전체";
  const purpose = $("#templatePurposeFilter")?.value || "전체";
  const difficulty = $("#templateDifficultyFilter")?.value || "전체";
  const filtered = TEMPLATE_LIBRARY.filter((item) => {
    const categoryMatch = category === "전체" || item.category === category;
    const purposeMatch = purpose === "전체" || item.purpose === purpose;
    const difficultyMatch = difficulty === "전체" || item.difficulty === difficulty;
    return categoryMatch && purposeMatch && difficultyMatch;
  });

  if (!filtered.length) {
    library.innerHTML = `<div class="empty-template">조건에 맞는 템플릿이 없습니다.</div>`;
    return;
  }

  library.innerHTML = filtered.map((item) => {
    const recommend = templateRecommendation(item);
    const rules = templateDesignRules(item.name);
    return `
    <article class="template-card ${item.toneClass}" data-layout="${escapeHtml(item.name)}">
      <div>
        <div class="template-meta">
          <span>${escapeHtml(item.category)}</span>
          <span>${escapeHtml(item.purpose)}</span>
          <span>${escapeHtml(item.difficulty)}</span>
        </div>
        <div class="template-score">
          <b>추천 ${recommend.score}%</b>
          <span>${escapeHtml(recommend.reason)}</span>
        </div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <p class="template-skeleton"><b>틀</b> ${escapeHtml(rules.layoutSignature || "섹션 구조 기반 생성")}</p>
        <small>필요 이미지 ${item.imageCount}컷 · ${escapeHtml(item.mood)}</small>
      </div>
      <div class="layout-thumb ${escapeHtml(item.thumb)}" aria-hidden="true">
        ${templateThumbMarkup(item.thumb)}
      </div>
    </article>
  `;
  }).join("");

  $$(".template-card").forEach((card) => {
    card.addEventListener("click", () => applyLayoutToChoice(card.dataset.layout));
  });
}

$$(".step").forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.target);
  });
});

function showPanel(target) {
  $$(".step").forEach((item) => {
    item.classList.toggle("active", item.dataset.target === target);
  });
  $$(".panel").forEach((item) => {
    item.classList.toggle("active", item.id === target);
  });
  if (target === "drafts") {
    initializeImageDraftWorkflow();
    renderPlanningReviewCard();
  }
  updateWorkflowState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".choice-toggle");
    (group ? Array.from(group.querySelectorAll(".choice")) : $$(".choice")).forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    if (button.dataset.editDraft) {
      collectSectionEdits();
      activeSectionDraft = button.dataset.editDraft;
      activeSectionIndex = 0;
      renderSectionEditor();
      scrollActiveDraftSection();
    }
  });
});

renderTemplateLibrary();
renderSectionEditor();
["#templateCategoryFilter", "#templatePurposeFilter", "#templateDifficultyFilter"].forEach((selector) => {
  $(selector)?.addEventListener("change", renderTemplateLibrary);
});

async function runBeforePanel(action) {
  if (action === "plan") await prepareInternalAiPlanning();
  if (action === "drafts") {
    setImageGenerationNotice(
      "working",
      "최적 단일 방향 준비 중",
      "화면은 먼저 열렸습니다. 고객 작성 내용과 기획안을 바탕으로 이미지 생성 브리프를 정리하고 있습니다.",
    );
    await prepareImageDraftWorkspace();
    if (readImageDraftState().status === "draft") {
      setImageGenerationNotice(
        "success",
        "기존 이미지 시안 불러오기 완료",
        "등록된 시안을 바로 검토하거나 생성 조건을 바꿔 새 시안을 만들 수 있습니다.",
      );
    } else {
      setImageGenerationNotice(
        "ready",
        "이미지 시안 생성 준비 완료",
        "기획안을 검수한 뒤 작업 패키지를 만들어 Codex에서 이미지 시안을 생성하세요.",
      );
    }
  }
  if (action === "clientMail") await generateClientMail();
  if (action === "revision") await generateRevision();
  if (action === "handoff") await generateHandoff();
  if (action === "finalMail") await generateFinalMail();
}

function showPanelThenRun(button, target, action) {
  button.disabled = true;
  button.classList.add("is-preparing");
  showPanel(target);
  if (!action) {
    button.disabled = false;
    button.classList.remove("is-preparing");
    return;
  }
  Promise.resolve(runBeforePanel(action))
    .catch((error) => {
      updateAiStatus(error?.message || "화면 준비 중 오류가 발생했습니다.");
      if (action === "drafts") {
        setImageGenerationNotice(
          "error",
          "추천 방향 준비 실패",
          "프로젝트 정보는 유지됩니다. 잠시 후 다시 시도해주세요.",
        );
      }
    })
    .finally(() => {
      button.disabled = false;
      button.classList.remove("is-preparing");
    });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("#nextActionButton");
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.nextAction;
  const target = button.dataset.nextTarget || "projects";
  showPanelThenRun(button, target, action);
});

$$("[data-go-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    showPanelThenRun(button, button.dataset.goPanel, button.dataset.runBefore);
  });
});

const planningOptionsMount = $("#planningOptionsMount");
const optionsPanel = $("#options");
if (planningOptionsMount && optionsPanel) {
  planningOptionsMount.append(...Array.from(optionsPanel.children));
  optionsPanel.remove();
}

$("#loadSample")?.addEventListener("click", () => loadSample());
$("#importCustomerProject")?.addEventListener("click", () => importCustomerProject());
$("#generateAll")?.addEventListener("click", (event) => {
  event.preventDefault();
  generateAllFromTopbar();
});
$("#generatePlan")?.addEventListener("click", () => generatePlan());
$("#generateDrafts")?.addEventListener("click", async () => {
  prepareFirstPlanningDraft();
});
$("#toggleGuideMode")?.addEventListener("click", () => toggleGuideMode());
$("#generateClientMail")?.addEventListener("click", () => generateClientMail());
$("#runClientPreflight")?.addEventListener("click", () => renderClientPreflight());
$("#copyClientMail")?.addEventListener("click", () => copyResultText("#clientMailResult", "A/B 시안 전달 메일을 복사했습니다."));
$("#openClientMail")?.addEventListener("click", () => openMailDraft("#clientMailResult", `[${value("productName") || "상세페이지"}] 상세페이지 1차 방향성 시안 전달드립니다`));
$("#applyDraftEdits")?.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!ensurePlanningReviewApproved()) return;
  if (!productionRootDirectoryHandle && "showDirectoryPicker" in window) await connectProductionFolder({ quietCancel: true });
  generateImageDraftConcept();
});
$("#savePlanningRevision")?.addEventListener("click", savePlanningRevision);
$("#approvePlanningReview")?.addEventListener("click", approvePlanningReview);
$("#toggleCustomerComments")?.addEventListener("change", () => renderPlanningCollaboration());
$("#refreshPlanningComments")?.addEventListener("click", () => renderPlanningCollaboration());
$("#requestPlanningConfirm")?.addEventListener("click", requestPlanningConfirmation);
$("#recallPlanningConfirm")?.addEventListener("click", recallPlanningConfirmation);
$("#createPlanningRevisionJob")?.addEventListener("click", createPlanningRevisionJob);
$("#copyImagePrompt")?.addEventListener("click", () => {
  const brief = $("#imageDraftBrief")?.value.trim() || createImageDraftBrief();
  copyPlainText(brief, "이미지 생성 프롬프트를 복사했습니다.");
});
$("#registerImageDraft")?.addEventListener("click", () => $("#imageDraftFile")?.click());
$("#imageDraftFile")?.addEventListener("change", (event) => {
  registerImageDraftFile(event.target.files?.[0]);
  event.target.value = "";
});
$("#cancelImageGeneration")?.addEventListener("click", () => {
  currentImageGenerationController?.abort();
});
$("#openImageDraft")?.addEventListener("click", () => {
  const src = $("#imageDraftPreview")?.src;
  if (!src || $("#imageDraftPreview")?.hidden) {
    alert("먼저 이미지 시안을 등록해주세요.");
    return;
  }
  window.open(src, "_blank", "noopener,noreferrer");
});
$("#completeImageReview")?.addEventListener("click", completeImageDraftReview);
$("#applyImagePresentation")?.addEventListener("click", () => applyImageDraftPresentation(true));
$("#imageDraftZoom")?.addEventListener("input", () => {
  if ($("#imageDraftZoomValue")) $("#imageDraftZoomValue").textContent = `${$("#imageDraftZoom").value}%`;
});
$("#addImageRevision")?.addEventListener("click", addImageRevisionRequest);
$("#copyDesignerHandoff")?.addEventListener("click", copyDesignerHandoff);
$("#resetImageDraftWorkflow")?.addEventListener("click", resetImageDraftReviewState);
$("#connectProductionFolder")?.addEventListener("click", async () => {
  const handle = await connectProductionFolder();
  if (handle) {
    try {
      await saveProductionBundleToFolder(currentGeneratedImageDraftFile);
    } catch (error) {
      updateProductionFolderStatus(`폴더 저장 실패 · ${error?.message || "권한과 경로를 확인해주세요."}`, false);
    }
  }
});
$("#imageDraftDirection")?.addEventListener("change", () => {
  saveImageDraftState({ direction: value("imageDraftDirection") });
});
$("#applySectionEdits")?.addEventListener("click", (event) => {
  event.preventDefault();
  applySectionEdits();
  updateAiStatus("섹션별 수정값을 시안에 반영했습니다.");
});
$("#openPlanModal")?.addEventListener("click", () => {
  renderSectionLayouts();
  $("#planModal").hidden = false;
});
$("#openColorModal")?.addEventListener("click", () => {
  $("#colorModal").hidden = false;
});
$$("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.closeModal;
    if ($(id.startsWith("#") ? id : `#${id}`)) $(id.startsWith("#") ? id : `#${id}`).hidden = true;
  });
});
$$("[data-tone-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    if ($("#draftTone")) $("#draftTone").value = button.dataset.tonePreset;
    $("#colorModal").hidden = true;
    generateDraftsRules();
    updateAiStatus("전체 색상 톤을 변경했습니다.");
  });
});
$("#generateRevision")?.addEventListener("click", () => generateRevision());
$("#copyRevisionMail")?.addEventListener("click", () => copyResultText("#revisionMailResult", "수정 시안 컨펌 메일을 복사했습니다."));
$("#openRevisionMail")?.addEventListener("click", () => openMailDraft("#revisionMailResult", `[${value("productName") || "상세페이지"}] 상세페이지 수정 방향 확인 요청드립니다`));
$("#generateHandoff")?.addEventListener("click", () => generateHandoff());
$("#generateFigmaBrief")?.addEventListener("click", () => {
  if ($("#productionRoute")) $("#productionRoute").value = "figma";
  updateRouteSummary();
  $("#handoffResult").textContent = figmaCollaborationBriefText();
  updateWorkflowState();
});
$("#openFigmaPlaceholder")?.addEventListener("click", () => {
  const driveUrl = DESIGN_REFERENCE_POLICY.googleDriveRootUrl;
  if (!driveUrl) {
    alert("Google Drive 기획안·실제 제작물 통합 폴더 주소가 등록되지 않았습니다.");
    return;
  }
  window.open(driveUrl, "_blank", "noopener,noreferrer");
  updateAiStatus("Google Drive 기획안·실제 제작물 통합 레퍼런스를 열었습니다.");
});
$("#confirmRequestFromRoute")?.addEventListener("click", () => {
  if ($("#revisionMailResult")) $("#revisionMailResult").textContent = generateRevisionMailText();
  showPanel("revision");
});
$("#finalizeRoute")?.addEventListener("click", () => {
  generateFinalMail();
  showPanel("delivery");
});
$("#generateFinalMail")?.addEventListener("click", () => generateFinalMail());
document.addEventListener("click", (event) => {
  handleProjectManagement(event);
  const reviewButton = event.target.closest?.("[data-render-review]");
  if (reviewButton) {
    recordRenderedPreviewReview(reviewButton.dataset.renderReview || "png");
    updateAiStatus("실제 시안 화면 검수 결과를 저장했습니다.");
    return;
  }
  if (event.target.closest?.("[data-render-review-clear]")) {
    clearRenderedPreviewReview();
    updateAiStatus("시안 화면 검수 결과를 초기화했습니다.");
  }
});
$("#refreshLeads")?.addEventListener("click", renderLeads);
$("#refreshProjects")?.addEventListener("click", renderProjects);
$("#refreshCustomerProjects")?.addEventListener("click", () => syncCustomerProjectsFromCloud({ notify: true }));
$("#approveProjectReview")?.addEventListener("click", approveCurrentProjectReview);
$("#downloadContentSummary")?.addEventListener("click", () => downloadCurrentContentSummary());
$("#cancelProjectDelete")?.addEventListener("click", () => {
  pendingDeleteProjectId = "";
  $("#projectDeleteDialog")?.close();
});
$("#confirmProjectDelete")?.addEventListener("click", permanentlyDeleteCustomerProject);
$("#closeCustomerAssets")?.addEventListener("click", closeCustomerAssetsDialog);
$$("[data-customer-assets]").forEach((button) => {
  button.addEventListener("click", () => openCustomerAssetsDialog(button.dataset.customerAssets));
});
$$("#review input[type='checkbox']").forEach((checkbox) => {
  checkbox.addEventListener("change", updateWorkflowState);
});
["#clientReply", "#managerMemo", "#clientChoice"].forEach((selector) => {
  const syncFeedbackUi = () => {
    renderFeedbackAnalysis();
    if ($("#revisionMailResult")) $("#revisionMailResult").textContent = generateRevisionMailText();
    updateWorkflowState();
  };
  $(selector)?.addEventListener("input", syncFeedbackUi);
  $(selector)?.addEventListener("change", syncFeedbackUi);
});
$("#customerType")?.addEventListener("change", () => {
  if ($("#productionRoute")) $("#productionRoute").value = value("customerType") === "existing" ? "psd" : "figma";
  updateRouteSummary();
  updateWorkflowState();
});
$("#productionRoute")?.addEventListener("change", () => {
  updateRouteSummary();
  updateWorkflowState();
});
[
  "clientName", "productName", "category", "channel", "dueDate", "oneLine",
  "consultSummary", "clientRequests", "emphasis", "banWords", "mustInclude", "references",
].forEach((id) => {
  const field = document.getElementById(id);
  field?.addEventListener("input", () => {
    markCustomerFieldCompletion();
    invalidateCurrentProjectReview();
    renderProjectReviewGate();
  });
  field?.addEventListener("change", () => {
    markCustomerFieldCompletion();
    invalidateCurrentProjectReview();
    renderProjectReviewGate();
  });
});
removeRequestedTestProjects();
restoreHoabiCompleteExampleOnce();
restoreImportedCustomerProjectsOnce();
syncCustomerProjectsFromCloud();
window.haoSubmissionSync?.startAutoSync?.(async () => {
  await syncCustomerProjectsFromCloud();
  updateAiStatus("다른 기기에서 변경된 중앙 서버 내용을 자동 반영했습니다.");
}, 8000);
renderLeads();
renderProjects();
renderCustomerProjects();
markCustomerFieldCompletion();
renderProjectReviewGate();
setupBriefTextareaExpandTriggers();
renderCustomerAssetBoxes();
loadAiSettings();
renderAiWorkflowStatus();
updateReferenceStatus();
updateRouteSummary();
updateWorkflowState();
initializeImageDraftWorkflow();

