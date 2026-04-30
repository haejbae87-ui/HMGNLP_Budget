// ─── fo_plans_wizard.js — 계획 수립 마법사 Step 렌더 (REFACTOR-2: plans.js 분리) ───
// ─── PLAN WIZARD ─────────────────────────────────────────────────────────────

function startPlanWizard(mode = 'ongoing', forcedYear = null, accountCode = null, targetAccountsJson = null) {
  planState = resetPlanState();
  const curYear = new Date().getFullYear();
  
  if (targetAccountsJson) {
    try {
      planState.targetAccounts = JSON.parse(decodeURIComponent(targetAccountsJson));
    } catch (e) {
      console.error('Failed to parse targetAccounts', e);
    }
  }

  // Phase1: 계정 컨텍스트 자동 주입 (L2에서 선택된 계정)
  if (accountCode) {
    planState.contextAccountCode = accountCode;
  } else if (typeof _selectedAccountCode !== 'undefined' && _selectedAccountCode) {
    planState.contextAccountCode = _selectedAccountCode;
  }

  // Phase2: contextAccountCode → budgetId 자동 매핑 (예산 선택 Step 스킵용)
  if (planState.contextAccountCode) {
    const matchedBudget = (currentPersona?.budgets || []).find(b =>
      b.accountCode === planState.contextAccountCode || b.id === planState.contextAccountCode
    );
    if (matchedBudget) {
      planState.budgetId = matchedBudget.id;
    }
  }

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
    // currentPersona의 제도그룹 ID 배열 추출 (다중 소속 지원)
    const vorgTplIds = currentPersona.vorgIds || (currentPersona.domainId ? [currentPersona.domainId] : []) || null;
    _checkForecastDeadline(currentPersona.tenantId || "HMC", _planYear, vorgTplIds).then(
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
  const teamPlans = typeof _dbTeamPlans !== "undefined" ? _dbTeamPlans : [];
  const mockPlans =
    typeof currentPersona !== "undefined" && currentPersona.plans
      ? currentPersona.plans
      : [];
  const plan =
    allPlans.find((p) => String(p.id) === String(planId)) ||
    teamPlans.find((p) => String(p.id) === String(planId)) ||
    mockPlans.find((p) => String(p.id) === String(planId));
  if (!plan) {
    alert("계획을 찾을 수 없습니다.");
    return;
  }
  _viewingPlanDetail = plan;
  renderPlans();
}

function _renderPlanDetailView(plan) {
  // ★ 통합 렌더러(foRenderPlanUnifiedView)로 위임
  // fo_plans_actions.js에 정의된 단일 뷰 컴포넌트를 공유 (첨부2=첨부4 동일 화면)
  if (typeof foRenderPlanUnifiedView === 'function') {
    return foRenderPlanUnifiedView(plan, { mode: 'detail' });
  }
  // 폴백: foRenderPlanUnifiedView 미로드 시
  return `<div style="padding:40px;text-align:center;color:#6B7280">렌더러 로딩 중...</div>`;
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

  // 정책 기반 목적 필터 (행위 기반 카테고리)
  // ★★ 교육계획 화면 전용: 패턴 A(계획 필수) 정책이 있는 목적만 표시 ★★
  const _allPurposes = getPersonaPurposes(currentPersona);
  const budgets = currentPersona.budgets || [];

  // B방향: edu_types 기반 목적 vs 레거시: service_policies 기반 목적
  const _isEduTypeBased = _allPurposes.some(p => p._activeTypes);

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
      // B방향 호환: _FO_EDU_TREE 카테고리 ID도 추가
      if (typeof _FO_EDU_TREE !== "undefined") {
        _FO_EDU_TREE.forEach(g => g.categories.forEach(cat => {
          if (cat.id === p.purpose || foPurpose === cat.id) {
            planRequiredPurposes.add(cat.id);
          }
        }));
      }
    }
  });

  // 패턴 A 정책이 있는 목적만 필터
  // B방향: edu_types 기반이면 패턴 A 필터를 완화 (계정에 edu_types가 있으면 계획 수립 허용)
  let allPurposes;
  if (_isEduTypeBased && planRequiredPurposes.size === 0) {
    // edu_types 기반인데 패턴 A 매칭이 안됨 → 전체 허용 (정책 미설정 상태)
    allPurposes = _allPurposes;
  } else if (_isEduTypeBased) {
    // edu_types 기반 + 패턴 A 존재 → 전체 허용 (edu_types 자체가 계정 설정에 의해 필터링됨)
    allPurposes = _allPurposes;
  } else {
    // 레거시: 패턴 A 정책이 있는 목적만 필터
    allPurposes = _allPurposes.filter((p) =>
      planRequiredPurposes.has(p.id),
    );
  }

  // ★ 계정 기반 목적 필터: L2에서 특정 계정을 선택한 경우 해당 계정의 교육유형에 맞는 목적만 노출
  if (s.contextAccountCode) {
    if (_isEduTypeBased) {
      // B방향: 선택된 계정의 eduTypes에서 해당 카테고리의 types가 겹치는 목적만 표시
      const ctxBudget = budgets.find(b => b.accountCode === s.contextAccountCode);
      const ctxEduTypes = new Set(ctxBudget?.eduTypes || []);
      if (ctxEduTypes.size > 0) {
        allPurposes = allPurposes.filter(p => (p._activeTypes || []).some(t => ctxEduTypes.has(t)));
      }
    } else {
      // 레거시: 정책 기반 필터
      allPurposes = allPurposes.filter((p) => {
        const boPurposeKeys = _FO_TO_BO[p.id] || [p.id];
        return matchedPolicies.some((pol) => {
          const acc = pol.account_codes || pol.accountCodes || [];
          const pt = pol.process_pattern || pol.processPattern || "";
          return (
            pt === "A" &&
            acc.includes(s.contextAccountCode) &&
            boPurposeKeys.includes(pol.purpose)
          );
        });
      });
    }
  }

  // 수요예측 캠페인: 타겟 계정이 주어졌다면 해당 계정에 연동되는 목적만 노출
  if (s.plan_type === 'forecast' && s.targetAccounts && s.targetAccounts.length > 0) {
    allPurposes = allPurposes.filter((p) => {
      const rawBudgets = getPersonaBudgets(currentPersona, p.id) || [];
      return rawBudgets.some(b => s.targetAccounts.includes(b.accountCode));
    });
  }

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
  let availBudgets =
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
      
  // 수요예측 캠페인의 타겟 계정이 주어졌다면 추가로 필터링
  if (s.plan_type === 'forecast' && s.targetAccounts && s.targetAccounts.length > 0) {
    availBudgets = availBudgets.filter(b => s.targetAccounts.includes(b.accountCode));
  }
  const curBudget = availBudgets.find((b) => b.id === s.budgetId)
    // ★ 폴백: contextAccountCode로 자동 주입된 budgetId가 availBudgets에 없을 때
    // (목적 선택 전 자동 주입 → 목적 기반 availBudgets에서 제외될 수 있음)
    || (s.contextAccountCode
      ? (currentPersona.budgets || []).find(b =>
          b.accountCode === s.contextAccountCode || b.id === s.budgetId
        )
      : null)
    || null;

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

  // ── 스탭 지시자 (3단계: 목적→교육유형→세부정보) ──────────────────────────────────────
  const stepLabels = ["목적 선택", "교육유형", "세부 정보"];
  const stepper = [1, 2, 3]
    .map(
      (n) => `
  <div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "✓" : n}</div>
    <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${stepLabels[n - 1]}</span>
    ${n < 3 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
  </div>`,
    )
    .join("");

  document.getElementById("page-plans").innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
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

    ${
      curBudget
        ? `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">선택된 예산 계정</div>
      <div class="flex flex-wrap gap-4">
        <div class="flex items-center gap-2"><span class="text-[10px] font-black text-blue-300">② 예산</span><span class="text-xs font-black text-gray-800">${curBudget.name}</span></div>
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
        ${meta.desc ? `<span class="text-[11px] text-gray-400">${meta.desc}</span>` : ''}
      </div>
      <div class="grid ${cols} gap-3">
        ${items
          .map((p) => {
            const active = s.purpose?.id === p.id;
            return `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all ${colors.borderHover} ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white"}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${active ? colors.textActive : ""}">${p.label}</div>
          ${p.desc ? `<div class="text-xs text-gray-500">${p.desc}</div>` : ''}
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

  <!-- ── Step 2 (구 예산 선택): contextAccountCode로 자동 주입되어 표시 생략 ── -->
  <!-- 계정은 L2 Account Hub에서 이미 선택됨 (_selectedAccountCode) -->
  <div class="hidden">
  </div>

  <!-- ── Step 2: 교육유형 선택 ── -->
  <div class="${s.step === 2 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-4">02. 교육유형 선택</h3>
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
      // ★ curBudget.accountCode 직접 전달하여 ACCOUNT_TYPE_MAP 역매핑 실패 피한
      const tree =
        typeof getPolicyEduTree !== "undefined" && curBudget
          ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.accountCode || curBudget.account)
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
            const leafSelected = isSelected && !s.subType;
            return `
      <div class="mb-3">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                 ${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
      </div>`;
          } else {
            return `
      <div class="mb-3">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                 ${isSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
        ${isSelected ? `<div class="mt-2 ml-4 grid grid-cols-2 gap-2">
          ${(node.subs || []).map(sub => {
            const subSel = s.subType === sub.id;
            return `<button onclick="event.stopPropagation();planState.subType='${sub.id}';renderPlanWizard()"
              class="p-3 rounded-xl border-2 text-xs font-bold text-left transition
                     ${subSel ? "bg-brand border-brand text-white shadow-md" : "border-gray-200 text-gray-600 hover:border-brand hover:text-brand"}">${sub.label}</button>`;
          }).join('')}
        </div>` : ''}
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
            ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.accountCode || curBudget.account)
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

  <!-- ── Step 3: 폼 세부정보 입력 ── -->
  <div class="${s.step === 3 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-5">03. 세부 정보 입력</h3>

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
        if (s.formTemplateLoading) {
          return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
        }
        
        // BO 양식이 로드된 경우 (동적 양식 fields 배열)
        if (s.formTemplate && s.formTemplate.fields && s.formTemplate.fields.length > 0) {
          if (typeof renderDynamicFormFields === "function") {
            const dynamicHtml = renderDynamicFormFields(s.formTemplate.fields, s, "planState", curBudget);
            if (dynamicHtml) {
              const tplBadge = s.formTemplate.name
                ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>`
                : "";
              return tplBadge + dynamicHtml;
            }
          }
        }
        
        // ── Phase B: 표준 렌더러 (정규화 컬럼 기반 또는 인라인 폼) ──
        if (typeof window.foRenderStandardPlanForm === 'function') {
          return window.foRenderStandardPlanForm(s, curBudget, s.formTemplate?.isInline ? s.formTemplate.inlineFields : null);
        }
        
        return `<div class="p-4 text-center text-red-500 font-bold">폼 렌더러를 불러오지 못했습니다.</div>`;
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
      </div>
  </div>

  </div>
</div>`;
}
