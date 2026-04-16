// ─── BACK-OFFICE DATA LAYER ──────────────────────────────────────────────────

// ─── 사전 정의된 학습유형 (Learning Types) ──────────────────────────────────
const LEARNING_TYPES = [
  { category: "콘텐츠 학습", items: ["이러닝", "동영상", "디지털 교재"] },
  {
    category: "오프라인/비대면",
    items: [
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
      "학회 직접 발표",
    ],
  },
  {
    category: "자료 구독/구매",
    items: ["도서", "논문/저널", "기술자료", "학/협회비"],
  },
];

// ─── 교육지원 운영 규칙 → FO 연동 공유 데이터 ──────────────────────────────────────
// BO 교육지원 운영 규칙 위저드에서 설정한 정책을 FO 교육계획/신청 위저드와 연결합니다.
// FO에서는 이 데이터를 기반으로:
//   Step1(목적) → 해당 페르소나의 VOrg에 활성 정책이 있는 purpose만 표시
//   Step2(예산) → 선택된 purpose + VOrg에 해당하는 accountCode 계정만 표시
//   Step3(교육유형) → purpose + accountCode에 해당하는 allowedEduTypes만 표시
//
// [BO 목적 ID] — purpose 컬럼 유효값
//   elearning_class   : 이러닝/집합(비대면) 운영
//   conf_seminar      : 워크샵/세미나/콘퍼런스 등 운영
//   misc_ops          : 기타 운영
//   external_personal : 개인직무 사외학습
// ※ 구형 레거시 값 'internal_edu'는 DB 마이그레이션(2026-04-01)으로 elearning_class 로 일괄 변환됨.

const SERVICE_POLICIES_FO = []; // mock 제거 - DB 전용 모드

// Service Definitions (Process Pattern + Budget Toggle)
let SERVICE_DEFINITIONS = [
  {
    id: "SVC-HMC-OPS",
    tenantId: "HMC",
    name: "운영교육 (HMC)",
    desc: "사내외 집합교육 운영. 계획 수립 후 가점유 신청.",
    processPattern: "A",
    budgetLinked: true,
    applyMode: "holding",
    linkedAccounts: ["HMC-OPS"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
    ],
  },
  {
    id: "SVC-HMC-ETC",
    tenantId: "HMC",
    name: "기타교육 (HMC)",
    desc: "도서·자격증 등 기타 항목.",
    processPattern: "A",
    budgetLinked: true,
    applyMode: "holding",
    linkedAccounts: ["HMC-ETC"],
    status: "active",
    eduTypes: ["도서", "논문/저널", "기술자료", "학/협회비"],
  },
  {
    id: "SVC-HMC-PART",
    tenantId: "HMC",
    name: "개인참가비 지원 (HMC)",
    desc: "개인 선지불 후 청구. 영수증 첨부, 승인시 즉시차감.",
    processPattern: "B",
    budgetLinked: true,
    applyMode: "reimbursement",
    linkedAccounts: ["HMC-PART"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
      "학회 직접 발표",
      "도서",
      "논문/저널",
      "기술자료",
      "학/협회비",
    ],
  },
  {
    id: "SVC-HMC-RND",
    tenantId: "HMC",
    name: "R&D 교육 (HMC)",
    desc: "R&D 교육예산. 계획 필수, 가점유 후 결과 정산.",
    processPattern: "A",
    budgetLinked: true,
    applyMode: "holding",
    linkedAccounts: ["HMC-RND"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
      "학회 직접 발표",
      "도서",
      "논문/저널",
      "기술자료",
    ],
  },
  {
    id: "SVC-HMC-FREE",
    tenantId: "HMC",
    name: "무예산 학습이력 (HMC)",
    desc: "무료/자비 학습 이력만 등록.",
    processPattern: "C",
    budgetLinked: false,
    applyMode: null,
    linkedAccounts: [],
    status: "active",
    eduTypes: ["이러닝", "집합교육", "실시간 화상", "도서"],
  },
  {
    id: "SVC-KIA-OPS",
    tenantId: "KIA",
    name: "운영교육 (KIA)",
    desc: "기아 운영계정 교육. 계획 수립 후 가점유 신청.",
    processPattern: "A",
    budgetLinked: true,
    applyMode: "holding",
    linkedAccounts: ["KIA-OPS"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
    ],
  },
  {
    id: "SVC-KIA-PART",
    tenantId: "KIA",
    name: "개인참가비 지원 (KIA)",
    desc: "기아 개인 선지불 후 청구.",
    processPattern: "B",
    budgetLinked: true,
    applyMode: "reimbursement",
    linkedAccounts: ["KIA-PART"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
      "도서",
    ],
  },
  {
    id: "SVC-HAE-OPS",
    tenantId: "HAE",
    name: "운영교육 (HAE)",
    desc: "현대오토에버 운영계정. 계획->신청->결과 고정 프로세스.",
    processPattern: "A",
    budgetLinked: true,
    applyMode: "holding",
    linkedAccounts: ["HAE-OPS"],
    status: "active",
    eduTypes: ["이러닝", "집합교육", "실시간 화상"],
  },
  {
    id: "SVC-HAE-PART",
    tenantId: "HAE",
    name: "개인직무 사외학습 (HAE)",
    desc: "사외교육 참가비 지원. 영수증 첨부 신청.",
    processPattern: "B",
    budgetLinked: true,
    applyMode: "reimbursement",
    linkedAccounts: ["HAE-PART"],
    status: "active",
    eduTypes: [
      "이러닝",
      "집합교육",
      "실시간 화상",
      "학회/세미나/컨퍼런스 참석",
      "도서",
    ],
  },
  {
    id: "SVC-HAE-CERT",
    tenantId: "HAE",
    name: "자격증 취득 지원 (HAE)",
    desc: "자격증 응시료. 선지불 후 영수증 제출.",
    processPattern: "C",
    budgetLinked: true,
    applyMode: "reimbursement",
    linkedAccounts: ["HAE-CERT"],
    status: "active",
    eduTypes: ["기술자료", "학/협회비"],
  },
  {
    id: "SVC-HAE-FREE",
    tenantId: "HAE",
    name: "무예산 학습이력 (HAE)",
    desc: "무료 웨비나 등 학습 이력만 등록.",
    processPattern: "C",
    budgetLinked: false,
    applyMode: null,
    linkedAccounts: [],
    status: "active",
    eduTypes: ["이러닝", "집합교육", "실시간 화상"],
  },
];

// ─── 법인(테넌트) 마스터 ─────────────────────────────────────────────────────
const TENANTS = [
  {
    id: "HMC",
    name: "현대자동차",
    budgetMode: "full",
    color: "#002C5F",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    id: "KIA",
    name: "기아",
    budgetMode: "full",
    color: "#05141F",
    bg: "#F0FDF4",
    border: "#BBF7D0",
  },
  {
    id: "HAE",
    name: "현대오토에버",
    budgetMode: "full",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    id: "HSC",
    name: "현대제철",
    budgetMode: "full",
    color: "#BE123C",
    bg: "#FFF1F2",
    border: "#FECDD3",
  },
  {
    id: "ROTEM",
    name: "현대로템",
    budgetMode: "full",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  {
    id: "HEC",
    name: "현대엔지니어링",
    budgetMode: "full",
    color: "#0369A1",
    bg: "#F0F9FF",
    border: "#BAE6FD",
  },
  {
    id: "HTS",
    name: "현대트랜시스",
    budgetMode: "full",
    color: "#6D28D9",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
  {
    id: "GLOVIS",
    name: "현대글로비스",
    budgetMode: "full",
    color: "#0E7490",
    bg: "#ECFEFF",
    border: "#A5F3FC",
  },
  {
    id: "HIS",
    name: "현대차증권",
    budgetMode: "full",
    color: "#9D174D",
    bg: "#FDF2F8",
    border: "#FBCFE8",
  },
  {
    id: "KEFICO",
    name: "현대케피코",
    budgetMode: "full",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  {
    id: "HISC",
    name: "현대ISC",
    budgetMode: "full",
    color: "#374151",
    bg: "#F9FAFB",
    border: "#E5E7EB",
  },
];

// VOrg 조회 헬퍼 (VORG_TEMPLATES / EDU_SUPPORT_DOMAINS 하단에 let으로 선언됨)
function getVorg(id) {
  const domains =
    typeof VORG_TEMPLATES !== "undefined"
      ? VORG_TEMPLATES
      : typeof EDU_SUPPORT_DOMAINS !== "undefined"
        ? EDU_SUPPORT_DOMAINS
        : [];
  return domains.find((g) => g.id === id) || null;
}
function getIsolationGroup(id) {
  return getVorg(id);
} // 구버전 호환

// ─── 다중 테넌트 페르소나 (테넌트별 분리) ─────────────────────────────────────
const BO_PERSONAS = {
  // ── [플랫폼 총괄] ─────────────────────────────────────────────────────────
  platform_admin: {
    id: "P000",
    name: "배O석",
    dept: "LX플랫폼추진TFT",
    pos: "책임",
    role: "platform_admin",
    roleLabel: "플랫폼 총괄",
    roleClass: "role-platform",
    roleTag: "[SYSTEM]",
    budgetGroup: null,
    tenantId: null,
    // 플랫폼 총괄: 모든 테넌트·계정 전체 조회 가능
    ownedAccounts: ["*"], // 전체 계정 소유자(설정 전용)
    allowedAccounts: ["*"], // 전체 조회
    vorgId: "SYSTEM",
    accessMenus: [
      "dashboard",
      "platform-monitor",
      "platform-roles",
      "tenant-mgmt",
      "org-mgmt",
      "user-mgmt",
      "role-mgmt",
      "role-menu-perms",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "field-mgmt",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대자동차 HMC] ──────────────────────────────────────────────────────
  // ※ HMC 내 일반예산·R&D예산은 계정 소유권 기반으로 완전 격리
  //   → vorgId가 다른 페르소나끼리는 서로의 계획/집행/조직 데이터 접근 불가
  // ── HMC 테넌트 총괄 ────────────────────────────────────────────────────────
  hmc_tenant_admin: {
    id: "P100",
    name: "최O영",
    dept: "역량혁신팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "HMC 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: null,
    tenantId: "HMC",
    // 테넌트 총괄: 격리 그룹 생성/관리 + 총괄 권한 부여만. 예산 실무 접근 없음
    ownedAccounts: [],
    allowedAccounts: ["HMC-OPS", "HMC-PART", "HMC-ETC", "HMC-RND"],
    vorgId: "HMC-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  // ── HMC 일반예산 그룹 ────────────────────────────────────────────────────────
  hmc_total_general: {
    id: "P101",
    name: "신O남",
    dept: "피플육성팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (일반그룹)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HMC",
    domainId: "IG-HMC-GEN",
    vorgIds: ["IG-HMC-GEN"], // 담당 격리그룹 목록 (다중 가능)
    ownedAccounts: ["HMC-OPS", "HMC-PART", "HMC-ETC"],
    allowedAccounts: ["HMC-OPS", "HMC-PART", "HMC-ETC"],
    vorgId: "HMC-GENERAL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hmc_hq_general: {
    id: "P102",
    name: "이O현",
    dept: "HMG경영연구원",
    pos: "매니저",
    role: "budget_op_manager",
    roleLabel: "예산 운영 (일반본부)",
    roleClass: "role-hq",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HMC",
    domainId: "IG-HMC-GEN",
    vorgIds: ["IG-HMC-GEN"],
    scope: "HMG경영연구원",
    managedVorgId: "HQ01",
    managerPersonaKey: "hmc_hq_general",
    cooperators: [],
    ownedAccounts: [],
    allowedAccounts: ["HMC-OPS", "HMC-PART", "HMC-ETC"],
    vorgId: "HMC-GENERAL",
    accessMenus: [
      "dashboard",
      "my-operations",
      "org-budget",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  // ── HMC R&D예산 그룹 ────────────────────────────────────────────────────────
  hmc_total_rnd: {
    id: "P103",
    name: "류O령",
    dept: "연구개발성장지원팀",
    pos: "책임",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (R&D그룹)",
    roleClass: "role-rnd",
    roleTag: "[총괄]",
    budgetGroup: "rnd",
    tenantId: "HMC",
    domainId: "IG-HMC-RND",
    vorgIds: ["IG-HMC-RND"],
    ownedAccounts: ["HMC-RND"],
    allowedAccounts: ["HMC-RND"],
    vorgId: "HMC-RND",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hmc_center_rnd: {
    id: "P104",
    name: "이O하",
    dept: "모빌리티기술센터",
    pos: "책임",
    role: "budget_op_manager",
    roleLabel: "예산 운영 (R&D센터)",
    roleClass: "role-center",
    roleTag: "[운영]",
    budgetGroup: "rnd",
    tenantId: "HMC",
    domainId: "IG-HMC-RND",
    scope: "모빌리티기술센터",
    managedVorgId: "C01",
    managerPersonaKey: "hmc_center_rnd",
    cooperators: [],
    ownedAccounts: [],
    allowedAccounts: ["HMC-RND"],
    vorgId: "HMC-RND",
    accessMenus: [
      "dashboard",
      "my-operations",
      "org-budget",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // 김O수: HMC 연구개발성장지원팀 (사용자 관리에서 예산운영담당자 역할 추가된 학습자)
  hmc_op_kim: {
    id: "RND001",
    name: "김O수",
    dept: "연구개발성장지원팀",
    pos: "매니저",
    role: "budget_op_manager",
    roleLabel: "예산 운영 (일반그룹)",
    roleClass: "role-center",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HMC",
    domainId: "IG-HMC-GEN",
    scope: "연구개발성장지원팀",
    ownedAccounts: [],
    allowedAccounts: ["HMC-OPS"],
    vorgId: "HMC-GEN",
    accessMenus: [
      "dashboard",
      "my-operations",
      "org-budget",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [기아 KIA] ────────────────────────────────────────────────────────────
  // 고O현: KIA 테넌트 총괄 겸 일반예산 총괄 (단일 격리 그룹 소규모 테넌트)
  kia_tenant_admin: {
    id: "P200",
    name: "고O현",
    dept: "HRD솔루션팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "KIA 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "KIA",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  kia_total_general: {
    id: "P201",
    name: "고O현",
    dept: "HRD솔루션팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (KIA 일반)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "KIA",
    domainId: "IG-KIA-GEN",
    vorgIds: ["IG-KIA-GEN"],
    ownedAccounts: ["KIA-OPS", "KIA-PART", "KIA-ETC"],
    allowedAccounts: ["KIA-OPS", "KIA-PART", "KIA-ETC"],
    vorgId: "KIA-GENERAL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  kia_hq_general: {
    id: "P202",
    name: "장O범",
    dept: "Autoland교육팀",
    pos: "책임",
    role: "budget_op_manager",
    roleLabel: "예산 운영 (Autoland)",
    roleClass: "role-hq",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "KIA",
    domainId: "IG-KIA-GEN",
    scope: "Autoland사업부",
    managedVorgId: "KIAHQ01",
    managerPersonaKey: "kia_hq_general",
    cooperators: [],
    ownedAccounts: [],
    allowedAccounts: ["KIA-OPS", "KIA-PART", "KIA-ETC"],
    vorgId: "KIA-GENERAL",
    accessMenus: [
      "dashboard",
      "my-operations",
      "org-budget",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대오토에버 HAE] ────────────────────────────────────────────────────
  // 안O기: HAE 테넌트 총괄 겸 전사 예산 총괄 (단일 격리 그룹 소규모 테넌트)
  hae_tenant_admin: {
    id: "P300",
    name: "안O기",
    dept: "인재성장문화팀",
    pos: "책임",
    role: "tenant_global_admin",
    roleLabel: "HAE 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HAE",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hae_total: {
    id: "P301",
    name: "안O기",
    dept: "인재성장문화팀",
    pos: "책임",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HAE)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HAE",
    domainId: "IG-HAE-ALL",
    ownedAccounts: ["HAE-OPS", "HAE-PART", "HAE-CERT", "HAE-EDU", "HAE-TEAM"],
    allowedAccounts: ["HAE-OPS", "HAE-PART", "HAE-CERT", "HAE-EDU", "HAE-TEAM"],
    vorgId: "HAE-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hae_dept: {
    id: "P302",
    name: "김O늘",
    dept: "PM서비스팀",
    pos: "책임",
    role: "budget_op_manager",
    roleLabel: "예산 운영 (솔루션사업부)",
    roleClass: "role-hq",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HAE",
    domainId: "IG-HAE-ALL",
    scope: "솔루션사업부",
    managedVorgId: "HAEHQ01",
    managerPersonaKey: "hae_dept",
    cooperators: [],
    ownedAccounts: [],
    allowedAccounts: ["HAE-OPS"],
    vorgId: "HAE-SOL",
    accessMenus: [
      "dashboard",
      "my-operations",
      "org-budget",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대로템 ROTEM] ──────────────────────────────────────
  rotem_tenant_admin: {
    id: "P400",
    name: "담O은",
    dept: "교육문화팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "ROTEM 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "ROTEM",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  rotem_total: {
    id: "P401",
    name: "담O은",
    dept: "교육문화팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (ROTEM)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "ROTEM",
    domainId: "IG-ROTEM-ALL",
    ownedAccounts: ["ROTEM-OPS", "ROTEM-PART"],
    allowedAccounts: ["ROTEM-OPS", "ROTEM-PART"],
    vorgId: "ROTEM-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대엔지니어링 HEC] ─────────────────────────────────
  hec_tenant_admin: {
    id: "P500",
    name: "김O찬",
    dept: "인사전략팀",
    pos: "체임매니저",
    role: "tenant_global_admin",
    roleLabel: "HEC 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HEC",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hec_total: {
    id: "P501",
    name: "김O찬",
    dept: "인사전략팀",
    pos: "체임매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HEC)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HEC",
    domainId: "IG-HEC-ALL",
    ownedAccounts: ["HEC-OPS", "HEC-PART"],
    allowedAccounts: ["HEC-OPS", "HEC-PART"],
    vorgId: "HEC-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대제슠 HSC] ──────────────────────────────────────
  hsc_tenant_admin: {
    id: "P600",
    name: "정O안",
    dept: "성장디자인팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "HSC 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HSC",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_budget_gen: {
    id: "P607",
    name: "최O경",
    dept: "성장디자인팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_total: {
    id: "P601",
    name: "정O안",
    dept: "성장디자인팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HSC)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    vorgId: "HSC-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  hsc_budget_rnd: {
    id: "P602",
    name: "송O연",
    dept: "R&D운영팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_budget_hr_dang: {
    id: "P603",
    name: "박O연",
    dept: "(당)인사지원팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_budget_hr_in: {
    id: "P604",
    name: "박O영",
    dept: "(인)인사팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_budget_hr_po: {
    id: "P605",
    name: "석O영",
    dept: "(포)인사팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hsc_budget_cold: {
    id: "P606",
    name: "김O민",
    dept: "(순)냉연업무지원팀",
    pos: "매니저",
    role: "budget_admin",
    roleLabel: "예산운영담당 (HSC)",
    roleClass: "role-admin",
    roleTag: "[운영]",
    budgetGroup: "general",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    ownedAccounts: ["HSC-OPS", "HSC-PART"],
    allowedAccounts: ["HSC-OPS", "HSC-PART"],
    accessMenus: [
      "dashboard",
      "budget-account",
      "virtual-org",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대트랜시스 HTS] ─────────────────────────────────
  hts_tenant_admin: {
    id: "P700",
    name: "임O빈",
    dept: "조직개발팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "HTS 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HTS",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hts_total: {
    id: "P701",
    name: "임O빈",
    dept: "조직개발팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HTS)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HTS",
    domainId: "IG-HTS-ALL",
    ownedAccounts: ["HTS-OPS", "HTS-PART"],
    allowedAccounts: ["HTS-OPS", "HTS-PART"],
    vorgId: "HTS-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대글로비스 GLOVIS] ──────────────────────────────
  glovis_tenant_admin: {
    id: "P800",
    name: "임O래",
    dept: "교육문화팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "GLOVIS 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "GLOVIS",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  glovis_total: {
    id: "P801",
    name: "임O래",
    dept: "교육문화팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (GLOVIS)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "GLOVIS",
    domainId: "IG-GLOVIS-ALL",
    ownedAccounts: ["GLOVIS-OPS", "GLOVIS-PART"],
    allowedAccounts: ["GLOVIS-OPS", "GLOVIS-PART"],
    vorgId: "GLOVIS-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대차증권 HIS] ───────────────────────────────────
  his_tenant_admin: {
    id: "P900",
    name: "김O형",
    dept: "TM팀",
    pos: "체임매니저",
    role: "tenant_global_admin",
    roleLabel: "HIS 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HIS",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  his_total: {
    id: "P901",
    name: "김O형",
    dept: "TM팀",
    pos: "체임매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HIS)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HIS",
    domainId: "IG-HIS-ALL",
    ownedAccounts: ["HIS-OPS", "HIS-PART"],
    allowedAccounts: ["HIS-OPS", "HIS-PART"],
    vorgId: "HIS-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대케피코 KEFICO] ────────────────────────────────
  kefico_tenant_admin: {
    id: "P1000",
    name: "이O영",
    dept: "인사팀",
    pos: "체임매니저",
    role: "tenant_global_admin",
    roleLabel: "KEFICO 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "KEFICO",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  kefico_total: {
    id: "P1001",
    name: "이O영",
    dept: "인사팀",
    pos: "체임매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (KEFICO)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "KEFICO",
    domainId: "IG-KEFICO-ALL",
    ownedAccounts: ["KEFICO-OPS", "KEFICO-PART"],
    allowedAccounts: ["KEFICO-OPS", "KEFICO-PART"],
    vorgId: "KEFICO-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [현대ISC HISC] ──────────────────────────────────────
  hisc_tenant_admin: {
    id: "P1100",
    name: "오O성",
    dept: "인사지원팀",
    pos: "매니저",
    role: "tenant_global_admin",
    roleLabel: "HISC 테넌트 총괄",
    roleClass: "role-tenant",
    roleTag: "[테넌트]",
    budgetGroup: "general",
    tenantId: "HISC",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hisc_total: {
    id: "P1101",
    name: "오O성",
    dept: "인사지원팀",
    pos: "매니저",
    role: "budget_global_admin",
    roleLabel: "예산 총괄 (HISC)",
    roleClass: "role-total",
    roleTag: "[총괄]",
    budgetGroup: "general",
    tenantId: "HISC",
    domainId: "IG-HISC-ALL",
    ownedAccounts: ["HISC-OPS", "HISC-PART"],
    allowedAccounts: ["HISC-OPS", "HISC-PART"],
    vorgId: "HISC-ALL",
    accessMenus: [
      "dashboard",
      "isolation-groups",
      "budget-account",
      "virtual-org",
      "form-builder",
      "calc-grounds",
      "service-policy",
      "plan-mgmt",
      "result-mgmt",
      "allocation",
      "budget-history",
      "budget-demand",
      "my-operations",
      "channel-mgmt",
      "course-mgmt",
      "session-mgmt",
      "enrollment-mgmt",
      "reports",
      "manual",
      "prd-collection",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },

  // ── [프론트/학습자 — LXP 전용] ───────────────────────────────────────────
  hmc_team_mgr: {
    id: "P401",
    name: "조O성",
    dept: "역량혁신팀",
    pos: "책임",
    role: "team_general",
    roleLabel: "팀 담당자 (LXP)",
    roleClass: "role-team",
    roleTag: "[팀]",
    budgetGroup: "general",
    tenantId: "HMC",
    vorgId: "HMC-GENERAL",
    scope: "역량혁신팀",
    accessMenus: [
      "dashboard",
      "plan-mgmt",
      "allocation",
      "budget-history",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
  hmc_learner: {
    id: "P402",
    name: "이O봉",
    dept: "내구기술팀",
    pos: "책임",
    role: "learner",
    roleLabel: "일반 학습자 (LXP)",
    roleClass: "role-team",
    roleTag: "[학습자]",
    budgetGroup: "general",
    tenantId: "HMC",
    vorgId: "HMC-GENERAL",
    orgId: "team-naegoo", // 내구기술팀 org ID
    orgHqId: "0cea84e6-3821-45e1-9e0c-e232af019a1d", // 연구개발본부 (shared 모드 대비)
    scope: "내구기술팀",
    // 연구개발본부 → HMC일반교육예산 VOrg 맵핑 → 일반계정 3종 사용 가능
    // 연구개발본부 → HMC R&D교육예산 VOrg 맵핑 → RND 계정 사용 가능
    allowedAccounts: ["HMC-PART", "HMC-OPS", "HMC-ETC", "HMC-RND"],
    accessMenus: [
      "dashboard",
      "badge-group-mgmt",
      "badge-mgmt",
      "badge-operation",
    ],
  },
};

// VOrg Templates Master
// 예산총괄/운영담당자는 vorgIds[] 배열로 여러 VOrg를 운영할 수 있습니다.
let VORG_TEMPLATES = [
  {
    id: "IG-HMC-GEN",
    tenantId: "HMC",
    name: "일반교육예산 그룹",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    desc: "HMC 일반직군 교육예산",
    globalAdminKey: "hmc_total_general",
    globalAdminKeys: ["hmc_total_general"],
    opManagerKeys: ["hmc_hq_general"],
    ownedAccounts: ["HMC-OPS", "HMC-ETC", "HMC-PART"],
    createdBy: "hmc_tenant_admin",
    status: "active",
    createdAt: "2026-01-01",
  },
  {
    id: "IG-HMC-RND",
    tenantId: "HMC",
    name: "R&D교육예산 그룹",
    color: "#DC2626",
    bg: "#FEF2F2",
    desc: "HMC R&D 교육예산",
    globalAdminKey: "hmc_total_rnd",
    globalAdminKeys: ["hmc_total_rnd"],
    opManagerKeys: ["hmc_center_rnd"],
    ownedAccounts: ["HMC-RND"],
    createdBy: "hmc_tenant_admin",
    status: "active",
    createdAt: "2026-01-01",
  },
  {
    id: "IG-HMC-FREE",
    tenantId: "HMC",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HMC 무예산 학습이력 관리 전용",
    globalAdminKey: "hmc_total_general",
    globalAdminKeys: ["hmc_total_general"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hmc_tenant_admin",
    status: "active",
    createdAt: "2026-01-01",
  },
  {
    id: "IG-KIA-GEN",
    tenantId: "KIA",
    name: "KIA 일반예산 그룹",
    color: "#059669",
    bg: "#F0FDF4",
    desc: "기아 전사 일반교육예산",
    globalAdminKey: "kia_total_general",
    globalAdminKeys: ["kia_total_general"],
    opManagerKeys: ["kia_hq_general"],
    ownedAccounts: ["KIA-OPS", "KIA-PART", "KIA-ETC"],
    createdBy: "kia_total_general",
    status: "active",
    createdAt: "2026-01-15",
  },
  {
    id: "IG-KIA-FREE",
    tenantId: "KIA",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "KIA 무예산 학습이력 관리 전용",
    globalAdminKey: "kia_total_general",
    globalAdminKeys: ["kia_total_general"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "kia_total_general",
    status: "active",
    createdAt: "2026-01-15",
  },
  {
    id: "IG-HAE-ALL",
    tenantId: "HAE",
    name: "HAE 전사예산 그룹",
    color: "#7C3AED",
    bg: "#F5F3FF",
    desc: "HAE 전사 교육예산",
    globalAdminKey: "hae_total",
    globalAdminKeys: ["hae_total"],
    opManagerKeys: ["hae_dept"],
    ownedAccounts: ["HAE-OPS", "HAE-PART", "HAE-CERT", "HAE-EDU", "HAE-TEAM"],
    createdBy: "hae_total",
    status: "active",
    createdAt: "2026-01-20",
  },
  {
    id: "IG-HAE-FREE",
    tenantId: "HAE",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HAE 무예산 학습이력 관리 전용",
    globalAdminKey: "hae_total",
    globalAdminKeys: ["hae_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hae_total",
    status: "active",
    createdAt: "2026-01-20",
  },
  {
    id: "IG-ROTEM-ALL",
    tenantId: "ROTEM",
    name: "로템 전사예산",
    color: "#B45309",
    bg: "#FFFBEB",
    desc: "현대로템 업무 교육예산",
    globalAdminKey: "rotem_total",
    globalAdminKeys: ["rotem_total"],
    opManagerKeys: [],
    ownedAccounts: ["ROTEM-OPS", "ROTEM-PART"],
    createdBy: "rotem_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-ROTEM-FREE",
    tenantId: "ROTEM",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "로템 무예산 학습이력 관리 전용",
    globalAdminKey: "rotem_total",
    globalAdminKeys: ["rotem_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "rotem_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HEC-ALL",
    tenantId: "HEC",
    name: "HEC 전사예산",
    color: "#0369A1",
    bg: "#F0F9FF",
    desc: "현대엔지니어링 교육예산",
    globalAdminKey: "hec_total",
    globalAdminKeys: ["hec_total"],
    opManagerKeys: [],
    ownedAccounts: ["HEC-OPS", "HEC-PART"],
    createdBy: "hec_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HEC-FREE",
    tenantId: "HEC",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HEC 무예산 학습이력 관리 전용",
    globalAdminKey: "hec_total",
    globalAdminKeys: ["hec_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hec_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HSC-ALL",
    tenantId: "HSC",
    name: "HSC 전사예산",
    color: "#BE123C",
    bg: "#FFF1F2",
    desc: "현대제철 교육예산",
    globalAdminKey: "hsc_total",
    globalAdminKeys: ["hsc_total"],
    opManagerKeys: [],
    ownedAccounts: ["HSC-OPS", "HSC-PART", "HSC-EXT"],
    createdBy: "hsc_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HSC-FREE",
    tenantId: "HSC",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HSC 무예산 학습이력 관리 전용",
    globalAdminKey: "hsc_total",
    globalAdminKeys: ["hsc_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hsc_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HTS-ALL",
    tenantId: "HTS",
    name: "HTS 전사예산",
    color: "#6D28D9",
    bg: "#F5F3FF",
    desc: "현대트랜시스 교육예산",
    globalAdminKey: "hts_total",
    globalAdminKeys: ["hts_total"],
    opManagerKeys: [],
    ownedAccounts: ["HTS-OPS", "HTS-PART"],
    createdBy: "hts_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HTS-FREE",
    tenantId: "HTS",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HTS 무예산 학습이력 관리 전용",
    globalAdminKey: "hts_total",
    globalAdminKeys: ["hts_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hts_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-GLOVIS-ALL",
    tenantId: "GLOVIS",
    name: "GLOVIS 전사예산",
    color: "#0E7490",
    bg: "#ECFEFF",
    desc: "현대글로비스 교육예산",
    globalAdminKey: "glovis_total",
    globalAdminKeys: ["glovis_total"],
    opManagerKeys: [],
    ownedAccounts: ["GLOVIS-OPS", "GLOVIS-PART"],
    createdBy: "glovis_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-GLOVIS-FREE",
    tenantId: "GLOVIS",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "GLOVIS 무예산 학습이력 관리",
    globalAdminKey: "glovis_total",
    globalAdminKeys: ["glovis_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "glovis_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HIS-ALL",
    tenantId: "HIS",
    name: "HIS 교육예산",
    color: "#9D174D",
    bg: "#FDF2F8",
    desc: "현대차증권 교육예산",
    globalAdminKey: "his_total",
    globalAdminKeys: ["his_total"],
    opManagerKeys: [],
    ownedAccounts: ["HIS-OPS", "HIS-PART"],
    createdBy: "his_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HIS-FREE",
    tenantId: "HIS",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HIS 무예산 학습이력 관리 전용",
    globalAdminKey: "his_total",
    globalAdminKeys: ["his_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "his_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-KEFICO-ALL",
    tenantId: "KEFICO",
    name: "KEFICO 교육예산",
    color: "#1D4ED8",
    bg: "#EFF6FF",
    desc: "현대케피코 교육예산",
    globalAdminKey: "kefico_total",
    globalAdminKeys: ["kefico_total"],
    opManagerKeys: [],
    ownedAccounts: ["KEFICO-OPS", "KEFICO-PART"],
    createdBy: "kefico_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-KEFICO-FREE",
    tenantId: "KEFICO",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "KEFICO 무예산 학습이력 관리",
    globalAdminKey: "kefico_total",
    globalAdminKeys: ["kefico_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "kefico_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HISC-ALL",
    tenantId: "HISC",
    name: "HISC 교육예산",
    color: "#374151",
    bg: "#F9FAFB",
    desc: "현대ISC 교육예산",
    globalAdminKey: "hisc_total",
    globalAdminKeys: ["hisc_total"],
    opManagerKeys: [],
    ownedAccounts: ["HISC-OPS", "HISC-PART"],
    createdBy: "hisc_total",
    status: "active",
    createdAt: "2026-02-01",
  },
  {
    id: "IG-HISC-FREE",
    tenantId: "HISC",
    name: "예산미사용 그룹",
    color: "#6B7280",
    bg: "#F9FAFB",
    desc: "HISC 무예산 학습이력 관리 전용",
    globalAdminKey: "hisc_total",
    globalAdminKeys: ["hisc_total"],
    opManagerKeys: [],
    ownedAccounts: ["COMMON-FREE"],
    createdBy: "hisc_total",
    status: "active",
    createdAt: "2026-02-01",
  },
];
// 구버전 호환 별칭
let EDU_SUPPORT_DOMAINS = VORG_TEMPLATES;

const savedPersonaBo =
  sessionStorage.getItem("currentPersona") || "platform_admin";
let boCurrentPersona =
  BO_PERSONAS[savedPersonaBo] || BO_PERSONAS.platform_admin;
let boCurrentMenu = sessionStorage.getItem("boLastMenu") || "dashboard";

// ─── 가상 조직도 (Virtual Org) ───────────────────────────────────────────────

var VIRTUAL_EDU_ORGS = [
  {
    id: "TPL_GEN_01",
    tenantId: "HMC",
    domainId: "IG-HMC-GEN",
    name: "현대자동차 일반교육예산 템플릿 1",
    tree: {
      label: "일반 교육예산 조직",
      hqs: [
        {
          id: "HQ01",
          managerPersonaKey: "hmc_hq_general",
          cooperators: [],
          name: "HMGOOOO본부",
          manager: "이O현",
          budget: { total: 180000000, deducted: 42000000, holding: 18000000 },
          teams: [
            {
              id: "T01",
              allowedJobTypes: [],
              name: "피플OO팀",
              budget: {
                allocated: 35000000,
                deducted: 12000000,
                holding: 5000000,
              },
            },
            {
              id: "T02",
              allowedJobTypes: [],
              name: "역량OO팀",
              budget: {
                allocated: 28000000,
                deducted: 8000000,
                holding: 3000000,
              },
            },
            {
              id: "T03",
              allowedJobTypes: [],
              name: "성과OO팀",
              budget: {
                allocated: 22000000,
                deducted: 6000000,
                holding: 2000000,
              },
            },
          ],
        },
        {
          id: "HQ02",
          managerPersonaKey: "",
          cooperators: [],
          name: "SDVOOOO본부",
          manager: "OO담당자",
          budget: { total: 120000000, deducted: 28000000, holding: 12000000 },
          teams: [
            {
              id: "T04",
              allowedJobTypes: [],
              name: "SDV기술팀",
              budget: {
                allocated: 40000000,
                deducted: 15000000,
                holding: 8000000,
              },
            },
            {
              id: "T05",
              allowedJobTypes: [],
              name: "아키텍처팀",
              budget: {
                allocated: 30000000,
                deducted: 10000000,
                holding: 2000000,
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "TPL_RND_01",
    tenantId: "HMC",
    domainId: "IG-HMC-RND",
    name: "현대차 R&D교육예산 템플릿 1",
    tree: {
      label: "R&D 교육예산 조직",
      centers: [
        {
          id: "C01",
          managerPersonaKey: "hmc_center_rnd",
          cooperators: [],
          name: "모빌리티OOOO센터",
          manager: "이O하",
          budget: { total: 200000000, deducted: 55000000, holding: 25000000 },
          teams: [
            {
              id: "T11",
              allowedJobTypes: [],
              name: "내구OO팀",
              budget: {
                allocated: 60000000,
                deducted: 18000000,
                holding: 10000000,
              },
            },
            {
              id: "T12",
              allowedJobTypes: [],
              name: "구동OO팀",
              budget: {
                allocated: 45000000,
                deducted: 12000000,
                holding: 5000000,
              },
            },
            {
              id: "T13",
              allowedJobTypes: [],
              name: "전장OO팀",
              budget: {
                allocated: 38000000,
                deducted: 10000000,
                holding: 4000000,
              },
            },
          ],
        },
        {
          id: "C02",
          managerPersonaKey: "",
          cooperators: [],
          name: "전동화OOOO센터",
          manager: "OO책임",
          budget: { total: 150000000, deducted: 30000000, holding: 15000000 },
          teams: [
            {
              id: "T14",
              allowedJobTypes: [],
              name: "배터리OO팀",
              budget: {
                allocated: 50000000,
                deducted: 12000000,
                holding: 8000000,
              },
            },
            {
              id: "T15",
              allowedJobTypes: [],
              name: "인버터OO팀",
              budget: {
                allocated: 35000000,
                deducted: 8000000,
                holding: 3000000,
              },
            },
          ],
        },
      ],
    },
  },
  // KIA 가상조직 템플릿
  {
    id: "TPL_KIA_GEN_01",
    tenantId: "KIA",
    domainId: "IG-KIA-GEN",
    name: "기아 일반교육예산 템플릿 1",
    tree: {
      label: "기아 일반 교육예산 조직",
      hqs: [
        {
          id: "KIAHQ01",
          managerPersonaKey: "kia_hq_general",
          cooperators: [],
          name: "Autoland사업부",
          manager: "장성범",
          budget: { total: 120000000, deducted: 30000000, holding: 10000000 },
          teams: [
            {
              id: "KT01",
              allowedJobTypes: [],
              name: "Autoland교육팀",
              budget: {
                allocated: 40000000,
                deducted: 12000000,
                holding: 5000000,
              },
            },
            {
              id: "KT02",
              allowedJobTypes: [],
              name: "생산기술팀",
              budget: {
                allocated: 35000000,
                deducted: 10000000,
                holding: 3000000,
              },
            },
          ],
        },
      ],
    },
  },
  // HAE 가상조직 템플릿
  {
    id: "TPL_HAE_GEN_01",
    tenantId: "HAE",
    domainId: "IG-HAE-ALL",
    name: "현대오토에버 교육예산 템플릿 1",
    tree: {
      label: "오토에버 교육예산 조직",
      hqs: [
        {
          id: "HAEHQ01",
          managerPersonaKey: "hae_dept",
          cooperators: [],
          name: "솔루션사업부",
          manager: "안슬기",
          budget: { total: 90000000, deducted: 20000000, holding: 8000000 },
          teams: [
            {
              id: "HT01",
              allowedJobTypes: [],
              name: "PM서비스팀",
              budget: {
                allocated: 30000000,
                deducted: 8000000,
                holding: 3000000,
              },
            },
            {
              id: "HT02",
              allowedJobTypes: [],
              name: "클라우드서비스팀",
              budget: {
                allocated: 25000000,
                deducted: 6000000,
                holding: 2000000,
              },
            },
          ],
        },
        {
          id: "HAEHQ02",
          managerPersonaKey: "",
          cooperators: [],
          name: "인프라세사업부",
          manager: "안슬기",
          budget: { total: 60000000, deducted: 12000000, holding: 5000000 },
          teams: [
            {
              id: "HT03",
              allowedJobTypes: [],
              name: "네트워크관리팀",
              budget: {
                allocated: 20000000,
                deducted: 5000000,
                holding: 2000000,
              },
            },
          ],
        },
      ],
    },
  },
  // HSC 가상조직 템플릿
  {
    id: "TPL_HSC_ALL_01",
    tenantId: "HSC",
    domainId: "IG-HSC-ALL",
    name: "현대제철 전사예산 템플릿 1",
    jobTypes: ["일반직", "생산직", "기술직", "연구직", "임원"], // 현대제철 직군 정의
    tree: {
      label: "현대제철 전사 교육예산 조직",
      hqs: [
        // ① 전사 일반직
        {
          id: "HSCVO01",
          name: "전사 일반직",
          managerPersonaKey: "hsc_budget_gen",
          managerPersonaKeys: ["hsc_budget_gen"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 150000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT01",
              name: "준법경영실",
              allowedJobTypes: ["일반직", "임원"],
              budget: { allocated: 20000000, deducted: 0, holding: 0 },
            },
            {
              id: "HSVT02",
              name: "국제법무팀",
              allowedJobTypes: ["일반직", "임원"],
              budget: { allocated: 20000000, deducted: 0, holding: 0 },
            },
            {
              id: "HSVT03",
              name: "(포)전기로기술팀",
              allowedJobTypes: ["일반직", "임원"],
              budget: { allocated: 25000000, deducted: 0, holding: 0 },
            },
            {
              id: "HSVT04",
              name: "(당)자재팀",
              allowedJobTypes: ["일반직", "임원"],
              budget: { allocated: 25000000, deducted: 0, holding: 0 },
            },
            {
              id: "HSVT05",
              name: "(인)전기로기술팀",
              allowedJobTypes: ["일반직", "임원"],
              budget: { allocated: 25000000, deducted: 0, holding: 0 },
            },
            {
              id: "HSVT06",
              name: "(순)전기로기술팀",
              allowedJobTypes: ["일반직"],
              budget: { allocated: 35000000, deducted: 0, holding: 0 },
            },
          ],
        },
        // ② 전사 연구직
        {
          id: "HSCVO02",
          name: "전사 연구직",
          managerPersonaKey: "hsc_budget_rnd",
          managerPersonaKeys: ["hsc_budget_rnd"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 80000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT11",
              name: "R&D전략기획팀",
              allowedJobTypes: ["연구직"],
              budget: { allocated: 80000000, deducted: 0, holding: 0 },
            },
          ],
        },
        // ③ 당진공장(기술직)
        {
          id: "HSCVO03",
          name: "당진공장(기술직)",
          managerPersonaKey: "hsc_budget_hr_dang",
          managerPersonaKeys: ["hsc_budget_hr_dang"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 60000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT21",
              name: "(당)자재팀",
              allowedJobTypes: ["기술직"],
              budget: { allocated: 60000000, deducted: 0, holding: 0 },
            },
          ],
        },
        // ④ 포항공장(기술직)
        {
          id: "HSCVO04",
          name: "포항공장(기술직)",
          managerPersonaKey: "hsc_budget_hr_po",
          managerPersonaKeys: ["hsc_budget_hr_po"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 70000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT31",
              name: "(포)전기로기술팀",
              allowedJobTypes: ["기술직"],
              budget: { allocated: 70000000, deducted: 0, holding: 0 },
            },
          ],
        },
        // ⑤ 인천공장(기술직)
        {
          id: "HSCVO05",
          name: "인천공장(기술직)",
          managerPersonaKey: "hsc_budget_hr_in",
          managerPersonaKeys: ["hsc_budget_hr_in"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 50000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT41",
              name: "(인)전기로기술팀",
              allowedJobTypes: ["기술직"],
              budget: { allocated: 50000000, deducted: 0, holding: 0 },
            },
          ],
        },
        // ⑥ 순천공장(기술직)
        {
          id: "HSCVO06",
          name: "순천공장(기술직)",
          managerPersonaKey: "hsc_budget_cold",
          managerPersonaKeys: ["hsc_budget_cold"],
          cooperators: [
            {
              teamId: "HSCCOP01",
              teamName: "재경팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
            {
              teamId: "HSCCOP02",
              teamName: "투명경영지원팀",
              coopType: "재경협조처",
              required: false,
              role: "예산검토",
            },
          ],
          budget: { total: 45000000, deducted: 0, holding: 0 },
          teams: [
            {
              id: "HSVT51",
              name: "(순)전기로기술팀",
              allowedJobTypes: ["기술직"],
              budget: { allocated: 45000000, deducted: 0, holding: 0 },
            },
          ],
        },
      ],
    },
  },
];

const VIRTUAL_ORG = {
  general: VIRTUAL_EDU_ORGS.find((t) => t.tree.hqs)?.tree || { hqs: [] },
  rnd: VIRTUAL_EDU_ORGS.find((t) => t.tree.centers)?.tree || { centers: [] },
};
// ─── VOrg Manager 헬퍼 함수 ─────────────────────────────────────────────────
// 본부/센터 담당자 여부 확인
function isVorgManager(persona) {
  return (
    ["hq_general", "center_rnd"].includes(persona.role) && persona.managedVorgId
  );
}

// 페르소나가 관할하는 VOrg 그룹 객체 반환 {id, name, manager, teams, ...}
function getPersonaManagedVorg(persona) {
  if (!persona.managedVorgId) return null;
  const tpls = VIRTUAL_EDU_ORGS.filter((t) => t.tenantId === persona.tenantId);
  for (const tpl of tpls) {
    const groups = [...(tpl.tree.hqs || []), ...(tpl.tree.centers || [])];
    const found = groups.find((g) => g.id === persona.managedVorgId);
    if (found) return found;
  }
  return null;
}

// 페르소나가 관할하는 VOrg 하위 팀 목록 반환 [{id, name, budget}]
function getPersonaManagedTeams(persona) {
  const vorg = getPersonaManagedVorg(persona);
  return vorg ? vorg.teams || [] : [];
}

// ─── 교육계획 목 데이터 ──────────────────────────────────────────────────────

const MOCK_BO_PLANS = [
  {
    id: "BP26-101",
    team: "역량OO팀",
    hq: "HMGOOOO본부",
    title: "리더십 리더과정 운영",
    account: "운영",
    group: "general",
    amount: 8000000,
    status: "pending_hq",
    submittedAt: "2026-01-10",
    submitter: "조O성",
  },
  {
    id: "BP26-102",
    team: "SDV기술팀",
    hq: "SDVOOOO본부",
    title: "SDV 전환 심화교육",
    account: "운영",
    group: "general",
    amount: 15000000,
    status: "pending_total",
    submittedAt: "2026-01-12",
    submitter: "OO책임",
  },
  {
    id: "BP26-103",
    team: "피플OO팀",
    hq: "HMGOOOO본부",
    title: "HRD 역량 워크숍",
    account: "기타",
    group: "general",
    amount: 3500000,
    status: "approved",
    submittedAt: "2026-01-08",
    submitter: "OO매니저",
  },
  {
    id: "BP26-104",
    team: "내구OO팀",
    center: "모빌리티OOOO센터",
    title: "NVH 해외 학회 참가",
    account: "통합(R&D)",
    group: "rnd",
    amount: 12000000,
    status: "pending_center",
    submittedAt: "2026-01-15",
    submitter: "이O봉",
  },
  {
    id: "BP26-105",
    team: "배터리OO팀",
    center: "전동화OOOO센터",
    title: "배터리 기술 세미나 운영",
    account: "통합(R&D)",
    group: "rnd",
    amount: 9000000,
    status: "approved",
    submittedAt: "2026-01-11",
    submitter: "OO책임",
  },
  {
    id: "BP26-106",
    team: "구동OO팀",
    center: "모빌리티OOOO센터",
    title: "전동화 국제 컨퍼런스",
    account: "통합(R&D)",
    group: "rnd",
    amount: 18000000,
    status: "rejected",
    submittedAt: "2026-01-09",
    submitter: "OO책임",
    rejectReason: "예산 초과. 금액 조정 후 재상신 요청.",
  },
  {
    id: "BP26-107",
    team: "성과OO팀",
    hq: "HMGOOOO본부",
    title: "OKR 워크숍 운영",
    account: "운영",
    group: "general",
    amount: 5000000,
    status: "approved",
    submittedAt: "2026-01-07",
    submitter: "OO책임",
  },
];

// ─── 교육 신청 목 데이터 (집행 결재) ─────────────────────────────────────────

const MOCK_BO_APPLICATIONS = [
  {
    id: "APP26-001",
    policyId: "POL-HMC-GEN-001",
    planId: "BP26-103",
    team: "피플OO팀",
    hq: "HMGOOOO본부",
    title: "2026 글로벌 AI 리더십 포럼",
    account: "참가",
    group: "general",
    requestAmt: 2500000,
    actualAmt: null,
    status: "pending_hq",
    submittedAt: "2026-02-05",
    applicant: "OO매니저",
    type: "신청",
  },
  {
    id: "APP26-002",
    policyId: "POL-HMC-RND-001",
    planId: "BP26-105",
    team: "배터리OO팀",
    center: "전동화OOOO센터",
    title: "배터리 기술 세미나 운영",
    account: "통합(R&D)",
    group: "rnd",
    requestAmt: 9000000,
    actualAmt: null,
    status: "pending_total",
    submittedAt: "2026-02-08",
    applicant: "OO책임",
    type: "신청",
  },
  {
    id: "APP26-003",
    policyId: "POL-HMC-GEN-001",
    planId: "BP26-107",
    team: "성과OO팀",
    hq: "HMGOOOO본부",
    title: "OKR 워크숍 운영",
    account: "운영",
    group: "general",
    requestAmt: 5000000,
    actualAmt: 4800000,
    status: "settling",
    submittedAt: "2026-02-01",
    applicant: "OO책임",
    type: "결과보고",
  },
  {
    id: "APP26-004",
    policyId: "POL-HMC-GEN-001",
    planId: "BP26-103",
    team: "피플OO팀",
    hq: "HMGOOOO본부",
    title: "HRD 역량 워크숍 결과보고",
    account: "기타",
    group: "general",
    requestAmt: 3500000,
    actualAmt: 3200000,
    status: "pending_total",
    submittedAt: "2026-02-10",
    applicant: "OO매니저",
    type: "결과보고",
  },
  {
    id: "APP26-005",
    policyId: "POL-HMC-RND-001",
    planId: "BP26-105",
    team: "내구OO팀",
    center: "모빌리티OOOO센터",
    title: "NVH 해외 학회 결과보고",
    account: "통합(R&D)",
    group: "rnd",
    requestAmt: 12000000,
    actualAmt: 11500000,
    status: "pending_center",
    submittedAt: "2026-02-12",
    applicant: "이O봉",
    type: "결과보고",
  },
];

// ─── 예산 원장(Ledger) 목 데이터 ────────────────────────────────────────────

const MOCK_LEDGER = [
  {
    id: "L001",
    date: "2026-01-02",
    team: "HMGOOOO본부",
    account: "운영",
    type: "할당",
    amount: +80000000,
    balance: 80000000,
    note: "총괄→본부 예산 배정",
    by: "신O남",
  },
  {
    id: "L002",
    date: "2026-01-03",
    team: "역량OO팀",
    account: "운영",
    type: "배분",
    amount: +28000000,
    balance: 28000000,
    note: "본부→팀 예산 배분",
    by: "이O현",
  },
  {
    id: "L003",
    date: "2026-02-05",
    team: "피플OO팀",
    account: "참가",
    type: "가점유",
    amount: -2500000,
    balance: 25500000,
    note: "APP26-001 신청 가점유",
    by: "SYSTEM",
  },
  {
    id: "L004",
    date: "2026-02-10",
    team: "성과OO팀",
    account: "운영",
    type: "실차감",
    amount: -4800000,
    balance: 18200000,
    note: "APP26-003 결과보고 정산 완료",
    by: "신O남",
  },
  {
    id: "L005",
    date: "2026-02-10",
    team: "성과OO팀",
    account: "운영",
    type: "환원",
    amount: +200000,
    balance: 18400000,
    note: "APP26-003 잔액(200,000원) 팀 환원",
    by: "SYSTEM",
  },
  {
    id: "L006",
    date: "2026-01-05",
    team: "모빌리티OOOO센터",
    account: "통합(R&D)",
    type: "할당",
    amount: +200000000,
    balance: 200000000,
    note: "R&D총괄→센터 배정",
    by: "류O령",
  },
  {
    id: "L007",
    date: "2026-02-08",
    team: "배터리OO팀",
    account: "통합(R&D)",
    type: "가점유",
    amount: -9000000,
    balance: 141000000,
    note: "APP26-002 신청 가점유",
    by: "SYSTEM",
  },
];

// ─── [Tenant 주도형] 예산 계정 마스터 ──────────────────────────────────────
// 각 테넌트(회사)의 계정 총괄 담당자가 직접 생성·관리
// planRequired: 이 계정 사용 시 교육계획 사전 수립 필수 여부

let ACCOUNT_MASTER = [
  // ※ 시스템 기본 계정 (전사 공통, 삭제 불가)
  {
    code: "COMMON-FREE",
    tenantId: null,
    group: "공통",
    name: "공통-무예산/자비수강",
    planRequired: false,
    carryover: false,
    desc: "예산 집행 없이 학습 이력만 등록 (개인 자비, 무예산 학습)",
    active: true,
    isSystem: true,
    approvalSystem: "external",
  },
  // 현대자동차 (HMC) — 신O남 매니저(일반), 류O령 책임(R&D)이 각각 관리
  {
    code: "HMC-OPS",
    tenantId: "HMC",
    group: "일반",
    name: "일반-운영계정",
    planRequired: true,
    carryover: false,
    desc: "사내 집합/이러닝, 세미나/워크숍 운영",
    active: true,
    approvalSystem: "integrated", // 통합결재: 축1+축2+협조처
  },
  {
    code: "HMC-ETC",
    tenantId: "HMC",
    group: "일반",
    name: "일반-기타계정",
    planRequired: true,
    carryover: false,
    desc: "과정/교안개발, 영상제작, 시설비",
    active: true,
    approvalSystem: "integrated",
  },
  {
    code: "HMC-PART",
    tenantId: "HMC",
    group: "일반",
    name: "일반-참가계정",
    planRequired: false,
    carryover: false,
    desc: "일반 학습자 사외교육 참가비 (연간 자동 할당)",
    active: true,
    approvalSystem: "integrated",
  },
  {
    code: "HMC-RND",
    tenantId: "HMC",
    group: "R&D",
    name: "R&D-통합계정",
    planRequired: true,
    carryover: true,
    desc: "R&D 운영+기타+참가 모든 목적 통합",
    active: true,
    approvalSystem: "integrated",
  },
  // 기아 (KIA) — KIA HRD팀 관리
  {
    code: "KIA-OPS",
    tenantId: "KIA",
    group: "일반",
    name: "일반교육예산-운영",
    planRequired: true,
    carryover: false,
    desc: "기아 사내 집합/이러닝 운영교육 전용",
    active: true,
    approvalSystem: "platform", // 자체결재: 축1만
  },
  {
    code: "KIA-PART",
    tenantId: "KIA",
    group: "일반",
    name: "일반교육예산-참가",
    planRequired: false,
    carryover: false,
    desc: "기아 임직원 사외교육 참가비 (연간 자동 할당)",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "KIA-ETC",
    tenantId: "KIA",
    group: "일반",
    name: "일반교육예산-기타",
    planRequired: true,
    carryover: false,
    desc: "교안/콘텐츠 개발, 영상제작, 학습환경 구성비 등",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HAE-OPS",
    tenantId: "HAE",
    group: "일반",
    name: "오토에버-운영계정",
    planRequired: true,
    carryover: false,
    desc: "오토에버 운영교육 전용 (집합/이러닝)",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HAE-PART",
    tenantId: "HAE",
    group: "일반",
    name: "오토에버-참가계정",
    planRequired: false,
    carryover: false,
    desc: "임직원 사외교육 참가비",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HAE-CERT",
    tenantId: "HAE",
    group: "일반",
    name: "오토에버-자격증계정",
    planRequired: false,
    carryover: false,
    desc: "IT인증/자격증 업무지원 전용",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HAE-EDU",
    tenantId: "HAE",
    group: "일반",
    name: "오토에버-전사교육예산",
    planRequired: true,
    carryover: false,
    desc: "현대오토에버 전사 공통 교육예산 (기획·운영 전반)",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HAE-TEAM",
    tenantId: "HAE",
    group: "일반",
    name: "오토에버-팀/프로젝트 할당 예산",
    planRequired: false,
    carryover: false,
    desc: "팀·프로젝트 단위 배정 교육예산 (자율 집행)",
    active: true,
    approvalSystem: "platform",
  },
  {
    code: "HSC-EXT",
    tenantId: "HSC",
    group: "일반",
    name: "현대제철-사외교육",
    planRequired: false,
    carryover: false,
    desc: "임직원 사외교육(외부 교육과정, 세미나, 컨퍼런스 등) 예산 계정",
    active: true,
    approvalSystem: "external", // 외부결재
  },
];

// 헬퍼: 테넌트별 계정 목록
function getTenantAccounts(tenantId) {
  return ACCOUNT_MASTER.filter((a) => a.tenantId === tenantId && a.active);
}

// ─── [Step3] 교육 양식 마스터 (Form Builder로 직접 생성) ──────────────────────
// type: 'plan'(교육계획 양식) | 'apply'(교육신청 양식)
// fields: 사용자가 구성한 입력 필드 목록

var FORM_MASTER = [
  // 현대자동차 (HMC) 양식 — 계획 양식
  {
    id: "FM001",
    tenantId: "HMC",
    type: "plan",
    name: "R&D 사외교육 계획서",
    desc: "R&D 인력의 사외교육 계획 수립용",
    active: true,
    fields: [
      "교육목적",
      "교육기간",
      "교육기관",
      "장소",
      "기대효과",
      "예상비용",
      "첨부파일",
    ],
  },
  // 현대자동차 (HMC) 양식 — 신청 양식
  {
    id: "FM002",
    tenantId: "HMC",
    type: "apply",
    name: "R&D 사외교육 신청서",
    desc: "R&D 인력의 사외교육 비용 신청용",
    active: true,
    fields: [
      "교육명",
      "교육기관",
      "교육기간",
      "교육비",
      "계획서연결",
      "보안서약서",
    ],
  },
  {
    id: "FM003",
    tenantId: "HMC",
    type: "apply",
    name: "일반 참가 사외교육 신청서",
    desc: "일반 학습자 사외교육 직접 신청 (계획 불필요)",
    active: true,
    fields: ["교육명", "교육기관", "교육기간", "참가비", "영수증"],
  },
  {
    id: "FM004",
    tenantId: "HMC",
    type: "apply",
    name: "사내교육 신청서",
    desc: "사내 집합교육 및 이러닝 신청용",
    active: true,
    fields: ["과정명", "교육일정", "수강인원", "교육비"],
  },
  // 현대자동차 (HMC) 양식 — 결과 양식
  {
    id: "FM006",
    tenantId: "HMC",
    type: "result",
    name: "R&D 사외교육 결과보고서",
    desc: "R&D 인력의 사외교육 수료 후 결과 보고 및 예산 정산",
    active: true,
    fields: [
      "교육명",
      "교육기간",
      "교육기관",
      "실지출액",
      "수료증",
      "교육결과요약",
      "첨부파일",
    ],
  },
  {
    id: "FM007",
    tenantId: "HMC",
    type: "result",
    name: "일반 사외교육 결과보고서",
    desc: "일반 학습자 사외교육 수료 후 결과 보고 및 예산 정산",
    active: true,
    fields: ["교육명", "교육기간", "교육기관", "실지출액", "수료증", "영수증"],
  },
  {
    id: "FM008",
    tenantId: "HMC",
    type: "result",
    name: "개인 학습이력 직접 등록서",
    desc: "무예산/자비 학습 이력 사후 등록 (예산 정산 없음)",
    active: true,
    fields: [
      "교육명",
      "교육기간",
      "교육기관",
      "학습유형",
      "수료증",
      "학습요약",
    ],
  },
  // ═══════════════════════════════════════════════════════════
  // ⚠️ FM101~FM204 mock 양식 데이터 제거됨 (2026-04-01)
  // → DB(form_templates 테이블)에서 실시간 로드로 전환 완료
  // → bo_form_builder.js > _fbLoadDbData() 및
  //   bo_policy_builder.js > renderPolicyWizard() Step 5에서 자동 로드
  // ═══════════════════════════════════════════════════════════
  // (FM101~FM204 mock 데이터: DB 전환 완료 후 제거됨)
  // 기아 양식
  // 현대오토에버 (HAE) 양식
  {
    id: "FM010",
    tenantId: "HAE",
    type: "apply",
    name: "오토에버 사외교육 신청서",
    desc: "오토에버 임직원 사외교육 비용 신청",
    active: true,
    fields: ["교육명", "교육기관", "교육기간", "참가비", "보안서약서"],
  },
  {
    id: "FM011",
    tenantId: "HAE",
    type: "apply",
    name: "오토에버 자격증 취득 신청서",
    desc: "IT 인증/자격증 업무지원 신청",
    active: true,
    fields: ["자격증명", "시험일정", "응시료", "수료증"],
  },
  {
    id: "FM012",
    tenantId: "HAE",
    type: "result",
    name: "오토에버 교육결과보고서",
    desc: "오토에버 교육 수료 후 결과 보고 및 정산",
    active: true,
    fields: ["교육명", "교육기간", "교육기관", "실지출액", "수료증"],
  },
  {
    id: "FM005",
    tenantId: "KIA",
    type: "apply",
    name: "기아 사외교육 신청서",
    desc: "기아 임직원 사외교육 비용 신청",
    active: true,
    fields: ["교육명", "교육기관", "기간", "참가비", "보안서약서"],
  },
];

// 헬퍼: 테넌트별 양식 목록
function getTenantForms(tenantId, type) {
  return FORM_MASTER.filter(
    (f) => f.tenantId === tenantId && f.active && (!type || f.type === type),
  );
}

// ─── [Step4] 조직별 양식 접근 권한 ───────────────────────────────────────────
// key: "{tenantId}_{virtualGroupId}", value: Set of FORM_MASTER IDs
let FORM_ACCESS_RULES = {
  HMG_HQ01: { formIds: ["FM003", "FM004"] }, // 일반 가상본부
  HMG_HQ02: { formIds: ["FM003", "FM004"] }, // SDV본부
  HMG_C01: { formIds: ["FM001", "FM002", "FM004"] }, // 모빌리티R&D센터
  HMG_C02: { formIds: ["FM001", "FM002", "FM004"] }, // 전동화센터
  KIA_HQ01: { formIds: ["FM005"] },
  KIA_HQ02: { formIds: ["FM005"] },
};

// ─── [Step4] 예산 ↔ 가상조직 템플릿 ↔ 신청/계획 통합 매핑 룰 ──────────
// accountCode 기반으로 가상조직 템플릿, 양식, 허용 학습유형, 복수계획옵션을 매핑
let FORM_BUDGET_RULES = [
  // [Type B] 신청→결과: 일반직군 사외교육 참가 (일반-참가계정)
  {
    id: "R001",
    tenantId: "HMC",
    accountCode: "HMC-PART",
    templateId: "TPL_GEN_01",
    formId: "FM003",
    planFormId: null,
    resultFormId: "FM007",
    processFlow: "apply-result",
    learningTypes: [
      "이러닝",
      "동영상",
      "디지털 교재",
      "집합교육",
      "학회/세미나/컨퍼런스 참석",
    ],
    multiPlanAllowed: false,
  },
  {
    id: "R002",
    tenantId: "HMC",
    accountCode: "HMC-PART",
    templateId: "TPL_GEN_01",
    formId: "FM003",
    planFormId: null,
    resultFormId: "FM007",
    processFlow: "apply-result",
    learningTypes: ["도서", "논문/저널", "이러닝"],
    multiPlanAllowed: false,
  },
  // [Type B] 신청→결과: 교육담당자 운영계정 복수 계획 연동 (일반-운영계정)
  {
    id: "R003",
    tenantId: "HMC",
    accountCode: "HMC-OPS",
    templateId: "TPL_GEN_01",
    formId: "FM004",
    planFormId: null,
    resultFormId: "FM007",
    processFlow: "apply-result",
    learningTypes: ["집합교육", "실시간 화상"],
    multiPlanAllowed: true,
  },
  // [Type A] 계획→신청→결과: R&D 통합계정
  {
    id: "R004",
    tenantId: "HMC",
    accountCode: "HMC-RND",
    templateId: "TPL_RND_01",
    formId: "FM002",
    planFormId: "FM001",
    resultFormId: "FM006",
    processFlow: "plan-apply-result",
    learningTypes: ["학회 직접 발표", "기술자료", "집합교육"],
    multiPlanAllowed: true,
  },
  // [Type C] 결과 단독: 공통-무예산 자비수강 이력 등록
  {
    id: "R006",
    tenantId: "HMC",
    accountCode: "COMMON-FREE",
    templateId: "TPL_GEN_01",
    formId: null,
    planFormId: null,
    resultFormId: "FM008",
    processFlow: "result-only",
    learningTypes: [
      "이러닝",
      "동영상",
      "디지털 교재",
      "집합교육",
      "도서",
      "논문/저널",
    ],
    multiPlanAllowed: false,
  },
  // KIA
  {
    id: "R005",
    tenantId: "KIA",
    accountCode: "KIA-OPS",
    templateId: null,
    formId: "FM005",
    planFormId: null,
    resultFormId: null,
    processFlow: "apply-result",
    learningTypes: ["집합교육", "이러닝"],
    multiPlanAllowed: false,
  },
  // HAE
  {
    id: "R010",
    tenantId: "HAE",
    accountCode: "HAE-OPS",
    templateId: "TPL_HAE_GEN_01",
    formId: "FM010",
    planFormId: null,
    resultFormId: "FM012",
    processFlow: "apply-result",
    learningTypes: ["집합교육", "이러닝", "실시간 화상"],
    multiPlanAllowed: false,
  },
  {
    id: "R011",
    tenantId: "HAE",
    accountCode: "HAE-CERT",
    templateId: "TPL_HAE_GEN_01",
    formId: "FM011",
    planFormId: null,
    resultFormId: "FM012",
    processFlow: "apply-result",
    learningTypes: ["이러닝", "집합교육"],
    multiPlanAllowed: false,
  },
];

// ─── 계정 소유권 기반 보안 헬퍼 ──────────────────────────────────────────────

// 현재 페르소나가 특정 계정에 접근 가능한지 확인
function canAccessAccount(persona, accountCode) {
  if (!persona.allowedAccounts) return true; // 필드 없으면 허용 (레거시)
  if (persona.allowedAccounts.includes("*")) return true;
  return persona.allowedAccounts.includes(accountCode);
}

// 테넌트+격리그룹 기준으로 필터된 계정 목록 반환
function getPersonaAccounts(persona) {
  const all = getTenantAccounts(persona.tenantId);
  if (!persona.allowedAccounts || persona.allowedAccounts.includes("*"))
    return all;
  return all.filter((a) => persona.allowedAccounts.includes(a.code));
}

// 두 페르소나가 동일한 격리 그룹인지 확인 (데이터 공유 가능 여부)
function isSameIsolationGroup(p1, p2) {
  if (p1.tenantId !== p2.tenantId) return false;
  if (p1.isolationGroup === "SYSTEM" || p2.isolationGroup === "SYSTEM")
    return true;
  // HMC-BOTH는 양쪽 그룹 모두와 공유 가능
  if (p1.isolationGroup === "HMC-BOTH" || p2.isolationGroup === "HMC-BOTH")
    return true;
  return p1.isolationGroup === p2.isolationGroup;
}
// ─── 유틸 ────────────────────────────────────────────────────────────────────

function boFmt(n) {
  return Number(n).toLocaleString("ko-KR");
}

function boPlanStatusBadge(s) {
  const m = {
    pending_hq: ["bo-badge-yellow", "본부 검토 중"],
    pending_center: ["bo-badge-purple", "센터 검토 중"],
    pending_total: ["bo-badge-blue", "총괄 승인 대기"],
    approved: ["bo-badge-green", "승인 완료"],
    rejected: ["bo-badge-red", "반려"],
    settling: ["bo-badge-orange", "정산 대기"],
    completed: ["bo-badge-gray", "정산 완료"],
    // KIA 학습자
    kia_learner: {
      id: "P203",
      name: "강동우",
      dept: "개인정보보호팀",
      pos: "책임",
      role: "learner",
      roleLabel: "[KIA] 학습자",
      roleClass: "role-team",
      roleTag: "[학습자]",
      budgetGroup: "general",
      tenantId: "KIA",
      scope: "개인정보보호팀",
      desc: "일반예산기반 학습자. 교육계획 수립 후 복수 계획 매핑 신청, 결과 작성. 자비/무료 교육 무예산 이력 등록 및 결과 단독 등록 활용.",
      accessMenus: [
        "dashboard",
        "badge-group-mgmt",
        "badge-mgmt",
        "badge-operation",
      ],
    },
    // HAE 학습자
    hae_learner: {
      id: "P303",
      name: "남영우",
      dept: "PM서비스팀",
      pos: "책임",
      role: "learner",
      roleLabel: "[HAE] 학습자",
      roleClass: "role-team",
      roleTag: "[학습자]",
      budgetGroup: "general",
      tenantId: "HAE",
      scope: "PM서비스팀",
      desc: "개인 직무 사외학습 중심. HAE 고정 프로세스(교육계획→계획기반신청→수료 후 결과) 준수. 개인 학습 이력 전용.",
      accessMenus: [
        "dashboard",
        "badge-group-mgmt",
        "badge-mgmt",
        "badge-operation",
      ],
    },
    // HSC 학습자
    hsc_learner: {
      id: "P608",
      name: "정O안",
      dept: "성장디자인팀",
      pos: "매니저",
      role: "learner",
      roleLabel: "[HSC] 학습자",
      roleClass: "role-team",
      roleTag: "[학습자]",
      budgetGroup: "general",
      tenantId: "HSC",
      domainId: "IG-HSC-ALL",
      scope: "성장디자인팀",
      desc: "현대제철 일반직 학습자. 개인직무 사외학습 중심. 교육신청/결과 작성.",
      accessMenus: [
        "dashboard",
        "badge-group-mgmt",
        "badge-mgmt",
        "badge-operation",
      ],
    },
  };
  const [cls, label] = m[s] || ["bo-badge-gray", s];
  return `<span class="bo-badge ${cls}">${label}</span>`;
}

function boAccountBadge(a) {
  const m = {
    운영: "bo-badge-blue",
    기타: "bo-badge-purple",
    참가: "bo-badge-green",
    "통합(R&D)": "bo-badge-orange",
  };
  return `<span class="bo-badge ${m[a] || "bo-badge-gray"}">${a}</span>`;
}

function boGroupBadge(g) {
  return g === "rnd"
    ? `<span class="bo-badge bo-badge-orange">R&amp;D</span>`
    : `<span class="bo-badge bo-badge-blue">일반</span>`;
}

// ─── [Step5] 양식별 공지 팝업 및 첨부파일 ────────────────────────────────────
// 학습자가 양식 진입 시 표시되는 공지/가이드라인/첨부파일 관리

// 공지 대상 양식 목록 (신청 양식 + 계획 수립)
let FORM_ANNOUNCEMENTS = [
  {
    id: "AN001",
    tenantId: "HMC",
    formId: "F_EXT",
    title: "사외교육 신청 전 필독 안내",
    content:
      "사외교육 신청 시 반드시 보안서약서를 사전 제출해야 합니다.\n해외 교육의 경우 출장 결재를 별도로 진행해 주세요.\n예산 소진 현황은 팀 담당자에게 문의하세요.",
    attachments: [
      { name: "사외교육_보안서약서.docx", size: "38KB", type: "docx" },
      { name: "예산사용_가이드라인_2026.pdf", size: "1.2MB", type: "pdf" },
    ],
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    id: "AN002",
    tenantId: "HMC",
    formId: "F_PLAN_BASIC",
    title: "2026년 교육계획 수립 안내",
    content:
      "교육계획은 연간 예산 배분의 기준이 됩니다.\n계획 수립 기한: 2026년 1월 31일 (금) 까지\n기한 이후 계획은 별도 협의 후 승인됩니다.",
    attachments: [
      { name: "교육계획수립_매뉴얼.pdf", size: "2.1MB", type: "pdf" },
    ],
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-03-31",
  },
  {
    id: "AN003",
    tenantId: "HMC",
    formId: "F_INT",
    title: "사내교육 신청 안내",
    content:
      "사내교육 신청 후 승인 완료까지 영업일 기준 3일 소요됩니다.\n수강 취소는 교육 시작 3일 전까지만 가능합니다.",
    attachments: [],
    active: false,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
  {
    id: "AN004",
    tenantId: "KIA",
    formId: "external",
    title: "[기아] 사외교육 신청 유의사항",
    content:
      "기아 임직원은 사외교육 신청 시 소속 HR담당자를 사전 통보 후 신청하세요.",
    attachments: [
      { name: "기아_사외교육_신청양식.xlsx", size: "55KB", type: "xlsx" },
    ],
    active: true,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  },
];

// ─── 예산 재원 유형 정의 ──────────────────────────────────────────────────────
const BUDGET_SOURCE_TYPE = {
  "HMC-OPS": "sap_if",
  "HMC-ETC": "sap_if",
  "HMC-PART": "sap_if",
  "HMC-RND": "platform",
  "KIA-OPS": "sap_if",
  "KIA-PART": "sap_if",
  "HAE-OPS": "platform",
  "HAE-PART": "platform",
  "HAE-CERT": "platform",
};

// ─── Level 1: 계정 총액 관리 (Account Budget Master) ─────────────────────────
// 추가배정은 ACCOUNT_ADJUST_HISTORY에 기록하고 totalAdded로 누계 관리
// 배분가능재원 = baseAmount + totalAdded - SUM(TEAM_DIST.allocAmount)
let ACCOUNT_BUDGETS = [
  // HMC 일반 — SAP I/F 연동형 (계정 단위 총액)
  {
    id: "AB001",
    tenantId: "HMC",
    accountCode: "HMC-OPS",
    sourceType: "sap_if",
    fiscalYear: 2026,
    baseAmount: 330000000,
    totalAdded: 20000000,
    status: "confirmed",
    confirmedBy: "신승남",
    ifReceivedAt: "2026-01-03",
  },
  {
    id: "AB002",
    tenantId: "HMC",
    accountCode: "HMC-PART",
    sourceType: "sap_if",
    fiscalYear: 2026,
    baseAmount: 150000000,
    totalAdded: 10000000,
    status: "confirmed",
    confirmedBy: "신승남",
    ifReceivedAt: "2026-01-03",
  },
  {
    id: "AB003",
    tenantId: "HMC",
    accountCode: "HMC-ETC",
    sourceType: "sap_if",
    fiscalYear: 2026,
    baseAmount: 30000000,
    totalAdded: 0,
    status: "confirmed",
    confirmedBy: "신승남",
    ifReceivedAt: "2026-01-03",
  },
  // HMC R&D — 플랫폼 자체 관리형
  {
    id: "AB004",
    tenantId: "HMC",
    accountCode: "HMC-RND",
    sourceType: "platform",
    fiscalYear: 2026,
    baseAmount: 1400000000,
    totalAdded: 50000000,
    status: "confirmed",
    enteredBy: "류해령",
    enteredAt: "2026-01-08",
  },
  // KIA 일반 — SAP I/F 연동형
  {
    id: "AB005",
    tenantId: "KIA",
    accountCode: "KIA-OPS",
    sourceType: "sap_if",
    fiscalYear: 2026,
    baseAmount: 120000000,
    totalAdded: 0,
    status: "confirmed",
    confirmedBy: "고범현",
    ifReceivedAt: "2026-01-04",
  },
  {
    id: "AB006",
    tenantId: "KIA",
    accountCode: "KIA-PART",
    sourceType: "sap_if",
    fiscalYear: 2026,
    baseAmount: 80000000,
    totalAdded: 15000000,
    status: "confirmed",
    confirmedBy: "고범현",
    ifReceivedAt: "2026-01-04",
  },
  // HAE — 플랫폼 자체 관리형
  {
    id: "AB007",
    tenantId: "HAE",
    accountCode: "HAE-OPS",
    sourceType: "platform",
    fiscalYear: 2026,
    baseAmount: 10000000,
    totalAdded: 0,
    status: "confirmed",
    enteredBy: "안슬기",
    enteredAt: "2026-01-10",
  },
  {
    id: "AB008",
    tenantId: "HAE",
    accountCode: "HAE-PART",
    sourceType: "platform",
    fiscalYear: 2026,
    baseAmount: 40000000,
    totalAdded: 0,
    status: "confirmed",
    enteredBy: "안슬기",
    enteredAt: "2026-01-10",
  },
  {
    id: "AB009",
    tenantId: "HAE",
    accountCode: "HAE-CERT",
    sourceType: "platform",
    fiscalYear: 2026,
    baseAmount: 20000000,
    totalAdded: 0,
    status: "confirmed",
    enteredBy: "안슬기",
    enteredAt: "2026-01-10",
  },
];

// ─── Level 2: 팀별 배분 (Team Distribution) ──────────────────────────────────
// 각 계정 총액에서 팀으로 배분. SUM(allocAmount) <= ACCOUNT_BUDGETS.baseAmount+totalAdded
let TEAM_DIST = [
  // HMC-OPS → 가상본부 배분
  {
    id: "TD001",
    accountBudgetId: "AB001",
    teamName: "HMGOOOO본부",
    allocAmount: 180000000,
    spent: 82000000,
    reserved: 15000000,
  },
  {
    id: "TD002",
    accountBudgetId: "AB001",
    teamName: "SDVOOOO본부",
    allocAmount: 150000000,
    spent: 45000000,
    reserved: 8000000,
  },

  // HMC-PART → 가상본부 배분
  {
    id: "TD003",
    accountBudgetId: "AB002",
    teamName: "HMGOOOO본부",
    allocAmount: 90000000,
    spent: 38000000,
    reserved: 5000000,
  },
  {
    id: "TD004",
    accountBudgetId: "AB002",
    teamName: "SDVOOOO본부",
    allocAmount: 60000000,
    spent: 20000000,
    reserved: 3000000,
  },

  // HMC-ETC → 가상본부 배분
  {
    id: "TD005",
    accountBudgetId: "AB003",
    teamName: "HMGOOOO본부",
    allocAmount: 30000000,
    spent: 12000000,
    reserved: 0,
  },

  // HMC-RND → 가상센터 배분
  {
    id: "TD006",
    accountBudgetId: "AB004",
    teamName: "모빌리티OOOO센터",
    allocAmount: 800000000,
    spent: 310000000,
    reserved: 120000000,
  },
  {
    id: "TD007",
    accountBudgetId: "AB004",
    teamName: "전동화OOOO센터",
    allocAmount: 600000000,
    spent: 210000000,
    reserved: 80000000,
  },

  // KIA-OPS
  {
    id: "TD008",
    accountBudgetId: "AB005",
    teamName: "Autoland사업부",
    allocAmount: 120000000,
    spent: 55000000,
    reserved: 10000000,
  },

  // KIA-PART
  {
    id: "TD009",
    accountBudgetId: "AB006",
    teamName: "Autoland사업부",
    allocAmount: 80000000,
    spent: 28000000,
    reserved: 5000000,
  },

  // HAE-OPS (1000만원 배분됨, 총액과 동일)
  {
    id: "TD010",
    accountBudgetId: "AB007",
    teamName: "PM서비스팀(솔루션사업부)",
    allocAmount: 6000000,
    spent: 2200000,
    reserved: 400000,
  },
  {
    id: "TD011",
    accountBudgetId: "AB007",
    teamName: "인프라팀",
    allocAmount: 4000000,
    spent: 1800000,
    reserved: 200000,
  },

  // HAE-PART
  {
    id: "TD012",
    accountBudgetId: "AB008",
    teamName: "전사 공통",
    allocAmount: 40000000,
    spent: 15000000,
    reserved: 2000000,
  },

  // HAE-CERT
  {
    id: "TD013",
    accountBudgetId: "AB009",
    teamName: "전사 공통",
    allocAmount: 20000000,
    spent: 5000000,
    reserved: 1000000,
  },
];

// ─── Audit Trail: 계정 추가배정 이력 ─────────────────────────────────────────
const ACCOUNT_ADJUST_HISTORY = [
  {
    id: "AH001",
    accountBudgetId: "AB001",
    date: "2026-01-03",
    type: "SAP_IF",
    amount: 330000000,
    note: "SAP CO 2026년 운영계정 연간 예산 자동 수신",
    by: "SYSTEM",
  },
  {
    id: "AH002",
    accountBudgetId: "AB001",
    date: "2026-01-03",
    type: "확정",
    amount: 0,
    note: "신승남 매니저 정합성 확인 후 확정",
    by: "신승남",
  },
  {
    id: "AH003",
    accountBudgetId: "AB001",
    date: "2026-02-15",
    type: "추가배정",
    amount: 20000000,
    note: "1분기 SDV 특별 오프라인 프로그램 증액",
    by: "신승남",
  },
  {
    id: "AH004",
    accountBudgetId: "AB004",
    date: "2026-01-08",
    type: "기초입력",
    amount: 1400000000,
    note: "2026년 R&D 교육예산 연간 총액 직접 입력",
    by: "류해령",
  },
  {
    id: "AH005",
    accountBudgetId: "AB004",
    date: "2026-03-10",
    type: "추가배정",
    amount: 50000000,
    note: "특허·논문 발표 지원 프로그램 확대 증액",
    by: "류해령",
  },
  {
    id: "AH006",
    accountBudgetId: "AB007",
    date: "2026-01-10",
    type: "기초입력",
    amount: 10000000,
    note: "오토에버 운영계정 26년 연간 기초 예산 입력",
    by: "안슬기",
  },
  {
    id: "AH007",
    accountBudgetId: "AB009",
    date: "2026-01-10",
    type: "기초입력",
    amount: 20000000,
    note: "오토에버 자격증계정 26년 연간 기초 예산 입력",
    by: "안슬기",
  },
];

// 헬퍼: 계정의 배분 가능 재원 계산
function getDistributable(ab) {
  const totalBudget = ab.baseAmount + ab.totalAdded;
  const distributed = TEAM_DIST.filter(
    (t) => t.accountBudgetId === ab.id,
  ).reduce((s, t) => s + t.allocAmount, 0);
  return totalBudget - distributed;
}

// 헬퍼: 페르소나의 접근 가능한 ACCOUNT_BUDGETS 목록
function getPersonaAccountBudgets(persona) {
  const allowed = persona.allowedAccounts || [];
  const isSystem = allowed.includes("*");
  return ACCOUNT_BUDGETS.filter(
    (ab) =>
      ab.tenantId === persona.tenantId &&
      (isSystem || allowed.includes(ab.accountCode)),
  );
}
// ─── 교육지원 운영 규칙 마스터 (SERVICE_POLICIES) ──────────────────────────────────
// flow: 'result-only' | 'apply-result' | 'plan-apply-result'
// budgetLinked: 예산 계정 연동 여부
// approverPersonaKey: 최종 승인자 persona key
// managerPersonaKey: 정책 관리자 persona key

// SERVICE_POLICIES : Supabase service_policies 테이블 실시간 로드
// ⚠ mock 데이터 제거됨 - renderServicePolicy() 호출 시 DB에서 자동 채워짐
var SERVICE_POLICIES = [];

// 헬퍼: 현재 페르소나가 승인자인 정책 목록
function getPoliciesWhereApprover(persona) {
  return SERVICE_POLICIES.filter(
    (p) =>
      p.tenantId === persona.tenantId &&
      p.approverPersonaKey ===
        Object.keys(BO_PERSONAS).find((k) => BO_PERSONAS[k] === persona),
  );
}

// 헬퍼: 자신이 승인자인 정책의 결재 대기 건수
function getPendingCountForPersona(persona) {
  const myPolicies = getPoliciesWhereApprover(persona);
  const myPolicyIds = myPolicies.map((p) => p.id);
  return MOCK_BO_APPLICATIONS.filter(
    (a) => myPolicyIds.includes(a.policyId) && a.status.startsWith("pending"),
  ).length;
}

// ─── 직군 마스터 (JOB_TYPES) ────────────────────────────────────────────────
// 테넌트별 허용 직군 - 팀별 직군 필터링에 사용
const JOB_TYPES = {
  HMC: ["일반직", "생산직", "연구직", "임원"],
  KIA: ["일반직", "생산직", "연구직"],
  HAE: ["일반직", "임원"],
  HSC: ["일반직", "생산직", "기술직", "연구직", "임원"],
  default: ["일반직"],
};

function getTenantJobTypes(tenantId) {
  return JOB_TYPES[tenantId] || JOB_TYPES["default"];
}

// ─── 세부 산출 근거 항목 마스터 (Calculation Grounds) ────────────────────────
// ═══════════════════════════════════════════════════════════
// ⚠ Mock 데이터 제거됨 (2026-04-14)
// → DB(calc_grounds 테이블)에서 실시간 로드로 전환 완료
// → bo_calc_grounds.js > _cgLoadFromDb()에서 자동 채워짐
// → VOrg 템플릿 + shared_account_codes 기반 관리
// ═══════════════════════════════════════════════════════════
let CALC_GROUNDS_MASTER = [];

// ─── 계정별 산출근거 항목 조회 (하위 호환 래퍼) ──────────────────────────────
// 기존: accountTypes 기반 Mock 필터 → 신규: getCalcGroundsForVorg 기반
// FO plans.js 등에서 호출하는 기존 함수 시그니처를 유지
function getCalcGroundsForAccount(accountCode) {
  // VOrg 기반 함수가 있으면 위임 (persona의 VOrg 정보 활용)
  if (typeof getCalcGroundsForVorg === "function") {
    // currentPersona에서 VOrg ID 추출 시도
    const vorgId = (() => {
      if (typeof currentPersona !== "undefined" && currentPersona) {
        const vorgIds = currentPersona.vorgIds || [];
        if (vorgIds.length > 0) return vorgIds[0]; // 첫 번째 VOrg 사용
      }
      return null;
    })();
    return getCalcGroundsForVorg(vorgId, accountCode);
  }
  // 폴백: FO에서 _foLoadCalcGrounds로 채워진 CALC_GROUNDS_MASTER 활용
  // VOrg + accountCode 기반 필터링 적용
  const vorgId =
    typeof currentPersona !== "undefined" && currentPersona
      ? (currentPersona.vorgIds || [])[0] || null
      : null;
  return CALC_GROUNDS_MASTER.filter((g) => {
    if (g.active === false) return false;
    // VOrg 매칭: domainId가 설정된 항목은 해당 VOrg에만 표시
    if (g.domainId && vorgId && g.domainId !== vorgId) return false;
    // 계정 필터: sharedAccountCodes가 비어있으면 전체 공유
    if (
      accountCode &&
      g.sharedAccountCodes &&
      g.sharedAccountCodes.length > 0
    ) {
      if (!g.sharedAccountCodes.includes(accountCode)) return false;
    }
    return true;
  });
}

// ─── 금액별 동적 결재 라인 설정 (Approval Routing) ───────────────────────────
// 3단계 결재방식(external/platform/integrated) × 2축 에스컬레이션
// 축1: 총액 기반 승인자 레벨 상승 (자체+통합 공통)
// 축2: soft_limit 초과 → 조건부 협조처 활성화 (통합결재 전용)
// nodes: [{type, label, role, activation, conditionRuleId, requiresIntegrated}]
let APPROVAL_ROUTING = [
  {
    id: "AR001",
    tenantId: "HMC",
    accountCodes: ["HMC-OPS", "HMC-ETC", "HMC-PART"],
    name: "현대차 일반예산 결재라인",
    ranges: [
      {
        max: 1000000,
        label: "100만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          {
            type: "approval",
            label: "팀장",
            role: "팀장",
            final: true,
            order: 2,
          },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
          {
            type: "coop",
            label: "재경협조팀",
            coopType: "재경협조팀",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-FIN",
            requiresIntegrated: true,
            order: 4,
          },
        ],
      },
      {
        max: 5000000,
        label: "100만원 ~ 500만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
          {
            type: "coop",
            label: "재경협조팀",
            coopType: "재경협조팀",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-FIN",
            requiresIntegrated: true,
            order: 4,
          },
          {
            type: "approval",
            label: "실장",
            role: "실장",
            final: true,
            order: 5,
          },
        ],
      },
      {
        max: null,
        label: "500만원 이상",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
          {
            type: "coop",
            label: "재경협조팀",
            coopType: "재경협조팀",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-FIN",
            requiresIntegrated: true,
            order: 4,
          },
          { type: "approval", label: "실장", role: "실장", order: 5 },
          {
            type: "approval",
            label: "본부장",
            role: "본부장",
            final: true,
            order: 6,
          },
        ],
      },
    ],
  },
  {
    id: "AR002",
    tenantId: "HMC",
    accountCodes: ["HMC-RND"],
    name: "HMC R&D 결재라인",
    ranges: [
      {
        max: 3000000,
        label: "300만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          {
            type: "approval",
            label: "팀장",
            role: "팀장",
            final: true,
            order: 2,
          },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
        ],
      },
      {
        max: 10000000,
        label: "300만원 ~ 1000만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
          {
            type: "approval",
            label: "센터장",
            role: "센터장",
            final: true,
            order: 4,
          },
        ],
      },
      {
        max: null,
        label: "1000만원 이상",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "coop",
            label: "교육협조처",
            coopType: "교육협조처",
            activation: "conditional",
            conditionRuleId: "RULE-HMC-EDU",
            requiresIntegrated: true,
            order: 3,
          },
          { type: "approval", label: "센터장", role: "센터장", order: 4 },
          {
            type: "approval",
            label: "R&D총괄",
            role: "R&D총괄",
            final: true,
            order: 5,
          },
        ],
      },
    ],
  },
  {
    id: "AR003",
    tenantId: "KIA",
    accountCodes: ["KIA-OPS", "KIA-PART", "KIA-ETC"],
    name: "기아 일반예산 결재라인",
    ranges: [
      {
        max: 1000000,
        label: "100만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          {
            type: "approval",
            label: "팀장",
            role: "팀장",
            final: true,
            order: 2,
          },
        ],
      },
      {
        max: 5000000,
        label: "100만원 ~ 500만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "approval",
            label: "실장",
            role: "실장",
            final: true,
            order: 3,
          },
        ],
      },
      {
        max: null,
        label: "500만원 이상",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          { type: "approval", label: "실장", role: "실장", order: 3 },
          {
            type: "approval",
            label: "본부장",
            role: "본부장",
            final: true,
            order: 4,
          },
        ],
      },
    ],
  },
  {
    id: "AR004",
    tenantId: "HAE",
    accountCodes: ["HAE-OPS", "HAE-PART", "HAE-CERT"],
    name: "오토에버 결재라인",
    ranges: [
      {
        max: 500000,
        label: "50만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          {
            type: "approval",
            label: "팀장",
            role: "팀장",
            final: true,
            order: 2,
          },
        ],
      },
      {
        max: 2000000,
        label: "50만원 ~ 200만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "approval",
            label: "임원",
            role: "임원",
            final: true,
            order: 3,
          },
        ],
      },
      {
        max: null,
        label: "200만원 이상",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          { type: "approval", label: "임원", role: "임원", order: 3 },
          {
            type: "approval",
            label: "대표이사",
            role: "대표이사",
            final: true,
            order: 4,
          },
        ],
      },
    ],
  },
];

// ─── 조건부 협조처 활성화 룰 (D2: UI 룰 빌더 대상) ───────────────────────────
let APPROVAL_COOP_RULES = [
  {
    id: "RULE-HMC-EDU",
    name: "교육협조처 활성화 조건",
    tenantId: "HMC",
    operator: "OR",
    conditions: [
      { field: "soft_limit_exceeded", op: "eq", value: true },
      {
        field: "edu_type",
        op: "in",
        value: ["해외교육", "학회참석", "학회 직접 발표"],
      },
    ],
  },
  {
    id: "RULE-HMC-FIN",
    name: "재경협조팀 활성화 조건",
    tenantId: "HMC",
    operator: "OR",
    conditions: [
      { field: "soft_limit_exceeded", op: "eq", value: true },
      { field: "total_amount", op: "gte", value: 10000000 },
    ],
  },
];

// ─── 결재선 생성 엔진 (축1+축2 통합) ─────────────────────────────────────────

// 축1: 총액으로 기본 구간 결정
function getBaseApprovalRange(accountCode, amount) {
  const routing = APPROVAL_ROUTING.find((r) =>
    r.accountCodes.includes(accountCode),
  );
  if (!routing) return null;
  const range = routing.ranges.find((r) => r.max === null || amount < r.max);
  return range ? { routingName: routing.name, range } : null;
}

// 축2: soft_limit 초과 여부 판단
function hasSoftExceeded(calcGroundItems) {
  if (!calcGroundItems || !calcGroundItems.length) return false;
  return calcGroundItems.some((item) => {
    const ground = CALC_GROUNDS_MASTER.find(
      (g) => g.id === item.groundId || g.name === item.name,
    );
    if (!ground || ground.limit_type === "none" || !ground.soft_limit)
      return false;
    return item.amount > ground.soft_limit;
  });
}

// 룰 평가 엔진 (D2)
function _evaluateCoopRule(rule, ctx) {
  if (!rule || !rule.conditions || !rule.conditions.length) return false;
  const results = rule.conditions.map((c) => {
    switch (c.field) {
      case "soft_limit_exceeded":
        return c.op === "eq"
          ? hasSoftExceeded(ctx.calcGroundItems) === c.value
          : false;
      case "edu_type":
        return c.op === "in" ? c.value.includes(ctx.eduType) : false;
      case "total_amount":
        return _compareNum(ctx.totalAmount || 0, c.op, c.value);
      case "edu_days":
        return _compareNum(ctx.eduDays || 0, c.op, c.value);
      case "is_overseas":
        return c.op === "eq" ? ctx.isOverseas === c.value : false;
      default:
        return false;
    }
  });
  return rule.operator === "AND"
    ? results.every(Boolean)
    : results.some(Boolean);
}
function _compareNum(a, op, b) {
  if (op === "eq") return a === b;
  if (op === "gte") return a >= b;
  if (op === "gt") return a > b;
  if (op === "lte") return a <= b;
  if (op === "lt") return a < b;
  return false;
}

// 최종 결재선 생성 (2축 통합)
function buildApprovalLine(application) {
  const accountCode = application.accountCode;
  const totalAmount = application.totalAmount || 0;
  const account = ACCOUNT_MASTER.find((a) => a.code === accountCode);
  const approvalSystem = account?.approvalSystem || "platform";

  // 외부결재: 결재선 생성 안 함
  if (approvalSystem === "external") {
    const ref = getBaseApprovalRange(accountCode, totalAmount);
    return { type: "external", referenceInfo: ref };
  }

  // 축1: 총액 구간 결정
  const result = getBaseApprovalRange(accountCode, totalAmount);
  if (!result) return { type: approvalSystem, nodes: [] };

  // 노드 필터링
  const activeNodes = (result.range.nodes || []).filter((node) => {
    // 자체결재 시 통합결재 전용 노드(coop) 숨김 (D3)
    if (node.requiresIntegrated && approvalSystem !== "integrated")
      return false;
    // 조건부 노드 평가 (D4: 모든 구간 동일)
    if (node.activation === "conditional") {
      const rule = APPROVAL_COOP_RULES.find(
        (r) => r.id === node.conditionRuleId,
      );
      return _evaluateCoopRule(rule, application);
    }
    return true; // draft, approval 노드는 항상 포함
  });

  return {
    type: approvalSystem,
    routingName: result.routingName,
    nodes: activeNodes,
  };
}

// 하위호환 래퍼 (기존 코드에서 getApprovalRoute 호출하는 곳 지원)
function getApprovalRoute(accountCode, amount) {
  const result = getBaseApprovalRange(accountCode, amount);
  if (!result) return null;
  // 기존 인터페이스 호환: approvers 텍스트 배열 자동 생성
  const approvers = (result.range.nodes || [])
    .filter((n) => n.type === "approval")
    .map((n) => n.label);
  return {
    routingName: result.routingName,
    range: { ...result.range, approvers },
  };
}
