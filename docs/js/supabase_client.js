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

async function sbLoadTenants() {
  try {
    const { data, error } = await getSB().from('tenants').select('*').eq('active', true).order('id');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] tenants fallback to mock:', e.message);
    return TENANTS;  // fallback to JS mock
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
    let q = getSB().from('isolation_groups').select('*').eq('status', 'active');
    if (tenantId) q = q.eq('tenant_id', tenantId);
    const { data, error } = await q.order('id');
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('[Supabase] isolation_groups fallback:', e.message);
    return ISOLATION_GROUPS;
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

// ─── 초기 로딩 ───────────────────────────────────────────────────────────────
// 앱 시작 시 전역 변수를 DB 데이터로 교체
async function initSupabaseData() {
  console.log('[Supabase] 데이터 로딩 시작...');
  try {
    const [tenants, accounts, groups, policies] = await Promise.all([
      sbLoadTenants(),
      sbLoadAccountMaster(),
      sbLoadIsolationGroups(),
      sbLoadServicePolicies()
    ]);

    // 전역 변수 교체
    if (tenants && tenants.length)   window.TENANTS         = tenants;
    if (accounts && accounts.length) window.ACCOUNT_MASTER  = accounts;
    if (groups && groups.length)     window.ISOLATION_GROUPS = groups;
    if (policies && policies.length) window.SERVICE_POLICIES = policies;

    console.log(`[Supabase] ✅ 로딩 완료 - 테넌트:${tenants.length}, 계정:${accounts.length}, 격리그룹:${groups.length}, 정책:${policies.length}`);

    // 역할별 메뉴 권한 로드 (비동기, 완료 후 사이드바 재렌더)
    sbLoadRoleMenuPerms().then(() => {
      if (typeof renderBoSidebar === 'function') renderBoSidebar();
    });

    // 가상조직 템플릿 로드 (비동기)
    sbLoadVirtualOrgTemplates().then(templates => {
      if (templates && templates.length) window.VIRTUAL_ORG_TEMPLATES = templates;
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
      id:          r.id,
      tenantId:    r.tenant_id,
      name:        r.name,
      type:        r.type,
      purpose:     r.purpose,
      eduType:     r.edu_type,
      eduSubType:  r.edu_sub_type,
      targetUser:  r.target_user,
      desc:        r.desc_text,
      noticeText:  r.notice_text,
      fields:      r.fields || [],
      attachments: r.attachments || [],
      active:      r.active,
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

