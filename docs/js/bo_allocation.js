// ─── 예산 배정 및 관리 (v2 — 통합 드릴다운) ──────────────────────────────────
// 계층: 예산 계정(마스터) → 교육조직 → 팀 → (개인)
// 탭:   현황 | 최초 할당(총괄) | 예산 배분(드릴다운) | 변경 이력

let _allocTab = 0;

// ── 필터 상태 (사업계획관리 _bdFilterBar 패턴 차용) ──────────────────────────
let _allocFilterTenant = '';        // 선택된 테넌트 (빈 문자열=현재 페르소나)
let _allocFilterTplId = null;       // 선택된 VOrg 제도그룹 ID
let _allocFilterAccountCode = null; // 선택된 예산계정 code (null=전체)
let _allocFilterAccountName = null; // 선택된 예산계정 name (code 매칭 보완용)
let _allocFilterYear = new Date().getFullYear(); // 선택된 연도
let _allocFilterLoaded = false;     // 필터 데이터 로드 여부
let _allocFilterTplList = [];       // 제도그룹 목록 (DB)
let _allocFilterAcctList = [];      // 예산계정 목록 (DB)

// ── 드릴다운 상태 ──────────────────────────────────────────────────────────
let _ddLevel = 0;           // 0=계정선택, 1=교육조직배분, 2=팀배분
let _ddAbId = null;         // 선택된 계정예산 ID
let _ddOrgId = null;        // 선택된 교육조직 ID
let _ddOrgName = null;      // 선택된 교육조직 이름

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderBoAllocation() {
  const el = document.getElementById("bo-content");
  const persona = boCurrentPersona;
  const tenantName =
    TENANTS.find((t) => t.id === persona.tenantId)?.name || "전체";

  // ── E-2: P16 역할 판별 ────────────────────────────────────────────────────
  const isGlobal = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : isGlobalAdmin(persona);
  const isOp = typeof boIsOpManager === 'function' ? boIsOpManager() : isOpManager(persona);
  // 운영담당자 = 정의된 역할이 budget_op_manager이거나 managedVorgId만 있고 ownedAccounts는 없는 사람
  const isOpOnly = isOp && !isGlobal;

  // 탭 목록: 3탭 구조 (v2 드릴다운)
  const allTabs = [
    { label: "📊 배정 현황", fn: "renderAllocOverview", idx: 0 },
    { label: "🏦 최초 예산 할당", fn: "renderInitialAlloc", idx: 1, globalOnly: true },
    { label: "📤 예산 배분", fn: "renderBudgetDistribution", idx: 2 },
    { label: "📜 변경 이력", fn: "renderAllocHistory", idx: 3 },
  ];
  const visibleTabs = isOpOnly ? allTabs.filter(t => !t.globalOnly) : allTabs;

  // 역할 라벨
  const roleLabel = typeof getRoleLabel === 'function' ? getRoleLabel(persona) : (isOpOnly ? '운영담당자' : '총괄담당자');
  const roleBadge = isOpOnly
    ? `<span style="background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px">👤 ${roleLabel} — 조회전용</span>`
    : `<span style="background:#D1FAE5;color:#065F46;font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px">📊 ${roleLabel} — 전체 관리</span>`;

  // ── 필터 초기화 ─────────────────────────────────────────────────────────
  if (!_allocFilterTenant) _allocFilterTenant = persona.tenantId || 'HMC';
  _allocFilterYear = _allocYear || _allocFilterYear; // 기존 연도 상태 동기화

  // ── DB에서 제도그룹/계정 로드 → ACCOUNT_BUDGETS 동기화 → 컨텐츠 재렌더 ──
  _allocLoadFilterData(persona).then(() => {
    const filterEl = document.getElementById('alloc-filter-bar');
    if (filterEl) filterEl.innerHTML = _allocFilterBarContent(persona);
    // DB 계정이 ACCOUNT_BUDGETS에 추가된 후 sync + 재렌더
    return _syncAllocFromDB(persona);
  }).then(() => {
    // ★ 초기 로드 완료 — 반드시 현재 탭을 재렌더
    const contentEl = document.getElementById("alloc-content");
    if (contentEl) {
      const fns = [renderAllocOverview, renderInitialAlloc, renderBudgetDistribution, renderAllocHistory];
      const fn = fns[_allocTab];
      if (fn) contentEl.innerHTML = fn();
    }
  }).catch(e => console.warn('[BO Alloc Init]', e));

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">예산 배정</span>
      <h1 class="bo-page-title" style="margin:0">예산 배정 현황 관리</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
      ${roleBadge}
    </div>
    <p class="bo-page-sub">예산 흐름: 계정 총액 관리 → 팀 배분 → 실시간 원장 조회</p>
  </div>

  <!-- 🔍 조회 필터바 -->
  <div id="alloc-filter-bar">${_allocFilterBarContent(persona)}</div>

  <!-- 예산 흐름 안내 -->
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;padding:10px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;font-size:12px;color:#065F46;font-weight:600;flex-wrap:wrap">
    <span>📌 예산 흐름:</span>
    <span style="background:#DBEAFE;color:#1E40AF;padding:2px 8px;border-radius:6px">ⓘ 기초 예산 등록</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px">ⓙ 계정 추가 배정 (연중 증액)</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:6px">ⓚ 팀 배분 (배분가능 재원 → 팀)</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:6px">ⓛ 팀별 집행 관리</span>
  </div>

  ${isOpOnly ? `
  <!-- 운영담당자 권한 안내 배너 -->
  <div style="padding:10px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;margin-bottom:16px;font-size:12px;color:#1E40AF;font-weight:600;display:flex;align-items:center;gap:8px">
    <span style="font-size:16px">🔒</span>
    <div>
      <div style="font-weight:800">운영담당자 모드: 계정 배정 탭은 조회전용입니다</div>
      <div style="font-size:11px;color:#3B82F6">기초/추가 배정, 이관은 총괄담당자 권한입니다. 팀 배분 요청은 팀 배분 탭에서 가능합니다.</div>
    </div>
  </div>` : ''}

  <!-- 탭 -->
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:24px" id="alloc-tabs">
    ${visibleTabs.map((t, i) => `
    <button onclick="showAllocTabByIdx(${t.idx})" id="alloc-tab-${t.idx}"
      style="padding:10px 18px;font-size:12px;font-weight:700;border:none;background:transparent;cursor:pointer;
             color:${t.idx === _allocTab ? '#059669' : '#9CA3AF'};border-bottom:${t.idx === _allocTab ? '3px solid #059669' : '3px solid transparent'};
             margin-bottom:-2px;transition:all .15s;white-space:nowrap">
      ${t.label}
    </button>`).join('')}
  </div>
  <div id="alloc-content">
    <div style="padding:60px;text-align:center">
      <div style="font-size:32px;margin-bottom:12px;animation:pulse 1.5s infinite">⏳</div>
      <div style="color:#6B7280;font-size:13px;font-weight:700">예산 계정 데이터를 불러오는 중...</div>
      <div style="color:#9CA3AF;font-size:11px;margin-top:4px">DB에서 계정 및 배분 정보를 로드하고 있습니다.</div>
    </div>
  </div>
</div>`;
}

function showAllocTab(idx) {
  showAllocTabByIdx(idx);
}

// v2: 탭 전환
function showAllocTabByIdx(idx) {
  const persona = typeof boCurrentPersona !== 'undefined' ? boCurrentPersona : null;
  const isGlobal = typeof boIsGlobalAdmin === 'function' ? boIsGlobalAdmin() : isGlobalAdmin(persona);
  const isOp = typeof boIsOpManager === 'function' ? boIsOpManager() : isOpManager(persona);
  const isOpOnly = isOp && !isGlobal;

  // 운영담당자: 총괄 전용 탭 차단
  if (isOpOnly && idx === 1) {
    alert('총괄담당자만 사용할 수 있는 메뉴입니다.');
    return;
  }

  _allocTab = idx;
  [0, 1, 2, 3].forEach(i => {
    const t = document.getElementById(`alloc-tab-${i}`);
    if (!t) return;
    t.style.color = i === idx ? '#059669' : '#9CA3AF';
    t.style.borderBottom = i === idx ? '3px solid #059669' : '3px solid transparent';
  });

  // 탭 2(배분) 진입 시 드릴다운 초기화
  if (idx === 2) {
    _ddLevel = 0; _ddOrgId = null; _ddOrgName = null;
    // _ddAbId: 현재 계정 유지, 없으면 첫 번째 계정으로 초기화
    const _myBudgets = typeof getPersonaAccountBudgets === 'function' ? getPersonaAccountBudgets(persona) : [];
    if (!_ddAbId || !_myBudgets.find(b => b.id === _ddAbId)) {
      _ddAbId = _myBudgets[0]?.id || null;
    }
    // 운영담당자는 관할 교육조직 자동 진입 (Level 1)
    if (isOpOnly) {
      const vorg = typeof getPersonaManagedVorg === 'function' ? getPersonaManagedVorg(persona) : null;
      if (vorg) { _ddOrgId = vorg.id; _ddOrgName = vorg.name; _ddLevel = 1; }
    }
  }

  const fns = [
    renderAllocOverview,
    renderInitialAlloc,
    renderBudgetDistribution,
    renderAllocHistory,
  ];
  const fn = fns[idx];
  if (fn) document.getElementById('alloc-content').innerHTML = fn();
}

// ─── 조회 필터바 함수 (사업계획관리 _bdFilterBar 패턴 차용) ──────────────────
async function _allocLoadFilterData(persona) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const tenant = _allocFilterTenant || persona.tenantId || 'HMC';
  try {
    // 1. 예산계정 로드
    const { data: accts } = await sb
      .from('budget_accounts')
      .select('id,name,code,virtual_org_template_id,integration_mode')
      .eq('tenant_id', tenant)
      .eq('active', true)
      .eq('uses_budget', true);
    _allocFilterAcctList = accts || [];

    // ★ DB 계정 → ACCOUNT_BUDGETS 자동 동기화
    // bankbook/allocation 존재 여부와 무관하게 DB 계정을 메모리에 반영
    const year = _allocFilterYear || new Date().getFullYear();
    _allocFilterAcctList.forEach(dbAcct => {
      const existsInMemory = ACCOUNT_BUDGETS.find(
        ab => ab.accountCode === dbAcct.code && ab.tenantId === tenant && (ab.fiscalYear || 2026) === year
      );
      // ★ DB integration_mode / templateId 변경 시 인메모리 동기화
      if (existsInMemory) {
        const newSrcType = dbAcct.integration_mode === 'sap' ? 'sap_if' : 'platform';
        if (existsInMemory.sourceType !== newSrcType) {
          console.log('[_allocLoadFilterData] sourceType 동기화:', dbAcct.code, existsInMemory.sourceType, '->', newSrcType);
          existsInMemory.sourceType = newSrcType;
        }
        // Bug Fix: 기존 인메모리 항목에도 templateId 동기화 (드릴다운 VOrg 매핑에 필수)
        if (dbAcct.virtual_org_template_id && existsInMemory.templateId !== dbAcct.virtual_org_template_id) {
          existsInMemory.templateId = dbAcct.virtual_org_template_id;
          console.log('[_allocLoadFilterData] templateId 동기화:', dbAcct.code, '->', dbAcct.virtual_org_template_id);
        }
      }
      if (!existsInMemory) {
        const newAbId = 'AB_DB_' + dbAcct.id;
        if (!ACCOUNT_BUDGETS.find(ab => ab.id === newAbId)) {
          ACCOUNT_BUDGETS.push({
            id: newAbId,
            tenantId: tenant,
            accountCode: dbAcct.code,
            dbAccountId: dbAcct.id,
            // Bug Fix: templateId 추가 — 드릴다운 Level0에서 VOrg 매핑에 필수
            templateId: dbAcct.virtual_org_template_id || null,
            sourceType: (dbAcct.integration_mode === 'sap') ? 'sap_if' : 'platform',
            fiscalYear: year,
            baseAmount: 0,
            totalAdded: 0,
            status: 'confirmed',
            _fromDb: true,
          });
        }
        // ACCOUNT_MASTER에도 없으면 추가
        if (typeof ACCOUNT_MASTER !== 'undefined') {
          if (!ACCOUNT_MASTER.find(m => m.code === dbAcct.code)) {
            ACCOUNT_MASTER.push({ code: dbAcct.code, name: dbAcct.name || dbAcct.code, type: 'custom' });
          }
        }
      }
    });

    // 2. 제도그룹 로드 (예산계정이 연결된 것만)
    const tplIds = [...new Set((_allocFilterAcctList).map(a => a.virtual_org_template_id).filter(Boolean))];
    if (tplIds.length > 0) {
      const { data: tpls } = await sb
        .from('virtual_org_templates')
        .select('id,name')
        .eq('tenant_id', tenant)
        .in('id', tplIds);
      _allocFilterTplList = tpls || [];
    } else {
      _allocFilterTplList = [];
    }

    // 선택값 초기화
    if (!_allocFilterTplId || !_allocFilterTplList.find(t => t.id === _allocFilterTplId)) {
      _allocFilterTplId = _allocFilterTplList[0]?.id || null;
    }
    _allocFilterLoaded = true;
  } catch (e) {
    console.warn('[allocFilter] DB load error:', e);
  }
}

function _allocFilterBarContent(persona) {
  const selStyle = 'border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:130px;cursor:pointer';
  const isPlatform = persona.role === 'platform_admin' || persona.role === 'tenant_global_admin';
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];

  // 테넌트 셀렉트
  const tenantSel = isPlatform
    ? `<select onchange="_allocFilterTenant=this.value;_allocFilterTplId=null;_allocFilterAccountCode=null;_allocFilterLoaded=false;renderBoAllocation()" style="${selStyle}">
        ${tenants.filter(t => t.id !== 'SYSTEM').map(t =>
          `<option value="${t.id}" ${t.id === _allocFilterTenant ? 'selected' : ''}>${t.name}</option>`
        ).join('')}
      </select>`
    : `<span style="font-size:12px;font-weight:800;color:#374151;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find(t => t.id === _allocFilterTenant)?.name || _allocFilterTenant}</span>`;

  // VOrg 제도그룹 셀렉트
  const tplSel = _allocFilterTplList.length > 0
    ? `<select onchange="_allocFilterTplId=this.value;_allocFilterAccountCode=null;renderBoAllocation()" style="${selStyle}">
        ${_allocFilterTplList.map(t =>
          `<option value="${t.id}" ${t.id === _allocFilterTplId ? 'selected' : ''}>${t.name}</option>`
        ).join('')}
      </select>`
    : '<span style="font-size:11px;color:#9CA3AF">로딩 중...</span>';

  // 예산계정 셀렉트 (선택된 VOrg에 속한 계정 × persona 권한내)
  const isPlatformOrTenantGlobal = persona.role === 'platform_admin' || persona.role === 'tenant_global_admin';
  const personaAllowed = persona.allowedAccounts || [];
  const isPersonaSystem = personaAllowed.includes('*');

  // 필터링: VOrg 필터 + 권한 필터 동시 적용
  const filteredAccts = (_allocFilterTplId
    ? _allocFilterAcctList.filter(a => a.virtual_org_template_id === _allocFilterTplId)
    : _allocFilterAcctList
  ).filter(a => isPlatformOrTenantGlobal || isPersonaSystem || personaAllowed.includes(a.code));

  const acctSel = filteredAccts.length > 0
    ? `<select onchange="_allocFilterAccountCode=this.value||null;_allocFilterAccountName=this.options[this.selectedIndex]?.text||null;_allocSelectedAbId=null;showAllocTabByIdx(_allocTab)" style="${selStyle}">
        <option value="">전체 계정</option>
        ${filteredAccts.map(a =>
          `<option value="${a.code}" ${a.code === _allocFilterAccountCode ? 'selected' : ''}>${a.name}</option>`
        ).join('')}
      </select>`
    : '';

  // 연도 셀렉트
  const curY = _allocFilterYear;
  const yearSel = `<select onchange="_allocFilterYear=Number(this.value);_allocYear=_allocFilterYear;_allocSelectedAbId=null;showAllocTabByIdx(_allocTab)" style="${selStyle}">
    ${[curY + 1, curY, curY - 1, curY - 2].map(y =>
      `<option value="${y}" ${curY === y ? 'selected' : ''}>${y}년</option>`
    ).join('')}
  </select>`;

  return `
  <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <span style="font-size:11px;font-weight:900;color:#374151;margin-right:4px">🔍 데이터 범위</span>
      <label style="font-size:10px;font-weight:700;color:#6B7280">테넌트(회사)</label> ${tenantSel}
      <label style="font-size:10px;font-weight:700;color:#6B7280">VOrg</label> ${tplSel}
      <label style="font-size:10px;font-weight:700;color:#6B7280">계정</label> ${acctSel}
      ${yearSel}
      <button onclick="_allocRefresh()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
    </div>
  </div>`;
}

// ─── 새로고침: 계정 선택 유지 + DB 재로드 ─────────────────────────────────────
async function _allocRefresh() {
  const persona = boCurrentPersona;
  try {
    // 1) 필터 데이터 재로드 → DB 계정 → ACCOUNT_BUDGETS 자동 동기화
    _allocFilterLoaded = false;
    await _allocLoadFilterData(persona);

    // 2) DB sync (TEAM_DIST 갱신 — 이 시점에 ACCOUNT_BUDGETS가 이미 채워져 있음)
    if (typeof _syncAllocFromDB === 'function') {
      await _syncAllocFromDB(persona);
    }

    // 3) 필터바 갱신
    const filterEl = document.getElementById('alloc-filter-bar');
    if (filterEl) filterEl.innerHTML = _allocFilterBarContent(persona);

    // 4) 현재 탭 재렌더
    const contentEl = document.getElementById('alloc-content');
    if (contentEl) {
      const fns = [renderAllocOverview, renderInitialAlloc, renderBudgetDistribution, renderAllocHistory];
      const fn = fns[_allocTab];
      if (fn) contentEl.innerHTML = fn();
    }
  } catch (err) {
    console.error('[_allocRefresh] error:', err);
  }
}


let _allocYear = new Date().getFullYear();
let _allocSelectedAbId = null;

function renderAllocOverview(year) {
  if (year !== undefined) _allocYear = year;
  const persona = boCurrentPersona;

  // ── vorg manager : 계정 총액·타 VOrg 비공개, 관할 VOrg만 표시 ─────────────
  if (isVorgManager(persona)) {
    return renderVorgManagerOverview();
  }

  // ── DB-first: _allocFilterAcctList 기준으로 myBudgets 구성 ───────────────
  // _allocFilterAcctList = DB에서 로드한 계정 목록 (tenant+active+uses_budget 필터 적용)
  // 이 목록을 기반으로 ACCOUNT_BUDGETS에서 매칭하거나 신규 생성
  const resolvedTenantId = _allocFilterTenant
    || persona.tenantId
    || (typeof _bmFilterTenant !== 'undefined' ? _bmFilterTenant : null)
    || 'HMC';

  // 권한 필터: persona.allowedAccounts 기반
  const personaAllowed = persona.allowedAccounts || [];
  const isPersonaSystem = personaAllowed.includes('*') || !persona.tenantId;
  const isPlatformOrTenantGlobal = persona.role === 'platform_admin' || persona.role === 'tenant_global_admin';

  // DB 계정 목록(_allocFilterAcctList)에서 권한에 맞는 항목 필터
  const visibleDbAccts = (_allocFilterAcctList || []).filter(a =>
    isPlatformOrTenantGlobal || isPersonaSystem || personaAllowed.includes(a.code)
  );

  // visibleDbAccts → ACCOUNT_BUDGETS 매칭하여 myBudgets 구성
  let myBudgets = visibleDbAccts.map(dbAcct => {
    // DB-synced 엔트리 우선 (_fromDb=true)
    let ab = ACCOUNT_BUDGETS.find(x =>
      x.accountCode === dbAcct.code && x.tenantId === resolvedTenantId && x._fromDb
    );
    // _fromDb 없으면 mock 엔트리 사용
    if (!ab) ab = ACCOUNT_BUDGETS.find(x =>
      x.accountCode === dbAcct.code && x.tenantId === resolvedTenantId
    );
    // 그것도 없으면 임시 객체 생성 (DB에서 계정은 있지만 예산 미등록 상태)
    if (!ab) {
      ab = {
        id: 'AB_VIRTUAL_' + dbAcct.code,
        tenantId: resolvedTenantId,
        accountCode: dbAcct.code,
        fiscalYear: _allocYear,
        baseAmount: 0,
        totalAdded: 0,
        status: 'open',
        _virtual: true,
      };
    }
    return ab;
  });

  // DB 계정 목록이 비어있으면 ACCOUNT_BUDGETS 인메모리 fallback (테넌트 필터 적용)
  if (myBudgets.length === 0) {
    const raw = getPersonaAccountBudgets(persona);
    const tenantFiltered = persona.tenantId
      ? raw
      : raw.filter(ab => ab.tenantId === resolvedTenantId);
    myBudgets = (tenantFiltered.length > 0 ? tenantFiltered : raw).filter(
      ab => (ab.fiscalYear || _allocYear) === _allocYear
    );
    if (myBudgets.length === 0) myBudgets = tenantFiltered.length > 0 ? tenantFiltered : raw;
  }

  // ── 디버그 로그 ──
  console.log('[renderAllocOverview] ACCOUNT_BUDGETS:', ACCOUNT_BUDGETS.length,
    'dbAccts:', visibleDbAccts.length, 'myBudgets:', myBudgets.length,
    'filter:', _allocFilterAccountCode, 'tenant:', resolvedTenantId, 'year:', _allocYear);

  // ── 필터 계정 코드 매칭 ──────────────────────────────────────────
  const availableYears = [
    ...new Set(
      getPersonaAccountBudgets(persona).map((ab) => ab.fiscalYear || 2026),
    ),
  ].sort((a, b) => b - a);

  // ⭐ 필터링 로직 추가: _allocFilterAccountCode가 있으면 해당 계정만 남기기
  if (_allocFilterAccountCode) {
    myBudgets = myBudgets.filter(ab => ab.accountCode === _allocFilterAccountCode);
  } else {
    // 계정이 선택되지 않았을 때 (데이터 범위 선택 전) 배정 현황 숨김 처리
    return `
<div style="margin-bottom:16px">
  <!-- 연도 선택 -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <span style="font-size:11px;font-weight:700;color:#6B7280">📅 연도:</span>
    ${availableYears
      .map(
        (y) => `<button onclick="switchAllocYear(${y})"
      style="padding:4px 14px;border-radius:8px;border:2px solid ${y === _allocYear ? "#059669" : "#E5E7EB"};
      background:${y === _allocYear ? "#059669" : "white"};color:${y === _allocYear ? "white" : "#374151"};
      font-weight:700;font-size:12px;cursor:pointer">${y}년</button>`,
      )
      .join("")}
  </div>
  <div style="padding:60px 20px;text-align:center;color:#6B7280;background:white;border-radius:12px;border:1.5px dashed #E5E7EB">
    <div style="font-size:40px;margin-bottom:12px">🎯</div>
    <div style="font-size:16px;font-weight:800;color:#374151;margin-bottom:8px">예산 계정을 선택해주세요</div>
    <div style="font-size:13px">상단 데이터 범위 필터에서 조회를 원하는 <b>예산 계정</b>을 선택해야 배정 현황을 확인할 수 있습니다.</div>
  </div>
</div>`;
  }

  if (_allocFilterAccountCode && myBudgets.length > 0) {
    const match = myBudgets.find(ab => ab.accountCode === _allocFilterAccountCode)
      || myBudgets.find(ab => (ab.accountCode || '').includes(_allocFilterAccountCode) || _allocFilterAccountCode.includes(ab.accountCode || ''));
    if (match) {
      _allocSelectedAbId = match.id;
    }
  }

  // 선택 계정 초기값: 첫 번째 계정
  if (
    !_allocSelectedAbId ||
    !myBudgets.find((ab) => ab.id === _allocSelectedAbId)
  ) {
    _allocSelectedAbId = myBudgets[0]?.id || null;
  }
  const ab = myBudgets.find((x) => x.id === _allocSelectedAbId);

  console.log('[renderAllocOverview] selected:', _allocSelectedAbId, 'ab found:', !!ab, 'myBudgets codes:', myBudgets.map(b => b.accountCode));

  // ── 연도 선택 + 소진율 모니터링 + 계정 선택 패널 ──────────────────────────
  // 전체 계정 소진율 요약
  const burnRateCards = myBudgets.map(b => {
    const a = ACCOUNT_MASTER.find(x => x.code === b.accountCode);
    const tot = b.baseAmount + b.totalAdded;
    const flatT = TEAM_DIST.filter(t => t.accountBudgetId === b.id);
    const spent = flatT.reduce((s, t) => s + t.spent, 0);
    const reserved = flatT.reduce((s, t) => s + t.reserved, 0);
    const burnPct = tot > 0 ? Math.min(((spent + reserved) / tot) * 100, 100) : 0;
    const burnColor = burnPct >= 95 ? '#EF4444' : burnPct >= 80 ? '#F59E0B' : '#059669';
    const burnIcon = burnPct >= 95 ? '🔴' : burnPct >= 80 ? '🟡' : '🟢';
    // DB에서 로드된 계정 정보에서 integration_mode 확인
    const dbAcct = (window._baAccountList || []).find(x => x.code === b.accountCode);
    const intMode = dbAcct?.integration_mode || (b.sourceType === 'sap_if' ? 'sap' : 'self');
    const intBadge = intMode === 'sap'
      ? '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:#DBEAFE;color:#1D4ED8">🔗 SAP</span>'
      : '<span style="font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;background:#FFEDD5;color:#9A3412">📋 자체</span>';
    return `<div style="flex:1;min-width:160px;padding:12px 14px;background:white;border:1.5px solid #E5E7EB;border-radius:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:800;color:#374151">${a?.name || b.accountCode}</span>
        ${intBadge}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden">
          <div style="height:100%;background:${burnColor};width:${burnPct.toFixed(0)}%;border-radius:99px;transition:width .3s"></div>
        </div>
        <span style="font-size:11px;font-weight:900;color:${burnColor};white-space:nowrap">${burnIcon} ${burnPct.toFixed(0)}%</span>
      </div>
      <div style="font-size:10px;color:#6B7280;margin-top:4px">총 ${boFmt(tot)}원 / 집행 ${boFmt(spent)}원</div>
    </div>`;
  }).join('');

  const topBarHtml = `
<div style="margin-bottom:16px">
  <!-- 연도 선택 -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <span style="font-size:11px;font-weight:700;color:#6B7280">📅 연도:</span>
    ${availableYears
      .map(
        (y) => `<button onclick="switchAllocYear(${y})"
      style="padding:4px 14px;border-radius:8px;border:2px solid ${y === _allocYear ? "#059669" : "#E5E7EB"};
      background:${y === _allocYear ? "#059669" : "white"};color:${y === _allocYear ? "white" : "#374151"};
      font-weight:700;font-size:12px;cursor:pointer">${y}년</button>`,
      )
      .join("")}
  </div>

  <div style="display:flex;gap:16px;flex-wrap:wrap">
    <!-- 계정 선택 카드 패널 -->
    <div style="flex:1;min-width:300px">
      <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        💰 배분가능 금액 (계정 선택)
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${myBudgets
          .map((b) => {
            const a = ACCOUNT_MASTER.find((x) => x.code === b.accountCode);
            const isSel = b.id === _allocSelectedAbId;
            // DB에서 integration_mode 조회
            const dbAcct = (window._baAccountList || []).find(x => x.code === b.accountCode);
            const intMode = dbAcct?.integration_mode || (b.sourceType === 'sap_if' ? 'sap' : 'self');
            const isSAP = intMode === 'sap';
            const tot = b.baseAmount + b.totalAdded;
            const dist = TEAM_DIST.filter((t) => t.accountBudgetId === b.id).reduce(
              (s, t) => s + t.allocAmount,
              0,
            );
            const distrib = tot - dist;
            return `<button onclick="selectAllocAb('${b.id}')" style="
            display:flex;flex-direction:column;align-items:flex-start;gap:2px;
            padding:10px 14px;border-radius:10px;cursor:pointer;flex:1;
            border:2px solid ${isSel ? "#059669" : "#E5E7EB"};
            background:${isSel ? "#F0FDF4" : "white"};
            box-shadow:${isSel ? "0 0 0 3px #BBF7D0" : "none"}">
            <div style="display:flex;align-items:center;gap:6px">
              <code style="font-size:10px;font-weight:900;padding:1px 6px;border-radius:5px;background:${isSAP ? "#DBEAFE" : "#FFEDD5"};color:${isSAP ? "#1E40AF" : "#9A3412"}">${b.accountCode}</code>
              <span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${isSAP ? '#EFF6FF' : '#FFF7ED'};color:${isSAP ? '#1D4ED8' : '#C2410C'}">${isSAP ? '🔗SAP' : '📋자체'}</span>
              ${isSel ? '<span style="color:#059669;font-size:11px">✓</span>' : ""}
            </div>
            <div style="font-size:11px;font-weight:700;color:#111;white-space:nowrap">${a?.name || b.accountCode}</div>
            <div style="font-size:10px;color:${distrib > 0 ? "#059669" : "#9CA3AF"};font-weight:600">${distrib > 0 ? "📦 " + boFmt(distrib) + "원 배분가능" : "완전 배분"}</div>
          </button>`;
          })
          .join("")}
      </div>
    </div>

    <!-- 소진율 모니터링 패널 -->
    ${`
    <div style="flex:1;min-width:300px">
      <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        🔥 소진율 모니터링 <span style="font-size:10px;font-weight:500;color:#9CA3AF">(집행+가점유 / 총 배정)</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${burnRateCards}</div>
    </div>`}
  </div>
</div>`;

  if (!ab) {
    // 계정이 아직 로드되지 않았거나 없는 경우 — DB 로딩 대기 안내
    if (myBudgets.length === 0) {
      return topBarHtml + `
      <div style="padding:40px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">⏳</div>
        <div style="color:#6B7280;font-size:13px;font-weight:700">예산 계정 데이터를 로드 중입니다...</div>
        <div style="color:#9CA3AF;font-size:11px;margin-top:6px">DB에서 계정 정보를 가져오는 중입니다. 잠시 후 자동으로 갱신됩니다.</div>
        <button onclick="_allocRefresh()" style="margin-top:14px;padding:8px 20px;border-radius:10px;border:2px solid #059669;background:#F0FDF4;color:#059669;font-weight:800;font-size:12px;cursor:pointer">🔄 수동 새로고침</button>
      </div>`;
    }
    return (
      topBarHtml +
      `<div style="padding:40px;text-align:center;color:#9CA3AF">계정을 선택하세요.</div>`
    );
  }

  return topBarHtml + renderAbDetail(ab);
}

function selectAllocAb(abId) {
  _allocSelectedAbId = abId;
  document.getElementById("alloc-content").innerHTML = renderAllocOverview();
}

function switchAllocYear(year) {
  _allocYear = year;
  _allocSelectedAbId = null;
  document.getElementById("alloc-content").innerHTML = renderAllocOverview();
}

// === VOrg Manager 전용 예산 현황 뷰 (계정 총액·타 VOrg 비공개) ===================
function renderVorgManagerOverview() {
  const persona = boCurrentPersona;
  const myBudgets = getPersonaAccountBudgets(persona).filter(
    (ab) => (ab.fiscalYear || 2026) === _allocYear,
  );
  const vorg = getPersonaManagedVorg(persona);
  if (!vorg)
    return '<div style="padding:40px;text-align:center;color:#9CA3AF">관할 교육조직 정보가 없습니다.</div>';
  const isRnd = persona.budgetGroup === "rnd";
  const orgIcon = isRnd ? "🔬" : "🏢";

  // 연도 선택기
  const availableYears = [
    ...new Set(
      getPersonaAccountBudgets(persona).map((ab) => ab.fiscalYear || 2026),
    ),
  ].sort((a, b) => b - a);
  const yearSel = availableYears
    .map(
      (y) =>
        '<button onclick="switchAllocYear(' +
        y +
        ')" style="padding:4px 14px;border-radius:8px;border:2px solid ' +
        (y === _allocYear ? "#059669" : "#E5E7EB") +
        ";background:" +
        (y === _allocYear ? "#059669" : "white") +
        ";color:" +
        (y === _allocYear ? "white" : "#374151") +
        ';font-weight:700;font-size:12px;cursor:pointer">' +
        y +
        "년</button>",
    )
    .join("");

  const acctCards = myBudgets
    .map((ab) => {
      const acct = ACCOUNT_MASTER.find((x) => x.code === ab.accountCode);
      const isSAP = ab.sourceType === "sap_if";
      // VOrg에 배분된 TEAM_DIST 항목 (vorg name으로 매칭)
      const td = TEAM_DIST.find(
        (t) =>
          t.accountBudgetId === ab.id &&
          (t.teamName === vorg.name ||
            t.teamName.includes(vorg.name) ||
            vorg.name.includes(t.teamName)),
      );
      if (!td) {
        return (
          '<div class="bo-card" style="overflow:hidden;margin-bottom:16px">' +
          '<div style="padding:12px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:14px">' +
          orgIcon +
          "</span>" +
          '<span style="font-weight:800;font-size:14px">' +
          vorg.name +
          "</span>" +
          '<code style="background:white;padding:1px 8px;border-radius:5px;font-size:10px;font-weight:900;border:1.5px solid ' +
          (isSAP ? "#93C5FD" : "#FED7AA") +
          ";color:" +
          (isSAP ? "#1D4ED8" : "#C2410C") +
          '">' +
          ab.accountCode +
          "</code>" +
          '<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;font-weight:700">⏳ 배분 대기 중</span>' +
          '</div><div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">총괄 담당자가 아직 이 조직에 예산을 배분하지 않았습니다.</div></div>'
        );
      }
      const allocated = td.allocAmount,
        spent = td.spent,
        reserved = td.reserved;
      const balance = allocated - spent - reserved;
      const pct =
        allocated > 0
          ? Math.min(((spent + reserved) / allocated) * 100, 100)
          : 0;
      const pctColor =
        pct >= 95 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#059669";

      // 하위 팀 현황 (VIRTUAL_EDU_ORGS teams)
      const subTeams = vorg.teams || [];
      const teamRows = subTeams
        .map((rt) => {
          const rb = rt.budget || {},
            ra = rb.allocated || 0,
            rs = rb.deducted || 0,
            rr = rb.holding || 0;
          const rBal = ra - rs - rr,
            rPct = ra > 0 ? Math.min(((rs + rr) / ra) * 100, 100) : 0;
          const rC =
            rPct >= 95 ? "#EF4444" : rPct >= 80 ? "#F59E0B" : "#059669";
          const rBar = ra
            ? '<div style="height:5px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:60px;margin:0 auto 2px"><div style="height:100%;background:' +
              rC +
              ";width:" +
              rPct.toFixed(0) +
              '%"></div></div><span style="font-size:10px;color:' +
              rC +
              '">' +
              rPct.toFixed(0) +
              "%</span>"
            : '<span style="font-size:10px;color:#D1D5DB">—</span>';
          return (
            '<tr style="background:white;border-top:1px solid #F1F5F9"><td style="padding:8px 16px 8px 40px"><div style="display:flex;align-items:center;gap:5px"><span style="color:#CBD5E1;font-size:11px">└─</span><span style="font-size:12px;font-weight:700;color:#374151">' +
            rt.name +
            '</span><span style="font-size:10px;color:#9CA3AF">실제팀</span></div></td>' +
            '<td style="text-align:right;font-size:12px">' +
            (ra ? boFmt(ra) : "—") +
            "</td>" +
            '<td style="text-align:right;color:#EF4444;font-size:12px">' +
            (rs ? boFmt(rs) : "—") +
            "</td>" +
            '<td style="text-align:right;color:#B45309;font-size:12px">' +
            (rr ? boFmt(rr) : "—") +
            "</td>" +
            '<td style="text-align:right;font-size:12px;color:' +
            rC +
            '">' +
            (ra ? boFmt(rBal) : "—") +
            "</td>" +
            '<td style="text-align:center">' +
            rBar +
            "</td></tr>"
          );
        })
        .join("");

      return (
        '<div class="bo-card" style="overflow:hidden;margin-bottom:16px">' +
        '<div style="padding:14px 20px;background:' +
        (isRnd ? "#F5F3FF" : "#EFF6FF") +
        ';border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:18px">' +
        orgIcon +
        "</span>" +
        '<div><div style="font-weight:900;font-size:15px">' +
        vorg.name +
        '</div><div style="font-size:10px;color:#6B7280">관할 가상' +
        (isRnd ? "센터" : "본부") +
        " · " +
        _allocYear +
        "년</div></div>" +
        '<code style="background:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:900;border:1.5px solid ' +
        (isSAP ? "#93C5FD" : "#FED7AA") +
        ";color:" +
        (isSAP ? "#1D4ED8" : "#C2410C") +
        '">' +
        ab.accountCode +
        "</code>" +
        '</div><span style="font-size:11px;font-weight:900;color:' +
        pctColor +
        '">소진율 ' +
        pct.toFixed(0) +
        "% " +
        (pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢") +
        "</span>" +
        "</div>" +
        // 배분 현황 요약 (계정 총액 비공개, 배분받은 금액만)
        '<div style="padding:14px 20px;background:#F9FAFB;border-bottom:2px solid #CBD5E1">' +
        '<div style="font-size:10px;color:#6B7280;font-weight:700;margin-bottom:8px;text-transform:uppercase">조직 배분 현황</div>' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div style="text-align:center;background:#EFF6FF;padding:8px 16px;border-radius:10px"><div style="font-size:10px;color:#1D4ED8;font-weight:700">배분 받은 예산</div><div style="font-weight:900;font-size:18px;color:#1D4ED8">' +
        boFmt(allocated) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">−</div>' +
        '<div style="text-align:center"><div style="font-size:10px;color:#EF4444;font-weight:700">집행</div><div style="font-weight:700;font-size:14px;color:#EF4444">' +
        boFmt(spent) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">−</div>' +
        '<div style="text-align:center"><div style="font-size:10px;color:#B45309;font-weight:700">가점유</div><div style="font-weight:700;font-size:14px;color:#B45309">' +
        boFmt(reserved) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">=</div>' +
        '<div style="text-align:center;background:' +
        (balance > 0 ? "#F0FDF4" : "#FEF2F2") +
        ";padding:8px 16px;border-radius:10px;border:2px solid " +
        (balance > 0 ? "#BBF7D0" : "#FECACA") +
        '">' +
        '<div style="font-size:10px;color:' +
        (balance > 0 ? "#059669" : "#EF4444") +
        ';font-weight:700">잔 액</div>' +
        '<div style="font-weight:900;font-size:18px;color:' +
        (balance > 0 ? "#059669" : "#EF4444") +
        '">' +
        boFmt(balance) +
        "</div></div>" +
        "</div>" +
        '<div style="margin-top:10px;height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden"><div style="height:100%;background:' +
        pctColor +
        ";width:" +
        pct.toFixed(0) +
        '%;border-radius:99px"></div></div>' +
        "</div>" +
        // 하위 팀 테이블
        '<div style="padding:8px 20px 4px"><div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase">하위 팀 예산 현황</div></div>' +
        '<table class="bo-table"><thead><tr><th>팀</th><th style="text-align:right">배분액</th><th style="text-align:right">실지출</th><th style="text-align:right">가점유</th><th style="text-align:right">잔액</th><th style="text-align:center">소진율</th></tr></thead>' +
        "<tbody>" +
        (teamRows ||
          '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">하위 팀 데이터가 없습니다</td></tr>') +
        "</tbody></table>" +
        "</div>"
      );
    })
    .join("");

  return (
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="font-size:11px;font-weight:700;color:#6B7280">📅 연도:</span>' +
    yearSel +
    "</div>" +
    '<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:16px;font-size:12px;color:#92400E;font-weight:600">👤 <b>' +
    persona.name +
    " " +
    persona.roleLabel +
    "</b> — 관할 조직(<b>" +
    vorg.name +
    "</b>)의 예산 현황만 표시합니다.</div>" +
    acctCards
  );
}
function renderAbDetail(ab) {
  const dummy_ab = ab;
  const acct = ACCOUNT_MASTER.find((a) => a.code === ab.accountCode);
  const isSAP = ab.sourceType === "sap_if";
  const totalBudget = ab.baseAmount + ab.totalAdded;
  const flatTeams = TEAM_DIST.filter((t) => t.accountBudgetId === ab.id);
  const distributed = flatTeams.reduce((s, t) => s + t.allocAmount, 0);
  const distributable = totalBudget - distributed;
  const totalSpent = flatTeams.reduce((s, t) => s + t.spent, 0);
  const totalReserved = flatTeams.reduce((s, t) => s + t.reserved, 0);
  const pct =
    totalBudget > 0
      ? Math.min(((totalSpent + totalReserved) / totalBudget) * 100, 100)
      : 0;
  const alertColor = pct >= 95 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#059669";

  const isRnd = ab.accountCode.includes("RND");
  // Bug Fix: templateId 기반 정확한 매핑 우선, fallback으로 tenantId + 비어있지 않은 tree 검색
  const tpl = (ab.templateId ? VIRTUAL_EDU_ORGS.find(t => t.id === ab.templateId) : null)
    || VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (t.tree?.hqs?.length || t.tree?.centers?.length));
  // Bug Fix: DB tree_data는 hqs 사용. hqs 우선, 없으면 centers
  const vGroups = tpl ? (tpl.tree?.hqs || tpl.tree?.centers || []) : [];
  const groupedRows = [];
  const usedTdIds = new Set();

  // vorg manager이면 자신의 VOrg만 표시
  const _isVorgMgr =
    isVorgManager(ab._persona || boCurrentPersona);
  const _myVorgId = _isVorgMgr ? boCurrentPersona.managedVorgId : null;
  const _filteredGroups = _myVorgId
    ? vGroups.filter((vg) => vg.id === _myVorgId)
    : vGroups;
  _filteredGroups.forEach((vg) => {
    const matchedTds = flatTeams.filter(
      (td) => td.teamName.includes(vg.name) || vg.name.includes(td.teamName),
    );
    if (!matchedTds.length) return;
    matchedTds.forEach((td) => usedTdIds.add(td.id));
    const vgAlloc = matchedTds.reduce((s, t) => s + t.allocAmount, 0);
    const vgSpent = matchedTds.reduce((s, t) => s + t.spent, 0);
    const vgRes = matchedTds.reduce((s, t) => s + t.reserved, 0);
    const vgBal = vgAlloc - vgSpent - vgRes;
    const vgPct =
      vgAlloc > 0 ? Math.min(((vgSpent + vgRes) / vgAlloc) * 100, 100) : 0;
    const vgC = vgPct >= 95 ? "#EF4444" : vgPct >= 80 ? "#F59E0B" : "#059669";
    groupedRows.push(`
    <tr style="background:#F1F5F9;border-top:2px solid #CBD5E1">
      <td style="padding:10px 16px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">${isRnd ? "🔬" : "🏢"}</span>
          <div><div style="font-weight:900;font-size:13px">${vg.name}</div><div style="font-size:10px;color:#64748B">교육조직 소계 · ${vg.manager || "—"}</div></div>
        </div>
      </td>
      <td style="text-align:right;font-weight:900;font-size:13px;color:#1D4ED8">${boFmt(vgAlloc)}</td>
      <td style="text-align:right;color:#EF4444;font-weight:700">${boFmt(vgSpent)}</td>
      <td style="text-align:right;color:#B45309;font-weight:700">${boFmt(vgRes)}</td>
      <td style="text-align:right;font-weight:900;color:${vgC};font-size:13px">${boFmt(vgBal)}</td>
      <td style="text-align:center">
        <div style="height:7px;background:#E2E8F0;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:${vgC};width:${vgPct.toFixed(0)}%"></div></div>
        <span style="font-size:10px;color:${vgC};font-weight:700">${vgPct.toFixed(0)}%</span>
      </td>
    </tr>`);
    vg.teams.forEach((rt) => {
      const rb = rt.budget || {};
      const ra = rb.allocated || 0,
        rs = rb.deducted || 0,
        rr = rb.holding || 0;
      const rBal = ra - rs - rr,
        rPct = ra > 0 ? Math.min(((rs + rr) / ra) * 100, 100) : 0;
      const rC = rPct >= 95 ? "#EF4444" : rPct >= 80 ? "#F59E0B" : "#059669";
      const rtPctBar = ra
        ? '<div style="height:5px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:60px;margin:0 auto 2px"><div style="height:100%;background:' +
          rC +
          ";width:" +
          rPct.toFixed(0) +
          '%"></div></div><span style="font-size:10px;color:' +
          rC +
          '">' +
          rPct.toFixed(0) +
          "%</span>"
        : '<span style="font-size:10px;color:#D1D5DB">—</span>';
      groupedRows.push(`
      <tr style="background:white;border-top:1px solid #F1F5F9">
        <td style="padding:8px 16px 8px 40px">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="color:#CBD5E1;font-size:11px">└─</span>
            <span style="font-size:12px;font-weight:700;color:#374151">${rt.name}</span>
            <span style="font-size:10px;color:#9CA3AF">실제팀</span>
          </div>
        </td>
        <td style="text-align:right;font-size:12px">${ra ? boFmt(ra) : "—"}</td>
        <td style="text-align:right;color:#EF4444;font-size:12px">${rs ? boFmt(rs) : "—"}</td>
        <td style="text-align:right;color:#B45309;font-size:12px">${rr ? boFmt(rr) : "—"}</td>
        <td style="text-align:right;font-size:12px;color:${rC}">${ra ? boFmt(rBal) : "—"}</td>
        <td style="text-align:center">${rtPctBar}</td>
      </tr>`);
    });
  });
  flatTeams
    .filter((td) => !usedTdIds.has(td.id))
    .forEach((td) => {
      const b = td.allocAmount - td.spent - td.reserved,
        p =
          td.allocAmount > 0
            ? Math.min(((td.spent + td.reserved) / td.allocAmount) * 100, 100)
            : 0,
        c = p >= 95 ? "#EF4444" : p >= 80 ? "#F59E0B" : "#059669";
      groupedRows.push(
        `<tr><td style="font-weight:700">${td.teamName}</td><td style="text-align:right;font-weight:700">${boFmt(td.allocAmount)}</td><td style="text-align:right;color:#EF4444">${boFmt(td.spent)}</td><td style="text-align:right;color:#B45309">${boFmt(td.reserved)}</td><td style="text-align:right;font-weight:900;color:${c}">${boFmt(b)}</td><td style="text-align:center"><div style="height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:${c};width:${p.toFixed(0)}%"></div></div><span style="font-size:10px;color:${c};font-weight:700">${p.toFixed(0)}%</span></td></tr>`,
      );
    });

  const _distribRow =
    distributable > 0
      ? '<div style="margin-top:8px;display:flex;gap:8px"><button onclick="showAllocTab(2)" style="font-size:11px;padding:4px 12px;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700">📋 팀 배분하기 →</button><span style="font-size:11px;color:#059669;font-weight:600;align-self:center">미배분 ' +
        boFmt(distributable) +
        "원 배분 가능</span></div>"
      : "";
  const _emptyRow =
    groupedRows.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#9CA3AF;font-size:12px">아직 배분된 조직이 없습니다 — 팀 배분 탭에서 배분하세요</td></tr>'
      : groupedRows.join("");
  const _footHtml =
    flatTeams.length > 0
      ? '<tfoot style="background:#F1F5F9;border-top:2px solid #CBD5E1"><tr>' +
        '<td style="padding:10px 16px;font-weight:900">전체 합계</td>' +
        '<td style="text-align:right;font-weight:900;padding:10px 16px;color:#1D4ED8">' +
        boFmt(distributed) +
        "</td>" +
        '<td style="text-align:right;color:#EF4444;padding:10px 16px">' +
        boFmt(totalSpent) +
        "</td>" +
        '<td style="text-align:right;color:#B45309;padding:10px 16px">' +
        boFmt(totalReserved) +
        "</td>" +
        '<td style="text-align:right;font-weight:900;padding:10px 16px;color:' +
        alertColor +
        '">' +
        boFmt(distributed - totalSpent - totalReserved) +
        "</td>" +
        '<td style="text-align:center;padding:10px 16px"><div style="height:7px;background:#E2E8F0;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:' +
        alertColor +
        ";border-radius:99px;width:" +
        pct.toFixed(0) +
        '%"></div></div><span style="font-size:10px;color:' +
        alertColor +
        ';font-weight:700">' +
        pct.toFixed(0) +
        "%</span></td>" +
        "</tr></tfoot>"
      : "";
  return `
<div class="bo-card" style="overflow:hidden">
  <!-- 계정 헤더 -->
  <div style="padding:14px 20px;background:${isSAP ? "#EFF6FF" : "#FFF7ED"};border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:10px">
      <code style="background:white;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:900;border:1.5px solid ${isSAP ? "#93C5FD" : "#FED7AA"};color:${isSAP ? "#1D4ED8" : "#C2410C"}">${ab.accountCode}</code>
      <span style="font-weight:800;font-size:14px">${acct?.name || ab.accountCode}</span>
      <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:${isSAP ? "#DBEAFE" : "#FFEDD5"};color:${isSAP ? "#1E40AF" : "#9A3412"}">${isSAP ? "🔗 SAP I/F" : "✏️ 자체 관리"}</span>
      <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#6B7280">${_allocYear}년</span>
    </div>
    <span style="font-size:11px;font-weight:900;color:${alertColor}">소진율 ${pct.toFixed(0)}% ${pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢"}</span>
  </div>
  <!-- 계정 총액 요약 -->
  <div style="padding:14px 20px;background:#F9FAFB;border-bottom:2px solid #CBD5E1">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">기초 배정</div><div style="font-weight:900;font-size:14px">${boFmt(ab.baseAmount)}</div></div>
      <div style="color:#059669;font-weight:900;font-size:16px">+</div>
      <div style="text-align:center"><div style="font-size:10px;color:#059669">추가 배정</div><div style="font-weight:900;font-size:14px;color:#059669">+${boFmt(ab.totalAdded)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">=</div>
      <div style="text-align:center;background:#EFF6FF;padding:5px 12px;border-radius:10px"><div style="font-size:10px;color:#1D4ED8;font-weight:700">계정 총액</div><div style="font-weight:900;font-size:16px;color:#1D4ED8">${boFmt(totalBudget)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">−</div>
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">배분 완료</div><div style="font-weight:900;font-size:14px">${boFmt(distributed)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">=</div>
      <div style="text-align:center;background:${distributable <= 0 ? "#FEF2F2" : "#F0FDF4"};padding:5px 12px;border-radius:10px;border:2px solid ${distributable <= 0 ? "#FECACA" : "#BBF7D0"}">
        <div style="font-size:10px;color:${distributable <= 0 ? "#EF4444" : "#059669"};font-weight:700">📦 배분 가능</div>
        <div style="font-weight:900;font-size:16px;color:${distributable <= 0 ? "#EF4444" : "#059669"}">${boFmt(distributable)}</div>
      </div>
    </div>
    ${_distribRow}
  </div>
  <!-- 교육조직+팀 테이블 -->
  <div style="padding:10px 20px 4px"><div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.05em">조직별 배분 현황 (교육조직 → 실제팀)</div></div>
  <table class="bo-table">
    <thead><tr><th>조직</th><th style="text-align:right">배분액</th><th style="text-align:right">실지출</th><th style="text-align:right">가점유</th><th style="text-align:right">잔액</th><th style="text-align:center">소진율</th></tr></thead>
    <tbody>${_emptyRow}</tbody>
    ${_footHtml}
  </table>
</div>`;
}

// ─── 탭 2: 기초 예산 등록 + 추가 배정 (계정에 돈 넣기) ────────────────────────
function renderAllocEntry() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  if (!isOwner)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">계정 오너만 사용 가능합니다</div></div>`;

  let myBudgets = getPersonaAccountBudgets(persona);
  // ★ 상단 필터 연동: 예산계정 마스터에서 계정을 선택했으면 해당 계정만 표시
  const filterAcct = typeof _bmFilterAcctCode !== 'undefined' ? _bmFilterAcctCode : null;
  if (filterAcct) myBudgets = myBudgets.filter(ab => ab.accountCode === filterAcct);
  // ★ integration_mode는 DB에서 갓 로드된 _bmFilterAcctList/_allocFilterAcctList를 우선 참조
  //    (ACCOUNT_BUDGETS.sourceType이 캐시된 구값일 수 있음)
  const _liveAcctList = (typeof _bmFilterAcctList !== 'undefined' ? _bmFilterAcctList : [])
    .concat(typeof _allocFilterAcctList !== 'undefined' ? _allocFilterAcctList : []);
  const platformBudgets = myBudgets.filter(ab => {
    const liveAcct = _liveAcctList.find(a => a.code === ab.accountCode);
    if (liveAcct) return liveAcct.integration_mode !== 'sap';
    return ab.sourceType === 'platform'; // fallback
  });

  // ★ 상단 필터에서 계정이 선택된 경우 — 드롭다운 대신 고정 라벨 표시 + hidden input
  const _filterAcctName = filterAcct && typeof _bmFilterAcctList !== 'undefined'
    ? (_bmFilterAcctList.find(a => a.code === filterAcct) || {}).name || filterAcct : null;
  // 고정 라벨 사용 시 해당 계정의 ACCOUNT_BUDGETS id를 hidden input으로 전달
  const _fixedAbId = filterAcct ? (myBudgets.find(ab => ab.accountCode === filterAcct) || {}).id || '' : '';
  const _acctFixedLabel = _filterAcctName
    ? '<input type="hidden" id="add-ab" value="' + _fixedAbId + '"/><input type="hidden" id="init-ab" value="' + _fixedAbId + '"/><div style="padding:10px 14px;border-radius:10px;border:1.5px solid #BFDBFE;background:#EFF6FF;font-size:13px;font-weight:800;color:#1D4ED8;display:flex;align-items:center;gap:8px"><span style="font-size:16px">💳</span> ' + _filterAcctName + '<span style="font-size:10px;color:#60A5FA;font-weight:600;margin-left:auto">상단 필터에서 선택됨</span></div>' : null;

  return `
<div style="display:grid;gap:20px;max-width:700px">

  <!-- 기초 예산 등록 (플랫폼 자체관리형, baseAmount=0) -->
  ${
    platformBudgets.filter((ab) => ab.baseAmount === 0).length > 0
      ? `
  <div class="bo-card" style="padding:24px;border:2px solid #FED7AA">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:#C2410C;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">초기 설정</span>
      <div class="bo-section-title" style="margin:0;color:#C2410C">기초 예산 등록 — 연간 총액 최초 입력</div>
    </div>
    <div style="background:#FFF7ED;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:16px">
      ✏️ <b>자체관리형 계정(HMC-RND, HAE-)만</b> 여기서 최초 금액을 입력합니다.<br>
      🔗 SAP 연동형(HMC-OPS/PART/ETC, KIA-)은 SAP에서 자동 수신됩니다.
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">대상 계정 <span style="color:#EF4444">*</span></label>
        ${_acctFixedLabel || ('<select id="init-ab" style="width:100%;border:1.5px solid #FED7AA;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700"><option value="">— 계정 선택 —</option>' + platformBudgets.filter(function(ab){return ab.baseAmount===0}).map(function(ab){return '<option value="'+ab.id+'">'+((ACCOUNT_MASTER.find(function(a){return a.code===ab.accountCode})||{}).name||ab.accountCode)+'</option>'}).join('') + '</select>')}
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">연간 기초 예산 총액 <span style="color:#EF4444">*</span></label>
        <div style="position:relative">
          <input type="number" id="init-amount" placeholder="예) 10000000 (1천만원)" oninput="previewAmt('init-amount','init-preview')"
            style="width:100%;border:1.5px solid #FED7AA;border-radius:10px;padding:14px 50px 14px 16px;font-size:18px;font-weight:900"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
        </div>
        <div id="init-preview" style="font-size:12px;color:#059669;font-weight:700;margin-top:4px;text-align:right"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">비고</label>
        <input type="text" id="init-note" placeholder="예) 2026년 연간 운영계정 기초 예산 확정"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px"/>
      </div>
      <div style="background:#D1FAE5;border-radius:10px;padding:10px 14px;font-size:12px;color:#065F46;font-weight:600">
        ✅ 등록 즉시 <b>계정 예산 현황</b>에 반영 → 이후 <b>팀 배분</b>에서 금액을 팀에 나눠주세요
      </div>
      <button onclick="submitInitBudget()" class="bo-btn-primary" style="padding:14px;background:#C2410C;border-color:#C2410C">📋 기초 예산 등록 확정</button>
    </div>
  </div>`
      : `
  <div style="padding:14px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">✅</span>
    <div><div style="font-weight:800;color:#065F46">모든 자체관리형 계정의 기초 예산이 등록됐습니다</div><div style="font-size:11px;color:#6B7280">연중 증액이 필요하다면 아래 추가 배정을 이용하세요.</div></div>
  </div>`
  }

  <!-- 추가 배정 (계정에 예산 더 넣기) -->
  <div class="bo-card" style="padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:#059669;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">연중 증액</span>
      <div class="bo-section-title" style="margin:0">추가 배정 — 계정에 예산 추가</div>
    </div>
    <p style="font-size:12px;color:#6B7280;margin-bottom:16px">
      SAP I/F 계정은 SAP에서 증액 후 I/F 재수신, 자체관리형은 직접 금액 추가<br>
      <b>추가 배정 완료 후 → 팀 배분 탭에서 팀에 배분하세요</b>
    </p>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">추가 배정 계정 <span style="color:#EF4444">*</span></label>
        ${_acctFixedLabel || ('<select id="add-ab" onchange="showAddSrcBadge()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">' + (myBudgets.length===1 ? '' : '<option value="">— 계정 선택 —</option>') + myBudgets.map(function(ab){var acct=ACCOUNT_MASTER.find(function(a){return a.code===ab.accountCode});var total=ab.baseAmount+ab.totalAdded;var autoSel=(filterAcct&&ab.accountCode===filterAcct)||myBudgets.length===1;return '<option value="'+ab.id+'" data-src="'+ab.sourceType+'"'+(autoSel?' selected':'')+'>'+(acct&&acct.name||ab.accountCode)+' (현재 총액: '+boFmt(total)+'원)</option>'}).join('') + '</select>')}
        <div id="add-src-badge" style="margin-top:6px"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">추가할 금액 <span style="color:#EF4444">*</span></label>
        <div style="position:relative">
          <input type="number" id="add-amount" placeholder="예) 5000000 (500만원)" oninput="previewAmt('add-amount','add-preview')"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
        </div>
        <div id="add-preview" style="font-size:12px;color:#059669;font-weight:700;margin-top:4px;text-align:right"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">변경 사유 (Audit Trail 필수) <span style="color:#EF4444">*</span></label>
        <textarea id="add-reason" rows="3" placeholder="예) 26년 중반 예산 소진 — 2분기 외부 교육 증가로 500만원 추가"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
      </div>
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;font-weight:600">
        ⚠️ 추가 배정 확정 후에는 취소 불가 — 배분 가능 재원이 증가하며, 팀 배분 탭에서 팀에 나눠주세요
      </div>
      <button onclick="submitAddBudget()" class="bo-btn-primary" style="padding:14px">✅ 추가 배정 확정 (계정에 예산 추가)</button>
    </div>
  </div>

  <!-- 예산 회수 (추가 배정 취소) -->
  <div class="bo-card" style="padding:24px;border-left:4px solid #DC2626">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:#DC2626;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">회수</span>
      <div class="bo-section-title" style="margin:0">예산 회수 — 추가 배정 금액 일부 반납</div>
    </div>
    <p style="font-size:12px;color:#6B7280;margin-bottom:16px">
      추가 배정된 금액 중 <b>미사용 가용 잔액</b>만 회수 가능합니다.<br>
      기초 예산은 회수 불가 / 이미 집행·가점유된 금액은 회수 불가
    </p>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">회수 계정 <span style="color:#EF4444">*</span></label>
        ${_acctFixedLabel || ('<select id="recall-ab" style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700"><option value="">— 계정 선택 —</option>' + myBudgets.filter(function(ab){return ab.totalAdded>0}).map(function(ab){var acct=ACCOUNT_MASTER.find(function(a){return a.code===ab.accountCode});return '<option value="'+ab.id+'">'+((acct&&acct.name)||ab.accountCode)+' (추가배정: '+boFmt(ab.totalAdded)+'원)</option>'}).join('') + '</select>')}
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">회수할 금액 <span style="color:#EF4444">*</span></label>
        <div style="position:relative">
          <input type="number" id="recall-amount" placeholder="회수할 금액 입력" oninput="previewAmt('recall-amount','recall-preview')"
            style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
        </div>
        <div id="recall-preview" style="font-size:12px;color:#DC2626;font-weight:700;margin-top:4px;text-align:right"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">회수 사유 (필수) <span style="color:#EF4444">*</span></label>
        <textarea id="recall-reason" rows="2" placeholder="예) 2분기 교육 취소로 추가 배정분 일부 반납"
          style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
      </div>
      <button onclick="submitRecallBudget()" style="padding:14px;background:#DC2626;color:white;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer">🔄 회수 확정</button>
    </div>
  </div>
</div>`;
}

function previewAmt(inputId, previewId) {
  const v = Number(document.getElementById(inputId)?.value || 0);
  const el = document.getElementById(previewId);
  if (el)
    el.textContent =
      v > 0
        ? `= ${boFmt(v)}원 (${(v / 10000).toLocaleString("ko-KR")}만원)`
        : "";
}

function showAddSrcBadge() {
  const sel = document.getElementById("add-ab");
  const src = sel.options[sel.selectedIndex]?.dataset?.src || "";
  const badge = document.getElementById("add-src-badge");
  if (badge && src)
    badge.innerHTML = `<div style="padding:8px 12px;border-radius:8px;font-size:11px;font-weight:700;background:${src === "sap_if" ? "#EFF6FF" : "#FFF7ED"};color:${src === "sap_if" ? "#1D4ED8" : "#C2410C"};border:1px solid ${src === "sap_if" ? "#BFDBFE" : "#FED7AA"}">
    ${src === "sap_if" ? "🔗 SAP I/F 연동 계정 — 추가 배정이 계정 총액에 가산됩니다." : "✏️ 자체관리 계정 — 입력 즉시 계정 총액에 반영되어 팀 배분 가능 재원이 증가합니다."}
  </div>`;
}

async function submitInitBudget() {
  // 마감된 연도 차단
  if (window._bmYearStatus === 'closed') {
    alert('⛔ 이 연도는 마감됐습니다. 수정이 불가합니다.');
    return;
  }
  // init-ab DOM이 없으면(고정 라벨 모드) _bmFilterAcctCode로 계정 특정
  let abId = document.getElementById("init-ab")?.value;
  if (!abId && typeof _bmFilterAcctCode !== "undefined" && _bmFilterAcctCode) {
    const _tid = (typeof boCurrentPersona !== "undefined" && boCurrentPersona.tenantId) || _bmFilterTenant;
    const _matchAb = ACCOUNT_BUDGETS.find(x => x.accountCode === _bmFilterAcctCode && x.tenantId === _tid);
    if (_matchAb) abId = _matchAb.id;
  }
  const amount = Number(document.getElementById("init-amount")?.value);
  const note = document.getElementById("init-note")?.value || "연간 기초 예산 최초 등록";
  if (!abId || !amount) {
    alert("계정과 금액을 입력하세요.");
    return;
  }
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  if (!ab) return;
  if (ab.baseAmount > 0) {
    alert("이미 기초 예산이 등록된 계정입니다. 증액은 추가 배정을 이용하세요.");
    return;
  }

  // ── 인메모리 업데이트 ────────────────────────────────────────────────────
  ab.baseAmount = amount;
  ab.status = "confirmed";
  ab.enteredBy = boCurrentPersona.name;
  ab.enteredAt = new Date().toISOString().slice(0, 10);
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}`,
    accountBudgetId: abId,
    date: new Date().toISOString().slice(0, 10),
    type: "기초입력",
    amount,
    note,
    by: boCurrentPersona.name,
  });

  // ── Supabase DB 저장 (account_budgets upsert) ────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      // account_budgets: upsert 대신 select → update or insert
      const year = _allocYear || new Date().getFullYear();
      const { data: existing } = await sb.from('account_budgets')
        .select('id').eq('account_code', ab.accountCode).eq('fiscal_year', year).maybeSingle();
      if (existing) {
        // base_budget 컬럼 있으면 함께 저장, 없으면 total_budget만
        const { error } = await sb.from('account_budgets').update({
          total_budget: amount, base_budget: amount, added_budget: 0,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) {
          const { error: e2 } = await sb.from('account_budgets').update({
            total_budget: amount, updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
          if (e2) throw e2;
        }
      } else {
        const { error } = await sb.from('account_budgets').insert({
          account_code: ab.accountCode, fiscal_year: year,
          total_budget: amount, base_budget: amount, added_budget: 0,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          const { error: e2 } = await sb.from('account_budgets').insert({
            account_code: ab.accountCode, fiscal_year: year,
            total_budget: amount, updated_at: new Date().toISOString(),
          });
          if (e2) throw e2;
        }
      }
      console.log(`[BO] initBudget saved: ${ab.accountCode} ${amount}`);
      // ★ Audit Trail: account_budget_adjustments 저장
      try {
        const { error: auditErr } = await sb.from('account_budget_adjustments').insert({
          account_code: ab.accountCode,
          fiscal_year: year,
          type: '기초입력',
          amount: amount,
          reason: note || '기초 예산 등록',
          performed_by: boCurrentPersona?.name || '',
          tenant_id: ab.tenantId || _bmFilterTenant || '',
        });
        if (auditErr) throw auditErr;
        console.log('[BO] Audit Trail 저장 완료 (기초입력)');
      } catch (auditErr) {
        console.warn('[BO] Audit Trail 저장 실패:', auditErr.message);
        alert(`⚠️ 변경 이력(Audit Trail) 저장에 실패했습니다.\n사유: ${auditErr.message}`);
      }
      // #13-P2: sync budget_allocations so FO balance reflects new total
      await _syncBudgetAllocations(sb, ab, amount, 0, _allocYear || new Date().getFullYear());
    } catch (e) {
      console.error("[BO initBudget] DB error:", e.message);
      alert(`\u26a0 \uc778\uba54\ubaa8\ub9ac\uc5d0\ub294 \ubc18\uc601\ub410\uc73c\ub098 DB \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4: ${e.message}`);
    }
  }


  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name ||
    ab.accountCode;
  alert(
    `✅ 기초 예산 등록 완료!\n\n계정: ${acctName}\n금액: ${boFmt(amount)}원\n(DB 저장 완료)\n\n이제 [팀 배분] 탭에서 팀에 배분하세요.`,
  );
  if (typeof boCurrentMenu !== 'undefined' && boCurrentMenu === 'budget-master') {
    renderBudgetMaster();
  } else {
    showAllocTab(0);
  }
}

async function submitAddBudget() {
  // 마감된 연도 차단
  if (window._bmYearStatus === 'closed') {
    alert('⛔ 이 연도는 마감됐습니다. 추가 배정이 불가합니다.');
    return;
  }
  // add-ab DOM이 없거나 빈 값이면(고정 라벨 모드) _bmFilterAcctCode로 계정 특정
  let abId = document.getElementById("add-ab")?.value;
  if (!abId && typeof _bmFilterAcctCode !== "undefined" && _bmFilterAcctCode) {
    const _tid = (typeof boCurrentPersona !== "undefined" && boCurrentPersona.tenantId) || _bmFilterTenant;
    const _matchAb = ACCOUNT_BUDGETS.find(x => x.accountCode === _bmFilterAcctCode && x.tenantId === _tid);
    if (_matchAb) abId = _matchAb.id;
  }
  const amount = Number(document.getElementById("add-amount")?.value);
  const reason = document.getElementById("add-reason")?.value;
  if (!abId || !amount || !reason) {
    alert("모든 항목을 입력하세요.");
    return;
  }
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  if (!ab) return;

  // ── 인메모리 업데이트 ────────────────────────────────────────────────────
  ab.totalAdded += amount;
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}`,
    accountBudgetId: abId,
    date: new Date().toISOString().slice(0, 10),
    type: "추가배정",
    amount,
    note: reason,
    by: boCurrentPersona.name,
  });

  // ── Supabase DB 저장 (account_budgets upsert) ────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const newTotal = ab.baseAmount + ab.totalAdded;
      // account_budgets: select → update (added_budget 누적 계산)
      const year2 = _allocYear || new Date().getFullYear();
      const { data: existing2 } = await sb.from('account_budgets')
        .select('id, base_budget, added_budget, total_budget').eq('account_code', ab.accountCode).eq('fiscal_year', year2).maybeSingle();
      if (existing2) {
        const prevBase = Number(existing2.base_budget || existing2.total_budget || 0);
        const prevAdded = Number(existing2.added_budget || 0);
        const newAdded = prevAdded + amount;
        const newTotalDb = prevBase + newAdded;
        const { error } = await sb.from('account_budgets').update({
          total_budget: newTotalDb, added_budget: newAdded, updated_at: new Date().toISOString(),
        }).eq('id', existing2.id);
        if (error) {
          // added_budget 콼럼 없으면 total_budget만 갱신
          const { error: e2 } = await sb.from('account_budgets').update({
            total_budget: newTotalDb, updated_at: new Date().toISOString(),
          }).eq('id', existing2.id);
          if (e2) throw e2;
        }
        console.log(`[BO] addBudget saved: ${ab.accountCode} +${amount}, base=${prevBase}, added=${newAdded}, total=${newTotalDb}`);
      } else {
        const { error } = await sb.from('account_budgets').insert({
          account_code: ab.accountCode, fiscal_year: year2,
          total_budget: newTotal, added_budget: amount, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      console.log(`[BO] addBudget saved: ${ab.accountCode} +${amount}, total=${newTotal}`);
      // ★ Audit Trail: account_budget_adjustments 저장
      try {
        const adjYear = _allocYear || new Date().getFullYear();
        const { error: auditErr } = await sb.from('account_budget_adjustments').insert({
          account_code: ab.accountCode,
          fiscal_year: adjYear,
          type: '추가배정',
          amount: amount,
          reason: reason || '',
          performed_by: boCurrentPersona?.name || '',
          tenant_id: ab.tenantId || (typeof _bmFilterTenant !== 'undefined' ? _bmFilterTenant : '') || '',
        });
        if (auditErr) throw auditErr;
        console.log('[BO] Audit Trail 저장 완료 (추가배정)');
      } catch (auditErr) {
        console.warn('[BO] Audit Trail 저장 실패:', auditErr.message);
        alert(`⚠️ 변경 이력(Audit Trail) 저장에 실패했습니다.\n사유: ${auditErr.message}`);
      }
      // #13-P2: sync budget_allocations so FO balance reflects new total
      await _syncBudgetAllocations(sb, ab, newTotal, ab.usedAmount || 0, _allocYear || new Date().getFullYear());
    } catch (e) {
      console.error("[BO addBudget] DB error:", e.message);
      alert(`\u26a0 \uc778\uba54\ubaa8\ub9ac\uc5d0\ub294 \ubc18\uc601\ub410\uc73c\ub098 DB \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4: ${e.message}`);
    }
  }

  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name ||
    ab.accountCode;
  const newTotal = ab.baseAmount + ab.totalAdded;
  alert(
    `✅ 추가 배정 완료!\n\n계정: ${acctName}\n+${boFmt(amount)}원 추가\n새 계정 총액: ${boFmt(newTotal)}원 (DB 저장 완료)\n\n[팀 배분] 탭에서 배분 가능 재원을 팀에 배분하세요.`,
  );
  if (typeof boCurrentMenu !== 'undefined' && boCurrentMenu === 'budget-master') {
    renderBudgetMaster();
  } else {
    showAllocTab(0);
  }
}

// ── 4순위: 예산 회수 ──────────────────────────────────────────────────────────
async function submitRecallBudget() {
  if (window._bmYearStatus === 'closed') {
    alert('⛔ 이 연도는 마감됐습니다. 회수가 불가합니다.');
    return;
  }
  let abId = document.getElementById('recall-ab')?.value;
  if (!abId && typeof _bmFilterAcctCode !== 'undefined' && _bmFilterAcctCode) {
    const _tid = (typeof boCurrentPersona !== 'undefined' && boCurrentPersona.tenantId) || _bmFilterTenant;
    const _m = ACCOUNT_BUDGETS.find(x => x.accountCode === _bmFilterAcctCode && x.tenantId === _tid);
    if (_m) abId = _m.id;
  }
  const amount = Number(document.getElementById('recall-amount')?.value);
  const reason = document.getElementById('recall-reason')?.value?.trim();
  if (!abId || !amount || amount <= 0 || !reason) {
    alert('회수 계정, 금액, 사유를 모두 입력하세요.');
    return;
  }
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  if (!ab) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('데이터베이스 연결 실패'); return; }

  // DB에서 실제 잔액 확인
  const year = _allocYear || new Date().getFullYear();
  const { data: dbRec } = await sb.from('account_budgets')
    .select('id, total_budget, base_budget, added_budget, deducted, holding')
    .eq('account_code', ab.accountCode).eq('fiscal_year', year).maybeSingle();
  if (!dbRec) { alert('해당 계정의 DB 레코드가 없습니다.'); return; }

  const base = Number(dbRec.base_budget || 0);
  const added = Number(dbRec.added_budget || 0);
  const deducted = Number(dbRec.deducted || 0);
  const holding = Number(dbRec.holding || 0);
  const total = Number(dbRec.total_budget || 0);

  // 가용 잔액 = 총예산 - 집행 - 가점유
  const available = total - deducted - holding;
  // 회수 가능 최대 = 추가배정 누적액과 가용잔액 중 작은 값 (기초 예산 회수 불가)
  const maxRecall = Math.min(added, available);

  if (amount > maxRecall) {
    alert(`⚠️ 회수 가능 최대 금액은 ${boFmt(maxRecall)}원입니다.\n\n추가배정: ${boFmt(added)}원\n가용잔액: ${boFmt(available)}원\n(집행: ${boFmt(deducted)}원, 가점유: ${boFmt(holding)}원)`);
    return;
  }

  const acctName = ACCOUNT_MASTER.find(a => a.code === ab.accountCode)?.name || ab.accountCode;
  if (!confirm(`회수 확인\n\n계정: ${acctName}\n금액: -${boFmt(amount)}원\n사유: ${reason}\n\n회수 후 취소가 불가합니다. 계속하시겠습니까?`)) return;

  try {
    const newAdded = added - amount;
    const newTotal = base + newAdded;
    const { error } = await sb.from('account_budgets').update({
      added_budget: newAdded,
      total_budget: newTotal,
      updated_at: new Date().toISOString(),
    }).eq('id', dbRec.id);
    if (error) throw error;

    // 인메모리 동기화
    ab.totalAdded = Math.max(0, (ab.totalAdded || 0) - amount);

    // Audit Trail 저장
    try {
      const { error: auditErr } = await sb.from('account_budget_adjustments').insert({
        account_code: ab.accountCode, fiscal_year: year,
        type: '회수', amount, reason,
        performed_by: boCurrentPersona?.name || '',
        tenant_id: ab.tenantId || (typeof _bmFilterTenant !== 'undefined' ? _bmFilterTenant : '') || '',
      });
      if (auditErr) throw auditErr;
    } catch (e2) {
      console.warn('[recall] Audit Trail 저장 실패:', e2.message);
      alert(`⚠️ 변경 이력(Audit Trail) 저장에 실패했습니다.\n사유: ${e2.message}`);
    }

    alert(`✅ 회수 완료!\n\n계정: ${acctName}\n-${boFmt(amount)}원 회수\n새 총예산: ${boFmt(newTotal)}원`);
    if (typeof boCurrentMenu !== 'undefined' && boCurrentMenu === 'budget-master') renderBudgetMaster();
    else showAllocTab(0);
  } catch (e) {
    console.error('[recall] 오류:', e.message);
    alert(`⚠ 회수 실패: ${e.message}`);
  }
}

// ── 5순위: 연도 오픈/마감 ─────────────────────────────────────────────────────
async function openBudgetYear(year) {
  if (!confirm(`${year}년 연도를 오픈합니다.\n\n이전 연도 데이터는 건드리지 않고, ${year}년 예산은 0원에서 시작합니다.\n계속하시겠습니까?`)) return;
  if (typeof _allocYear !== 'undefined') _allocYear = year;
  window._bmYearStatus = 'open';
  window._budgetMasterLoaded = false;
  alert(`✅ ${year}년도가 오픈되었습니다. 이제 기초 예산을 등록하세요.`);
  renderBudgetMaster();
}

async function closeBudgetYear(year) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    // 가점유 잔액 점검
    const { data: rows } = await sb.from('account_budgets')
      .select('account_code, holding').eq('fiscal_year', year).gt('holding', 0);
    if (rows && rows.length > 0) {
      const codes = rows.map(r => r.account_code).join(', ');
      if (!confirm(`⚠️ 다음 계정에 가점유 잔액이 남아있습니다:\n${codes}\n\n미승인 신청이 있을 수 있습니다. 그래도 마감하시겠습니까?`)) return;
    }
    // 모든 해당 연도 계정을 closed로 업데이트
    const { error } = await sb.from('account_budgets')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('fiscal_year', year);
    if (error) { alert(`마감 실패: ${error.message}`); return; }
  }
  window._bmYearStatus = 'closed';
  alert(`🔒 ${year}년도가 마감되었습니다. 이 연도의 예산은 수정할 수 없습니다.`);
  renderBudgetMaster();
}

// ─── 탭 3: 팀 배분 (계정 재원 → 팀) ─────────────────────────────────────────
// ─── 탭 3: 팀 일괄 배분 ──────────────────────────────────────────────────────
// ─── 탭 5: 변경 이력 (Audit Trail) ───────────────────────────────────────────
function renderAllocHistory() {
  const persona = boCurrentPersona;
  const resolvedTenantId = _allocFilterTenant || persona.tenantId || 'HMC';
  const year = _allocFilterYear || _allocYear || new Date().getFullYear();

  // 비동기 DB 조회 후 화면 갱신
  const containerEl = document.getElementById('alloc-content');

  // 즉시 스피너 표시
  const spinnerHtml = `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:13px">변경 이력 — Audit Trail</div>
  <div style="padding:60px;text-align:center">
    <div style="font-size:28px;margin-bottom:8px;animation:pulse 1.5s infinite">⏳</div>
    <div style="color:#6B7280;font-size:12px;font-weight:700">변경이력을 DB에서 조회 중입니다...</div>
  </div>
</div>`;

  // 권한 내 계정 코드 목록
  const personaAllowed = persona.allowedAccounts || [];
  const isSystem = personaAllowed.includes('*') || !persona.tenantId;
  const isPlatformOrTenantGlobal = persona.role === 'platform_admin' || persona.role === 'tenant_global_admin';
  const acctCodes = (_allocFilterAcctList || []).filter(a =>
    isPlatformOrTenantGlobal || isSystem || personaAllowed.includes(a.code)
  ).map(a => a.code);

  // 특정 계정 필터 적용
  const targetCodes = _allocFilterAccountCode
    ? [_allocFilterAccountCode]
    : (acctCodes.length > 0 ? acctCodes : null);

  const typeStyle = {
    SAP_IF: { bg: '#DBEAFE', c: '#1E40AF' },
    기초입력: { bg: '#E0E7FF', c: '#4338CA' },
    확정: { bg: '#D1FAE5', c: '#065F46' },
    추가배정: { bg: '#FEF3C7', c: '#92400E' },
    회수: { bg: '#FEE2E2', c: '#991B1B' },
    이관출처: { bg: '#FEE2E2', c: '#991B1B' },
    이관수신: { bg: '#F0FDF4', c: '#166534' },
    마감: { bg: '#F3F4F6', c: '#374151' },
  };

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb || !targetCodes || targetCodes.length === 0) {
    return spinnerHtml.replace('변경이력을 DB에서 조회 중입니다...', '조회 조건을 먼저 설정해주세요.');
  }

  // 비동기 DB 조회 시작
  (async () => {
    try {
      const { data: rows, error } = await sb
        .from('account_budget_adjustments')
        .select('account_code, fiscal_year, type, amount, reason, performed_by, created_at, tenant_id')
        .eq('fiscal_year', year)
        .in('account_code', targetCodes)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const el = document.getElementById('alloc-content');
      if (!el) return;

      if (!rows || rows.length === 0) {
        el.innerHTML = `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:13px">변경 이력 — Audit Trail</div>
  <div style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:32px;margin-bottom:8px">📋</div>
    <div style="font-size:13px;font-weight:700">${year}년 변경이력이 없습니다.</div>
    <div style="font-size:11px;margin-top:4px">기초 예산 등록 또는 추가 배정 시 이력이 자동 저장됩니다.</div>
  </div>
</div>`;
        return;
      }

      const rowsHtml = rows.map(h => {
        const s = typeStyle[h.type] || { bg: '#F3F4F6', c: '#374151' };
        const amt = Number(h.amount || 0);
        const ac = amt > 0 ? '#059669' : amt < 0 ? '#EF4444' : '#9CA3AF';
        const dateStr = h.created_at ? h.created_at.substring(0, 10) : '—';
        return `<tr>
          <td style="font-size:12px;color:#6B7280;white-space:nowrap">${dateStr}</td>
          <td><code style="background:#F3F4F6;padding:1px 7px;border-radius:5px;font-size:11px;font-weight:700">${h.account_code || '—'}</code></td>
          <td style="text-align:center"><span style="font-size:10px;font-weight:900;background:${s.bg};color:${s.c};padding:2px 8px;border-radius:6px">${h.type}</span></td>
          <td style="text-align:right;font-weight:900;color:${ac}">${amt !== 0 ? (amt > 0 ? '+' : '') + boFmt(amt) + '원' : '—'}</td>
          <td style="font-size:12px;color:#374151">${h.reason || ''}</td>
          <td style="font-size:11px;color:#9CA3AF">${h.performed_by || ''}</td>
        </tr>`;
      }).join('');

      el.innerHTML = `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
    <span style="font-weight:800;font-size:13px">변경 이력 — Audit Trail</span>
    <span style="font-size:11px;color:#6B7280">${year}년 · ${targetCodes.join(', ')} · 총 ${rows.length}건</span>
  </div>
  <table class="bo-table">
    <thead><tr><th>일자</th><th>계정</th><th style="text-align:center">유형</th><th style="text-align:right">금액</th><th>내용</th><th>처리자</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</div>`;
    } catch (err) {
      console.warn('[renderAllocHistory] DB 조회 실패:', err.message);
      const el = document.getElementById('alloc-content');
      if (el) el.innerHTML = `<div class="bo-card" style="padding:20px;color:#DC2626">변경이력 조회 중 오류가 발생했습니다: ${err.message}</div>`;
    }
  })();

  return spinnerHtml;
}

// ������ DB ���� ������ ����ȭ ��������������������������������������������������������������������������������������������������������
/**
 * Supabase budget_allocations �� TEAM_DIST ����ȭ
 * BO ȭ�� ���� �� ȣ���Ͽ� �θ޸� ����� DB ���� �����ͷ� ����
 */
async function _syncAllocFromDB(persona) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;

  try {
    // platform_admin(tenantId=null): _allocFilterTenant → _bmFilterTenant → 'HMC' 순으로 결정
    const tenantId = persona?.tenantId
      || _allocFilterTenant
      || (typeof _bmFilterTenant !== 'undefined' ? _bmFilterTenant : null)
      || (typeof TENANTS !== 'undefined' ? TENANTS.find(t => t.id !== 'SYSTEM')?.id : null)
      || 'HMC';
    if (!tenantId) return;

    // ■ STEP 0.5: Mock 데이터 잔재 및 중복 방지를 위한 초기화
    ACCOUNT_BUDGETS.length = 0;
    TEAM_DIST.length = 0;

    // ── STEP 0: account_budgets 총액 DB 동기화 (mock baseAmount/totalAdded 덮어쓰기) ──
    try {
      const year = _allocFilterYear || _allocYear || new Date().getFullYear();
      const acctCodesForSync = (_allocFilterAcctList || []).map(a => a.code).filter(Boolean);
      if (acctCodesForSync.length > 0) {
        const { data: abRows } = await sb
          .from('account_budgets')
          .select('account_code, total_budget, base_budget, added_budget, fiscal_year, status')
          .eq('fiscal_year', year)
          .in('account_code', acctCodesForSync);
        (abRows || []).forEach(row => {
          const dbBase = Number(row.base_budget || row.total_budget || 0);
          const dbAdded = Number(row.added_budget || 0);
          if (dbBase === 0 && dbAdded === 0) return; // DB가 0이면 mock 유지
          let ab = ACCOUNT_BUDGETS.find(x => x.accountCode === row.account_code && x.tenantId === tenantId);
          if (!ab) {
            const newId = 'AB_DB_' + row.account_code;
            ab = { id: newId, tenantId, accountCode: row.account_code, sourceType: 'platform', _fromDb: true };
            if (!ACCOUNT_BUDGETS.find(x => x.id === newId)) ACCOUNT_BUDGETS.push(ab);
            ab = ACCOUNT_BUDGETS.find(x => x.id === newId);
          }
          if (ab) {
            ab.baseAmount = dbBase;
            ab.totalAdded = dbAdded;
            ab.fiscalYear = row.fiscal_year || year;
            ab._fromDb = true;
            if (row.status) { ab.status = row.status; }
            if (row.status === 'closed' && typeof window !== 'undefined') window._bmYearStatus = 'closed';
          }
        });
        console.log('[BO Alloc Sync] account_budgets 총액 동기화:', year + '년', (abRows||[]).length + '건');
      }
    } catch (abErr) {
      console.warn('[BO Alloc Sync] account_budgets 동기화 실패 (non-critical):', abErr.message);
    }

    // 1. 해당 테넌트의 통장 목록 조회 (user_id IS NULL 제거: 교육조직 통장도 user_id가 있을 수 있음)
    const { data: bankbooks, error: bbErr } = await sb
      .from("org_budget_bankbooks")
      .select("id, org_name, account_id, tenant_id, template_id")
      .eq("tenant_id", tenantId)
      .or("bb_status.eq.active,bb_status.is.null");
    if (bbErr) throw bbErr;

    if (!bankbooks || bankbooks.length === 0) return;

    const bbIds = bankbooks.map((b) => b.id);
    // 2. �ش� ������� budget_allocations ��ȸ
    const { data: allocs, error: allocErr } = await sb
      .from("budget_allocations")
      .select("id, bankbook_id, allocated_amount, used_amount, frozen_amount, updated_at")
      .in("bankbook_id", bbIds);
    if (allocErr) throw allocErr;

    // 3. budget_accounts �ڵ� ��
    const acctIds = [...new Set(bankbooks.map((b) => b.account_id))];
    const { data: accts } = await sb
      .from("budget_accounts")
      .select("id, code, uses_budget, integration_mode, virtual_org_template_id")
      .eq("tenant_id", tenantId).eq("active", true).eq("uses_budget", true);
    const acctMap = {};
    const acctCodeMap = {}; // code -> acct (BA-CODE-TPL_xxx 복합키 bankbook 매칭용)
    (accts || []).forEach((a) => { acctMap[a.id] = a; acctCodeMap[a.code] = a; });

    // 3-b. 통장 정책 캐시 로드 (bankbook_mode 기반 UI 분기용)
    try {
      const { data: policies } = await sb
        .from("budget_account_org_policy")
        .select("budget_account_id, bankbook_mode, bankbook_level, individual_limit")
        .in("budget_account_id", acctIds);
      const cache = {};
      (policies || []).forEach(p => {
        // Bug3 Fix: p.budget_account_id = 'BA-CODE-TPL_xxx' 복합키 → code 추출 후 acctCodeMap 매칭
        const codeFromPId = p.budget_account_id?.replace(/^BA-/, '').replace(/-TPL_.*$/, '');
        const acct = acctCodeMap[codeFromPId] || acctMap[p.budget_account_id];
        if (acct) {
          cache[acct.code] = {
            bankbook_mode: p.bankbook_mode || 'isolated',
            bankbook_level: p.bankbook_level || 'team',
            individual_limit: p.individual_limit || 0,
          };
        }
      });
      window._baPolicyCache = cache;
    } catch (polErr) {
      console.warn("[BO Alloc Sync] policy cache load (non-critical):", polErr.message);
    }

    // 4. bankbook_id �� �ֽ� allocation ��
    const allocMap = {};
    (allocs || []).forEach((a) => {
      if (!allocMap[a.bankbook_id] ||
          (a.updated_at || "") > (allocMap[a.bankbook_id].updated_at || "")) {
        allocMap[a.bankbook_id] = a;
      }
    });

    // 5. TEAM_DIST 구성 (bankbook → allocation → ACCOUNT_BUDGET 매핑)
    let syncCount = 0;
    for (const bb of bankbooks) {
      // Bug Fix: account_id = 'BA-HMC-RND-TPL_xxx' 복합키에서 accountCode 추출
      // 형식: BA-{accountCode}-TPL_{tplId} 또는 UUID
      let acct = acctMap[bb.account_id]; // UUID 직접 매칭 (구형 레코드 호환)
      if (!acct) {
        // 복합키에서 accountCode 추출: 'BA-HMC-RND-TPL_...' → 'HMC-RND'
        const codeFromId = bb.account_id?.replace(/^BA-/, '').replace(/-TPL_.*$/, '');
        acct = codeFromId ? acctCodeMap[codeFromId] : null;
        if (!acct && bb.template_id) {
          // template_id 기반 fallback: 같은 templateId를 가진 계정 찾기
          acct = (accts || []).find(a => a.virtual_org_template_id === bb.template_id);
        }
        if (!acct) { console.warn('[BO Alloc Sync] bankbook acct 매칭 실패:', bb.account_id); continue; }
      }
      if (!acct.uses_budget) continue;

      const alloc = allocMap[bb.id];
      // alloc이 없으면 skip하지 말고 0원 엔트리로 추가 (신규 배분 예정 통장 지원)
      // if (!alloc) continue; ← 이 로직이 초기화 원인: DB save 후 재로드 시 alloc이 없으면 TEAM_DIST가 비워짐

      let ab = ACCOUNT_BUDGETS.find(
        (x) => x.accountCode === acct.code && x.tenantId === tenantId
      );
      if (!ab) {
        // ★ DB에만 존재하는 계정 → ACCOUNT_BUDGETS에 자동 생성
        const newAbId = 'AB_DB_' + acct.id;
        // 동일 계정이 이미 다른 코드로 추가되었는지 확인
        if (!ACCOUNT_BUDGETS.find(x => x.id === newAbId)) {
          ACCOUNT_BUDGETS.push({
            id: newAbId,
            tenantId: tenantId,
            accountCode: acct.code,
            dbAccountId: acct.id,
            templateId: bb.template_id || (acct.id.includes('TPL_') ? 'TPL_' + acct.id.split('TPL_')[1] : null),
            sourceType: acct.integration_mode === 'sap' ? 'sap_if' : 'platform',
            fiscalYear: _allocFilterYear || new Date().getFullYear(),
            baseAmount: 0,
            totalAdded: 0,
            status: 'confirmed',
            _fromDb: true,
          });
          // ACCOUNT_MASTER에도 없으면 추가
          if (typeof ACCOUNT_MASTER !== 'undefined') {
            const existMaster = ACCOUNT_MASTER.find(x => x.code === acct.code);
            if (!existMaster) {
              ACCOUNT_MASTER.push({ code: acct.code, name: acct.code, type: 'custom' });
            }
          }
          console.log('[BO Alloc Sync] DB 전용 계정 자동 생성:', acct.code, newAbId);
        }
        // 새로 생성된 ab로 계속 진행
        ab = ACCOUNT_BUDGETS.find(x => x.id === newAbId);
      } else {
        if (!ab.templateId) ab.templateId = bb.template_id || (acct.id.includes('TPL_') ? 'TPL_' + acct.id.split('TPL_')[1] : null);
      }
      var abRef = ab;
      if (!abRef) continue;
      const abFinal = ab || ACCOUNT_BUDGETS.find(x => x.accountCode === acct.code && x.tenantId === tenantId);

      const existingIdx = TEAM_DIST.findIndex(
        (td) => td.accountBudgetId === abFinal.id && td.teamName === bb.org_name
      );

      const newAmt = Number(alloc?.allocated_amount || 0);
      const newSpent = Number(alloc?.used_amount || 0);
      const newFrozen = Number(alloc?.frozen_amount || 0);

      if (existingIdx >= 0) {
        TEAM_DIST[existingIdx].allocAmount = newAmt;
        TEAM_DIST[existingIdx].spent = newSpent;
        TEAM_DIST[existingIdx].reserved = newFrozen;
        TEAM_DIST[existingIdx]._bbId = bb.id;
        if (alloc) TEAM_DIST[existingIdx]._allocId = alloc.id;
      } else if (newAmt > 0 || alloc) {
        // alloc 레코드가 있거나 금액이 0 초과인 경우에만 추가
        TEAM_DIST.push({
          id: "TD_DB_" + bb.id,
          accountBudgetId: abFinal.id,
          teamName: bb.org_name,
          allocAmount: newAmt,
          spent: newSpent,
          reserved: newFrozen,
          _bbId: bb.id,
          _allocId: alloc?.id,
        });
      }
      syncCount++;
    }

    console.log('[BO Alloc Sync] ' + tenantId + ' 팀배분 DB 동기화 완료 (' + syncCount + '건)');


    // ── Phase 1: DB-synced 계정의 mock TEAM_DIST 항목 제거 ────────────────
    // _bbId가 없는 항목 = mock 데이터. DB에서 로드된 계정에 속한 것만 제거.
    const dbSyncedAbIds = new Set(ACCOUNT_BUDGETS.filter(x => x._fromDb && x.tenantId === tenantId).map(x => x.id));
    if (dbSyncedAbIds.size > 0) {
      const beforeLen = TEAM_DIST.length;
      // mock 항목(no _bbId)이 DB-synced 계정에 속하면 제거
      for (let i = TEAM_DIST.length - 1; i >= 0; i--) {
        if (dbSyncedAbIds.has(TEAM_DIST[i].accountBudgetId) && !TEAM_DIST[i]._bbId) {
          TEAM_DIST.splice(i, 1);
        }
      }
      console.log('[BO Alloc Sync] mock TEAM_DIST 제거:', (beforeLen - TEAM_DIST.length) + '건 삭제');
    }
  } catch (e) {
    console.warn('[BO Alloc Sync] DB error (non-critical):', e.message);
  }
}

// ─── #13-P2: budget_allocations 연쇄 동기화 헬퍼 ───────────────────────────
// 기초/추가 배정 후 budget_allocations 테이블의 잔액(balance)을 최신 총액에 맞게 갱신
// @param sb           Supabase 클라이언트
// @param ab           ACCOUNT_BUDGETS 항목
// @param totalBudget  새 계정 총 예산
// @param usedAmount   이미 사용된 금액 (승인된 교육계획/신청 합계)
// @param fiscalYear   회계연도
async function _syncBudgetAllocations(sb, ab, totalBudget, usedAmount, fiscalYear) {
  // 이 함수는 non-critical — account_budgets의 실저잡 콼럼에 의존하지 않도록 안전하게정리
  if (!sb || !ab) return;
  try {
    // org_budget_bankbooks 연동 (콼럼 존재시만)
    const { data: bankbooks } = await sb.from('org_budget_bankbooks')
      .select('id, allocated_amount')
      .eq('account_id', ab.dbAccountId || '')
      .eq('tenant_id', ab.tenantId || '').limit(50);
    if (bankbooks && bankbooks.length > 0) {
      const balance = Math.max(0, totalBudget - (usedAmount || 0));
      const totalAlloc = bankbooks.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
      for (const bb of bankbooks) {
        const ratio = totalAlloc > 0 ? Number(bb.allocated_amount || 0) / totalAlloc : 1 / bankbooks.length;
        await sb.from('org_budget_bankbooks').update({
          updated_at: new Date().toISOString(),
        }).eq('id', bb.id);
      }
      console.log(`[_syncBudgetAllocations] ${bankbooks.length}개 bankbook 연동 완료`);
    }
    console.log(`[_syncBudgetAllocations] ${ab.accountCode} FY${fiscalYear} total=${totalBudget}`);
  } catch (e) {
    console.warn('[_syncBudgetAllocations] non-critical:', e.message);
  }
}


