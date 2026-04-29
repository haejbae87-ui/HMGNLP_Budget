// ─── fo_plans_actions.js — 마법사 핼퍼/저장/확정/이어쓰기 (REFACTOR-2: plans.js 분리) ───
// ─── PLAN WIZARD HELPERS ─────────────────────────────────────────────────────

function selectPlanPurpose(id) {
  // 정책 기반 목적 목록에서 우선 탐색 → PURPOSES 폴백
  const policyPurposes =
    typeof getPersonaPurposes === "function"
      ? getPersonaPurposes(currentPersona)
      : [];
  planState.purpose =
    policyPurposes.find((p) => p.id === id) ||
    PURPOSES.find((p) => p.id === id) ||
    null;
  planState.subType = "";
  planState.budgetId = "";
  planState.eduType = ""; // 예산 변경 시 교육유형 리 셋
  renderPlanWizard();
}

// 예산 선택 時 교육유형 리셋
function planSelectBudget(id) {
  planState.budgetId = id;
  planState.eduType = ""; // 예산상 달라지면 교육유형도 다시 선택
  renderPlanWizard();
}

function planNext() {
  const nextStep = Math.min(planState.step + 1, 3);
  planState.step = nextStep;
  // Step3 진입 시 BO form_template 항상 최신 로드 (TTL 캐시는 fo_form_loader에서 관리)
  if (nextStep === 3) {
    planState.formTemplateLoading = true;
    planState.formTemplate = null; // 이전 캐시 무효화 → 항상 DB에서 재조회
    renderPlanWizard();
    // 매칭 정책 찾기
    const policies =
      typeof _getActivePolicies === "function"
        ? _getActivePolicies(currentPersona)?.policies || []
        : [];
    const purposeId = planState.purpose?.id;
    const eduType = planState.subType || planState.eduType || ""; // Step2에서 선택한 교육유형
    const accCode = (() => {
      const budgets = currentPersona?.budgets || [];
      const b = budgets.find((x) => x.id === planState.budgetId);
      return b?.accountCode || b?.account_code || null;
    })();
    // ★ purpose + account + eduType 기준 최적 정책 선택
    const boPurposeKeys =
      typeof _FO_TO_BO_PURPOSE !== "undefined" && purposeId
        ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
        : [purposeId];
    const _purposeMatch = (pPurpose) =>
      !purposeId || boPurposeKeys.includes(pPurpose);
    // 1순위: purpose + account + eduType 모두 일치
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
      // 2순위: purpose + account만 일치 (eduType 무시)
      policies.find((p) => {
        const acc = p.account_codes || p.accountCodes || [];
        return _purposeMatch(p.purpose) && (!accCode || acc.includes(accCode));
      }) ||
      policies[0] ||
      null;

    (async () => {
      // 양식 로드 + 세부산출근거 DB 로드 병렬 수행
      const tplPromise =
        matched && typeof getFoFormTemplate === "function"
          ? getFoFormTemplate(matched, "plan", eduType)
          : Promise.resolve(null);
      const cgPromise =
        typeof _foLoadCalcGrounds === "function"
          ? _foLoadCalcGrounds()
          : Promise.resolve([]);
      const [tpl] = await Promise.all([tplPromise, cgPromise]);
      planState.formTemplate = tpl || null;
      planState.formTemplateLoading = false;
      renderPlanWizard();
    })();
    return;
  }
  renderPlanWizard();
}

function planPrev() {
  planState.step = Math.max(planState.step - 1, 1);
  renderPlanWizard();
}

// ─── 임시저장 ──────────────────────────────────────────────────────────────
async function savePlanDraft() {
  const total = _calcGroundsTotal();
  const amount = total || Number(planState.amount || 0);
  // ★ budgetId 없을 때 contextAccountCode로 폴백 (캠페인 진입 등)
  const curBudget = planState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === planState.budgetId)
    : planState.contextAccountCode
      ? (currentPersona.budgets || []).find((b) =>
          b.accountCode === planState.contextAccountCode || b.id === planState.contextAccountCode
        )
      : null;
  const accountCode =
    curBudget?.accountCode || _getPlanAccountCode(curBudget) || planState.contextAccountCode || planState.accountCode || "";
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 실패");
    return;
  }
  try {
    const planId = planState.editId || `DRAFT-${Date.now()}`;
    const row = {
      id: planId,
      tenant_id: currentPersona.tenantId,
      account_code: accountCode,
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      applicant_org_id: currentPersona.orgId || null,
      edu_name: planState.title || planState.eduTypeName || "교육계획",
      edu_type: planState.eduType || planState.eduSubType || null,
      amount: amount,
      status: "draft",
      policy_id: planState.policyId || null,
      plan_type: planState.plan_type || "ongoing",
      fiscal_year: planState.fiscal_year || new Date().getFullYear(),
      form_template_id: planState.formTemplate?.id || null,
      form_version: planState.formTemplate?.version || null,
      // 필드 표준화 (field_standardization.md PL-04, A-18~A-20)
      expected_benefit: planState.expectedBenefit || planState.expected_benefit || null,
      education_format: planState.educationFormat || planState.education_format || null,
      is_overseas: planState.isOverseas === true || planState.is_overseas === true || false,
      overseas_country: planState.overseasCountry || planState.overseas_country || null,
      // Phase E 정규화 컬럼 기반 저장 (이중 기록 종료)
      venue_type: planState.venueType || planState.venue_type || 'internal',
      planned_rounds: planState.plannedRounds || planState.planned_rounds || 1,
      planned_days: planState.plannedDays || planState.planned_days || null,
      detail: {
        purpose: planState.purpose?.id || null,
        purpose_text: planState.purpose_text || "",
        expectedEffect: planState.expectedEffect || "",
        eduPeriod: planState.eduPeriod || "",
        budgetId: planState.budgetId || null,
        eduType: planState.eduType,
        eduSubType: planState.eduSubType,
        calcGrounds: planState.calcGrounds || [],
        locations: planState.locations || [],
        period: planState.period || null,
        institution: planState.institution || null,
        notes: planState.notes || null,
        dept: currentPersona.dept,
        content: planState.content || "",
        startDate: planState.startDate || "",
        endDate: planState.endDate || "",
        _form_snapshot: planState.formTemplate
          ? {
              id: planState.formTemplate.id,
              name: planState.formTemplate.name,
              version: planState.formTemplate.version || 1,
              fields: (planState.formTemplate.fields || []).map((f) => ({
                key: typeof f === "object" ? f.key : f,
                scope: f?.scope,
                required: f?.required,
              })),
            }
          : null,
      },
    };
    const { error } = await sb.from("plans").upsert(row, { onConflict: "id" });
    if (error) throw error;
    planState.editId = planId;
    alert("💾 임시저장되었습니다.\n\n목록에서 이어쓰기할 수 있습니다.");
    console.log(`[savePlanDraft] 임시저장 성공: ${planId}`);
  } catch (err) {
    alert("임시저장 실패: " + err.message);
    console.error("[savePlanDraft] 실패:", err.message);
  }
}

// ─── 저장 (saved 상태 — 작성완료, 상신 전 대기) ──────────────────────────
//   draft  → saved : 작성이 완료된 항목. 목록에서 단건/다건 상신 가능
//   saved  → pending : 상신 완료. 결재 대기
async function savePlanSaved() {
  if (!planState.title) {
    alert("계획명을 입력해주세요.");
    return;
  }
  if (planState.formTemplate && typeof validateRequiredFields === "function") {
    const result = validateRequiredFields(planState.formTemplate, planState);
    if (!result.valid) {
      alert("⚠️ 필수 항목을 입력해주세요:\n\n• " + result.errors.join("\n• "));
      return;
    }
  }
  if (planState.hardLimitViolated) {
    alert("🚫 Hard Limit 초과 항목이 있어 저장할 수 없습니다.");
    return;
  }
  const total = _calcGroundsTotal();
  const amount = total || Number(planState.amount || 0);
  // ★ budgetId 없을 때 contextAccountCode로 폴백 (캠페인 진입 등)
  const curBudget = planState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === planState.budgetId)
    : planState.contextAccountCode
      ? (currentPersona.budgets || []).find((b) =>
          b.accountCode === planState.contextAccountCode || b.id === planState.contextAccountCode
        )
      : null;
  const accountCode =
    curBudget?.accountCode || _getPlanAccountCode(curBudget) || planState.contextAccountCode || planState.accountCode || "";
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }
  try {
    const planId = planState.editId || `PLAN-${Date.now()}`;
    const row = {
      id: planId,
      tenant_id: currentPersona.tenantId,
      account_code: accountCode,
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      applicant_org_id: currentPersona.orgId || null,
      edu_name: planState.title || "교육계획",
      edu_type: planState.eduType || planState.eduSubType || null,
      amount: amount,
      status: "saved",           // ← 3단계 상태 중 2단계
      policy_id: planState.policyId || null,
      plan_type: planState.plan_type || "ongoing",
      fiscal_year: planState.fiscal_year || new Date().getFullYear(),
      form_template_id: planState.formTemplate?.id || null,
      form_version: planState.formTemplate?.version || null,
      // 필드 표준화 (field_standardization.md PL-04, A-18~A-20)
      expected_benefit: planState.expectedBenefit || planState.expected_benefit || null,
      education_format: planState.educationFormat || planState.education_format || null,
      is_overseas: planState.isOverseas === true || planState.is_overseas === true || false,
      overseas_country: planState.overseasCountry || planState.overseas_country || null,
      // Phase E 정규화 컬럼 기반 저장 (이중 기록 종료)
      venue_type: planState.venueType || planState.venue_type || 'internal',
      planned_rounds: planState.plannedRounds || planState.planned_rounds || 1,
      planned_days: planState.plannedDays || planState.planned_days || null,
      detail: {
        purpose: planState.purpose?.id || null,
        purpose_text: planState.purpose_text || "",
        expectedEffect: planState.expectedEffect || "",
        eduPeriod: planState.eduPeriod || "",
        budgetId: planState.budgetId || null,
        eduType: planState.eduType,
        eduSubType: planState.eduSubType,
        calcGrounds: planState.calcGrounds || [],
        locations: planState.locations || [],
        period: planState.period || null,
        institution: planState.institution || null,
        notes: planState.notes || null,
        dept: currentPersona.dept,
        content: planState.content || "",
        startDate: planState.startDate || "",
        endDate: planState.endDate || "",
        _form_snapshot: planState.formTemplate
          ? {
              id: planState.formTemplate.id,
              name: planState.formTemplate.name,
              version: planState.formTemplate.version || 1,
              fields: (planState.formTemplate.fields || []).map((f) => ({
                key: typeof f === "object" ? f.key : f,
                scope: f?.scope,
                required: f?.required,
              })),
            }
          : null,
      },
    };
    const { error } = await sb.from("plans").upsert(row, { onConflict: "id" });
    if (error) throw error;
    planState.editId = planId;
    alert(`✅ 작성이 완료되었습니다.\n\n저장된 내용을 확인한 후 [상신하기]를 진행해주세요.`);
    console.log(`[savePlanSaved] 저장 성공 (saved): ${planId}`);
    
    // 상태 전환: 확인 화면(Confirm Mode)으로 바로 이동
    planState.confirmMode = true;
    renderPlans();
  } catch (err) {
    alert("저장 실패: " + err.message);
    console.error("[savePlanSaved] 실패:", err.message);
  }
}

// ─── 제출 → 작성확인 화면 ─────────────────────────────────────────────────
// (기존 savePlan 은 삭제하고 savePlanSaved 에서 병합 처리함)


// ─── 작성확인 화면 렌더링 ──────────────────────────────────────────────────
function renderPlanConfirm() {
  const s = planState;
  const total =
    typeof _calcGroundsTotal === "function" ? _calcGroundsTotal() : 0;
  const amount = total || Number(s.amount || 0);
  const curBudget = s.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === s.budgetId)
    : null;
  const accountCode =
    curBudget?.accountCode ||
    (typeof _getPlanAccountCode === "function"
      ? _getPlanAccountCode(curBudget)
      : "") ||
    "";
  const accountName = curBudget?.accountName || "";
  const purposeLabel = s.purpose?.label || s.purpose?.id || "-";

  document.getElementById("page-plans").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <!-- 헤더 -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">✅ 작성 확인</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">교육계획 제출 전 확인</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">아래 내용을 확인한 후 확정하면 결재라인으로 전달됩니다.</p>
      </div>
      <!-- 요약 (7단계 통합 뷰) -->
      <div style="padding:24px 28px; background:#F9FAFB">
        ${typeof window.foRenderStandardReadOnlyForm === 'function' ? window.foRenderStandardReadOnlyForm({...s, amount, accountCode}, 'FO') : '<p>렌더러 로딩 중...</p>'}
        
        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border-radius:10px;border:1.5px solid #FDE68A;font-size:12px;color:#92400E">
          ⚠️ 제출 후에는 결재라인이 자동 구성되며, 상위 승인자가 취소하기 전까지 취소가 불가합니다.
        </div>
      </div>
      <!-- 버튼 -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="_planViewTab='mine';planState=null;renderPlans()" style="margin-right:auto;padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:#F9FAFB;color:#4B5563;cursor:pointer">≡ 목록으로</button>
        <button onclick="planState.confirmMode=false;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 수정하기</button>
        <button onclick="confirmPlan()" style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">✅ 확정 제출</button>
      </div>
    </div>
  </div>`;
}

// ─── 확정 제출 ─────────────────────────────────────────────────────────────
async function confirmPlan() {
  const total =
    typeof _calcGroundsTotal === "function" ? _calcGroundsTotal() : 0;
  const amount = total || Number(planState.amount || 0);
  const curBudget = planState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === planState.budgetId)
    : null;
  const accountCode =
    curBudget?.accountCode ||
    (typeof _getPlanAccountCode === "function"
      ? _getPlanAccountCode(curBudget)
      : "") ||
    "";
  // ★ Phase F: 수시 교육계획 통장 잔액 경고
  if (planState.plan_type === "ongoing" && amount > 0) {
    const ok = await _foCheckBankBalanceWarning(amount);
    if (!ok) return;
  }

  const sb = typeof getSB === "function" ? getSB() : null;
  let planId = planState.editId || `PLAN-${Date.now()}`;

  if (sb) {
    try {
      const row = {
        id: planId,
        tenant_id: currentPersona.tenantId,
        account_code: accountCode,
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        applicant_org_id: currentPersona.orgId || null,
        edu_name: planState.title || planState.eduTypeName || "교육계획",
        edu_type: planState.eduType || planState.eduSubType || null,
        amount: amount,
        status: 'submitted',  // [S-6] pending → submitted
        policy_id: planState.policyId || null,
        plan_type: planState.plan_type || 'ongoing',
        fiscal_year: planState.fiscal_year || new Date().getFullYear(),
        form_template_id: planState.formTemplate?.id || null,
        form_version: planState.formTemplate?.version || null,
        // Phase E 정규화 컬럼 기반 저장 (이중 기록 종료)
        is_overseas: planState.isOverseas === true || planState.is_overseas === true || false,
        overseas_country: planState.overseasCountry || planState.overseas_country || null,
        education_format: planState.educationFormat || planState.education_format || null,
        expected_benefit: planState.expectedBenefit || planState.expected_benefit || null,
        venue_type: planState.venueType || planState.venue_type || 'internal',
        planned_rounds: planState.plannedRounds || planState.planned_rounds || 1,
        planned_days: planState.plannedDays || planState.planned_days || null,
        detail: {
          purpose: planState.purpose?.id || null,
          purpose_text: planState.purpose_text || "",
          expectedEffect: planState.expectedEffect || "",
          eduPeriod: planState.eduPeriod || "",
          budgetId: planState.budgetId || null,
          eduType: planState.eduType,
          eduSubType: planState.eduSubType,
          calcGrounds: planState.calcGrounds || [],
          locations: planState.locations || [],
          period: planState.period || null,
          institution: planState.institution || null,
          notes: planState.notes || null,
          dept: currentPersona.dept,
          content: planState.content || "",
          _form_snapshot: planState.formTemplate
            ? {
                id: planState.formTemplate.id,
                name: planState.formTemplate.name,
                version: planState.formTemplate.version || 1,
                fields: (planState.formTemplate.fields || []).map((f) => ({
                  key: typeof f === "object" ? f.key : f,
                  scope: f?.scope,
                  required: f?.required,
                })),
              }
            : null,
        },
      };
      const { error } = await sb
        .from("plans")
        .upsert(row, { onConflict: "id" });
      if (error) throw error;
      console.log(`[confirmPlan] DB 제출 성공: ${planId}`);
    } catch (err) {
      alert("제출 실패: " + _friendlyStatusError(err.message));
      console.error("[confirmPlan] 실패:", err.message);
      return;
    }

    // [S-6] submission_documents + submission_items 자동 생성
    try {
      const now = new Date().toISOString();
      const docId = `SUBDOC-${Date.now()}`;
      const docRow = {
        id: docId,
        tenant_id: currentPersona.tenantId,
        submission_type: 'fo_user',
        submitter_id: currentPersona.id,
        submitter_name: currentPersona.name,
        submitter_org_id: currentPersona.orgId || null,
        submitter_org_name: currentPersona.dept || null,
        title: `${planState.title || planState.eduTypeName || '교육계획'} 상신`,
        account_code: accountCode || null,
        total_amount: amount,
        status: 'submitted',
        submitted_at: now,
      };
      await sb.from('submission_documents').insert(docRow).catch(e => console.warn('[confirmPlan] submission_documents 생성 실패:', e.message));
      const itemRow = {
        submission_id: docId,
        item_type: 'plan',
        item_id: planId,
        item_title: planState.title || planState.eduTypeName || '교육계획',
        item_amount: amount,
        account_code: accountCode || null,
        policy_id: planState.policyId || null,
        item_status: 'pending',
        sort_order: 0,
      };
      await sb.from('submission_items').insert(itemRow).catch(e => console.warn('[confirmPlan] submission_items 생성 실패:', e.message));
      console.log('[confirmPlan] 상신 문서 자동 생성:', docId);
    } catch (sdErr) {
      console.warn('[confirmPlan] 상신 문서 생성 오류 (비치명적):', sdErr.message);
    }
  }

  alert(
    `✅ 교육계획이 상신되었습니다.\n\n계획액: ${amount.toLocaleString()}원\n상신 문서가 자동 생성되어 팀장 결재함으로 전달됩니다.`,
  );
  closePlanWizard();
  _plansDbLoaded = false;
  renderPlans();
}

// ─── 임시저장 이어쓰기 ─────────────────────────────────────────────────────
async function resumePlanDraft(planId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();
    if (error || !data) {
      alert("임시저장 건을 불러올 수 없습니다.");
      return;
    }
    planState = resetPlanState();
    planState.editId = data.id;
    planState.title = data.edu_name || "";
    planState.eduType = data.edu_type || data.detail?.eduType || "";
    planState.eduSubType = data.detail?.eduSubType || "";
    planState.subType = data.detail?.eduSubType || "";
    planState.amount = data.amount || "";
    planState.content = data.detail?.content || "";
    planState.startDate = data.detail?.startDate || "";
    planState.endDate = data.detail?.endDate || "";
    planState.purpose_text = data.detail?.purpose_text || "";
    planState.expectedEffect = data.detail?.expectedEffect || "";
    planState.eduPeriod = data.detail?.eduPeriod || "";
    planState.budgetId = data.detail?.budgetId || "";
    planState.calcGrounds = data.detail?.calcGrounds || [];
    planState.locations = Array.isArray(data.detail?.locations) ? data.detail.locations : [];
    planState.policyId = data.policy_id || null;
    planState.region = data.detail?.region || "domestic";
    planState.accountCode = data.account_code || "";

    // ★ budgetId 없을 때 account_code로 budgetId + contextAccountCode 복원
    // (캠페인 진입으로 저장된 계획은 budgetId가 null일 수 있음)
    if (!planState.budgetId && data.account_code) {
      planState.contextAccountCode = data.account_code;
      const matchedBudget = (currentPersona.budgets || []).find(b =>
        b.accountCode === data.account_code || b.id === data.account_code
      );
      if (matchedBudget) {
        planState.budgetId = matchedBudget.id;
      }
    }


    // ★ purpose 복원: PURPOSES 배열에서 id로 풀 오브젝트 매칭
    const purposeId = data.detail?.purpose;
    if (purposeId) {
      // 정책 기반 목적에서 우선 탐색 → PURPOSES 폴백
      const policyPurposes =
        typeof getPersonaPurposes === "function"
          ? getPersonaPurposes(currentPersona)
          : [];
      const PURPOSES_ARR = typeof PURPOSES !== "undefined" ? PURPOSES : [];
      const matched =
        policyPurposes.find((p) => p.id === purposeId) ||
        PURPOSES_ARR.find((p) => p.id === purposeId);
      if (matched) {
        planState.purpose = matched;
      } else {
        // 폴백: EDU_PURPOSE_GROUPS에서 찾기
        const groups =
          typeof EDU_PURPOSE_GROUPS !== "undefined" ? EDU_PURPOSE_GROUPS : [];
        for (const g of groups) {
          const found = (g.items || g.purposes || []).find(
            (p) => p.id === purposeId,
          );
          if (found) {
            planState.purpose = found;
            break;
          }
        }
        // 최종 폴백: id만이라도 설정
        if (!planState.purpose)
          planState.purpose = { id: purposeId, label: purposeId };
      }
    }

    planState.step = 3; // 세부정보 입력 화면으로 바로 진입

    // ★ step 4 진입 시 formTemplate 비동기 로드 (정상 위저드 흐름과 동일)
    planState.formTemplateLoading = true;
    renderPlans(); // 로딩 중 표시

    const policies =
      typeof _getActivePolicies === "function"
        ? _getActivePolicies(currentPersona)?.policies || []
        : [];
    const rPurposeId = planState.purpose?.id;
    const rAccCode =
      data.account_code ||
      planState.accountCode ||
      (() => {
        const budgets = currentPersona?.budgets || [];
        const b = budgets.find((x) => x.id === planState.budgetId);
        return b?.accountCode || b?.account_code || null;
      })();
    const rMatched =
      policies.find((p) => {
        const acc = p.account_codes || p.accountCodes || [];
        return (
          (!rPurposeId || p.purpose === rPurposeId) &&
          (!rAccCode || acc.includes(rAccCode))
        );
      }) ||
      policies.find((p) =>
        (p.account_codes || p.accountCodes || []).includes(rAccCode),
      ) ||
      policies[0] ||
      null;

    if (rMatched) planState.policyId = rMatched.id;

    let tpl = null;
    if (rMatched && typeof getFoFormTemplate === "function") {
      // ★ P1-1 수정: 이어쓰기 시에도 eduType 전달
      const rEduType =
        planState.subType || planState.eduType || data.edu_type || "";
      tpl = await getFoFormTemplate(rMatched, "plan", rEduType);
    }
    planState.formTemplate = tpl || null;
    planState.formTemplateLoading = false;
    renderPlans();
  } catch (err) {
    alert("불러오기 실패: " + err.message);
  }
}

// ─── 임시저장 삭제 ─────────────────────────────────────────────────────────
async function deletePlanDraft(planId) {
  if (!confirm("임시저장된 계획을 삭제하시겠습니까?")) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      await sb.from("plans").delete().eq("id", planId).eq("status", "draft");
    } catch (err) {
      console.error("[deletePlanDraft]", err.message);
    }
  }
  _plansDbLoaded = false;
  renderPlans();
}

// ─── 상태 전이 에러 한국어 변환 ─────────────────────────────────────────────
function _friendlyStatusError(msg) {
  if (!msg) return "알 수 없는 에러";
  const m = msg.match(/Invalid status transition:\s*(\w+)\s*→\s*(\w+)/);
  if (!m) return msg;
  const labels = {
    draft: "작성중(임시저장)",
    saved: "저장완료",
    pending: "결재대기(상신됨)",
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
  };
  return `현재 '${labels[m[1]] || m[1]}' 상태에서 '${labels[m[2]] || m[2]}'(으)로 변경할 수 없습니다.`;
}

// ─── 교육계획 취소 ─────────────────────────────────────────────────────────
async function cancelPlan(planId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb
        .from("plans")
        .select("status")
        .eq("id", planId)
        .single();
      if (data?.status === "approved") {
        alert(
          "⚠️ 이미 승인된 계획은 상위 승인자가 취소해야 합니다.\n\n결재라인 관리자에게 문의해주세요.",
        );
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
  if (!confirm("이 교육계획을 취소하고 임시저장 상태로 되돌리시겠습니까?"))
    return;
  if (sb) {
    try {
      const { error } = await sb
        .from("plans")
        .update({ status: "draft" })
        .eq("id", planId);
      if (error) throw error;
      alert(
        "교육계획이 임시저장 상태로 되돌려졌습니다.\n수정 후 다시 제출할 수 있습니다.",
      );
    } catch (err) {
      alert("취소 실패: " + _friendlyStatusError(err.message));
      return;
    }
  }
  _plansDbLoaded = false;
  _viewingPlanDetail = null;
  renderPlans();
}

// ─── 상신 후 회수하기 (Detail 뷰) ──────────────────────────────────────────
async function foRecallPlanFromDetail(planId) {
  if (typeof _aprRecallSubmit === 'function') {
    await _aprRecallSubmit(planId, 'plans');
    _viewingPlanDetail = null;
    _plansDbLoaded = false;
    renderPlans();
  } else {
    alert("결재 모듈을 찾을 수 없습니다.");
  }
}

// ─── 교육계획 기반 교육신청 연동 ─────────────────────────────────────────────
async function startApplyFromPlan(planId) {
  // 1. DB에서 계획 조회
  let plan = null;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data, error } = await sb
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();
      if (!error && data) {
        plan = {
          id: data.id,
          title: data.edu_name,
          budgetId: data.detail?.budgetId || null,
          purpose: data.detail?.purpose || null,
          account: data.account_code,
          status: data.status,
          endDate: data.detail?.endDate || data.end_date || null,
          amount: data.amount || data.detail?.amount || 0,
        };
      }
    } catch (err) {
      console.warn("[startApplyFromPlan] DB 조회 실패:", err.message);
    }
  }
  // 2. _plansDbCache 캐시 폴백
  if (!plan && _plansDbCache) {
    const cached = _plansDbCache.find((p) => p.id === planId);
    if (cached)
      plan = {
        id: cached.id,
        title: cached.edu_name,
        budgetId: cached.detail?.budgetId,
        purpose: cached.detail?.purpose,
        status: cached.status,
        endDate: cached.detail?.endDate,
        amount: cached.amount || 0,
      };
  }
  if (!plan) {
    navigate("apply");
    return;
  }

  // 3. 상태 검증 (E2, TC5)
  const planSt = plan.status || "";
  if (planSt !== "approved" && planSt !== "승인완료") {
    alert(
      "❌ 승인완료 상태의 계획만 교육신청이 가능합니다.\n현재 상태: " +
        (planSt || "알 수 없음"),
    );
    return;
  }
  // 4. 만료 검증 (E4)
  if (plan.endDate && new Date(plan.endDate) < new Date()) {
    alert("⚠ 이 교육계획은 기간이 만료되었습니다.\n만료일: " + plan.endDate);
    return;
  }

  applyState = resetApplyState();
  applyState.planId = planId;
  if (plan.budgetId) applyState.budgetId = plan.budgetId;
  const purposeId = plan.purpose || "internal_edu";
  const policyPurposes2 =
    typeof getPersonaPurposes === "function"
      ? getPersonaPurposes(currentPersona)
      : [];
  applyState.purpose =
    policyPurposes2.find((p) => p.id === purposeId) ||
    PURPOSES.find((p) => p.id === purposeId) ||
    null;
  applyViewMode = "form";
  if (applyState.purpose) applyState.step = 2;
  navigate("apply");
}

// ─── 세부 산출 근거 (Calculation Grounds) 헬퍼 ──────────────────────────────

// 현재 선택한 예산 계정의 accountCode를 반환
function _getPlanAccountCode(curBudget) {
  if (!curBudget) return null;
  // data.js의 budgets: account 필드로 계정 이름 매핑
  const acctMap = {
    참가: "HMC-PART",
    운영: "HMC-OPS",
    연구투자: "HMC-RND",
    기타: "HMC-ETC",
  };
  // tenantId 기반으로 매핑
  const tenantId = currentPersona.tenantId || "HMC";
  const prefixed = {
    HMC: {
      참가: "HMC-PART",
      운영: "HMC-OPS",
      연구투자: "HMC-RND",
      기타: "HMC-ETC",
    },
    KIA: { 참가: "KIA-PART", 운영: "KIA-OPS" },
    HAE: { 참가: "HAE-PART", 자격증: "HAE-CERT", 운영: "HAE-OPS" },
  };
  return (prefixed[tenantId] || acctMap)[curBudget.account] || null;
}

// ─── Phase5: 교육장소 멀티 TAG 입력 ───────────────────────────────────────
function _renderLocationTagInput(s) {
  const locs = Array.isArray(s.locations) ? s.locations : [];
  const tagHtml = locs.map((loc, i) => {
    const safe = String(loc).replace(/['"<>&]/g, '');
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px">
      📍 ${safe}
      <button onclick="event.stopPropagation();_planRemoveLocation(${i})" style="background:none;border:none;cursor:pointer;color:#3B82F6;font-size:13px;line-height:1;padding:0 0 0 2px">✕</button>
    </span>`;
  }).join('');

  return `
<div style="margin-bottom:16px">
  <label style="display:block;font-size:11px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
    📍 교육장소 <span style="font-size:9px;font-weight:500;color:#9CA3AF;text-transform:none">(선택사항 · 복수 입력 가능)</span>
  </label>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;min-height:${locs.length > 0 ? 'auto':'0'}">
    ${tagHtml}
  </div>
  <div style="display:flex;gap:6px;align-items:center">
    <input id="plan-location-input" type="text" placeholder="장소 입력 후 Enter (예: 현대인재개발원)"
      onkeydown="if(event.key==='Enter'){event.preventDefault();_planAddLocation(document.getElementById('plan-location-input').value)}"
      style="flex:1;padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:600;outline:none;transition:border .15s"
      onfocus="this.style.borderColor='#3B82F6'" onblur="this.style.borderColor='#E5E7EB'">
    <button onclick="_planAddLocation(document.getElementById('plan-location-input').value)"
      style="padding:7px 14px;border-radius:8px;background:#EFF6FF;color:#1D4ED8;border:1.5px solid #BFDBFE;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">+ 추가</button>
  </div>
</div>`;
}

function _planAddLocation(val) {
  const v = (val || '').trim();
  if (!v) return;
  if (!Array.isArray(planState.locations)) planState.locations = [];
  if (!planState.locations.includes(v)) planState.locations.push(v);
  renderPlanWizard();
}

function _planRemoveLocation(idx) {
  if (!Array.isArray(planState.locations)) return;
  planState.locations.splice(idx, 1);
  renderPlanWizard();
}

// 세부산출근거 합계 계산
function _calcGroundsTotal() {
  if (!planState.calcGrounds || planState.calcGrounds.length === 0) return 0;
  return planState.calcGrounds.reduce((sum, row) => sum + (row.total || 0), 0);
}

// 세부산출근거 합계를 계획액 필드에 자동 반영 + Hard Limit 체크
function _syncCalcToAmount() {
  const total = _calcGroundsTotal();
  if (total > 0) planState.amount = total;
  _checkHardLimits();
}

// Hard Limit 체크
function _checkHardLimits() {
  let violated = false;
  (planState.calcGrounds || []).forEach((row) => {
    const item =
      typeof CALC_GROUNDS_MASTER !== "undefined"
        ? CALC_GROUNDS_MASTER.find((g) => g.id === row.itemId)
        : null;
    if (item && item.hardLimit > 0 && row.total > item.hardLimit)
      violated = true;
  });
  planState.hardLimitViolated = violated;
}

// 세부산출근거 섹션 렌더
function _renderCalcGroundsSection(s, curBudget) {
  if (typeof CALC_GROUNDS_MASTER === "undefined") return "";

  // ─── PURPOSE 기반 유형 자동 판별 ───────────────────────────────────────────
  const purposeId = s.purpose?.id || "";
  // external_personal = 직접학습형(개인 사외교육), 나머지 = 교육운영형
  const isSelfLearning = purposeId === "external_personal";
  const usageType = isSelfLearning ? "self_learning" : "edu_operation";

  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType(usageType, vorgId, false)
    : (typeof getCalcGroundsForVorg === "function" ? getCalcGroundsForVorg(vorgId, null) : []);

  // items가 비어있어도(DB 로드 전 또는 항목 미설정) UI는 표시 — 빈 항목 추가 버튼 노출

  // 직접학습형 → 별도 심플 UI
  if (isSelfLearning) return _renderSLCalcGrounds(s, items);

  const rows = s.calcGrounds || [];
  const subtotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);
  const maxQty1 = rows.reduce((m, r) => Math.max(m, r.qty1 || r.qty || 1), 1);
  const perPerson = maxQty1 > 0 ? Math.round(subtotal / maxQty1) : 0;

  let hasHard = false;
  rows.forEach((r) => {
    const item = items.find((g) => g.id === r.itemId);
    if (item && item.hardLimit > 0 && r.total > item.hardLimit) hasHard = true;
  });

  // 교육운영형: 수량+유형 3쌍 항상 표시 (BO 설정 무관)
  const CG_UNIT_TYPES = ['시간','명','식','일','박','회','차수','장'];

  return `
<div class="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
  <div class="flex items-center justify-between mb-4">
    <div>
      <div class="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">📐 세부 산출 근거 <span style="font-size:10px;background:#DBEAFE;color:#1D4ED8;padding:2px 8px;border-radius:5px">🎯 교육운영용 (단가 × 수량1 × 수량2 × 수량3)</span></div>
      <div class="text-[11px] text-gray-500">항목 선택 → 장소(선택) → 프리셋 선택 시 단가·박수 자동 입력됩니다.</div>
    </div>
    <button onclick="_cgAddRow()"
      class="text-xs font-black text-white bg-accent px-4 py-2 rounded-xl hover:bg-blue-600 transition shadow">
      + 항목 추가
    </button>
  </div>

  ${
    rows.length > 0
      ? `
  <!-- 항목 행 테이블 -->
  <div class="bg-white rounded-xl overflow-hidden border border-blue-100 mb-3" style="overflow-x:auto">
    <table class="w-full text-xs" style="min-width:600px">
      <thead class="bg-blue-50">
          <th class="px-3 py-2 text-left" style="min-width:110px">항목</th>
          <th class="px-3 py-2 text-left" style="min-width:80px">세부항목</th>
          <th class="px-3 py-2 text-right" style="width:80px">단가(원)</th>
          <th class="px-3 py-2 text-center" style="width:150px">수량 및 단위</th>
          <th class="px-3 py-2 text-right" style="width:80px">예산금액(원)</th>
          <th class="px-3 py-2 text-left" style="width:80px">비고</th>
          <th class="px-3 py-2 text-center" style="width:32px"></th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, idx) => {
            const item = items.find((g) => g.id === row.itemId);
            const isSoftOver = item && item.softLimit > 0 && row.total > item.softLimit;
            const isHardOver = item && item.hardLimit > 0 && row.total > item.hardLimit;
            const rowBg = isHardOver ? "#FEF2F2" : isSoftOver ? "#FFFBEB" : "#fff";
            // 프리셋: venue_name 기준 지역(venue) 분리
            const presets = row._presets || [];
            const venues = [...new Set(presets.map(p => p.venue_name).filter(Boolean))];
            const isComposite = venues.length > 0;
            // 선택 중인 장소의 세부항목 목록
            const selVenue = row.venueName || '';
            const venuePresets = isComposite
              ? presets.filter(p => p.venue_name === selVenue)
              : presets;
            const showQty2 = true; // 항상 표시
            const showRounds = true; // 항상 표시
            const uSel = (val, fn) => `<select onchange="${fn}(${idx},this.value)" style="font-size:11px;font-weight:700;border:1.5px solid #BFDBFE;border-radius:6px;padding:2px 4px;background:#EFF6FF;color:#1D4ED8;cursor:pointer;width:52px">${CG_UNIT_TYPES.map(u=>'<option value="'+u+'" '+(val===u?'selected':'')+'>'+u+'</option>').join('')}</select>`;
            return `
          <tr style="background:${rowBg};border-top:1px solid #F3F4F6">
            <td class="px-3 py-2">
              <select onchange="_cgUpdateItemId(${idx}, this.value)"
                style="font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px;background:#fff;max-width:160px">
                <option value="">-- 항목 선택 --</option>
                ${items.map((g) => `<option value="${g.id}" ${row.itemId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
              </select>
              ${item ? `<div class="text-[10px] text-gray-400 mt-0.5 pl-1">${item.desc||''}</div>` : ""}
              ${item ? `<div style="font-size:9px;color:#7C3AED;margin-top:1px">${[item.hasRounds?'차수':'',item.hasQty2?qty2Label:'',item.isOverseas?'해외':''].filter(Boolean).map(t=>`[${t}]`).join(' ')}</div>` : ''}
              ${isSoftOver && !isHardOver ? `
              <div class="mt-1">
                <span style="color:#D97706;font-size:10px;font-weight:800">⚠ Soft Limit(${fmt(item.softLimit)}원) 초과</span>
                <input type="text" placeholder="초과 사유 입력 (필수)"
                  value="${row.limitOverrideReason || ""}"
                  oninput="_cgUpdateReason(${idx}, this.value)"
                  style="display:block;margin-top:2px;font-size:10px;border:1px solid #FDE68A;border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box">
              </div>` : ""}
              ${isHardOver ? `<span style="color:#DC2626;font-size:10px;font-weight:800;display:block;margin-top:2px">🚫 Hard Limit(${fmt(item.hardLimit)}원) 초과 — 저장 불가</span>` : ""}
            </td>
            <td class="px-3 py-2" style="min-width:130px">
              ${isComposite ? `
                <div style="display:flex;flex-direction:column;gap:4px">
                  <!-- 장소(venue) 선택 -->
                  <select onchange="_cgSelectVenue(${idx}, this.value)"
                    style="font-size:10px;font-weight:700;border:1.5px solid #BFDBFE;border-radius:6px;padding:3px 5px;background:#EFF6FF;color:#1D4ED8;width:100%">
                    <option value="">장소 선택...</option>
                    ${venues.map(v => `<option value="${v}" ${selVenue===v?'selected':''}>${v}</option>`).join('')}
                  </select>
                  <!-- 세부항목(preset) 선택 (장소 선택 후 표시) -->
                  ${selVenue ? `
                  <select onchange="_cgApplyPreset(${idx}, this.value)"
                    style="font-size:10px;font-weight:700;border:1.5px solid #BFDBFE;border-radius:6px;padding:3px 5px;background:#F0FDF4;color:#065F46;width:100%">
                    <option value="">세부항목 선택...</option>
                    ${venuePresets.map(p => {
                      const pVal = p.venue_name+'|'+(p.preset_name||p.detail_name||'')+'|'+p.unit_price+'|'+(p.qty2_value||1);
                      const sel = row.presetKey === (p.venue_name+'|'+(p.preset_name||p.detail_name||'')) ? 'selected' : '';
                      const label = (p.preset_name||p.detail_name||'') + (p.unit_price>0 ? ' ('+Number(p.unit_price).toLocaleString()+'원)' : '');
                      return `<option value="${pVal}" ${sel}>${label}</option>`;
                    }).join('')}
                  </select>` : `<span style="font-size:10px;color:#9CA3AF">장소를 먼저 선택하세요</span>`}
                </div>
              ` : presets.length > 0 ? `
                <select onchange="_cgApplyPreset(${idx}, this.value)"
                  style="font-size:10px;font-weight:700;border:1.5px solid #BFDBFE;border-radius:6px;padding:3px 5px;background:#EFF6FF;width:100%">
                  <option value="">세부항목 선택...</option>
                  ${presets.map(p => {
                    const pVal = (p.venue_name||'')+'|'+(p.preset_name||p.detail_name||'')+'|'+p.unit_price+'|'+(p.qty2_value||1);
                    const sel = row.presetKey === ((p.venue_name||'')+'|'+(p.preset_name||p.detail_name||'')) ? 'selected' : '';
                    const label = (p.preset_name||p.detail_name||'') + (p.unit_price>0?' ('+Number(p.unit_price).toLocaleString()+'원)':'');
                    return `<option value="${pVal}" ${sel}>${label}</option>`;
                  }).join('')}
                </select>
              ` : `<span style="font-size:10px;color:#9CA3AF">직접입력</span>`}
              ${row.presetName ? `<div style="font-size:9px;color:#059669;margin-top:2px;font-weight:700">✓ ${row.venueName ? row.venueName+' · ' : ''}${row.presetName}</div>` : ''}
            </td>
            <td class="px-3 py-2">
              <input type="number" value="${row.unitPrice || 0}"
                oninput="_cgUpdateUnitPrice(${idx}, this.value)"
                style="width:80px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
            </td>
            ${(() => {
              let activeMults = row.activeMultipliers;
              if (!activeMults) {
                if (row.qty3 > 1) activeMults = 3;
                else if (row.qty2 > 1) activeMults = 2;
                else activeMults = 1;
              }
              return `
            <td class="px-3 py-2 text-center" style="vertical-align: top; padding-top: 10px;">
              <div class="flex flex-col gap-1.5 w-full max-w-[150px] mx-auto">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[10px] text-gray-500 font-bold w-6 text-left">수량</span>
                  <input type="number" value="${row.qty1||row.qty||1}" min="1"
                    oninput="_cgUpdateQty1(${idx},this.value)"
                    style="width:40px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:3px 4px">
                  ${uSel(row.type1||'명','_cgUpdateType1')}
                  ${activeMults < 3 ? `<button onclick="window._cgAddMultiplier(${idx})" style="width:20px;height:20px;border-radius:4px;background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">+</button>` : `<div style="width:20px"></div>`}
                </div>
                ${activeMults >= 2 ? `
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[12px] text-gray-400 font-bold w-2 text-center">×</span>
                  <span class="text-[10px] text-gray-500 font-bold w-4 text-left">기간</span>
                  <input type="number" value="${row.qty2||1}" min="1"
                    oninput="_cgUpdateQty2(${idx},this.value)"
                    style="width:40px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:3px 4px">
                  ${uSel(row.type2||'일','_cgUpdateType2')}
                  ${activeMults === 2 ? `<button onclick="window._cgRemoveMultiplier(${idx})" style="width:20px;height:20px;border-radius:4px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">-</button>` : `<div style="width:20px"></div>`}
                </div>` : ''}
                ${activeMults >= 3 ? `
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[12px] text-gray-400 font-bold w-2 text-center">×</span>
                  <span class="text-[10px] text-gray-500 font-bold w-4 text-left">차수</span>
                  <input type="number" value="${row.qty3||1}" min="1"
                    oninput="_cgUpdateQty3(${idx},this.value)"
                    style="width:40px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:3px 4px">
                  ${uSel(row.type3||'차수','_cgUpdateType3')}
                  <button onclick="window._cgRemoveMultiplier(${idx})" style="width:20px;height:20px;border-radius:4px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">-</button>
                </div>` : ''}
              </div>
            </td>`;
            })()}
            <td class="px-3 py-2 text-right font-black" style="color:${isHardOver?'#DC2626':isSoftOver?'#D97706':'#111827'};vertical-align: top; padding-top: 14px;">
              ${fmt(row.total)}
            </td>
            <td class="px-3 py-2" style="vertical-align: top; padding-top: 10px;">
              <input type="text" value="${(row.note||'').replace(/"/g,'&quot;')}" placeholder="비고"
                oninput="_cgUpdateRowNote(${idx},this.value)"
                style="width:100%;font-size:10px;border:1.5px solid #E5E7EB;border-radius:5px;padding:2px 4px;color:#6B7280;box-sizing:border-box">
            </td>
            <td class="px-3 py-2 text-center">
              <button onclick="_cgRemoveRow(${idx})" style="color:#D1D5DB;font-size:14px;border:none;background:none;cursor:pointer">✕</button>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>

  <!-- 합계 & 인당 비용 -->
  <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100">
    <div>
      <div class="text-xs font-black text-gray-500">세부 산출 합계</div>
      ${perPerson > 0 ? `<div class="text-[10px] text-gray-400 mt-0.5">※ 최대 인원(${maxQty1}명) 기준 1인당 약 ${fmt(perPerson)}원</div>` : ""}
    </div>
    <div class="font-black text-lg ${hasHard ? "text-red-600" : "text-accent"}">${fmt(subtotal)}원</div>
  </div>`
      : `
  <div class="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 border border-dashed border-blue-200">
    위의 '+ 항목 추가' 버튼을 눌러 산출 근거 항목을 입력하세요.
  </div>`
  }
</div>`;
}

// 결재라인 정보 표시
function _renderApprovalRouteInfo(s, curBudget) {
  if (typeof getApprovalRoute === "undefined" || !curBudget) return "";
  const accountCode = _getPlanAccountCode(curBudget);
  if (!accountCode) return "";
  const amount = Number(s.amount) || _calcGroundsTotal();
  if (!amount) return "";
  const route = getApprovalRoute(accountCode, amount);
  if (!route) return "";
  return `
<div class="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
  <span class="text-amber-500 text-sm">📋</span>
  <span class="text-xs font-bold text-amber-800">${route.range.label}: ${route.range.approvers.join(" → ")}</span>
  <span class="text-[10px] text-amber-600 ml-1">(예상 결재라인)</span>
</div>`;
}

// ─── 직접학습형 (self_learning) 산출근거 UI ──────────────────────────────────
// purpose = external_personal (개인 사외교육) → 단가 × 인원 = 소계 (2중 승산)
function _renderSLCalcGrounds(s, items) {
  const rows = s.calcGrounds || [];
  const subtotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);

  // DB에 self_learning 항목이 없으면 하드코딩 폴백 제공
  const SL_FALLBACK = [
    { id: "_sl_edu",   name: "교육비/등록비",  unitPrice: 0 },
    { id: "_sl_mat",   name: "교보재비",       unitPrice: 0 },
    { id: "_sl_exam",  name: "시험응시료",      unitPrice: 0 },
    { id: "_sl_trvl",  name: "교통비",         unitPrice: 0 },
    { id: "_sl_other", name: "기타",           unitPrice: 0 },
  ];
  const itemList = items.length > 0 ? items : SL_FALLBACK;

  const rowHtml = rows.map((row, idx) => {
    const item = itemList.find(g => g.id === row.itemId) || null;
    const isSoftOver = item?.softLimit > 0 && row.total > item.softLimit;
    const isHardOver = item?.hardLimit > 0 && row.total > item.hardLimit;
    const rowBg = isHardOver ? "#FEF2F2" : isSoftOver ? "#FFFBEB" : "#fff";
    return `
    <tr style="background:${rowBg};border-top:1px solid #F3F4F6">
      <td class="px-3 py-2">
        <select onchange="_cgSlUpdateItem(${idx}, this.value)"
          style="font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px;background:#fff;max-width:150px">
          <option value="">-- 항목 선택 --</option>
          ${itemList.map(g => `<option value="${g.id}" ${row.itemId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
        </select>
        ${isSoftOver && !isHardOver ? `<div class="mt-1"><span style="color:#D97706;font-size:10px;font-weight:800">⚠ Soft Limit 초과</span>
          <input type="text" placeholder="초과 사유 입력" value="${row.limitOverrideReason||""}"
            oninput="_cgUpdateReason(${idx},this.value)"
            style="display:block;margin-top:2px;font-size:10px;border:1px solid #FDE68A;border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box"></div>` : ""}
        ${isHardOver ? `<span style="color:#DC2626;font-size:10px;font-weight:800;display:block;margin-top:2px">🚫 Hard Limit 초과 — 저장 불가</span>` : ""}
      </td>
      <td class="px-3 py-2">
        <input type="number" value="${row.unitPrice || 0}"
          oninput="_cgSlUpdatePrice(${idx}, this.value)"
          style="width:90px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
      </td>
      <td class="px-3 py-2">
        <input type="number" value="${row.qty1 || 1}" min="1"
          oninput="_cgSlUpdateQty(${idx}, this.value)"
          style="width:52px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
      </td>
      <td class="px-3 py-2 text-right font-black" style="color:${isHardOver?"#DC2626":isSoftOver?"#D97706":"#111827"};min-width:80px">
        ${fmt(row.total)}원
      </td>
      <td class="px-3 py-2">
        <input type="text" value="${row.note || ""}" placeholder="비고"
          oninput="_cgSlUpdateNote(${idx}, this.value)"
          style="width:80px;font-size:11px;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
      </td>
      <td class="px-3 py-2 text-center">
        <button onclick="_cgRemoveRow(${idx})" style="color:#D1D5DB;font-size:14px;border:none;background:none;cursor:pointer">✕</button>
      </td>
    </tr>`;
  }).join("");

  return `
<div class="rounded-2xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
  <div class="flex items-center justify-between mb-4">
    <div>
      <div class="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">
        💰 세부 산출 근거
        <span style="font-size:10px;background:#D1FAE5;color:#059669;padding:2px 8px;border-radius:5px">🎒 개인직무/사외교육용 (단가 × 인원)</span>
      </div>
      <div class="text-[11px] text-gray-500">항목 선택 후 단가·인원을 입력하면 소계가 자동 계산됩니다.</div>
    </div>
    <button onclick="_cgAddRowSL()"
      class="text-xs font-black text-white bg-green-600 px-4 py-2 rounded-xl hover:bg-green-700 transition shadow">
      + 항목 추가
    </button>
  </div>

  ${rows.length > 0 ? `
  <div class="bg-white rounded-xl overflow-hidden border border-green-100 mb-3" style="overflow-x:auto">
    <table class="w-full text-xs" style="min-width:520px">
      <thead class="bg-green-50">
        <tr class="text-[10px] font-black text-green-600 uppercase tracking-wider">
          <th class="px-3 py-2 text-left" style="min-width:140px">항목</th>
          <th class="px-3 py-2 text-right w-24">단가 (원)</th>
          <th class="px-3 py-2 text-right w-16">인원 (명)</th>
          <th class="px-3 py-2 text-right w-24">소계 (원)</th>
          <th class="px-3 py-2 text-left w-20">비고</th>
          <th class="px-3 py-2 w-8"></th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </div>
  <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-green-100">
    <div class="text-xs font-black text-gray-500">세부 산출 합계</div>
    <div class="font-black text-lg text-green-700">${fmt(subtotal)}원</div>
  </div>` : `
  <div class="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 border border-dashed border-green-200">
    위의 '+ 항목 추가' 버튼을 눌러 비용 항목을 입력하세요 (교육비, 교보재비, 시험응시료 등).
  </div>`}
</div>`;
}
// window 전역 노출 — fo_form_loader.js의 foRenderStandardPlanForm에서 typeof window._renderCalcGroundsSection 체크
window._renderCalcGroundsSection = _renderCalcGroundsSection;

// 직접학습형 행 추가
function _cgAddRowSL() {
  if (!planState.calcGrounds) planState.calcGrounds = [];
  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType("self_learning", vorgId, false)
    : [];
  const first = items[0] || null;
  planState.calcGrounds.push({
    itemId: first?.id || "_sl_edu",
    unitPrice: first?.unitPrice || 0,
    qty1: 1,
    qty: 1,
    qty2: 1,
    qty3: 1,
    total: 0,
    note: "",
    limitOverrideReason: "",
  });
  _syncCalcToAmount();
  renderPlanWizard();
}

// 직접학습형 행 업데이트 헬퍼
function _cgSlUpdateItem(idx, itemId) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType("self_learning", vorgId, false)
    : [];
  const item = items.find(g => g.id === itemId) || null;
  row.itemId = itemId;
  row.unitPrice = item?.unitPrice || row.unitPrice || 0;
  row.total = row.unitPrice * (row.qty1 || 1);
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgSlUpdatePrice(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.unitPrice = Number(val) || 0;
  row.total = row.unitPrice * (row.qty1 || 1);
  _syncCalcToAmount();
  if (planState.step === 4) renderPlanWizard();
}

function _cgSlUpdateQty(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty1 = Math.max(1, Number(val) || 1);
  row.qty = row.qty1;
  row.total = (row.unitPrice || 0) * row.qty1;
  _syncCalcToAmount();
  if (planState.step === 4) renderPlanWizard();
}

function _cgSlUpdateNote(idx, val) {
  const row = planState.calcGrounds[idx];
  if (row) row.note = val;
}

// ─── Calc Grounds 행 조작 함수 ─────────────────────────────────────────────── v3

async function _cgAddRow() {
  if (!planState.calcGrounds) planState.calcGrounds = [];
  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType("edu_operation", vorgId, false)
    : [];
  const firstItem = items[0];
  // 첫 항목의 프리셋 미리 로드
  let presets = [];
  if (firstItem && typeof _loadUnitPricesForItem === "function") {
    presets = await _loadUnitPricesForItem(firstItem.id);
  }
  planState.calcGrounds.push({
    itemId: firstItem?.id || "",
    unitPrice: firstItem?.unitPrice || 0,
    qty1: 1, type1: '명',
    qty2: 1, type2: '일',
    qty3: 1, type3: '차수',
    total: firstItem?.unitPrice || 0,
    note: "",
    presetKey: "",
    venueName: "",
    presetName: "",
    limitOverrideReason: "",
    _presets: presets,
  });
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgRemoveRow(idx) {
  planState.calcGrounds.splice(idx, 1);
  _syncCalcToAmount();
  renderPlanWizard();
}

async function _cgUpdateItemId(idx, itemId) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  const item = typeof CALC_GROUNDS_MASTER !== "undefined"
    ? CALC_GROUNDS_MASTER.find((g) => g.id === itemId) : null;
  row.itemId = itemId;
  // 단가 소급 없음: 항목 변경 시만 기준단가 적용 (새로운 행이므로 항상 최신 로드)
  row.unitPrice = item?.unitPrice || 0;
  row.qty2 = item?.hasQty2 ? 1 : 1;
  row.qty3 = item?.hasRounds ? 1 : 1;
  row.presetKey = "";
  row.venueName = "";
  row.presetName = "";
  row.limitOverrideReason = "";
  // 프리셋 로드
  if (itemId && typeof _loadUnitPricesForItem === "function") {
    row._presets = await _loadUnitPricesForItem(itemId);
  } else {
    row._presets = [];
  }
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  renderPlanWizard();
}

// 장소(venue) 선택 → presetName 초기화 후 재렌더
function _cgSelectVenue(idx, venue) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.venueName = venue || '';
  row.presetName = '';
  row.presetKey = '';
  // 장소에 단일 세부항목밖에 없으면 자동 선택
  const presets = (row._presets || []).filter(p => p.venue_name === venue);
  if (presets.length === 1) {
    const p = presets[0];
    row.presetName = p.preset_name || p.detail_name || '';
    row.presetKey = `${venue}|${row.presetName}`;
    row.unitPrice = Number(p.unit_price) || row.unitPrice;
    if (p.qty2_value) row.qty2 = Number(p.qty2_value) || 1;
    _cgRecalcRow(row, null);
    _syncCalcToAmount();
  }
  renderPlanWizard();
}

function _cgApplyPreset(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row || !val) return;
  // val: "venue_name|preset_name|unit_price|qty2_value"
  const parts = val.split("|");
  const venueName = parts[0] || '';
  const presetName = parts[1] || '';
  const priceStr = parts[2] || '0';
  const qty2Str = parts[3] || '1';
  row.venueName = venueName;
  row.presetName = presetName;
  row.presetKey = `${venueName}|${presetName}`;
  row.unitPrice = Number(priceStr) || row.unitPrice;
  if (qty2Str) row.qty2 = Number(qty2Str) || 1;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}

function _cgRecalcRow(row, item) {
  // 항상 qty1 × qty2 × qty3 (BO has_qty2/has_rounds 무관)
  row.total = (row.unitPrice || 0) * (row.qty1 || row.qty || 1) * (row.qty2 || 1) * (row.qty3 || 1);
}

function _cgUpdateQty1(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty1 = Math.max(1, Number(val) || 1);
  row.qty = row.qty1; // 레거시 호환
  const item = typeof CALC_GROUNDS_MASTER !== "undefined" ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}

function _cgUpdateQty2(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty2 = Math.max(1, Number(val) || 1);
  const item = typeof CALC_GROUNDS_MASTER !== "undefined" ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}

function _cgUpdateQty3(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty3 = Math.max(1, Number(val) || 1);
  const item = typeof CALC_GROUNDS_MASTER !== "undefined" ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}

// 레거시 래퍼 (기존 호출 유지)
function _cgUpdateQty(idx, val) { _cgUpdateQty1(idx, val); }

function _cgUpdateUnitPrice(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.unitPrice = Number(val) || 0;
  const item = typeof CALC_GROUNDS_MASTER !== "undefined" ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}


function _cgUpdateReason(idx, val) {
  const row = planState.calcGrounds[idx];
  if (row) row.limitOverrideReason = val;
}

// 비고 업데이트 (재렌더 없이 직접 저장)
function _cgUpdateRowNote(idx, val) {
  const row = planState.calcGrounds[idx];
  if (row) row.note = val;
}

window._cgAddMultiplier = function(idx) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.activeMultipliers = (row.activeMultipliers || 1) + 1;
  if (row.activeMultipliers > 3) row.activeMultipliers = 3;
  renderPlanWizard();
};

window._cgRemoveMultiplier = function(idx) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  if (row.activeMultipliers === 3) {
    row.qty3 = 1; // reset value
  } else if (row.activeMultipliers === 2) {
    row.qty2 = 1;
  }
  row.activeMultipliers = (row.activeMultipliers || 1) - 1;
  if (row.activeMultipliers < 1) row.activeMultipliers = 1;
  
  const item = typeof CALC_GROUNDS_MASTER !== "undefined" ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  renderPlanWizard();
};

// qty2 단위(유형) 업데이트 — 재계산은 수량이 변경될 때만 (단위만 변경 시 합계 동일)
function _cgUpdateQty2Type(idx, val) {
  const row = planState.calcGrounds[idx];
  if (row) { row.qty2Type = val; row.type2 = val; }
}
function _cgUpdateType1(idx, val) { const row = planState.calcGrounds[idx]; if (row) row.type1 = val; }
function _cgUpdateType2(idx, val) { const row = planState.calcGrounds[idx]; if (row) { row.type2 = val; row.qty2Type = val; } }
function _cgUpdateType3(idx, val) { const row = planState.calcGrounds[idx]; if (row) row.type3 = val; }

// 소계만 텍스트 업데이트 (전체 렌더 최소화)
function _cgRefreshTotals() {
  // Step 4에 있을 때만 재렌더
  if (planState.step === 4) renderPlanWizard();
}

// ★ Phase C: 교육계획 → 교육신청 연동
// plan_id를 sessionStorage에 저장하고 교육신청 화면으로 이동
function _startApplyFromPlan(planId) {
  const plan = _plansDbCache.find(p => String(p.id) === String(planId));
  if (!plan) { alert('교육계획을 찾을 수 없습니다.'); return; }
  if (Number(plan.allocated_amount || 0) <= 0) {
    alert('배정이 완료된 교육계획만 교육 신청이 가능합니다.');
    return;
  }
  // plan 정보를 sessionStorage에 저장 → apply.js에서 읽음
  sessionStorage.setItem('_applyFromPlan', JSON.stringify({
    plan_id: plan.id,
    title: plan.title,
    amount: plan.amount,
    allocated_amount: plan.allocated_amount,
    account: plan.account,
    edu_purpose: plan.edu_purpose,
    edu_type: plan.edu_type,
    edu_subtype: plan.edu_subtype,
  }));
  // 교육신청 메뉴로 이동
  if (typeof renderApply === 'function') {
    _mainView = 'apply';
    renderApply();
  } else {
    alert('교육신청 화면으로 이동합니다. (메뉴에서 교육신청을 선택)');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ Phase B: FO 배정 재배분
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _foReallocMode = false;

function _foToggleRealloc() {
  _foReallocMode = !_foReallocMode;
  _foRenderReallocUI();
}

async function _foRenderReallocUI() {
  const area = document.getElementById('fo-realloc-area');
  if (!area) return;

  // ★ 사업계획 탭에서는 재배분 UI를 완전히 숨김 (운영계획 탭 전용 기능)
  if (window.plansMode === 'forecast') {
    area.innerHTML = '';
    return;
  }
  
  const approvedPlans = (_plansDbCache || []).filter(p =>
    (p.status === '승인완료' || p.status === 'approved') && Number(p.allocated_amount || 0) >= 0
  );
  
  if (!_foReallocMode || approvedPlans.length === 0) {
    // 버튼만 표시
    area.innerHTML = approvedPlans.length > 0 ? `
      <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center">
        <button onclick="_foToggleRealloc()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #7C3AED;background:#F5F3FF;color:#7C3AED;font-size:12px;font-weight:900;cursor:pointer">
          🔄 배정 재배분
        </button>
        <span style="font-size:11px;color:#9CA3AF">승인된 교육계획의 배정액을 재조정합니다</span>
      </div>` : '';
    return;
  }

  // 통장 잔액 조회
  let bankBalance = 0;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && currentPersona?.orgId) {
    try {
      const { data: bks } = await sb.from('bankbooks')
        .select('current_balance')
        .eq('tenant_id', currentPersona.tenantId)
        .eq('org_id', currentPersona.orgId)
        .eq('status', 'active');
      bankBalance = (bks || []).reduce((s,b) => s + Number(b.current_balance || 0), 0);
    } catch(e) {}
  }

  const totalAlloc = approvedPlans.reduce((s,p) => s + Number(p.allocated_amount || 0), 0);

  area.innerHTML = `
    <div style="margin-bottom:16px;padding:16px 20px;border-radius:14px;border:1.5px solid #7C3AED;background:#F5F3FF">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <span style="font-size:13px;font-weight:900;color:#7C3AED">🔄 배정 재배분 모드</span>
          <span style="font-size:11px;color:#6B7280;margin-left:8px">통장 잔액: <b style="color:#059669">${bankBalance.toLocaleString()}원</b></span>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="_foSaveRealloc()" style="padding:6px 16px;border-radius:8px;border:none;background:#7C3AED;color:white;font-size:11px;font-weight:900;cursor:pointer">💾 저장</button>
          <button onclick="_foToggleRealloc()" style="padding:6px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-size:11px;font-weight:900;cursor:pointer">✕ 닫기</button>
        </div>
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:8px">배정 합계: <b id="fo-realloc-sum">${totalAlloc.toLocaleString()}</b>원</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="background:#EDE9FE">
          <th style="padding:8px;text-align:left;font-weight:900">교육계획</th>
          <th style="padding:8px;text-align:right;font-weight:900;width:120px">계획액</th>
          <th style="padding:8px;text-align:right;font-weight:900;width:140px">배정액 (수정)</th>
        </tr>
        ${approvedPlans.map((p,i) => `
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:8px;font-weight:700;color:#111827">${p.title}</td>
          <td style="padding:8px;text-align:right;color:#6B7280">${Number(p.amount||0).toLocaleString()}원</td>
          <td style="padding:8px;text-align:right">
            <input type="number" data-plan-id="${p.id}" data-orig="${p.allocated_amount||0}"
              value="${p.allocated_amount||0}" min="0"
              onchange="_foRecalcSum()"
              style="width:120px;padding:6px 10px;border:1.5px solid #D1D5DB;border-radius:8px;font-size:12px;font-weight:800;text-align:right">
          </td>
        </tr>`).join('')}
      </table>
    </div>`;
}

function _foRecalcSum() {
  const inputs = document.querySelectorAll('#fo-realloc-area input[data-plan-id]');
  let sum = 0;
  inputs.forEach(inp => { sum += Number(inp.value || 0); });
  const el = document.getElementById('fo-realloc-sum');
  if (el) el.textContent = sum.toLocaleString();
}

async function _foSaveRealloc() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  const inputs = document.querySelectorAll('#fo-realloc-area input[data-plan-id]');
  const changes = [];
  inputs.forEach(inp => {
    const newVal = Number(inp.value || 0);
    const origVal = Number(inp.dataset.orig || 0);
    if (newVal !== origVal) {
      changes.push({ id: inp.dataset.planId, allocated_amount: newVal });
    }
  });

  if (changes.length === 0) { alert('변경된 항목이 없습니다.'); return; }

  // 통장 잔액 검증
  let bankBalance = 0;
  if (currentPersona?.orgId) {
    try {
      const { data: bks } = await sb.from('bankbooks')
        .select('current_balance')
        .eq('tenant_id', currentPersona.tenantId)
        .eq('org_id', currentPersona.orgId)
        .eq('status', 'active');
      bankBalance = (bks || []).reduce((s,b) => s + Number(b.current_balance || 0), 0);
    } catch(e) {}
  }

  let totalNew = 0;
  inputs.forEach(inp => { totalNew += Number(inp.value || 0); });

  if (totalNew > bankBalance && bankBalance > 0) {
    alert(`⚠️ 재배분 합계(${totalNew.toLocaleString()}원)가 통장 잔액(${bankBalance.toLocaleString()}원)을 초과합니다.`);
    return;
  }

  try {
    for (const c of changes) {
      await sb.from('plans').update({
        allocated_amount: c.allocated_amount,
        updated_at: new Date().toISOString()
      }).eq('id', c.id);
    }
    alert(`✅ ${changes.length}건의 배정이 재배분되었습니다.`);
    _foReallocMode = false;
    _plansDbLoaded = false;
    renderPlans();
  } catch(err) {
    alert('저장 실패: ' + err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ Phase F: 수시 교육계획 제출 시 통장 잔액 경고
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _foCheckBankBalanceWarning(amount) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb || !currentPersona?.orgId) return true;
  try {
    const { data: bks } = await sb.from('bankbooks')
      .select('current_balance')
      .eq('tenant_id', currentPersona.tenantId)
      .eq('org_id', currentPersona.orgId)
      .eq('status', 'active');
    const bal = (bks || []).reduce((s,b) => s + Number(b.current_balance || 0), 0);
    if (bal > 0 && Number(amount) > bal) {
      return confirm(`⚠️ 팀 통장 잔액 경고\n\n계획 금액: ${Number(amount).toLocaleString()}원\n통장 잔액: ${bal.toLocaleString()}원\n\n통장 잔액을 초과하는 교육계획입니다.\n그래도 제출하시겠습니까?`);
    }
  } catch(e) {}
  return true;
}

// ─── Phase 4: 사업계획 승인 시 운영계획 자동 복사 ─────────────────────────────
// PRD: implementation_plan.md §Phase4
// 트리거: 총괄담당자 최종 승인(status → 'approved'), plan_type === 'forecast' 한정
// 멱등성: source_forecast_plan_id 중복 방지
// 예산 안전성: frozen_amount = 0 (운영계획 결재 승인 시점에 별도 처리)

/**
 * 사업계획(forecast) 최종 승인 완료 시 운영계획(operation) 자동 생성
 * @param {Object} sb           - Supabase 클라이언트
 * @param {Object} forecastPlan - plans 테이블 원본 레코드 (plan_type === 'forecast')
 * @returns {string|null}       - 생성된 운영계획 ID 또는 null (스킵)
 */
async function _autoCreateOperationPlan(sb, forecastPlan) {
  if (!sb || !forecastPlan) return null;
  if (forecastPlan.plan_type !== 'forecast' && forecastPlan.plan_type !== 'business') return null;

  try {
    // ─── 중복 방지: 이미 복사된 운영계획 존재 여부 확인 ───────────────────────
    const { data: existing } = await sb.from('plans')
      .select('id')
      .eq('plan_type', 'operation')
      .eq('tenant_id', forecastPlan.tenant_id)
      .contains('detail', { source_forecast_plan_id: String(forecastPlan.id) })
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[Phase4] 운영계획 이미 존재 — 스킵:', existing[0].id);
      return null;
    }

    // ─── 복사본 생성 ─────────────────────────────────────────────────────────
    const now = new Date().toISOString();
    const newId = 'PLAN-' + Date.now();

    // detail 필드: 원본 복사 + 추적 메타 추가
    const newDetail = {
      ...(forecastPlan.detail || {}),
      source_forecast_plan_id: String(forecastPlan.id),
      auto_copied_at: now,
      copy_trigger: 'forecast_approved',
    };

    const insertData = {
      id: newId,
      edu_name: forecastPlan.edu_name,
      plan_type: 'operation',
      status: 'saved',              // ← 사용자가 보완 후 별도 상신
      fiscal_year: forecastPlan.fiscal_year,
      account_code: forecastPlan.account_code,
      amount: forecastPlan.amount,
      frozen_amount: 0,             // ← 이중 점유 방지
      allocated_amount: 0,          // ← 배정액 초기화 (운영계획 결재 시 확정)
      applicant_id: forecastPlan.applicant_id,
      applicant_name: forecastPlan.applicant_name,
      applicant_org_id: forecastPlan.applicant_org_id || null,
      dept: forecastPlan.dept || null,
      tenant_id: forecastPlan.tenant_id,
      edu_type: forecastPlan.edu_type || null,
      detail: newDetail,
      created_at: now,
      updated_at: now,
    };

    const { data: newPlan, error: insertErr } = await sb.from('plans').insert(insertData).select('id').single();
    if (insertErr) throw insertErr;

    console.log('[Phase4] 운영계획 자동 생성 완료:', newPlan?.id, '← 원본:', forecastPlan.id);

    // ─── FO 화면 토스트 알림 (화면이 열려 있는 경우만) ──────────────────────
    if (typeof showToast === 'function') {
      showToast('✅ 운영계획이 자동 생성되었습니다. 운영계획 탭에서 확인하세요.', 5000);
    }

    return newPlan?.id || null;
  } catch (err) {
    console.error('[Phase4 _autoCreateOperationPlan] 실패 (비치명적):', err.message);
    return null;
  }
}
window._autoCreateOperationPlan = _autoCreateOperationPlan;
