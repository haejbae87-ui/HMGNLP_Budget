// ─── 📊 교육예산 수요분석 (VOrg 계층 기반 3단계 드릴다운) ─────────────────────
// 필터: 테넌트(회사) → VOrg 제도그룹 → 예산계정
// Level 1: VOrg 그룹(본부/센터)별 요약
// Level 2: 본부/센터 → 하위 팀별 상세
// Level 3: 팀/상신자 → 개별 계획 목록

// ── 필터 상태 ──
let _bdTenant = "";
let _bdTplId = null; // virtual_org_template ID
let _bdAccountId = null; // budget_account ID
let _bdYear = new Date().getFullYear();
let _bdDrillHq = null; // Level 2: 드릴다운 그룹 ID
let _bdDrillOrg = null; // Level 3: 드릴다운 팀/상신자명

// ── 캐시 ──
let _bdTplList = []; // virtual_org_templates
let _bdAcctList = []; // budget_accounts
let _bdGroups = []; // tree_data.hqs (선택된 제도그룹)
let _bdPlans = null; // plans 캐시

// ★ 시뮬레이션 상태
let _bdSimMode = false;
let _bdSimData = null;        // budget_simulation 레코드
let _bdSimEdits = {};         // { planId: allocatedAmount }
let _bdSimEnvelope = 0;       // 예상 예산안 총액
let _bdSimVersions = [];      // 저장된 시뮬레이션 버전 목록

// ── 진입점 ──────────────────────────────────────────────────────────────────
async function renderBudgetDemand() {
  const el = document.getElementById("bo-content");
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>';
    return;
  }

  el.innerHTML =
    '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>데이터 로딩 중...</div>';

  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";
  if (!_bdTenant)
    _bdTenant = isPlatform
      ? tenants.find((t) => t.id !== "SYSTEM")?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";

  // ── 1. 전체 계정 로드 (template에 연결된 것만) ──
  let allAccts = [];
  try {
    const { data } = await sb
      .from("budget_accounts")
      .select("id,name,code,virtual_org_template_id")
      .eq("tenant_id", _bdTenant)
      .eq("active", true)
      .eq("uses_budget", true);
    allAccts = data || [];
  } catch (e) {
    allAccts = [];
  }

  // ── 2. 제도그룹 로드 (예산계정이 연결된 것만 = 교육지원 유형만, 자격증 제외) ──
  const tplIdsWithAccounts = [
    ...new Set(allAccts.map((a) => a.virtual_org_template_id).filter(Boolean)),
  ];
  try {
    const { data } = await sb
      .from("virtual_org_templates")
      .select("id,name,tree_data")
      .eq("tenant_id", _bdTenant)
      .in(
        "id",
        tplIdsWithAccounts.length > 0 ? tplIdsWithAccounts : ["__NONE__"],
      );
    _bdTplList = data || [];
  } catch (e) {
    _bdTplList = [];
  }
  if (!_bdTplId || !_bdTplList.find((t) => t.id === _bdTplId))
    _bdTplId = _bdTplList[0]?.id || null;

  // ── 3. 선택된 제도그룹의 tree 그룹 + 해당 계정 로드 ──
  const selTpl = _bdTplList.find((t) => t.id === _bdTplId);
  _bdGroups = selTpl?.tree_data?.hqs || [];
  _bdAcctList = allAccts.filter((a) => a.virtual_org_template_id === _bdTplId);

  // ── 4. plans 로드 (account_code 기반 필터 — 올바른 template 매핑) ──
  const tplAccountCodes = _bdAcctList.map((a) => a.code);
  try {
    let q = sb
      .from("plans")
      .select("*")
      .eq("tenant_id", _bdTenant)
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    // 연도 필터
    q = q
      .gte("created_at", `${_bdYear}-01-01T00:00:00`)
      .lt("created_at", `${_bdYear + 1}-01-01T00:00:00`);
    // 선택된 제도그룹에 속한 계정의 plans만 조회
    if (tplAccountCodes.length > 0) {
      q = q.in("account_code", tplAccountCodes);
    } else {
      q = q.eq("account_code", "__NONE__"); // 계정 없으면 빈 결과
    }
    // 특정 계정 필터 (드롭다운 선택 시)
    if (_bdAccountId) {
      const acct = _bdAcctList.find((a) => a.id === _bdAccountId);
      if (acct) q = q.eq("account_code", acct.code);
    }
    const { data } = await q;
    _bdPlans = data || [];
  } catch (e) {
    _bdPlans = [];
  }

  // 드릴다운 라우팅
  if (_bdSimMode) {
    _renderBdSimulation(el, isPlatform, tenants);
    return;
  }
  if (_bdDrillOrg) {
    _renderBdLevel3(el);
    return;
  }
  if (_bdDrillHq) {
    _renderBdLevel2(el, isPlatform, tenants);
    return;
  }
  _renderBdLevel1(el, isPlatform, tenants);
}

// ────────────────────────────────────────────────────────────────────────────
// 공통 필터 바 (회사 > VOrg 제도그룹 > 계정)
// ────────────────────────────────────────────────────────────────────────────
function _bdFilterBar(isPlatform, tenants) {
  const selStyle =
    "border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:130px;cursor:pointer";

  const tenantSel = isPlatform
    ? `<select onchange="_bdTenant=this.value;_bdTplId=null;_bdAccountId=null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      ${tenants
        .filter((t) => t.id !== "SYSTEM")
        .map(
          (t) =>
            `<option value="${t.id}" ${t.id === _bdTenant ? "selected" : ""}>${t.name}</option>`,
        )
        .join("")}
    </select>`
    : `<span style="font-size:12px;font-weight:800;color:#374151;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find((t) => t.id === _bdTenant)?.name || _bdTenant}</span>`;

  const tplSel = _bdTplList.length
    ? `<select onchange="_bdTplId=this.value;_bdAccountId=null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      ${_bdTplList.map((t) => `<option value="${t.id}" ${t.id === _bdTplId ? "selected" : ""}>${t.name}</option>`).join("")}
    </select>`
    : '<span style="font-size:11px;color:#9CA3AF">제도그룹 없음</span>';

  const acctSel = _bdAcctList.length
    ? `<select onchange="_bdAccountId=this.value||null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      <option value="">전체 계정</option>
      ${_bdAcctList.map((a) => `<option value="${a.id}" ${a.id === _bdAccountId ? "selected" : ""}>${a.name}</option>`).join("")}
    </select>`
    : "";

  const yearSel = `<select onchange="_bdYear=Number(this.value);_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
    ${[_bdYear + 1, _bdYear, _bdYear - 1, _bdYear - 2]
      .map(
        (y) =>
          `<option value="${y}" ${_bdYear === y ? "selected" : ""}>${y}년</option>`,
      )
      .join("")}
  </select>`;

  return `
  <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span style="font-size:11px;font-weight:900;color:#374151;margin-right:4px">🔍 데이터 범위</span>
      <label style="font-size:10px;font-weight:700;color:#6B7280">테넌트(회사)</label> ${tenantSel}
      <label style="font-size:10px;font-weight:700;color:#6B7280">VOrg</label> ${tplSel}
      <label style="font-size:10px;font-weight:700;color:#6B7280">계정</label> ${acctSel}
      ${yearSel}
      <button onclick="_bdPlans=null;renderBudgetDemand()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 1: VOrg 그룹(본부/센터)별 요약
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel1(el, isPlatform, tenants) {
  const plans = _bdPlans || [];

  // 전체 집계
  const totalCount = plans.length;
  const demandTotal = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedTotal = plans
    .filter((p) => ["approved", "completed"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = plans
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejectedTotal = plans
    .filter((p) => p.status === "rejected")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedPct =
    demandTotal > 0 ? Math.round((confirmedTotal / demandTotal) * 100) : 0;

  // 그룹별 집계
  const groupRows = _bdGroups.map((g) => _bdAggregateGroup(g, plans));

  // 미분류
  const matchedIds = _bdGetMatchedIds(plans);
  const unmatchedPlans = plans.filter((p) => !matchedIds.has(p.id));
  if (unmatchedPlans.length > 0) {
    groupRows.push(_bdAggregateUnmatched(unmatchedPlans));
  }

  const cards = [
    {
      icon: "📋",
      label: "전체 계획",
      val: `${totalCount}건`,
      color: "#002C5F",
      bg: "#EFF6FF",
    },
    {
      icon: "📊",
      label: "수요 예산",
      val: _bdFmt(demandTotal),
      color: "#0369A1",
      bg: "#F0F9FF",
    },
    {
      icon: "✅",
      label: "확정 예산",
      val: _bdFmt(confirmedTotal),
      color: "#059669",
      bg: "#F0FDF4",
    },
    {
      icon: "⏳",
      label: "미결 예산",
      val: _bdFmt(pendingTotal),
      color: "#D97706",
      bg: "#FFFBEB",
    },
  ];

  // F-152: 역할별 시뮬레이션 버튼 분기
  const _bdIsGlobal = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : true;
  const _bdIsOp = typeof boIsOpManager === 'function' ? boIsOpManager() : false;
  const _bdOpBanner = typeof boOpScopeBanner === 'function' ? boOpScopeBanner() : '';
  const _bdRoleBadge = typeof boRoleModeBadge === 'function' ? boRoleModeBadge() : '';

  const _simBtn = _bdIsGlobal
    ? `<button onclick="_bdStartSimulation()" style="padding:10px 20px;border-radius:12px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,.3);transition:transform .15s"
        onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
        🧮 예산배분 시뮬레이션
      </button>`
    : `<span style="font-size:11px;padding:6px 14px;border-radius:8px;background:#FEF3C7;color:#92400E;font-weight:800">🔍 1차 검토 모드 — 시뮬레이션은 총괄담당자 권한</span>`;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <h1 class="bo-page-title" style="margin:0">📊 교육예산 수요분석</h1>
          ${_bdRoleBadge}
        </div>
        <p class="bo-page-sub">${_bdIsOp ? '관할 교육조직 기반 수요·확정 현황' : '교육조직 기반 예산 수요·확정 현황'}</p>
      </div>
      ${_simBtn}
    </div>

    ${_bdOpBanner}
    ${_bdFilterBar(isPlatform, tenants)}

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px">
      ${cards
        .map(
          (c) => `
      <div style="background:${c.bg};border-radius:14px;padding:16px 18px;border:1.5px solid ${c.color}20">
        <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:6px">${c.icon} ${c.label}</div>
        <div style="font-size:22px;font-weight:900;color:${c.color}">${c.val}</div>
      </div>`,
        )
        .join("")}
    </div>

    <div class="bo-card" style="padding:14px 20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px">
        <span style="font-size:12px;font-weight:900;color:#374151;white-space:nowrap">전체 확정률</span>
        <div style="flex:1;height:10px;background:#E5E7EB;border-radius:5px;overflow:hidden">
          <div style="width:${confirmedPct}%;height:100%;background:linear-gradient(90deg,#059669,#34D399);border-radius:5px;transition:width .5s"></div>
        </div>
        <span style="font-size:13px;font-weight:900;color:#059669;white-space:nowrap">${confirmedPct}%</span>
        <span style="font-size:11px;color:#9CA3AF">(${_bdFmt(confirmedTotal)} / ${_bdFmt(demandTotal)})</span>
      </div>
    </div>

    ${
      groupRows.length > 0
        ? `
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#002C5F08,#0369A108);border-bottom:1px solid #F3F4F6">
        <span style="font-size:14px;font-weight:900;color:#002C5F">🏢 조직단위별 수요 현황</span>
        <span style="font-size:11px;color:#6B7280;margin-left:8px">${_bdAcctList.find((a) => a.id === _bdAccountId)?.name || "전체 계정"}</span>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>조직단위</th><th style="text-align:center">팀수</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요 예산</th><th style="text-align:right">확정 예산</th>
          <th style="text-align:right">미결</th><th style="text-align:right">반려</th>
          <th style="text-align:center">확정률</th>
        </tr></thead>
        <tbody>
          ${groupRows
            .map(
              (g) => `
          <tr onclick="_bdDrillHq='${(g.id || "").replace(/'/g, "\\'")}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:800">${g.name}</td>
            <td style="text-align:center">${g.teamCount}</td>
            <td style="text-align:center">${g.count}건</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(g.demand)}</td>
            <td style="text-align:right;font-weight:800;color:#059669">${_bdFmt(g.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(g.pending)}</td>
            <td style="text-align:right;color:#DC2626">${_bdFmt(g.rejected)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${g.pct}%;height:100%;background:${g.pct >= 80 ? "#059669" : g.pct >= 50 ? "#D97706" : "#DC2626"};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${g.pct >= 80 ? "#059669" : g.pct >= 50 ? "#D97706" : "#DC2626"}">${g.pct}%</span>
              </div>
            </td>
          </tr>`,
            )
            .join("")}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td colspan="2">합계</td>
            <td style="text-align:center">${totalCount}건</td>
            <td style="text-align:right">${_bdFmt(demandTotal)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(confirmedTotal)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(pendingTotal)}</td>
            <td style="text-align:right;color:#DC2626">${_bdFmt(rejectedTotal)}</td>
            <td style="text-align:center;font-weight:900;color:${confirmedPct >= 80 ? "#059669" : confirmedPct >= 50 ? "#D97706" : "#DC2626"}">${confirmedPct}%</td>
          </tr>
        </tbody>
      </table>
    </div>`
        : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">${_bdYear}년 교육계획 데이터가 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">프론트오피스에서 교육계획을 수립하면 수요 분석 데이터가 표시됩니다.</div>
    </div>`
    }
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 2: 그룹(본부/센터) → 하위 팀별 상세
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel2(el, isPlatform, tenants) {
  const plans = _bdPlans || [];
  const hq = _bdGroups.find((g) => g.id === _bdDrillHq);

  if (_bdDrillHq === "__unmatched__") {
    _renderBdUnmatched(el, plans, isPlatform, tenants);
    return;
  }
  if (!hq) {
    _bdDrillHq = null;
    renderBudgetDemand();
    return;
  }

  const teams = hq.teams || [];
  const teamRows = teams.map((t) => {
    const tPlans = _bdMatchTeam(t.name, plans);
    return _bdAggregateTeam(t, tPlans);
  });

  const totalDemand = teamRows.reduce((s, t) => s + t.demand, 0);
  const totalConfirmed = teamRows.reduce((s, t) => s + t.confirmed, 0);
  const totalPending = teamRows.reduce((s, t) => s + t.pending, 0);
  const totalCount = teamRows.reduce((s, t) => s + t.count, 0);
  const totalPct =
    totalDemand > 0 ? Math.round((totalConfirmed / totalDemand) * 100) : 0;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
        <p class="bo-page-sub">교육조직 기반 예산 수요·확정 현황</p>
      </div>
    </div>

    ${_bdFilterBar(isPlatform, tenants)}

    <div style="margin-bottom:16px">
      <button onclick="_bdDrillHq=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 전체 조직단위 보기
      </button>
    </div>

    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">🏢 조직단위 상세</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${hq.name}</h2>
        <div style="margin-top:8px;display:flex;gap:20px;font-size:12px;flex-wrap:wrap">
          <span>팀수 <strong>${teams.length}개</strong></span>
          <span>수요 <strong>${_bdFmt(totalDemand)}</strong></span>
          <span>확정 <strong style="color:#86EFAC">${_bdFmt(totalConfirmed)}</strong></span>
          <span>${totalCount}건</span>
        </div>
      </div>

      ${
        teamRows.length > 0
          ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>팀</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요</th><th style="text-align:right">확정</th>
          <th style="text-align:right">미결</th><th style="text-align:center">확정률</th>
          <th style="text-align:center">상신자</th>
        </tr></thead>
        <tbody>
          ${teamRows
            .map((t) => {
              const applicantList =
                Object.entries(t.applicants)
                  .map(([n, v]) => `${n}(${v.count}건)`)
                  .join(", ") || "-";
              return `
          <tr onclick="_bdDrillOrg='${t.name.replace(/'/g, "\\'")}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:800">${t.name}</td>
            <td style="text-align:center">${t.count}건</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(t.demand)}</td>
            <td style="text-align:right;font-weight:800;color:#059669">${_bdFmt(t.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(t.pending)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:4px;justify-content:center">
                <div style="width:40px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${t.pct}%;height:100%;background:${t.pct >= 80 ? "#059669" : t.pct >= 50 ? "#D97706" : "#DC2626"};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${t.pct >= 80 ? "#059669" : t.pct >= 50 ? "#D97706" : "#DC2626"}">${t.pct}%</span>
              </div>
            </td>
            <td style="font-size:10px;color:#6B7280;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${applicantList}</td>
          </tr>`;
            })
            .join("")}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td>소계</td>
            <td style="text-align:center">${totalCount}건</td>
            <td style="text-align:right">${_bdFmt(totalDemand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(totalConfirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(totalPending)}</td>
            <td style="text-align:center;font-weight:900;color:${totalPct >= 80 ? "#059669" : totalPct >= 50 ? "#D97706" : "#DC2626"}">${totalPct}%</td>
            <td></td>
          </tr>
        </tbody>
      </table>`
          : `<div style="padding:40px;text-align:center;color:#9CA3AF">하위 팀 데이터 없음</div>`
      }
    </div>
  </div>`;
}

// ── 미분류 드릴다운 ──
function _renderBdUnmatched(el, plans, isPlatform, tenants) {
  const matchedIds = _bdGetMatchedIds(plans);
  const unmatched = plans.filter((p) => !matchedIds.has(p.id));

  const orgMap = {};
  unmatched.forEach((p) => {
    const name = p.applicant_name || "미상";
    if (!orgMap[name])
      orgMap[name] = { count: 0, demand: 0, confirmed: 0, pending: 0 };
    orgMap[name].count++;
    orgMap[name].demand += Number(p.amount || 0);
    if (["approved", "completed"].includes(p.status))
      orgMap[name].confirmed += Number(p.amount || 0);
    if (p.status === "pending") orgMap[name].pending += Number(p.amount || 0);
  });

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div><h1 class="bo-page-title">📊 교육예산 수요분석</h1></div>
    </div>
    ${_bdFilterBar(isPlatform, tenants)}
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillHq=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 전체 조직단위 보기
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#6B7280,#9CA3AF);color:white">
        <h2 style="margin:0;font-size:18px;font-weight:900">기타/미분류 계획 (${unmatched.length}건)</h2>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr><th>상신자</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요</th><th style="text-align:right">확정</th><th style="text-align:right">미결</th></tr></thead>
        <tbody>
          ${Object.entries(orgMap)
            .map(
              ([name, v]) => `
          <tr onclick="_bdDrillOrg='${name.replace(/'/g, "\\'")}';renderBudgetDemand()" style="cursor:pointer"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:700">${name}</td>
            <td style="text-align:center">${v.count}건</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(v.demand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(v.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(v.pending)}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 3: 개별 계획 목록
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel3(el) {
  const plans = (_bdPlans || []).filter((p) => {
    const dept = p.detail?.dept || p.applicant_name || "";
    const target = _bdDrillOrg || "";
    return (
      p.applicant_name === target ||
      dept === target ||
      _bdFuzzy(dept, target) ||
      _bdFuzzy(target, dept)
    );
  });

  const statusLabel = {
    pending: "대기",
    approved: "승인",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
  };
  const statusColor = {
    pending: "#D97706",
    approved: "#059669",
    rejected: "#DC2626",
    cancelled: "#9CA3AF",
    completed: "#059669",
  };
  const demandSum = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedSum = plans
    .filter((p) => ["approved", "completed"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillOrg=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 이전으로
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">📊 상세 계획 목록</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${_bdDrillOrg} — ${_bdYear}년 교육계획</h2>
        <div style="margin-top:8px;display:flex;gap:20px;font-size:12px">
          <span>수요 <strong>${_bdFmt(demandSum)}</strong></span>
          <span>확정 <strong style="color:#86EFAC">${_bdFmt(confirmedSum)}</strong></span>
          <span>${plans.length}건</span>
        </div>
      </div>
      ${
        plans.length > 0
          ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>ID</th><th>계획명</th><th>상신자</th><th>계정</th>
          <th style="text-align:right">금액</th><th>상태</th><th>제출일</th>
        </tr></thead>
        <tbody>
          ${plans
            .map((p) => {
              const st = p.status || "pending";
              return `
          <tr>
            <td><code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${(p.id || "").slice(-8)}</code></td>
            <td style="font-weight:700">${p.edu_name || "-"}</td>
            <td style="font-size:11px;color:#6B7280">${p.applicant_name || "-"}</td>
            <td>${p.account_code || "-"}</td>
            <td style="text-align:right;font-weight:900">${Number(p.amount || 0).toLocaleString()}원</td>
            <td><span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${statusColor[st] || "#6B7280"}15;color:${statusColor[st] || "#6B7280"}">${statusLabel[st] || st}</span></td>
            <td style="font-size:11px;color:#6B7280">${(p.created_at || "").slice(0, 10)}</td>
          </tr>`;
            })
            .join("")}
        </tbody>
      </table>`
          : `<div style="padding:40px;text-align:center;color:#9CA3AF">데이터 없음</div>`
      }
    </div>
  </div>`;
}

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────
function _bdFuzzy(a, b) {
  const strip = (s) => (s || "").replace(/OO/g, "").replace(/O/g, "").trim();
  return strip(a).includes(strip(b));
}

function _bdMatchTeam(teamName, plans) {
  return plans.filter((p) => {
    const dept = p.detail?.dept || p.applicant_name || "";
    return _bdFuzzy(dept, teamName) || _bdFuzzy(teamName, dept);
  });
}

function _bdGetMatchedIds(plans) {
  const matched = new Set();
  _bdGroups.forEach((g) => {
    (g.teams || []).forEach((t) => {
      _bdMatchTeam(t.name, plans).forEach((p) => matched.add(p.id));
    });
  });
  return matched;
}

function _bdAggregateGroup(g, plans) {
  const teams = g.teams || [];
  const teamNames = teams.map((t) => t.name);
  const gPlans = plans.filter((p) => {
    const dept = p.detail?.dept || p.applicant_name || "";
    return teamNames.some((tn) => _bdFuzzy(dept, tn) || _bdFuzzy(tn, dept));
  });
  const demand = gPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = gPlans
    .filter((p) => ["approved", "completed"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = gPlans
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejected = gPlans
    .filter((p) => p.status === "rejected")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return {
    id: g.id,
    name: g.name,
    count: gPlans.length,
    demand,
    confirmed,
    pending,
    rejected,
    pct: demand > 0 ? Math.round((confirmed / demand) * 100) : 0,
    teamCount: teams.length,
  };
}

function _bdAggregateUnmatched(unmatchedPlans) {
  const demand = unmatchedPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = unmatchedPlans
    .filter((p) => ["approved", "completed"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = unmatchedPlans
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejected = unmatchedPlans
    .filter((p) => p.status === "rejected")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  return {
    id: "__unmatched__",
    name: "기타/미분류",
    count: unmatchedPlans.length,
    demand,
    confirmed,
    pending,
    rejected,
    pct: demand > 0 ? Math.round((confirmed / demand) * 100) : 0,
    teamCount: 0,
  };
}

function _bdAggregateTeam(t, tPlans) {
  const demand = tPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = tPlans
    .filter((p) => ["approved", "completed"].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = tPlans
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const applicantMap = {};
  tPlans.forEach((p) => {
    const name = p.applicant_name || "미상";
    if (!applicantMap[name]) applicantMap[name] = { count: 0, demand: 0 };
    applicantMap[name].count++;
    applicantMap[name].demand += Number(p.amount || 0);
  });
  return {
    id: t.id,
    name: t.name,
    count: tPlans.length,
    demand,
    confirmed,
    pending,
    pct: demand > 0 ? Math.round((confirmed / demand) * 100) : 0,
    applicants: applicantMap,
  };
}

function _bdFmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + "억";
  if (n >= 10000) return (n / 10000).toFixed(0) + "만원";
  return n.toLocaleString() + "원";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ 수요예측 시뮬레이션 (Phase 4)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 시뮬레이션 시작 ──
async function _bdStartSimulation() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;

  // 기존 시뮬레이션 버전 로드
  try {
    const { data } = await sb
      .from('budget_simulation')
      .select('*')
      .eq('tenant_id', _bdTenant)
      .eq('fiscal_year', _bdYear)
      .order('version', { ascending: false });
    _bdSimVersions = data || [];
  } catch { _bdSimVersions = []; }

  // 최신 draft 또는 새로 생성
  const latestDraft = _bdSimVersions.find(v => v.status === 'draft');
  if (latestDraft) {
    _bdSimData = latestDraft;
    _bdSimEnvelope = Number(latestDraft.envelope_amount || 0);
    // allocations JSON → edits 복원
    _bdSimEdits = {};
    (latestDraft.allocations || []).forEach(a => {
      _bdSimEdits[a.plan_id] = Number(a.allocated || 0);
    });
  } else {
    _bdSimData = null;
    _bdSimEnvelope = 0;
    _bdSimEdits = {};
  }

  _bdSimMode = true;
  renderBudgetDemand();
}

// ── 시뮬레이션 화면 렌더링 ──
function _renderBdSimulation(el, isPlatform, tenants) {
  const plans = (_bdPlans || []).filter(p => p.status !== 'draft');
  const demandTotal = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const allocTotal = plans.reduce((s, p) => {
    const ed = _bdSimEdits[p.id];
    return s + (ed !== undefined ? ed : Number(p.allocated_amount || 0));
  }, 0);
  const remaining = _bdSimEnvelope - allocTotal;
  const editCount = Object.keys(_bdSimEdits).length;
  const isConfirmed = _bdSimData?.status === 'confirmed';
  const acctName = _bdAcctList.find(a => a.id === _bdAccountId)?.name || '전체 계정';

  const rows = plans.map((p, idx) => {
    const amt = Number(p.amount || 0);
    const origAlloc = Number(p.allocated_amount || 0);
    const editVal = _bdSimEdits.hasOwnProperty(p.id) ? _bdSimEdits[p.id] : origAlloc;
    const isEdited = _bdSimEdits.hasOwnProperty(p.id);
    const diff = editVal - amt;
    const diffColor = diff > 0 ? '#DC2626' : diff < 0 ? '#059669' : '#9CA3AF';
    const diffLabel = diff > 0 ? `+${_bdFmt(diff)}` : diff < 0 ? `-${_bdFmt(Math.abs(diff))}` : '-';
    const safeId = String(p.id || '').replace(/'/g, "\\'");

    return `
    <tr style="background:${isEdited ? '#FFFBEB' : ''}">
      <td>
        <div style="font-weight:700;font-size:12px">${p.team || p.dept || p.applicant_name || ''}</div>
        <div style="font-size:10px;color:#9CA3AF">${p.hq || p.center || ''}</div>
      </td>
      <td>
        <div style="font-weight:700;font-size:12px">${p.edu_name || p.title || ''}</div>
      </td>
      <td style="font-size:11px">${p.account_code || ''}</td>
      <td style="text-align:right;font-weight:800">${amt.toLocaleString()}원</td>
      <td style="text-align:right;padding:4px 6px" onclick="event.stopPropagation()">
        ${isConfirmed
          ? `<span style="font-weight:900;color:#059669">${editVal.toLocaleString()}원</span>`
          : `<input type="number" min="0" value="${editVal}"
              onchange="_bdSimInlineChange('${safeId}',this.value)"
              onkeydown="_bdSimKeyNav(event,${idx})"
              id="bd-sim-input-${idx}"
              style="width:110px;text-align:right;padding:6px 8px;border:1.5px solid ${isEdited ? '#F59E0B' : '#E5E7EB'};border-radius:6px;font-size:12px;font-weight:800;background:${isEdited ? '#FFFBEB' : '#fff'};outline:none"
              onfocus="this.style.borderColor='#7C3AED';this.select()" onblur="this.style.borderColor='${isEdited ? '#F59E0B' : '#E5E7EB'}'"
            />`
        }
      </td>
      <td style="text-align:right;font-size:11px;color:${diffColor};font-weight:700">${diffLabel}</td>
    </tr>`;
  }).join('');

  // 합계 행
  const totalRow = `
    <tr style="background:#F9FAFB;font-weight:900;border-top:2.5px solid #E5E7EB">
      <td colspan="3">합계 (${plans.length}건)</td>
      <td style="text-align:right">${demandTotal.toLocaleString()}원</td>
      <td style="text-align:right;color:#7C3AED" id="bd-sim-alloc-total">${allocTotal.toLocaleString()}원</td>
      <td></td>
    </tr>`;

  // 버전 목록
  const versionBadges = _bdSimVersions.map(v => {
    const isCurrent = _bdSimData?.id === v.id;
    const st = v.status === 'confirmed' ? '✅확정' : '📝초안';
    return `<button onclick="_bdLoadSimVersion('${v.id}')" style="padding:4px 12px;border-radius:8px;border:1.5px solid ${isCurrent ? '#7C3AED' : '#E5E7EB'};background:${isCurrent ? '#F5F3FF' : 'white'};font-size:11px;font-weight:${isCurrent ? 900 : 600};color:${isCurrent ? '#7C3AED' : '#6B7280'};cursor:pointer">
      v${v.version} ${v.version_label || ''} ${st}
    </button>`;
  }).join('');

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">🧮 예산배분 시뮬레이션</h1>
        <p class="bo-page-sub">${_bdYear}년 · ${acctName} · 교육계획별 배분액 편집</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${!isConfirmed ? `
          <button onclick="_bdSimSave()" style="padding:8px 18px;border-radius:10px;border:none;background:#7C3AED;color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.2)">
            💾 저장 (${editCount}건)
          </button>
          <button onclick="_bdSimConfirm()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #059669;background:#F0FDF4;font-size:12px;font-weight:900;color:#059669;cursor:pointer">
            ✅ 확정 (plans 반영)
          </button>
        ` : `
          <span style="font-size:12px;font-weight:900;color:#059669;padding:8px 16px;background:#D1FAE5;border-radius:10px">✅ 확정 완료</span>
        `}
        <button onclick="_bdSimMode=false;_bdSimEdits={};renderBudgetDemand()" style="padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
          ← 수요분석으로
        </button>
      </div>
    </div>

    ${_bdFilterBar(isPlatform, tenants)}

    <!-- Envelope 설정 -->
    <div class="bo-card" style="padding:18px 22px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;font-weight:900;color:#7C3AED">💰 예상 예산안 (Envelope)</span>
          ${isConfirmed
            ? `<span style="font-size:16px;font-weight:900;color:#7C3AED">${_bdSimEnvelope.toLocaleString()}원</span>`
            : `<input type="number" min="0" value="${_bdSimEnvelope}" id="bd-sim-envelope"
                onchange="_bdSimEnvelope=Math.max(0,parseInt(this.value)||0);_bdSimUpdateRemaining()"
                style="width:180px;padding:8px 12px;border:2px solid #7C3AED;border-radius:10px;font-size:14px;font-weight:900;color:#7C3AED;text-align:right;outline:none;background:#F5F3FF"
              />`
          }
        </div>
        <div style="height:30px;width:1px;background:#E5E7EB"></div>
        <div style="display:flex;gap:16px;align-items:center;font-size:12px">
          <span>📊 수요합계 <strong style="color:#002C5F">${demandTotal.toLocaleString()}원</strong></span>
          <span>✏️ 배분합계 <strong style="color:#7C3AED" id="bd-sim-alloc-sum">${allocTotal.toLocaleString()}원</strong></span>
          <span style="padding:4px 12px;border-radius:8px;font-weight:900;font-size:13px;
            background:${remaining >= 0 ? '#D1FAE5' : '#FEE2E2'};color:${remaining >= 0 ? '#059669' : '#DC2626'}"
            id="bd-sim-remaining">
            ${remaining >= 0 ? '잔여' : '⚠️ 초과'} ${Math.abs(remaining).toLocaleString()}원
          </span>
        </div>
      </div>
    </div>

    <!-- 버전 관리 -->
    ${_bdSimVersions.length > 0 ? `
    <div style="margin-bottom:12px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <span style="font-size:11px;font-weight:800;color:#6B7280">📋 버전:</span>
      ${versionBadges}
      ${!isConfirmed && _bdSimVersions.length < 10 ? `
        <button onclick="_bdSimNewVersion()" style="padding:4px 12px;border-radius:8px;border:1.5px dashed #D1D5DB;background:white;font-size:11px;font-weight:700;color:#9CA3AF;cursor:pointer">+ 새 버전</button>
      ` : ''}
    </div>` : ''}

    ${!isConfirmed ? `
    <div style="margin-bottom:12px;padding:10px 16px;border-radius:10px;background:#F5F3FF;border:1.5px solid #C4B5FD;display:flex;align-items:center;gap:8px;font-size:12px;color:#5B21B6;font-weight:700">
      <span style="font-size:16px">🧮</span>
      배분액 셀을 직접 수정하세요. Tab으로 다음 행 이동. <strong>💾 저장</strong>으로 시뮬레이션 저장, <strong>✅ 확정</strong>으로 plans에 반영합니다.
    </div>` : ''}

    <!-- 배분 그리드 -->
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#7C3AED08,#4F46E508);border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:900;color:#5B21B6">🧮 교육계획별 배분 시뮬레이션</span>
        <span style="font-size:11px;color:#6B7280">${acctName} · ${plans.length}건</span>
      </div>
      ${plans.length > 0 ? `
      <div style="overflow-x:auto">
      <table class="bo-table" style="font-size:12px;min-width:800px">
        <thead><tr>
          <th>제출팀</th><th>계획명</th><th>계정</th>
          <th style="text-align:right">신청액(계획)</th>
          <th style="text-align:right;background:#F5F3FF;color:#7C3AED">배분액 ${isConfirmed ? '' : '✏️'}</th>
          <th style="text-align:right">차이</th>
        </tr></thead>
        <tbody>
          ${rows}
          ${totalRow}
        </tbody>
      </table>
      </div>` : `
      <div style="padding:60px;text-align:center;color:#9CA3AF">
        <div style="font-size:48px;margin-bottom:10px">📭</div>
        <div style="font-weight:700">시뮬레이션 대상 교육계획이 없습니다</div>
      </div>`}
    </div>
  </div>`;

  // 첫 입력 포커스
  if (!isConfirmed) {
    setTimeout(() => {
      const first = document.getElementById('bd-sim-input-0');
      if (first) first.focus();
    }, 150);
  }
}

// ── 인라인 값 변경 ──
function _bdSimInlineChange(planId, rawValue) {
  const val = Math.max(0, parseInt(rawValue) || 0);
  _bdSimEdits[planId] = val;
  _bdSimUpdateRemaining();
}

// ── 잔여 실시간 갱신 ──
function _bdSimUpdateRemaining() {
  const plans = _bdPlans || [];
  let allocSum = 0;
  plans.forEach(p => {
    const ed = _bdSimEdits[p.id];
    allocSum += (ed !== undefined ? ed : Number(p.allocated_amount || 0));
  });
  const remaining = _bdSimEnvelope - allocSum;

  const el1 = document.getElementById('bd-sim-alloc-sum');
  if (el1) el1.textContent = allocSum.toLocaleString() + '원';
  const el2 = document.getElementById('bd-sim-alloc-total');
  if (el2) el2.textContent = allocSum.toLocaleString() + '원';
  const el3 = document.getElementById('bd-sim-remaining');
  if (el3) {
    el3.textContent = (remaining >= 0 ? '잔여 ' : '⚠️ 초과 ') + Math.abs(remaining).toLocaleString() + '원';
    el3.style.background = remaining >= 0 ? '#D1FAE5' : '#FEE2E2';
    el3.style.color = remaining >= 0 ? '#059669' : '#DC2626';
  }
}

// ── 키보드 네비게이션 ──
function _bdSimKeyNav(e, idx) {
  if (e.key === 'Tab' || e.key === 'Enter') {
    e.preventDefault();
    const next = document.getElementById(`bd-sim-input-${e.shiftKey ? idx - 1 : idx + 1}`);
    if (next) { next.focus(); next.select(); }
  } else if (e.key === 'Escape') {
    _bdSimMode = false; _bdSimEdits = {}; renderBudgetDemand();
  }
}

// ── 시뮬레이션 저장 ──
async function _bdSimSave() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const plans = _bdPlans || [];
  const allocations = plans.map(p => ({
    plan_id: p.id,
    plan_name: p.edu_name || p.title || '',
    requested: Number(p.amount || 0),
    allocated: _bdSimEdits.hasOwnProperty(p.id) ? _bdSimEdits[p.id] : Number(p.allocated_amount || 0),
  }));

  try {
    if (_bdSimData?.id) {
      // 기존 업데이트
      const { error } = await sb.from('budget_simulation').update({
        envelope_amount: _bdSimEnvelope,
        allocations: allocations,
        account_code: _bdAccountId || null,
        template_id: _bdTplId || null,
        updated_at: new Date().toISOString(),
      }).eq('id', _bdSimData.id);
      if (error) throw error;
    } else {
      // 신규 생성
      const newVersion = (_bdSimVersions.length > 0 ? Math.max(..._bdSimVersions.map(v => v.version)) : 0) + 1;
      const { data, error } = await sb.from('budget_simulation').insert({
        tenant_id: _bdTenant,
        fiscal_year: _bdYear,
        template_id: _bdTplId || null,
        account_code: _bdAccountId || null,
        envelope_amount: _bdSimEnvelope,
        version: newVersion,
        version_label: `v${newVersion}`,
        allocations: allocations,
        status: 'draft',
      }).select().single();
      if (error) throw error;
      _bdSimData = data;
    }
    alert('✅ 시뮬레이션 저장 완료');
    // 버전 목록 리프레시
    const { data: vs } = await sb.from('budget_simulation').select('*')
      .eq('tenant_id', _bdTenant).eq('fiscal_year', _bdYear)
      .order('version', { ascending: false });
    _bdSimVersions = vs || [];
    renderBudgetDemand();
  } catch (err) {
    alert('❌ 저장 실패: ' + err.message);
  }
}

// ── 시뮬레이션 확정 (plans.allocated_amount 반영) ──
async function _bdSimConfirm() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  if (_bdSimEnvelope <= 0) {
    alert('⚠️ 예상 예산안(Envelope)을 먼저 설정해 주세요.');
    return;
  }

  const plans = _bdPlans || [];
  const totalAlloc = plans.reduce((s, p) => {
    const ed = _bdSimEdits[p.id];
    return s + (ed !== undefined ? ed : Number(p.allocated_amount || 0));
  }, 0);
  const remaining = _bdSimEnvelope - totalAlloc;

  // ── P5 강화: 배분 합계 0원 경고
  if (totalAlloc === 0) {
    alert('⚠️ 배분액이 전부 0원입니다. 배분액을 입력한 후 확정하세요.');
    return;
  }

  // ── P5 강화: 예산 초과 시 차단
  if (remaining < 0) {
    const overAmt = Math.abs(remaining).toLocaleString();
    if (!confirm(
      `⚠️ 예산안 초과 경고\n\n배분 합계가 Envelope를 ${overAmt}원 초과합니다.\n\n` +
      `예산 초과 상태에서 확정할 경우 집행 시 예산 부족이 발생할 수 있습니다.\n\n` +
      `초과 상태로 확정하시겠습니까?`
    )) return;
  }

  // ── 확정 확인 다이얼로그
  const editCount = Object.keys(_bdSimEdits).length;
  let msg = `✅ 시뮬레이션 확정\n\n`;
  msg += `예상 예산안: ${_bdSimEnvelope.toLocaleString()}원\n`;
  msg += `배분 합계:   ${totalAlloc.toLocaleString()}원\n`;
  msg += `잔여:        ${remaining >= 0 ? '+' : ''}${remaining.toLocaleString()}원\n`;
  msg += `변경 항목:   ${editCount}건 / 전체 ${plans.length}건\n\n`;
  msg += `확정하면 각 교육계획의 배정액(allocated_amount)이 일괄 업데이트됩니다.\n계속하시겠습니까?`;
  if (!confirm(msg)) return;

  // ── P5: 진행 Toast 표시
  const _toast = (m, t = 'info') => {
    if (typeof _boShowToast === 'function') _boShowToast(m, t);
    else console.log('[P5]', m);
  };
  _toast('🔄 배정액 일괄 확정 중... (1/3) 시뮬레이션 저장');

  try {
    // 1. 시뮬레이션 먼저 저장
    await _bdSimSaveInternal(sb, plans);

    // 2. plans.allocated_amount 일괄 업데이트 (50건 chunk)
    _toast('🔄 배정액 일괄 확정 중... (2/3) 교육계획 배정액 반영');
    const chunk = 50;
    let updated = 0;
    const changedPlans = []; // bankbooks 연동용

    for (let i = 0; i < plans.length; i += chunk) {
      const batch = plans.slice(i, i + chunk);
      const promises = batch.map(p => {
        const newAlloc = _bdSimEdits.hasOwnProperty(p.id)
          ? _bdSimEdits[p.id]
          : Number(p.allocated_amount || 0);
        const prevAlloc = Number(p.allocated_amount || 0);
        if (newAlloc !== prevAlloc) {
          changedPlans.push({ p, prevAlloc, newAlloc });
        }
        return sb.from('plans').update({
          allocated_amount: newAlloc,
          updated_at: new Date().toISOString(),
        }).eq('id', p.id);
      });
      const results = await Promise.all(promises);
      results.forEach((r, j) => {
        if (r.error) throw new Error(`${batch[j].id}: ${r.error.message}`);
      });
      updated += batch.length;
    }

    // 3. 시뮬레이션 상태 confirmed
    if (_bdSimData?.id) {
      await sb.from('budget_simulation').update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: boCurrentPersona?.name || 'admin',
        total_allocated: totalAlloc,
        remaining_amount: remaining,
      }).eq('id', _bdSimData.id);
    }

    // 4. ── P5 신규: bankbooks.current_balance 동기화
    _toast('🔄 배정액 일괄 확정 중... (3/3) 통장 잔액 동기화');
    if (changedPlans.length > 0) {
      // orgId별로 차이 집계
      const orgDiff = {}; // { `${orgId}|${acctCode}`: diffAmount }
      changedPlans.forEach(({ p, prevAlloc, newAlloc }) => {
        const orgId = p.applicant_org_id || p.org_id;
        const acctCode = p.account_code || '';
        if (!orgId) return;
        const key = `${orgId}|${acctCode}|${p.tenant_id || _bdTenant}`;
        if (!orgDiff[key]) orgDiff[key] = { orgId, acctCode, tenantId: p.tenant_id || _bdTenant, diff: 0 };
        orgDiff[key].diff += (newAlloc - prevAlloc);
      });

      for (const { orgId, acctCode, tenantId, diff } of Object.values(orgDiff)) {
        if (diff === 0 || !orgId) continue;
        try {
          const { data: bk } = await sb.from('bankbooks')
            .select('id,current_balance')
            .eq('tenant_id', tenantId)
            .eq('org_id', orgId)
            .eq('account_code', acctCode)
            .eq('status', 'active')
            .limit(1).single();
          if (bk) {
            const newBal = Math.max(0, Number(bk.current_balance) + diff);
            await sb.from('bankbooks').update({
              current_balance: newBal,
              updated_at: new Date().toISOString(),
            }).eq('id', bk.id);
            // 이력 기록
            await sb.from('budget_usage_log').insert({
              tenant_id: tenantId,
              bankbook_id: bk.id,
              action: diff > 0 ? 'deposit' : 'withdrawal',
              amount: Math.abs(diff),
              balance_before: Number(bk.current_balance),
              balance_after: newBal,
              reference_type: 'simulation_confirm',
              memo: `시뮬레이션 확정 배정액 조정 (v${_bdSimData?.version || '?'})`,
              performed_by: boCurrentPersona?.name || 'system',
            }).catch(e => console.warn('[P5] budget_usage_log 기록 skip:', e.message));
          }
        } catch (bkErr) {
          console.warn('[P5] bankbook sync skip:', bkErr.message);
        }
      }
    }

    _toast(`✅ ${updated}건 배정액 확정 완료!`, 'success');
    setTimeout(() => {
      _bdSimMode = false;
      _bdSimEdits = {};
      _bdPlans = null;
      renderBudgetDemand();
    }, 600);

  } catch (err) {
    _toast('❌ 확정 실패: ' + err.message, 'error');
    alert('❌ 확정 실패: ' + err.message);
  }
}

// ── 내부 저장 (확정 전 자동 호출) ──
async function _bdSimSaveInternal(sb, plans) {
  const allocations = plans.map(p => ({
    plan_id: p.id,
    plan_name: p.edu_name || p.title || '',
    requested: Number(p.amount || 0),
    allocated: _bdSimEdits.hasOwnProperty(p.id) ? _bdSimEdits[p.id] : Number(p.allocated_amount || 0),
  }));

  if (_bdSimData?.id) {
    await sb.from('budget_simulation').update({
      envelope_amount: _bdSimEnvelope,
      allocations: allocations,
      updated_at: new Date().toISOString(),
    }).eq('id', _bdSimData.id);
  } else {
    const newVersion = (_bdSimVersions.length > 0 ? Math.max(..._bdSimVersions.map(v => v.version)) : 0) + 1;
    const { data } = await sb.from('budget_simulation').insert({
      tenant_id: _bdTenant,
      fiscal_year: _bdYear,
      template_id: _bdTplId || null,
      account_code: _bdAccountId || null,
      envelope_amount: _bdSimEnvelope,
      version: newVersion,
      version_label: `v${newVersion}`,
      allocations: allocations,
      status: 'draft',
    }).select().single();
    _bdSimData = data;
  }
}

// ── 버전 로드 ──
async function _bdLoadSimVersion(versionId) {
  const v = _bdSimVersions.find(x => x.id === versionId);
  if (!v) return;
  _bdSimData = v;
  _bdSimEnvelope = Number(v.envelope_amount || 0);
  _bdSimEdits = {};
  (v.allocations || []).forEach(a => {
    _bdSimEdits[a.plan_id] = Number(a.allocated || 0);
  });
  renderBudgetDemand();
}

// ── 새 버전 생성 ──
function _bdSimNewVersion() {
  if (_bdSimVersions.length >= 10) {
    alert('⚠️ 시뮬레이션은 최대 10개까지 생성 가능합니다.');
    return;
  }
  _bdSimData = null; // 새 레코드
  _bdSimEdits = {};
  renderBudgetDemand();
}
