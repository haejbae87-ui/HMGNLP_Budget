// bo_budget_account.js
// 예산계정 관리 독립 메뉴 화면 (기존 통합 화면의 4번 탭에서 분리)

let _bamTemplates = []; // 로드된 교육지원 템플릿 목록
let _bamSelectedTenant = null;
let _bamSelectedTplId = null;

// 메뉴 진입점 (bo_layout.js 에서 라우팅 시 호출)
async function renderBudgetAccountMenu() {
  document.getElementById('bo-content').innerHTML = `
    <div style="padding:24px;max-width:1200px;margin:0 auto">
      <h2 style="font-size:20px;font-weight:900;color:#111827;margin-bottom:20px">💳 예산계정 관리</h2>
      
      <!-- 상단 권한 조회 필터 영역 -->
      <div id="bam-filter-area" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:700;color:#475569">조회 조건 로딩 중...</span>
      </div>
      
      <!-- 예산계정 메인 영역 -->
      <div id="bam-main-area">
        <div style="padding:40px;text-align:center;color:#9CA3AF">상단 필터에서 템플릿을 선택해주세요.</div>
      </div>
    </div>
  `;

  await _bamLoadTemplates();
  _bamRenderFilterArea();
}

// 템플릿 목록 로드 (purpose = 'edu_support' 인 데이터만)
async function _bamLoadTemplates() {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb.from('virtual_org_templates')
      .select('*')
      .in('purpose', ['edu_support', '교육지원'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    _bamTemplates = data || [];
  } catch (err) {
    console.error('예산계정 템플릿 로드 실패:', err);
  }
}

// 권한별 필터 렌더링
function _bamRenderFilterArea() {
  const persona = boCurrentPersona;
  const role = persona?.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  
  let tenantOptions = '';
  let targetTenantId = null;
  
  if (role === 'platform_admin') {
    targetTenantId = _bamSelectedTenant || (tenants[0]?.id || '');
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <select onchange="_bamOnChangeTenant(this.value)" style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600">
          ${tenants.map(t => `<option value="${t.id}" ${t.id === targetTenantId ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
        </select>
      </div>
    `;
  } else {
    // 테넌트 담당자이거나 특정 역할인 경우
    targetTenantId = persona.tenantId || '';
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <div style="padding:6px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;font-weight:700;color:#334155">
          ${tenants.find(t=>t.id === targetTenantId)?.name || targetTenantId}
        </div>
      </div>
    `;
  }
  
  _bamSelectedTenant = targetTenantId;

  // 템플릿 목록 필터링
  // 1) 내가 속한 테넌트 (플랫폼인 경우 선택한 테넌트)
  let filteredTpls = _bamTemplates.filter(t => t.tenant_id === _bamSelectedTenant);
  
  // 2) 제도 담당자인 경우, 내가 매핑된 템플릿만 (관리자 제외)
  if (role !== 'platform_admin' && role !== 'tenant_global_admin') {
    // 본인이 가진 권한코드 목록
    const userRoleCodes = (persona.roles || [persona.role]).map(r => r.code || r);
    filteredTpls = filteredTpls.filter(t => {
      // 템플릿의 owner_role_ids (이전 버전) 또는 head_manager_role의 코드 등과 매핑
      const ownerIds = t.owner_role_ids || t.ownerRoleIds || [];
      const headCode = t.head_manager_role?.code || t.headManagerRole?.code;
      // 유저의 role이 템플릿의 소유역할이거나, 총괄역할인 경우에만 보이도록 함
      return userRoleCodes.some(ur => ownerIds.includes(ur) || ur === headCode);
    });
  }

  // 아직 템플릿이 선택되지 않았다면 가장 첫번째로 지정
  if (!_bamSelectedTplId && filteredTpls.length > 0) {
    _bamSelectedTplId = filteredTpls[0].id;
  }
  // 테넌트 변경 등으로 인해 선택된 템플릿이 현재 필터 목록에 없다면 리셋
  if (_bamSelectedTplId && !filteredTpls.find(t => t.id === _bamSelectedTplId)) {
    _bamSelectedTplId = filteredTpls[0] ? filteredTpls[0].id : null;
  }

  const tplOptions = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;border-left:1px solid #CBD5E1;padding-left:20px">
      <label style="font-size:12px;font-weight:700;color:#475569">교육지원 가상조직(템플릿)</label>
      <select onchange="_bamOnChangeTpl(this.value)" style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600;min-width:200px">
        ${filteredTpls.length === 0 ? '<option value="">조회된 조직이 없습니다</option>' : ''}
        ${filteredTpls.map(t => `<option value="${t.id}" ${t.id === _bamSelectedTplId ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>
  `;

  document.getElementById('bam-filter-area').innerHTML = tenantOptions + tplOptions;

  // 바디 렌더링 시작
  _bamRenderContent(filteredTpls.find(t => t.id === _bamSelectedTplId));
}

function _bamOnChangeTenant(tenantId) {
  _bamSelectedTenant = tenantId;
  _bamSelectedTplId = null; // 테넌트 변경 시 템플릿 초기화
  _bamRenderFilterArea();
}

function _bamOnChangeTpl(tplId) {
  _bamSelectedTplId = tplId;
  _bamRenderFilterArea();
}

// 템플릿 선택에 따른 본문(예산계정) 렌더링
function _bamRenderContent(tpl) {
  const mainEl = document.getElementById('bam-main-area');
  
  if (!tpl) {
    mainEl.innerHTML = `
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">선택할 수 있는 가상교육조직 템플릿이 없습니다.</div>
      </div>
    `;
    return;
  }

  // bo_budget_master.js 의 기능과 호환되도록 전역변수 세팅
  window._baTplId = tpl.id;
  window._baTenantId = tpl.tenant_id || tpl.tenantId;

  // 모달을 포함한 HTML 구조
  mainEl.innerHTML = `
    <div class="bo-card" style="padding:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #F1F5F9">
        <div>
          <h3 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 4px">💳 예산계정 관리</h3>
          <p style="font-size:12px;color:#64748B;margin:0">
            템플릿: <strong style="color:#0F172A">${tpl.name}</strong> 
          </p>
        </div>
        <button onclick="if(typeof openS1Modal==='function') openS1Modal(); else alert('모달 함수 미정의');" class="bo-btn-primary">+ 계정 신규 등록</button>
      </div>
      
      <div id="vu-budget-list">
        <div style="padding:20px;text-align:center;color:#9CA3AF">🔄 예산계정 로딩 중...</div>
      </div>
    </div>
    
    <!-- 계정 등록/수정 모달 (기존 bo_budget_master.js의 openS1Modal 에서 #s1-modal을 사용함) -->
    <div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:16px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 id="s1-modal-title" style="font-size:15px;font-weight:800;margin:0">예산 계정 신규 등록</h3>
          <button onclick="if(typeof s1CloseModal==='function') s1CloseModal();" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
        </div>
        <div id="s1-modal-body"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
          <button class="bo-btn-secondary bo-btn-sm" onclick="if(typeof s1CloseModal==='function') s1CloseModal();">취소</button>
          <button class="bo-btn-primary bo-btn-sm" onclick="if(typeof s1SaveAccount==='function') s1SaveAccount();">저장</button>
        </div>
      </div>
    </div>
  `;

  // 기존 bo_budget_master.js 에서 예산 조회하는 함수 호출 (이전에 통합화면 _vuLoadBudgetAccounts 역할)
  // bo_budget_master.js 의 _baLoadBudgetAccounts() 호출 가능여부 확인
  // 해당 파일에 함수가 어떻게 정의되어 있는지에 따라 새로 정의해야 할 수도 있음.
  // 여기서는 _vuLoadBudgetAccounts의 기존 로직을 복원하여 사용.
  
  _bamLoadBudgetAccountsList(tpl.id);
}

// 기존 통합화면의 _vuLoadBudgetAccounts 로직 이식
async function _bamLoadBudgetAccountsList(tplId) {
  const listEl = document.getElementById('vu-budget-list');
  if (!listEl) return;
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb || !tplId) { 
      listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#9CA3AF">DB 연결 또는 템플릿 선택 필요</div>'; 
      return; 
    }
    const { data, error } = await sb.from('budget_accounts')
      .select('*')
      .eq('virtual_org_template_id', tplId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    // bo_budget_master.js 의 전역 리스트에도 담아줌 (s1SaveAccount 등에서 갱신할 수 있으므로)
    window._baAccountList = data || [];
    
    if (!window._baAccountList.length) {
      listEl.innerHTML = \`
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB;margin-top:16px">
        <div style="font-size:32px;margin-bottom:8px">💳</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">이 템플릿에 등록된 예산 계정이 없습니다</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">위 '+ 계정 신규 등록' 버튼으로 추가하세요</div>
      </div>\`;
      return;
    }
    
    // bo_budget_master.js 에 존재하는 _baRenderAccountCard 함수를 활용
    if (typeof _baRenderAccountCard === 'function') {
      listEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">' + 
        window._baAccountList.map(a => _baRenderAccountCard(a, true)).join('') + 
        '</div>';
    } else {
      listEl.innerHTML = '<div style="padding:20px;text-align:center;color:#EF4444">카드 렌더링 함수(_baRenderAccountCard)를 찾을 수 없습니다.</div>';
    }
  } catch(e) {
    listEl.innerHTML = \`<div style="padding:20px;text-align:center;color:#EF4444">로드 실패: \${e.message}</div>\`;
  }
}

// bo_budget_master.js 의 s1SaveAccount 완료 시 자동으로 리스트를 리로딩해주기 위한 훅(Hook) 처리.
// bo_budget_master.js에 _baLoadBudgetAccounts() 호출하는 부분들이 있다면 오버라이딩 처리
window._baLoadBudgetAccounts = () => {
    if (window._bamSelectedTplId) {
        _bamLoadBudgetAccountsList(window._bamSelectedTplId);
    }
};
