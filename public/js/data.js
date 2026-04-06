// ─── DATA LAYER ─────────────────────────────────────────────────────────────
// LXP 프론트 오피스 — 4개 테넌트 학습자 페르소나
// allowedAccounts, budgets는 fo_persona_loader.js가 DB에서 동적으로 로드
// orgId가 없는 페르소나는 mock budgets를 폴백으로 사용

const PERSONAS = {
  // ── 현대자동차 (HMC) — orgId: 실제 DB UUID 사용 ───────────────────────────
  hmc_team_mgr: {
    id: 'P401', name: '조O성', dept: '역량혁신팀', pos: '책임',
    type: 'HMC_TeamMgr', typeLabel: 'HMC 팀담당자·실무자',
    company: '현대자동차', tenantId: 'HMC',
    role: 'team_general', jobType: '일반직',
    orgId: '25b3b685-594d-426a-9016-ae63c6266d7f', // 역량혁신팀 (DB)
    vorgId: 'TPL_1774867919831',  // HMC 일반교육예산 가상교육조직 (DB id 직접 참조)
    desc: '일반예산(운영/기타) 활용 교육담당자. 운영·기타 계정으로 교육계획 수립 후 신청.',
    // allowedAccounts, budgets → fo_persona_loader.js가 DB에서 로드
    allowedAccounts: [], budgets: [] // DB 로드 전 빈 배열 (fallback)
  },
  hmc_learner: {
    id: 'P402', name: '이O봉', dept: '내구기술팀', pos: '책임',
    type: 'HMC_Learner', typeLabel: 'HMC 학습자·연구원',
    company: '현대자동차', tenantId: 'HMC',
    role: 'learner', jobType: '연구직',
    orgId: '1510fb8a-f5bb-42e0-b1dc-cbdfc4181745',  // 내구기술팀 (DB)
    orgHqId: '0cea84e6-3821-45e1-9e0c-e232af019a1d', // 연구개발본부 (shared 모드 대비)
    vorgId: 'TPL_1774870843727',  // HMC R&D교육예산 가상교육조직 (DB id 직접 참조)
    desc: '내구기술팀 연구직 학습자. 연구개발본부 소속. DB에서 계정·잔액 동적 로드.',
    allowedAccounts: [], budgets: [] // DB 로드 전 빈 배열 (fallback)
  },

  // ── 기아 (KIA) — orgId 미설정: mock budgets 폴백 ──────────────────────────
  kia_learner: {
    id: 'P203', name: '강O우', dept: '개인정보보호팀', pos: '책임',
    type: 'KIA_Learner', typeLabel: 'KIA 학습자',
    company: '기아', tenantId: 'KIA',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['KIA-OPS', 'KIA-PART', 'COMMON-FREE'],
    vorgId: 'KIA-GENERAL',
    desc: '일반예산기반 학습자.',
    budgets: [
      { id: 'b_kia01', name: '개인정보보호팀 참가계정', account: '참가', balance: 5000000, used: 800000 },
      { id: 'b_kia02', name: '개인정보보호팀 운영계정', account: '운영', balance: 8000000, used: 1200000 }
    ]
  },

  // ── 현대오토에버 (HAE) — orgId 미설정: mock budgets 폴백 ─────────────────
  hae_learner: {
    id: 'P303', name: '남O우', dept: 'PM서비스팀', pos: '책임',
    type: 'HAE_Learner', typeLabel: 'HAE 학습자 (솔루션사업부)',
    company: '현대오토에버', tenantId: 'HAE',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['HAE-EDU', 'HAE-TEAM', 'COMMON-FREE'],
    vorgId: 'HAE-ALL',
    desc: '솔루션사업부 학습자.',
    budgets: [
      { id: 'b_hae01', name: 'PM서비스팀 전사교육예산', account: '전사교육', balance: 5000000, used: 600000 },
      { id: 'b_hae02', name: 'PM서비스팀 팀/프로젝트 할당예산', account: '팀/프로젝트', balance: 3000000, used: 0 }
    ]
  },

  hae_learner2: {
    id: 'P304', name: '이O준', dept: 'L&D플랫폼팀', pos: '책임',
    type: 'HAE_Learner', typeLabel: 'HAE 학습자 (L&D플랫폼팀)',
    company: '현대오토에버', tenantId: 'HAE',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['HAE-OPS', 'HAE-PART', 'HAE-CERT', 'COMMON-FREE'],
    vorgId: 'HAE-ALL',
    process: 'plan-apply-result',
    desc: 'L&D플랫폼팀 학습자.',
    budgets: [
      { id: 'b_hae03', name: 'L&D플랫폼팀 운영계정', account: '운영', balance: 6000000, used: 1200000 },
      { id: 'b_hae04', name: 'L&D플랫폼팀 참가계정', account: '참가', balance: 3000000, used: 400000 },
      { id: 'b_hae05', name: 'L&D플랫폼팀 자격증계정', account: '자격증', balance: 1500000, used: 0 }
    ]
  },

  // ── 현대제철 (HSC) — orgId 미설정: mock budgets 폴백 ─────────────────────
  hsc_learner: {
    id: 'P608', name: '정O안', dept: '성장디자인팀', pos: '매니저',
    type: 'HSC_Learner', typeLabel: 'HSC 학습자',
    company: '현대제철', tenantId: 'HSC',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['HSC-OPS', 'HSC-EXT', 'COMMON-FREE'],
    vorgId: 'IG-HSC-ALL',
    process: 'plan-apply-result',
    desc: '현대제철 성장디자인팀 학습자. 개인직무 사외학습 중심. 사외교육 계정(HSC-EXT) 활용.',
    budgets: [
      { id: 'b_hsc01', name: '성장디자인팀 사외교육계정', account: '사외교육', balance: 5000000, used: 0 }
    ]
  },
};


// ⚠ MOCK: DB 이력 테이블 구축 전까지만 사용. tenantId 필터로 페르소나별 격리
const MOCK_HISTORY = [
  { id: 'H001', tenantId: 'HMC', title: 'AWS 클라우드 아키텍처 전문가 과정', type: '사외교육', category: 'edu_offline', date: '2026-02-10', endDate: '2026-02-12', hours: 24, amount: 1500000, status: '완료', budget: '참가', applyStatus: '승인완료', resultDone: true },
  { id: 'H002', tenantId: 'HMC', title: 'SDV 소프트웨어 개발 세미나', type: '세미나', category: 'conf_present', date: '2026-01-20', endDate: '2026-01-20', hours: 8, amount: 300000, status: '완료', budget: '참가', applyStatus: '승인완료', resultDone: false },
  { id: 'H003', tenantId: 'HMC', title: '애자일 PM 자격증 취득', type: '자격증', category: 'edu_online', date: '2026-03-01', endDate: '2026-03-31', hours: 40, amount: 450000, status: '진행중', budget: '참가', applyStatus: '결재진행중', resultDone: false },
  { id: 'H004', tenantId: 'HMC', title: '데이터 분석 이러닝', type: '이러닝', category: 'edu_online', date: '2025-12-01', endDate: '2025-12-31', hours: 20, amount: 200000, status: '완료', budget: '참가', applyStatus: '반려', resultDone: false },
  { id: 'H005', tenantId: 'HMC', title: '리더십 워크샵', type: '워크샵', category: 'workshop', date: '2025-11-15', endDate: '2025-11-16', hours: 16, amount: 600000, status: '완료', budget: '운영', applyStatus: '승인완료', resultDone: true },
  { id: 'H006', tenantId: 'HMC', title: 'AI/ML 실무 활용 강의', type: '사외교육', category: 'edu_offline', date: '2026-03-20', endDate: '2026-03-21', hours: 16, amount: 800000, status: '대기중', budget: '참가', applyStatus: '승인대기', resultDone: false },
];

// ⚠ MOCK: DB 계획 테이블로 전환 완료 (apply.js). 대시보드용 폴백
const MOCK_PLANS = [
  { id: 'BP26-001', tenantId: 'HMC', title: '26년 글로벌 AI 포럼 참가', account: '참가', budgetId: 'b_hmc01', amount: 5000000 },
  { id: 'BP26-002', tenantId: 'HMC', title: 'SDV 아키텍처 전문가 양성', account: '연구투자', budgetId: 'b_hmc04', amount: 25000000 },
  { id: 'BP26-003', tenantId: 'HMC', title: '리더십 워크샵 (피플육성)', account: '참가', budgetId: 'b_hmc01', amount: 3000000 },
  { id: 'BP26-004', tenantId: 'HMC', title: '신규 입사자 온보딩 운영', account: '참가', budgetId: 'b_hmc01', amount: 8000000 },
];

// ─── GLOBAL STATE ────────────────────────────────────────────────────────────
// ※ currentPersona는 main.js의 _resolveCurrentPersona()가 DB 기반으로 재설정함
//    여기서는 PERSONAS에 있으면 사용, 없으면 첫 번째 항목을 임시 플레이스홀더로 사용
const savedPersonaFo = sessionStorage.getItem('currentPersona') || 'hmc_team_mgr';
let currentPersona = PERSONAS[savedPersonaFo] || Object.values(PERSONAS)[0];
let currentPage = 'dashboard';
// 교육신청 화면 모드: 'list' = 신청 목록, 'form' = 신청 폼
// (navigate('apply') 진입 시 'list'로 리셋)
let applyViewMode = 'list';

// LXP 페르소나 전환 목록 (백오피스 제외)
const LXP_PERSONA_LIST = ['hmc_team_mgr', 'hmc_learner', 'kia_learner', 'hae_learner', 'hae_learner2', 'hsc_learner'];

function resetApplyState() {
  return {
    step: 1,
    purpose: null,
    serviceId: null,      // 선택한 서비스 ID (SERVICE_DEFINITIONS)
    applyMode: null,      // 'holding' | 'reimbursement' | null
    useBudget: null,
    hasPlan: null,
    planId: '',
    planIds: [],
    showMultiPlanModal: false,
    budgetId: '',
    subType: '',
    eduType: '',      // 교육유형 트리 상위 노드 ID
    region: 'domestic',
    title: '',
    startDate: '',
    endDate: '',
    hours: '',
    content: '',
    expenses: [{ id: 1, type: '교육비/등록비', price: 0, qty: 1 }],
    rndTotal: 0,
    receiptFile: null,      // 후정산형 영수증
    receiptAmt: 0,          // 후정산 요청 금액
    receiptDesc: '',        // 후정산 지출 내용
    editId: null,           // 임시저장 편집 ID
    confirmMode: false,     // 작성확인 화면 모드
    courseSessionLinks: [], // 과정-차수 연결 (다과정·다차수 부분선택)
  };
}

let applyState = resetApplyState();

// ─── PURPOSES (교육 목적 정의 — DB 폴백용) ──────────────────────────────────
// ⚠ DB initSupabaseData() → sbLoadEduTypes() 성공 시 window.PURPOSES가 DB 데이터로 교체됨
// ⚠ let 사용 필수: const 사용 시 window.PURPOSES 재할당이 로컬 const에 가려져 DB 교체가 무시됨
// ⚠ misc_ops(기타운영): DB edu_purpose_groups에 등록된 경우에만 자동 노출. Mock에서는 제거.

let PURPOSES = [
  {
    id: 'external_personal',
    label: '개인 직무 사외학습',
    desc: '개인 역량 향상 사외 활동',
    icon: '💼',
    accounts: ['참가', '연구투자', '사외교육', '전사교육', '팀/프로젝트'],
    subtypes: [
      {
        group: '정규교육',
        items: [
          { id: 'edu_elearning', label: '이러닝' },
          { id: 'edu_class', label: '집합' },
          { id: 'edu_live', label: '라이브' },
        ]
      },
      {
        group: '학술 및 연구활동',
        items: [
          { id: 'acad_conf', label: '학회/세미나/컨퍼런스' },
          { id: 'acad_present', label: '학회 직접 발표' },
          { id: 'acad_study', label: '연수' },
        ]
      },
      {
        group: '지식자원학습',
        items: [
          { id: 'res_book', label: '도서' },
          { id: 'res_journal', label: '논문/저널' },
          { id: 'res_tech', label: '기술자료(DB구독·자료구매)' },
        ]
      },
      {
        group: '역량개발지원',
        items: [
          { id: 'dev_lang', label: '어학학습비 지원' },
          { id: 'dev_cert', label: '자격증 취득지원' },
          { id: 'dev_assoc', label: '학협회비' },
        ]
      },
      {
        group: '기타',
        items: [
          { id: 'etc_teach', label: '교육출강(사/내외)' },
          { id: 'etc_team', label: '팀빌딩' },
        ]
      },
    ]
  },
  {
    id: 'internal_edu',
    label: '이러닝/집합(비대면) 운영',
    desc: '사내 교육과정을 직접 개설 및 운영',
    icon: '🖥',
    accounts: ['운영', '연구투자'],
    subtypes: [
      {
        group: '이러닝/집합 운영 유형', items: [
          { id: 'ops_elearning', label: '이러닝' },
          { id: 'ops_class', label: '집합(비대면)' },
        ]
      },
    ]
  },
  {
    id: 'conf_seminar',
    label: '워크샵/세미나/콘퍼런스 운영',
    desc: '교육담당자가 사외행사 참가를 운영·지원하는 형태',
    icon: '👥',
    accounts: ['참가', '운영', '연구투자'],
    subtypes: [
      {
        group: '콘퍼런스/세미나 유형', items: [
          { id: 'ops_workshop', label: '워크샵' },
          { id: 'ops_seminar', label: '세미나' },
          { id: 'ops_conference', label: '콘퍼런스' },
          { id: 'ops_cert_maint', label: '자격유지' },
          { id: 'ops_policy_link', label: '제도연계' },
        ]
      },
    ]
  },
  // misc_ops(기타운영): DB 서비스 정책에 등록된 경우에만 자동 노출.
  // DB initSupabaseData() 성공 시 edu_purpose_groups 기반으로 PURPOSES가 교체되므로
  // DB에 기타운영이 존재하면 자동으로 추가됩니다. Mock 폴백에서는 제거합니다.
];

