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

// ── 필드 라이브러리 v2.1 (field_catalog_v2.md 기준) ─────────────────────────
// fieldType: text|textarea|daterange|number|boolean|select|user-search|
//            venue-selector|headcount-or-search|calc-grounds|file-multi|rating
// scope: front(FO 입력) | back(BO 전용) | provide(BO→FO 읽기전용)
// locked: true → ON/OFF 불가 (항상 켜짐)
// dependsOn: 이 필드가 활성화되려면 켜져있어야 하는 부모 canonicalKey
// order: 표시 순서 (그룹 내 고정)
var ADVANCED_FIELDS = [

  // ── 그룹 1: 기본정보 (필수 4 + 선택 1) ──────────────────────────────────
  { key:"과정명", icon:"📚", required:true, locked:true, scope:"front", category:"기본정보", order:1, fieldType:"text", hint:"교육과정 또는 행사명", canonicalKey:"course_name", layer:"L1" },
  { key:"교육장소", icon:"📍", required:true, locked:true, scope:"front", category:"기본정보", order:2, fieldType:"venue-selector", hint:"사내/사외 선택 → DB 교육장소 목록 조회 (없으면 직접입력)", canonicalKey:"edu_venue", layer:"L1", config:{ internalLabel:"사내교육장", externalLabel:"사외교육기관", allowFreeText:true } },
  { key:"교육기간", icon:"📅", required:true, locked:true, scope:"front", category:"기본정보", order:3, fieldType:"daterange", hint:"시작일 ~ 종료일", canonicalKey:"edu_period", layer:"L1" },
  { key:"교육목적", icon:"🎯", required:true, locked:true, scope:"front", category:"기본정보", order:4, fieldType:"textarea", hint:"교육목표 및 기대효과", canonicalKey:"learning_objective", layer:"L1" },
  { key:"교육내용", icon:"📝", required:false, locked:false, scope:"front", category:"기본정보", order:5, fieldType:"textarea", hint:"교육 세부 내용 및 커리큘럼", canonicalKey:"course_description", layer:"L1" },

  // ── 그룹 2: 교육 속성 ───────────────────────────────────────────────────
  { key:"교육형태", icon:"🖥️", required:false, locked:false, scope:"front", category:"교육속성", order:6, fieldType:"select", hint:"온라인 / 오프라인 구분", canonicalKey:"education_format", layer:"L1", options:[{ label:"온라인", value:"online" },{ label:"오프라인", value:"offline" }] },
  { key:"해외교육 여부", icon:"✈️", required:false, locked:false, scope:"front", category:"교육속성", order:7, fieldType:"boolean", hint:"해외 교육 여부 (true 시 국가 입력 + 출장비/항공료 calc_grounds 활성화)", canonicalKey:"is_overseas", layer:"L1" },
  { key:"해외교육 국가", icon:"🌐", required:false, locked:false, scope:"front", category:"교육속성", order:8, fieldType:"text", hint:"해외 교육 국가명 (is_overseas=true 시 자동 표시 + 필수)", canonicalKey:"overseas_country", layer:"L1", dependsOn:"is_overseas" },
  { key:"숙박 여부", icon:"🏨", required:false, locked:false, scope:"front", category:"교육속성", order:9, fieldType:"boolean", hint:"숙박/합숙 포함 여부 (true 시 숙박비 calc_grounds 활성화)", canonicalKey:"has_accommodation", layer:"L1" },
  { key:"고용보험 환급 여부", icon:"🏦", required:false, locked:false, scope:"front", category:"교육속성", order:10, fieldType:"boolean", hint:"고용보험 환급 대상 교육 여부", canonicalKey:"is_ei_eligible", layer:"L1" },
  { key:"고용보험 환급예상액", icon:"💵", required:false, locked:false, scope:"front", category:"교육속성", order:11, fieldType:"number", hint:"교육기관에서 돌려받을 예상 환급금액 (예산 지출 아님 — 별도 관리)", canonicalKey:"ei_refund_amount", layer:"L1", dependsOn:"is_ei_eligible" },

  // ── 그룹 3: 운영 규모 ───────────────────────────────────────────────────
  { key:"교육시간(H)", icon:"⏱️", required:false, locked:false, scope:"front", category:"운영규모", order:12, fieldType:"number", hint:"직접학습: 총 학습시간(H) / 운영형: 차수별 교육시간(H)", canonicalKey:"planned_hours", layer:"L1" },
  { key:"교육일수", icon:"📆", required:false, locked:false, scope:"front", category:"운영규모", order:13, fieldType:"text", hint:"예: 2박3일 또는 숫자 (일)", canonicalKey:"planned_days", layer:"L1" },
  { key:"교육차수", icon:"🔢", required:false, locked:false, scope:"front", category:"운영규모", order:14, fieldType:"number", hint:"교육 총 회차 수 (운영형 주 사용, 직접학습은 1)", canonicalKey:"planned_rounds", layer:"L1" },
  { key:"교육인원", icon:"👥", required:false, locked:false, scope:"front", category:"운영규모", order:15, fieldType:"headcount-or-search", hint:"예상인원 입력(숫자) 또는 대상자 직접 검색 선택", canonicalKey:"planned_headcount", layer:"L1", config:{ modes:["number","user-search"], defaultMode:"number" } },

  // ── 그룹 4: 참가자/담당자 ──────────────────────────────────────────────
  { key:"교육담당자", icon:"👤", required:false, locked:false, scope:"front", category:"참가자", order:16, fieldType:"user-search", hint:"기본=작성자. 담당자가 다를 경우 검색하여 변경 (created_by와 별도 관리)", canonicalKey:"person_in_charge", layer:"L1", config:{ defaultToCurrentUser:true, allowChange:true } },
  { key:"참여자명단", icon:"📋", required:false, locked:false, scope:"front", category:"참가자", order:17, fieldType:"user-search", hint:"교육 참여 대상자 검색 및 명단 구성", canonicalKey:"participant_list", layer:"L1", config:{ multiple:true } },
  { key:"강사정보", icon:"🎤", required:false, locked:false, scope:"front", category:"참가자", order:18, fieldType:"user-search", hint:"내부/외부 강사 정보", canonicalKey:"instructor_info", layer:"L1", config:{ multiple:true, allowExternal:true } },

  // ── 그룹 5: 비용 ────────────────────────────────────────────────────────
  { key:"세부산출근거", icon:"📐", required:false, locked:false, scope:"front", category:"비용", order:19, fieldType:"calc-grounds", hint:"항목별 단가×수량 입력 — 모든 비용의 SSOT (조건부 항목 자동 필터)", canonicalKey:"calc_grounds", layer:"L1" },

  // ── 그룹 6: 첨부 ────────────────────────────────────────────────────────
  { key:"첨부파일", icon:"📎", required:false, locked:false, scope:"front", category:"첨부", order:20, fieldType:"file-multi", hint:"관련 서류 다중 첨부 (안내문구는 양식 설정에서 입력)", canonicalKey:"attachment", layer:"L1", config:{ maxFiles:10, allowedTypes:["pdf","doc","docx","xlsx","jpg","png","zip"], guidanceText:"" } },

  // ── 그룹 7: 결과 (result 단계 FO 입력) ──────────────────────────────────
  { key:"수료여부", icon:"🎓", required:false, locked:false, scope:"front", category:"결과", order:21, fieldType:"boolean", hint:"교육 수료 여부", canonicalKey:"is_completed", layer:"L1" },
  { key:"실지출액", icon:"🧾", required:false, locked:false, scope:"front", category:"결과", order:22, fieldType:"number", hint:"교육 완료 후 실제 지출 금액 (FO 결과 단계 입력)", canonicalKey:"actual_cost", layer:"L1" },
  { key:"업무적용계획", icon:"💼", required:false, locked:false, scope:"front", category:"결과", order:23, fieldType:"textarea", hint:"교육 내용을 업무에 어떻게 적용할지", canonicalKey:"work_application_plan", layer:"L1" },
  { key:"교육소감", icon:"💬", required:false, locked:false, scope:"front", category:"결과", order:24, fieldType:"textarea", hint:"교육 후 소감 및 결과 요약", canonicalKey:"review_comment", layer:"L1" },

  // ── 그룹 8: BO 전용 ─────────────────────────────────────────────────────
  { key:"검토의견", icon:"💬", required:false, locked:false, scope:"back", category:"BO전용", order:25, fieldType:"textarea", hint:"승인자 검토 의견 및 관리자 피드백", canonicalKey:"admin_comment", layer:"L1" },
  { key:"안내사항", icon:"📢", required:false, locked:false, scope:"provide", category:"BO전용", order:26, fieldType:"textarea", hint:"교육 참가 전 공지/준비물/확정장소 안내 (FO 읽기전용 노출)", canonicalKey:"announcement", layer:"L1" },
  { key:"ERP코드", icon:"🔗", required:false, locked:false, scope:"back", category:"BO전용", order:27, fieldType:"text", hint:"ERP 연동 비용 코드 (SAP 전표처리용)", canonicalKey:"erp_code", layer:"L1" },
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
  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";

  // 테넌트 초기화
  if (!_fbTenantId) {
    _fbTenantId = isPlatform
      ? tenants[0]?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";
  }
  // 데이터 로드
  await _fbLoadDbData();

  // 제도그룹 초기화
  if (!_fbGroupId) {
    _fbGroupId = _fbTplList[0]?.id || null;
  }

  document.getElementById("bo-content").innerHTML = _fbRenderPage();
}

function _fbRenderPage() {
  const role = boCurrentPersona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const tenantName =
    tenants.find((t) => t.id === _fbTenantId)?.name || _fbTenantId || "";

  // 제도그룹 목록
  const groups = _fbTplList;
  // 선택된 가상교육조직
  const selGroup = groups.find((g) => g.id === _fbGroupId);

  // ── 필터바 ── 교육지원 운영 규칙관리와 동일 스타일
  // 행 1: 데이터 범위 필터 (tenant/group)
  const filterBar =
    isPlatform || isTenant
      ? `
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 20px;
              background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px 12px 0 0;margin-bottom:0">
    ${
      isPlatform
        ? `
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">회사</label>
      <select onchange="_fbTenantId=this.value;_fbGroupId=null;_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer">
        ${tenants.map((t) => `<option value="${t.id}" ${t.id === _fbTenantId ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>
    </div>`
        : `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:12px;font-weight:700;color:#374151">회사</span>
      <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
    </div>`
    }
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">제도그룹</label>
      <select onchange="_fbGroupId=this.value;_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        <option value="">전체 조직</option>
        ${groups.map((g) => `<option value="${g.id}" ${g.id === _fbGroupId ? "selected" : ""}>${g.name}</option>`).join("")}
      </select>
    </div>
  </div>`
      : "";

  // 행 2: 서비스유형/목적/교육유형/세부유형/조회/초기화
  const eduTypesForPurpose = _fbPurposeFilter
    ? FORM_EDU_TYPES[_fbPurposeFilter] || []
    : [];
  const filterBar2 = `
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 20px;
              background:#F9FAFB;border:1.5px solid #E5E7EB;border-top:${isPlatform || isTenant ? "1px dashed #D1D5DB" : "none"};
              border-radius:${isPlatform || isTenant ? "0 0 12px 12px" : "12px"};margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">서비스 유형</label>
      <select onchange="_fbServiceTypeFilter=this.value;_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:120px">
        <option value="">전체 유형</option>
        ${Object.entries(FORM_TARGET_TYPES)
          .map(
            ([k, v]) =>
              `<option value="${k}" ${_fbServiceTypeFilter === k ? "selected" : ""}>${v.label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">목적</label>
      <select onchange="_fbPurposeFilter=this.value;_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:170px"
        ${!_fbServiceTypeFilter ? "" : ""}>
        <option value="">전체 목적</option>
        ${Object.entries(FORM_PURPOSE_TYPES)
          .filter(
            ([k, v]) =>
              !_fbServiceTypeFilter ||
              v.targetUser ===
                (_fbServiceTypeFilter === "learner" ? "learner" : "admin"),
          )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${_fbPurposeFilter === k ? "selected" : ""}>${v.icon} ${v.label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">교육유형</label>
      <select onchange="_fbEduTypeFilter=this.value;_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px"
        ${!_fbPurposeFilter ? "disabled" : ""}>
        <option value="">전체 교육유형</option>
        ${eduTypesForPurpose
          .map(
            (t) =>
              `<option value="${t.type}" ${_fbEduTypeFilter === t.type ? "selected" : ""}>${t.type}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">세부유형</label>
      <select onchange="_fbEduSubTypeFilter=this.value;renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:140px"
        ${!_fbEduTypeFilter ? "disabled" : ""}>
        <option value="">전체 세부유형</option>
        ${(
          eduTypesForPurpose.find((t) => t.type === _fbEduTypeFilter)?.sub || []
        )
          .map(
            (s) =>
              `<option value="${s}" ${_fbEduSubTypeFilter === s ? "selected" : ""}>${s}</option>`,
          )
          .join("")}
      </select>
    </div>
    <button onclick="renderFormBuilderMenu()"
      style="padding:8px 18px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button>
    <button onclick="_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
      style="padding:8px 14px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">초기화</button>
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
    ${_fbTabBtn("library", "📚 양식 라이브러리")}
    ${_fbTabBtn("field_catalog", "📌 입력 필드 관리")}
    ${_fbTabBtn("venues", "🏢 교육장소 관리")}
  </div>

  <!-- 탭 콘텐츠 -->
  <div id="fb-tab-content">
    ${_fbCurrentTab === "field_catalog" ? _fbRenderFieldCatalog()
      : _fbCurrentTab === "venues" ? _fbRenderVenueManager()
      : _fbRenderLibrary()}
  </div>
</div>`;
}

function _fbTabBtn(id, label) {
  const active = _fbCurrentTab === id;
  return `<button onclick="_fbSwitchTab('${id}')" style="
    padding:10px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:${active ? "900" : "600"};
    color:${active ? "#7C3AED" : "#6B7280"};border-bottom:${active ? "3px solid #7C3AED" : "3px solid transparent"};
    margin-bottom:-2px;transition:all .15s">${label}</button>`;
}

function _fbSwitchTab(tab) {
  _fbCurrentTab = tab;
  if (tab === "field_catalog") {
    _fbLoadFieldCatalog()
      .then(() => { document.getElementById("bo-content").innerHTML = _fbRenderPage(); })
      .catch(() => { document.getElementById("bo-content").innerHTML = _fbRenderPage(); });
  } else if (tab === "venues") {
    _fbLoadVenues()
      .then(() => { document.getElementById("bo-content").innerHTML = _fbRenderPage(); })
      .catch(() => { document.getElementById("bo-content").innerHTML = _fbRenderPage(); });
  } else {
    document.getElementById("bo-content").innerHTML = _fbRenderPage();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① 양식 라이브러리 탭 - 목적→교육유형→세부유형→단계 계층 구조
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fbRenderLibrary() {
  const role = boCurrentPersona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";

  // 필터 기준 테넌트 결정
  const tenantId =
    isPlatform || isTenant
      ? _fbTenantId || boCurrentPersona.tenantId
      : boCurrentPersona.tenantId || "HMC";
  let allForms = FORM_MASTER.filter((f) => f.tenantId === tenantId);

  // 가상교육조직 필터 (virtual_org_template_id 없는 양식은 하위호환으로 표시)
  if (_fbGroupId) {
    allForms = allForms.filter((f) => !f.domainId || f.domainId === _fbGroupId);
  }

  // 서비스 유형 (목적 필드 기반으로 targetUser 매칭)
  if (_fbServiceTypeFilter) {
    allForms = allForms.filter((f) => {
      const p = FORM_PURPOSE_TYPES[f.purpose];
      return (
        p &&
        p.targetUser ===
          (_fbServiceTypeFilter === "learner" ? "learner" : "admin")
      );
    });
  }

  // 목적 필터 적용
  if (_fbPurposeFilter) {
    allForms = allForms.filter((f) => f.purpose === _fbPurposeFilter);
  }
  // 교육유형 필터 적용
  if (_fbEduTypeFilter) {
    allForms = allForms.filter((f) => f.eduType === _fbEduTypeFilter);
  }

  // 교육 세부유형 필터
  if (_fbEduSubTypeFilter) {
    allForms = allForms.filter((f) => f.eduSubType === _fbEduSubTypeFilter);
  }

  // 상단 버튼
  const addBtn = `
<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
  <button class="bo-btn-primary" onclick="fbOpenBuilderModal()"
    style="display:flex;align-items:center;gap:6px;padding:9px 18px">＋ 새 양식 만들기</button>
</div>`;

  // 전체 요약 배지
  const totalByStage = (stage) =>
    allForms.filter((f) => f.type === stage).length;
  const summaryBar = `
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
  ${Object.entries(FORM_STAGE_TYPES)
    .map(
      ([k, v]) => `
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:${v.bg};
              border-radius:20px;border:1.5px solid ${v.color}20">
    <span style="font-size:13px">${v.icon}</span>
    <span style="font-size:11px;font-weight:800;color:${v.color}">${v.label.split("(")[0].trim()}</span>
    <span style="font-size:11px;font-weight:900;color:${v.color}">${totalByStage(k)}개</span>
  </div>`,
    )
    .join("")}
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:#F9FAFB;
              border-radius:20px;border:1.5px solid #E5E7EB">
    <span style="font-size:11px;font-weight:700;color:#374151">전체</span>
    <span style="font-size:11px;font-weight:900;color:#111827">${allForms.length}개</span>
  </div>
</div>`;

  // ── 테이블 렌더링 ──
  const headerStyle =
    "padding:10px 14px;font-size:11px;font-weight:800;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB;white-space:nowrap";
  const tableHeader = `
<tr>
  <th style="${headerStyle};text-align:center;width:44px">NO.</th>
  <th style="${headerStyle}">양식명</th>
  <th style="${headerStyle};width:80px">단계</th>
  <th style="${headerStyle}">목적 / 교육유형</th>
  <th style="${headerStyle};width:60px;text-align:center">필드수</th>
  <th style="${headerStyle};width:60px;text-align:center">상태</th>
  <th style="${headerStyle};width:280px;text-align:center">관리</th>
</tr>`;

  const formRows = allForms
    .map((f, idx) => {
      const s = FORM_STAGE_TYPES[f.type] || FORM_STAGE_TYPES.apply;
      const fields = f.fields || [];
      const purposeLabel =
        FORM_PURPOSE_TYPES[f.purpose]?.label || f.purpose || "—";
      const eduTypeLabel = f.eduType || "—";
      const _fStatus = f.status || (f.active ? "published" : "draft");
      const _statusMap = {
        draft: { bg: "#F3F4F6", color: "#6B7280", label: "📝 초안" },
        published: {
          bg: "#D1FAE5",
          color: "#065F46",
          label: `✅ 배포중 v${f.version || 1}`,
        },
        archived: { bg: "#FEF3C7", color: "#92400E", label: "📦 보관" },
      };
      const _sm = _statusMap[_fStatus] || _statusMap.draft;
      const statusBg = _sm.bg;
      const statusColor = _sm.color;
      const statusLabel = _sm.label;
      const safeId = String(f.id || "").replace(/'/g, "\\'");
      const safeName = String(f.name || "").replace(/'/g, "\\'");

      // 교육지원 운영 규칙 연결 여부
      const mappedPolicy =
        typeof SERVICE_POLICIES !== "undefined"
          ? SERVICE_POLICIES.find((p) => {
              const list1 = p.formIds || [];
              const list2 = p.stage_form_ids
                ? Object.values(p.stage_form_ids)
                : [];
              const list3 = p.formSets ? Object.values(p.formSets) : [];
              const list4 = p.stageFormIds ? Object.values(p.stageFormIds) : [];
              return [...list1, ...list2, ...list3, ...list4].includes(f.id);
            })
          : null;
      const isMapped = !!mappedPolicy;

      return `
<tr style="border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .12s"
    onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''"
    onclick="event.stopPropagation();fbOpenBuilderModal('${safeId}')">
  <td style="padding:11px 14px;text-align:center;color:#9CA3AF;font-size:12px">${idx + 1}</td>
  <td style="padding:11px 14px;max-width:200px">
    <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</div>
    ${f.desc ? `<div style="font-size:10px;color:#9CA3AF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.desc}</div>` : ""}
    ${isMapped ? `<span style="font-size:9px;color:#059669;background:#ecfdf5;padding:1px 6px;border-radius:4px">🔒 ${mappedPolicy.name}</span>` : ""}
  </td>
  <td style="padding:11px 14px">
    <span style="font-size:10px;font-weight:900;padding:3px 8px;border-radius:6px;background:${s.bg};color:${s.color};white-space:nowrap">${s.icon} ${s.label.split("(")[0].trim()}</span>
  </td>
  <td style="padding:11px 14px;font-size:11px;color:#374151">
    <div style="font-weight:700">${purposeLabel}</div>
    ${f.eduType ? `<div style="color:#9CA3AF;font-size:10px;margin-top:2px">${f.eduType}${f.eduSubType ? " / " + f.eduSubType : ""}</div>` : ""}
  </td>
  <td style="padding:11px 14px;text-align:center;font-size:11px;color:#6B7280">📋 ${fields.length}</td>
  <td style="padding:11px 14px;text-align:center">
    <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:${statusBg};color:${statusColor}">${statusLabel}</span>
  </td>
  <td style="padding:8px 10px;text-align:center">
    <div style="display:flex;gap:3px;justify-content:center;align-items:center;flex-wrap:nowrap">
      <button onclick="event.stopPropagation();fbPreviewForm('${safeId}')" title="미리보기"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151;white-space:nowrap">🔍 미리보기</button>
      <button onclick="event.stopPropagation();fbOpenBuilderModal('${safeId}')" title="수정"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151;white-space:nowrap">✏️ 수정</button>
      <button onclick="event.stopPropagation();fbCopyForm('${safeId}')" title="복사"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #DDD6FE;background:#F5F3FF;cursor:pointer;font-weight:700;color:#7C3AED;white-space:nowrap">📋 복사</button>
      ${
        _fStatus !== "published"
          ? `<button onclick="event.stopPropagation();fbDeployForm('${safeId}')" title="배포하기"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #059669;background:#F0FDF4;cursor:pointer;font-weight:700;color:#059669;white-space:nowrap">🚀 배포</button>`
          : ""
      }
      <button onclick="event.stopPropagation();fbToggleActive('${safeId}')" title="${_fStatus === "published" ? "보관하기" : _fStatus === "archived" ? "초안으로 복원" : ""}"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid ${_fStatus === "published" ? "#F59E0B" : "#059669"};background:white;cursor:pointer;font-weight:700;color:${_fStatus === "published" ? "#F59E0B" : "#059669"};white-space:nowrap">${_fStatus === "published" ? "📦 보관" : _fStatus === "archived" ? "📝 복원" : ""}</button>
      <button ${isMapped ? `disabled title="${mappedPolicy.name} 정책 연결 중"` : `onclick="event.stopPropagation();fbDeleteForm('${safeId}')"`}
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid ${isMapped ? "#E5E7EB" : "#FECACA"};background:${isMapped ? "#F9FAFB" : "#FEF2F2"};color:${isMapped ? "#9CA3AF" : "#DC2626"};cursor:${isMapped ? "not-allowed" : "pointer"};font-weight:700">🗑️</button>
    </div>
  </td>
</tr>`;
    })
    .join("");

  const tableHtml =
    allForms.length > 0
      ? `
<div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:8px">양식 목록 (${allForms.length}개)</div>
<div style="overflow-x:auto;border:1px solid #E5E7EB;border-radius:12px;background:#fff">
  <table style="width:100%;border-collapse:collapse">
    <thead>${tableHeader}</thead>
    <tbody>${formRows}</tbody>
  </table>
</div>`
      : `
<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:16px;border:1px dashed #D1D5DB">
  <div style="font-size:32px;margin-bottom:8px">📭</div>
  <div style="font-size:14px;font-weight:700;color:#374151">등록된 양식이 없습니다</div>
  <div style="font-size:12px;color:#9CA3AF;margin-top:4px">새 양식 만들기 버튼으로 첫 양식을 추가하세요</div>
</div>`;

  return addBtn + summaryBar + tableHtml;
}

// 단계별 미니 배지 세트 (계획N / 신청N / 결과N)
function _fbStageMiniSet(forms) {
  return Object.entries(FORM_STAGE_TYPES)
    .map(([k, v]) => {
      const cnt = forms.filter((f) => f.type === k).length;
      if (cnt === 0) return "";
      return `<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:${v.bg};color:${v.color};font-weight:800;border:1px solid ${v.color}30">${v.icon.trim()} ${v.label.split("(")[0].replace("교육", "").trim()} ${cnt}</span>`;
    })
    .join(" ");
}

function _fbFormCard(f) {
  const s = FORM_STAGE_TYPES[f.type] || FORM_STAGE_TYPES.apply;
  const fields = f.fields || [];
  const fieldNames = fields
    .map((fld) => (typeof fld === "object" ? fld.key : fld))
    .join(", ");

  // 교육지원 운영 규칙 및 구버전 서비스 매핑 확인
  const mappedPolicy =
    typeof SERVICE_POLICIES !== "undefined"
      ? SERVICE_POLICIES.find((p) => {
          const list1 = p.formIds || [];
          const list2 = p.stage_form_ids ? Object.values(p.stage_form_ids) : [];
          const list3 = p.formSets ? Object.values(p.formSets) : [];
          const list4 = p.stageFormIds ? Object.values(p.stageFormIds) : [];
          return [...list1, ...list2, ...list3, ...list4].includes(f.id);
        })
      : null;
  const isMapped = !!mappedPolicy;
  const mapName = mappedPolicy ? mappedPolicy.name : "";

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
    ${s.icon} ${s.label.split("(")[0].trim()}
  </span>
  <!-- 양식명 -->
  <span style="flex:1;font-size:12px;font-weight:800;color:#111827;overflow:hidden;
               text-overflow:ellipsis;white-space:nowrap;cursor:default"
        title="${f.name}${f.desc ? " — " + f.desc : ""}">
    ${f.name}
    ${isMapped ? ` <span style="font-size:10px;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;vertical-align:middle;margin-left:6px" title="이 양식은 [${mapName}] 정책에 연동되어 있습니다.">[🔒 ${mapName} 연결됨]</span>` : ""}
  </span>
  <!-- 필드 수 -->
  <span title="포함 필드: ${fieldNames}"
        style="flex-shrink:0;font-size:10px;color:#6B7280;background:#F3F4F6;
               padding:2px 8px;border-radius:10px;cursor:default;white-space:nowrap">
    📋 ${fields.length}개 필드
  </span>
  <!-- 활성 상태 -->
  <span class="bo-badge ${f.active ? "bo-badge-green" : "bo-badge-gray"}" style="flex-shrink:0">
    ${f.active ? "활성" : "비활성"}
  </span>
  <!-- 액션 버튼 -->
  <div style="display:flex;gap:4px;flex-shrink:0">
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbPreviewForm('${f.id}')">🔍 미리보기</button>
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbOpenBuilderModal('${f.id}')">✏️ 수정</button>
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbCopyForm('${f.id}')" style="color:#7C3AED;border-color:#DDD6FE">📋 복사</button>
    <button onclick="fbToggleActive('${f.id}')"
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${f.active ? "#F59E0B" : "#059669"};
             background:#fff;color:${f.active ? "#F59E0B" : "#059669"};font-size:10px;font-weight:800;cursor:pointer">
      ${f.active ? "비활성화" : "활성화"}
    </button>
    <button ${isMapped ? `disabled title="${mapName} 정책에 연결되어 삭제할 수 없습니다."` : `onclick="fbDeleteForm('${f.id}')"`}
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${isMapped ? "#E5E7EB" : "#EF4444"};
             background:#fff;color:${isMapped ? "#9CA3AF" : "#EF4444"};font-size:10px;font-weight:800;cursor:${isMapped ? "not-allowed" : "pointer"}">
      삭제
    </button>
  </div>
</div>`;
}

async function fbDeleteForm(formId) {
  if (!confirm("정말로 이 양식을 삭제하시겠습니까? (삭제 후 복구 불가)"))
    return;

  // 1) 메모리 삭제
  if (typeof FORM_MASTER !== "undefined") {
    const idx = FORM_MASTER.findIndex((x) => x.id === formId);
    if (idx > -1) FORM_MASTER.splice(idx, 1);
  }

  // 2) DB 삭제
  if (typeof sbDeleteFormTemplate === "function") {
    const ok = await sbDeleteFormTemplate(formId);
    if (!ok) {
      console.warn("[FormBuilder] DB 삭제 실패 - 메모리에서만 삭제되었습니다.");
    }
  }

  // 3) UI 갱신
  renderFormBuilderMenu();
}

// ── 빌더 상세페이지 ──────────────────────────────────────────────────────────
let _fbDragIdx = -1; // DnD 상태

function fbOpenBuilderModal(formId) {
  _fbEditId = formId || null;
  const form = formId ? FORM_MASTER.find((f) => f.id === formId) : null;
  _fbTempFields = form
    ? (form.fields || []).map((f) => {
        if (typeof f === "object")
          return {
            key: f.key,
            scope: f.scope || "front",
            required: f.required === true,
          };
        return { key: f, scope: "front", required: false };
      })
    : [];
  // DB에서 필드 카탈로그 로드 (비동기)
  _fbLoadFieldCatalog()
    .then(() => {
      // locked 필드 자동 보장: 목록에 없으면 맨 앞에 삽입
      const lockedFields = _fbAllFields().filter((f) => f.locked);
      lockedFields.reverse().forEach((lf) => {
        const exists = _fbTempFields.some(
          (tf) => (typeof tf === "object" ? tf.key : tf) === lf.key
        );
        if (!exists) {
          _fbTempFields.unshift({ key: lf.key, scope: lf.scope || "front", required: true });
        }
      });
      document.getElementById("bo-content").innerHTML = _fbEditorPage(form);
    })
    .catch(() => {
      document.getElementById("bo-content").innerHTML = _fbEditorPage(form);
    });
}

function fbCloseEditor() {
  renderFormBuilderMenu();
}

function _fbEditorPage(form) {
  const nameVal = form?.name || "";
  const typeVal = form?.type || "apply";
  const descVal = form?.desc || "";
  const purposeVal = form?.purpose || "";
  const eduTypeVal = form?.eduType || "";
  const eduSubVal = form?.eduSubType || "";

  // 목적 연동 교육유형 목록
  const eduTypesMap = purposeVal ? FORM_EDU_TYPES[purposeVal] || [] : [];
  const selEduType = eduTypesMap.find((t) => t.type === eduTypeVal) || null;
  // 사용대상: 기존 form.purpose에서 유추하거나 form.targetUser에서 읽음
  const targetUser =
    form?.targetUser ||
    (purposeVal ? FORM_PURPOSE_TYPES[purposeVal]?.targetUser || "" : "");

  // 카테고리별 필드 그룹 (L1 + L2 통합)
  const allFields = _fbAllFields();
  const categories = [...new Set(allFields.map((f) => f.category))];

  const titleText = form ? `'${form.name}' 편집` : "새 양식 만들기";

  // 소속 정보 명시화 (회사 > 제도그룹)
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const tenantName = tenants.find((t) => t.id === _fbTenantId)?.name || _fbTenantId || "현대자동차";
  const groupName = _fbGroupId ? _fbTplList.find((x) => x.id === _fbGroupId)?.name || _fbGroupId : "전사 공용 (모든 제도그룹)";

  return `
<div class="bo-fade">
<!-- 상단 헤더 -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px">
    <button onclick="fbCloseEditor()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#6B7280" title="목록으로">←</button>
    <h2 style="margin:0;font-size:18px;font-weight:900;color:#111827">${titleText}</h2>
  </div>
  <div style="display:flex;gap:8px">
    <button class="bo-btn-secondary" onclick="fbCloseEditor()" style="padding:8px 18px;font-size:13px">취소</button>
    <button class="bo-btn-primary" onclick="fbSaveForm()" style="padding:8px 22px;font-size:13px">💾 임시저장</button>
    <button onclick="fbSaveAndDeploy()" style="padding:8px 22px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.3)">🚀 배포하기</button>
  </div>
</div>
<!-- 양식 소속 정보 패널 (Scope Awareness) -->
<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;margin-bottom:16px">
  <span style="font-size:11px;font-weight:900;color:#475569">📌 양식 소속 범위:</span>
  <div style="display:flex;align-items:center;gap:6px">
    <span style="font-size:12px;font-weight:800;color:#0F172A">🏢 ${tenantName}</span>
    <span style="color:#94A3B8;font-size:14px;font-weight:900">></span>
    <span style="font-size:12px;font-weight:800;color:${_fbGroupId ? "#1D4ED8" : "#059669"}">${_fbGroupId ? `🎯 ${groupName}` : "🌐 전사 공용"}</span>
  </div>
</div>
<!-- 서비스 유형 선택 (직접학습 / 교육운영) -->
<div style="margin-bottom:12px">
  <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px;color:#374151">서비스 유형 *</label>
  <div style="display:flex;gap:8px">
    <label id="fb-target-learner-lbl" onclick="_fbOnTargetUserChange('learner')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser === "learner" ? "#059669" : "#E5E7EB"};
             background:${targetUser === "learner" ? "#F0FDF4" : "#F9FAFB"}">
      <input type="radio" name="fb-target-user" value="learner" ${targetUser === "learner" ? "checked" : ""}
             style="accent-color:#059669;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser === "learner" ? "#059669" : "#6B7280"}">📚 직접학습</span>
      <span style="font-size:10px;color:#9CA3AF">(개인 신청)</span>
    </label>
    <label id="fb-target-admin-lbl" onclick="_fbOnTargetUserChange('admin')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser === "admin" ? "#7C3AED" : "#E5E7EB"};
             background:${targetUser === "admin" ? "#F5F3FF" : "#F9FAFB"}">
      <input type="radio" name="fb-target-user" value="admin" ${targetUser === "admin" ? "checked" : ""}
             style="accent-color:#7C3AED;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser === "admin" ? "#7C3AED" : "#6B7280"}">🎯 교육운영</span>
      <span style="font-size:10px;color:#9CA3AF">(운영 관리)</span>
    </label>
  </div>
</div>
<!-- 행 1: 단계 + 목적 -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">단계 *</label>
    <select id="fb-type" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      ${Object.entries(FORM_STAGE_TYPES)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${typeVal === k ? "selected" : ""}>${v.icon} ${v.label.split(" ")[0]}</option>`,
        )
        .join("")}
    </select>
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">목적</label>
    <select id="fb-purpose" onchange="_fbOnPurposeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${Object.entries(FORM_PURPOSE_TYPES)
        .filter(([k, v]) => !targetUser || v.targetUser === targetUser)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${purposeVal === k ? "selected" : ""}>${v.icon} ${v.label}</option>`,
        )
        .join("")}
    </select>
  </div>
</div>
<!-- 행 2: 교육유형 + 세부유형 (목적 선택 시 표시) -->
<div id="fb-edutypes-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;${purposeVal && eduTypesMap.length > 0 ? "" : "display:none"}"
  class="${purposeVal && eduTypesMap.length > 0 ? "" : "d-none"}">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">교육유형</label>
    <select id="fb-edu-type" onchange="_fbOnEduTypeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${eduTypesMap.map((t) => `<option value="${t.type}" ${eduTypeVal === t.type ? "selected" : ""}>${t.type}</option>`).join("")}
    </select>
  </div>
  <div id="fb-sub-col">
    ${
      selEduType && selEduType.sub.length > 0
        ? `
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">세부유형</label>
    <select id="fb-edu-sub"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${selEduType.sub.map((s) => `<option value="${s}" ${eduSubVal === s ? "selected" : ""}>${s}</option>`).join("")}
    </select>`
        : "<div></div>"
    }
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

<!-- 필드 빌더 영역 (2패널: 팔레트 40% / 선택 60%) -->
<div style="border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#F9FAFB;padding:10px 16px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:800;color:#374151;display:flex;align-items:center;gap:6px">
    📋 입력 필드 구성 <span style="font-size:10px;color:#9CA3AF;font-weight:500">— 카테고리 순서 고정 | ON/OFF 및 필수 토글로 설정</span>
  </div>
  <div style="display:grid;grid-template-columns:2fr 3fr;min-height:320px">
    <!-- 좌: 필드 팔레트 -->
    <div style="padding:16px;border-right:1px solid #E5E7EB;overflow-y:auto;max-height:520px">
      <div style="font-size:10px;color:#6B7280;font-weight:800;margin-bottom:8px">사용 가능 필드 (카테고리별)</div>
      ${categories
        .map((cat) => {
          const catFields = allFields.filter((f) => f.category === cat);
          const catColor = cat.includes("승인")
            ? "#9D174D"
            : cat === "시스템"
              ? "#0369A1"
              : "#374151";
          return `<div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:900;color:${catColor};text-transform:uppercase;margin-bottom:6px;letter-spacing:.05em">${cat}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${catFields
              .map((f) => {
                const isSelected = _fbTempFields.some(
                  (tf) => (typeof tf === "object" ? tf.key : tf) === f.key,
                );
                const scopeStyle =
                  f.scope === "provide"
                    ? "border:1.5px dashed #93C5FD;color:#1D4ED8;background:#EFF6FF"
                    : f.scope === "back"
                      ? "border:1.5px dashed #FBB6CE;color:#9D174D;background:#FDF2F8"
                      : f.scope === "system"
                        ? "border:1.5px dashed #BFDBFE;color:#0369A1;background:#EFF6FF"
                        : "border:1.5px solid #E5E7EB;color:#374151;background:white";
                const layerBadge =
                  f.layer === "L2"
                    ? '<span style="font-size:7px;vertical-align:super;color:#D97706;font-weight:900">L2</span>'
                    : "";
                const selectBadge =
                  f.fieldType === "select" || f.fieldType === "multi_select"
                    ? '<span style="font-size:7px;vertical-align:super;color:#7C3AED">▼</span>'
                    : "";
                // 잠금 필드(locked): 항상 ON, 토글 불가
                // 종속 필드(dependsOn): 부모 필드에 종속 — 독립 ON/OFF 없음
                const isLocked = !!f.locked;
                const hasDep = !!f.dependsOn;
                const isDepActive = hasDep
                  ? _fbTempFields.some(tf => (typeof tf === "object" ? tf.key : tf) === f.dependsOn)
                  : true;
                const canToggle = !isLocked && !hasDep;
                const toggleLabel = isLocked ? "🔒" : hasDep ? "↳" : isSelected ? "ON" : "OFF";
                const toggleBg = isSelected ? "#059669" : isLocked ? "#6B7280" : "#E5E7EB";
                const toggleColor = isSelected || isLocked ? "white" : "#6B7280";
                const depNote = hasDep ? `<span style="font-size:9px;color:#9CA3AF;margin-left:4px">${f.dependsOn} 켜면 자동</span>` : "";
                return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:4px;
                            background:${isSelected ? "#F0FDF4" : hasDep && !isDepActive ? "#F9FAFB" : "white"};
                            border:1.5px solid ${isSelected ? "#6EE7B7" : "#E5E7EB"};
                            opacity:${hasDep && !isDepActive ? "0.45" : "1"}"
                     id="fbf-${f.key}" title="${f.hint || ""}">
                  <span style="font-size:13px">${f.icon}</span>
                  <span style="flex:1;font-size:12px;font-weight:${isLocked ? "900" : "700"};color:${isLocked ? "#374151" : "#111827"}">
                    ${f.key}${isLocked ? " 🔒" : ""}${f.required && isSelected ? "<sup style='color:#EF4444'>*</sup>" : ""}
                    ${depNote}
                  </span>
                  <button onclick="event.stopPropagation();${canToggle ? `fbToggleField('${f.key}')` : ""}"
                    style="min-width:38px;padding:3px 8px;border-radius:6px;border:none;font-size:10px;font-weight:800;
                           background:${toggleBg};color:${toggleColor};cursor:${canToggle ? "pointer" : "default"}"
                    ${!canToggle ? "disabled" : ""}>${toggleLabel}</button>
                </div>`;
              })
              .join("")}
          </div>
        </div>`;
        })
        .join("")}
    </div>
    <!-- 우: 선택된 필드 목록 -->
    <div style="padding:16px;overflow-y:auto;max-height:520px;background:#FAFAFA">
      <div style="font-size:11px;color:#6B7280;font-weight:800;margin-bottom:10px">
        선택된 필드 (${_fbTempFields.length}개) <span style="font-size:9px;font-weight:400;color:#9CA3AF">순서 고정 | 필수/선택 토글로 설정</span>
      </div>
      <div id="fb-preview">${_fbPreviewHTML()}</div>
    </div>
  </div>
</div>
</div>`;
}

function _fbPreviewHTML() {
  if (!_fbTempFields.length)
    return '<div style="text-align:center;color:#D1D5DB;padding:40px;font-size:13px">← 왼쪽에서 필드를 클릭하여 추가</div>';
  const allFields = _fbAllFields();
  return _fbTempFields
    .map((f, i) => {
      const key = typeof f === "object" ? f.key : f;
      const scope = typeof f === "object" ? f.scope : "front";
      const isReq = typeof f === "object" ? f.required === true : false;
      const meta = allFields.find((a) => a.key === key) || { icon: "📝" };
      const scopeLabel =
        scope === "provide"
          ? "📢 BO제공"
          : scope === "back"
            ? "🔒 백오피스"
            : scope === "system"
              ? "⚙️ 시스템"
              : "🔓 프론트";
      const scopeColor =
        scope === "provide"
          ? "#1D4ED8"
          : scope === "back"
            ? "#9D174D"
            : scope === "system"
              ? "#0369A1"
              : "#374151";
      const reqColor = isReq ? "#DC2626" : "#9CA3AF";
      const reqLabel = isReq ? "필수" : "선택";
      const reqBg = isReq ? "#FEF2F2" : "#F9FAFB";
      const typeTag =
        meta.fieldType === "select" || meta.fieldType === "multi_select"
          ? `<span style="font-size:8px;color:#7C3AED;background:#F5F3FF;padding:1px 5px;border-radius:3px;margin-left:2px">▼${(meta.options || []).length}개</span>`
          : "";
      const layerTag =
        meta.layer === "L2"
          ? '<span style="font-size:8px;color:#D97706;background:#FFFBEB;padding:1px 5px;border-radius:3px;margin-left:2px">L2</span>'
          : "";
      const depTag = meta.predecessors?.length
        ? '<span style="font-size:8px;color:#059669;background:#ECFDF5;padding:1px 5px;border-radius:3px;margin-left:2px">⚡</span>'
        : "";
      // locked 필드: 잠금 배지 + 삭제 불가, dependsOn 필드: 종속 표시
      const metaLocked = meta.locked === true;
      const metaDep = meta.dependsOn || null;
      return `<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid ${metaLocked ? "#6EE7B7" : "#E5E7EB"};transition:border-color .15s"
              onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='${metaLocked ? "#6EE7B7" : "#E5E7EB"}'">
        <span style="color:#9CA3AF;font-weight:700;font-size:11px;min-width:22px;text-align:center">${meta.order || (i + 1)}</span>
        <span style="font-size:13px;font-weight:700;flex:1;color:#111827">${meta.icon} ${key}${typeTag}${layerTag}${depTag}
          ${metaDep ? `<span style="font-size:9px;color:#9CA3AF;margin-left:4px">← ${metaDep}</span>` : ""}
        </span>
        <span onclick="event.stopPropagation();${metaLocked ? "" : `fbToggleRequired(${i})`}"
          style="font-size:9px;font-weight:800;color:${metaLocked ? "#6B7280" : reqColor};background:${metaLocked ? "#F3F4F6" : reqBg};padding:2px 8px;border-radius:5px;cursor:${metaLocked ? "default" : "pointer"};white-space:nowrap;border:1px solid ${metaLocked ? "#E5E7EB" : reqColor + "30"}"
          title="${metaLocked ? "잠금 필드 — 항상 필수" : "클릭하여 필수/선택 전환"}">${metaLocked ? "🔒 필수" : reqLabel}</span>
        <span style="font-size:9px;font-weight:700;color:${scopeColor};background:${scopeColor}15;padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap"
          onclick="event.stopPropagation();fbCycleScope(${i})" title="클릭하여 입력 주체 변경">${scopeLabel}</span>
        ${metaLocked ? `<span style="color:#D1D5DB;font-size:14px;cursor:not-allowed" title="잠금 필드는 제거할 수 없습니다">🔒</span>`
          : `<span onclick="event.stopPropagation();fbRemoveField('${key}')" style="cursor:pointer;color:#EF4444;font-size:16px;line-height:1;font-weight:700" title="삭제">×</span>`}
      </div>`;
    })
    .join("");
}

// ─── DnD 핸들러 ──────────────────────────────────────────────────────────────
function _fbDragStart(idx, e) {
  _fbDragIdx = idx;
  e.dataTransfer.effectAllowed = "move";
  e.target.style.opacity = "0.4";
}

function _fbDragOver(idx, e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  // 삽입선 표시
  const items = document.querySelectorAll("#fb-preview > div");
  items.forEach((el, i) => {
    el.style.borderTop =
      i === idx && idx < _fbDragIdx ? "2px solid #2563EB" : "";
    el.style.borderBottom =
      i === idx && idx > _fbDragIdx ? "2px solid #2563EB" : "";
  });
}

function _fbDrop(toIdx, e) {
  e.preventDefault();
  if (_fbDragIdx < 0 || _fbDragIdx === toIdx) return;
  const item = _fbTempFields.splice(_fbDragIdx, 1)[0];
  _fbTempFields.splice(toIdx, 0, item);
  _fbDragIdx = -1;
  _fbRefreshPreview();
}

function _fbDragEnd() {
  _fbDragIdx = -1;
  const items = document.querySelectorAll("#fb-preview > div");
  items.forEach((el) => {
    el.style.opacity = "1";
    el.style.borderTop = "";
    el.style.borderBottom = "";
  });
}

function fbToggleField(key) {
  const allFields = _fbAllFields();
  const meta = allFields.find((a) => a.key === key);
  // 잠금 필드: ON/OFF 불가
  if (meta?.locked) return;
  // 종속 필드: 부모가 OFF면 ON 불가
  if (meta?.dependsOn) {
    const parentOn = _fbTempFields.some(
      (tf) => (typeof tf === "object" ? tf.key : tf) === meta.dependsOn
    );
    if (!parentOn) {
      _fbShowToast(`"${key}" 필드는 "${meta.dependsOn}"이 켜져 있어야 사용할 수 있습니다.`);
      return;
    }
  }
  const idx = _fbTempFields.findIndex(
    (f) => (typeof f === "object" ? f.key : f) === key,
  );
  if (idx > -1) {
    // OFF: 이 필드를 선행 조건으로 가지는 후행 필드가 남아 있으면 차단
    const blocked = _fbCheckDeleteBlocked(key);
    if (blocked) {
      alert(
        `[의존성 규칙] "${key}" 필드를 끌 수 없습니다.\n다음 필드가 의존하고 있습니다:\n${blocked.join(", ")}\n\n먼저 해당 필드를 OFF로 설정해 주세요.`,
      );
      return;
    }
    _fbTempFields.splice(idx, 1);
  } else {
    _fbTempFields.push({
      key,
      scope: meta?.scope || "front",
      required: meta?.required || false,
    });
  }
  _fbRefreshPreview();
}

// ── 필수/선택 토글 ───────────────────────────────────────────────────────────────
function fbToggleRequired(idx) {
  if (typeof _fbTempFields[idx] === "object") {
    _fbTempFields[idx].required = !_fbTempFields[idx].required;
  } else {
    _fbTempFields[idx] = {
      key: _fbTempFields[idx],
      scope: "front",
      required: true,
    };
  }
  _fbRefreshPreview();
}

// ── 의존성: 선행 필드 자동 추가 ───────────────────────────────────────────────────
function _fbAutoAddPredecessors(key) {
  const allFields = _fbAllFields();
  const meta = allFields.find((a) => a.key === key);
  const preds = meta?.predecessors || [];
  const added = [];
  preds.forEach((predKey) => {
    const already = _fbTempFields.some(
      (tf) => (typeof tf === "object" ? tf.key : tf) === predKey,
    );
    if (!already) {
      const predMeta = allFields.find((a) => a.key === predKey);
      _fbTempFields.push({
        key: predKey,
        scope: predMeta?.scope || "front",
        required: predMeta?.required || false,
      });
      added.push(predKey);
    }
  });
  if (added.length > 0) {
    _fbShowToast(
      `ⓘ "${key}"의 선행 필드 [${added.join(", ")}]가 자동 추가되었습니다.`,
    );
  }
}

// ── 의존성: 삭제 차단 검사 ────────────────────────────────────────────────────────
function _fbCheckDeleteBlocked(key) {
  const allFields = _fbAllFields();
  const dependents = [];
  _fbTempFields.forEach((tf) => {
    const tfKey = typeof tf === "object" ? tf.key : tf;
    const meta = allFields.find((a) => a.key === tfKey);
    if (meta?.predecessors?.includes(key)) {
      dependents.push(tfKey);
    }
  });
  return dependents.length > 0 ? dependents : null;
}

// ── 토스트 알림 ──────────────────────────────────────────────────────────────────
function _fbShowToast(msg) {
  const toast = document.createElement("div");
  toast.style.cssText =
    "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1F2937;color:white;padding:12px 24px;border-radius:10px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,0.3);animation:fadeInUp .3s ease";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity .3s";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function fbRemoveField(key) {
  // 잠금 필드 보호
  const allFields = _fbAllFields();
  const meta = allFields.find((a) => a.key === key);
  if (meta?.locked) {
    _fbShowToast(`"${key}"은 잠금 필드입니다 — 제거할 수 없습니다.`);
    return;
  }
  // 의존성 차단 검사
  const blocked = _fbCheckDeleteBlocked(key);
  if (blocked) {
    alert(
      `[의존성 규칙] "${key}" 필드를 끌 수 없습니다.\n다음 필드가 의존하고 있습니다:\n${blocked.join(", ")}\n\n먼저 해당 필드를 OFF로 설정해 주세요.`,
    );
    return;
  }
  const idx = _fbTempFields.findIndex(
    (f) => (typeof f === "object" ? f.key : f) === key,
  );
  if (idx > -1) _fbTempFields.splice(idx, 1);
  _fbRefreshPreview();
}

function fbAddAttach() {
  const list = document.getElementById("fb-attach-list");
  if (!list) return;
  const idx = list.querySelectorAll("[data-attach-idx]").length;
  const row = document.createElement("div");
  row.id = `fb-attach-row-${idx}`;
  row.style.cssText =
    "display:flex;align-items:center;gap:6px;margin-bottom:5px";
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
  const current =
    typeof _fbTempFields[idx] === "object" ? _fbTempFields[idx].scope : "front";
  const order = ["front", "provide", "back", "system"];
  const next = order[(order.indexOf(current) + 1) % order.length];
  if (typeof _fbTempFields[idx] === "object") _fbTempFields[idx].scope = next;
  else _fbTempFields[idx] = { key: _fbTempFields[idx], scope: next };
  _fbRefreshPreview();
}

function _fbRefreshPreview() {
  const el = document.getElementById("fb-preview");
  if (el) el.innerHTML = _fbPreviewHTML();
  // 팔레트 selected 상태 갱신 (L1 + L2 통합)
  _fbAllFields().forEach((f) => {
    const chip = document.getElementById(`fbf-${f.key}`);
    if (chip) {
      const isSelected = _fbTempFields.some(
        (tf) => (typeof tf === "object" ? tf.key : tf) === f.key,
      );
      chip.classList.toggle("selected", isSelected);
      chip.style.opacity = isSelected ? ".45" : "1";
      chip.style.textDecoration = isSelected ? "line-through" : "none";
    }
  });
}

// 목적 변경 시 교육유형 행 토글
function _fbOnPurposeChange(purposeKey) {
  const row = document.getElementById("fb-edutypes-row");
  const etSel = document.getElementById("fb-edu-type");
  const subCol = document.getElementById("fb-sub-col");
  if (!row || !etSel) return;

  const types = FORM_EDU_TYPES[purposeKey] || [];
  if (types.length === 0) {
    row.style.display = "none";
    return;
  }
  row.style.display = "grid";
  etSel.innerHTML =
    '<option value="">— 선택 —</option>' +
    types.map((t) => `<option value="${t.type}">${t.type}</option>`).join("");
  if (subCol) subCol.innerHTML = "<div></div>";
}

// 사용대상 변경 시 목적 드롭다운 필터링
function _fbOnTargetUserChange(targetUser) {
  // 라디오 버튼 시각적 업데이트
  ["learner", "admin"].forEach((t) => {
    const lbl = document.getElementById(`fb-target-${t}-lbl`);
    if (!lbl) return;
    const isActive = t === targetUser;
    const color = t === "learner" ? "#059669" : "#7C3AED";
    lbl.style.border = `2px solid ${isActive ? color : "#E5E7EB"}`;
    lbl.style.background = isActive
      ? t === "learner"
        ? "#F0FDF4"
        : "#F5F3FF"
      : "#F9FAFB";
    const span = lbl.querySelector("span");
    if (span) span.style.color = isActive ? color : "#6B7280";
  });
  // 목적 드롭다운 필터링
  const purposeSel = document.getElementById("fb-purpose");
  if (!purposeSel) return;
  const currentPurpose = purposeSel.value;
  purposeSel.innerHTML =
    '<option value="">— 선택 —</option>' +
    Object.entries(FORM_PURPOSE_TYPES)
      .filter(([k, v]) => v.targetUser === targetUser)
      .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`)
      .join("");
  // 이전 선택이 새 목록에 있으면 복원
  if (FORM_PURPOSE_TYPES[currentPurpose]?.targetUser === targetUser) {
    purposeSel.value = currentPurpose;
  } else {
    // 목적이 바뀌었으면 교육유형 행 숨기기
    _fbOnPurposeChange("");
  }
}

// 교육유형 변경 시 세부유형 목록 갱신
function _fbOnEduTypeChange(typeVal) {
  const purposeKey = document.getElementById("fb-purpose")?.value || "";
  const types = FORM_EDU_TYPES[purposeKey] || [];
  const selT = types.find((t) => t.type === typeVal);
  const subCol = document.getElementById("fb-sub-col");
  if (!subCol) return;
  if (selT && selT.sub.length > 0) {
    subCol.innerHTML = `
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">세부유형</label>
      <select id="fb-edu-sub" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        <option value="">— 선택 —</option>
        ${selT.sub.map((s) => `<option value="${s}">${s}</option>`).join("")}
      </select>`;
  } else {
    subCol.innerHTML = "<div></div>";
  }
}

async function fbSaveForm() {
  const tenantId = boCurrentPersona.tenantId || "HMC";
  const type = document.getElementById("fb-type").value;
  const name = document.getElementById("fb-name").value.trim();
  const desc = document.getElementById("fb-desc").value.trim();
  const purpose = document.getElementById("fb-purpose")?.value || "";
  const eduType = document.getElementById("fb-edu-type")?.value || "";
  const eduSubType = document.getElementById("fb-edu-sub")?.value || "";
  const targetUser =
    document.querySelector('input[name="fb-target-user"]:checked')?.value || "";

  // 기존 noticeText/attachments 보존 (상세페이지에서 제거됨)
  const existingForm = _fbEditId
    ? FORM_MASTER.find((x) => x.id === _fbEditId)
    : null;
  const noticeText = existingForm?.noticeText || "";
  const attachments = existingForm?.attachments || [];

  if (!name) {
    alert("양식명은 필수입니다.");
    return;
  }
  if (_fbTempFields.length === 0) {
    alert("최소 1개 이상의 필드를 추가해주세요.");
    return;
  }

  const formId = _fbEditId || "FM" + Date.now();
  // 기존 양식의 상태/버전 정보 보존
  const prevVersion = existingForm?.version || 0;
  const prevStatus = existingForm?.status || "draft";
  const formData = {
    id: formId,
    tenantId,
    domainId: _fbGroupId || null,
    accountCode: null, // 범용 양식을 위해 계정 종속 완전 해제 (null 고정)
    type,
    name,
    desc,
    status: "draft",
    active: false,
    version: prevVersion || 1,
    publishedFields: existingForm?.publishedFields || [],
    publishedAt: existingForm?.publishedAt || null,
    publishedBy: existingForm?.publishedBy || null,
    fields: [..._fbTempFields],
    purpose,
    eduType,
    eduSubType,
    targetUser,
    noticeText,
    attachments,
  };

  // 1) 메모리 FORM_MASTER 업데이트
  if (_fbEditId) {
    const idx = FORM_MASTER.findIndex((x) => x.id === _fbEditId);
    if (idx > -1) FORM_MASTER[idx] = { ...FORM_MASTER[idx], ...formData };
    else FORM_MASTER.push(formData);
  } else {
    FORM_MASTER.push(formData);
  }

  // 2) DB 저장 (upsert)
  if (typeof sbSaveFormTemplate === "function") {
    const ok = await sbSaveFormTemplate(formData);
    if (!ok) {
      console.warn("[FormBuilder] DB 저장 실패 - 메모리에만 저장됨");
    }
  }

  _fbCurrentTab = "library";
  fbCloseEditor();
}

// ━━━ 양식 복사 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.fbCopyForm = function (formId) {
  const origin = FORM_MASTER.find((f) => f.id === formId);
  if (!origin) return alert("원본 양식을 찾을 수 없습니다.");

  // 복사 이름 입력 모달
  const existingModal = document.getElementById("fb-copy-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "fb-copy-modal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9300;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
<div style="background:#fff;border-radius:16px;width:480px;box-shadow:0 20px 60px rgba(0,0,0,.25);overflow:hidden">
  <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;background:#F5F3FF;display:flex;justify-content:space-between;align-items:center">
    <div>
      <h3 style="margin:0;font-size:15px;font-weight:900;color:#5B21B6">📋 양식 복사</h3>
      <p style="margin:4px 0 0;font-size:11px;color:#7C3AED">복사본은 <b>비활성 상태</b>로 생성되며 정책 연결이 없습니다.</p>
    </div>
    <button onclick="document.getElementById('fb-copy-modal').remove()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#7C3AED">✕</button>
  </div>
  <div style="padding:20px 24px">
    <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#92400E;line-height:1.6">
      <b>⚠️ 복사 규칙</b><br>
      • 복사본은 항상 <b>비활성(검토 대기)</b> 상태로 시작됩니다<br>
      • 교육지원 운영 규칙 연결은 복사되지 않습니다<br>
      • 동일 테넌트 내부 복사만 허용됩니다<br>
      • 필드 구성은 복사 시점의 스냅샷으로 저장됩니다
    </div>
    <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">복사본 이름 <span style="color:#EF4444">*</span></label>
    <input id="fb-copy-name" type="text" value="[복사] ${origin.name.replace(/'/g, "&#39;")}"
      style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #7C3AED;border-radius:8px;font-size:13px;font-weight:700;outline:none">
    <p style="font-size:11px;color:#9CA3AF;margin:6px 0 0">이름은 저장 후에도 언제든지 수정할 수 있습니다.</p>
  </div>
  <div style="padding:14px 24px;border-top:1px solid #F3F4F6;background:#FAFAFA;display:flex;justify-content:flex-end;gap:10px">
    <button onclick="document.getElementById('fb-copy-modal').remove()" style="padding:9px 16px;background:#F1F5F9;border:none;border-radius:8px;font-size:13px;font-weight:800;color:#64748B;cursor:pointer">취소</button>
    <button onclick="fbCopyFormConfirm('${formId}')" style="padding:9px 24px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:900;cursor:pointer">📋 복사 생성</button>
  </div>
</div>`;
  document.body.appendChild(modal);
  // 이름 필드 포커스 + 전체 선택
  setTimeout(() => {
    const inp = document.getElementById("fb-copy-name");
    if (inp) {
      inp.focus();
      inp.select();
    }
  }, 80);
};

window.fbCopyFormConfirm = async function (originId) {
  const origin = FORM_MASTER.find((f) => f.id === originId);
  if (!origin) return alert("원본 양식을 찾을 수 없습니다.");

  const newName = document.getElementById("fb-copy-name")?.value?.trim();
  if (!newName) {
    alert("복사본 이름을 입력해주세요.");
    return;
  }

  // 동일 이름 중복 체크
  const tenantId = boCurrentPersona?.tenantId || origin.tenantId;
  const isDupName = FORM_MASTER.some(
    (f) => f.tenantId === tenantId && f.name === newName,
  );
  if (isDupName) {
    if (
      !confirm(
        `"${newName}" 이름의 양식이 이미 존재합니다.\n그래도 동일 이름으로 복사하시겠습니까?`,
      )
    )
      return;
  }

  // 충돌 방지 신 ID 생성 (ms + 4자리 랜덤)
  const newId =
    "FM_COPY_" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const copyData = {
    ...JSON.parse(JSON.stringify(origin)), // 깊은 복사 (fields[] 배열 포함)
    id: newId,
    tenantId,
    name: newName,
    active: false, // ① 항상 비활성으로 시작
    domainId: _fbGroupId || origin.domainId || null, // ② 현재 필터 기준
    accountCode: origin.accountCode || null,
    _copiedFrom: originId, // ③ 추적용 메타데이터
    _copiedAt: new Date().toISOString(),
  };

  // 메모리 저장
  FORM_MASTER.push(copyData);

  // DB 저장
  let dbOk = false;
  if (typeof sbSaveFormTemplate === "function") {
    dbOk = await sbSaveFormTemplate(copyData);
  }

  document.getElementById("fb-copy-modal")?.remove();

  if (dbOk) {
    _fbShowToast(`✅ "${newName}" 복사 완료 (비활성 상태로 저장됨)`);
  } else {
    _fbShowToast(`⚠️ "${newName}" 복사됨 (DB 저장 실패 — 메모리에만 존재)`);
  }

  _fbCurrentTab = "library";
  renderFormBuilderMenu();
};

// ━━━ 양식 상태 전환 (published→archived, archived→draft, draft→draft) ━━━━━━━━━━━━━
function fbToggleActive(formId) {
  const f = FORM_MASTER.find((x) => x.id === formId);
  if (!f) return;

  const curStatus = f.status || (f.active ? "published" : "draft");

  // 정책 연결 양식은 published→archived 차단
  const linkedPolicies = _fbGetLinkedPolicies(formId);
  if (curStatus === "published" && linkedPolicies.length > 0) {
    if (
      !confirm(
        `⚠ 이 양식은 ${linkedPolicies.length}개 정책에 연결되어 있습니다.\n보관하면 FO에서 양식을 로드할 수 없게 됩니다.\n\n정말 보관하시겠습니까?`,
      )
    )
      return;
  }

  if (curStatus === "published") {
    f.status = "archived";
    f.active = false;
  } else if (curStatus === "archived") {
    f.status = "draft";
    f.active = false;
  }
  // draft → 변경 없음 (배포 버튼 사용)

  // DB 동기화
  if (typeof sbSaveFormTemplate === "function") sbSaveFormTemplate(f);
  renderFormBuilderMenu();
}

// ━━━ 양식 배포 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.fbDeployForm = async function (formId) {
  const f = FORM_MASTER.find((x) => x.id === formId);
  if (!f) return;

  // 1. 정책 연결 확인 + 경고
  const linkedPolicies = _fbGetLinkedPolicies(formId);
  if (linkedPolicies.length > 0) {
    const msg =
      `이 양식은 ${linkedPolicies.length}개 정책에 연결되어 있습니다.\n` +
      linkedPolicies.map((p) => `  • ${p.name}`).join("\n") +
      "\n\n배포하면 즉시 FO에 반영됩니다. 계속하시겠습니까?";
    if (!confirm(msg)) return;
  }

  // 2. 필드 변경 영향도 분석
  const prevFields = f.publishedFields || [];
  const curFields = f.fields || [];
  if (prevFields.length > 0) {
    const deletedKeys = prevFields.filter(
      (pf) =>
        !curFields.find(
          (cf) =>
            (typeof cf === "object" ? cf.key : cf) ===
            (typeof pf === "object" ? pf.key : pf),
        ),
    );
    if (deletedKeys.length > 0) {
      const warn = `⚠ 이전 배포 대비 삭제된 필드:\n  ${deletedKeys.map((k) => (typeof k === "object" ? k.key : k)).join(", ")}\n\n기존 제출 데이터에서 해당 필드가 표시되지 않을 수 있습니다.\n계속 배포하시겠습니까?`;
      if (!confirm(warn)) return;
    }
  }

  // 3. 버전 증가 + 배포
  f.version = (f.version || 0) + 1;
  f.status = "published";
  f.active = true;
  f.publishedAt = new Date().toISOString();
  f.publishedBy = boCurrentPersona?.id || "system";
  f.publishedFields = [...curFields];

  // 4. DB upsert
  if (typeof sbSaveFormTemplate === "function") {
    const ok = await sbSaveFormTemplate(f);
    if (!ok) {
      alert("배포 실패: DB 저장 오류");
      return;
    }
  }
  _fbShowToast(`🚀 "${f.name}" v${f.version} 배포 완료`);
  renderFormBuilderMenu();
};

// ━━━ 에디터에서 저장 후 바로 배포 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.fbSaveAndDeploy = async function () {
  await fbSaveForm(); // draft로 저장
  const formId = _fbEditId;
  if (!formId) return;
  fbDeployForm(formId);
};

// ━━━ 정책 연결 조회 헬퍼 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fbGetLinkedPolicies(formId) {
  if (typeof SERVICE_POLICIES === "undefined") return [];
  return SERVICE_POLICIES.filter((p) => {
    const ids = [];
    if (p.formIds) ids.push(...p.formIds);
    if (p.stage_form_ids)
      Object.values(p.stage_form_ids).forEach((v) => {
        if (Array.isArray(v)) ids.push(...v);
        else if (v) ids.push(v);
      });
    if (p.formSets)
      Object.values(p.formSets).forEach((v) => {
        if (Array.isArray(v)) ids.push(...v);
        else if (v) ids.push(v);
      });
    if (p.stageFormIds)
      Object.values(p.stageFormIds).forEach((v) => {
        if (Array.isArray(v)) ids.push(...v);
        else if (v) ids.push(v);
      });
    return ids.includes(formId);
  });
}

// ─── 양식 미리보기 ─────────────────────────────────────────────────────────────
window._currentPreviewForm = null;

function fbPreviewForm(formId) {
  const form = FORM_MASTER.find((f) => f.id === formId);
  if (!form) return;

  const modalId = "fb-preview-modal";
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "bo-modal-overlay";
    modal.style.zIndex = "9999";
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

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
  document.getElementById("fb-pv-title").textContent =
    `[${form.name}] 양식 미리보기`;

  modal.style.display = "flex";
  fbRenderPreviewBody("front");
}

function _fbFieldInput(fld, poolField, viewType) {
  const ft = poolField.fieldType || "text";
  const hint = poolField.hint || fld.key + " 입력";
  const base =
    "width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB;";

  // FO에서 BO전용 필드는 읽기전용 표시
  const isReadOnly = viewType === "back" && fld.scope === "front";
  const overlay = isReadOnly ? "" : "";

  if (ft === "textarea") {
    return `<textarea rows="3" placeholder="${hint}" style="${base}resize:vertical" disabled></textarea>`;
  }
  if (ft === "daterange") {
    return `<div style="display:flex;gap:8px;align-items:center">
      <input type="date" style="${base}flex:1" disabled>
      <span style="color:#9CA3AF;font-size:12px">~</span>
      <input type="date" style="${base}flex:1" disabled>
    </div>`;
  }
  if (ft === "date") {
    return `<input type="date" style="${base}" disabled>`;
  }
  if (ft === "number" || ft === "budget-linked") {
    const prefix =
      ft === "budget-linked"
        ? `<div style="padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;font-size:11px;color:#1D4ED8;font-weight:800;margin-bottom:8px">💼 조직 잔액: <b>실시간 조회</b> (연동 예정)</div>`
        : "";
    return (
      prefix +
      `<div style="display:flex;align-items:center;gap:0">
      <span style="padding:12px;background:#F3F4F6;border:1.5px solid #E5E7EB;border-radius:8px 0 0 8px;font-size:13px;color:#6B7280">₩</span>
      <input type="number" placeholder="0" style="${base}border-radius:0 8px 8px 0;border-left:none" disabled>
    </div>`
    );
  }
  if (ft === "file") {
    return `<div style="padding:16px;border:2px dashed #D1D5DB;border-radius:8px;text-align:center;color:#9CA3AF;font-size:12px;background:#F9FAFB;font-weight:800">⬆️ 파일 업로드 영역</div>`;
  }
  if (ft === "rating") {
    return `<div style="display:flex;gap:6px;padding:8px 0">
      ${[1, 2, 3, 4, 5].map((n) => `<span style="font-size:28px;color:#D1D5DB;cursor:default">☆</span>`).join("")}
      <span style="font-size:12px;color:#9CA3AF;margin-left:8px;line-height:28px">5점 척도</span>
    </div>`;
  }
  if (ft === "user-search") {
    return `<div style="display:flex;gap:8px">
      <input type="text" placeholder="이름 또는 사번으로 검색..." style="${base}flex:1" disabled>
      <button disabled style="padding:0 16px;background:#6366F1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:not-allowed;opacity:0.6">🔍 검색</button>
    </div>`;
  }
  if (ft === "calc-grounds") {
    return `<div style="padding:12px;border:1.5px solid #E5E7EB;border-radius:8px;background:#F9FAFB">
      <div style="font-size:11px;color:#6B7280;margin-bottom:8px;font-weight:800">📐 선택 가능한 세부산출근거 항목 (테넌트별 자동 로드)</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${["과정비(외부위탁)", "강사료(외부)", "교재비", "시설/기자재 임차료"]
          .map(
            (t) => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;background:#fff;cursor:default">
          <input type="checkbox" disabled> <span style="font-size:12px">${t}</span>
        </label>`,
          )
          .join("")}
        <span style="font-size:10px;color:#9CA3AF">실제 항목은 산정기준 관리에서 불러옵니다</span>
      </div>
    </div>`;
  }
  if (ft === "select") {
    const rawOpts = poolField.options || [];
    const opts = rawOpts.length
      ? rawOpts
          .map((o) => `<option>${typeof o === "object" ? o.label : o}</option>`)
          .join("")
      : "<option>선택 1</option><option>선택 2</option>";
    return `<select style="${base}" disabled><option>— 선택 —</option>${opts}</select>`;
  }
  if (ft === "monthly-grid") {
    const cfg = poolField.gridConfig || {};
    const unit = cfg.unit || "";
    const isCurrency = cfg.valueType === "currency";
    const year = new Date().getFullYear();
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const cellSt = "padding:0;border:1px solid #E5E7EB;text-align:center";
    const inputSt =
      "width:100%;box-sizing:border-box;border:none;padding:4px 2px;font-size:11px;text-align:right;background:transparent;outline:none;color:#374151";
    const thSt =
      "padding:6px 4px;font-size:10px;font-weight:800;color:#6B7280;background:#F9FAFB;text-align:center;border:1px solid #E5E7EB;white-space:nowrap";
    return `
<div style="overflow-x:auto">
  <div style="display:flex;justify-content:flex-end;font-size:10px;color:#9CA3AF;margin-bottom:4px">(단위:${unit})</div>
  <table style="width:100%;border-collapse:collapse;min-width:720px">
    <thead>
      <tr>
        <th style="${thSt};width:44px">연도</th>
        ${months.map((m) => `<th style="${thSt}">${m}월</th>`).join("")}
        <th style="${thSt};background:#EFF6FF;color:#1D4ED8">계</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="${cellSt};background:#F9FAFB;font-size:11px;font-weight:800;color:#374151;padding:4px">${year}</td>
        ${months.map(() => `<td style="${cellSt}"><input type="${isCurrency ? "text" : "number"}" placeholder="" style="${inputSt}" disabled></td>`).join("")}
        <td style="${cellSt};background:#EFF6FF"><input type="text" value="0" style="${inputSt};font-weight:900;color:#1D4ED8" disabled></td>
      </tr>
    </tbody>
  </table>
</div>`;
  }
  if (ft === "system") {
    return `<div style="padding:10px 14px;background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:8px;font-size:12px;color:#0369A1;font-weight:800">🔄 시스템 자동 연결 필드</div>`;
  }
  // default: text
  return `<input type="text" placeholder="${hint}" style="${base}" disabled>`;
}

function fbRenderPreviewBody(viewType) {
  const tFront = document.getElementById("fb-pv-tab-front");
  const tBack = document.getElementById("fb-pv-tab-back");
  if (viewType === "front") {
    tFront.style.color = "#059669";
    tFront.style.borderBottomColor = "#059669";
    tFront.style.fontWeight = "900";
    tBack.style.color = "#6B7280";
    tBack.style.borderBottomColor = "transparent";
    tBack.style.fontWeight = "800";
  } else {
    tBack.style.color = "#7C3AED";
    tBack.style.borderBottomColor = "#7C3AED";
    tBack.style.fontWeight = "900";
    tFront.style.color = "#6B7280";
    tFront.style.borderBottomColor = "transparent";
    tFront.style.fontWeight = "800";
  }

  const form = window._currentPreviewForm;
  const bBody = document.getElementById("fb-pv-body");
  if (!form) return;

  const fields = (form.fields || []).map((f) =>
    typeof f === "object" ? f : { key: f, scope: "front" },
  );

  // 필드 타입 배지
  const TYPE_BADGE = {
    text: { label: "텍스트", color: "#6B7280", bg: "#F3F4F6" },
    textarea: { label: "장문", color: "#059669", bg: "#F0FDF4" },
    date: { label: "날짜", color: "#0369A1", bg: "#EFF6FF" },
    daterange: { label: "날짜범위", color: "#0369A1", bg: "#EFF6FF" },
    number: { label: "숫자", color: "#D97706", bg: "#FFFBEB" },
    "user-search": { label: "사용자검색", color: "#6366F1", bg: "#EEF2FF" },
    file: { label: "파일", color: "#9D174D", bg: "#FDF2F8" },
    rating: { label: "별점", color: "#F59E0B", bg: "#FFFBEB" },
    select: { label: "선택", color: "#7C3AED", bg: "#F5F3FF" },
    "calc-grounds": { label: "산출근거", color: "#065F46", bg: "#ECFDF5" },
    "budget-linked": { label: "예산연동", color: "#1D4ED8", bg: "#EFF6FF" },
    "monthly-grid": { label: "월별그리드", color: "#0E7490", bg: "#ECFEFF" },
    system: { label: "시스템", color: "#6B7280", bg: "#F3F4F6" },
  };

  let html = `
    <h4 style="margin:0 0 20px 0;font-size:18px;color:#111827;border-bottom:2px solid #111827;padding-bottom:12px;font-weight:900">📝 ${form.name}</h4>
    <div style="display:flex;flex-direction:column;gap:18px">`;

  let visibleCount = 0;

  fields.forEach((fld) => {
    if (viewType === "front" && fld.scope === "back") return;
    if (viewType === "front" && fld.scope === "system") return;

    visibleCount++;
    const poolField = ADVANCED_FIELDS.find((x) => x.key === fld.key) || {};
    const reqStr = poolField.required
      ? '<span style="color:#EF4444"> *</span>'
      : "";
    const icon = poolField.icon || "🔸";
    const ft = poolField.fieldType || fld.fieldType || "text";
    const tb = TYPE_BADGE[ft] || TYPE_BADGE.text;

    // Scope 배지
    let scopeBadge = "";
    if (viewType === "back") {
      if (fld.scope === "front")
        scopeBadge = `<span style="font-size:9px;background:#F0FDF4;color:#059669;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">FO입력</span>`;
      else if (fld.scope === "provide")
        scopeBadge = `<span style="font-size:9px;background:#EFF6FF;color:#1D4ED8;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">📢 BO제공→FO</span>`;
      else if (fld.scope === "back")
        scopeBadge = `<span style="font-size:9px;background:#F5F3FF;color:#7C3AED;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">BO전용</span>`;
      else
        scopeBadge = `<span style="font-size:9px;background:#EFF6FF;color:#3B82F6;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:800">시스템</span>`;
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ 입력 필드 관리 탭 — L1 조회 + L2 CRUD + 옵션 관리 + 의존성 규칙
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _fcSubTab = "fields"; // 'fields' | 'options' | 'deps'
let _fcExpandedField = null; // 옵션 편집 중인 필드 key

function _fbRenderFieldCatalog() {
  const role = boCurrentPersona?.role || "viewer";
  const isPlatform = role === "platform_admin";
  const l2Count = _fbL2Fields.length;

  return `
<div class="bo-fade">
  <!-- 서브 탭 -->
  <div style="display:flex;gap:2px;margin-bottom:20px;background:#F3F4F6;border-radius:10px;padding:4px">
    ${_fcSubTabBtn("fields", "📋 필드 카탈로그")}
    ${_fcSubTabBtn("options", "🔽 옵션값 관리")}
    ${_fcSubTabBtn("deps", "⚡ 의존성 규칙")}
  </div>

  ${
    _fcSubTab === "fields"
      ? _fcRenderFields(isPlatform, l2Count)
      : _fcSubTab === "options"
        ? _fcRenderOptions(isPlatform)
        : _fcRenderDeps(isPlatform)
  }

  <!-- 단일 필드 미리보기 팝업 모달 -->
  <div id="fc-preview-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:500px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center;background:#FAFAFA">
        <h3 style="font-size:15px;font-weight:800;margin:0;color:#111827">🔍 필드 미리보기</h3>
        <button onclick="document.getElementById('fc-preview-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="fc-preview-body" style="padding:24px;overflow-y:auto;flex:1;background:#fff">
        <!-- 필드 렌더링 영역 -->
      </div>
    </div>
  </div>

  <!-- L1 필드 수정 모달 -->
  <div id="fc-l1-edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:520px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;background:#F5F3FF">
        <div>
          <h3 style="font-size:16px;font-weight:900;margin:0;color:#5B21B6">✏️ L1 표준 필드 조정</h3>
          <p style="font-size:11px;color:#7C3AED;margin:4px 0 0">표시명·힌트·필수여부·입력주체만 수정 가능합니다. (필드 타입·키는 보호됨)</p>
        </div>
        <button onclick="document.getElementById('fc-l1-edit-modal').style.display='none'" style="border:none;background:none;font-size:20px;cursor:pointer;color:#7C3AED">✕</button>
      </div>
      <div style="padding:20px 24px">
        <input id="fc-l1-canonical-key" type="hidden">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div style="grid-column:1/-1">
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:5px">표시명 (빈칸 = 코드 기본값 사용)</label>
            <input id="fc-l1-display-name" type="text" placeholder="예: 교육 기간" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#FAFAFA">
          </div>
          <div style="grid-column:1/-1">
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:5px">힌트 메시지</label>
            <input id="fc-l1-hint" type="text" placeholder="사용자에게 표시될 안내 문구" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#FAFAFA">
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:5px">필수 여부</label>
            <select id="fc-l1-required" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#FAFAFA">
              <option value="">코드 기본값</option>
              <option value="true">필수 ✅</option>
              <option value="false">선택 —</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:5px">입력 주체 (Scope)</label>
            <select id="fc-l1-scope" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#FAFAFA">
              <option value="">코드 기본값</option>
              <option value="front">🔓 프론트 (학습자)</option>
              <option value="provide">📢 BO제공 → FO (관리자 입력, 학습자 읽기전용)</option>
              <option value="back">🔒 백오피스 (승인자)</option>
              <option value="system">⚙️ 시스템</option>
            </select>
          </div>
          <div style="grid-column:1/-1">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700;color:#374151">
              <input id="fc-l1-hidden" type="checkbox" style="width:16px;height:16px;accent-color:#DC2626">
              이 필드를 카탈로그에서 숨기기 (비활성화)
            </label>
            <p style="font-size:11px;color:#9CA3AF;margin:4px 0 0">체크 시 양식 에디터에서 선택 불가 상태가 됩니다.</p>
          </div>
        </div>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #F3F4F6;background:#FAFAFA;display:flex;justify-content:space-between;align-items:center">
        <button onclick="_fcResetL1Override()" style="padding:8px 14px;background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">🔄 초기화 (코드 기본값 복원)</button>
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('fc-l1-edit-modal').style.display='none'" style="padding:10px 16px;background:#F1F5F9;border:none;border-radius:8px;font-size:13px;font-weight:800;color:#64748B;cursor:pointer">취소</button>
          <button onclick="_fcSaveL1Override()" style="padding:10px 24px;background:#7C3AED;color:white;border:none;border-radius:8px;font-size:13px;font-weight:900;cursor:pointer">💾 저장</button>
        </div>
      </div>
    </div>
  </div>

  <!-- L2 필드 추가 팝업 모달 -->
  <div id="fc-l2-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:560px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center;background:#FFFBEB">
        <div>
          <h3 style="font-size:16px;font-weight:900;margin:0;color:#92400E">📝 L2 확장 필드 생성</h3>
          <p style="font-size:11px;color:#B45309;margin:4px 0 0">새로운 커스텀 필드(최대 10개)를 생성합니다.</p>
        </div>
        <button onclick="document.getElementById('fc-l2-modal').style.display='none'" style="border:none;background:none;font-size:20px;cursor:pointer;color:#D97706">✕</button>
      </div>
      <div style="padding:20px 24px;overflow-y:auto;flex:1;background:#fff">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">필드명 *</label>
            <input id="fc-m-new-name" type="text" placeholder="예: 교육 카테고리" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB">
          </div>
          <div>
            <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">카테고리</label>
            <select id="fc-m-new-cat" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB">
              <!-- 카테고리 옵션들이 스크립트로 주입됨 -->
            </select>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">필드 타입 *</label>
          <select id="fc-m-new-type" onchange="_fcHandleL2TypeChange()" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB">
            <option value="text">텍스트 (단답형)</option>
            <option value="textarea">여러 줄 텍스트 (서술형)</option>
            <option value="number">숫자</option>
            <option value="select">셀렉트 (단일 선택)</option>
            <option value="multi_select">멀티 셀렉트 (다중 선택)</option>
            <option value="date">날짜 (단일일)</option>
            <option value="daterange">기간 (시작일~종료일)</option>
            <option value="file">파일 첨부</option>
          </select>
        </div>
        
        <!-- 셀렉트/멀티셀렉트 옵션 추가 영역 -->
        <div id="fc-m-options-area" style="display:none;background:#F4F4F5;padding:16px;border-radius:12px;border:1.5px dashed #D4D4D8">
          <label style="font-size:12px;font-weight:800;color:#3F3F46;display:block;margin-bottom:8px">선택 옵션 (최소 1개 이상 필수) *</label>
          <div id="fc-m-options-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px"></div>
          <div style="display:flex;gap:8px">
            <input id="fc-m-opt-label" type="text" placeholder="표시 라벨" style="flex:1;min-width:0;padding:8px 10px;border:1.5px solid #D4D4D8;border-radius:6px;font-size:12px">
            <input id="fc-m-opt-value" type="text" placeholder="저장값(키)" style="flex:1;min-width:0;padding:8px 10px;border:1.5px solid #D4D4D8;border-radius:6px;font-size:12px;font-family:monospace">
            <button onclick="_fcAddTempOption()" style="padding:8px 14px;background:#52525B;color:white;border:none;border-radius:6px;font-size:12px;font-weight:800;cursor:pointer">➕ 추가</button>
          </div>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #F3F4F6;background:#FAFAFA;display:flex;justify-content:flex-end;gap:10px">
        <button onclick="document.getElementById('fc-l2-modal').style.display='none'" style="padding:10px 16px;background:#F1F5F9;border:none;border-radius:8px;font-size:13px;font-weight:800;color:#64748B;cursor:pointer">취소</button>
        <button onclick="_fcSaveL2Modal()" style="padding:10px 24px;background:#D97706;color:white;border:none;border-radius:8px;font-size:13px;font-weight:900;cursor:pointer">💾 생성하기</button>
      </div>
    </div>
  </div>
</div>`;
}

function _fcSubTabBtn(id, label) {
  const active = _fcSubTab === id;
  return `<button onclick="_fcSwitchSub('${id}')" style="
    flex:1;padding:8px 12px;border:none;background:${active ? "#fff" : "transparent"};
    cursor:pointer;font-size:12px;font-weight:${active ? "800" : "600"};
    color:${active ? "#7C3AED" : "#6B7280"};border-radius:8px;
    box-shadow:${active ? "0 1px 4px rgba(0,0,0,0.1)" : "none"};transition:all .15s">${label}</button>`;
}

function _fcSwitchSub(sub) {
  _fcSubTab = sub;
  const el = document.getElementById("fb-tab-content");
  if (el) el.innerHTML = _fbRenderFieldCatalog();
}

// ━━━ 필드 카탈로그 서브탭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fcRenderFields(isPlatform, l2Count) {
  const allFields = _fbAllFields();
  const categories = [...new Set(allFields.map((f) => f.category))];

  // L2 추가 폼
  // L2 추가 폼 (모달 버튼으로 대체)
  const l2AddForm = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <button onclick="_fcOpenL2Modal()" ${l2Count >= _FB_L2_MAX ? 'disabled title="최대 필드 수 도달"' : ""}
        style="display:flex;align-items:center;gap:6px;padding:9px 18px;background:${l2Count >= _FB_L2_MAX ? "#FCD34D" : "#D97706"};color:${l2Count >= _FB_L2_MAX ? "#92400E" : "white"};border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:${l2Count >= _FB_L2_MAX ? "not-allowed" : "pointer"}">
      + L2 확장 필드 추가 ${l2Count >= _FB_L2_MAX ? "(⚠️ 최대 개수 도달)" : `(${l2Count}/${_FB_L2_MAX})`}
    </button>
  </div>`;

  // 카테고리별 필드 테이블
  let fieldsHtml = "";
  categories.forEach((cat) => {
    const catFields = allFields.filter((f) => f.category === cat);
    const catColor = cat.includes("승인")
      ? "#9D174D"
      : cat === "시스템"
        ? "#0369A1"
        : "#374151";

    fieldsHtml += `
    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:900;color:${catColor};text-transform:uppercase;margin-bottom:8px;letter-spacing:.05em;padding-left:4px">${cat}</div>
      <div style="border:1.5px solid #E5E7EB;border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#F9FAFB;border-bottom:1px solid #E5E7EB">
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280;width:24px">계층</th>
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">필드명</th>
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">타입</th>
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">Scope</th>
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">canonical_key</th>
              <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:50px">통계용</th>
              <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:50px">잠금</th>
              <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:50px">미리보기</th>
              ${isPlatform ? '<th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:80px">관리</th>' : ""}
            </tr>
          </thead>
          <tbody>
            ${catFields
              .map((f) => {
                const layerBg = f.layer === "L1" ? "#EFF6FF" : "#FFFBEB";
                const layerC = f.layer === "L1" ? "#1D4ED8" : "#D97706";
                const isLocked = f.layer === "L1";
                const typeLabel =
                  {
                    text: "텍스트",
                    textarea: "여러줄",
                    number: "숫자",
                    select: "셀렉트",
                    multi_select: "멀티셀렉트",
                    date: "날짜",
                    daterange: "기간",
                    file: "파일",
                    "user-search": "사용자검색",
                    user_search: "사용자검색",
                    rating: "평점",
                    system: "시스템",
                    "budget-linked": "예산연동",
                    budget_linked: "예산연동",
                    "calc-grounds": "산출근거",
                    calc_grounds: "산출근거",
                    "course-session": "과정차수",
                    course_session: "과정차수",
                  }[f.fieldType] || f.fieldType;
                const scopeLabel =
                  f.scope === "front"
                    ? "🔓프론트"
                    : f.scope === "provide"
                      ? "📢BO제공"
                      : f.scope === "back"
                        ? "🔒백오피스"
                        : "⚙️시스템";
                const optCount = (f.options || []).length;
                const isHidden = f._hidden || false;
                const hiddenStyle = isHidden ? "opacity:0.4;" : "";
                const hiddenBadge = isHidden
                  ? ' <span style="font-size:9px;font-weight:800;color:#DC2626;background:#FEF2F2;padding:1px 5px;border-radius:3px">숨김</span>'
                  : "";
                return `<tr style="border-bottom:1px solid #F3F4F6;${hiddenStyle}" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                <td style="padding:6px 12px"><span style="font-size:10px;font-weight:900;color:${layerC};background:${layerBg};padding:2px 6px;border-radius:4px">${f.layer}</span></td>
                <td style="padding:6px 12px;font-weight:700;color:#111827">${f.icon} ${f.key}${hiddenBadge}${optCount ? ` <span style="font-size:9px;color:#7C3AED">(▼${optCount})</span>` : ""}</td>
                <td style="padding:6px 12px;color:#6B7280">${typeLabel}</td>
                <td style="padding:6px 12px;font-size:11px">${scopeLabel}</td>
                <td style="padding:6px 12px;font-family:monospace;font-size:11px;color:#6B7280">${f.canonicalKey || "-"}</td>
                <td style="padding:6px 12px;text-align:center">${f.layer === "L1" && ADVANCED_FIELDS.find((a) => a.key === f.key)?.required ? "✅" : "—"}</td>
                <td style="padding:6px 12px;text-align:center">${isLocked ? "🔒" : "—"}</td>
                <td style="padding:6px 12px;text-align:center"><button onclick="_fcPreviewField('${f.key}')" style="border:1.5px solid #E5E7EB;background:#fff;color:#374151;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:800;cursor:pointer">🔍 보기</button></td>
                ${
                  isPlatform
                    ? `<td style="padding:6px 12px;text-align:center">${
                        f.layer === "L2"
                          ? `<button onclick="_fcDeleteL2('${f.key}','${f.dbId || ""}')" style="border:none;background:#FEF2F2;color:#DC2626;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">비활성화</button>`
                          : `<button onclick="_fcOpenL1EditModal('${f.canonicalKey}')" style="border:1.5px solid #7C3AED;background:#F5F3FF;color:#7C3AED;padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">✏️ 수정</button>`
                      }</td>`
                    : ""
                }
              </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>`;
  });

  return l2AddForm + fieldsHtml;
}

// ━━━ 옵션값 관리 서브탭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fcRenderOptions(isPlatform) {
  const allFields = _fbAllFields().filter(
    (f) => f.fieldType === "select" || f.fieldType === "multi_select",
  );

  if (!allFields.length) {
    return '<div style="text-align:center;padding:40px;color:#9CA3AF;font-size:13px">셀렉트 타입 필드가 없습니다.</div>';
  }

  return `
  <div style="font-size:11px;color:#6B7280;margin-bottom:12px;font-weight:600">셀렉트 타입 필드의 옵션값을 관리합니다. L1 옵션(🔒)은 수정할 수 없습니다.</div>
  ${allFields
    .map((f) => {
      const opts = f.options || [];
      const isExpanded = _fcExpandedField === f.key;
      const layerC = f.layer === "L1" ? "#1D4ED8" : "#D97706";
      const layerBg = f.layer === "L1" ? "#EFF6FF" : "#FFFBEB";

      return `
    <div style="border:1.5px solid ${isExpanded ? "#7C3AED" : "#E5E7EB"};border-radius:10px;margin-bottom:10px;overflow:hidden;transition:border-color .2s">
      <div onclick="_fcToggleExpand('${f.key}')" style="display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer;background:${isExpanded ? "#F5F3FF" : "#FAFAFA"};transition:background .2s"
        onmouseover="this.style.background='${isExpanded ? "#F5F3FF" : "#F3F4F6"}'" onmouseout="this.style.background='${isExpanded ? "#F5F3FF" : "#FAFAFA"}'">
        <span style="font-size:13px;font-weight:800;color:#111827;flex:1">${f.icon} ${f.key}</span>
        <span style="font-size:10px;font-weight:900;color:${layerC};background:${layerBg};padding:2px 6px;border-radius:4px">${f.layer}</span>
        <span style="font-size:11px;color:#7C3AED;font-weight:700">${opts.length}개 옵션</span>
        <span style="font-size:14px;color:#9CA3AF;transform:rotate(${isExpanded ? "180" : "0"}deg);transition:transform .2s">▼</span>
      </div>
      ${
        isExpanded
          ? `
      <div style="padding:12px 16px;border-top:1px solid #E5E7EB">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="text-align:left;padding:6px 10px;font-weight:800;color:#6B7280;width:24px">계층</th>
              <th style="text-align:left;padding:6px 10px;font-weight:800;color:#6B7280">표시명(label)</th>
              <th style="text-align:left;padding:6px 10px;font-weight:800;color:#6B7280">저장값(value)</th>
              <th style="text-align:center;padding:6px 10px;font-weight:800;color:#6B7280;width:50px">잠금</th>
              <th style="text-align:center;padding:6px 10px;font-weight:800;color:#6B7280;width:50px">관리</th>
            </tr>
          </thead>
          <tbody>
            ${opts
              .map(
                (o, i) => `
            <tr style="border-bottom:1px solid #F3F4F6">
              <td style="padding:5px 10px"><span style="font-size:9px;font-weight:800;color:${o.layer === "L1" || o.locked ? "#1D4ED8" : "#D97706"};background:${o.layer === "L1" || o.locked ? "#EFF6FF" : "#FFFBEB"};padding:1px 5px;border-radius:3px">${o.layer || "L1"}</span></td>
              <td style="padding:5px 10px;font-weight:600">${o.label}</td>
              <td style="padding:5px 10px;font-family:monospace;color:#6B7280">${o.value}</td>
              <td style="padding:5px 10px;text-align:center">${o.locked || o.layer === "L1" ? "🔒" : "—"}</td>
              <td style="padding:5px 10px;text-align:center">${!(o.locked || o.layer === "L1") ? `<button onclick="_fcDeleteOption('${f.key}',${i})" style="border:none;background:#FEF2F2;color:#DC2626;padding:2px 6px;border-radius:4px;font-size:10px;cursor:pointer">삭제</button>` : '<span style="color:#D1D5DB;font-size:10px">—</span>'}</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <!-- 옵션 추가 폼 -->
        <div style="display:flex;gap:6px;align-items:center">
          <input id="fc-opt-label-${f.key}" type="text" placeholder="표시명" style="flex:1;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:11px">
          <input id="fc-opt-value-${f.key}" type="text" placeholder="저장값(snake_case)" style="flex:1;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:11px;font-family:monospace">
          <button onclick="_fcAddOption('${f.key}')" style="padding:6px 14px;background:#7C3AED;color:white;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">+ 추가</button>
        </div>
      </div>`
          : ""
      }
    </div>`;
    })
    .join("")}`;
}

// ━━━ 의존성 규칙 서브탭 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fcRenderDeps(isPlatform) {
  const allFields = _fbAllFields();
  // 코드 기반 의존성 + DB 의존성 통합
  const codeDeps = [];
  allFields.forEach((f) => {
    if (f.predecessors?.length) {
      f.predecessors.forEach((pred) => {
        codeDeps.push({
          successor: f.key,
          predecessor: pred,
          type: "auto_add",
          source: "code",
        });
      });
    }
  });
  const dbDeps = _fbFieldDeps.map((d) => {
    const succ = allFields.find(
      (f) => f.canonicalKey && "FLD_" + f.canonicalKey === d.successor_field_id,
    );
    const pred = allFields.find(
      (f) =>
        f.canonicalKey && "FLD_" + f.canonicalKey === d.predecessor_field_id,
    );
    return {
      successor: succ?.key || d.successor_field_id,
      predecessor: pred?.key || d.predecessor_field_id,
      type: d.rule_type,
      source: "db",
      id: d.id,
    };
  });
  // 중복 제거 (코드 기반 우선)
  const seen = new Set(codeDeps.map((d) => d.successor + "→" + d.predecessor));
  const mergedDeps = [
    ...codeDeps,
    ...dbDeps.filter((d) => !seen.has(d.successor + "→" + d.predecessor)),
  ];

  const ruleLabels = {
    auto_add: "🔄 자동 추가",
    warn: "⚠️ 경고",
    block: "🚫 차단",
  };
  const ruleColors = { auto_add: "#059669", warn: "#D97706", block: "#DC2626" };

  return `
  <div style="font-size:11px;color:#6B7280;margin-bottom:12px;font-weight:600">후행 필드 추가 시 선행 필드를 자동으로 추가하거나 경고합니다. 삭제 시에는 선행 필드 삭제를 차단합니다.</div>

  <!-- 기존 규칙 목록 -->
  <div style="border:1.5px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:16px">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#F9FAFB;border-bottom:1px solid #E5E7EB">
          <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">후행 필드 (추가 시)</th>
          <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:30px">→</th>
          <th style="text-align:left;padding:8px 12px;font-weight:800;color:#6B7280">선행 필드 (자동 추가)</th>
          <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280">규칙</th>
          <th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:50px">출처</th>
          ${isPlatform ? '<th style="text-align:center;padding:8px 12px;font-weight:800;color:#6B7280;width:50px">관리</th>' : ""}
        </tr>
      </thead>
      <tbody>
        ${mergedDeps.length === 0 ? '<tr><td colspan="6" style="padding:20px;text-align:center;color:#D1D5DB">등록된 의존성 규칙이 없습니다.</td></tr>' : ""}
        ${mergedDeps
          .map(
            (d) => `
        <tr style="border-bottom:1px solid #F3F4F6" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
          <td style="padding:6px 12px;font-weight:700">${d.successor}</td>
          <td style="padding:6px 12px;text-align:center;color:#9CA3AF">→</td>
          <td style="padding:6px 12px;font-weight:700">${d.predecessor}</td>
          <td style="padding:6px 12px;text-align:center"><span style="font-size:10px;font-weight:800;color:${ruleColors[d.type] || "#6B7280"};background:${ruleColors[d.type]}15;padding:2px 8px;border-radius:5px">${ruleLabels[d.type] || d.type}</span></td>
          <td style="padding:6px 12px;text-align:center"><span style="font-size:9px;color:#9CA3AF;font-weight:600">${d.source === "code" ? "코드" : "DB"}</span></td>
          ${isPlatform ? `<td style="padding:6px 12px;text-align:center">${d.source === "db" && d.id ? `<button onclick="_fcDeleteDep('${d.id}')" style="border:none;background:#FEF2F2;color:#DC2626;padding:2px 6px;border-radius:4px;font-size:10px;cursor:pointer">삭제</button>` : '<span style="color:#D1D5DB;font-size:10px">—</span>'}</td>` : ""}
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <!-- 새 규칙 추가 -->
  <div style="padding:16px;background:#ECFDF5;border:1.5px solid #A7F3D0;border-radius:12px">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">➕ 새 의존성 규칙 추가</div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr auto auto;gap:8px;align-items:end">
      <div>
        <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">후행 필드</label>
        <select id="fc-dep-succ" style="width:100%;padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          ${allFields.map((f) => `<option value="${f.key}">${f.icon} ${f.key}</option>`).join("")}
        </select>
      </div>
      <span style="color:#9CA3AF;font-weight:700;font-size:16px;padding-bottom:4px">→</span>
      <div>
        <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">선행 필드</label>
        <select id="fc-dep-pred" style="width:100%;padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          ${allFields.map((f) => `<option value="${f.key}">${f.icon} ${f.key}</option>`).join("")}
        </select>
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">규칙</label>
        <select id="fc-dep-type" style="padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          <option value="auto_add">🔄 자동추가</option>
          <option value="warn">⚠️ 경고</option>
        </select>
      </div>
      <button onclick="_fcAddDep()" style="padding:8px 16px;background:#059669;color:white;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">추가</button>
    </div>
  </div>`;
}

// ━━━ CRUD 함수들 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// L2 필드 추가 (모달 오픈)
window._fcOpenL2Modal = function () {
  const allFields = _fbAllFields();
  const categories = [...new Set(allFields.map((f) => f.category))];
  const catHtml =
    categories.map((c) => `<option value="${c}">${c}</option>`).join("") +
    '<option value="커스텀">커스텀</option>';

  document.getElementById("fc-m-new-cat").innerHTML = catHtml;
  document.getElementById("fc-m-new-name").value = "";
  document.getElementById("fc-m-new-type").value = "text";
  window._fcTempOptions = [];
  _fcRenderTempOptions();
  _fcHandleL2TypeChange();

  document.getElementById("fc-l2-modal").style.display = "flex";
};

window._fcHandleL2TypeChange = function () {
  const t = document.getElementById("fc-m-new-type").value;
  document.getElementById("fc-m-options-area").style.display =
    t === "select" || t === "multi_select" ? "block" : "none";
};

window._fcTempOptions = [];
window._fcRenderTempOptions = function () {
  const el = document.getElementById("fc-m-options-list");
  if (!el) return;
  if (!_fcTempOptions.length) {
    el.innerHTML =
      '<span style="font-size:11px;color:#A1A1AA">등록된 옵션이 없습니다.</span>';
    return;
  }
  el.innerHTML = _fcTempOptions
    .map(
      (o, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#fff;border:1px solid #D4D4D8;border-radius:6px;font-size:12px">
      <span><span style="font-weight:800;color:#3F3F46">${o.label}</span> <span style="font-family:monospace;color:#A1A1AA">(${o.value})</span></span>
      <button onclick="_fcTempOptions.splice(${i},1);_fcRenderTempOptions()" style="background:none;border:none;color:#EF4444;font-size:14px;cursor:pointer">✕</button>
    </div>
  `,
    )
    .join("");
};

window._fcAddTempOption = function () {
  const l = document.getElementById("fc-m-opt-label").value.trim();
  const v =
    document.getElementById("fc-m-opt-value").value.trim() ||
    l.replace(/\s+/g, "_").toLowerCase();
  if (!l) return alert("라벨을 입력하세요.");
  _fcTempOptions.push({ label: l, value: v });
  document.getElementById("fc-m-opt-label").value = "";
  document.getElementById("fc-m-opt-value").value = "";
  _fcRenderTempOptions();
};

window._fcSaveL2Modal = async function () {
  const name = document.getElementById("fc-m-new-name").value.trim();
  const type = document.getElementById("fc-m-new-type").value;
  const cat = document.getElementById("fc-m-new-cat").value;
  if (!name) return alert("필드명을 입력해주세요.");
  if (
    (type === "select" || type === "multi_select") &&
    _fcTempOptions.length === 0
  )
    return alert("셀렉트 타입은 최소 1개 이상의 옵션이 필요합니다.");
  if (_fbL2Fields.length >= _FB_L2_MAX)
    return alert(`L2 필드는 최대 ${_FB_L2_MAX}개까지 생성 가능합니다.`);

  const canonicalKey = name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9가-힣_]/g, "")
    .toLowerCase();
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  const fieldId = "FLD_L2_" + tenantId + "_" + Date.now();

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb.from("form_field_catalog").insert({
        id: fieldId,
        layer: "L2",
        tenant_id: tenantId,
        canonical_key: canonicalKey,
        display_name: name,
        icon: "📝",
        category: cat,
        field_type: type,
        scope: "front",
        hint: "",
        is_reportable: false,
        is_locked: false,
        default_required: false,
        sort_order: 100 + _fbL2Fields.length,
      });
      // 옵션 저장
      if (type === "select" || type === "multi_select") {
        const optsToInsert = _fcTempOptions.map((o, i) => ({
          id: "OPT_L2_" + Date.now() + "_" + i,
          field_id: fieldId,
          layer: "L2",
          tenant_id: tenantId,
          label: o.label,
          value: o.value,
          sort_order: i + 1,
          is_locked: false,
        }));
        await sb.from("field_options").insert(optsToInsert);
      }
    }

    // 로컬 캐시 갱신
    _fbL2Fields.push({
      key: name,
      icon: "📝",
      required: false,
      scope: "front",
      category: cat,
      fieldType: type,
      hint: "",
      canonicalKey: canonicalKey,
      layer: "L2",
      dbId: fieldId,
      options:
        type === "select" || type === "multi_select"
          ? _fcTempOptions.map((o) => ({ ...o, layer: "L2", locked: false }))
          : [],
      predecessors: [],
    });

    _fbShowToast(`✅ L2 필드 "${name}" 생성 완료`);
    document.getElementById("fc-l2-modal").style.display = "none";
    _fcSwitchSub("fields");
  } catch (e) {
    alert("생성 실패: " + e.message);
  }
};

// 개별 필드 미리보기
window._fcPreviewField = function (key) {
  const fld = _fbAllFields().find((f) => f.key === key);
  if (!fld) return;
  const dummyProp = { key: fld.key, scope: "front", required: true };
  const html = `<div style="padding:16px;background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EB">
      <label style="display:flex;align-items:center;font-size:13px;font-weight:800;color:#374151;margin-bottom:8px">
        ${fld.icon} ${fld.key} <span style="font-size:11px;color:#EF4444;margin-left:4px">*</span>
      </label>
      ${typeof _fbFieldInput === "function" ? _fbFieldInput(dummyProp, [fld], "front") : '<span style="color:#d1d5db">렌더링 모듈 없음</span>'}
      <div style="font-size:10px;color:#9CA3AF;margin-top:8px">${fld.hint || "옵션이 포함된 경우 드롭다운으로 표시됩니다."}</div>
    </div>`;
  document.getElementById("fc-preview-body").innerHTML = html;
  document.getElementById("fc-preview-modal").style.display = "flex";
};

// L2 필드 비활성화
async function _fcDeleteL2(key, dbId) {
  if (!confirm(`"${key}" L2 필드를 비활성화할까요?`)) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb && dbId) {
      await sb
        .from("form_field_catalog")
        .update({ active: false })
        .eq("id", dbId);
    }
    _fbL2Fields = _fbL2Fields.filter((f) => f.key !== key);
    _fbShowToast(`"${key}" 필드 비활성화 완료`);
    _fcSwitchSub("fields");
  } catch (e) {
    alert("비활성화 실패: " + e.message);
  }
}

// 옵션값 토글
function _fcToggleExpand(key) {
  _fcExpandedField = _fcExpandedField === key ? null : key;
  _fcSwitchSub("options");
}

// 옵션값 추가
async function _fcAddOption(fieldKey) {
  const label = document
    .getElementById(`fc-opt-label-${fieldKey}`)
    ?.value?.trim();
  const value = document
    .getElementById(`fc-opt-value-${fieldKey}`)
    ?.value?.trim();
  if (!label || !value) {
    alert("표시명과 저장값을 모두 입력해주세요.");
    return;
  }

  const allFields = _fbAllFields();
  const field = allFields.find((f) => f.key === fieldKey);
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  const optId = "OPT_L2_" + Date.now();

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    const fieldDbId = field?.canonicalKey
      ? "FLD_" + field.canonicalKey
      : field?.dbId || "";
    if (sb && fieldDbId) {
      await sb.from("field_options").insert({
        id: optId,
        field_id: fieldDbId,
        layer: "L2",
        tenant_id: tenantId,
        label,
        value,
        sort_order: (field.options || []).length + 1,
        is_locked: false,
      });
    }
    // 로컬 캐시 갱신
    if (!field.options) field.options = [];
    field.options.push({ label, value, layer: "L2", locked: false });
    _fbShowToast(`✅ "${fieldKey}"에 옵션 "${label}" 추가 완료`);
    _fcSwitchSub("options");
  } catch (e) {
    alert("옵션 추가 실패: " + e.message);
  }
}

// 옵션값 삭제
async function _fcDeleteOption(fieldKey, idx) {
  const allFields = _fbAllFields();
  const field = allFields.find((f) => f.key === fieldKey);
  if (!field?.options?.[idx]) return;
  const opt = field.options[idx];
  if (opt.locked || opt.layer === "L1") {
    alert("L1 표준 옵션은 삭제할 수 없습니다.");
    return;
  }
  if (!confirm(`"${opt.label}" 옵션을 삭제할까요?`)) return;

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb
        .from("field_options")
        .delete()
        .eq("label", opt.label)
        .eq("value", opt.value);
    }
    field.options.splice(idx, 1);
    _fbShowToast(`옵션 "${opt.label}" 삭제 완료`);
    _fcSwitchSub("options");
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
}

// 의존성 규칙 추가
async function _fcAddDep() {
  const succ = document.getElementById("fc-dep-succ")?.value;
  const pred = document.getElementById("fc-dep-pred")?.value;
  const type = document.getElementById("fc-dep-type")?.value || "auto_add";
  if (!succ || !pred) return;
  if (succ === pred) {
    alert("후행과 선행 필드가 같을 수 없습니다.");
    return;
  }

  const allFields = _fbAllFields();
  const succField = allFields.find((f) => f.key === succ);
  const predField = allFields.find((f) => f.key === pred);
  const succId = succField?.canonicalKey ? "FLD_" + succField.canonicalKey : "";
  const predId = predField?.canonicalKey ? "FLD_" + predField.canonicalKey : "";
  const tenantId = boCurrentPersona?.tenantId || "HMC";

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb && succId && predId) {
      await sb.from("field_dependencies").insert({
        id: "DEP_" + Date.now(),
        tenant_id: tenantId,
        successor_field_id: succId,
        predecessor_field_id: predId,
        rule_type: type,
        description: `"${succ}" 추가 시 "${pred}" ${type === "auto_add" ? "자동 추가" : "경고"}`,
      });
    }
    // 코드 기반 predecessors도 갱신
    if (succField && !succField.predecessors) succField.predecessors = [];
    if (!succField.predecessors.includes(pred))
      succField.predecessors.push(pred);
    // DB deps 캐시 갱신
    _fbFieldDeps.push({
      id: "DEP_" + Date.now(),
      successor_field_id: succId,
      predecessor_field_id: predId,
      rule_type: type,
    });
    _fbShowToast(`✅ 의존성 규칙 추가: "${succ}" → "${pred}"`);
    _fcSwitchSub("deps");
  } catch (e) {
    alert("규칙 추가 실패: " + e.message);
  }
}

// 의존성 규칙 삭제
async function _fcDeleteDep(depId) {
  if (!confirm("이 의존성 규칙을 삭제할까요?")) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb.from("field_dependencies").delete().eq("id", depId);
    }
    _fbFieldDeps = _fbFieldDeps.filter((d) => d.id !== depId);
    _fbShowToast("의존성 규칙 삭제 완료");
    _fcSwitchSub("deps");
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
}

// ━━━ L1 표준 필드 오버라이드 관리 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// L1 수정 모달 열기
window._fcOpenL1EditModal = function (canonicalKey) {
  const fld = ADVANCED_FIELDS.find((f) => f.canonicalKey === canonicalKey);
  if (!fld) return alert("필드를 찾을 수 없습니다.");
  const ov = _fbL1Overrides[canonicalKey] || {};

  document.getElementById("fc-l1-canonical-key").value = canonicalKey;
  document.getElementById("fc-l1-display-name").value = ov.display_name || "";
  document.getElementById("fc-l1-hint").value = ov.hint || "";
  document.getElementById("fc-l1-required").value =
    ov.default_required != null ? String(ov.default_required) : "";
  document.getElementById("fc-l1-scope").value = ov.scope || "";
  document.getElementById("fc-l1-hidden").checked = ov.is_hidden || false;

  // 현재 코드 기본값을 플레이스홀더로 표시
  document.getElementById("fc-l1-display-name").placeholder =
    `코드 기본값: ${fld.key}`;
  document.getElementById("fc-l1-hint").placeholder =
    `코드 기본값: ${fld.hint || "없음"}`;

  document.getElementById("fc-l1-edit-modal").style.display = "flex";
};

// L1 오버라이드 저장
window._fcSaveL1Override = async function () {
  const canonicalKey = document.getElementById("fc-l1-canonical-key").value;
  const displayName = document
    .getElementById("fc-l1-display-name")
    .value.trim();
  const hint = document.getElementById("fc-l1-hint").value.trim();
  const reqVal = document.getElementById("fc-l1-required").value;
  const scope = document.getElementById("fc-l1-scope").value;
  const isHidden = document.getElementById("fc-l1-hidden").checked;

  const tenantId = boCurrentPersona?.tenantId || "HMC";
  const payload = {
    tenant_id: tenantId,
    canonical_key: canonicalKey,
    display_name: displayName || null,
    hint: hint || null,
    default_required: reqVal === "" ? null : reqVal === "true",
    scope: scope || null,
    is_hidden: isHidden,
    updated_at: new Date().toISOString(),
    updated_by: boCurrentPersona?.userId || "system",
  };

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      // UPSERT: (tenant_id, canonical_key) unique constraint 활용
      await sb
        .from("tenant_l1_overrides")
        .upsert(payload, { onConflict: "tenant_id,canonical_key" });
    }

    // 로컬 캐시 갱신
    _fbL1Overrides[canonicalKey] = {
      ...(_fbL1Overrides[canonicalKey] || {}),
      ...payload,
    };

    // ADVANCED_FIELDS 런타임 반영 (저장 즉시 카탈로그에 반영)
    const fld = ADVANCED_FIELDS.find((f) => f.canonicalKey === canonicalKey);
    if (fld) {
      // 표시명: f.key를 즉시 교체 (카탈로그 리렌더링 시 바로 표시됨)
      if (displayName) {
        fld._originalKey = fld._originalKey || fld.key; // 원본 키 백업
        fld.key = displayName;
      } else if (fld._originalKey) {
        fld.key = fld._originalKey; // 표시명 비워두면 원본 복원
      }
      if (hint) fld.hint = hint;
      if (reqVal !== "") fld.required = reqVal === "true";
      if (scope) fld.scope = scope;
      fld._hidden = isHidden;
    }

    _fbShowToast(`✅ L1 필드 (${canonicalKey}) 조정 저장 완료`);
    document.getElementById("fc-l1-edit-modal").style.display = "none";
    _fcSwitchSub("fields");
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};

// L1 오버라이드 초기화 (코드 기본값 복원)
window._fcResetL1Override = async function () {
  const canonicalKey = document.getElementById("fc-l1-canonical-key").value;
  if (
    !confirm(
      `"${canonicalKey}" 필드의 모든 조정을 초기화하고 코드 기본값으로 복원할까요?`,
    )
  )
    return;

  const tenantId = boCurrentPersona?.tenantId || "HMC";
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb
        .from("tenant_l1_overrides")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("canonical_key", canonicalKey);
    }

    // 캐시 제거
    delete _fbL1Overrides[canonicalKey];

    // ADVANCED_FIELDS 원복: 초기화 후 페이지 리로드로 코드 기본값 적용
    const fld = ADVANCED_FIELDS.find((f) => f.canonicalKey === canonicalKey);
    if (fld) {
      delete fld._displayNameOverride;
      delete fld._hidden;
    }

    _fbShowToast(`🔄 "${canonicalKey}" 필드 초기화 완료`);
    document.getElementById("fc-l1-edit-modal").style.display = "none";
    _fcSwitchSub("fields");
  } catch (e) {
    alert("초기화 실패: " + e.message);
  }
};
