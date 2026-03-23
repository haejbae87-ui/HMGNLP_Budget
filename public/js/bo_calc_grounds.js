// ─── 백오피스: 세부 산출 근거 관리 (Calculation Grounds) ─────────────────────
// 현재 페르소나의 ownedAccounts → CALC_ACCOUNT_GROUNDS 를 통해
// 해당 테넌트/역할에서 관리 가능한 항목 풀만 표시합니다.

let _cgActiveTab = null;   // 첫 진입 시 자동 결정
let _cgEditId    = null;

// ─── 사용 단계/교육유형 뱃지 헬퍼 ──────────────────────────────────────────────
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
  return scopes.map(s => {
    const m = CG_SCOPE_META[s] || { label: s, color: '#6B7280', bg: '#F9FAFB' };
    return `<span style="background:${m.bg};color:${m.color};padding:1px 6px;border-radius:5px;font-size:10px;font-weight:800;border:1px solid ${m.color}20">${m.label}</span>`;
  }).join(' ');
}

function _cgVisibleBadge(val = 'both') {
  const m = CG_VISIBLE_META[val] || CG_VISIBLE_META.both;
  return `<span style="background:${m.bg};color:${m.color};padding:1px 6px;border-radius:5px;font-size:10px;font-weight:700;border:1px solid ${m.color}20">${m.label}</span>`;
}

// ─── persona의 ownedAccounts 기반 사용 가능 계정유형 추출 ──────────────────────
function _cgGetPersonaAccountTypes() {
  const owned = boCurrentPersona.ownedAccounts || [];
  const typeMap = {};
  owned.forEach(code => {
    const cfg = CALC_ACCOUNT_GROUNDS[code];
    if (!cfg) return;
    if (!typeMap[cfg.accountType]) typeMap[cfg.accountType] = [];
    typeMap[cfg.accountType].push(code);
  });
  return typeMap;
}

// ─── 특정 계정유형에서 이 persona가 관리 가능한 항목 목록 ─────────────────────
function _cgGetItemsForType(type) {
  const owned = boCurrentPersona.ownedAccounts || [];
  const codes = owned.filter(code => {
    const cfg = CALC_ACCOUNT_GROUNDS[code];
    return cfg && cfg.accountType === type;
  });
  if (codes.length === 0) return [];

  const allItems = CALC_GROUNDS_MASTER.filter(g => g.accountTypes.includes(type));

  const hasUnrestricted = codes.some(code => {
    const cfg = CALC_ACCOUNT_GROUNDS[code];
    return !cfg.enabledItemIds || cfg.enabledItemIds.length === 0;
  });
  if (hasUnrestricted) return allItems;

  const allowedIds = new Set();
  codes.forEach(code => {
    const cfg = CALC_ACCOUNT_GROUNDS[code];
    if (cfg.enabledItemIds) cfg.enabledItemIds.forEach(id => allowedIds.add(id));
  });
  return allItems.filter(g => allowedIds.has(g.id));
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderCalcGrounds() {
  const tenantId    = boCurrentPersona.tenantId || 'HMC';
  const tenantName  = TENANTS.find(t => t.id === tenantId)?.name || tenantId;
  const typeMap     = _cgGetPersonaAccountTypes();
  const availTypes  = Object.keys(typeMap);

  if (!_cgActiveTab || !availTypes.includes(_cgActiveTab)) {
    _cgActiveTab = availTypes[0] || null;
  }

  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner==='function' ? boIsolationGroupBanner() : ''}
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">세부산출근거</span>
      <h1 class="bo-page-title" style="margin:0">세부 산출 근거 관리</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">
      계열사별 · 계정별 표준 항목 풀(Pool)을 독립적으로 구성합니다.
      각 항목은 <strong>사용 단계</strong>(계획·신청·결과)와 <strong>교육 유형</strong>(국내/해외)별 노출 여부를 설정할 수 있습니다.
    </p>
    <div style="margin-top:8px;padding:9px 14px;background:#EFF6FF;border-radius:8px;border:1px solid #BFDBFE;font-size:11px;color:#1D4ED8;font-weight:600;display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <span>관리 계정: ${(boCurrentPersona.ownedAccounts || []).map(c =>
        `<code style="background:#DBEAFE;color:#1D4ED8;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700">${c}</code>`
      ).join(' ')}</span>
      <span style="color:#D97706">|</span>
      <span>사용단계: ${_cgScopeBadges(['plan','apply','settle'])} 설정 가능</span>
      <span style="color:#D97706">|</span>
      <a onclick="boNavigate('approval-routing')" style="color:#D97706;text-decoration:underline;cursor:pointer">결재라인 설정 →</a>
    </div>
  </div>

  ${availTypes.length === 0 ? `
  <div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:14px;margin-bottom:4px">관리 가능한 예산 계정이 없습니다.</div>
  </div>` : `<div id="cg-content">${_renderCgContent(typeMap)}</div>`}
</div>

<!-- 항목 추가/수정 모달 -->
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

// ─── 탭 + 콘텐츠 렌더 ────────────────────────────────────────────────────────
function _renderCgContent(typeMap) {
  if (!typeMap) typeMap = _cgGetPersonaAccountTypes();
  const availTypes = Object.keys(typeMap);
  const TAB_META = {
    ops: { label: '운영계정 항목', color: '#1D4ED8', bg: '#EFF6FF' },
    etc: { label: '기타계정 항목', color: '#7C3AED', bg: '#F5F3FF' },
  };

  return `
<div>
  ${availTypes.length > 1 ? `
  <div style="display:flex;gap:8px;margin-bottom:20px">
    ${availTypes.map(t => {
      const m = TAB_META[t] || { label: t, color: '#374151', bg: '#F9FAFB' };
      return `
      <button onclick="_cgSetTab('${t}')"
        style="padding:8px 18px;border-radius:10px;font-size:12px;font-weight:800;
               border:1.5px solid ${_cgActiveTab === t ? m.color : '#E5E7EB'};
               background:${_cgActiveTab === t ? m.bg : '#fff'};
               color:${_cgActiveTab === t ? m.color : '#6B7280'};cursor:pointer;transition:all .15s">
        ${m.label}
        <span style="font-size:10px;margin-left:4px;opacity:.7">(${typeMap[t].join(', ')})</span>
      </button>`;
    }).join('')}
  </div>` : ''}
  ${_cgActiveTab ? _renderGroundsTable(_cgActiveTab, typeMap) : ''}
</div>`;
}

// ─── 항목 테이블 렌더 ────────────────────────────────────────────────────────
function _renderGroundsTable(type, typeMap) {
  if (!typeMap) typeMap = _cgGetPersonaAccountTypes();
  const codes  = typeMap[type] || [];
  const TAB_META = {
    ops: { label: '운영계정', color: '#1D4ED8', bg: '#EFF6FF' },
    etc: { label: '기타계정', color: '#7C3AED', bg: '#F5F3FF' },
  };
  const meta  = TAB_META[type] || { label: type, color: '#374151', bg: '#F9FAFB' };
  const items = _cgGetItemsForType(type);
  const count = items.filter(g => g.active).length;

  return `
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-weight:800;font-size:14px;color:${meta.color}">${meta.label} 항목 풀</span>
      <span class="bo-badge" style="background:${meta.bg};color:${meta.color};border:1px solid ${meta.color}40">${count}개 활성</span>
      <span style="font-size:11px;color:#9CA3AF">/ 총 ${items.length}개</span>
      ${codes.map(c => `<code style="background:${meta.bg};color:${meta.color};padding:1px 8px;border-radius:5px;font-size:10px;font-weight:700;border:1px solid ${meta.color}30">${c}</code>`).join('')}
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="cgOpenModal(null,'${type}')">+ 항목 추가</button>
  </div>

  <div class="bo-card" style="overflow:hidden">
    <table class="bo-table">
      <thead><tr>
        <th style="width:20px">#</th>
        <th>항목명</th>
        <th>가이드 설명</th>
        <th style="text-align:right">기준단가</th>
        <th style="text-align:center">사용 단계</th>
        <th style="text-align:center">교육 유형</th>
        <th style="text-align:center">상한액</th>
        <th style="text-align:center">상태</th>
        <th>관리</th>
      </tr></thead>
      <tbody>
        ${items.length === 0 ? `
        <tr><td colspan="9" style="text-align:center;padding:30px;color:#9CA3AF;font-size:13px">
          이 계정 유형의 항목이 없습니다.
        </td></tr>` : items.map((g, i) => `
        <tr style="${!g.active ? 'opacity:.45;' : ''}">
          <td style="color:#9CA3AF;font-size:11px">${i + 1}</td>
          <td>
            <div style="font-weight:700;font-size:13px;color:#111827">${g.name}</div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${g.id}</div>
          </td>
          <td style="font-size:11px;color:#6B7280;max-width:180px">${g.desc}</td>
          <td style="text-align:right;font-weight:700;font-size:12px">${g.unitPrice > 0 ? boFmt(g.unitPrice) + '원' : '<span style="color:#9CA3AF">—</span>'}</td>
          <td style="text-align:center">
            <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
              ${_cgScopeBadges(g.usageScope || ['plan','apply','settle'])}
            </div>
          </td>
          <td style="text-align:center">
            ${_cgVisibleBadge(g.visibleFor || 'both')}
          </td>
          <td style="text-align:center">
            ${g.limitType === 'none'
              ? '<span style="font-size:10px;color:#9CA3AF">제한없음</span>'
              : g.limitType === 'soft'
                ? `<span style="background:#FFFBEB;color:#D97706;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">⚠ Soft</span>
                   <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${g.softLimit > 0 ? boFmt(g.softLimit) + '원' : '—'}</div>`
                : `<span style="background:#FEF2F2;color:#DC2626;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">🚫 Hard</span>
                   <div style="font-size:10px;color:#9CA3AF;margin-top:1px">${g.hardLimit > 0 ? boFmt(g.hardLimit) + '원' : '—'}</div>`
            }
          </td>
          <td style="text-align:center">
            <span class="bo-badge ${g.active ? 'bo-badge-green' : 'bo-badge-gray'}">${g.active ? '활성' : '비활성'}</span>
          </td>
          <td>
            <div style="display:flex;gap:5px">
              <button class="bo-btn-secondary bo-btn-sm" onclick="cgOpenModal('${g.id}','${type}')">수정</button>
              <button class="bo-btn-secondary bo-btn-sm"
                onclick="cgToggleActive('${g.id}')"
                style="color:${g.active ? '#F59E0B' : '#059669'};border-color:${g.active ? '#F59E0B' : '#059669'}">
                ${g.active ? '비활성' : '활성화'}
              </button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- 범례 -->
  <div class="bo-card" style="padding:12px 18px;margin-top:10px;background:#F8FAFC;border-color:#E2E8F0">
    <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:11px;color:#374151;font-weight:600">
      <span>📋 사용 단계: ${_cgScopeBadges(['plan','apply','settle'])}
        — 체크된 단계에서만 입력 가능</span>
      <span>🌏 교육 유형: ${_cgVisibleBadge('both')} ${_cgVisibleBadge('domestic')} ${_cgVisibleBadge('overseas')}
        — 해외 교육 시 overseas·both 항목만 표시</span>
    </div>
    <div style="margin-top:6px;font-size:11px;color:#6B7280">
      💡 <strong>Soft Limit</strong>: 초과 시 사유 입력 후 진행 가능 &nbsp;|&nbsp;
         <strong>Hard Limit</strong>: 초과 시 저장 차단
    </div>
  </div>
</div>`;
}

// ─── 탭 전환 ─────────────────────────────────────────────────────────────────
function _cgSetTab(tab) {
  _cgActiveTab = tab;
  document.getElementById('cg-content').innerHTML = _renderCgContent();
}

// ─── 항목 모달 ───────────────────────────────────────────────────────────────
function cgOpenModal(id, type) {
  _cgEditId = id || null;
  const item = id ? CALC_GROUNDS_MASTER.find(g => g.id === id) : null;
  document.getElementById('cg-modal-title').textContent = id ? '산출 근거 항목 수정' : '산출 근거 항목 추가';
  document.getElementById('cg-modal-body').innerHTML = _cgModalBody(item, type);
  document.getElementById('cg-modal').style.display = 'flex';
}

function cgCloseModal() { document.getElementById('cg-modal').style.display = 'none'; }

function _cgModalBody(item, type) {
  const lType  = item?.limitType  || 'none';
  const scopes = item?.usageScope || ['plan', 'apply', 'settle'];
  const visFor = item?.visibleFor || 'both';
  const typeMap = _cgGetPersonaAccountTypes();
  const availTypes = Object.keys(typeMap);

  return `
<div style="display:flex;flex-direction:column;gap:16px">

  <!-- 기본 정보 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">항목명 <span style="color:#EF4444">*</span></label>
      <input id="cg-name" type="text" value="${item?.name || ''}" placeholder="예) 사외강사료"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="grid-column:1/-1">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가이드 설명 <span style="font-size:10px;color:#6B7280;font-weight:500">(학습자 화면 노출)</span></label>
      <textarea id="cg-desc" rows="2"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;resize:none"
        placeholder="항목에 대한 가이드 설명">${item?.desc || ''}</textarea>
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">기준단가 (원)</label>
      <input id="cg-unit-price" type="number" value="${item?.unitPrice ?? ''}" placeholder="0 = 직접 입력"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정 유형</label>
      <select id="cg-type" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        ${availTypes.map(t => `
        <option value="${t}" ${(item?.accountTypes?.[0] || type) === t ? 'selected' : ''}>
          ${t === 'ops' ? '운영계정 (ops)' : '기타계정 (etc)'}
          — ${(typeMap[t] || []).join(', ')}
        </option>`).join('')}
      </select>
    </div>
  </div>

  <!-- ① 사용 단계 설정 -->
  <div style="background:#F0FDF4;border-radius:10px;padding:14px;border:1.5px solid #A7F3D0">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">
      📋 사용 단계 설정 <span style="font-size:10px;font-weight:500;color:#059669">— 이 항목을 어떤 단계에서 입력할 수 있는지 선택</span>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${[
        { val: 'plan',   label: '계획 수립', desc: '교육계획서 작성 시', color: '#1D4ED8', bg: '#EFF6FF' },
        { val: 'apply',  label: '교육 신청', desc: '신청서 제출 시',     color: '#059669', bg: '#F0FDF4' },
        { val: 'settle', label: '결과 보고', desc: '정산·결과 입력 시',  color: '#7C3AED', bg: '#F5F3FF' },
      ].map(s => `
      <label style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;
                    border:1.5px solid ${scopes.includes(s.val) ? s.color : '#E5E7EB'};
                    background:${scopes.includes(s.val) ? s.bg : '#fff'};min-width:120px;flex:1">
        <input type="checkbox" id="cg-scope-${s.val}" value="${s.val}" ${scopes.includes(s.val) ? 'checked' : ''}
          style="margin-top:1px;accent-color:${s.color};width:14px;height:14px;flex-shrink:0">
        <div>
          <div style="font-size:12px;font-weight:800;color:${s.color}">${s.label}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:1px">${s.desc}</div>
        </div>
      </label>`).join('')}
    </div>
    <div style="margin-top:8px;font-size:11px;color:#059669">
      ✅ 나중에 교육계획 수립 화면, 신청 화면, 정산 화면에서 각각 해당 단계의 항목만 노출됩니다.
    </div>
  </div>

  <!-- ② 교육 유형별 노출 설정 -->
  <div style="background:#FFFBEB;border-radius:10px;padding:14px;border:1.5px solid #FDE68A">
    <div style="font-size:12px;font-weight:800;color:#92400E;margin-bottom:10px">
      🌏 교육 유형별 노출 설정 <span style="font-size:10px;font-weight:500;color:#D97706">— 국내/해외 교육 입력 시 어느 경우에 이 항목을 표시할지</span>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${[
        { val: 'both',     label: '국내/해외 모두', desc: '국내 집합·해외 연수 모두에서 표시',  color: '#374151', bg: '#F9FAFB' },
        { val: 'domestic', label: '국내 전용',       desc: '국내 교육에서만 표시 (예: 다과비)', color: '#2563EB', bg: '#EFF6FF' },
        { val: 'overseas', label: '해외 전용',       desc: '해외 교육에서만 표시 (예: 항공료)', color: '#D97706', bg: '#FFFBEB' },
      ].map(v => `
      <label style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-radius:10px;cursor:pointer;
                    border:1.5px solid ${visFor === v.val ? v.color : '#E5E7EB'};
                    background:${visFor === v.val ? v.bg : '#fff'};min-width:130px;flex:1"
             onclick="cgSelectVisible('${v.val}')">
        <input type="radio" name="cg-visible" value="${v.val}" ${visFor === v.val ? 'checked' : ''}
          style="margin-top:2px;accent-color:${v.color};flex-shrink:0">
        <div>
          <div style="font-size:12px;font-weight:800;color:${v.color}">${v.label}</div>
          <div style="font-size:10px;color:#6B7280;margin-top:1px">${v.desc}</div>
        </div>
      </label>`).join('')}
    </div>
    <div style="margin-top:8px;font-size:11px;color:#D97706">
      💡 향후 '항공료', '해외 숙박비' 같은 항목을 해외 전용으로 등록하면,
         해외 교육 입력 시에만 자동으로 해당 항목이 노출됩니다.
    </div>
  </div>

  <!-- ③ 상한액 설정 -->
  <div style="background:#F9FAFB;border-radius:10px;padding:14px;border:1.5px solid #E5E7EB">
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px">🔒 상한액(Ceiling) 설정</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      ${['none','soft','hard'].map(v => `
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;
                    border:1.5px solid ${lType === v ? (v === 'none' ? '#10B981' : v === 'soft' ? '#D97706' : '#DC2626') : '#E5E7EB'};
                    background:${lType === v ? (v === 'none' ? '#F0FDF4' : v === 'soft' ? '#FFFBEB' : '#FEF2F2') : '#fff'}"
             onclick="cgSelectLimitType('${v}')">
        <input type="radio" name="cg-limit-type" value="${v}" ${lType === v ? 'checked' : ''}
          style="accent-color:${v === 'none' ? '#10B981' : v === 'soft' ? '#D97706' : '#DC2626'}">
        <span style="font-size:12px;font-weight:700;color:${v === 'none' ? '#065F46' : v === 'soft' ? '#92400E' : '#991B1B'}">
          ${v === 'none' ? '제한없음' : v === 'soft' ? '⚠ Soft (경고 후 진행)' : '🚫 Hard (시스템 차단)'}
        </span>
      </label>`).join('')}
    </div>
    <div id="cg-limit-fields" style="display:${lType === 'none' ? 'none' : 'grid'};grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#D97706;display:block;margin-bottom:4px">⚠ Soft Limit (원)</label>
        <input id="cg-soft-limit" type="number" value="${item?.softLimit || ''}" placeholder="0 = 미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px;outline:none">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#DC2626;display:block;margin-bottom:4px">🚫 Hard Limit (원)</label>
        <input id="cg-hard-limit" type="number" value="${item?.hardLimit || ''}" placeholder="0 = 미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FECACA;border-radius:8px;font-size:13px;outline:none">
      </div>
    </div>
  </div>
</div>`;
}

// ─── 모달 인터랙션 핸들러 ─────────────────────────────────────────────────────
function cgSelectVisible(val) {
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => r.checked = (r.value === val));
  // 라벨 스타일 업데이트
  document.querySelectorAll('input[name="cg-visible"]').forEach(r => {
    const label = r.closest('label');
    if (!label) return;
    const m = CG_VISIBLE_META[r.value] || CG_VISIBLE_META.both;
    label.style.borderColor  = r.checked ? m.color : '#E5E7EB';
    label.style.background   = r.checked ? m.bg    : '#fff';
  });
}

function cgSelectLimitType(val) {
  document.querySelectorAll('input[name="cg-limit-type"]').forEach(r => r.checked = (r.value === val));
  const fields = document.getElementById('cg-limit-fields');
  if (fields) fields.style.display = val === 'none' ? 'none' : 'grid';
}

function cgSaveItem() {
  const name = document.getElementById('cg-name').value.trim();
  if (!name) { alert('항목명은 필수입니다.'); return; }

  // 사용 단계
  const scopes = ['plan','apply','settle'].filter(s =>
    document.getElementById(`cg-scope-${s}`)?.checked
  );
  if (scopes.length === 0) { alert('사용 단계를 최소 1개 이상 선택해야 합니다.'); return; }

  const limitType = document.querySelector('input[name="cg-limit-type"]:checked')?.value || 'none';
  const visibleFor = document.querySelector('input[name="cg-visible"]:checked')?.value || 'both';

  const obj = {
    name,
    desc: document.getElementById('cg-desc').value.trim(),
    unitPrice: Number(document.getElementById('cg-unit-price').value) || 0,
    accountTypes: [document.getElementById('cg-type').value],
    limitType,
    softLimit: Number(document.getElementById('cg-soft-limit')?.value) || 0,
    hardLimit: Number(document.getElementById('cg-hard-limit')?.value) || 0,
    active: true,
    usageScope: scopes,
    visibleFor,
  };

  if (_cgEditId) {
    const idx = CALC_GROUNDS_MASTER.findIndex(g => g.id === _cgEditId);
    if (idx > -1) CALC_GROUNDS_MASTER[idx] = { ...CALC_GROUNDS_MASTER[idx], ...obj };
  } else {
    const newId = 'CG' + String(Date.now()).slice(-6);
    CALC_GROUNDS_MASTER.push({ id: newId, ...obj });
  }
  cgCloseModal();
  document.getElementById('cg-content').innerHTML = _renderCgContent();
}

function cgToggleActive(id) {
  const item = CALC_GROUNDS_MASTER.find(g => g.id === id);
  if (item) item.active = !item.active;
  document.getElementById('cg-content').innerHTML = _renderCgContent();
}
