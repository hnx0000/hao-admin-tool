(function () {
  "use strict";
  let deferredPrompt = null;
  const query = new URLSearchParams(window.location.search);
  const isDesktopLauncher = query.get("source") === "desktop-app";
  const isInstalledApp = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (isDesktopLauncher) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    resetScroll();
    window.addEventListener("pageshow", resetScroll, { once: true });
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }

  const installButton = document.getElementById("installDesktopApp");
  if (installButton && (isDesktopLauncher || isInstalledApp)) installButton.hidden = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton && !isDesktopLauncher && !isInstalledApp) installButton.hidden = false;
  });

  installButton?.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("Chrome 또는 Edge 주소창의 설치 아이콘을 눌러 HAO 앱을 설치해주세요.");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (installButton) installButton.hidden = true;
  });
}());
