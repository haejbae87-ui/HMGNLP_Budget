// ─── 📺 채널 관리 ─────────────────────────────────────────────────────────
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

    // 각 채널의 과정 수 카운트
    let courseCounts = {};
    try {
        const { data } = await sb.from('edu_courses').select('channel_id').eq('tenant_id', _chTenant);
        (data || []).forEach(c => { courseCounts[c.channel_id] = (courseCounts[c.channel_id] || 0) + 1; });
    } catch (e) { }

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
        <p class="bo-page-sub">테넌트 하위에서 교육과정을 운영할 채널을 관리합니다</p>
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
          <th>채널명</th><th>설명</th><th style="text-align:center">담당자</th>
          <th style="text-align:center">과정 수</th><th style="text-align:center">상태</th><th style="text-align:center">관리</th>
        </tr></thead>
        <tbody>
        ${_chList.map((ch, i) => {
        const mgrs = ch.managers || [];
        const cc = courseCounts[ch.id] || 0;
        return `<tr>
            <td style="font-weight:800">${ch.name}</td>
            <td style="color:#6B7280;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.description || '-'}</td>
            <td style="text-align:center">${mgrs.length > 0
                ? mgrs.map(m => `<span style="font-size:10px;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-weight:700">${m.name}</span>`).join(' ')
                : '<span style="font-size:10px;color:#9CA3AF">없음</span>'}</td>
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
    <div style="background:#fff;border-radius:16px;width:520px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;margin-bottom:18px">
        <h3 id="ch-modal-title" style="font-size:15px;font-weight:800;margin:0">채널 생성</h3>
        <button onclick="document.getElementById('ch-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <input type="hidden" id="ch-edit-idx">
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">채널명 <span style="color:#EF4444">*</span></label>
        <input id="ch-name" type="text" placeholder="예) HRD교육채널" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">설명</label>
        <textarea id="ch-desc" placeholder="채널 설명" rows="2" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">담당자</label>
        <div id="ch-mgr-chips" style="margin-bottom:8px"></div>
        <div style="display:flex;gap:6px">
          <input id="ch-mgr-search" type="text" placeholder="🔍 사용자 검색..." oninput="_chSearchUsers()" style="flex:1;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;outline:none">
        </div>
        <div id="ch-mgr-results" style="max-height:150px;overflow-y:auto;margin-top:6px"></div>
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
    _chSelectedMgrs = [];
    _chRenderMgrChips();
    document.getElementById('ch-mgr-results').innerHTML = '';
    document.getElementById('ch-modal').style.display = 'flex';
}

function _chOpenEdit(idx) {
    const ch = _chList[idx];
    if (!ch) return;
    document.getElementById('ch-modal-title').textContent = '채널 수정';
    document.getElementById('ch-edit-idx').value = String(idx);
    document.getElementById('ch-name').value = ch.name;
    document.getElementById('ch-desc').value = ch.description || '';
    _chSelectedMgrs = [...(ch.managers || [])];
    _chRenderMgrChips();
    document.getElementById('ch-mgr-results').innerHTML = '';
    document.getElementById('ch-modal').style.display = 'flex';
}

function _chRenderMgrChips() {
    const el = document.getElementById('ch-mgr-chips');
    if (!el) return;
    if (_chSelectedMgrs.length === 0) {
        el.innerHTML = '<span style="font-size:11px;color:#9CA3AF">담당자 없음</span>';
        return;
    }
    el.innerHTML = _chSelectedMgrs.map((m, i) =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;color:#1D4ED8;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin:2px">
      👤 ${m.name}
      <button onclick="_chRemoveMgr(${i})" style="border:none;background:none;cursor:pointer;color:#93C5FD;font-size:11px;padding:0">✕</button>
    </span>`
    ).join('');
}

function _chRemoveMgr(idx) {
    _chSelectedMgrs.splice(idx, 1);
    _chRenderMgrChips();
}

async function _chSearchUsers() {
    const q = document.getElementById('ch-mgr-search')?.value?.trim();
    const el = document.getElementById('ch-mgr-results');
    if (!q || q.length < 1) { el.innerHTML = ''; return; }
    const sb = getSB();
    if (!sb) return;
    try {
        const { data } = await sb.from('users').select('id,name,department').eq('tenant_id', _chTenant).ilike('name', `%${q}%`).limit(10);
        if (!data || data.length === 0) { el.innerHTML = '<div style="padding:8px;font-size:11px;color:#9CA3AF">검색 결과 없음</div>'; return; }
        el.innerHTML = data.map(u => {
            const already = _chSelectedMgrs.some(m => m.user_id === u.id);
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #F3F4F6;cursor:${already ? 'default' : 'pointer'};opacity:${already ? '.5' : '1'}"
        ${already ? '' : `onclick="_chAddMgr('${u.id}','${(u.name || '').replace(/'/g, "\\'")}',' ${(u.department || '').replace(/'/g, "\\'")}')" `}>
        <div><span style="font-size:12px;font-weight:700">${u.name}</span> <span style="font-size:10px;color:#6B7280">${u.department || ''}</span></div>
        ${already ? '<span style="font-size:10px;color:#6B7280">추가됨</span>' : '<span style="font-size:10px;color:#1D4ED8">+ 추가</span>'}
      </div>`;
        }).join('');
    } catch (e) { el.innerHTML = ''; }
}

function _chAddMgr(userId, name, dept) {
    if (_chSelectedMgrs.some(m => m.user_id === userId)) return;
    _chSelectedMgrs.push({ user_id: userId, name: name.trim(), dept: dept.trim() });
    _chRenderMgrChips();
    _chSearchUsers(); // refresh
}

async function _chSave() {
    const name = document.getElementById('ch-name')?.value?.trim();
    if (!name) { alert('채널명을 입력해주세요.'); return; }
    const desc = document.getElementById('ch-desc')?.value?.trim() || '';
    const editIdx = document.getElementById('ch-edit-idx')?.value;
    const sb = getSB();
    if (!sb) return;

    if (editIdx !== '' && editIdx !== undefined) {
        // 수정
        const ch = _chList[Number(editIdx)];
        if (!ch) return;
        await sb.from('edu_channels').update({ name, description: desc, managers: _chSelectedMgrs }).eq('id', ch.id);
    } else {
        // 생성
        const id = 'CH-' + Date.now();
        await sb.from('edu_channels').insert({ id, tenant_id: _chTenant, name, description: desc, managers: _chSelectedMgrs });
    }
    document.getElementById('ch-modal').style.display = 'none';
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
    if (!confirm(`"${ch.name}" 채널을 삭제하시겠습니까?`)) return;
    await sb.from('edu_channels').delete().eq('id', ch.id);
    renderChannelMgmt();
}
