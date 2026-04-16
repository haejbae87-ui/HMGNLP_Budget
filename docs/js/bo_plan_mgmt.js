// ─── 3 Depth: 교육계획 관리 (DB 연동) ──────────────────────────────────────
let _boPlanMgmtData = null;
let _boPlanDetailView = null; // 상세 보기 대상 계획
let _boPlanFiscalYear = new Date().getFullYear(); // 연도 필터
let _boPlanTypeFilter = "all"; // 'all' | 'forecast' | 'ongoing'
let _boForecastDeadlines = []; // 수요예측 마감 상태 (다건, 계정별)
let _boTenantAccounts = []; // 테넌트 예산계정 목록

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

  // DB에서 계획 조회 (plans 테이블)
  if (!_boPlanMgmtData && sb) {
    try {
      const { data, error } = await sb
        .from("plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null) // 소프트 삭제된 계획 제외
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
    const canApprove =
      _approveRoles.includes(boCurrentPersona.role) ||
      /admin|budget|total|ops/i.test(boCurrentPersona.role || "");

    const rows = plans
      .map((pl, idx) => {
        const amt = Number(pl.amount || pl.planAmount || 0);
        const status = pl.status || "pending";
        const statusBadge =
          typeof boPlanStatusBadge === "function"
            ? boPlanStatusBadge(status)
            : `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${status === "approved" ? "#D1FAE5" : status === "rejected" ? "#FEE2E2" : "#FEF3C7"};color:${status === "approved" ? "#059669" : status === "rejected" ? "#DC2626" : "#B45309"};font-weight:800">${status === "approved" ? "승인" : status === "rejected" ? "반려" : status === "draft" ? "임시저장" : "대기"}</span>`;
        const typeBadge =
          pl.plan_type === "forecast"
            ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#DBEAFE;color:#1D4ED8">📅 수요예측</span>'
            : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;background:#F3F4F6;color:#6B7280">📝 상시</span>';
        const safeId = String(pl.id || "").replace(/'/g, "\\'");
        return `
      <tr onclick="_openBoPlanDetail('${safeId}')" style="cursor:pointer;transition:background .12s"
          onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
        <td><code style="font-size:11px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${pl.id}</code></td>
        <td>
          <div style="font-weight:700;font-size:13px">${pl.team || pl.dept || pl.applicant_name || ""}</div>
          <div style="font-size:11px;color:#9CA3AF">${pl.hq || pl.center || ""}</div>
        </td>
        <td>
          <div style="font-weight:700">${pl.title || pl.edu_name || pl.name || ""}</div>
          <div style="font-size:11px;color:#9CA3AF">상신자: ${pl.submitter || pl.applicant_name || ""}</div>
        </td>
        <td>${typeBadge}</td>
        <td>${typeof boAccountBadge === "function" ? boAccountBadge(pl.account || pl.account_code || "") : pl.account_code || ""}</td>
        <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
        <td style="font-size:12px;color:#6B7280">${(pl.submittedAt || pl.created_at || "").slice(0, 10)}</td>
        <td>${statusBadge}</td>
        ${
          canApprove
            ? `
        <td style="text-align:center" onclick="event.stopPropagation()">
          ${
            status === "pending" || status === "pending_approval"
              ? `
          <div style="display:flex;gap:6px;justify-content:center">
            <button onclick="boPlanApprove('${safeId}')" class="bo-btn-accent bo-btn-sm">승인</button>
            <button onclick="boPlanReject('${safeId}')" class="bo-btn-sm" style="border:1px solid #EF4444;color:#EF4444;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">반려</button>
          </div>`
              : status === "approved"
                ? `
          <div style="display:flex;gap:4px;justify-content:center">
            <button onclick="boPlanForceRevert('${safeId}')" title="승인 취소 → 임시저장" style="border:1px solid #F59E0B;color:#B45309;background:#FFFBEB;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">↩ 취소</button>
            <button onclick="boPlanSoftDelete('${safeId}')" title="삭제(복구가능)" style="border:1px solid #EF4444;color:#DC2626;background:#FEF2F2;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">🗑</button>
          </div>`
                : status === "draft"
                  ? `
          <button onclick="boPlanSoftDelete('${safeId}')" title="삭제(복구가능)" style="border:1px solid #EF4444;color:#DC2626;background:#FEF2F2;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer">🗑삭제</button>`
                  : '<span style="font-size:12px;color:#9CA3AF">처리완료</span>'
          }
        </td>`
            : ""
        }
      </tr>`;
      })
      .join("");

    el.innerHTML = `
    <div class="bo-fade">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h1 class="bo-page-title">📋 교육계획 관리</h1>
          <p class="bo-page-sub">${canApprove ? "교육계획 검토 및 승인" : "교육계획 수립 및 상신"}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary">🔄 새로고침</button>
        </div>
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
        <select onchange="_boPlanFiscalYear=Number(this.value);_boPlanMgmtData=null;_boForecastDeadline=null;renderBoPlanMgmt()"
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
          <option value="forecast" ${_boPlanTypeFilter === "forecast" ? "selected" : ""}>📅 수요예측</option>
          <option value="ongoing" ${_boPlanTypeFilter === "ongoing" ? "selected" : ""}>📝 상시</option>
        </select>
      </div>

      ${typeof _boEduFilterBar === "function" ? _boEduFilterBar("renderBoPlanMgmt") : ""}

      <div class="bo-card" style="overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between">
          <span class="bo-section-title">교육계획 목록 (${plans.length}건)</span>
          <span style="font-size:12px;color:#9CA3AF">승인 대기: <strong style="color:#1D4ED8">${plans.filter((p) => p.status === "pending" || p.status === "pending_approval").length}건</strong></span>
        </div>
        ${
          plans.length > 0
            ? `
        <table class="bo-table">
          <thead><tr>
            <th>ID</th><th>제출팀</th><th>계획명</th><th>유형</th><th>계정</th>
            <th style="text-align:right">계획액</th><th>제출일</th><th>상태</th>
            ${canApprove ? '<th style="text-align:center">처리</th>' : ""}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>`
            : `
        <div style="padding:60px;text-align:center;color:#9CA3AF">
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
            <td style="padding:12px 0;font-weight:800;color:#6B7280">계획액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${amt.toLocaleString()}원</td>
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

async function boPlanApprove(id) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    await sb.from("plans").update({ status: "approved" }).eq("id", id);
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
  renderBoPlanMgmt();
}

async function boPlanReject(id) {
  const reason = prompt("반려 사유를 입력해주세요:");
  if (!reason) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    await sb
      .from("plans")
      .update({ status: "rejected", reject_reason: reason })
      .eq("id", id);
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
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
