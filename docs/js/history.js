// ─── HISTORY (교육신청 목록) ──────────────────────────────────────────────

function renderHistory() {
  document.getElementById('page-history').innerHTML = `
<div class="max-w-6xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육신청</h1>
      <p class="text-gray-500 text-sm mt-1">신청한 교육 내역을 확인하고 새 신청을 하세요.</p>
    </div>
    <button onclick="navigate('apply')" class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">＋ 교육 신청</button>
  </div>
  <div class="card p-4 flex flex-wrap gap-3">
    <select class="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold bg-white focus:border-accent">
      <option>2026년</option><option>2025년</option>
    </select>
    <select class="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold bg-white focus:border-accent">
      <option>전체 유형</option><option>사외교육</option><option>세미나</option><option>이러닝</option><option>워크샵</option>
    </select>
    <select class="border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold bg-white focus:border-accent">
      <option>전체 상태</option><option>완료</option><option>진행중</option><option>신청중</option>
    </select>
    <div class="flex-1 relative"><input type="text" placeholder="🔍  과정명 검색..." class="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm bg-white focus:border-accent"/></div>
  </div>
  <div class="card overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 border-b border-gray-100">
        <tr class="text-xs font-black text-gray-500 uppercase tracking-wider">
          <th class="px-6 py-4 text-left">과정명</th>
          <th class="px-4 py-4 text-left">유형</th>
          <th class="px-4 py-4 text-left">기간</th>
          <th class="px-4 py-4 text-right">학습시간</th>
          <th class="px-4 py-4 text-right">비용</th>
          <th class="px-4 py-4 text-center">상태</th>
          <th class="px-4 py-4 text-center">관리</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        ${MOCK_HISTORY.filter(h => !h.tenantId || h.tenantId === currentPersona.tenantId).map(h => `
        <tr class="hover:bg-gray-50 transition">
          <td class="px-6 py-4"><div class="font-bold text-gray-900">${h.title}</div><div class="text-[10px] text-gray-400">${h.id}</div></td>
          <td class="px-4 py-4"><span class="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">${h.type}</span></td>
          <td class="px-4 py-4 text-gray-600 text-xs">${h.date}<br/>${h.endDate !== h.date ? '~ ' + h.endDate : ''}</td>
          <td class="px-4 py-4 text-right font-black text-gray-900">${h.hours}H</td>
          <td class="px-4 py-4 text-right font-black text-gray-900">${fmt(h.amount)}원</td>
          <td class="px-4 py-4 text-center">${statusBadge(h.status)}</td>
          <td class="px-4 py-4 text-center">
            <button class="text-xs text-accent font-bold hover:underline">상세</button>
          </td>
        </tr>`).join('')}
      </tbody>
      <tfoot class="bg-blue-50 border-t-2 border-brand">
        <tr>
          <td colspan="3" class="px-6 py-4 text-xs font-black text-gray-500 uppercase">합계 (${MOCK_HISTORY.filter(h => !h.tenantId || h.tenantId === currentPersona.tenantId).length}건)</td>
          <td class="px-4 py-4 text-right font-black text-brand">${MOCK_HISTORY.filter(h => !h.tenantId || h.tenantId === currentPersona.tenantId).reduce((s, h) => s + h.hours, 0)}H</td>
          <td class="px-4 py-4 text-right font-black text-brand">${fmt(MOCK_HISTORY.filter(h => !h.tenantId || h.tenantId === currentPersona.tenantId).reduce((s, h) => s + h.amount, 0))}원</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>`;
}
