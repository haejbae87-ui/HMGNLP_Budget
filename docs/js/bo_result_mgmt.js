// ─── 📄 교육결과 관리 + 공통 캐스케이드 필터 ───────────────────────────────────
// 공통 필터 상태
let _boEduFilter = {
  tenantId: "",
  vorgId: "",
  accountCode: "",
  purpose: "",
  eduType: "",
  eduSubType: "",
};

// 공통 캐스케이드 필터 HTML 생성기
function _boEduFilterBar(onChangeCallback) {
  const tenants =
    typeof TENANTS !== "undefined" && Array.isArray(TENANTS) ? TENANTS : [];
  const vorgTemplates =
    typeof VORG_TEMPLATES !== "undefined" && Array.isArray(VORG_TEMPLATES)
      ? VORG_TEMPLATES
      : [];
  const budgetAccounts =
    typeof BUDGET_ACCOUNTS !== "undefined" && Array.isArray(BUDGET_ACCOUNTS)
      ? BUDGET_ACCOUNTS
      : [];
  const purposes =
    typeof EDU_PURPOSE_GROUPS !== "undefined" &&
    Array.isArray(EDU_PURPOSE_GROUPS)
      ? EDU_PURPOSE_GROUPS
      : [];
  const typeGroups =
    typeof EDU_TYPE_GROUPS !== "undefined" && Array.isArray(EDU_TYPE_GROUPS)
      ? EDU_TYPE_GROUPS
      : [];
  const typeItems =
    typeof EDU_TYPE_ITEMS !== "undefined" && Array.isArray(EDU_TYPE_ITEMS)
      ? EDU_TYPE_ITEMS
      : [];

  // 기본값: 현재 페르소나 테넌트
  if (!_boEduFilter.tenantId && boCurrentPersona?.tenantId) {
    _boEduFilter.tenantId = boCurrentPersona.tenantId;
  }

  // 캐스케이드 필터링
  const filteredVorgs = _boEduFilter.tenantId
    ? vorgTemplates.filter(
        (v) => (v.tenant_id || v.tenantId) === _boEduFilter.tenantId,
      )
    : vorgTemplates;
  const filteredAccounts = _boEduFilter.tenantId
    ? budgetAccounts.filter(
        (a) => (a.tenant_id || a.tenantId) === _boEduFilter.tenantId,
      )
    : budgetAccounts;
  const filteredPurposes = purposes;
  const filteredTypes = _boEduFilter.purpose
    ? typeGroups.filter((g) => g.purpose_id === _boEduFilter.purpose)
    : typeGroups;
  const filteredSubTypes = _boEduFilter.eduType
    ? typeItems.filter((i) => i.group_id === _boEduFilter.eduType)
    : typeItems;

  return `
  <div class="bo-filter-bar">
    <span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">🔍 조회 필터</span>
    
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">회사</span>
      <select id="bf-tenant" class="bo-filter-select" onchange="_boFilterChange('tenantId',this.value,'${onChangeCallback}')">
        <option value="">전체 회사</option>
        ${tenants.map((t) => '<option value="' + t.id + '"' + (_boEduFilter.tenantId === t.id ? " selected" : "") + ">" + (t.name || t.id) + "</option>").join("")}
      </select>
    </div>

    <div class="bo-filter-divider"></div>

    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">교육조직</span>
      <select id="bf-vorg" class="bo-filter-select" onchange="_boFilterChange('vorgId',this.value,'${onChangeCallback}')">
        <option value="">전체 교육조직</option>
        ${filteredVorgs.map((v) => '<option value="' + v.id + '"' + (_boEduFilter.vorgId === v.id ? " selected" : "") + ">" + v.name + "</option>").join("")}
      </select>
    </div>

    <div class="bo-filter-divider"></div>

    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">계정</span>
      <select id="bf-account" class="bo-filter-select" onchange="_boFilterChange('accountCode',this.value,'${onChangeCallback}')">
        <option value="">전체 계정</option>
        ${filteredAccounts.map((a) => '<option value="' + (a.code || a.id) + '"' + (_boEduFilter.accountCode === (a.code || a.id) ? " selected" : "") + ">" + a.name + "</option>").join("")}
      </select>
    </div>

    <div class="bo-filter-divider"></div>

    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">목적</span>
      <select id="bf-purpose" class="bo-filter-select" onchange="_boFilterChange('purpose',this.value,'${onChangeCallback}')">
        <option value="">전체 목적</option>
        ${filteredPurposes.map((p) => '<option value="' + p.id + '"' + (_boEduFilter.purpose === p.id ? " selected" : "") + ">" + p.label + "</option>").join("")}
      </select>
    </div>

    <div class="bo-filter-divider"></div>

    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">교육유형</span>
      <select id="bf-edutype" class="bo-filter-select" onchange="_boFilterChange('eduType',this.value,'${onChangeCallback}')">
        <option value="">전체</option>
        ${filteredTypes.map((g) => '<option value="' + g.id + '"' + (_boEduFilter.eduType === g.id ? " selected" : "") + ">" + g.label + "</option>").join("")}
      </select>
      <select id="bf-subtype" class="bo-filter-select" onchange="_boFilterChange('eduSubType',this.value,'${onChangeCallback}')">
        <option value="">전체 세부유형</option>
        ${filteredSubTypes.map((i) => '<option value="' + i.id + '"' + (_boEduFilter.eduSubType === i.id ? " selected" : "") + ">" + i.label + "</option>").join("")}
      </select>
    </div>

    <button onclick="window['${onChangeCallback}']()" class="bo-filter-btn-search">
      ● 조회
    </button>
    <button onclick="_boFilterReset('${onChangeCallback}')" class="bo-filter-btn-reset">
      초기화
    </button>
  </div>`;
}

function _boFilterChange(key, value, callbackName) {
  _boEduFilter[key] = value;
  // 캐스케이드 하위 초기화
  const order = [
    "tenantId",
    "vorgId",
    "accountCode",
    "purpose",
    "eduType",
    "eduSubType",
  ];
  const idx = order.indexOf(key);
  for (let i = idx + 1; i < order.length; i++) _boEduFilter[order[i]] = "";
  if (typeof window[callbackName] === "function") window[callbackName]();
}

function _boFilterReset(callbackName) {
  _boEduFilter = {
    tenantId: boCurrentPersona?.tenantId || "",
    vorgId: "",
    accountCode: "",
    purpose: "",
    eduType: "",
    eduSubType: "",
  };
  if (typeof window[callbackName] === "function") window[callbackName]();
}

// DB 데이터 필터링 헬퍼
function _boApplyEduFilter(items) {
  return items.filter((item) => {
    if (
      _boEduFilter.tenantId &&
      (item.tenant_id || item.tenantId) !== _boEduFilter.tenantId
    )
      return false;
    if (
      _boEduFilter.accountCode &&
      (item.account_code || item.account) !== _boEduFilter.accountCode
    )
      return false;
    if (_boEduFilter.purpose && item.detail?.purpose !== _boEduFilter.purpose)
      return false;
    if (
      _boEduFilter.eduType &&
      (item.edu_type || item.eduType) !== _boEduFilter.eduType
    )
      return false;
    return true;
  });
}

// ─── 교육결과 관리 화면 (정산 검토 포함) ─────────────────────────────────────
let _resultMgmtData = null;
let _resultMgmtPending = null; // result_pending 별도 캐시

async function renderResultMgmt() {
  const el = document.getElementById("bo-content");
  try {
    const sb = typeof getSB === "function" ? getSB() : null;
    const tenantId = boCurrentPersona?.tenantId || "HMC";

    // DB 로드 (pending + completed 동시)
    if (!_resultMgmtData && sb) {
      try {
        const [pendingRes, completedRes] = await Promise.all([
          sb.from("applications").select("*")
            .eq("tenant_id", tenantId)
            .eq("status", "result_pending")
            .order("created_at", { ascending: false }),
          sb.from("applications").select("*")
            .eq("tenant_id", tenantId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);
        _resultMgmtPending = pendingRes.data || [];
        _resultMgmtData   = completedRes.data || [];
      } catch (err) {
        console.error("[renderResultMgmt] DB 조회 실패:", err.message);
        _resultMgmtPending = [];
        _resultMgmtData    = [];
      }
    }

    const pending   = _boApplyEduFilter(_resultMgmtPending || []);
    const completed = _boApplyEduFilter(_resultMgmtData    || []);

    // ── 검토 대기 (result_pending) 테이블 ──────────────────────────────
    const pendingRows = pending.map((r) => {
      const amt     = Number(r.amount || 0);
      const actual  = Number(r.detail?.result?.actual_cost || amt);
      const isAppBased  = r.detail?.resultType === "from_application";
      const satisfaction = r.detail?.result?.satisfaction || "-";
      const hours   = r.detail?.result?.actual_hours || r.detail?.hours || "-";
      return `
    <tr id="result-row-${r.id}">
      <td style="font-weight:700">${r.applicant_name || ""}</td>
      <td>${r.dept || ""}</td>
      <td style="font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.edu_name || ""}</td>
      <td>${r.account_code || "-"}</td>
      <td style="text-align:right;font-weight:900;color:#111">${actual.toLocaleString()}원</td>
      <td style="text-align:center">${hours}H</td>
      <td style="text-align:center">⭐${satisfaction}</td>
      <td style="font-size:11px;color:#6B7280">${r.created_at?.slice(0,10)||""}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button onclick="_confirmResult('${r.id}',${actual},'${r.account_code||""}')"
            style="padding:4px 12px;border-radius:6px;background:#059669;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer">
            ✅ 확인
          </button>
          <button onclick="_rejectResult('${r.id}')"
            style="padding:4px 10px;border-radius:6px;background:#EF4444;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer">
            ✕ 반려
          </button>
        </div>
      </td>
    </tr>`;
    }).join("");

    // ── 완료된 이력 (completed) 테이블 ────────────────────────────────
    const completedRows = completed.map((r) => {
      const amt = Number(r.amount || 0);
      return `
    <tr>
      <td style="font-weight:700">${r.applicant_name || ""}</td>
      <td>${r.dept || ""}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.edu_name || ""}</td>
      <td>${r.account_code || "-"}</td>
      <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
      <td style="font-size:11px;color:#6B7280">${r.created_at?.slice(0,10)||""}</td>
      <td><span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#D1FAE5;color:#059669;font-weight:800">정산완료</span></td>
    </tr>`;
    }).join("");

    const colH = (txt) => `<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:800;color:#6B7280;white-space:nowrap">${txt}</th>`;
    const colHR = (txt) => `<th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:800;color:#6B7280;white-space:nowrap">${txt}</th>`;

    el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">📄 교육결과 관리</h1>
      <p class="bo-page-sub">FO 등록 결과를 검토하고 정산 처리합니다</p>
    </div>
    <button onclick="_resultMgmtData=null;_resultMgmtPending=null;renderResultMgmt()" class="bo-btn-primary">🔄 새로고침</button>
  </div>

  ${_boEduFilterBar("renderResultMgmt")}

  <!-- 검토 대기 섹션 -->
  <div style="margin-bottom:32px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <h2 style="font-size:15px;font-weight:900;color:#D97706;margin:0">⏳ 정산 검토 대기</h2>
      <span style="font-size:11px;font-weight:900;padding:2px 10px;border-radius:20px;background:#FEF3C7;color:#D97706">${pending.length}건</span>
    </div>
    ${pending.length > 0 ? `
    <div class="bo-table-container">
      <table class="bo-table" style="width:100%">
        <thead><tr>
          ${colH("신청자")}${colH("부서")}${colH("교육명")}${colH("계정")}
          ${colHR("실비용")}${colH("이수시간")}${colH("만족도")}${colH("등록일")}${colH("처리")}
        </tr></thead>
        <tbody>${pendingRows}</tbody>
      </table>
    </div>` : `
    <div class="bo-table-container" style="padding:36px;text-align:center;color:#9CA3AF">
      <div style="font-size:32px;margin-bottom:8px">✅</div>
      <div style="font-weight:700">검토 대기 건수가 없습니다</div>
    </div>`}
  </div>

  <!-- 정산 완료 이력 -->
  <div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <h2 style="font-size:15px;font-weight:900;color:#374151;margin:0">✅ 정산 완료 이력</h2>
      <span style="font-size:11px;font-weight:900;padding:2px 10px;border-radius:20px;background:#D1FAE5;color:#059669">${completed.length}건</span>
    </div>
    ${completed.length > 0 ? `
    <div class="bo-table-container">
      <table class="bo-table" style="width:100%">
        <thead><tr>
          ${colH("신청자")}${colH("부서")}${colH("교육명")}${colH("계정")}
          ${colHR("금액")}${colH("등록일")}${colH("상태")}
        </tr></thead>
        <tbody>${completedRows}</tbody>
      </table>
    </div>` : `
    <div class="bo-table-container" style="padding:36px;text-align:center;color:#9CA3AF">
      <div style="font-size:32px;margin-bottom:8px">📭</div>
      <div style="font-weight:700">정산 완료된 이력이 없습니다</div>
    </div>`}
  </div>
</div>`;
  } catch (err) {
    console.error("[renderResultMgmt] 렌더링 에러:", err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>📄 교육결과 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_resultMgmtData=null;_resultMgmtPending=null;renderResultMgmt()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}

// ─── 정산 확인 — result_pending → completed + used_amount 반영 ─────────────
async function _confirmResult(appId, actualCost, accountCode) {
  if (!confirm(`이 교육결과를 확인 처리(정산완료)하시겠습니까?\n\n실비용 ${Number(actualCost).toLocaleString()}원이 예산 집행액에 반영됩니다.`)) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  try {
    // 1. application status → completed
    const { error: appErr } = await sb.from("applications")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", appId);
    if (appErr) throw appErr;

    // 2. budget_allocations.used_amount += actualCost (bankbook 기준)
    if (accountCode) {
      const tenantId = boCurrentPersona?.tenantId || "HMC";
      // account_code → budget_accounts.id
      const { data: accts } = await sb.from("budget_accounts")
        .select("id").eq("code", accountCode).eq("active", true).limit(1);
      const accountId = accts?.[0]?.id;

      if (accountId) {
        // bankbook 조회 (신청자 부서 기준)
        const { data: row } = await sb.from("applications")
          .select("dept").eq("id", appId).single();
        const dept = row?.dept || "";

        const { data: bbs } = await sb.from("org_budget_bankbooks")
          .select("id").eq("account_id", accountId).eq("tenant_id", tenantId)
          .ilike("org_name", `%${dept}%`).limit(1);
        const bbId = bbs?.[0]?.id;

        if (bbId) {
          const { data: alloc } = await sb.from("budget_allocations")
            .select("id, used_amount").eq("bankbook_id", bbId).limit(1);
          const allocRow = alloc?.[0];
          if (allocRow) {
            await sb.from("budget_allocations")
              .update({
                used_amount: Number(allocRow.used_amount || 0) + Number(actualCost),
                updated_at: new Date().toISOString(),
              })
              .eq("id", allocRow.id);
          }
        }
      }
    }

    alert("✅ 정산 완료 처리되었습니다.\n\n예산 집행액에 반영되었습니다.");
    _resultMgmtData = null;
    _resultMgmtPending = null;
    renderResultMgmt();
  } catch (err) {
    console.error("[_confirmResult] 오류:", err.message);
    alert("처리 중 오류가 발생했습니다: " + err.message);
  }
}

// ─── 정산 반려 — result_pending → approved (결재 완료 상태로 복구) ────────────
async function _rejectResult(appId) {
  const reason = prompt("반려 사유를 입력하세요 (선택사항):");
  if (reason === null) return; // 취소

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  try {
    const { data: existing } = await sb.from("applications")
      .select("detail").eq("id", appId).single();
    const prevDetail = existing?.detail || {};

    const { error } = await sb.from("applications")
      .update({
        status: "approved",
        detail: { ...prevDetail, reject_reason: reason || "반려", rejected_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("id", appId);
    if (error) throw error;

    alert("❌ 결과 등록이 반려되었습니다.\nFO 사용자가 재등록할 수 있습니다.");
    _resultMgmtData = null;
    _resultMgmtPending = null;
    renderResultMgmt();
  } catch (err) {
    console.error("[_rejectResult] 오류:", err.message);
    alert("처리 중 오류가 발생했습니다: " + err.message);
  }
}


