// bo_badge_group.js
// 뱃지 그룹 (Virtual Org Template 기반) 관리 UI
// 필터: 회사(tenant) + 가상조직(vorg) + 오류 수정

let currentBadgeGroups = [];
let vorgBadgeTemplates = [];
let _bgAllTenants = [];
let _bgFilterTenantId = '';
let _bgFilterVorgId = '';

async function renderBadgeGroupMgmt() {
  const container = document.getElementById('bo-content');
  const isSuperAdmin = boCurrentPersona?.role === 'platform_admin';
  const myTenantId = boCurrentPersona?.tenantId || 'HMC';
  _bgFilterTenantId = myTenantId;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="font-size:22px;font-weight:900;color:var(--text-main);margin:0;letter-spacing:-0.5px">
        📛 뱃지 그룹 관리
      </h2>
      <button onclick="openBadgeGroupModal()"
        style="padding:8px 16px;background:var(--brand);color:#fff;border:none;border-radius:8px;
               font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
        + 뱃지 그룹 생성
      </button>
    </div>

    <!-- 필터 바 -->
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 20px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:700;color:var(--text-sub);white-space:nowrap">🔍 조회 조건</span>
      ${isSuperAdmin ? `
      <select id="bg-filter-tenant" onchange="onBgTenantChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:130px">
        <option value="">전체 회사</option>
      </select>` : `<span style="font-size:13px;font-weight:700;color:var(--text-main);padding:7px 12px;background:#f1f5f9;border-radius:7px">${myTenantId}</span>`}
      <select id="bg-filter-vorg" onchange="onBgVorgChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:180px">
        <option value="">전체 가상조직</option>
      </select>
      <button onclick="loadBadgeGroupData()"
        style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer">
        조회
      </button>
    </div>

    <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px">
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-sub)">
        💡 뱃지 제도를 묶어주는 논리적 단위입니다. "뱃지(badge)" 용도로 생성된 가상조직 템플릿만 매핑할 수 있습니다.
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
        <thead>
          <tr style="border-bottom:2px solid var(--border);color:var(--text-sub)">
            <th style="padding:12px">시스템 그룹명</th>
            <th style="padding:12px">연결된 가상조직 (용도: badge)</th>
            <th style="padding:12px">생성일</th>
            <th style="padding:12px;text-align:right">관리</th>
          </tr>
        </thead>
        <tbody id="badge-groups-body">
          <tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">데이터를 불러오는 중...</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 뱃지 그룹 생성/수정 모달 -->
    <div id="badge-group-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
      <div style="background:#fff;width:500px;border-radius:16px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <h3 id="bg-modal-title" style="margin:0 0 20px;font-size:18px;font-weight:800;color:var(--brand)">뱃지 그룹 생성</h3>
        
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-sub);margin-bottom:6px">그룹명 (표시용)</label>
          <input type="text" id="bg-name" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;box-sizing:border-box" placeholder="예: HMC 데이터 전문가 뱃지 그룹">
        </div>
        
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-sub);margin-bottom:6px">연결 가상조직 템플릿 (badge 용도만)</label>
          <select id="bg-vorg" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
            <!-- options -->
          </select>
          <div style="font-size:11px;color:#ef4444;margin-top:4px" id="bg-vorg-warn"></div>
        </div>

        <div style="margin-bottom:24px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-sub);margin-bottom:6px">설명</label>
          <textarea id="bg-desc" rows="3" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;resize:none;box-sizing:border-box" placeholder="뱃지 그룹에 대한 설명"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('badge-group-modal').style.display='none'" style="padding:10px 16px;background:#f3f4f6;color:var(--text-sub);border:none;border-radius:8px;font-weight:700;cursor:pointer">취소</button>
          <button onclick="saveBadgeGroup()" style="padding:10px 16px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">저장</button>
        </div>
      </div>
    </div>
  `;

  await _bgLoadTenants(isSuperAdmin, myTenantId);
  await _bgLoadVorgs(_bgFilterTenantId);
  await loadBadgeGroupData();
}

async function _bgLoadTenants(isSuperAdmin, myTenantId) {
  if (!isSuperAdmin) return;
  try {
    const { data } = await window._supabase.from('tenants').select('id, name').order('name');
    _bgAllTenants = data || [];
    const sel = document.getElementById('bg-filter-tenant');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 회사</option>` +
      _bgAllTenants.map(t => `<option value="${t.id}"${t.id === myTenantId ? ' selected' : ''}>${t.name}(${t.id})</option>`).join('');
    _bgFilterTenantId = myTenantId;
    sel.value = myTenantId;
  } catch (e) { console.warn('[_bgLoadTenants]', e.message); }
}

async function _bgLoadVorgs(tenantId) {
  try {
    let q = window._supabase.from('virtual_org_templates').select('id, name').eq('service_type', 'badge').order('name');
    if (tenantId) q = q.eq('tenant_id', tenantId);
    const { data } = await q;
    vorgBadgeTemplates = data || [];
    const sel = document.getElementById('bg-filter-vorg');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 가상조직</option>` +
      vorgBadgeTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    _bgFilterVorgId = '';
  } catch (e) { console.warn('[_bgLoadVorgs]', e.message); }
}

async function onBgTenantChange() {
  const sel = document.getElementById('bg-filter-tenant');
  _bgFilterTenantId = sel ? sel.value : '';
  _bgFilterVorgId = '';
  await _bgLoadVorgs(_bgFilterTenantId);
  await loadBadgeGroupData();
}

async function onBgVorgChange() {
  const sel = document.getElementById('bg-filter-vorg');
  _bgFilterVorgId = sel ? sel.value : '';
  await loadBadgeGroupData();
}

async function loadBadgeGroupData() {
  const tenantId = _bgFilterTenantId || boCurrentPersona?.tenantId || 'HMC';
  const tbody = document.getElementById('badge-groups-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>`;

  try {
    // 뱃지 그룹 조회
    let q = window._supabase.from('badge_groups').select('*').order('created_at', { ascending: false });
    if (tenantId) q = q.eq('tenant_id', tenantId);
    if (_bgFilterVorgId) q = q.eq('vorg_template_id', _bgFilterVorgId);

    const { data: bGroups, error: bgErr } = await q;
    if (bgErr) throw bgErr;
    currentBadgeGroups = bGroups || [];

    renderBadgeGroupsList();
  } catch (error) {
    console.error('Load Badge Group Error:', error);
    const tb = document.getElementById('badge-groups-body');
    if (tb) tb.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#ef4444">⚠️ 오류: ${error.message || '데이터를 불러오지 못했습니다.'}</td></tr>`;
  }
}

function renderBadgeGroupsList() {
  const tbody = document.getElementById('badge-groups-body');
  if (!tbody) return;
  if (!currentBadgeGroups.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#9ca3af">등록된 뱃지 그룹이 없습니다.<br><span style="font-size:12px">가상조직을 먼저 생성하고, 뱃지 그룹을 추가해주세요.</span></td></tr>`;
    return;
  }

  tbody.innerHTML = currentBadgeGroups.map(bg => {
    const vOrg = vorgBadgeTemplates.find(v => v.id === bg.vorg_template_id);
    const vOrgName = vOrg ? vOrg.name : `<span style="color:#f59e0b;font-size:12px">가상조직 정보 없음 (${(bg.vorg_template_id || '').substring(0, 12)}...)</span>`;
    return `
      <tr style="border-bottom:1px solid #f3f4f6;transition:background .1s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:14px;font-weight:700;color:var(--brand)">${bg.name}</td>
        <td style="padding:14px;color:var(--text-sub)">${vOrgName}</td>
        <td style="padding:14px;color:var(--text-sub)">${bg.created_at ? bg.created_at.substring(0,10) : '-'}</td>
        <td style="padding:14px;text-align:right">
          <button onclick="deleteBadgeGroup('${bg.id}')" style="padding:4px 8px;background:#fef2f2;color:#ef4444;border:1px solid #fee2e2;border-radius:4px;font-size:12px;cursor:pointer">삭제</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openBadgeGroupModal() {
  const nameEl = document.getElementById('bg-name');
  const descEl = document.getElementById('bg-desc');
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';

  const sel = document.getElementById('bg-vorg');
  const warn = document.getElementById('bg-vorg-warn');
  if (!vorgBadgeTemplates.length) {
    if (sel) sel.innerHTML = `<option value="">등록된 뱃지 용도 가상조직이 없습니다.</option>`;
    if (warn) warn.textContent = '먼저 가상조직 관리 > 새 VOrg 템플릿(service_type=badge)을 생성해주세요.';
  } else {
    if (sel) sel.innerHTML = `<option value="">가상조직 선택...</option>` +
      vorgBadgeTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    if (warn) warn.textContent = '※ service_type이 \'badge\'인 템플릿만 노출됩니다.';
  }
  document.getElementById('badge-group-modal').style.display = 'flex';
}

async function saveBadgeGroup() {
  const name = (document.getElementById('bg-name')?.value || '').trim();
  const desc = (document.getElementById('bg-desc')?.value || '').trim();
  const vorgId = document.getElementById('bg-vorg')?.value || '';
  const tenantId = _bgFilterTenantId || boCurrentPersona?.tenantId || 'HMC';

  if (!name) return alert('그룹명을 입력해주세요.');
  if (!vorgId) return alert('가상조직을 선택해주세요.');

  const { error } = await window._supabase.from('badge_groups').insert([{
    tenant_id: tenantId,
    vorg_template_id: vorgId,
    name,
    description: desc
  }]);

  if (error) {
    console.error('Insert Error', error);
    alert('저장 중 오류가 발생했습니다: ' + error.message);
  } else {
    document.getElementById('badge-group-modal').style.display = 'none';
    await _bgLoadVorgs(_bgFilterTenantId);
    loadBadgeGroupData();
  }
}

async function deleteBadgeGroup(id) {
  if (!confirm('정말 삭제하시겠습니까?\n연결된 뱃지들의 그룹 참조가 끊어집니다.')) return;
  const { error } = await window._supabase.from('badge_groups').delete().eq('id', id);
  if (error) {
    console.error('Delete Error', error);
    alert('삭제 실패: ' + error.message);
  } else {
    loadBadgeGroupData();
  }
}
