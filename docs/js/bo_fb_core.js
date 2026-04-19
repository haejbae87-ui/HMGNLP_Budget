// ─── bo_fb_core.js — 폼빌더 공통 상수/카탈로그/DB로드 (REFACTOR-1) ───
// ─── 교육신청양식마법사 (Form Builder Enhanced) ─────────────────────────────────
// 3탭 구조: ① 양식 라이브러리 ② 양식 빌더 ③ 서비스 통합 매핑
// 기획안 기반 고도화: 양식 분류체계, 입력 주체 제어, 조건부 로직, 서비스 매핑

// ── 상수 정의 ──────────────────────────────────────────────────────────────────
const FORM_TARGET_TYPES = {
  learner: {
    label: "직접학습",
    icon: "📚",
    color: "#059669",
    bg: "#F0FDF4",
    desc: "개인직무 사외학습 신청",
  },
  manager: {
    label: "교육운영",
    icon: "🎯",
    color: "#7C3AED",
    bg: "#F5F3FF",
    desc: "집합/운영/세미나/기타",
  },
};

const FORM_SERVICE_TYPES = {
  individual: {
    label: "개인직무 사외학습",
    target: "learner",
    icon: "🙋",
    color: "#059669",
  },
  group: {
    label: "집합/이러닝 운영",
    target: "manager",
    icon: "🏫",
    color: "#7C3AED",
  },
  seminar: {
    label: "컨퍼런스/세미나/워크샵",
    target: "manager",
    icon: "🎤",
    color: "#0369A1",
  },
  etc: {
    label: "기타 항목 관리",
    target: "manager",
    icon: "📦",
    color: "#D97706",
  },
};

const FORM_STAGE_TYPES = {
  plan: {
    label: "교육계획 (Plan)",
    icon: "📋",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  apply: {
    label: "교육신청 (Apply)",
    icon: "📄",
    color: "#059669",
    bg: "#F0FDF4",
  },
  result: {
    label: "교육결과 (Result)",
    icon: "📝",
    color: "#D97706",
    bg: "#FFFBEB",
  },
};

const PROCESS_PATTERNS = {
  A: {
    label: "패턴 A",
    desc: "계획 → 신청 → 결과",
    stages: ["plan", "apply", "result"],
    color: "#7C3AED",
  },
  B: {
    label: "패턴 B",
    desc: "신청 → 결과",
    stages: ["apply", "result"],
    color: "#059669",
  },
  C: {
    label: "패턴 C",
    desc: "신청 단독 (후정산)",
    stages: ["apply"],
    color: "#0369A1",
  },
};

// 폼 목적 (purpose) 정의 ────────────────────────────────────────────────────────────
const FORM_PURPOSE_TYPES = {
  individual: {
    label: "개인직무 사외학습",
    icon: "🙋",
    color: "#059669",
    bg: "#F0FDF4",
    targetUser: "learner",
  },
  elearning: {
    label: "이러닝/집합(비대면) 운영",
    icon: "🏢",
    color: "#7C3AED",
    bg: "#F5F3FF",
    targetUser: "admin",
  },
  seminar: {
    label: "콘퍼런스/세미나/워크숍 등 운영",
    icon: "🎤",
    color: "#0369A1",
    bg: "#EFF6FF",
    targetUser: "admin",
  },
  etc: {
    label: "기타 운영",
    icon: "📦",
    color: "#D97706",
    bg: "#FFFBEB",
    targetUser: "admin",
  },
};

// 교육유형 + 세부유형 2-depth 맵 ──────────────────────────────────────────────────────
const FORM_EDU_TYPES = {
  individual: [
    { type: "정규교육", sub: ["이러닝", "집합", "라이브"] },
    {
      type: "학술 및 연구활동",
      sub: ["학회/세미나/컨퍼런스", "학회 직접 발표", "연수"],
    },
    {
      type: "지식자원학습",
      sub: ["도서", "논문/저널", "기술자료(DB구독·자료구매)"],
    },
    {
      type: "역량개발지원",
      sub: ["어학학습비 지원", "자격증 취득지원", "학협회비"],
    },
    { type: "기타", sub: ["교육출강(사/내외)", "팀빌딩"] },
  ],
  elearning: [
    { type: "이러닝", sub: [] },
    { type: "집합(비대면)", sub: [] },
  ],
  seminar: [
    { type: "콘퍼런스", sub: [] },
    { type: "세미나", sub: [] },
    { type: "팀빌딩", sub: [] },
    { type: "자격유지", sub: [] },
    { type: "제도연계", sub: [] },
  ],
  etc: [
    { type: "과정개발", sub: [] },
    { type: "교안개발", sub: [] },
    { type: "영상제작", sub: [] },
    { type: "교육시설운영", sub: [] },
  ],
};

// 확장된 필드 라이브러리 - 입력 주체(scope) + 필드 타입(fieldType) + 옵션/의존성 포함
// fieldType: text | textarea | date | daterange | number | user-search | file | rating | select | calc-grounds | budget-linked | system
// options: select/multi_select 타입일 때 선택값 배열 [{ label, value }]
// predecessors: 이 필드 추가 시 반드시 선행되어야 하는 필드 key 배열
var ADVANCED_FIELDS = [
  // 공통 기본 필드
  {
    key: "교육목적",
    icon: "🎯",
    required: true,
    scope: "front",
    category: "기본정보",
    fieldType: "textarea",
    hint: "학습 목표 및 기대효과",
    canonicalKey: "course_purpose",
    layer: "L1",
  },
  {
    key: "교육기간",
    icon: "📅",
    required: true,
    scope: "front",
    category: "기본정보",
    fieldType: "daterange",
    hint: "시작일~종료일",
    canonicalKey: "edu_period",
    layer: "L1",
  },
  {
    key: "교육기관",
    icon: "🏫",
    required: true,
    scope: "front",
    category: "기본정보",
    fieldType: "text",
    hint: "교육 제공 기관명",
    canonicalKey: "edu_institution",
    layer: "L1",
  },
  {
    key: "과정명",
    icon: "📚",
    required: true,
    scope: "front",
    category: "기본정보",
    fieldType: "text",
    hint: "교육과정/행사명",
    canonicalKey: "course_name",
    layer: "L1",
  },
  {
    key: "장소",
    icon: "📍",
    required: false,
    scope: "front",
    category: "기본정보",
    fieldType: "text",
    hint: "교육 장소",
    canonicalKey: "location",
    layer: "L1",
  },
  {
    key: "기대효과",
    icon: "✨",
    required: false,
    scope: "front",
    category: "기본정보",
    fieldType: "textarea",
    hint: "참가 후 기대되는 효과",
    canonicalKey: "expected_effect",
    layer: "L1",
  },
  {
    key: "필수구분",
    icon: "📋",
    required: false,
    scope: "front",
    category: "기본정보",
    fieldType: "select",
    hint: "교육 필수 구분 선택",
    canonicalKey: "requirement_type",
    layer: "L1",
    options: [
      { label: "법정 자격유지", value: "legal_cert" },
      { label: "법정 필수교육", value: "legal_must" },
      { label: "핵심 Capability", value: "core_capability" },
      { label: "상생협력", value: "cooperation" },
    ],
  },
  // 비용 관련
  {
    key: "예상비용",
    icon: "💰",
    required: true,
    scope: "front",
    category: "비용정보",
    fieldType: "budget-linked",
    hint: "예상 총 비용 — 조직 예산 잔액 연동",
    budget: true,
    canonicalKey: "cost_total",
    layer: "L1",
  },
  {
    key: "교육비",
    icon: "💳",
    required: true,
    scope: "front",
    category: "비용정보",
    fieldType: "number",
    hint: "수강료/등록비 (원 단위)",
    canonicalKey: "tuition",
    layer: "L1",
  },
  {
    key: "참가비",
    icon: "💲",
    required: false,
    scope: "front",
    category: "비용정보",
    fieldType: "number",
    hint: "행사 참가비 (원 단위)",
    canonicalKey: "participation_fee",
    layer: "L1",
  },
  {
    key: "강사료",
    icon: "👨‍🏫",
    required: false,
    scope: "front",
    category: "비용정보",
    fieldType: "number",
    hint: "외부 강사 강의료",
    canonicalKey: "instructor_fee",
    layer: "L1",
  },
  {
    key: "대관비",
    icon: "🏛️",
    required: false,
    scope: "front",
    category: "비용정보",
    fieldType: "number",
    hint: "장소 대관 비용",
    canonicalKey: "venue_fee",
    layer: "L1",
  },
  {
    key: "식대/용차",
    icon: "🍽️",
    required: false,
    scope: "front",
    category: "비용정보",
    fieldType: "number",
    hint: "식비 및 운송비",
    canonicalKey: "meal_transport",
    layer: "L1",
  },
  {
    key: "실지출액",
    icon: "🧾",
    required: false,
    scope: "back",
    category: "비용정보",
    fieldType: "number",
    hint: "승인자 확정 실지출 인정액",
    canonicalKey: "actual_cost",
    layer: "L1",
  },
  {
    key: "세부산출근거",
    icon: "📐",
    required: false,
    scope: "front",
    category: "비용정보",
    fieldType: "calc-grounds",
    hint: "세부산출근거 항목 선택 (테넌트별 자동 로드)",
    canonicalKey: "calc_grounds",
    layer: "L1",
  },
  // 인원 관련
  {
    key: "교육대상",
    icon: "🎯",
    required: false,
    scope: "front",
    category: "인원정보",
    fieldType: "select",
    hint: "주요 교육 대상 직군 선택",
    canonicalKey: "target_audience",
    layer: "L1",
    options: [
      { label: "해당사항없음", value: "해당사항없음" },
      { label: "일반/연구/법무직", value: "일반/연구/법무직" },
      { label: "직군혼합", value: "직군혼합" },
      { label: "임원", value: "임원" },
      { label: "기술직", value: "기술직" },
      { label: "정비직", value: "정비직" },
      { label: "영업직", value: "영업직" },
      { label: "직원 외", value: "직원 외" },
    ],
  },
  {
    key: "수강인원",
    icon: "👥",
    required: false,
    scope: "front",
    category: "인원정보",
    fieldType: "number",
    hint: "예상 수강 인원 (명)",
    canonicalKey: "attendee_count",
    layer: "L1",
  },
  {
    key: "정원",
    icon: "🪑",
    required: false,
    scope: "front",
    category: "인원정보",
    fieldType: "number",
    hint: "최대 정원 (명)",
    canonicalKey: "capacity",
    layer: "L1",
  },
  {
    key: "참여자명단",
    icon: "📋",
    required: false,
    scope: "front",
    category: "인원정보",
    fieldType: "user-search",
    hint: "참여자 검색 및 명단 구성",
    canonicalKey: "participant_list",
    layer: "L1",
  },
  {
    key: "강사정보",
    icon: "🎤",
    required: false,
    scope: "front",
    category: "인원정보",
    fieldType: "user-search",
    hint: "강사 검색 — 내부 사용자 조회",
    canonicalKey: "instructor_info",
    layer: "L1",
  },
  // 첨부 서류
  {
    key: "첨부파일",
    icon: "📎",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "관련 서류 첨부",
    canonicalKey: "attachment",
    layer: "L1",
  },
  {
    key: "강사이력서",
    icon: "📄",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "외부강사 이력서 (강사료 선택 시 자동 활성화)",
    canonicalKey: "instructor_resume",
    layer: "L1",
    predecessors: ["강사료"],
  },
  {
    key: "보안서약서",
    icon: "🔒",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "보안 서약서 서명",
    canonicalKey: "security_pledge",
    layer: "L1",
  },
  {
    key: "영수증",
    icon: "🧾",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "결제 영수증/증빙",
    canonicalKey: "receipt",
    layer: "L1",
    predecessors: ["예상비용"],
  },
  {
    key: "수료증",
    icon: "🎓",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "수료증 업로드",
    canonicalKey: "certificate",
    layer: "L1",
    predecessors: ["수강인원"],
  },
  {
    key: "대관확정서",
    icon: "📜",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "장소 대관 확정서",
    canonicalKey: "venue_confirm",
    layer: "L1",
    predecessors: ["대관비"],
  },
  {
    key: "납품확인서",
    icon: "✅",
    required: false,
    scope: "front",
    category: "첨부서류",
    fieldType: "file",
    hint: "물품 납품 확인서",
    canonicalKey: "delivery_confirm",
    layer: "L1",
  },
  // 교육 운영정보 (신규)
  {
    key: "교육장소",
    icon: "📍",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "select",
    hint: "교육 진행 장소 선택",
    canonicalKey: "edu_venue",
    layer: "L1",
    options: [] /* 별도 field_options 테이블에서 관리 */,
  },
  {
    key: "총 차수",
    icon: "🔢",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "number",
    hint: "교육 총 회차 수 (차수)",
    canonicalKey: "total_sessions",
    layer: "L1",
  },
  {
    key: "예상인원",
    icon: "👥",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "number",
    hint: "과정 예상 참여 인원 (명)",
    canonicalKey: "expected_headcount",
    layer: "L1",
  },
  {
    key: "차수별 교육시간",
    icon: "⏱️",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "number",
    hint: "1차수 기준 교육 진행 시간 (H)",
    canonicalKey: "session_hours",
    layer: "L1",
  },
  {
    key: "과정시간(차수별)",
    icon: "🕐",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "number",
    hint: "과정 총 시간 (차수별 합산, H)",
    canonicalKey: "course_hours_per_session",
    layer: "L1",
  },
  {
    key: "교육내용",
    icon: "📝",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "textarea",
    hint: "교육 세부 내용 및 커리큘럼 설명",
    canonicalKey: "edu_content",
    layer: "L1",
  },
  {
    key: "고용보험환급",
    icon: "🏦",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "select",
    hint: "고용보험 환급 대상 여부",
    canonicalKey: "employment_insurance",
    layer: "L1",
    options: [
      { label: "Y — 환급 대상", value: "Y" },
      { label: "N — 해당 없음", value: "N" },
    ],
  },
  {
    key: "정산방식",
    icon: "💱",
    required: false,
    scope: "front",
    category: "교육운영정보",
    fieldType: "select",
    hint: "비용 정산 기준 방식 선택",
    canonicalKey: "settlement_type",
    layer: "L1",
    options: [
      { label: "해당없음", value: "none" },
      { label: "인원비율 정산", value: "headcount_ratio" },
      { label: "매출액 비율 정산", value: "revenue_ratio" },
      { label: "G코드 정산", value: "g_code" },
    ],
  },
  // 월별 계획 그리드 (신규) — fieldType: 'monthly-grid'
  {
    key: "월별 교육인원",
    icon: "📊",
    required: false,
    scope: "front",
    category: "월별계획",
    fieldType: "monthly-grid",
    hint: "연도별 월(1~12월) 교육 인원 입력 (단위: 명)",
    canonicalKey: "monthly_headcount",
    layer: "L1",
    gridConfig: { unit: "명", valueType: "integer" },
  },
  {
    key: "월별 예상 집행금액",
    icon: "📈",
    required: false,
    scope: "front",
    category: "월별계획",
    fieldType: "monthly-grid",
    hint: "연도별 월(1~12월) 예상 집행 금액 입력 (단위: 원)",
    canonicalKey: "monthly_budget",
    layer: "L1",
    gridConfig: { unit: "원", valueType: "currency" },
  },
  // 결과 관련
  {
    key: "수료생명단",
    icon: "📝",
    required: false,
    scope: "front",
    category: "결과정보",
    fieldType: "user-search",
    hint: "최종 수료자 명단",
    canonicalKey: "completion_list",
    layer: "L1",
  },
  {
    key: "학습만족도",
    icon: "⭐",
    required: false,
    scope: "front",
    category: "결과정보",
    fieldType: "rating",
    hint: "만족도 조사 (5점 척도)",
    canonicalKey: "satisfaction",
    layer: "L1",
  },
  {
    key: "교육결과요약",
    icon: "📊",
    required: false,
    scope: "front",
    category: "결과정보",
    fieldType: "textarea",
    hint: "교육 결과 요약 보고",
    canonicalKey: "result_summary",
    layer: "L1",
  },
  // BO 제공 → FO 구독 (provide) — 관리자가 입력하면 FO에 읽기전용 노출
  {
    key: "안내사항",
    icon: "📢",
    required: false,
    scope: "provide",
    category: "BO제공(안내)",
    fieldType: "textarea",
    hint: "교육 참가 전 공지·안내사항 (FO 읽기전용 노출)",
    canonicalKey: "announcement",
    layer: "L1",
  },
  {
    key: "준비물",
    icon: "🎒",
    required: false,
    scope: "provide",
    category: "BO제공(안내)",
    fieldType: "text",
    hint: "교육 참가 준비물 안내 (FO 읽기전용 노출)",
    canonicalKey: "preparation",
    layer: "L1",
  },
  {
    key: "확정 교육장소",
    icon: "📍",
    required: false,
    scope: "provide",
    category: "BO제공(확정)",
    fieldType: "text",
    hint: "BO에서 확정한 교육 장소 (FO 읽기전용 노출)",
    canonicalKey: "confirmed_venue",
    layer: "L1",
  },
  {
    key: "확정 강사",
    icon: "👨‍🏫",
    required: false,
    scope: "provide",
    category: "BO제공(확정)",
    fieldType: "text",
    hint: "BO에서 배정한 강사 정보 (FO 읽기전용 노출)",
    canonicalKey: "confirmed_instructor",
    layer: "L1",
  },
  {
    key: "합격/수료 여부",
    icon: "🎓",
    required: false,
    scope: "provide",
    category: "BO제공(결과)",
    fieldType: "select",
    hint: "학습자에게 결과 통보 (FO 읽기전용 노출)",
    canonicalKey: "pass_status",
    layer: "L1",
    options: [
      { label: "합격", value: "pass" },
      { label: "불합격", value: "fail" },
      { label: "수료", value: "completed" },
      { label: "미수료", value: "incomplete" },
    ],
  },
  {
    key: "관리자 피드백",
    icon: "💬",
    required: false,
    scope: "provide",
    category: "BO제공(결과)",
    fieldType: "textarea",
    hint: "관리자가 학습자에게 전달하는 결과 피드백 (FO 읽기전용 노출)",
    canonicalKey: "manager_feedback",
    layer: "L1",
  },
  // 백오피스 전용 (승인자)
  {
    key: "ERP코드",
    icon: "🔗",
    required: false,
    scope: "back",
    category: "관리(승인자)",
    fieldType: "text",
    hint: "ERP 연동 비용 코드",
    canonicalKey: "erp_code",
    layer: "L1",
  },
  {
    key: "검토의견",
    icon: "💬",
    required: false,
    scope: "back",
    category: "관리(승인자)",
    fieldType: "textarea",
    hint: "승인자 검토 및 의견",
    canonicalKey: "review_comment",
    layer: "L1",
  },
  {
    key: "관리자비고",
    icon: "📌",
    required: false,
    scope: "back",
    category: "관리(승인자)",
    fieldType: "textarea",
    hint: "관리자 내부 메모",
    canonicalKey: "admin_note",
    layer: "L1",
  },
  // 연결/시스템 필드
  {
    key: "계획서연결",
    icon: "🔗",
    required: false,
    scope: "system",
    category: "시스템",
    fieldType: "system",
    hint: "연결된 교육계획 양식 자동 불러오기",
    canonicalKey: "plan_link",
    layer: "L1",
  },
  {
    key: "예산계정",
    icon: "💼",
    required: false,
    scope: "system",
    category: "시스템",
    fieldType: "budget-linked",
    hint: "예산 계정 잔액 실시간 연동",
    budget: true,
    canonicalKey: "budget_account",
    layer: "L1",
  },
  {
    key: "과정-차수연결",
    icon: "📺",
    required: false,
    scope: "front",
    category: "시스템",
    fieldType: "course-session",
    hint: "채널→과정→차수 선택 (다과정·다차수 부분선택 가능)",
    canonicalKey: "course_session",
    layer: "L1",
  },
];

// ── L2 필드 캐시 (DB에서 로드) ─────────────────────────────────────────────────
var _fbL2Fields = []; // DB에서 로드된 L2 확장 필드 캐시
var _fbFieldOptions = {}; // { fieldKey: [{ label, value }] } DB 옵션 캐시
var _fbFieldDeps = []; // DB 의존성 규칙 캐시
var _fbL1Overrides = {}; // { canonicalKey: { display_name, hint, required, scope, is_hidden } } 테넌트 L1 오버라이드 캐시
const _FB_L2_MAX = 10; // L2 필드 최대 개수 제한

// ── DB에서 L2 필드 + 옵션 + 의존성 로드 ──────────────────────────────────────
async function _fbLoadFieldCatalog() {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const tenantId = boCurrentPersona?.tenantId || "HMC";
    // L2 필드 로드
    const { data: l2 } = await sb
      .from("form_field_catalog")
      .select("*")
      .eq("layer", "L2")
      .eq("tenant_id", tenantId)
      .eq("active", true);
    if (l2) {
      _fbL2Fields = l2.map((f) => ({
        key: f.display_name,
        icon: f.icon || "📝",
        required: f.default_required,
        scope: f.scope,
        category: f.category,
        fieldType: f.field_type,
        hint: f.hint,
        canonicalKey: f.canonical_key,
        layer: "L2",
        dbId: f.id,
        options: [],
        predecessors: [],
      }));
    }
    // 옵션값 로드 (L1 + L2)
    const { data: opts } = await sb
      .from("field_options")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .eq("active", true)
      .order("sort_order");
    if (opts) {
      _fbFieldOptions = {};
      opts.forEach((o) => {
        // field_id → display_name 매핑
        const catField = [...ADVANCED_FIELDS, ..._fbL2Fields].find(
          (f) => f.canonicalKey && "FLD_" + f.canonicalKey === o.field_id,
        );
        if (catField) {
          if (!_fbFieldOptions[catField.key])
            _fbFieldOptions[catField.key] = [];
          _fbFieldOptions[catField.key].push({
            label: o.label,
            value: o.value,
            layer: o.layer,
            locked: o.is_locked,
          });
        }
      });
      // ADVANCED_FIELDS의 options와 병합
      ADVANCED_FIELDS.forEach((f) => {
        if (_fbFieldOptions[f.key]) {
          f.options = _fbFieldOptions[f.key];
        }
      });
      _fbL2Fields.forEach((f) => {
        if (_fbFieldOptions[f.key]) f.options = _fbFieldOptions[f.key];
      });
    }
    // 의존성 규칙 로드
    const { data: deps } = await sb
      .from("field_dependencies")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    if (deps) _fbFieldDeps = deps;

    // L1 오버라이드 로드 및 ADVANCED_FIELDS에 병합
    const { data: overrides } = await sb
      .from("tenant_l1_overrides")
      .select("*")
      .eq("tenant_id", tenantId);
    if (overrides) {
      _fbL1Overrides = {};
      overrides.forEach((o) => {
        _fbL1Overrides[o.canonical_key] = o;
      });
      // ADVANCED_FIELDS에 오버라이드 실시간 반영
      ADVANCED_FIELDS.forEach((f) => {
        const ov = _fbL1Overrides[f.canonicalKey];
        if (!ov) return;
        if (ov.display_name) f.key = ov.display_name;
        if (ov.hint != null) f.hint = ov.hint;
        if (ov.default_required != null) f.required = ov.default_required;
        if (ov.scope) f.scope = ov.scope;
        f._hidden = ov.is_hidden || false;
      });
    }
  } catch (e) {
    console.warn("[FieldCatalog] 로드 실패:", e.message);
  }
}

// ── 전체 필드 목록 (L1 + L2) ────────────────────────────────────────────────
function _fbAllFields() {
  return [...ADVANCED_FIELDS, ..._fbL2Fields];
}

// 서비스 통합 매핑 탭 제거됨 (2026-04-13) — 교육지원 운영 규칙관리(bo_policy_builder.js)의
// stage_form_ids 연결이 완전한 SSOT로 대체함.

// 현재 탭 상태
let _fbCurrentTab = "library"; // 'library' | 'field_catalog'
let _fbEditId = null;
let _fbTempFields = []; // { key, scope:'front'|'back', required: boolean, order }
let _fbBuilderMode = "create"; // 'create' | 'edit'

// ─── 역할별 필터 상태 ─────────────────────────────────────────────────────────
let _fbTenantId = null;
let _fbGroupId = null;
let _fbAccountCode = null;
let _fbServiceTypeFilter = ""; // '' = 전체
let _fbPurposeFilter = ""; // '' = 전체
let _fbEduTypeFilter = ""; // '' = 전체
let _fbEduSubTypeFilter = ""; // '' = 전체

// ── 메인 진입점 ────────────────────────────────────────────────────────────────
// ── DB 데이터 로드 (교육조직, 계정) ──
let _fbTplList = [];
let _fbAccountList = [];
async function _fbLoadDbData() {
  if (typeof _sb !== "function" || !_sb()) return;
  try {
    const p1 = _sb()
      .from("virtual_org_templates")
      .select("id,name,tenant_id,service_type")
      .eq("tenant_id", _fbTenantId)
      .eq("service_type", "edu_support");
    const p2 = _sb()
      .from("budget_accounts")
      .select("code,name,virtual_org_template_id")
      .eq("tenant_id", _fbTenantId);
    const [res1, res2] = await Promise.all([p1, p2]);
    if (res1.data) _fbTplList = res1.data;
    if (res2.data) _fbAccountList = res2.data;
  } catch (e) {
    console.warn("[FormBuilder] DB 데이터 로드 실패:", e);
  }
}

async function renderFormBuilderMenu() {