// ─── Tenant Admin: 예산 기초 관리 (7탭) ──────────────────────────────────────
// Step1:계정마스터CRUD  Step2:조직-계정매핑  Step3:양식빌더(FORM_MASTER)
// Step4:양식접근권한    Step5:양식-예산-계획룰  Step6:공지관리  +가상조직+권한

const BM_TABS = [
  { label: '[Step1] 계정 마스터 관리' },
  { label: '[Step2] 가상조직 템플릿 관리' },
  { label: '[Step3] 양식 및 유형 마스터' },
  { label: '[Step4] 통합 정책 매핑 설정' },
  { label: '[Step5] 신청 양식별 공지 관리' }
];

let _bmActiveTab = 0;


// ─── 실제 인사 조직 트리 (ERP 연동 가정) ─────────────────────────────────────
const REAL_ORG_TREE = {
  general: [
    {
      id: 'RHQ01', name: 'HMGOOOO본부', type: 'hq',
      children: [
        { id: 'RT01', name: '피플OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT02', name: '역량OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT03', name: '성과OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT04', name: '인재OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT05', name: '교육기획팀', type: 'team', parentName: 'HMGOOOO본부' },
      ]
    },
    {
      id: 'RHQ02', name: 'SDVOOOO본부', type: 'hq',
      children: [
        { id: 'RT06', name: 'SDV기술팀', type: 'team', parentName: 'SDVOOOO본부' },
        { id: 'RT07', name: '아키텍처팀', type: 'team', parentName: 'SDVOOOO본부' },
        { id: 'RT08', name: '플랫폼팀', type: 'team', parentName: 'SDVOOOO본부' },
      ]
    },
  ],
  rnd: [
    {
      id: 'RC01', name: '모빌리티OOOO센터', type: 'center',
      children: [
        { id: 'RT20', name: '내구OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT21', name: '구동OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT22', name: '전장OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT23', name: '샤시OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
      ]
    },
    {
      id: 'RC02', name: '전동화OOOO센터', type: 'center',
      children: [
        { id: 'RT24', name: '배터리OO팀', type: 'team', parentName: '전동화OOOO센터' },
        { id: 'RT25', name: '인버터OO팀', type: 'team', parentName: '전동화OOOO센터' },
        { id: 'RT26', name: '충전OO팀', type: 'team', parentName: '전동화OOOO센터' },
      ]
    },
  ]
};

let virtualOrgState = JSON.parse(JSON.stringify(VIRTUAL_ORG));

// ── 상태 변수 ─────────────────────────────────────────────────────────────────
let _baTenantId = null; // 플랫폼총괄: 선택된 테넌트
let _baGroupId = null; // 선택된 격리그룹 ID
let _baExpandedAR = {};   // 결재라인 펼침 상태 { accountCode: bool }

// ─── DB: account_master + edu_support_domains 로드 후 ACCOUNT_MASTER 갱신 ───────
async function _baLoadAccountsFromDB() {
  if (typeof _sb !== 'function' || !_sb()) return;
  try {
    const [{ data: accts }, { data: igs }] = await Promise.all([
      _sb().from('account_master').select('*'),
      _sb().from('edu_support_domains').select('id,name,tenant_id,owned_accounts,global_admin_key,op_manager_keys'),
    ]);
    // ACCOUNT_MASTER 동기화
    if (accts && typeof ACCOUNT_MASTER !== 'undefined') {
      accts.forEach(row => {
        const mapped = {
          code: row.code, tenantId: row.tenant_id, group: row.grp || '일반',
          name: row.name, desc: row.descr || '', active: row.active !== false,
          planRequired: row.plan_required !== false, carryover: row.carryover === true,
          isSystem: row.is_system === true,
        };
        const idx = ACCOUNT_MASTER.findIndex(a => a.code === mapped.code);
        if (idx >= 0) ACCOUNT_MASTER[idx] = { ...ACCOUNT_MASTER[idx], ...mapped };
        else ACCOUNT_MASTER.push(mapped);
      });
    }
    // VORG_TEMPLATES / EDU_SUPPORT_DOMAINS 동기화
    if (igs) {
      const tpl = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES
        : typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS : null;
      if (tpl) {
        igs.forEach(row => {
          const idx = tpl.findIndex(g => g.id === row.id);
          const mapped = {
            id: row.id, tenantId: row.tenant_id, name: row.name,
            ownedAccounts: row.owned_accounts || [],
            globalAdminKeys: row.global_admin_key ? [row.global_admin_key] : (row.op_manager_keys || []),
          };
          if (idx >= 0) tpl[idx] = { ...tpl[idx], ...mapped };
          else tpl.push(mapped);
        });
      }
    }
  } catch (e) { console.warn('[BudgetAccount] DB 로드 실패:', e.message); }
}

// ─── 진입점: 예산 계정 관리 (가상교육조직 템플릿 종속) ──────────────────────────
let _baTplId = null;   // 선택된 virtual_org_template id
let _baTplList = [];   // 로드된 템플릿 목록 캐시
let _baAccountList = []; // 로드된 계정 목록 캐시

async function renderBudgetAccount() {
  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const el = document.getElementById('bo-content');

  if (!_baTenantId) {
    _baTenantId = (role === 'platform_admin')
      ? (tenants[0]?.id || 'HMC')
      : boCurrentPersona.tenantId || 'HMC';
  }
  const tenantName = tenants.find(t => t.id === _baTenantId)?.name || _baTenantId;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';

  // ── 1. 템플릿 목록 로드 ──
  _baTplList = [];
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from('virtual_org_templates')
        .select('id,name,service_type,purpose')
        .eq('tenant_id', _baTenantId);
      if (data) _baTplList = data.filter(t => (t.purpose || t.service_type || 'edu_support') === 'edu_support');
    }
  } catch (e) { console.warn('[BudgetAccount] 템플릿 로드 실패:', e.message); }

  if (!_baTplId || !_baTplList.find(t => t.id === _baTplId)) {
    _baTplId = _baTplList[0]?.id || null;
  }

  // ── 2. 계정 목록 로드 ──
  _baAccountList = [];
  if (_baTplId) {
    try {
      const sb = typeof _sb === 'function' ? _sb() : null;
      if (sb) {
        const { data } = await sb
          .from('budget_accounts')
          .select('*')
          .eq('virtual_org_template_id', _baTplId)
          .eq('tenant_id', _baTenantId);
        if (data) _baAccountList = data;
      }
    } catch (e) { console.warn('[BudgetAccount] 계정 로드 실패:', e.message); }
  }

  // ── 3. 셀렉트 HTML ──
  const tenantSelect = isPlatform
    ? `<select onchange="_baTenantId=this.value;_baTplId=null;renderBudgetAccount()"
        style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
        ${tenants.map(t => `<option value="${t.id}" ${t.id === _baTenantId ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>`
    : `<span style="font-size:13px;font-weight:800;color:#111827">🏢 ${tenantName}</span>`;

  const tplSelect = _baTplList.length
    ? `<select onchange="_baTplId=this.value;renderBudgetAccount()"
        style="padding:7px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:700;background:#EFF6FF;color:#1D4ED8;cursor:pointer;min-width:220px">
        ${_baTplList.map(t => `<option value="${t.id}" ${t.id === _baTplId ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>`
    : `<span style="font-size:12px;color:#9CA3AF">등록된 가상교육조직 템플릿이 없습니다</span>`;

  // ── 4. 계정 카드 HTML ──
  const canEdit = ['platform_admin', 'tenant_global_admin', 'budget_global_admin'].includes(role);
  const curTpl = _baTplList.find(t => t.id === _baTplId);

  const accountsHtml = _baTplId && curTpl ? `
    <div style="padding:16px 20px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;
                margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
      <div>
        <div style="font-weight:900;font-size:14px;color:#1D4ED8">📋 ${curTpl.name}</div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${_baAccountList.length}개 계정</div>
      </div>
      ${canEdit ? `<button class="bo-btn-primary bo-btn-sm" onclick="openS1Modal()">+ 계정 신규 등록</button>` : ''}
    </div>
    ${_baAccountList.length ? _baAccountList.map(a => _baRenderAccountCard(a, canEdit)).join('') : `
    <div style="padding:48px;text-align:center;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#9CA3AF">
      <div style="font-size:36px;margin-bottom:10px">💳</div>
      <div style="font-size:13px;font-weight:700;color:#64748B">이 템플릿에 등록된 예산 계정이 없습니다</div>
      ${canEdit ? `<div style="font-size:11px;margin-top:4px">위 '+ 계정 신규 등록' 버튼으로 추가하세요</div>` : ''}
    </div>`}` : `
    <div style="padding:48px;text-align:center;background:#F9FAFB;border-radius:14px;color:#9CA3AF">
      <div style="font-size:36px;margin-bottom:10px">🏗️</div>
      <div style="font-size:13px;font-weight:700;color:#64748B">
        ${_baTplList.length ? '가상교육조직 템플릿을 선택하세요' : '가상 교육 조직 관리에서 템플릿을 먼저 만들어주세요'}
      </div>
    </div>`;

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1000px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#1D4ED8;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">교육지원제도 설정</span>
        <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">💳 예산 계정 관리</h1>
      </div>
      <p style="font-size:12px;color:#64748B;margin:0">가상교육조직 템플릿별로 예산 계정을 등록·관리합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      ${tenantSelect}
      ${tplSelect}
    </div>
  </div>
  <div id="ba-content">${accountsHtml}</div>
</div>

<!-- 계정 등록/수정 모달 -->
<div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="s1-modal-title" style="font-size:15px;font-weight:800;margin:0">예산 계정 신규 등록</h3>
      <button onclick="s1CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="s1-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="s1CloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="s1SaveAccount()">저장</button>
    </div>
  </div>
</div>`;
}

// ── 계정 카드 렌더 ──────────────────────────────────────────────────────────
function _baRenderAccountCard(a, canEdit) {
  const typeColors = {
    sap: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: '🔗 SAP 연동' },
    standalone: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669', label: '📋 자체관리' },
    training: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: '교육훈련' },
    language: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669', label: '어학' },
    cert: { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', label: '자격증' },
    badge: { bg: '#F5F3FF', border: '#DDD6FE', text: '#7C3AED', label: '배지' },
  };
  const tc = typeColors[a.account_type] || typeColors.sap;
  return `
<div class="bo-card" style="padding:18px 22px;margin-bottom:12px;border-left:4px solid ${tc.border}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <code style="background:#F3F4F6;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:900">${a.code}</code>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${tc.bg};color:${tc.text};border:1px solid ${tc.border}">${tc.label}</span>
        <span style="font-size:13px;font-weight:800;color:#111827">${a.name}</span>
        <span style="font-size:10px;padding:2px 7px;border-radius:5px;font-weight:700;background:${a.active ? '#D1FAE5' : '#F3F4F6'};color:${a.active ? '#065F46' : '#9CA3AF'}">${a.active ? '✅ 활성' : '⏸️ 비활성'}</span>
      </div>
      <div style="font-size:11px;color:#6B7280">${a.description || ''}</div>
    </div>
    ${canEdit ? `
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="bo-btn-secondary bo-btn-sm" onclick="openS1Modal('${a.id}')">수정</button>
    </div>` : ''}
  </div>
</div>`;
}



// ── 계정 목록 + 결재라인 통합 렌더 (구버전 - 하위 호환용 stub) ─────────────────
function _baRenderContent() {
  return document.getElementById('ba-content')?.innerHTML || '';
}





// ─────────────────────────────────────────────────────────────────────────────
// 예산 계정 CRUD (budget_accounts 테이블 기반)
// ─────────────────────────────────────────────────────────────────────────────
let _s1EditId = null; // 수정 시 budget_accounts.id

function _s1GenCode() {
  const seq = String(Date.now()).slice(-4);
  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  return tenantId + '-' + seq;
}

async function openS1Modal(id) {
  _s1EditId = id || null;
  const list = window._baAccountList && window._baAccountList.length > 0 ? window._baAccountList : (typeof _baAccountList !== 'undefined' ? _baAccountList : []);
  const a = id ? (list.find(x => x.id === id) || null) : null;
  const autoCode = a?.code || _s1GenCode();

  // budget_account_org_policy 로드 (기존 bankbook_mode 값 반영)
  let policy = null;
  if (id && _baTplId) {
    try {
      const sb = typeof _sb === 'function' ? _sb() : getSB?.();
      if (sb) {
        const { data } = await sb.from('budget_account_org_policy')
          .select('bankbook_mode, bankbook_level')
          .eq('budget_account_id', id)
          .eq('vorg_template_id', _baTplId)
          .maybeSingle();
        policy = data;
      }
    } catch (e) { console.warn('[s1Modal] policy 로드 실패:', e.message); }
  }

  document.getElementById('s1-modal-title').textContent = id ? '예산 계정 수정' : '예산 계정 신규 등록';
  document.getElementById('s1-modal-body').innerHTML = `
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정코드 (자동채번)</label>
    <input id="s1-code" type="text" value="${autoCode}" readonly
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB;color:#6B7280">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정명 *</label>
    <input id="s1-name" type="text" placeholder="예) 교육훈련비" value="${a?.name || ''}"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">용도 설명</label>
    <input id="s1-desc" type="text" placeholder="예) 사내 집합/이러닝 운영비" value="${a?.description || ''}"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">연동 방식</label>
    <div style="display:flex;gap:12px">
      <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${(!a?.integration_type || a?.integration_type === 'sap') ? '#1D4ED8' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${(!a?.integration_type || a?.integration_type === 'sap') ? '#EFF6FF' : '#fff'};flex:1">
        <input type="radio" name="s1-integration" value="sap" ${(!a?.integration_type || a?.integration_type === 'sap') ? 'checked' : ''} onchange="_s1ToggleIntegration()" style="accent-color:#1D4ED8">
        <div>
          <div style="font-size:12px;font-weight:800;color:#1D4ED8">🔗 SAP 연동</div>
          <div style="font-size:10px;color:#6B7280">ERP 예산관리와 실시간 연동</div>
        </div>
      </label>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${a?.integration_type === 'standalone' ? '#059669' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${a?.integration_type === 'standalone' ? '#F0FDF4' : '#fff'};flex:1">
        <input type="radio" name="s1-integration" value="standalone" ${a?.integration_type === 'standalone' ? 'checked' : ''} onchange="_s1ToggleIntegration()" style="accent-color:#059669">
        <div>
          <div style="font-size:12px;font-weight:800;color:#059669">📋 자체관리 (미연동)</div>
          <div style="font-size:10px;color:#6B7280">시스템 내 독립 예산 관리</div>
        </div>
      </label>
    </div>
  </div>
  <div style="margin-bottom:4px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">예산 사용 여부</label>
    <div style="display:flex;gap:12px">
      <label id="s1-uses-yes-label" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${(a?.uses_budget !== false) ? '#059669' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${(a?.uses_budget !== false) ? '#F0FDF4' : '#fff'};flex:1" onclick="_s1ToggleUsesBudget(true)">
        <input type="radio" name="s1-uses-budget" value="yes" ${(a?.uses_budget !== false) ? 'checked' : ''} style="accent-color:#059669">
        <div>
          <div style="font-size:12px;font-weight:800;color:#059669">✅ 사용</div>
          <div style="font-size:10px;color:#6B7280">조직별 통장 생성 및 예산 배정 허용</div>
        </div>
      </label>
      <label id="s1-uses-no-label" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${a?.uses_budget === false ? '#DC2626' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${a?.uses_budget === false ? '#FEF2F2' : '#fff'};flex:1" onclick="_s1ToggleUsesBudget(false)">
        <input type="radio" name="s1-uses-budget" value="no" ${a?.uses_budget === false ? 'checked' : ''} style="accent-color:#DC2626">
        <div>
          <div style="font-size:12px;font-weight:800;color:#DC2626">⛔ 미사용</div>
          <div style="font-size:10px;color:#6B7280">통장 생성 안 함, 조회만 가능</div>
        </div>
      </label>
    </div>
  </div>
  <div id="s1-bankbook-mode-section" style="margin-bottom:4px;${(a?.uses_budget === false) ? 'display:none' : ''}">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">통장 생성 정책</label>
    <div style="font-size:10px;color:#9CA3AF;margin-bottom:8px">가상교육조직에 상위 조직(본부)을 맵핑했을 때 통장을 어떻게 만들지 결정합니다.</div>
    <div style="display:flex;gap:12px">
      <label id="s1-mode-isolated-label" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border:1.5px solid ${(policy?.bankbook_mode !== 'shared') ? '#7C3AED' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${(policy?.bankbook_mode !== 'shared') ? '#F5F3FF' : '#fff'};flex:1" onclick="_s1ToggleBankbookMode('isolated')">
        <input type="radio" name="s1-bankbook-mode" value="isolated" ${(policy?.bankbook_mode !== 'shared') ? 'checked' : ''} style="accent-color:#7C3AED;margin-top:2px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#7C3AED">팔별 분리 통장</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">하위 팀마다 개별 통장<br>예) 내구기술팀 통장, 전동화설계팀 통장</div>
        </div>
      </label>
      <label id="s1-mode-shared-label" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border:1.5px solid ${(policy?.bankbook_mode === 'shared') ? '#D97706' : '#E5E7EB'};border-radius:10px;cursor:pointer;background:${(policy?.bankbook_mode === 'shared') ? '#FFFBEB' : '#fff'};flex:1" onclick="_s1ToggleBankbookMode('shared')">
        <input type="radio" name="s1-bankbook-mode" value="shared" ${(policy?.bankbook_mode === 'shared') ? 'checked' : ''} style="accent-color:#D97706;margin-top:2px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#D97706">상위 조직 공유 통장</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">본부단위 통장 1개, 하위 팀이 공유<br>예) 연구개발본부 단일 통장</div>
          <div style="font-size:10px;color:#D97706;margin-top:4px;font-weight:700">⚠️ 패더 소진 시 하위 팀 전체 영향</div>
        </div>
      </label>
    </div>
  </div>`;
  document.getElementById('s1-modal').style.display = 'flex';
}

function _s1ToggleIntegration() {
  const radios = document.querySelectorAll('input[name="s1-integration"]');
  radios.forEach(r => {
    const label = r.closest('label');
    if (r.checked) {
      label.style.borderColor = r.value === 'sap' ? '#1D4ED8' : '#059669';
      label.style.background = r.value === 'sap' ? '#EFF6FF' : '#F0FDF4';
    } else {
      label.style.borderColor = '#E5E7EB';
      label.style.background = '#fff';
    }
  });
}

function s1CloseModal() {
  document.getElementById('s1-modal').style.display = 'none';
}

// 예산 사용 여부 토글
function _s1ToggleUsesBudget(val) {
  const yesLabel = document.getElementById('s1-uses-yes-label');
  const noLabel = document.getElementById('s1-uses-no-label');
  if (!yesLabel || !noLabel) return;
  const yesR = yesLabel.querySelector('input');
  const noR = noLabel.querySelector('input');
  yesR.checked = val; noR.checked = !val;
  yesLabel.style.borderColor = val ? '#059669' : '#E5E7EB';
  yesLabel.style.background = val ? '#F0FDF4' : '#fff';
  noLabel.style.borderColor = !val ? '#DC2626' : '#E5E7EB';
  noLabel.style.background = !val ? '#FEF2F2' : '#fff';
  // 미사용이면 통장 생성 정책 숨김
  const modeSection = document.getElementById('s1-bankbook-mode-section');
  if (modeSection) modeSection.style.display = val ? '' : 'none';
}

// 통장 생성 정책 토글
function _s1ToggleBankbookMode(mode) {
  const isoLabel = document.getElementById('s1-mode-isolated-label');
  const sharedLabel = document.getElementById('s1-mode-shared-label');
  if (!isoLabel || !sharedLabel) return;
  isoLabel.querySelector('input').checked = (mode === 'isolated');
  sharedLabel.querySelector('input').checked = (mode === 'shared');
  isoLabel.style.borderColor = mode === 'isolated' ? '#7C3AED' : '#E5E7EB';
  isoLabel.style.background = mode === 'isolated' ? '#F5F3FF' : '#fff';
  sharedLabel.style.borderColor = mode === 'shared' ? '#D97706' : '#E5E7EB';
  sharedLabel.style.background = mode === 'shared' ? '#FFFBEB' : '#fff';
}

async function s1SaveAccount() {
  const code = document.getElementById('s1-code').value.trim();
  const name = document.getElementById('s1-name').value.trim();
  if (!code || !name) { alert('계정명은 필수입니다.'); return; }
  if (!_baTplId) { alert('템플릿을 먼저 선택하세요.'); return; }

  const role = boCurrentPersona.role;
  const tenantId = role === 'platform_admin' ? (_baTenantId || 'HMC') : (boCurrentPersona.tenantId || 'HMC');
  const integration = document.querySelector('input[name="s1-integration"]:checked')?.value || 'sap';
  const usesBudget = document.querySelector('input[name="s1-uses-budget"]:checked')?.value !== 'no';
  const bankbookMode = document.querySelector('input[name="s1-bankbook-mode"]:checked')?.value || 'isolated';
  const payload = {
    tenant_id: tenantId,
    virtual_org_template_id: _baTplId,
    code, name,
    account_type: integration,
    description: document.getElementById('s1-desc').value.trim(),
    active: usesBudget,
    uses_budget: usesBudget,
    updated_at: new Date().toISOString(),
  };

  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb) { alert('DB 연결이 없습니다.'); return; }
    if (_s1EditId) {
      const { error } = await sb.from('budget_accounts').update(payload).eq('id', _s1EditId);
      if (error) throw error;
      // 통장 생성 정책 upsert
      await sb.from('budget_account_org_policy').upsert(
        { budget_account_id: _s1EditId, vorg_template_id: _baTplId, bankbook_mode: bankbookMode, bankbook_level: 'team', updated_at: new Date().toISOString() },
        { onConflict: 'budget_account_id,vorg_template_id' }
      );
    } else {
      payload.id = 'BA-' + Date.now();
      const { error } = await sb.from('budget_accounts').insert(payload);
      if (error) throw error;
      // 통장 생성 정책 insert
      await sb.from('budget_account_org_policy').insert(
        { budget_account_id: payload.id, vorg_template_id: _baTplId, bankbook_mode: bankbookMode, bankbook_level: 'team' }
      );
      // ✅ 신규 계정 생성 시 → 자동 통장 동기화
      try { await _syncBankbooksForTemplate(_baTplId, payload.tenant_id); } catch (e) { console.warn('[통장 동기화]', e.message); }
    }
    s1CloseModal();
    // 독립 메뉴(bo_budget_account.js)에서 호출된 경우
    if (typeof _bamLoadBudgetAccountsList === 'function' && window._bamSelectedTplId) {
      _bamLoadBudgetAccountsList(window._bamSelectedTplId);
    } else {
      await renderBudgetAccount();
    }
  } catch (e) {
    alert('저장 실패: ' + e.message);
  }
}








// ── 결재라인 펼침 토글 (하위 호환 stub) ───────────────────────────────────
function _baToggleAR(code) {
  _baExpandedAR[code] = !(_baExpandedAR[code] || false);
}










// ── 특정 계정으로 결재라인 추가 모달 열기 ────────────────────────────────────
function arOpenNewModalForAccount(accountCode) {
  const tenantId = boCurrentPersona.tenantId || (boCurrentPersona.role === 'platform_admin' ? _baTenantId : 'HMC');
  const newId = 'AR' + String(Date.now()).slice(-6);
  const newRouting = {
    id: newId, tenantId,
    name: accountCode + ' 결재라인', accountCodes: [accountCode],
    ranges: [
      { max: 1000000, label: '100만원 미만', approvers: ['팀장 전결'] },
      { max: null, label: '100만원 이상', approvers: ['팀장', '실장'] },
    ]
  };
  APPROVAL_ROUTING.push(newRouting);
  // 기존 모달 재활용
  const modal = document.getElementById('ar-modal');
  if (modal) {
    document.getElementById('ar-modal-title').textContent = `결재라인 추가 — ${accountCode}`;
    document.getElementById('ar-modal-body').innerHTML = _renderArEditor(newRouting);
    modal.style.display = 'flex';
    // 모달 닫을 때 ba-content 갱신
    modal._onClose = () => { document.getElementById('ba-content').innerHTML = _baRenderContent(); };
  }
}

// ─── 진입점: 메니 4 ─ 예산-조직-양식 정책 설정 ───────────────────────────────
function renderPolicyMapping() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">통합 정책</span>
      <h1 class="bo-page-title" style="margin:0">예산-조직-양식 정책 설정</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">예산 계정 × 가상조직 × 학습유형별 프로세스 흐름과 양식을 한 화면에서 조립합니다</p>
  </div>
  <div id="bm-content">${renderStep3()}</div>
</div>`;
}

// ─── 공통: 법인 세그먼트 ─────────────────────────────────────────────────────
function bmTenantSegment(activeTid, onchangeFn) {
  return `<div class="bo-segment">
    ${TENANTS.map(t => `
    <button class="bo-segment-btn ${activeTid === t.id ? 'active' : ''}"
      onclick="${onchangeFn}('${t.id}')">${t.name}</button>`).join('')}
  </div>`;
}

function bmToggle(checked, onChange, color = '') {
  return `<label class="bo-toggle ${color}" onclick="event.stopPropagation()">
    <input type="checkbox" ${checked ? 'checked' : ''} onchange="${onChange}">
    <span class="bo-toggle-slider"></span>
  </label>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// [Step1] 예산 계정 마스터 직접 CRUD — 테넌트 담당자가 직접 생성/편집
// ═════════════════════════════════════════════════════════════════════════════
let _s1EditCode = null;

function renderStep1() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const accounts = getPersonaAccounts(boCurrentPersona);
  // 시스템 기본 계정(무예산)도 항상 포함
  const systemAccounts = ACCOUNT_MASTER.filter(a => a.isSystem && a.active);
  const allAccounts = [...systemAccounts, ...accounts];
  const tenant = TENANTS.find(t => t.id === tenantId);

  // 계정 소유권(ownedAccounts) 보유 여부 — 오너만 신규 등록/수정 가능
  const isOwner = (boCurrentPersona.ownedAccounts || []).length > 0
    || (boCurrentPersona.ownedAccounts || [])[0] === '*';
  const vId = boCurrentPersona.vorgId || '';
  const vLabel = vId.includes('RND') ? '🔬 R&D 예산 전용 계정 보기'
    : vId === 'SYSTEM' ? '🌐 전체 계정 조회'
      : '📋 일반교육 예산 전용 계정 보기';

  return `
<div>
  <!-- VOrg 안내 배너 -->
  ${tenantId && vId !== 'SYSTEM' ? `
  <div style="margin-bottom:12px;padding:10px 14px;background:${vId.includes('RND') ? '#FFF7ED' : '#EFF6FF'};border:1.5px solid ${vId.includes('RND') ? '#FED7AA' : '#BFDBFE'};border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:14px">${vId.includes('RND') ? '🔬' : '🔒'}</span>
    <div>
      <span style="font-size:12px;font-weight:800;color:${vId.includes('RND') ? '#C2410C' : '#1D4ED8'}">${vLabel}</span>
      <span style="font-size:11px;color:#6B7280;margin-left:8px">VOrg: <code style="background:#F3F4F6;padding:1px 6px;border-radius:4px;font-weight:700">${vId}</code></span>
    </div>
    ${!isOwner ? '<span style="margin-left:auto;font-size:11px;color:#9CA3AF;font-weight:600">👁 조회 전용 (오너: 계정 수정 권한 없음)</span>' : ''}
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="width:10px;height:10px;background:${tenant?.color};border-radius:50%;display:inline-block"></span>
      <span style="font-weight:800;font-size:14px;color:#111827">${tenant?.name}</span>
      <span class="bo-badge bo-badge-blue">${accounts.length}개 계정</span>
      <span class="bo-badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">+ 시스템 기본 ${systemAccounts.length}개</span>
    </div>
    ${isOwner
      ? '<button class="bo-btn-primary bo-btn-sm" onclick="openS1Modal()">+ 계정 신규 등록</button>'
      : '<span style="font-size:11px;color:#9CA3AF;font-weight:600;padding:6px 12px;border:1.5px dashed #E5E7EB;border-radius:8px">🔒 계정 등록은 오너만 가능</span>'}
  </div>
  <div class="bo-card" style="overflow:hidden">
    <table class="bo-table">
      <thead><tr>
        <th>계정코드</th><th>구분</th><th>계정명</th>
        <th style="text-align:center">사전계획 필수
          <div style="font-size:10px;color:#1D4ED8;font-weight:600">선택적 연동</div></th>
        <th style="text-align:center">이월 허용</th>
        <th>용도 설명</th><th>담당자</th><th>상태</th><th>관리</th>
      </tr></thead>
      <tbody>
        ${allAccounts.map(a => {
        const planToggle = a.isSystem
          ? '<span style="font-size:11px;color:#9CA3AF">해당없음</span>'
          : bmToggle(a.planRequired, `s1ToggleField('${a.code}','planRequired')`, 'blue')
          + `<div style="font-size:10px;margin-top:2px;color:${a.planRequired ? '#1D4ED8' : '#9CA3AF'}">${a.planRequired ? '✅ 계획 필수' : '❌ 계획 불필요'}</div>`;
        const carryToggle = a.isSystem
          ? '<span style="font-size:11px;color:#9CA3AF">-</span>'
          : bmToggle(a.carryover, `s1ToggleField('${a.code}','carryover')`, 'green');
        const managerHtml = a.isSystem
          ? '<span style="font-size:11px;color:#9CA3AF">플랫폼 제공</span>'
          : `<div style="font-size:12px;font-weight:700">${a.manager || '미지정'}</div>${a.subManager ? `<div style="font-size:11px;color:#6B7280">부: ${a.subManager}</div>` : ''}`;
        const ctrlHtml = a.isSystem
          ? '<span style="font-size:11px;color:#9CA3AF;padding:4px 8px">🔒 수정불가</span>'
          : `<div style="display:flex;gap:6px">
                 <button class="bo-btn-secondary bo-btn-sm" onclick="openS1Modal('${a.code}')">수정</button>
                 <button class="bo-btn-secondary bo-btn-sm" onclick="s1ToggleActive('${a.code}')"
                   style="color:${a.active ? '#F59E0B' : '#059669'};border-color:${a.active ? '#F59E0B' : '#059669'}">
                   ${a.active ? '비활성화' : '활성화'}
                 </button>
               </div>`;
        const groupBadge = a.isSystem
          ? '<span class="bo-badge" style="background:#F3F4F6;color:#6B7280">공통</span>'
          : boGroupBadge(a.group === 'R&D' ? 'rnd' : 'general');
        return `
        <tr style="${a.isSystem ? 'background:#FFFBEB;' : ''}">
          <td>
            <code style="background:#F3F4F6;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${a.code}</code>
            ${a.isSystem ? '<span style="margin-left:4px;background:#FEF3C7;color:#92400E;font-size:10px;font-weight:800;padding:1px 6px;border-radius:4px">SYSTEM</span>' : ''}
          </td>
          <td>${groupBadge}</td>
          <td style="font-weight:700">${a.name}</td>
          <td style="text-align:center">${planToggle}</td>
          <td style="text-align:center">${carryToggle}</td>
          <td style="font-size:12px;color:#6B7280">${a.desc || ''}</td>
          <td>${managerHtml}</td>
          <td><span class="bo-badge ${a.active ? 'bo-badge-green' : 'bo-badge-gray'}">${a.active ? '활성' : '비활성'}</span></td>
          <td>${ctrlHtml}</td>
        </tr>`;
      }).join('')}

      </tbody>
    </table>
  </div>
  <div class="bo-card" style="padding:14px 20px;margin-top:12px;background:#FFFBEB;border-color:#FDE68A">
    <span style="font-size:12px;font-weight:700;color:#92400E">
      🔒 <strong>[공통-무예산/자비수강]</strong>은 플랫폼이 기본 제공하는 시스템 계정입니다. 예산 집행 없이 학습이력만 등록할 수 있으며, 수정·삭제가 불가합니다.
    </span>
  </div>
  <div class="bo-card" style="padding:14px 20px;margin-top:12px;background:#EFF6FF;border-color:#BFDBFE">
    <span style="font-size:12px;font-weight:700;color:#1E40AF">
      💡 <strong>[사전계획 필수 ON]</strong>: 이 계정은 향후 [Step4] 통합 정책에서 양식 연결 시, 사전에 승인받은 교육계획서를 반드시 연동해야만 신청이 가능해집니다.
    </span>
  </div>
</div>

<!-- 계정 등록/수정 모달 -->
<div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="s1-modal-title" style="font-size:15px;font-weight:800;margin:0">예산 계정 신규 등록</h3>
      <button onclick="s1CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="s1-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="s1CloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="s1SaveAccount()">저장</button>
    </div>
  </div>
</div>`;
}

// ── 구버전 모달/저장 코드 제거됨 → 282줄의 openS1Modal / s1SaveAccount 사용 ──

function s1ToggleField(code, field) {
  const a = ACCOUNT_MASTER.find(x => x.code === code);
  if (a) a[field] = !a[field];
  const el = document.getElementById('ba-content') || document.getElementById('bm-content');
  if (el) el.innerHTML = _baRenderContent();
}

function s1ToggleActive(code) {
  const a = ACCOUNT_MASTER.find(x => x.code === code);
  if (a) a.active = !a.active;
  const el = document.getElementById('ba-content') || document.getElementById('bm-content');
  if (el) el.innerHTML = _baRenderContent();
}



// ═════════════════════════════════════════════════════════════════════════════
// [Step2] 조직별 예산 계정 매핑
// ═════════════════════════════════════════════════════════════════════════════
let _s2OrgTenant = 'HMG';
let _s2SelAccount = null; // 좌측에서 선택한 계정 코드

// 조직-계정 매핑 상태: { tenantId_accountCode: Set of virtualGroupIds }
let ORG_ACCOUNT_MAP = {
  'HMG_GEN-OPS': new Set(['HQ01', 'HQ02']),
  'HMG_GEN-PART': new Set(['HQ01', 'HQ02']),
  'HMG_GEN-ETC': new Set(['HQ01', 'HQ02']),
  'HMG_RND-INT': new Set(['C01', 'C02']),
  'KIA_GEN-OPS': new Set(['HQ01']),
};

function renderStep2OrgMap() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const accounts = getPersonaAccounts(boCurrentPersona);
  if (!_s2SelAccount || !accounts.find(a => a.code === _s2SelAccount)) {
    _s2SelAccount = accounts[0]?.code || null;
  }
  const mapKey = `${tenantId}_${_s2SelAccount}`;
  const mappedOrgIds = ORG_ACCOUNT_MAP[mapKey] || new Set();
  const selAcc = accounts.find(a => a.code === _s2SelAccount);

  // 가상 조직 목록
  const allGroups = [
    ...virtualOrgState.general.hqs.map(h => ({ id: h.id, name: h.name, type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' })),
    ...virtualOrgState.rnd.centers.map(c => ({ id: c.id, name: c.name, type: 'R&D센터', icon: '🔬', color: '#6D28D9', bg: '#F5F3FF' }))
  ];

  return `
<div>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
    <div class="bo-card" style="padding:10px 14px;flex:1;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">📌</span>
      <span style="font-size:12px;color:#374151">
        <strong>좌측</strong>에서 계정을 선택하고, <strong>우측</strong>에서 이 계정을 사용할 가상 조직을 체크합니다.
      </span>
    </div>
  </div>
  <div class="bo-split">
    <!-- 좌: 계정 목록 -->
    <div class="bo-split-left">
      <div style="padding:10px 16px;font-size:10px;font-weight:900;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #F3F4F6">
        할당된 계정
      </div>
      ${accounts.map(a => `
      <div class="bo-split-item ${_s2SelAccount === a.code ? 'active' : ''}"
           onclick="s2OrgSelAccount('${a.code}')">
        <div style="font-weight:700">${a.name}</div>
        <div style="font-size:11px;margin-top:2px;opacity:.7">
          <code>${a.code}</code> · ${a.planRequired ? '계획필수' : '계획불필요'}
        </div>
        <div style="font-size:11px;margin-top:2px;opacity:.6">
          ${(ORG_ACCOUNT_MAP[`${tenantId}_${a.code}`] || new Set()).size}개 조직 매핑됨
        </div>
      </div>`).join('')}
    </div>

    <!-- 우: 가상 조직 체크박스 -->
    <div class="bo-split-right">
      ${selAcc ? `
      <div style="margin-bottom:14px;padding:12px 16px;background:#F9FBFF;border-radius:10px;border:1.5px solid #BFDBFE">
        <div style="font-weight:800;color:#1E40AF;font-size:13px">${selAcc.name} <code style="font-size:11px;background:#DBEAFE;padding:1px 6px;border-radius:4px">${selAcc.code}</code></div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">아래 조직들이 이 계정을 사용할 수 있습니다</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${allGroups.map(g => {
    const checked = mappedOrgIds.has(g.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;
                        border:1.5px solid ${checked ? g.color + '40' : '#F3F4F6'};
                        background:${checked ? g.bg : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="s2OrgToggleMap('${tenantId}','${_s2SelAccount}','${g.id}',this.checked)"
              style="width:16px;height:16px;accent-color:${g.color}">
            <span style="font-size:15px">${g.icon}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:${checked ? g.color : '#374151'}">${g.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${g.type}</div>
            </div>
          </label>`;
  }).join('')}
      </div>` : '<div style="padding:24px;text-align:center;color:#9CA3AF">좌측에서 계정을 선택하세요</div>'}
    </div>
  </div>
  <div class="bo-card" style="padding:12px 18px;margin-top:12px;background:#ECFDF5;border-color:#A7F3D0">
    <span style="font-size:12px;font-weight:700;color:#065F46">
      ✅ 여기서 매핑된 조직만 [Step4] 양식·예산 정책 설정에서 룰을 만들 수 있습니다.
    </span>
  </div>
</div>`;
}

function s2OrgSelAccount(code) {
  _s2SelAccount = code;
  document.getElementById('bm-content').innerHTML = renderStep2OrgMap();
}

function s2OrgToggleMap(tenantId, accountCode, groupId, active) {
  const key = `${tenantId}_${accountCode}`;
  if (!ORG_ACCOUNT_MAP[key]) ORG_ACCOUNT_MAP[key] = new Set();
  if (active) ORG_ACCOUNT_MAP[key].add(groupId);
  else ORG_ACCOUNT_MAP[key].delete(groupId);
  document.getElementById('bm-content').innerHTML = renderStep2OrgMap();
}

// ═════════════════════════════════════════════════════════════════════════════
// [Step4] 조직별 신청 양식 접근 권한
// ═════════════════════════════════════════════════════════════════════════════
let _s2Tenant = 'HMG';
let _s4SelGroupId = null;

function _s2GetGroups(tid) {
  const all = [];
  virtualOrgState.general.hqs.forEach(h => all.push({ id: h.id, name: h.name, type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' }));
  virtualOrgState.rnd.centers.forEach(c => all.push({ id: c.id, name: c.name, type: 'R&D센터', icon: '🔬', color: '#6D28D9', bg: '#F5F3FF' }));
  if (tid === 'KIA') return [
    { id: 'HQ01', name: '기아 생산본부', type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' },
    { id: 'HQ02', name: '기아 사무직본부', type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' }
  ];
  return all;
}

function renderStep2() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  _s2Tenant = tenantId;
  const groups = _s2GetGroups(tenantId);
  const applyForms = getTenantForms(tenantId, 'apply');
  const planForms = getTenantForms(tenantId, 'plan');
  const allForms = [...planForms, ...applyForms];

  if (!_s4SelGroupId || !groups.find(g => g.id === _s4SelGroupId)) {
    _s4SelGroupId = groups[0]?.id || null;
  }
  const selGroup = groups.find(g => g.id === _s4SelGroupId);
  const mapKey = `${tenantId}_${_s4SelGroupId}`;
  const rule = FORM_ACCESS_RULES[mapKey] || { formIds: [] };

  return `
<div>
  <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px">
    <div class="bo-card" style="padding:10px 14px;flex:1;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">📌</span>
      <span style="font-size:12px;color:#374151">
        <strong>좌측</strong>에서 가상 조직을 선택하고, <strong>우측</strong>에서 해당 조직에 노출할 신청 양식을 체크합니다.
      </span>
    </div>
  </div>
  <div class="bo-split">
    <!-- 좌: 조직 목록 -->
    <div class="bo-split-left">
      <div style="padding:10px 16px;font-size:10px;font-weight:900;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #F3F4F6">가상 조직</div>
      ${groups.map(g => {
    const gKey = `${tenantId}_${g.id}`;
    const gRule = FORM_ACCESS_RULES[gKey] || { formIds: [] };
    const cnt = gRule.formIds.length;
    return `
        <div class="bo-split-item ${_s4SelGroupId === g.id ? 'active' : ''}"
             onclick="s4SelGroup('${g.id}')">
          <div style="display:flex;align-items:center;gap:6px">
            <span>${g.icon}</span>
            <span style="font-weight:700">${g.name}</span>
          </div>
          <div style="font-size:11px;margin-top:2px;opacity:.7">${g.type}</div>
          <div style="font-size:11px;margin-top:2px;opacity:.6">${cnt}개 양식 노출 중</div>
        </div>`;
  }).join('')}
    </div>
    <!-- 우: 양식 체크박스 -->
    <div class="bo-split-right">
      ${selGroup ? `
      <div style="margin-bottom:14px;padding:12px 16px;background:#F9FBFF;border-radius:10px;border:1.5px solid #BFDBFE">
        <div style="font-weight:800;color:#1E40AF;font-size:13px">${selGroup.icon} ${selGroup.name}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">이 조직의 학습자 화면에 노출할 양식을 선택하세요</div>
      </div>
      ${allForms.length === 0 ? `<div style="text-align:center;padding:32px;color:#9CA3AF">Step3에서 양식을 먼저 생성해 주세요.</div>` : `
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#7C3AED">📋 교육계획 양식</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        ${planForms.map(f => {
    const checked = rule.formIds.includes(f.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
                        border:1.5px solid ${checked ? '#7C3AED40' : '#F3F4F6'};
                        background:${checked ? '#F5F3FF' : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''}
              onchange="s4ToggleForm('${tenantId}','${_s4SelGroupId}','${f.id}',this.checked)"
              style="width:16px;height:16px;accent-color:#7C3AED">
            <div>
              <div style="font-weight:700;font-size:12px;color:${checked ? '#7C3AED' : '#374151'}">${f.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${f.desc || ''}</div>
            </div>
          </label>`;
  }).join('')}
      </div>
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#059669">📄 교육신청 양식</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${applyForms.map(f => {
    const checked = rule.formIds.includes(f.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
                        border:1.5px solid ${checked ? '#05966940' : '#F3F4F6'};
                        background:${checked ? '#F0FDF4' : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''}
              onchange="s4ToggleForm('${tenantId}','${_s4SelGroupId}','${f.id}',this.checked)"
              style="width:16px;height:16px;accent-color:#059669">
            <div>
              <div style="font-weight:700;font-size:12px;color:${checked ? '#059669' : '#374151'}">${f.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${f.desc || ''}</div>
            </div>
          </label>`;
  }).join('')}
      </div>`}
      ` : '<div style="padding:24px;text-align:center;color:#9CA3AF">좌측에서 조직을 선택하세요</div>'}
    </div>
  </div>
  <div class="bo-card" style="padding:12px 18px;margin-top:12px;background:#ECFDF5;border-color:#A7F3D0">
    <span style="font-size:12px;font-weight:700;color:#065F46">
      ✅ 여기서 노출 허가된 양식만 Front(LXP) 학습자 화면의 신청 버튼에 표시됩니다.
    </span>
  </div>
</div>`;
}

function s4SelGroup(groupId) {
  _s4SelGroupId = groupId;
  document.getElementById('bm-content').innerHTML = renderStep2();
}

function s4ToggleForm(tenantId, groupId, formId, active) {
  const key = `${tenantId}_${groupId}`;
  if (!FORM_ACCESS_RULES[key]) FORM_ACCESS_RULES[key] = { formIds: [] };
  const ids = FORM_ACCESS_RULES[key].formIds;
  const idx = ids.indexOf(formId);
  if (active && idx === -1) ids.push(formId);
  else if (!active && idx > -1) ids.splice(idx, 1);
  document.getElementById('bm-content').innerHTML = renderStep2();
}
// [2.3] ?덉궛-議곗쭅-?묒떇 ?듯빀 留ㅽ븨 猷?鍮뚮뜑 (Top-down)

// [2.3] 예산-조직-양식 통합 매핑 룰 빌더 (Top-down)
// =============================================================================
let _s3Tenant = 'HMG';
let _s3EditingRuleId = null;

function renderStep3() {
  const tenantId = boCurrentPersona.tenantId || _s3Tenant;
  _s3Tenant = tenantId;
  const rules = FORM_BUDGET_RULES.filter(r => r.tenantId === tenantId);
  const accounts = getPersonaAccounts(boCurrentPersona);
  const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;

  // 예산 단위로 그룹핑
  const accGrouped = {};
  rules.forEach(r => {
    if (!accGrouped[r.accountCode]) accGrouped[r.accountCode] = [];
    accGrouped[r.accountCode].push(r);
  });

  const ruleCards = Object.keys(accGrouped).map(code => {
    const acc = accounts.find(a => a.code === code);
    if (!acc) return '';
    const accCards = accGrouped[code].map(r => {
      const tpl = VIRTUAL_EDU_ORGS.find(t => t.id === r.templateId) || { name: r.templateId || '전체(미지정)' };
      const applyForm = r.formId ? (FORM_MASTER.find(f => f.id === r.formId) || { name: r.formId }) : null;
      const planForm = r.planFormId ? FORM_MASTER.find(f => f.id === r.planFormId) : null;
      const resultForm = r.resultFormId ? FORM_MASTER.find(f => f.id === r.resultFormId) : null;

      // 프로세스 흐름 배지
      const flowConfig = {
        'plan-apply-result': { label: '계획 ➡️ 신청 ➡️ 결과', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
        'apply-result': { label: '신청 ➡️ 결과', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
        'result-only': { label: '결과 단독', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' }
      };
      const flow = flowConfig[r.processFlow] || flowConfig['apply-result'];
      const flowBadge = `<span style="background:${flow.bg};color:${flow.color};border:1px solid ${flow.border};font-size:11px;font-weight:800;padding:2px 10px;border-radius:20px">${flow.label}</span>`;

      const ltHtml = r.learningTypes && r.learningTypes.length ? r.learningTypes.map(lt =>
        `<span style="background:#F5F3FF;color:#6D28D9;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">${lt}</span>`
      ).join('') : '<span style="font-size:11px;color:#9CA3AF">모든 유형</span>';

      // 양식 섹션 (프로세스 흐름에 따라)
      let formSection = '';
      if (r.processFlow === 'plan-apply-result' && planForm) {
        formSection += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:11px;font-weight:700;color:#7C3AED">📋 계획폼:</span>
                <span style="background:#F5F3FF;color:#7C3AED;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${planForm.name}</span>
                ${r.multiPlanAllowed ? '<span style="background:#ECFDF5;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">복수 계획 허용</span>' : ''}
              </div>`;
      }
      if (applyForm && r.processFlow !== 'result-only') {
        formSection += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:11px;font-weight:700;color:#059669">📄 신청폼:</span>
                <span style="background:#F0FDF4;color:#059669;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${applyForm.name}</span>
              </div>`;
      }
      if (resultForm) {
        formSection += `<div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;font-weight:700;color:#D97706">📝 결과폼:</span>
                <span style="background:#FFFBEB;color:#D97706;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${resultForm.name}</span>
              </div>`;
      }

      return `<div style="padding:12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px;background:#fff">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
              ${flowBadge}
              <span class="bo-rule-label if-label" style="background:#FCE7F3;color:#BE185D">템플릿</span>
              <span style="font-size:13px;font-weight:700;color:#111827">${tpl.name}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px;padding:8px 12px;background:#F9FAFB;border-radius:8px">
              ${formSection || '<span style="font-size:11px;color:#9CA3AF">양식 미연결</span>'}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:12px;color:#6B7280;font-weight:600">허용 학습유형:</span>
              ${ltHtml}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="openEditRuleModal('${r.id}')" style="border:1.5px dashed #D1D5DB;background:none;border-radius:8px;padding:4px 10px;font-size:12px;color:#9CA3AF;cursor:pointer">✏️ 편집</button>
            <button onclick="s3DeleteRule('${r.id}')" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:16px;padding:4px">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="bo-rule-card" style="margin-bottom:14px;padding:20px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid #F3F4F6">
        <span style="font-size:16px">💳</span>
        <span style="font-size:15px;font-weight:800;color:#1E40AF">${acc.name}</span>
        <code style="background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${acc.code}</code>
        <span style="font-size:11px;color:#6B7280;margin-left:auto">${acc.planRequired ? '사전계획 필수' : '계획 불필요'} 계정</span>
      </div>
      ${accCards}
    </div>`;
  }).join('');

  const modalHtml = `
  <div id="s3-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div class="fade-in" style="background:#fff;border-radius:16px;width:600px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 id="s3-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">정책 매핑 상세 설정</h3>
        <button onclick="s3CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="s3-modal-body"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:24px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="s3CloseModal()">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="s3SaveRule()">저장</button>
      </div>
    </div>
  </div>`;

  return `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:13px;font-weight:800;color:#111827">${tenantName} — 예산 ↔ 가상조직 템플릿 ↔ 양식/학습유형 통합 매핑 (Top-down)</div>
        <div style="font-size:12px;color:#6B7280">${rules.length}개의 통합 매핑 정책이 설정됨</div>
      </div>
      <button class="bo-btn-primary bo-btn-sm" onclick="openAddRuleModal()">+ 새 매핑 정책 추가</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">${ruleCards || '<div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">설정된 매핑 정책이 없습니다.</div>'}</div>
  </div>${modalHtml}`;
}
function s3ChangeTenant(tid) { _s3Tenant = tid; document.getElementById('bm-content').innerHTML = renderStep3(); }

function s3ToggleBudgetRequired(ruleId) {
  const r = FORM_BUDGET_RULES.find(x => x.id === ruleId);
  if (r) r.budgetRequired = !r.budgetRequired;
  document.getElementById('bm-content').innerHTML = renderStep3();
}

function s3DeleteRule(ruleId) {
  if (!confirm('이 정책을 삭제하시겠습니까?')) return;
  const idx = FORM_BUDGET_RULES.findIndex(x => x.id === ruleId);
  if (idx > -1) FORM_BUDGET_RULES.splice(idx, 1);
  document.getElementById('bm-content').innerHTML = renderStep3();
}

function _s3ModalBody(rule) {
  const tenantId = boCurrentPersona.tenantId || _s3Tenant;
  const templates = VIRTUAL_EDU_ORGS.filter(t => t.tenantId === tenantId);
  const accounts = getPersonaAccounts(boCurrentPersona);
  const applyForms = getTenantForms(tenantId, 'apply');
  const planForms = getTenantForms(tenantId, 'plan');
  const resultForms = getTenantForms(tenantId, 'result');

  const accVal = rule?.accountCode || '';
  const tplVal = rule?.templateId || '';
  const fVal = rule?.formId || '';
  const planFmVal = rule?.planFormId || '';
  const resultFmVal = rule?.resultFormId || '';
  const flowVal = rule?.processFlow || 'apply-result';
  const selLt = rule?.learningTypes || [];
  const multi = rule?.multiPlanAllowed || false;

  const selAcc = accounts.find(a => a.code === accVal);
  const planReq = selAcc?.planRequired || false;

  const ltHtml = LEARNING_TYPES.map(cat => `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">${cat.category}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${cat.items.map(item => `
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer">
          <input type="checkbox" class="s3-lt-cb" value="${item}" ${selLt.includes(item) ? 'checked' : ''} style="accent-color:#6D28D9;margin:0"> ${item}
        </label>`).join('')}
      </div>
    </div>
  `).join('');

  // 각 계정 옵션: 시스템 계정 포함
  const allAccounts = [...ACCOUNT_MASTER.filter(a => a.isSystem && a.active), ...accounts];

  const flowOptions = [
    { val: 'plan-apply-result', label: '📋 계획 ➡️ 신청 ➡️ 결과 (3단계)', desc: 'R&D 예산 등 사전 계획 필수 계정에 적용' },
    { val: 'apply-result', label: '📄 신청 ➡️ 결과 (2단계)', desc: '일반 참가/운영계정 등 계획 불필요 계정에 적용' },
    { val: 'result-only', label: '📝 결과 단독 (1단계)', desc: '무예산/자비 학습 이력 등록에만 사용' }
  ];

  return `
  <div style="margin-bottom:14px;padding:12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#1E40AF;display:block;margin-bottom:5px">1. 예산 선택 (Budget)</label>
    <select id="s3-account" onchange="s3UpdateModalDynamic()" style="width:100%;padding:9px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;background:#EFF6FF;font-weight:700;outline:none">
      <option value="">— 예산 계정 선택 —</option>
      ${allAccounts.map(a => `<option value="${a.code}" ${accVal === a.code ? 'selected' : ''} data-plan="${a.planRequired}">${a.name} (${a.code}) - ${a.isSystem ? '시스템 기본' : (a.planRequired ? '계획 필수' : '계획 불필요')}</option>`).join('')}
    </select>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">2. 대상 조직 템플릿 통째 연결 (Virtual Org Template)</label>
    <select id="s3-template" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      <option value="">— 매핑할 가상조직 템플릿 선택 —</option>
      ${templates.map(t => `<option value="${t.id}" ${tplVal === t.id ? 'selected' : ''}>🧩 ${t.name}</option>`).join('')}
    </select>
    <p style="font-size:11px;color:#6B7280;margin:6px 0 0">선택한 템플릿에 속한 모든 하위 본부/팀에 권한이 부여됩니다.</p>
  </div>

  <!-- Step 3: 프로세스 흐름 선택 -->
  <div style="margin-bottom:14px;padding:12px;background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#5B21B6;display:block;margin-bottom:10px">3. 프로세스 흐름 선택 ⭐ (핵심)</label>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${flowOptions.map(opt => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:10px;
                    background:${flowVal === opt.val ? '#EDE9FE' : '#fff'};
                    border:1.5px solid ${flowVal === opt.val ? '#8B5CF6' : '#E5E7EB'};
                    cursor:pointer;transition:all .15s" onclick="s3SelectFlow('${opt.val}')">
        <input type="radio" name="s3-flow" value="${opt.val}" ${flowVal === opt.val ? 'checked' : ''}
               style="accent-color:#7C3AED;margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:12px;color:${flowVal === opt.val ? '#5B21B6' : '#374151'}">${opt.label}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${opt.desc}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>

  <!-- Step 3-1: 양식 설정 -->
  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">4. 양식 매핑 (Forms)</label>

    <div id="s3-plan-div" style="display:${planReq || flowVal === 'plan-apply-result' ? 'block' : 'none'};background:#F5F3FF;padding:10px;border-radius:8px;border:1px solid #DDD6FE;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:#5B21B6;margin-bottom:4px;display:block">📋 계획 양식 (계획 단계 진입점)</span>
      <select id="s3-plan-form" style="width:100%;padding:9px 12px;border:1.5px solid #C4B5FD;border-radius:8px;font-size:13px;background:#fff;margin-bottom:8px;outline:none">
        <option value="">— 계획 양식 선택 —</option>
        ${planForms.map(f => `<option value="${f.id}" ${planFmVal === f.id ? 'selected' : ''}>📋 ${f.name}</option>`).join('')}
      </select>
      <label class="bo-toggle-wrap" style="gap:10px;cursor:pointer">
        <label class="bo-toggle green" style="pointer-events:none"><input type="checkbox" id="s3-multi" ${multi ? 'checked' : ''}><span class="bo-toggle-slider" style="pointer-events:all"></span></label>
        <div>
          <div style="font-size:11px;font-weight:700;color:#059669">복수 교육계획 선택 허용 (Multi-select)</div>
          <div style="font-size:10px;color:#6B7280">담당자가 여러 승인된 계획을 합쳐 신청할 때 사용</div>
        </div>
      </label>
    </div>

    <div id="s3-apply-div" style="display:${flowVal !== 'result-only' ? 'block' : 'none'};margin-bottom:8px">
      <span style="font-size:11px;color:#6B7280;margin-bottom:2px;display:block">📄 신청 양식 (신청 단계 진입점)</span>
      <select id="s3-apply-form" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
        <option value="">— 신청 양식 선택 —</option>
        ${applyForms.map(f => `<option value="${f.id}" ${fVal === f.id ? 'selected' : ''}>📄 ${f.name}</option>`).join('')}
      </select>
    </div>

    <div>
      <span style="font-size:11px;color:#D97706;margin-bottom:2px;font-weight:700;display:block">📝 결과 양식 (결과 등록 단계)</span>
      <select id="s3-result-form" style="width:100%;padding:9px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px;background:#FFFBEB;outline:none">
        <option value="">— 결과 양식 선택 —</option>
        ${resultForms.map(f => `<option value="${f.id}" ${resultFmVal === f.id ? 'selected' : ''}>📝 ${f.name}</option>`).join('')}
      </select>
    </div>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:8px">5. 허용 학습유형 제어 (Learning Types)</label>
    <div style="font-size:11px;color:#6B7280;margin-bottom:10px">이 정책 하에서 허용할 세부 교육 항목을 체크해 주세요.</div>
    <div style="padding:12px;background:#fff;border:1px solid #E5E7EB;border-radius:8px">
      ${ltHtml}
    </div>
  </div>`;
}

function s3UpdateModalDynamic() {
  const accSelect = document.getElementById('s3-account');
  const opt = accSelect.options[accSelect.selectedIndex];
  const isPlanReq = opt && opt.dataset.plan === 'true';
  const flowRadio = document.querySelector('input[name="s3-flow"]:checked');
  const flow = flowRadio ? flowRadio.value : 'apply-result';
  const planDiv = document.getElementById('s3-plan-div');
  const applyDiv = document.getElementById('s3-apply-div');
  if (planDiv) planDiv.style.display = (isPlanReq || flow === 'plan-apply-result') ? 'block' : 'none';
  if (applyDiv) applyDiv.style.display = flow !== 'result-only' ? 'block' : 'none';
}

function s3SelectFlow(val) {
  document.querySelectorAll('input[name="s3-flow"]').forEach(r => r.checked = (r.value === val));
  s3UpdateModalDynamic();
  // 라디오 레이블 스타일 업데이트
  document.querySelectorAll('label[onclick^="s3SelectFlow"]').forEach(lbl => {
    const isSelected = lbl.getAttribute('onclick') === `s3SelectFlow('${val}')`;
    lbl.style.background = isSelected ? '#EDE9FE' : '#fff';
    lbl.style.borderColor = isSelected ? '#8B5CF6' : '#E5E7EB';
  });
}

function openAddRuleModal() {
  _s3EditingRuleId = null;
  document.getElementById('s3-modal-title').textContent = '새 매핑 정책 추가';
  document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(null);
  const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function openEditRuleModal(ruleId) {
  _s3EditingRuleId = ruleId;
  const rule = FORM_BUDGET_RULES.find(r => r.id === ruleId);
  document.getElementById('s3-modal-title').textContent = '매핑 정책 편집';
  document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(rule);
  const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function s3SaveRule() {
  const acc = document.getElementById('s3-account').value;
  const tpl = document.getElementById('s3-template').value;
  const flowRadio = document.querySelector('input[name="s3-flow"]:checked');
  const processFlow = flowRadio ? flowRadio.value : 'apply-result';
  const applyDivEl = document.getElementById('s3-apply-div');
  const fid = applyDivEl && applyDivEl.style.display !== 'none'
    ? (document.getElementById('s3-apply-form')?.value || null)
    : null;
  const resultFormEl = document.getElementById('s3-result-form');
  const resultFormId = resultFormEl ? (resultFormEl.value || null) : null;
  const planFmEl = document.getElementById('s3-plan-form');
  const multiEl = document.getElementById('s3-multi');
  const planDiv = document.getElementById('s3-plan-div');
  const isPlanVisible = planDiv && planDiv.style.display !== 'none';
  const planFormId = (isPlanVisible && planFmEl) ? (planFmEl.value || null) : null;
  const multiPlanAllowed = (isPlanVisible && multiEl) ? multiEl.checked : false;
  const ltCbs = [...document.querySelectorAll('.s3-lt-cb:checked')];
  const learningTypes = ltCbs.map(cb => cb.value);
  if (!acc || !tpl) { alert('예산 계정과 대상 조직 템플릿을 선택해주세요.'); return; }
  if (processFlow !== 'result-only' && !fid) { alert('신청 양식을 선택해주세요.'); return; }
  if (processFlow === 'result-only' && !resultFormId) { alert('결과 양식을 선택해주세요.'); return; }
  if (_s3EditingRuleId) {
    const r = FORM_BUDGET_RULES.find(x => x.id === _s3EditingRuleId);
    if (r) {
      r.accountCode = acc; r.templateId = tpl; r.formId = fid;
      r.planFormId = planFormId; r.multiPlanAllowed = multiPlanAllowed;
      r.learningTypes = learningTypes; r.processFlow = processFlow;
      r.resultFormId = resultFormId;
    }
  } else {
    FORM_BUDGET_RULES.push({
      id: 'R' + (Date.now()), tenantId: boCurrentPersona.tenantId || _s3Tenant,
      accountCode: acc, templateId: tpl, formId: fid,
      planFormId, multiPlanAllowed, learningTypes, processFlow, resultFormId
    });
  }
  s3CloseModal();
  document.getElementById('bm-content').innerHTML = renderStep3();
}

function s3CloseModal() {
  document.getElementById('s3-modal').style.display = 'none';
}









// ═════════════════════════════════════════════════════════════════════════════
// 권한 관리 (탭5)
// ═════════════════════════════════════════════════════════════════════════════
function renderPermissions() {
  const personas = Object.values(BO_PERSONAS);
  return `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
    <span class="bo-section-title">권한 및 담당자 현황</span>
    <button class="bo-btn-primary bo-btn-sm">+ 담당자 추가</button>
  </div>
  <table class="bo-table">
    <thead><tr><th>성명</th><th>소속</th><th>직급</th><th>역할</th><th>접근 메뉴</th><th>관리</th></tr></thead>
    <tbody>
      ${personas.map(p => `
      <tr>
        <td style="font-weight:700">${p.name}</td>
        <td style="font-size:12px;color:#6B7280">${p.dept}</td>
        <td style="font-size:12px">${p.pos}</td>
        <td><span class="role-tag ${p.roleClass}">${p.roleLabel}</span></td>
        <td style="font-size:11px;color:#6B7280">${p.accessMenus.join(' · ')}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="bo-btn-secondary bo-btn-sm">수정</button>
            <button class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#EF4444">삭제</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}




// ═════════════════════════════════════════════════════════════════════════════
// [예산 배정 현황 관리] — 조직별 통장 + 기간별 배정 관리 (5탭)
// ═════════════════════════════════════════════════════════════════════════════
let _obTenant = null;
let _obTplId = null;
let _obGroupId = null;
let _obAccountId = null;
let _obPeriodId = null;
let _obTplList = [];
let _obAcctList = [];
let _obGroups = [];
let _obPeriods = [];
let _obBankbooks = [];
let _obAllocations = [];
let _obLogs = [];
let _obTab = 0;
let _obAllBankbooks = [];   // 전체 템플릿 통장 (교차 VOrg 이관용)
let _obAllAllocations = []; // 전체 템플릿 allocation
let _obOrgStatuses = {};    // org_id → 'active'|'deprecated'

// ── 공통 데이터 로드 ──
async function _obLoadData() {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
  if (!_obTenant) _obTenant = isPlatform ? (tenants[0]?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');

  try { const { data } = await sb.from('virtual_org_templates').select('id,name,service_type,purpose,tree_data').eq('tenant_id', _obTenant); _obTplList = (data || []).filter(t => (t.purpose || t.service_type || 'edu_support') === 'edu_support'); } catch (e) { _obTplList = []; }
  if (!_obTplId || !_obTplList.find(t => t.id === _obTplId)) _obTplId = _obTplList[0]?.id || null;

  const curTpl = _obTplList.find(t => t.id === _obTplId);
  _obGroups = curTpl?.tree_data?.hqs || [];

  if (_obTplId) {
    try { const { data } = await sb.from('budget_accounts').select('*').eq('virtual_org_template_id', _obTplId).eq('tenant_id', _obTenant); _obAcctList = (data || []).filter(a => a.active); } catch (e) { _obAcctList = []; }
  } else { _obAcctList = []; }
  if (_obAccountId && !_obAcctList.find(a => a.id === _obAccountId)) _obAccountId = null;

  try { const { data } = await sb.from('budget_periods').select('*').eq('tenant_id', _obTenant).order('fiscal_year', { ascending: false }).order('quarter', { ascending: true, nullsFirst: true }); _obPeriods = data || []; } catch (e) { _obPeriods = []; }
  if (!_obPeriodId || !_obPeriods.find(p => p.id === _obPeriodId)) _obPeriodId = _obPeriods[0]?.id || null;

  if (_obTplId) {
    let q = sb.from('org_budget_bankbooks').select('*').eq('tenant_id', _obTenant).eq('template_id', _obTplId).eq('status', 'active');
    if (_obGroupId) q = q.eq('vorg_group_id', _obGroupId);
    if (_obAccountId) q = q.eq('account_id', _obAccountId);
    try { const { data } = await q; _obBankbooks = data || []; } catch (e) { _obBankbooks = []; }
  } else { _obBankbooks = []; }

  if (_obBankbooks.length > 0 && _obPeriodId) {
    const bbIds = _obBankbooks.map(b => b.id);
    try { const { data } = await sb.from('budget_allocations').select('*').in('bankbook_id', bbIds).eq('period_id', _obPeriodId); _obAllocations = data || []; } catch (e) { _obAllocations = []; }
  } else { _obAllocations = []; }

  if (_obAllocations.length > 0) {
    const alIds = _obAllocations.map(a => a.id);
    try { const { data } = await sb.from('budget_allocation_log').select('*').in('allocation_id', alIds).order('performed_at', { ascending: false }).limit(30); _obLogs = data || []; } catch (e) { _obLogs = []; }
  } else { _obLogs = []; }

  // 교차 VOrg 이관용: 필터 무관하게 템플릿 전체 통장 로드
  if (_obTplId) {
    try { const { data } = await sb.from('org_budget_bankbooks').select('*').eq('tenant_id', _obTenant).eq('template_id', _obTplId).eq('status', 'active'); _obAllBankbooks = data || []; } catch (e) { _obAllBankbooks = []; }
    if (_obAllBankbooks.length > 0 && _obPeriodId) {
      const allBbIds = _obAllBankbooks.map(b => b.id);
      try { const { data } = await sb.from('budget_allocations').select('*').in('bankbook_id', allBbIds).eq('period_id', _obPeriodId); _obAllAllocations = data || []; } catch (e) { _obAllAllocations = []; }
    } else { _obAllAllocations = []; }
  } else { _obAllBankbooks = []; _obAllAllocations = []; }

  // 조직 상태 로드 (deprecated 차단용)
  try {
    const { data } = await sb.from('organizations').select('id,status').eq('tenant_id', _obTenant);
    _obOrgStatuses = {};
    (data || []).forEach(o => { _obOrgStatuses[o.id] = o.status; });
  } catch (e) { _obOrgStatuses = {}; }
}

// ── 진입점 ──
async function renderOrgBudget() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div style="padding:40px;text-align:center;color:#6B7280">⏳ 로딩 중...</div>';
  await _obLoadData();

  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
  const curPeriod = _obPeriods.find(p => p.id === _obPeriodId);
  const isClosed = curPeriod?.status === 'closed';
  const fmt = n => Number(n).toLocaleString();

  // ── 필터 HTML ──
  const tenantSel = isPlatform ? `<select onchange="_obTenant=this.value;_obTplId=null;_obGroupId=null;_obAccountId=null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #FDE68A;border-radius:8px;font-size:11px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
    ${tenants.map(t => `<option value="${t.id}" ${t.id === _obTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
  </select>` : `<span style="font-size:12px;font-weight:800;color:#111827">🏢 ${tenants.find(t => t.id === _obTenant)?.name || _obTenant}</span>`;

  const tplSel = _obTplList.length ? `<select onchange="_obTplId=this.value;_obGroupId=null;_obAccountId=null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:11px;font-weight:700;background:#EFF6FF;color:#1D4ED8;cursor:pointer;min-width:180px">
    ${_obTplList.map(t => `<option value="${t.id}" ${t.id === _obTplId ? 'selected' : ''}>${t.name}</option>`).join('')}
  </select>` : '<span style="font-size:11px;color:#9CA3AF">템플릿 없음</span>';

  const groupSel = _obGroups.length ? `<select onchange="_obGroupId=this.value||null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #DDD6FE;border-radius:8px;font-size:11px;font-weight:700;background:#F5F3FF;color:#7C3AED;cursor:pointer">
    <option value="">전체 그룹</option>
    ${_obGroups.map(g => `<option value="${g.id}" ${g.id === _obGroupId ? 'selected' : ''}>${g.name}</option>`).join('')}
  </select>` : '';

  const acctSel = _obAcctList.length ? `<select onchange="_obAccountId=this.value||null;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #BBF7D0;border-radius:8px;font-size:11px;font-weight:700;background:#F0FDF4;color:#059669;cursor:pointer">
    <option value="">전체 계정</option>
    ${_obAcctList.map(a => `<option value="${a.id}" ${a.id === _obAccountId ? 'selected' : ''}>${a.name}</option>`).join('')}
  </select>` : '';

  const periodSel = _obPeriods.length ? `<select onchange="_obPeriodId=this.value;renderOrgBudget()"
    style="padding:6px 10px;border:1.5px solid #FED7AA;border-radius:8px;font-size:11px;font-weight:700;background:#FFF7ED;color:#C2410C;cursor:pointer">
    ${_obPeriods.map(p => `<option value="${p.id}" ${p.id === _obPeriodId ? 'selected' : ''}>${p.period_label}${p.status === 'closed' ? ' (마감)' : ''}</option>`).join('')}
  </select>` : '';

  // ── 탭 ──
  const tabs = ['📊 배정 현황', '💰 기초·추가 배정', '📋 팀 배분', '↔ 이관', '📜 변경 이력'];

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1100px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">예산운영</span>
        <h1 style="font-size:18px;font-weight:900;color:#111827;margin:0">💰 예산 배정 현황 관리</h1>
      </div>
      <p style="font-size:11px;color:#64748B;margin:0">가상교육조직별·예산계정별·기간별 예산 배정 현황을 조회하고 관리합니다.</p>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding:10px 14px;background:#FAFBFF;border:1.5px solid #E5E7EB;border-radius:10px">
    ${tenantSel} ${tplSel} ${groupSel} ${acctSel} ${periodSel}
    ${isClosed ? '<span style="margin-left:auto;font-size:10px;font-weight:800;color:#DC2626;background:#FEE2E2;padding:4px 10px;border-radius:6px">🔒 마감 기간</span>' : ''}
  </div>
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:16px" id="ob-tabs">
    ${tabs.map((t, i) => `<button onclick="_obSwitchTab(${i})" id="ob-tab-${i}"
      style="padding:8px 16px;font-size:11px;font-weight:700;border:none;background:transparent;cursor:pointer;
      color:${i === _obTab ? '#059669' : '#9CA3AF'};border-bottom:${i === _obTab ? '3px solid #059669' : '3px solid transparent'};
      margin-bottom:-2px;transition:all .15s;white-space:nowrap">${t}</button>`).join('')}
  </div>
  <div id="ob-tab-content"></div>
</div>`;

  _obRenderTabContent();
}

function _obSwitchTab(idx) {
  _obTab = idx;
  [0, 1, 2, 3, 4].forEach(i => {
    const t = document.getElementById(`ob-tab-${i}`);
    if (!t) return;
    t.style.color = i === idx ? '#059669' : '#9CA3AF';
    t.style.borderBottom = i === idx ? '3px solid #059669' : '3px solid transparent';
  });
  _obRenderTabContent();
}

function _obRenderTabContent() {
  const el = document.getElementById('ob-tab-content');
  if (!el) return;
  const fns = [_obRenderOverview, _obRenderEntry, _obRenderDist, _obRenderTransfer, _obRenderHistory];
  el.innerHTML = fns[_obTab]();
}

// ═══ 탭1: 배정 현황 ═══
function _obRenderOverview() {
  const fmt = n => Number(n).toLocaleString();
  const totalAlloc = _obAllocations.reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
  const totalUsed = _obAllocations.reduce((s, a) => s + Number(a.used_amount || 0), 0);
  const totalFrozen = _obAllocations.reduce((s, a) => s + Number(a.frozen_amount || 0), 0);
  const totalCarry = _obAllocations.reduce((s, a) => s + Number(a.carryover_amount || 0), 0);
  const balance = totalAlloc + totalCarry - totalUsed - totalFrozen;
  const pct = totalAlloc + totalCarry > 0 ? ((balance / (totalAlloc + totalCarry)) * 100).toFixed(1) : '0';
  const curPeriod = _obPeriods.find(p => p.id === _obPeriodId);

  // 통장 그룹핑
  const grouped = {};
  _obBankbooks.forEach(b => {
    const key = b.vorg_group_id + '|' + b.account_id;
    if (!grouped[key]) grouped[key] = { groupId: b.vorg_group_id, accountId: b.account_id, items: [] };
    grouped[key].items.push(b);
  });

  let bankbookHtml = '';
  if (Object.keys(grouped).length === 0 && _obTplId) {
    bankbookHtml = `<div style="padding:40px;text-align:center;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#9CA3AF">
      <div style="font-size:32px;margin-bottom:8px">📭</div>
      <div style="font-size:12px;font-weight:700;color:#64748B">조직별 통장이 없습니다</div>
      <div style="font-size:11px;margin-top:4px"><button class="bo-btn-primary bo-btn-sm" onclick="_obAutoCreate()" style="background:#7C3AED;border-color:#7C3AED">🏗️ 통장 자동 생성</button></div>
    </div>`;
  } else {
    Object.values(grouped).forEach(g => {
      const grp = _obGroups.find(gr => gr.id === g.groupId);
      const acct = _obAcctList.find(a => a.id === g.accountId);
      const grpAllocs = g.items.map(b => ({ ...b, alloc: _obAllocations.find(a => a.bankbook_id === b.id) }));
      const grpTotal = grpAllocs.reduce((s, b) => s + Number(b.alloc?.allocated_amount || 0), 0);
      const grpUsed = grpAllocs.reduce((s, b) => s + Number(b.alloc?.used_amount || 0), 0);

      bankbookHtml += `<div class="bo-card" style="margin-bottom:12px;overflow:hidden">
        <div style="padding:12px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
          <div><div style="font-weight:900;font-size:13px;color:#1E40AF">🏢 ${grp?.name || g.groupId}</div>
          <div style="font-size:10px;color:#6B7280">💳 ${acct ? acct.name + ' (' + acct.code + ')' : g.accountId} · ${g.items.length}개 조직</div></div>
          <div style="text-align:right"><div style="font-size:10px;color:#6B7280">배정 합계</div><div style="font-weight:900;font-size:14px;color:#059669">${fmt(grpTotal)}원</div></div>
        </div>
        <table class="bo-table" style="font-size:11px"><thead><tr>
          <th style="width:24px"></th><th>조직명</th><th>유형</th>
          <th style="text-align:right">배정액</th><th style="text-align:right">집행</th><th style="text-align:right">동결</th><th style="text-align:right">잔액</th>
          <th style="text-align:center;width:110px">관리</th>
        </tr></thead><tbody>
        ${grpAllocs.map(b => {
        const al = b.alloc;
        const a = Number(al?.allocated_amount || 0), u = Number(al?.used_amount || 0), f = Number(al?.frozen_amount || 0);
        const bal = a - u - f;
        const isP = !b.parent_org_id;
        return `<tr style="${isP ? 'background:#FAFBFF;font-weight:700' : ''}">
            <td style="text-align:center;font-size:10px">${isP ? '▼' : '└'}</td>
            <td style="${isP ? '' : 'padding-left:24px'}">${b.org_type === 'hq' || b.org_type === 'center' ? '🏢' : '👥'} ${b.org_name}${_obOrgStatuses[b.org_id] === 'deprecated' ? ' <span style="font-size:8px;padding:1px 4px;background:#FEE2E2;color:#DC2626;border-radius:3px;font-weight:800">미사용</span>' : ''}</td>
            <td><span style="font-size:9px;padding:1px 5px;border-radius:4px;background:${isP ? '#DBEAFE' : '#F3F4F6'};color:${isP ? '#1D4ED8' : '#6B7280'}">${b.org_type === 'hq' ? '본부' : b.org_type === 'center' ? '센터' : '팀'}</span></td>
            <td style="text-align:right;color:#059669">${fmt(a)}</td>
            <td style="text-align:right;color:#DC2626">${fmt(u)}</td>
            <td style="text-align:right;color:#D97706">${fmt(f)}</td>
            <td style="text-align:right;font-weight:700;color:${bal >= 0 ? '#111' : '#EF4444'}">${fmt(bal)}</td>
            <td style="text-align:center"><button class="bo-btn-secondary bo-btn-sm" onclick="_obEditAlloc('${b.id}',${a})" style="font-size:9px;padding:2px 5px">수정</button> <button class="bo-btn-secondary bo-btn-sm" onclick="_obDeactivateBankbook('${b.id}')" style="font-size:9px;padding:2px 5px;color:#DC2626;border-color:#FECACA" title="통장 비활성화">제외</button></td>
          </tr>`;
      }).join('')}
        </tbody></table></div>`;
    });
  }

  return `
  ${curPeriod ? `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">
    <div class="bo-card" style="padding:12px;text-align:center"><div style="font-size:9px;color:#6B7280;font-weight:700">📅 기간</div><div style="font-size:13px;font-weight:900;color:#111;margin-top:3px">${curPeriod.period_label}</div><div style="font-size:9px;color:${curPeriod.status === 'open' ? '#059669' : '#DC2626'};font-weight:700">${curPeriod.status === 'open' ? '● 진행중' : '● 마감'}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #059669"><div style="font-size:9px;color:#6B7280;font-weight:700">💰 총 배정</div><div style="font-size:15px;font-weight:900;color:#059669;margin-top:3px">${fmt(totalAlloc)}</div>${totalCarry > 0 ? `<div style="font-size:9px;color:#1D4ED8">이월 +${fmt(totalCarry)}</div>` : ''}</div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #DC2626"><div style="font-size:9px;color:#6B7280;font-weight:700">📊 집행</div><div style="font-size:15px;font-weight:900;color:#DC2626;margin-top:3px">${fmt(totalUsed)}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #D97706"><div style="font-size:9px;color:#6B7280;font-weight:700">🔒 동결</div><div style="font-size:15px;font-weight:900;color:#D97706;margin-top:3px">${fmt(totalFrozen)}</div></div>
    <div class="bo-card" style="padding:12px;text-align:center;border-left:3px solid #1D4ED8"><div style="font-size:9px;color:#6B7280;font-weight:700">💡 잔액</div><div style="font-size:15px;font-weight:900;color:#1D4ED8;margin-top:3px">${fmt(balance)}</div><div style="font-size:9px;color:#9CA3AF">${pct}%</div></div>
  </div>` : ''}
  ${bankbookHtml}
  <div id="ob-alloc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:420px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <h3 style="font-size:14px;font-weight:800;margin:0 0 14px">💰 예산 배정 수정</h3>
      <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">배정 금액 (원)</label>
      <input id="ob-alloc-amt" type="number" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700"></div>
      <div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">사유</label>
      <input id="ob-alloc-reason" type="text" placeholder="배정 사유" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px"></div>
      <input id="ob-alloc-bbid" type="hidden">
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('ob-alloc-modal').style.display='none'">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="_obSaveAlloc()">저장</button>
      </div>
    </div>
  </div>`;
}

// ═══ 탭2: 기초·추가 배정 ═══
function _obRenderEntry() {
  const fmt = n => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find(p => p.id === _obPeriodId);
  const isClosed = curPeriod?.status === 'closed';

  if (isClosed) return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div>
    <div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간입니다 — 배정 수정이 불가합니다</div></div>`;

  if (_obBankbooks.length === 0) return `<div style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:32px">📭</div><div style="font-weight:700;margin-top:8px">조직 통장이 없습니다. 탭1에서 통장을 먼저 생성하세요.</div></div>`;

  // 기초 미배정 통장
  const unallocated = _obBankbooks.filter(b => !_obAllocations.find(a => a.bankbook_id === b.id));
  const allocated = _obBankbooks.filter(b => _obAllocations.find(a => a.bankbook_id === b.id));

  return `<div style="max-width:750px">
    <!-- 기초 배정 -->
    ${unallocated.length > 0 ? `
    <div class="bo-card" style="padding:20px;border:2px solid #FED7AA;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="background:#C2410C;color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:6px">초기 설정</span>
        <span style="font-weight:800;font-size:13px;color:#C2410C">기초 예산 일괄 입력</span>
        <span style="font-size:10px;color:#9CA3AF">${unallocated.length}개 통장 미배정</span>
      </div>
      <div style="background:#FFF7ED;border-radius:8px;padding:8px 12px;font-size:11px;color:#92400E;margin-bottom:12px">
        ✏️ 아래 통장에 기초 예산을 입력하면 즉시 반영됩니다.
      </div>
      <div style="max-height:300px;overflow-y:auto">
      ${unallocated.map((b, i) => {
    const grp = _obGroups.find(g => g.id === b.vorg_group_id);
    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #F3F4F6">
          <span style="font-size:11px;font-weight:700;min-width:160px">${grp?.name || ''} > ${b.org_name}</span>
          <input type="number" id="ob-init-${i}" placeholder="0" style="flex:1;padding:6px 8px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;font-weight:700;text-align:right">
          <span style="font-size:10px;color:#9CA3AF">원</span>
        </div>`;
  }).join('')}
      </div>
      <button onclick="_obSubmitInitBatch()" class="bo-btn-primary" style="width:100%;margin-top:12px;padding:12px;background:#C2410C;border-color:#C2410C">📋 기초 예산 일괄 등록</button>
    </div>` : `<div style="padding:12px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">✅</span><div style="font-weight:800;color:#065F46;font-size:12px">모든 통장의 기초 예산이 등록됐습니다. 증액이 필요하면 아래 추가 배정을 이용하세요.</div>
    </div>`}

    <!-- 추가 배정 -->
    <div class="bo-card" style="padding:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="background:#059669;color:white;font-size:9px;font-weight:900;padding:2px 8px;border-radius:6px">연중 증액</span>
        <span style="font-weight:800;font-size:13px">추가 배정 — 특정 통장에 예산 추가</span>
      </div>
      <div style="display:grid;gap:10px">
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">대상 통장</label>
          <select id="ob-add-bb" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
            <option value="">— 통장 선택 —</option>
            ${_obBankbooks.map(b => {
    const al = _obAllocations.find(a => a.bankbook_id === b.id);
    const grp = _obGroups.find(g => g.id === b.vorg_group_id);
    return `<option value="${b.id}">${grp?.name || ''} > ${b.org_name} (현재: ${fmt(al?.allocated_amount || 0)}원)</option>`;
  }).join('')}
          </select>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">추가 금액</label>
          <input type="number" id="ob-add-amt" placeholder="0" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-weight:900">
        </div>
        <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">사유 (필수)</label>
          <input type="text" id="ob-add-reason" placeholder="예) Q2 외부 교육 증가로 추가 배정" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        </div>
        <button onclick="_obSubmitAdd()" class="bo-btn-primary" style="padding:12px">✅ 추가 배정 확정</button>
      </div>
    </div>
  </div>`;
}

// ═══ 탭3: 팀 배분 ═══
function _obRenderDist() {
  const fmt = n => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find(p => p.id === _obPeriodId);
  if (curPeriod?.status === 'closed') return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간</div></div>`;
  if (_obBankbooks.length === 0) return `<div style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px">📭</div><div style="font-weight:700;margin-top:8px">통장이 없습니다.</div></div>`;

  // 계정별 총 배정 vs 조직 배정 합계
  const grouped = {};
  _obBankbooks.forEach(b => {
    if (!grouped[b.account_id]) grouped[b.account_id] = [];
    grouped[b.account_id].push(b);
  });

  let html = '<div style="max-width:800px">';
  html += `<div style="padding:8px 14px;background:#EDE9FE;border:1px solid #C4B5FD;border-radius:8px;margin-bottom:12px;font-size:11px;color:#5B21B6;font-weight:600">
    📋 <b>팀 배분</b> — 각 통장에 배정 금액을 입력합니다. 입력 완료 후 일괄 저장합니다.</div>`;

  let inputIdx = 0;
  Object.entries(grouped).forEach(([acctId, bbs]) => {
    const acct = _obAcctList.find(a => a.id === acctId);
    const totalAllocated = bbs.reduce((s, b) => {
      const al = _obAllocations.find(a => a.bankbook_id === b.id);
      return s + Number(al?.allocated_amount || 0);
    }, 0);

    html += `<div class="bo-card" style="margin-bottom:12px;overflow:hidden">
      <div style="padding:10px 16px;background:#EFF6FF;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:800;font-size:12px;color:#1D4ED8">💳 ${acct?.name || acctId}</span>
        <span style="font-size:10px;color:#6B7280">현재 배분 합계: <b>${fmt(totalAllocated)}원</b></span>
      </div>
      <table class="bo-table" style="font-size:11px"><thead><tr><th>조직</th><th style="text-align:right">현재 배정</th><th>추가 배분 입력</th></tr></thead><tbody>`;

    bbs.forEach(b => {
      const al = _obAllocations.find(a => a.bankbook_id === b.id);
      const cur = Number(al?.allocated_amount || 0);
      const id = `ob-dist-${inputIdx++}`;
      const grp = _obGroups.find(g => g.id === b.vorg_group_id);
      html += `<tr>
        <td style="${b.parent_org_id ? 'padding-left:24px' : ''}">${b.parent_org_id ? '└ ' : ''}<b>${b.org_name}</b> <span style="font-size:9px;color:#9CA3AF">${grp?.name || ''}</span></td>
        <td style="text-align:right;font-weight:700">${cur > 0 ? fmt(cur) + '원' : '<span style="color:#D97706">미배분</span>'}</td>
        <td><input type="number" id="${id}" data-bbid="${b.id}" class="ob-dist-input" placeholder="0" style="width:120px;padding:5px 8px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px;font-weight:700;text-align:right"></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  });

  html += `<div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:8px 12px;font-size:11px;color:#92400E;margin-bottom:10px">
    ⚠️ 입력한 금액은 현재 배정에 <b>추가</b>됩니다. 전체 교체가 아닌 증액입니다.</div>
  <button onclick="_obSubmitDist()" class="bo-btn-primary" style="width:100%;padding:12px;font-size:13px">✅ 일괄 배분 확정</button></div>`;
  return html;
}

// ═══ 탭4: 이관 (교차 VOrg 지원) ═══
function _obRenderTransfer() {
  const fmt = n => Number(n).toLocaleString();
  const curPeriod = _obPeriods.find(p => p.id === _obPeriodId);
  if (curPeriod?.status === 'closed') return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151;margin-top:8px">마감된 기간</div></div>`;

  // 교차 VOrg: 전체 템플릿 통장 사용
  const allBbs = _obAllBankbooks.length > 0 ? _obAllBankbooks : _obBankbooks;
  const allAllocs = _obAllAllocations.length > 0 ? _obAllAllocations : _obAllocations;

  const bbWithAlloc = allBbs.map(b => {
    const al = allAllocs.find(a => a.bankbook_id === b.id);
    const grp = _obGroups.find(g => g.id === b.vorg_group_id);
    const acct = _obAcctList.find(ac => ac.id === b.account_id);
    const a = Number(al?.allocated_amount || 0), u = Number(al?.used_amount || 0), f = Number(al?.frozen_amount || 0);
    return { ...b, allocated: a, used: u, frozen: f, balance: a - u - f, grpName: grp?.name || b.vorg_group_id, acctName: acct?.name || '' };
  });

  const fromOpts = bbWithAlloc.filter(b => b.balance > 0).map(b => {
    const dep = _obOrgStatuses[b.org_id] === 'deprecated' ? ' 🚫미사용' : '';
    return `<option value="${b.id}">[${b.grpName}] ${b.org_name}${dep} — ${b.acctName} (잔액: ${fmt(b.balance)}원)</option>`;
  }).join('');
  const toOpts = bbWithAlloc.filter(b => _obOrgStatuses[b.org_id] !== 'deprecated').map(b => `<option value="${b.id}">[${b.grpName}] ${b.org_name} — ${b.acctName} (현재: ${fmt(b.allocated)}원)</option>`).join('');

  return `<div style="max-width:700px">
    <div style="padding:8px 14px;background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;margin-bottom:12px;font-size:11px;color:#92400E;font-weight:600">
      🔀 <b>교차 VOrg 이관 지원</b> — 다른 VOrg 그룹의 통장 간에도 이관이 가능합니다. 조직개편 시 활용하세요.
    </div>
    <div class="bo-card" style="padding:20px">
    <div style="font-weight:800;font-size:13px;margin-bottom:4px">↔ 예산 이관 — 조직 간 잔액 이동</div>
    <p style="font-size:11px;color:#6B7280;margin-bottom:14px">동일 기간 내에서 A조직의 잔여 배정액을 B조직으로 이동합니다. 사유 필수.</p>
    <div style="display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">
        <div>
          <label style="font-size:10px;font-weight:700;color:#EF4444;display:block;margin-bottom:4px">FROM (출처) — 잔액이 있는 통장만</label>
          <select id="ob-tr-from" style="width:100%;padding:8px;border:1.5px solid #FECACA;border-radius:8px;font-size:11px;font-weight:700">
            <option value="">— 선택 —</option>${fromOpts}
          </select>
        </div>
        <div style="font-size:20px;color:#9CA3AF;margin-top:16px">→</div>
        <div>
          <label style="font-size:10px;font-weight:700;color:#059669;display:block;margin-bottom:4px">TO (대상) — 모든 통장</label>
          <select id="ob-tr-to" style="width:100%;padding:8px;border:1.5px solid #BBF7D0;border-radius:8px;font-size:11px;font-weight:700">
            <option value="">— 선택 —</option>${toOpts}
          </select>
        </div>
      </div>
      <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">이관 금액 (원)</label>
        <input type="number" id="ob-tr-amt" placeholder="0" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-weight:900"></div>
      <div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">이관 사유 (필수)</label>
        <textarea id="ob-tr-reason" rows="2" placeholder="조직 개편, 예산 부족, 사업 변경 등" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none"></textarea></div>
      <button onclick="_obSubmitTransfer()" class="bo-btn-primary" style="padding:12px">↔ 이관 처리</button>
    </div>
  </div></div>`;
}


// ═══ 탭5: 변경 이력 ═══
function _obRenderHistory() {
  const fmt = n => Number(n).toLocaleString();
  if (_obLogs.length === 0) return `< div style = "padding:40px;text-align:center;color:#9CA3AF" ><div style="font-size:32px">📜</div><div style="font-weight:700;margin-top:8px">변경 이력이 없습니다.</div></div > `;

  const colors = { allocate: '#059669', adjust: '#D97706', freeze: '#7C3AED', use: '#DC2626', carryover: '#1D4ED8', release: '#6B7280', transfer_out: '#EF4444', transfer_in: '#059669' };
  const labels = { allocate: '배정', adjust: '조정', freeze: '동결', use: '집행', carryover: '이월', release: '해제', transfer_out: '이관출처', transfer_in: '이관수신' };

  return `< div class="bo-card" style = "overflow:hidden" >
    <div style="padding:10px 18px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:12px">📜 변경 이력 — Audit Trail (최근 ${_obLogs.length}건)</div>
    <table class="bo-table" style="font-size:11px"><thead><tr><th>일시</th><th style="text-align:center">유형</th><th style="text-align:right">금액</th><th>사유</th><th>처리자</th></tr></thead>
    <tbody>${_obLogs.map(l => {
    const c = colors[l.action] || '#6B7280';
    const ac = l.amount >= 0 ? '#059669' : '#EF4444';
    return `<tr>
        <td style="white-space:nowrap;color:#6B7280">${new Date(l.performed_at).toLocaleString('ko-KR')}</td>
        <td style="text-align:center"><span style="font-size:9px;font-weight:800;background:${c}15;color:${c};padding:2px 7px;border-radius:4px">${labels[l.action] || l.action}</span></td>
        <td style="text-align:right;font-weight:800;color:${ac}">${l.amount >= 0 ? '+' : ''}${fmt(l.amount)}원</td>
        <td style="color:#374151">${l.reason || ''}</td>
        <td style="color:#9CA3AF">${l.performed_by || ''}</td>
      </tr>`;
  }).join('')}</tbody></table></div > `;
}

// ═══ 액션: 배정 수정 모달 ═══
function _obEditAlloc(bbId, curAmt) {
  document.getElementById('ob-alloc-bbid').value = bbId;
  document.getElementById('ob-alloc-amt').value = curAmt || 0;
  document.getElementById('ob-alloc-reason').value = '';
  document.getElementById('ob-alloc-modal').style.display = 'flex';
}

async function _obSaveAlloc() {
  const bbId = document.getElementById('ob-alloc-bbid').value;
  const newAmt = Number(document.getElementById('ob-alloc-amt').value) || 0;
  const reason = document.getElementById('ob-alloc-reason').value.trim() || '배정 수정';
  if (!bbId || !_obPeriodId) return;
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  try {
    const existing = _obAllocations.find(a => a.bankbook_id === bbId);
    const prevAmt = Number(existing?.allocated_amount || 0);
    if (existing) {
      await sb.from('budget_allocations').update({ allocated_amount: newAmt, updated_at: new Date().toISOString() }).eq('id', existing.id);
      await sb.from('budget_allocation_log').insert({ allocation_id: existing.id, action: prevAmt === 0 ? 'allocate' : 'adjust', amount: newAmt - prevAmt, prev_balance: prevAmt, new_balance: newAmt, reason, performed_by: boCurrentPersona?.name || '' });
    } else {
      const { data: ins } = await sb.from('budget_allocations').insert({ bankbook_id: bbId, period_id: _obPeriodId, allocated_amount: newAmt }).select('id').single();
      if (ins) await sb.from('budget_allocation_log').insert({ allocation_id: ins.id, action: 'allocate', amount: newAmt, prev_balance: 0, new_balance: newAmt, reason, performed_by: boCurrentPersona?.name || '' });
    }
    document.getElementById('ob-alloc-modal').style.display = 'none';
    await renderOrgBudget();
  } catch (e) { alert('저장 실패: ' + e.message); }
}

// ═══ 액션: 기초 일괄 입력 ═══
async function _obSubmitInitBatch() {
  const unallocated = _obBankbooks.filter(b => !_obAllocations.find(a => a.bankbook_id === b.id));
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  let count = 0;
  for (let i = 0; i < unallocated.length; i++) {
    const amt = Number(document.getElementById(`ob - init - ${i} `)?.value || 0);
    if (amt <= 0) continue;
    try {
      const { data: ins } = await sb.from('budget_allocations').insert({ bankbook_id: unallocated[i].id, period_id: _obPeriodId, allocated_amount: amt }).select('id').single();
      if (ins) await sb.from('budget_allocation_log').insert({ allocation_id: ins.id, action: 'allocate', amount: amt, prev_balance: 0, new_balance: amt, reason: '기초 예산 최초 등록', performed_by: boCurrentPersona?.name || '' });
      count++;
    } catch (e) { console.warn(e); }
  }
  if (count === 0) { alert('금액을 1개 이상 입력하세요.'); return; }
  alert(`✅ ${count}개 통장에 기초 예산이 등록되었습니다.`);
  await renderOrgBudget();
}

// ═══ 액션: 추가 배정 ═══
async function _obSubmitAdd() {
  const bbId = document.getElementById('ob-add-bb')?.value;
  const amt = Number(document.getElementById('ob-add-amt')?.value || 0);
  const reason = document.getElementById('ob-add-reason')?.value?.trim();
  if (!bbId || amt <= 0 || !reason) { alert('통장, 금액, 사유를 모두 입력하세요.'); return; }
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  const existing = _obAllocations.find(a => a.bankbook_id === bbId);
  const prev = Number(existing?.allocated_amount || 0);
  try {
    if (existing) {
      await sb.from('budget_allocations').update({ allocated_amount: prev + amt, updated_at: new Date().toISOString() }).eq('id', existing.id);
      await sb.from('budget_allocation_log').insert({ allocation_id: existing.id, action: 'adjust', amount: amt, prev_balance: prev, new_balance: prev + amt, reason, performed_by: boCurrentPersona?.name || '' });
    } else {
      const { data: ins } = await sb.from('budget_allocations').insert({ bankbook_id: bbId, period_id: _obPeriodId, allocated_amount: amt }).select('id').single();
      if (ins) await sb.from('budget_allocation_log').insert({ allocation_id: ins.id, action: 'allocate', amount: amt, prev_balance: 0, new_balance: amt, reason, performed_by: boCurrentPersona?.name || '' });
    }
    alert(`✅ 추가 배정 완료: +${Number(amt).toLocaleString()} 원`);
    await renderOrgBudget();
  } catch (e) { alert('추가 배정 실패: ' + e.message); }
}

// ═══ 액션: 팀 일괄 배분 ═══
async function _obSubmitDist() {
  const inputs = document.querySelectorAll('.ob-dist-input');
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  let count = 0;
  for (const inp of inputs) {
    const amt = Number(inp.value || 0);
    if (amt <= 0) continue;
    const bbId = inp.dataset.bbid;
    const existing = _obAllocations.find(a => a.bankbook_id === bbId);
    const prev = Number(existing?.allocated_amount || 0);
    try {
      if (existing) {
        await sb.from('budget_allocations').update({ allocated_amount: prev + amt, updated_at: new Date().toISOString() }).eq('id', existing.id);
        await sb.from('budget_allocation_log').insert({ allocation_id: existing.id, action: 'adjust', amount: amt, prev_balance: prev, new_balance: prev + amt, reason: '팀 배분', performed_by: boCurrentPersona?.name || '' });
      } else {
        const { data: ins } = await sb.from('budget_allocations').insert({ bankbook_id: bbId, period_id: _obPeriodId, allocated_amount: amt }).select('id').single();
        if (ins) await sb.from('budget_allocation_log').insert({ allocation_id: ins.id, action: 'allocate', amount: amt, prev_balance: 0, new_balance: amt, reason: '팀 배분', performed_by: boCurrentPersona?.name || '' });
      }
      count++;
    } catch (e) { console.warn(e); }
  }
  if (count === 0) { alert('배분 금액을 1개 이상 입력하세요.'); return; }
  alert(`✅ ${count}개 팀에 배분 완료!`);
  await renderOrgBudget();
}

// ═══ 액션: 이관 (교차 VOrg 대응) ═══
async function _obSubmitTransfer() {
  const fromId = document.getElementById('ob-tr-from')?.value;
  const toId = document.getElementById('ob-tr-to')?.value;
  const amt = Number(document.getElementById('ob-tr-amt')?.value || 0);
  const reason = document.getElementById('ob-tr-reason')?.value?.trim();
  if (!fromId || !toId || fromId === toId || amt <= 0 || !reason) { alert('모든 항목을 올바르게 입력하세요. From과 To는 달라야 합니다.'); return; }

  // 교차 VOrg: 전체 데이터에서 검색
  const allAllocs = _obAllAllocations.length > 0 ? _obAllAllocations : _obAllocations;
  const allBbs = _obAllBankbooks.length > 0 ? _obAllBankbooks : _obBankbooks;
  const fromAlloc = allAllocs.find(a => a.bankbook_id === fromId);
  const toAlloc = allAllocs.find(a => a.bankbook_id === toId);
  const fromBal = Number(fromAlloc?.allocated_amount || 0) - Number(fromAlloc?.used_amount || 0) - Number(fromAlloc?.frozen_amount || 0);
  if (amt > fromBal) { alert(`잔액 부족: From 통장 잔액 ${Number(fromBal).toLocaleString()}원, 이관 요청 ${Number(amt).toLocaleString()}원`); return; }

  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;

  try {
    // From: 감소
    const fromPrev = Number(fromAlloc?.allocated_amount || 0);
    if (fromAlloc) {
      await sb.from('budget_allocations').update({ allocated_amount: fromPrev - amt, updated_at: new Date().toISOString() }).eq('id', fromAlloc.id);
      await sb.from('budget_allocation_log').insert({ allocation_id: fromAlloc.id, action: 'transfer_out', amount: -amt, prev_balance: fromPrev, new_balance: fromPrev - amt, reason: `→ ${allBbs.find(b => b.id === toId)?.org_name}: ${reason}`, performed_by: boCurrentPersona?.name || '' });
    }
    // To: 증가
    const toPrev = Number(toAlloc?.allocated_amount || 0);
    if (toAlloc) {
      await sb.from('budget_allocations').update({ allocated_amount: toPrev + amt, updated_at: new Date().toISOString() }).eq('id', toAlloc.id);
      await sb.from('budget_allocation_log').insert({ allocation_id: toAlloc.id, action: 'transfer_in', amount: amt, prev_balance: toPrev, new_balance: toPrev + amt, reason: `← ${allBbs.find(b => b.id === fromId)?.org_name}: ${reason}`, performed_by: boCurrentPersona?.name || '' });
    } else {
      const { data: ins } = await sb.from('budget_allocations').insert({ bankbook_id: toId, period_id: _obPeriodId, allocated_amount: amt }).select('id').single();
      if (ins) await sb.from('budget_allocation_log').insert({ allocation_id: ins.id, action: 'transfer_in', amount: amt, prev_balance: 0, new_balance: amt, reason: `← ${allBbs.find(b => b.id === fromId)?.org_name}: ${reason}`, performed_by: boCurrentPersona?.name || '' });
    }
    alert(`✅ 이관 완료: ${Number(amt).toLocaleString()}원`);
    await renderOrgBudget();
  } catch (e) { alert('이관 실패: ' + e.message); }
}

// ═══ 통장 자동 생성 ═══
async function _obAutoCreate() {
  if (!_obTplId) { alert('템플릿을 선택하세요.'); return; }
  if (_obAcctList.length === 0) { alert('예산 계정이 없습니다. 예산 계정을 먼저 생성하세요.'); return; }
  if (_obGroups.length === 0) { alert('VOrg 그룹이 없습니다.'); return; }
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;

  try {
    const count = await _syncBankbooksForTemplate(_obTplId, _obTenant);
    alert(`✅ ${count}건 통장 동기화 완료`);
    await renderOrgBudget();
  } catch (e) { alert('통장 생성 실패: ' + e.message); }
}

// ═══ 통장 동기화 (공용 함수 — 예산계정 생성/VOrg 팀 추가 시 호출) ═══
async function _syncBankbooksForTemplate(templateId, tenantId) {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb || !templateId || !tenantId) return 0;

  // 1. 템플릿 tree_data 로드
  const { data: tplData } = await sb.from('virtual_org_templates').select('tree_data').eq('id', templateId).single();
  const groups = tplData?.tree_data?.hqs || [];
  if (!groups.length) return 0;

  // 2. 활성 예산 계정 + 통장 생성 정책 함께 로드
  const { data: acctData } = await sb.from('budget_accounts')
    .select('id')
    .eq('virtual_org_template_id', templateId)
    .eq('tenant_id', tenantId)
    .eq('active', true);
  const accounts = acctData || [];
  if (!accounts.length) return 0;

  const { data: policyData } = await sb.from('budget_account_org_policy')
    .select('budget_account_id,bankbook_mode')
    .eq('vorg_template_id', templateId)
    .in('budget_account_id', accounts.map(a => a.id));
  const policyMap = {};
  (policyData || []).forEach(p => { policyMap[p.budget_account_id] = p.bankbook_mode; });

  // 3. 조직 상태 로드 (deprecated 제외)
  const { data: orgData } = await sb.from('organizations').select('id,name,parent_id,status,type').eq('tenant_id', tenantId);
  const allOrgs = orgData || [];
  const orgMap = {};
  allOrgs.forEach(o => { orgMap[o.id] = o; });

  // 하위 조직 탐색 (DB 기반, 1레벨)
  function findSubOrgs(parentOrgId) {
    return allOrgs.filter(o => o.parent_id === parentOrgId && o.status !== 'deprecated');
  }

  // 4. 통장 행 생성 — 계정별 mode 분기
  const rows = [];
  for (const grp of groups) {
    for (const acct of accounts) {
      const mode = policyMap[acct.id] || 'isolated'; // 미설정이면 isolated (\ud558위 전개)
      for (const org of (grp.teams || [])) {
        if (orgMap[org.id]?.status === 'deprecated') continue;
        const hasSubOrgs = allOrgs.some(o => o.parent_id === org.id && o.status !== 'deprecated');

        if (mode === 'shared') {
          // ━ shared: 맵핑된 조직(\uc0c1\uc704)\ub9cc 통장 생성, 하위 팀은 생략
          rows.push({
            tenant_id: tenantId, template_id: templateId, vorg_group_id: grp.id,
            account_id: acct.id, org_id: org.id, org_name: org.name,
            org_type: hasSubOrgs ? 'hq' : 'team', parent_org_id: null
          });
        } else {
          // ━ isolated: 맵핑 조직 + DB 하위 조직 전원 통장
          rows.push({
            tenant_id: tenantId, template_id: templateId, vorg_group_id: grp.id,
            account_id: acct.id, org_id: org.id, org_name: org.name,
            org_type: hasSubOrgs ? 'hq' : 'team', parent_org_id: null
          });
          if (hasSubOrgs) {
            findSubOrgs(org.id).forEach(sub => {
              rows.push({
                tenant_id: tenantId, template_id: templateId, vorg_group_id: grp.id,
                account_id: acct.id, org_id: sub.id, org_name: sub.name,
                org_type: 'team', parent_org_id: org.id
              });
            });
          }
        }
      }
    }
  }
  if (!rows.length) return 0;

  const { error } = await sb.from('org_budget_bankbooks').upsert(rows, { onConflict: 'tenant_id,template_id,vorg_group_id,account_id,org_id', ignoreDuplicates: true });
  if (error) throw error;
  return rows.length;
}
// 전역 노출 (VOrg 템플릿에서 호출)
window._syncBankbooksForTemplate = _syncBankbooksForTemplate;

// ═══ 통장 비활성화 (조직개편 대응) ═══
async function _obDeactivateBankbook(bbId) {
  const bb = _obBankbooks.find(b => b.id === bbId);
  if (!bb) { alert('통장을 찾을 수 없습니다.'); return; }
  const alloc = _obAllocations.find(a => a.bankbook_id === bbId);
  const allocated = Number(alloc?.allocated_amount || 0);
  const used = Number(alloc?.used_amount || 0);
  const frozen = Number(alloc?.frozen_amount || 0);
  const balance = allocated - used - frozen;
  const fmt = n => Number(n).toLocaleString();

  // 동결(교육 진행 중)이면 교육 완료까지 통장 유지
  if (frozen > 0) {
    alert(`⛔ 동결 예산 ${fmt(frozen)}원이 있습니다.\n→ 진행 중인 교육이 완료될 때까지 통장을 유지해야 합니다.\n→ 교육 완료 후 다시 시도하세요.`);
    return;
  }

  // 잔액이 있으면 이관 유도
  if (balance > 0) {
    const ok = confirm(`⚠️ 잔액 ${fmt(balance)}원이 남아있습니다.\n\n잔액을 다른 통장으로 이관한 후 비활성화하시겠습니까?\n→ [확인]: 이관 탭으로 이동\n→ [취소]: 잔액 회수 후 비활성화`);
    if (ok) { _obTab = 3; _obRenderTabContent(); _obSwitchTab(3); return; }
    const forceOk = confirm(`❗ 잔액 ${fmt(balance)}원을 회수(0원 처리)하고 통장을 비활성화합니다.\n정말 진행하시겠습니까?`);
    if (!forceOk) return;

    // 잔액 0으로 초기화 + 로그
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb) return;
    if (alloc) {
      await sb.from('budget_allocations').update({ allocated_amount: 0, updated_at: new Date().toISOString() }).eq('id', alloc.id);
      await sb.from('budget_allocation_log').insert({ allocation_id: alloc.id, action: 'adjust', amount: -allocated, prev_balance: allocated, new_balance: 0, reason: '조직개편 — 통장 비활성화 (잔액 회수)', performed_by: boCurrentPersona?.name || '' });
    }
  }

  // 최종 확인
  if (balance <= 0 && !confirm(`"${bb.org_name}" 통장을 비활성화합니다.\n비활성화된 통장은 배정 현황에서 제외됩니다.\n\n진행하시겠습니까?`)) return;

  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  try {
    await sb.from('org_budget_bankbooks').update({ status: 'inactive' }).eq('id', bbId);
    alert(`✅ "${bb.org_name}" 통장이 비활성화되었습니다.`);
    await renderOrgBudget();
  } catch (e) { alert('비활성화 실패: ' + e.message); }
}



