(() => {
  document.title = "HAO 상세페이지 제작 관리";
  const brand = document.querySelector(".brand");
  if (brand) {
    const mark = brand.querySelector(".brand-mark");
    const title = brand.querySelector("strong");
    const sub = brand.querySelector("small");
    if (mark) mark.textContent = "HAO";
    if (title) title.textContent = "상세페이지 제작 관리";
    if (sub) sub.textContent = "DETAIL OPERATIONS";
  }
})();
