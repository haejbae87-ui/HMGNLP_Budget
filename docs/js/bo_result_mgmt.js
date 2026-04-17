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
      <span class="bo-filter-label">가상조직</span>
      <select id="bf-vorg" class="bo-filter-select" onchange="_boFilterChange('vorgId',this.value,'${onChangeCallback}')">
        <option value="">전체 가상조직</option>
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

// ─── 교육결과 관리 화면 ─────────────────────────────────────────────────────
let _resultMgmtData = null;

async function renderResultMgmt() {
  const el = document.getElementById("bo-content");
  try {
    const sb = typeof getSB === "function" ? getSB() : null;

    // DB에서 결과(status=completed) 조회
    if (!_resultMgmtData && sb) {
      try {
        const tenantId = boCurrentPersona?.tenantId || "HMC";
        const { data, error } = await sb
          .from("applications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("status", "completed")
          .order("created_at", { ascending: false });
        if (!error) _resultMgmtData = data || [];
      } catch (err) {
        console.error("[renderResultMgmt] DB 조회 실패:", err.message);
        _resultMgmtData = [];
      }
    }

    const results = _boApplyEduFilter(_resultMgmtData || []);

    const rows = results
      .map((r) => {
        const amt = Number(r.amount || 0);
        return `
    <tr>
      <td><code style="font-size:11px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${r.id}</code></td>
      <td style="font-weight:700">${r.applicant_name || ""}</td>
      <td>${r.dept || ""}</td>
      <td style="font-weight:700">${r.edu_name || ""}</td>
      <td>${r.edu_type || "-"}</td>
      <td>${r.account_code || "-"}</td>
      <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
      <td style="font-size:12px;color:#6B7280">${r.created_at?.slice(0, 10) || ""}</td>
      <td><span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#D1FAE5;color:#059669;font-weight:800">완료</span></td>
    </tr>`;
      })
      .join("");

    el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">📄 교육결과 관리</h1>
      <p class="bo-page-sub">교육 완료 결과를 조회하고 정산 처리합니다</p>
    </div>
    <button onclick="_resultMgmtData=null;renderResultMgmt()" class="bo-btn-primary">🔄 새로고침</button>
  </div>

  ${_boEduFilterBar("renderResultMgmt")}

  <div>
    <div class="bo-list-count">교육결과 목록 (${results.length}건)</div>
    ${
      results.length > 0
        ? `
    <div class="bo-table-container">
      <table class="bo-table" style="width:100%">
        <thead><tr>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">ID</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">신청자</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">부서</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">교육명</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">유형</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">계정</th>
          <th style="padding:10px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">금액</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">등록일</th>
          <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">상태</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
        : `
    <div class="bo-table-container" style="padding:60px;text-align:center;color:#9CA3AF">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700">교육결과 데이터가 없습니다</div>
      <div style="font-size:12px;margin-top:6px">프론트 오피스에서 교육결과를 등록하면 이 화면에서 조회할 수 있습니다.</div>
    </div>`
    }
  </div>
</div>`;
  } catch (err) {
    console.error("[renderResultMgmt] 렌더링 에러:", err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>📄 교육결과 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_resultMgmtData=null;renderResultMgmt()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}
