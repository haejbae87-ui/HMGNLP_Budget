// ─── BACK-OFFICE LAYOUT: SIDEBAR + HEADER ────────────────────────────────────

// Platform Admin 전용 메뉴
const PLATFORM_MENUS = [
  { id: 'dashboard',         icon: '📊', label: '대시보드',              section: null },
  { id: 'platform-monitor',  icon: '🖥️',  label: '전사 예산 모니터링',    section: '플랫폼 총괄' },
  { id: 'platform-roles',    icon: '🔐', label: '관리자 권한 매핑',       section: null },
  { id: 'reports',           icon: '📈', label: '통계 및 리포트',        section: '분석' },
  { id: 'manual',            icon: '📖', label: '서비스 매뉴얼',          section: null },
];

// Tenant Admin 메뉴 (테넌트 총괄 전용)
const TENANT_ADMIN_MENUS = [
  { id: 'dashboard',        icon: '📊', label: '대시보드',              section: null },
  { id: 'isolation-groups', icon: '🛡️',  label: '격리 그룹 관리',        section: '테넌트 관리' },
  { id: 'reports',          icon: '📈', label: '전사 통계 리포트',        section: '분석' },
  { id: 'manual',           icon: '📖', label: '서비스 매뉴얼',          section: null },
];

// 예산 총괄 메뉴 (Budget Global Admin)
const BUDGET_ADMIN_MENUS = [
  { id: 'dashboard',        icon: '📊', label: '대시보드',              section: null },
  { id: 'isolation-groups', icon: '🛡️',  label: '겍리 그룹 관리',        section: '그룹 설정' },
  { id: 'budget-account',   icon: '💳', label: '예산 계정 관리',          section: '예산·설정' },
  { id: 'virtual-org',      icon: '🏢', label: '가상조직 템플릿 관리',   section: null },
  { id: 'form-builder',     icon: '📝', label: '교육 양식 & 학습유형',    section: null },
  { id: 'calc-grounds',     icon: '📐', label: '세부산출근거 관리',       section: null },
  { id: 'approval-routing', icon: '📊', label: '계정별 결재라인 설정',    section: null },
  { id: 'service-policy',   icon: '🔧', label: '서비스 정책 관리',        section: null },
  { id: 'plan-mgmt',        icon: '📋', label: '교육계획 관리',           section: '운영 메뉴' },
  { id: 'allocation',       icon: '💰', label: '예산 배정 및 관리',       section: null },
  { id: 'my-operations',   icon: '📥', label: '나의 운영 업무',           section: null },
  { id: 'reports',          icon: '📈', label: '통계 및 리포트',          section: '분석' },
  { id: 'manual',           icon: '📖', label: '서비스 매뉴얼',           section: null },
];

// 예산 운영 메뉴 (Budget Operation Manager)
const BUDGET_OP_MENUS = [
  { id: 'dashboard',        icon: '📊', label: '대시보드',              section: null },
  { id: 'my-operations',   icon: '📥', label: '나의 운영 업무',           section: '운영 업무' },
  { id: 'org-budget',       icon: '💰', label: '조직 예산 현황',          section: null },
  { id: 'reports',          icon: '📈', label: '통계 및 리포트',          section: '분석' },
];

// 겸임용 통합 메뉴 (Tenant Admin + Budget Admin 겸임)
const TENANT_DUAL_MENUS = [
  { id: 'dashboard',        icon: '📊', label: '대시보드',              section: null },
  { id: 'isolation-groups', icon: '🛡️',  label: '격리 그룹 관리',        section: '테넌트 관리' },
  { id: 'budget-account',   icon: '💳', label: '예산 계정 관리',          section: '예산·설정' },
  { id: 'virtual-org',      icon: '🏢', label: '가상조직 템플릿 관리',   section: null },
  { id: 'form-builder',     icon: '📝', label: '교육 양식 & 학습유형',    section: null },
  { id: 'calc-grounds',     icon: '📐', label: '세부산출근거 관리',       section: null },
  { id: 'approval-routing', icon: '📊', label: '계정별 결재라인 설정',    section: null },
  { id: 'service-policy',   icon: '🔧', label: '서비스 정책 관리',        section: null },
  { id: 'plan-mgmt',        icon: '📋', label: '교육계획 관리',           section: '운영 메뉴' },
  { id: 'allocation',       icon: '💰', label: '예산 배정 및 관리',       section: null },
  { id: 'my-operations',   icon: '📥', label: '나의 운영 업무',           section: null },
  { id: 'reports',          icon: '📈', label: '통계 및 리포트',          section: '분석' },
  { id: 'manual',           icon: '📖', label: '서비스 매뉴얼',           section: null },
];

// 레거시 호환용 (platform_admin 이외 기존 flow 지원)
const TENANT_MENUS = BUDGET_ADMIN_MENUS;

// PENDING_COUNTS는 동적으로 계산 (renderBoSidebar에서 호출)
function _getPendingCounts() {
  const p = boCurrentPersona;
  const myOps = typeof getPendingCountForPersona==='function' ? getPendingCountForPersona(p) : 3;
  return { 'plan-mgmt': MOCK_BO_PLANS?.filter(x=>x.status.startsWith('pending')).length||2, 'my-operations': myOps };
}

function _getMenus(persona) {
  if (persona.role === 'platform_admin')      return PLATFORM_MENUS;
  if (persona.role === 'tenant_global_admin' && persona.dualRole === 'budget_global_admin')
                                              return TENANT_DUAL_MENUS;  // 겸임
  if (persona.role === 'tenant_global_admin') return TENANT_ADMIN_MENUS;
  if (persona.role === 'budget_global_admin') return BUDGET_ADMIN_MENUS;
  if (persona.role === 'budget_op_manager')   return BUDGET_OP_MENUS;
  return TENANT_MENUS; // 레거시 fallback
}

function renderBoLayout() { renderBoSidebar(); renderBoHeader(); }

function renderBoSidebar() {
  const persona = boCurrentPersona;
  const menus = _getMenus(persona);
  const isPlatform = persona.role === 'platform_admin';
  let lastSection = null;
  let menuHtml = '';

  menus.forEach(m => {
    const hasAccess = persona.accessMenus.includes(m.id);
    if (m.section && m.section !== lastSection) {
      menuHtml += `<div class="bo-nav-label" style="margin-top:8px">${m.section}</div>`;
      lastSection = m.section;
    }
    const _pending = _getPendingCounts();
    const badge = _pending[m.id] ? `<span class="bo-nav-badge">${_pending[m.id]}</span>` : '';
    menuHtml += `
    <div class="bo-nav-item ${boCurrentMenu===m.id?'active':''} ${!hasAccess?'disabled':''}"
         onclick="boNavigate('${m.id}')">
      <span class="bo-nav-icon">${m.icon}</span>
      <span>${m.label}</span>
      ${badge}
    </div>`;
  });

  // Platform 배지 표시
  const platformBanner = isPlatform ? `
  <div style="margin:0 12px 12px;padding:8px 10px;background:rgba(251,191,36,.12);
              border:1px solid rgba(251,191,36,.3);border-radius:8px">
    <div style="font-size:9px;font-weight:900;color:#F59E0B;letter-spacing:.06em;text-transform:uppercase">SYSTEM ADMIN</div>
    <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">플랫폼 글로벌 설정</div>
  </div>` : `
  <div style="margin:0 12px 12px;padding:8px 10px;background:rgba(255,255,255,.06);border-radius:8px">
    <div style="font-size:9px;font-weight:900;color:rgba(255,255,255,.4);letter-spacing:.06em;text-transform:uppercase">TENANT ADMIN</div>
    <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">${persona.tenantId ? TENANTS.find(t=>t.id===persona.tenantId)?.name||'' : ''}</div>
  </div>`;

  document.getElementById('bo-sidebar').innerHTML = `
<div class="bo-logo">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:5px 7px;font-size:14px">🏢</div>
    <div>
      <div class="bo-logo-title">Next Learning</div>
      <div class="bo-logo-sub">Back Office</div>
    </div>
  </div>
</div>
${platformBanner}
<div class="bo-nav-section" style="flex:1">${menuHtml}</div>
<div style="padding:14px 16px;border-top:1px solid rgba(255,255,255,0.08)">
  <a href="index.html" style="display:flex;align-items:center;gap:8px;color:rgba(255,255,255,0.45);font-size:12px;font-weight:700;text-decoration:none">
    <span>←</span> 프론트로 이동
  </a>
</div>`;
}

function renderBoHeader() {
  const persona = boCurrentPersona;
  const menus = _getMenus(persona);
  const menuLabel = menus.find(m => m.id === boCurrentMenu)?.label || '';

  // 테넌트별 그룹 구성
  const TENANT_GROUPS = [
    { label: 'SYSTEM', tenantId: null,  color: '#F59E0B', keys: ['platform_admin'] },
    { label: 'HMC',    tenantId: 'HMC', color: '#002C5F', keys: ['hmc_tenant_admin','hmc_total_general','hmc_hq_general','hmc_total_rnd','hmc_center_rnd'] },
    { label: 'KIA',    tenantId: 'KIA', color: '#059669', keys: ['kia_total_general','kia_hq_general'] },
    { label: 'HAE',    tenantId: 'HAE', color: '#7C3AED', keys: ['hae_total','hae_dept'] },
  ];

  const switcherGroups = TENANT_GROUPS.map(g => {
    const btns = g.keys.map(key => {
      const p = BO_PERSONAS[key];
      if (!p) return '';
      const isActive = boCurrentPersona === p;
      return `<button onclick="boSwitchPersona('${key}')"
        class="bo-btn-secondary bo-btn-sm ${isActive ? 'active' : ''}"
        title="${p.dept} ${p.name} (${p.roleLabel})"
        style="${isActive ? `border-color:${g.color};color:${g.color};font-weight:900;` : 'border-color:#E5E7EB;'}">
        <span class="role-tag ${p.roleClass}" style="margin-right:3px">${p.roleTag}</span>${p.name}
      </button>`;
    }).join('');
    return `
    <div style="display:flex;align-items:center;gap:4px">
      <span style="font-size:9px;font-weight:900;color:${g.color};white-space:nowrap;letter-spacing:.04em;padding:2px 5px;background:${g.color}18;border-radius:4px">${g.label}</span>
      ${btns}
    </div>`;
  }).join('<div style="width:1px;height:24px;background:#E5E7EB;margin:0 4px;flex-shrink:0"></div>');

  document.getElementById('bo-header').innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 16px">
  <div style="display:flex;align-items:center;gap:10px">
    <!-- LXP 이동 버튼 -->
    <a href="index.html"
      style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,#002C5F,#0050A8);color:#fff;text-decoration:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;border:1.5px solid #0050A8;white-space:nowrap;transition:all .15s"
      onmouseover="this.style.opacity='.8'"
      onmouseout="this.style.opacity='1'"
      title="LXP 학습자 화면(프론트 오피스)으로 이동">
      🎓 LXP 프론트
    </a>
    <div style="font-size:11px;color:#9CA3AF;font-weight:700;border-left:1px solid #E5E7EB;padding-left:10px">백오피스 / ${menuLabel}</div>
  </div>
  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span style="font-size:10px;font-weight:700;color:#9CA3AF;white-space:nowrap">접속자 전환:</span>
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${switcherGroups}</div>
  </div>
</div>`;
}

function boNavigate(menuId) {
  if (!boCurrentPersona.accessMenus.includes(menuId)) return;
  boCurrentMenu = menuId;
  renderBoSidebar();
  renderBoHeader();
  document.getElementById('bo-content').innerHTML = '';

  if (menuId === 'dashboard')        renderBoDashboard();
  if (menuId === 'platform-monitor') renderPlatformMonitor();
  if (menuId === 'platform-roles')   renderPlatformRoles();
  // 예산·양식 설정 5개 독립 메뉴
  if (menuId === 'budget-account')   renderBudgetAccount();
  if (menuId === 'virtual-org')      renderVirtualOrg();
  if (menuId === 'form-builder')     renderFormBuilderMenu();
  if (menuId === 'calc-grounds')     renderCalcGrounds();
  if (menuId === 'approval-routing') renderApprovalRouting();
  if (menuId === 'service-policy')   renderServicePolicy();
  // 운영 메뉴
  if (menuId === 'plan-mgmt')        renderBoPlanMgmt();
  if (menuId === 'allocation')       renderBoAllocation();
  if (menuId === 'my-operations')    renderMyOperations();
  if (menuId === 'org-budget')       renderOrgBudget();
  if (menuId === 'isolation-groups') renderIsolationGroups();
  if (menuId === 'reports')          renderBoReports();
  if (menuId === 'manual')           renderBoManual();
}

function boSwitchPersona(key) {
  boCurrentPersona = BO_PERSONAS[key];
  if (!boCurrentPersona.accessMenus.includes(boCurrentMenu)) {
    boCurrentMenu = 'dashboard';
  }
  boNavigate(boCurrentMenu);
}
