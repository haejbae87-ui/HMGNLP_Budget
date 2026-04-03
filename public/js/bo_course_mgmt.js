// ─── 📚 교육과정 관리 ───────────────────────────────────────────────────
let _crTenant = '';
let _crChannelId = null;
let _crList = [];
let _crChannels = [];

async function renderCourseMgmt() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const role = boCurrentPersona.role;
  const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
  if (!_crTenant) _crTenant = isPlatform ? (tenants.find(t => t.id !== 'SYSTEM')?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');

  el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>로딩 중...</div>';

  // 채널 로드
  try {
    const { data } = await sb.from('edu_channels').select('id,name').eq('tenant_id', _crTenant).eq('active', true).order('name');
    _crChannels = data || [];
  } catch (e) { _crChannels = []; }

  // 과정 로드
  try {
    let q = sb.from('edu_courses').select('*').eq('tenant_id', _crTenant).order('created_at', { ascending: false });
    if (_crChannelId) q = q.eq('channel_id', _crChannelId);
    const { data } = await q;
    _crList = data || [];
  } catch (e) { _crList = []; }

  // 차수 카운트
  let sessionCounts = {};
  try {
    const cids = _crList.map(c => c.id);
    if (cids.length > 0) {
      const { data } = await sb.from('edu_sessions').select('course_id').in('course_id', cids);
      (data || []).forEach(s => { sessionCounts[s.course_id] = (sessionCounts[s.course_id] || 0) + 1; });
    }
  } catch (e) { }

  const selStyle = 'border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:130px;cursor:pointer';
  const chMap = {};
  _crChannels.forEach(c => chMap[c.id] = c.name);

  const statusLabel = { draft: '📝 초안', active: '🟢 운영중', closed: '🔴 종료' };
  const statusColor = { draft: '#D97706', active: '#059669', closed: '#DC2626' };

  const tenantSel = isPlatform
    ? `<label style="font-size:10px;font-weight:700;color:#6B7280">테넌트</label>
        <select onchange="_crTenant=this.value;_crChannelId=null;renderCourseMgmt()" style="${selStyle}">
        ${tenants.filter(t => t.id !== 'SYSTEM').map(t => `<option value="${t.id}" ${t.id === _crTenant ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>` : `<span style="font-size:12px;font-weight:800;color:#374151;padding:6px 10px;background:#F3F4F6;border-radius:8px">${tenants.find(t => t.id === _crTenant)?.name || _crTenant}</span>`;

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">📚 교육과정 관리</h1>
        <p class="bo-page-sub">채널 하위에 교육과정을 개설하고 관리합니다</p>
      </div>
      <button class="bo-btn-primary" onclick="_crOpenCreate()">+ 과정 개설</button>
    </div>

    <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:900;color:#374151">🔍 필터</span>
        ${tenantSel}
        <label style="font-size:10px;font-weight:700;color:#6B7280">채널</label>
        <select onchange="_crChannelId=this.value||null;renderCourseMgmt()" style="${selStyle}">
          <option value="">전체</option>
          ${_crChannels.map(c => `<option value="${c.id}" ${c.id === _crChannelId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <button onclick="renderCourseMgmt()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
      </div>
    </div>

    ${_crList.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>과정명</th><th>채널</th><th style="text-align:center">교육유형</th>
          <th style="text-align:center">차수</th><th style="text-align:center">상태</th><th style="text-align:center">관리</th>
        </tr></thead>
        <tbody>
        ${_crList.map((c, i) => `<tr>
          <td style="font-weight:800">${c.title}</td>
          <td style="color:#6B7280">${chMap[c.channel_id] || '-'}</td>
          <td style="text-align:center"><span style="font-size:10px;background:#F3F4F6;padding:2px 8px;border-radius:6px;font-weight:700">${c.edu_type || '-'}</span></td>
          <td style="text-align:center;font-weight:700">${sessionCounts[c.id] || 0}</td>
          <td style="text-align:center"><span style="font-size:10px;font-weight:800;color:${statusColor[c.status] || '#6B7280'}">${statusLabel[c.status] || c.status}</span></td>
          <td style="text-align:center">
            <button onclick="_crOpenEdit(${i})" style="border:none;background:none;cursor:pointer;font-size:14px">✏️</button>
            <button onclick="_crDelete(${i})" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626">🗑️</button>
          </td>
        </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">📚</div>
      <div style="font-weight:700;color:#6B7280">등록된 교육과정이 없습니다</div>
    </div>`}
  </div>

  <!-- 과정 생성/수정 모달 -->
  <div id="cr-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:500px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;margin-bottom:18px">
        <h3 id="cr-modal-title" style="font-size:15px;font-weight:800;margin:0">과정 개설</h3>
        <button onclick="document.getElementById('cr-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <input type="hidden" id="cr-edit-idx">
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">채널 <span style="color:#EF4444">*</span></label>
        <select id="cr-channel" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
          ${_crChannels.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">과정명 <span style="color:#EF4444">*</span></label>
        <input id="cr-title" type="text" placeholder="예) AI 기초 교육" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">교육유형</label>
        <select id="cr-type" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
          <option value="집합교육">집합교육</option><option value="온라인교육">온라인교육</option>
          <option value="혼합교육">혼합교육</option><option value="위탁교육">위탁교육</option><option value="기타">기타</option>
        </select>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">교육 내용</label>
        <textarea id="cr-content" placeholder="교육 내용 간략 설명" rows="3" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;resize:vertical"></textarea>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">상태</label>
        <select id="cr-status" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
          <option value="draft">초안</option><option value="active">운영중</option><option value="closed">종료</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('cr-modal').style.display='none'">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="_crSave()">저장</button>
      </div>
    </div>
  </div>`;
}

function _crOpenCreate() {
  document.getElementById('cr-modal-title').textContent = '과정 개설';
  document.getElementById('cr-edit-idx').value = '';
  document.getElementById('cr-title').value = '';
  document.getElementById('cr-content').value = '';
  document.getElementById('cr-status').value = 'draft';
  if (_crChannelId) document.getElementById('cr-channel').value = _crChannelId;
  document.getElementById('cr-modal').style.display = 'flex';
}

function _crOpenEdit(idx) {
  const c = _crList[idx];
  if (!c) return;
  document.getElementById('cr-modal-title').textContent = '과정 수정';
  document.getElementById('cr-edit-idx').value = String(idx);
  document.getElementById('cr-channel').value = c.channel_id;
  document.getElementById('cr-title').value = c.title;
  document.getElementById('cr-type').value = c.edu_type || '집합교육';
  document.getElementById('cr-content').value = c.content || '';
  document.getElementById('cr-status').value = c.status || 'draft';
  document.getElementById('cr-modal').style.display = 'flex';
}

async function _crSave() {
  const title = document.getElementById('cr-title')?.value?.trim();
  if (!title) { alert('과정명을 입력해주세요.'); return; }
  const channelId = document.getElementById('cr-channel')?.value;
  if (!channelId) { alert('채널을 선택해주세요.'); return; }
  const edu_type = document.getElementById('cr-type')?.value || '';
  const content = document.getElementById('cr-content')?.value?.trim() || '';
  const status = document.getElementById('cr-status')?.value || 'draft';
  const editIdx = document.getElementById('cr-edit-idx')?.value;
  const sb = getSB();
  if (!sb) return;

  if (editIdx !== '' && editIdx !== undefined) {
    const c = _crList[Number(editIdx)];
    if (!c) return;
    await sb.from('edu_courses').update({ title, channel_id: channelId, edu_type, content, status }).eq('id', c.id);
  } else {
    const id = 'CRS-' + Date.now();
    await sb.from('edu_courses').insert({ id, tenant_id: _crTenant, channel_id: channelId, title, edu_type, content, status, created_by: boCurrentPersona.name || '' });
  }
  document.getElementById('cr-modal').style.display = 'none';
  renderCourseMgmt();
}

async function _crDelete(idx) {
  const c = _crList[idx];
  if (!c) return;
  const sb = getSB();
  const { data: sessions } = await sb.from('edu_sessions').select('id').eq('course_id', c.id);
  if (sessions && sessions.length > 0) {
    alert(`하위 차수 ${sessions.length}개가 있습니다. 차수를 먼저 삭제해주세요.`);
    return;
  }
  if (!confirm(`"${c.title}" 과정을 삭제하시겠습니까?`)) return;
  await sb.from('edu_courses').delete().eq('id', c.id);
  renderCourseMgmt();
}
