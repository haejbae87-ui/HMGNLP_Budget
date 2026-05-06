// ─── Tenant Admin: 예산 기초 관리 (7탭) ──────────────────────────────────────
// Step1:계정마스터CRUD  Step2:조직-계정매핑  Step3:양식빌더(FORM_MASTER)
// Step4:양식접근권한    Step5:양식-예산-계획룰  Step6:공지관리  +교육조직+권한

const BM_TABS = [
  { label: "[Step1] 계정 마스터 관리" },
  { label: "[Step2] 교육조직 제도그룹 관리" },
  { label: "[Step3] 양식 및 유형 마스터" },
  { label: "[Step4] 통합 정책 매핑 설정" },
  { label: "[Step5] 신청 양식별 공지 관리" },
];

let _bmActiveTab = 0;

// ─── 실제 인사 조직 트리 (ERP 연동 가정) ─────────────────────────────────────
const REAL_ORG_TREE = {
  general: [
    {
      id: "RHQ01",
      name: "HMGOOOO본부",
      type: "hq",
      children: [
        {
          id: "RT01",
          name: "피플OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT02",
          name: "역량OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT03",
          name: "성과OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT04",
          name: "인재OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT05",
          name: "교육기획팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
      ],
    },
    {
      id: "RHQ02",
      name: "SDVOOOO본부",
      type: "hq",
      children: [
        {
          id: "RT06",
          name: "SDV기술팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
        {
          id: "RT07",
          name: "아키텍처팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
        {
          id: "RT08",
          name: "플랫폼팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
      ],
    },
  ],
  rnd: [
    {
      id: "RC01",
      name: "모빌리티OOOO센터",
      type: "center",
      children: [
        {
          id: "RT20",
          name: "내구OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT21",
          name: "구동OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT22",
          name: "전장OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT23",
          name: "샤시OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
      ],
    },
    {
      id: "RC02",
      name: "전동화OOOO센터",
      type: "center",
      children: [
        {
          id: "RT24",
          name: "배터리OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
        {
          id: "RT25",
          name: "인버터OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
        {
          id: "RT26",
          name: "충전OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
      ],
    },
  ],
};

let virtualOrgState = JSON.parse(JSON.stringify(VIRTUAL_ORG));

// ── 상태 변수 ─────────────────────────────────────────────────────────────────
let _baTenantId = null; // 플랫폼총괄: 선택된 테넌트
let _baGroupId = null; // 선택된 격리그룹 ID
let _baExpandedAR = {}; // 결재라인 펼침 상태 { accountCode: bool }

// 상태 변수
let _bmFilterTenant = null;
let _bmFilterTplId = null;
let _bmFilterAcctCode = null;
let _bmFilterTplList = [];
let _bmFilterAcctList = [];
let _bmDbBudgetData = {};
let _bmAdjustHistory = [];
let _bmCurrentTab = 2;

// ─── DB: account_master + edu_support_domains 로드 후 ACCOUNT_MASTER 갱신 ───────
async function _bmLoadFilterData(tenantId) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb || !tenantId) return;
  try {
    const { data: tpls } = await sb.from('virtual_org_templates').select('id,name').eq('tenant_id', tenantId).eq('purpose', 'edu_support');
    _bmFilterTplList = tpls || [];
    if (!_bmFilterTplId || !_bmFilterTplList.find(t => t.id === _bmFilterTplId)) {
      _bmFilterTplId = _bmFilterTplList[0]?.id || null;
    }
    await _bmRefreshAcctList();
  } catch (e) { console.warn('[BM Filter]', e); }
}

async function _bmRefreshAcctList() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && _bmFilterTenant && _bmFilterTplId) {
    const { data: accts } = await sb.from('budget_accounts')
      .select('id,name,code,integration_mode')
      .eq('tenant_id', _bmFilterTenant)
      .eq('virtual_org_template_id', _bmFilterTplId)
      .eq('active', true).eq('uses_budget', true);
    _bmFilterAcctList = accts || [];
  } else { _bmFilterAcctList = []; }
  if (_bmFilterAcctCode && !_bmFilterAcctList.find(a => a.code === _bmFilterAcctCode)) {
    _bmFilterAcctCode = null;
  }
}

async function _bmOnTplChange(tplId) {
  _bmFilterTplId = tplId; _bmFilterAcctCode = null;
  await _bmRefreshAcctList();
  const el = document.getElementById('bm-acct-select');
  if (el) el.innerHTML = '<option value="">예산계정 선택</option>' +
    _bmFilterAcctList.map(a => '<option value="' + a.code + '">' + a.name + '</option>').join('');
}

function _bmApplyFilter() {
  const t = document.getElementById('bm-tenant-select');
  const g = document.getElementById('bm-group-select');
  const a = document.getElementById('bm-acct-select');
  if (t) _bmFilterTenant = t.value;
  if (g) _bmFilterTplId = g.value || null;
  if (a) _bmFilterAcctCode = a.value || null;
  window._budgetMasterLoaded = false;
  renderBudgetMaster();
}

function _bmFilterBarHtml() {
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  const ss = 'padding:6px 10px;border:1.5px solid #DBEAFE;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;color:#1D4ED8;min-width:120px';
  return '<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;margin-bottom:20px;flex-wrap:wrap">' +
    '<span style="font-size:11px;font-weight:900;color:#1D4ED8;white-space:nowrap">🔍 데이터 범위</span>' +
    '<label style="font-size:10px;font-weight:700;color:#6B7280">회사</label>' +
    '<select id="bm-tenant-select" style="' + ss + '" onchange="_bmFilterTenant=this.value;_bmFilterTplId=null;_bmFilterAcctCode=null;_bmLoadFilterData(this.value).then(function(){var g=document.getElementById(\'bm-group-select\');if(g){g.innerHTML=_bmFilterTplList.map(function(t){return\'<option value=\\\'\'+t.id+\'\\\'>\'+ t.name+\'</option>\'}).join(\'\')};_bmOnTplChange(_bmFilterTplList[0]&&_bmFilterTplList[0].id||null)})">' +
      tenants.map(t => '<option value="' + t.id + '"' + (t.id === _bmFilterTenant ? ' selected' : '') + '>' + t.name + ' (' + t.id + ')</option>').join('') +
    '</select>' +
    '<label style="font-size:10px;font-weight:700;color:#6B7280">🏷️ 제도그룹</label>' +
    '<select id="bm-group-select" style="' + ss + '" onchange="_bmOnTplChange(this.value)">' +
      (_bmFilterTplList.length > 0 ? _bmFilterTplList.map(t => '<option value="' + t.id + '"' + (t.id === _bmFilterTplId ? ' selected' : '') + '>' + t.name + '</option>').join('') : '<option value="">로딩 중...</option>') +
    '</select>' +
    '<label style="font-size:10px;font-weight:700;color:#6B7280">💳 예산계정</label>' +
    '<select id="bm-acct-select" style="' + ss + '">' +
      '<option value="">예산계정 선택</option>' +
      _bmFilterAcctList.map(a => '<option value="' + a.code + '"' + (a.code === _bmFilterAcctCode ? ' selected' : '') + '>' + a.name + '</option>').join('') +
    '</select>' +
    '<button onclick="_bmApplyFilter()" style="padding:6px 18px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap" onmouseover="this.style.background=\'#1E40AF\'" onmouseout="this.style.background=\'#1D4ED8\'">조회</button>' +
    '<div style="font-size:10px;color:#60A5FA;font-weight:600;margin-left:4px">ℹ 회사 → 제도그룹 → 예산계정을 순서대로 선택하면 관리할 수 있습니다.</div>' +
  '</div>';
}

// ── account_budgets 테이블에서 실제 배정액(total_budget)을 읽어 _bmDbBudgetData에 저장 ──
async function _bmSyncAccountBudgets(sb, tenantId) {
  if (!sb || !tenantId) return;
  try {
    const year = typeof _allocYear !== 'undefined' ? _allocYear : new Date().getFullYear();
    const acctCodes = (_bmFilterAcctList || []).map(a => a.code).filter(Boolean);
    if (acctCodes.length === 0) { _bmDbBudgetData = {}; return; }

    // account_budgets에서 total_budget 조회 (base_budget/added_budget 있으면 분리 조회)
    const { data: rows, error } = await sb
      .from('account_budgets')
      .select('account_code, total_budget, base_budget, added_budget, fiscal_year')
      .eq('fiscal_year', year)
      .in('account_code', acctCodes);

    if (error) {
      console.warn('[_bmSyncAccountBudgets] 쿼리 실패:', error.message);
      _bmDbBudgetData = {};
    } else {
      // DB 데이터를 맵으로 저장 (base_budget/added_budget 분리)
      _bmDbBudgetData = {};
      (rows || []).forEach(row => {
        const base = Number(row.base_budget || row.total_budget || 0);
        const added = Number(row.added_budget || (row.total_budget - (row.base_budget || row.total_budget)) || 0);
        _bmDbBudgetData[row.account_code] = {
          totalBudget: Number(row.total_budget || 0),
          baseBudget: base,
          addedBudget: added,
          fiscalYear: row.fiscal_year,
        };
        console.log('[_bmSyncAccountBudgets] DB 로드:', row.account_code, '→ base=', base, 'added=', added, 'total=', row.total_budget);
      });
      console.log('[_bmSyncAccountBudgets] 완료: codes=' + acctCodes + ', DB rows=' + (rows||[]).length);
    }

    // ACCOUNT_BUDGETS 인메모리도 동기화 (하위 호환 유지)
    (rows || []).forEach(row => {
      const dbAmount = Number(row.total_budget || 0);
      if (dbAmount === 0) return; // DB=0이면 mock 유지
      const ab = (typeof ACCOUNT_BUDGETS !== 'undefined' ? ACCOUNT_BUDGETS : []).find(
        x => x.accountCode === row.account_code && x.tenantId === tenantId
      );
      if (ab) { ab.baseAmount = dbAmount; ab.fiscalYear = row.fiscal_year; }
    });
  } catch (e) {
    console.warn('[_bmSyncAccountBudgets] 오류:', e.message);
    _bmDbBudgetData = {};
  }
}

function renderBudgetMaster() {
  const ct = document.getElementById("bo-content");
  if (!ct) return;
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  const role = persona.role || "";
  const isGlobal = role === "platform_admin" || role === "tenant_global_admin" || role === "budget_global_admin";

  if (!isGlobal && !isOwner) {
    ct.innerHTML = '<div style="max-width:700px;margin:0 auto;padding:60px 24px;text-align:center"><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:16px;font-weight:900;color:#374151;margin-bottom:8px">접근 권한이 없습니다</div><div style="font-size:13px;color:#6B7280">기초 및 추가 배정은 총괄담당자 권한입니다.</div></div>';
    return;
  }

  if (!_bmFilterTenant) {
    _bmFilterTenant = persona.tenantId || (typeof TENANTS !== 'undefined' ? TENANTS.find(t => t.id !== 'SYSTEM')?.id : null) || 'HMC';
  }

  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb && !window._budgetMasterLoaded) {
    window._budgetMasterLoaded = true;
    (async () => {
      try {
        await _bmLoadFilterData(_bmFilterTenant);
        if (typeof _allocLoadFilterData === 'function') {
          const prev = typeof _allocFilterTenant !== 'undefined' ? _allocFilterTenant : null;
          if (typeof _allocFilterTenant !== 'undefined') _allocFilterTenant = _bmFilterTenant;
          await _allocLoadFilterData(persona);
          if (prev !== null && typeof _allocFilterTenant !== 'undefined') _allocFilterTenant = prev;
        }
        // ★ account_budgets DB에서 actual total_budget 로드
        await _bmSyncAccountBudgets(sb, _bmFilterTenant);
        // ★ 배정 변경 이력 로드
        await _bmLoadAdjustHistory(sb);
        if (typeof _syncAllocFromDB === 'function') await _syncAllocFromDB(persona);
      } catch (e) { console.warn("[BudgetMaster] sync:", e.message); }
      renderBudgetMaster();
    })();
    ct.innerHTML = `
      <div class="max-w-5xl mx-auto">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px">
          <div>
            <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">교육지원제도 기준정보 › 예산계정 마스터</div>
            <h1 class="text-3xl font-black text-brand tracking-tight">🏦 예산계정 마스터</h1>
            <p class="text-gray-500 text-sm mt-1">예산계정의 기초 예산 등록 및 연중 추가 배정을 관리합니다.</p>
          </div>
        </div>
        ${_bmFilterBarHtml()}
        <div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 예산계정 데이터 로딩 중...</div>
      </div>
    `;
    return;
  }

  // ★★ DB 직접 조회 방식: _bmFilterAcctList(DB 계정) + _bmDbBudgetData(DB 예산)를 기준으로 렌더링
  //    ACCOUNT_BUDGETS mock 데이터 의존도 제거
  const dbAcctList = (_bmFilterAcctList || []).filter(a => _bmFilterAcctCode ? a.code === _bmFilterAcctCode : true);
  const allocYear = typeof _allocYear !== 'undefined' ? _allocYear : new Date().getFullYear();
  const _fmt = (v) => Number(v || 0).toLocaleString('ko-KR');

  // DB 예산 데이터가 없는 경우 ACCOUNT_BUDGETS 인메모리 fallback 사용
  const _getBudgetData = (acctCode) => {
    // 1순위: DB account_budgets 테이블 (실제 데이터)
    if (_bmDbBudgetData[acctCode] && _bmDbBudgetData[acctCode].totalBudget > 0) {
      const d = _bmDbBudgetData[acctCode];
      return {
        baseAmount: d.baseBudget || d.totalBudget,   // base_budget 컬럼 없으면 total 전체를 기초로
        totalAdded: d.addedBudget || 0,
        fromDb: true,
      };
    }
    // 2순위: ACCOUNT_BUDGETS 인메모리 (mock or AB_DB_xxxx)
    const tid = _bmFilterTenant;
    const ab = (typeof ACCOUNT_BUDGETS !== 'undefined' ? ACCOUNT_BUDGETS : []).find(
      x => x.accountCode === acctCode && x.tenantId === tid
    );
    if (ab) return { baseAmount: ab.baseAmount || 0, totalAdded: ab.totalAdded || 0, fromDb: false, abRef: ab };
    return { baseAmount: 0, totalAdded: 0, fromDb: false };
  };

  // 계정별 예산 데이터 빌드
  const myAcctData = dbAcctList.map(a => ({
    acct: a,
    ...( _getBudgetData(a.code) ),
  }));

  const totalBase = myAcctData.reduce((s, d) => s + d.baseAmount, 0);
  const totalAdded = myAcctData.reduce((s, d) => s + d.totalAdded, 0);
  const totalBudget = totalBase + totalAdded;

  const uninitialized = myAcctData.filter(d => d.acct.integration_mode !== 'sap' && d.baseAmount === 0);

  const accountRows = myAcctData.map(d => {
    const total = d.baseAmount + d.totalAdded;
    const srcBadge = d.acct.integration_mode === 'sap'
      ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#EFF6FF;color:#1D4ED8;font-weight:800">🔗 SAP</span>'
      : '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FFF7ED;color:#C2410C;font-weight:800">📋 자체</span>';
    return '<tr style="border-top:1px solid #F1F5F9"><td style="padding:10px 12px;font-weight:700;color:#374151">' + d.acct.code + '</td><td style="padding:10px 8px;color:#374151">' + d.acct.name + '</td><td style="text-align:center;padding:10px 8px">' + srcBadge + '</td><td style="text-align:right;padding:10px 8px;font-weight:700">' + _fmt(d.baseAmount) + '원</td><td style="text-align:right;padding:10px 8px;font-weight:700;color:#059669">' + (d.totalAdded > 0 ? '+' + _fmt(d.totalAdded) + '원' : '—') + '</td><td style="text-align:right;padding:10px 12px;font-weight:900;color:#7C3AED">' + _fmt(total) + '원</td></tr>';
  }).join('');

  // renderAllocEntry는 기존 ACCOUNT_BUDGETS 기반 — myAcctData를 통해 보완
  // _bmFilterAcctCode가 선택됐을 때 해당 계정의 ab가 ACCOUNT_BUDGETS에 없으면 자동 생성
  if (_bmFilterAcctCode && myAcctData.length > 0) {
    const d = myAcctData[0];
    if (!d.abRef) {
      // ACCOUNT_BUDGETS에 없으면 임시 항목 생성 (renderAllocEntry, submitAddBudget에서 사용)
      const newId = 'AB_BM_' + d.acct.code;
      if (!(typeof ACCOUNT_BUDGETS !== 'undefined' && ACCOUNT_BUDGETS.find(x => x.id === newId))) {
        (typeof ACCOUNT_BUDGETS !== 'undefined' ? ACCOUNT_BUDGETS : []).push({
          id: newId,
          tenantId: _bmFilterTenant,
          accountCode: d.acct.code,
          dbAccountId: d.acct.id,
          sourceType: d.acct.integration_mode === 'sap' ? 'sap_if' : 'platform',
          fiscalYear: allocYear,
          baseAmount: d.baseAmount,
          totalAdded: d.totalAdded,
          status: 'confirmed',
          _fromDb: true,
        });
        console.log('[renderBudgetMaster] ACCOUNT_BUDGETS 임시 항목 생성:', d.acct.code, newId);
      } else {
        // 기존 항목의 금액 갱신
        const existing = ACCOUNT_BUDGETS.find(x => x.id === newId);
        if (existing) { existing.baseAmount = d.baseAmount; existing.totalAdded = d.totalAdded; }
      }
    }
  }

  const allocEntryHtml = typeof renderAllocEntry === 'function' ? renderAllocEntry() : '';
  const acctLabel = _bmFilterAcctCode ? (_bmFilterAcctList.find(a => a.code === _bmFilterAcctCode)?.name || _bmFilterAcctCode) : '전체 계정';

  console.log('[renderBudgetMaster] DB기반 렌더: accts=', dbAcctList.map(a => a.code), 'totalBase=', totalBase);

  // 4-Tab UI 구성
  const tabsHtml = `
    <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid #E5E7EB;padding-bottom:1px">
      <button onclick="setbmTab(0)" style="padding:10px 18px;font-size:13px;font-weight:800;border:none;background:transparent;cursor:pointer;color:${_bmCurrentTab===0?'#4F46E5':'#6B7280'};border-bottom:${_bmCurrentTab===0?'3px solid #4F46E5':'3px solid transparent'};margin-bottom:-3px;transition:all .2s">1. 예산 배정</button>
      <button onclick="setbmTab(1)" style="padding:10px 18px;font-size:13px;font-weight:800;border:none;background:transparent;cursor:pointer;color:${_bmCurrentTab===1?'#4F46E5':'#6B7280'};border-bottom:${_bmCurrentTab===1?'3px solid #4F46E5':'3px solid transparent'};margin-bottom:-3px;transition:all .2s">2. 예산 회수</button>
      <button onclick="setbmTab(2)" style="padding:10px 18px;font-size:13px;font-weight:800;border:none;background:transparent;cursor:pointer;color:${_bmCurrentTab===2?'#4F46E5':'#6B7280'};border-bottom:${_bmCurrentTab===2?'3px solid #4F46E5':'3px solid transparent'};margin-bottom:-3px;transition:all .2s">3. 예산 현황</button>
      <button onclick="setbmTab(3)" style="padding:10px 18px;font-size:13px;font-weight:800;border:none;background:transparent;cursor:pointer;color:${_bmCurrentTab===3?'#4F46E5':'#6B7280'};border-bottom:${_bmCurrentTab===3?'3px solid #4F46E5':'3px solid transparent'};margin-bottom:-3px;transition:all .2s">4. 변경 이력</button>
    </div>
  `;

  // Tab 3: 현황
  const statusHtml = (myAcctData.length > 0 && _bmFilterAcctCode) ? `
    <div class="bo-card" style="padding:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <span style="background:#374151;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">현황</span>
        <div class="bo-section-title" style="margin:0">계정별 예산 현황 상세${_bmFilterAcctCode ? ' — ' + acctLabel : ''}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#F8FAFC">
          <th style="text-align:left;padding:10px 12px;font-weight:800;color:#64748B">계정코드</th>
          <th style="text-align:left;padding:10px 8px;font-weight:800;color:#64748B">계정명</th>
          <th style="text-align:center;padding:10px 8px;font-weight:800;color:#64748B">연동방식</th>
          <th style="text-align:right;padding:10px 8px;font-weight:800;color:#64748B">기초 예산</th>
          <th style="text-align:right;padding:10px 8px;font-weight:800;color:#64748B">추가 배정</th>
          <th style="text-align:right;padding:10px 12px;font-weight:800;color:#64748B">총 예산</th>
        </tr></thead>
        <tbody>${accountRows}</tbody>
      </table>
    </div>
  ` : '<div style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">💳</div><div style="font-weight:700">조회 조건을 선택하고 [조회]를 클릭하세요.</div></div>';

  // Tab 4: 변경 이력
  let historyHtml = '';
  if (_bmCurrentTab === 3) {
    historyHtml = `
      <div id="bm-history-container" class="bo-card" style="padding:40px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px;animation:pulse 1.5s infinite">⏳</div>
        <div style="color:#6B7280;font-size:12px;font-weight:700">변경이력을 DB에서 조회 중입니다...</div>
      </div>
    `;

    // 비동기 DB 조회 시작
    setTimeout(async () => {
      const sb = typeof getSB === 'function' ? getSB() : null;
      const el = document.getElementById('bm-history-container');
      if (!sb || !el) return;

      try {
        const year = typeof _allocYear !== 'undefined' ? _allocYear : new Date().getFullYear();
        const acctCodes = _bmFilterAcctCode ? [_bmFilterAcctCode] : (_bmFilterAcctList || []).map(a => a.code).filter(Boolean);
        
        if (acctCodes.length === 0) {
          el.innerHTML = '<div style="font-size:32px;margin-bottom:8px">💳</div><div style="font-weight:700;color:#9CA3AF">조회 조건을 선택해주세요.</div>';
          return;
        }

        const { data: rows, error } = await sb
          .from('account_budget_adjustments')
          .select('account_code, fiscal_year, type, amount, reason, performed_by, created_at')
          .eq('fiscal_year', year)
          .in('account_code', acctCodes)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        if (!rows || rows.length === 0) {
          el.outerHTML = '<div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:12px;border:1px dashed #E5E7EB"><div style="font-size:32px;margin-bottom:8px">📊</div><div style="font-weight:700">배정 변경 이력이 없습니다</div></div>';
          return;
        }

        const typeColors = { '기초입력': '#1D4ED8', '추가배정': '#059669', '회수': '#DC2626', '마감': '#6B7280' };
        const rowsHtml = rows.map(h => {
          const clr = typeColors[h.type] || '#374151';
          const bg = h.type === '기초입력' ? '#EFF6FF' : h.type === '추가배정' ? '#ECFDF5' : h.type === '회수' ? '#FEF2F2' : '#F9FAFB';
          const date = h.created_at ? new Date(h.created_at).toLocaleDateString('ko-KR', {year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
          const sign = h.type === '회수' ? '-' : '+';
          return `<tr style="border-top:1px solid #F1F5F9">
            <td style="padding:9px 12px;font-size:11px;color:#6B7280">${date}</td>
            <td style="padding:9px 8px;text-align:center"><span style="font-size:10px;padding:2px 7px;border-radius:4px;background:${bg};color:${clr};font-weight:800">${h.type}</span></td>
            <td style="padding:9px 8px;text-align:right;font-weight:700;color:${clr}">${h.type === '기초입력' ? '' : sign}${Number(h.amount||0).toLocaleString('ko-KR')}원</td>
            <td style="padding:9px 8px;font-size:11px;color:#374151;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.reason || ''}</td>
            <td style="padding:9px 12px;font-size:11px;color:#9CA3AF">${h.performed_by || ''}</td>
          </tr>`;
        }).join('');

        el.outerHTML = `
        <div class="bo-card" style="padding:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
            <span style="background:#6366F1;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">이력</span>
            <div class="bo-section-title" style="margin:0">배정 변경 이력 (Audit Trail)</div>
            <span style="margin-left:auto;font-size:11px;color:#6B7280">총 ${rows.length}건</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#F8FAFC">
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#64748B;white-space:nowrap">일시</th>
              <th style="text-align:center;padding:8px 8px;font-weight:800;color:#64748B">구분</th>
              <th style="text-align:right;padding:8px 8px;font-weight:800;color:#64748B">금액</th>
              <th style="text-align:left;padding:8px 8px;font-weight:800;color:#64748B">변경 사유</th>
              <th style="text-align:left;padding:8px 12px;font-weight:800;color:#64748B">작성자</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
      } catch (err) {
        console.warn('[_bmLoadAdjustHistory async] DB 조회 실패:', err.message);
        el.innerHTML = `<div style="color:#DC2626">변경이력 조회 중 오류가 발생했습니다.</div>`;
      }
    }, 0);
  }

  ct.innerHTML = `
  <div class="max-w-5xl mx-auto">
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:16px">
      <div>
        <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">교육지원제도 기준정보 › 예산계정 마스터</div>
        <h1 class="text-3xl font-black text-brand tracking-tight">🏦 예산계정 마스터</h1>
        <p class="text-gray-500 text-sm mt-1">예산계정의 기초 예산 등록 및 연중 추가 배정을 관리합니다.</p>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="boNavigate('budget-account')" style="padding:8px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">💳 예산계정 관리 →</button>
        <button onclick="boNavigate('allocation')" style="padding:8px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">💰 예산 배정 →</button>
      </div>
    </div>
    
    ${_bmFilterBarHtml()}

    <!-- ★ 연도 오픈/마감 컨트롤 바 -->
    ${(() => {
      const yr = allocYear;
      const isClosed = window._bmYearStatus === 'closed';
      const prevYr = yr - 1;
      const nextYr = yr + 1;
      const statusBadge = isClosed
        ? '<span style="background:#FEE2E2;color:#DC2626;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;border:1px solid #FECACA">🔒 마감됨</span>'
        : '<span style="background:#D1FAE5;color:#059669;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;border:1px solid #6EE7B7">🟢 운영중</span>';
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 18px;background:#F8FAFC;border-radius:12px;border:1.5px solid #E5E7EB;margin-bottom:20px">
        <button onclick="openBudgetYear(${prevYr})" style="padding:6px 12px;border-radius:8px;border:1px solid #E5E7EB;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#6B7280">← ${prevYr}년</button>
        <div style="flex:1;text-align:center">
          <span style="font-size:16px;font-weight:900;color:#1E293B">${yr}년도</span>
          <span style="margin-left:8px">${statusBadge}</span>
        </div>
        <button onclick="openBudgetYear(${nextYr})" style="padding:6px 12px;border-radius:8px;border:1px solid #E5E7EB;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#6B7280">${nextYr}년 →</button>
        ${isClosed
          ? `<button onclick="openBudgetYear(${yr})" style="padding:6px 14px;border-radius:8px;border:none;background:#059669;color:white;font-size:11px;font-weight:800;cursor:pointer">📂 재오픈</button>`
          : `<button onclick="closeBudgetYear(${yr})" style="padding:6px 14px;border-radius:8px;border:none;background:#DC2626;color:white;font-size:11px;font-weight:800;cursor:pointer">🔒 ${yr}년 마감</button>`
        }
      </div>`;
    })()}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
      <div style="background:linear-gradient(135deg,#FFF7ED,#FED7AA);border-radius:16px;padding:20px 18px;border:1.5px solid #FED7AA;position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;right:14px;font-size:22px;opacity:.4">📋</div>
        <div style="font-size:10px;font-weight:700;color:#C2410C;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">기초 예산 합계</div>
        <div style="font-size:30px;font-weight:900;color:#C2410C;line-height:1">${_fmt(totalBase)}<span style="font-size:13px;font-weight:700;margin-left:2px">원</span></div>
        <div style="font-size:10px;color:#C2410C99;margin-top:4px">${uninitialized.length > 0 ? "⚠️ 미등록 " + uninitialized.length + "건" : "✅ 전체 등록 완료"}</div>
      </div>
      <div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);border-radius:16px;padding:20px 18px;border:1.5px solid #6EE7B7;position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;right:14px;font-size:22px;opacity:.4">➕</div>
        <div style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">추가 배정 합계</div>
        <div style="font-size:30px;font-weight:900;color:#059669;line-height:1">+${_fmt(totalAdded)}<span style="font-size:13px;font-weight:700;margin-left:2px">원</span></div>
        <div style="font-size:10px;color:#05966999;margin-top:4px">연중 증액 누계</div>
      </div>
      <div style="background:linear-gradient(135deg,#F3E8FF,#DDD6FE);border-radius:16px;padding:20px 18px;border:1.5px solid #C4B5FD;position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;right:14px;font-size:22px;opacity:.4">💰</div>
        <div style="font-size:10px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">총 예산</div>
        <div style="font-size:30px;font-weight:900;color:#7C3AED;line-height:1">${_fmt(totalBudget)}<span style="font-size:13px;font-weight:700;margin-left:2px">원</span></div>
        <div style="font-size:10px;color:#7C3AED99;margin-top:4px">기초 + 추가</div>
      </div>
    </div>

    ${tabsHtml}

    ${_bmCurrentTab === 0 ? `<div class="bm-tab-alloc">${allocEntryHtml}</div><style>.bm-tab-alloc > div > div:last-child { display: none !important; }</style>` : ''}
    ${_bmCurrentTab === 1 ? `<div class="bm-tab-recall">${allocEntryHtml}</div><style>.bm-tab-recall > div > div:not(:last-child) { display: none !important; }</style>` : ''}
    ${_bmCurrentTab === 2 ? statusHtml : ''}
    ${_bmCurrentTab === 3 ? historyHtml : ''}
  </div>`;

  window._budgetMasterLoaded = false;
}

// ── 배정 변경 이력 DB 로드 ──
async function _bmLoadAdjustHistory(sb) {
  _bmAdjustHistory = [];
  if (!sb) return;
  try {
    const year = typeof _allocYear !== 'undefined' ? _allocYear : new Date().getFullYear();
    const acctCodes = (_bmFilterAcctList || []).map(a => a.code).filter(Boolean);
    if (acctCodes.length === 0) return;
    const { data, error } = await sb
      .from('account_budget_adjustments')
      .select('account_code, fiscal_year, type, amount, reason, performed_by, created_at')
      .eq('fiscal_year', year)
      .in('account_code', acctCodes)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.warn('[_bmLoadAdjustHistory] 쿼리 실패:', error.message); return; }
    _bmAdjustHistory = data || [];
    console.log('[_bmLoadAdjustHistory] 로드 완료:', _bmAdjustHistory.length, '건');
  } catch (e) {
    console.warn('[_bmLoadAdjustHistory] 오류:', e.message);
  }
}
