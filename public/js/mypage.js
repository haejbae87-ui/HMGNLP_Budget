// ?€?€?€ MYPAGE ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

function renderMypage() {
  const _history = MOCK_HISTORY.filter(
    (h) => !h.tenantId || h.tenantId === currentPersona.tenantId,
  );
  const totalH = _history.reduce((s, h) => s + h.hours, 0);
  const doneCount = _history.filter((h) => h.status === "?„ë£Œ").length;
  document.getElementById("page-mypage").innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??ë§ˆì´?˜ì´ì§€</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">ë§ˆì´?˜ì´ì§€</h1>
  </div>
  <div class="card p-8 flex items-center gap-8 bg-gradient-to-r from-brand to-blue-700 text-white border-0">
    <div class="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center font-black text-4xl">${currentPersona.name[0]}</div>
    <div class="flex-1">
      <div class="text-2xl font-black tracking-tight">${currentPersona.name} <span class="text-white/60 font-normal text-base">/ ${currentPersona.pos}</span></div>
      <div class="text-white/70 text-sm mt-1">${currentPersona.dept} Â· ${currentPersona.company}</div>
      <div class="text-xs font-black bg-white/20 px-3 py-1 rounded-full inline-block mt-2 tracking-wider">${currentPersona.typeLabel}</div>
    </div>
    <div class="text-right">
      <div class="text-xs text-white/60 uppercase tracking-widest">?¬ë²ˆ</div>
      <div class="text-lg font-black">${currentPersona.id}</div>
    </div>
  </div>
  <div class="grid grid-cols-3 gap-4">
    ${[
      { label: "ì´??™ìŠµ?œê°„", v: totalH + "H", icon: "?? },
      { label: "?´ìˆ˜ ê³¼ì •", v: doneCount + "ê±?, icon: "?“" },
      {
        label: "ì§„í–‰ì¤?ê³¼ì •",
        v: _history.filter((h) => h.status === "ì§„í–‰ì¤?).length + "ê±?,
        icon: "?“š",
      },
    ]
      .map(
        (k) => `<div class="card p-6 text-center">
      <div class="text-3xl mb-2">${k.icon}</div>
      <div class="text-2xl font-black text-brand">${k.v}</div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">${k.label}</div>
    </div>`,
      )
      .join("")}
  </div>
  <div class="card p-6">
    <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider mb-4">?˜ë£Œ ?´ë ¥</h3>
    <div class="space-y-3">
      ${_history
        .filter((h) => h.status === "?„ë£Œ")
        .map(
          (h) => `
      <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <div class="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center font-black">??/div>
        <div class="flex-1"><div class="font-bold text-gray-900 text-sm">${h.title}</div><div class="text-xs text-gray-400">${h.date} Â· ${h.hours}H</div></div>
        <div class="text-sm font-black text-gray-500">${fmt(h.amount)}??/div>
      </div>`,
        )
        .join("")}
    </div>
  </div>
</div>`;
}
