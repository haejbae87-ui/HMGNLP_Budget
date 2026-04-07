// bo_badge_group.js
// 뱃지 그룹 (Virtual Org Template 기반) 관리 UI

let currentBadgeGroups = [];
let vorgBadgeTemplates = [];

async function renderBadgeGroupMgmt() {
  const container = document.getElementById('bo-content');
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
          <input type="text" id="bg-name" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:14px" placeholder="예: HMC 데이터 전문가 뱃지 그룹">
        </div>
        
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-sub);margin-bottom:6px">연결 가상조직 템플릿</label>
          <select id="bg-vorg" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
            <!-- options -->
          </select>
          <div style="font-size:11px;color:#ef4444;margin-top:4px" id="bg-vorg-warn">※ service_type이 'badge'인 템플릿만 노출됩니다.</div>
        </div>

        <div style="margin-bottom:24px">
          <label style="display:block;font-size:12px;font-weight:700;color:var(--text-sub);margin-bottom:6px">설명</label>
          <textarea id="bg-desc" rows="3" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;resize:none" placeholder="뱃지 그룹에 대한 설명"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button onclick="document.getElementById('badge-group-modal').style.display='none'" style="padding:10px 16px;background:#f3f4f6;color:var(--text-sub);border:none;border-radius:8px;font-weight:700;cursor:pointer">취소</button>
          <button onclick="saveBadgeGroup()" style="padding:10px 16px;background:var(--brand);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">저장</button>
        </div>
      </div>
    </div>
  `;

  await loadBadgeGroupData();
}

async function loadBadgeGroupData() {
  const persona = boCurrentPersona;
  const tenantId = persona.tenantId || 'HMC'; // Fallback

  try {
    // 1. VOrg 템플릿 중 badge 용도 로드 (DB 조회)
    const { data: vOrgs, error: vErr } = await window._supabase
      .from('virtual_org_templates')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('service_type', 'badge');
    
    if (vErr) throw vErr;
    vorgBadgeTemplates = vOrgs || [];

    // 2. 뱃지 그룹 목록 로드
    const { data: bGroups, error: bgErr } = await window._supabase
      .from('badge_groups')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (bgErr) throw bgErr;
    currentBadgeGroups = bGroups || [];

    renderBadgeGroupsList();
  } catch (error) {
    console.error("Load Badge Group Error:", error);
    document.getElementById('badge-groups-body').innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:red">오류가 발생했습니다.</td></tr>`;
  }
}

function renderBadgeGroupsList() {
  const tbody = document.getElementById('badge-groups-body');
  if (!currentBadgeGroups.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#9ca3af">등록된 뱃지 그룹이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentBadgeGroups.map(bg => {
    const vOrg = vorgBadgeTemplates.find(v => v.id === bg.vorg_template_id);
    const vOrgName = vOrg ? vOrg.name : `<span style="color:red">매핑 유실 (${bg.vorg_template_id})</span>`;
    return `
      <tr style="border-bottom:1px solid #f3f4f6">
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
  document.getElementById('bg-name').value = '';
  document.getElementById('bg-desc').value = '';
  const sel = document.getElementById('bg-vorg');
  if (!vorgBadgeTemplates.length) {
    sel.innerHTML = `<option value="">등록된 뱃지 용도 가상조직이 없습니다.</option>`;
  } else {
    sel.innerHTML = `<option value="">가상조직 선택...</option>` + 
      vorgBadgeTemplates.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
  }
  document.getElementById('badge-group-modal').style.display = 'flex';
}

async function saveBadgeGroup() {
  const name = document.getElementById('bg-name').value.trim();
  const desc = document.getElementById('bg-desc').value.trim();
  const vorgId = document.getElementById('bg-vorg').value;
  const tenantId = boCurrentPersona.tenantId || 'HMC';

  if (!name || !vorgId) return alert('그룹명과 가상조직을 모두 선택해주세요.');

  const { error } = await window._supabase.from('badge_groups').insert([{
    tenant_id: tenantId,
    vorg_template_id: vorgId,
    name: name,
    description: desc
  }]);

  if (error) {
    console.error("Insert Error", error);
    alert('오류가 발생했습니다.');
  } else {
    document.getElementById('badge-group-modal').style.display = 'none';
    loadBadgeGroupData();
  }
}

async function deleteBadgeGroup(id) {
  if(!confirm('정말 삭제하시겠습니까? 연결된 뱃지들도 모두 삭제될 수 있습니다.')) return;
  const { error } = await window._supabase.from('badge_groups').delete().eq('id', id);
  if (error) {
    console.error("Delete Error", error);
    alert('오류 발생');
  } else {
    loadBadgeGroupData();
  }
}
