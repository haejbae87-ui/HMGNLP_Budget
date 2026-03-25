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

// 역할 배열로 메뉴 접근 가능 여부 확인 (boNavigate에서 사용)
function checkMenuAccess(menuId, roles, fallbackMenus) {
  // DB 권한이 로드됐으면 DB 기준
  if (window._roleMenuPerms && Object.keys(window._roleMenuPerms).length > 0) {
    return (roles || []).some(role => window._roleMenuPerms[role]?.has(menuId));
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
      (window._roleMenuPerms[role] || new Set()).forEach(m => allowed.add(m));
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
      // 로드 완료 후 사이드바를 다시 그려서 DB 권한 반영
      if (typeof renderBoSidebar === 'function') renderBoSidebar();
    });

    return true;
  } catch (e) {
    console.error('[Supabase] ❌ 초기 로딩 실패. JS mock 데이터 사용:', e.message);
    return false;
  }
}

