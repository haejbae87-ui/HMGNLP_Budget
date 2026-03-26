// ─── 🔧 서비스 정책 관리 ─────────────────────────────────────────────────────
// 8단계 위저드: 범위설정(회사·그룹·계정) → 정책명+대상자 → 목적 → 교육유형 → 패턴 → 대상조직 → 양식 → 결재라인

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;

// ── 패턴 메타 (E 추가) ────────────────────────────────────────────────────────
const _PATTERN_META = {
  A:{ label:'패턴A: 계획→신청→결과', color:'#7C3AED', icon:'📊', flow:'plan-apply-result', applyMode:'holding',        budgetLinked:true  },
  B:{ label:'패턴B: 신청→결과',       color:'#1D4ED8', icon:'📝', flow:'apply-result',      applyMode:'holding',        budgetLinked:true  },
  C:{ label:'패턴C: 결과 단독(후정산)',color:'#D97706', icon:'🧾', flow:'result-only',       applyMode:'reimbursement', budgetLinked:true  },
  D:{ label:'패턴D: 신청 단독(이력)', color:'#6B7280', icon:'📋', flow:'result-only',       applyMode:null,            budgetLinked:false },
  E:{ label:'패턴E: 신청→결과(이력+결과)', color:'#059669', icon:'✅', flow:'apply-result', applyMode:null,            budgetLinked:false },
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
  return p.processPattern || (p.flow==='plan-apply-result'?'A':p.flow==='apply-result'?'B':'C');
}

// ── 목적·유형 정의 ────────────────────────────────────────────────────────────
const _PURPOSE_MAP = {
  learner: [
    { id:'external_personal', label:'개인직무 사외학습' },
  ],
  operator: [
    { id:'elearning_class',   label:'이러닝/집합(비대면) 운영' },
    { id:'conf_seminar',      label:'콘퍼런스/세미나/워크샵 운영' },
    { id:'misc_ops',          label:'기타 운영' },
  ],
};
const _EDU_TYPE_MAP = {
  external_personal: [
    { id:'regular',    label:'정규교육',         subs:[
      {id:'elearning', label:'이러닝'},
      {id:'class',     label:'집합'},
      {id:'live',      label:'라이브'},
    ]},
    { id:'academic',   label:'학술 및 연구활동', subs:[
      {id:'conf',      label:'학회/컨퍼런스'},
      {id:'seminar',   label:'세미나'},
    ]},
    { id:'knowledge',  label:'지식자원 학습',    subs:[
      {id:'book',      label:'도서구입'},
      {id:'online',    label:'온라인콘텐츠'},
    ]},
    { id:'competency', label:'역량개발지원',      subs:[
      {id:'lang',      label:'어학학습비 지원'},
      {id:'cert',      label:'자격증 취득지원'},
    ]},
    { id:'etc',        label:'기타',              subs:[
      {id:'team_build',label:'팀빌딩'},
    ]},
  ],
  elearning_class: [
    { id:'elearning', label:'이러닝',   subs:[] },
    { id:'class',     label:'집합교육', subs:[] },
  ],
  conf_seminar: [
    { id:'conference',   label:'콘퍼런스',  subs:[] },
    { id:'seminar',      label:'세미나',    subs:[] },
    { id:'teambuilding', label:'팀빌딩',    subs:[] },
    { id:'cert_maintain',label:'자격유지',  subs:[] },
    { id:'system_link',  label:'제도연계',  subs:[] },
  ],
  misc_ops: [
    { id:'course_dev',  label:'과정개발',    subs:[] },
    { id:'material_dev',label:'교안개발',    subs:[] },
    { id:'video_prod',  label:'영상제작',    subs:[] },
    { id:'facility',    label:'교육시설운영',subs:[] },
  ],
};

// ── 필터 상태 ─────────────────────────────────────────────────────────────────
let _pbTenantFilter  = '';
let _pbGroupFilter   = '';
let _pbAccountFilter = '';

// ── 정책 목록 메인 화면 ───────────────────────────────────────────────────────
function renderServicePolicy() {
  const persona    = boCurrentPersona;
  const role       = persona.role;
  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';
  const isBudgetOp = role === 'budget_op_manager' || role === 'budget_hq';
  const isBudgetAdmin = role === 'budget_global_admin';
  const el = document.getElementById('bo-content');

  const activeTenantId = isPlatform ? (_pbTenantFilter || '') : (persona.tenantId || '');
  const activeGroupId  = (typeof boGetActiveGroupId === 'function') ? boGetActiveGroupId() : null;
  const autoGroupId    = (isBudgetOp || isBudgetAdmin) ? (persona.isolationGroupId || activeGroupId || '') : null;
  const pbGroupId      = autoGroupId || _pbGroupFilter || activeGroupId || '';

  let myPolicies = SERVICE_POLICIES.filter(p => {
    const tenantMatch = activeTenantId ? p.tenantId === activeTenantId : true;
    if (!tenantMatch) return false;
    if (isBudgetOp || isBudgetAdmin) {
      if (pbGroupId && p.isolationGroupId) { if (p.isolationGroupId !== pbGroupId) return false; }
      else {
        const myAccts = persona.ownedAccounts || [];
        if (!myAccts.includes('*') && !myAccts.some(a => p.accountCodes?.includes(a))) return false;
      }
    } else {
      if (pbGroupId && p.isolationGroupId && p.isolationGroupId !== pbGroupId) return false;
      if (activeTenantId && p.tenantId !== activeTenantId) return false;
    }
    if (_pbAccountFilter && !(p.accountCodes || []).includes(_pbAccountFilter)) return false;
    return true;
  });

  const TENANTS_LIST = typeof TENANTS !== 'undefined' ? TENANTS
    : [...new Set(SERVICE_POLICIES.map(p=>p.tenantId))].map(id=>({id,name:id}));
  const availGroups = (typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS : [])
    .filter(g => !activeTenantId || g.tenantId === activeTenantId);
  const availAccounts = (() => {
    // 격리그룹을 선택한 경우 해당 그룹의 ownedAccounts만 표시
    if (pbGroupId) {
      const grp = (typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS : []).find(g => g.id === pbGroupId);
      const owned = grp?.ownedAccounts || [];
      if (owned.length) {
        return ACCOUNT_MASTER.filter(a => a.active && owned.includes(a.code));
      }
    }
    // 그룹 미선택: 테넌트 전체 계정 (COMMON-FREE 제외)
    return ACCOUNT_MASTER.filter(a =>
      a.active &&
      a.code !== 'COMMON-FREE' &&
      (activeTenantId ? a.tenantId === activeTenantId : true)
    );
  })();

  const filterBar = (isPlatform || isTenant || isBudgetOp || isBudgetAdmin) ? `
<div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05)">
  ${isPlatform ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
    <select id="pb-tenant-sel" onchange="_pbTenantFilter=this.value;_pbGroupFilter='';_pbAccountFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:140px">
      <option value="">전체 회사</option>
      ${TENANTS_LIST.map(t=>`<option value="${t.id}" ${activeTenantId===t.id?'selected':''}>${t.name||t.id}</option>`).join('')}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>` : ''}
  ${isBudgetOp ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">격리그룹</span>
    <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #C4B5FD;border-radius:10px;background:#F5F3FF;min-width:140px">
      <span style="font-size:12px">🔒</span>
      <span style="font-size:13px;font-weight:800;color:#7C3AED">${(typeof ISOLATION_GROUPS!=='undefined'?ISOLATION_GROUPS:[]).find(g=>g.id===pbGroupId)?.name||pbGroupId||'전체'}</span>
    </div>
  </div>` : `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">격리그룹</span>
    <select id="pb-group-sel" onchange="_pbGroupFilter=this.value;_pbAccountFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 그룹</option>
      ${availGroups.map(g=>`<option value="${g.id}" ${pbGroupId===g.id?'selected':''}>${g.name}</option>`).join('')}
    </select>
  </div>`}
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">예산 계정</span>
    <select id="pb-acct-sel" onchange="_pbAccountFilter=this.value"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 계정</option>
      ${availAccounts.map(a=>`<option value="${a.code}" ${_pbAccountFilter===a.code?'selected':''}>${a.name}</option>`).join('')}
    </select>
  </div>
  <button onclick="
    _pbTenantFilter=document.getElementById('pb-tenant-sel')?.value||_pbTenantFilter;
    _pbGroupFilter=document.getElementById('pb-group-sel')?.value||_pbGroupFilter;
    _pbAccountFilter=document.getElementById('pb-acct-sel')?.value||_pbAccountFilter;
    renderServicePolicy()"
    style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,.35);white-space:nowrap">
    ● 조회
  </button>
  ${!isBudgetOp ? `
  <button onclick="_pbTenantFilter='';_pbGroupFilter='';_pbAccountFilter='';renderServicePolicy()"
    style="padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;font-weight:700;background:white;cursor:pointer;color:#6B7280;white-space:nowrap">초기화</button>` : ''}
</div>` : '';

  const policyCards = myPolicies.map(p => {
    const approver = _getPersonaByKey(p.approvalConfig?.apply?.finalApproverKey || p.approverPersonaKey);
    const manager  = _getPersonaByKey(p.managerPersonaKey);
    const accounts = (p.accountCodes||[]).map(c => ACCOUNT_MASTER.find(a=>a.code===c)?.name||c).join(', ');
    const pat  = _patternFromPolicy(p);
    const pm   = _PATTERN_META[pat] || _PATTERN_META['B'];
    const purposeLabel = [...(_PURPOSE_MAP.learner||[]),...(_PURPOSE_MAP.operator||[])].find(x=>x.id===p.purpose)?.label || p.purpose || '';
    return `
<div class="bo-card" style="padding:20px;margin-bottom:14px;cursor:pointer" onclick="startPolicyWizard('${p.id}')">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${pm.color}18;color:${pm.color};border:1px solid ${pm.color}40">${pm.icon} ${pm.label}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.budgetLinked?'#DBEAFE':'#F3F4F6'};color:${p.budgetLinked?'#1E40AF':'#6B7280'};font-weight:700">${p.budgetLinked?'💳 예산 연동':'무예산'}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.status==='active'?'#D1FAE5':'#F3F4F6'};color:${p.status==='active'?'#065F46':'#9CA3AF'};font-weight:700">${p.status==='active'?'✅ 운영중':'⏸️ 중지'}</span>
        ${isPlatform ? `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;font-weight:700">${p.tenantId}</span>` : ''}
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:4px">${p.name}</div>
      <div style="font-size:12px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
        ${purposeLabel ? `<span>🎯 ${purposeLabel}</span>` : ''}
        ${accounts ? `<span>💳 ${accounts}</span>` : ''}
        <span>✅ 승인자: <b>${approver?.name||'—'}</b></span>
        <span>📋 관리자: <b>${manager?.name||'—'}</b></span>
        <span>📅 ${p.createdAt}</span>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button onclick="event.stopPropagation();startPolicyWizard('${p.id}')" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;cursor:pointer;font-weight:700">✏️ 수정</button>
      <button onclick="event.stopPropagation();deleteServicePolicy('${p.id}','${p.name}')" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer;font-weight:700">🗑️ 삭제</button>
    </div>
  </div>
</div>`;
  }).join('');

  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner==='function' ? boIsolationGroupBanner() : ''}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <h1 class="bo-page-title">🔧 서비스 정책 관리</h1>
      <p class="bo-page-sub">교육 서비스 흐름, 예산 연동, 결재라인을 하나의 정책으로 통합 관리</p>
    </div>
    <button onclick="startPolicyWizard(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 정책 만들기
    </button>
  </div>
  ${filterBar}
  <div>
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">정책 목록 (${myPolicies.length}개)</div>
    ${policyCards || '<div style="padding:40px;text-align:center;color:#9CA3AF">정책이 없습니다. 새 정책을 만드세요.</div>'}
  </div>
</div>`;
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
        plan:   { thresholds: JSON.parse(JSON.stringify(old)), finalApproverKey: finalKey },
        apply:  { thresholds: JSON.parse(JSON.stringify(old)), finalApproverKey: finalKey },
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
      scopeGroupId: boCurrentPersona.isolationGroupId || '',
      name: '', desc: '',
      targetType: '',
      purpose: '',
      eduTypes: [], selectedEduItem: null, eduSubTypes: {},
      processPattern: '', flow: 'apply-result',
      budgetLinked: true, applyMode: 'holding',
      accountCodes: [], vorgTemplateId: '',
      stageFormIds: { plan:[], apply:[], result:[] },
      approvalConfig: {
        plan:   { thresholds: [], finalApproverKey: '' },
        apply:  { thresholds: [], finalApproverKey: '' },
        result: { thresholds: [], finalApproverKey: '' },
      },
      managerPersonaKey: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '',
      status: 'active', createdAt: new Date().toISOString().slice(0,10),
    };
    // 목록 페이지의 필터값을 새 정책 초기값으로 pre-fill
    if (_pbTenantFilter)  _policyWizardData.scopeTenantId = _pbTenantFilter;
    if (_pbGroupFilter)   _policyWizardData.scopeGroupId  = _pbGroupFilter;
    if (_pbAccountFilter) _policyWizardData.accountCodes  = [_pbAccountFilter];
  }
  renderPolicyWizard();
}

// ── 위저드 렌더링 ─────────────────────────────────────────────────────────────
function renderPolicyWizard() {
  const el = document.getElementById('bo-content');
  const steps = ['범위설정', '정책명·대상자', '목적', '교육유형', '패턴', '대상조직', '양식', '결재라인'];
  const TOTAL = steps.length - 1;
  const d = _policyWizardData;
  const persona = boCurrentPersona;

  const stepBar = steps.map((s,i) => `
<div style="display:flex;align-items:center;gap:0">
  <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;
      background:${i<_policyWizardStep?'#059669':i===_policyWizardStep?'#7C3AED':'#E5E7EB'};
      color:${i<=_policyWizardStep?'white':'#9CA3AF'}">${i<_policyWizardStep?'✓':(i+1)}</div>
    <div style="font-size:10px;font-weight:700;color:${i===_policyWizardStep?'#7C3AED':i<_policyWizardStep?'#059669':'#9CA3AF'};white-space:nowrap">${s}</div>
  </div>
  ${i<steps.length-1?`<div style="width:20px;height:2px;background:${i<_policyWizardStep?'#059669':'#E5E7EB'};margin-bottom:16px"></div>`:''}
</div>`).join('');

  // ── 이전 선택값 요약 배너 (step > 0일 때 표시) ─────────────────────────────
  const _sumTenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const _sumGroups  = typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS : [];
  const _sumAccts   = typeof ACCOUNT_MASTER !== 'undefined' ? ACCOUNT_MASTER : [];
  const sumTenant   = _sumTenants.find(t => t.id === d.scopeTenantId)?.name || d.scopeTenantId || '';
  const sumGroup    = _sumGroups.find(g => g.id === d.scopeGroupId)?.name  || d.scopeGroupId  || '';
  const sumAccts    = (d.accountCodes||[]).map(c => _sumAccts.find(a=>a.code===c)?.name||c).join(', ');
  const sumPat      = d.processPattern ? `${_PATTERN_META[d.processPattern]?.icon||''} 패턴${d.processPattern}` : '';
  const summaryChips = [
    sumTenant  && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:11px;font-weight:700;color:#1E40AF">🏢 ${sumTenant}</span>`,
    sumGroup   && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#F5F3FF;border:1px solid #DDD6FE;font-size:11px;font-weight:700;color:#5B21B6">🛡️ ${sumGroup}</span>`,
    sumAccts   && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#ECFDF5;border:1px solid #A7F3D0;font-size:11px;font-weight:700;color:#065F46">💳 ${sumAccts}</span>`,
    d.name     && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FFFBEB;border:1px solid #FDE68A;font-size:11px;font-weight:700;color:#92400E">📋 ${d.name}</span>`,
    sumPat     && `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FEF3C7;border:1px solid #FCD34D;font-size:11px;font-weight:700;color:#B45309">${sumPat}</span>`,
  ].filter(Boolean).join('');
  const summaryBar = (_policyWizardStep > 0 && summaryChips) ? `
<div style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px">
  <span style="font-size:10px;font-weight:900;color:#9CA3AF;white-space:nowrap;line-height:24px">현재 설정:</span>
  ${summaryChips}
</div>` : '';

  let stepContent = '';

  // ── Step 0: 범위 설정 (회사 → 격리그룹 → 예산계정) ────────────────────────────
  if (_policyWizardStep === 0) {
    const isPlatform = persona.role === 'platform_admin';
    const isTenant   = ['tenant_global_admin'].includes(persona.role);
    const isBudgetOp = ['budget_op_manager','budget_hq','budget_global_admin'].includes(persona.role);

    const _TENANTS_LIST = typeof TENANTS !== 'undefined' ? TENANTS
      : [...new Set((typeof SERVICE_POLICIES!=='undefined'?SERVICE_POLICIES:[]).map(p=>p.tenantId))].map(id=>({id,name:id}));
    const scopeTenantId = d.scopeTenantId || (isTenant||isBudgetOp ? persona.tenantId : '');
    const scopeGroups = (typeof ISOLATION_GROUPS!=='undefined' ? ISOLATION_GROUPS : [])
      .filter(g => scopeTenantId ? g.tenantId === scopeTenantId : true);
    const scopeGroupId = d.scopeGroupId || (isBudgetOp ? (persona.isolationGroupId||'') : '');
    const scopeGroup   = scopeGroups.find(g => g.id === scopeGroupId);
    const scopeAccts   = scopeGroupId
      ? ACCOUNT_MASTER.filter(a => a.active && (scopeGroup?.ownedAccounts||[]).includes(a.code))
      : [];

    stepContent = `
<div style="display:grid;gap:18px">
  <div style="padding:12px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;font-size:12px;color:#92400E">
    💡 정책이 적용될 <strong>회사 · 격리그룹 · 예산계정</strong>을 먼저 설정합니다. 이 설정이 정책의 모든 데이터 범위를 결정합니다.
  </div>
  ${isPlatform ? `
  <div>
    <label class="bo-label">회사 선택 <span style="color:#EF4444">*</span></label>
    <select onchange="_policyWizardData.scopeTenantId=this.value;_policyWizardData.scopeGroupId='';_policyWizardData.accountCodes=[];renderPolicyWizard()"
      style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700">
      <option value="">— 회사를 선택하세요 —</option>
      ${_TENANTS_LIST.map(t=>`<option value="${t.id}" ${scopeTenantId===t.id?'selected':''}>${t.name||t.id}</option>`).join('')}
    </select>
  </div>` : `
  <div style="padding:10px 16px;background:#F3F4F6;border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:700;color:#6B7280">회사</span>
    <span style="font-size:14px;font-weight:900;color:#111827">🏢 ${_TENANTS_LIST.find(t=>t.id===scopeTenantId)?.name||scopeTenantId}</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#E5E7EB;color:#6B7280">자동 설정</span>
  </div>`}
  ${scopeTenantId ? `
  <div>
    <label class="bo-label">${isBudgetOp?'담당 격리그룹':'격리그룹 선택'} <span style="color:#EF4444">*</span></label>
    ${isBudgetOp ? `
    <div style="padding:10px 16px;background:#EDE9FE;border:1.5px solid #C4B5FD;border-radius:10px;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">🔒</span>
      <span style="font-size:14px;font-weight:900;color:#7C3AED">${scopeGroups.find(g=>g.id===scopeGroupId)?.name||scopeGroupId}</span>
      <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#DDD6FE;color:#5B21B6">자동 고정</span>
    </div>` : `
    <div style="display:grid;gap:6px">
      ${scopeGroups.map(g=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${scopeGroupId===g.id?g.color||'#7C3AED':'#E5E7EB'};
                    background:${scopeGroupId===g.id?(g.bg||'#F5F3FF'):'white'};cursor:pointer"
             onclick="_policyWizardData.scopeGroupId='${g.id}';_policyWizardData.accountCodes=[];_policyWizardData.budgetLinked=true;renderPolicyWizard()">
        <input type="radio" name="wiz-group" ${scopeGroupId===g.id?'checked':''} style="margin:0;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${scopeGroupId===g.id?(g.color||'#7C3AED'):'#374151'}">${g.name}</div>
          <div style="font-size:11px;color:#9CA3AF">${g.desc||''}</div>
        </div>
      </label>`).join('')}
    </div>`}
  </div>` : ''}
  ${scopeGroupId && scopeAccts.length ? `
  <div>
    <label class="bo-label">예산 계정 선택 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:6px">
      ${scopeAccts.map(a=>`
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${(d.accountCodes||[])[0]===a.code?'#1D4ED8':'#E5E7EB'};
                    background:${(d.accountCodes||[])[0]===a.code?'#EFF6FF':'white'};cursor:pointer"
             onclick="_selectPolicyAcct('${a.code}')">
        <input type="radio" name="wiz-acct" ${(d.accountCodes||[])[0]===a.code?'checked':''} style="margin:0;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${(d.accountCodes||[])[0]===a.code?'#1E40AF':'#374151'}">
            ${a.code==='COMMON-FREE'?'📝 ':a.budgetLinked===false?'':'💳 '}${a.name}
          </div>
          <div style="font-size:11px;color:#9CA3AF">${a.desc||''}</div>
        </div>
        ${(d.accountCodes||[])[0]===a.code?`<span style="margin-left:auto;font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#1D4ED8;color:white">선택됨</span>`:''}
      </label>`).join('')}
    </div>
    ${(d.accountCodes||[])[0] ? `
    <div style="margin-top:8px;padding:10px 16px;background:${d.budgetLinked?'#EFF6FF':'#F0FDF4'};border-radius:10px;font-size:12px;color:${d.budgetLinked?'#1E40AF':'#065F46'}">
      ${d.budgetLinked?'💳 <strong>예산 연동</strong> — 선택한 계정에서 예산을 집행합니다.':'📝 <strong>무예산</strong> — 예산 차감 없이 이력 관리합니다.'}
    </div>` : ''}
  </div>` : scopeGroupId ? `
  <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF;font-size:12px">
    선택한 격리그룹에 연결된 예산 계정이 없습니다.
  </div>` : ''}
</div>`;

  // ── Step 1: 정책명 + 대상자 ──────────────────────────────────────────────────
  } else if (_policyWizardStep === 1) {
    stepContent = `
<div style="display:grid;gap:18px">
  <div>
    <label class="bo-label">정책명 <span style="color:#EF4444">*</span></label>
    <input id="wiz-name" type="text" value="${d.name||''}" placeholder='예: "HAE 전사교육예산 정규교육 지원정책"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">정책 설명</label>
    <input id="wiz-desc" type="text" value="${d.desc||''}" placeholder='학습자에게 표시될 설명'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">대상자 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        { v:'learner',  icon:'👤', l:'학습자용',       d:'개인 학습자가 교육비를 신청하는 서비스' },
        { v:'operator', icon:'👔', l:'교육담당자용',   d:'교육담당자가 운영하는 집합·이러닝·외부행사' },
      ].map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.targetType===o.v?'#7C3AED':'#E5E7EB'};
                    background:${d.targetType===o.v?'#F5F3FF':'white'};cursor:pointer"
             onclick="_wizSaveStep1Inputs();_policyWizardData.targetType='${o.v}';_policyWizardData.purpose='';_policyWizardData.eduTypes=[];renderPolicyWizard()">
        <input type="radio" name="wiz-target" value="${o.v}" ${d.targetType===o.v?'checked':''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.targetType===o.v?'#7C3AED':'#374151'}">${o.icon} ${o.l}</div>
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
    대상: <strong>${d.targetType==='learner'?'👤 학습자용':'👔 교육담당자용'}</strong>
  </div>
  <label class="bo-label">교육 목적 <span style="color:#EF4444">*</span></label>
  ${purposes.map(p=>`
  <label style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;
                border:2px solid ${d.purpose===p.id?'#7C3AED':'#E5E7EB'};
                background:${d.purpose===p.id?'#F5F3FF':'white'};cursor:pointer"
         onclick="_policyWizardData.purpose='${p.id}';_policyWizardData.eduTypes=[];renderPolicyWizard()">
    <input type="radio" name="wiz-purpose" value="${p.id}" ${d.purpose===p.id?'checked':''} style="margin:0">
    <span style="font-size:13px;font-weight:800;color:${d.purpose===p.id?'#7C3AED':'#374151'}">${p.label}</span>
  </label>`).join('')}
</div>`;

  // ── Step 3: 교육유형 ───────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 3) {
    const types = _EDU_TYPE_MAP[d.purpose] || [];
    if (!d.eduSubTypes) d.eduSubTypes = {};
    const isPersonal = d.purpose === 'external_personal';
    // 개인직무사외학습: selectedEduItem = {typeId, subId}  (단독 선택)
    if (!d.selectedEduItem) d.selectedEduItem = null;

    const purposeLabel = [...(_PURPOSE_MAP.learner||[]),...(_PURPOSE_MAP.operator||[])].find(x=>x.id===d.purpose)?.label||d.purpose;

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
      <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId===t.id&&!d.selectedEduItem?.subId?'checked':''} style="margin:0;flex-shrink:0">
      <span style="font-size:13px;font-weight:800;color:${d.selectedEduItem?.typeId===t.id?'#7C3AED':'#374151'}">${t.label}</span>
    </label>
  </div>`;
    return `
  <div style="border-radius:10px;border:1.5px solid #E5E7EB;overflow:hidden">
    <div style="padding:10px 16px;background:#F9FAFB;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:900;color:#374151">${t.label}</span>
      <span style="font-size:10px;color:#9CA3AF">${t.subs.map(s=>s.label).join(' · ')}</span>
    </div>
    <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px">
      ${t.subs.map(s=>`
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;
                    border:1.5px solid ${d.selectedEduItem?.typeId===t.id&&d.selectedEduItem?.subId===s.id?'#7C3AED':'#E5E7EB'};
                    background:${d.selectedEduItem?.typeId===t.id&&d.selectedEduItem?.subId===s.id?'#F5F3FF':'white'};cursor:pointer"
             onclick="_selectEduItem('${t.id}','${s.id}')">
        <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId===t.id&&d.selectedEduItem?.subId===s.id?'checked':''} style="margin:0">
        <span style="font-size:13px;font-weight:700;color:${d.selectedEduItem?.typeId===t.id&&d.selectedEduItem?.subId===s.id?'#7C3AED':'#374151'}">${s.label}</span>
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
    ${types.map(t=>{
      const isChecked = (d.eduTypes||[]).includes(t.id);
      return `
    <div style="border-radius:10px;border:1.5px solid ${isChecked?'#7C3AED':'#E5E7EB'};background:${isChecked?'#F5F3FF':'white'};overflow:hidden">
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer" onclick="_toggleEduType('${t.id}')">
        <input type="checkbox" ${isChecked?'checked':''} style="margin:0;flex-shrink:0">
        <div style="font-size:13px;font-weight:800;color:${isChecked?'#7C3AED':'#374151'}">${t.label}</div>
      </label>
    </div>`;
    }).join('')}
  </div>
</div>`;
    }

  // ── Step 4: 패턴 ─────────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 4) {
    const isNoBudget = !d.budgetLinked;
    const selAcctName = (d.accountCodes||[]).map(c => ACCOUNT_MASTER.find(a=>a.code===c)?.name||c).join(', ') || '—';
    const budgetedPatterns = [
      { v:'A', icon:'📊', l:'패턴A: 계획→신청→결과', color:'#7C3AED', d:'고통제형. R&D·대규모 집합교육. 사전계획 필수, 예산 가점유 후 실차감.' },
      { v:'B', icon:'📝', l:'패턴B: 신청→결과',       color:'#1D4ED8', d:'자율신청형. 일반 사외교육 참가. 신청 승인 시 가점유, 결과 후 실차감.' },
      { v:'C', icon:'🧾', l:'패턴C: 결과 단독(후정산)',color:'#D97706', d:'선지불 후정산. 개인 카드 결제 후 영수증 첨부. 승인 즉시 예산 차감.' },
    ];
    const noBudgetPatterns = [
      { v:'D', icon:'📋', l:'패턴D: 신청 단독(이력)',      color:'#6B7280', d:'무예산 이력관리. 무료 웨비나·자체세미나. 승인 시 즉시 이력 DB 적재.' },
      { v:'E', icon:'✅', l:'패턴E: 신청→결과(이력+결과)', color:'#059669', d:'무예산이지만 결과보고까지 진행. 자비학습 후 결과 제출 필요한 경우.' },
    ];
    const patterns = isNoBudget ? noBudgetPatterns : budgetedPatterns;

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:${isNoBudget?'#F0FDF4':'#EFF6FF'};border:1px solid ${isNoBudget?'#A7F3D0':'#BFDBFE'};border-radius:10px;display:flex;align-items:center;gap:10px;font-size:12px">
    ${isNoBudget ? '📝 <strong style="color:#065F46">무예산</strong>' : '💳 <strong style="color:#1E40AF">예산 연동</strong>'}
    <span style="color:#6B7280">|</span>
    <span style="color:#374151;font-weight:700">${selAcctName}</span>
    <span style="font-size:10px;color:#9CA3AF;margin-left:4px">(Step 1에서 설정됨)</span>
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px">
      ${patterns.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.processPattern===o.v?o.color:'#E5E7EB'};background:${d.processPattern===o.v?o.color+'15':'white'};cursor:pointer"
             onclick="_policyWizardData.processPattern='${o.v}';_setPatternDefaults('${o.v}');renderPolicyWizard()">
        <input type="radio" name="wiz-pattern" value="${o.v}" ${d.processPattern===o.v?'checked':''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.processPattern===o.v?o.color:'#374151'}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>
</div>`;

  // ── Step 5: 대상 조직 ─────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 5) {
    // scopeTenantId + scopeGroupId 기반 필터 (persona.tenantId가 아닌 정책 선택 기준)
    const scopeTenantId = d.scopeTenantId || persona.tenantId;
    const scopeGroupId  = d.scopeGroupId  || '';
    const tpls = (typeof VIRTUAL_ORG_TEMPLATES !== 'undefined' ? VIRTUAL_ORG_TEMPLATES : [])
      .filter(t => {
        const tTenantId = t.tenantId || t.tenant_id;
        const tGroupId  = t.isolationGroupId || t.isolation_group_id;
        if (tTenantId !== scopeTenantId) return false;
        if (scopeGroupId && tGroupId && tGroupId !== scopeGroupId) return false;
        return true;
      });
    stepContent = `
<div>
  <label class="bo-label">가상조직 템플릿 연결 <span style="color:#EF4444">*</span></label>
  <div style="display:grid;gap:8px">
    ${tpls.map(t=>`
    <label style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;border:2px solid ${d.vorgTemplateId===t.id?'#059669':'#E5E7EB'};background:${d.vorgTemplateId===t.id?'#F0FDF4':'white'};cursor:pointer"
           onclick="_policyWizardData.vorgTemplateId='${t.id}';renderPolicyWizard()">
      <input type="radio" ${d.vorgTemplateId===t.id?'checked':''} style="margin:0">
      <div>
        <div style="font-weight:700;font-size:13px">🏢 ${t.name}</div>
        <div style="font-size:11px;color:#6B7280">
          ${(t.tree.hqs||t.tree.centers||[]).map(g=>`${g.name}(${(g.teams||[]).length}팀)`).join(' · ')}
        </div>
      </div>
    </label>`).join('')}
  </div>
</div>`;

  // ── Step 6: 단계별 양식 선택 ──────────────────────────────────────────────────
  } else if (_policyWizardStep === 6) {
    const myForms = FORM_MASTER.filter(f => f.tenantId === persona.tenantId && f.active);
    const stages = _PATTERN_STAGES[d.processPattern] || ['apply'];
    const stageLabel = { plan:'📊 계획', apply:'📝 신청', result:'📄 결과' };
    const stageColor = { plan:'#7C3AED', apply:'#1D4ED8', result:'#059669' };
    if (!d.stageFormIds) d.stageFormIds = { plan:[], apply:[], result:[] };
    const activeStageTab = _policyWizardData._formTab || stages[0];

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px">
    <div style="font-size:11px;font-weight:900;color:#5B21B6;margin-bottom:4px">📌 패턴 ${d.processPattern} 구성 단계</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      ${stages.map(s=>`<span style="padding:4px 10px;border-radius:6px;background:${stageColor[s]}18;color:${stageColor[s]};font-size:11px;font-weight:700">${stageLabel[s]}</span>`).join('<span style="color:#9CA3AF">+</span>')}
    </div>
  </div>
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:12px">
    ${stages.map(s=>`
    <button onclick="_policyWizardData._formTab='${s}';renderPolicyWizard()"
      style="padding:8px 16px;font-size:12px;font-weight:700;border:none;border-bottom:3px solid ${activeStageTab===s?stageColor[s]:'transparent'};background:none;cursor:pointer;color:${activeStageTab===s?stageColor[s]:'#6B7280'}">
      ${stageLabel[s]} 양식
    </button>`).join('')}
  </div>
  <div>
    <label class="bo-label">${stageLabel[activeStageTab]} 단계 양식 선택</label>
    <div style="display:grid;gap:6px">
      ${myForms.map(f=>`
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;border:1.5px solid ${(d.stageFormIds[activeStageTab]||[]).includes(f.id)?stageColor[activeStageTab]:'#E5E7EB'};background:${(d.stageFormIds[activeStageTab]||[]).includes(f.id)?stageColor[activeStageTab]+'12':'white'};cursor:pointer"
             onclick="toggleStageForm('${activeStageTab}','${f.id}')">
        <input type="checkbox" ${(d.stageFormIds[activeStageTab]||[]).includes(f.id)?'checked':''} style="margin:0">
        <div><div style="font-weight:700;font-size:12px">${f.name}</div><div style="font-size:10px;color:#9CA3AF">${f.type} · ${f.desc||''}</div></div>
      </label>`).join('')}
    </div>
  </div>
</div>`;

  // ── Step 7: 단계별 결재라인 ────────────────────────────────────────────────────
  } else if (_policyWizardStep === 7) {
    const stages = _PATTERN_STAGES[d.processPattern] || ['apply'];
    const stageLabel = { plan:'📊 계획', apply:'📝 신청', result:'📄 결과' };
    const stageColor = { plan:'#7C3AED', apply:'#1D4ED8', result:'#059669' };
    if (!d.approvalConfig) d.approvalConfig = { plan:{thresholds:[],finalApproverKey:''}, apply:{thresholds:[],finalApproverKey:''}, result:{thresholds:[],finalApproverKey:''} };
    const activeStage = _policyWizardData._approvalTab || stages[0];
    const cfg = d.approvalConfig[activeStage] || { thresholds:[], finalApproverKey:'' };
    const tenantPersonas = Object.entries(BO_PERSONAS)
      .filter(([k,p]) => p.tenantId === persona.tenantId)
      .map(([k,p]) => ({key:k, p}));

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E">
    💡 각 단계(계획/신청/결과)별로 결재라인을 별도 설정할 수 있습니다. 단계별 결재자를 다르게 지정하거나 금액 구간을 독립 설정하세요.
  </div>
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB">
    ${stages.map(s=>`
    <button onclick="_policyWizardData._approvalTab='${s}';renderPolicyWizard()"
      style="padding:8px 16px;font-size:12px;font-weight:700;border:none;border-bottom:3px solid ${activeStage===s?stageColor[s]:'transparent'};background:none;cursor:pointer;color:${activeStage===s?stageColor[s]:'#6B7280'}">
      ${stageLabel[s]} 결재
    </button>`).join('')}
  </div>
  <div style="display:grid;gap:12px">
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <label class="bo-label" style="margin:0">${stageLabel[activeStage]} 금액 구간별 결재자</label>
        <button onclick="_addStageThreshold('${activeStage}')" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid ${stageColor[activeStage]};color:${stageColor[activeStage]};background:white;cursor:pointer;font-weight:700">+ 구간 추가</button>
      </div>
      <div id="threshold-list-${activeStage}" style="display:grid;gap:8px">
        ${cfg.thresholds.length === 0 ? `
        <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF;font-size:12px">
          구간 없음 — 모든 신청이 최종 결재자에게 바로 배달됩니다.<br>
          <button onclick="_addStageThreshold('${activeStage}')" style="margin-top:10px;font-size:12px;padding:6px 14px;border-radius:8px;border:1.5px solid ${stageColor[activeStage]};color:${stageColor[activeStage]};background:white;cursor:pointer;font-weight:700">+ 구간 추가</button>
        </div>` :
        cfg.thresholds.map((t,i) => `
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;padding:12px 14px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:10px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">최대 금액 (원)</label>
            <input type="number" value="${t.maxAmt||''}" placeholder="예: 1000000"
              onchange="_policyWizardData.approvalConfig['${activeStage}'].thresholds[${i}].maxAmt=Number(this.value)"
              style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;box-sizing:border-box"/>
            <div style="font-size:10px;color:#9CA3AF;margin-top:3px">${t.maxAmt?(t.maxAmt/10000)+'만원 이하':'금액 입력'}</div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">결재 담당자</label>
            <select onchange="_policyWizardData.approvalConfig['${activeStage}'].thresholds[${i}].approverKey=this.value"
              style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700">
              <option value="">— 선택 —</option>
              ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${t.approverKey===key?'selected':''}>${p.name} (${p.dept})</option>`).join('')}
            </select>
          </div>
          <button onclick="_removeStageThreshold('${activeStage}',${i})" style="padding:8px 12px;border-radius:8px;border:1.5px solid #FCA5A5;color:#DC2626;background:white;cursor:pointer;font-size:12px;font-weight:700;height:38px">삭제</button>
        </div>`).join('')}
      </div>
    </div>
    <div>
      <label class="bo-label">${stageLabel[activeStage]} 최종 결재자 <span style="color:#EF4444">*</span></label>
      <select id="wiz-final-approver-${activeStage}"
        onchange="_policyWizardData.approvalConfig['${activeStage}'].finalApproverKey=this.value"
        style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
        <option value="">— 선택 —</option>
        ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${cfg.finalApproverKey===key?'selected':''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
      </select>
    </div>
    <div>
      <label class="bo-label">정책 관리자</label>
      <select id="wiz-manager" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
        <option value="">— 선택 —</option>
        ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${d.managerPersonaKey===key?'selected':''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
      </select>
    </div>
    <div>
      <label class="bo-label">정책 운영 상태</label>
      <div style="display:flex;gap:8px">
        ${['active','paused'].map(s=>`
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:2px solid ${d.status===s?'#059669':'#E5E7EB'};background:${d.status===s?'#F0FDF4':'white'};cursor:pointer"
               onclick="_policyWizardData.status='${s}';renderPolicyWizard()">
          <input type="radio" ${d.status===s?'checked':''} style="margin:0">
          <span style="font-weight:700;font-size:13px">${s==='active'?'✅ 운영 중':'⏸️ 중지'}</span>
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
    <h1 class="bo-page-title" style="margin:0">${_editPolicyId?'정책 수정':'새 정책 만들기'}</h1>
  </div>
  <div style="display:flex;align-items:flex-start;gap:0;margin-bottom:28px;overflow-x:auto;padding-bottom:4px">${stepBar}</div>
  ${summaryBar}
  <div class="bo-card" style="padding:24px;margin-bottom:16px">${stepContent}</div>
  <div style="display:flex;justify-content:space-between">
    <button onclick="${_policyWizardStep>0?'_policyWizardStep--;renderPolicyWizard()':'renderServicePolicy()'}"
      style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;font-size:13px;cursor:pointer">
      ${_policyWizardStep>0?'← 이전':'취소'}
    </button>
    <button onclick="${_policyWizardStep<TOTAL?'advancePolicyWizard()':'savePolicy()'}" class="bo-btn-primary" style="padding:10px 24px">
      ${_policyWizardStep<TOTAL?'다음 →':'✅ 정책 저장'}
    </button>
  </div>
</div>`;
}

// ── 헬퍼 함수들 ───────────────────────────────────────────────────────────────
function _toggleEduType(id) {
  const arr = _policyWizardData.eduTypes || [];
  const i = arr.indexOf(id);
  if (i>=0) {
    arr.splice(i,1);
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
  if (i>=0) arr.splice(i,1); else arr.push(subId);
  renderPolicyWizard();
}
function _addStageThreshold(stage) {
  if (!_policyWizardData.approvalConfig) _policyWizardData.approvalConfig = {};
  if (!_policyWizardData.approvalConfig[stage]) _policyWizardData.approvalConfig[stage] = { thresholds:[], finalApproverKey:'' };
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
  if (n    !== undefined) _policyWizardData.name = n.trim();
  if (desc !== undefined) _policyWizardData.desc = desc.trim();
}
window._wizSaveStep1Inputs = _wizSaveStep1Inputs;

function advancePolicyWizard() {
  const d = _policyWizardData;
  if (_policyWizardStep === 0) {
    const d = _policyWizardData;
    if (!d.scopeTenantId) { alert('회사를 선택하세요.'); return; }
    if (!d.scopeGroupId)  { alert('격리그룹을 선택하세요.'); return; }
    if (!(d.accountCodes||[]).length) { alert('예산 계정을 선택하세요.'); return; }
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
      if (!(d.eduTypes||[]).length) { alert('교육 유형을 하나 이상 선택하세요.'); return; }
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
      id:                  d.id,
      tenant_id:           d.tenantId || d.scopeTenantId,
      isolation_group_id:  d.isolationGroupId || d.scopeGroupId || null,
      scope_tenant_id:     d.scopeTenantId || null,
      scope_group_id:      d.scopeGroupId || null,
      name:                d.name,
      descr:               d.desc || d.descr || null,
      target_type:         d.targetType || null,
      purpose:             d.purpose || null,
      edu_types:           d.eduTypes || [],
      selected_edu_item:   d.selectedEduItem || null,
      process_pattern:     d.processPattern || null,
      flow:                d.flow || null,
      budget_linked:       d.budgetLinked !== false,
      apply_mode:          d.applyMode || null,
      account_codes:       d.accountCodes || [],
      vorg_template_id:    d.vorgTemplateId || null,
      stage_form_ids:      d.stageFormIds || d.formSets || null,
      approval_config:     d.approvalConfig || null,
      manager_persona_key: d.managerPersonaKey || null,
      status:              'active',
    };
    try {
      await sbSaveServicePolicy(dbRow);
    } catch(e) {
      console.warn('[PolicyBuilder] DB 저장 실패 - 메모리에만 저장됨:', e.message);
      alert('⚠️ 정책이 임시 저장됐습니다. (DB 저장 실패 - 새로고침 시 초기화될 수 있습니다)');
    }
  }

  const ap = BO_PERSONAS[applyFinalKey];
  alert(`✅ 정책 저장 완료!\n\n📋 ${d.name}\n🔄 패턴 ${d.processPattern}\n✅ 신청 최종 결재자: ${ap?.name||'—'}\n\n이제 학습자 신청 시 [나의 운영 업무]에 자동 배달됩니다.`);
  renderServicePolicy();
}

// ── 헬퍼: 계정·양식·스테이지 폼 토글 ────────────────────────────────────────
function togglePolicyAcct(code) {
  const arr = _policyWizardData.accountCodes;
  const i = arr.indexOf(code);
  if (i>=0) arr.splice(i,1); else arr.push(code);
  renderPolicyWizard();
}
function _selectPolicyAcct(code) {
  const isNoBudget = code === '__none__';
  _policyWizardData.accountCodes = isNoBudget ? [] : [code];
  _policyWizardData.budgetLinked = !isNoBudget;
  // 패턴 자동 보정: 예산↔무예산 전환 시 패턴 리셋
  const pat = _policyWizardData.processPattern || '';
  const isBudgetedPat = ['A','B','C'].includes(pat);
  const isNoBudgetPat = ['D','E'].includes(pat);
  if (isNoBudget && isBudgetedPat) _policyWizardData.processPattern = 'D';
  if (!isNoBudget && isNoBudgetPat) _policyWizardData.processPattern = 'B';
  renderPolicyWizard();
}
function toggleStageForm(stage, id) {
  if (!_policyWizardData.stageFormIds) _policyWizardData.stageFormIds = { plan:[], apply:[], result:[] };
  if (!_policyWizardData.stageFormIds[stage]) _policyWizardData.stageFormIds[stage] = [];
  const arr = _policyWizardData.stageFormIds[stage];
  const i = arr.indexOf(id);
  if (i>=0) arr.splice(i,1); else arr.push(id);
  _policyWizardData._formTab = stage;
  renderPolicyWizard();
}
function togglePolicyForm(id) {
  const arr = _policyWizardData.formIds || [];
  const i = arr.indexOf(id);
  if (i>=0) arr.splice(i,1); else arr.push(id);
  _policyWizardData.formIds = arr;
  renderPolicyWizard();
}
function togglePolicyLType(t) {
  const arr = _policyWizardData.allowedLearningTypes || [];
  const i = arr.indexOf(t);
  if (i>=0) arr.splice(i,1); else arr.push(t);
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

