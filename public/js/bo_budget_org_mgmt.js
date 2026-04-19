// ─── bo_budget_org_mgmt.js — 조직별 예산 관리 (REFACTOR-1: bo_budget_master.js 분리) ───
function renderPermissions() {
  const personas = Object.values(BO_PERSONAS);
  return `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
    <span class="bo-section-title">권한 및 담당자 현황</span>
    <button class="bo-btn-primary bo-btn-sm">+ 담당자 추가</button>
  </div>
  <table class="bo-table">
    <thead><tr><th>성명</th><th>소속</th><th>직급</th><th>역할</th><th>접근 메뉴</th><th>관리</th></tr></thead>
    <tbody>
      ${personas
        .map(
          (p) => `
      <tr>
        <td style="font-weight:700">${p.name}</td>
        <td style="font-size:12px;color:#6B7280">${p.dept}</td>
        <td style="font-size:12px">${p.pos}</td>
        <td><span class="role-tag ${p.roleClass}">${p.roleLabel}</span></td>
        <td style="font-size:11px;color:#6B7280">${p.accessMenus.join(" · ")}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="bo-btn-secondary bo-btn-sm">수정</button>
            <button class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#EF4444">삭제</button>
          </div>
        </td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</div>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// [예산 배정 현황 관리] — 조직별 통장 + 기간별 배정 관리 (5탭)
// ═════════════════════════════════════════════════════════════════════════════
let _obTenant = null;
let _obTplId = null;
let _obGroupId = null;
let _obAccountId = null;
let _obPeriodId = null;
let _obTplList = [];
let _obAcctList = [];
let _obGroups = [];
let _obPeriods = [];
let _obBankbooks = [];
let _obAllocations = [];
let _obLogs = [];
let _obTab = 0;
let _obAllBankbooks = []; // 전체 제도그룹 통장 (교차 VOrg 이관용)
let _obAllAllocations = []; // 전체 제도그룹 allocation
let _obOrgStatuses = {}; // org_id → 'active'|'deprecated'

// ── 공통 데이터 로드 ──
async function _obLoadData() {
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";
  if (!_obTenant)
    _obTenant = isPlatform
      ? tenants[0]?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";

  try {
    const { data } = await sb
      .from("virtual_org_templates")
      .select("id,name,service_type,purpose,tree_data")
      .eq("tenant_id", _obTenant);
    _obTplList = (data || []).filter(
      (t) => (t.purpose || t.service_type || "edu_support") === "edu_support",
    );
  } catch (e) {
    _obTplList = [];
  }
  if (!_obTplId || !_obTplList.find((t) => t.id === _obTplId))
    _obTplId = _obTplList[0]?.id || null;

  const curTpl = _obTplList.find((t) => t.id === _obTplId);
  _obGroups = curTpl?.tree_data?.hqs || [];

  if (_obTplId) {
    try {
      const { data } = await sb
        .from("budget_accounts")
        .select("*")
        .eq("virtual_org_template_id", _obTplId)
        .eq("tenant_id", _obTenant);
      _obAcctList = (data || []).filter((a) => a.active);
    } catch (e) {
      _obAcctList = [];
    }
  } else {
    _obAcctList = [];
  }
  if (_obAccountId && !_obAcctList.find((a) => a.id === _obAccountId))
    _obAccountId = null;

  try {
    const { data } = await sb
      .from("budget_periods")
      .select("*")
      .eq("tenant_id", _obTenant)
      .order("fiscal_year", { ascending: false })
      .order("quarter", { ascending: true, nullsFirst: true });
    _obPeriods = data || [];
  } catch (e) {
    _obPeriods = [];
  }
  if (!_obPeriodId || !_obPeriods.find((p) => p.id === _obPeriodId))
    _obPeriodId = _obPeriods[0]?.id || null;

  if (_obTplId) {
    let q = sb
      .from("org_budget_bankbooks")
      .select("*")
      .eq("tenant_id", _obTenant)
      .eq("template_id", _obTplId)
      .eq("status", "active");
    if (_obGroupId) q = q.eq("vorg_group_id", _obGroupId);
    if (_obAccountId) q = q.eq("account_id", _obAccountId);
    try {
      const { data } = await q;
      _obBankbooks = data || [];
    } catch (e) {
      _obBankbooks = [];
    }
  } else {
    _obBankbooks = [];
  }

  if (_obBankbooks.length > 0 && _obPeriodId) {
    const bbIds = _obBankbooks.map((b) => b.id);
    try {
      const { data } = await sb
        .from("budget_allocations")
        .select("*")
        .in("bankbook_id", bbIds)
        .eq("period_id", _obPeriodId);
      _obAllocations = data || [];
    } catch (e) {
      _obAllocations = [];
    }
  } else {
    _obAllocations = [];
  }

  if (_obAllocations.length > 0) {
    const alIds = _obAllocations.map((a) => a.id);
    try {
      const { data } = await sb
        .from("budget_allocation_log")
        .select("*")
        .in("allocation_id", alIds)
        .order("performed_at", { ascending: false })
        .limit(30);
      _obLogs = data || [];
    } catch (e) {
      _obLogs = [];
    }
  } else {
    _obLogs = [];
  }

  // 교차 VOrg 이관용: 필터 무관하게 제도그룹 전체 통장 로드
  if (_obTplId) {
    try {
      const { data } = await sb
        .from("org_budget_bankbooks")
        .select("*")
        .eq("tenant_id", _obTenant)
        .eq("template_id", _obTplId)
        .eq("status", "active");
      _obAllBankbooks = data || [];
    } catch (e) {
      _obAllBankbooks = [];
    }
    if (_obAllBankbooks.length > 0 && _obPeriodId) {
      const allBbIds = _obAllBankbooks.map((b) => b.id);
      try {
        const { data } = await sb
          .from("budget_allocations")
          .select("*")
          .in("bankbook_id", allBbIds)
          .eq("period_id", _obPeriodId);
        _obAllAllocations = data || [];
      } catch (e) {
        _obAllAllocations = [];
      }
    } else {
      _obAllAllocations = [];
    }
  } else {
    _obAllBankbooks = [];
    _obAllAllocations = [];
  }

  // 조직 상태 로드 (deprecated 차단용)
  try {
    const { data } = await sb
      .from("organizations")
      .select("id,status")
      .eq("tenant_id", _obTenant);
    _obOrgStatuses = {};
    (data || []).forEach((o) => {
      _obOrgStatuses[o.id] = o.status;
    });
  } catch (e) {
    _obOrgStatuses = {};
  }
}

// ── 진입점 ──
async function renderOrgBudget() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div style="padding:40px;text-align:center;color:#6B7280">⏳ 로딩 중...</div>';
  await _obLoadData();

  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";
  const curPeriod = _obPeriods.find((p) => p.id === _obPeriodId);
  const isClosed = curPeriod?.status === "closed";
  const fmt = (n) => Number(n).toLocaleString();

  // ── 필터 HTML ──
  const tenantSel = isPlatform
    ? `<select onchange="_obTenant=this.value;_obTplId=null;_obGroupId=null;_obAccountId=null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:11px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
    ${tenants.map((t) => `<option value="${t.id}" ${t.id === _obTenant ? "selected" : ""}>${t.name}</option>`).join("")}
  </select>`
    : `<span style="font-size:12px;font-weight:800;color:#111827">🏢 ${tenants.find((t) => t.id === _obTenant)?.name || _obTenant}</span>`;

  const tplSel = _obTplList.length
    ? `<select onchange="_obTplId=this.value;_obGroupId=null;_obAccountId=null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:11px;font-weight:700;background:#EFF6FF;color:#1D4ED8;cursor:pointer;min-width:180px">
    ${_obTplList.map((t) => `<option value="${t.id}" ${t.id === _obTplId ? "selected" : ""}>${t.name}</option>`).join("")}
  </select>`
    : '<span style="font-size:11px;color:#9CA3AF">제도그룹 없음</span>';

  const groupSel = _obGroups.length
    ? `<select onchange="_obGroupId=this.value||null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #DDD6FE;border-radius:8px;font-size:11px;font-weight:700;background:#F5F3FF;color:#7C3AED;cursor:pointer">
    <option value="">전체 그룹</option>
    ${_obGroups.map((g) => `<option value="${g.id}" ${g.id === _obGroupId ? "selected" : ""}>${g.name}</option>`).join("")}
  </select>`
    : "";

  const acctSel = _obAcctList.length
    ? `<select onchange="_obAccountId=this.value||null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #BBF7D0;border-radius:8px;font-size:11px;font-weight:700;background:#F0FDF4;color:#059669;cursor:pointer">
    <option value="">전체 계정</option>
    ${_obAcctList.map((a) => `<option value="${a.id}" ${a.id === _obAccountId ? "selected" : ""}>${a.name}</option>`).join("")}
  </select>`
    : "";

  const periodSel = _obPeriods.length
    ? `<select onchange="_obPeriodId=this.value;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #FED7AA;border-radius:8px;font-size:11px;font-weight:700;background:#FFF7ED;color:#C2410C;cursor:pointer">
    ${_obPeriods.map((p) => `<option value="${p.id}" ${p.id === _obPeriodId ? "selected" : ""}>${p.period_label}${p.status === "closed" ? " (마감)" : ""}</option>`).join("")}
  </select>`
    : "";

  // ── 탭 ──
  const tabs = [
    "📊 배정 현황",
    "💰 기초·추가 배정",
    "📋 팀 배분",
    "↔ 이관",
    "📜 변경 이력",
  ];

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1100px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">예산운영</span>
        <h1 style="font-size:18px;font-weight:900;color:#111827;margin:0">💰 예산 배정 현황 관리</h1>
      </div>
      <p style="font-size:11px;color:#64748B;margin:0">가상교육조직별·예산계정별·기간별 예산 배정 현황을 조회하고 관리합니다.</p>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding:10px 14px;background:#FAFBFF;border:1.5px solid #E5E7EB;border-radius:10px">
    ${tenantSel} ${tplSel} ${groupSel} ${acctSel} ${periodSel}
    ${isClosed ? '<span style="margin-left:auto;font-size:10px;font-weight:800;color:#DC2626;background:#FEE2E2;padding:4px 10px;border-radius:6px">🔒 마감 기간</span>' : ""}
  </div>
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:16px" id="ob-tabs">
    ${tabs
      .map(
        (t, i) => `<button onclick="_obSwitchTab(${i})" id="ob-tab-${i}"
      style="padding:8px 16px;font-size:11px;font-weight:700;border:none;background:transparent;cursor:pointer;
      color:${i === _obTab ? "#059669" : "#9CA3AF"};border-bottom:${i === _obTab ? "3px solid #059669" : "3px solid transparent"};
      margin-bottom:-2px;transition:all .15s;white-space:nowrap">${t}</button>`,
      )
      .join("")}
  </div>
  <div id="ob-tab-content"></div>
</div>`;

  _obRenderTabContent();
}

function _obSwitchTab(idx) {
  _obTab = idx;
  [0, 1, 2, 3, 4].forEach((i) => {
    const t = document.getElementById(`ob-tab-${i}`);
    if (!t) return;
    t.style.color = i === idx ? "#059669" : "#9CA3AF";
    t.style.borderBottom =
      i === idx ? "3px solid #059669" : "3px solid transparent";
  });
  _obRenderTabContent();
}

function _obRenderTabContent() {
  const el = document.getElementById("ob-tab-content");
  if (!el) return;
  const fns = [
    _obRenderOverview,
    _obRenderEntry,
    _obRenderDist,
    _obRenderTransfer,
    _obRenderHistory,
  ];
  el.innerHTML = fns[_obTab]();
}

// ═══ 탭1: 배정 현황 ═══
function _obRenderOverview() {
  const fmt = (n) => Number(n).toLocaleString();
  const totalAlloc = _obAllocations.reduce(
    (s, a) => s + Number(a.allocated_amount || 0),
    0,
  );
  const totalUsed = _obAllocations.reduce(
    (s, a) => s + Number(a.used_amount || 0),
    0,
  );
  const totalFrozen = _obAllocations.reduce(
    (s, a) => s + Number(a.frozen_amount || 0),
    0,
  );
  const totalCarry = _obAllocations.reduce(
    (s, a) => s + Number(a.carryover_amount || 0),
    0,
  );
  const balance = totalAlloc + totalCarry - totalUsed - totalFrozen;
  const pct =
    totalAlloc + totalCarry > 0
      ? ((balance / (totalAlloc + totalCarry)) * 100).toFixed(1)
      : "0";
  const curPeriod = _obPeriods.find((p) => p.id === _obPeriodId);

  // 통장 그룹핑
  const grouped = {};
  _obBankbooks.forEach((b) => {
    const key = b.vorg_group_id + "|" + b.account_id;
    if (!grouped[key])
      grouped[key] = {
        groupId: b.vorg_group_id,
        accountId: b.account_id,
        items: [],
      };
    grouped[key].items.push(b);
  });

  let bankbookHtml = "";
  if (Object.keys(grouped).length === 0 && _obTplId) {
    bankbookHtml = `<div style="padding:40px;text-align:center;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#9CA3AF">
      <div style="font-size:32px;margin-bottom:8px">📭</div>
      <div style="font-size:12px;font-weight:700;color:#64748B">조직별 통장이 없습니다</div>
      <div style="font-size:11px;margin-top:4px"><button class="bo-btn-primary bo-btn-sm" onclick="_obAutoCreate()" style="background:#7C3AED;border-color:#7C3AED">🏗️ 통장 자동 생성</button></div>
    </div>`;
  } else {
    Object.values(grouped).forEach((g) => {
      const grp = _obGroups.find((gr) => gr.id === g.groupId);
      const acct = _obAcctList.find((a) => a.id === g.accountId);
      const grpAllocs = g.items.map((b) => ({
        ...b,
        alloc: _obAllocations.find((a) => a.bankbook_id === b.id),
      }));
      const grpTotal = grpAllocs.reduce(
        (s, b) => s + Number(b.alloc?.allocated_amount || 0),
        0,
      );
      const grpUsed = grpAllocs.reduce(
        (s, b) => s + Number(b.alloc?.used_amount || 0),
        0,
      );

      bankbookHtml += `<div class="bo-card" style="margin-bottom:12px;overflow:hidden">
        <div style="padding:12px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-weight:900;font-size:13px;color:#1E40AF">🏢 ${grp?.name || g.groupId}</div>
          <div style="font-size:10px;color:#6B7280">💳 ${acct ? acct.name + " (" + acct.code + ")" : g.accountId} · ${g.items.length}개 조직</div></div>
          <div style="text-align:right"><div style="font-size:10px;color:#6B7280">배정 합계</div><div style="font-weight:900;font-size:14px;color:#059669">${fmt(grpTotal)}원</div></div>
        </div>
        <table class="bo-table" style="font-size:11px"><thead><tr>
          <th style="width:24px"></th><th>조직명</th><th>유형</th>
          <th style="text-align:right">배정액</th><th style="text-align:right">집행</th><th style="text-align:right">동결</th><th style="text-align:right">잔액</th>
          <th style="text-align:center;width:110px">관리</th>
        </tr></thead><tbody>
        ${grpAllocs
          .map((b) => {
            const al = b.alloc;
            const a = Number(al?.allocated_amount || 0),
              u = Number(al?.used_amount || 0),
              f = Number(al?.frozen_amount || 0);
            const bal = a - u - f;
            const isP = !b.parent_org_id;
            return `<tr style="${isP ? "background:#FAFBFF;font-weight:700" : ""}">
            <td style="text-align:center;font-size:10px">${isP ? "▼" : "└"}</td>
            <td style="${isP ? "" : "padding-left:24px"}">${b.org_type === "hq" || b.org_type === "center" ? "🏢" : "👥"} ${b.org_name}${_obOrgStatuses[b.org_id] === "deprecated" ? ' <span style="font-size:8px;padding:1px 4px;background:#FEE2E2;color:#DC2626;border-radius:3px;font-weight:800">미사용</span>' : ""}</td>
            <td><span style="font-size:9px;padding:1px 5px;border-radius:4px;background:${isP ? "#DBEAFE" : "#F3F4F6"};color:${isP ? "#1D4ED8" : "#6B7280"}">${b.org_type === "hq" ? "본부" : b.org_type === "center" ? "센터" : "팀"}</span></td>
            <td style="text-align:right;color:#059669">${fmt(a)}</td>
            <td style="text-align:right;color:#DC2626">${fmt(u)}</td>
            <td style="text-align:right;color:#D97706">${fmt(f)}</td>
            <td style="text-align:right;font-weight:700;color:${bal >= 0 ? "#111" : "#EF4444"}">${fmt(bal)}</td>
            <td style="text-align:center"><button class="bo-btn-secondary bo-btn-sm" onclick="_obEditAlloc('${b.id}',${a})" style="font-size:9px;padding:2px 5px">수정</button> <button class="bo-btn-secondary bo-btn-sm" onclick="_obDeactivateBankbook('${b.id}')" style="font-size:9px;padding:2px 5px;color:#DC2626;border-color:#FECACA" title="통장 비활성화">제외</button></td>
          </tr>`;
          })
          .join("")}
        </tbody></table></div>`;
    });
  }

  return `
  ${
    curPeriod
      ? `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">
    <div class="bo-card" style="padding:12px;text-align:center"><div style="font-size:9px;color:#6B7280;font-weight:700">📅 기간</div><div style="font-size:13px;font-weight:900;color:#111;margin-top:3px">${curPeriod.period_label}</div><div style="font-size:9px;color:${curPeriod.status === "open" ? "#059669" : "#DC2626"};font-weight:700">${curPeriod.status === "open" ? "● 진행중" : "● 마감"}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #059669"><div style="font-size:9px;color:#6B7280;font-weight:700">💰 총 배정</div><div style="font-size:15px;font-weight:900;color:#059669;margin-top:3px">${fmt(totalAlloc)}</div>${totalCarry > 0 ? `<div style="font-size:9px;color:#1D4ED8">이월 +${fmt(totalCarry)}</div>` : ""}</div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #DC2626"><div style="font-size:9px;color:#6B7280;font-weight:700">📊 집행</div><div style="font-size:15px;font-weight:900;color:#DC2626;margin-top:3px">${fmt(totalUsed)}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #D97706"><div style="font-size:9px;color:#6B7280;font-weight:700">🔒 동결</div><div style="font-size:15px;font-weight:900;color:#D97706;margin-top:3px">${fmt(totalFrozen)}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #1D4ED8"><div style="font-size:9px;color:#6B7280;font-weight:700">💡 잔액</div><div style="font-size:15px;font-weight:900;color:#1D4ED8;margin-top:3px">${fmt(balance)}</div><div style="font-size:9px;color:#9CA3AF">${pct}%</div></div>
  </div>`
      : ""
  }
  ${bankbookHtml}
  <div id="ob-alloc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:420px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <h3 style="font-size:14px;font-weight:800;margin:0 0 14px">💰 예산 배정 수정</h3>
      <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">배정 금액 (원)</label>
      <input id="ob-alloc-amt" type="number" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700"></div>
      <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">사유</label>
      <input id="ob-alloc-reason" type="text" placeholder="배정 사유" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px"></div>
      <input id="ob-alloc-bbid" type="hidden">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('ob-alloc-modal').style.display='none'">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="_obSaveAlloc()">저장</button>
      </div>
    </div>
  </div>`;
}

// ═══ 탭2: 기초·추가 배정 ═══
function _obRenderEntry() {
  const fmt = (n) => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find((p) => p.id === _obPeriodId);
  const isClosed = curPeriod?.status === "closed";

  if (isClosed)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div>
    <div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간입니다 — 배정 수정이 불가합니다</div></div>`;

  if (_obBankbooks.length === 0)
    return `<div style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:32px">📭</div><div style="font-weight:700;margin-top:8px">조직 통장이 없습니다. 탭1에서 통장을 먼저 생성하세요.</div></div>`;

  // 기초 미배정 통장
  const unallocated = _obBankbooks.filter(
    (b) => !_obAllocations.find((a) => a.bankbook_id === b.id),
  );
  const allocated = _obBankbooks.filter((b) =>
    _obAllocations.find((a) => a.bankbook_id === b.id),
  );

  return `<div style="max-width:750px">
    <!-- 기초 배정 -->
    ${
      unallocated.length > 0
        ? `
    <div class="bo-card" style="padding:20px;border:2px solid #FED7AA;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="background:#C2410C;color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:6px">초기 설정</span>
        <span style="font-weight:800;font-size:13px;color:#C2410C">기초 예산 일괄 입력</span>
        <span style="font-size:10px;color:#9CA3AF">${unallocated.length}개 통장 미배정</span>
      </div>
      <div style="background:#FFF7ED;border-radius:8px;padding:8px 12px;font-size:11px;color:#92400E;margin-bottom:12px">
        ✏️ 아래 통장에 기초 예산을 입력하면 즉시 반영됩니다.
      </div>
      <div style="max-height:300px;overflow-y:auto">
      ${unallocated
        .map((b, i) => {
          const grp = _obGroups.find((g) => g.id === b.vorg_group_id);
          return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F3F4F6">
          <span style="font-size:11px;font-weight:700;min-width:160px">${grp?.name || ""} > ${b.org_name}</span>
          <input type="number" id="ob-init-${i}" placeholder="0" style="flex:1;padding:6px 8px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;font-weight:700;text-align:right">
          <span style="font-size:10px;color:#9CA3AF">원</span>
        </div>`;
        })
        .join("")}
      </div>
      <button onclick="_obSubmitInitBatch()" class="bo-btn-primary" style="width:100%;margin-top:12px;padding:12px;background:#C2410C;border-color:#C2410C">📋 기초 예산 일괄 등록</button>
    </div>`
        : `<div style="padding:12px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">✅</span><div style="font-weight:800;color:#065F46;font-size:12px">모든 통장의 기초 예산이 등록됐습니다. 증액이 필요하면 아래 추가 배정을 이용하세요.</div>
    </div>`
    }

    <!-- 추가 배정 -->
    <div class="bo-card" style="padding:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="background:#059669;color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:6px">연중 증액</span>
        <span style="font-weight:800;font-size:13px">추가 배정 — 특정 통장에 예산 추가</span>
      </div>
      <div style="display:grid;gap:10px">
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">대상 통장</label>
          <select id="ob-add-bb" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
            <option value="">— 통장 선택 —</option>
            ${_obBankbooks
              .map((b) => {
                const al = _obAllocations.find((a) => a.bankbook_id === b.id);
                const grp = _obGroups.find((g) => g.id === b.vorg_group_id);
                return `<option value="${b.id}">${grp?.name || ""} > ${b.org_name} (현재: ${fmt(al?.allocated_amount || 0)}원)</option>`;
              })
              .join("")}
          </select>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">추가 금액</label>
          <input type="number" id="ob-add-amt" placeholder="0" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-weight:900">
        </div>
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">사유 (필수)</label>
          <input type="text" id="ob-add-reason" placeholder="예) Q2 외부 교육 증가로 추가 배정" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        </div>
        <button onclick="_obSubmitAdd()" class="bo-btn-primary" style="padding:12px">✅ 추가 배정 확정</button>
      </div>
    </div>
  </div>`;
}

// ═══ 탭3: 팀 배분 ═══
function _obRenderDist() {
  const fmt = (n) => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find((p) => p.id === _obPeriodId);
  if (curPeriod?.status === "closed")
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간</div></div>`;
  if (_obBankbooks.length === 0)
    return `<div style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px">📭</div><div style="font-weight:700;margin-top:8px">통장이 없습니다.</div></div>`;

  // 계정별 총 배정 vs 조직 배정 합계
  const grouped = {};
  _obBankbooks.forEach((b) => {
    if (!grouped[b.account_id]) grouped[b.account_id] = [];
    grouped[b.account_id].push(b);
  });

  let html = '<div style="max-width:800px">';
  html += `<div style="padding:8px 14px;background:#EDE9FE;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:12px;font-size:11px;color:#5B21B6;font-weight:600">
    📋 <b>팀 배분</b> — 각 통장에 배정 금액을 입력합니다. 입력 완료 후 일괄 저장합니다.</div>`;

  let inputIdx = 0;
  Object.entries(grouped).forEach(([acctId, bbs]) => {
    const acct = _obAcctList.find((a) => a.id === acctId);
    const totalAllocated = bbs.reduce((s, b) => {
      const al = _obAllocations.find((a) => a.bankbook_id === b.id);
      return s + Number(al?.allocated_amount || 0);
    }, 0);

    html += `<div class="bo-card" style="margin-bottom:12px;overflow:hidden">
      <div style="padding:10px 16px;background:#EFF6FF;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:800;font-size:12px;color:#1D4ED8">💳 ${acct?.name || acctId}</span>
        <span style="font-size:10px;color:#6B7280">현재 배분 합계: <b>${fmt(totalAllocated)}원</b></span>
      </div>
      <table class="bo-table" style="font-size:11px"><thead><tr><th>조직</th><th style="text-align:right">현재 배정</th><th>추가 배분 입력</th></tr></thead><tbody>`;

    bbs.forEach((b) => {
      const al = _obAllocations.find((a) => a.bankbook_id === b.id);
      const cur = Number(al?.allocated_amount || 0);
      const id = `ob-dist-${inputIdx++}`;
      const grp = _obGroups.find((g) => g.id === b.vorg_group_id);
      html += `<tr>
        <td style="${b.parent_org_id ? "padding-left:24px" : ""}">${b.parent_org_id ? "└ " : ""}<b>${b.org_name}</b> <span style="font-size:9px;color:#9CA3AF">${grp?.name || ""}</span></td>
        <td style="text-align:right;font-weight:700">${cur > 0 ? fmt(cur) + "원" : '<span style="color:#D97706">미배분</span>'}</td>
        <td><input type="number" id="${id}" data-bbid="${b.id}" class="ob-dist-input" placeholder="0" style="width:120px;padding:5px 8px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px;font-weight:700;text-align:right"></td>
      </tr>`;
    });
    html += "</tbody></table></div>";
  });

  html += `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:8px 12px;font-size:11px;color:#92400E;margin-bottom:10px">
    ⚠️ 입력한 금액은 현재 배정에 <b>추가</b>됩니다. 전체 교체가 아닌 증액입니다.</div>
  <button onclick="_obSubmitDist()" class="bo-btn-primary" style="width:100%;padding:12px;font-size:13px">✅ 일괄 배분 확정</button></div>`;
  return html;
}

// ═══ 탭4: 이관 (교차 VOrg 지원) ═══
function _obRenderTransfer() {
  const fmt = (n) => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find((p) => p.id === _obPeriodId);
  if (curPeriod?.status === "closed")
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간</div></div>`;

  // 교차 VOrg: 전체 제도그룹 통장 사용
  const allBbs = _obAllBankbooks.length > 0 ? _obAllBankbooks : _obBankbooks;
  const allAllocs =
    _obAllAllocations.length > 0 ? _obAllAllocations : _obAllocations;

  const bbWithAlloc = allBbs.map((b) => {
    const al = allAllocs.find((a) => a.bankbook_id === b.id);
    const grp = _obGroups.find((g) => g.id === b.vorg_group_id);
    const acct = _obAcctList.find((ac) => ac.id === b.account_id);
    const a = Number(al?.allocated_amount || 0),
      u = Number(al?.used_amount || 0),
      f = Number(al?.frozen_amount || 0);
    return {
      ...b,
      allocated: a,
      used: u,
      frozen: f,
      balance: a - u - f,
      grpName: grp?.name || b.vorg_group_id,
      acctName: acct?.name || "",
    };
  });

  const fromOpts = bbWithAlloc
    .filter((b) => b.balance > 0)
    .map((b) => {
      const dep = _obOrgStatuses[b.org_id] === "deprecated" ? " 🚫미사용" : "";
      return `<option value="${b.id}">[${b.grpName}] ${b.org_name}${dep} — ${b.acctName} (잔액: ${fmt(b.balance)}원)</option>`;
    })
    .join("");
  const toOpts = bbWithAlloc
    .filter((b) => _obOrgStatuses[b.org_id] !== "deprecated")
    .map(
      (b) =>
        `<option value="${b.id}">[${b.grpName}] ${b.org_name} — ${b.acctName} (현재: ${fmt(b.allocated)}원)</option>`,
    )
    .join("");

  return `<div style="max-width:700px">
    <div style="padding:8px 14px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;margin-bottom:12px;font-size:11px;color:#92400E;font-weight:600">
      🔀 <b>교차 VOrg 이관 지원</b> — 다른 VOrg 그룹의 통장 간에도 이관이 가능합니다. 조직개편 시 활용하세요.
    </div>
    <div class="bo-card" style="padding:20px">
    <div style="font-weight:800;font-size:13px;margin-bottom:4px">↔ 예산 이관 — 조직 간 잔액 이동</div>
    <p style="font-size:11px;color:#6B7280;margin-bottom:14px">동일 기간 내에서 A조직의 잔여 배정액을 B조직으로 이동합니다. 사유 필수.</p>
    <div style="display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">
        <div>
          <label style="font-size:10px;font-weight:700;color:#EF4444;display:block;margin-bottom:4px">FROM (출처) — 잔액이 있는 통장만</label>
          <select id="ob-tr-from" style="width:100%;padding:8px;border:1.5px solid #FECACA;border-radius:8px;font-size:11px;font-weight:700">
            <option value="">— 선택 —</option>${fromOpts}
          </select>
        </div>
        <div style="font-size:20px;color:#9CA3AF;margin-top:16px">→</div>
        <div>
          <label style="font-size:10px;font-weight:700;color:#059669;display:block;margin-bottom:4px">TO (대상) — 모든 통장</label>
          <select id="ob-tr-to" style="width:100%;padding:8px;border:1.5px solid #BBF7D0;border-radius:8px;font-size:11px;font-weight:700">
            <option value="">— 선택 —</option>${toOpts}
          </select>
        </div>
      </div>
      <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">이관 금액 (원)</label>
        <input type="number" id="ob-tr-amt" placeholder="0" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-weight:900"></div>
      <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">이관 사유 (필수)</label>
        <textarea id="ob-tr-reason" rows="2" placeholder="조직 개편, 예산 부족, 사업 변경 등" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none"></textarea></div>
      <button onclick="_obSubmitTransfer()" class="bo-btn-primary" style="padding:12px">↔ 이관 처리</button>
    </div>
  </div></div>`;
}

// ═══ 탭5: 변경 이력 ═══
function _obRenderHistory() {
  const fmt = (n) => Number(n).toLocaleString();
  if (_obLogs.length === 0)
    return `< div style = "padding:40px;text-align:center;color:#9CA3AF" ><div style="font-size:32px">📜</div><div style="font-weight:700;margin-top:8px">변경 이력이 없습니다.</div></div > `;

  const colors = {
    allocate: "#059669",
    adjust: "#D97706",
    freeze: "#7C3AED",
    use: "#DC2626",
    carryover: "#1D4ED8",
    release: "#6B7280",
    transfer_out: "#EF4444",
    transfer_in: "#059669",
  };
  const labels = {
    allocate: "배정",
    adjust: "조정",
    freeze: "동결",
    use: "집행",
    carryover: "이월",
    release: "해제",
    transfer_out: "이관출처",
    transfer_in: "이관수신",
  };

  return `< div class="bo-card" style = "overflow:hidden" >
    <div style="padding:10px 18px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:12px">📜 변경 이력 — Audit Trail (최근 ${_obLogs.length}건)</div>
    <table class="bo-table" style="font-size:11px"><thead><tr><th>일시</th><th style="text-align:center">유형</th><th style="text-align:right">금액</th><th>사유</th><th>처리자</th></tr></thead>
    <tbody>${_obLogs
      .map((l) => {
        const c = colors[l.action] || "#6B7280";
        const ac = l.amount >= 0 ? "#059669" : "#EF4444";
        return `<tr>
        <td style="white-space:nowrap;color:#6B7280">${new Date(l.performed_at).toLocaleString("ko-KR")}</td>
        <td style="text-align:center"><span style="font-size:9px;font-weight:800;background:${c}15;color:${c};padding:2px 7px;border-radius:4px">${labels[l.action] || l.action}</span></td>
        <td style="text-align:right;font-weight:800;color:${ac}">${l.amount >= 0 ? "+" : ""}${fmt(l.amount)}원</td>
        <td style="color:#374151">${l.reason || ""}</td>
        <td style="color:#9CA3AF">${l.performed_by || ""}</td>
      </tr>`;
      })
      .join("")}</tbody></table></div > `;
}

// ═══ 액션: 배정 수정 모달 ═══
function _obEditAlloc(bbId, curAmt) {
  document.getElementById("ob-alloc-bbid").value = bbId;
  document.getElementById("ob-alloc-amt").value = curAmt || 0;
  document.getElementById("ob-alloc-reason").value = "";
  document.getElementById("ob-alloc-modal").style.display = "flex";
}

async function _obSaveAlloc() {
  const bbId = document.getElementById("ob-alloc-bbid").value;
  const newAmt = Number(document.getElementById("ob-alloc-amt").value) || 0;
  const reason =
    document.getElementById("ob-alloc-reason").value.trim() || "배정 수정";
  if (!bbId || !_obPeriodId) return;
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  try {
    const existing = _obAllocations.find((a) => a.bankbook_id === bbId);
    const prevAmt = Number(existing?.allocated_amount || 0);
    if (existing) {
      await sb
        .from("budget_allocations")
        .update({
          allocated_amount: newAmt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      await sb
        .from("budget_allocation_log")
        .insert({
          allocation_id: existing.id,
          action: prevAmt === 0 ? "allocate" : "adjust",
          amount: newAmt - prevAmt,
          prev_balance: prevAmt,
          new_balance: newAmt,
          reason,
          performed_by: boCurrentPersona?.name || "",
        });
    } else {
      const { data: ins } = await sb
        .from("budget_allocations")
        .insert({
          bankbook_id: bbId,
          period_id: _obPeriodId,
          allocated_amount: newAmt,
        })
        .select("id")
        .single();
      if (ins)
        await sb
          .from("budget_allocation_log")
          .insert({
            allocation_id: ins.id,
            action: "allocate",
            amount: newAmt,
            prev_balance: 0,
            new_balance: newAmt,
            reason,
            performed_by: boCurrentPersona?.name || "",
          });
    }
    document.getElementById("ob-alloc-modal").style.display = "none";
    await renderOrgBudget();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ═══ 액션: 기초 일괄 입력 ═══
async function _obSubmitInitBatch() {
  const unallocated = _obBankbooks.filter(
    (b) => !_obAllocations.find((a) => a.bankbook_id === b.id),
  );
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  let count = 0;
  for (let i = 0; i < unallocated.length; i++) {
    const amt = Number(
      document.getElementById(`ob - init - ${i} `)?.value || 0,
    );
    if (amt <= 0) continue;
    try {
      const { data: ins } = await sb
        .from("budget_allocations")
        .insert({
          bankbook_id: unallocated[i].id,
          period_id: _obPeriodId,
          allocated_amount: amt,
        })
        .select("id")
        .single();
      if (ins)
        await sb
          .from("budget_allocation_log")
          .insert({
            allocation_id: ins.id,
            action: "allocate",
            amount: amt,
            prev_balance: 0,
            new_balance: amt,
            reason: "기초 예산 최초 등록",
            performed_by: boCurrentPersona?.name || "",
          });
      count++;
    } catch (e) {
      console.warn(e);
    }
  }
  if (count === 0) {
    alert("금액을 1개 이상 입력하세요.");
    return;
  }
  alert(`✅ ${count}개 통장에 기초 예산이 등록되었습니다.`);
  await renderOrgBudget();
}

// ═══ 액션: 추가 배정 ═══
async function _obSubmitAdd() {
  const bbId = document.getElementById("ob-add-bb")?.value;
  const amt = Number(document.getElementById("ob-add-amt")?.value || 0);
  const reason = document.getElementById("ob-add-reason")?.value?.trim();
  if (!bbId || amt <= 0 || !reason) {
    alert("통장, 금액, 사유를 모두 입력하세요.");
    return;
  }
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  const existing = _obAllocations.find((a) => a.bankbook_id === bbId);
  const prev = Number(existing?.allocated_amount || 0);
  try {
    if (existing) {
      await sb
        .from("budget_allocations")
        .update({
          allocated_amount: prev + amt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      await sb
        .from("budget_allocation_log")
        .insert({
          allocation_id: existing.id,
          action: "adjust",
          amount: amt,
          prev_balance: prev,
          new_balance: prev + amt,
          reason,
          performed_by: boCurrentPersona?.name || "",
        });
    } else {
      const { data: ins } = await sb
        .from("budget_allocations")
        .insert({
          bankbook_id: bbId,
          period_id: _obPeriodId,
          allocated_amount: amt,
        })
        .select("id")
        .single();
      if (ins)
        await sb
          .from("budget_allocation_log")
          .insert({
            allocation_id: ins.id,
            action: "allocate",
            amount: amt,
            prev_balance: 0,
            new_balance: amt,
            reason,
            performed_by: boCurrentPersona?.name || "",
          });
    }
    alert(`✅ 추가 배정 완료: +${Number(amt).toLocaleString()} 원`);
    await renderOrgBudget();
  } catch (e) {
    alert("추가 배정 실패: " + e.message);
  }
}

// ═══ 액션: 팀 일괄 배분 ═══
async function _obSubmitDist() {
  const inputs = document.querySelectorAll(".ob-dist-input");
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  let count = 0;
  for (const inp of inputs) {
    const amt = Number(inp.value || 0);
    if (amt <= 0) continue;
    const bbId = inp.dataset.bbid;
    const existing = _obAllocations.find((a) => a.bankbook_id === bbId);
    const prev = Number(existing?.allocated_amount || 0);
    try {
      if (existing) {
        await sb
          .from("budget_allocations")
          .update({
            allocated_amount: prev + amt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        await sb
          .from("budget_allocation_log")
          .insert({
            allocation_id: existing.id,
            action: "adjust",
            amount: amt,
            prev_balance: prev,
            new_balance: prev + amt,
            reason: "팀 배분",
            performed_by: boCurrentPersona?.name || "",
          });
      } else {
        const { data: ins } = await sb
          .from("budget_allocations")
          .insert({
            bankbook_id: bbId,
            period_id: _obPeriodId,
            allocated_amount: amt,
          })
          .select("id")
          .single();
        if (ins)
          await sb
            .from("budget_allocation_log")
            .insert({
              allocation_id: ins.id,
              action: "allocate",
              amount: amt,
              prev_balance: 0,
              new_balance: amt,
              reason: "팀 배분",
              performed_by: boCurrentPersona?.name || "",
            });
      }
      count++;
    } catch (e) {
      console.warn(e);
    }
  }
  if (count === 0) {
    alert("배분 금액을 1개 이상 입력하세요.");
    return;
  }
  alert(`✅ ${count}개 팀에 배분 완료!`);
  await renderOrgBudget();
}

// ═══ 액션: 이관 (교차 VOrg 대응) ═══
async function _obSubmitTransfer() {
  const fromId = document.getElementById("ob-tr-from")?.value;
  const toId = document.getElementById("ob-tr-to")?.value;
  const amt = Number(document.getElementById("ob-tr-amt")?.value || 0);
  const reason = document.getElementById("ob-tr-reason")?.value?.trim();
  if (!fromId || !toId || fromId === toId || amt <= 0 || !reason) {
    alert("모든 항목을 올바르게 입력하세요. From과 To는 달라야 합니다.");
    return;
  }

  // 교차 VOrg: 전체 데이터에서 검색
  const allAllocs =
    _obAllAllocations.length > 0 ? _obAllAllocations : _obAllocations;
  const allBbs = _obAllBankbooks.length > 0 ? _obAllBankbooks : _obBankbooks;
  const fromAlloc = allAllocs.find((a) => a.bankbook_id === fromId);
  const toAlloc = allAllocs.find((a) => a.bankbook_id === toId);
  const fromBal =
    Number(fromAlloc?.allocated_amount || 0) -
    Number(fromAlloc?.used_amount || 0) -
    Number(fromAlloc?.frozen_amount || 0);
  if (amt > fromBal) {
    alert(
      `잔액 부족: From 통장 잔액 ${Number(fromBal).toLocaleString()}원, 이관 요청 ${Number(amt).toLocaleString()}원`,
    );
    return;
  }

  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;

  try {
    // From: 감소
    const fromPrev = Number(fromAlloc?.allocated_amount || 0);
    if (fromAlloc) {
      await sb
        .from("budget_allocations")
        .update({
          allocated_amount: fromPrev - amt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fromAlloc.id);
      await sb
        .from("budget_allocation_log")
        .insert({
          allocation_id: fromAlloc.id,
          action: "transfer_out",
          amount: -amt,
          prev_balance: fromPrev,
          new_balance: fromPrev - amt,
          reason: `→ ${allBbs.find((b) => b.id === toId)?.org_name}: ${reason}`,
          performed_by: boCurrentPersona?.name || "",
        });
    }
    // To: 증가
    const toPrev = Number(toAlloc?.allocated_amount || 0);
    if (toAlloc) {
      await sb
        .from("budget_allocations")
        .update({
          allocated_amount: toPrev + amt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", toAlloc.id);
      await sb
        .from("budget_allocation_log")
        .insert({
          allocation_id: toAlloc.id,
          action: "transfer_in",
          amount: amt,
          prev_balance: toPrev,
          new_balance: toPrev + amt,
          reason: `← ${allBbs.find((b) => b.id === fromId)?.org_name}: ${reason}`,
          performed_by: boCurrentPersona?.name || "",
        });
    } else {
      const { data: ins } = await sb
        .from("budget_allocations")
        .insert({
          bankbook_id: toId,
          period_id: _obPeriodId,
          allocated_amount: amt,
        })
        .select("id")
        .single();
      if (ins)
        await sb
          .from("budget_allocation_log")
          .insert({
            allocation_id: ins.id,
            action: "transfer_in",
            amount: amt,
            prev_balance: 0,
            new_balance: amt,
            reason: `← ${allBbs.find((b) => b.id === fromId)?.org_name}: ${reason}`,
            performed_by: boCurrentPersona?.name || "",
          });
    }
    alert(`✅ 이관 완료: ${Number(amt).toLocaleString()}원`);
    await renderOrgBudget();
  } catch (e) {
    alert("이관 실패: " + e.message);
  }
}

// ═══ 통장 자동 생성 ═══
async function _obAutoCreate() {
  if (!_obTplId) {
    alert("제도그룹을 선택하세요.");
    return;
  }
  if (_obAcctList.length === 0) {
    alert("예산 계정이 없습니다. 예산 계정을 먼저 생성하세요.");
    return;
  }
  if (_obGroups.length === 0) {
    alert("VOrg 그룹이 없습니다.");
    return;
  }
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;

  try {
    const count = await _syncBankbooksForTemplate(_obTplId, _obTenant);
    alert(`✅ ${count}건 통장 동기화 완료`);
    await renderOrgBudget();
  } catch (e) {
    alert("통장 생성 실패: " + e.message);
  }
}

// ═══ 통장 동기화 (공용 함수 — 예산계정 생성/VOrg 팀 추가 시 호출) ═══
async function _syncBankbooksForTemplate(templateId, tenantId) {
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb || !templateId || !tenantId) return 0;

  // 1. 제도그룹 tree_data 로드
  const { data: tplData } = await sb
    .from("virtual_org_templates")
    .select("tree_data")
    .eq("id", templateId)
    .single();
  const groups = tplData?.tree_data?.hqs || [];
  if (!groups.length) return 0;

  // 2. 활성 예산 계정 + 통장 생성 정책 함께 로드
  const { data: acctData } = await sb
    .from("budget_accounts")
    .select("id")
    .eq("virtual_org_template_id", templateId)
    .eq("tenant_id", tenantId)
    .eq("active", true);
  const accounts = acctData || [];
  if (!accounts.length) return 0;

  const { data: policyData } = await sb
    .from("budget_account_org_policy")
    .select("budget_account_id,bankbook_mode")
    .eq("vorg_template_id", templateId)
    .in(
      "budget_account_id",
      accounts.map((a) => a.id),
    );
  const policyMap = {};
  (policyData || []).forEach((p) => {
    policyMap[p.budget_account_id] = p.bankbook_mode;
  });

  // 3. 조직 상태 로드 (deprecated 제외)
  const { data: orgData } = await sb
    .from("organizations")
    .select("id,name,parent_id,status,type")
    .eq("tenant_id", tenantId);
  const allOrgs = orgData || [];
  const orgMap = {};
  allOrgs.forEach((o) => {
    orgMap[o.id] = o;
  });

  // 하위 조직 탐색 (DB 기반, 1레벨)
  function findSubOrgs(parentOrgId) {
    return allOrgs.filter(
      (o) => o.parent_id === parentOrgId && o.status !== "deprecated",
    );
  }

  // 4. 통장 행 생성 — 계정별 mode 분기
  const rows = [];
  for (const grp of groups) {
    for (const acct of accounts) {
      const mode = policyMap[acct.id] || "isolated"; // 미설정이면 isolated (\ud558위 전개)
      for (const org of grp.teams || []) {
        if (orgMap[org.id]?.status === "deprecated") continue;
        const hasSubOrgs = allOrgs.some(
          (o) => o.parent_id === org.id && o.status !== "deprecated",
        );

        if (mode === "shared") {
          // ━ shared: 맵핑된 조직(\uc0c1\uc704)\ub9cc 통장 생성, 하위 팀은 생략
          rows.push({
            tenant_id: tenantId,
            template_id: templateId,
            vorg_group_id: grp.id,
            account_id: acct.id,
            org_id: org.id,
            org_name: org.name,
            org_type: hasSubOrgs ? "hq" : "team",
            parent_org_id: null,
          });
        } else {
          // ━ isolated: 맵핑 조직 + DB 하위 조직 전원 통장
          rows.push({
            tenant_id: tenantId,
            template_id: templateId,
            vorg_group_id: grp.id,
            account_id: acct.id,
            org_id: org.id,
            org_name: org.name,
            org_type: hasSubOrgs ? "hq" : "team",
            parent_org_id: null,
          });
          if (hasSubOrgs) {
            findSubOrgs(org.id).forEach((sub) => {
              rows.push({
                tenant_id: tenantId,
                template_id: templateId,
                vorg_group_id: grp.id,
                account_id: acct.id,
                org_id: sub.id,
                org_name: sub.name,
                org_type: "team",
                parent_org_id: org.id,
              });
            });
          }
        }
      }
    }
  }
  if (!rows.length) return 0;

  const { error } = await sb
    .from("org_budget_bankbooks")
    .upsert(rows, {
      onConflict: "tenant_id,template_id,vorg_group_id,account_id,org_id",
      ignoreDuplicates: true,
    });
  if (error) throw error;
  return rows.length;
}
// 전역 노출 (VOrg 제도그룹에서 호출)
window._syncBankbooksForTemplate = _syncBankbooksForTemplate;

// ═══ 통장 비활성화 (조직개편 대응) ═══
async function _obDeactivateBankbook(bbId) {
  const bb = _obBankbooks.find((b) => b.id === bbId);
  if (!bb) {
    alert("통장을 찾을 수 없습니다.");
    return;
  }
  const alloc = _obAllocations.find((a) => a.bankbook_id === bbId);
  const allocated = Number(alloc?.allocated_amount || 0);
  const used = Number(alloc?.used_amount || 0);
  const frozen = Number(alloc?.frozen_amount || 0);
  const balance = allocated - used - frozen;
  const fmt = (n) => Number(n).toLocaleString();

  // 동결(교육 진행 중)이면 교육 완료까지 통장 유지
  if (frozen > 0) {
    alert(
      `⛔ 동결 예산 ${fmt(frozen)}원이 있습니다.\n→ 진행 중인 교육이 완료될 때까지 통장을 유지해야 합니다.\n→ 교육 완료 후 다시 시도하세요.`,
    );
    return;
  }

  // 잔액이 있으면 이관 유도
  if (balance > 0) {
    const ok = confirm(
      `⚠️ 잔액 ${fmt(balance)}원이 남아있습니다.\n\n잔액을 다른 통장으로 이관한 후 비활성화하시겠습니까?\n→ [확인]: 이관 탭으로 이동\n→ [취소]: 잔액 회수 후 비활성화`,
    );
    if (ok) {
      _obTab = 3;
      _obRenderTabContent();
      _obSwitchTab(3);
      return;
    }
    const forceOk = confirm(
      `❗ 잔액 ${fmt(balance)}원을 회수(0원 처리)하고 통장을 비활성화합니다.\n정말 진행하시겠습니까?`,
    );
    if (!forceOk) return;

    // 잔액 0으로 초기화 + 로그
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    if (alloc) {
      await sb
        .from("budget_allocations")
        .update({ allocated_amount: 0, updated_at: new Date().toISOString() })
        .eq("id", alloc.id);
      await sb
        .from("budget_allocation_log")
        .insert({
          allocation_id: alloc.id,
          action: "adjust",
          amount: -allocated,
          prev_balance: allocated,
          new_balance: 0,
          reason: "조직개편 — 통장 비활성화 (잔액 회수)",
          performed_by: boCurrentPersona?.name || "",
        });
    }
  }

  // 최종 확인
  if (
    balance <= 0 &&
    !confirm(
      `"${bb.org_name}" 통장을 비활성화합니다.\n비활성화된 통장은 배정 현황에서 제외됩니다.\n\n진행하시겠습니까?`,
    )
  )
    return;

  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  try {
    await sb
      .from("org_budget_bankbooks")
      .update({ status: "inactive" })
      .eq("id", bbId);
    alert(`✅ "${bb.org_name}" 통장이 비활성화되었습니다.`);
    await renderOrgBudget();
  } catch (e) {
    alert("비활성화 실패: " + e.message);
  }
}
