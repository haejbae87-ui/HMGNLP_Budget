// ─── Supabase 클라이언트 초기화 ──────────────────────────────────────────────
// CDN에서 로드된 @supabase/supabase-js 를 사용 (backoffice.html, index.html에 추가)

const SUPABASE_URL  = 'https://wihsojhucgmcdfpufonf.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE';

// supabase-js CDN이 로드된 후 클라이언트 생성
let _sbClient = null;
function getSB() {
  if (!_sbClient) {
    if (typeof window !== 'undefined' && window.supabase) {
      _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    }
  }
  return _sbClient;
}

// ─── 데이터 로더 함수 ─────────────────────────────────────────────────────────
// 각 함수는 promise를 반환. 실패 시 기존 JS 데이터로 fallback.

// ─── TENANTS 색상 팔레트 (DB에 없으므로 JS에서 머지) ─────────────────────────
const _TENANT_COLORS = {
  HMC:    { color: '#002C5F', bg: '#EFF6FF',  border: '#BFDBFE' },
  KIA:    { color: '#05141F', bg: '#F0FDF4',  border: '#BBF7D0' },
  HAE:    { color: '#7C3AED', bg: '#F5F3FF',  border: '#DDD6FE' },
  HSC:    { color: '#BE123C', bg: '#FFF1F2',  border: '#FECDD3' },
  ROTEM:  { color: '#B45309', bg: '#FFFBEB',  border: '#FDE68A' },
  HEC:    { color: '#0369A1', bg: '#F0F9FF',  border: '#BAE6FD' },
  HTS:    { color: '#6D28D9', bg: '#F5F3FF',  border: '#DDD6FE' },
  GLOVIS: { color: '#0E7490', bg: '#ECFEFF',  border: '#A5F3FC' },
  HIS:    { color: '#9D174D', bg: '#FDF2F8',  border: '#FBCFE8' },
  KEFICO: { color: '#1D4ED8', bg: '#EFF6FF',  border: '#BFDBFE' },
  HISC:   { color: '#374151', bg: '#F9FAFB',  border: '#E5E7EB' },
  SYSTEM: { color: '#6B7280', bg: '#F9FAFB',  border: '#E5E7EB' },
};

async function sbLoadTenants() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=*&active=eq.true&order=id`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // DB 데이터 + JS 색상 팔레트 머지
    return data.map(t => ({ ...t, ...(_TENANT_COLORS[t.id] || _TENANT_COLORS.SYSTEM), budgetMode:'full' }));
  } catch (e) {
    console.warn('[Supabase] tenants fallback to mock:', e.message);
    return typeof TENANTS !== 'undefined' ? TENANTS : [];
  }
}

async function sbLoadAccountMaster(tenantId = null) {
  try {
    let q = getSB().from('account_master').select('*').eq('active', true);
    if (tenantId) q = q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    const { data, error } = await q.order('code');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] account_master fallback:', e.message);
    return ACCOUNT_MASTER;
  }
}

async function sbLoadIsolationGroups(tenantId = null) {
  try {
    let url = `${SUPABASE_URL}/rest/v1/isolation_groups?select=*&status=eq.active&order=id`;
    if (tenantId) url += `&tenant_id=eq.${tenantId}`;
    const res = await fetch(url,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // snake_case → camelCase 정규화 (JS 코드 전체와 호환)
    return data.map(g => ({
      ...g,
      tenantId:        g.tenant_id,
      desc:            g.descr || '',
      ownedAccounts:   g.owned_accounts || [],
      globalAdminKey:  g.global_admin_key || '',
      globalAdminKeys: g.global_admin_key ? [g.global_admin_key] : [],
      opManagerKeys:   g.op_manager_keys || [],
      createdAt:       (g.created_at || '').slice(0, 10),
    }));
  } catch (e) {
    console.warn('[Supabase] isolation_groups fallback:', e.message);
    return typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS : [];
  }
}

async function sbLoadServicePolicies(filters = {}) {
  try {
    let q = getSB().from('service_policies').select('*').eq('status', 'active');
    if (filters.tenantId)         q = q.eq('tenant_id', filters.tenantId);
    if (filters.isolationGroupId) q = q.eq('isolation_group_id', filters.isolationGroupId);
    if (filters.accountCode)      q = q.contains('account_codes', [filters.accountCode]);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] service_policies fallback:', e.message);
    return SERVICE_POLICIES;
  }
}

async function sbSaveServicePolicy(policy) {
  try {
    const { data, error } = await getSB()
      .from('service_policies')
      .upsert(policy, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data[0];
  } catch (e) {
    console.error('[Supabase] service_policy 저장 실패:', e.message);
    throw e;
  }
}

async function sbLoadPlans(filters = {}) {
  try {
    let q = getSB().from('plans').select('*');
    if (filters.tenantId)    q = q.eq('tenant_id', filters.tenantId);
    if (filters.accountCode) q = q.eq('account_code', filters.accountCode);
    if (filters.status)      q = q.eq('status', filters.status);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] plans fallback:', e.message);
    return MOCK_BO_PLANS;
  }
}

async function sbLoadApplications(filters = {}) {
  try {
    let q = getSB().from('applications').select('*');
    if (filters.tenantId)    q = q.eq('tenant_id', filters.tenantId);
    if (filters.accountCode) q = q.eq('account_code', filters.accountCode);
    if (filters.status)      q = q.eq('status', filters.status);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] applications fallback:', e.message);
    return MOCK_BO_APPLICATIONS;
  }
}

// ─── 가상조직 템플릿 로더 ─────────────────────────────────────────────────────
async function sbLoadVirtualOrgTemplates(filters = {}) {
  try {
    let q = getSB().from('virtual_org_templates').select('*');
    if (filters.tenantId)          q = q.eq('tenant_id', filters.tenantId);
    if (filters.isolationGroupId)  q = q.eq('isolation_group_id', filters.isolationGroupId);
    const { data, error } = await q.order('created_at');
    if (error) throw error;
    // DB 컬럼(snake_case) → JS mock 형식(camelCase) 정규화
    return (data || []).map(t => ({
      ...t,
      tenantId: t.tenant_id,
      isolationGroupId: t.isolation_group_id,
    }));
  } catch (e) {
    console.warn('[Supabase] virtual_org_templates fallback:', e.message);
    return typeof VIRTUAL_ORG_TEMPLATES !== 'undefined' ? VIRTUAL_ORG_TEMPLATES : [];
  }
}
window.sbLoadVirtualOrgTemplates = sbLoadVirtualOrgTemplates;

async function sbSaveVirtualOrgTemplate(tplObj) {
  try {
    const row = {
      id: tplObj.id,
      tenant_id: tplObj.tenantId,
      isolation_group_id: tplObj.isolationGroupId || null,
      name: tplObj.name,
      tree: tplObj.tree,
    };
    // JS SDK 대신 fetch 직접 호출 (getSB() 초기화 타이밍 문제 우회)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/virtual_org_templates`,
      {
        method : 'POST',
        headers: {
          'apikey'       : SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type' : 'application/json',
          'Prefer'       : 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(row),
      }
    );
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
    return true;
  } catch(e) {
    console.error('[Supabase] virtual_org_templates 저장 실패:', e.message);
    return false;
  }
}
window.sbSaveVirtualOrgTemplate = sbSaveVirtualOrgTemplate;

async function sbDeleteVirtualOrgTemplate(id) {
  try {
    const { error } = await getSB().from('virtual_org_templates').delete().eq('id', id);
    if(error) throw error;
    return true;
  } catch(e) {
    console.error('[Supabase] virtual_org_templates 삭제 실패:', e.message);
    return false;
  }
}
window.sbDeleteVirtualOrgTemplate = sbDeleteVirtualOrgTemplate;

// ─── 역할별 메뉴 권한 로더 ────────────────────────────────────────────────────
// role_menu_permissions 테이블 → window._roleMenuPerms: Map<role_code, Set<menu_id>>
window._roleMenuPerms = null;  // null = 아직 미로드, {} = 로드 완료(빈 값도 포함)

async function sbLoadRoleMenuPerms() {
  try {
    const { data, error } = await getSB().from('role_menu_permissions').select('role_code, menu_id');
    if (error) throw error;
    const map = {};
    (data || []).forEach(({ role_code, menu_id }) => {
      if (!map[role_code]) map[role_code] = new Set();
      map[role_code].add(menu_id);
    });
    window._roleMenuPerms = map;
    console.log(`[Supabase] ✅ role_menu_permissions 로드: ${Object.keys(map).length}개 역할, ${data.length}건`);
    return map;
  } catch (e) {
    console.warn('[Supabase] role_menu_permissions 로드 실패 → accessMenus 폴백 사용:', e.message);
    window._roleMenuPerms = {};  // 빈 객체 = 로드 시도 완료 (폴백 모드)
    return {};
  }
}

// 페르소나 role값 → DB role_code 매핑 (보정 테이블)
const _ROLE_ALIAS = {
  'tenant_global_admin': 'tenant_admin',
  'budget_global_admin': 'budget_admin',
  'budget_op_manager':   'budget_ops',
  'budget_hq':           'budget_ops',
};
function _resolveRole(role) { return _ROLE_ALIAS[role] || role; }

// 역할 배열로 메뉴 접근 가능 여부 확인 (boNavigate에서 사용)
function checkMenuAccess(menuId, roles, fallbackMenus) {
  // DB 권한이 로드됐으면 DB 기준 (role alias 포함)
  if (window._roleMenuPerms && Object.keys(window._roleMenuPerms).length > 0) {
    return (roles || []).some(role => window._roleMenuPerms[_resolveRole(role)]?.has(menuId));
  }
  // 폴백: bo_data.js의 accessMenus 배열
  return (fallbackMenus || []).includes(menuId);
}
window.checkMenuAccess = checkMenuAccess;

// 역할 배열로 접근 가능한 전체 메뉴 Set 반환 (사이드바 렌더링에 사용)
function getAllowedMenuSet(roles, fallbackMenus) {
  if (window._roleMenuPerms && Object.keys(window._roleMenuPerms).length > 0) {
    const allowed = new Set();
    (roles || []).forEach(role => {
      (window._roleMenuPerms[_resolveRole(role)] || new Set()).forEach(m => allowed.add(m));
    });
    return allowed;
  }
  return new Set(fallbackMenus || []);
}
window.getAllowedMenuSet = getAllowedMenuSet;

// ─── 사용자/역할 로더 → BO_PERSONAS 동적 빌드 ────────────────────────────────
const _ROLE_CODE_TO_JS = {
  platform_admin: 'platform_admin',
  tenant_admin:   'tenant_global_admin',
  budget_admin:   'budget_global_admin',
  budget_ops:     'budget_op_manager',
  learner:        'learner',
};

async function sbLoadPersonas() {
  try {
    // 1. users + user_roles 동시 로드
    const [usersRes, rolesRes, orgsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/users?select=*&status=eq.active`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=*`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }),
      fetch(`${SUPABASE_URL}/rest/v1/organizations?select=id,name,type`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }),
    ]);
    const users    = await usersRes.json();
    const allRoles = await rolesRes.json();
    const orgs     = await orgsRes.json();

    // 2. org 맵 (id → name)
    const orgMap = {};
    (orgs || []).forEach(o => { orgMap[o.id] = o.name; });

    // 3. user_id별 역할 그룹화
    const rolesByUser = {};
    (allRoles || []).forEach(r => {
      if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
      rolesByUser[r.user_id].push(r);
    });

    // 역할 우선순위 (level 낮을수록 높은 권한)
    const _ROLE_LEVEL = {
      platform_admin: 1, tenant_admin: 2, budget_admin: 3, budget_ops: 4, learner: 99
    };

    // 4. BO_PERSONAS 객체 빌드
    const personas = {};
    users.forEach(u => {
      const userRoles = rolesByUser[u.id] || [];
      if (!userRoles.length) return; // 역할 없는 사용자는 제외

      // learner 전용이면 메뉴 접근 없어 BO에서 제외
      const nonLearnerRoles = userRoles.filter(r => r.role_code !== 'learner');
      if (!nonLearnerRoles.length) return;

      // 가장 높은 권한(=level 낮은) 역할을 primary role로
      const sorted = [...nonLearnerRoles].sort(
        (a, b) => (_ROLE_LEVEL[a.role_code] || 99) - (_ROLE_LEVEL[b.role_code] || 99)
      );
      const primaryRoleCode = sorted[0].role_code;
      const primaryRole     = _ROLE_CODE_TO_JS[primaryRoleCode] || primaryRoleCode;

      // 역할별 기본 accessMenus 설정
      const ACCESS_BY_ROLE = {
        platform_admin:     ['dashboard', 'isolation-groups', 'budget-account', 'virtual-org', 'form-builder', 'field-mgmt', 'policy-builder', 'user-mgmt', 'role-mgmt', 'reports', 'manual'],
        tenant_global_admin:['dashboard', 'isolation-groups', 'budget-account', 'virtual-org', 'form-builder', 'policy-builder', 'user-mgmt', 'reports', 'manual'],
        budget_global_admin:['dashboard', 'my-isolation-group', 'org-budget', 'vorg-assign', 'reports', 'manual'],
        budget_op_manager:  ['dashboard', 'my-operations', 'org-budget', 'reports', 'manual'],
        learner:            ['dashboard'],
      };

      const key = u.emp_no || u.id;
      const dept = u.org_id ? (orgMap[u.org_id] || '') : '';
      const tenantId = sorted[0].tenant_id || u.tenant_id;

      personas[key] = {
        id:          u.emp_no || u.id,
        name:        u.name,
        dept:        dept,
        pos:         '',
        role:        primaryRole,
        roles:       sorted.map(r => _ROLE_CODE_TO_JS[r.role_code] || r.role_code),
        roleLabel:   primaryRole,
        tenantId:    tenantId,
        jobType:     u.job_type || 'general',
        status:      u.status,
        accessMenus: ACCESS_BY_ROLE[primaryRole] || ['dashboard'],
        _dbId:       u.id, // DB 원본 id 보존
      };
    });

    console.log(`[Supabase] ✅ BO_PERSONAS 로드: ${Object.keys(personas).length}명`);
    return personas;
  } catch (e) {
    console.warn('[Supabase] BO_PERSONAS 로드 실패 → JS mock 유지:', e.message);
    return null; // null이면 호출처에서 기존 mock 유지
  }
}
window.sbLoadPersonas = sbLoadPersonas;

// ─── FO 페르소나 DB 로더 ─────────────────────────────────────────────────────
// fo_personas + fo_persona_budgets 테이블에서 PERSONAS 전역변수 구성
async function sbLoadFoPersonas() {
  try {
    const sb = getSB();
    if (!sb) return null;

    // fo_personas + fo_persona_budgets 동시 로드
    const [personasRes, budgetsRes] = await Promise.all([
      sb.from('fo_personas').select('*').order('tenant_id'),
      sb.from('fo_persona_budgets').select('*'),
    ]);

    if (personasRes.error) throw personasRes.error;

    const budgets = budgetsRes.data || [];
    const personas = {};

    (personasRes.data || []).forEach(p => {
      const myBudgets = budgets
        .filter(b => b.persona_id === p.id)
        .map(b => ({
          id:      b.id,
          name:    b.name,
          account: b.account,
          balance: b.balance || 0,
          used:    b.used    || 0,
        }));

      personas[p.id] = {
        id:             p.emp_no,
        name:           p.name,
        dept:           p.dept || '',
        pos:            p.pos  || '',
        role:           p.role,
        jobType:        p.job_type || 'general',
        type:           p.id,
        typeLabel:      p.type_label || '',
        company:        p.company,
        tenantId:       p.tenant_id,
        isolationGroup: p.isolation_group,
        allowedAccounts:(p.allowed_accounts || []),
        process:        p.process || null,
        desc:           p.description || '',
        budgets:        myBudgets,
      };
    });

    console.log(`[Supabase] ✅ FO 페르소나 DB 로드: ${Object.keys(personas).length}명`);
    return personas;
  } catch (e) {
    console.warn('[Supabase] FO 페르소나 로드 실패 → data.js mock 유지:', e.message);
    return null;
  }
}
window.sbLoadFoPersonas = sbLoadFoPersonas;

// ─── 초기 로딩 ───────────────────────────────────────────────────────────────
// 앱 시작 시 전역 변수를 DB 데이터로 교체
async function initSupabaseData() {
  console.log('[Supabase] 데이터 로딩 시작...');
  try {
    // 핸심 데이터를 병렬 로드 (FO 페르소나 포함)
    const [tenants, accounts, groups, policies, personas, vorgTemplates, foPersonas] = await Promise.all([
      sbLoadTenants(),
      sbLoadAccountMaster(),
      sbLoadIsolationGroups(),
      sbLoadServicePolicies(),
      sbLoadPersonas(),
      sbLoadVirtualOrgTemplates(),
      sbLoadFoPersonas(),
    ]);

    // 전역 변수 교체
    if (tenants     && tenants.length)       window.TENANTS            = tenants;
    if (accounts    && accounts.length)      window.ACCOUNT_MASTER     = accounts;
    if (groups      && groups.length)        window.ISOLATION_GROUPS   = groups;
    if (policies    && policies.length)      window.SERVICE_POLICIES   = policies;
    if (vorgTemplates && vorgTemplates.length) window.VIRTUAL_ORG_TEMPLATES = vorgTemplates;

    // BO_PERSONAS: DB 데이터로 교체 (실패 시 null 반환 → JS mock 유지)
    if (personas && Object.keys(personas).length > 0) {
      const pAdmin = typeof BO_PERSONAS !== 'undefined' ? BO_PERSONAS['platform_admin'] : null;
      window.BO_PERSONAS = personas;
      if (pAdmin) window.BO_PERSONAS['platform_admin'] = pAdmin;
    }

    // FO PERSONAS: DB 데이터로 교체 (실패 시 data.js mock 유지)
    if (foPersonas && Object.keys(foPersonas).length > 0) {
      window.PERSONAS = foPersonas;
      // currentPersona 갱신: sessionStorage에 저장된 key로 재설정
      const savedKey = sessionStorage.getItem('currentPersona') || 'hmc_team_mgr';
      const resolved = foPersonas[savedKey] || foPersonas[Object.keys(foPersonas)[0]];
      if (resolved) window.currentPersona = resolved;
      // GNB 재렌더 (페르소나 드롭다운 반영)
      if (typeof renderGnb === 'function') renderGnb();
      console.log('[Supabase] ✅ FO PERSONAS DB 전환 완료');
    }

    console.log(`[Supabase] ✅ DB 로딩 완료 - 테넌트:${tenants?.length}, 계정:${accounts?.length}, 격리그룹:${groups?.length}, 사용자:${personas ? Object.keys(personas).length : 'mock'}`);

    // 역할별 메뉴 권한 로드 (비동기, 완료 후 사이드바 재렌더)
    sbLoadRoleMenuPerms().then(() => {
      if (typeof renderBoSidebar === 'function') renderBoSidebar();
    });

    // 교육신청 양식 템플릿 로드 (비동기)
    sbLoadFormTemplates().then(forms => {
      if (forms && forms.length) window.FORM_MASTER = forms;
    });

    return true;
  } catch (e) {
    console.error('[Supabase] ❌ 초기 로딩 실패. JS mock 데이터 사용:', e.message);
    return false;
  }
}

// ─── form_templates 로더 ──────────────────────────────────────────────────────
async function sbLoadFormTemplates() {
  try {
    const { data, error } = await getSB()
      .from('form_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    // DB 컬럼명을 FORM_MASTER 구조(JS camelCase)로 변환
    const forms = (data || []).map(r => ({
      id:               r.id,
      tenantId:         r.tenant_id,
      name:             r.name,
      type:             r.type,
      purpose:          r.purpose,
      eduType:          r.edu_type,
      eduSubType:       r.edu_sub_type,
      targetUser:       r.target_user,
      desc:             r.desc_text,
      noticeText:       r.notice_text,
      fields:           r.fields || [],
      attachments:      r.attachments || [],
      active:           r.active,
      accountCode:      r.account_code || null,
      isolationGroupId: r.isolation_group_id || null,
    }));
    console.log(`[Supabase] ✅ form_templates 로드: ${forms.length}건`);
    return forms;
  } catch (e) {
    console.warn('[Supabase] form_templates 로드 실패 → mock 데이터 사용:', e.message);
    return [];
  }
}
window.sbLoadFormTemplates = sbLoadFormTemplates;

// ─── 양식 저장(upsert) ────────────────────────────────────────────────────────
async function sbSaveFormTemplate(formObj) {
  try {
    const row = {
      id:           formObj.id,
      tenant_id:    formObj.tenantId,
      name:         formObj.name,
      type:         formObj.type,
      purpose:      formObj.purpose || null,
      edu_type:     formObj.eduType || null,
      edu_sub_type: formObj.eduSubType || null,
      target_user:  formObj.targetUser || null,
      desc_text:    formObj.desc || null,
      notice_text:  formObj.noticeText || null,
      fields:       formObj.fields || [],
      attachments:  formObj.attachments || [],
      active:       formObj.active !== false,
      updated_at:   new Date().toISOString(),
    };
    const { error } = await getSB()
      .from('form_templates')
      .upsert(row, { onConflict: 'id' });
    if (error) throw error;
    console.log(`[Supabase] ✅ 양식 저장 완료: ${formObj.name}`);
    return true;
  } catch (e) {
    console.error('[Supabase] 양식 저장 실패:', e.message);
    return false;
  }
}
window.sbSaveFormTemplate = sbSaveFormTemplate;

// ─── 양식 삭제(delete) ────────────────────────────────────────────────────────
async function sbDeleteFormTemplate(formId) {
  try {
    const { error } = await getSB()
      .from('form_templates')
      .delete()
      .eq('id', formId);
    if (error) throw error;
    console.log(`[Supabase] ✅ 양식 삭제 완료: ${formId}`);
    return true;
  } catch (e) {
    console.error('[Supabase] 양식 삭제 실패:', e.message);
    return false;
  }
}
window.sbDeleteFormTemplate = sbDeleteFormTemplate;

// ─── field_definitions 로더/저장/삭제 ─────────────────────────────────────────
async function sbLoadFieldDefinitions() {
  try {
    const { data, error } = await getSB()
      .from('field_definitions')
      .select('*')
      .eq('active', true)
      .order('category').order('sort_order');
    if (error) throw error;
    if (!data || !data.length) return null;
    // DB 컬럼명(snake_case) → ADVANCED_FIELDS 형식(camelCase) 변환
    return data.map(r => ({
      key:         r.key,
      fieldType:   r.field_type,
      category:    r.category,
      icon:        r.icon || '',
      scope:       r.scope,
      required:    r.required,
      hint:        r.hint || '',
      options:     r.options || undefined,
      trigger:     r.trigger_field || undefined,
      budget:      r.budget || false,
    }));
  } catch (e) {
    console.warn('[Supabase] field_definitions 로드 실패 (JS 상수 사용):', e.message);
    return null;
  }
}
window.sbLoadFieldDefinitions = sbLoadFieldDefinitions;

async function sbSaveFieldDefinition(row) {
  try {
    const { error } = await getSB()
      .from('field_definitions')
      .upsert(row, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] field_definitions 저장 실패:', e.message);
    return false;
  }
}
window.sbSaveFieldDefinition = sbSaveFieldDefinition;

async function sbDeleteFieldDefinition(key) {
  try {
    const { error } = await getSB()
      .from('field_definitions')
      .delete()
      .eq('key', key);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] field_definitions 삭제 실패:', e.message);
    return false;
  }
}
window.sbDeleteFieldDefinition = sbDeleteFieldDefinition;

// ─── 예산 잔액 실시간 조회 (account_budgets) ──────────────────────────────────
// 반환: { accountCode, totalBudget, deducted, holding, available, fiscalYear }
async function sbGetBudgetBalance(accountCode, fiscalYear) {
  const year = fiscalYear || new Date().getFullYear();
  try {
    const { data, error } = await getSB()
      .from('account_budgets')
      .select('*')
      .eq('account_code', accountCode)
      .eq('fiscal_year', year)
      .single();
    if (error) throw error;
    const available = (data.total_budget || 0) - (data.deducted || 0) - (data.holding || 0);
    return {
      accountCode,
      fiscalYear: year,
      totalBudget: data.total_budget || 0,
      deducted:    data.deducted    || 0,
      holding:     data.holding     || 0,
      available,
    };
  } catch (e) {
    console.warn('[Supabase] account_budgets 조회 실패, 목업 사용:', e.message);
    // 목업 폴백: bo_data.js의 ACCOUNT_BUDGETS 또는 하드코딩 기본값
    return _getBudgetBalanceMock(accountCode, year);
  }
}
window.sbGetBudgetBalance = sbGetBudgetBalance;

// 목업 폴백: bo_data.js의 ACCOUNT_BUDGETS 배열 사용
function _getBudgetBalanceMock(accountCode, year) {
  if (typeof ACCOUNT_BUDGETS !== 'undefined') {
    const rec = ACCOUNT_BUDGETS.find(b => b.accountCode === accountCode && b.fiscalYear === year);
    if (rec) {
      const available = (rec.totalBudget||0) - (rec.deducted||0) - (rec.holding||0);
      return { accountCode, fiscalYear: year, ...rec, available };
    }
  }
  return { accountCode, fiscalYear: year, totalBudget: 0, deducted: 0, holding: 0, available: 0 };
}
window._getBudgetBalanceMock = _getBudgetBalanceMock;

// 조직(격리그룹)의 모든 예산계정 잔액 합산
async function sbGetGroupBudgetSummary(ownedAccountCodes, fiscalYear) {
  const year = fiscalYear || new Date().getFullYear();
  const results = await Promise.all(
    (ownedAccountCodes || []).map(code => sbGetBudgetBalance(code, year))
  );
  const total = results.reduce((s, r) => s + r.totalBudget, 0);
  const deducted = results.reduce((s, r) => s + r.deducted, 0);
  const holding  = results.reduce((s, r) => s + r.holding, 0);
  return { fiscalYear: year, totalBudget: total, deducted, holding, available: total - deducted - holding, accounts: results };
}
window.sbGetGroupBudgetSummary = sbGetGroupBudgetSummary;

// 숫자 포맷 헬퍼 (미정의 환경용)
function _fmtKRW(n) {
  if (typeof boFmt === 'function') return boFmt(n);
  return (n||0).toLocaleString('ko-KR') + '원';
}
window._fmtKRW = _fmtKRW;
