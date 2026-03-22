// ─── 격리 그룹 관리 ────────────────────────────────────────────────────────────
// 역할별 뷰 분기:
//   tenant_global_admin (전용) → 격리 그룹 생성 + 예산 총괄 선임
//   budget_global_admin / dualRole → 내 격리 그룹 운영 담당자 관리
//   그 외 → 접근 불가

let _igModal = false;
let _igAddOpModal = false; // 운영 담당자 추가 모달
let _igTargetGroupId = null; // 운영 담당자 추가 대상 그룹

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────────
function _igPersonaChip(key, color, onRemove) {
  const p = BO_PERSONAS[key];
  if (!p) return '';
  return `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;
    border-radius:20px;background:${color}15;border:1px solid ${color}40;font-size:11px;font-weight:700;color:${color}">
    ${p.name}
    <span style="font-size:9px;opacity:.65">${p.dept}</span>
    ${onRemove ? `<span onclick="${onRemove}('${key}')" style="cursor:pointer;font-size:12px;opacity:.5;margin-left:2px" title="제거">✕</span>` : ''}
  </span>`;
}

// ── 메인 렌더 ──────────────────────────────────────────────────────────────────
/**
 * 역할별 뷰 분기:
 *   tenant_global_admin (전용, dualRole 없음)
 *     → 격리 그룹 생성 + 예산 총괄 선임만 표시
 *   tenant_global_admin + dualRole:'budget_global_admin' (겸임)
 *     → 격리 그룹 생성/선임 섹션 + 내 그룹 운영 담당자 관리 섹션 모두 표시
 *   budget_global_admin (순수 총괄, dualRole 없음)
 *     → 내 격리 그룹 운영 담당자 관리 섹션만 표시
 */
function renderIsolationGroups() {
  const persona = boCurrentPersona;
  const el = document.getElementById('bo-content');
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';

  const isTenantAdmin  = persona.role === 'tenant_global_admin';
  const isDualRole     = persona.dualRole === 'budget_global_admin';
  const isBudgetOnly   = persona.role === 'budget_global_admin' && !isDualRole;

  let html = '';

  if (isTenantAdmin && !isDualRole) {
    // ① 순수 테넌트 총괄: 그룹 생성 + 총괄 선임만
    html = _renderTenantView(persona, personaKey);
  } else if (isTenantAdmin && isDualRole) {
    // ② 겸임 (테넌트 총괄 + 예산 총괄): 두 섹션 모두
    html = _renderDualRoleView(persona, personaKey);
  } else if (isBudgetOnly) {
    // ③ 순수 예산 총괄: 운영 담당자 관리만
    html = _renderBudgetAdminView(persona, personaKey);
  } else {
    html = '<div style="padding:60px;text-align:center;color:#9CA3AF">이 페이지에 대한 접근 권한이 없습니다.</div>';
  }

  el.innerHTML = html;

  // 모달 추가
  if (_igModal)      el.innerHTML += _renderCreateGroupModal(persona);
  if (_igAddOpModal) el.innerHTML += _renderAddOpManagerModal(persona, personaKey);
}


// ── 섹션 단위 렌더러 (겸임 뷰에서 재사용) ────────────────────────────────────
function _renderTenantSection(persona, personaKey) {
  // 테넌트 그룹 목록 카드 + 생성 버튼 (제목/배너 없이)
  const myGroups = ISOLATION_GROUPS.filter(g => g.tenantId === persona.tenantId);
  const cards = myGroups.map(g => {
    const admin = BO_PERSONAS[g.globalAdminKey];
    const opCount = g.opManagerKeys.length;
    const accts = g.ownedAccounts || [];
    return `
<div class="bo-card" style="padding:18px;margin-bottom:12px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span>🛡️</span>
        <span style="font-weight:900;font-size:13px;color:#111827">${g.name}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:7px;
          background:${g.status==='active'?'#D1FAE5':'#F3F4F6'};
          color:${g.status==='active'?'#065F46':'#9CA3AF'}">${g.status==='active'?'✅ 운영중':'⏸️'}</span>
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:10px">${g.desc}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:9px;font-weight:900;color:#7C3AED;text-transform:uppercase;margin-bottom:3px">🔑 예산 총괄</div>
          ${admin ? `<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:#F5F3FF;border:1px solid #DDD6FE;font-weight:700;color:#7C3AED">${admin.name} <span style="opacity:.7;font-size:9px">${admin.dept}</span></span>` : '<span style="font-size:11px;color:#EF4444;font-weight:700">⚠️ 미선임</span>'}
        </div>
        <div>
          <div style="font-size:9px;font-weight:900;color:#1D4ED8;text-transform:uppercase;margin-bottom:3px">👤 운영 담당자</div>
          <span style="font-size:11px;font-weight:700;color:${opCount>0?'#1D4ED8':'#9CA3AF'}">${opCount > 0 ? opCount + '명 등록됨' : '미등록'}</span>
        </div>
        <div>
          <div style="font-size:9px;font-weight:900;color:#059669;text-transform:uppercase;margin-bottom:3px">💳 예산 계정</div>
          <span style="font-size:11px;color:#374151;font-weight:700">${accts.length > 0 ? accts.join(', ') : '—'}</span>
        </div>
      </div>
    </div>
    <button onclick="alert('예산 총괄 변경 기능')"
      style="font-size:11px;padding:5px 10px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;cursor:pointer;font-weight:700;flex-shrink:0">✏️ 수정</button>
  </div>
</div>`;
  }).join('');

  return `
<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
  <button onclick="_igModal=true;renderIsolationGroups()" class="bo-btn-primary" style="display:flex;align-items:center;gap:5px;padding:8px 16px;font-size:12px">
    <span>+</span> 새 격리 그룹 만들기
  </button>
</div>
${cards || '<div style="padding:30px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:12px">생성된 격리 그룹이 없습니다.</div>'}`;
}

function _renderBudgetAdminSection(persona, personaKey) {
  // 운영 담당자 관리 섹션 (제목 없이)
  const myGroups = ISOLATION_GROUPS.filter(g =>
    g.tenantId === persona.tenantId && g.globalAdminKey === personaKey
  );
  if (myGroups.length === 0) {
    return '<div style="padding:30px;text-align:center;background:#F9FAFB;border-radius:12px;color:#9CA3AF">이 페르소나가 총괄로 배정된 격리 그룹이 없습니다.</div>';
  }
  return myGroups.map(g => {
    const opCards = g.opManagerKeys.map(k => {
      const p = BO_PERSONAS[k];
      if (!p) return '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px;border:1px solid #F3F4F6;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:800;font-size:12px;color:#111827">${p.name}</div>
          <div style="font-size:10px;color:#9CA3AF">${p.dept} · ${p.pos} ${p.scope ? '· '+p.scope : ''}</div>
        </div>
        <button onclick="_igRemoveOpManager('${g.id}','${k}')"
          style="font-size:11px;padding:4px 8px;border-radius:7px;border:1px solid #FECACA;background:#FEF2F2;color:#EF4444;cursor:pointer;font-weight:700">제거</button>
      </div>`;
    }).join('');
    return `<div class="bo-card" style="padding:20px;margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-weight:900;font-size:13px;color:#111827">🛡️ ${g.name}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${g.desc}</div>
        </div>
        <button onclick="_igAddOpModal=true;_igTargetGroupId='${g.id}';renderIsolationGroups()"
          class="bo-btn-primary" style="padding:7px 14px;font-size:12px;white-space:nowrap">+ 운영 담당자 추가</button>
      </div>
      ${opCards || '<div style="padding:20px;text-align:center;background:#F9FAFB;border-radius:10px;border:1px dashed #D1D5DB;color:#9CA3AF;font-size:12px">아직 등록된 운영 담당자가 없습니다</div>'}
      ${g.opManagerKeys.length > 0 ? `<div style="margin-top:12px;padding:10px 14px;background:#EFF6FF;border-radius:10px;border:1px solid #BFDBFE;font-size:11px;color:#1D4ED8;font-weight:700">
        💡 <button onclick="boNavigate('virtual-org')" style="background:none;border:none;cursor:pointer;font-size:11px;font-weight:900;color:#1D4ED8;text-decoration:underline">가상조직 템플릿 관리</button>에서 노드 담당자를 배정하세요.
      </div>` : ''}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════════
// ① 테넌트 총괄 전용 뷰
//    역할: 격리 그룹 생성 + 예산 총괄 담당자 선임
// ══════════════════════════════════════════════════════════════════════════════
function _renderTenantView(persona, personaKey) {
  const myGroups = ISOLATION_GROUPS.filter(g => g.tenantId === persona.tenantId);

  const cards = myGroups.map(g => {
    const admin = BO_PERSONAS[g.globalAdminKey];
    const opCount = g.opManagerKeys.length;
    const accts   = g.ownedAccounts || [];
    return `
<div class="bo-card" style="padding:20px;margin-bottom:14px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:15px">🛡️</span>
        <span style="font-weight:900;font-size:14px;color:#111827">${g.name}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:8px;
          background:${g.status==='active'?'#D1FAE5':'#F3F4F6'};
          color:${g.status==='active'?'#065F46':'#9CA3AF'}">${g.status==='active'?'✅ 운영중':'⏸️'}</span>
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:12px">${g.desc}</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <!-- 예산 총괄 -->
        <div>
          <div style="font-size:9px;font-weight:900;color:#7C3AED;text-transform:uppercase;margin-bottom:4px">🔑 예산 총괄</div>
          ${admin
            ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;
                background:#F5F3FF;border:1px solid #DDD6FE;font-size:11px;font-weight:700;color:#7C3AED">
                ${admin.name} <span style="font-size:9px;opacity:.7">${admin.dept}</span></span>`
            : `<span style="font-size:11px;color:#EF4444;font-weight:700">⚠️ 미선임</span>`}
        </div>
        <!-- 운영 담당자 (요약) -->
        <div>
          <div style="font-size:9px;font-weight:900;color:#1D4ED8;text-transform:uppercase;margin-bottom:4px">👤 운영 담당자</div>
          <span style="font-size:11px;font-weight:700;color:${opCount>0?'#1D4ED8':'#9CA3AF'}">
            ${opCount > 0 ? opCount + '명 (총괄이 관리)' : '총괄 담당자가 직접 등록'}
          </span>
        </div>
        <!-- 소속 계정 -->
        <div>
          <div style="font-size:9px;font-weight:900;color:#059669;text-transform:uppercase;margin-bottom:4px">💳 예산 계정</div>
          <span style="font-size:11px;font-weight:700;color:#374151">${accts.length > 0 ? accts.join(', ') : '—'}</span>
        </div>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;min-width:100px">
      <div style="font-size:9px;color:#9CA3AF;margin-bottom:2px">${g.id}</div>
      <div style="font-size:9px;color:#9CA3AF;margin-bottom:10px">${g.createdAt}</div>
      <button onclick="alert('예산 총괄 변경 기능')"
        style="font-size:11px;padding:5px 10px;border-radius:8px;border:1.5px solid #E5E7EB;background:white;cursor:pointer;font-weight:700">✏️ 수정</button>
    </div>
  </div>
</div>`;
  }).join('');

  return `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
    <div>
      <h1 class="bo-page-title">🛡️ 격리 그룹 관리</h1>
      <p class="bo-page-sub">격리 그룹을 생성하고 <strong>예산 총괄 담당자</strong>를 선임합니다. 운영 담당자는 총괄 담당자가 직접 관리합니다.</p>
    </div>
    <button onclick="_igModal=true;renderIsolationGroups()" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 격리 그룹 만들기
    </button>
  </div>

  <!-- 역할 안내 -->
  <div style="display:flex;gap:0;margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid #FDE68A">
    <div style="flex:1;padding:12px 16px;background:#FEF3C7">
      <div style="font-size:10px;font-weight:900;color:#92400E;margin-bottom:3px">① 테넌트 총괄 (현재 역할)</div>
      <div style="font-size:11px;color:#78350F">✅ <strong>격리 그룹 생성</strong> + <strong>예산 총괄 담당자 선임</strong></div>
    </div>
    <div style="width:1px;background:#FDE68A"></div>
    <div style="flex:1;padding:12px 16px;background:#fafafa">
      <div style="font-size:10px;font-weight:900;color:#7C3AED;margin-bottom:3px">② 예산 총괄 (총괄 담당자 업무)</div>
      <div style="font-size:11px;color:#9CA3AF">운영 담당자 등록 + 가상조직 노드 배정</div>
    </div>
    <div style="width:1px;background:#E5E7EB"></div>
    <div style="flex:1;padding:12px 16px;background:#fafafa">
      <div style="font-size:10px;font-weight:900;color:#1D4ED8;margin-bottom:3px">③ 예산 운영 (운영 담당자 업무)</div>
      <div style="font-size:11px;color:#9CA3AF">담당 조직의 계획/신청/결과 승인</div>
    </div>
  </div>

  <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">
    격리 그룹 목록 (${myGroups.length}개)
  </div>
  ${cards || '<div style="padding:40px;text-align:center;color:#9CA3AF">생성된 격리 그룹이 없습니다.</div>'}
</div>`;
}


// ══════════════════════════════════════════════════════════════════════════════
// ② 겸임 뷰 (테넌트 총괄 + 예산 총괄 겸임)
//    역할: 격리 그룹 생성/총괄 선임 + 내 그룹 운영 담당자 관리 모두 포함
// ══════════════════════════════════════════════════════════════════════════════
function _renderDualRoleView(persona, personaKey) {
  const tenantSection = _renderTenantSection(persona, personaKey);
  const budgetSection = _renderBudgetAdminSection(persona, personaKey);

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <h1 class="bo-page-title">🛡️ 격리 그룹 관리</h1>
    <p class="bo-page-sub">
      <span style="background:#D97706;color:white;font-size:9px;font-weight:900;padding:2px 7px;border-radius:5px;margin-right:6px">[테넌트+총괄 겸임]</span>
      격리 그룹을 생성·관리하고, 내 그룹의 운영 담당자도 직접 등록합니다.
    </p>
  </div>

  <!-- 섹션 ①: 테넌트 총괄 기능 -->
  <div style="margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:28px;height:28px;border-radius:8px;background:#D9770618;display:flex;align-items:center;justify-content:center;font-size:13px">🛡️</div>
      <div style="font-size:13px;font-weight:900;color:#92400E">① 격리 그룹 생성 및 예산 총괄 선임</div>
      <div style="font-size:10px;color:#9CA3AF">(테넌트 총괄 권한)</div>
    </div>
    ${tenantSection}
  </div>

  <!-- 구분선 -->
  <div style="border-top:2px dashed #E5E7EB;margin-bottom:28px;position:relative">
    <span style="position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:white;padding:0 12px;font-size:11px;font-weight:700;color:#9CA3AF">▼ 예산 총괄 담당자 기능</span>
  </div>

  <!-- 섹션 ②: 예산 총괄 기능 -->
  <div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:28px;height:28px;border-radius:8px;background:#1D4ED818;display:flex;align-items:center;justify-content:center;font-size:13px">👤</div>
      <div style="font-size:13px;font-weight:900;color:#1E40AF">② 내 격리 그룹 운영 담당자 관리</div>
      <div style="font-size:10px;color:#9CA3AF">(예산 총괄 권한)</div>
    </div>
    ${budgetSection}
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// ② 예산 총괄 (Budget Global Admin) 뷰
//    역할: 내 격리 그룹의 운영 담당자를 등록·관리
// ══════════════════════════════════════════════════════════════════════════════
function _renderBudgetAdminView(persona, personaKey) {
  const myGroups = ISOLATION_GROUPS.filter(g =>
    g.tenantId === persona.tenantId && g.globalAdminKey === personaKey
  );

  const groupPanels = myGroups.map(g => {
    const opCards = g.opManagerKeys.map(k => {
      const p = BO_PERSONAS[k];
      if (!p) return '';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F9FAFB;
        border-radius:10px;border:1px solid #F3F4F6;margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:800;font-size:12px;color:#111827">${p.name}</div>
          <div style="font-size:10px;color:#9CA3AF">${p.dept} · ${p.pos}</div>
        </div>
        <span style="font-size:9px;padding:2px 7px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${p.scope || '전체'}</span>
        <button onclick="_igRemoveOpManager('${g.id}','${k}')"
          style="font-size:11px;padding:4px 8px;border-radius:7px;border:1px solid #FECACA;background:#FEF2F2;color:#EF4444;cursor:pointer;font-weight:700">제거</button>
      </div>`;
    }).join('');

    return `
<div class="bo-card" style="padding:22px;margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:16px">🛡️</span>
    <span style="font-weight:900;font-size:15px;color:#111827">${g.name}</span>
    <span style="font-size:9px;padding:2px 7px;border-radius:8px;background:#D1FAE5;color:#065F46;font-weight:900">✅ 내 담당 그룹</span>
  </div>
  <div style="font-size:11px;color:#6B7280;margin-bottom:18px">${g.desc}</div>

  <!-- 소속 계정 요약 -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">
    ${(g.ownedAccounts||[]).map(a=>`<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#F0FDF4;border:1px solid #86EFAC;color:#065F46;font-weight:700">${a}</span>`).join('')}
  </div>

  <!-- 운영 담당자 관리 섹션 -->
  <div style="border-top:1px dashed #E5E7EB;padding-top:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:12px;font-weight:900;color:#1D4ED8">👤 예산 운영 담당자 관리</div>
        <div style="font-size:10px;color:#6B7280;margin-top:2px">
          이 격리 그룹에 속하는 운영 담당자를 등록합니다.<br>
          등록된 담당자는 가상조직 템플릿의 노드 담당자로 지정할 수 있습니다.
        </div>
      </div>
      <button onclick="_igAddOpModal=true;_igTargetGroupId='${g.id}';renderIsolationGroups()"
        class="bo-btn-primary" style="padding:8px 16px;font-size:12px;white-space:nowrap">
        + 운영 담당자 추가
      </button>
    </div>
    ${opCards || `<div style="padding:24px;text-align:center;background:#F9FAFB;border-radius:10px;border:1px dashed #D1D5DB">
      <div style="font-size:24px;margin-bottom:6px">👤</div>
      <div style="font-size:12px;font-weight:700;color:#9CA3AF">아직 등록된 운영 담당자가 없습니다</div>
      <div style="font-size:11px;color:#D1D5DB;margin-top:2px">위 버튼으로 운영 담당자를 추가하세요</div>
    </div>`}
  </div>

  <!-- 가상조직 안내 -->
  ${g.opManagerKeys.length > 0 ? `
  <div style="margin-top:14px;padding:12px 14px;background:#EFF6FF;border-radius:10px;border:1px solid #BFDBFE">
    <div style="font-size:11px;font-weight:900;color:#1D4ED8;margin-bottom:3px">💡 다음 단계: 가상조직 노드에 운영 담당자 배정</div>
    <div style="font-size:11px;color:#1e40af;line-height:1.5">
      "가상조직 템플릿 관리" 메뉴 → 본부/센터 노드 선택 → 이 그룹의 운영 담당자 중에서 노드 담당자를 지정하세요.
    </div>
    <button onclick="boNavigate('virtual-org')" style="margin-top:8px;font-size:11px;padding:6px 12px;border-radius:8px;
      border:1.5px solid #BFDBFE;background:white;cursor:pointer;font-weight:700;color:#1D4ED8">
      → 가상조직 템플릿 관리로 이동
    </button>
  </div>` : ''}
</div>`;
  }).join('');

  const noGroups = myGroups.length === 0 ? `
<div style="padding:50px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px solid #E5E7EB">
  <div style="font-size:32px;margin-bottom:8px">🛡️</div>
  <div style="font-weight:700;font-size:14px;color:#374151">아직 테넌트 총괄이 이 담당자를 격리 그룹에 배정하지 않았습니다</div>
  <div style="font-size:12px;color:#9CA3AF;margin-top:6px">테넌트 총괄 담당자에게 격리 그룹 배정을 요청하세요</div>
</div>` : '';

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <h1 class="bo-page-title">🛡️ 내 격리 그룹 관리</h1>
    <p class="bo-page-sub">내가 총괄하는 격리 그룹의 <strong>운영 담당자를 등록</strong>하고, 가상조직 노드에 배정합니다.</p>
  </div>
  ${groupPanels || noGroups}
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 새 격리 그룹 생성 (테넌트 총괄 전용)
// ══════════════════════════════════════════════════════════════════════════════
function _renderCreateGroupModal(persona) {
  const adminCandidates = Object.entries(BO_PERSONAS)
    .filter(([k,p]) => p.tenantId === persona.tenantId
      && (p.role === 'budget_global_admin' || p.dualRole === 'budget_global_admin'));
  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:520px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h3 style="font-weight:900;font-size:17px;margin:0">🛡️ 새 격리 그룹 만들기</h3>
      <button onclick="_igModal=false;renderIsolationGroups()" style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <label class="bo-label">그룹명 <span style="color:#EF4444">*</span></label>
        <input id="ig-name" type="text" placeholder='예: "HMC 글로벌교육 그룹"'
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
      </div>
      <div>
        <label class="bo-label">그룹 설명</label>
        <textarea id="ig-desc" rows="2" placeholder="이 격리 그룹의 관리 범위를 설명하세요."
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
      </div>
      <div>
        <label class="bo-label">예산 총괄 담당자 선임 <span style="color:#EF4444">*</span></label>
        <select id="ig-admin" style="width:100%;border:1.5px solid #7C3AED;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
          <option value="">— 선택 —</option>
          ${adminCandidates.map(([k,p])=>`<option value="${k}">${p.name} (${p.dept} · ${p.pos})</option>`).join('')}
        </select>
        <div style="font-size:10px;color:#7C3AED;margin-top:4px;font-weight:700">
          💡 선임된 담당자가 이 그룹의 계정·조직·정책을 독립적으로 구성하고 운영 담당자를 직접 등록합니다.
        </div>
      </div>
      <div style="padding:12px;background:#FEF3C7;border-radius:10px;border:1px solid #FDE68A;font-size:11px;color:#78350F;line-height:1.5">
        ⚠️ 그룹 생성 후 <strong>예산 총괄 담당자</strong>가 운영 담당자를 직접 추가합니다.<br>
        서로 다른 그룹의 데이터는 상호 열람 불가입니다.
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:20px">
      <button onclick="_igModal=false;renderIsolationGroups()"
        style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_saveNewIsolationGroup()" class="bo-btn-primary" style="padding:10px 24px">
        ✅ 격리 그룹 생성
      </button>
    </div>
  </div>
</div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 모달: 운영 담당자 추가 (예산 총괄 전용)
// ══════════════════════════════════════════════════════════════════════════════
function _renderAddOpManagerModal(persona, personaKey) {
  const group = ISOLATION_GROUPS.find(g => g.id === _igTargetGroupId);
  if (!group) return '';
  // 아직 추가되지 않은 같은 테넌트의 budget_op_manager 목록
  const candidates = Object.entries(BO_PERSONAS).filter(([k,p]) =>
    p.tenantId === persona.tenantId
    && p.role === 'budget_op_manager'
    && !group.opManagerKeys.includes(k)
  );
  return `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:480px;padding:26px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
      <h3 style="font-weight:900;font-size:16px;margin:0">👤 운영 담당자 추가</h3>
      <button onclick="_igAddOpModal=false;renderIsolationGroups()" style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="font-size:12px;color:#6B7280;margin-bottom:16px">
      <strong style="color:#1D4ED8">${group.name}</strong>에 등록할 운영 담당자를 선택하세요.<br>
      등록 후 가상조직 템플릿 노드에 배정할 수 있습니다.
    </div>
    ${candidates.length > 0 ? `
    <div style="display:grid;gap:8px;max-height:240px;overflow-y:auto">
      ${candidates.map(([k,p])=>`
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
        border:1.5px solid #E5E7EB;background:white;cursor:pointer;transition:border-color .15s"
        onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='#E5E7EB'">
        <input type="radio" name="ig-op-candidate" value="${k}" style="margin:0;flex-shrink:0">
        <div style="flex:1">
          <div style="font-weight:800;font-size:13px;color:#111827">${p.name}</div>
          <div style="font-size:11px;color:#9CA3AF">${p.dept} · ${p.pos} ${p.scope ? '· 담당: '+p.scope : ''}</div>
        </div>
        <span style="font-size:9px;padding:2px 7px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-weight:700">예산 운영</span>
      </label>`).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:16px">
      <button onclick="_igAddOpModal=false;renderIsolationGroups()"
        style="padding:9px 18px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_igConfirmAddOpManager()" class="bo-btn-primary" style="padding:9px 20px">✅ 추가</button>
    </div>` : `
    <div style="padding:30px;text-align:center;background:#F9FAFB;border-radius:10px;color:#9CA3AF">
      <div style="font-size:24px;margin-bottom:6px">👤</div>
      <div style="font-weight:700;font-size:12px">추가 가능한 운영 담당자가 없습니다</div>
      <div style="font-size:11px;margin-top:4px">이미 모든 운영 담당자가 이 그룹에 등록되었거나,<br>아직 운영 담당자 페르소나가 없습니다.</div>
    </div>
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
  const adminKey = document.getElementById('ig-admin')?.value;
  if (!name)     { alert('그룹명을 입력하세요.'); return; }
  if (!adminKey) { alert('예산 총괄 담당자를 선임하세요.'); return; }
  const admin = BO_PERSONAS[adminKey];
  ISOLATION_GROUPS.push({
    id: 'IG-' + boCurrentPersona.tenantId + '-' + Date.now().toString().slice(-4),
    tenantId: boCurrentPersona.tenantId,
    name, desc: desc || '',
    globalAdminKey: adminKey,
    opManagerKeys: [],
    ownedAccounts: [],
    createdBy: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona),
    status: 'active',
    createdAt: new Date().toISOString().slice(0,10)
  });
  _igModal = false;
  alert(`✅ 격리 그룹 「${name}」이 생성되었습니다.\n\n👤 예산 총괄: ${admin?.name}(${admin?.dept})\n\n이제 ${admin?.name}님이 로그인하여 운영 담당자를 직접 등록할 수 있습니다.`);
  renderIsolationGroups();
}

function _igConfirmAddOpManager() {
  const selected = document.querySelector('input[name="ig-op-candidate"]:checked')?.value;
  if (!selected) { alert('추가할 운영 담당자를 선택하세요.'); return; }
  const group = ISOLATION_GROUPS.find(g => g.id === _igTargetGroupId);
  if (!group) return;
  group.opManagerKeys.push(selected);
  const p = BO_PERSONAS[selected];
  _igAddOpModal = false;
  alert(`✅ ${p?.name}(${p?.dept})이 「${group.name}」의 운영 담당자로 등록되었습니다.\n\n이제 가상조직 템플릿에서 이 담당자를 노드에 배정할 수 있습니다.`);
  renderIsolationGroups();
}

function _igRemoveOpManager(groupId, opKey) {
  const group = ISOLATION_GROUPS.find(g => g.id === groupId);
  const p = BO_PERSONAS[opKey];
  if (!group) return;
  if (!confirm(`${p?.name}(${p?.dept})을 이 격리 그룹에서 제거하시겠습니까?\n\n주의: 가상조직 노드에 이미 배정된 경우 해당 배정도 초기화됩니다.`)) return;
  group.opManagerKeys = group.opManagerKeys.filter(k => k !== opKey);
  // 가상조직 노드에서도 제거
  if (typeof VIRTUAL_ORG_TEMPLATES !== 'undefined') {
    VIRTUAL_ORG_TEMPLATES.forEach(tpl => {
      const nodes = [...(tpl.tree?.hqs||[]), ...(tpl.tree?.centers||[])];
      nodes.forEach(n => { if (n.managerPersonaKey === opKey) n.managerPersonaKey = ''; });
    });
  }
  renderIsolationGroups();
}
