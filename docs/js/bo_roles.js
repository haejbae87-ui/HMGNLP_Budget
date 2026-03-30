// ─── 역할 관리: 테넌트별 독립 역할 계층 ─────────────────────────────────────
// bo_platform_mgmt.js의 renderRoleMgmt를 덮어써서 테넌트별 분리 버전으로 교체

// ──────────────────────────────────────────────────────────────────────────────
// 테넌트별 역할 목업 데이터 (DB 미연결 시 fallback)
// ──────────────────────────────────────────────────────────────────────────────
const TENANT_ROLES_MOCK = [
  // ── HMC (현대자동차) ──────────────────────────────────────────────────────
  { id: 'HMC_tenant_admin',   code: 'HMC_tenant_admin',   name: 'HMC 테넌트 총괄관리자', description: '현대자동차 BO 전체 관리',       parent_role_id: null,             tenant_id: 'HMC' },
  { id: 'HMC_budget_gen',     code: 'HMC_budget_gen',     name: 'HMC 일반예산 총괄관리자', description: 'HMC 일반교육예산 총괄 관리',   parent_role_id: 'HMC_tenant_admin', tenant_id: 'HMC' },
  { id: 'HMC_budget_rnd',     code: 'HMC_budget_rnd',     name: 'HMC R&D예산 총괄관리자', description: 'HMC R&D교육예산 총괄 관리',    parent_role_id: 'HMC_tenant_admin', tenant_id: 'HMC' },
  { id: 'HMC_ops_gen_1',      code: 'HMC_ops_gen_1',      name: 'HMC 일반예산 운영담당자①', description: 'GPS 가상조직 예산 운영',      parent_role_id: 'HMC_budget_gen',   tenant_id: 'HMC' },
  { id: 'HMC_ops_gen_2',      code: 'HMC_ops_gen_2',      name: 'HMC 일반예산 운영담당자②', description: 'ETC 가상조직 예산 운영',      parent_role_id: 'HMC_budget_gen',   tenant_id: 'HMC' },
  { id: 'HMC_ops_rnd_1',      code: 'HMC_ops_rnd_1',      name: 'HMC R&D예산 운영담당자①', description: 'R&D 가상조직 예산 운영',       parent_role_id: 'HMC_budget_rnd',   tenant_id: 'HMC' },
  // ── KIA (기아자동차) ──────────────────────────────────────────────────────
  { id: 'KIA_tenant_admin',   code: 'KIA_tenant_admin',   name: 'KIA 테넌트 총괄관리자',   description: '기아자동차 BO 전체 관리',      parent_role_id: null,               tenant_id: 'KIA' },
  { id: 'KIA_budget_admin',   code: 'KIA_budget_admin',   name: 'KIA 예산 총괄관리자',     description: 'KIA 교육예산 총괄 관리',       parent_role_id: 'KIA_tenant_admin', tenant_id: 'KIA' },
  { id: 'KIA_ops_1',          code: 'KIA_ops_1',          name: 'KIA 예산 운영담당자①',    description: 'KIA 본사 가상조직 예산 운영',   parent_role_id: 'KIA_budget_admin', tenant_id: 'KIA' },
  { id: 'KIA_ops_2',          code: 'KIA_ops_2',          name: 'KIA 예산 운영담당자②',    description: 'KIA 생산 가상조직 예산 운영',   parent_role_id: 'KIA_budget_admin', tenant_id: 'KIA' },
  // ── HAE (현대건설) ────────────────────────────────────────────────────────
  { id: 'HAE_tenant_admin',   code: 'HAE_tenant_admin',   name: 'HAE 테넌트 총괄관리자',   description: '현대건설 BO 전체 관리',        parent_role_id: null,               tenant_id: 'HAE' },
  { id: 'HAE_budget_admin',   code: 'HAE_budget_admin',   name: 'HAE 예산 총괄관리자',     description: 'HAE 교육예산 총괄 관리',       parent_role_id: 'HAE_tenant_admin', tenant_id: 'HAE' },
  { id: 'HAE_ops_1',          code: 'HAE_ops_1',          name: 'HAE 예산 운영담당자',     description: 'HAE 가상조직 예산 운영',        parent_role_id: 'HAE_budget_admin', tenant_id: 'HAE' },
  // ── ROTEM (현대로템) ──────────────────────────────────────────────────────
  { id: 'ROTEM_tenant_admin', code: 'ROTEM_tenant_admin', name: '로템 테넌트 총괄관리자',  description: '현대로템 BO 전체 관리',         parent_role_id: null,               tenant_id: 'ROTEM' },
  { id: 'ROTEM_budget_admin', code: 'ROTEM_budget_admin', name: '로템 예산 총괄관리자',    description: '로템 교육예산 총괄 관리',       parent_role_id: 'ROTEM_tenant_admin', tenant_id: 'ROTEM' },
  { id: 'ROTEM_ops_1',        code: 'ROTEM_ops_1',        name: '로템 예산 운영담당자',    description: '로템 가상조직 예산 운영',        parent_role_id: 'ROTEM_budget_admin', tenant_id: 'ROTEM' },
  // ── HEC (현대엔지니어링) ──────────────────────────────────────────────────
  { id: 'HEC_tenant_admin',   code: 'HEC_tenant_admin',   name: '엔지 테넌트 총괄관리자',  description: '현대엔지니어링 BO 전체 관리',   parent_role_id: null,               tenant_id: 'HEC' },
  { id: 'HEC_budget_admin',   code: 'HEC_budget_admin',   name: '엔지 예산 총괄관리자',    description: '엔지 교육예산 총괄 관리',       parent_role_id: 'HEC_tenant_admin', tenant_id: 'HEC' },
  { id: 'HEC_ops_1',          code: 'HEC_ops_1',          name: '엔지 예산 운영담당자',    description: '엔지 가상조직 예산 운영',        parent_role_id: 'HEC_budget_admin', tenant_id: 'HEC' },
  // ── HSC (현대제철) ────────────────────────────────────────────────────────
  { id: 'HSC_tenant_admin',   code: 'HSC_tenant_admin',   name: '제철 테넌트 총괄관리자',  description: '현대제철 BO 전체 관리',         parent_role_id: null,               tenant_id: 'HSC' },
  { id: 'HSC_budget_admin',   code: 'HSC_budget_admin',   name: '제철 예산 총괄관리자',    description: '제철 교육예산 총괄 관리',       parent_role_id: 'HSC_tenant_admin', tenant_id: 'HSC' },
  { id: 'HSC_ops_1',          code: 'HSC_ops_1',          name: '제철 예산 운영담당자',    description: '제철 가상조직 예산 운영',        parent_role_id: 'HSC_budget_admin', tenant_id: 'HSC' },
  // ── HTS (현대트랜시스) ────────────────────────────────────────────────────
  { id: 'HTS_tenant_admin',   code: 'HTS_tenant_admin',   name: '트랜시 테넌트 총괄관리자', description: '현대트랜시스 BO 전체 관리',    parent_role_id: null,               tenant_id: 'HTS' },
  { id: 'HTS_budget_admin',   code: 'HTS_budget_admin',   name: '트랜시 예산 총괄관리자',   description: '트랜시 교육예산 총괄 관리',    parent_role_id: 'HTS_tenant_admin', tenant_id: 'HTS' },
  { id: 'HTS_ops_1',          code: 'HTS_ops_1',          name: '트랜시 예산 운영담당자',   description: '트랜시 가상조직 예산 운영',     parent_role_id: 'HTS_budget_admin', tenant_id: 'HTS' },
  // ── GLOVIS (현대글로비스) ─────────────────────────────────────────────────
  { id: 'GLOVIS_tenant_admin',code: 'GLOVIS_tenant_admin',name: '글로비스 테넌트 총괄관리자', description: '현대글로비스 BO 전체 관리',  parent_role_id: null,               tenant_id: 'GLOVIS' },
  { id: 'GLOVIS_budget_admin',code: 'GLOVIS_budget_admin',name: '글로비스 예산 총괄관리자',   description: '글로비스 교육예산 총괄 관리', parent_role_id: 'GLOVIS_tenant_admin', tenant_id: 'GLOVIS' },
  { id: 'GLOVIS_ops_1',       code: 'GLOVIS_ops_1',       name: '글로비스 예산 운영담당자',   description: '글로비스 가상조직 예산 운영', parent_role_id: 'GLOVIS_budget_admin', tenant_id: 'GLOVIS' },
  // ── HIS (현대차증권) ──────────────────────────────────────────────────────
  { id: 'HIS_tenant_admin',   code: 'HIS_tenant_admin',   name: '차증권 테넌트 총괄관리자', description: '현대차증권 BO 전체 관리',       parent_role_id: null,               tenant_id: 'HIS' },
  { id: 'HIS_budget_admin',   code: 'HIS_budget_admin',   name: '차증권 예산 총괄관리자',   description: '차증권 교육예산 총괄 관리',     parent_role_id: 'HIS_tenant_admin', tenant_id: 'HIS' },
  { id: 'HIS_ops_1',          code: 'HIS_ops_1',          name: '차증권 예산 운영담당자',   description: '차증권 가상조직 예산 운영',      parent_role_id: 'HIS_budget_admin', tenant_id: 'HIS' },
  // ── KEFICO ────────────────────────────────────────────────────────────────
  { id: 'KEFICO_tenant_admin',code: 'KEFICO_tenant_admin',name: '케피코 테넌트 총괄관리자', description: 'KEFICO BO 전체 관리',          parent_role_id: null,               tenant_id: 'KEFICO' },
  { id: 'KEFICO_budget_admin',code: 'KEFICO_budget_admin',name: '케피코 예산 총괄관리자',   description: '케피코 교육예산 총괄 관리',     parent_role_id: 'KEFICO_tenant_admin', tenant_id: 'KEFICO' },
  { id: 'KEFICO_ops_1',       code: 'KEFICO_ops_1',       name: '케피코 예산 운영담당자',   description: '케피코 가상조직 예산 운영',      parent_role_id: 'KEFICO_budget_admin', tenant_id: 'KEFICO' },
  // ── HISC (ISC) ────────────────────────────────────────────────────────────
  { id: 'HISC_tenant_admin',  code: 'HISC_tenant_admin',  name: 'ISC 테넌트 총괄관리자',   description: 'ISC BO 전체 관리',             parent_role_id: null,               tenant_id: 'HISC' },
  { id: 'HISC_budget_admin',  code: 'HISC_budget_admin',  name: 'ISC 예산 총괄관리자',     description: 'ISC 교육예산 총괄 관리',       parent_role_id: 'HISC_tenant_admin', tenant_id: 'HISC' },
  { id: 'HISC_ops_1',         code: 'HISC_ops_1',         name: 'ISC 예산 운영담당자',     description: 'ISC 가상조직 예산 운영',        parent_role_id: 'HISC_budget_admin', tenant_id: 'HISC' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 역할관리 메인 렌더링 (테넌트 선택 → 계층 트리 표시)
// ──────────────────────────────────────────────────────────────────────────────
async function renderRoleMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const persona = boCurrentPersona;
  const isPlatform = persona.role === 'platform_admin';
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];

  // 테넌트 필터 초기화 (탭 전환 등으로 리셋 방지)
  if (!window._rmFilterTenant) {
    window._rmFilterTenant = isPlatform ? (tenants[0]?.id || 'HMC') : (persona.tenantId || 'HMC');
  }
  const selTenantId = window._rmFilterTenant;
  const selTenant = tenants.find(t => t.id === selTenantId);

  // DB 조회 (tenant_id 필터로 서버사이드에서 걸러서 받기)
  let tenantRoles;
  try {
    tenantRoles = await _sbGet('roles', { tenant_id: selTenantId }) || [];
  } catch(e) { tenantRoles = []; }
  // DB에 데이터 없으면 목업 fallback
  if (!tenantRoles.length) {
    tenantRoles = TENANT_ROLES_MOCK.filter(r => r.tenant_id === selTenantId);
  }

  // 사용자 배정 수 (DB에서 조회, 없으면 0)
  let allUserRoles = [];
  try { allUserRoles = await _sbGet('user_roles') || []; } catch(e) {}
  function countByRole(id) {
    return new Set(allUserRoles.filter(r => r.role_id === id || r.role_code === id).map(r => r.user_id)).size;
  }

  // ── 역할 계층 트리 재귀 렌더링 ─────────────────────────────────────────
  const levelColors = ['#4F46E5', '#0369A1', '#059669', '#D97706', '#7C3AED'];
  const renderedIds = new Set();

  function buildTree(parentId, depth) {
    const children = tenantRoles.filter(r => (r.parent_role_id || null) === parentId);
    if (!children.length) return '';
    let html = '';
    children.forEach(r => {
      renderedIds.add(r.id);
      const color = levelColors[Math.min(depth, levelColors.length - 1)];
      const cnt = countByRole(r.id);
      const indent = depth * 32;
      html += `
      <div style="display:flex;align-items:stretch;border-bottom:1px solid #F1F5F9">
        ${indent > 0 ? `
        <div style="width:${indent}px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;padding-right:4px">
          <div style="width:20px;height:1px;background:#D1D5DB"></div>
        </div>` : ''}
        <div style="flex:1;display:flex;align-items:center;gap:16px;padding:12px 18px;background:${depth===0?'#F8FAFC':'#fff'}">
          <!-- 역할 뱃지 -->
          <div style="padding:7px 12px;border-radius:8px;background:${color}15;border:1.5px solid ${color}30;min-width:140px;text-align:center;flex-shrink:0">
            <div style="font-size:12px;font-weight:800;color:${color};line-height:1.3">${r.name}</div>
            <div style="font-size:9px;color:${color};opacity:.65;margin-top:2px;font-family:monospace">${r.code}</div>
          </div>
          <!-- 설명 -->
          <div style="flex:1;font-size:12px;color:#64748B">${r.description || '-'}</div>
          <!-- 배정 인원 -->
          <div style="text-align:center;min-width:52px;flex-shrink:0">
            <div style="font-size:18px;font-weight:900;color:#0F172A">${cnt}</div>
            <div style="font-size:9px;color:#94A3B8">배정 인원</div>
          </div>
          <!-- 사용자 조회 버튼 -->
          <button onclick="_rmViewUsers('${r.id}','${r.name}')"
            style="padding:5px 10px;border:1px solid #CBD5E1;border-radius:6px;background:#fff;
                   font-size:11px;font-weight:700;cursor:pointer;color:#374151;flex-shrink:0">
            사용자 조회
          </button>
        </div>
      </div>`;
      html += buildTree(r.id, depth + 1);
    });
    return html;
  }

  let treeHtml = buildTree(null, 0);
  // 부모가 목록 밖에 있는 고아 노드 처리
  tenantRoles.filter(r => !renderedIds.has(r.id)).forEach(r => { treeHtml += buildTree(r.parent_role_id, 0); });
  if (!treeHtml) {
    treeHtml = `<div style="padding:48px;text-align:center;color:#94A3B8">
      <div style="font-size:32px;margin-bottom:12px">🔐</div>
      <div style="font-size:14px;font-weight:700">이 테넌트에 등록된 역할이 없습니다</div>
      <div style="font-size:12px;margin-top:6px">오른쪽 [+ 역할 추가] 버튼으로 역할을 생성하세요</div>
    </div>`;
  }

  // ── 테넌트 선택 드롭다운 (플랫폼 총괄만 보임) ──────────────────────────
  const tenantCtrl = isPlatform ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-weight:700;color:#64748B">테넌트 선택</span>
      <select onchange="window._rmFilterTenant=this.value;renderRoleMgmt()"
        style="padding:6px 12px;border:1.5px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;color:#1E293B;cursor:pointer;background:#fff">
        ${tenants.map(t => `<option value="${t.id}" ${t.id === selTenantId ? 'selected' : ''}>${t.name || t.id}</option>`).join('')}
      </select>
    </div>` : `
    <div style="padding:4px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px">
      <span style="font-size:12px;font-weight:700;color:#1D4ED8">🏢 ${selTenant?.name || selTenantId}</span>
    </div>`;

  el.innerHTML = `
<div class="bo-fade" style="max-width:980px">
  <!-- 헤더 -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:18px;font-weight:800;color:#0F172A;margin:0">🔐 역할 관리</h1>
      <p style="font-size:12px;color:#64748B;margin:4px 0 0">테넌트별로 독립된 역할 계층(총괄 → 운영)을 관리합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      ${tenantCtrl}
      <button onclick="_openRoleModal()"
        style="padding:8px 16px;background:#0B132B;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
        + 역할 추가
      </button>
    </div>
  </div>

  <!-- 범례 -->
  <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#4F46E515;border-radius:6px;border:1px solid #4F46E530">
      <div style="width:8px;height:8px;border-radius:50%;background:#4F46E5"></div>
      <span style="font-size:11px;font-weight:700;color:#4F46E5">테넌트 총괄관리자</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#0369A115;border-radius:6px;border:1px solid #0369A130">
      <div style="width:8px;height:8px;border-radius:50%;background:#0369A1"></div>
      <span style="font-size:11px;font-weight:700;color:#0369A1">예산 총괄관리자</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#05906915;border-radius:6px;border:1px solid #05906930">
      <div style="width:8px;height:8px;border-radius:50%;background:#059069"></div>
      <span style="font-size:11px;font-weight:700;color:#059069">예산 운영담당자</span>
    </div>
  </div>

  <!-- 트리 테이블 -->
  <div style="background:white;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden">
    <!-- 테이블 헤더 -->
    <div style="display:flex;align-items:center;padding:8px 18px;background:#1E293B">
      <div style="min-width:140px;font-size:10px;font-weight:800;color:#94A3B8;letter-spacing:.08em;text-transform:uppercase">역할명 / 코드</div>
      <div style="flex:1;font-size:10px;font-weight:800;color:#94A3B8;letter-spacing:.08em;text-transform:uppercase;padding-left:16px">설명</div>
      <div style="min-width:52px;font-size:10px;font-weight:800;color:#94A3B8;text-align:center">배정인원</div>
      <div style="width:80px"></div>
    </div>
    ${treeHtml}
  </div>

  <!-- 사용자 목록 패널 -->
  <div id="rm-users-panel" style="display:none;margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px"></div>
</div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 사용자 조회 패널
// ──────────────────────────────────────────────────────────────────────────────
window._rmViewUsers = async function(roleId, roleName) {
  const panel = document.getElementById('rm-users-panel');
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = `<p style="color:#9CA3AF;font-size:12px">조회 중...</p>`;
  let urList = [];
  try { urList = await _sbGet('user_roles', { role_id: roleId }) || []; } catch(e) {}
  if (!urList.length) {
    panel.innerHTML = `<p style="text-align:center;color:#9CA3AF;font-size:12px;padding:16px">
      <strong>${roleName}</strong>에 배정된 사용자가 없습니다.</p>`;
    return;
  }
  const ids = urList.map(r => r.user_id);
  let users = [];
  try { users = await _sbGet('users', { id: ids }) || []; } catch(e) {}
  panel.innerHTML = `
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px">${roleName} 배정 사용자 (${urList.length}명)</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${(users.length ? users : urList).map(u => `
        <span style="padding:5px 12px;background:white;border:1.5px solid #E2E8F0;border-radius:6px;font-size:12px;font-weight:700;color:#374151">
          ${u.name || u.user_id || u.id || '(이름없음)'}
          <span style="color:#94A3B8;font-weight:400;font-size:11px"> ${u.tenant_id ? `(${u.tenant_id})` : ''}</span>
        </span>`).join('')}
    </div>`;
};

// ──────────────────────────────────────────────────────────────────────────────
// 역할 수정 모달 (bo_roles.js 자체 보조 기능 유지)
// ──────────────────────────────────────────────────────────────────────────────
window._openRoleModal = async function(id) {
  // 기본적인 프롬프트 방식 (헤비 모달 미구현 시 간이 대응)
  const name = prompt('역할명을 입력하세요 (테넌트 코드 포함 권장)', id ? '' : `${window._rmFilterTenant || ''} `);
  if (!name) return;
  const desc = prompt('역할 설명:', '');
  const parentCode = prompt('상위 역할 코드 (없으면 빈칸):', '');
  const payload = {
    id: (window._rmFilterTenant + '_' + name.replace(/\s/g,'_').toLowerCase()).substring(0, 60),
    code: (window._rmFilterTenant + '_' + name.replace(/\s/g,'_').toLowerCase()).substring(0, 60),
    name, description: desc, parent_role_id: parentCode || null,
    tenant_id: window._rmFilterTenant, is_system: false
  };
  try {
    await _sbUpsert('roles', payload, 'id');
    renderRoleMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};
