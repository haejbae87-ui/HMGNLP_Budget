// ─── 🗂️ 운영계획 관리 (plan_type='operation', 사업계획 승인 자동 연결) ───────────
// 구조: 제도그룹(VOrg) → 교육조직(HQ) → 맵핑팀 드릴다운
// bo_budget_demand.js 드릴다운 패턴 재사용

let _opTenant = "";
let _opTplId = null;
let _opYear = new Date().getFullYear();
let _opDrillHq = null;
let _opDrillOrg = null;
let _opTplList = [];
let _opAcctList = [];
let _opGroups = [];
let _opPlans = null;

// ── 진입점 ──────────────────────────────────────────────────────────────────
async function renderBoOperationPlan() {
  const el = document.getElementById("bo-content");
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>';
    return;
  }
  el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>운영계획 로딩 중...</div>';

  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const role = boCurrentPersona?.role;
  const isPlatform = role === "platform_admin" || role === "tenant_global_admin";
  const _isOpMgr = typeof boIsOpManager === "function" ? boIsOpManager() : false;

  if (!_opTenant)
    _opTenant = isPlatform
      ? tenants.find(t => t.id !== "SYSTEM")?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";

  // ── 1. 예산계정 로드 ──
  try {
    const { data } = await sb.from("budget_accounts")
      .select("id,name,code,virtual_org_template_id")
      .eq("tenant_id", _opTenant).eq("active", true).eq("uses_budget", true);
    _opAcctList = data || [];
  } catch { _opAcctList = []; }

  // ── 2. 제도그룹 로드 ──
  const tplIds = [...new Set(_opAcctList.map(a => a.virtual_org_template_id).filter(Boolean))];
  try {
    const { data } = await sb.from("virtual_org_templates")
      .select("id,name,tree_data").eq("tenant_id", _opTenant)
      .in("id", tplIds.length > 0 ? tplIds : ["__NONE__"]);
    _opTplList = data || [];
  } catch { _opTplList = []; }
  if (!_opTplId || !_opTplList.find(t => t.id === _opTplId))
    _opTplId = _opTplList[0]?.id || null;

  const selTpl = _opTplList.find(t => t.id === _opTplId);
  const allHqs = selTpl?.tree_data?.hqs || [];
  _opGroups = (_isOpMgr && typeof boGetMyGroups === "function")
    ? boGetMyGroups(allHqs) : allHqs;
  const tplAcctCodes = _opAcctList.filter(a => a.virtual_org_template_id === _opTplId).map(a => a.code);

  // ── 3. 운영계획 로드 (plan_type=operation OR source_forecast_plan_id 있는 것) ──
  try {
    let q = sb.from("plans").select("*")
      .eq("tenant_id", _opTenant)
      .eq("fiscal_year", _opYear)
      .neq("status", "draft")
      .order("created_at", { ascending: false });
    if (tplAcctCodes.length > 0) q = q.in("account_code", tplAcctCodes);
    else q = q.eq("account_code", "__NONE__");
    const { data } = await q;
    // 운영계획: plan_type이 operation/ongoing이거나, source_forecast_plan_id가 있는 것
    _opPlans = (data || []).filter(p =>
      p.plan_type === "operation" || p.plan_type === "ongoing" ||
      (p.source_forecast_plan_id && p.plan_type !== "forecast" && p.plan_type !== "business")
    );
  } catch { _opPlans = []; }

  // Op-Manager 단일 그룹 자동 진입
  if (_isOpMgr && _opGroups.length === 1 && !_opDrillHq)
    _opDrillHq = _opGroups[0].id;

  if (_opDrillHq) { _renderOpCombined(el, isPlatform, tenants); return; }
  _renderOpLevel1(el, isPlatform, tenants);
}

// ── 공통 필터 바 ──────────────────────────────────────────────────────────────
function _opFilterBar(isPlatform, tenants) {
  const ss = "border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:120px;cursor:pointer";
  const tenantSel = isPlatform
    ? `<select onchange="_opTenant=this.value;_opTplId=null;_opDrillHq=null;_opDrillOrg=null;_opPlans=null;renderBoOperationPlan()" style="${ss}">
        ${tenants.filter(t => t.id !== "SYSTEM").map(t => `<option value="${t.id}" ${t.id === _opTenant ? "selected" : ""}>${t.name}</option>`).join("")}
       </select>`
    : `<span style="font-size:12px;font-weight:800;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find(t => t.id === _opTenant)?.name || _opTenant}</span>`;

  const tplSel = _opTplList.length
    ? `<select onchange="_opTplId=this.value;_opDrillHq=null;_opDrillOrg=null;_opPlans=null;renderBoOperationPlan()" style="${ss}">
        ${_opTplList.map(t => `<option value="${t.id}" ${t.id === _opTplId ? "selected" : ""}>${t.name}</option>`).join("")}
       </select>`
    : '<span style="font-size:11px;color:#9CA3AF">제도그룹 없음</span>';

  const yearSel = `<select onchange="_opYear=Number(this.value);_opDrillHq=null;_opDrillOrg=null;_opPlans=null;renderBoOperationPlan()" style="${ss}">
    ${[_opYear+1, _opYear, _opYear-1].map(y => `<option value="${y}" ${y === _opYear ? "selected" : ""}>${y}년</option>`).join("")}
  </select>`;

  return `<div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span style="font-size:11px;font-weight:900;color:#374151;margin-right:4px">🔍 데이터 범위</span>
      <label style="font-size:10px;font-weight:700;color:#6B7280">테넌트</label>${tenantSel}
      <label style="font-size:10px;font-weight:700;color:#6B7280">VOrg</label>${tplSel}
      ${yearSel}
      <button onclick="_opPlans=null;renderBoOperationPlan()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
    </div>
  </div>`;
}

// ── Level 1: 조직단위별 운영계획 요약 ────────────────────────────────────────
function _renderOpLevel1(el, isPlatform, tenants) {
  const plans = _opPlans || [];
  const totalCount = plans.length;
  const totalApproved = plans.filter(p => p.status === "approved").length;
  const totalAmount = plans.reduce((s, p) => s + Number(p.allocated_amount || p.amount || 0), 0);
  const totalExec = plans.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
  const execPct = totalAmount > 0 ? Math.round((totalExec / totalAmount) * 100) : 0;

  // 조직단위별 집계
  const groupRows = _opGroups.map(g => {
    const gPlans = plans.filter(p => {
      const dept = p.detail?.dept || p.applicant_dept || p.applicant_name || "";
      return (g.teams || []).some(t => dept === t.name || dept.includes(t.name) || t.name.includes(dept));
    });
    const amt = gPlans.reduce((s, p) => s + Number(p.allocated_amount || p.amount || 0), 0);
    const exec = gPlans.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
    const pct = amt > 0 ? Math.round((exec / amt) * 100) : 0;
    return { id: g.id, name: g.name, teamCount: (g.teams || []).length, count: gPlans.length, amt, exec, pct,
      approved: gPlans.filter(p => p.status === "approved").length };
  });

  const fmt = v => v >= 100000000 ? `${(v/100000000).toFixed(1)}억원` : v >= 10000 ? `${(v/10000).toFixed(0)}만원` : `${v.toLocaleString()}원`;

  el.innerHTML = `<div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title" style="margin:0">🗂️ 운영계획 관리</h1>
        <p class="bo-page-sub">총괄담당자 승인 완료 후 집행 단계의 운영계획 현황</p>
      </div>
    </div>
    ${_opFilterBar(isPlatform, tenants)}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[
        { icon:"🗂️", label:"전체 운영계획", val:`${totalCount}건`, color:"#002C5F", bg:"#EFF6FF" },
        { icon:"✅", label:"승인완료", val:`${totalApproved}건`, color:"#059669", bg:"#F0FDF4" },
        { icon:"💰", label:"배정 예산 합계", val:fmt(totalAmount), color:"#0369A1", bg:"#F0F9FF" },
        { icon:"📊", label:"집행률", val:`${execPct}%`, color:"#7C3AED", bg:"#F5F3FF" },
      ].map(c => `<div style="background:${c.bg};border-radius:14px;padding:16px 18px;border:1.5px solid ${c.color}20">
        <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:6px">${c.icon} ${c.label}</div>
        <div style="font-size:22px;font-weight:900;color:${c.color}">${c.val}</div>
      </div>`).join("")}
    </div>
    ${groupRows.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#002C5F08,#0369A108);border-bottom:1px solid #F3F4F6">
        <span style="font-size:14px;font-weight:900;color:#002C5F">🏢 교육조직별 운영계획 현황</span>
        <span style="font-size:11px;color:#6B7280;margin-left:8px">${_opYear}년</span>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>교육조직 (제도그룹)</th><th style="text-align:center">하위 팀수</th>
          <th style="text-align:center">계획 건수</th><th style="text-align:center">승인</th>
          <th style="text-align:right">배정 예산</th><th style="text-align:right">집행액</th>
          <th style="text-align:center">집행률</th>
        </tr></thead>
        <tbody>
          ${groupRows.map(g => `
          <tr onclick="_opDrillHq='${g.id.replace(/'/g,"\\'")}';renderBoOperationPlan()"
            style="cursor:pointer;transition:background .12s"
            onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:800">${g.name}</td>
            <td style="text-align:center">${g.teamCount}개</td>
            <td style="text-align:center">${g.count}건</td>
            <td style="text-align:center;color:#059669;font-weight:800">${g.approved}건</td>
            <td style="text-align:right;font-weight:800">${fmt(g.amt)}</td>
            <td style="text-align:right;color:#7C3AED;font-weight:800">${fmt(g.exec)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${g.pct}%;height:100%;background:${g.pct>=80?"#059669":g.pct>=50?"#D97706":"#DC2626"};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${g.pct>=80?"#059669":g.pct>=50?"#D97706":"#DC2626"}">${g.pct}%</span>
              </div>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">${_opYear}년 운영계획 데이터가 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">사업계획이 총괄담당자 승인 완료되면 운영계획이 자동 생성됩니다.</div>
    </div>`}
  </div>`;
}

// ── Level 2+3: 조직단위 상세 (팀 요약 + 계획 목록 통합) ──────────────────────
function _renderOpCombined(el, isPlatform, tenants) {
  const hq = _opGroups.find(g => g.id === _opDrillHq);
  if (!hq) { _opDrillHq = null; renderBoOperationPlan(); return; }

  const allPlans = _opPlans || [];
  const teams = hq.teams || [];
  const fmt = v => v >= 100000000 ? `${(v/100000000).toFixed(1)}억원` : v >= 10000 ? `${(v/10000).toFixed(0)}만원` : `${v.toLocaleString()}원`;
  const STATUS_LABEL = { draft:"작성중", saved:"저장완료", pending:"신청중", submitted:"결재대기",
    team_approved:"팀장결재완료", in_review:"운영자검토중", approved:"승인완료", rejected:"반려", cancelled:"취소" };
  const STATUS_COLOR = { approved:"#059669", rejected:"#DC2626", pending:"#D97706",
    submitted:"#D97706", team_approved:"#7C3AED", in_review:"#7C3AED", cancelled:"#9CA3AF" };

  // 팀별 집계
  const teamRows = teams.map(t => {
    const tp = allPlans.filter(p => {
      const dept = p.detail?.dept || p.applicant_dept || p.applicant_name || "";
      return dept === t.name || dept.includes(t.name) || t.name.includes(dept);
    });
    const amt = tp.reduce((s, p) => s + Number(p.allocated_amount || p.amount || 0), 0);
    const exec = tp.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
    const pct = amt > 0 ? Math.round((exec / amt) * 100) : 0;
    const isCurrent = _opDrillOrg && (t.name === _opDrillOrg || t.name.includes(_opDrillOrg) || _opDrillOrg.includes(t.name));
    return { name: t.name, count: tp.length, amt, exec, pct, isCurrent,
      approved: tp.filter(p => p.status === "approved").length };
  });

  // 계획 목록 (선택된 팀 or 전체)
  const plans = _opDrillOrg
    ? allPlans.filter(p => {
        const dept = p.detail?.dept || p.applicant_dept || p.applicant_name || "";
        return dept === _opDrillOrg || dept.includes(_opDrillOrg) || _opDrillOrg.includes(dept);
      })
    : allPlans;

  const totalAmt = teamRows.reduce((s, t) => s + t.amt, 0);
  const totalExec = teamRows.reduce((s, t) => s + t.exec, 0);

  el.innerHTML = `<div class="bo-fade">
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <button onclick="_opDrillHq=null;_opDrillOrg=null;renderBoOperationPlan()"
        style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">← 전체 교육조직 보기</button>
    </div>
    ${_opFilterBar(isPlatform, tenants)}

    <!-- 팀별 요약 -->
    <div class="bo-card" style="overflow:hidden;margin-bottom:12px">
      <div style="padding:16px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">🏢 교육조직 상세</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${hq.name}</h2>
        <div style="margin-top:6px;display:flex;gap:20px;font-size:12px;flex-wrap:wrap">
          <span>팀수 <strong>${teams.length}개</strong></span>
          <span>계획 <strong>${allPlans.length}건</strong></span>
          <span>배정 <strong>${fmt(totalAmt)}</strong></span>
          <span>집행 <strong style="color:#93C5FD">${fmt(totalExec)}</strong></span>
        </div>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>맵핑 팀</th><th style="text-align:center">건수</th><th style="text-align:center">승인</th>
          <th style="text-align:right">배정 예산</th><th style="text-align:right">집행액</th>
          <th style="text-align:center">집행률</th>
        </tr></thead>
        <tbody>
          ${teamRows.map(t => `
          <tr onclick="_opDrillOrg='${t.name.replace(/'/g,"\\'")}';renderBoOperationPlan()"
            style="cursor:pointer;transition:background .12s;${t.isCurrent?"background:#EFF6FF;":""}"
            onmouseover="this.style.background='${t.isCurrent?"#E0F2FE":"#F8FAFC"}'"
            onmouseout="this.style.background='${t.isCurrent?"#EFF6FF":""}'">
            <td style="font-weight:${t.isCurrent?900:700};color:${t.isCurrent?"#002C5F":"inherit"}">${t.isCurrent?"▶ ":""}${t.name}</td>
            <td style="text-align:center">${t.count}건</td>
            <td style="text-align:center;color:#059669;font-weight:800">${t.approved}건</td>
            <td style="text-align:right;font-weight:800">${fmt(t.amt)}</td>
            <td style="text-align:right;color:#7C3AED;font-weight:800">${fmt(t.exec)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:4px;justify-content:center">
                <div style="width:40px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${t.pct}%;height:100%;background:${t.pct>=80?"#059669":t.pct>=50?"#D97706":"#DC2626"};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${t.pct>=80?"#059669":t.pct>=50?"#D97706":"#DC2626"}">${t.pct}%</span>
              </div>
            </td>
          </tr>`).join("")}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td>소계</td><td style="text-align:center">${allPlans.length}건</td>
            <td style="text-align:center;color:#059669">${teamRows.reduce((s,t)=>s+t.approved,0)}건</td>
            <td style="text-align:right">${fmt(totalAmt)}</td>
            <td style="text-align:right;color:#7C3AED">${fmt(totalExec)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 계획 목록 -->
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:16px 24px;background:linear-gradient(135deg,#1E3A5F,#0369A1);color:white;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:11px;opacity:.7;margin-bottom:4px">🗂️ 운영계획 목록</div>
          <h3 style="margin:0;font-size:16px;font-weight:900">
            ${_opDrillOrg ? `▶ ${_opDrillOrg}` : hq.name + " 전체"} — ${_opYear}년
          </h3>
          <div style="margin-top:4px;font-size:12px;opacity:.85">${plans.length}건</div>
        </div>
        ${_opDrillOrg ? `<button onclick="_opDrillOrg=null;renderBoOperationPlan()"
          style="padding:6px 14px;border-radius:8px;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:white;font-size:11px;font-weight:700;cursor:pointer">✕ 팀 필터 해제</button>` : ""}
      </div>
      ${plans.length > 0 ? `
      <div style="overflow-x:auto">
      <table class="bo-table" style="font-size:12px;min-width:900px">
        <thead><tr>
          <th>ID</th><th>계획명</th><th>신청자</th><th>계획 유형</th>
          <th style="text-align:right">배정 예산</th><th style="text-align:right">집행액</th>
          <th>상태</th><th>사업계획 연결</th><th>일자</th>
        </tr></thead>
        <tbody>
          ${plans.map(p => {
            const st = p.status || "pending";
            const stLabel = STATUS_LABEL[st] || st;
            const stColor = STATUS_COLOR[st] || "#6B7280";
            const amt = Number(p.allocated_amount || p.amount || 0);
            const exec = Number(p.actual_amount || 0);
            const hasForecastLink = !!p.source_forecast_plan_id;
            const fmt2 = v => v >= 10000 ? `${(v/10000).toFixed(0)}만원` : `${v.toLocaleString()}원`;
            const safeId = (p.id||"").replace(/'/g,"\\'");
            return `<tr>
              <td><code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${(p.id||"").slice(-8)}</code></td>
              <td><span onclick="_boPlanDetailView=null;_boPlanMgmtData=null;_boPlanDetailView=${JSON.stringify(p).replace(/</g,"&lt;")}"
                style="font-weight:700;color:#002C5F;cursor:pointer;text-decoration:underline">${p.edu_name||"-"}</span></td>
              <td style="font-size:11px;color:#6B7280">${p.applicant_name||"-"}</td>
              <td style="font-size:11px"><span style="padding:2px 8px;border-radius:6px;background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:800">${p.plan_type||"operation"}</span></td>
              <td style="text-align:right;font-weight:800">${fmt2(amt)}</td>
              <td style="text-align:right;font-weight:800;color:#7C3AED">${exec>0?fmt2(exec):"-"}</td>
              <td><span style="font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px;background:${stColor}18;color:${stColor}">${stLabel}</span></td>
              <td style="text-align:center">${hasForecastLink
                ? `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E" title="사업계획 ID: ${p.source_forecast_plan_id}">📋 사업계획 연결</span>`
                : '<span style="font-size:10px;color:#9CA3AF">-</span>'}</td>
              <td style="font-size:11px;color:#6B7280">${(p.created_at||"").slice(0,10)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      </div>` : `<div style="padding:40px;text-align:center;color:#9CA3AF">
        ${_opDrillOrg ? `${_opDrillOrg}의 운영계획이 없습니다` : "운영계획 데이터가 없습니다"}
      </div>`}
    </div>
  </div>`;
}

window.renderBoOperationPlan = renderBoOperationPlan;
