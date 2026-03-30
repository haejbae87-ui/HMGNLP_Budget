// ─── 교육지원 조직 관리 ───────────────────────────────────────────────────────
// 가상교육조직 중 service_type='edu_support'인 템플릿의 조직 리스트를 표시하고,
// 각 조직별로 협조처와 담당자를 설정하는 화면

let _fmTenantId     = null;
let _fmTplId        = null;  // 선택된 템플릿
let _fmExpanded     = new Set();
let _fmLoadedTpls   = [];   // DB에서 로드된 템플릿 캐시

// ── 메인 렌더 함수 ────────────────────────────────────────────────────────────
async function renderFieldMgmt() {
  const el = document.getElementById('bo-content');
  if (!el) return;

  const role    = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  const isPlatform = role === 'platform_admin' || role === 'tenant_admin';

  if (!_fmTenantId) {
    _fmTenantId = isPlatform ? (tenants[0]?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');
  }

  const tenantName = tenants.find(t => t.id === _fmTenantId)?.name || _fmTenantId;

  // DB에서 edu_support 템플릿 로드
  _fmLoadedTpls = [];
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from('virtual_org_templates')
        .select('id,name,purpose,service_type,tree_data,tenant_id')
        .eq('tenant_id', _fmTenantId)
        .or('service_type.ilike.%edu_support%,purpose.eq.edu_support,purpose.eq.교육지원');
      if (data && data.length) {
        _fmLoadedTpls = data.map(row => ({
          id:       row.id,
          tenantId: row.tenant_id,
          name:     row.name,
          purpose:  row.service_type || row.purpose,
          tree:     row.tree_data || { hqs: [] }
        }));
      }
    }
  } catch(e) {
    console.warn('[FieldMgmt] DB 로드 실패:', e.message);
  }
  // 폴백: 목업
  if (!_fmLoadedTpls.length && typeof VIRTUAL_EDU_ORGS !== 'undefined') {
    _fmLoadedTpls = VIRTUAL_EDU_ORGS.filter(t => t.tenantId === _fmTenantId &&
      (t.purpose === 'edu_support' || t.purpose === '교육지원'));
  }

  // 템플릿 선택이 없거나 현재 테넌트에 없으면 첫 번째로 초기화
  if (!_fmTplId || !_fmLoadedTpls.find(t => t.id === _fmTplId)) {
    _fmTplId = _fmLoadedTpls[0]?.id || null;
  }

  const curTpl = _fmLoadedTpls.find(t => t.id === _fmTplId);

  // -- 헤더 셀렉트박스 HTML --
  const tenantSelectHtml = isPlatform
    ? `<select onchange="_fmTenantId=this.value;_fmTplId=null;_fmExpanded=new Set();renderFieldMgmt()"
        style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
        ${tenants.map(t => `<option value="${t.id}" ${t.id===_fmTenantId?'selected':''}>${t.name}</option>`).join('')}
      </select>`
    : `<span style="font-size:13px;font-weight:800;color:#111827">🏢 ${tenantName}</span>`;

  const tplSelectHtml = _fmLoadedTpls.length > 1
    ? `<select onchange="_fmTplId=this.value;_fmExpanded=new Set();renderFieldMgmt()"
        style="padding:7px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:700;background:#EFF6FF;color:#1D4ED8;cursor:pointer">
        ${_fmLoadedTpls.map(t => `<option value="${t.id}" ${t.id===_fmTplId?'selected':''}>${t.name}</option>`).join('')}
      </select>`
    : (curTpl ? `<span style="font-size:12px;font-weight:700;background:#EFF6FF;color:#1D4ED8;padding:6px 12px;border-radius:8px">📋 ${curTpl.name}</span>` : '');

  // -- 그룹 목록 --
  const groups = curTpl ? (curTpl.tree?.hqs || curTpl.tree?.centers || []) : [];
  const allGroups = groups.map((g, gi) => ({ ...g, _tplId: curTpl?.id, _tplName: curTpl?.name, _gi: gi }));

  const groupsHtml = allGroups.length ? allGroups.map((g) => {
    const gi  = g._gi;
    const gid = `fmg-${g._tplId}-${gi}`;
    const open = _fmExpanded.has(gid);
    const coops    = g.coopTeams || [];
    const managers = g.managers  || [];
    const gName    = g.name || g.label || `그룹 ${gi+1}`;
    return `
    <div style="border:1.5px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:12px" id="${gid}">
      <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:white;cursor:pointer"
           onclick="_fmToggleGroup('${gid}')">
        <span style="font-size:18px">🏛️</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:800;color:#1E293B">${gName}</div>
          <div style="font-size:10px;color:#94A3B8;margin-top:2px">
            템플릿: ${g._tplName} &nbsp;·&nbsp; 협조처 ${coops.length}개 &nbsp;·&nbsp; 담당자 ${managers.length}명
          </div>
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
          <span style="font-size:14px;color:#94A3B8">${open?'▲':'▼'}</span>
        </div>
      </div>
      ${open ? `
      <div style="border-top:1px solid #F1F5F9;padding:16px 18px;background:#FAFAFA">
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
      <div style="font-size:13px;font-weight:700;color:#64748B">${_fmLoadedTpls.length ? '이 템플릿에 가상조직이 없습니다' : '교육지원 용도의 가상조직이 없습니다'}</div>
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
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      ${tenantSelectHtml}
      ${tplSelectHtml}
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

<!-- 협조처 추가 모달 (조직 검색 방식) -->
<div id="fm-coop-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <div>
        <h3 id="fm-coop-title" style="font-size:15px;font-weight:800;margin:0">🤝 협조처 추가</h3>
        <p style="font-size:11px;color:#64748B;margin:4px 0 0">협조처로 지정할 조직을 검색하여 선택하세요</p>
      </div>
      <button onclick="document.getElementById('fm-coop-modal').style.display='none'"
        style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <!-- 조직 검색 -->
    <div style="padding:12px 20px;border-bottom:1px solid #F3F4F6">
      <input id="fm-coop-org-search" type="text" placeholder="🔍 조직명 검색..."
        oninput="_fmFilterCoopOrgs(this.value)"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none;background:#F9FAFB">
    </div>
    <!-- 조직 목록 -->
    <div id="fm-coop-org-list" style="flex:1;overflow-y:auto;padding:10px 20px;min-height:160px;max-height:220px"></div>
    <!-- 선택된 조직 + 설정 -->
    <div style="padding:14px 20px;border-top:1px solid #F3F4F6;background:#F9FAFB">
      <div id="fm-coop-selected-info" style="font-size:12px;color:#9CA3AF;margin-bottom:10px">조직을 선택하면 여기에 표시됩니다</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">협조처 유형</label>
          <select id="fm-coop-type" style="width:100%;padding:7px 10px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
            <option>교육협조처</option>
            <option>재경협조처</option>
            <option>법무협조처</option>
            <option>기타협조처</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px">협조 구분</label>
          <select id="fm-coop-required" style="width:100%;padding:7px 10px;border:1.5px solid #E2E8F0;border-radius:7px;font-size:12px">
            <option>필수</option>
            <option>선택</option>
          </select>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('fm-coop-modal').style.display='none'"
          style="padding:8px 16px;background:#F1F5F9;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;color:#64748B">취소</button>
        <button onclick="_fmSaveCoop()"
          style="padding:8px 18px;background:#0B132B;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">+ 추가</button>
      </div>
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

function _fmFindGroup(tplId, groupIdx) {
  const tpl = _fmLoadedTpls.find(t => t.id === tplId);
  const groups = tpl?.tree?.hqs || tpl?.tree?.centers || [];
  return { tpl, groups, g: groups[groupIdx] };
}

// ── 담당자 모달 ──────────────────────────────────────────────────────────────
let _fmMgrTarget = null;

window._fmOpenManagerModal = async function(tplId, groupIdx) {
  _fmMgrTarget = { tplId, groupIdx };
  const { g } = _fmFindGroup(tplId, groupIdx);
  const gName = g?.name || g?.label || '';

  document.getElementById('fm-mgr-title').textContent = `👤 ${gName} 담당자 설정`;
  document.getElementById('fm-mgr-subtitle').textContent = `${_fmTenantId} 사용자 중에서 선택`;
  document.getElementById('fm-mgr-filter').value = '';

  let users = [];
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb.from('users').select('id,name,emp_no,job_type').eq('tenant_id', _fmTenantId);
      users = data || [];
    }
  } catch(e) {}
  window._fmAllUsers = users;
  _fmRenderMgrList(users);
  document.getElementById('fm-mgr-modal').style.display = 'flex';
};

function _fmRenderMgrList(users) {
  const el = document.getElementById('fm-mgr-list');
  if (!el) return;
  if (!users.length) { el.innerHTML = '<p style="font-size:11px;color:#94A3B8;text-align:center;padding:12px">사용자 없음</p>'; return; }
  const { g } = _fmFindGroup(_fmMgrTarget?.tplId, _fmMgrTarget?.groupIdx);
  el.innerHTML = users.map(u => {
    const already = (g?.managers||[]).some(m => m.userId===u.id);
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
  const { g } = _fmFindGroup(tplId, groupIdx);
  if (!g) return;
  if (!g.managers) g.managers = [];
  if (!g.managers.some(m => m.userId===userId)) g.managers.push({ userId, name });
  document.getElementById('fm-mgr-modal').style.display = 'none';
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

window._fmRemoveManager = function(tplId, groupIdx, userIdOrName) {
  const { g } = _fmFindGroup(tplId, groupIdx);
  if (!g?.managers) return;
  g.managers = g.managers.filter(m => m.userId!==userIdOrName && m.name!==userIdOrName);
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

// ── 협조처 모달 (조직 검색 방식) ──────────────────────────────────────────────
let _fmCoopTarget  = null;
let _fmCoopOrgAll  = [];  // 로드된 조직 목록
let _fmCoopOrgSel  = null; // 선택된 조직 { id, name }

window._fmOpenCoopModal = async function(tplId, groupIdx) {
  _fmCoopTarget = { tplId, groupIdx };
  _fmCoopOrgSel = null;
  const { g } = _fmFindGroup(tplId, groupIdx);
  const gName = g?.name || g?.label || '';
  document.getElementById('fm-coop-title').textContent = `🤝 ${gName} 협조처 추가`;
  document.getElementById('fm-coop-org-search').value = '';
  document.getElementById('fm-coop-selected-info').innerHTML = '<span style="color:#9CA3AF;font-size:12px">조직을 선택하면 여기에 표시됩니다</span>';

  // 조직 목록 DB 로드
  const orgList = document.getElementById('fm-coop-org-list');
  orgList.innerHTML = '<div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">조직 로딩 중...</div>';
  document.getElementById('fm-coop-modal').style.display = 'flex';

  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb.from('organizations')
        .select('id,name,type,parent_id')
        .eq('tenant_id', _fmTenantId)
        .order('name');
      _fmCoopOrgAll = data || [];
    }
  } catch(e) { _fmCoopOrgAll = []; }
  _fmRenderCoopOrgList(_fmCoopOrgAll);
};

function _fmRenderCoopOrgList(orgs) {
  const el = document.getElementById('fm-coop-org-list');
  if (!el) return;
  if (!orgs.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">조직 없음</div>';
    return;
  }
  const typeStyle = { headquarters:'#1E40AF', center:'#6D28D9', office:'#065F46', division:'#92400E', team:'#374151' };
  el.innerHTML = orgs.map(o => {
    const col = typeStyle[o.type] || '#374151';
    const sel = _fmCoopOrgSel?.id === o.id;
    return `
    <div onclick="_fmSelectCoopOrg('${o.id}','${o.name.replace(/'/g,"\\'")}')"
      style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;
             background:${sel?'#EFF6FF':'#fff'};border:1.5px solid ${sel?'#3B82F6':'#F3F4F6'}">
      <span style="font-size:11px;padding:2px 7px;border-radius:5px;background:${col}20;color:${col};font-weight:700">${o.type||'org'}</span>
      <span style="font-size:12px;font-weight:${sel?'800':'600'};color:#1E293B">${o.name}</span>
      ${sel ? '<span style="margin-left:auto;font-size:11px;color:#1D4ED8;font-weight:700">✓ 선택</span>' : ''}
    </div>`;
  }).join('');
}

window._fmSelectCoopOrg = function(id, name) {
  _fmCoopOrgSel = { id, name };
  document.getElementById('fm-coop-selected-info').innerHTML =
    `<span style="font-size:12px;font-weight:700;color:#1D4ED8">✓ 선택됨: ${name}</span>`;
  _fmRenderCoopOrgList(_fmCoopOrgAll);
};

window._fmFilterCoopOrgs = function(q) {
  const kw = (q||'').toLowerCase();
  const filtered = kw
    ? _fmCoopOrgAll.filter(o => o.name.toLowerCase().includes(kw))
    : _fmCoopOrgAll;
  _fmRenderCoopOrgList(filtered);
};

window._fmSaveCoop = function() {
  if (!_fmCoopOrgSel) { alert('협조처 조직을 선택하세요.'); return; }
  const coopType = document.getElementById('fm-coop-type')?.value;
  const required = document.getElementById('fm-coop-required')?.value;
  const { tplId, groupIdx } = _fmCoopTarget || {};
  const { g } = _fmFindGroup(tplId, groupIdx);
  if (!g) return;
  if (!g.coopTeams) g.coopTeams = [];
  g.coopTeams.push({ team: _fmCoopOrgSel.name, orgId: _fmCoopOrgSel.id, type: coopType, required });
  document.getElementById('fm-coop-modal').style.display = 'none';
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

window._fmRemoveCoop = function(tplId, groupIdx, coopIdx) {
  const { g } = _fmFindGroup(tplId, groupIdx);
  if (!g?.coopTeams) return;
  g.coopTeams.splice(coopIdx, 1);
  renderFieldMgmt();
  _fmExpandGroup(tplId, groupIdx);
};

function _fmExpandGroup(tplId, groupIdx) {
  _fmExpanded.add(`fmg-${tplId}-${groupIdx}`);
}
