// ─── 역할 관리: 테넌트별 독립 역할 계층 ─────────────────────────────────────
// bo_roles.js — 테넌트별 독립 역할 계층(총괄 → 운영)을 관리합니다.

// ──────────────────────────────────────────────────────────────────────────────
// 테넌트별 역할 목업 데이터 (DB 미연결 시 fallback)
// ──────────────────────────────────────────────────────────────────────────────
const TENANT_ROLES_MOCK = [
  // ── HMC (현대자동차) ──────────────────────────────────────────────────────
  { id: 'HMC_tenant_admin',   code: 'HMC_tenant_admin',   name: 'HMC 테넌트 총괄관리자',    description: '현대자동차 BO 전체 관리',        parent_role_id: null,               tenant_id: 'HMC' },
  { id: 'HMC_budget_gen',     code: 'HMC_budget_gen',     name: 'HMC 일반예산 총괄관리자',   description: 'HMC 일반교육예산 총괄 관리',     parent_role_id: 'HMC_tenant_admin', tenant_id: 'HMC' },
  { id: 'HMC_budget_rnd',     code: 'HMC_budget_rnd',     name: 'HMC R&D예산 총괄관리자',    description: 'HMC R&D교육예산 총괄 관리',      parent_role_id: 'HMC_tenant_admin', tenant_id: 'HMC' },
  { id: 'HMC_ops_gen_1',      code: 'HMC_ops_gen_1',      name: 'HMC 일반예산 운영담당자①',  description: 'HMC GPS 가상조직 예산 운영',     parent_role_id: 'HMC_budget_gen',   tenant_id: 'HMC' },
  { id: 'HMC_ops_gen_2',      code: 'HMC_ops_gen_2',      name: 'HMC 일반예산 운영담당자②',  description: 'HMC ETC 가상조직 예산 운영',     parent_role_id: 'HMC_budget_gen',   tenant_id: 'HMC' },
  { id: 'HMC_ops_rnd_1',      code: 'HMC_ops_rnd_1',      name: 'HMC R&D예산 운영담당자①',   description: 'HMC R&D 가상조직 예산 운영',     parent_role_id: 'HMC_budget_rnd',   tenant_id: 'HMC' },
  // ── KIA (기아자동차) ──────────────────────────────────────────────────────
  { id: 'KIA_tenant_admin',   code: 'KIA_tenant_admin',   name: 'KIA 테넌트 총괄관리자',     description: '기아자동차 BO 전체 관리',        parent_role_id: null,               tenant_id: 'KIA' },
  { id: 'KIA_budget_admin',   code: 'KIA_budget_admin',   name: 'KIA 예산 총괄관리자',       description: 'KIA 교육예산 총괄 관리',         parent_role_id: 'KIA_tenant_admin', tenant_id: 'KIA' },
  { id: 'KIA_ops_1',          code: 'KIA_ops_1',          name: 'KIA 예산 운영담당자①',      description: 'KIA 본사 가상조직 예산 운영',    parent_role_id: 'KIA_budget_admin', tenant_id: 'KIA' },
  { id: 'KIA_ops_2',          code: 'KIA_ops_2',          name: 'KIA 예산 운영담당자②',      description: 'KIA 생산 가상조직 예산 운영',    parent_role_id: 'KIA_budget_admin', tenant_id: 'KIA' },
  // ── HAE (현대오토에버) ────────────────────────────────────────────────────
  { id: 'HAE_tenant_admin',   code: 'HAE_tenant_admin',   name: 'HAE 테넌트 총괄관리자',     description: '현대오토에버 BO 전체 관리',      parent_role_id: null,               tenant_id: 'HAE' },
  { id: 'HAE_budget_admin',   code: 'HAE_budget_admin',   name: 'HAE 예산 총괄관리자',       description: 'HAE 교육예산 총괄 관리',         parent_role_id: 'HAE_tenant_admin', tenant_id: 'HAE' },
  { id: 'HAE_ops_1',          code: 'HAE_ops_1',          name: 'HAE 예산 운영담당자',       description: 'HAE 가상조직 예산 운영',          parent_role_id: 'HAE_budget_admin', tenant_id: 'HAE' },
  // ── ROTEM (현대로템) ──────────────────────────────────────────────────────
  { id: 'ROTEM_tenant_admin', code: 'ROTEM_tenant_admin', name: '로템 테넌트 총괄관리자',    description: '현대로템 BO 전체 관리',           parent_role_id: null,               tenant_id: 'ROTEM' },
  { id: 'ROTEM_budget_admin', code: 'ROTEM_budget_admin', name: '로템 예산 총괄관리자',      description: '로템 교육예산 총괄 관리',         parent_role_id: 'ROTEM_tenant_admin', tenant_id: 'ROTEM' },
  { id: 'ROTEM_ops_1',        code: 'ROTEM_ops_1',        name: '로템 예산 운영담당자',      description: '로템 가상조직 예산 운영',          parent_role_id: 'ROTEM_budget_admin', tenant_id: 'ROTEM' },
  // ── HEC (현대엔지니어링) ──────────────────────────────────────────────────
  { id: 'HEC_tenant_admin',   code: 'HEC_tenant_admin',   name: '엔지 테넌트 총괄관리자',    description: '현대엔지니어링 BO 전체 관리',    parent_role_id: null,               tenant_id: 'HEC' },
  { id: 'HEC_budget_admin',   code: 'HEC_budget_admin',   name: '엔지 예산 총괄관리자',      description: '엔지 교육예산 총괄 관리',         parent_role_id: 'HEC_tenant_admin', tenant_id: 'HEC' },
  { id: 'HEC_ops_1',          code: 'HEC_ops_1',          name: '엔지 예산 운영담당자',      description: '엔지 가상조직 예산 운영',          parent_role_id: 'HEC_budget_admin', tenant_id: 'HEC' },
  // ── HSC (현대제철) ────────────────────────────────────────────────────────
  { id: 'HSC_tenant_admin',   code: 'HSC_tenant_admin',   name: '제철 테넌트 총괄관리자',    description: '현대제철 BO 전체 관리',           parent_role_id: null,               tenant_id: 'HSC' },
  { id: 'HSC_budget_admin',   code: 'HSC_budget_admin',   name: '제철 예산 총괄관리자',      description: '제철 교육예산 총괄 관리',         parent_role_id: 'HSC_tenant_admin', tenant_id: 'HSC' },
  { id: 'HSC_ops_1',          code: 'HSC_ops_1',          name: '제철 예산 운영담당자',      description: '제철 가상조직 예산 운영',          parent_role_id: 'HSC_budget_admin', tenant_id: 'HSC' },
  // ── HTS (현대트랜시스) ────────────────────────────────────────────────────
  { id: 'HTS_tenant_admin',   code: 'HTS_tenant_admin',   name: '트랜시 테넌트 총괄관리자',  description: '현대트랜시스 BO 전체 관리',       parent_role_id: null,               tenant_id: 'HTS' },
  { id: 'HTS_budget_admin',   code: 'HTS_budget_admin',   name: '트랜시 예산 총괄관리자',    description: '트랜시 교육예산 총괄 관리',       parent_role_id: 'HTS_tenant_admin', tenant_id: 'HTS' },
  { id: 'HTS_ops_1',          code: 'HTS_ops_1',          name: '트랜시 예산 운영담당자',    description: '트랜시 가상조직 예산 운영',        parent_role_id: 'HTS_budget_admin', tenant_id: 'HTS' },
  // ── GLOVIS (현대글로비스) ─────────────────────────────────────────────────
  { id: 'GLOVIS_tenant_admin',code: 'GLOVIS_tenant_admin',name: '글로비스 테넌트 총괄관리자', description: '현대글로비스 BO 전체 관리',       parent_role_id: null,               tenant_id: 'GLOVIS' },
  { id: 'GLOVIS_budget_admin',code: 'GLOVIS_budget_admin',name: '글로비스 예산 총괄관리자',   description: '글로비스 교육예산 총괄 관리',     parent_role_id: 'GLOVIS_tenant_admin', tenant_id: 'GLOVIS' },
  { id: 'GLOVIS_ops_1',       code: 'GLOVIS_ops_1',       name: '글로비스 예산 운영담당자',   description: '글로비스 가상조직 예산 운영',     parent_role_id: 'GLOVIS_budget_admin', tenant_id: 'GLOVIS' },
  // ── HIS (현대차증권) ──────────────────────────────────────────────────────
  { id: 'HIS_tenant_admin',   code: 'HIS_tenant_admin',   name: '차증권 테넌트 총괄관리자',  description: '현대차증권 BO 전체 관리',         parent_role_id: null,               tenant_id: 'HIS' },
  { id: 'HIS_budget_admin',   code: 'HIS_budget_admin',   name: '차증권 예산 총괄관리자',    description: '차증권 교육예산 총괄 관리',       parent_role_id: 'HIS_tenant_admin', tenant_id: 'HIS' },
  { id: 'HIS_ops_1',          code: 'HIS_ops_1',          name: '차증권 예산 운영담당자',    description: '차증권 가상조직 예산 운영',        parent_role_id: 'HIS_budget_admin', tenant_id: 'HIS' },
  // ── KEFICO ────────────────────────────────────────────────────────────────
  { id: 'KEFICO_tenant_admin',code: 'KEFICO_tenant_admin',name: '케피코 테넌트 총괄관리자',  description: 'KEFICO BO 전체 관리',             parent_role_id: null,               tenant_id: 'KEFICO' },
  { id: 'KEFICO_budget_admin',code: 'KEFICO_budget_admin',name: '케피코 예산 총괄관리자',    description: '케피코 교육예산 총괄 관리',       parent_role_id: 'KEFICO_tenant_admin', tenant_id: 'KEFICO' },
  { id: 'KEFICO_ops_1',       code: 'KEFICO_ops_1',       name: '케피코 예산 운영담당자',    description: '케피코 가상조직 예산 운영',        parent_role_id: 'KEFICO_budget_admin', tenant_id: 'KEFICO' },
  // ── HISC (ISC) ────────────────────────────────────────────────────────────
  { id: 'HISC_tenant_admin',  code: 'HISC_tenant_admin',  name: 'ISC 테넌트 총괄관리자',    description: 'ISC BO 전체 관리',                parent_role_id: null,               tenant_id: 'HISC' },
  { id: 'HISC_budget_admin',  code: 'HISC_budget_admin',  name: 'ISC 예산 총괄관리자',      description: 'ISC 교육예산 총괄 관리',          parent_role_id: 'HISC_tenant_admin', tenant_id: 'HISC' },
  { id: 'HISC_ops_1',         code: 'HISC_ops_1',         name: 'ISC 예산 운영담당자',      description: 'ISC 가상조직 예산 운영',           parent_role_id: 'HISC_budget_admin', tenant_id: 'HISC' },
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

  // ── Bug Fix: role_code 기준으로 배정인원 카운트 ──────────────────────────
  let allUserRoles = [];
  try {
    if (_sb()) {
      const { data } = await _sb().from('user_roles').select('role_code,user_id').eq('tenant_id', selTenantId);
      allUserRoles = data || [];
    }
  } catch(e) {}
  function countByRole(roleCode) {
    return new Set(allUserRoles.filter(r => r.role_code === roleCode).map(r => r.user_id)).size;
  }

  // ── 역할 계층 트리 재귀 렌더링 ─────────────────────────────────────────
  const levelColors = ['#4F46E5', '#0369A1', '#059669', '#D97706', '#7C3AED'];
  const renderedIds = new Set();

  function buildTree(parentId, depth) {
    const children = tenantRoles.filter(r => (r.parent_role_id || null) === parentId);
    if (!children.length) return '';
    let html = '';
    children.forEach(r => {
      renderedIds.add(r.code);
      const color = levelColors[Math.min(depth, levelColors.length - 1)];
      const cnt = countByRole(r.code);
      // cntId: 배정/해제 시 즉시 숫자 업데이트용
      const cntId = 'rm-cnt-' + r.code.replace(/[^a-z0-9]/gi, '_');
      const safeName = r.name.replace(/'/g, "&#39;");
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
            <div style="font-size:12px;font-weight:800;color:${color};line-height:1.3">
              ${r.name}
              <button onclick="event.stopPropagation(); _rmEditRoleName('${r.code}', '${safeName}')" title="역할명 수정"
                style="border:none;background:none;cursor:pointer;font-size:11px;padding:0 0 0 4px;opacity:0.6">✏️</button>
            </div>
            <div style="font-size:9px;color:${color};opacity:.65;margin-top:2px;font-family:monospace">${r.code}</div>
          </div>
          <!-- 설명 -->
          <div style="flex:1;font-size:12px;color:#64748B">${r.description || '-'}</div>
          <!-- 배정 인원 (id 속성으로 즉시 업데이트 가능) -->
          <div style="text-align:center;min-width:52px;flex-shrink:0">
            <div id="${cntId}" style="font-size:18px;font-weight:900;color:#0F172A">${cnt}</div>
            <div style="font-size:9px;color:#94A3B8">배정 인원</div>
          </div>
          <!-- 사용자 조회 버튼 (Bug Fix: r.code 올바르게 전달) -->
          <button onclick="_rmViewUsers('${r.code}','${safeName}')"
            style="padding:5px 10px;border:1px solid #CBD5E1;border-radius:6px;background:#fff;
                   font-size:11px;font-weight:700;cursor:pointer;color:#374151;flex-shrink:0">
            사용자 조회
          </button>
        </div>
      </div>`;
      html += buildTree(r.code, depth + 1);
    });
    return html;
  }

  let treeHtml = buildTree(null, 0);
  // 부모가 목록 밖에 있는 고아 노드 처리
  tenantRoles.filter(r => !renderedIds.has(r.code)).forEach(r => { treeHtml += buildTree(r.parent_role_id, 0); });
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
<div class="bo-fade" style="max-width:1320px">
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

  <!-- 2컬럼 레이아웃: 역할 트리(좌) + 담당자 패널(우) -->
  <div style="display:grid;grid-template-columns:1fr 400px;gap:16px;align-items:start">
    <!-- 왼쪽: 역할 트리 테이블 -->
    <div id="rm-tree-wrap">
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
    </div>

    <!-- 오른쪽: 담당자 패널 (사용자 조회 버튼 클릭 시 나타남) -->
    <div id="rm-users-panel" style="display:none;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;position:sticky;top:16px"></div>
  </div>
</div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// 역할별 담당자 인라인 관리 패널
// ──────────────────────────────────────────────────────────────────────────────
window._rmViewUsers = async function(roleCode, roleName) {
  const panel = document.getElementById('rm-users-panel');
  if (!panel) return;
  // 같은 역할 재클릭 시 토글 닫기
  if (panel.dataset.role === roleCode && panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }
  panel.dataset.role = roleCode;
  panel.style.display = 'block';
  panel.innerHTML = '<p style="color:#9CA3AF;font-size:12px">조회 중...</p>';
  await _rmRefreshPanel(roleCode, roleName, panel);
};

async function _rmRefreshPanel(roleCode, roleName, panel) {
  panel.innerHTML = '<p style="color:#9CA3AF;font-size:12px">조회 중...</p>';

  const tenantId = window._rmFilterTenant;

  // ① 현재 배정된 user_id 목록 (role_code 기준 — Bug Fix)
  let urList = [];
  try {
    if (_sb()) {
      const { data } = await _sb().from('user_roles').select('*').eq('role_code', roleCode);
      urList = data || [];
    }
  } catch(e) {}
  const assignedIds = new Set(urList.map(r => r.user_id));

  // ② 배정된 사용자 상세
  let assignedUsers = [];
  if (assignedIds.size) {
    try {
      if (_sb()) {
        const { data } = await _sb().from('users').select('id,name,emp_no,email,job_type').in('id', [...assignedIds]);
        assignedUsers = data || [];
      }
    } catch(e) {}
    if (!assignedUsers.length) assignedUsers = [...assignedIds].map(id => ({ id, name: id }));
  }

  // ③ 테넌트 전체 사용자 로드 (클라이언트 필터용)
  let tenantUsers = [];
  try {
    if (_sb()) {
      const { data } = await _sb().from('users').select('id,name,emp_no,email,job_type').eq('tenant_id', tenantId);
      tenantUsers = data || [];
    }
  } catch(e) {}
  if (!tenantUsers.length && typeof MOCK_BO_USERS !== 'undefined') {
    tenantUsers = (MOCK_BO_USERS || []).filter(u => u.tenant_id === tenantId);
  }

  // 전역 캐시 (검색 시 재사용)
  window._rmTenantUsers    = tenantUsers;
  window._rmAssignedIds    = assignedIds;
  window._rmCurrentRole    = roleCode;
  window._rmCurrentRoleName = roleName;

  const assignedHtml = assignedUsers.length ? assignedUsers.map(u => `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 12px;background:white;
         border:1.5px solid #E2E8F0;border-radius:8px;font-size:12px;font-weight:700;color:#374151">
      <span style="font-size:15px">👤</span>
      <div>
        <div>${u.name || '(이름없음)'}</div>
        <div style="font-size:10px;color:#94A3B8;font-weight:400">${u.emp_no||u.id||''} · ${u.job_type||'general'}</div>
      </div>
      <button onclick="_rmRemoveUser('${roleCode}','${u.id}','${roleName}')"
        style="margin-left:auto;padding:2px 8px;background:#FEF2F2;border:1px solid #FECACA;border-radius:5px;
               color:#DC2626;font-size:10px;font-weight:700;cursor:pointer">✕ 해제</button>
    </div>`).join('') : `<p style="color:#94A3B8;font-size:12px;margin:0">아직 배정된 담당자가 없습니다.</p>`;

  // ④ 미배정 사용자 목록
  const availableHtml = _rmBuildAvailableHtml(tenantUsers, assignedIds, roleCode, roleName);

  panel.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div>
      <span style="font-size:14px;font-weight:800;color:#0F172A">👥 ${roleName}</span>
      <span style="font-size:11px;color:#64748B;margin-left:8px">담당자 관리</span>
      <span style="font-size:10px;font-weight:700;color:#3B82F6;margin-left:6px;background:#EFF6FF;padding:2px 8px;border-radius:10px">${tenantId} · 사용자 ${tenantUsers.length}명</span>
    </div>
    <button onclick="document.getElementById('rm-users-panel').style.display='none'"
      style="padding:4px 10px;background:#F1F5F9;border:none;border-radius:6px;font-size:11px;cursor:pointer;color:#64748B">✕ 닫기</button>
  </div>

  <!-- 현재 담당자 -->
  <div style="margin-bottom:16px">
    <div style="font-size:10px;font-weight:800;color:#64748B;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">
      현재 담당자 (${assignedUsers.length}명)
    </div>
    <div id="rm-assigned-list" style="display:flex;gap:8px;flex-wrap:wrap">
      ${assignedHtml}
    </div>
  </div>

  <!-- 담당자 추가 (전체 목록 + 실시간 필터) -->
  <div style="background:white;border:1.5px solid #E2E8F0;border-radius:10px;padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-size:10px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:.06em">담당자 추가</span>
      <span style="font-size:10px;color:#94A3B8">이름 또는 사번 입력 시 실시간 필터</span>
    </div>
    <input id="rm-filter-input" placeholder="이름 또는 사번으로 즉시 필터"
      style="width:100%;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:6px;font-size:12px;
             box-sizing:border-box;margin-bottom:10px"
      oninput="_rmFilterUsers(this.value)">
    <div id="rm-user-list" style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto">
      ${availableHtml || '<p style="font-size:11px;color:#94A3B8;text-align:center;padding:12px">배정 가능한 사용자가 없습니다</p>'}
    </div>
  </div>`;
}

/** 배정 가능한 사용자 목록 HTML 생성 (클라이언트 필터 공용) */
function _rmBuildAvailableHtml(users, assignedIds, roleCode, roleName) {
  const safeName = (roleName || '').replace(/'/g, "&#39;");
  const candidates = users.filter(u => !assignedIds.has(u.id));
  if (!candidates.length) return '';
  return candidates.map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid #F1F5F9;
         border-radius:7px;background:#FAFAFA" data-name="${(u.name||'').toLowerCase()}" data-empno="${(u.emp_no||'').toLowerCase()}">
      <span style="font-size:14px">👤</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:#1E293B">${u.name || '(이름없음)'}</div>
        <div style="font-size:10px;color:#94A3B8">${u.emp_no || u.id || ''} · ${u.job_type || 'general'}</div>
      </div>
      <button onclick="_rmAssignUser('${roleCode}','${u.id}','${safeName}')"
        style="padding:4px 12px;background:#0B132B;color:#fff;border:none;border-radius:5px;
               font-size:10px;font-weight:700;cursor:pointer;flex-shrink:0">+ 배정</button>
    </div>`).join('');
}

/** 실시간 클라이언트 필터 */
window._rmFilterUsers = function(q) {
  const list = document.getElementById('rm-user-list');
  if (!list) return;
  const kw = (q || '').toLowerCase().trim();
  const users = window._rmTenantUsers || [];
  const assignedIds = window._rmAssignedIds || new Set();
  const roleCode = window._rmCurrentRole;
  const roleName = window._rmCurrentRoleName;
  const filtered = kw
    ? users.filter(u => !assignedIds.has(u.id) && (
        (u.name || '').toLowerCase().includes(kw) ||
        (u.emp_no || '').toLowerCase().includes(kw)
      ))
    : users.filter(u => !assignedIds.has(u.id));
  list.innerHTML = filtered.length
    ? _rmBuildAvailableHtml(filtered, assignedIds, roleCode, roleName)
    : '<p style="font-size:11px;color:#94A3B8;text-align:center;padding:12px">검색 결과가 없습니다</p>';
};

// ── 배정 (Bug Fix: tenant_id 포함, 카운트 즉시 업데이트) ─────────────────
window._rmAssignUser = async function(roleCode, userId, roleName) {
  try {
    if (_sb()) {
      const tenantId = window._rmFilterTenant;
      const { error } = await _sb().from('user_roles').upsert(
        { role_code: roleCode, user_id: userId, scope_id: 'role_assignment', tenant_id: tenantId },
        { onConflict: 'user_id,role_code,scope_id' }
      );
      if (error) throw error;
    }
    // 즉시 카운트 업데이트 (전체 재렌더 없이)
    const cntId = 'rm-cnt-' + roleCode.replace(/[^a-z0-9]/gi, '_');
    const cntEl = document.getElementById(cntId);
    if (cntEl) cntEl.textContent = String(parseInt(cntEl.textContent || '0') + 1);
    // 패널 새로고침
    const panel = document.getElementById('rm-users-panel');
    await _rmRefreshPanel(roleCode, roleName, panel);
  } catch(e) { alert('배정 실패: ' + e.message); }
};

// ── 해제 (카운트 즉시 업데이트) ─────────────────────────────────────────
window._rmRemoveUser = async function(roleCode, userId, roleName) {
  if (!confirm('이 담당자의 역할 배정을 해제하시겠습니까?')) return;
  try {
    if (_sb()) {
      const { error } = await _sb().from('user_roles')
        .delete().eq('role_code', roleCode).eq('user_id', userId);
      if (error) throw error;
    }
    // 즉시 카운트 업데이트
    const cntId = 'rm-cnt-' + roleCode.replace(/[^a-z0-9]/gi, '_');
    const cntEl = document.getElementById(cntId);
    if (cntEl) cntEl.textContent = String(Math.max(0, parseInt(cntEl.textContent || '0') - 1));
    const panel = document.getElementById('rm-users-panel');
    await _rmRefreshPanel(roleCode, roleName, panel);
  } catch(e) { alert('해제 실패: ' + e.message); }
};



// ──────────────────────────────────────────────────────────────────────────────
// 역할 추가/수정 모달
// ──────────────────────────────────────────────────────────────────────────────
window._openRoleModal = async function(parentCode) {
  // 현재 테넌트 역할 목록 로드 (부모 선택 드롭다운용)
  let roles = [];
  try { roles = await _sbGet('roles', { tenant_id: window._rmFilterTenant }) || []; } catch(e) {}
  if (!roles.length && typeof TENANT_ROLES_MOCK !== 'undefined') {
    roles = TENANT_ROLES_MOCK.filter(r => r.tenant_id === window._rmFilterTenant);
  }

  const parentOptions = [
    `<option value="">── 없음 (최상위 역할)</option>`,
    ...roles.map(r => `<option value="${r.code}" ${r.code === parentCode ? 'selected' : ''}>${r.name} (${r.code})</option>`)
  ].join('');

  const tenantId = window._rmFilterTenant || '';
  const suggCode = tenantId + '_';

  // 기존 모달 제거
  document.getElementById('_roleModal')?.remove();

  const modal = document.createElement('div');
  modal.id = '_roleModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
  <div style="background:#fff;border-radius:14px;padding:28px 32px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <h3 style="font-size:16px;font-weight:800;margin:0 0 20px;color:#0F172A">🔐 역할 추가</h3>
    <div style="display:grid;gap:14px">
      <label style="font-size:11px;font-weight:700;color:#64748B">역할 코드
        <input id="_rm_code" value="${suggCode}" placeholder="예: HMC_budget_gen"
          style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #CBD5E1;
                 border-radius:6px;font-size:12px;box-sizing:border-box">
      </label>
      <label style="font-size:11px;font-weight:700;color:#64748B">역할 이름
        <input id="_rm_name" placeholder="예: HMC 일반예산 총괄관리자"
          style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #CBD5E1;
                 border-radius:6px;font-size:12px;box-sizing:border-box">
      </label>
      <label style="font-size:11px;font-weight:700;color:#64748B">역할 설명
        <input id="_rm_desc" placeholder="역할 범위를 간략히 설명하세요"
          style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #CBD5E1;
                 border-radius:6px;font-size:12px;box-sizing:border-box">
      </label>
      <label style="font-size:11px;font-weight:700;color:#64748B">용도 (타입)
        <select id="_rm_service_type"
          style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #CBD5E1;
                 border-radius:6px;font-size:12px;background:#fff;cursor:pointer">
          <option value="budget">지원제도 (예산)</option>
          <option value="cert">자격증</option>
          <option value="language">어학점수</option>
          <option value="badge">뱃지</option>
        </select>
      </label>
      <label style="font-size:11px;font-weight:700;color:#64748B">상위 역할
        <select id="_rm_parent"
          style="display:block;width:100%;margin-top:4px;padding:8px 10px;border:1.5px solid #CBD5E1;
                 border-radius:6px;font-size:12px;background:#fff;cursor:pointer">
          ${parentOptions}
        </select>
      </label>
    </div>
    <div style="display:flex;gap:10px;margin-top:22px;justify-content:flex-end">
      <button onclick="document.getElementById('_roleModal').remove()"
        style="padding:8px 18px;border:1.5px solid #E2E8F0;border-radius:6px;background:#fff;
               font-size:12px;font-weight:700;cursor:pointer;color:#64748B">취소</button>
      <button onclick="_saveNewRole()"
        style="padding:8px 18px;background:#0B132B;color:#fff;border:none;border-radius:6px;
               font-size:12px;font-weight:700;cursor:pointer">저장</button>
    </div>
  </div>`;
  document.body.appendChild(modal);

  // 배경 클릭 시 닫기
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window._saveNewRole = async function() {
  const code    = document.getElementById('_rm_code')?.value.trim();
  const name    = document.getElementById('_rm_name')?.value.trim();
  const desc    = document.getElementById('_rm_desc')?.value.trim();
  const parent  = document.getElementById('_rm_parent')?.value || null;
  const sType   = document.getElementById('_rm_service_type')?.value || 'budget';
  if (!code || !name) { alert('역할 코드와 이름은 필수입니다.'); return; }

  const payload = {
    code, name, description: desc,
    parent_role_id: parent || null,
    tenant_id: window._rmFilterTenant || null,
    service_type: sType,
    is_system: false, level: 10
  };
  try {
    if (_sb()) {
      const { error } = await _sb().from('roles').upsert(payload, { onConflict: 'code' });
      if (error) throw error;
    }
    document.getElementById('_roleModal')?.remove();
    renderRoleMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};

// ── 역할명 수정 기능 ──────────────────────────────────────────────────────────
window._rmEditRoleName = async function(roleCode, currentName) {
  const newName = prompt('새로운 역할명을 입력하세요:', currentName);
  if (!newName || newName.trim() === currentName) return;

  try {
    if (typeof _sb === 'function' && _sb()) {
      const { error } = await _sb().from('roles').update({ name: newName.trim() }).eq('code', roleCode);
      if (error) throw error;
    } else {
      // Mock 업데이트
      const role = TENANT_ROLES_MOCK.find(r => r.code === roleCode);
      if (role) role.name = newName.trim();
    }
    renderRoleMgmt(); // 성공 시 리렌더링
  } catch(e) { 
    alert('역할명 수정 중 오류가 발생했습니다.\\n' + e.message);
  }
};
