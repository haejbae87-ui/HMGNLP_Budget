// ─── DATA LAYER ─────────────────────────────────────────────────────────────
// LXP 프론트 오피스 — 4개 테넌트 학습자 페르소나

const PERSONAS = {
  // ── 현대자동차 (HMC) ──────────────────────────────────────────────────────
  hmc_team_mgr: {
    id: 'P401', name: '조인성', dept: '역량혁신팀', pos: '책임',
    type: 'HMC_TeamMgr', typeLabel: 'HMC 팀담당자·실무자',
    company: '현대자동차', tenantId: 'HMC',
    role: 'team_general',
    // 보안: 일반예산 계정만 허용 — R&D예산 관련 신청/조회 불가
    allowedAccounts: ['HMC-OPS', 'HMC-PART', 'HMC-ETC', 'COMMON-FREE'],
    isolationGroup: 'HMC-GENERAL',
    desc: '일반예산(운영/기타/참가) 활용 실무자. 운영·기타 계정으로 교육계획 수립 후, 승인된 계획 복수 매핑 신청. 무예산 개인 이력·운영 결과 등록 활용.',
    budgets: [
      { id: 'b_hmc01', name: '역량혁신팀 일반예산 참가계정', account: '참가', balance: 8200000, used: 1800000 },
      { id: 'b_hmc02', name: '역량혁신팀 일반예산 운영계정', account: '운영', balance: 12000000, used: 3500000 }
    ]
  },
  hmc_learner: {
    id: 'P402', name: '이상봉', dept: '내구기술팀', pos: '책임',
    type: 'HMC_Learner', typeLabel: 'HMC 학습자·연구원',
    company: '현대자동차', tenantId: 'HMC',
    role: 'learner',
    // 보안: 일반예산(참가계정) + R&D예산 동시 허용 (권한 부여된 경우)
    allowedAccounts: ['HMC-PART', 'HMC-RND', 'COMMON-FREE'],
    isolationGroup: 'HMC-BOTH',   // 양쪽 계정 접근 가능한 특수 권한
    desc: '일반예산 및 R&D교육예산 복합 학습자. R&D계정으로 계획→신청→결과, 일반예산 복수 계획 매핑 신청 가능. 무예산 이력 및 단순 결과 등록 활용.',
    budgets: [
      { id: 'b_hmc03', name: '내구기술팀 일반예산 참가계정', account: '참가', balance: 4500000, used: 500000 },
      { id: 'b_hmc04', name: '내구기술팀 R&D교육예산', account: '연구투자', balance: 45000000, used: 5000000 }
    ]
  },

  // ── 기아 (KIA) ────────────────────────────────────────────────────────────
  kia_learner: {
    id: 'P203', name: '강동우', dept: '개인정보보호팀', pos: '책임',
    type: 'KIA_Learner', typeLabel: 'KIA 학습자',
    company: '기아', tenantId: 'KIA',
    role: 'learner',
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
    id: 'P303', name: '남영우', dept: 'PM서비스팀', pos: '책임',
    type: 'HAE_Learner', typeLabel: 'HAE 학습자 (솔루션사업부)',
    company: '현대오토에버', tenantId: 'HAE',
    role: 'learner',
    // HAE 정책: 개인직무 사외학습에 한정, 참가계정 + 자격증계정 활용 가능
    allowedAccounts: ['HAE-PART', 'HAE-CERT', 'COMMON-FREE'],
    isolationGroup: 'HAE-SOL',
    process: 'plan-apply-result',   // 고정 프로세스만 허용
    desc: '솔루션사업부 학습자. 개인직무 사외학습에 한정하여 프로세스 수행. HAE 고정 프로세스(개인직무 사외학습 계획 수립 ➡️ 계획 기반 신청 ➡️ 수료 후 결과 단순 입력) 준수. 본인의 개인직무 관련 학습 이력만 관리.',
    budgets: [
      { id: 'b_hae01', name: 'PM서비스팀 참가계정', account: '참가', balance: 4000000, used: 600000 },
      { id: 'b_hae02', name: 'PM서비스팀 자격증계정', account: '자격증', balance: 2000000, used: 0 }
    ]
  },
};

const MOCK_HISTORY = [
  { id: 'H001', title: 'AWS 클라우드 아키텍처 전문가 과정', type: '사외교육', category: 'edu_offline', date: '2026-02-10', endDate: '2026-02-12', hours: 24, amount: 1500000, status: '완료', budget: '참가' },
  { id: 'H002', title: 'SDV 소프트웨어 개발 세미나', type: '세미나', category: 'conf_present', date: '2026-01-20', endDate: '2026-01-20', hours: 8, amount: 300000, status: '완료', budget: '참가' },
  { id: 'H003', title: '애자일 PM 자격증 취득', type: '자격증', category: 'edu_online', date: '2026-03-01', endDate: '2026-03-31', hours: 40, amount: 450000, status: '진행중', budget: '참가' },
  { id: 'H004', title: '데이터 분석 이러닝', type: '이러닝', category: 'edu_online', date: '2025-12-01', endDate: '2025-12-31', hours: 20, amount: 200000, status: '완료', budget: '참가' },
  { id: 'H005', title: '리더십 워크샵', type: '워크샵', category: 'workshop', date: '2025-11-15', endDate: '2025-11-16', hours: 16, amount: 600000, status: '완료', budget: '운영' },
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

// LXP 페르소나 전환 목록 (백오피스 제외)
const LXP_PERSONA_LIST = ['hmc_team_mgr', 'hmc_learner', 'kia_learner', 'hae_learner'];

function resetApplyState() {
  return {
    step: 1,
    purpose: null,
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
    accounts: ['참가', '연구투자'],
    subtypes: [
      {
        group: '콘텐츠',
        desc: '언제 어디서든 시청/학습하는 형태',
        items: [
          { id: 'content_elearning', label: '이러닝' },
          { id: 'content_video', label: '동영상' },
          { id: 'content_ebook', label: '디지털 교재' }
        ]
      },
      {
        group: '오프라인 / 비대면',
        desc: '특정 시간에 실시간으로 참여하는 형태',
        items: [
          { id: 'live_class', label: '집합교육 (오프라인)' },
          { id: 'live_online', label: '실시간 화상교육 (비대면)' },
          { id: 'live_conf', label: '학회/세미나/컨퍼런스' },
          { id: 'live_present', label: '학회 직접 발표' }
        ]
      },
      {
        group: '자료 구독 / 구매',
        desc: '전문 지식을 참고/소유하는 형태',
        items: [
          { id: 'mat_book', label: '도서' },
          { id: 'mat_journal', label: '논문/저널' },
          { id: 'mat_tech', label: '기술자료 (DB구독·자료구매)' },
          { id: 'mat_membership', label: '학·협회비' }
        ]
      }
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
