// ─── 📝 교육 양식관리 ─────────────────────────────────────────────────────
// 제도그룹별 예산계정의 교육유형에 맞는 양식(필드 on/off)을 관리합니다.
// 4단계: 사업계획(forecast) · 운영계획(operation) · 신청(apply) · 결과(result)
// PRD: field_standardization.md 기반 필드 타입 표준화 적용

let _formTenantId = '';       // 선택된 회사(tenant)
let _formVorgId = '';
let _formAccountCode = '';
let _formSelEduType = '';
let _formActiveStage = 'forecast';
let _formTplList = [];        // 전체 vorg templates (DB)
let _formAccountList = [];    // 전체 budget accounts (DB)
let _formTenantList = [];     // 회사 목록
let _formFieldStates = {}; // { "elearning|forecast": { venue_type: true, ... } }

// ── 패턴 → 활성 단계 매핑 ──────────────────────────────────────────────────
const _FORM_PATTERN_STAGES = {
  A: ['forecast','operation','apply','result'],
  B: ['operation','apply','result'],
  C: ['apply','result'],
  D: ['operation','apply'],
  E: ['forecast','operation'],
};
const _FORM_STAGE_META = {
  forecast:  { icon:'📊', label:'사업계획 양식', color:'#7C3AED' },
  operation: { icon:'📋', label:'운영계획 양식', color:'#1D4ED8' },
  apply:     { icon:'📝', label:'신청 양식',     color:'#059669' },
  result:    { icon:'📄', label:'결과 양식',     color:'#D97706' },
};

// ── 3-Depth 교육유형 한글 라벨 역참조 ────────────────────────────────────────
// _BAM_EDU_TREE (bo_budget_account_tabs.js) 기반
function _formEduTypeInfo(typeId) {
  if (typeof _BAM_EDU_TREE === 'undefined') return { group:'', category:'', type: typeId, breadcrumb: typeId };
  for (const g of _BAM_EDU_TREE) {
    for (const c of g.categories || []) {
      for (const t of c.types || []) {
        if (t.id === typeId) {
          return { group: g.label, groupIcon: g.icon, groupColor: g.color,
                   category: c.label, type: t.label,
                   breadcrumb: `${g.label} > ${c.label} > ${t.label}` };
        }
      }
    }
  }
  return { group:'', category:'', type: typeId, breadcrumb: typeId };
}

// 교육유형 ID 목록을 3-depth 트리로 그루핑
function _formGroupEduTypes(eduTypeIds) {
  if (typeof _BAM_EDU_TREE === 'undefined') return [];
  const result = [];
  for (const g of _BAM_EDU_TREE) {
    const cats = [];
    for (const c of g.categories || []) {
      const matched = (c.types || []).filter(t => eduTypeIds.includes(t.id));
      if (matched.length > 0) cats.push({ purpose: c.purpose, label: c.label, desc: c.desc, types: matched });
    }
    if (cats.length > 0) result.push({ group: g.group, icon: g.icon, label: g.label, color: g.color, desc: g.desc, categories: cats });
  }
  return result;
}

// ── 필드 타입별 색상 및 배지 레이블 ─────────────────────────────────────────
const _FORM_TYPE_COLOR = {
  text:         '#6B7280',
  textarea:     '#6B7280',
  number:       '#2563EB',
  boolean:      '#059669',
  date:         '#7C3AED',
  daterange:    '#7C3AED',
  select:       '#D97706',
  file:         '#DC2626',
  autocomplete: '#0891B2',
  rating:       '#F59E0B',
  calc_grounds: '#1D4ED8',
};
const _FORM_TYPE_BADGE = {
  text:         '텍스트',
  textarea:     '장문',
  number:       '숫자',
  boolean:      'ON/OFF',
  date:         '날짜',
  daterange:    '기간',
  select:       '선택',
  file:         '첨부',
  autocomplete: '검색',
  rating:       '평점',
  calc_grounds: '산출근거',
};

// ── 단계별 필드 카탈로그 (PRD field_standardization.md 기반 타입 적용) ────────
// type: text | textarea | number | boolean | date | daterange | select | file | autocomplete | rating | calc_grounds
const _FORM_FIELDS = {
  // ── 사업계획 (Forecast) ────────────────────────────────────────────────────
  forecast: [
    { cat:'기본정보', icon:'📋', fields:[
      {key:'edu_purpose',  label:'교육목적',   type:'select'},
      {key:'edu_type',     label:'교육유형',   type:'select'},
      {key:'course_name',  label:'교육과정명', type:'text', locked:true},
    ]},
    { cat:'교육내용', icon:'📝', fields:[
      {key:'learning_objective', label:'교육목표', type:'textarea'},
      {key:'course_description', label:'교육내용', type:'textarea'},
      {key:'expected_benefit',   label:'기대효과', type:'textarea'},
      {key:'target_audience',    label:'교육대상', type:'select', options:['임원','팀장','팀원','전 직원','신입사원','기타']},
      {key:'planned_headcount',  label:'교육인원', type:'number', unit:'명'},
      {key:'supporting_docs',    label:'증빙자료', type:'file'},
    ]},
    { cat:'장소정보', icon:'🏛️', fields:[
      {key:'is_overseas',      label:'국내/해외',      type:'boolean'},
      {key:'institution_name', label:'교육기관',        type:'autocomplete'},
      {key:'venue_detail',     label:'교육장소',        type:'text'},
      {key:'planned_rounds',   label:'교육차수',        type:'number', unit:'차수'},
      {key:'planned_days',     label:'교육일수',        type:'number', unit:'일'},
      {key:'hours_per_round',  label:'차수별 시간',     type:'number', unit:'시간'},
      {key:'edu_period',       label:'교육기간',        type:'daterange'},
      {key:'is_continuing',    label:'전년도 계속교육', type:'boolean'},
      {key:'is_ei_eligible',   label:'고용보험 해당',   type:'boolean'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'requested_budget', label:'요청 예산 규모', type:'number', unit:'원'},
      {key:'calc_grounds',     label:'세부산출근거',   type:'calc_grounds'},
    ]},
    { cat:'관리자 필드', icon:'🔧', fields:[
      {key:'admin_comment',    label:'담당자 코멘트', type:'textarea'},
      {key:'allocated_amount', label:'배정액',       type:'number', unit:'원'},
    ]},
  ],
  // ── 운영계획 (Operation) ────────────────────────────────────────────────
  operation: [
    { cat:'기본정보', icon:'📋', fields:[
      {key:'edu_purpose',  label:'교육목적', type:'select'},
      {key:'edu_type',     label:'교육유형', type:'select'},
      {key:'course_name',  label:'교육명',   type:'text', locked:true},
    ]},
    { cat:'장소정보', icon:'🏛️', fields:[
      {key:'is_overseas',       label:'국내/해외',    type:'boolean'},
      {key:'venue_type',        label:'장소유형',    type:'select', options:['사내','사외','온라인']},
      {key:'venue_detail',      label:'교육장소',    type:'text'},
      {key:'edu_period',        label:'교육기간',    type:'daterange'},
      {key:'planned_days',      label:'교육일수',    type:'number', unit:'일'},
      {key:'hours_per_round',   label:'차수별 시간', type:'number', unit:'시간'},
      {key:'planned_rounds',    label:'교육차수',    type:'number', unit:'차수'},
      {key:'planned_headcount', label:'교육인원',    type:'number', unit:'명'},
    ]},
    { cat:'교육 담당', icon:'👨‍🏫', fields:[
      {key:'institution_name', label:'교육기관',      type:'autocomplete'},
      {key:'instructor_name',  label:'강사명',        type:'text'},
      {key:'edu_method',       label:'교육방법',      type:'select', options:['대면','비대면','블렌디드']},
      {key:'is_ei_eligible',   label:'고용보험 해당', type:'boolean'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'planned_amount',  label:'계획액',       type:'number', unit:'원'},
      {key:'calc_grounds',    label:'세부산출근거', type:'calc_grounds'},
      {key:'expected_benefit',label:'기대효과',     type:'textarea'},
    ]},
    { cat:'관리자 필드', icon:'🔧', fields:[
      {key:'admin_comment',    label:'담당자 코멘트', type:'textarea'},
      {key:'allocated_amount', label:'배정액',       type:'number', unit:'원'},
    ]},
  ],
  // ── 신청 (Apply) ─────────────────────────────────────────────────────────
  apply: [
    { cat:'기본정보', icon:'📋', fields:[
      {key:'edu_purpose',  label:'교육목적', type:'select'},
      {key:'edu_type',     label:'교육유형', type:'select'},
    ]},
    { cat:'과정정보', icon:'📐', fields:[
      {key:'course_name',        label:'과정명',       type:'text'},
      {key:'institution_name',   label:'교육기관명',   type:'autocomplete'},
      {key:'course_description', label:'교육내용',     type:'textarea'},
      {key:'learning_objective', label:'교육목표',     type:'textarea'},
      {key:'apply_reason',       label:'신청사유',     type:'textarea'},
      {key:'course_brochure',    label:'과정소개 자료',type:'file'},
      {key:'learning_content',   label:'학습내용',     type:'textarea'},
    ]},
    { cat:'장소정보', icon:'🏛️', fields:[
      {key:'edu_period',        label:'교육기간',       type:'daterange'},
      {key:'planned_hours',     label:'학습시간(예정)', type:'number', unit:'시간'},
      {key:'planned_duration',  label:'학습기간',       type:'text'},
      {key:'education_region',  label:'교육지역',       type:'select', options:['서울','경기','부산','대구','인천','대전','광주','기타','해외']},
      {key:'venue_detail',      label:'교육장소 상세',  type:'text'},
      {key:'is_overseas',       label:'해외교육여부',   type:'boolean'},
      {key:'overseas_country',  label:'해외교육 국가',  type:'text'},
      {key:'education_format',  label:'교육형태',       type:'select', options:['온라인','오프라인','블렌디드']},
    ]},
    { cat:'기타정보', icon:'✅', fields:[
      {key:'has_accommodation', label:'숙박여부',       type:'boolean'},
      {key:'lunch_provided',    label:'중식제공여부',   type:'boolean'},
      {key:'is_paid_education', label:'유료교육여부',   type:'boolean'},
      {key:'is_ei_eligible',    label:'고용보험 해당',  type:'boolean'},
      {key:'instructor_name',   label:'강사명',         type:'text'},
      {key:'is_continuing',     label:'전년도 계속교육',type:'boolean'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'calc_grounds',     label:'세부산출근거',    type:'calc_grounds'},
      {key:'ei_refund_amount', label:'고용보험 환급예상액', type:'number', unit:'원'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'supporting_docs', label:'증빙서류', type:'file'},
      {key:'receipt',         label:'영수증',   type:'file'},
    ]},
  ],
  // ── 결과 (Result) ─────────────────────────────────────────────────────────
  result: [
    { cat:'기본정보', icon:'📋', fields:[
      {key:'edu_purpose',  label:'교육목적', type:'select'},
      {key:'edu_type',     label:'교육유형', type:'select'},
      {key:'course_name',  label:'교육명',   type:'text', locked:true},
    ]},
    { cat:'수료정보', icon:'🎓', fields:[
      {key:'is_completed',    label:'수료여부',   type:'boolean'},
      {key:'score',           label:'취득점수',   type:'number'},
      {key:'actual_hours',    label:'이수시간',   type:'number', unit:'시간'},
      {key:'actual_days',     label:'이수일수',   type:'number', unit:'일'},
      {key:'attendance_rate', label:'출석률',     type:'number', unit:'%'},
    ]},
    { cat:'결과 내용', icon:'📝', fields:[
      {key:'review_comment',        label:'교육소감',     type:'textarea'},
      {key:'work_application_plan', label:'업무적용계획', type:'textarea'},
      {key:'recommendation_target', label:'추천대상',     type:'text'},
      {key:'share_result',          label:'결과공유여부', type:'boolean'},
      {key:'remarks',               label:'비고',         type:'textarea'},
    ]},
    { cat:'만족도 평가', icon:'⭐', fields:[
      {key:'satisfaction_rating',   label:'교육만족도',  type:'rating'},
      {key:'applicability_rating',  label:'현업적용도',  type:'rating'},
      {key:'recommendation_rating', label:'과정추천도',  type:'rating'},
      {key:'instructor_rating',     label:'강사만족도',  type:'rating'},
      {key:'difficulty_rating',     label:'교육난이도',  type:'rating'},
      {key:'relevance_rating',      label:'직무관련성',  type:'rating'},
      {key:'facility_rating',       label:'교육기관시설',type:'rating'},
    ]},
    { cat:'비용정산', icon:'💰', budgetOnly:true, fields:[
      {key:'actual_cost',      label:'실 교육비',          type:'number', unit:'원'},
      {key:'payment_method',   label:'결제방식',           type:'select', options:['법인카드','개인카드','현금','기타']},
      {key:'payment_date',     label:'비용결제일',         type:'date'},
      {key:'is_ei_eligible',   label:'고용보험 해당',      type:'boolean'},
      {key:'ei_refund_amount', label:'고용보험 환급예상액', type:'number', unit:'원'},
      {key:'payment_completed',label:'교육비 지급완료',    type:'boolean'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'completion_cert', label:'수료증',   type:'file'},
      {key:'expense_receipt', label:'증빙서류', type:'file'},
    ]},
  ],
};

// ── 메인 렌더 ───────────────────────────────────────────────────────────────
async function renderFormManagement() {
  const ct = document.getElementById('bo-content');
  ct.innerHTML = '<div style="text-align:center;padding:60px;color:#9CA3AF">⏳ 양식관리 데이터 로딩 중...</div>';

  try {
    const user = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const role = (typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.role) || user.role || '';
    const isPlatform = role === 'platform_admin';

    // DB 로드 (platform_admin은 전체, 나머지는 자사만)
    const sb = typeof _sb === 'function' ? _sb() : window.__supabase;
    if (sb) {
      let tplQuery = sb.from('virtual_org_templates').select('id,name,tenant_id,service_type');
      let accQuery = sb.from('budget_accounts').select('*');
      if (!isPlatform) {
        const tid = user.tenant_id || 'HMC';
        tplQuery = tplQuery.eq('tenant_id', tid);
        accQuery = accQuery.eq('tenant_id', tid);
      }
      const [tplRes, accRes] = await Promise.all([tplQuery, accQuery]);
      _formTplList = tplRes.data || [];
      _formAccountList = accRes.data || [];
    } else {
      console.warn('[FormMgmt] Supabase 미연결, mock 사용');
      _formTplList = (window.VORG_TEMPLATES||[]);
      _formAccountList = (window.BUDGET_ACCOUNTS||[]);
    }

    // 회사 목록 추출
    _formTenantList = typeof TENANTS !== 'undefined'
      ? TENANTS
      : [...new Set(_formTplList.map(t => t.tenant_id).filter(Boolean))].map(id => ({ id, name: id }));

    // platform_admin: 회사 미선택 시 첫 번째 자동 선택
    if (isPlatform && !_formTenantId && _formTenantList.length) _formTenantId = _formTenantList[0].id;
    // 일반 admin: 자사 고정
    if (!isPlatform) _formTenantId = user.tenant_id || 'HMC';

    _formRenderPage();
  } catch(e) {
    console.error('[FormMgmt] 렌더링 에러:', e);
    ct.innerHTML = `<div style="text-align:center;padding:60px;color:#EF4444">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-size:14px;font-weight:700">양식관리 로드 중 오류가 발생했습니다</div>
      <div style="font-size:12px;color:#6B7280;margin-top:8px">${e.message || e}</div>
      <button onclick="renderFormManagement()" style="margin-top:16px;padding:10px 24px;border-radius:10px;border:none;background:#7C3AED;color:white;font-weight:700;cursor:pointer">다시 시도</button>
    </div>`;
  }
}

function _formRenderPage() {
  const ct = document.getElementById('bo-content');
  const user = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
  const role = (typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.role) || user.role || '';
  const isPlatform = role === 'platform_admin';

  // 회사 기준 및 교육지원(edu_support) 제도그룹 필터
  const filteredVorgs = _formTplList.filter(t => 
    t.service_type === 'edu_support' && 
    (!_formTenantId || t.tenant_id === _formTenantId)
  );

  // vorg 유효성 확인
  if (_formVorgId && !filteredVorgs.find(t => t.id === _formVorgId)) _formVorgId = '';
  if (!_formVorgId && filteredVorgs.length) _formVorgId = filteredVorgs[0].id;

  // 제도그룹 기준 예산계정 필터
  const filteredAccounts = _formAccountList.filter(a =>
    (!_formVorgId || a.virtual_org_template_id === _formVorgId) && a.active !== false
  );

  // account 유효성 확인
  if (_formAccountCode && !filteredAccounts.find(a => a.code === _formAccountCode)) _formAccountCode = '';
  const selAcc = filteredAccounts.find(a => a.code === _formAccountCode) || null;
  // 자동 선택하지 않음 — 사용자가 직접 선택해야 조회

  // 기존 설정 복원
  if (selAcc) _formLoadExistingConfig(selAcc);

  const eduTypes = selAcc?.edu_types || [];
  const pattern = selAcc?.process_pattern || 'A';
  const stages = _FORM_PATTERN_STAGES[pattern] || _FORM_PATTERN_STAGES.A;
  const usesBudget = selAcc?.uses_budget !== false;

  // 첫 교육유형 자동 선택
  if (!_formSelEduType || !eduTypes.includes(_formSelEduType)) {
    _formSelEduType = eduTypes[0] || '';
  }
  // 활성 단계 유효성
  if (!stages.includes(_formActiveStage)) _formActiveStage = stages[0];

  // 교육유형 3-depth 트리 그루핑
  const eduTree = _formGroupEduTypes(eduTypes);

  ct.innerHTML = `
  <div style="max-width:1100px;margin:0 auto;padding:20px">
    <!-- 헤더 -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:24px">📝</span>
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#1E293B">교육 양식관리</h2>
        <p style="margin:2px 0 0;font-size:12px;color:#64748B">제도그룹별 예산계정의 교육유형에 맞는 양식을 관리합니다</p>
      </div>
    </div>

    <!-- 필터 바 -->
    <div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#F0F9FF,#F5F3FF);border-radius:12px;border:1px solid #E0E7FF">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <!-- 회사 선택 -->
        ${isPlatform ? `
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏢 회사</span>
          <select id="fm-tenant-sel" onchange="_formOnTenantChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:120px">
            <option value="">전체 회사</option>
            ${_formTenantList.map(t => `<option value="${t.id}" ${t.id===_formTenantId?'selected':''}>${t.name||t.id}</option>`).join('')}
          </select>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        ` : `
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏢 회사</span>
          <span style="padding:6px 12px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:#F5F3FF;color:#4338CA;font-weight:700">
            ${_formTenantList.find(t=>t.id===_formTenantId)?.name || _formTenantId}
          </span>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        `}
        <!-- 제도그룹 -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏗️ 제도그룹</span>
          <select id="fm-vorg-sel" onchange="_formOnVorgChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:200px">
            <option value="">제도그룹 선택</option>
            ${filteredVorgs.map(t => `<option value="${t.id}" ${t.id===_formVorgId?'selected':''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        <!-- 예산계정 -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">💳 예산계정</span>
          <select id="fm-acc-sel" onchange="_formOnAccountChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:180px"
            ${!_formVorgId?'disabled':''}>
            <option value="">예산계정 선택</option>
            ${filteredAccounts.map(a => `<option value="${a.code}" ${a.code===_formAccountCode?'selected':''}>${a.name} (${a.code})</option>`).join('')}
          </select>
        </div>
        ${selAcc ? `
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        <span style="font-size:10px;padding:4px 12px;border-radius:20px;background:#7C3AED;color:white;font-weight:800">
          패턴${pattern}: ${(_FORM_PATTERN_STAGES[pattern]||[]).map(s=>_FORM_STAGE_META[s]?.label.replace(' 양식','')).join('→')}
        </span>` : ''}
        ${selAcc && !usesBudget ? '<span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#F59E0B;color:white;font-weight:800">💰 무예산</span>' : ''}
      </div>
      <!-- 안내 문구 -->
      ${!_formAccountCode ? `
      <div style="margin-top:10px;font-size:11px;color:#6366F1;display:flex;align-items:center;gap:6px">
        ℹ️ 회사 → 제도그룹 → 예산계정을 순서대로 선택하면 양식을 관리할 수 있습니다.
      </div>` : ''}
    </div>

    ${!_formAccountCode ? `
      <div style="padding:60px;text-align:center;background:#F0F9FF;border:2px dashed #BAE6FD;border-radius:16px">
        <div style="font-size:36px;margin-bottom:12px">👆</div>
        <div style="font-size:14px;font-weight:700;color:#0369A1;margin-bottom:6px">예산계정을 선택하세요</div>
        <div style="font-size:12px;color:#0284C7">회사 → 제도그룹 → 예산계정을 순서대로 선택하면 양식 설정이 표시됩니다</div>
      </div>
    ` : eduTypes.length === 0 ? `
      <div style="padding:60px;text-align:center;background:#FFF7ED;border:2px dashed #FDBA74;border-radius:16px">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <div style="font-size:14px;font-weight:700;color:#C2410C;margin-bottom:6px">교육유형이 설정되지 않았습니다</div>
        <div style="font-size:12px;color:#EA580C">예산계정 관리 → 서비스 정책·프로세스 탭에서 교육유형을 먼저 선택하세요</div>
      </div>
    ` : `
    <!-- 본문: 좌측 사이드바 + 우측 콘텐츠 -->
    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;min-height:600px">
      <!-- 좌측: 교육유형 3-Depth 사이드바 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;overflow-y:auto;max-height:calc(100vh - 280px)">
        <div style="padding:10px 14px;background:#F8FAFC;border-bottom:1px solid #E5E7EB;font-size:11px;font-weight:800;color:#475569">
          📚 교육유형 (${eduTypes.length})
        </div>
        ${eduTree.map(g => `
          <!-- 1Depth: 그룹 (직접학습/교육운영) -->
          <div style="padding:8px 12px;background:linear-gradient(135deg,${g.color}08,${g.color}15);border-bottom:1px solid #E5E7EB">
            <div style="font-size:11px;font-weight:900;color:${g.color};display:flex;align-items:center;gap:5px">
              ${g.icon} ${g.label}
            </div>
          </div>
          ${g.categories.map(c => `
            <!-- 2Depth: 목적 카테고리 (정규교육, 학술 등) -->
            <div style="padding:5px 12px 3px 20px;font-size:10px;font-weight:700;color:#6B7280;border-bottom:1px solid #FAFAFA">
              ▸ ${c.label}
            </div>
            ${c.types.map(t => {
              const active = t.id === _formSelEduType;
              return `<div onclick="_formSelectEduType('${t.id}')"
                style="padding:7px 12px 7px 34px;cursor:pointer;border-left:3px solid ${active?g.color:'transparent'};
                  background:${active?g.color+'12':'white'};font-size:12px;font-weight:${active?'800':'500'};
                  color:${active?g.color:'#374151'};transition:all .12s;border-bottom:1px solid #F8F9FA">
                ${active?'● ':'○ '} ${t.label}
              </div>`;
            }).join('')}
          `).join('')}
        `).join('')}
      </div>

      <!-- 우측: 단계 탭 + 필드 토글 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;display:flex;flex-direction:column;max-height:calc(100vh - 280px)">
        <!-- 단계 탭 -->
        <div style="display:flex;border-bottom:2px solid #E5E7EB;background:#F8FAFC;flex-shrink:0;border-radius:14px 14px 0 0">
          ${stages.map(s => {
            const m = _FORM_STAGE_META[s];
            const act = s === _formActiveStage;
            return `<div onclick="_formSelectStage('${s}')"
              style="padding:10px 16px;cursor:pointer;font-size:12px;font-weight:${act?'800':'500'};
                color:${act?m.color:'#6B7280'};border-bottom:3px solid ${act?m.color:'transparent'};
                background:${act?'white':'transparent'};transition:all .15s;flex:1;text-align:center">
              ${m.icon} ${m.label}
            </div>`;
          }).join('')}
        </div>

        <!-- 필드 토글 영역 -->
        <div id="fm-field-toggles" style="padding:16px;flex:1;overflow-y:auto">
          ${_formRenderFieldToggles(_formActiveStage, usesBudget)}
        </div>

        <!-- 하단 버튼 -->
        <div style="padding:12px 16px;border-top:1px solid #E5E7EB;display:flex;gap:10px;justify-content:flex-end;background:#FAFAFA;flex-shrink:0;border-radius:0 0 14px 14px">
          <button onclick="_formPreview()"
            style="padding:8px 20px;border:1px solid #6366F1;background:white;color:#6366F1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">
            👁️ 미리보기
          </button>
          <button onclick="_formSave()"
            style="padding:8px 24px;border:none;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px #6366F140"
            title="현재 예산계정의 모든 단계 양식 설정을 저장합니다">
            💾 전체 저장
          </button>
        </div>
      </div>
    </div>
    `}
  </div>`;
}

// ── 필드별 아이콘 매핑 ──────────────────────────────────────────────────────
const _FORM_FIELD_ICON = {
  edu_purpose:'🎯', edu_type:'📚', course_name:'⭐', is_overseas:'🌐',
  target_audience:'👥', planned_headcount:'👥', planned_rounds:'🔄', planned_days:'📅',
  hours_per_round:'⏱', edu_period:'📆', is_continuing:'🔁', institution_name:'🏛',
  venue_detail:'🏠', venue_type:'🏠', is_ei_eligible:'🏥', education_region:'📍',
  learning_objective:'🎯', course_description:'📝', expected_benefit:'💡',
  supporting_docs:'📎', apply_reason:'💬', course_brochure:'📄',
  learning_content:'📖', planned_hours:'⏱', planned_duration:'⏳',
  overseas_country:'✈️', education_format:'💻', has_accommodation:'🏨',
  lunch_provided:'🍽', is_paid_education:'💳', instructor_name:'👨‍🏫',
  requested_budget:'💰', calc_grounds:'📊', admin_comment:'🔧', allocated_amount:'💵',
  planned_amount:'💰', expected_benefit_op:'💡', edu_method:'🎓',
  is_completed:'✅', score:'📈', actual_hours:'⏱', actual_days:'📅',
  attendance_rate:'📊', review_comment:'💬', work_application_plan:'📋',
  recommendation_target:'👤', share_result:'📤', remarks:'📝',
  satisfaction_rating:'⭐', applicability_rating:'⭐', recommendation_rating:'⭐',
  instructor_rating:'⭐', difficulty_rating:'⭐', relevance_rating:'⭐', facility_rating:'⭐',
  actual_cost:'💰', payment_method:'💳', payment_date:'📅',
  ei_refund_amount:'🏥', payment_completed:'✅',
  completion_cert:'🎓', expense_receipt:'🧾', receipt:'🧾',
};

// ── 필드 토글 렌더 (토글 스위치 1열 리스트 — FO 스타일) ─────────────────────
function _formRenderFieldToggles(stage, usesBudget) {
  const cats = _FORM_FIELDS[stage] || [];
  const stateKey = `${_formSelEduType}|${stage}`;
  const states = _formFieldStates[stateKey] || {};
  const stageM = _FORM_STAGE_META[stage] || {};
  const stageColor = stageM.color || '#6366F1';

  return `<div style="font-size:13px;font-weight:900;color:${stageColor};margin-bottom:12px;display:flex;align-items:center;gap:6px">
    ${stageM.icon || '📝'} ${stageM.label || stage} 필드
  </div>` + cats.map(cat => {
    const isBudgetCat = cat.budgetOnly;
    const catDisabled = isBudgetCat && !usesBudget;
    const isLockedCat = cat.locked;

    return `
    <div style="margin-bottom:16px${catDisabled ? ';opacity:0.45' : ''}">
      <!-- 섹션 헤더 -->
      <div style="font-size:11px;font-weight:800;color:#64748B;margin-bottom:6px;display:flex;align-items:center;gap:5px">
        ${cat.icon} ${cat.cat}
        ${isLockedCat ? '<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:#DBEAFE;color:#1E40AF;font-weight:700">(필수 고정)</span>' : ''}
        ${catDisabled ? '<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:#FEF3C7;color:#92400E;font-weight:700">무예산 비활성</span>' : ''}
      </div>
      <!-- 필드 리스트 -->
      <div style="display:flex;flex-direction:column;gap:4px">
        ${cat.fields.map(f => {
          const isLocked = f.locked || isLockedCat;
          const isOn = isLocked ? true : (states[f.key] !== undefined ? states[f.key] : true);
          const disabled = isLocked || catDisabled;
          const icon = _FORM_FIELD_ICON[f.key] || '📄';

          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
              border:1.5px solid ${isOn ? stageColor + '30' : '#F3F4F6'};
              background:${isOn ? stageColor + '08' : 'white'};
              transition:all .15s;${disabled ? 'cursor:default' : 'cursor:pointer'}"
            ${disabled ? '' : `onclick="_formToggleField('${stateKey}','${f.key}',${!isOn})"`}>
            <span style="font-size:16px;flex-shrink:0">${icon}</span>
            <span style="flex:1;font-size:12px;font-weight:${isOn ? '700' : '500'};color:${isOn ? stageColor : '#6B7280'}">${f.label}</span>
            ${isLocked ? '<span style="font-size:9px;padding:1px 6px;border-radius:4px;background:#FEE2E2;color:#DC2626;font-weight:700">필수</span>' : ''}
            <!-- 토글 스위치 -->
            <div style="width:40px;height:22px;border-radius:11px;position:relative;flex-shrink:0;
              background:${disabled ? (isOn ? '#93C5FD' : '#E5E7EB') : (isOn ? stageColor : '#D1D5DB')};
              transition:background .2s;${disabled ? 'opacity:0.7' : ''}">
              <div style="width:18px;height:18px;border-radius:50%;background:white;position:absolute;top:2px;
                ${isOn ? 'right:2px' : 'left:2px'};box-shadow:0 1px 3px rgba(0,0,0,.2);transition:all .2s"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── 이벤트 핸들러 ───────────────────────────────────────────────────────────
function _formOnTenantChange(v) { _formTenantId = v; _formVorgId = ''; _formAccountCode = ''; _formSelEduType = ''; _formRenderPage(); }
function _formOnVorgChange(v) { _formVorgId = v; _formAccountCode = ''; _formSelEduType = ''; _formRenderPage(); }
function _formOnAccountChange(v) { _formAccountCode = v; _formSelEduType = ''; _formRenderPage(); }
function _formSelectEduType(et) { _formSelEduType = et; _formRenderPage(); }
function _formSelectStage(s) { _formActiveStage = s; _formRenderPage(); }

function _formToggleField(stateKey, fieldKey, val) {
  if (!_formFieldStates[stateKey]) _formFieldStates[stateKey] = {};
  _formFieldStates[stateKey][fieldKey] = val;

  // 스크롤 위치 보존: 토글 영역만 부분 업데이트
  const container = document.getElementById('fm-field-toggles');
  if (container) {
    const scrollTop = container.scrollTop;
    const acc = _formAccountList.find(a => a.code === _formAccountCode);
    const usesBudget = acc?.uses_budget !== false;
    container.innerHTML = _formRenderFieldToggles(_formActiveStage, usesBudget);
    container.scrollTop = scrollTop; // 스크롤 위치 복원
  } else {
    _formRenderPage(); // fallback
  }
}

// ── 저장 ────────────────────────────────────────────────────────────────────
async function _formSave() {
  const acc = _formAccountList.find(a => a.code === _formAccountCode);
  if (!acc) return alert('예산계정을 선택하세요.');

  // 현재 계정의 모든 양식 설정을 수집 (토글 안 한 필드도 기본값으로 명시 저장)
  const formConfig = {};
  const eduTypes = acc.edu_types || [];
  const pattern = acc.process_pattern || 'A';
  const stages = _FORM_PATTERN_STAGES[pattern] || [];

  eduTypes.forEach(et => {
    stages.forEach(s => {
      const key = `${et}|${s}`;
      // _FORM_FIELDS[s] 카탈로그에서 전체 필드 목록 가져와 기본값(false) 초기화
      const allFieldsForStage = {};
      (_FORM_FIELDS[s] || []).forEach(cat => {
        (cat.fields || []).forEach(f => {
          // locked 필드는 항상 true(필수), 나머지도 기본 true(표시) — UI 토글 기본값과 일치
          allFieldsForStage[f.key] = true;
        });
      });
      // 사용자가 토글한 값으로 덮어쓰기
      if (_formFieldStates[key]) {
        Object.assign(allFieldsForStage, _formFieldStates[key]);
      }
      // 하나라도 필드가 있는 경우만 저장
      if (Object.keys(allFieldsForStage).length > 0) {
        if (!formConfig[et]) formConfig[et] = {};
        formConfig[et][s] = allFieldsForStage;
      }
    });
  });

  try {
    const sb = typeof _sb === 'function' ? _sb() : window.__supabase;
    if (!sb) throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.');
    const { error } = await sb.from('budget_accounts')
      .update({ form_config: formConfig, updated_at: new Date().toISOString() })
      .eq('code', _formAccountCode)
      .eq('tenant_id', acc.tenant_id);

    if (error) throw error;

    // 로컬 캐시 업데이트
    const idx = _formAccountList.findIndex(a => a.code === _formAccountCode);
    if (idx >= 0) _formAccountList[idx].form_config = formConfig;

    // FO form_config 캐시 무효화 (fo_form_loader.js 연동)
    if (typeof invalidateFormConfigCache === 'function') {
      invalidateFormConfigCache(_formAccountCode, acc.tenant_id);
    }

    alert('✅ 양식 설정이 저장되었습니다.\nFO에 즉시 반영됩니다.');
  } catch(e) {
    console.error('[FormMgmt] 저장 실패:', e);
    alert('⚠️ 저장 실패: ' + (e.message || '알 수 없는 오류'));
  }
}

// ── 필드 타입별 미리보기 렌더 헬퍼 ──────────────────────────────────────────
function _formPreviewField(f) {
  const lbl = `<label style="display:block;font-size:11px;font-weight:600;color:#4B5563;margin-bottom:3px">
    ${f.label} ${f.locked?'<span style="color:#EF4444">*</span>':''}
    <span style="font-size:9px;color:${_FORM_TYPE_COLOR[f.type]||'#9CA3AF'};margin-left:4px">(${_FORM_TYPE_BADGE[f.type]||f.type||''})</span>
  </label>`;
  const base = 'width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:12px;background:#F9FAFB;box-sizing:border-box';

  switch (f.type) {
    case 'boolean':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0">
          <div style="width:36px;height:20px;border-radius:10px;background:#059669;position:relative;cursor:default">
            <div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;right:2px;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
          </div>
          <span style="font-size:12px;color:#059669;font-weight:600">ON</span>
        </div>
      </div>`;
    case 'textarea':
      return `<div style="margin-bottom:8px">${lbl}
        <textarea disabled rows="3" placeholder="${f.label}을(를) 입력하세요"
          style="${base};resize:none;font-family:inherit"></textarea>
      </div>`;
    case 'number':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="position:relative">
          <input type="number" disabled placeholder="0" style="${base};text-align:right;padding-right:${f.unit?'40px':'12px'}">
          ${f.unit?`<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF;font-weight:600">${f.unit}</span>`:''}
        </div>
      </div>`;
    case 'date':
      return `<div style="margin-bottom:8px">${lbl}
        <input type="date" disabled style="${base}">
      </div>`;
    case 'daterange':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" disabled style="${base};flex:1">
          <span style="color:#9CA3AF;font-size:12px;font-weight:700">~</span>
          <input type="date" disabled style="${base};flex:1">
        </div>
      </div>`;
    case 'select':
      return `<div style="margin-bottom:8px">${lbl}
        <select disabled style="${base};appearance:auto">
          <option>— 선택하세요 —</option>
          ${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}
        </select>
      </div>`;
    case 'file':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="padding:16px;border:2px dashed #D1D5DB;border-radius:10px;text-align:center;background:#FAFAFA">
          <div style="font-size:20px;margin-bottom:4px">📎</div>
          <div style="font-size:11px;color:#6B7280">파일을 여기에 드래그하거나 <span style="color:#6366F1;text-decoration:underline">찾아보기</span></div>
        </div>
      </div>`;
    case 'autocomplete':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="position:relative">
          <input type="text" disabled placeholder="검색어를 입력하세요" style="${base};padding-right:32px">
          <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#9CA3AF">🔍</span>
        </div>
      </div>`;
    case 'rating':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;gap:4px;padding:6px 0">
          ${[1,2,3,4,5].map(n=>`<span style="font-size:20px;color:${n<=4?'#F59E0B':'#D1D5DB'};cursor:default">${n<=4?'★':'☆'}</span>`).join('')}
          <span style="font-size:12px;color:#6B7280;margin-left:6px;align-self:center">4 / 5</span>
        </div>
      </div>`;
    case 'calc_grounds':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="border:1.5px solid #BFDBFE;border-radius:12px;overflow:hidden;background:#F8FBFF">
          <!-- 헤더: 산출근거 제목 + 수식 뱃지 -->
          <div style="padding:10px 14px;background:linear-gradient(135deg,#EFF6FF,#F0F9FF);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px">📋</span>
            <span style="font-size:12px;font-weight:800;color:#1E40AF">세부 산출 근거</span>
            <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#F97316;color:white;font-weight:700">
              🎯 교육운영용 (단가 × 수량1 × 수량2 × 수량3)
            </span>
            <button disabled style="margin-left:auto;padding:4px 10px;border:1px solid #3B82F6;background:#3B82F6;color:white;border-radius:6px;font-size:10px;font-weight:700;cursor:default">
              + 항목추가
            </button>
          </div>
          <div style="padding:6px 14px;font-size:10px;color:#6B7280;background:#F0F9FF;border-bottom:1px solid #DBEAFE">
            항목 선택 → 장소(선택) → 프리셋 선택 시 단가·박수 자동 입력됩니다.
          </div>
          <!-- 테이블 -->
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#EFF6FF">
                  <th style="padding:8px 10px;text-align:left;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">항목</th>
                  <th style="padding:8px 10px;text-align:left;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">세부항목</th>
                  <th style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">단가(원)</th>
                  <th style="padding:8px 10px;text-align:center;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">수량 및 단위</th>
                  <th style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">예산금액(원)</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">비고</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #E5E7EB">
                  <td style="padding:8px 10px">
                    <select disabled style="padding:4px 6px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;background:white;min-width:80px">
                      <option>교육운영비</option>
                    </select>
                  </td>
                  <td style="padding:8px 6px;color:#6B7280;font-size:10px">직접입력</td>
                  <td style="padding:8px 10px;text-align:right">
                    <input type="text" disabled value="50,000" style="width:70px;padding:4px 6px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;text-align:right;background:#F9FAFB">
                  </td>
                  <td style="padding:8px 6px;text-align:center">
                    <div style="display:flex;align-items:center;gap:4px;justify-content:center">
                      <span style="font-size:10px;color:#6B7280">수량</span>
                      <input type="text" disabled value="1" style="width:36px;padding:4px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;text-align:center;background:#F9FAFB">
                      <select disabled style="padding:3px 4px;border:1px solid #D1D5DB;border-radius:6px;font-size:10px;background:white">
                        <option>명</option>
                      </select>
                      <button disabled style="width:18px;height:18px;border:1px solid #D1D5DB;border-radius:4px;font-size:10px;background:#F3F4F6;color:#6B7280;cursor:default">+</button>
                    </div>
                  </td>
                  <td style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;font-size:12px">50,000</td>
                  <td style="padding:8px 6px;text-align:center">
                    <input type="text" disabled style="width:40px;padding:3px;border:1px solid #E5E7EB;border-radius:4px;font-size:10px;background:#FAFAFA">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 합계 -->
          <div style="padding:10px 14px;background:#EFF6FF;border-top:2px solid #BFDBFE;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;font-weight:800;color:#1E40AF">세부 산출 합계</div>
              <div style="font-size:9px;color:#6B7280;margin-top:2px">※ 최대 인원(1명) 기준 1인당 약 50,000원</div>
            </div>
            <div style="font-size:18px;font-weight:900;color:#059669">50,000</div>
          </div>
        </div>
      </div>`;
    default: // text
      return `<div style="margin-bottom:8px">${lbl}
        <input type="text" disabled placeholder="${f.label}을(를) 입력하세요" style="${base}">
      </div>`;
  }
}

// ── 미리보기 (FO 카드 기반 레이아웃) ─────────────────────────────────────────
function _formPreview() {
  try {
  // 선행 조건 검증
  if (!_formAccountCode) { alert('예산계정을 먼저 선택하세요.'); return; }
  if (!_formSelEduType)  { alert('교육유형을 먼저 선택하세요.'); return; }

  // 기존 오버레이 제거 (중복 방지)
  const existing = document.getElementById('fm-preview-overlay');
  if (existing) existing.remove();

  const stage = _formActiveStage;
  const stageM = _FORM_STAGE_META[stage];
  const cats = _FORM_FIELDS[stage] || [];
  const stateKey = `${_formSelEduType}|${stage}`;
  const states = _formFieldStates[stateKey] || {};
  const eduInfo = _formEduTypeInfo(_formSelEduType);
  const acc = _formAccountList.find(a => a.code === _formAccountCode);
  const usesBudget = acc?.uses_budget !== false;

  // 활성 필드만 수집
  const activeFields = [];
  cats.forEach(cat => {
    if (cat.budgetOnly && !usesBudget) return;
    const fields = cat.fields.filter(f => {
      if (f.locked || cat.locked) return true;
      return states[f.key] !== false;
    });
    if (fields.length) activeFields.push({ cat: cat.cat, icon: cat.icon, fields });
  });

  // 모달 렌더
  const overlay = document.createElement('div');
  overlay.id = 'fm-preview-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px)';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
  <div style="background:#F8FAFC;border-radius:20px;width:100%;max-width:700px;max-height:85vh;overflow-y:auto;box-shadow:0 25px 80px rgba(0,0,0,.25)">
    <!-- 헤더 -->
    <div style="padding:18px 24px;display:flex;align-items:center;justify-content:space-between;
      background:white;border-bottom:1px solid #E5E7EB;border-radius:20px 20px 0 0;position:sticky;top:0;z-index:1">
      <div>
        <div style="font-size:15px;font-weight:900;color:#1E293B;display:flex;align-items:center;gap:6px">
          🔍 [미리보기] ${stageM.label}
        </div>
        <div style="font-size:11px;color:#94A3B8;margin-top:3px">
          교육유형: ${eduInfo.breadcrumb} &nbsp;|&nbsp; 계정: ${_formAccountCode}
        </div>
      </div>
      <button onclick="document.getElementById('fm-preview-overlay').remove()"
        style="width:32px;height:32px;border:none;background:#F1F5F9;border-radius:8px;cursor:pointer;font-size:16px;color:#64748B;display:flex;align-items:center;justify-content:center"
        onmouseover="this.style.background='#E2E8F0'" onmouseout="this.style.background='#F1F5F9'">✕</button>
    </div>

    <!-- 본문 -->
    <div style="padding:20px 24px">
      ${activeFields.map(g => `
        <!-- 섹션 카드 -->
        <div style="background:white;border:1px solid #E2E8F0;border-radius:14px;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)">
          <!-- 섹션 헤더 -->
          <div style="padding:12px 18px;background:linear-gradient(135deg,#F8FAFC,#EFF6FF);border-bottom:1px solid #E2E8F0;
            display:flex;align-items:center;gap:8px">
            <span style="font-size:14px">${g.icon}</span>
            <span style="font-size:13px;font-weight:800;color:#1E293B">${g.cat}</span>
          </div>
          <!-- 필드 목록 -->
          <div style="padding:16px 18px">
            ${g.fields.map(f => {
              const icon = _FORM_FIELD_ICON[f.key] || '📄';
              return _formPreviewFieldCard(f, icon);
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;

  document.body.appendChild(overlay);
  } catch(e) {
    console.error('[FormPreview] 미리보기 렌더 오류:', e);
    alert('미리보기를 표시하는 중 오류가 발생했습니다: ' + (e.message || e));
  }
}

// ── 미리보기 필드 렌더 (FO 카드 스타일) ──────────────────────────────────────
function _formPreviewFieldCard(f, icon) {
  const required = f.locked;
  const base = 'width:100%;padding:10px 14px;border:1px solid #E2E8F0;border-radius:10px;font-size:13px;background:#F8FAFC;box-sizing:border-box;color:#374151';
  const labelHtml = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
    <span style="font-size:14px">${icon}</span>
    <span style="font-size:12px;font-weight:700;color:#374151">${f.label}</span>
    ${required ? '<span style="color:#EF4444;font-weight:900">*</span>' : ''}
  </div>`;

  switch (f.type) {
    case 'boolean':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="display:flex;align-items:center;gap:10px;padding:4px 0">
          <div style="width:44px;height:24px;border-radius:12px;background:#3B82F6;position:relative;cursor:default">
            <div style="width:20px;height:20px;border-radius:50%;background:white;position:absolute;top:2px;right:2px;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
          </div>
          <span style="font-size:12px;color:#3B82F6;font-weight:700">ON</span>
        </div>
      </div>`;
    case 'textarea':
      return `<div style="margin-bottom:14px">${labelHtml}
        <textarea disabled rows="3" placeholder="${f.label}을(를) 입력하세요"
          style="${base};resize:none;font-family:inherit;min-height:70px"></textarea>
      </div>`;
    case 'number':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="position:relative">
          <input type="number" disabled placeholder="0" style="${base};text-align:right;padding-right:${f.unit?'40px':'14px'}">
          ${f.unit?`<span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:12px;color:#94A3B8;font-weight:600">${f.unit}</span>`:''}
        </div>
      </div>`;
    case 'daterange':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="display:flex;gap:10px;align-items:center">
          <div style="flex:1">
            <div style="font-size:10px;color:#94A3B8;margin-bottom:3px">시작일</div>
            <input type="date" disabled style="${base}">
          </div>
          <div style="flex:1">
            <div style="font-size:10px;color:#94A3B8;margin-bottom:3px">종료일</div>
            <input type="date" disabled style="${base}">
          </div>
        </div>
      </div>`;
    case 'date':
      return `<div style="margin-bottom:14px">${labelHtml}
        <input type="date" disabled style="${base}">
      </div>`;
    case 'select':
      return `<div style="margin-bottom:14px">${labelHtml}
        <select disabled style="${base};appearance:auto">
          <option>— 선택하세요 —</option>
          ${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}
        </select>
      </div>`;
    case 'file':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="padding:20px;border:2px dashed #CBD5E1;border-radius:12px;text-align:center;background:#FAFBFC">
          <div style="font-size:24px;margin-bottom:6px">📎</div>
          <div style="font-size:11px;color:#64748B">파일을 여기에 드래그하거나 <span style="color:#3B82F6;font-weight:700;text-decoration:underline">찾아보기</span></div>
        </div>
      </div>`;
    case 'autocomplete':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="display:flex;gap:8px">
          <input type="text" disabled placeholder="[검색] 버튼을 클릭하세요" style="${base};flex:1">
          <button disabled style="padding:8px 16px;border:1px solid #3B82F6;background:#3B82F6;color:white;border-radius:10px;font-size:12px;font-weight:700;cursor:default;white-space:nowrap">검색</button>
        </div>
      </div>`;
    case 'rating':
      return `<div style="margin-bottom:14px">${labelHtml}
        <div style="display:flex;gap:4px;padding:4px 0">
          ${[1,2,3,4,5].map(n=>`<span style="font-size:22px;color:${n<=4?'#F59E0B':'#E2E8F0'};cursor:default">${n<=4?'★':'☆'}</span>`).join('')}
          <span style="font-size:12px;color:#64748B;margin-left:8px;align-self:center">4 / 5</span>
        </div>
      </div>`;
    case 'calc_grounds':
      return _formPreviewField(f);
    default:
      return `<div style="margin-bottom:14px">${labelHtml}
        <input type="text" disabled placeholder="${f.label}을(를) 입력하세요" style="${base}">
      </div>`;
  }
}

// ── 초기 로드 시 DB에서 기존 설정 복원 ──────────────────────────────────────
function _formLoadExistingConfig(acc) {
  if (!acc?.form_config) return;
  Object.entries(acc.form_config).forEach(([et, stages]) => {
    Object.entries(stages).forEach(([stage, fields]) => {
      _formFieldStates[`${et}|${stage}`] = { ...fields };
    });
  });
}
