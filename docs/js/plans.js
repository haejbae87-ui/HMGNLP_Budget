// ?€?€?€ PLANS (êµìœ¡ê³„íš) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

// FO ?•ì±… ?°ë™?? BO service_policies + VOrg ?œí”Œë¦?DB ?„ë¦¬ë¡œë“œ
// var ?¬ì„ ??ê¸ˆì? ??bo_data.js??let VORG_TEMPLATES ? ì–¸???ˆì–´ SyntaxError ë°©ì?
if (typeof SERVICE_POLICIES === "undefined") window.SERVICE_POLICIES = [];
if (typeof VORG_TEMPLATES === "undefined") {
  window.VORG_TEMPLATES = [];
}
if (typeof EDU_SUPPORT_DOMAINS === "undefined") {
  window.EDU_SUPPORT_DOMAINS = [];
}
var _foServicePoliciesLoaded = false;

async function _loadFoPolicies() {
  if (_foServicePoliciesLoaded) return;
  if (typeof getSB !== "function" || !getSB()) {
    _foServicePoliciesLoaded = true;
    return;
  }

  // ?€?€ VOrg ?œí”Œë¦?edu_support_domains) ??ƒ ë¡œë“œ (ì½”ë“œ ë§¤í•‘???„ìš”) ?€?€
  try {
    const { data: vorgRows } = await getSB()
      .from("edu_support_domains")
      .select("*");
    if (vorgRows) {
      vorgRows.forEach((row) => {
        const mapped = {
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          code: row.code || row.id,
          ownedAccounts: row.owned_accounts || [],
          globalAdminKeys: row.global_admin_keys || [],
        };
        const tpl = typeof VORG_TEMPLATES !== "undefined" ? VORG_TEMPLATES : [];
        const idx = tpl.findIndex((g) => g.id === mapped.id);
        if (idx >= 0) tpl[idx] = mapped;
        else tpl.push(mapped);
      });
    }
  } catch (e) {
    console.warn("[FO] VOrg ?œí”Œë¦?ë¡œë“œ ?¤íŒ¨:", e.message);
  }

  // ?€?€ ?˜ë¥´?Œë‚˜??VOrg ?œí”Œë¦?ID ê²°ì • ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  let vorgId = null;
  if (currentPersona?.vorgId) {
    try {
      const domains =
        typeof VORG_TEMPLATES !== "undefined" ? VORG_TEMPLATES : [];
      const ig = domains.find(
        (g) =>
          g.code === currentPersona.vorgId || g.id === currentPersona.vorgId,
      );
      if (ig) {
        const { data: vorgRows } = await getSB()
          .from("virtual_edu_orgs")
          .select("id")
          .eq("domain_id", ig.id)
          .limit(1);
        vorgId = vorgRows?.[0]?.id || null;
      }
    } catch (e) {
      console.warn("[FO] VOrg ?œí”Œë¦?ì¡°íšŒ ?¤íŒ¨:", e.message);
    }
  }

  // ?€?€ ? ë‹¨ê³? ?¤ëƒ…??API ì¡°íšŒ (Edge Cache ?œìš©, DB ë¡œë“œë¡?ë³´ì™„) ?€?€?€?€?€?€?€?€?€?€?€?€?€
  if (vorgId) {
    try {
      const supabaseUrl =
        typeof SUPABASE_URL !== "undefined"
          ? SUPABASE_URL
          : (typeof getSB === "function" && getSB()?.supabaseUrl) || null;
      const anonKey =
        typeof SUPABASE_ANON !== "undefined" ? SUPABASE_ANON : null;
      if (supabaseUrl && anonKey) {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/get-policy-snapshot?vorg_id=${encodeURIComponent(vorgId)}`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
        );
        if (res.ok) {
          const { policies } = await res.json();
          if (Array.isArray(policies) && policies.length > 0) {
            policies.forEach((p) => {
              const mapped = {
                id: p.id,
                tenantId: currentPersona?.tenantId,
                domainId: p.domainId,
                name: p.name,
                purpose: p.purpose,
                eduTypes: p.eduTypes || [],
                targetType: p.targetType,
                accountCodes: p.accountCodes || [],
                processPattern: p.processPattern,
                status: "active",
              };
              const idx = SERVICE_POLICIES.findIndex(
                (sp) => sp.id === mapped.id,
              );
              if (idx >= 0) SERVICE_POLICIES[idx] = mapped;
              else SERVICE_POLICIES.push(mapped);
            });
            console.log(
              `[FO] ?¤ëƒ…???ë³µ ?„ë£Œ (VOrg: ${vorgId}, ?•ì±… ${policies.length}ê±?- DBë¡œë“œë¡?ë³´ì™„??`,
            );
          }
        }
      }
    } catch (e) {
      console.warn(
        "[FO] ?¤ëƒ…??API ì¡°íšŒ ?¤íŒ¨, DB ì§ì ‘ ì¡°íšŒë¡??„í™˜:",
        e.message,
      );
    }
  }

  // ?€?€ ?¡ë‹¨ê³? ??ƒ DB ë¡œë“œ (?¤ì¤‘ ê²©ë¦¬ê·¸ë£¹ ?¬ìš©??ì§€?? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  // ?¤ëƒ…?·ì? ìºì‹œ ë³´ì™„????DB ë¡œë“œ????ƒ ?¤í–‰?´ì•¼ ëª¨ë“  ?•ì±…??ë°›ì„ ???ˆìŒ
  {
    try {
      const { data: sPols } = await getSB()
        .from("service_policies")
        .select("*")
        .eq("status", "active");
      if (sPols) {
        sPols.forEach((row) => {
          const mapped = {
            id: row.id,
            tenantId: row.tenant_id,
            domainId: row.vorg_template_id,
            name: row.name,
            purpose: row.purpose,
            eduTypes: row.edu_types || [],
            selectedEduItem: row.selected_edu_item || null,
            targetType: row.target_type,
            accountCodes: row.account_codes || [],
            budgetLinked: row.budget_linked !== false,
            processPattern: row.process_pattern,
            approvalConfig: row.approval_config,
            approverPersonaKey:
              row.approval_config?.apply?.finalApproverKey || "",
            stage_form_fields: row.stage_form_fields || null,
            stage_form_ids: row.stage_form_ids || null,
            status: row.status || "active",
          };
          const idx = SERVICE_POLICIES.findIndex((p) => p.id === mapped.id);
          if (idx >= 0) SERVICE_POLICIES[idx] = mapped;
          else SERVICE_POLICIES.push(mapped);
        });
        console.log(
          `[FO] DB ë¡œë“œ ?„ë£Œ (?•ì±… ${sPols.length}ê±? ?¤ì¤‘ê·¸ë£¹ ì½”ë“œ ?¬í•¨)`,
        );
      }
    } catch (e) {
      console.warn("[FO] ?œë¹„???•ë§  DB ë¡œë“œ ?¤íŒ¨:", e.message);
    }
  }

  _foServicePoliciesLoaded = true;
}

// ?€?€?€ ?˜ìš”?ˆì¸¡ ë§ˆê° ì¡°íšŒ ?¬í¼ (?œë„ê·¸ë£¹ ê¸°ë°˜) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// vorgTemplateId: virtual_org_templates.id (text ?€??
async function _checkForecastDeadline(tenantId, fiscalYear, vorgTemplateId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return null;
  try {
    const { data: rows } = await sb
      .from("forecast_deadlines")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fiscal_year", fiscalYear);
    if (!rows || rows.length === 0) return null;
    // ?œë„ê·¸ë£¹ ê¸°ë°˜ ì¡°íšŒ ?°ì„ , ?†ìœ¼ë©?__ALL__ ?´ë°± (?˜ìœ„?¸í™˜)
    let dl = vorgTemplateId
      ? rows.find((r) => r.vorg_template_id === vorgTemplateId)
      : null;
    if (!dl) dl = rows.find((r) => r.account_code === "__ALL__");
    if (!dl) return null;
    // ?˜ë™ ë§ˆê° ì²´í¬
    if (dl.is_closed) return { ...dl, status: "closed" };
    // ê¸°ê°„ ê¸°ë°˜ ?ë™ ?ë³„
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (dl.recruit_start && now < new Date(dl.recruit_start))
      return { ...dl, status: "not_started" };
    if (dl.recruit_end && now > new Date(dl.recruit_end))
      return { ...dl, status: "expired", is_closed: true };
    return { ...dl, status: "open" };
  } catch {
    return null;
  }
}

// êµìœ¡ê³„íš ?˜ë¦½ ?íƒœ
let planState = null;

function resetPlanState() {
  return {
    step: 1,
    purpose: null,
    subType: "",
    eduType: "",
    budgetId: "",
    region: "domestic",
    title: "",
    startDate: "",
    endDate: "",
    locations: [],   // Phase5: êµìœ¡?¥ì†Œ ë©€??? íƒ (ë°°ì—´, ? íƒ?¬í•­)
    amount: "",
    content: "",
    calcGrounds: [],
    hardLimitViolated: false,
    editId: null, // ?„ì‹œ?€???¸ì§‘ ID
    confirmMode: false, // ?‘ì„±?•ì¸ ?”ë©´ ëª¨ë“œ
  };
}

// ê³„íš ëª©ë¡ ë·??íƒœ
let _planViewTab = "mine"; // 'mine' | 'team'
let _planYear = new Date().getFullYear(); // ?°ë„ ?„í„°
let _lastPlansMode = null; // ëª¨ë“œ ?„í™˜ ê°ì???

// ëª¨ë“œ ?„í™˜ ??ìºì‹œ ?„ì „ ì´ˆê¸°??
function _resetPlansCacheForModeSwitch() {
  _plansDbLoaded = false;
  _dbMyPlans = [];
  _plansDbCache = [];
  _teamPlansLoaded = false;
  _dbTeamPlans = [];
  _forecastCampaignHtmlStr = "";
  _forecastDeadlinesCache = null;
  _selectedPlans = [];
  _planStatusFilter = 'all';
  _planAccountFilter = '';
  console.log('[MODE SWITCH] ìºì‹œ ì´ˆê¸°???„ë£Œ:', window.plansMode);
}

// ?€?€ ?ë¬¸ KEY ???œê? ?¼ë²¨ ë³€??ë§??€?€
const _FO_PURPOSE_LABEL = {
  external_personal: "ê°œì¸ì§ë¬´ ?¬ì™¸?™ìŠµ",
  elearning_class: "?´ëŸ¬??ì§‘í•©(ë¹„ë?ë©? ?´ì˜",
  conf_seminar: "?Œí¬???¸ë???ì½˜í¼?°ìŠ¤ ???´ì˜",
  misc_ops: "ê¸°í? ?´ì˜",
};
const _FO_EDU_TYPE_LABEL = {
  regular: "?•ê·œêµìœ¡",
  elearning: "?´ëŸ¬??,
  class: "ì§‘í•©",
  live: "?¼ì´ë¸?,
  academic: "?™ìˆ  ë°??°êµ¬?œë™",
  conf: "?™íšŒ/ì»¨í¼?°ìŠ¤",
  seminar: "?¸ë???,
  knowledge: "ì§€?ì???™ìŠµ",
  book: "?„ì„œêµ¬ì…",
  online: "?¨ë¼?¸ì½˜?ì¸ ",
  competency: "??Ÿ‰ê°œë°œì§€??,
  lang: "?´í•™?™ìŠµë¹?ì§€??,
  cert: "?ê²©ì¦?ì·¨ë“ì§€??,
  ì§‘í•©êµìœ¡: "ì§‘í•©êµìœ¡",
};
function _foPurposeLabel(key) {
  return _FO_PURPOSE_LABEL[key] || key || "-";
}
function _foEduTypeLabel(key) {
  return _FO_EDU_TYPE_LABEL[key] || key || "-";
}

let _dbMyPlans = [];
let _plansDbCache = []; // raw DB data for detail view
let _plansDbLoaded = false;

// #7: ?„í„° ?íƒœ ë³€??
let _planStatusFilter = 'all'; // all | saved | pending | approved | rejected
let _planAccountFilter = ''; // '' = ?„ì²´

let _selectedPlans = [];
let _selectionAccount = null;

window._togglePlanSelection = function(e, id, account) {
  e.stopPropagation();
  const idx = _selectedPlans.indexOf(id);
  if (idx >= 0) {
    _selectedPlans.splice(idx, 1);
    if (_selectedPlans.length === 0) _selectionAccount = null;
  } else {
    if (_selectionAccount && _selectionAccount !== account) {
      alert("? ï¸ ê°™ì? ?ˆì‚° ?µì¥ë§?? íƒ ê°€?¥í•©?ˆë‹¤");
      e.preventDefault();
      return;
    }
    _selectedPlans.push(id);
    _selectionAccount = account;
  }
  renderPlans();
};

function _mapDbStatus(s) {
  const m = {
    draft: "?‘ì„±ì¤?,
    pending: "? ì²­ì¤?,
    approved: "?¹ì¸?„ë£Œ",
    completed: "?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
  };
  return m[s] || s || "? ì²­ì¤?;
}

function renderPlans() {
  console.log(`[DEBUG] renderPlans called. plansMode: ${window.plansMode}`);

  // ??ëª¨ë“œ ?„í™˜ ê°ì? ??ìºì‹œ ?„ì „ ì´ˆê¸°??
  const currentMode = window.plansMode || 'operation';
  if (_lastPlansMode && _lastPlansMode !== currentMode) {
    _resetPlansCacheForModeSwitch();
  }
  _lastPlansMode = currentMode;

  // FO ?•ì±… DB ë¡œë“œ (ìµœì´ˆ 1?? ?„ë£Œ ??ëª©ë¡ ?ë™ ê°±ì‹ )
  if (!_foServicePoliciesLoaded) {
    _loadFoPolicies().then(() => renderPlans());
    return;
  }

  // ?ì„¸ ë·?
  if (_viewingPlanDetail) {
    document.getElementById("page-plans").innerHTML =
      _renderPlanDetailView(_viewingPlanDetail);
    return;
  }
  // ?‘ì„±?•ì¸ ?”ë©´
  if (planState && planState.confirmMode) {
    renderPlanConfirm();
    return;
  }
  // ?„ì???ë·?
  if (planState) {
    renderPlanWizard();
    return;
  }

  // ìº í˜???°ì´??ë¡œë“œ (?¬ì—…ê³„íš ëª¨ë“œ???Œë§Œ)
  if (currentMode === "forecast" && !_forecastCampaignHtmlStr && !_isFetchingForecasts) {
    _fetchForecastCampaigns().then(() => renderPlans());
    return;
  }

  // ?€ ë·??ˆìš© ?¬ë? (persona??teamViewEnabled ?ëŠ” team_view_enabled)
  const teamViewEnabled =
    currentPersona.teamViewEnabled ?? currentPersona.team_view_enabled ?? false;

  // DB ?¤ì‹œê°?ì¡°íšŒ
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_plansDbLoaded) {
    _plansDbLoaded = true;
    // ?¬ë¡œ???Œë„Œ?? ì´ê´„ë¶€?œë©´ ?‘ìª½ ?Œì‚¬ ê³„íš ì¡°íšŒ
    (async () => {
      const ctInfo =
        typeof getCrossTenantInfo === "function"
          ? await getCrossTenantInfo(currentPersona)
          : null;
      const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
      let query = sb
        .from("plans")
        .select("*")
        .eq("applicant_id", currentPersona.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (tids.length > 1) query = query.in("tenant_id", tids);
      else query = query.eq("tenant_id", currentPersona.tenantId);
      const { data, error } = await query;
      if (!error && data) {
        _dbMyPlans = data.map((d) => ({
          id: d.id,
          title: d.edu_name,
          type: d.edu_type || "",
          amount: Number(d.amount || 0),
          status: _mapDbStatus(d.status),
          account: d.account_code,
          date: d.created_at?.slice(0, 10) || "",
          budgetId: d.detail?.budgetId || null,
          purpose: d.detail?.purpose || null,
          tenantId: d.tenant_id, // ?¬ë¡œ???Œë„Œ??ë±ƒì???
          plan_type: d.plan_type,
        }));
        _plansDbCache = data;
      }
      renderPlans();
    })();
    return;
  }
  const myPlans = _dbMyPlans;
  // ?€ ë·? DB?ì„œ ê°™ì? org_id ë©¤ë²„??plans ì¡°íšŒ
  let teamPlans = [];
  if (teamViewEnabled && _planViewTab === "team") {
    if (!_teamPlansLoaded) {
      _teamPlansLoaded = true;
      const sb = typeof getSB === "function" ? getSB() : null;
      if (sb && currentPersona.orgId) {
        (async () => {
          const ctInfo =
            typeof getCrossTenantInfo === "function"
              ? await getCrossTenantInfo(currentPersona)
              : null;
          const tids = ctInfo?.linkedTids || [currentPersona.tenantId];
          // ??ì¡°ì§ ID + ?¬ë¡œ???Œë„Œ???°ê²° ì¡°ì§ ID ?˜ì§‘
          const myOrgIds = [currentPersona.orgId];
          if (ctInfo?.linkedOrgIds)
            ctInfo.linkedOrgIds.forEach((id) => {
              if (!myOrgIds.includes(id)) myOrgIds.push(id);
            });
          let query = sb
            .from("plans")
            .select("*")
            .neq("applicant_id", currentPersona.id)
            .neq("status", "draft")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });
          // ì¡°ì§ ?„í„°: applicant_org_idê°€ ?ˆìœ¼ë©??¬ìš©, ?†ìœ¼ë©?org_id
          if (myOrgIds.length > 1) {
            query = query.in("applicant_org_id", myOrgIds);
          } else {
            query = query.eq("applicant_org_id", currentPersona.orgId);
          }
          if (tids.length > 1) query = query.in("tenant_id", tids);
          else query = query.eq("tenant_id", currentPersona.tenantId);
          const { data } = await query;
          _dbTeamPlans = (data || []).map((d) => ({
            id: d.id,
            title: d.edu_name,
            type: d.edu_type || "",
            amount: Number(d.amount || 0),
            status: _mapDbStatus(d.status),
            account: d.account_code,
            date: d.created_at?.slice(0, 10) || "",
            author: d.applicant_name || "-",
            authorDept: d.dept || "-",
            tenantId: d.tenant_id,
            plan_type: d.plan_type,
          }));
          renderPlans();
        })();
      }
      return;
    }
    teamPlans = _dbTeamPlans;
  }
  const plans = _planViewTab === "mine" ? myPlans : teamPlans;

  // #7: ?íƒœ/ê³„ì • ?„í„° ë°?plan_type ?„í„° ?ìš©
  const targetPlanType = window.plansMode === "forecast" ? "business" : "operation";
  const typeFilteredPlans = plans.filter(p => p.plan_type === targetPlanType);
  const uniqueAccounts = [...new Set(typeFilteredPlans.map(p => p.account || '').filter(Boolean))];
  const filteredPlans = typeFilteredPlans.filter(p => {
    const rawSt = p.status || '';
    // ?íƒœ ?„í„° ë§¤ì¹˜
    const statusMatch = _planStatusFilter === 'all' ||
      ((_planStatusFilter === 'saved') && (rawSt === 'saved' || rawSt === '?€?¥ì™„ë£?)) ||
      ((_planStatusFilter === 'pending') && (rawSt === 'pending' || rawSt === 'submitted' || rawSt === 'in_review' || rawSt === '? ì²­ì¤? || rawSt === 'ê²°ì¬ì§„í–‰ì¤?)) ||
      ((_planStatusFilter === 'approved') && (rawSt === 'approved' || rawSt === '?¹ì¸?„ë£Œ')) ||
      ((_planStatusFilter === 'rejected') && (rawSt === 'rejected' || rawSt === 'ë°˜ë ¤'));
    const accountMatch = !_planAccountFilter || p.account === _planAccountFilter;
    return statusMatch && accountMatch;
  });

  // ?µê³„
  const stats = {
    total: typeFilteredPlans.length,
    saved: typeFilteredPlans.filter(p => p.status === 'saved' || p.status === '?€?¥ì™„ë£?).length,
    active: typeFilteredPlans.filter(
      (p) =>
        p.status === "?¹ì¸?„ë£Œ" ||
        p.status === "approved" ||
        p.status === "? ì²­ì¤? ||
        p.status === "ì§„í–‰ì¤? ||
        p.status === "ê²°ì¬ì§„í–‰ì¤?,
    ).length,
    done: typeFilteredPlans.filter((p) => p.status === "?„ë£Œ").length,
    rejected: typeFilteredPlans.filter((p) => p.status === "ë°˜ë ¤" || p.status === "rejected").length,
    draft: typeFilteredPlans.filter((p) => p.status === "?‘ì„±ì¤? || p.status === "draft").length,
  };

  // ?°ë„ ? íƒ
  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_planYear=Number(this.value);renderPlans()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map((y) => `<option value="${y}" ${_planYear === y ? "selected" : ""}>${y}??/option>`).join("")}
  </select>`;

  // ??UI
  const typeTabBar = ``;

  const viewTabBar = teamViewEnabled
    ? `
  <div style="display:flex;gap:4px;background:#F3F4F6;padding:4px;border-radius:14px;margin-bottom:20px;width:fit-content">
    <button onclick="_planViewTab='mine';renderPlans()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_planViewTab === "mine" ? "#fff" : "transparent"};
      color:${_planViewTab === "mine" ? "#002C5F" : "#6B7280"};
      box-shadow:${_planViewTab === "mine" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      ?‘¤ ??êµìœ¡ê³„íš
    </button>
    <button onclick="_planViewTab='team';renderPlans()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_planViewTab === "team" ? "#fff" : "transparent"};
      color:${_planViewTab === "team" ? "#002C5F" : "#6B7280"};
      box-shadow:${_planViewTab === "team" ? "0 1px 4px rgba(0,0,0,.12)" : "none"}">
      ?‘¥ ?€ êµìœ¡ê³„íš
    </button>
  </div>`
    : "";

  // ?µê³„ ì¹´ë“œ
  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${[
      {
        label: "?„ì²´",
        val: stats.total,
        color: "#002C5F",
        bg: "#EFF6FF",
        icon: "?“‹",
      },
      {
        label: "ì§„í–‰ì¤?,
        val: stats.active,
        color: "#0369A1",
        bg: "#F0F9FF",
        icon: "??,
      },
      {
        label: "?„ë£Œ",
        val: stats.done,
        color: "#059669",
        bg: "#F0FDF4",
        icon: "??,
      },
      {
        label: "ë°˜ë ¤",
        val: stats.rejected,
        color: "#DC2626",
        bg: "#FEF2F2",
        icon: "??,
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

  // #7: ?„í„° UI
  const filterBar = `
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">
    <div style="display:flex;gap:4px">
      ${[['all','?œì „ì²?],['saved','?“¤?€?¥ì™„ë£?],['pending','?³ê²°?¬ë?ê¸?],['approved','?…ìŠ¹?¸ì™„ë£?],['rejected','?Œë°˜??]]
        .map(([val,label]) => `<button onclick="_planStatusFilter='${val}';_plansDbLoaded=false;_dbMyPlans=[];_plansDbCache=[];renderPlans()"
          style="padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;
          border:1.5px solid ${_planStatusFilter===val?'#002C5F':'#E5E7EB'};
          background:${_planStatusFilter===val?'#002C5F':'white'};
          color:${_planStatusFilter===val?'white':'#6B7280'}">${label}</button>`).join('')}
    </div>
    ${uniqueAccounts.length > 1 ? `<select onchange="_planAccountFilter=this.value;renderPlans()"
      style="padding:6px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer">
      <option value="">ê³„ì • ?„ì²´</option>
      ${uniqueAccounts.map(a=>`<option value="${a}" ${_planAccountFilter===a?'selected':''}>${a}</option>`).join('')}
    </select>` : ''}
    <span style="font-size:11px;color:#9CA3AF;margin-left:auto">?„í„°??ê²°ê³¼: <b>${filteredPlans.length}</b>ê±?/span>
  </div>`;

  // ê³„íš ì¹´ë“œ ëª©ë¡ ??ëª¨ë“œë³?ë¹??íƒœ ë©”ì‹œì§€ ë¶„ë¦¬
  const isBizMode = window.plansMode === "forecast";
  const emptyIcon = isBizMode ? "?“¢" : "?› ";
  const emptyTitle = isBizMode
    ? `${_planYear}???¬ì—…ê³„íš???„ì§ ?†ìŠµ?ˆë‹¤`
    : `${_planYear}???´ì˜ê³„íš???„ì§ ?†ìŠµ?ˆë‹¤`;
  const emptyDesc = isBizMode
    ? `?ë‹¨???„ì‚¬ ìº í˜?¸ì— ì°¸ì—¬?˜ì—¬ ?¬ì—…ê³„íš???˜ë¦½?˜ì„¸??<br>?¬ì—…ê³„íš???¹ì¸?˜ë©´ ?ˆì‚°??ë°°ì •?©ë‹ˆ??`
    : `êµìœ¡ ?ˆì‚°??ë°°ì •?????´ì˜ê³„íš???˜ë¦½?˜ë©´<br>êµìœ¡ ? ì²­ ë°?ì§‘í–‰??ê°€?¥í•©?ˆë‹¤.`;
  const emptyBtnLabel = isBizMode ? "+ ?¬ì—…ê³„íš ?˜ë¦½?˜ê¸°" : "+ ?´ì˜ê³„íš ?˜ë¦½?˜ê¸°";
  const emptyBtnMode = isBizMode ? "business" : "operation";
  const listHtml =
    filteredPlans.length > 0
      ? filteredPlans.map((p) => _renderPlanCard(p)).join("")
      : `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
        <div style="font-size:48px;margin-bottom:16px">${emptyIcon}</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">
          ${emptyTitle}
        </div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
          ${emptyDesc}
        </div>
        <button onclick="startPlanWizard('${emptyBtnMode}')" style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">${emptyBtnLabel}</button>
      </div>`;

  const floatingActionBar = _selectedPlans.length > 0 ? `
    <div style="position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#002C5F;padding:16px 24px;border-radius:16px;box-shadow:0 10px 25px rgba(0,44,95,.4);display:flex;align-items:center;gap:24px;z-index:9999;color:white;width:max-content;">
      <div>
        <div style="font-size:14px;font-weight:900;">?“¤ ? íƒ ê±??¼ê´„ ?ì‹ </div>
        <div style="font-size:12px;color:#93C5FD;margin-top:2px">${_selectedPlans.length}ê±?? íƒ??/ ${Number(filteredPlans.filter(p=>_selectedPlans.includes(p.id)).reduce((sum,p)=>sum+(p.amount||0),0)).toLocaleString()}??/div>
      </div>
      <button onclick="_aprBulkSubmitFromTeam([${_selectedPlans.map(id=>`'${id}'`).join(',')}])" style="padding:10px 24px;border-radius:10px;background:#10B981;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(16,185,129,.3);">?ì‹  ì§„í–‰?˜ê¸°</button>
    </div>` : '';

  const isBusiness = window.plansMode === "forecast";
  const pageTitle = isBusiness ? "?¬ì—…ê³„íš (?˜ìš”?ˆì¸¡)" : "?´ì˜ê³„íš ê´€ë¦?(?¤í–‰)";
  const planTypeStr = isBusiness ? "business" : "operation";
  const planLabelStr = isBusiness ? "?¬ì—…ê³„íš ?˜ë¦½" : "?´ì˜ê³„íš ?˜ë¦½";

  document.getElementById("page-plans").innerHTML = `
<div class="max-w-5xl mx-auto space-y-4 pb-20 relative">
  ${isBusiness && typeof _forecastCampaignHtmlStr !== "undefined" ? _forecastCampaignHtmlStr : ""}

  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:${isBusiness ? '40px' : '0'}; border-top:${isBusiness ? '2px solid #E5E7EB' : 'none'}; padding-top:${isBusiness ? '24px' : '0'}">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??${pageTitle}</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">??${isBusiness ? "?¬ì—…ê³„íš ëª©ë¡" : "?´ì˜ê³„íš ëª©ë¡"}</h1>
      <p class="text-gray-500 text-sm mt-1">${currentPersona.name} Â· ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      <button onclick="startPlanWizard('${planTypeStr}')" class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
        + ${planLabelStr}
      </button>
    </div>
  </div>
  <div style="display:flex;gap:12px">
    ${viewTabBar}
  </div>
  ${statsBar}
  ${filterBar}
  <div id="fo-realloc-area"></div>
  <div id="plan-list">${listHtml}</div>
</div>
${floatingActionBar}`;
  _foRenderReallocUI();
  // B-1: ì¹´ë“œ ?Œë”ë§????”ì—¬?ˆì‚° ë±ƒì? ë¹„ë™ê¸??…ë°?´íŠ¸
  if (filteredPlans.length > 0) {
    setTimeout(() => _updateBudgetBadges(filteredPlans), 300);
  }
}


// ?€ ê³„íš DB ìºì‹œ
let _dbTeamPlans = [];
let _teamPlansLoaded = false;

function _renderPlanCard(p) {
  const STATUS_CFG = {
    ?¹ì¸?„ë£Œ: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "?? },
    ì§„í–‰ì¤? { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "?? },
    ë°˜ë ¤: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "?? },
    ê²°ì¬ì§„í–‰ì¤? { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "?? },
    ? ì²­ì¤? { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "?? },
    ?¹ì¸?€ê¸? { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "?•" },
    ?‘ì„±ì¤? { color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE", icon: "?“" },
    ì·¨ì†Œ: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "?š«" },
    // S-5: saved ?íƒœ (DB ?€?¥ì™„ë£? ?ì‹  ?€ê¸?
    ?€?¥ì™„ë£? { color: "#065F46", bg: "#ECFDF5", border: "#6EE7B7", icon: "?? },
    // DB ?ë¬¸ ?íƒœ ë§¤í•‘
    draft: { color: "#0369A1", bg: "#EFF6FF", border: "#BFDBFE", icon: "?“" },
    saved: { color: "#065F46", bg: "#ECFDF5", border: "#6EE7B7", icon: "?“¤" },
    pending: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "?? },
    submitted: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "?? },
    in_review: { color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "?”„" },
    approved: { color: "#059669", bg: "#F0FDF4", border: "#BBF7D0", icon: "?? },
    rejected: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "?? },
    recalled: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "?©ï¸" },
    cancelled: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "?š«" },
  };

  // DB ?ë¬¸ ?íƒœë¥??œê? ?¼ë²¨ë¡?
  const STATUS_LABEL = {
    draft: "?„ì‹œ?€??,
    saved: "?€?¥ì™„ë£?,
    pending: "ê²°ì¬?€ê¸?,
    submitted: "ê²°ì¬?€ê¸?,
    in_review: "1ì°¨ê?? ì™„ë£?,
    approved: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    recalled: "?Œìˆ˜??,
    cancelled: "ì·¨ì†Œ",
  };

  const rawStatus = p.status || "?¹ì¸?„ë£Œ";
  const status = STATUS_LABEL[rawStatus] || rawStatus; // ?”ë©´ ?œì‹œ???œê? ?¼ë²¨
  const cfg = STATUS_CFG[rawStatus] || STATUS_CFG[status] || STATUS_CFG["?¹ì¸?€ê¸?];
  const authorBadge = p.author
    ? `<span style="font-size:10px;background:#E5E7EB;color:#374151;padding:2px 8px;border-radius:10px;margin-left:6px">?‘¤ ${p.author}</span>`
    : "";
  const isDraft = rawStatus === "draft" || rawStatus === "?‘ì„±ì¤?;
  const isSaved = rawStatus === "saved"; // S-5: ?€?¥ì™„ë£??íƒœ
  const isPending = rawStatus === "pending" || rawStatus === "submitted" || rawStatus === "? ì²­ì¤? || rawStatus === "ê²°ì¬ì§„í–‰ì¤?;
  const safeId = String(p.id || "").replace(/'/g, "\\'");
  const safeTitle = (p.title || "").replace(/'/g, "");

  const actionBtns = isDraft
    ? `<div style="display:flex;gap:6px;margin-top:8px">
        <button onclick="resumePlanDraft('${safeId}')" style="padding:5px 14px;border-radius:8px;font-size:11px;font-weight:800;background:#0369A1;color:white;border:none;cursor:pointer">?ï¸ ?´ì–´?°ê¸°</button>
        <button onclick="deletePlanDraft('${safeId}')" style="padding:5px 14px;border-radius:8px;font-size:11px;font-weight:800;background:white;color:#DC2626;border:1.5px solid #FECACA;cursor:pointer">?—‘ ?? œ</button>
       </div>`
    : isSaved
      ? `<div style="display:flex;gap:6px;margin-top:8px">
          <button onclick="event.stopPropagation();_aprSingleSubmitFromPlan('${safeId}','${safeTitle}')"
            style="padding:6px 16px;border-radius:8px;font-size:11px;font-weight:900;background:#059669;color:white;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.25)">?“¤ ?ì‹ ?˜ê¸°</button>
          <button onclick="event.stopPropagation();resumePlanDraft('${safeId}')"
            style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;background:white;color:#0369A1;border:1.5px solid #BFDBFE;cursor:pointer">?ï¸ ?˜ì •</button>
         </div>`
      : isPending
        ? `<div style="margin-top:8px">
          <button onclick="cancelPlan('${safeId}')" style="padding:5px 14px;border-radius:8px;font-size:11px;font-weight:800;background:white;color:#DC2626;border:1.5px solid #FECACA;cursor:pointer">ì·¨ì†Œ ?”ì²­</button>
         </div>`
        : ((rawStatus === "?¹ì¸" || rawStatus === "approved") && Number(p.allocated_amount||0) > 0)
          ? `<div style="display:flex;gap:6px;margin-top:8px">
              <button onclick="event.stopPropagation();_startApplyFromPlan('${safeId}')" style="padding:5px 14px;border-radius:8px;font-size:11px;font-weight:800;background:linear-gradient(135deg,#059669,#047857);color:white;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.2)">?“ êµìœ¡ ? ì²­</button>
             </div>`
          : "";

  return `
    <div onclick="viewPlanDetail('${safeId}')" style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                border:1.5px solid ${_selectedPlans.includes(p.id) ? '#002C5F' : cfg.border};background:${_selectedPlans.includes(p.id) ? '#F0F9FF' : cfg.bg};transition:all .15s;margin-bottom:12px;cursor:pointer"
         onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)';this.style.transform='translateY(-1px)'"
         onmouseout="this.style.boxShadow='none';this.style.transform='none'">
      ${isSaved ? `
        <div style="flex-shrink:0;padding-top:4px;" onclick="event.stopPropagation()">
          <input type="checkbox" 
                 ${_selectedPlans.includes(p.id) ? 'checked' : ''}
                 ${_selectionAccount && _selectionAccount !== p.account ? 'disabled style="opacity:0.5"' : ''}
                 onchange="_togglePlanSelection(event, '${safeId}', '${p.account || ""}')"
                 style="width:20px;height:20px;cursor:pointer;accent-color:#002C5F;">
        </div>
      ` : ''}
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:900;color:#111827">${p.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${status}</span>
          ${authorBadge}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          <span>?’³ ${p.account || "-"} ?ˆì‚°</span>
          <span>?’° ${(p.amount || 0).toLocaleString()}??/span>
          ${Number(p.allocated_amount||0)>0?`<span style="font-weight:800;color:#059669">??ë°°ì • ${Number(p.allocated_amount).toLocaleString()}??/span>`:`<span style="color:#D1D5DB">??ë¯¸ë°°??/span>`}
          <!-- B-1: ?”ì—¬?ˆì‚° ë±ƒì? (ë¹„ë™ê¸?ë¡œë“œ) -->
          ${p.account ? `<span id="budget-badge-${safeId}" style="font-size:10px;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#9CA3AF">?”ì•¡ ë¡œë”©ì¤?..</span>` : ''}
        </div>
        ${actionBtns}
      </div>
      <div style="flex-shrink:0;color:#9CA3AF;font-size:16px;margin-top:4px">??/div>
    </div>`;
}

// ?€?€?€ B-1: ê³„íš ì¹´ë“œ ?”ì—¬?ˆì‚° ë¹„ë™ê¸??…ë°?´íŠ¸ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// ì¹´ë“œ ?Œë”ë§???account_budgetsë¥?ì¡°íšŒ?˜ì—¬ ?”ì—¬?ˆì‚° ë±ƒì? ?…ë°?´íŠ¸
let _budgetBadgeCache = {}; // account_code ??{ balance, total }

async function _updateBudgetBadges(plans) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  // ê³ ìœ  ê³„ì •ì½”ë“œ ?˜ì§‘ (ë¹ˆê°’ ?œì™¸, ìºì‹œ ë¯¸ì ì¤‘ê²ƒë§?
  const accounts = [...new Set(plans.map(p => p.account || p.account_code).filter(Boolean))]
    .filter(ac => !_budgetBadgeCache[ac]);
  if (accounts.length === 0) {
    // ìºì‹œ ?ˆíŠ¸: ë°”ë¡œ ë±ƒì? ?…ë°?´íŠ¸
    _applyBudgetBadges(plans);
    return;
  }
  try {
    const fiscal = _planYear || new Date().getFullYear();
    const { data, error } = await sb.from('account_budgets')
      .select('account_code, total_budget, balance, used')
      .in('account_code', accounts)
      .eq('fiscal_year', fiscal)
      .eq('tenant_id', currentPersona.tenantId);
    if (!error && data) {
      data.forEach(row => {
        const balance = row.balance ?? (Number(row.total_budget||0) - Number(row.used||0));
        _budgetBadgeCache[row.account_code] = {
          total: Number(row.total_budget || 0),
          balance: Math.max(0, balance),
        };
      });
    }
  } catch (e) {
    console.warn('[B-1] budget badge query failed:', e.message);
  }
  _applyBudgetBadges(plans);
}

function _applyBudgetBadges(plans) {
  plans.forEach(p => {
    const ac = p.account || p.account_code;
    if (!ac) return;
    const safeId = String(p.id || '').replace(/'/g, "\\'");
    const el = document.getElementById(`budget-badge-${safeId}`);
    if (!el) return;
    const info = _budgetBadgeCache[ac];
    if (!info) {
      el.textContent = '?”ì•¡ ?•ë³´ ?†ìŒ';
      return;
    }
    const bal = info.balance;
    const pct = info.total > 0 ? Math.round(bal / info.total * 100) : 0;
    const color = bal <= 0 ? '#DC2626' : pct < 20 ? '#D97706' : '#059669';
    const bg    = bal <= 0 ? '#FEE2E2' : pct < 20 ? '#FFFBEB' : '#F0FDF4';
    el.style.background = bg;
    el.style.color = color;
    el.style.fontWeight = '800';
    el.textContent = bal <= 0
      ? '?”´ ?”ì•¡ ?†ìŒ'
      : `?Ÿ¢ ?”ì•¡ ${bal.toLocaleString()}??;
  });
}


// ?€?€?€ PLAN WIZARD ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

function startPlanWizard(mode = 'operation', forcedYear = null) {
  planState = resetPlanState();
  const curYear = new Date().getFullYear();
  
  if (mode === 'business' || mode === 'forecast') {
    planState.plan_type = 'business';
    planState.fiscal_year = forcedYear || curYear;
    _planYear = planState.fiscal_year;
  } else {
    // operation (?ì‹œê³„íš/?´ì˜ê³„íš)
    planState.plan_type = 'operation';
    planState.fiscal_year = curYear;
    _planYear = curYear;
  }
  
  _viewingPlanDetail = null;
  renderPlans();
}

let _forecastDeadlinesCache = null;
let _isFetchingForecasts = false;

let _forecastCampaignHtmlStr = "";
async function _fetchForecastCampaigns() {
  if (_isFetchingForecasts) return;
  _isFetchingForecasts = true;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb.from("forecast_deadlines").select("*").eq("tenant_id", currentPersona.tenantId).eq("is_closed", false);
      const now = new Date(); now.setHours(0,0,0,0);
      const campaigns = (data || []).filter(dl => {
          if (dl.recruit_start && now < new Date(dl.recruit_start)) return false;
          if (dl.recruit_end && now > new Date(dl.recruit_end)) return false;
          return true;
      });
      if (campaigns.length === 0) {
        _forecastCampaignHtmlStr = `<div style="padding:40px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB;margin-bottom:20px;">
          <div style="font-size:32px;margin-bottom:12px">?“¢</div>
          <div style="font-size:14px;font-weight:900;color:#374151">?„ì¬ ì§„í–‰ ì¤‘ì¸ ?„ì‚¬ ?¬ì—…ê³„íš ìº í˜?¸ì´ ?†ìŠµ?ˆë‹¤.</div>
        </div>`;
      } else {
        _forecastCampaignHtmlStr = `<div style="margin-bottom:20px;">
          <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Campaign</div>
          <h2 class="text-2xl font-black text-brand tracking-tight mb-4">?„ì‚¬ ?¬ì—…ê³„íš ?˜ë¦½ ìº í˜??/h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
          ${campaigns.map(c => `
            <div onclick="startPlanWizard('forecast', ${c.fiscal_year})" style="padding:24px 20px;border-radius:16px;background:white;border:1.5px solid #BFDBFE;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.04);transition:all 0.15s"
                 onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(37,99,235,0.1)'"
                 onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.04)'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
                <div style="font-size:12px;font-weight:900;color:#1D4ED8;background:#EFF6FF;padding:4px 10px;border-radius:8px;">?¯ ${c.fiscal_year}?„ë„ ?ˆì‚° ?•ì •</div>
                <div style="font-size:11px;font-weight:800;color:#DC2626;background:#FEF2F2;padding:4px 8px;border-radius:6px;">??ë§ˆê°: ${c.recruit_end ? c.recruit_end.substring(0,10) : '?ì‹œ'}</div>
              </div>
              <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:8px;line-height:1.4">${c.title || c.fiscal_year + '?„ë„ ?„ì‚¬ ?¬ì—…ê³„íš (?˜ìš”?ˆì¸¡)'}</div>
              <div style="font-size:13px;color:#6B7280;line-height:1.5">${c.description || 'ì°¨ë…„???ëŠ” ?¹í•´) ?„ìš”??êµìœ¡ ?ˆì‚°???¬ì „???•ë³´?˜ê¸° ?„í•œ ê¸°ì•ˆ?…ë‹ˆ??'}</div>
              <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #E5E7EB;font-size:13px;font-weight:800;color:#2563EB;display:flex;align-items:center;justify-content:space-between">
                <span>ì°¸ì—¬?˜ì—¬ ê³„íš ?˜ë¦½?˜ê¸°</span>
                <span style="font-size:16px">??/span>
              </div>
            </div>
          `).join('')}
          </div>
        </div>`;
      }
    } catch (e) {
      _forecastCampaignHtmlStr = '';
    }
  }
  _isFetchingForecasts = false;
}

// ?€?€?€ ê³„íš ?ì„¸ ë³´ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
let _viewingPlanDetail = null;

function viewPlanDetail(planId) {
  // DB plans ?ëŠ” mock?ì„œ ?´ë‹¹ ê³„íš ì°¾ê¸°
  const allPlans = typeof _plansDbCache !== "undefined" ? _plansDbCache : [];
  const mockPlans =
    typeof currentPersona !== "undefined" && currentPersona.plans
      ? currentPersona.plans
      : [];
  const plan =
    allPlans.find((p) => p.id === planId) ||
    mockPlans.find((p) => p.id === planId);
  if (!plan) {
    alert("ê³„íš??ì°¾ì„ ???†ìŠµ?ˆë‹¤.");
    return;
  }
  _viewingPlanDetail = plan;
  renderPlans();
}

function _renderPlanDetailView(plan) {
  const STATUS_LABEL = {
    draft: "?‘ì„±ì¤?,
    pending: "? ì²­ì¤?,
    approved: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
    ?¹ì¸?„ë£Œ: "?¹ì¸?„ë£Œ",
    ì§„í–‰ì¤? "ì§„í–‰ì¤?,
    ë°˜ë ¤: "ë°˜ë ¤",
    ê²°ì¬ì§„í–‰ì¤? "ê²°ì¬ì§„í–‰ì¤?,
    ? ì²­ì¤? "? ì²­ì¤?,
    ?‘ì„±ì¤? "?‘ì„±ì¤?,
    ì·¨ì†Œ: "ì·¨ì†Œ",
  };
  const STATUS_COLOR = {
    draft: "#0369A1",
    pending: "#D97706",
    approved: "#059669",
    rejected: "#DC2626",
    cancelled: "#9CA3AF",
    ?¹ì¸?„ë£Œ: "#059669",
    ì§„í–‰ì¤? "#059669",
    ë°˜ë ¤: "#DC2626",
    ê²°ì¬ì§„í–‰ì¤? "#D97706",
    ? ì²­ì¤? "#D97706",
    ?‘ì„±ì¤? "#0369A1",
    ì·¨ì†Œ: "#9CA3AF",
  };
  const st = plan.status || "pending";
  const stLabel = STATUS_LABEL[st] || st;
  const stColor = STATUS_COLOR[st] || "#6B7280";
  const d = plan.detail || {};
  const amount = Number(plan.amount || plan.planAmount || 0);
  const safeId = String(plan.id || "").replace(/'/g, "\\'");
  const isPending = st === "pending" || st === "? ì²­ì¤? || st === "ê²°ì¬ì§„í–‰ì¤?;
  const isDraft = st === "draft" || st === "?‘ì„±ì¤?;
  const isApproved = st === "approved" || st === "?¹ì¸?„ë£Œ";
  // ë§Œë£Œ ê²€ì¦?
  const endDate = d.endDate || plan.end_date || null;
  const isExpired = endDate && new Date(endDate) < new Date();
  // ?°ê²°??? ì²­ ì¡°íšŒ
  const linkedApps = (
    typeof MOCK_HISTORY !== "undefined" ? MOCK_HISTORY : []
  ).filter((h) => h.planId === plan.id);
  const canApply = isApproved && !isExpired;

  return `
  <div class="max-w-5xl mx-auto">
    <div style="margin-bottom:16px">
      <button onclick="_viewingPlanDetail=null;renderPlans()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ??ëª©ë¡?¼ë¡œ
      </button>
    </div>
    <div style="border-radius:16px;overflow:hidden;border:1.5px solid #E5E7EB;background:white;box-shadow:0 4px 20px rgba(0,0,0,.06)">
      <!-- ?¤ë” -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stColor}40;color:white">${stLabel}</span>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${plan.title || plan.edu_name || "-"}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">${plan.applicant_name || currentPersona.name} Â· ${plan.dept || currentPersona.dept}</p>
      </div>
      <!-- ?ì„¸ ?•ë³´ (7?¨ê³„ ?µí•© ë·? -->
      <div style="padding:24px 28px; background:#F9FAFB">
        ${typeof window.foRenderStandardReadOnlyForm === 'function' ? window.foRenderStandardReadOnlyForm({...plan, amount, accountCode: plan.account_code || plan.account || ''}, 'FO') : '<p>?Œë”??ë¡œë”© ì¤?..</p>'}
      </div>
      <!-- ê²°ì¬/ê²€??ì§„í–‰?„í™© -->
      ${typeof renderApprovalStepper === "function" ? renderApprovalStepper(st, "plan") : ""}
      <!-- ?°ê²°??êµìœ¡? ì²­ -->
      <div style="padding:16px 28px;border-top:1px solid #F3F4F6">
        <div style="font-size:12px;font-weight:800;color:#6B7280;margin-bottom:10px">?”— ?°ê²°??êµìœ¡? ì²­</div>
        ${
          linkedApps.length > 0
            ? linkedApps
                .map(
                  (app) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px;margin-bottom:6px">
            <span style="font-size:14px">?“</span>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:800;color:#111827">${app.title || app.id}</div>
              <div style="font-size:11px;color:#6B7280">${app.date || "-"} Â· ${(app.amount || 0).toLocaleString()}??/div>
            </div>
            <span style="font-size:10px;font-weight:900;padding:3px 8px;border-radius:5px;background:${app.status === "?„ë£Œ" ? "#D1FAE5" : app.status === "ì§„í–‰ì¤? ? "#DBEAFE" : "#FEF3C7"};color:${app.status === "?„ë£Œ" ? "#065F46" : app.status === "ì§„í–‰ì¤? ? "#1D4ED8" : "#92400E"}">${app.status || "? ì²­ì¤?}</span>
          </div>
        `,
                )
                .join("")
            : `
          <div style="padding:12px 14px;background:#F9FAFB;border-radius:10px;font-size:12px;color:#9CA3AF;text-align:center">
            ?„ì§ ?°ê²°??êµìœ¡? ì²­???†ìŠµ?ˆë‹¤.
          </div>
        `
        }
      </div>
      <!-- ?¡ì…˜ -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="_viewingPlanDetail=null;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">??ëª©ë¡?¼ë¡œ</button>
        ${isDraft ? `<button onclick="_viewingPlanDetail=null;resumePlanDraft('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#0369A1;color:white;cursor:pointer">?ï¸ ?´ì–´?°ê¸°</button>` : ""}
        ${isPending ? `<button onclick="_viewingPlanDetail=null;cancelPlan('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:white;color:#DC2626;cursor:pointer">ì·¨ì†Œ ?”ì²­</button>` : ""}
        ${canApply ? `<button onclick="_viewingPlanDetail=null;startApplyFromPlan('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:linear-gradient(135deg,#059669,#10B981);color:white;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.3)">????ê³„íš?¼ë¡œ êµìœ¡? ì²­</button>` : ""}
        ${isApproved ? `<button onclick="foOpenReduceAllocation('${safeId}')" style="padding:10px 20px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FDE68A;background:#FFFBEB;color:#B45309;cursor:pointer" title="ë°°ì •???˜í–¥ ì¡°ì • (?´ìš© ë³€ê²?ë¶ˆê?)">?“‰ ë°°ì •??ì¶•ì†Œ</button>` : ""}
        ${isApproved && isExpired ? `<button disabled style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #E5E7EB;background:#F9FAFB;color:#9CA3AF;cursor:not-allowed" title="ê³„íš ê¸°ê°„??ë§Œë£Œ?˜ì–´ ? ì²­?????†ìŠµ?ˆë‹¤">??ê¸°ê°„ ë§Œë£Œ</button>` : ""}
        ${!isApproved && !isDraft && !isPending ? `<span style="font-size:11px;color:#9CA3AF;align-self:center">???¹ì¸?„ë£Œ ?íƒœ?ì„œ ? ì²­ ê°€?¥í•©?ˆë‹¤</span>` : ""}
      </div>
    </div>
  </div>`;
}

function closePlanWizard() {
  planState = null;
  renderPlans(); // ëª©ë¡ ë·°ë¡œ ë³µê?
}

function renderPlanWizard() {
  const s = planState;
  if (!s) return;

  // P1 ?˜ì •: ?•ì±… ë¡œë“œ ?„ë£Œ ?„ì´ë©?ë¨¼ì? ë¡œë“œ ???¬ë Œ??
  // (ë¹ ë¥¸ ?´ë¦­ ?±ìœ¼ë¡?SERVICE_POLICIES ë¹„ì–´?ˆì„ ??Fallback ê²½ë¡œ ë°©ì?)
  if (!_foServicePoliciesLoaded) {
    _loadFoPolicies().then(() => renderPlanWizard());
    return;
  }

  // ?•ì±… ?°ì„ : ??• ???„ë‹Œ ë§¤ì¹­ ?•ì±…??target_type?¼ë¡œ UI ?¹ì…˜ ê²°ì •
  const policyResult =
    typeof _getActivePolicies !== "undefined"
      ? _getActivePolicies(currentPersona)
      : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  // ?¨í„´A ì¡´ì¬ ??ê³„íš ?„ìˆ˜ ?ˆë‚´
  const hasPlanRequiredPattern = matchedPolicies.some(
    (p) => (p.process_pattern || p.processPattern) === "A",
  );

  // ?•ì±… ê¸°ë°˜ ëª©ì  ?„í„° (apply.js ?™ì¼: ?‰ìœ„ ê¸°ë°˜ ì¹´í…Œê³ ë¦¬)
  // ?…â˜… êµìœ¡ê³„íš ?”ë©´ ?„ìš©: ?¨í„´ A(ê³„íš ?„ìˆ˜) ?•ì±…???ˆëŠ” ëª©ì ë§??œì‹œ ?…â˜…
  // ?¨í„´ B/C/D/E ?„ìš© ëª©ì ?€ ê³„íš ?˜ë¦½??ë¶ˆí•„?”í•˜ë¯€ë¡??œì™¸
  const _allPurposes = getPersonaPurposes(currentPersona);

  // ?¨í„´ A ?•ì±…??ì¡´ì¬?˜ëŠ” BO purpose ???˜ì§‘
  const _FO_TO_BO =
    typeof _FO_TO_BO_PURPOSE !== "undefined" ? _FO_TO_BO_PURPOSE : {};
  const _BO_TO_FO =
    typeof _BO_TO_FO_PURPOSE !== "undefined" ? _BO_TO_FO_PURPOSE : {};
  const planRequiredPurposes = new Set();
  matchedPolicies.forEach((p) => {
    const pt = p.process_pattern || p.processPattern || "";
    if (pt === "A") {
      // BO purpose ??FO purpose IDë¡?ë³€?˜í•˜???˜ì§‘
      const foPurpose = _BO_TO_FO[p.purpose] || p.purpose;
      planRequiredPurposes.add(foPurpose);
    }
  });

  // ?¨í„´ A ?•ì±…???ˆëŠ” ëª©ì ë§??„í„° (?¨í„´ A ?•ì±…???†ìœ¼ë©?ê³„íš ?˜ë¦½ ?ì²´ ë¶ˆí•„????ë¹?ëª©ë¡)
  const allPurposes = _allPurposes.filter((p) =>
    planRequiredPurposes.has(p.id),
  );

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
  // ??êµìœ¡ê³„íš ?„ìš©: ?¨í„´ A ?•ì±…??account codesë§Œìœ¼ë¡??ˆì‚° ?„í„°ë§???
  // (ëª¨ë“  ëª©ì ???ˆì‚°???„ë‹Œ, ?¨í„´ A ?•ì±…???°ê²°??ê³„ì •ë§??œì‹œ)
  const _planPatternACodes = new Set();
  if (s.purpose) {
    const boPurposeKeys =
      typeof _FO_TO_BO_PURPOSE !== "undefined"
        ? _FO_TO_BO_PURPOSE[s.purpose.id] || [s.purpose.id]
        : [s.purpose.id];
    matchedPolicies.forEach((p) => {
      const pt = p.process_pattern || p.processPattern || "";
      const pPurpose = p.purpose;
      if (pt === "A" && boPurposeKeys.includes(pPurpose)) {
        (p.account_codes || p.accountCodes || []).forEach((c) =>
          _planPatternACodes.add(c),
        );
      }
    });
  }

  const _rawBudgets = s.purpose
    ? getPersonaBudgets(currentPersona, s.purpose.id)
    : [];
  // ?¨í„´ A ê³„ì • ì½”ë“œê°€ ?ˆìœ¼ë©??´ë‹¹ ì½”ë“œë§??„í„°, ?†ìœ¼ë©??„ì²´ (?´ë°±)
  const availBudgets =
    _planPatternACodes.size > 0
      ? _rawBudgets.filter((b) => {
          return [..._planPatternACodes].some((code) => {
            const acctType = ACCOUNT_TYPE_MAP[code];
            return (
              (acctType && acctType === b.account) || code === b.accountCode
            );
          });
        })
      : _rawBudgets;
  const curBudget = availBudgets.find((b) => b.id === s.budgetId) || null;

  // ?„ë¡œ?¸ìŠ¤ ?¨í„´ ?ˆë‚´ (apply.js ?™ì¼)
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

  // ?€?€ ?¤íƒ­ ì§€?œì (apply.js ?™ì¼ êµ¬ì¡°) ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const stepLabels = ["ëª©ì  ? íƒ", "?ˆì‚° ? íƒ", "êµìœ¡? í˜•", "?¸ë? ?•ë³´"];
  const stepper = [1, 2, 3, 4]
    .map(
      (n) => `
  <div class="step-item flex items-center gap-2 ${s.step > n ? "done" : s.step === n ? "active" : ""}">
    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? "?? : n}</div>
    <span class="text-xs font-bold ${s.step === n ? "text-brand" : "text-gray-400"} hidden sm:block">${stepLabels[n - 1]}</span>
    ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ""}
  </div>`,
    )
    .join("");

  document.getElementById("page-plans").innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <!-- ?¤ë” -->
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home ??êµìœ¡ê³„íš</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">êµìœ¡ê³„íš ?˜ë¦½</h1>
    </div>
    <button onclick="closePlanWizard()" style="padding:8px 18px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">??ëª©ë¡?¼ë¡œ</button>
  </div>

  <!-- ?¤íƒ­ ì¹´ë“œ (apply.js ?™ì¼) -->
  <div class="card p-5">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <!-- ì½˜í…ì¸?ì¹´ë“œ -->
  <div class="card p-8">

  <!-- Step 1: ?‰ìœ„ ê¸°ë°˜ ì¹´í…Œê³ ë¦¬ (apply.js ?™ì¼) -->
  <div class="${s.step === 1 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-5">01. êµìœ¡ ëª©ì  ? íƒ</h3>

    ${
      hasPlanRequiredPattern
        ? `
    <div class="mb-5 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">?“‹</span>
      <div>
        <div class="font-black text-blue-700 text-sm mb-1">ê³„íš ?˜ë¦½ ?„ìˆ˜ ?•ì±…???¬í•¨?˜ì–´ ?ˆìŠµ?ˆë‹¤</div>
        <p class="text-xs text-blue-500 leading-relaxed">?¼ë? êµìœ¡ ëª©ì ?€ ê³„íš ?˜ë¦½ ??? ì²­?˜ëŠ” ?ˆì°¨(?¨í„´A)ê°€ ?ìš©?©ë‹ˆ??</p>
      </div>
    </div>`
        : ""
    }

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
      <div class="grid ${cols} gap-3">
        ${items
          .map((p) => {
            const active = s.purpose?.id === p.id;
            return `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all ${colors.borderHover} ${active ? colors.border + " " + colors.bgActive + " shadow-lg" : "border-gray-200 bg-white"}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${active ? colors.textActive : ""}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`;
          })
          .join("")}
      </div>
    </div>`;
      })
      .join("")}

    ${
      allPurposes.length === 0
        ? `
    <div class="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
      <div class="flex items-start gap-3">
        <span class="text-2xl flex-shrink-0">?“‹</span>
        <div>
          <div class="font-black text-blue-700 text-sm mb-2">êµìœ¡ê³„íš ?˜ë¦½???„ìš”???•ì±…???†ìŠµ?ˆë‹¤</div>
          <p class="text-xs text-blue-500 leading-relaxed mb-0">
            ?„ì¬ ?¬ìš©?ì˜ ?ˆì‚° ê³„ì •?ëŠ” êµìœ¡ê³„íš ?˜ë¦½???„ìˆ˜???•ì±…(?¨í„´ A)???¤ì •?˜ì–´ ?ˆì? ?ŠìŠµ?ˆë‹¤.<br>
            êµìœ¡ê³„íš ?†ì´ ë°”ë¡œ <strong>êµìœ¡? ì²­</strong> ?”ë©´?ì„œ ? ì²­?˜ì‹œë©??©ë‹ˆ??
          </p>
        </div>
      </div>
    </div>`
        : ""
    }

    <div class="flex justify-end mt-6 pt-4 border-t border-gray-100">
      <button onclick="planNext()" ${!s.purpose ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? "bg-brand text-white hover:bg-blue-900 shadow-lg" : "bg-gray-200 text-gray-400 cursor-not-allowed"}">
        ?¤ìŒ ??
      </button>
    </div>
  </div>

  <!-- ?€?€ Step 2: ?ˆì‚° ? íƒ ?€?€ -->
  <div class="${s.step === 2 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-4">02. ?ˆì‚° ê³„ì • ? íƒ</h3>
    <!-- ?´ì „ ?¨ê³„ ? íƒ ?”ì•½ -->
    ${
      s.purpose
        ? `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-4">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest whitespace-nowrap">??êµìœ¡ ëª©ì </div>
      <div class="flex items-center gap-2">
        <span class="text-base">${s.purpose.icon}</span>
        <span class="text-sm font-black text-gray-800">${s.purpose.label}</span>
      </div>
    </div>`
        : ""
    }
    <div class="space-y-4">
      ${
        availBudgets.length > 0
          ? availBudgets
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
                return `
      <button onclick="planSelectBudget('${b.id}')" class="w-full text-left transition-all" style="padding:18px 20px;border-radius:14px;border:2px solid ${active ? "#002C5F" : "#E5E7EB"};background:${active ? "#EFF6FF" : "white"};cursor:pointer">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
              <span style="font-size:14px;font-weight:900;color:${active ? "#002C5F" : "#111827"}">${b.name}</span>
              ${vorgLabel}
            </div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:3px">${acctTypeLabel}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            ${(() => {
              // currentPersona.budgets?ì„œ ?”ì•¡ ì¦‰ì‹œ ì¡°íšŒ
              const personaBudget = (currentPersona.budgets || []).find(pb => pb.id === b.id || pb.name === b.name);
              if (!personaBudget) return '<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#9CA3AF;font-weight:800">??ë¯¸ë°°??/span>';
              const remain = (personaBudget.balance || 0) - (personaBudget.used || 0);
              const total  = personaBudget.balance || 0;
              const pct    = total > 0 ? Math.round(remain / total * 100) : 0;
              const [col, bg, icon] = remain <= 0
                ? ['#DC2626', '#FEE2E2', '?”´']
                : pct < 20
                  ? ['#D97706', '#FFFBEB', '?Ÿ¡']
                  : ['#059669', '#F0FDF4', '?Ÿ¢'];
              return `<span style="font-size:10px;padding:2px 10px;border-radius:6px;background:${bg};color:${col};font-weight:900">${icon} ?”ì•¡ ${remain.toLocaleString()}??/span>`;
            })()}
            ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">? íƒ??/span>' : ""}
          </div>
        </div>
      </button>`;

              })
              .join("")
          : `
      <div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-sm font-bold text-yellow-700">
        ? ï¸ ? íƒ??êµìœ¡ ëª©ì ???¬ìš© ê°€?¥í•œ ?ˆì‚° ê³„ì •???†ìŠµ?ˆë‹¤.
      </div>`
      }
    </div>
${/* ?„ë¡œ?¸ìŠ¤ ?¨í„´ ?ˆë‚´ (apply.js ?™ì¼) */ ""}
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
        <span>${_processInfo.hint}${_processInfo.policyName ? ` <span style="color:#6B7280">(${_processInfo.policyName})</span>` : ""}</span>
      </div>
    </div>`
    : ""
}
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
      <button onclick="planNext()" ${!s.budgetId ? "disabled" : ""}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!s.budgetId ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
        ?¤ìŒ ??
      </button>
    </div>
  </div>

  <!-- ?€?€ Step 3: êµìœ¡? í˜• ? íƒ ?€?€ -->
  <div class="${s.step === 3 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-4">03. êµìœ¡? í˜• ? íƒ</h3>
    <!-- ?´ì „ ?¨ê³„ ? íƒ ?”ì•½ -->
    ${
      s.purpose || curBudget
        ? `
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">? íƒ ?´ì—­</div>
      <div class="flex flex-wrap gap-4">
        ${s.purpose ? `<div class="flex items-center gap-2"><span class="text-[10px] font-black text-blue-300">??ëª©ì </span><span class="text-xs font-black text-gray-800">${s.purpose.icon} ${s.purpose.label}</span></div>` : ""}
        ${curBudget ? `<div class="flex items-center gap-2"><span class="text-[10px] font-black text-blue-300">???ˆì‚°</span><span class="text-xs font-black text-gray-800">${curBudget.name}</span></div>` : ""}
      </div>
    </div>`
        : ""
    }
    ${(() => {
      // êµìœ¡? í˜• ?¸ë¦¬ ê°€?¸ì˜¤ê¸?
      const tree =
        typeof getPolicyEduTree !== "undefined" && curBudget
          ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account)
          : [];

      if (tree.length === 0) {
        const hasPolicies =
          typeof SERVICE_POLICIES !== "undefined" &&
          SERVICE_POLICIES.length > 0;
        return hasPolicies
          ? `<div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
              <div class="font-black text-yellow-700 text-sm">? ï¸ ?ˆìš©??êµìœ¡? í˜• ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤</div>
              <div class="text-xs text-yellow-600 mt-1">ê´€ë¦¬ì?ê²Œ êµìœ¡ì§€???´ì˜ ê·œì¹™ ?¤ì •???”ì²­??ì£¼ì„¸??</div>
            </div>`
          : `<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3">
              <span class="text-accent text-xl">??/span> ???ˆì‚° ê³„ì •?€ ëª¨ë“  êµìœ¡? í˜•???¬ìš© ê°€?¥í•©?ˆë‹¤.
            </div>`;
      }

      return tree
        .map((node) => {
          const isLeaf = !node.subs || node.subs.length === 0;
          const isSelected = s.eduType === node.id;
          if (isLeaf) {
            // ë¦¬í”„ ?¸ë“œ: ë°”ë¡œ ? íƒ (êµìœ¡?´ì˜??
            const leafSelected = isSelected && !s.subType;
            return `
      <div class="mb-3">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                 ${leafSelected ? "bg-gray-900 border-gray-900 text-white shadow-xl" : "border-gray-200 text-gray-700 hover:border-accent hover:text-accent"}">${node.label}</button>
      </div>`;
          } else {
            // ì¤‘ê°„ ?¸ë“œ: ?´ë¦­ ???¸ë???ª© ?¼ì¹¨ (ì§ì ‘?™ìŠµ??
            return `
      <div class="mb-3 rounded-xl border-2 overflow-hidden ${isSelected ? "border-gray-900" : "border-gray-200"}">
        <button onclick="planState.eduType='${node.id}';planState.subType='';renderPlanWizard()"
          class="w-full p-4 text-sm font-bold text-left transition flex items-center justify-between
                 ${isSelected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"}">
          <span>${node.label}</span>
          <span class="text-xs ${isSelected ? "text-gray-300" : "text-gray-400"}">${isSelected ? "?? : "??} ${node.subs.length}ê°??¸ë?? í˜•</span>
        </button>
        ${
          isSelected
            ? `
        <div class="p-4 bg-gray-50 border-t border-gray-200">
          <div class="text-xs font-black text-blue-500 mb-3 flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
            ?¸ë? êµìœ¡? í˜•??? íƒ?˜ì„¸??
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${node.subs
              .map(
                (st) => `
            <button onclick="planState.subType='${st.key}';renderPlanWizard()"
              class="p-3 rounded-xl border-2 text-sm font-bold text-left transition
                     ${s.subType === st.key ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"}">${st.label}</button>
            `,
              )
              .join("")}
          </div>
        </div>`
            : ""
        }
      </div>`;
          }
        })
        .join("");
    })()}
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
      ${(() => {
        const tree2 =
          typeof getPolicyEduTree !== "undefined" && curBudget
            ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account)
            : [];
        const selNode = tree2.find((n) => n.id === s.eduType);
        const isLeaf = selNode && (!selNode.subs || selNode.subs.length === 0);
        const canNext = s.eduType && (isLeaf || s.subType);
        return `<button onclick="planNext()" ${!canNext ? "disabled" : ""}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900 shadow-lg"}">
          ?¤ìŒ ??
        </button>`;
      })()}
    </div>
  </div>

  <!-- ?€?€ Step 4: ?¸ë? ?•ë³´ ?€?€ -->
  <div class="${s.step === 4 ? "" : "hidden"}">
    <h3 class="text-base font-black text-gray-800 mb-5">04. ?¸ë? ?•ë³´ ?…ë ¥</h3>

    <!-- ? íƒ ?”ì•½ ë°°ë„ˆ -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> ê³„íš ?”ì•½
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">??êµìœ¡ ëª©ì </div>
          <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ""} ${s.purpose?.label || "??}</div>
        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">???ˆì‚° ê³„ì •</div>
          <div class="font-black text-sm ${curBudget?.account === "?°êµ¬?¬ì" ? "text-orange-500" : "text-accent"}">${curBudget?.name || "??}</div>

        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">??êµìœ¡? í˜•</div>
          <div class="font-black text-sm text-gray-900">${typeof getEduTypeLabel !== "undefined" && s.eduType ? getEduTypeLabel(s.eduType) : s.eduType || "??}</div>
        </div>
      </div>
    </div>

    <!-- ?€?€ ?™ì  ?‘ì‹ ?„ë“œ (BO form_templates ê¸°ë°˜) ?€?€ -->
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
              ? renderDynamicFormFields(s.formTemplate.fields, s, "planState")
              : "";
          if (dynamicHtml) {
            const tplBadge = s.formTemplate.name
              ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">?“‹ ?‘ì‹: ${s.formTemplate.name}</div>`
              : "";
            const hasAmountField = s.formTemplate.fields.some((f) =>
              ["?ˆìƒë¹„ìš©", "êµìœ¡ë¹?].includes(f.key),
            );
            const amountFallback = hasAmountField
              ? ""
              : `
            <div>
              <label style="display:block;font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">?’° ?ˆì‚° ê³„íš??<span style="color:#EF4444">*</span>
                ${s.calcGrounds && s.calcGrounds.length > 0 ? '<span style="font-size:11px;font-weight:500;color:#3B82F6;margin-left:6px">(?¸ë? ?°ì¶œ ê·¼ê±° ?©ê³„ ?ë™ ë°˜ì˜)</span>' : ""}
              </label>
              <div style="position:relative;max-width:340px">
                <input type="number" value="${s.amount}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
                  style="width:100%;background:#F9FAFB;border:2px solid ${s.hardLimitViolated ? "#EF4444" : "#E5E7EB"};border-radius:12px;padding:12px 48px 12px 16px;font-weight:700;font-size:16px;color:#111827;box-sizing:border-box"/>
                <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">??/span>
              </div>

              ${s.hardLimitViolated ? `<div style="margin-top:6px;font-size:11px;font-weight:700;color:#DC2626">?š« Hard Limit ì´ˆê³¼ ??ª©???ˆì–´ ê³„íš???€?¥í•  ???†ìŠµ?ˆë‹¤.</div>` : ""}
              ${_renderApprovalRouteInfo(s, curBudget)}
            </div>`;
            return tplBadge + dynamicHtml + amountFallback;
          }
        }
        if (s.formTemplateLoading) {
          return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">??/div>?‘ì‹ ë¡œë”© ì¤?..</div>`;
        }
        // ?€?€ Fallback: ?‘ì‹ ë¯¸ì„¤???€?€
        return `
        <div class="inline-flex bg-gray-100 rounded-xl p-1">
          <button onclick="planState.region='domestic';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "domestic" ? "bg-white text-accent shadow" : "text-gray-500"}">?—º êµ?‚´</button>
          <button onclick="planState.region='overseas';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === "overseas" ? "bg-white text-accent shadow" : "text-gray-500"}">?Œ ?´ì™¸</button>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ê³„íšëª?<span class="text-red-500">*</span></label>
          <input type="text" value="${s.title}" oninput="planState.title=this.value" placeholder="?? 26??AI ?êµ¬???™ìŠµ ê³„íš" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ê³„íš ?œì‘??/label>
            <input type="date" value="${s.startDate}" oninput="planState.startDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
          </div>
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ê³„íš ì¢…ë£Œ??/label>
            <input type="date" value="${s.endDate}" oninput="planState.endDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
          </div>
        </div>
        ${_renderCalcGroundsSection(s, curBudget)}
        <!-- Phase5: êµìœ¡?¥ì†Œ ë©€??TAG ?…ë ¥ (? íƒ?¬í•­) -->
        ${_renderLocationTagInput(s)}
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">?ˆì‚° ê³„íš??
            ${s.calcGrounds && s.calcGrounds.length > 0 ? '<span class="text-xs font-medium text-blue-500 ml-2">(?¸ë? ?°ì¶œ ê·¼ê±° ?©ê³„ ?ë™ ë°˜ì˜)</span>' : ""}
          </label>
          <div class="relative max-w-xs">
            <input type="number" value="${s.amount}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
              class="w-full bg-gray-50 border-2 ${s.hardLimitViolated ? "border-red-400 bg-red-50" : "border-gray-100"} rounded-xl px-5 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition pr-12"/>
            <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">??/span>
          </div>

          ${s.hardLimitViolated ? `<div class="mt-1.5 text-xs font-black text-red-600">?š« Hard Limit ì´ˆê³¼ ??ª©???ˆì–´ ê³„íš???€?¥í•  ???†ìŠµ?ˆë‹¤. ??ª© ê¸ˆì•¡???˜ì •?´ì£¼?¸ìš”.</div>` : ""}
          ${_renderApprovalRouteInfo(s, curBudget)}
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ê³„íš ?ì„¸ ?´ìš©</label>
          <textarea oninput="planState.content=this.value" rows="3" placeholder="?…ë¬´ ?œìš© ë°©ì•ˆ, ?™ìŠµ ëª©í‘œ ?±ì„ ?…ë ¥?˜ì„¸??" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
        </div>`;
      })()}
    </div>

    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">???´ì „</button>
      <div class="flex gap-3">
        <button onclick="closePlanWizard()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">ì·¨ì†Œ</button>
        <button onclick="savePlanDraft()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition">
          ?’¾ ?„ì‹œ?€??
        </button>
        <button onclick="savePlanSaved()" ${s.hardLimitViolated ? "disabled" : ""}
          class="px-7 py-3 rounded-xl font-black text-sm transition ${s.hardLimitViolated ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"}">
          ???€??
        </button>
        <button onclick="savePlan()" ${s.hardLimitViolated ? "disabled" : ""}
          class="px-10 py-3 rounded-xl font-black text-sm transition shadow-lg ${s.hardLimitViolated ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-brand text-white hover:bg-blue-900"}">
          ?“¤ ?ì‹  ??
        </button>
      </div>
  </div>

  </div>
</div>`;
}

// ?€?€?€ PLAN WIZARD HELPERS ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

function selectPlanPurpose(id) {
  // ?•ì±… ê¸°ë°˜ ëª©ì  ëª©ë¡?ì„œ ?°ì„  ?ìƒ‰ ??PURPOSES ?´ë°±
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
  planState.eduType = ""; // ?ˆì‚° ë³€ê²???êµìœ¡? í˜• ë¦???
  renderPlanWizard();
}

// ?ˆì‚° ? íƒ ??êµìœ¡? í˜• ë¦¬ì…‹
function planSelectBudget(id) {
  planState.budgetId = id;
  planState.eduType = ""; // ?ˆì‚°???¬ë¼ì§€ë©?êµìœ¡? í˜•???¤ì‹œ ? íƒ
  renderPlanWizard();
}

function planNext() {
  const nextStep = Math.min(planState.step + 1, 4);
  planState.step = nextStep;
  // Step4 ì§„ì… ??BO form_template ??ƒ ìµœì‹  ë¡œë“œ (TTL ìºì‹œ??fo_form_loader?ì„œ ê´€ë¦?
  if (nextStep === 4) {
    planState.formTemplateLoading = true;
    planState.formTemplate = null; // ?´ì „ ìºì‹œ ë¬´íš¨??????ƒ DB?ì„œ ?¬ì¡°??
    renderPlanWizard();
    // ë§¤ì¹­ ?•ì±… ì°¾ê¸°
    const policies =
      typeof _getActivePolicies === "function"
        ? _getActivePolicies(currentPersona)?.policies || []
        : [];
    const purposeId = planState.purpose?.id;
    const eduType = planState.subType || planState.eduType || ""; // Step3?ì„œ ? íƒ??êµìœ¡? í˜•
    const accCode = (() => {
      const budgets = currentPersona?.budgets || [];
      const b = budgets.find((x) => x.id === planState.budgetId);
      return b?.accountCode || b?.account_code || null;
    })();
    // ??purpose + account + eduType ê¸°ì? ìµœì  ?•ì±… ? íƒ
    // FO purpose(internal_edu) ??BO purpose(elearning_class ?? ??§¤???ìš©
    const boPurposeKeys =
      typeof _FO_TO_BO_PURPOSE !== "undefined" && purposeId
        ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
        : [purposeId];
    const _purposeMatch = (pPurpose) =>
      !purposeId || boPurposeKeys.includes(pPurpose);
    // 1?œìœ„: purpose + account + eduType ëª¨ë‘ ?¼ì¹˜
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
      // 2?œìœ„: purpose + accountë§??¼ì¹˜ (eduType ë¬´ì‹œ)
      policies.find((p) => {
        const acc = p.account_codes || p.accountCodes || [];
        return _purposeMatch(p.purpose) && (!accCode || acc.includes(accCode));
      }) ||
      policies[0] ||
      null;

    (async () => {
      // ?‘ì‹ ë¡œë“œ + ?¸ë??°ì¶œê·¼ê±° DB ë¡œë“œ ë³‘ë ¬ ?˜í–‰
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

// ?€?€?€ ?„ì‹œ?€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function savePlanDraft() {
  const total = _calcGroundsTotal();
  const amount = total || Number(planState.amount || 0);
  const curBudget = planState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === planState.budgetId)
    : null;
  const accountCode =
    curBudget?.accountCode || _getPlanAccountCode(curBudget) || "";
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB ?°ê²° ?¤íŒ¨");
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
      edu_name: planState.title || planState.eduTypeName || "êµìœ¡ê³„íš",
      edu_type: planState.eduType || planState.eduSubType || null,
      amount: amount,
      status: "draft",
      policy_id: planState.policyId || null,
      plan_type: planState.plan_type || "operation",
      fiscal_year: planState.fiscal_year || new Date().getFullYear(),
      form_template_id: planState.formTemplate?.id || null,
      form_version: planState.formTemplate?.version || null,
      // ?„ë“œ ?œì???(field_standardization.md PL-04, A-18~A-20)
      expected_benefit: planState.expectedBenefit || planState.expected_benefit || null,
      education_format: planState.educationFormat || planState.education_format || null,
      is_overseas: planState.isOverseas === true || planState.is_overseas === true || false,
      overseas_country: planState.overseasCountry || planState.overseas_country || null,
      detail: {
        purpose: planState.purpose?.id || null,
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
    alert("?’¾ ?„ì‹œ?€?¥ë˜?ˆìŠµ?ˆë‹¤.\n\nëª©ë¡?ì„œ ?´ì–´?°ê¸°?????ˆìŠµ?ˆë‹¤.");
    console.log(`[savePlanDraft] ?„ì‹œ?€???±ê³µ: ${planId}`);
  } catch (err) {
    alert("?„ì‹œ?€???¤íŒ¨: " + err.message);
    console.error("[savePlanDraft] ?¤íŒ¨:", err.message);
  }
}

// ?€?€?€ ?€??(saved ?íƒœ ???‘ì„±?„ë£Œ, ?ì‹  ???€ê¸? ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
//   draft  ??saved : ?‘ì„±???„ë£Œ????ª©. ëª©ë¡?ì„œ ?¨ê±´/?¤ê±´ ?ì‹  ê°€??
//   saved  ??pending : ?ì‹  ?„ë£Œ. ê²°ì¬ ?€ê¸?
async function savePlanSaved() {
  if (!planState.title) {
    alert("ê³„íšëª…ì„ ?…ë ¥?´ì£¼?¸ìš”.");
    return;
  }
  if (planState.formTemplate && typeof validateRequiredFields === "function") {
    const result = validateRequiredFields(planState.formTemplate, planState);
    if (!result.valid) {
      alert("? ï¸ ?„ìˆ˜ ??ª©???…ë ¥?´ì£¼?¸ìš”:\n\n??" + result.errors.join("\n??"));
      return;
    }
  }
  if (planState.hardLimitViolated) {
    alert("?š« Hard Limit ì´ˆê³¼ ??ª©???ˆì–´ ?€?¥í•  ???†ìŠµ?ˆë‹¤.");
    return;
  }
  const total = _calcGroundsTotal();
  const amount = total || Number(planState.amount || 0);
  const curBudget = planState.budgetId
    ? (currentPersona.budgets || []).find((b) => b.id === planState.budgetId)
    : null;
  const accountCode =
    curBudget?.accountCode || _getPlanAccountCode(curBudget) || "";
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB ?°ê²° ?¤íŒ¨"); return; }
  try {
    const planId = planState.editId || `PLAN-${Date.now()}`;
    const row = {
      id: planId,
      tenant_id: currentPersona.tenantId,
      account_code: accountCode,
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      applicant_org_id: currentPersona.orgId || null,
      edu_name: planState.title || "êµìœ¡ê³„íš",
      edu_type: planState.eduType || planState.eduSubType || null,
      amount: amount,
      status: "saved",           // ??3?¨ê³„ ?íƒœ ì¤?2?¨ê³„
      policy_id: planState.policyId || null,
      plan_type: planState.plan_type || "operation",
      fiscal_year: planState.fiscal_year || new Date().getFullYear(),
      form_template_id: planState.formTemplate?.id || null,
      form_version: planState.formTemplate?.version || null,
      // ?„ë“œ ?œì???(field_standardization.md PL-04, A-18~A-20)
      expected_benefit: planState.expectedBenefit || planState.expected_benefit || null,
      education_format: planState.educationFormat || planState.education_format || null,
      is_overseas: planState.isOverseas === true || planState.is_overseas === true || false,
      overseas_country: planState.overseasCountry || planState.overseas_country || null,
      detail: {
        purpose: planState.purpose?.id || null,
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
    alert(`???€?¥ë˜?ˆìŠµ?ˆë‹¤!\n\nê³„íš: ${planState.title}\nê³„íš?? ${amount.toLocaleString()}??n\n[ê²°ì¬?? ëª©ë¡?ì„œ ?¨ê±´ ?ëŠ” ?¤ê±´ ? íƒ ???ì‹ ?????ˆìŠµ?ˆë‹¤.`);
    console.log(`[savePlanSaved] ?€???±ê³µ (saved): ${planId}`);
    closePlanWizard();
    _plansDbLoaded = false;
    renderPlans();
  } catch (err) {
    alert("?€???¤íŒ¨: " + err.message);
    console.error("[savePlanSaved] ?¤íŒ¨:", err.message);
  }
}

// ?€?€?€ ?œì¶œ ???‘ì„±?•ì¸ ?”ë©´ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function savePlan() {
  if (!planState.title) {
    alert("ê³„íšëª…ì„ ?…ë ¥?´ì£¼?¸ìš”.");
    return;
  }
  // ?€?€ ?™ì  ?‘ì‹ ?„ìˆ˜ ?„ë“œ ê²€ì¦??€?€
  if (planState.formTemplate && typeof validateRequiredFields === "function") {
    const result = validateRequiredFields(planState.formTemplate, planState);
    if (!result.valid) {
      alert("? ï¸ ?„ìˆ˜ ??ª©???…ë ¥?´ì£¼?¸ìš”:\n\n??" + result.errors.join("\n??"));
      return;
    }
  }
  planState.confirmMode = true;
  renderPlans();
}

// ?€?€?€ ?‘ì„±?•ì¸ ?”ë©´ ?Œë”ë§??€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
  const purposeLabel = s.purpose?.label || s.purpose?.id || "-";

  document.getElementById("page-plans").innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <!-- ?¤ë” -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">???‘ì„± ?•ì¸</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">êµìœ¡ê³„íš ?œì¶œ ???•ì¸</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">?„ë˜ ?´ìš©???•ì¸?????•ì •?˜ë©´ ê²°ì¬?¼ì¸?¼ë¡œ ?„ë‹¬?©ë‹ˆ??</p>
      </div>
      <!-- ?”ì•½ -->
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:120px">ê³„íšëª?/td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${s.title || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">êµìœ¡ëª©ì </td>
            <td style="padding:12px 0;color:#374151">${purposeLabel}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">êµìœ¡? í˜•</td>
            <td style="padding:12px 0;color:#374151">${s.eduType || "-"} ${s.eduSubType ? "> " + s.eduSubType : ""}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">?ˆì‚°ê³„ì •</td>
            <td style="padding:12px 0;color:#374151">${accountCode || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">ê³„íš??/td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${amount.toLocaleString()}??/td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">ê¸°ê°„</td>
            <td style="padding:12px 0;color:#374151">${s.startDate || "-"} ~ ${s.endDate || "-"}</td>
          </tr>
          <tr>
            <td style="padding:12px 0;font-weight:800;color:#6B7280;vertical-align:top">?ì„¸ ?´ìš©</td>
            <td style="padding:12px 0;color:#374151;white-space:pre-wrap">${s.content || "-"}</td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border-radius:10px;border:1.5px solid #FDE68A;font-size:12px;color:#92400E">
          ? ï¸ ?œì¶œ ?„ì—??ê²°ì¬?¼ì¸???ë™ êµ¬ì„±?˜ë©°, ?ìœ„ ?¹ì¸?ê? ì·¨ì†Œ?˜ê¸° ?„ê¹Œì§€ ì·¨ì†Œê°€ ë¶ˆê??©ë‹ˆ??
        </div>
      </div>
      <!-- ë²„íŠ¼ -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="closePlanWizard()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">??ëª©ë¡?¼ë¡œ</button>
        <button onclick="planState.confirmMode=false;renderPlans()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">?˜ì •?˜ê¸°</button>
        <button onclick="confirmPlan()" style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">???•ì • ?œì¶œ</button>
      </div>
    </div>
  </div>`;
}

// ?€?€?€ ?•ì • ?œì¶œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
  // ??Phase F: ?˜ì‹œ êµìœ¡ê³„íš ?µì¥ ?”ì•¡ ê²½ê³ 
  if (planState.plan_type === "operation" && amount > 0) {
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
        edu_name: planState.title || planState.eduTypeName || "êµìœ¡ê³„íš",
        edu_type: planState.eduType || planState.eduSubType || null,
        amount: amount,
        status: "submitted",  // [S-6] pending ??submitted
        policy_id: planState.policyId || null,
        plan_type: planState.plan_type || "operation",
        fiscal_year: planState.fiscal_year || new Date().getFullYear(),
        form_template_id: planState.formTemplate?.id || null,
        form_version: planState.formTemplate?.version || null,
        detail: {
          purpose: planState.purpose?.id || null,
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
      console.log(`[confirmPlan] DB ?œì¶œ ?±ê³µ: ${planId}`);
    } catch (err) {
      alert("?œì¶œ ?¤íŒ¨: " + _friendlyStatusError(err.message));
      console.error("[confirmPlan] ?¤íŒ¨:", err.message);
      return;
    }

    // [S-6] submission_documents + submission_items ?ë™ ?ì„±
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
        title: `${planState.title || planState.eduTypeName || 'êµìœ¡ê³„íš'} ?ì‹ `,
        account_code: accountCode || null,
        total_amount: amount,
        status: 'submitted',
        submitted_at: now,
      };
      await sb.from('submission_documents').insert(docRow).catch(e => console.warn('[confirmPlan] submission_documents ?ì„± ?¤íŒ¨:', e.message));
      const itemRow = {
        submission_id: docId,
        item_type: 'plan',
        item_id: planId,
        item_title: planState.title || planState.eduTypeName || 'êµìœ¡ê³„íš',
        item_amount: amount,
        account_code: accountCode || null,
        policy_id: planState.policyId || null,
        item_status: 'pending',
        sort_order: 0,
      };
      await sb.from('submission_items').insert(itemRow).catch(e => console.warn('[confirmPlan] submission_items ?ì„± ?¤íŒ¨:', e.message));
      console.log('[confirmPlan] ?ì‹  ë¬¸ì„œ ?ë™ ?ì„±:', docId);
    } catch (sdErr) {
      console.warn('[confirmPlan] ?ì‹  ë¬¸ì„œ ?ì„± ?¤ë¥˜ (ë¹„ì¹˜ëª…ì ):', sdErr.message);
    }
  }

  alert(
    `??êµìœ¡ê³„íš???ì‹ ?˜ì—ˆ?µë‹ˆ??\n\nê³„íš?? ${amount.toLocaleString()}??n?ì‹  ë¬¸ì„œê°€ ?ë™ ?ì„±?˜ì–´ ?€??ê²°ì¬?¨ìœ¼ë¡??„ë‹¬?©ë‹ˆ??`,
  );
  closePlanWizard();
  _plansDbLoaded = false;
  renderPlans();
}

// ?€?€?€ ?„ì‹œ?€???´ì–´?°ê¸° ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
      alert("?„ì‹œ?€??ê±´ì„ ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.");
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
    planState.budgetId = data.detail?.budgetId || "";
    planState.calcGrounds = data.detail?.calcGrounds || [];
    planState.locations = Array.isArray(data.detail?.locations) ? data.detail.locations : [];
    planState.policyId = data.policy_id || null;
    planState.region = data.detail?.region || "domestic";
    planState.accountCode = data.account_code || "";

    // ??purpose ë³µì›: PURPOSES ë°°ì—´?ì„œ idë¡??€ ?¤ë¸Œ?íŠ¸ ë§¤ì¹­
    const purposeId = data.detail?.purpose;
    if (purposeId) {
      // ?•ì±… ê¸°ë°˜ ëª©ì ?ì„œ ?°ì„  ?ìƒ‰ ??PURPOSES ?´ë°±
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
        // ?´ë°±: EDU_PURPOSE_GROUPS?ì„œ ì°¾ê¸°
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
        // ìµœì¢… ?´ë°±: idë§Œì´?¼ë„ ?¤ì •
        if (!planState.purpose)
          planState.purpose = { id: purposeId, label: purposeId };
      }
    }

    planState.step = 4;

    // ??step 4 ì§„ì… ??formTemplate ë¹„ë™ê¸?ë¡œë“œ (?•ìƒ ?„ì????ë¦„ê³??™ì¼)
    planState.formTemplateLoading = true;
    renderPlans(); // ë¡œë”© ì¤??œì‹œ

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
      // ??P1-1 ?˜ì •: ?´ì–´?°ê¸° ?œì—??eduType ?„ë‹¬
      const rEduType =
        planState.subType || planState.eduType || data.edu_type || "";
      tpl = await getFoFormTemplate(rMatched, "plan", rEduType);
    }
    planState.formTemplate = tpl || null;
    planState.formTemplateLoading = false;
    renderPlans();
  } catch (err) {
    alert("ë¶ˆëŸ¬?¤ê¸° ?¤íŒ¨: " + err.message);
  }
}

// ?€?€?€ ?„ì‹œ?€???? œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function deletePlanDraft(planId) {
  if (!confirm("?„ì‹œ?€?¥ëœ ê³„íš???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?")) return;
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

// ?€?€?€ ?íƒœ ?„ì´ ?ëŸ¬ ?œêµ­??ë³€???€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _friendlyStatusError(msg) {
  if (!msg) return "?????†ëŠ” ?ëŸ¬";
  const m = msg.match(/Invalid status transition:\s*(\w+)\s*??s*(\w+)/);
  if (!m) return msg;
  const labels = {
    draft: "?‘ì„±ì¤??„ì‹œ?€??",
    saved: "?€?¥ì™„ë£?,
    pending: "ê²°ì¬?€ê¸??ì‹ ??",
    approved: "?¹ì¸?„ë£Œ",
    rejected: "ë°˜ë ¤",
    cancelled: "ì·¨ì†Œ",
    completed: "?„ë£Œ",
  };
  return `?„ì¬ '${labels[m[1]] || m[1]}' ?íƒœ?ì„œ '${labels[m[2]] || m[2]}'(??ë¡?ë³€ê²½í•  ???†ìŠµ?ˆë‹¤.`;
}

// ?€?€?€ êµìœ¡ê³„íš ì·¨ì†Œ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
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
          "? ï¸ ?´ë? ?¹ì¸??ê³„íš?€ ?ìœ„ ?¹ì¸?ê? ì·¨ì†Œ?´ì•¼ ?©ë‹ˆ??\n\nê²°ì¬?¼ì¸ ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?´ì£¼?¸ìš”.",
        );
        return;
      }
      if (data?.status === "draft") {
        alert("?´ë? ?„ì‹œ?€???íƒœ?…ë‹ˆ??");
        return;
      }
    } catch (e) {
      /* pass */
    }
  }
  if (!confirm("??êµìœ¡ê³„íš??ì·¨ì†Œ?˜ê³  ?„ì‹œ?€???íƒœë¡??˜ëŒë¦¬ì‹œê² ìŠµ?ˆê¹Œ?"))
    return;
  if (sb) {
    try {
      const { error } = await sb
        .from("plans")
        .update({ status: "draft" })
        .eq("id", planId);
      if (error) throw error;
      alert(
        "êµìœ¡ê³„íš???„ì‹œ?€???íƒœë¡??˜ëŒ?¤ì¡Œ?µë‹ˆ??\n?˜ì • ???¤ì‹œ ?œì¶œ?????ˆìŠµ?ˆë‹¤.",
      );
    } catch (err) {
      alert("ì·¨ì†Œ ?¤íŒ¨: " + _friendlyStatusError(err.message));
      return;
    }
  }
  _plansDbLoaded = false;
  _viewingPlanDetail = null;
  renderPlans();
}

// ?€?€?€ êµìœ¡ê³„íš ê¸°ë°˜ êµìœ¡? ì²­ ?°ë™ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
async function startApplyFromPlan(planId) {
  // 1. DB?ì„œ ê³„íš ì¡°íšŒ
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
      console.warn("[startApplyFromPlan] DB ì¡°íšŒ ?¤íŒ¨:", err.message);
    }
  }
  // 2. _plansDbCache ìºì‹œ ?´ë°±
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

  // 3. ?íƒœ ê²€ì¦?(E2, TC5)
  const planSt = plan.status || "";
  if (planSt !== "approved" && planSt !== "?¹ì¸?„ë£Œ") {
    alert(
      "???¹ì¸?„ë£Œ ?íƒœ??ê³„íšë§?êµìœ¡? ì²­??ê°€?¥í•©?ˆë‹¤.\n?„ì¬ ?íƒœ: " +
        (planSt || "?????†ìŒ"),
    );
    return;
  }
  // 4. ë§Œë£Œ ê²€ì¦?(E4)
  if (plan.endDate && new Date(plan.endDate) < new Date()) {
    alert("????êµìœ¡ê³„íš?€ ê¸°ê°„??ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??\në§Œë£Œ?? " + plan.endDate);
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

// ?€?€?€ ?¸ë? ?°ì¶œ ê·¼ê±° (Calculation Grounds) ?¬í¼ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€

// ?„ì¬ ? íƒ???ˆì‚° ê³„ì •??accountCodeë¥?ë°˜í™˜
function _getPlanAccountCode(curBudget) {
  if (!curBudget) return null;
  // data.js??budgets: account ?„ë“œë¡?ê³„ì • ?´ë¦„ ë§¤í•‘
  const acctMap = {
    ì°¸ê?: "HMC-PART",
    ?´ì˜: "HMC-OPS",
    ?°êµ¬?¬ì: "HMC-RND",
    ê¸°í?: "HMC-ETC",
  };
  // tenantId ê¸°ë°˜?¼ë¡œ ë§¤í•‘
  const tenantId = currentPersona.tenantId || "HMC";
  const prefixed = {
    HMC: {
      ì°¸ê?: "HMC-PART",
      ?´ì˜: "HMC-OPS",
      ?°êµ¬?¬ì: "HMC-RND",
      ê¸°í?: "HMC-ETC",
    },
    KIA: { ì°¸ê?: "KIA-PART", ?´ì˜: "KIA-OPS" },
    HAE: { ì°¸ê?: "HAE-PART", ?ê²©ì¦? "HAE-CERT", ?´ì˜: "HAE-OPS" },
  };
  return (prefixed[tenantId] || acctMap)[curBudget.account] || null;
}

// ?€?€?€ Phase5: êµìœ¡?¥ì†Œ ë©€??TAG ?…ë ¥ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
function _renderLocationTagInput(s) {
  const locs = Array.isArray(s.locations) ? s.locations : [];
  const tagHtml = locs.map((loc, i) => {
    const safe = String(loc).replace(/['"<>&]/g, '');
    return `<span style="display:inline-flex;align-items:center;gap:4px;background:#DBEAFE;color:#1D4ED8;font-size:11px;font-weight:800;padding:3px 10px;border-radius:20px">
      ?“ ${safe}
      <button onclick="event.stopPropagation();_planRemoveLocation(${i})" style="background:none;border:none;cursor:pointer;color:#3B82F6;font-size:13px;line-height:1;padding:0 0 0 2px">??/button>
    </span>`;
  }).join('');

  return `
<div style="margin-bottom:16px">
  <label style="display:block;font-size:11px;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">
    ?“ êµìœ¡?¥ì†Œ <span style="font-size:9px;font-weight:500;color:#9CA3AF;text-transform:none">(? íƒ?¬í•­ Â· ë³µìˆ˜ ?…ë ¥ ê°€??</span>
  </label>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;min-height:${locs.length > 0 ? 'auto':'0'}">
    ${tagHtml}
  </div>
  <div style="display:flex;gap:6px;align-items:center">
    <input id="plan-location-input" type="text" placeholder="?¥ì†Œ ?…ë ¥ ??Enter (?? ?„ë??¸ì¬ê°œë°œ??"
      onkeydown="if(event.key==='Enter'){event.preventDefault();_planAddLocation(document.getElementById('plan-location-input').value)}"
      style="flex:1;padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:600;outline:none;transition:border .15s"
      onfocus="this.style.borderColor='#3B82F6'" onblur="this.style.borderColor='#E5E7EB'">
    <button onclick="_planAddLocation(document.getElementById('plan-location-input').value)"
      style="padding:7px 14px;border-radius:8px;background:#EFF6FF;color:#1D4ED8;border:1.5px solid #BFDBFE;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">+ ì¶”ê?</button>
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

// ?¸ë??°ì¶œê·¼ê±° ?©ê³„ ê³„ì‚°
function _calcGroundsTotal() {
  if (!planState.calcGrounds || planState.calcGrounds.length === 0) return 0;
  return planState.calcGrounds.reduce((sum, row) => sum + (row.total || 0), 0);
}

// ?¸ë??°ì¶œê·¼ê±° ?©ê³„ë¥?ê³„íš???„ë“œ???ë™ ë°˜ì˜ + Hard Limit ì²´í¬
function _syncCalcToAmount() {
  const total = _calcGroundsTotal();
  if (total > 0) planState.amount = total;
  _checkHardLimits();
}

// Hard Limit ì²´í¬
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

// ?¸ë??°ì¶œê·¼ê±° ?¹ì…˜ ?Œë”
function _renderCalcGroundsSection(s, curBudget) {
  if (typeof CALC_GROUNDS_MASTER === "undefined") return "";

  // ?€?€?€ PURPOSE ê¸°ë°˜ ? í˜• ?ë™ ?ë³„ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
  const purposeId = s.purpose?.id || "";
  // external_personal = ì§ì ‘?™ìŠµ??ê°œì¸ ?¬ì™¸êµìœ¡), ?˜ë¨¸ì§€ = êµìœ¡?´ì˜??
  const isSelfLearning = purposeId === "external_personal";
  const usageType = isSelfLearning ? "self_learning" : "edu_operation";

  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType(usageType, vorgId, false)
    : (typeof getCalcGroundsForVorg === "function" ? getCalcGroundsForVorg(vorgId, null) : []);

  if (items.length === 0 && (!s.calcGrounds || s.calcGrounds.length === 0)) return "";

  // ì§ì ‘?™ìŠµ????ë³„ë„ ?¬í”Œ UI
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

  // thead ì»¬ëŸ¼ ê²°ì •: any row??has_qty2/has_rounds ?•ì¸
  const anyHasQty2 = rows.some((r) => {
    const it = items.find(g => g.id === r.itemId);
    return it?.hasQty2 === true;
  });
  const anyHasRounds = rows.some((r) => {
    const it = items.find(g => g.id === r.itemId);
    return it?.hasRounds === true;
  });

  return `
<div class="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
  <div class="flex items-center justify-between mb-4">
    <div>
      <div class="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">?“ ?¸ë? ?°ì¶œ ê·¼ê±° <span style="font-size:10px;background:#DBEAFE;color:#1D4ED8;padding:2px 8px;border-radius:5px">?¯ êµìœ¡?´ì˜??(?¨ê? Ã— ?¸ì› Ã— qty2 Ã— ì°¨ìˆ˜)</span></div>
      <div class="text-[11px] text-gray-500">??ª© ? íƒ ???¥ì†Œ(? íƒ) ???„ë¦¬??? íƒ ???¨ê?Â·ë°•ìˆ˜ ?ë™ ?…ë ¥?©ë‹ˆ??</div>
    </div>
    <button onclick="_cgAddRow()"
      class="text-xs font-black text-white bg-accent px-4 py-2 rounded-xl hover:bg-blue-600 transition shadow">
      + ??ª© ì¶”ê?
    </button>
  </div>

  ${
    rows.length > 0
      ? `
  <!-- ??ª© ???Œì´ë¸?-->
  <div class="bg-white rounded-xl overflow-hidden border border-blue-100 mb-3" style="overflow-x:auto">
    <table class="w-full text-xs" style="min-width:680px">
      <thead class="bg-blue-50">
        <tr class="text-[10px] font-black text-blue-500 uppercase tracking-wider">
          <th class="px-3 py-2 text-left">??ª©</th>
          <th class="px-3 py-2 text-left" style="min-width:120px">?¥ì†Œ+?„ë¦¬??/th>
          <th class="px-3 py-2 text-right w-24">?¨ê? (??</th>
          <th class="px-3 py-2 text-right w-16">?¸ì› (ëª?</th>
          ${anyHasQty2 ? `<th class="px-3 py-2 text-right w-16">ë°?????/th>` : ""}
          ${anyHasRounds ? `<th class="px-3 py-2 text-right w-14">ì°¨ìˆ˜</th>` : ""}
          <th class="px-3 py-2 text-right w-28">?Œê³„ (??</th>
          <th class="px-3 py-2 text-center w-8"></th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, idx) => {
            const item = items.find((g) => g.id === row.itemId);
            const isSoftOver = item && item.softLimit > 0 && row.total > item.softLimit;
            const isHardOver = item && item.hardLimit > 0 && row.total > item.hardLimit;
            const rowBg = isHardOver ? "#FEF2F2" : isSoftOver ? "#FFFBEB" : "#fff";
            // ?„ë¦¬???µì…˜ (ìºì‹œ???°ì´??
            const presets = row._presets || [];
            const presetOpts = presets.length > 0
              ? `<option value="">-- ?„ë¦¬??--</option>` + presets.map(p => `<option value="${p.venue_name}|${p.preset_name}|${p.unit_price}|${p.qty2_value||1}" ${row.presetKey===(p.venue_name+'|'+p.preset_name)?'selected':''}>${p.venue_name ? p.venue_name+' Â· ' : ''}${p.preset_name} (${Number(p.unit_price).toLocaleString()}??</option>`).join('')
              : `<option value="">-- ì§ì ‘?…ë ¥ --</option>`;
            const showQty2 = item?.hasQty2 === true;
            const showRounds = item?.hasRounds === true;
            const qty2Label = item?.qty2Type || 'ë°?;
            return `
          <tr style="background:${rowBg};border-top:1px solid #F3F4F6">
            <td class="px-3 py-2">
              <select onchange="_cgUpdateItemId(${idx}, this.value)"
                style="font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px;background:#fff;max-width:160px">
                <option value="">-- ??ª© ? íƒ --</option>
                ${items.map((g) => `<option value="${g.id}" ${row.itemId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
              </select>
              ${item ? `<div class="text-[10px] text-gray-400 mt-0.5 pl-1">${item.desc||''}</div>` : ""}
              ${item ? `<div style="font-size:9px;color:#7C3AED;margin-top:1px">${[item.hasRounds?'ì°¨ìˆ˜':'',item.hasQty2?qty2Label:'',item.isOverseas?'?´ì™¸':''].filter(Boolean).map(t=>`[${t}]`).join(' ')}</div>` : ''}
              ${isSoftOver && !isHardOver ? `
              <div class="mt-1">
                <span style="color:#D97706;font-size:10px;font-weight:800">??Soft Limit(${fmt(item.softLimit)}?? ì´ˆê³¼</span>
                <input type="text" placeholder="ì´ˆê³¼ ?¬ìœ  ?…ë ¥ (?„ìˆ˜)"
                  value="${row.limitOverrideReason || ""}"
                  oninput="_cgUpdateReason(${idx}, this.value)"
                  style="display:block;margin-top:2px;font-size:10px;border:1px solid #FDE68A;border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box">
              </div>` : ""}
              ${isHardOver ? `<span style="color:#DC2626;font-size:10px;font-weight:800;display:block;margin-top:2px">?š« Hard Limit(${fmt(item.hardLimit)}?? ì´ˆê³¼ ???€??ë¶ˆê?</span>` : ""}
            </td>
            <td class="px-3 py-2">
              ${presets.length > 0 ? `
              <select onchange="_cgApplyPreset(${idx}, this.value)"
                style="font-size:10px;font-weight:700;border:1.5px solid #BFDBFE;border-radius:6px;padding:3px 5px;background:#EFF6FF;width:100%;max-width:140px">
                ${presetOpts}
              </select>` : `<span style="font-size:10px;color:#9CA3AF">ì§ì ‘?…ë ¥</span>`}
            </td>
            <td class="px-3 py-2">
              <input type="number" value="${row.unitPrice || 0}"
                oninput="_cgUpdateUnitPrice(${idx}, this.value)"
                style="width:80px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
            </td>
            <td class="px-3 py-2">
              <input type="number" value="${row.qty1 || row.qty || 1}" min="1"
                oninput="_cgUpdateQty1(${idx}, this.value)"
                style="width:52px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
            </td>
            ${anyHasQty2 ? `<td class="px-3 py-2">${showQty2 ? `<input type="number" value="${row.qty2 || 1}" min="1" oninput="_cgUpdateQty2(${idx}, this.value)" style="width:48px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">` : `<span style="color:#ccc;font-size:10px">??/span>`}</td>` : ""}
            ${anyHasRounds ? `<td class="px-3 py-2">${showRounds ? `<input type="number" value="${row.qty3 || 1}" min="1" oninput="_cgUpdateQty3(${idx}, this.value)" style="width:44px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">` : `<span style="color:#ccc;font-size:10px">??/span>`}</td>` : ""}
            <td class="px-3 py-2 text-right font-black" style="color:${isHardOver ? "#DC2626" : isSoftOver ? "#D97706" : "#111827"}">
              ${fmt(row.total)}
            </td>
            <td class="px-3 py-2 text-center">
              <button onclick="_cgRemoveRow(${idx})" style="color:#D1D5DB;font-size:14px;border:none;background:none;cursor:pointer">??/button>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>

  <!-- ?©ê³„ & ?¸ë‹¹ ë¹„ìš© -->
  <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100">
    <div>
      <div class="text-xs font-black text-gray-500">?¸ë? ?°ì¶œ ?©ê³„</div>
      ${perPerson > 0 ? `<div class="text-[10px] text-gray-400 mt-0.5">??ìµœë? ?¸ì›(${maxQty1}ëª? ê¸°ì? 1?¸ë‹¹ ??${fmt(perPerson)}??/div>` : ""}
    </div>
    <div class="font-black text-lg ${hasHard ? "text-red-600" : "text-accent"}">${fmt(subtotal)}??/div>
  </div>`
      : `
  <div class="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 border border-dashed border-blue-200">
    ?„ì˜ '+ ??ª© ì¶”ê?' ë²„íŠ¼???ŒëŸ¬ ?°ì¶œ ê·¼ê±° ??ª©???…ë ¥?˜ì„¸??
  </div>`
  }
</div>`;
}

// ê²°ì¬?¼ì¸ ?•ë³´ ?œì‹œ
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
  <span class="text-amber-500 text-sm">?“‹</span>
  <span class="text-xs font-bold text-amber-800">${route.range.label}: ${route.range.approvers.join(" ??")}</span>
  <span class="text-[10px] text-amber-600 ml-1">(?ˆìƒ ê²°ì¬?¼ì¸)</span>
</div>`;
}

// ?€?€?€ ì§ì ‘?™ìŠµ??(self_learning) ?°ì¶œê·¼ê±° UI ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€
// purpose = external_personal (ê°œì¸ ?¬ì™¸êµìœ¡) ???¨ê? Ã— ?¸ì› = ?Œê³„ (2ì¤??¹ì‚°)
function _renderSLCalcGrounds(s, items) {
  const rows = s.calcGrounds || [];
  const subtotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);

  // DB??self_learning ??ª©???†ìœ¼ë©??˜ë“œì½”ë”© ?´ë°± ?œê³µ
  const SL_FALLBACK = [
    { id: "_sl_edu",   name: "êµìœ¡ë¹??±ë¡ë¹?,  unitPrice: 0 },
    { id: "_sl_mat",   name: "êµë³´?¬ë¹„",       unitPrice: 0 },
    { id: "_sl_exam",  name: "?œí—˜?‘ì‹œë£?,      unitPrice: 0 },
    { id: "_sl_trvl",  name: "êµí†µë¹?,         unitPrice: 0 },
    { id: "_sl_other", name: "ê¸°í?",           unitPrice: 0 },
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
          <option value="">-- ??ª© ? íƒ --</option>
          ${itemList.map(g => `<option value="${g.id}" ${row.itemId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
        </select>
        ${isSoftOver && !isHardOver ? `<div class="mt-1"><span style="color:#D97706;font-size:10px;font-weight:800">??Soft Limit ì´ˆê³¼</span>
          <input type="text" placeholder="ì´ˆê³¼ ?¬ìœ  ?…ë ¥" value="${row.limitOverrideReason||""}"
            oninput="_cgUpdateReason(${idx},this.value)"
            style="display:block;margin-top:2px;font-size:10px;border:1px solid #FDE68A;border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box"></div>` : ""}
        ${isHardOver ? `<span style="color:#DC2626;font-size:10px;font-weight:800;display:block;margin-top:2px">?š« Hard Limit ì´ˆê³¼ ???€??ë¶ˆê?</span>` : ""}
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
        ${fmt(row.total)}??
      </td>
      <td class="px-3 py-2">
        <input type="text" value="${row.note || ""}" placeholder="ë¹„ê³ "
          oninput="_cgSlUpdateNote(${idx}, this.value)"
          style="width:80px;font-size:11px;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
      </td>
      <td class="px-3 py-2 text-center">
        <button onclick="_cgRemoveRow(${idx})" style="color:#D1D5DB;font-size:14px;border:none;background:none;cursor:pointer">??/button>
      </td>
    </tr>`;
  }).join("");

  return `
<div class="rounded-2xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
  <div class="flex items-center justify-between mb-4">
    <div>
      <div class="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">
        ?’° ?¸ë? ?°ì¶œ ê·¼ê±°
        <span style="font-size:10px;background:#D1FAE5;color:#059669;padding:2px 8px;border-radius:5px">?’ ê°œì¸ì§ë¬´/?¬ì™¸êµìœ¡??(?¨ê? Ã— ?¸ì›)</span>
      </div>
      <div class="text-[11px] text-gray-500">??ª© ? íƒ ???¨ê?Â·?¸ì›???…ë ¥?˜ë©´ ?Œê³„ê°€ ?ë™ ê³„ì‚°?©ë‹ˆ??</div>
    </div>
    <button onclick="_cgAddRowSL()"
      class="text-xs font-black text-white bg-green-600 px-4 py-2 rounded-xl hover:bg-green-700 transition shadow">
      + ??ª© ì¶”ê?
    </button>
  </div>

  ${rows.length > 0 ? `
  <div class="bg-white rounded-xl overflow-hidden border border-green-100 mb-3" style="overflow-x:auto">
    <table class="w-full text-xs" style="min-width:520px">
      <thead class="bg-green-50">
        <tr class="text-[10px] font-black text-green-600 uppercase tracking-wider">
          <th class="px-3 py-2 text-left" style="min-width:140px">??ª©</th>
          <th class="px-3 py-2 text-right w-24">?¨ê? (??</th>
          <th class="px-3 py-2 text-right w-16">?¸ì› (ëª?</th>
          <th class="px-3 py-2 text-right w-24">?Œê³„ (??</th>
          <th class="px-3 py-2 text-left w-20">ë¹„ê³ </th>
          <th class="px-3 py-2 w-8"></th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </div>
  <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-green-100">
    <div class="text-xs font-black text-gray-500">?¸ë? ?°ì¶œ ?©ê³„</div>
    <div class="font-black text-lg text-green-700">${fmt(subtotal)}??/div>
  </div>` : `
  <div class="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 border border-dashed border-green-200">
    ?„ì˜ '+ ??ª© ì¶”ê?' ë²„íŠ¼???ŒëŸ¬ ë¹„ìš© ??ª©???…ë ¥?˜ì„¸??(êµìœ¡ë¹? êµë³´?¬ë¹„, ?œí—˜?‘ì‹œë£???.
  </div>`}
</div>`;
}

// ì§ì ‘?™ìŠµ????ì¶”ê?
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

// ì§ì ‘?™ìŠµ?????…ë°?´íŠ¸ ?¬í¼
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

// ?€?€?€ Calc Grounds ??ì¡°ì‘ ?¨ìˆ˜ ?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€?€ v3

async function _cgAddRow() {
  if (!planState.calcGrounds) planState.calcGrounds = [];
  const vorgId = currentPersona?.vorgTemplateId || null;
  const items = (typeof _getCalcGroundsForType === "function")
    ? _getCalcGroundsForType("edu_operation", vorgId, false)
    : [];
  const firstItem = items[0];
  // ì²???ª©???„ë¦¬??ë¯¸ë¦¬ ë¡œë“œ
  let presets = [];
  if (firstItem && typeof _loadUnitPricesForItem === "function") {
    presets = await _loadUnitPricesForItem(firstItem.id);
  }
  planState.calcGrounds.push({
    itemId: firstItem?.id || "",
    unitPrice: firstItem?.unitPrice || 0,
    qty1: 1,
    qty2: firstItem?.hasQty2 ? (presets[0]?.qty2_value || 1) : 1,
    qty3: firstItem?.hasRounds ? 1 : 1,
    total: firstItem?.unitPrice || 0,
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
  // ?¨ê? ?Œê¸‰ ?†ìŒ: ??ª© ë³€ê²??œë§Œ ê¸°ì??¨ê? ?ìš© (?ˆë¡œ???‰ì´ë¯€ë¡???ƒ ìµœì‹  ë¡œë“œ)
  row.unitPrice = item?.unitPrice || 0;
  row.qty2 = item?.hasQty2 ? 1 : 1;
  row.qty3 = item?.hasRounds ? 1 : 1;
  row.presetKey = "";
  row.venueName = "";
  row.presetName = "";
  row.limitOverrideReason = "";
  // ?„ë¦¬??ë¡œë“œ
  if (itemId && typeof _loadUnitPricesForItem === "function") {
    row._presets = await _loadUnitPricesForItem(itemId);
  } else {
    row._presets = [];
  }
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgApplyPreset(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row || !val) return;
  // val: "venue_name|preset_name|unit_price|qty2_value"
  const [venueName, presetName, priceStr, qty2Str] = val.split("|");
  row.venueName = venueName || "";
  row.presetName = presetName || "";
  row.presetKey = val ? `${venueName}|${presetName}` : "";
  // ?¨ê? ?Œê¸‰ ?†ìŒ: preset ? íƒ ??ìµœì‹  ?¨ê? ?ìš© (? ê·œ ?‰ì´ë¯€ë¡???ƒ ë¡œë“œ)
  row.unitPrice = Number(priceStr) || row.unitPrice;
  const item = typeof CALC_GROUNDS_MASTER !== "undefined"
    ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
  if (item?.hasQty2 && qty2Str) row.qty2 = Number(qty2Str) || 1;
  _cgRecalcRow(row, item);
  _syncCalcToAmount();
  _cgRefreshTotals();
}

function _cgRecalcRow(row, item) {
  row.total = window._calcGroundTotal
    ? window._calcGroundTotal({ unitPrice: row.unitPrice, qty1: row.qty1 || row.qty || 1, qty2: item?.hasQty2 ? (row.qty2||1) : 1, qty3: item?.hasRounds ? (row.qty3||1) : 1 })
    : (row.unitPrice || 0) * (row.qty1 || row.qty || 1) * (item?.hasQty2 ? (row.qty2||1) : 1) * (item?.hasRounds ? (row.qty3||1) : 1);
}

function _cgUpdateQty1(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty1 = Math.max(1, Number(val) || 1);
  row.qty = row.qty1; // ?ˆê±°???¸í™˜
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

// ?ˆê±°???˜í¼ (ê¸°ì¡´ ?¸ì¶œ ? ì?)
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

// ?Œê³„ë§??ìŠ¤???…ë°?´íŠ¸ (?„ì²´ ?Œë” ìµœì†Œ??
function _cgRefreshTotals() {
  // Step 4???ˆì„ ?Œë§Œ ?¬ë Œ??
  if (planState.step === 4) renderPlanWizard();
}

// ??Phase C: êµìœ¡ê³„íš ??êµìœ¡? ì²­ ?°ë™
// plan_idë¥?sessionStorage???€?¥í•˜ê³?êµìœ¡? ì²­ ?”ë©´?¼ë¡œ ?´ë™
function _startApplyFromPlan(planId) {
  const plan = _foDbPlans.find(p => String(p.id) === String(planId));
  if (!plan) { alert('êµìœ¡ê³„íš??ì°¾ì„ ???†ìŠµ?ˆë‹¤.'); return; }
  if (Number(plan.allocated_amount || 0) <= 0) {
    alert('ë°°ì •???„ë£Œ??êµìœ¡ê³„íšë§?êµìœ¡ ? ì²­??ê°€?¥í•©?ˆë‹¤.');
    return;
  }
  // plan ?•ë³´ë¥?sessionStorage???€????apply.js?ì„œ ?½ìŒ
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
  // êµìœ¡? ì²­ ë©”ë‰´ë¡??´ë™
  if (typeof renderApply === 'function') {
    _mainView = 'apply';
    renderApply();
  } else {
    alert('êµìœ¡? ì²­ ?”ë©´?¼ë¡œ ?´ë™?©ë‹ˆ?? (ë©”ë‰´?ì„œ êµìœ¡? ì²­??? íƒ)');
  }
}

// ?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”??
// ??Phase B: FO ë°°ì • ?¬ë°°ë¶?
// ?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”??
let _foReallocMode = false;

function _foToggleRealloc() {
  _foReallocMode = !_foReallocMode;
  _foRenderReallocUI();
}

async function _foRenderReallocUI() {
  const area = document.getElementById('fo-realloc-area');
  if (!area) return;
  
  const approvedPlans = (_foDbPlans || []).filter(p =>
    (p.status === '?¹ì¸' || p.status === 'approved') && Number(p.allocated_amount || 0) >= 0
  );
  
  if (!_foReallocMode || approvedPlans.length === 0) {
    // ë²„íŠ¼ë§??œì‹œ
    area.innerHTML = approvedPlans.length > 0 ? `
      <div style="margin-bottom:16px;display:flex;gap:8px;align-items:center">
        <button onclick="_foToggleRealloc()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #7C3AED;background:#F5F3FF;color:#7C3AED;font-size:12px;font-weight:900;cursor:pointer">
          ?”„ ë°°ì • ?¬ë°°ë¶?
        </button>
        <span style="font-size:11px;color:#9CA3AF">?¹ì¸??êµìœ¡ê³„íš??ë°°ì •?¡ì„ ?¬ì¡°?•í•©?ˆë‹¤</span>
      </div>` : '';
    return;
  }

  // ?µì¥ ?”ì•¡ ì¡°íšŒ
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
          <span style="font-size:13px;font-weight:900;color:#7C3AED">?”„ ë°°ì • ?¬ë°°ë¶?ëª¨ë“œ</span>
          <span style="font-size:11px;color:#6B7280;margin-left:8px">?µì¥ ?”ì•¡: <b style="color:#059669">${bankBalance.toLocaleString()}??/b></span>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="_foSaveRealloc()" style="padding:6px 16px;border-radius:8px;border:none;background:#7C3AED;color:white;font-size:11px;font-weight:900;cursor:pointer">?’¾ ?€??/button>
          <button onclick="_foToggleRealloc()" style="padding:6px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;color:#6B7280;font-size:11px;font-weight:900;cursor:pointer">???«ê¸°</button>
        </div>
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:8px">ë°°ì • ?©ê³„: <b id="fo-realloc-sum">${totalAlloc.toLocaleString()}</b>??/div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr style="background:#EDE9FE">
          <th style="padding:8px;text-align:left;font-weight:900">êµìœ¡ê³„íš</th>
          <th style="padding:8px;text-align:right;font-weight:900;width:120px">ê³„íš??/th>
          <th style="padding:8px;text-align:right;font-weight:900;width:140px">ë°°ì •??(?˜ì •)</th>
        </tr>
        ${approvedPlans.map((p,i) => `
        <tr style="border-bottom:1px solid #E5E7EB">
          <td style="padding:8px;font-weight:700;color:#111827">${p.title}</td>
          <td style="padding:8px;text-align:right;color:#6B7280">${Number(p.amount||0).toLocaleString()}??/td>
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
  if (!sb) { alert('DB ?°ê²° ?¤íŒ¨'); return; }

  const inputs = document.querySelectorAll('#fo-realloc-area input[data-plan-id]');
  const changes = [];
  inputs.forEach(inp => {
    const newVal = Number(inp.value || 0);
    const origVal = Number(inp.dataset.orig || 0);
    if (newVal !== origVal) {
      changes.push({ id: inp.dataset.planId, allocated_amount: newVal });
    }
  });

  if (changes.length === 0) { alert('ë³€ê²½ëœ ??ª©???†ìŠµ?ˆë‹¤.'); return; }

  // ?µì¥ ?”ì•¡ ê²€ì¦?
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
    alert(`? ï¸ ?¬ë°°ë¶??©ê³„(${totalNew.toLocaleString()}??ê°€ ?µì¥ ?”ì•¡(${bankBalance.toLocaleString()}????ì´ˆê³¼?©ë‹ˆ??`);
    return;
  }

  try {
    for (const c of changes) {
      await sb.from('plans').update({
        allocated_amount: c.allocated_amount,
        updated_at: new Date().toISOString()
      }).eq('id', c.id);
    }
    alert(`??${changes.length}ê±´ì˜ ë°°ì •???¬ë°°ë¶„ë˜?ˆìŠµ?ˆë‹¤.`);
    _foReallocMode = false;
    _plansDbLoaded = false;
    renderPlans();
  } catch(err) {
    alert('?€???¤íŒ¨: ' + err.message);
  }
}

// ?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”??
// ??Phase F: ?˜ì‹œ êµìœ¡ê³„íš ?œì¶œ ???µì¥ ?”ì•¡ ê²½ê³ 
// ?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”?â”??
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
      return confirm(`? ï¸ ?€ ?µì¥ ?”ì•¡ ê²½ê³ \n\nê³„íš ê¸ˆì•¡: ${Number(amount).toLocaleString()}??n?µì¥ ?”ì•¡: ${bal.toLocaleString()}??n\n?µì¥ ?”ì•¡??ì´ˆê³¼?˜ëŠ” êµìœ¡ê³„íš?…ë‹ˆ??\nê·¸ë˜???œì¶œ?˜ì‹œê² ìŠµ?ˆê¹Œ?`);
    }
  } catch(e) {}
  return true;
}
