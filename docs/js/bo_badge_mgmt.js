// bo_badge_mgmt.js
// 뱃지 기준 설정 및 복합 룰 빌더
// 필터: 회사(tenant) + 가상조직(vorg) + 뱃지그룹 + 오류 수정

let mgmtBadgeGroups = [];
let allBadges = [];
let _bmAllTenants = [];
let _bmVorgTemplates = [];
let _bmFilterTenantId = '';
let _bmFilterVorgId = '';
let _bmFilterGroupId = '';

async function renderBadgeMgmt() {
  const container = document.getElementById('bo-content');
  const isSuperAdmin = boCurrentPersona?.role === 'platform_admin';
  const myTenantId = boCurrentPersona?.tenantId || 'HMC';
  _bmFilterTenantId = myTenantId;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h2 style="font-size:22px;font-weight:900;color:var(--text-main);margin:0;letter-spacing:-0.5px">
        🎖️ 뱃지 기준 설정
      </h2>
      <button onclick="openBadgeMgmtModal()"
        style="padding:8px 16px;background:var(--brand);color:#fff;border:none;border-radius:8px;
               font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
        + 뱃지 생성
      </button>
    </div>

    <!-- 필터 바 -->
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 20px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:700;color:var(--text-sub);white-space:nowrap">🔍 조회 조건</span>
      ${isSuperAdmin ? `
      <select id="bm-filter-tenant" onchange="onBmTenantChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:130px">
        <option value="">전체 회사</option>
      </select>` : `<span style="font-size:13px;font-weight:700;color:var(--text-main);padding:7px 12px;background:#f1f5f9;border-radius:7px">${myTenantId}</span>`}
      <select id="bm-filter-vorg" onchange="onBmVorgChange()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:180px">
        <option value="">전체 가상조직</option>
      </select>
      <select id="bm-filter-group" onchange="_bmFilterGroupId=this.value;loadBadgeMgmtData()"
        style="padding:7px 12px;border:1.5px solid var(--border);border-radius:7px;font-size:13px;min-width:150px">
        <option value="">전체 뱃지그룹</option>
      </select>
      <button onclick="loadBadgeMgmtData()"
        style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer">
        조회
      </button>
    </div>

    <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:24px">
      <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">
        <thead>
          <tr style="border-bottom:2px solid var(--border);color:var(--text-sub)">
            <th style="padding:12px">소속 그룹</th>
            <th style="padding:12px">레벨</th>
            <th style="padding:12px">뱃지명</th>
            <th style="padding:12px">유효기간</th>
            <th style="padding:12px">선수 뱃지</th>
            <th style="padding:12px;text-align:right">설정</th>
          </tr>
        </thead>
        <tbody id="badges-body">
          <tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">필터를 선택하고 조회해주세요.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 뱃지 통합 설정 모달 -->
    <div id="badge-mgmt-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 0;">
      <div style="background:#fff;width:800px;border-radius:16px;padding:24px;box-shadow:0 10px 25px rgba(0,0,0,0.2);position:relative">
        <h3 id="bm-modal-title" style="margin:0 0 20px;font-size:18px;font-weight:800;color:var(--brand)">뱃지 생성 및 룰 설정</h3>
        <input type="hidden" id="bm-id">
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
          <!-- 기본정보 -->
          <div style="padding:16px;border:1px solid var(--border);border-radius:10px;background:#f8fafc">
            <h4 style="margin:0 0 12px;font-size:14px;color:#334155">기본 정보</h4>
            <div style="margin-bottom:12px">
              <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">뱃지 그룹</label>
              <select id="bm-group" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px"></select>
            </div>
            <div style="margin-bottom:12px">
              <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">뱃지명</label>
              <input type="text" id="bm-name" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;box-sizing:border-box">
            </div>
            <div style="margin-bottom:12px;display:flex;gap:12px">
              <div style="flex:1">
                <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">레벨</label>
                <input type="text" id="bm-level" placeholder="예: Level 1" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;box-sizing:border-box">
              </div>
              <div style="flex:1">
                <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">유효기간 (개월)</label>
                <input type="number" id="bm-months" placeholder="0 = 영구" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;box-sizing:border-box">
              </div>
            </div>
            <div style="margin-bottom:12px">
              <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">수동 심사(증빙) 허용</label>
              <select id="bm-manual" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
                <option value="false">허용 안함 (시스템 취득만 가능)</option>
                <option value="true">허용 (운영자 수동 발급 가능)</option>
              </select>
            </div>
          </div>

          <!-- 선수 및 크로스 테넌트 매핑 -->
          <div style="padding:16px;border:1px solid var(--border);border-radius:10px;background:#f8fafc">
            <h4 style="margin:0 0 12px;font-size:14px;color:#334155">선행 조건 및 상호 인정</h4>
            <div style="margin-bottom:12px">
              <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">선수 뱃지 (강등 낙하 지점)</label>
              <select id="bm-prereq" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px"></select>
            </div>
            <div style="margin-bottom:12px">
              <label style="display:block;font-size:11px;font-weight:700;color:var(--text-sub);margin-bottom:4px">타 테넌트 인정 뱃지 ID (JSON Array)</label>
              <textarea id="bm-equivalent" rows="3" placeholder='["hmc_badge_uuid_1", "kia_badge_uuid_2"]' style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-family:monospace;resize:none;box-sizing:border-box">[]</textarea>
              <div style="font-size:10px;color:#64748b;margin-top:4px">※ 해당 UUID 뱃지 보유자는 이 뱃지도 보유한 것으로 동적 간주 처리됩니다.</div>
            </div>
          </div>
        </div>

        <hr style="border:none;border-top:1px dashed var(--border);margin:24px 0">

        <!-- 룰 빌더 -->
        <div>
          <h4 style="margin:0 0 16px;font-size:15px;color:#334155;border-left:4px solid var(--brand);padding-left:8px">최초 취득 조건 (Condition Rules JSON)</h4>
          <div style="background:#1e293b;border-radius:8px;padding:12px;margin-bottom:12px">
            <textarea id="bm-condition" rows="8" style="width:100%;background:transparent;color:#38bdf8;border:none;outline:none;font-family:monospace;font-size:13px;resize:none;box-sizing:border-box" placeholder='{
  "operator": "AND",
  "nodes": [
    { "type": "course_group", "mode": "path", "items": ["c1", "c2"] }
  ]
}'></textarea>
          </div>
          <div style="font-size:11px;color:#64748b;margin-bottom:24px">
            * <b style="color:#ef4444">course_group (path)</b>: 이수 순서 강제 (수강 인터셉터 적용)<br>
            * <b style="color:#3b82f6">course_group (pool)</b>: required_count 만큼 이수하면 합격<br>
            * <b style="color:#eab308">exam</b>: 시험 합격 관문
          </div>

          <h4 style="margin:0 0 16px;font-size:15px;color:#334155;border-left:4px solid #10b981;padding-left:8px">갱신 특화 조건 (Renewal Rules JSON)</h4>
          <div style="background:#1e293b;border-radius:8px;padding:12px">
            <textarea id="bm-renewal" rows="4" style="width:100%;background:transparent;color:#10b981;border:none;outline:none;font-family:monospace;font-size:13px;resize:none;box-sizing:border-box" placeholder='{
  "notice": "유효기간 내에 갱신을 위한 룰을 지정합니다."
}'></textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
          <button onclick="document.getElementById('badge-mgmt-modal').style.display='none'" style="padding:10px 16px;background:#f3f4f6;color:var(--text-sub);border:none;border-radius:8px;font-weight:700;cursor:pointer">취소</button>
          <button onclick="saveBadgeDef()" style="padding:10px 20px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">뱃지 저장</button>
        </div>
      </div>
    </div>
  `;

  await _bmLoadTenants(isSuperAdmin, myTenantId);
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}

async function _bmLoadTenants(isSuperAdmin, myTenantId) {
  if (!isSuperAdmin) return;
  try {
    const { data } = await window._supabase.from('tenants').select('id, name').order('name');
    _bmAllTenants = data || [];
    const sel = document.getElementById('bm-filter-tenant');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 회사</option>` +
      _bmAllTenants.map(t => `<option value="${t.id}"${t.id === myTenantId ? ' selected' : ''}>${t.name}(${t.id})</option>`).join('');
    _bmFilterTenantId = myTenantId;
    sel.value = myTenantId;
  } catch (e) { console.warn('[_bmLoadTenants]', e.message); }
}

async function _bmLoadVorgs(tenantId) {
  try {
    let q = window._supabase.from('virtual_org_templates').select('id, name').eq('service_type', 'badge').order('name');
    if (tenantId) q = q.eq('tenant_id', tenantId);
    const { data } = await q;
    _bmVorgTemplates = data || [];
    const sel = document.getElementById('bm-filter-vorg');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 가상조직</option>` +
      _bmVorgTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    _bmFilterVorgId = '';
    // 그룹도 초기화
    const gsel = document.getElementById('bm-filter-group');
    if (gsel) { gsel.innerHTML = `<option value="">전체 뱃지그룹</option>`; }
    _bmFilterGroupId = '';
  } catch (e) { console.warn('[_bmLoadVorgs]', e.message); }
}

async function _bmLoadGroups(vorgId) {
  try {
    let q = window._supabase.from('badge_groups').select('id, name');
    const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || 'HMC';
    if (tenantId) q = q.eq('tenant_id', tenantId);
    if (vorgId) q = q.eq('vorg_template_id', vorgId);
    const { data } = await q.order('name');
    mgmtBadgeGroups = data || [];
    const gsel = document.getElementById('bm-filter-group');
    if (!gsel) return;
    gsel.innerHTML = `<option value="">전체 뱃지그룹</option>` +
      mgmtBadgeGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    _bmFilterGroupId = '';
  } catch (e) { console.warn('[_bmLoadGroups]', e.message); }
}

async function onBmTenantChange() {
  const sel = document.getElementById('bm-filter-tenant');
  _bmFilterTenantId = sel ? sel.value : '';
  _bmFilterVorgId = '';
  _bmFilterGroupId = '';
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}

async function onBmVorgChange() {
  const sel = document.getElementById('bm-filter-vorg');
  _bmFilterVorgId = sel ? sel.value : '';
  _bmFilterGroupId = '';
  await _bmLoadGroups(_bmFilterVorgId);
  await loadBadgeMgmtData();
}

async function loadBadgeMgmtData() {
  const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || 'HMC';
  const tbody = document.getElementById('badges-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af">불러오는 중...</td></tr>`;

  try {
    // 1. 뱃지 그룹 목록 (필터 조건 적용)
    if (!mgmtBadgeGroups.length || !_bmFilterVorgId) {
      let gq = window._supabase.from('badge_groups').select('id, name').eq('tenant_id', tenantId);
      if (_bmFilterVorgId) gq = gq.eq('vorg_template_id', _bmFilterVorgId);
      const { data: gData } = await gq;
      mgmtBadgeGroups = gData || [];
    }

    // 2. 뱃지 조회 - 그룹 필터 적용
    let groupIdFilter = _bmFilterGroupId
      ? [_bmFilterGroupId]
      : mgmtBadgeGroups.map(g => g.id);

    if (groupIdFilter.length === 0) {
      // 그룹이 없으면 빈 배열
      allBadges = [];
      renderBadgesList();
      return;
    }

    const { data: bList, error: bErr } = await window._supabase
      .from('badges')
      .select('*')
      .in('group_id', groupIdFilter)
      .order('level', { ascending: true });

    if (bErr) throw bErr;
    allBadges = bList || [];
    renderBadgesList();
  } catch (error) {
    console.error('[loadBadgeMgmtData]', error);
    const tb = document.getElementById('badges-body');
    if (tb) tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444">⚠️ 오류: ${error.message || '데이터를 불러오지 못했습니다.'}</td></tr>`;
  }
}

function renderBadgesList() {
  const tbody = document.getElementById('badges-body');
  if (!tbody) return;
  if (!allBadges.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af">등록된 뱃지가 없습니다.<br><span style="font-size:12px">뱃지 그룹을 먼저 생성 후 뱃지를 추가하세요.</span></td></tr>`;
    return;
  }

  tbody.innerHTML = allBadges.map(b => {
    const groupName = mgmtBadgeGroups.find(g => g.id === b.group_id)?.name || '-';
    const prereq = allBadges.find(x => x.id === b.prerequisite_badge_id)?.name || '-';
    
    return `
      <tr style="border-bottom:1px solid #f3f4f6;transition:background .1s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:14px;color:var(--text-sub)">${groupName}</td>
        <td style="padding:14px;font-weight:900;color:var(--text-main)">${b.level || '-'}</td>
        <td style="padding:14px;font-weight:700;color:var(--brand)">${b.name}</td>
        <td style="padding:14px;color:var(--text-sub)">${b.valid_months ? b.valid_months+'개월' : '영구'}</td>
        <td style="padding:14px;color:#64748b">${prereq}</td>
        <td style="padding:14px;text-align:right">
          <button onclick="editBadge('${b.id}')" style="padding:4px 8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;font-size:12px;cursor:pointer;margin-right:4px">수정</button>
          <button onclick="deleteBadge('${b.id}')" style="padding:4px 8px;background:#fef2f2;color:#ef4444;border:1px solid #fee2e2;border-radius:4px;font-size:12px;cursor:pointer">삭제</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openBadgeMgmtModal() {
  document.getElementById('bm-id').value = '';
  document.getElementById('bm-name').value = '';
  document.getElementById('bm-level').value = '';
  document.getElementById('bm-months').value = '';
  document.getElementById('bm-manual').value = 'false';
  document.getElementById('bm-equivalent').value = '[]';
  
  const defaultCondition = {
    "operator": "AND",
    "nodes": [{ "type": "course_group", "mode": "path", "required_count": 2, "items": ["course_1_ID", "course_2_ID"] }]
  };
  document.getElementById('bm-condition').value = JSON.stringify(defaultCondition, null, 2);
  document.getElementById('bm-renewal').value = '{}';

  const groupSel = document.getElementById('bm-group');
  if (groupSel) {
    groupSel.innerHTML = mgmtBadgeGroups.length
      ? mgmtBadgeGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')
      : `<option value="">뱃지 그룹 없음 (먼저 생성 필요)</option>`;
  }

  const preSel = document.getElementById('bm-prereq');
  if (preSel) {
    preSel.innerHTML = `<option value="">선수 뱃지 없음</option>` +
      allBadges.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
  }

  document.getElementById('bm-modal-title').innerText = '뱃지 생성 및 룰 설정';
  document.getElementById('badge-mgmt-modal').style.display = 'flex';
}

function editBadge(id) {
  const b = allBadges.find(x => x.id === id);
  if (!b) return;

  document.getElementById('bm-id').value = b.id;
  document.getElementById('bm-name').value = b.name;
  document.getElementById('bm-level').value = b.level || '';
  document.getElementById('bm-months').value = b.valid_months || '';
  document.getElementById('bm-manual').value = b.allow_manual_award ? 'true' : 'false';
  document.getElementById('bm-equivalent').value = JSON.stringify(b.equivalent_badge_ids || [], null, 2);
  document.getElementById('bm-condition').value = JSON.stringify(b.condition_rules || {}, null, 2);
  document.getElementById('bm-renewal').value = JSON.stringify(b.renewal_rules || {}, null, 2);

  const groupSel = document.getElementById('bm-group');
  if (groupSel) {
    groupSel.innerHTML = mgmtBadgeGroups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    groupSel.value = b.group_id;
  }

  const preSel = document.getElementById('bm-prereq');
  if (preSel) {
    preSel.innerHTML = `<option value="">선수 뱃지 없음</option>` +
      allBadges.filter(x => x.id !== b.id).map(x => `<option value="${x.id}">${x.name}</option>`).join('');
    preSel.value = b.prerequisite_badge_id || '';
  }

  document.getElementById('bm-modal-title').innerText = '뱃지 수정';
  document.getElementById('badge-mgmt-modal').style.display = 'flex';
}

async function saveBadgeDef() {
  const id = document.getElementById('bm-id').value;
  const groupId = document.getElementById('bm-group')?.value || '';
  const name = (document.getElementById('bm-name')?.value || '').trim();
  const level = (document.getElementById('bm-level')?.value || '').trim();
  const monthsStr = document.getElementById('bm-months')?.value || '';
  const valid_months = monthsStr ? parseInt(monthsStr) : null;
  const allow_manual_award = document.getElementById('bm-manual')?.value === 'true';
  const preId = document.getElementById('bm-prereq')?.value || null;

  if (!name) return alert('뱃지명을 입력해주세요.');
  if (!groupId) return alert('뱃지 그룹을 선택해주세요.');
  
  let equivalent_badge_ids, condition_rules, renewal_rules;
  try {
    equivalent_badge_ids = JSON.parse(document.getElementById('bm-equivalent').value || '[]');
    condition_rules = JSON.parse(document.getElementById('bm-condition').value || '{}');
    renewal_rules = JSON.parse(document.getElementById('bm-renewal').value || '{}');
  } catch(e) {
    return alert('JSON 파싱 에러: 양식을 올바르게 작성해주세요.\n' + e.message);
  }

  const payload = {
    group_id: groupId, name, level, valid_months, allow_manual_award,
    prerequisite_badge_id: preId,
    equivalent_badge_ids, condition_rules, renewal_rules
  };

  let error;
  if (!id) {
    ({ error } = await window._supabase.from('badges').insert([payload]));
  } else {
    payload.updated_at = new Date().toISOString();
    ({ error } = await window._supabase.from('badges').update(payload).eq('id', id));
  }
  if (error) return alert('저장 오류: ' + error.message);

  document.getElementById('badge-mgmt-modal').style.display = 'none';
  loadBadgeMgmtData();
}

async function deleteBadge(id) {
  if (!confirm('삭제하시겠습니까?\n연결된 학습자 내역 등 심각한 문제가 발생할 수 있습니다.')) return;
  const { error } = await window._supabase.from('badges').delete().eq('id', id);
  if (error) alert('삭제 실패: ' + error.message);
  else loadBadgeMgmtData();
}
