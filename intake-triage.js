(() => {
  const THRESHOLD = 60;
  const RETENTION_DAYS = 30;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const PLACEHOLDER_VALUES = new Set(["", "미기입", "자료없음", "확인 필요", "해당없음", "선택 안 함", "없음"]);

  function meaningful(value) {
    if (Array.isArray(value)) return value.some(meaningful);
    if (value && typeof value === "object") return Object.values(value).some(meaningful);
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    return text.length >= 2 && !PLACEHOLDER_VALUES.has(text);
  }

  function first(project, keys) {
    return keys.map((key) => project?.[key]).find(meaningful) ?? "";
  }

  function assetValue(project) {
    if (Number(project?.intakeFileCount || 0) > 0) return "첨부 있음";
    const direct = [project?.files, project?.cloudFiles, project?.productImages, project?.referenceFiles, project?.imageAssets];
    if (direct.some(meaningful)) return "첨부 있음";
    const counts = project?.assetFolderCounts || {};
    return Object.values(counts).some((count) => Number(count) > 0) ? "첨부 있음" : "";
  }

  function checklist(project = {}) {
    return [
      ["고객사", first(project, ["companyName", "clientName", "brandName"])],
      ["제품명", first(project, ["productName", "projectName"])],
      ["카테고리", first(project, ["category"])],
      ["연락처", first(project, ["contactInfo", "phone", "email"])],
      ["판매 채널", first(project, ["channel", "salesChannel"])],
      ["타깃 고객", first(project, ["targetCustomer", "target"])],
      ["한 줄 설명", first(project, ["heroSentence", "oneLine"])],
      ["핵심 장점", first(project, ["coreStrength", "features", "emphasis"])],
      ["요청사항", first(project, ["clientRequests", "additionalNotes", "mustInclude"])],
      ["디자인 방향", first(project, ["styleTone", "imageMemo", "mood"])],
      ["참고자료", first(project, ["referenceUrls", "references"])],
      ["첨부파일", assetValue(project)],
    ].map(([label, value]) => ({ label, complete: meaningful(value) }));
  }

  function assess(project = {}) {
    const items = checklist(project);
    const completed = items.filter((item) => item.complete).length;
    const score = Math.round((completed / items.length) * 100);
    const missing = items.filter((item) => !item.complete).map((item) => item.label);
    return { score, completed, total: items.length, missing, eligible: score >= THRESHOLD };
  }

  function validDate(value) {
    const time = Date.parse(String(value || ""));
    return Number.isFinite(time) ? time : 0;
  }

  function apply(project = {}, now = Date.now()) {
    const result = assess(project);
    const previous = project?.workflow?.intake || {};
    const baseTime = validDate(previous.receivedAt || project.receivedAt || project.createdAt) || now;
    const expiresAt = previous.expiresAt || new Date(baseTime + RETENTION_DAYS * DAY_MS).toISOString();
    const status = result.eligible ? "promoted" : "needs-more-info";
    const message = result.eligible
      ? `작성률 ${result.score}%로 관리자 프로젝트에 자동 등록되었습니다.`
      : `작성률 ${result.score}%입니다. ${result.missing.join(", ")} 항목을 추가해 주세요.`;
    return {
      ...project,
      workflow: {
        ...(project.workflow || {}),
        intake: {
          ...previous,
          threshold: THRESHOLD,
          score: result.score,
          completed: result.completed,
          total: result.total,
          missing: result.missing,
          status,
          receivedAt: previous.receivedAt || project.receivedAt || new Date(now).toISOString(),
          expiresAt,
          retentionDays: RETENTION_DAYS,
          message,
          notification: result.eligible
            ? { channel: "app", status: "not-required", message }
            : { channel: "app", smsStatus: "provider-not-connected", status: "queued", message },
        },
      },
    };
  }

  function intake(project = {}) { return apply(project).workflow.intake; }
  function isPromoted(project = {}) { return intake(project).status === "promoted"; }
  function isExpired(project = {}, now = Date.now()) {
    const current = intake(project);
    return current.status !== "promoted" && validDate(current.expiresAt) > 0 && validDate(current.expiresAt) <= now;
  }

  window.haoIntakeTriage = Object.freeze({ THRESHOLD, RETENTION_DAYS, assess, apply, intake, isPromoted, isExpired });
})();
