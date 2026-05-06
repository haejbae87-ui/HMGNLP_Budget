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
      // ★ DB integration_mode 변경 시 인메모리 sourceType도 동기화
      if (existsInMemory) {
        const newSrcType = dbAcct.integration_mode === 'sap' ? 'sap_if' : 'platform';
        if (existsInMemory.sourceType !== newSrcType) {
          console.log('[_allocLoadFilterData] sourceType 동기화:', dbAcct.code, existsInMemory.sourceType, '->', newSrcType);
          existsInMemory.sourceType = newSrcType;
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

  // 예산계정 셀렉트 (선택된 VOrg에 속한 계정만)
  const filteredAccts = _allocFilterTplId
    ? _allocFilterAcctList.filter(a => a.virtual_org_template_id === _allocFilterTplId)
    : _allocFilterAcctList;
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

  const allBudgets = (() => {
    const raw = getPersonaAccountBudgets(persona);
    // platform_admin (tenantId=null): 필터 테넌트로 범위 결정
    if (!persona.tenantId) {
      // _allocFilterTenant 우선, 없으면 _bmFilterTenant, 없으면 _allocFilterAcctList에서 첫 번째 테넌트, 없으면 'HMC'
      const tid = _allocFilterTenant
        || (typeof _bmFilterTenant !== 'undefined' ? _bmFilterTenant : null)
        || (typeof TENANTS !== 'undefined' ? TENANTS.find(t => t.id !== 'SYSTEM')?.id : null)
        || 'HMC';
      const filtered = raw.filter(ab => ab.tenantId === tid);
      // platform_admin인데 ACCOUNT_BUDGETS에 해당 테넌트 데이터가 없으면 전체 반환 (강제 로드 후 재필터)
      if (filtered.length === 0 && raw.length > 0) {
        console.log('[renderAllocOverview] platform_admin: tenant filter yielded empty, returning all raw:', raw.length, 'tid:', tid);
        return raw;
      }
      return filtered;
    }
    return raw;
  })();
  const availableYears = [
    ...new Set(allBudgets.map((ab) => ab.fiscalYear || 2026)),
  ].sort((a, b) => b - a);
  let myBudgets = allBudgets.filter(
    (ab) => (ab.fiscalYear || 2026) === _allocYear,
  );

  // ── 디버그 로그 (문제 진단용) ──
  console.log('[renderAllocOverview] ACCOUNT_BUDGETS:', ACCOUNT_BUDGETS.length,
    'allBudgets:', allBudgets.length, 'myBudgets:', myBudgets.length,
    'filter:', _allocFilterAccountCode, 'tenant:', _allocFilterTenant, 'year:', _allocYear);

  // ── 필터 계정 코드 매칭 (단순화) ──────────────────────────────────────────
  if (_allocFilterAccountCode && myBudgets.length > 0) {
    // 직접 매칭 (DB code == memory accountCode)
    const match = myBudgets.find(ab => ab.accountCode === _allocFilterAccountCode)
      // 부분 매칭
      || myBudgets.find(ab => (ab.accountCode || '').includes(_allocFilterAccountCode) || _allocFilterAccountCode.includes(ab.accountCode || ''))
      // DB id 매칭
      || (() => { const da = _allocFilterAcctList.find(a => a.code === _allocFilterAccountCode); return da ? myBudgets.find(ab => ab.dbAccountId === da.id) : null; })()
      // 계정명 매칭
      || (() => {
           if (!_allocFilterAccountName) return null;
           return myBudgets.find(ab => {
             const mn = (typeof ACCOUNT_MASTER !== 'undefined' ? ACCOUNT_MASTER : []).find(x => x.code === ab.accountCode)?.name || '';
             return mn && (mn.includes(_allocFilterAccountName) || _allocFilterAccountName.includes(mn));
           });
         })();
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

  <!-- 소진율 모니터링 패널 -->
  ${myBudgets.length > 0 ? `
  <div style="margin-bottom:14px">
    <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px">
      🔥 소진율 모니터링 <span style="font-size:10px;font-weight:500;color:#9CA3AF">(집행+가점유 / 총 배정)</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${burnRateCards}</div>
  </div>` : ''}

  <!-- 계정 선택 카드 패널 -->
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
        padding:10px 14px;border-radius:10px;cursor:pointer;
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
  const tpl = VIRTUAL_EDU_ORGS.find(
    (t) => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs),
  );
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];
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
    ? '<input type="hidden" id="add-ab" value="' + _fixedAbId + '"/><div style="padding:10px 14px;border-radius:10px;border:1.5px solid #BFDBFE;background:#EFF6FF;font-size:13px;font-weight:800;color:#1D4ED8;display:flex;align-items:center;gap:8px"><span style="font-size:16px">💳</span> ' + _filterAcctName + '<span style="font-size:10px;color:#60A5FA;font-weight:600;margin-left:auto">상단 필터에서 선택됨</span></div>' : null;

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
      const { error } = await sb.from("account_budgets").upsert({
        account_code: ab.accountCode,
        fiscal_year: _allocYear || new Date().getFullYear(),
        total_budget: amount,
        deducted: 0,
        holding: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_code,fiscal_year' });
      if (error) throw error;
      console.log(`[BO] initBudget saved: ${ab.accountCode} ${amount}`);
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
      const { error } = await sb.from("account_budgets").upsert({
        account_code: ab.accountCode,
        fiscal_year: _allocYear || new Date().getFullYear(),
        total_budget: newTotal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_code,fiscal_year' });
      if (error) throw error;
      console.log(`[BO] addBudget saved: ${ab.accountCode} +${amount}, total=${newTotal}`);
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

// ─── 탭 3: 팀 배분 (계정 재원 → 팀) ─────────────────────────────────────────
// ─── 탭 3: 팀 일괄 배분 ──────────────────────────────────────────────────────
let _distAbId = null;

function renderTeamDist() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  const canDist =
    isOwner || (isVorgManager(persona));
  if (!canDist)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">팀 배분은 계정 오너 또는 본부/센터 담당자만 가능합니다</div></div>`;

  // vorg manager 안내 배너
  const vmBanner =
    !isOwner && isVorgManager(persona)
      ? `<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:12px;font-size:12px;color:#92400E;font-weight:600">
        👤 <b>${persona.scope}</b> 담당자 — 관할 조직(${getPersonaManagedVorg(persona)?.name || persona.scope})의 하위 팀에만 배분 가능합니다.
       </div>`
      : "";

  const myBudgets = getPersonaAccountBudgets(persona);
  if (!_distAbId) _distAbId = myBudgets[0]?.id || null;
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === _distAbId);
  const distributable = ab ? getDistributable(ab) : 0;

  // ── 통장 정책(bankbook_mode) 조회 ─────────────────────────────────────
  // window._baPolicyCache: {accountCode: {bankbook_mode, bankbook_level, individual_limit}}
  const policyCache = window._baPolicyCache || {};
  const bbPolicy = policyCache[ab?.accountCode] || {};
  const bbMode = bbPolicy.bankbook_mode || 'isolated';
  const bbLevel = bbPolicy.bankbook_level || 'team';
  const individualLimit = bbPolicy.individual_limit || 0;

  // 정책별 뱃지 + 색상
  const modeBadgeMap = {
    isolated: { label: '🔒 팀격리', bg: '#DBEAFE', color: '#1D4ED8', desc: '교육조직→팀 단위로 예산이 격리 배분됩니다' },
    shared:   { label: '🤝 조직공유', bg: '#D1FAE5', color: '#065F46', desc: '교육조직 단위로 예산을 공유하며, 팀 배분 없이 사용합니다' },
    individual: { label: '👤 개인별', bg: '#FEF3C7', color: '#92400E', desc: '개인별 한도가 설정되며, 팀 내 개인 단위로 예산이 관리됩니다' },
  };
  const modeBadge = modeBadgeMap[bbMode] || modeBadgeMap.isolated;

  const acctSelectHtml = `
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
  ${myBudgets
    .map((b) => {
      const a = ACCOUNT_MASTER.find((x) => x.code === b.accountCode);
      const isSel = b.id === _distAbId;
      const d = getDistributable(b);
      const bPolicy = policyCache[b.accountCode] || {};
      const bMode = bPolicy.bankbook_mode || 'isolated';
      const bBadge = modeBadgeMap[bMode] || modeBadgeMap.isolated;
      return `<button onclick="selectDistAb('${b.id}')" style="padding:8px 14px;border-radius:10px;cursor:pointer;border:2px solid ${isSel ? "#059669" : "#E5E7EB"};background:${isSel ? "#F0FDF4" : "white"};font-weight:700;font-size:11px">
      <div style="display:flex;align-items:center;gap:4px">
        <span style="color:${isSel ? "#059669" : "#374151"}">${a?.name || b.accountCode}</span>
        <span style="font-size:8px;padding:1px 5px;border-radius:3px;background:${bBadge.bg};color:${bBadge.color};font-weight:800">${bBadge.label}</span>
      </div>
      <div style="font-size:10px;color:${d > 0 ? "#059669" : "#9CA3AF"};margin-top:2px">${d > 0 ? "📦 " + boFmt(d) + "원" : "완전 배분"}</div>
    </button>`;
    })
    .join("")}
</div>`;

  if (!ab)
    return (
      acctSelectHtml +
      `<div style="padding:30px;text-align:center;color:#9CA3AF">계정을 선택하세요.</div>`
    );

  // ── 통장 정책 안내 배너 ────────────────────────────────────────────────
  const policyBanner = `
  <div style="padding:10px 16px;background:${modeBadge.bg}22;border:1.5px solid ${modeBadge.bg};border-radius:10px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">${modeBadge.label.split(' ')[0]}</span>
    <div>
      <div style="font-size:12px;font-weight:800;color:${modeBadge.color}">통장 정책: ${modeBadge.label}</div>
      <div style="font-size:11px;color:#6B7280">${modeBadge.desc}</div>
    </div>
  </div>`;

  // ── shared 모드: 교육조직 단위 배분만 (팀 배분 UI 숨김) ──────────────
  if (bbMode === 'shared') {
    return `
    <div style="max-width:800px">
      ${vmBanner}
      ${policyBanner}
      ${acctSelectHtml}
      <div style="padding:12px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;margin-bottom:16px">
        <div style="font-size:10px;color:#6B7280">배분 가능 재원</div>
        <div style="font-weight:900;font-size:18px;color:#1D4ED8">${boFmt(distributable)}원</div>
      </div>
      <div class="bo-card" style="padding:24px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">🤝</div>
        <div style="font-weight:800;font-size:14px;color:#065F46;margin-bottom:6px">조직 공유 모드</div>
        <div style="font-size:12px;color:#6B7280;line-height:1.6">
          이 계정은 <b>교육조직 단위 공유</b> 정책이 적용됩니다.<br>
          팀별 배분 없이 교육조직 전체가 예산을 공유하여 사용합니다.<br>
          개별 팀 배분이 필요한 경우, 예산계정 관리에서 정책을 <b>팀격리(isolated)</b>로 변경하세요.
        </div>
      </div>
    </div>`;
  }

  // ── individual 모드: 개인 한도 설정 UI ─────────────────────────────────
  if (bbMode === 'individual') {
    return `
    <div style="max-width:800px">
      ${vmBanner}
      ${policyBanner}
      ${acctSelectHtml}
      <div style="padding:12px 16px;background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:10px;margin-bottom:16px">
        <div style="font-size:10px;color:#6B7280">배분 가능 재원</div>
        <div style="font-weight:900;font-size:18px;color:#92400E">${boFmt(distributable)}원</div>
        <div style="font-size:11px;color:#92400E;margin-top:4px">개인별 한도: <b>${individualLimit > 0 ? boFmt(individualLimit) + '원/인' : '미설정'}</b></div>
      </div>
      <div class="bo-card" style="padding:24px;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">👤</div>
        <div style="font-weight:800;font-size:14px;color:#92400E;margin-bottom:6px">개인별 한도 모드</div>
        <div style="font-size:12px;color:#6B7280;line-height:1.6">
          이 계정은 <b>개인별 한도</b> 정책이 적용됩니다.<br>
          팀 배분 대신 개인당 사용 가능 금액이 제한됩니다.<br>
          개인별 한도는 예산계정 관리에서 설정할 수 있습니다.
        </div>
        ${individualLimit > 0 ? `<div style="margin-top:12px;padding:8px 16px;background:#FEF3C7;border-radius:8px;display:inline-block">
          <span style="font-size:11px;color:#92400E;font-weight:700">현재 설정: </span>
          <span style="font-size:14px;font-weight:900;color:#92400E">${boFmt(individualLimit)}원/인</span>
        </div>` : ''}
      </div>
    </div>`;
  }

  // ── isolated 모드 (기본): 교육조직→팀 배분 그리드 ─────────────────────
  const isRnd = ab.accountCode.includes("RND");
  const tpl = VIRTUAL_EDU_ORGS.find(
    (t) => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs),
  );
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];

  // 배분 테이블 행 (교육조직 헤더 + 실제팀 입력행)
  let tableRows = "";
  let inputIdx = 0;
  const allTeams = []; // {vgName, teamName, inputId, existing, currentAlloc}

  // vorg manager이면 자신의 VOrg만 표시
  const _isVorgMgr =
    isVorgManager(ab._persona || boCurrentPersona);
  const _myVorgId = _isVorgMgr ? boCurrentPersona.managedVorgId : null;
  const _filteredGroups = _myVorgId
    ? vGroups.filter((vg) => vg.id === _myVorgId)
    : vGroups;
  _filteredGroups.forEach((vg) => {
    tableRows += `<tr style="background:#F1F5F9;border-top:2px solid #CBD5E1">
      <td style="padding:9px 14px" colspan="2">
        <div style="display:flex;align-items:center;gap:6px">
          <span>${isRnd ? "🔬" : "🏢"}</span>
          <span style="font-weight:900;font-size:12px">${vg.name}</span>
          <span style="font-size:10px;color:#64748B">교육조직</span>
        </div>
      </td>
      <td colspan="2"></td>
    </tr>`;
    vg.teams.forEach((rt) => {
      const inputId = `dist-input-${inputIdx++}`;
      const existing = TEAM_DIST.find(
        (t) => t.accountBudgetId === ab.id && t.teamName === rt.name,
      );
      allTeams.push({
        vgName: vg.name,
        teamName: rt.name,
        inputId,
        existing,
        currentAlloc: existing?.allocAmount || 0,
      });
      tableRows += `<tr>
        <td style="padding:8px 14px 8px 32px">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="color:#CBD5E1;font-size:11px">└─</span>
            <span style="font-size:12px;font-weight:700">${rt.name}</span>
          </div>
        </td>
        <td style="text-align:right;font-size:11px;color:#6B7280">${existing ? "현재 " + boFmt(existing.allocAmount) + "원" : "미배분"}</td>
        <td style="padding:6px 10px">
          <div style="position:relative">
            <input type="number" id="${inputId}" placeholder="0" oninput="calcDistRemain()"
              style="width:130px;border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 36px 7px 10px;font-size:13px;font-weight:700;text-align:right"/>
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF">원</span>
          </div>
        </td>
        <td style="font-size:11px;color:#059669;font-weight:600;white-space:nowrap" id="${inputId}-preview"></td>
      </tr>`;
    });
  });

  return `
<div style="max-width:800px">
  ${vmBanner}
  ${policyBanner}
  <div style="padding:10px 16px;background:#EDE9FE;border:1px solid #C4B5FD;border-radius:10px;margin-bottom:16px;font-size:12px;color:#5B21B6;font-weight:600">
    📋 <b>일괄 배분</b> — 계정의 배분 가능 재원을 팀에 한 번에 나눠줍니다.
  </div>
  ${acctSelectHtml}
  <!-- 배분 가능 재원 표시 -->
  <div id="dist-remain-bar" style="padding:12px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
    <div><div style="font-size:10px;color:#6B7280">배분 가능 재원</div><div style="font-weight:900;font-size:18px;color:#1D4ED8">${boFmt(distributable)}원</div></div>
    <div style="color:#9CA3AF;font-size:18px;font-weight:300">−</div>
    <div><div style="font-size:10px;color:#6B7280">입력 합계</div><div id="dist-input-total" style="font-weight:900;font-size:18px;color:#374151">0원</div></div>
    <div style="color:#9CA3AF;font-size:18px;font-weight:300">=</div>
    <div id="dist-remain-box" style="background:#D1FAE5;padding:6px 14px;border-radius:10px;border:2px solid #6EE7B7">
      <div style="font-size:10px;color:#059669">배분 후 잔액</div>
      <div id="dist-remain-val" style="font-weight:900;font-size:18px;color:#059669">${boFmt(distributable)}원</div>
    </div>
  </div>
  <!-- 일괄 배분 테이블 -->
  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <table class="bo-table">
      <thead><tr>
        <th>팀</th><th style="text-align:right">현재 배분</th>
        <th style="text-align:right">추가 배분 금액 입력</th><th>적용 후</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:12px">
    ⚠️ 배분 확정 후 취소 불가 · 입력 금액의 합계가 배분 가능 재원을 초과할 수 없습니다
  </div>
  <button onclick="submitBulkDist()" class="bo-btn-primary" style="width:100%;padding:14px;font-size:14px">✅ 일괄 배분 확정</button>
</div>
<script>
(function(){
  // allTeams 데이터를 window에 저장
  window._distAllTeams = ${JSON.stringify(allTeams)};
  window._distAbId = '${ab.id}';
  window._distMaxAmount = ${distributable};
})();
</script>`;
}

function selectDistAb(abId) {
  _distAbId = abId;
  document.getElementById("alloc-content").innerHTML = renderTeamDist();
}

function calcDistRemain() {
  const teams = window._distAllTeams || [];
  let total = 0;
  teams.forEach((t) => {
    total += Number(document.getElementById(t.inputId)?.value || 0);
  });
  const remain = (window._distMaxAmount || 0) - total;
  const el = document.getElementById("dist-input-total");
  const rv = document.getElementById("dist-remain-val");
  const rb = document.getElementById("dist-remain-box");
  if (el) el.textContent = boFmt(total) + "원";
  if (rv) {
    rv.textContent = boFmt(remain) + "원";
    rv.style.color = remain < 0 ? "#EF4444" : "#059669";
  }
  if (rb) {
    rb.style.background = remain < 0 ? "#FEE2E2" : "#D1FAE5";
    rb.style.borderColor = remain < 0 ? "#FCA5A5" : "#6EE7B7";
  }
  // 개별 팀 미리보기
  teams.forEach((t) => {
    const v = Number(document.getElementById(t.inputId)?.value || 0);
    const pv = document.getElementById(t.inputId + "-preview");
    if (pv)
      pv.textContent =
        v > 0 ? "→ " + boFmt((t.currentAlloc || 0) + v) + "원" : "";
  });
}

async function submitBulkDist() {
  const teams = window._distAllTeams || [];
  const abId = window._distAbId;
  const maxAmt = window._distMaxAmount || 0;
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  let total = 0;
  teams.forEach((t) => {
    total += Number(document.getElementById(t.inputId)?.value || 0);
  });
  if (total === 0) {
    alert("배분 금액을 1개 이상 입력하세요.");
    return;
  }
  if (total > maxAmt) {
    alert(
      `입력 합계(${boFmt(total)}원)가 배분 가능 재원(${boFmt(maxAmt)}원)을 초과합니다.`,
    );
    return;
  }

  // ── Supabase DB 저장 ────────────────────────────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  const lines = [];
  const errors = [];

  if (sb && ab) {
    try {
      // 1. 해당 계정의 org_budget_bankbooks 조회 (팀명 → bankbook_id 매핑)
      const { data: bankbooks, error: bbErr } = await sb
        .from("org_budget_bankbooks")
        .select("id, org_id, org_name, account_id")
        .eq("tenant_id", ab.tenantId)
        .or("bb_status.eq.active,bb_status.is.null");
      if (bbErr) throw bbErr;

      // 2. budget_accounts에서 accountCode → DB id 조회
      const { data: accts } = await sb
        .from("budget_accounts")
        .select("id, code")
        .eq("code", ab.accountCode)
        .eq("tenant_id", ab.tenantId)
        .eq("active", true)
        .limit(1);
      const dbAccountId = accts?.[0]?.id;

      // 3. 각 팀 배분 처리
      for (const t of teams) {
        const v = Number(document.getElementById(t.inputId)?.value || 0);
        if (v <= 0) continue;

        // bankbook 매칭: 팀명 + 계정ID
        const bb = (bankbooks || []).find(
          (b) =>
            (b.org_name === t.teamName ||
              b.org_name.includes(t.teamName) ||
              t.teamName.includes(b.org_name)) &&
            (dbAccountId ? b.account_id === dbAccountId : true),
        );

        if (!bb) {
          errors.push(t.teamName);
          // 인메모리는 그래도 업데이트 (화면 표시 유지)
          const ex = TEAM_DIST.find(
            (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
          );
          if (ex) ex.allocAmount += v;
          else
            TEAM_DIST.push({
              id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`,
              accountBudgetId: abId,
              teamName: t.teamName,
              allocAmount: v,
              spent: 0,
              reserved: 0,
            });
          lines.push(`  ${t.teamName}: +${boFmt(v)}원 (⚠ DB 저장 제외)`);
          continue;
        }

        // budget_allocations 조회 및 upsert
        const { data: existing } = await sb
          .from("budget_allocations")
          .select("id, allocated_amount")
          .eq("bankbook_id", bb.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        const existingRow = existing?.[0];
        if (existingRow) {
          await sb
            .from("budget_allocations")
            .update({
              allocated_amount:
                Number(existingRow.allocated_amount) + v,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRow.id);
        } else {
          await sb.from("budget_allocations").insert({
            bankbook_id: bb.id,
            allocated_amount: v,
            used_amount: 0,
            frozen_amount: 0,
          });
        }

        // 인메모리 동기화 (화면 리렌더용)
        const ex = TEAM_DIST.find(
          (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
        );
        if (ex) {
          ex.allocAmount += v;
        } else {
          TEAM_DIST.push({
            id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`,
            accountBudgetId: abId,
            teamName: t.teamName,
            allocAmount: v,
            spent: 0,
            reserved: 0,
          });
        }
        lines.push(`  ${t.teamName}: +${boFmt(v)}원 ✅`);
      }
    } catch (e) {
      console.error("[BO 팀배분] DB 저장 오류:", e.message);
      alert(`DB 저장 중 오류가 발생했습니다: ${e.message}\n인메모리에만 반영됩니다.`);
      // 오류 시 인메모리 폴백 처리
      teams.forEach((t) => {
        const v = Number(document.getElementById(t.inputId)?.value || 0);
        if (v <= 0) return;
        const ex = TEAM_DIST.find(
          (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
        );
        if (ex) ex.allocAmount += v;
        else
          TEAM_DIST.push({
            id: `TD${Date.now()}`,
            accountBudgetId: abId,
            teamName: t.teamName,
            allocAmount: v,
            spent: 0,
            reserved: 0,
          });
        lines.push(`  ${t.teamName}: +${boFmt(v)}원`);
      });
    }
  } else {
    // Supabase 없음: 인메모리 전용 폴백
    teams.forEach((t) => {
      const v = Number(document.getElementById(t.inputId)?.value || 0);
      if (v <= 0) return;
      const ex = TEAM_DIST.find(
        (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
      );
      if (ex) ex.allocAmount += v;
      else
        TEAM_DIST.push({
          id: `TD${Date.now()}`,
          accountBudgetId: abId,
          teamName: t.teamName,
          allocAmount: v,
          spent: 0,
          reserved: 0,
        });
      lines.push(`  ${t.teamName}: +${boFmt(v)}원`);
    });
  }

  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab?.accountCode)?.name ||
    ab?.accountCode || "";
  let msg = `✅ 일괄 배분 완료!\n\n계정: ${acctName}\n배분 내역:\n${lines.join("\n")}\n\n총 배분: ${boFmt(total)}원\n잔여 배분 가능: ${boFmt(maxAmt - total)}원`;
  if (errors.length > 0) {
    msg += `\n\n⚠ 통장 미매칭 팀 (DB 미반영): ${errors.join(", ")}`;
  }
  alert(msg);
  _distAbId = abId;
  showAllocTab(0);
}

// ─── 탭 4: 예산 이관 ─────────────────────────────────────────────────────────
function renderAllocTransfer() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  const canTransfer = isOwner || (isVorgManager(persona));
  if (!canTransfer)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">이관은 계정 오너 또는 본부/센터 담당자만 가능합니다</div></div>`;

  const myBudgets = getPersonaAccountBudgets(persona);
  const isVM = isVorgManager(persona);
  const vmVorg = isVM ? getPersonaManagedVorg(persona) : null;
  const vmTeamNames = vmVorg ? (vmVorg.teams || []).map((t) => t.name) : null;

  // vorg manager이면 자신 VOrg 팀의 TEAM_DIST만
  const eligibleTeams = myBudgets.flatMap((ab) =>
    TEAM_DIST.filter(
      (t) =>
        t.accountBudgetId === ab.id &&
        (!vmTeamNames ||
          vmTeamNames.some(
            (tn) => t.teamName.includes(tn) || tn.includes(t.teamName),
          )),
    ),
  );

  const vmBannerTr = isVM
    ? `<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:12px;font-size:12px;color:#92400E;font-weight:600">
        👤 <b>${persona.scope}</b> 담당자 — 관할 조직(${vmVorg?.name || persona.scope}) 하위 팀 간 이관만 가능합니다.
       </div>`
    : "";

  return `
<div class="bo-card" style="padding:24px;max-width:680px">
  ${vmBannerTr}
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
    <div class="bo-section-title" style="margin:0">예산 이관 — 팀 간 잔액 이동</div>
    <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:#DBEAFE;color:#1E40AF">P8</span>
  </div>
  <p style="font-size:12px;color:#6B7280;margin-bottom:16px">동일 계정 내에서 A팀의 잔여 배분액을 B팀으로 이동 — 사유 필수</p>
  <div style="display:grid;gap:14px">
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 계정 <span style="color:#EF4444">*</span></label>
      <select id="tr-ab" onchange="updateTrTeams()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
        <option value="">— 계정 선택 —</option>
        ${myBudgets.map((ab) => `<option value="${ab.id}">${ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name || ab.accountCode}</option>`).join("")}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
      <div>
        <label style="font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;display:block;margin-bottom:6px">From (이관 출처)</label>
        <select id="tr-from" onchange="updateTrFromPreview()" style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700"><option>— 계정 먼저 선택 —</option></select>
        <div id="tr-from-balance" style="font-size:11px;color:#EF4444;margin-top:4px;font-weight:700"></div>
      </div>
      <div style="font-size:22px;color:#9CA3AF;text-align:center;margin-top:18px">→</div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;display:block;margin-bottom:6px">To (이관 대상)</label>
        <select id="tr-to" style="width:100%;border:1.5px solid #BBF7D0;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700"><option>— 계정 먼저 선택 —</option></select>
      </div>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 금액</label>
      <div style="position:relative">
        <input type="number" id="tr-amount" placeholder="0" oninput="updateTrFromPreview()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
      </div>
      <div id="tr-amount-preview" style="font-size:11px;margin-top:4px;font-weight:700"></div>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 사유 (필수)</label>
      <textarea id="tr-reason" rows="3" placeholder="조직 개편, 예산 부족, 사업 계획 변경 등"
        style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
    </div>
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E">
      ⚠️ 이관 처리 후 취소 불가 · 이관 이력은 <b>변경 이력</b> 탭에서 확인 가능
    </div>
    <button onclick="submitTransfer()" class="bo-btn-primary" style="padding:14px">↔ 이관 처리</button>
  </div>
</div>
<script>window._trVmTeamNames=${JSON.stringify(vmTeamNames)};</script>`;
}

function updateTrTeams() {
  const abId = document.getElementById("tr-ab")?.value;
  const vmTeams = window._trVmTeamNames; // null이면 전체, array이면 해당 팀만
  let teams = TEAM_DIST.filter((t) => t.accountBudgetId === abId);
  if (vmTeams) {
    teams = teams.filter((t) =>
      vmTeams.some((tn) => t.teamName.includes(tn) || tn.includes(t.teamName)),
    );
  }
  const opts =
    `<option value="">— 팀 선택 —</option>` +
    teams
      .map(
        (t) =>
          `<option value="${t.id}" data-balance="${t.allocAmount - t.spent - t.reserved}">${t.teamName} (잔액: ${boFmt(t.allocAmount - t.spent - t.reserved)}원)</option>`,
      )
      .join("");
  const frm = document.getElementById("tr-from");
  const to = document.getElementById("tr-to");
  if (frm) frm.innerHTML = opts;
  if (to) to.innerHTML = opts;
  // 잔액 미리보기 초기화
  const balEl = document.getElementById("tr-from-balance");
  const preEl = document.getElementById("tr-amount-preview");
  if (balEl) balEl.textContent = "";
  if (preEl) preEl.textContent = "";
}

// [P8] From팀 잔액 미리보기 실시간 업데이트
function updateTrFromPreview() {
  const fromSel = document.getElementById("tr-from");
  const amtInput = document.getElementById("tr-amount");
  const balEl = document.getElementById("tr-from-balance");
  const preEl = document.getElementById("tr-amount-preview");
  if (!fromSel || !balEl) return;
  const selectedOpt = fromSel.options[fromSel.selectedIndex];
  const balance = Number(selectedOpt?.dataset?.balance || 0);
  if (balance > 0) {
    balEl.textContent = `현재 잔액: ${boFmt(balance)}원`;
  } else {
    balEl.textContent = "";
  }
  if (!preEl || !amtInput) return;
  const amt = Number(amtInput.value || 0);
  if (amt > 0 && balance > 0) {
    const afterBalance = balance - amt;
    const color = afterBalance < 0 ? "#EF4444" : "#059669";
    preEl.innerHTML = `이관 후 잔액: <span style="color:${color};font-weight:900">${boFmt(afterBalance)}원</span>`;
  } else {
    preEl.textContent = "";
  }
}
window.updateTrFromPreview = updateTrFromPreview;

async function submitTransfer() {
  const fromId = document.getElementById("tr-from")?.value;
  const toId = document.getElementById("tr-to")?.value;
  const amount = Number(document.getElementById("tr-amount")?.value);
  const reason = document.getElementById("tr-reason")?.value;
  if (!fromId || !toId || !amount || !reason || fromId === toId) {
    alert("모든 항목을 올바르게 입력하세요.");
    return;
  }
  const from = TEAM_DIST.find((x) => x.id === fromId);
  const to = TEAM_DIST.find((x) => x.id === toId);
  const bal = from.allocAmount - from.spent - from.reserved;
  if (amount > bal) {
    alert(`잔액 부족: ${boFmt(bal)}원만 이관 가능합니다.`);
    return;
  }

  // ── [P8] Supabase DB 저장 (bankbooks 현행 구조) ────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  const now = new Date().toISOString();

  if (sb) {
    try {
      // [P8] 현행 bankbooks 테이블에서 From/To 팀 통장 조회
      const fromAbCode = ACCOUNT_BUDGETS.find(x => x.id === from.accountBudgetId)?.accountCode;
      const { data: books } = await sb.from("bankbooks")
        .select("id, account_code, org_name, current_balance, used_amount")
        .eq("tenant_id", tenantId)
        .eq("account_code", fromAbCode || "")
        .eq("status", "active")
        .is("user_id", null); // 팀 통장 (개인 아님)

      const fromBk = (books || []).find(b =>
        b.org_name === from.teamName ||
        b.org_name?.includes(from.teamName) ||
        from.teamName?.includes(b.org_name)
      );
      const toBk = (books || []).find(b =>
        b.org_name === to.teamName ||
        b.org_name?.includes(to.teamName) ||
        to.teamName?.includes(b.org_name)
      );

      if (fromBk && toBk) {
        // From: current_balance 차감
        const newFromBalance = Math.max(0, Number(fromBk.current_balance || 0) - amount);
        await sb.from("bankbooks")
          .update({ current_balance: newFromBalance, updated_at: now })
          .eq("id", fromBk.id);

        // To: current_balance 증가
        const newToBalance = Number(toBk.current_balance || 0) + amount;
        await sb.from("bankbooks")
          .update({ current_balance: newToBalance, updated_at: now })
          .eq("id", toBk.id);

        // [P8] budget_adjust_logs 이관 이력 저장 (비치명적)
        try {
          await sb.from("budget_adjust_logs").insert([
            {
              tenant_id: tenantId,
              before_amount: Number(fromBk.current_balance || 0),
              after_amount: newFromBalance,
              adjusted_by: boCurrentPersona?.id || boCurrentPersona?.name || "bo_admin",
              adjusted_at: now,
              reason: `[이관출처] → ${to.teamName}: ${reason}`,
            },
            {
              tenant_id: tenantId,
              before_amount: Number(toBk.current_balance || 0),
              after_amount: newToBalance,
              adjusted_by: boCurrentPersona?.id || boCurrentPersona?.name || "bo_admin",
              adjusted_at: now,
              reason: `[이관수신] ← ${from.teamName}: ${reason}`,
            },
          ]);
        } catch(logErr) { console.warn("[P8] 이관 이력 저장 skip:", logErr.message); }

        console.log(`[P8] 이관 완료: ${from.teamName}(${fromBk.id}) → ${to.teamName}(${toBk.id}) ${amount.toLocaleString()}원`);
      } else {
        // bankbooks 미매칭 — 레거시 org_budget_bankbooks 폴백 시도
        console.warn("[P8] bankbooks 미매칭 — 레거시 폴백 시도:", from.teamName, to.teamName);
        const { data: legacyBooks } = await sb.from("org_budget_bankbooks")
          .select("id, org_name, account_id")
          .eq("tenant_id", tenantId)
          .or("bb_status.eq.active,bb_status.is.null");

        const fromAbCodeFallback = ACCOUNT_BUDGETS.find(x => x.id === from.accountBudgetId)?.accountCode;
        const toAbCodeFallback   = ACCOUNT_BUDGETS.find(x => x.id === to.accountBudgetId)?.accountCode;
        const { data: accts } = await sb.from("budget_accounts")
          .select("id, code")
          .in("code", [fromAbCodeFallback, toAbCodeFallback].filter(Boolean))
          .eq("tenant_id", tenantId).eq("active", true);
        const acctCodeIdMap = {};
        (accts || []).forEach(a => { acctCodeIdMap[a.code] = a.id; });

        const fromLegacy = (legacyBooks || []).find(b =>
          (b.org_name === from.teamName || b.org_name?.includes(from.teamName) || from.teamName?.includes(b.org_name)) &&
          (acctCodeIdMap[fromAbCodeFallback] ? b.account_id === acctCodeIdMap[fromAbCodeFallback] : true)
        );
        const toLegacy = (legacyBooks || []).find(b =>
          (b.org_name === to.teamName || b.org_name?.includes(to.teamName) || to.teamName?.includes(b.org_name)) &&
          (acctCodeIdMap[toAbCodeFallback] ? b.account_id === acctCodeIdMap[toAbCodeFallback] : true)
        );
        if (fromLegacy && toLegacy) {
          const { data: fromAlloc } = await sb.from("budget_allocations").select("id, allocated_amount")
            .eq("bankbook_id", fromLegacy.id).order("updated_at", { ascending: false }).limit(1);
          if (fromAlloc?.[0]) {
            await sb.from("budget_allocations")
              .update({ allocated_amount: Number(fromAlloc[0].allocated_amount) - amount, updated_at: now })
              .eq("id", fromAlloc[0].id);
          }
          const { data: toAlloc } = await sb.from("budget_allocations").select("id, allocated_amount")
            .eq("bankbook_id", toLegacy.id).order("updated_at", { ascending: false }).limit(1);
          if (toAlloc?.[0]) {
            await sb.from("budget_allocations")
              .update({ allocated_amount: Number(toAlloc[0].allocated_amount) + amount, updated_at: now })
              .eq("id", toAlloc[0].id);
          } else {
            await sb.from("budget_allocations").insert({ bankbook_id: toLegacy.id, allocated_amount: amount, used_amount: 0, frozen_amount: 0 });
          }
          console.log("[P8] 레거시 폴백 이관 처리 완료");
        } else {
          console.warn("[P8] 팀 bankbook 미매칭 — 인메모리만 업데이트");
        }
      }
    } catch (e) {
      console.error("[P8 이관] DB 저장 오류:", e.message);
    }
  }

  // 인메모리 업데이트
  from.allocAmount -= amount;
  to.allocAmount += amount;
  const todayStr = new Date().toISOString().slice(0, 10);
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}a`,
    accountBudgetId: from.accountBudgetId,
    date: todayStr,
    type: "이관출처",
    amount: -amount,
    note: `→ ${to.teamName}: ${reason}`,
    by: boCurrentPersona.name,
  });
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}b`,
    accountBudgetId: to.accountBudgetId,
    date: todayStr,
    type: "이관수신",
    amount: +amount,
    note: `← ${from.teamName}: ${reason}`,
    by: boCurrentPersona.name,
  });
  alert(`✅ 이관 완료\n${from.teamName} → ${to.teamName}\n${boFmt(amount)}원`);
  showAllocTab(0);
}

// ─── 탭 5: 변경 이력 (Audit Trail) ───────────────────────────────────────────
function renderAllocHistory() {
  const persona = boCurrentPersona;
  const myAbIds = getPersonaAccountBudgets(persona).map((ab) => ab.id);
  const history = ACCOUNT_ADJUST_HISTORY.filter((h) =>
    myAbIds.includes(h.accountBudgetId),
  ).sort((a, b) => b.date.localeCompare(a.date));

  const typeStyle = {
    SAP_IF: { bg: "#DBEAFE", c: "#1E40AF" },
    기초입력: { bg: "#E0E7FF", c: "#4338CA" },
    확정: { bg: "#D1FAE5", c: "#065F46" },
    추가배정: { bg: "#FEF3C7", c: "#92400E" },
    이관출처: { bg: "#FEE2E2", c: "#991B1B" },
    이관수신: { bg: "#F0FDF4", c: "#166534" },
  };

  return `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:13px">변경 이력 — Audit Trail</div>
  <table class="bo-table">
    <thead><tr><th>일자</th><th>계정</th><th style="text-align:center">유형</th><th style="text-align:right">금액</th><th>내용</th><th>처리자</th></tr></thead>
    <tbody>
      ${history
        .map((h) => {
          const ab = ACCOUNT_BUDGETS.find((x) => x.id === h.accountBudgetId);
          const s = typeStyle[h.type] || { bg: "#F3F4F6", c: "#374151" };
          const ac =
            h.amount > 0 ? "#059669" : h.amount < 0 ? "#EF4444" : "#9CA3AF";
          return `<tr>
          <td style="font-size:12px;color:#6B7280;white-space:nowrap">${h.date}</td>
          <td><code style="background:#F3F4F6;padding:1px 7px;border-radius:5px;font-size:11px;font-weight:700">${ab?.accountCode || "—"}</code></td>
          <td style="text-align:center"><span style="font-size:10px;font-weight:900;background:${s.bg};color:${s.c};padding:2px 8px;border-radius:6px">${h.type}</span></td>
          <td style="text-align:right;font-weight:900;color:${ac}">${h.amount !== 0 ? (h.amount > 0 ? "+" : "") + boFmt(h.amount) + "원" : "—"}</td>
          <td style="font-size:12px;color:#374151">${h.note}</td>
          <td style="font-size:11px;color:#9CA3AF">${h.by}</td>
        </tr>`;
        })
        .join("")}
    </tbody>
  </table>
</div>`;
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
    const tenantId = persona?.tenantId || _allocFilterTenant || 'HMC';
    if (!tenantId) return;

    // 1. �ش� �׳�Ʈ�� �� ���� + allocation ���� ��ȸ
    const { data: bankbooks, error: bbErr } = await sb
      .from("org_budget_bankbooks")
      .select("id, org_name, account_id, tenant_id")
      .eq("tenant_id", tenantId)
      .or("bb_status.eq.active,bb_status.is.null")
      .is("user_id", null);
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
      .select("id, code, uses_budget, integration_mode")
      .in("id", acctIds);
    const acctMap = {};
    (accts || []).forEach((a) => { acctMap[a.id] = a; });

    // 3-b. 통장 정책 캐시 로드 (bankbook_mode 기반 UI 분기용)
    try {
      const { data: policies } = await sb
        .from("budget_account_org_policy")
        .select("budget_account_id, bankbook_mode, bankbook_level, individual_limit")
        .in("budget_account_id", acctIds);
      const cache = {};
      (policies || []).forEach(p => {
        const acct = acctMap[p.budget_account_id];
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

    // 5. TEAM_DIST ����
    let syncCount = 0;
    for (const bb of bankbooks) {
      const acct = acctMap[bb.account_id];
      if (!acct || !acct.uses_budget) continue;

      const alloc = allocMap[bb.id];
      if (!alloc) continue;

      const ab = ACCOUNT_BUDGETS.find(
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
        var abRef = ACCOUNT_BUDGETS.find(x => x.id === newAbId);
        if (!abRef) continue;
      }
      const abFinal = ab || ACCOUNT_BUDGETS.find(x => x.accountCode === acct.code && x.tenantId === tenantId);

      const existingIdx = TEAM_DIST.findIndex(
        (td) => td.accountBudgetId === abFinal.id && td.teamName === bb.org_name
      );

      const newAmt = Number(alloc.allocated_amount || 0);
      const newSpent = Number(alloc.used_amount || 0);
      const newFrozen = Number(alloc.frozen_amount || 0);

      if (existingIdx >= 0) {
        TEAM_DIST[existingIdx].allocAmount = newAmt;
        TEAM_DIST[existingIdx].spent = newSpent;
        TEAM_DIST[existingIdx].reserved = newFrozen;
        TEAM_DIST[existingIdx]._bbId = bb.id;
        TEAM_DIST[existingIdx]._allocId = alloc.id;
      } else if (newAmt > 0) {
        TEAM_DIST.push({
          id: "TD_DB_" + bb.id,
          accountBudgetId: abFinal.id,
          teamName: bb.org_name,
          allocAmount: newAmt,
          spent: newSpent,
          reserved: newFrozen,
          _bbId: bb.id,
          _allocId: alloc.id,
        });
      }
      syncCount++;
    }

    console.log("[BO Alloc Sync] " + tenantId + " ���� DB ����ȭ �Ϸ� (" + syncCount + "��)");
  } catch (e) {
    console.warn("[BO Alloc Sync] DB error (non-critical):", e.message);
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
  if (!sb || !ab) return;
  try {
    const balance = Math.max(0, totalBudget - usedAmount);

    // 1. account_budgets 보조 컬럼 갱신 (잔액, 사용액)
    const { error: abErr } = await sb.from('account_budgets').update({
      balance: balance,
      used: usedAmount,
      updated_at: new Date().toISOString(),
    }).eq('account_code', ab.accountCode)
      .eq('fiscal_year', fiscalYear)
      .eq('tenant_id', ab.tenantId);
    if (abErr) console.warn('[_syncBudgetAllocations] account_budgets update:', abErr.message);

    // 2. org_budget_bankbooks 테이블이 있으면 동기화
    const { data: bankbooks, error: bbErr } = await sb.from('org_budget_bankbooks')
      .select('id, org_id')
      .eq('account_code', ab.accountCode)
      .eq('fiscal_year', fiscalYear)
      .eq('tenant_id', ab.tenantId);

    if (!bbErr && bankbooks && bankbooks.length > 0) {
      // 각 통장의 allocated_amount를 합산하여 배분 비율로 잔액 재계산
      const totalAllocated = bankbooks.reduce((s, b) => s + (b.allocated_amount || 0), 0);
      for (const bb of bankbooks) {
        const ratio = totalAllocated > 0 ? (bb.allocated_amount || 0) / totalAllocated : 1 / bankbooks.length;
        const newBalance = Math.round(balance * ratio);
        await sb.from('org_budget_bankbooks').update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }).eq('id', bb.id);
      }
      console.log(`[_syncBudgetAllocations] ${bankbooks.length}개 bankbook 잔액 갱신 완료`);
    }

    console.log(`[_syncBudgetAllocations] ${ab.accountCode} FY${fiscalYear} total=${totalBudget} balance=${balance}`);
  } catch (e) {
    // 비치명적 오류 — 인메모리/account_budgets 저장은 이미 완료된 상태
    console.warn('[_syncBudgetAllocations] non-critical error:', e.message);
  }
}


