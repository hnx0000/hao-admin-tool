(function (root, factory) {
  const summary = factory(root?.COMPANY_REFERENCE_DATASET);
  if (typeof module === "object" && module.exports) module.exports = summary;
  if (root) root.COMPANY_REFERENCE_AUTO = Object.freeze(summary);
})(typeof window !== "undefined" ? window : globalThis, function (dataset) {
  "use strict";
  return {
    version: "2026-09-02-drive28-v2",
    total: Number(dataset?.source?.totalFiles || 28),
    assets: { planningBoards: 28, categoryPatterns: 5, columnTemplate: 3 },
    latestContactSheets: [
      "레퍼런스 라이브러리/03_Drive2026_분석/contact-sheet-1.jpg",
      "레퍼런스 라이브러리/03_Drive2026_분석/contact-sheet-2.jpg",
    ],
    audit: "레퍼런스 라이브러리/03_Drive2026_분석/REFERENCE_DB_AUDIT.md",
  };
});
