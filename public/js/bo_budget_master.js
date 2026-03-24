// ─── Tenant Admin: 예산 기초 관리 (7탭) ──────────────────────────────────────
// Step1:계정마스터CRUD  Step2:조직-계정매핑  Step3:양식빌더(FORM_MASTER)
// Step4:양식접근권한    Step5:양식-예산-계획룰  Step6:공지관리  +가상조직+권한

const BM_TABS = [
  { label: '[Step1] 계정 마스터 관리' },
  { label: '[Step2] 가상조직 템플릿 관리' },
  { label: '[Step3] 양식 및 유형 마스터' },
  { label: '[Step4] 통합 정책 매핑 설정' },
  { label: '[Step5] 신청 양식별 공지 관리' }
];

let _bmActiveTab = 0;


// ─── 실제 인사 조직 트리 (ERP 연동 가정) ─────────────────────────────────────
const REAL_ORG_TREE = {
  general: [
    {
      id: 'RHQ01', name: 'HMGOOOO본부', type: 'hq',
      children: [
        { id: 'RT01', name: '피플OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT02', name: '역량OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT03', name: '성과OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT04', name: '인재OO팀', type: 'team', parentName: 'HMGOOOO본부' },
        { id: 'RT05', name: '교육기획팀', type: 'team', parentName: 'HMGOOOO본부' },
      ]
    },
    {
      id: 'RHQ02', name: 'SDVOOOO본부', type: 'hq',
      children: [
        { id: 'RT06', name: 'SDV기술팀', type: 'team', parentName: 'SDVOOOO본부' },
        { id: 'RT07', name: '아키텍처팀', type: 'team', parentName: 'SDVOOOO본부' },
        { id: 'RT08', name: '플랫폼팀', type: 'team', parentName: 'SDVOOOO본부' },
      ]
    },
  ],
  rnd: [
    {
      id: 'RC01', name: '모빌리티OOOO센터', type: 'center',
      children: [
        { id: 'RT20', name: '내구OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT21', name: '구동OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT22', name: '전장OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
        { id: 'RT23', name: '샤시OO팀', type: 'team', parentName: '모빌리티OOOO센터' },
      ]
    },
    {
      id: 'RC02', name: '전동화OOOO센터', type: 'center',
      children: [
        { id: 'RT24', name: '배터리OO팀', type: 'team', parentName: '전동화OOOO센터' },
        { id: 'RT25', name: '인버터OO팀', type: 'team', parentName: '전동화OOOO센터' },
        { id: 'RT26', name: '충전OO팀', type: 'team', parentName: '전동화OOOO센터' },
      ]
    },
  ]
};

let virtualOrgState = JSON.parse(JSON.stringify(VIRTUAL_ORG));

// ── 상태 변수 ─────────────────────────────────────────────────────────────────
let _baTenantId    = null; // 플랫폼총괄: 선택된 테넌트
let _baGroupId     = null; // 선택된 격리그룹 ID
let _baExpandedAR  = {};   // 결재라인 펼침 상태 { accountCode: bool }

// ─── 진입점: 예산 계정 관리 (+ 결재라인 통합) ────────────────────────────────
function renderBudgetAccount() {
  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  const el = document.getElementById('bo-content');

  // 테넌트 초기값
  if (!_baTenantId) {
    _baTenantId = (role === 'platform_admin')
      ? (tenants[0]?.id || 'HMC')
      : boCurrentPersona.tenantId || 'HMC';
  }
  const tenantName = tenants.find(t => t.id === _baTenantId)?.name || _baTenantId;

  // 격리그룹 목록 (현재 테넌트)
  const groups = typeof ISOLATION_GROUPS !== 'undefined'
    ? ISOLATION_GROUPS.filter(g => g.tenantId === _baTenantId) : [];
  if (!_baGroupId || !groups.find(g => g.id === _baGroupId)) {
    _baGroupId = groups[0]?.id || null;
  }

  // ── 역할별 필터바 ──────────────────────────────────────────────────────────
  const isPlatform = role === 'platform_admin';
  const isTenant   = role === 'tenant_global_admin';
  const isBudget   = role === 'budget_global_admin';

  // 플랫폼총괄: 테넌트 셀렉트 + 격리그룹 셀렉트
  const tenantSelect = isPlatform ? `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#92400E;white-space:nowrap">회사</label>
    <select onchange="_baTenantId=this.value;_baGroupId=null;renderBudgetAccount()"
      style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;
             font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
      ${tenants.map(t => `<option value="${t.id}" ${t.id===_baTenantId?'selected':''}>${t.name}</option>`).join('')}
    </select>
  </div>` : `
  <div style="display:flex;align-items:center;gap:6px">
    <span style="font-size:11px;font-weight:700;color:#374151">🏢</span>
    <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
  </div>`;

  // 격리그룹 셀렉트 (플랫폼·테넌트총괄: 전체 보기 / 예산총괄: 본인 담당만)
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona) || '';
  const visibleGroups = isBudget
    ? groups.filter(g => (g.globalAdminKeys||[]).includes(personaKey))
    : groups;

  const groupSelect = visibleGroups.length > 0 ? `
  <div style="display:flex;align-items:center;gap:6px">
    <label style="font-size:11px;font-weight:700;color:#374151;white-space:nowrap">격리그룹</label>
    <select onchange="_baGroupId=this.value;renderBudgetAccount()"
      style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;
             font-weight:700;background:white;cursor:pointer;min-width:200px">
      ${visibleGroups.map(g => `<option value="${g.id}" ${g.id===_baGroupId?'selected':''}>${g.name}</option>`).join('')}
    </select>
  </div>` : `<span style="font-size:11px;color:#9CA3AF">등록된 격리그룹이 없습니다</span>`;

  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner==='function' ? boIsolationGroupBanner() : ''}
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#1D4ED8;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">예산 계정 관리</span>
      <h1 class="bo-page-title" style="margin:0">예산 계정 관리 · 결재라인 설정</h1>
    </div>
    <p class="bo-page-sub">예산 계정의 속성과 계정별 금액 구간 결재라인을 한 화면에서 관리합니다.</p>
  </div>

  <!-- 역할별 필터바 -->
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;
              background:#F8FAFF;border:1.5px solid #E0E7FF;border-radius:14px;margin-bottom:20px">
    ${tenantSelect}
    <span style="color:#D1D5DB;font-size:16px">|</span>
    ${groupSelect}
    <button onclick="renderBudgetAccount()"
      style="padding:7px 16px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;
             font-size:12px;font-weight:800;cursor:pointer;margin-left:4px">🔍 조회</button>
    ${isPlatform || isTenant ? `<span style="font-size:10px;color:#9CA3AF;margin-left:4px">모든 격리그룹의 계정을 조회할 수 있습니다</span>` : ''}
  </div>

  <!-- 계정 목록 + 결재라인 통합 -->
  <div id="ba-content">${_baRenderContent()}</div>

  <!-- 결재라인 편집 모달 (approval-routing 함수들과 공유) -->
  <div id="ar-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:620px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 id="ar-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">결재라인 편집</h3>
        <button onclick="arCloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="ar-modal-body"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="arCloseModal()">닫기</button>
      </div>
    </div>
  </div>
</div>`;
}

// ── 계정 목록 + 결재라인 통합 렌더 ───────────────────────────────────────────
function _baRenderContent() {
  if (!_baGroupId) {
    return `<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;color:#9CA3AF">
      <div style="font-size:14px;font-weight:700">격리그룹을 선택하세요</div>
    </div>`;
  }
  const group = typeof ISOLATION_GROUPS !== 'undefined'
    ? ISOLATION_GROUPS.find(g => g.id === _baGroupId) : null;
  if (!group) return '<div style="padding:40px;text-align:center;color:#9CA3AF">그룹 정보를 찾을 수 없습니다.</div>';

  const role = boCurrentPersona.role;
  // 플랫폼조잡·테넌트조잡도 계정 추가 가능, 일반 조회용엠 영진만 읽기 전용
  const isViewOnly = false;

  // 해당 격리그룹 소유 계정
  const acctCodes = group.ownedAccounts || [];
  const accounts = typeof ACCOUNT_MASTER !== 'undefined'
    ? ACCOUNT_MASTER.filter(a => acctCodes.includes(a.code) && a.active) : [];
  const systemAccounts = typeof ACCOUNT_MASTER !== 'undefined'
    ? ACCOUNT_MASTER.filter(a => a.isSystem && a.active) : [];
  const allAccounts = [...systemAccounts, ...accounts];

  if (allAccounts.length === 0) {
    return `
<div style="padding:20px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin-bottom:16px;
            display:flex;align-items:center;gap:10px">
  <span style="font-size:18px">🛡️</span>
  <div>
    <div style="font-weight:800;font-size:13px;color:#C2410C">${group.name}</div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${group.id}</div>
  </div>
</div>
<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;color:#9CA3AF;border:1px dashed #D1D5DB">
  <div style="font-size:13px;font-weight:700">이 격리그룹에 등록된 예산 계정이 없습니다</div>
  ${!isViewOnly ? '<div style="font-size:11px;margin-top:6px">위 조회 결과는 ownedAccounts 기준입니다. 계정 등록은 예산총괄 담당자가 진행합니다.</div>' : ''}
</div>`;
  }

  const groupHeader = `
<div style="padding:16px 20px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;
            margin-bottom:16px;display:flex;align-items:center;gap:12px">
  <span style="font-size:22px">🛡️</span>
  <div style="flex:1">
    <div style="font-weight:900;font-size:14px;color:#1D4ED8">${group.name}</div>
    <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${group.id} · ${allAccounts.length}개 계정</div>
  </div>
  ${!isViewOnly ? `<button class="bo-btn-primary bo-btn-sm" onclick="openS1Modal()">+ 계정 신규 등록</button>` : ''}
</div>`;

  const accountCards = allAccounts.map(a => _baRenderAccountCard(a, group, isViewOnly)).join('');
  return groupHeader + accountCards;
}

// ── 계정 카드 (결재라인 인라인 포함) ─────────────────────────────────────────
function _baRenderAccountCard(a, group, isViewOnly) {
  const isSystem = a.isSystem;
  const typeColor = a.group === 'R&D' ? { bg:'#FFF7ED', border:'#FED7AA', text:'#C2410C', badge:'R&D' }
    : { bg:'#EFF6FF', border:'#BFDBFE', text:'#1D4ED8', badge:'일반' };

  // 결재라인 조회 (해당 계정 코드 포함하는 routing)
  const routings = typeof APPROVAL_ROUTING !== 'undefined'
    ? APPROVAL_ROUTING.filter(r => r.tenantId === (group?.tenantId||boCurrentPersona.tenantId) && r.accountCodes.includes(a.code))
    : [];
  const hasRouting = routings.length > 0;
  const expanded = _baExpandedAR[a.code] || false;

  const routingSection = `
<div style="border-top:1px solid #F3F4F6;margin-top:14px;padding-top:12px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${expanded?'10px':'0'}">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-weight:900;color:#D97706">⚡ 결재라인</span>
      ${hasRouting
        ? `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;font-weight:700">${routings.length}개 설정됨</span>`
        : `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:#FEF2F2;color:#EF4444;font-weight:700">⚠️ 미설정</span>`}
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      ${!isViewOnly && !isSystem ? `<button onclick="arOpenNewModalForAccount('${a.code}')"
        style="font-size:10px;padding:3px 10px;border-radius:6px;border:1px solid #FDE68A;
               background:#FFFBEB;color:#D97706;cursor:pointer;font-weight:700">+ 결재라인 추가</button>` : ''}
      ${hasRouting ? `<button onclick="_baToggleAR('${a.code}')"
        style="font-size:10px;padding:3px 10px;border-radius:6px;border:1px solid #E5E7EB;
               background:white;cursor:pointer;font-weight:700;color:#6B7280">
        ${expanded ? '▲ 접기' : '▼ 펼치기'}</button>` : ''}
    </div>
  </div>
  ${expanded && hasRouting ? routings.map(r => `
  <div style="margin-top:8px;padding:12px 14px;background:#FFFBEB;border-radius:10px;border:1px solid #FDE68A">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:12px;font-weight:800;color:#92400E">${r.name}</span>
      ${!isViewOnly ? `<button onclick="arOpenEditModal('${r.id}')"
        style="font-size:10px;padding:3px 8px;border-radius:6px;border:1px solid #FDE68A;
               background:white;color:#D97706;cursor:pointer;font-weight:700">편집</button>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${r.ranges.map((range, i) => `
      <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;
                  background:${i%2===0?'#FFF':'#FEFCE8'};border-radius:7px;border:1px solid #FEF3C7">
        <span style="font-size:10px;font-weight:700;color:#92400E;min-width:140px">${range.label}</span>
        <div style="display:flex;align-items:center;gap:4px;flex:1;flex-wrap:wrap">
          ${range.approvers.map((ap, j) =>
            `<span style="background:#FEF3C7;color:#92400E;padding:3px 10px;border-radius:14px;font-size:11px;font-weight:800">${ap}</span>` +
            (j < range.approvers.length-1 ? '<span style="color:#D97706;font-size:12px">→</span>' : '')
          ).join('')}
        </div>
        <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;flex-shrink:0;
          background:${range.approvers.length===1?'#F0FDF4':range.approvers.length===2?'#FFFBEB':'#FEF2F2'};
          color:${range.approvers.length===1?'#059669':range.approvers.length===2?'#D97706':'#DC2626'}">
          ${range.approvers.length}단계</span>
      </div>`).join('')}
    </div>
  </div>`).join('') : ''}
</div>`;

  return `
<div class="bo-card" style="padding:18px 22px;margin-bottom:12px;
  border-left:4px solid ${isSystem?'#F59E0B':typeColor.border}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
        <code style="background:#F3F4F6;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:900">${a.code}</code>
        ${isSystem ? '<span style="background:#FEF3C7;color:#92400E;font-size:9px;font-weight:800;padding:2px 7px;border-radius:5px">SYSTEM</span>' : ''}
        <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;
          background:${typeColor.bg};color:${typeColor.text};border:1px solid ${typeColor.border}">${typeColor.badge}</span>
        <span style="font-size:13px;font-weight:800;color:#111827">${a.name}</span>
        <span style="font-size:10px;padding:2px 7px;border-radius:5px;font-weight:700;
          background:${a.active?'#D1FAE5':'#F3F4F6'};color:${a.active?'#065F46':'#9CA3AF'}">
          ${a.active?'✅ 활성':'⏸️ 비활성'}</span>
      </div>
      <div style="font-size:11px;color:#6B7280">${a.purpose || a.desc || ''}</div>
      <div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap">
        <span style="font-size:10px;color:#374151">
          📋 사전계획: <strong style="color:${a.planRequired?'#1D4ED8':'#9CA3AF'}">${a.planRequired?'필수':'미적용'}</strong>
        </span>
        <span style="font-size:10px;color:#374151">
          🔄 이월: <strong style="color:${a.carryover?'#059669':'#9CA3AF'}">${a.carryover?'허용':'불허'}</strong>
        </span>
        ${a.manager ? `<span style="font-size:10px;color:#374151">👤 담당: <strong>${a.manager}</strong></span>` : ''}
      </div>
    </div>
    ${!isViewOnly && !isSystem ? `
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="bo-btn-secondary bo-btn-sm" onclick="openS1Modal('${a.code}')">수정</button>
      <button class="bo-btn-secondary bo-btn-sm" onclick="s1ToggleActive('${a.code}')"
        style="color:${a.active?'#F59E0B':'#059669'};border-color:${a.active?'#F59E0B':'#059669'}">
        ${a.active?'비활성화':'활성화'}</button>
    </div>` : ''}
  </div>
  ${routingSection}
</div>`;
}

// ── 결재라인 펼침 토글 ──────────────────────────────────────────────────────
function _baToggleAR(code) {
  _baExpandedAR[code] = !(_baExpandedAR[code] || false);
  document.getElementById('ba-content').innerHTML = _baRenderContent();
}

// ── 특정 계정으로 결재라인 추가 모달 열기 ────────────────────────────────────
function arOpenNewModalForAccount(accountCode) {
  const tenantId = boCurrentPersona.tenantId || (boCurrentPersona.role === 'platform_admin' ? _baTenantId : 'HMC');
  const newId = 'AR' + String(Date.now()).slice(-6);
  const newRouting = {
    id: newId, tenantId,
    name: accountCode + ' 결재라인', accountCodes: [accountCode],
    ranges: [
      { max: 1000000, label: '100만원 미만', approvers: ['팀장 전결'] },
      { max: null,    label: '100만원 이상', approvers: ['팀장', '실장'] },
    ]
  };
  APPROVAL_ROUTING.push(newRouting);
  // 기존 모달 재활용
  const modal = document.getElementById('ar-modal');
  if (modal) {
    document.getElementById('ar-modal-title').textContent = `결재라인 추가 — ${accountCode}`;
    document.getElementById('ar-modal-body').innerHTML = _renderArEditor(newRouting);
    modal.style.display = 'flex';
    // 모달 닫을 때 ba-content 갱신
    modal._onClose = () => { document.getElementById('ba-content').innerHTML = _baRenderContent(); };
  }
}

// ─── 진입점: 메니 4 ─ 예산-조직-양식 정책 설정 ───────────────────────────────
function renderPolicyMapping() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">통합 정책</span>
      <h1 class="bo-page-title" style="margin:0">예산-조직-양식 정책 설정</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">예산 계정 × 가상조직 × 학습유형별 프로세스 흐름과 양식을 한 화면에서 조립합니다</p>
  </div>
  <div id="bm-content">${renderStep3()}</div>
</div>`;
}

// ─── 공통: 법인 세그먼트 ─────────────────────────────────────────────────────
function bmTenantSegment(activeTid, onchangeFn) {
  return `<div class="bo-segment">
    ${TENANTS.map(t => `
    <button class="bo-segment-btn ${activeTid === t.id ? 'active' : ''}"
      onclick="${onchangeFn}('${t.id}')">${t.name}</button>`).join('')}
  </div>`;
}

function bmToggle(checked, onChange, color = '') {
  return `<label class="bo-toggle ${color}" onclick="event.stopPropagation()">
    <input type="checkbox" ${checked ? 'checked' : ''} onchange="${onChange}">
    <span class="bo-toggle-slider"></span>
  </label>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// [Step1] 예산 계정 마스터 직접 CRUD — 테넌트 담당자가 직접 생성/편집
// ═════════════════════════════════════════════════════════════════════════════
let _s1EditCode = null;

function renderStep1() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const accounts = getPersonaAccounts(boCurrentPersona);
  // 시스템 기본 계정(무예산)도 항상 포함
  const systemAccounts = ACCOUNT_MASTER.filter(a => a.isSystem && a.active);
  const allAccounts = [...systemAccounts, ...accounts];
  const tenant = TENANTS.find(t => t.id === tenantId);

  // 계정 소유권(ownedAccounts) 보유 여부 — 오너만 신규 등록/수정 가능
  const isOwner = (boCurrentPersona.ownedAccounts || []).length > 0
                  || (boCurrentPersona.ownedAccounts || [])[0] === '*';
  const isoGroup = boCurrentPersona.isolationGroup || '';
  const isoLabel = isoGroup.includes('RND') ? '🔬 R&D 예산 전용 계정 보기'
                 : isoGroup === 'SYSTEM' ? '🌐 전체 계정 조회'
                 : '📋 일반교육 예산 전용 계정 보기';

  return `
<div>
  <!-- 격리 그룹 안내 배너 -->
  ${tenantId && isoGroup !== 'SYSTEM' ? `
  <div style="margin-bottom:12px;padding:10px 14px;background:${isoGroup.includes('RND') ? '#FFF7ED' : '#EFF6FF'};border:1.5px solid ${isoGroup.includes('RND') ? '#FED7AA' : '#BFDBFE'};border-radius:10px;display:flex;align-items:center;gap:8px">
    <span style="font-size:14px">${isoGroup.includes('RND') ? '🔬' : '🔒'}</span>
    <div>
      <span style="font-size:12px;font-weight:800;color:${isoGroup.includes('RND') ? '#C2410C' : '#1D4ED8'}">${isoLabel}</span>
      <span style="font-size:11px;color:#6B7280;margin-left:8px">격리 그룹: <code style="background:#F3F4F6;padding:1px 6px;border-radius:4px;font-weight:700">${isoGroup}</code></span>
    </div>
    ${!isOwner ? '<span style="margin-left:auto;font-size:11px;color:#9CA3AF;font-weight:600">👁 조회 전용 (오너: 계정 수정 권한 없음)</span>' : ''}
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="width:10px;height:10px;background:${tenant?.color};border-radius:50%;display:inline-block"></span>
      <span style="font-weight:800;font-size:14px;color:#111827">${tenant?.name}</span>
      <span class="bo-badge bo-badge-blue">${accounts.length}개 계정</span>
      <span class="bo-badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FDE68A">+ 시스템 기본 ${systemAccounts.length}개</span>
    </div>
    ${isOwner
      ? '<button class="bo-btn-primary bo-btn-sm" onclick="openS1Modal()">+ 계정 신규 등록</button>'
      : '<span style="font-size:11px;color:#9CA3AF;font-weight:600;padding:6px 12px;border:1.5px dashed #E5E7EB;border-radius:8px">🔒 계정 등록은 오너만 가능</span>'}
  </div>
  <div class="bo-card" style="overflow:hidden">
    <table class="bo-table">
      <thead><tr>
        <th>계정코드</th><th>구분</th><th>계정명</th>
        <th style="text-align:center">사전계획 필수
          <div style="font-size:10px;color:#1D4ED8;font-weight:600">선택적 연동</div></th>
        <th style="text-align:center">이월 허용</th>
        <th>용도 설명</th><th>담당자</th><th>상태</th><th>관리</th>
      </tr></thead>
      <tbody>
        ${allAccounts.map(a => {
          const planToggle = a.isSystem
            ? '<span style="font-size:11px;color:#9CA3AF">해당없음</span>'
            : bmToggle(a.planRequired, `s1ToggleField('${a.code}','planRequired')`, 'blue')
              + `<div style="font-size:10px;margin-top:2px;color:${a.planRequired ? '#1D4ED8' : '#9CA3AF'}">${a.planRequired ? '✅ 계획 필수' : '❌ 계획 불필요'}</div>`;
          const carryToggle = a.isSystem
            ? '<span style="font-size:11px;color:#9CA3AF">-</span>'
            : bmToggle(a.carryover, `s1ToggleField('${a.code}','carryover')`, 'green');
          const managerHtml = a.isSystem
            ? '<span style="font-size:11px;color:#9CA3AF">플랫폼 제공</span>'
            : `<div style="font-size:12px;font-weight:700">${a.manager || '미지정'}</div>${a.subManager ? `<div style="font-size:11px;color:#6B7280">부: ${a.subManager}</div>` : ''}`;
          const ctrlHtml = a.isSystem
            ? '<span style="font-size:11px;color:#9CA3AF;padding:4px 8px">🔒 수정불가</span>'
            : `<div style="display:flex;gap:6px">
                 <button class="bo-btn-secondary bo-btn-sm" onclick="openS1Modal('${a.code}')">수정</button>
                 <button class="bo-btn-secondary bo-btn-sm" onclick="s1ToggleActive('${a.code}')"
                   style="color:${a.active ? '#F59E0B' : '#059669'};border-color:${a.active ? '#F59E0B' : '#059669'}">
                   ${a.active ? '비활성화' : '활성화'}
                 </button>
               </div>`;
          const groupBadge = a.isSystem
            ? '<span class="bo-badge" style="background:#F3F4F6;color:#6B7280">공통</span>'
            : boGroupBadge(a.group === 'R&D' ? 'rnd' : 'general');
          return `
        <tr style="${a.isSystem ? 'background:#FFFBEB;' : ''}">
          <td>
            <code style="background:#F3F4F6;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${a.code}</code>
            ${a.isSystem ? '<span style="margin-left:4px;background:#FEF3C7;color:#92400E;font-size:10px;font-weight:800;padding:1px 6px;border-radius:4px">SYSTEM</span>' : ''}
          </td>
          <td>${groupBadge}</td>
          <td style="font-weight:700">${a.name}</td>
          <td style="text-align:center">${planToggle}</td>
          <td style="text-align:center">${carryToggle}</td>
          <td style="font-size:12px;color:#6B7280">${a.desc || ''}</td>
          <td>${managerHtml}</td>
          <td><span class="bo-badge ${a.active ? 'bo-badge-green' : 'bo-badge-gray'}">${a.active ? '활성' : '비활성'}</span></td>
          <td>${ctrlHtml}</td>
        </tr>`;
        }).join('')}

      </tbody>
    </table>
  </div>
  <div class="bo-card" style="padding:14px 20px;margin-top:12px;background:#FFFBEB;border-color:#FDE68A">
    <span style="font-size:12px;font-weight:700;color:#92400E">
      🔒 <strong>[공통-무예산/자비수강]</strong>은 플랫폼이 기본 제공하는 시스템 계정입니다. 예산 집행 없이 학습이력만 등록할 수 있으며, 수정·삭제가 불가합니다.
    </span>
  </div>
  <div class="bo-card" style="padding:14px 20px;margin-top:12px;background:#EFF6FF;border-color:#BFDBFE">
    <span style="font-size:12px;font-weight:700;color:#1E40AF">
      💡 <strong>[사전계획 필수 ON]</strong>: 이 계정은 향후 [Step4] 통합 정책에서 양식 연결 시, 사전에 승인받은 교육계획서를 반드시 연동해야만 신청이 가능해집니다.
    </span>
  </div>
</div>

<!-- 계정 등록/수정 모달 -->
<div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
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

function _s1ModalBody(code) {
  const a = code ? ACCOUNT_MASTER.find(x => x.code === code) : null;
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const inp = (id, ph, val = '') => `<input id="${id}" type="text" placeholder="${ph}" value="${val}"
    style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">`;
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정코드 *</label>
      ${inp('s1-code', '예) HMG-OPS', a?.code || tenantId + '-')}
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">구분</label>
      <select id="s1-group" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        <option value="일반" ${a?.group === '일반' ? 'selected' : ''}>일반</option>
        <option value="R&D" ${a?.group === 'R&D' ? 'selected' : ''}>R&D</option>
      </select>
    </div>
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정명 *</label>
    ${inp('s1-name', '예) 일반-운영계정', a?.name || '')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">총괄 담당자</label>
      ${inp('s1-manager', '예) 홍길동', a?.manager || '')}
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">부담당자</label>
      ${inp('s1-submanager', '예) 김철수', a?.subManager || '')}
    </div>
  </div>
  <div style="margin-bottom:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">용도 설명</label>
    ${inp('s1-desc', '예) 사내 집합/이러닝 운영비', a?.desc || '')}
  </div>
  <div style="display:flex;gap:24px">
    <label class="bo-toggle-wrap" style="gap:10px">
      <label class="bo-toggle blue"><input type="checkbox" id="s1-plan" ${a?.planRequired !== false ? 'checked' : ''}><span class="bo-toggle-slider"></span></label>
      <div>
        <div style="font-size:12px;font-weight:800;color:#374151">사전계획 필수</div>
        <div style="font-size:10px;color:#9CA3AF">ON: 신청 전 교육계획서 제출 강제</div>
      </div>
    </label>
    <label class="bo-toggle-wrap" style="gap:10px">
      <label class="bo-toggle green"><input type="checkbox" id="s1-carry" ${a?.carryover ? 'checked' : ''}><span class="bo-toggle-slider"></span></label>
      <div>
        <div style="font-size:12px;font-weight:800;color:#374151">이월 허용</div>
        <div style="font-size:10px;color:#9CA3AF">연말 잔액 익년도 이월</div>
      </div>
    </label>
  </div>`;
}

function openS1Modal(code) {
  _s1EditCode = code || null;
  document.getElementById('s1-modal-title').textContent = code ? '계정 수정' : '예산 계정 신규 등록';
  document.getElementById('s1-modal-body').innerHTML = _s1ModalBody(code);
  document.getElementById('s1-modal').style.display = 'flex';
}

function s1CloseModal() { document.getElementById('s1-modal').style.display = 'none'; }

function s1ToggleField(code, field) {
  const a = ACCOUNT_MASTER.find(x => x.code === code);
  if (a) a[field] = !a[field];
  document.getElementById('bm-content').innerHTML = renderStep1();
}

function s1ToggleActive(code) {
  const a = ACCOUNT_MASTER.find(x => x.code === code);
  if (a) a.active = !a.active;
  document.getElementById('bm-content').innerHTML = renderStep1();
}

function s1SaveAccount() {
  // platform_admin은 _baTenantId, 나머지는 persona.tenantId
  const role = boCurrentPersona.role;
  const tenantId = (role === 'platform_admin')
    ? (_baTenantId || 'HMC')
    : (boCurrentPersona.tenantId || _baTenantId || 'HMC');
  const code = document.getElementById('s1-code').value.trim();
  const name = document.getElementById('s1-name').value.trim();
  if (!code || !name) { alert('코드와 계정명은 필수입니다.'); return; }
  const obj = {
    code, name, tenantId,
    group: document.getElementById('s1-group').value,
    desc: document.getElementById('s1-desc').value.trim(),
    manager: document.getElementById('s1-manager').value.trim(),
    subManager: document.getElementById('s1-submanager').value.trim(),
    planRequired: document.getElementById('s1-plan').checked,
    carryover: document.getElementById('s1-carry').checked,
    active: true
  };
  if (_s1EditCode) {
    const idx = ACCOUNT_MASTER.findIndex(x => x.code === _s1EditCode);
    if (idx > -1) ACCOUNT_MASTER[idx] = { ...ACCOUNT_MASTER[idx], ...obj };
  } else {
    if (ACCOUNT_MASTER.find(x => x.code === code)) { alert('이미 존재하는 코드입니다.'); return; }
    ACCOUNT_MASTER.push(obj);
    // 현재 선택된 격리그룹의 ownedAccounts에 자동 연결
    if (_baGroupId && typeof ISOLATION_GROUPS !== 'undefined') {
      const grp = ISOLATION_GROUPS.find(g => g.id === _baGroupId);
      if (grp && !grp.ownedAccounts.includes(code)) {
        grp.ownedAccounts.push(code);
      }
    }
  }
  s1CloseModal();
  document.getElementById('bm-content').innerHTML = renderStep1();
}



// ═════════════════════════════════════════════════════════════════════════════
// [Step2] 조직별 예산 계정 매핑
// ═════════════════════════════════════════════════════════════════════════════
let _s2OrgTenant = 'HMG';
let _s2SelAccount = null; // 좌측에서 선택한 계정 코드

// 조직-계정 매핑 상태: { tenantId_accountCode: Set of virtualGroupIds }
let ORG_ACCOUNT_MAP = {
  'HMG_GEN-OPS': new Set(['HQ01', 'HQ02']),
  'HMG_GEN-PART': new Set(['HQ01', 'HQ02']),
  'HMG_GEN-ETC': new Set(['HQ01', 'HQ02']),
  'HMG_RND-INT': new Set(['C01', 'C02']),
  'KIA_GEN-OPS': new Set(['HQ01']),
};

function renderStep2OrgMap() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const accounts = getPersonaAccounts(boCurrentPersona);
  if (!_s2SelAccount || !accounts.find(a => a.code === _s2SelAccount)) {
    _s2SelAccount = accounts[0]?.code || null;
  }
  const mapKey = `${tenantId}_${_s2SelAccount}`;
  const mappedOrgIds = ORG_ACCOUNT_MAP[mapKey] || new Set();
  const selAcc = accounts.find(a => a.code === _s2SelAccount);

  // 가상 조직 목록
  const allGroups = [
    ...virtualOrgState.general.hqs.map(h => ({ id: h.id, name: h.name, type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' })),
    ...virtualOrgState.rnd.centers.map(c => ({ id: c.id, name: c.name, type: 'R&D센터', icon: '🔬', color: '#6D28D9', bg: '#F5F3FF' }))
  ];

  return `
<div>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
    <div class="bo-card" style="padding:10px 14px;flex:1;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">📌</span>
      <span style="font-size:12px;color:#374151">
        <strong>좌측</strong>에서 계정을 선택하고, <strong>우측</strong>에서 이 계정을 사용할 가상 조직을 체크합니다.
      </span>
    </div>
  </div>
  <div class="bo-split">
    <!-- 좌: 계정 목록 -->
    <div class="bo-split-left">
      <div style="padding:10px 16px;font-size:10px;font-weight:900;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #F3F4F6">
        할당된 계정
      </div>
      ${accounts.map(a => `
      <div class="bo-split-item ${_s2SelAccount === a.code ? 'active' : ''}"
           onclick="s2OrgSelAccount('${a.code}')">
        <div style="font-weight:700">${a.name}</div>
        <div style="font-size:11px;margin-top:2px;opacity:.7">
          <code>${a.code}</code> · ${a.planRequired ? '계획필수' : '계획불필요'}
        </div>
        <div style="font-size:11px;margin-top:2px;opacity:.6">
          ${(ORG_ACCOUNT_MAP[`${tenantId}_${a.code}`] || new Set()).size}개 조직 매핑됨
        </div>
      </div>`).join('')}
    </div>

    <!-- 우: 가상 조직 체크박스 -->
    <div class="bo-split-right">
      ${selAcc ? `
      <div style="margin-bottom:14px;padding:12px 16px;background:#F9FBFF;border-radius:10px;border:1.5px solid #BFDBFE">
        <div style="font-weight:800;color:#1E40AF;font-size:13px">${selAcc.name} <code style="font-size:11px;background:#DBEAFE;padding:1px 6px;border-radius:4px">${selAcc.code}</code></div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">아래 조직들이 이 계정을 사용할 수 있습니다</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${allGroups.map(g => {
    const checked = mappedOrgIds.has(g.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;
                        border:1.5px solid ${checked ? g.color + '40' : '#F3F4F6'};
                        background:${checked ? g.bg : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="s2OrgToggleMap('${tenantId}','${_s2SelAccount}','${g.id}',this.checked)"
              style="width:16px;height:16px;accent-color:${g.color}">
            <span style="font-size:15px">${g.icon}</span>
            <div>
              <div style="font-weight:700;font-size:13px;color:${checked ? g.color : '#374151'}">${g.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${g.type}</div>
            </div>
          </label>`;
  }).join('')}
      </div>` : '<div style="padding:24px;text-align:center;color:#9CA3AF">좌측에서 계정을 선택하세요</div>'}
    </div>
  </div>
  <div class="bo-card" style="padding:12px 18px;margin-top:12px;background:#ECFDF5;border-color:#A7F3D0">
    <span style="font-size:12px;font-weight:700;color:#065F46">
      ✅ 여기서 매핑된 조직만 [Step4] 양식·예산 정책 설정에서 룰을 만들 수 있습니다.
    </span>
  </div>
</div>`;
}

function s2OrgSelAccount(code) {
  _s2SelAccount = code;
  document.getElementById('bm-content').innerHTML = renderStep2OrgMap();
}

function s2OrgToggleMap(tenantId, accountCode, groupId, active) {
  const key = `${tenantId}_${accountCode}`;
  if (!ORG_ACCOUNT_MAP[key]) ORG_ACCOUNT_MAP[key] = new Set();
  if (active) ORG_ACCOUNT_MAP[key].add(groupId);
  else ORG_ACCOUNT_MAP[key].delete(groupId);
  document.getElementById('bm-content').innerHTML = renderStep2OrgMap();
}

// ═════════════════════════════════════════════════════════════════════════════
// [Step4] 조직별 신청 양식 접근 권한
// ═════════════════════════════════════════════════════════════════════════════
let _s2Tenant = 'HMG';
let _s4SelGroupId = null;

function _s2GetGroups(tid) {
  const all = [];
  virtualOrgState.general.hqs.forEach(h => all.push({ id: h.id, name: h.name, type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' }));
  virtualOrgState.rnd.centers.forEach(c => all.push({ id: c.id, name: c.name, type: 'R&D센터', icon: '🔬', color: '#6D28D9', bg: '#F5F3FF' }));
  if (tid === 'KIA') return [
    { id: 'HQ01', name: '기아 생산본부', type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' },
    { id: 'HQ02', name: '기아 사무직본부', type: '일반본부', icon: '🏢', color: '#1E40AF', bg: '#EFF6FF' }
  ];
  return all;
}

function renderStep2() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  _s2Tenant = tenantId;
  const groups = _s2GetGroups(tenantId);
  const applyForms = getTenantForms(tenantId, 'apply');
  const planForms = getTenantForms(tenantId, 'plan');
  const allForms = [...planForms, ...applyForms];

  if (!_s4SelGroupId || !groups.find(g => g.id === _s4SelGroupId)) {
    _s4SelGroupId = groups[0]?.id || null;
  }
  const selGroup = groups.find(g => g.id === _s4SelGroupId);
  const mapKey = `${tenantId}_${_s4SelGroupId}`;
  const rule = FORM_ACCESS_RULES[mapKey] || { formIds: [] };

  return `
<div>
  <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:16px">
    <div class="bo-card" style="padding:10px 14px;flex:1;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">📌</span>
      <span style="font-size:12px;color:#374151">
        <strong>좌측</strong>에서 가상 조직을 선택하고, <strong>우측</strong>에서 해당 조직에 노출할 신청 양식을 체크합니다.
      </span>
    </div>
  </div>
  <div class="bo-split">
    <!-- 좌: 조직 목록 -->
    <div class="bo-split-left">
      <div style="padding:10px 16px;font-size:10px;font-weight:900;color:#9CA3AF;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #F3F4F6">가상 조직</div>
      ${groups.map(g => {
    const gKey = `${tenantId}_${g.id}`;
    const gRule = FORM_ACCESS_RULES[gKey] || { formIds: [] };
    const cnt = gRule.formIds.length;
    return `
        <div class="bo-split-item ${_s4SelGroupId === g.id ? 'active' : ''}"
             onclick="s4SelGroup('${g.id}')">
          <div style="display:flex;align-items:center;gap:6px">
            <span>${g.icon}</span>
            <span style="font-weight:700">${g.name}</span>
          </div>
          <div style="font-size:11px;margin-top:2px;opacity:.7">${g.type}</div>
          <div style="font-size:11px;margin-top:2px;opacity:.6">${cnt}개 양식 노출 중</div>
        </div>`;
  }).join('')}
    </div>
    <!-- 우: 양식 체크박스 -->
    <div class="bo-split-right">
      ${selGroup ? `
      <div style="margin-bottom:14px;padding:12px 16px;background:#F9FBFF;border-radius:10px;border:1.5px solid #BFDBFE">
        <div style="font-weight:800;color:#1E40AF;font-size:13px">${selGroup.icon} ${selGroup.name}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">이 조직의 학습자 화면에 노출할 양식을 선택하세요</div>
      </div>
      ${allForms.length === 0 ? `<div style="text-align:center;padding:32px;color:#9CA3AF">Step3에서 양식을 먼저 생성해 주세요.</div>` : `
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#7C3AED">📋 교육계획 양식</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
        ${planForms.map(f => {
    const checked = rule.formIds.includes(f.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
                        border:1.5px solid ${checked ? '#7C3AED40' : '#F3F4F6'};
                        background:${checked ? '#F5F3FF' : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''}
              onchange="s4ToggleForm('${tenantId}','${_s4SelGroupId}','${f.id}',this.checked)"
              style="width:16px;height:16px;accent-color:#7C3AED">
            <div>
              <div style="font-weight:700;font-size:12px;color:${checked ? '#7C3AED' : '#374151'}">${f.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${f.desc || ''}</div>
            </div>
          </label>`;
  }).join('')}
      </div>
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#059669">📄 교육신청 양식</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${applyForms.map(f => {
    const checked = rule.formIds.includes(f.id);
    return `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;
                        border:1.5px solid ${checked ? '#05966940' : '#F3F4F6'};
                        background:${checked ? '#F0FDF4' : '#FAFAFA'};cursor:pointer;transition:all .15s">
            <input type="checkbox" ${checked ? 'checked' : ''}
              onchange="s4ToggleForm('${tenantId}','${_s4SelGroupId}','${f.id}',this.checked)"
              style="width:16px;height:16px;accent-color:#059669">
            <div>
              <div style="font-weight:700;font-size:12px;color:${checked ? '#059669' : '#374151'}">${f.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${f.desc || ''}</div>
            </div>
          </label>`;
  }).join('')}
      </div>`}
      ` : '<div style="padding:24px;text-align:center;color:#9CA3AF">좌측에서 조직을 선택하세요</div>'}
    </div>
  </div>
  <div class="bo-card" style="padding:12px 18px;margin-top:12px;background:#ECFDF5;border-color:#A7F3D0">
    <span style="font-size:12px;font-weight:700;color:#065F46">
      ✅ 여기서 노출 허가된 양식만 Front(LXP) 학습자 화면의 신청 버튼에 표시됩니다.
    </span>
  </div>
</div>`;
}

function s4SelGroup(groupId) {
  _s4SelGroupId = groupId;
  document.getElementById('bm-content').innerHTML = renderStep2();
}

function s4ToggleForm(tenantId, groupId, formId, active) {
  const key = `${tenantId}_${groupId}`;
  if (!FORM_ACCESS_RULES[key]) FORM_ACCESS_RULES[key] = { formIds: [] };
  const ids = FORM_ACCESS_RULES[key].formIds;
  const idx = ids.indexOf(formId);
  if (active && idx === -1) ids.push(formId);
  else if (!active && idx > -1) ids.splice(idx, 1);
  document.getElementById('bm-content').innerHTML = renderStep2();
}
// [2.3] ?덉궛-議곗쭅-?묒떇 ?듯빀 留ㅽ븨 猷?鍮뚮뜑 (Top-down)

// [2.3] 예산-조직-양식 통합 매핑 룰 빌더 (Top-down)
// =============================================================================
let _s3Tenant = 'HMG';
let _s3EditingRuleId = null;

function renderStep3() {
    const tenantId = boCurrentPersona.tenantId || _s3Tenant;
    _s3Tenant = tenantId;
    const rules = FORM_BUDGET_RULES.filter(r => r.tenantId === tenantId);
    const accounts = getPersonaAccounts(boCurrentPersona);
    const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;

    // 예산 단위로 그룹핑
    const accGrouped = {};
    rules.forEach(r => {
        if (!accGrouped[r.accountCode]) accGrouped[r.accountCode] = [];
        accGrouped[r.accountCode].push(r);
    });

    const ruleCards = Object.keys(accGrouped).map(code => {
        const acc = accounts.find(a => a.code === code);
        if (!acc) return '';
        const accCards = accGrouped[code].map(r => {
            const tpl = VIRTUAL_ORG_TEMPLATES.find(t => t.id === r.templateId) || { name: r.templateId || '전체(미지정)' };
            const applyForm = r.formId ? (FORM_MASTER.find(f => f.id === r.formId) || { name: r.formId }) : null;
            const planForm = r.planFormId ? FORM_MASTER.find(f => f.id === r.planFormId) : null;
            const resultForm = r.resultFormId ? FORM_MASTER.find(f => f.id === r.resultFormId) : null;

            // 프로세스 흐름 배지
            const flowConfig = {
              'plan-apply-result': { label: '계획 ➡️ 신청 ➡️ 결과', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
              'apply-result':      { label: '신청 ➡️ 결과', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
              'result-only':       { label: '결과 단독', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' }
            };
            const flow = flowConfig[r.processFlow] || flowConfig['apply-result'];
            const flowBadge = `<span style="background:${flow.bg};color:${flow.color};border:1px solid ${flow.border};font-size:11px;font-weight:800;padding:2px 10px;border-radius:20px">${flow.label}</span>`;

            const ltHtml = r.learningTypes && r.learningTypes.length ? r.learningTypes.map(lt =>
                `<span style="background:#F5F3FF;color:#6D28D9;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">${lt}</span>`
            ).join('') : '<span style="font-size:11px;color:#9CA3AF">모든 유형</span>';

            // 양식 섹션 (프로세스 흐름에 따라)
            let formSection = '';
            if (r.processFlow === 'plan-apply-result' && planForm) {
              formSection += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:11px;font-weight:700;color:#7C3AED">📋 계획폼:</span>
                <span style="background:#F5F3FF;color:#7C3AED;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${planForm.name}</span>
                ${r.multiPlanAllowed ? '<span style="background:#ECFDF5;color:#059669;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800">복수 계획 허용</span>' : ''}
              </div>`;
            }
            if (applyForm && r.processFlow !== 'result-only') {
              formSection += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                <span style="font-size:11px;font-weight:700;color:#059669">📄 신청폼:</span>
                <span style="background:#F0FDF4;color:#059669;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${applyForm.name}</span>
              </div>`;
            }
            if (resultForm) {
              formSection += `<div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;font-weight:700;color:#D97706">📝 결과폼:</span>
                <span style="background:#FFFBEB;color:#D97706;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${resultForm.name}</span>
              </div>`;
            }

            return `<div style="padding:12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px;background:#fff">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
              ${flowBadge}
              <span class="bo-rule-label if-label" style="background:#FCE7F3;color:#BE185D">템플릿</span>
              <span style="font-size:13px;font-weight:700;color:#111827">${tpl.name}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px;padding:8px 12px;background:#F9FAFB;border-radius:8px">
              ${formSection || '<span style="font-size:11px;color:#9CA3AF">양식 미연결</span>'}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:12px;color:#6B7280;font-weight:600">허용 학습유형:</span>
              ${ltHtml}
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="openEditRuleModal('${r.id}')" style="border:1.5px dashed #D1D5DB;background:none;border-radius:8px;padding:4px 10px;font-size:12px;color:#9CA3AF;cursor:pointer">✏️ 편집</button>
            <button onclick="s3DeleteRule('${r.id}')" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:16px;padding:4px">🗑️</button>
          </div>
        </div>
      </div>`;
        }).join('');

        return `
    <div class="bo-rule-card" style="margin-bottom:14px;padding:20px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid #F3F4F6">
        <span style="font-size:16px">💳</span>
        <span style="font-size:15px;font-weight:800;color:#1E40AF">${acc.name}</span>
        <code style="background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${acc.code}</code>
        <span style="font-size:11px;color:#6B7280;margin-left:auto">${acc.planRequired ? '사전계획 필수' : '계획 불필요'} 계정</span>
      </div>
      ${accCards}
    </div>`;
    }).join('');

    const modalHtml = `
  <div id="s3-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div class="fade-in" style="background:#fff;border-radius:16px;width:600px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 id="s3-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">정책 매핑 상세 설정</h3>
        <button onclick="s3CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="s3-modal-body"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:24px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="s3CloseModal()">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="s3SaveRule()">저장</button>
      </div>
    </div>
  </div>`;

    return `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:13px;font-weight:800;color:#111827">${tenantName} — 예산 ↔ 가상조직 템플릿 ↔ 양식/학습유형 통합 매핑 (Top-down)</div>
        <div style="font-size:12px;color:#6B7280">${rules.length}개의 통합 매핑 정책이 설정됨</div>
      </div>
      <button class="bo-btn-primary bo-btn-sm" onclick="openAddRuleModal()">+ 새 매핑 정책 추가</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">${ruleCards || '<div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">설정된 매핑 정책이 없습니다.</div>'}</div>
  </div>${modalHtml}`;
}
function s3ChangeTenant(tid) { _s3Tenant = tid; document.getElementById('bm-content').innerHTML = renderStep3(); }

function s3ToggleBudgetRequired(ruleId) {
    const r = FORM_BUDGET_RULES.find(x => x.id === ruleId);
    if (r) r.budgetRequired = !r.budgetRequired;
    document.getElementById('bm-content').innerHTML = renderStep3();
}

function s3DeleteRule(ruleId) {
    if (!confirm('이 정책을 삭제하시겠습니까?')) return;
    const idx = FORM_BUDGET_RULES.findIndex(x => x.id === ruleId);
    if (idx > -1) FORM_BUDGET_RULES.splice(idx, 1);
    document.getElementById('bm-content').innerHTML = renderStep3();
}

function _s3ModalBody(rule) {
    const tenantId = boCurrentPersona.tenantId || _s3Tenant;
    const templates = VIRTUAL_ORG_TEMPLATES.filter(t => t.tenantId === tenantId);
    const accounts = getPersonaAccounts(boCurrentPersona);
    const applyForms = getTenantForms(tenantId, 'apply');
    const planForms = getTenantForms(tenantId, 'plan');
    const resultForms = getTenantForms(tenantId, 'result');

    const accVal = rule?.accountCode || '';
    const tplVal = rule?.templateId || '';
    const fVal = rule?.formId || '';
    const planFmVal = rule?.planFormId || '';
    const resultFmVal = rule?.resultFormId || '';
    const flowVal = rule?.processFlow || 'apply-result';
    const selLt = rule?.learningTypes || [];
    const multi = rule?.multiPlanAllowed || false;

    const selAcc = accounts.find(a => a.code === accVal);
    const planReq = selAcc?.planRequired || false;

    const ltHtml = LEARNING_TYPES.map(cat => `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">${cat.category}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${cat.items.map(item => `
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer">
          <input type="checkbox" class="s3-lt-cb" value="${item}" ${selLt.includes(item) ? 'checked' : ''} style="accent-color:#6D28D9;margin:0"> ${item}
        </label>`).join('')}
      </div>
    </div>
  `).join('');

    // 각 계정 옵션: 시스템 계정 포함
    const allAccounts = [...ACCOUNT_MASTER.filter(a => a.isSystem && a.active), ...accounts];

    const flowOptions = [
      { val: 'plan-apply-result', label: '📋 계획 ➡️ 신청 ➡️ 결과 (3단계)', desc: 'R&D 예산 등 사전 계획 필수 계정에 적용' },
      { val: 'apply-result',      label: '📄 신청 ➡️ 결과 (2단계)',       desc: '일반 참가/운영계정 등 계획 불필요 계정에 적용' },
      { val: 'result-only',       label: '📝 결과 단독 (1단계)',           desc: '무예산/자비 학습 이력 등록에만 사용' }
    ];

    return `
  <div style="margin-bottom:14px;padding:12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#1E40AF;display:block;margin-bottom:5px">1. 예산 선택 (Budget)</label>
    <select id="s3-account" onchange="s3UpdateModalDynamic()" style="width:100%;padding:9px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;background:#EFF6FF;font-weight:700;outline:none">
      <option value="">— 예산 계정 선택 —</option>
      ${allAccounts.map(a => `<option value="${a.code}" ${accVal === a.code ? 'selected' : ''} data-plan="${a.planRequired}">${a.name} (${a.code}) - ${a.isSystem ? '시스템 기본' : (a.planRequired ? '계획 필수' : '계획 불필요')}</option>`).join('')}
    </select>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">2. 대상 조직 템플릿 통째 연결 (Virtual Org Template)</label>
    <select id="s3-template" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
      <option value="">— 매핑할 가상조직 템플릿 선택 —</option>
      ${templates.map(t => `<option value="${t.id}" ${tplVal === t.id ? 'selected' : ''}>🧩 ${t.name}</option>`).join('')}
    </select>
    <p style="font-size:11px;color:#6B7280;margin:6px 0 0">선택한 템플릿에 속한 모든 하위 본부/팀에 권한이 부여됩니다.</p>
  </div>

  <!-- Step 3: 프로세스 흐름 선택 -->
  <div style="margin-bottom:14px;padding:12px;background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#5B21B6;display:block;margin-bottom:10px">3. 프로세스 흐름 선택 ⭐ (핵심)</label>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${flowOptions.map(opt => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:10px;
                    background:${flowVal === opt.val ? '#EDE9FE' : '#fff'};
                    border:1.5px solid ${flowVal === opt.val ? '#8B5CF6' : '#E5E7EB'};
                    cursor:pointer;transition:all .15s" onclick="s3SelectFlow('${opt.val}')">
        <input type="radio" name="s3-flow" value="${opt.val}" ${flowVal === opt.val ? 'checked' : ''}
               style="accent-color:#7C3AED;margin-top:2px;flex-shrink:0">
        <div>
          <div style="font-weight:800;font-size:12px;color:${flowVal === opt.val ? '#5B21B6' : '#374151'}">${opt.label}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${opt.desc}</div>
        </div>
      </label>`).join('')}
    </div>
  </div>

  <!-- Step 3-1: 양식 설정 -->
  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">4. 양식 매핑 (Forms)</label>

    <div id="s3-plan-div" style="display:${planReq || flowVal === 'plan-apply-result' ? 'block' : 'none'};background:#F5F3FF;padding:10px;border-radius:8px;border:1px solid #DDD6FE;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:#5B21B6;margin-bottom:4px;display:block">📋 계획 양식 (계획 단계 진입점)</span>
      <select id="s3-plan-form" style="width:100%;padding:9px 12px;border:1.5px solid #C4B5FD;border-radius:8px;font-size:13px;background:#fff;margin-bottom:8px;outline:none">
        <option value="">— 계획 양식 선택 —</option>
        ${planForms.map(f => `<option value="${f.id}" ${planFmVal === f.id ? 'selected' : ''}>📋 ${f.name}</option>`).join('')}
      </select>
      <label class="bo-toggle-wrap" style="gap:10px;cursor:pointer">
        <label class="bo-toggle green" style="pointer-events:none"><input type="checkbox" id="s3-multi" ${multi ? 'checked' : ''}><span class="bo-toggle-slider" style="pointer-events:all"></span></label>
        <div>
          <div style="font-size:11px;font-weight:700;color:#059669">복수 교육계획 선택 허용 (Multi-select)</div>
          <div style="font-size:10px;color:#6B7280">담당자가 여러 승인된 계획을 합쳐 신청할 때 사용</div>
        </div>
      </label>
    </div>

    <div id="s3-apply-div" style="display:${flowVal !== 'result-only' ? 'block' : 'none'};margin-bottom:8px">
      <span style="font-size:11px;color:#6B7280;margin-bottom:2px;display:block">📄 신청 양식 (신청 단계 진입점)</span>
      <select id="s3-apply-form" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
        <option value="">— 신청 양식 선택 —</option>
        ${applyForms.map(f => `<option value="${f.id}" ${fVal === f.id ? 'selected' : ''}>📄 ${f.name}</option>`).join('')}
      </select>
    </div>

    <div>
      <span style="font-size:11px;color:#D97706;margin-bottom:2px;font-weight:700;display:block">📝 결과 양식 (결과 등록 단계)</span>
      <select id="s3-result-form" style="width:100%;padding:9px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px;background:#FFFBEB;outline:none">
        <option value="">— 결과 양식 선택 —</option>
        ${resultForms.map(f => `<option value="${f.id}" ${resultFmVal === f.id ? 'selected' : ''}>📝 ${f.name}</option>`).join('')}
      </select>
    </div>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:8px">5. 허용 학습유형 제어 (Learning Types)</label>
    <div style="font-size:11px;color:#6B7280;margin-bottom:10px">이 정책 하에서 허용할 세부 교육 항목을 체크해 주세요.</div>
    <div style="padding:12px;background:#fff;border:1px solid #E5E7EB;border-radius:8px">
      ${ltHtml}
    </div>
  </div>`;
}

function s3UpdateModalDynamic() {
    const accSelect = document.getElementById('s3-account');
    const opt = accSelect.options[accSelect.selectedIndex];
    const isPlanReq = opt && opt.dataset.plan === 'true';
    const flowRadio = document.querySelector('input[name="s3-flow"]:checked');
    const flow = flowRadio ? flowRadio.value : 'apply-result';
    const planDiv = document.getElementById('s3-plan-div');
    const applyDiv = document.getElementById('s3-apply-div');
    if (planDiv) planDiv.style.display = (isPlanReq || flow === 'plan-apply-result') ? 'block' : 'none';
    if (applyDiv) applyDiv.style.display = flow !== 'result-only' ? 'block' : 'none';
}

function s3SelectFlow(val) {
    document.querySelectorAll('input[name="s3-flow"]').forEach(r => r.checked = (r.value === val));
    s3UpdateModalDynamic();
    // 라디오 레이블 스타일 업데이트
    document.querySelectorAll('label[onclick^="s3SelectFlow"]').forEach(lbl => {
        const isSelected = lbl.getAttribute('onclick') === `s3SelectFlow('${val}')`;
        lbl.style.background = isSelected ? '#EDE9FE' : '#fff';
        lbl.style.borderColor = isSelected ? '#8B5CF6' : '#E5E7EB';
    });
}

function openAddRuleModal() {
    _s3EditingRuleId = null;
    document.getElementById('s3-modal-title').textContent = '새 매핑 정책 추가';
    document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(null);
    const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function openEditRuleModal(ruleId) {
    _s3EditingRuleId = ruleId;
    const rule = FORM_BUDGET_RULES.find(r => r.id === ruleId);
    document.getElementById('s3-modal-title').textContent = '매핑 정책 편집';
    document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(rule);
    const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function s3SaveRule() {
    const acc = document.getElementById('s3-account').value;
    const tpl = document.getElementById('s3-template').value;
    const flowRadio = document.querySelector('input[name="s3-flow"]:checked');
    const processFlow = flowRadio ? flowRadio.value : 'apply-result';
    const applyDivEl = document.getElementById('s3-apply-div');
    const fid = applyDivEl && applyDivEl.style.display !== 'none'
        ? (document.getElementById('s3-apply-form')?.value || null)
        : null;
    const resultFormEl = document.getElementById('s3-result-form');
    const resultFormId = resultFormEl ? (resultFormEl.value || null) : null;
    const planFmEl = document.getElementById('s3-plan-form');
    const multiEl = document.getElementById('s3-multi');
    const planDiv = document.getElementById('s3-plan-div');
    const isPlanVisible = planDiv && planDiv.style.display !== 'none';
    const planFormId = (isPlanVisible && planFmEl) ? (planFmEl.value || null) : null;
    const multiPlanAllowed = (isPlanVisible && multiEl) ? multiEl.checked : false;
    const ltCbs = [...document.querySelectorAll('.s3-lt-cb:checked')];
    const learningTypes = ltCbs.map(cb => cb.value);
    if (!acc || !tpl) { alert('예산 계정과 대상 조직 템플릿을 선택해주세요.'); return; }
    if (processFlow !== 'result-only' && !fid) { alert('신청 양식을 선택해주세요.'); return; }
    if (processFlow === 'result-only' && !resultFormId) { alert('결과 양식을 선택해주세요.'); return; }
    if (_s3EditingRuleId) {
        const r = FORM_BUDGET_RULES.find(x => x.id === _s3EditingRuleId);
        if (r) {
            r.accountCode = acc; r.templateId = tpl; r.formId = fid;
            r.planFormId = planFormId; r.multiPlanAllowed = multiPlanAllowed;
            r.learningTypes = learningTypes; r.processFlow = processFlow;
            r.resultFormId = resultFormId;
        }
    } else {
        FORM_BUDGET_RULES.push({
            id: 'R' + (Date.now()), tenantId: boCurrentPersona.tenantId || _s3Tenant,
            accountCode: acc, templateId: tpl, formId: fid,
            planFormId, multiPlanAllowed, learningTypes, processFlow, resultFormId
        });
    }
    s3CloseModal();
    document.getElementById('bm-content').innerHTML = renderStep3();
}

function s3CloseModal() {
    document.getElementById('s3-modal').style.display = 'none';
}









// ═════════════════════════════════════════════════════════════════════════════
// 권한 관리 (탭5)
// ═════════════════════════════════════════════════════════════════════════════
function renderPermissions() {
  const personas = Object.values(BO_PERSONAS);
  return `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
    <span class="bo-section-title">권한 및 담당자 현황</span>
    <button class="bo-btn-primary bo-btn-sm">+ 담당자 추가</button>
  </div>
  <table class="bo-table">
    <thead><tr><th>성명</th><th>소속</th><th>직급</th><th>역할</th><th>접근 메뉴</th><th>관리</th></tr></thead>
    <tbody>
      ${personas.map(p => `
      <tr>
        <td style="font-weight:700">${p.name}</td>
        <td style="font-size:12px;color:#6B7280">${p.dept}</td>
        <td style="font-size:12px">${p.pos}</td>
        <td><span class="role-tag ${p.roleClass}">${p.roleLabel}</span></td>
        <td style="font-size:11px;color:#6B7280">${p.accessMenus.join(' · ')}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="bo-btn-secondary bo-btn-sm">수정</button>
            <button class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#EF4444">삭제</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}




