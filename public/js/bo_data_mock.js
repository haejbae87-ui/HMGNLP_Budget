// ─── bo_data_mock.js — MOCK 계획/신청/원장/계정마스터/Form (REFACTOR-3) ───
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

// ─── [Step4] 예산 ↔ 교육조직 템플릿 ↔ 신청/계획 통합 매핑 룰 ──────────
// accountCode 기반으로 교육조직 템플릿, 양식, 허용 학습유형, 복수계획옵션을 매핑
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

// ─── BO 역할 유틸 함수 (E-1 정식화) ──────────────────────────────────────────
// bo_data.js가 모든 BO 파일보다 먼저 로드되므로, 이곳에 정의.
// bo_allocation.js / bo_plan_mgmt.js / bo_calc_grounds.js 에서 직접 사용.

/**
 * 총괄담당자 여부 판별
 * - platform_admin / tenant_admin / budget_global_admin 또는 ownedAccounts 보유
 */
function isGlobalAdmin(persona) {
  if (!persona) return false;
  const role = persona.role || persona.boRole || '';
  if (['platform_admin', 'tenant_admin', 'budget_global_admin'].includes(role)) return true;
  if ((persona.ownedAccounts || []).length > 0) return true;
  return false;
}

/**
 * 운영담당자(VOrg Manager) 여부 판별
 * - budget_op_manager 역할이거나 managedVorgId가 있는 경우
 */
function isOpManager(persona) {
  if (!persona) return false;
  const role = persona.role || persona.boRole || '';
  if (role === 'budget_op_manager') return true;
  if (persona.managedVorgId) return true;
  return false;
}

/**
 * 역할 기반 관할 필터
 * - 총괄담당자(isGlobalAdmin && !isOpManager): 전체 반환
 * - 운영담당자(isOpManager): managedVorgId 하위 팀만 반환
 * @param {Array}  items    - 필터링할 배열
 * @param {object} persona  - BO 페르소나
 * @param {string} orgField - 팀명 매칭 필드 (기본: 'org_name')
 */
function applyRoleFilter(items, persona, orgField) {
  if (!items || !items.length) return items;
  if (isGlobalAdmin(persona) && !isOpManager(persona)) return items;

  const managedVorgId = persona.managedVorgId || persona.scope_vorg_id;
  if (!managedVorgId) return items;

  let teamNames = null;
  if (typeof VIRTUAL_EDU_ORGS !== 'undefined') {
    const vorg = VIRTUAL_EDU_ORGS
      .flatMap(t => [...(t.tree?.hqs || []), ...(t.tree?.centers || [])])
      .find(vg => vg.id === managedVorgId);
    if (vorg) teamNames = (vorg.teams || []).map(t => t.name);
  }
  if (!teamNames) return items;

  const field = orgField || 'org_name';
  return items.filter(item => {
    const orgName = item[field] || item['org_name'] || item['orgName'] || item['team_name'] || '';
    return teamNames.some(tn => orgName.includes(tn) || tn.includes(orgName));
  });
}

/**
 * 역할 라벨 반환 (GNB 표시용)
 */
function getRoleLabel(persona) {
  if (!persona) return '';
  if (isGlobalAdmin(persona) && !isOpManager(persona)) return '총괄담당자';
  if (isOpManager(persona)) return '운영담당자';
  return persona.roleLabel || persona.role || '관리자';
}

// === BO 공통 교육 캐스케이드 필터 (Phase 16 - bo_result_mgmt.js에서 이관) ===
// 사용법: ${_boEduFilterBar("renderMyScreen")}  <- 화면 렌더 함수명 문자열로 전달
// 전역 필터 상태 (모든 BO 화면 공유)
var _boEduFilter = (typeof _boEduFilter !== "undefined") ? _boEduFilter : {
  tenantId: "",
  vorgId: "",
  accountCode: "",
  purpose: "",
  eduType: "",
  eduSubType: "",
};

function _boEduFilterBar(onChangeCallback) {
  var tenants = (typeof TENANTS !== "undefined" && Array.isArray(TENANTS)) ? TENANTS : [];
  var vorgTemplates = (typeof VORG_TEMPLATES !== "undefined" && Array.isArray(VORG_TEMPLATES)) ? VORG_TEMPLATES : [];
  var budgetAccounts = (typeof BUDGET_ACCOUNTS !== "undefined" && Array.isArray(BUDGET_ACCOUNTS)) ? BUDGET_ACCOUNTS : [];
  var purposes = (typeof EDU_PURPOSE_GROUPS !== "undefined" && Array.isArray(EDU_PURPOSE_GROUPS)) ? EDU_PURPOSE_GROUPS : [];
  var typeGroups = (typeof EDU_TYPE_GROUPS !== "undefined" && Array.isArray(EDU_TYPE_GROUPS)) ? EDU_TYPE_GROUPS : [];
  var typeItems = (typeof EDU_TYPE_ITEMS !== "undefined" && Array.isArray(EDU_TYPE_ITEMS)) ? EDU_TYPE_ITEMS : [];
  if (!_boEduFilter.tenantId && boCurrentPersona && boCurrentPersona.tenantId) {
    _boEduFilter.tenantId = boCurrentPersona.tenantId;
  }
  var filteredVorgs = _boEduFilter.tenantId ? vorgTemplates.filter(function(v) { return (v.tenant_id || v.tenantId) === _boEduFilter.tenantId; }) : vorgTemplates;
  var filteredAccounts = _boEduFilter.tenantId ? budgetAccounts.filter(function(a) { return (a.tenant_id || a.tenantId) === _boEduFilter.tenantId; }) : budgetAccounts;
  var filteredTypes = _boEduFilter.purpose ? typeGroups.filter(function(g) { return g.purpose_id === _boEduFilter.purpose; }) : typeGroups;
  var filteredSubTypes = _boEduFilter.eduType ? typeItems.filter(function(i) { return i.group_id === _boEduFilter.eduType; }) : typeItems;
  return '<div class="bo-filter-bar">' +
    '<span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">' + String.fromCodePoint(0x1F50D) + ' ' + String.fromCodePoint(0xC870) + String.fromCodePoint(0xD68C) + ' ' + String.fromCodePoint(0xD544) + String.fromCodePoint(0xD130) + '</span>' +
    '<div style="display:flex;align-items:center;gap:8px"><span class="bo-filter-label">' + String.fromCodePoint(0xD68C) + String.fromCodePoint(0xC0AC) + '</span>' +
    '<select id="bf-tenant" class="bo-filter-select" onchange="_boFilterChange(\'tenantId\',this.value,\'' + onChangeCallback + '\')">' +
    '<option value="">' + String.fromCodePoint(0xC804) + String.fromCodePoint(0xCCB4) + ' ' + String.fromCodePoint(0xD68C) + String.fromCodePoint(0xC0AC) + '</option>' +
    tenants.map(function(t) { return '<option value="' + t.id + '"' + (_boEduFilter.tenantId === t.id ? ' selected' : '') + '>' + (t.name || t.id) + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="bo-filter-divider"></div>' +
    '<div style="display:flex;align-items:center;gap:8px"><span class="bo-filter-label">' + String.fromCodePoint(0xACC4) + String.fromCodePoint(0xC815) + '</span>' +
    '<select id="bf-account" class="bo-filter-select" onchange="_boFilterChange(\'accountCode\',this.value,\'' + onChangeCallback + '\')">' +
    '<option value="">' + String.fromCodePoint(0xC804) + String.fromCodePoint(0xCCB4) + ' ' + String.fromCodePoint(0xACC4) + String.fromCodePoint(0xC815) + '</option>' +
    filteredAccounts.map(function(a) { var code = a.code || a.id; return '<option value="' + code + '"' + (_boEduFilter.accountCode === code ? ' selected' : '') + '>' + a.name + '</option>'; }).join('') +
    '</select></div>' +
    '<div class="bo-filter-divider"></div>' +
    '<button onclick="window[\'' + onChangeCallback + '\']()" class="bo-filter-btn-search">' + String.fromCodePoint(0x25CF) + ' ' + String.fromCodePoint(0xC870) + String.fromCodePoint(0xD68C) + '</button>' +
    '<button onclick="_boFilterReset(\'' + onChangeCallback + '\')" class="bo-filter-btn-reset">' + String.fromCodePoint(0xCD08) + String.fromCodePoint(0xAE30) + String.fromCodePoint(0xD654) + '</button>' +
    '</div>';
}

function _boFilterChange(key, value, callbackName) {
  _boEduFilter[key] = value;
  var order = ["tenantId", "vorgId", "accountCode", "purpose", "eduType", "eduSubType"];
  var idx = order.indexOf(key);
  for (var i = idx + 1; i < order.length; i++) _boEduFilter[order[i]] = "";
  if (typeof window[callbackName] === "function") window[callbackName]();
}

function _boFilterReset(callbackName) {
  _boEduFilter = {
    tenantId: (boCurrentPersona && boCurrentPersona.tenantId) ? boCurrentPersona.tenantId : "",
    vorgId: "",
    accountCode: "",
    purpose: "",
    eduType: "",
    eduSubType: "",
  };
  if (typeof window[callbackName] === "function") window[callbackName]();
}

function _boApplyEduFilter(items) {
  return items.filter(function(item) {
    if (_boEduFilter.tenantId && (item.tenant_id || item.tenantId) !== _boEduFilter.tenantId) return false;
    if (_boEduFilter.accountCode && (item.account_code || item.account) !== _boEduFilter.accountCode) return false;
    if (_boEduFilter.purpose && item.detail && item.detail.purpose !== _boEduFilter.purpose) return false;
    if (_boEduFilter.eduType && (item.edu_type || item.eduType) !== _boEduFilter.eduType) return false;
    return true;
  });
}
