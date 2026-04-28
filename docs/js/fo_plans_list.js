// ─── fo_plans_list.js — 계획 목록/카드/상세뷰 (REFACTOR-2: plans.js 분리) ───
// ─── PLANS (교육계획) ──────────────────────────────────────────────────────

// FO 정책 연동용: BO service_policies + VOrg 템플릿 DB 프리로드
// var 재선언 금지 — bo_data.js에 let VORG_TEMPLATES 선언이 있어 SyntaxError 방지
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

  // ── VOrg 템플릿(virtual_org_templates) 항상 로드 (코드 매핑에 필요) ──
  try {
    const { data: vorgRows } = await getSB()
      .from("virtual_org_templates")
      .select("id, name, isolation_group_id, tenant_id");
    // isolation_groups에서 owned_accounts 가져오기
    const igIds = (vorgRows || []).map(r => r.isolation_group_id).filter(Boolean);
    let igMap = {};
    if (igIds.length > 0) {
      try {
        const { data: igRows } = await getSB()
          .from("isolation_groups")
          .select("id, owned_accounts")
          .in("id", igIds);
        (igRows || []).forEach(ig => { igMap[ig.id] = ig.owned_accounts || []; });
      } catch(e) { console.warn("[FO] isolation_groups 로드 실패:", e.message); }
    }
    if (vorgRows) {
      vorgRows.forEach((row) => {
        const mapped = {
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          code: row.id, // virtual_org_templates has no code field, use id
          ownedAccounts: igMap[row.isolation_group_id] || [],
          globalAdminKeys: [],
        };
        const tpl = typeof VORG_TEMPLATES !== "undefined" ? VORG_TEMPLATES : [];
        const idx = tpl.findIndex((g) => g.id === mapped.id);
        if (idx >= 0) tpl[idx] = mapped;
        else tpl.push(mapped);
      });
    }
  } catch (e) {
    console.warn("[FO] VOrg 템플릿 로드 실패:", e.message);
  }

  // ── 페르소나의 VOrg 템플릿 ID 결정 ──────────────────────────────────
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
      console.warn("[FO] VOrg 템플릿 조회 실패:", e.message);
    }
  }

  // ── ①단계: 스냅샷 API 조회 (Edge Cache 활용, DB 로드로 보완) ─────────────
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
              `[FO] 스냅샷 원복 완료 (VOrg: ${vorgId}, 정책 ${policies.length}건 - DB로드로 보완함)`,
            );
          }
        }
      }
    } catch (e) {
      console.warn(
        "[FO] 스냅샷 API 조회 실패, DB 직접 조회로 전환:",
        e.message,
      );
    }
  }

  // ── ②단계: 항상 DB 로드 (다중 격리그룹 사용자 지원) ────────────────────────
  // 스냅샷은 캐시 보완용 — DB 로드는 항상 실행해야 모든 정책을 받을 수 있음
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
          `[FO] DB 로드 완료 (정책 ${sPols.length}건, 다중그룹 코드 포함)`,
        );
      }
    } catch (e) {
      console.warn("[FO] 서비스 정맠 DB 로드 실패:", e.message);
    }
  }

  await _loadAccountNames();
  _foServicePoliciesLoaded = true;
}

let _accountNameCache = {};
async function _loadAccountNames() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  try {
    const { data } = await sb.from("budget_accounts")
      .select("code, name")
      .eq("tenant_id", currentPersona?.tenantId || "HMC");
    if (data) {
      data.forEach(r => {
        if (r.code) _accountNameCache[r.code] = r.name;
      });
    }
  } catch (e) {
    console.warn("[FO] 예산 계정명 로드 실패:", e.message);
  }
}

// ─── 수요예측 마감 조회 헬퍼 (제도그룹 기반) ─────────────────────────────
// vorgTemplateId: virtual_org_templates.id (text 타입)
async function _checkForecastDeadline(tenantId, fiscalYear, vorgTemplateIds) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return null;
  try {
    const { data: rows } = await sb
      .from("forecast_deadlines")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("fiscal_year", fiscalYear);
    if (!rows || rows.length === 0) return null;

    let dl = null;
    const vIds = Array.isArray(vorgTemplateIds) ? vorgTemplateIds : (vorgTemplateIds ? [vorgTemplateIds] : []);
    
    // 1. vorg_template_id 가 일치하는 것
    if (vIds.length > 0) {
      dl = rows.find((r) => vIds.includes(r.vorg_template_id));
    }
    
    // 2. target_accounts 와 currentPersona.allowedAccounts 가 교집합이 있는 것 (최우선 순위 권한 기반)
    if (!dl && typeof currentPersona !== "undefined" && currentPersona.allowedAccounts) {
      dl = rows.find(r => {
        if (!r.target_accounts || !Array.isArray(r.target_accounts) || r.target_accounts.length === 0) return false;
        if (currentPersona.allowedAccounts.includes("*")) return true;
        return r.target_accounts.some(acc => currentPersona.allowedAccounts.includes(acc));
      });
    }

    // 3. __ALL__ 폴백
    if (!dl) dl = rows.find((r) => r.account_code === "__ALL__");
    
    if (!dl) return null;
    // 수동 마감 체크
    if (dl.is_closed) return { ...dl, status: "closed" };
    // 기간 기반 자동 판별
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

// 교육계획 수립 상태
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
    locations: [],   // Phase5: 교육장소 멀티 선택 (배열, 선택사항)
    amount: "",
    content: "",
    calcGrounds: [],
    hardLimitViolated: false,
    editId: null, // 임시저장 편집 ID
    confirmMode: false, // 작성확인 화면 모드
  };
}

// 계획 목록 뷰 상태
let _planViewTab = "mine"; // 'mine' | 'team'
let _planYear = new Date().getFullYear(); // 연도 필터
let _lastPlansMode = null; // 모드 전환 감지용

// ── Phase1: 4계층 네비게이션 상태 ────────────────────────────────────────────
let _selectedVorgId = null;      // 현재 선택된 제도그룹(VOrg) ID
let _selectedVorgName = null;    // 제도그룹 표시명
let _selectedAccountCode = null; // 현재 선택된 예산계정 코드
let _selectedAccountName = null; // 계정 표시명
let _userVorgList = [];          // 사용자 소속 VOrg 목록
let _userAccountList = [];       // 선택된 VOrg의 계정 목록
let _selectedVorgOwnedAccounts = []; // 선택된 VOrg의 owned 계정 코드 목록 (DB에서 로드)
let _accountBudgetMap = {};      // 계정코드 → 예산정보 캐시
let _activeCampaignForAccount = null; // 계정에 해당하는 활성 캠페인

// 모드 전환 시 캐시 완전 초기화
function _resetPlansCacheForModeSwitch() {
  _plansDbLoaded = false;
  _dbMyPlans = [];
  _plansDbCache = [];
  _teamPlansLoaded = false;
  _dbTeamPlans = [];
  _forecastDeadlinesCache = null;
  _selectedPlans = [];
  _selectionAccount = null;
  _planStatusFilter = 'all';
  _planAccountFilter = '';
  // Phase1: 네비게이션 상태도 초기화
  _selectedVorgId = null;
  _selectedVorgName = null;
  _selectedAccountCode = null;
  _selectedAccountName = null;
  _userVorgList = [];
  _userAccountList = [];
  _selectedVorgOwnedAccounts = [];
  _accountBudgetMap = {};
  _activeCampaignForAccount = null;
  console.log('[MODE SWITCH] 캐시 초기화 완료:', window.plansMode);
}

// --- Batch Submission State ---
let _selectedPlans = [];
let _selectionAccount = null;

function _togglePlanSelection(event, planId, accountCode) {
  event.stopPropagation();
  const isChecked = event.target.checked;
  
  if (isChecked) {
    if (_selectedPlans.length === 0) {
      _selectionAccount = accountCode;
    } else if (_selectionAccount !== accountCode) {
      alert("같은 예산 계정(Account)의 계획만 함께 상신할 수 있습니다.");
      event.target.checked = false;
      return;
    }
    if (!_selectedPlans.includes(planId)) _selectedPlans.push(planId);
  } else {
    _selectedPlans = _selectedPlans.filter(id => id !== planId);
    if (_selectedPlans.length === 0) {
      _selectionAccount = null;
    }
  }
  renderPlans();
}

// ── 영문 KEY → 한글 라벨 변환 맵 ──
const _FO_PURPOSE_LABEL = {
  external_personal: "개인직무 사외학습",
  elearning_class: "이러닝/집합(비대면) 운영",
  conf_seminar: "워크샵/세미나/콘퍼런스 등 운영",
  misc_ops: "기타 운영",
};
const _FO_EDU_TYPE_LABEL = {
  regular: "정규교육",
  elearning: "이러닝",
  class: "집합",
  live: "라이브",
  academic: "학술 및 연구활동",
  conf: "학회/컨퍼런스",
  seminar: "세미나",
  knowledge: "지식자원 학습",
  book: "도서구입",
  online: "온라인콘텐츠",
  competency: "역량개발지원",
  lang: "어학학습비 지원",
  cert: "자격증 취득지원",
  집합교육: "집합교육",
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

// #7: 필터 상태 변수
let _planStatusFilter = 'all'; // all | saved | pending | approved | rejected
let _planAccountFilter = ''; // '' = 전체

function _mapDbStatus(s) {
  const m = {
    draft: "작성중",
    pending: "신청중",
    approved: "승인완료",
    completed: "완료",
    rejected: "반려",
    cancelled: "취소",
  };
  return m[s] || s || "신청중";
}

let _isFetchingForecasts = false;
let _forecastDeadlinesCache = null;

// ── 캠페인 데이터 인라인 로드 (목록과 함께 표시) ──
async function _fetchForecastCampaignsInline() {
  if (_isFetchingForecasts) return;
  _isFetchingForecasts = true;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb.from("forecast_deadlines")
        .select("*")
        .eq("tenant_id", currentPersona.tenantId);
      const now = new Date(); now.setHours(0,0,0,0);
      _forecastDeadlinesCache = (data || []).filter(dl => {
        if (dl.recruit_start && now < new Date(dl.recruit_start)) return false;
        if (!dl.target_accounts || !Array.isArray(dl.target_accounts) || dl.target_accounts.length === 0) return false;
        const allowed = currentPersona.allowedAccounts || [];
        if (!allowed.includes("*")) {
          if (!dl.target_accounts.some(acc => allowed.includes(acc))) return false;
        }
        return true;
      });
    } catch (e) {
      _forecastDeadlinesCache = [];
    }
  } else {
    _forecastDeadlinesCache = [];
  }
  _isFetchingForecasts = false;
  renderPlans(); // 로드 완료 후 목록 재렌더링
}

// ── 캠페인 섹션 HTML 빌드 (목록 상단에 삽입) ──
function _buildForecastCampaignHtml() {
  const campaigns = _forecastDeadlinesCache || [];
  if (campaigns.length === 0) {
    return `<div style="padding:40px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB;margin-bottom:8px">
      <div style="font-size:32px;margin-bottom:12px">📢</div>
      <div style="font-size:14px;font-weight:900;color:#374151">현재 진행 중인 전사 사업계획 캠페인이 없습니다.</div>
    </div>`;
  }
  return `<div style="margin-bottom:8px">
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Campaign</div>
    <h2 class="text-2xl font-black text-brand tracking-tight mb-4">전사 사업계획 수립 캠페인</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
    ${campaigns.map(c => {
      const now = new Date(); now.setHours(0,0,0,0);
      const isClosed = c.is_closed || (c.recruit_end && now > new Date(c.recruit_end));
      const targetIds = Array.isArray(c.target_accounts) ? c.target_accounts : [];
      const badges = targetIds.map(code => `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#E0E7FF;color:#4338CA;font-size:10px;font-weight:800;margin-right:4px">💳 ${code}</span>`).join('');
      const encodedTargets = encodeURIComponent(JSON.stringify(targetIds));
      return `
      <div ${isClosed ? '' : `onclick="_planYear=${c.fiscal_year};startPlanWizard('forecast', ${c.fiscal_year}, '${encodedTargets}')"`}
           style="padding:24px 20px;border-radius:16px;background:${isClosed ? '#F9FAFB' : 'white'};border:1.5px solid ${isClosed ? '#E5E7EB' : '#BFDBFE'};cursor:${isClosed ? 'not-allowed' : 'pointer'};box-shadow:0 4px 12px rgba(0,0,0,0.04);transition:all 0.15s;opacity:${isClosed ? '0.7' : '1'}"
           ${isClosed ? '' : `onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(37,99,235,0.1)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.04)'"`}>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="font-size:13px;font-weight:900;color:white;background:${isClosed ? '#9CA3AF' : 'linear-gradient(135deg,#1D4ED8,#7C3AED)'};padding:5px 12px;border-radius:8px;letter-spacing:-.2px">${c.fiscal_year}년</div>
            <div style="font-size:12px;font-weight:900;color:${isClosed ? '#6B7280' : '#1D4ED8'};background:${isClosed ? '#E5E7EB' : '#EFF6FF'};padding:4px 10px;border-radius:8px;">🎯 예산 수요예측</div>
          </div>
          <div style="font-size:11px;font-weight:800;color:${isClosed ? '#4B5563' : '#DC2626'};background:${isClosed ? '#E5E7EB' : '#FEF2F2'};padding:4px 8px;border-radius:6px;">${isClosed ? '🔒 마감됨' : '⏳ 마감: ' + (c.recruit_end ? c.recruit_end.substring(0,10) : '상시')}</div>
        </div>
        <div style="margin-bottom:8px">${badges}</div>
        <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:8px;line-height:1.4">${c.title || c.fiscal_year + '년도 전사 사업계획 (수요예측)'}</div>
        <div style="font-size:13px;color:#6B7280;line-height:1.5">${c.description || '차년도(또는 당해) 필요한 교육 예산을 사전에 확보하기 위한 기안입니다.'}</div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #E5E7EB;font-size:13px;font-weight:800;color:${isClosed ? '#9CA3AF' : '#2563EB'};display:flex;align-items:center;justify-content:${isClosed ? 'center' : 'space-between'}">
          <span>${isClosed ? '마감된 캠페인입니다' : '참여하여 계획 수립하기'}</span>
          ${isClosed ? '' : '<span style="font-size:16px">→</span>'}
        </div>
      </div>`;
    }).join('')}
    </div>
  </div>`;
}

async function _renderForecastDashboard() {
  const container = document.getElementById("page-plans");
  if (_isFetchingForecasts) return;

  if (!_forecastDeadlinesCache) {
    _isFetchingForecasts = true;
    container.innerHTML = `<div style="padding:100px;text-align:center;color:#6B7280;font-weight:bold;font-size:14px;">수요예측 캠페인 조회 중...</div>`;
    const sb = typeof getSB === "function" ? getSB() : null;
    if (sb) {
      try {
        let query = sb.from("forecast_deadlines")
          .select("*")
          .eq("tenant_id", currentPersona.tenantId);
          
        const { data } = await query;
        

        const now = new Date();
        now.setHours(0,0,0,0);
        
        _forecastDeadlinesCache = (data || []).filter(dl => {
            // 접수 시작 전인 캠페인은 노출하지 않음
            if (dl.recruit_start && now < new Date(dl.recruit_start)) return false;
            
            // 권한 필터링 (대상 계정이 지정되지 않은 과거 가비지 데이터 노출 방지)
            if (!dl.target_accounts || !Array.isArray(dl.target_accounts) || dl.target_accounts.length === 0) {
              return false;
            }
            
            const allowed = currentPersona.allowedAccounts || [];
            if (!allowed.includes("*")) {
              const intersection = dl.target_accounts.filter(acc => allowed.includes(acc));
              if (intersection.length === 0) return false;
            }

            return true;
        });
      } catch (e) {
        _forecastDeadlinesCache = [];
      }
    } else {
        _forecastDeadlinesCache = [];
    }
    _isFetchingForecasts = false;
  }

  const campaigns = _forecastDeadlinesCache;
  let listHtml = "";
  if (campaigns.length === 0) {
    listHtml = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
        <div style="font-size:48px;margin-bottom:16px">📢</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">현재 진행 중인 전사 수요예측 캠페인이 없습니다.</div>
        <div style="font-size:12px;color:#9CA3AF">당해 연도 계획은 [교육계획(상시)] 메뉴를 이용해 상시계획으로 수립해 주세요.</div>
      </div>`;
  } else {
    listHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(300px, 1fr));gap:16px">
      ${campaigns.map(c => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const isClosed = c.is_closed || (c.recruit_end && now > new Date(c.recruit_end));
        
        // 배지 렌더링
        const targetIds = Array.isArray(c.target_accounts) ? c.target_accounts : [];
        const accountBadges = targetIds.length > 0
          ? targetIds.map(code => `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#E0E7FF;color:#4338CA;font-size:10px;font-weight:800;margin-right:4px">💳 ${code}</span>`).join('')
          : '';

        // 시작 버튼 이벤트: target_accounts 정보를 배열로 묶어서 JSON 문자열로 전달
        const encodedTargets = encodeURIComponent(JSON.stringify(targetIds));

        return `
        <div ${isClosed ? '' : `onclick="_planYear=${c.fiscal_year};startPlanWizard('forecast', ${c.fiscal_year}, '${encodedTargets}')"`} 
             style="padding:24px 20px;border-radius:16px;background:${isClosed ? '#F9FAFB' : 'white'};border:1.5px solid ${isClosed ? '#E5E7EB' : '#BFDBFE'};cursor:${isClosed ? 'not-allowed' : 'pointer'};box-shadow:0 4px 12px rgba(0,0,0,0.04);transition:all 0.15s;opacity:${isClosed ? '0.7' : '1'}"
             ${isClosed ? '' : `onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(37,99,235,0.1)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.04)'"`}>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-size:13px;font-weight:900;color:white;background:${isClosed ? '#9CA3AF' : 'linear-gradient(135deg,#1D4ED8,#7C3AED)'};padding:5px 12px;border-radius:8px;letter-spacing:-.2px">${c.fiscal_year}년</div>
              <div style="font-size:12px;font-weight:900;color:${isClosed ? '#6B7280' : '#1D4ED8'};background:${isClosed ? '#E5E7EB' : '#EFF6FF'};padding:4px 10px;border-radius:8px;">🎯 예산 수요예측</div>
            </div>
            <div style="font-size:11px;font-weight:800;color:${isClosed ? '#4B5563' : '#DC2626'};background:${isClosed ? '#E5E7EB' : '#FEF2F2'};padding:4px 8px;border-radius:6px;">${isClosed ? '🔒 마감됨' : '⏳ 마감: ' + (c.recruit_end ? c.recruit_end.substring(0,10) : '상시')}</div>
          </div>
          <div style="margin-bottom:8px">${accountBadges}</div>
          <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:8px;line-height:1.4">${c.title || c.fiscal_year + '년도 전사 수요예측 (정기)'}</div>
          <div style="font-size:13px;color:#6B7280;line-height:1.5">${c.description || '차년도(또는 당해) 필요한 교육 예산을 사전에 확보하기 위한 기안입니다.'}</div>
          <div style="margin-top:20px;padding-top:16px;border-top:1px dashed #E5E7EB;font-size:13px;font-weight:800;color:${isClosed ? '#9CA3AF' : '#2563EB'};display:flex;align-items:center;justify-content:${isClosed ? 'center' : 'space-between'}">
            <span>${isClosed ? '마감된 캠페인입니다' : '참여하여 계획 수립하기'}</span>
            ${isClosed ? '' : '<span style="font-size:16px">→</span>'}
          </div>
        </div>
        `}).join('')}
    </div>`;
  }

  container.innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 수요예측</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">전사 수요예측 캠페인</h1>
      <p class="text-gray-500 text-sm mt-1">사전에 대규모로 예산을 확보하기 위한 정기 기안 캠페인입니다.</p>
    </div>
  </div>
  ${listHtml}
</div>`;
}

// ══════════════════════════════════════════════════════════════════════
// Phase 1 — L1: 제도그룹(VOrg) 허브
// VOrg가 1개이면 자동 스킵, 2개 이상이면 카드 선택 화면 표시
// ══════════════════════════════════════════════════════════════════════
async function _renderVorgHub() {
  const container = document.getElementById('page-plans');
  if (!container) return;
  const isBusiness = (window.plansMode || 'operation') === 'forecast';
  const modeLabel = isBusiness ? '사업계획' : '운영계획';
  const modeIcon  = isBusiness ? '📋' : '🛠';

  // VOrg ID 목록 수집 (currentPersona에서)
  let vorgIds = [];
  if (Array.isArray(currentPersona?.vorgIds) && currentPersona.vorgIds.length > 0) {
    vorgIds = currentPersona.vorgIds;
  } else if (currentPersona?.vorgId) {
    vorgIds = [currentPersona.vorgId];
  } else if (currentPersona?.domainId) {
    vorgIds = [currentPersona.domainId];
  }

  if (vorgIds.length === 0) {
    // VOrg 정보 없으면 계정 허브로 직행 (전체 계정 표시)
    _selectedVorgId = 'default';
    _selectedVorgName = '기본 제도그룹';
    _selectedVorgOwnedAccounts = [];
    renderPlans();
    return;
  }

  // 로딩 표시
  container.innerHTML = `<div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 제도그룹 조회 중...</div>`;

  // DB에서 직접 VOrg 명칭 + ownedAccounts 조회
  const sb = typeof getSB === 'function' ? getSB() : null;
  let fetchedVorgs = [];
  if (sb && vorgIds.length > 0) {
    try {
      const { data } = await sb.from('virtual_org_templates')
        .select('id, name, isolation_group_id')
        .in('id', vorgIds);
      if (data && data.length > 0) {
        // isolation_groups에서 owned_accounts 가져오기
        const igIds = data.map(r => r.isolation_group_id).filter(Boolean);
        let igMap = {};
        if (igIds.length > 0) {
          try {
            const { data: igRows } = await sb.from('isolation_groups')
              .select('id, owned_accounts').in('id', igIds);
            (igRows || []).forEach(ig => { igMap[ig.id] = ig.owned_accounts || []; });
          } catch(e) {}
        }
        fetchedVorgs = data.map(row => ({
          id: row.id,
          name: row.name || row.id,
          ownedAccounts: igMap[row.isolation_group_id] || [],
        }));
      }
    } catch(e) { console.warn('[VorgHub] DB fetch failed:', e.message); }
  }

  // VORG_TEMPLATES 폴백 (DB 조회 실패 시)
  const templates = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const vorgItems = vorgIds.map(vid => {
    const fetched = fetchedVorgs.find(f => f.id === vid);
    const tpl = templates.find(t => t.id === vid || t.code === vid) || {};
    return {
      id: vid,
      name: fetched?.name || tpl.name || vid,
      ownedAccounts: fetched?.ownedAccounts || tpl.ownedAccounts || [],
    };
  }).filter(v => v.id);

  // 단일 VOrg → 자동 선택 후 L2로 스킵
  if (vorgItems.length <= 1) {
    const v = vorgItems[0] || { id: vorgIds[0] || 'default', name: '기본 제도그룹', ownedAccounts: [] };
    _selectedVorgId = v.id;
    _selectedVorgName = v.name;
    _selectedVorgOwnedAccounts = v.ownedAccounts;
    renderPlans();
    return;
  }

  // 복수 VOrg → 선택 카드 UI 렌더링
  _userVorgList = vorgItems;
  container.innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">HOME › ${modeLabel}</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">${modeIcon} 제도그룹 선택</h1>
    <p class="text-gray-500 text-sm mt-1">계획을 수립할 제도그룹을 선택해 주세요.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
    ${vorgItems.map(v => `
    <button onclick="_selectVorg('${v.id}','${v.name.replace(/'/g, '')}')"
      style="text-align:left;padding:28px 24px;border-radius:20px;border:2px solid #E5E7EB;background:white;
             cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.05);transition:all 0.18s"
      onmouseover="this.style.borderColor='#002C5F';this.style.boxShadow='0 8px 28px rgba(0,44,95,0.12)';this.style.transform='translateY(-3px)'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)';this.style.transform='none'">
      <div style="font-size:28px;margin-bottom:12px">🏛</div>
      <div style="font-size:16px;font-weight:900;color:#111827;margin-bottom:4px">${v.name}</div>
      <div style="margin-top:16px;font-size:12px;font-weight:800;color:#002C5F;display:flex;align-items:center;gap:4px">
        선택하기 <span>→</span>
      </div>
    </button>`).join('')}
  </div>
</div>`;
}

function _selectVorg(vorgId, vorgName) {
  _selectedVorgId = vorgId;
  _selectedVorgName = vorgName;
  // _userVorgList에서 ownedAccounts 가져오기 (L2 계정 필터링에 사용)
  const vorgItem = _userVorgList.find(v => v.id === vorgId);
  _selectedVorgOwnedAccounts = vorgItem?.ownedAccounts || [];
  _selectedAccountCode = null;
  _selectedAccountName = null;
  _userAccountList = [];
  renderPlans();
}

// ══════════════════════════════════════════════════════════════════════
// Phase 1 — L2: 예산계정 허브
// 계정이 1개이면 자동 스킵, 2개 이상이면 카드 선택 화면 표시
// ══════════════════════════════════════════════════════════════════════
async function _renderAccountHub() {
  const container = document.getElementById('page-plans');
  if (!container) return;
  const isBusiness = (window.plansMode || 'operation') === 'forecast';
  const modeLabel = isBusiness ? '사업계획' : '운영계획';
  const modeIcon  = isBusiness ? '📋' : '🛠';

  // 로딩 표시
  container.innerHTML = `<div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 예산계정 조회 중...</div>`;

  // 계정 목록: _selectedVorgOwnedAccounts (DB에서 조회한 VOrg 소속 계정 코드 목록)로 필터
  // _renderVorgHub 또는 단일VOrg 자동스킵 시 이미 set됨
  const ownedAccounts = _selectedVorgOwnedAccounts || [];

  // persona 예산에서 이 VOrg의 계정만 필터
  let accountItems = [];
  const budgets = currentPersona?.budgets || [];
  if (ownedAccounts.length > 0) {
    // ownedAccounts 기반 필터 (VOrg에 속한 계정만)
    accountItems = budgets.filter(b =>
      ownedAccounts.some(ac => ac === b.accountCode || ac === b.id)
    );
  } else {
    // ownedAccounts 비어있으면 allowedAccounts 기반 (단일VOrg 자동스킵 or 정보 없는 경우)
    const allowed = currentPersona?.allowedAccounts || [];
    if (allowed.includes('*')) {
      accountItems = budgets;
    } else {
      accountItems = budgets.filter(b => allowed.includes(b.accountCode));
    }
  }

  // 중복 제거 (accountCode 기준)
  const seen = new Set();
  accountItems = accountItems.filter(b => {
    if (seen.has(b.accountCode)) return false;
    seen.add(b.accountCode);
    return true;
  });

  // 계정이 0개 → 빈 안내
  if (accountItems.length === 0) {
    container.innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
      HOME › <span onclick="_selectedVorgId=null;renderPlans()" style="cursor:pointer;text-decoration:underline">${modeLabel}</span> › 예산계정
    </div>
    <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1>
  </div>
  <div style="padding:60px 20px;text-align:center;border-radius:16px;background:#FFF9F9;border:1.5px dashed #FCA5A5">
    <div style="font-size:36px;margin-bottom:12px">⚠️</div>
    <div style="font-size:14px;font-weight:900;color:#DC2626">이 제도그룹에 배정된 예산계정이 없습니다.</div>
    <div style="font-size:12px;color:#9CA3AF;margin-top:6px">관리자에게 예산 배정을 요청해 주세요.</div>
    <button onclick="_selectedVorgId=null;renderPlans()" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer">← 제도그룹 선택으로</button>
  </div>
</div>`;
    return;
  }

  // 계정이 1개 → 자동 선택 후 L3로 스킵
  if (accountItems.length === 1) {
    const a = accountItems[0];
    _selectedAccountCode = a.accountCode;
    _selectedAccountName = a.name;
    renderPlans();
    return;
  }

  // 복수 계정 → 선택 카드 UI 렌더링
  _userAccountList = accountItems;

  // 사업계획 모드: 캠페인 데이터 미리 로드
  if (isBusiness && !_forecastDeadlinesCache && !_isFetchingForecasts) {
    _isFetchingForecasts = true;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (sb) {
      try {
        const { data } = await sb.from('forecast_deadlines')
          .select('*').eq('tenant_id', currentPersona.tenantId);
        const now = new Date(); now.setHours(0,0,0,0);
        _forecastDeadlinesCache = (data || []).filter(dl => {
          if (dl.recruit_start && now < new Date(dl.recruit_start)) return false;
          if (!dl.target_accounts || dl.target_accounts.length === 0) return false;
          const allowed = currentPersona.allowedAccounts || [];
          if (!allowed.includes('*')) {
            if (!dl.target_accounts.some(acc => allowed.includes(acc))) return false;
          }
          return true;
        });
      } catch(e) { _forecastDeadlinesCache = []; }
    } else { _forecastDeadlinesCache = []; }
    _isFetchingForecasts = false;
  }

  const showBack = (_userVorgList.length > 1);
  const campaigns = _forecastDeadlinesCache || [];

  container.innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
        HOME › ${showBack ? `<span onclick="_selectedVorgId=null;renderPlans()" style="cursor:pointer;text-decoration:underline">${modeLabel}</span>` : modeLabel} › 예산계정
      </div>
      <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1>
      <p class="text-gray-500 text-sm mt-1">${_selectedVorgName || modeLabel} · 계획을 수립할 예산계정을 선택하세요.</p>
    </div>
    ${showBack ? `<button onclick="_selectedVorgId=null;renderPlans()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">← 제도그룹</button>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
    ${accountItems.map(b => {
      const balance   = (b.balance || 0);
      const used      = (b.used || 0);
      const remaining = balance - used;
      const pct       = balance > 0 ? Math.round(remaining / balance * 100) : 0;
      const barColor  = pct < 20 ? '#EF4444' : pct < 50 ? '#F59E0B' : '#10B981';
      const barBg     = pct < 20 ? '#FEE2E2' : pct < 50 ? '#FEF9C3' : '#D1FAE5';
      // 이 계정을 타겟으로 하는 활성 캠페인
      const cam = campaigns.find(c => Array.isArray(c.target_accounts) && c.target_accounts.includes(b.accountCode));
      const now2 = new Date(); now2.setHours(0,0,0,0);
      const camClosed = cam && (cam.is_closed || (cam.recruit_end && now2 > new Date(cam.recruit_end)));
      const camBadge = cam
        ? camClosed
          ? `<div style="font-size:11px;color:#6B7280;font-weight:800;margin-top:6px">🔒 캠페인 마감됨</div>`
          : (() => {
              const d = cam.recruit_end ? Math.ceil((new Date(cam.recruit_end) - now2) / 86400000) : null;
              return `<div style="font-size:11px;color:#DC2626;font-weight:800;margin-top:6px">📅 캠페인 D-${d !== null ? d : '?'} · ${cam.recruit_end ? cam.recruit_end.substring(0,10) : '상시'}</div>`;
            })()
        : '';
      return `
    <button onclick="_selectAccount('${b.accountCode}','${(b.name||b.accountCode).replace(/'/g,'')}')"
      style="text-align:left;padding:24px 22px;border-radius:20px;border:2px solid #E5E7EB;background:white;
             cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.05);transition:all 0.18s"
      onmouseover="this.style.borderColor='#002C5F';this.style.boxShadow='0 8px 28px rgba(0,44,95,0.12)';this.style.transform='translateY(-3px)'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)';this.style.transform='none'">
      <div style="font-size:12px;font-weight:900;color:#6B7280;margin-bottom:8px">💳 ${b.accountCode || ''}</div>
      <div style="font-size:17px;font-weight:900;color:#111827;margin-bottom:14px">${b.name || b.accountCode}</div>
      ${balance > 0 ? `
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;color:#6B7280;font-weight:700">잔액</span>
          <span style="font-size:11px;font-weight:900;color:${barColor}">${remaining.toLocaleString()}원 (${pct}%)</span>
        </div>
        <div style="height:6px;border-radius:3px;background:#F3F4F6;overflow:hidden">
          <div style="height:100%;width:${100-pct}%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
        </div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:4px">배정 ${balance.toLocaleString()}원</div>
      </div>` : `<div style="font-size:12px;color:#9CA3AF;margin-bottom:14px">⏳ 예산 미배정</div>`}
      ${camBadge}
      <div style="margin-top:14px;font-size:12px;font-weight:800;color:#002C5F;display:flex;align-items:center;gap:4px">
        계획 목록 보기 <span>→</span>
      </div>
    </button>`;
    }).join('')}
  </div>
</div>`;
}

function _selectAccount(accountCode, accountName) {
  _selectedAccountCode = accountCode;
  _selectedAccountName = accountName;
  _plansDbLoaded = false;
  _dbMyPlans = [];
  _plansDbCache = [];
  _teamPlansLoaded = false;
  _dbTeamPlans = [];
  renderPlans();
}

function renderPlans() {
  console.log('[renderPlans] plansMode:', window.plansMode);

  // ★ 모드 전환 감지 → 캐시 완전 초기화
  const currentMode = window.plansMode || 'operation';
  if (_lastPlansMode && _lastPlansMode !== currentMode) {
    _resetPlansCacheForModeSwitch();
  }
  _lastPlansMode = currentMode;

  const isBusiness = currentMode === 'forecast';

  // FO 정책 DB 로드 (최초 1회, 완료 후 목록 자동 갱신)
  if (!_foServicePoliciesLoaded) {
    _loadFoPolicies().then(() => renderPlans());
    return;
  }

  // 상세 뷰
  if (_viewingPlanDetail) {
    document.getElementById("page-plans").innerHTML =
      _renderPlanDetailView(_viewingPlanDetail);
    return;
  }
  // 작성확인 화면
  if (planState && planState.confirmMode) {
    renderPlanConfirm();
    return;
  }
  // 위저드 뷰
  if (planState) {
    renderPlanWizard();
    return;
  }

  // ── Phase1: 4계층 라우팅 ─────────────────────────────────────────────────
  // 계정이 선택되지 않았으면 허브 화면 먼저 표시
  if (!_selectedAccountCode) {
    // VOrg가 선택되지 않았으면 VOrg 허브 (단일이면 자동 스킵)
    if (!_selectedVorgId) {
      _renderVorgHub();
      return;
    }
    // VOrg는 선택됐으나 계정 미선택이면 계정 허브
    _renderAccountHub();
    return;
  }
  // 계정 선택됨 → 아래의 계획 목록 렌더링으로 진행

  // 사업계획 모드: 캠페인 데이터 비동기 로드 (목록과 함께 표시)
  if (isBusiness && !_forecastDeadlinesCache && !_isFetchingForecasts) {
    _fetchForecastCampaignsInline();
    // 목록 렌더링은 캠페인 로드 완료 후 자동 진행
  }

  // 팀 뷰 허용 여부 (persona의 teamViewEnabled 또는 team_view_enabled)
  const teamViewEnabled =
    currentPersona.teamViewEnabled ?? currentPersona.team_view_enabled ?? false;

  // DB 실시간 조회
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !_plansDbLoaded) {
    _plansDbLoaded = true;
    // 크로스 테넌트: 총괄부서면 양쪽 회사 계획 조회
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
          tenantId: d.tenant_id, // 크로스 테넌트 뱃지용
          fiscalYear: d.fiscal_year, // 연도 필터링을 위한 속성 추가
        }));
        _plansDbCache = data;
      }
      renderPlans();
    })();
    return;
  }
  const myPlans = _dbMyPlans;
  // 팀 뷰: DB에서 같은 org_id 멤버의 plans 조회
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
          // 내 조직 ID + 크로스 테넌트 연결 조직 ID 수집
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
          // 조직 필터: applicant_org_id가 있으면 사용, 없으면 org_id
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
            fiscalYear: d.fiscal_year, // 연도 필터링을 위한 속성 추가
          }));
          renderPlans();
        })();
      }
      return;
    }
    teamPlans = _dbTeamPlans;
  }
  const plans = _planViewTab === "mine" ? myPlans : teamPlans;

  // ★ plan_type 필터 (사업계획/운영계획 분리 핵심)
  const targetPlanType = isBusiness ? 'business' : 'operation';
  // DB 원본에서 plan_type으로 선필터
  const typePlans = plans.filter(p => {
    // DB plan_type 매칭: _plansDbCache에서 plan_type 확인
    const dbPlan = (_plansDbCache || []).find(d => d.id === p.id);
    const pType = dbPlan?.plan_type || 'operation';
    return pType === targetPlanType || (isBusiness && pType === 'forecast');
  });

  // #7: 상태/계정/연도 필터 적용
  const uniqueAccounts = [...new Set(typePlans.map(p => p.account || '').filter(Boolean))];
  const filteredPlans = typePlans.filter(p => {
    const rawSt = p.status || '';
    
    // 연도 필터 (필수)
    const yearMatch = p.fiscalYear === _planYear;
    
    // 상태 필터 매치
    const statusMatch = _planStatusFilter === 'all' ||
      ((_planStatusFilter === 'saved') && (rawSt === 'saved' || rawSt === '저장완료')) ||
      ((_planStatusFilter === 'pending') && (rawSt === 'pending' || rawSt === 'submitted' || rawSt === 'in_review' || rawSt === '신청중' || rawSt === '결재진행중')) ||
      ((_planStatusFilter === 'approved') && (rawSt === 'approved' || rawSt === '승인완료')) ||
      ((_planStatusFilter === 'rejected') && (rawSt === 'rejected' || rawSt === '반려'));
    
    // 계정 필터 매치
    const accountMatch = !_planAccountFilter || p.account === _planAccountFilter;
    
    return yearMatch && statusMatch && accountMatch;
  });

  // 통계 (현재 선택된 연도 + plan_type 기준)
  const currentYearPlans = typePlans.filter(p => p.fiscalYear === _planYear);
  const stats = {
    total: currentYearPlans.length,
    saved: currentYearPlans.filter(p => p.status === 'saved' || p.status === '저장완료').length,
    active: currentYearPlans.filter(
      (p) =>
        p.status === "승인완료" ||
        p.status === "approved" ||
        p.status === "신청중" ||
        p.status === "진행중" ||
        p.status === "결재진행중",
    ).length,
    done: currentYearPlans.filter((p) => p.status === "완료").length,
    rejected: currentYearPlans.filter((p) => p.status === "반려" || p.status === "rejected").length,
    draft: currentYearPlans.filter((p) => p.status === "작성중" || p.status === "draft").length,
  };

  // 연도 선택
  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_planYear=Number(this.value);renderPlans()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map((y) => `<option value="${y}" ${_planYear === y ? "selected" : ""}>${y}년</option>`).join("")}
  </select>`;

  // 탭 UI (개선: 하이라이트 강화, 팀 탭 건수 뱃지)
  const teamSavedCount = isBusiness ? (_dbTeamPlans||[]).filter(p => (p.status==='saved'||p.status==='저장완료') && p.fiscalYear===_planYear).length : 0;
  const tabBar = teamViewEnabled
    ? `
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:24px">
    <button onclick="_planViewTab='mine';renderPlans()" style="
      padding:10px 22px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;
      background:transparent;position:relative;
      color:${_planViewTab === 'mine' ? '#002C5F' : '#9CA3AF'};
      border-bottom:${_planViewTab === 'mine' ? '2.5px solid #002C5F' : '2.5px solid transparent'};
      margin-bottom:-2px">
      👤 내 교육계획
    </button>
    <button onclick="_planViewTab='team';renderPlans()" style="
      padding:10px 22px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;
      background:transparent;position:relative;
      color:${_planViewTab === 'team' ? '#002C5F' : '#9CA3AF'};
      border-bottom:${_planViewTab === 'team' ? '2.5px solid #002C5F' : '2.5px solid transparent'};
      margin-bottom:-2px">
      👥 팀 교육계획${isBusiness && teamSavedCount > 0 ? ` <span style="font-size:10px;background:#1D4ED8;color:white;padding:1px 7px;border-radius:20px;margin-left:4px">${teamSavedCount}</span>` : ''}
    </button>
  </div>`
    : "";

  // 통계 카드 (개선: 그라디언트 + 큰 숫자 + 소계 정보)
  const statItems = [
    { label: '전체', val: stats.total, sub: `${_planYear}년`, icon: '📋',
      grad: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', color: '#1D4ED8', border: '#BFDBFE' },
    { label: isBusiness ? '결재대기' : '진행중', val: isBusiness ? currentYearPlans.filter(p => p.status==='submitted'||p.status==='결재진행중'||p.status==='신청중').length : stats.active,
      sub: '처리 대기', icon: '⏳',
      grad: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', color: '#D97706', border: '#FDE68A' },
    { label: isBusiness ? '저장완료' : '완료', val: isBusiness ? stats.saved : stats.done,
      sub: isBusiness ? '확정 대기' : '교육 이수', icon: isBusiness ? '📤' : '✅',
      grad: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', color: '#059669', border: '#6EE7B7' },
    { label: '반려', val: stats.rejected, sub: '검토 필요', icon: '❌',
      grad: 'linear-gradient(135deg,#FEF2F2,#FECACA)', color: '#DC2626', border: '#FECACA' },
  ];
  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
    ${statItems.map(s => `
    <div style="background:${s.grad};border-radius:16px;padding:18px 16px;border:1.5px solid ${s.border};position:relative;overflow:hidden">
      <div style="position:absolute;top:12px;right:14px;font-size:20px;opacity:.4">${s.icon}</div>
      <div style="font-size:10px;font-weight:700;color:${s.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${s.label}</div>
      <div style="font-size:28px;font-weight:900;color:${s.color};line-height:1">${s.val}<span style="font-size:12px;font-weight:700;margin-left:2px">건</span></div>
      <div style="font-size:10px;color:${s.color}99;margin-top:4px">${s.sub}</div>
    </div>`).join('')}
  </div>`;

  // 필터 UI (개선: pill 스타일 컬러 배지)
  const filterCfg = [
    { val:'all', label:'전체', ic:'', activeColor:'#1D4ED8', activeBg:'#EFF6FF' },
    { val:'saved', label:'저장완료', ic:'📤', activeColor:'#059669', activeBg:'#ECFDF5' },
    { val:'pending', label:'결재대기', ic:'⏳', activeColor:'#D97706', activeBg:'#FFFBEB' },
    { val:'approved', label:'승인완료', ic:'✅', activeColor:'#059669', activeBg:'#F0FDF4' },
    { val:'rejected', label:'반려', ic:'❌', activeColor:'#DC2626', activeBg:'#FEF2F2' },
  ];
  const filterBar = `
  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:18px;padding:14px 16px;background:#F8FAFF;border-radius:14px;border:1px solid #E8EDF5">
    <span style="font-size:11px;font-weight:700;color:#9CA3AF;margin-right:4px;white-space:nowrap">상태</span>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${filterCfg.map(f => {
        const isActive = _planStatusFilter === f.val;
        return `<button onclick="_planStatusFilter='${f.val}';_plansDbLoaded=false;_dbMyPlans=[];_plansDbCache=[];renderPlans()"
          style="padding:5px 14px;border-radius:100px;font-size:11px;font-weight:800;cursor:pointer;transition:all .15s;
          border:1.5px solid ${isActive ? f.activeColor + '50' : '#E5E7EB'};
          background:${isActive ? f.activeBg : 'white'};
          color:${isActive ? f.activeColor : '#9CA3AF'}">${f.ic ? f.ic + ' ' : ''}${f.label}</button>`;
      }).join('')}
    </div>
    ${uniqueAccounts.length > 1 ? `<select onchange="_planAccountFilter=this.value;renderPlans()"
      style="margin-left:8px;padding:5px 10px;border:1.5px solid #E5E7EB;border-radius:100px;font-size:11px;font-weight:700;cursor:pointer;background:white;color:#374151">
      <option value="">💳 계정 전체</option>
      ${uniqueAccounts.map(a=>`<option value="${a}" ${_planAccountFilter===a?'selected':''}>${_accountNameCache[a] || a}</option>`).join('')}
    </select>` : ''}
    <span style="font-size:11px;color:#9CA3AF;margin-left:auto;white-space:nowrap">결과 <b style="color:#374151">${filteredPlans.length}</b>건</span>
  </div>`;

  // --- Floating Action Bar (Batch Submit) ---
  const selectedPlansData = _selectedPlans.map(id => filteredPlans.find(p => String(p.id) === String(id))).filter(Boolean);
  const totalSelectedAmount = selectedPlansData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  const floatingActionBar = _selectedPlans.length > 0
    ? `<div style="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);background:#002C5F;color:white;padding:16px 24px;border-radius:100px;box-shadow:0 8px 32px rgba(0,44,95,.4);display:flex;align-items:center;gap:20px;z-index:9999;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1)">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="background:rgba(255,255,255,.2);padding:6px 12px;border-radius:20px;font-size:13px;font-weight:900">
            ${_selectedPlans.length}건 선택됨
          </div>
          <div style="font-size:13px;font-weight:800;color:#93C5FD">
            예산 계정: <span style="color:white">${_accountNameCache[_selectionAccount] || _selectionAccount || "-"}</span>
          </div>
          <div style="font-size:13px;font-weight:800;color:#93C5FD">
            총 금액: <span style="color:white">${totalSelectedAmount.toLocaleString()}원</span>
          </div>
        </div>
        <div style="width:1px;height:24px;background:rgba(255,255,255,.2)"></div>
        <div style="display:flex;gap:8px">
          <button onclick="_selectedPlans=[];_selectionAccount=null;renderPlans()" style="padding:8px 16px;border-radius:100px;background:transparent;color:white;border:1px solid rgba(255,255,255,.3);font-size:13px;font-weight:800;cursor:pointer">취소</button>
          <button onclick="_aprBulkSubmitFromTeam([${_selectedPlans.map(id => `'${String(id).replace(/'/g,'')}'`).join(',')}])" style="padding:8px 24px;border-radius:100px;background:#10B981;color:white;border:none;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,.3)">📤 선택 건 일괄 상신</button>
        </div>
       </div>`
    : '';

  // P12: 묶음 상신 배너 (내 계획 탭 + forecast+saved 계획 존재 시)
  const forecastSaved = _planViewTab === 'mine'
    ? (_plansDbCache || []).filter(d => d.plan_type === 'forecast' && d.status === 'saved')
    : [];
  const bundleBar = typeof _foRenderBundleBar === 'function' ? _foRenderBundleBar(forecastSaved) : '';

  // Phase 3: 팀 탭 — 계정별 사업계획 일괄 확정 배너
  // 팀 탭 + 사업계획(forecast) 모드일 때 팀 전체의 saved forecast 계획을 계정별로 그룹핑하여 표시
  const teamForecastBundleBar = (isBusiness && _planViewTab === 'team')
    ? _foRenderTeamForecastBundleBar(_dbTeamPlans, _plansDbCache || [])
    : '';

  // ★ 모드별 페이지 타이틀 & 빈 상태 분리
  const pageTitle = isBusiness ? '사업계획 (수요예측)' : '운영계획 관리 (실행)';
  const planTypeStr = isBusiness ? 'business' : 'operation';
  const planLabelStr = isBusiness ? '사업계획 수립' : '운영계획 수립';
  const emptyIcon = isBusiness ? '📢' : '🛠';
  const emptyTitle = isBusiness
    ? `${_planYear}년 사업계획이 아직 없습니다`
    : `${_planYear}년 운영계획이 아직 없습니다`;
  const emptyDesc = isBusiness
    ? '상단의 전사 캠페인에 참여하여 사업계획을 수립하세요.<br>사업계획이 승인되면 예산이 배정됩니다.'
    : '교육 예산이 배정된 후 운영계획을 수립하면<br>교육 신청 및 집행이 가능합니다.';

  // 캠페인 섹션 (사업계획 모드일 때만)
  const campaignSection = isBusiness ? _buildForecastCampaignHtml() : '';

  // 계획 카드 목록
  const listHtml =
    filteredPlans.length > 0
      ? filteredPlans.map((p) => _renderPlanCard(p)).join("")
      : `<div style="padding:72px 20px;text-align:center;border-radius:20px;background:linear-gradient(135deg,#F8FAFF,#EFF6FF);border:1.5px dashed #BFDBFE">
        <div style="width:72px;height:72px;margin:0 auto 20px;border-radius:50%;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);display:flex;align-items:center;justify-content:center;font-size:36px;box-shadow:0 4px 20px rgba(29,78,216,.12)">${emptyIcon}</div>
        <div style="font-size:16px;font-weight:900;color:#1D4ED8;margin-bottom:8px">${emptyTitle}</div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:28px;line-height:1.7;max-width:280px;margin-left:auto;margin-right:auto">${emptyDesc}</div>
        <button onclick="startPlanWizard('${planTypeStr}', null, '${(_selectedAccountCode||'').replace(/'/g,'')}')" style="padding:13px 32px;border-radius:14px;background:linear-gradient(135deg,#002C5F,#1D4ED8);color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(29,78,216,.35);letter-spacing:.3px">+ ${planLabelStr}</button>
      </div>`;

  document.getElementById("page-plans").innerHTML = `
<div style="max-width:900px;margin:0 auto;padding:0 16px 80px">

  <!-- 헤더 영역: 브레드크럼 + 제목 + 액션 버튼 -->
  <div style="margin-bottom:24px">
    <!-- 브레드크럼 -->
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;flex-wrap:wrap">
      <span style="color:#D1D5DB">HOME</span>
      ${_userVorgList.length > 1 ? `<span style="color:#D1D5DB">›</span><span onclick="_selectedVorgId=null;_selectedAccountCode=null;renderPlans()" style="cursor:pointer;color:#6B7280;font-weight:800">${_selectedVorgName || '제도그룹'}</span>` : ''}
      ${_userAccountList.length > 1 ? `<span style="color:#D1D5DB">›</span><span onclick="_selectedAccountCode=null;renderPlans()" style="cursor:pointer;color:#6B7280;font-weight:800">${_selectedAccountName || '계정선택'}</span>` : ''}
      <span style="color:#D1D5DB">›</span>
      <span style="color:#002C5F">${isBusiness ? '사업계획' : '운영계획'}</span>
    </div>
    <!-- 제목 + 버튼 행 (flex, 줄바꿈 방지) -->
    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:nowrap">
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          ${_selectedAccountName ? `<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:8px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:1px solid #BFDBFE;flex-shrink:0"><span style="font-size:13px">💳</span><span style="font-size:12px;font-weight:800;color:#1D4ED8">${_selectedAccountName}</span></div>` : ''}
          <h1 style="font-size:22px;font-weight:900;color:#111827;letter-spacing:-.3px;white-space:nowrap">${isBusiness ? '사업계획 목록' : '운영계획 목록'}</h1>
        </div>
        <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept}</p>
      </div>
      <!-- 액션 버튼 그룹 -->
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
        ${_userAccountList.length > 1 ? `<button onclick="_selectedAccountCode=null;renderPlans()" style="padding:9px 14px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280;white-space:nowrap" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">← 계정선택</button>` : ''}
        ${yearSelector}
        <button onclick="startPlanWizard('${planTypeStr}', null, '${(_selectedAccountCode||'').replace(/'/g,'')}')" style="padding:10px 20px;border-radius:12px;background:linear-gradient(135deg,#002C5F,#1D4ED8);color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(29,78,216,.3);white-space:nowrap;letter-spacing:.2px" onmouseover="this.style.opacity='.9'" onmouseout="this.style.opacity='1'">+ ${planLabelStr}</button>
      </div>
    </div>
  </div>

  ${tabBar}
  ${statsBar}
  ${filterBar}
  ${bundleBar}
  ${teamForecastBundleBar}
  <div id="fo-realloc-area"></div>
  <div id="plan-list">${listHtml}</div>
</div>
${floatingActionBar}`;
  _foRenderReallocUI();
  // B-1: 카드 렌더링 후 잔여예산 뱃지 비동기 업데이트
  if (filteredPlans.length > 0) {
    setTimeout(() => _updateBudgetBadges(filteredPlans), 300);
  }
}


// 팀 계획 DB 캐시
let _dbTeamPlans = [];
let _teamPlansLoaded = false;

function _renderPlanCard(p) {
  const STATUS_CFG = {
    승인완료: { color: "#059669", bg: "#F0FDF4", border: "#A7F3D0", icon: "✅", grad: "linear-gradient(135deg,#F0FDF4,#ECFDF5)" },
    진행중:  { color: "#059669", bg: "#F0FDF4", border: "#A7F3D0", icon: "✅", grad: "linear-gradient(135deg,#F0FDF4,#ECFDF5)" },
    반려:    { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "❌", grad: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
    결재진행중: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", grad: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
    신청중:  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", grad: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
    승인대기: { color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", icon: "🕐", grad: "linear-gradient(135deg,#F9FAFB,#F3F4F6)" },
    작성중:  { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE", icon: "📝", grad: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
    취소:    { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "🚫", grad: "linear-gradient(135deg,#F9FAFB,#F3F4F6)" },
    저장완료: { color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", icon: "📤", grad: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" },
    // DB 영문 상태 매핑
    draft:    { color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE", icon: "📝", grad: "linear-gradient(135deg,#EFF6FF,#DBEAFE)" },
    saved:    { color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", icon: "📤", grad: "linear-gradient(135deg,#ECFDF5,#D1FAE5)" },
    pending:  { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", grad: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
    submitted:{ color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", icon: "⏳", grad: "linear-gradient(135deg,#FFFBEB,#FEF3C7)" },
    in_review:{ color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", icon: "🔄", grad: "linear-gradient(135deg,#F5F3FF,#EDE9FE)" },
    approved: { color: "#059669", bg: "#F0FDF4", border: "#A7F3D0", icon: "✅", grad: "linear-gradient(135deg,#F0FDF4,#ECFDF5)" },
    rejected: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", icon: "❌", grad: "linear-gradient(135deg,#FEF2F2,#FEE2E2)" },
    recalled: { color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "↩️", grad: "linear-gradient(135deg,#F9FAFB,#F3F4F6)" },
    cancelled:{ color: "#9CA3AF", bg: "#F9FAFB", border: "#E5E7EB", icon: "🚫", grad: "linear-gradient(135deg,#F9FAFB,#F3F4F6)" },
  };

  const STATUS_LABEL = {
    draft: "임시저장", saved: "저장완료", pending: "결재대기",
    submitted: "결재대기", in_review: "1차검토완료", approved: "승인완료",
    rejected: "반려", recalled: "회수됨", cancelled: "취소",
  };

  const rawStatus = p.status || "승인완료";
  const status = STATUS_LABEL[rawStatus] || rawStatus;
  const cfg = STATUS_CFG[rawStatus] || STATUS_CFG[status] || STATUS_CFG["승인대기"];
  const authorBadge = p.author
    ? `<span style="font-size:10px;background:#F3F4F6;color:#6B7280;padding:2px 8px;border-radius:8px;margin-left:4px">👤 ${p.author}</span>`
    : "";
  const isDraft = rawStatus === "draft" || rawStatus === "작성중";
  const isSaved = rawStatus === "saved" || rawStatus === "저장완료";
  const isPending = rawStatus === "pending" || rawStatus === "submitted" || rawStatus === "신청중" || rawStatus === "결재진행중";
  const safeId = String(p.id || "").replace(/'/g, "\\'");
  const safeTitle = (p.title || "").replace(/'/g, "");
  const isSelected = _selectedPlans.includes(p.id);

  // 버튼 스타일 공통 헬퍼
  const btnPrimary = (label, onclick) => `<button onclick="${onclick}" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;background:linear-gradient(135deg,#059669,#047857);color:white;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.25)">${label}</button>`;
  const btnOutline = (label, onclick, color='#1D4ED8', borderColor='#BFDBFE') => `<button onclick="${onclick}" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;background:white;color:${color};border:1.5px solid ${borderColor};cursor:pointer">${label}</button>`;
  const btnDanger  = (label, onclick) => `<button onclick="${onclick}" style="padding:6px 14px;border-radius:8px;font-size:11px;font-weight:800;background:white;color:#DC2626;border:1.5px solid #FECACA;cursor:pointer">${label}</button>`;

  const actionBtns = isDraft
    ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
        ${btnOutline('✏️ 이어쓰기', `resumePlanDraft('${safeId}')`, '#1D4ED8', '#BFDBFE')}
        ${btnOutline('📋 복제', `event.stopPropagation();clonePlan('${safeId}')`, '#7C3AED', '#DDD6FE')}
        ${btnDanger('🗑 삭제', `deletePlanDraft('${safeId}')`)}
       </div>`
    : isSaved
      ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
          ${btnPrimary('📤 상신하기', `event.stopPropagation();_aprSingleSubmitFromPlan('${safeId}','${safeTitle}')`)}
          ${btnOutline('✏️ 수정', `event.stopPropagation();resumePlanDraft('${safeId}')`, '#1D4ED8', '#BFDBFE')}
          ${btnOutline('📋 복제', `event.stopPropagation();clonePlan('${safeId}')`, '#7C3AED', '#DDD6FE')}
         </div>`
      : isPending
        ? `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
            ${btnDanger('취소 요청', `cancelPlan('${safeId}')`)}
            ${btnOutline('📋 복제', `event.stopPropagation();clonePlan('${safeId}')`, '#7C3AED', '#DDD6FE')}
           </div>`
        : (rawStatus === "approved")
          ? (() => {
              const hasAlloc = Number(p.allocated_amount||0) > 0;
              return `<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
              ${hasAlloc ? btnPrimary('📝 교육 신청', `event.stopPropagation();_startApplyFromPlan('${safeId}')`) : ''}
              ${btnOutline('📉 배정액 축소', `event.stopPropagation();foOpenReduceAllocation('${safeId}')`, '#D97706', '#FDE68A')}
              ${btnOutline('📋 복제', `event.stopPropagation();clonePlan('${safeId}')`, '#7C3AED', '#DDD6FE')}
             </div>`;
            })()
          : "";

  return `
    <div onclick="viewPlanDetail('${safeId}')"
      style="display:flex;align-items:flex-start;gap:14px;padding:18px 20px;border-radius:16px;
             border:1.5px solid ${isSelected ? '#1D4ED8' : cfg.border};
             background:${isSelected ? '#EFF6FF' : 'white'};
             box-shadow:${isSelected ? '0 0 0 3px rgba(29,78,216,.1)' : '0 1px 4px rgba(0,0,0,.04)'};
             transition:all .15s;margin-bottom:10px;cursor:pointer;position:relative;overflow:hidden"
      onmouseover="this.style.boxShadow='0 6px 24px rgba(0,0,0,.09)';this.style.transform='translateY(-2px)'"
      onmouseout="this.style.boxShadow='${isSelected ? '0 0 0 3px rgba(29,78,216,.1)' : '0 1px 4px rgba(0,0,0,.04)'}';this.style.transform='none'">
      <!-- 좌측 상태 컬러 바 -->
      <div style="position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:16px 0 0 16px;background:${cfg.color}"></div>
      <!-- 체크박스 (saved 상태만) -->
      ${isSaved ? `
        <div style="flex-shrink:0;padding-top:3px;" onclick="event.stopPropagation()">
          <input type="checkbox"
                 ${isSelected ? 'checked' : ''}
                 ${_selectionAccount && _selectionAccount !== p.account ? 'disabled style="opacity:0.4"' : ''}
                 onchange="_togglePlanSelection(event, '${safeId}', '${p.account || ""}')"
                 style="width:18px;height:18px;cursor:pointer;accent-color:#1D4ED8;border-radius:4px">
        </div>
      ` : ''}
      <!-- 상태 아이콘 -->
      <div style="width:40px;height:40px;border-radius:12px;background:${cfg.grad};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;border:1px solid ${cfg.border}">${cfg.icon}</div>
      <!-- 콘텐츠 -->
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:14px;font-weight:900;color:#111827;word-break:break-all">${p.title}</span>
              <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:100px;background:${cfg.color}18;color:${cfg.color};white-space:nowrap">${status}</span>
              ${authorBadge}
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:11px;color:#6B7280">
          <span style="display:flex;align-items:center;gap:3px"><span style="font-size:10px">💳</span>${_accountNameCache[p.account] || p.account || "-"}</span>
          <span style="display:flex;align-items:center;gap:3px;font-weight:700;color:#374151"><span style="font-size:10px">💰</span>${(p.amount || 0).toLocaleString()}원</span>
          ${Number(p.allocated_amount||0)>0 ? `<span style="font-weight:800;color:#059669;background:#F0FDF4;padding:2px 8px;border-radius:6px">✅ 배정 ${Number(p.allocated_amount).toLocaleString()}원</span>` : `<span style="color:#D1D5DB;font-size:10px">미배정</span>`}
          <!-- B-1: 잔여예산 뱃지 (비동기 로드) -->
          ${p.account ? `<span id="budget-badge-${safeId}" style="font-size:10px;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#9CA3AF">잔액 확인중...</span>` : ''}
        </div>
        ${actionBtns}
      </div>
      <div style="flex-shrink:0;color:#D1D5DB;font-size:18px;margin-top:6px">›</div>
    </div>`;
}


// ─── B-1: 계획 카드 잔여예산 비동기 업데이트 ─────────────────────────────────
// 카드 렌더링 후 account_budgets를 조회하여 잔여예산 뱃지 업데이트
let _budgetBadgeCache = {}; // account_code → { balance, total }

async function _updateBudgetBadges(plans) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  // 고유 계정코드 수집 (빈값 제외, 캐시 미적중것만)
  const accounts = [...new Set(plans.map(p => p.account || p.account_code).filter(Boolean))]
    .filter(ac => !_budgetBadgeCache[ac]);
  if (accounts.length === 0) {
    // 캐시 히트: 바로 뱃지 업데이트
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
      el.textContent = '잔액 정보 없음';
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
      ? '🔴 잔액 없음'
      : `🟢 잔액 ${bal.toLocaleString()}원`;
  });
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// P12: 수요예측 묶음 상신 (HMC/KIA 전용, Q-07/Q-08)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _foBundleSelected = new Set();

function _foIsBundleEnabled() {
  // 모든 테넌트에서 교육계획 묶음 상신 허용 (이전 HMC/KIA 제약 해제)
  return true;
}

function _foRenderBundleBar(saves) {
  if (!_foIsBundleEnabled() || !saves.length) return '';
  const cnt = _foBundleSelected.size;
  const selBtns = cnt > 0
    ? `<span style="font-size:12px;font-weight:800;color:#1D4ED8">${cnt}건 선택</span>
       <button onclick="foBundleSubmitModal()" style="padding:8px 18px;border-radius:10px;background:#1D4ED8;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(29,78,216,.3)">📦 묶음 상신</button>
       <button onclick="_foBundleSelected.clear();_foRefreshBundleBar()" style="padding:8px 12px;border-radius:10px;background:white;color:#6B7280;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;cursor:pointer">해제</button>`
    : `<span style="font-size:11px;color:#6B7280">카드의 ☑ 체크박스로 선택하세요</span>`;
  return `
<div id="fo-bundle-bar" style="margin-bottom:16px;padding:14px 18px;border-radius:14px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div>
      <div style="font-size:13px;font-weight:900;color:#1D4ED8">📦 교육계획 묶음 상신
        <span style="font-size:10px;background:#DBEAFE;color:#1D4ED8;padding:2px 7px;border-radius:5px;margin-left:4px">동일 계정</span>
      </div>
      <div style="font-size:11px;color:#3B82F6;margin-top:2px">저장완료 교육계획 ${saves.length}건 — 체크박스로 다건 선택 후 묶음 상신</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">${selBtns}</div>
  </div>
</div>`;
}

function _foRefreshBundleBar() {
  const bar = document.getElementById('fo-bundle-bar');
  const raw = (_plansDbCache || []).filter(d => d.status === 'saved');
  if (!bar) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _foRenderBundleBar(raw);
  if (tmp.firstChild) bar.replaceWith(tmp.firstChild);
}

function _foBundleToggle(planId, checkboxEl) {
  const plan = (_plansDbCache || []).find(d => String(d.id) === planId);
  
  if (checkboxEl.checked) {
    // [동일 계정 제약 방어 로직]
    if (_foBundleSelected.size > 0) {
      const firstId = Array.from(_foBundleSelected)[0];
      const firstPlan = (_plansDbCache || []).find(d => String(d.id) === String(firstId));
      if (firstPlan && firstPlan.account_code !== plan.account_code) {
        alert("교육계획 묶음 상신은 '동일한 예산계정'의 항목만 묶을 수 있습니다.\n선택하신 계획은 기존에 선택된 계획과 예산계정이 다릅니다.");
        checkboxEl.checked = false;
        return;
      }
    }
    _foBundleSelected.add(planId);
  } else {
    _foBundleSelected.delete(planId);
  }
  _foRefreshBundleBar();
}

function _foBundleCheckbox(plan) {
  if (!_foIsBundleEnabled()) return '';
  const rawPlan = (_plansDbCache || []).find(d => String(d.id) === String(plan.id));
  if (!rawPlan || rawPlan.status !== 'saved') return '';
  const checked = _foBundleSelected.has(String(plan.id));
  const safeId = String(plan.id).replace(/'/g, "\\'");
  return `<label onclick="event.stopPropagation()" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-left:6px;vertical-align:middle">
    <input type="checkbox" ${checked ? 'checked' : ''} onchange="_foBundleToggle('${safeId}', this); event.stopPropagation()" style="width:15px;height:15px;accent-color:#1D4ED8;cursor:pointer">
  </label>`;
}

function foBundleSubmitModal() {
  if (!_foBundleSelected.size) { alert('상신할 계획을 선택해주세요.'); return; }
  const sel = (_plansDbCache || []).filter(d => _foBundleSelected.has(String(d.id)));
  const total = sel.reduce((s, d) => s + Number(d.amount || 0), 0);
  const accs = [...new Set(sel.map(d => d.account_code).filter(Boolean))];
  if (accs.length > 1) {
    alert(`동일 계정의 교육계획만 묶음 상신할 수 있습니다.\n현재 ${accs.length}개의 계정이 혼재되어 있습니다.`);
    return;
  }

  const rows = sel.map(d => `
<tr style="border-bottom:1px solid #F3F4F6">
  <td style="padding:8px 10px;font-size:12px;font-weight:700">${d.edu_name || '-'}</td>
  <td style="padding:8px 10px;font-size:11px;color:#6B7280">${d.account_code || '-'}</td>
  <td style="padding:8px 10px;font-size:12px;font-weight:800;text-align:right;color:#1D4ED8">${Number(d.amount || 0).toLocaleString()}원</td>
</tr>`).join('');

  const defaultTitle = `${(currentPersona && (currentPersona.dept || currentPersona.team)) || ''} ${new Date().getFullYear()}년도 수요예측`;

  document.body.insertAdjacentHTML('beforeend', `
<div id="fo-bundle-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9000;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:560px;max-height:80vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="font-size:16px;font-weight:900;margin:0">📦 교육계획 묶음 상신</h3>
      <button onclick="document.getElementById('fo-bundle-modal').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">묶음 제목 *</label>
      <input id="fo-bundle-title" type="text" value="${defaultTitle}"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">검토 의견</label>
      <textarea id="fo-bundle-content" rows="2" placeholder="팀장에게 전달할 의견"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:vertical"></textarea>
    </div>
    <div style="margin-bottom:20px;border-radius:10px;border:1px solid #E5E7EB;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#F9FAFB">
          <th style="padding:8px 10px;font-size:11px;font-weight:800;text-align:left">과정명</th>
          <th style="padding:8px 10px;font-size:11px;font-weight:800;text-align:left">계정</th>
          <th style="padding:8px 10px;font-size:11px;font-weight:800;text-align:right">계획액</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#F9FAFB;font-weight:900">
          <td colspan="2" style="padding:9px 10px;font-size:12px">합계 (${sel.length}건)</td>
          <td style="padding:9px 10px;font-size:13px;text-align:right;color:#1D4ED8">${total.toLocaleString()}원</td>
        </tr></tfoot>
      </table>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('fo-bundle-modal').remove()"
        style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;color:#6B7280;cursor:pointer">취소</button>
      <button onclick="foBundleConfirmSubmit()"
        style="padding:10px 24px;border-radius:10px;background:#1D4ED8;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(29,78,216,.3)">📦 묶음 상신</button>
    </div>
  </div>
</div>`);
}

async function foBundleConfirmSubmit() {
  const titleEl = document.getElementById('fo-bundle-title');
  const title = (titleEl && titleEl.value || '').trim();
  const content = (document.getElementById('fo-bundle-content') && document.getElementById('fo-bundle-content').value || '').trim();
  if (!title) { alert('묶음 제목을 입력해주세요.'); return; }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  const sel = (_plansDbCache || []).filter(d => _foBundleSelected.has(String(d.id)));
  if (!sel.length) { alert('선택된 계획이 없습니다.'); return; }

  const total = sel.reduce((s, d) => s + Number(d.amount || 0), 0);
  const acct = (sel[0] && sel[0].account_code) || null;
  const now = new Date().toISOString();

  try {
    const { data: doc, error: docErr } = await sb.from('submission_documents').insert({
      tenant_id: currentPersona.tenantId,
      submission_type: 'bundle_plan',
      submitter_id: currentPersona.id,
      submitter_name: currentPersona.name,
      submitter_org_id: currentPersona.orgId || null,
      submitter_org_name: currentPersona.dept || null,
      title,
      content,
      account_code: acct,
      total_amount: total,
      approval_system: 'platform',
      approval_nodes: [{ order: 0, type: 'approval', label: '팀장', approverKey: 'leader', activation: 'always' }],
      current_node_order: 0,
      doc_type: 'plan',
      status: 'submitted',
      submitted_at: now,
    }).select('id').single();
    if (docErr) throw docErr;
    const docId = doc && doc.id;
    if (!docId) throw new Error('id 미반환');

    await sb.from('submission_items').insert(
      sel.map((d, i) => ({
        submission_id: docId,
        item_type: 'plan',
        item_id: String(d.id),
        item_title: d.edu_name || String(d.id),
        item_amount: Number(d.amount || 0),
        item_status_at_submit: d.status || 'saved',
        final_status: 'pending',
        sort_order: i,
      }))
    );

    for (const d of sel) {
      await sb.from('plans').update({ status: 'submitted', updated_at: now }).eq('id', d.id);
    }

    const modal = document.getElementById('fo-bundle-modal');
    if (modal) modal.remove();
    _foBundleSelected.clear();
    _plansDbLoaded = false; _dbMyPlans = []; _plansDbCache = [];
    alert(`✅ 묶음 상신 완료!\n"${title}" — ${sel.length}건, ${total.toLocaleString()}원`);
    renderPlans();
  } catch (err) {
    alert('❌ 묶음 상신 실패: ' + err.message);
    console.error('[P12]', err);
  }
}

// ─── P2: 교육계획 복제 (폼 선로드 방식) ─────────────────────────────────────
// DB에 즉시 저장하지 않고, 원본 데이터를 읽어 폼 마법사에 미리 채운다.
// 사용자가 내용 수정 후 '저장'을 눌러야 비로소 새 draft가 생성된다.
async function clonePlan(planId) {
  const sb = typeof getSB === 'function' ? getSB() : null;

  // 캐시에서 먼저 탐색
  let original = (_plansDbCache || []).find(p => p.id === planId);

  // 캐시 미적중 시 DB 조회
  if (!original && sb) {
    try {
      const { data, error } = await sb
        .from('plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (error || !data) {
        alert('❌ 원본 계획을 찾을 수 없습니다.');
        return;
      }
      original = data;
    } catch (err) {
      alert('❌ 복제 실패: ' + err.message);
      return;
    }
  }

  if (!original) { alert('❌ 원본 계획을 찾을 수 없습니다.'); return; }

  // ── planState 초기화 후 원본 데이터 매핑 ──────────────────────────────────
  const d = original.detail || {};

  // resumePlanDraft()와 동일한 방식으로 planState 복원
  planState = resetPlanState();
  planState.editId = null;                              // 새 계획 → ID 없음
  planState.title = '[복제] ' + (original.edu_name || ''); // 제목에 [복제] 접두어
  planState.eduType = original.edu_type || d.eduType || '';
  planState.eduSubType = d.eduSubType || '';
  planState.subType = d.eduSubType || '';
  planState.amount = original.amount || '';
  planState.content = d.content || '';
  planState.startDate = d.startDate || '';
  planState.endDate = d.endDate || '';
  planState.budgetId = d.budgetId || '';
  planState.calcGrounds = d.calcGrounds ? JSON.parse(JSON.stringify(d.calcGrounds)) : [];
  planState.locations = Array.isArray(d.locations) ? [...d.locations] : [];
  planState.policyId = original.policy_id || null;
  planState.region = d.region || 'domestic';
  planState.accountCode = original.account_code || '';
  planState.fiscal_year = original.fiscal_year || new Date().getFullYear();
  planState.plan_type = original.plan_type || 'ongoing';
  planState.form_template_id = original.form_template_id || null;

  // BO 코멘트(_bo)는 복제 대상에서 제외 — 운영자 코멘트는 새 계획에 인계 안 함
  planState._clonedFromId = planId; // 복제 출처 추적용 (저장 시 detail에 기록됨)

  // purpose 복원: resumePlanDraft()와 동일 로직
  const purposeId = d.purpose;
  if (purposeId) {
    const policyPurposes = typeof getPersonaPurposes === 'function'
      ? getPersonaPurposes(currentPersona) : [];
    const PURPOSES_ARR = typeof PURPOSES !== 'undefined' ? PURPOSES : [];
    const matched = policyPurposes.find(p => p.id === purposeId)
      || PURPOSES_ARR.find(p => p.id === purposeId);
    if (matched) {
      planState.purpose = matched;
    } else {
      const groups = typeof EDU_PURPOSE_GROUPS !== 'undefined' ? EDU_PURPOSE_GROUPS : [];
      for (const g of groups) {
        const found = (g.items || g.purposes || []).find(p => p.id === purposeId);
        if (found) { planState.purpose = found; break; }
      }
      if (!planState.purpose) planState.purpose = { id: purposeId, label: purposeId };
    }
  }

  // step 4(상세 입력)로 바로 진입 — 제목/목적은 이미 채워져 있음
  planState.step = 4;
  planState.formTemplateLoading = true;
  _viewingPlanDetail = null;

  // 폼 템플릿 비동기 로드 (resumePlanDraft 동일 패턴)
  renderPlans();
  if (typeof _loadFormTemplateForPlan === 'function') {
    _loadFormTemplateForPlan(planState).then(() => {
      planState.formTemplateLoading = false;
      renderPlans();
    }).catch(() => {
      planState.formTemplateLoading = false;
      renderPlans();
    });
  } else {
    // 폼 템플릿 로더 없을 시 즉시 step 4 표시
    setTimeout(() => {
      planState.formTemplateLoading = false;
      renderPlans();
    }, 100);
  }
}
window.clonePlan = clonePlan;

// ─── [S-11] 배정액 축소 + 예산 환불 ──────────────────────────────────────────
// PRD: allocation_reduce_refund.md
// 승인(approved)된 계획의 allocated_amount를 하향 조정하고,
// 줄어든 금액만큼 bankbooks.used_amount를 환불 처리한다.

async function foOpenReduceAllocation(planId) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  // 1) 현재 계획 데이터 조회
  let plan = null;
  try {
    const { data, error } = await sb.from("plans")
      .select("id, edu_name, amount, allocated_amount, status, account_code, tenant_id, applicant_id")
      .eq("id", planId).single();
    if (error) throw error;
    plan = data;
  } catch(e) {
    alert("계획 조회 실패: " + e.message);
    return;
  }

  if (!plan || plan.status !== "approved") {
    alert("승인된 계획만 배정액 축소가 가능합니다.");
    return;
  }

  const curAlloc = Number(plan.allocated_amount || plan.amount || 0);
  const planTitle = plan.edu_name || plan.id;

  // 2) 모달 DOM 생성
  const existModal = document.getElementById("fo-reduce-alloc-modal");
  if (existModal) existModal.remove();

  const modal = document.createElement("div");
  modal.id = "fo-reduce-alloc-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
    <div style="background:white;border-radius:20px;width:480px;max-width:95vw;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,.3);animation:boSlideUp .25s ease">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#B45309;margin-bottom:4px">📉 배정액 축소</div>
          <h2 style="font-size:17px;font-weight:900;color:#111827;margin:0;line-height:1.4">${planTitle}</h2>
        </div>
        <button onclick="document.getElementById('fo-reduce-alloc-modal').remove()"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#9CA3AF;line-height:1">✕</button>
      </div>

      <!-- 현재 배정액 표시 -->
      <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px;padding:14px 18px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;color:#B45309;margin-bottom:4px">현재 배정액</div>
        <div style="font-size:24px;font-weight:900;color:#92400E">${curAlloc.toLocaleString()}<span style="font-size:13px;margin-left:2px">원</span></div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:4px">최초 신청액: ${Number(plan.amount||0).toLocaleString()}원</div>
      </div>

      <!-- 새 금액 입력 -->
      <div style="margin-bottom:20px">
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:8px">
          축소 후 새 배정액 <span style="color:#EF4444">*</span>
          <span style="font-size:10px;font-weight:400;color:#9CA3AF"> (현재 배정액보다 낮아야 함)</span>
        </label>
        <div style="display:flex;align-items:center;gap:8px">
          <input id="fo-reduce-new-amount" type="text"
            placeholder="0"
            oninput="foReduceAllocPreview(${curAlloc})"
            style="flex:1;padding:12px 16px;border:2px solid #E5E7EB;border-radius:10px;font-size:18px;font-weight:900;color:#111827;text-align:right;outline:none"
            onfocus="this.style.borderColor='#F59E0B'" onblur="this.style.borderColor='#E5E7EB'">
          <span style="font-size:14px;font-weight:700;color:#6B7280">원</span>
        </div>
        <!-- 환불 예정액 미리보기 -->
        <div id="fo-reduce-preview" style="margin-top:8px;font-size:12px;color:#6B7280;min-height:20px"></div>
      </div>

      <!-- 사유 입력 -->
      <div style="margin-bottom:24px">
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">축소 사유</label>
        <textarea id="fo-reduce-reason" rows="2" placeholder="예) 교육 기간 단축으로 인한 비용 절감"
          style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:none;outline:none"
          onfocus="this.style.borderColor='#F59E0B'" onblur="this.style.borderColor='#E5E7EB'"></textarea>
      </div>

      <!-- 경고 안내 -->
      <div style="background:#FEF3C7;border-radius:8px;padding:10px 14px;margin-bottom:20px;font-size:11px;color:#78350F;line-height:1.6">
        ⚠️ <strong>주의:</strong> 배정액 축소 후에는 원래 금액으로 되돌릴 수 없습니다.<br>
        증액이 필요하면 새로운 교육계획을 상신하거나 BO 담당자에게 문의하세요.
      </div>

      <!-- 버튼 -->
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('fo-reduce-alloc-modal').remove()"
          style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">
          취소
        </button>
        <button id="fo-reduce-confirm-btn" onclick="foConfirmReduceAllocation('${planId}', ${curAlloc})"
          style="padding:10px 28px;border-radius:10px;border:none;background:#B45309;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(180,83,9,.3)">
          📉 축소 확정
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.getElementById("fo-reduce-new-amount")?.focus();
}
window.foOpenReduceAllocation = foOpenReduceAllocation;

// 환불 미리보기 업데이트
function foReduceAllocPreview(curAlloc) {
  const input = document.getElementById("fo-reduce-new-amount");
  const preview = document.getElementById("fo-reduce-preview");
  if (!input || !preview) return;
  const raw = input.value.replace(/[^0-9]/g, "");
  const newAmt = Number(raw);
  if (!raw) { preview.innerHTML = ""; return; }
  const refund = curAlloc - newAmt;
  if (newAmt >= curAlloc) {
    preview.innerHTML = `<span style="color:#EF4444">⚠️ 새 금액은 현재 배정액(${curAlloc.toLocaleString()}원)보다 작아야 합니다</span>`;
  } else if (newAmt < 0) {
    preview.innerHTML = `<span style="color:#EF4444">⚠️ 0원 이상이어야 합니다</span>`;
  } else {
    preview.innerHTML = `<span style="color:#059669;font-weight:700">💰 환불 예정액: ${refund.toLocaleString()}원 (예산 통장 복원)</span>`;
  }
}
window.foReduceAllocPreview = foReduceAllocPreview;

// 배정액 축소 확정 처리
async function foConfirmReduceAllocation(planId, curAlloc) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  const input  = document.getElementById("fo-reduce-new-amount");
  const reason = document.getElementById("fo-reduce-reason")?.value?.trim() || "";
  const newAmt = Number((input?.value || "").replace(/[^0-9]/g, ""));

  // 유효성 검증
  if (isNaN(newAmt) || newAmt < 0) {
    alert("유효한 금액을 입력하세요.");
    input?.focus();
    return;
  }
  if (newAmt >= curAlloc) {
    alert(`새 배정액(${newAmt.toLocaleString()}원)은 현재 배정액(${curAlloc.toLocaleString()}원)보다 작아야 합니다.`);
    input?.focus();
    return;
  }

  const refundAmt = curAlloc - newAmt;
  if (!confirm(`배정액을 ${curAlloc.toLocaleString()}원 → ${newAmt.toLocaleString()}원으로 축소합니다.\n\n💰 환불 예정액: ${refundAmt.toLocaleString()}원\n\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;

  // 버튼 비활성화 (중복 클릭 방지)
  const btn = document.getElementById("fo-reduce-confirm-btn");
  if (btn) { btn.disabled = true; btn.textContent = "처리 중..."; }

  try {
    const now = new Date().toISOString();

    // 1) plans.allocated_amount 업데이트
    const { data: planData, error: planErr } = await sb.from("plans")
      .select("account_code, tenant_id, applicant_id")
      .eq("id", planId).single();
    if (planErr) throw planErr;

    const { error: updErr } = await sb.from("plans")
      .update({ allocated_amount: newAmt, updated_at: now })
      .eq("id", planId);
    if (updErr) throw updErr;

    // 2) bankbooks.used_amount 환불 (비치명적 — 실패해도 plans 업데이트는 유지)
    let budgetRefundOk = false;
    try {
      budgetRefundOk = await _s9RefundBudget(sb, {
        planId,
        tenantId: planData.tenant_id,
        accountCode: planData.account_code,
        refundAmt,
        reason: reason || "FO 배정액 축소",
        adjustedBy: currentPersona?.id || planData.applicant_id || "system",
      });
    } catch(bkErr) {
      console.warn("[S-11] bankbooks 환불 실패 (비치명적):", bkErr.message);
    }

    // 3) budget_adjust_logs 이력 저장
    try {
      await sb.from("budget_adjust_logs").insert({
        tenant_id: planData.tenant_id,
        plan_id: planId,
        before_amount: curAlloc,
        after_amount: newAmt,
        adjusted_by: currentPersona?.id || "system",
        adjusted_at: now,
        reason: reason || "FO 배정액 축소",
      });
    } catch(logErr) {
      console.warn("[S-11] 이력 저장 실패 (비치명적):", logErr.message);
    }

    document.getElementById("fo-reduce-alloc-modal")?.remove();

    const msg = budgetRefundOk
      ? `✅ 배정액 축소 완료!\n\n${newAmt.toLocaleString()}원으로 변경되었습니다.\n💰 ${refundAmt.toLocaleString()}원이 예산 통장에 환불되었습니다.`
      : `✅ 배정액 축소 완료!\n\n${newAmt.toLocaleString()}원으로 변경되었습니다.\n⚠️ 예산 통장 환불은 관리자에게 문의하세요.`;
    alert(msg);

    // 목록 새로고침
    _viewingPlanDetail = null;
    if (typeof renderPlans === "function") renderPlans();

  } catch(err) {
    alert("처리 실패: " + err.message);
    if (btn) { btn.disabled = false; btn.textContent = "📉 축소 확정"; }
  }
}
window.foConfirmReduceAllocation = foConfirmReduceAllocation;

// ── [S-9/S-11] 예산 환불 공통 함수 ─────────────────────────────────────────
// bankbooks.used_amount -= refundAmt (frozen 미사용 — 이미 approved 상태)
async function _s9RefundBudget(sb, { planId, tenantId, accountCode, refundAmt, reason, adjustedBy }) {
  if (!accountCode || !tenantId || refundAmt <= 0) return false;

  const { data: bk, error: bkErr } = await sb.from("bankbooks")
    .select("id, used_amount, current_balance")
    .eq("tenant_id", tenantId)
    .eq("account_code", accountCode)
    .eq("status", "active")
    .order("current_balance", { ascending: false })
    .limit(1).single();

  if (bkErr || !bk) {
    console.warn("[_s9RefundBudget] bankbooks 없음 — accountCode:", accountCode);
    return false;
  }

  const newUsed = Math.max(0, Number(bk.used_amount || 0) - refundAmt);
  const { error: updateErr } = await sb.from("bankbooks").update({
    used_amount: newUsed,
    updated_at: new Date().toISOString(),
  }).eq("id", bk.id);

  if (updateErr) throw updateErr;
  console.log(`[_s9RefundBudget] 환불 완료 — bankbook: ${bk.id}, refundAmt: ${refundAmt}, used: ${bk.used_amount} → ${newUsed}`);
  return true;
}
window._s9RefundBudget = _s9RefundBudget;

// ─── Phase 3: 팀 사업계획 일괄 확정 (Team Forecast Bundle) ─────────────────
// 팀 탭 + forecast 모드에서 saved 계획을 계정별로 그룹핑 → 팀장에게 통보

/**
 * 팀원들의 saved forecast 계획을 account_code 별로 그룹핑하여 계정별 확정 배너 렌더링
 * @param {Array} teamPlansArr - _dbTeamPlans 배열 (팀원 계획)
 * @param {Array} myDbCache   - _plansDbCache 배열 (내 계획 원본, DB 필드 포함)
 */
function _foRenderTeamForecastBundleBar(teamPlansArr, myDbCache) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!teamPlansArr || !teamPlansArr.length) {
    return `
<div style="margin-bottom:16px;padding:18px 20px;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB;text-align:center">
  <div style="font-size:13px;font-weight:700;color:#9CA3AF">📋 팀원의 작성 완료된 사업계획이 없습니다</div>
  <div style="font-size:11px;color:#D1D5DB;margin-top:4px">팀원들이 사업계획을 저장 완료(saved)해야 확정할 수 있습니다</div>
</div>`;
  }

  // saved + forecast 계획만 필터
  const savedForecasts = teamPlansArr.filter(p => {
    const rawSt = p.status || '';
    return (rawSt === 'saved' || rawSt === '저장완료') && p.fiscalYear === _planYear;
  });

  // 내 계획(saved + forecast)도 포함
  const myForecasts = myDbCache.filter(d =>
    (d.status === 'saved') &&
    (d.plan_type === 'forecast' || d.plan_type === 'business') &&
    (d.fiscal_year === _planYear)
  ).map(d => ({
    id: d.id,
    title: d.edu_name || String(d.id),
    amount: Number(d.amount || 0),
    account: d.account_code,
    author: d.applicant_name || currentPersona.name,
    authorDept: d.dept || currentPersona.dept,
    fiscalYear: d.fiscal_year,
    status: 'saved',
    account_code: d.account_code,
  }));

  const allSaved = [...myForecasts, ...savedForecasts];

  if (!allSaved.length) {
    return `
<div style="margin-bottom:16px;padding:18px 20px;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB;text-align:center">
  <div style="font-size:13px;font-weight:700;color:#9CA3AF">📋 ${_planYear}년 확정 가능한 사업계획이 없습니다</div>
  <div style="font-size:11px;color:#D1D5DB;margin-top:4px">저장 완료(saved) 상태의 수요예측 사업계획만 포함됩니다</div>
</div>`;
  }

  // account_code별 그룹핑
  const grouped = {};
  allSaved.forEach(p => {
    const acc = p.account || p.account_code || 'unknown';
    if (!grouped[acc]) grouped[acc] = [];
    grouped[acc].push(p);
  });

  // draft 인원 계산 (팀원 중 미완료)
  const draftCount = (teamPlansArr || []).filter(p => {
    const rawSt = p.status || '';
    return (rawSt === 'draft' || rawSt === '작성중') && p.fiscalYear === _planYear;
  }).length;

  const dept = currentPersona.dept || currentPersona.team || '';

  const groupHtml = Object.entries(grouped).map(([accCode, plans]) => {
    const total = plans.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const safeAcc = accCode.replace(/'/g, "\\'");
    const accName = window._accountNameCache?.[accCode] || accCode;
    const rows = plans.map(p => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:1px solid #F3F4F6">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700;color:#111827">${p.title || p.edu_name || '-'}</div>
          <div style="font-size:10px;color:#9CA3AF">${p.author || '-'} · ${p.authorDept || '-'}</div>
        </div>
        <div style="font-size:12px;font-weight:800;color:#1D4ED8">${(Number(p.amount) || 0).toLocaleString()}원</div>
      </div>`).join('');

    return `
<div style="margin-bottom:14px;border-radius:14px;border:1.5px solid #BFDBFE;overflow:hidden;background:white">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-bottom:1px solid #BFDBFE">
    <div>
      <div style="font-size:13px;font-weight:900;color:#1D4ED8">💳 ${accName} 계정 사업계획</div>
      <div style="font-size:11px;color:#3B82F6;margin-top:2px">${plans.length}건 · 총 요청액 ${total.toLocaleString()}원${draftCount > 0 ? ` · ⚠️ ${draftCount}명 미완료(제외)` : ''}</div>
    </div>
    <button onclick="foTeamForecastConfirm('${safeAcc}','${dept.replace(/'/g,'')}',${_planYear})"
      style="padding:10px 20px;border-radius:10px;background:#1D4ED8;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(29,78,216,.3);white-space:nowrap">
      📤 팀 사업계획 확정
    </button>
  </div>
  <div>${rows}</div>
  <div style="padding:10px 14px;background:#F9FAFB;display:flex;justify-content:flex-end">
    <span style="font-size:11px;font-weight:900;color:#1D4ED8">합계: ${total.toLocaleString()}원</span>
  </div>
</div>`;
  }).join('');

  return `
<div style="margin-bottom:20px">
  <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:10px">
    👥 팀 사업계획 현황 (${_planYear}년) — 계정별 일괄 확정
  </div>
  ${groupHtml}
</div>`;
}
window._foRenderTeamForecastBundleBar = _foRenderTeamForecastBundleBar;

/**
 * 팀 사업계획 계정별 일괄 확정 실행
 * - submission_type='team_forecast' 문서 생성
 * - 동일 계정+팀+연도 중복 번들 방지
 * - Hold 없음 (요청액 기록만)
 */
async function foTeamForecastConfirm(accountCode, dept, fiscalYear) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  const tenantId = currentPersona.tenantId;
  const submitterId = currentPersona.id;
  const submitterName = currentPersona.name;

  // 중복 번들 방지: 동일 팀+계정+연도에 이미 submitted/in_review 번들 존재 여부 확인
  try {
    const { data: existing } = await sb
      .from('submission_documents')
      .select('id, submitter_name, created_at, status')
      .eq('submission_type', 'team_forecast')
      .eq('tenant_id', tenantId)
      .eq('account_code', accountCode)
      .eq('fiscal_year', fiscalYear)
      .eq('submitter_org_name', dept)
      .in('status', ['submitted', 'team_approved', 'in_review', 'allocated'])
      .limit(1);

    if (existing && existing.length > 0) {
      const ex = existing[0];
      const dt = ex.created_at ? new Date(ex.created_at).toLocaleString('ko-KR') : '';
      alert(`⚠️ 이미 확정된 번들이 있습니다.\n확정자: ${ex.submitter_name} · ${dt}\n상태: ${ex.status}\n\n재확정이 필요하면 기존 번들을 취소 후 다시 시도해주세요.`);
      return;
    }
  } catch (e) {
    console.warn('[foTeamForecastConfirm] 중복체크 오류:', e.message);
  }

  // 대상 계획 수집 (내 계획 + 팀원 계획 중 같은 계정 + saved + forecast)
  const myForecasts = (_plansDbCache || []).filter(d =>
    d.account_code === accountCode &&
    d.status === 'saved' &&
    (d.plan_type === 'forecast' || d.plan_type === 'business') &&
    d.fiscal_year === fiscalYear
  );
  const teamForecasts = (_dbTeamPlans || []).filter(p =>
    (p.account || p.account_code) === accountCode &&
    (p.status === 'saved' || p.status === '저장완료') &&
    p.fiscalYear === fiscalYear
  );

  // ID 중복 제거
  const allIds = new Set();
  const allPlans = [];
  [...myForecasts, ...teamForecasts].forEach(p => {
    const id = String(p.id);
    if (!allIds.has(id)) { allIds.add(id); allPlans.push(p); }
  });

  if (!allPlans.length) {
    alert('확정할 수 있는 저장완료 사업계획이 없습니다.');
    return;
  }

  const total = allPlans.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const accName = window._accountNameCache?.[accountCode] || accountCode;

  const ok = confirm(
    `📤 [${accName}] 계정 팀 사업계획 확정\n\n` +
    `포함: ${allPlans.length}건 / 총 요청액 ${total.toLocaleString()}원\n` +
    `확정자: ${submitterName} (${dept})\n\n` +
    `확정하면 포함된 계획이 팀장 검토 대기 상태로 전환됩니다.\n계속 진행하시겠습니까?`
  );
  if (!ok) return;

  const now = new Date().toISOString();

  // 팀장 자가 확정 여부 판별
  const isLeaderPos = /팀장|리더|부장|차장|과장/i.test(currentPersona.pos || '');
  const initialStatus = isLeaderPos ? 'team_approved' : 'submitted';

  try {
    // 1) submission_documents 생성
    const { data: doc, error: docErr } = await sb.from('submission_documents').insert({
      tenant_id: tenantId,
      submission_type: 'team_forecast',
      submitter_id: submitterId,
      submitter_name: submitterName,
      submitter_org_id: currentPersona.orgId || null,
      submitter_org_name: dept,
      title: `${dept} ${fiscalYear}년 사업계획 (${accName})`,
      account_code: accountCode,
      fiscal_year: fiscalYear,
      total_amount: total,
      approval_system: 'platform',
      approval_nodes: [
        { order: 0, type: 'draft', label: '확정', approverKey: submitterId, activation: 'always' },
        { order: 1, type: 'review', label: '팀장 검토', approverKey: 'leader', activation: 'always' },
        { order: 2, type: 'transfer', label: 'BO 전달', approverKey: 'ops', activation: 'always' },
      ],
      current_node_order: isLeaderPos ? 2 : 1,
      doc_type: 'plan',
      status: initialStatus,
      submitted_at: now,
    }).select('id').single();
    if (docErr) throw docErr;
    const docId = doc?.id;
    if (!docId) throw new Error('submission_documents id 미반환');

    // 2) submission_items INSERT
    await sb.from('submission_items').insert(
      allPlans.map((p, i) => ({
        submission_id: docId,
        item_type: 'plan',
        item_id: String(p.id),
        item_title: p.edu_name || p.title || String(p.id),
        item_amount: Number(p.amount || 0),
        item_status_at_submit: 'saved',
        final_status: 'pending',
        sort_order: i,
      }))
    );

    // 3) plans.status → submitted (번들 잠금)
    for (const p of allPlans) {
      await sb.from('plans').update({ status: 'submitted', updated_at: now }).eq('id', p.id);
    }

    // 캐시 초기화 후 리렌더
    _plansDbLoaded = false; _dbMyPlans = []; _plansDbCache = [];
    _teamPlansLoaded = false; _dbTeamPlans = [];

    const msgExtra = isLeaderPos
      ? '\n팀장으로 인식되어 BO 운영담당자에게 바로 전달되었습니다.'
      : '\n팀장 결재함에 검토 요청이 전송되었습니다.';

    alert(`✅ 팀 사업계획 확정 완료!\n${allPlans.length}건 · ${total.toLocaleString()}원${msgExtra}`);
    renderPlans();
  } catch (err) {
    alert('❌ 확정 실패: ' + err.message);
    console.error('[Phase3 foTeamForecastConfirm]', err);
  }
}
window.foTeamForecastConfirm = foTeamForecastConfirm;
