window.HAO_CONFIG = Object.freeze({
  // 상세페이지 툴/접수서버를 배포한 뒤 발급되는 HTTPS 주소를 입력합니다.
  // 관리자 비밀번호와 OpenAI API 키는 절대로 이 공개 파일에 넣지 않습니다.
  submissionApiEndpoint: "",
  submissionAdminToken: "",
  // Figma 원본 주소는 공개 배포 파일에 직접 넣지 않습니다.
  figmaDraftLibraryUrl: "",
  // 개별 Figma 상세페이지 레퍼런스를 모아둔 로컬 허브입니다.
  // 공개 배포본에는 원본 Figma URL을 직접 노출하지 않습니다.
  figmaReferenceIndexUrl: ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "figma-reference-index.html"
    : "",
});
