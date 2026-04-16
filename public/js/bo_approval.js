// ─── 📥 나의 운영 업무 (My Operations) ──────────────────────────────────────
// 정책 기반 결재 자동 라우팅 — 단계별 승인함: 계획승인대기 / 신청승인대기 / 결과정산대기

let _myOpsTab = "plan";
let _boApprovalLoaded = false;
let _boDbApps = [];
let _boDbPlans = [];

async function _loadBoApprovalData() {
  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  if (sb) {
    try {
      const [appsRes, plansRes] = await Promise.all([
        sb
          .from("applications")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
        sb
          .from("plans")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false }),
      ]);
      _boDbApps = appsRes.data || [];
      _boDbPlans = plansRes.data || [];
    } catch (err) {
      console.error("[_loadBoApprovalData] DB 조회 실패:", err.message);
      _boDbApps = [];
      _boDbPlans = [];
    }
  } else {
    // MOCK 폴백
    _boDbApps = typeof MOCK_BO_APPS !== "undefined" ? MOCK_BO_APPS : [];
    _boDbPlans = typeof MOCK_BO_PLANS !== "undefined" ? MOCK_BO_PLANS : [];
  }
}

function renderMyOperations() {
  const el = document.getElementById("bo-content");
  try {
    const persona = boCurrentPersona;
    const personaKey =
      Object.keys(BO_PERSONAS).find((k) => BO_PERSONAS[k] === persona) || "";
    const activeGroupId =
      typeof boGetActiveGroupId === "function" ? boGetActiveGroupId() : null;

    // 자신이 승인자인 정책 (격리그룹 기준 필터 우선)
    const myPolicies = SERVICE_POLICIES.filter((p) => {
      // 격리그룹 필터
      if (activeGroupId && p.domainId && p.domainId !== activeGroupId)
        return false;
      if (p.tenantId !== persona.tenantId) return false;
      if (p.approverPersonaKey === personaKey) return true;
      return (p.approvalThresholds || []).some(
        (t) => t.approverKey === personaKey,
      );
    });
    const myPolicyIds = myPolicies.map((p) => p.id);

    // 패턴별로 분류
    const patternA_PolicyIds = myPolicies
      .filter((p) => (p.processPattern || "B") === "A")
      .map((p) => p.id);
    const patternAB_PolicyIds = myPolicies
      .filter((p) => ["A", "B"].includes(p.processPattern || "B"))
      .map((p) => p.id);

    // DB에서 결재 건 조회 (비동기 → 캐시)
    if (!_boApprovalLoaded) {
      _boApprovalLoaded = true;
      _loadBoApprovalData().then(() => renderMyOperations());
      return;
    }
    const allApps = _boDbApps.filter((a) => myPolicyIds.includes(a.policyId));
    const allPlans = _boDbPlans.filter(
      (a) =>
        patternA_PolicyIds.length > 0 ||
        myPolicies.some((p) => (p.flow || "").includes("plan")),
    );

    // 단계별 탭 데이터
    const planItems = _boDbPlans.filter((a) =>
      (a.status || "").startsWith("pending"),
    );
    const applyItems = allApps.filter((a) => a.type === "신청" || !a.type);
    const resultItems = allApps.filter((a) => a.type === "결과보고");

    const pendingPlans = planItems.filter((a) =>
      a.status?.startsWith("pending"),
    ).length;
    const pendingApply = applyItems.filter((a) =>
      a.status?.startsWith("pending"),
    ).length;
    const pendingResult = resultItems.filter((a) =>
      a.status?.startsWith("pending"),
    ).length;
    const pendingAll = pendingPlans + pendingApply + pendingResult;

    const tabs = [
      {
        id: "plan",
        icon: "📊",
        label: "계획 승인 대기",
        items: planItems,
        pending: pendingPlans,
        badge: "#059669",
        note: "패턴 A 서비스의 교육계획 검토 및 승인",
      },
      {
        id: "apply",
        icon: "📝",
        label: "신청 승인 대기",
        items: applyItems,
        pending: pendingApply,
        badge: "#1D4ED8",
        note: "학습자 신청서 검토 및 예산 가점유/정산 승인",
      },
      {
        id: "result",
        icon: "📄",
        label: "결과 정산 대기",
        items: resultItems,
        pending: pendingResult,
        badge: "#D97706",
        note: "교육 완료 후 결과보고 검토 및 실차감 정산",
      },
    ];

    const tabHtml = tabs
      .map((t) => {
        const active = _myOpsTab === t.id;
        return `<div onclick="_myOpsTab='${t.id}';renderMyOperations()"
      style="padding:10px 16px;border-radius:10px;border:1.5px solid ${active ? t.badge : "#E5E7EB"};
        background:${active ? t.badge : "white"};color:${active ? "white" : "#6B7280"};
        font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">
      ${t.icon} ${t.label}
      ${
        t.pending > 0
          ? `<span style="background:${active ? "rgba(255,255,255,.25)" : "#FEF2F2"};color:${active ? "white" : "#DC2626"};
        padding:2px 7px;border-radius:99px;font-size:11px;font-weight:900">${t.pending}</span>`
          : `<span style="background:${active ? "rgba(255,255,255,.2)" : "#F3F4F6"};padding:2px 7px;border-radius:99px;font-size:11px">${t.items.length}</span>`
      }
    </div>`;
      })
      .join("");

    const currentTab = tabs.find((t) => t.id === _myOpsTab) || tabs[0];
    const currentItems = currentTab.items;

    // 내 담당 정책 배지
    const policyBadges = myPolicies
      .map((p) => {
        const pat = p.processPattern || "B";
        const PM = { A: "#7C3AED", B: "#1D4ED8", C: "#D97706", D: "#6B7280" };
        const thCnt = (p.approvalThresholds || []).length;
        return `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#F5F3FF;border-radius:8px;font-size:11px">
      <span style="font-weight:900;color:${PM[pat] || "#7C3AED"}">패턴${pat}</span>
      <span style="font-weight:700;color:#374151">${p.name}</span>
      ${thCnt > 0 ? `<span style="color:#9CA3AF">🔑 ${thCnt}구간</span>` : ""}
    </div>`;
      })
      .join("");

    // 결재 카드 렌더
    const typeStyle = {
      신청: { bg: "#DBEAFE", c: "#1E40AF" },
      결과보고: { bg: "#FEF3C7", c: "#92400E" },
      교육계획: { bg: "#D1FAE5", c: "#065F46" },
    };

    function renderApprovalCard(a) {
      const isPending = a.status?.startsWith("pending");
      const isResult = a.type === "결과보고";
      const isPlan = a.type === "교육계획" || (!a.type && _myOpsTab === "plan");
      const policy = SERVICE_POLICIES.find((p) => p.id === a.policyId);
      const ts =
        typeStyle[a.type] ||
        (_myOpsTab === "plan" ? typeStyle["교육계획"] : typeStyle["신청"]);

      // 금액별 결재라인 체크 (임계값 맞는 결재자인지)
      let thresholdInfo = "";
      if (
        policy &&
        (policy.approvalThresholds || []).length > 0 &&
        a.requestAmt
      ) {
        const matched = policy.approvalThresholds.find(
          (t) =>
            t.approverKey === personaKey && t.maxAmt >= (a.requestAmt || 0),
        );
        if (matched) {
          thresholdInfo = `<span style="font-size:9px;padding:2px 7px;border-radius:4px;background:#EDE9FE;color:#7C3AED;font-weight:700">🔑 ${matched.maxAmt / 10000}만원 구간 담당</span>`;
        }
      }

      const safeId = String(a.id || "").replace(/'/g, "\\'");
      const tableName = isPlan ? "plans" : "applications";
      const panelId = `bo-ops-af-${safeId}`;

      return `
<div class="bo-card" style="padding:20px;${!isPending ? "opacity:0.65" : ""}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${ts.bg};color:${ts.c}">${a.type || (_myOpsTab === "plan" ? "교육계획" : "신청")}</span>
        ${typeof boAccountBadge !== "undefined" ? boAccountBadge(a.account) : ""}
        ${policy ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F5F3FF;color:#7C3AED;font-weight:700">⚡ ${policy.name}</span>` : ""}
        ${thresholdInfo}
        ${typeof boPlanStatusBadge !== "undefined" ? boPlanStatusBadge(a.status) : ""}
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:2px">${a.title}</div>
      <div style="font-size:12px;color:#9CA3AF">${a.team || a.hq || ""} · 신청자: ${a.submitter || a.applicant || ""} · 제출일: ${a.submittedAt || ""}</div>
    </div>
    <div style="text-align:right;min-width:120px">
      ${
        a.requestAmt !== undefined
          ? `
      <div style="font-size:11px;color:#9CA3AF;font-weight:700;margin-bottom:2px">신청금액</div>
      <div style="font-size:18px;font-weight:900;color:#002C5F">${typeof boFmt !== "undefined" ? boFmt(a.requestAmt || a.amount || 0) : (a.requestAmt || 0).toLocaleString()}원</div>
      ${
        a.actualAmt !== null && a.actualAmt !== undefined
          ? `
      <div style="font-size:11px;color:#059669;font-weight:700;margin-top:4px">실 사용: ${typeof boFmt !== "undefined" ? boFmt(a.actualAmt) : a.actualAmt.toLocaleString()}원</div>`
          : ""
      }`
          : ""
      }
    </div>
  </div>
  ${
    isPending
      ? `
  <div style="display:flex;gap:8px;margin-top:14px;justify-content:space-between;align-items:center">
    <button onclick="event.stopPropagation();_toggleOpsAdminFields('${safeId}','${tableName}')"
      style="padding:6px 14px;border-radius:8px;border:1.5px solid #BFDBFE;background:#EFF6FF;font-size:11px;font-weight:800;color:#1D4ED8;cursor:pointer">
      🔧 관리자 필드
    </button>
    <div style="display:flex;gap:8px">
      <button onclick="myOpsApprove('${a.id}')" class="bo-btn-accent">
        ${isResult ? "✅ 정산 승인 (실차감)" : isPlan ? "✅ 계획 승인" : "✅ 신청 승인"}
      </button>
      <button onclick="myOpsReject('${a.id}')" style="border:1.5px solid #EF4444;color:#EF4444;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">반려</button>
      ${!isResult && !isPlan ? `<button onclick="myOpsCancel('${a.id}')" style="border:1.5px solid #9CA3AF;color:#9CA3AF;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">환원</button>` : ""}
    </div>
  </div>`
      : `<div style="margin-top:10px;font-size:12px;font-weight:700;color:#9CA3AF;text-align:right">처리 완료</div>`
  }
  <div id="${panelId}" style="margin-top:12px;display:none"></div>
</div>`;
    }

    const appCards =
      currentItems.length === 0
        ? `<div style="padding:50px;text-align:center;color:#9CA3AF">
        <div style="font-size:36px;margin-bottom:8px">📭</div>
        <div style="font-weight:700;font-size:14px">${currentTab.label} 항목이 없습니다</div>
        <div style="font-size:12px;margin-top:6px;color:#D1D5DB">${currentTab.note}</div>
       </div>`
        : currentItems.map(renderApprovalCard).join("");

    el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">📥 나의 운영 업무</h1>
      <p class="bo-page-sub">내가 승인자로 등록된 정책의 결재 대기건이 단계별로 자동 표시됩니다</p>
    </div>
    ${
      pendingAll > 0
        ? `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:12px 18px;text-align:center">
      <div style="font-size:24px;font-weight:900;color:#B45309">${pendingAll}</div>
      <div style="font-size:11px;font-weight:700;color:#92400E">전체 대기</div>
    </div>`
        : ""
    }
  </div>

  <!-- 내 담당 정책 -->
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px">내 담당 정책 (${myPolicies.length}개)</div>
    ${
      myPolicies.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${policyBadges}</div>`
        : `<div style="padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-size:12px;color:#991B1B">
          현재 이 담당자가 승인자로 등록된 정책이 없습니다. 교육지원 운영 규칙에서 승인자를 지정해주세요.
         </div>`
    }
  </div>

  <!-- 단계별 탭 -->
  <div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap">${tabHtml}</div>
  <div style="margin-bottom:16px;padding:10px 14px;background:#F9FAFB;border-radius:8px;font-size:11px;color:#6B7280">
    💡 ${currentTab.note}
  </div>

  <!-- 결재 카드 리스트 -->
  <div style="display:flex;flex-direction:column;gap:12px">${appCards}</div>
</div>`;
  } catch (err) {
    console.error("[renderMyOperations] 렌더링 에러:", err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>📥 교육신청 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_boApprovalLoaded=false;renderMyOperations()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}

async function myOpsApprove(id) {
  const sb = typeof getSB === "function" ? getSB() : null;
  // 계획인지 신청인지 판별
  const isPlan = _boDbPlans.some((x) => x.id === id);
  const item = isPlan
    ? _boDbPlans.find((x) => x.id === id)
    : _boDbApps.find((x) => x.id === id);
  if (!item) return;

  const isResult = item.type === "결과보고";
  const newStatus = isResult ? "completed" : "approved";
  item.status = newStatus;

  // DB 업데이트
  if (sb) {
    try {
      const table = isPlan ? "plans" : "applications";
      const { error } = await sb
        .from(table)
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;

      // ★ Phase G: 교육계획 승인 시 자동 배정 (allocated_amount 미설정 시)
      if (isPlan && newStatus === "approved") {
        try {
          const { data: plan } = await sb.from("plans").select("amount,allocated_amount").eq("id", id).single();
          if (plan && (!plan.allocated_amount || Number(plan.allocated_amount) === 0)) {
            await sb.from("plans").update({
              allocated_amount: plan.amount,
              updated_at: new Date().toISOString(),
            }).eq("id", id);
            console.log(`[BO Approve] Auto-allocation: ${id} allocated_amount = ${plan.amount}`);
          }
        } catch (autoErr) {
          console.warn("[BO Approve] Auto-allocation skip:", autoErr.message);
        }
      }

      // ★ Phase D: 교육신청 승인 시 통장 차감
      if (!isPlan && newStatus === "approved") {
        try {
          const { data: app } = await sb.from("applications")
            .select("amount,account_code,applicant_org_id,tenant_id")
            .eq("id", id).single();
          if (app) {
            const { data: bk } = await sb.from("bankbooks")
              .select("id,current_balance")
              .eq("tenant_id", app.tenant_id)
              .eq("org_id", app.applicant_org_id)
              .eq("account_code", app.account_code)
              .eq("status", "active")
              .order("current_balance", { ascending: false })
              .limit(1).single();
            if (bk && Number(bk.current_balance) >= Number(app.amount)) {
              const newBal = Number(bk.current_balance) - Number(app.amount);
              await sb.from("bankbooks").update({
                current_balance: newBal,
                updated_at: new Date().toISOString()
              }).eq("id", bk.id);
              await sb.from("budget_usage_log").insert({
                tenant_id: app.tenant_id,
                bankbook_id: bk.id,
                action: "use",
                amount: Number(app.amount),
                balance_before: Number(bk.current_balance),
                balance_after: newBal,
                reference_type: "application",
                reference_id: id,
                memo: "교육신청 승인 차감",
                performed_by: boCurrentPersona?.name || "system"
              });
              console.log(`[BO Approve] Bankbook deducted: ${app.amount} from ${bk.id}`);
            }
          }
        } catch (bkErr) {
          console.warn("[BO Approve] Bankbook deduction skip:", bkErr.message);
        }
      }
    } catch (err) {
      console.error("[BO Approve] DB update err:", err.message);
    }
  }
  renderMyOperations();
}
async function myOpsReject(id) {
  const r = prompt("반려 사유를 입력하세요:");
  if (!r) return;
  const isPlan = _boDbPlans.some((x) => x.id === id);
  const item = isPlan
    ? _boDbPlans.find((x) => x.id === id)
    : _boDbApps.find((x) => x.id === id);
  if (item) item.status = "rejected";

  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const table = isPlan ? "plans" : "applications";
      const { error } = await sb
        .from(table)
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      console.log(`[BO Reject] ${id} → rejected: ${r}`);
    } catch (err) {

      // ★ Phase D: 교육신청 반려 시 통장 환불
      if (!isPlan) {
        try {
          const { data: app } = await sb.from("applications")
            .select("amount,account_code,applicant_org_id,tenant_id")
            .eq("id", id).single();
          if (app) {
            const { data: bk } = await sb.from("bankbooks")
              .select("id,current_balance")
              .eq("tenant_id", app.tenant_id)
              .eq("org_id", app.applicant_org_id)
              .eq("account_code", app.account_code)
              .eq("status", "active")
              .limit(1).single();
            if (bk) {
              const newBal = Number(bk.current_balance) + Number(app.amount);
              await sb.from("bankbooks").update({
                current_balance: newBal,
                updated_at: new Date().toISOString()
              }).eq("id", bk.id);
              await sb.from("budget_usage_log").insert({
                tenant_id: app.tenant_id,
                bankbook_id: bk.id,
                action: "refund",
                amount: Number(app.amount),
                balance_before: Number(bk.current_balance),
                balance_after: newBal,
                reference_type: "application",
                reference_id: id,
                memo: "교육신청 반려 환불: " + r,
                performed_by: boCurrentPersona?.name || "system"
              });
              console.log(`[BO Reject] Bankbook refunded: ${app.amount} to ${bk.id}`);
            }
          }
        } catch (bkErr) {
          console.warn("[BO Reject] Bankbook refund skip:", bkErr.message);
        }
      }
      console.error("[BO Reject] DB 업데이트 실패:", err.message);
    }
  }
  renderMyOperations();
}
async function myOpsCancel(id) {
  if (!confirm("가점유 예산을 즉시 환원하시겠습니까?")) return;
  const item = _boDbApps.find((x) => x.id === id);
  if (item) item.status = "cancelled";

  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { error } = await sb
        .from("applications")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
      console.log(`[BO Cancel] ${id} → cancelled`);
    } catch (err) {
      console.error("[BO Cancel] DB 업데이트 실패:", err.message);
    }
  }
  renderMyOperations();
}

// ━━━ 결재카드 관리자 필드 인라인 토글 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _toggleOpsAdminFields(recordId, tableName) {
  const panel = document.getElementById(`bo-ops-af-${recordId}`);
  if (!panel) return;
  if (panel.style.display !== "none") {
    panel.style.display = "none";
    panel.innerHTML = "";
    return;
  }
  panel.style.display = "block";
  panel.innerHTML =
    '<div style="text-align:center;padding:16px;font-size:12px;color:#9CA3AF">로딩중...</div>';

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    panel.innerHTML =
      '<div style="color:#EF4444;font-size:12px;padding:12px">DB 연결 필요</div>';
    return;
  }

  // 1) 레코드 detail + form_template_id 가져오기
  const { data: rec } = await sb
    .from(tableName)
    .select("detail, form_template_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!rec) {
    panel.innerHTML =
      '<div style="color:#9CA3AF;font-size:12px;padding:12px">레코드를 찾을 수 없습니다</div>';
    return;
  }

  // 2) 양식 필드 가져오기
  let formFields = [];
  if (rec.form_template_id) {
    const { data: ft } = await sb
      .from("form_templates")
      .select("fields")
      .eq("id", rec.form_template_id)
      .maybeSingle();
    if (ft?.fields) formFields = ft.fields;
  }

  const adminFields = formFields
    .map((f) => (typeof f === "object" ? f : { key: f, scope: "front" }))
    .filter((f) => f.scope === "back" || f.scope === "provide");

  if (adminFields.length === 0) {
    panel.innerHTML =
      '<div style="padding:12px 16px;background:#F9FAFB;border-radius:8px;font-size:12px;color:#9CA3AF;border:1px dashed #E5E7EB">이 양식에 관리자 입력 필드(back/provide)가 없습니다.</div>';
    return;
  }

  _renderOpsAdminPanel(
    panel,
    adminFields,
    rec.detail || {},
    recordId,
    tableName,
  );
}

function _renderOpsAdminPanel(panel, adminFields, detail, recordId, tableName) {
  const allDefs = typeof ADVANCED_FIELDS !== "undefined" ? ADVANCED_FIELDS : [];
  const provideData = detail._provide || {};
  const backData = detail._back || {};
  const _esc = (v) =>
    String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let html = `<div style="border:2px solid #DBEAFE;border-radius:12px;overflow:hidden">
    <div style="padding:12px 16px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-bottom:1.5px solid #DBEAFE;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;font-weight:900;color:#1E40AF">🔧 관리자 입력 필드</span>
      <button onclick="_saveOpsAdminFields('${recordId}','${tableName}')"
        style="padding:6px 16px;border-radius:8px;border:none;background:#1D4ED8;color:white;font-size:11px;font-weight:900;cursor:pointer">
        💾 저장
      </button>
    </div>
    <div id="bo-ops-fields-${recordId}" style="padding:14px 16px;display:flex;flex-direction:column;gap:14px">`;

  adminFields.forEach((fld) => {
    const def = allDefs.find((d) => d.key === fld.key) || {};
    const scopeNs = fld.scope === "provide" ? provideData : backData;
    const stateKey = _toOpsAdminKey(fld.key);
    const val = scopeNs[stateKey] ?? "";
    const icon = def.icon || "📝";
    const hint = def.hint || "";
    const ft = def.fieldType || "text";
    const scopeBadge =
      fld.scope === "provide"
        ? '<span style="font-size:8px;font-weight:800;color:#1D4ED8;background:#DBEAFE;padding:1px 6px;border-radius:3px">📢 BO→FO</span>'
        : '<span style="font-size:8px;font-weight:800;color:#7C3AED;background:#F5F3FF;padding:1px 6px;border-radius:3px">🔒 BO전용</span>';
    const baseStyle =
      "width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;background:#FAFAFA";

    let inputHtml = "";
    if (ft === "textarea") {
      inputHtml = `<textarea data-scope="${fld.scope}" data-key="${stateKey}" rows="2" placeholder="${_esc(hint)}" style="${baseStyle};resize:vertical">${_esc(val)}</textarea>`;
    } else if (ft === "select" && def.options?.length) {
      inputHtml = `<select data-scope="${fld.scope}" data-key="${stateKey}" style="${baseStyle}">
        <option value="">선택</option>
        ${def.options.map((o) => `<option value="${_esc(o.value)}" ${val === o.value ? "selected" : ""}>${_esc(o.label)}</option>`).join("")}
      </select>`;
    } else if (ft === "number") {
      inputHtml = `<input data-scope="${fld.scope}" data-key="${stateKey}" type="number" value="${_esc(val)}" placeholder="0" style="${baseStyle}"/>`;
    } else {
      inputHtml = `<input data-scope="${fld.scope}" data-key="${stateKey}" type="text" value="${_esc(val)}" placeholder="${_esc(hint || fld.key)}" style="${baseStyle}"/>`;
    }

    html += `<div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        ${scopeBadge}
        <span style="font-size:11px;font-weight:800;color:#374151">${icon} ${fld.key}</span>
      </div>
      ${inputHtml}
    </div>`;
  });

  html += `</div></div>`;
  panel.innerHTML = html;
}

async function _saveOpsAdminFields(recordId, tableName) {
  const container = document.getElementById(`bo-ops-fields-${recordId}`);
  if (!container) return;

  const provideUpdate = {};
  const backUpdate = {};
  container.querySelectorAll("[data-scope]").forEach((input) => {
    const scope = input.dataset.scope;
    const key = input.dataset.key;
    const val = input.value || "";
    if (scope === "provide") provideUpdate[key] = val;
    else if (scope === "back") backUpdate[key] = val;
  });

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 필요");
    return;
  }

  try {
    const { data: row } = await sb
      .from(tableName)
      .select("detail")
      .eq("id", recordId)
      .maybeSingle();
    const detail = row?.detail || {};
    detail._provide = { ...(detail._provide || {}), ...provideUpdate };
    detail._back = { ...(detail._back || {}), ...backUpdate };

    const { error } = await sb
      .from(tableName)
      .update({ detail })
      .eq("id", recordId);
    if (error) throw error;

    // 메모리 캐시 갱신
    const cached = (tableName === "plans" ? _boDbPlans : _boDbApps).find(
      (p) => p.id === recordId,
    );
    if (cached) cached.detail = detail;

    alert("✅ 관리자 필드 저장 완료");
  } catch (err) {
    alert("❌ 저장 실패: " + err.message);
  }
}

function _toOpsAdminKey(key) {
  const map = {
    안내사항: "announcement",
    준비물: "preparation",
    "확정 교육장소": "confirmedVenue",
    "확정 강사": "confirmedInstructor",
    "합격/수료 여부": "passStatus",
    "관리자 피드백": "managerFeedback",
    ERP코드: "erpCode",
    검토의견: "reviewComment",
    관리자비고: "adminNote",
    실지출액: "actualCost",
  };
  return map[key] || key.replace(/\s+/g, "_");
}
