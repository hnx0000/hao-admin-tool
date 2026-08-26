window.HAO_CONFIG = Object.freeze({
  // 상세페이지 툴/접수서버를 배포한 뒤 발급되는 HTTPS 주소를 입력합니다.
  // 관리자 비밀번호와 세션 토큰은 절대로 이 공개 파일에 넣지 않습니다.
  submissionApiEndpoint: "https://hao-admin.vigo.co.kr/api/submissions",
  submissionAdminToken: "",
  // 사용자 제공 Google Drive 통합 레퍼런스 루트입니다.
  // 실제 파일 열람은 Google 계정의 Drive 권한을 그대로 따릅니다.
  googleDriveReferenceRootUrl: "https://drive.google.com/drive/folders/1Z06GingEwMtsjrBNTb0CCfK46IhXKwQS?usp=drive_link",
  googleDrivePlanningFolderUrl: "https://drive.google.com/drive/folders/1laAhV3yuLhFSqYL2Rwt3gk31jSSq40_6",
  googleDriveProductionFolderUrl: "https://drive.google.com/drive/folders/1aAStw4Chpvl3zqjF3slsIlS6kEE0PZ7A",
  googleDriveConnectionStatus: "connected",
  googleDrivePlanningReferenceCount: 28,
  googleDriveProductionProjectCount: 22,
});
