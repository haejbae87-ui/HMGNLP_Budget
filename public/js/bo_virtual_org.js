// ─── 가상조직 템플릿 관리 ──────────────────────────────────────────────────────
// 버그수정: myTemplates를 전역 _voMyTemplates로 이동 (로컬 변수 참조 오류 수정)
// 기능추가: 플랫폼총괄·테넌트총괄 역할별 필터바 (테넌트/격리그룹 선택)

let _voActiveTemplateId = null;
let _voMyTemplates = [];
let _voCurrentGroup = null;
let _voSelectedTeams = new Set();
let _voEditGroupIdx = null;
let _voCoopGroupIdx = null;

let _voServiceType = 'edu_support'; // 기본 제도 유형
let _voTenantId = null;

// 용도 카드 선택 토글 (레거시 단일선택 - 하위호환)
window._voSelectPurpose = function (purpose) {
  const map = { edu_support: 'edu', language: 'lang', cert: 'cert', badge: 'badge' };
  ['edu', 'lang', 'cert', 'badge'].forEach(k => {
    const el = document.getElementById(`vo-purpose-btn-${k}`);
    if (!el) return;
    const active = map[purpose] === k;
    el.style.border = active ? '2px solid #3B82F6' : '2px solid #E5E7EB';
    el.style.background = active ? '#EFF6FF' : '#F9FAFB';
  });
};

// ── 신규 생성 모달 멀티선택 전용 ──────────────────────────────────────────────
let _voSelectedPurposes = new Set(['edu_support']);

window._voTogglePurpose = async function (purpose) {
  if (_voSelectedPurposes.has(purpose)) {
    if (_voSelectedPurposes.size <= 1) return; // 최소 1개 유지
    _voSelectedPurposes.delete(purpose);
  } else {
    _voSelectedPurposes.add(purpose);
  }
  const btnMap = { edu_support: 'edu', language: 'lang', cert: 'cert', badge: 'badge' };
  Object.entries(btnMap).forEach(([val, key]) => {
    const el = document.getElementById('vo-purpose-btn-' + key);
    if (!el) return;
    const active = _voSelectedPurposes.has(val);
    el.style.border = active ? '2px solid #3B82F6' : '2px solid #E5E7EB';
    el.style.background = active ? '#EFF6FF' : '#F9FAFB';
    const titleEl = el.querySelector('div > div:first-child');
    if (titleEl) titleEl.style.color = active ? '#1D4ED8' : '#374151';
  });
  await _voLoadRolesCheckboxes([..._voSelectedPurposes]);
};

async function _voLoadRolesCheckboxes(selectedPurposes) {
  const box = document.getElementById('vo-tpl-roles-box');
  if (!box) return;
  if (!selectedPurposes || selectedPurposes.length === 0) {
    box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">제도유형을 먼저 선택하세요</span>';
    return;
  }
  box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">로딩 중...</span>';
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    let roles = [];
    if (sb) {
      const { data } = await sb.from('roles').select('code,name,service_type').eq('tenant_id', _voTenantId);
      if (data) roles = data;
    } else if (typeof TENANT_ROLES_MOCK !== 'undefined') {
      roles = TENANT_ROLES_MOCK.filter(r => r.tenant_id === _voTenantId);
    }
    const filtered = roles.filter(r => {
      const st = r.service_type || 'all';
      if (st === 'all') return true;
      return st.split(',').some(s => selectedPurposes.includes(s.trim()));
    });
    if (!filtered.length) {
      box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">해당 제도유형의 역할이 없습니다</span>';
      return;
    }
    box.innerHTML = filtered.map(r => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-radius:4px;font-size:12px">
        <input type="checkbox" class="vo-role-chk" value="${r.code}" style="width:14px;height:14px;accent-color:#1D4ED8">
        <span style="font-weight:600;color:#374151">${r.name}</span>
        <span style="color:#9CA3AF;font-size:10px">(${r.code})</span>
      </label>`).join('');
  } catch (e) {
    box.innerHTML = '<span style="color:#EF4444;font-size:12px">로드 실패</span>';
  }
}

// ── 수정 모달 전용 멀티선택 ────────────────────────────────────────────────────
let _voEditSelectedPurposes = new Set(['edu_support']);

window._voEditTogglePurpose = async function (purpose) {
  if (_voEditSelectedPurposes.has(purpose)) {
    if (_voEditSelectedPurposes.size <= 1) return;
    _voEditSelectedPurposes.delete(purpose);
  } else {
    _voEditSelectedPurposes.add(purpose);
  }
  const btnMap = { edu_support: 'edu', language: 'lang', cert: 'cert', badge: 'badge' };
  Object.entries(btnMap).forEach(([val, key]) => {
    const el = document.getElementById('vo-edit-btn-' + key);
    if (!el) return;
    const active = _voEditSelectedPurposes.has(val);
    el.style.border = active ? '2px solid #3B82F6' : '2px solid #E5E7EB';
    el.style.background = active ? '#EFF6FF' : '#F9FAFB';
    const titleEl = el.querySelector('div > div:first-child');
    if (titleEl) titleEl.style.color = active ? '#1D4ED8' : '#374151';
  });
  await _voLoadEditRolesCheckboxes([..._voEditSelectedPurposes], window._voEditCurrentRoleIds || []);
};

async function _voLoadEditRolesCheckboxes(selectedPurposes, preChecked) {
  const box = document.getElementById('vo-edit-roles-box');
  if (!box) return;
  if (!selectedPurposes || selectedPurposes.length === 0) {
    box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">제도유형을 먼저 선택하세요</span>';
    return;
  }
  box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">로딩 중...</span>';
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    let roles = [];
    if (sb) {
      const { data } = await sb.from('roles').select('code,name,service_type').eq('tenant_id', _voTenantId);
      if (data) roles = data;
    }
    const filtered = roles.filter(r => {
      const st = r.service_type || 'all';
      if (st === 'all') return true;
      return st.split(',').some(s => selectedPurposes.includes(s.trim()));
    });
    if (!filtered.length) {
      box.innerHTML = '<span style="color:#9CA3AF;font-size:12px">해당 제도유형의 역할이 없습니다</span>';
      return;
    }
    box.innerHTML = filtered.map(r => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-radius:4px;font-size:12px">
        <input type="checkbox" class="vo-edit-role-chk" value="${r.code}"
          ${(preChecked || []).includes(r.code) ? 'checked' : ''}
          style="width:14px;height:14px;accent-color:#1D4ED8">
        <span style="font-weight:600;color:#374151">${r.name}</span>
        <span style="color:#9CA3AF;font-size:10px">(${r.code})</span>
      </label>`).join('');
  } catch (e) {
    box.innerHTML = '<span style="color:#EF4444;font-size:12px">로드 실패</span>';
  }
}

async function voOpenEditTemplate(tplId) {
  const tpl = _voMyTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  document.getElementById('vo-tpl-edit-id').value = tplId;
  document.getElementById('vo-tpl-edit-name').value = tpl.name || '';
  // 기존 제도유형 복원
  const existTypes = Array.isArray(tpl.serviceTypes) && tpl.serviceTypes.length
    ? tpl.serviceTypes
    : [(tpl.serviceType || tpl.purpose || 'edu_support')];
  _voEditSelectedPurposes = new Set(existTypes);
  // 기존 역할 복원
  const existRoles = Array.isArray(tpl.ownerRoleIds) && tpl.ownerRoleIds.length
    ? tpl.ownerRoleIds
    : (tpl.ownerRoleId ? [tpl.ownerRoleId] : []);
  window._voEditCurrentRoleIds = existRoles;
  // 카드 스타일 초기화
  const btnMap = { edu_support: 'edu', language: 'lang', cert: 'cert', badge: 'badge' };
  Object.entries(btnMap).forEach(([val, key]) => {
    const btn = document.getElementById('vo-edit-btn-' + key);
    if (!btn) return;
    const active = _voEditSelectedPurposes.has(val);
    btn.style.border = active ? '2px solid #3B82F6' : '2px solid #E5E7EB';
    btn.style.background = active ? '#EFF6FF' : '#F9FAFB';
    const titleEl = btn.querySelector('div > div:first-child');
    if (titleEl) titleEl.style.color = active ? '#1D4ED8' : '#374151';
  });
  await _voLoadEditRolesCheckboxes([..._voEditSelectedPurposes], existRoles);
  document.getElementById('vo-tpl-edit-modal').style.display = 'flex';
}

async function voConfirmEditTemplate() {
  const tplId = document.getElementById('vo-tpl-edit-id')?.value;
  const newName = document.getElementById('vo-tpl-edit-name')?.value.trim();
  if (!newName) { alert('이름을 입력해주세요.'); return; }
  const selectedTypes = [..._voEditSelectedPurposes];
  if (!selectedTypes.length) { alert('제도유형을 하나 이상 선택해주세요.'); return; }
  const checkedRoles = [...document.querySelectorAll('.vo-edit-role-chk:checked')].map(cb => cb.value);
  const tpl = _voMyTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  tpl.name = newName;
  tpl.serviceType = selectedTypes[0];
  tpl.serviceTypes = selectedTypes;
  tpl.purpose = selectedTypes[0];
  tpl.ownerRoleId = checkedRoles[0] || null;
  tpl.ownerRoleIds = checkedRoles;
  voCloseModal('vo-tpl-edit-modal');
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  await _voAutoSave(tpl);
}


// ─── DB 저장 헬퍼 (_sb() 직접 사용) ─────────────────────────────────────────
async function _voSaveToDB(tpl) {
  if (!tpl) return false;
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb) { console.warn('[VOrg] Supabase client not ready'); return false; }
    const payload = {
      id: tpl.id,
      tenant_id: tpl.tenantId,
      name: tpl.name,
      purpose: tpl.purpose || 'edu_support',
      service_type: Array.isArray(tpl.serviceTypes) ? tpl.serviceTypes.join(',') : (tpl.serviceType || 'edu_support'),
      owner_role_id: (Array.isArray(tpl.ownerRoleIds) && tpl.ownerRoleIds.length > 0) ? tpl.ownerRoleIds[0] : (tpl.ownerRoleId || null),
      owner_role_ids: Array.isArray(tpl.ownerRoleIds) ? tpl.ownerRoleIds : (tpl.ownerRoleId ? [tpl.ownerRoleId] : []),
      tree_data: tpl.tree,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('virtual_org_templates').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.warn('[VOrg] DB 저장 실패:', e.message);
    return false;
  }
}

// ─── 자동 저장 (토스트 포함) ──────────────────────────────────────────────────
async function _voAutoSave(tpl) {
  const ok = await _voSaveToDB(tpl);
  const toast = document.createElement('div');
  if (ok) {
    toast.textContent = '💾 저장됨';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#059669;color:#fff;padding:8px 18px;border-radius:10px;font-size:12px;font-weight:800;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2)';
  } else {
    toast.textContent = '⚠️ DB 저장 실패 (로컬 반영 유지)';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#D97706;color:#fff;padding:8px 18px;border-radius:10px;font-size:12px;font-weight:800;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2)';
  }
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), ok ? 2000 : 4000);
}


// ─── 활성 템플릿 헬퍼 ─────────────────────────────────────────────────────────
function _voGetActiveTpl() {
  return _voMyTemplates.find(t => t.id === _voActiveTemplateId) || null;
}

// ─── 진입점 (async: DB 우선 로드) ───────────────────────────────────────────
async function renderVirtualOrg() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];

  if (!_voTenantId) {
    _voTenantId = (role === 'platform_admin')
      ? (tenants[0]?.id || 'HMC')
      : boCurrentPersona.tenantId || 'HMC';
  }
  const serviceTypes = [
    { id: 'edu_support', name: '교육지원' },
    { id: 'language', name: '어학' },
    { id: 'cert', name: '자격증' },
    { id: 'badge', name: '뱃지' }
  ];
  if (!_voServiceType) _voServiceType = 'edu_support';

  // DB 우선 로드 (mock 데이터 미사용)
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data, error } = await sb
        .from('virtual_org_templates')
        .select('*')
        .eq('tenant_id', _voTenantId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        _voMyTemplates = data.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          purpose: row.purpose || 'edu_support',
          serviceType: row.service_type || 'edu_support',
          ownerRoleId: row.owner_role_id || null,
          tree: row.tree_data || { hqs: [] },
        })).filter(t => {
          if ((t.serviceType || 'edu_support') !== _voServiceType) return false;
          // 조회 권한 필터
          if (role === 'platform_admin' || role === 'tenant_global_admin') return true;
          if (!t.ownerRoleId) return true; // 담당 역할 미지정이면 모두 보임
          const myCode = boCurrentPersona.roleCode || `${_voTenantId}_${role.replace('_global_admin', '_admin')}`;
          return t.ownerRoleId === myCode;
        });
      } else { _voMyTemplates = []; }
    } else { _voMyTemplates = []; }
  } catch (e) {
    console.warn('[VOrg] DB 로드 실패:', e.message);
    _voMyTemplates = [];
  }

  if (!_voActiveTemplateId || !_voMyTemplates.find(t => t.id === _voActiveTemplateId)) {
    _voActiveTemplateId = _voMyTemplates[0]?.id || null;
  }

  const isPlatform = role === 'platform_admin';
  const isTenant = role === 'tenant_global_admin';
  const tenantName = tenants.find(t => t.id === _voTenantId)?.name || _voTenantId;

  const tenantSelect = isPlatform ? `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">회사</label>
    <select onchange="_voTenantId=this.value;_voActiveTemplateId=null;renderVirtualOrg()"
      style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
      ${tenants.map(t => `<option value="${t.id}" ${t.id === _voTenantId ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>
  </div>` : `
  <div style="display:flex;align-items:center;gap:6px">
    <span style="font-size:14px">🏢</span>
    <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
  </div>`;

  const serviceTypeSelect = `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">제도 유형</label>
    <select onchange="_voServiceType=this.value;_voActiveTemplateId=null;renderVirtualOrg()"
      style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:white;cursor:pointer;min-width:180px">
      ${serviceTypes.map(s => `<option value="${s.id}" ${s.id === _voServiceType ? 'selected' : ''}>${s.name}</option>`).join('')}
    </select>
  </div>`;

  const filterBar = (isPlatform || isTenant || role === 'budget_global_admin') ? `
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 18px;
              background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:14px;margin-bottom:20px">
    ${tenantSelect}
    <span style="color:#D1D5DB;font-size:16px">|</span>
    ${serviceTypeSelect}
    <button onclick="renderVirtualOrg()"
      style="padding:7px 16px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;
             font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button>
  </div>` : '';

  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull(filterBar);
}

// ─── 내부 캐시 기준 조회 (DB 로드 후 _voMyTemplates 반환) ──────────────────────
function _voGetTemplatesByScope(tenantId, serviceType) {
  return _voMyTemplates; // renderVirtualOrg에서 이미 필터링된 결과를 사용
}

// ─── 내부 리렌더 (필터바 유지) ────────────────────────────────────────────────
function _voRerender() {
  // 상태변수 유지하고 다시 풀렌더
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
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
    const isRnd = activeTpl.tree.centers !== undefined;
    const groups = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
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
      // managerPersonaKeys 배열 지원 (기존 단일 managerPersonaKey 하위호환)
      const mgrKeys = g.managerPersonaKeys?.length ? g.managerPersonaKeys
        : (g.managerPersonaKey ? [g.managerPersonaKey] : []);
      const mgrBadge = mgrKeys.length > 0
        ? mgrKeys.map(k => {
          const p = BO_PERSONAS[k];
          return p ? `<span style="font-size:10px;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-weight:700">👤 ${p.name} (${p.dept})</span>` : '';
        }).join(' ')
        : `<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;font-weight:700">👤 담당자 미지정</span>`;
      return `
        <li style="margin-bottom:16px">
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 16px;margin-bottom:8px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="font-size:16px">${isRnd ? '🔬' : '🏢'}</span>
                <span style="font-weight:800;color:#111827;font-size:14px">${g.name}</span>
                <span style="font-size:11px;background:#E5E7EB;color:#374151;font-weight:700;padding:2px 8px;border-radius:20px">팀 ${g.teams.length}개</span>
                ${mgrBadge}
              </div>
              <div style="display:flex;gap:6px">
                <button class="bo-btn-secondary bo-btn-sm" onclick="voOpenEditGroup(${gIdx})" style="font-size:11px">✏️ 수정</button>
                <button class="bo-btn-secondary bo-btn-sm" onclick="voOpenAddTeam(${gIdx})" style="font-size:11px">+ 팀 매핑</button>
                <button class="bo-btn-secondary bo-btn-sm" onclick="voRemoveGroup(${gIdx})" style="font-size:11px;color:#EF4444;border-color:#EF4444">삭제</button>
              </div>
            </div>
          </div>
          <ul class="org-tree" style="padding-left:0">
            ${g.teams.length > 0 ? `<li style="margin-bottom:8px"><div style="background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:10px;padding:10px 16px">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:11px;font-weight:800;color:#1D4ED8">📋 맵핑된 조직 (${g.teams.length}개)</span>
                <span style="font-size:10px;color:#6B7280">${g.teams.filter(t => t.includesSubOrgs).length > 0 ? '📂 하위포함 조직 있음' : ''}</span>
              </div>
              ${g.teams.map((t, tIdx) => {
        const jts = t.allowedJobTypes && t.allowedJobTypes.length > 0 ? t.allowedJobTypes : [];
        const jtBadges = jts.map(j =>
          `<span style="font-size:10px;background:#D1FAE5;color:#065F46;padding:1px 7px;border-radius:5px;font-weight:700">${j}</span>`
        ).join(' ');
        const allTypes = getTenantJobTypes(boCurrentPersona.tenantId);
        const allSelected = allTypes.length > 0 && allTypes.every(jt => jts.includes(jt));
        const selectAllBtn = `<label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;padding:2px 8px;border-radius:5px;font-weight:900;background:${allSelected ? '#1D4ED8' : '#EFF6FF'};color:${allSelected ? 'white' : '#1D4ED8'};border:1px solid #BFDBFE" onclick="voSelectAllJobTypes(${gIdx},${tIdx})"><input type="checkbox" ${allSelected ? 'checked' : ''} style="margin:0;width:10px;height:10px"> 전체</label> `;
        const jtPicker = selectAllBtn + allTypes.map(jt => {
          const sel = jts.includes(jt);
          return `<label style="display:inline-flex;align-items:center;gap:3px;font-size:10px;cursor:pointer;padding:2px 6px;border-radius:5px;background:${sel ? '#059669' : '#F3F4F6'};color:${sel ? 'white' : '#374151'}" onclick="voToggleJobType(${gIdx},${tIdx},'${jt}')"><input type="checkbox" ${sel ? 'checked' : ''} style="margin:0;width:10px;height:10px"> ${jt}</label>`;
        }).join(' ');
        const subOrgBadge = t.includesSubOrgs ? '<span style="font-size:9px;background:#DBEAFE;color:#1D4ED8;padding:1px 6px;border-radius:4px;font-weight:800">📂 하위 전체 포함</span>' : '';
        return `
              <div style="display:flex;align-items:center;justify-content:space-between;
                            background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:8px 14px;margin-bottom:4px;
                            box-shadow:0 1px 2px rgba(0,0,0,0.02)">
                <div style="flex:1">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:${jts.length > 0 || allTypes.length > 0 ? '4px' : '0'}">
                    <span style="color:#9CA3AF;font-size:12px">👥</span>
                    <span style="font-weight:700;font-size:12px;color:#374151">${t.name}</span>
                    ${subOrgBadge}
                    ${jtBadges || (allTypes.length > 0 ? '<span style="font-size:10px;color:#9CA3AF">직군 미지정</span>' : '')}
                  </div>
                  ${allTypes.length > 0 ? `<div style="display:flex;gap:3px;flex-wrap:wrap;align-items:center">${jtPicker}</div>` : ''}
                </div>
                <button onclick="voRemoveTeam(${gIdx},${tIdx})"
                  style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:14px;padding:0 4px;margin-left:6px">✕</button>
              </div>`;
      }).join('')}
            </div></li>` : ''}
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
      <h1 class="bo-page-title" style="margin:0">가상교육조직 관리</h1>
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

<!-- 가상교육조직 생성 모달 -->
<div id="vo-tpl-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:800;margin:0">신규 가상교육조직 생성</h3>
      <button onclick="voCloseModal('vo-tpl-create-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">제도유형 <span style="color:#EF4444">*</span> <span style="font-size:10px;font-weight:400;color:#94A3B8">(복수 선택 가능)</span></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div id="vo-purpose-btn-edu" onclick="_voTogglePurpose('edu_support')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #3B82F6;border-radius:10px;cursor:pointer;background:#EFF6FF;user-select:none">
          <span style="font-size:18px">📚</span>
          <div><div style="font-size:12px;font-weight:800;color:#1D4ED8">교육지원</div><div style="font-size:10px;color:#64748B">예산 교육지원 조직</div></div>
        </div>
        <div id="vo-purpose-btn-lang" onclick="_voTogglePurpose('language')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🌐</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">어학</div><div style="font-size:10px;color:#64748B">어학연수 지원 조직</div></div>
        </div>
        <div id="vo-purpose-btn-cert" onclick="_voTogglePurpose('cert')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🏆</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">자격증</div><div style="font-size:10px;color:#64748B">자격증 취득 지원</div></div>
        </div>
        <div id="vo-purpose-btn-badge" onclick="_voTogglePurpose('badge')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🎖️</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">뱃지</div><div style="font-size:10px;color:#64748B">배지 발급 조직</div></div>
        </div>
      </div>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">담당 역할 <span style="font-size:10px;font-weight:400;color:#94A3B8">(커맰 제도유형에 해당하는 역할만 표시)</span></label>
      <div id="vo-tpl-roles-box" style="border:1.5px solid #E5E7EB;border-radius:8px;padding:10px;max-height:160px;overflow-y:auto;font-size:12px;color:#9CA3AF">
        제도유형을 먼저 선택하세요
      </div>
    </div>
    <div style="margin-bottom:24px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가상조직명 *</label>
      <input id="vo-tpl-name" type="text" placeholder="예) HMC 일반교육예산 가상조직"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-tpl-create-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmCreateTemplate()">생성</button>
    </div>
  </div>
</div>

<!-- 가상조직 설정 수정 모달 -->
<div id="vo-tpl-edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:800;margin:0">✏️ 가상조직 설정 수정</h3>
      <button onclick="voCloseModal('vo-tpl-edit-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <input type="hidden" id="vo-tpl-edit-id">
    <!-- 제도유형 멀티선택 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">제도유형 <span style="color:#EF4444">*</span> <span style="font-size:10px;font-weight:400;color:#94A3B8">(복수 선택 가능)</span></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div id="vo-edit-btn-edu" onclick="_voEditTogglePurpose('edu_support')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">📚</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">교육지원</div><div style="font-size:10px;color:#64748B">예산 교육지원 조직</div></div>
        </div>
        <div id="vo-edit-btn-lang" onclick="_voEditTogglePurpose('language')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🌐</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">어학</div><div style="font-size:10px;color:#64748B">어학연수 지원 조직</div></div>
        </div>
        <div id="vo-edit-btn-cert" onclick="_voEditTogglePurpose('cert')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🏆</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">자격증</div><div style="font-size:10px;color:#64748B">자격증 취득 지원</div></div>
        </div>
        <div id="vo-edit-btn-badge" onclick="_voEditTogglePurpose('badge')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;cursor:pointer;background:#F9FAFB;user-select:none">
          <span style="font-size:18px">🎖️</span>
          <div><div style="font-size:12px;font-weight:800;color:#374151">밓지</div><div style="font-size:10px;color:#64748B">배지 발급 조직</div></div>
        </div>
      </div>
    </div>
    <!-- 담당 역할 체크박스 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">담당 역할 <span style="font-size:10px;font-weight:400;color:#94A3B8">(선택한 제도유형 해당 역할)</span></label>
      <div id="vo-edit-roles-box" style="border:1.5px solid #E5E7EB;border-radius:8px;padding:10px;max-height:140px;overflow-y:auto;font-size:12px;color:#9CA3AF">
        제도유형을 먼저 선택하세요
      </div>
    </div>
    <!-- 가상조직명 -->
    <div style="margin-bottom:24px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가상조직명 *</label>
      <input id="vo-tpl-edit-name" type="text" placeholder="새 이름 입력"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-tpl-edit-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmEditTemplate()">저장</button>
    </div>
  </div>
</div>


<!-- 그룹 생성/수정 모달 (단순화: 담당자 연결 제거) -->
<div id="vo-group-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:420px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 id="vo-group-create-title" style="font-size:15px;font-weight:800;margin:0">가상 그룹 생성</h3>
      <button onclick="voCloseModal('vo-group-create-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:24px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">그룹명 *</label>
      <input id="vo-group-name" type="text" placeholder="예) 전략본부"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="voCloseModal('vo-group-create-modal')">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="voConfirmCreateGroup()">저장</button>
    </div>
  </div>
</div>

<!-- 협조처 설정 모달 -->
<div id="vo-coop-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:560px;max-height:88vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div>
        <h3 style="font-size:15px;font-weight:800;margin:0 0 3px">🤝 협조처 설정</h3>
        <p style="font-size:11px;color:#6B7280;margin:0">결재라인에 포함할 협조처를 복수로 추가할 수 있습니다</p>
      </div>
      <button onclick="voCloseModal('vo-coop-modal')" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>

    <!-- 등록된 협조처 목록 -->
    <div id="vo-coop-list" style="max-height:220px;overflow-y:auto;margin-bottom:16px"></div>

    <!-- 협조처 추가 폼 -->
    <div style="background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:12px;padding:16px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:12px">✏️ 협조처 추가</div>

      <!-- 협조처 유형 -->
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:7px">협조처 유형 <span style="color:#EF4444">*</span></div>
        <div style="display:flex;gap:10px">
          <label style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;cursor:pointer;border:1.5px solid #BFDBFE;background:#EFF6FF">
            <input type="radio" name="vo-coop-type" value="교육협조처" checked style="accent-color:#1D4ED8;width:14px;height:14px">
            <span style="font-size:12px;font-weight:700;color:#1D4ED8">📚 교육협조처</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;cursor:pointer;border:1.5px solid #E5E7EB;background:#F9FAFB">
            <input type="radio" name="vo-coop-type" value="재경협조처" style="accent-color:#D97706;width:14px;height:14px">
            <span style="font-size:12px;font-weight:700;color:#92400E">💰 재경협조처</span>
          </label>
        </div>
      </div>

      <!-- 필수/선택 여부 -->
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:7px">협조 구분 <span style="color:#EF4444">*</span></div>
        <div style="display:flex;gap:10px">
          <label style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;cursor:pointer;border:1.5px solid #FECACA;background:#FEF2F2">
            <input type="radio" name="vo-coop-required" value="필수" checked style="accent-color:#EF4444;width:14px;height:14px">
            <span style="font-size:12px;font-weight:700;color:#EF4444">🔴 필수 협조처</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;cursor:pointer;border:1.5px solid #E5E7EB;background:#F9FAFB">
            <input type="radio" name="vo-coop-required" value="선택" style="accent-color:#6B7280;width:14px;height:14px">
            <span style="font-size:12px;font-weight:700;color:#6B7280">⚪ 선택 협조처</span>
          </label>
        </div>
      </div>

      <!-- 팀명·역할 입력 -->
      <div style="display:flex;gap:8px;align-items:flex-end">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:5px">팀명 <span style="color:#EF4444">*</span></div>
          <input id="vo-coop-team-input" placeholder="예) HRD팀, 재무팀" style="width:100%;box-sizing:border-box;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;outline:none">
        </div>
        <div style="width:120px">
          <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:5px">역할</div>
          <input id="vo-coop-role-input" placeholder="예) 검토, 확인" style="width:100%;box-sizing:border-box;padding:8px 11px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;outline:none">
        </div>
        <button onclick="voAddCoopTeam()" class="bo-btn-primary bo-btn-sm" style="flex-shrink:0;padding:8px 16px">+ 추가</button>
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

function voSelectTemplate(id) {
  _voActiveTemplateId = id;
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// ── 담당 역할 옵션 로드 유틸리티 ────────────────────────────────────────────────
async function _voLoadRolesOptions(selectedVal) {
  let opts = '<option value="">── 담당 역할 없음 (모두 접근 가능) ──</option>';
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    let roles = [];
    if (sb) {
      const { data } = await sb.from('roles').select('code, name').eq('tenant_id', _voTenantId);
      if (data) roles = data;
    } else if (typeof TENANT_ROLES_MOCK !== 'undefined') {
      roles = TENANT_ROLES_MOCK.filter(r => r.tenant_id === _voTenantId);
    }
    roles.forEach(r => {
      opts += `<option value="${r.code}" ${r.code === selectedVal ? 'selected' : ''}>${r.name} (${r.code})</option>`;
    });
  } catch (e) { }
  return opts;
}

// ── 템플릿 생성 / 수정 ───────────────────────────────────────────────────
async function voOpenCreateTemplate() {
  const el = document.getElementById('vo-tpl-name');
  if (el) el.value = '';
  // 제도유형 선택 초기화 - edu_support 하나만 선택된 상태로
  _voSelectedPurposes = new Set(['edu_support']);
  const btnMap = { edu_support: 'edu', language: 'lang', cert: 'cert', badge: 'badge' };
  Object.entries(btnMap).forEach(([val, key]) => {
    const btn = document.getElementById('vo-purpose-btn-' + key);
    if (!btn) return;
    const active = val === 'edu_support';
    btn.style.border = active ? '2px solid #3B82F6' : '2px solid #E5E7EB';
    btn.style.background = active ? '#EFF6FF' : '#F9FAFB';
    const titleEl = btn.querySelector('div > div:first-child');
    if (titleEl) titleEl.style.color = active ? '#1D4ED8' : '#374151';
  });
  // 초기 제도유형(edu_support)에 맞는 역할 로드
  await _voLoadRolesCheckboxes(['edu_support']);
  document.getElementById('vo-tpl-create-modal').style.display = 'flex';
}

function voConfirmCreateTemplate() {
  const name = document.getElementById('vo-tpl-name').value.trim();
  if (!name) { alert('가상조직명을 입력해주세요.'); return; }
  const selectedTypes = [..._voSelectedPurposes];
  if (selectedTypes.length === 0) { alert('제도유형을 하나 이상 선택해주세요.'); return; }
  // 체크된 역할들 수집
  const checkedRoles = [...document.querySelectorAll('.vo-role-chk:checked')].map(cb => cb.value);
  const id = 'TPL_' + Date.now();
  const tree = { label: name, hqs: [] };
  const newTpl = {
    id,
    tenantId: _voTenantId,
    serviceType: selectedTypes[0],       // 주 제도유형 (역호환성)
    serviceTypes: selectedTypes,           // 전체 멀티 제도유형
    purpose: selectedTypes[0],
    ownerRoleId: checkedRoles[0] || null, // 단일참조 역호환성
    ownerRoleIds: checkedRoles,            // 멀티 역할
    name,
    tree
  };
  _voMyTemplates.push(newTpl);
  _voActiveTemplateId = id;
  voCloseModal('vo-tpl-create-modal');
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  _voAutoSave(newTpl); // DB 저장
}

// ── 가상조직 이름 수정 ──────────────────────────────────────────────────
async function voOpenEditTemplate(tplId) {
  const tpl = _voMyTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  document.getElementById('vo-tpl-edit-id').value = tplId;
  document.getElementById('vo-tpl-edit-name').value = tpl.name;
  const ownerSel = document.getElementById('vo-tpl-edit-owner');
  if (ownerSel) ownerSel.innerHTML = await _voLoadRolesOptions(tpl.ownerRoleId || '');
  document.getElementById('vo-tpl-edit-modal').style.display = 'flex';
}

async function voConfirmEditTemplate() {
  const tplId = document.getElementById('vo-tpl-edit-id')?.value;
  const newName = document.getElementById('vo-tpl-edit-name')?.value.trim();
  const ownerId = document.getElementById('vo-tpl-edit-owner')?.value || null;
  if (!newName) { alert('이름을 입력해주세요.'); return; }
  const tpl = _voMyTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  tpl.name = newName;
  tpl.ownerRoleId = ownerId;
  voCloseModal('vo-tpl-edit-modal');
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  // owner_role_id 도 DB에 저장되도록 upsert
  await _voAutoSave(tpl);
}

async function voRemoveTemplate(id) {
  if (!confirm('이 가상교육조직을 삭제하시겠습니까? (연결된 정책도 무효화될 수 있습니다.)')) return;
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) { await sb.from('virtual_org_templates').delete().eq('id', id); }
  } catch (e) { console.warn('[VOrg] 삭제 실패:', e.message); }
  _voMyTemplates = _voMyTemplates.filter(t => t.id !== id);
  if (_voActiveTemplateId === id) _voActiveTemplateId = _voMyTemplates[0]?.id || null;
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// ── 그룹(본부/센터) 생성·수정 ─────────────────────────────────────────────────
function voOpenCreateGroup(budgetType) {
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const el = document.getElementById('vo-group-create-title');
  if (el) el.textContent = isRnd ? '가상 센터 생성' : '가상 본부 생성';
  const nm = document.getElementById('vo-group-name');
  if (nm) nm.value = '';
  _voEditGroupIdx = null;
  _voSelectedMgrKeys = [];
  _voRenderMgrPicker([]);
  document.getElementById('vo-group-create-modal').style.display = 'flex';
}

function voOpenEditGroup(groupIdx) {
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  const g = list[groupIdx];
  if (!g) return;
  const et = document.getElementById('vo-group-create-title');
  if (et) et.textContent = `"${g.name}" 수정`;
  const nm = document.getElementById('vo-group-name');
  if (nm) nm.value = g.name;
  _voEditGroupIdx = groupIdx;
  // 기존 담당자 복원 (배열 또는 단일key 하위호환)
  const existing = g.managerPersonaKeys?.length ? g.managerPersonaKeys
    : (g.managerPersonaKey ? [g.managerPersonaKey] : []);
  _voSelectedMgrKeys = [...existing];
  _voRenderMgrPicker(_voSelectedMgrKeys);
  document.getElementById('vo-group-create-modal').style.display = 'flex';
}

// 선택된 담당자 키 배열 (전역)
let _voSelectedMgrKeys = [];

// 담당자 피커 렌더 (검색+체크박스)
function _voRenderMgrPicker(selectedKeys, filter = '') {
  // 이제 격리그룹에 종속되지 않으므로, 테넌트 전체의 운영담당자(budget_ops/hq 등)를 모두 후보로 로드
  const allPersonas = Object.keys(BO_PERSONAS);
  const candidatesKeys = allPersonas.filter(k => {
    const p = BO_PERSONAS[k];
    if (!p || p.tenantId !== _voTenantId) return false;
    // 임시로 운영 관련 역할인 persona만 허용
    return p.role === 'budget_op_manager' || p.role === 'budget_hq' || p.role === 'budget_global_admin';
  });

  // 칩 영역
  const chips = document.getElementById('vo-mgr-chips');
  if (chips) {
    if (selectedKeys.length === 0) {
      chips.innerHTML = '<span style="font-size:11px;color:#9CA3AF">선택된 담당자 없음</span>';
    } else {
      chips.innerHTML = selectedKeys.map(k => {
        const p = BO_PERSONAS[k];
        if (!p) return '';
        return `<span style="display:inline-flex;align-items:center;gap:5px;background:#EFF6FF;color:#1D4ED8;
          padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid #BFDBFE">
          👤 ${p.name}
          <button onclick="_voRemoveMgr('${k}')" style="border:none;background:none;cursor:pointer;color:#93C5FD;font-size:12px;padding:0;line-height:1">✕</button>
        </span>`;
      }).join('');
    }
  }

  // 후보 목록
  const listEl = document.getElementById('vo-mgr-list');
  if (!listEl) return;

  const lf = filter.toLowerCase();
  const candidates = candidatesKeys.filter(k => {
    const p = BO_PERSONAS[k];
    if (!p) return false;
    if (!lf) return true;
    return p.name.toLowerCase().includes(lf) || (p.dept || '').toLowerCase().includes(lf);
  });

  if (candidates.length === 0) {
    listEl.innerHTML = `<div style="padding:14px 16px;font-size:11px;color:#9CA3AF;text-align:center">검색 결과 없음</div>`;
    return;
  }

  listEl.innerHTML = candidates.map(k => {
    const p = BO_PERSONAS[k];
    const sel = selectedKeys.includes(k);
    return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;
      cursor:pointer;background:${sel ? '#EFF6FF' : '#fff'};
      border-bottom:1px solid #F3F4F6;transition:background 0.15s"
      onmouseenter="this.style.background='${sel ? '#DBEAFE' : '#F9FAFB'}'"
      onmouseleave="this.style.background='${sel ? '#EFF6FF' : '#fff'}'">
      <input type="checkbox" value="${k}" ${sel ? 'checked' : ''}
        onchange="_voToggleMgr(this)" style="width:15px;height:15px;accent-color:#1D4ED8;margin:0;flex-shrink:0">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:${sel ? '800' : '600'};color:${sel ? '#1D4ED8' : '#374151'}">${p.name}</div>
        <div style="font-size:11px;color:#6B7280">${p.dept} · ${p.scope || p.pos || ''}</div>
      </div>
      ${sel ? '<span style="font-size:10px;color:#1D4ED8;font-weight:700;background:#BFDBFE;padding:2px 7px;border-radius:10px">선택됨</span>' : ''}
    </label>`;
  }).join('');
}

function _voToggleMgr(cb) {
  if (cb.checked) {
    if (!_voSelectedMgrKeys.includes(cb.value)) _voSelectedMgrKeys.push(cb.value);
  } else {
    _voSelectedMgrKeys = _voSelectedMgrKeys.filter(k => k !== cb.value);
  }
  _voRenderMgrPicker(_voSelectedMgrKeys, document.getElementById('vo-mgr-search')?.value || '');
}

function _voRemoveMgr(key) {
  _voSelectedMgrKeys = _voSelectedMgrKeys.filter(k => k !== key);
  _voRenderMgrPicker(_voSelectedMgrKeys, document.getElementById('vo-mgr-search')?.value || '');
}

function _voFilterMgrPicker() {
  const filter = document.getElementById('vo-mgr-search')?.value || '';
  _voRenderMgrPicker(_voSelectedMgrKeys, filter);
}

function voConfirmCreateGroup() {
  const name = document.getElementById('vo-group-name').value.trim();
  if (!name) { alert('그룹명을 입력해주세요.'); return; }

  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;

  if (_voEditGroupIdx !== null && _voEditGroupIdx !== undefined) {
    const g = list[_voEditGroupIdx];
    g.name = name;
    g.managerPersonaKeys = [..._voSelectedMgrKeys];
    // 하위호환: 첫 번째 키를 단일 필드에도 유지
    g.managerPersonaKey = _voSelectedMgrKeys[0] || '';
  } else {
    list.push({
      id: 'VG' + Date.now(), name,
      managerPersonaKeys: [..._voSelectedMgrKeys],
      managerPersonaKey: _voSelectedMgrKeys[0] || '',
      cooperators: [], budget: { total: 0, deducted: 0, holding: 0 }, teams: []
    });
  }
  voCloseModal('vo-group-create-modal');
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  _voAutoSave(_voGetActiveTpl());  // ★ DB 자동 저장
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
    el.innerHTML = '<div style="padding:16px;text-align:center;color:#9CA3AF;font-size:12px;background:#F9FAFB;border-radius:8px">설정된 협조처가 없습니다</div>';
    return;
  }
  el.innerHTML = cooperators.map((c, i) => {
    const typeColor = c.coopType === '재경협조처' ? { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: '💰' }
      : { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '📚' };
    const reqColor = c.required === '필수' ? '#EF4444' : '#6B7280';
    const reqIcon = c.required === '필수' ? '🔴' : '⚪';
    const reqLabel = c.required === '필수' ? '필수협조처' : '선택협조처';
    return `
<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
            background:${typeColor.bg};border:1px solid ${typeColor.border};border-radius:10px;margin-bottom:7px">
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-weight:800;font-size:13px;color:#111827">${c.teamName}</span>
      <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${typeColor.border};color:${typeColor.text};font-weight:700">
        ${typeColor.icon} ${c.coopType || '교육협조처'}
      </span>
      <span style="font-size:10px;padding:2px 8px;border-radius:6px;color:${reqColor};font-weight:700;background:${c.required === '필수' ? '#FEF2F2' : '#F3F4F6'};border:1px solid ${c.required === '필수' ? '#FECACA' : '#E5E7EB'}">
        ${reqIcon} ${reqLabel}
      </span>
      ${c.role && c.role !== '협조' ? `<span style="font-size:10px;color:#6B7280">${c.role}</span>` : ''}
    </div>
  </div>
  <button onclick="_voDeleteCoop(${i})" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:14px;flex-shrink:0">✕</button>
</div>`;
  }).join('');
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
  const role = document.getElementById('vo-coop-role-input')?.value.trim() || '협조';
  const coopType = document.querySelector('input[name="vo-coop-type"]:checked')?.value || '교육협조처';
  const required = document.querySelector('input[name="vo-coop-required"]:checked')?.value || '필수';
  if (!teamName) { alert('팀명을 입력하세요.'); return; }
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[_voCoopGroupIdx];
  if (!g.cooperators) g.cooperators = [];
  g.cooperators.push({ teamId: 'CT' + Date.now(), teamName, coopType, required, role });
  _voRenderCoopList(g.cooperators);
  // 입력 필드 초기화
  const ti = document.getElementById('vo-coop-team-input');
  const ri = document.getElementById('vo-coop-role-input');
  if (ti) ti.value = '';
  if (ri) ri.value = '';
  // 라디오는 기본값 유지 (사용자 편의)
}

function voSaveCoopModal() {
  voCloseModal('vo-coop-modal');
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  _voAutoSave(_voGetActiveTpl());  // ★ DB 자동 저장
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
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voSelectAllJobTypes(groupIdx, teamIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const g = (isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs)[groupIdx];
  const team = g.teams[teamIdx];
  const allTypes = getTenantJobTypes(boCurrentPersona.tenantId);
  const allSelected = allTypes.every(jt => (team.allowedJobTypes || []).includes(jt));
  team.allowedJobTypes = allSelected ? [] : [...allTypes];
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voRemoveGroup(groupIdx) {
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const list = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  if (!confirm(`"${list[groupIdx].name}" 그룹을 삭제하시겠습니까?`)) return;
  list.splice(groupIdx, 1);
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

// 전역: 팀 맵핑 모달용 로드된 조직 데이터
let _voOrgTreeData = [];  // [{ id, name, type, parent_id, children:[] }]

async function voOpenAddTeam(groupIdx) {
  const activeTpl = _voGetActiveTpl();
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
  const groups = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  groups.forEach(g => g.teams.forEach(t => existIds.add(t.id)));

  // 조직관리 DB에서 해당 회사 조직 로드
  const tenantId = activeTpl.tenantId || activeTpl.tenant_id;
  const cont = document.getElementById('vo-tree-container');
  if (cont) cont.innerHTML = '<div style="text-align:center;padding:30px;color:#9CA3AF;font-size:12px">조직 로딩 중...</div>';
  document.getElementById('vo-team-modal').style.display = 'flex';

  try {
    if (typeof _sb === 'function' && _sb()) {
      // DB에서 해당 회사(tenant) 조직 전체 로드
      const { data: orgs, error } = await _sb()
        .from('organizations')
        .select('id, name, type, parent_id, tenant_id')
        .eq('tenant_id', tenantId)
        .order('name');

      if (!error && orgs && orgs.length) {
        // 조직 트리 구성: 팀/실/센터 레벨 조직만 표시 (leaf 노드 우선, 부모 그룹과 함께)
        const orgMap = {};
        orgs.forEach(o => { orgMap[o.id] = { ...o, children: [] }; });
        const roots = [];
        orgs.forEach(o => {
          if (o.parent_id && orgMap[o.parent_id]) {
            orgMap[o.parent_id].children.push(orgMap[o.id]);
          } else if (!o.parent_id) {
            roots.push(orgMap[o.id]);
          }
        });
        _voOrgTreeData = roots;
        voRenderTree(existIds, '', roots);
        return;
      }
    }
  } catch (e) {
    console.warn('[VOrg] 조직 DB 로드 실패, 목데이터 사용:', e.message);
  }

  // 폴백: 기존 REAL_ORG_TREE 사용
  _voOrgTreeData = [];
  voRenderTreeLegacy(_voCurrentGroup.budgetType, existIds);
}

// DB 조직 트리 렌더 (organizations 테이블 데이터 기반)
// 타입별 아이콘/색상
function _voOrgStyle(type) {
  const s = {
    headquarters: { icon: '🏢', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
    center: { icon: '🔬', color: '#6D28D9', bg: '#F5F3FF', border: '#DDD6FE' },
    office: { icon: '📋', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
    division: { icon: '🏭', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    team: { icon: '👥', color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' }
  };
  return s[type] || s.team;
}

// 특정 노드의 모든 하위 자손 ID 수집
function _voGetDescendantIds(node) {
  const ids = [];
  function collect(n) {
    ids.push(n.id);
    (n.children || []).forEach(collect);
  }
  (node.children || []).forEach(collect);
  return ids;
}

// 상위 조직이 이미 선택돼 있는지 확인 (조상 중 선택된 것이 있으면 true)
function _voIsAncestorSelected(nodeId, tree) {
  function findParentSelected(nodes, targetId, ancestors) {
    for (const n of nodes) {
      if (n.id === targetId) return ancestors.some(a => _voSelectedTeams.has(a.id));
      const found = findParentSelected(n.children || [], targetId, [...ancestors, n]);
      if (found !== null) return found;
    }
    return null;
  }
  return findParentSelected(tree, nodeId, []) === true;
}

function voRenderTree(existIds, filter = '', orgTree) {
  const tree = orgTree || _voOrgTreeData;
  const lf = (filter || '').toLowerCase();

  function nodeMatchesFilter(node) {
    if (!lf) return true;
    if (node.name.toLowerCase().includes(lf)) return true;
    return (node.children || []).some(c => nodeMatchesFilter(c));
  }

  function renderNode(node, depth, ancestorSelected) {
    if (!nodeMatchesFilter(node)) return '';

    const hasChildren = node.children && node.children.length > 0;
    const ex = existIds && existIds.has(node.id);
    const ck = _voSelectedTeams.has(node.id);
    // 상위가 선택된 경우 → 이 노드는 이미 포함됨(dim 처리)
    const parentCk = ancestorSelected;
    const indent = depth * 20;
    const st = _voOrgStyle(node.type);

    const isDisabled = ex || parentCk;  // 이미 맵핑됐거나 상위 선택으로 포함됨

    // 배지
    let badge = '';
    if (ex) badge = '<span style="font-size:10px;color:#6B7280;background:#E5E7EB;padding:2px 7px;border-radius:12px;font-weight:700">맵핑됨</span>';
    else if (parentCk) badge = '<span style="font-size:10px;color:#065F46;background:#D1FAE5;padding:2px 7px;border-radius:12px;font-weight:700">✓ 포함됨</span>';
    else if (ck && hasChildren) badge = '<span style="font-size:10px;color:#1D4ED8;background:#DBEAFE;padding:2px 7px;border-radius:12px;font-weight:700">📂 하위 전체 포함</span>';

    const rowBg = parentCk ? '#F0FDF4' : ck ? (hasChildren ? '#EFF6FF' : '#EFF6FF') : '#fff';
    const rowBd = parentCk ? '#A7F3D0' : ck ? '#93C5FD' : '#E5E7EB';
    const nameCl = parentCk ? '#065F46' : ck ? '#1D4ED8' : '#374151';
    const cursor = isDisabled ? 'not-allowed' : 'pointer';
    const opacity = isDisabled && !parentCk ? '.5' : '1';

    const childHtml = hasChildren
      ? (node.children || []).map(c => renderNode(c, depth + 1, ck || parentCk)).join('')
      : '';

    return `<div style="margin-bottom:5px">
      <label style="display:flex;align-items:center;gap:9px;padding:9px 14px;padding-left:${14 + indent}px;
             border-radius:9px;cursor:${cursor};background:${rowBg};border:1px solid ${rowBd};
             opacity:${opacity};transition:all 0.15s;user-select:none">
        <input type="checkbox" value="${node.id}" data-name="${node.name}"
          data-has-children="${hasChildren}"
          ${isDisabled ? 'disabled' : ''}
          ${ck ? 'checked' : ''} onchange="voToggleTeam(this)"
          style="width:15px;height:15px;accent-color:#1D4ED8;margin:0;flex-shrink:0">
        <span style="font-size:14px">${st.icon}</span>
        <span style="font-size:13px;font-weight:${ck ? '800' : '600'};color:${nameCl};flex:1">${node.name}</span>
        <span style="font-size:10px;color:${st.color};background:${st.bg};border:1px solid ${st.border};
              padding:1px 7px;border-radius:5px;font-weight:700">${node.type || '팀'}</span>
        ${badge}
      </label>
      ${childHtml ? `<div style="padding-left:4px">${childHtml}</div>` : ''}
    </div>`;
  }

  const html = tree.map(n => renderNode(n, 0, false)).join('');
  const cont = document.getElementById('vo-tree-container');
  if (cont) cont.innerHTML = html || '<div style="text-align:center;color:#9CA3AF;padding:40px;font-size:13px">조직 데이터가 없습니다</div>';
  _voUpdateSelCount();
}

function voToggleTeam(cb) {
  const id = cb.value;
  const hasChildren = cb.dataset.hasChildren === 'true';
  if (cb.checked) {
    _voSelectedTeams.add(id);
    // ★ 상위 조직 선택 시 → 하위 전체 자동 선택
    if (hasChildren) {
      const node = _voFindNodeById(_voOrgTreeData, id);
      if (node) {
        const descIds = _voGetDescendantIds(node);
        descIds.forEach(did => _voSelectedTeams.add(did));
      }
    }
  } else {
    _voSelectedTeams.delete(id);
    // ★ 상위 해제 시 → 하위 전체 자동 해제
    if (hasChildren) {
      const node = _voFindNodeById(_voOrgTreeData, id);
      if (node) {
        const descIds = _voGetDescendantIds(node);
        descIds.forEach(did => _voSelectedTeams.delete(did));
      }
    }
  }
  _voUpdateSelCount();
  // 트리 재렌더 (dim/포함됨 배지 반영)
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const existIds = new Set();
  const groups = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  groups.forEach(g => g.teams.forEach(t => existIds.add(t.id)));
  if (_voOrgTreeData && _voOrgTreeData.length > 0) {
    voRenderTree(existIds, document.getElementById('vo-team-search')?.value || '');
  }
}

// 트리에서 특정 ID의 노드 찾기
function _voFindNodeById(tree, id) {
  for (const n of (tree || [])) {
    if (n.id === id) return n;
    const found = _voFindNodeById(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function _voUpdateSelCount() {
  const sc = document.getElementById('vo-sel-count');
  const n = _voSelectedTeams.size;
  if (sc) {
    sc.textContent = n > 0 ? `${n}개 조직 선택 (하위 전체 포함)` : '0개 선택됨';
    sc.style.color = n > 0 ? '#1D4ED8' : '#111827';
  }
}

function voConfirmAddTeams() {
  if (!_voSelectedTeams.size) { alert('조직을 하나 이상 선택해주세요.'); return; }
  const { groupIdx } = _voCurrentGroup;
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const grp = isRnd ? activeTpl.tree.centers[groupIdx] : activeTpl.tree.hqs[groupIdx];

  // 이미 맵핑된 ID Set
  const existIds = new Set(grp.teams.map(t => t.id));

  // 선택된 모든 체크박스 (checked + not disabled except parentCk)
  // 실제 저장은 선택된 조직 ID만 저장. 하위 포함 여부는 includesSubOrgs 플래그로 표기
  document.querySelectorAll('#vo-tree-container input[type=checkbox]').forEach(cb => {
    if (!_voSelectedTeams.has(cb.value)) return;
    if (existIds.has(cb.value)) return;
    const hasChildren = cb.dataset.hasChildren === 'true';
    grp.teams.push({
      id: cb.value,
      name: cb.dataset.name,
      includesSubOrgs: hasChildren,  // 하위 전체 포함 여부
      allowedJobTypes: [],
      budget: { allocated: 0, deducted: 0, holding: 0 }
    });
    existIds.add(cb.value);
  });

  voCloseModal('vo-team-modal');
  _voMyTemplates = _voGetTemplatesByScope(_voTenantId, _voServiceType);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
  _voAutoSave(activeTpl);  // ★ DB 자동 저장
}
// 레거시 폴백 (REAL_ORG_TREE 기반)
function voRenderTreeLegacy(budgetType, existIds, filter = '') {
  const orgGroups = budgetType === 'rnd' ? REAL_ORG_TREE.rnd : REAL_ORG_TREE.general;
  const lf = filter.toLowerCase();
  const isRnd = budgetType === 'rnd';

  const html = orgGroups.map(g => {
    const vis = g.children.filter(t => !lf || t.name.toLowerCase().includes(lf) || g.name.toLowerCase().includes(lf));
    if (!vis.length) return '';
    const gc = isRnd ? '#6D28D9' : '#1E40AF';
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
  const activeTpl = _voGetActiveTpl();
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const existIds = new Set();
  const groups = isRnd ? activeTpl.tree.centers : activeTpl.tree.hqs;
  groups.forEach(g => g.teams.forEach(t => existIds.add(t.id)));

  if (_voOrgTreeData && _voOrgTreeData.length > 0) {
    voRenderTree(existIds, filter);
  } else {
    voRenderTreeLegacy(_voCurrentGroup.budgetType, existIds, filter);
  }
  _voSelectedTeams.forEach(id => {
    const cb = document.querySelector(`#vo-tree-container input[value="${id}"]`);
    if (cb) cb.checked = true;
  });
}


function voRemoveTeam(groupIdx, teamIdx) {
  if (!confirm('이 팀을 템플릿에서 제거하시겠습니까?')) return;
  const activeTpl = _voGetActiveTpl();  // ★ 수정
  if (!activeTpl) return;
  const isRnd = activeTpl.tree.centers !== undefined;
  const grp = isRnd ? activeTpl.tree.centers[groupIdx] : activeTpl.tree.hqs[groupIdx];
  grp.teams.splice(teamIdx, 1);
  _voMyTemplates = _voGetTemplatesByGroup(_voGroupId, _voTenantId);
  document.getElementById('bo-content').innerHTML = _renderVirtualOrgFull();
}

function voCloseModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
