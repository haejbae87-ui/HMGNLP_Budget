// bo_badge_group.js v2 — 드릴다운 통합 관리 (그룹 → 뱃지 목록 + 순서)

let currentBadgeGroups = [];
let vorgBadgeTemplates = [];
let _bgAllTenants = [];
let _bgFilterTenantId = '';
let _bgFilterVorgId = '';
let _bgDetailGroup = null;   // 현재 상세 그룹
let _bgDetailBadges = [];    // 현재 그룹의 뱃지 목록

// ─── 메인: 그룹 목록 ─────────────────────────────────────────────────────────
async function renderBadgeGroupMgmt() {
  _bgDetailGroup = null;
  const container = document.getElementById('bo-content');
  const isSuperAdmin = boCurrentPersona?.role === 'platform_admin';
  const myTenantId = boCurrentPersona?.tenantId || 'HMC';
  _bgFilterTenantId = myTenantId;

  container.innerHTML = `
    <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div>
        <h1 class="bo-page-title">📛 뱃지 그룹 관리</h1>
        <p class="bo-page-sub">그룹 카드를 클릭하면 소속 뱃지를 관리할 수 있습니다</p>
      </div>
      <button onclick="openBadgeGroupModal()"
        style="padding:10px 18px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.12)">
        + 뱃지 그룹 생성
      </button>
    </div>

    <!-- 필터 바 -->
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:14px 20px;margin-bottom:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;font-weight:800;color:#6B7280">🔍 조회 조건</span>
      ${isSuperAdmin ? `
      <select id="bg-filter-tenant" onchange="onBgTenantChange()"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;min-width:130px">
        <option value="">전체 회사</option>
      </select>` : `<span style="font-size:13px;font-weight:700;color:#374151;padding:8px 12px;background:#F1F5F9;border-radius:8px">${myTenantId}</span>`}
      <select id="bg-filter-vorg" onchange="onBgVorgChange()"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;min-width:180px">
        <option value="">전체 가상조직</option>
      </select>
      <button onclick="loadBadgeGroupData()"
        style="padding:9px 20px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">
        ● 조회
      </button>
    </div>

    <!-- 그룹 카드 그리드 -->
    <div id="badge-groups-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      <div style="text-align:center;padding:40px;color:#9CA3AF;grid-column:1/-1">불러오는 중...</div>
    </div>

    <!-- 그룹 생성 모달 -->
    <div id="badge-group-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
      <div style="background:#fff;width:500px;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,0.2)">
        <h3 style="margin:0 0 20px;font-size:18px;font-weight:800;color:var(--brand)">뱃지 그룹 생성</h3>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">그룹명 <span style="color:#EF4444">*</span></label>
          <input type="text" id="bg-name" placeholder="예: HMC 데이터 전문가 뱃지 그룹"
            style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;box-sizing:border-box">
        </div>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">연결 가상조직 (badge 용도만)</label>
          <select id="bg-vorg" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px"></select>
          <div id="bg-vorg-warn" style="font-size:11px;color:#EF4444;margin-top:4px"></div>
        </div>
        <div style="margin-bottom:24px">
          <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">설명</label>
          <textarea id="bg-desc" rows="3" placeholder="뱃지 그룹 설명"
            style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('badge-group-modal').style.display='none'"
            style="padding:10px 16px;background:#F3F4F6;color:#6B7280;border:none;border-radius:8px;font-weight:700;cursor:pointer">취소</button>
          <button onclick="saveBadgeGroup()"
            style="padding:10px 18px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">저장</button>
        </div>
      </div>
    </div>
    </div>
  `;

  await _bgLoadTenants(isSuperAdmin, myTenantId);
  await _bgLoadVorgs(_bgFilterTenantId);
  await loadBadgeGroupData();
}

// ─── 필터 데이터 로드 ────────────────────────────────────────────────────────
async function _bgLoadTenants(isSuperAdmin, myTenantId) {
  if (!isSuperAdmin) return;
  try {
    const { data } = await _sb().from('tenants').select('id, name').order('name');
    _bgAllTenants = data || [];
    const sel = document.getElementById('bg-filter-tenant');
    if (!sel) return;
    sel.innerHTML = `<option value="">전체 회사</option>` +
      _bgAllTenants.map(t => `<option value="${t.id}"${t.id === myTenantId ? ' selected' : ''}>${t.name}(${t.id})</option>`).join('');
    _bgFilterTenantId = myTenantId; sel.value = myTenantId;
  } catch (e) { console.warn('[_bgLoadTenants]', e.message); }
}

async function _bgLoadVorgs(tenantId) {
  try {
    let q = _sb().from('virtual_org_templates').select('id, name').eq('service_type', 'badge').order('name');
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
  const c = document.getElementById('badge-groups-body');
  if (c) c.innerHTML = `<div style="text-align:center;padding:40px;color:#9CA3AF;grid-column:1/-1">불러오는 중...</div>`;
  try {
    let q = _sb().from('badge_groups').select('*').order('created_at', { ascending: false });
    if (tenantId) q = q.eq('tenant_id', tenantId);
    if (_bgFilterVorgId) q = q.eq('vorg_template_id', _bgFilterVorgId);
    const { data, error } = await q;
    if (error) throw error;
    currentBadgeGroups = data || [];
    _bgRenderGroupCards();
  } catch (e) {
    const c = document.getElementById('badge-groups-body');
    if (c) c.innerHTML = `<div style="text-align:center;padding:40px;color:#EF4444;grid-column:1/-1">⚠️ ${e.message}</div>`;
  }
}

function _bgRenderGroupCards() {
  const container = document.getElementById('badge-groups-body');
  if (!container) return;
  if (!currentBadgeGroups.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:#9CA3AF;grid-column:1/-1">
      <div style="font-size:40px;margin-bottom:12px">📭</div>
      <div style="font-size:14px;font-weight:700">뱃지 그룹이 없습니다</div>
      <div style="font-size:12px;margin-top:4px">가상조직(badge 용도)을 먼저 생성 후 그룹을 추가하세요</div>
    </div>`; return;
  }
  container.innerHTML = currentBadgeGroups.map(bg => {
    const vOrg = vorgBadgeTemplates.find(v => v.id === bg.vorg_template_id);
    const vOrgName = vOrg ? vOrg.name : '⚠️ 가상조직 미연결';
    return `
      <div onclick="_bgOpenGroupDetail('${bg.id}')"
        style="background:#fff;border:1.5px solid #E5E7EB;border-radius:14px;padding:22px;cursor:pointer;transition:all .18s"
        onmouseover="this.style.borderColor='#2563EB';this.style.boxShadow='0 4px 20px rgba(37,99,235,.13)';this.style.transform='translateY(-2px)'"
        onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';this.style.transform='none'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
          <span style="font-size:30px">📛</span>
          <button onclick="event.stopPropagation();deleteBadgeGroup('${bg.id}')"
            style="padding:3px 9px;background:#FEF2F2;color:#EF4444;border:1px solid #FECACA;border-radius:6px;font-size:10px;cursor:pointer;font-weight:700">삭제</button>
        </div>
        <div style="font-size:15px;font-weight:900;color:#111827;margin-bottom:4px">${bg.name}</div>
        <div style="font-size:11px;color:#6B7280;margin-bottom:6px">🔗 ${vOrgName}</div>
        ${bg.description ? `<div style="font-size:11px;color:#9CA3AF;margin-bottom:8px;line-height:1.4">${bg.description}</div>` : ''}
        <div style="font-size:11px;font-weight:800;color:#2563EB;margin-top:12px;display:flex;align-items:center;gap:4px;padding-top:10px;border-top:1px solid #F3F4F6">
          뱃지 관리 →
        </div>
      </div>`;
  }).join('');
}

// ─── 그룹 상세 (드릴다운: 뱃지 목록 + 순서 변경) ────────────────────────────
async function _bgOpenGroupDetail(groupId) {
  const group = currentBadgeGroups.find(g => g.id === groupId);
  if (!group) return;
  _bgDetailGroup = group;
  try {
    const { data, error } = await _sb().from('badges')
      .select('*').eq('group_id', groupId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    // sort_order 미설정 시 index 기반 초기화
    const allZero = (data || []).every(b => !b.sort_order);
    if (allZero && data?.length) data.forEach((b, i) => { b.sort_order = (i + 1) * 10; });
    _bgDetailBadges = data || [];
  } catch (e) { alert('뱃지 조회 실패: ' + e.message); return; }
  _bgRenderGroupDetail();
}

function _bgRenderGroupDetail() {
  const container = document.getElementById('bo-content');
  const g = _bgDetailGroup;
  const vOrg = vorgBadgeTemplates.find(v => v.id === g.vorg_template_id);

  const rows = _bgDetailBadges.length === 0
    ? `<tr><td colspan="6" style="text-align:center;padding:36px;color:#9CA3AF">
        뱃지가 없습니다. 아래 [+ 뱃지 추가] 버튼을 눌러 추가하세요.
       </td></tr>`
    : _bgDetailBadges.map((b, i) => {
      const condCount = (b.condition_rules?.nodes || []).length;
      const isFirst = i === 0, isLast = i === _bgDetailBadges.length - 1;
      return `
        <tr style="border-bottom:1px solid #F3F4F6;transition:background .1s"
            onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''">
          <td style="padding:10px 14px;text-align:center;width:60px">
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
              <button onclick="_bgMoveBadge('${b.id}','up')" ${isFirst?'disabled':''}
                style="border:none;background:${isFirst?'#F3F4F6':'#EFF6FF'};color:${isFirst?'#D1D5DB':'#1D4ED8'};border-radius:4px;padding:2px 7px;cursor:${isFirst?'default':'pointer'};font-size:12px">▲</button>
              <span style="font-size:10px;color:#9CA3AF;font-weight:800">${i+1}</span>
              <button onclick="_bgMoveBadge('${b.id}','down')" ${isLast?'disabled':''}
                style="border:none;background:${isLast?'#F3F4F6':'#EFF6FF'};color:${isLast?'#D1D5DB':'#1D4ED8'};border-radius:4px;padding:2px 7px;cursor:${isLast?'default':'pointer'};font-size:12px">▼</button>
            </div>
          </td>
          <td style="padding:10px 14px;font-weight:900;color:#374151;font-size:12px">${b.level || '-'}</td>
          <td style="padding:10px 14px">
            <div style="font-weight:700;color:#1D4ED8;font-size:13px">${b.name}</div>
            ${b.allow_manual_award ? '<span style="font-size:9px;padding:1px 6px;border-radius:5px;background:#F0FDF4;color:#059669;font-weight:700">수동발급가능</span>' : ''}
          </td>
          <td style="padding:10px 14px;color:#6B7280;font-size:12px">${b.valid_months ? b.valid_months+'개월' : '영구'}</td>
          <td style="padding:10px 14px">
            ${condCount > 0
              ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${condCount}개 조건</span>`
              : `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FEF2F2;color:#DC2626;font-weight:700">미설정</span>`}
          </td>
          <td style="padding:10px 14px;text-align:right">
            <div style="display:flex;gap:5px;justify-content:flex-end">
              <button onclick="openBadgeMgmtDetail('${b.id}','${g.id}')"
                style="padding:4px 10px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;color:#1D4ED8">✏️ 수정</button>
              <button onclick="_bgDeleteBadge('${b.id}')"
                style="padding:4px 10px;background:#FEF2F2;color:#EF4444;border:1.5px solid #FECACA;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');

  container.innerHTML = `
    <div class="bo-fade">
    <!-- Breadcrumb 헤더 -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
      <button onclick="renderBadgeGroupMgmt()"
        style="padding:6px 14px;border:1.5px solid #E5E7EB;border-radius:7px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">
        ← 그룹 목록
      </button>
      <span style="color:#9CA3AF">/</span>
      <span style="font-size:15px;font-weight:900;color:#111827">📛 ${g.name}</span>
      ${vOrg ? `<span style="font-size:10px;padding:2px 10px;border-radius:20px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${vOrg.name}</span>` : ''}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <p style="font-size:12px;color:#9CA3AF;margin:0">▲▼ 버튼으로 뱃지 표시 순서를 변경할 수 있습니다</p>
      <button onclick="openBadgeMgmtDetail(null,'${g.id}')"
        style="padding:10px 18px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.3)">
        + 뱃지 추가
      </button>
    </div>

    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
            <th style="padding:11px 14px;font-size:11px;font-weight:800;color:#6B7280;text-align:center">순서</th>
            <th style="padding:11px 14px;font-size:11px;font-weight:800;color:#6B7280">레벨</th>
            <th style="padding:11px 14px;font-size:11px;font-weight:800;color:#6B7280">뱃지명</th>
            <th style="padding:11px 14px;font-size:11px;font-weight:800;color:#6B7280">유효기간</th>
            <th style="padding:11px 14px;font-size:11px;font-weight:800;color:#6B7280">취득 조건</th>
            <th style="padding:11px 14px;text-align:right;font-size:11px;font-weight:800;color:#6B7280">관리</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    </div>
  `;
}

// ─── 순서 변경 ──────────────────────────────────────────────────────────────
async function _bgMoveBadge(badgeId, direction) {
  const idx = _bgDetailBadges.findIndex(b => b.id === badgeId);
  if (idx < 0) return;
  if (direction === 'up' && idx === 0) return;
  if (direction === 'down' && idx === _bgDetailBadges.length - 1) return;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  const a = _bgDetailBadges[idx], b = _bgDetailBadges[swapIdx];
  const aOrd = (idx + 1) * 10, bOrd = (swapIdx + 1) * 10;
  try {
    await _sb().from('badges').update({ sort_order: bOrd }).eq('id', a.id);
    await _sb().from('badges').update({ sort_order: aOrd }).eq('id', b.id);
    a.sort_order = bOrd; b.sort_order = aOrd;
    [_bgDetailBadges[idx], _bgDetailBadges[swapIdx]] = [_bgDetailBadges[swapIdx], _bgDetailBadges[idx]];
    _bgRenderGroupDetail();
  } catch (e) { alert('순서 변경 실패: ' + e.message); }
}

// ─── 그룹 상세에서 뱃지 삭제 ────────────────────────────────────────────────
async function _bgDeleteBadge(badgeId) {
  if (!confirm('삭제하시겠습니까?\n학습자 취득 이력이 있으면 심각한 문제가 발생할 수 있습니다.')) return;
  const { error } = await _sb().from('badges').delete().eq('id', badgeId);
  if (error) { alert('삭제 실패: ' + error.message); return; }
  _bgDetailBadges = _bgDetailBadges.filter(b => b.id !== badgeId);
  _bgRenderGroupDetail();
}

// ─── 그룹 생성 ──────────────────────────────────────────────────────────────
function openBadgeGroupModal() {
  const n = document.getElementById('bg-name'), d = document.getElementById('bg-desc');
  if (n) n.value = ''; if (d) d.value = '';
  const sel = document.getElementById('bg-vorg'), warn = document.getElementById('bg-vorg-warn');
  if (!vorgBadgeTemplates.length) {
    if (sel) sel.innerHTML = `<option value="">뱃지 용도 가상조직 없음</option>`;
    if (warn) warn.textContent = '먼저 가상조직 관리에서 service_type=badge 템플릿을 생성하세요.';
  } else {
    if (sel) sel.innerHTML = `<option value="">가상조직 선택...</option>` +
      vorgBadgeTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    if (warn) warn.textContent = '※ badge 용도 템플릿만 노출됩니다.';
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
  const { error } = await _sb().from('badge_groups').insert([{ tenant_id: tenantId, vorg_template_id: vorgId, name, description: desc }]);
  if (error) { alert('저장 오류: ' + error.message); return; }
  document.getElementById('badge-group-modal').style.display = 'none';
  await _bgLoadVorgs(_bgFilterTenantId);
  loadBadgeGroupData();
}

async function deleteBadgeGroup(id) {
  if (!confirm('정말 삭제하시겠습니까?\n연결된 뱃지들의 그룹 참조가 끊어집니다.')) return;
  const { error } = await _sb().from('badge_groups').delete().eq('id', id);
  if (error) { alert('삭제 실패: ' + error.message); return; }
  loadBadgeGroupData();
}
