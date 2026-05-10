// ─── RESULT (교육결과 등록) — 교육신청과 통일된 4단계 위저드 ────────────────────
// Step 1: 교육 목적 선택
// Step 2: 예산 계정 선택 (패턴 감지: A/B=신청기반, C=직접등록/사후정산)
// Step 3: 교육유형 선택
// Step 4: 세부정보 + 결과 작성

// ─── 상태 관리 ─────────────────────────────────────────────────────────────
let _resultWizardState = null;
let _resultViewMode = "list"; // 'list' | 'wizard'
let _resultDbLoaded = false;
let _resultDbRows = [];
let _resultYear = new Date().getFullYear();
let _resultApprovedApps = [];
let _resultApprovedAppsLoaded = false;

// ── Phase1: 결과등록 허브 상태 (교육신청과 동일 패턴) ──────────────────────
let _resultSelectedVorgId = null;
let _resultSelectedVorgName = null;
let _resultSelectedAccountCode = null;
let _resultSelectedAccountName = null;
let _resultUserVorgList = [];
let _resultSelectedVorgOwnedAccounts = [];
let _resultAccountListViewMode = 'both';

function _resetResultWizardState() {
  return {
    step: 1,
    // Step 1: 교육 목적
    purpose: null,
    // Step 2: 예산 계정
    budgetId: "",
    budgetChoice: "", // 개인직무: 'general' | 'rnd' | 'none'
    useBudget: null,
    processPattern: null, // 감지된 패턴
    mode: null, // 'from_application' | 'direct'
    // Step 2: 신청 기반
    selectedAppId: null,
    selectedApp: null,
    planIds: [],
    planId: "",
    // Step 3: 교육유형
    eduType: null,
    eduSubType: null,
    learningType: "",
    // Step 4: 세부정보 + 결과
    title: "",
    date: "",
    endDate: "",
    hours: "",
    provider: "",
    expenses: [{ item: "수강료", price: "", qty: 1 }],
    completed: "yes",
    actualHours: "",
    actualCost: 0,
    satisfaction: 5,
    feedback: "",
    // ★ BO 양식 동기화
    formTemplate: null,
    formTemplateLoading: false,
  };
}

// ─── 메인 렌더러 ──────────────────────────────────────────────────────────
function renderResult() {
  if (_resultWizardState) {
    if (_resultWizardState.confirmMode) {
      _renderResultConfirm();
    } else {
      _renderResultWizard();
    }
  } else {
    // ── Phase1: 허브 라우팅 (계정 미선택이면 허브 표시) ──
    if (!_resultSelectedAccountCode) {
      if (!_resultSelectedVorgId) {
        _renderResultVorgHub();
        return;
      }
      _renderResultAccountHub();
      return;
    }
    _renderResultList();
  }
}

// ─── 결과 목록 ────────────────────────────────────────────────────────────
function _renderResultList() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_resultDbLoaded) {
    _resultDbLoaded = true;
    let _rQuery = sb.from("applications")
      .select("*")
      .eq("applicant_id", currentPersona.id)
      .eq("tenant_id", currentPersona.tenantId)
      .in("status", ["completed", "result_pending"]);
    // ★ Phase1: 선택된 계정으로 필터
    if (_resultSelectedAccountCode) _rQuery = _rQuery.eq("account_code", _resultSelectedAccountCode);
    _rQuery.order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          _resultDbRows = data.map((d) => ({
            id: d.id,
            title: d.edu_name || "-",
            type: d.edu_type || "",
            date: d.created_at?.slice(0, 10) || "",
            amount: Number(d.amount || 0),
            status: d.status,
            resultType:
              d.detail?.resultType ||
              (d.detail?.result ? "from_application" : "direct"),
            completed: d.detail?.result?.completed ?? true,
            satisfaction: d.detail?.result?.satisfaction || 0,
          }));
        }
        _renderResultList();
      });
    document.getElementById("page-result").innerHTML =
      `<div class="max-w-5xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⌛</div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">결과 데이터 로딩 중...</div>
    </div>`;
    return;
  }

  const results = _resultDbRows;
  const stats = {
    total: results.length,
    completed: results.filter((r) => r.completed).length,
    pending: results.filter((r) => r.status === "result_pending").length,
  };

  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_resultYear=Number(this.value);_renderResultList()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map((y) => `<option value="${y}" ${_resultYear === y ? "selected" : ""}>${y}년</option>`).join("")}
  </select>`;

  const STATUS_CFG = {
    completed: {
      color: "#059669",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      icon: "✅",
      label: "등록완료",
    },
    result_pending: {
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      icon: "⏳",
      label: "검토중",
    },
  };

  const listHtml =
    results.length > 0
      ? results
          .map((r) => {
            const cfg = STATUS_CFG[r.status] || STATUS_CFG.completed;
            const typeLabel =
              r.resultType === "from_application" ? "신청 기반" : "직접 등록";
            const typeBadgeBg =
              r.resultType === "from_application" ? "#DBEAFE" : "#FEF3C7";
            const typeBadgeColor =
              r.resultType === "from_application" ? "#1D4ED8" : "#D97706";
            return `
      <div onclick="viewResultDetail('${r.id}')" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                  border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s;margin-bottom:12px;cursor:pointer"
           onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)';this.style.transform='translateY(-1px)'"
           onmouseout="this.style.boxShadow='none';this.style.transform='none'">
        <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:900;color:#111827">${r.title}</span>
            <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${cfg.label}</span>
            <span style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;background:${typeBadgeBg};color:${typeBadgeColor}">${typeLabel}</span>
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>📅 ${r.date}</span>
            <span>💰 ${(r.amount || 0).toLocaleString()}원</span>
            ${r.satisfaction ? `<span>⭐ ${r.satisfaction}/5</span>` : ""}
          </div>
        </div>
      </div>`;
          })
          .join("")
      : `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
        <div style="font-size:48px;margin-bottom:16px">📝</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">
          ${_resultYear}년 교육결과가 아직 없습니다
        </div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
          교육 이수 후 결과를 등록하면 학습 이력이 기록됩니다.<br>
          아래 버튼으로 교육결과를 등록해 보세요.
        </div>
        <button onclick="_resultWizardState=_resetResultWizardState();renderResult()"
          style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          + 교육결과 등록하기
        </button>
      </div>`;

  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
    ${[
      {
        label: "전체",
        val: stats.total,
        color: "#002C5F",
        bg: "#EFF6FF",
        icon: "📋",
      },
      {
        label: "등록완료",
        val: stats.completed,
        color: "#059669",
        bg: "#F0FDF4",
        icon: "✅",
      },
      {
        label: "검토중",
        val: stats.pending,
        color: "#D97706",
        bg: "#FFFBEB",
        icon: "⏳",
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

  document.getElementById("page-result").innerHTML = `
<div class="max-w-5xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
        HOME › ${_resultUserVorgList.length > 1 ? `<span onclick="_resultSelectedVorgId=null;_resultSelectedAccountCode=null;_resultDbLoaded=false;renderResult()" style="cursor:pointer;text-decoration:underline;color:#6B7280">교육결과</span>` : `<span style="color:#002C5F">교육결과</span>`}
        ${_resultSelectedAccountName ? ` › <span style="color:#002C5F">${_resultSelectedAccountName}</span>` : ''}
      </div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육결과 등록</h1>
      <p class="text-gray-500 text-sm mt-1">${currentPersona.name} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      <button onclick="_resultWizardState=_resetResultWizardState();renderResult()"
        class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
        + 결과 등록
      </button>
    </div>
  </div>
  ${statsBar}
  <div id="result-list">${listHtml}</div>
</div>`;
}

// ─── 결과 등록 위저드 ─────────────────────────────────────────────────────
function _renderResultWizard() {
  const s = _resultWizardState;
  if (!s) return;

  const allPurposes =
    typeof getPersonaPurposes === "function"
      ? getPersonaPurposes(currentPersona, typeof _resultSelectedAccountCode !== "undefined" ? _resultSelectedAccountCode : null)
      : [];
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
        };
  const _catColors = {
    "self-learning": {
      badge: "bg-blue-100 text-blue-600",
      border: "border-accent",
      bgActive: "bg-blue-50",
      textActive: "text-accent",
    },
    "edu-operation": {
      badge: "bg-violet-100 text-violet-600",
      border: "border-violet-500",
      bgActive: "bg-violet-50",
      textActive: "text-violet-600",
    },
  };
  const categorized = {};

  // 전체 목적을 표시 (Pre-Wizard 없이 위저드 내부에서 필터링)
  const filteredPurposes = allPurposes;

  filteredPurposes.forEach((p) => {
    const cat = p.category || "edu-operation";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(p);
  });

  // 예산 계정 정보
  const availBudgets = s.purpose
    ? typeof getPersonaBudgets === "function"
      ? getPersonaBudgets(currentPersona, s.purpose.id)
      : []
    : [];
  const curBudget = availBudgets.find((b) => b.id === s.budgetId) || null;

  // 패턴 감지
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
  const detectedPattern = _processInfo?.pattern || null;

  // Step 라벨 (Phase1: 3단계)
  const stepLabels = ["목적 선택", "교육유형 선택", "결과 등록"];
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

  let bodyHtml = "";

  // ═══════════════════════════════════════════════════════════════════
  // Step 1: 교육 목적 선택 (교육신청과 동일)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 1) {
    bodyHtml = `
    <h3 class="text-base font-black text-gray-800 mb-5">01. 교육 목적 선택</h3>
    <p class="text-sm text-gray-400 mb-5">결과를 등록할 교육의 목적을 선택하세요.</p>
    ${["self-learning", "edu-operation"]
      .map((catKey) => {
        const items = categorized[catKey] || [];
        if (items.length === 0) return "";
        const meta = _catMeta[catKey] || _catMeta["edu-operation"];
        const colors = _catColors[catKey] || _catColors["edu-operation"];
        return `
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="px-3 py-1 rounded-full text-xs font-black ${colors.badge}">${meta.icon} ${meta.label}</span>
          <span class="text-xs text-gray-400">${meta.desc}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-${Math.min(items.length, 3)} gap-3">
          ${items
            .map((p) => {
              const active = s.purpose?.id === p.id;
              return `
          <button onclick="_resultSelectPurpose('${p.id}')"
            class="text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white hover:" + colors.border}">
            <div class="text-2xl mb-2">${p.icon || "📋"}</div>
            <div class="font-black text-sm ${active ? colors.textActive : "text-gray-900"}">${p.label}</div>
            <div class="text-xs text-gray-500 mt-1">${p.desc || ""}</div>
          </button>`;
            })
            .join("")}
        </div>
      </div>`;
      })
      .join("")}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 2 (Budget): 허브에서 사전 선택되므로 숨김
  // ═══════════════════════════════════════════════════════════════════
  if (false) { // Phase1: 예산 허브에서 사전 선택됨
    const isInd = s.purpose?.id === "external_personal";

    if (isInd) {
      // 개인직무 사외학습: 일반/R&D/무예산 분기 (교육신청과 동일)
      bodyHtml = `
      <div style="padding:12px 16px;border-radius:12px;background:#EFF6FF;border:1.5px solid #BFDBFE;margin-bottom:20px">
        <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-right:6px">🔖 선택 내용</span>
        <span style="font-size:10px;font-weight:800;color:#6B7280">| 목적</span>
        <span style="font-size:11px;font-weight:900;color:#1E40AF;margin-left:4px">${s.purpose.label}</span>
      </div>
      <h3 class="text-base font-black text-gray-800 mb-2">02. 예산 선택</h3>
      <p class="text-sm text-gray-400 mb-5">이번 결과 등록에 연관된 예산을 선택하세요.</p>
      <div style="display:grid;gap:8px">
        ${_renderResultBudgetChoices(s)}
      </div>`;
    } else {
      // 교육운영: 정책 기반 예산 계정 목록
      const policyBudgets =
        typeof getPersonaBudgets === "function"
          ? getPersonaBudgets(currentPersona, s.purpose?.id)
          : [];
      bodyHtml = `
      <div style="padding:12px 16px;border-radius:12px;background:#EFF6FF;border:1.5px solid #BFDBFE;margin-bottom:20px">
        <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-right:6px">🔖 선택 내용</span>
        <span style="font-size:10px;font-weight:800;color:#6B7280">| 목적</span>
        <span style="font-size:11px;font-weight:900;color:#1E40AF;margin-left:4px">${s.purpose.label}</span>
      </div>
      <h3 class="text-base font-black text-gray-800 mb-2">02. 예산 선택</h3>
      <p class="text-sm text-gray-400 mb-5">결과를 등록할 예산 계정을 선택하세요.</p>
      ${
        policyBudgets.length === 0
          ? `<p class="text-sm text-gray-500 mb-4 font-bold"><span class="text-orange-500">⚠️</span> 이 교육 목적에 사용 가능한 예산 계정이 없습니다.</p>`
          : `<div style="display:grid;gap:8px">
        ${policyBudgets
          .map((b) => {
            const active = s.budgetId === b.id;
            const acctTypeLabel =
              b.account === "운영"
                ? "운영 계정"
                : b.account === "참가"
                  ? "참가 계정"
                  : b.account + " 계정";
            return `<button onclick="_resultSelectBudget('${b.id}')"
    style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};
           background:${active ? "#EFF6FF" : "white"};cursor:pointer;width:100%;transition:all .15s">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <span style="font-size:14px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${b.name}</span>
        <div style="font-size:11px;color:#9CA3AF;margin-top:3px">${acctTypeLabel}</div>
      </div>
      ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ""}
    </div>
  </button>`;
          })
          .join("")}
      </div>`
      }
      ${
        _processInfo
          ? `
      <div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:16px 18px">
        <div style="font-size:10px;font-weight:900;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <span style="width:5px;height:5px;background:#22C55E;border-radius:50%;display:inline-block"></span>
          이 교육의 프로세스 패턴: ${_processInfo.pattern}
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
        // 패턴 A/B: 신청 기반 결과 등록 → 신청 선택 영역
        if (
          detectedPattern &&
          ["A", "B"].includes(detectedPattern) &&
          s.budgetId
        ) {
          return _renderResultAppBasedSection(s);
        }
        return "";
      })()}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 2: 교육유형 선택 (AS-IS Step 3)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 2) {
    const eduTree =
      typeof getPolicyEduTree === "function" && s.purpose
        ? getPolicyEduTree(currentPersona, s.purpose.id, curBudget?.accountCode)
        : [];
    bodyHtml = `
    <h3 class="text-base font-black text-gray-800 mb-2">02. 교육유형 선택</h3>
    <p class="text-sm text-gray-400 mb-5">결과를 등록할 교육의 유형을 선택하세요.</p>
    ${
      eduTree.length > 0
        ? `
    <div style="display:grid;gap:12px">
      ${eduTree
        .map(
          (cat) => `
      <div>
        <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">${cat.icon || "📂"}</span> ${cat.label}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
          ${cat.children
            .map((lt) => {
              const active = s.learningType === lt.value;
              return `
          <button onclick="_resultSelectEduType('${lt.value}','${cat.value}')"
            style="padding:14px 12px;border-radius:12px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};
                   background:${active ? "#EFF6FF" : "white"};text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:4px">${lt.icon || "📘"}</div>
            <div style="font-size:12px;font-weight:${active ? 900 : 700};color:${active ? "#002C5F" : "#374151"}">${lt.label}</div>
          </button>`;
            })
            .join("")}
        </div>
      </div>`,
        )
        .join("")}
    </div>`
        : `
    <div style="padding:40px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
      <div style="font-size:36px;margin-bottom:12px">📭</div>
      <div style="font-size:14px;font-weight:900;color:#374151">이 교육 목적에 사용 가능한 교육유형이 없습니다</div>
    </div>`
    }`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 3: 세부정보 + 결과 작성 (AS-IS Step 4)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 3) {
    // ★ 양식 로딩 중
    if (s.formTemplateLoading) {
      bodyHtml = `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
    } else {
    const isAppBased = s.mode === "from_application" && s.selectedApp;
    // ★ BO 양식 배지
    const tplBadge = s.formTemplate && s.formTemplate.name
      ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>`
      : "";
    // ★ inlineFields 기반 필드 가시성 헬퍼
    const inline = (s.formTemplate && s.formTemplate.isInline && s.formTemplate.inlineFields) || {};
    const inlineKeys = Object.keys(inline);
    const hasExplicitFields = inlineKeys.length > 0;
    const _shouldShow = (key, defaultShow = true) => {
      if (inline[key] === false) return false;
      if (hasExplicitFields) return inline[key] !== undefined && inline[key] !== false;
      return defaultShow;
    };
    const selectedInfo = `
    <div style="margin-bottom:20px;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE;border-radius:12px">
      <div style="font-size:10px;font-weight:900;color:#1D4ED8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📋 선택 정보</div>
      <div style="font-size:12px;color:#6B7280;line-height:1.8">
        <strong>목적:</strong> ${s.purpose?.label || "-"} &nbsp;
        <strong>유형:</strong> ${s.learningType || "-"} &nbsp;
        ${isAppBased ? `<strong>연계 신청:</strong> ${s.selectedApp.title}` : ""}
      </div>
    </div>`;

    if (isAppBased) {
      // 패턴 A/B: 신청 기반 → Q-MP5 Line Items 결과 분리 등록 + 결과 작성
      bodyHtml = `
      <h3 class="text-base font-black text-gray-800 mb-4">03. 교육 결과 작성</h3>
      ${tplBadge}${selectedInfo}
      ${_renderLineItemResultSection(s)}
      ${_renderStep4ResultForm(s, _shouldShow)}`;
    } else {
      // 패턴 C: 직접 입력 (사후 정산) → 교육정보 + 결과 작성
      bodyHtml = `
      <h3 class="text-base font-black text-gray-800 mb-4">03. 교육 정보 및 결과 작성</h3>
      ${tplBadge}${selectedInfo}
      ${_renderStep4DirectInfo(s, _shouldShow)}
      <div style="margin:24px 0;border-top:2px solid #E5E7EB"></div>
      <h3 class="text-base font-black text-gray-800 mb-4">교육 결과</h3>
      ${_renderStep4ResultForm(s, _shouldShow)}`;
    }
    }
  }

  // 다음 버튼 활성 조건
  // Phase1: 3단계 canNext
  const canNext = (() => {
    if (s.step === 1) return !!s.purpose;
    if (s.step === 2) return !!s.learningType;
    return true;
  })();

  document.getElementById("page-result").innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="_resultWizardState=null;renderResult()" style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#002C5F'" onmouseout="this.style.color='#6B7280'">
        ← 결과 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육결과 등록</h1>
    </div>
  </div>

  <div class="card p-5">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <div class="card p-8">
    ${bodyHtml}

    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      ${s.step > 1 ? `<button onclick="_resultPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>` : "<div></div>"}
      ${
        s.step < 3
          ? `<button onclick="_resultNext()" ${!canNext ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">다음 →</button>`
          : ""
      }
      ${
        s.step === 3
          ? `<button onclick="_submitResultRegistration()"
        class="px-10 py-3 rounded-xl font-black text-sm bg-brand text-white hover:bg-blue-900 shadow-lg transition">📤 결과 제출</button>`
          : ""
      }
    </div>
  </div>
</div>`;
}

// ─── 개인직무 예산 선택 카드 (페르소나 allowedAccounts 기반 동적 필터링) ──────
function _renderResultBudgetChoices(s) {
  const allowed = currentPersona.allowedAccounts || [];
  const hasRnd = allowed.some((a) => a.includes("RND"));
  const hasHscExt = allowed.includes("HSC-EXT");
  const hasHaeEdu = allowed.includes("HAE-EDU");
  const hasHaeTeam = allowed.includes("HAE-TEAM");
  const hasPart = allowed.some(
    (a) => a.includes("-PART") || a.includes("-OPS") || a.includes("-ETC"),
  );
  const hasFree = allowed.includes("COMMON-FREE");

  const choices = [
    // HAE 전사교육예산
    ...(hasHaeEdu
      ? [
          {
            key: "general",
            icon: "🏢",
            title: "전사교육예산",
            desc: "전사교육예산에서 지원합니다.",
            tag: "예산 사용",
            tagBg: "#EDE9FE",
            tagColor: "#7C3AED",
            nextColor: "#7C3AED",
            next: "교육유형 선택 → 결과 등록",
          },
        ]
      : []),
    // HAE 팀/프로젝트 할당예산
    ...(hasHaeTeam
      ? [
          {
            key: "general",
            icon: "👥",
            title: "팀/프로젝트 할당예산",
            desc: "팀 및 프로젝트 단위로 배정된 교육예산에서 결과를 등록합니다.",
            tag: "예산 사용",
            tagBg: "#F0FDF4",
            tagColor: "#059669",
            nextColor: "#059669",
            next: "교육유형 선택 → 결과 등록",
          },
        ]
      : []),
    // HSC 사외교육 계정
    ...(hasHscExt
      ? [
          {
            key: "general",
            icon: "🏭",
            title: "현대제철-사외교육 계정",
            desc: "현대제철 사외교육 예산으로 결과를 등록합니다.",
            tag: "예산 사용",
            tagBg: "#FFF1F2",
            tagColor: "#BE123C",
            nextColor: "#BE123C",
            next: "교육유형 선택 → 결과 등록",
          },
        ]
      : []),
    // 일반 참가계정 (HMC/KIA 등 — HAE, HSC 아닌 경우)
    ...(!hasHscExt && !hasHaeEdu && hasPart
      ? [
          {
            key: "general",
            icon: "💳",
            title: "일반교육예산",
            desc: "일반 교육예산에서 지원합니다.",
            tag: "예산 사용",
            tagBg: "#DBEAFE",
            tagColor: "#1D4ED8",
            nextColor: "#1D4ED8",
            next: "교육유형 선택 → 결과 등록",
          },
        ]
      : []),
    // R&D 교육예산 (R&D VOrg 소속 팀만)
    ...(hasRnd
      ? [
          {
            key: "rnd",
            icon: "🔬",
            title: "R&D교육예산",
            desc: "사전 승인받은 R&D 교육계획과 연동합니다.",
            tag: "계획 연동 필수",
            tagBg: "#EDE9FE",
            tagColor: "#7C3AED",
            nextColor: "#7C3AED",
            next: "교육계획 선택 → 결과 등록",
          },
        ]
      : []),
    // 예산 미사용 (COMMON-FREE 정책 계정이 있을 때만)
    ...(hasFree
      ? [
          {
            key: "none",
            icon: "📝",
            title: "예산 미사용",
            desc: "예산 차감 없이 교육 이력만 등록합니다.",
            tag: "무예산",
            tagBg: "#F0FDF4",
            tagColor: "#15803D",
            nextColor: "#15803D",
            next: "교육유형 선택 → 결과 등록",
          },
        ]
      : []),
  ];

  if (choices.length === 0) {
    return `<div style="padding:24px;text-align:center;border-radius:14px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:36px;margin-bottom:8px">⚠️</div>
      <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">사용 가능한 예산 계정이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF">백오피스 관리자에게 문의하세요.</div>
    </div>`;
  }

  return choices
    .map((ch) => {
      const active = s.budgetChoice === ch.key;
      const col =
        ch.key === "rnd"
          ? "#7C3AED"
          : ch.key === "none"
            ? "#15803D"
            : ch.tagColor || "#1D4ED8";
      return `
  <button onclick="_resultSelectBudgetChoice('${ch.key}')"
    style="text-align:left;padding:20px;border-radius:16px;border:2px solid ${active ? col : "#E5E7EB"};
           background:${active ? col + "08" : "white"};cursor:pointer;width:100%;transition:all .15s">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:24px;flex-shrink:0">${ch.icon}</div>
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
    })
    .join("");
}

// ─── 패턴 A/B: 승인된 교육신청 선택 ────────────────────────────────────────
function _renderResultAppBasedSection(s) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_resultApprovedAppsLoaded) {
    _resultApprovedAppsLoaded = true;
    sb.from("applications")
      .select("*")
      .eq("applicant_id", currentPersona.id)
      .eq("tenant_id", currentPersona.tenantId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        _resultApprovedApps = (data || []).map((d) => ({
          id: d.id,
          title: d.edu_name || "-",
          type: d.edu_type || "",
          date: d.created_at?.slice(0, 10) || "",
          amount: Number(d.amount || 0),
          account: d.account_code || "",
          hasResult: !!d.detail?.result,
        }));
        renderResult();
      });
    return `<div style="margin-top:16px;padding:20px;text-align:center;color:#6B7280"><div style="font-size:28px;margin-bottom:8px">⌛</div>승인된 교육신청 로딩 중...</div>`;
  }

  const apps = _resultApprovedApps.filter((a) => !a.hasResult);
  if (apps.length === 0) {
    return `
    <div style="margin-top:16px;padding:24px;text-align:center;border-radius:14px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:36px;margin-bottom:8px">📭</div>
      <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">결과를 등록할 교육신청이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF">승인완료된 교육신청이 있어야 결과를 등록할 수 있습니다.</div>
    </div>`;
  }

  return `
  <div style="margin-top:16px">
    <div style="font-size:13px;font-weight:900;color:#1D4ED8;margin-bottom:10px">📋 결과를 등록할 교육신청 선택</div>
    <div style="display:grid;gap:8px">
      ${apps
        .map((a) => {
          const active = s.selectedAppId === a.id;
          return `
      <button onclick="_resultSelectApp('${a.id.replace(/'/g, "\\'")}', ${JSON.stringify(a).replace(/"/g, "&quot;")})"
        style="text-align:left;padding:16px 18px;border-radius:12px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};background:${active ? "#EFF6FF" : "white"};cursor:pointer;width:100%;transition:all .15s">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${a.title}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:3px">📅 ${a.date} · 💰 ${a.amount.toLocaleString()}원</div>
          </div>
          ${active ? '<span style="font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ""}
        </div>
      </button>`;
        })
        .join("")}
    </div>
  </div>`;
}

// ─── Step 4: 직접 입력 교육정보 ──────────────────────────────────────────
function _renderStep4DirectInfo(s, _shouldShow) {
  const show = _shouldShow || (() => true);
  const fields = [];
  // 교육과정명
  if (show('course_name', true) || show('edu_name', true)) {
    fields.push(`
    <div>
      <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육과정명 <span style="color:#EF4444">*</span></label>
      <input value="${s.title}" onchange="_resultWizardState.title=this.value"
        style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box"
        placeholder="예: AWS 솔루션스 아키텍트 자격증 과정">
    </div>`);
  }
  // 교육 시작일/종료일
  if (show('start_end_date', true)) {
    fields.push(`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 시작일 <span style="color:#EF4444">*</span></label>
        <input type="date" value="${s.date}" onchange="_resultWizardState.date=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 종료일 <span style="color:#EF4444">*</span></label>
        <input type="date" value="${s.endDate}" onchange="_resultWizardState.endDate=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box">
      </div>
    </div>`);
  }
  // 학습시간 + 교육기관
  const showHours = show('actual_hours', true) || show('hours_per_round', true);
  const showOrg = show('edu_org', true) || show('institution_name', true);
  if (showHours || showOrg) {
    fields.push(`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${showHours ? `<div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">학습 시간(H)</label>
        <input type="number" value="${s.hours}" onchange="_resultWizardState.hours=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box" placeholder="8">
      </div>` : '<div></div>'}
      ${showOrg ? `<div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육기관</label>
        <input value="${s.provider}" onchange="_resultWizardState.provider=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box" placeholder="교육기관명">
      </div>` : '<div></div>'}
    </div>`);
  }
  return `<div style="display:grid;gap:14px">${fields.join('')}</div>`;
}

// ─── Q-MP5: Line Item별 결과 분리 등록 ─────────────────────────────────────
let _resultLineItems = [];
let _resultLineItemsLoading = false;
let _resultLineItemsLoadedForApp = null;

function _renderLineItemResultSection(s) {
  if (!s.selectedApp || !s.selectedAppId) return '';

  // 비동기 로드 (1회만)
  if (_resultLineItemsLoadedForApp !== s.selectedAppId) {
    if (!_resultLineItemsLoading) {
      _resultLineItemsLoading = true;
      const sb = typeof getSB === 'function' ? getSB() : null;
      if (sb) {
        sb.from('application_plan_items')
          .select('id, plan_id, plan_title, subtotal, result_status')
          .eq('application_id', s.selectedAppId)
          .order('created_at', { ascending: true })
          .then(({ data, error }) => {
            _resultLineItemsLoading = false;
            _resultLineItemsLoadedForApp = s.selectedAppId;
            if (!error && data && data.length > 0) {
              _resultLineItems = data.map(item => ({
                ...item,
                // 결과 입력 필드 초기값
                _completed: item.result_status === 'approved' ? 'yes' : 'pending',
                _satisfaction: 5,
                _feedback: '',
                _actualHours: '',
              }));
              // 위저드 상태에 연동
              s.lineItemResults = _resultLineItems;
            } else {
              _resultLineItems = [];
              s.lineItemResults = [];
            }
            renderResult();
          });
      }
    }
    return '<div style="margin-bottom:20px;padding:20px;text-align:center;color:#6B7280;font-size:13px"><div style="font-size:24px;margin-bottom:6px">⏳</div>교육계획 Line Items 로딩 중...</div>';
  }

  // Line Items가 없으면 (레거시 단건 신청) → 빈 문자열 반환, 기존 폼만 사용
  if (_resultLineItems.length === 0) return '';

  const fmt = n => Number(n || 0).toLocaleString();
  const totalSub = _resultLineItems.reduce((s, it) => s + Number(it.subtotal || 0), 0);

  return `
  <div style="margin-bottom:24px;border-radius:16px;border:2px solid #BFDBFE;overflow:hidden">
    <div style="padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:13px;font-weight:900;color:#1D4ED8;display:flex;align-items:center;gap:6px">
          📋 교육계획별 결과 등록 <span style="font-size:10px;padding:2px 8px;background:#DBEAFE;border-radius:6px;font-weight:800">Q-MP5</span>
        </div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">각 교육계획별로 수료여부와 만족도를 개별 입력할 수 있습니다.</div>
      </div>
      <div style="font-size:12px;font-weight:900;color:#1D4ED8">${_resultLineItems.length}건 · ${fmt(totalSub)}원</div>
    </div>
    <div style="padding:0">
      ${_resultLineItems.map((item, idx) => {
        const completed = s.lineItemResults?.[idx]?._completed || 'pending';
        const satisfaction = s.lineItemResults?.[idx]?._satisfaction ?? 5;
        const feedback = s.lineItemResults?.[idx]?._feedback || '';
        const actualHours = s.lineItemResults?.[idx]?._actualHours || '';
        const statusColor = completed === 'yes' ? '#059669' : completed === 'no' ? '#DC2626' : '#D97706';
        const statusLabel = completed === 'yes' ? '✅ 수료' : completed === 'no' ? '❌ 미수료' : '⏳ 미입력';
        const statusBg = completed === 'yes' ? '#F0FDF4' : completed === 'no' ? '#FEF2F2' : '#FFFBEB';
        return `
      <div style="border-top:1px solid #E5E7EB">
        <div style="padding:14px 18px;display:flex;align-items:flex-start;gap:14px;background:${statusBg}">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
              <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:#E0E7FF;color:#4338CA">#${idx + 1}</span>
              <span style="font-size:13px;font-weight:900;color:#111827">${item.plan_title || '교육계획'}</span>
              <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;background:${statusColor}15;color:${statusColor}">${statusLabel}</span>
            </div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:10px">
              💰 ${fmt(item.subtotal)}원
              ${item.result_status ? ' · 현재 상태: ' + item.result_status : ''}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:10px;font-weight:800;color:#374151;display:block;margin-bottom:3px">수료여부</label>
                <div style="display:flex;gap:4px">
                  ${['yes', 'no'].map(v => `
                  <button onclick="_updateLineItemResult(${idx},'_completed','${v}')"
                    style="flex:1;padding:7px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;
                    border:1.5px solid ${completed === v ? (v === 'yes' ? '#059669' : '#DC2626') : '#E5E7EB'};
                    background:${completed === v ? (v === 'yes' ? '#F0FDF4' : '#FEF2F2') : 'white'};
                    color:${completed === v ? (v === 'yes' ? '#059669' : '#DC2626') : '#9CA3AF'}">${v === 'yes' ? '✅ 수료' : '❌ 미수료'}</button>`).join('')}
                </div>
              </div>
              <div>
                <label style="font-size:10px;font-weight:800;color:#374151;display:block;margin-bottom:3px">만족도 (1~5)</label>
                <div style="display:flex;gap:3px">
                  ${[1,2,3,4,5].map(n => `
                  <button onclick="_updateLineItemResult(${idx},'_satisfaction',${n})"
                    style="width:28px;height:28px;border-radius:6px;font-size:12px;cursor:pointer;
                    border:1.5px solid ${satisfaction >= n ? '#F59E0B' : '#E5E7EB'};
                    background:${satisfaction >= n ? '#FEF3C7' : 'white'};
                    color:${satisfaction >= n ? '#D97706' : '#D1D5DB'}">${n <= satisfaction ? '★' : '☆'}</button>`).join('')}
                </div>
              </div>
            </div>
            <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:10px;font-weight:800;color:#374151;display:block;margin-bottom:3px">실참석시간(H)</label>
                <input type="number" value="${actualHours}" placeholder="8"
                  onchange="_updateLineItemResult(${idx},'_actualHours',this.value)"
                  style="width:100%;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box">
              </div>
              <div>
                <label style="font-size:10px;font-weight:800;color:#374151;display:block;margin-bottom:3px">비고</label>
                <input value="${feedback}" placeholder="특이사항 입력"
                  onchange="_updateLineItemResult(${idx},'_feedback',this.value)"
                  style="width:100%;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box">
              </div>
            </div>
          </div>
        </div>
      </div>`;
      }).join('')}
    </div>
  </div>`;
}

function _updateLineItemResult(idx, field, value) {
  if (!_resultWizardState || !_resultWizardState.lineItemResults) return;
  if (_resultWizardState.lineItemResults[idx]) {
    _resultWizardState.lineItemResults[idx][field] = value;
    renderResult();
  }
}

// ─── Step 4: 결과 작성 폼 ────────────────────────────────────────────────
function _renderStep4ResultForm(s, _shouldShow) {
  const show = _shouldShow || (() => true);
  const fields = [];
  // 수료여부
  if (show('is_completed', true)) {
    fields.push(`
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">수료여부 <span style="color:#EF4444">*</span></label>
      <div style="display:flex;gap:10px">
        ${["yes", "no"]
          .map(
            (v) => `
        <button onclick="_resultWizardState.completed='${v}';renderResult()"
          style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;
                 border:2px solid ${s.completed === v ? "#059669" : "#E5E7EB"};
                 background:${s.completed === v ? "#F0FDF4" : "white"};
                 color:${s.completed === v ? "#059669" : "#6B7280"}">
          ${v === "yes" ? "✅ 수료" : "❌ 미수료"}
        </button>`,
          )
          .join("")}
      </div>
    </div>`);
  }
  // 실참석시간
  if (show('actual_hours', true)) {
    fields.push(`
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">실 참석시간 (시간)</label>
      <input type="number" value="${s.actualHours}" placeholder="예: 16"
        oninput="_resultWizardState.actualHours=this.value"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
    </div>`);
  }
  // 만족도
  if (show('satisfaction_rating', true)) {
    fields.push(`
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">만족도 (1~5)</label>
      <div style="display:flex;gap:8px">
        ${[1, 2, 3, 4, 5]
          .map(
            (v) => `
        <button onclick="_resultWizardState.satisfaction=${v};renderResult()"
          style="width:44px;height:44px;border-radius:10px;font-size:18px;cursor:pointer;
                 border:2px solid ${s.satisfaction >= v ? "#F59E0B" : "#E5E7EB"};
                 background:${s.satisfaction >= v ? "#FFFBEB" : "white"}">⭐</button>`,
          )
          .join("")}
      </div>
    </div>`);
  }
  // 소감
  if (show('review_comment', true) || show('remarks', true)) {
    fields.push(`
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">교육 소감</label>
      <textarea oninput="_resultWizardState.feedback=this.value" rows="4"
        placeholder="교육의 유익한 점, 실무 적용 계획 등을 작성해주세요."
        style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical">${s.feedback}</textarea>
    </div>`);
  }
  // 첨부파일
  if (show('supporting_docs', true)) {
    fields.push(`
    <div style="padding:20px;background:#F9FAFB;border-radius:12px;border:1.5px dashed #D1D5DB">
      <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">📎 첨부파일 (수료증, 영수증 등)</div>
      <div style="font-size:11px;color:#9CA3AF">파일 업로드 기능은 추후 제공 예정입니다.</div>
    </div>`);
  }
  return `<div style="display:grid;gap:20px">${fields.join('')}</div>`;
}

// ─── 이벤트 핸들러 ────────────────────────────────────────────────────────
function _resultSelectPurpose(id) {
  const policyPurposes =
    typeof getPersonaPurposes === "function"
      ? getPersonaPurposes(currentPersona, typeof _resultSelectedAccountCode !== "undefined" ? _resultSelectedAccountCode : null)
      : [];
  _resultWizardState.purpose = policyPurposes.find((p) => p.id === id) || null;
  _resultWizardState.budgetId = "";
  _resultWizardState.budgetChoice = "";
  _resultWizardState.useBudget = null;
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultWizardState.learningType = "";
  _resultWizardState.mode = null;
  _resultWizardState.processPattern = null;
  _resultApprovedAppsLoaded = false;
  renderResult();
}

function _resultSelectBudget(budgetId) {
  _resultWizardState.budgetId = budgetId;
  _resultWizardState.useBudget = true;
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultApprovedAppsLoaded = false;

  // 패턴 감지 → mode 결정
  const avail =
    typeof getPersonaBudgets === "function"
      ? getPersonaBudgets(currentPersona, _resultWizardState.purpose?.id)
      : [];
  const b = avail.find((x) => x.id === budgetId);
  const pi =
    b && typeof getProcessPatternInfo !== "undefined"
      ? getProcessPatternInfo(
          currentPersona,
          _resultWizardState.purpose?.id,
          b.accountCode,
        )
      : null;
  _resultWizardState.processPattern = pi?.pattern || null;
  if (pi && ["A", "B"].includes(pi.pattern)) {
    _resultWizardState.mode = "from_application";
  } else {
    _resultWizardState.mode = "direct";
  }
  renderResult();
}

function _resultSelectBudgetChoice(choice) {
  _resultWizardState.budgetChoice = choice;
  _resultWizardState.budgetId = "";
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultWizardState.learningType = "";
  _resultApprovedAppsLoaded = false;

  if (choice === "none") {
    _resultWizardState.useBudget = false;
    _resultWizardState.mode = "direct";
  } else {
    _resultWizardState.useBudget = true;
    // 자동 매칭
    const budgets =
      typeof getPersonaBudgets === "function"
        ? getPersonaBudgets(currentPersona, _resultWizardState.purpose?.id)
        : [];
    if (choice === "general") {
      const b = budgets.find((x) => x.account === "참가") || budgets[0];
      if (b) {
        _resultWizardState.budgetId = b.id;
        const pi =
          typeof getProcessPatternInfo !== "undefined"
            ? getProcessPatternInfo(
                currentPersona,
                _resultWizardState.purpose?.id,
                b.accountCode,
              )
            : null;
        _resultWizardState.processPattern = pi?.pattern || "B";
        _resultWizardState.mode = ["A", "B"].includes(pi?.pattern)
          ? "from_application"
          : "direct";
      }
    } else if (choice === "rnd") {
      _resultWizardState.mode = "from_application";
      _resultWizardState.processPattern = "A";
    }
  }
  renderResult();
}

function _resultSelectApp(id, appData) {
  _resultWizardState.selectedAppId = id;
  _resultWizardState.selectedApp =
    typeof appData === "string" ? JSON.parse(appData) : appData;
  _resultWizardState.mode = "from_application";
  // Q-MP5: 신청 변경 시 Line Items 캐시 리셋
  _resultLineItemsLoadedForApp = null;
  _resultLineItems = [];
  _resultWizardState.lineItemResults = [];
  renderResult();
}

function _resultSelectEduType(value, parentValue) {
  _resultWizardState.learningType = value;
  _resultWizardState.eduType = parentValue;
  renderResult();
}

function _resultNext() {
  const s = _resultWizardState;
  // Step 2 → Step 3: 패턴 A/B에서 신청 미선택 차단
  if (s.step === 2 && s.mode === "from_application" && !s.selectedAppId) {
    if (s.budgetChoice !== "rnd" && s.purpose?.id === "external_personal") {
      // 일반예산은 mode가 바뀔 수 있으므로 pass
    } else {
      alert("❗ 결과를 등록할 교육신청을 선택해주세요.");
      return;
    }
  }
  // Step 2 → Step 3: A/B 패턴 + 신청 선택 완료 → Step 3 건너뛰고 Step 4
  if (s.step === 2 && s.mode === "from_application" && s.selectedAppId) {
    s.step = 4;
    _resultLoadFormTemplate(s); // ★ BO 양식 비동기 로드
    return;
  }
  const nextStep = Math.min(s.step + 1, 4);
  s.step = nextStep;

  // ★ Step 4 진입 시: BO 양식관리(form_config) → form_templates DB 순으로 양식 로드
  if (nextStep === 4) {
    _resultLoadFormTemplate(s);
    return;
  }
  renderResult();
}

// ★ 교육결과 위저드 Step 4 진입 시 BO 양식 비동기 로드
// planNext() (fo_plans_actions.js)와 동일한 패턴
async function _resultLoadFormTemplate(s) {
  s.formTemplateLoading = true;
  s.formTemplate = null;
  renderResult();

  const policies =
    typeof _getActivePolicies === "function"
      ? _getActivePolicies(currentPersona)?.policies || []
      : [];
  const purposeId = s.purpose?.id;
  const eduType = s.learningType || s.eduType || "";
  const accCode = (() => {
    const budgets = currentPersona?.budgets || [];
    const b = budgets.find((x) => x.id === s.budgetId);
    if (b?.accountCode || b?.account_code) return b.accountCode || b.account_code;
    // 폴백: wizard state에 직접 저장된 계정 코드
    if (s.accountCode) return s.accountCode;
    if (typeof _resultSelectedAccountCode !== 'undefined' && _resultSelectedAccountCode) return _resultSelectedAccountCode;
    // 폴백: budgets 배열의 첫 번째 계정 코드
    const bAny = budgets.find(x => x.account_code || x.accountCode);
    if (bAny) return bAny.account_code || bAny.accountCode;
    return null;
  })();

  // purpose + account 기준 최적 정책 선택
  const boPurposeKeys =
    typeof _FO_TO_BO_PURPOSE !== "undefined" && purposeId
      ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
      : [purposeId];
  const _purposeMatch = (pPurpose) =>
    !purposeId || boPurposeKeys.includes(pPurpose);
  const matched =
    policies.find((p) => {
      const acc = p.account_codes || p.accountCodes || [];
      return _purposeMatch(p.purpose) && (!accCode || acc.includes(accCode));
    }) ||
    policies[0] ||
    null;

  const tenantId = currentPersona?.tenantId || currentPersona?.tenant_id || null;
  console.log('[resultNext:Step4] ── 양식 로드 시작 ──');
  console.log('[resultNext:Step4] accCode:', accCode, '| eduType:', eduType, '| tenantId:', tenantId);

  let tpl = null;
  let formConfigExists = false; // form_config 존재 플래그
  // 1순위: form_config (BO 양식관리 연동)
  if (accCode && typeof loadFormConfigTemplate === 'function') {
    tpl = await loadFormConfigTemplate(accCode, tenantId, eduType, 'result');
    if (tpl) {
      formConfigExists = true;
      console.log('[resultNext] BO form_config 기반 양식 적용:', tpl.name, '| inlineFields:', tpl.inlineFields);
    } else {
      // form_config 자체가 DB에 존재하는지 확인 (eduType 매칭만 실패한 경우)
      const raw = typeof loadBudgetAccountFormConfig === 'function'
        ? await loadBudgetAccountFormConfig(accCode, tenantId) : null;
      if (raw && Object.keys(raw).length > 0) {
        formConfigExists = true;
        console.log('[resultNext] form_config 존재하나 eduType 미매칭 → 기본 양식');
      }
    }
  }

  // 2순위: form_templates DB 폴백 (form_config 미설정 계정만)
  if (!tpl && !formConfigExists && matched && typeof getFoFormTemplate === 'function') {
    // eduType 영문 코드 직접 전달 (DB form_templates.edu_type 영문 표준화 완료)
    tpl = await getFoFormTemplate(matched, 'result', eduType, accCode);
    if (tpl) {
      console.log('[resultNext] form_templates DB 방식 폴백:', tpl.name || tpl.id);
    }
  }

  s.formTemplate = tpl || null;
  s.formTemplateLoading = false;
  console.log('[resultNext:Step4] ── 최종 formTemplate:', tpl ? (tpl.isInline ? 'inline(form_config)' : 'dynamic(form_templates)') : 'null(폴백)', '──');
  renderResult();
}

function _resultPrev() {
  const s = _resultWizardState;
  s.step = Math.max(s.step - 1, 1);
  renderResult();
}

// ── 결과 제출 (DB 저장) ────────────────────────────────────────────────────
async function _submitResultRegistration() {
  const s = _resultWizardState;
  if (!s) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 실패");
    return;
  }

  const resultData = {
    completed: s.completed === "yes",
    actual_hours: Number(s.actualHours) || 0,
    actual_cost: Number(s.actualCost) || 0,
    satisfaction: s.satisfaction,
    feedback: s.feedback,
    submitted_at: new Date().toISOString(),
    submitted_by: currentPersona.name,
  };

  try {
    if (s.mode === "from_application" && s.selectedAppId) {
      // 패턴 A/B: 기존 application 업데이트
      const { data: existing } = await sb
        .from("applications")
        .select("detail")
        .eq("id", s.selectedAppId)
        .single();
      const prevDetail = existing?.detail || {};
      const { error } = await sb
        .from("applications")
        .update({
          status: "result_pending",
          amount: Number(s.actualCost) || Number(prevDetail.amount) || 0,
          detail: {
            ...prevDetail,
            result: resultData,
            resultType: "from_application",
          },
        })
        .eq("id", s.selectedAppId);
      if (error) throw error;

      // ── Q-MP5: Line Item별 결과 개별 저장 ──
      if (s.lineItemResults && s.lineItemResults.length > 0) {
        for (const item of s.lineItemResults) {
          if (!item.id) continue;
          const resultStatus = item._completed === 'yes' ? 'completed'
            : item._completed === 'no' ? 'failed'
            : 'pending';
          try {
            await sb.from('application_plan_items').update({
              result_status: resultStatus,
              result_detail: {
                completed: item._completed === 'yes',
                satisfaction: item._satisfaction || 0,
                actual_hours: Number(item._actualHours) || 0,
                feedback: item._feedback || '',
                submitted_at: new Date().toISOString(),
                submitted_by: currentPersona.name,
              },
            }).eq('id', item.id);
          } catch(piErr) { console.warn('[Q-MP5] Line item result save skip:', piErr.message); }
        }
      }
    } else {
      // 패턴 C: 신규 application INSERT (사후 정산 직접 등록)
      const appId = `RES-${Date.now()}`;
      const totalCost = s.expenses.reduce(
        (sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1),
        0,
      );
      const row = {
        id: appId,
        tenant_id: currentPersona.tenantId,
        plan_id: null,
        account_code: s.budgetId || null,
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || "",
        edu_name: s.title,
        edu_type: s.learningType || null,
        amount: totalCost,
        status: "result_pending",  // BO 정산 검토 후 → completed
        policy_id: null,
        detail: {
          resultType: "direct",
          result: resultData,
          startDate: s.date,
          endDate: s.endDate,
          hours: s.hours,
          provider: s.provider,
          expenses: s.expenses,
          purpose: s.purpose?.id,
          learningType: s.learningType,
        },
      };
      const { error } = await sb.from("applications").insert(row);
      if (error) throw error;
    }

    alert("✅ 교육결과가 등록되었습니다.\n\nBO 담당자 검토 후 최종 확정됩니다.");
    _resultWizardState.confirmMode = true;
    _resultWizardState.justSaved = true;
    _resultWizardState.currentStatus = "result_pending";
    _resultDbLoaded = false;
    _resultDbRows = [];
    _resultApprovedAppsLoaded = false;
    _resultApprovedApps = [];
    renderResult();
  } catch (err) {
    alert("제출 실패: " + err.message);
    console.error("[_submitResultRegistration]", err.message);
  }
}

function _renderResultConfirm() {
  const s = _resultWizardState;
  const totalCost = (s.expenses || []).reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0);
  
  const resultLike = {
    ...s,
    id: s.editId || s.selectedAppId || null,
    amount: totalCost,
    account_code: s.budgetId,
    accountCode: s.budgetId,
    status: s.currentStatus || 'result_pending',
    title: s.title || '',
    applicant_name: currentPersona.name,
    dept: currentPersona.dept,
    detail: s,
  };
  
  document.getElementById("page-result").innerHTML = foRenderResultUnifiedView(resultLike, {
    mode: s.justSaved ? 'confirm' : 'detail',
    inlineFields: (s.formTemplate && s.formTemplate.inlineFields) || null,
  });
}

function foRenderResultUnifiedView(res, opts = {}) {
  const { mode = 'detail', inlineFields = null } = opts;
  const stColor = res.status === 'completed' ? '#059669' : '#D97706';
  const stLabel = res.status === 'completed' ? '등록완료' : '검토중';
  const amount = Number(res.amount || 0);

  let actionBtns = '';
  if (mode === 'confirm') {
    actionBtns = `
      <button onclick="_resultWizardState=null;renderResult()" style="margin-right:auto;padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:#F9FAFB;color:#4B5563;cursor:pointer">≡ 목록으로</button>
      <button onclick="_resultWizardState=null;renderResult()" style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">✅ 확인</button>`;
  } else {
    actionBtns = `
      <button onclick="_resultWizardState=null;renderResult()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 목록으로</button>`;
  }

  // 원본 교육신청 정보 요약 (옵션 A)
  let originalAppSummary = '';
  if (res.mode === 'from_application' && res.selectedApp) {
    const app = res.selectedApp;
    originalAppSummary = `
      <div style="margin-bottom:20px;padding:16px 20px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:16px">
        <div style="font-size:11px;font-weight:900;color:#1D4ED8;margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">📝</span> 원본 교육신청 정보
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:12px">
          <div style="flex:1;min-width:200px">
            <span style="color:#6B7280;font-weight:800;display:inline-block;width:60px">신청명</span>
            <span style="color:#111827;font-weight:900">${app.title || app.edu_name || '-'}</span>
          </div>
          <div style="flex:1;min-width:200px">
            <span style="color:#6B7280;font-weight:800;display:inline-block;width:60px">신청금액</span>
            <span style="color:#111827;font-weight:900">${Number(app.amount || 0).toLocaleString()}원</span>
          </div>
          <div style="flex:1;min-width:200px">
            <span style="color:#6B7280;font-weight:800;display:inline-block;width:60px">학습기간</span>
            <span style="color:#111827;font-weight:900">${app.detail?.startDate || '-'} ~ ${app.detail?.endDate || '-'}</span>
          </div>
        </div>
      </div>
    `;
  }

  return `
  <div class="max-w-3xl mx-auto">
    ${mode === 'detail' ? `<div style="margin-bottom:16px"><button onclick="_resultWizardState=null;renderResult()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">← 목록으로</button></div>` : ''}
    <div style="border-radius:20px;overflow:hidden;border:1.5px solid #E5E7EB;background:white;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stColor}40;color:white">${stLabel}</span>
          ${mode === 'confirm' ? '<span style="font-size:10px;font-weight:700;opacity:.7">✅ 등록 완료</span>' : ''}
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${res.title || '-'}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">${res.applicant_name || currentPersona.name} · ${res.dept || currentPersona.dept}</p>
      </div>
      <div style="padding:24px 28px;background:#F9FAFB">
        ${originalAppSummary}
        ${typeof window.foRenderStandardReadOnlyForm === 'function'
          ? window.foRenderStandardReadOnlyForm({ ...res, amount, accountCode: res.accountCode || res.account_code || '' }, 'FO', inlineFields)
          : '<p>렌더러 로딩 중...</p>'}
      </div>
      ${typeof renderApprovalStepper === 'function' ? renderApprovalStepper(res.status, 'result') : ''}
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6;flex-wrap:wrap">
        ${actionBtns}
      </div>
    </div>
  </div>`;
}

async function viewResultDetail(resId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("applications")
      .select("*")
      .eq("id", resId)
      .single();
    if (error || !data) {
      alert("결과 내역을 불러올 수 없습니다.");
      return;
    }
    
    _resultWizardState = _resetResultWizardState();
    Object.assign(_resultWizardState, data.detail || {}); 
    _resultWizardState.editId = data.id;
    _resultWizardState.title = data.edu_name || "";
    _resultWizardState.learningType = data.edu_type || "";
    _resultWizardState.budgetId = data.account_code || data.detail?.budgetId || "";
    _resultWizardState.currentStatus = data.status;
    _resultWizardState.expenses = data.detail?.expenses || [{ id: 1, type: "교육비/등록비", price: 0, qty: 1 }];
    
    _resultWizardState.confirmMode = true; 
    _resultWizardState.justSaved = false;
    
    // 만약 신청 기반(from_application)인 경우, 원본 정보를 selectedApp에 세팅하여 요약본이 나오게 함
    if (_resultWizardState.resultType === 'from_application' && !_resultWizardState.selectedApp) {
      // data 자체가 원본 application 이므로 (result는 application 테이블의 detail.result로 저장됨)
      _resultWizardState.mode = 'from_application';
      _resultWizardState.selectedApp = data;
    } else if (_resultWizardState.resultType === 'direct' || _resultWizardState.mode === 'direct') {
      _resultWizardState.mode = 'direct';
    }

    renderResult();
  } catch (err) {
    alert("불러오기 실패: " + err.message);
  }
}
// ══════════════════════════════════════════════════════════════════════
// Phase 1 — 결과등록 VOrg 허브 (교육신청과 동일 패턴)
// ══════════════════════════════════════════════════════════════════════
async function _renderResultVorgHub() {
  const container = document.getElementById('page-result');
  if (!container) return;
  let vorgIds = [];
  if (Array.isArray(currentPersona?.vorgIds) && currentPersona.vorgIds.length > 0) vorgIds = currentPersona.vorgIds;
  else if (currentPersona?.vorgId) vorgIds = [currentPersona.vorgId];
  else if (currentPersona?.domainId) vorgIds = [currentPersona.domainId];

  if (vorgIds.length === 0) {
    _resultSelectedVorgId = 'default'; _resultSelectedVorgName = '기본 제도그룹'; _resultSelectedVorgOwnedAccounts = [];
    renderResult(); return;
  }
  container.innerHTML = `<div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 제도그룹 조회 중...</div>`;
  const sb = typeof getSB === 'function' ? getSB() : null;
  let fetchedVorgs = [];
  if (sb && vorgIds.length > 0) {
    try {
      const { data } = await sb.from('virtual_org_templates').select('id, name, isolation_group_id').in('id', vorgIds);
      if (data && data.length > 0) {
        const igIds = data.map(r => r.isolation_group_id).filter(Boolean);
        let igMap = {};
        if (igIds.length > 0) { try { const { data: igRows } = await sb.from('isolation_groups').select('id, owned_accounts').in('id', igIds); (igRows || []).forEach(ig => { igMap[ig.id] = ig.owned_accounts || []; }); } catch(e) {} }
        fetchedVorgs = data.map(row => ({ id: row.id, name: row.name || row.id, ownedAccounts: igMap[row.isolation_group_id] || [] }));
      }
    } catch(e) { console.warn('[ResultVorgHub] DB fetch failed:', e.message); }
  }
  const templates = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const vorgItems = vorgIds.map(vid => {
    const f = fetchedVorgs.find(x => x.id === vid); const t = templates.find(x => x.id === vid || x.code === vid) || {};
    return { id: vid, name: f?.name || t.name || vid, ownedAccounts: f?.ownedAccounts || t.ownedAccounts || [] };
  }).filter(v => v.id);

  if (vorgItems.length <= 1) {
    const v = vorgItems[0] || { id: vorgIds[0] || 'default', name: '기본 제도그룹', ownedAccounts: [] };
    _resultSelectedVorgId = v.id; _resultSelectedVorgName = v.name; _resultSelectedVorgOwnedAccounts = v.ownedAccounts;
    renderResult(); return;
  }
  _resultUserVorgList = vorgItems;
  container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">HOME › 교육결과</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">🏛 제도그룹 선택</h1>
    <p class="text-gray-500 text-sm mt-1">결과를 등록할 제도그룹을 선택해 주세요.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
    ${vorgItems.map(v => `
    <button onclick="_selectResultVorg('${v.id}','${v.name.replace(/'/g,'')}')"
      style="text-align:left;padding:28px 24px;border-radius:20px;border:2px solid #E5E7EB;background:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.05);transition:all 0.18s"
      onmouseover="this.style.borderColor='#002C5F';this.style.boxShadow='0 8px 28px rgba(0,44,95,0.12)';this.style.transform='translateY(-3px)'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)';this.style.transform='none'">
      <div style="font-size:28px;margin-bottom:12px">🏛</div>
      <div style="font-size:16px;font-weight:900;color:#111827;margin-bottom:4px">${v.name}</div>
      <div style="margin-top:16px;font-size:12px;font-weight:800;color:#002C5F;display:flex;align-items:center;gap:4px">선택하기 <span>→</span></div>
    </button>`).join('')}
  </div>
</div>`;
}

function _selectResultVorg(vorgId, vorgName) {
  _resultSelectedVorgId = vorgId; _resultSelectedVorgName = vorgName;
  const v = _resultUserVorgList.find(x => x.id === vorgId);
  _resultSelectedVorgOwnedAccounts = v?.ownedAccounts || [];
  _resultSelectedAccountCode = null; _resultSelectedAccountName = null;
  renderResult();
}

// ══════════════════════════════════════════════════════════════════════
// Phase 1 — 결과등록 예산계정 허브
// ══════════════════════════════════════════════════════════════════════
async function _renderResultAccountHub() {
  const container = document.getElementById('page-result');
  if (!container) return;
  container.innerHTML = `<div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 예산계정 조회 중...</div>`;
  const ownedAccounts = _resultSelectedVorgOwnedAccounts || [];
  let accountItems = []; const budgets = currentPersona?.budgets || [];
  if (_resultSelectedVorgId !== 'default') accountItems = budgets.filter(b => ownedAccounts.some(ac => ac === b.accountCode || ac === b.id));
  else { const allowed = currentPersona?.allowedAccounts || []; accountItems = allowed.includes('*') ? budgets : budgets.filter(b => allowed.includes(b.accountCode)); }
  const seen = new Set();
  accountItems = accountItems.filter(b => { if (seen.has(b.accountCode)) return false; seen.add(b.accountCode); return true; });

  if (accountItems.length === 0) {
    const showBack = (_resultUserVorgList.length > 1);
    container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div><div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">HOME › ${showBack ? `<span onclick="_resultSelectedVorgId=null;renderResult()" style="cursor:pointer;text-decoration:underline">교육결과</span>` : '교육결과'} › 예산계정</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1></div>
  <div style="padding:60px 20px;text-align:center;border-radius:16px;background:#FFF9F9;border:1.5px dashed #FCA5A5">
    <div style="font-size:36px;margin-bottom:12px">⚠️</div>
    <div style="font-size:14px;font-weight:900;color:#DC2626">이 제도그룹에 배정된 예산계정이 없습니다.</div>
    ${showBack ? `<button onclick="_resultSelectedVorgId=null;renderResult()" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer">← 제도그룹 선택으로</button>` : ''}
  </div>
</div>`; return;
  }
  if (accountItems.length === 1) { const a = accountItems[0]; _selectResultAccount(a.accountCode, a.name || a.accountCode); return; }

  const showBack = (_resultUserVorgList.length > 1);
  const sb = typeof getSB === 'function' ? getSB() : null;
  let lvmMap = {};
  if (sb) { try { const codes = accountItems.map(a => a.accountCode).filter(c => c && c.trim() !== ''); if (codes.length > 0) { const { data } = await sb.from('budget_accounts').select('code, list_view_mode').in('code', codes).eq('tenant_id', currentPersona.tenantId); (data || []).forEach(r => { if (r.list_view_mode) lvmMap[r.code] = r.list_view_mode; }); } } catch(e) {} }

  container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">HOME › ${showBack ? `<span onclick="_resultSelectedVorgId=null;renderResult()" style="cursor:pointer;text-decoration:underline">교육결과</span>` : '교육결과'} › 예산계정</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1>
      <p class="text-gray-500 text-sm mt-1">${_resultSelectedVorgName || '교육결과'} · 결과를 등록할 예산계정을 선택하세요.</p>
    </div>
    ${showBack ? `<button onclick="_resultSelectedVorgId=null;renderResult()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">← 제도그룹</button>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
    ${accountItems.map(b => {
      const balance = (b.balance || 0), used = (b.used || 0), remaining = balance - used;
      const pct = balance > 0 ? Math.round(remaining / balance * 100) : 0;
      const barColor = pct < 20 ? '#EF4444' : pct < 50 ? '#F59E0B' : '#10B981';
      const isNoBudget = b.uses_budget === false;
      const lvm = lvmMap[b.accountCode] || 'both';
      return `
    <button onclick="_selectResultAccount('${b.accountCode}','${(b.name||b.accountCode).replace(/'/g,'')}','${lvm}')"
      style="text-align:left;padding:24px 22px;border-radius:20px;border:2px solid #E5E7EB;background:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.05);transition:all 0.18s"
      onmouseover="this.style.borderColor='#002C5F';this.style.boxShadow='0 8px 28px rgba(0,44,95,0.12)';this.style.transform='translateY(-3px)'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)';this.style.transform='none'">
      <div style="font-size:12px;font-weight:900;color:#6B7280;margin-bottom:8px">${isNoBudget ? '📝' : '💳'} ${b.accountCode || ''}</div>
      <div style="font-size:17px;font-weight:900;color:#111827;margin-bottom:14px">${b.name || b.accountCode}</div>
      ${!isNoBudget && balance > 0 ? `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:#6B7280;font-weight:700">가용예산</span><span style="font-size:11px;font-weight:900;color:${barColor}">${remaining.toLocaleString()}원 (${pct}%)</span></div><div style="height:6px;border-radius:3px;background:#F3F4F6;overflow:hidden"><div style="height:100%;width:${100-pct}%;background:${barColor};border-radius:3px"></div></div></div>` : isNoBudget ? `<div style="font-size:12px;color:#059669;margin-bottom:14px;font-weight:700">📋 이력만 등록</div>` : `<div style="font-size:12px;color:#9CA3AF;margin-bottom:14px">⏳ 예산 미배정</div>`}
      <div style="margin-top:14px;font-size:12px;font-weight:800;color:#002C5F;display:flex;align-items:center;gap:4px">결과 목록 보기 <span>→</span></div>
    </button>`;
    }).join('')}
  </div>
</div>`;
}

function _selectResultAccount(accountCode, accountName, listViewMode) {
  _resultSelectedAccountCode = accountCode; _resultSelectedAccountName = accountName;
  _resultAccountListViewMode = listViewMode || 'both';
  _resultDbLoaded = false; _resultDbRows = [];
  _resultApprovedAppsLoaded = false; _resultApprovedApps = [];
  renderResult();
}

function _resetResultHubCache() {
  _resultSelectedVorgId = null; _resultSelectedVorgName = null;
  _resultSelectedAccountCode = null; _resultSelectedAccountName = null;
  _resultUserVorgList = []; _resultSelectedVorgOwnedAccounts = [];
  _resultAccountListViewMode = 'both';
  _resultDbLoaded = false; _resultDbRows = [];
  _resultApprovedAppsLoaded = false; _resultApprovedApps = [];
}
