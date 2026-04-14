// ─── 백오피스: 세부 산출 근거 관리 (VOrg 템플릿 중심) ────────────────────────
// 데이터는 Supabase calc_grounds 테이블에서 로드, CALC_GROUNDS_MASTER로 동기화
// 같은 VOrg 템플릿 하위에서 세부산출근거를 공유

let _cgActiveTab = null;
let _cgEditId = null;
let _cgFilterTenant = null;     // 선택된 회사 ID
let _cgFilterGroup = null;     // 선택된 가상교육조직 ID
let _cgFilterAccount = null;     // 필터바 예산계정 (조회용, 등록 시 불필요)

// ─── 항목 조회 (계층 필터) ───────────────────────────────────────────────────
// 범위: tenantId 일치 + (groupId 일치 OR null) + (accountCode 일치 OR null)
function _cgGetItems(tenantId, groupId, accountCode) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (g.tenantId && g.tenantId !== tenantId) return false;
    if (g.domainId && g.domainId !== groupId) return false;
    if (g.accountCode && g.accountCode !== accountCode) return false;
    return true;
  });
}

// ─── DB 로드 ───────────────────────────────────────────────────────────────────────
let _cgDbLoaded = false;
let _cgTplList = [];
let _cgAccountList = [];
async function _cgLoadFromDb() {
  if (typeof _sb !== 'function' || !_sb()) return;
  try {
    const p1 = _sb().from('calc_grounds').select('*').order('sort_order');
    const p2 = _sb().from('virtual_org_templates').select('id,name,tenant_id,service_type').eq('service_type', 'edu_support');
    const p3 = _sb().from('budget_accounts').select('code,name,virtual_org_template_id,tenant_id');

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

    if (!res1.error && res1.data && res1.data.length > 0) {
      // DB 데이터를 CALC_GROUNDS_MASTER 형식으로 변환
      CALC_GROUNDS_MASTER = res1.data.map(r => ({
        id: r.id,
        tenantId: r.tenant_id,
        domainId: r.virtual_org_template_id || r.isolation_group_id || null,
        accountCode: r.account_code || null,
        sharedAccountCodes: r.shared_account_codes || [],
        name: r.name,
        desc: r.description || '',
        unitPrice: r.unit_price || 0,
        softLimit: r.soft_limit || 0,
        hardLimit: r.hard_limit || 0,
        limitType: r.limit_type || 'none',
        active: r.active !== false,
        usageScope: r.usage_scope || ['plan', 'apply', 'settle'],
        visibleFor: r.visible_for || 'both',
        sortOrder: r.sort_order || 99,
      }));
      _cgDbLoaded = true;
      console.log('[CalcGrounds] DB에서', res1.data.length, '건 로드 완료');
    }
    if (res2.data) _cgTplList = res2.data;
    if (res3.data) _cgAccountList = res3.data;
  } catch (e) { console.warn('[CalcGrounds] DB 로드 실패:', e); }
}

// ─── 메인 렌더 ───────────────────────────────────────────────────────────────
async function renderCalcGrounds() {
  await _cgLoadFromDb();
  const persona = boCurrentPersona;
  const role = persona.role;
  const isPlatform = role === 'platform_admin';
  const isTenant = role === 'tenant_global_admin';
  const isBudgetOp = role === 'budget_op_manager' || role === 'budget_hq';
  const isBudgetAdmin = role === 'budget_global_admin';

  const activeTenantId = isPlatform ? (_cgFilterTenant || '') : (persona.tenantId || '');
  const pbVorgId = (isBudgetOp || isBudgetAdmin) ? (persona.domainId || _cgFilterGroup || '') : (_cgFilterGroup || '');

  const TENANTS_LIST = typeof TENANTS !== 'undefined' ? TENANTS : [...new Set(_cgTplList.map(t => t.tenant_id))].map(id => ({ id, name: id }));
  const tenantName = TENANTS_LIST.find(t => t.id === activeTenantId)?.name || activeTenantId || '소속 회사';

  // 이 테넌트에 속한 가상교육조직 (교육지원 유형만)
  const availVorgs = _cgTplList.filter(t => t.service_type === 'edu_support' && (!activeTenantId || t.tenant_id === activeTenantId));
  const vorgName = availVorgs.find(g => g.id === pbVorgId)?.name || pbVorgId || '선택된 조직';

  const filterBar = `
  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05)">
    ${isPlatform ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
      <select onchange="_cgFilterTenant=this.value;_cgFilterGroup='';renderCalcGrounds()"
        style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:140px">
        <option value="">전체 회사</option>
        ${TENANTS_LIST.map(t => `<option value="${t.id}" ${activeTenantId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>
    <div style="width:1px;height:28px;background:#E5E7EB"></div>
    ` : (isTenant ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #BFDBFE;border-radius:10px;background:#EFF6FF;min-width:120px">
        <span style="font-size:12px">🏢</span>
        <span style="font-size:13px;font-weight:800;color:#1D4ED8">${tenantName}</span>
      </div>
    </div>
    <div style="width:1px;height:28px;background:#E5E7EB"></div>
    ` : '')}

    ${(isBudgetOp || isBudgetAdmin) ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">가상교육조직 템플릿</span>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #C4B5FD;border-radius:10px;background:#F5F3FF;min-width:140px">
        <span style="font-size:12px">🔒</span>
        <span style="font-size:13px;font-weight:800;color:#7C3AED">${vorgName}</span>
      </div>
    </div>` : `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">가상교육조직 템플릿</span>
      <select onchange="_cgFilterGroup=this.value;renderCalcGrounds()"
        style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
        <option value="">전체 조직</option>
        ${availVorgs.map(g => `<option value="${g.id}" ${pbVorgId === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
      </select>
    </div>`}

    <button onclick="renderCalcGrounds()"
      style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,.35);white-space:nowrap;margin-left:auto">
      ● 조회
    </button>
    <button onclick="_cgFilterTenant='';_cgFilterGroup='';renderCalcGrounds()"
      style="padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;font-weight:700;background:white;cursor:pointer;color:#6B7280;white-space:nowrap">초기화</button>
  </div>`;

  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade" style="padding:24px">
  ${typeof boVorgBanner === 'function' ? boVorgBanner() : (typeof boIsolationGroupBanner === 'function' ? boIsolationGroupBanner() : '')}
  
  <!-- 헤더 -->
  <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">세부산출근거</span>
        <h1 class="bo-page-title" style="margin:0">세부 산출 근거 관리</h1>
      </div>
      <p class="bo-page-sub">가상교육조직 템플릿 단위로 세부 산출근거를 관리합니다. 같은 템플릿 하위 계정이 공유합니다.</p>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="cgOpenModal(null)" style="white-space:nowrap">
      + 항목 추가
    </button>
  </div>

  <!-- 계층형 필터 바 -->
  ${filterBar}

  <!-- 항목 목록 -->
  <div id="cg-content">
    ${_renderCgTable(activeTenantId, pbVorgId, '')}
  </div>
</div>

<!-- 항목 편집 모달 -->
<div id="cg-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:580px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="cg-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">산출 근거 항목 추가</h3>
      <button onclick="cgCloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="cg-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="cgCloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="cgSaveItem()">저장</button>
    </div>
  </div>
</div>`;
}

// ─── 항목 테이블 ─────────────────────────────────────────────────────────────
function _renderCgTable(tenantId, groupId, accountCode) {
  const items = _cgGetItems(tenantId, groupId, accountCode);
  const active = items.filter(g => g.active !== false).length;

  return `
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px">
  <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">세부 산출 근거 목록 (${active}개 / 전체 ${items.length}개)</div>
</div>

<div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)">
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead>
      <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
        <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280;width:40px">NO.</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151">항목명</th>
        <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151">가이드 설명</th>
        <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#374151">기준단가</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#374151">상한액</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#374151">상태</th>
        <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#374151">관리</th>
      </tr>
    </thead>
    <tbody>
      ${items.length === 0 ? `
      <tr><td colspan="7" style="text-align:center;padding:48px;color:#9CA3AF;font-size:13px">
        이 범위에서 조회된 항목이 없습니다.<br>
        <button onclick="cgOpenModal(null)" class="bo-btn-primary bo-btn-sm" style="margin-top:10px;display:inline-flex;align-items:center;padding:6px 14px;font-size:12px;border-radius:8px">+ 첫 항목 추가</button>
      </td></tr>` : items.map((g, i) => `
      <tr style="border-bottom:1px solid #F3F4F6;transition:background .12s;${g.active === false ? 'opacity:.5;' : ''}" onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''">
        <td style="padding:11px 14px;text-align:center;color:#9CA3AF;font-size:12px">${i + 1}</td>
        <td style="padding:11px 14px">
          <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:3px">${g.name}</div>
          <div style="font-size:10px;color:#9CA3AF">${g.id}</div>
        </td>
        <td style="padding:11px 14px;font-size:12px;color:#374151;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.desc || '—'}</td>
        <td style="padding:11px 14px;text-align:right;font-weight:700;font-size:12px;color:#374151">${g.unitPrice > 0 ? (typeof boFmt === 'function' ? boFmt(g.unitPrice) : g.unitPrice.toLocaleString()) + '원' : '<span style="color:#9CA3AF">—</span>'}</td>
        <td style="padding:11px 14px;text-align:center;font-size:11px">
          ${g.limitType === 'none' ? '<span style="color:#9CA3AF">제한없음</span>' :
      g.limitType === 'soft' ? `<span style="background:#FFFBEB;color:#D97706;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">⚠ Soft</span>` :
        `<span style="background:#FEF2F2;color:#DC2626;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">🚫 Hard</span>`}
        </td>
        <td style="padding:11px 14px;text-align:center">
          <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:${g.active !== false ? '#D1FAE5' : '#F3F4F6'};color:${g.active !== false ? '#065F46' : '#9CA3AF'}">${g.active !== false ? '활성' : '비활성'}</span>
        </td>
        <td style="padding:11px 14px;text-align:center">
          <div style="display:flex;gap:5px;justify-content:center">
            <button onclick="cgOpenModal('${g.id}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151">✏️ 수정</button>
            <button onclick="cgToggleActive('${g.id}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid ${g.active !== false ? '#FDE68A' : '#A7F3D0'};background:${g.active !== false ? '#FFFBEB' : '#ECFDF5'};color:${g.active !== false ? '#D97706' : '#059669'};cursor:pointer;font-weight:700">
              ${g.active !== false ? '비활성' : '활성화'}
            </button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- 범례 -->
<div class="bo-card" style="padding:12px 18px;margin-top:10px;background:#F8FAFC;border-color:#E2E8F0">
  <div style="font-size:11px;color:#374151;font-weight:600;display:flex;flex-wrap:wrap;gap:16px">
    <span>⚠️ <b>Soft Limit</b>: 상한액 초과 시 <b>사유 입력</b> 후 진행 가능 (초과 허용, 관리자 리뷰 대상)</span>
    <span>🚫 <b>Hard Limit</b>: 상한액 초과 시 <b>절대 차단</b> (시스템이 입력을 거부, 초과 불가)</span>
  </div>
</div>`;
}

// ─── 모달 ─────────────────────────────────────────────────────────────────────
function cgOpenModal(id) {
  _cgEditId = id || null;
  const item = id ? CALC_GROUNDS_MASTER.find(g => g.id === id) : null;
  const tenantId = _cgFilterTenant || boCurrentPersona.tenantId || 'HMC';
  const myGroups = _cgTplList.filter(t => t.service_type === 'edu_support' && t.tenant_id === tenantId);

  document.getElementById('cg-modal-title').textContent = id ? '산출 근거 항목 수정' : '산출 근거 항목 추가';
  document.getElementById('cg-modal-body').innerHTML = _cgModalBody(item, tenantId, myGroups);
  document.getElementById('cg-modal').style.display = 'flex';
}
function cgCloseModal() { document.getElementById('cg-modal').style.display = 'none'; }

function _cgModalBody(item, tenantId, myGroups) {
  const lType = item?.limitType || 'none';

  // 가상교육조직 드롭다운
  const groupOpts = myGroups.map(g => `<option value="${g.id}" ${item?.domainId === g.id ? 'selected' : ''}>${g.name}</option>`).join('');

  return `
<div style="display:flex;flex-direction:column;gap:16px">

  <!-- 적용 범위: VOrg 템플릿만 -->
  <div style="background:#EFF6FF;border-radius:10px;padding:14px;border:1.5px solid #BFDBFE">
    <div style="font-size:12px;font-weight:800;color:#1D4ED8;margin-bottom:10px">📐 적용 범위 설정</div>
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px">가상교육조직 템플릿 (미선택 = 테넌트 전체 공유)</label>
      <select id="cg-grp"
              style="width:100%;padding:8px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px">
        <option value="">— 테넌트 전체 공유 —</option>
        ${groupOpts}
      </select>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#1D4ED8">
      💡 같은 가상교육조직 템플릿 하위의 모든 예산계정에서 이 항목을 공유합니다.
    </div>
  </div>

  <!-- 기본 정보 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">항목명 <span style="color:#EF4444">*</span></label>
      <input id="cg-name" type="text" value="${item?.name || ''}" placeholder="예) 사외강사료"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가이드 설명 <span style="font-size:10px;color:#6B7280">(학습자 화면 노출)</span></label>
      <textarea id="cg-desc" rows="2"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;resize:none">${item?.desc || ''}</textarea>
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">기준단가 (원)</label>
      <input id="cg-unit-price" type="number" value="${item?.unitPrice ?? ''}" placeholder="0 = 직접 입력"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">정렬 순서</label>
      <input id="cg-order" type="number" value="${item?.sortOrder ?? 99}" placeholder="99"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
  </div>

  <!-- 상한액 -->
  <div style="background:#F9FAFB;border-radius:10px;padding:14px;border:1.5px solid #E5E7EB">
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px">🔒 상한액 설정</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      ${['none', 'soft', 'hard'].map(v => `
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;
                    border:1.5px solid ${lType === v ? (v === 'none' ? '#10B981' : v === 'soft' ? '#D97706' : '#DC2626') : '#E5E7EB'};
                    background:${lType === v ? (v === 'none' ? '#F0FDF4' : v === 'soft' ? '#FFFBEB' : '#FEF2F2') : '#fff'}"
             onclick="cgSelectLimitType('${v}')">
        <input type="radio" name="cg-limit-type" value="${v}" ${lType === v ? 'checked' : ''}
          style="accent-color:${v === 'none' ? '#10B981' : v === 'soft' ? '#D97706' : '#DC2626'}">
        <span style="font-size:12px;font-weight:700">
          ${v === 'none' ? '✅ 제한없음' : v === 'soft' ? '⚠ Soft (초과 가능)' : '🚫 Hard (초과 차단)'}
        </span>
      </label>`).join('')}
    </div>
    <div style="margin-bottom:12px;font-size:10px;color:#6B7280;background:#F9FAFB;padding:8px 12px;border-radius:8px;line-height:1.6">
      ⚠ <b>Soft Limit</b>: 이 금액을 초과해도 <b>사유를 입력</b>하면 진행 가능합니다. 관리자가 사후에 리뷰합니다.<br>
      🚫 <b>Hard Limit</b>: 이 금액을 초과하면 <b>시스템이 절대 차단</b>합니다. 입력 자체가 불가합니다.
    </div>
    <div id="cg-limit-fields" style="display:${lType === 'none' ? 'none' : 'grid'};grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#D97706;display:block;margin-bottom:4px">⚠ Soft Limit (원) — 초과 시 사유 입력 후 진행 가능</label>
        <input id="cg-soft-limit" type="number" value="${item?.softLimit || ''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#DC2626;display:block;margin-bottom:4px">🚫 Hard Limit (원) — 초과 시 절대 차단 (입력 불가)</label>
        <input id="cg-hard-limit" type="number" value="${item?.hardLimit || ''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FECACA;border-radius:8px;font-size:13px">
      </div>
    </div>
  </div>
</div>`;
}

function cgOnModalGroupChange(groupId) {
  const acctSel = document.getElementById('cg-acct');
  if (acctSel) {
    const accts = groupId
      ? _cgAccountList.filter(a => a.virtual_org_template_id === groupId)
      : [];
    acctSel.innerHTML = `<option value="">— 공유 항목 —</option>` +
      accts.map(a => `<option value="${a.code}">${a.code}${a.name ? ` (${a.name})` : ''}</option>`).join('');
  }
}

// ─── 인터랙션 핸들러 ─────────────────────────────────────────────────────────
function cgSelectVisible(val) {
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => r.checked = r.value === val);
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => {
    const lbl = r.closest('label');
    if (!lbl) return;
    const m = CG_VISIBLE_META[r.value] || CG_VISIBLE_META.both;
    lbl.style.borderColor = r.checked ? m.color : '#E5E7EB';
    lbl.style.background = r.checked ? m.bg : '#fff';
  });
}
function cgSelectLimitType(val) {
  document.querySelectorAll('input[name="cg-limit-type"]').forEach(r => r.checked = r.value === val);
  const f = document.getElementById('cg-limit-fields');
  if (f) f.style.display = val === 'none' ? 'none' : 'grid';
}

// ─── 저장 ─────────────────────────────────────────────────────────────────────
function cgSaveItem() {
  const name = document.getElementById('cg-name')?.value.trim();
  if (!name) { alert('항목명은 필수입니다.'); return; }
  const tenantId = _cgFilterTenant || boCurrentPersona.tenantId || 'HMC';
  const groupId = document.getElementById('cg-grp')?.value || null;

  const obj = {
    name,
    desc: document.getElementById('cg-desc')?.value.trim(),
    unitPrice: Number(document.getElementById('cg-unit-price')?.value) || 0,
    limitType: document.querySelector('input[name="cg-limit-type"]:checked')?.value || 'none',
    softLimit: Number(document.getElementById('cg-soft-limit')?.value) || 0,
    hardLimit: Number(document.getElementById('cg-hard-limit')?.value) || 0,
    usageScope: ['plan', 'apply', 'settle'],
    visibleFor: 'both',
    active: true,
    tenantId,
    domainId: groupId || undefined,
    sortOrder: Number(document.getElementById('cg-order')?.value) || 99,
  };

  if (_cgEditId) {
    const idx = CALC_GROUNDS_MASTER.findIndex(g => g.id === _cgEditId);
    if (idx > -1) CALC_GROUNDS_MASTER[idx] = { ...CALC_GROUNDS_MASTER[idx], ...obj };
  } else {
    CALC_GROUNDS_MASTER.push({ id: 'CG' + Date.now(), ...obj });
  }
  cgCloseModal();
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount);
}

function cgToggleActive(id) {
  const item = CALC_GROUNDS_MASTER.find(g => g.id === id);
  if (item) item.active = item.active === false ? true : false;
  const tenantId = _cgFilterTenant || boCurrentPersona.tenantId || 'HMC';
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount);
}

// ─── 헬퍼: 양식 미리보기 및 FO 신청화면에서 세부산출근거 항목 가져오기 ─────────
// VOrg 템플릿 + shared_account_codes 기반 필터링
function sbGetCalcGroundsForForm(tenantId, groupId, accountCode) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (g.active === false) return false;
    if (g.tenantId && g.tenantId !== tenantId) return false;
    // VOrg 매칭: domainId가 있으면 일치해야 함
    if (g.domainId && g.domainId !== groupId) return false;
    // 계정 필터: shared_account_codes 비어있으면 전체 공유, 있으면 매칭
    if (accountCode && g.sharedAccountCodes && g.sharedAccountCodes.length > 0) {
      if (!g.sharedAccountCodes.includes(accountCode)) return false;
    }
    return true;
  });
}
window.sbGetCalcGroundsForForm = sbGetCalcGroundsForForm;

// ─── VOrg 기반 글로벌 조회 (FO plans.js / apply.js에서 사용) ────────────────
// getCalcGroundsForAccount 대체. VOrg+계정 조합 필터
function getCalcGroundsForVorg(vorgTemplateId, accountCode) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (g.active === false) return false;
    // VOrg 매칭
    if (g.domainId && vorgTemplateId && g.domainId !== vorgTemplateId) return false;
    // 계정 필터: shared_account_codes가 비어있으면 전체 공유
    if (accountCode && g.sharedAccountCodes && g.sharedAccountCodes.length > 0) {
      if (!g.sharedAccountCodes.includes(accountCode)) return false;
    }
    return true;
  });
}
window.getCalcGroundsForVorg = getCalcGroundsForVorg;
