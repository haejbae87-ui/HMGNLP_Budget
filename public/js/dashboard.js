// ─── DASHBOARD ─────────────────────────────────────────────────────────────

function renderDashboard() {
  const totalHours = MOCK_HISTORY.filter(h => h.status === '완료').reduce((s, h) => s + h.hours, 0);
  const totalDone = MOCK_HISTORY.filter(h => h.status === '완료').length;
  const totalSpent = MOCK_HISTORY.reduce((s, h) => s + h.amount, 0);
  const totalBal = currentPersona.budgets.reduce((s, b) => s + b.balance - b.used, 0);
  document.getElementById('page-dashboard').innerHTML = `
<div class="max-w-6xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 대시보드</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">대시보드</h1>
      <p class="text-gray-500 text-sm mt-1">${currentPersona.name}님의 2026년 교육 현황입니다.</p>
    </div>
    <button onclick="navigate('apply')" class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
      <span>＋</span> 교육 신청
    </button>
  </div>

  <!-- KPI Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    ${[
      { label: '총 학습시간', value: totalHours + 'H', sub: '이수 완료 기준', icon: '⏱', color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: '이수 과정 수', value: totalDone + '건', sub: '2026년 기준', icon: '📚', color: 'text-green-600', bg: 'bg-green-50' },
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
        ${currentPersona.budgets.map(b => {
          const pct = Math.min((b.used / b.balance) * 100, 100).toFixed(0);
          return `<div>
              <div class="flex justify-between text-xs font-bold mb-1.5">
                <span class="text-gray-600 truncate pr-2">${b.name}</span>
                <span class="text-gray-900">${pct}%</span>
              </div>
              <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all ${b.account === '연구투자' ? 'bg-orange-400' : 'bg-accent'}" style="width:${pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>집행 ${fmt(b.used)}원</span><span>잔액 ${fmt(b.balance - b.used)}원</span>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Recent History -->
    <div class="card p-6 lg:col-span-2">
      <div class="flex items-center justify-between mb-5">
        <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider">최근 교육이력</h3>
        <button onclick="navigate('history')" class="text-xs font-bold text-accent hover:underline">전체보기 →</button>
      </div>
      <div class="space-y-3">
        ${MOCK_HISTORY.slice(0, 4).map(h => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sm shadow-sm">📘</div>
            <div>
              <div class="text-sm font-bold text-gray-800 leading-tight">${h.title}</div>
              <div class="text-[10px] text-gray-400">${h.date} · ${h.hours}H</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-black text-gray-700">${fmt(h.amount)}원</span>
            ${statusBadge(h.status)}
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;
}
