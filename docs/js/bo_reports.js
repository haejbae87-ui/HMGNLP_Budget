// ─── 통계 및 리포트 (P9: DB 기반 6단계 추적 레포트) ──────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _rptYear = new Date().getFullYear();
let _rptTplId = null;
let _rptGroupId = null;
let _rptAccountId = null;
let _rptTplList = [];
let _rptGroups = [];
let _rptAcctList = [];
let _rptMode = 'overview'; // 'overview' | 'team-detail' | 'account-detail'

async function renderBoReports() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">📊 레포트 데이터 로딩 중...</p></div>';

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  // 1. 템플릿 로드
  try {
    const { data } = await sb.from('virtual_org_templates')
      .select('id,name').eq('tenant_id', tenantId);
    _rptTplList = data || [];
  } catch { _rptTplList = []; }
  if (!_rptTplId && _rptTplList.length) _rptTplId = _rptTplList[0].id;

  // 2. 그룹(본부) 로드
  if (_rptTplId) {
    try {
      const { data } = await sb.from('virtual_org_templates')
        .select('tree_data').eq('id', _rptTplId).single();
      _rptGroups = data?.tree_data?.hqs || [];
    } catch { _rptGroups = []; }
  }

  // 3. 예산계정 로드
  if (_rptTplId) {
    try {
      const { data } = await sb.from('budget_accounts')
        .select('id,name,code').eq('virtual_org_template_id', _rptTplId)
        .eq('tenant_id', tenantId).eq('active', true);
      _rptAcctList = data || [];
    } catch { _rptAcctList = []; }
  }

  // 4. 핵심 데이터 병렬 조회
  let plans = [], apps = [], bankbooks = [], allocations = [];

  try {
    const [pRes, aRes, bbRes] = await Promise.all([
      sb.from('plans').select('id,amount,allocated_amount,actual_amount,status,account_code,team,hq,fiscal_year,plan_type')
        .eq('tenant_id', tenantId).eq('fiscal_year', _rptYear).is('deleted_at', null),
      sb.from('applications').select('amount,status,plan_id,account_code')
        .eq('tenant_id', tenantId),
      sb.from('org_budget_bankbooks').select('id,org_name,vorg_group_id,account_id,status')
        .eq('tenant_id', tenantId).eq('template_id', _rptTplId || ''),
    ]);
    plans = pRes.data || [];
    apps = aRes.data || [];
    bankbooks = bbRes.data || [];
  } catch (e) {
    console.error('[renderBoReports]', e);
  }

  if (bankbooks.length) {
    try {
      const bbIds = bankbooks.map(b => b.id);
      const { data } = await sb.from('budget_allocations')
        .select('id,bankbook_id,allocated_amount,used_amount,frozen_amount')
        .in('bankbook_id', bbIds);
      allocations = data || [];
    } catch { allocations = []; }
  }

  // ── 6단계 전체 집계 ──────────────────────────────────────────────────────
  const fmt = n => {
    const v = Number(n || 0);
    if (Math.abs(v) >= 100000000) return (v / 100000000).toFixed(1) + '억';
    if (Math.abs(v) >= 10000) return Math.round(v / 10000) + '만';
    return v.toLocaleString();
  };
  const fmtFull = n => Number(n || 0).toLocaleString() + '원';

  const planTotal    = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const allocTotal   = plans.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);
  const appTotal     = apps.reduce((s, a) => s + Number(a.amount || 0), 0);
  const approvedTotal= apps.filter(a => ['approved','completed'].includes(a.status))
                          .reduce((s, a) => s + Number(a.amount || 0), 0);
  const actualTotal  = plans.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
  const remaining    = allocTotal - actualTotal;

  const allocRate = planTotal > 0 ? ((allocTotal / planTotal) * 100).toFixed(1) : '-';
  const appRate   = allocTotal > 0 ? ((appTotal / allocTotal) * 100).toFixed(1) : '-';
  const execRate  = allocTotal > 0 ? ((actualTotal / allocTotal) * 100).toFixed(1) : '-';

  const stages = [
    { label: '계획액',  val: planTotal,     color: '#1D4ED8', icon: '📝', desc: '교육계획 상신 금액 합계' },
    { label: '배정액',  val: allocTotal,    color: '#7C3AED', icon: '💰', desc: '최종 배정 확정 금액' },
    { label: '신청액',  val: appTotal,      color: '#0891B2', icon: '📋', desc: '교육신청 접수 금액' },
    { label: '승인액',  val: approvedTotal, color: '#059669', icon: '✅', desc: '승인 완료 금액' },
    { label: '실사용액',val: actualTotal,   color: '#D97706', icon: '💳', desc: '실제 집행 금액' },
    { label: '잔액',    val: remaining,     color: remaining >= 0 ? '#059669' : '#DC2626',
      icon: remaining >= 0 ? '📦' : '⚠️', desc: '배정액 − 실사용액' },
  ];
  const maxVal = Math.max(...stages.map(s => Math.abs(s.val)), 1);

  const waterfallHtml = stages.map((s, i) => {
    const pct = Math.max(3, (Math.abs(s.val) / maxVal) * 100);
    const prevVal = i > 0 ? stages[i - 1].val : null;
    const delta = prevVal !== null ? s.val - prevVal : null;
    const deltaHtml = delta !== null
      ? `<span style="font-size:10px;color:${delta >= 0 ? '#059669' : '#DC2626'};margin-left:6px">
           ${delta >= 0 ? '▲' : '▼'} ${fmt(Math.abs(delta))}원
         </span>`
      : '';
    return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <div style="width:90px;text-align:right;font-size:12px;font-weight:800;color:#374151;flex-shrink:0">
        ${s.icon} ${s.label}
      </div>
      <div style="flex:1;height:36px;background:#F3F4F6;border-radius:10px;overflow:hidden;position:relative;cursor:pointer"
           title="${s.desc}: ${fmtFull(s.val)}">
        <div style="height:100%;width:${pct}%;background:${s.color};border-radius:10px;
                    transition:width .6s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;
                    padding-left:12px;min-width:80px">
          <span style="font-size:12px;font-weight:900;color:white;white-space:nowrap;
                       text-shadow:0 1px 3px rgba(0,0,0,.3)">${fmt(s.val)}원</span>
        </div>
      </div>
      <div style="width:80px;text-align:right;font-size:11px;color:#6B7280;flex-shrink:0">
        ${deltaHtml}
      </div>
    </div>`;
  }).join('');

  // ── 팀별 드릴다운 테이블 ─────────────────────────────────────────────────
  const teamMap = {};
  plans.forEach(p => {
    const key = p.team || p.applicant_name || '미분류';
    if (!teamMap[key]) teamMap[key] = { hq: p.hq || '', plan: 0, alloc: 0, actual: 0, count: 0 };
    teamMap[key].plan   += Number(p.amount || 0);
    teamMap[key].alloc  += Number(p.allocated_amount || 0);
    teamMap[key].actual += Number(p.actual_amount || 0);
    teamMap[key].count++;
  });

  const teamRows = Object.entries(teamMap)
    .sort((a, b) => b[1].alloc - a[1].alloc)
    .map(([team, d]) => {
      const execPct = d.alloc > 0 ? ((d.actual / d.alloc) * 100).toFixed(1) : '0.0';
      const barColor = Number(execPct) > 90 ? '#EF4444' : Number(execPct) > 50 ? '#F59E0B' : '#059669';
      const remain   = d.alloc - d.actual;
      return `<tr style="border-bottom:1px solid #F3F4F6">
        <td style="padding:9px 12px;font-size:11px;color:#9CA3AF">${d.hq}</td>
        <td style="padding:9px 12px;font-weight:700;font-size:12px">${team}</td>
        <td style="padding:9px 12px;text-align:center;font-size:11px;color:#6B7280">${d.count}건</td>
        <td style="padding:9px 12px;text-align:right;font-weight:800;font-size:12px">${fmt(d.plan)}원</td>
        <td style="padding:9px 12px;text-align:right;font-weight:900;color:#7C3AED;font-size:12px">${fmt(d.alloc)}원</td>
        <td style="padding:9px 12px;text-align:right;color:#D97706;font-size:12px">${fmt(d.actual)}원</td>
        <td style="padding:9px 12px;text-align:right;color:${remain >= 0 ? '#059669' : '#DC2626'};font-weight:800;font-size:12px">${fmt(remain)}원</td>
        <td style="padding:9px 12px;min-width:120px">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:8px;background:#E5E7EB;border-radius:99px;overflow:hidden">
              <div style="width:${Math.min(100, execPct)}%;height:100%;background:${barColor};border-radius:99px;transition:width .4s"></div>
            </div>
            <span style="font-size:10px;font-weight:900;color:${Number(execPct)>90?'#EF4444':'#374151'};width:36px">${execPct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="8" style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">데이터 없음</td></tr>';

  // ── 계정별 집계 ──────────────────────────────────────────────────────────
  const acctMap = {};
  plans.forEach(p => {
    const key = p.account_code || '미분류';
    if (!acctMap[key]) acctMap[key] = { plan: 0, alloc: 0, actual: 0 };
    acctMap[key].plan   += Number(p.amount || 0);
    acctMap[key].alloc  += Number(p.allocated_amount || 0);
    acctMap[key].actual += Number(p.actual_amount || 0);
  });

  const acctColors = ['#1D4ED8','#7C3AED','#059669','#D97706','#0891B2','#EF4444'];
  const acctBarsHtml = Object.entries(acctMap).map(([code, d], i) => {
    const pct = d.alloc > 0 ? ((d.actual / d.alloc) * 100).toFixed(1) : '0.0';
    const color = acctColors[i % acctColors.length];
    const acctName = _rptAcctList.find(a => a.code === code)?.name || code;
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:12px;font-weight:800;color:#374151">${acctName}</span>
        <span style="font-size:11px;font-weight:700;color:${color}">${pct}% 집행</span>
      </div>
      <div style="height:10px;background:#E5E7EB;border-radius:99px;overflow:hidden;margin-bottom:4px">
        <div style="width:${Math.min(100,pct)}%;height:100%;background:${color};border-radius:99px;transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF">
        <span>실사용 ${fmt(d.actual)}원</span>
        <span>배정 ${fmt(d.alloc)}원</span>
      </div>
    </div>`;
  }).join('') || '<p style="color:#9CA3AF;font-size:12px">계정 데이터 없음</p>';

  // ── 연도/템플릿 필터 UI ──────────────────────────────────────────────────
  const years = [new Date().getFullYear()+1, new Date().getFullYear(), new Date().getFullYear()-1];
  const yearSel = `<select onchange="_rptYear=Number(this.value);renderBoReports()"
    style="padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px;font-weight:700">
    ${years.map(y => `<option value="${y}" ${_rptYear===y?'selected':''}>${y}년</option>`).join('')}
  </select>`;

  const tplSel = _rptTplList.length ? `<select onchange="_rptTplId=this.value;_rptGroupId=null;renderBoReports()"
    style="padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px;font-weight:700">
    ${_rptTplList.map(t => `<option value="${t.id}" ${_rptTplId===t.id?'selected':''}>${t.name}</option>`).join('')}
  </select>` : '';

  // ── KPI 카드 ─────────────────────────────────────────────────────────────
  const kpiCards = [
    { label: '계획 대비 배정률', val: allocRate + '%', color: '#7C3AED', icon: '💰', sub: `${fmt(allocTotal)}원 배정` },
    { label: '배정 대비 신청률', val: appRate + '%',   color: '#0891B2', icon: '📋', sub: `${fmt(appTotal)}원 신청` },
    { label: '배정 대비 집행률', val: execRate + '%',  color: Number(execRate) > 100 ? '#DC2626' : '#059669',
      icon: Number(execRate) > 100 ? '⚠️' : '✅', sub: `${fmt(actualTotal)}원 집행` },
    { label: '잔액',            val: fmt(remaining) + '원', color: remaining >= 0 ? '#059669' : '#DC2626',
      icon: remaining >= 0 ? '📦' : '🔴', sub: remaining >= 0 ? '예산 여유 있음' : '초과 집행' },
  ].map(k => `
    <div style="padding:16px 20px;border-radius:14px;background:white;border:1px solid #F3F4F6;
                box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center">
      <div style="font-size:20px;margin-bottom:6px">${k.icon}</div>
      <div style="font-size:10px;font-weight:700;color:#6B7280;margin-bottom:4px">${k.label}</div>
      <div style="font-size:22px;font-weight:900;color:${k.color}">${k.val}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:4px">${k.sub}</div>
    </div>`).join('');

  el.innerHTML = `
<div class="bo-fade" style="max-width:1200px">

  <!-- 헤더 -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <h1 class="bo-page-title" style="margin:0">📊 예산 분석 리포트</h1>
        ${typeof boRoleModeBadge==='function' ? boRoleModeBadge() : ''}
      </div>
      <p class="bo-page-sub">6단계 예산 흐름(계획→배정→신청→승인→실사용→잔액) 실시간 DB 집계</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      ${yearSel} ${tplSel}
      <button onclick="_rptExportCSV()" style="padding:8px 16px;background:#059669;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📥 CSV</button>
    </div>
  </div>

  <!-- KPI 카드 4개 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${kpiCards}
  </div>

  <!-- 6단계 워터폴 바 차트 -->
  <div style="padding:24px;border-radius:16px;background:white;border:1px solid #F3F4F6;
              box-shadow:0 2px 12px rgba(0,0,0,.06);margin-bottom:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div>
        <div style="font-size:15px;font-weight:900;color:#111827">📈 ${_rptYear}년 예산 6단계 추적 워터폴</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">단계별 금액 변화 및 누수 지점 파악</div>
      </div>
      <div style="font-size:11px;color:#9CA3AF">기준: ${_rptYear}년 · 전체 ${plans.length}건</div>
    </div>
    ${waterfallHtml}

    <!-- 범례 -->
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid #F3F4F6">
      ${stages.map(s => `<span style="font-size:10px;color:#6B7280;display:flex;align-items:center;gap:4px">
        <span style="width:10px;height:10px;border-radius:3px;background:${s.color};flex-shrink:0"></span>
        ${s.label}: ${fmtFull(s.val)}
      </span>`).join('')}
    </div>
  </div>

  <!-- 팀별 드릴다운 + 계정별 -->
  <div style="display:grid;grid-template-columns:1fr 340px;gap:16px;margin-bottom:20px">

    <!-- 팀별 테이블 -->
    <div style="border-radius:16px;background:white;border:1px solid #F3F4F6;
                box-shadow:0 2px 12px rgba(0,0,0,.06);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:900;color:#111827">🏢 팀별 예산 집행 현황</div>
        <span style="font-size:11px;color:#9CA3AF">${Object.keys(teamMap).length}개 팀</span>
      </div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:10px 12px;text-align:left;font-weight:800;color:#6B7280;font-size:10px">본부</th>
              <th style="padding:10px 12px;text-align:left;font-weight:800;color:#6B7280;font-size:10px">팀</th>
              <th style="padding:10px 12px;text-align:center;font-weight:800;color:#6B7280;font-size:10px">건수</th>
              <th style="padding:10px 12px;text-align:right;font-weight:800;color:#6B7280;font-size:10px">계획액</th>
              <th style="padding:10px 12px;text-align:right;font-weight:800;color:#6B7280;font-size:10px">배정액</th>
              <th style="padding:10px 12px;text-align:right;font-weight:800;color:#6B7280;font-size:10px">실사용</th>
              <th style="padding:10px 12px;text-align:right;font-weight:800;color:#6B7280;font-size:10px">잔액</th>
              <th style="padding:10px 12px;font-weight:800;color:#6B7280;font-size:10px;min-width:110px">집행률</th>
            </tr>
          </thead>
          <tbody>${teamRows}</tbody>
        </table>
      </div>
    </div>

    <!-- 계정별 소진 비율 -->
    <div style="border-radius:16px;background:white;border:1px solid #F3F4F6;
                box-shadow:0 2px 12px rgba(0,0,0,.06);padding:20px">
      <div style="font-size:14px;font-weight:900;color:#111827;margin-bottom:16px">💳 계정별 집행률</div>
      ${acctBarsHtml}

      <!-- 연말 마감 -->
      <div style="margin-top:20px;padding:14px;border-radius:12px;background:#FEF2F2;border:1.5px solid #FECACA">
        <div style="font-size:12px;font-weight:900;color:#B91C1C;margin-bottom:4px">⚠️ 연말 예산 마감</div>
        <div style="font-size:11px;color:#6B7280;margin-bottom:10px">미집행 가점유 예산을 자동 환원합니다</div>
        <button onclick="alert('관리자 최종 확인 절차가 필요합니다.')"
          style="width:100%;padding:9px;border-radius:8px;border:none;
                 background:#B91C1C;color:white;font-size:12px;font-weight:800;cursor:pointer">
          🔒 ${_rptYear}년 예산 마감 실행
        </button>
      </div>
    </div>
  </div>

</div>`;
}

// ── CSV 내보내기 ─────────────────────────────────────────────────────────────
function _rptExportCSV() {
  alert('CSV 내보내기: bo_reports 팀별 집계 데이터를 내보냅니다.');
}
