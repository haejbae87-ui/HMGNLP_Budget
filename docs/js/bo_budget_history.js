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
