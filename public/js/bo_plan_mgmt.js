// ─── 3 Depth: 교육계획 관리 (DB 연동 + 인라인 편집) ──────────────────────────
let _boPlanMgmtData = null;
let _boPlanDetailView = null; // 상세 보기 대상 계획
let _boPlanFiscalYear = new Date().getFullYear(); // 연도 필터
let _boPlanTypeFilter = "all"; // 'all' | 'forecast' | 'ongoing'
let _boForecastDeadlines = []; // 수요예측 마감 상태 (다건, 계정별)
let _boTenantAccounts = []; // 테넌트 예산계정 목록

// ★ P2: 탭 전환 ('plans' | 'forecast_bundle') + 번들 데이터
let _boPlanTab = "plans"; // 현재 탭
let _boForecastBundles = null; // submission_documents (team_forecast / org_forecast)
let _boForecastBundleDetail = null; // 번들 상세 뷰 대상

// ★ 인라인 편집 상태
let _boPlanEditMode = false;
let _boPlanOriginals = {}; // { planId: originalAllocatedAmount }
let _boPlanEdits = {};     // { planId: newAllocatedAmount }


// 인라인 편집 미저장 경고
window.addEventListener('beforeunload', function(e) {
  if (_boPlanEditMode && Object.keys(_boPlanEdits).length > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ── 영문 KEY → 한글 변환 룩업 ──
const _PLAN_PURPOSE_KR = {
  external_personal: "개인직무 사외학습",
  elearning_class: "이러닝/집합(비대면) 운영",
  conf_seminar: "워크샵/세미나/콘퍼런스 등 운영",
  misc_ops: "기타 운영",
};
const _PLAN_EDUTYPE_KR = {
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
function _planPurposeKr(k) {
  return _PLAN_PURPOSE_KR[k] || k || "-";
}
function _planEduTypeKr(k) {
  return _PLAN_EDUTYPE_KR[k] || k || "-";
}

async function renderBoPlanMgmt() {
  const el = document.getElementById("bo-content");
  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";

  // DB에서 계획 조회 (plans 테이블 — 신규 컬럼 포함)
  if (!_boPlanMgmtData && sb) {
    try {
      const { data, error } = await sb
        .from("plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      _boPlanMgmtData = data || [];
    } catch (err) {
      console.error("[renderBoPlanMgmt] DB 조회 실패:", err.message);
      _boPlanMgmtData = [];
    }
  }

  // DB 미연결 시 MOCK 폴백
  if (!_boPlanMgmtData) {
    _boPlanMgmtData = typeof MOCK_BO_PLANS !== "undefined" ? MOCK_BO_PLANS : [];
  }

  // P2: 수요예측 번들 탭이면 별도 렌더러로 라우팅
  if (_boPlanTab === "forecast_bundle") {
    await renderBoPlanForecastBundles(el, tenantId, sb);
    return;
  }

  // 상세 뷰 모드
  if (_boPlanDetailView) {
    _renderBoPlanDetail(el, _boPlanDetailView);
    return;
  }


  try {
    // 수요예측 마감 상태 조회 (계정별 다건)
    if (sb) {
      try {
        const { data: dls } = await sb
          .from("forecast_deadlines")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("fiscal_year", _boPlanFiscalYear);
        _boForecastDeadlines = dls || [];
      } catch {
        _boForecastDeadlines = [];
      }
      // 테넌트 예산계정 목록
      if (_boTenantAccounts.length === 0) {
        try {
          const { data: accs } = await sb
            .from("budget_accounts")
            .select("id, name, account_type")
            .eq("tenant_id", tenantId);
          _boTenantAccounts = accs || [];
        } catch {
          _boTenantAccounts = [];
        }
      }
    }

    let plans = _boApplyEduFilter(_boPlanMgmtData);
    // 연도 필터
    plans = plans.filter((p) => {
      const fy =
        p.fiscal_year ||
        new Date(p.created_at || "").getFullYear() ||
        new Date().getFullYear();
      return fy === _boPlanFiscalYear;
    });
    // 유형 필터
    if (_boPlanTypeFilter !== "all") {
      plans = plans.filter(
        (p) => (p.plan_type || "ongoing") === _boPlanTypeFilter,
      );
    }
    // 수요예측 통계
    const forecastPlans = (_boApplyEduFilter(_boPlanMgmtData) || []).filter(
      (p) => {
        const fy = p.fiscal_year || new Date(p.created_at || "").getFullYear();
        return fy === _boPlanFiscalYear && p.plan_type === "forecast";
      },
    );
    const forecastCount = forecastPlans.length;
    const forecastPending = forecastPlans.filter(
      (p) => p.status === "pending" || p.status === "pending_approval",
    ).length;
    const forecastTotal = forecastPlans.reduce(
      (s, p) => s + Number(p.amount || 0),
      0,
    );
    const isNextYear = _boPlanFiscalYear > new Date().getFullYear();
    const hasAnyDeadline = _boForecastDeadlines.length > 0;

    const _approveRoles = [
      "platform_admin",
      "tenant_global_admin",
      "total_general",
      "total_rnd",
      "hq_general",
      "center_rnd",
    ];
    // E-4: P16 역할 구분 — bo_role_view.js 신규 함수 사용
    const isGlobalBO = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : isGlobalAdmin(boCurrentPersona);
    const isOpBO = typeof boIsOpManager === 'function' ? boIsOpManager() : isOpManager(boCurrentPersona);

    // P16 F-150: 운영담당자 관할 데이터 스코핑
    if (typeof boFilterPlansByScope === 'function') {
      plans = boFilterPlansByScope(plans);
    }

    // 총괄담당자: 승인/반려 가능  | 운영담당자: 1차검토 가능
    const canApprove = isGlobalBO;
    const canReview = isOpBO && !isGlobalBO; // 운영담당자전용 (1차검토)

    // ★ 편집 모드가 아닐 때 originals 초기화
    if (!_boPlanEditMode) {
      _boPlanOriginals = {};
      _boPlanEdits = {};
      plans.forEach(pl => {
        _boPlanOriginals[pl.id] = Number(pl.allocated_amount || 0);
      });
    }

    const editCount = Object.keys(_boPlanEdits).length;
    // 합계 계산
    const sumPlan = plans.reduce((s,p) => s + Number(p.amount || 0), 0);
    const sumAlloc = plans.reduce((s,p) => {
      const edited = _boPlanEdits[p.id];
      return s + (edited !== undefined ? edited : Number(p.allocated_amount || 0));
    }, 0);
    const sumActual = plans.reduce((s,p) => s + Number(p.actual_amount || 0), 0);

    const rows = plans
      .map((pl, idx) => {
        const amt = Number(pl.amount || pl.planAmount || 0);
        const allocAmt = Number(pl.allocated_amount || 0);
        const actualAmt = Number(pl.actual_amount || 0);
        const status = pl.status || "pending";
        const statusBadge =
          typeof boPlanStatusBadge === "function"
            ? boPlanStatusBadge(status)
            : `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${status === "approved" ? "#D1FAE5" : status === "rejected" ? "#FEE2E2" : "#FEF3C7"};color:${status === "approved" ? "#059669" : status === "rejected" ? "#DC2626" : "#B45309"};font-weight:800">${status === "approved" ? "승인" : status === "rejected" ? "반려" : status === "draft" ? "임시저장" : "대기"}</span>`;
        // ★ 계획/수시 뱃지
        const typeBadge =
          pl.plan_type === "forecast"
            ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#DBEAFE;color:#1D4ED8">📅 계획</span>'
            : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#F3F4F6;color:#6B7280">📝 수시</span>';
        // ★ 계속/신규 뱃지
        const recurBadge = pl.is_recurring
          ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#FEF3C7;color:#92400E;margin-left:4px">🔄 계속</span>'
          : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#ECFDF5;color:#065F46;margin-left:4px">🆕 신규</span>';
        const safeId = String(pl.id || "").replace(/'/g, "\\'");

        // ★ 배정액 셀 — 편집모드 vs 일반모드
        const isEdited = _boPlanEdits.hasOwnProperty(pl.id);
        const editVal = isEdited ? _boPlanEdits[pl.id] : allocAmt;
        const cellBg = isEdited ? 'background:#FFFBEB;' : '';
        // F-010-a: 변경 diff 뱃지 (원본 → 변경값)
        const diffBadge = isEdited
          ? `<span style="font-size:9px;color:#B45309;margin-left:4px;white-space:nowrap">
               (${allocAmt > 0 ? allocAmt.toLocaleString() : '-'} → ${editVal.toLocaleString()})
             </span>`
          : '';
        const allocCell = _boPlanEditMode
          ? `<td style="text-align:right;${cellBg}padding:4px 6px" onclick="event.stopPropagation()">
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px">
                <input type="number" min="0" value="${editVal}"
                  onchange="_boPlanInlineChange('${safeId}',this.value)"
                  onkeydown="_boPlanInlineKeyNav(event,${idx})"
                  id="bo-alloc-input-${idx}"
                  style="width:110px;text-align:right;padding:6px 8px;border:1.5px solid ${isEdited ? '#F59E0B' : '#E5E7EB'};border-radius:6px;font-size:12px;font-weight:800;background:${isEdited ? '#FFFBEB' : '#fff'};outline:none;transition:border-color .15s"
                  onfocus="this.style.borderColor='#1D4ED8';this.select()" onblur="this.style.borderColor='${isEdited ? '#F59E0B' : '#E5E7EB'}'"
                />
                ${isEdited ? `<button onclick="event.stopPropagation();_boPlanResetCell('${safeId}',${idx})" title="원래대로" style="border:none;background:none;cursor:pointer;font-size:12px;color:#9CA3AF;padding:0" onmouseover="this.style.color='#DC2626'" onmouseout="this.style.color='#9CA3AF'">↩</button>` : ''}
              </div>
              ${diffBadge}
             </td>`
          : `<td style="text-align:right;font-weight:800;color:#059669">${allocAmt > 0 ? allocAmt.toLocaleString() + '원' : '<span style="color:#D1D5DB">-</span>'}</td>`;

        return `
      <tr onclick="${_boPlanEditMode ? '' : "_openBoPlanDetail('" + safeId + "')"}" 
          style="cursor:${_boPlanEditMode ? 'default' : 'pointer'};transition:background .12s;${isEdited ? 'background:#FFFBEB;' : ''}"
          onmouseover="this.style.background='${isEdited ? '#FEF3C7' : '#F0F9FF'}'" 
          onmouseout="this.style.background='${isEdited ? '#FFFBEB' : ''}'">
        <td>
          <div style="font-weight:700;font-size:12px">${pl.team || pl.dept || pl.applicant_name || ""}</div>
          <div style="font-size:10px;color:#9CA3AF">${pl.hq || pl.center || ""}</div>
        </td>
        <td>
          <div style="font-weight:700;font-size:12px">${pl.title || pl.edu_name || pl.name || ""}</div>
          <div style="font-size:10px;color:#9CA3AF">상신자: ${pl.submitter || pl.applicant_name || ""}</div>
        </td>
        <td>${typeBadge}${recurBadge}</td>
        <td>${typeof boAccountBadge === "function" ? boAccountBadge(pl.account || pl.account_code || "") : pl.account_code || ""}</td>
        <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
        ${allocCell}
        <td style="text-align:right;color:#6B7280;font-size:12px">${actualAmt > 0 ? actualAmt.toLocaleString() + '원' : '<span style="color:#D1D5DB">-</span>'}</td>
        <td style="font-size:12px;color:#6B7280">${(pl.submittedAt || pl.created_at || "").slice(0, 10)}</td>
        <td>${statusBadge}</td>
        ${
          canApprove && !_boPlanEditMode
            ? `
        <td style="text-align:center" onclick="event.stopPropagation()">
          ${
            status === "pending" || status === "pending_approval" || status === "saved" || status === "in_review"
              ? `
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
            <button onclick="boPlanApprove('${safeId}')" class="bo-btn-accent bo-btn-sm">승인</button>
            <button onclick="boPlanReject('${safeId}')" class="bo-btn-sm" style="border:1px solid #EF4444;color:#EF4444;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">반려</button>
          </div>`
              : status === "approved"
                ? `
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
            <button onclick="boPlanForceRevert('${safeId}')" title="승인 취소 → 임시저장" style="border:1px solid #F59E0B;color:#B45309;background:#FFFBEB;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">↩ 취소</button>
            ${typeof boOpenBudgetTransfer==="function" && Number(pl.allocated_amount||0)>0
              ? `<button onclick="boOpenBudgetTransfer('${safeId}')" title="배정액 이전 (F-007)" style="border:1px solid #0369A1;color:#0369A1;background:#EFF6FF;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">💸 이전</button>`
              : ''}
            <button onclick="boPlanSoftDelete('${safeId}')" title="삭제(복구가능)" style="border:1px solid #EF4444;color:#DC2626;background:#FEF2F2;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">🗑</button>
          </div>`
                : status === "draft"
                  ? `
          <button onclick="boPlanSoftDelete('${safeId}')" title="삭제(복구가능)" style="border:1px solid #EF4444;color:#DC2626;background:#FEF2F2;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">🗑삭제</button>`
                  : '<span style="font-size:12px;color:#9CA3AF">처리완료</span>'
          }
        </td>`
            : canApprove && _boPlanEditMode ? '<td></td>' : ""
        }
      </tr>`;
      })
      .join("");

    // ★ 합계 행
    const totalRow = plans.length > 0 ? `
      <tr style="background:#F9FAFB;font-weight:900;border-top:2.5px solid #E5E7EB">
        <td colspan="4" style="font-size:13px;color:#374151">합계 (${plans.length}건)</td>
        <td style="text-align:right;font-size:13px;color:#002C5F">${sumPlan.toLocaleString()}원</td>
        <td style="text-align:right;font-size:13px;color:#059669" id="bo-alloc-total">${sumAlloc.toLocaleString()}원</td>
        <td style="text-align:right;font-size:13px;color:#6B7280">${sumActual.toLocaleString()}원</td>
        <td colspan="${canApprove ? 3 : 2}"></td>
      </tr>` : '';

    // ★ 편집 모드 바
    const editBar = canApprove ? `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${_boPlanEditMode ? `
          <button onclick="_boPlanBatchSave()" style="padding:8px 20px;border-radius:10px;border:none;background:${editCount > 0 ? '#1D4ED8' : '#9CA3AF'};color:white;font-size:12px;font-weight:900;cursor:${editCount > 0 ? 'pointer' : 'default'};box-shadow:${editCount > 0 ? '0 4px 12px rgba(29,78,216,.3)' : 'none'};transition:all .15s" ${editCount === 0 ? 'disabled' : ''}>
            💾 일괄 저장 (${editCount}건 변경)
          </button>
          <button onclick="_boPlanCancelEdit()" style="padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
            ↩ 취소
          </button>
          <span style="font-size:11px;color:#D97706;font-weight:700">⚡ 배정액 셀을 클릭하여 수정 · Tab으로 이동</span>
        ` : `
          <button onclick="_boPlanToggleEdit()" style="padding:8px 16px;border-radius:10px;border:1.5px solid #1D4ED8;background:#EFF6FF;font-size:12px;font-weight:800;color:#1D4ED8;cursor:pointer;transition:all .15s"
            onmouseover="this.style.background='#1D4ED8';this.style.color='white'" onmouseout="this.style.background='#EFF6FF';this.style.color='#1D4ED8'">
            ✏️ 배정액 편집 모드
          </button>
        `}
        <button onclick="_boPlanMgmtData=null;_boPlanEditMode=false;_boPlanEdits={};renderBoPlanMgmt()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
      </div>
    ` : canReview ? `
      <div style="display:flex;gap:8px;align-items:center">
        <span style="padding:4px 14px;border-radius:8px;background:#FEF3C7;color:#92400E;font-size:11px;font-weight:900">🔍 운영담당자 — 1차 검토 모드</span>
        <button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
      </div>
    ` : `<div style="display:flex;gap:8px;align-items:center"><button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary">🔄 새로고침</button></div>`;

    // ★ 운영담당자 전용: 1차 검토 대기 목록
    const reviewPending = canReview
      ? plans.filter(p => ["pending","pending_approval","saved","submitted"].includes(p.status))
      : [];

    el.innerHTML = `
    <div class="bo-fade">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <h1 class="bo-page-title" style="margin:0">📋 교육계획 관리</h1>
            ${typeof boRoleModeBadge==="function" ? boRoleModeBadge() : ""}
          </div>
          <p class="bo-page-sub">${canApprove ? "총괄담당자 — 최종 승인/반려 및 배정액 관리" : canReview ? "운영담당자 — 1차 검토 후 총괄담당자에게 전달" : "교육계획 수립 및 상신"}</p>
        </div>

        ${editBar}
      </div>

      ${typeof boOpScopeBanner === 'function' ? boOpScopeBanner() : ''}

      <!-- P2: 탭 네비게이션 -->
      <div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #E5E7EB;padding-bottom:0">
        <button onclick="_boPlanTab='plans';renderBoPlanMgmt()"
          style="padding:10px 20px;border:none;border-bottom:${_boPlanTab==='plans'?'3px solid #1D4ED8':'3px solid transparent'};background:none;font-size:13px;font-weight:${_boPlanTab==='plans'?'900':'600'};color:${_boPlanTab==='plans'?'#1D4ED8':'#6B7280'};cursor:pointer;transition:all .15s;margin-bottom:-2px">
          📋 계획 목록
        </button>
        <button onclick="_boPlanTab='forecast_bundle';_boForecastBundles=null;renderBoPlanMgmt()"
          style="padding:10px 20px;border:none;border-bottom:${_boPlanTab==='forecast_bundle'?'3px solid #7C3AED':'3px solid transparent'};background:none;font-size:13px;font-weight:${_boPlanTab==='forecast_bundle'?'900':'600'};color:${_boPlanTab==='forecast_bundle'?'#7C3AED':'#6B7280'};cursor:pointer;transition:all .15s;margin-bottom:-2px">
          📦 수요예측 번들 취합
          ${forecastPending > 0 ? `<span style="margin-left:6px;font-size:10px;font-weight:900;padding:2px 7px;border-radius:12px;background:#EF4444;color:white">${forecastPending}</span>` : ''}
        </button>
      </div>


      <div style="margin-bottom:16px;padding:12px 20px;border-radius:12px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="font-size:13px;font-weight:900;color:#1D4ED8">📊 ${_boPlanFiscalYear}년도 수요예측</div>
            <span style="font-size:11px;padding:2px 10px;border-radius:20px;font-weight:700;
              background:${hasAnyDeadline ? "#D1FAE5" : "#FEF3C7"};color:${hasAnyDeadline ? "#059669" : "#B45309"}">
              ${hasAnyDeadline ? "✅ 기간 설정됨" : "⚠ 기간 미설정"}
            </span>
            <a onclick="boNavigate('forecast-period')" href="#" style="font-size:11px;color:#1D4ED8;font-weight:700;text-decoration:underline">→ 수요예측기간 관리에서 설정</a>
          </div>
          <div style="display:flex;gap:16px;font-size:12px;color:#374151">
            <span>📝 <strong>${forecastCount}</strong>건</span>
            <span>⏳ 대기 <strong style="color:#D97706">${forecastPending}</strong>건</span>
            <span>💰 <strong style="color:#1D4ED8">${forecastTotal.toLocaleString()}원</strong></span>
          </div>
        </div>
      </div>

      <!-- 연도 + 유형 필터 -->
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
        <select onchange="_boPlanFiscalYear=Number(this.value);_boPlanMgmtData=null;_boForecastDeadline=null;_boPlanEditMode=false;_boPlanEdits={};renderBoPlanMgmt()"
          style="padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px;font-weight:700">
          ${[
            new Date().getFullYear() + 1,
            new Date().getFullYear(),
            new Date().getFullYear() - 1,
          ]
            .map(
              (y) =>
                `<option value="${y}" ${_boPlanFiscalYear === y ? "selected" : ""}>${y}년</option>`,
            )
            .join("")}
        </select>
        <select onchange="_boPlanTypeFilter=this.value;renderBoPlanMgmt()"
          style="padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px;font-weight:700">
          <option value="all" ${_boPlanTypeFilter === "all" ? "selected" : ""}>전체</option>
          <option value="forecast" ${_boPlanTypeFilter === "forecast" ? "selected" : ""}>📅 계획(수요예측)</option>
          <option value="ongoing" ${_boPlanTypeFilter === "ongoing" ? "selected" : ""}>📝 수시</option>
        </select>
      </div>

      ${typeof _boEduFilterBar === "function" ? _boEduFilterBar("renderBoPlanMgmt") : ""}

      ${_boPlanEditMode ? `
      <div style="margin-bottom:12px;padding:10px 16px;border-radius:10px;background:#FFFBEB;border:1.5px solid #FCD34D;display:flex;align-items:center;gap:8px;font-size:12px;color:#92400E;font-weight:700">
        <span style="font-size:16px">✏️</span>
        편집 모드 — 배정액 셀을 직접 수정하고 <strong>💾 일괄 저장</strong>을 클릭하세요. 수정된 셀은 <span style="background:#FFFBEB;border:1px solid #FCD34D;padding:1px 6px;border-radius:4px">노란색</span>으로 표시됩니다.
      </div>` : ''}

      <div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
          <div class="bo-list-count" style="margin-bottom:0">교육계획 목록 (${plans.length}건)</div>
          <div style="display:flex;gap:12px;align-items:center">
            ${_boPlanEditMode ? `<span style="font-size:11px;font-weight:800;color:#D97706">⚡ ${editCount}건 수정됨</span>` : ''}
            <span style="font-size:12px;color:#9CA3AF">승인 대기: <strong style="color:#1D4ED8">${plans.filter((p) => p.status === "pending" || p.status === "pending_approval").length}건</strong></span>
            <span style="font-size:12px;color:#7C3AED">1차검토완료: <strong>${plans.filter(p => p.status === 'in_review').length}건</strong></span>
          </div>
        </div>

        <!-- P11: 운영담당자 전용 — 1차 검토 대기 섹션 -->
        ${canReview && reviewPending.length > 0 ? `
        <div style="margin-bottom:20px;padding:20px;border-radius:14px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:2px solid #F59E0B">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <div>
              <div style="font-size:14px;font-weight:900;color:#92400E">🔍 1차 검토 대기 (${reviewPending.length}건)</div>
              <div style="font-size:11px;color:#B45309;margin-top:2px">검토 완료 시 총괄담당자에게 자동 전달됩니다</div>
            </div>
            <span style="font-size:11px;padding:4px 12px;border-radius:8px;background:#F59E0B;color:white;font-weight:800">운영담당자 전용</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${reviewPending.map(p => {
              const sid = String(p.id).replace(/'/g,'');
              const amt = Number(p.amount||0).toLocaleString();
              return '<div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #FCD34D;display:flex;align-items:center;justify-content:space-between;gap:12px">'
                + '<div style="flex:1;min-width:0">'
                + '<div style="font-size:13px;font-weight:900;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (p.edu_name||p.title||'-') + '</div>'
                + '<div style="font-size:11px;color:#6B7280;margin-top:2px">' + (p.applicant_name||'-') + ' · ' + (p.account_code||'-') + ' · ' + amt + '원</div>'
                + '</div>'
                + '<div style="display:flex;gap:6px;flex-shrink:0">'
                + '<button onclick="_openBoPlanDetail(\'' + sid + '\')" style="padding:6px 12px;border-radius:8px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:800;border:1.5px solid #BFDBFE;cursor:pointer">📄 상세</button>'
                + '<button onclick="boPlanOpReview(\'' + sid + '\')" style="padding:6px 16px;border-radius:8px;background:#F59E0B;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer">🔍 1차 검토 완료</button>'
                + '<button onclick="boPlanReject(\'' + sid + '\')" style="padding:6px 12px;border-radius:8px;background:white;color:#EF4444;font-size:11px;font-weight:800;border:1.5px solid #EF4444;cursor:pointer">❌ 반려</button>'
                + '</div></div>';
            }).join('')}
          </div>
        </div>` : ''}

        <!-- P-3: in_review 전용 하이라이트 섹션 (총괄담당자용) -->
        ${(() => {
          const rp = plans.filter(p => p.status === 'in_review');
          if (rp.length === 0 || !canApprove) return '';
          return `<div style="margin-bottom:16px;padding:16px 20px;border-radius:14px;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:2px solid #7C3AED">
            <div style="font-size:13px;font-weight:900;color:#7C3AED;margin-bottom:10px">🔄 1차검토 완료 — 최종 승인 대기 (${rp.length}건)</div>
            <div style="font-size:11px;color:#6D28D9;margin-bottom:12px">운영담당자 검토 완료 건입니다. 검토 후 최종 승인/반려 처리해 주세요.</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${rp.map(p => {
                const sid = String(p.id).replace(/'/g,'');
                return `<div style="background:white;border-radius:10px;padding:12px 16px;border:1px solid #DDD6FE;display:flex;align-items:center;justify-content:space-between;gap:12px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:900;color:#111827">${p.edu_name||'-'}</div>
                  <div style="font-size:11px;color:#6B7280">${p.applicant_name||'-'} · ${p.account_code||'-'} · ${Number(p.amount||0).toLocaleString()}원</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button onclick="boPlanApprove('${sid}')" style="padding:6px 16px;border-radius:8px;background:#059669;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer">✅ 승인</button>
                  <button onclick="boPlanReject('${sid}')" style="padding:6px 14px;border-radius:8px;background:white;color:#EF4444;font-size:11px;font-weight:800;border:1.5px solid #EF4444;cursor:pointer">❌ 반려</button>
                </div>
              </div>`;
              }).join('')}
            </div>
          </div>`;
        })()}

        ${
          plans.length > 0
            ? `

        <div class="bo-table-container" style="overflow-x:auto">
        <table class="bo-table" style="min-width:900px">
          <thead><tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">제출팀</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">계획명</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">유형</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">계정</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">계획액</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;${_boPlanEditMode ? 'background:#EFF6FF;color:#1D4ED8' : 'color:#059669'}">배정액 ${_boPlanEditMode ? '✏️' : ''}</th>
            <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">실사용액</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">제출일</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">상태</th>
            ${canApprove ? '<th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">처리</th>' : ""}
          </tr></thead>
          <tbody>${rows}
            ${totalRow}
          </tbody>
        </table>
        </div>`
            : `
        <div class="bo-table-container" style="padding:60px;text-align:center;color:#9CA3AF">
          <div style="font-size:48px;margin-bottom:10px">📭</div>
          <div style="font-weight:700">${_boPlanFiscalYear}년 교육계획 데이터가 없습니다</div>
          <div style="font-size:12px;margin-top:6px">프론트 오피스에서 교육계획을 수립하면 이 화면에서 조회할 수 있습니다.</div>
        </div>`
        }
      </div>
    </div>`;
  } catch (err) {
    console.error("[renderBoPlanMgmt] 렌더링 에러:", err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>교육계획 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}

// ─── 상세 뷰 ──────────────────────────────────────────────────────────────
function _openBoPlanDetail(planId) {
  const plan = (_boPlanMgmtData || []).find((p) => p.id === planId);
  if (!plan) return;
  _boPlanDetailView = plan;
  renderBoPlanMgmt();
}

function _renderBoPlanDetail(el, plan) {
  const d = plan.detail || {};
  const amt = Number(plan.amount || plan.planAmount || 0);
  const status = plan.status || "pending";
  const statusLabel = {
    draft: "임시저장",
    pending: "결재대기",
    approved: "승인완료",
    rejected: "반려",
    cancelled: "취소",
    completed: "완료",
  };
  const statusColor = {
    draft: "#0369A1",
    pending: "#D97706",
    approved: "#059669",
    rejected: "#DC2626",
    cancelled: "#9CA3AF",
    completed: "#059669",
  };
  const stLabel = statusLabel[status] || status;
  const stColor = statusColor[status] || "#6B7280";
  const _approveRoles2 = [
    "platform_admin",
    "tenant_global_admin",
    "total_general",
    "total_rnd",
    "hq_general",
    "center_rnd",
  ];
  const canApprove =
    _approveRoles2.includes(boCurrentPersona.role) ||
    /admin|budget|total|ops/i.test(boCurrentPersona.role || "");
  const safeId = String(plan.id || "").replace(/'/g, "\\'");

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_boPlanDetailView=null;renderBoPlanMgmt()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 목록으로
      </button>
    </div>

    <div class="bo-card" style="overflow:hidden">
      <!-- 헤더 -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stColor}40;color:white">${stLabel}</span>
          <code style="font-size:10px;background:rgba(255,255,255,.15);color:white;padding:2px 8px;border-radius:4px">${plan.id}</code>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${plan.title || plan.edu_name || plan.name || "-"}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">${plan.applicant_name || plan.submitter || ""} · ${plan.team || plan.dept || ""}</p>
      </div>

      <!-- Phase D: 정규화 컬럼 기반 상세 정보 (bo_plan_detail_renderer.js) -->
      ${typeof window.boRenderPlanDetailInfo === 'function'
        ? window.boRenderPlanDetailInfo(plan)
        : `<div style="padding:24px 28px"><p style="color:#9CA3AF;font-size:12px">상세 렌더러 로딩 중...</p></div>`}

      <!-- 결재/검토 진행현황 -->
      ${typeof renderApprovalStepper === "function" ? renderApprovalStepper(status, "plan") : ""}
      <!-- 산출근거는 boRenderPlanDetailInfo 내 포함됨 (Phase D) -->

      <!-- [P2] 배정액 직접 수정 (approved 상태) -->
      <div id="bo-alloc-edit-panel" style="padding:0 28px 8px"></div>

      <!-- 🔧 관리자 입력 필드 (back + provide) -->
      <div id="bo-admin-fields-panel" style="padding:0 28px 24px"></div>

      <!-- [P3] 결재 이력 -->
      <div id="bo-approval-history-panel" style="padding:0 28px 24px"></div>

      <!-- [P3] 연결 신청서 드릴다운 -->
      <div id="bo-plan-applications-panel" style="padding:0 28px 24px"></div>

      <!-- 액션 -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6;flex-wrap:wrap">
        <button onclick="_boPlanDetailView=null;renderBoPlanMgmt()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 목록으로</button>
        <div style="flex:1"></div>
        ${
          canApprove && (status === "pending" || status === "pending_approval")
            ? `
        <button onclick="boPlanReject('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:white;color:#DC2626;cursor:pointer">❌ 반려</button>
        <button onclick="boPlanApprove('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#059669;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,.3)">✅ 승인</button>
        `
            : ""
        }
        ${
          canApprove && status === "approved"
            ? `
        <button onclick="boPlanForceRevert('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FCD34D;background:#FFFBEB;color:#B45309;cursor:pointer">↩ 승인 취소 (임시저장)</button>
        <button onclick="boPlanSoftDelete('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer">🗑 삭제</button>
        `
            : ""
        }
        ${
          canApprove && status === "draft"
            ? `
        <button onclick="boPlanSoftDelete('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer">🗑 삭제</button>
        `
            : ""
        }
      </div>
    </div>
  </div>`;

  // 비동기 패널 렌더링
  setTimeout(() => {
    _renderBoAdminFieldsPanel(plan, "plans");
    _renderBoAllocEditPanel(plan);            // [P2] 배정액 수정
    _renderBoApprovalHistoryPanel(plan.id);   // [P3] 결재 이력
    _renderBoPlanApplicationsPanel(plan.id); // [P3] 연결 신청서 드릴다운
  }, 100);
}

// ━━━ 관리자 입력 필드 패널 (back + provide) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _renderBoAdminFieldsPanel(record, tableName) {
  const panel = document.getElementById("bo-admin-fields-panel");
  if (!panel) return;

  // 양식 템플릿 로드
  const formId = record.form_template_id;
  let formFields = [];
  if (formId) {
    const sb = typeof getSB === "function" ? getSB() : null;
    if (sb) {
      const { data } = await sb
        .from("form_templates")
        .select("fields")
        .eq("id", formId)
        .maybeSingle();
      if (data?.fields) formFields = data.fields;
    }
  }

  // back + provide + is_bo_only 필드만 추출
  const adminFields = formFields
    .map((f) => (typeof f === "object" ? f : { key: f, scope: "front" }))
    .filter((f) => f.scope === "back" || f.scope === "provide" || f.is_bo_only);

  if (adminFields.length === 0) {
    panel.innerHTML = "";
    return;
  }

  // 기존 저장값 로드
  const detail = record.detail || {};
  const provideData = detail._provide || {};
  const backData = detail._back || {};
  const boOnlyData = detail._bo || {};

  // ADVANCED_FIELDS 참조 (bo_form_builder.js에서 정의)
  const allDefs = typeof ADVANCED_FIELDS !== "undefined" ? ADVANCED_FIELDS : [];

  const _esc = (v) =>
    String(v || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  let html = `
    <div style="border:2px solid #DBEAFE;border-radius:14px;overflow:hidden;margin-top:8px">
      <div style="padding:14px 20px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border-bottom:1.5px solid #DBEAFE;display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:14px;font-weight:900;color:#1E40AF">🔧 관리자 입력 필드</h3>
          <p style="margin:2px 0 0;font-size:11px;color:#6B7280">back(BO전용) · provide(BO제공→FO읽기전용) · 필드(BO코멘트)를 입력합니다</p>
        </div>
        <button onclick="_saveBoAdminFields('${record.id}','${tableName}')"
          style="padding:8px 20px;border-radius:10px;border:none;background:#1D4ED8;color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(29,78,216,.2)">
          💾 저장
        </button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">`;

  adminFields.forEach((fld) => {
    const def = allDefs.find((d) => d.key === fld.key) || {};
    // is_bo_only 필드는 _bo 네임스페이스, provide는 _provide, back는 _back
    const isBoOnly = fld.is_bo_only || def.is_bo_only;
    const scopeNs = isBoOnly ? boOnlyData : (fld.scope === "provide" ? provideData : backData);
    const stateKey = _toBoAdminKey(fld.key);
    const val = scopeNs[stateKey] ?? "";
    const icon = def.icon || (isBoOnly ? "🛡️" : "📝");
    const hint = def.hint || "";
    const ft = def.fieldType || "textarea";
    const scopeLabel = isBoOnly
      ? '<span style="font-size:9px;font-weight:800;color:#C2410C;background:#FEF3C7;padding:2px 8px;border-radius:4px">🛡️ BO코멘트 (FO에 표시됨)</span>'
      : fld.scope === "provide"
        ? '<span style="font-size:9px;font-weight:800;color:#1D4ED8;background:#DBEAFE;padding:2px 8px;border-radius:4px">📢 BO제공→FO</span>'
        : '<span style="font-size:9px;font-weight:800;color:#7C3AED;background:#F5F3FF;padding:2px 8px;border-radius:4px">🔒 BO전용</span>';
    const reqMark = def.required ? '<span style="color:#EF4444"> *</span>' : "";

    let inputHtml = "";
    const inputId = `bo-af-${stateKey}`;
    const baseStyle =
      "width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#FAFAFA;transition:border-color .15s";

    if (ft === "textarea") {
      inputHtml = `<textarea id="${inputId}" rows="3" placeholder="${_esc(hint)}" style="${baseStyle};resize:vertical">${_esc(val)}</textarea>`;
    } else if (ft === "select" && def.options?.length) {
      inputHtml = `<select id="${inputId}" style="${baseStyle}">
        <option value="">선택하세요</option>
        ${def.options.map((o) => `<option value="${_esc(o.value)}" ${val === o.value ? "selected" : ""}>${_esc(o.label)}</option>`).join("")}
      </select>`;
    } else if (ft === "number") {
      inputHtml = `<input id="${inputId}" type="number" value="${_esc(val)}" placeholder="0" style="${baseStyle}"/>`;
    } else {
      inputHtml = `<input id="${inputId}" type="text" value="${_esc(val)}" placeholder="${_esc(hint || fld.key)}" style="${baseStyle}"/>`;
    }

    html += `
      <div data-scope="${fld.is_bo_only || def.is_bo_only ? 'bo_only' : fld.scope}" data-key="${stateKey}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          ${scopeLabel}
          <label style="font-size:12px;font-weight:800;color:#374151">${icon} ${fld.key}${reqMark}</label>
        </div>
        ${inputHtml}
        ${hint ? `<div style="font-size:11px;color:#9CA3AF;margin-top:4px">${hint}</div>` : ""}
      </div>`;
  });

  html += `</div></div>`;
  panel.innerHTML = html;
}

// ━━━ 관리자 필드 저장 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function _saveBoAdminFields(recordId, tableName) {
  const panel = document.getElementById("bo-admin-fields-panel");
  if (!panel) return;

  const inputs = panel.querySelectorAll("[data-scope]");
  const provideUpdate = {};
  const backUpdate = {};
  const boOnlyUpdate = {};

  inputs.forEach((wrapper) => {
    const scope = wrapper.dataset.scope;
    const key = wrapper.dataset.key;
    const input = wrapper.querySelector("input, textarea, select");
    if (!input) return;
    const val = input.value || "";
    if (scope === "provide") provideUpdate[key] = val;
    else if (scope === "back") backUpdate[key] = val;
    else if (scope === "bo_only") boOnlyUpdate[key] = val;
  });

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 필요");
    return;
  }

  try {
    // 기존 detail 조회
    const { data: row } = await sb
      .from(tableName)
      .select("detail")
      .eq("id", recordId)
      .maybeSingle();
    const detail = row?.detail || {};

    // _provide, _back, _bo 네임스페이스에 병합
    detail._provide = { ...(detail._provide || {}), ...provideUpdate };
    detail._back = { ...(detail._back || {}), ...backUpdate };
    detail._bo = { ...(detail._bo || {}), ...boOnlyUpdate };

    // DB 업데이트
    const { error } = await sb
      .from(tableName)
      .update({ detail })
      .eq("id", recordId);
    if (error) throw error;

    // 메모리 캐시도 갱신
    const cached = (_boPlanMgmtData || []).find((p) => p.id === recordId);
    if (cached) cached.detail = detail;
    if (_boPlanDetailView?.id === recordId) _boPlanDetailView.detail = detail;

    alert("✅ 관리자 필드 저장 완료");
  } catch (err) {
    alert("❌ 저장 실패: " + err.message);
  }
}

// ━━━ [P3] 연결 신청서 드릴다운 패널 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _boPlanAppDetailId = null; // 신청서 상세 펼침 ID

async function _renderBoPlanApplicationsPanel(planId) {
  const panel = document.getElementById('bo-plan-applications-panel');
  if (!panel) return;
  if (!planId) { panel.innerHTML = ''; return; }

  panel.innerHTML = `<div style="text-align:center;color:#9CA3AF;font-size:12px;padding:16px">🔄 연결 신청서 로딩 중...</div>`;

  const sb = typeof getSB === 'function' ? getSB() : null;
  let apps = [];
  if (sb) {
    try {
      const { data } = await sb
        .from('applications')
        .select('id,applicant_name,dept,edu_name,edu_type,amount,status,created_at,account_code,detail')
        .eq('plan_id', planId)
        .order('created_at', { ascending: false });
      apps = data || [];
    } catch(e) { apps = []; }
  }

  if (apps.length === 0) {
    panel.innerHTML = `
      <div style="border-radius:12px;border:1.5px dashed #E5E7EB;padding:24px;text-align:center;color:#9CA3AF">
        <div style="font-size:28px;margin-bottom:8px">📭</div>
        <div style="font-weight:700;font-size:13px">이 계획에 연결된 신청서가 없습니다</div>
        <div style="font-size:11px;margin-top:4px">FO에서 이 계획을 선택한 신청서가 생성되면 여기에 표시됩니다</div>
      </div>`;
    return;
  }

  // 집계
  const totalAmt   = apps.reduce((s, a) => s + Number(a.amount || 0), 0);
  const approvedAmt = apps.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.amount || 0), 0);
  const pendingCnt  = apps.filter(a => ['pending','pending_approval','saved','submitted'].includes(a.status)).length;
  const approvedCnt = apps.filter(a => a.status === 'approved').length;
  const rejectedCnt = apps.filter(a => a.status === 'rejected').length;

  const stC = { approved:'#059669', rejected:'#DC2626', draft:'#9CA3AF', pending:'#D97706', pending_approval:'#D97706', saved:'#D97706', submitted:'#D97706', cancelled:'#9CA3AF', in_review:'#7C3AED' };
  const stL = { approved:'승인', rejected:'반려', draft:'임시저장', pending:'대기', pending_approval:'대기', saved:'상신', submitted:'상신', cancelled:'취소', in_review:'1차검토' };

  const rows = apps.map(a => {
    const sid = String(a.id || '').replace(/'/g, '');
    const c = stC[a.status] || '#6B7280';
    const l = stL[a.status] || a.status;
    const isOpen = _boPlanAppDetailId === a.id;
    const detailRows = isOpen ? _buildAppDetailRows(a) : '';
    return `
    <div style="border:1.5px solid ${isOpen ? c+'60' : '#E5E7EB'};border-radius:10px;overflow:hidden;margin-bottom:8px;transition:all .2s">
      <div onclick="_boPlanAppDetailId='${isOpen ? '' : sid}';_renderBoPlanApplicationsPanel('${planId}')"
        style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:${isOpen ? c+'08' : 'white'};"
        onmouseover="this.style.background='${c}10'" onmouseout="this.style.background='${isOpen ? c+'08' : 'white'}'">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;background:${c}20;color:${c}">${l}</span>
            <span style="font-size:13px;font-weight:700;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.edu_name || '-'}</span>
          </div>
          <div style="font-size:11px;color:#6B7280">${a.applicant_name || '-'} · ${a.dept || '-'} · ${(a.created_at||'').slice(0,10)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:900;color:#1D4ED8">${Number(a.amount||0).toLocaleString()}원</div>
        </div>
        <span style="color:#9CA3AF;font-size:16px;transition:transform .2s;transform:rotate(${isOpen?'90':'0'}deg)">▶</span>
      </div>
      ${isOpen ? `<div style="padding:16px;background:#FAFAFA;border-top:1px solid #F0F0F0">${detailRows}</div>` : ''}
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="border-radius:14px;border:1.5px solid #E0E7FF;overflow:hidden">
      <!-- 헤더 -->
      <div style="padding:14px 20px;background:linear-gradient(135deg,#EEF2FF,#E0E7FF);display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:14px;font-weight:900;color:#3730A3">📑 연결 신청서 (${apps.length}건)</span>
          ${pendingCnt > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#D97706;font-weight:700">대기 ${pendingCnt}</span>` : ''}
          ${approvedCnt > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#D1FAE5;color:#059669;font-weight:700">승인 ${approvedCnt}</span>` : ''}
          ${rejectedCnt > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#FEE2E2;color:#DC2626;font-weight:700">반려 ${rejectedCnt}</span>` : ''}
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#6B7280;font-weight:700">총 신청액 <strong style="color:#1D4ED8">${totalAmt.toLocaleString()}원</strong></div>
          <div style="font-size:11px;color:#6B7280;font-weight:700">승인 집행액 <strong style="color:#059669">${approvedAmt.toLocaleString()}원</strong></div>
        </div>
      </div>
      <!-- 목록 -->
      <div style="padding:12px 16px;background:white">${rows}</div>
    </div>`;
}

// 신청서 상세 행 렌더 (아코디언) — Phase D: 정규화 컬럼 우선
function _buildAppDetailRows(app) {
  // Phase D: boRenderAppDetailRows (bo_plan_detail_renderer.js) 위임
  if (typeof window.boRenderAppDetailRows === 'function') {
    return window.boRenderAppDetailRows(app);
  }
  // fallback (레거시 detail JSON 기반)
  const d = app.detail || {};
  const fields = [
    ['교육명', app.edu_name || d.edu_name || '-'],
    ['교육유형', app.edu_type || d.eduType || '-'],
    ['예산계정', app.account_code || '-'],
    ['신청금액', Number(app.amount || 0).toLocaleString() + '원'],
    ['신청일', (app.created_at || '').slice(0, 10) || '-'],
  ];
  if (d.startDate) fields.push(['교육기간', `${d.startDate} ~ ${d.endDate || '-'}`]);
  if (d.institution) fields.push(['교육기관', d.institution]);
  if (d.purpose) fields.push(['목적', d.purpose]);
  if (app.status === 'rejected' && d.reject_reason) fields.push(['반려사유', d.reject_reason]);
  const rows = fields.map(([label, val]) =>
    `<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #F3F4F6;font-size:12px">
      <span style="width:90px;flex-shrink:0;font-weight:700;color:#6B7280">${label}</span>
      <span style="color:#111827">${val}</span>
    </div>`
  ).join('');
  return `<div>${rows}</div>`;
}

window._renderBoPlanApplicationsPanel = _renderBoPlanApplicationsPanel;

// ━━━ [P2] 배정액 직접 수정 패널 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _renderBoAllocEditPanel(plan) {
  const panel = document.getElementById("bo-alloc-edit-panel");
  if (!panel) return;

  const status = plan.status || "";
  const canEdit = (boIsGlobalAdmin() || boIsOpManager()) && status === "approved";
  if (!canEdit) { panel.innerHTML = ""; return; }

  const curAlloc = Number(plan.allocated_amount || 0);
  const planId = plan.id;

  panel.innerHTML = `
    <div style="border:2px solid #D1FAE5;border-radius:14px;overflow:hidden;margin-bottom:8px">
      <div style="padding:12px 20px;background:linear-gradient(135deg,#ECFDF5,#F0FDF4);border-bottom:1.5px solid #A7F3D0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="margin:0;font-size:13px;font-weight:900;color:#065F46">💰 배정액 직접 수정</h3>
          <p style="margin:2px 0 0;font-size:11px;color:#6B7280">현재 배정액을 BO에서 직접 조정합니다 (bankbooks 자동 반영)</p>
        </div>
      </div>
      <div style="padding:16px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">현재 배정액</div>
          <div style="font-size:20px;font-weight:900;color:#065F46">${curAlloc.toLocaleString()}<span style="font-size:12px;margin-left:2px">원</span></div>
        </div>
        <div style="font-size:18px;color:#9CA3AF">→</div>
        <div style="flex:1;min-width:160px">
          <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:4px">새 배정액</div>
          <div style="display:flex;align-items:center;gap:6px">
            <input id="bo-alloc-new-input" type="text" value="${curAlloc.toLocaleString()}"
              oninput="boAllocEditPreview(${curAlloc})"
              style="width:140px;padding:8px 12px;border:2px solid #D1FAE5;border-radius:8px;font-size:16px;font-weight:900;color:#065F46;text-align:right;outline:none"
              onfocus="this.style.borderColor='#059669'" onblur="this.style.borderColor='#D1FAE5'">
            <span style="font-weight:700;color:#6B7280">원</span>
          </div>
        </div>
        <div id="bo-alloc-diff-preview" style="font-size:12px;min-height:18px;align-self:flex-end;padding-bottom:4px"></div>
        <button onclick="_boSaveAllocAmount('${planId}', ${curAlloc})"
          style="padding:8px 20px;border-radius:8px;border:none;background:#059669;color:white;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap;align-self:flex-end">
          💾 배정액 저장
        </button>
      </div>
    </div>`;
}
window._renderBoAllocEditPanel = _renderBoAllocEditPanel;

// 배정액 변경 미리보기
function boAllocEditPreview(curAlloc) {
  const input = document.getElementById("bo-alloc-new-input");
  const preview = document.getElementById("bo-alloc-diff-preview");
  if (!input || !preview) return;
  const newAmt = Number(input.value.replace(/[^0-9]/g, ""));
  const diff = newAmt - curAlloc;
  if (!input.value || isNaN(newAmt)) { preview.innerHTML = ""; return; }
  if (diff === 0) { preview.innerHTML = `<span style="color:#9CA3AF">변경 없음</span>`; return; }
  const color = diff > 0 ? "#059669" : "#DC2626";
  const sign = diff > 0 ? "+" : "";
  preview.innerHTML = `<span style="font-weight:700;color:${color}">${sign}${diff.toLocaleString()}원</span>`;
}
window.boAllocEditPreview = boAllocEditPreview;

// 배정액 저장 처리
async function _boSaveAllocAmount(planId, curAlloc) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 필요"); return; }
  const input = document.getElementById("bo-alloc-new-input");
  const newAmt = Number((input?.value || "").replace(/[^0-9]/g, ""));
  if (isNaN(newAmt) || newAmt < 0) { alert("유효한 금액을 입력하세요."); return; }
  if (newAmt === curAlloc) { alert("변경된 금액이 없습니다."); return; }

  const diff = newAmt - curAlloc;
  const action = diff > 0 ? "증액" : "감액";
  if (!confirm(`배정액을 ${curAlloc.toLocaleString()}원 → ${newAmt.toLocaleString()}원으로 ${action}합니다.\n\n차액: ${diff > 0 ? '+' : ''}${diff.toLocaleString()}원\n계속하시겠습니까?`)) return;

  try {
    const now = new Date().toISOString();
    // 1) plans 업데이트
    const { data: planRow, error: planErr } = await sb.from("plans")
      .select("account_code, tenant_id").eq("id", planId).single();
    if (planErr) throw planErr;

    await sb.from("plans").update({ allocated_amount: newAmt, updated_at: now }).eq("id", planId);

    // 2) bankbooks 처리 (비치명적)
    try {
      const { data: bk } = await sb.from("bankbooks")
        .select("id, used_amount")
        .eq("tenant_id", planRow.tenant_id)
        .eq("account_code", planRow.account_code)
        .eq("status", "active")
        .order("current_balance", { ascending: false })
        .limit(1).single();
      if (bk) {
        const newUsed = Math.max(0, Number(bk.used_amount || 0) + diff);
        await sb.from("bankbooks").update({ used_amount: newUsed, updated_at: now }).eq("id", bk.id);
      }
    } catch(bkErr) { console.warn("[P2] bankbooks 처리 skip:", bkErr.message); }

    // 3) 이력 저장
    try {
      await sb.from("budget_adjust_logs").insert({
        tenant_id: planRow.tenant_id,
        plan_id: planId,
        before_amount: curAlloc,
        after_amount: newAmt,
        adjusted_by: boCurrentPersona?.id || "bo_admin",
        adjusted_at: now,
        reason: `BO 관리자 배정액 ${action}`,
      });
    } catch(logErr) { console.warn("[P2] 이력 저장 skip:", logErr.message); }

    // 캐시 갱신
    const cached = (_boPlanMgmtData || []).find(p => p.id === planId);
    if (cached) cached.allocated_amount = newAmt;
    if (_boPlanDetailView?.id === planId) _boPlanDetailView.allocated_amount = newAmt;

    alert(`✅ 배정액이 ${newAmt.toLocaleString()}원으로 수정되었습니다.`);
    // 패널 갱신
    _renderBoAllocEditPanel(_boPlanDetailView);
    // 헤더 배정액 셀 즉시 갱신
    const allocCell = document.querySelector("[data-plan-alloc]");
    if (allocCell) allocCell.textContent = newAmt.toLocaleString() + "원";

  } catch(err) {
    alert("❌ 저장 실패: " + err.message);
  }
}
window._boSaveAllocAmount = _boSaveAllocAmount;

// ━━━ [P3] 결재 이력 패널 (submission_documents + approval_history) ━━━━━━━━━
async function _renderBoApprovalHistoryPanel(planId) {
  const panel = document.getElementById("bo-approval-history-panel");
  if (!panel) return;
  panel.innerHTML = `<div style="color:#9CA3AF;font-size:12px;padding:8px 0">결재 이력 조회 중...</div>`;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { panel.innerHTML = ""; return; }

  try {
    // submission_items → submission_documents 연결
    const { data: items } = await sb.from("submission_items")
      .select("submission_id").eq("item_id", String(planId));

    if (!items || items.length === 0) {
      panel.innerHTML = `
        <div style="border:1.5px solid #F3F4F6;border-radius:12px;padding:16px 20px;color:#9CA3AF;font-size:12px;text-align:center">
          📭 상신 이력 없음 (직접 결재 처리된 계획)
        </div>`;
      return;
    }

    const subId = items[0].submission_id;
    const [{ data: doc }, { data: hist }] = await Promise.all([
      sb.from("submission_documents")
        .select("id, title, status, approval_nodes, current_node_order, submitted_at, approved_at, rejected_at, reject_reason")
        .eq("id", subId).single(),
      sb.from("approval_history")
        .select("node_order, node_label, action, approver_name, comment, action_at")
        .eq("submission_id", subId)
        .order("action_at"),
    ]);

    if (!doc) { panel.innerHTML = ""; return; }

    const DOC_STATUS = {
      submitted: { label: "결재대기", color: "#D97706", bg: "#FFFBEB" },
      in_review: { label: "1차검토중", color: "#7C3AED", bg: "#F5F3FF" },
      approved:  { label: "승인완료",  color: "#059669", bg: "#F0FDF4" },
      rejected:  { label: "반려",     color: "#DC2626", bg: "#FEF2F2" },
      recalled:  { label: "회수됨",   color: "#6B7280", bg: "#F9FAFB" },
    };
    const ds = DOC_STATUS[doc.status] || { label: doc.status, color: "#6B7280", bg: "#F9FAFB" };
    const ACTION_LABEL = { approved: "승인", rejected: "반려", in_review: "1차검토완료", recalled: "회수" };

    const nodes = doc.approval_nodes || [];
    const curIdx = doc.current_node_order || 0;

    const nodesHtml = nodes.length > 0 ? `
      <div style="display:flex;align-items:center;gap:0;margin-bottom:16px;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">
          <div style="width:28px;height:28px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;font-size:11px;color:white">✔</div>
          <span style="font-size:9px;font-weight:800;color:#059669">상신</span>
        </div>
        ${nodes.map((n, i) => {
          const matchH = (hist || []).filter(h => h.node_order === i);
          const lastH = matchH[matchH.length - 1];
          const isDone = i < curIdx || (i === curIdx && ['approved','rejected'].includes(doc.status));
          const isCur  = i === curIdx && ['submitted','in_review'].includes(doc.status);
          const isRej  = lastH?.action === 'rejected';
          const nodeBg = isRej ? '#FEE2E2' : isDone ? '#059669' : isCur ? '#7C3AED' : '#E5E7EB';
          const nodeColor = isRej ? '#DC2626' : isDone ? '#059669' : isCur ? '#7C3AED' : '#9CA3AF';
          const nodeIcon = isRej ? '❌' : isDone ? '✔' : isCur ? '🔄' : '⏳';
          const lineColor = isDone && !isRej ? '#059669' : '#E5E7EB';
          return `<div style="display:flex;align-items:center;flex-shrink:0">
            <div style="width:24px;height:2px;background:${lineColor}"></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
              <div style="width:28px;height:28px;border-radius:50%;background:${nodeBg};display:flex;align-items:center;justify-content:center;font-size:11px;color:${isDone||isCur?'white':'#9CA3AF'}">${nodeIcon}</div>
              <span style="font-size:9px;font-weight:800;color:${nodeColor};max-width:56px;text-align:center;line-height:1.2">${n.label||n.approverKey||'결재'}</span>
              ${lastH?.approver_name ? `<span style="font-size:8px;color:#9CA3AF">${lastH.approver_name}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>` : "";

    const histHtml = (hist || []).length > 0
      ? (hist || []).map(h => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #F3F4F6">
          <div style="width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0;background:${h.action==='approved'?'#059669':h.action==='rejected'?'#EF4444':'#9CA3AF'}"></div>
          <div style="font-size:12px;flex:1">
            <span style="font-weight:800;color:#374151">${h.node_label||''} ${h.approver_name||''}</span>
            <span style="color:#9CA3AF;margin-left:6px;font-size:11px">${ACTION_LABEL[h.action]||h.action}</span>
            ${h.comment ? `<div style="color:#6B7280;margin-top:2px;font-size:11px">"${h.comment}"</div>` : ''}
            <div style="color:#D1D5DB;font-size:10px;margin-top:2px">${new Date(h.action_at||h.created_at).toLocaleString('ko-KR')}</div>
          </div>
        </div>`).join("")
      : `<div style="color:#9CA3AF;font-size:12px;text-align:center;padding:8px 0">결재 처리 이력 없음</div>`;

    panel.innerHTML = `
      <div style="border:1.5px solid #E5E7EB;border-radius:14px;overflow:hidden">
        <div style="padding:12px 20px;background:#F9FAFB;border-bottom:1.5px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:13px;font-weight:900;color:#374151">📋 상신 & 결재 이력</h3>
          <span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:${ds.bg};color:${ds.color}">${ds.label}</span>
        </div>
        <div style="padding:16px 20px">
          <div style="font-size:11px;color:#6B7280;margin-bottom:12px">
            📄 <strong>${doc.title||'상신 문서'}</strong>
            ${doc.submitted_at ? ` · 상신일: ${new Date(doc.submitted_at).toLocaleDateString('ko-KR')}` : ''}
            ${doc.approved_at ? ` · 승인일: ${new Date(doc.approved_at).toLocaleDateString('ko-KR')}` : ''}
          </div>
          ${nodesHtml}
          <div style="display:flex;flex-direction:column;gap:0">${histHtml}</div>
        </div>
      </div>`;

  } catch(err) {
    console.warn("[P3] 결재 이력 조회 실패:", err.message);
    panel.innerHTML = "";
  }
}
window._renderBoApprovalHistoryPanel = _renderBoApprovalHistoryPanel;

// ━━━ 키 매핑 헬퍼 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _toBoAdminKey(key) {
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

// ─── P11: 운영담당자 1차 검토 완료 ────────────────────────────────────────
async function boPlanOpReview(id) {
  const plan = (_boPlanMgmtData || []).find(p => p.id === id);
  const planName = plan?.edu_name || plan?.title || id;
  if (!confirm(`🔍 "${planName}"\n\n1차 검토를 완료하고 총괄담당자에게 전달하시겠습니까?`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      await sb.from('plans').update({
        status: 'in_review',
        reviewed_at: new Date().toISOString(),
        reviewed_by: boCurrentPersona?.name || 'op_manager',
        updated_at: new Date().toISOString(),
      }).eq('id', id);

      // 검토 이력 기록
      await _boNotifyPlanStatus(sb, id, plan, 'in_review', boCurrentPersona);
    } catch (err) {
      alert('❌ 1차 검토 처리 실패: ' + err.message);
      return;
    }
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  _boShowToast(`📤 "${planName}" 1차 검토 완료 — 총괄담당자에게 전달됨`, 'info');
  renderBoPlanMgmt();
}

async function boPlanApprove(id) {
  const plan = (_boPlanMgmtData || []).find(p => p.id === id);
  const planName = plan?.edu_name || plan?.title || id;
  if (!confirm(`✅ "${planName}"\n\n이 교육계획을 승인하시겠습니까?`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  const prevStatus = plan?.status || 'pending';
  if (sb) {
    await sb.from('plans').update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: boCurrentPersona?.name || 'admin',
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    // E-6: 알림 — 1차검토 완료 상태에서 승인된 경우 신청자에게 알림 기록
    await _boNotifyPlanStatus(sb, id, plan, 'approved', boCurrentPersona);
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  _boShowToast(`✅ "${planName}" 승인 완료!`, 'success');
  renderBoPlanMgmt();
}

async function boPlanReject(id) {
  const plan = (_boPlanMgmtData || []).find(p => p.id === id);
  const planName = plan?.edu_name || plan?.title || id;
  const reason = prompt(`❌ "${planName}" 반려\n\n반려 사유를 입력해주세요:`);
  if (!reason) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    await sb.from('plans').update({
      status: 'rejected',
      reject_reason: reason,
      rejected_at: new Date().toISOString(),
      rejected_by: boCurrentPersona?.name || 'admin',
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    // E-6: 반려 알림 기록
    await _boNotifyPlanStatus(sb, id, plan, 'rejected', boCurrentPersona, reason);
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  _boShowToast(`❌ "${planName}" 반려 처리됨`, 'error');
  renderBoPlanMgmt();
}

// ─── 승인 취소 (강제 → 임시저장) ──────────────────────────────────────────
async function boPlanForceRevert(id) {
  const plan = (_boPlanMgmtData || []).find((p) => p.id === id);
  const planName = plan?.title || plan?.edu_name || id;
  if (
    !confirm(
      `⚠️ 승인 취소 확인\n\n"${planName}"\n\n승인을 취소하고 임시저장 상태로 되돌리시겠습니까?\n(예산 확정액이 차감될 수 있습니다)`,
    )
  )
    return;
  const reason = prompt("승인 취소 사유를 입력해주세요:");
  if (reason === null) return; // 취소 클릭
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      await sb
        .from("plans")
        .update({
          status: "draft",
          reverted_at: new Date().toISOString(),
          reverted_by: boCurrentPersona?.name || "admin",
          revert_reason: reason || "관리자 승인 취소",
        })
        .eq("id", id);
      alert(`✅ "${planName}" 승인이 취소되어 임시저장 상태로 변경되었습니다.`);
    } catch (err) {
      alert("❌ 승인 취소 실패: " + err.message);
      return;
    }
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  renderBoPlanMgmt();
}

// ─── 소프트 삭제 (deleted_at 플래그) ──────────────────────────────────────
async function boPlanSoftDelete(id) {
  const plan = (_boPlanMgmtData || []).find((p) => p.id === id);
  const planName = plan?.title || plan?.edu_name || id;
  const statusKr =
    plan?.status === "approved"
      ? "승인완료"
      : plan?.status === "draft"
        ? "임시저장"
        : plan?.status || "";
  if (
    !confirm(
      `🗑 삭제 확인\n\n"${planName}" (${statusKr})\n\n이 교육계획을 삭제하시겠습니까?\n(데이터는 보존되며, 목록에서만 숨겨집니다)`,
    )
  )
    return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      await sb
        .from("plans")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: boCurrentPersona?.name || "admin",
        })
        .eq("id", id);
      alert(`✅ "${planName}" 삭제 완료 (복구 가능)`);
    } catch (err) {
      alert("❌ 삭제 실패: " + err.message);
      return;
    }
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  renderBoPlanMgmt();
}

// ─── 수요예측 기간 상태 판별 ──────────────────────────────────────────────
function _getForecastPeriodStatus(dl) {
  if (dl.is_closed)
    return {
      status: "closed",
      badge:
        '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:#FEE2E2;color:#DC2626">🔒 수동마감</span>',
    };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = dl.recruit_start ? new Date(dl.recruit_start) : null;
  const end = dl.recruit_end ? new Date(dl.recruit_end) : null;
  if (start && now < start) {
    const dDay = Math.ceil((start - now) / 86400000);
    return {
      status: "not_started",
      badge: `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:#FEF3C7;color:#B45309">⏳ 접수전 (D-${dDay})</span>`,
    };
  }
  if (end && now > end)
    return {
      status: "expired",
      badge:
        '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:#FEE2E2;color:#DC2626">🔴 기간만료</span>',
    };
  if (start && end) {
    const dDay = Math.ceil((end - now) / 86400000);
    return {
      status: "open",
      badge: `<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:#D1FAE5;color:#059669">🟢 접수중 (D-${dDay})</span>`,
    };
  }
  return {
    status: "open",
    badge:
      '<span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:4px;background:#D1FAE5;color:#059669">🟢 접수중</span>',
  };
}

// ─── 기간 설정 모달 ───────────────────────────────────────────────────────
function _openForecastPeriodModal() {
  const existing = document.getElementById("forecast-period-modal");
  if (existing) existing.remove();

  const defaultDl =
    _boForecastDeadlines.find((d) => d.account_code === "__ALL__") || {};
  const acctRows = _boTenantAccounts.map((a) => {
    const dl = _boForecastDeadlines.find((d) => d.account_code === a.id);
    return {
      id: a.id,
      name: a.name,
      type: a.account_type,
      start: dl?.recruit_start || "",
      end: dl?.recruit_end || "",
      enabled: !!dl,
    };
  });

  const modal = document.createElement("div");
  modal.id = "forecast-period-modal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999";
  modal.innerHTML = `
  <div style="background:white;border-radius:16px;width:580px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB">
      <h3 style="margin:0;font-size:16px;font-weight:900;color:#111827">${_boPlanFiscalYear}년도 수요예측 접수기간 설정</h3>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7280">예산계정별 접수 시작일·종료일을 설정합니다</p>
    </div>
    <div style="padding:20px 24px">
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:900;color:#1D4ED8;margin-bottom:8px">📌 전체 기본 기간</div>
        <div style="display:flex;gap:12px;align-items:center">
          <label style="font-size:12px;font-weight:700;color:#374151">시작:</label>
          <input type="date" id="fp-default-start" value="${defaultDl.recruit_start || ""}" style="padding:6px 10px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px">
          <label style="font-size:12px;font-weight:700;color:#374151">종료:</label>
          <input type="date" id="fp-default-end" value="${defaultDl.recruit_end || ""}" style="padding:6px 10px;border-radius:8px;border:1.5px solid #E5E7EB;font-size:12px">
        </div>
      </div>
      <div style="font-size:13px;font-weight:900;color:#374151;margin-bottom:8px">📌 계정별 개별 기간 (선택)</div>
      ${acctRows
        .map(
          (a) => `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;padding:8px 10px;border-radius:8px;background:${a.enabled ? "#F0F9FF" : "#F9FAFB"};border:1px solid ${a.enabled ? "#BFDBFE" : "#F3F4F6"}">
        <input type="checkbox" id="fp-chk-${a.id}" ${a.enabled ? "checked" : ""} onchange="document.getElementById('fp-row-${a.id}').style.opacity=this.checked?1:.4" style="width:16px;height:16px">
        <div style="width:160px;font-size:12px;font-weight:700;color:#374151">${a.name} <span style="font-size:10px;color:#9CA3AF">${a.type}</span></div>
        <div id="fp-row-${a.id}" style="display:flex;gap:8px;align-items:center;opacity:${a.enabled ? 1 : 0.4}">
          <input type="date" id="fp-start-${a.id}" value="${a.start}" style="padding:4px 8px;border-radius:6px;border:1px solid #E5E7EB;font-size:11px">
          <span style="font-size:11px;color:#9CA3AF">~</span>
          <input type="date" id="fp-end-${a.id}" value="${a.end}" style="padding:4px 8px;border-radius:6px;border:1px solid #E5E7EB;font-size:11px">
        </div>
      </div>`,
        )
        .join("")}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #E5E7EB;display:flex;justify-content:flex-end;gap:10px">
      <button onclick="document.getElementById('forecast-period-modal').remove()" style="padding:8px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">취소</button>
      <button onclick="_saveForecastPeriods()" style="padding:8px 20px;border-radius:10px;border:none;background:#1D4ED8;color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(29,78,216,.3)">💾 저장</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

// ─── 기간 저장 ────────────────────────────────────────────────────────────
async function _saveForecastPeriods() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    alert("DB 연결 필요");
    return;
  }
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  const fy = _boPlanFiscalYear;
  const defStart = document.getElementById("fp-default-start")?.value || null;
  const defEnd = document.getElementById("fp-default-end")?.value || null;

  // 밸리데이션
  if (defStart && defEnd && defStart > defEnd) {
    alert("⚠ 기본 기간: 종료일은 시작일 이후여야 합니다");
    return;
  }

  const rows = [];
  // 기본 기간
  if (defStart || defEnd) {
    rows.push({
      tenant_id: tenantId,
      fiscal_year: fy,
      account_code: "__ALL__",
      recruit_start: defStart,
      recruit_end: defEnd,
      is_closed: false,
    });
  }
  // 개별 계정
  for (const a of _boTenantAccounts) {
    const chk = document.getElementById(`fp-chk-${a.id}`);
    if (!chk?.checked) continue;
    const s = document.getElementById(`fp-start-${a.id}`)?.value || null;
    const e = document.getElementById(`fp-end-${a.id}`)?.value || null;
    if (s && e && s > e) {
      alert(`⚠ ${a.name}: 종료일은 시작일 이후여야 합니다`);
      return;
    }
    rows.push({
      tenant_id: tenantId,
      fiscal_year: fy,
      account_code: a.id,
      recruit_start: s,
      recruit_end: e,
      is_closed: false,
    });
  }

  try {
    // 기존 삭제 후 삽입 (깔끔한 교체)
    await sb
      .from("forecast_deadlines")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("fiscal_year", fy);
    if (rows.length > 0) {
      const { error } = await sb.from("forecast_deadlines").insert(rows);
      if (error) throw error;
    }
    alert(`✅ ${fy}년도 수요예측 접수기간 저장 완료 (${rows.length}건)`);
  } catch (err) {
    alert("❌ 저장 실패: " + err.message);
  }

  document.getElementById("forecast-period-modal")?.remove();
  _boPlanMgmtData = null;
  _boForecastDeadlines = [];
  renderBoPlanMgmt();
}

// ─── 전체 일괄 마감 ───────────────────────────────────────────────────────
async function _bulkCloseForecast() {
  if (
    !confirm(`${_boPlanFiscalYear}년도 수요예측을 전체 일괄 마감하시겠습니까?`)
  )
    return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  try {
    await sb
      .from("forecast_deadlines")
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: boCurrentPersona?.name || "admin",
      })
      .eq("tenant_id", tenantId)
      .eq("fiscal_year", _boPlanFiscalYear);
    // __ALL__ 없으면 하나 생성
    const hasAll = _boForecastDeadlines.some(
      (d) => d.account_code === "__ALL__",
    );
    if (!hasAll) {
      await sb.from("forecast_deadlines").insert({
        tenant_id: tenantId,
        fiscal_year: _boPlanFiscalYear,
        account_code: "__ALL__",
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: boCurrentPersona?.name || "admin",
      });
    }
    alert(`✅ ${_boPlanFiscalYear}년도 수요예측 전체 일괄 마감 완료`);
  } catch (err) {
    alert("❌ 마감 실패: " + err.message);
  }
  _boPlanMgmtData = null;
  _boForecastDeadlines = [];
  renderBoPlanMgmt();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ 인라인 편집 함수 (엑셀형 UX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 편집 모드 토글 ──
function _boPlanToggleEdit() {
  _boPlanEditMode = true;
  _boPlanEdits = {};
  renderBoPlanMgmt();
  // 첫 번째 입력에 포커스
  setTimeout(() => {
    const first = document.getElementById('bo-alloc-input-0');
    if (first) first.focus();
  }, 150);
}

// ── 인라인 값 변경 감지 ──
function _boPlanInlineChange(planId, rawValue) {
  const val = Math.max(0, parseInt(rawValue) || 0);
  const orig = _boPlanOriginals[planId] || 0;
  if (val === orig) {
    delete _boPlanEdits[planId];
  } else {
    _boPlanEdits[planId] = val;
  }
  // 합계 실시간 갱신
  _boPlanUpdateTotal();
  // 저장 버튼 카운트 갱신
  _boPlanUpdateEditCount();
}

// ── 합계 실시간 갱신 ──
function _boPlanUpdateTotal() {
  const plans = _boPlanMgmtData || [];
  let sum = 0;
  plans.forEach(p => {
    const edited = _boPlanEdits[p.id];
    sum += (edited !== undefined ? edited : Number(p.allocated_amount || 0));
  });
  const el = document.getElementById('bo-alloc-total');
  if (el) el.textContent = sum.toLocaleString() + '원';
}

// ── 편집 카운트 갱신 ──
function _boPlanUpdateEditCount() {
  const cnt = Object.keys(_boPlanEdits).length;
  // 저장 버튼 텍스트 갱신 (DOM 직접)
  const btns = document.querySelectorAll('button');
  btns.forEach(btn => {
    if (btn.textContent.includes('일괄 저장')) {
      btn.textContent = `💾 일괄 저장 (${cnt}건 변경)`;
      btn.style.background = cnt > 0 ? '#1D4ED8' : '#9CA3AF';
      btn.style.cursor = cnt > 0 ? 'pointer' : 'default';
      btn.disabled = cnt === 0;
    }
  });
  // 수정됨 카운트
  const badge = document.querySelector('[style*="수정됨"]') ||
    Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('수정됨'));
  if (badge) badge.textContent = `⚡ ${cnt}건 수정됨`;
}

// ── 키보드 네비게이션 (Tab/Enter/Escape) ──
function _boPlanInlineKeyNav(e, idx) {
  if (e.key === 'Tab' || e.key === 'Enter') {
    e.preventDefault();
    const nextIdx = e.shiftKey ? idx - 1 : idx + 1;
    const next = document.getElementById(`bo-alloc-input-${nextIdx}`);
    if (next) {
      next.focus();
      next.select();
    }
  } else if (e.key === 'Escape') {
    _boPlanCancelEdit();
  }
}

// ── 일괄 저장 (batch update) ──
async function _boPlanBatchSave() {
  const edits = _boPlanEdits;
  const ids = Object.keys(edits);
  if (ids.length === 0) { alert('변경된 항목이 없습니다.'); return; }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  // 배정액 > 계획액 경고 체크
  const plans = _boPlanMgmtData || [];
  const overBudget = ids.filter(id => {
    const plan = plans.find(p => p.id === id);
    return plan && edits[id] > Number(plan.amount || 0);
  });
  if (overBudget.length > 0) {
    const names = overBudget.map(id => {
      const p = plans.find(pp => pp.id === id);
      return `• ${p?.edu_name || p?.title || id}: 배정 ${edits[id].toLocaleString()}원 > 계획 ${Number(p?.amount||0).toLocaleString()}원`;
    }).join('\n');
    if (!confirm(`⚠️ 계획액을 초과하여 배정하는 항목이 있습니다:\n\n${names}\n\n계속 저장하시겠습니까?`)) return;
  }

  if (!confirm(`${ids.length}건의 배정액을 일괄 저장하시겠습니까?`)) return;

  try {
    let saved = 0;
    const chunk = 50;
    for (let i = 0; i < ids.length; i += chunk) {
      const batch = ids.slice(i, i + chunk);
      const promises = batch.map(id =>
        sb.from('plans')
          .update({
            allocated_amount: edits[id],
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
      );
      const results = await Promise.all(promises);
      results.forEach((r, j) => {
        if (r.error) throw new Error(`${batch[j]}: ${r.error.message}`);
      });
      saved += batch.length;
    }

    // 메모리 캐시 갱신
    ids.forEach(id => {
      const cached = plans.find(p => p.id === id);
      if (cached) cached.allocated_amount = edits[id];
    });

    alert(`✅ ${saved}건 배정액 일괄 저장 완료`);

    // ★ Phase E: 배정 합계 기준 통장 일괄 입금 제안
    const totalAllocated = ids.reduce((s,id) => s + Number(edits[id] || 0), 0);
    if (totalAllocated > 0) {
      // 해당 팀의 orgId 추출
      const samplePlan = plans.find(p => ids.includes(p.id));
      const orgId = samplePlan?.applicant_org_id || samplePlan?.org_id;
      if (orgId && confirm(`💰 배정 합계 ${totalAllocated.toLocaleString()}원을 팀 통장에 입금하시겠습니까?\n\n배정은 가이드라인이며, 실제 예산 집행을 위해서는\n팀 통장에 입금이 필요합니다.`)) {
        try {
          // 해당 팀+계정 통장 조회
          const acctCode = samplePlan?.account_code || "";
          const tenantId = samplePlan?.tenant_id || "HMC";
          const { data: bk } = await sb.from("bankbooks")
            .select("id,current_balance")
            .eq("tenant_id", tenantId)
            .eq("org_id", orgId)
            .eq("account_code", acctCode)
            .eq("status", "active")
            .limit(1).single();
          if (bk) {
            const newBal = Number(bk.current_balance) + totalAllocated;
            await sb.from("bankbooks").update({
              current_balance: newBal,
              updated_at: new Date().toISOString()
            }).eq("id", bk.id);
            await sb.from("budget_usage_log").insert({
              tenant_id: tenantId,
              bankbook_id: bk.id,
              action: "deposit",
              amount: totalAllocated,
              balance_before: Number(bk.current_balance),
              balance_after: newBal,
              reference_type: "allocation_batch",
              memo: `배정 기반 일괄 입금 (${ids.length}건, ${totalAllocated.toLocaleString()}원)`,
              performed_by: boCurrentPersona?.name || "system"
            });
            alert(`✅ ${totalAllocated.toLocaleString()}원이 팀 통장에 입금되었습니다.\n잔액: ${newBal.toLocaleString()}원`);
          } else {
            alert("⚠️ 해당 팀의 통장이 없습니다. 예산관리 > 통장에서 먼저 생성하세요.");
          }
        } catch(bkErr) {
          console.warn("[Phase E] Bankbook deposit error:", bkErr.message);
          alert("통장 입금 중 오류: " + bkErr.message);
        }
      }
    }
    _boPlanEditMode = false;
    _boPlanEdits = {};
    _boPlanMgmtData = null;
    renderBoPlanMgmt();
  } catch (err) {
    alert('❌ 저장 실패: ' + err.message);
  }
}

// ── 편집 취소 ──
function _boPlanCancelEdit() {
  if (Object.keys(_boPlanEdits).length > 0) {
    if (!confirm('수정사항을 모두 취소하시겠습니까?')) return;
  }
  _boPlanEditMode = false;
  _boPlanEdits = {};
  renderBoPlanMgmt();
}

// ── F-010-d: 셀 단위 개별 초기화 (↩ 버튼) ──
function _boPlanResetCell(planId, idx) {
  delete _boPlanEdits[planId];
  // input 값 직접 복원
  const orig = _boPlanOriginals[planId] || 0;
  const input = document.getElementById(`bo-alloc-input-${idx}`);
  if (input) {
    input.value = orig;
    input.style.borderColor = '#E5E7EB';
    input.style.background = '#fff';
    // 부모 td 배경 복원
    const td = input.closest('td');
    if (td) td.style.background = '';
    const tr = input.closest('tr');
    if (tr) {
      tr.style.background = '';
      tr.onmouseout = () => { tr.style.background = ''; };
      tr.onmouseover = () => { tr.style.background = '#F0F9FF'; };
    }
    // diff 뱃지 제거
    const badge = td?.querySelector('span[style*="B45309"]');
    if (badge) badge.remove();
    // 개별 ↩ 버튼 제거
    const resetBtn = td?.querySelector('button');
    if (resetBtn) resetBtn.remove();
  }
  _boPlanUpdateTotal();
  _boPlanUpdateEditCount();
}

// ─── E-4: 1차검토 완료 (운영담당자 → in_review) ───────────────────────────────
// 운영담당자가 saved/pending 계획을 'in_review'로 전환
// 총괄담당자에게 "검토 완료 → 승인 요청" 신호
async function boPlanReview(planId) {
  const plan = (_boPlanMgmtData || []).find(p => p.id === planId);
  const planName = plan?.edu_name || plan?.title || planId;
  if (!confirm(`🔍 1차검토 — "${planName}"\n\n이 교육계획을 1차검토 완료 처리하시겠습니까?\n\n총괄담당자에게 최종 승인 요청이 전달됩니다.`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    const { data: cur } = await sb.from('plans').select('status,tenant_id').eq('id', planId).single();
    if (!['saved','pending','pending_approval'].includes(cur?.status)) {
      alert('⚠️ 1차검토는 저장완료(saved) 또는 결재대기(pending) 상태에서만 가능합니다.');
      return;
    }

    const { error } = await sb.from('plans').update({
      status: 'in_review',
      reviewed_at: new Date().toISOString(),
      reviewed_by: boCurrentPersona?.name || 'admin',
      updated_at: new Date().toISOString(),
    }).eq('id', planId);
    if (error) throw error;

    // UI-3: approval_history 기록 + 토스트 알림
    await _boNotifyPlanStatus(sb, planId, { ...plan, status: cur?.status, tenant_id: cur?.tenant_id || plan?.tenant_id },
      'in_review', boCurrentPersona);
    _boShowToast(`🔍 "${planName}" 1차검토 완료! 총괄담당자에게 전달됩니다.`, 'info');

    _boPlanMgmtData = null;
    renderBoPlanMgmt();
  } catch (err) {
    alert('1차검토 처리 실패: ' + err.message);
    console.error('[boPlanReview]', err.message);
  }
}

// ─── E-6: 알림 시스템 헬퍼 ─────────────────────────────────────────────────

/**
 * 계획 상태 변경 시 approval_history 테이블에 기록
 * FO 결재함에서 신청자가 최신 결재 이력을 확인할 수 있도록 합니다.
 */
async function _boNotifyPlanStatus(sb, planId, plan, newStatus, actor, reason) {
  if (!sb || !planId) return;
  try {
    const actionLabel = {
      approved:  '최종승인',
      rejected:  '반려',
      in_review: '1차검토완료',
      recalled:  '회수',
    }[newStatus] || newStatus;

    // approval_history 테이블에 이력 기록
    const { error } = await sb.from('approval_history').insert({
      plan_id:       planId,
      action:        actionLabel,
      actor_id:      actor?.id || null,
      actor_name:    actor?.name || 'system',
      actor_role:    actor?.role || null,
      from_status:   plan?.status || null,
      to_status:     newStatus,
      reason:        reason || null,
      tenant_id:     plan?.tenant_id || actor?.tenantId || null,
      created_at:    new Date().toISOString(),
    });
    if (error) {
      // approval_history 컬럼 이름이 다를 수 있으므로 비치명적 처리
      console.warn('[E-6] approval_history 기록 오류 (비치명적):', error.message);
    } else {
      console.log(`[E-6] 알림 기록 완료: ${planId} → ${newStatus} by ${actor?.name}`);
    }
  } catch (e) {
    console.warn('[E-6] _boNotifyPlanStatus 오류:', e.message);
  }
}

/**
 * BO 화면 우측 하단 토스트 알림 표시 (2.5초 자동 사라짐)
 * @param msg    표시할 메시지
 * @param type   'success' | 'error' | 'info'
 */
function _boShowToast(msg, type = 'info') {
  const COLOR = {
    success: { bg: '#059669', border: '#065F46' },
    error:   { bg: '#DC2626', border: '#991B1B' },
    info:    { bg: '#1D4ED8', border: '#1E3A8A' },
  }[type] || { bg: '#374151', border: '#111827' };

  const toastId = `bo-toast-${Date.now()}`;
  const div = document.createElement('div');
  div.id = toastId;
  div.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:99999;
    background:${COLOR.bg};color:white;
    padding:12px 22px;border-radius:12px;
    font-size:13px;font-weight:800;
    box-shadow:0 4px 20px rgba(0,0,0,.25);
    border-left:4px solid ${COLOR.border};
    animation:_boToastIn .25s ease;
    max-width:320px;line-height:1.4;
  `;
  div.textContent = msg;
  document.body.appendChild(div);

  // CSS 애니메이션 주입 (중복 방지)
  if (!document.getElementById('_boToastStyle')) {
    const s = document.createElement('style');
    s.id = '_boToastStyle';
    s.textContent = `@keyframes _boToastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }

  setTimeout(() => {
    div.style.transition = 'opacity .3s';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 350);
  }, 2500);
}

// ─── P2: 수요예측 번들 취합 뷰 ─────────────────────────────────────────────────
async function renderBoPlanForecastBundles(el, tenantId, sb) {
  // 1) 번들 상세 뷰 라우팅
  if (_boForecastBundleDetail) {
    _renderForecastBundleDetail(el, _boForecastBundleDetail);
    return;
  }

  const isGlobalBO = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : false;
  const isOpBO = typeof boIsOpManager === 'function' ? boIsOpManager() : false;
  const canApprove = isGlobalBO;
  const canReview = isOpBO && !isGlobalBO;

  // 2) submission_documents 로드 (team_forecast + org_forecast)
  if (!_boForecastBundles && sb) {
    try {
      const { data } = await sb
        .from('submission_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('fiscal_year', _boPlanFiscalYear)
        .in('submission_type', ['team_forecast', 'org_forecast'])
        .order('created_at', { ascending: false });
      _boForecastBundles = data || [];
    } catch (e) {
      _boForecastBundles = [];
    }
  }
  if (!_boForecastBundles) _boForecastBundles = [];

  // 3) org_forecast(취합본) vs team_forecast(팀 수요) 분리
  const orgBundles = _boForecastBundles.filter(b => b.submission_type === 'org_forecast');
  const teamForecasts = _boForecastBundles.filter(b => b.submission_type === 'team_forecast');

  // 4) KPI 집계
  const pending = teamForecasts.filter(t => t.status === 'submitted' || t.status === 'pending').length;
  const approved = teamForecasts.filter(t => t.status === 'approved').length;
  const totalRequested = teamForecasts.reduce((s, t) => s + Number(t.total_amount || 0), 0);
  const totalAllocated = orgBundles.reduce((s, b) => s + Number(b.total_allocated || 0), 0);

  // 5) 계정코드별 팀 수요 그루핑
  const byAccount = {};
  teamForecasts.forEach(t => {
    const k = t.account_code || '미분류';
    if (!byAccount[k]) byAccount[k] = [];
    byAccount[k].push(t);
  });

  // 6) 탭 공통 헤더 렌더링 함수
  function tabHeader() {
    const forecastPending = pending;
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <h1 class="bo-page-title" style="margin:0">📋 교육계획 관리</h1>
            ${typeof boRoleModeBadge==="function" ? boRoleModeBadge() : ""}
          </div>
          <p class="bo-page-sub">${canApprove ? "총괄담당자 — 수요예측 번들 최종 승인" : canReview ? "운영담당자 — 수요예측 1차 검토" : "수요예측 번들 조회"}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="_boForecastBundles=null;_boPlanTab='forecast_bundle';renderBoPlanMgmt()" class="bo-btn-primary">🔄 새로고침</button>
        </div>
      </div>
      ${typeof boOpScopeBanner === 'function' ? boOpScopeBanner() : ''}
      <!-- 탭 네비게이션 -->
      <div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #E5E7EB">
        <button onclick="_boPlanTab='plans';renderBoPlanMgmt()"
          style="padding:10px 20px;border:none;border-bottom:3px solid transparent;background:none;font-size:13px;font-weight:600;color:#6B7280;cursor:pointer;margin-bottom:-2px">
          📋 계획 목록
        </button>
        <button onclick="_boPlanTab='forecast_bundle';_boForecastBundles=null;renderBoPlanMgmt()"
          style="padding:10px 20px;border:none;border-bottom:3px solid #7C3AED;background:none;font-size:13px;font-weight:900;color:#7C3AED;cursor:pointer;margin-bottom:-2px">
          📦 수요예측 번들 취합
          ${forecastPending > 0 ? `<span style="margin-left:6px;font-size:10px;font-weight:900;padding:2px 7px;border-radius:12px;background:#EF4444;color:white">${forecastPending}</span>` : ''}
        </button>
      </div>`;
  }

  // 7) KPI 카드
  const kpiCards = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      <div style="padding:16px 20px;border-radius:12px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border:1.5px solid #BFDBFE">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:6px">📝 팀 제출 건수</div>
        <div style="font-size:26px;font-weight:900;color:#1E40AF">${teamForecasts.length}<span style="font-size:12px;margin-left:4px;color:#6B7280">건</span></div>
      </div>
      <div style="padding:16px 20px;border-radius:12px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border:1.5px solid #FDE68A">
        <div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:6px">⏳ 검토 대기</div>
        <div style="font-size:26px;font-weight:900;color:#B45309">${pending}<span style="font-size:12px;margin-left:4px;color:#6B7280">건</span></div>
      </div>
      <div style="padding:16px 20px;border-radius:12px;background:linear-gradient(135deg,#F0FDF4,#D1FAE5);border:1.5px solid #6EE7B7">
        <div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:6px">✅ 승인 완료</div>
        <div style="font-size:26px;font-weight:900;color:#047857">${approved}<span style="font-size:12px;margin-left:4px;color:#6B7280">건</span></div>
      </div>
      <div style="padding:16px 20px;border-radius:12px;background:linear-gradient(135deg,#F5F3FF,#EDE9FE);border:1.5px solid #DDD6FE">
        <div style="font-size:11px;font-weight:700;color:#7C3AED;margin-bottom:6px">💰 총 요청액</div>
        <div style="font-size:18px;font-weight:900;color:#5B21B6">${totalRequested.toLocaleString()}<span style="font-size:11px;margin-left:2px">원</span></div>
      </div>
    </div>`;

  // 8) org_forecast(취합본) 섹션
  const orgSection = canApprove || canReview ? `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:14px;font-weight:900;color:#1F2937">🏢 1차 취합본 (org_forecast)</div>
        ${canApprove ? `<button onclick="boCreateOrgForecastBundle()" style="padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#7C3AED,#5B21B6);color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 3px 10px rgba(124,58,237,.3)">+ 취합본 생성</button>` : ''}
      </div>
      ${orgBundles.length === 0 ? `
        <div style="padding:30px;text-align:center;border-radius:12px;background:#F9FAFB;border:1.5px dashed #E5E7EB;color:#9CA3AF">
          <div style="font-size:32px;margin-bottom:8px">📭</div>
          <div style="font-weight:700">생성된 취합본이 없습니다</div>
          <div style="font-size:12px;margin-top:4px">팀 수요예측 제출 완료 후 취합본을 생성하세요</div>
        </div>` : orgBundles.map(b => {
          const sid = String(b.id).replace(/'/g, '');
          const stColors = { submitted:'#D97706', approved:'#059669', rejected:'#DC2626', draft:'#6B7280', in_review:'#7C3AED' };
          const stLabels = { submitted:'검토 대기', approved:'승인 완료', rejected:'반려', draft:'임시저장', in_review:'1차 검토 완료' };
          const stC = stColors[b.status] || '#6B7280';
          const stL = stLabels[b.status] || b.status;
          return `
          <div style="margin-bottom:10px;padding:16px 20px;border-radius:12px;background:white;border:1.5px solid ${stC}40;box-shadow:0 2px 8px rgba(0,0,0,.06)">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:10px;font-weight:900;padding:3px 10px;border-radius:8px;background:${stC}20;color:${stC}">${stL}</span>
                  <span style="font-size:12px;font-weight:900;color:#111827">${b.title || '수요예측 취합본'}</span>
                </div>
                <div style="font-size:11px;color:#6B7280">
                  ${b.submitter_org_name||''} · 계정: ${b.account_code||'-'} · 
                  요청: <strong>${Number(b.total_requested||b.total_amount||0).toLocaleString()}원</strong>
                  ${b.total_allocated ? ` · 배정: <strong style="color:#059669">${Number(b.total_allocated).toLocaleString()}원</strong>` : ''}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">
                <button onclick="_boForecastBundleDetail=${JSON.stringify(b).replace(/"/g,'&quot;')};renderBoPlanForecastBundles(document.getElementById('bo-content'),'${tenantId}',${sb?'getSB()':'null'})" style="padding:6px 12px;border-radius:8px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:800;border:1.5px solid #BFDBFE;cursor:pointer">📄 상세</button>
                ${(b.status === 'submitted' || b.status === 'in_review') && canApprove ? `
                <button onclick="boApproveOrgForecast('${sid}')" style="padding:6px 14px;border-radius:8px;background:#059669;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer">✅ 최종승인</button>
                <button onclick="boRejectOrgForecast('${sid}')" style="padding:6px 10px;border-radius:8px;background:white;color:#EF4444;font-size:11px;font-weight:800;border:1.5px solid #EF4444;cursor:pointer">❌ 반려</button>` : ''}
                ${b.status === 'submitted' && canReview ? `
                <button onclick="boReviewOrgForecast('${sid}')" style="padding:6px 14px;border-radius:8px;background:#F59E0B;color:white;font-size:11px;font-weight:900;border:none;cursor:pointer">🔍 1차 검토</button>` : ''}
              </div>
            </div>
          </div>`;
        }).join('')}
    </div>` : '';

  // 9) 계정별 팀 수요 그루핑 섹션
  const accountKeys = Object.keys(byAccount);
  const teamSection = `
    <div>
      <div style="font-size:14px;font-weight:900;color:#1F2937;margin-bottom:12px">👥 팀별 수요예측 제출 현황 (${_boPlanFiscalYear}년)</div>
      ${teamForecasts.length === 0 ? `
        <div style="padding:40px;text-align:center;border-radius:12px;background:#F9FAFB;border:1.5px dashed #E5E7EB;color:#9CA3AF">
          <div style="font-size:36px;margin-bottom:10px">📭</div>
          <div style="font-weight:700">팀이 제출한 수요예측이 없습니다</div>
          <div style="font-size:12px;margin-top:4px">프론트 오피스에서 수요예측을 제출하면 이 화면에서 확인할 수 있습니다</div>
        </div>` : accountKeys.map(accCode => {
          const items = byAccount[accCode];
          const accTotal = items.reduce((s, t) => s + Number(t.total_amount || 0), 0);
          const accPending = items.filter(t => t.status === 'submitted' || t.status === 'pending').length;
          const accApproved = items.filter(t => t.status === 'approved').length;
          return `
          <div style="margin-bottom:16px;border-radius:14px;border:1.5px solid #E5E7EB;overflow:hidden">
            <div style="padding:14px 20px;background:linear-gradient(135deg,#F8FAFC,#F1F5F9);display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:13px;font-weight:900;color:#1E3A5F">💳 ${accCode}</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#E0F2FE;color:#0369A1;font-weight:700">${items.length}팀</span>
                ${accPending > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#D97706;font-weight:700">대기 ${accPending}</span>` : ''}
                ${accApproved > 0 ? `<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:#D1FAE5;color:#059669;font-weight:700">승인 ${accApproved}</span>` : ''}
              </div>
              <div style="font-size:13px;font-weight:900;color:#1D4ED8">${accTotal.toLocaleString()}원</div>
            </div>
            <div style="background:white">
              ${items.map((t, idx) => {
                const stC2 = { submitted:'#D97706', approved:'#059669', rejected:'#DC2626', draft:'#6B7280', in_review:'#7C3AED' }[t.status] || '#6B7280';
                const stL2 = { submitted:'제출완료', approved:'승인', rejected:'반려', draft:'임시저장', in_review:'1차검토' }[t.status] || t.status;
                return `
                <div style="display:flex;align-items:center;padding:12px 20px;${idx > 0 ? 'border-top:1px solid #F3F4F6' : ''}">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:700;color:#111827">${t.submitter_org_name || t.submitter_name || '-'}</div>
                    <div style="font-size:11px;color:#6B7280;margin-top:2px">${t.title || '수요예측'} · ${(t.submitted_at||t.created_at||'').slice(0,10)}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
                    <span style="font-size:12px;font-weight:900;color:#1F2937">${Number(t.total_amount||0).toLocaleString()}원</span>
                    <span style="font-size:10px;font-weight:900;padding:3px 10px;border-radius:8px;background:${stC2}20;color:${stC2}">${stL2}</span>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
    </div>`;

  el.innerHTML = `<div class="bo-fade">${tabHeader()}${kpiCards}${orgSection}${teamSection}</div>`;
}

// 번들 상세 뷰
function _renderForecastBundleDetail(el, bundle) {
  const status = bundle.status || 'draft';
  const stColors = { submitted:'#D97706', approved:'#059669', rejected:'#DC2626', draft:'#6B7280', in_review:'#7C3AED' };
  const stLabels = { submitted:'검토 대기', approved:'승인 완료', rejected:'반려', draft:'임시저장', in_review:'1차 검토 완료' };
  const stC = stColors[status] || '#6B7280';
  const stL = stLabels[status] || status;
  const sid = String(bundle.id).replace(/'/g,'');
  const isGlobalBO = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : false;
  const isOpBO = typeof boIsOpManager === 'function' ? boIsOpManager() : false;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_boForecastBundleDetail=null;renderBoPlanMgmt()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 번들 목록으로
      </button>
    </div>
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#4C1D95,#6D28D9);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stC}60;color:white">${stL}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,.15);color:white">${bundle.submission_type === 'org_forecast' ? '1차 취합본' : '팀 수요예측'}</span>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${bundle.title || '수요예측 번들'}</h2>
        <p style="margin:8px 0 0;font-size:12px;opacity:.8">${bundle.submitter_org_name||''} · 계정: ${bundle.account_code||'-'} · ${_boPlanFiscalYear}년도</p>
      </div>
      <div style="padding:24px 28px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div style="padding:14px;border-radius:10px;background:#F8FAFC;border:1px solid #E2E8F0">
            <div style="font-size:11px;color:#6B7280;font-weight:700;margin-bottom:4px">요청 금액</div>
            <div style="font-size:18px;font-weight:900;color:#1D4ED8">${Number(bundle.total_requested||bundle.total_amount||0).toLocaleString()}원</div>
          </div>
          <div style="padding:14px;border-radius:10px;background:#F0FDF4;border:1px solid #BBF7D0">
            <div style="font-size:11px;color:#6B7280;font-weight:700;margin-bottom:4px">배정 금액</div>
            <div style="font-size:18px;font-weight:900;color:#059669">${Number(bundle.total_allocated||0).toLocaleString()}원</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${(status === 'submitted' || status === 'in_review') && isGlobalBO ? `
            <button onclick="boApproveOrgForecast('${sid}')" style="padding:10px 24px;border-radius:10px;border:none;background:#059669;color:white;font-size:13px;font-weight:900;cursor:pointer">✅ 최종 승인</button>
            <button onclick="boRejectOrgForecast('${sid}')" style="padding:10px 20px;border-radius:10px;border:1.5px solid #EF4444;background:white;color:#EF4444;font-size:13px;font-weight:800;cursor:pointer">❌ 반려</button>
          ` : ''}
          ${status === 'submitted' && isOpBO && !isGlobalBO ? `
            <button onclick="boReviewOrgForecast('${sid}')" style="padding:10px 24px;border-radius:10px;border:none;background:#F59E0B;color:white;font-size:13px;font-weight:900;cursor:pointer">🔍 1차 검토 완료</button>
          ` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

// org_forecast 취합본 생성
async function boCreateOrgForecastBundle() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const title = prompt(`${_boPlanFiscalYear}년도 수요예측 취합본 제목을 입력하세요:`, `${_boPlanFiscalYear}년도 수요예측 취합본`);
  if (!title) return;
  const accountCode = prompt('예산계정 코드를 입력하세요 (예: ACC-001):') || '';
  if (!sb) { alert('DB 연결이 필요합니다.'); return; }
  try {
    const { error } = await sb.from('submission_documents').insert({
      tenant_id: tenantId,
      submission_type: 'org_forecast',
      title,
      account_code: accountCode,
      fiscal_year: _boPlanFiscalYear,
      status: 'submitted',
      submitter_id: boCurrentPersona?.userId || '',
      submitter_name: boCurrentPersona?.name || '',
      submitter_org_name: boCurrentPersona?.orgName || '',
      total_amount: 0,
      total_requested: 0,
      total_allocated: 0,
    });
    if (error) throw error;
    _boForecastBundles = null;
    renderBoPlanMgmt();
  } catch(e) {
    alert('취합본 생성 실패: ' + e.message);
  }
}

// org_forecast 최종 승인
async function boApproveOrgForecast(bundleId) {
  if (!confirm('이 수요예측 취합본을 최종 승인하시겠습니까?')) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결이 필요합니다.'); return; }
  try {
    const { error } = await sb.from('submission_documents').update({
      status: 'approved',
      approver_id: boCurrentPersona?.userId || '',
      approver_name: boCurrentPersona?.name || '',
      approved_at: new Date().toISOString(),
    }).eq('id', bundleId);
    if (error) throw error;
    _boForecastBundles = null;
    _boForecastBundleDetail = null;
    renderBoPlanMgmt();
  } catch(e) {
    alert('승인 처리 실패: ' + e.message);
  }
}

// org_forecast 반려
async function boRejectOrgForecast(bundleId) {
  const reason = prompt('반려 사유를 입력하세요:');
  if (reason === null) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결이 필요합니다.'); return; }
  try {
    const { error } = await sb.from('submission_documents').update({
      status: 'rejected',
      reject_reason: reason,
      rejected_at: new Date().toISOString(),
    }).eq('id', bundleId);
    if (error) throw error;
    _boForecastBundles = null;
    _boForecastBundleDetail = null;
    renderBoPlanMgmt();
  } catch(e) {
    alert('반려 처리 실패: ' + e.message);
  }
}

// org_forecast 1차 검토 (운영담당자)
async function boReviewOrgForecast(bundleId) {
  if (!confirm('이 수요예측 취합본을 1차 검토 완료 처리하시겠습니까?\n총괄담당자에게 전달됩니다.')) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결이 필요합니다.'); return; }
  try {
    const { error } = await sb.from('submission_documents').update({
      status: 'in_review',
      reviewer_id: boCurrentPersona?.userId || '',
      reviewer_name: boCurrentPersona?.name || '',
      reviewed_at: new Date().toISOString(),
    }).eq('id', bundleId);
    if (error) throw error;
    _boForecastBundles = null;
    _boForecastBundleDetail = null;
    renderBoPlanMgmt();
  } catch(e) {
    alert('1차 검토 처리 실패: ' + e.message);
  }
}
