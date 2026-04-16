// login.js — 사번(emp_no) + 비밀번호(password)로 Supabase users 테이블 인증
// 로그인 성공 : user_roles에서 역할 확인 → BO/FO 자동 분기 + 세션 설정

document.addEventListener("DOMContentLoaded", () => {
  const empNoInput = document.getElementById("emp_no");
  const passwordInput = document.getElementById("password");

  // 기본 자격증명 자동 입력 (개발편의)
  if (empNoInput && !empNoInput.value) empNoInput.value = "HMGNLP";
  if (passwordInput && !passwordInput.value) passwordInput.value = "1218";

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const empNo = document.getElementById("emp_no").value.trim();
      const password = document.getElementById("password").value.trim();
      if (!empNo || !password) {
        alert("아이디와 비밀번호를 입력해주세요.");
        return;
      }
      await doLogin(empNo, password);
    });
  }
});

// BO 역할 코드 → boCurrentPersona 세션 키 매핑 (bo_data.js BO_PERSONAS 키와 동일)
const _ROLE_TO_BO_PERSONA_PATTERN = {
  platform_admin: "platform_admin",
  tenant_admin: "{tenantId_lower}_tenant_admin",
  budget_admin: "{tenantId_lower}_total_general",
  budget_ops: "{tenantId_lower}_hq_general",
};

// 역할이 BO 접근 대상인지 확인
const _BO_ROLES = new Set([
  "platform_admin",
  "tenant_admin",
  "budget_admin",
  "budget_ops",
]);

async function doLogin(empNo, password) {
  const btn = document.getElementById("login-btn");
  const errEl = document.getElementById("login-error");
  const orgHtml = btn.innerHTML;
  btn.innerHTML = "⏳ 로그인 중...";
  btn.disabled = true;
  if (errEl) errEl.textContent = "";

  try {
    const sb = typeof getSB === "function" ? getSB() : null;
    if (!sb) throw new Error("Supabase client not initialized");

    // ① users 테이블에서 사번 + 비밀번호 조회
    const { data: users, error } = await sb
      .from("users")
      .select("*")
      .eq("emp_no", empNo)
      .eq("password", password)
      .eq("status", "active");

    if (error) throw error;
    if (!users || users.length === 0) {
      _showError("아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    const user = users[0];

    // ② 역할 조회 (user_roles 테이블)
    const { data: rolesData } = await sb
      .from("user_roles")
      .select("role_code, tenant_id, scope_id")
      .eq("user_id", user.id);

    const userRoles = (rolesData || []).map((r) => r.role_code);

    // ③ 최고 권한 역할 결정 (레벨 낮을수록 높은 권한)
    const _LEVEL = {
      platform_admin: 1,
      tenant_admin: 2,
      budget_admin: 3,
      budget_ops: 4,
      learner: 99,
    };
    const sorted = [...userRoles].sort(
      (a, b) => (_LEVEL[a] || 50) - (_LEVEL[b] || 50),
    );
    const topRole = sorted[0] || "learner";
    const tenantRole = rolesData?.find((r) => r.role_code !== "learner");
    const tenantId = tenantRole?.tenant_id || user.tenant_id || "HMC";

    // ④ 세션 저장
    const sessionData = {
      id: user.id,
      tenantId,
      empNo: user.emp_no,
      name: user.name,
      email: user.email || "",
      roles: userRoles,
      topRole,
      orgId: user.org_id || null,
    };
    sessionStorage.setItem("loggedInUser", JSON.stringify(sessionData));

    // ⑤ BO/FO 분기
    const isBoUser = _BO_ROLES.has(topRole);

    if (isBoUser) {
      // BO용 persona 키 생성: e.g. 'hmc_tenant_admin', 'platform_admin'
      let boKey = _resolveBoPersonaKey(topRole, tenantId, user.emp_no);
      sessionStorage.setItem("currentPersona", boKey);
      sessionStorage.setItem("boLastMenu", "dashboard");
      window.location.href = "backoffice.html";
    } else {
      // FO: 기존 FO 페르소나 키 (emp_no 기반)
      const foKey = user.emp_no || "hmc_team_mgr";
      sessionStorage.setItem("currentPersona", foKey);
      window.location.href = "frontoffice.html";
    }
  } catch (err) {
    console.error("Login error:", err);
    _showError("로그인 처리 중 오류가 발생했습니다: " + (err.message || ""));
  } finally {
    btn.innerHTML = orgHtml;
    btn.disabled = false;
  }
}

// BO 페르소나 키 결정
function _resolveBoPersonaKey(topRole, tenantId, empNo) {
  if (topRole === "platform_admin") return "platform_admin";

  const tid = (tenantId || "HMC").toLowerCase();

  // 특수 케이스: HMGNLP 사번은 플랫폼 관리자
  if (empNo === "HMGNLP") return "platform_admin";

  const map = {
    tenant_admin: `${tid}_tenant_admin`,
    budget_admin: `${tid}_total_general`,
    budget_ops: `${tid}_hq_general`,
  };
  return map[topRole] || `${tid}_total_general`;
}

function _showError(msg) {
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = "block";
  } else {
    alert(msg);
  }
}
