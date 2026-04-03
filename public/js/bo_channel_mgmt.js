// ─── 📺 채널 관리 (역할 자동 생성 + user_roles 매핑) ────────────────────────
let _chTenant = '';
let _chList = [];

async function renderChannelMgmt() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
  if (!_chTenant) _chTenant = isPlatform ? (tenants.find(t => t.id !== 'SYSTEM')?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');

  el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>로딩 중...</div>';

  try {
    const { data } = await sb.from('edu_channels').select('*').eq('tenant_id', _chTenant).order('created_at', { ascending: false });
    _chList = data || [];
  } catch (e) { _chList = []; }

  // 각 채널의 과정 수
  let courseCounts = {};
  try {
    const { data } = await sb.from('edu_courses').select('channel_id').eq('tenant_id', _chTenant);
    (data || []).forEach(c => { courseCounts[c.channel_id] = (courseCounts[c.channel_id] || 0) + 1; });
  } catch (e) { }

  // 각 채널 역할의 담당자 수 (user_roles 기반)
  let roleMgrCounts = {};
  const roleCodes = _chList.map(c => c.role_code).filter(Boolean);
  if (roleCodes.length > 0) {
    try {
      const { data } = await sb.from('user_roles').select('role_code').in('role_code', roleCodes);
      (data || []).forEach(r => { roleMgrCounts[r.role_code] = (roleMgrCounts[r.role_code] || 0) + 1; });
    } catch (e) { }
  }

  const selStyle = 'border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:130px;cursor:pointer';
  const tenantSel = isPlatform
    ? `<select onchange="_chTenant=this.value;renderChannelMgmt()" style="${selStyle}">
      ${tenants.filter(t => t.id !== 'SYSTEM').map(t =>
      `<option value="${t.id}" ${t.id === _chTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
    </select>` : `<span style="font-size:12px;font-weight:800;color:#374151;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find(t => t.id === _chTenant)?.name || _chTenant}</span>`;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">📺 교육 채널 관리</h1>
        <p class="bo-page-sub">테넌트 하위에서 교육과정을 운영할 채널을 관리합니다. 채널 생성 시 담당자 역할이 자동 생성됩니다.</p>
      </div>
      <button class="bo-btn-primary" onclick="_chOpenCreate()">+ 채널 생성</button>
    </div>

    <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-size:11px;font-weight:900;color:#374151">🔍 테넌트</span> ${tenantSel}
        <button onclick="renderChannelMgmt()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
      </div>
    </div>

    ${_chList.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>채널명</th><th>설명</th><th style="text-align:center">담당자 역할</th>
          <th style="text-align:center">담당자 수</th><th style="text-align:center">과정 수</th>
          <th style="text-align:center">상태</th><th style="text-align:center">관리</th>
        </tr></thead>
        <tbody>
        ${_chList.map((ch, i) => {
    const cc = courseCounts[ch.id] || 0;
    const mgrCount = ch.role_code ? (roleMgrCounts[ch.role_code] || 0) : (ch.managers || []).length;
    const hasRole = !!ch.role_code;
    return `<tr>
            <td style="font-weight:800">${ch.name}</td>
            <td style="color:#6B7280;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.description || '-'}</td>
            <td style="text-align:center">${hasRole
        ? `<span style="font-size:10px;background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:6px;font-weight:700">✅ ${ch.role_code}</span>`
        : `<span style="font-size:10px;color:#D97706;background:#FEF3C7;padding:2px 8px;border-radius:6px;font-weight:700">⚠️ 미생성</span>
                 <button onclick="_chCreateRoleFor(${i})" style="font-size:10px;color:#1D4ED8;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:1px 6px;cursor:pointer;margin-left:4px">역할 생성</button>`
      }</td>
            <td style="text-align:center;font-weight:700">${mgrCount}</td>
            <td style="text-align:center;font-weight:700">${cc}</td>
            <td style="text-align:center"><span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;background:${ch.active ? '#D1FAE520' : '#FEF2F2'};color:${ch.active ? '#059669' : '#DC2626'}">${ch.active ? '🟢 활성' : '🔴 비활성'}</span></td>
            <td style="text-align:center">
              <button onclick="_chOpenEdit(${i})" style="border:none;background:none;cursor:pointer;font-size:14px" title="수정">✏️</button>
              <button onclick="_chDelete(${i})" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626" title="삭제">🗑️</button>
            </td>
          </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📺</div>
      <div style="font-weight:700;color:#6B7280">등록된 채널이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF;margin-top:6px">채널을 생성하여 교육과정을 운영하세요</div>
    </div>`}
  </div>

  <!-- 채널 생성/수정 모달 -->
  <div id="ch-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:600px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;margin-bottom:18px">
        <h3 id="ch-modal-title" style="font-size:15px;font-weight:800;margin:0">채널 생성</h3>
        <button onclick="document.getElementById('ch-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <input type="hidden" id="ch-edit-idx">

      <!-- 테넌트 표시 -->
      <div style="margin-bottom:14px;padding:10px 14px;background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;font-weight:900;color:#64748B">🏢 테넌트</span>
        <span id="ch-modal-tenant" style="font-size:13px;font-weight:800;color:#1E293B"></span>
      </div>

      <!-- 기본 정보 -->
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">채널명 <span style="color:#EF4444">*</span></label>
        <input id="ch-name" type="text" placeholder="예) HRD교육채널" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      </div>
      <div style="margin-bottom:18px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">설명</label>
        <textarea id="ch-desc" placeholder="채널 설명" rows="2" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;resize:vertical"></textarea>
      </div>

      <!-- 채널 담당자 섹션 -->
      <div style="border-top:1.5px solid #E5E7EB;padding-top:16px;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <label style="font-size:13px;font-weight:800;color:#1E293B">👤 채널 담당자 매핑</label>
          <span id="ch-mgr-count" style="font-size:11px;color:#6B7280;font-weight:700">0명 선택</span>
        </div>
        <div id="ch-mgr-chips" style="margin-bottom:10px;min-height:28px"></div>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <input id="ch-mgr-search" type="text" placeholder="🔍 이름으로 검색... (빈 칸이면 전체 목록)" oninput="_chSearchUsers()" style="flex:1;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;outline:none">
        </div>
        <div id="ch-mgr-results" style="max-height:200px;overflow-y:auto;border:1px solid #F3F4F6;border-radius:8px"></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('ch-modal').style.display='none'">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="_chSave()">저장</button>
      </div>
    </div>
  </div>`;
}

let _chSelectedMgrs = [];

function _chOpenCreate() {
  document.getElementById('ch-modal-title').textContent = '채널 생성';
  document.getElementById('ch-edit-idx').value = '';
  document.getElementById('ch-name').value = '';
  document.getElementById('ch-desc').value = '';
  // 테넌트명 표시
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const tn = tenants.find(t => t.id === _chTenant);
  const tenantEl = document.getElementById('ch-modal-tenant');
  if (tenantEl) tenantEl.textContent = tn ? `${tn.name} (${tn.id})` : _chTenant;
  _chSelectedMgrs = [];
  _chRenderMgrChips();
  document.getElementById('ch-modal').style.display = 'flex';
  // 초기 사용자 목록 자동 로드
  document.getElementById('ch-mgr-search').value = '';
  _chLoadInitialUsers();
}

async function _chOpenEdit(idx) {
  const ch = _chList[idx];
  if (!ch) return;
  document.getElementById('ch-modal-title').textContent = '채널 수정';
  document.getElementById('ch-edit-idx').value = String(idx);
  document.getElementById('ch-name').value = ch.name;
  document.getElementById('ch-desc').value = ch.description || '';
  // 테넌트명 표시
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const tn = tenants.find(t => t.id === _chTenant);
  const tenantEl = document.getElementById('ch-modal-tenant');
  if (tenantEl) tenantEl.textContent = tn ? `${tn.name} (${tn.id})` : _chTenant;

  // 역할 기반 담당자 로드
  _chSelectedMgrs = [];
  if (ch.role_code) {
    const sb = getSB();
    try {
      const { data } = await sb.from('user_roles').select('user_id').eq('role_code', ch.role_code);
      if (data && data.length > 0) {
        const uids = data.map(r => r.user_id);
        let users = null;
        try {
          const res = await sb.from('users').select('id,name,org_id,job_type,organizations(name)').in('id', uids);
          users = res.data;
        } catch (e2) {
          // FK 조인 실패 시 기본 쿼리
          const res = await sb.from('users').select('id,name,org_id,job_type').in('id', uids);
          users = (res.data || []).map(u => ({ ...u, organizations: null }));
        }
        _chSelectedMgrs = (users || []).map(u => ({ user_id: u.id, name: u.name, dept: u.organizations?.name || '' }));
      }
    } catch (e) { }
  } else {
    _chSelectedMgrs = [...(ch.managers || [])];
  }

  _chRenderMgrChips();
  document.getElementById('ch-modal').style.display = 'flex';
  // 초기 사용자 목록 자동 로드
  document.getElementById('ch-mgr-search').value = '';
  _chLoadInitialUsers();
}

function _chRenderMgrChips() {
  const el = document.getElementById('ch-mgr-chips');
  if (!el) return;
  // 카운터 업데이트
  const countEl = document.getElementById('ch-mgr-count');
  if (countEl) countEl.textContent = `${_chSelectedMgrs.length}명 선택`;
  if (_chSelectedMgrs.length === 0) {
    el.innerHTML = '<span style="font-size:11px;color:#9CA3AF">아래에서 사용자를 검색하여 담당자를 추가하세요</span>';
    return;
  }
  el.innerHTML = _chSelectedMgrs.map((m, i) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;color:#1D4ED8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin:2px">
      👤 ${m.name} <span style="font-size:9px;color:#6B7280">${m.dept || ''}</span>
      <button onclick="_chRemoveMgr(${i})" style="border:none;background:none;cursor:pointer;color:#93C5FD;font-size:11px;padding:0">✕</button>
    </span>`
  ).join('');
}

function _chRemoveMgr(idx) {
  _chSelectedMgrs.splice(idx, 1);
  _chRenderMgrChips();
}

// 초기 사용자 목록 자동 로드 (모달 열릴 때)
async function _chLoadInitialUsers() {
  const el = document.getElementById('ch-mgr-results');
  if (!el) return;
  const sb = getSB();
  if (!sb) { el.innerHTML = ''; return; }
  el.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#9CA3AF">⏳ 사용자 로딩 중...</div>';
  try {
    let data = null;
    try {
      const res = await sb.from('users').select('id,name,org_id,job_type,organizations(name)').eq('tenant_id', _chTenant).order('name').limit(50);
      if (res.error) throw res.error;
      data = res.data;
    } catch (joinErr) {
      console.warn('[Channel] FK join failed, fallback:', joinErr.message || joinErr);
      const res = await sb.from('users').select('id,name,org_id,job_type').eq('tenant_id', _chTenant).order('name').limit(50);
      data = (res.data || []).map(u => ({ ...u, organizations: null }));
    }
    if (!data || data.length === 0) {
      el.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:#9CA3AF">등록된 사용자가 없습니다</div>';
      return;
    }
    _chRenderUserList(data, data.length >= 50 ? '상위 50명 표시 · 이름으로 검색하여 추가 조회' : `총 ${data.length}명`);
  } catch (e) { console.error('[Channel] user load error:', e); el.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#EF4444">사용자 로드 실패</div>'; }
}

async function _chSearchUsers() {
  const q = document.getElementById('ch-mgr-search')?.value?.trim();
  const el = document.getElementById('ch-mgr-results');
  if (!q || q.length < 1) { _chLoadInitialUsers(); return; }
  const sb = getSB();
  if (!sb) return;
  try {
    let data = null;
    try {
      const res = await sb.from('users').select('id,name,org_id,job_type,organizations(name)').eq('tenant_id', _chTenant).ilike('name', `%${q}%`).limit(30);
      if (res.error) throw res.error;
      data = res.data;
    } catch (joinErr) {
      const res = await sb.from('users').select('id,name,org_id,job_type').eq('tenant_id', _chTenant).ilike('name', `%${q}%`).limit(30);
      data = (res.data || []).map(u => ({ ...u, organizations: null }));
    }
    if (!data || data.length === 0) { el.innerHTML = '<div style="padding:12px;text-align:center;font-size:11px;color:#9CA3AF">검색 결과 없음</div>'; return; }
    _chRenderUserList(data, `"${q}" 검색 결과 ${data.length}건`);
  } catch (e) { el.innerHTML = ''; }
}

function _chRenderUserList(users, subtitle) {
  const el = document.getElementById('ch-mgr-results');
  if (!el) return;
  let html = subtitle ? `<div style="padding:6px 12px;font-size:10px;color:#9CA3AF;font-weight:700;background:#F9FAFB;border-bottom:1px solid #F3F4F6">${subtitle}</div>` : '';
  html += users.map(u => {
    const already = _chSelectedMgrs.some(m => m.user_id === u.id);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #F3F4F6;cursor:${already ? 'default' : 'pointer'};background:${already ? '#F0F9FF' : '#fff'};transition:background .1s"
      ${already ? '' : `onclick="_chAddMgr('${u.id}','${(u.name || '').replace(/'/g, "\\'")}','${(u.organizations?.name || '').replace(/'/g, "\\'")}')" `}
      onmouseover="if(!${already})this.style.background='#F8FAFC'" onmouseout="this.style.background='${already ? '#F0F9FF' : '#fff'}'">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:28px;height:28px;border-radius:50%;background:${already ? '#DBEAFE' : '#F3F4F6'};display:flex;align-items:center;justify-content:center;font-size:12px">${already ? '✅' : '👤'}</span>
        <div>
          <div style="font-size:12px;font-weight:700;color:#1E293B">${u.name}</div>
          <div style="font-size:10px;color:#6B7280">${u.organizations?.name || ''} ${u.job_type ? '· ' + u.job_type : ''}</div>
        </div>
      </div>
      ${already ? '<span style="font-size:10px;color:#3B82F6;font-weight:700">추가됨</span>' : '<span style="font-size:10px;color:#1D4ED8;font-weight:700">+ 추가</span>'}
    </div>`;
  }).join('');
  el.innerHTML = html;
}

function _chAddMgr(userId, name, dept) {
  if (_chSelectedMgrs.some(m => m.user_id === userId)) return;
  _chSelectedMgrs.push({ user_id: userId, name: name.trim(), dept: dept.trim() });
  _chRenderMgrChips();
  // 목록 즉시 갱신 (추가됨 상태 반영)
  const q = document.getElementById('ch-mgr-search')?.value?.trim();
  if (q) _chSearchUsers(); else _chLoadInitialUsers();
}

// ★ 역할 자동 생성 함수
async function _chEnsureRole(sb, channelId, channelName) {
  const roleCode = `${_chTenant}_ch_mgr_${channelId}`;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const tenantShort = tenants.find(t => t.id === _chTenant)?.short_name || _chTenant;
  const roleName = `${tenantShort} [${channelName}] 채널 담당자`;

  // 이미 존재하는지 확인
  const { data: existing } = await sb.from('roles').select('code').eq('code', roleCode).maybeSingle();
  if (!existing) {
    await sb.from('roles').insert({
      code: roleCode,
      tenant_id: _chTenant,
      name: roleName,
      descr: `${channelName} 채널 교육과정 운영 담당자`,
      service_type: 'channel',
      role_level_type: 'ops',
      level: 50
    });
  } else {
    // 채널명 변경 시 역할명 동기화
    await sb.from('roles').update({ name: roleName, descr: `${channelName} 채널 교육과정 운영 담당자` }).eq('code', roleCode);
  }
  return roleCode;
}

// ★ 담당자 → user_roles 동기화
async function _chSyncUserRoles(sb, roleCode, selectedMgrs) {
  // 기존 user_roles 전부 삭제 후 재INSERT (가장 안전)
  await sb.from('user_roles').delete().eq('role_code', roleCode);
  if (selectedMgrs.length > 0) {
    const rows = selectedMgrs.map(m => ({
      user_id: m.user_id,
      role_code: roleCode,
      tenant_id: _chTenant
    }));
    await sb.from('user_roles').insert(rows);
  }
}

async function _chSave() {
  const name = document.getElementById('ch-name')?.value?.trim();
  if (!name) { alert('채널명을 입력해주세요.'); return; }
  const desc = document.getElementById('ch-desc')?.value?.trim() || '';
  const editIdx = document.getElementById('ch-edit-idx')?.value;
  const sb = getSB();
  if (!sb) return;

  if (editIdx !== '' && editIdx !== undefined) {
    // ── 수정 ──
    const ch = _chList[Number(editIdx)];
    if (!ch) return;

    // 1) 역할 확인/생성
    const roleCode = await _chEnsureRole(sb, ch.id, name);

    // 2) 채널 업데이트
    await sb.from('edu_channels').update({
      name, description: desc,
      managers: _chSelectedMgrs,  // 호환용 JSONB 병행 저장
      role_code: roleCode
    }).eq('id', ch.id);

    // 3) user_roles 동기화
    await _chSyncUserRoles(sb, roleCode, _chSelectedMgrs);
  } else {
    // ── 생성 ──
    const id = 'CH-' + Date.now();

    // 1) 역할 자동 생성
    const roleCode = await _chEnsureRole(sb, id, name);

    // 2) 채널 INSERT
    await sb.from('edu_channels').insert({
      id, tenant_id: _chTenant, name, description: desc,
      managers: _chSelectedMgrs,
      role_code: roleCode
    });

    // 3) user_roles 동기화
    await _chSyncUserRoles(sb, roleCode, _chSelectedMgrs);
  }
  document.getElementById('ch-modal').style.display = 'none';
  renderChannelMgmt();
}

// ★ 기존 채널에 역할 후속 생성 (role_code 미생성 시)
async function _chCreateRoleFor(idx) {
  const ch = _chList[idx];
  if (!ch) return;
  const sb = getSB();
  if (!sb) return;

  const roleCode = await _chEnsureRole(sb, ch.id, ch.name);
  await sb.from('edu_channels').update({ role_code: roleCode }).eq('id', ch.id);

  // 기존 managers JSONB → user_roles 마이그레이션
  const mgrs = ch.managers || [];
  if (mgrs.length > 0) {
    await _chSyncUserRoles(sb, roleCode, mgrs);
  }

  alert(`"${ch.name}" 채널의 담당자 역할이 생성되었습니다.\n역할코드: ${roleCode}`);
  renderChannelMgmt();
}

async function _chDelete(idx) {
  const ch = _chList[idx];
  if (!ch) return;
  const sb = getSB();
  // 하위 과정 체크
  const { data: courses } = await sb.from('edu_courses').select('id').eq('channel_id', ch.id);
  if (courses && courses.length > 0) {
    alert(`하위 교육과정 ${courses.length}개가 있습니다. 과정을 먼저 삭제해주세요.`);
    return;
  }
  if (!confirm(`"${ch.name}" 채널을 삭제하시겠습니까?\n연결된 역할 및 담당자 매핑도 삭제됩니다.`)) return;

  // 1) user_roles 삭제
  if (ch.role_code) {
    await sb.from('user_roles').delete().eq('role_code', ch.role_code);
    // 2) roles 삭제
    await sb.from('roles').delete().eq('code', ch.role_code);
  }
  // 3) 채널 삭제
  await sb.from('edu_channels').delete().eq('id', ch.id);
  renderChannelMgmt();
}
