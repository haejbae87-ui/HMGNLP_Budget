// ─── 📊 교육예산 수요분석 (VOrg 계층 기반 3단계 드릴다운) ─────────────────────
// Level 1: VOrg 선택 → 본부/센터 요약
// Level 2: 본부/센터 클릭 → 하위 팀별 상세
// Level 3: 팀/상신자 클릭 → 개별 계획 목록

let _bdDemandData = null;
let _bdYear = new Date().getFullYear();
let _bdSelectedVorg = null;  // 선택된 VOrg template ID
let _bdDrillHq = null;       // Level 2: 드릴다운 본부/센터 ID
let _bdDrillOrg = null;      // Level 3: 드릴다운 팀/상신자명

async function renderBudgetDemand() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  // DB 로드 (최초 1회)
  if (!_bdDemandData && sb) {
    el.innerHTML = '<div style="padding:60px;text-align:center;color:#6B7280;font-size:14px"><div style="font-size:32px;margin-bottom:8px">⏳</div>데이터 로딩 중...</div>';
    try {
      const { data, error } = await sb.from('plans').select('*')
        .eq('tenant_id', tenantId).neq('status', 'draft')
        .order('created_at', { ascending: false });
      if (error) throw error;
      _bdDemandData = data || [];
    } catch (err) {
      console.error('[renderBudgetDemand] DB 조회 실패:', err.message);
      _bdDemandData = [];
    }
  }
  if (!_bdDemandData) _bdDemandData = [];

  // VOrg 목록 (VIRTUAL_EDU_ORGS 기반, 테넌트 필터)
  const allVorgs = typeof VIRTUAL_EDU_ORGS !== 'undefined' ? VIRTUAL_EDU_ORGS : [];
  const myVorgs = tenantId ? allVorgs.filter(v => v.tenantId === tenantId) : allVorgs;

  // 기본 선택: 첫 번째 VOrg
  if (!_bdSelectedVorg && myVorgs.length > 0) _bdSelectedVorg = myVorgs[0].id;

  // Level 3 드릴다운
  if (_bdDrillOrg) { _renderBdLevel3(el); return; }
  // Level 2 드릴다운
  if (_bdDrillHq) { _renderBdLevel2(el, myVorgs); return; }
  // Level 1 메인
  _renderBdLevel1(el, myVorgs);
}

// ────────────────────────────────────────────────────────────────────────────
// Level 1: VOrg 선택 → 본부/센터별 요약
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel1(el, myVorgs) {
  const plans = _bdFilterYear(_bdDemandData);
  const selVorg = myVorgs.find(v => v.id === _bdSelectedVorg) || myVorgs[0];

  // ── VOrg에 맵핑된 plans 필터 ──
  let vorgPlans = [];
  if (selVorg) {
    const domainId = selVorg.domainId;
    // isolation_group_id 기반 필터
    const vorgTpl = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [])
      .find(v => v.id === domainId);
    const ownedAccounts = vorgTpl?.ownedAccounts || [];
    vorgPlans = plans.filter(p =>
      p.isolation_group_id === domainId ||
      (ownedAccounts.length > 0 && ownedAccounts.includes(p.account_code))
    );
  }

  // ── 전체 집계 ──
  const totalCount = vorgPlans.length;
  const demandTotal = vorgPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedTotal = vorgPlans.filter(p => ['approved', 'completed'].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingTotal = vorgPlans.filter(p => p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const rejectedTotal = vorgPlans.filter(p => p.status === 'rejected')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedPct = demandTotal > 0 ? Math.round(confirmedTotal / demandTotal * 100) : 0;

  // ── 본부/센터별 집계 (tree 구조 기반) ──
  const groups = selVorg ? [...(selVorg.tree?.hqs || []), ...(selVorg.tree?.centers || [])] : [];
  const groupRows = groups.map(g => {
    // 해당 본부/센터의 팀 이름 목록
    const teamNames = (g.teams || []).map(t => t.name);
    // plans에서 dept 매칭
    const gPlans = vorgPlans.filter(p => {
      const dept = p.detail?.dept || p.applicant_name || '';
      return teamNames.some(tn => dept.includes(tn.replace(/OO/g, '').replace(/O/g, '')))
        || teamNames.some(tn => tn.includes(dept.replace(/OO/g, '').replace(/O/g, '')));
    });

    const demand = gPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const confirmed = gPlans.filter(p => ['approved', 'completed'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending = gPlans.filter(p => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const rejected = gPlans.filter(p => p.status === 'rejected')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pct = demand > 0 ? Math.round(confirmed / demand * 100) : 0;
    const budget = g.budget || {};
    const allocated = Number(budget.total || 0);

    return {
      id: g.id, name: g.name, manager: g.manager || '-', count: gPlans.length,
      demand, confirmed, pending, rejected, pct, allocated, teamCount: (g.teams || []).length
    };
  });

  // 미분류 (어느 본부에도 매칭 안 된 계획)
  const matchedIds = new Set();
  groups.forEach(g => {
    const teamNames = (g.teams || []).map(t => t.name);
    vorgPlans.forEach(p => {
      const dept = p.detail?.dept || p.applicant_name || '';
      if (teamNames.some(tn => dept.includes(tn.replace(/OO/g, '').replace(/O/g, '')))
        || teamNames.some(tn => tn.includes(dept.replace(/OO/g, '').replace(/O/g, '')))) {
        matchedIds.add(p.id);
      }
    });
  });
  const unmatchedPlans = vorgPlans.filter(p => !matchedIds.has(p.id));
  if (unmatchedPlans.length > 0) {
    const uDemand = unmatchedPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const uConfirmed = unmatchedPlans.filter(p => ['approved', 'completed'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const uPending = unmatchedPlans.filter(p => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const uRejected = unmatchedPlans.filter(p => p.status === 'rejected')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    groupRows.push({
      id: '__unmatched__', name: '기타/미분류', manager: '-',
      count: unmatchedPlans.length, demand: uDemand, confirmed: uConfirmed,
      pending: uPending, rejected: uRejected,
      pct: uDemand > 0 ? Math.round(uConfirmed / uDemand * 100) : 0,
      allocated: 0, teamCount: 0
    });
  }

  // ── 렌더링 ──
  const yearSel = `<select onchange="_bdYear=Number(this.value);_bdDemandData=null;renderBudgetDemand()"
    style="padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer">
    ${[_bdYear + 1, _bdYear, _bdYear - 1, _bdYear - 2].map(y =>
    `<option value="${y}" ${_bdYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
  </select>`;

  const vorgSel = myVorgs.length > 1 ? `<select onchange="_bdSelectedVorg=this.value;_bdDrillHq=null;_bdDrillOrg=null;renderBudgetDemand()"
    style="padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;max-width:300px">
    ${myVorgs.map(v => `<option value="${v.id}" ${_bdSelectedVorg === v.id ? 'selected' : ''}>${v.name}</option>`).join('')}
  </select>` : '';

  const cards = [
    { icon: '📋', label: '전체 계획', val: `${totalCount}건`, color: '#002C5F', bg: '#EFF6FF' },
    { icon: '📊', label: '수요 예산', val: _bdFmt(demandTotal), color: '#0369A1', bg: '#F0F9FF' },
    { icon: '✅', label: '확정 예산', val: _bdFmt(confirmedTotal), color: '#059669', bg: '#F0FDF4' },
    { icon: '⏳', label: '미결 예산', val: _bdFmt(pendingTotal), color: '#D97706', bg: '#FFFBEB' },
  ];

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
        <p class="bo-page-sub">가상조직 기반 예산 수요·확정 현황 (3단계 드릴다운)</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${vorgSel}
        ${yearSel}
        <button onclick="_bdDemandData=null;renderBudgetDemand()" class="bo-btn-primary">🔄 새로고침</button>
      </div>
    </div>

    <!-- VOrg 선택 배너 -->
    ${selVorg ? `
    <div style="padding:12px 18px;background:linear-gradient(135deg,#002C5F08,#0369A108);border:1.5px solid #002C5F15;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <span style="width:10px;height:10px;border-radius:50%;background:#002C5F;flex-shrink:0"></span>
      <span style="font-size:13px;font-weight:900;color:#002C5F">${selVorg.name}</span>
      <span style="font-size:11px;color:#6B7280">· ${groups.length}개 조직단위 · ${vorgPlans.length}건 계획</span>
    </div>` : ''}

    <!-- 요약 카드 -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px">
      ${cards.map(c => `
      <div style="background:${c.bg};border-radius:14px;padding:16px 18px;border:1.5px solid ${c.color}20">
        <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:6px">${c.icon} ${c.label}</div>
        <div style="font-size:22px;font-weight:900;color:${c.color}">${c.val}</div>
      </div>`).join('')}
    </div>

    <!-- 전체 확정률 -->
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

    <!-- 본부/센터별 테이블 -->
    ${groupRows.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#002C5F08,#0369A108);border-bottom:1px solid #F3F4F6">
        <span style="font-size:14px;font-weight:900;color:#002C5F">🏢 조직단위별 수요 현황</span>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>조직단위</th><th style="text-align:center">담당자</th>
          <th style="text-align:center">팀수</th><th style="text-align:center">건수</th>
          <th style="text-align:right">배정 예산</th>
          <th style="text-align:right">수요 예산</th><th style="text-align:right">확정 예산</th>
          <th style="text-align:right">미결</th><th style="text-align:center">확정률</th>
        </tr></thead>
        <tbody>
          ${groupRows.map(g => {
    const safeId = (g.id || '').replace(/'/g, "\\'");
    return `
          <tr onclick="_bdDrillHq='${safeId}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:800">${g.name}</td>
            <td style="text-align:center;font-size:11px;color:#6B7280">${g.manager}</td>
            <td style="text-align:center">${g.teamCount}</td>
            <td style="text-align:center">${g.count}건</td>
            <td style="text-align:right;font-weight:700;color:#6B7280">${_bdFmt(g.allocated)}</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(g.demand)}</td>
            <td style="text-align:right;font-weight:800;color:#059669">${_bdFmt(g.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(g.pending)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${g.pct}%;height:100%;background:${g.pct >= 80 ? '#059669' : g.pct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${g.pct >= 80 ? '#059669' : g.pct >= 50 ? '#D97706' : '#DC2626'}">${g.pct}%</span>
              </div>
            </td>
          </tr>`;
  }).join('')}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td colspan="3">합계</td>
            <td style="text-align:center">${totalCount}건</td>
            <td style="text-align:right;color:#6B7280">${_bdFmt(groupRows.reduce((s, g) => s + g.allocated, 0))}</td>
            <td style="text-align:right">${_bdFmt(demandTotal)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(confirmedTotal)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(pendingTotal)}</td>
            <td style="text-align:center;color:${confirmedPct >= 80 ? '#059669' : confirmedPct >= 50 ? '#D97706' : '#DC2626'};font-weight:900">${confirmedPct}%</td>
          </tr>
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center;margin-top:16px">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">${_bdYear}년 교육계획 데이터가 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">프론트오피스에서 교육계획을 수립하면 수요 분석 데이터가 표시됩니다.</div>
    </div>`}
  </div>`;
}

// ────────────────────────────────────────────────────────────────────────────
// Level 2: 본부/센터 → 팀별 상세
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel2(el, myVorgs) {
  const plans = _bdFilterYear(_bdDemandData);
  const selVorg = myVorgs.find(v => v.id === _bdSelectedVorg) || myVorgs[0];
  if (!selVorg) { _bdDrillHq = null; renderBudgetDemand(); return; }

  const groups = [...(selVorg.tree?.hqs || []), ...(selVorg.tree?.centers || [])];
  const hq = groups.find(g => g.id === _bdDrillHq);

  // 미분류 드릴다운
  if (_bdDrillHq === '__unmatched__') {
    _renderBdUnmatched(el, selVorg, plans);
    return;
  }

  if (!hq) { _bdDrillHq = null; renderBudgetDemand(); return; }

  const teams = hq.teams || [];
  const domainId = selVorg.domainId;
  const vorgTpl = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [])
    .find(v => v.id === domainId);
  const ownedAccounts = vorgTpl?.ownedAccounts || [];

  // VOrg 필터
  const vorgPlans = plans.filter(p =>
    p.isolation_group_id === domainId ||
    (ownedAccounts.length > 0 && ownedAccounts.includes(p.account_code))
  );

  // 팀별 집계
  const teamRows = teams.map(t => {
    const tPlans = vorgPlans.filter(p => {
      const dept = p.detail?.dept || p.applicant_name || '';
      const tName = t.name.replace(/OO/g, '').replace(/O/g, '');
      return dept.includes(tName) || tName.includes(dept.replace(/OO/g, '').replace(/O/g, ''));
    });
    const demand = tPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const confirmed = tPlans.filter(p => ['approved', 'completed'].includes(p.status))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending = tPlans.filter(p => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const rejected = tPlans.filter(p => p.status === 'rejected')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pct = demand > 0 ? Math.round(confirmed / demand * 100) : 0;
    const budget = t.budget || {};
    const allocated = Number(budget.allocated || 0);

    // 상신자별 서브그룹
    const applicantMap = {};
    tPlans.forEach(p => {
      const name = p.applicant_name || '미상';
      if (!applicantMap[name]) applicantMap[name] = { count: 0, demand: 0 };
      applicantMap[name].count++;
      applicantMap[name].demand += Number(p.amount || 0);
    });

    return {
      id: t.id, name: t.name, count: tPlans.length, demand, confirmed, pending,
      rejected, pct, allocated, applicants: applicantMap,
      jobTypes: t.allowedJobTypes || []
    };
  });

  const totalDemand = teamRows.reduce((s, t) => s + t.demand, 0);
  const totalConfirmed = teamRows.reduce((s, t) => s + t.confirmed, 0);
  const totalPending = teamRows.reduce((s, t) => s + t.pending, 0);
  const totalCount = teamRows.reduce((s, t) => s + t.count, 0);
  const totalPct = totalDemand > 0 ? Math.round(totalConfirmed / totalDemand * 100) : 0;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillHq=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← ${selVorg.name} 전체 보기
      </button>
    </div>

    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">🏢 조직단위 상세</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${hq.name}</h2>
        <div style="margin-top:8px;display:flex;gap:20px;font-size:12px;flex-wrap:wrap">
          <span>담당자 <strong>${hq.manager || '-'}</strong></span>
          <span>팀수 <strong>${teams.length}개</strong></span>
          <span>수요 <strong>${_bdFmt(totalDemand)}</strong></span>
          <span>확정 <strong style="color:#86EFAC">${_bdFmt(totalConfirmed)}</strong></span>
          <span>배정 <strong style="color:#93C5FD">${_bdFmt(Number(hq.budget?.total || 0))}</strong></span>
        </div>
      </div>

      ${teamRows.length > 0 ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>팀</th><th style="text-align:center">건수</th>
          <th style="text-align:right">배정</th>
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
            <td style="font-weight:800">${t.name}${t.jobTypes.length > 0 ? `<br><span style="font-size:10px;color:#9CA3AF">${t.jobTypes.join(', ')}</span>` : ''}</td>
            <td style="text-align:center">${t.count}건</td>
            <td style="text-align:right;color:#6B7280;font-weight:700">${_bdFmt(t.allocated)}</td>
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
            <td style="text-align:right;color:#6B7280">${_bdFmt(Number(hq.budget?.total || 0))}</td>
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
function _renderBdUnmatched(el, selVorg, plans) {
  const domainId = selVorg.domainId;
  const vorgTpl = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [])
    .find(v => v.id === domainId);
  const ownedAccounts = vorgTpl?.ownedAccounts || [];
  const vorgPlans = plans.filter(p =>
    p.isolation_group_id === domainId ||
    (ownedAccounts.length > 0 && ownedAccounts.includes(p.account_code))
  );

  // 매칭된 ID 제거
  const groups = [...(selVorg.tree?.hqs || []), ...(selVorg.tree?.centers || [])];
  const matchedIds = new Set();
  groups.forEach(g => {
    (g.teams || []).forEach(t => {
      vorgPlans.forEach(p => {
        const dept = p.detail?.dept || p.applicant_name || '';
        const tName = t.name.replace(/OO/g, '').replace(/O/g, '');
        if (dept.includes(tName) || tName.includes(dept.replace(/OO/g, '').replace(/O/g, ''))) matchedIds.add(p.id);
      });
    });
  });
  const unmatched = vorgPlans.filter(p => !matchedIds.has(p.id));

  // 상신자별 그룹
  const orgMap = {};
  unmatched.forEach(p => {
    const name = p.applicant_name || '미상';
    if (!orgMap[name]) orgMap[name] = { count: 0, demand: 0, confirmed: 0, pending: 0, plans: [] };
    orgMap[name].count++;
    orgMap[name].demand += Number(p.amount || 0);
    if (['approved', 'completed'].includes(p.status)) orgMap[name].confirmed += Number(p.amount || 0);
    if (p.status === 'pending') orgMap[name].pending += Number(p.amount || 0);
    orgMap[name].plans.push(p);
  });

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillHq=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← ${selVorg.name} 전체 보기
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#6B7280,#9CA3AF);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">📦 미분류</div>
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
// Level 3: 개별 계획 목록 (상신자/팀 기준)
// ────────────────────────────────────────────────────────────────────────────
function _renderBdLevel3(el) {
  const plans = _bdFilterYear(_bdDemandData).filter(p => {
    const dept = p.detail?.dept || p.applicant_name || '';
    const target = _bdDrillOrg || '';
    return p.applicant_name === target || dept === target
      || dept.includes(target.replace(/OO/g, '').replace(/O/g, ''))
      || target.includes(dept.replace(/OO/g, '').replace(/O/g, ''));
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
            <td>
              <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${statusColor[st] || '#6B7280'}15;color:${statusColor[st] || '#6B7280'}">${statusLabel[st] || st}</span>
            </td>
            <td style="font-size:11px;color:#6B7280">${(p.created_at || '').slice(0, 10)}</td>
          </tr>`;
  }).join('')}
        </tbody>
      </table>` : `<div style="padding:40px;text-align:center;color:#9CA3AF">데이터 없음</div>`}
    </div>
  </div>`;
}

// ── 헬퍼 ──
function _bdFilterYear(data) {
  return (data || []).filter(p => (p.created_at || '').slice(0, 4) === String(_bdYear));
}

function _bdFmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만원';
  return n.toLocaleString() + '원';
}
