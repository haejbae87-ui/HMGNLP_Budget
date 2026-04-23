// ─── fo_apply_actions.js — 헬퍼/제출/저장/취소/플랜피커 (REFACTOR-2: apply.js 분리) ───

function selectPurpose(id) {
  // 정책 기반 목적 목록에서 우선 탐색 → PURPOSES 폴백
  const policyPurposes =
    typeof getPersonaPurposes === "function"
      ? getPersonaPurposes(currentPersona)
      : [];
  applyState.purpose =
    policyPurposes.find((p) => p.id === id) ||
    PURPOSES.find((p) => p.id === id) ||
    null;
  applyState.subType = "";
  applyState.budgetId = "";
  applyState.planId = "";
  applyState.planIds = [];
  applyState.useBudget = null;
  applyState.hasPlan = null;
  renderApply();
}
function setUseBudget(v) {
  applyState.useBudget = v;
  applyState.budgetId = "";
  applyState.planId = "";
  applyState.planIds = [];
  applyState.hasPlan = null;
  renderApply();
}
function setHasPlan(v) {
  applyState.hasPlan = v;
  applyState.planId = "";
  applyState.planIds = [];
  applyState.budgetId = "";
  renderApply();
}
function selectPlan(id) {
  applyState.planId = id;
  const pl = _dbApprovedPlans.find((p) => p.id === id);
  if (pl) {
    applyState.budgetId = pl.budgetId;
    // ★ 계획 데이터 자동 연동
    if (pl.edu_type) {
      applyState.eduType = pl.edu_type;
      applyState.subType = pl.edu_type;
    }
  }
  renderApply();
}
function toggleOperPlan(id) {
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx > -1) applyState.planIds.splice(idx, 1);
  else applyState.planIds.push(id);
  renderApply();
}
function applyNext() {
  applyState.step = Math.min(applyState.step + 1, 4);
  renderApply();
}
function applyPrev() {
  applyState.step = Math.max(applyState.step - 1, 1);
  renderApply();
}
function addExpRow() {
  const s = applyState;
  const slItems = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType("self_learning", currentPersona?.vorgTemplateId || null, s.region === "overseas")
    : [];
  const firstItem = slItems[0];
  s.expenses.push({
    id: Date.now(),
    itemId: firstItem?.id || "",
    type: firstItem?.name || "직접학습용",
    price: firstItem?.unitPrice || 0,
    qty: 1,
  });
  renderApply();
}
function _applyExpTypeChange(selectEl, i) {
  const opt = selectEl.selectedOptions[0];
  const itemId = opt?.value || "";
  const price = Number(opt?.dataset?.price || 0);
  const name = opt?.text || selectEl.value;
  applyState.expenses[i].itemId = itemId;
  applyState.expenses[i].type = name;
  // 단가이 설정되어 있으면 자동 입력 (기존 항목에 이미 단가가 있으면 무시 → 단가 소급 적용 안함)
  if (price > 0 && !applyState.expenses[i].price) {
    applyState.expenses[i].price = price;
  }
  renderApply();
}
async function submitApply() {
  if (!applyState.eduName && !applyState.title) {
    alert("교육명을 입력해주세요.");
    return;
  }
  // ── 동적 양식 필수 필드 검증 ──
  if (applyState.formTemplate && typeof validateRequiredFields === "function") {
    const result = validateRequiredFields(applyState.formTemplate, applyState);
    if (!result.valid) {
      alert("⚠️ 필수 항목을 입력해주세요:\n\n• " + result.errors.join("\n• "));
      return;
    }
  }
  applyState.confirmMode = true;
  renderApply();
}

// ─── 신청 작성확인 화면 ──────────────────────────────────────────
function _renderApplyConfirm() {
  const s = applyState;
  const totalExp = s.expenses.reduce(
    (sum, e) => sum + Number(e.price) * Number(e.qty),
    0,
  );
  const curBudget = s.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === s.budgetId)
    : null;
  const accountCode = curBudget?.accountCode || "";

  document.getElementById("page-apply").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">✅ 작성 확인</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">교육신청 제출 전 확인</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">아래 내용을 확인한 후 확정 제출하면 상신 문서가 자동 생성됩니다.</p>
      </div>
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:120px">교육명</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${s.eduName || s.title || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">예산계정</td>
            <td style="padding:12px 0;color:#374151">${accountCode || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">신청 금액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${totalExp.toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육등록비 내역</td>
            <td style="padding:12px 0;color:#374151">${s.expenses.map((e) => e.type + " " + Number(e.price).toLocaleString() + "원 x" + e.qty).join(", ") || "-"}</td>
          </tr>
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border-radius:10px;border:1.5px solid #FDE68A;font-size:12px;color:#92400E">
          ⚠️ <strong>확정 제출</strong> 시 상신 문서가 자동 생성되어 팀장 결재함으로 전달됩니다.<br>
          결재 진행 중 취소가 필요하면 결재함 → <strong>상신 회수</strong> 버튼을 이용하세요.
        </div>
      </div>
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6;flex-wrap:wrap">
        <button onclick="applyState.confirmMode=false;renderApply()"
          style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">
          ← 수정하기
        </button>
        <!-- UI-1: 저장완료(saved) 버튼 —  팀장 대표 상신 또는 결재함 상신 전 보관 -->
        <button onclick="saveApplyAsReady()"
          style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #059669;background:white;color:#059669;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='#F0FDF4'" onmouseout="this.style.background='white'">
          📤 저장완료로 보관
        </button>
        <button onclick="confirmApply()"
          style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          ✅ 확정 제출
        </button>
      </div>

    </div>
  </div>`;
}

// ─── 신청 확정 제출 (Edge Function 경유 — 예산 트랜잭션) ────────────────
async function confirmApply() {
  const svc =
    typeof SERVICE_DEFINITIONS !== "undefined" && applyState.serviceId
      ? SERVICE_DEFINITIONS.find((sv) => sv.id === applyState.serviceId)
      : null;
  const curBudget = applyState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === applyState.budgetId)
    : null;
  const totalExp = applyState.expenses.reduce(
    (sum, e) => sum + Number(e.price) * Number(e.qty),
    0,
  );
  const appId = applyState.editId || `APP-${Date.now()}`;


  // ★ Phase D: 교육신청 시 통장 잔액 검증
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && currentPersona?.orgId) {
    try {
      const { data: bks } = await sb.from("bankbooks")
        .select("id,current_balance,account_code")
        .eq("tenant_id", currentPersona.tenantId)
        .eq("org_id", currentPersona.orgId)
        .eq("status", "active");
      if (bks && bks.length > 0) {
        const totalBal = bks.reduce((s,b) => s + Number(b.current_balance || 0), 0);
        if (totalExp > totalBal) {
          const ok = confirm(`⚠️ 팀 통장 잔액이 부족합니다.\n\n신청 금액: ${totalExp.toLocaleString()}원\n통장 잔액: ${totalBal.toLocaleString()}원\n부족액: ${(totalExp - totalBal).toLocaleString()}원\n\n그래도 신청하시겠습니까?`);
          if (!ok) return;
        }
      }
    } catch(bkErr) { console.warn("[Apply] Bankbook check skip:", bkErr.message); }
  }
  try {
    const edgeUrl =
      typeof EDGE_FUNCTION_URL !== "undefined"
        ? EDGE_FUNCTION_URL + "/submit-application"
        : null;

    if (edgeUrl) {
      // Edge Function 경유: 예산 잔액 체크 + 신청 저장을 원자적 트랜잭션으로 처리
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": currentPersona.tenantId || "HMC",
        },
        body: JSON.stringify({
          action: "submit",
          appId,
          tenantId: currentPersona.tenantId,
          accountCode: curBudget?.accountCode || "",
          applicantId: currentPersona.id,
          applicantName: currentPersona.name,
          dept: currentPersona.dept || "",
          eduName: applyState.eduName || applyState.title || "교육신청",
          eduType: applyState.eduType || applyState.eduSubType || null,
          amount: totalExp,
          status: "submitted",
          planId: applyState.planId || null,
          policyId: applyState.policyId || null,
          budgetLinked: svc?.budgetLinked !== false,
          // 필드 표준화 (field_standardization.md A-18~A-20)
          education_format: applyState.educationFormat || applyState.education_format || null,
          is_overseas: applyState.isOverseas === true || applyState.is_overseas === true || false,
          overseas_country: applyState.overseasCountry || applyState.overseas_country || null,
          detail: {
            purpose: applyState.purpose?.id || null,
            budgetId: applyState.budgetId || null,
            expenses: applyState.expenses,
            serviceId: applyState.serviceId || null,
            applyMode: svc?.applyMode || null,
            courseSessionLinks: applyState.courseSessionLinks || [],
          },
        }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      console.log("[confirmApply] Edge Function 결과:", result);
      if (result.budget_checked) {
        console.log(
          `  예산 잔액: ${result.available_before?.toLocaleString()} → ${result.available_after?.toLocaleString()}원`,
        );
      }
    } else {
      // Fallback: 직접 DB upsert (Edge Function 미사용)
      const sb = typeof getSB === "function" ? getSB() : null;
      if (sb) {
        const _fSnap = applyState.formTemplate
          ? {
              id: applyState.formTemplate.id,
              name: applyState.formTemplate.name,
              version: applyState.formTemplate.version || 1,
              fields: (applyState.formTemplate.fields || []).map((f) => ({
                key: typeof f === "object" ? f.key : f,
                scope: f?.scope,
                required: f?.required,
              })),
            }
          : null;
        const row = {
          id: appId,
          tenant_id: currentPersona.tenantId,
          plan_id: applyState.planId || null,
          account_code: curBudget?.accountCode || "",
          applicant_id: currentPersona.id,
          applicant_name: currentPersona.name,
          applicant_org_id: currentPersona.orgId || null,
          dept: currentPersona.dept || "",
          edu_name: applyState.eduName || applyState.title || "교육신청",
          edu_type: applyState.eduType || applyState.eduSubType || null,
          amount: totalExp,
          status: "submitted",
          policy_id: applyState.policyId || null,
          form_template_id: applyState.formTemplate?.id || null,
          form_version: applyState.formTemplate?.version || null,
          // 필드 표준화 (field_standardization.md A-18~A-20)
          education_format: applyState.educationFormat || applyState.education_format || null,
          is_overseas: applyState.isOverseas === true || applyState.is_overseas === true || false,
          overseas_country: applyState.overseasCountry || applyState.overseas_country || null,
          detail: {
            purpose: applyState.purpose?.id || null,
            expenses: applyState.expenses,
            courseSessionLinks: applyState.courseSessionLinks || [],
            _form_snapshot: _fSnap,
          },
        };
        const { error } = await sb
          .from("applications")
          .upsert(row, { onConflict: "id" });
        if (error) throw error;
      }
    }
  } catch (err) {
    alert("제출 실패: " + _friendlyApplyError(err.message));
    return;
  }

  // [S-6] submission_documents + submission_items 자동 생성
  try {
    const sb2 = typeof getSB === "function" ? getSB() : null;
    if (sb2) {
      const now = new Date().toISOString();
      const docId = `SUBDOC-${Date.now()}`;
      const curBudget2 = applyState.budgetId
        ? (currentPersona.budgets || []).find(b => b.id === applyState.budgetId) : null;
      const totalExp2 = (applyState.expenses || []).reduce((s,e) => s + Number(e.price)*Number(e.qty), 0);
      const docRow = {
        id: docId,
        tenant_id: currentPersona.tenantId,
        submission_type: 'fo_user',
        submitter_id: currentPersona.id,
        submitter_name: currentPersona.name,
        submitter_org_id: currentPersona.orgId || null,
        submitter_org_name: currentPersona.dept || null,
        title: `${applyState.eduName || applyState.title || '교육신청'} 상신`,
        account_code: curBudget2?.accountCode || null,
        total_amount: totalExp2,
        status: 'submitted',
        submitted_at: now,
      };
      await sb2.from('submission_documents').insert(docRow).catch(e => console.warn('[confirmApply] submission_documents 생성 실패:', e.message));
      const itemRow = {
        submission_id: docId,
        item_type: 'application',
        item_id: appId,
        item_title: applyState.eduName || applyState.title || '교육신청',
        item_amount: totalExp2,
        account_code: curBudget2?.accountCode || null,
        policy_id: applyState.policyId || null,
        item_status: 'pending',
        sort_order: 0,
      };
      await sb2.from('submission_items').insert(itemRow).catch(e => console.warn('[confirmApply] submission_items 생성 실패:', e.message));
      console.log('[confirmApply] 상신 문서 자동 생성:', docId);
    }
  } catch (sdErr) {
    console.warn('[confirmApply] 상신 문서 생성 오류 (비치명적):', sdErr.message);
  }

  alert(
    "✅ 교육신청서가 제출되었습니다.\n\n상신 문서가 자동 생성되어 팀장 결재함으로 전달됩니다.",
  );
  applyState = resetApplyState();
  applyViewMode = "list";
  _appsDbLoaded = false;
  navigate("history");
}

// ─── 신청 임시저장 ──────────────────────────────────────────────
async function saveApplyDraft() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 실패");
    return;
  }
  try {
    const curBudget = applyState.budgetId
      ? (currentPersona.budgets || []).find((b) => b.id === applyState.budgetId)
      : null;
    const totalExp = applyState.expenses.reduce(
      (sum, e) => sum + Number(e.price) * Number(e.qty),
      0,
    );
    const appId = applyState.editId || `DRAFT-APP-${Date.now()}`;
    const _fSnapDraft = applyState.formTemplate
      ? {
          id: applyState.formTemplate.id,
          name: applyState.formTemplate.name,
          version: applyState.formTemplate.version || 1,
          fields: (applyState.formTemplate.fields || []).map((f) => ({
            key: typeof f === "object" ? f.key : f,
            scope: f?.scope,
            required: f?.required,
          })),
        }
      : null;
    const row = {
      id: appId,
      tenant_id: currentPersona.tenantId,
      plan_id: applyState.planId || null,
      account_code: curBudget?.accountCode || "",
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      applicant_org_id: currentPersona.orgId || null,
      dept: currentPersona.dept || "",
      edu_name: applyState.eduName || applyState.title || "교육신청",
      edu_type: applyState.eduType || applyState.eduSubType || null,
      amount: totalExp,
      status: "draft",
      policy_id: applyState.policyId || null,
      form_template_id: applyState.formTemplate?.id || null,
      form_version: applyState.formTemplate?.version || null,
      detail: {
        purpose: applyState.purpose?.id || null,
        budgetId: applyState.budgetId || null,
        expenses: applyState.expenses,
        courseSessionLinks: applyState.courseSessionLinks || [],
        _form_snapshot: _fSnapDraft,
      },
    };
    const { error } = await sb
      .from("applications")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    applyState.editId = appId;
    alert("💾 임시저장되었습니다.");
  } catch (err) {
    alert("임시저장 실패: " + err.message);
  }
}

// ─── 신청 취소 ────────────────────────────────────────────────────
async function cancelApply(appId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb
        .from("applications")
        .select("status")
        .eq("id", appId)
        .single();
      if (data?.status === "approved") {
        alert("⚠️ 이미 승인된 신청은 상위 승인자가 취소해야 합니다.");
        return;
      }
      if (data?.status === "draft") {
        alert("이미 임시저장 상태입니다.");
        return;
      }
    } catch (e) {
      /* pass */
    }
  }
  if (!confirm("이 교육신청을 취소하고 임시저장 상태로 되돌리시겠습니까?"))
    return;
  if (sb) {
    try {
      const { error } = await sb
        .from("applications")
        .update({ status: "draft" })
        .eq("id", appId);
      if (error) throw error;
      alert(
        "교육신청이 임시저장 상태로 되돌려졌습니다.\n수정 후 다시 제출할 수 있습니다.",
      );
    } catch (err) {
      alert("취소 실패: " + _friendlyApplyError(err.message));
      return;
    }
  }
  _appsDbLoaded = false;
  _renderApplyList();
}

// ─── 상태 전이 에러 한국어 변환 ──────────────────────────────────────────
function _friendlyApplyError(msg) {
  if (!msg) return "알 수 없는 에러";
  const m = msg.match(/Invalid status transition:\s*(\w+)\s*→\s*(\w+)/);
  if (!m) return msg;
  const labels = {
    draft: "작성중",
    pending: "결재대기",
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
  };
  return `현재 '${labels[m[1]] || m[1]}' 상태에서 '${labels[m[2]] || m[2]}'(으)로 변경할 수 없습니다.`;
}

// ─── 신청 임시저장 이어쓰기/삭제 ────────────────────────────────────
async function resumeApplyDraft(appId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("applications")
      .select("*")
      .eq("id", appId)
      .single();
    if (error || !data) {
      alert("임시저장 건을 불러올 수 없습니다.");
      return;
    }
    applyState = resetApplyState();
    applyState.editId = data.id;
    applyState.eduName = data.edu_name || "";
    applyState.title = data.edu_name || "";
    applyState.eduType = data.edu_type || "";
    applyState.budgetId = data.detail?.budgetId || "";
    applyState.expenses = data.detail?.expenses || [
      { id: 1, type: "교육비/등록비", price: 0, qty: 1 },
    ];
    applyState.policyId = data.policy_id || null;
    if (data.detail?.purpose) applyState.purpose = { id: data.detail.purpose };
    applyState.step = 3;
    applyViewMode = "form";
    renderApply();
  } catch (err) {
    alert("불러오기 실패: " + err.message);
  }
}

async function deleteApplyDraft(appId) {
  if (!confirm("임시저장된 신청을 삭제하시겠습니까?")) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      await sb
        .from("applications")
        .delete()
        .eq("id", appId)
        .eq("status", "draft");
    } catch (err) {
      console.error("[deleteApplyDraft]", err.message);
    }
  }
  _appsDbLoaded = false;
  _renderApplyList();
}

// ─── DB 상태 매핑 ────────────────────────────────────────────────────
function _mapAppDbStatus(s) {
  const m = {
    draft: "작성중",
    saved: "저장완료",         // fo_submission_approval.md
    pending: "승인대기",
    submitted: "결재대기",     // fo_submission_approval.md (pending 대체)
    in_review: "결재진행중",   // fo_submission_approval.md
    recalled: "회수됨",        // fo_submission_approval.md
    approved: "승인완료",
    completed: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    result_pending: "BO 검토중",
  };
  return m[s] || s || "승인대기";
}

function selectService(id) {
  const svc =
    typeof SERVICE_DEFINITIONS !== "undefined"
      ? SERVICE_DEFINITIONS.find((sv) => sv.id === id)
      : null;
  applyState.serviceId = id;
  applyState.applyMode = svc ? svc.applyMode : null;
  applyState.useBudget = svc ? svc.budgetLinked : null;
  applyState.budgetId = "";
  applyState.planId = "";
  applyState.planIds = [];
  renderApply();
}

// ── 교육담당자 예산 계정 선택 (apply.js) ────────────────────────────────────
function selectApplyBudget(budgetId) {
  applyState.budgetId = budgetId;
  applyState.useBudget = true;
  applyState.planId = "";
  applyState.planIds = [];
  const b = (currentPersona.budgets || []).find((b) => b.id === budgetId);
  applyState.applyMode = "holding"; // 운영계정 = 계획 선신청
  renderApply();
}

// ─── 개인직무 사외학습 전용: 예산 선택 ─────────────────────────────────────────
function selectBudgetChoice(choice) {
  applyState.budgetChoice = choice;
  applyState.budgetId = "";
  applyState.planId = "";
  applyState.planIds = [];
  applyState.serviceId = "";

  // 정책 기반: 선택한 예산에 매칭되는 정책의 apply_mode로 결정
  const budgets = currentPersona.budgets || [];
  if (choice === "none") {
    applyState.applyMode = null;
    applyState.useBudget = false;
  } else if (choice === "rnd") {
    applyState.applyMode = "holding";
    applyState.useBudget = true;
    const b = budgets.find(
      (b) => (b.accountCode || "").includes("RND") || b.account === "연구투자",
    );
    if (b) applyState.budgetId = b.id;
  } else if (choice === "general") {
    // 정책에서 applyMode 확인, 기본 reimbursement
    const policyResult =
      typeof _getActivePolicies !== "undefined"
        ? _getActivePolicies(currentPersona)
        : null;
    const policies = policyResult ? policyResult.policies : [];
    const matchedPolicy = policies.find(
      (p) =>
        (p.purpose === "external_personal" ||
          p.purpose === "personal_external") &&
        !(p.account_codes || p.accountCodes || []).some((c) =>
          c.includes("RND"),
        ),
    );
    applyState.applyMode =
      matchedPolicy?.apply_mode || matchedPolicy?.applyMode || "reimbursement";
    applyState.useBudget = true;
    // ★ 핵심 수정: purpose에 맞는 예산 계정(참가계정)을 선택
    // 이전: budgets[0]을 무조건 선택 → 운영/기타 계정이 먼저 오면 Step3에서 curBudget=null
    const purposeId = applyState.purpose?.id || "external_personal";
    const purposeBudgets =
      typeof getPersonaBudgets !== "undefined"
        ? getPersonaBudgets(currentPersona, purposeId)
        : [];
    if (purposeBudgets.length > 0) {
      applyState.budgetId = purposeBudgets[0].id;
    } else if (budgets.length >= 1) {
      applyState.budgetId = budgets[0].id;
    }
  } else {
    // 기타 선택지: 예산 목록에서 account name 매칭
    applyState.applyMode = "holding";
    applyState.useBudget = true;
    const b = budgets.find((b) => b.id === choice || b.account === choice);
    if (b) applyState.budgetId = b.id;
  }
  renderApply();
}

function selectRndPlan(id) {
  // 다건 선택 모드: planIds 토글
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx > -1) {
    applyState.planIds.splice(idx, 1);
  } else {
    applyState.planIds.push(id);
  }
  // 첫 번째 선택을 planId로 설정 (하위 호환)
  applyState.planId = applyState.planIds[0] || "";
  // budgetId 자동 설정
  const pl = _dbApprovedPlans.find((p) => p.id === applyState.planId);
  if (pl) applyState.budgetId = pl.budgetId;
  renderApply();
}

// R&D 교육계획 선택 UI (DB 기반, 다건 선택 지원)
// ═══════════════════════════════════════════════════════════════════════════
// ★ 통합 교육계획 선택 팝업 컴포넌트 (R&D + 교육운영 패턴A 공통 사용)
// ═══════════════════════════════════════════════════════════════════════════
function _getPlansForPicker(s, mode) {
  if (mode === "rnd") {
    return _dbApprovedPlans.filter(
      (p) => (p.account || "").includes("RND") || p.account === "연구투자",
    );
  }
  // 교육운영: 같은 예산계정의 모든 승인된 교육계획 (팀 공유)
  return _dbApprovedPlans.filter((p) => p.budgetId === s.budgetId);
}

function _renderPlanPickerSection(s, mode) {
  const plans = _getPlansForPicker(s, mode);
  const isRnd = mode === "rnd";
  const color = isRnd ? "#7C3AED" : "#1D4ED8";
  const bgLight = isRnd ? "#F5F3FF" : "#EFF6FF";
  const borderLight = isRnd ? "#DDD6FE" : "#BFDBFE";
  const icon = isRnd ? "🔬" : "📋";
  const label = isRnd ? "R&D 교육계획" : "교육계획";

  if (plans.length === 0) {
    return `
    <div style="margin-top:16px;padding:16px 20px;border-radius:12px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:13px;font-weight:900;color:#EF4444;margin-bottom:4px">⚠️ 승인된 ${label}이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;line-height:1.6">
        ${isRnd ? "R&D 교육예산" : "이 예산 계정(패턴A)"}을 사용하려면 사전에 교육계획을 수립하고 승인을 받아야 합니다.<br>
        교육계획 화면에서 먼저 계획을 수립한 후, 결재 승인을 받으세요.
      </div>
      <div style="margin-top:12px">
        <a href="#" onclick="navigate('plans');return false"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:${color};color:white;font-size:12px;font-weight:900;text-decoration:none">
          📋 교육계획 수립 바로가기
        </a>
      </div>
    </div>`;
  }

  const selected = s.planIds || [];
  const totalAmt = selected.reduce((sum, id) => {
    const p = plans.find((x) => x.id === id);
    return sum + (p ? p.amount || 0 : 0);
  }, 0);

  return `
  <div style="margin-top:16px;padding:16px 20px;border-radius:14px;background:${bgLight};border:1.5px solid ${borderLight}">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:13px;font-weight:900;color:${color}">${icon} 승인된 ${label} 선택 <span style="font-size:10px;font-weight:700;color:#9CA3AF">(${plans.length}건)</span></div>
    </div>
    ${
      selected.length > 0
        ? `
    <div style="display:grid;gap:6px;margin-bottom:12px">
      ${selected
        .map((id) => {
          const p = plans.find((x) => x.id === id);
          if (!p) return "";
          const balance = (p.amount || 0) - (p.used || 0);
          return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:white;border:1.5px solid ${color}40">
        <span style="font-size:14px">${icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:900;color:${color}">${p.title}</div>
          <div style="font-size:10px;color:#6B7280">📅 ${p.date || "-"} · 💰 예산 ${(p.amount || 0).toLocaleString()}원 · ✅ 잔액 ${balance.toLocaleString()}원</div>
        </div>
        <button onclick="_removePlanFromSelection('${id}');event.stopPropagation()" style="border:none;background:#FEE2E2;color:#DC2626;font-size:10px;font-weight:900;padding:3px 8px;border-radius:6px;cursor:pointer">✕</button>
      </div>`;
        })
        .join("")}
    </div>
    <div style="padding:8px 14px;background:${color}15;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:12px;font-weight:800;color:${color}">📋 선택된 교육계획 ${selected.length}건</div>
      <div style="font-size:14px;font-weight:900;color:${color}">${totalAmt.toLocaleString()}원</div>
    </div>`
        : `
    <div style="padding:20px;text-align:center;background:white;border-radius:10px;border:2px dashed ${borderLight};margin-bottom:12px">
      <div style="font-size:24px;margin-bottom:6px">📭</div>
      <div style="font-size:12px;font-weight:700;color:#6B7280">교육계획을 선택하세요</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:2px">아래 버튼을 눌러 승인된 교육계획을 선택할 수 있습니다</div>
    </div>`
    }
    <button onclick="_openPlanPickerModal('${mode}')" style="width:100%;padding:12px;border-radius:10px;border:2px solid ${color};background:white;color:${color};font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s"
      onmouseover="this.style.background='${bgLight}'" onmouseout="this.style.background='white'">
      ${icon} ${selected.length > 0 ? "교육계획 변경/추가" : "교육계획 선택하기"}
    </button>
    <div style="margin-top:10px;padding:8px 12px;background:${color}10;border-radius:8px;font-size:11px;color:${color};font-weight:700">
      💡 교육계획에 교육 유형이 포함되어 있어 다음 단계에서 유형을 별도로 선택하지 않아도 됩니다.
    </div>
  </div>`;
}

function _openPlanPickerModal(mode) {
  applyState._planPickerMode = mode;
  applyState._planPickerSearch = "";
  applyState._planPickerTempIds = [...(applyState.planIds || [])];
  _renderPlanPickerModalDOM();
}

function _renderPlanPickerModalDOM() {
  const mode = applyState._planPickerMode;
  const plans = _getPlansForPicker(applyState, mode);
  const search = (applyState._planPickerSearch || "").toLowerCase();
  const filtered = search
    ? plans.filter((p) => (p.title || "").toLowerCase().includes(search))
    : plans;
  const tempIds = applyState._planPickerTempIds || [];
  const isRnd = mode === "rnd";
  const color = isRnd ? "#7C3AED" : "#1D4ED8";
  const icon = isRnd ? "🔬" : "📋";
  const label = isRnd ? "R&D 교육계획" : "교육계획";

  const totalAmt = tempIds.reduce((sum, id) => {
    const p = plans.find((x) => x.id === id);
    return sum + (p ? p.amount || 0 : 0);
  }, 0);

  // 현재 선택된 계획들의 교육유형 판별 (복수선택 제한용)
  const selectedType = (() => {
    if (tempIds.length === 0) return null;
    const first = plans.find((p) => p.id === tempIds[0]);
    return first?.edu_type || null;
  })();
  const eduTypeLabel = (t) => {
    const map = {
      elearning: "이러닝",
      seminar: "세미나",
      class: "집합",
      conf: "컨퍼런스",
      book: "도서구입",
      cert: "자격증",
      lang: "어학",
      live: "라이브",
    };
    return map[t] || t || "";
  };

  const planCards = filtered
    .map((p) => {
      const active = tempIds.includes(p.id);
      const balance = (p.amount || 0) - (p.used || 0);
      const isLow = balance <= 0;
      const pExpired = p.endDate && new Date(p.endDate) < new Date();
      const pType = p.edu_type || "";
      const isTypeMismatch =
        selectedType && pType && pType !== selectedType && !active;
      const isDisabled = pExpired || isTypeMismatch;
      return `
    <label onclick="${isDisabled ? "" : `_togglePlanPickerItem('${p.id}')`}" style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;
      border:2px solid ${active ? color : isTypeMismatch ? "#F3F4F6" : "#E5E7EB"};background:${active ? color + "10" : isTypeMismatch ? "#FAFAFA" : "white"};cursor:${isDisabled ? "not-allowed" : "pointer"};transition:all .15s${isDisabled ? ";opacity:.4" : ""}">
      <div style="width:22px;height:22px;border-radius:6px;border:2px solid ${active ? color : "#D1D5DB"};
        background:${active ? color : "white"};display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${active ? '<span style="color:white;font-size:12px;font-weight:900">✓</span>' : ""}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:${active ? color : "#111827"};margin-bottom:3px;display:flex;align-items:center;gap:6px">
          ${p.title}
          ${pType ? `<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:#EFF6FF;color:#1D4ED8">${eduTypeLabel(pType)}</span>` : ""}
          ${typeof getTenantBadgeHtml === "function" ? getTenantBadgeHtml(p.tenantId, currentPersona.tenantId) : ""}
          ${pExpired ? '<span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:#FEE2E2;color:#DC2626">기간만료</span>' : ""}
          ${isTypeMismatch ? '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:#F3F4F6;color:#9CA3AF">유형 다름</span>' : ""}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          ${p.applicantName && p.tenantId !== currentPersona.tenantId ? `<span>👤 ${p.applicantName}</span>` : ""}
          <span>📅 ${p.date || "-"}</span>
          <span>💰 예산 ${(p.amount || 0).toLocaleString()}원</span>
          <span style="color:${isLow ? "#DC2626" : "#059669"}">${isLow ? "⚠️ 잔액 부족" : "✅ 잔액 " + balance.toLocaleString() + "원"}</span>
        </div>
      </div>
    </label>`;
    })
    .join("");

  // 모달 컨테이너
  let modal = document.getElementById("plan-picker-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "plan-picker-modal";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
  <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease">
    <div style="background:white;border-radius:20px;width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,.25);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:16px;font-weight:900;color:#111827;display:flex;align-items:center;gap:8px">${icon} 승인된 ${label} 선택</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${plans.length}건 중 ${tempIds.length}건 선택됨</div>
        </div>
        <button onclick="_closePlanPickerModal(false)" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF;padding:4px">✕</button>
      </div>
      <div style="padding:12px 24px;border-bottom:1px solid #F3F4F6">
        <input id="plan-picker-search" type="text" placeholder="교육계획명 검색..." value="${applyState._planPickerSearch || ""}"
          oninput="applyState._planPickerSearch=this.value;_renderPlanPickerModalDOM()"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600;outline:none"
          onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='#E5E7EB'">
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px 24px">
        <div style="display:grid;gap:8px">
          ${filtered.length > 0 ? planCards : '<div style="padding:32px;text-align:center;color:#9CA3AF;font-size:13px">검색 결과가 없습니다</div>'}
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;background:#F9FAFB">
        <div style="font-size:12px;font-weight:800;color:${color}">
          ${tempIds.length > 0 ? `선택: ${tempIds.length}건 · 총 예산: ${totalAmt.toLocaleString()}원` : "교육계획을 선택하세요"}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="_closePlanPickerModal(false)" style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
          <button onclick="_closePlanPickerModal(true)" ${tempIds.length === 0 ? "disabled" : ""}
            style="padding:10px 24px;border-radius:10px;border:none;background:${tempIds.length > 0 ? color : "#D1D5DB"};color:white;font-size:13px;font-weight:900;cursor:${tempIds.length > 0 ? "pointer" : "not-allowed"}">확인 (${tempIds.length}건)</button>
        </div>
      </div>
    </div>
  </div>`;
}

function _togglePlanPickerItem(id) {
  const tempIds = applyState._planPickerTempIds || [];
  // 기간 만료 체크
  const plan = _dbApprovedPlans.find((p) => p.id === id);
  if (plan?.endDate && new Date(plan.endDate) < new Date()) return;

  const idx = tempIds.indexOf(id);
  if (idx >= 0) {
    // 선택 해제
    tempIds.splice(idx, 1);
  } else {
    // ★ 같은 교육유형만 복수 선택 가능
    if (tempIds.length > 0 && plan) {
      const firstPlan = _dbApprovedPlans.find((p) => p.id === tempIds[0]);
      const firstType = firstPlan?.edu_type || "";
      const thisType = plan.edu_type || "";
      if (firstType && thisType && firstType !== thisType) {
        const typeLabel = (t) => {
          const map = {
            elearning: "이러닝",
            seminar: "세미나",
            class: "집합",
            conf: "컨퍼런스",
            book: "도서구입",
            cert: "자격증",
            lang: "어학",
          };
          return map[t] || t || "미지정";
        };
        alert(
          `⚠️ 같은 교육유형의 계획만 복수 선택 가능합니다.\n\n현재 선택된 유형: ${typeLabel(firstType)}\n선택하려는 유형: ${typeLabel(thisType)}`,
        );
        return;
      }
    }
    tempIds.push(id);
  }
  applyState._planPickerTempIds = tempIds;
  _renderPlanPickerModalDOM();
}

function _closePlanPickerModal(confirm) {
  const modal = document.getElementById("plan-picker-modal");
  if (modal) modal.innerHTML = "";
  if (confirm) {
    applyState.planIds = [...(applyState._planPickerTempIds || [])];
    // R&D: planId도 동기화 (레거시 호환)
    if (applyState.planIds.length > 0) {
      applyState.planId = applyState.planIds[0];
      const pl = _dbApprovedPlans.find((p) => p.id === applyState.planId);
      if (pl && !applyState.budgetId) applyState.budgetId = pl.budgetId;
    }
    renderApply();
  }
}

function _removePlanFromSelection(id) {
  if (!applyState.planIds) return;
  const idx = applyState.planIds.indexOf(id);
  if (idx >= 0) applyState.planIds.splice(idx, 1);
  if (applyState.planId === id) applyState.planId = applyState.planIds[0] || "";
  renderApply();
}

// 레거시 호환: selectRndPlan은 _togglePlanPickerItem으로 리다이렉트
function selectRndPlan(id) {
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx >= 0) applyState.planIds.splice(idx, 1);
  else applyState.planIds.push(id);
  applyState.planId = applyState.planIds[0] || "";
  renderApply();
}

// ─── Step 이동 (패턴A 시 교육계획 필수 + 교육유형 건너뜀) ─────────────────────
function applyNext() {
  const s = applyState;
  const hasPlanSelected = s.planId || (s.planIds && s.planIds.length > 0);

  // Step 2: 패턴A(R&D 또는 교육운영) 교육계획 미선택 시 진행 차단
  const isRndPatA = s.step === 2 && s.budgetChoice === "rnd";
  const isOperPatA =
    s.step === 2 &&
    s.purpose?.id !== "external_personal" &&
    s.budgetId &&
    (() => {
      const avail =
        typeof getPersonaBudgets !== "undefined"
          ? getPersonaBudgets(currentPersona, s.purpose?.id)
          : [];
      const cb = avail.find((b) => b.id === s.budgetId);
      const pi =
        cb && typeof getProcessPatternInfo !== "undefined"
          ? getProcessPatternInfo(currentPersona, s.purpose?.id, cb.accountCode)
          : null;
      return pi?.pattern === "A";
    })();

  if ((isRndPatA || isOperPatA) && !hasPlanSelected) {
    alert("❗ 패턴A 정책입니다. 승인된 교육계획을 먼저 선택해주세요.");
    return;
  }
  if (s.step === 2 && (isRndPatA || isOperPatA) && hasPlanSelected) {
    s.step = 4; // 패턴A: 교육유형 건너뜀 → 바로 세부정보

    // ★ 패턴A: 계획 데이터 자동 연동 ★
    const planId = s.planId || (s.planIds && s.planIds[0]) || "";
    if (planId) {
      const linkedPlan = _dbApprovedPlans.find((p) => p.id === planId);
      const rawPlan = (
        typeof _plansDbCache !== "undefined" ? _plansDbCache : []
      ).find((p) => p.id === planId);
      if (linkedPlan) {
        // 교육유형 자동 설정
        if (linkedPlan.edu_type && !s.eduType) s.eduType = linkedPlan.edu_type;
        if (!s.subType && linkedPlan.edu_type) s.subType = linkedPlan.edu_type;
      }
      if (rawPlan) {
        const d = rawPlan.detail || {};
        // 계획 상세 데이터 → 신청 필드 자동 채우기
        if (!s.title && (rawPlan.edu_name || d.title))
          s.title = rawPlan.edu_name || d.title || "";
        if (!s.startDate && d.startDate) s.startDate = d.startDate;
        if (!s.endDate && d.endDate) s.endDate = d.endDate;
        if (!s.institution && d.institution) s.institution = d.institution;
        if (!s.content && d.content) s.content = d.content;
        if (!s.amount && rawPlan.amount) s.amount = Number(rawPlan.amount);
        if (!s.eduType && d.eduType) s.eduType = d.eduType;
        if (!s.subType && d.eduSubType) s.subType = d.eduSubType;
        if (!s.purpose_text && d.purpose_text) s.purpose_text = d.purpose_text;
      }
    }
  } else {
    s.step = Math.min(s.step + 1, 4);
  }
  // Step4 진입 시 BO form_template 항상 최신 로드
  const nextStep = s.step;
  if (nextStep === 4) {
    s.formTemplateLoading = true;
    s.formTemplate = null; // 캐시 무효화 → 항상 DB 재조회
    renderApply();
    const policies =
      typeof _getActivePolicies === "function"
        ? _getActivePolicies(currentPersona)?.policies || []
        : [];
    const purposeId = s.purpose?.id;
    const eduType = s.subType || s.eduType || ""; // ★ 교육유형 전달
    const accCode = (() => {
      const budgets = currentPersona?.budgets || [];
      const b = budgets.find((x) => x.id === s.budgetId);
      return b?.accountCode || b?.account_code || null;
    })();
    // ★ purpose + account + eduType 3중 매칭
    // FO purpose(internal_edu) → BO purpose(elearning_class 등) 역매핑 적용
    const boPurposeKeys =
      typeof _FO_TO_BO_PURPOSE !== "undefined" && purposeId
        ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
        : [purposeId];
    const _purposeMatch = (pPurpose) =>
      !purposeId || boPurposeKeys.includes(pPurpose);
    const matched =
      policies.find((p) => {
        const acc = p.account_codes || p.accountCodes || [];
        const pTypes = p.edu_types || p.eduTypes || [];
        const sei = p.selected_edu_item || p.selectedEduItem;
        const allTypes = [...pTypes];
        if (sei?.subId) allTypes.push(sei.subId);
        if (sei?.typeId) allTypes.push(sei.typeId);
        const accountOk = !accCode || acc.includes(accCode);
        const eduTypeOk =
          !eduType || allTypes.length === 0 || allTypes.includes(eduType);
        return _purposeMatch(p.purpose) && accountOk && eduTypeOk;
      }) ||
      policies.find((p) => {
        const acc = p.account_codes || p.accountCodes || [];
        return _purposeMatch(p.purpose) && (!accCode || acc.includes(accCode));
      }) ||
      policies[0] ||
      null;
    (async () => {
      let tpl = null;
      if (matched && typeof getFoFormTemplate === "function") {
        // eduType 영문 코드 직접 전달 (DB form_templates.edu_type 영문 표준화 완료)
        tpl = await getFoFormTemplate(matched, "apply", eduType);
      }
      s.formTemplate = tpl || null;
      s.formTemplateLoading = false;
      renderApply();
    })();
    return;
  }
  renderApply();
}
function applyPrev() {
  if (applyState.step === 4 && applyState.budgetChoice === "rnd") {
    applyState.step = 2; // R&D에서 뒤로 → Step2로 복귀
  } else {
    applyState.step = Math.max(applyState.step - 1, 1);
  }
  renderApply();
}

// ─── 교육결과 작성 폼 ──────────────────────────────────────────────────────
let _resultFormData = null;

function _openResultForm(appId, title, amount) {
  _resultFormData = {
    applicationId: appId,
    title: title || "-",
    amount: amount || 0,
    completed: "yes", // 수료여부
    actualHours: "", // 실참석시간
    actualCost: amount, // 실비용
    satisfaction: 5, // 만족도 (1~5)
    feedback: "", // 소감
  };
  _renderResultView();
}

function _renderResultView() {
  const f = _resultFormData;
  if (!f) return;
  document.getElementById("page-apply").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육신청 › 교육결과</div>
    <h1 class="text-2xl font-black text-brand tracking-tight mb-6">📝 교육결과 작성</h1>

    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <!-- 헤더: 신청 정보 -->
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">승인된 교육신청 기반</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${f.title}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">승인 금액: ${f.amount.toLocaleString()}원</p>
      </div>

      <div style="padding:24px">
        <!-- 수료여부 -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">수료여부 <span style="color:#EF4444">*</span></label>
          <div style="display:flex;gap:10px">
            ${["yes", "no"]
              .map(
                (v) => `
            <button onclick="_resultFormData.completed='${v}';_renderResultView()"
              style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;
                     border:2px solid ${f.completed === v ? "#059669" : "#E5E7EB"};
                     background:${f.completed === v ? "#F0FDF4" : "white"};
                     color:${f.completed === v ? "#059669" : "#6B7280"}">
              ${v === "yes" ? "✅ 수료" : "❌ 미수료"}
            </button>`,
              )
              .join("")}
          </div>
        </div>

        <!-- 실참석시간 -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">실 참석시간 (시간)</label>
          <input type="number" value="${f.actualHours}" placeholder="예: 16"
            oninput="_resultFormData.actualHours=this.value"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>

        <!-- 실비용 -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">실 지출비용 (원)</label>
          <input type="number" value="${f.actualCost}" placeholder="예: 1500000"
            oninput="_resultFormData.actualCost=Number(this.value)"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>

        <!-- 만족도 -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">만족도 (1~5)</label>
          <div style="display:flex;gap:8px">
            ${[1, 2, 3, 4, 5]
              .map(
                (v) => `
            <button onclick="_resultFormData.satisfaction=${v};_renderResultView()"
              style="width:44px;height:44px;border-radius:10px;font-size:18px;cursor:pointer;
                     border:2px solid ${f.satisfaction >= v ? "#F59E0B" : "#E5E7EB"};
                     background:${f.satisfaction >= v ? "#FFFBEB" : "white"}">
              ${"⭐"}
            </button>`,
              )
              .join("")}
          </div>
        </div>

        <!-- 소감 -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">교육 소감</label>
          <textarea oninput="_resultFormData.feedback=this.value" rows="4"
            placeholder="교육의 유익한 점, 실무 적용 계획 등을 작성해주세요."
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical">${f.feedback}</textarea>
        </div>
      </div>

      <!-- 하단 버튼 -->
      <div style="padding:16px 24px;border-top:1px solid #F3F4F6;display:flex;justify-content:space-between">
        <button onclick="_resultFormData=null;applyViewMode='list';renderApply()"
          style="padding:10px 24px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:800;color:#6B7280;cursor:pointer">
          ← 목록으로
        </button>
        <button onclick="_submitResult()"
          style="padding:10px 28px;border-radius:10px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          📤 결과 제출
        </button>
      </div>
    </div>
  </div>`;
}

async function _submitResult() {
  const f = _resultFormData;
  if (!f) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 실패");
    return;
  }

  try {
    // 기존 detail 유지하며 result 추가
    const { data: existing } = await sb
      .from("applications")
      .select("detail")
      .eq("id", f.applicationId)
      .single();
    const prevDetail = existing?.detail || {};

    const resultData = {
      completed: f.completed === "yes",
      actual_hours: Number(f.actualHours) || 0,
      actual_cost: Number(f.actualCost) || 0,
      satisfaction: f.satisfaction,
      feedback: f.feedback,
      submitted_at: new Date().toISOString(),
      submitted_by: currentPersona.name,
    };

    const { error } = await sb
      .from("applications")
      .update({
        status: "completed",
        detail: { ...prevDetail, result: resultData },
      })
      .eq("id", f.applicationId);

    if (error) throw error;
    alert("✅ 교육결과가 제출되었습니다.");
    _resultFormData = null;
    _appsDbLoaded = false;
    _dbMyApps = []; // 목록 갱신
    applyViewMode = "list";
    renderApply();
  } catch (err) {
    alert("제출 실패: " + err.message);
    console.error("[_submitResult]", err.message);
  }
}

// ─── A-1: 신청 저장완료(saved) 저장 — 상신 대기 상태 ──────────────────────
// 작성 완료 후 바로 결재 요청하지 않고 "저장완료" 상태로 보관
// 팀원이 완성 후 팀장이 대표 상신하거나, 본인이 결재함에서 상신하는 패턴
async function saveApplyAsReady() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  // 필수 필드 검증 (저장완료 → 상신 가능 상태이므로 유효성 확인)
  if (applyState.formTemplate && typeof validateRequiredFields === 'function') {
    const result = validateRequiredFields(applyState.formTemplate, applyState);
    if (!result.valid) {
      alert('⚠️ 필수 항목을 모두 입력해야 저장완료 상태로 전환할 수 있습니다:\n\n• ' + result.errors.join('\n• '));
      return;
    }
  }
  if (!applyState.eduName && !applyState.title) {
    alert('교육명을 입력해주세요.');
    return;
  }

  try {
    const curBudget = applyState.budgetId
      ? (currentPersona.budgets || []).find(b => b.id === applyState.budgetId)
      : null;
    const totalExp = (applyState.expenses || []).reduce(
      (sum, e) => sum + Number(e.price) * Number(e.qty), 0
    );
    const appId = applyState.editId || `APP-${Date.now()}`;
    const _fSnap = applyState.formTemplate ? {
      id: applyState.formTemplate.id,
      name: applyState.formTemplate.name,
      version: applyState.formTemplate.version || 1,
      fields: (applyState.formTemplate.fields || []).map(f => ({
        key: typeof f === 'object' ? f.key : f,
        scope: f?.scope,
        required: f?.required,
      })),
    } : null;

    const row = {
      id: appId,
      tenant_id: currentPersona.tenantId,
      plan_id: applyState.planId || null,
      account_code: curBudget?.accountCode || '',
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      applicant_org_id: currentPersona.orgId || null,
      dept: currentPersona.dept || '',
      edu_name: applyState.eduName || applyState.title || '교육신청',
      edu_type: applyState.eduType || applyState.eduSubType || null,
      amount: totalExp,
      status: 'saved',  // ← A-1 핵심: draft 아닌 saved로 저장
      policy_id: applyState.policyId || null,
      form_template_id: applyState.formTemplate?.id || null,
      form_version: applyState.formTemplate?.version || null,
      detail: {
        purpose: applyState.purpose?.id || null,
        budgetId: applyState.budgetId || null,
        expenses: applyState.expenses,
        courseSessionLinks: applyState.courseSessionLinks || [],
        _form_snapshot: _fSnap,
      },
    };
    const { error } = await sb.from('applications').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    applyState.editId = appId;
    alert('📤 저장완료 상태로 저장되었습니다.\n\n결재함(내 결재)에서 상신하거나,\n팀장이 대표로 상신할 수 있습니다.');
    applyState = resetApplyState();
    applyViewMode = 'list';
    _appsDbLoaded = false;
    _dbMyApps = [];
    renderApply();
  } catch (err) {
    alert('저장완료 실패: ' + err.message);
    console.error('[saveApplyAsReady]', err.message);
  }
}

// ─── A-1: 신청 카드에서 단건 상신 브릿지 ─────────────────────────────────────
// apply.js 신청 내역 카드의 saved 항목에 "상신하기" 버튼이 이 함수를 호출
function _appSingleSubmit(appId, appTitle) {
  if (typeof _aprSingleSubmit === 'function') {
    _aprSingleSubmit(appId, 'applications', appTitle || '교육신청 상신');
  } else {
    if (typeof navigateTo === 'function') navigateTo('approval-member');
    setTimeout(() => {
      if (typeof _aprSingleSubmit === 'function') {
        _aprSingleSubmit(appId, 'applications', appTitle || '교육신청 상신');
      }
    }, 600);
  }
}

