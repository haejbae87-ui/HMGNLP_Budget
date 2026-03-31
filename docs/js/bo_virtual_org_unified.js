// ─── 가상교육조직 통합 관리 화면 ──────────────────────────────────────────────
// 기존 3개 메뉴(가상조직/예산계정/교육지원조직)를 용도별 동적 탭으로 통합
// 공통 탭: ① 기본정보  ② 가상조직 구성  ③ 협조처·담당자
// 용도별:  ④ 예산계정(edu_support) / ④ 자격증 맵핑(cert)

let _vuActiveTab   = 0;
let _vuTplId       = null;   // 선택된 템플릿 ID
let _vuTplList     = [];     // 현재 테넌트의 템플릿 목록
let _vuTenantId    = null;

// ── 탭 정의: 용도별 동적 생성 ──────────────────────────────────────────────────
function _vuGetTabs(purpose) {
  const common = [
    { key: 'info',   label: '① 기본정보',       icon: '📋' },
    { key: 'org',    label: '② 가상조직 구성',   icon: '🏗️' },
    { key: 'coop',   label: '③ 협조처·담당자',   icon: '🤝' },
  ];
  if (purpose === 'edu_support' || purpose === '교육지원') {
    common.push({ key: 'budget', label: '④ 예산계정', icon: '💳' });
  } else if (purpose === 'cert' || purpose === '자격증') {
    common.push({ key: 'cert',   label: '④ 자격증 맵핑', icon: '📜' });
  }
  return common;
}

// ── 진입점 ─────────────────────────────────────────────────────────────────────
async function renderVirtualOrgUnified() {
  const el = document.getElementById('bo-content');
  if (!el) return;

  const role    = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  const isPlatform = role === 'platform_admin';

  if (!_vuTenantId) {
    _vuTenantId = isPlatform ? (tenants[0]?.id || 'HMC') : (boCurrentPersona.tenantId || 'HMC');
  }

  // DB에서 템플릿 로드
  _vuTplList = [];
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from('virtual_org_templates')
        .select('id,name,purpose,service_type,tree_data,tenant_id,owner_role_ids')
        .eq('tenant_id', _vuTenantId);
      if (data && data.length) {
        _vuTplList = data.map(row => ({
          id:            row.id,
          tenantId:      row.tenant_id,
          name:          row.name,
          purpose:       row.service_type || row.purpose || 'edu_support',
          serviceTypes:  (row.service_type || row.purpose || 'edu_support').split(',').map(s=>s.trim()),
          ownerRoleIds:  row.owner_role_ids || [],
          tree:          row.tree_data || { hqs: [] },
        }));
      }
    }
  } catch(e) {
    console.warn('[VOU] DB 로드 실패:', e.message);
  }

  // 폴백: 기존 _voMyTemplates
  if (!_vuTplList.length && typeof _voMyTemplates !== 'undefined' && _voMyTemplates.length) {
    _vuTplList = _voMyTemplates.filter(t => t.tenantId === _vuTenantId || t.tenant_id === _vuTenantId);
  }

  // 템플릿 선택 유지
  if (!_vuTplId || !_vuTplList.find(t => t.id === _vuTplId)) {
    _vuTplId = _vuTplList[0]?.id || null;
    _vuActiveTab = 0;
  }

  const curTpl = _vuTplList.find(t => t.id === _vuTplId);
  const purpose = curTpl?.purpose || 'edu_support';
  const tabs = _vuGetTabs(purpose);
  if (_vuActiveTab >= tabs.length) _vuActiveTab = 0;

  // 테넌트 셀렉트 (플랫폼 총괄만)
  const tenantSelectHtml = isPlatform ? `
    <select onchange="_vuTenantId=this.value;_vuTplId=null;_vuActiveTab=0;renderVirtualOrgUnified()"
      style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
      ${tenants.map(t => `<option value="${t.id}" ${t.id===_vuTenantId?'selected':''}>${t.name}</option>`).join('')}
    </select>` : '';

  // 용도 뱃지 색상
  const purposeColors = {
    edu_support: { bg:'#EFF6FF', text:'#1D4ED8', label:'교육지원' },
    '교육지원':    { bg:'#EFF6FF', text:'#1D4ED8', label:'교육지원' },
    language:    { bg:'#F0FDF4', text:'#059669', label:'어학' },
    cert:        { bg:'#FFF7ED', text:'#C2410C', label:'자격증' },
    badge:       { bg:'#F5F3FF', text:'#7C3AED', label:'배지' },
  };

  el.innerHTML = `
<div class="bo-fade" style="display:flex;gap:0;min-height:calc(100vh - 130px)">
  <!-- ═══ 좌측: 템플릿 목록 패널 ═══ -->
  <div style="width:260px;flex-shrink:0;border-right:1.5px solid #E5E7EB;background:#FAFBFC;overflow-y:auto">
    <div style="padding:16px 14px 10px;border-bottom:1px solid #E5E7EB">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:900;color:#111827">📋 템플릿 목록</span>
        <button onclick="_vuOpenCreateModal()"
          style="padding:4px 10px;background:#1D4ED8;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ 생성</button>
      </div>
      ${tenantSelectHtml}
    </div>
    <div style="padding:6px 8px">
      ${_vuTplList.length ? _vuTplList.map(t => {
        const pc = purposeColors[t.purpose] || purposeColors.edu_support;
        const isActive = t.id === _vuTplId;
        return `
      <div onclick="_vuSelectTpl('${t.id}')"
        style="padding:12px 14px;border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .12s;
               background:${isActive ? '#EFF6FF' : '#fff'};
               border:1.5px solid ${isActive ? '#BFDBFE' : '#F3F4F6'};
               ${isActive ? 'box-shadow:0 2px 8px rgba(29,78,216,.08)' : ''}">
        <div style="font-size:13px;font-weight:${isActive ? 900 : 600};color:${isActive ? '#1D4ED8' : '#374151'};margin-bottom:4px">${t.name}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:${pc.bg};color:${pc.text}">${pc.label}</span>
          <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:#F3F4F6;color:#6B7280">${(t.tree?.hqs || t.tree?.centers || []).length}개 조직</span>
        </div>
      </div>`;
      }).join('') : `
      <div style="padding:30px 14px;text-align:center;color:#9CA3AF">
        <div style="font-size:28px;margin-bottom:8px">📋</div>
        <div style="font-size:12px;font-weight:700">등록된 템플릿이 없습니다</div>
        <div style="font-size:11px;margin-top:4px">상단 '+ 생성' 버튼으로 추가하세요</div>
      </div>`}
    </div>
  </div>

  <!-- ═══ 우측: 탭 기반 상세 관리 ═══ -->
  <div style="flex:1;overflow-y:auto">
    ${curTpl ? `
    <!-- 탭 헤더 -->
    <div style="padding:16px 24px 0;border-bottom:1.5px solid #E5E7EB;background:#fff;position:sticky;top:0;z-index:10">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <h2 style="font-size:18px;font-weight:900;margin:0;color:#111827">${curTpl.name}</h2>
        <span style="font-size:10px;padding:3px 10px;border-radius:6px;font-weight:700;background:${(purposeColors[purpose]||purposeColors.edu_support).bg};color:${(purposeColors[purpose]||purposeColors.edu_support).text}">${(purposeColors[purpose]||purposeColors.edu_support).label}</span>
        <button onclick="voOpenEditTemplate('${curTpl.id}')" style="margin-left:auto;padding:5px 12px;border:1.5px solid #E5E7EB;border-radius:7px;background:#fff;font-size:11px;font-weight:700;cursor:pointer;color:#6B7280">⚙ 설정 수정</button>
      </div>
      <div style="display:flex;gap:0">
        ${tabs.map((tab, i) => `
        <button onclick="_vuSwitchTab(${i})"
          style="padding:10px 18px;font-size:12px;font-weight:${_vuActiveTab===i?900:600};
                 color:${_vuActiveTab===i?'#1D4ED8':'#6B7280'};
                 border:none;background:none;cursor:pointer;position:relative;
                 border-bottom:${_vuActiveTab===i?'3px solid #1D4ED8':'3px solid transparent'};
                 transition:all .15s">${tab.icon} ${tab.label}</button>`).join('')}
      </div>
    </div>
    <!-- 탭 콘텐츠 -->
    <div id="vu-tab-content" style="padding:20px 24px">
      ${_vuRenderTabContent(tabs[_vuActiveTab]?.key, curTpl)}
    </div>
    ` : `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CA3AF">
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🏗️</div>
        <div style="font-size:15px;font-weight:700">좌측에서 템플릿을 선택하세요</div>
        <div style="font-size:12px;margin-top:6px">또는 '+ 생성' 버튼으로 새 템플릿을 만드세요</div>
      </div>
    </div>`}
  </div>
</div>

<!-- 신규 생성 모달 -->
${_vuCreateModal()}
`;
}

// ── 템플릿 선택·탭 전환 ────────────────────────────────────────────────────
function _vuSelectTpl(tplId) {
  _vuTplId = tplId;
  _vuActiveTab = 0;
  renderVirtualOrgUnified();
}

function _vuSwitchTab(idx) {
  _vuActiveTab = idx;
  const curTpl = _vuTplList.find(t => t.id === _vuTplId);
  if (!curTpl) return;
  const tabs = _vuGetTabs(curTpl.purpose);
  const el = document.getElementById('vu-tab-content');
  if (el) el.innerHTML = _vuRenderTabContent(tabs[idx]?.key, curTpl);
  // 탭 버튼 스타일 갱신
  renderVirtualOrgUnified();
}

// ── 탭 콘텐츠 렌더 ─────────────────────────────────────────────────────────
function _vuRenderTabContent(tabKey, tpl) {
  if (!tpl) return '';
  switch(tabKey) {
    case 'info':   return _vuTabInfo(tpl);
    case 'org':    return _vuTabOrg(tpl);
    case 'coop':   return _vuTabCoop(tpl);
    case 'budget': return _vuTabBudget(tpl);
    case 'cert':   return _vuTabCert(tpl);
    default:       return '<div style="padding:40px;text-align:center;color:#9CA3AF">준비 중입니다</div>';
  }
}

// ═══ 탭①: 기본정보 ═══════════════════════════════════════════════════════════
function _vuTabInfo(tpl) {
  const purposeLabels = { edu_support:'교육지원', language:'어학', cert:'자격증', badge:'배지', '교육지원':'교육지원' };
  const types = tpl.serviceTypes || [tpl.purpose];
  const roleIds = tpl.ownerRoleIds || [];
  return `
<div style="max-width:640px">
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 16px">📋 기본정보</h3>
  <div class="bo-card" style="padding:20px">
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">템플릿 명칭</label>
      <div style="font-size:15px;font-weight:800;color:#111827;padding:8px 0">${tpl.name}</div>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:8px">용도 (제도유형)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${types.map(t => {
          const colors = { edu_support:'#1D4ED8', language:'#059669', cert:'#C2410C', badge:'#7C3AED' };
          const bgs    = { edu_support:'#EFF6FF', language:'#F0FDF4', cert:'#FFF7ED', badge:'#F5F3FF' };
          return `<span style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;background:${bgs[t]||'#F3F4F6'};color:${colors[t]||'#374151'};border:1.5px solid ${colors[t]||'#E5E7EB'}30">
            ${purposeLabels[t] || t}</span>`;
        }).join('')}
      </div>
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">맵핑 역할</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 0">
        ${roleIds.length ? roleIds.map(r => `<code style="background:#F3F4F6;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700">${r}</code>`).join('') : '<span style="color:#9CA3AF;font-size:12px">미설정</span>'}
      </div>
    </div>
  </div>
  <div style="margin-top:12px;text-align:right">
    <button onclick="voOpenEditTemplate('${tpl.id}')" class="bo-btn-primary bo-btn-sm">⚙ 설정 수정</button>
  </div>
</div>`;
}

// ═══ 탭②: 가상조직 구성 ═════════════════════════════════════════════════════
function _vuTabOrg(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  return `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0">🏗️ 가상조직 구성</h3>
    <button onclick="_vuAddGroup('${tpl.id}')" class="bo-btn-primary bo-btn-sm">+ 가상 본부 추가</button>
  </div>
  ${groups.length ? groups.map((g, gi) => {
    const teams = g.teams || g.children || [];
    return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:12px;border-left:4px solid #1D4ED8">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🏢</span>
        <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${teams.length}팀</span>
        ${g.managers ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">담당자 ${g.managers.length}명</span>` : ''}
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="_vuEditGroup('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm">수정</button>
        <button onclick="_vuMapTeams('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm">+ 팀 매핑</button>
        <button onclick="_vuDeleteGroup('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#FCA5A5">삭제</button>
      </div>
    </div>
    ${teams.length ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding-left:28px">
      ${teams.map(t => `
      <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px">
        <span style="font-size:11px">👥</span>
        <span style="font-size:12px;font-weight:600;color:#374151">${t.name}</span>
        <span style="font-size:10px;color:#9CA3AF">${t.parentName || ''}</span>
        <button onclick="_vuRemoveTeam('${tpl.id}',${gi},'${t.id}')" style="border:none;background:none;color:#D1D5DB;cursor:pointer;font-size:12px;padding:0 2px">✕</button>
      </div>`).join('')}
    </div>` : '<div style="padding:8px 28px;font-size:11px;color:#9CA3AF">매핑된 팀이 없습니다. + 팀 매핑 버튼을 클릭하세요.</div>'}
  </div>`;
  }).join('') : `
  <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
    <div style="font-size:32px;margin-bottom:8px">🏗️</div>
    <div style="font-size:13px;font-weight:700;color:#6B7280">가상조직이 없습니다</div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:4px">+ 가상 본부 추가 버튼으로 조직을 구성하세요</div>
  </div>`}
</div>`;
}

// ═══ 탭③: 협조처·담당자 ═════════════════════════════════════════════════════
function _vuTabCoop(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  return `
<div>
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 16px">🤝 협조처·담당자 관리</h3>
  ${groups.length ? groups.map((g, gi) => {
    const coopTeams = g.coopTeams || [];
    const managers  = g.managers || [];
    return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:16px">🏢</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
      <span style="font-size:10px;color:#9CA3AF">${tpl.name}</span>
    </div>
    <!-- 협조처 -->
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:800;color:#D97706">🤝 협조처</span>
        <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">${coopTeams.length}개</span>
        <button onclick="_vuAddCoop('${tpl.id}',${gi})" style="margin-left:auto;padding:4px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;color:#D97706">+ 협조처 추가</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${coopTeams.map((ct,ci) => `
        <span style="padding:5px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:7px;font-size:11px;font-weight:600;color:#92400E;display:flex;align-items:center;gap:4px">
          ${ct.name || ct}
          <button onclick="_vuRemoveCoop('${tpl.id}',${gi},${ci})" style="border:none;background:none;color:#D97706;cursor:pointer;font-size:10px;padding:0">✕</button>
        </span>`).join('') || '<span style="font-size:11px;color:#9CA3AF">등록된 협조처가 없습니다</span>'}
      </div>
    </div>
    <!-- 담당자 -->
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:800;color:#059669">👤 담당자</span>
        <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#D1FAE5;color:#065F46;font-weight:700">${managers.length}명</span>
        <button onclick="_vuAddManager('${tpl.id}',${gi})" style="margin-left:auto;padding:4px 10px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;color:#059669">+ 담당자 추가</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${managers.map((m,mi) => `
        <span style="padding:5px 10px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:7px;font-size:11px;font-weight:600;color:#065F46;display:flex;align-items:center;gap:4px">
          ${m.name || m}
          <button onclick="_vuRemoveManager('${tpl.id}',${gi},${mi})" style="border:none;background:none;color:#059669;cursor:pointer;font-size:10px;padding:0">✕</button>
        </span>`).join('') || '<span style="font-size:11px;color:#9CA3AF">등록된 담당자가 없습니다</span>'}
      </div>
    </div>
  </div>`;
  }).join('') : '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:700">② 가상조직 구성 탭에서 조직을 먼저 추가하세요</div>'}
</div>`;
}

// ═══ 탭④-A: 예산계정 (edu_support) ══════════════════════════════════════════
function _vuTabBudget(tpl) {
  // 기존 renderBudgetAccount 로직을 탭 내부에 삽입
  // _baTplId를 현재 템플릿으로 세팅하고 로드
  _baTplId = tpl.id;
  _baTenantId = tpl.tenantId;
  
  return `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0">💳 예산계정 관리</h3>
    <button onclick="openS1Modal()" class="bo-btn-primary bo-btn-sm">+ 계정 신규 등록</button>
  </div>
  <div id="vu-budget-list">🔄 로딩 중...</div>
</div>

<!-- 계정 등록/수정 모달 -->
<div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="s1-modal-title" style="font-size:15px;font-weight:800;margin:0">예산 계정 신규 등록</h3>
      <button onclick="s1CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="s1-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="s1CloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="s1SaveAccount()">저장</button>
    </div>
  </div>
</div>`;
}

// ═══ 탭④-B: 자격증 맵핑 (cert) ═════════════════════════════════════════════
function _vuTabCert(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  return `
<div>
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 16px">📜 자격증 맵핑</h3>
  ${groups.length ? groups.map((g, gi) => {
    const certs = g.certMappings || [];
    return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🏢</span>
        <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FFF7ED;color:#C2410C;font-weight:700">${certs.length}개 자격증</span>
      </div>
      <button onclick="_vuAddCert('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm" style="color:#C2410C;border-color:#FED7AA">+ 자격증 추가</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${certs.map((c,ci) => `
      <span style="padding:5px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:11px;font-weight:600;color:#C2410C;display:flex;align-items:center;gap:4px">
        📜 ${c.name || c}
        <button onclick="_vuRemoveCert('${tpl.id}',${gi},${ci})" style="border:none;background:none;color:#C2410C;cursor:pointer;font-size:10px;padding:0">✕</button>
      </span>`).join('') || '<span style="font-size:11px;color:#9CA3AF">맵핑된 자격증이 없습니다</span>'}
    </div>
  </div>`;
  }).join('') : '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:700">② 가상조직 구성 탭에서 조직을 먼저 추가하세요</div>'}
</div>`;
}

// ── 예산계정 로더 (탭④ 렌더 후 호출) ────────────────────────────────────────
async function _vuLoadBudgetAccounts() {
  const listEl = document.getElementById('vu-budget-list');
  if (!listEl) return;
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb || !_baTplId) { listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#9CA3AF">DB 연결 또는 템플릿 선택 필요</div>'; return; }
    const { data, error } = await sb.from('budget_accounts').select('*').eq('virtual_org_template_id', _baTplId).order('created_at', { ascending: true });
    if (error) throw error;
    _baAccountList = data || [];
    if (!_baAccountList.length) {
      listEl.innerHTML = `
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
        <div style="font-size:32px;margin-bottom:8px">💳</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">이 템플릿에 등록된 예산 계정이 없습니다</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">위 '+ 계정 신규 등록' 버튼으로 추가하세요</div>
      </div>`;
      return;
    }
    listEl.innerHTML = _baAccountList.map(a => _baRenderAccountCard(a, true)).join('');
  } catch(e) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#EF4444">로드 실패: ${e.message}</div>`;
  }
}

// ── 조직 관리 액션 함수들 (stub → 기존 함수 연동) ───────────────────────────
function _vuAddGroup(tplId) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const name = prompt('가상 본부 이름을 입력하세요:');
  if (!name) return;
  if (!tpl.tree.hqs) tpl.tree.hqs = [];
  tpl.tree.hqs.push({ id: 'VG-' + Date.now(), name, teams: [], coopTeams: [], managers: [] });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuEditGroup(tplId, gi) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const newName = prompt('조직 이름 수정:', g.name);
  if (!newName) return;
  g.name = newName;
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuDeleteGroup(tplId, gi) {
  if (!confirm('이 가상조직을 삭제하시겠습니까?')) return;
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl || !tpl.tree?.hqs) return;
  tpl.tree.hqs.splice(gi, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuMapTeams(tplId, gi) {
  // 팀 매핑 모달 - 기존 로직 활용
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  _voCurrentGroup = (tpl.tree?.hqs || [])[gi];
  _voEditGroupIdx = gi;
  // 기존 팀 추가 모달이 있으면 활용, 없으면 prompt
  const teamName = prompt('매핑할 팀 이름을 입력하세요:');
  if (!teamName) return;
  if (!_voCurrentGroup.teams) _voCurrentGroup.teams = [];
  _voCurrentGroup.teams.push({ id: 'T-' + Date.now(), name: teamName, parentName: _voCurrentGroup.name });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuRemoveTeam(tplId, gi, teamId) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.teams) return;
  g.teams = g.teams.filter(t => t.id !== teamId);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// ── 협조처·담당자 액션 ──────────────────────────────────────────────────────
function _vuAddCoop(tplId, gi) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const name = prompt('협조처 팀 이름:');
  if (!name) return;
  if (!g.coopTeams) g.coopTeams = [];
  g.coopTeams.push({ id: 'CT-' + Date.now(), name });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuRemoveCoop(tplId, gi, ci) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.coopTeams) return;
  g.coopTeams.splice(ci, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuAddManager(tplId, gi) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const name = prompt('담당자 이름:');
  if (!name) return;
  if (!g.managers) g.managers = [];
  g.managers.push({ id: 'MG-' + Date.now(), name });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuRemoveManager(tplId, gi, mi) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.managers) return;
  g.managers.splice(mi, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// ── 자격증 맵핑 액션 ────────────────────────────────────────────────────────
function _vuAddCert(tplId, gi) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const name = prompt('자격증 이름:');
  if (!name) return;
  if (!g.certMappings) g.certMappings = [];
  g.certMappings.push({ id: 'CE-' + Date.now(), name });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuRemoveCert(tplId, gi, ci) {
  const tpl = _vuTplList.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.certMappings) return;
  g.certMappings.splice(ci, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// ── DB 자동저장 ─────────────────────────────────────────────────────────────
async function _vuAutoSave(tpl) {
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb || !tpl) return;
    await sb.from('virtual_org_templates').update({
      tree_data: tpl.tree,
      updated_at: new Date().toISOString(),
    }).eq('id', tpl.id);
  } catch(e) {
    console.warn('[VOU] 자동저장 실패:', e.message);
  }
}

// ── 신규 생성 모달 ──────────────────────────────────────────────────────────
function _vuCreateModal() {
  return `
<div id="vu-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="font-size:15px;font-weight:800;margin:0">🏗️ 새 템플릿 생성</h3>
      <button onclick="document.getElementById('vu-create-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">템플릿 명칭 *</label>
      <input id="vu-new-name" type="text" placeholder="예) HMC 일반교육예산"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">용도 선택</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
          <input type="radio" name="vu-purpose" value="edu_support" checked style="accent-color:#1D4ED8">
          <span style="font-size:12px;font-weight:700">📚 교육지원</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
          <input type="radio" name="vu-purpose" value="language" style="accent-color:#059669">
          <span style="font-size:12px;font-weight:700">🌐 어학</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
          <input type="radio" name="vu-purpose" value="cert" style="accent-color:#C2410C">
          <span style="font-size:12px;font-weight:700">📜 자격증</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
          <input type="radio" name="vu-purpose" value="badge" style="accent-color:#7C3AED">
          <span style="font-size:12px;font-weight:700">🏅 배지</span>
        </label>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('vu-create-modal').style.display='none'">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="_vuConfirmCreate()">생성</button>
    </div>
  </div>
</div>`;
}

function _vuOpenCreateModal() {
  document.getElementById('vu-create-modal').style.display = 'flex';
}

async function _vuConfirmCreate() {
  const name = document.getElementById('vu-new-name')?.value.trim();
  if (!name) { alert('명칭을 입력하세요.'); return; }
  const purpose = document.querySelector('input[name="vu-purpose"]:checked')?.value || 'edu_support';
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb) { alert('DB 연결이 없습니다.'); return; }
    const newId = 'TPL-' + Date.now();
    const { error } = await sb.from('virtual_org_templates').insert({
      id: newId,
      tenant_id: _vuTenantId,
      name,
      service_type: purpose,
      purpose,
      tree_data: { hqs: [] },
      owner_role_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    document.getElementById('vu-create-modal').style.display = 'none';
    _vuTplId = newId;
    _vuActiveTab = 0;
    await renderVirtualOrgUnified();
  } catch(e) {
    alert('생성 실패: ' + e.message);
  }
}
