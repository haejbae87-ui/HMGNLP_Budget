// ─── 교육신청양식마법사 (Form Builder Enhanced) ─────────────────────────────────
// 3탭 구조: ① 양식 라이브러리 ② 양식 빌더 ③ 서비스 통합 매핑
// 기획안 기반 고도화: 양식 분류체계, 입력 주체 제어, 조건부 로직, 서비스 매핑

// ── 상수 정의 ──────────────────────────────────────────────────────────────────
const FORM_TARGET_TYPES = {
  learner: { label: '학습자용', icon: '👤', color: '#059669', bg: '#F0FDF4', desc: '개인직무 사외학습 신청' },
  manager: { label: '교육담당자용', icon: '🎓', color: '#7C3AED', bg: '#F5F3FF', desc: '집합/운영/세미나/기타' },
};

const FORM_SERVICE_TYPES = {
  individual:  { label: '개인직무 사외학습', target: 'learner', icon: '🙋', color: '#059669' },
  group:       { label: '집합/이러닝 운영',  target: 'manager', icon: '🏫', color: '#7C3AED' },
  seminar:     { label: '컨퍼런스/세미나/워크샵', target: 'manager', icon: '🎤', color: '#0369A1' },
  etc:         { label: '기타 항목 관리',    target: 'manager', icon: '📦', color: '#D97706' },
};

const FORM_STAGE_TYPES = {
  plan:   { label: '교육계획 (Plan)',   icon: '📋', color: '#7C3AED', bg: '#F5F3FF' },
  apply:  { label: '교육신청 (Apply)',  icon: '📄', color: '#059669', bg: '#F0FDF4' },
  result: { label: '교육결과 (Result)', icon: '📝', color: '#D97706', bg: '#FFFBEB' },
};

const PROCESS_PATTERNS = {
  A: { label: '패턴 A', desc: '계획 → 신청 → 결과', stages: ['plan','apply','result'], color: '#7C3AED' },
  B: { label: '패턴 B', desc: '신청 → 결과',         stages: ['apply','result'],       color: '#059669' },
  C: { label: '패턴 C', desc: '신청 단독 (후정산)',    stages: ['apply'],               color: '#0369A1' },
};

// 폼 목적 (purpose) 정의 ────────────────────────────────────────────────────────────
const FORM_PURPOSE_TYPES = {
  individual: { label: '개인직무 사외학습',               icon: '🙋', color: '#059669', bg: '#F0FDF4', targetUser: 'learner' },
  elearning:  { label: '이러닝/집합(비대면) 운영',       icon: '🏢', color: '#7C3AED', bg: '#F5F3FF', targetUser: 'admin' },
  seminar:    { label: '콘퍼런스/세미나/워크숍 등 운영', icon: '🎤', color: '#0369A1', bg: '#EFF6FF', targetUser: 'admin' },
  etc:        { label: '기타 운영',                       icon: '📦', color: '#D97706', bg: '#FFFBEB', targetUser: 'admin' },
};

// 교육유형 + 세부유형 2-depth 맵 ──────────────────────────────────────────────────────
const FORM_EDU_TYPES = {
  individual: [
    { type: '정규교육',        sub: ['이러닝', '집합', '라이브'] },
    { type: '학술 및 연구활동', sub: ['학회/세미나/컨퍼런스', '학회 직접 발표', '연수'] },
    { type: '지식자원학습',    sub: ['도서', '논문/저널', '기술자료(DB구독·자료구매)'] },
    { type: '역량개발지원',    sub: ['어학학습비 지원', '자격증 취득지원', '학협회비'] },
    { type: '기타',            sub: ['교육출강(사/내외)', '팀빌딩'] },
  ],
  elearning: [
    { type: '이러닝',   sub: [] },
    { type: '집합(비대면)', sub: [] },
  ],
  seminar: [
    { type: '콘퍼런스', sub: [] },
    { type: '세미나',    sub: [] },
    { type: '팀빌딩',   sub: [] },
    { type: '자격유지',  sub: [] },
    { type: '제도연계',  sub: [] },
  ],
  etc: [
    { type: '과정개발',   sub: [] },
    { type: '교안개발',   sub: [] },
    { type: '영상제작',   sub: [] },
    { type: '교육시설운영', sub: [] },
  ],
};

// 확장된 필드 라이브러리 - 입력 주체(scope) + 필드 타입(fieldType) 포함
// fieldType: text | textarea | date | daterange | number | user-search | file | rating | select | calc-grounds | budget-linked | system
var ADVANCED_FIELDS = [
  // 공통 기본 필드
  { key: '교육목적',      icon: '🎯', required: true,  scope: 'front',  category: '기본정보',     fieldType: 'textarea',      hint: '학습 목표 및 기대효과' },
  { key: '교육기간',      icon: '📅', required: true,  scope: 'front',  category: '기본정보',     fieldType: 'daterange',     hint: '시작일~종료일' },
  { key: '교육기관',      icon: '🏫', required: true,  scope: 'front',  category: '기본정보',     fieldType: 'text',          hint: '교육 제공 기관명' },
  { key: '과정명',        icon: '📚', required: true,  scope: 'front',  category: '기본정보',     fieldType: 'text',          hint: '교육과정/행사명' },
  { key: '장소',          icon: '📍', required: false, scope: 'front',  category: '기본정보',     fieldType: 'text',          hint: '교육 장소' },
  { key: '기대효과',      icon: '✨', required: false, scope: 'front',  category: '기본정보',     fieldType: 'textarea',      hint: '참가 후 기대되는 효과' },
  // 비용 관련
  { key: '예상비용',      icon: '💰', required: true,  scope: 'front',  category: '비용정보',     fieldType: 'budget-linked', hint: '예상 총 비용 — 조직 예산 잔액 연동', budget: true },
  { key: '교육비',        icon: '💳', required: true,  scope: 'front',  category: '비용정보',     fieldType: 'number',        hint: '수강료/등록비 (원 단위)' },
  { key: '참가비',        icon: '💲', required: false, scope: 'front',  category: '비용정보',     fieldType: 'number',        hint: '행사 참가비 (원 단위)' },
  { key: '강사료',        icon: '👨‍🏫', required: false, scope: 'front',  category: '비용정보',    fieldType: 'number',        hint: '외부 강사 강의료', trigger: '강사이력서' },
  { key: '대관비',        icon: '🏛️', required: false, scope: 'front',  category: '비용정보',     fieldType: 'number',        hint: '장소 대관 비용' },
  { key: '식대/용차',     icon: '🍽️', required: false, scope: 'front',  category: '비용정보',     fieldType: 'number',        hint: '식비 및 운송비' },
  { key: '실지출액',      icon: '🧾', required: false, scope: 'back',   category: '비용정보',     fieldType: 'number',        hint: '승인자 확정 실지출 인정액' },
  { key: '세부산출근거',  icon: '📐', required: false, scope: 'front',  category: '비용정보',     fieldType: 'calc-grounds',  hint: '세부산출근거 항목 선택 (테넌트별 자동 로드)' },
  // 인원 관련
  { key: '수강인원',      icon: '👥', required: false, scope: 'front',  category: '인원정보',     fieldType: 'number',        hint: '예상 수강 인원 (명)' },
  { key: '정원',          icon: '🪑', required: false, scope: 'front',  category: '인원정보',     fieldType: 'number',        hint: '최대 정원 (명)' },
  { key: '참여자명단',    icon: '📋', required: false, scope: 'front',  category: '인원정보',     fieldType: 'user-search',   hint: '참여자 검색 및 명단 구성' },
  { key: '강사정보',      icon: '🎤', required: false, scope: 'front',  category: '인원정보',     fieldType: 'user-search',   hint: '강사 검색 — 내부 사용자 조회' },
  // 첨부 서류
  { key: '첨부파일',      icon: '📎', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '관련 서류 첨부' },
  { key: '강사이력서',    icon: '📄', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '외부강사 이력서 (강사료 선택 시 자동 활성화)' },
  { key: '보안서약서',    icon: '🔒', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '보안 서약서 서명' },
  { key: '영수증',        icon: '🧾', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '결제 영수증/증빙' },
  { key: '수료증',        icon: '🎓', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '수료증 업로드' },
  { key: '대관확정서',    icon: '📜', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '장소 대관 확정서' },
  { key: '납품확인서',    icon: '✅', required: false, scope: 'front',  category: '첨부서류',     fieldType: 'file',          hint: '물품 납품 확인서' },
  // 결과 관련
  { key: '수료생명단',    icon: '📝', required: false, scope: 'front',  category: '결과정보',     fieldType: 'user-search',   hint: '최종 수료자 명단' },
  { key: '학습만족도',    icon: '⭐', required: false, scope: 'front',  category: '결과정보',     fieldType: 'rating',        hint: '만족도 조사 (5점 척도)' },
  { key: '교육결과요약',  icon: '📊', required: false, scope: 'front',  category: '결과정보',     fieldType: 'textarea',      hint: '교육 결과 요약 보고' },
  // 백오피스 전용 (승인자)
  { key: 'ERP코드',       icon: '🔗', required: false, scope: 'back',   category: '관리(승인자)', fieldType: 'text',          hint: 'ERP 연동 비용 코드' },
  { key: '검토의견',      icon: '💬', required: false, scope: 'back',   category: '관리(승인자)', fieldType: 'textarea',      hint: '승인자 검토 및 의견' },
  { key: '관리자비고',    icon: '📌', required: false, scope: 'back',   category: '관리(승인자)', fieldType: 'textarea',      hint: '관리자 내부 메모' },
  // 연결/시스템 필드
  { key: '계획서연결',    icon: '🔗', required: false, scope: 'system', category: '시스템',       fieldType: 'system',        hint: '연결된 교육계획 양식 자동 불러오기' },
  { key: '예산계정',      icon: '💼', required: false, scope: 'system', category: '시스템',       fieldType: 'budget-linked', hint: '예산 계정 잔액 실시간 연동', budget: true },
];

// 서비스 매핑 데이터 (테넌트별 관리)
let SERVICE_MAPPINGS = [
  {
    id: 'SVC_HMC_01', tenantId: 'HMC',
    name: '개인직무 사외학습 지원',
    target: 'learner', serviceType: 'individual', pattern: 'B',
    formSets: { apply: 'FM001', result: 'FM004' },
    desc: '일반직군 학습자가 사외교육 신청 후 결과를 보고하는 패턴',
  },
  {
    id: 'SVC_HMC_02', tenantId: 'HMC',
    name: 'R&D 집합/이러닝 과정 운영',
    target: 'manager', serviceType: 'group', pattern: 'A',
    formSets: { plan: 'FM002', apply: 'FM003', result: 'FM005' },
    desc: 'R&D 교육담당자가 과정 기획부터 결과까지 전체 관리',
  },
];

// 현재 탭 상태
let _fbCurrentTab   = 'library'; // 'library' | 'library' | 'mapping'
let _fbEditId       = null;
let _fbTempFields   = []; // { key, scope:'front'|'back', order }
let _fbBuilderMode  = 'create'; // 'create' | 'edit'

// ─── 역할별 필터 상태 ─────────────────────────────────────────────────────────
let _fbTenantId      = null;
let _fbGroupId       = null;
let _fbAccountCode   = null;
let _fbPurposeFilter = '';   // '' = 전체
let _fbEduTypeFilter = '';   // '' = 전체

// ── 메인 진입점 ────────────────────────────────────────────────────────────────
function renderFormBuilderMenu() {
  const role    = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';

  // 테넌트 초기화
  if (!_fbTenantId) {
    _fbTenantId = isPlatform ? (tenants[0]?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');
  }
  // 격리그룹 초기화
  if (!_fbGroupId) {
    const groups = typeof ISOLATION_GROUPS !== 'undefined'
      ? ISOLATION_GROUPS.filter(g => g.tenantId === _fbTenantId) : [];
    _fbGroupId = groups[0]?.id || null;
  }
  // 계정 초기화
  if (!_fbAccountCode) {
    const grp = typeof ISOLATION_GROUPS !== 'undefined'
      ? ISOLATION_GROUPS.find(g => g.id === _fbGroupId) : null;
    const accs = grp?.ownedAccounts || [];
    _fbAccountCode = accs[0] || null;
  }

  document.getElementById('bo-content').innerHTML = _fbRenderPage();
}

function _fbRenderPage() {
  const role      = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';
  const tenants    = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const tenantName = tenants.find(t => t.id === _fbTenantId)?.name || _fbTenantId || '';

  // 격리그룹 목록
  const groups = typeof ISOLATION_GROUPS !== 'undefined'
    ? ISOLATION_GROUPS.filter(g => g.tenantId === _fbTenantId) : [];
  // 선택된 격리그룹의 예산 계정
  const selGroup = groups.find(g => g.id === _fbGroupId);
  const accounts = selGroup ? (selGroup.ownedAccounts || []).map(code => {
    const acc = typeof ACCOUNT_MASTER !== 'undefined' ? ACCOUNT_MASTER.find(a => a.code === code) : null;
    return { code, name: acc?.name || code };
  }) : [];

  // ── 필터바 (플랫폼·테넌트총괄에게만 표시) ──────────────────────────────────
  // 행 1: 데이터 범위 필터 (tenant/group/account)
  const filterBar = (isPlatform || isTenant) ? `
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:13px 18px;
              background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:14px 14px 0 0;margin-bottom:0">
    ${ isPlatform ? `
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">회사</label>
      <select onchange="_fbTenantId=this.value;_fbGroupId=null;_fbAccountCode=null;_fbPurposeFilter='';_fbEduTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
        ${tenants.map(t => `<option value="${t.id}" ${t.id===_fbTenantId?'selected':''}>${t.name}</option>`).join('')}
      </select>
    </div>
    <span style="color:#D1D5DB">|</span>` : `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:14px">🏢</span>
      <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
    </div>
    <span style="color:#D1D5DB">|</span>`}
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">격리그룹</label>
      <select onchange="_fbGroupId=this.value;_fbAccountCode=null;_fbPurposeFilter='';_fbEduTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        <option value="">— 그룹 선택 —</option>
        ${groups.map(g => `<option value="${g.id}" ${g.id===_fbGroupId?'selected':''}>${g.name}</option>`).join('')}
      </select>
    </div>
    <span style="color:#D1D5DB">|</span>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">예산계정</label>
      <select onchange="_fbAccountCode=this.value;_fbPurposeFilter='';_fbEduTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        <option value="">— 계정 선택 —</option>
        ${accounts.map(a => `<option value="${a.code}" ${a.code===_fbAccountCode?'selected':''}>${a.name}</option>`).join('')}
      </select>
    </div>
  </div>` : '';

  // 행 2: 목적/교육유형 필터 (모든 역할 공통, 계정 선택 시만 활성화)
  const eduTypesForPurpose = _fbPurposeFilter ? (FORM_EDU_TYPES[_fbPurposeFilter] || []) : [];
  const filterBar2 = `
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 18px;
              background:#F0F4FF;border:1.5px solid #E0E7FF;border-top:1px solid #C7D2FE;
              border-radius:${(isPlatform||isTenant)?'0 0 14px 14px':'14px'};margin-bottom:20px">
    <span style="font-size:11px;font-weight:700;color:#4B5563">🔍 세부 필터</span>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">목적</label>
      <select onchange="_fbPurposeFilter=this.value;_fbEduTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #C4B5FD;border-radius:8px;font-size:12px;font-weight:700;background:#EDE9FE;color:#5B21B6;cursor:pointer;min-width:170px">
        <option value="">📊 전체 목적</option>
        ${Object.entries(FORM_PURPOSE_TYPES).map(([k,v]) =>
          `<option value="${k}" ${_fbPurposeFilter===k?'selected':''}>${v.icon} ${v.label}</option>`
        ).join('')}
      </select>
    </div>
    <span style="color:#D1D5DB">|</span>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">교육유형</label>
      <select onchange="_fbEduTypeFilter=this.value;renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px"
        ${!_fbPurposeFilter ? 'disabled' : ''}>
        <option value="">— 전체 교육유형 —</option>
        ${eduTypesForPurpose.map(t =>
          `<option value="${t.type}" ${_fbEduTypeFilter===t.type?'selected':''}>${t.type}</option>`
        ).join('')}
      </select>
    </div>
    <span style="color:#D1D5DB">|</span>
    <button onclick="renderFormBuilderMenu()"
      style="padding:7px 16px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button>
    ${(_fbPurposeFilter||_fbEduTypeFilter||(isPlatform&&_fbAccountCode)||(isTenant&&_fbAccountCode)) ? `
    <button onclick="_fbPurposeFilter='';_fbEduTypeFilter='';renderFormBuilderMenu()"
      style="padding:7px 12px;background:#F3F4F6;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">✕ 필터 완전 초기화</button>` : ''}
  </div>`;

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">양식 관리</span>
      <h1 class="bo-page-title" style="margin:0">🧙 교육신청양식마법사</h1>
    </div>
    <p class="bo-page-sub">교육 서비스에 사용할 양식을 제작하고, 프로세스 패턴과 연결합니다.</p>
  </div>

  ${filterBar}
  ${filterBar2}

  <!-- 탭 네비게이션 -->
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:24px">
    ${_fbTabBtn('library', '📚 양식 라이브러리')}
    ${_fbTabBtn('mapping', '🔗 서비스 통합 매핑')}
  </div>

  <!-- 탭 콘텐츠 -->
  <div id="fb-tab-content">
    ${_fbCurrentTab === 'library' ? _fbRenderLibrary() : _fbRenderMapping()}
  </div>
</div>

<!-- 빌더 상세 모달 -->
<div id="fb-field-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;align-items:flex-start;justify-content:center;padding-top:30px;overflow-y:auto">
  <div style="background:#fff;border-radius:16px;width:720px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25);margin-bottom:40px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="fb-modal-title" style="font-size:16px;font-weight:900;margin:0">양식 신규 생성</h3>
      <button onclick="fbCloseModal()" style="border:none;background:none;font-size:22px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="fb-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #E5E7EB">
      <button class="bo-btn-secondary bo-btn-sm" onclick="fbCloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="fbSaveForm()">💾 저장</button>
    </div>
  </div>
</div>`;
}

function _fbTabBtn(id, label) {
  const active = _fbCurrentTab === id;
  return `<button onclick="_fbSwitchTab('${id}')" style="
    padding:10px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:${active?'900':'600'};
    color:${active?'#7C3AED':'#6B7280'};border-bottom:${active?'3px solid #7C3AED':'3px solid transparent'};
    margin-bottom:-2px;transition:all .15s">${label}</button>`;
}

function _fbSwitchTab(tab) {
  _fbCurrentTab = tab;
  document.getElementById('bo-content').innerHTML = _fbRenderPage();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① 양식 라이브러리 탭 - 목적→교육유형→세부유형→단계 계층 구조
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fbRenderLibrary() {
  const role       = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';

  // 필터 기준 테넌트 결정
  const tenantId = (isPlatform || isTenant) ? (_fbTenantId || boCurrentPersona.tenantId) : (boCurrentPersona.tenantId || 'HMC');
  let allForms = FORM_MASTER.filter(f => f.tenantId === tenantId);

  // 격리그룹 필터 적용 (isolationGroupId 없는 구형 양식은 하위호환으로 항상 표시)
  if (_fbGroupId) {
    allForms = allForms.filter(f => !f.isolationGroupId || f.isolationGroupId === _fbGroupId);
  }
  // 예산계정 필터 적용 (accountCode 없는 구형 양식은 하위호환으로 항상 표시)
  if (_fbAccountCode) {
    allForms = allForms.filter(f => !f.accountCode || f.accountCode === _fbAccountCode);
  }

  // 목적 필터 적용
  if (_fbPurposeFilter) {
    allForms = allForms.filter(f => f.purpose === _fbPurposeFilter);
  }
  // 교육유형 필터 적용
  if (_fbEduTypeFilter) {
    allForms = allForms.filter(f => f.eduType === _fbEduTypeFilter);
  }

  // 상단 버튼
  const addBtn = `
<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
  <button class="bo-btn-primary" onclick="fbOpenBuilderModal()"
    style="display:flex;align-items:center;gap:6px;padding:9px 18px">＋ 새 양식 만들기</button>
</div>`;

  // 전체 요약 배지
  const totalByStage = stage => allForms.filter(f => f.type === stage).length;
  const summaryBar = `
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
  ${Object.entries(FORM_STAGE_TYPES).map(([k,v]) => `
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:${v.bg};
              border-radius:20px;border:1.5px solid ${v.color}20">
    <span style="font-size:13px">${v.icon}</span>
    <span style="font-size:11px;font-weight:800;color:${v.color}">${v.label.split('(')[0].trim()}</span>
    <span style="font-size:11px;font-weight:900;color:${v.color}">${totalByStage(k)}개</span>
  </div>`).join('')}
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:#F9FAFB;
              border-radius:20px;border:1.5px solid #E5E7EB">
    <span style="font-size:11px;font-weight:700;color:#374151">전체</span>
    <span style="font-size:11px;font-weight:900;color:#111827">${allForms.length}개</span>
  </div>
</div>`;

  // 목적별 계층 렌더링
  const purposeBlocks = Object.entries(FORM_PURPOSE_TYPES).map(([purposeKey, pInfo]) => {
    const eduTypes = FORM_EDU_TYPES[purposeKey] || [];

    // 이 목적에 해당하는 양식 전부
    const purposeForms = allForms.filter(f => f.purpose === purposeKey);
    // 분류 미지정 양식도 포함 (purpose 없는 것들을 첫 번째 목적 블록에서 별도 처리)
    const unclassified = purposeKey === Object.keys(FORM_PURPOSE_TYPES)[0]
      ? allForms.filter(f => !f.purpose) : [];

    if (purposeForms.length === 0 && unclassified.length === 0) return ''; // 빈 목적 숨김

    // 교육유형이 있는 목적: 유형별 그룹화
    let eduTypeBlocks = '';
    if (eduTypes.length > 0) {
      eduTypeBlocks = eduTypes.map(et => {
        // 세부유형이 있는 경우: 세부유형별 그룹화
        if (et.sub.length > 0) {
          const subBlocks = et.sub.map(sub => {
            const subForms = purposeForms.filter(f => f.eduType === et.type && f.eduSubType === sub);
            if (subForms.length === 0) return '';
            return `
<div style="margin-left:16px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
    <span style="font-size:9px;font-weight:900;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:10px">${sub}</span>
    ${_fbStageMiniSet(subForms)}
  </div>
  <div style="margin-left:4px">${subForms.map(f => _fbFormCard(f)).join('')}</div>
</div>`;
          }).join('');

          // 세부유형 미지정 양식
          const unsubForms = purposeForms.filter(f => f.eduType === et.type && !f.eduSubType);
          const unsubBlock = unsubForms.length > 0 ? `
<div style="margin-left:16px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
    <span style="font-size:9px;font-weight:900;background:#F9FAFB;color:#9CA3AF;padding:2px 8px;border-radius:10px">세부유형 미지정</span>
    ${_fbStageMiniSet(unsubForms)}
  </div>
  <div style="margin-left:4px">${unsubForms.map(f => _fbFormCard(f)).join('')}</div>
</div>` : '';

          if (!subBlocks && !unsubBlock) return '';
          const typeForms = purposeForms.filter(f => f.eduType === et.type);
          return `
<div style="margin-bottom:14px;padding:12px 14px;background:#F9FAFB;border-radius:10px;border-left:3px solid #7C3AED40">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
    <span style="font-size:11px;font-weight:900;color:#7C3AED">📂 ${et.type}</span>
    ${_fbStageMiniSet(typeForms)}
  </div>
  ${subBlocks}${unsubBlock}
</div>`;

        } else {
          // 세부유형 없는 교육유형: 바로 양식 카드
          const typeForms = purposeForms.filter(f => f.eduType === et.type);
          if (typeForms.length === 0) return '';
          return `
<div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px;border-left:3px solid #7C3AED40">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:11px;font-weight:900;color:#7C3AED">📂 ${et.type}</span>
    ${_fbStageMiniSet(typeForms)}
  </div>
  ${typeForms.map(f => _fbFormCard(f)).join('')}
</div>`;
        }
      }).join('');

      // 교육유형 미지정 양식
      const untyped = purposeForms.filter(f => !f.eduType);
      const untypedBlock = untyped.length > 0 ? `
<div style="margin-bottom:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px;border-left:3px dashed #D1D5DB">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:11px;font-weight:700;color:#9CA3AF">📂 교육유형 미지정</span>
    ${_fbStageMiniSet(untyped)}
  </div>
  ${untyped.map(f => _fbFormCard(f)).join('')}
</div>` : '';

      eduTypeBlocks = eduTypeBlocks + untypedBlock;

    } else {
      // 교육유형 정의 없는 목적: 바로 양식 나열
      eduTypeBlocks = purposeForms.map(f => _fbFormCard(f)).join('');
    }

    // 분류 미지정 블록 (purpose 없음)
    const unclassifiedBlock = unclassified.length > 0 ? `
<div style="margin-bottom:10px">
  <div style="font-size:10px;font-weight:700;color:#9CA3AF;margin-bottom:6px">📋 분류 미지정</div>
  ${unclassified.map(f => _fbFormCard(f)).join('')}
</div>` : '';

    return `
<div style="margin-bottom:28px">
  <!-- 목적 헤더 -->
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:12px 16px;
              background:${pInfo.bg};border-radius:12px;border:1.5px solid ${pInfo.color}30">
    <span style="font-size:16px">${pInfo.icon}</span>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:900;color:${pInfo.color}">${pInfo.label}</div>
    </div>
    ${_fbStageMiniSet([...purposeForms, ...unclassified])}
  </div>
  ${eduTypeBlocks}
  ${unclassifiedBlock}
</div>`;
  }).join('');

  // 어떤 목적에도 속하지 않는 양식 처리 (purpose 필드 없음, 첫 블록에서 이미 처리됐으니 여기선 skip)

  return addBtn + summaryBar + (purposeBlocks || `
<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:16px;border:1px dashed #D1D5DB">
  <div style="font-size:32px;margin-bottom:8px">📭</div>
  <div style="font-size:14px;font-weight:700;color:#374151">등록된 양식이 없습니다</div>
  <div style="font-size:12px;color:#9CA3AF;margin-top:4px">새 양식 만들기 버튼으로 첫 양식을 추가하세요</div>
</div>`);
}

// 단계별 미니 배지 세트 (계획N / 신청N / 결과N)
function _fbStageMiniSet(forms) {
  return Object.entries(FORM_STAGE_TYPES).map(([k, v]) => {
    const cnt = forms.filter(f => f.type === k).length;
    if (cnt === 0) return '';
    return `<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:${v.bg};color:${v.color};font-weight:800;border:1px solid ${v.color}30">${v.icon.trim()} ${v.label.split('(')[0].replace('교육','').trim()} ${cnt}</span>`;
  }).join(' ');
}

function _fbFormCard(f) {
  const s      = FORM_STAGE_TYPES[f.type] || FORM_STAGE_TYPES.apply;
  const fields = (f.fields || []);
  const fieldNames = fields.map(fld => typeof fld === 'object' ? fld.key : fld).join(', ');

  // 서비스 정책 및 구버전 서비스 매핑 확인
  const mappedPolicy = (typeof SERVICE_POLICIES !== 'undefined') ? SERVICE_POLICIES.find(p => {
    const list1 = p.formIds || [];
    const list2 = p.stage_form_ids ? Object.values(p.stage_form_ids) : [];
    const list3 = p.formSets ? Object.values(p.formSets) : [];
    const list4 = p.stageFormIds ? Object.values(p.stageFormIds) : [];
    return [...list1, ...list2, ...list3, ...list4].includes(f.id);
  }) : null;
  const mappedLegacy = (typeof SERVICE_MAPPINGS !== 'undefined') ? SERVICE_MAPPINGS.find(m => Object.values(m.formSets || {}).includes(f.id)) : null;
  
  const isMapped = mappedPolicy || mappedLegacy;
  const mapName = mappedPolicy ? mappedPolicy.name : (mappedLegacy ? mappedLegacy.name : '');

  return `
<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;
            border-left:3px solid ${s.color};background:#fff;border-radius:8px;
            margin-bottom:5px;border:1px solid #F3F4F6;border-left-width:3px;
            transition:background .1s" 
     onmouseover="this.style.background='${s.bg}'" 
     onmouseout="this.style.background='#fff'">
  <!-- 단계 뱃지 -->
  <span style="flex-shrink:0;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;
               background:${s.bg};color:${s.color};min-width:48px;text-align:center">
    ${s.icon} ${s.label.split('(')[0].trim()}
  </span>
  <!-- 양식명 -->
  <span style="flex:1;font-size:12px;font-weight:800;color:#111827;overflow:hidden;
               text-overflow:ellipsis;white-space:nowrap;cursor:default"
        title="${f.name}${f.desc ? ' — '+f.desc : ''}">
    ${f.name}
    ${isMapped ? ` <span style="font-size:10px;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;vertical-align:middle;margin-left:6px" title="이 양식은 [${mapName}] 정책에 연동되어 있습니다.">[🔒 ${mapName} 연결됨]</span>` : ''}
  </span>
  <!-- 필드 수 -->
  <span title="포함 필드: ${fieldNames}"
        style="flex-shrink:0;font-size:10px;color:#6B7280;background:#F3F4F6;
               padding:2px 8px;border-radius:10px;cursor:default;white-space:nowrap">
    📋 ${fields.length}개 필드
  </span>
  <!-- 활성 상태 -->
  <span class="bo-badge ${f.active ? 'bo-badge-green' : 'bo-badge-gray'}" style="flex-shrink:0">
    ${f.active ? '활성' : '비활성'}
  </span>
  <!-- 액션 버튼 -->
  <div style="display:flex;gap:4px;flex-shrink:0">
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbPreviewForm('${f.id}')">🔍 미리보기</button>
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbOpenBuilderModal('${f.id}')">✏️ 수정</button>
    <button onclick="fbToggleActive('${f.id}')"
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${f.active ? '#F59E0B' : '#059669'};
             background:#fff;color:${f.active ? '#F59E0B' : '#059669'};font-size:10px;font-weight:800;cursor:pointer">
      ${f.active ? '비활성화' : '활성화'}
    </button>
    <button ${isMapped ? `disabled title="${mapName} 정책에 연결되어 삭제할 수 없습니다."` : `onclick="fbDeleteForm('${f.id}')"`}
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${isMapped ? '#E5E7EB' : '#EF4444'};
             background:#fff;color:${isMapped ? '#9CA3AF' : '#EF4444'};font-size:10px;font-weight:800;cursor:${isMapped ? 'not-allowed' : 'pointer'}">
      삭제
    </button>
  </div>
</div>`;
}

async function fbDeleteForm(formId) {
  if (!confirm('정말로 이 양식을 삭제하시겠습니까? (삭제 후 복구 불가)')) return;
  
  // 1) 메모리 삭제
  if (typeof FORM_MASTER !== 'undefined') {
    const idx = FORM_MASTER.findIndex(x => x.id === formId);
    if (idx > -1) FORM_MASTER.splice(idx, 1);
  }
  
  // 2) DB 삭제
  if (typeof sbDeleteFormTemplate === 'function') {
    const ok = await sbDeleteFormTemplate(formId);
    if (!ok) {
      console.warn('[FormBuilder] DB 삭제 실패 - 메모리에서만 삭제되었습니다.');
    }
  }

  // 3) UI 갱신
  renderFormBuilderMenu();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ 서비스 통합 매핑 탭
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fbRenderMapping() {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const myMaps   = SERVICE_MAPPINGS.filter(m => m.tenantId === tenantId);
  const myForms  = FORM_MASTER.filter(f => f.tenantId === tenantId && f.active);

  const mapCard = (m) => {
    const st = FORM_SERVICE_TYPES[m.serviceType] || {};
    const pt = PROCESS_PATTERNS[m.pattern]  || {};
    const tg = FORM_TARGET_TYPES[m.target]  || {};
    const formSet = m.formSets || {};

    const stageRow = (stage, fId) => {
      const s = FORM_STAGE_TYPES[stage];
      const f = myForms.find(x => x.id === fId);
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${s.bg};border-radius:8px;margin-bottom:4px">
        <span style="font-size:10px;font-weight:900;color:${s.color};min-width:48px">${s.icon} ${stage.toUpperCase()}</span>
        <span style="font-size:11px;font-weight:700;color:#111827">${f ? f.name : '<span style="color:#EF4444">미연결</span>'}</span>
      </div>`;
    };

    return `<div class="bo-card" style="padding:20px;margin-bottom:12px;border-left:4px solid ${st.color||'#E5E7EB'}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:900;color:${st.color};background:${st.color}15;padding:2px 8px;border-radius:6px">${st.icon||''} ${st.label||''}</span>
            <span style="font-size:11px;font-weight:900;color:${tg.color};background:${tg.bg};padding:2px 8px;border-radius:6px">${tg.icon||''} ${tg.label||''}</span>
            <span style="font-size:11px;font-weight:900;color:${pt.color};background:${pt.color}15;padding:2px 8px;border-radius:6px">${pt.label||''}: ${pt.desc||''}</span>
          </div>
          <div style="font-size:15px;font-weight:900;color:#111827">${m.name}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${m.desc||''}</div>
        </div>
        <button onclick="_fbEditMapping('${m.id}')" class="bo-btn-secondary bo-btn-sm">✏️ 수정</button>
      </div>
      <div style="display:grid;grid-template-columns:${pt.stages.includes('plan')?'1fr ':''} 1fr ${pt.stages.includes('result')?'1fr':''};gap:8px">
        ${pt.stages.map(stage => stageRow(stage, formSet[stage])).join('')}
      </div>
    </div>`;
  };

  return `
<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
  <button onclick="_fbOpenMappingModal()" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:9px 18px">
    ＋ 서비스 매핑 추가
  </button>
</div>

<!-- 프로세스 패턴 안내 -->
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
  ${Object.entries(PROCESS_PATTERNS).map(([k,v]) => `
  <div class="bo-card" style="padding:14px;border-top:3px solid ${v.color}">
    <div style="font-size:11px;font-weight:900;color:${v.color};margin-bottom:4px">${v.label}</div>
    <div style="font-size:12px;font-weight:700;color:#111827">${v.desc}</div>
  </div>`).join('')}
</div>

<!-- 서비스 매핑 목록 -->
<div style="font-size:13px;font-weight:900;color:#374151;margin-bottom:12px">📋 등록된 서비스 매핑 (${myMaps.length}개)</div>
${myMaps.length ? myMaps.map(mapCard).join('') :
  `<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:16px;border:1px dashed #D1D5DB">
    <div style="font-size:32px;margin-bottom:8px">🔗</div>
    <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:4px">아직 서비스 매핑이 없습니다</div>
    <div style="font-size:11px;color:#9CA3AF;margin-bottom:12px">양식을 만든 후 서비스 프로세스와 연결하세요</div>
    <button onclick="_fbOpenMappingModal()" class="bo-btn-primary">매핑 추가하기</button>
  </div>`}

<!-- 연동 안내 -->
<div class="bo-card" style="margin-top:20px;padding:14px 18px;background:#F5F3FF;border-color:#DDD6FE">
  <div style="font-size:12px;font-weight:700;color:#5B21B6">
    🔗 여기서 설정된 서비스 매핑은 프론트 오피스의 '교육 신청/집행' 메뉴에 자동 반영됩니다.
    학습자에게는 '개인직무' 유형만, 교육담당자에게는 '운영/세미나' 유형이 노출됩니다.
  </div>
</div>`;
}

// ── 빌더 모달 ─────────────────────────────────────────────────────────────────
function fbOpenBuilderModal(formId) {
  _fbEditId = formId || null;
  const form = formId ? FORM_MASTER.find(f => f.id === formId) : null;
  _fbTempFields = form ? (form.fields || []).map(f =>
    typeof f === 'object' ? { ...f } : { key: f, scope: 'front' }
  ) : [];

  document.getElementById('fb-modal-title').textContent = formId ? `'${form?.name}' 편집` : '새 양식 만들기';
  document.getElementById('fb-modal-body').innerHTML = _fbAdvancedModalBody(form);
  document.getElementById('fb-field-modal').style.display = 'flex';
}

function fbCloseModal() { document.getElementById('fb-field-modal').style.display = 'none'; }

function _fbAdvancedModalBody(form) {
  const nameVal    = form?.name    || '';
  const typeVal    = form?.type    || 'apply';
  const descVal    = form?.desc    || '';
  const purposeVal = form?.purpose || '';
  const eduTypeVal = form?.eduType || '';
  const eduSubVal  = form?.eduSubType || '';

  // 목적 연동 교육유형 목록
  const eduTypesMap = purposeVal ? (FORM_EDU_TYPES[purposeVal] || []) : [];
  const selEduType  = eduTypesMap.find(t => t.type === eduTypeVal) || null;
  // 사용대상: 기존 form.purpose에서 유추하거나 form.targetUser에서 읽음
  const targetUser  = form?.targetUser || (purposeVal ? (FORM_PURPOSE_TYPES[purposeVal]?.targetUser || '') : '');

  // 카테고리별 필드 그룹
  const categories = [...new Set(ADVANCED_FIELDS.map(f => f.category))];

  return `
<!-- 범위 배지 (현재 선택된 격리그룹 / 계정) -->
${(_fbGroupId || _fbAccountCode) ? `
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:10px;margin-bottom:14px">
  <span style="font-size:10px;font-weight:900;color:#5B21B6">📌 분류 범위</span>
  ${_fbGroupId ? (() => { const g = (typeof ISOLATION_GROUPS!=='undefined'?ISOLATION_GROUPS:[]).find(x=>x.id===_fbGroupId); return `<span style="font-size:11px;font-weight:700;background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:6px">🛡️ ${g?.name||_fbGroupId}</span>`; })() : ''}
  ${_fbAccountCode ? (() => { const a = (typeof ACCOUNT_MASTER!=='undefined'?ACCOUNT_MASTER:[]).find(x=>x.code===_fbAccountCode); return `<span style="font-size:11px;font-weight:700;background:#DBEAFE;color:#1E40AF;padding:2px 8px;border-radius:6px">💳 ${a?.name||_fbAccountCode}</span>`; })() : ''}
  <span style="font-size:10px;color:#9CA3AF">이 양식은 위 범위에만 표시됩니다</span>
</div>` : ''}
<!-- 사용대상 선택 (학습자용 / 교육담당자용) -->
<div style="margin-bottom:12px">
  <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px;color:#374151">사용대상 *</label>
  <div style="display:flex;gap:8px">
    <label id="fb-target-learner-lbl" onclick="_fbOnTargetUserChange('learner')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser==='learner'?'#059669':'#E5E7EB'};
             background:${targetUser==='learner'?'#F0FDF4':'#F9FAFB'}">
      <input type="radio" name="fb-target-user" value="learner" ${targetUser==='learner'?'checked':''}
             style="accent-color:#059669;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser==='learner'?'#059669':'#6B7280'}">🙋 학습자용</span>
      <span style="font-size:10px;color:#9CA3AF">(개인 신청)</span>
    </label>
    <label id="fb-target-admin-lbl" onclick="_fbOnTargetUserChange('admin')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser==='admin'?'#7C3AED':'#E5E7EB'};
             background:${targetUser==='admin'?'#F5F3FF':'#F9FAFB'}">
      <input type="radio" name="fb-target-user" value="admin" ${targetUser==='admin'?'checked':''}
             style="accent-color:#7C3AED;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser==='admin'?'#7C3AED':'#6B7280'}">🏢 교육담당자용</span>
      <span style="font-size:10px;color:#9CA3AF">(운영 관리)</span>
    </label>
  </div>
</div>
<!-- 행 1: 단계 + 목적 -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">단계 *</label>
    <select id="fb-type" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      ${Object.entries(FORM_STAGE_TYPES).map(([k,v]) =>
        `<option value="${k}" ${typeVal===k?'selected':''}>${v.icon} ${v.label.split(' ')[0]}</option>`
      ).join('')}
    </select>
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">목적</label>
    <select id="fb-purpose" onchange="_fbOnPurposeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${Object.entries(FORM_PURPOSE_TYPES)
        .filter(([k,v]) => !targetUser || v.targetUser === targetUser)
        .map(([k,v]) =>
          `<option value="${k}" ${purposeVal===k?'selected':''}>${v.icon} ${v.label}</option>`
        ).join('')}
    </select>
  </div>
</div>
<!-- 행 2: 교육유형 + 세부유형 (목적 선택 시 표시) -->
<div id="fb-edutypes-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;${(purposeVal&&eduTypesMap.length>0)?'':'display:none'}"
  class="${(purposeVal&&eduTypesMap.length>0)?'':'d-none'}">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">교육유형</label>
    <select id="fb-edu-type" onchange="_fbOnEduTypeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${eduTypesMap.map(t => `<option value="${t.type}" ${eduTypeVal===t.type?'selected':''}>${t.type}</option>`).join('')}
    </select>
  </div>
  <div id="fb-sub-col">
    ${selEduType && selEduType.sub.length > 0 ? `
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">세부유형</label>
    <select id="fb-edu-sub"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${selEduType.sub.map(s => `<option value="${s}" ${eduSubVal===s?'selected':''}>${s}</option>`).join('')}
    </select>` : '<div></div>'}
  </div>
</div>
<!-- 행 3: 양식명 + 설명 -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">양식명 *</label>
    <input id="fb-name" value="${nameVal}" type="text" placeholder="예) R&D 사외교육 신청서"
      style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">설명</label>
    <input id="fb-desc" value="${descVal}" type="text" placeholder="이 양식의 용도"
      style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
  </div>
</div>

<!-- 입력 주체 범례 -->
<div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
  <span style="font-size:10px;font-weight:700;color:#374151">📌 필드 입력 주체:</span>
  <span style="font-size:10px;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:6px;border:1px solid #E5E7EB">🔓 프론트 공개 (학습자/담당자 입력)</span>
  <span style="font-size:10px;background:#FDF2F8;color:#9D174D;padding:2px 8px;border-radius:6px;border:1px solid #FBB6CE">🔒 백오피스 전용 (승인자만 입력)</span>
  <span style="font-size:10px;background:#EFF6FF;color:#0369A1;padding:2px 8px;border-radius:6px;border:1px solid #BFDBFE">⚙️ 시스템 자동</span>
</div>

<!-- 필드 빌더 영역 -->
<div style="border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#F9FAFB;padding:10px 16px;border-bottom:1px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;display:flex;align-items:center;gap:6px">
    📋 입력 필드 구성 <span style="font-size:10px;color:#9CA3AF;font-weight:500">(클릭으로 추가, 우클릭으로 입력 주체 변경)</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;min-height:220px">
    <!-- 좌: 필드 팔레트 (카테고리별) -->
    <div style="padding:14px;border-right:1px solid #E5E7EB;overflow-y:auto;max-height:320px">
      <div style="font-size:10px;color:#6B7280;font-weight:800;margin-bottom:8px">사용 가능 필드 (카테고리별)</div>
      ${categories.map(cat => {
        const catFields = ADVANCED_FIELDS.filter(f => f.category === cat);
        const catColor = cat.includes('승인') ? '#9D174D' : cat === '시스템' ? '#0369A1' : '#374151';
        return `<div style="margin-bottom:10px">
          <div style="font-size:9px;font-weight:900;color:${catColor};text-transform:uppercase;margin-bottom:6px;letter-spacing:.05em">${cat}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${catFields.map(f => {
              const isSelected = _fbTempFields.some(tf => (typeof tf === 'object' ? tf.key : tf) === f.key);
              const scopeStyle = f.scope === 'back' ? 'border:1.5px dashed #FBB6CE;color:#9D174D;background:#FDF2F8' :
                                 f.scope === 'system' ? 'border:1.5px dashed #BFDBFE;color:#0369A1;background:#EFF6FF' :
                                 'border:1.5px solid #E5E7EB;color:#374151;background:white';
              return `<span onclick="fbToggleField('${f.key}')" id="fbf-${f.key}"
                title="${f.hint||''} ${f.budget ? '💰예산연동' : ''}"
                class="fb-field-chip ${isSelected ? 'selected' : ''}"
                style="${scopeStyle};${isSelected ? 'opacity:.45;text-decoration:line-through;' : ''}">
                ${f.icon} ${f.key}${f.required ? '<sup style=color:#EF4444>*</sup>' : ''}
                ${f.budget ? '<span style="font-size:7px;vertical-align:super;color:#D97706">💰</span>' : ''}
              </span>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>
    <!-- 우: 선택된 필드 목록 (프리뷰) -->
    <div style="padding:14px;overflow-y:auto;max-height:320px;background:#FAFAFA">
      <div style="font-size:10px;color:#6B7280;font-weight:800;margin-bottom:8px">
        선택된 필드 <span style="font-size:9px;font-weight:400">(드래그 불필요 — 순서는 클릭 순)</span>
      </div>
      <div id="fb-preview">${_fbPreviewHTML()}</div>
    </div>
  </div>
</div>

<!-- 공지사항 & 첨부파일 섹션 -->
<div style="margin-top:18px;border-top:1px solid #E5E7EB;padding-top:16px">
  <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:12px">📢 공지사항 & 📎 첨부파일</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <!-- 공지사항 -->
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">공지사항
        <span style="font-weight:400;color:#9CA3AF">(신청 화면 상단에 표시)</span>
      </label>
      <textarea id="fb-notice" rows="4" placeholder="학습자/담당자에게 전달할 안내사항을 입력하세요...\n예) 이 양식은 사외교육 신청 전용입니다."\n              style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:vertical;line-height:1.5;font-family:inherit">${form?.noticeText || ''}</textarea>
    </div>
    <!-- 첨부파일 -->
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">필수 첨부파일 목록
        <span style="font-weight:400;color:#9CA3AF">(신청자에게 안내)</span>
      </label>
      <div id="fb-attach-list" style="min-height:60px;margin-bottom:6px">
        ${(form?.attachments||[]).map((a,i)=>`
        <div id="fb-attach-row-${i}" style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <input type="text" value="${a}" data-attach-idx="${i}"
            style="flex:1;padding:5px 8px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px"
            placeholder="첨부파일명 (예: 교육비 영수증)">
          <button type="button" onclick="fbRemoveAttach(${i})" style="border:none;background:none;color:#EF4444;font-size:16px;cursor:pointer;line-height:1">×</button>
        </div>`).join('')}
      </div>
      <button type="button" onclick="fbAddAttach()" style="font-size:11px;font-weight:700;color:#7C3AED;background:#F5F3FF;border:1.5px dashed #C4B5FD;border-radius:6px;padding:5px 12px;cursor:pointer;width:100%">+ 첨부파일 추가</button>
    </div>
  </div>
</div>`;
}

function _fbPreviewHTML() {
  if (!_fbTempFields.length) return '<div style="text-align:center;color:#D1D5DB;padding:30px;font-size:12px">← 왼쪽에서 필드를 클릭하여 추가</div>';
  return _fbTempFields.map((f, i) => {
    const key   = typeof f === 'object' ? f.key : f;
    const scope = typeof f === 'object' ? f.scope : 'front';
    const meta  = ADVANCED_FIELDS.find(a => a.key === key) || { icon: '📝' };
    const scopeLabel = scope === 'back' ? '🔒 백오피스 전용' : scope === 'system' ? '⚙️ 시스템' : '🔓 프론트';
    const scopeColor = scope === 'back' ? '#9D174D' : scope === 'system' ? '#0369A1' : '#374151';
    return `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#F9FAFB;border-radius:8px;margin-bottom:5px;border:1px solid #E5E7EB">
      <span style="color:#D1D5DB;font-weight:700;font-size:10px;min-width:16px">${i+1}</span>
      <span style="font-size:12px;flex:1">${meta.icon} ${key}</span>
      <span style="font-size:9px;font-weight:700;color:${scopeColor};background:${scopeColor}15;padding:1px 6px;border-radius:5px;cursor:pointer"
        onclick="fbCycleScope(${i})" title="클릭하여 입력 주체 변경">${scopeLabel}</span>
      <span onclick="fbRemoveField('${key}')" style="cursor:pointer;color:#EF4444;font-size:14px;line-height:1">×</span>
    </div>`;
  }).join('');
}

function fbToggleField(key) {
  const idx = _fbTempFields.findIndex(f => (typeof f === 'object' ? f.key : f) === key);
  if (idx > -1) { _fbTempFields.splice(idx, 1); }
  else {
    const meta = ADVANCED_FIELDS.find(a => a.key === key);
    _fbTempFields.push({ key, scope: meta?.scope || 'front' });
    // 조건부 로직: 강사료 추가 시 강사이력서 자동 추가 힌트
    if (key === '강사료' && !_fbTempFields.find(f => (typeof f === 'object' ? f.key : f) === '강사이력서')) {
      setTimeout(() => {
        if (confirm('강사료 필드 추가 시 [강사이력서] 첨부 필드도 자동으로 추가할까요? (조건부 로직)')) {
          _fbTempFields.push({ key: '강사이력서', scope: 'front' });
          _fbRefreshPreview();
        }
      }, 100);
    }
  }
  _fbRefreshPreview();
}

function fbRemoveField(key) {
  const idx = _fbTempFields.findIndex(f => (typeof f === 'object' ? f.key : f) === key);
  if (idx > -1) _fbTempFields.splice(idx, 1);
  _fbRefreshPreview();
}

function fbAddAttach() {
  const list = document.getElementById('fb-attach-list');
  if (!list) return;
  const idx = list.querySelectorAll('[data-attach-idx]').length;
  const row = document.createElement('div');
  row.id = `fb-attach-row-${idx}`;
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:5px';
  row.innerHTML = `<input type="text" data-attach-idx="${idx}"
    style="flex:1;padding:5px 8px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px"
    placeholder="첨부파일명 (예: 교육비 영수증)">
    <button type="button" onclick="fbRemoveAttach(${idx})" style="border:none;background:none;color:#EF4444;font-size:16px;cursor:pointer;line-height:1">×</button>`;
  list.appendChild(row);
}

function fbRemoveAttach(idx) {
  const row = document.getElementById(`fb-attach-row-${idx}`);
  if (row) row.remove();
}

function fbCycleScope(idx) {
  const current = typeof _fbTempFields[idx] === 'object' ? _fbTempFields[idx].scope : 'front';
  const order   = ['front', 'back', 'system'];
  const next    = order[(order.indexOf(current) + 1) % order.length];
  if (typeof _fbTempFields[idx] === 'object') _fbTempFields[idx].scope = next;
  else _fbTempFields[idx] = { key: _fbTempFields[idx], scope: next };
  _fbRefreshPreview();
}

function _fbRefreshPreview() {
  const el = document.getElementById('fb-preview');
  if (el) el.innerHTML = _fbPreviewHTML();
  // 팔레트 selected 상태 갱신
  ADVANCED_FIELDS.forEach(f => {
    const chip = document.getElementById(`fbf-${f.key}`);
    if (chip) {
      const isSelected = _fbTempFields.some(tf => (typeof tf === 'object' ? tf.key : tf) === f.key);
      chip.classList.toggle('selected', isSelected);
      chip.style.opacity = isSelected ? '.45' : '1';
      chip.style.textDecoration = isSelected ? 'line-through' : 'none';
    }
  });
}

// 목적 변경 시 교육유형 행 토글
function _fbOnPurposeChange(purposeKey) {
  const row = document.getElementById('fb-edutypes-row');
  const etSel = document.getElementById('fb-edu-type');
  const subCol = document.getElementById('fb-sub-col');
  if (!row || !etSel) return;

  const types = FORM_EDU_TYPES[purposeKey] || [];
  if (types.length === 0) {
    row.style.display = 'none';
    return;
  }
  row.style.display = 'grid';
  etSel.innerHTML = '<option value="">— 선택 —</option>' +
    types.map(t => `<option value="${t.type}">${t.type}</option>`).join('');
  if (subCol) subCol.innerHTML = '<div></div>';
}

// 사용대상 변경 시 목적 드롭다운 필터링
function _fbOnTargetUserChange(targetUser) {
  // 라디오 버튼 시각적 업데이트
  ['learner','admin'].forEach(t => {
    const lbl = document.getElementById(`fb-target-${t}-lbl`);
    if (!lbl) return;
    const isActive = t === targetUser;
    const color    = t === 'learner' ? '#059669' : '#7C3AED';
    lbl.style.border     = `2px solid ${isActive ? color : '#E5E7EB'}`;
    lbl.style.background = isActive ? (t === 'learner' ? '#F0FDF4' : '#F5F3FF') : '#F9FAFB';
    const span = lbl.querySelector('span');
    if (span) span.style.color = isActive ? color : '#6B7280';
  });
  // 목적 드롭다운 필터링
  const purposeSel = document.getElementById('fb-purpose');
  if (!purposeSel) return;
  const currentPurpose = purposeSel.value;
  purposeSel.innerHTML = '<option value="">— 선택 —</option>' +
    Object.entries(FORM_PURPOSE_TYPES)
      .filter(([k,v]) => v.targetUser === targetUser)
      .map(([k,v]) => `<option value="${k}">${v.icon} ${v.label}</option>`)
      .join('');
  // 이전 선택이 새 목록에 있으면 복원
  if (FORM_PURPOSE_TYPES[currentPurpose]?.targetUser === targetUser) {
    purposeSel.value = currentPurpose;
  } else {
    // 목적이 바뀌었으면 교육유형 행 숨기기
    _fbOnPurposeChange('');
  }
}

// 교육유형 변경 시 세부유형 목록 갱신
function _fbOnEduTypeChange(typeVal) {
  const purposeKey = document.getElementById('fb-purpose')?.value || '';
  const types = FORM_EDU_TYPES[purposeKey] || [];
  const selT = types.find(t => t.type === typeVal);
  const subCol = document.getElementById('fb-sub-col');
  if (!subCol) return;
  if (selT && selT.sub.length > 0) {
    subCol.innerHTML = `
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">세부유형</label>
      <select id="fb-edu-sub" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        <option value="">— 선택 —</option>
        ${selT.sub.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>`;
  } else {
    subCol.innerHTML = '<div></div>';
  }
}

async function fbSaveForm() {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const type       = document.getElementById('fb-type').value;
  const name       = document.getElementById('fb-name').value.trim();
  const desc       = document.getElementById('fb-desc').value.trim();
  const purpose    = document.getElementById('fb-purpose')?.value || '';
  const eduType    = document.getElementById('fb-edu-type')?.value || '';
  const eduSubType = document.getElementById('fb-edu-sub')?.value || '';
  const noticeText = document.getElementById('fb-notice')?.value.trim() || '';
  const targetUser  = document.querySelector('input[name="fb-target-user"]:checked')?.value || '';

  // 첨부파일 목록 수집
  const attachInputs = document.querySelectorAll('#fb-attach-list input[data-attach-idx]');
  const attachments = Array.from(attachInputs).map(el => el.value.trim()).filter(Boolean);

  if (!name) { alert('양식명은 필수입니다.'); return; }
  if (_fbTempFields.length === 0) { alert('최소 1개 이상의 필드를 추가해주세요.'); return; }

  const formId = _fbEditId || ('FM' + Date.now());
  const formData = {
    id: formId, tenantId,
    isolationGroupId: _fbGroupId   || null,   // 격리그룹 범위
    accountCode:      _fbAccountCode || null,  // 예산계정 범위
    type, name, desc, active: true,
    fields: [..._fbTempFields],
    purpose, eduType, eduSubType, targetUser, noticeText, attachments
  };

  // 1) 메모리 FORM_MASTER 업데이트
  if (_fbEditId) {
    const idx = FORM_MASTER.findIndex(x => x.id === _fbEditId);
    if (idx > -1) FORM_MASTER[idx] = { ...FORM_MASTER[idx], ...formData };
    else FORM_MASTER.push(formData);
  } else {
    FORM_MASTER.push(formData);
  }

  // 2) DB 저장 (upsert)
  if (typeof sbSaveFormTemplate === 'function') {
    const ok = await sbSaveFormTemplate(formData);
    if (!ok) {
      // DB 실패 시 경고만 표시하고 계속 (메모리엔 이미 반영됨)
      console.warn('[FormBuilder] DB 저장 실패 - 메모리에만 저장됨');
    }
  }

  fbCloseModal();
  _fbCurrentTab = 'library';
  renderFormBuilderMenu();
}

function fbToggleActive(formId) {
  const f = FORM_MASTER.find(x => x.id === formId);
  if (f) f.active = !f.active;
  renderFormBuilderMenu();
}

// ── 서비스 매핑 관련 ──────────────────────────────────────────────────────────
function _fbOpenMappingModal() {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const myForms  = FORM_MASTER.filter(f => f.tenantId === tenantId && f.active);

  const formOpts = (stage) => {
    const stageForms = myForms.filter(f => f.type === stage);
    return `<option value="">— 미연결 —</option>` +
      stageForms.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  };

  const modal = document.createElement('div');
  modal.id = 'svc-map-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9200;display:flex;align-items:flex-start;justify-content:center;padding-top:40px';
  modal.innerHTML = `
<div style="background:#fff;border-radius:16px;width:560px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h3 style="font-size:15px;font-weight:900;margin:0">🔗 서비스 매핑 추가</h3>
    <button onclick="document.getElementById('svc-map-modal').remove()" style="border:none;background:none;font-size:22px;cursor:pointer;color:#9CA3AF">✕</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">서비스 유형 *</label>
        <select id="svc-type" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          ${Object.entries(FORM_SERVICE_TYPES).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
        </select></div>
      <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">대상자 *</label>
        <select id="svc-target" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          ${Object.entries(FORM_TARGET_TYPES).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
        </select></div>
    </div>
    <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">서비스명 *</label>
      <input id="svc-name" type="text" placeholder="예) 개인직무 사외학습 지원" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px"></div>
    <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">프로세스 패턴 *</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        ${Object.entries(PROCESS_PATTERNS).map(([k,v])=>`
        <label style="display:flex;align-items:center;gap:6px;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
          <input type="radio" name="svc-pattern" value="${k}"> <div><div style="font-size:11px;font-weight:900;color:${v.color}">${v.label}</div><div style="font-size:10px;color:#9CA3AF">${v.desc}</div></div>
        </label>`).join('')}
      </div></div>
    <div id="svc-form-sets" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">📋 계획 양식</label>
        <select id="svc-plan" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px">${formOpts('plan')}</select></div>
      <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">📄 신청 양식 *</label>
        <select id="svc-apply" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px">${formOpts('apply')}</select></div>
      <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">📝 결과 양식</label>
        <select id="svc-result" style="width:100%;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px">${formOpts('result')}</select></div>
    </div>
    <div><label style="font-size:11px;font-weight:800;display:block;margin-bottom:4px">설명</label>
      <input id="svc-desc" type="text" placeholder="서비스 설명" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px"></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:14px;border-top:1px solid #E5E7EB">
    <button onclick="document.getElementById('svc-map-modal').remove()" class="bo-btn-secondary bo-btn-sm">취소</button>
    <button onclick="_fbSaveMappingFromModal()" class="bo-btn-primary bo-btn-sm">💾 저장</button>
  </div>
</div>`;
  document.body.appendChild(modal);
}

function _fbSaveMappingFromModal() {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const name = document.getElementById('svc-name').value.trim();
  const pattern = document.querySelector('input[name="svc-pattern"]:checked')?.value;
  if (!name) { alert('서비스명을 입력하세요.'); return; }
  if (!pattern) { alert('프로세스 패턴을 선택하세요.'); return; }
  SERVICE_MAPPINGS.push({
    id: 'SVC_' + Date.now(), tenantId,
    name, pattern,
    serviceType: document.getElementById('svc-type').value,
    target: document.getElementById('svc-target').value,
    desc: document.getElementById('svc-desc').value,
    formSets: {
      plan:   document.getElementById('svc-plan').value  || undefined,
      apply:  document.getElementById('svc-apply').value || undefined,
      result: document.getElementById('svc-result').value || undefined,
    }
  });
  document.getElementById('svc-map-modal').remove();
  _fbCurrentTab = 'mapping';
  renderFormBuilderMenu();
}

function _fbEditMapping(id) {
  alert('서비스 매핑 수정 기능은 추후 오픈됩니다.');
}

// ─── 양식 미리보기 ─────────────────────────────────────────────────────────────
window._currentPreviewForm = null;

function fbPreviewForm(formId) {
  const form = FORM_MASTER.find(f => f.id === formId);
  if (!form) return;
  
  const modalId = 'fb-preview-modal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'bo-modal-overlay';
    modal.style.zIndex = '9999';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';

    modal.innerHTML = `
<div class="bo-modal" style="width:700px;max-width:95%;background:#fff;border-radius:12px;display:flex;flex-direction:column;max-height:90vh">
  <div class="bo-modal-header" style="display:flex;justify-content:space-between;border-bottom:1px solid #E5E7EB;padding:20px;margin-bottom:0;flex-shrink:0">
    <div>
      <h3 id="fb-pv-title" style="margin:0;font-size:16px;color:#111827;font-weight:900">양식 미리보기</h3>
      <div id="fb-pv-desc" style="font-size:11px;color:#6B7280;margin-top:4px">프론트 오피스와 백오피스 환경에서 표시될 양식 형태입니다.</div>
    </div>
    <button onclick="document.getElementById('${modalId}').style.display='none'" style="background:none;border:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
  </div>
  
  <!-- 탭 -->
  <div style="display:flex;gap:12px;border-bottom:2px solid #E5E7EB;padding:0 20px;flex-shrink:0">
    <button id="fb-pv-tab-front" onclick="fbRenderPreviewBody('front')"
            style="padding:12px 16px;font-size:13px;font-weight:900;background:none;border:none;cursor:pointer;
                   border-bottom:3px solid #059669;color:#059669;margin-bottom:-2px">🙋 Front-Office (학습자/신청자)</button>
    <button id="fb-pv-tab-back" onclick="fbRenderPreviewBody('back')"
            style="padding:12px 16px;font-size:13px;font-weight:800;background:none;border:none;cursor:pointer;
                   border-bottom:3px solid transparent;color:#6B7280;margin-bottom:-2px">💼 Back-Office (결재자/담당자)</button>
  </div>
  
  <!-- 렌더링 영역 -->
  <div style="padding:20px;overflow-y:auto;flex:1;background:#F9FAFB">
    <div id="fb-pv-body" style="background:#fff;padding:28px;border-radius:12px;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,0.05);max-width:550px;margin:0 auto">
    </div>
  </div>
</div>`;
    document.body.appendChild(modal);
  }
  
  window._currentPreviewForm = form;
  document.getElementById('fb-pv-title').textContent = `[${form.name}] 양식 미리보기`;
  
  modal.style.display = 'flex';
  fbRenderPreviewBody('front');
}

function _fbFieldInput(fld, poolField, viewType) {
  const ft   = poolField.fieldType || 'text';
  const hint = poolField.hint || (fld.key + ' 입력');
  const base = 'width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB;';

  // FO에서 BO전용 필드는 읽기전용 표시
  const isReadOnly = (viewType === 'back' && fld.scope === 'front');
  const overlay   = isReadOnly ? '' : '';

  if (ft === 'textarea') {
    return `<textarea rows="3" placeholder="${hint}" style="${base}resize:vertical" disabled></textarea>`;
  }
  if (ft === 'daterange') {
    return `<div style="display:flex;gap:8px;align-items:center">
      <input type="date" style="${base}flex:1" disabled>
      <span style="color:#9CA3AF;font-size:12px">~</span>
      <input type="date" style="${base}flex:1" disabled>
    </div>`;
  }
  if (ft === 'date') {
    return `<input type="date" style="${base}" disabled>`;
  }
  if (ft === 'number' || ft === 'budget-linked') {
    const prefix = (ft === 'budget-linked')
      ? `<div style="padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;font-size:11px;color:#1D4ED8;font-weight:800;margin-bottom:8px">💼 조직 잔액: <b>실시간 조회</b> (연동 예정)</div>` : '';
    return prefix + `<div style="display:flex;align-items:center;gap:0">
      <span style="padding:12px;background:#F3F4F6;border:1.5px solid #E5E7EB;border-radius:8px 0 0 8px;font-size:13px;color:#6B7280">₩</span>
      <input type="number" placeholder="0" style="${base}border-radius:0 8px 8px 0;border-left:none" disabled>
    </div>`;
  }
  if (ft === 'file') {
    return `<div style="padding:16px;border:2px dashed #D1D5DB;border-radius:8px;text-align:center;color:#9CA3AF;font-size:12px;background:#F9FAFB;font-weight:800">⬆️ 파일 업로드 영역</div>`;
  }
  if (ft === 'rating') {
    return `<div style="display:flex;gap:6px;padding:8px 0">
      ${[1,2,3,4,5].map(n=>`<span style="font-size:28px;color:#D1D5DB;cursor:default">☆</span>`).join('')}
      <span style="font-size:12px;color:#9CA3AF;margin-left:8px;line-height:28px">5점 척도</span>
    </div>`;
  }
  if (ft === 'user-search') {
    return `<div style="display:flex;gap:8px">
      <input type="text" placeholder="이름 또는 사번으로 검색..." style="${base}flex:1" disabled>
      <button disabled style="padding:0 16px;background:#6366F1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:not-allowed;opacity:0.6">🔍 검색</button>
    </div>`;
  }
  if (ft === 'calc-grounds') {
    return `<div style="padding:12px;border:1.5px solid #E5E7EB;border-radius:8px;background:#F9FAFB">
      <div style="font-size:11px;color:#6B7280;margin-bottom:8px;font-weight:800">📐 선택 가능한 세부산출근거 항목 (테넌트별 자동 로드)</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${['과정비(외부위탁)','강사료(외부)','교재비','시설/기자재 임차료'].map(t=>`
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;background:#fff;cursor:default">
          <input type="checkbox" disabled> <span style="font-size:12px">${t}</span>
        </label>`).join('')}
        <span style="font-size:10px;color:#9CA3AF">실제 항목은 산정기준 관리에서 불러옵니다</span>
      </div>
    </div>`;
  }
  if (ft === 'select') {
    const opts = (poolField.options || ['선택 1','선택 2','선택 3']).map(o=>`<option>${o}</option>`).join('');
    return `<select style="${base}" disabled><option>— 선택 —</option>${opts}</select>`;
  }
  if (ft === 'system') {
    return `<div style="padding:10px 14px;background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:8px;font-size:12px;color:#0369A1;font-weight:800">🔄 시스템 자동 연결 필드</div>`;
  }
  // default: text
  return `<input type="text" placeholder="${hint}" style="${base}" disabled>`;
}

function fbRenderPreviewBody(viewType) {
  const tFront = document.getElementById('fb-pv-tab-front');
  const tBack  = document.getElementById('fb-pv-tab-back');
  if (viewType === 'front') {
    tFront.style.color = '#059669'; tFront.style.borderBottomColor = '#059669'; tFront.style.fontWeight = '900';
    tBack.style.color = '#6B7280';  tBack.style.borderBottomColor = 'transparent'; tBack.style.fontWeight = '800';
  } else {
    tBack.style.color = '#7C3AED';  tBack.style.borderBottomColor = '#7C3AED'; tBack.style.fontWeight = '900';
    tFront.style.color = '#6B7280'; tFront.style.borderBottomColor = 'transparent'; tFront.style.fontWeight = '800';
  }

  const form  = window._currentPreviewForm;
  const bBody = document.getElementById('fb-pv-body');
  if (!form) return;

  const fields = (form.fields || []).map(f => typeof f === 'object' ? f : { key: f, scope: 'front' });

  // 필드 타입 배지
  const TYPE_BADGE = {
    text:           { label: '텍스트',   color: '#6B7280', bg: '#F3F4F6' },
    textarea:       { label: '장문',     color: '#059669', bg: '#F0FDF4' },
    date:           { label: '날짜',     color: '#0369A1', bg: '#EFF6FF' },
    daterange:      { label: '날짜범위', color: '#0369A1', bg: '#EFF6FF' },
    number:         { label: '숫자',     color: '#D97706', bg: '#FFFBEB' },
    'user-search':  { label: '사용자검색', color: '#6366F1', bg: '#EEF2FF' },
    file:           { label: '파일',     color: '#9D174D', bg: '#FDF2F8' },
    rating:         { label: '별점',     color: '#F59E0B', bg: '#FFFBEB' },
    select:         { label: '선택',     color: '#7C3AED', bg: '#F5F3FF' },
    'calc-grounds': { label: '산출근거', color: '#065F46', bg: '#ECFDF5' },
    'budget-linked':{ label: '예산연동', color: '#1D4ED8', bg: '#EFF6FF' },
    system:         { label: '시스템',   color: '#6B7280', bg: '#F3F4F6' },
  };

  let html = `
    <h4 style="margin:0 0 20px 0;font-size:18px;color:#111827;border-bottom:2px solid #111827;padding-bottom:12px;font-weight:900">📝 ${form.name}</h4>
    <div style="display:flex;flex-direction:column;gap:18px">`;

  let visibleCount = 0;

  fields.forEach(fld => {
    if (viewType === 'front' && fld.scope === 'back') return;

    visibleCount++;
    const poolField = ADVANCED_FIELDS.find(x => x.key === fld.key) || {};
    const reqStr    = poolField.required ? '<span style="color:#EF4444"> *</span>' : '';
    const icon      = poolField.icon || '🔸';
    const ft        = poolField.fieldType || fld.fieldType || 'text';
    const tb        = TYPE_BADGE[ft] || TYPE_BADGE.text;

    // Scope 배지
    let scopeBadge = '';
    if (viewType === 'back') {
      if (fld.scope === 'front')  scopeBadge = `<span style="font-size:9px;background:#F0FDF4;color:#059669;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">FO입력</span>`;
      else if (fld.scope === 'back') scopeBadge = `<span style="font-size:9px;background:#F5F3FF;color:#7C3AED;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">BO전용</span>`;
      else scopeBadge = `<span style="font-size:9px;background:#EFF6FF;color:#3B82F6;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">시스템</span>`;
    }

    // 타입 배지
    const typeBadge = `<span style="font-size:9px;background:${tb.bg};color:${tb.color};padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">${tb.label}</span>`;

    html += `
      <div>
        <label style="display:flex;align-items:center;font-size:13px;font-weight:800;color:#374151;margin-bottom:8px">
          ${icon} ${fld.key} ${reqStr} ${typeBadge} ${scopeBadge}
        </label>
        ${_fbFieldInput(fld, poolField, viewType)}
      </div>
    `;
  });

  if (visibleCount === 0) {
    html += `<div style="padding:40px 20px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:800;background:#F3F4F6;border-radius:12px">이 화면에 해당하는 필드가 없습니다.</div>`;
  }

  html += `</div>`;
  bBody.innerHTML = html;
}
window.fbPreviewForm = fbPreviewForm;
window.fbRenderPreviewBody = fbRenderPreviewBody;
