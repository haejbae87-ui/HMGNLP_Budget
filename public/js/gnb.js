// ─── GNB (Top Navigation) — LXP 프론트 오피스 ────────────────────────────────

// 드롭다운 열림 상태
let _gnbDropdownOpen = null;
let _gnbListenerAttached = false;

// 외부 클릭 시 드롭다운 닫기 (최초 1회만 등록)
function initGNBListener() {
  if (_gnbListenerAttached) return;
  _gnbListenerAttached = true;
  document.addEventListener('click', function(e) {
    if (_gnbDropdownOpen && !e.target.closest('#gnb')) {
      _gnbDropdownOpen = null;
      renderGNB();
    }
  });
}

function renderGNB() {
  // 1depth 메뉴 정의: dropdown 포함 구조
  const topMenus = [
    {
      id: 'growth',
      label: '성장',
      dropdown: [
        // ── 기능 활성화된 메뉴
        { id: 'plans',   label: '교육계획', icon: '📊', navigate: true,
          desc: '교육계획 수립 및 R&D 계획 관리' },
        { id: 'apply',   label: '교육신청', icon: '📝', navigate: true,
          desc: '개인직무·운영교육 신청' },
        // ── 구분선
        { divider: true },
        // ── 기획 예정 메뉴 (비활성)
        { id: 'history-register', label: '교육이력등록', icon: '📚', navigate: false,
          desc: '수료·이수 이력 직접 등록', soon: true },
        { id: 'language-score',  label: '어학점수',    icon: '🌐', navigate: false,
          desc: 'TOEIC·OPIC 등 어학점수 관리', soon: true },
        { id: 'certificate',     label: '자격증',      icon: '🏅', navigate: false,
          desc: '자격증·면허 취득 이력 관리', soon: true },
      ],
    },
    { id: 'fo-manual', label: '📖 매뉴얼', dropdown: null },
  ];

  // 테넌트별 페르소나 그룹
  const LXP_GROUPS = [
    { label: 'HMC', color: '#002C5F', keys: ['hmc_team_mgr', 'hmc_learner'] },
    { label: 'KIA', color: '#059669', keys: ['kia_learner'] },
    { label: 'HAE', color: '#7C3AED', keys: ['hae_learner', 'hae_learner2'] },
    { label: 'HSC', color: '#BE123C', keys: ['hsc_learner'] },
  ];

  const switcherGroups = LXP_GROUPS.map(g => {
    const btns = g.keys.map(key => {
      const p = PERSONAS[key];
      if (!p) return '';
      const isActive = currentPersona === p;
      const jobBadge = p.jobType
        ? `<span style="font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;background:${isActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'};color:rgba(255,255,255,0.85)">${p.jobType}</span>`
        : '';
      return `<button onclick="switchPersonaTo('${key}')"
        title="${p.company} ${p.dept} ${p.name} (${p.jobType || p.role})"
        style="display:flex;align-items:center;gap:4px;border:1.5px solid ${isActive ? g.color : '#ffffff30'};background:${isActive ? 'rgba(255,255,255,0.2)' : 'transparent'};color:#fff;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:${isActive ? 900 : 500};cursor:pointer;transition:all .15s">
        ${isActive ? '<span style="font-size:8px">●</span>' : ''}
        <span>${p.name}</span>
        ${jobBadge}
      </button>`;
    }).join('');
    return `<div style="display:flex;align-items:center;gap:3px">
      <span style="font-size:9px;font-weight:900;color:${g.color};background:rgba(255,255,255,0.9);border-radius:3px;padding:1px 4px">${g.label}</span>
      ${btns}
    </div>`;
  }).join('<div style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 4px"></div>');

  // 1depth 활성 메뉴 판별 (드롭다운 자식 포함)
  function isMenuActive(menu) {
    if (!menu.dropdown) return currentPage === menu.id;
    return menu.dropdown.some(d => d.id && d.navigate && currentPage === d.id);
  }

  // 네비 HTML 생성
  const navHtml = topMenus.map(m => {
    if (!m.dropdown) {
      // 단순 메뉴
      const active = currentPage === m.id;
      return `<div onclick="navigate('${m.id}');_gnbDropdownOpen=null;renderGNB()"
        style="display:flex;align-items:center;padding:0 14px;height:56px;font-size:13px;font-weight:600;cursor:pointer;
               border-bottom:2.5px solid ${active ? '#fff' : 'transparent'};
               color:${active ? '#fff' : 'rgba(255,255,255,0.7)'};transition:all .15s;white-space:nowrap">
        ${m.label}
      </div>`;
    }

    // 드롭다운 메뉴
    const active = isMenuActive(m);
    const isOpen = _gnbDropdownOpen === m.id;

    const dropdownItems = m.dropdown.map(d => {
      if (d.divider) return `<div style="height:1px;background:#F3F4F6;margin:6px 0"></div>`;
      const isCurrent = d.navigate && currentPage === d.id;
      if (!d.navigate) {
        // 미기획 항목 — 비활성 표시
        return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;opacity:0.5;cursor:default">
          <span style="font-size:18px;flex-shrink:0;margin-top:1px">${d.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#9CA3AF;display:flex;align-items:center;gap:6px">
              ${d.label}
              <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:#F3F4F6;color:#9CA3AF">준비 중</span>
            </div>
            <div style="font-size:11px;color:#D1D5DB;margin-top:1px">${d.desc}</div>
          </div>
        </div>`;
      }
      return `<div onclick="navigate('${d.id}');_gnbDropdownOpen=null;renderGNB()"
        style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;
               background:${isCurrent ? '#EFF6FF' : 'transparent'};transition:all .12s"
        onmouseover="this.style.background='${isCurrent ? '#DBEAFE' : '#F9FAFB'}'"
        onmouseout="this.style.background='${isCurrent ? '#EFF6FF' : 'transparent'}'">
        <span style="font-size:18px;flex-shrink:0;margin-top:1px">${d.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:${isCurrent ? 900 : 700};color:${isCurrent ? '#1D4ED8' : '#111827'}">${d.label}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:1px">${d.desc}</div>
        </div>
      </div>`;
    }).join('');

    return `<div style="position:relative;display:flex;align-items:center">
      <div
        style="display:flex;align-items:center;gap:5px;padding:0 14px;height:56px;font-size:13px;font-weight:700;cursor:pointer;
               border-bottom:2.5px solid ${active || isOpen ? '#fff' : 'transparent'};
               color:${active || isOpen ? '#fff' : 'rgba(255,255,255,0.7)'};transition:all .15s;white-space:nowrap;user-select:none"
        onclick="event.stopPropagation();_gnbDropdownOpen=_gnbDropdownOpen==='${m.id}'?null:'${m.id}';renderGNB()">
        ${m.label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="transition:transform .2s;transform:${isOpen ? 'rotate(180deg)' : 'rotate(0)'}">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${isOpen ? `
      <div style="position:absolute;top:56px;left:0;min-width:260px;background:white;border-radius:14px;
                  box-shadow:0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.08);
                  border:1px solid #E5E7EB;padding:8px;z-index:1000">
        ${dropdownItems}
      </div>` : ''}
    </div>`;
  }).join('');

  initGNBListener();
  document.getElementById('gnb').innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:56px">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="navigate('dashboard');_gnbDropdownOpen=null;renderGNB()">
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:6px">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
        </svg>
      </div>
      <span style="font-weight:900;font-size:16px;letter-spacing:-.02em">Next Learning</span>
    </div>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2)"></div>
    <nav style="display:flex;height:56px;align-items:center">
      ${navHtml}
    </nav>
  </div>

  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
    <!-- 페르소나 전환 -->
    <span style="font-size:10px;color:rgba(255,255,255,0.6);font-weight:700;white-space:nowrap">접속자:</span>
    <div style="display:flex;align-items:center;gap:4px">${switcherGroups}</div>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 4px"></div>
    <!-- 백오피스 이동 버튼 -->
    <a href="backoffice.html"
      style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);color:#fff;text-decoration:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap"
      onmouseover="this.style.background='rgba(255,255,255,0.25)'"
      onmouseout="this.style.background='rgba(255,255,255,0.12)'"
      title="백오피스 관리자 화면으로 이동">
      ⚙️ 백오피스
    </a>
  </div>
</div>

`;
}

// 페르소나 전환 함수 (LXP 전용)
function switchPersonaTo(key) {
  if (PERSONAS[key]) {
    sessionStorage.setItem('currentPersona', key);
    window.location.reload();
  }
}

// 레거시 switchPersona 호환 유지
function switchPersona() {
  const keys = Object.keys(PERSONAS);
  const currentKey = Object.keys(PERSONAS).find(k => PERSONAS[k] === currentPersona) || keys[0];
  const idx = keys.indexOf(currentKey);
  const nextKey = keys[(idx + 1) % keys.length];
  sessionStorage.setItem('currentPersona', nextKey);
  window.location.reload();
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
