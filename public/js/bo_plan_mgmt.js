// ─── 3 Depth: 교육계획 관리 (DB 연동 + 인라인 편집) ──────────────────────────
let _boPlanMgmtData = null;
let _boPlanDetailView = null; // 상세 보기 대상 계획
let _boPlanFiscalYear = new Date().getFullYear(); // 연도 필터
let _boPlanTypeFilter = "all"; // 'all' | 'forecast' | 'ongoing'
let _boForecastDeadlines = []; // 수요예측 마감 상태 (다건, 계정별)
let _boTenantAccounts = []; // 테넌트 예산계정 목록

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
    // E-4: 역할 구분 — 운영담당자(일차검토) vs 총괄담당자(최종승인)
    const isGlobalBO = isGlobalAdmin(boCurrentPersona);
    const isOpBO = isOpManager(boCurrentPersona);

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

      <!-- 수요예측 요약 카드 -->
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

      <!-- 상세 정보 -->
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:140px">계획명</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${plan.title || plan.edu_name || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상신자</td>
            <td style="padding:12px 0;color:#374151">${plan.applicant_name || plan.submitter || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">소속</td>
            <td style="padding:12px 0;color:#374151">${plan.team || plan.dept || "-"} / ${plan.hq || plan.center || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육목적</td>
            <td style="padding:12px 0;color:#374151">${_planPurposeKr(d.purpose || plan.purpose)}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육유형</td>
            <td style="padding:12px 0;color:#374151">${_planEduTypeKr(plan.edu_type || d.eduType)} ${d.eduSubType ? "› " + _planEduTypeKr(d.eduSubType) : ""}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">예산계정</td>
            <td style="padding:12px 0;color:#374151">${plan.account_code || plan.account || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">과정명</td>
            <td style="padding:12px 0;color:#374151">${plan.course_name || d.courseName || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">참석인원</td>
            <td style="padding:12px 0;color:#374151">${plan.participant_count || d.participantCount || "-"}명</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">계획액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${amt.toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#059669">배정액</td>
            <td style="padding:12px 0;font-weight:900;color:#059669;font-size:16px">${Number(plan.allocated_amount || 0).toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">실사용액</td>
            <td style="padding:12px 0;font-weight:900;color:#6B7280;font-size:16px">${Number(plan.actual_amount || 0).toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">기간</td>
            <td style="padding:12px 0;color:#374151">${d.startDate || "-"} ~ ${d.endDate || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">제출일</td>
            <td style="padding:12px 0;color:#374151">${(plan.created_at || plan.submittedAt || "").slice(0, 10) || "-"}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상태</td>
            <td style="padding:12px 0">
              <span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:${stColor}15;color:${stColor}">${stLabel}</span>
            </td>
          </tr>
          ${
            plan.reject_reason
              ? `
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#DC2626">반려 사유</td>
            <td style="padding:12px 0;color:#DC2626;font-weight:700">${plan.reject_reason}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:12px 0;font-weight:800;color:#6B7280;vertical-align:top">상세 내용</td>
            <td style="padding:12px 0;color:#374151;white-space:pre-wrap">${d.content || plan.content || "-"}</td>
          </tr>
        </table>
      </div>

      <!-- 결재/검토 진행현황 -->
      ${typeof renderApprovalStepper === "function" ? renderApprovalStepper(status, "plan") : ""}

      <!-- 산출근거 -->
      ${
        d.calcGrounds && d.calcGrounds.length > 0
          ? `
      <div style="padding:0 28px 24px">
        <h3 style="font-size:13px;font-weight:900;color:#374151;margin-bottom:10px">📐 세부산출근거</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:8px 12px;text-align:left;font-weight:800;color:#6B7280">항목</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">단가</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">수량</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">소계</th>
            </tr>
          </thead>
          <tbody>
            ${d.calcGrounds
              .map(
                (cg) => `
            <tr style="border-top:1px solid #F3F4F6">
              <td style="padding:8px 12px;font-weight:700">${cg.type || cg.label || "-"}</td>
              <td style="padding:8px 12px;text-align:right">${Number(cg.price || 0).toLocaleString()}원</td>
              <td style="padding:8px 12px;text-align:right">${cg.qty || 1}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:900">${(Number(cg.price || 0) * Number(cg.qty || 1)).toLocaleString()}원</td>
            </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
          : ""
      }

      <!-- 🔧 관리자 입력 필드 (back + provide) -->
      <div id="bo-admin-fields-panel" style="padding:0 28px 24px"></div>

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

  // 관리자 필드 패널 비동기 렌더링
  setTimeout(() => _renderBoAdminFieldsPanel(plan, "plans"), 100);
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

  // back + provide scope 필드만 추출
  const adminFields = formFields
    .map((f) => (typeof f === "object" ? f : { key: f, scope: "front" }))
    .filter((f) => f.scope === "back" || f.scope === "provide");

  if (adminFields.length === 0) {
    panel.innerHTML = "";
    return;
  }

  // 기존 저장값 로드
  const detail = record.detail || {};
  const provideData = detail._provide || {};
  const backData = detail._back || {};

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
          <p style="margin:2px 0 0;font-size:11px;color:#6B7280">back(BO전용) 및 provide(BO제공→FO읽기전용) 필드를 입력합니다</p>
        </div>
        <button onclick="_saveBoAdminFields('${record.id}','${tableName}')"
          style="padding:8px 20px;border-radius:10px;border:none;background:#1D4ED8;color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(29,78,216,.2)">
          💾 저장
        </button>
      </div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">`;

  adminFields.forEach((fld) => {
    const def = allDefs.find((d) => d.key === fld.key) || {};
    const scopeNs = fld.scope === "provide" ? provideData : backData;
    const stateKey = _toBoAdminKey(fld.key);
    const val = scopeNs[stateKey] ?? "";
    const icon = def.icon || "📝";
    const hint = def.hint || "";
    const ft = def.fieldType || "text";
    const scopeLabel =
      fld.scope === "provide"
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
      <div data-scope="${fld.scope}" data-key="${stateKey}">
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

  inputs.forEach((wrapper) => {
    const scope = wrapper.dataset.scope;
    const key = wrapper.dataset.key;
    const input = wrapper.querySelector("input, textarea, select");
    if (!input) return;
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
    // 기존 detail 조회
    const { data: row } = await sb
      .from(tableName)
      .select("detail")
      .eq("id", recordId)
      .maybeSingle();
    const detail = row?.detail || {};

    // _provide, _back 네임스페이스에 병합
    detail._provide = { ...(detail._provide || {}), ...provideUpdate };
    detail._back = { ...(detail._back || {}), ...backUpdate };

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
