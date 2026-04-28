// ?€?€?€ APPLY (êµìœ¡? ì²­) ??ëª©ë¡ ??? ì²­????ê²°ê³¼???„í™˜ ?ˆë¸Œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

// ?€?€?€ DB ?¹ì¸??êµìœ¡ê³„íš ìºì‹œ (MOCK_PLANS ?€ì²? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
let _dbApprovedPlans = [];
let _dbApprovedPlansLoaded = false;
let _dbApprPlanPersonaId = null; // ìºì‹œ ë¬´íš¨?”ìš©

async function _loadApprovedPlans() {
  const pid = currentPersona.id;
  if (_dbApprovedPlansLoaded && _dbApprPlanPersonaId === pid)
    return _dbApprovedPlans;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    _dbApprovedPlans = [];
    _dbApprovedPlansLoaded = true;
    return [];
  }
  try {
    // ?¬ë¡œ???Œë„Œ?? ì´ê´„ë¶€?œë©´ ?‘ìª½ ?Œì‚¬ ?¹ì¸ ê³„íš ë¡œë“œ
    const ctInfo =
      typeof getCrossTenantInfo === "function"
        ? await getCrossTenantInfo(currentPersona)
        : null;
    const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
    let query = sb
      .from("plans")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (tids.length > 1) {
      // ì´ê´„ë¶€?? ?‘ìª½ ?Œì‚¬???¹ì¸ ê³„íš (ë³¸ì¸ + ?ë????™ì¼ ì¡°ì§)
      query = query.in("tenant_id", tids);
    } else {
      query = query
        .eq("applicant_id", pid)
        .eq("tenant_id", currentPersona.tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    _dbApprovedPlans = (data || []).map((p) => ({
      id: p.id,
      title: p.edu_name || "-",
      account: p.account_code || "",
      budgetId: p.detail?.budgetId || "",
      amount: Number(p.amount || 0),
      used: 0,
      edu_type: p.edu_type,
      purpose: p.detail?.purpose,
      date: (p.created_at || "").slice(0, 10),
      detail: p.detail || {},
      tenantId: p.tenant_id, // ?¬ë¡œ???Œë„Œ??ë±ƒì???
      applicantName: p.applicant_name || "",
    }));
    _dbApprovedPlansLoaded = true;
    _dbApprPlanPersonaId = pid;
  } catch (err) {
    console.error("[_loadApprovedPlans]", err.message);
    _dbApprovedPlans = [];
    _dbApprovedPlansLoaded = true;
  }
  return _dbApprovedPlans;
}

let _resultState = null;
function _resetResultState() {
  return {
    step: 1,
    purpose: null,
    budgetId: "",
    useBudget: false,
    title: "",
    date: "",
    endDate: "",
    hours: "",
    provider: "",
    resultText: "",
    expenses: [{ item: "?˜ê°•ë£?, price: "", qty: 1 }],
    attachments: [],
  };
}

function renderApply() {
  // ??Phase C: êµìœ¡ê³„íš?ì„œ ?˜ì–´??ê²½ìš° plan_id ?ë™ ?¸íŒ…
  const _planLink = sessionStorage.getItem("_applyFromPlan");
  if (_planLink) {
    try {
      const pl = JSON.parse(_planLink);
      sessionStorage.removeItem("_applyFromPlan");
      applyState = resetApplyState();
      applyState.planId = pl.plan_id;
      applyState.title = pl.title;
      applyState.eduName = pl.title;
      applyViewMode = "form";
      console.log("[Apply] Linked from plan:", pl.plan_id, pl.title);
    } catch(e) { sessionStorage.removeItem("_applyFromPlan"); }
  }
  if (typeof applyViewMode === "undefined") applyViewMode = "list";
  if (applyState && applyState.confirmMode) {
    _renderApplyConfirm();
  } else if (applyViewMode === "form") {
    _renderApplyForm();
    // resultForm ë·°ëª¨?œëŠ” result.js ?…ë¦½ ?”ë©´?¼ë¡œ ?´ê???
  } else {
    _renderApplyList();
  }
}

// ?€?€?€ ?•ì±… ê¸°ë°˜ ?¤ë§ˆ??ë²„íŠ¼ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ?¨í„´ AÂ·BÂ·E ??êµìœ¡ ? ì²­ ë²„íŠ¼ / ?¨í„´ CÂ·D ??êµìœ¡ê²°ê³¼ ?±ë¡ ë²„íŠ¼
function _applySmartButtons() {
  // SERVICE_POLICIES?ì„œ ?„ì¬ ?˜ë¥´?Œë‚˜???•ì±… ?•ì¸
  let hasApplyPatterns = false; // A, B, E
  let hasResultOnlyPatterns = false; // C, D

  if (typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0) {
    const policies = SERVICE_POLICIES.filter((p) => {
      if (p.status && p.status !== "active") return false;
      const pTenantId = p.tenant_id || p.tenantId;
      if (pTenantId && pTenantId !== currentPersona.tenantId) return false;
      return true;
    });
    policies.forEach((p) => {
      const pattern = p.process_pattern || p.processPattern || "";
      if (["A", "B", "E"].includes(pattern)) hasApplyPatterns = true;
      if (["C", "D"].includes(pattern)) hasResultOnlyPatterns = true;
      // flow ê¸°ë°˜ fallback
      if (!pattern) {
        if (["plan-apply-result", "apply-result"].includes(p.flow))
          hasApplyPatterns = true;
        if (p.flow === "result-only") hasResultOnlyPatterns = true;
      }
    });
  }

  // ?•ì±…???„í? ?†ìœ¼ë©?ê¸°ë³¸: ? ì²­ ë²„íŠ¼ë§??œì‹œ (ê²°ê³¼?±ë¡?€ C/D ?•ì±… ?ˆì„ ?Œë§Œ)
  if (!hasApplyPatterns && !hasResultOnlyPatterns) {
    hasApplyPatterns = true;
  }

  let btns = "";
  if (hasApplyPatterns) {
    btns += `<button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(0,44,95,.3);transition:all .15s"
      onmouseover="this.style.background='#0050A8'" onmouseout="this.style.background='#002C5F'">
      ?ï¸ êµìœ¡ ? ì²­
    </button>`;
  }
  if (hasResultOnlyPatterns) {
    btns += `<button onclick="navigate('result')"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#D97706;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(217,119,6,.3);transition:all .15s"
      onmouseover="this.style.background='#B45309'" onmouseout="this.style.background='#D97706'">
      ?“ êµìœ¡ê²°ê³¼ ?±ë¡
    </button>`;
  }
  return btns;
}

// ?€?€?€ ê²°ê³¼ ?„ìš© ?„ì???(?¨í„´ CÂ·D) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _renderResultForm() {
  const s = _resultState || _resetResultState();
  _resultState = s;

  const stepLabels = ["êµìœ¡ ?•ë³´", "ë¹„ìš© ?•ë³´", "ê²°ê³¼ ?‘ì„±"];
  const stepper = stepLabels
    .map((label, i) => {
      const n = i + 1;
      return `<div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
      <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "?? : n}</div>
      <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${label}</span>
      ${n < 3 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
    </div>`;
    })
    .join("");

  let body = "";

  // Step 1: êµìœ¡ ?•ë³´
  if (s.step === 1) {
    // BO form_templates ?¤ì´?˜ë? ?Œë”ë§??œë„
    const dyHtml =
      s.formTemplate &&
      s.formTemplate.fields &&
      s.formTemplate.fields.length > 0 &&
      typeof renderDynamicFormFields === "function"
        ? renderDynamicFormFields(s.formTemplate.fields, s, "_resultState")
        : "";

    if (dyHtml) {
      const tplBadge = s.formTemplate.name
        ? `<div style="margin-bottom:14px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">?“‹ ?‘ì‹: ${s.formTemplate.name}</div>`
        : "";
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. êµìœ¡ ?•ë³´ ?…ë ¥</h2>${tplBadge}${dyHtml}`;
    } else if (s.formTemplateLoading) {
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. êµìœ¡ ?•ë³´ ?…ë ¥</h2>
        <div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">??/div>?‘ì‹ ë¡œë”© ì¤?..</div>`;
    } else {
      body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. êµìœ¡ ?•ë³´ ?…ë ¥</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">êµìœ¡ê³¼ì •ëª?*</label>
        <input id="rf-title" value="${s.title}" onchange="_resultState.title=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px"
          placeholder="?? AWS ?”ë£¨?˜ìŠ¤ ?„í‚¤?íŠ¸ ?ê²©ì¦?ê³¼ì •">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">êµìœ¡ ?œì‘??*</label>
          <input id="rf-date" type="date" value="${s.date}" onchange="_resultState.date=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">êµìœ¡ ì¢…ë£Œ??*</label>
          <input id="rf-enddate" type="date" value="${s.endDate}" onchange="_resultState.endDate=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">?™ìŠµ ?œê°„(H)</label>
          <input id="rf-hours" type="number" value="${s.hours}" onchange="_resultState.hours=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="8">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">êµìœ¡ê¸°ê?</label>
          <input id="rf-provider" value="${s.provider}" onchange="_resultState.provider=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="êµìœ¡ê¸°ê?ëª?>
        </div>
      </div>
    </div>`;
    }
  }

  // Step 2: ë¹„ìš© ?•ë³´ (?„ì •???¬ë? ? íƒ)
  if (s.step === 2) {
    const expRows = s.expenses
      .map(
        (e, i) => `
    <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;align-items:center">
      <input value="${e.item}" onchange="_resultState.expenses[${i}].item=this.value" placeholder="??ª©ëª?
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.price}" onchange="_resultState.expenses[${i}].price=this.value" placeholder="?¨ê?"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.qty}" onchange="_resultState.expenses[${i}].qty=this.value" min="1"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <span style="font-size:12px;font-weight:700;color:#374151">${((Number(e.price) || 0) * (Number(e.qty) || 1)).toLocaleString()}??/span>
      <button onclick="_resultState.expenses.splice(${i},1);renderApply()" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626"
        title="?? œ">??/button>
    </div>`,
      )
      .join("");
    const total = s.expenses.reduce(
      (sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1),
      0,
    );

    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">02. ë¹„ìš© ?•ë³´</h2>
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:10px">
        <button onclick="_resultState.useBudget=true;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === true ? "#D97706" : "#E5E7EB"};
                 background:${s.useBudget === true ? "#FFFBEB" : "white"};color:${s.useBudget === true ? "#D97706" : "#6B7280"}">
          ?§¾ ?„ì •??(?ˆì‚° ?¬ìš©)
        </button>
        <button onclick="_resultState.useBudget=false;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === false ? "#059669" : "#E5E7EB"};
                 background:${s.useBudget === false ? "#F0FDF4" : "white"};color:${s.useBudget === false ? "#059669" : "#6B7280"}">
          ?“‹ ?´ë ¥ë§??±ë¡ (?ˆì‚° ë¯¸ì‚¬??
        </button>
      </div>
    </div>
    ${
      s.useBudget
        ? `
    <div style="margin-bottom:12px">
      <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:6px;display:block">?ˆì‚° ê³„ì • ? íƒ</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${currentPersona.budgets
          .map(
            (b) => `
        <button onclick="_resultState.budgetId='${b.id}';renderApply()"
          style="padding:8px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;
                 border:2px solid ${s.budgetId === b.id ? "#D97706" : "#E5E7EB"};
                 background:${s.budgetId === b.id ? "#FFFBEB" : "white"};color:${s.budgetId === b.id ? "#D97706" : "#6B7280"}">${b.account}</button>`,
          )
          .join("")}
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">??ª©</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">?¨ê?</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">?˜ëŸ‰</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">?Œê³„</span>
        <span></span>
      </div>
      ${expRows}
      <button onclick="_resultState.expenses.push({item:'',price:'',qty:1});renderApply()"
        style="margin-top:8px;font-size:11px;font-weight:800;color:#D97706;background:none;border:1.5px dashed #FDE68A;
               padding:8px 14px;border-radius:8px;cursor:pointer;width:100%">+ ë¹„ìš© ??ª© ì¶”ê?</button>
    </div>
    <div style="text-align:right;font-size:14px;font-weight:900;color:#D97706;padding:8px 0">
      ?•ì‚° ?©ê³„: ${total.toLocaleString()}??
    </div>`
        : `
    <div style="padding:24px;text-align:center;background:#F0FDF4;border-radius:12px;border:1.5px dashed #BBF7D0;margin-top:12px">
      <div style="font-size:13px;font-weight:800;color:#059669">???ˆì‚° ë¯¸ì‚¬????êµìœ¡?´ë ¥ë§??±ë¡?©ë‹ˆ??/div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">ë¹„ìš© ?•ì‚° ?†ì´ ?™ìŠµ ?´ë ¥ë§?ê¸°ë¡?©ë‹ˆ??</div>
    </div>`
    }`;
  }

  // Step 3: ê²°ê³¼ ?‘ì„±
  if (s.step === 3) {
    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">03. êµìœ¡ ê²°ê³¼ ?‘ì„±</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">êµìœ¡ê²°ê³¼ ?”ì•½ *</label>
        <textarea id="rf-result" rows="5" onchange="_resultState.resultText=this.value"
          style="width:100%;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical"
          placeholder="êµìœ¡ ?˜ë£Œ ???™ìŠµ???´ìš©, ?…ë¬´ ?ìš© ê³„íš ?±ì„ ?‘ì„±??ì£¼ì„¸??">${s.resultText}</textarea>
      </div>
      <div style="padding:20px;background:#F9FAFB;border-radius:12px;border:1.5px dashed #D1D5DB">
        <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">?“ ì²¨ë??Œì¼ (?˜ë£Œì¦? ?ìˆ˜ì¦???</div>
        <div style="font-size:11px;color:#9CA3AF">?Œì¼ ?…ë¡œ??ê¸°ëŠ¥?€ ì¶”í›„ ?œê³µ ?ˆì •?…ë‹ˆ??</div>
      </div>

      <!-- ?”ì•½ ì¹´ë“œ -->
      <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1.5px solid #BFDBFE">
        <div style="font-size:12px;font-weight:900;color:#1D4ED8;margin-bottom:8px">?“‹ ?±ë¡ ?”ì•½</div>
        <div style="font-size:12px;color:#374151;display:grid;gap:4px">
          <div>?“š ${s.title || "-"}</div>
          <div>?“… ${s.date || "-"} ~ ${s.endDate || "-"}</div>
          <div>??${s.hours || "-"}?œê°„ Â· ?¢ ${s.provider || "-"}</div>
          <div>${s.useBudget ? "?§¾ ?„ì •??Â· " + s.expenses.reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0).toLocaleString() + "?? : "?“‹ ?´ë ¥ë§??±ë¡ (?ˆì‚° ë¯¸ì‚¬??"}</div>
        </div>
      </div>
    </div>`;
  }

  // ?¤ë¹„ê²Œì´??
  const canNext1 = s.title && s.date && s.endDate;
  const canNext2 = s.useBudget !== null && (!s.useBudget || s.budgetId);

  document.getElementById("page-apply").innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#D97706'" onmouseout="this.style.color='#6B7280'">
        ??ëª©ë¡?¼ë¡œ
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??êµìœ¡ê²°ê³¼ ?±ë¡</div>
      <h1 class="text-3xl font-black tracking-tight" style="color:#D97706">êµìœ¡ê²°ê³¼ ?±ë¡</h1>
      <p style="font-size:11px;color:#9CA3AF;margin-top:2px">?´ë? ?˜ë£Œ??êµìœ¡??ê²°ê³¼ë¥??±ë¡?©ë‹ˆ?? ?„ì •???ëŠ” ?´ë ¥ë§?ê¸°ë¡?????ˆìŠµ?ˆë‹¤.</p>
    </div>
  </div>

  <!-- Stepper -->
  <div class="card p-6">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <!-- Body -->
  <div class="card p-6">${body}</div>

  <!-- Nav -->
  <div style="display:flex;justify-content:space-between">
    ${
      s.step > 1
        ? `<button onclick="_resultState.step--;renderApply()"
      style="padding:10px 20px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;cursor:pointer;color:#374151">???´ì „</button>`
        : "<div></div>"
    }
    ${
      s.step < 3
        ? `<button onclick="_resultState.step++;renderApply()"
      ${(s.step === 1 && !canNext1) || (s.step === 2 && !canNext2) ? "disabled" : ""}
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:${(s.step === 1 && canNext1) || (s.step === 2 && canNext2) ? "#D97706" : "#D1D5DB"};color:white;
             transition:all .15s">?¤ìŒ??/button>`
        : `
    <button onclick="alert('êµìœ¡ê²°ê³¼ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??');applyViewMode='list';renderApply()"
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:#059669;color:white;transition:all .15s">
      ??ê²°ê³¼ ?±ë¡ ?„ë£Œ
    </button>`
    }
  </div>
</div>`;
}

// ?€?€?€ êµìœ¡? ì²­ ëª©ë¡ ë·??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ? ì²­ ëª©ë¡ ???íƒœ
let _applyListTab = "mine"; // 'mine' | 'team'
let _applyYear = new Date().getFullYear(); // ?°ë„ ?„í„°

// ?€?€?€ ê²°ê³¼ ?±ë¡ ?œì¶œ (?¨í„´ C/D) ??DB ?€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function submitResult() {
  const rs = _resultState || {};
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const appId = `RES-${Date.now()}`;
      const row = {
        id: appId,
        tenant_id: currentPersona.tenantId,
        plan_id: null,
        account_code: rs.accountCode || "",
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || "",
        edu_name: rs.eduName || "êµìœ¡ê²°ê³¼",
        edu_type: rs.eduType || null,
        amount: Number(rs.amount || 0),
        status: "completed",
        policy_id: rs.policyId || null,
        detail: {
          purpose: rs.purpose || null,
          resultType: "direct",
          completionDate: rs.completionDate || null,
          score: rs.score || null,
          notes: rs.notes || null,
        },
      };
      const { error } = await sb.from("applications").insert(row);
      if (error) throw error;
      console.log(`[submitResult] DB ?€???±ê³µ: ${appId}`);
    } catch (err) {
      console.error("[submitResult] DB ?€???¤íŒ¨:", err.message);
    }
  }
  alert(
    "??êµìœ¡ê²°ê³¼ê°€ ?±ê³µ?ìœ¼ë¡??±ë¡?˜ì—ˆ?µë‹ˆ??\n\nê´€ë¦¬ì ?•ì¸ ???´ë ¥??ë°˜ì˜?©ë‹ˆ??",
  );
  _resultState = _resetResultState();
  applyViewMode = "list";
  renderApply();
}

let _dbMyApps = [];
let _appsDbLoaded = false;

function _renderApplyList() {
  const STATUS_CFG = {
    ?¹ì¸?„ë£Œ: {
      color: "#059669",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      icon: "??,
    },
    ë°˜ë ¤: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "?? },
    ê²°ì¬ì§„í–‰ì¤? {
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      icon: "??,
    },
    ê²°ì¬?€ê¸? {
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      icon: "??,
    },
    ?¹ì¸?€ê¸? {
      color: "#6B7280",
      bg: "#F9FAFB",
      border: "#E5E7EB",
      icon: "?•",
    },
    ?€?¥ì™„ë£? {
      color: "#059669",
      bg: "#ECFDF5",
      border: "#6EE7B7",
      icon: "?“¤",
    },
    ?‘ì„±ì¤? { color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE", icon: "?“" },
    ì·¨ì†Œ: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "?š«" },
    ?Œìˆ˜?? { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "?©ï¸" },
  };

  const teamViewEnabled =
    currentPersona.teamViewEnabled ?? currentPersona.team_view_enabled ?? false;

  // DB ?¤ì‹œê°?ì¡°íšŒ
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_appsDbLoaded) {
    _appsDbLoaded = true;
    sb.from("applications")
      .select("*")
      .eq("applicant_id", currentPersona.id)
      .eq("tenant_id", currentPersona.tenantId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          _dbMyApps = data.map((d) => ({
            id: d.id,
            title: d.edu_name,
            type: d.edu_type || 'êµìœ¡',
            date: d.created_at?.slice(0, 10) || '',
            endDate: d.created_at?.slice(0, 10) || '',
            hours: 0,
            amount: Number(d.amount || 0),
            budget: d.account_code || '',
            applyStatus: _mapAppDbStatus(d.status),
            resultDone: d.status === 'completed',
            author: d.applicant_name,
            rawStatus: d.status,  // UI-2: ?ë³¸ DB ?íƒœ ë³´ì¡´
          }));

        }
        _renderApplyList();
      });
    return;
  }
  const myHistory = _dbMyApps;
  // ?€ ? ì²­: DB?ì„œ ê°™ì? ?Œë„Œ?????¤ë¥¸ ?¬ìš©??? ì²­ ì¡°íšŒ
  let teamHistory = [];
  if (teamViewEnabled && _applyListTab === "team") {
    if (!_teamAppsLoaded) {
      _teamAppsLoaded = true;
      if (sb && currentPersona.tenantId) {
        (async () => {
          const ctInfo =
            typeof getCrossTenantInfo === "function"
              ? await getCrossTenantInfo(currentPersona)
              : null;
          const myOrgIds = [currentPersona.orgId];
          if (ctInfo?.linkedOrgIds)
            ctInfo.linkedOrgIds.forEach((id) => {
              if (!myOrgIds.includes(id)) myOrgIds.push(id);
            });
          let query = sb
            .from("applications")
            .select("*")
            .neq("applicant_id", currentPersona.id)
            .neq("status", "draft")
            .order("created_at", { ascending: false });
          // ì¡°ì§ ?„í„°
          if (myOrgIds.length > 1)
            query = query.in("applicant_org_id", myOrgIds);
          else query = query.eq("applicant_org_id", currentPersona.orgId);
          const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
          if (tids.length > 1) query = query.in("tenant_id", tids);
          else query = query.eq("tenant_id", currentPersona.tenantId);
          const { data } = await query;
          _dbTeamApps = (data || []).map((d) => ({
            id: d.id,
            title: d.edu_name,
            type: d.edu_type || "êµìœ¡",
            date: d.created_at?.slice(0, 10) || "",
            endDate: "",
            hours: 0,
            amount: Number(d.amount || 0),
            budget: d.account_code || "",
            applyStatus: _mapAppDbStatus(d.status),
            resultDone: d.status === "completed",
            author: d.applicant_name || "-",
          }));
          _renderApplyList();
        })();
      }
      return;
    }
    teamHistory = _dbTeamApps;
  }
  const history = _applyListTab === "mine" ? myHistory : teamHistory;

  // ?µê³„
  const statCounts = {
    total: history.length,
    approved: history.filter((h) => h.applyStatus === "?¹ì¸?„ë£Œ").length,
    inProgress: history.filter((h) => h.applyStatus === "ê²°ì¬ì§„í–‰ì¤?).length,
    rejected: history.filter((h) => h.applyStatus === "ë°˜ë ¤").length,
    pending: history.filter((h) => h.applyStatus === "?¹ì¸?€ê¸?).length,
  };

  // Segmented tab
  const tabBar = teamViewEnabled
    ? `
  <div style="display:flex;gap:4px;background:#F3F4F6;padding:4px;border-radius:14px;margin-bottom:20px;width:fit-content">
    <button onclick="_applyListTab='mine';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === "mine" ? "#fff" : "transparent"};
      color:${_applyListTab === "mine" ? "#002C5F" : "#6B7280"};
      box-shadow:${_applyListTab === "mine" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      ?‘¤ ??? ì²­
    </button>
    <button onclick="_applyListTab='team';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === "team" ? "#fff" : "transparent"};
      color:${_applyListTab === "team" ? "#002C5F" : "#6B7280"};
      box-shadow:${_applyListTab === "team" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      ?‘¥ ?€ ? ì²­
    </button>
  </div>`
    : "";

  // ?µê³„ ì¹´ë“œ
  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${[
      {
        label: "?¹ì¸?„ë£Œ",
        val: statCounts.approved,
        color: "#059669",
        bg: "#F0FDF4",
        icon: "??,
      },
      {
        label: "ì§„í–‰ì¤?,
        val: statCounts.inProgress,
        color: "#D97706",
        bg: "#FFFBEB",
        icon: "??,
      },
      {
        label: "ë°˜ë ¤",
        val: statCounts.rejected,
        color: "#DC2626",
        bg: "#FEF2F2",
        icon: "??,
      },
      {
        label: "?¹ì¸?€ê¸?,
        val: statCounts.pending,
        color: "#6B7280",
        bg: "#F9FAFB",
        icon: "?•",
      },
    ]
      .map(
        (s) => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">ê±?/span></div>
    </div>`,
      )
      .join("")}
  </div>`;

  // ëª©ë¡ ??
  const rows = history
    .map((h) => {
      const cfg = STATUS_CFG[h.applyStatus] || STATUS_CFG["?¹ì¸?€ê¸?];
      const canResult = h.applyStatus === "?¹ì¸?„ë£Œ";
      const authorBadge = h.author
        ? `<span style="font-size:10px;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:10px;margin-left:6px">?‘¤ ${h.author}</span>`
        : "";
      return `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s">
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:900;color:#111827">${h.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${h.applyStatus}</span>
          ${h.resultDone ? '<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">?“‹ ê²°ê³¼?‘ì„±?„ë£Œ</span>' : ""}
          ${authorBadge}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          <span>?“… ${h.date} ~ ${h.endDate}</span>
          <span>?“š ${h.type}</span>
          <span>?’° ${h.budget} Â· ${(h.amount || 0).toLocaleString()}??/span>
          <span>??${h.hours}H</span>
        </div>
        ${(() => {
          if (h.rawStatus !== 'saved') return '';
          const _sid = String(h.id || '').replace(/["'<>&]/g, '');
          const _stitle = String(h.title || '').replace(/["'<>&]/g, '');
          return `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#ECFDF5;border:1px solid #6EE7B7;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><span style="font-size:11px;font-weight:800;color:#065F46">?“¤ ?€?¥ì™„ë£???ê²°ì¬?¨ì—???ì‹  ê°€??/span><button onclick="event.stopPropagation();_appSingleSubmit('${_sid}','${_stitle}')" style="padding:5px 14px;border-radius:8px;background:#059669;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer;white-space:nowrap">?“¤ ?ì‹ ?˜ê¸°</button></div>`;
        })()}

      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${
          h.applyStatus === 'ë°˜ë ¤'
            ? `<div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
                ? ï¸ ë°˜ë ¤ ?¬ìœ : ${h.rejectReason || '?ˆì‚° ?”ì•¡ ë¶€ì¡±ìœ¼ë¡?ë°˜ë ¤?˜ì—ˆ?µë‹ˆ?? ?ˆì‚° ê³„íš ?˜ë¦½ ???¬ì‹ ì²?ë°”ë?ˆë‹¤.'}
               </div>`
            : ''
        }
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${
          h.rawStatus === 'draft' || h.applyStatus === '?‘ì„±ì¤?
            ? `<button onclick="resumeApplyDraft('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:#0369A1;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">?ï¸ ?´ì–´?°ê¸°</button>
               <button onclick="deleteApplyDraft('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">?—‘ ?? œ</button>`
            : ''
        }
        ${
          (h.rawStatus === 'pending' || h.rawStatus === 'submitted' || h.applyStatus === '?¹ì¸?€ê¸? || h.applyStatus === 'ê²°ì¬ì§„í–‰ì¤?) && h.rawStatus !== 'saved'
            ? `<button onclick="cancelApply('${h.id.replace(/'/g, "\\\"'\\\"")}')"
               style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">ì·¨ì†Œ ?”ì²­</button>`
            : ''
        }
        ${
          h.applyStatus === '?¹ì¸?„ë£Œ' && !h.resultDone
            ? `<button onclick="_openResultForm('${h.id.replace(/'/g, "\\\"'\\\"")}',${'\'' + (h.title||'').replace(/'/g,'') + '\''},${h.amount||0})"
               style="padding:8px 14px;border-radius:8px;background:#002C5F;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">?“ ê²°ê³¼ ?‘ì„±</button>`
            : ''
        }
        ${
          h.applyStatus === '?¹ì¸?„ë£Œ' && h.resultDone
            ? `<button style="padding:8px 14px;border-radius:8px;background:#F3F4F6;color:#9CA3AF;font-size:11px;font-weight:800;border:none;cursor:default;white-space:nowrap">??ê²°ê³¼ ?œì¶œ ?„ë£Œ</button>`
            : ''
        }
      </div>
    </div>`;
    })
    .join('');

  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">?“­</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">${_applyYear}??êµìœ¡? ì²­ ?´ë ¥???†ìŠµ?ˆë‹¤</div>
    <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
      êµìœ¡ ? ì²­???˜ë©´ ê²°ì¬ ì§„í–‰ ?í™©ê³?ê²°ê³¼ë¥????”ë©´?ì„œ ?•ì¸?????ˆìŠµ?ˆë‹¤.<br>
      ?„ì˜ "êµìœ¡ ? ì²­" ë²„íŠ¼?¼ë¡œ ì²?? ì²­???œì‘?´ë³´?¸ìš”.
    </div>
    <button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
      ?ï¸ êµìœ¡ ? ì²­?˜ê¸°
    </button>
  </div>`;

  // ?°ë„ ? íƒ
  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_applyYear=Number(this.value);_renderApplyList()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map((y) => `<option value="${y}" ${_applyYear === y ? "selected" : ""}>${y}??/option>`).join("")}
  </select>`;

  document.getElementById("page-apply").innerHTML = `
<div class="max-w-5xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??êµìœ¡ ? ì²­</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">êµìœ¡? ì²­ ?„í™©</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} Â· ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      ${_applySmartButtons()}
    </div>
  </div>
  ${tabBar}
  ${statsBar}
  <div class="card p-6">
    ${history.length === 0 ? emptyMsg : `<div style="display:flex;flex-direction:column;gap:10px">${rows}</div>`}
  </div>
</div>`;
}

// ?€ ? ì²­ DB ìºì‹œ
let _dbTeamApps = [];
let _teamAppsLoaded = false;

// ?€?€?€ ?¤í… ? íƒ ?´ìš© ë°°ë„ˆ (êµìœ¡ê³„íš ?„ì??œì? ?™ì¼???¤í??? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _applySelectionBanner(s, currentStep) {
  if (currentStep <= 1) return ""; // Step 1?€ ë°°ë„ˆ ë¶ˆí•„??

  const items = [];

  // ??ëª©ì  (Step 2+)
  if (s.purpose) {
    const purposeLabel = s.purpose.label || s.purpose.id || "";
    items.push({
      num: "??,
      key: "ëª©ì ",
      value: purposeLabel,
      color: "#002C5F",
    });
  }

  // ???ˆì‚° (Step 3+)
  if (currentStep >= 3) {
    let budgetLabel = "";
    if (s.purpose?.id === "external_personal") {
      // ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ: budgetChoice ?ˆì´ë¸?
      const bcMap = {
        general: "?¼ë°˜êµìœ¡?ˆì‚° ì°¸ê?ê³„ì •",
        rnd: "R&Dêµìœ¡?ˆì‚° ê³„ì •",
        "hae-edu": "?„ì‚¬êµìœ¡?ˆì‚°",
        "hae-team": "?€/?„ë¡œ?íŠ¸ ? ë‹¹?ˆì‚°",
        none: "?ˆì‚° ë¯¸ì‚¬??,
      };
      budgetLabel = s.budgetChoice
        ? bcMap[s.budgetChoice] || s.budgetChoice
        : "";
    } else {
      // êµìœ¡?´ë‹¹?? ? íƒ???ˆì‚° ê³„ì •ëª?
      const availBudgets = s.purpose
        ? getPersonaBudgets(currentPersona, s.purpose.id)
        : [];
      const chosen = availBudgets.find((b) => b.id === s.budgetId);
      budgetLabel = chosen ? chosen.name : s.budgetId || "";
    }
    if (budgetLabel) {
      items.push({
        num: "??,
        key: "?ˆì‚°",
        value: budgetLabel,
        color: "#0369A1",
      });
    }
  }

  if (items.length === 0) return "";

  const itemsHtml = items
    .map(
      (it) => `
    <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#374151">
      <span style="font-size:10px;color:#6B7280;font-weight:700">${it.num} ${it.key}</span>
      <span style="font-weight:900;padding:2px 8px;border-radius:6px;background:${it.color}14;color:${it.color};max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.value}</span>
    </span>`,
    )
    .join('<span style="color:#D1D5DB;margin:0 2px">|</span>');

  return `
    <div style="background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span style="font-size:10px;font-weight:900;color:#0369A1;white-space:nowrap">?“Œ ? íƒ ?´ìš©</span>
    <span style="color:#BAE6FD;font-size:12px">|</span>
    ${itemsHtml}
  </div > `;
}

// ?€?€?€ êµìœ¡? ì²­ ??ë·?(ê¸°ì¡´ renderApply ë¡œì§) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

function _isPatternA(s) {
  if (!s) return false;
  if (s.budgetChoice === "rnd") return true;
  if (s.purpose?.id !== "external_personal" && s.budgetId) {
    const avail = typeof getPersonaBudgets !== "undefined" ? getPersonaBudgets(currentPersona, s.purpose?.id) : [];
    const cb = avail.find(b => b.id === s.budgetId);
    const pi = cb && typeof getProcessPatternInfo !== "undefined" ? getProcessPatternInfo(currentPersona, s.purpose?.id, cb.accountCode) : null;
    return pi?.pattern === "A";
  }
  return false;
}

function _renderLineItemsStep(s) {
  if (!s.lineItems || s.lineItems.length === 0) return `<div class="text-gray-500 text-sm font-bold">? íƒ??êµìœ¡ê³„íš???†ìŠµ?ˆë‹¤.</div>`;
  
  return s.lineItems.map((li, index) => {
    const fields = typeof getLineItemFieldConfig === 'function' ? getLineItemFieldConfig(li.eduType) : [];
    const dynamicHtml = typeof renderDynamicFormFields === 'function' 
      ? renderDynamicFormFields(fields, li, `applyState.lineItems[${index}]`)
      : '';
      
    return `
      <div class="mb-6 p-6 rounded-2xl border-2 border-violet-200 bg-white shadow-sm">
        <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <div>
            <div class="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">?°ë™??êµìœ¡ê³„íš</div>
            <div class="font-black text-gray-900 text-base">${li.title}</div>
            <div class="text-xs text-gray-500 mt-1">êµìœ¡? í˜•: ${li.eduType || '-'}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">ê³„íš ?ˆì‚°</div>
            <div class="font-black text-violet-600 text-lg">${(li.subtotal||0).toLocaleString()}??/div>
          </div>
        </div>
        ${dynamicHtml}
      </div>
    `;
  }).join('');
}

function _renderApplyForm() {
  // ?€?€ SERVICE_POLICIES ë¡œë”© ê²Œì´??(ê·¼ë³¸ ?˜ì •) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  // SERVICE_POLICIESê°€ ë¹„ì–´?ˆìœ¼ë©??•ì±… ?„í„°ë§ì´ ë¬´ë ¥?”ë˜??ê¸°í??´ì˜ ???„ìˆ˜ ë°œìƒ
  if (
    typeof _foServicePoliciesLoaded !== "undefined" &&
    !_foServicePoliciesLoaded
  ) {
    _loadFoPolicies().then(() => _renderApplyForm());
    document.getElementById("page-apply").innerHTML =
      `<div class="max-w-5xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">??/div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">êµìœ¡ì§€???´ì˜ ê·œì¹™ ë¡œë”© ì¤?..</div>
    </div>`;
    return;
  }
  // DB ?¹ì¸ êµìœ¡ê³„íš ? ë¡œ??(ìµœì´ˆ 1??
  if (!_dbApprovedPlansLoaded || _dbApprPlanPersonaId !== currentPersona.id) {
    _loadApprovedPlans().then(() => _renderApplyForm());
    document.getElementById("page-apply").innerHTML =
      `<div class="max-w-5xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">??/div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">êµìœ¡ê³„íš ?°ì´??ë¡œë”© ì¤?..</div>
    </div>`;
    return;
  }
  const s = applyState;

  // ?•ì±… ?°ì„ : ??• ???„ë‹Œ ë§¤ì¹­ ?•ì±…?¼ë¡œ UI ê²°ì •
  const policyResult =
    typeof _getActivePolicies !== "undefined"
      ? _getActivePolicies(currentPersona)
      : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  const allPurposes = getPersonaPurposes(currentPersona);
  // ê°œì„ 3: ?‰ìœ„ ê¸°ë°˜ ì¹´í…Œê³ ë¦¬ ê·¸ë£¹??
  const _catColors = {
    "self-learning": {
      badge: "bg-blue-100 text-blue-600",
      border: "border-accent",
      borderHover: "hover:border-accent",
      bgActive: "bg-blue-50",
      textActive: "text-accent",
    },
    "edu-operation": {
      badge: "bg-violet-100 text-violet-600",
      border: "border-violet-500",
      borderHover: "hover:border-violet-400",
      bgActive: "bg-violet-50",
      textActive: "text-violet-600",
    },
    "result-only": {
      badge: "bg-amber-100 text-amber-700",
      border: "border-amber-500",
      borderHover: "hover:border-amber-400",
      bgActive: "bg-amber-50",
      textActive: "text-amber-700",
    },
  };
  const _catMeta =
    typeof _CATEGORY_META !== "undefined"
      ? _CATEGORY_META
      : {
          "self-learning": {
            icon: "?“š",
            label: "ì§ì ‘ ?™ìŠµ",
            desc: "ë³¸ì¸??ì§ì ‘ ì°¸ì—¬?˜ëŠ” êµìœ¡",
          },
          "edu-operation": {
            icon: "?¯",
            label: "êµìœ¡ ?´ì˜",
            desc: "êµìœ¡ê³¼ì •??ê¸°íš?˜ê±°???´ì˜?˜ëŠ” ê²½ìš°",
          },
          "result-only": {
            icon: "?“",
            label: "ê²°ê³¼ë§??±ë¡",
            desc: "?´ë? ?˜ë£Œ??êµìœ¡??ê²°ê³¼ë¥??±ë¡",
          },
        };
  const categorized = {};
  allPurposes.forEach((p) => {
    const cat = p.category || "edu-operation";
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(p);
  });

  const availBudgets = s.purpose
    ? getPersonaBudgets(currentPersona, s.purpose.id)
    : [];

  const curBudget = availBudgets.find((b) => b.id === s.budgetId) || null;
  const isRndBudget = curBudget?.account === "?°êµ¬?¬ì";
  const isOperBudget = curBudget?.account === "?´ì˜";
  // R&D ?ˆì‚° ê³„ì •???°ê³„??êµìœ¡ê³„íš ëª©ë¡ (DB ?¤ì‹œê°?
  const rndPlans = _dbApprovedPlans.filter(
    (p) => (p.account || "").includes("RND") || p.account === "?°êµ¬?¬ì",
  );
  const hasRndPlans = rndPlans.length > 0;
  // ?´ì˜ ?ˆì‚° ê³„ì •???°ê³„??êµìœ¡ê³„íš ëª©ë¡ (DB ?¤ì‹œê°?
  const operPlans = _dbApprovedPlans.filter(
    (p) => p.budgetId === curBudget?.id,
  );
  const hasOperPlans = operPlans.length > 0;
  // ?¤ìŒ ë²„íŠ¼ ?œì„± ì¡°ê±´
  const step2Blocked =
    s.useBudget === true &&
    ((isRndBudget && !hasRndPlans) || (isOperBudget && !hasOperPlans));
  const step2NeedPlan =
    s.useBudget === true &&
    ((isRndBudget && hasRndPlans) || (isOperBudget && hasOperPlans));
  const step2CanNext =
    s.useBudget !== null &&
    (s.useBudget === false ||
      (!isRndBudget && !isOperBudget && s.budgetId) ||
      (isRndBudget && s.planId) ||
      (isOperBudget && s.planIds?.length > 0)) &&
    !step2Blocked;
  const totalExp = s.expenses.reduce(
    (sum, e) => sum + Number(e.price) * Number(e.qty),
    0,
  );
  // v3: ì§ì ‘?™ìŠµ????ª© DB ?™ì  ë¡œë“œ (CALC_GROUNDS_MASTER ?œìš©)
  const _slItems = (typeof _getCalcGroundsForType === "function") 
    ? _getCalcGroundsForType("self_learning", currentPersona?.vorgTemplateId || null, s.region === "overseas")
    : [];
  // ì§ì ‘?™ìŠµ?? type ?„ë“œ ?†ëŠ” ??ª©?€ placeholderë¡?
  if (s.expenses.length === 0 || (s.expenses.length === 1 && !s.expenses[0].type && !s.expenses[0].itemId)) {
    // ì´ˆê¸° ë³€?? ê¸°ì? type ë¬¸ì?´ì„ itemIdë¡?ë§¤í•‘
    s.expenses.forEach((e) => {
      if (e.type && !e.itemId) {
        const matched = _slItems.find(g => g.name === e.type || g.name.includes(e.type.split('/')[0]));
        if (matched) e.itemId = matched.id;
      }
    });
  }
  const totalAmt = isRndBudget ? Number(s.rndTotal) : totalExp;
  const over = curBudget && totalAmt > curBudget.balance - curBudget.used;

  // ê°œì„ 1: ?„ë¡œ?¸ìŠ¤ ?¨í„´ ?ˆë‚´ ?°ì´??
  const _processInfo =
    curBudget && s.purpose
      ? typeof getProcessPatternInfo !== "undefined"
        ? getProcessPatternInfo(
            currentPersona,
            s.purpose.id,
            curBudget.accountCode,
          )
        : null
      : null;

  document.getElementById("page-apply").innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#002C5F'" onmouseout="this.style.color='#6B7280'">
        ??? ì²­ ëª©ë¡?¼ë¡œ
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??êµìœ¡ ? ì²­</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">êµìœ¡ ? ì²­???‘ì„±</h1>
    </div>
    ${
      s.planId
        ? (() => {
            const _linkedPlan = _dbApprovedPlans.find((p) => p.id === s.planId);
            const _lpTitle = _linkedPlan ? _linkedPlan.title : s.planId;
            const _lpAmount = _linkedPlan
              ? (_linkedPlan.amount || 0).toLocaleString()
              : "-";
            const _lpBudget = curBudget
              ? (curBudget.balance - curBudget.used).toLocaleString()
              : "-";
            return `
<div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE;border-radius:12px;display:flex;align-items:center;gap:12px">
  <span style="font-size:22px">?”—</span>
  <div style="flex:1">
    <div style="font-size:12px;font-weight:900;color:#1D4ED8">êµìœ¡ê³„íš ê¸°ë°˜ ? ì²­</div>
    <div style="font-size:11px;color:#3B82F6;margin-top:2px">${_lpTitle} Â· ê³„íš??${_lpAmount}??Â· ?ˆì‚°?”ì•¡ ${_lpBudget}??/div>
  </div>
  <button onclick="_viewingPlanDetail=null;if(typeof viewPlanDetail==='function'){viewPlanDetail('${s.planId}');}navigate('plans');"
    style="padding:6px 14px;border-radius:8px;border:1.5px solid #BFDBFE;background:white;font-size:11px;font-weight:800;color:#1D4ED8;cursor:pointer;white-space:nowrap">
    ?“ ê³„íš ?ì„¸ ë³´ê¸°
  </button>
</div>`;
          })()
        : ""
    }
  </div>

  <!--Stepper indicator-->
  <div class="card p-6">
    <div class="flex items-center gap-2">
      ${[1, 2, 3, 4]
        .map(
          (n) => `
      <div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
        <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "?? : n}</div>
        <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${["ëª©ì  ? íƒ", "?ˆì‚° ? íƒ", _isPatternA(s) ? "?¸ë??°ì¶œê·¼ê±°" : "êµìœ¡? í˜• ? íƒ", "? ì²­ ?•ë³´"][n - 1]}</span>
        ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
      </div>`,
        )
        .join("")}
    </div>
  </div>

  <!--Step 1: Purpose (ê°œì„ 3: ?‰ìœ„ ê¸°ë°˜ ì¹´í…Œê³ ë¦¬)-->
  <div class="card p-8 ${s.step === 1 ? "" : "hidden"}">
    <h2 class="text-lg font-black text-gray-800 mb-6">01. êµìœ¡ ëª©ì  ? íƒ</h2>

    ${["self-learning", "edu-operation"]
      .map((catKey) => {
        const items = categorized[catKey] || [];
        if (items.length === 0) return "";
        const meta = _catMeta[catKey] || _catMeta["edu-operation"];
        const colors = _catColors[catKey] || _catColors["edu-operation"];
        const cols =
          items.length === 1
            ? "grid-cols-1"
            : items.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-3";
        return `
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full ${colors.badge} tracking-wider">${meta.icon} ${meta.label}</span>
        <span class="text-[11px] text-gray-400">${meta.desc}</span>
      </div>
      <div class="grid ${cols} gap-4">
        ${items
          .map((p) => {
            const active = s.purpose?.id === p.id;
            return `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all ${colors.borderHover} ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white"}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${active ? colors.textActive : ""}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`;
          })
          .join("")}
      </div>
    </div>`;
      })
      .join("")}

    <div class="flex justify-end mt-6">
      <button onclick="applyNext()" ${!s.purpose ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? "bg-brand text-white hover:bg-blue-900 shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed"}">
        ?¤ìŒ ??
      </button>
    </div>
  </div>

  <!--Step 2: Budget-->
  <div class="card p-8 ${s.step === 2 ? "" : "hidden"}">
    ${_applySelectionBanner(s, 2)}
    <h2 class="text-lg font-black text-gray-800 mb-2">02. ?ˆì‚° ? íƒ</h2>

    ${(() => {
      const isIndividual = s.purpose?.id === "external_personal";
      if (isIndividual) {
        // ?€?€ ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ: ?˜ë¥´?Œë‚˜ë³??™ì  ?ˆì‚° ?µì…˜ ì¹´ë“œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
        const allowed = currentPersona.allowedAccounts || [];
        const hasRnd = allowed.some((a) => a.includes("RND"));
        const hasHscExt = allowed.includes("HSC-EXT");
        const hasHaeEdu = allowed.includes("HAE-EDU");
        const hasHaeTeam = allowed.includes("HAE-TEAM");
        const hasPart = allowed.some(
          (a) =>
            a.includes("-PART") || a.includes("-OPS") || a.includes("-ETC"),
        );
        const hasFree = allowed.includes("COMMON-FREE"); // ?ˆì‚° ë¯¸ì‚¬???•ì±… ?¬ë?

        // ?€?€ ?¼ë°˜ê³„ì • ì¹´ë“œ ?œê·¸: êµìœ¡ì§€???´ì˜ ê·œì¹™ process_pattern ê¸°ë°˜ ?™ì  ê²°ì • ?€?€?€?€?€?€
        // Pattern B: ? ì²­?’ê²°ê³?ì¦‰ì‹œ ?ˆì‚° ì°¨ê°), Pattern C/D: ?„ì •?? A/E: ? ì²­?’ê²°ê³?
        function _getGeneralCardTag() {
          if (typeof SERVICE_POLICIES !== "undefined") {
            const pol = SERVICE_POLICIES.find(
              (p) =>
                p.status !== "inactive" &&
                (p.account_codes || []).some((c) => allowed.includes(c)) &&
                (p.purpose === "external_personal" ||
                  p.purpose === "ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ"),
            );
            if (pol) {
              const pt = pol.process_pattern || pol.processPattern || "";
              if (pt === "B")
                return {
                  tag: "?¨í„´ B (? ì²­?’ê²°ê³?",
                  tagColor: "#B45309",
                  tagBg: "#FFFBEB",
                };
              if (pt === "C" || pt === "D")
                return {
                  tag: "?„ì •?°í˜•",
                  tagColor: "#D97706",
                  tagBg: "#FEF3C7",
                };
              if (pt === "A" || pt === "E")
                return {
                  tag: "? ì²­?’ê²°ê³?,
                  tagColor: "#059669",
                  tagBg: "#F0FDF4",
                };
            }
          }
          // DB?ì„œ ?•ì±… ëª??½ìœ¼ë©????„ì¬ ?Œë„Œ??ê¸°ë³¸ê°?
          return {
            tag: "?¨í„´ B (? ì²­?’ê²°ê³?",
            tagColor: "#B45309",
            tagBg: "#FFFBEB",
          };
        }
        const generalTag = _getGeneralCardTag();

        const CHOICES = [
          // ?€?€ HAE ?„ì‚¬êµìœ¡?ˆì‚° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
          ...(hasHaeEdu
            ? [
                {
                  id: "hae-edu",
                  icon: "?«",
                  title: "?„ì‚¬êµìœ¡?ˆì‚°",
                  desc: "?„ë??¤í† ?ë²„ ?„ì‚¬ ê³µí†µ êµìœ¡?ˆì‚°?ì„œ êµìœ¡ë¹„ë? ì§€?ë°›?µë‹ˆ?? ? ì²­ ?¹ì¸ ??êµìœ¡ ?´ìˆ˜ ê²°ê³¼ë¥??‘ì„±?©ë‹ˆ??",
                  tag: "? ì²­?’ê²°ê³?,
                  tagColor: "#7C3AED",
                  tagBg: "#F5F3FF",
                  next: "êµìœ¡? í˜• ? íƒ ???¸ë??•ë³´",
                  nextColor: "#7C3AED",
                },
              ]
            : []),
          // ?€?€ HAE ?€/?„ë¡œ?íŠ¸ ? ë‹¹?ˆì‚° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
          ...(hasHaeTeam
            ? [
                {
                  id: "hae-team",
                  icon: "?‘¥",
                  title: "?€/?„ë¡œ?íŠ¸ ? ë‹¹?ˆì‚°",
                  desc: "?€ ë°??„ë¡œ?íŠ¸ ?¨ìœ„ë¡?ë°°ì •??êµìœ¡?ˆì‚°?ì„œ êµìœ¡ë¹„ë? ì§€?ë°›?µë‹ˆ?? ? ì²­ ?¹ì¸ ??êµìœ¡ ?´ìˆ˜ ê²°ê³¼ë¥??‘ì„±?©ë‹ˆ??",
                  tag: "? ì²­?’ê²°ê³?,
                  tagColor: "#059669",
                  tagBg: "#F0FDF4",
                  next: "êµìœ¡? í˜• ? íƒ ???¸ë??•ë³´",
                  nextColor: "#059669",
                },
              ]
            : []),
          // ?€?€ HSC ?¬ì™¸êµìœ¡ ê³„ì • ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
          ...(hasHscExt
            ? [
                {
                  id: "general",
                  icon: "?­",
                  title: "?„ë??œì² -?¬ì™¸êµìœ¡ ê³„ì •",
                  desc: "?„ë??œì²  ?¬ì™¸êµìœ¡ ?ˆì‚°?ì„œ êµìœ¡ë¹„ë? ì§€?ë°›?µë‹ˆ?? ? ì²­ ???¹ì¸ ???ˆì‚°??ì°¨ê°?˜ë©°, ?´í›„ êµìœ¡ ê²°ê³¼ë¥??‘ì„±?©ë‹ˆ?? (?¨í„´ B: ? ì²­ ??ê²°ê³¼)",
                  tag: "? ì²­?’ê²°ê³?,
                  tagColor: "#BE123C",
                  tagBg: "#FFF1F2",
                  next: "êµìœ¡? í˜• ? íƒ ???¸ë??•ë³´",
                  nextColor: "#BE123C",
                },
              ]
            : []),
          // ?€?€ ?¼ë°˜ ì°¸ê?ê³„ì • (HMC/KIA ?? ???•ì±… ?¨í„´ ?œê·¸ ?™ì  ?œì‹œ ?€?€?€?€?€?€?€?€?€
          ...(!hasHscExt && !hasHaeEdu && hasPart
            ? [
                {
                  id: "general",
                  icon: "?’³",
                  title: "?¼ë°˜êµìœ¡?ˆì‚° ì°¸ê?ê³„ì •",
                  desc: "?¼ë°˜ êµìœ¡?ˆì‚°?ì„œ ì°¸ê?ë¹„ë? ì§€?ë°›?µë‹ˆ?? êµìœ¡ì§€???´ì˜ ê·œì¹™???°ë¼ ? ì²­ ??ê²°ê³¼ ?ëŠ” ?„ì •??ë°©ì‹?¼ë¡œ ì²˜ë¦¬?©ë‹ˆ??",
                  tag: generalTag.tag,
                  tagColor: generalTag.tagColor,
                  tagBg: generalTag.tagBg,
                  next: "êµìœ¡? í˜• ? íƒ ???¸ë??•ë³´",
                  nextColor: "#059669",
                },
              ]
            : []),
          ...(hasRnd
            ? [
                {
                  id: "rnd",
                  icon: "?”¬",
                  title: "R&Dêµìœ¡?ˆì‚° ê³„ì •",
                  desc: "?¬ì „???¹ì¸ë°›ì? R&D êµìœ¡ê³„íšê³??°ë™?˜ì—¬ ? ì²­?©ë‹ˆ?? êµìœ¡ê³„íš ?†ì´????ê²½ë¡œë¥??´ìš©?????†ìŠµ?ˆë‹¤.",
                  tag: "ê³„íš ?°ë™ ?„ìˆ˜",
                  tagColor: "#7C3AED",
                  tagBg: "#F5F3FF",
                  next: "êµìœ¡ê³„íš ? íƒ ???¸ë??•ë³´",
                  nextColor: "#7C3AED",
                },
              ]
            : []),
          // ?€?€ ?ˆì‚° ë¯¸ì‚¬????COMMON-FREE ?•ì±… ê³„ì •???ˆì„ ?Œë§Œ ?¸ì¶œ ?€?€?€?€?€?€?€?€?€?€?€?€
          ...(hasFree
            ? [
                {
                  id: "none",
                  icon: "?“",
                  title: "?ˆì‚° ë¯¸ì‚¬??(?´ë ¥ë§??±ë¡)",
                  desc: "?ë¹„ ?™ìŠµÂ·ë¬´ë£Œ ê°•ì˜ ???ˆì‚° ?¬ìš© ?†ì´ ?™ìŠµ ?´ë ¥ë§??±ë¡?©ë‹ˆ?? ?ˆì‚° ?”ì•¡???í–¥??ì£¼ì? ?ŠìŠµ?ˆë‹¤.",
                  tag: "?ˆì‚° ë¯¸ì‚¬??,
                  tagColor: "#6B7280",
                  tagBg: "#F3F4F6",
                  next: "êµìœ¡? í˜• ? íƒ ???¸ë??•ë³´",
                  nextColor: "#374151",
                },
              ]
            : []),
        ];
        const bc = s.budgetChoice;
        return `<p class="text-sm text-gray-400 mb-5">?´ë²ˆ êµìœ¡ ? ì²­???´ë–¤ ?ˆì‚°???¬ìš©?˜ì‹œê² ìŠµ?ˆê¹Œ?</p>
<div style="display:grid;gap:10px;margin-bottom:4px">
${CHOICES.map((ch) => {
  const active = bc === ch.id;
  const activeColor =
    ch.id === "rnd"
      ? "#7C3AED"
      : ch.id === "hae-edu"
        ? "#7C3AED"
        : ch.id === "hae-team"
          ? "#059669"
          : ch.id === "general"
            ? hasHscExt
              ? "#BE123C"
              : "#059669"
            : "#9CA3AF";
  const col = active ? activeColor : "#E5E7EB";
  return `<button onclick="selectBudgetChoice('${ch.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${col};
         background:${active ? col + "12" : "white"};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="font-size:26px;flex-shrink:0;margin-top:2px">${ch.icon}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:${active ? col : "#111827"}">${ch.title}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${ch.tagBg};color:${ch.tagColor}">${ch.tag}</span>
      </div>
      <p style="font-size:12px;color:#6B7280;line-height:1.55;margin:0 0 8px">${ch.desc}</p>
      <div style="font-size:10px;font-weight:800;color:${ch.nextColor}">?¤ìŒ ?¨ê³„: ${ch.next} ??/div>
    </div>
    <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${col};background:${active ? col : "white"};flex-shrink:0;margin-top:4px;display:flex;align-items:center;justify-content:center">
      ${active ? '<span style="color:white;font-size:11px;font-weight:900">??/span>' : ""}
    </div>
  </div>
</button>`;
}).join("")}
</div>
${bc === "rnd" ? _renderPlanPickerSection(s, "rnd") : ""}`;
      }

      // ?€?€ êµìœ¡?´ë‹¹??ëª©ì : DB ?•ì±… ê¸°ë°˜ ?ˆì‚° ê³„ì • ëª©ë¡ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
      const policyBudgets = getPersonaBudgets(currentPersona, s.purpose?.id);
      if (policyBudgets.length === 0) {
        return `<p class="text-sm text-gray-500 mb-4 font-bold"><span class="text-orange-500">? ï¸</span> ??êµìœ¡ ëª©ì ???¬ìš© ê°€?¥í•œ ?ˆì‚° ê³„ì •???†ìŠµ?ˆë‹¤.<br><span class="text-xs text-gray-400">?´ë‹¹?ì—ê²?ë¬¸ì˜?˜ì„¸??</span></p>`;
      }
      return `<p class="text-sm text-gray-400 mb-5">?´ë²ˆ êµìœ¡???¬ìš©???ˆì‚° ê³„ì •??? íƒ?˜ì„¸??</p>
<div style="display:grid;gap:8px">
${policyBudgets
  .map((b) => {
    const active = s.budgetId === b.id;
    const acctTypeLabel =
      b.account === "?´ì˜"
        ? "?´ì˜ ê³„ì •"
        : b.account === "ì°¸ê?"
          ? "ì°¸ê? ê³„ì •"
          : b.account + " ê³„ì •";
    const vorgLabel = b.vorgName
      ? `<span style="font-size:10px;font-weight:900;padding:2px 7px;border-radius:5px;background:#F0F9FF;color:#0369A1;margin-left:6px">${b.vorgName}</span>`
      : "";
    return `<button onclick="selectApplyBudget('${b.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};
         background:${active ? "#EFF6FF" : "white"};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="display:flex;align-items:center;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${b.name}</span>
        ${vorgLabel}
      </div>
    </div>
    ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">? íƒ??/span>' : ""}
  </div>
</button>`;
  })
  .join("")}
</div>
${/* ê°œì„ 1: ?„ë¡œ?¸ìŠ¤ ?¨í„´ ?ˆë‚´ ë°°ë„ˆ */ ""}
${
  _processInfo
    ? `
<div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:16px 18px">
  <div style="font-size:10px;font-weight:900;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
    <span style="width:5px;height:5px;background:#22C55E;border-radius:50%;display:inline-block"></span>
    ??êµìœ¡?€ ?¤ìŒ ?ˆì°¨ë¡?ì§„í–‰?©ë‹ˆ??
  </div>
  <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;flex-wrap:wrap">
    ${_processInfo.steps
      .map(
        (st, i) => `
    <div style="display:flex;align-items:center;gap:4px">
      <div style="text-align:center">
        <div style="font-size:18px;margin-bottom:2px">${st.icon}</div>
        <div style="font-size:11px;font-weight:900;color:#111827">${st.name}</div>
        <div style="font-size:9px;color:#6B7280;font-weight:700">${st.hint}</div>
      </div>
      ${i < _processInfo.steps.length - 1 ? '<span style="color:#D1D5DB;font-size:16px;margin:0 6px;font-weight:bold">??/span>' : ""}
    </div>`,
      )
      .join("")}
  </div>
  <div style="font-size:11px;color:#15803D;display:flex;align-items:flex-start;gap:5px">
    <span style="font-size:12px;flex-shrink:0">??/span>
    <span>${_processInfo.hint}</span>
  </div>
</div>`
    : ""
}
${(() => {
  // ??êµìœ¡?´ì˜ ?¨í„´A: êµìœ¡ê³„íš ? íƒ ?ì—­ ì¶”ê?
  if (!s.budgetId || s.purpose?.id === "external_personal") return "";
  const _pi =
    typeof getProcessPatternInfo !== "undefined" && curBudget
      ? getProcessPatternInfo(
          currentPersona,
          s.purpose?.id,
          curBudget.accountCode,
        )
      : null;
  if (_pi?.pattern !== "A") return "";
  return _renderPlanPickerSection(s, "operator");
})()}`;
    })()}

    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
      ${(() => {
        const isInd = s.purpose?.id === "external_personal";
        // ???¨í„´A êµìœ¡ê³„íš ?„ìˆ˜ ì²´í¬: R&D ?ëŠ” êµìœ¡?´ì˜ ?¨í„´A
        const _pi2 =
          !isInd && curBudget && typeof getProcessPatternInfo !== "undefined"
            ? getProcessPatternInfo(
                currentPersona,
                s.purpose?.id,
                curBudget?.accountCode,
              )
            : null;
        const isPatA = _pi2?.pattern === "A";
        const hasPlanSelected = s.planId || (s.planIds && s.planIds.length > 0);
        const ok = isInd
          ? s.budgetChoice && (s.budgetChoice !== "rnd" || hasPlanSelected)
          : s.budgetId && (!isPatA || hasPlanSelected);
        return `<button onclick="applyNext()" ${!ok ? "disabled" : ""}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${!ok ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
          ?¤ìŒ ??
        </button>`;
      })()}
    </div>
  </div>


  <!--Step 3: êµìœ¡? í˜• ? íƒ OR Line Items-->
  <div class="card p-8 ${s.step === 3 ? "" : "hidden"}">
    ${_isPatternA(s) ? `
      ${_applySelectionBanner(s, 3)}
      <h2 class="text-lg font-black text-gray-800 mb-6">03. êµìœ¡ê³„íš êµ¬ì„± (?¸ë??°ì¶œê·¼ê±°)</h2>
      <div class="mb-4 text-sm text-gray-500 font-bold">ê³¼ì •???´ì˜???ì„¸ ?´ì—­???…ë ¥?´ì£¼?¸ìš”. ì§‘í•©/?´ëŸ¬?ì˜ ê²½ìš° ì°¨ìˆ˜ë¥?ì§€?•í•´???©ë‹ˆ??</div>
      ${_renderLineItemsStep(s)}
      <div class="flex justify-between mt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
        <button onclick="applyNext()" class="px-8 py-3 rounded-xl font-black text-sm transition bg-brand text-white hover:bg-blue-900 shadow-lg">?¤ìŒ ??/button>
      </div>
    ` : `
      ${_applySelectionBanner(s, 3)}
      <h2 class="text-lg font-black text-gray-800 mb-6">03. êµìœ¡? í˜• ? íƒ</h2>
      ${(() => {
        const tree = typeof getPolicyEduTree !== "undefined" ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget ? curBudget.account : null) : [];
        if (tree.length > 0) {
          return tree.map((node) => {
            const isLeaf = !node.subs || node.subs.length === 0;
            const isSelected = s.eduType === node.id;
            if (isLeaf) {
              const leafSelected = isSelected && !s.subType;
              return `
        <div class="mb-3">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                   ${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
        </div>`;
            } else {
              return `
        <div class="mb-3 rounded-xl border-2 overflow-hidden ${isSelected ? "border-gray-900" : "border-gray-200"}">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 text-sm font-bold text-left transition flex items-center justify-between
                   ${isSelected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}">
            <span>${node.label}</span>
            <span class="text-xs ${isSelected ? "text-gray-300" : "text-gray-400"}">${isSelected ? "?? : "??} ${node.subs.length}ê°??¸ë?? í˜•</span>
          </button>
          ${isSelected ? `
          <div class="p-4 bg-gray-50 border-t border-gray-200">
            <div class="text-xs font-black text-blue-500 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
              ?¸ë? êµìœ¡? í˜•??? íƒ?˜ì„¸??
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${node.subs.map(st => `
              <button onclick="applyState.subType='${st.key}';renderApply()"
                class="p-3 rounded-xl border-2 text-sm font-bold text-left transition
                       ${s.subType === st.key ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"}">${st.label}</button>
              `).join("")}
            </div>
          </div>` : ""}
        </div>`;
            }
          }).join("");
        }
        const hasPolicies = typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0;
        if (hasPolicies) {
          return `<div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
            <div class="font-black text-yellow-700 text-sm">? ï¸ ?ˆìš©??êµìœ¡? í˜• ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤</div>
            <div class="text-xs text-yellow-600 mt-1">ê´€ë¦¬ì?ê²Œ êµìœ¡ì§€???´ì˜ ê·œì¹™ ?¤ì •???”ì²­??ì£¼ì„¸??</div>
          </div>`;
        }
        const subtypes = s.purpose?.subtypes || null;
        if (!subtypes) return '<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3"><span class="text-accent text-xl">??/span> ?œì? ?„ë¡œ?¸ìŠ¤ê°€ ?ë™ ?ìš©?©ë‹ˆ??</div>';
        return subtypes.map(g => `
    <div class="mb-7">
      <div class="mb-3">
        <div class="text-xs font-black text-gray-700 flex items-center gap-2 mb-0.5"><span class="w-1.5 h-1.5 bg-accent rounded-full inline-block"></span>${g.group}</div>
        ${g.desc ? `<div class="text-[11px] text-gray-400 pl-3.5">${g.desc}</div>` : ""}
      </div>
      <div class="grid ${g.items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-3">
        ${g.items.map(i => `
        <button onclick="applyState.subType='${i.id}';renderApply()" class="p-4 rounded-xl border-2 text-sm font-bold text-left leading-snug transition ${s.subType === i.id ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${i.label}</button>`).join("")}
      </div>
    </div>`).join("");
      })()}
      <div class="flex justify-between mt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
        ${(() => {
          const tree2 = typeof getPolicyEduTree !== "undefined" ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget ? curBudget.account : null) : [];
          if (tree2.length > 0) {
            const selNode = tree2.find((n) => n.id === s.eduType);
            const isLeaf = selNode && (!selNode.subs || selNode.subs.length === 0);
            const canNext = s.eduType && (isLeaf || s.subType);
            return `<button onclick="applyNext()" ${!canNext ? "disabled" : ""}
              class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">?¤ìŒ ??/button>`;
          }
          const dis = s.purpose?.subtypes && !s.subType;
          return `<button onclick="applyNext()" ${dis ? "disabled" : ""}
            class="px-8 py-3 rounded-xl font-black text-sm transition ${dis ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">?¤ìŒ ??/button>`;
        })()}
      </div>
    `}
  </div>

  <!--Step 4: Detail-->
    <div class="card p-8 ${s.step === 4 ? "" : "hidden"}">
      <h2 class="text-lg font-black text-gray-800 mb-4">04. ?¸ë? ?•ë³´ ?…ë ¥</h2>

      <!-- ?´ì „ ?¨ê³„ ? íƒ ?”ì•½ ë°°ë„ˆ -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> ? ì²­ ?”ì•½
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Step 1 ?”ì•½ -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">??êµìœ¡ ëª©ì </div>
            <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ""} ${s.purpose?.label || "??}</div>
            ${
              s.subType
                ? (() => {
                    const g = s.purpose?.subtypes
                      ?.flatMap((g) => g.items)
                      .find((i) => i.id === s.subType);
                    return g
                      ? `<div class="text-[11px] text-gray-500 mt-0.5">??${g.label}</div>`
                      : "";
                  })()
                : ""
            }
          </div>
          <!-- Step 2 ?”ì•½ -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">???ˆì‚°</div>
            ${
              s.useBudget === false
                ? '<div class="font-black text-sm text-gray-500">?“ ?¨ìˆœ ?´ë ¥ ?±ë¡</div>'
                : `<div class="font-black text-sm text-gray-900">${curBudget ? curBudget.name : "??}</div>
               ${s.planId ? `<div class="text-[11px] text-blue-500 mt-0.5">?”— ?¨ì¼ ê³„íš ?°ë™??/div>` : ""}
               ${s.planIds?.length ? `<div class="text-[11px] text-violet-500 mt-0.5">?”— ë³µìˆ˜ ê³„íš ?°ë™??(${s.planIds.length}ê±?</div>` : ""}`
            }
          </div>
          <!-- Step 3 ?”ì•½ -->
          <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
            <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">??êµìœ¡? í˜•</div>
            ${
              s.subType
                ? (() => {
                    const item = s.purpose?.subtypes
                      ?.flatMap((g) => g.items)
                      .find((i) => i.id === s.subType);
                    const grp = s.purpose?.subtypes?.find((g) =>
                      g.items.some((i) => i.id === s.subType),
                    );
                    return `<div class="font-black text-sm text-gray-900">${item?.label || (typeof getEduTypeLabel !== "undefined" ? getEduTypeLabel(s.subType) : s.subType)}</div><div class="text-[11px] text-gray-400 mt-0.5">${grp?.group || ""}</div>`;
                  })()
                : s.eduType
                  ? `<div class="font-black text-sm text-gray-900">${typeof getEduTypeLabel !== "undefined" ? getEduTypeLabel(s.eduType) : s.eduType}</div><div class="text-[11px] text-blue-400 mt-0.5">ê³„íš?ì„œ ?ë™ ?¤ì •??/div>`
                  : '<div class="text-sm text-gray-400">??/div>'
            }
          </div>
        </div>
      </div>

      <div class="space-y-5">
        ${(() => {
          // BO ?‘ì‹??ë¡œë“œ??ê²½ìš° ???™ì  ?Œë”ë§?
          if (
            s.formTemplate &&
            s.formTemplate.fields &&
            s.formTemplate.fields.length > 0
          ) {
            const dynamicHtml =
              typeof renderDynamicFormFields === "function"
                ? renderDynamicFormFields(
                    s.formTemplate.fields,
                    s,
                    "applyState",
                  )
                : "";
            if (dynamicHtml) {
              const tplBadge = s.formTemplate.name
                ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">?“‹ ?‘ì‹: ${s.formTemplate.name}</div>`
                : "";
              return tplBadge + dynamicHtml;
            }
          }
          if (s.formTemplateLoading) {
            return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">??/div>?‘ì‹ ë¡œë”© ì¤?..</div>`;
          }
          // ?€?€ Fallback: ?‘ì‹ ë¯¸ì„¤???€?€
          return `
        <!-- Region toggle -->
        <div class="inline-flex bg-gray-100 rounded-xl p-1">
          <button onclick="applyState.region='domestic';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "domestic" ? "bg-white text-accent shadow" : " text-gray-500"}">?—º êµ?‚´</button>
          <button onclick="applyState.region='overseas';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "overseas" ? "bg-white text-accent shadow" : "text-gray-500"}">?Œ ?´ì™¸</button>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ê³¼ì •ëª?<span class="text-red-500">*</span></label>
          <input type="text" value="${s.title}" oninput="applyState.title=this.value" placeholder="êµìœ¡/?¸ë????ê²©ì¦???ê³µì‹ ëª…ì¹­" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">?œì‘??/label>
            <input type="date" value="${s.startDate}" oninput="applyState.startDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ì¢…ë£Œ??/label>
            <input type="date" value="${s.endDate}" oninput="applyState.endDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ì´??™ìŠµ?œê°„ (H)</label>
          <input type="number" value="${s.hours}" oninput="applyState.hours=this.value" placeholder="0" class="w-40 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">?™ìŠµ ?´ìš© <span class="text-red-500">*</span></label>
          <textarea oninput="applyState.content=this.value" rows="3" placeholder="?™ìŠµ ëª©í‘œ, ì£¼ìš” ì»¤ë¦¬?˜ëŸ¼ ë°??œìš© ë°©ì•ˆ???…ë ¥?˜ì„¸??" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
        </div>`;
        })()}

        <!-- Cost section -->
        ${
          s.useBudget === true
            ? `
      <div class="border-t border-gray-100 pt-5">
        ${
          curBudget?.account === "?°êµ¬?¬ì"
            ? `
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">R&D ì´??¬ìê¸ˆì•¡</label>
        <div class="relative max-w-sm">
          <input type="number" value="${s.rndTotal}" oninput="applyState.rndTotal=this.value;renderApply()" class="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-5 py-5 font-black text-2xl text-brand focus:border-accent focus:bg-white transition pr-16"/>
          <span class="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-accent">??/span>
        </div>`
            : `
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-black text-gray-700 uppercase tracking-wide">?“‹ ?¸ë??°ì¶œê·¼ê±° <span style="font-size:10px;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:5px;font-weight:800">?“š ì§ì ‘?™ìŠµ??(?¨ê? Ã— ?˜ëŸ‰)</span></h4>
          <button onclick="addExpRow()" class="text-xs font-black text-accent border-2 border-accent px-4 py-2 rounded-xl hover:bg-blue-50 transition">+ ??ª© ì¶”ê?</button>
        </div>
        <div class="rounded-2xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50"><tr class="text-xs font-black text-gray-500 uppercase">
              <th class="px-4 py-3 text-left">??ª©</th><th class="px-4 py-3 text-right">?¨ê?</th><th class="px-4 py-3 text-center w-20">?˜ëŸ‰(ëª?</th><th class="px-4 py-3 text-right">?Œê³„</th><th class="px-4 py-3 text-left">ë¹„ê³ </th><th class="px-4 py-3 w-10"></th>
            </tr></thead>
            <tbody class="divide-y divide-gray-100">
              ${s.expenses
                .map(
                  (e, i) => {
                    const slItems = (typeof _getCalcGroundsForType === "function")
                      ? _getCalcGroundsForType("self_learning", currentPersona?.vorgTemplateId || null, s.region === "overseas")
                      : [];
                    const itemOpts = slItems.length > 0
                      ? slItems.map(g => `<option value="${g.id}" data-price="${g.unitPrice}" ${(e.itemId||e.type)===g.id||(e.type===g.name)?'selected':''}>${g.name}</option>`).join('')
                      : ['êµìœ¡ë¹??±ë¡ë¹?,'êµë³´?¬ë¹„','?œí—˜?‘ì‹œë£?,'??³µë£?,'?™ë°•ë¹?].map(n=>`<option ${e.type===n?'selected':''}>${n}</option>`).join('');
                    return `
              <tr>
                <td class="px-4 py-3">
                  <select onchange="_applyExpTypeChange(this,${i})" class="bg-transparent text-sm font-bold text-gray-700 outline-none w-full">
                    ${itemOpts}
                  </select>
                </td>
                <td class="px-4 py-3"><input type="number" value="${e.price}" oninput="applyState.expenses[${i}].price=this.value;renderApply()" class="w-full text-right bg-transparent font-black text-gray-900 outline-none text-base"/></td>
                <td class="px-4 py-3"><input type="number" value="${e.qty}" oninput="applyState.expenses[${i}].qty=this.value;renderApply()" class="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 font-black text-accent outline-none"/></td>
                <td class="px-4 py-3 text-right font-black text-gray-900">${fmt(Number(e.price) * Number(e.qty))}</td>
                <td class="px-4 py-3"><input type="text" value="${e.note || ""}" oninput="applyState.expenses[${i}].note=this.value" placeholder="ë¹„ê³ " class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-accent transition min-w-[120px]"/></td>
                <td class="px-4 py-3 text-center"><button onclick="removeExpRow(${i})" class="text-gray-300 hover:text-red-500 transition text-lg">??/button></td>
              </tr>`;
                  }
                )
                .join("")}
            </tbody>
            <tfoot class="bg-brand/5 border-t-2 border-brand">
              <tr><td colspan="4" class="px-4 py-3 font-black text-gray-500 text-xs uppercase">?©ê³„</td><td class="px-4 py-3 text-right font-black text-2xl text-accent">${fmt(totalExp)}??/td><td></td></tr>
            </tfoot>
          </table>
        </div>`
        }
      </div>

      <!-- Final summary card -->
      <div class="mt-6 bg-gray-950 rounded-3xl p-8 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 text-8xl opacity-5 translate-x-6 -translate-y-3">?“</div>
        <div class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">${s.region === "overseas" ? "?Œ ?´ì™¸" : "?—º êµ?‚´"} ìµœì¢… ì§‘í–‰ ê¸ˆì•¡</div>
        <div class="text-5xl font-black tracking-tight mb-4">${fmt(totalAmt)}<span class="text-lg text-gray-500 ml-2 font-normal">??/span></div>
        ${
          curBudget
            ? `
        <div class="flex items-center gap-3 ${over ? "text-red-400" : "text-green-400"}">
          <span class="text-lg">${over ? "? ï¸" : "??}</span>
          <span class="text-sm font-black">${over ? "?”ì•¡ ë¶€ì¡???ì§‘í–‰ ë¶ˆê?" : "?”ì•¡ ??ì§‘í–‰ ê°€??}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">${curBudget.name} ?”ì•¡: ${fmt(curBudget.balance - curBudget.used)}??/div>`
            : ""
        }
      </div>`
            : ""
        }
      </div>

      <div class="flex justify-between mt-8 border-t border-gray-100 pt-6">
        <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
        <div class="flex gap-3">
          <button onclick="saveApplyDraft()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition">?’¾ ?„ì‹œ?€??/button>
          <button onclick="submitApply()" ${over ? "disabled" : ""}
            class="px-10 py-3 rounded-xl font-black text-sm transition shadow-lg ${over ? "bg-gray-300 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900"}">
            ? ì²­???œì¶œ ??
          </button>
        </div>
      </div>
    </div>
  
  ${
    s.showMultiPlanModal
      ? `
  <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center fade-in">
    <div class="bg-white rounded-2xl w-[500px] shadow-2xl p-6">
      <h3 class="text-lg font-black mb-4">?´ì˜ ?ˆì‚°: ë³µìˆ˜ ê³„íš ? íƒ</h3>
      <div class="space-y-2 max-h-[300px] overflow-y-auto mb-4 p-1">
        ${operPlans
          .map(
            (p) => `
        <label class="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition ${s.planIds?.includes(p.id) ? "border-violet-500 bg-violet-50" : "border-gray-200"}">
          <input type="checkbox" value="${p.id}" ${s.planIds?.includes(p.id) ? "checked" : ""} onchange="toggleOperPlan('${p.id}')" class="w-4 h-4 text-violet-600 rounded">
          <div>
            <div class="font-bold text-sm text-gray-900">[${p.id}] ${p.title}</div>
            <div class="text-xs text-gray-500">?ˆì‚° ?¸ì„±ê¸ˆì•¡: ${fmt(p.amount)}??/div>
          </div>
        </label>
        `,
          )
          .join("")}
      </div>
      <div class="flex justify-end gap-2">
        <button onclick="applyState.showMultiPlanModal=false;renderApply()" class="px-6 py-2 bg-brand text-white font-bold rounded-xl hover:bg-blue-900 transition">?•ì¸</button>
      </div>
    </div>
  </div>`
      : ""
  }
</div > `;
}

// ?€?€?€ APPLY FORM HELPERS ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

function selectPurpose(id) {
  // ?•ì±… ê¸°ë°˜ ëª©ì  ëª©ë¡?ì„œ ?°ì„  ?ìƒ‰ ??PURPOSES ?´ë°±
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
    // ??ê³„íš ?°ì´???ë™ ?°ë™
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
    type: firstItem?.name || "ì§ì ‘?™ìŠµ??,
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
  // ?¨ê????¤ì •?˜ì–´ ?ˆìœ¼ë©??ë™ ?…ë ¥ (ê¸°ì¡´ ??ª©???´ë? ?¨ê?ê°€ ?ˆìœ¼ë©?ë¬´ì‹œ ???¨ê? ?Œê¸‰ ?ìš© ?ˆí•¨)
  if (price > 0 && !applyState.expenses[i].price) {
    applyState.expenses[i].price = price;
  }
  renderApply();
}
async function submitApply() {
  if (!applyState.eduName && !applyState.title) {
    alert("êµìœ¡ëª…ì„ ?…ë ¥?´ì£¼?¸ìš”.");
    return;
  }
  // ?€?€ ?™ì  ?‘ì‹ ?„ìˆ˜ ?„ë“œ ê²€ì¦??€?€
  if (applyState.formTemplate && typeof validateRequiredFields === "function") {
    const result = validateRequiredFields(applyState.formTemplate, applyState);
    if (!result.valid) {
      alert("? ï¸ ?„ìˆ˜ ??ª©???…ë ¥?´ì£¼?¸ìš”:\n\n??" + result.errors.join("\n??"));
      return;
    }
  }
  applyState.confirmMode = true;
  renderApply();
}

// ?€?€?€ ? ì²­ ?‘ì„±?•ì¸ ?”ë©´ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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

  // ?¤ì¤‘ ê³„íš ?•ë³´ ê°€?¸ì˜¤ê¸?
  const planIds = s.planIds && s.planIds.length > 0 ? s.planIds : (s.planId ? [s.planId] : []);
  const plansText = planIds.map(pid => {
    const pl = (_plansDbCache || []).find(p => p.id === pid);
    return pl ? pl.edu_name || pl.title : pid;
  }).join('<br>');

  document.getElementById("page-apply").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">???‘ì„± ?•ì¸</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">êµìœ¡? ì²­ ?œì¶œ ???•ì¸</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">?„ë˜ ?´ìš©???•ì¸?????•ì • ?œì¶œ?˜ë©´ ?ì‹  ë¬¸ì„œê°€ ?ë™ ?ì„±?©ë‹ˆ??</p>
      </div>
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:120px">êµìœ¡ëª?/td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${s.eduName || s.title || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">?°ê²°??êµìœ¡ê³„íš</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${plansText || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">?ˆì‚°ê³„ì •</td>
            <td style="padding:12px 0;color:#374151">${accountCode || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">? ì²­ ê¸ˆì•¡</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${totalExp.toLocaleString()}??/td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">êµìœ¡?±ë¡ë¹??´ì—­</td>
            <td style="padding:12px 0;color:#374151">${s.expenses.map((e) => e.type + " " + Number(e.price).toLocaleString() + "??x" + e.qty).join(", ") || "-"}</td>
          </tr>
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border-radius:10px;border:1.5px solid #FDE68A;font-size:12px;color:#92400E">
          ? ï¸ <strong>?•ì • ?œì¶œ</strong> ???ì‹  ë¬¸ì„œê°€ ?ë™ ?ì„±?˜ì–´ ?€??ê²°ì¬?¨ìœ¼ë¡??„ë‹¬?©ë‹ˆ??<br>
          ê²°ì¬ ì§„í–‰ ì¤?ì·¨ì†Œê°€ ?„ìš”?˜ë©´ ê²°ì¬????<strong>?ì‹  ?Œìˆ˜</strong> ë²„íŠ¼???´ìš©?˜ì„¸??
        </div>
      </div>
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6;flex-wrap:wrap">
        <button onclick="applyState.confirmMode=false;renderApply()"
          style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">
          ???˜ì •?˜ê¸°
        </button>
        <!-- UI-1: ?€?¥ì™„ë£?saved) ë²„íŠ¼ ?? ?€???€???ì‹  ?ëŠ” ê²°ì¬???ì‹  ??ë³´ê? -->
        <button onclick="saveApplyAsReady()"
          style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #059669;background:white;color:#059669;cursor:pointer;transition:all .15s"
          onmouseover="this.style.background='#F0FDF4'" onmouseout="this.style.background='white'">
          ?“¤ ?€?¥ì™„ë£Œë¡œ ë³´ê?
        </button>
        <button onclick="confirmApply()"
          style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          ???•ì • ?œì¶œ
        </button>
      </div>

    </div>
  </div>`;
}

// ?€?€?€ ? ì²­ ?•ì • ?œì¶œ (Edge Function ê²½ìœ  ???ˆì‚° ?¸ëœ??…˜) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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


  // ??Phase D: êµìœ¡? ì²­ ???µì¥ ?”ì•¡ ê²€ì¦?
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
          const ok = confirm(`? ï¸ ?€ ?µì¥ ?”ì•¡??ë¶€ì¡±í•©?ˆë‹¤.\n\n? ì²­ ê¸ˆì•¡: ${totalExp.toLocaleString()}??n?µì¥ ?”ì•¡: ${totalBal.toLocaleString()}??në¶€ì¡±ì•¡: ${(totalExp - totalBal).toLocaleString()}??n\nê·¸ë˜??? ì²­?˜ì‹œê² ìŠµ?ˆê¹Œ?`);
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
      // Edge Function ê²½ìœ : ?ˆì‚° ?”ì•¡ ì²´í¬ + ? ì²­ ?€?¥ì„ ?ì???¸ëœ??…˜?¼ë¡œ ì²˜ë¦¬
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
          eduName: applyState.eduName || applyState.title || "êµìœ¡? ì²­",
          eduType: applyState.eduType || applyState.eduSubType || null,
          amount: totalExp,
          status: "submitted",
          planId: applyState.planId || null,
          policyId: applyState.policyId || null,
          budgetLinked: svc?.budgetLinked !== false,
          // ?„ë“œ ?œì???(field_standardization.md A-18~A-20)
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
      console.log("[confirmApply] Edge Function ê²°ê³¼:", result);
      if (result.budget_checked) {
        console.log(
          `  ?ˆì‚° ?”ì•¡: ${result.available_before?.toLocaleString()} ??${result.available_after?.toLocaleString()}??,
        );
      }
    } else {
      // Fallback: ì§ì ‘ DB upsert (Edge Function ë¯¸ì‚¬??
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
          edu_name: applyState.eduName || applyState.title || "êµìœ¡? ì²­",
          edu_type: applyState.eduType || applyState.eduSubType || null,
          amount: totalExp,
          status: "submitted",
          policy_id: applyState.policyId || null,
          form_template_id: applyState.formTemplate?.id || null,
          form_version: applyState.formTemplate?.version || null,
          // ?„ë“œ ?œì???(field_standardization.md A-18~A-20)
          education_format: applyState.educationFormat || applyState.education_format || null,
          is_overseas: applyState.isOverseas === true || applyState.is_overseas === true || false,
          overseas_country: applyState.overseasCountry || applyState.overseas_country || null,
          detail: {
            purpose: applyState.purpose?.id || null,
            expenses: applyState.expenses,
            courseSessionLinks: applyState.courseSessionLinks || [],
            planIds: applyState.planIds || [],
            _form_snapshot: _fSnap,
          },
        };
        const { error } = await sb
          .from("applications")
          .upsert(row, { onConflict: "id" });
        if (error) throw error;
      }
    }

    // ??application_plan_items (?¤ì¤‘ ê³„íš ?©ì‚° ? ì²­ ë§¤í•‘)
    const sb = typeof getSB === "function" ? getSB() : null;
    if (sb) {
      const planIds = applyState.planIds && applyState.planIds.length > 0 ? applyState.planIds : (applyState.planId ? [applyState.planId] : []);
      if (planIds.length > 0) {
        const planItems = planIds.map((pid, idx) => {
          const pl = (_plansDbCache || []).find((p) => p.id === pid) || {};
          return {
            application_id: appId,
            plan_id: pid,
            course_name: pl.edu_name || pl.title || null,
            institution_name: pl.detail?.institution || null,
            start_date: pl.detail?.startDate || null,
            end_date: pl.detail?.endDate || null,
            edu_type: pl.edu_type || null,
            subtotal: pl.amount || 0,
            sort_order: idx
          };
        });
        await sb.from("application_plan_items").delete().eq("application_id", appId);
        await sb.from("application_plan_items").insert(planItems);
      }
    }

  } catch (err) {
    alert("?œì¶œ ?¤íŒ¨: " + _friendlyApplyError(err.message));
    return;
  }

  // [S-6] submission_documents + submission_items ?ë™ ?ì„±
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
        title: `${applyState.eduName || applyState.title || 'êµìœ¡? ì²­'} ?ì‹ `,
        account_code: curBudget2?.accountCode || null,
        total_amount: totalExp2,
        status: 'submitted',
        submitted_at: now,
      };
      await sb2.from('submission_documents').insert(docRow).catch(e => console.warn('[confirmApply] submission_documents ?ì„± ?¤íŒ¨:', e.message));
      const itemRow = {
        submission_id: docId,
        item_type: 'application',
        item_id: appId,
        item_title: applyState.eduName || applyState.title || 'êµìœ¡? ì²­',
        item_amount: totalExp2,
        account_code: curBudget2?.accountCode || null,
        policy_id: applyState.policyId || null,
        item_status: 'pending',
        sort_order: 0,
      };
      await sb2.from('submission_items').insert(itemRow).catch(e => console.warn('[confirmApply] submission_items ?ì„± ?¤íŒ¨:', e.message));
      console.log('[confirmApply] ?ì‹  ë¬¸ì„œ ?ë™ ?ì„±:', docId);
    }
  } catch (sdErr) {
    console.warn('[confirmApply] ?ì‹  ë¬¸ì„œ ?ì„± ?¤ë¥˜ (ë¹„ì¹˜ëª…ì ):', sdErr.message);
  }

  alert(
    "??êµìœ¡? ì²­?œê? ?œì¶œ?˜ì—ˆ?µë‹ˆ??\n\n?ì‹  ë¬¸ì„œê°€ ?ë™ ?ì„±?˜ì–´ ?€??ê²°ì¬?¨ìœ¼ë¡??„ë‹¬?©ë‹ˆ??",
  );
  applyState = resetApplyState();
  applyViewMode = "list";
  _appsDbLoaded = false;
  navigate("history");
}

// ?€?€?€ ? ì²­ ?„ì‹œ?€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function saveApplyDraft() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB ?°ê²° ?¤íŒ¨");
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
      edu_name: applyState.eduName || applyState.title || "êµìœ¡? ì²­",
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
        planIds: applyState.planIds || [],
        _form_snapshot: _fSnapDraft,
      },
    };
    const { error } = await sb
      .from("applications")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    
    // ??application_plan_items (?„ì‹œ?€????ë§¤í•‘ ë³´ì¡´)
    const planIds = applyState.planIds && applyState.planIds.length > 0 ? applyState.planIds : (applyState.planId ? [applyState.planId] : []);
    if (planIds.length > 0) {
      const planItems = planIds.map((pid, idx) => {
        const pl = (_plansDbCache || []).find((p) => p.id === pid) || {};
        return {
          application_id: appId,
          plan_id: pid,
          course_name: pl.edu_name || pl.title || null,
          institution_name: pl.detail?.institution || null,
          start_date: pl.detail?.startDate || null,
          end_date: pl.detail?.endDate || null,
          edu_type: pl.edu_type || null,
          subtotal: pl.amount || 0,
          sort_order: idx
        };
      });
      await sb.from("application_plan_items").delete().eq("application_id", appId);
      await sb.from("application_plan_items").insert(planItems);
    }
    applyState.editId = appId;
    alert("?’¾ ?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.");
  } catch (err) {
    alert("?„ì‹œ?€???¤íŒ¨: " + err.message);
  }
}

// ?€?€?€ ? ì²­ ?Œìˆ˜/ì·¨ì†Œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function cancelApply(appId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  let curStatus = null;
  if (sb) {
    try {
      const { data } = await sb
        .from("applications")
        .select("status")
        .eq("id", appId)
        .single();
      curStatus = data?.status;
      if (curStatus === "approved") {
        alert("? ï¸ ?´ë? ?¹ì¸??? ì²­?€ ?ìœ„ ?¹ì¸?ê? ì·¨ì†Œ?´ì•¼ ?©ë‹ˆ??");
        return;
      }
      if (curStatus === "draft") {
        alert("?´ë? ?„ì‹œ?€???íƒœ?…ë‹ˆ??");
        return;
      }
      if (curStatus === "in_review") {
        alert("? ï¸ ê²°ì¬ê°€ ?´ë? ì§„í–‰ ì¤‘ì…?ˆë‹¤.\n?ìœ„ ê²°ì¬?ì—ê²?ë°˜ë ¤ë¥??”ì²­?˜ì„¸??");
        return;
      }
    } catch (e) { /* pass */ }
  }

  // [A-1] saved ??draft ë³µê? (?ì‹  ??ì·¨ì†Œ)
  if (curStatus === "saved") {
    if (!confirm("?€?¥ì™„ë£??íƒœ??? ì²­???„ì‹œ?€?¥ìœ¼ë¡??˜ëŒë¦¬ì‹œê² ìŠµ?ˆê¹Œ?")) return;
    if (sb) {
      try {
        const { error } = await sb.from("applications").update({ status: "draft" }).eq("id", appId);
        if (error) throw error;
        alert("?„ì‹œ?€???íƒœë¡??˜ëŒ?¸ìŠµ?ˆë‹¤. ?˜ì • ???¤ì‹œ ?€?¥í•  ???ˆìŠµ?ˆë‹¤.");
      } catch (err) {
        alert("?¤íŒ¨: " + _friendlyApplyError(err.message));
        return;
      }
    }
    _appsDbLoaded = false; _dbMyApps = [];
    _renderApplyList();
    return;
  }

  // [A-1] submitted ??recalled ??saved ë³µê? (?ì‹  ???Œìˆ˜)
  if (!confirm("??êµìœ¡? ì²­???Œìˆ˜?˜ì‹œê² ìŠµ?ˆê¹Œ?\n?Œìˆ˜ ???€?¥ì™„ë£??íƒœ?ì„œ ?˜ì •?˜ì—¬ ?¬ìƒ???????ˆìŠµ?ˆë‹¤."))
    return;
  if (sb) {
    try {
      const { error } = await sb
        .from("applications")
        .update({ status: "saved" })  // [A-1] recalled ?€??saved ë³µê?ë¡?ì¦‰ì‹œ ?¬ìƒ??ê°€??
        .eq("id", appId);
      if (error) throw error;
      alert("? ì²­???Œìˆ˜?˜ì—ˆ?µë‹ˆ??\n?€?¥ì™„ë£??íƒœë¡?ë³´ê??©ë‹ˆ?? ?˜ì • ???¤ì‹œ ?ì‹ ?????ˆìŠµ?ˆë‹¤.");
    } catch (err) {
      alert("?Œìˆ˜ ?¤íŒ¨: " + _friendlyApplyError(err.message));
      return;
    }
  }
  _appsDbLoaded = false;
  _dbMyApps = [];
  _renderApplyList();
}

// ?€?€?€ ?íƒœ ?„ì´ ?ëŸ¬ ?œêµ­??ë³€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _friendlyApplyError(msg) {
  if (!msg) return "?????†ëŠ” ?ëŸ¬";
  const m = msg.match(/Invalid status transition:\s*(\w+)\s*??s*(\w+)/);
  if (!m) return msg;
  const labels = {
    draft: "?‘ì„±ì¤?,
    pending: "ê²°ì¬?€ê¸?,
    approved: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
    completed: "?„ë£Œ",
  };
  return `?„ì¬ '${labels[m[1]] || m[1]}' ?íƒœ?ì„œ '${labels[m[2]] || m[2]}'(??ë¡?ë³€ê²½í•  ???†ìŠµ?ˆë‹¤.`;
}

// ?€?€?€ ? ì²­ ?„ì‹œ?€???´ì–´?°ê¸°/?? œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
      alert("?„ì‹œ?€??ê±´ì„ ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.");
      return;
    }
    applyState = resetApplyState();
    applyState.editId = data.id;
    applyState.eduName = data.edu_name || "";
    applyState.title = data.edu_name || "";
    applyState.eduType = data.edu_type || "";
    applyState.budgetId = data.detail?.budgetId || "";
    applyState.expenses = data.detail?.expenses || [
      { id: 1, type: "êµìœ¡ë¹??±ë¡ë¹?, price: 0, qty: 1 },
    ];
    applyState.policyId = data.policy_id || null;
    if (data.detail?.purpose) applyState.purpose = { id: data.detail.purpose };
    applyState.planIds = data.detail?.planIds || [];
    if (!applyState.planIds.length && data.plan_id) applyState.planIds = [data.plan_id];
    applyState.planId = applyState.planIds[0] || "";
    applyState.step = 3;
    applyViewMode = "form";
    renderApply();
  } catch (err) {
    alert("ë¶ˆëŸ¬?¤ê¸° ?¤íŒ¨: " + err.message);
  }
}

async function deleteApplyDraft(appId) {
  if (!confirm("?„ì‹œ?€?¥ëœ ? ì²­???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?")) return;
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

// ?€?€?€ DB ?íƒœ ë§¤í•‘ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _mapAppDbStatus(s) {
  const m = {
    draft: "?‘ì„±ì¤?,
    saved: "?€?¥ì™„ë£?,         // fo_submission_approval.md
    pending: "?¹ì¸?€ê¸?,
    submitted: "ê²°ì¬?€ê¸?,     // fo_submission_approval.md (pending ?€ì²?
    in_review: "ê²°ì¬ì§„í–‰ì¤?,   // fo_submission_approval.md
    recalled: "?Œìˆ˜??,        // fo_submission_approval.md
    approved: "?¹ì¸?„ë£Œ",
    completed: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
    result_pending: "BO ê²€? ì¤‘",
  };
  return m[s] || s || "?¹ì¸?€ê¸?;
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

// ?€?€ êµìœ¡?´ë‹¹???ˆì‚° ê³„ì • ? íƒ (apply.js) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function selectApplyBudget(budgetId) {
  applyState.budgetId = budgetId;
  applyState.useBudget = true;
  applyState.planId = "";
  applyState.planIds = [];
  const b = (currentPersona.budgets || []).find((b) => b.id === budgetId);
  applyState.applyMode = "holding"; // ?´ì˜ê³„ì • = ê³„íš ? ì‹ ì²?
  renderApply();
}

// ?€?€?€ ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ ?„ìš©: ?ˆì‚° ? íƒ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function selectBudgetChoice(choice) {
  applyState.budgetChoice = choice;
  applyState.budgetId = "";
  applyState.planId = "";
  applyState.planIds = [];
  applyState.serviceId = "";

  // ?•ì±… ê¸°ë°˜: ? íƒ???ˆì‚°??ë§¤ì¹­?˜ëŠ” ?•ì±…??apply_modeë¡?ê²°ì •
  const budgets = currentPersona.budgets || [];
  if (choice === "none") {
    applyState.applyMode = null;
    applyState.useBudget = false;
  } else if (choice === "rnd") {
    applyState.applyMode = "holding";
    applyState.useBudget = true;
    const b = budgets.find(
      (b) => (b.accountCode || "").includes("RND") || b.account === "?°êµ¬?¬ì",
    );
    if (b) applyState.budgetId = b.id;
  } else if (choice === "general") {
    // ?•ì±…?ì„œ applyMode ?•ì¸, ê¸°ë³¸ reimbursement
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
    // ???µì‹¬ ?˜ì •: purpose??ë§ëŠ” ?ˆì‚° ê³„ì •(ì°¸ê?ê³„ì •)??? íƒ
    // ?´ì „: budgets[0]??ë¬´ì¡°ê±?? íƒ ???´ì˜/ê¸°í? ê³„ì •??ë¨¼ì? ?¤ë©´ Step3?ì„œ curBudget=null
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
    // ê¸°í? ? íƒì§€: ?ˆì‚° ëª©ë¡?ì„œ account name ë§¤ì¹­
    applyState.applyMode = "holding";
    applyState.useBudget = true;
    const b = budgets.find((b) => b.id === choice || b.account === choice);
    if (b) applyState.budgetId = b.id;
  }
  renderApply();
}

function selectRndPlan(id) {
  // ?¤ê±´ ? íƒ ëª¨ë“œ: planIds ? ê?
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx > -1) {
    applyState.planIds.splice(idx, 1);
  } else {
    applyState.planIds.push(id);
  }
  // ì²?ë²ˆì§¸ ? íƒ??planIdë¡??¤ì • (?˜ìœ„ ?¸í™˜)
  applyState.planId = applyState.planIds[0] || "";
  // budgetId ?ë™ ?¤ì •
  const pl = _dbApprovedPlans.find((p) => p.id === applyState.planId);
  if (pl) applyState.budgetId = pl.budgetId;
  renderApply();
}

// R&D êµìœ¡ê³„íš ? íƒ UI (DB ê¸°ë°˜, ?¤ê±´ ? íƒ ì§€??
// ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??
// ???µí•© êµìœ¡ê³„íš ? íƒ ?ì—… ì»´í¬?ŒíŠ¸ (R&D + êµìœ¡?´ì˜ ?¨í„´A ê³µí†µ ?¬ìš©)
// ?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•?â•??
function _getPlansForPicker(s, mode) {
  if (mode === "rnd") {
    return _dbApprovedPlans.filter(
      (p) => (p.account || "").includes("RND") || p.account === "?°êµ¬?¬ì",
    );
  }
  // êµìœ¡?´ì˜: ê°™ì? ?ˆì‚°ê³„ì •??ëª¨ë“  ?¹ì¸??êµìœ¡ê³„íš (?€ ê³µìœ )
  return _dbApprovedPlans.filter((p) => p.budgetId === s.budgetId);
}

function _renderPlanPickerSection(s, mode) {
  const plans = _getPlansForPicker(s, mode);
  const isRnd = mode === "rnd";
  const color = isRnd ? "#7C3AED" : "#1D4ED8";
  const bgLight = isRnd ? "#F5F3FF" : "#EFF6FF";
  const borderLight = isRnd ? "#DDD6FE" : "#BFDBFE";
  const icon = isRnd ? "?”¬" : "?“‹";
  const label = isRnd ? "R&D êµìœ¡ê³„íš" : "êµìœ¡ê³„íš";

  if (plans.length === 0) {
    return `
    <div style="margin-top:16px;padding:16px 20px;border-radius:12px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:13px;font-weight:900;color:#EF4444;margin-bottom:4px">? ï¸ ?¹ì¸??${label}???†ìŠµ?ˆë‹¤</div>
      <div style="font-size:12px;color:#9CA3AF;line-height:1.6">
        ${isRnd ? "R&D êµìœ¡?ˆì‚°" : "???ˆì‚° ê³„ì •(?¨í„´A)"}???¬ìš©?˜ë ¤ë©??¬ì „??êµìœ¡ê³„íš???˜ë¦½?˜ê³  ?¹ì¸??ë°›ì•„???©ë‹ˆ??<br>
        êµìœ¡ê³„íš ?”ë©´?ì„œ ë¨¼ì? ê³„íš???˜ë¦½???? ê²°ì¬ ?¹ì¸??ë°›ìœ¼?¸ìš”.
      </div>
      <div style="margin-top:12px">
        <a href="#" onclick="navigate('plans');return false"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:${color};color:white;font-size:12px;font-weight:900;text-decoration:none">
          ?“‹ êµìœ¡ê³„íš ?˜ë¦½ ë°”ë¡œê°€ê¸?
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
      <div style="font-size:13px;font-weight:900;color:${color}">${icon} ?¹ì¸??${label} ? íƒ <span style="font-size:10px;font-weight:700;color:#9CA3AF">(${plans.length}ê±?</span></div>
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
          <div style="font-size:10px;color:#6B7280">?“… ${p.date || "-"} Â· ?’° ?ˆì‚° ${(p.amount || 0).toLocaleString()}??Â· ???”ì•¡ ${balance.toLocaleString()}??/div>
        </div>
        <button onclick="_removePlanFromSelection('${id}');event.stopPropagation()" style="border:none;background:#FEE2E2;color:#DC2626;font-size:10px;font-weight:900;padding:3px 8px;border-radius:6px;cursor:pointer">??/button>
      </div>`;
        })
        .join("")}
    </div>
    <div style="padding:8px 14px;background:${color}15;border-radius:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:12px;font-weight:800;color:${color}">?“‹ ? íƒ??êµìœ¡ê³„íš ${selected.length}ê±?/div>
      <div style="font-size:14px;font-weight:900;color:${color}">${totalAmt.toLocaleString()}??/div>
    </div>`
        : `
    <div style="padding:20px;text-align:center;background:white;border-radius:10px;border:2px dashed ${borderLight};margin-bottom:12px">
      <div style="font-size:24px;margin-bottom:6px">?“­</div>
      <div style="font-size:12px;font-weight:700;color:#6B7280">êµìœ¡ê³„íš??? íƒ?˜ì„¸??/div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:2px">?„ë˜ ë²„íŠ¼???ŒëŸ¬ ?¹ì¸??êµìœ¡ê³„íš??? íƒ?????ˆìŠµ?ˆë‹¤</div>
    </div>`
    }
    <button onclick="_openPlanPickerModal('${mode}')" style="width:100%;padding:12px;border-radius:10px;border:2px solid ${color};background:white;color:${color};font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .15s"
      onmouseover="this.style.background='${bgLight}'" onmouseout="this.style.background='white'">
      ${icon} ${selected.length > 0 ? "êµìœ¡ê³„íš ë³€ê²?ì¶”ê?" : "êµìœ¡ê³„íš ? íƒ?˜ê¸°"}
    </button>
    <div style="margin-top:10px;padding:8px 12px;background:${color}10;border-radius:8px;font-size:11px;color:${color};font-weight:700">
      ?’¡ êµìœ¡ê³„íš??êµìœ¡ ? í˜•???¬í•¨?˜ì–´ ?ˆì–´ ?¤ìŒ ?¨ê³„?ì„œ ? í˜•??ë³„ë„ë¡?? íƒ?˜ì? ?Šì•„???©ë‹ˆ??
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
  const icon = isRnd ? "?”¬" : "?“‹";
  const label = isRnd ? "R&D êµìœ¡ê³„íš" : "êµìœ¡ê³„íš";

  const totalAmt = tempIds.reduce((sum, id) => {
    const p = plans.find((x) => x.id === id);
    return sum + (p ? p.amount || 0 : 0);
  }, 0);

  // ?„ì¬ ? íƒ??ê³„íš?¤ì˜ êµìœ¡? í˜• ?ë³„ (ë³µìˆ˜? íƒ ?œí•œ??
  const selectedType = (() => {
    if (tempIds.length === 0) return null;
    const first = plans.find((p) => p.id === tempIds[0]);
    return first?.edu_type || null;
  })();
  const eduTypeLabel = (t) => {
    const map = {
      elearning: "?´ëŸ¬??,
      seminar: "?¸ë???,
      class: "ì§‘í•©",
      conf: "ì»¨í¼?°ìŠ¤",
      book: "?„ì„œêµ¬ì…",
      cert: "?ê²©ì¦?,
      lang: "?´í•™",
      live: "?¼ì´ë¸?,
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
        ${active ? '<span style="color:white;font-size:12px;font-weight:900">??/span>' : ""}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:${active ? color : "#111827"};margin-bottom:3px;display:flex;align-items:center;gap:6px">
          ${p.title}
          ${pType ? `<span style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:4px;background:#EFF6FF;color:#1D4ED8">${eduTypeLabel(pType)}</span>` : ""}
          ${typeof getTenantBadgeHtml === "function" ? getTenantBadgeHtml(p.tenantId, currentPersona.tenantId) : ""}
          ${pExpired ? '<span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:#FEE2E2;color:#DC2626">ê¸°ê°„ë§Œë£Œ</span>' : ""}
          ${isTypeMismatch ? '<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:#F3F4F6;color:#9CA3AF">? í˜• ?¤ë¦„</span>' : ""}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          ${p.applicantName && p.tenantId !== currentPersona.tenantId ? `<span>?‘¤ ${p.applicantName}</span>` : ""}
          <span>?“… ${p.date || "-"}</span>
          <span>?’° ?ˆì‚° ${(p.amount || 0).toLocaleString()}??/span>
          <span style="color:${isLow ? "#DC2626" : "#059669"}">${isLow ? "? ï¸ ?”ì•¡ ë¶€ì¡? : "???”ì•¡ " + balance.toLocaleString() + "??}</span>
        </div>
      </div>
    </label>`;
    })
    .join("");

  // ëª¨ë‹¬ ì»¨í…Œ?´ë„ˆ
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
          <div style="font-size:16px;font-weight:900;color:#111827;display:flex;align-items:center;gap:8px">${icon} ?¹ì¸??${label} ? íƒ</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${plans.length}ê±?ì¤?${tempIds.length}ê±?? íƒ??/div>
        </div>
        <button onclick="_closePlanPickerModal(false)" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF;padding:4px">??/button>
      </div>
      <div style="padding:12px 24px;border-bottom:1px solid #F3F4F6">
        <input id="plan-picker-search" type="text" placeholder="êµìœ¡ê³„íšëª?ê²€??.." value="${applyState._planPickerSearch || ""}"
          oninput="applyState._planPickerSearch=this.value;_renderPlanPickerModalDOM()"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600;outline:none"
          onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='#E5E7EB'">
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px 24px">
        <div style="display:grid;gap:8px">
          ${filtered.length > 0 ? planCards : '<div style="padding:32px;text-align:center;color:#9CA3AF;font-size:13px">ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤</div>'}
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;background:#F9FAFB">
        <div style="font-size:12px;font-weight:800;color:${color}">
          ${tempIds.length > 0 ? `? íƒ: ${tempIds.length}ê±?Â· ì´??ˆì‚°: ${totalAmt.toLocaleString()}?? : "êµìœ¡ê³„íš??? íƒ?˜ì„¸??}
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="_closePlanPickerModal(false)" style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">ì·¨ì†Œ</button>
          <button onclick="_closePlanPickerModal(true)" ${tempIds.length === 0 ? "disabled" : ""}
            style="padding:10px 24px;border-radius:10px;border:none;background:${tempIds.length > 0 ? color : "#D1D5DB"};color:white;font-size:13px;font-weight:900;cursor:${tempIds.length > 0 ? "pointer" : "not-allowed"}">?•ì¸ (${tempIds.length}ê±?</button>
        </div>
      </div>
    </div>
  </div>`;
}

function _togglePlanPickerItem(id) {
  const tempIds = applyState._planPickerTempIds || [];
  // ê¸°ê°„ ë§Œë£Œ ì²´í¬
  const plan = _dbApprovedPlans.find((p) => p.id === id);
  if (plan?.endDate && new Date(plan.endDate) < new Date()) return;

  const idx = tempIds.indexOf(id);
  if (idx >= 0) {
    // ? íƒ ?´ì œ
    tempIds.splice(idx, 1);
  } else {
    // ??ê°™ì? êµìœ¡? í˜•ë§?ë³µìˆ˜ ? íƒ ê°€??
    if (tempIds.length > 0 && plan) {
      const firstPlan = _dbApprovedPlans.find((p) => p.id === tempIds[0]);
      const firstType = firstPlan?.edu_type || "";
      const thisType = plan.edu_type || "";
      if (firstType && thisType && firstType !== thisType) {
        const typeLabel = (t) => {
          const map = {
            elearning: "?´ëŸ¬??,
            seminar: "?¸ë???,
            class: "ì§‘í•©",
            conf: "ì»¨í¼?°ìŠ¤",
            book: "?„ì„œêµ¬ì…",
            cert: "?ê²©ì¦?,
            lang: "?´í•™",
          };
          return map[t] || t || "ë¯¸ì???;
        };
        alert(
          `? ï¸ ê°™ì? êµìœ¡? í˜•??ê³„íšë§?ë³µìˆ˜ ? íƒ ê°€?¥í•©?ˆë‹¤.\n\n?„ì¬ ? íƒ??? í˜•: ${typeLabel(firstType)}\n? íƒ?˜ë ¤??? í˜•: ${typeLabel(thisType)}`,
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
    // R&D: planId???™ê¸°??(?ˆê±°???¸í™˜)
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

// ?ˆê±°???¸í™˜: selectRndPlan?€ _togglePlanPickerItem?¼ë¡œ ë¦¬ë‹¤?´ë ‰??
function selectRndPlan(id) {
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx >= 0) applyState.planIds.splice(idx, 1);
  else applyState.planIds.push(id);
  applyState.planId = applyState.planIds[0] || "";
  renderApply();
}

// ?€?€?€ Step ?´ë™ (?¨í„´A ??êµìœ¡ê³„íš ?„ìˆ˜ + êµìœ¡? í˜• ê±´ë„ˆ?€) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function applyNext() {
  const s = applyState;
  const hasPlanSelected = s.planId || (s.planIds && s.planIds.length > 0);

  // Step 2: ?¨í„´A(R&D ?ëŠ” êµìœ¡?´ì˜) êµìœ¡ê³„íš ë¯¸ì„ ????ì§„í–‰ ì°¨ë‹¨
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
    alert("???¨í„´A ?•ì±…?…ë‹ˆ?? ?¹ì¸??êµìœ¡ê³„íš??ë¨¼ì? ? íƒ?´ì£¼?¸ìš”.");
    return;
  }
  if (s.step === 2 && (isRndPatA || isOperPatA) && hasPlanSelected) {
    s.step = 4; // ?¨í„´A: êµìœ¡? í˜• ê±´ë„ˆ?€ ??ë°”ë¡œ ?¸ë??•ë³´

    // ???¨í„´A: ê³„íš ?°ì´???ë™ ?°ë™ ??
    const planId = s.planId || (s.planIds && s.planIds[0]) || "";
    if (planId) {
      const linkedPlan = _dbApprovedPlans.find((p) => p.id === planId);
      const rawPlan = (
        typeof _plansDbCache !== "undefined" ? _plansDbCache : []
      ).find((p) => p.id === planId);
      if (linkedPlan) {
        // êµìœ¡? í˜• ?ë™ ?¤ì •
        if (linkedPlan.edu_type && !s.eduType) s.eduType = linkedPlan.edu_type;
        if (!s.subType && linkedPlan.edu_type) s.subType = linkedPlan.edu_type;
      }
      if (rawPlan) {
        const d = rawPlan.detail || {};
        // ê³„íš ?ì„¸ ?°ì´????? ì²­ ?„ë“œ ?ë™ ì±„ìš°ê¸?
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
  // Step4 ì§„ì… ??BO form_template ??ƒ ìµœì‹  ë¡œë“œ
  const nextStep = s.step;
  if (nextStep === 4) {
    s.formTemplateLoading = true;
    s.formTemplate = null; // ìºì‹œ ë¬´íš¨??????ƒ DB ?¬ì¡°??
    renderApply();
    const policies =
      typeof _getActivePolicies === "function"
        ? _getActivePolicies(currentPersona)?.policies || []
        : [];
    const purposeId = s.purpose?.id;
    const eduType = s.subType || s.eduType || ""; // ??êµìœ¡? í˜• ?„ë‹¬
    const accCode = (() => {
      const budgets = currentPersona?.budgets || [];
      const b = budgets.find((x) => x.id === s.budgetId);
      return b?.accountCode || b?.account_code || null;
    })();
    // ??purpose + account + eduType 3ì¤?ë§¤ì¹­
    // FO purpose(internal_edu) ??BO purpose(elearning_class ?? ??§¤???ìš©
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
        // eduType ?ë¬¸ ì½”ë“œ ì§ì ‘ ?„ë‹¬ (DB form_templates.edu_type ?ë¬¸ ?œì????„ë£Œ)
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
    applyState.step = 2; // R&D?ì„œ ?¤ë¡œ ??Step2ë¡?ë³µê?
  } else {
    applyState.step = Math.max(applyState.step - 1, 1);
  }
  renderApply();
}

// ?€?€?€ êµìœ¡ê²°ê³¼ ?‘ì„± ???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
let _resultFormData = null;

function _openResultForm(appId, title, amount) {
  _resultFormData = {
    applicationId: appId,
    title: title || "-",
    amount: amount || 0,
    completed: "yes", // ?˜ë£Œ?¬ë?
    actualHours: "", // ?¤ì°¸?ì‹œê°?
    actualCost: amount, // ?¤ë¹„??
    satisfaction: 5, // ë§Œì¡±??(1~5)
    feedback: "", // ?Œê°
  };
  _renderResultView();
}

function _renderResultView() {
  const f = _resultFormData;
  if (!f) return;
  document.getElementById("page-apply").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??êµìœ¡? ì²­ ??êµìœ¡ê²°ê³¼</div>
    <h1 class="text-2xl font-black text-brand tracking-tight mb-6">?“ êµìœ¡ê²°ê³¼ ?‘ì„±</h1>

    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <!-- ?¤ë”: ? ì²­ ?•ë³´ -->
      <div style="padding:20px 24px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">?¹ì¸??êµìœ¡? ì²­ ê¸°ë°˜</div>
        <h2 style="margin:0;font-size:18px;font-weight:900">${f.title}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">?¹ì¸ ê¸ˆì•¡: ${f.amount.toLocaleString()}??/p>
      </div>

      <div style="padding:24px">
        <!-- ?˜ë£Œ?¬ë? -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">?˜ë£Œ?¬ë? <span style="color:#EF4444">*</span></label>
          <div style="display:flex;gap:10px">
            ${["yes", "no"]
              .map(
                (v) => `
            <button onclick="_resultFormData.completed='${v}';_renderResultView()"
              style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;
                     border:2px solid ${f.completed === v ? "#059669" : "#E5E7EB"};
                     background:${f.completed === v ? "#F0FDF4" : "white"};
                     color:${f.completed === v ? "#059669" : "#6B7280"}">
              ${v === "yes" ? "???˜ë£Œ" : "??ë¯¸ìˆ˜ë£?}
            </button>`,
              )
              .join("")}
          </div>
        </div>

        <!-- ?¤ì°¸?ì‹œê°?-->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">??ì°¸ì„?œê°„ (?œê°„)</label>
          <input type="number" value="${f.actualHours}" placeholder="?? 16"
            oninput="_resultFormData.actualHours=this.value"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>

        <!-- ?¤ë¹„??-->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">??ì§€ì¶œë¹„??(??</label>
          <input type="number" value="${f.actualCost}" placeholder="?? 1500000"
            oninput="_resultFormData.actualCost=Number(this.value)"
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>

        <!-- ë§Œì¡±??-->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">ë§Œì¡±??(1~5)</label>
          <div style="display:flex;gap:8px">
            ${[1, 2, 3, 4, 5]
              .map(
                (v) => `
            <button onclick="_resultFormData.satisfaction=${v};_renderResultView()"
              style="width:44px;height:44px;border-radius:10px;font-size:18px;cursor:pointer;
                     border:2px solid ${f.satisfaction >= v ? "#F59E0B" : "#E5E7EB"};
                     background:${f.satisfaction >= v ? "#FFFBEB" : "white"}">
              ${"â­?}
            </button>`,
              )
              .join("")}
          </div>
        </div>

        <!-- ?Œê° -->
        <div style="margin-bottom:20px">
          <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">êµìœ¡ ?Œê°</label>
          <textarea oninput="_resultFormData.feedback=this.value" rows="4"
            placeholder="êµìœ¡??? ìµ???? ?¤ë¬´ ?ìš© ê³„íš ?±ì„ ?‘ì„±?´ì£¼?¸ìš”."
            style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical">${f.feedback}</textarea>
        </div>
      </div>

      <!-- ?˜ë‹¨ ë²„íŠ¼ -->
      <div style="padding:16px 24px;border-top:1px solid #F3F4F6;display:flex;justify-content:space-between">
        <button onclick="_resultFormData=null;applyViewMode='list';renderApply()"
          style="padding:10px 24px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:800;color:#6B7280;cursor:pointer">
          ??ëª©ë¡?¼ë¡œ
        </button>
        <button onclick="_submitResult()"
          style="padding:10px 28px;border-radius:10px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          ?“¤ ê²°ê³¼ ?œì¶œ
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
    alert("DB ?°ê²° ?¤íŒ¨");
    return;
  }

  try {
    // ê¸°ì¡´ detail ? ì??˜ë©° result ì¶”ê?
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
    alert("??êµìœ¡ê²°ê³¼ê°€ ?œì¶œ?˜ì—ˆ?µë‹ˆ??");
    _resultFormData = null;
    _appsDbLoaded = false;
    _dbMyApps = []; // ëª©ë¡ ê°±ì‹ 
    applyViewMode = "list";
    renderApply();
  } catch (err) {
    alert("?œì¶œ ?¤íŒ¨: " + err.message);
    console.error("[_submitResult]", err.message);
  }
}

// ?€?€?€ A-1: ? ì²­ ?€?¥ì™„ë£?saved) ?€?????ì‹  ?€ê¸??íƒœ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ?‘ì„± ?„ë£Œ ??ë°”ë¡œ ê²°ì¬ ?”ì²­?˜ì? ?Šê³  "?€?¥ì™„ë£? ?íƒœë¡?ë³´ê?
// ?€?ì´ ?„ì„± ???€?¥ì´ ?€???ì‹ ?˜ê±°?? ë³¸ì¸??ê²°ì¬?¨ì—???ì‹ ?˜ëŠ” ?¨í„´
async function saveApplyAsReady() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  // ?„ìˆ˜ ?„ë“œ ê²€ì¦?(?€?¥ì™„ë£????ì‹  ê°€???íƒœ?´ë?ë¡?? íš¨???•ì¸)
  if (applyState.formTemplate && typeof validateRequiredFields === 'function') {
    const result = validateRequiredFields(applyState.formTemplate, applyState);
    if (!result.valid) {
      alert('? ï¸ ?„ìˆ˜ ??ª©??ëª¨ë‘ ?…ë ¥?´ì•¼ ?€?¥ì™„ë£??íƒœë¡??„í™˜?????ˆìŠµ?ˆë‹¤:\n\n??' + result.errors.join('\n??'));
      return;
    }
  }
  if (!applyState.eduName && !applyState.title) {
    alert('êµìœ¡ëª…ì„ ?…ë ¥?´ì£¼?¸ìš”.');
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
      edu_name: applyState.eduName || applyState.title || 'êµìœ¡? ì²­',
      edu_type: applyState.eduType || applyState.eduSubType || null,
      amount: totalExp,
      status: 'saved',  // ??A-1 ?µì‹¬: draft ?„ë‹Œ savedë¡??€??
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
    alert('?“¤ ?€?¥ì™„ë£??íƒœë¡??€?¥ë˜?ˆìŠµ?ˆë‹¤.\n\nê²°ì¬????ê²°ì¬)?ì„œ ?ì‹ ?˜ê±°??\n?€?¥ì´ ?€?œë¡œ ?ì‹ ?????ˆìŠµ?ˆë‹¤.');
    applyState = resetApplyState();
    applyViewMode = 'list';
    _appsDbLoaded = false;
    _dbMyApps = [];
    renderApply();
  } catch (err) {
    alert('?€?¥ì™„ë£??¤íŒ¨: ' + err.message);
    console.error('[saveApplyAsReady]', err.message);
  }
}

// ?€?€?€ A-1: ? ì²­ ì¹´ë“œ?ì„œ ?¨ê±´ ?ì‹  ë¸Œë¦¿ì§€ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// apply.js ? ì²­ ?´ì—­ ì¹´ë“œ??saved ??ª©??"?ì‹ ?˜ê¸°" ë²„íŠ¼?????¨ìˆ˜ë¥??¸ì¶œ
function _appSingleSubmit(appId, appTitle) {
  // ëª¨ë‹¬???„ìš°ê¸??„í•´ ??ƒ ê²°ì¬???˜ì´ì§€ë¡??´ë™ (?Œë”ë§??„ë£Œ ??ëª¨ë‹¬ ?¤í”ˆ)
  window._pendingAprSubmit = { id: appId, table: 'applications', title: appTitle || 'êµìœ¡? ì²­ ?ì‹ ' };
  if (typeof navigate === 'function') navigate('approval-member');
}

