// ─── 🔧 서비스 정책 관리 ─────────────────────────────────────────────────────
// 6단계 위저드: 기본정보(패턴선택) → 예산연동 → 결재라인 → 대상조직 → 양식·유형 → 결재권한

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;

const _PATTERN_META = {
  A:{ label:'패턴A: 계획→신청→결과', color:'#7C3AED', icon:'📊', flow:'plan-apply-result', applyMode:'holding',   budgetLinked:true },
  B:{ label:'패턴B: 신청→결과',      color:'#1D4ED8', icon:'📝', flow:'apply-result',      applyMode:'holding',   budgetLinked:true },
  C:{ label:'패턴C: 신청 단독(후정산)',color:'#D97706',icon:'🧾', flow:'result-only',       applyMode:'reimbursement',budgetLinked:true},
  D:{ label:'패턴D: 신청 단독(이력)',  color:'#6B7280', icon:'📋', flow:'result-only',       applyMode:null,        budgetLinked:false},
};
function _patternFromPolicy(p) {
  return p.processPattern || (p.flow==='plan-apply-result'?'A':p.flow==='apply-result'?'B':'C');
}

// ── 정책 목록 메인 화면 ───────────────────────────────────────────────────────
function renderServicePolicy() {
  const persona = boCurrentPersona;
  const el = document.getElementById('bo-content');
  // 격리그룹 기준 필터링 (isolationGroupId 또는 tenantId fallback)
  const activeGroupId = (typeof boGetActiveGroupId === 'function') ? boGetActiveGroupId() : null;
  const myPolicies = SERVICE_POLICIES.filter(p => {
    if (activeGroupId && p.isolationGroupId) return p.isolationGroupId === activeGroupId;
    return p.tenantId === persona.tenantId;
  });

  const policyCards = myPolicies.map(p => {
    const approver = Object.values(BO_PERSONAS).find(pe =>
      Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === pe) === p.approverPersonaKey);
    const manager = Object.values(BO_PERSONAS).find(pe =>
      Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === pe) === p.managerPersonaKey);
    const accounts = p.accountCodes.map(c => ACCOUNT_MASTER.find(a=>a.code===c)?.name||c).join(', ');
    const pat = _patternFromPolicy(p);
    const pm = _PATTERN_META[pat] || _PATTERN_META['B'];
    const thresholds = p.approvalThresholds || [];
    return `
<div class="bo-card" style="padding:20px;margin-bottom:14px;cursor:pointer" onclick="startPolicyWizard('${p.id}')">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${pm.color}18;color:${pm.color};border:1px solid ${pm.color}40">${pm.icon} ${pm.label}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.budgetLinked?'#DBEAFE':'#F3F4F6'};color:${p.budgetLinked?'#1E40AF':'#6B7280'};font-weight:700">${p.budgetLinked?'💳 예산 연동':'무예산'}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${p.status==='active'?'#D1FAE5':'#F3F4F6'};color:${p.status==='active'?'#065F46':'#9CA3AF'};font-weight:700">${p.status==='active'?'✅ 운영중':'⏸️ 중지'}</span>
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:4px">${p.name}</div>
      <div style="font-size:12px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
        ${accounts ? `<span>💳 ${accounts}</span>` : ''}
        <span>✅ 승인자: <b>${approver?.name||'—'}</b></span>
        <span>📋 관리자: <b>${manager?.name||'—'}</b></span>
        ${thresholds.length > 0 ? `<span>🔑 결재라인 ${thresholds.length}구간</span>` : ''}
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
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">🔧 서비스 정책 관리</h1>
      <p class="bo-page-sub">교육 서비스 흐름, 예산 연동, 금액별 결재라인, 조직, 양식, 결재 권한을 하나의 정책으로 통합 관리</p>
    </div>
    <button onclick="startPolicyWizard(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 정책 만들기
    </button>
  </div>

  <!-- 패턴 안내 카드 -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:20px">
    <div style="padding:12px 16px;background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:10px">
      <div style="font-size:16px">📊</div><div style="font-size:12px;font-weight:900;color:#7C3AED">패턴 A: Full-Cycle</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">계획→신청→결과 고통제형</div></div>
    <div style="padding:12px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px">
      <div style="font-size:16px">📝</div><div style="font-size:12px;font-weight:900;color:#1D4ED8">패턴 B: Standard</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">신청→결과 자율신청형</div></div>
    <div style="padding:12px 16px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px">
      <div style="font-size:16px">🧾</div><div style="font-size:12px;font-weight:900;color:#D97706">패턴 C: 정산특화</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">신청 단독 선지출 후정산</div></div>
    <div style="padding:12px 16px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:10px">
      <div style="font-size:16px">📋</div><div style="font-size:12px;font-weight:900;color:#6B7280">패턴 D: 이력관리</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px">신청 단독 무예산 이력등록</div></div>
  </div>

  <!-- 결재 자동 라우팅 안내 -->
  <div style="padding:14px 18px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;margin-bottom:20px">
    <div style="font-size:12px;font-weight:900;color:#5B21B6;margin-bottom:6px">🤖 결재 자동 라우팅 원리</div>
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#374151;flex-wrap:wrap">
      <span style="background:#EDE9FE;padding:2px 8px;border-radius:6px;font-weight:700">학습자 신청</span>
      <span>→</span>
      <span style="background:#EDE9FE;padding:2px 8px;border-radius:6px;font-weight:700">정책 자동 판별</span>
      <span>→</span>
      <span style="background:#EDE9FE;padding:2px 8px;border-radius:6px;font-weight:700">금액 구간 확인</span>
      <span>→</span>
      <span style="background:#7C3AED;color:white;padding:2px 8px;border-radius:6px;font-weight:700">담당 결재자에게 자동 배달</span>
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
    if (!_policyWizardData.approvalThresholds) _policyWizardData.approvalThresholds = [];
    if (!_policyWizardData.allowedLearningTypes) _policyWizardData.allowedLearningTypes = [];
    if (!_policyWizardData.processPattern) {
      _policyWizardData.processPattern = _patternFromPolicy(_policyWizardData);
    }
  } else {
    _policyWizardData = {
      id: 'POL-' + Date.now(),
      tenantId: boCurrentPersona.tenantId,
      name: '', desc: '',
      processPattern: '', flow: 'apply-result',
      budgetLinked: true, applyMode: 'holding',
      accountCodes: [], vorgTemplateId: '',
      formIds: [], allowedLearningTypes: [],
      approvalThresholds: [],
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
  const steps = ['기본 정보', '예산 연동', '결재 라인', '대상 조직', '양식·유형', '결재 권한'];
  const TOTAL = steps.length - 1;
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
  ${i<steps.length-1?`<div style="width:28px;height:2px;background:${i<_policyWizardStep?'#059669':'#E5E7EB'};margin-bottom:16px"></div>`:''}
</div>`).join('');

  let stepContent = '';

  // ── Step 1: 기본 정보 + 프로세스 패턴 ───────────────────────────────────────
  if (_policyWizardStep === 0) {
    const patterns = [
      { v:'A', icon:'📊', l:'패턴 A: 계획 → 신청 → 결과', color:'#7C3AED',
        d:'고통제형(Full-Cycle). R&D 교육예산 등 사전계획 필수 → 예산 가점유 신청 → 결과 정산.' },
      { v:'B', icon:'📝', l:'패턴 B: 신청 → 결과',        color:'#1D4ED8',
        d:'자율신청형(Standard). 교육 신청 후 결과 보고로 정산. 가점유 또는 후정산 방식 선택.' },
      { v:'C', icon:'🧾', l:'패턴 C: 신청 단독 (후정산)', color:'#D97706',
        d:'정산특화형(Reimbursement). 선지불 후 영수증 첨부 신청. 승인 즉시 실차감, 결과 단계 없음.' },
      { v:'D', icon:'📋', l:'패턴 D: 신청 단독 (이력등록)', color:'#6B7280',
        d:'이력관리형(History-Only). 무예산 학습이력 등록. 예산 차감 없음. 승인 시 즉시 이력 적재.' },
    ];
    stepContent = `
<div style="display:grid;gap:18px">
  <div>
    <label class="bo-label">정책명 <span style="color:#EF4444">*</span></label>
    <input id="wiz-name" type="text" value="${d.name||''}" placeholder='예: "HMC 일반 사외교육 참가지원"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">정책 설명 <span style="font-size:10px;color:#9CA3AF">(프론트에서 학습자에게 노출)</span></label>
    <input id="wiz-desc" type="text" value="${d.desc||''}" placeholder='예: "일반직무 사외교육 참가비를 지원합니다"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px">
      ${patterns.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.processPattern===o.v?o.color:'#E5E7EB'};
                    background:${d.processPattern===o.v?o.color+'15':'white'};cursor:pointer"
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

  // ── Step 2: 예산 연동 ────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 1) {
    const myAccts = ACCOUNT_MASTER.filter(a => a.tenantId === persona.tenantId && a.active && a.code !== 'COMMON-FREE');
    const applyModes = [
      { v:'holding',       l:'💳 가점유형', d:'신청 승인 시 예산 가점유 → 결과 정산 시 실차감' },
      { v:'reimbursement', l:'🧾 선지출 후정산형', d:'학습자 선지불 후 영수증 첨부 → 승인 시 즉시 차감' },
    ];

    if (d.processPattern === 'D') {
      stepContent = `<div style="padding:30px;text-align:center;background:#F9FAFB;border-radius:12px">
        <div style="font-size:36px;margin-bottom:10px">📋</div>
        <div style="font-weight:900;color:#374151;margin-bottom:6px">패턴 D — 무예산 이력 등록</div>
        <div style="font-size:13px;color:#6B7280">예산 연동이 필요 없습니다. 예산 차감 없이 학습 이력만 등록됩니다.</div>
        <div style="margin-top:16px;padding:12px 16px;background:#F3F4F6;border-radius:8px;font-size:12px;color:#6B7280;text-align:left">
          ✅ 학습자가 신청 후 승인 시 즉시 학습이력 DB에 적재됩니다<br>
          ✅ 예산 잔액에 영향을 주지 않습니다
        </div>
      </div>`;
    } else {
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
             <div style="font-size:11px;color:#6B7280">${v?'예산 계정 선택 필수':'학습이력만 등록'}</div></div>
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
        <div><div style="font-weight:700;font-size:12px">${a.name}</div><div style="font-size:10px;color:#9CA3AF">${a.desc||''}</div></div>
      </label>`).join('')}
    </div>
  </div>
  ${d.processPattern !== 'C' ? `
  <div>
    <label class="bo-label">신청 방식</label>
    <div style="display:grid;gap:8px">
      ${applyModes.map(o=>`
      <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;
                    border:2px solid ${d.applyMode===o.v?'#D97706':'#E5E7EB'};background:${d.applyMode===o.v?'#FFFBEB':'white'};cursor:pointer"
             onclick="_policyWizardData.applyMode='${o.v}';renderPolicyWizard()">
        <input type="radio" name="wiz-applymode" ${d.applyMode===o.v?'checked':''} style="margin-top:2px">
        <div><div style="font-weight:800;font-size:12px;color:${d.applyMode===o.v?'#92400E':'#374151'}">${o.l}</div>
             <div style="font-size:11px;color:#6B7280;margin-top:1px">${o.d}</div></div>
      </label>`).join('')}
    </div>
  </div>` : `<div style="padding:14px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E;font-weight:700">
    🧾 패턴 C: 선지출 후정산형으로 자동 설정됩니다. 신청 승인 시 예산이 즉시 차감됩니다.
  </div>`}
  ` : `<div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:12px;color:#6B7280;font-size:13px">무예산 모드 — 별도 계정 연결 불필요</div>`}
</div>`;
    }

  // ── Step 3: 금액별 결재라인 (Threshold) ────────────────────────────────────
  } else if (_policyWizardStep === 2) {
    const tenantPersonas = Object.entries(BO_PERSONAS)
      .filter(([k,p]) => p.tenantId === persona.tenantId)
      .map(([k,p]) => ({key:k, p}));
    const thresholds = d.approvalThresholds || [];

    if (d.processPattern === 'D' || !d.budgetLinked) {
      stepContent = `<div style="padding:30px;text-align:center;background:#F9FAFB;border-radius:12px">
        <div style="font-size:36px;margin-bottom:10px">📋</div>
        <div style="font-weight:900;color:#374151;margin-bottom:6px">무예산 정책 — 결재라인 간소화</div>
        <div style="font-size:13px;color:#6B7280">예산을 사용하지 않으므로 금액별 결재라인 설정이 필요 없습니다.<br>단일 승인자는 다음 단계(결재 권한)에서 설정합니다.</div>
      </div>`;
    } else {
      stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:14px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px">
    <div style="font-size:12px;font-weight:900;color:#5B21B6;margin-bottom:4px">💡 금액별 결재라인이란?</div>
    <div style="font-size:11px;color:#6B7280;line-height:1.6">
      신청 금액 구간에 따라 결재 단계를 동적으로 설정합니다.<br>
      예: 100만원 이하 → 팀장 전결 / 100만원 초과 → 본부장 승인 필수
    </div>
  </div>

  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <label class="bo-label" style="margin:0">결재 구간 설정</label>
      <button onclick="_addThreshold()" style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #7C3AED;color:#7C3AED;background:white;cursor:pointer;font-weight:700">+ 구간 추가</button>
    </div>
    <div id="threshold-list" style="display:grid;gap:8px">
      ${thresholds.length === 0 ? `
      <div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF;font-size:12px">
        결재 구간이 없습니다. 금액 구간이 없으면 단일 승인자로 처리됩니다.<br>
        <button onclick="_addThreshold()" style="margin-top:10px;font-size:12px;padding:6px 14px;border-radius:8px;border:1.5px solid #7C3AED;color:#7C3AED;background:white;cursor:pointer;font-weight:700">+ 첫 번째 구간 추가</button>
      </div>` :
      thresholds.map((t,i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;padding:14px 16px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:10px">
        <div>
          <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">최대 금액 (원) <span style="color:#9CA3AF;font-weight:400">※ 이하이면 이 결재자</span></label>
          <input type="number" value="${t.maxAmt||''}" placeholder="예: 1000000"
            onchange="_policyWizardData.approvalThresholds[${i}].maxAmt=Number(this.value)"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:700;box-sizing:border-box"/>
          <div style="font-size:10px;color:#9CA3AF;margin-top:3px">${t.maxAmt ? (t.maxAmt/10000)+'만원 이하' : '금액 입력'}</div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">결재 담당자</label>
          <select onchange="_policyWizardData.approvalThresholds[${i}].approverKey=this.value;_policyWizardData.approvalThresholds[${i}].label=this.options[this.selectedIndex].text"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700">
            <option value="">— 선택 —</option>
            ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${t.approverKey===key?'selected':''}>${p.name} (${p.dept})</option>`).join('')}
          </select>
        </div>
        <button onclick="_removeThreshold(${i})" style="padding:8px 12px;border-radius:8px;border:1.5px solid #FCA5A5;color:#DC2626;background:white;cursor:pointer;font-size:12px;font-weight:700;height:38px">삭제</button>
      </div>`).join('')}
    </div>
    ${thresholds.length > 0 ? `
    <div style="margin-top:10px;padding:12px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;font-size:11px;color:#065F46">
      ✅ 최대 구간 초과 금액은 다음 단계(결재 권한)에서 지정한 최종 승인자가 처리합니다.
    </div>` : ''}
  </div>
</div>`;
    }

  // ── Step 4: 대상 조직 ────────────────────────────────────────────────────────
  } else if (_policyWizardStep === 3) {
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

  // ── Step 5: 양식 + 학습유형 ──────────────────────────────────────────────────
  } else if (_policyWizardStep === 4) {
    const myForms = FORM_MASTER.filter(f => f.tenantId === persona.tenantId && f.active);
    const ltypes = ['사외집합', '세미나', '워크숍', '이러닝', '해외학회', '자격증', '도서', '개인'];
    const patStageMap = { A:['계획','신청','결과'], B:['신청','결과'], C:['신청'], D:['신청'] };
    const stages = patStageMap[d.processPattern] || ['신청'];

    stepContent = `
<div style="display:grid;gap:16px">
  ${d.processPattern ? `
  <div style="padding:12px 16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px">
    <div style="font-size:11px;font-weight:900;color:#5B21B6;margin-bottom:4px">📌 패턴 ${d.processPattern} 필수 양식 구성</div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      ${stages.map(s=>`<span style="padding:4px 10px;border-radius:6px;background:#EDE9FE;color:#7C3AED;font-size:11px;font-weight:700">${s} 양식</span>`).join('<span style="color:#9CA3AF">+</span>')}
    </div>
  </div>` : ''}
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

  // ── Step 6: 결재 및 관리 권한 ────────────────────────────────────────────────
  } else if (_policyWizardStep === 5) {
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
    <label class="bo-label">최종 승인자 <span style="font-size:10px;color:#EF4444">* 최종 및 이 구간 초과 금액 결재자</span></label>
    <select id="wiz-approver" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
      <option value="">— 선택 —</option>
      ${tenantPersonas.map(({key,p})=>`<option value="${key}" ${d.approverPersonaKey===key?'selected':''}>${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
    </select>
  </div>
  <!-- 자동 라우팅 미리보기 -->
  <div style="padding:16px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px">
    <div style="font-size:11px;font-weight:900;color:#5B21B6;margin-bottom:8px">🤖 결재 자동 라우팅 미리보기</div>
    ${(() => {
      const thresholds = d.approvalThresholds || [];
      const ap = BO_PERSONAS[d.approverPersonaKey];
      if (thresholds.length === 0) {
        return ap ? `<div style="font-size:12px;color:#374151">모든 신청 → <span style="background:#7C3AED;color:white;padding:2px 8px;border-radius:6px;font-weight:700">${ap.name}</span>의 [나의 운영 업무]에 자동 배달</div>`
          : `<div style="font-size:12px;color:#9CA3AF">승인자를 선택하면 라우팅 미리보기가 표시됩니다.</div>`;
      }
      return `<div style="display:grid;gap:6px">
        ${thresholds.map(t => {
          const tap = BO_PERSONAS[t.approverKey];
          return `<div style="font-size:11px;color:#374151;display:flex;align-items:center;gap:6px">
            <span style="background:#EDE9FE;padding:2px 7px;border-radius:5px;font-weight:700">${t.maxAmt?(t.maxAmt/10000)+'만원 이하':''}</span>
            → <span style="background:#7C3AED;color:white;padding:2px 7px;border-radius:5px;font-weight:700">${tap?.name||'—'}</span></div>`;
        }).join('')}
        <div style="font-size:11px;color:#374151;display:flex;align-items:center;gap:6px">
          <span style="background:#EDE9FE;padding:2px 7px;border-radius:5px;font-weight:700">초과 금액</span>
          → <span style="background:#7C3AED;color:white;padding:2px 7px;border-radius:5px;font-weight:700">${ap?.name||'최종승인자 선택 필요'}</span>
        </div>
      </div>`;
    })()}
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
</div>`;
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:700px">
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
    <button onclick="${_policyWizardStep<TOTAL?'advancePolicyWizard()':'savePolicy()'}" class="bo-btn-primary" style="padding:10px 24px">
      ${_policyWizardStep<TOTAL?'다음 →':'✅ 정책 저장'}
    </button>
  </div>
</div>`;
}

function _setPatternDefaults(pat) {
  const m = _PATTERN_META[pat];
  if (!m) return;
  _policyWizardData.flow = m.flow;
  _policyWizardData.budgetLinked = m.budgetLinked;
  _policyWizardData.applyMode = m.applyMode;
  if (pat === 'D') _policyWizardData.accountCodes = [];
}

function _addThreshold() {
  if (!_policyWizardData.approvalThresholds) _policyWizardData.approvalThresholds = [];
  _policyWizardData.approvalThresholds.push({ maxAmt: null, approverKey: '', label: '' });
  renderPolicyWizard();
}

function _removeThreshold(i) {
  _policyWizardData.approvalThresholds.splice(i, 1);
  renderPolicyWizard();
}

function advancePolicyWizard() {
  if (_policyWizardStep === 0) {
    const n = document.getElementById('wiz-name')?.value?.trim();
    if (!n) { alert('정책명을 입력하세요.'); return; }
    _policyWizardData.name = n;
    const desc = document.getElementById('wiz-desc')?.value?.trim();
    if (desc) _policyWizardData.desc = desc;
    if (!_policyWizardData.processPattern) { alert('프로세스 패턴을 선택하세요.'); return; }
  } else if (_policyWizardStep === 2) {
    // Save threshold values from DOM before advancing
    const ths = _policyWizardData.approvalThresholds;
    ths.forEach((t,i) => {
      const inputs = document.querySelectorAll('#threshold-list input[type=number]');
      const selects = document.querySelectorAll('#threshold-list select');
      if (inputs[i]) t.maxAmt = Number(inputs[i].value)||null;
      if (selects[i]) {
        t.approverKey = selects[i].value;
        t.label = selects[i].options[selects[i].selectedIndex]?.text || '';
      }
    });
  } else if (_policyWizardStep === 5) {
    _policyWizardData.managerPersonaKey  = document.getElementById('wiz-manager')?.value || '';
    _policyWizardData.approverPersonaKey = document.getElementById('wiz-approver')?.value || '';
    if (!_policyWizardData.approverPersonaKey) { alert('최종 승인자를 선택하세요.'); return; }
  }
  _policyWizardStep = Math.min(_policyWizardStep + 1, 5);
  renderPolicyWizard();
}

function savePolicy() {
  _policyWizardData.managerPersonaKey  = document.getElementById('wiz-manager')?.value  || _policyWizardData.managerPersonaKey;
  _policyWizardData.approverPersonaKey = document.getElementById('wiz-approver')?.value || _policyWizardData.approverPersonaKey;
  if (!_policyWizardData.name) { alert('정책명이 없습니다.'); return; }
  if (!_policyWizardData.approverPersonaKey) { alert('최종 승인자를 선택하세요.'); return; }

  const idx = SERVICE_POLICIES.findIndex(p => p.id === _policyWizardData.id);
  if (idx >= 0) SERVICE_POLICIES[idx] = _policyWizardData;
  else SERVICE_POLICIES.push(_policyWizardData);

  const ap = BO_PERSONAS[_policyWizardData.approverPersonaKey];
  const thresholds = _policyWizardData.approvalThresholds || [];
  const thresholdSummary = thresholds.length > 0 ?
    '\n\n🔑 금액별 결재라인:\n' + thresholds.map(t=>`  · ${t.maxAmt?(t.maxAmt/10000)+'만원 이하':''} → ${BO_PERSONAS[t.approverKey]?.name||'—'}`).join('\n')
    + `\n  · 초과 → ${ap?.name||'—'} (최종)` : '';
  alert(`✅ 정책 저장 완료!\n\n📋 ${_policyWizardData.name}\n🔄 패턴 ${_policyWizardData.processPattern}\n✅ 최종 승인자: ${ap?.name||'—'}${thresholdSummary}\n\n이제 학습자 신청 시 [나의 운영 업무]에 자동 배달됩니다.`);
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
