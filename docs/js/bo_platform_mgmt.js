// ─── 플랫폼 관리 메뉴: 테넌트/조직/사용자/역할 ─────────────────────────────
// Supabase에서 실시간 데이터 로드, 실패 시 mock fallback

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────
function _sb() { return typeof getSB === 'function' ? getSB() : null; }

async function _sbGet(table, filters = {}) {
  if (!_sb()) return null;
  try {
    let q = _sb().from(table).select('*');
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch(e) { console.warn('[SB]', table, e.message); return null; }
}

async function _sbUpsert(table, row, conflict = 'id') {
  if (!_sb()) return null;
  try {
    const { data, error } = await _sb().from(table).upsert(row, { onConflict: conflict }).select();
    if (error) throw error;
    return data?.[0];
  } catch(e) { console.error('[SB upsert]', table, e.message); throw e; }
}

async function _sbDelete(table, id) {
  if (!_sb()) return;
  const { error } = await _sb().from(table).delete().eq('id', id);
  if (error) throw error;
}

function _roleColor(code) {
  return { learner:'#6B7280', platform_admin:'#4F46E5', tenant_admin:'#2563EB',
           budget_admin:'#9333EA', budget_ops:'#16A34A' }[code] || '#6B7280';
}
function _roleBg(code) {
  return { learner:'#F3F4F6', platform_admin:'#EEF2FF', tenant_admin:'#DBEAFE',
           budget_admin:'#F3E8FF', budget_ops:'#DCFCE7' }[code] || '#F3F4F6';
}
function _roleName(code) {
  return { learner:'학습자', platform_admin:'플랫폼총괄관리자', tenant_admin:'테넌트총괄관리자',
           budget_admin:'예산총괄관리자', budget_ops:'예산운영담당자' }[code] || code;
}

// ══════════════════════════════════════════════════════════════════════════════
// ① 테넌트/회사 관리
// ══════════════════════════════════════════════════════════════════════════════
async function renderTenantMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const tenants = await _sbGet('tenants') || TENANTS || [];
  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🏢 테넌트/회사 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">플랫폼에 등록된 회사를 관리합니다.</p>
    </div>
    <button onclick="_openTenantModal()" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 회사 등록</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
    ${tenants.map(t => `
    <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:18px 20px;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:18px;font-weight:900;color:#111827">${t.short_name || t.id}</span>
        <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;background:${t.active?'#D1FAE5':'#F3F4F6'};color:${t.active?'#065F46':'#6B7280'}">${t.active?'활성':'비활성'}</span>
      </div>
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">${t.name}</div>
      <div style="display:flex;gap:8px">
        <button onclick="_openTenantModal('${t.id}')" style="flex:1;padding:6px;border:1.5px solid #E5E7EB;border-radius:7px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
        <button onclick="_toggleTenantStatus('${t.id}',${!t.active})" style="flex:1;padding:6px;border:1.5px solid ${t.active?'#FEE2E2':'#D1FAE5'};border-radius:7px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:${t.active?'#DC2626':'#16A34A'}">${t.active?'비활성화':'활성화'}</button>
      </div>
    </div>`).join('')}
  </div>
</div>

<!-- 테넌트 모달 -->
<div id="tenant-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 20px;color:#111827" id="tenant-modal-title">회사 등록</h2>
    <input type="hidden" id="tenant-edit-id"/>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">회사명 *</label>
        <input id="tenant-name" type="text" placeholder="예: 현대트랜시스" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">단축명(ID) *</label>
        <input id="tenant-id-input" type="text" placeholder="예: HTS" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">상태</label>
        <select id="tenant-active" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveTenant()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="_closeTenantModal()" style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

window._openTenantModal = function(id) {
  const m = document.getElementById('tenant-modal');
  document.getElementById('tenant-modal-title').textContent = id ? '회사 수정' : '회사 등록';
  document.getElementById('tenant-edit-id').value = id || '';
  if (id) {
    const t = (TENANTS||[]).find(x=>x.id===id) || {};
    document.getElementById('tenant-name').value = t.name || '';
    document.getElementById('tenant-id-input').value = t.id || '';
    document.getElementById('tenant-active').value = String(t.active !== false);
  } else {
    document.getElementById('tenant-name').value = '';
    document.getElementById('tenant-id-input').value = '';
    document.getElementById('tenant-active').value = 'true';
  }
  m.style.display = 'flex';
};
window._closeTenantModal = function() { document.getElementById('tenant-modal').style.display = 'none'; };
window._saveTenant = async function() {
  const id = document.getElementById('tenant-id-input').value.trim().toUpperCase();
  const name = document.getElementById('tenant-name').value.trim();
  if (!id || !name) { alert('ID와 회사명을 입력해주세요'); return; }
  try {
    await _sbUpsert('tenants', { id, name, short_name: id, active: document.getElementById('tenant-active').value === 'true' }, 'id');
    _closeTenantModal();
    renderTenantMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};
window._toggleTenantStatus = async function(id, active) {
  try {
    await _sb().from('tenants').update({ active }).eq('id', id);
    renderTenantMgmt();
  } catch(e) { alert('변경 실패: ' + e.message); }
};

// ══════════════════════════════════════════════════════════════════════════════
// ② 조직 관리
// ══════════════════════════════════════════════════════════════════════════════
let _orgSelectedTenant = '';

// 조직 유형 정의
const ORG_TYPES = {
  headquarters: { label: '본부', icon: '🏛️', color: '#1D4ED8', bg: '#DBEAFE' },
  center:       { label: '센터', icon: '🔬', color: '#7C3AED', bg: '#EDE9FE' },
  division:     { label: '사업부', icon: '🏭', color: '#059669', bg: '#D1FAE5' },
  office:       { label: '실',   icon: '🗂️', color: '#D97706', bg: '#FEF3C7' },
  team:         { label: '팀',   icon: '👥', color: '#374151', bg: '#F3F4F6' },
  group:        { label: '그룹', icon: '📎', color: '#6B7280', bg: '#F9FAFB' },
};

async function renderOrgMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const tenants = (await _sbGet('tenants') || TENANTS || []).filter(t => t.id !== 'SYSTEM');
  if (!_orgSelectedTenant && tenants.length) _orgSelectedTenant = tenants[0].id;
  const selectedTenant = tenants.find(t => t.id === _orgSelectedTenant) || {};
  const orgs = _orgSelectedTenant ? (await _sbGet('organizations', { tenant_id: _orgSelectedTenant }) || []) : [];

  // 드래그앤드롭 상태
  window._dndDragId = null;
  window._dndAllOrgs = orgs;

  // 순환 참조 방지: targetId가 dragId의 자손인지 확인
  function isDescendant(items, dragId, targetId) {
    if (dragId === targetId) return true;
    const children = items.filter(o => o.parent_id === dragId);
    return children.some(c => isDescendant(items, c.id, targetId));
  }

  // 트리 재귀 빌드 (depth 0 = 회사 하위 1레벨)
  function buildTree(items, parentId, depth) {
    const children = items.filter(o => o.parent_id === parentId).sort((a, b) => a.order_seq - b.order_seq);
    if (!children.length) return '';
    return children.map(o => {
      const ot = ORG_TYPES[o.type] || ORG_TYPES.team;
      const hasChildren = items.some(x => x.parent_id === o.id);
      const indent = depth * 24;
      return `
      <div data-org-drop="${o.id}" style="margin-bottom:3px"
           ondragover="window._orgDragOver(event,'${o.id}')"
           ondragleave="window._orgDragLeave(event,'${o.id}')"
           ondrop="window._orgDrop(event,'${o.id}')">
        <!-- 위에 삽입 drop zone -->
        <div class="org-drop-before" data-before="${o.id}"
             style="height:4px;border-radius:2px;margin-bottom:2px;transition:all .15s"></div>
        <div data-org-row="${o.id}"
             draggable="true"
             ondragstart="window._orgDragStart(event,'${o.id}')"
             ondragend="window._orgDragEnd(event)"
             style="display:flex;align-items:center;gap:8px;padding:9px 12px 9px ${12 + indent}px;
                    background:white;border:1px solid #F3F4F6;border-radius:8px;
                    border-left:3px solid ${ot.color};cursor:grab;transition:opacity .15s,background .15s">
          <span style="font-size:11px;color:#CBD5E1;margin-right:2px;cursor:grab" title="드래그하여 이동">⠿</span>
          <span style="font-size:13px">${ot.icon}</span>
          <span style="font-size:13px;font-weight:700;color:#111827;flex:1">${o.name}</span>
          <span style="padding:2px 7px;background:${ot.bg};color:${ot.color};border-radius:5px;font-size:10px;font-weight:800">${ot.label}</span>
          <div style="display:flex;gap:5px;margin-left:4px">
            <button onclick="_openOrgModal('${o.id}','${_orgSelectedTenant}')"
              style="padding:3px 9px;border:1px solid #E5E7EB;border-radius:5px;background:white;font-size:10px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
            <button onclick="_openOrgModal(null,'${_orgSelectedTenant}','${o.id}')"
              style="padding:3px 9px;border:1px solid #DBEAFE;border-radius:5px;background:#EFF6FF;font-size:10px;font-weight:700;cursor:pointer;color:#1D4ED8">+ 하위</button>
            <button onclick="_deleteOrg('${o.id}','${o.name}',${hasChildren})"
              style="padding:3px 9px;border:1px solid #FEE2E2;border-radius:5px;background:#FFF5F5;font-size:10px;font-weight:700;cursor:pointer;color:#DC2626">🗑️</button>
          </div>
        </div>
        <div style="margin-left:${indent + 16}px;border-left:2px dashed #E5E7EB;padding-left:8px;margin-top:3px">
          ${buildTree(items, o.id, depth + 1)}
        </div>
      </div>`;
    }).join('');
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:980px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🗂️ 조직 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사를 최상위(0레벨)로 조직 계층 구조를 관리합니다.</p>
    </div>
    <button onclick="_openOrgModal(null,'${_orgSelectedTenant}')"
      style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">
      + 조직 추가
    </button>
  </div>

  <!-- 회사 선택 -->
  <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
    <label style="font-size:12px;font-weight:700;color:#374151">회사 선택</label>
    <select onchange="window._orgChangeTenant(this.value)"
      style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px;font-size:13px;min-width:160px">
      ${tenants.map(t => `<option value="${t.id}" ${t.id === _orgSelectedTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>
    <span style="font-size:12px;color:#6B7280">총 ${orgs.length}개 조직</span>
  </div>

  <!-- 트리 -->
  <div style="background:#F9FAFB;border-radius:14px;padding:16px;min-height:240px">

    <!-- 레벨 0: 회사 (루트 노드) -->
    <div style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
                  background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:10px;color:white">
        <span style="font-size:18px">🏢</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:900">${selectedTenant.name || _orgSelectedTenant}</div>
          <div style="font-size:10px;opacity:.7">회사 (레벨 0 · 루트)</div>
        </div>
        <span style="padding:3px 10px;background:rgba(255,255,255,.2);border-radius:6px;font-size:10px;font-weight:800">${selectedTenant.id || ''}</span>
      </div>

      <!-- 레벨 1+ 조직 트리 + 루트 드롭존 -->
      <div id="org-root-dropzone"
           ondragover="window._orgRootDragOver(event)"
           ondragleave="window._orgRootDragLeave(event)"
           ondrop="window._orgDropToRoot(event)"
           style="margin-top:6px;margin-left:16px;border-left:2px dashed #CBD5E1;padding-left:8px;
                  min-height:40px;border-radius:6px;transition:outline .15s">
        ${orgs.length
          ? buildTree(orgs, null, 0)
          : '<p style="text-align:center;color:#9CA3AF;font-size:12px;padding:32px 0">등록된 조직이 없습니다.<br/>상단 \'+ 조직 추가\' 버튼으로 최상위 조직을 추가하세요.</p>'
        }
      </div>
    </div>

    <!-- 범례 -->
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #E5E7EB;display:flex;gap:10px;flex-wrap:wrap">
      ${Object.entries(ORG_TYPES).map(([k, v]) => `
        <span style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:${v.bg};border-radius:6px;font-size:10px;font-weight:800;color:${v.color}">
          ${v.icon} ${v.label}
        </span>`).join('')}
    </div>
  </div>
</div>

<!-- 조직 추가/수정 모달 -->
<div id="org-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:440px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 6px" id="org-modal-title">조직 추가</h2>
    <p id="org-modal-parent-label" style="font-size:11px;color:#6B7280;margin:0 0 18px"></p>
    <input type="hidden" id="org-edit-id"/>
    <input type="hidden" id="org-tenant-id"/>
    <input type="hidden" id="org-parent-id"/>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">조직명 *</label>
        <input id="org-name" type="text" placeholder="예: 인재개발부문"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">조직 유형</label>
        <select id="org-type" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="headquarters">🏛️ 본부</option>
          <option value="center">🔬 센터</option>
          <option value="division">🏭 사업부</option>
          <option value="office">🗂️ 실</option>
          <option value="team" selected>👥 팀</option>
          <option value="group">📎 그룹</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">표시 순서</label>
        <input id="org-order" type="number" value="0" min="0"
          style="width:100px;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px"/>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveOrg()"
        style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('org-modal').style.display='none'"
        style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

window._orgChangeTenant = function(id) { _orgSelectedTenant = id; renderOrgMgmt(); };

window._openOrgModal = async function(editId, tenantId, parentId) {
  document.getElementById('org-edit-id').value = editId || '';
  document.getElementById('org-tenant-id').value = tenantId || '';
  document.getElementById('org-parent-id').value = parentId || '';
  document.getElementById('org-modal-title').textContent = editId ? '조직 수정' : '조직 추가';

  // 상위 조직 이름 표시
  let parentLabel = '';
  if (parentId && !editId) {
    const orgs = await _sbGet('organizations', { tenant_id: tenantId }) || [];
    const p = orgs.find(o => o.id === parentId);
    if (p) parentLabel = `상위 조직: ${(ORG_TYPES[p.type]||{}).label || p.type} · ${p.name}`;
  } else if (!editId && !parentId) {
    const tenants = await _sbGet('tenants') || TENANTS || [];
    const t = tenants.find(x => x.id === tenantId);
    parentLabel = `상위: 회사(루트) · ${t ? t.name : tenantId}`;
  }
  document.getElementById('org-modal-parent-label').textContent = parentLabel;

  if (editId) {
    const orgs = await _sbGet('organizations', { tenant_id: tenantId }) || [];
    const o = orgs.find(x => x.id === editId) || {};
    document.getElementById('org-name').value = o.name || '';
    document.getElementById('org-type').value = o.type || 'team';
    document.getElementById('org-order').value = o.order_seq || 0;
    // ✅ 핵심 버그 수정: 수정 시 기존 parent_id를 hidden 필드에 세팅
    document.getElementById('org-parent-id').value = o.parent_id || '';

    // 상위 조직 레이블 표시
    if (o.parent_id) {
      const p = orgs.find(x => x.id === o.parent_id);
      if (p) document.getElementById('org-modal-parent-label').textContent =
        `상위 조직: ${(ORG_TYPES[p.type]||{}).label || p.type} · ${p.name}`;
    } else {
      const tenantList = await _sbGet('tenants') || TENANTS || [];
      const t = tenantList.find(x => x.id === tenantId);
      document.getElementById('org-modal-parent-label').textContent =
        `상위: 회사(루트) · ${t ? t.name : tenantId}`;
    }
  } else {
    document.getElementById('org-name').value = '';
    document.getElementById('org-type').value = 'team';
    document.getElementById('org-order').value = 0;
  }
  document.getElementById('org-modal').style.display = 'flex';
};

window._saveOrg = async function() {
  const name = document.getElementById('org-name').value.trim();
  if (!name) { alert('조직명을 입력하세요'); return; }
  const editId = document.getElementById('org-edit-id').value;
  const row = {
    tenant_id: document.getElementById('org-tenant-id').value,
    parent_id: document.getElementById('org-parent-id').value || null,
    name,
    type: document.getElementById('org-type').value,
    order_seq: parseInt(document.getElementById('org-order').value) || 0
  };
  if (editId) row.id = editId;
  try {
    await _sbUpsert('organizations', row, 'id');
    document.getElementById('org-modal').style.display = 'none';
    renderOrgMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};

window._deleteOrg = async function(orgId, orgName, hasChildren) {
  if (hasChildren) {
    alert(`"${orgName}"에 하위 조직이 있습니다.\n하위 조직을 먼저 삭제한 후 진행해주세요.`);
    return;
  }
  if (!confirm(`"${orgName}" 조직을 삭제하시겠습니까?`)) return;
  try {
    await _sbDelete('organizations', orgId);
    renderOrgMgmt();
  } catch(e) { alert('삭제 실패: ' + e.message); }
};

// ══════════════════════════════════════════════════════════════════════════════

// ── DnD 핸들러 ──────────────────────────────────────────────────────────────

function _isOrgDescendant(items, dragId, targetId) {
  if (dragId === targetId) return true;
  const children = items.filter(o => o.parent_id === dragId);
  return children.some(c => _isOrgDescendant(items, c.id, targetId));
}

window._orgDragStart = function(e, orgId) {
  window._dndDragId = orgId;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', orgId);
  setTimeout(() => {
    const row = document.querySelector(`[data-org-row="${orgId}"]`);
    if (row) row.style.opacity = '0.35';
  }, 0);
};

window._orgDragEnd = function() {
  document.querySelectorAll('[data-org-row]').forEach(el => { el.style.opacity = '1'; el.style.background = ''; });
  document.querySelectorAll('[data-org-drop]').forEach(el => { el.style.outline = ''; el.style.background = ''; });
  const rootZone = document.getElementById('org-root-dropzone');
  if (rootZone) { rootZone.style.background = ''; rootZone.style.outline = ''; }
};

window._orgDragOver = function(e, targetId) {
  e.preventDefault(); e.stopPropagation();
  if (!window._dndDragId || window._dndDragId === targetId) return;
  if (_isOrgDescendant(window._dndAllOrgs || [], window._dndDragId, targetId)) return;
  e.dataTransfer.dropEffect = 'move';
  const dropWrap = document.querySelector(`[data-org-drop="${targetId}"]`);
  if (dropWrap) dropWrap.style.outline = '2px dashed #4F46E5';
};

window._orgDragLeave = function(e, targetId) {
  const dropWrap = document.querySelector(`[data-org-drop="${targetId}"]`);
  if (dropWrap && !dropWrap.contains(e.relatedTarget)) dropWrap.style.outline = '';
};

window._orgDrop = async function(e, targetId) {
  e.preventDefault(); e.stopPropagation();
  const dragId = window._dndDragId;
  window._orgDragEnd();
  if (!dragId || dragId === targetId) return;
  const orgs = window._dndAllOrgs || [];
  if (_isOrgDescendant(orgs, dragId, targetId)) { alert('자신의 하위 조직 안으로는 이동할 수 없습니다.'); return; }
  const dragged = orgs.find(o => o.id === dragId);
  if (dragged && dragged.parent_id === targetId) return;
  try {
    if (typeof getSB === 'function' && getSB()) await getSB().from('organizations').update({ parent_id: targetId }).eq('id', dragId);
    window._dndDragId = null;
    await renderOrgMgmt();
  } catch(err) { alert('이동 실패: ' + err.message); }
};

window._orgDropToRoot = async function(e) {
  e.preventDefault(); e.stopPropagation();
  const dragId = window._dndDragId;
  window._orgDragEnd();
  if (!dragId) return;
  const orgs = window._dndAllOrgs || [];
  const dragged = orgs.find(o => o.id === dragId);
  if (!dragged || dragged.parent_id === null) return;
  try {
    if (typeof getSB === 'function' && getSB()) await getSB().from('organizations').update({ parent_id: null }).eq('id', dragId);
    window._dndDragId = null;
    await renderOrgMgmt();
  } catch(err) { alert('이동 실패: ' + err.message); }
};

window._orgRootDragOver = function(e) {
  e.preventDefault(); e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  const z = document.getElementById('org-root-dropzone');
  if (z) z.style.outline = '2px dashed #4F46E5';
};
window._orgRootDragLeave = function(e) {
  const z = document.getElementById('org-root-dropzone');
  if (z) z.style.outline = '';
};
// ③ 사용자 관리
// ══════════════════════════════════════════════════════════════════════════════
let _userFilterTenant = '';
let _userSearch = '';

// 직군 정의 (단일 선택)
window.JOB_TYPES = {
  general:    { label: '일반직',  color: '#374151', bg: '#F3F4F6' },
  research:   { label: '연구직',  color: '#7C3AED', bg: '#EDE9FE' },
  production: { label: '생산직',  color: '#059669', bg: '#D1FAE5' },
  technical:  { label: '기술직',  color: '#1D4ED8', bg: '#DBEAFE' },
  executive:  { label: '임원',    color: '#B45309', bg: '#FEF3C7' },
};
function _jobLabel(code) { return (window.JOB_TYPES[code] || window.JOB_TYPES.general).label; }
function _jobBg(code)    { return (window.JOB_TYPES[code] || window.JOB_TYPES.general).bg; }
function _jobColor(code) { return (window.JOB_TYPES[code] || window.JOB_TYPES.general).color; }

async function renderUserMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const allTenants = await _sbGet('tenants') || TENANTS || [];
  const tenants = allTenants.filter(t => t.id !== 'SYSTEM');
  if (!_userFilterTenant && tenants.length) _userFilterTenant = tenants[0].id;

  let users = (await _sbGet('users', _userFilterTenant ? { tenant_id: _userFilterTenant } : {})) || [];
  if (_userSearch) users = users.filter(u => u.name.includes(_userSearch) || (u.emp_no||'').includes(_userSearch));

  // 역할 로드
  const userRoles = users.length && _sb() ? (() => {
    const ids = users.map(u => u.id);
    return _sb().from('user_roles').select('*').in('user_id', ids).then(r => r.data || []);
  })() : Promise.resolve([]);

  // 조직 로드 (현재 선택 회사)
  const orgsPromise = _userFilterTenant
    ? _sbGet('organizations', { tenant_id: _userFilterTenant })
    : Promise.resolve([]);

  const [roleData, orgData] = await Promise.all([userRoles, orgsPromise]);
  const allOrgs = orgData || [];

  function getRoles(userId) { return roleData.filter(r => r.user_id === userId); }
  function getOrgName(orgId) {
    if (!orgId) return '-';
    const o = allOrgs.find(x => x.id === orgId);
    return o ? o.name : orgId;
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:1080px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">👤 사용자 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사별 사용자 등록 및 조직·역할을 관리합니다.</p>
    </div>
    <button onclick="_openUserModal()" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 사용자 등록</button>
  </div>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <select onchange="_userFilterTenant=this.value;renderUserMgmt()" style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px;font-size:13px">
      <option value="">전체 회사</option>
      ${tenants.map(t=>`<option value="${t.id}" ${t.id===_userFilterTenant?'selected':''}>${t.name}</option>`).join('')}
    </select>
    <div style="position:relative">
      <input type="text" placeholder="이름/사번 검색" value="${_userSearch}"
        oninput="_userSearch=this.value;renderUserMgmt()"
        style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px 6px 32px;font-size:13px;width:180px"/>
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9CA3AF;font-size:12px">🔍</span>
    </div>
    <span style="font-size:12px;color:#6B7280">총 ${users.length}명</span>
  </div>
  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F9FAFB;border-bottom:1.5px solid #E5E7EB">
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">이름</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">사번</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">조직</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">직군</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">역할</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">상태</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">관리</th>
      </tr></thead>
      <tbody>
        ${users.length ? users.map((u,i) => `
        <tr style="border-bottom:1px solid #F3F4F6;background:${i%2?'#FAFAFA':'white'}">
          <td style="padding:10px 14px;font-weight:700;color:#111827">${u.name}</td>
          <td style="padding:10px 14px;color:#6B7280">${u.emp_no||'-'}</td>
          <td style="padding:10px 14px;color:#374151;font-size:11px">${getOrgName(u.org_id)}</td>
          <td style="padding:10px 14px">
            <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;
              background:${_jobBg(u.job_type)};color:${_jobColor(u.job_type)}">${_jobLabel(u.job_type)}</span>
          </td>
          <td style="padding:10px 14px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${getRoles(u.id).map(r=>`<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800;background:${_roleBg(r.role_code)};color:${_roleColor(r.role_code)}">${_roleName(r.role_code)}</span>`).join('')}
              ${getRoles(u.id).length===0?'<span style="font-size:11px;color:#9CA3AF">-</span>':''}
            </div>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;
              background:${u.status==='active'?'#D1FAE5':'#F3F4F6'};color:${u.status==='active'?'#065F46':'#6B7280'}">${u.status==='active'?'활성':'비활성'}</span>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <button onclick="_openUserModal('${u.id}')"
              style="padding:4px 10px;border:1.5px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
          </td>
        </tr>`).join('') : `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">등록된 사용자가 없습니다.</td></tr>`}
      </tbody>
    </table>
  </div>
</div>

<div id="user-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:500px;max-width:92vw;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 18px" id="user-modal-title">사용자 등록</h2>
    <input type="hidden" id="user-edit-id"/>
    <div style="display:grid;gap:12px">
      <!-- 이름 / 사번 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이름 *</label>
          <input id="user-name" type="text" placeholder="홍길동"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">사번</label>
          <input id="user-empno" type="text" placeholder="12345"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      </div>
      <!-- 이메일 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이메일</label>
        <input id="user-email" type="email" placeholder="hong@hmg.com"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      <!-- 회사 / 직군 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">회사 *</label>
          <select id="user-tenant" onchange="_loadUserOrgOptions(this.value)"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            ${tenants.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
          </select></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">직군 *</label>
          <select id="user-jobtype"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            ${Object.entries(window.JOB_TYPES).map(([v,t])=>`<option value="${v}">${t.label}</option>`).join('')}
          </select></div>
      </div>
      <!-- 조직 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">소속 조직</label>
        <select id="user-org"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="">-- 조직 미지정 --</option>
        </select></div>
      <!-- 역할 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">역할 부여
        <span style="font-weight:400;color:#6B7280">(학습자는 기본 부여)</span></label>
        <div style="display:grid;gap:6px">
          ${['platform_admin','tenant_admin','budget_admin','budget_ops'].map(code=>`
          <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
            <input type="checkbox" name="user-role" value="${code}" style="width:14px;height:14px"/>
            <span style="font-size:12px;font-weight:700;color:#374151">${_roleName(code)}</span>
          </label>`).join('')}
        </div>
      </div>
      <!-- 상태 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">상태</label>
        <select id="user-status" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveUser()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('user-modal').style.display='none'"
        style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

// 회사 변경 시 조직 드롭다운을 동적 로드
window._loadUserOrgOptions = async function(tenantId, selectedOrgId) {
  const sel = document.getElementById('user-org');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- 조직 미지정 --</option>';
  if (!tenantId || !_sb()) return;
  const orgs = await _sbGet('organizations', { tenant_id: tenantId }) || [];

  // 트리 순서로 정렬 (부모 먼저)
  function flatOrgs(items, parentId, depth) {
    return items.filter(o => o.parent_id === parentId).sort((a,b)=>a.order_seq-b.order_seq).flatMap(o =>
      [{ ...o, _depth: depth }, ...flatOrgs(items, o.id, depth + 1)]
    );
  }
  const flat = flatOrgs(orgs, null, 0);
  flat.forEach(o => {
    const ot = (typeof ORG_TYPES !== 'undefined' && ORG_TYPES[o.type]) ? ORG_TYPES[o.type] : { label: o.type, icon: '' };
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = '　'.repeat(o._depth) + (ot.icon||'') + ' ' + o.name + ' (' + ot.label + ')';
    if (o.id === selectedOrgId) opt.selected = true;
    sel.appendChild(opt);
  });
};

window._openUserModal = async function(userId) {
  document.getElementById('user-edit-id').value = userId || '';
  document.getElementById('user-modal-title').textContent = userId ? '사용자 수정' : '사용자 등록';
  document.querySelectorAll('[name="user-role"]').forEach(cb => cb.checked = false);

  const tenantSel = document.getElementById('user-tenant');
  const defaultTenant = tenantSel ? tenantSel.options[0]?.value : '';

  if (userId) {
    const u = (await _sbGet('users') || []).find(x => x.id === userId) || {};
    document.getElementById('user-name').value = u.name || '';
    document.getElementById('user-empno').value = u.emp_no || '';
    document.getElementById('user-email').value = u.email || '';
    if (tenantSel) tenantSel.value = u.tenant_id || defaultTenant;
    document.getElementById('user-jobtype').value = u.job_type || 'general';
    document.getElementById('user-status').value = u.status || 'active';
    // 조직 옵션 로드 후 선택
    await window._loadUserOrgOptions(u.tenant_id, u.org_id);
    // 역할 체크
    const roles = await _sbGet('user_roles', { user_id: userId }) || [];
    roles.forEach(r => {
      const cb = document.querySelector(`[name="user-role"][value="${r.role_code}"]`);
      if (cb) cb.checked = true;
    });
  } else {
    document.getElementById('user-name').value = '';
    document.getElementById('user-empno').value = '';
    document.getElementById('user-email').value = '';
    if (tenantSel) tenantSel.value = defaultTenant;
    document.getElementById('user-jobtype').value = 'general';
    document.getElementById('user-status').value = 'active';
    await window._loadUserOrgOptions(defaultTenant, null);
  }
  document.getElementById('user-modal').style.display = 'flex';
};

window._saveUser = async function() {
  const name = document.getElementById('user-name').value.trim();
  const tenantId = document.getElementById('user-tenant').value;
  if (!name || !tenantId) { alert('이름과 회사를 입력해주세요'); return; }
  const editId = document.getElementById('user-edit-id').value;
  const id = editId || 'USR-' + Date.now();
  const orgId = document.getElementById('user-org').value || null;
  try {
    await _sbUpsert('users', {
      id, tenant_id: tenantId, name,
      emp_no: document.getElementById('user-empno').value,
      email: document.getElementById('user-email').value,
      job_type: document.getElementById('user-jobtype').value,
      org_id: orgId,
      status: document.getElementById('user-status').value
    }, 'id');
    if (_sb()) await _sb().from('user_roles').delete().eq('user_id', id);
    const rolesToSave = [{ user_id:id, role_code:'learner', tenant_id:tenantId, scope_id:null }];
    document.querySelectorAll('[name="user-role"]:checked').forEach(cb => {
      rolesToSave.push({ user_id:id, role_code:cb.value, tenant_id:tenantId, scope_id:null });
    });
    if (_sb()) await _sb().from('user_roles').insert(rolesToSave);
    document.getElementById('user-modal').style.display = 'none';
    renderUserMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};

// ④ 역할 관리
// ══════════════════════════════════════════════════════════════════════════════
async function renderRoleMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const roles = await _sbGet('roles') || [
    {code:'learner',name:'학습자',descr:'기본 역할. 모든 사용자에게 자동 부여',level:99},
    {code:'platform_admin',name:'플랫폼총괄관리자',descr:'전체 플랫폼 설정·권한 관리',level:1},
    {code:'tenant_admin',name:'테넌트총괄관리자',descr:'소속 회사 전체 관리',level:2},
    {code:'budget_admin',name:'예산총괄관리자',descr:'격리그룹·예산계정 총괄',level:3},
    {code:'budget_ops',name:'예산운영담당자',descr:'특정 격리그룹 내 예산 운영',level:4},
  ];

  // 역할별 사용자 수
  const allUserRoles = await _sbGet('user_roles') || [];
  function countByRole(code) { return new Set(allUserRoles.filter(r=>r.role_code===code).map(r=>r.user_id)).size; }

  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="margin-bottom:24px">
    <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🔐 역할 관리</h1>
    <p style="font-size:12px;color:#6B7280;margin:4px 0 0">플랫폼에서 사용하는 역할 정의 및 배정 현황입니다.</p>
  </div>
  <div style="display:grid;gap:12px">
    ${roles.sort((a,b)=>a.level-b.level).map(r=>`
    <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:18px 22px;display:flex;align-items:center;gap:18px">
      <div style="padding:10px 14px;border-radius:10px;background:${_roleBg(r.code)};min-width:120px;text-align:center">
        <div style="font-size:13px;font-weight:900;color:${_roleColor(r.code)}">${r.name}</div>
        <div style="font-size:10px;color:${_roleColor(r.code)};opacity:.7;margin-top:2px">Lv.${r.level}</div>
      </div>
      <div style="flex:1">
        <div style="font-size:12px;color:#374151;font-weight:600">${r.code}</div>
        <div style="font-size:12px;color:#6B7280;margin-top:2px">${r.descr||''}</div>
      </div>
      <div style="text-align:center;min-width:70px">
        <div style="font-size:22px;font-weight:900;color:#111827">${countByRole(r.code)}</div>
        <div style="font-size:10px;color:#9CA3AF">배정 인원</div>
      </div>
      <button onclick="_viewRoleUsers('${r.code}')" style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:8px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">사용자 조회</button>
    </div>`).join('')}
  </div>
  <div id="role-users-panel" style="display:none;margin-top:20px;background:#F9FAFB;border-radius:12px;padding:16px"></div>
</div>`;
}

window._viewRoleUsers = async function(roleCode) {
  const panel = document.getElementById('role-users-panel');
  panel.style.display = 'block';
  panel.innerHTML = '<p style="color:#9CA3AF;font-size:12px">조회 중...</p>';
  if (!_sb()) { panel.innerHTML = '<p style="color:#9CA3AF;font-size:12px">DB 연결이 필요합니다.</p>'; return; }
  const { data: urList } = await _sb().from('user_roles').select('*').eq('role_code', roleCode);
  if (!urList?.length) { panel.innerHTML = `<p style="color:#9CA3AF;font-size:12px;text-align:center;padding:20px">배정된 사용자가 없습니다.</p>`; return; }
  const ids = urList.map(r=>r.user_id);
  const { data: users } = await _sb().from('users').select('*').in('id', ids);
  panel.innerHTML = `<h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 12px">${_roleName(roleCode)} 배정 사용자 (${urList.length}명)</h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${(users||[]).map(u=>`<span style="padding:6px 12px;background:white;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;color:#374151">${u.name} <span style="color:#9CA3AF;font-weight:400">(${u.tenant_id})</span></span>`).join('')}
  </div>`;
};

// ══════════════════════════════════════════════════════════════════════════════
// ⑤ 역할별 메뉴 권한 관리
// ══════════════════════════════════════════════════════════════════════════════

// 전체 메뉴 정의 (PLATFORM_MENUS와 동기화)
const ALL_MENUS = [
  { id: 'dashboard',        label: '대시보드',             sys: 'BO', depth1: '공통' },
  { id: 'platform-monitor', label: '전사 예산 모니터링',     sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'platform-roles',   label: '관리자 권한 매핑',       sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'tenant-mgmt',      label: '테넌트/회사 관리',       sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'org-mgmt',         label: '조직 관리',              sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'user-mgmt',        label: '사용자 관리',            sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'role-mgmt',        label: '역할 관리',              sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'role-menu-perms',  label: '역할별 메뉴 권한',        sys: 'BO', depth1: '플랫폼 총괄' },
  { id: 'isolation-groups', label: '격리그룹 관리',          sys: 'BO', depth1: '테넌트 운영' },
  { id: 'budget-account',   label: '예산 계정 관리',          sys: 'BO', depth1: '테넌트 운영' },
  { id: 'virtual-org',      label: '가상조직 템플릿',         sys: 'BO', depth1: '테넌트 운영' },
  { id: 'form-builder',     label: '교육양식마법사',          sys: 'BO', depth1: '테넌트 운영' },
  { id: 'calc-grounds',     label: '산정기준 관리',           sys: 'BO', depth1: '테넌트 운영' },
  { id: 'approval-routing', label: '결재 라우팅',            sys: 'BO', depth1: '테넌트 운영' },
  { id: 'service-policy',   label: '서비스 정책 관리',        sys: 'BO', depth1: '테넌트 운영' },
  { id: 'plan-mgmt',        label: '계획 관리',              sys: 'BO', depth1: '운영 업무' },
  { id: 'allocation',       label: '예산 배정',              sys: 'BO', depth1: '운영 업무' },
  { id: 'my-operations',    label: '내 업무',                sys: 'BO', depth1: '운영 업무' },
  { id: 'org-budget',       label: '조직 예산 현황',          sys: 'BO', depth1: '운영 업무' },
  { id: 'reports',          label: '통계 및 리포트',          sys: 'BO', depth1: '분석' },
  { id: 'manual',           label: '서비스 매뉴얼',          sys: 'BO', depth1: '기타' },
];

const MANAGED_ROLES = [
  { code: 'platform_admin', label: '플랫폼총괄관리자', color: '#7C3AED' },
  { code: 'tenant_admin',   label: '테넌트총괄관리자', color: '#1D4ED8' },
  { code: 'budget_admin',   label: '예산총괄관리자',   color: '#059669' },
  { code: 'budget_ops',     label: '예산운영담당자',   color: '#D97706' },
  { code: 'learner',        label: '학습자',           color: '#6B7280' },
];

async function renderRoleMenuPerms() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  // DB에서 현재 권한 로드
  let currentPerms = {};
  if (_sb()) {
    const { data } = await _sb().from('role_menu_permissions').select('role_code, menu_id');
    (data || []).forEach(({ role_code, menu_id }) => {
      if (!currentPerms[role_code]) currentPerms[role_code] = new Set();
      currentPerms[role_code].add(menu_id);
    });
  } else {
    // 폴백: window._roleMenuPerms 사용
    Object.entries(window._roleMenuPerms || {}).forEach(([rc, set]) => {
      currentPerms[rc] = new Set(set);
    });
  }

  function isChecked(roleCode, menuId) {
    return currentPerms[roleCode]?.has(menuId) ? 'checked' : '';
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:1100px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🔑 역할별 메뉴 권한 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">역할별로 접근 가능한 메뉴를 DB에서 직접 관리합니다. 저장 즉시 반영됩니다.</p>
    </div>
    <button onclick="_saveRoleMenuPerms()" style="padding:10px 20px;background:#4F46E5;color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">💾 변경사항 저장</button>
  </div>

  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;overflow:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
      <thead>
        <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
          <th style="padding:12px 10px;text-align:center;font-weight:900;color:#6B7280;width:70px">구분</th>
          <th style="padding:12px 10px;text-align:left;font-weight:900;color:#6B7280;width:120px">1 Depth</th>
          <th style="padding:12px 16px;text-align:left;font-weight:900;color:#374151;min-width:160px">2 Depth (메뉴)</th>
          ${MANAGED_ROLES.map(r => `
          <th style="padding:12px 8px;text-align:center;font-weight:900;color:${r.color};min-width:110px">
            ${r.label}
          </th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${ALL_MENUS.map((m, i) => `
        <tr style="border-bottom:1px solid #F3F4F6;background:${i%2?'#FAFAFA':'white'}">
          <td style="padding:9px 10px;text-align:center;font-size:11px;color:#6B7280;font-weight:700">
            <span style="background:#E5E7EB;padding:2px 6px;border-radius:4px">${m.sys}</span>
          </td>
          <td style="padding:9px 10px;color:#4B5563;font-size:11px;font-weight:700">${m.depth1}</td>
          <td style="padding:9px 16px;font-weight:600;color:#374151">${m.label}
            <span style="font-size:9px;color:#9CA3AF;margin-left:4px">${m.id}</span>
          </td>
          ${MANAGED_ROLES.map(r => `
          <td style="padding:9px 8px;text-align:center">
            <input type="checkbox" data-role="${r.code}" data-menu="${m.id}"
              ${isChecked(r.code, m.id)}
              style="width:16px;height:16px;cursor:pointer;accent-color:${r.color}"
              onchange="_onPermChange(this)"/>
          </td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <p id="perm-save-msg" style="margin-top:12px;font-size:12px;color:#059669;display:none;text-align:center;font-weight:700"></p>
</div>`;
}

// 체크박스 변경 즉시 메모리 반영 (저장은 버튼 클릭)
window._onPermChange = function(cb) {
  const role = cb.dataset.role;
  const menu = cb.dataset.menu;
  if (!window._pendingPermChanges) window._pendingPermChanges = [];
  window._pendingPermChanges.push({ role, menu, checked: cb.checked });
  document.getElementById('perm-save-msg').style.display = 'none';
};

window._saveRoleMenuPerms = async function() {
  if (!_sb()) { alert('DB 연결이 필요합니다.'); return; }
  const checks = document.querySelectorAll('[data-role][data-menu]');
  if (!checks.length) return;

  // 현재 체크 상태 전체 수집
  const toInsert = [];
  const allRoleCodes = MANAGED_ROLES.map(r => r.code);

  checks.forEach(cb => {
    if (cb.checked) toInsert.push({ role_code: cb.dataset.role, menu_id: cb.dataset.menu });
  });

  try {
    // 관리 대상 role 전체 삭제 후 재삽입
    await _sb().from('role_menu_permissions').delete().in('role_code', allRoleCodes);
    if (toInsert.length) {
      const { error } = await _sb().from('role_menu_permissions').insert(toInsert);
      if (error) throw error;
    }
    // 메모리 캐시 업데이트
    window._pendingPermChanges = [];
    if (typeof sbLoadRoleMenuPerms === 'function') {
      await sbLoadRoleMenuPerms();
      if (typeof renderBoSidebar === 'function') renderBoSidebar();
    }
    const msg = document.getElementById('perm-save-msg');
    if (msg) { msg.textContent = `✅ ${toInsert.length}건 권한 저장 완료`; msg.style.display = 'block'; }
  } catch(e) {
    alert('저장 실패: ' + e.message);
  }
};