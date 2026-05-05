// ─── fo_pre_wizard.js — 공통 Pre-Wizard 모듈 ────────────────────────────────
// 교육신청·교육결과 화면에서 사업계획/운영계획과 동일한
// "제도그룹 → 예산계정 → 목록" 네비게이션 흐름을 제공한다.
// fo_plans_list.js의 _renderVorgHub() / _renderAccountHub() 로직을 공유한다.

// ═══════════════════════════════════════════════════════════════════════
// 교육신청 (Apply) Pre-Wizard 상태
// ═══════════════════════════════════════════════════════════════════════
let _applySelectedVorgId = null;
let _applySelectedVorgName = null;
let _applySelectedAccountCode = null;
let _applySelectedAccountName = null;
let _applyUserVorgList = [];
let _applySelectedVorgOwnedAccounts = [];

function _resetApplyPreWizard() {
  _applySelectedVorgId = null;
  _applySelectedVorgName = null;
  _applySelectedAccountCode = null;
  _applySelectedAccountName = null;
  _applyUserVorgList = [];
  _applySelectedVorgOwnedAccounts = [];
}

// ═══════════════════════════════════════════════════════════════════════
// 교육결과 (Result) Pre-Wizard 상태
// ═══════════════════════════════════════════════════════════════════════
let _resultSelectedVorgId = null;
let _resultSelectedVorgName = null;
let _resultSelectedAccountCode = null;
let _resultSelectedAccountName = null;
let _resultUserVorgList = [];
let _resultSelectedVorgOwnedAccounts = [];

function _resetResultPreWizard() {
  _resultSelectedVorgId = null;
  _resultSelectedVorgName = null;
  _resultSelectedAccountCode = null;
  _resultSelectedAccountName = null;
  _resultUserVorgList = [];
  _resultSelectedVorgOwnedAccounts = [];
}

// ═══════════════════════════════════════════════════════════════════════
// 공통 — 제도그룹(VOrg) 허브 렌더링
// ═══════════════════════════════════════════════════════════════════════
async function _renderGenericVorgHub(containerId, modeLabel, modeIcon, onSelectFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // VOrg ID 목록 수집
  let vorgIds = [];
  if (Array.isArray(currentPersona?.vorgIds) && currentPersona.vorgIds.length > 0) {
    vorgIds = currentPersona.vorgIds;
  } else if (currentPersona?.vorgId) {
    vorgIds = [currentPersona.vorgId];
  } else if (currentPersona?.domainId) {
    vorgIds = [currentPersona.domainId];
  }

  if (vorgIds.length === 0) {
    // VOrg 정보 없으면 바로 계정 허브 (전체 계정)
    onSelectFn('default', '기본 제도그룹', []);
    return;
  }

  container.innerHTML = `<div style="padding:80px;text-align:center;color:#6B7280;font-weight:600;font-size:14px">⏳ 제도그룹 조회 중...</div>`;

  // DB에서 VOrg 명칭 + ownedAccounts 조회
  const sb = typeof getSB === 'function' ? getSB() : null;
  let fetchedVorgs = [];
  if (sb && vorgIds.length > 0) {
    try {
      const { data } = await sb.from('virtual_org_templates')
        .select('id, name, isolation_group_id')
        .in('id', vorgIds);
      if (data && data.length > 0) {
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
    } catch(e) { console.warn('[PreWizard] VOrg DB fetch failed:', e.message); }
  }

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

  // 단일 VOrg → 자동 스킵
  if (vorgItems.length <= 1) {
    const v = vorgItems[0] || { id: vorgIds[0] || 'default', name: '기본 제도그룹', ownedAccounts: [] };
    onSelectFn(v.id, v.name, v.ownedAccounts);
    return;
  }

  // 복수 VOrg → 선택 카드 UI
  container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">HOME › ${modeLabel}</div>
    <h1 class="text-3xl font-black text-brand tracking-tight">${modeIcon} 제도그룹 선택</h1>
    <p class="text-gray-500 text-sm mt-1">${modeLabel}을 작성할 제도그룹을 선택해 주세요.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">
    ${vorgItems.map(v => `
    <button onclick="${onSelectFn.name}('${v.id}','${v.name.replace(/'/g, '')}',${JSON.stringify(v.ownedAccounts)})"
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

  return vorgItems; // 호출자가 목록을 캐시할 수 있도록
}

// ═══════════════════════════════════════════════════════════════════════
// 공통 — 예산계정 허브 렌더링
// ═══════════════════════════════════════════════════════════════════════
function _renderGenericAccountHub(containerId, modeLabel, modeIcon, vorgName, ownedAccounts, onSelectFn, onBackFn, showBack) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // persona 예산에서 이 VOrg의 계정만 필터
  let accountItems = [];
  const budgets = currentPersona?.budgets || [];
  if (ownedAccounts && ownedAccounts.length > 0) {
    accountItems = budgets.filter(b =>
      ownedAccounts.some(ac => ac === b.accountCode || ac === b.id)
    );
  } else {
    const allowed = currentPersona?.allowedAccounts || [];
    if (allowed.includes('*')) {
      accountItems = budgets;
    } else {
      accountItems = budgets.filter(b => allowed.includes(b.accountCode));
    }
  }

  // 중복 제거
  const seen = new Set();
  accountItems = accountItems.filter(b => {
    if (seen.has(b.accountCode)) return false;
    seen.add(b.accountCode);
    return true;
  });

  // 계정 0개
  if (accountItems.length === 0) {
    container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div>
    <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
      HOME › ${showBack ? `<span onclick="${onBackFn}" style="cursor:pointer;text-decoration:underline">${modeLabel}</span>` : modeLabel} › 예산계정
    </div>
    <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1>
  </div>
  <div style="padding:60px 20px;text-align:center;border-radius:16px;background:#FFF9F9;border:1.5px dashed #FCA5A5">
    <div style="font-size:36px;margin-bottom:12px">⚠️</div>
    <div style="font-size:14px;font-weight:900;color:#DC2626">이 제도그룹에 배정된 예산계정이 없습니다.</div>
    <div style="font-size:12px;color:#9CA3AF;margin-top:6px">관리자에게 예산 배정을 요청해 주세요.</div>
    ${showBack ? `<button onclick="${onBackFn}" style="margin-top:20px;padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;cursor:pointer">← 제도그룹 선택으로</button>` : ''}
  </div>
</div>`;
    return;
  }

  // 계정 1개 → 자동 스킵
  if (accountItems.length === 1) {
    const a = accountItems[0];
    onSelectFn(a.accountCode, a.name || a.accountCode);
    return;
  }

  // 복수 계정 → 선택 카드 UI
  container.innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">
        HOME › ${showBack ? `<span onclick="${onBackFn}" style="cursor:pointer;text-decoration:underline">${modeLabel}</span>` : modeLabel} › 예산계정
      </div>
      <h1 class="text-3xl font-black text-brand tracking-tight">💳 예산계정 선택</h1>
      <p class="text-gray-500 text-sm mt-1">${vorgName || modeLabel} · ${modeLabel}에 사용할 예산계정을 선택하세요.</p>
    </div>
    ${showBack ? `<button onclick="${onBackFn}" style="padding:8px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">← 제도그룹</button>` : ''}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
    ${accountItems.map(b => {
      const balance = (b.balance || 0);
      const used = (b.used || 0);
      const remaining = balance - used;
      const pct = balance > 0 ? Math.round(remaining / balance * 100) : 0;
      const barColor = pct < 20 ? '#EF4444' : pct < 50 ? '#F59E0B' : '#10B981';
      return `
    <button onclick="${onSelectFn.name}('${b.accountCode}','${(b.name||b.accountCode).replace(/'/g,'')}')"
      style="text-align:left;padding:24px 22px;border-radius:20px;border:2px solid #E5E7EB;background:white;
             cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.05);transition:all 0.18s"
      onmouseover="this.style.borderColor='#002C5F';this.style.boxShadow='0 8px 28px rgba(0,44,95,0.12)';this.style.transform='translateY(-3px)'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.05)';this.style.transform='none'">
      <div style="font-size:12px;font-weight:900;color:#6B7280;margin-bottom:8px">💳 ${b.accountCode || ''}</div>
      <div style="font-size:17px;font-weight:900;color:#111827;margin-bottom:14px">${b.name || b.accountCode}</div>
      ${balance > 0 ? `
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;color:#6B7280;font-weight:700">가용예산</span>
          <span style="font-size:11px;font-weight:900;color:${barColor}">${remaining.toLocaleString()}원 (${pct}%)</span>
        </div>
        <div style="height:6px;border-radius:3px;background:#F3F4F6;overflow:hidden">
          <div style="height:100%;width:${100-pct}%;background:${barColor};border-radius:3px;transition:width 0.3s"></div>
        </div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:4px">배정 ${balance.toLocaleString()}원</div>
      </div>` : `<div style="font-size:12px;color:#9CA3AF;margin-bottom:14px">⏳ 예산 미배정</div>`}
      <div style="margin-top:14px;font-size:12px;font-weight:800;color:#002C5F;display:flex;align-items:center;gap:4px">
        선택하기 <span>→</span>
      </div>
    </button>`;
    }).join('')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════
// 교육신청 — Pre-Wizard 진입점
// ═══════════════════════════════════════════════════════════════════════
async function _renderApplyVorgHub() {
  await _renderGenericVorgHub('page-apply', '교육신청', '✏️', _applySelectVorg);
}

function _applySelectVorg(vorgId, vorgName, ownedAccounts) {
  _applySelectedVorgId = vorgId;
  _applySelectedVorgName = vorgName;
  _applySelectedVorgOwnedAccounts = Array.isArray(ownedAccounts) ? ownedAccounts : [];
  _applySelectedAccountCode = null;
  _applySelectedAccountName = null;
  renderApply();
}
window._applySelectVorg = _applySelectVorg;

function _renderApplyAccountHub() {
  _renderGenericAccountHub(
    'page-apply', '교육신청', '✏️',
    _applySelectedVorgName,
    _applySelectedVorgOwnedAccounts,
    _applySelectAccount,
    "_applySelectedVorgId=null;renderApply()",
    (_applyUserVorgList.length > 1 || (_applySelectedVorgId && _applySelectedVorgId !== 'default'))
  );
}

function _applySelectAccount(accountCode, accountName) {
  _applySelectedAccountCode = accountCode;
  _applySelectedAccountName = accountName;
  // 신청 목록 DB 캐시 리셋
  if (typeof _applyDbLoaded !== 'undefined') _applyDbLoaded = false;
  renderApply();
}
window._applySelectAccount = _applySelectAccount;

// ═══════════════════════════════════════════════════════════════════════
// 교육결과 — Pre-Wizard 진입점
// ═══════════════════════════════════════════════════════════════════════
async function _renderResultVorgHub() {
  await _renderGenericVorgHub('page-result', '교육결과', '📝', _resultSelectVorgPW);
}

function _resultSelectVorgPW(vorgId, vorgName, ownedAccounts) {
  _resultSelectedVorgId = vorgId;
  _resultSelectedVorgName = vorgName;
  _resultSelectedVorgOwnedAccounts = Array.isArray(ownedAccounts) ? ownedAccounts : [];
  _resultSelectedAccountCode = null;
  _resultSelectedAccountName = null;
  renderResult();
}
window._resultSelectVorgPW = _resultSelectVorgPW;

function _renderResultAccountHub() {
  _renderGenericAccountHub(
    'page-result', '교육결과', '📝',
    _resultSelectedVorgName,
    _resultSelectedVorgOwnedAccounts,
    _resultSelectAccountPW,
    "_resultSelectedVorgId=null;renderResult()",
    (_resultUserVorgList.length > 1 || (_resultSelectedVorgId && _resultSelectedVorgId !== 'default'))
  );
}

function _resultSelectAccountPW(accountCode, accountName) {
  _resultSelectedAccountCode = accountCode;
  _resultSelectedAccountName = accountName;
  _resultDbLoaded = false;
  renderResult();
}
window._resultSelectAccountPW = _resultSelectAccountPW;

console.log('[fo_pre_wizard.js] 공통 Pre-Wizard 모듈 로드 완료');
