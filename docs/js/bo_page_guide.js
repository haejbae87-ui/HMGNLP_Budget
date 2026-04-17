// ── 페이지 가이드 드로어 (방식B: 우상단 버튼 → 우측 슬라이드 패널) ────────────
// bo_page_guide.js : BO 및 FO 각 페이지의 목적·기능·정책·DB 힌트를 제공
// 사용: openPageGuide('page-id') / closePageGuide()

const PAGE_GUIDE_DATA = {
  // ────────── BACK OFFICE ──────────
  "service-policy": {
    title: "🔧 교육지원 운영 규칙",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "교육 서비스 흐름(계획→신청→결과), 예산 연동, 결재라인을 하나의 정책으로 통합 관리. 정책 1개 = 특정 그룹의 특정 예산으로 처리 가능한 교육의 전체 규칙.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "정책 위저드 8단계 (범위→정책명→목적→교육유형→패턴→대상조직→양식→결재라인)",
          "격리그룹·계정·목적·교육유형 조합별 독립 정책 구성",
          "프론트오피스 학습자 교육계획·신청에 적용될 정책 자동 매핑",
          "정책 상태 (운영 중 / 중지) 관리",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "정책은 최소 1개의 예산 계정과 연결",
          "동일 계정에 여러 정책 가능 (교육유형으로 구분)",
          "저장된 정책은 DB service_policies 테이블에 저장",
          "삭제된 정책은 연결된 계획·신청에 영향 없음 (스냅샷 보존)",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "service_policies: id, tenant_id, domain_id, account_codes[], purpose, edu_types[]",
          "stage_form_ids: {plan, apply, result} → form_templates.id",
          "approval_config: {plan/apply/result: {thresholds[], finalApproverKey}}",
        ],
      },
    ],
  },
  "isolation-groups": {
    title: "🛡️ 격리그룹 관리",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "테넌트(회사) 내부의 예산 격리 단위. 격리그룹마다 독립적인 예산 계정·총괄자·운영자·정책을 보유하여 조직 간 예산 비공개 원칙 적용.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "그룹 생성 / 수정 / 삭제",
          "예산총괄 담당자 및 예산운영 담당자 지정",
          "그룹 소속 예산 계정(ownedAccounts) 연동",
          "테넌트 총괄관리자 또는 플랫폼 관리자만 접근 가능",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "그룹 간 계정 공유 불가 (격리 원칙)",
          "총괄 담당자는 budget_admin 역할을 가진 사용자만 지정 가능",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "edu_support_domains: id, tenant_id, name, global_admin_keys[], owned_accounts[]",
          "user_roles: user_id, role_code(budget_admin|budget_ops), scope_id",
        ],
      },
    ],
  },
  "form-builder": {
    title: "📝 교육양식 마법사",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "교육 계획·신청·결과 단계에 사용할 양식 제도그룹을 생성. 목적·교육유형·단계를 태깅하여 교육지원 운영 규칙 위저드에서 자동 필터링.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "양식 단계(type): plan / apply / result",
          "목적·교육유형·격리그룹·계정 태깅으로 정책 자동 연동",
          "필드 빌더: 텍스트·날짜·금액·파일업로드 등",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "양식 type(plan/apply/result)이 정책 Stage 연결의 필수 조건",
          "비활성(active:false) 양식은 정책 위저드에서 표시 안 됨",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "form_templates: id, tenant_id, domain_id, account_code, type(plan|apply|result)",
          "purpose, edu_type, active, fields[]",
        ],
      },
    ],
  },
  "virtual-org": {
    title: "🌐 제도그룹 관리",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "테넌트별로 조작할 수 있는 가상 교육 조직 제도그룹을 생성 및 관리. 예산/학습 등 용도(교육지원, 자격증 등)별로 다중 총괄담당자를 지정하고 실제 조직/팀을 맵핑하여 권한 범위를 확정합니다.",
      },
      {
        icon: "📌",
        label: "주요 탭 및 기능",
        color: "#1D4ED8",
        items: [
          "① 기본정보: 제도그룹 명칭, 용도 태깅 및 다중 총괄담당자 권한 부여/회수",
          "② 교육조직 구성: 트리 구조로 본부 추가 및 실제 팀 맵핑",
          "③ 담당자: 총괄 하위 운영 담당자 권한 부여",
          "④ 협조처: 결재 시 협조가 필요한 팀 지정",
        ],
      },
      {
        icon: "📏",
        label: "핵심 비즈니스 규칙",
        color: "#059669",
        items: [
          "(권한 동기화) 화면 내 담당자 추가/해제 시 즉각 user_roles 테이블에 동기화됨",
          "(총괄-운영 계층) 운영담당자 롤은 총괄담당자 롤의 하위(child) 역할로 필터링됨",
          "(예산 연동) 팀 맵핑 등 구조 변경 시 자동 통장 동기화(_syncBankbooksForTemplate) 실행",
        ],
      },
      {
        icon: "🗄️",
        label: "데이터베이스 파이프라인",
        color: "#0369A1",
        items: [
          "virtual_org_templates: 템플릿 테이블 (service_type, tree_data JSON 구조)",
          "head_manager_users: JSON 배열로 복수 총괄 관리 (이전 head_manager_user 하위 호환 포함)",
          "user_roles: 권한 추가 변경 시 등록 삭제 트리거 역할",
        ],
      },
    ],
  },
  "user-mgmt": {
    title: "👤 사용자 관리",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "플랫폼 사용자의 등록·수정·역할 부여. 사용자는 tenants 단위로 관리되며 역할(role)에 따라 접근 가능한 메뉴가 다름.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "사번 자동채번 (현재 테넌트 최대사번+1)",
          "역할 부여: learner / budget_admin / budget_ops / tenant_admin / platform_admin",
          "조직 배정 (org_id)",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "사용자는 자동으로 learner 역할 부여",
          "사번(emp_no) 중복 방지는 현재 테넌트 범위 내에서만 적용",
          "budget_admin 역할 사용자만 격리그룹 총괄 담당자 지정 가능",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "users: id, tenant_id, name, emp_no, email, org_id, job_type, status",
          "user_roles: user_id, role_code, tenant_id, scope_id (격리그룹 범위)",
        ],
      },
    ],
  },
  allocation: {
    title: "💰 예산 배정",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "격리그룹 내 예산 계정에 연도별 총 예산을 배정하고 부서별·팀별로 분배.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "연도·분기별 예산 배정",
          "격리그룹 → 계정 → 하위 조직 순 배정",
          "배정 vs 집행 현황 추적",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "budget_allocations: id, account_code, org_id, year, amount, allocated_at",
          "plans.estimated_cost / applications.total_cost → 집행 합산",
        ],
      },
    ],
  },
  "approval-routing": {
    title: "✅ 결재 라우팅",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "정책에 등록된 결재라인 기준으로 신청 건이 자동으로 담당 결재자에게 배달됨.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "금액 구간별 결재자 지정",
          "계획·신청·결과 단계별 독립 결재라인",
          "최종 결재자 승인 시 상태 자동 변경",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "service_policies.approval_config: {plan/apply/result: {thresholds:[{maxAmt, approverKey}], finalApproverKey}}",
          "applications.status: pending_approval → approved / rejected",
        ],
      },
    ],
  },
  // ────────── FRONT OFFICE ──────────
  "fo-plan": {
    title: "📊 교육계획 수립",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "학습자가 연간·분기 교육 계획을 수립하여 예산 총괄에게 사전 승인 요청. 계획이 승인된 항목만 신청 단계로 진행 가능 (패턴 A).",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "교육 목적 선택 → 예산 계정 → 교육유형 (정책 기반 자동 필터)",
          "정책에 연결된 계획 양식(form_type=plan) 작성",
          "제출 시 결재라인 자동 라우팅",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "SERVICE_POLICIES_FO 기반으로 목적·예산·교육유형 필터링",
          "계획 단계가 없는 패턴(B/C/D/E)은 계획 메뉴 비활성",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "plans: id, user_id, policy_id, form_id, status, estimated_cost, created_at",
          "plan_fields: plan_id, field_key, value",
        ],
      },
    ],
  },
  "fo-apply": {
    title: "📝 교육신청",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "승인된 계획 또는 직접 신청(패턴 B/D/E)으로 실제 교육 참가를 신청하고 결재 처리.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "계획 연계 신청(패턴 A) 또는 직접 신청(패턴 B)",
          "비용 상세(훈련비·숙박·식비 등) 입력",
          "신청 양식(form_type=apply) 작성 후 제출",
        ],
      },
      {
        icon: "📏",
        label: "정책",
        color: "#059669",
        items: [
          "패턴 A: plan.status=approved 인 계획만 신청 가능",
          "신청 금액 구간에 따라 결재자 자동 배정",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "applications: id, plan_id (nullable), user_id, policy_id, form_id, total_cost, status",
          "status 흐름: draft → pending_approval → approved / rejected",
        ],
      },
    ],
  },
  "fo-result": {
    title: "📄 결과 보고",
    layers: [
      {
        icon: "🎯",
        label: "목적",
        color: "#7C3AED",
        content:
          "교육 이수 후 결과를 보고하여 예산 집행을 확정하고 학습 이력을 저장.",
      },
      {
        icon: "📌",
        label: "주요 기능",
        color: "#1D4ED8",
        items: [
          "수료 증빙 업로드",
          "실 비용 정산 입력",
          "결과 양식(form_type=result) 작성",
        ],
      },
      {
        icon: "🗄️",
        label: "DB 힌트",
        color: "#0369A1",
        items: [
          "results: id, application_id, actual_cost, completion_date, attachments[]",
          "ledger에 집행 반영",
        ],
      },
    ],
  },
};

window._pageGuideOpen = false;
window._pageGuideId = null;

function openPageGuide(pageId) {
  window._pageGuideId = pageId;
  window._pageGuideOpen = true;
  _renderPageGuideDrawer();
}
function closePageGuide() {
  window._pageGuideOpen = false;
  const d = document.getElementById("pg-drawer-overlay");
  if (d) {
    d.style.opacity = "0";
    setTimeout(() => d.remove(), 250);
  }
}
window.openPageGuide = openPageGuide;
window.closePageGuide = closePageGuide;

function _renderPageGuideDrawer() {
  const existing = document.getElementById("pg-drawer-overlay");
  if (existing) existing.remove();

  const g = PAGE_GUIDE_DATA[window._pageGuideId];
  if (!g) return;

  const overlay = document.createElement("div");
  overlay.id = "pg-drawer-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:1000;opacity:0;transition:opacity .25s";
  overlay.innerHTML = `
<div onclick="closePageGuide()" style="position:absolute;inset:0;background:rgba(0,0,0,.35)"></div>
<div id="pg-drawer-panel" style="position:absolute;top:0;right:-400px;width:390px;height:100%;background:white;
     box-shadow:-4px 0 32px rgba(0,0,0,.18);overflow-y:auto;transition:right .25s ease;display:flex;flex-direction:column">
  <!-- 헤더 -->
  <div style="padding:20px 20px 14px;border-bottom:1px solid #F3F4F6;position:sticky;top:0;background:white;z-index:1">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px">페이지 가이드</div>
        <div style="font-size:15px;font-weight:900;color:#111827">${g.title}</div>
      </div>
      <button onclick="closePageGuide()" style="width:32px;height:32px;border-radius:50%;border:1.5px solid #E5E7EB;background:#F9FAFB;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;color:#6B7280">✕</button>
    </div>
  </div>
  <!-- 내용 -->
  <div style="padding:16px 20px;display:grid;gap:14px;flex:1">
    ${g.layers
      .map(
        (layer) => `
    <div style="border-left:3px solid ${layer.color};padding-left:14px">
      <div style="font-size:11px;font-weight:900;color:${layer.color};margin-bottom:6px;display:flex;align-items:center;gap:5px">
        ${layer.icon} ${layer.label}
      </div>
      ${
        layer.content
          ? `<p style="font-size:12px;color:#374151;line-height:1.7;margin:0">${layer.content}</p>`
          : `<ul style="margin:0;padding-left:14px;display:grid;gap:3px">
            ${(layer.items || []).map((i) => `<li style="font-size:11px;color:#374151;line-height:1.6">${i}</li>`).join("")}
          </ul>`
      }
    </div>`,
      )
      .join("")}
  </div>
  <!-- 푸터 -->
  <div style="padding:12px 20px;border-top:1px solid #F3F4F6;background:#FAFAFA">
    <div style="font-size:10px;color:#9CA3AF;text-align:center">📋 페이지 가이드 | HMG Budget Platform</div>
  </div>
</div>`;

  document.body.appendChild(overlay);
  // 애니메이션
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    document.getElementById("pg-drawer-panel").style.right = "0";
  });
}

// ── 페이지 가이드 버튼 HTML 생성 유틸리티 ────────────────────────────────────
function pgGuideBtn(pageId) {
  return `<button onclick="openPageGuide('${pageId}')"
    style="display:flex;align-items:center;gap:5px;padding:7px 14px;border:1.5px solid #E5E7EB;border-radius:10px;
           background:white;cursor:pointer;font-size:12px;font-weight:700;color:#6B7280;
           transition:all .15s;box-shadow:0 1px 3px rgba(0,0,0,.07)"
    onmouseover="this.style.borderColor='#6366F1';this.style.color='#6366F1'"
    onmouseout="this.style.borderColor='#E5E7EB';this.style.color='#6B7280'">
    📋 페이지 가이드
  </button>`;
}
window.pgGuideBtn = pgGuideBtn;
