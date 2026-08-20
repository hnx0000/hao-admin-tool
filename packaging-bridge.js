(function () {
  "use strict";
  const PROFILE_KEY = "haoOperatorProfile";
  const params = new URLSearchParams(location.search);
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}"); } catch { profile = {}; }

  const incoming = {
    operatorName: params.get("operator") || "",
    projectAlias: params.get("project") || "",
    ctaText: params.get("cta") || "",
    ctaLink: params.get("ctaLink") || "",
  };
  const hasIncoming = Object.values(incoming).some(Boolean);
  if (hasIncoming) {
    profile = { ...profile, ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value)), updatedAt: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    ["operator", "project", "cta", "ctaLink"].forEach((key) => params.delete(key));
    const cleanQuery = params.toString();
    history.replaceState(null, "", `${location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${location.hash}`);
  }

  window.HAO_OPERATOR_PROFILE = Object.freeze({ ...profile });
  const topbar = document.querySelector(".topbar .actions");
  if (topbar && profile.operatorName) {
    const chip = document.createElement("span");
    chip.className = "operator-profile-chip";
    chip.textContent = `${profile.operatorName} 관리자`;
    chip.title = profile.projectAlias ? `프로젝트: ${profile.projectAlias}` : "확장프로그램에서 저장한 담당 관리자";
    topbar.prepend(chip);
  }
}());
