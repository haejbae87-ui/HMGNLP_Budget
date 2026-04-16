// ─── BUDGET ────────────────────────────────────────────────────────────────

function renderBudget() {
  const totalBalance = currentPersona.budgets.reduce(
    (s, b) => s + b.balance,
    0,
  );
  const totalUsed = currentPersona.budgets.reduce((s, b) => s + b.used, 0);
  document.getElementById("page-budget").innerHTML = `
<div class="max-w-6xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 예산 관리</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">예산 관리</h1>
  </div>
  <div class="grid grid-cols-3 gap-4">
    ${[
      {
        label: "총 예산",
        v: fmt(totalBalance) + "원",
        c: "text-brand",
        bg: "bg-blue-50",
      },
      {
        label: "집행 금액",
        v: fmt(totalUsed) + "원",
        c: "text-orange-600",
        bg: "bg-orange-50",
      },
      {
        label: "잔여 예산",
        v: fmt(totalBalance - totalUsed) + "원",
        c: "text-green-600",
        bg: "bg-green-50",
      },
    ]
      .map(
        (k) => `<div class="card p-6 ${k.bg} border-0">
      <div class="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${k.label}</div>
      <div class="text-2xl font-black ${k.c}">${k.v}</div>
    </div>`,
      )
      .join("")}
  </div>
  <div class="card p-6">
    <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider mb-5">예산 계정별 현황</h3>
    <div class="space-y-6">
      ${currentPersona.budgets
        .map((b) => {
          const pct = ((b.used / b.balance) * 100).toFixed(1);
          const isRnd = b.account === "연구투자";
          return `<div class="p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <div class="flex items-start justify-between mb-4">
              <div>
                <div class="font-black text-gray-900">${b.name}</div>
                <div class="text-xs font-bold text-gray-400 mt-0.5">${b.account} ${isRnd ? "· R&D 전용" : ""}</div>
              </div>
              <span class="text-xs font-black px-3 py-1 rounded-full ${isRnd ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}">${b.account}</span>
            </div>
            <div class="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div class="h-full rounded-full transition-all ${isRnd ? "bg-orange-400" : "bg-accent"}" style="width:${pct}%"></div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500 font-bold">집행 <span class="text-gray-900">${fmt(b.used)}원</span> (${pct}%)</span>
              <span class="text-gray-500 font-bold">잔액 <span class="font-black ${isRnd ? "text-orange-600" : "text-accent"}">${fmt(b.balance - b.used)}원</span></span>
            </div>
          </div>`;
        })
        .join("")}
    </div>
  </div>
  <div class="card overflow-hidden">
    <div class="p-6 border-b border-gray-100"><h3 class="font-black text-sm text-gray-700 uppercase tracking-wider">집행 내역</h3></div>
    <table class="w-full text-sm">
      <thead class="bg-gray-50"><tr class="text-xs font-black text-gray-500 uppercase">
        <th class="px-6 py-3 text-left">과정명</th><th class="px-4 py-3 text-left">예산 계정</th><th class="px-4 py-3 text-right">금액</th><th class="px-4 py-3 text-left">일자</th><th class="px-4 py-3 text-center">상태</th>
      </tr></thead>
      <tbody class="divide-y divide-gray-50">
        ${MOCK_HISTORY.filter(
          (h) => !h.tenantId || h.tenantId === currentPersona.tenantId,
        )
          .map(
            (h) => `<tr class="hover:bg-gray-50">
          <td class="px-6 py-4 font-bold text-gray-900">${h.title}</td>
          <td class="px-4 py-4"><span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${h.budget}</span></td>
          <td class="px-4 py-4 text-right font-black text-gray-900">${fmt(h.amount)}원</td>
          <td class="px-4 py-4 text-gray-500 text-xs">${h.date}</td>
          <td class="px-4 py-4 text-center">${statusBadge(h.status)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</div>`;
}
