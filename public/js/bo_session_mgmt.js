// ─── 🗓️ 차수 관리 ───────────────────────────────────────────────────────
let _seTenant = '';
let _seCourseId = null;
let _seList = [];
let _seCourses = [];

async function renderSessionMgmt() {
    const el = document.getElementById('bo-content');
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

    const role = boCurrentPersona.role;
    const isPlatform = role === 'platform_admin' || role === 'tenant_global_admin';
    if (!_seTenant) _seTenant = isPlatform ? 'HMC' : (boCurrentPersona.tenantId || 'HMC');

    el.innerHTML = '<div class="bo-fade" style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">⏳</div>로딩 중...</div>';

    // 과정 목록 로드
    try {
        const { data } = await sb.from('edu_courses').select('id,title,channel_id,status').eq('tenant_id', _seTenant).order('title');
        _seCourses = data || [];
    } catch (e) { _seCourses = []; }
    if (!_seCourseId && _seCourses.length > 0) _seCourseId = _seCourses[0].id;

    // 차수 로드
    try {
        let q = sb.from('edu_sessions').select('*').eq('tenant_id', _seTenant).order('session_no', { ascending: true });
        if (_seCourseId) q = q.eq('course_id', _seCourseId);
        const { data } = await q;
        _seList = data || [];
    } catch (e) { _seList = []; }

    // 수강생 카운트
    let enrollCounts = {};
    try {
        const sids = _seList.map(s => s.id);
        if (sids.length > 0) {
            const { data } = await sb.from('edu_enrollments').select('session_id').in('session_id', sids).eq('status', 'enrolled');
            (data || []).forEach(e => { enrollCounts[e.session_id] = (enrollCounts[e.session_id] || 0) + 1; });
        }
    } catch (e) { }

    const selStyle = 'border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700;min-width:200px;cursor:pointer';
    const statusLabel = { planned: '📋 계획', open: '🟢 모집중', in_progress: '🔵 진행중', completed: '✅ 완료', cancelled: '🔴 취소' };
    const statusColor = { planned: '#6B7280', open: '#059669', in_progress: '#1D4ED8', completed: '#059669', cancelled: '#DC2626' };

    const selCourse = _seCourses.find(c => c.id === _seCourseId);
    const canAdd = selCourse && selCourse.status !== 'closed';

    el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">🗓️ 차수 관리</h1>
        <p class="bo-page-sub">교육과정 하위에 실제 교육 운영 차수를 관리합니다</p>
      </div>
      ${canAdd ? '<button class="bo-btn-primary" onclick="_seOpenCreate()">+ 차수 생성</button>' : ''}
    </div>

    <div class="bo-card" style="padding:14px 18px;margin-bottom:16px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:900;color:#374151">🔍 교육과정</span>
        <select onchange="_seCourseId=this.value||null;renderSessionMgmt()" style="${selStyle}">
          ${_seCourses.map(c => `<option value="${c.id}" ${c.id === _seCourseId ? 'selected' : ''}>${c.title} ${c.status === 'closed' ? '(종료)' : ''}</option>`).join('')}
        </select>
        <button onclick="renderSessionMgmt()" class="bo-btn-primary" style="margin-left:auto">🔄 새로고침</button>
      </div>
    </div>

    ${_seList.length > 0 ? `
    <div class="bo-card" style="overflow:hidden">
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>차수</th><th>차수명</th><th style="text-align:center">기간</th>
          <th style="text-align:center">정원</th><th style="text-align:center">수강</th>
          <th style="text-align:center">상태</th><th style="text-align:center">관리</th>
        </tr></thead>
        <tbody>
        ${_seList.map((s, i) => {
        const ec = enrollCounts[s.id] || 0;
        const full = s.capacity > 0 && ec >= s.capacity;
        return `<tr>
            <td style="font-weight:800;text-align:center">${s.session_no}차</td>
            <td style="font-weight:700">${s.name}</td>
            <td style="text-align:center;font-size:11px;color:#6B7280">${s.start_date || '-'} ~ ${s.end_date || '-'}</td>
            <td style="text-align:center">${s.capacity || '-'}</td>
            <td style="text-align:center;font-weight:800;color:${full ? '#DC2626' : '#059669'}">${ec}${full ? ' (정원초과)' : ''}</td>
            <td style="text-align:center"><span style="font-size:10px;font-weight:800;color:${statusColor[s.status] || '#6B7280'}">${statusLabel[s.status] || s.status}</span></td>
            <td style="text-align:center">
              <button onclick="_seOpenEdit(${i})" style="border:none;background:none;cursor:pointer;font-size:14px">✏️</button>
              <button onclick="_seDelete(${i})" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626">🗑️</button>
            </td>
          </tr>`;
    }).join('')}
        </tbody>
      </table>
    </div>` : `
    <div class="bo-card" style="padding:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:10px">🗓️</div>
      <div style="font-weight:700;color:#6B7280">${_seCourses.length === 0 ? '교육과정을 먼저 등록해주세요' : '등록된 차수가 없습니다'}</div>
    </div>`}
  </div>

  <!-- 차수 생성/수정 모달 -->
  <div id="se-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:460px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;margin-bottom:18px">
        <h3 id="se-modal-title" style="font-size:15px;font-weight:800;margin:0">차수 생성</h3>
        <button onclick="document.getElementById('se-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <input type="hidden" id="se-edit-idx">
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">차수명 <span style="color:#EF4444">*</span></label>
        <input id="se-name" type="text" placeholder="예) 2026년 1차" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">시작일</label>
          <input id="se-start" type="date" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">종료일</label>
          <input id="se-end" type="date" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <div style="flex:1">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">정원</label>
          <input id="se-cap" type="number" value="30" min="1" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        </div>
        <div style="flex:1">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">상태</label>
          <select id="se-status" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
            <option value="planned">계획</option><option value="open">모집중</option>
            <option value="in_progress">진행중</option><option value="completed">완료</option><option value="cancelled">취소</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('se-modal').style.display='none'">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="_seSave()">저장</button>
      </div>
    </div>
  </div>`;
}

async function _seOpenCreate() {
    document.getElementById('se-modal-title').textContent = '차수 생성';
    document.getElementById('se-edit-idx').value = '';
    document.getElementById('se-name').value = '';
    document.getElementById('se-start').value = '';
    document.getElementById('se-end').value = '';
    document.getElementById('se-cap').value = '30';
    document.getElementById('se-status').value = 'planned';
    document.getElementById('se-modal').style.display = 'flex';
}

function _seOpenEdit(idx) {
    const s = _seList[idx];
    if (!s) return;
    document.getElementById('se-modal-title').textContent = '차수 수정';
    document.getElementById('se-edit-idx').value = String(idx);
    document.getElementById('se-name').value = s.name;
    document.getElementById('se-start').value = s.start_date || '';
    document.getElementById('se-end').value = s.end_date || '';
    document.getElementById('se-cap').value = String(s.capacity || 30);
    document.getElementById('se-status').value = s.status || 'planned';
    document.getElementById('se-modal').style.display = 'flex';
}

async function _seSave() {
    const name = document.getElementById('se-name')?.value?.trim();
    if (!name) { alert('차수명을 입력해주세요.'); return; }
    const start_date = document.getElementById('se-start')?.value || null;
    const end_date = document.getElementById('se-end')?.value || null;
    if (start_date && end_date && start_date > end_date) { alert('시작일이 종료일보다 이후입니다.'); return; }
    const capacity = parseInt(document.getElementById('se-cap')?.value) || 30;
    const status = document.getElementById('se-status')?.value || 'planned';
    const editIdx = document.getElementById('se-edit-idx')?.value;
    const sb = getSB();
    if (!sb) return;

    if (editIdx !== '' && editIdx !== undefined) {
        const s = _seList[Number(editIdx)];
        if (!s) return;
        await sb.from('edu_sessions').update({ name, start_date, end_date, capacity, status }).eq('id', s.id);
    } else {
        const maxNo = _seList.reduce((mx, s) => Math.max(mx, s.session_no || 0), 0);
        const id = 'SES-' + Date.now();
        await sb.from('edu_sessions').insert({
            id, tenant_id: _seTenant, course_id: _seCourseId,
            session_no: maxNo + 1, name, start_date, end_date, capacity, status
        });
    }
    document.getElementById('se-modal').style.display = 'none';
    renderSessionMgmt();
}

async function _seDelete(idx) {
    const s = _seList[idx];
    if (!s) return;
    const sb = getSB();
    const { data: enrollments } = await sb.from('edu_enrollments').select('id').eq('session_id', s.id);
    if (enrollments && enrollments.length > 0) {
        alert(`수강생 ${enrollments.length}명이 입과되어 있습니다. 수강생을 먼저 제거해주세요.`);
        return;
    }
    if (!confirm(`"${s.name}" 차수를 삭제하시겠습니까?`)) return;
    await sb.from('edu_sessions').delete().eq('id', s.id);
    renderSessionMgmt();
}
