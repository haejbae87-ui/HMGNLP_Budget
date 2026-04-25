// ─── 📊 결재/검토 진행단계 스텝퍼 ──────────────────────────────────────────
// 공용 컴포넌트: 계획/신청/결과 상세 뷰에서 사용
// renderApprovalStepper(status, type) → HTML string

function renderApprovalStepper(status, type) {
  // type = 'plan' | 'apply' | 'result'
  const typeLabel = { plan: "교육계획", apply: "교육신청", result: "교육결과" };

  // 단계 정의
  const steps = _getApprovalSteps(status, type);

  const stepsHtml = steps
    .map((step, idx) => {
      const isActive = step.state === "active";
      const isDone = step.state === "done";
      const isFailed = step.state === "failed";
      const isLast = idx === steps.length - 1;

      // 아이콘/색상
      let iconBg, iconBorder, iconContent, labelColor, lineColor;
      if (isDone) {
        iconBg = "#059669";
        iconBorder = "#059669";
        iconContent = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        labelColor = "#059669";
        lineColor = "#059669";
      } else if (isActive) {
        iconBg = "#EFF6FF";
        iconBorder = "#2563EB";
        iconContent = `<div style="width:8px;height:8px;background:#2563EB;border-radius:50%"></div>`;
        labelColor = "#2563EB";
        lineColor = "#E5E7EB";
      } else if (isFailed) {
        iconBg = "#FEE2E2";
        iconBorder = "#DC2626";
        iconContent = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 18L18 6M6 6l12 12" stroke="#DC2626" stroke-width="3" stroke-linecap="round"/></svg>`;
        labelColor = "#DC2626";
        lineColor = "#FECACA";
      } else {
        iconBg = "#F9FAFB";
        iconBorder = "#D1D5DB";
        iconContent = `<div style="width:6px;height:6px;background:#D1D5DB;border-radius:50%"></div>`;
        labelColor = "#9CA3AF";
        lineColor = "#E5E7EB";
      }

      return `
    <div style="display:flex;align-items:flex-start;flex:1;min-width:0">
      <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
        <div style="width:32px;height:32px;border-radius:50%;border:2.5px solid ${iconBorder};background:${iconBg};display:flex;align-items:center;justify-content:center;position:relative;z-index:1">
          ${iconContent}
        </div>
        <div style="margin-top:6px;text-align:center;max-width:80px">
          <div style="font-size:10px;font-weight:900;color:${labelColor};line-height:1.2">${step.label}</div>
          ${step.person ? `<div style="font-size:9px;color:#9CA3AF;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px">${step.person}</div>` : ""}
          ${step.date ? `<div style="font-size:9px;color:#B0B0B0;margin-top:1px">${step.date}</div>` : ""}
        </div>
      </div>
      ${
        !isLast
          ? `
      <div style="flex:1;height:2.5px;background:${isDone ? "#059669" : lineColor};margin-top:15px;min-width:20px;border-radius:2px"></div>
      `
          : ""
      }
    </div>`;
    })
    .join("");

  return `
  <div style="padding:20px 28px;border-top:1px solid #F3F4F6">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <span style="font-size:13px;font-weight:900;color:#374151">📊 ${typeLabel[type] || ""} 결재·검토 진행현황</span>
    </div>
    <div style="display:flex;align-items:flex-start;gap:0;padding:0 8px">
      ${stepsHtml}
    </div>
  </div>`;
}

function _getApprovalSteps(status, type) {
  // 상태 → 단계 매핑
  const normalizedStatus = _normalizeStepperStatus(status);

  // 기본 단계: 작성 → 상신 → 결재 → 검토 → 완료
  // type에 따라 마지막 단계 라벨 변경
  const finalLabel = type === "result" ? "정산완료" : "승인완료";

  switch (normalizedStatus) {
    case "draft":
      return [
        { label: "작성중", state: "active", person: "", date: "" },
        { label: "상신", state: "pending", person: "", date: "" },
        { label: "결재", state: "pending", person: "", date: "" },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
    case "saved":
      return [
        { label: "작성완료", state: "done", person: "", date: "" },
        { label: "상신대기", state: "active", person: "상신 전", date: "" },
        { label: "결재", state: "pending", person: "", date: "" },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
    case "pending":
      return [
        { label: "작성완료", state: "done", person: "", date: "" },
        { label: "상신완료", state: "done", person: "", date: "" },
        {
          label: "결재대기",
          state: "active",
          person: "결재자 확인중",
          date: "",
        },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
    case "approved":
      return [
        { label: "작성완료", state: "done", person: "", date: "" },
        { label: "상신완료", state: "done", person: "", date: "" },
        { label: "결재완료", state: "done", person: "승인됨", date: "" },
        { label: "검토완료", state: "done", person: "검토 완료", date: "" },
        { label: finalLabel, state: "done", person: "처리완료", date: "" },
      ];
    case "rejected":
      return [
        { label: "작성완료", state: "done", person: "", date: "" },
        { label: "상신완료", state: "done", person: "", date: "" },
        { label: "반려", state: "failed", person: "결재자 반려", date: "" },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
    case "cancelled":
      return [
        { label: "작성", state: "done", person: "", date: "" },
        { label: "취소됨", state: "failed", person: "요청 취소", date: "" },
        { label: "결재", state: "pending", person: "", date: "" },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
    default:
      return [
        { label: "작성", state: "pending", person: "", date: "" },
        { label: "상신", state: "pending", person: "", date: "" },
        { label: "결재", state: "pending", person: "", date: "" },
        { label: "검토", state: "pending", person: "", date: "" },
        { label: finalLabel, state: "pending", person: "", date: "" },
      ];
  }
}

function _normalizeStepperStatus(st) {
  const map = {
    draft: "draft",
    작성중: "draft",
    임시저장: "draft",
    saved: "saved",
    저장완료: "saved",
    pending: "pending",
    신청중: "pending",
    결재진행중: "pending",
    대기: "pending",
    pending_approval: "pending",
    approved: "approved",
    승인완료: "approved",
    완료: "approved",
    completed: "approved",
    rejected: "rejected",
    반려: "rejected",
    cancelled: "cancelled",
    취소: "cancelled",
  };
  return map[st] || "pending";
}
