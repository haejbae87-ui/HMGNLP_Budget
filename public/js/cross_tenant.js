// ─── 크로스 테넌트 총괄부서 연동 헬퍼 ─────────────────────────────────────────
// 총괄부서(org_type='general')는 HMC↔KIA 간 동일 org_code로 연결됨
// 총괄부서 소속 사용자는 양쪽 회사 데이터를 조회/사용할 수 있음

const CT_LINKED_TENANTS = ['HMC', 'KIA']; // 총괄부서 지원 테넌트 쌍

let _ctGeneralOrgs = null; // 캐시: org_type='general' 조직 목록
let _ctLoading = false;

// ── 캐시 로드 ─────────────────────────────────────────────────────────────────
async function _ctEnsureCache() {
  if (_ctGeneralOrgs) return _ctGeneralOrgs;
  if (_ctLoading) {
    // 로딩 중이면 대기
    while (_ctLoading) await new Promise(r => setTimeout(r, 50));
    return _ctGeneralOrgs || [];
  }
  _ctLoading = true;
  try {
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) { _ctLoading = false; return []; }
    const { data, error } = await sb.from('organizations')
      .select('id, tenant_id, org_code, org_type, name, parent_id')
      .eq('org_type', 'general')
      .in('tenant_id', CT_LINKED_TENANTS);
    if (error) throw error;
    _ctGeneralOrgs = data || [];
  } catch (err) {
    console.warn('[cross_tenant] 캐시 로드 실패:', err.message);
    _ctGeneralOrgs = [];
  }
  _ctLoading = false;
  return _ctGeneralOrgs;
}

// 캐시 리셋 (BO에서 조직 변경 후 호출)
function ctResetCache() { _ctGeneralOrgs = null; }

// ── 핵심 API ──────────────────────────────────────────────────────────────────

/**
 * 주어진 orgId가 총괄부서인지 확인
 * @returns {Promise<boolean>}
 */
async function isGeneralOrg(orgId) {
  if (!orgId) return false;
  const cache = await _ctEnsureCache();
  return cache.some(o => o.id === orgId && o.org_type === 'general');
}

/**
 * 주어진 orgId의 연결된 테넌트 ID 목록 반환
 * 총괄부서면 ['HMC','KIA'], 직속부서면 null
 * @returns {Promise<string[]|null>}
 */
async function getLinkedTenantIds(orgId) {
  if (!orgId) return null;
  const cache = await _ctEnsureCache();
  const me = cache.find(o => o.id === orgId);
  if (!me) return null; // 직속부서 또는 미등록
  // 같은 org_code의 모든 tenant_id
  const tids = cache.filter(o => o.org_code === me.org_code).map(o => o.tenant_id);
  return tids.length > 1 ? [...new Set(tids)] : null;
}

/**
 * 주어진 orgId와 연결된 모든 조직 ID 반환 (자신 포함)
 * @returns {Promise<string[]>}
 */
async function getLinkedOrgIds(orgId) {
  if (!orgId) return [orgId].filter(Boolean);
  const cache = await _ctEnsureCache();
  const me = cache.find(o => o.id === orgId);
  if (!me) return [orgId];
  return cache.filter(o => o.org_code === me.org_code).map(o => o.id);
}

/**
 * org_code로 연결된 조직 전체 반환
 * @returns {Promise<{id, tenant_id, name}[]>}
 */
async function getLinkedOrgsByCode(orgCode) {
  if (!orgCode) return [];
  const cache = await _ctEnsureCache();
  return cache.filter(o => o.org_code === orgCode);
}

/**
 * 테넌트 ID → 한글 라벨
 */
function getTenantLabel(tenantId) {
  const map = { HMC: '현대', KIA: '기아', HAE: '오토에버', HSC: '제철' };
  return map[tenantId] || tenantId;
}

/**
 * 테넌트 뱃지 HTML 생성 (상대사 데이터 표시용)
 */
function getTenantBadgeHtml(tenantId, myTenantId) {
  if (tenantId === myTenantId) return ''; // 자사 데이터는 뱃지 불필요
  const label = getTenantLabel(tenantId);
  const colors = {
    HMC: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    KIA: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  };
  const c = colors[tenantId] || { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
  return `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:5px;background:${c.bg};color:${c.color};border:1px solid ${c.border};margin-left:4px">🏢 ${label}</span>`;
}

/**
 * 현재 페르소나가 총괄부서 소속인지 + 연결 테넌트 ID 목록
 * FO/BO 어디서든 호출 가능한 통합 API
 * @param {object} persona - currentPersona or boCurrentPersona
 * @returns {Promise<{isGeneral: boolean, linkedTids: string[], linkedOrgIds: string[]}>}
 */
async function getCrossTenantInfo(persona) {
  const orgId = persona?.orgId || persona?.org_id;
  const myTid = persona?.tenantId || persona?.tenant_id;
  if (!orgId || !myTid) return { isGeneral: false, linkedTids: [myTid], linkedOrgIds: [orgId].filter(Boolean) };
  
  const tids = await getLinkedTenantIds(orgId);
  if (!tids) return { isGeneral: false, linkedTids: [myTid], linkedOrgIds: [orgId] };
  
  const orgIds = await getLinkedOrgIds(orgId);
  return { isGeneral: true, linkedTids: tids, linkedOrgIds: orgIds };
}

console.log('[cross_tenant] 크로스 테넌트 헬퍼 로드됨');
