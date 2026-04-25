// ─── fo_apply_form.js — 신청 마법사 Step 렌더 (REFACTOR-2: apply.js 분리) ───
function _renderApplyForm() {
  // ── SERVICE_POLICIES 로딩 게이트 (근본 수정) ──────────────────────────────
  // SERVICE_POLICIES가 비어있으면 정책 필터링이 무력화되어 기타운영 등 누수 발생
  if (
    typeof _foServicePoliciesLoaded !== "undefined" &&
    !_foServicePoliciesLoaded
  ) {
    _loadFoPolicies().then(() => _renderApplyForm());
    document.getElementById("page-apply").innerHTML =
      `<div class="max-w-4xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⌛</div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">교육지원 운영 규칙 로딩 중...</div>
    </div>`;
    return;
  }
  // DB 승인 교육계획 선로드 (최초 1회)
  if (!_dbApprovedPlansLoaded || _dbApprPlanPersonaId !== currentPersona.id) {
    _loadApprovedPlans().then(() => _renderApplyForm());
    document.getElementById("page-apply").innerHTML =
      `<div class="max-w-4xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⌛</div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">교육계획 데이터 로딩 중...</div>
    </div>`;
    return;
  }
  const s = applyState;

  // 정책 우선: 역할이 아닌 매칭 정책으로 UI 결정
  const policyResult =
    typeof _getActivePolicies !== "undefined"
      ? _getActivePolicies(currentPersona)
      : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  const allPurposes = getPersonaPurposes(currentPersona);
  // 개선3: 행위 기반 카테고리 그룹핑
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

  const availBudgets = s.purpose
    ? getPersonaBudgets(currentPersona, s.purpose.id)
    : [];

  const curBudget = availBudgets.find((b) => b.id === s.budgetId) || null;
  const isRndBudget = curBudget?.account === "연구투자";
  const isOperBudget = curBudget?.account === "운영";
  // R&D 예산 계정에 연계된 교육계획 목록 (DB 실시간)
  const rndPlans = _dbApprovedPlans.filter(
    (p) => (p.account || "").includes("RND") || p.account === "연구투자",
  );
  const hasRndPlans = rndPlans.length > 0;
  // 운영 예산 계정에 연계된 교육계획 목록 (DB 실시간)
  const operPlans = _dbApprovedPlans.filter(
    (p) => p.budgetId === curBudget?.id,
  );
  const hasOperPlans = operPlans.length > 0;
  // 다음 버튼 활성 조건
  const step2Blocked =
    s.useBudget === true &&
    ((isRndBudget && !hasRndPlans) || (isOperBudget && !hasOperPlans));
  const step2NeedPlan =
    s.useBudget === true &&
    ((isRndBudget && hasRndPlans) || (isOperBudget && hasOperPlans));
  const step2CanNext =
    s.useBudget !== null &&
    (s.useBudget === false ||
      (!isRndBudget && !isOperBudget && s.budgetId) ||
      (isRndBudget && s.planId) ||
      (isOperBudget && s.planIds?.length > 0)) &&
    !step2Blocked;
  const totalExp = s.expenses.reduce(
    (sum, e) => sum + Number(e.price) * Number(e.qty),
    0,
  );
  // v3: 직접학습형 항목 DB 동적 로드 (CALC_GROUNDS_MASTER 활용)
  const _slItems = (typeof _getCalcGroundsForType === "function") 
    ? _getCalcGroundsForType("self_learning", currentPersona?.vorgTemplateId || null, s.region === "overseas")
    : [];
  // 직접학습형: type 필드 없는 항목은 placeholder로
  if (s.expenses.length === 0 || (s.expenses.length === 1 && !s.expenses[0].type && !s.expenses[0].itemId)) {
    // 초기 변환: 기준 type 문자열을 itemId로 매핑
    s.expenses.forEach((e) => {
      if (e.type && !e.itemId) {
        const matched = _slItems.find(g => g.name === e.type || g.name.includes(e.type.split('/')[0]));
        if (matched) e.itemId = matched.id;
      }
    });
  }
  const totalAmt = isRndBudget ? Number(s.rndTotal) : totalExp;
  const over = curBudget && totalAmt > curBudget.balance - curBudget.used;

  // 개선1: 프로세스 패턴 안내 데이터
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

  document.getElementById("page-apply").innerHTML = `
    <div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#002C5F'" onmouseout="this.style.color='#6B7280'">
        ← 신청 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육 신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육 신청서 작성</h1>
    </div>
    ${
      s.planId
        ? (() => {
            const _linkedPlan = _dbApprovedPlans.find((p) => p.id === s.planId);
            const _lpTitle = _linkedPlan ? _linkedPlan.title : s.planId;
            const _lpAmount = _linkedPlan
              ? (_linkedPlan.amount || 0).toLocaleString()
              : "-";
            const _lpBudget = curBudget
              ? (curBudget.balance - curBudget.used).toLocaleString()
              : "-";
            return `
<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE;border-radius:12px;display:flex;align-items:center;gap:12px">
  <span style="font-size:22px">🔗</span>
  <div style="flex:1">
    <div style="font-size:12px;font-weight:900;color:#1D4ED8">교육계획 기반 신청</div>
    <div style="font-size:11px;color:#3B82F6;margin-top:2px">${_lpTitle} · 계획액 ${_lpAmount}원 · 예산잔액 ${_lpBudget}원</div>
  </div>
  <button onclick="_viewingPlanDetail=null;if(typeof viewPlanDetail==='function'){viewPlanDetail('${s.planId}');}navigate('plans');"
    style="padding:6px 14px;border-radius:8px;border:1.5px solid #BFDBFE;background:white;font-size:11px;font-weight:800;color:#1D4ED8;cursor:pointer;white-space:nowrap">
    📝 계획 상세 보기
  </button>
</div>`;
          })()
        : ""
    }
  </div>

  <!--Stepper indicator-->
  <div class="card p-6">
    <div class="flex items-center gap-2">
      ${[1, 2, 3, 4]
        .map(
          (n) => `
      <div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
        <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "✓" : n}</div>
        <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${["목적 선택", "예산 선택", "교육유형 선택", "세부 정보"][n - 1]}</span>
        ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
      </div>`,
        )
        .join("")}
    </div>
  </div>

  <!--Step 1: Purpose (개선3: 행위 기반 카테고리)-->
  <div class="card p-8 ${s.step === 1 ? "" : "hidden"}">
    <h2 class="text-lg font-black text-gray-800 mb-6">01. 교육 목적 선택</h2>

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
      <div class="grid ${cols} gap-4">
        ${items
          .map((p) => {
            const active = s.purpose?.id === p.id;
            return `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all ${colors.borderHover} ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white"}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${active ? colors.textActive : ""}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`;
          })
          .join("")}
      </div>
    </div>`;
      })
      .join("")}

    <div class="flex justify-end mt-6">
      <button onclick="applyNext()" ${!s.purpose ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? "bg-brand text-white hover:bg-blue-900 shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed"}">
        다음 →
      </button>
    </div>
  </div>

  <!--Step 2: Budget-->
  <div class="card p-8 ${s.step === 2 ? "" : "hidden"}">
    ${_applySelectionBanner(s, 2)}
    <h2 class="text-lg font-black text-gray-800 mb-2">02. 예산 선택</h2>

    ${(() => {
      const isIndividual = s.purpose?.id === "external_personal";
      if (isIndividual) {
        // ── 개인직무 사외학습: 페르소나별 동적 예산 옵션 카드 ──────────────────
        const allowed = currentPersona.allowedAccounts || [];
        const hasRnd = allowed.some((a) => a.includes("RND"));
        const hasHscExt = allowed.includes("HSC-EXT");
        const hasHaeEdu = allowed.includes("HAE-EDU");
        const hasHaeTeam = allowed.includes("HAE-TEAM");
        const hasPart = allowed.some(
          (a) =>
            a.includes("-PART") || a.includes("-OPS") || a.includes("-ETC"),
        );
        const hasFree = allowed.includes("COMMON-FREE"); // 예산 미사용 정책 여부

        // ── 일반계정 카드 태그: 교육지원 운영 규칙 process_pattern 기반 동적 결정 ──────
        // Pattern B: 신청→결과(즉시 예산 차감), Pattern C/D: 후정산, A/E: 신청→결과
        function _getGeneralCardTag() {
          if (typeof SERVICE_POLICIES !== "undefined") {
            const pol = SERVICE_POLICIES.find(
              (p) =>
                p.status !== "inactive" &&
                (p.account_codes || []).some((c) => allowed.includes(c)) &&
                (p.purpose === "external_personal" ||
                  p.purpose === "개인직무 사외학습"),
            );
            if (pol) {
              const pt = pol.process_pattern || pol.processPattern || "";
              if (pt === "B")
                return {
                  tag: "패턴 B (신청→결과)",
                  tagColor: "#B45309",
                  tagBg: "#FFFBEB",
                };
              if (pt === "C" || pt === "D")
                return {
                  tag: "후정산형",
                  tagColor: "#D97706",
                  tagBg: "#FEF3C7",
                };
              if (pt === "A" || pt === "E")
                return {
                  tag: "신청→결과",
                  tagColor: "#059669",
                  tagBg: "#F0FDF4",
                };
            }
          }
          // DB에서 정책 못 읽으면 → 현재 테넌트 기본값
          return {
            tag: "패턴 B (신청→결과)",
            tagColor: "#B45309",
            tagBg: "#FFFBEB",
          };
        }
        const generalTag = _getGeneralCardTag();

        const CHOICES = [
          // ── HAE 전사교육예산 ──────────────────────────────────────────────────
          ...(hasHaeEdu
            ? [
                {
                  id: "hae-edu",
                  icon: "🏫",
                  title: "전사교육예산",
                  desc: "현대오토에버 전사 공통 교육예산에서 교육비를 지원받습니다. 신청 승인 후 교육 이수 결과를 작성합니다.",
                  tag: "신청→결과",
                  tagColor: "#7C3AED",
                  tagBg: "#F5F3FF",
                  next: "교육유형 선택 → 세부정보",
                  nextColor: "#7C3AED",
                },
              ]
            : []),
          // ── HAE 팀/프로젝트 할당예산 ─────────────────────────────────────────
          ...(hasHaeTeam
            ? [
                {
                  id: "hae-team",
                  icon: "👥",
                  title: "팀/프로젝트 할당예산",
                  desc: "팀 및 프로젝트 단위로 배정된 교육예산에서 교육비를 지원받습니다. 신청 승인 후 교육 이수 결과를 작성합니다.",
                  tag: "신청→결과",
                  tagColor: "#059669",
                  tagBg: "#F0FDF4",
                  next: "교육유형 선택 → 세부정보",
                  nextColor: "#059669",
                },
              ]
            : []),
          // ── HSC 사외교육 계정 ───────────────────────────────────────────────
          ...(hasHscExt
            ? [
                {
                  id: "general",
                  icon: "🏭",
                  title: "현대제철-사외교육 계정",
                  desc: "현대제철 사외교육 예산에서 교육비를 지원받습니다. 신청 후 승인 시 예산이 차감되며, 이후 교육 결과를 작성합니다. (패턴 B: 신청 → 결과)",
                  tag: "신청→결과",
                  tagColor: "#BE123C",
                  tagBg: "#FFF1F2",
                  next: "교육유형 선택 → 세부정보",
                  nextColor: "#BE123C",
                },
              ]
            : []),
          // ── 일반 참가계정 (HMC/KIA 등) — 정책 패턴 태그 동적 표시 ─────────
          ...(!hasHscExt && !hasHaeEdu && hasPart
            ? [
                {
                  id: "general",
                  icon: "💳",
                  title: "일반교육예산 참가계정",
                  desc: "일반 교육예산에서 참가비를 지원받습니다. 교육지원 운영 규칙에 따라 신청 → 결과 또는 후정산 방식으로 처리됩니다.",
                  tag: generalTag.tag,
                  tagColor: generalTag.tagColor,
                  tagBg: generalTag.tagBg,
                  next: "교육유형 선택 → 세부정보",
                  nextColor: "#059669",
                },
              ]
            : []),
          ...(hasRnd
            ? [
                {
                  id: "rnd",
                  icon: "🔬",
                  title: "R&D교육예산 계정",
                  desc: "사전에 승인받은 R&D 교육계획과 연동하여 신청합니다. 교육계획 없이는 이 경로를 이용할 수 없습니다.",
                  tag: "계획 연동 필수",
                  tagColor: "#7C3AED",
                  tagBg: "#F5F3FF",
                  next: "교육계획 선택 → 세부정보",
                  nextColor: "#7C3AED",
                },
              ]
            : []),
          // ── 예산 미사용 — COMMON-FREE 정책 계정이 있을 때만 노출 ────────────
          ...(hasFree
            ? [
                {
                  id: "none",
                  icon: "📝",
                  title: "예산 미사용 (이력만 등록)",
                  desc: "자비 학습·무료 강의 등 예산 사용 없이 학습 이력만 등록합니다. 예산 잔액에 영향을 주지 않습니다.",
                  tag: "예산 미사용",
                  tagColor: "#6B7280",
                  tagBg: "#F3F4F6",
                  next: "교육유형 선택 → 세부정보",
                  nextColor: "#374151",
                },
              ]
            : []),
        ];
        const bc = s.budgetChoice;
        return `<p class="text-sm text-gray-400 mb-5">이번 교육 신청에 어떤 예산을 사용하시겠습니까?</p>
<div style="display:grid;gap:10px;margin-bottom:4px">
${CHOICES.map((ch) => {
  const active = bc === ch.id;
  const activeColor =
    ch.id === "rnd"
      ? "#7C3AED"
      : ch.id === "hae-edu"
        ? "#7C3AED"
        : ch.id === "hae-team"
          ? "#059669"
          : ch.id === "general"
            ? hasHscExt
              ? "#BE123C"
              : "#059669"
            : "#9CA3AF";
  const col = active ? activeColor : "#E5E7EB";
  return `<button onclick="selectBudgetChoice('${ch.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${col};
         background:${active ? col + "12" : "white"};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="font-size:26px;flex-shrink:0;margin-top:2px">${ch.icon}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:${active ? col : "#111827"}">${ch.title}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${ch.tagBg};color:${ch.tagColor}">${ch.tag}</span>
      </div>
      <p style="font-size:12px;color:#6B7280;line-height:1.55;margin:0 0 8px">${ch.desc}</p>
      <div style="font-size:10px;font-weight:800;color:${ch.nextColor}">다음 단계: ${ch.next} →</div>
    </div>
    <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${col};background:${active ? col : "white"};flex-shrink:0;margin-top:4px;display:flex;align-items:center;justify-content:center">
      ${active ? '<span style="color:white;font-size:11px;font-weight:900">✓</span>' : ""}
    </div>
  </div>
</button>`;
}).join("")}
</div>
${bc === "rnd" ? _renderPlanPickerSection(s, "rnd") : ""}`;
      }

      // ── 교육담당자 목적: DB 정책 기반 예산 계정 목록 ────────────────────────
      const policyBudgets = getPersonaBudgets(currentPersona, s.purpose?.id);
      if (policyBudgets.length === 0) {
        return `<p class="text-sm text-gray-500 mb-4 font-bold"><span class="text-orange-500">⚠️</span> 이 교육 목적에 사용 가능한 예산 계정이 없습니다.<br><span class="text-xs text-gray-400">담당자에게 문의하세요.</span></p>`;
      }
      return `<p class="text-sm text-gray-400 mb-5">이번 교육에 사용할 예산 계정을 선택하세요.</p>
<div style="display:grid;gap:8px">
${policyBudgets
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
    return `<button onclick="selectApplyBudget('${b.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};
         background:${active ? "#EFF6FF" : "white"};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="display:flex;align-items:center;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${b.name}</span>
        ${vorgLabel}
      </div>
    </div>
    ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ""}
  </div>
</button>`;
  })
  .join("")}
</div>
${/* 개선1: 프로세스 패턴 안내 배너 */ ""}
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
    <span>${_processInfo.hint}</span>
  </div>
</div>`
    : ""
}
${(() => {
  // ★ 교육운영 패턴A: 교육계획 선택 영역 추가
  if (!s.budgetId || s.purpose?.id === "external_personal") return "";
  const _pi =
    typeof getProcessPatternInfo !== "undefined" && curBudget
      ? getProcessPatternInfo(
          currentPersona,
          s.purpose?.id,
          curBudget.accountCode,
        )
      : null;
  if (_pi?.pattern !== "A") return "";
  return _renderPlanPickerSection(s, "operator");
})()}`;
    })()}

    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      ${(() => {
        const isInd = s.purpose?.id === "external_personal";
        // ★ 패턴A 교육계획 필수 체크: R&D 또는 교육운영 패턴A
        const _pi2 =
          !isInd && curBudget && typeof getProcessPatternInfo !== "undefined"
            ? getProcessPatternInfo(
                currentPersona,
                s.purpose?.id,
                curBudget?.accountCode,
              )
            : null;
        const isPatA = _pi2?.pattern === "A";
        const hasPlanSelected = s.planId || (s.planIds && s.planIds.length > 0);
        const ok = isInd
          ? s.budgetChoice && (s.budgetChoice !== "rnd" || hasPlanSelected)
          : s.budgetId && (!isPatA || hasPlanSelected);
        return `<button onclick="applyNext()" ${!ok ? "disabled" : ""}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${!ok ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
          다음 →
        </button>`;
      })()}
    </div>
  </div>


  <!--Step 3: 교육유형 선택-->
  <div class="card p-8 ${s.step === 3 ? "" : "hidden"}">
    ${_applySelectionBanner(s, 3)}
    <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육유형 선택</h2>
    ${(() => {
      // 정책 기반 교육유형 트리 우선 사용
      // ★ curBudget이 null이어도 purpose만으로 시도 (budgetAccountType=null → accountCode 필터 스킵)
      const tree =
        typeof getPolicyEduTree !== "undefined"
          ? getPolicyEduTree(
              currentPersona,
              s.purpose?.id,
              curBudget ? curBudget.account : null,
            )
          : [];

      if (tree.length > 0) {
        // ── 정책 기반 트리 렌더링 ──
        return tree
          .map((node) => {
            const isLeaf = !node.subs || node.subs.length === 0;
            const isSelected = s.eduType === node.id;
            if (isLeaf) {
              const leafSelected = isSelected && !s.subType;
              return `
        <div class="mb-3">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                   ${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
        </div>`;
            } else {
              return `
        <div class="mb-3 rounded-xl border-2 overflow-hidden ${isSelected ? "border-gray-900" : "border-gray-200"}">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
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
              <button onclick="applyState.subType='${st.key}';renderApply()"
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
      }

      // Fallback: SERVICE_POLICIES 로드 여부 확인
      const hasPolicies =
        typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0;
      if (hasPolicies) {
        // 정책이 로드됐는데 tree가 비어있으면 → 이 계정/VOrg에 설정된 정책 없음
        return `<div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
          <div class="font-black text-yellow-700 text-sm">⚠️ 허용된 교육유형 정보가 없습니다</div>
          <div class="text-xs text-yellow-600 mt-1">관리자에게 교육지원 운영 규칙 설정을 요청해 주세요.</div>
        </div>`;
      }
      // SERVICE_POLICIES 미로드: PURPOSES subtypes 기반 폴백
      const subtypes = s.purpose?.subtypes || null;
      if (!subtypes)
        return '<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3"><span class="text-accent text-xl">✓</span> 표준 프로세스가 자동 적용됩니다.</div>';
      return subtypes
        .map(
          (g) => `
    <div class="mb-7">
      <div class="mb-3">
        <div class="text-xs font-black text-gray-700 flex items-center gap-2 mb-0.5"><span class="w-1.5 h-1.5 bg-accent rounded-full inline-block"></span>${g.group}</div>
        ${g.desc ? `<div class="text-[11px] text-gray-400 pl-3.5">${g.desc}</div>` : ""}
      </div>
      <div class="grid ${g.items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-3">
        ${g.items
          .map(
            (i) => `
        <button onclick="applyState.subType='${i.id}';renderApply()" class="p-4 rounded-xl border-2 text-sm font-bold text-left leading-snug transition ${s.subType === i.id ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${i.label}</button>`,
          )
          .join("")}
      </div>
    </div>`,
        )
        .join("");
    })()}
    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      ${(() => {
        const tree2 =
          typeof getPolicyEduTree !== "undefined"
            ? getPolicyEduTree(
                currentPersona,
                s.purpose?.id,
                curBudget ? curBudget.account : null,
              )
            : [];
        if (tree2.length > 0) {
          const selNode = tree2.find((n) => n.id === s.eduType);
          const isLeaf =
            selNode && (!selNode.subs || selNode.subs.length === 0);
          const canNext = s.eduType && (isLeaf || s.subType);
          return `<button onclick="applyNext()" ${!canNext ? "disabled" : ""}
            class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">다음 →</button>`;
        }
        const dis = s.purpose?.subtypes && !s.subType;
        return `<button onclick="applyNext()" ${dis ? "disabled" : ""}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${dis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">다음 →</button>`;
      })()}
    </div>
  </div>

  <!--Step 4: Detail-->
    <div class="card p-8 ${s.step === 4 ? "" : "hidden"}">
      <h2 class="text-lg font-black text-gray-800 mb-4">04. 세부 정보 입력</h2>

      <!-- 이전 단계 선택 요약 배너 -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> 신청 요약
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Step 1 요약 -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">① 교육 목적</div>
            <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ""} ${s.purpose?.label || "—"}</div>
            ${
              s.subType
                ? (() => {
                    const g = s.purpose?.subtypes
                      ?.flatMap((g) => g.items)
                      .find((i) => i.id === s.subType);
                    return g
                      ? `<div class="text-[11px] text-gray-500 mt-0.5">└ ${g.label}</div>`
                      : "";
                  })()
                : ""
            }
          </div>
          <!-- Step 2 요약 -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">② 예산</div>
            ${
              s.useBudget === false
                ? '<div class="font-black text-sm text-gray-500">📝 단순 이력 등록</div>'
                : `<div class="font-black text-sm text-gray-900">${curBudget ? curBudget.name : "—"}</div>
               ${s.planId ? `<div class="text-[11px] text-blue-500 mt-0.5">🔗 단일 계획 연동됨</div>` : ""}
               ${s.planIds?.length ? `<div class="text-[11px] text-violet-500 mt-0.5">🔗 복수 계획 연동됨 (${s.planIds.length}건)</div>` : ""}`
            }
          </div>
          <!-- Step 3 요약 -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">③ 교육유형</div>
            ${
              s.subType
                ? (() => {
                    const item = s.purpose?.subtypes
                      ?.flatMap((g) => g.items)
                      .find((i) => i.id === s.subType);
                    const grp = s.purpose?.subtypes?.find((g) =>
                      g.items.some((i) => i.id === s.subType),
                    );
                    return `<div class="font-black text-sm text-gray-900">${item?.label || (typeof getEduTypeLabel !== "undefined" ? getEduTypeLabel(s.subType) : s.subType)}</div><div class="text-[11px] text-gray-400 mt-0.5">${grp?.group || ""}</div>`;
                  })()
                : s.eduType
                  ? `<div class="font-black text-sm text-gray-900">${typeof getEduTypeLabel !== "undefined" ? getEduTypeLabel(s.eduType) : s.eduType}</div><div class="text-[11px] text-blue-400 mt-0.5">계획에서 자동 설정됨</div>`
                  : '<div class="text-sm text-gray-400">—</div>'
            }
          </div>
        </div>
      </div>

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
                ? renderDynamicFormFields(
                    s.formTemplate.fields,
                    s,
                    "applyState",
                  )
                : "";
            if (dynamicHtml) {
              const tplBadge = s.formTemplate.name
                ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>`
                : "";
              return tplBadge + dynamicHtml;
            }
          }
          if (s.formTemplateLoading) {
            return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
          }
          // ── Phase B: 표준 렌더러 (정규화 컬럼 기반) ──
          if (typeof window.foRenderStandardApplyForm === 'function') {
            return window.foRenderStandardApplyForm(s, curBudget, s.formTemplate?.isInline ? s.formTemplate.inlineFields : null);
          }
          // ── 최후 Fallback: Phase B 렌더러 미로드 시 ──
          return `
        <!-- Region toggle -->
        <div class="inline-flex bg-gray-100 rounded-xl p-1">
          <button onclick="applyState.region='domestic';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "domestic" ? "bg-white text-accent shadow" : " text-gray-500"}">🗺 국내</button>
          <button onclick="applyState.region='overseas';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "overseas" ? "bg-white text-accent shadow" : "text-gray-500"}">🌏 해외</button>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">과정명 <span class="text-red-500">*</span></label>
          <input type="text" value="${s.title}" oninput="applyState.title=this.value" placeholder="교육/세미나/자격증 등 공식 명칭" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">시작일</label>
            <input type="date" value="${s.startDate}" oninput="applyState.startDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">종료일</label>
            <input type="date" value="${s.endDate}" oninput="applyState.endDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">총 학습시간 (H)</label>
          <input type="number" value="${s.hours}" oninput="applyState.hours=this.value" placeholder="0" class="w-40 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">학습 내용 <span class="text-red-500">*</span></label>
          <textarea oninput="applyState.content=this.value" rows="3" placeholder="학습 목표, 주요 커리큘럼 및 활용 방안을 입력하세요." class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
        </div>`;
        })()}

        <!-- Cost section -->
        ${
          s.useBudget === true
            ? `
      <div class="border-t border-gray-100 pt-5">
        ${
          curBudget?.account === "연구투자"
            ? `
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">R&D 총 투자금액</label>
        <div class="relative max-w-sm">
          <input type="number" value="${s.rndTotal}" oninput="applyState.rndTotal=this.value;renderApply()" class="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-5 py-5 font-black text-2xl text-brand focus:border-accent focus:bg-white transition pr-16"/>
          <span class="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-accent">원</span>
        </div>`
            : `
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-black text-gray-700 uppercase tracking-wide">📋 세부산출근거 <span style="font-size:10px;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:5px;font-weight:800">📚 직접학습용 (단가 × 수량)</span></h4>
          <button onclick="addExpRow()" class="text-xs font-black text-accent border-2 border-accent px-4 py-2 rounded-xl hover:bg-blue-50 transition">+ 항목 추가</button>
        </div>
        <div class="rounded-2xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50"><tr class="text-xs font-black text-gray-500 uppercase">
              <th class="px-4 py-3 text-left">항목</th><th class="px-4 py-3 text-right">단가</th><th class="px-4 py-3 text-center w-20">수량(명)</th><th class="px-4 py-3 text-right">소계</th><th class="px-4 py-3 text-left">비고</th><th class="px-4 py-3 w-10"></th>
            </tr></thead>
            <tbody class="divide-y divide-gray-100">
              ${s.expenses
                .map(
                  (e, i) => {
                    const slItems = (typeof _getCalcGroundsForType === "function")
                      ? _getCalcGroundsForType("self_learning", currentPersona?.vorgTemplateId || null, s.region === "overseas")
                      : [];
                    const itemOpts = slItems.length > 0
                      ? slItems.map(g => `<option value="${g.id}" data-price="${g.unitPrice}" ${(e.itemId||e.type)===g.id||(e.type===g.name)?'selected':''}>${g.name}</option>`).join('')
                      : ['교육비/등록비','교보재비','시험응시료','항공료','숙박비'].map(n=>`<option ${e.type===n?'selected':''}>${n}</option>`).join('');
                    return `
              <tr>
                <td class="px-4 py-3">
                  <select onchange="_applyExpTypeChange(this,${i})" class="bg-transparent text-sm font-bold text-gray-700 outline-none w-full">
                    ${itemOpts}
                  </select>
                </td>
                <td class="px-4 py-3"><input type="number" value="${e.price}" oninput="applyState.expenses[${i}].price=this.value;renderApply()" class="w-full text-right bg-transparent font-black text-gray-900 outline-none text-base"/></td>
                <td class="px-4 py-3"><input type="number" value="${e.qty}" oninput="applyState.expenses[${i}].qty=this.value;renderApply()" class="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 font-black text-accent outline-none"/></td>
                <td class="px-4 py-3 text-right font-black text-gray-900">${fmt(Number(e.price) * Number(e.qty))}</td>
                <td class="px-4 py-3"><input type="text" value="${e.note || ""}" oninput="applyState.expenses[${i}].note=this.value" placeholder="비고" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-accent transition min-w-[120px]"/></td>
                <td class="px-4 py-3 text-center"><button onclick="removeExpRow(${i})" class="text-gray-300 hover:text-red-500 transition text-lg">✕</button></td>
              </tr>`;
                  }
                )
                .join("")}
            </tbody>
            <tfoot class="bg-brand/5 border-t-2 border-brand">
              <tr><td colspan="4" class="px-4 py-3 font-black text-gray-500 text-xs uppercase">합계</td><td class="px-4 py-3 text-right font-black text-2xl text-accent">${fmt(totalExp)}원</td><td></td></tr>
            </tfoot>
          </table>
        </div>`
        }
      </div>

      <!-- Final summary card -->
      <div class="mt-6 bg-gray-950 rounded-3xl p-8 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 text-8xl opacity-5 translate-x-6 -translate-y-3">🎓</div>
        <div class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">${s.region === "overseas" ? "🌏 해외" : "🗺 국내"} 최종 집행 금액</div>
        <div class="text-5xl font-black tracking-tight mb-4">${fmt(totalAmt)}<span class="text-lg text-gray-500 ml-2 font-normal">원</span></div>
        ${
          curBudget
            ? `
        <div class="flex items-center gap-3 ${over ? "text-red-400" : "text-green-400"}">
          <span class="text-lg">${over ? "⚠️" : "✅"}</span>
          <span class="text-sm font-black">${over ? "잔액 부족 – 집행 불가" : "잔액 내 집행 가능"}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">${curBudget.name} 잔액: ${fmt(curBudget.balance - curBudget.used)}원</div>`
            : ""
        }
      </div>`
            : ""
        }
      </div>

      <div class="flex justify-between mt-8 border-t border-gray-100 pt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
        <div class="flex gap-3">
          <button onclick="saveApplyDraft()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition">💾 임시저장</button>
          <button onclick="saveApplyAsReady()" ${over ? "disabled" : ""}
            class="px-7 py-3 rounded-xl font-black text-sm transition ${over ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"}">
            ✅ 저장
          </button>
        </div>
      </div>
    </div>
  
  ${
    s.showMultiPlanModal
      ? `
  <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center fade-in">
    <div class="bg-white rounded-2xl w-[500px] shadow-2xl p-6">
      <h3 class="text-lg font-black mb-4">운영 예산: 복수 계획 선택</h3>
      <div class="space-y-2 max-h-[300px] overflow-y-auto mb-4 p-1">
        ${operPlans
          .map(
            (p) => `
        <label class="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition ${s.planIds?.includes(p.id) ? "border-violet-500 bg-violet-50" : "border-gray-200"}">
          <input type="checkbox" value="${p.id}" ${s.planIds?.includes(p.id) ? "checked" : ""} onchange="toggleOperPlan('${p.id}')" class="w-4 h-4 text-violet-600 rounded">
          <div>
            <div class="font-bold text-sm text-gray-900">[${p.id}] ${p.title}</div>
            <div class="text-xs text-gray-500">예산 편성금액: ${fmt(p.amount)}원</div>
          </div>
        </label>
        `,
          )
          .join("")}
      </div>
      <div class="flex justify-end gap-2">
        <button onclick="applyState.showMultiPlanModal=false;renderApply()" class="px-6 py-2 bg-brand text-white font-bold rounded-xl hover:bg-blue-900 transition">확인</button>
      </div>
    </div>
  </div>`
      : ""
  }
</div > `;
}

// ─── APPLY FORM HELPERS ─────────────────────────────────────────────────────