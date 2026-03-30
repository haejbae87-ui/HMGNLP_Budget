// ─── 백오피스: 세부 산출 근거 관리 (계층형: 테넌트→격리그룹→예산계정) ────────
// 데이터는 CALC_GROUNDS_MASTER(레거시) + Supabase calc_grounds 테이블 혼용

let _cgActiveTab      = null;     // 선택된 accountCode
let _cgEditId         = null;
let _cgFilterGroup    = null;     // 선택된 격리그룹 ID
let _cgFilterAccount  = null;     // 선택된 예산계정 코드

// ─── Scope / visible 배지 헬퍼 ───────────────────────────────────────────────
const CG_SCOPE_META = {
  plan:   { label: '계획', color: '#1D4ED8', bg: '#EFF6FF' },
  apply:  { label: '신청', color: '#059669', bg: '#F0FDF4' },
  settle: { label: '결과', color: '#7C3AED', bg: '#F5F3FF' },
};
const CG_VISIBLE_META = {
  both:     { label: '국내/해외', color: '#374151', bg: '#F9FAFB' },
  domestic: { label: '국내전용',  color: '#2563EB', bg: '#EFF6FF' },
  overseas: { label: '해외전용',  color: '#D97706', bg: '#FFFBEB' },
};

function _cgScopeBadges(scopes = []) {
  return (scopes||[]).map(s => {
    const m = CG_SCOPE_META[s] || { label: s, color: '#6B7280', bg: '#F9FAFB' };
    return `<span style="background:${m.bg};color:${m.color};padding:1px 6px;border-radius:5px;font-size:10px;font-weight:800;border:1px solid ${m.color}20">${m.label}</span>`;
  }).join(' ');
}
function _cgVisibleBadge(val = 'both') {
  const m = CG_VISIBLE_META[val] || CG_VISIBLE_META.both;
  return `<span style="background:${m.bg};color:${m.color};padding:1px 6px;border-radius:5px;font-size:10px;font-weight:700;border:1px solid ${m.color}20">${m.label}</span>`;
}

// ─── 항목 조회 (계층 필터) ───────────────────────────────────────────────────
// 범위: tenantId 일치 + (groupId 일치 OR null) + (accountCode 일치 OR null)
function _cgGetItems(tenantId, groupId, accountCode) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (g.tenantId && g.tenantId !== tenantId) return false;
    if (g.domainId && g.domainId !== groupId) return false;
    if (g.accountCode && g.accountCode !== accountCode) return false;
    return true;
  });
}

// ─── 메인 렌더 ───────────────────────────────────────────────────────────────
function renderCalcGrounds() {
  const tenantId   = boCurrentPersona.tenantId || 'HMC';
  const tenantName = (typeof TENANTS !== 'undefined' ? TENANTS.find(t => t.id === tenantId) : null)?.name || tenantId;

  // 이 테넌트에 속한 격리그룹
  const myGroups = (typeof EDU_SUPPORT_DOMAINS !== 'undefined')
    ? EDU_SUPPORT_DOMAINS.filter(g => g.tenantId === tenantId)
    : [];

  if (!_cgFilterGroup && myGroups.length) _cgFilterGroup = myGroups[0].id;

  // 선택된 그룹의 계정 목록
  const selectedGroup = myGroups.find(g => g.id === _cgFilterGroup);
  const ownedAccts = selectedGroup?.ownedAccounts || [];
  if (!_cgFilterAccount && ownedAccts.length) _cgFilterAccount = ownedAccts[0];

  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade" style="max-width:1100px;padding:24px">
  ${typeof boIsolationGroupBanner==='function' ? boIsolationGroupBanner() : ''}
  
  <!-- 헤더 -->
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">세부산출근거</span>
      <h1 class="bo-page-title" style="margin:0">세부 산출 근거 관리</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">테넌트 → 격리그룹 → 예산계정 단위로 세부 산출근거 항목을 독립적으로 구성합니다.</p>
  </div>

  <!-- 계층형 필터 바 -->
  <div class="bo-card" style="padding:16px;margin-bottom:20px;background:#F8FAFC">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      
      <!-- 격리그룹 선택 -->
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">
        <label style="font-size:11px;font-weight:900;color:#374151;white-space:nowrap">🛡️ 격리그룹</label>
        <select id="cg-sel-group" onchange="cgOnGroupChange(this.value)"
                style="flex:1;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
          ${myGroups.map(g => `<option value="${g.id}" ${_cgFilterGroup===g.id?'selected':''}>${g.name}</option>`).join('')}
        </select>
      </div>
      
      <!-- 예산계정 선택 -->
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px">
        <label style="font-size:11px;font-weight:900;color:#374151;white-space:nowrap">💳 예산계정</label>
        <select id="cg-sel-acct" onchange="cgOnAccountChange(this.value)"
                style="flex:1;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
          <option value="">— 전체 (공유) —</option>
          ${ownedAccts.map(code => {
            const acct = (typeof ACCOUNT_MASTER!=='undefined' ? ACCOUNT_MASTER.find(a=>a.code===code) : null) || {};
            return `<option value="${code}" ${_cgFilterAccount===code?'selected':''}>${code}${acct.name?` (${acct.name})`:''}</option>`;
          }).join('')}
        </select>
      </div>
      
      <button class="bo-btn-primary bo-btn-sm" onclick="cgOpenModal(null)"
              style="white-space:nowrap">+ 항목 추가</button>
    </div>
    
    <!-- 계층 요약 라벨 -->
    <div style="margin-top:10px;font-size:11px;color:#6B7280;display:flex;align-items:center;gap:6px">
      <span style="font-weight:800;color:#374151">${tenantName}</span>
      <span>›</span>
      <span style="font-weight:800;color:#374151">${selectedGroup?.name || '—'}</span>
      <span>›</span>
      <span style="font-weight:800;color:#374151">${_cgFilterAccount || '전체 공유 항목'}</span>
      <span style="color:#9CA3AF">— 이 범위에서 유효한 항목만 표시됩니다.</span>
    </div>
  </div>

  <!-- 항목 목록 -->
  <div id="cg-content">
    ${_renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount)}
  </div>
</div>

<!-- 항목 편집 모달 -->
<div id="cg-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:580px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="cg-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">산출 근거 항목 추가</h3>
      <button onclick="cgCloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="cg-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="cgCloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="cgSaveItem()">저장</button>
    </div>
  </div>
</div>`;
}

// ─── 격리그룹/계정 변경 핸들러 ────────────────────────────────────────────────
function cgOnGroupChange(groupId) {
  _cgFilterGroup = groupId;
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const g = EDU_SUPPORT_DOMAINS.find(g => g.id === groupId);
  _cgFilterAccount = g?.ownedAccounts?.[0] || null;
  // acct select 새로 채우기
  const sel = document.getElementById('cg-sel-acct');
  if (sel) {
    const accts = g?.ownedAccounts || [];
    sel.innerHTML = `<option value="">— 전체 (공유) —</option>` +
      accts.map(code => `<option value="${code}" selected>${code}</option>`).join('');
    if (accts.length) { sel.value = accts[0]; _cgFilterAccount = accts[0]; }
  }
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, groupId, _cgFilterAccount);
}
function cgOnAccountChange(code) {
  _cgFilterAccount = code || null;
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount);
}

// ─── 항목 테이블 ─────────────────────────────────────────────────────────────
function _renderCgTable(tenantId, groupId, accountCode) {
  const items = _cgGetItems(tenantId, groupId, accountCode);
  const active = items.filter(g => g.active !== false).length;

  // 범위 뱃지
  const scopeLabel = item => {
    if (item.accountCode) return `<span style="font-size:9px;background:#FDF2F8;color:#9D174D;padding:1px 5px;border-radius:4px;font-weight:800">계정전용</span>`;
    if (item.domainId) return `<span style="font-size:9px;background:#F5F3FF;color:#7C3AED;padding:1px 5px;border-radius:4px;font-weight:800">그룹공유</span>`;
    return `<span style="font-size:9px;background:#F3F4F6;color:#6B7280;padding:1px 5px;border-radius:4px;font-weight:800">테넌트공유</span>`;
  };

  return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
  <div style="font-size:13px;font-weight:900;color:#374151">
    📋 항목 목록
    <span style="font-size:12px;color:#6B7280;font-weight:500;margin-left:6px">활성 ${active}개 / 전체 ${items.length}개</span>
  </div>
  <div style="display:flex;gap:8px;font-size:10px;color:#9CA3AF">
    <span><span style="background:#F3F4F6;padding:1px 5px;border-radius:4px;font-weight:800;color:#6B7280">테넌트공유</span> 이 테넌트 전체</span>
    <span><span style="background:#F5F3FF;padding:1px 5px;border-radius:4px;font-weight:800;color:#7C3AED">그룹공유</span> 격리그룹 내</span>
    <span><span style="background:#FDF2F8;padding:1px 5px;border-radius:4px;font-weight:800;color:#9D174D">계정전용</span> 이 계정 한정</span>
  </div>
</div>

<div class="bo-card" style="overflow:hidden;padding:0">
  <table class="bo-table" style="width:100%">
    <thead><tr>
      <th style="padding:10px 14px;width:24px">#</th>
      <th style="padding:10px 14px">항목명</th>
      <th style="padding:10px 14px">범위</th>
      <th style="padding:10px 14px">가이드 설명</th>
      <th style="padding:10px 14px;text-align:right">기준단가</th>
      <th style="padding:10px 14px;text-align:center">사용 단계</th>
      <th style="padding:10px 14px;text-align:center">교육 유형</th>
      <th style="padding:10px 14px;text-align:center">상한액</th>
      <th style="padding:10px 14px;text-align:center">상태</th>
      <th style="padding:10px 14px">관리</th>
    </tr></thead>
    <tbody>
      ${items.length === 0 ? `
      <tr><td colspan="10" style="text-align:center;padding:40px;color:#9CA3AF;font-size:13px">
        이 범위에서 조회된 항목이 없습니다.<br>
        <button onclick="cgOpenModal(null)" class="bo-btn-primary bo-btn-sm" style="margin-top:10px">+ 첫 항목 추가</button>
      </td></tr>` : items.map((g, i) => `
      <tr style="${g.active===false ? 'opacity:.45;' : ''}">
        <td style="padding:10px 14px;color:#9CA3AF;font-size:11px">${i+1}</td>
        <td style="padding:10px 14px">
          <div style="font-weight:700;font-size:13px;color:#111827">${g.name}</div>
          <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${g.id}</div>
        </td>
        <td style="padding:10px 14px">${scopeLabel(g)}</td>
        <td style="padding:10px 14px;font-size:11px;color:#6B7280;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.desc||''}</td>
        <td style="padding:10px 14px;text-align:right;font-weight:700;font-size:12px">${g.unitPrice > 0 ? (typeof boFmt==='function'?boFmt(g.unitPrice):g.unitPrice.toLocaleString())+'원' : '<span style="color:#9CA3AF">—</span>'}</td>
        <td style="padding:10px 14px;text-align:center">${_cgScopeBadges(g.usageScope||['plan','apply','settle'])}</td>
        <td style="padding:10px 14px;text-align:center">${_cgVisibleBadge(g.visibleFor||'both')}</td>
        <td style="padding:10px 14px;text-align:center;font-size:11px">
          ${g.limitType==='none'?'<span style="color:#9CA3AF">제한없음</span>':
            g.limitType==='soft'?`<span style="background:#FFFBEB;color:#D97706;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">⚠ Soft</span>`:
            `<span style="background:#FEF2F2;color:#DC2626;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">🚫 Hard</span>`}
        </td>
        <td style="padding:10px 14px;text-align:center">
          <span class="bo-badge ${g.active!==false ? 'bo-badge-green' : 'bo-badge-gray'}">${g.active!==false?'활성':'비활성'}</span>
        </td>
        <td style="padding:10px 14px">
          <div style="display:flex;gap:4px">
            <button class="bo-btn-secondary bo-btn-sm" onclick="cgOpenModal('${g.id}')">수정</button>
            <button class="bo-btn-secondary bo-btn-sm"
              onclick="cgToggleActive('${g.id}')"
              style="color:${g.active!==false?'#F59E0B':'#059669'};border-color:${g.active!==false?'#F59E0B':'#059669'}">
              ${g.active!==false?'비활성':'활성화'}
            </button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- 범례 -->
<div class="bo-card" style="padding:12px 18px;margin-top:10px;background:#F8FAFC;border-color:#E2E8F0">
  <div style="font-size:11px;color:#374151;font-weight:600;display:flex;flex-wrap:wrap;gap:16px">
    <span>📋 단계: ${_cgScopeBadges(['plan','apply','settle'])} — 체크된 단계에서만 입력 가능</span>
    <span>🌏 유형: ${_cgVisibleBadge('both')} ${_cgVisibleBadge('domestic')} ${_cgVisibleBadge('overseas')} — 국내/해외 구분 표시</span>
    <span>💡 <b>Soft</b>: 초과 시 사유 입력 후 진행 | <b>Hard</b>: 초과 시 차단</span>
  </div>
</div>`;
}

// ─── 모달 ─────────────────────────────────────────────────────────────────────
function cgOpenModal(id) {
  _cgEditId = id || null;
  const item = id ? CALC_GROUNDS_MASTER.find(g => g.id === id) : null;
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const myGroups = EDU_SUPPORT_DOMAINS.filter(g => g.tenantId === tenantId);

  document.getElementById('cg-modal-title').textContent = id ? '산출 근거 항목 수정' : '산출 근거 항목 추가';
  document.getElementById('cg-modal-body').innerHTML = _cgModalBody(item, tenantId, myGroups);
  document.getElementById('cg-modal').style.display = 'flex';
}
function cgCloseModal() { document.getElementById('cg-modal').style.display = 'none'; }

function _cgModalBody(item, tenantId, myGroups) {
  const lType  = item?.limitType  || 'none';
  const scopes = item?.usageScope || ['plan','apply','settle'];
  const visFor = item?.visibleFor || 'both';

  // 그룹+계정 드롭다운 (계층 지정)
  const groupOpts = myGroups.map(g => `<option value="${g.id}" ${item?.domainId===g.id?'selected':''}>${g.name} (${g.id})</option>`).join('');
  
  const selectedGrpId = item?.domainId || _cgFilterGroup;
  const selectedGrp   = myGroups.find(g => g.id === selectedGrpId);
  const acctOpts      = (selectedGrp?.ownedAccounts||[]).map(code =>
    `<option value="${code}" ${item?.accountCode===code?'selected':''}>${code}</option>`
  ).join('');

  return `
<div style="display:flex;flex-direction:column;gap:16px">

  <!-- 계층 설정 (범위 지정) -->
  <div style="background:#EFF6FF;border-radius:10px;padding:14px;border:1.5px solid #BFDBFE">
    <div style="font-size:12px;font-weight:800;color:#1D4ED8;margin-bottom:10px">📐 적용 범위 설정</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px">격리그룹 (미선택 = 테넌트 전체 공유)</label>
        <select id="cg-grp" onchange="cgOnModalGroupChange(this.value)"
                style="width:100%;padding:8px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px">
          <option value="">— 테넌트 전체 공유 —</option>
          ${groupOpts}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px">예산계정 (미선택 = 그룹/테넌트 공유)</label>
        <select id="cg-acct"
                style="width:100%;padding:8px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px">
          <option value="">— 공유 항목 —</option>
          ${acctOpts}
        </select>
      </div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#1D4ED8">
      💡 계정 지정 시 해당 계정에서만 이 항목이 보입니다. 공유 항목은 해당 범위(그룹/테넌트) 전체에서 보입니다.
    </div>
  </div>

  <!-- 기본 정보 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">항목명 <span style="color:#EF4444">*</span></label>
      <input id="cg-name" type="text" value="${item?.name||''}" placeholder="예) 사외강사료"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가이드 설명 <span style="font-size:10px;color:#6B7280">(학습자 화면 노출)</span></label>
      <textarea id="cg-desc" rows="2"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;resize:none">${item?.desc||''}</textarea>
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">기준단가 (원)</label>
      <input id="cg-unit-price" type="number" value="${item?.unitPrice??''}" placeholder="0 = 직접 입력"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">정렬 순서</label>
      <input id="cg-order" type="number" value="${item?.sortOrder??99}" placeholder="99"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
  </div>

  <!-- 사용 단계 -->
  <div style="background:#F0FDF4;border-radius:10px;padding:14px;border:1.5px solid #A7F3D0">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">📋 사용 단계</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${[
        { val:'plan',   label:'계획 수립', color:'#1D4ED8', bg:'#EFF6FF' },
        { val:'apply',  label:'교육 신청', color:'#059669', bg:'#F0FDF4' },
        { val:'settle', label:'결과 보고', color:'#7C3AED', bg:'#F5F3FF' },
      ].map(s => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;cursor:pointer;
                    border:1.5px solid ${scopes.includes(s.val)?s.color:'#E5E7EB'};
                    background:${scopes.includes(s.val)?s.bg:'#fff'};flex:1">
        <input type="checkbox" id="cg-scope-${s.val}" value="${s.val}" ${scopes.includes(s.val)?'checked':''}
          style="accent-color:${s.color};width:14px;height:14px">
        <span style="font-size:12px;font-weight:800;color:${s.color}">${s.label}</span>
      </label>`).join('')}
    </div>
  </div>

  <!-- 교육 유형 -->
  <div style="background:#FFFBEB;border-radius:10px;padding:14px;border:1.5px solid #FDE68A">
    <div style="font-size:12px;font-weight:800;color:#92400E;margin-bottom:10px">🌏 교육 유형별 노출</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${[
        { val:'both',     label:'국내/해외 모두', color:'#374151', bg:'#F9FAFB' },
        { val:'domestic', label:'국내 전용',       color:'#2563EB', bg:'#EFF6FF' },
        { val:'overseas', label:'해외 전용',       color:'#D97706', bg:'#FFFBEB' },
      ].map(v => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;cursor:pointer;
                    border:1.5px solid ${visFor===v.val?v.color:'#E5E7EB'};
                    background:${visFor===v.val?v.bg:'#fff'};flex:1" onclick="cgSelectVisible('${v.val}')">
        <input type="radio" name="cg-visible" value="${v.val}" ${visFor===v.val?'checked':''}
          style="accent-color:${v.color}">
        <span style="font-size:12px;font-weight:800;color:${v.color}">${v.label}</span>
      </label>`).join('')}
    </div>
  </div>

  <!-- 상한액 -->
  <div style="background:#F9FAFB;border-radius:10px;padding:14px;border:1.5px solid #E5E7EB">
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px">🔒 상한액 설정</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      ${['none','soft','hard'].map(v => `
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;
                    border:1.5px solid ${lType===v?(v==='none'?'#10B981':v==='soft'?'#D97706':'#DC2626'):'#E5E7EB'};
                    background:${lType===v?(v==='none'?'#F0FDF4':v==='soft'?'#FFFBEB':'#FEF2F2'):'#fff'}"
             onclick="cgSelectLimitType('${v}')">
        <input type="radio" name="cg-limit-type" value="${v}" ${lType===v?'checked':''}
          style="accent-color:${v==='none'?'#10B981':v==='soft'?'#D97706':'#DC2626'}">
        <span style="font-size:12px;font-weight:700">
          ${v==='none'?'제한없음':v==='soft'?'⚠ Soft':'🚫 Hard'}
        </span>
      </label>`).join('')}
    </div>
    <div id="cg-limit-fields" style="display:${lType==='none'?'none':'grid'};grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#D97706;display:block;margin-bottom:4px">⚠ Soft Limit (원)</label>
        <input id="cg-soft-limit" type="number" value="${item?.softLimit||''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#DC2626;display:block;margin-bottom:4px">🚫 Hard Limit (원)</label>
        <input id="cg-hard-limit" type="number" value="${item?.hardLimit||''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FECACA;border-radius:8px;font-size:13px">
      </div>
    </div>
  </div>
</div>`;
}

function cgOnModalGroupChange(groupId) {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const g = (typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS.find(x => x.id === groupId) : null);
  const acctSel = document.getElementById('cg-acct');
  if (acctSel) {
    const accts = g?.ownedAccounts || [];
    acctSel.innerHTML = `<option value="">— 공유 항목 —</option>` +
      accts.map(code => `<option value="${code}">${code}</option>`).join('');
  }
}

// ─── 인터랙션 핸들러 ─────────────────────────────────────────────────────────
function cgSelectVisible(val) {
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => r.checked = r.value === val);
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => {
    const lbl = r.closest('label');
    if (!lbl) return;
    const m = CG_VISIBLE_META[r.value] || CG_VISIBLE_META.both;
    lbl.style.borderColor = r.checked ? m.color : '#E5E7EB';
    lbl.style.background  = r.checked ? m.bg : '#fff';
  });
}
function cgSelectLimitType(val) {
  document.querySelectorAll('input[name="cg-limit-type"]').forEach(r => r.checked = r.value === val);
  const f = document.getElementById('cg-limit-fields');
  if (f) f.style.display = val === 'none' ? 'none' : 'grid';
}

// ─── 저장 ─────────────────────────────────────────────────────────────────────
function cgSaveItem() {
  const name = document.getElementById('cg-name')?.value.trim();
  if (!name) { alert('항목명은 필수입니다.'); return; }
  const tenantId   = boCurrentPersona.tenantId || 'HMC';
  const groupId    = document.getElementById('cg-grp')?.value || null;
  const accountCode= document.getElementById('cg-acct')?.value || null;
  const scopes     = ['plan','apply','settle'].filter(s => document.getElementById(`cg-scope-${s}`)?.checked);
  if (!scopes.length) { alert('사용 단계를 최소 1개 선택하세요.'); return; }

  const obj = {
    name,
    desc:          document.getElementById('cg-desc')?.value.trim(),
    unitPrice:     Number(document.getElementById('cg-unit-price')?.value) || 0,
    limitType:     document.querySelector('input[name="cg-limit-type"]:checked')?.value || 'none',
    softLimit:     Number(document.getElementById('cg-soft-limit')?.value) || 0,
    hardLimit:     Number(document.getElementById('cg-hard-limit')?.value) || 0,
    usageScope:    scopes,
    visibleFor:    document.querySelector('input[name="cg-visible"]:checked')?.value || 'both',
    active:        true,
    tenantId,
    domainId: groupId || undefined,
    accountCode:   accountCode || undefined,
    sortOrder:     Number(document.getElementById('cg-order')?.value) || 99,
  };

  if (_cgEditId) {
    const idx = CALC_GROUNDS_MASTER.findIndex(g => g.id === _cgEditId);
    if (idx > -1) CALC_GROUNDS_MASTER[idx] = { ...CALC_GROUNDS_MASTER[idx], ...obj };
  } else {
    CALC_GROUNDS_MASTER.push({ id: 'CG' + Date.now(), ...obj });
  }
  cgCloseModal();
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount);
}

function cgToggleActive(id) {
  const item = CALC_GROUNDS_MASTER.find(g => g.id === id);
  if (item) item.active = item.active === false ? true : false;
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  document.getElementById('cg-content').innerHTML = _renderCgTable(tenantId, _cgFilterGroup, _cgFilterAccount);
}

// ─── 헬퍼: 양식 미리보기 및 FO 신청화면에서 세부산출근거 항목 가져오기 ─────────
// tenantId, domainId, accountCode 계층 순으로 항목 조합
function sbGetCalcGroundsForForm(tenantId, groupId, accountCode) {
  return CALC_GROUNDS_MASTER.filter(g => {
    if (g.active === false) return false;
    if (g.tenantId && g.tenantId !== tenantId) return false;
    if (g.domainId && g.domainId !== groupId) return false;
    if (g.accountCode && g.accountCode !== accountCode) return false;
    return true;
  });
}
window.sbGetCalcGroundsForForm = sbGetCalcGroundsForForm;
