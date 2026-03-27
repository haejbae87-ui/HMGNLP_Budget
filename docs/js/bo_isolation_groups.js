// ─── 통합 격리그룹 관리 ───────────────────────────────────────────────────────
// 역할별 통합 뷰:
//   platform_admin      → 테넌트 선택 + 전체 격리그룹 CRUD + 총괄/운영 담당자 복수 매핑
//   tenant_global_admin → 내 테넌트 격리그룹 생성 + 총괄/운영 담당자 복수 매핑
//   budget_global_admin → 내 담당 그룹만 표시 + 운영 담당자 복수 매핑
// renderMyIsolationGroups()는 budget_global_admin 전용 진입점 (동일 함수로 리다이렉트)

let _igModal = false;
let _igEditGroupId = null;      // 편집 중인 그룹 ID
let _igAddAdminModal = false;   // 예산총괄 추가 모달
let _igAddAdminCandidates = []; // 예산총괄 후보 (DB 조회 결과 캐시)
let _igAddOpModal = false;      // 예산운영 추가 모달
let _igTargetGroupId = null;    // 액션 대상 그룹 ID
let _igPlatformTenantId = null; // 플랫폼 총괄: 선택된 테넌트
let _igNewModalTenantId = null; // 생성 모달: 선택된 테넌트 (플랫폼총괄용)

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────────
function _igPersonaChip(key, color, onRemoveFn) {
  const p = BO_PERSONAS[key];
  if (!p) return '';
  return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
    border-radius:20px;background:${color}15;border:1px solid ${color}40;font-size:11px;font-weight:700;color:${color}">
    ${p.name}
    <span style="font-size:9px;opacity:.65">${p.dept}</span>
    ${onRemoveFn ? `<span onclick="${onRemoveFn}('${key}')" style="cursor:pointer;font-size:12px;opacity:.5;margin-left:2px" title="제거">✕</span>` : ''}
  </span>`;
}

function _igGetTenantId() {
  const role = boCurrentPersona?.role;
  if (role === 'platform_admin') {
    return _igPlatformTenantId || (typeof TENANTS !== 'undefined' && TENANTS[0]?.id) || 'HMC';
  }
  return boCurrentPersona.tenantId;
}

// ── 메인 진입점 ────────────────────────────────────────────────────────────────
function renderIsolationGroups() {
  const persona = boCurrentPersona;
  const el = document.getElementById('bo-content');
  const role = persona.role;
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';

  let html = '';
  if (role === 'platform_admin') {
    html = _renderPlatformAdminView(persona, personaKey);
  } else if (role === 'tenant_global_admin') {
    html = _renderTenantAdminView(persona, personaKey);
  } else if (role === 'budget_global_admin') {
    html = _renderBudgetAdminView(persona, personaKey);
  } else {
    html = '<div style="padding:60px;text-align:center;color:#9CA3AF">이 페이지에 대한 접근 권한이 없습니다.</div>';
  }

  el.innerHTML = html;
  if (_igModal)           el.innerHTML += _renderCreateGroupModal(persona);
  if (_igEditGroupId)     el.innerHTML += _renderEditGroupModal(persona);
  if (_igAddAdminModal)   el.innerHTML += _renderAddAdminModal(persona);
  if (_igAddOpModal)      el.innerHTML += _renderAddOpModal(persona, personaKey);
}

// 예산 총괄 전용 진입 별칭 (메뉴 라우팅 호환)
function renderMyIsolationGroups() { renderIsolationGroups(); }

// ══════════════════════════════════════════════════════════════════════════════
// ① 플랫폼 총괄 뷰
//    테넌트 선택 → 해당 테넌트 격리그룹 목록 + 전체 CRUD + 담당자 복수 매핑
// ══════════════════════════════════════════════════════════════════════════════
function _renderPlatformAdminView(persona, personaKey) {
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const selTenantId = _igGetTenantId();
  const myGroups = ISOLATION_GROUPS.filter(g => g.tenantId === selTenantId);

  const tenantSelect = `
<div style="display:flex;align-items:center;gap:10px;padding:12px 18px;
            background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin-bottom:24px;flex-wrap:wrap">
  <span style="font-size:11px;font-weight:900;color:#92400E">🏢 회사 선택</span>
  <select onchange="_igPlatformTenantId=this.value;renderIsolationGroups()"
    style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;
           background:#fff;color:#92400E;cursor:pointer">
    ${tenants.map(t => `<option value="${t.id}" ${t.id===selTenantId?'selected':''}>${t.name} (${t.id})</option>`).join('')}
  </select>
  <span style="font-size:10px;color:#9CA3AF">${myGroups.length}개 격리그룹</span>
</div>`;

  const cards = _renderGroupCards(myGroups, 'platform', persona, personaKey);

  return `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">🛡️ 격리그룹 관리</h1>
      <p class="bo-page-sub">테넌트별 예산 격리그룹을 생성하고, 예산총괄·운영담당자를 복수로 지정합니다.</p>
    </div>
    <button onclick="_igModal=true;renderIsolationGroups()" class="bo-btn-primary"
      style="display:flex;align-items:center;gap:6px;padding:10px 18px;white-space:nowrap">
      <span style="font-size:16px">+</span> 새 격리그룹 만들기
    </button>
  </div>
  ${tenantSelect}
  <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;
              letter-spacing:.05em;margin-bottom:12px">
    ${TENANTS.find(t=>t.id===selTenantId)?.name||selTenantId} 격리그룹 (${myGroups.length}개)
  </div>
  ${cards}
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ② 테넌트 총괄 뷰
//    격리그룹 생성 + 예산총괄(복수) + 예산운영(복수) 매핑
// ══════════════════════════════════════════════════════════════════════════════
function _renderTenantAdminView(persona, personaKey) {
  const myGroups = ISOLATION_GROUPS.filter(g => g.tenantId === persona.tenantId);
  const cards = _renderGroupCards(myGroups, 'tenant', persona, personaKey);

  return `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">🛡️ 격리그룹 관리</h1>
      <p class="bo-page-sub">격리그룹을 생성하고 <strong>예산총괄 담당자</strong>와 <strong>예산운영 담당자</strong>를 복수로 지정합니다.</p>
    </div>
    <button onclick="_igModal=true;renderIsolationGroups()" class="bo-btn-primary"
      style="display:flex;align-items:center;gap:6px;padding:10px 18px;white-space:nowrap">
      <span style="font-size:16px">+</span> 새 격리그룹 만들기
    </button>
  </div>

  <!-- 역할 안내 배너 -->
  <div style="display:flex;gap:0;margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid #FDE68A">
    <div style="flex:1;padding:12px 16px;background:#FEF3C7">
      <div style="font-size:10px;font-weight:900;color:#92400E;margin-bottom:3px">① 테넌트 총괄 (현재 역할)</div>
      <div style="font-size:11px;color:#78350F">✅ <strong>격리그룹 생성</strong> + <strong>예산총괄 복수 지정</strong> + <strong>예산운영 복수 지정</strong></div>
    </div>
    <div style="width:1px;background:#FDE68A"></div>
    <div style="flex:1;padding:12px 16px;background:#fafafa">
      <div style="font-size:10px;font-weight:900;color:#7C3AED;margin-bottom:3px">② 예산 총괄 (담당자별 업무)</div>
      <div style="font-size:11px;color:#9CA3AF">자신의 담당 그룹에 운영 담당자 추가 가능</div>
    </div>
    <div style="width:1px;background:#E5E7EB"></div>
    <div style="flex:1;padding:12px 16px;background:#fafafa">
      <div style="font-size:10px;font-weight:900;color:#1D4ED8;margin-bottom:3px">③ 예산 운영 (담당 업무)</div>
      <div style="font-size:11px;color:#9CA3AF">계획/신청/결과 승인 처리</div>
    </div>
  </div>

  <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;
              letter-spacing:.05em;margin-bottom:12px">격리그룹 목록 (${myGroups.length}개)</div>
  ${cards}
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ③ 예산 총괄 뷰
//    자신이 globalAdminKeys에 포함된 그룹만 표시 + 예산운영 담당자 복수 매핑
// ══════════════════════════════════════════════════════════════════════════════
function _renderBudgetAdminView(persona, personaKey) {
  const myGroups = ISOLATION_GROUPS.filter(g =>
    g.tenantId === persona.tenantId &&
    (g.globalAdminKeys || [g.globalAdminKey]).includes(personaKey)
  );

  if (myGroups.length === 0) {
    return `
<div class="bo-fade">
  <h1 class="bo-page-title">🔒 내 격리그룹 관리</h1>
  <p class="bo-page-sub">자신이 예산총괄도 지정된 격리그룹의 운영담당자를 관리합니다.</p>
  <div style="padding:50px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px solid #E5E7EB">
    <div style="font-size:32px;margin-bottom:8px">🛡️</div>
    <div style="font-weight:700;font-size:14px;color:#374151">배정된 격리그룹이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF;margin-top:6px">테넌트 총괄 담당자에게 격리그룹 배정을 요청하세요</div>
  </div>
</div>`;
  }

  const cards = _renderGroupCards(myGroups, 'budget', persona, personaKey);

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <h1 class="bo-page-title">🔒 내 격리그룹 관리</h1>
    <p class="bo-page-sub">내가 예산총괄로 지정된 격리그룹의 <strong>운영담당자를 등록</strong>하고 가상조직 노드에 배정합니다.</p>
  </div>
  ${cards}
</div>`;
}

// ── 공통 그룹 카드 렌더러 ──────────────────────────────────────────────────────
function _renderGroupCards(groups, viewMode, persona, personaKey) {
  if (!groups.length) {
    return '<div style="padding:40px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:12px">생성된 격리그룹이 없습니다.</div>';
  }

  return groups.map(g => {
    const admins = (g.globalAdminKeys || [g.globalAdminKey].filter(Boolean))
      .map(k => BO_PERSONAS[k]).filter(Boolean);
    const opCount = g.opManagerKeys.length;
    const accts = g.ownedAccounts || [];
    const canEditAdmins = (viewMode === 'platform' || viewMode === 'tenant');
    const canEditOps = (viewMode === 'platform' || viewMode === 'tenant' ||
      (viewMode === 'budget' && (g.globalAdminKeys||[g.globalAdminKey]).includes(personaKey)));

    // 예산총괄 담당자 칩
    const adminChips = admins.map(adm => {
      const aKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === adm);
      return canEditAdmins
        ? _igPersonaChip(aKey, '#7C3AED', `_igRemoveAdmin('${g.id}',`)
        : _igPersonaChip(aKey, '#7C3AED', null);
    }).join('');

    // 예산운영 담당자 카드 (가상조직 매핑 포함)
    const opCards = g.opManagerKeys.map(k => {
      const p = BO_PERSONAS[k];
      if (!p) return '';
      const vorgNodes = _igGetVOrgAssignments(k, g.id);
      const vorgBadges = vorgNodes.map(n =>
        `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:12px;
          background:#F0FDF4;border:1px solid #86EFAC;font-size:10px;font-weight:700;color:#065F46">
          🏢 ${n.tplName} · ${n.nodeName}
        </span>`
      ).join('');
      const vorgSection = vorgNodes.length > 0
        ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${vorgBadges}</div>`
        : `<div style="margin-top:5px;display:flex;align-items:center;gap:6px">
            <span style="font-size:10px;color:#9CA3AF">🏢 담당 가상조직 없음</span>
            <button onclick="boNavigate('virtual-org')"
              style="font-size:10px;padding:2px 8px;border-radius:6px;border:1px solid #D1FAE5;
                     background:#F0FDF4;color:#059669;cursor:pointer;font-weight:700">
              → 가상조직 배정
            </button>
          </div>`;

      return `
<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;
            background:#F8FAFF;border-radius:10px;border:1px solid #E0E7FF;margin-bottom:6px">
  <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-weight:800;font-size:12px;color:#111827">${p.name}</span>
      <span style="font-size:10px;color:#9CA3AF">${p.dept} · ${p.pos}</span>
      <span style="font-size:9px;padding:2px 7px;border-radius:6px;background:#EFF6FF;
                   color:#1D4ED8;font-weight:700;border:1px solid #BFDBFE">운영</span>
      ${vorgNodes.length > 0 ? `<span style="font-size:9px;padding:2px 7px;border-radius:6px;
        background:#D1FAE5;color:#065F46;font-weight:700">🏢 ${vorgNodes.length}개 조직 담당</span>` : ''}
    </div>
    ${vorgSection}
  </div>
  ${canEditOps ? `<button onclick="_igRemoveOpManager('${g.id}','${k}')"
    style="font-size:11px;padding:4px 8px;border-radius:7px;border:1px solid #FECACA;
           background:#FEF2F2;color:#EF4444;cursor:pointer;font-weight:700;flex-shrink:0">제거</button>` : ''}
</div>`;
    }).join('');

    return `
<div class="bo-card" style="padding:22px;margin-bottom:16px;border-left:4px solid ${g.color||'#6366F1'}">
  <!-- 헤더 -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:16px">🛡️</span>
        <span style="font-weight:900;font-size:15px;color:#111827">${g.name}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:8px;
          background:${g.status==='active'?'#D1FAE5':'#F3F4F6'};
          color:${g.status==='active'?'#065F46':'#9CA3AF'}">${g.status==='active'?'✅ 운영중':'⏸️ 중지'}</span>
      </div>
      <div style="font-size:11px;color:#6B7280">${g.desc}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div style="font-size:9px;color:#9CA3AF;margin-bottom:2px">${g.id}</div>
      <div style="font-size:9px;color:#9CA3AF;margin-bottom:8px">${g.createdAt}</div>
      ${canEditAdmins ? `
      <button onclick="_igEditGroupId='${g.id}';renderIsolationGroups()"
        style="font-size:11px;padding:5px 10px;border-radius:8px;border:1.5px solid #E5E7EB;
               background:white;cursor:pointer;font-weight:700">✏️ 그룹 수정</button>` : ''}
    </div>
  </div>

  <!-- 예산 계정 -->
  <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:16px">
    ${accts.map(a=>`<span style="font-size:10px;padding:2px 8px;border-radius:6px;
      background:#F0FDF4;border:1px solid #86EFAC;color:#065F46;font-weight:700">${a}</span>`).join('')}
    ${accts.length===0 ? '<span style="font-size:10px;color:#9CA3AF">계정 미설정</span>' : ''}
  </div>

  <!-- 예산 총괄 담당자 섹션 -->
  <div style="border-top:1px solid #F3F4F6;padding-top:14px;margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <span style="font-size:11px;font-weight:900;color:#7C3AED">🔑 예산총괄 담당자</span>
        <span style="font-size:10px;color:#9CA3AF;margin-left:6px">${admins.length}명</span>
      </div>
      ${canEditAdmins ? `
      <button onclick="_igOpenAdminModal('${g.id}')"
        style="font-size:11px;padding:5px 12px;border-radius:8px;border:1.5px solid #DDD6FE;
               background:#F5F3FF;color:#7C3AED;cursor:pointer;font-weight:700;white-space:nowrap">
        + 총괄 담당자 추가
      </button>` : ''}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;min-height:24px">
      ${adminChips || '<span style="font-size:11px;color:#EF4444;font-weight:700">⚠️ 미선임 — 총괄 담당자를 지정하세요</span>'}
    </div>
  </div>

  <!-- 예산 운영 담당자 섹션 (가상조직 매핑 포함) -->
  <div style="border-top:1px solid #F3F4F6;padding-top:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <span style="font-size:11px;font-weight:900;color:#1D4ED8">👤 예산운영 담당자</span>
        <span style="font-size:10px;color:#9CA3AF;margin-left:6px">${opCount}명</span>
      </div>
      ${canEditOps ? `
      <button onclick="_igAddOpModal=true;_igTargetGroupId='${g.id}';renderIsolationGroups()"
        style="font-size:11px;padding:5px 12px;border-radius:8px;border:1.5px solid #BFDBFE;
               background:#EFF6FF;color:#1D4ED8;cursor:pointer;font-weight:700;white-space:nowrap">
        + 운영 담당자 추가
      </button>` : ''}
    </div>
    <div>
      ${opCards || `<div style="padding:16px;text-align:center;background:#F9FAFB;border-radius:10px;
          border:1px dashed #D1D5DB;color:#9CA3AF">
        <div style="font-size:12px;font-weight:700">
          ${canEditOps ? '아직 등록된 운영담당자가 없습니다 — 위 버튼으로 추가하세요' : '운영담당자 미등록'}
        </div>
      </div>`}
    </div>
  </div>
</div>`;
  }).join('');
}

// ── 가상조직 배정 현황 조회 헬퍼 ─────────────────────────────────────────────
// opKey: 운영담당자 persona key
// isolationGroupId: 격리그룹 ID (해당 그룹의 템플릿만 조회)
function _igGetVOrgAssignments(opKey, isolationGroupId) {
  if (typeof VIRTUAL_ORG_TEMPLATES === 'undefined') return [];
  const results = [];
  const templates = isolationGroupId
    ? VIRTUAL_ORG_TEMPLATES.filter(t => t.isolationGroupId === isolationGroupId)
    : VIRTUAL_ORG_TEMPLATES;
  templates.forEach(tpl => {
    const nodes = [
      ...(tpl.tree?.hqs     || []),
      ...(tpl.tree?.centers || [])
    ];
    nodes.forEach(n => {
      if (n.managerPersonaKey === opKey) {
        results.push({ tplName: tpl.name, nodeName: n.name });
      }
    });
  });
  return results;
}

// ── 검색 필터 헬퍼 (담당자 검색 리스트 렌더) ─────────────────────────────────
function _igSearchList(inputId, listId, candidates, checkboxName, accentColor, badgeLabel) {
  return `
<div style="margin-bottom:4px">
  <div style="position:relative">
    <input id="${inputId}" type="text" placeholder="이름 또는 부서 검색..."
      oninput="_igFilterList('${inputId}','${listId}')"
      style="width:100%;box-sizing:border-box;padding:9px 14px 9px 36px;
             border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;outline:none"
      onfocus="this.style.borderColor='${accentColor}'" onblur="this.style.borderColor='#E5E7EB'">
    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9CA3AF;font-size:13px">🔍</span>
  </div>
</div>
<div id="${listId}" style="display:flex;flex-direction:column;gap:5px;max-height:200px;
     overflow-y:auto;border:1.5px solid ${accentColor}30;border-radius:10px;padding:8px">
  ${candidates.length ? candidates.map(([k,p]) => `
  <label data-name="${p.name}" data-dept="${p.dept||''}"
    style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;
           cursor:pointer;border:1px solid #F3F4F6;transition:all .12s"
    onmouseover="this.style.background='${accentColor}08';this.style.borderColor='${accentColor}40'"
    onmouseout="this.style.background='';this.style.borderColor='#F3F4F6'">
    <input type="checkbox" name="${checkboxName}" value="${k}"
      style="accent-color:${accentColor};width:15px;height:15px;flex-shrink:0">
    <div style="flex:1;min-width:0">
      <div style="font-weight:800;font-size:12px;color:#111827">${p.name}</div>
      <div style="font-size:10px;color:#9CA3AF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${p.dept||''} · ${p.pos||''}
      </div>
    </div>
    <span style="font-size:9px;padding:2px 7px;border-radius:6px;flex-shrink:0;
                 background:${accentColor}12;color:${accentColor};font-weight:700;border:1px solid ${accentColor}30">
      ${badgeLabel}
    </span>
  </label>`).join('') : `<div style="padding:16px;text-align:center;color:#9CA3AF;font-size:11px">해당하는 담당자가 없습니다</div>`}
</div>
<div style="font-size:10px;color:#9CA3AF;margin-top:4px">총 ${candidates.length}명 · 검색으로 찾아 선택하세요</div>`;
}

function _igFilterList(inputId, listId) {
  const q = document.getElementById(inputId)?.value?.toLowerCase() || '';
  document.querySelectorAll(`#${listId} label[data-name]`).forEach(el => {
    const name = (el.dataset.name||'').toLowerCase();
    const dept = (el.dataset.dept||'').toLowerCase();
    el.style.display = (!q || name.includes(q) || dept.includes(q)) ? '' : 'none';
  });
}

// ── 생성 모달 테넌트 변경 콜백 ────────────────────────────────────────────────
function _igCreateModalChangeTenant(tenantId) {
  _igNewModalTenantId = tenantId;
  // 예산총괄 리스트 갱신
  const adminCandidates = Object.entries(BO_PERSONAS).filter(([k,p]) =>
    p.tenantId === tenantId && (p.role === 'budget_global_admin' || p.dualRole === 'budget_global_admin')
  );
  const adminList = document.getElementById('ig-admin-list');
  const adminInput = document.getElementById('ig-admin-search');
  if (adminInput) adminInput.value = '';
  if (adminList) {
    adminList.innerHTML = adminCandidates.length ? adminCandidates.map(([k,p]) =>
      `<label data-name="${p.name}" data-dept="${p.dept||''}"
        style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;
               cursor:pointer;border:1px solid #F3F4F6"
        onmouseover="this.style.background='#F5F3FF';this.style.borderColor='#DDD6FE'"
        onmouseout="this.style.background='';this.style.borderColor='#F3F4F6'">
        <input type="checkbox" name="ig-new-admins" value="${k}" style="accent-color:#7C3AED;width:15px;height:15px;flex-shrink:0">
        <div style="flex:1">
          <div style="font-weight:800;font-size:12px;color:#111827">${p.name}</div>
          <div style="font-size:10px;color:#9CA3AF">${p.dept||''} · ${p.pos||''}</div>
        </div>
        <span style="font-size:9px;padding:2px 7px;border-radius:6px;background:#F5F3FF;color:#7C3AED;font-weight:700;border:1px solid #DDD6FE">총괄</span>
      </label>`).join('') : '<div style="padding:16px;text-align:center;color:#9CA3AF;font-size:11px">등록 가능한 예산총괄 담당자가 없습니다</div>';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 새 격리그룹 생성
// ══════════════════════════════════════════════════════════════════════════════
function _renderCreateGroupModal(persona) {
  const isPlatform = persona.role === 'platform_admin';
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  // 테넌트 결정: 플랫폼총괄=_igNewModalTenantId(선택) or 첫번째, 테넌트총괄=고정
  const fixedTenantId = persona.tenantId;
  const selTenantId = isPlatform
    ? (_igNewModalTenantId || tenants[0]?.id || 'HMC')
    : fixedTenantId;
  const selTenantName = tenants.find(t => t.id === selTenantId)?.name || selTenantId;

  const adminCandidates = Object.entries(BO_PERSONAS).filter(([k,p]) =>
    p.tenantId === selTenantId && (p.role === 'budget_global_admin' || p.dualRole === 'budget_global_admin')
  );

  const tenantSection = isPlatform ? `
<div>
  <label class="bo-label">테넌트(회사) 선택 <span style="color:#EF4444">*</span></label>
  <select id="ig-new-tenant" onchange="_igCreateModalChangeTenant(this.value)"
    style="width:100%;border:1.5px solid #FDE68A;border-radius:10px;padding:10px 14px;
           font-size:13px;font-weight:700;color:#92400E;background:#FFFBEB;box-sizing:border-box">
    ${tenants.map(t => `<option value="${t.id}" ${t.id===selTenantId?'selected':''}>${t.name} (${t.id})</option>`).join('')}
  </select>
</div>` : `
<div style="padding:10px 14px;background:#F0FDF4;border-radius:10px;border:1px solid #A7F3D0;
            display:flex;align-items:center;gap:8px">
  <span style="font-size:12px">🏢</span>
  <span style="font-size:12px;font-weight:700;color:#065F46">${selTenantName}</span>
  <span style="font-size:10px;color:#6B7280">(소속 테넌트 자동 적용)</span>
</div>`;

  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h3 style="font-weight:900;font-size:17px;margin:0">🛡️ 새 격리그룹 만들기</h3>
      <button onclick="_igModal=false;_igNewModalTenantId=null;renderIsolationGroups()"
        style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>

    <div style="display:grid;gap:16px">
      ${tenantSection}
      <div>
        <label class="bo-label">그룹명 <span style="color:#EF4444">*</span></label>
        <input id="ig-name" type="text" placeholder='예: "HMC 글로벌교육 그룹"'
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;
                 font-size:13px;font-weight:700;box-sizing:border-box"/>
      </div>
      <div>
        <label class="bo-label">그룹 설명</label>
        <textarea id="ig-desc" rows="2" placeholder="이 격리그룹의 관리 범위를 설명하세요."
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;
                 font-size:12px;resize:none;box-sizing:border-box"></textarea>
      </div>
      <div>
        <label class="bo-label" style="display:flex;align-items:center;gap:6px">
          🔑 예산총괄 담당자 지정
          <span style="font-size:10px;color:#7C3AED;font-weight:600">(복수 선택 가능)</span>
        </label>
        ${_igSearchList('ig-admin-search', 'ig-admin-list', adminCandidates, 'ig-new-admins', '#7C3AED', '총괄')}
      </div>
      <div style="padding:12px;background:#FEF3C7;border-radius:10px;border:1px solid #FDE68A;
                  font-size:11px;color:#78350F;line-height:1.6">
        ⚠️ 서로 다른 그룹의 데이터는 상호 열람 불가입니다.<br>
        💡 예산운영 담당자는 <strong>그룹 생성 후</strong> 카드에서 추가할 수 있습니다.
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:20px">
      <button onclick="_igModal=false;_igNewModalTenantId=null;renderIsolationGroups()"
        style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">
        취소</button>
      <button onclick="_saveNewIsolationGroup()" class="bo-btn-primary" style="padding:10px 24px">
        ✅ 격리그룹 생성
      </button>
    </div>
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 그룹 수정 (이름/설명/계정)
// ══════════════════════════════════════════════════════════════════════════════
function _renderEditGroupModal(persona) {
  const g = ISOLATION_GROUPS.find(x => x.id === _igEditGroupId);
  if (!g) { _igEditGroupId = null; return ''; }
  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:480px;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h3 style="font-weight:900;font-size:17px;margin:0">✏️ 격리그룹 수정</h3>
      <button onclick="_igEditGroupId=null;renderIsolationGroups()"
        style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <label class="bo-label">그룹명 <span style="color:#EF4444">*</span></label>
        <input id="ig-edit-name" type="text" value="${g.name}"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;
                 font-size:13px;font-weight:700;box-sizing:border-box"/>
      </div>
      <div>
        <label class="bo-label">그룹 설명</label>
        <textarea id="ig-edit-desc" rows="2"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;
                 font-size:12px;resize:none;box-sizing:border-box">${g.desc}</textarea>
      </div>
      <div>
        <label class="bo-label">운영 상태</label>
        <select id="ig-edit-status"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px">
          <option value="active" ${g.status==='active'?'selected':''}>✅ 운영중</option>
          <option value="paused" ${g.status!=='active'?'selected':''}>⏸️ 중지</option>
        </select>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:20px">
      <button onclick="_igEditGroupId=null;renderIsolationGroups()"
        style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">
        취소</button>
      <button onclick="_igSaveEditGroup()" class="bo-btn-primary" style="padding:10px 24px">✅ 저장</button>
    </div>
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 예산총괄 담당자 추가 (검색 필터 UI)
// ══════════════════════════════════════════════════════════════════════════════
function _renderAddAdminModal(persona) {
  const g = ISOLATION_GROUPS.find(x => x.id === _igTargetGroupId);
  if (!g) { _igAddAdminModal = false; return ''; }
  const tenantId = g.tenantId;
  const existing = g.globalAdminKeys || [g.globalAdminKey].filter(Boolean);

  // BO_PERSONAS 기반 후보 (기본)
  const boPersonaCandidates = Object.entries(BO_PERSONAS).filter(([k,p]) =>
    p.tenantId === tenantId &&
    (p.role === 'budget_global_admin' || p.dualRole === 'budget_global_admin') &&
    !existing.includes(k)
  );

  // DB 조회 결과(_igAddAdminCandidates)와 병합 - 중복 제거
  const dbCandidates = (_igAddAdminCandidates || []).filter(([k]) => !existing.includes(k) && !boPersonaCandidates.find(([bk]) => bk === k));
  const candidates = [...boPersonaCandidates, ...dbCandidates];

  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:520px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div>
        <h3 style="font-weight:900;font-size:16px;margin:0">🔑 예산총괄 담당자 추가</h3>
        <div style="font-size:11px;color:#7C3AED;margin-top:3px">📌 ${g.name}</div>
      </div>
      <button onclick="_igAddAdminModal=false;renderIsolationGroups()"
        style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="font-size:11px;color:#6B7280;margin-bottom:16px;padding:8px 12px;
                background:#F5F3FF;border-radius:8px;border-left:3px solid #7C3AED">
      이름이나 부서명으로 검색하여 담당자를 선택하세요. 복수 선택 가능합니다.
    </div>
    ${_igSearchList('ig-admin-search', 'ig-admin-list', candidates, 'ig-admin-candidate', '#7C3AED', '총괄')}
    ${!candidates.length ? '' : `
    <div style="display:flex;justify-content:space-between;margin-top:16px">
      <button onclick="_igAddAdminModal=false;renderIsolationGroups()"
        style="padding:9px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_igConfirmAddAdmin()" class="bo-btn-primary" style="padding:9px 20px">✅ 선택 추가</button>
    </div>`}
    ${candidates.length ? '' : `
    <div style="text-align:right;margin-top:12px">
      <button onclick="_igAddAdminModal=false;renderIsolationGroups()"
        style="padding:9px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">닫기</button>
    </div>`}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 예산운영 담당자 추가 (검색 필터 UI)
// ══════════════════════════════════════════════════════════════════════════════
function _renderAddOpModal(persona, personaKey) {
  const g = ISOLATION_GROUPS.find(x => x.id === _igTargetGroupId);
  if (!g) { _igAddOpModal = false; return ''; }
  const candidates = Object.entries(BO_PERSONAS).filter(([k,p]) =>
    p.tenantId === g.tenantId &&
    (p.role === 'budget_op_manager' || (p.roles||[]).includes('budget_op_manager')) &&
    !g.opManagerKeys.includes(k)
  );

  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:520px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div>
        <h3 style="font-weight:900;font-size:16px;margin:0">👤 예산운영 담당자 추가</h3>
        <div style="font-size:11px;color:#1D4ED8;margin-top:3px">📌 ${g.name}</div>
      </div>
      <button onclick="_igAddOpModal=false;renderIsolationGroups()"
        style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="font-size:11px;color:#6B7280;margin-bottom:16px;padding:8px 12px;
                background:#EFF6FF;border-radius:8px;border-left:3px solid #1D4ED8">
      이름이나 부서명으로 검색하여 담당자를 선택하세요. 복수 선택 가능합니다.
    </div>
    ${_igSearchList('ig-op-search', 'ig-op-list', candidates, 'ig-op-candidate', '#1D4ED8', '운영')}
    ${!candidates.length ? '' : `
    <div style="display:flex;justify-content:space-between;margin-top:16px">
      <button onclick="_igAddOpModal=false;renderIsolationGroups()"
        style="padding:9px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_igConfirmAddOp()" class="bo-btn-primary" style="padding:9px 20px">✅ 선택 추가</button>
    </div>`}
    ${candidates.length ? '' : `
    <div style="text-align:right;margin-top:12px">
      <button onclick="_igAddOpModal=false;renderIsolationGroups()"
        style="padding:9px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">닫기</button>
    </div>`}
  </div>
</div>`;
}

// ── 액션 함수들 ────────────────────────────────────────────────────────────────
function _saveNewIsolationGroup() {
  const name = document.getElementById('ig-name')?.value?.trim();
  const desc = document.getElementById('ig-desc')?.value?.trim();
  if (!name) { alert('그룹명을 입력하세요.'); return; }

  const adminKeys = [...document.querySelectorAll('input[name="ig-new-admins"]:checked')].map(el => el.value);

  // 플랫폼총괄: 모달에서 선택한 테넌트 / 그 외: 소속 테넌트
  const isPlatform = boCurrentPersona.role === 'platform_admin';
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  let tenantId;
  if (isPlatform) {
    tenantId = _igNewModalTenantId || document.getElementById('ig-new-tenant')?.value || tenants[0]?.id || 'HMC';
  } else {
    tenantId = boCurrentPersona.tenantId;
  }
  const creatorKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona);

  const newGroup = {
    id: 'IG-' + tenantId + '-' + Date.now().toString().slice(-4),
    tenantId, name, desc: desc || '',
    color: '#6366F1', bg: '#EEF2FF',
    globalAdminKey: adminKeys[0] || '',
    globalAdminKeys: adminKeys,
    opManagerKeys: [],           // 생성 후 카드에서 추가
    ownedAccounts: [],
    createdBy: creatorKey,
    status: 'active',
    createdAt: new Date().toISOString().slice(0,10)
  };
  ISOLATION_GROUPS.push(newGroup);

  const tenantName = tenants.find(t => t.id === tenantId)?.name || tenantId;
  const adminNames = adminKeys.map(k => BO_PERSONAS[k]?.name||k).join(', ') || '(미선임)';
  _igModal = false;
  _igNewModalTenantId = null;
  alert(`✅ 격리그룹 「${name}」이 생성되었습니다.\n\n🏢 테넌트: ${tenantName}\n🔑 예산총괄: ${adminNames}\n\n💡 예산운영 담당자는 생성된 그룹 카드의 [+ 운영 담당자 추가] 버튼으로 추가할 수 있습니다.`);
  renderIsolationGroups();
}

function _igSaveEditGroup() {
  const g = ISOLATION_GROUPS.find(x => x.id === _igEditGroupId);
  if (!g) return;
  const name = document.getElementById('ig-edit-name')?.value?.trim();
  const desc = document.getElementById('ig-edit-desc')?.value?.trim();
  const status = document.getElementById('ig-edit-status')?.value;
  if (!name) { alert('그룹명을 입력하세요.'); return; }
  g.name = name; g.desc = desc || ''; g.status = status || 'active';
  _igEditGroupId = null;
  renderIsolationGroups();
}

// Supabase DB에서 budget_admin 역할 사용자를 조회하여 후보 생성 후 모달 오픈
async function _igOpenAdminModal(groupId) {
  _igTargetGroupId = groupId;
  _igAddAdminCandidates = []; // 새로 초기화

  // Supabase에서 budget_admin 역할 사용자 조회
  if (typeof _sb === 'function' && _sb()) {
    try {
      const g = ISOLATION_GROUPS.find(x => x.id === groupId);
      const tenantId = g?.tenantId;
      const { data: urData } = await _sb().from('user_roles')
        .select('user_id').eq('role_code', 'budget_admin');
      if (urData?.length) {
        const ids = urData.map(r => r.user_id);
        const { data: usersData } = await _sb().from('users').select('*').in('id', ids)
          .eq('tenant_id', tenantId);
        if (usersData) {
          _igAddAdminCandidates = usersData.map(u => [
            u.id, // key
            { name: u.name, dept: u.org_id || '', pos: u.emp_no || '', tenantId: u.tenant_id,
              role: 'budget_global_admin', _fromDB: true }
          ]);
        }
      }
    } catch(e) { console.warn('예산총괄 DB 조회 실패:', e); }
  }

  _igAddAdminModal = true;
  renderIsolationGroups();
}

function _igConfirmAddAdmin() {
  const selected = [...document.querySelectorAll('input[name="ig-admin-candidate"]:checked')].map(el => el.value);
  if (!selected.length) { alert('추가할 담당자를 선택하세요.'); return; }
  const g = ISOLATION_GROUPS.find(x => x.id === _igTargetGroupId);
  if (!g) return;
  if (!g.globalAdminKeys) g.globalAdminKeys = g.globalAdminKey ? [g.globalAdminKey] : [];
  selected.forEach(k => { if (!g.globalAdminKeys.includes(k)) g.globalAdminKeys.push(k); });
  g.globalAdminKey = g.globalAdminKeys[0] || '';
  const names = selected.map(k => BO_PERSONAS[k]?.name||k).join(', ');
  _igAddAdminModal = false;
  alert(`✅ 예산총괄 담당자가 추가되었습니다.\n추가된 담당자: ${names}`);
  renderIsolationGroups();
}

function _igConfirmAddOp() {
  const selected = [...document.querySelectorAll('input[name="ig-op-candidate"]:checked')].map(el => el.value);
  if (!selected.length) { alert('추가할 운영 담당자를 선택하세요.'); return; }
  const g = ISOLATION_GROUPS.find(x => x.id === _igTargetGroupId);
  if (!g) return;
  selected.forEach(k => { if (!g.opManagerKeys.includes(k)) g.opManagerKeys.push(k); });
  const names = selected.map(k => BO_PERSONAS[k]?.name||k).join(', ');
  _igAddOpModal = false;
  alert(`✅ 예산운영 담당자가 추가되었습니다.\n추가된 담당자: ${names}`);
  renderIsolationGroups();
}

function _igRemoveAdmin(groupId, adminKey) {
  const g = ISOLATION_GROUPS.find(x => x.id === groupId);
  const p = BO_PERSONAS[adminKey];
  if (!g) return;
  if (!confirm(`${p?.name||adminKey}를 이 격리그룹의 예산총괄 담당자에서 제거하시겠습니까?`)) return;
  g.globalAdminKeys = (g.globalAdminKeys||[g.globalAdminKey]).filter(k => k !== adminKey);
  g.globalAdminKey  = g.globalAdminKeys[0] || '';
  renderIsolationGroups();
}

function _igRemoveOpManager(groupId, opKey) {
  const g = ISOLATION_GROUPS.find(x => x.id === groupId);
  const p = BO_PERSONAS[opKey];
  if (!g) return;
  if (!confirm(`${p?.name||opKey}를 이 격리그룹의 예산운영 담당자에서 제거하시겠습니까?\n\n가상조직 노드 배정도 초기화됩니다.`)) return;
  g.opManagerKeys = g.opManagerKeys.filter(k => k !== opKey);
  if (typeof VIRTUAL_ORG_TEMPLATES !== 'undefined') {
    VIRTUAL_ORG_TEMPLATES.forEach(tpl => {
      const nodes = [...(tpl.tree?.hqs||[]), ...(tpl.tree?.centers||[])];
      nodes.forEach(n => { if (n.managerPersonaKey === opKey) n.managerPersonaKey = ''; });
    });
  }
  renderIsolationGroups();
}
