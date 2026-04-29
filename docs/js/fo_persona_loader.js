// ─── FO Persona Loader — DB 기반 학습자 정보 동적 로드 ────────────────────────
// 소스: users + user_roles + tenants + org_budget_bankbooks + budget_allocations

const _FO_SUPABASE_URL = "https://wihsojhucgmcdfpufonf.supabase.co";
const _FO_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaHNvamh1Y2dtY2RmcHVmb25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDYwMzYsImV4cCI6MjA4OTk4MjAzNn0.bMm4x7evqtapkBgnn4xeIwDkV574eu2hBoBtXMTQdq4";

/** Supabase 클라이언트 (FO 전용) */
function _foSb() {
  if (typeof supabase !== "undefined") {
    return supabase.createClient(_FO_SUPABASE_URL, _FO_SUPABASE_KEY);
  }
  return null;
}

// ─── GNB 스위처 / 페르소나 캐시 ────────────────────────────────────────────

/** DB에서 로드된 전체 학습자 캐시 */
let _FO_EMPLOYEES = [];

/** 테넌트 ID → 회사 이름 맵 */
let _FO_TENANT_MAP = {};

// ─── 직위 추론 (role_code + job_type 기반) ──────────────────────────────────

function _inferFOPos(roles, jobType) {
  if (roles.some((r) => r.includes("hq_leader"))) return "본부장";
  if (roles.some((r) => r.includes("division_leader"))) return "사업부장";
  if (roles.some((r) => r.includes("center_leader"))) return "센터장";
  if (roles.some((r) => r.includes("office_leader"))) return "실장";
  if (roles.some((r) => r.includes("team_leader"))) return "팀장";
  if (jobType === "research") return "연구원";
  return "팀원";
}

// ─── 전체 학습자 DB 로드 ────────────────────────────────────────────────────

/**
 * BO users + user_roles + tenants 에서 학습자 목록 로드
 * 학습자 기준: user_roles.role_code LIKE '%learner%'
 */
async function _loadAllEmployees() {
  const sb = _foSb();

  // 테넌트 맵 초기 구성 (PERSONAS mock 폴백)
  if (typeof PERSONAS !== "undefined") {
    Object.values(PERSONAS).forEach((p) => {
      if (p.tenantId && p.company) _FO_TENANT_MAP[p.tenantId] = p.company;
    });
  }

  if (!sb) {
    _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
    console.warn("[FO Loader] Supabase 없음 → PERSONAS mock 사용");
    return;
  }

  try {
    // 1. tenants 로드 → _FO_TENANT_MAP 갱신
    const { data: tenants } = await sb
      .from("tenants")
      .select("id, name")
      .eq("active", true);
    (tenants || []).forEach((t) => {
      _FO_TENANT_MAP[t.id] = t.name;
    });

    // 2. learner role 보유 user_id 수집
    const { data: learnerRoles, error: lrErr } = await sb
      .from("user_roles")
      .select("user_id, role_code, tenant_id")
      .or("role_code.like.%learner%,role_code.eq.learner");
    if (lrErr) throw lrErr;

    const learnerUserIds = [
      ...new Set((learnerRoles || []).map((r) => r.user_id)),
    ];
    if (learnerUserIds.length === 0) {
      _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
      return;
    }

    // 3. 해당 유저의 전체 역할 조회 (리더 판단 포함)
    const { data: allRoleRows } = await sb
      .from("user_roles")
      .select("user_id, role_code")
      .in("user_id", learnerUserIds);
    const fullRoleMap = {};
    (allRoleRows || []).forEach((r) => {
      if (!fullRoleMap[r.user_id]) fullRoleMap[r.user_id] = [];
      fullRoleMap[r.user_id].push(r.role_code);
    });

    // 4. users 조회
    const { data: users, error: uErr } = await sb
      .from("users")
      .select("id, tenant_id, emp_no, name, org_id, job_type, status")
      .in("id", learnerUserIds)
      .eq("status", "active")
      .order("tenant_id")
      .order("name");
    if (uErr) throw uErr;

    // 5. organizations 이름 맵
    const orgIds = [
      ...new Set((users || []).map((u) => u.org_id).filter(Boolean)),
    ];
    let orgMap = {};
    if (orgIds.length > 0) {
      const { data: orgs } = await sb
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      (orgs || []).forEach((o) => {
        orgMap[o.id] = o.name;
      });
    }

    // 6. _FO_EMPLOYEES 구성
    _FO_EMPLOYEES = (users || []).map((u) => {
      const roles = fullRoleMap[u.id] || [];
      const isLeader = roles.some((r) => r.includes("leader"));
      return {
        id: u.id,
        tenant_id: u.tenant_id,
        emp_no: u.emp_no,
        name: u.name,
        dept: orgMap[u.org_id] || "",
        pos: _inferFOPos(roles, u.job_type),
        job_type: u.job_type,
        org_id: u.org_id,
        persona_key: u.id, // users.id = GNB 선택 키
        is_active: true,
        roles,
        is_leader: isLeader,
      };
    });

    console.log(
      `[FO Loader] ${_FO_EMPLOYEES.length}명 학습자 로드 완료 (DB users 기반)`,
    );
  } catch (err) {
    console.error(
      "[FO Loader] _loadAllEmployees 오류 → mock 폴백",
      err.message,
    );
    _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
  }
}

/** PERSONAS mock → _FO_EMPLOYEES 형식 변환 (폴백용) */
function _mockEmployeesFromPERSONAS() {
  return Object.entries(PERSONAS || {}).map(([key, p]) => ({
    id: key,
    tenant_id: p.tenantId,
    emp_no: key,
    name: p.name,
    dept: p.dept || "",
    pos: p.pos || "팀원",
    job_type: p.jobType,
    org_id: p.orgId || null,
    persona_key: key,
    is_active: true,
    roles: [],
    is_leader: false,
  }));
}

// ─── 페르소나 초기화 ────────────────────────────────────────────────────────

/**
 * sessionStorage 저장된 키(users.id 또는 PERSONAS key)를 기반으로
 * currentPersona 초기화. main.js DOMContentLoaded에서 호출.
 */
async function _resolveCurrentPersona() {
  const savedKey = sessionStorage.getItem("currentPersona");

  // 1. PERSONAS mock 키인 경우
  if (savedKey && PERSONAS && PERSONAS[savedKey]) {
    return await _initCurrentPersona(PERSONAS[savedKey]);
  }

  // 2. users.id 기반 (DB users)
  if (savedKey && _FO_EMPLOYEES.length > 0) {
    const emp = _FO_EMPLOYEES.find(
      (e) => e.id === savedKey || e.persona_key === savedKey,
    );
    if (emp) return await _buildPersonaFromEmployee(emp);
  }

  // 3. 기본값: 첫 번째 HMC 학습자 또는 첫 번째 PERSONAS
  const firstEmp =
    _FO_EMPLOYEES.find((e) => e.tenant_id === "HMC") || _FO_EMPLOYEES[0];
  if (firstEmp) {
    sessionStorage.setItem("currentPersona", firstEmp.id);
    return await _buildPersonaFromEmployee(firstEmp);
  }

  // 4. 최후 폴백: PERSONAS 첫 번째
  const firstPersona = PERSONAS && Object.values(PERSONAS)[0];
  return (
    firstPersona || {
      name: "게스트",
      tenantId: "HMC",
      allowedAccounts: [],
      budgets: [],
    }
  );
}

/**
 * _FO_EMPLOYEES 항목 → currentPersona 기본 객체 구성 후 DB로 bankbooks 로드
 */
async function _buildPersonaFromEmployee(emp) {
  // 테넌트 레벨 팀뷰 설정: HMC/KIA는 전원 팀뷰 ON, 다른 회사는 리더만
  const teamViewTenants = ["HMC", "KIA"];
  const isTeamViewTenant = teamViewTenants.includes(emp.tenant_id);
  const base = {
    id: emp.id,
    name: emp.name,
    dept: emp.dept,
    pos: emp.pos || "",
    tenantId: emp.tenant_id,
    company: _FO_TENANT_MAP[emp.tenant_id] || emp.tenant_id,
    orgId: emp.org_id,
    orgHqId: null, // 필요 시 조직 계층에서 추론
    jobType: emp.job_type,
    roles: emp.roles || [],
    isLeader: emp.is_leader || false,
    teamViewEnabled: emp.is_leader || isTeamViewTenant, // 리더 OR HMC/KIA → 팀 뷰 ON
    allowedAccounts: [],
    budgets: [],
  };
  // bankbooks + allocations로 allowedAccounts/budgets 로드
  return await _initCurrentPersona(base);
}

/**
 * 페르소나 전환: users.id 또는 PERSONAS key 모두 처리
 */
async function switchPersonaAndReload(key) {
  // 로딩 표시
  const widget = document.getElementById("floating-budget");
  if (widget)
    widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 0;color:#9CA3AF;font-size:11px;font-weight:700">
      <div style="width:14px;height:14px;border:2px solid #D1D5DB;border-top-color:#007AFF;border-radius:50%;animation:spin .6s linear infinite"></div>
      예산 정보 로딩 중...
    </div>`;

  // PERSONAS mock 우선
  if (PERSONAS && PERSONAS[key]) {
    currentPersona = await _initCurrentPersona(PERSONAS[key]);
    sessionStorage.setItem("currentPersona", key);
  } else {
    // DB users 기반
    const emp = _FO_EMPLOYEES.find(
      (e) => e.id === key || e.persona_key === key,
    );
    if (!emp) {
      console.warn("[FO Loader] 페르소나 없음:", key);
      return;
    }
    sessionStorage.setItem("currentPersona", key);
    currentPersona = await _buildPersonaFromEmployee(emp);
  }

  if (typeof renderGNB === "function") renderGNB();
  if (typeof renderFloatingBudget === "function") renderFloatingBudget();
  if (typeof _resetDashboard === "function") _resetDashboard(); // 대시보드 캐시 리셋
  // 팀 뷰 + 승인계획 캐시 리셋
  if (typeof _teamPlansLoaded !== "undefined") {
    _teamPlansLoaded = false;
    _dbTeamPlans = [];
  }
  if (typeof _teamAppsLoaded !== "undefined") {
    _teamAppsLoaded = false;
    _dbTeamApps = [];
  }
  if (typeof _dbApprovedPlansLoaded !== "undefined") {
    _dbApprovedPlansLoaded = false;
    _dbApprovedPlans = [];
  }
  if (typeof _plansDbLoaded !== "undefined") {
    _plansDbLoaded = false;
    _dbMyPlans = [];
  }
  if (typeof _appsDbLoaded !== "undefined") {
    _appsDbLoaded = false;
    _dbMyApps = [];
  }
  if (typeof _aprMemberLoaded !== 'undefined') { _aprMemberLoaded = false; _aprMemberData = []; }
  if (typeof _aprLeaderLoaded !== 'undefined')  { _aprLeaderLoaded = false; _aprLeaderData = []; _aprSubDocData = []; _aprLeaderTab = 'pending'; }
  // PRD#13: 페르소나 전환 시 Realtime 채널 재구독 (applicant_id 기준 채널 교체)
  if (typeof foStopRealtime === 'function')  foStopRealtime();
  if (typeof foStartRealtime === 'function') setTimeout(foStartRealtime, 300);
  if (typeof navigate === 'function') navigate(currentPage || 'dashboard');
}

// ─── org_budget_bankbooks 기반 allowedAccounts + budgets 로드 ───────────────

async function _initCurrentPersona(persona) {
  if (!persona.orgId || !persona.tenantId) {
    console.warn("[FO Loader] orgId 없음 → mock 유지:", persona.name);
    return persona;
  }
  const sb = _foSb();
  if (!sb) return persona;

  try {
    // 1. 내 팀 직접 통장 조회 (팀 통장 + 내 개인 통장)
    const { data: rawBbs, error: e1 } = await sb
      .from("org_budget_bankbooks")
      .select(
        "id, org_id, org_name, org_type, parent_org_id, account_id, template_id, vorg_group_id, user_id, user_name, bb_status",
      )
      .or(
        `and(org_id.eq.${persona.orgId},user_id.is.null),user_id.eq.${persona.id}`,
      )
      .eq("tenant_id", persona.tenantId)
      .or("bb_status.eq.active,bb_status.is.null");
    if (e1) throw e1;
    // 타인 개인 통장 제외 (팀 통장=user_id null + 내 개인 통장=user_id=내id)
    const directBbs = (rawBbs || []).filter(
      (bb) => !bb.user_id || bb.user_id === persona.id,
    );

    // 2. 계정 코드 + 정책 조회
    const accountIds = [
      ...new Set((directBbs || []).map((bb) => bb.account_id)),
    ];
    let accountMap = {},
      policyMap = {};
    if (accountIds.length > 0) {
      const { data: accts } = await sb
        .from("budget_accounts")
        .select("id, code, name, uses_budget, active")
        .in("id", accountIds)
        .eq("active", true);
      (accts || []).forEach((a) => {
        accountMap[a.id] = a;
      });

      const { data: policies } = await sb
        .from("budget_account_org_policy")
        .select("budget_account_id, bankbook_mode, individual_limit")
        .in("budget_account_id", accountIds);
      (policies || []).forEach((p) => {
        policyMap[p.budget_account_id] = p;
      });
    }

    // 3. 예산 배정 조회 (updated_at 기준 최신 우선)
    const bbIds = (directBbs || []).map((bb) => bb.id);
    let allocMap = {};
    if (bbIds.length > 0) {
      const { data: allocs } = await sb
        .from("budget_allocations")
        .select("bankbook_id, allocated_amount, used_amount, frozen_amount, updated_at")
        .in("bankbook_id", bbIds)
        .order("updated_at", { ascending: false });
      (allocs || []).forEach((a) => {
        // 같은 bankbook_id로 여러 행이 있을 수 있음 — 최신 행(updated_at 가장 큼) 사용
        if (!allocMap[a.bankbook_id]) allocMap[a.bankbook_id] = a;
      });
    }

    // 3-1. VOrg 이름 로드 (개선2: 예산 카드에 VOrg 레이블 표시)
    const bbTemplateIds = [
      ...new Set((directBbs || []).map((bb) => bb.template_id).filter(Boolean)),
    ];
    const vorgNameMap = {};
    if (bbTemplateIds.length > 0) {
      try {
        const { data: vorgs } = await sb
          .from("virtual_org_templates")
          .select("id, name")
          .in("id", bbTemplateIds);
        (vorgs || []).forEach((v) => {
          // "HMC 일반교육예산 가상교육조직" → "일반교육예산"
          vorgNameMap[v.id] =
            (v.name || "")
              .replace(/^[A-Z]+\s+/, "")
              .replace(/\s*가상교육조직$/, "") || v.name;
        });
      } catch (e) {
        console.warn("[FO Loader] VOrg 이름 로드 실패:", e.message);
      }
    }

    // 4. allowedAccounts + budgets 구성
    //    예산 사용 계정 → allowedAccounts + budgets
    //    예산 미사용 계정 → allowedAccounts만 (정책 매칭용, 잔액 관리 불필요)
    const allowedAccounts = [];
    const budgets = [];
    for (const bb of directBbs || []) {
      const acct = accountMap[bb.account_id];
      if (!acct) continue;

      // allowedAccounts: 중복 code 스킵
      if (!allowedAccounts.includes(acct.code)) {
        allowedAccounts.push(acct.code);
      }
      if (!acct.uses_budget) continue; // 예산 미사용: 코드만 등록, budgets 스킵

      const policy = policyMap[bb.account_id];
      const alloc = allocMap[bb.id];
      const mode = policy?.bankbook_mode || "isolated";
      const newBalance = Number(alloc?.allocated_amount || 0);

      // 동일 accountCode 중복 통장: 기존 budgets 항목의 balance보다 크면 업데이트
      const existingBudgetIdx = budgets.findIndex(
        (b) => b.accountCode === acct.code && b.isPersonal === !!bb.user_id
      );
      if (existingBudgetIdx >= 0) {
        // 중복 통장 — allocated_amount가 더 크면 해당 통장 정보로 업데이트
        if (newBalance > budgets[existingBudgetIdx].balance) {
          budgets[existingBudgetIdx].id = bb.id;
          budgets[existingBudgetIdx].balance = newBalance;
          budgets[existingBudgetIdx].used = Number(alloc?.used_amount || 0);
          budgets[existingBudgetIdx].frozen = Number(alloc?.frozen_amount || 0);
        }
        continue;
      }

      budgets.push({
        id: bb.id,
        name: bb.user_id
          ? `${bb.user_name || persona.name} ${acct.name}`
          : `${bb.org_name} ${acct.name}`,
        account: acct.name.replace("일반-", "").replace("계정", "").trim(),
        accountCode: acct.code,
        balance: newBalance,
        used: Number(alloc?.used_amount || 0),
        frozen: Number(alloc?.frozen_amount || 0),
        bankbookMode: mode,
        parentOrgName: mode === "shared" ? bb.org_name : null,
        vorgName: vorgNameMap[bb.template_id] || "",
        isPersonal: !!bb.user_id, // 개인 통장 플래그
      });
    }

    // 5. 상위 조직 shared 통장 탐색
    if (persona.orgHqId && persona.orgHqId !== persona.orgId) {
      const { data: hqBbs } = await sb
        .from("org_budget_bankbooks")
        .select("id, org_name, account_id")
        .eq("org_id", persona.orgHqId)
        .eq("tenant_id", persona.tenantId);
      const { data: hqPolicies } = await sb
        .from("budget_account_org_policy")
        .select("budget_account_id, bankbook_mode")
        .in(
          "budget_account_id",
          (hqBbs || []).map((b) => b.account_id),
        );
      const hqPolicyMap = {};
      (hqPolicies || []).forEach((p) => {
        hqPolicyMap[p.budget_account_id] = p;
      });

      for (const bb of hqBbs || []) {
        const acct =
          accountMap[bb.account_id] || (await _fetchAccount(sb, bb.account_id));
        if (!acct) continue;
        if (allowedAccounts.includes(acct.code)) continue;
        if (!acct.uses_budget) {
          // 예산 미사용 상위 계정: 코드만 등록
          allowedAccounts.push(acct.code);
          continue;
        }
        if (hqPolicyMap[bb.account_id]?.bankbook_mode !== "shared") continue;
        allowedAccounts.push(acct.code);
        budgets.push({
          id: bb.id,
          name: `${bb.org_name} ${acct.name}`,
          account: acct.name.replace("일반-", "").replace("계정", "").trim(),
          accountCode: acct.code,
          balance: 0,
          used: 0,
          frozen: 0,
          bankbookMode: "shared",
          parentOrgName: bb.org_name,
        });
      }
    }

    // ⚠️ 테넌트 전체 uses_budget=false 계정 자동 추가 제거됨
    // 이 블록이 HMC-PART 등 다른 격리그룹 계정을 allowedAccounts에 무조건 추가하여
    // _getActivePolicies 기반 정책 매칭이 오염됨 (원인 2 수정)
    // 교육지원 운영 규칙의 accountCodes ↔ allowedAccounts 교차 매칭으로만 정책 필터링

    // ─── VOrg 멤버십: virtual_org_templates.tree_data 기반 조회 (핵심 수정) ───
    // PRD: 직종/역할 무관, 조직→VOrg 멤버십→교육지원 운영 규칙이 primary key
    // 통장(bankbook)이 없는 VOrg(무예산 계정 포함)도 매칭 가능하도록 tree_data 검색
    let treeVorgIds = [];
    try {
      const { data: allVorgs } = await sb
        .from("virtual_org_templates")
        .select("id, tree_data")
        .eq("tenant_id", persona.tenantId);
      treeVorgIds = (allVorgs || [])
        .filter((v) => _orgIdInTreeData(v.tree_data, persona.orgId))
        .map((v) => v.id);
    } catch (e) {
      console.warn(
        "[FO Loader] tree_data 기반 VOrg 조회 실패 → bankbook 폴백",
        e.message,
      );
    }

    // bankbook template_id도 병합 (하위 호환 및 누락 방지)
    const bbVorgIds = [
      ...new Set((directBbs || []).map((bb) => bb.template_id).filter(Boolean)),
    ];
    const allVorgIds = [...new Set([...treeVorgIds, ...bbVorgIds])];

    if (allVorgIds.length > 0) {
      persona.vorgIds = allVorgIds;
      // vorgId: mock data에서 설정된 게 있으면 유지, 없으면 tree 기반 첫 번째
      if (!persona.vorgId) persona.vorgId = allVorgIds[0];
    }

    // ── 개인 통장 자동 생성 (신규 입사자 / 통장 누락 보정) ──
    try {
      // VOrg에 맵핑된 계정 중 individual 정책인 것 조회
      if (allVorgIds.length > 0 && persona.id) {
        const { data: allPolicies } = await sb
          .from("budget_account_org_policy")
          .select(
            "budget_account_id, bankbook_mode, individual_limit, vorg_template_id",
          )
          .eq("bankbook_mode", "individual")
          .in("vorg_template_id", allVorgIds);
        for (const pol of allPolicies || []) {
          const myBb = directBbs.find(
            (bb) =>
              bb.account_id === pol.budget_account_id &&
              bb.user_id === persona.id,
          );
          if (myBb) continue; // 이미 있음
          // 계정 활성 여부 확인
          let acct = accountMap[pol.budget_account_id];
          if (!acct) {
            acct = await _fetchAccount(sb, pol.budget_account_id);
          }
          if (!acct || !acct.active || acct.uses_budget === false) continue;
          // 자동 생성
          const newBb = {
            tenant_id: persona.tenantId,
            org_id: persona.orgId,
            org_name: persona.dept || persona.orgName || "",
            account_id: pol.budget_account_id,
            template_id: pol.vorg_template_id,
            user_id: persona.id,
            user_name: persona.name,
            bb_status: "active",
          };
          const { data: created } = await sb
            .from("org_budget_bankbooks")
            .insert(newBb)
            .select()
            .single();
          if (created) {
            // 기본 한도 배정
            const limitAmt = pol.individual_limit || 0;
            await sb.from("budget_allocations").insert({
              bankbook_id: created.id,
              allocated_amount: limitAmt,
              used_amount: 0,
              frozen_amount: 0,
            });
            allowedAccounts.push(acct.code);
            budgets.push({
              id: created.id,
              name: `${persona.name} ${acct.name}`,
              account: acct.name
                .replace("일반-", "")
                .replace("계정", "")
                .trim(),
              accountCode: acct.code,
              balance: limitAmt,
              used: 0,
              frozen: 0,
              bankbookMode: "individual",
              isPersonal: true,
              vorgName: vorgNameMap[pol.vorg_template_id] || "",
            });
            console.log(
              `[FO Loader] 개인 통장 자동 생성: ${persona.name} - ${acct.code} (한도: ${limitAmt})`,
            );
          }
        }
      }
    } catch (autoErr) {
      console.warn("[FO Loader] 개인 통장 자동 생성 실패:", autoErr.message);
    }

    console.log(
      `[FO Loader] ${persona.name} → 계정: ${allowedAccounts.join(", ")}, vorgIds: ${(persona.vorgIds || []).join(", ")}`,
    );
    return {
      ...persona,
      allowedAccounts,
      budgets,
      vorgId: persona.vorgId,
      vorgIds: persona.vorgIds || [],
    };
  } catch (err) {
    console.error(
      "[FO Loader] _initCurrentPersona 오류 → mock 폴백",
      err.message,
    );
    return persona;
  }
}

/** 단일 계정 조회 헬퍼 */
async function _fetchAccount(sb, accountId) {
  const { data } = await sb
    .from("budget_accounts")
    .select("id, code, name, uses_budget, active")
    .eq("id", accountId)
    .single();
  return data;
}

/**
 * virtual_org_templates.tree_data JSONB에서 orgId 포함 여부 탐색
 * tree_data 구조: { hqs: [{ teams: [{ id, name }], divisions: [{ teams: [...] }] }] }
 * 역할/직종 무관: 모든 hq/그룹에서 orgId를 검색 (일반직/연구직 그룹 구분 없음)
 */
function _orgIdInTreeData(treeData, orgId) {
  if (!treeData || !orgId) return false;
  const hqs = Array.isArray(treeData.hqs) ? treeData.hqs : [];
  for (const hq of hqs) {
    // hq.teams 직접 탐색
    if (Array.isArray(hq.teams) && hq.teams.some((t) => t.id === orgId))
      return true;
    // hq.divisions → division.teams 탐색 (중간 계층이 있는 경우)
    if (Array.isArray(hq.divisions)) {
      for (const div of hq.divisions) {
        if (Array.isArray(div.teams) && div.teams.some((t) => t.id === orgId))
          return true;
      }
    }
  }
  return false;
}

// ─── CSS 스피너 ─────────────────────────────────────────────────────────────
(function () {
  if (!document.getElementById("fo-loader-style")) {
    const s = document.createElement("style");
    s.id = "fo-loader-style";
    s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
    document.head.appendChild(s);
  }
})();
