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
async function renderOrgMgmt() {
  const el = document.getElementById('bo-content');
  const tenants = await _sbGet('tenants') || TENANTS || [];
  if (!_orgSelectedTenant && tenants.length) _orgSelectedTenant = tenants[0].id;
  const orgs = _orgSelectedTenant ? (await _sbGet('organizations', { tenant_id: _orgSelectedTenant }) || []) : [];

  function buildTree(items, parentId = null, depth = 0) {
    return items.filter(o => o.parent_id === parentId).sort((a,b)=>a.order_seq-b.order_seq).map(o => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
                  margin-left:${depth*20}px;border-left:${depth>0?'2px solid #E5E7EB':'none'};
                  background:white;border-radius:8px;margin-bottom:4px;border:1px solid #F3F4F6">
        <span style="font-size:10px;color:#9CA3AF">${{headquarters:'🏛️',dept:'🏢',team:'👥'}[o.type]||'📁'}</span>
        <span style="font-size:13px;font-weight:700;color:#111827;flex:1">${o.name}</span>
        <span style="padding:2px 6px;background:#F3F4F6;border-radius:4px;font-size:10px;color:#6B7280">${{headquarters:'본부',dept:'부문/부',team:'팀'}[o.type]||o.type}</span>
        <button onclick="_openOrgModal('${o.id}','${_orgSelectedTenant}')" style="padding:3px 8px;border:1px solid #E5E7EB;border-radius:5px;background:white;font-size:10px;cursor:pointer">수정</button>
        <button onclick="_openOrgModal(null,'${_orgSelectedTenant}','${o.id}')" style="padding:3px 8px;border:1px solid #DBEAFE;border-radius:5px;background:#EFF6FF;font-size:10px;cursor:pointer;color:#1D4ED8">+ 하위</button>
      </div>
      ${buildTree(items, o.id, depth + 1)}
    `).join('');
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🗂️ 조직 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사별 조직 계층 구조를 관리합니다.</p>
    </div>
    <button onclick="_openOrgModal(null,'${_orgSelectedTenant}')" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 최상위 조직 추가</button>
  </div>
  <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center">
    <label style="font-size:12px;font-weight:700;color:#374151">회사 선택</label>
    <select onchange="window._orgChangeTenant(this.value)" style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px;font-size:13px;min-width:160px">
      ${tenants.map(t=>`<option value="${t.id}" ${t.id===_orgSelectedTenant?'selected':''}>${t.name}</option>`).join('')}
    </select>
    <span style="font-size:12px;color:#6B7280">총 ${orgs.length}개 조직</span>
  </div>
  <div style="background:#F9FAFB;border-radius:12px;padding:16px;min-height:200px">
    ${orgs.length ? buildTree(orgs) : '<p style="text-align:center;color:#9CA3AF;font-size:12px;padding:40px 0">등록된 조직이 없습니다. 최상위 조직을 추가해주세요.</p>'}
  </div>
</div>

<div id="org-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:90vw">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 18px" id="org-modal-title">조직 추가</h2>
    <input type="hidden" id="org-edit-id"/>
    <input type="hidden" id="org-tenant-id"/>
    <input type="hidden" id="org-parent-id"/>
    <div style="display:grid;gap:10px">
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">조직명 *</label>
        <input id="org-name" type="text" placeholder="예: 인재개발부문" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">조직 유형</label>
        <select id="org-type" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="headquarters">본부</option>
          <option value="dept">부문/부</option>
          <option value="team" selected>팀</option>
        </select></div>
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">순서</label>
        <input id="org-order" type="number" value="0" style="width:80px;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px"/></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveOrg()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('org-modal').style.display='none'" style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
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
  if (editId) {
    const orgs = await _sbGet('organizations', { tenant_id: tenantId }) || [];
    const o = orgs.find(x=>x.id===editId) || {};
    document.getElementById('org-name').value = o.name || '';
    document.getElementById('org-type').value = o.type || 'team';
    document.getElementById('org-order').value = o.order_seq || 0;
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
    name, type: document.getElementById('org-type').value,
    order_seq: parseInt(document.getElementById('org-order').value)||0
  };
  if (editId) row.id = editId;
  try {
    await _sbUpsert('organizations', row, 'id');
    document.getElementById('org-modal').style.display = 'none';
    renderOrgMgmt();
  } catch(e) { alert('저장 실패: ' + e.message); }
};

// ══════════════════════════════════════════════════════════════════════════════
// ③ 사용자 관리
// ══════════════════════════════════════════════════════════════════════════════
let _userFilterTenant = '';
let _userSearch = '';

async function renderUserMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const tenants = await _sbGet('tenants') || TENANTS || [];
  if (!_userFilterTenant && tenants.length) _userFilterTenant = tenants[0].id;

  let users = (await _sbGet('users', _userFilterTenant ? { tenant_id: _userFilterTenant } : {})) || [];
  if (_userSearch) users = users.filter(u => u.name.includes(_userSearch) || (u.emp_no||'').includes(_userSearch));

  const userRoles = users.length ? (await (async () => {
    if (!_sb()) return [];
    const ids = users.map(u=>u.id);
    const { data } = await _sb().from('user_roles').select('*').in('user_id', ids);
    return data || [];
  })()) : [];

  function getRoles(userId) { return userRoles.filter(r=>r.user_id===userId); }

  el.innerHTML = `
<div class="bo-fade" style="max-width:1000px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">👤 사용자 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사별 사용자 등록 및 역할을 관리합니다.</p>
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
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">회사</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">이메일</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">역할</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">상태</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">관리</th>
      </tr></thead>
      <tbody>
        ${users.length ? users.map((u,i)=>`
        <tr style="border-bottom:1px solid #F3F4F6;background:${i%2?'#FAFAFA':'white'}">
          <td style="padding:10px 14px;font-weight:700;color:#111827">${u.name}</td>
          <td style="padding:10px 14px;color:#6B7280">${u.emp_no||'-'}</td>
          <td style="padding:10px 14px;color:#374151">${u.tenant_id}</td>
          <td style="padding:10px 14px;color:#6B7280;font-size:11px">${u.email||'-'}</td>
          <td style="padding:10px 14px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${getRoles(u.id).map(r=>`<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800;background:${_roleBg(r.role_code)};color:${_roleColor(r.role_code)}">${_roleName(r.role_code)}</span>`).join('')}
              ${getRoles(u.id).length===0?'<span style="font-size:11px;color:#9CA3AF">-</span>':''}
            </div>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;background:${u.status==='active'?'#D1FAE5':'#F3F4F6'};color:${u.status==='active'?'#065F46':'#6B7280'}">${u.status==='active'?'활성':'비활성'}</span>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <button onclick="_openUserModal('${u.id}')" style="padding:4px 10px;border:1.5px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
          </td>
        </tr>`).join('') : `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">등록된 사용자가 없습니다.</td></tr>`}
      </tbody>
    </table>
  </div>
</div>

<div id="user-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:480px;max-width:90vw;max-height:85vh;overflow-y:auto">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 18px" id="user-modal-title">사용자 등록</h2>
    <input type="hidden" id="user-edit-id"/>
    <div style="display:grid;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이름 *</label>
          <input id="user-name" type="text" placeholder="홍길동" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">사번</label>
          <input id="user-empno" type="text" placeholder="12345" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      </div>
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이메일</label>
        <input id="user-email" type="email" placeholder="hong@hmg.com" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">회사 *</label>
          <select id="user-tenant" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            ${tenants.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
          </select></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">직군</label>
          <select id="user-jobtype" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            <option value="general">일반직</option>
            <option value="rnd">R&D직</option>
            <option value="production">생산직</option>
          </select></div>
      </div>
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">역할 부여 <span style="font-weight:400;color:#6B7280">(학습자는 기본 부여)</span></label>
        <div style="display:grid;gap:6px" id="role-checkboxes">
          ${['platform_admin','tenant_admin','budget_admin','budget_ops'].map(code=>`
          <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
            <input type="checkbox" name="user-role" value="${code}" style="width:14px;height:14px"/>
            <span style="font-size:12px;font-weight:700;color:#374151">${_roleName(code)}</span>
          </label>`).join('')}
        </div>
      </div>
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">상태</label>
        <select id="user-status" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveUser()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('user-modal').style.display='none'" style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

window._openUserModal = async function(userId) {
  document.getElementById('user-edit-id').value = userId || '';
  document.getElementById('user-modal-title').textContent = userId ? '사용자 수정' : '사용자 등록';
  document.querySelectorAll('[name="user-role"]').forEach(cb => cb.checked = false);
  if (userId) {
    const u = (await _sbGet('users') || []).find(x=>x.id===userId) || {};
    document.getElementById('user-name').value = u.name || '';
    document.getElementById('user-empno').value = u.emp_no || '';
    document.getElementById('user-email').value = u.email || '';
    document.getElementById('user-tenant').value = u.tenant_id || '';
    document.getElementById('user-jobtype').value = u.job_type || 'general';
    document.getElementById('user-status').value = u.status || 'active';
    const roles = await _sbGet('user_roles', { user_id: userId }) || [];
    roles.forEach(r => {
      const cb = document.querySelector(`[name="user-role"][value="${r.role_code}"]`);
      if (cb) cb.checked = true;
    });
  }
  document.getElementById('user-modal').style.display = 'flex';
};
window._saveUser = async function() {
  const name = document.getElementById('user-name').value.trim();
  const tenantId = document.getElementById('user-tenant').value;
  if (!name || !tenantId) { alert('이름과 회사를 입력해주세요'); return; }
  const editId = document.getElementById('user-edit-id').value;
  const id = editId || 'USR-' + Date.now();
  try {
    await _sbUpsert('users', {
      id, tenant_id: tenantId, name,
      emp_no: document.getElementById('user-empno').value,
      email: document.getElementById('user-email').value,
      job_type: document.getElementById('user-jobtype').value,
      status: document.getElementById('user-status').value
    }, 'id');
    // 기존 역할 삭제 후 재등록
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

// ══════════════════════════════════════════════════════════════════════════════
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