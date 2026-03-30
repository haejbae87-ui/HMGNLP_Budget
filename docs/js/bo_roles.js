// ─── 역할 관리 (Phase 3: 테넌트 독립 역할 체계 기반 CRUD) ─────────────────────────

let _roleFilterTenant = '';

async function renderRoleMgmt() {
  const el = document.getElementById('bo-content');
  el.innerHTML = '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">데이터 로딩 중...</p></div>';

  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  
  if (role === 'platform_admin') {
    if (!_roleFilterTenant && tenants.length) _roleFilterTenant = tenants[0].id;
  } else {
    _roleFilterTenant = boCurrentPersona.tenantId;
  }

  const selectedTenantId = _roleFilterTenant;
  const roles = await _sbGet('roles', { tenant_id: selectedTenantId }) || [];
  
  // 테넌트 선택 UI
  const tenantSelectHtml = (role === 'platform_admin') ? `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;background:#F8FAFF;padding:12px 18px;border-radius:12px;border:1.5px solid #E0E7FF">
      <label style="font-size:12px;font-weight:700;color:#374151">테넌트(회사) 역할 조회</label>
      <select onchange="_roleFilterTenant=this.value;renderRoleMgmt()" style="padding:7px 14px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;font-weight:700;outline:none;cursor:pointer;color:#1E3A8A">
        ${tenants.map(t => `<option value="${t.id}" ${t.id === _roleFilterTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>
  ` : `<div style="margin-bottom:20px"><span style="font-size:14px">🏢 <strong>${selectedTenantId}</strong> 역할 설정</span></div>`;

  // 역할 트리 빌더
  const renderedIds = new Set();
  function buildRoleTree(parentId, depth = 0) {
    const children = roles.filter(r => (r.parent_role_id || null) === parentId);
    if (!children.length) return '';
    let html = '';
    children.forEach(r => {
      renderedIds.add(r.id);
      const hasChildren = roles.some(x => x.parent_role_id === r.id);
      const isSystem = r.is_system;
      const indent = depth * 24;
      html += `
        <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #F3F4F6;background:${isSystem?'#F9FAFB':'#fff'}">
          <div style="width:${indent}px;border-left:${depth > 0 ? '2px dashed #E5E7EB' : 'none'};height:30px;margin-right:-10px"></div>
          <div style="padding:10px 14px;border-radius:10px;background:${isSystem?'#EEF2FF':'#F3E8FF'};min-width:120px;text-align:center;border:1px solid ${isSystem?'#C7D2FE':'#E9D5FF'}">
            <div style="font-size:13px;font-weight:900;color:${isSystem?'#4F46E5':'#9333EA'}">${r.name}</div>
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:800;color:#111827;font-size:14px">${r.code}</span>
              ${isSystem ? '<span style="font-size:10px;color:#B45309;background:#FEF3C7;padding:3px 8px;border-radius:6px;font-weight:700">시스템 잠금</span>' : '<span style="font-size:10px;color:#059669;background:#D1FAE5;padding:3px 8px;border-radius:6px;font-weight:700">커스텀 역할</span>'}
            </div>
            <div style="font-size:12px;color:#6B7280;margin-top:6px">${r.description || '설명 없음'}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="_openRoleModal('${r.id}')" style="padding:7px 14px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;font-size:12px;font-weight:800;cursor:pointer;color:#374151">✏️ 수정</button>
            ${!isSystem ? `<button onclick="_deleteRole('${r.id}', ${hasChildren})" style="padding:7px 14px;border:1px solid #FECACA;border-radius:8px;background:#FEF2F2;font-size:12px;font-weight:800;cursor:pointer;color:#DC2626">🗑️ 삭제</button>` : ''}
          </div>
        </div>
      `;
      html += buildRoleTree(r.id, depth + 1);
    });
    return html;
  }
  
  // 루트 노드 찾아서 렌더링
  let treeHtml = '';
  // 1. null 이거나 db에 없는 부모를 가진 애들부터 렌더링
  const roots = roles.filter(r => !r.parent_role_id || !roles.some(p => p.id === r.parent_role_id));
  roots.forEach(r => {
    treeHtml += buildRoleTree(r.parent_role_id || null, 0); // r 포함해서 빌드
  });
  
  // 3. 미아가 된 자손 노드들이 있다면 0 depth로 렌더링
  roles.forEach(r => {
    if (!renderedIds.has(r.id)) {
      treeHtml += buildRoleTree(r.parent_role_id, 0);
    }
  });

  if (!treeHtml) {
    treeHtml = '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;background:white;border-radius:12px;border:1.5px solid #E5E7EB">등록된 역할이 없습니다.</div>';
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:1020px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🔐 테넌트 독립 역할 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">선택된 테넌트의 역할 계층(Hierarchy)과 권한을 관리합니다.</p>
    </div>
    <button onclick="_openRoleModal()" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 새 역할 추가</button>
  </div>
  ${tenantSelectHtml}
  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;overflow:hidden">
    ${treeHtml}
  </div>
</div>

<!-- Role Modal -->
<div id="role-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:20px;width:480px;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,.2)">
    <h3 id="role-modal-title" style="font-size:18px;font-weight:900;margin:0 0 20px;color:#111827">새 역할 생성</h3>
    <input type="hidden" id="role-edit-id" />
    <input type="hidden" id="role-tenant-id" value="${selectedTenantId}" />
    <div style="display:grid;gap:16px">
      <div>
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">역할명 *</label>
        <input id="role-name" type="text" placeholder="예: R&D 예산 총괄 관리자" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;font-weight:600">
      </div>
      <div>
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">역할 코드 (영문/숫자) *</label>
        <input id="role-code" type="text" placeholder="예: rnd_admin" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;font-weight:600">
        <p style="font-size:11px;color:#9CA3AF;margin:6px 0 0;line-height:1.4">저장 시 시스템에서 테넌트 ID가 자동으로 접두어로 붙습니다.<br/>예시: <strong>${selectedTenantId}_rnd_admin</strong></p>
      </div>
      <div>
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">권한 상속(Parent Role) 지정 *</label>
        <select id="role-parent" style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none;font-weight:600;cursor:pointer">
          <option value="">-- 상속 없음 (독립 역할) --</option>
          ${roles.map(r => `<option value="${r.id}">${r.name} (${r.code})</option>`).join('')}
        </select>
        <p style="font-size:11px;color:#9CA3AF;margin:6px 0 0;line-height:1.4">이 역할은 위에서 선택한 역할이 가진 모든 데이터 접근 권한에 속합니다.</p>
      </div>
      <div>
        <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">설명</label>
        <input id="role-desc" type="text" placeholder="역할에 대한 간단한 설명" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none">
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:28px">
      <button class="bo-btn-secondary" onclick="document.getElementById('role-modal').style.display='none'">취소</button>
      <button class="bo-btn-primary" onclick="_saveRole()">저장</button>
    </div>
  </div>
</div>
  `;
}

window._openRoleModal = async function(id) {
  const modal = document.getElementById('role-modal');
  document.getElementById('role-edit-id').value = id || '';
  document.getElementById('role-modal-title').textContent = id ? '역할 수정' : '새 역할 생성';
  
  if (id) {
    const roles = await _sbGet('roles', { tenant_id: _roleFilterTenant }) || [];
    const r = roles.find(x => x.id === id);
    if (!r) return;
    document.getElementById('role-name').value = r.name || '';
    // display base code
    let baseCode = r.code;
    if (baseCode && baseCode.startsWith(_roleFilterTenant + '_')) {
      baseCode = baseCode.substring(_roleFilterTenant.length + 1);
    }
    const codeInput = document.getElementById('role-code');
    codeInput.value = baseCode || '';
    codeInput.disabled = true; // 코드는 생성 후 수정 불가 (시스템 제약 방지)
    codeInput.style.background = '#F9FAFB';
    
    document.getElementById('role-parent').value = r.parent_role_id || '';
    document.getElementById('role-desc').value = r.description || '';
  } else {
    document.getElementById('role-name').value = '';
    const codeInput = document.getElementById('role-code');
    codeInput.value = '';
    codeInput.disabled = false;
    codeInput.style.background = '#fff';
    
    document.getElementById('role-parent').value = '';
    document.getElementById('role-desc').value = '';
  }
  
  modal.style.display = 'flex';
};

window._saveRole = async function() {
  const editId = document.getElementById('role-edit-id').value;
  const tenantId = document.getElementById('role-tenant-id').value;
  const name = document.getElementById('role-name').value.trim();
  let baseCode = document.getElementById('role-code').value.trim();
  const parentId = document.getElementById('role-parent').value || null;
  const desc = document.getElementById('role-desc').value.trim();

  if (!name) { alert('역할명을 입력해주세요.'); return; }
  
  let finalId = editId;
  let finalCode = baseCode;

  if (!editId) {
    if (!baseCode) { alert('역할 코드를 입력해주세요.'); return; }
    // 새로운 등록
    finalCode = \`\${tenantId}_\${baseCode}\`;
    finalId = finalCode; // ID = Code
    
    // 코드 중복 체킹
    const existing = await _sbGet('roles', { id: finalId });
    if (existing && existing.length > 0) {
      alert('동일한 역할 코드가 이미 존재합니다.');
      return;
    }
  }

  // 시스템 잠금 역할은 부모를 임의로 바꿀 수 있지만 권장하지 않음
  // 코드 무결성을 위해 서버저장
  const payload = {
    id: finalId,
    tenant_id: tenantId,
    name: name,
    description: desc,
    parent_role_id: parentId,
  };
  
  if (!editId) {
    payload.code = finalCode;
    payload.is_system = false;
  }

  try {
    const ok = await _sbUpsert('roles', payload, 'id');
    document.getElementById('role-modal').style.display = 'none';
    renderRoleMgmt();
  } catch (e) {
    alert('저장 실패: ' + e.message);
  }
};

window._deleteRole = async function(id, hasChildren) {
  if (hasChildren) {
    alert('하위 역할(상속된 권한)이 존재합니다.\\n하위 역할의 부모를 먼저 변경하거나 삭제해주세요.');
    return;
  }
  if (!confirm('경고: 역할을 삭제하시겠습니까?\\n해당 역할이 배정된 사용자는 권한을 상실할 수 있습니다.')) return;
  try {
    await _sbDelete('roles', id);
    renderRoleMgmt();
  } catch(e) {
    alert('삭제 실패: ' + e.message);
  }
};
