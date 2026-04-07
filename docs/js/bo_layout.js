// ─── VOrg(가상교육조직) 컨텍스트 전역 상태 ─────────────────────────────────
let _boActiveVorgId = null; // 현재 선택된 VOrg ID
let _boPlatformSelectedTenantId = null; // 플랫폼 총괄: 선택된 테넌트

// 현재 페르소나의 담당 VOrg 목록 반환
function boGetMyGroups(persona) {
  if (!persona) persona = boCurrentPersona;
  const ids = persona.vorgIds || persona.isolationGroups ||
    (persona.domainId ? [persona.domainId] : []);
  const domains = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES
    : typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS : [];
  return ids.map(id => domains.find(g => g.id === id)).filter(Boolean);
}

// 현재 활성 VOrg ID 반환
function boGetActiveGroupId() {
  const role = boCurrentPersona?.role;
  if (role === 'platform_admin') return _boActiveVorgId;
  if (role === 'tenant_global_admin') return null;
  const groups = boGetMyGroups();
  if (!groups.length) return null;
  if (_boActiveVorgId && groups.find(g => g.id === _boActiveVorgId))
    return _boActiveVorgId;
  return groups[0].id;
}

// 활성 VOrg 객체 반환
function boGetActiveGroup() {
  const id = boGetActiveGroupId();
  const domains = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES
    : typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS : [];
  return id ? domains.find(g => g.id === id) : null;
}

// VOrg 스위치
function boSwitchVorg(groupId) {
  _boActiveVorgId = groupId;
  boNavigate(boCurrentMenu);
}
// 구버전 호환
function boSwitchIsolationGroup(groupId) { boSwitchVorg(groupId); }

// 플랫폼 총괄: 테넌트 선택 시 그룹 목록 동적 갱신
function boPlatformSelectTenant(tenantId) {
  _boPlatformSelectedTenantId = tenantId;
  _boActiveVorgId = null;
  const groupSel = document.getElementById('bo-group-select');
  if (!groupSel) return;
  const domains = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES
    : typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS : [];
  const groups = domains.filter(g => g.tenantId === tenantId);
  groupSel.innerHTML = `<option value="">전체 VOrg (${groups.length}개)</option>` +
    groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

// 셀렉트박스에서 그룹 선택 (조회 버튼 없이 즉시 저장 — 조회 버튼 클릭 시 boApplyGroupFilter 호출)
function boApplyGroupFilter() {
  const sel = document.getElementById('bo-group-select');
  if (sel) _boActiveVorgId = sel.value || null;
  boNavigate(boCurrentMenu);
}

// 헬퍼: 활성 VOrg 기준으로 배열 필터
function boVorgFilter(arr, field) {
  const activeId = boGetActiveGroupId();
  if (!activeId || !arr) return arr || [];
  const f = field || 'domainId';
  return arr.filter(item => !item[f] || item[f] === activeId);
}
// 구버전 호환
function boIsolationGroupFilter(arr, field) { return boVorgFilter(arr, field); }

// ─── 역할별 상단 필터 바 (메뉴 innerHTML 최상단에 삽입) ───────────────────────
function boRenderGroupContextBar() {
  const persona = boCurrentPersona;
  const role = persona?.role;

  // ① 플랫폼 총괄: 테넌트(회사) → 격리그룹 캐스케이드 셀렉트 + 조회 버튼
  if (role === 'platform_admin') {
    const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
    const selTenantId = _boPlatformSelectedTenantId || (tenants[0]?.id || '');
    const filteredGroups = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : EDU_SUPPORT_DOMAINS || []).filter(g => g.tenantId === selTenantId);
    const activeId = _boActiveVorgId;
    return `
<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;background:#FFFBEB;
            border:1px solid #FDE68A;border-radius:12px;margin-bottom:20px;flex-wrap:wrap">
  <span style="font-size:11px;font-weight:900;color:#92400E;white-space:nowrap">🔍 데이터 범위</span>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <label style="font-size:11px;color:#6B7280;font-weight:700">테넌트(회사)</label>
    <select id="bo-tenant-select" onchange="boPlatformSelectTenant(this.value)"
      style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;
             font-weight:700;background:#fff;cursor:pointer;color:#92400E">
      ${tenants.map(t => `<option value="${t.id}" ${t.id === selTenantId ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
    </select>
    <label style="font-size:11px;color:#6B7280;font-weight:700">VOrg</label>
    <select id="bo-group-select"
      style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;
             font-weight:700;background:#fff;cursor:pointer;color:#92400E">
      <option value="" ${!activeId ? 'selected' : ''}>전체 그룹 (${filteredGroups.length}개)</option>
      ${filteredGroups.map(g => `<option value="${g.id}" ${g.id === activeId ? 'selected' : ''}>${g.name}</option>`).join('')}
    </select>
    <button onclick="boApplyGroupFilter()"
      style="padding:6px 16px;background:#D97706;color:#fff;border:none;border-radius:8px;
             font-size:12px;font-weight:800;cursor:pointer;transition:all .12s;white-space:nowrap"
      onmouseover="this.style.background='#B45309'" onmouseout="this.style.background='#D97706'">
      조회
    </button>
  </div>
  ${activeId ? `<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:4px;font-weight:700">
    📊 현재: ${(typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : EDU_SUPPORT_DOMAINS || []).find(g => g.id === activeId)?.name || activeId}
  </span>` : '<span style="font-size:10px;color:#9CA3AF">전체 VOrg 데이터 표시 중</span>'}
</div>`;
  }

  // ② 테넌트 총괄: 소속 테넌트의 모든 격리그룹을 탭/배지로 표시 (필터 없음, 전체 동시 조회)
  if (role === 'tenant_global_admin') {
    const tenantId = persona.tenantId;
    const allGroups = (typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : EDU_SUPPORT_DOMAINS || []).filter(g => g.tenantId === tenantId);
    if (!allGroups.length) return '';
    return `
<div style="padding:12px 18px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:12px;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:900;color:#065F46;white-space:nowrap">🛡️ 테넌트 내 전체 VOrg 조회</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${allGroups.map(g => `
      <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;
                   background:${g.color || '#059669'}18;border:1.5px solid ${g.color || '#059669'}40;
                   border-radius:20px;font-size:11px;font-weight:700;color:${g.color || '#065F46'}">
        <span style="width:7px;height:7px;border-radius:50%;background:${g.color || '#059669'}"></span>
        ${g.name}
      </span>`).join('')}
    </div>
    <span style="margin-left:auto;font-size:10px;color:#6B7280">모든 VOrg 데이터를 통합 조회합니다</span>
  </div>
</div>`;
  }

  // ③ 예산 총괄 / 예산 운영 담당자
  if (['budget_global_admin', 'budget_op_manager'].includes(role)) {
    const myGroups = boGetMyGroups(persona);
    if (!myGroups.length) return '';
    const activeId = boGetActiveGroupId();
    const activeGroup = myGroups.find(g => g.id === activeId) || myGroups[0];

    // 단일 그룹: 라벨만 표시
    if (myGroups.length === 1) {
      return `
<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;
            background:${activeGroup.color || '#6366F1'}08;border:1px solid ${activeGroup.color || '#6366F1'}25;
            border-radius:10px;margin-bottom:20px">
  <span style="width:8px;height:8px;border-radius:50%;background:${activeGroup.color || '#6366F1'}"></span>
  <span style="font-size:11px;font-weight:900;color:${activeGroup.color || '#374151'}">${activeGroup.name}</span>
  <span style="font-size:11px;color:#6B7280">데이터를 표시 중입니다.</span>
</div>`;
    }

    // 다중 그룹: 셀렉트박스 + 조회 버튼
    return `
<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;
            background:${activeGroup.color || '#6366F1'}08;border:1px solid ${activeGroup.color || '#6366F1'}25;
            border-radius:12px;margin-bottom:20px;flex-wrap:wrap">
  <span style="font-size:11px;font-weight:900;color:${activeGroup.color || '#374151'};white-space:nowrap">🔀 VOrg 전환</span>
  <select id="bo-group-select"
    style="padding:6px 12px;border:1.5px solid ${activeGroup.color || '#6366F1'}50;border-radius:8px;
           font-size:12px;font-weight:700;background:#fff;cursor:pointer;color:${activeGroup.color || '#374151'};flex:1;min-width:200px">
    ${myGroups.map(g => `<option value="${g.id}" ${g.id === activeId ? 'selected' : ''}>${g.name}</option>`).join('')}
  </select>
  <button onclick="boApplyGroupFilter()"
    style="padding:6px 16px;background:${activeGroup.color || '#6366F1'};color:#fff;border:none;
           border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap"
    onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
    조회
  </button>
  <span style="font-size:10px;color:#9CA3AF">${myGroups.length}개 VOrg 담당</span>
</div>`;
  }

  return '';
}

// ─── 구버전 호환 별칭 ───────────────────────────────────────────────────────
function boIsolationGroupBanner() { return boRenderGroupContextBar(); }
function boIsolationGroupBanner_legacy() { return typeof boVorgBanner !== 'undefined' ? boVorgBanner() : ''; }

// GNB (대분류) 정의
const GNB_CATE = {
  PLATFORM: '플랫폼',
  TENANT: '테넌트',
  PROGRAM: '교육제도',   // 교육자원 + 교육운영 + 성장제도 통합
  COURSE: '교육과정운영',  // 채널/교육과정/차수/학습자
  STATS: '현황/통계',
  ETC: '기타'
};

// Platform Admin 전용 메뉴
const PLATFORM_MENUS = [
  // 플랫폼
  { id: 'dashboard', icon: '📊', label: '대시보드', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'platform-monitor', icon: '🖥️', label: '전사 예산 모니터링', section: '플랫폼 콘트롤', gnb: GNB_CATE.PLATFORM },
  { id: 'tenant-mgmt', icon: '🏢', label: '테넌트/회사 관리', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'platform-roles', icon: '🛠️', label: '관리자 권한 매핑', section: null, gnb: GNB_CATE.PLATFORM },
  // 테넌트
  { id: 'org-mgmt', icon: '🗂️', label: '조직 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'user-mgmt', icon: '👤', label: '사용자 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'role-mgmt', icon: '🔐', label: '역할 관리', section: '테넌트 설정', gnb: GNB_CATE.TENANT },
  { id: 'role-menu-perms', icon: '🔑', label: '역할별 메뉴 권한', section: null, gnb: GNB_CATE.TENANT },
  // 교육제도 ─ 기준설정
  { id: 'virtual-org', icon: '🏗️', label: '가상 교육 조직 관리', section: '교육제도 기준설정', gnb: GNB_CATE.PROGRAM },
  // 교육지원제도 ─ 기준정보
  { id: 'budget-account', icon: '💳', label: '예산계정 관리', section: '교육지원제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'form-builder', icon: '📝', label: '교육양식 마법사', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'calc-grounds', icon: '📐', label: '세부산출근거 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'service-policy', icon: '🔧', label: '서비스 정책관리', section: null, gnb: GNB_CATE.PROGRAM },
  // 교육지원제도 ─ 운영관리
  { id: 'plan-mgmt', icon: '📋', label: '교육계획 관리', section: '교육지원제도 운영관리', gnb: GNB_CATE.PROGRAM },
  { id: 'my-operations', icon: '📥', label: '교육신청 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'result-mgmt', icon: '📄', label: '교육결과 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'allocation', icon: '💰', label: '예산 배정 및 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-history', icon: '📒', label: '예산 사용이력', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-demand', icon: '📊', label: '예산 수요분석', section: null, gnb: GNB_CATE.PROGRAM },
  // 자격증 지원관리
  { id: 'cert-mapping', icon: '📜', label: '자격증 맵핑', section: '자격증 지원관리', gnb: GNB_CATE.PROGRAM },
  // 뱃지제도 기준/운영
  { id: 'badge-group-mgmt', icon: '📛', label: '뱃지 그룹 관리', section: '뱃지제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'badge-mgmt', icon: '🎖️', label: '뱃지 기준 설정', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'badge-operation', icon: '🤝', label: '뱃지 심사 및 현황', section: '뱃지 발급 관리', gnb: GNB_CATE.PROGRAM },
  // 교육과정 운영
  { id: 'channel-mgmt', icon: '📺', label: '채널 관리', section: '교육과정 기준정보', gnb: GNB_CATE.COURSE },
  { id: 'course-mgmt', icon: '📚', label: '교육과정 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'session-mgmt', icon: '🗓️', label: '차수 관리', section: '교육과정 운영', gnb: GNB_CATE.COURSE },
  { id: 'enrollment-mgmt', icon: '👥', label: '학습자 관리', section: null, gnb: GNB_CATE.COURSE },
  // 통계·기타
  { id: 'reports', icon: '📈', label: '통계 및 리포트', section: null, gnb: GNB_CATE.STATS },
  { id: 'manual', icon: '📖', label: '서비스 매뉴얼', section: null, gnb: GNB_CATE.ETC },
];

// Tenant Admin 메뉴 (테넌트 총괄 전용)
const TENANT_ADMIN_MENUS = [
  { id: 'dashboard', icon: '📊', label: '대시보드', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'org-mgmt', icon: '🗂️', label: '조직 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'user-mgmt', icon: '👤', label: '사용자 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'role-mgmt', icon: '🔐', label: '역할 관리', section: '테넌트 설정', gnb: GNB_CATE.TENANT },
  { id: 'virtual-org', icon: '🏗️', label: '가상 교육 조직 관리', section: '교육제도 기준설정', gnb: GNB_CATE.PROGRAM },
  { id: 'budget-account', icon: '💳', label: '예산계정 관리', section: '교육지원제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'form-builder', icon: '📝', label: '교육양식 마법사', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'calc-grounds', icon: '📐', label: '세부산출근거 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'service-policy', icon: '🔧', label: '서비스 정책관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'plan-mgmt', icon: '📋', label: '교육계획 관리', section: '교육지원제도 운영관리', gnb: GNB_CATE.PROGRAM },
  { id: 'my-operations', icon: '📥', label: '교육신청 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'result-mgmt', icon: '📄', label: '교육결과 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'allocation', icon: '💰', label: '예산 배정 및 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-history', icon: '📒', label: '예산 사용이력', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-demand', icon: '📊', label: '예산 수요분석', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'cert-mapping', icon: '📜', label: '자격증 맵핑', section: '자격증 지원관리', gnb: GNB_CATE.PROGRAM },
  // 뱃지제도 기준/운영
  { id: 'badge-group-mgmt', icon: '📛', label: '뱃지 그룹 관리', section: '뱃지제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'badge-mgmt', icon: '🎖️', label: '뱃지 기준 설정', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'badge-operation', icon: '🤝', label: '뱃지 심사 및 현황', section: '뱃지 발급 관리', gnb: GNB_CATE.PROGRAM },
  // 교육과정 운영
  { id: 'channel-mgmt', icon: '📺', label: '채널 관리', section: '교육과정 기준정보', gnb: GNB_CATE.COURSE },
  { id: 'course-mgmt', icon: '📚', label: '교육과정 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'session-mgmt', icon: '🗓️', label: '차수 관리', section: '교육과정 운영', gnb: GNB_CATE.COURSE },
  { id: 'enrollment-mgmt', icon: '👥', label: '학습자 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'reports', icon: '📈', label: '전사 통계 리포트', section: null, gnb: GNB_CATE.STATS },
  { id: 'manual', icon: '📖', label: '서비스 매뉴얼', section: null, gnb: GNB_CATE.ETC },
];

// 예산 총괄 메뉴 (Budget Global Admin)
const BUDGET_ADMIN_MENUS = [
  { id: 'dashboard', icon: '📊', label: '대시보드', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'virtual-org', icon: '🏗️', label: '가상 교육 조직 관리', section: '교육제도 기준설정', gnb: GNB_CATE.PROGRAM },
  { id: 'budget-account', icon: '💳', label: '예산계정 관리', section: '교육지원제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'form-builder', icon: '📝', label: '교육양식 마법사', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'calc-grounds', icon: '📐', label: '세부산출근거 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'service-policy', icon: '🔧', label: '서비스 정책관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'plan-mgmt', icon: '📋', label: '교육계획 관리', section: '교육지원제도 운영관리', gnb: GNB_CATE.PROGRAM },
  { id: 'my-operations', icon: '📥', label: '교육신청 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'result-mgmt', icon: '📄', label: '교육결과 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'allocation', icon: '💰', label: '예산 배정 및 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-history', icon: '📒', label: '예산 사용이력', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-demand', icon: '📊', label: '예산 수요분석', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'cert-mapping', icon: '📜', label: '자격증 맵핑', section: '자격증 지원관리', gnb: GNB_CATE.PROGRAM },
  // 뱃지제도 기준/운영
  { id: 'badge-group-mgmt', icon: '📛', label: '뱃지 그룹 관리', section: '뱃지제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'badge-mgmt', icon: '🎖️', label: '뱃지 기준 설정', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'badge-operation', icon: '🤝', label: '뱃지 심사 및 현황', section: '뱃지 발급 관리', gnb: GNB_CATE.PROGRAM },
  // 교육과정 운영
  { id: 'channel-mgmt', icon: '📺', label: '채널 관리', section: '교육과정 기준정보', gnb: GNB_CATE.COURSE },
  { id: 'course-mgmt', icon: '📚', label: '교육과정 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'session-mgmt', icon: '🗓️', label: '차수 관리', section: '교육과정 운영', gnb: GNB_CATE.COURSE },
  { id: 'enrollment-mgmt', icon: '👥', label: '학습자 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'reports', icon: '📈', label: '통계 및 리포트', section: null, gnb: GNB_CATE.STATS },
  { id: 'manual', icon: '📖', label: '서비스 매뉴얼', section: null, gnb: GNB_CATE.ETC },
];

// 예산 운영 메뉴 (Budget Operation Manager)
const BUDGET_OP_MENUS = [
  { id: 'dashboard', icon: '📊', label: '대시보드', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'service-policy', icon: '🔧', label: '서비스 정책관리', section: '교육지원제도 설정', gnb: GNB_CATE.PROGRAM },
  { id: 'plan-mgmt', icon: '📋', label: '교육계획 관리', section: '교육지원제도 운영', gnb: GNB_CATE.PROGRAM },
  { id: 'my-operations', icon: '📥', label: '교육신청 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'result-mgmt', icon: '📄', label: '교육결과 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'allocation', icon: '💰', label: '예산 배정 및 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-history', icon: '📒', label: '예산 사용이력', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-demand', icon: '📊', label: '예산 수요분석', section: null, gnb: GNB_CATE.PROGRAM },
  // 교육과정 운영
  { id: 'course-mgmt', icon: '📚', label: '교육과정 관리', section: '교육과정 운영', gnb: GNB_CATE.COURSE },
  { id: 'session-mgmt', icon: '🗓️', label: '차수 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'enrollment-mgmt', icon: '👥', label: '학습자 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'reports', icon: '📈', label: '통계 및 리포트', section: null, gnb: GNB_CATE.STATS },
];

// 겸임용 통합 메뉴 (Tenant Admin + Budget Admin 겸임)
const TENANT_DUAL_MENUS = [
  { id: 'dashboard', icon: '📊', label: '대시보드', section: null, gnb: GNB_CATE.PLATFORM },
  { id: 'org-mgmt', icon: '🗂️', label: '조직 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'user-mgmt', icon: '👤', label: '사용자 관리', section: null, gnb: GNB_CATE.TENANT },
  { id: 'role-mgmt', icon: '🔐', label: '역할 관리', section: '테넌트 설정', gnb: GNB_CATE.TENANT },
  { id: 'virtual-org', icon: '🏗️', label: '가상 교육 조직 관리', section: '교육제도 기준설정', gnb: GNB_CATE.PROGRAM },
  { id: 'budget-account', icon: '💳', label: '예산계정 관리', section: '교육지원제도 기준정보', gnb: GNB_CATE.PROGRAM },
  { id: 'form-builder', icon: '📝', label: '교육양식 마법사', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'calc-grounds', icon: '📐', label: '세부산출근거 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'service-policy', icon: '🔧', label: '서비스 정책관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'plan-mgmt', icon: '📋', label: '교육계획 관리', section: '교육지원제도 운영관리', gnb: GNB_CATE.PROGRAM },
  { id: 'my-operations', icon: '📥', label: '교육신청 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'result-mgmt', icon: '📄', label: '교육결과 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'allocation', icon: '💰', label: '예산 배정 및 관리', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-history', icon: '📒', label: '예산 사용이력', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'budget-demand', icon: '📊', label: '예산 수요분석', section: null, gnb: GNB_CATE.PROGRAM },
  { id: 'cert-mapping', icon: '📜', label: '자격증 맵핑', section: '자격증 지원관리', gnb: GNB_CATE.PROGRAM },
  // 교육과정 운영
  { id: 'channel-mgmt', icon: '📺', label: '채널 관리', section: '교육과정 기준정보', gnb: GNB_CATE.COURSE },
  { id: 'course-mgmt', icon: '📚', label: '교육과정 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'session-mgmt', icon: '🗓️', label: '차수 관리', section: '교육과정 운영', gnb: GNB_CATE.COURSE },
  { id: 'enrollment-mgmt', icon: '👥', label: '학습자 관리', section: null, gnb: GNB_CATE.COURSE },
  { id: 'reports', icon: '📈', label: '통계 및 리포트', section: null, gnb: GNB_CATE.STATS },
  { id: 'manual', icon: '📖', label: '서비스 매뉴얼', section: null, gnb: GNB_CATE.ETC },
];

// 레거시 호환용 (platform_admin 이외 기존 flow 지원)
const TENANT_MENUS = BUDGET_ADMIN_MENUS;

// PENDING_COUNTS는 동적으로 계산 (renderBoSidebar에서 호출)
function _getPendingCounts() {
  const p = boCurrentPersona;
  const myOps = typeof getPendingCountForPersona === 'function' ? getPendingCountForPersona(p) : 3;
  return { 'plan-mgmt': MOCK_BO_PLANS?.filter(x => x.status.startsWith('pending')).length || 2, 'my-operations': myOps };
}

function _getMenus(persona) {
  if (persona.role === 'platform_admin') return PLATFORM_MENUS;
  if (persona.role === 'tenant_global_admin') return TENANT_ADMIN_MENUS;
  if (persona.role === 'budget_global_admin') return BUDGET_ADMIN_MENUS;
  if (persona.role === 'budget_op_manager' || persona.role === 'budget_hq') return BUDGET_OP_MENUS;
  return TENANT_MENUS; // 레거시 fallback
}

let boCurrentGnb = GNB_CATE.PLATFORM; // 현재 선택된 GNB 탭 저장용 전역 변수

function renderBoLayout() {
  renderBoHeader();
  renderBoGnb();
  renderBoSidebar();
}

// 섹션 접기 상태 관리 (세션 스토리지로 유지)
function _boGetCollapsedSections() {
  try { return JSON.parse(sessionStorage.getItem('boCollapsed') || '{}'); } catch { return {}; }
}
function _boSaveCollapsedSections(state) {
  sessionStorage.setItem('boCollapsed', JSON.stringify(state));
}
function boToggleSection(sectionKey) {
  const state = _boGetCollapsedSections();
  state[sectionKey] = !state[sectionKey];
  _boSaveCollapsedSections(state);
  // 섹션만 토글 (전체 재렌더 없이 부드럽게)
  const el = document.getElementById(`bo-sec-${sectionKey}`);
  const arrow = document.getElementById(`bo-sec-arrow-${sectionKey}`);
  if (el) {
    const isCollapsed = state[sectionKey];
    el.style.overflow = 'hidden';
    el.style.maxHeight = isCollapsed ? '0' : '1000px';
    el.style.opacity = isCollapsed ? '0' : '1';
    if (arrow) arrow.textContent = isCollapsed ? '›' : '⌄';
  }
}

function renderBoGnb() {
  const persona = boCurrentPersona;
  const allMenus = _getMenus(persona);
  const personaRoles = persona.roles || [persona.role];

  // 권한 있는 메뉴들에 속한 GNB 목록 추출
  const availableGnbs = [...new Set(allMenus.filter(m => {
    return (typeof checkMenuAccess === 'function')
      ? checkMenuAccess(m.id, personaRoles, persona.accessMenus)
      : (persona.accessMenus || []).includes(m.id);
  }).map(m => m.gnb))];

  if (!availableGnbs.includes(boCurrentGnb) && availableGnbs.length > 0) {
    boCurrentGnb = availableGnbs[0];
  }

  let html = '';
  availableGnbs.forEach(gnb => {
    const isActive = (gnb === boCurrentGnb);
    html += `<div class="gnb-item ${isActive ? 'active' : ''}" onclick="boSwitchGnb('${gnb}')">${gnb}</div>`;
  });

  const el = document.getElementById('bo-gnb');
  if (el) el.innerHTML = html;
}

function boSwitchGnb(gnbCate) {
  boCurrentGnb = gnbCate;
  const persona = boCurrentPersona;
  const allMenus = _getMenus(persona);
  const personaRoles = persona.roles || [persona.role];

  // 선택한 GNB 카테고리 내에서 사용 가능한 첫 번째 메뉴 찾기
  const firstMenu = allMenus.find(m => m.gnb === gnbCate && ((typeof checkMenuAccess === 'function')
    ? checkMenuAccess(m.id, personaRoles, persona.accessMenus)
    : (persona.accessMenus || []).includes(m.id)));

  if (firstMenu) boNavigate(firstMenu.id);
  else {
    renderBoGnb();
    renderBoSidebar();
  }
}

function renderBoSidebar() {
  const persona = boCurrentPersona;
  let menus = _getMenus(persona);

  // 현재 선택된 GNB 탭의 하위 메뉴들만 필터링
  menus = menus.filter(m => m.gnb === boCurrentGnb);

  const isPlatform = persona.role === 'platform_admin';
  const collapsed = _boGetCollapsedSections();
  const personaRoles = persona.roles || [persona.role];

  // ── 섹션별 그루핑 ─────────────────────────────────────────────
  // 핵심 규칙: section이 명시된 항목에서 새 섹션 시작.
  //            section:null 항목은 현재 진행중인 그룹에 계속 이어 붙임.
  //            최초 null 항목들만 __nosec__ 그룹에.
  const groups = [];
  let current = null;
  const NO_SECTION = '__nosec__';

  menus.forEach(m => {
    if (m.section) {
      // 새 named 섹션 시작 (이전 섹션과 다를 때만)
      if (!current || current.label !== m.section) {
        current = { key: m.section, label: m.section, items: [], named: true };
        groups.push(current);
      }
    } else {
      // section:null → 현재 그룹이 없거나 최초(nosec)면 nosec 그룹 생성
      //               현재 named 그룹이 있으면 거기에 이어 붙임
      if (!current) {
        current = { key: NO_SECTION, label: null, items: [], named: false };
        groups.push(current);
      }
      // current가 named 섹션이면 그냥 그 안에 추가 (아코디언에 포함)
    }
    const hasAccess = (typeof checkMenuAccess === 'function')
      ? checkMenuAccess(m.id, personaRoles, persona.accessMenus)
      : (persona.accessMenus || []).includes(m.id);
    current.items.push({ m, hasAccess });
  });

  const _pending = _getPendingCounts();

  // ── 섹션 HTML 생성 ────────────────────────────────────────────
  let menuHtml = '';
  groups.forEach(g => {
    const isCollapsed = !!collapsed[g.key];

    if (g.key !== NO_SECTION) {
      // 섹션 헤더 (클릭 → 접기)
      menuHtml += `
      <div onclick="boToggleSection('${g.key}')"
           style="display:flex;align-items:center;justify-content:space-between;
                  padding:7px 14px 4px;cursor:pointer;user-select:none;
                  border-top:1px solid rgba(255,255,255,0.06);margin-top:6px"
           onmouseover="this.style.background='rgba(255,255,255,0.04)'"
           onmouseout="this.style.background='transparent'">
        <span class="bo-nav-label" style="margin:0;font-size:9px;letter-spacing:.08em;pointer-events:none">${g.label}</span>
        <span id="bo-sec-arrow-${g.key}"
              style="font-size:13px;color:rgba(255,255,255,0.3);transition:transform .2s;line-height:1;pointer-events:none">
          ${isCollapsed ? '›' : '⌄'}
        </span>
      </div>
      <div id="bo-sec-${g.key}"
           style="overflow:hidden;transition:max-height .25s ease,opacity .2s ease;
                  max-height:${isCollapsed ? '0' : '1000px'};
                  opacity:${isCollapsed ? '0' : '1'}">`;
    }

    g.items.forEach(({ m, hasAccess }) => {
      const badge = _pending[m.id] ? `<span class="bo-nav-badge">${_pending[m.id]}</span>` : '';
      menuHtml += `
      <div class="bo-nav-item ${boCurrentMenu === m.id ? 'active' : ''} ${!hasAccess ? 'disabled' : ''}"
           onclick="boNavigate('${m.id}')">
        <span class="bo-nav-icon">${m.icon}</span>
        <span>${m.label}</span>
        ${badge}
      </div>`;
    });

    if (g.key !== NO_SECTION) {
      menuHtml += `</div>`;  // 섹션 닫기
    }
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
    <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:2px">${persona.tenantId ? TENANTS.find(t => t.id === persona.tenantId)?.name || '' : ''}</div>
  </div>`;

  document.getElementById('bo-sidebar').innerHTML = `
<div class="bo-nav-section" style="flex:1;overflow-y:auto;margin-top:10px">${menuHtml}</div>
<div style="padding:14px 16px;border-top:1px solid var(--border)">
  <a href="frontoffice.html" style="display:flex;align-items:center;gap:8px;color:var(--text-sub);font-size:12px;font-weight:700;text-decoration:none" 
     onmouseover="this.style.color='var(--text-main)'" onmouseout="this.style.color='var(--text-sub)'">
    <span>←</span> LXP 프론트로 돌아가기
  </a>
</div>`;
}

// ─── 페르소나 셀렉트 박스 전환 헬퍼 ──────────────────────────────────────────
const _TENANT_GROUPS_DEF = [
  { label: 'SYSTEM', tenantId: null, color: '#92400E', keys: ['platform_admin'] },
  { label: 'HMC', tenantId: 'HMC', color: '#002C5F', keys: ['hmc_tenant_admin', 'hmc_total_general', 'hmc_hq_general', 'hmc_total_rnd', 'hmc_center_rnd'] },
  { label: 'KIA', tenantId: 'KIA', color: '#059669', keys: ['kia_tenant_admin', 'kia_total_general', 'kia_hq_general'] },
  { label: 'HAE', tenantId: 'HAE', color: '#7C3AED', keys: ['hae_tenant_admin', 'hae_total', 'hae_dept'] },
  { label: '로템', tenantId: 'ROTEM', color: '#B45309', keys: ['rotem_tenant_admin', 'rotem_total'] },
  { label: '엔지', tenantId: 'HEC', color: '#0369A1', keys: ['hec_tenant_admin', 'hec_total'] },
  { label: '제철', tenantId: 'HSC', color: '#BE123C', keys: ['hsc_platform', 'hsc_tenant_admin', 'hsc_total', 'hsc_budget_gen', 'hmc_budget_gen1', 'hmc_budget_gen2', 'hmc_budget_gen3', 'hmc_budget_gen4', 'hsc_learner'] },
  { label: '트랜시', tenantId: 'HTS', color: '#6D28D9', keys: ['hts_tenant_admin', 'hts_total'] },
  { label: '글로비스', tenantId: 'GLOVIS', color: '#0E7490', keys: ['glovis_tenant_admin', 'glovis_total'] },
  { label: '차증권', tenantId: 'HIS', color: '#9D174D', keys: ['his_tenant_admin', 'his_total'] },
  { label: '케피코', tenantId: 'KEFICO', color: '#1D4ED8', keys: ['kefico_tenant_admin', 'kefico_total'] },
  { label: 'ISC', tenantId: 'HISC', color: '#374151', keys: ['hisc_tenant_admin', 'hisc_total'] },
];

// 테넌트 셀렉트 변경 시 → 첫 번째 페르소나로 자동 전환
window._boOnTenantChange = function (tenantLabel) {
  const group = _TENANT_GROUPS_DEF.find(g => g.label === tenantLabel);
  if (!group) return;
  const firstKey = group.keys.find(k => BO_PERSONAS[k]);
  if (firstKey) boSwitchPersona(firstKey);
};

// 페르소나 셀렉트 변경 시 → 즉시 전환
window._boOnPersonaChange = function (key) {
  if (key && BO_PERSONAS[key]) boSwitchPersona(key);
};

function renderBoHeader() {
  const persona = boCurrentPersona;

  const currentKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';
  const currentGroup = _TENANT_GROUPS_DEF.find(g => g.keys.includes(currentKey)) || _TENANT_GROUPS_DEF[0];

  // --- 테넌트 셀렉트 ---
  const tenantOptions = _TENANT_GROUPS_DEF.map(g =>
    `<option value="${g.label}" ${g.label === currentGroup.label ? 'selected' : ''}>${g.label}</option>`
  ).join('');

  // --- 페르소나 셀렉트 (현재 테넌트에 속한 것만) ---
  const personaOptions = currentGroup.keys
    .filter(k => BO_PERSONAS[k])
    .map(k => {
      const p = BO_PERSONAS[k];
      return `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${p.roleTag} ${p.name} (${p.pos})</option>`;
    }).join('');

  const selectStyle = `padding:5px 10px;border:1.5px solid #CBD5E1;border-radius:6px;
    font-size:12px;font-weight:700;color:#1E293B;background:#fff;cursor:pointer;
    outline:none;width:auto;min-width:120px`;

  document.getElementById('bo-header').innerHTML = `
<div style="display:flex;align-items:center;height:100%;padding:0 20px">
  <!-- Left: Logo -->
  <a href="#" onclick="boNavigate('dashboard')" style="display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0">
    <div style="background:var(--brand);color:white;border-radius:8px;padding:4px 7px;font-size:13px">🏢</div>
    <div style="font-weight:900;color:var(--brand);font-size:15px;letter-spacing:-0.4px">Next Learning
      <span style="font-weight:600;color:var(--text-xs);font-size:11px;margin-left:4px">Back Office</span>
    </div>
  </a>

  <!-- Right: Persona Switcher -->
  <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
    <!-- 현재 페르소나 뱃지 -->
    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;
                background:#F8FAFC;border:1.5px solid #E2E8F0">
      <span class="role-tag ${persona.roleClass}" style="font-size:9px">${persona.roleTag}</span>
      <span style="font-size:12px;font-weight:800;color:${currentGroup.color}">${persona.name}</span>
      <span style="font-size:11px;color:var(--text-xs)">${persona.dept}</span>
    </div>

    <!-- 구분선 -->
    <div style="width:1px;height:24px;background:#E2E8F0"></div>

    <!-- 라벨 -->
    <span style="font-size:11px;font-weight:700;color:var(--text-xs);white-space:nowrap">접속자 전환</span>

    <!-- 테넌트 셀렉트 -->
    <select id="persona-tenant-select" style="${selectStyle}"
      onchange="_boOnTenantChange(this.value)">
      ${tenantOptions}
    </select>

    <!-- 페르소나 셀렉트 -->
    <select id="persona-person-select" style="${selectStyle}"
      onchange="_boOnPersonaChange(this.value)">
      ${personaOptions}
    </select>
  </div>
</div>`;
}


function boNavigate(menuId) {
  const personaRoles = boCurrentPersona.roles || [boCurrentPersona.role];
  const allowed = (typeof checkMenuAccess === 'function')
    ? checkMenuAccess(menuId, personaRoles, boCurrentPersona.accessMenus)
    : boCurrentPersona.accessMenus.includes(menuId);
  if (!allowed) return;
  boCurrentMenu = menuId;
  const targetMenuDef = _getMenus(boCurrentPersona).find(m => m.id === menuId);
  if (targetMenuDef && targetMenuDef.gnb) {
    boCurrentGnb = targetMenuDef.gnb; // 메뉴 선택 시 부모 GNB도 동기화
  }

  sessionStorage.setItem('boLastMenu', menuId); // 현재 메뉴 기억
  renderBoLayout();
  document.getElementById('bo-content').innerHTML = '';

  if (menuId === 'dashboard') renderBoDashboard();
  if (menuId === 'platform-monitor') renderPlatformMonitor();
  if (menuId === 'platform-roles') renderPlatformRoles();
  if (menuId === 'tenant-mgmt') renderTenantMgmt();
  if (menuId === 'org-mgmt') renderOrgMgmt();
  if (menuId === 'user-mgmt') renderUserMgmt();
  if (menuId === 'role-mgmt') renderRoleMgmt();
  if (menuId === 'role-menu-perms') renderRoleMenuPerms();
  // 예산·자격증 및 양식 설정
  if (menuId === 'virtual-org') renderVirtualOrgUnified();
  if (menuId === 'budget-account') renderBudgetAccountMenu(); // 신규 추가
  if (menuId === 'cert-mapping') renderCertMappingMenu();   // 신규 추가
  if (menuId === 'badge-group-mgmt') renderBadgeGroupMgmt();
  if (menuId === 'badge-mgmt') renderBadgeMgmt();
  if (menuId === 'badge-operation') renderBadgeOperation();
  if (menuId === 'form-builder') renderFormBuilderMenu();
  if (menuId === 'field-mgmt') renderVirtualOrgUnified(); // 혹시나 남아있을 경우 대비
  if (menuId === 'calc-grounds') renderCalcGrounds();
  if (menuId === 'approval-routing') renderApprovalRouting();
  if (menuId === 'service-policy') renderServicePolicy();
  // 운영 메뉴
  if (menuId === 'plan-mgmt') renderBoPlanMgmt();
  if (menuId === 'allocation') renderOrgBudget();
  if (menuId === 'budget-history') renderBudgetHistory();
  if (menuId === 'budget-demand') renderBudgetDemand();
  if (menuId === 'my-operations') renderMyOperations();
  if (menuId === 'result-mgmt') renderResultMgmt();
  if (menuId === 'org-budget') renderOrgBudget();
  // isolation-groups 메뉴 제거됨 (2026-03-30: 교육지원 도메인 관리 → 가상교육조직 템플릿 종속으로 변경)
  if (menuId === 'edu-type-mgmt') renderEduTypeMgmt();
  if (menuId === 'reports') renderBoReports();
  if (menuId === 'manual') renderBoManual();
  // 교육과정 운영
  if (menuId === 'channel-mgmt') renderChannelMgmt();
  if (menuId === 'course-mgmt') renderCourseMgmt();
  if (menuId === 'session-mgmt') renderSessionMgmt();
  if (menuId === 'enrollment-mgmt') renderEnrollmentMgmt();
}

function boSwitchPersona(key) {
  boCurrentPersona = BO_PERSONAS[key];
  _boActiveVorgId = null; // 페르소나 전환 시 VOrg 자동 리셋
  const personaRoles = boCurrentPersona.roles || [boCurrentPersona.role];
  const canKeepMenu = (typeof checkMenuAccess === 'function')
    ? checkMenuAccess(boCurrentMenu, personaRoles, boCurrentPersona.accessMenus)
    : boCurrentPersona.accessMenus.includes(boCurrentMenu);
  if (!canKeepMenu) boCurrentMenu = 'dashboard';
  boNavigate(boCurrentMenu);
}

// ─── VOrg 컨텍스트 배너 (각 메뉴 상단에 삽입용) ───────────────────────
function boVorgBanner() {
  const persona = boCurrentPersona;
  const myGroups = boGetMyGroups(persona);
  if (!myGroups.length) return '';
  const activeId = boGetActiveGroupId();
  const activeGroup = myGroups.find(g => g.id === activeId) || myGroups[0];
  const isMulti = myGroups.length > 1;
  const otherGroups = myGroups.filter(g => g.id !== activeId);

  const otherBtns = isMulti ? otherGroups.map(g =>
    `<button onclick="boSwitchVorg('${g.id}')"
      style="padding:3px 10px;border-radius:6px;background:${g.color || '#6366F1'}18;
             border:1px solid ${g.color || '#6366F1'}40;color:${g.color || '#374151'};
             font-size:11px;font-weight:700;cursor:pointer;transition:all .12s"
      onmouseover="this.style.background='${g.color || '#6366F1'}28'"
      onmouseout="this.style.background='${g.color || '#6366F1'}18'">
      ${g.name} 전환 →
    </button>`).join(' ') : '';

  return `
<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;
            background:${activeGroup.color || '#6366F1'}0C;border-radius:10px;
            border:1px solid ${activeGroup.color || '#6366F1'}25;margin-bottom:20px;flex-wrap:wrap;gap:8px">
  <div style="display:flex;align-items:center;gap:8px">
    <span style="width:8px;height:8px;border-radius:50%;background:${activeGroup.color || '#6366F1'};flex-shrink:0"></span>
    <span style="font-size:11px;font-weight:900;color:${activeGroup.color || '#374151'}">
      ${activeGroup.name}
    </span>
    <span style="font-size:11px;color:#6B7280">데이터를 표시 중입니다.</span>
    ${isMulti ? `<span style="font-size:10px;background:#F3F4F6;color:#9CA3AF;padding:2px 6px;border-radius:4px">${myGroups.length}개 VOrg 담당</span>` : ''}
  </div>
  ${isMulti ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${otherBtns}</div>` : ''}
</div>`;
}
