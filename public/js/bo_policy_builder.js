// ─── 🔧 서비스 정책 관리 ─────────────────────────────────────────────────────
// 5단계 위저드: 기본정보 → 예산연동 → 대상조직 → 양식매핑 → 결재권한

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;

// ── 정책 목록 메인 화면 ───────────────────────────────────────────────────────
function renderServicePolicy() {
  const persona = boCurrentPersona;
  const el = document.getElementById('bo-content');

  const myPolicies = SERVICE_POLICIES.filter(p => p.tenantId === persona.tenantId);
  const flowLabel = { 'result-only': '결과 단독', 'apply-result': '신청→결과', 'plan-apply-result': '계획→신청→결과' };
  const flowColor = { 'result-only': '#6B7280', 'apply-result': '#1D4ED8', 'plan-apply-result': '#7C3AED' };

  const policyCards = myPolicies.map(p => {
    const approver = Object.values(BO_PERSONAS).find(pe =>
      Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === pe) === p.approverPersonaKey
    );
    const manager  = Object.values(BO_PERSONAS).find(pe =>
      Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === pe) === p.managerPersonaKey
    );
    const accounts = p.accountCodes.map(c => ACCOUNT_MASTER.find(a=>a.code===c)?.name||c).join(', ');
    const fColor = flowColor[p.flow] || '#374151';
    const fLabel = flowLabel[p.flow] || p.flow;
    return `
<div class="bo-card" style="padding:20px;margin-bottom:14px" onclick="renderPolicyDetail('${p.id}')" style="cursor:pointer">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${fColor}18;color:${fColor};border:1px solid ${fColor}40">${fLabel}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.budgetLinked?'#DBEAFE':'#F3F4F6'};color:${p.budgetLinked?'#1E40AF':'#6B7280'};font-weight:700">${p.budgetLinked?'💳 예산 연동':'무예산'}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.status==='active'?'#D1FAE5':'#F3F4F6'};color:${p.status==='active'?'#065F46':'#9CA3AF'};font-weight:700">${p.status==='active'?'✅ 운영중':'⏸️ 중지'}</span>
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:4px">${p.name}</div>
      <div style="font-size:12px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
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
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">🔧 서비스 정책 관리</h1>
      <p class="bo-page-sub">교육 서비스 흐름, 예산 연동, 조직, 양식, 결재 권한을 하나의 정책으로 통합 관리</p>
    </div>
    <button onclick="startPolicyWizard(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 정책 만들기
    </button>
  </div>

  <!-- 운영 모드 안내 -->
  <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
    <div style="padding:10px 16px;border-radius:10px;background:#EFF6FF;border:1px solid #BFDBFE;flex:1;min-width:200px">
      <div style="font-size:11px;font-weight:900;color:#1D4ED8;margin-bottom:2px">🔵 정밀 관리 모드 (현재)</div>
      <div style="font-size:11px;color:#3B82F6">예산 계정, 가점유 로직, 결재 통제 활성화</div>
    </div>
    <div style="padding:10px 16px;border-radius:10px;background:#F9FAFB;border:1px solid #E5E7EB;flex:1;min-width:200px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:2px">⚪ 일반 모드</div>
      <div style="font-size:11px;color:#9CA3AF">예산 없이 이력 등록만 운영 (정책 설정 시 선택)</div>
    </div>
  </div>

  <!-- 결재 자동 라우팅 안내 -->
  <div style="padding:14px 18px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:900;color:#5B21B6;margin-bottom:6px">🤖 결재 자동 라우팅 원리</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;flex-wrap:wrap">
      <span style="background:#EDE9FE;padding:2px 8px;border-radius:6px;font-weight:700">학습자 신청</span>
      <span>→</span>
      <span style="background:#EDE9FE;padding:2px 8px;border-radius:6px;font-weight:700">정책 자동 판별</span>
      <span>→</span>
      <span style="background:#7C3AED;color:white;padding:2px 8px;border-radius:6px;font-weight:700">승인자에게 자동 배달</span>
      <span style="color:#6B7280;font-size:11px;margin-left:4px">— 다른 담당자에게는 노출되지 않음</span>
    </div>
  </div>

  <!-- 정책 목록 -->
  <div>
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">정책 목록 (${myPolicies.length}개)</div>
    ${policyCards || '<div style="padding:40px;text-align:center;color:#9CA3AF">정책이 없습니다. 새 정책을 만드세요.</div>'}
  </div>
</div>`;
}

// ── 위저드 시작 ───────────────────────────────────────────────────────────────
function startPolicyWizard(policyId) {
  _editPolicyId = policyId;
  _policyWizardStep = 0;
  if (policyId) {
    const existing = SERVICE_POLICIES.find(p => p.id === policyId);
    _policyWizardData = existing ? JSON.parse(JSON.stringify(existing)) : {};
  } else {
    _policyWizardData = {
      id: 'POL-' + Date.now(),
      tenantId: boCurrentPersona.tenantId,
      name: '', flow: 'apply-result', budgetLinked: true,
      accountCodes: [], vorgTemplateId: '',
      formIds: [], allowedLearningTypes: [],
      managerPersonaKey: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '',
      approverPersonaKey: '',
      status: 'active', createdAt: new Date().toISOString().slice(0,10)
    };
  }
  renderPolicyWizard();
}

// ── 위저드 렌더링 ─────────────────────────────────────────────────────────────
function renderPolicyWizard() {
  const el = document.getElementById('bo-content');
  const steps = ['기본 정보', '예산 연동', '대상 조직', '양식·유형', '결재 권한'];
  const d = _policyWizardData;
  const persona = boCurrentPersona;

  // 스텝 인디케이터
  const stepBar = steps.map((s,i) => `
<div style="display:flex;align-items:center;gap:0">
  <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;
      background:${i<_policyWizardStep?'#059669':i===_policyWizardStep?'#7C3AED':'#E5E7EB'};
      color:${i<=_policyWizardStep?'white':'#9CA3AF'}">${i<_policyWizardStep?'✓':(i+1)}</div>
    <div style="font-size:10px;font-weight:700;color:${i===_policyWizardStep?'#7C3AED':i<_policyWizardStep?'#059669':'#9CA3AF'};white-space:nowrap">${s}</div>
  </div>
  ${i<steps.length-1?'<div style="width:40px;height:2px;background:'+(i<_policyWizardStep?'#059669':'#E5E7EB')+';margin-bottom:16px"></div>':''}
</div>`).join('');

  // 각 단계별 내용
  let stepContent = '';
  if (_policyWizardStep === 0) {
    // Step 1: 기본 정보 + 프로세스 패턴 (새 기획안 A/B/C)
    const patterns = [
      { v:'A', icon:'📊', l:'패턴 A: 계획 → 신청 → 결과', color:'#7C3AED',
        d:'사전 통제가 엄격한 경우. 교육계획 수립 필수 → 가점유 신청 → 결과 정산.' },
      { v:'B', icon:'📝', l:'패턴 B: 신청 → 결과',        color:'#1D4ED8',
        d:'일반 사외교육 신청 흐름. 가점유(홀딩) 또는 선지불 후정산 선택 가능.' },
      { v:'C', icon:'📋', l:'패턴 C: 신청 단독',           color:'#059669',
        d:'선지출 후정산 또는 무예산 순수 이력 등록. 결과 단계 없이 종결.' },
    ];
    const applyModes = [
      { v:'holding',       l:'💳 가점유형', d:'신청 승인 시 예산 가점유 → 결과 정산 시 실차감' },
      { v:'reimbursement', l:'🧾 선지출 후정산형', d:'학습자 선지불 후 영수증 첨부 → 승인 시 즉시 차감' },
    ];
    stepContent = `
<div style="display:grid;gap:18px">
  <div>
    <label class="bo-label">정책명 <span style="color:#EF4444">*</span></label>
    <input id="wiz-name" type="text" value="${d.name||''}" placeholder='예: "HMC 운영교육 정책"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px">
      ${patterns.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.processPattern===o.v?o.color:'#E5E7EB'};
                    background:${d.processPattern===o.v?o.color+'15':'white'};cursor:pointer"
             onclick="_policyWizardData.processPattern='${o.v}';_policyWizardData.flow='${o.v==='A'?'plan-apply-result':o.v==='B'?'apply-result':'result-only'}';if('${o.v}'==='A'){_policyWizardData.applyMode='holding';}renderPolicyWizard()">
        <input type="radio" name="wiz-pattern" value="${o.v}" ${d.processPattern===o.v?'checked':''} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.processPattern===o.v?o.color:'#374151'}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>
  ${d.processPattern !== 'A' ? `
  <div>
    <label class="bo-label">예산 연동 여부</label>
    <div style="display:flex;gap:8px">
      ${[true,false].map(v=>`
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;
                    border:2px solid ${d.budgetLinked===v?'#1D4ED8':'#E5E7EB'};
                    background:${d.budgetLinked===v?'#EFF6FF':'white'};cursor:pointer"
             onclick="_policyWizardData.budgetLinked=${v};if(!${v})_policyWizardData.applyMode=null;else _policyWizardData.applyMode='holding';renderPolicyWizard()">
        <input type="radio" ${d.budgetLinked===v?'checked':''} style="margin:0">
        <div><div style="font-weight:900;font-size:13px">${v?'Y — 예산 사용':'N — 무예산 이력'}</div>
             <div style="font-size:10px;color:#6B7280">${v?'예산 계정 연결 필수':'학습이력만 등록'}</div></div>
      </label>`).join('')}
    </div>
  </div>` : ''}
  ${d.budgetLinked && d.processPattern !== 'A' ? `
  <div>
    <label class="bo-label">신청 방식</label>
    <div style="display:grid;gap:8px">
      ${applyModes.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${d.applyMode===o.v?'#D97706':'#E5E7EB'};
                    background:${d.applyMode===o.v?'#FFFBEB':'white'};cursor:pointer"
             onclick="_policyWizardData.applyMode='${o.v}';renderPolicyWizard()">
        <input type="radio" name="wiz-applymode" ${d.applyMode===o.v?'checked':''} style="margin-top:2px">
        <div><div style="font-weight:800;font-size:12px;color:${d.applyMode===o.v?'#92400E':'#374151'}">${o.l}</div>
             <div style="font-size:11px;color:#6B7280;margin-top:1px">${o.d}</div></div>
      </label>`).join('')}
    </div>
  </div>` : ''}
</div>`;
  } else if (_policyWizardStep === 1) {
    // Step 2: 예산 연동
    const myAccts = ACCOUNT_MASTER.filter(a => a.tenantId === persona.tenantId && a.active && a.code !== 'COMMON-FREE');
    stepContent = `
<div style="display:grid;gap:16px">
  <div>
    <label class="bo-label">예산 사용 여부</label>
    <div style="display:flex;gap:10px">
      ${[true,false].map(v=>`
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:14px 18px;border-radius:10px;border:2px solid ${d.budgetLinked===v?'#1D4ED8':'#E5E7EB'};background:${d.budgetLinked===v?'#EFF6FF':'white'};cursor:pointer"
             onclick="_policyWizardData.budgetLinked=${v};if(!${v})_policyWizardData.accountCodes=[];renderPolicyWizard()">
        <input type="radio" value="${v}" ${d.budgetLinked===v?'checked':''} style="margin:0">
        <div><div style="font-weight:900;font-size:14px">${v?'Y — 예산 사용':'N — 무예산'}</div>
             <div style="font-size:11px;color:#6B7280">${v?'예산 계정 선택 필수':'학습이력만 등록, 예산 불필요'}</div></div>
      </label>`).join('')}
    </div>
  </div>
  ${d.budgetLinked ? `
  <div>
    <label class="bo-label">연동 예산 계정 선택 (복수 가능)</label>
    <div style="display:grid;gap:6px">
      ${myAccts.map(a=>`
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;border:1.5px solid ${d.accountCodes.includes(a.code)?'#1D4ED8':'#E5E7EB'};background:${d.accountCodes.includes(a.code)?'#EFF6FF':'white'};cursor:pointer"
             onclick="togglePolicyAcct('${a.code}')">
        <input type="checkbox" ${d.accountCodes.includes(a.code)?'checked':''} style="margin:0">
        <div><div style="font-weight:700;font-size:12px">${a.name}</div><div style="font-size:10px;color:#9CA3AF">${a.desc}</div></div>
      </label>`).join('')}
    </div>
  </div>` : `<div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:12px;color:#6B7280;font-size:13px">무예산 모드 — 별도 계정 연결 불필요</div>`}
</div>`;
  } else if (_policyWizardStep === 2) {
    // Step 3: 대상 조직 템플릿
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
  } else if (_policyWizardStep === 3) {
    // Step 4: 양식 + 학습유형
    const myForms = FORM_MASTER.filter(f => f.tenantId === persona.tenantId && f.active);
    const ltypes = ['사외집합', '세미나', '워크숍', '이러닝', '해외학회', '자격증', '도서', '개인'];
    stepContent = `
<div style="display:grid;gap:16px">
  <div>
    <label class="bo-label">연결 양식 선택</label>
    <div style="display:grid;gap:6px">
      ${myForms.map(f=>`
      <label style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;border:1.5px solid ${d.formIds.includes(f.id)?'#7C3AED':'#E5E7EB'};background:${d.formIds.includes(f.id)?'#F5F3FF':'white'};cursor:pointer"
             onclick="togglePolicyForm('${f.id}')">
        <input type="checkbox" ${d.formIds.includes(f.id)?'checked':''} style="margin:0">
        <div><div style="font-weight:700;font-size:12px">${f.name}</div><div style="font-size:10px;color:#9CA3AF">${f.type} · ${f.desc||''}</div></div>
      </label>`).join('')}
    </div>
  </div>
  <div>
    <label class="bo-label">허용 학습 유형</label>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${ltypes.map(t=>`
      <label style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;border:1.5px solid ${d.allowedLearningTypes.includes(t)?'#7C3AED':'#E5E7EB'};background:${d.allowedLearningTypes.includes(t)?'#F5F3FF':'white'};cursor:pointer;font-size:12px;font-weight:700"
             onclick="togglePolicyLType('${t}')">
        <input type="checkbox" ${d.allowedLearningTypes.includes(t)?'checked':''} style="margin:0"> ${t}
      </label>`).join('')}
    </div>
  </div>
</div>`;
  } else if (_policyWizardStep === 4) {
    // Step 5: 결재 및 관리 권한
    const tenantPersonas = Object.entries(BO_PERSONAS)
      .filter(([k,p]) => p.tenantId === persona.tenantId)
      .map(([k,p]) => ({key:k, p}));
    stepContent = `
<div style="display:grid;gap:16px">
  <div>
    <label class="bo-label">정책 관리자 <span style="font-size:10px;color:#6B7280">(정책 수정 권한)</span></label>
    <select id="wiz-manager" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
      <option value="">— 선택 —</option>
      ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${d.managerPersonaKey===key?'selected':''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
    </select>
  </div>
  <div>
    <label class="bo-label">최종 승인자 <span style="font-size:10px;color:#EF4444">* 학습자 신청 시 이 담당자의 업무 메뉴에 자동 배달됨</span></label>
    <select id="wiz-approver" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
      <option value="">— 선택 —</option>
      ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${d.approverPersonaKey===key?'selected':''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
    </select>
  </div>
  <!-- 자동 라우팅 미리보기 -->
  <div style="padding:16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px">
    <div style="font-size:11px;font-weight:900;color:#5B21B6;margin-bottom:8px">🤖 결재 자동 라우팅 미리보기</div>
    ${d.approverPersonaKey ? (() => {
      const ap = BO_PERSONAS[d.approverPersonaKey];
      return `<div style="font-size:12px;color:#374151">
        학습자 신청 → 정책 <b>${d.name||'(정책명)'}</b> 판별 →
        <span style="background:#7C3AED;color:white;padding:2px 8px;border-radius:6px;font-weight:700">${ap?.name||'—'} 책임</span>의 [나의 운영 업무]에 자동 배달
        <div style="margin-top:4px;font-size:11px;color:#6B7280">다른 담당자에게는 이 정책의 결재건이 노출되지 않습니다.</div>
      </div>`;
    })() : '<div style="font-size:12px;color:#9CA3AF">승인자를 선택하면 라우팅 미리보기가 표시됩니다.</div>'}
  </div>
</div>`;
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:680px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
    <button onclick="renderServicePolicy()" style="border:none;background:none;cursor:pointer;font-size:18px;color:#6B7280">←</button>
    <h1 class="bo-page-title" style="margin:0">${_editPolicyId?'정책 수정':'새 정책 만들기'}</h1>
  </div>
  <!-- 스텝 인디케이터 -->
  <div style="display:flex;align-items:flex-start;gap:0;margin-bottom:28px;overflow-x:auto;padding-bottom:4px">${stepBar}</div>
  <!-- 스텝 콘텐츠 -->
  <div class="bo-card" style="padding:24px;margin-bottom:16px">${stepContent}</div>
  <!-- 버튼 -->
  <div style="display:flex;justify-content:space-between">
    <button onclick="${_policyWizardStep>0?'_policyWizardStep--;renderPolicyWizard()':'renderServicePolicy()'}"
      style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;font-size:13px;cursor:pointer">
      ${_policyWizardStep>0?'← 이전':'취소'}
    </button>
    <button onclick="${_policyWizardStep<4?'advancePolicyWizard()':'savePolicy()'}" class="bo-btn-primary" style="padding:10px 24px">
      ${_policyWizardStep<4?'다음 →':'✅ 정책 저장'}
    </button>
  </div>
</div>`;
}

function advancePolicyWizard() {
  // 현재 단계 값 수집
  if (_policyWizardStep === 0) {
    const n = document.getElementById('wiz-name')?.value?.trim();
    if (!n) { alert('정책명을 입력하세요.'); return; }
    _policyWizardData.name = n;
  } else if (_policyWizardStep === 4) {
    _policyWizardData.managerPersonaKey  = document.getElementById('wiz-manager')?.value || '';
    _policyWizardData.approverPersonaKey = document.getElementById('wiz-approver')?.value || '';
    if (!_policyWizardData.approverPersonaKey) { alert('최종 승인자를 선택하세요.'); return; }
  }
  _policyWizardStep = Math.min(_policyWizardStep + 1, 4);
  renderPolicyWizard();
}

function savePolicy() {
  // Step 5 값 최종 수집
  _policyWizardData.managerPersonaKey  = document.getElementById('wiz-manager')?.value  || _policyWizardData.managerPersonaKey;
  _policyWizardData.approverPersonaKey = document.getElementById('wiz-approver')?.value || _policyWizardData.approverPersonaKey;
  if (!_policyWizardData.name) { alert('정책명이 없습니다.'); return; }
  if (!_policyWizardData.approverPersonaKey) { alert('최종 승인자를 선택하세요.'); return; }

  const idx = SERVICE_POLICIES.findIndex(p => p.id === _policyWizardData.id);
  if (idx >= 0) SERVICE_POLICIES[idx] = _policyWizardData;
  else SERVICE_POLICIES.push(_policyWizardData);

  const ap = BO_PERSONAS[_policyWizardData.approverPersonaKey];
  alert(`✅ 정책 저장 완료!\n\n📋 ${_policyWizardData.name}\n✅ 승인자: ${ap?.name||'—'}\n\n이제 학습자 신청 시 "${ap?.name||'—'}님"의 [나의 운영 업무]에 자동 배달됩니다.`);
  renderServicePolicy();
}

// 헬퍼: 계정/양식/학습유형 토글
function togglePolicyAcct(code) {
  const arr = _policyWizardData.accountCodes;
  const i = arr.indexOf(code);
  if (i>=0) arr.splice(i,1); else arr.push(code);
  renderPolicyWizard();
}
function togglePolicyForm(id) {
  const arr = _policyWizardData.formIds;
  const i = arr.indexOf(id);
  if (i>=0) arr.splice(i,1); else arr.push(id);
  renderPolicyWizard();
}
function togglePolicyLType(t) {
  const arr = _policyWizardData.allowedLearningTypes;
  const i = arr.indexOf(t);
  if (i>=0) arr.splice(i,1); else arr.push(t);
  renderPolicyWizard();
}
