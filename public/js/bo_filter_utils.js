// ─── ADVANCED EDU FILTER BAR ──────────────────────────────────────────────────
// 지원 필터: Tenant > VOrg(Group) > Account > Org > [Team] > Year
// 팀 필터는 Account의 dist_type이 'dist_team'일 때만 동적으로 표시됩니다.

var _boAdvFilter = {
  tenantId: "",
  vorgId: "",
  accountCode: "",
  orgName: "",
  teamName: "",
  year: new Date().getFullYear().toString()
};

var _boAdvFilterState = {
  accountsCache: null,
  teamsCache: null
};

// 필터 변경 시 호출
async function _advFilterChange(key, value, callbackName) {
  _boAdvFilter[key] = value;
  
  // 하위 필터 초기화
  const order = ["tenantId", "vorgId", "accountCode", "orgName", "teamName", "year"];
  const idx = order.indexOf(key);
  if (idx < 5) { // year 제외
    for (let i = idx + 1; i < order.length - 1; i++) { // year 유지
      _boAdvFilter[order[i]] = "";
    }
  }

  // 데이터 리렌더링 및 UI 업데이트
  if (typeof window[callbackName] === "function") {
    await window[callbackName]();
  }
}

// 필터 초기화
async function _advFilterReset(callbackName) {
  _boAdvFilter = {
    tenantId: (typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.tenantId) ? boCurrentPersona.tenantId : "HMC",
    vorgId: "",
    accountCode: "",
    orgName: "",
    teamName: "",
    year: new Date().getFullYear().toString()
  };
  if (typeof window[callbackName] === "function") {
    await window[callbackName]();
  }
}

// 계정 및 팀 정보 캐시 로드
async function _loadAdvFilterDependencies() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;

  if (!_boAdvFilterState.accountsCache) {
    const { data } = await sb.from("budget_accounts").select("id, code, name, tenant_id, dist_type, virtual_org_template_id").eq("active", true);
    _boAdvFilterState.accountsCache = data || [];
  }
  
  if (!_boAdvFilterState.teamsCache) {
    // 모든 팀(org) 목록 또는 DB 기반으로 조회 (현재는 dummy로 예시하거나, org_budget_bankbooks를 사용)
    const { data } = await sb.from("org_budget_bankbooks").select("org_name, tenant_id").neq("dist_type", "dist_org");
    _boAdvFilterState.teamsCache = data || [];
  }
}

// 필터 UI 렌더링
async function renderAdvancedEduFilterBar(containerId, onChangeCallback) {
  await _loadAdvFilterDependencies();

  const tenants = (typeof TENANTS !== "undefined" && Array.isArray(TENANTS)) ? TENANTS : [];
  const vorgTemplates = (typeof VORG_TEMPLATES !== "undefined" && Array.isArray(VORG_TEMPLATES)) ? VORG_TEMPLATES : [];
  
  if (!_boAdvFilter.tenantId && typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.tenantId) {
    _boAdvFilter.tenantId = boCurrentPersona.tenantId;
  }

  const filteredVorgs = _boAdvFilter.tenantId ? vorgTemplates.filter(v => (v.tenant_id || v.tenantId) === _boAdvFilter.tenantId) : vorgTemplates;
  
  const filteredAccounts = _boAdvFilterState.accountsCache ? _boAdvFilterState.accountsCache.filter(a => {
    let match = true;
    if (_boAdvFilter.tenantId) match = match && a.tenant_id === _boAdvFilter.tenantId;
    if (_boAdvFilter.vorgId) match = match && a.virtual_org_template_id === _boAdvFilter.vorgId;
    return match;
  }) : [];

  // 선택된 계정 확인
  const selectedAccount = filteredAccounts.find(a => a.code === _boAdvFilter.accountCode);
  const showTeamFilter = selectedAccount && selectedAccount.dist_type === 'dist_team';

  // 고유 조직 추출 (간이)
  const uniqueOrgs = ["모빌리티기술센터", "역량혁신팀", "Autoland사업부", "연구개발본부"]; // 실제 데이터는 API 연동 필요

  let html = `
  <div class="bo-filter-bar">
    <span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">🔍 조회</span>
    
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">회사</span>
      <select class="bo-filter-select" onchange="_advFilterChange('tenantId', this.value, '${onChangeCallback}')">
        <option value="">전체 회사</option>
        ${tenants.map(t => `<option value="${t.id}" ${_boAdvFilter.tenantId === t.id ? 'selected' : ''}>${t.name || t.id}</option>`).join('')}
      </select>
    </div>
    <div class="bo-filter-divider"></div>
    
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">교육제도그룹</span>
      <select class="bo-filter-select" onchange="_advFilterChange('vorgId', this.value, '${onChangeCallback}')">
        <option value="">전체 그룹</option>
        ${filteredVorgs.map(v => `<option value="${v.id}" ${_boAdvFilter.vorgId === v.id ? 'selected' : ''}>${v.name || v.id}</option>`).join('')}
      </select>
    </div>
    <div class="bo-filter-divider"></div>
    
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">예산계정</span>
      <select class="bo-filter-select" onchange="_advFilterChange('accountCode', this.value, '${onChangeCallback}')">
        <option value="">전체 계정</option>
        ${filteredAccounts.map(a => `<option value="${a.code}" ${_boAdvFilter.accountCode === a.code ? 'selected' : ''}>${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="bo-filter-divider"></div>
    
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">교육조직</span>
      <input type="text" class="bo-filter-select" placeholder="조직명 검색" value="${_boAdvFilter.orgName}" onchange="_advFilterChange('orgName', this.value, '${onChangeCallback}')" style="width:120px;">
    </div>
  `;

  if (showTeamFilter) {
    html += `
    <div class="bo-filter-divider"></div>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">팀</span>
      <input type="text" class="bo-filter-select" placeholder="팀명 검색" value="${_boAdvFilter.teamName}" onchange="_advFilterChange('teamName', this.value, '${onChangeCallback}')" style="width:120px;">
    </div>
    `;
  }

  html += `
    <div class="bo-filter-divider"></div>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="bo-filter-label">년도</span>
      <select class="bo-filter-select" onchange="_advFilterChange('year', this.value, '${onChangeCallback}')">
        <option value="2026" ${_boAdvFilter.year === '2026' ? 'selected' : ''}>2026년</option>
        <option value="2025" ${_boAdvFilter.year === '2025' ? 'selected' : ''}>2025년</option>
      </select>
    </div>
    
    <div style="flex:1"></div>
    <button onclick="window['${onChangeCallback}']()" class="bo-filter-btn-search">● 조회</button>
    <button onclick="_advFilterReset('${onChangeCallback}')" class="bo-filter-btn-reset">초기화</button>
  </div>`;

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = html;
  }
}
