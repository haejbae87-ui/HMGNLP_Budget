// ═══════════════════════════════════════════════════════════════════════════════
// 예산 사용이력 (Budget Usage History)
// ── 조직별 통장 입출금 트랜잭션 추적 ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

let _bhTenant = "";
let _bhTplId = null;
let _bhGroupId = null;
let _bhAccountId = null;
let _bhActionFilter = "";
let _bhSearchText = "";
let _bhDateFrom = "";
let _bhDateTo = "";
let _bhPage = 0;
const _bhPageSize = 50;

// 캐시 데이터
let _bhTplList = [];
let _bhGroups = [];
let _bhAcctList = [];
let _bhLogs = [];
let _bhTotalCount = 0;
let _bhBankbookMap = {}; // bankbook_id → { org_name, account_name, group_name }
let _bhAllocationMap = {}; // allocation_id → bankbook_id

const BH_ACTION_COLORS = {
  allocate: "#059669",
  adjust: "#D97706",
  freeze: "#7C3AED",
  use: "#DC2626",
  carryover: "#1D4ED8",
  release: "#6B7280",
  transfer_out: "#EF4444",
  transfer_in: "#059669",
  deactivate: "#9CA3AF",
  topup: "#0891B2",
};
const BH_ACTION_LABELS = {
  allocate: "배정",
  adjust: "조정",
  freeze: "동결",
  use: "집행",
  carryover: "이월",
  release: "해제",
  transfer_out: "이관(출)",
  transfer_in: "이관(입)",
  deactivate: "비활성화",
  topup: "추가배정",
  refund: "환불",
};

// ── 진입점 ──────────────────────────────────────────────────────────────────
async function renderBudgetHistory() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) {
    el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>';
    return;
  }

  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";
  if (!_bhTenant)
    _bhTenant = isPlatform
      ? tenants[0]?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";

  // 기본 날짜: 최근 3개월
  if (!_bhDateFrom) {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    _bhDateFrom = d.toISOString().split("T")[0];
  }
  if (!_bhDateTo) _bhDateTo = new Date().toISOString().split("T")[0];

  // 템플릿 로드
  try {
    const { data } = await sb
      .from("virtual_org_templates")
      .select("id,name,service_type,purpose")
      .eq("tenant_id", _bhTenant);
    _bhTplList = (data || []).filter(
      (t) => (t.purpose || t.service_type || "edu_support") === "edu_support",
    );
  } catch (e) {
    _bhTplList = [];
  }
  if (!_bhTplId || !_bhTplList.find((t) => t.id === _bhTplId))
    _bhTplId = _bhTplList[0]?.id || null;

  // 그룹 로드
  if (_bhTplId) {
    try {
      const { data } = await sb
        .from("virtual_org_templates")
        .select("tree_data")
        .eq("id", _bhTplId)
        .single();
      _bhGroups = data?.tree_data?.hqs || [];
    } catch (e) {
      _bhGroups = [];
    }
  } else {
    _bhGroups = [];
  }

  // 계정 로드
  if (_bhTplId) {
    try {
      const { data } = await sb
        .from("budget_accounts")
        .select("id,name,code")
        .eq("virtual_org_template_id", _bhTplId)
        .eq("tenant_id", _bhTenant)
        .eq("active", true);
      _bhAcctList = data || [];
    } catch (e) {
      _bhAcctList = [];
    }
  } else {
    _bhAcctList = [];
  }

  // 데이터 로드
  await _bhLoadLogs();

  // 렌더
  _bhRender(el, isPlatform, tenants);
}

// ── 로그 데이터 로드 ────────────────────────────────────────────────────────
async function _bhLoadLogs() {
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb || !_bhTplId) {
    _bhLogs = [];
    _bhTotalCount = 0;
    return;
  }

  // 1. 통장 로드 (필터 적용)
  let bbQ = sb
    .from("org_budget_bankbooks")
    .select("id,org_name,org_id,account_id,vorg_group_id,status")
    .eq("tenant_id", _bhTenant)
    .eq("template_id", _bhTplId);
  if (_bhGroupId) bbQ = bbQ.eq("vorg_group_id", _bhGroupId);
  if (_bhAccountId) bbQ = bbQ.eq("account_id", _bhAccountId);

  let bankbooks = [];
  try {
    const { data } = await bbQ;
    bankbooks = data || [];
  } catch (e) {
    bankbooks = [];
  }

  // bankbook 매핑: id → 정보
  _bhBankbookMap = {};
  bankbooks.forEach((b) => {
    const acct = _bhAcctList.find((a) => a.id === b.account_id);
    const grp = _bhGroups.find((g) => g.id === b.vorg_group_id);
    _bhBankbookMap[b.id] = {
      org_name: b.org_name,
      account_name: acct?.name || b.account_id,
      account_code: acct?.code || "",
      group_name: grp?.name || b.vorg_group_id,
      status: b.status,
    };
  });

  if (!bankbooks.length) {
    _bhLogs = [];
    _bhTotalCount = 0;
    return;
  }

  // 2. allocation 로드
  const bbIds = bankbooks.map((b) => b.id);
  let allocs = [];
  try {
    const { data } = await sb
      .from("budget_allocations")
      .select("id,bankbook_id")
      .in("bankbook_id", bbIds);
    allocs = data || [];
  } catch (e) {
    allocs = [];
  }

  _bhAllocationMap = {};
  allocs.forEach((a) => {
    _bhAllocationMap[a.id] = a.bankbook_id;
  });

  if (!allocs.length) {
    _bhLogs = [];
    _bhTotalCount = 0;
    return;
  }

  // 3. 로그 로드 (필터 + 페이지네이션)
  const allocIds = allocs.map((a) => a.id);
  let logQ = sb
    .from("budget_allocation_log")
    .select("*", { count: "exact" })
    .in("allocation_id", allocIds);

  if (_bhDateFrom) logQ = logQ.gte("performed_at", _bhDateFrom + "T00:00:00");
  if (_bhDateTo) logQ = logQ.lte("performed_at", _bhDateTo + "T23:59:59");
  if (_bhActionFilter) logQ = logQ.eq("action", _bhActionFilter);

  logQ = logQ
    .order("performed_at", { ascending: false })
    .range(_bhPage * _bhPageSize, (_bhPage + 1) * _bhPageSize - 1);

  try {
    const { data, count } = await logQ;
    _bhLogs = data || [];
    _bhTotalCount = count || 0;
  } catch (e) {
    _bhLogs = [];
    _bhTotalCount = 0;
  }

  // 검색어 필터 (클라이언트 사이드)
  if (_bhSearchText) {
    const q = _bhSearchText.toLowerCase();
    _bhLogs = _bhLogs.filter((l) => {
      const bbId = _bhAllocationMap[l.allocation_id];
      const bb = _bhBankbookMap[bbId];
      return (
        (bb?.org_name || "").toLowerCase().includes(q) ||
        (bb?.account_name || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q) ||
        (l.performed_by || "").toLowerCase().includes(q)
      );
    });
  }
}

// ── UI 렌더 ─────────────────────────────────────────────────────────────────
function _bhRender(el, isPlatform, tenants) {
  const fmt = (n) => Number(n).toLocaleString();
  const totalPages = Math.ceil(_bhTotalCount / _bhPageSize);

  // KPI 집계
  let totalIn = 0,
    totalOut = 0;
  _bhLogs.forEach((l) => {
    if (Number(l.amount) >= 0) totalIn += Number(l.amount);
    else totalOut += Math.abs(Number(l.amount));
  });

  const tenantSel = isPlatform
    ? `<select onchange="_bhTenant=this.value;_bhTplId=null;_bhGroupId=null;_bhAccountId=null;_bhPage=0;renderBudgetHistory()"
    style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;min-width:120px">
    ${tenants
      .filter((t) => t.id !== "SYSTEM")
      .map(
        (t) =>
          `<option value="${t.id}" ${t.id === _bhTenant ? "selected" : ""}>${t.name}</option>`,
      )
      .join("")}
  </select>`
    : `<span style="font-size:12px;font-weight:700;color:#374151">${tenants.find((t) => t.id === _bhTenant)?.name || _bhTenant}</span>`;

  const tplSel = _bhTplList.length
    ? `<select onchange="_bhTplId=this.value;_bhGroupId=null;_bhAccountId=null;_bhPage=0;renderBudgetHistory()"
    style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;min-width:140px">
    ${_bhTplList.map((t) => `<option value="${t.id}" ${t.id === _bhTplId ? "selected" : ""}>${t.name}</option>`).join("")}
  </select>`
    : '<span style="font-size:11px;color:#9CA3AF">템플릿 없음</span>';

  const groupSel = _bhGroups.length
    ? `<select onchange="_bhGroupId=this.value||null;_bhPage=0;renderBudgetHistory()"
    style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;min-width:120px">
    <option value="">전체 그룹</option>
    ${_bhGroups.map((g) => `<option value="${g.id}" ${g.id === _bhGroupId ? "selected" : ""}>${g.name}</option>`).join("")}
  </select>`
    : "";

  const acctSel = _bhAcctList.length
    ? `<select onchange="_bhAccountId=this.value||null;_bhPage=0;renderBudgetHistory()"
    style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;min-width:120px">
    <option value="">전체 계정</option>
    ${_bhAcctList.map((a) => `<option value="${a.id}" ${a.id === _bhAccountId ? "selected" : ""}>${a.name}</option>`).join("")}
  </select>`
    : "";

  const actionEntries = Object.entries(BH_ACTION_LABELS);
  const actionSel = `<select onchange="_bhActionFilter=this.value;_bhPage=0;renderBudgetHistory()"
    style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;min-width:100px">
    <option value="">전체 유형</option>
    ${actionEntries.map(([k, v]) => `<option value="${k}" ${k === _bhActionFilter ? "selected" : ""}>${v}</option>`).join("")}
  </select>`;

  el.innerHTML = `
<div class="bo-fade" style="max-width:1200px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">📒 예산 사용이력</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">조직별 통장 입출금 트랜잭션을 추적합니다.</p>
    </div>
    <button onclick="_bhExportCSV()" style="padding:8px 16px;background:#059669;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📥 CSV 내보내기</button>
    <button onclick="_bhShowLifecycle()" style="padding:8px 16px;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.2)">📊 6단계 추적</button>
  </div>

  <!-- 필터 바 -->
  <div class="bo-card" style="padding:14px 18px;margin-bottom:14px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
      ${tenantSel} ${tplSel} ${groupSel} ${acctSel} ${actionSel}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <label style="font-size:11px;font-weight:700;color:#374151">기간</label>
      <input type="date" value="${_bhDateFrom}" onchange="_bhDateFrom=this.value;_bhPage=0;renderBudgetHistory()"
        style="border:1.5px solid #E5E7EB;border-radius:8px;padding:5px 10px;font-size:12px">
      <span style="font-size:11px;color:#9CA3AF">~</span>
      <input type="date" value="${_bhDateTo}" onchange="_bhDateTo=this.value;_bhPage=0;renderBudgetHistory()"
        style="border:1.5px solid #E5E7EB;border-radius:8px;padding:5px 10px;font-size:12px">
      <div style="position:relative;margin-left:8px">
        <input type="text" placeholder="조직/계정/사유 검색" value="${_bhSearchText}"
          onchange="_bhSearchText=this.value;_bhPage=0;renderBudgetHistory()"
          style="border:1.5px solid #E5E7EB;border-radius:8px;padding:5px 10px 5px 28px;font-size:12px;width:160px">
        <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#9CA3AF;font-size:11px">🔍</span>
      </div>
    </div>
  </div>

  <!-- KPI 요약 -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
    <div class="bo-card" style="padding:14px 18px;text-align:center">
      <div style="font-size:10px;font-weight:700;color:#6B7280;margin-bottom:4px">조회 건수</div>
      <div style="font-size:20px;font-weight:900;color:#111827">${fmt(_bhTotalCount)}<span style="font-size:11px;color:#9CA3AF">건</span></div>
    </div>
    <div class="bo-card" style="padding:14px 18px;text-align:center">
      <div style="font-size:10px;font-weight:700;color:#059669;margin-bottom:4px">입금 합계 (이 페이지)</div>
      <div style="font-size:20px;font-weight:900;color:#059669">+${fmt(totalIn)}<span style="font-size:11px">원</span></div>
    </div>
    <div class="bo-card" style="padding:14px 18px;text-align:center">
      <div style="font-size:10px;font-weight:700;color:#EF4444;margin-bottom:4px">출금 합계 (이 페이지)</div>
      <div style="font-size:20px;font-weight:900;color:#EF4444">-${fmt(totalOut)}<span style="font-size:11px">원</span></div>
    </div>
  </div>

  <!-- 트랜잭션 테이블 -->
  <div class="bo-card" style="overflow:hidden">
    <table class="bo-table" style="font-size:11px;width:100%">
      <thead><tr style="background:#F9FAFB">
        <th style="padding:10px 12px;text-align:left;font-weight:900;color:#374151;white-space:nowrap">일시</th>
        <th style="padding:10px 12px;text-align:left;font-weight:900;color:#374151">조직</th>
        <th style="padding:10px 12px;text-align:left;font-weight:900;color:#374151">예산 계정</th>
        <th style="padding:10px 12px;text-align:center;font-weight:900;color:#374151">유형</th>
        <th style="padding:10px 12px;text-align:right;font-weight:900;color:#374151">금액</th>
        <th style="padding:10px 12px;text-align:right;font-weight:900;color:#374151;white-space:nowrap">이전 → 이후</th>
        <th style="padding:10px 12px;text-align:left;font-weight:900;color:#374151">사유</th>
        <th style="padding:10px 12px;text-align:left;font-weight:900;color:#374151">처리자</th>
      </tr></thead>
      <tbody>
      ${
        _bhLogs.length
          ? _bhLogs
              .map((l, i) => {
                const bbId = _bhAllocationMap[l.allocation_id];
                const bb = _bhBankbookMap[bbId] || {};
                const c = BH_ACTION_COLORS[l.action] || "#6B7280";
                const ac = Number(l.amount) >= 0 ? "#059669" : "#EF4444";
                const inactive =
                  bb.status === "inactive"
                    ? ' <span style="font-size:8px;padding:1px 3px;background:#FEE2E2;color:#DC2626;border-radius:3px;font-weight:800">비활성</span>'
                    : "";
                return `<tr style="border-bottom:1px solid #F3F4F6;background:${i % 2 ? "#FAFAFA" : "white"}">
          <td style="padding:8px 12px;white-space:nowrap;color:#6B7280;font-size:10px">${new Date(l.performed_at).toLocaleString("ko-KR")}</td>
          <td style="padding:8px 12px;font-weight:600;color:#111827">${bb.org_name || "<span style=color:#9CA3AF>삭제됨</span>"}${inactive}</td>
          <td style="padding:8px 12px;color:#374151"><span style="font-size:9px;color:#9CA3AF">${bb.account_code || ""}</span> ${bb.account_name || "-"}</td>
          <td style="padding:8px 12px;text-align:center"><span style="font-size:9px;font-weight:800;background:${c}15;color:${c};padding:2px 7px;border-radius:4px">${BH_ACTION_LABELS[l.action] || l.action}</span></td>
          <td style="padding:8px 12px;text-align:right;font-weight:800;color:${ac};white-space:nowrap">${Number(l.amount) >= 0 ? "+" : ""}${fmt(l.amount)}원</td>
          <td style="padding:8px 12px;text-align:right;font-size:10px;color:#6B7280;white-space:nowrap">${fmt(l.prev_balance)} → <b style="color:#111827">${fmt(l.new_balance)}</b></td>
          <td style="padding:8px 12px;color:#374151;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${(l.reason || "").replace(/"/g, "&quot;")}">${l.reason || ""}</td>
          <td style="padding:8px 12px;color:#9CA3AF">${l.performed_by || ""}</td>
        </tr>`;
              })
              .join("")
          : `<tr><td colspan="8" style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">
        <div style="font-size:32px;margin-bottom:8px">📋</div>
        조회된 이력이 없습니다. 필터를 조정해보세요.
      </td></tr>`
      }
      </tbody>
    </table>
  </div>

  <!-- 페이지네이션 -->
  ${
    totalPages > 1
      ? `
  <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:14px">
    <button onclick="_bhPage=0;renderBudgetHistory()" ${_bhPage === 0 ? "disabled" : ""}
      style="padding:5px 10px;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#374151">« 처음</button>
    <button onclick="_bhPage=Math.max(0,_bhPage-1);renderBudgetHistory()" ${_bhPage === 0 ? "disabled" : ""}
      style="padding:5px 10px;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#374151">‹ 이전</button>
    <span style="font-size:12px;font-weight:700;color:#374151;padding:0 8px">${_bhPage + 1} / ${totalPages}</span>
    <button onclick="_bhPage=Math.min(${totalPages - 1},_bhPage+1);renderBudgetHistory()" ${_bhPage >= totalPages - 1 ? "disabled" : ""}
      style="padding:5px 10px;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#374151">다음 ›</button>
    <button onclick="_bhPage=${totalPages - 1};renderBudgetHistory()" ${_bhPage >= totalPages - 1 ? "disabled" : ""}
      style="padding:5px 10px;border:1px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;cursor:pointer;color:#374151">마지막 »</button>
  </div>`
      : ""
  }
</div>`;
}

// ── CSV 내보내기 ─────────────────────────────────────────────────────────────
function _bhExportCSV() {
  if (!_bhLogs.length) {
    alert("내보낼 데이터가 없습니다.");
    return;
  }
  const fmt = (n) => Number(n).toLocaleString();
  const header = [
    "일시",
    "조직",
    "예산계정",
    "유형",
    "금액",
    "이전잔액",
    "이후잔액",
    "사유",
    "처리자",
  ];
  const rows = _bhLogs.map((l) => {
    const bbId = _bhAllocationMap[l.allocation_id];
    const bb = _bhBankbookMap[bbId] || {};
    return [
      new Date(l.performed_at).toLocaleString("ko-KR"),
      bb.org_name || "삭제됨",
      bb.account_name || "-",
      BH_ACTION_LABELS[l.action] || l.action,
      l.amount,
      l.prev_balance,
      l.new_balance,
      (l.reason || "").replace(/,/g, " "),
      l.performed_by || "",
    ].join(",");
  });

  const bom = "\uFEFF";
  const csv = bom + header.join(",") + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `예산사용이력_${_bhTenant}_${_bhDateFrom}_${_bhDateTo}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ P9: 6단계 예산추적 워터폴 대시보드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function _bhShowLifecycle() {
  const sb = typeof _sb === 'function' ? _sb() : (typeof getSB === 'function' ? getSB() : null);
  if (!sb) { alert('DB 연결 필요'); return; }

  const tenantId = _bhTenant || boCurrentPersona?.tenantId || 'HMC';
  const year = new Date().getFullYear();

  // 1. plans에서 계획/배정/실사용 집계
  let plans = [];
  try {
    const { data } = await sb.from('plans').select('amount,allocated_amount,actual_amount,status,account_code')
      .eq('tenant_id', tenantId).eq('fiscal_year', year).is('deleted_at', null);
    plans = data || [];
  } catch { plans = []; }

  // 2. applications에서 신청/승인 집계
  let apps = [];
  try {
    const { data } = await sb.from('applications').select('amount,status')
      .eq('tenant_id', tenantId).eq('fiscal_year', year);
    apps = data || [];
  } catch { apps = []; }

  const planTotal = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const allocTotal = plans.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);
  const appTotal = apps.reduce((s, a) => s + Number(a.amount || 0), 0);
  const approvedTotal = apps.filter(a => a.status === 'approved' || a.status === 'completed')
    .reduce((s, a) => s + Number(a.amount || 0), 0);
  const actualTotal = plans.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
  const remaining = allocTotal - actualTotal;

  const stages = [
    { label: '계획액', val: planTotal, color: '#1D4ED8', icon: '📝' },
    { label: '배정액', val: allocTotal, color: '#7C3AED', icon: '💰' },
    { label: '신청액', val: appTotal, color: '#0891B2', icon: '📋' },
    { label: '승인액', val: approvedTotal, color: '#059669', icon: '✅' },
    { label: '실사용액', val: actualTotal, color: '#D97706', icon: '💳' },
    { label: '잔액', val: remaining, color: remaining >= 0 ? '#059669' : '#DC2626', icon: remaining >= 0 ? '📦' : '⚠️' },
  ];

  const maxVal = Math.max(...stages.map(s => Math.abs(s.val)), 1);
  const fmt = n => {
    if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + '억';
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(0) + '만';
    return n.toLocaleString();
  };

  // 집행률/배정률 계산
  const allocRate = planTotal > 0 ? ((allocTotal / planTotal) * 100).toFixed(1) : '-';
  const execRate = allocTotal > 0 ? ((actualTotal / allocTotal) * 100).toFixed(1) : '-';

  const barsHtml = stages.map(s => {
    const pct = maxVal > 0 ? Math.max(2, (Math.abs(s.val) / maxVal) * 100) : 2;
    return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="width:80px;text-align:right;font-size:12px;font-weight:800;color:#374151">${s.icon} ${s.label}</div>
      <div style="flex:1;height:32px;background:#F3F4F6;border-radius:8px;overflow:hidden;position:relative">
        <div style="height:100%;width:${pct}%;background:${s.color};border-radius:8px;transition:width .5s ease;display:flex;align-items:center;justify-content:flex-end;padding-right:8px">
          <span style="font-size:11px;font-weight:900;color:white;text-shadow:0 1px 2px rgba(0,0,0,.3)">${fmt(s.val)}원</span>
        </div>
      </div>
    </div>`;
  }).join('');

  // 모달 생성
  const existing = document.getElementById('bh-lifecycle-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'bh-lifecycle-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:650px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2)">
    <div style="padding:24px 28px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#111827">📊 ${year}년 예산 6단계 추적</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#6B7280">계획 → 배정 → 신청 → 승인 → 실사용 → 잔액</p>
      </div>
      <button onclick="document.getElementById('bh-lifecycle-modal').remove()" style="width:32px;height:32px;border-radius:8px;border:1px solid #E5E7EB;background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <div style="padding:24px 28px">
      <!-- 워터폴 바 차트 -->
      ${barsHtml}

      <!-- 비율 카드 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px">
        <div style="padding:16px;border-radius:12px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);text-align:center">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">계획 대비 배정률</div>
          <div style="font-size:28px;font-weight:900;color:#7C3AED">${allocRate}%</div>
        </div>
        <div style="padding:16px;border-radius:12px;background:linear-gradient(135deg,#ECFDF5,#FEF3C7);text-align:center">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">배정 대비 집행률</div>
          <div style="font-size:28px;font-weight:900;color:${Number(execRate) > 100 ? '#DC2626' : '#059669'}">${execRate}%</div>
        </div>
      </div>

      <!-- 실사용액 동기화 버튼 -->
      <div style="margin-top:20px;padding:14px 18px;border-radius:12px;background:#FFFBEB;border:1.5px solid #FCD34D;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:12px;font-weight:800;color:#92400E">💳 실사용액 동기화</div>
          <div style="font-size:11px;color:#B45309;margin-top:2px">교육결과 등록 데이터를 기준으로 plans.actual_amount를 갱신합니다</div>
        </div>
        <button onclick="_bhSyncActualAmounts()" style="padding:8px 16px;border-radius:10px;border:none;background:#D97706;color:white;font-size:12px;font-weight:900;cursor:pointer">🔄 동기화</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ P10: 실사용액 자동 집계 (applications → plans.actual_amount)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function _bhSyncActualAmounts() {
  const sb = typeof _sb === 'function' ? _sb() : (typeof getSB === 'function' ? getSB() : null);
  if (!sb) { alert('DB 연결 필요'); return; }

  const tenantId = _bhTenant || boCurrentPersona?.tenantId || 'HMC';

  if (!confirm('교육결과 등록 데이터를 기반으로 실사용액을 동기화하시겠습니까?')) return;

  try {
    // 1. 승인/완료 상태의 applications를 plan_id별 집계
    const { data: apps, error: appErr } = await sb
      .from('applications')
      .select('plan_id,amount,status')
      .eq('tenant_id', tenantId)
      .in('status', ['approved', 'completed']);
    if (appErr) throw appErr;

    // plan_id별 합산
    const planActuals = {};
    (apps || []).forEach(a => {
      if (!a.plan_id) return;
      planActuals[a.plan_id] = (planActuals[a.plan_id] || 0) + Number(a.amount || 0);
    });

    // 2. plans.actual_amount 일괄 업데이트
    const planIds = Object.keys(planActuals);
    let updated = 0;
    for (const pid of planIds) {
      const { error } = await sb.from('plans').update({
        actual_amount: planActuals[pid],
        updated_at: new Date().toISOString(),
      }).eq('id', pid);
      if (!error) updated++;
    }

    alert(`✅ ${updated}건 실사용액 동기화 완료\n(${planIds.length}개 교육계획 업데이트)`);

    // 모달 닫고 새로고침
    document.getElementById('bh-lifecycle-modal')?.remove();
    renderBudgetHistory();
  } catch (err) {
    alert('❌ 동기화 실패: ' + err.message);
  }
}
