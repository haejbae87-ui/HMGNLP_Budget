// ─── 🔧 교육지원 운영 규칙 ─────────────────────────────────────────────────────
// 8단계 위저드: 범위설정(회사·그룹·계정) → 정책명+대상자 → 목적 → 교육유형 → 패턴 → 대상조직 → 양식 → 결재라인

let _policyWizardStep = 0;
let _policyWizardData = {};
let _editPolicyId = null;
let _pbTplList = []; // 제도그룹 목록 (DB 로드)
let _pbAccountList = []; // 예산계정 목록 (DB 로드)

// ── 패턴 메타 (E 추가) ────────────────────────────────────────────────────────
const _PATTERN_META = {
  A: {
    label: "패턴A: 계획→신청→결과",
    color: "#7C3AED",
    icon: "📊",
    flow: "plan-apply-result",
    applyMode: "holding",
    budgetLinked: true,
  },
  B: {
    label: "패턴B: 신청→결과",
    color: "#1D4ED8",
    icon: "📝",
    flow: "apply-result",
    applyMode: "holding",
    budgetLinked: true,
  },
  C: {
    label: "패턴C: 결과 단독(후정산)",
    color: "#D97706",
    icon: "🧾",
    flow: "result-only",
    applyMode: "reimbursement",
    budgetLinked: true,
  },
};

// 패턴별 활성 단계
const _PATTERN_STAGES = {
  A: ["forecast", "ongoing", "apply", "result"],
  B: ["ongoing", "apply", "result"],
  C: ["apply", "result"],
};

function _patternFromPolicy(p) {
  let pat = (
    p.processPattern ||
    (p.flow === "plan-apply-result"
      ? "A"
      : p.flow === "apply-result"
        ? "B"
        : "C")
  );
  if (pat === "D") pat = "B";
  if (pat === "E") pat = "C";
  return pat;
}

// ── 목적·유형 정의 ────────────────────────────────────────────────────────────
const _PURPOSE_MAP = {
  learner: [{ id: "external_personal", label: "개인직무 사외학습" }],
  operator: [
    { id: "elearning_class", label: "이러닝/집합(비대면) 운영" },
    { id: "conf_seminar", label: "워크샵/세미나/콘퍼런스 등 운영" },
    { id: "misc_ops", label: "기타 운영" },
  ],
};
const _EDU_TYPE_MAP = {
  external_personal: [
    {
      id: "regular",
      label: "정규교육",
      subs: [
        { id: "elearning", label: "이러닝" },
        { id: "class", label: "집합" },
        { id: "live", label: "라이브" },
      ],
    },
    {
      id: "academic",
      label: "학술 및 연구활동",
      subs: [
        { id: "conf", label: "학회/컨퍼런스" },
        { id: "seminar", label: "세미나" },
      ],
    },
    {
      id: "knowledge",
      label: "지식자원 학습",
      subs: [
        { id: "book", label: "도서구입" },
        { id: "online", label: "온라인콘텐츠" },
      ],
    },
    {
      id: "competency",
      label: "역량개발지원",
      subs: [
        { id: "lang", label: "어학학습비 지원" },
        { id: "cert", label: "자격증 취득지원" },
      ],
    },
    {
      id: "etc",
      label: "기타",
      subs: [{ id: "team_build", label: "팀빌딩" }],
    },
  ],
  elearning_class: [
    { id: "elearning", label: "이러닝", subs: [] },
    { id: "class", label: "집합교육", subs: [] },
  ],
  conf_seminar: [
    { id: "conference", label: "콘퍼런스", subs: [] },
    { id: "seminar", label: "세미나", subs: [] },
    { id: "teambuilding", label: "팀빌딩", subs: [] },
    { id: "cert_maintain", label: "자격유지", subs: [] },
    { id: "system_link", label: "제도연계", subs: [] },
  ],
  misc_ops: [
    { id: "course_dev", label: "과정개발", subs: [] },
    { id: "material_dev", label: "교안개발", subs: [] },
    { id: "video_prod", label: "영상제작", subs: [] },
    { id: "facility", label: "교육시설운영", subs: [] },
  ],
};

// ── 필터 상태 ─────────────────────────────────────────────────────────────────
let _pbTenantFilter = "";
let _pbVorgFilter = "";
let _pbAccountFilter = "";
let _pbPurposeFilter = "";
let _pbEduTypeFilter = "";
let _pbSubTypeFilter = "";

let _pbServiceTypeFilter = "";

// ── 정책 목록 메인 화면 ───────────────────────────────────────────────────────
async function renderServicePolicy() {
  const persona = boCurrentPersona;
  const role = persona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";
  const isBudgetOp = role === "budget_op_manager" || role === "budget_hq";
  const isBudgetAdmin = role === "budget_global_admin";
  const el = document.getElementById("bo-content");

  // DB 재로드: Supabase에서 service_policies를 불러와 메모리와 병합
  _pbTplList = [];
  _pbAccountList = [];
  if (typeof _sb === "function" && _sb()) {
    try {
      const p1 = _sb()
        .from("virtual_org_templates")
        .select("id,name,tenant_id")
        .eq("service_type", "edu_support");
      const p2 = _sb()
        .from("budget_accounts")
        .select(
          "code,name,virtual_org_template_id,tenant_id,active,uses_budget",
        );
      const p3 = _sb().from("service_policies").select("*");
      const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

      if (res1.data) _pbTplList = res1.data;
      if (res2.data) _pbAccountList = res2.data;

      if (res3.data && res3.data.length > 0) {
        res3.data.forEach((row) => {
          let vId =
            row.vorg_template_id ||
            row.scope_group_id ||
            row.isolation_group_id;
          // 레거시 ID(IG-*, TPL_GEN_01, TPL_RND_01 등) → 실제 가상교육조직 ID로 보정
          const isLegacyId =
            !vId ||
            vId.startsWith("IG-") ||
            vId === "TPL_GEN_01" ||
            vId === "TPL_RND_01";
          if (isLegacyId) {
            if (
              row.name.startsWith("현대") ||
              row.name.toUpperCase().startsWith("HMC") ||
              vId === "TPL_GEN_01"
            ) {
              const tpl = _pbTplList.find(
                (t) =>
                  t.name.includes("일반교육예산 가상교육조직") ||
                  t.name === "HMC 일반교육예산 가상교육조직",
              );
              if (tpl) vId = tpl.id;
            }
            if (
              row.name.toUpperCase().startsWith("R&D") ||
              vId === "TPL_RND_01"
            ) {
              const tpl = _pbTplList.find(
                (t) =>
                  t.name.includes("R&D교육예산 가상교육조직") ||
                  t.name === "HMC R&D교육예산 가상교육조직",
              );
              if (tpl) vId = tpl.id;
            }
          }
          const mapped = {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            desc: row.descr,
            vorgTemplateId: vId,
            scopeTenantId: row.scope_tenant_id,
            targetType: row.target_type,
            purpose: row.purpose,
            eduTypes: row.edu_types || [],
            selectedEduItem: row.selected_edu_item,
            processPattern: row.process_pattern,
            flow: row.flow,
            budgetLinked: row.budget_linked !== false,
            applyMode: row.apply_mode,
            accountCodes: row.account_codes || [],
            virtualEduOrgId: row.virtual_edu_org_id,
            stageFormIds: row.stage_form_ids || {
              plan: [],
              apply: [],
              result: [],
            },
            stageFormFields: row.stage_form_fields || null,
            formSets: row.stage_form_ids,
            approvalConfig: row.approval_config || {
              plan: { thresholds: [], finalApproverKey: "" },
              apply: { thresholds: [], finalApproverKey: "" },
              result: { thresholds: [], finalApproverKey: "" },
            },
            approverPersonaKey:
              row.approval_config?.apply?.finalApproverKey || "",
            approvalThresholds: row.approval_config?.apply?.thresholds || [],
            managerPersonaKey: row.manager_persona_key,
            status: row.status || "active",
            createdAt: (row.created_at || "").slice(0, 10),
          };
          const idx = SERVICE_POLICIES.findIndex((p) => p.id === mapped.id);
          if (idx >= 0) SERVICE_POLICIES[idx] = mapped;
          else SERVICE_POLICIES.push(mapped);
        });
      }
    } catch (e) {
      console.warn("[renderServicePolicy] DB 재로드 실패:", e.message);
    }
  }

  const activeTenantId = isPlatform
    ? _pbTenantFilter || ""
    : persona.tenantId || "";
  const pbVorgId =
    isBudgetOp || isBudgetAdmin
      ? persona.domainId || _pbVorgFilter || ""
      : _pbVorgFilter || "";

  let myPolicies = SERVICE_POLICIES.filter((p) => {
    // 1. 테넌트 필터
    if (activeTenantId && p.tenantId !== activeTenantId) return false;
    // 2. 교육조직 필터
    if (pbVorgId && p.vorgTemplateId !== pbVorgId) return false;
    // 3. 예산계정 필터
    if (_pbAccountFilter && !(p.accountCodes || []).includes(_pbAccountFilter))
      return false;
    // 3-1. 서비스 유형 필터
    if (_pbServiceTypeFilter && p.targetType !== _pbServiceTypeFilter)
      return false;
    // 4. 교육지원 담당자(운영자)는 자신에게 매핑된 예산계정의 정책만 표시할 수 있음
    if ((isBudgetOp || isBudgetAdmin) && !pbVorgId) {
      const myAccts = persona.ownedAccounts || [];
      if (
        !myAccts.includes("*") &&
        !myAccts.some((a) => p.accountCodes?.includes(a))
      )
        return false;
    }
    // 5. 목적, 교육유형, 세부유형 필터
    if (_pbPurposeFilter && p.purpose !== _pbPurposeFilter) return false;
    if (_pbEduTypeFilter) {
      if (p.purpose === "external_personal") {
        if (p.selectedEduItem?.typeId !== _pbEduTypeFilter) return false;
      } else {
        if (!p.eduTypes || !p.eduTypes.includes(_pbEduTypeFilter)) return false;
      }
    }
    if (_pbSubTypeFilter && p.purpose === "external_personal") {
      if (p.selectedEduItem?.subId !== _pbSubTypeFilter) return false;
    }
    return true;
  });

  const TENANTS_LIST =
    typeof TENANTS !== "undefined"
      ? TENANTS
      : [...new Set(SERVICE_POLICIES.map((p) => p.tenantId))].map((id) => ({
          id,
          name: id,
        }));
  const tenantName =
    TENANTS_LIST.find((t) => t.id === activeTenantId)?.name ||
    activeTenantId ||
    "소속 회사";

  // 조회 가능한 제도그룹 목록
  const availVorgs = _pbTplList.filter(
    (g) => !activeTenantId || g.tenant_id === activeTenantId,
  );
  const vorgName =
    availVorgs.find((g) => g.id === pbVorgId)?.name ||
    pbVorgId ||
    "선택된 조직";

  // 조회 가능한 예산계정 목록
  const availAccounts = (() => {
    if (pbVorgId) {
      // active 필터 제거: 무예산 계정(uses_budget=false)도 정책에서 선택 가능해야 함
      return _pbAccountList.filter(
        (a) => a.virtual_org_template_id === pbVorgId,
      );
    }
    return _pbAccountList.filter(
      (a) =>
        a.code !== "COMMON-FREE" &&
        (activeTenantId ? a.tenant_id === activeTenantId : true),
    );
  })();

  // ── 목적/유형 필터 목록 산출 ─────────────────────────────
  const availPurposes = _pbServiceTypeFilter
    ? _PURPOSE_MAP[_pbServiceTypeFilter] || []
    : [...(_PURPOSE_MAP.learner || []), ...(_PURPOSE_MAP.operator || [])];
  const availEduTypes = _pbPurposeFilter
    ? _EDU_TYPE_MAP[_pbPurposeFilter] || []
    : [];
  const availSubTypes = _pbEduTypeFilter
    ? availEduTypes.find((t) => t.id === _pbEduTypeFilter)?.subs || []
    : [];

  const filterBar =
    isPlatform || isTenant || isBudgetOp || isBudgetAdmin
      ? `
<div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;box-shadow:0 1px 4px rgba(0,0,0,.05)">
  ${
    isPlatform
      ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
    <select id="pb-tenant-sel" onchange="_pbTenantFilter=this.value;_pbVorgFilter='';_pbAccountFilter='';_pbServiceTypeFilter='';_pbPurposeFilter='';_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:140px">
      <option value="">전체 회사</option>
      ${TENANTS_LIST.map((t) => `<option value="${t.id}" ${activeTenantId === t.id ? "selected" : ""}>${t.name || t.id}</option>`).join("")}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>`
      : `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
    <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;background:#F9FAFB;min-width:140px">
      <span style="font-size:12px">🏢</span>
      <span style="font-size:13px;font-weight:800;color:#374151">${tenantName}</span>
    </div>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>
  `
  }
  
  ${
    isBudgetOp || isBudgetAdmin
      ? `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">제도그룹</span>
    <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #C4B5FD;border-radius:10px;background:#F5F3FF;min-width:140px">
      <span style="font-size:12px">🔒</span>
      <span style="font-size:13px;font-weight:800;color:#7C3AED">${vorgName}</span>
    </div>
  </div>`
      : `
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">제도그룹</span>
    <select id="pb-group-sel" onchange="_pbVorgFilter=this.value;_pbAccountFilter='';_pbServiceTypeFilter='';_pbPurposeFilter='';_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 조직</option>
      ${availVorgs.map((g) => `<option value="${g.id}" ${pbVorgId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
    </select>
  </div>`
  }
  
  <div style="width:1px;height:28px;background:#E5E7EB"></div>
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">예산계정</span>
    <select id="pb-acct-sel" onchange="_pbAccountFilter=this.value"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:160px">
      <option value="">전체 계정</option>
      ${availAccounts.map((a) => `<option value="${a.code}" ${_pbAccountFilter === a.code ? "selected" : ""}>${a.name}</option>`).join("")}
    </select>
  </div>
  
  <div style="width:100%;height:1px;background:#E5E7EB;margin:6px 0"></div>

  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">서비스 유형</span>
    <select id="pb-svc-sel" onchange="_pbServiceTypeFilter=this.value;_pbPurposeFilter='';_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:#FAFAFA;cursor:pointer;appearance:auto;min-width:120px">
      <option value="">전체 유형</option>
      <option value="learner" ${_pbServiceTypeFilter === "learner" ? "selected" : ""}>📚 직접학습</option>
      <option value="operator" ${_pbServiceTypeFilter === "operator" ? "selected" : ""}>🎯 교육운영</option>
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>
  
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">목적</span>
    <select id="pb-purp-sel" onchange="_pbPurposeFilter=this.value;_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:${_pbServiceTypeFilter ? "#FAFAFA" : "#F9FAFB"};cursor:pointer;appearance:auto;min-width:140px">
      <option value="">전체 목적</option>
      ${availPurposes.map((p) => `<option value="${p.id}" ${_pbPurposeFilter === p.id ? "selected" : ""}>${p.label}</option>`).join("")}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>

  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">교육유형</span>
    <select id="pb-type-sel" onchange="_pbEduTypeFilter=this.value;_pbSubTypeFilter='';renderServicePolicy()" ${!_pbPurposeFilter ? "disabled" : ""}
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:${_pbPurposeFilter ? "#FAFAFA" : "#F3F4F6"};cursor:${_pbPurposeFilter ? "pointer" : "default"};appearance:auto;min-width:140px">
      <option value="">전체 유형</option>
      ${availEduTypes.map((t) => `<option value="${t.id}" ${_pbEduTypeFilter === t.id ? "selected" : ""}>${t.label}</option>`).join("")}
    </select>
  </div>
  <div style="width:1px;height:28px;background:#E5E7EB"></div>

  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">세부유형</span>
    <select id="pb-sub-sel" onchange="_pbSubTypeFilter=this.value" ${!_pbEduTypeFilter || availSubTypes.length === 0 ? "disabled" : ""}
      style="padding:8px 32px 8px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:700;color:#111827;background:${_pbEduTypeFilter && availSubTypes.length > 0 ? "#FAFAFA" : "#F3F4F6"};cursor:${_pbEduTypeFilter && availSubTypes.length > 0 ? "pointer" : "default"};appearance:auto;min-width:140px">
      <option value="">전체 세부유형</option>
      ${availSubTypes.map((s) => `<option value="${s.id}" ${_pbSubTypeFilter === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
    </select>
  </div>

  <button onclick="
    _pbTenantFilter=document.getElementById('pb-tenant-sel')?.value||_pbTenantFilter;
    _pbVorgFilter=document.getElementById('pb-group-sel')?.value||_pbVorgFilter;
    _pbAccountFilter=document.getElementById('pb-acct-sel')?.value||_pbAccountFilter;
    _pbServiceTypeFilter=document.getElementById('pb-svc-sel')?.value||_pbServiceTypeFilter;
    _pbPurposeFilter=document.getElementById('pb-purp-sel')?.value||_pbPurposeFilter;
    _pbEduTypeFilter=document.getElementById('pb-type-sel')?.value||_pbEduTypeFilter;
    _pbSubTypeFilter=document.getElementById('pb-sub-sel')?.value||_pbSubTypeFilter;
    renderServicePolicy()"
    style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,.35);white-space:nowrap;margin-left:auto">
    ● 조회
  </button>
  ${
    !isBudgetOp && !isBudgetAdmin
      ? `
  <button onclick="_pbTenantFilter='';_pbVorgFilter='';_pbAccountFilter='';_pbServiceTypeFilter='';_pbPurposeFilter='';_pbEduTypeFilter='';_pbSubTypeFilter='';renderServicePolicy()"
    style="padding:9px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;font-weight:700;background:white;cursor:pointer;color:#6B7280;white-space:nowrap">초기화</button>`
      : ""
  }
</div>`
      : "";

  // ── 테이블 행 생성 ──────────────────────────────────────────────────────────
  const policyRows = myPolicies
    .map((p, idx) => {
      const approver = _getPersonaByKey(
        p.approvalConfig?.apply?.finalApproverKey || p.approverPersonaKey,
      );
      const manager = _getPersonaByKey(p.managerPersonaKey);
      const accounts =
        (p.accountCodes || [])
          .map((c) => ACCOUNT_MASTER.find((a) => a.code === c)?.name || c)
          .join(", ") || "—";
      const pat = _patternFromPolicy(p);
      const pm = _PATTERN_META[pat] || _PATTERN_META["B"];
      const purposeLabel =
        [
          ...(_PURPOSE_MAP.learner || []),
          ...(_PURPOSE_MAP.operator || []),
        ].find((x) => x.id === p.purpose)?.label ||
        p.purpose ||
        "—";
      // ID 이스케이프: onclick 속성 내 작은따옴표 안전 처리
      const safeId = String(p.id || "")
        .replace(/'/g, "\\'")
        .replace(/\\/g, "\\\\");
      const safeName = String(p.name || "")
        .replace(/'/g, "\\'")
        .replace(/\\/g, "\\\\");
      const statusBg = p.status === "active" ? "#D1FAE5" : "#F3F4F6";
      const statusColor = p.status === "active" ? "#065F46" : "#9CA3AF";
      const statusLabel = p.status === "active" ? "운영중" : "중지";
      return `
<tr style="border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .12s" onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''" onclick="event.stopPropagation();startPolicyWizard('${safeId}')">
  <td style="padding:11px 14px;text-align:center;color:#9CA3AF;font-size:12px">${idx + 1}</td>
  <td style="padding:11px 14px">
    <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:3px">${p.name}</div>
    ${isPlatform ? `<span style="font-size:10px;padding:1px 7px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">${p.tenantId}</span>` : ""}
  </td>
  <td style="padding:11px 14px">
    <span style="font-size:11px;font-weight:800;padding:3px 9px;border-radius:6px;background:${pm.color}15;color:${pm.color};border:1px solid ${pm.color}30;white-space:nowrap">${pm.icon} ${pm.label}</span>
  </td>
  <td style="padding:11px 14px;font-size:12px;color:#374151">${purposeLabel}</td>
  <td style="padding:11px 14px;font-size:12px;color:#374151">${accounts}</td>
  <td style="padding:11px 14px;font-size:12px;color:#374151">${approver?.name || "—"}</td>
  <td style="padding:11px 14px;font-size:12px;color:#374151">${manager?.name || "—"}</td>
  <td style="padding:11px 14px">
    <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:${statusBg};color:${statusColor}">${statusLabel}</span>
  </td>
  <td style="padding:11px 14px;font-size:12px;color:#6B7280;white-space:nowrap">${p.createdAt || "—"}</td>
  <td style="padding:11px 14px;text-align:center">
    <div style="display:flex;gap:5px;justify-content:center">
      <button onclick="event.stopPropagation();startPolicyWizard('${safeId}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151">✏️ 수정</button>
      <button onclick="event.stopPropagation();deleteServicePolicy('${safeId}','${safeName}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer;font-weight:700">🗑️</button>
    </div>
  </td>
</tr>`;
    })
    .join("");

  el.innerHTML = `
<div class="bo-fade">
  ${typeof boVorgBanner === "function" ? boVorgBanner() : typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <h1 class="bo-page-title">🔧 교육지원 운영 규칙</h1>
      <p class="bo-page-sub">교육 서비스 흐름, 예산 연동, 결재라인을 하나의 정책으로 통합 관리</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      ${typeof pgGuideBtn === "function" ? pgGuideBtn("service-policy") : ""}
      <button onclick="startPolicyWizard(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
        <span style="font-size:16px">+</span> 새 정책 만들기
      </button>
    </div>
  </div>

  ${filterBar}
  <div>
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">정책 목록 (${myPolicies.length}개)</div>
    ${
      myPolicies.length === 0
        ? '<div style="padding:48px;text-align:center;color:#9CA3AF;background:white;border:1.5px solid #E5E7EB;border-radius:12px">정책이 없습니다. 새 정책을 만드세요.</div>'
        : `<div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280;width:46px">NO.</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:180px">정책명</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:140px">프로세스 패턴</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:130px">목적</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:120px">예산계정</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:80px">승인자</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;min-width:80px">관리자</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;width:70px">상태</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#374151;width:90px">등록일</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#374151;width:110px">관리</th>
              </tr>
            </thead>
            <tbody>
              ${policyRows}
            </tbody>
          </table>
        </div>`
    }
  </div>
</div>`;

  // ── 이벤트 처리: onclick 인라인 + data-* 속성 하이브리드 방식 적용 ──────────────
  // async 렌더링 함수 특성상 addEventListener 방식이 타이밍 문제로 등록되지 않을 수 있어
  // onclick 인라인으로 전환 (startPolicyWizard(null) 방식과 동일한 패턴)
}

function _getPersonaByKey(key) {
  return key ? BO_PERSONAS[key] : null;
}

// ── 위저드 시작 ───────────────────────────────────────────────────────────────
function startPolicyWizard(policyId) {
  _editPolicyId = policyId;
  _policyWizardStep = 0;
  if (policyId) {
    const existing = SERVICE_POLICIES.find((p) => p.id === policyId);
    _policyWizardData = existing ? JSON.parse(JSON.stringify(existing)) : {};

    // [DB MAPPING] 신규 stage_form_fields 맵핑 및 기존 _fields 복구 (하위 호환)
    if (!_policyWizardData.stageFormFields) {
      const sourceForms = _policyWizardData.stageFormIds || _policyWizardData.formSets || _policyWizardData.stage_form_ids;
      if (sourceForms && sourceForms._fields) {
        _policyWizardData.stageFormFields = sourceForms._fields;
      }
    }

    if (!_policyWizardData.approvalConfig) {
      // 레거시 마이그레이션: approvalThresholds → approvalConfig
      const old = _policyWizardData.approvalThresholds || [];
      const finalKey = _policyWizardData.approverPersonaKey || "";
      _policyWizardData.approvalConfig = {
        plan: {
          thresholds: JSON.parse(JSON.stringify(old)),
          finalApproverKey: finalKey,
        },
        apply: {
          thresholds: JSON.parse(JSON.stringify(old)),
          finalApproverKey: finalKey,
        },
        result: { thresholds: [], finalApproverKey: finalKey },
      };
    }
    if (!_policyWizardData.processPattern) {
      _policyWizardData.processPattern = _patternFromPolicy(_policyWizardData);
    }
    
    // [옵션 B 마이그레이션] 기존 '계획(plan)' 데이터를 '상시계획(ongoing)'으로 맵핑하고 '수요예측(forecast)'은 빈 값으로 유도
    if (_policyWizardData.stageFormFields && _policyWizardData.stageFormFields.plan) {
      if (!_policyWizardData.stageFormFields.ongoing) {
        _policyWizardData.stageFormFields.ongoing = JSON.parse(JSON.stringify(_policyWizardData.stageFormFields.plan));
      }
      if (!_policyWizardData.stageFormFields.forecast) {
        _policyWizardData.stageFormFields.forecast = [];
      }
    }
    
    if (_policyWizardData.approvalConfig && _policyWizardData.approvalConfig.plan) {
      if (!_policyWizardData.approvalConfig.ongoing) {
        _policyWizardData.approvalConfig.ongoing = JSON.parse(JSON.stringify(_policyWizardData.approvalConfig.plan));
      }
      if (!_policyWizardData.approvalConfig.forecast) {
        _policyWizardData.approvalConfig.forecast = { thresholds: [], finalApproverKey: "" };
      }
    }
    
    if (_policyWizardData.stageFormIds && _policyWizardData.stageFormIds.plan) {
      if (!_policyWizardData.stageFormIds.ongoing) {
        _policyWizardData.stageFormIds.ongoing = JSON.parse(JSON.stringify(_policyWizardData.stageFormIds.plan));
      }
      if (!_policyWizardData.stageFormIds.forecast) {
        _policyWizardData.stageFormIds.forecast = [];
      }
    }
  } else {
    _policyWizardData = {
      id: "POL-" + Date.now(),
      tenantId: boCurrentPersona.tenantId,
      scopeTenantId: boCurrentPersona.tenantId || "",
      vorgTemplateId: boCurrentPersona.domainId || "",
      name: "",
      desc: "",
      targetType: "",
      purpose: "",
      eduTypes: [],
      selectedEduItem: null,
      eduSubTypes: {},
      processPattern: "",
      flow: "apply-result",
      budgetLinked: true,
      applyMode: "holding",
      accountCodes: [],
      virtualEduOrgId: "",
      stageFormIds: { forecast: [], ongoing: [], apply: [], result: [] },
      approvalConfig: {
        forecast: { thresholds: [], finalApproverKey: "" },
        ongoing: { thresholds: [], finalApproverKey: "" },
        apply: { thresholds: [], finalApproverKey: "" },
        result: { thresholds: [], finalApproverKey: "" },
      },
      managerPersonaKey:
        Object.keys(BO_PERSONAS).find(
          (k) => BO_PERSONAS[k] === boCurrentPersona,
        ) || "",
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    // 목록 페이지의 필터값을 새 정책 초기값으로 pre-fill
    if (_pbTenantFilter) _policyWizardData.scopeTenantId = _pbTenantFilter;
    if (_pbVorgFilter) _policyWizardData.vorgTemplateId = _pbVorgFilter;
    if (_pbAccountFilter) _policyWizardData.accountCodes = [_pbAccountFilter];
  }
  renderPolicyWizard();
}

// ── 위저드 렌더링 ─────────────────────────────────────────────────────────────
function renderPolicyWizard() {
  const el = document.getElementById("bo-content");
  const steps = ["기본 설정", "양식", "결재라인"];
  const TOTAL = steps.length - 1;
  const d = _policyWizardData;
  const persona = boCurrentPersona;

  const stepBar = steps
    .map(
      (s, i) => `
<div style="display:flex;align-items:center;gap:0">
  <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;
      background:${i < _policyWizardStep ? "#059669" : i === _policyWizardStep ? "#7C3AED" : "#E5E7EB"};
      color:${i <= _policyWizardStep ? "white" : "#9CA3AF"}">${i < _policyWizardStep ? "✓" : i + 1}</div>
    <div style="font-size:10px;font-weight:700;color:${i === _policyWizardStep ? "#7C3AED" : i < _policyWizardStep ? "#059669" : "#9CA3AF"};white-space:nowrap">${s}</div>
  </div>
  ${i < steps.length - 1 ? `<div style="width:20px;height:2px;background:${i < _policyWizardStep ? "#059669" : "#E5E7EB"};margin-bottom:16px"></div>` : ""}
</div>`,
    )
    .join("");

  // ── 이전 선택값 요약 배너 (step > 0일 때 표시) ─────────────────────────────
  const _sumTenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const _sumVorgs = typeof _pbTplList !== "undefined" ? _pbTplList : [];
  const _sumAccts = typeof ACCOUNT_MASTER !== "undefined" ? ACCOUNT_MASTER : [];
  const sumTenant =
    _sumTenants.find((t) => t.id === d.scopeTenantId)?.name ||
    d.scopeTenantId ||
    "";
  const sumGroup =
    _sumVorgs.find((g) => g.id === d.vorgTemplateId)?.name ||
    d.vorgTemplateId ||
    "";
  const sumAccts = (d.accountCodes || [])
    .map((c) => _sumAccts.find((a) => a.code === c)?.name || c)
    .join(", ");
  const sumPat = d.processPattern
    ? `${_PATTERN_META[d.processPattern]?.icon || ""} 패턴${d.processPattern}`
    : "";
  const summaryChips = [
    sumTenant &&
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:11px;font-weight:700;color:#1E40AF">🏢 ${sumTenant}</span>`,
    sumGroup &&
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#F5F3FF;border:1px solid #DDD6FE;font-size:11px;font-weight:700;color:#5B21B6">🛡️ ${sumGroup}</span>`,
    sumAccts &&
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#ECFDF5;border:1px solid #A7F3D0;font-size:11px;font-weight:700;color:#065F46">💳 ${sumAccts}</span>`,
    d.name &&
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FFFBEB;border:1px solid #FDE68A;font-size:11px;font-weight:700;color:#92400E">📋 ${d.name}</span>`,
    sumPat &&
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:#FEF3C7;border:1px solid #FCD34D;font-size:11px;font-weight:700;color:#B45309">${sumPat}</span>`,
  ]
    .filter(Boolean)
    .join("");
  const summaryBar =
    _policyWizardStep > 0 && summaryChips
      ? `
<div style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px">
  <span style="font-size:10px;font-weight:900;color:#9CA3AF;white-space:nowrap;line-height:24px">현재 설정:</span>
  ${summaryChips}
</div>`
      : "";

  let stepContent = "";

  // ── Step 0: 정책 정의 (정책명 + 대상자 + 목적 + 교육유형 통합) ──────────────
  if (_policyWizardStep === 0) {
    const purposes = d.targetType ? _PURPOSE_MAP[d.targetType] || [] : [];
    const types = d.purpose ? _EDU_TYPE_MAP[d.purpose] || [] : [];
    const isPersonal = d.purpose === "external_personal";
    if (!d.eduSubTypes) d.eduSubTypes = {};
    if (!d.selectedEduItem) d.selectedEduItem = null;
    const purposeLabel =
      [...(_PURPOSE_MAP.learner || []), ...(_PURPOSE_MAP.operator || [])].find(
        (x) => x.id === d.purpose,
      )?.label || d.purpose;

    // ── 정책명 + 설명 ──
    let nameBlock = `
  <div>
    <label class="bo-label">정책명 <span style="color:#EF4444">*</span></label>
    <input id="wiz-name" type="text" value="${d.name || ""}" placeholder='예: "HAE 전사교육예산 정규교육 지원정책"'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
  </div>
  <div>
    <label class="bo-label">정책 설명</label>
    <input id="wiz-desc" type="text" value="${d.desc || ""}" placeholder='학습자에게 표시될 설명'
      style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;box-sizing:border-box"/>
  </div>`;

    // ── 서비스 유형 ──
    let targetBlock = `
  <div>
    <label class="bo-label">서비스 유형 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        {
          v: "learner",
          icon: "📚",
          l: "직접학습",
          d: "개인 학습자가 직접 참여하는 교육 서비스",
        },
        {
          v: "operator",
          icon: "🎯",
          l: "교육운영",
          d: "교육과정을 기획하거나 운영하는 서비스",
        },
      ]
        .map(
          (o) => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${d.targetType === o.v ? "#7C3AED" : "#E5E7EB"};
                    background:${d.targetType === o.v ? "#F5F3FF" : "white"};cursor:pointer"
             onclick="_wizSaveStep0Inputs();_policyWizardData.targetType='${o.v}';_policyWizardData.purpose='';_policyWizardData.eduTypes=[];_policyWizardData.selectedEduItem=null;renderPolicyWizard()">
        <input type="radio" name="wiz-target" value="${o.v}" ${d.targetType === o.v ? "checked" : ""} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${d.targetType === o.v ? "#7C3AED" : "#374151"}">${o.icon} ${o.l}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`,
        )
        .join("")}
    </div>
  </div>`;

    // ── 목적 (대상자 선택 후 표시) ──
    let purposeBlock = "";
    if (d.targetType && purposes.length > 0) {
      purposeBlock = `
  <div style="border-top:1px dashed #E5E7EB;padding-top:16px">
    <label class="bo-label">교육 목적 <span style="color:#EF4444">*</span></label>
    ${purposes
      .map(
        (p) => `
    <label style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;margin-bottom:6px;
                  border:2px solid ${d.purpose === p.id ? "#7C3AED" : "#E5E7EB"};
                  background:${d.purpose === p.id ? "#F5F3FF" : "white"};cursor:pointer"
           onclick="_wizSaveStep0Inputs();_policyWizardData.purpose='${p.id}';_policyWizardData.eduTypes=[];_policyWizardData.selectedEduItem=null;renderPolicyWizard()">
      <input type="radio" name="wiz-purpose" value="${p.id}" ${d.purpose === p.id ? "checked" : ""} style="margin:0">
      <span style="font-size:13px;font-weight:800;color:${d.purpose === p.id ? "#7C3AED" : "#374151"}">${p.label}</span>
    </label>`,
      )
      .join("")}
  </div>`;
    }

    // ── 교육유형 (목적 선택 후 표시) ──
    let eduTypeBlock = "";
    if (d.purpose && types.length > 0) {
      if (isPersonal) {
        // 개인직무사외학습: 단일 선택(라디오)
        eduTypeBlock = `
  <div style="border-top:1px dashed #E5E7EB;padding-top:16px">
    <label class="bo-label">교육 유형 세부 항목 <span style="font-size:10px;color:#9CA3AF">(하나만 선택)</span></label>
    ${types
      .map((t) => {
        if (!t.subs || !t.subs.length)
          return `
    <div style="border-radius:10px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:6px">
      <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer"
             onclick="_wizSaveStep0Inputs();_selectEduItem('${t.id}','')">
        <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId === t.id && !d.selectedEduItem?.subId ? "checked" : ""} style="margin:0;flex-shrink:0">
        <span style="font-size:13px;font-weight:800;color:${d.selectedEduItem?.typeId === t.id ? "#7C3AED" : "#374151"}">${t.label}</span>
      </label>
    </div>`;
        return `
    <div style="border-radius:10px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:6px">
      <div style="padding:10px 16px;background:#F9FAFB;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:900;color:#374151">${t.label}</span>
        <span style="font-size:10px;color:#9CA3AF">${t.subs.map((s) => s.label).join(" · ")}</span>
      </div>
      <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px">
        ${t.subs
          .map(
            (s) => `
        <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;
                      border:1.5px solid ${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? "#7C3AED" : "#E5E7EB"};
                      background:${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? "#F5F3FF" : "white"};cursor:pointer"
               onclick="_wizSaveStep0Inputs();_selectEduItem('${t.id}','${s.id}')">
          <input type="radio" name="wiz-edu-item" ${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? "checked" : ""} style="margin:0">
          <span style="font-size:13px;font-weight:700;color:${d.selectedEduItem?.typeId === t.id && d.selectedEduItem?.subId === s.id ? "#7C3AED" : "#374151"}">${s.label}</span>
        </label>`,
          )
          .join("")}
      </div>
    </div>`;
      })
      .join("")}
  </div>`;
      } else {
        // 기타 목적
        const isOperator = d.targetType === "operator";
        eduTypeBlock = `
  <div style="border-top:1px dashed #E5E7EB;padding-top:16px">
    <label class="bo-label">교육 유형 <span style="font-size:10px;color:#9CA3AF">${isOperator ? "(하나만 선택)" : "(복수 선택 가능)"}</span></label>
    <div style="display:grid;gap:6px">
      ${types
        .map((t) => {
          const isChecked = (d.eduTypes || []).includes(t.id);
          return `
      <div style="border-radius:10px;border:1.5px solid ${isChecked ? "#7C3AED" : "#E5E7EB"};background:${isChecked ? "#F5F3FF" : "white"};overflow:hidden">
        <label style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer" onclick="_wizSaveStep0Inputs();${isOperator ? `_policyWizardData.eduTypes=['${t.id}'];if(_policyWizardData.eduSubTypes) _policyWizardData.eduSubTypes={};renderPolicyWizard()` : `_toggleEduType('${t.id}')`}">
          <input type="${isOperator ? "radio" : "checkbox"}" ${isOperator ? 'name="wiz-edu-op"' : ""} ${isChecked ? "checked" : ""} style="margin:0;flex-shrink:0">
          <div style="font-size:13px;font-weight:800;color:${isChecked ? "#7C3AED" : "#374151"}">${t.label}</div>
        </label>
      </div>`;
        })
        .join("")}
    </div>
  </div>`;
      }
    }

    let block0 = `
<div style="display:grid;gap:18px">
  <div style="padding:12px 16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;font-size:12px;color:#4B5563">
    💡 정책의 <strong>이름, 서비스 유형, 교육 목적, 교육유형</strong>을 정의합니다.
  </div>
  ${nameBlock}
  ${targetBlock}
  ${purposeBlock}
  ${eduTypeBlock}
</div>`;

    // ── Step 1: 정책 범위 (회사 → 가상교육조직 → 예산계정) ────────────────────
  // } else if (_policyWizardStep === 1) {
    const isPlatform = persona.role === "platform_admin";
    const isTenant = ["tenant_global_admin"].includes(persona.role);
    const isBudgetOp = [
      "budget_op_manager",
      "budget_hq",
      "budget_global_admin",
    ].includes(persona.role);

    const _TENANTS_LIST = typeof TENANTS !== "undefined" ? TENANTS : [];
    const _VORG_LIST = typeof _pbTplList !== "undefined" ? _pbTplList : [];

    const scopeTenantId =
      d.scopeTenantId || (isTenant || isBudgetOp ? persona.tenantId : "");
    const scopeVorgs = _VORG_LIST.filter((g) =>
      scopeTenantId ? g.tenant_id === scopeTenantId : true,
    );

    const scopeVorgId =
      d.vorgTemplateId || (isBudgetOp ? persona.domainId || "" : "");
    const scopeVorg = scopeVorgs.find((g) => g.id === scopeVorgId);

    // active 필터 제거: 무예산 계정(uses_budget=false)도 정책에서 선택 가능
    const scopeAccts = scopeVorgId
      ? _pbAccountList.filter((a) => a.virtual_org_template_id === scopeVorgId)
      : [];

    let block1 = `
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
  <!-- 1. 회사 -->
  <div>
    <label class="bo-label" style="font-size:12px;margin-bottom:6px">회사 선택 <span style="color:#EF4444">*</span></label>
    <select ${isPlatform ? 'onchange="_policyWizardData.scopeTenantId=this.value;_policyWizardData.vorgTemplateId=\'\';_policyWizardData.accountCodes=[];renderPolicyWizard()"' : "disabled"}
      style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700;background:${isPlatform ? 'white' : '#F3F4F6'};color:${isPlatform ? '#111827' : '#6B7280'}">
      <option value="">— 회사 선택 —</option>
      ${_TENANTS_LIST.map((t) => `<option value="${t.id}" ${scopeTenantId === t.id ? "selected" : ""}>${t.name || t.id}</option>`).join("")}
    </select>
  </div>
  
  <!-- 2. 제도그룹 (가상교육조직) -->
  <div>
    <label class="bo-label" style="font-size:12px;margin-bottom:6px">제도그룹 선택 <span style="color:#EF4444">*</span></label>
    <select ${isBudgetOp ? "disabled" : 'onchange="_policyWizardData.vorgTemplateId=this.value;_policyWizardData.accountCodes=[];_policyWizardData.budgetLinked=true;renderPolicyWizard()"'}
      style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700;background:${isBudgetOp ? '#F3F4F6' : 'white'};color:${isBudgetOp ? '#6B7280' : '#111827'}">
      <option value="">— 제도그룹 선택 —</option>
      ${scopeVorgs.map((g) => `<option value="${g.id}" ${scopeVorgId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
    </select>
  </div>

  <!-- 3. 예산계정 -->
  <div>
    <label class="bo-label" style="font-size:12px;margin-bottom:6px">예산계정 선택 <span style="color:#EF4444">*</span></label>
    <select onchange="_selectPolicyAcct(this.value)"
      style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:700;background:white">
      <option value="">— 예산계정 선택 —</option>
      ${scopeAccts.map((a) => {
        const prefix = a.code === "COMMON-FREE" ? "📝 " : a.budgetLinked === false ? "" : "💳 ";
        return `<option value="${a.code}" ${(d.accountCodes || [])[0] === a.code ? "selected" : ""}>${prefix}${a.name}</option>`;
      }).join("")}
    </select>
  </div>
</div>`;

    // ── Step 2: 패턴 ─────────────────────────────────────────────────────────────
  // } else if (_policyWizardStep === 2) {
    const isNoBudget = !d.budgetLinked;
    const selAcctName =
      (d.accountCodes || [])
        .map((c) => ACCOUNT_MASTER.find((a) => a.code === c)?.name || c)
        .join(", ") || "—";

    // 전체 5개 패턴 항상 표시 — 예산 여부로 선택 가능 그룹만 분리
    const allPatterns = [
      {
        v: "A",
        icon: "📊",
        l: "패턴A: 계획→신청→결과",
        color: "#7C3AED",
        d: isNoBudget ? "무예산. 사전계획 후 신청 및 결과보고 진행." : "고통제형. 사전계획 필수, 예산 가점유 후 실차감.",
      },
      {
        v: "B",
        icon: "📝",
        l: "패턴B: 신청→결과",
        color: "#1D4ED8",
        d: isNoBudget ? "무예산. 사전 신청 승인 후 이력 적재 및 결과보고." : "자율신청형. 신청 승인 시 가점유, 결과 후 실차감.",
      },
      {
        v: "C",
        icon: "🧾",
        l: "패턴C: 결과 단독(후정산/결과보고)",
        color: "#D97706",
        d: isNoBudget ? "무예산. 자비학습 후 결과 증빙 제출 전용." : "선지불 후정산. 개인 카드 결제 후 영수증 첨부. 승인 즉시 예산 차감.",
      },
    ];

    const renderPatternItem = (o) => {
      const isSelected = d.processPattern === o.v;
      const borderColor = isSelected ? o.color : "#E5E7EB";
      const bgColor = isSelected ? o.color + "15" : "white";
      const textColor = isSelected ? o.color : "#374151";
      const onclick = `onclick="_policyWizardData.processPattern='${o.v}';_setPatternDefaults('${o.v}');renderPolicyWizard()"`;

      return `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:14px 16px;border-radius:10px;
                    border:2px solid ${borderColor};background:${bgColor};cursor:pointer"
             ${onclick}>
        <input type="radio" name="wiz-pattern" value="${o.v}" ${isSelected ? "checked" : ""} style="margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:13px;color:${textColor};display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${o.icon} ${o.l}
          </div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${o.d}</div>
        </div>
      </label>`;
    };

    let block2 = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:${isNoBudget ? "#F0FDF4" : "#EFF6FF"};border:1px solid ${isNoBudget ? "#A7F3D0" : "#BFDBFE"};border-radius:10px;display:flex;align-items:center;gap:10px;font-size:12px">
    ${isNoBudget ? '📝 <strong style="color:#065F46">무예산</strong>' : '💳 <strong style="color:#1E40AF">예산 연동</strong>'}
    <span style="color:#6B7280">|</span>
    <span style="color:#374151;font-weight:700">${selAcctName}</span>
  </div>
  <div>
    <label class="bo-label">프로세스 패턴 <span style="color:#EF4444">*</span></label>
    <div style="display:grid;gap:8px;margin-bottom:14px">
      ${allPatterns.map(renderPatternItem).join("")}
    </div>
  </div>
</div>`;

    stepContent = `
<div style="display:grid;gap:32px;padding-bottom:20px">
  ${block1}
  <hr style="border-top:1.5px dashed #E5E7EB;margin:0"/>
  ${block0}
  <hr style="border-top:1.5px dashed #E5E7EB;margin:0"/>
  ${block2}
</div>`;

    // ── Step 1: 단계별 양식 선택 ──────────────────────────────────────────────
  } else if (_policyWizardStep === 1) {
    // ── [Phase F-2] 인라인 양식 편집기 ───────────────────────────────────────
    // 기존 외부 양식 선택 방식 대신, 정책 위저드 내에서 직접 필드를 정의
    const rawStages = _PATTERN_STAGES[d.processPattern] || ["apply"];
    // forecast와 ongoing을 plan 하나로 합침
    const stages = [];
    if (rawStages.includes("forecast") || rawStages.includes("ongoing")) {
      stages.push("plan");
    }
    if (rawStages.includes("apply")) stages.push("apply");
    if (rawStages.includes("result")) stages.push("result");

    const stageLabel = { plan: "📑 계획", apply: "📝 신청", result: "📄 결과" };
    const stageColor = { plan: "#7C3AED", apply: "#1D4ED8", result: "#059669" };

    // 무예산 판별 (uses_budget=false 계정 → 비용 필드 전체 disable)
    const _acctCode = (d.accountCodes || [])[0] || "";
    const _acctInDb = (_pbAccountList || []).find((a) => a.code === _acctCode);
    const _isNoBudget =
      d.budgetLinked === false ||
      (_acctInDb && _acctInDb.uses_budget === false) ||
      ["D", "E"].includes(d.processPattern);

    // 인라인 필드 정의 저장소 초기화 (stageFormFields: { plan: {}, apply: {}, result: {} })
    if (!d.stageFormFields) d.stageFormFields = {};
    stages.forEach((s) => {
      if (!d.stageFormFields[s]) {
        // 기존에 forecast나 ongoing으로 저장된 데이터가 있다면 plan으로 마이그레이션
        if (s === "plan") {
           d.stageFormFields.plan = d.stageFormFields.ongoing || d.stageFormFields.forecast || {};
        } else {
           d.stageFormFields[s] = {};
        }

        // 기본 필드 활성화 상태 초기화 (비어있는 경우에만)
        if (Object.keys(d.stageFormFields[s]).length === 0) {
          d.stageFormFields[s] = {
          // 기본정보 (필수 — 항상 on, disable 불가)
          edu_type: true,
          is_overseas: true,
          edu_name: true,
          // L1 거버넌스 필드
          edu_category: true,
          // 교육상세 (토글)
          headcount: false,
          venue_type: true,
          edu_days: true,
          planned_rounds: s === "plan",
          start_end_date: true,
          edu_org: s !== "result",
          apply_reason: s === "apply",
          elearning_fields: false,
          consignment_org: false,
          plan_content: false,
          // Provide 필드 (BO작성 → FO읽기전용)
          prov_guide: s !== "result",
          prov_materials: s !== "result",
          prov_venue: s !== "result",
          prov_instructor: s !== "result",
          prov_pass: s === "result",
          prov_feedback: s === "result",
          // 비용항목 (무예산 시 전체 disable)
          requested_budget: s !== "result" && !_isNoBudget,
          calc_grounds: s !== "result" && !_isNoBudget,
          reimbursement: s === "result" && !_isNoBudget,
          // 결과항목 (result 전용)
          completion_rate: s === "result",
          satisfaction: s === "result",
          actual_cost: s === "result" && !_isNoBudget,
        };
        }
      }
    });

    // ── 단계별 탭 ─────────────────────────────────────────────────────────
    const activeTab = d._formTab || stages[0];

    const tabHtml = stages
      .map(
        (s) =>
          `<button onclick="_policyWizardData._formTab='${s}';renderPolicyWizard()"
            style="padding:8px 18px;border-radius:8px;border:2px solid ${s === activeTab ? stageColor[s] : "#E5E7EB"};
                   background:${s === activeTab ? stageColor[s] + "12" : "white"};
                   color:${s === activeTab ? stageColor[s] : "#6B7280"};font-weight:${s === activeTab ? "900" : "600"};
                   font-size:12px;cursor:pointer;transition:all .15s">${stageLabel[s]}</button>`,
      )
      .join("");

    // ── 현재 탭의 필드 정의 ────────────────────────────────────────────────
    const _flds = d.stageFormFields[activeTab] || {};
    const sc = stageColor[activeTab];

    // 필드 토글 렌더러
    const _fieldRow = (key, label, icon, required = false, disabled = false, disabledReason = "") => {
      const isOn = required ? true : !!_flds[key];
      const isDisabled = required || disabled;
      return `
<div style="display:flex;align-items:center;justify-content:space-between;
            padding:10px 14px;border-radius:10px;border:1.5px solid ${isOn ? sc + "40" : "#F3F4F6"};
            background:${isDisabled && !required ? "#F9FAFB" : isOn ? sc + "08" : "white"};
            opacity:${isDisabled && !required ? "0.55" : "1"};transition:all .15s">
  <div style="display:flex;align-items:center;gap:8px">
    <span style="font-size:15px">${icon}</span>
    <div>
      <div style="font-size:12px;font-weight:${required ? "900" : "700"};color:${isOn ? sc : "#374151"}">
        ${label}${required ? ' <span style="font-size:9px;padding:1px 6px;border-radius:4px;background:#EFF6FF;color:#1D4ED8;font-weight:700">필수</span>' : ""}
      </div>
      ${disabledReason ? `<div style="font-size:10px;color:#9CA3AF;margin-top:1px">${disabledReason}</div>` : ""}
    </div>
  </div>
  <div style="position:relative;width:40px;height:22px;cursor:${isDisabled ? "not-allowed" : "pointer"}"
       ${isDisabled ? "" : `onclick="_toggleInlineField('${activeTab}','${key}');renderPolicyWizard()"`}>
    <div style="position:absolute;inset:0;border-radius:11px;background:${isOn ? sc : "#D1D5DB"};transition:background .2s"></div>
    <div style="position:absolute;top:2px;left:${isOn ? "20px" : "2px"};width:18px;height:18px;border-radius:50%;background:white;
                box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s"></div>
  </div>
</div>`;
    };

    // 섹션 헤더
    const _sectionHeader = (title, color = "#374151") =>
      `<div style="font-size:10px;font-weight:900;color:${color};letter-spacing:.06em;margin-top:4px;margin-bottom:6px;padding-left:2px">${title}</div>`;

    // 비용 섹션 비활성 안내
    const noBudgetBanner = _isNoBudget
      ? `<div style="padding:10px 14px;background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;display:flex;align-items:center;gap:8px">
           <span style="font-size:16px">🚫</span>
           <div>
             <div style="font-size:11px;font-weight:800;color:#DC2626">비용 필드 비활성화</div>
             <div style="font-size:10px;color:#9CA3AF;margin-top:1px">무예산 계정 또는 이력 패턴(D/E) — 비용 관련 필드는 사용되지 않습니다</div>
           </div>
         </div>`
      : "";

    // 단계별 필드 구성
    const planFields = `
${_sectionHeader("📋 기본정보 (필수 고정)", sc)}
${activeTab === "plan" ? _fieldRow("is_continuing", "전년도 계속 여부", "🔁") : ""}
${_fieldRow("edu_name", "교육과정명", "📌", true)}
${_fieldRow("learning_objective", "교육목표/내용/대상", "🎯")}
${_fieldRow("edu_category", "필수구분 (법정/핵심 등)", "📑")}
${_fieldRow("manager_info", "담당자 정보 (유저 검색)", "👤")}
${(activeTab === "apply" && _policyWizardData.processPattern === "A") ? _sectionHeader("🔗 연동정보", "#374151") + "\n" + _fieldRow("multi_plan_link", "교육계획 불러오기 (복수 연동)", "🔗") : ""}
${_sectionHeader("📅 일정정보", "#374151")}
${_fieldRow("start_end_date", "교육기간", "📅")}
${_fieldRow("edu_days", "교육일수", "📆")}
${activeTab !== "result" ? _fieldRow("has_accommodation", "숙박여부", "🛏️") : ""}
${activeTab !== "result" ? _fieldRow("lunch_provided", "중식제공여부", "🍱") : ""}
${activeTab === "plan" ? _fieldRow("planned_rounds", "예상 차수", "🔄") : ""}
${activeTab === "plan" ? _fieldRow("hours_per_round", "차수별 학습시간", "⏳") : ""}
${_sectionHeader("👥 대상자정보", "#374151")}
${_fieldRow("target_audience", "교육대상", "🎯")}
${_fieldRow("headcount", "참가인원", "👥")}
${activeTab === "plan" ? _fieldRow("planned_headcount", "참가 예상 인원", "👥") : ""}
${_sectionHeader("🏛️ 장소정보", "#374151")}
${_fieldRow("is_overseas", "국내/해외 구분", "🌐", true)}
${activeTab !== "result" ? _fieldRow("venue_type", "장소유형", "🏛️") : ""}
${activeTab !== "result" ? _fieldRow("education_region", "교육지역", "📍") : ""}
${activeTab !== "result" ? _fieldRow("edu_org", "교육기관", "🏫") : ""}
${activeTab !== "result" ? _fieldRow("elearning_fields", "이러닝 플랫폼 및 URL", "💻") : ""}
${_fieldRow("education_format", "교육형태 (온/오프라인)", "💻")}
${_sectionHeader("📝 기타정보", "#374151")}
${activeTab !== "result" ? _fieldRow("instructor_name", "강사명", "👨‍🏫") : ""}
${_fieldRow("prov_instructor", "강사정보", "👨‍🏫")}
${activeTab === "apply" ? _fieldRow("apply_reason", "신청사유", "💬") : ""}
${_sectionHeader("📎 첨부파일", "#4B5563")}
${_fieldRow("supporting_docs", "첨부파일", "📎")}
${noBudgetBanner}
${_sectionHeader("💰 비용항목", _isNoBudget ? "#9CA3AF" : "#059669")}
${activeTab !== "result" ? _fieldRow("is_paid_education", "유료교육여부", "💳", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "") : ""}
${activeTab !== "result" ? _fieldRow("is_ei_eligible", "고용보험 환급 여부", "💼", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "") : ""}
${activeTab !== "result" ? _fieldRow("ei_refund_amount", "고용보험 환급액", "💵", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "") : ""}
${activeTab !== "result" ? _fieldRow("requested_budget", "계획/신청 금액", "💵", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "") : ""}
${activeTab !== "result" ? _fieldRow("calc_grounds", "세부산출근거", "📐", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "") : ""}`;

    const resultOnlyFields = `
${_sectionHeader("📋 기본정보 (필수 고정)", sc)}
${_fieldRow("edu_name", "교육과정명", "📌", true)}
${_sectionHeader("📊 결과정보", "#374151")}
${_fieldRow("headcount", "실제 참가인원", "👥")}
${_fieldRow("edu_category", "필수구분 (법정/핵심 등)", "📑")}
${_fieldRow("start_end_date", "교육기간", "📅")}
${_fieldRow("actual_hours", "실제 학습시간", "⏳")}
${_fieldRow("attendance_rate", "출석률 (%)", "📈")}
${_fieldRow("completion_rate", "수료율", "✅")}
${_fieldRow("satisfaction", "만족도", "⭐")}
${_fieldRow("review_comment", "교육소감", "📝")}
${_fieldRow("work_application_plan", "업무적용계획", "🚀")}
${_sectionHeader("📎 증빙/첨부항목", "#4B5563")}
${_fieldRow("completion_cert", "수료증 파일", "🎓")}
${_fieldRow("expense_receipt", "증빙서류 파일", "🧾")}
${_sectionHeader("📢 제공항목 (FO 읽기전용)", "#2563EB")}
${_fieldRow("prov_pass", "합격/수료 여부", "🏅")}
${_fieldRow("prov_feedback", "관리자 피드백", "💬")}
${noBudgetBanner}
${_sectionHeader("💰 비용항목", _isNoBudget ? "#9CA3AF" : "#059669")}
${_fieldRow("actual_cost", "실제 집행비용", "💳", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "")}
${_fieldRow("reimbursement", "환급/정산 처리", "🔁", false, _isNoBudget, _isNoBudget ? "무예산 계정" : "")}`;

    const currentFields = activeTab === "result" ? resultOnlyFields : planFields;

    // 완성도 요약 (단계별 on 필드 수)
    const _summaryCnt = (s) => {
      const f = d.stageFormFields[s] || {};
      return Object.values(f).filter(Boolean).length;
    };
    const summaryPanels = stages
      .map((s) => {
        const cnt = _summaryCnt(s);
        const isActive = s === activeTab;
        return `<div onclick="_policyWizardData._formTab='${s}';renderPolicyWizard()"
                     style="flex:1;padding:10px 12px;border-radius:10px;border:2px solid ${isActive ? stageColor[s] : "#E5E7EB"};
                            background:${isActive ? stageColor[s] + "08" : "white"};text-align:center;cursor:pointer">
          <div style="font-size:10px;font-weight:700;color:${stageColor[s]}">${stageLabel[s]}</div>
          <div style="font-size:18px;font-weight:900;color:${stageColor[s]};margin-top:2px">${cnt}</div>
          <div style="font-size:9px;color:#9CA3AF">필드 활성</div>
        </div>`;
      })
      .join("");

    stepContent = `
<div style="display:grid;gap:14px">
  <!-- 안내 배너 -->
  <div style="padding:10px 16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;color:#1E40AF;display:flex;align-items:center;gap:8px">
    <span style="font-size:16px">📋</span>
    <span><strong>인라인 양식 편집기</strong> — 각 단계에서 사용할 필드를 직접 켜고 끕니다. 필수 필드는 항상 활성화됩니다.</span>
  </div>

  <!-- 무예산 / 이력 패턴 안내 -->
  ${_isNoBudget ? `<div style="padding:8px 14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:11px;color:#92400E;display:flex;align-items:center;gap:6px">
    ⚠️ <strong>무예산 정책(QF-08)</strong> — 비용 필드는 모두 비활성화됩니다.
  </div>` : ""}

  <!-- 완성도 요약 -->
  <div style="display:flex;gap:8px">${summaryPanels}</div>

  <!-- 단계 탭 -->
  <div style="display:flex;gap:8px;flex-wrap:wrap">${tabHtml}</div>

  <!-- 현재 탭 필드 편집기 -->
  <div style="background:white;border:1.5px solid ${sc}30;border-radius:14px;padding:16px;display:grid;gap:8px">
    <div style="font-size:13px;font-weight:900;color:${sc};margin-bottom:4px">${stageLabel[activeTab]} 양식 필드</div>
    ${currentFields}
    
    <!-- 저장 및 미리보기 컨트롤 -->
    <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #E5E7EB;display:flex;justify-content:flex-end;gap:8px">
      <button onclick="_previewFoForm('${activeTab}')" style="padding:8px 14px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;color:#374151;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px">
        <span>🔍</span> 폼 미리보기
      </button>
      <button onclick="_saveInlineForm('${activeTab}')" style="padding:8px 14px;border-radius:8px;border:none;background:${sc};color:white;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 4px ${sc}40">
        <span>💾</span> 양식 임시저장
      </button>
    </div>
  </div>

  <!-- 안내 -->
  <div style="padding:8px 14px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;font-size:10px;color:#9CA3AF">
    💡 토글 설정은 FO 사용자 화면에 즉시 반영됩니다. 정책 저장 시 <code>stageFormFields</code>에 기록됩니다.
  </div>
</div>`;


    // ── Step 2: 결재라인 ──────────────────────────────────────────────────────
  } else if (_policyWizardStep === 2) {
    const stages = _PATTERN_STAGES[d.processPattern] || ["apply"];
    const stageLabel = { forecast: "📈 수요예측", ongoing: "📊 상시계획", apply: "📝 신청", result: "📄 결과" };
    const stageColor = { forecast: "#8B5CF6", ongoing: "#7C3AED", apply: "#1D4ED8", result: "#059669" };
    if (!d.approvalConfig) d.approvalConfig = {};
    const _LEVELS = [
      { key: "team_leader", label: "팀장" },
      { key: "director", label: "실장" },
      { key: "division_head", label: "사업부장" },
      { key: "center_head", label: "센터장" },
      { key: "hq_head", label: "본부장" },
    ];

    stepContent = `
<div style="display:grid;gap:16px">
  <div style="padding:12px 16px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E">
    💡 각 단계별 결재라인을 설정하세요. 금액 구간별 결재자를 지정하고, 통합결재 시 협조처를 추가할 수 있습니다.
  </div>

  ${stages
    .map((s) => {
      const c = d.approvalConfig[s] || {
        thresholds: [],
        approvalType: "platform",
        coopTeams: [],
      };
      if (!d.approvalConfig[s]) d.approvalConfig[s] = c;
      if (!c.thresholds) c.thresholds = [];
      if (!c.coopTeams) c.coopTeams = [];
      if (!c.approvalType) c.approvalType = "platform";
      const isHmg = c.approvalType === "hmg";
      const hasT = c.thresholds.length > 0;
      return `
  <div style="border:2px solid ${stageColor[s]}50;border-radius:14px;overflow:hidden">
    <div style="padding:12px 16px;background:${stageColor[s]}0A;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid ${stageColor[s]}30">
      <span style="font-size:13px;font-weight:900;color:${stageColor[s]}">${stageLabel[s]} 결재라인</span>
      ${hasT ? '<span style="padding:2px 9px;border-radius:20px;background:' + stageColor[s] + ';color:white;font-size:10px;font-weight:900">✓ ' + c.thresholds.length + "개 구간</span>" : '<span style="padding:2px 9px;border-radius:20px;background:#F3F4F6;color:#9CA3AF;font-size:10px;font-weight:900">미설정</span>'}
    </div>
    <div style="padding:16px;background:white;display:grid;gap:18px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">결재 시스템</label>
        <div style="display:flex;gap:8px">
          <label style="flex:1;padding:12px 14px;border-radius:10px;border:2px solid ${c.approvalType === "platform" ? stageColor[s] : "#E5E7EB"};background:${c.approvalType === "platform" ? stageColor[s] + "0A" : "white"};cursor:pointer"
                 onclick="_policyWizardData.approvalConfig['${s}'].approvalType='platform';renderPolicyWizard()">
            <div style="display:flex;align-items:center;gap:8px">
              <input type="radio" ${c.approvalType === "platform" ? "checked" : ""} style="margin:0;accent-color:${stageColor[s]}">
              <span style="font-weight:800;font-size:12px;color:${c.approvalType === "platform" ? stageColor[s] : "#374151"}">⚙️ 자체결재</span>
            </div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:4px;margin-left:24px">협조처 없이 결재자만 설정</div>
          </label>
          <label style="flex:1;padding:12px 14px;border-radius:10px;border:2px solid ${c.approvalType === "hmg" ? stageColor[s] : "#E5E7EB"};background:${c.approvalType === "hmg" ? stageColor[s] + "0A" : "white"};cursor:pointer"
                 onclick="_policyWizardData.approvalConfig['${s}'].approvalType='hmg';renderPolicyWizard()">
            <div style="display:flex;align-items:center;gap:8px">
              <input type="radio" ${c.approvalType === "hmg" ? "checked" : ""} style="margin:0;accent-color:${stageColor[s]}">
              <span style="font-weight:800;font-size:12px;color:${c.approvalType === "hmg" ? stageColor[s] : "#374151"}">🔗 통합결재</span>
            </div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:4px;margin-left:24px">결재자 + 협조처 설정</div>
          </label>
        </div>
      </div>
      <div style="border-top:1px solid #F3F4F6;padding-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <label style="font-size:12px;font-weight:800;color:#374151">💰 금액별 결재자</label>
          <button onclick="_addStageThreshold('${s}')" style="font-size:11px;padding:5px 14px;border-radius:8px;border:1.5px solid ${stageColor[s]};color:${stageColor[s]};background:white;cursor:pointer;font-weight:700">+ 추가</button>
        </div>
        ${
          c.thresholds.length === 0
            ? '<div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;border:1px dashed #D1D5DB"><div style="font-size:11px;color:#9CA3AF">결재 구간이 없습니다.</div><div style="font-size:10px;color:#D1D5DB;margin-top:4px">+ 추가 버튼으로 금액별 결재자를 설정하세요</div></div>'
            : '<div style="display:grid;gap:8px">' +
              c.thresholds
                .map(
                  (t, i) =>
                    '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;padding:12px 14px;background:#FAFAFA;border:1.5px solid #E5E7EB;border-radius:10px"><div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">금액 (원 이하)</label><input type="number" value="' +
                    (t.maxAmt || "") +
                    '" placeholder="예: 1000000" onchange="_policyWizardData.approvalConfig[\'' +
                    s +
                    "'].thresholds[" +
                    i +
                    '].maxAmt=Number(this.value);renderPolicyWizard()" style="width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:700;box-sizing:border-box"/>' +
                    (t.maxAmt
                      ? '<div style="font-size:9px;color:#9CA3AF;margin-top:3px">' +
                        t.maxAmt / 10000 +
                        "만원 이하</div>"
                      : "") +
                    '</div><div><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">결재자</label><select onchange="_policyWizardData.approvalConfig[\'' +
                    s +
                    "'].thresholds[" +
                    i +
                    '].approverKey=this.value;renderPolicyWizard()" style="width:100%;border:1.5px solid #D1D5DB;border-radius:8px;padding:8px;font-size:13px;font-weight:700"><option value="">— 선택 —</option>' +
                    _LEVELS
                      .map(
                        (lv) =>
                          '<option value="' +
                          lv.key +
                          '" ' +
                          (t.approverKey === lv.key ? "selected" : "") +
                          ">" +
                          lv.label +
                          "</option>",
                      )
                      .join("") +
                    "</select></div><button onclick=\"_removeStageThreshold('" +
                    s +
                    "'," +
                    i +
                    ')" style="padding:8px 12px;border-radius:8px;border:1.5px solid #FCA5A5;color:#DC2626;background:white;cursor:pointer;font-size:11px;font-weight:700;height:36px">삭제</button></div>',
                )
                .join("") +
              "</div>"
        }
      </div>
      ${isHmg ? '<div style="border-top:1px solid #F3F4F6;padding-top:14px"><div style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px"><span style="font-size:16px">🤝</span><div><div style="font-size:12px;font-weight:800;color:#1D4ED8">협조처는 가상 교육조직에서 관리됩니다</div><div style="font-size:10px;color:#6B7280;margin-top:2px">결재 시 신청자의 소속 조직에 매핑된 협조처(교육협조처/재경협조처)가 자동으로 적용됩니다.</div></div></div></div>' : ""}
      ${(() => {
        const reviewMode = c.reviewMode || "none";
        const modes = [
          {
            key: "none",
            label: "검토 없음",
            desc: "결재 승인 후 별도 검토 없이 처리",
            icon: "⏭️",
            color: "#9CA3AF",
          },
          {
            key: "admin_only",
            label: "총괄담당자 최종검토",
            desc: "총괄담당자가 최종 검토 후 완료 처리",
            icon: "🏛️",
            color: "#1D4ED8",
          },
          {
            key: "manager_only",
            label: "운영담당자 최종검토",
            desc: "운영담당자가 최종 검토 후 완료 처리",
            icon: "👤",
            color: "#D97706",
          },
          {
            key: "both",
            label: "운영담당자 → 총괄담당자",
            desc: "1차 운영담당자, 2차 총괄담당자 순서로 검토",
            icon: "👤→🏛️",
            color: "#059669",
          },
        ];
        return (
          '<div style="border-top:1px solid #F3F4F6;padding-top:16px"><label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:10px">🔍 결재 후 검토자</label><div style="display:grid;gap:8px">' +
          modes
            .map((m) => {
              const sel = reviewMode === m.key;
              return (
                '<label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:2px solid ' +
                (sel ? m.color : "#E5E7EB") +
                ";background:" +
                (sel ? m.color + "10" : "white") +
                ';cursor:pointer;transition:all .15s" onclick="_policyWizardData.approvalConfig[\'' +
                s +
                "'].reviewMode='" +
                m.key +
                '\';renderPolicyWizard()"><input type="radio" ' +
                (sel ? "checked" : "") +
                ' style="margin:0;accent-color:' +
                m.color +
                '"><span style="font-size:14px">' +
                m.icon +
                '</span><div style="flex:1"><div style="font-size:12px;font-weight:800;color:' +
                (sel ? m.color : "#374151") +
                '">' +
                m.label +
                '</div><div style="font-size:10px;color:#6B7280;margin-top:1px">' +
                m.desc +
                "</div></div></label>"
              );
            })
            .join("") +
          "</div></div>"
        );
      })()}
    </div>
  </div>`;
    })
    .join("")}

  <div style="border:1.5px solid #E5E7EB;border-radius:14px;padding:16px;background:white">
    <label class="bo-label">정책 운영 상태</label>
    <div style="display:flex;gap:8px">
      ${["active", "paused"]
        .map(
          (s) => `
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:2px solid ${d.status === s ? "#059669" : "#E5E7EB"};background:${d.status === s ? "#F0FDF4" : "white"};cursor:pointer"
             onclick="_policyWizardData.status='${s}';renderPolicyWizard()">
        <input type="radio" ${d.status === s ? "checked" : ""} style="margin:0">
        <span style="font-weight:700;font-size:13px">${s === "active" ? "✅ 운영 중" : "⏸️ 중지"}</span>
      </label>`,
        )
        .join("")}
    </div>
  </div>
</div>`;
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:720px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
    <button onclick="renderServicePolicy()" style="border:none;background:none;cursor:pointer;font-size:18px;color:#6B7280">←</button>
    <h1 class="bo-page-title" style="margin:0">${_editPolicyId ? "정책 수정" : "새 정책 만들기"}</h1>
  </div>
  <div style="display:flex;align-items:flex-start;gap:0;margin-bottom:28px;overflow-x:auto;padding-bottom:4px">${stepBar}</div>
  ${summaryBar}
  <div class="bo-card" style="padding:24px;margin-bottom:16px">${stepContent}</div>
  <div style="display:flex;justify-content:space-between">
    <button onclick="${_policyWizardStep > 0 ? "_policyWizardStep--;renderPolicyWizard()" : "renderServicePolicy()"}"
      style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;font-size:13px;cursor:pointer">
      ${_policyWizardStep > 0 ? "← 이전" : "취소"}
    </button>
    <button onclick="${_policyWizardStep < TOTAL ? "advancePolicyWizard()" : "savePolicy()"}" class="bo-btn-primary" style="padding:10px 24px">
      ${_policyWizardStep < TOTAL ? "다음 →" : "✅ 정책 저장"}
    </button>
  </div>
</div>`;
}

function _toggleEduType(id) {
  const arr = _policyWizardData.eduTypes || [];
  const i = arr.indexOf(id);
  if (i >= 0) {
    arr.splice(i, 1);
    // 상위 해제 시 세부항목도 초기화
    if (_policyWizardData.eduSubTypes) delete _policyWizardData.eduSubTypes[id];
  } else {
    arr.push(id);
  }
  _policyWizardData.eduTypes = arr;
  renderPolicyWizard();
}
function _toggleEduSubType(typeId, subId) {
  if (!_policyWizardData.eduSubTypes) _policyWizardData.eduSubTypes = {};
  if (!_policyWizardData.eduSubTypes[typeId])
    _policyWizardData.eduSubTypes[typeId] = [];
  const arr = _policyWizardData.eduSubTypes[typeId];
  const i = arr.indexOf(subId);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(subId);
  renderPolicyWizard();
}

function _addStageThreshold(stage) {
  if (!_policyWizardData.approvalConfig) _policyWizardData.approvalConfig = {};
  if (!_policyWizardData.approvalConfig[stage])
    _policyWizardData.approvalConfig[stage] = {
      thresholds: [],
      finalApproverKey: "",
    };
  _policyWizardData.approvalConfig[stage].thresholds.push({
    maxAmt: null,
    approverKey: "",
  });
  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
function _removeStageThreshold(stage, i) {
  _policyWizardData.approvalConfig[stage].thresholds.splice(i, 1);
  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
// ── 검토자 추가/삭제 헬퍼 ─────────────────────────────────────────────────
function _addStageReviewer(stage) {
  if (!_policyWizardData.approvalConfig) _policyWizardData.approvalConfig = {};
  if (!_policyWizardData.approvalConfig[stage])
    _policyWizardData.approvalConfig[stage] = {
      thresholds: [],
      approvalType: "platform",
    };
  const cfg = _policyWizardData.approvalConfig[stage];
  if (!cfg.reviewers) cfg.reviewers = [];
  if (cfg.reviewers.length >= 2) return; // 최대 2명

  // 자동 매핑: 교육조직 담당자 + 총괄담당자
  const vorgId = _policyWizardData.vorgTemplateId || "";
  const _vorgList = typeof _pbTplList !== "undefined" ? _pbTplList : [];
  const vorg = _vorgList.find((v) => v.id === vorgId);
  const acctCodes = _policyWizardData.accountCodes || [];
  const _igList =
    typeof ISOLATION_GROUPS !== "undefined" ? ISOLATION_GROUPS : [];
  // 총괄담당자: isolation_group의 global_admin_key
  const ig = _igList.find((g) =>
    (g.owned_accounts || []).some((a) => acctCodes.includes(a)),
  );

  if (cfg.reviewers.length === 0) {
    // 첫 추가 → 최종 검토자 (총괄담당자)
    const globalAdminKey = ig?.global_admin_key || "";
    const adminPersona =
      globalAdminKey && typeof BO_PERSONAS !== "undefined"
        ? BO_PERSONAS[globalAdminKey]
        : null;
    cfg.reviewers.push({
      role: "final",
      sourceType: "global_admin",
      userId: globalAdminKey,
      userName: adminPersona?.name || globalAdminKey || "(미지정)",
    });
  } else if (cfg.reviewers.length === 1) {
    // 두번째 추가 → 기존 최종을 1차로 변경, 새 최종 = 교육조직 담당자
    // 먼저 기존 최종의 role을 first로 변경하고 source를 global_admin으로 유지
    // 새 1차 = 교육조직 담당자
    const vorgManager = vorg?.head_manager_user || null;
    const newFirst = {
      role: "first",
      sourceType: "vorg_manager",
      userId: vorgManager?.id || "",
      userName: vorgManager?.name || "(교육조직 담당자 미설정)",
    };
    // 기존 최종은 그대로 유지
    cfg.reviewers.unshift(newFirst); // 1차를 앞에 삽입
  }

  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
function _removeStageReviewer(stage, idx) {
  const cfg = _policyWizardData.approvalConfig?.[stage];
  if (!cfg || !cfg.reviewers) return;
  cfg.reviewers.splice(idx, 1);
  // 1명 남았을 때 role을 final로 보정
  if (cfg.reviewers.length === 1) cfg.reviewers[0].role = "final";
  _policyWizardData._approvalTab = stage;
  renderPolicyWizard();
}
function _setPatternDefaults(pat) {
  const m = _PATTERN_META[pat];
  if (!m) return;
  _policyWizardData.flow = m.flow;
  _policyWizardData.budgetLinked = m.budgetLinked;
  _policyWizardData.applyMode = m.applyMode;
  if (!m.budgetLinked) _policyWizardData.accountCodes = [];
}
function _selectEduItem(typeId, subId) {
  _policyWizardData.selectedEduItem = { typeId, subId };
  _policyWizardData.eduTypes = typeId ? [typeId] : [];
  renderPolicyWizard();
}

// ── 위저드 진행 ───────────────────────────────────────────────────────────────
// step0 input 값을 _policyWizardData에 먼저 저장한 후 재렌더 (입력 유실 방지)
function _wizSaveStep0Inputs() {
  const n = document.getElementById("wiz-name")?.value;
  const desc = document.getElementById("wiz-desc")?.value;
  if (n !== undefined) _policyWizardData.name = n.trim();
  if (desc !== undefined) _policyWizardData.desc = desc.trim();
}
window._wizSaveStep0Inputs = _wizSaveStep0Inputs;
// 하위호환: 기존 코드에서 _wizSaveStep1Inputs 호출하는 곳 대비
const _wizSaveStep1Inputs = _wizSaveStep0Inputs;
window._wizSaveStep1Inputs = _wizSaveStep1Inputs;

function advancePolicyWizard() {
  const d = _policyWizardData;
  // Step 0: 정책 정의 (정책명 + 서비스 유형 + 목적 + 교육유형)
  if (_policyWizardStep === 0) {
    _wizSaveStep0Inputs();
    if (!d.name?.trim()) {
      alert("정책명을 입력하세요.");
      return;
    }
    if (!d.targetType) {
      alert("서비스 유형을 선택하세요.");
      return;
    }
    if (!d.purpose) {
      alert("교육 목적을 선택하세요.");
      return;
    }
    if (d.purpose === "external_personal") {
      if (!d.selectedEduItem) {
        alert("교육 유형 세부 항목을 하나 선택하세요.");
        return;
      }
    } else {
      if (!(d.eduTypes || []).length) {
        alert("교육 유형을 하나 이상 선택하세요.");
        return;
      }
    }
    // Step 1: 정책 범위 (회사·조직·계정)
  } else if (_policyWizardStep === 1) {
    if (!d.scopeTenantId) {
      alert("회사를 선택하세요.");
      return;
    }
    if (!d.vorgTemplateId) {
      alert("가상교육조직을 선택하세요.");
      return;
    }
    if (!(d.accountCodes || []).length) {
      alert("예산 계정을 선택하세요.");
      return;
    }
    _policyWizardData.tenantId = d.scopeTenantId;
    // Step 2: 패턴
  } else if (_policyWizardStep === 2) {
    if (!d.processPattern) {
      alert("프로세스 패턴을 선택하세요.");
      return;
    }
  }
  // Step 3(양식), Step 4(결재라인) — 유효성 경고는 있으나 진행 차단 안함
  _policyWizardStep = Math.min(_policyWizardStep + 1, 5);
  renderPolicyWizard();
}

// ── 정책 저장 ─────────────────────────────────────────────────────────────────
async function savePolicy() {
  const d = _policyWizardData;
  const mgr = document.getElementById("wiz-manager")?.value;
  if (mgr) d.managerPersonaKey = mgr;

  const stages = _PATTERN_STAGES[d.processPattern] || ["apply"];

  // 레거시 호환 필드 유지용 (이제 필요없으나 시스템 호환성 위해 빈값 보장)
  d.approverPersonaKey = "";
  d.approvalThresholds = d.approvalConfig?.apply?.thresholds || [];
  d.allowedLearningTypes = d.eduTypes || [];
  if (!d.name) {
    alert("정책명이 없습니다.");
    return;
  }

  // 1) 메모리 SERVICE_POLICIES 업데이트
  const idx = SERVICE_POLICIES.findIndex((p) => p.id === d.id);
  if (idx >= 0) SERVICE_POLICIES[idx] = d;
  else SERVICE_POLICIES.push(d);

  // 2) DB 저장 (upsert) - camelCase → snake_case 컬럼 매핑
  if (typeof sbSaveServicePolicy === "function") {
    const dbRow = {
      id: d.id,
      tenant_id: d.tenantId || d.scopeTenantId,
      vorg_template_id: d.vorgTemplateId || null,
      scope_tenant_id: d.scopeTenantId || null,
      name: d.name,
      descr: d.desc || d.descr || null,
      target_type: d.targetType || null,
      purpose: d.purpose || null,
      edu_types: d.eduTypes || [],
      selected_edu_item: d.selectedEduItem || null,
      process_pattern: d.processPattern || null,
      flow: d.flow || null,
      budget_linked: d.budgetLinked !== false,
      apply_mode: d.applyMode || null,
      account_codes: d.accountCodes || [],
      stage_form_ids: d.stageFormIds || d.stage_form_ids || d.formSets || null,
      stage_form_fields: d.stageFormFields || null,
      approval_config: d.approvalConfig || null,
      manager_persona_key: d.managerPersonaKey || null,
      status: d.status || "active",
    };
    try {
      await sbSaveServicePolicy(dbRow);
    } catch (e) {
      console.warn(
        "[PolicyBuilder] DB 저장 실패 - 메모리에만 저장됨:",
        e.message,
      );
      alert(
        "⚠️ 정책이 임시 저장됐습니다. (DB 저장 실패 - 새로고침 시 초기화될 수 있습니다)",
      );
    }
  }

  alert(
    `✅ 정책 저장 완료!\n\n📋 ${d.name}\n🔄 패턴 ${d.processPattern}\n\n이제 학습자 신청 정보가 운영/관리 메뉴에 자동 배달됩니다.`,
  );
  renderServicePolicy();
}

// ── 헬퍼: 계정·양식·스테이지 폼 토글 ────────────────────────────────────────
function togglePolicyAcct(code) {
  const arr = _policyWizardData.accountCodes || [];
  const i = arr.indexOf(code);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(code);
  _policyWizardData.accountCodes = arr;
  renderPolicyWizard();
}
function _selectPolicyAcct(code) {
  const isNoBudgetCode = code === "__none__";
  // ★ 핵심 수정: 실제 계정의 uses_budget=false도 무예산으로 판별
  // _pbAccountList는 Step1에서 DB 로드된 budget_accounts 목록
  const acctInDb = (
    typeof _pbAccountList !== "undefined" ? _pbAccountList : []
  ).find((a) => a.code === code);
  const isNoBudget =
    isNoBudgetCode || (acctInDb && acctInDb.uses_budget === false);
  _policyWizardData.accountCodes = isNoBudgetCode ? [] : [code];
  _policyWizardData.budgetLinked = !isNoBudget;
  // A, B, C 패턴은 예산/무예산 모두 공용이므로 패턴 강제 변경을 수행하지 않음.
  renderPolicyWizard();
}
function toggleStageForm(stage, id) {
  if (!_policyWizardData.stageFormIds)
    _policyWizardData.stageFormIds = { forecast: [], ongoing: [], apply: [], result: [] };
  if (!_policyWizardData.stageFormIds[stage])
    _policyWizardData.stageFormIds[stage] = [];
  const arr = _policyWizardData.stageFormIds[stage];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(id);
  _policyWizardData._formTab = stage;
  renderPolicyWizard();
}
// [Phase F-2] 인라인 필드 토글 헬퍼
function _toggleInlineField(stage, fieldKey) {
  if (!_policyWizardData.stageFormFields) _policyWizardData.stageFormFields = {};
  if (!_policyWizardData.stageFormFields[stage]) _policyWizardData.stageFormFields[stage] = {};
  const current = !!_policyWizardData.stageFormFields[stage][fieldKey];
  _policyWizardData.stageFormFields[stage][fieldKey] = !current;
  _policyWizardData._formTab = stage;
}

// [Phase F-2] 인라인 필드 임시저장 헬퍼
function _saveInlineForm(stage) {
  const stageLabel = { forecast: "수요예측", ongoing: "상시계획", apply: "신청", result: "결과" };
  const toast = document.createElement("div");
  toast.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#10B981;color:white;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(16,185,129,0.3);z-index:9999;animation:fadeInUp .3s ease";
  toast.innerHTML = `✅ [${stageLabel[stage] || stage}] 양식이 임시저장되었습니다.`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity="0"; toast.style.transition="all .3s"; setTimeout(()=>toast.remove(), 300); }, 3000);
}

// [Phase F-2] FO 미리보기 모달 렌더링
function _previewFoForm(stage) {
  // fo_form_loader.js 의 foRenderStandardPlanForm / foRenderStandardApplyForm 을 사용하여 모달에 렌더링 시뮬레이션
  if (typeof foRenderStandardPlanForm !== "function" || typeof foRenderStandardApplyForm !== "function") {
    alert("FO 폼 렌더러(fo_form_loader.js)가 로드되지 않았습니다.");
    return;
  }
  const flds = _policyWizardData.stageFormFields[stage] || {};
  
  const modal = document.createElement("div");
  modal.id = "fo-preview-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(17,24,39,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px";
  
  const stageLabel = { plan: "계획", forecast: "수요예측", ongoing: "상시계획", apply: "신청", result: "결과" };
  const title = `[미리보기] ${stageLabel[stage] || stage} 양식`;
  
  modal.innerHTML = `
    <div style="background:#F9FAFB;width:100%;max-width:800px;max-height:90vh;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5)">
      <div style="padding:16px 20px;background:white;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:16px;font-weight:800;color:#111827">🔍 ${title}</div>
        <button onclick="document.getElementById('fo-preview-modal').remove()" style="border:none;background:none;font-size:24px;color:#9CA3AF;cursor:pointer;line-height:1">&times;</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:24px" id="fo-preview-content"></div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // 가상 상태 (미리보기용)
  const dummyState = { 
    title: "", 
    is_overseas: false, 
    region: "domestic",
    venue_type: "internal",
    startDate: "",
    endDate: "",
    calcGrounds: []
  };
  const dummyBudget = { usesBudget: true }; // 예산 입력 필드 활성화를 위한 가상 예산

  let html = '';
  if (stage === 'plan' || stage === 'forecast' || stage === 'ongoing') {
    html = foRenderStandardPlanForm(dummyState, dummyBudget, flds);
  } else if (stage === 'apply') {
    html = foRenderStandardApplyForm(dummyState, dummyBudget, flds);
  } else {
    html = '<div style="color:#9CA3AF;text-align:center;padding:40px;">해당 단계의 미리보기 렌더러가 준비되지 않았습니다.</div>';
  }

  document.getElementById('fo-preview-content').innerHTML = html || '<div style="color:#9CA3AF;text-align:center;padding:40px;">선택된 폼 항목이 없거나 렌더링할 수 없습니다.</div>';
}
function togglePolicyForm(id) {
  const arr = _policyWizardData.formIds || [];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(id);
  _policyWizardData.formIds = arr;
  renderPolicyWizard();
}
function togglePolicyLType(t) {
  const arr = _policyWizardData.allowedLearningTypes || [];
  const i = arr.indexOf(t);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(t);
  _policyWizardData.allowedLearningTypes = arr;
  renderPolicyWizard();
}

// ── 정책 삭제 ──────────────────────────────────────────────────────────────────
async function deleteServicePolicy(policyId, policyName) {
  if (
    !confirm(
      `정책 「${policyName}」을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
    )
  )
    return;
  try {
    // DB 삭제 시도 (Supabase REST)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/service_policies?id=eq.${policyId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
          Prefer: "return=minimal",
        },
      },
    );
    if (!res.ok && res.status !== 404) {
      const msg = await res.text();
      throw new Error(`HTTP ${res.status}: ${msg}`);
    }
  } catch (e) {
    console.warn("[교육지원 운영 규칙 삭제] DB 삭제 실패 (로컬만 제거):", e.message);
  }
  // 로컬 배열에서도 제거
  if (typeof SERVICE_POLICIES !== "undefined") {
    const idx = SERVICE_POLICIES.findIndex((p) => p.id === policyId);
    if (idx >= 0) SERVICE_POLICIES.splice(idx, 1);
  }
  renderServicePolicy();
}
window.deleteServicePolicy = deleteServicePolicy;
