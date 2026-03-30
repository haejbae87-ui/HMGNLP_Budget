// ─── 교육지원 조직 관리 ───────────────────────────────────────────────────────
// 가상교육조직 중 purpose='edu_support'인 템플릿의 조직 리스트를 표시하고,
// 각 조직별로 협조처와 담당자를 설정하는 화면

let _fmTenantId   = null;
let _fmExpanded   = new Set(); // 펼쳐진 조직 그룹 id

// ── 메인 렌더 함수 ────────────────────────────────────────────────────────────
async function renderFieldMgmt() {
  const el = document.getElementById('bo-content');
  if (!el) return;

  const role    = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  const isPlatform = role === 'platform_admin';

  if (!_fmTenantId) {
    _fmTenantId = isPlatform ? (tenants[0]?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');
  }

  const tenantName = tenants.find(t => t.id === _fmTenantId)?.name || _fmTenantId;

  // 텐넌트 셀렉트 (플랫폼 관리자만)
  const tenantSelectHtml = isPlatform ? `
  <select onchange="_fmTenantId=this.value;_fmExpanded=new Set();renderFieldMgmt()"
    style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
    ${tenants.map(t => `<option value="${t.id}" ${t.id===_fmTenantId?'selected':''}>${t.name}</option>`).join('')}
  </select>` : `<span style="font-size:13px;font-weight:800;color:#111827">🏢 ${tenantName}</span>`;

  // purpose=edu_support 인 템플릿의 가상조직 그룹 수집
  const eduOrgs = (typeof VIRTUAL_EDU_ORGS !== 'undefined' ? VIRTUAL_EDU_ORGS : [])
    .filter(tpl => tpl.tenantId === _fmTenantId && tpl.purpose === 'edu_support');

  // 모든 그룹(본부/센터) 추출
  let allGroups = [];
  for (const tpl of eduOrgs) {
    const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
    groups.forEach(g => allGroups.push({ ...g, _tplId: tpl.id, _tplName: tpl.name }));
  }

  // 그룹별 HtmlÍ
  const groupsHtml = allGroups.length ? allGroups.map((g, gi) => {
    const gid = `fmg-${g._tplId}-${gi}`;
    const open = _fmExpanded.has(gid);
    const coops = g.coopTeams || [];
    const managers = g.managers || [];
    return `
    <div style="border:1.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:12px" id="${gid}">
      <!-- 그룹 헤더 -->
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:white;cursor:pointer"
           onclick="_fmToggleGroup('${gid}')">
        <span style="font-size:16px">🏛️</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800;color:#1E293B">${g.label}</div>
          <div style="font-size:10px;color:#94A3B8;margin-top:2px">템플릿: ${g._tplName} · 협조처 ${coops.length}개 · 담당자 ${managers.length}명</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <button onclick="event.stopPropagation();_fmOpenCoopModal('${g._tplId}',${gi})"
            style="padding:5px 12px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:7px;font-size:11px;font-weight:700;color:#1D4ED8;cursor:pointer">
            🤝 협조처
          </button>
          <button onclick="event.stopPropagation();_fmOpenManagerModal('${g._tplId}',${gi})"
            style="padding:5px 12px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:7px;font-size:11px;font-weight:700;color:#059669;cursor:pointer">
            👤 담당자
          </button>
          <span style="font-size:14px;color:#94A3B8;transition:transform .2s;${open?'transform:rotate(180deg)':''}">${open?'▲':'▼'}</span>
        </div>
      </div>
      <!-- 그룹 상세 (접힘/펼침) -->
      ${open ? `
      <div style="border-top:1px solid #F1F5F9;padding:16px 18px;background:#FAFAFA">
        <!-- 현재 담당자 -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">담당자</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${managers.length ? managers.map(m => `
              <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:white;border:1.5px solid #E2E8F0;border-radius:7px;font-size:11px;font-weight:700;color:#374151">
                👤 ${m.name || m.userId}
                <button onclick="_fmRemoveManager('${g._tplId}',${gi},'${m.userId||m.name}')"
                  style="margin-left:2px;background:none;border:none;color:#EF4444;cursor:pointer;font-size:11px;padding:0">✕</button>
              </div>`).join('')
              : '<span style="font-size:11px;color:#94A3B8">담당자 없음</span>'}
          </div>
        </div>
        <!-- 현재 협조처 -->
        <div>
          <div style="font-size:10px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">협조처</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${coops.length ? coops.map((c,ci) => `
              <div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:white;border:1.5px solid #E2E8F0;border-radius:7px;font-size:11px;font-weight:700;color:#374151">
                🤝 ${c.team} <span style="font-size:9px;color:#94A3B8">${c.type||''} ${c.required||''}</span>
                <button onclick="_fmRemoveCoop('${g._tplId}',${gi},${ci})"
                  style="margin-left:2px;background:none;border:none;color:#EF4444;cursor:pointer;font-size:11px;padding:0">✕</button>
              </div>`).join('')
              : '<span style="font-size:11px;color:#94A3B8">협조처 없음</span>'}
          </div>
        </div>
      </div>` : ''}
    </div>`;
  }).join('') : `
    <div style="text-align:center;padding:60px;background:#F9FAFB;border:2px dashed #E5E7EB;border-radius:14px;color:#94A3B8">
      <div style="font-size:40px;margin-bottom:10px">📚</div>
      <div style="font-size:13px;font-weight:700;color:#64748B">교육지원 용도의 가상조직이 없습니다</div>
      <div style="font-size:11px;margin-top:4px">가상 교육 조직 관리에서 용도를 '교육지원'으로 설정한 템플릿을 먼저 만들어주세요.</div>
    </div>`;

  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:1000px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">교육지원제도 설정</span>
        <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🏢 교육지원 조직 관리</h1>
      </div>
      <p style="font-size:12px;color:#64748B;margin:0">교육지원 용도의 가상조직별 협조처와 담당자를 설정합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      ${tenantSelectHtml}
    </div>
  </div>

  <!-- 조직 목록 -->
  <div id="fm-org-list">
    ${groupsHtml}
  </div>
</div>

<!-- 담당자 추가 모달 -->
<div id="fm-mgr-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:460px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div>
        <h3 id="fm-mgr-title" style="font-size:15px;font-weight:800;margin:0">담당자 설정</h3>
        <p style="font-size:11px;color:#64748B;margin:4px 0 0" id="fm-mgr-subtitle"></p>
      </div>
      <button onclick="document.getElementById('fm-mgr-modal').style.display='none'"
        style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <input id="fm-mgr-filter" placeholder="이름 또는 사번으로 필터"
      style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:7px;font-size:12px;margin-bottom:10px"
      oninput="_fmFilterMgr(this.value)">
    <div id="fm-mgr-list" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px"></div>
  </div>
</div>

<!-- 협조처 추가 모달 -->
<div id="fm-coop-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:440px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-size:15px;font-weight:800;margin:0">🤝 협조처 추가</h3>
      <button onclick="document.getElementById('fm-coop-modal').style.display='none'"
        style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:700;display:block;margin-bottom:5px">팀/부서명 *</label>
        <input id="fm-coop-team" placeholder="예) HRD팀, 재무팀"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:11px;font-weight:700;display:block;margin-bottom:5px">협조처 유형</label>
          <select id="fm-coop-type" style="width:100%;padding:8px 10px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
            <option>교육협조처</option>
            <option>재경협조처</option>
            <option>법무협조처</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;display:block;margin-bottom:5px">협조 구분</label>
          <select id="fm-coop-required" style="width:100%;padding:8px 10px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
            <option>필수</option>
            <option>선택</option>
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;display:block;margin-bottom:5px">역할/역할명</label>
        <input id="fm-coop-role" placeholder="예) 검토, 확인"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button onclick="document.getElementById('fm-coop-modal').style.display='none'"
        style="padding:8px 16px;background:#F1F5F9;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;color:#64748B">취소</button>
      <button onclick="_fmSaveCoop()"
        style="padding:8px 18px;background:#0B132B;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">+ 추가</button>
    </div>
  </div>
</div>`;
}

// 그룹 접힘/펼침
window._fmToggleGroup = function(gid) {
  if (_fmExpanded.has(gid)) _fmExpanded.delete(gid);
  else _fmExpanded.add(gid);
  renderFieldMgmt();
};

// ── 담당자 모달 ──────────────────────────────────────────────────────────────
let _fmMgrTarget = null; // { tplId, groupIdx }

window._fmOpenManagerModal = async function(tplId, groupIdx) {
  _fmMgrTarget = { tplId, groupIdx };
  const tpl = (VIRTUAL_EDU_ORGS || []).find(t => t.id === tplId);
  const groups = tpl?.tree?.hqs || tpl?.tree?.centers || [];
  const g = groups[groupIdx];

  document.getElementById('fm-mgr-title').textContent = `👤 ${g?.label || ''} 담당자 설정`;
  document.getElementById('fm-mgr-subtitle').textContent = `${_fmTenantId} 사용자 중에서 선택`;
  document.getElementById('fm-mgr-filter').value = '';

  // 테넌트 사용자 로드
  let users = [];
  try {
    if (_sb()) {
      const { data } = await _sb().from('users').select('id,name,emp_no,job_type').eq('tenant_id', _fmTenantId);
      users = data || [];
    }
  } catch(e) {}
  window._fmAllUsers = users;

  const existingMgrs = new Set((g?.managers || []).map(m => m.userId || m.name));
  _fmRenderMgrList(users, existingMgrs);
  document.getElementById('fm-mgr-modal').style.display = 'flex';
};

function _fmRenderMgrList(users, existingSet) {
  const el = document.getElementById('fm-mgr-list');
  if (!el) return;
  if (!users.length) { el.innerHTML = '<p style="font-size:11px;color:#94A3B8;text-align:center;padding:12px">사용자 없음</p>'; return; }
  el.innerHTML = users.map(u => {
    const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===_fmMgrTarget?.tplId);
    const groups = tpl?.tree?.hqs||tpl?.tree?.centers||[];
    const g = groups[_fmMgrTarget?.groupIdx];
    const already = (g?.managers||[]).some(m=>m.userId===u.id);
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid #F1F5F9;border-radius:7px;background:#FAFAFA">
      <span>👤</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700;color:#1E293B">${u.name}</div>
        <div style="font-size:10px;color:#94A3B8">${u.emp_no||u.id} · ${u.job_type||''}</div>
      </div>
      ${already
        ? `<span style="font-size:10px;font-weight:700;color:#059669">✓ 배정됨</span>`
        : `<button onclick="_fmAddManager('${u.id}','${u.name}')"
             style="padding:4px 12px;background:#0B132B;color:#fff;border:none;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer">+ 배정</button>`}
    </div>`;
  }).join('');
}

window._fmFilterMgr = function(q) {
  const kw = (q||'').toLowerCase();
  const filtered = kw
    ? (window._fmAllUsers||[]).filter(u => (u.name||'').toLowerCase().includes(kw) || (u.emp_no||'').toLowerCase().includes(kw))
    : (window._fmAllUsers||[]);
  _fmRenderMgrList(filtered);
};

window._fmAddManager = function(userId, name) {
  const { tplId, groupIdx } = _fmMgrTarget || {};
  const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===tplId);
  if (!tpl) return;
  const groups = tpl.tree?.hqs||tpl.tree?.centers||[];
  const g = groups[groupIdx];
  if (!g) return;
  if (!g.managers) g.managers = [];
  if (!g.managers.some(m=>m.userId===userId)) g.managers.push({ userId, name });
  document.getElementById('fm-mgr-modal').style.display = 'none';
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

window._fmRemoveManager = function(tplId, groupIdx, userIdOrName) {
  const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===tplId);
  if (!tpl) return;
  const groups = tpl.tree?.hqs||tpl.tree?.centers||[];
  const g = groups[groupIdx];
  if (!g?.managers) return;
  g.managers = g.managers.filter(m => m.userId!==userIdOrName && m.name!==userIdOrName);
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

// ── 협조처 모달 ──────────────────────────────────────────────────────────────
let _fmCoopTarget = null;

window._fmOpenCoopModal = function(tplId, groupIdx) {
  _fmCoopTarget = { tplId, groupIdx };
  const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===tplId);
  const groups = tpl?.tree?.hqs||tpl?.tree?.centers||[];
  const g = groups[groupIdx];
  document.querySelector('#fm-coop-modal h3').textContent = `🤝 ${g?.label||''} 협조처 추가`;
  ['fm-coop-team','fm-coop-role'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('fm-coop-modal').style.display = 'flex';
};

window._fmSaveCoop = function() {
  const team     = document.getElementById('fm-coop-team')?.value.trim();
  const coopType = document.getElementById('fm-coop-type')?.value;
  const required = document.getElementById('fm-coop-required')?.value;
  const role     = document.getElementById('fm-coop-role')?.value.trim();
  if (!team) { alert('팀/부서명을 입력하세요.'); return; }

  const { tplId, groupIdx } = _fmCoopTarget || {};
  const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===tplId);
  if (!tpl) return;
  const groups = tpl.tree?.hqs||tpl.tree?.centers||[];
  const g = groups[groupIdx];
  if (!g) return;
  if (!g.coopTeams) g.coopTeams = [];
  g.coopTeams.push({ team, type: coopType, required, role });
  document.getElementById('fm-coop-modal').style.display = 'none';
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

window._fmRemoveCoop = function(tplId, groupIdx, coopIdx) {
  const tpl = (VIRTUAL_EDU_ORGS||[]).find(t=>t.id===tplId);
  if (!tpl) return;
  const groups = tpl.tree?.hqs||tpl.tree?.centers||[];
  const g = groups[groupIdx];
  if (!g?.coopTeams) return;
  g.coopTeams.splice(coopIdx, 1);
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

function _fmExpandGroup(tplId, groupIdx) {
  _fmExpanded.add(`fmg-${tplId}-${groupIdx}`);
}
