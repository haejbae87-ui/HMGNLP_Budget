// ─── 📊 교육예산 수요분석 (VOrg 계층 기반 3단계 드릴다운) ─────────────────────
// 필터: 테넌트(회사) → VOrg 템플릿 → 예산계정
// Level 1: VOrg 그룹(본부/센터)별 요약
// Level 2: 본부/센터 → 하위 팀별 상세
// Level 3: 팀/상신자 → 개별 계획 목록

// ── 필터 상태 ──
let _bdTenant = '';
let _bdTplId = null;       // virtual_org_template ID
let _bdAccountId = null;   // budget_account ID
let _bdYear = new Date().getFullYear();
let _bdDrillHq = null;     // Level 2: 드릴다운 그룹 ID
let _bdDrillOrg = null;    // Level 3: 드릴다운 팀/상신자명

// ── 캐시 ──
let _bdTplList = [];       // virtual_org_templates
let _bdAcctList = [];      // budget_accounts
let _bdGroups = [];        // tree_data.hqs (선택된 템플릿)
let _bdPlans = null;       // plans 캐시

// ── 진입점 ──────────────────────────────────────────────────────────────────
async function renderBudgetDemand() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>데이터 로딩 중...</div>';

  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
  if (!_bdTenant) _bdTenant = isPlatform ? (tenants.find(t => t.id !== 'SYSTEM')?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');

  // 템플릿 로드
  try {
    const { data } = await sb.from('virtual_org_templates').select('id,name,isolation_group_id,tree_data')
      .eq('tenant_id', _bdTenant);
    _bdTplList = data || [];
  } catch (e) { _bdTplList = []; }
  if (!_bdTplId || !_bdTplList.find(t => t.id === _bdTplId)) _bdTplId = _bdTplList[0]?.id || null;

  // 선택된 템플릿의 tree 그룹 로드
  const selTpl = _bdTplList.find(t => t.id === _bdTplId);
  _bdGroups = selTpl?.tree_data?.hqs || [];

  // 계정 로드
  if (_bdTplId) {
    try {
      const { data } = await sb.from('budget_accounts').select('id,name,code')
        .eq('tenant_id', _bdTenant).eq('active', true);
      _bdAcctList = data || [];
    } catch (e) { _bdAcctList = []; }
  } else { _bdAcctList = []; }

  // plans 로드
  try {
    let q = sb.from('plans').select('*').eq('tenant_id', _bdTenant).neq('status', 'draft')
      .order('created_at', { ascending: false });
    // 연도 필터
    q = q.gte('created_at', `${_bdYear}-01-01T00:00:00`).lt('created_at', `${_bdYear + 1}-01-01T00:00:00`);
    // isolation_group_id 필터 (선택된 템플릿 기준)
    if (selTpl?.isolation_group_id) {
      q = q.eq('isolation_group_id', selTpl.isolation_group_id);
    }
    // 계정 필터
    if (_bdAccountId) {
      const acct = _bdAcctList.find(a => a.id === _bdAccountId);
      if (acct) q = q.eq('account_code', acct.code);
    }
    const { data } = await q;
    _bdPlans = data || [];
  } catch (e) { _bdPlans = []; }

  // 드릴다운 라우팅
  if (_bdDrillOrg) { _renderBdLevel3(el); return; }
  if (_bdDrillHq) { _renderBdLevel2(el, isPlatform, tenants); return; }
  _renderBdLevel1(el, isPlatform, tenants);
}

// ────────────────────────────────────────────────────────────────────────────
// 공통 필터 바 (회사 > VOrg 템플릿 > 계정)
// ────────────────────────────────────────────────────────────────────────────
function _bdFilterBar(isPlatform, tenants) {
  const selStyle = 'border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:130px;cursor:pointer';

  const tenantSel = isPlatform
    ? `<select onchange="_bdTenant=this.value;_bdTplId=null;_bdAccountId=null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      ${tenants.filter(t => t.id !== 'SYSTEM').map(t =>
      `<option value="${t.id}" ${t.id === _bdTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>`
    : `<span style="font-size:12px;font-weight:800;color:#374151;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find(t => t.id === _bdTenant)?.name || _bdTenant}</span>`;

  const tplSel = _bdTplList.length
    ? `<select onchange="_bdTplId=this.value;_bdAccountId=null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      ${_bdTplList.map(t => `<option value="${t.id}" ${t.id === _bdTplId ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>`
    : '<span style="font-size:11px;color:#9CA3AF">템플릿 없음</span>';

  const acctSel = _bdAcctList.length
    ? `<select onchange="_bdAccountId=this.value||null;_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
      <option value="">전체 계정</option>
      ${_bdAcctList.map(a => `<option value="${a.id}" ${a.id === _bdAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
    </select>`
    : '';

  const yearSel = `<select onchange="_bdYear=Number(this.value);_bdDrillHq=null;_bdDrillOrg=null;_bdPlans=null;renderBudgetDemand()" style="${selStyle}">
    ${[_bdYear + 1, _bdYear, _bdYear - 1, _bdYear - 2].map(y =>
    `<option value="${y}" ${_bdYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
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
  const confirmedTotal = plans.filter(p => ['approved', 'completed'].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = plans.filter(p => p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejectedTotal = plans.filter(p => p.status === 'rejected')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedPct = demandTotal > 0 ? Math.round(confirmedTotal / demandTotal * 100) : 0;

  // 그룹별 집계
  const groupRows = _bdGroups.map(g => _bdAggregateGroup(g, plans));

  // 미분류
  const matchedIds = _bdGetMatchedIds(plans);
  const unmatchedPlans = plans.filter(p => !matchedIds.has(p.id));
  if (unmatchedPlans.length > 0) {
    groupRows.push(_bdAggregateUnmatched(unmatchedPlans));
  }

  const cards = [
    { icon: '📋', label: '전체 계획', val: `${totalCount}건`, color: '#002C5F', bg: '#EFF6FF' },
    { icon: '📊', label: '수요 예산', val: _bdFmt(demandTotal), color: '#0369A1', bg: '#F0F9FF' },
    { icon: '✅', label: '확정 예산', val: _bdFmt(confirmedTotal), color: '#059669', bg: '#F0FDF4' },
    { icon: '⏳', label: '미결 예산', val: _bdFmt(pendingTotal), color: '#D97706', bg: '#FFFBEB' },
  ];

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
        <p class="bo-page-sub">가상조직 기반 예산 수요·확정 현황</p>
      </div>
    </div>

    ${_bdFilterBar(isPlatform, tenants)}

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px">
      ${cards.map(c => `
      <div style="background:${c.bg};border-radius:14px;padding:16px 18px;border:1.5px solid ${c.color}20">
        <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:6px">${c.icon} ${c.label}</div>
        <div style="font-size:22px;font-weight:900;color:${c.color}">${c.val}</div>
      </div>`).join('')}
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

    ${groupRows.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#002C5F08,#0369A108);border-bottom:1px solid #F3F4F6">
        <span style="font-size:14px;font-weight:900;color:#002C5F">🏢 조직단위별 수요 현황</span>
        <span style="font-size:11px;color:#6B7280;margin-left:8px">${_bdAcctList.find(a => a.id === _bdAccountId)?.name || '전체 계정'}</span>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>조직단위</th><th style="text-align:center">팀수</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요 예산</th><th style="text-align:right">확정 예산</th>
          <th style="text-align:right">미결</th><th style="text-align:right">반려</th>
          <th style="text-align:center">확정률</th>
        </tr></thead>
        <tbody>
          ${groupRows.map(g => `
          <tr onclick="_bdDrillHq='${(g.id || '').replace(/'/g, "\\'")}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
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
                  <div style="width:${g.pct}%;height:100%;background:${g.pct >= 80 ? '#059669' : g.pct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${g.pct >= 80 ? '#059669' : g.pct >= 50 ? '#D97706' : '#DC2626'}">${g.pct}%</span>
              </div>
            </td>
          </tr>`).join('')}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td colspan="2">합계</td>
            <td style="text-align:center">${totalCount}건</td>
            <td style="text-align:right">${_bdFmt(demandTotal)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(confirmedTotal)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(pendingTotal)}</td>
            <td style="text-align:right;color:#DC2626">${_bdFmt(rejectedTotal)}</td>
            <td style="text-align:center;font-weight:900;color:${confirmedPct >= 80 ? '#059669' : confirmedPct >= 50 ? '#D97706' : '#DC2626'}">${confirmedPct}%</td>
          </tr>
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">${_bdYear}년 교육계획 데이터가 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">프론트오피스에서 교육계획을 수립하면 수요 분석 데이터가 표시됩니다.</div>
    </div>`}
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 2: 그룹(본부/센터) → 하위 팀별 상세
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel2(el, isPlatform, tenants) {
  const plans = _bdPlans || [];
  const hq = _bdGroups.find(g => g.id === _bdDrillHq);

  if (_bdDrillHq === '__unmatched__') {
    _renderBdUnmatched(el, plans, isPlatform, tenants);
    return;
  }
  if (!hq) { _bdDrillHq = null; renderBudgetDemand(); return; }

  const teams = hq.teams || [];
  const teamRows = teams.map(t => {
    const tPlans = _bdMatchTeam(t.name, plans);
    return _bdAggregateTeam(t, tPlans);
  });

  const totalDemand = teamRows.reduce((s, t) => s + t.demand, 0);
  const totalConfirmed = teamRows.reduce((s, t) => s + t.confirmed, 0);
  const totalPending = teamRows.reduce((s, t) => s + t.pending, 0);
  const totalCount = teamRows.reduce((s, t) => s + t.count, 0);
  const totalPct = totalDemand > 0 ? Math.round(totalConfirmed / totalDemand * 100) : 0;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
        <p class="bo-page-sub">가상조직 기반 예산 수요·확정 현황</p>
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

      ${teamRows.length > 0 ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>팀</th><th style="text-align:center">건수</th>
          <th style="text-align:right">수요</th><th style="text-align:right">확정</th>
          <th style="text-align:right">미결</th><th style="text-align:center">확정률</th>
          <th style="text-align:center">상신자</th>
        </tr></thead>
        <tbody>
          ${teamRows.map(t => {
    const applicantList = Object.entries(t.applicants).map(([n, v]) => `${n}(${v.count}건)`).join(', ') || '-';
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
                  <div style="width:${t.pct}%;height:100%;background:${t.pct >= 80 ? '#059669' : t.pct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${t.pct >= 80 ? '#059669' : t.pct >= 50 ? '#D97706' : '#DC2626'}">${t.pct}%</span>
              </div>
            </td>
            <td style="font-size:10px;color:#6B7280;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${applicantList}</td>
          </tr>`;
  }).join('')}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td>소계</td>
            <td style="text-align:center">${totalCount}건</td>
            <td style="text-align:right">${_bdFmt(totalDemand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(totalConfirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(totalPending)}</td>
            <td style="text-align:center;font-weight:900;color:${totalPct >= 80 ? '#059669' : totalPct >= 50 ? '#D97706' : '#DC2626'}">${totalPct}%</td>
            <td></td>
          </tr>
        </tbody>
      </table>` : `<div style="padding:40px;text-align:center;color:#9CA3AF">하위 팀 데이터 없음</div>`}
    </div>
  </div>`;
}

// ── 미분류 드릴다운 ──
function _renderBdUnmatched(el, plans, isPlatform, tenants) {
  const matchedIds = _bdGetMatchedIds(plans);
  const unmatched = plans.filter(p => !matchedIds.has(p.id));

  const orgMap = {};
  unmatched.forEach(p => {
    const name = p.applicant_name || '미상';
    if (!orgMap[name]) orgMap[name] = { count: 0, demand: 0, confirmed: 0, pending: 0 };
    orgMap[name].count++;
    orgMap[name].demand += Number(p.amount || 0);
    if (['approved', 'completed'].includes(p.status)) orgMap[name].confirmed += Number(p.amount || 0);
    if (p.status === 'pending') orgMap[name].pending += Number(p.amount || 0);
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
          ${Object.entries(orgMap).map(([name, v]) => `
          <tr onclick="_bdDrillOrg='${name.replace(/'/g, "\\'")}';renderBudgetDemand()" style="cursor:pointer"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:700">${name}</td>
            <td style="text-align:center">${v.count}건</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(v.demand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(v.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(v.pending)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 3: 개별 계획 목록
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel3(el) {
  const plans = (_bdPlans || []).filter(p => {
    const dept = p.detail?.dept || p.applicant_name || '';
    const target = _bdDrillOrg || '';
    return p.applicant_name === target || dept === target
      || _bdFuzzy(dept, target) || _bdFuzzy(target, dept);
  });

  const statusLabel = { pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소', completed: '완료' };
  const statusColor = { pending: '#D97706', approved: '#059669', rejected: '#DC2626', cancelled: '#9CA3AF', completed: '#059669' };
  const demandSum = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedSum = plans.filter(p => ['approved', 'completed'].includes(p.status))
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
      ${plans.length > 0 ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>ID</th><th>계획명</th><th>상신자</th><th>계정</th>
          <th style="text-align:right">금액</th><th>상태</th><th>제출일</th>
        </tr></thead>
        <tbody>
          ${plans.map(p => {
    const st = p.status || 'pending';
    return `
          <tr>
            <td><code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${(p.id || '').slice(-8)}</code></td>
            <td style="font-weight:700">${p.edu_name || '-'}</td>
            <td style="font-size:11px;color:#6B7280">${p.applicant_name || '-'}</td>
            <td>${p.account_code || '-'}</td>
            <td style="text-align:right;font-weight:900">${Number(p.amount || 0).toLocaleString()}원</td>
            <td><span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${statusColor[st] || '#6B7280'}15;color:${statusColor[st] || '#6B7280'}">${statusLabel[st] || st}</span></td>
            <td style="font-size:11px;color:#6B7280">${(p.created_at || '').slice(0, 10)}</td>
          </tr>`;
  }).join('')}
        </tbody>
      </table>` : `<div style="padding:40px;text-align:center;color:#9CA3AF">데이터 없음</div>`}
    </div>
  </div>`;
}

// ── 헬퍼 함수 ──────────────────────────────────────────────────────────────
function _bdFuzzy(a, b) {
  const strip = s => (s || '').replace(/OO/g, '').replace(/O/g, '').trim();
  return strip(a).includes(strip(b));
}

function _bdMatchTeam(teamName, plans) {
  return plans.filter(p => {
    const dept = p.detail?.dept || p.applicant_name || '';
    return _bdFuzzy(dept, teamName) || _bdFuzzy(teamName, dept);
  });
}

function _bdGetMatchedIds(plans) {
  const matched = new Set();
  _bdGroups.forEach(g => {
    (g.teams || []).forEach(t => {
      _bdMatchTeam(t.name, plans).forEach(p => matched.add(p.id));
    });
  });
  return matched;
}

function _bdAggregateGroup(g, plans) {
  const teams = g.teams || [];
  const teamNames = teams.map(t => t.name);
  const gPlans = plans.filter(p => {
    const dept = p.detail?.dept || p.applicant_name || '';
    return teamNames.some(tn => _bdFuzzy(dept, tn) || _bdFuzzy(tn, dept));
  });
  const demand = gPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = gPlans.filter(p => ['approved', 'completed'].includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = gPlans.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejected = gPlans.filter(p => p.status === 'rejected').reduce((s, p) => s + Number(p.amount || 0), 0);
  return {
    id: g.id, name: g.name, count: gPlans.length, demand, confirmed, pending, rejected,
    pct: demand > 0 ? Math.round(confirmed / demand * 100) : 0, teamCount: teams.length
  };
}

function _bdAggregateUnmatched(unmatchedPlans) {
  const demand = unmatchedPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = unmatchedPlans.filter(p => ['approved', 'completed'].includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = unmatchedPlans.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejected = unmatchedPlans.filter(p => p.status === 'rejected').reduce((s, p) => s + Number(p.amount || 0), 0);
  return {
    id: '__unmatched__', name: '기타/미분류', count: unmatchedPlans.length,
    demand, confirmed, pending, rejected,
    pct: demand > 0 ? Math.round(confirmed / demand * 100) : 0, teamCount: 0
  };
}

function _bdAggregateTeam(t, tPlans) {
  const demand = tPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmed = tPlans.filter(p => ['approved', 'completed'].includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);
  const pending = tPlans.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount || 0), 0);
  const applicantMap = {};
  tPlans.forEach(p => {
    const name = p.applicant_name || '미상';
    if (!applicantMap[name]) applicantMap[name] = { count: 0, demand: 0 };
    applicantMap[name].count++;
    applicantMap[name].demand += Number(p.amount || 0);
  });
  return {
    id: t.id, name: t.name, count: tPlans.length, demand, confirmed, pending,
    pct: demand > 0 ? Math.round(confirmed / demand * 100) : 0, applicants: applicantMap
  };
}

function _bdFmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만원';
  return n.toLocaleString() + '원';
}
