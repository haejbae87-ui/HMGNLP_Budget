// ─── DASHBOARD ─────────────────────────────────────────────────────────────
// DB 연동 버전: applications + plans 테이블에서 실데이터 로드
// budget 잔액은 currentPersona.budgets 사용 (별도 budgets 테이블 없음)

let _dashDbLoaded = false;
let _dashDbApps = [];    // applications rows
let _dashDbPlans = [];   // plans rows

async function renderDashboard() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  const pid = currentPersona?.id;
  const tid = currentPersona?.tenantId;

  // DB 데이터 최초 1회 로드
  if (sb && !_dashDbLoaded) {
    _dashDbLoaded = true;
    // 로딩 중 placeholder 렌더링
    document.getElementById('page-dashboard').innerHTML = _dashLoadingHtml();
    try {
      const [appsRes, plansRes] = await Promise.all([
        sb.from('applications').select('id,edu_name,edu_type,amount,status,created_at,detail')
          .eq('applicant_id', pid).eq('tenant_id', tid)
          .order('created_at', { ascending: false }).limit(20),
        sb.from('plans').select('id,edu_name,amount,status,account_code,created_at')
          .eq('applicant_id', pid).eq('tenant_id', tid)
          .order('created_at', { ascending: false }).limit(50),
      ]);
      _dashDbApps = appsRes.data || [];
      _dashDbPlans = plansRes.data || [];
    } catch (e) {
      console.error('[Dashboard DB] 로드 실패:', e.message);
    }
    _renderDashboardHtml();
    return;
  }

  _renderDashboardHtml();
}

function _resetDashboard() {
  _dashDbLoaded = false;
  _dashDbApps = [];
  _dashDbPlans = [];
}

function _dashLoadingHtml() {
  return `<div style="display:flex;align-items:center;justify-content:center;height:300px;flex-direction:column;gap:12px">
    <div style="font-size:32px">⏳</div>
    <div style="font-size:14px;font-weight:700;color:#6B7280">대시보드 로딩 중...</div>
  </div>`;
}

function _renderDashboardHtml() {
  const sb = typeof getSB === 'function' ? getSB() : null;

  // ── KPI 계산 (DB 데이터 우선, 없으면 0) ──
  const apps = _dashDbApps;
  const plans = _dashDbPlans;
  const allItems = apps.length > 0 ? apps : [];

  const completedApps = apps.filter(a => ['approved', 'completed'].includes(a.status));
  const totalHours = completedApps.reduce((s, a) => s + Number(a.detail?.hours || 0), 0);
  const totalDone = completedApps.length;
  const totalSpent = completedApps.reduce((s, a) => s + Number(a.amount || 0), 0);

  // 예산 잔액: currentPersona.budgets (하드코딩 마스터 데이터)
  const totalBal = (currentPersona?.budgets || []).reduce((s, b) => s + (b.balance - b.used), 0);

  // ── 최근이력 표시용 (apps 우선, 없으면 안내 메시지) ──
  const recentItems = apps.slice(0, 4);

  // ── 예산 집행 현황 (persona budgets) ──
  const budgets = currentPersona?.budgets || [];

  // 진행 중 계획/신청 수 (상태 뱃지용)
  const pendingCount = [
    ...apps.filter(a => a.status === 'pending'),
    ...plans.filter(p => p.status === 'pending'),
  ].length;

  const statusLabel = { approved: '완료', completed: '완료', pending: '신청중', rejected: '반려', cancelled: '취소', draft: '작성중' };
  const statusColor = { approved: '#059669', completed: '#059669', pending: '#D97706', rejected: '#DC2626', cancelled: '#9CA3AF', draft: '#0369A1' };

  document.getElementById('page-dashboard').innerHTML = `
<div class="max-w-6xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 대시보드</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">대시보드</h1>
      <p class="text-gray-500 text-sm mt-1">${currentPersona.name}님의 ${new Date().getFullYear()}년 교육 현황입니다.</p>
    </div>
    <button onclick="navigate('apply')" class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
      <span>＋</span> 교육 신청
    </button>
  </div>

  <!-- KPI Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    ${[
      { label: '총 학습시간', value: totalHours + 'H', sub: '이수 완료 기준', icon: '⏱', color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: '이수 과정 수', value: totalDone + '건', sub: new Date().getFullYear() + '년 기준', icon: '📚', color: 'text-green-600', bg: 'bg-green-50' },
      { label: '예산 잔액', value: fmt(totalBal) + '원', sub: '집행 가능 잔액', icon: '💳', color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: '집행 금액', value: fmt(totalSpent) + '원', sub: '당해 연도 집행', icon: '📊', color: 'text-orange-600', bg: 'bg-orange-50' },
    ].map(k => `
  <div class="card p-5 hover:shadow-md transition">
    <div class="flex items-start justify-between mb-3">
      <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">${k.label}</div>
      <div class="${k.bg} ${k.color} text-lg w-9 h-9 rounded-xl flex items-center justify-center">${k.icon}</div>
    </div>
    <div class="text-2xl font-black text-gray-900 tracking-tight">${k.value}</div>
    <div class="text-xs text-gray-400 mt-1">${k.sub}</div>
  </div>`).join('')}
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Budget Chart -->
    <div class="card p-6 lg:col-span-1">
      <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider mb-5">예산 집행 현황</h3>
      <div class="space-y-4">
        ${budgets.length > 0 ? budgets.map(b => {
      const pct = Math.min(((b.used || 0) / (b.balance || 1)) * 100, 100).toFixed(0);
      return `<div>
              <div class="flex justify-between text-xs font-bold mb-1.5">
                <span class="text-gray-600 truncate pr-2">${b.name}</span>
                <span class="text-gray-900">${pct}%</span>
              </div>
              <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all ${b.account === '연구투자' ? 'bg-orange-400' : 'bg-accent'}" style="width:${pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>집행 ${fmt(b.used || 0)}원</span><span>잔액 ${fmt((b.balance || 0) - (b.used || 0))}원</span>
              </div>
            </div>`;
    }).join('') : '<div class="text-xs text-gray-400 text-center py-4">배정된 예산이 없습니다</div>'}
      </div>
    </div>

    <!-- Recent Applications -->
    <div class="card p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider">최근 교육신청 현황</h3>
        <button onclick="navigate('apply')" class="text-xs font-bold text-accent hover:underline">전체보기 →</button>
      </div>
      <div class="space-y-3">
        ${recentItems.length > 0 ? recentItems.map(a => {
      const st = a.status || 'pending';
      const stLabel = statusLabel[st] || st;
      const stColor = statusColor[st] || '#9CA3AF';
      const dateStr = a.created_at ? a.created_at.slice(0, 10) : '-';
      const hrs = a.detail?.hours;
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm shadow-sm">📘</div>
            <div>
              <div class="text-sm font-bold text-gray-800 leading-tight">${a.edu_name || '-'}</div>
              <div class="text-[10px] text-gray-400">${dateStr}${hrs ? ' · ' + hrs + 'H' : ''}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-gray-700">${fmt(Number(a.amount || 0))}원</span>
            <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${stColor}15;color:${stColor}">${stLabel}</span>
          </div>
        </div>`;
    }).join('') : `
        <div style="text-align:center;padding:32px;color:#9CA3AF">
          <div style="font-size:28px;margin-bottom:8px">📭</div>
          <div style="font-size:13px;font-weight:700">신청 내역이 없습니다</div>
          <div style="font-size:11px;margin-top:4px">교육을 신청하면 여기에 표시됩니다</div>
        </div>`}
      </div>
    </div>
  </div>
</div>`;
}
