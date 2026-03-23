// ─── GNB (Top Navigation) — LXP 프론트 오피스 ────────────────────────────────

function renderGNB() {
  const topMenus = [
    { id: 'dashboard', label: '통합교육이력관리' },
    { id: 'plans', label: '교육계획' },
    { id: 'history', label: '교육신청' },
    { id: 'fo-manual', label: '📖 서비스 매뉴얼' },
  ];

  // 테넌트별 페르소나 그룹
  const LXP_GROUPS = [
    { label: 'HMC', color: '#002C5F', keys: ['hmc_team_mgr', 'hmc_learner'] },
    { label: 'KIA', color: '#059669', keys: ['kia_learner'] },
    { label: 'HAE', color: '#7C3AED', keys: ['hae_learner', 'hae_learner2'] },
  ];

  const switcherGroups = LXP_GROUPS.map(g => {
    const btns = g.keys.map(key => {
      const p = PERSONAS[key];
      if (!p) return '';
      const isActive = currentPersona === p;
      return `<button onclick="switchPersonaTo('${key}')"
        title="${p.company} ${p.dept} ${p.name}"
        style="border:1.5px solid ${isActive ? g.color : '#ffffff30'};background:${isActive ? 'rgba(255,255,255,0.2)' : 'transparent'};color:#fff;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:${isActive ? 900 : 500};cursor:pointer;transition:all .15s">
        ${isActive ? '● ' : ''}${p.name}
      </button>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:3px">
      <span style="font-size:9px;font-weight:900;color:${g.color};background:rgba(255,255,255,0.9);border-radius:3px;padding:1px 4px">${g.label}</span>
      ${btns}
    </div>`;
  }).join('<div style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 4px"></div>');

  document.getElementById('gnb').innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:56px">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="navigate('dashboard')">
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:6px">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
        </svg>
      </div>
      <span style="font-weight:900;font-size:16px;letter-spacing:-.02em">Next Learning</span>
    </div>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2)"></div>
    <nav style="display:flex;height:56px">
      ${topMenus.map(m => `
        <div onclick="navigate('${m.id}')" style="display:flex;align-items:center;padding:0 14px;font-size:13px;font-weight:600;cursor:pointer;border-bottom:2.5px solid ${currentPage === m.id ? '#ffffff' : 'transparent'};color:${currentPage === m.id ? '#ffffff' : 'rgba(255,255,255,0.7)'};transition:all .15s;white-space:nowrap">
          ${m.label}
        </div>`).join('')}
    </nav>
  </div>

  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
    <!-- 페르소나 전환 -->
    <span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:700;white-space:nowrap">접속자:</span>
    <div style="display:flex;align-items:center;gap:4px">${switcherGroups}</div>

    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 4px"></div>

    <!-- 백오피스 이동 버튼 (총괄 담당자 역할이 아니므로 참조용) -->
    <a href="backoffice.html"
      style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);color:#fff;text-decoration:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap"
      onmouseover="this.style.background='rgba(255,255,255,0.25)'"
      onmouseout="this.style.background='rgba(255,255,255,0.12)'"
      title="백오피스 관리자 화면으로 이동">
      ⚙️ 백오피스
    </a>
  </div>
</div>`;
}

// 페르소나 전환 함수 (LXP 전용)
function switchPersonaTo(key) {
  if (PERSONAS[key]) {
    currentPersona = PERSONAS[key];
    applyState = resetApplyState();
    renderGNB();
    renderFloatingBudget();
    navigate(currentPage);
  }
}

// 레거시 switchPersona 호환 유지
function switchPersona() {
  const keys = Object.keys(PERSONAS);
  const idx = keys.indexOf(Object.keys(PERSONAS).find(k => PERSONAS[k] === currentPersona));
  const next = PERSONAS[keys[(idx + 1) % keys.length]];
  currentPersona = next;
  applyState = resetApplyState();
  renderGNB();
  renderFloatingBudget();
  navigate(currentPage);
}

// ─── FLOATING BUDGET WIDGET ─────────────────────────────────────────────────

function renderFloatingBudget() {
  const totalUsed = currentPersona.budgets.reduce((s, b) => s + b.used, 0);
  const totalBalance = currentPersona.budgets.reduce((s, b) => s + b.balance, 0);
  const pct = Math.min((totalUsed / totalBalance) * 100, 100).toFixed(0);
  document.getElementById('floating-budget').innerHTML = `
<div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
  <span class="w-2 h-2 bg-accent rounded-full inline-block"></span> 내 예산 잔액
</div>
<div class="text-2xl font-black text-brand mb-2">${fmt(totalBalance - totalUsed)}<span class="text-sm text-gray-400 font-normal ml-1">원</span></div>
<div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
  <div class="h-full bg-accent rounded-full transition-all" style="width:${pct}%"></div>
</div>
<div class="text-[10px] text-gray-400 mb-3">${fmt(totalUsed)}원 집행 / ${fmt(totalBalance)}원 총 예산</div>
<div class="space-y-1.5 pt-2 border-t border-gray-100">
  ${currentPersona.budgets.map(b => `
  <div class="flex justify-between text-[11px]">
    <span class="text-gray-500 truncate mr-2">${b.name}</span>
    <span class="font-black ${b.account === '연구투자' ? 'text-orange-500' : 'text-accent'}">${fmt(b.balance - b.used)}원</span>
  </div>`).join('')}
</div>`;
}
