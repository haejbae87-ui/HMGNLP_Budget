// bo_budget_account.js
// 예산계정 관리 독립 메뉴 화면 (기존 통합 화면의 4번 탭에서 분리)

let _bamTemplates = []; // 로드된 교육지원 제도그룹 목록
let _bamSelectedTenant = null;
let _bamSelectedTplId = null;

// 메뉴 진입점 (bo_layout.js 에서 라우팅 시 호출)
async function renderBudgetAccountMenu() {
  document.getElementById("bo-content").innerHTML = `
    <div style="padding:24px;max-width:1200px;margin:0 auto">
      <h2 style="font-size:20px;font-weight:900;color:#111827;margin-bottom:20px">💳 예산계정 관리</h2>
      
      <!-- 상단 권한 조회 필터 영역 -->
      <div id="bam-filter-area" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:700;color:#475569">조회 조건 로딩 중...</span>
      </div>
      
      <!-- 예산계정 메인 영역 -->
      <div id="bam-main-area">
        <div style="padding:40px;text-align:center;color:#9CA3AF">상단 필터에서 제도그룹을 선택해주세요.</div>
      </div>
    </div>
  `;

  await _bamLoadTemplates();
  _bamRenderFilterArea();
}

// 제도그룹 목록 로드 (purpose = 'edu_support' 인 데이터만)
async function _bamLoadTemplates() {
  const sb = typeof _sb === "function" ? _sb() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("virtual_org_templates")
      .select("*")
      .in("purpose", ["edu_support", "교육지원"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    _bamTemplates = data || [];
  } catch (err) {
    console.error("예산계정 제도그룹 로드 실패:", err);
  }
}

// 권한별 필터 렌더링
function _bamRenderFilterArea() {
  const persona = boCurrentPersona;
  const role = persona?.role;
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];

  let tenantOptions = "";
  let targetTenantId = null;

  if (role === "platform_admin") {
    targetTenantId = _bamSelectedTenant || tenants[0]?.id || "";
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <select onchange="_bamOnChangeTenant(this.value)" style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600">
          ${tenants.map((t) => `<option value="${t.id}" ${t.id === targetTenantId ? "selected" : ""}>${t.name} (${t.id})</option>`).join("")}
        </select>
      </div>
    `;
  } else {
    // 테넌트 담당자이거나 특정 역할인 경우
    targetTenantId = persona.tenantId || "";
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <div style="padding:6px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;font-weight:700;color:#334155">
          ${tenants.find((t) => t.id === targetTenantId)?.name || targetTenantId}
        </div>
      </div>
    `;
  }

  _bamSelectedTenant = targetTenantId;

  // 제도그룹 목록 필터링
  // 1) 내가 속한 테넌트 (플랫폼인 경우 선택한 테넌트)
  let filteredTpls = _bamTemplates.filter(
    (t) => t.tenant_id === _bamSelectedTenant,
  );

  // 2) 제도 담당자인 경우, 내가 매핑된 제도그룹만 (관리자 제외)
  if (role !== "platform_admin" && role !== "tenant_global_admin") {
    // 본인이 가진 권한코드 목록
    const userRoleCodes = (persona.roles || [persona.role]).map(
      (r) => r.code || r,
    );
    filteredTpls = filteredTpls.filter((t) => {
      // 제도그룹의 owner_role_ids (이전 버전) 또는 head_manager_role의 코드 등과 매핑
      const ownerIds = t.owner_role_ids || t.ownerRoleIds || [];
      const headCode = t.head_manager_role?.code || t.headManagerRole?.code;
      // 유저의 role이 제도그룹의 소유역할이거나, 총괄역할인 경우에만 보이도록 함
      return userRoleCodes.some(
        (ur) => ownerIds.includes(ur) || ur === headCode,
      );
    });
  }

  // 아직 제도그룹이 선택되지 않았다면 가장 첫번째로 지정
  if (!_bamSelectedTplId && filteredTpls.length > 0) {
    _bamSelectedTplId = filteredTpls[0].id;
  }
  // 테넌트 변경 등으로 인해 선택된 제도그룹이 현재 필터 목록에 없다면 리셋
  if (
    _bamSelectedTplId &&
    !filteredTpls.find((t) => t.id === _bamSelectedTplId)
  ) {
    _bamSelectedTplId = filteredTpls[0] ? filteredTpls[0].id : null;
  }

  const tplOptions = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;border-left:1px solid #CBD5E1;padding-left:20px">
      <label style="font-size:12px;font-weight:700;color:#475569">제도그룹</label>
      <select onchange="_bamOnChangeTpl(this.value)" style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600;min-width:200px">
        ${filteredTpls.length === 0 ? '<option value="">조회된 조직이 없습니다</option>' : ""}
        ${filteredTpls.map((t) => `<option value="${t.id}" ${t.id === _bamSelectedTplId ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>
    </div>
  `;

  document.getElementById("bam-filter-area").innerHTML =
    tenantOptions + tplOptions;

  // 바디 렌더링 시작
  _bamRenderContent(filteredTpls.find((t) => t.id === _bamSelectedTplId));
}

function _bamOnChangeTenant(tenantId) {
  _bamSelectedTenant = tenantId;
  _bamSelectedTplId = null; // 테넌트 변경 시 제도그룹 초기화
  _bamRenderFilterArea();
}

function _bamOnChangeTpl(tplId) {
  _bamSelectedTplId = tplId;
  _bamRenderFilterArea();
}

// 제도그룹 선택에 따른 본문(예산계정) 렌더링
function _bamRenderContent(tpl) {
  const mainEl = document.getElementById("bam-main-area");

  if (!tpl) {
    mainEl.innerHTML = `
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">선택할 수 있는 제도그룹이 없습니다.</div>
      </div>
    `;
    return;
  }

  // bo_budget_master.js 의 기능과 호환되도록 전역변수 세팅
  window._baTplId = tpl.id;
  window._baTenantId = tpl.tenant_id || tpl.tenantId;
  window._baTplName = tpl.name;

  // 리스트 뷰 & 디테일 뷰 컨테이너 분할
  mainEl.innerHTML = `
    <!-- 리스트 뷰 -->
    <div id="bam-list-view" class="bo-card" style="padding:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #F1F5F9">
        <div>
          <h3 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 4px">💳 예산계정 관리</h3>
          <p style="font-size:12px;color:#64748B;margin:0">
            제도그룹: <strong style="color:#0F172A">${tpl.name}</strong> 
          </p>
        </div>
        <button onclick="_bamShowDetailView()" class="bo-btn-primary">+ 계정 신규 등록</button>
      </div>
      
      <div id="vu-budget-list">
        <div style="padding:20px;text-align:center;color:#9CA3AF">🔄 예산계정 로딩 중...</div>
      </div>
    </div>
    
    <!-- 상세 뷰 -->
    <div id="bam-detail-view" style="display:none">
      <!-- 동적 렌더링 영역 -->
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
  const listEl = document.getElementById("vu-budget-list");
  if (!listEl) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb || !tplId) {
      listEl.innerHTML =
        '<div style="padding:20px;text-align:center;color:#9CA3AF">DB 연결 또는 제도그룹 선택 필요</div>';
      return;
    }
    const { data, error } = await sb
      .from("budget_accounts")
      .select("*")
      .eq("virtual_org_template_id", tplId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // bo_budget_master.js 의 전역 리스트에도 담아줌 (s1SaveAccount 등에서 갱신할 수 있으므로)
    window._baAccountList = data || [];

    if (!window._baAccountList.length) {
      listEl.innerHTML = `
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB;margin-top:16px">
        <div style="font-size:32px;margin-bottom:8px">💳</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">이 제도그룹에 등록된 예산 계정이 없습니다</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">위 '+ 계정 신규 등록' 버튼으로 추가하세요</div>
      </div>`;
      return;
    }

    // 자체 테이블 렌더링 (외부함수 의존 제거)
    const rows = window._baAccountList
      .map((a, idx) => {
        const statusBg = a.active !== false ? "#D1FAE5" : "#F3F4F6";
        const statusColor = a.active !== false ? "#065F46" : "#9CA3AF";
        const statusLabel = a.active !== false ? "활성" : "비활성";
        const budgetMode =
          a.uses_budget === false
            ? "미사용"
            : a.bankbook_mode === "team"
              ? "팀별통장"
              : a.bankbook_mode === "personal"
                ? "개인통장"
                : "공동";
        // 결재 방식 (ACCOUNT_MASTER에서 참조)
        const masterAcct =
          typeof ACCOUNT_MASTER !== "undefined"
            ? ACCOUNT_MASTER.find((m) => m.code === a.code)
            : null;
        const appSys = masterAcct?.approvalSystem || "platform";
        const appSysBadge =
          appSys === "integrated"
            ? '<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:#FEF3C7;color:#92400E">🔗 통합결재</span>'
            : appSys === "platform"
              ? '<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:#F0FDF4;color:#059669">⚡ 자체결재</span>'
              : '<span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:#EFF6FF;color:#1D4ED8">🏢 외부결재</span>';
        return `
      <tr style="border-bottom:1px solid #F1F5F9;cursor:pointer;transition:background .12s"
          onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''"
          onclick="_bamShowDetailView('${a.id}')">
        <td style="padding:11px 14px;text-align:center;color:#9CA3AF;font-size:12px">${idx + 1}</td>
        <td style="padding:11px 14px">
          <code style="font-size:11px;background:#F1F5F9;padding:2px 6px;border-radius:4px;color:#1E40AF;font-weight:700">${a.code || ""}</code>
        </td>
        <td style="padding:11px 14px;font-weight:800;font-size:13px;color:#111827">${a.name || ""}</td>
        <td style="padding:11px 14px;font-size:12px;color:#6B7280">${budgetMode}</td>
        <td style="padding:11px 14px;text-align:center">${appSysBadge}</td>
        <td style="padding:11px 14px;text-align:center">
          <span style="font-size:10px;padding:2px 8px;border-radius:6px;font-weight:700;background:${statusBg};color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>`;
      })
      .join("");

    listEl.innerHTML = `
    <div style="overflow-x:auto;border-radius:10px;border:1px solid #E2E8F0;margin-top:12px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F8FAFC;border-bottom:2px solid #E2E8F0">
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#64748B;width:50px">NO</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#64748B">계정 코드</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#64748B">계정명</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#64748B">예산 방식</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#64748B;width:100px">결재 방식</th>
            <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#64748B;width:80px">상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:8px;text-align:right">총 ${window._baAccountList.length}개 계정</div>`;
  } catch (e) {
    listEl.innerHTML = `<div style="padding:20px;text-align:center;color:#EF4444">로드 실패: ${e.message}</div>`;
  }
}

// bo_budget_master.js 의 s1SaveAccount 완료 시 자동으로 리스트를 리로딩해주기 위한 훅(Hook) 처리.
// bo_budget_master.js에 _baLoadBudgetAccounts() 호출하는 부분들이 있다면 오버라이딩 처리
window._baLoadBudgetAccounts = () => {
  if (window._bamSelectedTplId) {
    _bamLoadBudgetAccountsList(window._bamSelectedTplId);
  }
};

// ─── 예산계정 상세 화면 로직 (독립화) ────────────────────────────────────────────────
let _bamEditId = null;
let _bamActiveTab = 'basic'; // 'basic' | 'policy' | 'approval'
let _bamDetailData = {};     // 상세 화면에서 편집 중인 데이터

function _bamCloseDetailView() {
  document.getElementById("bam-detail-view").style.display = "none";
  document.getElementById("bam-list-view").style.display = "block";
  document.getElementById("bam-filter-area").style.display = "flex";
}

async function _bamShowDetailView(id) {
  _bamEditId = id || null;
  _bamActiveTab = 'basic';
  const list = window._baAccountList || [];
  const a = id ? list.find((x) => x.id === id) || null : null;
  const autoCode = a?.code || ("BA-" + String(Date.now()).slice(-6));

  // DB에서 기존 정책 데이터 로드
  let policy = null;
  if (id && window._baTplId) {
    try {
      const sb = typeof _sb === "function" ? _sb() : null;
      if (sb) {
        const { data } = await sb.from("budget_account_org_policy")
          .select("bankbook_mode, bankbook_level, individual_limit")
          .eq("budget_account_id", id).eq("vorg_template_id", window._baTplId).maybeSingle();
        policy = data;
      }
    } catch(e) {}
  }

  // 편집 데이터 초기화
  _bamDetailData = {
    code: autoCode,
    name: a?.name || '',
    description: a?.description || '',
    uses_budget: a?.uses_budget !== false,
    integration_type: a?.account_type || 'sap',
    sap_code: a?.sap_code || '',
    bankbook_mode: policy?.bankbook_mode || 'isolated',
    individual_limit: policy?.individual_limit || '',
    // 서비스 정책 (신규 컬럼)
    service_type: a?.service_type || '',
    purpose: a?.purpose || '',
    edu_types: a?.edu_types || [],
    selected_edu_item: a?.selected_edu_item || null,
    process_pattern: a?.process_pattern || '',
    // 결재라인 (신규 컬럼)
    approval_config: a?.approval_config || {},
  };

  const detailEl = document.getElementById("bam-detail-view");
  detailEl.innerHTML = `<div class="bo-card" style="padding:0;max-width:960px;margin:0 auto">
  <div style="padding:16px 24px;display:flex;align-items:center;gap:12px;border-bottom:2px solid #F1F5F9">
    <button onclick="_bamCloseDetailView()" style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#374151;display:flex;align-items:center;gap:6px">◀ 목록으로</button>
    <div style="flex:1">
      <h1 class="bo-page-title" style="margin:0">${id ? "예산 계정 수정" : "예산 계정 신규 등록"}</h1>
      <p class="bo-page-sub" style="margin:4px 0 0">예산계정의 기본정보, 서비스 정책 및 결재라인을 설정합니다.</p>
    </div>
  </div>
  <div style="padding:12px 24px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;gap:8px">
    <span style="font-size:12px;font-weight:800;color:#475569">🏢 소속 제도그룹</span>
    <span style="font-size:14px;font-weight:900;color:#1E40AF">${window._baTplName || '지정되지 않음'}</span>
  </div>
  <div id="bam-tab-bar" style="display:flex;border-bottom:2px solid #E5E7EB"></div>
  <div id="bam-tab-content" style="padding:24px"></div>
  <div style="display:flex;gap:10px;justify-content:flex-end;padding:16px 24px;border-top:2px solid #E5E7EB">
    <button onclick="_bamCloseDetailView()" style="padding:10px 24px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
    <button onclick="_bamSaveAccount()" style="padding:10px 28px;border:none;border-radius:10px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.35)">💾 저장</button>
  </div>
</div>`;

  _bamRenderTabs();
  document.getElementById("bam-filter-area").style.display = "none";
  document.getElementById("bam-list-view").style.display = "none";
  detailEl.style.display = "block";
}

function _bamRenderTabs() {
  const tabs = [
    { key: 'basic', label: '📋 기본정보', color: '#1D4ED8' },
    { key: 'policy', label: '🎯 서비스 정책 · 프로세스', color: '#7C3AED' },
    { key: 'approval', label: '📝 결재라인', color: '#059669' },
  ];
  const bar = document.getElementById("bam-tab-bar");
  if (!bar) return;
  bar.innerHTML = tabs.map(t => `<button onclick="_bamSwitchTab('${t.key}')"
    style="flex:1;padding:12px 16px;font-size:13px;font-weight:${_bamActiveTab === t.key ? '900' : '600'};
    color:${_bamActiveTab === t.key ? t.color : '#6B7280'};
    background:${_bamActiveTab === t.key ? t.color + '08' : 'transparent'};
    border:none;border-bottom:3px solid ${_bamActiveTab === t.key ? t.color : 'transparent'};
    cursor:pointer;transition:all .15s">${t.label}</button>`).join('');
  _bamRenderTabContent();
}

function _bamSwitchTab(tab) {
  _bamActiveTab = tab;
  _bamRenderTabs();
}

function _bamRenderTabContent() {
  const el = document.getElementById("bam-tab-content");
  if (!el) return;
  const d = _bamDetailData;

  if (_bamActiveTab === 'basic') {
    el.innerHTML = _bamRenderBasicTab(d);
  } else if (_bamActiveTab === 'policy') {
    el.innerHTML = _bamRenderPolicyTab(d);
  } else if (_bamActiveTab === 'approval') {
    el.innerHTML = _bamRenderApprovalTab(d);
  }
}

function _bamToggleIntegration() {
  const radios = document.querySelectorAll('input[name="bam-dt-integration"]');
  let isSap = false;
  radios.forEach((r) => {
    const label = r.closest("label");
    if (r.checked) {
      if (r.value === "sap") isSap = true;
      label.style.borderColor = r.value === "sap" ? "#1D4ED8" : "#059669";
      label.style.background = r.value === "sap" ? "#EFF6FF" : "#F0FDF4";
    } else {
      label.style.borderColor = "#E5E7EB";
      label.style.background = "#fff";
    }
  });
  const sapSection = document.getElementById("bam-dt-sap-code-section");
  if (sapSection) sapSection.style.display = isSap ? "" : "none";
}

function _bamToggleUsesBudget(val) {
  const yesLabel = document.getElementById("bam-dt-uses-yes-label");
  const noLabel = document.getElementById("bam-dt-uses-no-label");
  if (!yesLabel || !noLabel) return;
  const yesR = yesLabel.querySelector("input");
  const noR = noLabel.querySelector("input");
  yesR.checked = val;
  noR.checked = !val;
  yesLabel.style.borderColor = val ? "#059669" : "#E5E7EB";
  yesLabel.style.background = val ? "#F0FDF4" : "#fff";
  noLabel.style.borderColor = !val ? "#DC2626" : "#E5E7EB";
  noLabel.style.background = !val ? "#FEF2F2" : "#fff";
  
  const intSection = document.getElementById("bam-dt-integration-section");
  const modeSection = document.getElementById("bam-dt-bankbook-mode-section");
  if (intSection) intSection.style.display = val ? "" : "none";
  if (modeSection) modeSection.style.display = val ? "" : "none";
}

function _bamToggleBankbookMode(mode) {
  const isoLabel = document.getElementById("bam-dt-mode-isolated-label");
  const sharedLabel = document.getElementById("bam-dt-mode-shared-label");
  const indLabel = document.getElementById("bam-dt-mode-individual-label");
  const limitSection = document.getElementById("bam-dt-individual-limit-section");
  if (!isoLabel || !sharedLabel) return;
  isoLabel.querySelector("input").checked = mode === "isolated";
  sharedLabel.querySelector("input").checked = mode === "shared";
  if (indLabel) indLabel.querySelector("input").checked = mode === "individual";
  
  isoLabel.style.borderColor = mode === "isolated" ? "#7C3AED" : "#E5E7EB";
  isoLabel.style.background = mode === "isolated" ? "#F5F3FF" : "#fff";
  sharedLabel.style.borderColor = mode === "shared" ? "#D97706" : "#E5E7EB";
  sharedLabel.style.background = mode === "shared" ? "#FFFBEB" : "#fff";
  
  if (indLabel) {
    indLabel.style.borderColor = mode === "individual" ? "#059669" : "#E5E7EB";
    indLabel.style.background = mode === "individual" ? "#ECFDF5" : "#fff";
  }
  if (limitSection) limitSection.style.display = mode === "individual" ? "" : "none";
}

async function _bamSaveAccount() {
  const d = _bamDetailData;
  if (!d.code || !d.name) { alert("계정명은 필수입니다."); return; }
  if (!window._baTplId) { alert("제도그룹을 먼저 선택하세요."); return; }

  const role = boCurrentPersona.role;
  const tenantId = role === "platform_admin" ? (window._baTenantId || "HMC") : (boCurrentPersona.tenantId || "HMC");

  const payload = {
    tenant_id: tenantId,
    virtual_org_template_id: window._baTplId,
    code: d.code, name: d.name,
    account_type: d.integration_type || 'sap',
    sap_code: d.integration_type === 'sap' ? (d.sap_code || null) : null,
    description: d.description || '',
    active: true,
    uses_budget: d.uses_budget !== false,
    service_type: d.service_type || null,
    purpose: d.purpose || null,
    edu_types: d.edu_types || [],
    selected_edu_item: d.selected_edu_item || null,
    process_pattern: d.process_pattern || null,
    approval_config: d.approval_config || {},
    updated_at: new Date().toISOString(),
  };

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) throw new Error("DB 연결이 없습니다.");

    if (_bamEditId) {
      const { error } = await sb.from("budget_accounts").update(payload).eq("id", _bamEditId);
      if (error) throw error;
      const pp = { budget_account_id: _bamEditId, vorg_template_id: window._baTplId,
        bankbook_mode: d.bankbook_mode || 'isolated', bankbook_level: "team", updated_at: new Date().toISOString(),
        individual_limit: d.bankbook_mode === "individual" && d.individual_limit ? Number(d.individual_limit) : null };
      await sb.from("budget_account_org_policy").upsert(pp, { onConflict: "budget_account_id,vorg_template_id" });
    } else {
      payload.id = "BA-" + Date.now();
      const { error } = await sb.from("budget_accounts").insert(payload);
      if (error) throw error;
      const np = { budget_account_id: payload.id, vorg_template_id: window._baTplId,
        bankbook_mode: d.bankbook_mode || 'isolated', bankbook_level: "team",
        individual_limit: d.bankbook_mode === "individual" && d.individual_limit ? Number(d.individual_limit) : null };
      await sb.from("budget_account_org_policy").insert(np);
      if (typeof _syncBankbooksForTemplate === "function") {
        try { await _syncBankbooksForTemplate(window._baTplId, payload.tenant_id); } catch(e) {}
      }
    }
    _bamCloseDetailView();
    _bamLoadBudgetAccountsList(window._baTplId);
  } catch (e) { alert("저장 실패: " + e.message); }
}

// ─── Tab 1: 기본정보 탭 렌더링 ─────────────────────────────────────────
function _bamRenderBasicTab(d) {
  const _r = (id, v) => `oninput="_bamDetailData.${id}=this.value"`;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
  <div style="grid-column:1/-1">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정코드 (자동채번)</label>
    <input type="text" value="${d.code}" readonly style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB;color:#6B7280">
  </div>
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정명 *</label>
    <input type="text" value="${d.name}" placeholder="예) 교육훈련비" ${_r('name')} style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">용도 설명</label>
    <input type="text" value="${d.description}" placeholder="예) 사내 집합/이러닝 운영비" ${_r('description')} style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
</div>

<!-- 예산 사용 여부 -->
<div style="margin-top:16px">
  <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">예산 사용 여부</label>
  <div style="display:flex;gap:12px">
    ${[{v:true,c:'#059669',i:'✅',l:'사용',s:'조직별 통장 생성 및 예산 배정 허용'},{v:false,c:'#DC2626',i:'⛔',l:'미사용',s:'통장 생성 안 함, 조회만 가능'}]
      .map(o=>`<label style="display:flex;align-items:center;gap:8px;padding:12px 16px;border:1.5px solid ${d.uses_budget===o.v?o.c:'#E5E7EB'};border-radius:10px;cursor:pointer;background:${d.uses_budget===o.v?o.c+'15':'#fff'};flex:1"
        onclick="_bamDetailData.uses_budget=${o.v};_bamRenderTabs()"><input type="radio" name="bam-uses" ${d.uses_budget===o.v?'checked':''} style="accent-color:${o.c}">
        <div><div style="font-size:12px;font-weight:800;color:${o.c}">${o.i} ${o.l}</div><div style="font-size:10px;color:#6B7280">${o.s}</div></div></label>`).join('')}
  </div>
</div>

${d.uses_budget ? `
<!-- 연동 방식 -->
<div style="margin-top:16px">
  <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">연동 방식</label>
  <div style="display:flex;gap:12px">
    ${[{v:'sap',c:'#1D4ED8',i:'🔗',l:'SAP 연동',s:'ERP 예산관리와 실시간 연동'},{v:'standalone',c:'#059669',i:'📋',l:'자체관리 (미연동)',s:'시스템 내 독립 예산 관리'}]
      .map(o=>`<label style="display:flex;align-items:center;gap:8px;padding:12px 16px;border:1.5px solid ${d.integration_type===o.v?o.c:'#E5E7EB'};border-radius:10px;cursor:pointer;background:${d.integration_type===o.v?o.c+'15':'#fff'};flex:1"
        onclick="_bamDetailData.integration_type='${o.v}';_bamRenderTabs()"><input type="radio" name="bam-int" ${d.integration_type===o.v?'checked':''} style="accent-color:${o.c}">
        <div><div style="font-size:12px;font-weight:800;color:${o.c}">${o.i} ${o.l}</div><div style="font-size:10px;color:#6B7280">${o.s}</div></div></label>`).join('')}
  </div>
  ${d.integration_type==='sap'?`<div style="margin-top:10px"><label style="font-size:11px;font-weight:700;color:#1D4ED8;display:block;margin-bottom:4px">🔗 SAP 연동 코드</label>
    <input type="text" value="${d.sap_code}" placeholder="예) S12345" oninput="_bamDetailData.sap_code=this.value"
      style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;font-weight:700"></div>`:''}
</div>

<!-- 통장 생성 정책 -->
<div style="margin-top:16px">
  <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">통장 생성 정책</label>
  <div style="font-size:10px;color:#9CA3AF;margin-bottom:8px">가상교육조직에 상위 조직을 맵핑했을 때 통장 생성 방식</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    ${[{v:'isolated',c:'#7C3AED',l:'팀별 분리 통장',s:'하위 팀마다 개별 통장'},{v:'shared',c:'#D97706',l:'상위 조직 공유 통장',s:'본부단위 통장 1개, 하위 팀 공유'},{v:'individual',c:'#059669',l:'👤 개인별 분리 통장',s:'팀원 1인당 개별 통장'}]
      .map(o=>`<label style="display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border:1.5px solid ${d.bankbook_mode===o.v?o.c:'#E5E7EB'};border-radius:10px;cursor:pointer;background:${d.bankbook_mode===o.v?o.c+'15':'#fff'};flex:1;min-width:140px"
        onclick="_bamDetailData.bankbook_mode='${o.v}';_bamRenderTabs()"><input type="radio" name="bam-bm" ${d.bankbook_mode===o.v?'checked':''} style="accent-color:${o.c};margin-top:2px">
        <div><div style="font-size:11px;font-weight:800;color:${o.c}">${o.l}</div><div style="font-size:10px;color:#6B7280;margin-top:2px">${o.s}</div></div></label>`).join('')}
  </div>
  ${d.bankbook_mode==='individual'?`<div style="margin-top:12px"><label style="font-size:11px;font-weight:700;color:#059669;display:block;margin-bottom:4px">💰 1인당 기본 한도 (원)</label>
    <input type="number" min="0" step="10000" value="${d.individual_limit||''}" placeholder="예) 500000" oninput="_bamDetailData.individual_limit=this.value"
      style="width:200px;padding:8px 12px;border:1.5px solid #A7F3D0;border-radius:8px;font-size:13px;font-weight:700"></div>`:''}
</div>` : ''}`;
}
