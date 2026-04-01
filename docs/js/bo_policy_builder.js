// ─── 🔧 서비스 정책 관리 ─────────────────────────────────────────────────────
// 8단계 위저드: 범위설정(회사·그룹·계정) → 정책명+대상자 → 목적 → 교육유형 → 패턴 → 대상조직 → 양식 → 결재라인

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;

// ── 패턴 메타 (E 추가) ────────────────────────────────────────────────────────
const _PATTERN_META = {
  A: { label: '패턴A: 계획→신청→결과', color: '#7C3AED', icon: '📊', flow: 'plan-apply-result', applyMode: 'holding', budgetLinked: true },
  B: { label: '패턴B: 신청→결과', color: '#1D4ED8', icon: '📝', flow: 'apply-result', applyMode: 'holding', budgetLinked: true },
  C: { label: '패턴C: 결과 단독(후정산)', color: '#D97706', icon: '🧾', flow: 'result-only', applyMode: 'reimbursement', budgetLinked: true },
  D: { label: '패턴D: 신청 단독(이력)', color: '#6B7280', icon: '📋', flow: 'result-only', applyMode: null, budgetLinked: false },
  E: { label: '패턴E: 신청→결과(이력+결과)', color: '#059669', icon: '✅', flow: 'apply-result', applyMode: null, budgetLinked: false },
};

// 패턴별 활성 단계
const _PATTERN_STAGES = {
  A: ['plan', 'apply', 'result'],
  B: ['apply', 'result'],
  C: ['apply'],
  D: ['apply'],
  E: ['apply', 'result'],
};

function _patternFromPolicy(p) {
  return p.processPattern || (p.flow === 'plan-apply-result' ? 'A' : p.flow === 'apply-result' ? 'B' : 'C');
}

// ── 목적·유형 정의 ────────────────────────────────────────────────────────────
const _PURPOSE_MAP = {
  learner: [
    { id: 'external_personal', label: '개인직무 사외학습' },
  ],
  operator: [
    { id: 'elearning_class', label: '이러닝/집합(비대면) 운영' },
    { id: 'conf_seminar', label: '워크샵/세미나/콘퍼런스 등 운영' },
    { id: 'misc_ops', label: '기타 운영' },
  ],
};
const _EDU_TYPE_MAP = {
  external_personal: [
    {
      id: 'regular', label: '정규교육', subs: [
        { id: 'elearning', label: '이러닝' },
        { id: 'class', label: '집합' },
        { id: 'live', label: '라이브' },
      ]
    },
    {
      id: 'academic', label: '학술 및 연구활동', subs: [
        { id: 'conf', label: '학회/컨퍼런스' },
        { id: 'seminar', label: '세미나' },
      ]
    },
    {
      id: 'knowledge', label: '지식자원 학습', subs: [
        { id: 'book', label: '도서구입' },
        { id: 'online', label: '온라인콘텐츠' },
      ]
    },
    {
      id: 'competency', label: '역량개발지원', subs: [
        { id: 'lang', label: '어학학습비 지원' },
        { id: 'cert', label: '자격증 취득지원' },
      ]
    },
    {
      id: 'etc', label: '기타', subs: [
        { id: 'team_build', label: '팀빌딩' },
      ]
    },
  ],
  elearning_class: [
    { id: 'elearning', label: '이러닝', subs: [] },
    { id: 'class', label: '집합교육', subs: [] },
  ],
  conf_seminar: [
    { id: 'conference', label: '콘퍼런스', subs: [] },
    { id: 'seminar', label: '세미나', subs: [] },
    { id: 'teambuilding', label: '팀빌딩', subs: [] },
    { id: 'cert_maintain', label: '자격유지', subs: [] },
    { id: 'system_link', label: '제도연계', subs: [] },
  ],
  misc_ops: [
    { id: 'course_dev', label: '과정개발', subs: [] },
    { id: 'material_dev', label: '교안개발', subs: [] },
    { id: 'video_prod', label: '영상제작', subs: [] },
    { id: 'facility', label: '교육시설운영', subs: [] },
  ],
};

// ── 필터 상태 ─────────────────────────────────────────────────────────────────
let _pbTenantFilter = '';
let _pbVorgFilter = '';
let _pbAccountFilter = '';
let _pbPurposeFilter = '';
let _pbEduTypeFilter = '';
let _pbSubTypeFilter = '';

// ── 정책 목록 메인 화면 ───────────────────────────────────────────────────────
async function renderServicePolicy() {
  const persona = boCurrentPersona;
  const role = persona.role;
  const isPlatform = role === 'platform_admin';
  const isTenant = role === 'tenant_global_admin';
  const isBudgetOp = role === 'budget_op_manager' || role === 'budget_hq';
  const isBudgetAdmin = role === 'budget_global_admin';
  const el = document.getElementById('bo-content');

  // DB 재로드: Supabase에서 service_policies를 불러와 메모리와 병합
  let _pbTplList = [];
  let _pbAccountList = [];
  if (typeof _sb === 'function' && _sb()) {
    try {
      const p1 = _sb().from('virtual_org_templates').select('id,name,tenant_id').eq('service_type', 'edu_support');
      const p2 = _sb().from('budget_accounts').select('code,name,virtual_org_template_id,tenant_id,active');
      const p3 = _sb().from('service_policies').select('*');
      const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

      if (res1.data) _pbTplList = res1.data;
      if (res2.data) _pbAccountList = res2.data;

      if (res3.data && res3.data.length > 0) {
        res3.data.forEach(row => {
          let vId = row.vorg_template_id || row.scope_group_id || row.isolation_group_id;
          // 레거시 ID(IG-*, TPL_GEN_01, TPL_RND_01 등) → 실제 가상교육조직 ID로 보정
          const isLegacyId = !vId || vId.startsWith('IG-') || vId === 'TPL_GEN_01' || vId === 'TPL_RND_01';
          if (isLegacyId) {
            if (row.name.startsWith('현대') || row.name.toUpperCase().startsWith('HMC') || vId === 'TPL_GEN_01') {
              const tpl = _pbTplList.find(t => t.name.includes('일반교육예산 가상교육조직') || t.name === 'HMC 일반교육예산 가상교육조직');
              if (tpl) vId = tpl.id;
            }
            if (row.name.toUpperCase().startsWith('R&D') || vId === 'TPL_RND_01') {
              const tpl = _pbTplList.find(t => t.name.includes('R&D교육예산 가상교육조직') || t.name === 'HMC R&D교육예산 가상교육조직');
              if (tpl) vId = tpl.id;
            }
          }
          const mapped = {
            id: row.id, tenantId: row.tenant_id, name: row.name, desc: row.descr,
            vorgTemplateId: vId,
            scopeTenantId: row.scope_tenant_id,
            targetType: row.target_type, purpose: row.purpose,
            eduTypes: row.edu_types || [], selectedEduItem: row.selected_edu_item,
            processPattern: row.process_pattern, flow: row.flow,
            budgetLinked: row.budget_linked !== false, applyMode: row.apply_mode,
            accountCodes: row.account_codes || [], virtualEduOrgId: row.virtual_edu_org_id,
            stageFormIds: row.stage_form_ids || { plan: [], apply: [], result: [] },
            formSets: row.stage_form_ids,
            approvalConfig: row.approval_config || { plan: { thresholds: [], finalApproverKey: '' }, apply: { thresholds: [], finalApproverKey: '' }, result: { thresholds: [], finalApproverKey: '' } },
            approverPersonaKey: row.approval_config?.apply?.finalApproverKey || '',
            approvalThresholds: row.approval_config?.apply?.thresholds || [],
            managerPersonaKey: row.manager_persona_key,
            status: row.status || 'active', createdAt: (row.created_at || '').slice(0, 10),
          };
          const idx = SERVICE_POLICIES.findIndex(p => p.id === mapped.id);
          if (idx >= 0) SERVICE_POLICIES[idx] = mapped;
          else SERVICE_POLICIES.push(mapped);
        });
      }
    } catch (e) { console.warn('[renderServicePolicy] DB 재로드 실패:', e.message); }
  }

  const activeTenantId = isPlatform ? (_pbTenantFilter || '') : (persona.tenantId || '');
  const pbVorgId = (isBudgetOp || isBudgetAdmin) ? (persona.domainId || _pbVorgFilter || '') : (_pbVorgFilter || '');

  let myPolicies = SERVICE_POLICIES.filter(p => {
    // 1. 테넌트 필터
    if (activeTenantId && p.tenantId !== activeTenantId) return false;
    // 2. 가상조직 필터 
    if (pbVorgId && p.vorgTemplateId !== pbVorgId) return false;
    // 3. 예산계정 필터
    if (_pbAccountFilter && !(p.accountCodes || []).includes(_pbAccountFilter)) return false;
    // 4. 교육지원 담당자(운영자)는 자신에게 매핑된 예산계정의 정책만 표시할 수 있음
    if ((isBudgetOp || isBudgetAdmin) && !pbVorgId) {
      const myAccts = persona.ownedAccounts || [];
      if (!myAccts.includes('*') && !myAccts.some(a => p.accountCodes?.includes(a))) return false;
    }
    // 5. 목적, 교육유형, 세부유형 필터
    if (_pbPurposeFilter && p.purpose !== _pbPurposeFilter) return false;
    if (_pbEduTypeFilter) {
      if (p.purpose === 'external_personal') {
        if (p.selectedEduItem?.typeId !== _pbEduTypeFilter) return false;
      } else {
        if (!p.eduTypes || !p.eduTypes.includes(_pbEduTypeFilter)) return false;
      }
    }
    if (_pbSubTypeFilter && p.purpose === 'external_personal') {
      if (p.selectedEduItem?.subId !== _pbSubTypeFilter) return false;
    }
    return true;
  });

  const TENANTS_LIST = typeof TENANTS !== 'undefined' ? TENANTS : [...new Set(SERVICE_POLICIES.map(p => p.tenantId))].map(id => ({ id, name: id }));
  const tenantName = TENANTS_LIST.find(t => t.id === activeTenantId)?.name || activeTenantId || '소속 회사';

  // 조회 가능한 가상교육조직 템플릿 목록
  const availVorgs = _pbTplList.filter(g => !activeTenantId || g.tenant_id === activeTenantId);
  const vorgName = availVorgs.find(g => g.id === pbVorgId)?.name || pbVorgId || '선택된 조직';

  // 조회 가능한 예산계정 목록
  const availAccounts = (() => {
    if (pbVorgId) {
      return _pbAccountList.filter(a => a.active && a.virtual_org_template_id === pbVorgId);
    }
    return _pbAccountList.filter(a =>
      a.active &&
      a.code !== 'COMMON-FREE' &&
      (activeTenantId ? a.tenant_id === activeTenantId : true)
    );
  })();

  // ── 목적/유형 필터 목록 산출 ─────────────────────────────
  const availPurposes = [...(_PURPOSE_MAP.learner || []), ...(_PURPOSE_MAP.operator || [])];
  const availEduTypes = _pbPurposeFilter ? (_EDU_TYPE_MAP[_pbPurposeFilter] || []) : [];
  const availSubTypes = _pbEduTypeFilter ? (availEduTypes.find(t => t.id === _pbEduTypeFilter)?.subs || []) : [];

  const filterBar = (isPlatform || isTenant || isBudgetOp || isBudgetAdmin) ? `
<div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05)">
  ${isPlatform ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
    <select id="pb-tenant-sel" onchange="_pbTenantFilter=this.value;_pbVorgFilter='';_pbAccountFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:140px">
      <option value="">전체 회사</option>
      ${TENANTS_LIST.map(t => `<option value="${t.id}" ${activeTenantId === t.id ? 'selected' : ''}>${t.name || t.id}</option>`).join('')}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>` : `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
    <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;background:#F9FAFB;min-width:140px">
      <span style="font-size:12px">🏢</span>
      <span style="font-size:13px;font-weight:800;color:#374151">${tenantName}</span>
    </div>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>
  `}
  
  ${(isBudgetOp || isBudgetAdmin) ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">가상교육조직</span>
    <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #C4B5FD;border-radius:10px;background:#F5F3FF;min-width:140px">
      <span style="font-size:12px">🔒</span>
      <span style="font-size:13px;font-weight:800;color:#7C3AED">${vorgName}</span>
    </div>
  </div>` : `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">가상교육조직</span>
    <select id="pb-group-sel" onchange="_pbVorgFilter=this.value;_pbAccountFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 조직</option>
      ${availVorgs.map(g => `<option value="${g.id}" ${pbVorgId === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
    </select>
  </div>`}
  
  <div style="width:1px;height:28px;background:#E5E7EB"></div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">예산계정</span>
    <select id="pb-acct-sel" onchange="_pbAccountFilter=this.value"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 계정</option>
      ${availAccounts.map(a => `<option value="${a.code}" ${_pbAccountFilter === a.code ? 'selected' : ''}>${a.name}</option>`).join('')}
    </select>
  </div>
  
  <div style="width:100%;height:1px;background:#E5E7EB;margin:6px 0"></div>
  
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">목적</span>
    <select id="pb-purp-sel" onchange="_pbPurposeFilter=this.value;_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:140px">
      <option value="">전체 목적</option>
      ${availPurposes.map(p => `<option value="${p.id}" ${_pbPurposeFilter === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>

  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">교육유형</span>
    <select id="pb-type-sel" onchange="_pbEduTypeFilter=this.value;_pbSubTypeFilter='';renderServicePolicy()" ${!_pbPurposeFilter ? 'disabled' : ''}
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:${_pbPurposeFilter ? '#FAFAFA' : '#F3F4F6'};cursor:${_pbPurposeFilter ? 'pointer' : 'default'};appearance:auto;min-width:140px">
      <option value="">전체 유형</option>
      ${availEduTypes.map(t => `<option value="${t.id}" ${_pbEduTypeFilter === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>

  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">세부유형</span>
    <select id="pb-sub-sel" onchange="_pbSubTypeFilter=this.value" ${!_pbEduTypeFilter || availSubTypes.length === 0 ? 'disabled' : ''}
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:${_pbEduTypeFilter && availSubTypes.length > 0 ? '#FAFAFA' : '#F3F4F6'};cursor:${_pbEduTypeFilter && availSubTypes.length > 0 ? 'pointer' : 'default'};appearance:auto;min-width:140px">
      <option value="">전체 세부유형</option>
      ${availSubTypes.map(s => `<option value="${s.id}" ${_pbSubTypeFilter === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
    </select>
  </div>

  <button onclick="
    _pbTenantFilter=document.getElementById('pb-tenant-sel')?.value||_pbTenantFilter;
    _pbVorgFilter=document.getElementById('pb-group-sel')?.value||_pbVorgFilter;
    _pbAccountFilter=document.getElementById('pb-acct-sel')?.value||_pbAccountFilter;
    _pbPurposeFilter=document.getElementById('pb-purp-sel')?.value||_pbPurposeFilter;
    _pbEduTypeFilter=document.getElementById('pb-type-sel')?.value||_pbEduTypeFilter;
    _pbSubTypeFilter=document.getElementById('pb-sub-sel')?.value||_pbSubTypeFilter;
    renderServicePolicy()"
    style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,.35);white-space:nowrap;margin-left:auto">
    ● 조회
  </button>
  ${(!isBudgetOp && !isBudgetAdmin) ? `
  <button onclick="_pbTenantFilter='';_pbVorgFilter='';_pbAccountFilter='';_pbPurposeFilter='';_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
    style="padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;font-weight:700;background:white;cursor:pointer;color:#6B7280;white-space:nowrap">초기화</button>` : ''}
</div>` : '';

  const policyCards = myPolicies.map(p => {
    const approver = _getPersonaByKey(p.approvalConfig?.apply?.finalApproverKey || p.approverPersonaKey);
    const manager = _getPersonaByKey(p.managerPersonaKey);
    const accounts = (p.accountCodes || []).map(c => ACCOUNT_MASTER.find(a => a.code === c)?.name || c).join(', ');
    const pat = _patternFromPolicy(p);
    const pm = _PATTERN_META[pat] || _PATTERN_META['B'];
    const purposeLabel = [...(_PURPOSE_MAP.learner || []), ...(_PURPOSE_MAP.operator || [])].find(x => x.id === p.purpose)?.label || p.purpose || '';
    // data-* 속성 방식: onclick 내에 특수문자를 직접 삽입하지 않음 (이스케이프 불안정 이슈 원척 차단)
    const escapedId = (p.id || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const escapedName = (p.name || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `
<div class="bo-card policy-card" data-policy-id="${escapedId}" style="padding:20px;margin-bottom:14px;cursor:pointer">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${pm.color}18;color:${pm.color};border:1px solid ${pm.color}40">${pm.icon} ${pm.label}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.budgetLinked ? '#DBEAFE' : '#F3F4F6'};color:${p.budgetLinked ? '#1E40AF' : '#6B7280'};font-weight:700">${p.budgetLinked ? '💳 예산 연동' : '무예산'}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.status === 'active' ? '#D1FAE5' : '#F3F4F6'};color:${p.status === 'active' ? '#065F46' : '#9CA3AF'};font-weight:700">${p.status === 'active' ? '✅ 운영중' : '⏸️ 중지'}</span>
        ${isPlatform ? `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;font-weight:700">${p.tenantId}</span>` : ''}
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:4px">${p.name}</div>
      <div style="font-size:12px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
        ${purposeLabel ? `<span>🎯 ${purposeLabel}</span>` : ''}
        ${accounts ? `<span>💳 ${accounts}</span>` : ''}
        <span>✅ 승인자: <b>${approver?.name || '—'}</b></span>
        <span>📋 관리자: <b>${manager?.name || '—'}</b></span>
        <span>📅 ${p.createdAt}</span>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="policy-edit-btn" data-policy-id="${escapedId}" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;cursor:pointer;font-weight:700">✏️ 수정</button>
      <button class="policy-del-btn" data-policy-id="${escapedId}" data-policy-name="${escapedName}" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer;font-weight:700">🗑️ 삭제</button>
    </div>
  </div>
</div>`;
  }).join('');


  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === 'function' ? boIsolationGroupBanner() : ''}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <h1 class="bo-page-title">🔧 서비스 정책 관리</h1>
      <p class="bo-page-sub">교육 서비스 흐름, 예산 연동, 결재라인을 하나의 정책으로 통합 관리</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      ${typeof pgGuideBtn === 'function' ? pgGuideBtn('service-policy') : ''}
      <button onclick="startPolicyWizard(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
        <span style="font-size:16px">+</span> 새 정책 만들기
      </button>
    </div>
  </div>

  ${filterBar}
  <div>
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">정책 목록 (${myPolicies.length}개)</div>
    ${policyCards || '<div style="padding:40px;text-align:center;color:#9CA3AF">정책이 없습니다. 새 정책을 만드세요.</div>'}
  </div>
</div>`;

  // ── 이벤트 위임: data-* 속성으로 정책 카드/버튼 클릭 처리 ──────────────────
  el.querySelectorAll('.policy-edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      startPolicyWizard(btn.dataset.policyId);
    });
  });
  el.querySelectorAll('.policy-del-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      deleteServicePolicy(btn.dataset.policyId, btn.dataset.policyName);
    });
  });
  el.querySelectorAll('.policy-card').forEach(card => {
    card.addEventListener('click', () => {
      startPolicyWizard(card.dataset.policyId);
    });
  });
}

function _getPersonaByKey(key) {
  return key ? BO_PERSONAS[key] : null;
}

// ── 위저드 시작 ───────────────────────────────────────────────────────────────
function startPolicyWizard(policyId) {
  _editPolicyId = policyId;
  _policyWizardStep = 0;
  if (policyId) {
    const existing = SERVICE_POLICIES.find(p => p.id === policyId);
    _policyWizardData = existing ? JSON.parse(JSON.stringify(existing)) : {};
    if (!_policyWizardData.approvalConfig) {
      // 레거시 마이그레이션: approvalThresholds → approvalConfig
      const old = _policyWizardData.approvalThresholds || [];
      const finalKey = _policyWizardData.approverPersonaKey || '';
      _policyWizardData.approvalConfig = {
        plan: { thresholds: JSON.parse(JSON.stringify(old)), finalApproverKey: finalKey },
        apply: { thresholds: JSON.parse(JSON.stringify(old)), finalApproverKey: finalKey },
        result: { thresholds: [], finalApproverKey: finalKey },
      };
    }
    if (!_policyWizardData.processPattern) {
      _policyWizardData.processPattern = _patternFromPolicy(_policyWizardData);
    }
  } else {
    _policyWizardData = {
      id: 'POL-' + Date.now(),
      tenantId: boCurrentPersona.tenantId,
      scopeTenantId: boCurrentPersona.tenantId || '',
      vorgTemplateId: boCurrentPersona.domainId || '',
      name: '', desc: '',
      targetType: '',
      purpose: '',
      eduTypes: [], selectedEduItem: null, eduSubTypes: {},
      processPattern: '', flow: 'apply-result',
      budgetLinked: true, applyMode: 'holding',
      accountCodes: [], virtualEduOrgId: '',
      stageFormIds: { plan: [], apply: [], result: [] },
      approvalConfig: {
        plan: { thresholds: [], finalApproverKey: '' },
        apply: { thresholds: [], finalApproverKey: '' },
        result: { thresholds: [], finalApproverKey: '' },
      },
      managerPersonaKey: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '',
      status: 'active', createdAt: new Date().toISOString().slice(0, 10),
    };
    // 목록 페이지의 필터값을 새 정책 초기값으로 pre-fill
    if (_pbTenantFilter) _policyWizardData.scopeTenantId = _pbTenantFilter;
    if (_pbVorgFilter) _policyWizardData.vorgTemplateId = _pbVorgFilter;
    if (_pbAccountFilter) _policyWizardData.accountCodes = [_pbAccountFilter];
  }
  renderPolicyWizard();
}

// ── 위저드 렌더링 ─────────────────────────────────────────────────────────────
function renderPolicyWizard() {
  const el = document.getElementById('bo-content');
  const steps = ['범위설정', '정책명·대상자', '목적', '교육유형', '패턴', '양식', '결재라인'];
  const TOTAL = steps.length - 1;
  const d = _policyWizardData;
  const persona = boCurrentPersona;

  const stepBar = steps.map((s, i) => `
<div style="display:flex;align-items:center;gap:0">
  <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;
      background:${i < _policyWizardStep ? '#059669' : i === _policyWizardStep ? '#7C3AED' : '#E5E7EB'};
      color:${i <= _policyWizardStep ? 'white' : '#9CA3AF'}">${i < _policyWizardStep ? '✓' : (i + 1)}</div>
    <div style="font-size:10px;font-weight:700;color:${i === _policyWizardStep ? '#7C3AED' : i < _policyWizardStep ? '#059669' : '#9CA3AF'};white-space:nowrap">${s}</div>
  </div>
  ${i < steps.length - 1 ? `<div style="width:20px;height:2px;background:${i < _policyWizardStep ? '#059669' : '#E5E7EB'};margin-bottom:16px"></div>` : ''}
</div>`).join('');

  // ── 이전 선택값 요약 배너 (step > 0일 때 표시) ─────────────────────────────
  const _sumTenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const _sumVorgs = typeof _pbTplList !== 'undefined' ? _pbTplList : [];
  const _sumAccts = typeof ACCOUNT_MASTER !== 'undefined' ? ACCOUNT_MASTER : [];
  const sumTenant = _sumTenants.find(t => t.id === d.scopeTenantId)?.name || d.scopeTenantId || '';
  const sumGroup = _sumVorgs.find(g => g.id === d.vorgTemplateId)?.name || d.vorgTemplateId || '';
  const sumAccts = (d.accountCodes || []).map(c => _sumAccts.find(a => a.code === c)?.name || c).join(', ');
  const sumPat = d.processPattern ? `${_PATTERN_META[d.processPattern]?.icon || ''} 패턴${d.processPattern}` : '';
  const summaryChips = [
    sumTenant && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:11px;font-weight:700;color:#1E40AF">🏢 ${sumTenant}</span>`,
    sumGroup && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#F5F3FF;border:1px solid #DDD6FE;font-size:11px;font-weight:700;color:#5B21B6">🛡️ ${sumGroup}</span>`,
    sumAccts && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#ECFDF5;border:1px solid #A7F3D0;font-size:11px;font-weight:700;color:#065F46">💳 ${sumAccts}</span>`,
    d.name && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FFFBEB;border:1px solid #FDE68A;font-size:11px;font-weight:700;color:#92400E">📋 ${d.name}</span>`,
    sumPat && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FEF3C7;border:1px solid #FCD34D;font-size:11px;font-weight:700;color:#B45309">${sumPat}</span>`,
  ].filter(Boolean).join('');
  const summaryBar = (_policyWizardStep > 0 && summaryChips) ? `
<div style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px">
  <span style="font-size:10px;font-weight:900;color:#9CA3AF;white-space:nowrap;line-height:24px">현재 설정:</span>
  ${summaryChips}
</div>` : '';

  let stepContent = '';

  // ── Step 0: 범위 설정 (회사 → 가상교육조직 → 예산계정) ────────────────────────────
  if (_policyWizardStep === 0) {
    const isPlatform = persona.role === 'platform_admin';
    const isTenant = ['tenant_global_admin'].includes(persona.role);
    const isBudgetOp = ['budget_op_manager', 'budget_hq', 'budget_global_admin'].includes(persona.role);

    const _TENANTS_LIST = typeof TENANTS !== 'undefined' ? TENANTS : [];
    const _VORG_LIST = typeof _pbTplList !== 'undefined' ? _pbTplList : [];

    const scopeTenantId = d.scopeTenantId || (isTenant || isBudgetOp ? persona.tenantId : '');
    const scopeVorgs = _VORG_LIST.filter(g => scopeTenantId ? g.tenant_id === scopeTenantId : true);

    const scopeVorgId = d.vorgTemplateId || (isBudgetOp ? (persona.domainId || '') : '');
    const scopeVorg = scopeVorgs.find(g => g.id === scopeVorgId);

    // 예산계정
    const scopeAccts = scopeVorgId
      ? _pbAccountList.filter(a => a.active && a.virtual_org_template_id === scopeVorgId)
      : [];

    stepContent = `
<div style="display:grid;gap:18px">
  <div style="padding:12px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;font-size:12px;color:#92400E">
    💡 정책이 적용될 <strong>회사 · 가상교육조직 · 예산계정</strong>을 먼저 설정합니다. 이 설정이 정책의 모든 데이터 범위를 결정합니다.
  </div>
  ${isPlatform ? `
  <div>
    <label class="bo-label">회사 선택 <span style="color:#EF4444">*</span></label>
    <select onchange="_policyWizardData.scopeTenantId=this.value;_policyWizardData.vorgTemplateId='';_policyWizardData.accountCodes=[];renderPolicyWizard()"
      style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700">
      <option value="">— 회사를 선택하세요 —</option>
      ${_TENANTS_LIST.map(t => `<option value="${t.id}" ${scopeTenantId === t.id ? 'selected' : ''}>${t.name || t.id}</option>`).join('')}
    </select>
  </div>` : `
  <div style="padding:10px 16px;background:#F3F4F6;border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:700;color:#6B7280">회사</span>
    <span style="font-size:14px;font-weight:900;color:#111827">🏢 ${_TENANTS_LIST.find(t => t.id === scopeTenantId)?.name || scopeTenantId}</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#E5E7EB;color:#6B7280">자동 설정</span>
  </div>`}
  
  ${scopeTenantId ? `
  <div>
    <label class="bo-label">${isBudgetOp ? '담당 가상교육조직' : '가상교육조직 선택'} <span style="color:#EF4444">*</span></label>
    ${isBudgetOp ? `
    <div style="padding:10px 16px;background:#EDE9FE;border:1.5px solid #C4B5FD;border-radius:10px;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">🔒</span>
      <span style="font-size:14px;font-weight:900;color:#7C3AED">${scopeVorgs.find(g => g.id === scopeVorgId)?.name || scopeVorgId}</span>
      <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#DDD6FE;color:#5B21B6">자동 고정</span>
    </div>` : `
    <div style="display:grid;gap:6px">
      ${scopeVorgs.length > 0 ? scopeVorgs.map(g => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${scopeVorgId === g.id ? '#7C3AED' : '#E5E7EB'};
                    background:${scopeVorgId === g.id ? '#F5F3FF' : 'white'};cursor:pointer"
             onclick="_policyWizardData.vorgTemplateId='${g.id}';_policyWizardData.accountCodes=[];_policyWizardData.budgetLinked=true;renderPolicyWizard()">
        <input type="radio" name="wiz-group" ${scopeVorgId === g.id ? 'checked' : ''} style="margin:0;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${scopeVorgId === g.id ? '#7C3AED' : '#374151'}">${g.name}</div>
        </div>
      </label>`).join('') : '<div style="font-size:12px;padding:10px;color:#9CA3AF">해당 회사의 가상교육조직이 없습니다. 먼저 조직을 생성하세요.</div>'}
    </div>`}
  </div>` : ''}
  
  ${scopeVorgId && scopeAccts.length ? `
  <div>
    <label class="bo-label">예산 계정 선택 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:6px">
      ${scopeAccts.map(a => `
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${(d.accountCodes || [])[0] === a.code ? '#1D4ED8' : '#E5E7EB'};
                    background:${(d.accountCodes || [])[0] === a.code ? '#EFF6FF' : 'white'};cursor:pointer"
             onclick="_selectPolicyAcct('${a.code}')">
        <input type="radio" name="wiz-acct" ${(d.accountCodes || [])[0] === a.code ? 'checked' : ''} style="margin:0;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${(d.accountCodes || [])[0] === a.code ? '#1E40AF' : '#374151'}">
            ${a.code === 'COMMON-FREE' ? '📝 ' : a.budgetLinked === false ? '' : '💳 '}${a.name}
          </div>
          <div style="font-size:11px;color:#9CA3AF">${a.desc || ''}</div>
        </div>
        ${(d.accountCodes || [])[0] === a.code ? `<span style="margin-left:auto;font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#1D4ED8;color:white">선택됨</span>` : ''}
      </label>`).join('')}
    </div>
    ${(d.accountCodes || [])[0] ? `
    <div style="margin-top:8px;padding:10px 16px;background:${d.budgetLinked ? '#EFF6FF' : '#F0FDF4'};border-radius:10px;font-size:12px;color:${d.budgetLinked ? '#1E40AF' : '#065F46'}">
      ${d.budgetLinked ? '💳 <strong>예산 연동</strong> — 선택한 계정에서 예산을 집행합니다.' : '📝 <strong>무예산</strong> — 예산 차감 없이 이력 관리합니다.'}
    </div>` : ''}
  </div>` : scopeVorgId ? `
  <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF;font-size:12px">
    선택한 가상교육조직에 연결된 예산 계정이 없습니다.
  </div>` : ''}
</div>`;

    // ── Step 1: 정책명 + 대상자 ──────────────────────────────────────────────────
  } else if (_policyWizardStep === 1) {
    stepContent = `
<div style="display:grid;gap:18px">
  <div>
    <label class="bo-label">정책명 <span style="color:#EF4444">*</span></label>
    <input id="wiz-name" type="text" value="${d.name || ''}" placeholder='예: "HAE 전사교육예산 정규교육 지원정책"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">정책 설명</label>
    <input id="wiz-desc" type="text" value="${d.desc || ''}" placeholder='학습자에게 표시될 설명'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">대상자 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        { v: 'learner', icon: '👤', l: '학습자용', d: '개인 학습자가 교육비를 신청하는 서비스' },
        { v: 'operator', icon: '👔', l: '교육담당자용', d: '교육담당자가 운영하는 집합·이러닝·외부행사' },
      ].map(o => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.targetType === o.v ? '#7C3AED' : '#E5E7EB'};
                    background:${d.targetType === o.v ? '#F5F3FF' : 'white'};cursor:pointer"
             onclick="_wizSaveStep1Inputs();_policyWizardData.targetType='${o.v}';_policyWizardData.purpose='';_policyWizardData.eduTypes=[];renderPolicyWizard()">
        <input type="radio" name="wiz-target" value="${o.v}" ${d.targetType === o.v ? 'checked' : ''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.targetType === o.v ? '#7C3AED' : '#374151'}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>
</div>`;

    // ── Step 2: 목적 ──────────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 2) {
    const purposes = _PURPOSE_MAP[d.targetType] || [];
    stepContent = `
<div style="display:grid;gap:10px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;font-size:12px;color:#5B21B6">
    대상: <strong>${d.targetType === 'learner' ? '👤 학습자용' : '👔 교육담당자용'}</strong>
  </div>
  <label class="bo-label">교육 목적 <span style="color:#EF4444">*</span></label>
  ${purposes.map(p => `
  <label style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;
                border:2px solid ${d.purpose === p.id ? '#7C3AED' : '#E5E7EB'};
                background:${d.purpose === p.id ? '#F5F3FF' : 'white'};cursor:pointer"
         onclick="_policyWizardData.purpose='${p.id}';_policyWizardData.eduTypes=[];renderPolicyWizard()">
    <input type="radio" name="wiz-purpose" value="${p.id}" ${d.purpose === p.id ? 'checked' : ''} style="margin:0">
    <span style="font-size:13px;font-weight:800;color:${d.purpose === p.id ? '#7C3AED' : '#374151'}">${p.label}</span>
  </label>`).join('')}
</div>`;

    // ── Step 3: 교육유형 ───────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 3) {
    const types = _EDU_TYPE_MAP[d.purpose] || [];
    if (!d.eduSubTypes) d.eduSubTypes = {};
    const isPersonal = d.purpose === 'external_personal';
    // 개인직무사외학습: selectedEduItem = {typeId, subId}  (단독 선택)
    if (!d.selectedEduItem) d.selectedEduItem = null;

    const purposeLabel = [...(_PURPOSE_MAP.learner || []), ...(_PURPOSE_MAP.operator || [])].find(x => x.id === d.purpose)?.label || d.purpose;

    if (isPersonal) {
      // ── 개인직무사외학습: 헤더+라디오 단독선택 ─────────────────────────────────
      stepContent = `
<div style="display:grid;gap:12px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;font-size:12px;color:#5B21B6">
    목적: <strong>${purposeLabel}</strong>
  </div>
  <label class="bo-label">교육 유형 세부 항목 <span style="font-size:10px;color:#9CA3AF">(하나만 선택)</span></label>
  ${types.map(t => {
        if (!t.subs || !t.subs.length) return `
  <div style="border-radius:10px;border:1.5px solid #E5E7EB;overflow:hidden">
    <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer"
           onclick="_selectEduItem('${t.id}','')">
      <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId === t.id && !d.selectedEduItem?.subId ? 'checked' : ''} style="margin:0;flex-shrink:0">
      <span style="font-size:13px;font-weight:800;color:${d.selectedEduItem?.typeId === t.id ? '#7C3AED' : '#374151'}">${t.label}</span>
    </label>
  </div>`;
        return `
  <div style="border-radius:10px;border:1.5px solid #E5E7EB;overflow:hidden">
    <div style="padding:10px 16px;background:#F9FAFB;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:900;color:#374151">${t.label}</span>
      <span style="font-size:10px;color:#9CA3AF">${t.subs.map(s => s.label).join(' · ')}</span>
    </div>
    <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px">
      ${t.subs.map(s => `
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;
                    border:1.5px solid ${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? '#7C3AED' : '#E5E7EB'};
                    background:${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? '#F5F3FF' : 'white'};cursor:pointer"
             onclick="_selectEduItem('${t.id}','${s.id}')">
        <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? 'checked' : ''} style="margin:0">
        <span style="font-size:13px;font-weight:700;color:${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? '#7C3AED' : '#374151'}">${s.label}</span>
      </label>`).join('')}
    </div>
  </div>`;
      }).join('')}
</div>`;

    } else {
      // ── 기타 목적: 복수 체크박스 ───────────────────────────────────────────────
      stepContent = `
<div style="display:grid;gap:10px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;font-size:12px;color:#5B21B6">
    목적: <strong>${purposeLabel}</strong>
  </div>
  <label class="bo-label">교육 유형 <span style="font-size:10px;color:#9CA3AF">(복수 선택 가능)</span></label>
  <div style="display:grid;gap:6px">
    ${types.map(t => {
        const isChecked = (d.eduTypes || []).includes(t.id);
        return `
    <div style="border-radius:10px;border:1.5px solid ${isChecked ? '#7C3AED' : '#E5E7EB'};background:${isChecked ? '#F5F3FF' : 'white'};overflow:hidden">
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer" onclick="_toggleEduType('${t.id}')">
        <input type="checkbox" ${isChecked ? 'checked' : ''} style="margin:0;flex-shrink:0">
        <div style="font-size:13px;font-weight:800;color:${isChecked ? '#7C3AED' : '#374151'}">${t.label}</div>
      </label>
    </div>`;
      }).join('')}
  </div>
</div>`;
    }

    // ── Step 4: 패턴 ─────────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 4) {
    const isNoBudget = !d.budgetLinked;
    const selAcctName = (d.accountCodes || []).map(c => ACCOUNT_MASTER.find(a => a.code === c)?.name || c).join(', ') || '—';
    const budgetedPatterns = [
      { v: 'A', icon: '📊', l: '패턴A: 계획→신청→결과', color: '#7C3AED', d: '고통제형. R&D·대규모 집합교육. 사전계획 필수, 예산 가점유 후 실차감.' },
      { v: 'B', icon: '📝', l: '패턴B: 신청→결과', color: '#1D4ED8', d: '자율신청형. 일반 사외교육 참가. 신청 승인 시 가점유, 결과 후 실차감.' },
      { v: 'C', icon: '🧾', l: '패턴C: 결과 단독(후정산)', color: '#D97706', d: '선지불 후정산. 개인 카드 결제 후 영수증 첨부. 승인 즉시 예산 차감.' },
    ];
    const noBudgetPatterns = [
      { v: 'D', icon: '📋', l: '패턴D: 신청 단독(이력)', color: '#6B7280', d: '무예산 이력관리. 무료 웨비나·자체세미나. 승인 시 즉시 이력 DB 적재.' },
      { v: 'E', icon: '✅', l: '패턴E: 신청→결과(이력+결과)', color: '#059669', d: '무예산이지만 결과보고까지 진행. 자비학습 후 결과 제출 필요한 경우.' },
    ];
    const patterns = isNoBudget ? noBudgetPatterns : budgetedPatterns;

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:${isNoBudget ? '#F0FDF4' : '#EFF6FF'};border:1px solid ${isNoBudget ? '#A7F3D0' : '#BFDBFE'};border-radius:10px;display:flex;align-items:center;gap:10px;font-size:12px">
    ${isNoBudget ? '📝 <strong style="color:#065F46">무예산</strong>' : '💳 <strong style="color:#1E40AF">예산 연동</strong>'}
    <span style="color:#6B7280">|</span>
    <span style="color:#374151;font-weight:700">${selAcctName}</span>
    <span style="font-size:10px;color:#9CA3AF;margin-left:4px">(Step 1에서 설정됨)</span>
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px">
      ${patterns.map(o => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.processPattern === o.v ? o.color : '#E5E7EB'};background:${d.processPattern === o.v ? o.color + '15' : 'white'};cursor:pointer"
             onclick="_policyWizardData.processPattern='${o.v}';_setPatternDefaults('${o.v}');renderPolicyWizard()">
        <input type="radio" name="wiz-pattern" value="${o.v}" ${d.processPattern === o.v ? 'checked' : ''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.processPattern === o.v ? o.color : '#374151'}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>
</div>`;

    // ── Step 5: 단계별 양식 선택 (기존 Step 6) ──────────────────────────────────
  } else if (_policyWizardStep === 5) {
    // DB에서 form_templates 로드하여 FORM_MASTER와 병합 (최초 1회 또는 비어있을 때)
    const _scopeGrpForLoad = d.scopeTenantId || persona.tenantId;
    if (typeof _sb === 'function' && _sb() && typeof FORM_MASTER !== 'undefined') {
      (async () => {
        try {
          const { data: dbForms } = await _sb().from('form_templates').select('*').eq('active', true);
          if (dbForms && dbForms.length > 0) {
            let changed = false;
            dbForms.forEach(row => {
              const mapped = {
                id: row.id, tenantId: row.tenant_id, domainId: row.domain_id || row.vorg_template_id,
                accountCode: row.account_code, type: row.type, name: row.name, desc: row.description || row.desc || '',
                purpose: row.purpose, eduType: row.edu_type, active: row.active !== false,
                fields: row.fields || [],
              };
              const idx = FORM_MASTER.findIndex(f => f.id === mapped.id);
              if (idx >= 0) { FORM_MASTER[idx] = mapped; }
              else { FORM_MASTER.push(mapped); changed = true; }
            });
            if (changed) renderPolicyWizard(); // DB 로드 후 양식 목록 갱신
          }
        } catch (e) { console.warn('[PolicyWizard:Step5] form_templates 로드 실패:', e.message); }
      })();
    }

    const _scopeTenantId = d.scopeTenantId || persona.tenantId;
    const _scopeVorgId = d.vorgTemplateId || '';
    const _scopeAcctCode = (d.accountCodes || [])[0] || '';

    // 정책에서 선택된 교육유형 집합 (필터에 사용)
    const _policyEduTypes = d.purpose === 'external_personal'
      ? (d.selectedEduItem?.typeId ? [d.selectedEduItem.typeId] : [])
      : (d.eduTypes || []);
    // 정책에서 선택된 세부유형
    const _policyEduSubId = d.purpose === 'external_personal'
      ? (d.selectedEduItem?.subId || '') : '';

    // 기준 양식 풀 (텐넌트+가상교육조직+계정)
    const _allForms = (typeof FORM_MASTER !== 'undefined' ? FORM_MASTER : [])
      .filter(f => {
        if (!f.active) return false;
        // tenantId 매칭: scopeTenantId 없으면 통과, 있으면 정확 매칭 (단 DB UUID와 코드가 다를 수 있어 양쪽 허용)
        if (_scopeTenantId && f.tenantId && f.tenantId !== _scopeTenantId) return false;
        // f.domainId에 신규로 vorg_template_id 저장됨
        if (_scopeVorgId && f.domainId && f.domainId !== _scopeVorgId) return false;
        if (_scopeAcctCode && f.accountCode && f.accountCode !== _scopeAcctCode) return false;
        return true;
      });


    // 교육유형으로 추가 필터 (목적·유형 정보가 없는 구형 양식은 숨기지 않음)
    // BO key('seminar') ↔ 한글라벨('세미나') 양방향 매칭
    const _eduKeyToLabel = {};
    const _eduLabelToKey = {};
    Object.values(_EDU_TYPE_MAP).flat().forEach(t => {
      _eduKeyToLabel[t.id] = t.label;
      _eduLabelToKey[t.label] = t.id;
      (t.subs || []).forEach(s => { _eduKeyToLabel[s.id] = s.label; _eduLabelToKey[s.label] = s.id; });
    });
    const _expandedEduTypes = new Set(_policyEduTypes);
    _policyEduTypes.forEach(k => { if (_eduKeyToLabel[k]) _expandedEduTypes.add(_eduKeyToLabel[k]); });
    _policyEduTypes.forEach(k => { if (_eduLabelToKey[k]) _expandedEduTypes.add(_eduLabelToKey[k]); });

    const _eduFiltered = _expandedEduTypes.size === 0 ? _allForms : _allForms.filter(f => {
      if (!f.eduType && !f.purpose) return true; // 구형 양식 허용
      if (_expandedEduTypes.has(f.eduType)) return true;
      return false;
    });

    // stage별 폼 목록 함수 (해당 탭의 type에 맞는 것만)
    const _formsForStage = (stage) => _eduFiltered.filter(f => f.type === stage);

    const stages = _PATTERN_STAGES[d.processPattern] || ['apply'];
    const stageLabel = { plan: '📊 계획', apply: '📝 신청', result: '📄 결과' };
    const stageColor = { plan: '#7C3AED', apply: '#1D4ED8', result: '#059669' };
    if (!d.stageFormIds) d.stageFormIds = { plan: [], apply: [], result: [] };
    const activeStageTab = _policyWizardData._formTab || stages[0];

    // 교육유형 안내 칩
    const _eduLabel = _policyEduTypes.length
      ? _policyEduTypes.map(t => {
        const sub = _policyEduSubId ? ` › ${_policyEduSubId}` : '';
        return `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E">${t}${sub}</span>`;
      }).join(' ')
      : `<span style="font-size:11px;color:#9CA3AF">교육유형 미지정 (전체 표시)</span>`;

    // 탭 완성도 배지 (선택 수 + 미연결 경고)
    const _tabBadge = (stage) => {
      const cnt = (d.stageFormIds[stage] || []).length;
      const avail = _formsForStage(stage).length;
      if (cnt > 0) return `<span style="font-size:10px;font-weight:900;padding:1px 7px;border-radius:10px;background:${stageColor[stage]};color:white;margin-left:4px">${cnt}</span>`;
      if (avail > 0) return `<span style="font-size:10px;font-weight:900;padding:1px 7px;border-radius:10px;background:#FEF3C7;color:#92400E;margin-left:4px">미선택</span>`;
      return `<span style="font-size:10px;padding:1px 7px;border-radius:10px;background:#F3F4F6;color:#9CA3AF;margin-left:4px">없음</span>`;
    };

    // 활성 탭의 양식 목록
    const _activeForms = _formsForStage(activeStageTab);
    const _selectedIds = d.stageFormIds[activeStageTab] || [];

    // 연결 요약 패널 (단계별 선택 현황)
    const _summaryPanels = stages.map(s => {
      const sel = (d.stageFormIds[s] || []).length;
      const avail = _formsForStage(s).length;
      const ok = sel > 0;
      return `<div style="flex:1;padding:10px 12px;border-radius:10px;border:1.5px solid ${ok ? stageColor[s] + '50' : '#E5E7EB'};background:${ok ? stageColor[s] + '08' : '#F9FAFB'};text-align:center">
        <div style="font-size:10px;font-weight:700;color:${ok ? stageColor[s] : '#9CA3AF'}">${stageLabel[s]}</div>
        <div style="font-size:16px;font-weight:900;color:${ok ? stageColor[s] : '#D1D5DB'};margin-top:2px">${ok ? '✓' : '—'}</div>
        <div style="font-size:10px;color:${ok ? stageColor[s] : '#9CA3AF'}">${sel > 0 ? sel + '개 연결' : `${avail}개 중 미선택`}</div>
      </div>`;
    }).join('');

    stepContent = `
<div style="display:grid;gap:16px">
  <!-- 교육유형 안내 -->
  <div style="padding:10px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="font-size:11px;font-weight:900;color:#92400E">🎯 교육유형 필터</span>
    ${_eduLabel}
    <span style="font-size:10px;color:#9CA3AF">| 해당 유형 + 단계별 양식만 표시됩니다</span>
  </div>
  <!-- 완성도 경고 배너 -->
  ${stages.some(s => (d.stageFormIds[s] || []).length === 0 && _formsForStage(s).length > 0) ? `
  <div style="padding:10px 14px;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:16px">⚠️</span>
    <span style="font-size:12px;font-weight:700;color:#B91C1C">양식이 연결되지 않은 단계가 있습니다. 아래에서 모든 단계에 양식을 연결해 주세요.</span>
  </div>` : stages.length > 0 && stages.every(s => (d.stageFormIds[s] || []).length > 0) ? `
  <div style="padding:10px 14px;background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:16px">✅</span>
    <span style="font-size:12px;font-weight:700;color:#065F46">모든 단계에 양식이 연결되었습니다.</span>
  </div>` : ''}
  <!-- 단계별 양식 카드 (한페이지 수직 배치) -->
  ${stages.map(s => {
      const forms = _formsForStage(s);
      const selected = d.stageFormIds[s] || [];
      const ok = selected.length > 0;
      return `
  <div style="border:2px solid ${ok ? stageColor[s] + '60' : (forms.length > 0 ? '#FECACA' : '#E5E7EB')};border-radius:14px;overflow:hidden">
    <!-- 단계 헤더 -->
    <div style="padding:12px 16px;background:${ok ? stageColor[s] + '10' : (forms.length > 0 ? '#FEF2F2' : '#F9FAFB')};
                display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${ok ? stageColor[s] + '30' : '#E5E7EB'}">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:900;color:${stageColor[s]}">${stageLabel[s]} 단계 양식</span>
        ${ok
          ? `<span style="padding:2px 9px;border-radius:20px;background:${stageColor[s]};color:white;font-size:10px;font-weight:900">${selected.length}개 연결</span>`
          : forms.length > 0
            ? `<span style="padding:2px 9px;border-radius:20px;background:#FEE2E2;color:#B91C1C;font-size:10px;font-weight:900">⚠ 미연결</span>`
            : `<span style="padding:2px 9px;border-radius:20px;background:#F3F4F6;color:#9CA3AF;font-size:10px;font-weight:700">양식 없음</span>`
        }
      </div>
      <span style="font-size:10px;color:#9CA3AF">${forms.length}개 선택 가능</span>
    </div>
    <!-- 양식 목록 -->
    <div style="padding:12px;background:white">
    ${forms.length === 0 ? `
      <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:8px;border:1px dashed #D1D5DB">
        <div style="font-size:20px;margin-bottom:4px">📭</div>
        <div style="font-size:12px;font-weight:700;color:#374151">사용 가능한 ${stageLabel[s].split(' ')[1]} 양식이 없습니다</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:3px">교육양식마법사에서 [${stageLabel[s].split(' ')[1]}] 타입 양식을 먼저 만들어 주세요</div>
      </div>` : `
    <div style="display:grid;gap:6px">
      ${forms.map(f => {
          const isSel = selected.includes(f.id);
          return `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;
                    border:1.5px solid ${isSel ? stageColor[s] : '#E5E7EB'};
                    background:${isSel ? stageColor[s] + '10' : 'white'};cursor:pointer;transition:all .13s"
             onclick="toggleStageForm('${s}','${f.id}')">
        <input type="checkbox" ${isSel ? 'checked' : ''} style="margin:0;flex-shrink:0;width:16px;height:16px;accent-color:${stageColor[s]}">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:12px;color:${isSel ? stageColor[s] : '#111827'}">${f.name}</div>
          <div style="font-size:10px;color:#9CA3AF;margin-top:1px">
            ${f.purpose ? `🎯 ${f.purpose}` : ''}
            ${f.eduType ? ` · ${f.eduType}` : ''}
            ${f.eduSubType ? ` › ${f.eduSubType}` : ''}
            ${f.desc ? ` · ${f.desc}` : ''}
          </div>
        </div>
        ${isSel ? `<span style="flex-shrink:0;font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${stageColor[s]};color:white">✓ 선택</span>` : ''}
      </label>`;
        }).join('')}
    </div>`}
    </div>
  </div>`;
    }).join('')}
</div>`;



    // ── Step 6: 단계별 결재라인 (기존 Step 7) ────────────────────────────────────
  } else if (_policyWizardStep === 6) {
    const stages = _PATTERN_STAGES[d.processPattern] || ['apply'];
    const stageLabel = { plan: '📊 계획', apply: '📝 신청', result: '📄 결과' };
    const stageColor = { plan: '#7C3AED', apply: '#1D4ED8', result: '#059669' };
    if (!d.approvalConfig) d.approvalConfig = { plan: { thresholds: [], finalApproverKey: '' }, apply: { thresholds: [], finalApproverKey: '' }, result: { thresholds: [], finalApproverKey: '' } };
    const activeStage = _policyWizardData._approvalTab || stages[0];
    const cfg = d.approvalConfig[activeStage] || { thresholds: [], finalApproverKey: '' };
    const tenantPersonas = Object.entries(BO_PERSONAS)
      .filter(([k, p]) => p.tenantId === persona.tenantId)
      .map(([k, p]) => ({ key: k, p }));

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E">
    💡 각 단계(계획/신청/결과)별로 결재라인을 아래에서 한 번에 설정하세요. 최종 결재자는 필수입니다.
  </div>
  <!-- 단계별 결재 카드 (수직 배치) -->
  ${stages.map(s => {
      const c = d.approvalConfig[s] || { thresholds: [], finalApproverKey: '' };
      const hasFinal = !!c.finalApproverKey;
      return `
  <div style="border:2px solid ${hasFinal ? stageColor[s] + '60' : '#FECACA'};border-radius:14px;overflow:hidden">
    <!-- 단계 헤더 -->
    <div style="padding:12px 16px;background:${hasFinal ? stageColor[s] + '10' : '#FEF2F2'};
         display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${hasFinal ? stageColor[s] + '30' : '#E5E7EB'}">
      <span style="font-size:13px;font-weight:900;color:${stageColor[s]}">${stageLabel[s]} 결재라인</span>
      ${hasFinal
          ? `<span style="padding:2px 9px;border-radius:20px;background:${stageColor[s]};color:white;font-size:10px;font-weight:900">✓ 설정됨</span>`
          : `<span style="padding:2px 9px;border-radius:20px;background:#FEE2E2;color:#B91C1C;font-size:10px;font-weight:900">⚠ 최종 결재자 미설정</span>`
        }
    </div>
    <!-- 내용 -->
    <div style="padding:14px 16px;background:white;display:grid;gap:12px">
      <!-- 금액 구간 -->
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-size:11px;font-weight:800;color:#374151">${stageLabel[s]} 금액 구간별 결재자</label>
          <button onclick="_addStageThreshold('${s}')" style="font-size:11px;padding:5px 12px;border-radius:8px;border:1.5px solid ${stageColor[s]};color:${stageColor[s]};background:white;cursor:pointer;font-weight:700">+ 구간 추가</button>
        </div>
        <div style="display:grid;gap:8px">
          ${c.thresholds.length === 0 ? `
          <div style="padding:14px;text-align:center;background:#F9FAFB;border-radius:8px;color:#9CA3AF;font-size:11px">
            구간 없음 — 모든 신청이 최종 결재자에게 바로 배달됩니다.
          </div>` :
          c.thresholds.map((t, i) => `
          <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;padding:10px 12px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:8px">
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">최대 금액 (원)</label>
              <input type="number" value="${t.maxAmt || ''}" placeholder="예: 1000000"
                onchange="_policyWizardData.approvalConfig['${s}'].thresholds[${i}].maxAmt=Number(this.value)"
                style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;box-sizing:border-box"/>
              <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${t.maxAmt ? (t.maxAmt / 10000) + '만원 이하' : '금액 입력'}</div>
            </div>
            <div>
              <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">결재 담당자</label>
              <select onchange="_policyWizardData.approvalConfig['${s}'].thresholds[${i}].approverKey=this.value"
                style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 8px;font-size:12px;font-weight:700">
                <option value="">— 선택 —</option>
                ${tenantPersonas.map(({ key, p }) => `<option value="${key}" ${t.approverKey === key ? 'selected' : ''}>${p.name} (${p.dept})</option>`).join('')}
              </select>
            </div>
            <button onclick="_removeStageThreshold('${s}',${i})" style="padding:7px 10px;border-radius:8px;border:1.5px solid #FCA5A5;color:#DC2626;background:white;cursor:pointer;font-size:11px;font-weight:700;height:34px">삭제</button>
          </div>`).join('')}
        </div>
      </div>
      <!-- 최종 결재자 -->
      <div>
        <label class="bo-label">${stageLabel[s]} 최종 결재자 <span style="color:#EF4444">*</span></label>
        <select id="wiz-final-approver-${s}"
          onchange="_policyWizardData.approvalConfig['${s}'].finalApproverKey=this.value;renderPolicyWizard()"
          style="width:100%;border:1.5px solid ${hasFinal ? stageColor[s] : '#FCA5A5'};border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
          <option value="">— 선택 —</option>
          ${tenantPersonas.map(({ key, p }) => `<option value="${key}" ${c.finalApproverKey === key ? 'selected' : ''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
        </select>
      </div>
    </div>
  </div>`;
    }).join('')}
  <!-- 정책 관리자 / 상태 -->
  <div style="border:1.5px solid #E5E7EB;border-radius:14px;padding:16px;background:white;display:grid;gap:12px">
    <div>
      <label class="bo-label">정책 관리자</label>
      <select id="wiz-manager" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
        <option value="">— 선택 —</option>
        ${tenantPersonas.map(({ key, p }) => `<option value="${key}" ${d.managerPersonaKey === key ? 'selected' : ''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
      </select>
    </div>
    <div>
      <label class="bo-label">정책 운영 상태</label>
      <div style="display:flex;gap:8px">
        ${['active', 'paused'].map(s => `
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:2px solid ${d.status === s ? '#059669' : '#E5E7EB'};background:${d.status === s ? '#F0FDF4' : 'white'};cursor:pointer"
               onclick="_policyWizardData.status='${s}';renderPolicyWizard()">
          <input type="radio" ${d.status === s ? 'checked' : ''} style="margin:0">
          <span style="font-weight:700;font-size:13px">${s === 'active' ? '✅ 운영 중' : '⏸️ 중지'}</span>
        </label>`).join('')}
      </div>
    </div>
  </div>
</div>`;

  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:720px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
    <button onclick="renderServicePolicy()" style="border:none;background:none;cursor:pointer;font-size:18px;color:#6B7280">←</button>
    <h1 class="bo-page-title" style="margin:0">${_editPolicyId ? '정책 수정' : '새 정책 만들기'}</h1>
  </div>
  <div style="display:flex;align-items:flex-start;gap:0;margin-bottom:28px;overflow-x:auto;padding-bottom:4px">${stepBar}</div>
  ${summaryBar}
  <div class="bo-card" style="padding:24px;margin-bottom:16px">${stepContent}</div>
  <div style="display:flex;justify-content:space-between">
    <button onclick="${_policyWizardStep > 0 ? '_policyWizardStep--;renderPolicyWizard()' : 'renderServicePolicy()'}"
      style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;font-size:13px;cursor:pointer">
      ${_policyWizardStep > 0 ? '← 이전' : '취소'}
    </button>
    <button onclick="${_policyWizardStep < TOTAL ? 'advancePolicyWizard()' : 'savePolicy()'}" class="bo-btn-primary" style="padding:10px 24px">
      ${_policyWizardStep < TOTAL ? '다음 →' : '✅ 정책 저장'}
    </button>
  </div>
</div>`;
}

// ── 헬퍼 함수들 ───────────────────────────────────────────────────────────────
function _toggleEduType(id) {
  const arr = _policyWizardData.eduTypes || [];
  const i = arr.indexOf(id);
  if (i >= 0) {
    arr.splice(i, 1);
    // 상위 해제 시 세부항목도 초기화
    if (_policyWizardData.eduSubTypes) delete _policyWizardData.eduSubTypes[id];
  } else {
    arr.push(id);
  }
  _policyWizardData.eduTypes = arr;
  renderPolicyWizard();
}
function _toggleEduSubType(typeId, subId) {
  if (!_policyWizardData.eduSubTypes) _policyWizardData.eduSubTypes = {};
  if (!_policyWizardData.eduSubTypes[typeId]) _policyWizardData.eduSubTypes[typeId] = [];
  const arr = _policyWizardData.eduSubTypes[typeId];
  const i = arr.indexOf(subId);
  if (i >= 0) arr.splice(i, 1); else arr.push(subId);
  renderPolicyWizard();
}
function _addStageThreshold(stage) {
  if (!_policyWizardData.approvalConfig) _policyWizardData.approvalConfig = {};
  if (!_policyWizardData.approvalConfig[stage]) _policyWizardData.approvalConfig[stage] = { thresholds: [], finalApproverKey: '' };
  _policyWizardData.approvalConfig[stage].thresholds.push({ maxAmt: null, approverKey: '' });
  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
function _removeStageThreshold(stage, i) {
  _policyWizardData.approvalConfig[stage].thresholds.splice(i, 1);
  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
function _setPatternDefaults(pat) {
  const m = _PATTERN_META[pat];
  if (!m) return;
  _policyWizardData.flow = m.flow;
  _policyWizardData.budgetLinked = m.budgetLinked;
  _policyWizardData.applyMode = m.applyMode;
  if (!m.budgetLinked) _policyWizardData.accountCodes = [];
}
function _selectEduItem(typeId, subId) {
  _policyWizardData.selectedEduItem = { typeId, subId };
  _policyWizardData.eduTypes = typeId ? [typeId] : [];
  renderPolicyWizard();
}

// ── 위저드 진행 ───────────────────────────────────────────────────────────────
// step1 input 값을 _policyWizardData에 먼저 저장한 후 재렌더 (입력 유실 방지)
function _wizSaveStep1Inputs() {
  const n = document.getElementById('wiz-name')?.value;
  const desc = document.getElementById('wiz-desc')?.value;
  if (n !== undefined) _policyWizardData.name = n.trim();
  if (desc !== undefined) _policyWizardData.desc = desc.trim();
}
window._wizSaveStep1Inputs = _wizSaveStep1Inputs;

function advancePolicyWizard() {
  const d = _policyWizardData;
  if (_policyWizardStep === 0) {
    const d = _policyWizardData;
    if (!d.scopeTenantId) { alert('회사를 선택하세요.'); return; }
    if (!d.vorgTemplateId) { alert('가상교육조직을 선택하세요.'); return; }
    if (!(d.accountCodes || []).length) { alert('예산 계정을 선택하세요.'); return; }
    // scopeTenantId를 tenantId로 동기화
    _policyWizardData.tenantId = d.scopeTenantId;
  } else if (_policyWizardStep === 1) {
    const n = document.getElementById('wiz-name')?.value?.trim();
    if (!n) { alert('정책명을 입력하세요.'); return; }
    d.name = n;
    const desc = document.getElementById('wiz-desc')?.value?.trim();
    if (desc) d.desc = desc;
    if (!d.targetType) { alert('대상자를 선택하세요.'); return; }
  } else if (_policyWizardStep === 2) {
    if (!d.purpose) { alert('교육 목적을 선택하세요.'); return; }
  } else if (_policyWizardStep === 3) {
    if (d.purpose === 'external_personal') {
      if (!d.selectedEduItem) { alert('교육 유형 세부 항목을 하나 선택하세요.'); return; }
    } else {
      if (!(d.eduTypes || []).length) { alert('교육 유형을 하나 이상 선택하세요.'); return; }
    }
  } else if (_policyWizardStep === 4) {
    if (!d.processPattern) { alert('프로세스 패턴을 선택하세요.'); return; }
  }
  _policyWizardStep = Math.min(_policyWizardStep + 1, 7);
  renderPolicyWizard();
}

// ── 정책 저장 ─────────────────────────────────────────────────────────────────
async function savePolicy() {
  const d = _policyWizardData;
  const mgr = document.getElementById('wiz-manager')?.value;
  if (mgr) d.managerPersonaKey = mgr;

  const stages = _PATTERN_STAGES[d.processPattern] || ['apply'];
  for (const s of stages) {
    const finalEl = document.getElementById(`wiz-final-approver-${s}`);
    if (finalEl) d.approvalConfig[s].finalApproverKey = finalEl.value;
  }
  const applyFinalKey = d.approvalConfig?.apply?.finalApproverKey;
  if (!applyFinalKey && stages.includes('apply')) {
    alert('신청 단계의 최종 결재자를 선택하세요.'); return;
  }
  // 레거시 호환 필드 유지
  d.approverPersonaKey = applyFinalKey;
  d.approvalThresholds = d.approvalConfig?.apply?.thresholds || [];
  d.allowedLearningTypes = d.eduTypes || [];
  if (!d.name) { alert('정책명이 없습니다.'); return; }

  // 1) 메모리 SERVICE_POLICIES 업데이트
  const idx = SERVICE_POLICIES.findIndex(p => p.id === d.id);
  if (idx >= 0) SERVICE_POLICIES[idx] = d;
  else SERVICE_POLICIES.push(d);

  // 2) DB 저장 (upsert) - camelCase → snake_case 컬럼 매핑
  if (typeof sbSaveServicePolicy === 'function') {
    const dbRow = {
      id: d.id,
      tenant_id: d.tenantId || d.scopeTenantId,
      vorg_template_id: d.vorgTemplateId || null,
      scope_tenant_id: d.scopeTenantId || null,
      name: d.name,
      descr: d.desc || d.descr || null,
      target_type: d.targetType || null,
      purpose: d.purpose || null,
      edu_types: d.eduTypes || [],
      selected_edu_item: d.selectedEduItem || null,
      process_pattern: d.processPattern || null,
      flow: d.flow || null,
      budget_linked: d.budgetLinked !== false,
      apply_mode: d.applyMode || null,
      account_codes: d.accountCodes || [],
      stage_form_ids: d.stageFormIds || d.formSets || null,
      approval_config: d.approvalConfig || null,
      manager_persona_key: d.managerPersonaKey || null,
      status: d.status || 'active',
    };
    try {
      await sbSaveServicePolicy(dbRow);
    } catch (e) {
      console.warn('[PolicyBuilder] DB 저장 실패 - 메모리에만 저장됨:', e.message);
      alert('⚠️ 정책이 임시 저장됐습니다. (DB 저장 실패 - 새로고침 시 초기화될 수 있습니다)');
    }
  }

  const ap = BO_PERSONAS[applyFinalKey];
  alert(`✅ 정책 저장 완료!\n\n📋 ${d.name}\n🔄 패턴 ${d.processPattern}\n✅ 신청 최종 결재자: ${ap?.name || '—'}\n\n이제 학습자 신청 시 [나의 운영 업무]에 자동 배달됩니다.`);
  renderServicePolicy();
}

// ── 헬퍼: 계정·양식·스테이지 폼 토글 ────────────────────────────────────────
function togglePolicyAcct(code) {
  const arr = _policyWizardData.accountCodes;
  const i = arr.indexOf(code);
  if (i >= 0) arr.splice(i, 1); else arr.push(code);
  renderPolicyWizard();
}
function _selectPolicyAcct(code) {
  const isNoBudget = code === '__none__';
  _policyWizardData.accountCodes = isNoBudget ? [] : [code];
  _policyWizardData.budgetLinked = !isNoBudget;
  // 패턴 자동 보정: 예산↔무예산 전환 시 패턴 리셋
  const pat = _policyWizardData.processPattern || '';
  const isBudgetedPat = ['A', 'B', 'C'].includes(pat);
  const isNoBudgetPat = ['D', 'E'].includes(pat);
  if (isNoBudget && isBudgetedPat) _policyWizardData.processPattern = 'D';
  if (!isNoBudget && isNoBudgetPat) _policyWizardData.processPattern = 'B';
  renderPolicyWizard();
}
function toggleStageForm(stage, id) {
  if (!_policyWizardData.stageFormIds) _policyWizardData.stageFormIds = { plan: [], apply: [], result: [] };
  if (!_policyWizardData.stageFormIds[stage]) _policyWizardData.stageFormIds[stage] = [];
  const arr = _policyWizardData.stageFormIds[stage];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  _policyWizardData._formTab = stage;
  renderPolicyWizard();
}
function togglePolicyForm(id) {
  const arr = _policyWizardData.formIds || [];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  _policyWizardData.formIds = arr;
  renderPolicyWizard();
}
function togglePolicyLType(t) {
  const arr = _policyWizardData.allowedLearningTypes || [];
  const i = arr.indexOf(t);
  if (i >= 0) arr.splice(i, 1); else arr.push(t);
  _policyWizardData.allowedLearningTypes = arr;
  renderPolicyWizard();
}

// ── 정책 삭제 ──────────────────────────────────────────────────────────────────
async function deleteServicePolicy(policyId, policyName) {
  if (!confirm(`정책 「${policyName}」을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
  try {
    // DB 삭제 시도 (Supabase REST)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/service_policies?id=eq.${policyId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Prefer': 'return=minimal',
        }
      }
    );
    if (!res.ok && res.status !== 404) {
      const msg = await res.text();
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
  } catch (e) {
    console.warn('[서비스 정책 삭제] DB 삭제 실패 (로컬만 제거):', e.message);
  }
  // 로컬 배열에서도 제거
  if (typeof SERVICE_POLICIES !== 'undefined') {
    const idx = SERVICE_POLICIES.findIndex(p => p.id === policyId);
    if (idx >= 0) SERVICE_POLICIES.splice(idx, 1);
  }
  renderServicePolicy();
}
window.deleteServicePolicy = deleteServicePolicy;

