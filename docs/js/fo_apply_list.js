// ─── fo_apply_list.js — 신청 목록/결과등록/스마트버튼 (REFACTOR-2: apply.js 분리) ───
// ─── APPLY (교육신청) — 목록 ↔ 신청폼 ↔ 결과폼 전환 허브 ────────────────────

// ─── DB 승인된 교육계획 캐시 (MOCK_PLANS 대체) ──────────────────────────────
let _dbApprovedPlans = [];
let _dbApprovedPlansLoaded = false;
let _dbApprPlanPersonaId = null; // 캐시 무효화용

async function _loadApprovedPlans() {
  const pid = currentPersona.id;
  if (_dbApprovedPlansLoaded && _dbApprPlanPersonaId === pid)
    return _dbApprovedPlans;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    _dbApprovedPlans = [];
    _dbApprovedPlansLoaded = true;
    return [];
  }
  try {
    // 크로스 테넌트: 총괄부서면 양쪽 회사 승인 계획 로드
    const ctInfo =
      typeof getCrossTenantInfo === "function"
        ? await getCrossTenantInfo(currentPersona)
        : null;
    const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
    let query = sb
      .from("plans")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (tids.length > 1) {
      // 총괄부서: 양쪽 회사의 승인 계획 (본인 + 상대사 동일 조직)
      query = query.in("tenant_id", tids);
    } else {
      query = query
        .eq("applicant_id", pid)
        .eq("tenant_id", currentPersona.tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    _dbApprovedPlans = (data || []).map((p) => ({
      id: p.id,
      title: p.edu_name || "-",
      account: p.account_code || "",
      budgetId: p.detail?.budgetId || "",
      amount: Number(p.amount || 0),
      used: 0,
      edu_type: p.edu_type,
      purpose: p.detail?.purpose,
      date: (p.created_at || "").slice(0, 10),
      detail: p.detail || {},
      tenantId: p.tenant_id, // 크로스 테넌트 뱃지용
      applicantName: p.applicant_name || "",
    }));
    _dbApprovedPlansLoaded = true;
    _dbApprPlanPersonaId = pid;
  } catch (err) {
    console.error("[_loadApprovedPlans]", err.message);
    _dbApprovedPlans = [];
    _dbApprovedPlansLoaded = true;
  }
  return _dbApprovedPlans;
}

let _resultState = null;
function _resetResultState() {
  return {
    step: 1,
    purpose: null,
    budgetId: "",
    useBudget: false,
    title: "",
    date: "",
    endDate: "",
    hours: "",
    provider: "",
    resultText: "",
    expenses: [{ item: "수강료", price: "", qty: 1 }],
    attachments: [],
  };
}

function renderApply() {
  // ★ Phase C: 교육계획에서 넘어온 경우 plan_id 자동 세팅
  const _planLink = sessionStorage.getItem("_applyFromPlan");
  if (_planLink) {
    try {
      const pl = JSON.parse(_planLink);
      sessionStorage.removeItem("_applyFromPlan");
      applyState = resetApplyState();
      applyState.planId = pl.plan_id;
      applyState.title = pl.title;
      applyState.eduName = pl.title;
      applyViewMode = "form";
      console.log("[Apply] Linked from plan:", pl.plan_id, pl.title);
    } catch(e) { sessionStorage.removeItem("_applyFromPlan"); }
  }
  if (typeof applyViewMode === "undefined") applyViewMode = "list";
  if (applyState && applyState.confirmMode) {
    _renderApplyConfirm();
  } else if (applyViewMode === "form") {
    _renderApplyForm();
    // resultForm 뷰모드는 result.js 독립 화면으로 이관됨
  } else {
    _renderApplyList();
  }
}

// ─── 정책 기반 스마트 버튼 ─────────────────────────────────────────────────
// 패턴 A·B·E → 교육 신청 버튼 / 패턴 C·D → 교육결과 등록 버튼
function _applySmartButtons() {
  // SERVICE_POLICIES에서 현재 페르소나의 정책 확인
  let hasApplyPatterns = false; // A, B, E
  let hasResultOnlyPatterns = false; // C, D

  if (typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0) {
    const policies = SERVICE_POLICIES.filter((p) => {
      if (p.status && p.status !== "active") return false;
      const pTenantId = p.tenant_id || p.tenantId;
      if (pTenantId && pTenantId !== currentPersona.tenantId) return false;
      return true;
    });
    policies.forEach((p) => {
      const pattern = p.process_pattern || p.processPattern || "";
      if (["A", "B", "E"].includes(pattern)) hasApplyPatterns = true;
      if (["C", "D"].includes(pattern)) hasResultOnlyPatterns = true;
      // flow 기반 fallback
      if (!pattern) {
        if (["plan-apply-result", "apply-result"].includes(p.flow))
          hasApplyPatterns = true;
        if (p.flow === "result-only") hasResultOnlyPatterns = true;
      }
    });
  }

  // 정책이 전혀 없으면 기본: 신청 버튼만 표시 (결과등록은 C/D 정책 있을 때만)
  if (!hasApplyPatterns && !hasResultOnlyPatterns) {
    hasApplyPatterns = true;
  }

  let btns = "";
  if (hasApplyPatterns) {
    btns += `<button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(0,44,95,.3);transition:all .15s"
      onmouseover="this.style.background='#0050A8'" onmouseout="this.style.background='#002C5F'">
      ✏️ 교육 신청
    </button>`;
  }
  if (hasResultOnlyPatterns) {
    btns += `<button onclick="navigate('result')"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#D97706;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(217,119,6,.3);transition:all .15s"
      onmouseover="this.style.background='#B45309'" onmouseout="this.style.background='#D97706'">
      📝 교육결과 등록
    </button>`;
  }
  return btns;
}

// ─── 결과 전용 위저드 (패턴 C·D) ─────────────────────────────────────────────
function _renderResultForm() {
  const s = _resultState || _resetResultState();
  _resultState = s;

  const stepLabels = ["교육 정보", "비용 정보", "결과 작성"];
  const stepper = stepLabels
    .map((label, i) => {
      const n = i + 1;
      return `<div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
      <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "✓" : n}</div>
      <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${label}</span>
      ${n < 3 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
    </div>`;
    })
    .join("");

  let body = "";

  // Step 1: 교육 정보
  if (s.step === 1) {
    // BO form_templates 다이나믹 렌더링 시도
    const dyHtml =
      s.formTemplate &&
      s.formTemplate.fields &&
      s.formTemplate.fields.length > 0 &&
      typeof renderDynamicFormFields === "function"
        ? renderDynamicFormFields(s.formTemplate.fields, s, "_resultState")
        : "";

    if (dyHtml) {
      const tplBadge = s.formTemplate.name
        ? `<div style="margin-bottom:14px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>`
        : "";
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>${tplBadge}${dyHtml}`;
    } else if (s.formTemplateLoading) {
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>
        <div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
    } else {
      body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육과정명 *</label>
        <input id="rf-title" value="${s.title}" onchange="_resultState.title=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px"
          placeholder="예: AWS 솔루션스 아키텍트 자격증 과정">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 시작일 *</label>
          <input id="rf-date" type="date" value="${s.date}" onchange="_resultState.date=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 종료일 *</label>
          <input id="rf-enddate" type="date" value="${s.endDate}" onchange="_resultState.endDate=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">학습 시간(H)</label>
          <input id="rf-hours" type="number" value="${s.hours}" onchange="_resultState.hours=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="8">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육기관</label>
          <input id="rf-provider" value="${s.provider}" onchange="_resultState.provider=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="교육기관명">
        </div>
      </div>
    </div>`;
    }
  }

  // Step 2: 비용 정보 (후정산 여부 선택)
  if (s.step === 2) {
    const expRows = s.expenses
      .map(
        (e, i) => `
    <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;align-items:center">
      <input value="${e.item}" onchange="_resultState.expenses[${i}].item=this.value" placeholder="항목명"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.price}" onchange="_resultState.expenses[${i}].price=this.value" placeholder="단가"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.qty}" onchange="_resultState.expenses[${i}].qty=this.value" min="1"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <span style="font-size:12px;font-weight:700;color:#374151">${((Number(e.price) || 0) * (Number(e.qty) || 1)).toLocaleString()}원</span>
      <button onclick="_resultState.expenses.splice(${i},1);renderApply()" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626"
        title="삭제">✕</button>
    </div>`,
      )
      .join("");
    const total = s.expenses.reduce(
      (sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1),
      0,
    );

    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">02. 비용 정보</h2>
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:10px">
        <button onclick="_resultState.useBudget=true;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === true ? "#D97706" : "#E5E7EB"};
                 background:${s.useBudget === true ? "#FFFBEB" : "white"};color:${s.useBudget === true ? "#D97706" : "#6B7280"}">
          🧾 후정산 (예산 사용)
        </button>
        <button onclick="_resultState.useBudget=false;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === false ? "#059669" : "#E5E7EB"};
                 background:${s.useBudget === false ? "#F0FDF4" : "white"};color:${s.useBudget === false ? "#059669" : "#6B7280"}">
          📋 이력만 등록 (예산 미사용)
        </button>
      </div>
    </div>
    ${
      s.useBudget
        ? `
    <div style="margin-bottom:12px">
      <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:6px;display:block">예산 계정 선택</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${currentPersona.budgets
          .map(
            (b) => `
        <button onclick="_resultState.budgetId='${b.id}';renderApply()"
          style="padding:8px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;
                 border:2px solid ${s.budgetId === b.id ? "#D97706" : "#E5E7EB"};
                 background:${s.budgetId === b.id ? "#FFFBEB" : "white"};color:${s.budgetId === b.id ? "#D97706" : "#6B7280"}">${b.account}</button>`,
          )
          .join("")}
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">항목</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">단가</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">수량</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">소계</span>
        <span></span>
      </div>
      ${expRows}
      <button onclick="_resultState.expenses.push({item:'',price:'',qty:1});renderApply()"
        style="margin-top:8px;font-size:11px;font-weight:800;color:#D97706;background:none;border:1.5px dashed #FDE68A;
               padding:8px 14px;border-radius:8px;cursor:pointer;width:100%">+ 비용 항목 추가</button>
    </div>
    <div style="text-align:right;font-size:14px;font-weight:900;color:#D97706;padding:8px 0">
      정산 합계: ${total.toLocaleString()}원
    </div>`
        : `
    <div style="padding:24px;text-align:center;background:#F0FDF4;border-radius:12px;border:1.5px dashed #BBF7D0;margin-top:12px">
      <div style="font-size:13px;font-weight:800;color:#059669">✅ 예산 미사용 — 교육이력만 등록됩니다</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">비용 정산 없이 학습 이력만 기록합니다.</div>
    </div>`
    }`;
  }

  // Step 3: 결과 작성
  if (s.step === 3) {
    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">03. 교육 결과 작성</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육결과 요약 *</label>
        <textarea id="rf-result" rows="5" onchange="_resultState.resultText=this.value"
          style="width:100%;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical"
          placeholder="교육 수료 후 학습한 내용, 업무 적용 계획 등을 작성해 주세요.">${s.resultText}</textarea>
      </div>
      <div style="padding:20px;background:#F9FAFB;border-radius:12px;border:1.5px dashed #D1D5DB">
        <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">📎 첨부파일 (수료증, 영수증 등)</div>
        <div style="font-size:11px;color:#9CA3AF">파일 업로드 기능은 추후 제공 예정입니다.</div>
      </div>

      <!-- 요약 카드 -->
      <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1.5px solid #BFDBFE">
        <div style="font-size:12px;font-weight:900;color:#1D4ED8;margin-bottom:8px">📋 등록 요약</div>
        <div style="font-size:12px;color:#374151;display:grid;gap:4px">
          <div>📚 ${s.title || "-"}</div>
          <div>📅 ${s.date || "-"} ~ ${s.endDate || "-"}</div>
          <div>⏱ ${s.hours || "-"}시간 · 🏢 ${s.provider || "-"}</div>
          <div>${s.useBudget ? "🧾 후정산 · " + s.expenses.reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0).toLocaleString() + "원" : "📋 이력만 등록 (예산 미사용)"}</div>
        </div>
      </div>
    </div>`;
  }

  // 네비게이션
  const canNext1 = s.title && s.date && s.endDate;
  const canNext2 = s.useBudget !== null && (!s.useBudget || s.budgetId);

  document.getElementById("page-apply").innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#D97706'" onmouseout="this.style.color='#6B7280'">
        ← 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과 등록</div>
      <h1 class="text-3xl font-black tracking-tight" style="color:#D97706">교육결과 등록</h1>
      <p style="font-size:11px;color:#9CA3AF;margin-top:2px">이미 수료한 교육의 결과를 등록합니다. 후정산 또는 이력만 기록할 수 있습니다.</p>
    </div>
  </div>

  <!-- Stepper -->
  <div class="card p-6">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <!-- Body -->
  <div class="card p-6">${body}</div>

  <!-- Nav -->
  <div style="display:flex;justify-content:space-between">
    ${
      s.step > 1
        ? `<button onclick="_resultState.step--;renderApply()"
      style="padding:10px 20px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;cursor:pointer;color:#374151">← 이전</button>`
        : "<div></div>"
    }
    ${
      s.step < 3
        ? `<button onclick="_resultState.step++;renderApply()"
      ${(s.step === 1 && !canNext1) || (s.step === 2 && !canNext2) ? "disabled" : ""}
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:${(s.step === 1 && canNext1) || (s.step === 2 && canNext2) ? "#D97706" : "#D1D5DB"};color:white;
             transition:all .15s">다음→</button>`
        : `
    <button onclick="alert('교육결과가 등록되었습니다.');applyViewMode='list';renderApply()"
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:#059669;color:white;transition:all .15s">
      ✅ 결과 등록 완료
    </button>`
    }
  </div>
</div>`;
}

// ─── 교육신청 목록 뷰 ──────────────────────────────────────────────────────────
// 신청 목록 탭 상태
let _applyListTab = "mine"; // 'mine' | 'team'
let _applyYear = new Date().getFullYear(); // 연도 필터

// ─── 결과 등록 제출 (패턴 C/D) → DB 저장 ───────────────────────────────────
async function submitResult() {
  const rs = _resultState || {};
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const appId = `RES-${Date.now()}`;
      const row = {
        id: appId,
        tenant_id: currentPersona.tenantId,
        plan_id: null,
        account_code: rs.accountCode || "",
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || "",
        edu_name: rs.eduName || "교육결과",
        edu_type: rs.eduType || null,
        amount: Number(rs.amount || 0),
        status: "completed",
        policy_id: rs.policyId || null,
        detail: {
          purpose: rs.purpose || null,
          resultType: "direct",
          completionDate: rs.completionDate || null,
          score: rs.score || null,
          notes: rs.notes || null,
        },
      };
      const { error } = await sb.from("applications").insert(row);
      if (error) throw error;
      console.log(`[submitResult] DB 저장 성공: ${appId}`);
    } catch (err) {
      console.error("[submitResult] DB 저장 실패:", err.message);
    }
  }
  alert(
    "✅ 교육결과가 성공적으로 등록되었습니다.\n\n관리자 확인 후 이력에 반영됩니다.",
  );
  _resultState = _resetResultState();
  applyViewMode = "list";
  renderApply();
}

let _dbMyApps = [];
let _appsDbLoaded = false;

function _renderApplyList() {
  const STATUS_CFG = {
    승인완료: {
      color: "#059669",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      icon: "✅",
    },
    반려: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "❌" },
    결재진행중: {
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      icon: "⏳",
    },
    승인대기: {
      color: "#6B7280",
      bg: "#F9FAFB",
      border: "#E5E7EB",
      icon: "🕐",
    },
    작성중: { color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE", icon: "📝" },
    취소: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "🚫" },
  };

  const teamViewEnabled =
    currentPersona.teamViewEnabled ?? currentPersona.team_view_enabled ?? false;

  // DB 실시간 조회
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_appsDbLoaded) {
    _appsDbLoaded = true;
    sb.from("applications")
      .select("*")
      .eq("applicant_id", currentPersona.id)
      .eq("tenant_id", currentPersona.tenantId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          _dbMyApps = data.map((d) => ({
            id: d.id,
            title: d.edu_name,
            type: d.edu_type || '교육',
            date: d.created_at?.slice(0, 10) || '',
            endDate: d.created_at?.slice(0, 10) || '',
            hours: 0,
            amount: Number(d.amount || 0),
            budget: d.account_code || '',
            applyStatus: _mapAppDbStatus(d.status),
            resultDone: d.status === 'completed',
            author: d.applicant_name,
            rawStatus: d.status,  // UI-2: 원본 DB 상태 보존
          }));

        }
        _renderApplyList();
      });
    return;
  }
  const myHistory = _dbMyApps;
  // 팀 신청: DB에서 같은 테넌트 내 다른 사용자 신청 조회
  let teamHistory = [];
  if (teamViewEnabled && _applyListTab === "team") {
    if (!_teamAppsLoaded) {
      _teamAppsLoaded = true;
      if (sb && currentPersona.tenantId) {
        (async () => {
          const ctInfo =
            typeof getCrossTenantInfo === "function"
              ? await getCrossTenantInfo(currentPersona)
              : null;
          const myOrgIds = [currentPersona.orgId];
          if (ctInfo?.linkedOrgIds)
            ctInfo.linkedOrgIds.forEach((id) => {
              if (!myOrgIds.includes(id)) myOrgIds.push(id);
            });
          let query = sb
            .from("applications")
            .select("*")
            .neq("applicant_id", currentPersona.id)
            .neq("status", "draft")
            .order("created_at", { ascending: false });
          // 조직 필터
          if (myOrgIds.length > 1)
            query = query.in("applicant_org_id", myOrgIds);
          else query = query.eq("applicant_org_id", currentPersona.orgId);
          const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
          if (tids.length > 1) query = query.in("tenant_id", tids);
          else query = query.eq("tenant_id", currentPersona.tenantId);
          const { data } = await query;
          _dbTeamApps = (data || []).map((d) => ({
            id: d.id,
            title: d.edu_name,
            type: d.edu_type || "교육",
            date: d.created_at?.slice(0, 10) || "",
            endDate: "",
            hours: 0,
            amount: Number(d.amount || 0),
            budget: d.account_code || "",
            applyStatus: _mapAppDbStatus(d.status),
            resultDone: d.status === "completed",
            author: d.applicant_name || "-",
          }));
          _renderApplyList();
        })();
      }
      return;
    }
    teamHistory = _dbTeamApps;
  }
  const history = _applyListTab === "mine" ? myHistory : teamHistory;

  // 통계
  const statCounts = {
    total: history.length,
    approved: history.filter((h) => h.applyStatus === "승인완료").length,
    inProgress: history.filter((h) => h.applyStatus === "결재진행중").length,
    rejected: history.filter((h) => h.applyStatus === "반려").length,
    pending: history.filter((h) => h.applyStatus === "승인대기").length,
  };

  // Segmented tab
  const tabBar = teamViewEnabled
    ? `
  <div style="display:flex;gap:4px;background:#F3F4F6;padding:4px;border-radius:14px;margin-bottom:20px;width:fit-content">
    <button onclick="_applyListTab='mine';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === "mine" ? "#fff" : "transparent"};
      color:${_applyListTab === "mine" ? "#002C5F" : "#6B7280"};
      box-shadow:${_applyListTab === "mine" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      👤 내 신청
    </button>
    <button onclick="_applyListTab='team';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === "team" ? "#fff" : "transparent"};
      color:${_applyListTab === "team" ? "#002C5F" : "#6B7280"};
      box-shadow:${_applyListTab === "team" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      👥 팀 신청
    </button>
  </div>`
    : "";

  // 통계 카드
  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${[
      {
        label: "승인완료",
        val: statCounts.approved,
        color: "#059669",
        bg: "#F0FDF4",
        icon: "✅",
      },
      {
        label: "진행중",
        val: statCounts.inProgress,
        color: "#D97706",
        bg: "#FFFBEB",
        icon: "⏳",
      },
      {
        label: "반려",
        val: statCounts.rejected,
        color: "#DC2626",
        bg: "#FEF2F2",
        icon: "❌",
      },
      {
        label: "승인대기",
        val: statCounts.pending,
        color: "#6B7280",
        bg: "#F9FAFB",
        icon: "🕐",
      },
    ]
      .map(
        (s) => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`,
      )
      .join("")}
  </div>`;

  // 목록 행
  const rows = history
    .map((h) => {
      const cfg = STATUS_CFG[h.applyStatus] || STATUS_CFG["승인대기"];
      const canResult = h.applyStatus === "승인완료";
      const authorBadge = h.author
        ? `<span style="font-size:10px;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:10px;margin-left:6px">👤 ${h.author}</span>`
        : "";
      return `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s">
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:900;color:#111827">${h.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${h.applyStatus}</span>
          ${h.resultDone ? '<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">📋 결과작성완료</span>' : ""}
          ${authorBadge}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          <span>📅 ${h.date} ~ ${h.endDate}</span>
          <span>📚 ${h.type}</span>
          <span>💰 ${h.budget} · ${(h.amount || 0).toLocaleString()}원</span>
          <span>⏱ ${h.hours}H</span>
        </div>
        ${(() => {
          if (h.rawStatus !== 'saved') return '';
          const _sid = String(h.id || '').replace(/["'<>&]/g, '');
          const _stitle = String(h.title || '').replace(/["'<>&]/g, '');
          return `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#ECFDF5;border:1px solid #6EE7B7;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:800;color:#065F46">📤 저장완료 — 결재함에서 상신 가능</span><button onclick="event.stopPropagation();_appSingleSubmit('${_sid}','${_stitle}')" style="padding:5px 14px;border-radius:8px;background:#059669;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer;white-space:nowrap">📤 상신하기</button></div>`;
        })()}

      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${
          h.applyStatus === '반려'
            ? `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
                ⚠️ 반려 사유: ${h.rejectReason || '예산 잔액 부족으로 반려되었습니다. 예산 계획 수립 후 재신청 바랍니다.'}
               </div>`
            : ''
        }
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${
          h.rawStatus === 'draft' || h.applyStatus === '작성중'
            ? `<button onclick="resumeApplyDraft('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:#0369A1;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">✏️ 이어쓰기</button>
               <button onclick="deleteApplyDraft('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">🗑 삭제</button>`
            : ''
        }
        ${
          (h.rawStatus === 'pending' || h.rawStatus === 'submitted' || h.applyStatus === '승인대기' || h.applyStatus === '결재진행중') && h.rawStatus !== 'saved'
            ? `<button onclick="cancelApply('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">취소 요청</button>`
            : ''
        }
        ${
          h.applyStatus === '승인완료' && !h.resultDone
            ? `<button onclick="_openResultForm('${h.id.replace(/'/g, "\\\"'\\\"")}',${'\'' + (h.title||'').replace(/'/g,'') + '\''},${h.amount||0})"
               style="padding:8px 14px;border-radius:8px;background:#002C5F;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">📝 결과 작성</button>`
            : ''
        }
        ${
          h.applyStatus === '승인완료' && h.resultDone
            ? `<button style="padding:8px 14px;border-radius:8px;background:#F3F4F6;color:#9CA3AF;font-size:11px;font-weight:800;border:none;cursor:default;white-space:nowrap">✅ 결과 제출 완료</button>`
            : ''
        }
      </div>
    </div>`;
    })
    .join('');

  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">${_applyYear}년 교육신청 이력이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
      교육 신청을 하면 결재 진행 상황과 결과를 이 화면에서 확인할 수 있습니다.<br>
      위의 "교육 신청" 버튼으로 첫 신청을 시작해보세요.
    </div>
    <button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
      ✏️ 교육 신청하기
    </button>
  </div>`;

  // 연도 선택
  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_applyYear=Number(this.value);_renderApplyList()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map((y) => `<option value="${y}" ${_applyYear === y ? "selected" : ""}>${y}년</option>`).join("")}
  </select>`;

  document.getElementById("page-apply").innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육 신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육신청 현황</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      ${_applySmartButtons()}
    </div>
  </div>
  ${tabBar}
  ${statsBar}
  <div class="card p-6">
    ${history.length === 0 ? emptyMsg : `<div style="display:flex;flex-direction:column;gap:10px">${rows}</div>`}
  </div>
</div>`;
}

// 팀 신청 DB 캐시
let _dbTeamApps = [];
let _teamAppsLoaded = false;

// ─── 스텝 선택 내용 배너 (교육계획 위저드와 동일한 스타일) ────────────────────
function _applySelectionBanner(s, currentStep) {
  if (currentStep <= 1) return ""; // Step 1은 배너 불필요

  const items = [];

  // ① 목적 (Step 2+)
  if (s.purpose) {
    const purposeLabel = s.purpose.label || s.purpose.id || "";
    items.push({
      num: "①",
      key: "목적",
      value: purposeLabel,
      color: "#002C5F",
    });
  }

  // ② 예산 (Step 3+)
  if (currentStep >= 3) {
    let budgetLabel = "";
    if (s.purpose?.id === "external_personal") {
      // 개인직무 사외학습: budgetChoice 레이블
      const bcMap = {
        general: "일반교육예산 참가계정",
        rnd: "R&D교육예산 계정",
        "hae-edu": "전사교육예산",
        "hae-team": "팀/프로젝트 할당예산",
        none: "예산 미사용",
      };
      budgetLabel = s.budgetChoice
        ? bcMap[s.budgetChoice] || s.budgetChoice
        : "";
    } else {
      // 교육담당자: 선택한 예산 계정명
      const availBudgets = s.purpose
        ? getPersonaBudgets(currentPersona, s.purpose.id)
        : [];
      const chosen = availBudgets.find((b) => b.id === s.budgetId);
      budgetLabel = chosen ? chosen.name : s.budgetId || "";
    }
    if (budgetLabel) {
      items.push({
        num: "②",
        key: "예산",
        value: budgetLabel,
        color: "#0369A1",
      });
    }
  }

  if (items.length === 0) return "";

  const itemsHtml = items
    .map(
      (it) => `
    <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#374151">
      <span style="font-size:10px;color:#6B7280;font-weight:700">${it.num} ${it.key}</span>
      <span style="font-weight:900;padding:2px 8px;border-radius:6px;background:${it.color}14;color:${it.color};max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.value}</span>
    </span>`,
    )
    .join('<span style="color:#D1D5DB;margin:0 2px">|</span>');

  return `
    <div style="background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span style="font-size:10px;font-weight:900;color:#0369A1;white-space:nowrap">📌 선택 내용</span>
    <span style="color:#BAE6FD;font-size:12px">|</span>
    ${itemsHtml}
  </div > `;
}

// ─── 교육신청 폼 뷰 (기존 renderApply 로직) ──────────────────────────────────