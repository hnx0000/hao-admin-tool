// 커뮤니케이션·납품 출력 (M5 로 app.js 에서 분리)
//
// 공정 5~9단계의 텍스트 생성: 고객 발송 메일, 피드백 분석, 수정 시안,
// PSD·제작 지시서, 최종 납품 메일. detailpage-render.js 와 같은 이유로 IIFE 로
// 감싸지 않고 파일만 분할한다 — 전역 스코프 공유라 app.js 함수와 서로 보인다.
// index.html 에서 app.js 보다 먼저 로드한다.

function generateClientMailText() {
  const p = product();
  const layoutA = $("#templateA").textContent.trim();
  const layoutB = $("#templateB").textContent.trim();
  const conceptA = designConcept("A안", layoutA);
  const conceptB = designConcept("B안", layoutB);
  const concepts = photoConcepts().slice(0, 6).map((item, index) => `${index + 1}. ${item}`).join("\n");
  const imageStatus = clientImageStatusSummary();
  const workflow = latestDesignWorkflow();
  const aFocus = workflow.abStrategy?.A?.focus || "브랜드 무드와 제품 스토리";
  const bFocus = workflow.abStrategy?.B?.focus || "구매 이유와 정보 전달";
  return `제목: [${p.productName}] 상세페이지 1차 방향성 시안 전달드립니다

안녕하세요, 고객님.
${p.productName} 상세페이지 제작을 위한 1차 방향성 시안 2가지를 전달드립니다.

[A/B 시안 선택 기준]
A안: ${conceptA.title}
- 구성 방향: ${layoutA}
- 핵심 포인트: ${templateTone(layoutA).focus}
- 추천 기준: 브랜드 이미지, 고급스러운 첫인상, 원료/스토리, 선물용 무드가 중요할 때
- 내부 전략: ${aFocus}

B안: ${conceptB.title}
- 구성 방향: ${layoutB}
- 핵심 포인트: ${templateTone(layoutB).focus}
- 추천 기준: 구매 포인트, 비교 정보, 구성 확인, 빠른 이해가 중요할 때
- 내부 전략: ${bFocus}

이번 시안에는 아래 요소가 포함되어 있습니다.
1. 긴 세로형 상세페이지 흐름
2. 제품 대표컷/디테일컷/스토리컷 역할 구분
3. A안: 프리미엄 히어로, 원료 스토리, 선물 무드, 고급 CTA
4. B안: 구매 체크리스트, 비교표, 전환형 카드, 명확한 선택 유도
5. 선택 방향에 따라 수정 가능한 섹션별 텍스트와 색상 구조

이미지 안내:
현재 시안에 들어간 일부 이미지는 최종 촬영본이 아닌 임시 배치 이미지입니다.
최종 제작 시에는 선택하신 방향에 맞춰 제품 사진 보정, 배경 합성, 촬영컷 교체를 진행합니다.

[추천 촬영/합성 방향]
${concepts}

[이미지 진행 기준]
${imageStatus}

아래 양식으로 회신 부탁드립니다.

1. 선택 방향: A안 / B안 / A안 일부 수정 / B안 일부 수정
2. 마음에 드는 부분:
3. 수정하고 싶은 부분:
4. 더 강조할 내용:
5. 제외하거나 줄일 내용:
6. 이미지 관련 요청: 제품 사진 교체 / 촬영 희망 / 현재 방향 유지

회신 주시면 선택하신 방향을 기준으로 상세 디자인 작업을 진행하겠습니다.

감사합니다.`;
}

function clientPreflightChecks(mailText = $("#clientMailResult")?.textContent || "") {
  const p = product();
  const workflow = latestDesignWorkflow();
  const draftText = `${$("#draftA")?.innerText || ""}\n${$("#draftB")?.innerText || ""}`;
  const mail = String(mailText || "");
  const internalWords = ["DESIGN RECIPE", "IMAGE AI SLOT", "AI DESIGN STRATEGY", "Image AI prompt", "Selected draft design brief"];
  const internalLeaks = internalWords.filter((word) => draftText.includes(word) || mail.includes(word));
  const banWords = [
    ...String(p.banWords || "").split(/[,/\n]/),
    ...p.avoid,
    "질병 치료",
    "면역력 향상 보장",
    "의약품",
  ].map((item) => item.trim()).filter(Boolean);
  const riskyWords = banWords.filter((word) => word && (draftText.includes(word) || mail.includes(word)));
  const hasDrafts = Boolean($("#draftA")?.innerText.trim() && $("#draftB")?.innerText.trim());
  const hasProduct = Boolean(p.productName && p.category);
  const hasImagePlan = (workflow.imagePlan || []).length > 0;
  const hasVisualPrompts = (workflow.visualPrompts || []).length > 0;
  const mailMentionsTemporaryImage = /임시|촬영|합성|교체|최종/.test(mail);
  const hasReplyTemplate = /선택 방향|마음에 드는 부분|수정하고 싶은 부분|이미지 관련 요청/.test(mail);
  const abDifferent = (workflow.abStrategy?.A?.focus || "") !== (workflow.abStrategy?.B?.focus || "");
  const hasDecisionGuide = Boolean($(".ab-decision-guide")?.innerText.includes("A안 추천") && $(".ab-decision-guide")?.innerText.includes("B안 추천"));
  const qualityScore = draftDesignQualityScore();
  const checks = [
    {
      label: "프로젝트 기본 정보",
      ok: hasProduct,
      detail: hasProduct ? `${p.productName} / ${p.category}` : "제품명과 카테고리를 확인해주세요.",
    },
    {
      label: "A/B 시안 생성",
      ok: hasDrafts,
      detail: hasDrafts ? "A/B 시안 미리보기가 생성되어 있습니다." : "A/B 시안을 먼저 생성해주세요.",
    },
    {
      label: "A/B 방향 차이",
      ok: abDifferent,
      detail: abDifferent ? "A안과 B안의 전략이 다르게 설정되어 있습니다." : "A/B 전략 차이가 약합니다.",
    },
    {
      label: "A/B 선택 가이드",
      ok: hasDecisionGuide,
      detail: hasDecisionGuide ? "담당자가 고객에게 설명할 A/B 추천 기준이 화면에 표시됩니다." : "A/B 선택 가이드를 먼저 확인해주세요.",
    },
    {
      label: "디자인 품질 기준",
      ok: qualityScore.score >= 75,
      detail: `현재 디자인 구조 점수 ${qualityScore.score}점 / 통과 ${qualityScore.passed}개`,
    },
    {
      label: "이미지/합성 계획",
      ok: hasImagePlan && hasVisualPrompts,
      detail: hasVisualPrompts ? `이미지 슬롯 ${workflow.imagePlan.length}개, 생성 프롬프트 ${workflow.visualPrompts.length}개` : "이미지 생성/촬영 프롬프트가 부족합니다.",
    },
    {
      label: "고객 회신 양식",
      ok: hasReplyTemplate,
      detail: hasReplyTemplate ? "고객이 A/B 선택과 수정 요청을 바로 회신할 수 있는 양식이 포함되어 있습니다." : "고객 회신 양식이 부족합니다.",
    },
    {
      label: "내부 문구 노출",
      ok: internalLeaks.length === 0,
      detail: internalLeaks.length ? `${internalLeaks.join(", ")} 문구가 고객용 자료에 남아있을 수 있습니다.` : "고객에게 보이면 안 되는 내부 문구는 감지되지 않았습니다.",
    },
    {
      label: "금지/주의 표현",
      ok: riskyWords.length === 0,
      detail: riskyWords.length ? `${[...new Set(riskyWords)].join(", ")} 표현을 확인해주세요.` : "금지/주의 표현 위험이 감지되지 않았습니다.",
    },
    {
      label: "임시 이미지 안내",
      ok: mailMentionsTemporaryImage,
      detail: mailMentionsTemporaryImage ? "메일에 임시 이미지 및 촬영/합성 교체 안내가 포함되어 있습니다." : "메일에 임시 이미지 안내를 포함하는 것이 좋습니다.",
    },
  ];
  return {
    checks,
    passed: checks.every((item) => item.ok),
  };
}

function renderClientPreflight(mailText) {
  const target = $("#clientPreflightResult");
  const result = clientPreflightChecks(mailText);
  if (!target) return result;
  target.classList.toggle("passed", result.passed);
  target.classList.toggle("needs-check", !result.passed);
  target.innerHTML = `
    <strong>${result.passed ? "발송 가능 상태" : "발송 전 확인 필요"}</strong>
    <p>${result.passed ? "고객에게 시안을 보낼 준비가 되었습니다." : "아래 항목을 확인한 뒤 메일을 발송하세요."}</p>
    <ul>
      ${result.checks.map((item) => `
        <li class="${item.ok ? "ok" : "warn"}">
          <b>${item.ok ? "OK" : "확인"}</b>
          <span>${escapeHtml(item.label)}</span>
          <em>${escapeHtml(item.detail)}</em>
        </li>
      `).join("")}
    </ul>
  `;
  return result;
}

async function generateClientMail() {
  const fallback = generateClientMailText();
  $("#clientMailResult").textContent = fallback;
  renderClientPreflight(fallback);
  try {
    const aiText = await invokeAiRole("clientMail", "고객에게 보낼 A/B 시안 전달 메일 생성", {
      product: product(),
      layoutA: $("#templateA").textContent.trim(),
      layoutB: $("#templateB").textContent.trim(),
      tone: "정중하고 간결한 비즈니스 메일",
    }, fallback);
    if (aiText) $("#clientMailResult").textContent = aiText;
    renderClientPreflight(aiText || fallback);
  } catch {
    $("#clientMailResult").textContent = fallback;
    renderClientPreflight(fallback);
  }
  updateWorkflowState();
}

function mailPartsFromText(text, fallbackSubject) {
  const lines = String(text || "").split("\n");
  const firstLine = lines[0]?.trim() || "";
  if (firstLine.startsWith("제목:")) {
    return {
      subject: firstLine.replace("제목:", "").trim() || fallbackSubject,
      body: lines.slice(1).join("\n").trim(),
    };
  }
  return {
    subject: fallbackSubject,
    body: String(text || "").trim(),
  };
}

async function copyResultText(targetId, successMessage) {
  const text = $(targetId)?.textContent?.trim() || "";
  if (!text || text.includes("여기에 표시됩니다")) {
    alert("먼저 메일 초안을 생성해주세요.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    updateAiStatus(successMessage);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    updateAiStatus(successMessage);
  }
}

function openMailDraft(targetId, fallbackSubject) {
  const text = $(targetId)?.textContent?.trim() || "";
  if (!text || text.includes("여기에 표시됩니다")) {
    alert("먼저 메일 초안을 생성해주세요.");
    return;
  }
  const parts = mailPartsFromText(text, fallbackSubject);
  window.location.href = `mailto:?subject=${encodeURIComponent(parts.subject)}&body=${encodeURIComponent(parts.body)}`;
}

function generateRevisionText() {
  const p = product();
  const choice = value("clientChoice");
  const reply = value("clientReply") || "고객 회신 내용이 아직 입력되지 않았습니다.";
  const memo = value("managerMemo") || "담당자 추가 메모 없음";
  const selectedTemplate = choice.startsWith("B") ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const dataset = categoryDataset(p.category);
  const layouts = sectionLayoutItems(selectedTemplate);
  const photoItems = photoConcepts().slice(0, 5);
  const selectedKey = choice.startsWith("B") ? "B" : "A";
  const editSummary = sectionEditSummary(selectedKey);
  const feedbackItems = analyzeClientFeedback();
  const priorityItems = feedbackPriorityPlan(feedbackItems);
  const feedbackSummary = feedbackItems.length
    ? feedbackItems.map((item, index) => `${index + 1}. ${item.label}: ${item.copyHint}`).join("\n")
    : "고객 피드백에서 명확한 수정 의도가 감지되지 않았습니다. 담당자 확인이 필요합니다.";

  return `[고객 피드백 반영 수정 시안]

제품명: ${p.productName}
선택 방향: ${choice}
기준 템플릿: ${selectedTemplate}

[고객 피드백 원문]
${reply}

[담당자 메모]
${memo}

[AI 피드백 분석]
${feedbackSummary}

[수정 우선순위]
${priorityItems}

[AI 수정 반영 방향]
1. 선택한 ${choice.includes("B") ? "B안" : "A안"}의 전체 레이아웃을 기준으로 유지합니다.
2. 고객이 언급한 수정 요청은 PSD 제작 전 초안 단계에서 먼저 반영 방향을 정리합니다.
3. 이미지가 임시인 구간은 촬영/합성 컨셉을 더 명확하게 표시합니다.
4. 건강식품 표현은 ${dataset.caution.join(", ")} 기준을 지켜 과장 표현을 피합니다.

[섹션별 수정 반영표]
${layouts.map((item, index) => `${index + 1}. ${item}
   - 반영 방식: 고객 피드백을 기준으로 카피, 이미지 슬롯, 강조 순서를 조정
   - 확인 포인트: 최종 PSD 제작 전 고객 컨펌 필요`).join("\n")}

[시안 편집 작업대 반영값]
${editSummary}

[이미지/촬영/합성 교체 방향]
${photoItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}

[고객 컨펌 요청 포인트]
1. 선택한 방향(${choice})으로 PSD 제작을 진행해도 되는지
2. 수정 반영표 중 추가하거나 빼야 할 섹션이 있는지
3. 임시 이미지가 최종 촬영/합성 이미지로 교체되는 점을 확인했는지
4. 최종 납품 범위가 PNG/JPG 기준이며 PSD 원본은 별도 추가금 대상임을 확인했는지

[디자이너에게 넘기기 전 확인]
고객이 이 수정 방향을 컨펌하면, 다음 단계에서 미얀마 디자이너용 PSD 작업 지시서를 생성합니다.`;
}

function sectionEditSummary(key) {
  const edits = sectionEdits[key] || [];
  if (!edits.length) return "섹션별 수동 수정값 없음. 자동 생성 시안 기준으로 진행합니다.";
  return edits.map((edit, index) => {
    const color = edit.color && edit.color !== "auto" ? edit.color : "전체 톤 유지";
    const variant = SECTION_VARIANT_LABELS[edit.variant || "auto"] || "자동 디자인";
    return `${String(index + 1).padStart(2, "0")}. ${edit.title || "섹션 제목 유지"}
   - 설명: ${edit.copy || "기본 설명 유지"}
   - 색상: ${color}
   - 사진 슬롯: ${imageSlotLabel(edit.imageSlot || "hero")}
   - 디자인 스타일: ${variant}`;
  }).join("\n");
}

function generateRevisionMailText() {
  const p = product();
  const choice = value("clientChoice");
  const feedbackItems = analyzeClientFeedback();
  const topItems = feedbackItems.slice(0, 4).map((item, index) => `${index + 1}. ${item.label}: ${item.copyHint}`).join("\n");
  return `제목: [${p.productName}] 상세페이지 수정 방향 확인 요청드립니다

안녕하세요, 고객님.
보내주신 피드백을 기준으로 ${p.productName} 상세페이지 수정 방향을 정리했습니다.

기준 방향: ${choice}

아래 수정 방향을 확인 부탁드립니다.

[수정 반영 예정 내용]
${topItems || "1. 고객 회신 내용을 기준으로 문구, 이미지, 섹션 강조 순서를 정리합니다."}

[확인 부탁드릴 내용]
1. 위 수정 방향으로 진행해도 되는지
2. 추가로 더 강조하거나 제외할 내용이 있는지
3. 임시 이미지를 최종 촬영/합성 이미지로 교체하는 방향에 동의하시는지
4. 최종 PSD 제작 단계로 넘어가도 되는지

확인 후 컨펌 주시면 해당 방향으로 PSD 제작 작업에 들어가겠습니다.

감사합니다.`;
}

function feedbackPriorityPlan(items = analyzeClientFeedback()) {
  if (!items.length) return "1. 고객 회신 내용 확인 필요: 명확한 수정 의도가 감지되지 않았습니다.";
  const priorityMap = {
    redraft: 1,
    image: 2,
    tone: 3,
    conversion: 3,
    ingredient: 4,
    remove: 5,
    simple: 5,
    keep: 6,
    general: 7,
  };
  return [...items]
    .sort((a, b) => (priorityMap[a.type] || 9) - (priorityMap[b.type] || 9))
    .map((item, index) => {
      const scope = item.sectionTypes?.map((type) => sectionTypeLabel(type)).join(", ") || "전체 시안";
      return `${index + 1}. ${item.label}
   - 우선순위: ${priorityLabel(index)}
   - 적용 섹션: ${scope}
   - 반영 내용: ${item.copyHint}`;
    }).join("\n");
}

function priorityLabel(index) {
  if (index === 0) return "최우선";
  if (index === 1) return "높음";
  if (index === 2) return "중간";
  return "보조";
}

function sectionTypeLabel(type = "") {
  const labels = {
    "sales-hero": "메인 비주얼",
    "sales-story": "원료/스토리",
    "sales-benefit": "핵심 장점",
    "sales-scene": "사용 장면",
    "sales-trust": "신뢰 정보",
    "sales-info": "제품 정보",
    "sales-cta": "최종 CTA",
  };
  return labels[type] || type || "전체";
}

function analyzeClientFeedback() {
  const text = `${value("clientChoice")} ${value("clientReply")} ${value("managerMemo")}`;
  const lower = text.toLowerCase();
  const items = [];
  const has = (patterns) => patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
  if (has(["A안", "프리미엄", "고급", "브랜드", "선물", "감성"])) {
    items.push({
      type: "tone",
      label: "프리미엄/브랜드 무드 강화",
      sectionTypes: ["sales-hero", "sales-story", "sales-cta"],
      color: "#b88a2a",
      variant: "premium-card",
      copyHint: "프리미엄 이미지와 선물 가치를 더 분명하게 보여주는 방향으로 보강",
    });
  }
  if (has(["B안", "구매", "전환", "비교", "정보", "설명", "명확"])) {
    items.push({
      type: "conversion",
      label: "구매 판단 정보 강화",
      sectionTypes: ["sales-benefit", "sales-trust", "sales-info"],
      color: "#c56a2d",
      variant: "graphic-badge",
      copyHint: "구매 포인트, 비교 정보, 신뢰 요소가 더 빠르게 읽히도록 보강",
    });
  }
  if (has(["원료", "리치", "꿀", "성분", "스토리", "산지"])) {
    items.push({
      type: "ingredient",
      label: "원료/스토리 강조",
      sectionTypes: ["sales-story"],
      imageSlot: "origin",
      variant: "editorial",
      copyHint: "리치 원료와 프리미엄 꿀 조합의 스토리를 더 앞쪽에서 강조",
    });
  }
  if (has(["사진", "이미지", "촬영", "합성", "패키지", "제품컷", "스틱"])) {
    items.push({
      type: "image",
      label: "제품 이미지/촬영 방향 강화",
      sectionTypes: ["sales-hero", "sales-scene", "sales-cta"],
      imageSlot: has(["패키지"]) ? "package" : "lifestyle",
      variant: "photo-focus",
      copyHint: "제공 제품컷을 우선 사용하고 최종 촬영/합성컷으로 교체되는 점을 명확히 표시",
    });
  }
  if (has(["마음에", "좋", "유지", "괜찮", "그대로"])) {
    items.push({
      type: "keep",
      label: "선호 요소 유지",
      sectionTypes: ["sales-hero", "sales-story", "sales-cta"],
      variant: "auto",
      copyHint: "고객이 긍정적으로 본 첫인상과 주요 분위기는 유지하고 필요한 부분만 보정",
    });
  }
  if (has(["제외", "빼", "줄이", "삭제", "과해", "부담"])) {
    items.push({
      type: "remove",
      label: "과한 요소 축소",
      sectionTypes: ["sales-benefit", "sales-info", "sales-trust"],
      variant: "editorial",
      copyHint: "고객이 부담스러워한 문구, 장식, 정보량을 줄이고 핵심만 남기는 방향",
    });
  }
  if (has(["재시안", "다시", "다른 방향", "새로"])) {
    items.push({
      type: "redraft",
      label: "재시안 필요",
      sectionTypes: ["sales-hero", "sales-story", "sales-benefit", "sales-cta"],
      color: "#9b7448",
      variant: "photo-focus",
      copyHint: "현재 A/B 방향과 다른 분위기의 재시안이 필요하므로 히어로, 스토리, CTA 톤을 다시 정리",
    });
  }
  if (has(["간결", "심플", "줄여", "덜어", "복잡"])) {
    items.push({
      type: "simple",
      label: "내용 간결화",
      sectionTypes: ["sales-benefit", "sales-info"],
      variant: "editorial",
      copyHint: "문구를 더 짧게 정리하고 핵심 구매 이유만 남기는 방향",
    });
  }
  if (!items.length && text.trim()) {
    items.push({
      type: "general",
      label: "일반 수정 요청 반영",
      sectionTypes: ["sales-hero", "sales-benefit"],
      variant: "auto",
      copyHint: "고객 회신을 기준으로 카피와 강조 순서를 조정",
    });
  }
  return items;
}

function applyFeedbackToSectionEdits() {
  const selectedKey = value("clientChoice").startsWith("B") ? "B" : "A";
  const sections = editableSectionsForDraft(selectedKey);
  const feedbackItems = analyzeClientFeedback();
  if (!feedbackItems.length) return { selectedKey, feedbackItems, applied: [] };
  const next = [...(sectionEdits[selectedKey] || [])];
  const applied = [];
  sections.forEach((section, index) => {
    const match = feedbackItems.find((item) => item.sectionTypes.includes(section.type));
    if (!match) return;
    const current = next[index] || {};
    const baseTitle = current.title || sectionDefaultTitle(section);
    const baseCopy = (current.copy || sectionDefaultCopy(section)).split("\n\n수정 반영:")[0];
    next[index] = {
      ...current,
      title: baseTitle,
      copy: `${baseCopy}\n\n수정 반영: ${match.copyHint}`,
      color: match.color || current.color || "auto",
      imageSlot: match.imageSlot || current.imageSlot || section.imageSlot || "hero",
      variant: match.variant || current.variant || "auto",
    };
    applied.push({
      section: baseTitle,
      label: match.label,
      detail: match.copyHint,
    });
  });
  sectionEdits[selectedKey] = next;
  activeSectionDraft = selectedKey;
  activeSectionIndex = 0;
  return { selectedKey, feedbackItems, applied };
}

function renderFeedbackAnalysis(result = { selectedKey: value("clientChoice").startsWith("B") ? "B" : "A", feedbackItems: analyzeClientFeedback(), applied: [] }) {
  const target = $("#feedbackAnalysisResult");
  if (!target) return result;
  const items = result.feedbackItems || [];
  const applied = result.applied || [];
  target.classList.toggle("has-analysis", items.length > 0);
  target.innerHTML = `
    <strong>${items.length ? `${result.selectedKey}안 기준 피드백 분석 완료` : "피드백 분석 대기"}</strong>
    <p>${items.length ? "고객 회신에서 감지한 수정 의도와 자동 반영 섹션입니다." : "고객 회신을 입력하면 선택 시안에 반영할 수정 방향을 자동으로 정리합니다."}</p>
    ${items.length ? `
      <ul>
        ${items.map((item, index) => `<li><b>${escapeHtml(priorityLabel(index))} · ${escapeHtml(item.label)}</b><span>${escapeHtml(item.copyHint)}</span><em>${escapeHtml(item.sectionTypes?.map((type) => sectionTypeLabel(type)).join(", ") || "전체 시안")}</em></li>`).join("")}
      </ul>
      <em>${applied.length ? `${applied.length}개 섹션 편집값에 자동 반영됨` : "자동 반영할 섹션을 찾지 못했습니다. 수동 편집이 필요합니다."}</em>
    ` : ""}
  `;
  return result;
}

async function generateRevision() {
  applyFeedbackToDraftControls();
  const feedbackResult = applyFeedbackToSectionEdits();
  renderFeedbackAnalysis(feedbackResult);
  renderDraftPreviewsOnly();
  renderSectionEditor();
  const fallback = generateRevisionText();
  $("#revisionResult").textContent = fallback;
  $("#revisionMailResult").textContent = generateRevisionMailText();
  try {
    const aiText = await invokeAiRole("revision", "고객 피드백 반영 상세페이지 수정 시안 생성", {
      product: product(),
      clientChoice: value("clientChoice"),
      clientReply: value("clientReply"),
      managerMemo: value("managerMemo"),
      layoutA: $("#templateA").textContent.trim(),
      layoutB: $("#templateB").textContent.trim(),
      instruction: "고객 피드백을 바탕으로 PSD 제작 전 고객에게 다시 확인받을 수정 시안 요약과 수정 방향을 작성한다.",
    }, fallback);
    if (aiText) $("#revisionResult").textContent = aiText;
  } catch {
    $("#revisionResult").textContent = fallback;
  }
  updateWorkflowState();
}

function applyFeedbackToDraftControls() {
  const text = `${value("clientReply")} ${value("managerMemo")}`;
  if (!text.trim()) return;
  if ($("#draftTone")) {
    if (text.includes("고급") || text.includes("프리미엄") || text.includes("선물")) $("#draftTone").value = "premium";
    if (text.includes("따뜻") || text.includes("오렌지") || text.includes("감성")) $("#draftTone").value = "warm";
    if (text.includes("깔끔") || text.includes("깨끗") || text.includes("화이트")) $("#draftTone").value = "clean";
    if (text.includes("신선") || text.includes("그린") || text.includes("원료")) $("#draftTone").value = "fresh";
    if (text.includes("다크") || text.includes("블랙") || text.includes("무게감")) $("#draftTone").value = "dark";
  }
  if ($("#draftDensity")) {
    if (text.includes("더 강조") || text.includes("풍부") || text.includes("많이")) $("#draftDensity").value = "rich";
    if (text.includes("간결") || text.includes("심플") || text.includes("덜어")) $("#draftDensity").value = "simple";
  }
  if ($("#draftImagePosition")) {
    if (text.includes("제품") || text.includes("패키지") || text.includes("이미지 크게")) $("#draftImagePosition").value = "full";
    if (text.includes("상단") || text.includes("첫 화면")) $("#draftImagePosition").value = "top";
  }
  generateDraftsRules();
}

function psdDesignBrief(key, template) {
  const concept = designConcept(`${key}안`, template);
  const workflow = latestDesignWorkflow();
  const strategy = key === "B" ? workflow.abStrategy.B : workflow.abStrategy.A;
  const imageMap = detailImageSet() || {};
  const media = heroMediaItems(imageMap, "hero").map((item, index) => (
    `${index + 1}. ${item.title}: ${item.copy}${item.src ? ` / source: ${item.src}` : " / source: temporary image slot"}`
  )).join("\n");
  const imageAiPlan = workflow.imagePlan.map((item, index) => (
    `${index + 1}. ${item.role} / ${item.usedFor} / ${item.aiTarget}`
  )).join("\n");
  const imageStatus = designerImageStatusSummary();
  const sectionImageBrief = sectionImageProductionBrief(key);
  const visualPrompts = (workflow.visualPrompts || []).slice(0, 8).map((item, index) => (
    `${index + 1}. [${item.draft}안] ${item.role}
   - prompt: ${item.prompt}
   - negative: ${item.negativePrompt}`
  )).join("\n");
  return `[Selected draft design brief]
Concept: ${concept.title}
Mood keywords: ${concept.keywords}
AI strategy: ${strategy.name} / ${strategy.focus}
Main design rule: Follow the AI draft first, then refine spacing, typography, image masking, cards, icons, CTA, and infographic blocks.

Visible design blocks to recreate:
1. Hero section with large product visual, headline hierarchy, chips, and floating point card
2. Ingredient story section with product/origin image and three ingredient cards
3. Benefit cards with numbered badges and product image strip
4. ${key === "B" ? "Conversion comparison table and buying checklist" : "Premium story flow and mood band"}
5. Lifestyle scene section with product image and usage/situation list
6. Trust check cards and product information table
7. Final dark CTA section with delivery-ready closing badges

Image role guide:
${media}

AI image/composite slot guide:
${imageAiPlan}

Image production status:
${imageStatus}

Section-by-section image production brief:
${sectionImageBrief}

Image AI prompt guide:
${visualPrompts || "Visual prompts are not generated yet. Use the image role guide as the fallback."}

PSD production focus:
1. Keep the long vertical detail-page flow.
2. Recreate section backgrounds, cards, badges, comparison table, CTA, and trust blocks.
3. Replace temporary images with edited product photos or composed lifestyle images.
4. Keep text editable and group layers by section.
5. Do not flatten text or merge the major section groups.
6. Keep A draft premium/brand-oriented and B draft conversion/sales-oriented.
7. Product photos should stay fully visible when possible; use contain-style masking for stick/package shots and top-crop only for long reference detail images.`;
}

function productionQaGuide(route = value("productionRoute")) {
  if (route === "figma") {
    return `[시안 작업/검수 기준]
1. 상세페이지 전체는 하나의 긴 세로형 작업 프레임으로 정리합니다.
2. 섹션은 Hero, Story, Ad_Poster, Benefit, Lifestyle, Photo_Plan, Trust, Info, Purchase_Stack, CTA처럼 실제 시안 순서에 맞춰 이름을 붙입니다.
3. 텍스트는 모두 수정 가능한 Text Layer로 유지합니다.
4. 제품 이미지 프레임은 교체 가능한 이미지 프레임으로 유지합니다.
5. 광고형 고밀도 포스터 구간은 제품컷, 레퍼런스 리듬, 구매 이유 카드가 한 화면에 보이도록 유지합니다.
6. 촬영/합성 방향 구간은 최종 교체 이미지 슬롯이 명확해야 합니다.
7. 고객 컨펌 전 PNG/JPG 미리보기 Export를 준비합니다.
8. 고객 코멘트가 들어오면 해당 섹션 프레임 단위로 수정합니다.
9. 최종 납품 시 편집 원본 또는 Export 파일 범위를 명확히 표시합니다.`;
  }
  return `[PSD 작업/검수 기준]
1. PSD는 실제 선택 시안 순서대로 섹션별 그룹을 정리합니다.
2. 텍스트 레이어는 반드시 수정 가능하게 유지합니다.
3. 제품컷은 왜곡하지 않고, 배경 합성/마스킹만 조정합니다.
4. ad_poster 그룹은 제품컷, 레퍼런스 썸네일, 구매 이유 카드, 배경 그래픽을 분리합니다.
5. photo_plan 그룹은 임시 이미지와 최종 촬영/합성 교체 기준을 확인할 수 있어야 합니다.
6. purchase_stack 그룹은 최종 구매 이유 카드, 제품 스택, CTA 연결을 유지합니다.
7. AI 시안의 섹션 순서, 색상 톤, 카드/배지/CTA 구조를 최대한 동일하게 구현합니다.
8. JPG/PNG 전체 미리보기와 PSD 원본을 함께 확인합니다.
9. 분할페이지 요청 시 섹션 경계가 자연스럽게 잘리는지 확인합니다.
10. PSD 원본 제공은 추가금 대상이므로 납품 안내에서 별도 표시합니다.`;
}

function deliveryScopeGuide(route = value("productionRoute")) {
  if (route === "figma") {
    return `[납품 범위]
- 기본: 최종 상세페이지 PNG/JPG
- 요청 시: 분할 이미지
- 협업 파일: 승인된 시안 링크 또는 Export 파일
- 원본 범위: 계약 조건에 따라 편집 원본 제공 여부 확인`;
  }
  return `[납품 범위]
- 기본: 최종 상세페이지 PNG/JPG
- 요청 시: 분할 이미지
- 추가금 대상: PSD 원본
- 내부 보관: PSD 원본, 최종 JPG/PNG, 분할 파일, 사용 이미지`;
}

function productionConfirmSummary(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A", template = "") {
  const p = product();
  const choice = value("clientChoice") || `${selectedKey}안 중심`;
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const revisionReady = revision && !revision.includes("여기에 표시됩니다");
  const applied = sectionEditSummary(selectedKey);
  return `Project: ${p.productName || "제품명 미입력"}
Selected draft: ${selectedKey}안 ${template || (selectedKey === "B" ? $("#templateB")?.textContent.trim() : $("#templateA")?.textContent.trim())}
Customer choice: ${choice}
Production route: ${route.name}
Customer confirmation source: ${revisionReady ? "수정 시안 컨펌 요청 기준 사용" : "고객 최종 컨펌 내용 확인 필요"}
Revision basis:
${revisionReady ? revision.slice(0, 900) : "수정 시안 컨펌 내용이 아직 충분하지 않습니다. 고객 최종 승인 후 제작 지시를 확정하세요."}

Final section edit basis:
${applied}`;
}

function productionHandoffPreflight(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A") {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const hasRevision = revision && !revision.includes("여기에 표시됩니다");
  const hasDraft = selectedKey === "B" ? Boolean($("#draftB")?.innerText.trim()) : Boolean($("#draftA")?.innerText.trim());
  const hasImages = Boolean((latestDesignWorkflow().imageSlotStatus || []).length);
  const hasEdits = Boolean((sectionEdits[selectedKey] || []).length);
  const checks = [
    { label: "선택 시안", ok: hasDraft, detail: `${selectedKey}안 기준` },
    { label: "고객 컨펌/수정 방향", ok: hasRevision, detail: hasRevision ? "수정 시안 요약 있음" : "고객 최종 컨펌 또는 수정 방향 확인 필요" },
    { label: "섹션 편집값", ok: hasEdits, detail: hasEdits ? "섹션별 편집/자동 폴리싱값 있음" : "섹션 편집값 없음. 자동 시안 기준" },
    { label: "이미지 제작 기준", ok: hasImages, detail: hasImages ? "이미지 슬롯 상태 정리됨" : "이미지 슬롯 상태 확인 필요" },
    { label: "제작 라인", ok: Boolean(route.name), detail: `${route.customerLabel} / ${route.name}` },
  ];
  return checks.map((item) => `${item.ok ? "OK" : "CHECK"} - ${item.label}: ${item.detail}`).join("\n");
}

function productionHandoffPreflightItems(selectedKey = value("clientChoice").startsWith("B") ? "B" : "A") {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  const revision = $("#revisionResult")?.textContent?.trim() || "";
  const hasRevision = revision && !revision.includes("여기에 표시됩니다");
  const draftTarget = selectedKey === "B" ? $("#draftB") : $("#draftA");
  const hasDraft = Boolean(draftTarget?.innerText.trim());
  const hasImages = Boolean((latestDesignWorkflow().imageSlotStatus || []).length);
  const editedSections = (sectionEdits[selectedKey] || []).filter((item) => item?.manualEdited || item?.autoPolished).length;
  return [
    { label: "선택 시안", ok: hasDraft, detail: hasDraft ? `${selectedKey}안 시안 생성됨` : "A/B 시안 생성 필요" },
    { label: "고객 컨펌", ok: hasRevision, detail: hasRevision ? "수정 방향/컨펌 메일 기준 있음" : "고객 선택 또는 수정 컨펌 확인 필요" },
    { label: "섹션 수정 기준", ok: editedSections > 0, detail: editedSections > 0 ? `${editedSections}개 섹션 편집 기준 있음` : "자동 시안 기준으로 전달됨" },
    { label: "이미지 제작 기준", ok: hasImages, detail: hasImages ? "임시/최종 이미지 슬롯 정리됨" : "제품 이미지 또는 촬영/합성 기준 확인 필요" },
    { label: "제작 라인", ok: Boolean(route.name), detail: `${route.customerLabel} / ${route.name}` },
  ];
}

function renderProductionHandoffPreflight() {
  const target = $("#handoffPreflightResult");
  if (!target) return;
  const selectedKey = value("clientChoice").startsWith("B") ? "B" : "A";
  const items = productionHandoffPreflightItems(selectedKey);
  const passedCount = items.filter((item) => item.ok).length;
  target.className = `preflight-panel ${passedCount >= 4 ? "passed" : "needs-check"}`;
  target.innerHTML = `
    <strong>제작 전달 전 체크</strong>
    <p>${selectedKey}안 기준 · ${passedCount}/${items.length}개 항목 준비됨</p>
    <ul>
      ${items.map((item) => `
        <li class="${item.ok ? "ok" : "warn"}">
          <b>${item.ok ? "OK" : "확인"}</b>
          <span>${item.label}</span>
          <em>${item.detail}</em>
        </li>
      `).join("")}
    </ul>
  `;
}

function figmaCollaborationBriefText() {
  const p = product();
  const workflow = latestDesignWorkflow();
  const choice = value("clientChoice");
  const selectedDraft = choice.startsWith("B") ? "B안" : "A안";
  const template = selectedDraft === "B안" ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const config = productionRouteConfig("figma", p.customerType);
  const imagePlan = (workflow.imagePlan || []).slice(0, 8).map((item, index) => (
    `${index + 1}. ${item.role} / ${item.usedFor || "상세페이지 이미지 슬롯"} / ${item.aiTarget || "시안 이미지 영역"}`
  )).join("\n");
  const imageStatus = designerImageStatusSummary();
  const selectedKey = selectedDraft === "B안" ? "B" : "A";
  const sectionImageBrief = sectionImageProductionBrief(selectedKey);
  const confirmSummary = productionConfirmSummary(selectedKey, template);
  const preflight = productionHandoffPreflight(selectedKey);
  const visualPrompts = (workflow.visualPrompts || []).slice(0, 8).map((item, index) => (
    `${index + 1}. [${item.draft}안] ${item.role}
   - 생성 프롬프트: ${item.prompt}
   - 금지 프롬프트: ${item.negativePrompt}`
  )).join("\n");
  return `[Google Drive 시안 협업 패키지]
Project: ${p.productName}
Customer type: ${config.customerLabel}
Production route: ${config.name}
Selected draft: ${selectedDraft} ${template}
Planning reference library: ${DESIGN_REFERENCE_POLICY.googleDrivePlanningUrl}
Production reference library: ${DESIGN_REFERENCE_POLICY.googleDriveProductionUrl}

[목표]
${config.goal}

[최종 컨펌 기준]
${confirmSummary}

[제작 전달 전 체크]
${preflight}

[시안 초안 구성]
1. A/B 중 고객이 선택한 시안을 기준으로 긴 세로형 상세페이지 프레임을 구성합니다.
2. 섹션은 메인 비주얼, 원료/스토리, 핵심 장점, 사용 장면, 신뢰 정보, 제품 정보, CTA 순서로 정리합니다.
3. 텍스트, 이미지, 색상, 섹션 순서는 디자이너가 편집 원본에서 빠르게 수정할 수 있도록 분리합니다.
4. 임시 이미지는 교체 가능한 이미지 프레임으로 유지합니다.

[디자이너 수정 기준]
1. AI 시안의 레이아웃과 정보 위계를 유지합니다.
2. 고객 피드백은 프로젝트 피드백 또는 담당자 메모 기준으로 반영합니다.
3. 제품 이미지는 왜곡하지 않고, 필요 시 배경 합성/마스킹만 조정합니다.
4. 고객 컨펌 전에는 PNG/JPG 미리보기 Export를 함께 준비합니다.

${productionQaGuide("figma")}

${deliveryScopeGuide("figma")}

[이미지/합성 슬롯]
${imagePlan || "이미지 슬롯은 시안 생성 후 자동 정리됩니다."}

[이미지 제작 상태]
${imageStatus || "이미지 상태는 시안 생성 후 자동 정리됩니다."}

[섹션별 이미지 제작 지시]
${sectionImageBrief}

[이미지 AI 생성 프롬프트]
${visualPrompts || "이미지 AI 프롬프트는 시안 생성 후 자동 정리됩니다."}

[고객 컨펌 안내]
시안 미리보기 링크를 전달하고, 고객은 수정이 필요한 섹션과 문구를 회신합니다.
최종 확정 후 편집 원본 제공 범위 또는 Export 파일 기준으로 납품합니다.`;
}

function generateHandoffText() {
  const p = product();
  if (p.productionRoute === "figma") return figmaCollaborationBriefText();
  const dataset = categoryDataset(p.category);
  const choice = value("clientChoice");
  const selectedDraft = choice.startsWith("B") ? "B안" : "A안";
  const selectedKey = selectedDraft === "B안" ? "B" : "A";
  const template = selectedDraft === "B안" ? $("#templateB").textContent.trim() : $("#templateA").textContent.trim();
  const concepts = photoConcepts().map((item, index) => `${index + 1}. ${item}`).join("\n");
  const sections = sectionLayoutItems(template).map((item, index) => `${String(index + 1).padStart(2, "0")}. ${item}`).join("\n");
  const editSummary = sectionEditSummary(selectedKey);
  const designBrief = psdDesignBrief(selectedKey, template);
  const confirmSummary = productionConfirmSummary(selectedKey, template);
  const preflight = productionHandoffPreflight(selectedKey);
  const layerGuide = psdLayerGroupGuide(selectedKey);

  return `[고객 피드백 요약]
선택 방향: ${choice}
회신 내용: ${value("clientReply") || "아직 고객 회신 내용이 입력되지 않았습니다."}
담당자 메모: ${value("managerMemo") || "없음"}

[고객 컨펌된 수정 방향]
${$("#revisionResult")?.textContent || "수정 시안 컨펌 내용이 아직 없습니다."}

[최종 컨펌 기준]
${confirmSummary}

[제작 전달 전 체크]
${preflight}

[바이버 메시지 초안]
[PSD 작업 요청]

Project: ${p.productName}
Work type: New PSD design
Selected draft: ${selectedDraft} ${template}

${designBrief}

Please recreate the attached AI draft as closely as possible in PSD.
Keep the layout, colors, section order, and text structure.

Important:
1. Make all text editable
2. Organize PSD layers by section
3. Use provided product images
4. Avoid cheap shopping mall banner style
5. Avoid excessive decoration
6. Do not use medical or exaggerated health expressions
7. Keep ad poster sections dense and commercial, not like a wireframe
8. Keep photo/composite direction sections replaceable for final images
9. Keep purchase stack sections strong before the final CTA

PSD layer group rule:
${layerGuide}

Detail page section order:
${sections}

Section edit notes from internal tool:
${editSummary}

[Image direction]
Images in the AI draft are temporary placeholders.
Please replace them with provided product photos, edited cutout images, or composed lifestyle images.

Recommended photo/composite concepts:
${concepts}

[Category design notes]
${dataset.psdMemo.map((item, index) => `${index + 1}. ${item}`).join("\n")}

${productionQaGuide("psd")}

${deliveryScopeGuide("psd")}

[Caution]
${dataset.caution.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Deliver files:
1. PSD original file
2. Full page JPG preview
3. Full page PNG preview
4. Split JPG/PNG files only if requested

File naming:
${p.productName}_detail_full.psd
${p.productName}_detail_full.jpg
${p.productName}_detail_full.png

[첨부파일 체크리스트]
□ 선택 시안 이미지/PDF
□ 제품 이미지
□ 로고/스펙 자료
□ 섹션별 카피
□ 디자인 가이드
□ 참고 이미지

[내부 검수 기준]
□ AI 시안과 섹션 순서가 맞는지
□ 텍스트가 PSD에서 수정 가능한지
□ 이미지가 흐리거나 깨지지 않는지
□ 과장 광고/의약품 오인 표현이 없는지
□ 최종 PNG/JPG로 납품 가능한 해상도인지`;
}

async function generateHandoff() {
  const fallback = generateHandoffText();
  const route = productionRouteConfig();
  $("#handoffResult").textContent = fallback;
  try {
    const isDraftCollaborationRoute = value("productionRoute") === "figma";
    const aiText = await invokeAiRole("psdHandoff", isDraftCollaborationRoute ? "시안 협업 전달 패키지 생성" : "미얀마 디자이너 바이버 PSD 전달 패키지 생성", {
      product: product(),
      productionRoute: route,
      clientChoice: value("clientChoice"),
      clientReply: value("clientReply"),
      managerMemo: value("managerMemo"),
      selectedLayoutA: $("#templateA").textContent.trim(),
      selectedLayoutB: $("#templateB").textContent.trim(),
      instruction: isDraftCollaborationRoute
        ? "디자이너가 수정할 수 있는 시안 협업 패키지, 고객 컨펌 요청 기준, Export 체크리스트를 만든다."
        : "바이버로 보낼 짧은 영어 작업 요청, 한국어 내부 요약, 첨부 체크리스트를 만든다.",
    }, fallback);
    if (aiText) $("#handoffResult").textContent = aiText;
  } catch {
    $("#handoffResult").textContent = fallback;
  }
  updateWorkflowState();
}

function generateFinalMailText() {
  const p = product();
  const route = productionRouteConfig(p.productionRoute, p.customerType);
  return `제목: [${p.productName}] 상세페이지 최종 납품 확인드립니다

안녕하세요, 고객님.
컨펌해주신 방향을 기준으로 ${p.productName} 상세페이지 최종 파일을 정리하여 전달드립니다.

첨부 파일을 확인하신 후 아래 항목을 확인 부탁드립니다.

1. 최종 상세페이지 PNG/JPG
2. 요청 시 분할페이지 파일
3. 제품명, 구성, 문구 등 최종 정보
4. ${p.productionRoute === "figma" ? "편집 원본 또는 Export 파일 범위" : "PSD 원본 요청 여부"}

내부 검수 기준으로 디자인 시안 반영 여부, 문구 오탈자, 이미지 품질, 최종 Export 상태를 확인한 뒤 전달드립니다.

기본 납품은 최종 PNG/JPG 기준이며, 분할페이지는 요청 범위에 따라 함께 제공됩니다.
${p.productionRoute === "figma"
  ? "편집 원본 공유 및 Export 범위는 선택하신 제작 라인 기준에 따라 안내드립니다."
  : "상세페이지 원본 PSD 파일은 기본 납품 범위에 포함되지 않으며, 요청 시 별도 추가금 안내 후 제공 가능합니다."}

[제작 라인]
${route.customerLabel} / ${route.name}

${deliveryScopeGuide(p.productionRoute)}

감사합니다.`;
}

async function generateFinalMail() {
  const fallback = generateFinalMailText();
  $("#finalMail").textContent = fallback;
  try {
    const aiText = await invokeAiRole("finalMail", "최종 납품 메일 생성", {
      product: product(),
      productionRoute: productionRouteConfig(),
      instruction: "컨펌 완료 후 최종 납품 메일을 정중하고 간결하게 작성한다. 선택된 제작 라인이 시안 협업형이면 편집 원본/Export 납품 기준을, PSD이면 PNG/JPG 납품과 PSD 원본 추가금 안내를 포함한다.",
    }, fallback);
    if (aiText) $("#finalMail").textContent = aiText;
  } catch {
    $("#finalMail").textContent = fallback;
  }
  updateWorkflowState();
}
