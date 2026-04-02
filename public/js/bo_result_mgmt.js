// ─── 📄 교육결과 관리 + 공통 캐스케이드 필터 ───────────────────────────────────
// 공통 필터 상태
let _boEduFilter = { tenantId: '', vorgId: '', accountCode: '', purpose: '', eduType: '', eduSubType: '' };

// 공통 캐스케이드 필터 HTML 생성기
function _boEduFilterBar(onChangeCallback) {
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const vorgTemplates = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const budgetAccounts = typeof BUDGET_ACCOUNTS !== 'undefined' ? BUDGET_ACCOUNTS : [];
  const purposes = typeof EDU_PURPOSE_GROUPS !== 'undefined' ? EDU_PURPOSE_GROUPS : [];
  const typeGroups = typeof EDU_TYPE_GROUPS !== 'undefined' ? EDU_TYPE_GROUPS : [];
  const typeItems = typeof EDU_TYPE_ITEMS !== 'undefined' ? EDU_TYPE_ITEMS : [];

  // 기본값: 현재 페르소나 테넌트
  if (!_boEduFilter.tenantId && boCurrentPersona?.tenantId) {
    _boEduFilter.tenantId = boCurrentPersona.tenantId;
  }

  // 캐스케이드 필터링
  const filteredVorgs = _boEduFilter.tenantId
    ? vorgTemplates.filter(v => (v.tenant_id || v.tenantId) === _boEduFilter.tenantId)
    : vorgTemplates;
  const filteredAccounts = _boEduFilter.tenantId
    ? budgetAccounts.filter(a => (a.tenant_id || a.tenantId) === _boEduFilter.tenantId)
    : budgetAccounts;
  const filteredPurposes = purposes;
  const filteredTypes = _boEduFilter.purpose
    ? typeGroups.filter(g => g.purpose_id === _boEduFilter.purpose)
    : typeGroups;
  const filteredSubTypes = _boEduFilter.eduType
    ? typeItems.filter(i => i.group_id === _boEduFilter.eduType)
    : typeItems;

  const selStyle = `border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;color:#374151;background:#fff;cursor:pointer;min-width:100px`;
  const cb = onChangeCallback || 'console.log';

  return `
  <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <span style="font-size:12px;font-weight:900;color:#002C5F">🔍 조회 필터</span>
      <span style="font-size:10px;color:#9CA3AF">회사 → 가상조직 → 계정 → 목적 → 교육유형 → 세부유형</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <select id="bf-tenant" style="${selStyle}" onchange="_boFilterChange('tenantId',this.value,'${cb}')">
        <option value="">전체 회사</option>
        ${tenants.map(t => '<option value="' + t.id + '"' + (_boEduFilter.tenantId === t.id ? ' selected' : '') + '>' + (t.name || t.id) + '</option>').join('')}
      </select>
      <select id="bf-vorg" style="${selStyle}" onchange="_boFilterChange('vorgId',this.value,'${cb}')">
        <option value="">전체 가상조직</option>
        ${filteredVorgs.map(v => '<option value="' + v.id + '"' + (_boEduFilter.vorgId === v.id ? ' selected' : '') + '>' + v.name + '</option>').join('')}
      </select>
      <select id="bf-account" style="${selStyle}" onchange="_boFilterChange('accountCode',this.value,'${cb}')">
        <option value="">전체 계정</option>
        ${filteredAccounts.map(a => '<option value="' + (a.code || a.id) + '"' + (_boEduFilter.accountCode === (a.code || a.id) ? ' selected' : '') + '>' + a.name + '</option>').join('')}
      </select>
      <select id="bf-purpose" style="${selStyle}" onchange="_boFilterChange('purpose',this.value,'${cb}')">
        <option value="">전체 목적</option>
        ${filteredPurposes.map(p => '<option value="' + p.id + '"' + (_boEduFilter.purpose === p.id ? ' selected' : '') + '>' + p.label + '</option>').join('')}
      </select>
      <select id="bf-edutype" style="${selStyle}" onchange="_boFilterChange('eduType',this.value,'${cb}')">
        <option value="">전체 교육유형</option>
        ${filteredTypes.map(g => '<option value="' + g.id + '"' + (_boEduFilter.eduType === g.id ? ' selected' : '') + '>' + g.label + '</option>').join('')}
      </select>
      <select id="bf-subtype" style="${selStyle}" onchange="_boFilterChange('eduSubType',this.value,'${cb}')">
        <option value="">전체 세부유형</option>
        ${filteredSubTypes.map(i => '<option value="' + i.id + '"' + (_boEduFilter.eduSubType === i.id ? ' selected' : '') + '>' + i.label + '</option>').join('')}
      </select>
      <button onclick="_boFilterReset('${cb}')" style="padding:7px 14px;border:1.5px solid #DC2626;border-radius:8px;background:#fff;color:#DC2626;font-size:12px;font-weight:800;cursor:pointer">초기화</button>
    </div>
  </div>`;
}

function _boFilterChange(key, value, callbackName) {
  _boEduFilter[key] = value;
  // 캐스케이드 하위 초기화
  const order = ['tenantId', 'vorgId', 'accountCode', 'purpose', 'eduType', 'eduSubType'];
  const idx = order.indexOf(key);
  for (let i = idx + 1; i < order.length; i++) _boEduFilter[order[i]] = '';
  if (typeof window[callbackName] === 'function') window[callbackName]();
}

function _boFilterReset(callbackName) {
  _boEduFilter = { tenantId: boCurrentPersona?.tenantId || '', vorgId: '', accountCode: '', purpose: '', eduType: '', eduSubType: '' };
  if (typeof window[callbackName] === 'function') window[callbackName]();
}

// DB 데이터 필터링 헬퍼
function _boApplyEduFilter(items) {
  return items.filter(item => {
    if (_boEduFilter.tenantId && (item.tenant_id || item.tenantId) !== _boEduFilter.tenantId) return false;
    if (_boEduFilter.accountCode && (item.account_code || item.account) !== _boEduFilter.accountCode) return false;
    if (_boEduFilter.purpose && item.detail?.purpose !== _boEduFilter.purpose) return false;
    if (_boEduFilter.eduType && (item.edu_type || item.eduType) !== _boEduFilter.eduType) return false;
    return true;
  });
}

// ─── 교육결과 관리 화면 ─────────────────────────────────────────────────────
let _resultMgmtData = null;

async function renderResultMgmt() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;

  // DB에서 결과(status=completed) 조회
  if (!_resultMgmtData && sb) {
    try {
      const tenantId = boCurrentPersona?.tenantId || 'HMC';
      const { data, error } = await sb.from('applications').select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (!error) _resultMgmtData = data || [];
    } catch (err) {
      console.error('[renderResultMgmt] DB 조회 실패:', err.message);
      _resultMgmtData = [];
    }
  }

  const results = _boApplyEduFilter(_resultMgmtData || []);

  const rows = results.map(r => {
    const amt = Number(r.amount || 0);
    return `
    <tr>
      <td><code style="font-size:11px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${r.id}</code></td>
      <td style="font-weight:700">${r.applicant_name || ''}</td>
      <td>${r.dept || ''}</td>
      <td style="font-weight:700">${r.edu_name || ''}</td>
      <td>${r.edu_type || '-'}</td>
      <td>${r.account_code || '-'}</td>
      <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
      <td style="font-size:12px;color:#6B7280">${r.created_at?.slice(0, 10) || ''}</td>
      <td><span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#D1FAE5;color:#059669;font-weight:800">완료</span></td>
    </tr>`;
  }).join('');

  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === 'function' ? boIsolationGroupBanner() : ''}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">📄 교육결과 관리</h1>
      <p class="bo-page-sub">교육 완료 결과를 조회하고 정산 처리합니다</p>
    </div>
    <button onclick="_resultMgmtData=null;renderResultMgmt()" class="bo-btn-primary">🔄 새로고침</button>
  </div>

  ${_boEduFilterBar('renderResultMgmt')}

  <div class="bo-card" style="overflow:hidden">
    <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between">
      <span class="bo-section-title">교육결과 목록 (${results.length}건)</span>
    </div>
    ${results.length > 0 ? `
    <table class="bo-table">
      <thead><tr>
        <th>ID</th><th>신청자</th><th>부서</th><th>교육명</th><th>유형</th><th>계정</th>
        <th style="text-align:right">금액</th><th>등록일</th><th>상태</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>` : `
    <div style="padding:60px;text-align:center;color:#9CA3AF">
      <div style="font-size:48px;margin-bottom:10px">📭</div>
      <div style="font-weight:700">교육결과 데이터가 없습니다</div>
      <div style="font-size:12px;margin-top:6px">프론트 오피스에서 교육결과를 등록하면 이 화면에서 조회할 수 있습니다.</div>
    </div>`}
  </div>
</div>`;
}
