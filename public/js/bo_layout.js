// ─── 격리그룹 컨텍스트 전역 상태 ─────────────────────────────────────────────
let _boActiveIsolationGroupId = null; // 현재 선택된 격리그룹 ID
let _boPlatformSelectedTenantId = null; // 플랫폼 총괄: 선택된 테넌트

// 현재 페르소나의 담당 격리그룹 목록 반환
function boGetMyGroups(persona) {
  if (!persona) persona = boCurrentPersona;
  const ids = persona.isolationGroups ||
    (persona.isolationGroupId ? [persona.isolationGroupId] : []);
  return (typeof ISOLATION_GROUPS !== 'undefined')
    ? ids.map(id => ISOLATION_GROUPS.find(g => g.id === id)).filter(Boolean)
    : [];
}

// 현재 활성 격리그룹 ID 반환
function boGetActiveGroupId() {
  const role = boCurrentPersona?.role;
  // 플랫폼 총괄: 선택된 테넌트+그룹이 있으면 반환
  if (role === 'platform_admin') return _boActiveIsolationGroupId;
  // 테넌트 총괄: 필터 없음 (전체 그룹 동시 조회)
  if (role === 'tenant_global_admin') return null;
  // 예산 총괄/운영: 내 담당 그룹 중 선택된 것
  const groups = boGetMyGroups();
  if (!groups.length) return null;
  if (_boActiveIsolationGroupId && groups.find(g => g.id === _boActiveIsolationGroupId))
    return _boActiveIsolationGroupId;
  return groups[0].id;
}

// 활성 격리그룹 객체 반환
function boGetActiveGroup() {
  const id = boGetActiveGroupId();
  return id ? (ISOLATION_GROUPS||[]).find(g => g.id === id) : null;
}

// 격리그룹 스위치 (셀렉트박스 선택 + 조회 버튼 콜백)
function boSwitchIsolationGroup(groupId) {
  _boActiveIsolationGroupId = groupId;
  boNavigate(boCurrentMenu); // 사이드바 재렌더 없이 메뉴만 재렌더
}

// 플랫폼 총괄: 테넌트 선택 시 그룹 목록 동적 갱신
function boPlatformSelectTenant(tenantId) {
  _boPlatformSelectedTenantId = tenantId;
  _boActiveIsolationGroupId = null;
  // 그룹 셀렉트 갱신
  const groupSel = document.getElementById('bo-group-select');
  if (!groupSel) return;
  const groups = (ISOLATION_GROUPS||[]).filter(g => g.tenantId === tenantId);
  groupSel.innerHTML = `<option value="">전체 그룹 (${groups.length}개)</option>` +
    groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// 셀렉트박스에서 그룹 선택 (조회 버튼 없이 즉시 저장 — 조회 버튼 클릭 시 boApplyGroupFilter 호출)
function boApplyGroupFilter() {
  const sel = document.getElementById('bo-group-select');
  if (sel) _boActiveIsolationGroupId = sel.value || null;
  boNavigate(boCurrentMenu);
}

// 헬퍼: 활성 격리그룹 기준으로 배열 필터
function boIsolationGroupFilter(arr, field) {
  const activeId = boGetActiveGroupId();
  if (!activeId || !arr) return arr || [];
  const f = field || 'isolationGroupId';
  return arr.filter(item => !item[f] || item[f] === activeId);
}

// ─── 역할별 상단 필터 바 (메뉴 innerHTML 최상단에 삽입) ───────────────────────
function boRenderGroupContextBar() {
  const persona = boCurrentPersona;
  const role = persona?.role;

  // ① 플랫폼 총괄: 테넌트(회사) → 격리그룹 캐스케이드 셀렉트 + 조회 버튼
  if (role === 'platform_admin') {
    const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
    const selTenantId = _boPlatformSelectedTenantId || (tenants[0]?.id || '');
    const filteredGroups = (ISOLATION_GROUPS||[]).filter(g => g.tenantId === selTenantId);
    const activeId = _boActiveIsolationGroupId;
    return `
<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;background:#FFFBEB;
            border:1px solid #FDE68A;border-radius:12px;margin-bottom:20px;flex-wrap:wrap">
  <span style="font-size:11px;font-weight:900;color:#92400E;white-space:nowrap">🔍 데이터 범위</span>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <label style="font-size:11px;color:#6B7280;font-weight:700">테넌트(회사)</label>
    <select id="bo-tenant-select" onchange="boPlatformSelectTenant(this.value)"
      style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;
             font-weight:700;background:#fff;cursor:pointer;color:#92400E">
      ${tenants.map(t =>`<option value="${t.id}" ${t.id===selTenantId?'selected':''}>${t.name} (${t.id})</option>`).join('')}
    </select>
    <label style="font-size:11px;color:#6B7280;font-weight:700">격리그룹</label>
    <select id="bo-group-select"
      style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;
             font-weight:700;background:#fff;cursor:pointer;color:#92400E">
      <option value="" ${!activeId?'selected':''}>전체 그룹 (${filteredGroups.length}개)</option>
      ${filteredGroups.map(g =>`<option value="${g.id}" ${g.id===activeId?'selected':''}>${g.name}</option>`).join('')}
    </select>
    <button onclick="boApplyGroupFilter()"
      style="padding:6px 16px;background:#D97706;color:#fff;border:none;border-radius:8px;
             font-size:12px;font-weight:800;cursor:pointer;transition:all .12s;white-space:nowrap"
      onmouseover="this.style.background='#B45309'" onmouseout="this.style.background='#D97706'">
      조회
    </button>
  </div>
  ${activeId ? `<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:4px;font-weight:700">
    📊 현재: ${(ISOLATION_GROUPS||[]).find(g=>g.id===activeId)?.name || activeId}
  </span>` : '<span style="font-size:10px;color:#9CA3AF">전체 그룹 데이터 표시 중</span>'}
</div>`;
  }

  // ② 테넌트 총괄: 소속 테넌트의 모든 격리그룹을 탭/배지로 표시 (필터 없음, 전체 동시 조회)
  if (role === 'tenant_global_admin') {
    const tenantId = persona.tenantId;
    const allGroups = (ISOLATION_GROUPS||[]).filter(g => g.tenantId === tenantId);
    if (!allGroups.length) return '';
    return `
<div style="padding:12px 18px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:900;color:#065F46;white-space:nowrap">🛡️ 테넌트 내 전체 격리그룹 조회</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${allGroups.map(g => `
      <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;
                   background:${g.color||'#059669'}18;border:1.5px solid ${g.color||'#059669'}40;
                   border-radius:20px;font-size:11px;font-weight:700;color:${g.color||'#065F46'}">
        <span style="width:7px;height:7px;border-radius:50%;background:${g.color||'#059669'}"></span>
        ${g.name}
      </span>`).join('')}
    </div>
    <span style="margin-left:auto;font-size:10px;color:#6B7280">모든 격리그룹 데이터를 통합 조회합니다</span>
  </div>
</div>`;
  }

  // ③ 예산 총괄 / 예산 운영 담당자
  if (['budget_global_admin','budget_op_manager'].includes(role)) {
    const myGroups = boGetMyGroups(persona);
    if (!myGroups.length) return '';
    const activeId = boGetActiveGroupId();
    const activeGroup = myGroups.find(g => g.id === activeId) || myGroups[0];

    // 단일 그룹: 라벨만 표시
    if (myGroups.length === 1) {
      return `
<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;
            background:${activeGroup.color||'#6366F1'}08;border:1px solid ${activeGroup.color||'#6366F1'}25;
            border-radius:10px;margin-bottom:20px">
  <span style="width:8px;height:8px;border-radius:50%;background:${activeGroup.color||'#6366F1'}"></span>
  <span style="font-size:11px;font-weight:900;color:${activeGroup.color||'#374151'}">${activeGroup.name}</span>
  <span style="font-size:11px;color:#6B7280">데이터를 표시 중입니다.</span>
</div>`;
    }

    // 다중 그룹: 셀렉트박스 + 조회 버튼
    return `
<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;
            background:${activeGroup.color||'#6366F1'}08;border:1px solid ${activeGroup.color||'#6366F1'}25;
            border-radius:12px;margin-bottom:20px;flex-wrap:wrap">
  <span style="font-size:11px;font-weight:900;color:${activeGroup.color||'#374151'};white-space:nowrap">🔀 예산 격리그룹 전환</span>
  <select id="bo-group-select"
    style="padding:6px 12px;border:1.5px solid ${activeGroup.color||'#6366F1'}50;border-radius:8px;
           font-size:12px;font-weight:700;background:#fff;cursor:pointer;color:${activeGroup.color||'#374151'};flex:1;min-width:200px">
    ${myGroups.map(g =>`<option value="${g.id}" ${g.id===activeId?'selected':''}>${g.name}</option>`).join('')}
  </select>
  <button onclick="boApplyGroupFilter()"
    style="padding:6px 16px;background:${activeGroup.color||'#6366F1'};color:#fff;border:none;
           border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap"
    onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
    조회
  </button>
  <span style="font-size:10px;color:#9CA3AF">${myGroups.length}개 격리그룹 담당</span>
</div>`;
  }

  return '';
}

// ─── 구버전 호환 별칭 (기존 boIsolationGroupBanner 호출부 호환) ───────────────
function boIsolationGroupBanner() { return boRenderGroupContextBar(); }

// Platform Admin 전용 메뉴
const PLATFORM_MENUS = [
  { id: 'dashboard',         icon: '📊', label: '대시보드',              section: null },
  { id: 'platform-monitor',  icon: '🖥️',  label: '전사 예산 모니터링',    section: '플랫폼 총괄' },
  { id: 'platform-roles',    icon: '🔐', label: '관리자 권한 매핑',       section: null },
  { id: 'isolation-groups',  icon: '🛡️', label: '격리그룹 관리',          section: '테넌트 운영' },
  { id: 'budget-account',    icon: '💳', label: '예산 계정 관리',          section: null },
  { id: 'virtual-org',       icon: '🏢', label: '가상조직 템플릿 관리',   section: null },
  { id: 'reports',           icon: '📈', label: '통계 및 리포트',        section: '분석' },
  { id: 'manual',            icon: '📖', label: '서비스 매뉴얼',          section: null },
];

// Tenant Admin 메뉴 (테넌트 총괄 전용)
const TENANT_ADMIN_MENUS = [
  { id: 'dashboard',        icon: '📊', label: '대시보드',              section: null },
  { id: 'isolation-groups', icon: '🛡️', label: '격리그룹 관리',         section: '테넌트 관리' },
  { id: 'budget-account',   icon: '💳', label: '예산 계정 관리',         section: null },
  { id: 'virtual-org',      icon: '🏢', label: '가상조직 템플릿 관리',  section: null },
  { id: 'reports',          icon: '📈', label: '전사 통계 리포트',       section: '분석' },
  { id: 'manual',           icon: '📖', label: '서비스 매뉴얼',          section: null },
];

// 예산 총괄 메뉴 (Budget Global Admin)
const BUDGET_ADMIN_MENUS = [
  { id: 'dashboard',           icon: '📊', label: '대시보드',              section: null },
  { id: 'isolation-groups',    icon: '🛡️', label: '격리그룹 관리',    section: '그룹 설정' },
  { id: 'budget-account',      icon: '💳', label: '예산 계정 관리',          section: '예산·설정' },
  { id: 'virtual-org',         icon: '🏢', label: '가상조직 템플릿 관리',   section: null },
  { id: 'form-builder',        icon: '📝', label: '교육신청양식마법사',    section: null },
  { id: 'calc-grounds',        icon: '📐', label: '세부산출근거 관리',       section: null },
  { id: 'approval-routing',    icon: '📊', label: '계정별 결재라인 설정',    section: null },
  { id: 'service-policy',      icon: '🔧', label: '서비스 정책 관리',        section: null },
  { id: 'plan-mgmt',           icon: '📋', label: '교육계획 관리',           section: '운영 메뉴' },
  { id: 'allocation',          icon: '💰', label: '예산 배정 및 관리',       section: null },
  { id: 'my-operations',       icon: '📥', label: '나의 운영 업무',           section: null },
  { id: 'reports',             icon: '📈', label: '통계 및 리포트',          section: '분석' },
  { id: 'manual',              icon: '📖', label: '서비스 매뉴얼',           section: null },
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
  { id: 'isolation-groups',    icon: '🛡️', label: '격리그룹 관리',    section: '테넌트 관리' },
  { id: 'budget-account',   icon: '💳', label: '예산 계정 관리',          section: '예산·설정' },
  { id: 'virtual-org',      icon: '🏢', label: '가상조직 템플릿 관리',   section: null },
  { id: 'form-builder',     icon: '📝', label: '교육신청양식마법사',    section: null },
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

  // All tenant groups with their personas
  const TENANT_GROUPS = [
    { label: 'SYSTEM',  tenantId: null,    color: '#92400E', bg: '#FEF3C7', keys: ['platform_admin'] },
    { label: 'HMC',     tenantId: 'HMC',   color: '#002C5F', bg: '#EFF6FF', keys: ['hmc_tenant_admin','hmc_total_general','hmc_hq_general','hmc_total_rnd','hmc_center_rnd'] },
    { label: 'KIA',     tenantId: 'KIA',   color: '#059669', bg: '#F0FDF4', keys: ['kia_tenant_admin','kia_total_general','kia_hq_general'] },
    { label: 'HAE',     tenantId: 'HAE',   color: '#7C3AED', bg: '#F5F3FF', keys: ['hae_tenant_admin','hae_total','hae_dept'] },
    { label: '로템',   tenantId: 'ROTEM', color: '#B45309', bg: '#FFFBEB', keys: ['rotem_tenant_admin','rotem_total'] },
    { label: '엔지',   tenantId: 'HEC',   color: '#0369A1', bg: '#F0F9FF', keys: ['hec_tenant_admin','hec_total'] },
    { label: '제철',   tenantId: 'HSC',   color: '#BE123C', bg: '#FFF1F2', keys: ['hsc_tenant_admin','hsc_total'] },
    { label: '트랜시', tenantId: 'HTS',color: '#6D28D9', bg: '#F5F3FF', keys: ['hts_tenant_admin','hts_total'] },
    { label: '글로비스', tenantId: 'GLOVIS', color: '#0E7490', bg: '#ECFEFF', keys: ['glovis_tenant_admin','glovis_total'] },
    { label: '차증권', tenantId: 'HIS',  color: '#9D174D', bg: '#FDF2F8', keys: ['his_tenant_admin','his_total'] },
    { label: '케피코', tenantId: 'KEFICO', color: '#1D4ED8', bg: '#EFF6FF', keys: ['kefico_tenant_admin','kefico_total'] },
    { label: 'ISC',     tenantId: 'HISC',  color: '#374151', bg: '#F9FAFB', keys: ['hisc_tenant_admin','hisc_total'] },
  ];

  const currentKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';
  const currentGroup = TENANT_GROUPS.find(g => g.keys.includes(currentKey));

  // Compact current persona display + dropdown button
  const switcher = `
<div style="position:relative;display:inline-block" id="persona-switcher-wrap">
  <button onclick="_boTogglePersonaSwitcher()"
    style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:10px;
           border:1.5px solid ${currentGroup?.color||'#E5E7EB'};background:white;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap"
    title="\ud398\ub974\uc18c\ub098 \uc804\ud658">
    <span class="role-tag ${persona.roleClass}" style="font-size:9px">${persona.roleTag}</span>
    <span style="color:${currentGroup?.color||'#374151'}">${persona.name}</span>
    <span style="font-size:10px;color:#9CA3AF;font-weight:600">${currentGroup?.label||''}</span>
    <span style="font-size:9px;color:#9CA3AF">\u25bc</span>
  </button>
  <div id="persona-switcher-panel" style="display:none;position:fixed;top:56px;right:16px;z-index:500;
       background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.2);
       border:1px solid #E5E7EB;padding:12px;width:580px;max-height:70vh;overflow-y:auto">
    <div style="font-size:10px;font-weight:900;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">\ud14c\ub10c\ud2b8\ubcc4 \uc811\uc18d\uc790 \uc804\ud658</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${TENANT_GROUPS.map(g => {
        const personas = g.keys.map(key => {
          const p = BO_PERSONAS[key]; if(!p) return '';
          const isActive = boCurrentPersona === p;
          return `<button onclick="boSwitchPersona('${key}');_boTogglePersonaSwitcher(false)"
            style="display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:8px;text-align:left;width:100%;
                   border:1.5px solid ${isActive ? g.color : '#F3F4F6'};
                   background:${isActive ? g.color+'18' : 'white'};cursor:pointer;transition:all .12s"
            onmouseover="this.style.borderColor='${g.color}';this.style.background='${g.bg}'"
            onmouseout="this.style.borderColor='${isActive ? g.color : '#F3F4F6'}';this.style.background='${isActive ? g.color+'18':'white'}'">
            <span class="role-tag ${p.roleClass}" style="font-size:8px;flex-shrink:0">${p.roleTag}</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:${isActive?900:700};font-size:11px;color:${isActive?g.color:'#111827'}">${p.name}</div>
              <div style="font-size:9px;color:#9CA3AF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.dept} \u00b7 ${p.pos}</div>
            </div>
            ${isActive ? '<span style="font-size:10px;color:'+g.color+'">&#10003;</span>' : ''}
          </button>`;
        }).join('');
        return `<div style="background:${g.bg}20;border-radius:10px;padding:8px;border:1px solid ${g.color}20">
          <div style="font-size:9px;font-weight:900;color:${g.color};letter-spacing:.06em;margin-bottom:6px;text-transform:uppercase">${g.label}</div>
          <div style="display:flex;flex-direction:column;gap:4px">${personas}</div>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>`;

  document.getElementById('bo-header').innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;height:100%;padding:0 16px">
  <div style="display:flex;align-items:center;gap:10px">
    <a href="index.html"
      style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,#002C5F,#0050A8);color:#fff;text-decoration:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;border:1.5px solid #0050A8;white-space:nowrap;transition:all .15s"
      onmouseover="this.style.opacity='.8'"
      onmouseout="this.style.opacity='1'"
      title="LXP \ud559\uc2b5\uc790 \ud654\uba74(\ud504\ub860\ud2b8 \uc624\ud53c\uc2a4)\uc73c\ub85c \uc774\ub3d9">
      \ud83c\udf93 LXP \ud504\ub860\ud2b8
    </a>
    <div style="font-size:11px;color:#9CA3AF;font-weight:700;border-left:1px solid #E5E7EB;padding-left:10px">\ubc31\uc624\ud53c\uc2a4 / ${menuLabel}</div>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:10px;font-weight:700;color:#9CA3AF;white-space:nowrap">\uc811\uc18d\uc790 \uc804\ud658:</span>
    ${switcher}
  </div>
</div>`;

  // Close on outside click
  setTimeout(() => {
    document.removeEventListener('click', _boOutsideClose);
    document.addEventListener('click', _boOutsideClose);
  }, 0);
}

let _boSwitcherOpen = false;
function _boTogglePersonaSwitcher(forceClose) {
  const panel = document.getElementById('persona-switcher-panel');
  if (!panel) return;
  _boSwitcherOpen = forceClose === false ? false : !_boSwitcherOpen;
  panel.style.display = _boSwitcherOpen ? 'block' : 'none';
}
function _boOutsideClose(e) {
  if (!document.getElementById('persona-switcher-wrap')?.contains(e.target)) {
    _boSwitcherOpen = false;
    const panel = document.getElementById('persona-switcher-panel');
    if (panel) panel.style.display = 'none';
  }
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
  if (menuId === 'isolation-groups')    renderIsolationGroups();
  if (menuId === 'reports')          renderBoReports();
  if (menuId === 'manual')           renderBoManual();
}

function boSwitchPersona(key) {
  boCurrentPersona = BO_PERSONAS[key];
  _boActiveIsolationGroupId = null; // 페르소나 전환 시 그룹 자동 리셋
  if (!boCurrentPersona.accessMenus.includes(boCurrentMenu)) {
    boCurrentMenu = 'dashboard';
  }
  boNavigate(boCurrentMenu);
}

// ─── 격리그룹 컨텍스트 배너 (각 메뉴 상단에 삽입용) ──────────────────────────
// 활성 격리그룹 정보를 메뉴 상단에 표시. 다중 그룹일 때는 전환 링크도 표시.
function boIsolationGroupBanner() {
  const persona = boCurrentPersona;
  const myGroups = boGetMyGroups(persona);
  if (!myGroups.length) return '';
  const activeId = boGetActiveGroupId();
  const activeGroup = myGroups.find(g => g.id === activeId) || myGroups[0];
  const isMulti = myGroups.length > 1;
  const otherGroups = myGroups.filter(g => g.id !== activeId);

  const otherBtns = isMulti ? otherGroups.map(g =>
    `<button onclick="boSwitchIsolationGroup('${g.id}')"
      style="padding:3px 10px;border-radius:6px;background:${g.color||'#6366F1'}18;
             border:1px solid ${g.color||'#6366F1'}40;color:${g.color||'#374151'};
             font-size:11px;font-weight:700;cursor:pointer;transition:all .12s"
      onmouseover="this.style.background='${g.color||'#6366F1'}28'"
      onmouseout="this.style.background='${g.color||'#6366F1'}18'">
      ${g.name} 전환 →
    </button>`).join(' ') : '';

  return `
<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;
            background:${activeGroup.color||'#6366F1'}0C;border-radius:10px;
            border:1px solid ${activeGroup.color||'#6366F1'}25;margin-bottom:20px;flex-wrap:wrap;gap:8px">
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:8px;height:8px;border-radius:50%;background:${activeGroup.color||'#6366F1'};flex-shrink:0"></span>
    <span style="font-size:11px;font-weight:900;color:${activeGroup.color||'#374151'}">
      ${activeGroup.name}
    </span>
    <span style="font-size:11px;color:#6B7280">데이터를 표시 중입니다.</span>
    ${isMulti ? `<span style="font-size:10px;background:#F3F4F6;color:#9CA3AF;padding:2px 6px;border-radius:4px">${myGroups.length}개 그룹 담당</span>` : ''}
  </div>
  ${isMulti ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${otherBtns}</div>` : ''}
</div>`;
}
