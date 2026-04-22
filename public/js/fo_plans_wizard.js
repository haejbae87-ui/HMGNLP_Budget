// ─── fo_plans_wizard.js — 계획 수립 마법사 Step 렌더 (REFACTOR-2: plans.js 분리) ───
// ─── PLAN WIZARD ─────────────────────────────────────────────────────────────

function startPlanWizard(mode = 'ongoing', forcedYear = null) {
  planState = resetPlanState();
  const curYear = new Date().getFullYear();
  
  if (mode === 'forecast') {
    planState.plan_type = 'forecast';
    planState.fiscal_year = forcedYear || _planYear;
    _planYear = planState.fiscal_year; // update global filter
  } else {
    // 자동 태그: 연도 기반 plan_type 결정 (하위호환)
    planState.fiscal_year = forcedYear || _planYear;
    planState.plan_type = planState.fiscal_year > curYear ? "forecast" : "ongoing";
  }
  // 수요예측 마감 체크 (비동기) — 제도그룹 기반으로 전환
  if (planState.plan_type === "forecast") {
    // currentPersona의 제도그룹 ID 추출 (vorgId는 domain code, domainId는 UUID)
    const vorgTplId = currentPersona.domainId || currentPersona.vorgTemplateId || null;
    _checkForecastDeadline(currentPersona.tenantId || "HMC", _planYear, vorgTplId).then(
      (dl) => {
        if (dl && (dl.is_closed || dl.status === "closed" || dl.status === "expired")) {
          const goOngoing = confirm(
            `⚠ ${_planYear}년도 수요예측 접수가 마감되었습니다.\n\n${curYear}년을 선택하여 상시 교육계획으로 수립하시겠습니까?\n\n[확인] ${curYear}년 상시 계획으로 전환\n[취소] 마감된 ${_planYear}년 수요예측으로 계속`,
          );
          if (goOngoing) {
            _planYear = curYear;
            planState.fiscal_year = curYear;
            planState.plan_type = "ongoing";
          }
        } else if (!dl) {
          // 기간 미설정 안내 → 상시 계획으로 자동 전환
          alert(`ℹ ${_planYear}년도 수요예측 접수 기간이 아직 설정되지 않았습니다.\n상시 교육계획으로 전환됩니다.`);
          _planYear = curYear;
          planState.fiscal_year = curYear;
          planState.plan_type = "ongoing";
        } else if (dl.status === "not_started") {
          const d = dl.recruit_start
            ? Math.ceil((new Date(dl.recruit_start) - new Date()) / 86400000)
            : null;
          alert(`⏳ ${_planYear}년도 수요예측 접수 기간이 아직 시작되지 않았습니다.${d !== null ? ` (D-${d})` : ""}\n상시 교육계획으로 전환됩니다.`);
          _planYear = curYear;
          planState.fiscal_year = curYear;
          planState.plan_type = "ongoing";
        }
        // status === 'open': 정상 수요예측 수립 가능
      },
    );
  }
  _viewingPlanDetail = null;
  renderPlans(); // planState가 있으면 위저드 뷰 렌더
}

// ─── 계획 상세 보기 ──────────────────────────────────────────────
let _viewingPlanDetail = null;

function viewPlanDetail(planId) {
  // DB plans 또는 mock에서 해당 계획 찾기
  const allPlans = typeof _plansDbCache !== "undefined" ? _plansDbCache : [];
  const mockPlans =
    typeof currentPersona !== "undefined" && currentPersona.plans
      ? currentPersona.plans
      : [];
  const plan =
    allPlans.find((p) => p.id === planId) ||
    mockPlans.find((p) => p.id === planId);
  if (!plan) {
    alert("계획을 찾을 수 없습니다.");
    return;
  }
  _viewingPlanDetail = plan;
  renderPlans();
}

function _renderPlanDetailView(plan) {
  const STATUS_LABEL = {
    draft: "작성중",
    pending: "신청중",
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    승인완료: "승인완료",
    진행중: "진행중",
    반려: "반려",
    결재진행중: "결재진행중",
    신청중: "신청중",
    작성중: "작성중",
    취소: "취소",
  };
  const STATUS_COLOR = {
    draft: "#0369A1",
    pending: "#D97706",
    approved: "#059669",
    rejected: "#DC2626",
    cancelled: "#9CA3AF",
    승인완료: "#059669",
    진행중: "#059669",
    반려: "#DC2626",
    결재진행중: "#D97706",
    신청중: "#D97706",
    작성중: "#0369A1",
    취소: "#9CA3AF",
  };
  const st = plan.status || "pending";
  const stLabel = STATUS_LABEL[st] || st;
  const stColor = STATUS_COLOR[st] || "#6B7280";
  const d = plan.detail || {};
  const amount = Number(plan.amount || plan.planAmount || 0);
  const safeId = String(plan.id || "").replace(/'/g, "\\'");
  const isPending = st === "pending" || st === "신청중" || st === "결재진행중";
  const isDraft = st === "draft" || st === "작성중";
  const isApproved = st === "approved" || st === "승인완료";
  // 만료 검증
  const endDate = d.endDate || plan.end_date || null;
  const isExpired = endDate && new Date(endDate) < new Date();
  // 연결된 신청 조회
  const linkedApps = (
    typeof MOCK_HISTORY !== "undefined" ? MOCK_HISTORY : []
  ).filter((h) => h.planId === plan.id);
  const canApply = isApproved && !isExpired;

  return `
  <div class="max-w-4xl mx-auto">
    <div style="margin-bottom:16px">
      <button onclick="_viewingPlanDetail=null;renderPlans()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 목록으로
      </button>
    </div>
    <div style="border-radius:16px;overflow:hidden;border:1.5px solid #E5E7EB;background:white;box-shadow:0 4px 20px rgba(0,0,0,.06)">
      <!-- 헤더 -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stColor}40;color:white">${stLabel}</span>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${plan.title || plan.edu_name || "-"}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">${plan.applicant_name || currentPersona.name} · ${plan.dept || currentPersona.dept}</p>
      </div>
      <!-- 상세 정보 -->
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:120px">계획명</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${plan.title || plan.edu_name || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육목적</td>
            <td style="padding:12px 0;color:#374151">${_foPurposeLabel(d.purpose || plan.purpose)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육유형</td>
            <td style="padding:12px 0;color:#374151">${_foEduTypeLabel(plan.edu_type || d.eduType)} ${d.eduSubType ? "› " + _foEduTypeLabel(d.eduSubType) : ""}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">예산계정</td>
            <td style="padding:12px 0;color:#374151">${plan.account_code || plan.account || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">계획액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${amount.toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">기간</td>
            <td style="padding:12px 0;color:#374151">${d.startDate || "-"} ~ ${d.endDate || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상신자</td>
            <td style="padding:12px 0;color:#374151">${plan.applicant_name || plan.submitter || currentPersona.name || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상태</td>
            <td style="padding:12px 0">
              <span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:${stColor}15;color:${stColor}">${stLabel}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;font-weight:800;color:#6B7280;vertical-align:top">상세 내용</td>
            <td style="padding:12px 0;color:#374151;white-space:pre-wrap">${d.content || plan.content || "-"}</td>
          </tr>
        </table>
      </div>
      <!-- 결재/검토 진행현황 -->
      ${typeof renderApprovalStepper === "function" ? renderApprovalStepper(st, "plan") : ""}
      <!-- 연결된 교육신청 -->
      <div style="padding:16px 28px;border-top:1px solid #F3F4F6">
        <div style="font-size:12px;font-weight:800;color:#6B7280;margin-bottom:10px">🔗 연결된 교육신청</div>
        ${
          linkedApps.length > 0
            ? linkedApps
                .map(
                  (app) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px;margin-bottom:6px">
            <span style="font-size:14px">📝</span>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:800;color:#111827">${app.title || app.id}</div>
              <div style="font-size:11px;color:#6B7280">${app.date || "-"} · ${(app.amount || 0).toLocaleString()}원</div>
            </div>
            <span style="font-size:10px;font-weight:900;padding:3px 8px;border-radius:5px;background:${app.status === "완료" ? "#D1FAE5" : app.status === "진행중" ? "#DBEAFE" : "#FEF3C7"};color:${app.status === "완료" ? "#065F46" : app.status === "진행중" ? "#1D4ED8" : "#92400E"}">${app.status || "신청중"}</span>
          </div>
        `,
                )
                .join("")
            : `
          <div style="padding:12px 14px;background:#F9FAFB;border-radius:10px;font-size:12px;color:#9CA3AF;text-align:center">
            아직 연결된 교육신청이 없습니다.
          </div>
        `
        }
      </div>
      <!-- 액션 -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="_viewingPlanDetail=null;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 목록으로</button>
        ${isDraft ? `<button onclick="_viewingPlanDetail=null;resumePlanDraft('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#0369A1;color:white;cursor:pointer">✏️ 이어쓰기</button>` : ""}
        ${isPending ? `<button onclick="_viewingPlanDetail=null;cancelPlan('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:white;color:#DC2626;cursor:pointer">취소 요청</button>` : ""}
        ${canApply ? `<button onclick="_viewingPlanDetail=null;startApplyFromPlan('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:linear-gradient(135deg,#059669,#10B981);color:white;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.3)">▶ 이 계획으로 교육신청</button>` : ""}
        ${isApproved ? `<button onclick="foOpenReduceAllocation('${safeId}')" style="padding:10px 20px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FDE68A;background:#FFFBEB;color:#B45309;cursor:pointer" title="배정액 하향 조정 (내용 변경 불가)">📉 배정액 축소</button>` : ""}
        ${isApproved && isExpired ? `<button disabled style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #E5E7EB;background:#F9FAFB;color:#9CA3AF;cursor:not-allowed" title="계획 기간이 만료되어 신청할 수 없습니다">⚠ 기간 만료</button>` : ""}
        ${!isApproved && !isDraft && !isPending ? `<span style="font-size:11px;color:#9CA3AF;align-self:center">ℹ 승인완료 상태에서 신청 가능합니다</span>` : ""}
      </div>
    </div>
  </div>`;
}

function closePlanWizard() {
  planState = null;
  renderPlans(); // 목록 뷰로 복귀
}

function renderPlanWizard() {
  const s = planState;
  if (!s) return;

  // P1 수정: 정책 로드 완료 전이면 먼저 로드 후 재렌더
  // (빠른 클릭 등으로 SERVICE_POLICIES 비어있을 때 Fallback 경로 방지)
  if (!_foServicePoliciesLoaded) {
    _loadFoPolicies().then(() => renderPlanWizard());
    return;
  }

  // 정책 우선: 역할이 아닌 매칭 정책의 target_type으로 UI 섹션 결정
  const policyResult =
    typeof _getActivePolicies !== "undefined"
      ? _getActivePolicies(currentPersona)
      : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  // 패턴A 존재 시 계획 필수 안내
  const hasPlanRequiredPattern = matchedPolicies.some(
    (p) => (p.process_pattern || p.processPattern) === "A",
  );

  // 정책 기반 목적 필터 (apply.js 동일: 행위 기반 카테고리)
  // ★★ 교육계획 화면 전용: 패턴 A(계획 필수) 정책이 있는 목적만 표시 ★★
  // 패턴 B/C/D/E 전용 목적은 계획 수립이 불필요하므로 제외
  const _allPurposes = getPersonaPurposes(currentPersona);

  // 패턴 A 정책이 존재하는 BO purpose 키 수집
  const _FO_TO_BO =
    typeof _FO_TO_BO_PURPOSE !== "undefined" ? _FO_TO_BO_PURPOSE : {};
  const _BO_TO_FO =
    typeof _BO_TO_FO_PURPOSE !== "undefined" ? _BO_TO_FO_PURPOSE : {};
  const planRequiredPurposes = new Set();
  matchedPolicies.forEach((p) => {
    const pt = p.process_pattern || p.processPattern || "";
    if (pt === "A") {
      // BO purpose → FO purpose ID로 변환하여 수집
      const foPurpose = _BO_TO_FO[p.purpose] || p.purpose;
      planRequiredPurposes.add(foPurpose);
    }
  });

  // 패턴 A 정책이 있는 목적만 필터 (패턴 A 정책이 없으면 계획 수립 자체 불필요 → 빈 목록)
  const allPurposes = _allPurposes.filter((p) =>
    planRequiredPurposes.has(p.id),
  );

  const _catColors = {
    "self-learning": {
      badge: "bg-blue-100 text-blue-600",
      border: "border-accent",
      borderHover: "hover:border-accent",
      bgActive: "bg-blue-50",
      textActive: "text-accent",
    },
    "edu-operation": {
      badge: "bg-violet-100 text-violet-600",
      border: "border-violet-500",
      borderHover: "hover:border-violet-400",
      bgActive: "bg-violet-50",
      textActive: "text-violet-600",
    },
    "result-only": {
      badge: "bg-amber-100 text-amber-700",
      border: "border-amber-500",
      borderHover: "hover:border-amber-400",
      bgActive: "bg-amber-50",
      textActive: "text-amber-700",
    },
  };
  const _catMeta =
    typeof _CATEGORY_META !== "undefined"
      ? _CATEGORY_META
      : {
          "self-learning": {
            icon: "📚",
            label: "직접 학습",
            desc: "본인이 직접 참여하는 교육",
          },
          "edu-operation": {
            icon: "🎯",
            label: "교육 운영",
            desc: "교육과정을 기획하거나 운영하는 경우",
          },
          "result-only": {
            icon: "📝",
            label: "결과만 등록",
            desc: "이미 수료한 교육의 결과를 등록",
          },
        };
  const categorized = {};
  allPurposes.forEach((p) => {
    const cat = p.category || "edu-operation";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(p);
  });
  // ★ 교육계획 전용: 패턴 A 정책의 account codes만으로 예산 필터링 ★
  // (모든 목적의 예산이 아닌, 패턴 A 정책에 연결된 계정만 표시)
  const _planPatternACodes = new Set();
  if (s.purpose) {
    const boPurposeKeys =
      typeof _FO_TO_BO_PURPOSE !== "undefined"
        ? _FO_TO_BO_PURPOSE[s.purpose.id] || [s.purpose.id]
        : [s.purpose.id];
    matchedPolicies.forEach((p) => {
      const pt = p.process_pattern || p.processPattern || "";
      const pPurpose = p.purpose;
      if (pt === "A" && boPurposeKeys.includes(pPurpose)) {
        (p.account_codes || p.accountCodes || []).forEach((c) =>
          _planPatternACodes.add(c),
        );
      }
    });
  }

  const _rawBudgets = s.purpose
    ? getPersonaBudgets(currentPersona, s.purpose.id)
    : [];
  // 패턴 A 계정 코드가 있으면 해당 코드만 필터, 없으면 전체 (폴백)
  const availBudgets =
    _planPatternACodes.size > 0
      ? _rawBudgets.filter((b) => {
          return [..._planPatternACodes].some((code) => {
            const acctType = ACCOUNT_TYPE_MAP[code];
            return (
              (acctType && acctType === b.account) || code === b.accountCode
            );
          });
        })
      : _rawBudgets;
  const curBudget = availBudgets.find((b) => b.id === s.budgetId) || null;

  // 프로세스 패턴 안내 (apply.js 동일)
  const _processInfo =
    curBudget && s.purpose
      ? typeof getProcessPatternInfo !== "undefined"
        ? getProcessPatternInfo(
            currentPersona,
            s.purpose.id,
            curBudget.accountCode,
          )
        : null
      : null;

  // ── 스탭 지시자 (apply.js 동일 구조) ──────────────────────────────────────
  const stepLabels = ["목적 선택", "예산 선택", "교육유형", "세부 정보"];
  const stepper = [1, 2, 3, 4]
    .map(
      (n) => `
  <div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "✓" : n}</div>
    <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${stepLabels[n - 1]}</span>
    ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
  </div>`,
    )
    .join("");

  document.getElementById("page-plans").innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <!-- 헤더 -->
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육계획</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육계획 수립</h1>
    </div>
    <button onclick="closePlanWizard()" style="padding:8px 18px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">← 목록으로</button>
  </div>

  <!-- 스탭 카드 (apply.js 동일) -->
  <div class="card p-5">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <!-- 콘텐츠 카드 -->
  <div class="card p-8">

  <!-- Step 1: 행위 기반 카테고리 (apply.js 동일) -->
  <div class="${s.step === 1 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-5">01. 교육 목적 선택</h3>

    ${
      hasPlanRequiredPattern
        ? `
    <div class="mb-5 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">📋</span>
      <div>
        <div class="font-black text-blue-700 text-sm mb-1">계획 수립 필수 정책이 포함되어 있습니다</div>
        <p class="text-xs text-blue-500 leading-relaxed">일부 교육 목적은 계획 수립 후 신청하는 절차(패턴A)가 적용됩니다.</p>
      </div>
    </div>`
        : ""
    }

    ${["self-learning", "edu-operation"]
      .map((catKey) => {
        const items = categorized[catKey] || [];
        if (items.length === 0) return "";
        const meta = _catMeta[catKey] || _catMeta["edu-operation"];
        const colors = _catColors[catKey] || _catColors["edu-operation"];
        const cols =
          items.length === 1
            ? "grid-cols-1"
            : items.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3";
        return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${colors.badge} tracking-wider">${meta.icon} ${meta.label}</span>
        <span class="text-[11px] text-gray-400">${meta.desc}</span>
      </div>
      <div class="grid ${cols} gap-3">
        ${items
          .map((p) => {
            const active = s.purpose?.id === p.id;
            return `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all ${colors.borderHover} ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white"}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${active ? colors.textActive : ""}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`;
          })
          .join("")}
      </div>
    </div>`;
      })
      .join("")}

    ${
      allPurposes.length === 0
        ? `
    <div class="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
      <div class="flex items-start gap-3">
        <span class="text-2xl flex-shrink-0">📋</span>
        <div>
          <div class="font-black text-blue-700 text-sm mb-2">교육계획 수립이 필요한 정책이 없습니다</div>
          <p class="text-xs text-blue-500 leading-relaxed mb-0">
            현재 사용자의 예산 계정에는 교육계획 수립이 필수인 정책(패턴 A)이 설정되어 있지 않습니다.<br>
            교육계획 없이 바로 <strong>교육신청</strong> 화면에서 신청하시면 됩니다.
          </p>
        </div>
      </div>
    </div>`
        : ""
    }

    <div class="flex justify-end mt-6 pt-4 border-t border-gray-100">
      <button onclick="planNext()" ${!s.purpose ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? "bg-brand text-white hover:bg-blue-900 shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed"}">
        다음 →
      </button>
    </div>
  </div>

  <!-- ── Step 2: 예산 선택 ── -->
  <div class="${s.step === 2 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-4">02. 예산 계정 선택</h3>
    <!-- 이전 단계 선택 요약 -->
    ${
      s.purpose
        ? `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-4">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">① 교육 목적</div>
      <div class="flex items-center gap-2">
        <span class="text-base">${s.purpose.icon}</span>
        <span class="text-sm font-black text-gray-800">${s.purpose.label}</span>
      </div>
    </div>`
        : ""
    }
    <div class="space-y-4">
      ${
        availBudgets.length > 0
          ? availBudgets
              .map((b) => {
                const active = s.budgetId === b.id;
                const acctTypeLabel =
                  b.account === "운영"
                    ? "운영 계정"
                    : b.account === "참가"
                      ? "참가 계정"
                      : b.account + " 계정";
                const vorgLabel = b.vorgName
                  ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:5px;background:#F0F9FF;color:#0369A1;margin-left:6px">${b.vorgName}</span>`
                  : "";
                return `
      <button onclick="planSelectBudget('${b.id}')" class="w-full text-left transition-all" style="padding:18px 20px;border-radius:14px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};background:${active ? "#EFF6FF" : "white"};cursor:pointer">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
              <span style="font-size:14px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${b.name}</span>
              ${vorgLabel}
            </div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:3px">${acctTypeLabel}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            ${(() => {
              // currentPersona.budgets에서 잔액 즉시 조회
              const personaBudget = (currentPersona.budgets || []).find(pb => pb.id === b.id || pb.name === b.name);
              if (!personaBudget) return '<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#9CA3AF;font-weight:800">⏳ 미배정</span>';
              const remain = (personaBudget.balance || 0) - (personaBudget.used || 0);
              const total  = personaBudget.balance || 0;
              const pct    = total > 0 ? Math.round(remain / total * 100) : 0;
              const [col, bg, icon] = remain <= 0
                ? ['#DC2626', '#FEE2E2', '🔴']
                : pct < 20
                  ? ['#D97706', '#FFFBEB', '🟡']
                  : ['#059669', '#F0FDF4', '🟢'];
              return `<span style="font-size:10px;padding:2px 10px;border-radius:6px;background:${bg};color:${col};font-weight:900">${icon} 잔액 ${remain.toLocaleString()}원</span>`;
            })()}
            ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ""}
          </div>
        </div>
      </button>`;

              })
              .join("")
          : `
      <div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-sm font-bold text-yellow-700">
        ⚠️ 선택한 교육 목적에 사용 가능한 예산 계정이 없습니다.
      </div>`
      }
    </div>
${/* 프로세스 패턴 안내 (apply.js 동일) */ ""}
${
  _processInfo
    ? `
    <div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:16px 18px">
      <div style="font-size:10px;font-weight:900;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <span style="width:5px;height:5px;background:#22C55E;border-radius:50%;display:inline-block"></span>
        이 교육은 다음 절차로 진행됩니다
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;flex-wrap:wrap">
        ${_processInfo.steps
          .map(
            (st, i) => `
        <div style="display:flex;align-items:center;gap:4px">
          <div style="text-align:center">
            <div style="font-size:18px;margin-bottom:2px">${st.icon}</div>
            <div style="font-size:11px;font-weight:900;color:#111827">${st.name}</div>
            <div style="font-size:9px;color:#6B7280;font-weight:700">${st.hint}</div>
          </div>
          ${i < _processInfo.steps.length - 1 ? '<span style="color:#D1D5DB;font-size:16px;margin:0 6px;font-weight:bold">→</span>' : ""}
        </div>`,
          )
          .join("")}
      </div>
      <div style="font-size:11px;color:#15803D;display:flex;align-items:flex-start;gap:5px">
        <span style="font-size:12px;flex-shrink:0">ⓘ</span>
        <span>${_processInfo.hint}${_processInfo.policyName ? ` <span style="color:#6B7280">(${_processInfo.policyName})</span>` : ""}</span>
      </div>
    </div>`
    : ""
}
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <button onclick="planNext()" ${!s.budgetId ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!s.budgetId ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
        다음 →
      </button>
    </div>
  </div>

  <!-- ── Step 3: 교육유형 선택 ── -->
  <div class="${s.step === 3 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-4">03. 교육유형 선택</h3>
    <!-- 이전 단계 선택 요약 -->
    ${
      s.purpose || curBudget
        ? `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">선택 내역</div>
      <div class="flex flex-wrap gap-4">
        ${s.purpose ? `<div class="flex items-center gap-2"><span class="text-[10px] font-black text-blue-300">① 목적</span><span class="text-xs font-black text-gray-800">${s.purpose.icon} ${s.purpose.label}</span></div>` : ""}
        ${curBudget ? `<div class="flex items-center gap-2"><span class="text-[10px] font-black text-blue-300">② 예산</span><span class="text-xs font-black text-gray-800">${curBudget.name}</span></div>` : ""}
      </div>
    </div>`
        : ""
    }
    ${(() => {
      // 교육유형 트리 가져오기
      const tree =
        typeof getPolicyEduTree !== "undefined" && curBudget
          ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account)
          : [];

      if (tree.length === 0) {
        const hasPolicies =
          typeof SERVICE_POLICIES !== "undefined" &&
          SERVICE_POLICIES.length > 0;
        return hasPolicies
          ? `<div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
              <div class="font-black text-yellow-700 text-sm">⚠️ 허용된 교육유형 정보가 없습니다</div>
              <div class="text-xs text-yellow-600 mt-1">관리자에게 교육지원 운영 규칙 설정을 요청해 주세요.</div>
            </div>`
          : `<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3">
              <span class="text-accent text-xl">✓</span> 이 예산 계정은 모든 교육유형에 사용 가능합니다.
            </div>`;
      }

      return tree
        .map((node) => {
          const isLeaf = !node.subs || node.subs.length === 0;
          const isSelected = s.eduType === node.id;
          if (isLeaf) {
            // 리프 노드: 바로 선택 (교육운영용)
            const leafSelected = isSelected && !s.subType;
            return `
      <div class="mb-3">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                 ${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
      </div>`;
          } else {
            // 중간 노드: 클릭 시 세부항목 펼침 (직접학습용)
            return `
      <div class="mb-3 rounded-xl border-2 overflow-hidden ${isSelected ? "border-gray-900" : "border-gray-200"}">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 text-sm font-bold text-left transition flex items-center justify-between
                 ${isSelected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}">
          <span>${node.label}</span>
          <span class="text-xs ${isSelected ? "text-gray-300" : "text-gray-400"}">${isSelected ? "▼" : "▶"} ${node.subs.length}개 세부유형</span>
        </button>
        ${
          isSelected
            ? `
        <div class="p-4 bg-gray-50 border-t border-gray-200">
          <div class="text-xs font-black text-blue-500 mb-3 flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
            세부 교육유형을 선택하세요
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${node.subs
              .map(
                (st) => `
            <button onclick="planState.subType='${st.key}';renderPlanWizard()"
              class="p-3 rounded-xl border-2 text-sm font-bold text-left transition
                     ${s.subType === st.key ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"}">${st.label}</button>
            `,
              )
              .join("")}
          </div>
        </div>`
            : ""
        }
      </div>`;
          }
        })
        .join("");
    })()}
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      ${(() => {
        const tree2 =
          typeof getPolicyEduTree !== "undefined" && curBudget
            ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account)
            : [];
        const selNode = tree2.find((n) => n.id === s.eduType);
        const isLeaf = selNode && (!selNode.subs || selNode.subs.length === 0);
        const canNext = s.eduType && (isLeaf || s.subType);
        return `<button onclick="planNext()" ${!canNext ? "disabled" : ""}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
          다음 →
        </button>`;
      })()}
    </div>
  </div>

  <!-- ── Step 4: 세부 정보 ── -->
  <div class="${s.step === 4 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-5">04. 세부 정보 입력</h3>

    <!-- 선택 요약 배너 -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> 계획 요약
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">① 교육 목적</div>
          <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ""} ${s.purpose?.label || "—"}</div>
        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">② 예산 계정</div>
          <div class="font-black text-sm ${curBudget?.account === "연구투자" ? "text-orange-500" : "text-accent"}">${curBudget?.name || "—"}</div>

        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">③ 교육유형</div>
          <div class="font-black text-sm text-gray-900">${typeof getEduTypeLabel !== "undefined" && s.eduType ? getEduTypeLabel(s.eduType) : s.eduType || "—"}</div>
        </div>
      </div>
    </div>

    <!-- ── 동적 양식 필드 (BO form_templates 기반) ── -->
    <div class="space-y-5">
      ${(() => {
        // BO 양식이 로드된 경우 → 동적 렌더링
        if (
          s.formTemplate &&
          s.formTemplate.fields &&
          s.formTemplate.fields.length > 0
        ) {
          const dynamicHtml =
            typeof renderDynamicFormFields === "function"
              ? renderDynamicFormFields(s.formTemplate.fields, s, "planState")
              : "";
          if (dynamicHtml) {
            const tplBadge = s.formTemplate.name
              ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>`
              : "";
            const hasAmountField = s.formTemplate.fields.some((f) =>
              ["예상비용", "교육비"].includes(f.key),
            );
            const amountFallback = hasAmountField
              ? ""
              : `
            <div>
              <label style="display:block;font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">💰 예산 계획액 <span style="color:#EF4444">*</span>
                ${s.calcGrounds && s.calcGrounds.length > 0 ? '<span style="font-size:11px;font-weight:500;color:#3B82F6;margin-left:6px">(세부 산출 근거 합계 자동 반영)</span>' : ""}
              </label>
              <div style="position:relative;max-width:340px">
                <input type="number" value="${s.amount}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
                  style="width:100%;background:#F9FAFB;border:2px solid ${s.hardLimitViolated ? "#EF4444" : "#E5E7EB"};border-radius:12px;padding:12px 48px 12px 16px;font-weight:700;font-size:16px;color:#111827;box-sizing:border-box"/>
                <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
              </div>

              ${s.hardLimitViolated ? `<div style="margin-top:6px;font-size:11px;font-weight:700;color:#DC2626">🚫 Hard Limit 초과 항목이 있어 계획을 저장할 수 없습니다.</div>` : ""}
              ${_renderApprovalRouteInfo(s, curBudget)}
            </div>`;
            return tplBadge + dynamicHtml + amountFallback;
          }
        }
        if (s.formTemplateLoading) {
          return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
        }
        // ── Phase B: 표준 렌더러 (정규화 컬럼 기반) ──
        if (typeof window.foRenderStandardPlanForm === 'function') {
          return window.foRenderStandardPlanForm(s, curBudget, s.formTemplate?.isInline ? s.formTemplate.inlineFields : null);
        }
        // ── 최후 Fallback: Phase B 렌더러 미로드 시 ──
        return `
        <div class="inline-flex bg-gray-100 rounded-xl p-1">
          <button onclick="planState.region='domestic';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "domestic" ? "bg-white text-accent shadow" : "text-gray-500"}">🗺 국내</button>
          <button onclick="planState.region='overseas';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "overseas" ? "bg-white text-accent shadow" : "text-gray-500"}">🌏 해외</button>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획명 <span class="text-red-500">*</span></label>
          <input type="text" value="${s.title}" oninput="planState.title=this.value" placeholder="예) 26년 AI 탐구형 학습 계획" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 시작일</label>
            <input type="date" value="${s.startDate}" oninput="planState.startDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
          </div>
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 종료일</label>
            <input type="date" value="${s.endDate}" oninput="planState.endDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
          </div>
        </div>
        ${_renderCalcGroundsSection(s, curBudget)}
        <!-- Phase5: 교육장소 멀티 TAG 입력 (선택사항) -->
        ${_renderLocationTagInput(s)}
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">예산 계획액
            ${s.calcGrounds && s.calcGrounds.length > 0 ? '<span class="text-xs font-medium text-blue-500 ml-2">(세부 산출 근거 합계 자동 반영)</span>' : ""}
          </label>
          <div class="relative max-w-xs">
            <input type="number" value="${s.amount}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
              class="w-full bg-gray-50 border-2 ${s.hardLimitViolated ? "border-red-400 bg-red-50" : "border-gray-100"} rounded-xl px-5 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition pr-12"/>
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
          </div>

          ${s.hardLimitViolated ? `<div class="mt-1.5 text-xs font-black text-red-600">🚫 Hard Limit 초과 항목이 있어 계획을 저장할 수 없습니다. 항목 금액을 수정해주세요.</div>` : ""}
          ${_renderApprovalRouteInfo(s, curBudget)}
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 상세 내용</label>
          <textarea oninput="planState.content=this.value" rows="3" placeholder="업무 활용 방안, 학습 목표 등을 입력하세요." class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
        </div>`;
      })()}
    </div>

    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <div class="flex gap-3">
        <button onclick="closePlanWizard()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">취소</button>
        <button onclick="savePlanDraft()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition">
          💾 임시저장
        </button>
        <button onclick="savePlanSaved()" ${s.hardLimitViolated ? "disabled" : ""}
          class="px-7 py-3 rounded-xl font-black text-sm transition ${s.hardLimitViolated ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"}">
          ✅ 저장
        </button>
        <button onclick="savePlan()" ${s.hardLimitViolated ? "disabled" : ""}
          class="px-10 py-3 rounded-xl font-black text-sm transition shadow-lg ${s.hardLimitViolated ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900"}">
          📤 상신 →
        </button>
      </div>
  </div>

  </div>
</div>`;
}
