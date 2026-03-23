// ─── 가상조직 템플릿 관리 ──────────────────────────────────────────────────────
// 버그수정: myTemplates를 전역 _voMyTemplates로 이동 (로컬 변수 참조 오류 수정)
// 기능추가: 플랫폼총괄·테넌트총괄 역할별 필터바 (테넌트/격리그룹 선택)

let _voActiveTemplateId = null;
let _voMyTemplates      = [];      // ★ 전역으로 이동 (기존 로컬변수 버그 수정)
let _voCurrentGroup     = null;
let _voSelectedTeams    = new Set();
let _voEditGroupIdx     = null;
let _voCoopGroupIdx     = null;

// 역할별 필터 상태
let _voTenantId  = null;
let _voGroupId   = null;

// ─── 활성 템플릿 헬퍼 ─────────────────────────────────────────────────────────
function _voGetActiveTpl() {
  return _voMyTemplates.find(t => t.id === _voActiveTemplateId) || null;
}

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderVirtualOrg() {
  const role    = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];

  // 테넌트 초기화
  if (!_voTenantId) {
    _voTenantId = (role === 'platform_admin')
      ? (tenants[0]?.id || 'HMC')
      : boCurrentPersona.tenantId || 'HMC';
  }

  // 격리그룹 초기화
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '';
  const allGroups  = typeof ISOLATION_GROUPS !== 'undefined'
    ? ISOLATION_GROUPS.filter(g => g.tenantId === _voTenantId) : [];
  const visGroups  = (role === 'budget_global_admin')
    ? allGroups.filter(g => (g.globalAdminKeys||[]).includes(personaKey))
    : allGroups;

  if (!_voGroupId || !visGroups.find(g => g.id === _voGroupId)) {
    _voGroupId = visGroups[0]?.id || null;
  }

  // 현재 격리그룹에 속한 템플릿
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  if (!_voActiveTemplateId || !_voMyTemplates.find(t => t.id === _voActiveTemplateId)) {
    _voActiveTemplateId = _voMyTemplates[0]?.id || null;
  }

  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';
  const tenantName = tenants.find(t => t.id === _voTenantId)?.name || _voTenantId;

  // ── 테넌트 셀렉트 ──────────────────────────────────────────────────────────
  const tenantSelect = isPlatform ? `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">회사</label>
    <select onchange="_voTenantId=this.value;_voGroupId=null;renderVirtualOrg()"
      style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
      ${tenants.map(t => `<option value="${t.id}" ${t.id===_voTenantId?'selected':''}>${t.name}</option>`).join('')}
    </select>
  </div>` : `
  <div style="display:flex;align-items:center;gap:6px">
    <span style="font-size:14px">🏢</span>
    <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
  </div>`;

  // ── 격리그룹 셀렉트 ────────────────────────────────────────────────────────
  const groupSelect = visGroups.length > 0 ? `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">격리그룹</label>
    <select onchange="_voGroupId=this.value;renderVirtualOrg()"
      style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:white;cursor:pointer;min-width:200px">
      ${visGroups.map(g => `<option value="${g.id}" ${g.id===_voGroupId?'selected':''}>${g.name}</option>`).join('')}
    </select>
  </div>` : `<span style="font-size:11px;color:#9CA3AF">등록된 격리그룹이 없습니다</span>`;

  const filterBar = (isPlatform || isTenant || role === 'budget_global_admin') ? `
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px;
              background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:14px;margin-bottom:20px">
    ${tenantSelect}
    <span style="color:#D1D5DB;font-size:16px">|</span>
    ${groupSelect}
    <button onclick="renderVirtualOrg()"
      style="padding:7px 16px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;
             font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button>
  </div>` : '';

  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull(filterBar);
}

// ─── 격리그룹 기준 템플릿 조회 ────────────────────────────────────────────────
function _voGetTemplatesByGroup(groupId, tenantId) {
  if (!groupId) {
    return typeof VIRTUAL_ORG_TEMPLATES !== 'undefined'
      ? VIRTUAL_ORG_TEMPLATES.filter(t => t.tenantId === tenantId) : [];
  }
  return typeof VIRTUAL_ORG_TEMPLATES !== 'undefined'
    ? VIRTUAL_ORG_TEMPLATES.filter(t => t.isolationGroupId === groupId) : [];
}

// ─── 내부 리렌더 (필터바 유지) ────────────────────────────────────────────────
function _voRerender() {
  // 상태변수 유지하고 다시 풀렌더
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull(_voCachedFilterBar || '');
}

let _voCachedFilterBar = '';

// ─── 전체 HTML 생성 ──────────────────────────────────────────────────────────
function _renderVirtualOrgFull(filterBar) {
  _voCachedFilterBar = filterBar || _voCachedFilterBar || '';

  const templateListHtml = _voMyTemplates.map(tpl => {
    const isAct = tpl.id === _voActiveTemplateId;
    const isRnd = tpl.tree.centers !== undefined;
    const gList = isRnd ? tpl.tree.centers : tpl.tree.hqs;
    return `
    <div style="padding:12px 16px;border-bottom:1px solid #F3F4F6;cursor:pointer;
                background:${isAct ? '#EFF6FF' : '#fff'};border-left:3px solid ${isAct ? '#1D4ED8' : 'transparent'};
                transition:background 0.2s"
         onclick="voSelectTemplate('${tpl.id}')">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:6px">
          <span>${isRnd ? '🔬' : '🏢'}</span>
          <span style="font-weight:${isAct ? '800' : '600'};color:${isAct ? '#1E40AF' : '#374151'};font-size:13px">${tpl.name}</span>
        </div>
        <button onclick="event.stopPropagation();voRemoveTemplate('${tpl.id}')" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:12px">✕</button>
      </div>
      <div style="font-size:11px;color:#6B7280;padding-left:22px">하위 본부/센터: ${gList.length}개</div>
    </div>`;
  }).join('');

  const activeTpl = _voGetActiveTpl();
  let rightHtml = '';

  if (activeTpl) {
    const isRnd    = activeTpl.tree.centers !== undefined;
    const groups   = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
    const groupName = isRnd ? '센터' : '본부';

    rightHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <h2 style="font-size:16px;font-weight:800;margin:0 0 4px;color:#111827">${activeTpl.name} 가상 조직도</h2>
          <p style="font-size:12px;color:#6B7280;margin:0">실제 HR팀을 맵핑하여 통합 매핑에 사용할 템플릿을 만듭니다.</p>
        </div>
        <button class="bo-btn-primary bo-btn-sm" onclick="voOpenCreateGroup('${isRnd ? 'rnd' : 'general'}')">+ 가상 ${groupName} 추가</button>
      </div>
      <ul class="org-tree">
        ${groups.map((g, gIdx) => {
          const mgrP = g.managerPersonaKey ? BO_PERSONAS[g.managerPersonaKey] : null;
          const mgrBadge = mgrP
            ? `<span style="font-size:10px;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-weight:700">👤 ${mgrP.name} (${mgrP.dept})</span>`
            : `<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;font-weight:700">👤 담당자 미지정</span>`;
          const coopBadges = (g.cooperators||[]).map(c =>
            `<span style="font-size:10px;background:#F5F3FF;color:#5B21B6;padding:2px 7px;border-radius:6px;font-weight:700">🤝 ${c.teamName}</span>`
          ).join(' ');
          return `
        <li style="margin-bottom:16px">
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 16px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="font-size:16px">${isRnd ? '🔬' : '🏢'}</span>
                <span style="font-weight:800;color:#111827;font-size:14px">${g.name}</span>
                <span style="font-size:11px;background:#E5E7EB;color:#374151;font-weight:700;padding:2px 8px;border-radius:20px">팀 ${g.teams.length}개</span>
                ${mgrBadge}
                ${coopBadges}
              </div>
              <div style="display:flex;gap:6px">
                <button class="bo-btn-secondary bo-btn-sm" onclick="voOpenEditGroup(${gIdx})" style="font-size:11px">✏️ 수정</button>
                <button class="bo-btn-secondary bo-btn-sm" onclick="voOpenAddTeam(${gIdx})" style="font-size:11px">+ 팀 매핑</button>
                <button class="bo-btn-secondary bo-btn-sm" onclick="voOpenCoopModal(${gIdx})" style="font-size:11px;color:#7C3AED;border-color:#7C3AED">🤝 협조처</button>
                <button class="bo-btn-secondary bo-btn-sm" onclick="voRemoveGroup(${gIdx})" style="font-size:11px;color:#EF4444;border-color:#EF4444">삭제</button>
              </div>
            </div>
          </div>
          <ul class="org-tree" style="padding-left:0">
            ${g.teams.map((t, tIdx) => {
              const jts = t.allowedJobTypes && t.allowedJobTypes.length>0 ? t.allowedJobTypes : [];
              const jtBadges = jts.map(j =>
                `<span style="font-size:10px;background:#D1FAE5;color:#065F46;padding:1px 7px;border-radius:5px;font-weight:700">${j}</span>`
              ).join(' ');
              const allTypes = getTenantJobTypes(boCurrentPersona.tenantId);
              const allSelected = allTypes.length > 0 && allTypes.every(jt => jts.includes(jt));
              const selectAllBtn = `<label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;padding:2px 8px;border-radius:5px;font-weight:900;background:${allSelected?'#1D4ED8':'#EFF6FF'};color:${allSelected?'white':'#1D4ED8'};border:1px solid #BFDBFE" onclick="voSelectAllJobTypes(${gIdx},${tIdx})"><input type="checkbox" ${allSelected?'checked':''} style="margin:0;width:10px;height:10px"> 전체</label> `;
              const jtPicker = selectAllBtn + allTypes.map(jt => {
                const sel = jts.includes(jt);
                return `<label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;padding:2px 6px;border-radius:5px;background:${sel?'#059669':'#F3F4F6'};color:${sel?'white':'#374151'}" onclick="voToggleJobType(${gIdx},${tIdx},'${jt}')"><input type="checkbox" ${sel?'checked':''} style="margin:0;width:10px;height:10px"> ${jt}</label>`;
              }).join(' ');
              return `
            <li style="margin-bottom:6px"><div style="display:flex;align-items:center;justify-content:space-between;
                            background:#fff;border:1.5px solid #F3F4F6;border-radius:8px;padding:10px 16px;
                            box-shadow:0 1px 2px rgba(0,0,0,0.02)">
              <div style="flex:1">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="color:#9CA3AF">👥</span>
                  <span style="font-weight:700;font-size:13px;color:#374151">${t.name}</span>
                  ${jtBadges || '<span style="font-size:10px;color:#9CA3AF">직군 미지정 (전체 허용)</span>'}
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">${jtPicker}</div>
              </div>
              <button onclick="voRemoveTeam(${gIdx},${tIdx})"
                style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:16px;padding:0 4px;margin-left:8px">✕</button>
            </div></li>`;
            }).join('')}
            ${g.teams.length === 0 ? '<li style="padding:12px 16px;background:#FEF2F2;border:1px dashed #FECACA;border-radius:8px;font-size:12px;color:#EF4444;font-style:italic">아직 맵핑된 실제 팀이 없습니다</li>' : ''}
          </ul>
        </li>`;
        }).join('')}
        ${groups.length === 0 ? `<li style="padding:40px;text-align:center;background:#F9FAFB;border:1px dashed #D1D5DB;border-radius:12px;color:#6B7280;font-size:13px">가상 ${groupName}를 먼저 추가해주세요</li>` : ''}
      </ul>
    `;
  } else {
    rightHtml = `
      <div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0">
        <span style="font-size:48px;margin-bottom:16px;opacity:0.2">🧩</span>
        <h3 style="font-weight:800;color:#374151;margin:0 0 8px">선택된 템플릿이 없습니다</h3>
        <p style="font-size:13px;color:#6B7280;margin:0 0 24px">좌측 목록에서 템플릿을 선택하거나 새로 생성해주세요.</p>
        <button class="bo-btn-primary" onclick="voOpenCreateTemplate()">+ 새 템플릿 생성</button>
      </div>`;
  }

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#1D4ED8;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">가상조직 관리</span>
      <h1 class="bo-page-title" style="margin:0">가상조직 템플릿 관리</h1>
    </div>
    <p class="bo-page-sub">권한 설정에 사용할 수 있는 가상 조직 템플릿을 구성합니다.</p>
  </div>

  ${_voCachedFilterBar}

  <div style="display:flex;gap:20px;height:calc(100vh - 220px);min-height:500px">
    <div style="width:280px;flex-shrink:0;display:flex;flex-direction:column">
      <div class="bo-card" style="flex:1;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:16px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:800;font-size:14px;color:#111827">템플릿 목록</span>
          <button class="bo-btn-primary bo-btn-sm" onclick="voOpenCreateTemplate()" style="padding:4px 10px;font-size:12px">+ 생성</button>
        </div>
        <div style="flex:1;overflow-y:auto">
          ${templateListHtml || '<div style="padding:32px 20px;text-align:center;color:#9CA3AF;font-size:12px">생성된 템플릿이 없습니다</div>'}
        </div>
      </div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column">
      <div class="bo-card" style="flex:1;padding:24px;overflow-y:auto">
        ${rightHtml}
      </div>
    </div>
  </div>
</div>

<!-- 템플릿 생성 모달 -->
<div id="vo-tpl-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:400px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:800;margin:0">신규 가상조직 템플릿 생성</h3>
      <button onclick="voCloseModal('vo-tpl-create-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">템플릿 유형</label>
      <select id="vo-tpl-type" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
        <option value="general">일반 조직 형태 (본부/팀)</option>
        <option value="rnd">R&D 조직 형태 (센터/팀)</option>
      </select>
    </div>
    <div style="margin-bottom:24px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">템플릿명 *</label>
      <input id="vo-tpl-name" type="text" placeholder="예) 전사 공통 교육예산 템플릿"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-tpl-create-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmCreateTemplate()">생성</button>
    </div>
  </div>
</div>

<!-- 그룹 생성/수정 모달 -->
<div id="vo-group-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:460px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 id="vo-group-create-title" style="font-size:15px;font-weight:800;margin:0">가상 그룹 생성</h3>
      <button onclick="voCloseModal('vo-group-create-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">그룹명 *</label>
      <input id="vo-group-name" type="text" placeholder="예) 전략본부"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">담당자 텍스트 (레거시)</label>
      <input id="vo-group-manager" type="text" placeholder="예) 홍길동"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">👤 백오피스 담당자 연결 <span style="font-size:10px;color:#6B7280">(나의 운영 업무 등 권한에 반영)</span></label>
      <select id="vo-group-manager-key"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
        <option value="">— 담당자 미지정 —</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-group-create-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmCreateGroup()">저장</button>
    </div>
  </div>
</div>

<!-- 협조처 설정 모달 -->
<div id="vo-coop-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div>
        <h3 style="font-size:15px;font-weight:800;margin:0 0 3px">🤝 협조처 설정</h3>
        <p style="font-size:11px;color:#6B7280;margin:0">결재 시 협조가 필요한 팀을 지정합니다</p>
      </div>
      <button onclick="voCloseModal('vo-coop-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="vo-coop-list" style="max-height:280px;overflow-y:auto;margin-bottom:16px"></div>
    <div style="background:#F9FAFB;border-radius:8px;padding:12px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:8px">협조처 추가</div>
      <div style="display:flex;gap:8px">
        <input id="vo-coop-team-input" placeholder="팀명 입력" style="flex:1;padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:7px;font-size:12px;outline:none">
        <input id="vo-coop-role-input" placeholder="역할 (예: 검토)" style="width:100px;padding:7px 10px;border:1.5px solid #E5E7EB;border-radius:7px;font-size:12px;outline:none">
        <button onclick="voAddCoopTeam()" class="bo-btn-primary bo-btn-sm">추가</button>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-coop-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voSaveCoopModal()">저장</button>
    </div>
  </div>
</div>

<!-- 팀 맵핑 모달 -->
<div id="vo-team-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:520px;max-height:580px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <div>
        <h3 id="vo-team-title" style="font-size:15px;font-weight:800;margin:0 0 3px">하위 팀 매핑</h3>
        <p style="font-size:12px;color:#6B7280;margin:0">해당 그룹에 속할 실제 인사 조직 단위(팀)를 매핑합니다.</p>
      </div>
      <button onclick="voCloseModal('vo-team-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="padding:12px 20px;border-bottom:1px solid #F3F4F6">
      <input id="vo-team-search" type="text" placeholder="🔍 팀명 검색..." oninput="voFilterTree()"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;background:#F9FAFB">
    </div>
    <div id="vo-tree-container" style="flex:1;overflow-y:auto;padding:12px 20px;background:#fff"></div>
    <div style="padding:16px 20px;border-top:1px solid #F3F4F6;background:#F9FAFB;display:flex;align-items:center;justify-content:space-between">
      <span id="vo-sel-count" style="font-size:13px;color:#111827;font-weight:800">0개 선택됨</span>
      <div style="display:flex;gap:8px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-team-modal')">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmAddTeams()">완료</button>
      </div>
    </div>
  </div>
</div>`;
}

// ── 템플릿 관련 ────────────────────────────────────────────────────────────────
function voSelectTemplate(id) {
  _voActiveTemplateId = id;
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voOpenCreateTemplate() {
  const el = document.getElementById('vo-tpl-name');
  if (el) el.value = '';
  const t = document.getElementById('vo-tpl-type');
  if (t) t.value = 'general';
  document.getElementById('vo-tpl-create-modal').style.display = 'flex';
}

function voConfirmCreateTemplate() {
  const name = document.getElementById('vo-tpl-name').value.trim();
  const type = document.getElementById('vo-tpl-type').value;
  if (!name) { alert('템플릿명을 입력해주세요.'); return; }
  const id   = 'TPL_' + Date.now();
  const tree = type === 'rnd' ? { label: name, centers: [] } : { label: name, hqs: [] };
  const currentGroupId = _voGroupId;
  VIRTUAL_ORG_TEMPLATES.push({
    id, tenantId: _voTenantId || boCurrentPersona.tenantId,
    isolationGroupId: currentGroupId || null, name, tree
  });
  _voActiveTemplateId = id;
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  voCloseModal('vo-tpl-create-modal');
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voRemoveTemplate(id) {
  if (!confirm('이 템플릿을 삭제하시겠습니까? (연결된 예산 정책도 무효화될 수 있습니다.)')) return;
  const idx = VIRTUAL_ORG_TEMPLATES.findIndex(t => t.id === id);
  if (idx > -1) {
    VIRTUAL_ORG_TEMPLATES.splice(idx, 1);
    if (_voActiveTemplateId === id) _voActiveTemplateId = null;
    _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
    document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  }
}

// ── 그룹(본부/센터) 생성·수정 ─────────────────────────────────────────────────
function voOpenCreateGroup(budgetType) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정: 전역 헬퍼 사용
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const el = document.getElementById('vo-group-create-title');
  if (el) el.textContent = isRnd ? '가상 센터 생성' : '가상 본부 생성';
  const nm = document.getElementById('vo-group-name');
  if (nm) nm.value = '';
  const mg = document.getElementById('vo-group-manager');
  if (mg) mg.value = '';
  _voEditGroupIdx = null;
  _voPopulateManagerDropdown('');
  document.getElementById('vo-group-create-modal').style.display = 'flex';
}

function voOpenEditGroup(groupIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정: 전역 헬퍼 사용
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list  = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  const g     = list[groupIdx];
  if (!g) return;
  const et = document.getElementById('vo-group-create-title');
  if (et) et.textContent = `"${g.name}" 수정`;
  const nm = document.getElementById('vo-group-name');
  if (nm) nm.value = g.name;
  const mg = document.getElementById('vo-group-manager');
  if (mg) mg.value = g.manager || '';
  _voEditGroupIdx = groupIdx;
  _voPopulateManagerDropdown(g.managerPersonaKey || '');
  document.getElementById('vo-group-create-modal').style.display = 'flex';
}

function _voPopulateManagerDropdown(selectedKey) {
  const sel = document.getElementById('vo-group-manager-key');
  if (!sel) return;
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '';

  // 현재 격리그룹의 운영 담당자 목록
  const myGroup = _voGroupId
    ? (typeof ISOLATION_GROUPS !== 'undefined' ? ISOLATION_GROUPS.find(g => g.id === _voGroupId) : null)
    : null;
  const opManagerKeys = myGroup ? (myGroup.opManagerKeys || []) : [];

  sel.innerHTML = "<option value=''>— 담당자 미지정 —</option>";

  if (opManagerKeys.length === 0) {
    const opt = document.createElement('option');
    opt.value = ''; opt.disabled = true;
    opt.textContent = '※ 격리 그룹 관리에서 운영 담당자를 먼저 등록해주세요';
    sel.appendChild(opt);
    sel.style.borderColor = '#FCA5A5';
  } else {
    sel.style.borderColor = '#E5E7EB';
    opManagerKeys.forEach(k => {
      const p = BO_PERSONAS[k];
      if (!p) return;
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `${p.name} (${p.dept} · ${p.scope || p.pos})`;
      if (k === selectedKey) opt.selected = true;
      sel.appendChild(opt);
    });
  }
}

function voConfirmCreateGroup() {
  const name   = document.getElementById('vo-group-name').value.trim();
  const mgr    = document.getElementById('vo-group-manager').value.trim() || '담당자 미정';
  const mgrKey = document.getElementById('vo-group-manager-key')?.value || '';
  if (!name) { alert('그룹명을 입력해주세요.'); return; }

  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list  = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;

  if (_voEditGroupIdx !== null && _voEditGroupIdx !== undefined) {
    const g = list[_voEditGroupIdx];
    g.name = name; g.manager = mgr; g.managerPersonaKey = mgrKey;
  } else {
    list.push({ id:'VG'+Date.now(), name, manager:mgr, managerPersonaKey:mgrKey,
      cooperators:[], budget:{total:0,deducted:0,holding:0}, teams:[] });
  }
  voCloseModal('vo-group-create-modal');
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// ── 협조처 ────────────────────────────────────────────────────────────────────
function voOpenCoopModal(groupIdx) {
  _voCoopGroupIdx = groupIdx;
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[groupIdx];
  if (!g) return;
  _voRenderCoopList(g.cooperators || []);
  const ti = document.getElementById('vo-coop-team-input');
  const ri = document.getElementById('vo-coop-role-input');
  if (ti) ti.value = '';
  if (ri) ri.value = '';
  document.getElementById('vo-coop-modal').style.display = 'flex';
}

function _voRenderCoopList(cooperators) {
  const el = document.getElementById('vo-coop-list');
  if (!el) return;
  if (cooperators.length === 0) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">설정된 협조처가 없습니다</div>';
    return;
  }
  el.innerHTML = cooperators.map((c,i) => `
<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#F9FAFB;border-radius:8px;margin-bottom:6px">
  <div>
    <span style="font-weight:700;font-size:12px">🤝 ${c.teamName}</span>
    <span style="font-size:11px;color:#6B7280;margin-left:6px">${c.role || '협조'}</span>
  </div>
  <button onclick="_voDeleteCoop(${i})" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:14px">✕</button>
</div>`).join('');
}

function _voDeleteCoop(idx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[_voCoopGroupIdx];
  g.cooperators.splice(idx, 1);
  _voRenderCoopList(g.cooperators);
}

function voAddCoopTeam() {
  const teamName = document.getElementById('vo-coop-team-input')?.value.trim();
  const role     = document.getElementById('vo-coop-role-input')?.value.trim() || '협조';
  if (!teamName) { alert('팀명을 입력하세요.'); return; }
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[_voCoopGroupIdx];
  if (!g.cooperators) g.cooperators = [];
  g.cooperators.push({ teamId: 'CT'+Date.now(), teamName, role });
  _voRenderCoopList(g.cooperators);
  const ti = document.getElementById('vo-coop-team-input');
  const ri = document.getElementById('vo-coop-role-input');
  if (ti) ti.value = '';
  if (ri) ri.value = '';
}

function voSaveCoopModal() {
  voCloseModal('vo-coop-modal');
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// ── 직군 토글 ─────────────────────────────────────────────────────────────────
function voToggleJobType(groupIdx, teamIdx, jobType) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[groupIdx];
  const team = g.teams[teamIdx];
  if (!team.allowedJobTypes) team.allowedJobTypes = [];
  const idx = team.allowedJobTypes.indexOf(jobType);
  if (idx >= 0) team.allowedJobTypes.splice(idx, 1);
  else team.allowedJobTypes.push(jobType);
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voSelectAllJobTypes(groupIdx, teamIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[groupIdx];
  const team = g.teams[teamIdx];
  const allTypes = getTenantJobTypes(boCurrentPersona.tenantId);
  const allSelected = allTypes.every(jt => (team.allowedJobTypes||[]).includes(jt));
  team.allowedJobTypes = allSelected ? [] : [...allTypes];
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voRemoveGroup(groupIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list  = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  if (!confirm(`"${list[groupIdx].name}" 그룹을 삭제하시겠습니까?`)) return;
  list.splice(groupIdx, 1);
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// ── 팀 맵핑 ──────────────────────────────────────────────────────────────────
function voOpenAddTeam(groupIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  _voCurrentGroup = { budgetType: isRnd ? 'rnd' : 'general', groupIdx };
  _voSelectedTeams = new Set();

  const grp = isRnd ? activeTpl.tree.centers[groupIdx] : activeTpl.tree.hqs[groupIdx];
  const tt = document.getElementById('vo-team-title');
  if (tt) tt.textContent = `"${grp.name}" 하위 팀 맵핑`;
  const ts = document.getElementById('vo-team-search');
  if (ts) ts.value = '';

  const existIds = new Set();
  const groups   = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  groups.forEach(g => g.teams.forEach(t => existIds.add(t.id)));

  voRenderTree(_voCurrentGroup.budgetType, existIds);
  document.getElementById('vo-team-modal').style.display = 'flex';
}

function voRenderTree(budgetType, existIds, filter = '') {
  const orgGroups = budgetType === 'rnd' ? REAL_ORG_TREE.rnd : REAL_ORG_TREE.general;
  const lf = filter.toLowerCase();
  const isRnd = budgetType === 'rnd';

  const html = orgGroups.map(g => {
    const vis = g.children.filter(t => !lf || t.name.toLowerCase().includes(lf) || g.name.toLowerCase().includes(lf));
    if (!vis.length) return '';
    const gc  = isRnd ? '#6D28D9' : '#1E40AF';
    const gbg = isRnd ? '#F5F3FF' : '#EFF6FF';
    const gbd = isRnd ? '#DDD6FE' : '#BFDBFE';
    const teamHtml = vis.map(t => {
      const ex = existIds && existIds.has(t.id);
      const ck = _voSelectedTeams.has(t.id);
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
                cursor:${ex ? 'not-allowed' : 'pointer'};background:${ex ? '#F9FAFB' : ck ? '#EFF6FF' : '#fff'};
                border:1px solid ${ck && !ex ? '#93C5FD' : '#E5E7EB'};margin-bottom:6px;opacity:${ex ? '.5' : '1'};
                transition:all 0.15s">
        <input type="checkbox" value="${t.id}" data-name="${t.name}" ${ex ? 'disabled' : ''}
          ${ck ? 'checked' : ''} onchange="voToggleTeam(this)"
          style="width:16px;height:16px;accent-color:#1D4ED8;margin:0">
        <span style="font-size:16px">👥</span>
        <span style="font-size:13px;font-weight:${ck ? '700' : '600'};color:${ck ? '#1D4ED8' : '#374151'};flex:1">${t.name}</span>
        <span style="font-size:11px;color:#9CA3AF">${t.parentName}</span>
        ${ex ? '<span style="font-size:10px;color:#6B7280;background:#E5E7EB;padding:2px 6px;border-radius:12px;font-weight:700">맵핑됨</span>' : ''}
      </label>`;
    }).join('');
    return `<div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;
                  background:${gbg};border:1px solid ${gbd};margin-bottom:8px">
        <span>${isRnd ? '🔬' : '🏢'}</span>
        <span style="font-weight:800;font-size:13px;color:${gc}">${g.name}</span>
      </div>
      <div style="padding-left:12px">${teamHtml}</div>
    </div>`;
  }).join('');
  const cont = document.getElementById('vo-tree-container');
  if (cont) cont.innerHTML = html || '<div style="text-align:center;color:#9CA3AF;padding:40px;font-size:13px">검색 결과가 없습니다</div>';
}

function voFilterTree() {
  const filter = document.getElementById('vo-team-search').value;
  const { budgetType } = _voCurrentGroup;
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd    = activeTpl.tree.centers !== undefined;
  const existIds = new Set();
  const groups   = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  groups.forEach(g => g.teams.forEach(t => existIds.add(t.id)));
  voRenderTree(budgetType, existIds, filter);
  _voSelectedTeams.forEach(id => {
    const cb = document.querySelector(`#vo-tree-container input[value="${id}"]`);
    if (cb) cb.checked = true;
  });
}

function voToggleTeam(cb) {
  cb.checked ? _voSelectedTeams.add(cb.value) : _voSelectedTeams.delete(cb.value);
  const sc = document.getElementById('vo-sel-count');
  if (sc) { sc.textContent = `${_voSelectedTeams.size}개 매핑됨`; sc.style.color = _voSelectedTeams.size > 0 ? '#1D4ED8' : '#111827'; }
  cb.closest('label').style.background   = cb.checked ? '#EFF6FF' : '#fff';
  cb.closest('label').style.borderColor  = cb.checked ? '#93C5FD' : '#E5E7EB';
}

function voConfirmAddTeams() {
  if (!_voSelectedTeams.size) { alert('매핑할 팀을 하나 이상 선택해주세요.'); return; }
  const { groupIdx } = _voCurrentGroup;
  const activeTpl    = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const grp   = isRnd ? activeTpl.tree.centers[groupIdx] : activeTpl.tree.hqs[groupIdx];
  document.querySelectorAll('#vo-tree-container input:checked').forEach(cb => {
    if (_voSelectedTeams.has(cb.value)) {
      grp.teams.push({ id: cb.value, name: cb.dataset.name, allowedJobTypes: [], budget: { allocated: 0, deducted: 0, holding: 0 } });
    }
  });
  voCloseModal('vo-team-modal');
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voRemoveTeam(groupIdx, teamIdx) {
  if (!confirm('이 팀을 템플릿에서 제거하시겠습니까?')) return;
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const grp   = isRnd ? activeTpl.tree.centers[groupIdx] : activeTpl.tree.hqs[groupIdx];
  grp.teams.splice(teamIdx, 1);
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voCloseModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
