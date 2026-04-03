// ─── 📊 교육예산 수요분석 (개선 버전) ──────────────────────────────────────
// account_code 기반 VOrg 역매핑 + dept 기준 조직별 집계 + 2단계 UI
let _bdDemandData = null;
let _bdYear = new Date().getFullYear();
let _bdSelectedVorg = null; // 선택된 VOrg ID (2단계 진입)
let _bdDrillOrg = null;     // 드릴다운 조직명

// ── account_code → VOrg 역매핑 ──────────────────────────────────────────────
function _bdResolveVorgId(plan) {
  // 1. isolation_group_id가 있으면 그대로 사용
  if (plan.isolation_group_id) return plan.isolation_group_id;
  // 2. account_code → VORG_TEMPLATES.ownedAccounts 역매핑
  const acc = plan.account_code;
  if (!acc) return null;
  const vorgTemplates = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  // FREE 계정 제외, 테넌트 필터
  const matched = vorgTemplates.find(v =>
    v.tenantId === tenantId &&
    !v.id.includes('FREE') &&
    (v.ownedAccounts || []).includes(acc)
  );
  return matched ? matched.id : null;
}

async function renderBudgetDemand() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  // DB 로드
  if (!_bdDemandData && sb) {
    try {
      const { data, error } = await sb.from('plans').select('*')
        .eq('tenant_id', tenantId).neq('status', 'draft');
      if (error) throw error;
      _bdDemandData = data || [];
    } catch (err) {
      console.error('[renderBudgetDemand] DB 조회 실패:', err.message);
      _bdDemandData = [];
    }
  }
  if (!_bdDemandData) _bdDemandData = [];

  // 3단계 드릴다운 모드
  if (_bdDrillOrg && _bdSelectedVorg) {
    _renderBdOrgDrill(el);
    return;
  }
  // 2단계: VOrg 상세
  if (_bdSelectedVorg) {
    _renderBdVorgDetail(el);
    return;
  }
  // 1단계: VOrg 카드 개요
  _renderBdOverview(el);
}

// ─── 1단계: VOrg 카드 개요 ──────────────────────────────────────────────────
function _renderBdOverview(el) {
  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const plans = _bdFilterYear(_bdDemandData);

  // VOrg별 집계
  const vorgTemplates = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [])
    .filter(v => v.tenantId === tenantId && !v.id.includes('FREE'));

  const vorgStats = vorgTemplates.map(vorg => {
    const vPlans = plans.filter(p => _bdResolveVorgId(p) === vorg.id);
    const demand = vPlans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const confirmed = vPlans.filter(p => p.status === 'approved' || p.status === 'completed')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pending = vPlans.filter(p => p.status === 'pending')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const rejected = vPlans.filter(p => p.status === 'rejected')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const pct = demand > 0 ? Math.round(confirmed / demand * 100) : 0;
    // 조직(dept) 수 카운트
    const depts = new Set(vPlans.map(p => p.detail?.dept || p.applicant_name || '미분류'));
    return { vorg, count: vPlans.length, demand, confirmed, pending, rejected, pct, deptCount: depts.size };
  }).filter(v => v.count > 0 || true); // 0건도 표시

  // 미분류 (어떤 VOrg에도 매칭 안된 계획)
  const allMapped = new Set(vorgTemplates.map(v => v.id));
  const unmapped = plans.filter(p => {
    const vid = _bdResolveVorgId(p);
    return !vid || !allMapped.has(vid);
  });

  // 전체 집계
  const totalDemand = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalConfirmed = plans.filter(p => ['approved', 'completed'].includes(p.status))
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPending = plans.filter(p => p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalPct = totalDemand > 0 ? Math.round(totalConfirmed / totalDemand * 100) : 0;

  const yearSel = _bdYearSelector();

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
      <div>
        <h1 class="bo-page-title">📊 교육예산 수요분석</h1>
        <p class="bo-page-sub">가상조직(VOrg)별 교육계획 기반 예산 수요·확정 현황</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${yearSel}
        <button onclick="_bdDemandData=null;renderBudgetDemand()" class="bo-btn-primary">🔄 새로고침</button>
      </div>
    </div>

    <!-- 요약 카드 -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      ${[
      { icon: '📋', label: '전체 계획', val: plans.length + '건', color: '#002C5F', bg: '#EFF6FF' },
      { icon: '📊', label: '수요 예산', val: _bdFmt(totalDemand), color: '#0369A1', bg: '#F0F9FF' },
      { icon: '✅', label: '확정 예산', val: _bdFmt(totalConfirmed), color: '#059669', bg: '#F0FDF4' },
      { icon: '⏳', label: '미결 예산', val: _bdFmt(totalPending), color: '#D97706', bg: '#FFFBEB' },
    ].map(c => `
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
          <div style="width:${totalPct}%;height:100%;background:linear-gradient(90deg,#059669,#34D399);border-radius:5px;transition:width .5s"></div>
        </div>
        <span style="font-size:13px;font-weight:900;color:#059669;white-space:nowrap">${totalPct}%</span>
        <span style="font-size:11px;color:#9CA3AF">(${_bdFmt(totalConfirmed)} / ${_bdFmt(totalDemand)})</span>
      </div>
    </div>

    <!-- VOrg 카드 그리드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">
      ${vorgStats.map(vs => {
      const color = vs.vorg.color || '#0369A1';
      const bg = vs.vorg.bg || '#F0F9FF';
      return `
      <div onclick="_bdSelectedVorg='${vs.vorg.id}';renderBudgetDemand()"
           style="background:white;border-radius:16px;border:1.5px solid ${color}25;overflow:hidden;cursor:pointer;transition:all .15s;box-shadow:0 2px 8px rgba(0,0,0,.04)"
           onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)';this.style.borderColor='${color}50'"
           onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';this.style.borderColor='${color}25'">
        <div style="padding:16px 20px;background:${bg}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:15px;font-weight:900;color:${color}">${vs.vorg.name}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px">${vs.count}건 · ${vs.deptCount}개 조직</div>
            </div>
            <div style="font-size:11px;font-weight:900;color:${vs.pct >= 80 ? '#059669' : vs.pct >= 50 ? '#D97706' : '#DC2626'}">${vs.pct}%</div>
          </div>
          <div style="margin-top:8px;height:6px;background:${color}15;border-radius:3px;overflow:hidden">
            <div style="width:${vs.pct}%;height:100%;background:${color};border-radius:3px;transition:width .3s"></div>
          </div>
        </div>
        <div style="padding:12px 20px;display:flex;gap:16px;font-size:11px">
          <span style="color:#0369A1;font-weight:800">수요 ${_bdFmt(vs.demand)}</span>
          <span style="color:#059669;font-weight:800">확정 ${_bdFmt(vs.confirmed)}</span>
          <span style="color:#D97706;font-weight:700">미결 ${_bdFmt(vs.pending)}</span>
          ${vs.rejected > 0 ? `<span style="color:#DC2626;font-weight:700">반려 ${_bdFmt(vs.rejected)}</span>` : ''}
        </div>
      </div>`;
    }).join('')}

      ${unmapped.length > 0 ? `
      <div style="background:#FEF2F2;border-radius:16px;border:1.5px solid #FECACA;overflow:hidden;padding:20px">
        <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">⚠ 미분류</div>
        <div style="font-size:11px;color:#6B7280">${unmapped.length}건 — VOrg 매핑 불가</div>
        <div style="margin-top:8px;font-size:12px;font-weight:800;color:#DC2626">${_bdFmt(unmapped.reduce((s, p) => s + Number(p.amount || 0), 0))}</div>
      </div>` : ''}
    </div>

    ${plans.length === 0 ? `
    <div class="bo-card" style="padding:60px;text-align:center;margin-top:16px">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">${_bdYear}년 교육계획 데이터가 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">프론트오피스에서 교육계획을 수립하면 수요 분석 데이터가 표시됩니다.</div>
    </div>` : ''}
  </div>`;
}

// ─── 2단계: VOrg 상세 (조직별 수요 테이블) ──────────────────────────────────
function _renderBdVorgDetail(el) {
  const vorgTemplates = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const vorg = vorgTemplates.find(v => v.id === _bdSelectedVorg);
  if (!vorg) { _bdSelectedVorg = null; _renderBdOverview(el); return; }

  const plans = _bdFilterYear(_bdDemandData).filter(p => _bdResolveVorgId(p) === _bdSelectedVorg);
  const color = vorg.color || '#0369A1';

  // dept 기준 집계
  const orgMap = {};
  plans.forEach(p => {
    const dept = p.detail?.dept || p.applicant_name || '미분류';
    if (!orgMap[dept]) orgMap[dept] = { name: dept, count: 0, demand: 0, confirmed: 0, pending: 0, rejected: 0, applicants: new Set() };
    orgMap[dept].count++;
    orgMap[dept].demand += Number(p.amount || 0);
    if (['approved', 'completed'].includes(p.status)) orgMap[dept].confirmed += Number(p.amount || 0);
    if (p.status === 'pending') orgMap[dept].pending += Number(p.amount || 0);
    if (p.status === 'rejected') orgMap[dept].rejected += Number(p.amount || 0);
    orgMap[dept].applicants.add(p.applicant_name || '미상');
  });
  const orgs = Object.values(orgMap).sort((a, b) => b.demand - a.demand);

  const totalDemand = orgs.reduce((s, o) => s + o.demand, 0);
  const totalConfirmed = orgs.reduce((s, o) => s + o.confirmed, 0);
  const totalPending = orgs.reduce((s, o) => s + o.pending, 0);
  const totalPct = totalDemand > 0 ? Math.round(totalConfirmed / totalDemand * 100) : 0;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <button onclick="_bdSelectedVorg=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 전체 VOrg
      </button>
      <span style="font-size:11px;color:#9CA3AF">📊 수요분석 › ${vorg.name}</span>
    </div>

    <!-- VOrg 헤더 -->
    <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
      <div style="padding:20px 24px;background:linear-gradient(135deg,${color},${color}CC);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">${vorg.tenantId} · ${vorg.desc || ''}</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${vorg.name}</h2>
        <div style="margin-top:10px;display:flex;gap:24px;font-size:13px">
          <span>계획 <strong>${plans.length}건</strong></span>
          <span>수요 <strong>${_bdFmt(totalDemand)}</strong></span>
          <span>확정 <strong style="color:#86EFAC">${_bdFmt(totalConfirmed)}</strong></span>
          <span>미결 <strong style="color:#FDE68A">${_bdFmt(totalPending)}</strong></span>
        </div>
        <div style="margin-top:10px;height:8px;background:rgba(255,255,255,.2);border-radius:4px;overflow:hidden">
          <div style="width:${totalPct}%;height:100%;background:rgba(255,255,255,.8);border-radius:4px;transition:width .3s"></div>
        </div>
        <div style="margin-top:4px;font-size:11px;opacity:.8">확정률 ${totalPct}%</div>
      </div>
    </div>

    <!-- 조직별 수요 테이블 -->
    ${orgs.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB">
        <span style="font-size:13px;font-weight:900;color:#374151">🏢 조직별 예산 수요 현황</span>
        <span style="font-size:11px;color:#9CA3AF;margin-left:8px">${orgs.length}개 조직</span>
      </div>
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>조직(팀)</th><th style="text-align:center">건수</th><th style="text-align:center">상신자</th>
          <th style="text-align:right">수요 예산</th><th style="text-align:right">확정</th>
          <th style="text-align:right">미결</th><th style="text-align:center">확정률</th>
        </tr></thead>
        <tbody>
          ${orgs.map(o => {
    const pct = o.demand > 0 ? Math.round(o.confirmed / o.demand * 100) : 0;
    const safeName = o.name.replace(/'/g, "\\'");
    return `
          <tr onclick="_bdDrillOrg='${safeName}';renderBudgetDemand()" style="cursor:pointer;transition:background .12s"
              onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
            <td style="font-weight:700">${o.name}</td>
            <td style="text-align:center">${o.count}건</td>
            <td style="text-align:center;font-size:11px;color:#6B7280">${o.applicants.size}명</td>
            <td style="text-align:right;font-weight:800">${_bdFmt(o.demand)}</td>
            <td style="text-align:right;font-weight:800;color:#059669">${_bdFmt(o.confirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(o.pending)}</td>
            <td style="text-align:center">
              <div style="display:flex;align-items:center;gap:6px;justify-content:center">
                <div style="width:50px;height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:${pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626'};border-radius:3px"></div>
                </div>
                <span style="font-size:10px;font-weight:800;color:${pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626'}">${pct}%</span>
              </div>
            </td>
          </tr>`;
  }).join('')}
          <tr style="background:#F9FAFB;font-weight:900;border-top:2px solid #E5E7EB">
            <td>합계</td>
            <td style="text-align:center">${plans.length}건</td>
            <td></td>
            <td style="text-align:right">${_bdFmt(totalDemand)}</td>
            <td style="text-align:right;color:#059669">${_bdFmt(totalConfirmed)}</td>
            <td style="text-align:right;color:#D97706">${_bdFmt(totalPending)}</td>
            <td style="text-align:center;color:${totalPct >= 80 ? '#059669' : totalPct >= 50 ? '#D97706' : '#DC2626'}">${totalPct}%</td>
          </tr>
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700;color:#6B7280">이 VOrg에 해당하는 교육계획이 없습니다</div>
    </div>`}
  </div>`;
}

// ─── 3단계: 조직 드릴다운 (개별 계획 목록) ──────────────────────────────────
function _renderBdOrgDrill(el) {
  const plans = _bdFilterYear(_bdDemandData).filter(p => {
    const dept = p.detail?.dept || p.applicant_name || '미분류';
    return _bdResolveVorgId(p) === _bdSelectedVorg && dept === _bdDrillOrg;
  });
  const statusLabel = { pending: '대기', approved: '승인', rejected: '반려', cancelled: '취소', completed: '완료' };
  const statusColor = { pending: '#D97706', approved: '#059669', rejected: '#DC2626', cancelled: '#9CA3AF', completed: '#059669' };

  const demandSum = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
  const confirmedSum = plans.filter(p => ['approved', 'completed'].includes(p.status)).reduce((s, p) => s + Number(p.amount || 0), 0);

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_bdDrillOrg=null;renderBudgetDemand()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← VOrg 상세로
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;opacity:.7;margin-bottom:4px">📊 조직 상세</div>
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
          <th>계획명</th><th>상신자</th><th>계정</th>
          <th style="text-align:right">금액</th><th>상태</th><th>제출일</th>
        </tr></thead>
        <tbody>${plans.map(p => {
    const st = p.status || 'pending';
    return `
          <tr>
            <td style="font-weight:700">${p.edu_name || '-'}</td>
            <td>${p.applicant_name || '-'}</td>
            <td><code style="font-size:10px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${p.account_code || '-'}</code></td>
            <td style="text-align:right;font-weight:900">${Number(p.amount || 0).toLocaleString()}원</td>
            <td><span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${statusColor[st] || '#6B7280'}15;color:${statusColor[st] || '#6B7280'}">${statusLabel[st] || st}</span></td>
            <td style="font-size:11px;color:#6B7280">${(p.created_at || '').slice(0, 10)}</td>
          </tr>`;
  }).join('')}</tbody>
      </table>` : `
      <div style="padding:40px;text-align:center;color:#9CA3AF">데이터 없음</div>`}
    </div>
  </div>`;
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function _bdFilterYear(data) {
  return (data || []).filter(p => (p.created_at || '').slice(0, 4) === String(_bdYear));
}

function _bdYearSelector() {
  return `<select onchange="_bdYear=Number(this.value);_bdDemandData=null;_bdSelectedVorg=null;_bdDrillOrg=null;renderBudgetDemand()"
    style="padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer">
    ${[_bdYear + 1, _bdYear, _bdYear - 1, _bdYear - 2].map(y =>
    `<option value="${y}" ${_bdYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
  </select>`;
}

function _bdFmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000) return (n / 10000).toFixed(0) + '만원';
  return n.toLocaleString() + '원';
}
