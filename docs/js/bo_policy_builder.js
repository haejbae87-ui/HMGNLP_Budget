// ─── 🔧 서비스 정책 관리 ─────────────────────────────────────────────────────
// 7단계 위저드: 대상자 → 목적 → 교육유형 → 예산+패턴 → 대상조직 → 양식 → 단계별결재라인

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;

// ── 패턴 메타 (E 추가) ────────────────────────────────────────────────────────
const _PATTERN_META = {
  A:{ label:'패턴A: 계획→신청→결과', color:'#7C3AED', icon:'📊', flow:'plan-apply-result', applyMode:'holding',        budgetLinked:true  },
  B:{ label:'패턴B: 신청→결과',       color:'#1D4ED8', icon:'📝', flow:'apply-result',      applyMode:'holding',        budgetLinked:true  },
  C:{ label:'패턴C: 신청 단독(후정산)',color:'#D97706', icon:'🧾', flow:'result-only',       applyMode:'reimbursement', budgetLinked:true  },
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

  const TENANTS = typeof TENANT_MASTER !== 'undefined' ? TENANT_MASTER
    : [...new Set(SERVICE_POLICIES.map(p=>p.tenantId))].map(id=>({id,name:id}));
  const availGroups = (typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS : [])
    .filter(g => !activeTenantId || g.tenantId === activeTenantId);
  const availAccounts = ACCOUNT_MASTER.filter(a => {
    if (!a.active) return false;
    if (activeTenantId && a.tenantId !== activeTenantId) return false;
    if (pbGroupId && a.isolationGroupId && a.isolationGroupId !== pbGroupId) return false;
    return true;
  });

  const filterBar = (isPlatform || isTenant || isBudgetOp || isBudgetAdmin) ? `
<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-end">
  ${isPlatform ? `<div>
    <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">회사</label>
    <select onchange="_pbTenantFilter=this.value;_pbGroupFilter='';_pbAccountFilter='';renderServicePolicy()"
      style="padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
      <option value="">전체 회사</option>
      ${TENANTS.map(t=>`<option value="${t.id}" ${activeTenantId===t.id?'selected':''}>${t.name||t.id}</option>`).join('')}
    </select>
  </div>` : ''}
  ${isBudgetOp ? `
  <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:#EDE9FE;border:1.5px solid #C4B5FD;border-radius:8px">
    <span style="font-size:11px;font-weight:800;color:#7C3AED">🔒 담당 격리그룹</span>
    <span style="font-size:12px;font-weight:900;color:#5B21B6">${(typeof ISOLATION_GROUPS!=='undefined'?ISOLATION_GROUPS:[]).find(g=>g.id===pbGroupId)?.name || pbGroupId || '전체'}</span>
  </div>` : `<div>
    <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">교육 격리그룹</label>
    <select onchange="_pbGroupFilter=this.value;_pbAccountFilter='';renderServicePolicy()"
      style="padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
      <option value="">전체 그룹</option>
      ${availGroups.map(g=>`<option value="${g.id}" ${pbGroupId===g.id?'selected':''}>${g.name}</option>`).join('')}
    </select>
  </div>`}
  <div>
    <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">예산 계정</label>
    <select onchange="_pbAccountFilter=this.value;renderServicePolicy()"
      style="padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;min-width:140px">
      <option value="">전체 계정</option>
      ${availAccounts.map(a=>`<option value="${a.code}" ${_pbAccountFilter===a.code?'selected':''}>${a.name}</option>`).join('')}
    </select>
  </div>
  ${!isBudgetOp ? `<button onclick="_pbTenantFilter='';_pbGroupFilter='';_pbAccountFilter='';renderServicePolicy()"
    style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px;font-weight:700;background:white;cursor:pointer">초기화</button>` : ''}
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
      name: '', desc: '',
      targetType: '',    // 'learner' | 'operator'
      purpose: '',       // purpose id
      eduTypes: [],      // selected edu type ids
      processPattern: '', flow: 'apply-result',
      budgetLinked: true, applyMode: 'holding',
      accountCodes: [], vorgTemplateId: '',
      formIds: [],
      approvalConfig: {
        plan:   { thresholds: [], finalApproverKey: '' },
        apply:  { thresholds: [], finalApproverKey: '' },
        result: { thresholds: [], finalApproverKey: '' },
      },
      managerPersonaKey: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '',
      status: 'active', createdAt: new Date().toISOString().slice(0,10),
    };
  }
  renderPolicyWizard();
}

// ── 위저드 렌더링 ─────────────────────────────────────────────────────────────
function renderPolicyWizard() {
  const el = document.getElementById('bo-content');
  const steps = ['대상자', '목적', '교육유형', '예산·패턴', '대상조직', '양식', '결재라인'];
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

  let stepContent = '';

  // ── Step 1: 정책명 + 대상자 ──────────────────────────────────────────────────
  if (_policyWizardStep === 0) {
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
             onclick="_policyWizardData.targetType='${o.v}';_policyWizardData.purpose='';_policyWizardData.eduTypes=[];renderPolicyWizard()">
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
  } else if (_policyWizardStep === 1) {
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
  } else if (_policyWizardStep === 2) {
    const types = _EDU_TYPE_MAP[d.purpose] || [];
    if (!d.eduSubTypes) d.eduSubTypes = {};
    stepContent = `
<div style="display:grid;gap:10px">
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;font-size:12px;color:#5B21B6">
    목적: <strong>${[..._PURPOSE_MAP.learner,..._PURPOSE_MAP.operator].find(x=>x.id===d.purpose)?.label||d.purpose}</strong>
  </div>
  <label class="bo-label">교육 유형 <span style="font-size:10px;color:#9CA3AF">(복수 선택 가능 · 세부 항목 개별 선택)</span></label>
  <div style="display:grid;gap:6px">
    ${types.map(t=>{
      const isChecked = (d.eduTypes||[]).includes(t.id);
      const subRows = isChecked && t.subs.length ? `
        <div style="margin:4px 0 0 32px;display:flex;flex-wrap:wrap;gap:6px">
          ${t.subs.map(s=>`
          <label style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:7px;
                        border:1.5px solid ${(d.eduSubTypes[t.id]||[]).includes(s.id)?'#7C3AED':'#D1D5DB'};
                        background:${(d.eduSubTypes[t.id]||[]).includes(s.id)?'#F5F3FF':'#F9FAFB'};cursor:pointer"
                 onclick="event.stopPropagation();_toggleEduSubType('${t.id}','${s.id}')">
            <input type="checkbox" ${(d.eduSubTypes[t.id]||[]).includes(s.id)?'checked':''} style="margin:0">
            <span style="font-size:11px;font-weight:700;color:${(d.eduSubTypes[t.id]||[]).includes(s.id)?'#7C3AED':'#6B7280'}">${s.label}</span>
          </label>`).join('')}
        </div>` : '';
      return `
    <div style="border-radius:10px;border:1.5px solid ${isChecked?'#7C3AED':'#E5E7EB'};background:${isChecked?'#F5F3FF':'white'};overflow:hidden">
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer" onclick="_toggleEduType('${t.id}')">
        <input type="checkbox" ${isChecked?'checked':''} style="margin:0;flex-shrink:0">
        <div style="font-size:13px;font-weight:800;color:${isChecked?'#7C3AED':'#374151'}">${t.label}</div>
        ${!isChecked && t.subs.length ? `<div style="font-size:11px;color:#9CA3AF;margin-left:2px">(${t.subs.map(s=>s.label).join(' · ')})</div>` : ''}
      </label>
      ${subRows ? `<div style="padding:0 14px 12px">${subRows}</div>` : ''}
    </div>`;
    }).join('')}
  </div>
</div>`;

  // ── Step 4: 예산 계정 + 패턴 ──────────────────────────────────────────────────
  } else if (_policyWizardStep === 3) {
    const myAccts = ACCOUNT_MASTER.filter(a => a.tenantId === persona.tenantId && a.active && a.code !== 'COMMON-FREE');
    // 예산 미사용 특수 항목 추가
    const acctList = [
      ...myAccts,
      { code: '__none__', name: '예산 미사용', desc: '이력만 등록하거나 무예산 결과까지 진행 (패턴D/E)', budgetLinked: false },
    ];
    // 현재 선택된 계정이 무예산인지 판별
    const selCode   = (d.accountCodes||[])[0] || '';
    const isNoBudget = selCode === '__none__' || (!selCode && d.budgetLinked === false);
    const budgetedPatterns = [
      { v:'A', icon:'📊', l:'패턴A: 계획→신청→결과', color:'#7C3AED', d:'고통제형. R&D·대규모 집합교육. 사전계획 필수, 예산 가점유 후 실차감.' },
      { v:'B', icon:'📝', l:'패턴B: 신청→결과',      color:'#1D4ED8', d:'자율신청형. 일반 사외교육 참가. 신청 승인 시 가점유, 결과 후 실차감.' },
      { v:'C', icon:'🧾', l:'패턴C: 신청 단독(후정산)', color:'#D97706', d:'선지불 후정산. 개인 카드 결제 후 영수증 첨부. 승인 즉시 예산 차감.' },
    ];
    const noBudgetPatterns = [
      { v:'D', icon:'📋', l:'패턴D: 신청 단독(이력)', color:'#6B7280', d:'무예산 이력관리. 무료 웨비나·자체세미나. 승인 시 즉시 이력 DB 적재.' },
      { v:'E', icon:'✅', l:'패턴E: 신청→결과(이력+결과)', color:'#059669', d:'무예산이지만 결과보고까지 진행. 자비학습 후 결과 제출 필요한 경우.' },
    ];
    const patterns = isNoBudget ? noBudgetPatterns : budgetedPatterns;

    stepContent = `
<div style="display:grid;gap:16px">
  <div>
    <label class="bo-label">예산 계정 선택 <span style="color:#EF4444">*</span><span style="font-size:10px;color:#9CA3AF;margin-left:6px">계정 선택에 따라 패턴이 자동 결정됩니다</span></label>
    <div style="display:grid;gap:6px">
      ${acctList.map(a=>`
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${selCode===a.code?'#1D4ED8':'#E5E7EB'};
                    background:${selCode===a.code?'#EFF6FF':'white'};cursor:pointer;
                    ${a.code==='__none__'?'margin-top:4px;border-style:dashed':''}"
             onclick="_selectPolicyAcct('${a.code}')">
        <input type="radio" name="wiz-acct" value="${a.code}" ${selCode===a.code?'checked':''} style="margin:0;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${selCode===a.code?'#1E40AF':'#374151'}">${a.code==='__none__'?'📝 ':a.budgetLinked===false?'':'💳 '}${a.name}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${a.desc||''}</div>
        </div>
        ${selCode===a.code?`<span style="margin-left:auto;font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#1D4ED8;color:white">선택됨</span>`:''}
      </label>`).join('')}
    </div>
  </div>
  ${selCode ? `
  <div style="padding:10px 16px;background:${isNoBudget?'#F0FDF4':'#EFF6FF'};border-radius:10px;border:1.5px solid ${isNoBudget?'#A7F3D0':'#BFDBFE'};font-size:12px;color:${isNoBudget?'#065F46':'#1E40AF'}">
    ${isNoBudget ? '📝 <strong>무예산</strong> — 예산 차감 없이 이력 관리 패턴을 사용합니다.' : '💳 <strong>예산 연동</strong> — 선택한 계정에서 예산을 집행합니다.'}
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px">
      ${patterns.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${d.processPattern===o.v?o.color:'#E5E7EB'};background:${d.processPattern===o.v?o.color+'15':'white'};cursor:pointer"
             onclick="_policyWizardData.processPattern='${o.v}';_setPatternDefaults('${o.v}');renderPolicyWizard()">
        <input type="radio" name="wiz-pattern" value="${o.v}" ${d.processPattern===o.v?'checked':''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:12px;color:${d.processPattern===o.v?o.color:'#374151'}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>` : `
  <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF;font-size:13px">
    ↑ 예산 계정을 먼저 선택하면 패턴이 표시됩니다.
  </div>`}
</div>`;

  // ── Step 5: 대상 조직 ─────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 4) {
    const tpls = VIRTUAL_ORG_TEMPLATES.filter(t => t.tenantId === persona.tenantId);
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
  } else if (_policyWizardStep === 5) {
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
  } else if (_policyWizardStep === 6) {
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

// ── 위저드 진행 ───────────────────────────────────────────────────────────────
function advancePolicyWizard() {
  const d = _policyWizardData;
  if (_policyWizardStep === 0) {
    const n = document.getElementById('wiz-name')?.value?.trim();
    if (!n) { alert('정책명을 입력하세요.'); return; }
    d.name = n;
    const desc = document.getElementById('wiz-desc')?.value?.trim();
    if (desc) d.desc = desc;
    if (!d.targetType) { alert('대상자를 선택하세요.'); return; }
  } else if (_policyWizardStep === 1) {
    if (!d.purpose) { alert('교육 목적을 선택하세요.'); return; }
  } else if (_policyWizardStep === 2) {
    if (!(d.eduTypes||[]).length) { alert('교육 유형을 하나 이상 선택하세요.'); return; }
  } else if (_policyWizardStep === 3) {
    if (d.budgetLinked && !(d.accountCodes||[]).length) { alert('예산 계정을 선택하세요.'); return; }
    if (!d.processPattern) { alert('프로세스 패턴을 선택하세요.'); return; }
  }
  _policyWizardStep = Math.min(_policyWizardStep + 1, 6);
  renderPolicyWizard();
}

// ── 정책 저장 ─────────────────────────────────────────────────────────────────
function savePolicy() {
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

  const idx = SERVICE_POLICIES.findIndex(p => p.id === d.id);
  if (idx >= 0) SERVICE_POLICIES[idx] = d;
  else SERVICE_POLICIES.push(d);

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
