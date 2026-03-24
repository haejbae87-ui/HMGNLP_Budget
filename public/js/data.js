// ─── DATA LAYER ─────────────────────────────────────────────────────────────
// LXP 프론트 오피스 — 4개 테넌트 학습자 페르소나

const PERSONAS = {
  // ── 현대자동차 (HMC) ──────────────────────────────────────────────────────
  hmc_team_mgr: {
    id: 'P401', name: '조O성', dept: '역량혁신팀', pos: '책임',
    type: 'HMC_TeamMgr', typeLabel: 'HMC 팀담당자·실무자',
    company: '현대자동차', tenantId: 'HMC',
    role: 'team_general', jobType: '일반직',
    allowedAccounts: ['HMC-OPS', 'HMC-PART', 'HMC-ETC', 'COMMON-FREE'],
    isolationGroup: 'HMC-GENERAL',
    desc: '일반예산(운영/기타/참가) 활용 실무자. 운영·기타 계정으로 교육계획 수립 후, 승인된 계획 복수 매핑 신청. 무예산 개인 이력·운영 결과 등록 활용.',
    budgets: [
      { id: 'b_hmc01', name: '역량혁신팀 일반예산 참가계정', account: '참가', balance: 8200000, used: 1800000 },
      { id: 'b_hmc02', name: '역량혁신팀 일반예산 운영계정', account: '운영', balance: 12000000, used: 3500000 }
    ]
  },
  hmc_learner: {
    id: 'P402', name: '이O봉', dept: '내구기술팀', pos: '책임',
    type: 'HMC_Learner', typeLabel: 'HMC 학습자·연구원',
    company: '현대자동차', tenantId: 'HMC',
    role: 'learner', jobType: '연구직',
    allowedAccounts: ['HMC-PART', 'HMC-RND', 'COMMON-FREE'],
    isolationGroup: 'HMC-BOTH',
    desc: '일반예산 및 R&D교육예산 복합 학습자. R&D계정으로 계획→신청→결과, 일반예산 복수 계획 매핑 신청 가능. 무예산 이력 및 단순 결과 등록 활용.',
    budgets: [
      { id: 'b_hmc03', name: '내구기술팀 일반예산 참가계정', account: '참가', balance: 4500000, used: 500000 },
      { id: 'b_hmc04', name: '내구기술팀 R&D교육예산', account: '연구투자', balance: 45000000, used: 5000000 }
    ]
  },

  // ── 기아 (KIA) ────────────────────────────────────────────────────────────
  kia_learner: {
    id: 'P203', name: '강O우', dept: '개인정보보호팀', pos: '책임',
    type: 'KIA_Learner', typeLabel: 'KIA 학습자',
    company: '기아', tenantId: 'KIA',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['KIA-OPS', 'KIA-PART', 'COMMON-FREE'],
    isolationGroup: 'KIA-GENERAL',
    desc: '일반예산기반 학습자. 교육계획 수립 → 복수 계획 매핑 신청 → 결과 작성. 자비/무료 교육 무예산 이력 등록 및 결과 단독 등록 활용.',
    budgets: [
      { id: 'b_kia01', name: '개인정보보호팀 참가계정', account: '참가', balance: 5000000, used: 800000 },
      { id: 'b_kia02', name: '개인정보보호팀 운영계정', account: '운영', balance: 8000000, used: 1200000 }
    ]
  },

  // ── 현대오토에버 (HAE) ────────────────────────────────────────────────────
  hae_learner: {
    id: 'P303', name: '남O우', dept: 'PM서비스팀', pos: '책임',
    type: 'HAE_Learner', typeLabel: 'HAE 학습자 (솔루션사업부)',
    company: '현대오토에버', tenantId: 'HAE',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['HAE-EDU', 'HAE-TEAM', 'COMMON-FREE'],
    isolationGroup: 'HAE-ALL',
    desc: '솔루션사업부 학습자. 개인직무 사외학습 중심. 전사교육예산 및 팀/프로젝트 할당예산 활용.',
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
    isolationGroup: 'HAE-ALL',
    process: 'plan-apply-result',
    desc: 'L&D플랫폼팀 학습자. 플랫폼 운영·기획 관련 교육 및 개인직무 사외학습 프로세스 수행. 운영·참가·자격증 전 계정 활용 가능.',
    budgets: [
      { id: 'b_hae03', name: 'L&D플랫폼팀 운영계정', account: '운영', balance: 6000000, used: 1200000 },
      { id: 'b_hae04', name: 'L&D플랫폼팀 참가계정', account: '참가', balance: 3000000, used: 400000 },
      { id: 'b_hae05', name: 'L&D플랫폼팀 자격증계정', account: '자격증', balance: 1500000, used: 0 }
    ]
  },

  // ── 현대제철 (HSC) ────────────────────────────────────────────────────────
  hsc_learner: {
    id: 'P608', name: '정O안', dept: '성장디자인팀', pos: '매니저',
    type: 'HSC_Learner', typeLabel: 'HSC 학습자',
    company: '현대제철', tenantId: 'HSC',
    role: 'learner', jobType: '일반직',
    allowedAccounts: ['HSC-OPS', 'HSC-EXT', 'COMMON-FREE'],
    isolationGroup: 'IG-HSC-ALL',
    process: 'plan-apply-result',
    desc: '현대제철 성장디자인팀 학습자. 개인직무 사외학습 중심. 사외교육 계정(HSC-EXT) 활용.',
    budgets: [
      { id: 'b_hsc01', name: '성장디자인팀 사외교육계정', account: '사외교육', balance: 5000000, used: 0 }
    ]
  },
};


const MOCK_HISTORY = [
  { id: 'H001', title: 'AWS 클라우드 아키텍처 전문가 과정',   type: '사외교육', category: 'edu_offline',   date: '2026-02-10', endDate: '2026-02-12', hours: 24, amount: 1500000, status: '완료',   budget: '참가', applyStatus: '승인완료',   resultDone: true  },
  { id: 'H002', title: 'SDV 소프트웨어 개발 세미나',          type: '세미나',   category: 'conf_present',  date: '2026-01-20', endDate: '2026-01-20', hours:  8, amount:  300000, status: '완료',   budget: '참가', applyStatus: '승인완료',   resultDone: false },
  { id: 'H003', title: '애자일 PM 자격증 취득',               type: '자격증',   category: 'edu_online',    date: '2026-03-01', endDate: '2026-03-31', hours: 40, amount:  450000, status: '진행중', budget: '참가', applyStatus: '결재진행중', resultDone: false },
  { id: 'H004', title: '데이터 분석 이러닝',                  type: '이러닝',   category: 'edu_online',    date: '2025-12-01', endDate: '2025-12-31', hours: 20, amount:  200000, status: '완료',   budget: '참가', applyStatus: '반려',       resultDone: false },
  { id: 'H005', title: '리더십 워크샵',                       type: '워크샵',   category: 'workshop',      date: '2025-11-15', endDate: '2025-11-16', hours: 16, amount:  600000, status: '완료',   budget: '운영', applyStatus: '승인완료',   resultDone: true  },
  { id: 'H006', title: 'AI/ML 실무 활용 강의',                type: '사외교육', category: 'edu_offline',   date: '2026-03-20', endDate: '2026-03-21', hours: 16, amount:  800000, status: '대기중', budget: '참가', applyStatus: '승인대기',   resultDone: false },
];

const MOCK_PLANS = [
  { id: 'BP26-001', title: '26년 글로벌 AI 포럼 참가', account: '참가', budgetId: 'b_hmc01', amount: 5000000 },
  { id: 'BP26-002', title: 'SDV 아키텍처 전문가 양성', account: '연구투자', budgetId: 'b_hmc04', amount: 25000000 },
  { id: 'BP26-003', title: '리더십 워크샵 (피플육성)', account: '참가', budgetId: 'b_hmc01', amount: 3000000 },
  { id: 'BP26-004', title: '신규 입사자 온보딩 운영', account: '참가', budgetId: 'b_hmc01', amount: 8000000 },
];

// ─── GLOBAL STATE ────────────────────────────────────────────────────────────
let currentPersona = PERSONAS.hmc_team_mgr;
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
  };
}

let applyState = resetApplyState();

// ─── PURPOSES (교육 목적 정의) ──────────────────────────────────────────────

const PURPOSES = [
  {
    id: 'external_personal',
    label: '개인 직무 사외학습',
    desc: '개인 역량 향상 사외 활동',
    icon: '💼',
    accounts: ['참가', '연구투자', '사외교육'],
    subtypes: [
      {
        group: '정규교육',
        items: [
          { id: 'edu_elearning', label: '이러닝' },
          { id: 'edu_class',     label: '집합' },
          { id: 'edu_live',      label: '라이브' },
        ]
      },
      {
        group: '학술 및 연구활동',
        items: [
          { id: 'acad_conf',    label: '학회/세미나/컨퍼런스' },
          { id: 'acad_present', label: '학회 직접 발표' },
          { id: 'acad_study',   label: '연수' },
        ]
      },
      {
        group: '지식자원학습',
        items: [
          { id: 'res_book',    label: '도서' },
          { id: 'res_journal', label: '논문/저널' },
          { id: 'res_tech',    label: '기술자료(DB구독·자료구매)' },
        ]
      },
      {
        group: '역량개발지원',
        items: [
          { id: 'dev_lang',  label: '어학학습비 지원' },
          { id: 'dev_cert',  label: '자격증 취득지원' },
          { id: 'dev_assoc', label: '학협회비' },
        ]
      },
      {
        group: '기타',
        items: [
          { id: 'etc_teach', label: '교육출강(사/내외)' },
          { id: 'etc_team',  label: '팀빌딩' },
        ]
      },
    ]
  },
  {
    id: 'internal_edu',
    label: '집합/이러닝 운영',
    desc: '사내 교육과정을 직접 개설 및 운영',
    icon: '🖥',
    accounts: ['운영', '연구투자'],
    subtypes: null
  },
  {
    id: 'workshop',
    label: '워크샵/세미나/컨퍼런스 등 운영',
    desc: '교육담당자가 사외행사 참가를 운영·지원하는 형태',
    icon: '👥',
    accounts: ['참가', '운영', '연구투자'],
    subtypes: null
  },
  {
    id: 'etc',
    label: '기타',
    desc: '과정개발, 교안개발, 영상제작 등',
    icon: '📌',
    accounts: ['운영', '연구투자'],
    subtypes: null
  },
];
