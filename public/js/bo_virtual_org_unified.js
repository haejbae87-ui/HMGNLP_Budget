// ─── 가상교육조직 통합 관리 화면 ──────────────────────────────────────────────
// 기존 3개 메뉴(교육조직/예산계정/교육지원조직)를 용도별 동적 탭으로 통합
// 공통 탭: ① 기본정보  ② 교육조직 구성  ③ 담당자  ④ 협조처
// 용도별:  ⑤ 예산계정(edu_support) / ⑤ 자격증 맵핑(cert)

let _vuActiveTab = 0;
let _vuTplId = null; // 선택된 제도그룹 ID
let _vuTplList = []; // 현재 테넌트의 제도그룹 목록
let _vuTenantId = null;
let _vuPurposeFilter = "all"; // 용도 필터: 'all'|'edu_support'|'cert'|'badge'|'language'

// ── 탭 정의: 용도별 동적 생성 ──────────────────────────────────────────────────
function _vuGetTabs(purpose) {
  const common = [
    { key: "info", label: "① 기본정보", icon: "📋" },
    { key: "org", label: "② 교육조직 구성", icon: "🏗️" },
    { key: "mgr", label: "③ 담당자", icon: "👤" },
    { key: "coop", label: "④ 협조처", icon: "🤝" },
  ];
  return common;
}

// ── 진입점 ─────────────────────────────────────────────────────────────────────
async function renderVirtualOrgUnified() {
  const el = document.getElementById("bo-content");
  if (!el) return;

  const role = boCurrentPersona.role;
  const tenants =
    typeof TENANTS !== "undefined"
      ? TENANTS.filter((t) => t.id !== "SYSTEM")
      : [];
  const isPlatform = role === "platform_admin";

  if (!_vuTenantId) {
    _vuTenantId = isPlatform
      ? tenants[0]?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";
  }

  // DB에서 제도그룹 로드
  _vuTplList = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("virtual_org_templates")
        .select(
          "id,name,purpose,service_type,tree_data,tenant_id,owner_role_ids,head_manager_role,head_manager_user",
        )
        .eq("tenant_id", _vuTenantId);
      if (data && data.length) {
        _vuTplList = data.map((row) => ({
          id: row.id,
          tenantId: row.tenant_id,
          name: row.name,
          purpose: row.service_type || row.purpose || "edu_support",
          serviceTypes: (row.service_type || row.purpose || "edu_support")
            .split(",")
            .map((s) => s.trim()),
          ownerRoleIds: row.owner_role_ids || [],
          tree: row.tree_data || { hqs: [] },
          headManagerRole: row.head_manager_role || null,
          headManagerUser: row.head_manager_user || null,
          // 복수 총괄담당자: head_manager_users(array json) 우선, 없으면 단일 호환
          headManagerUsers: Array.isArray(row.head_manager_users)
            ? row.head_manager_users
            : row.head_manager_user
              ? [row.head_manager_user]
              : [],
        }));
      }
    }
  } catch (e) {
    console.warn("[VOU] DB 로드 실패:", e.message);
  }

  // 폴백: 기존 _voMyTemplates
  if (
    !_vuTplList.length &&
    typeof _voMyTemplates !== "undefined" &&
    _voMyTemplates.length
  ) {
    _vuTplList = _voMyTemplates.filter(
      (t) => t.tenantId === _vuTenantId || t.tenant_id === _vuTenantId,
    );
  }

  // 제도그룹 선택 유지
  if (!_vuTplId || !_vuTplList.find((t) => t.id === _vuTplId)) {
    _vuTplId = _vuTplList[0]?.id || null;
    _vuActiveTab = 0;
  }

  // 용도 필터 적용 (전체가 아니면 필터링)
  const filteredTplList =
    _vuPurposeFilter === "all"
      ? _vuTplList
      : _vuTplList.filter((t) => {
          const p = t.purpose || "edu_support";
          const types = t.serviceTypes || [p];
          return types.includes(_vuPurposeFilter) || p === _vuPurposeFilter;
        });

  // 필터 후 선택 유지
  if (_vuTplId && !filteredTplList.find((t) => t.id === _vuTplId)) {
    _vuTplId = filteredTplList[0]?.id || null;
    _vuActiveTab = 0;
  }

  const curTpl = _vuTplList.find((t) => t.id === _vuTplId);
  const purpose = curTpl?.purpose || "edu_support";
  const tabs = _vuGetTabs(purpose);
  if (_vuActiveTab >= tabs.length) _vuActiveTab = 0;

  // 테넌트 셀렉트 (플랫폼 총괄만)
  const tenantSelectHtml = isPlatform
    ? `
    <select onchange="_vuTenantId=this.value;_vuTplId=null;_vuActiveTab=0;renderVirtualOrgUnified()"
      style="padding:7px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#FFFBEB;color:#92400E;cursor:pointer">
      ${tenants.map((t) => `<option value="${t.id}" ${t.id === _vuTenantId ? "selected" : ""}>${t.name}</option>`).join("")}
    </select>`
    : "";

  // 용도 뱃지 색상
  const purposeColors = {
    edu_support: { bg: "#EFF6FF", text: "#1D4ED8", label: "교육지원" },
    교육지원: { bg: "#EFF6FF", text: "#1D4ED8", label: "교육지원" },
    language: { bg: "#F0FDF4", text: "#059669", label: "어학" },
    cert: { bg: "#FFF7ED", text: "#C2410C", label: "자격증" },
    badge: { bg: "#F5F3FF", text: "#7C3AED", label: "배지" },
  };

  el.innerHTML = `
<div class="bo-fade" style="display:flex;gap:0;min-height:calc(100vh - 130px)">
  <!-- ═══ 좌측: 제도그룹 목록 패널 ═══ -->
  <div style="width:260px;flex-shrink:0;border-right:1.5px solid #E5E7EB;background:#FAFBFC;overflow-y:auto">
    <div style="padding:16px 14px 10px;border-bottom:1px solid #E5E7EB">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:13px;font-weight:900;color:#111827">📋 제도그룹 목록</span>
        <div style="display:flex;gap:6px">
          <button onclick="_vuOpenCreateModal()"
            style="padding:4px 10px;background:#1D4ED8;color:#fff;border:none;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer">+ 생성</button>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${tenantSelectHtml}
        <select onchange="_vuPurposeFilter=this.value;_vuTplId=null;_vuActiveTab=0;renderVirtualOrgUnified()"
          style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px;font-weight:700;background:white;cursor:pointer;flex:1;min-width:0">
          <option value="all" ${_vuPurposeFilter === "all" ? "selected" : ""}>전체</option>
          <option value="edu_support" ${_vuPurposeFilter === "edu_support" ? "selected" : ""}>교육지원</option>
          <option value="cert" ${_vuPurposeFilter === "cert" ? "selected" : ""}>자격증</option>
          <option value="badge" ${_vuPurposeFilter === "badge" ? "selected" : ""}>뱃지</option>
          <option value="language" ${_vuPurposeFilter === "language" ? "selected" : ""}>어학</option>
        </select>
      </div>
    </div>
    <div style="padding:6px 8px" id="vu-tpl-list-container">
      ${
        filteredTplList.length
          ? filteredTplList
              .map((t, idx) => {
                const pc =
                  purposeColors[t.purpose] || purposeColors.edu_support;
                const isActive = t.id === _vuTplId;
                return `
      <div draggable="true"
        data-tpl-id="${t.id}"
        data-tpl-idx="${idx}"
        onclick="if(!_vuIsDragging)_vuSelectTpl('${t.id}')"
        ondragstart="_vuDragStart(event,'${t.id}')"
        ondragover="_vuDragOver(event)"
        ondragleave="_vuDragLeave(event)"
        ondrop="_vuDrop(event,'${t.id}')"
        style="padding:12px 14px;border-radius:10px;margin-bottom:6px;cursor:grab;transition:all .12s;
               background:${isActive ? "#EFF6FF" : "#fff"};
               border:1.5px solid ${isActive ? "#BFDBFE" : "#F3F4F6"};
               ${isActive ? "box-shadow:0 2px 8px rgba(29,78,216,.08)" : ""}
               user-select:none;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span style="color:#CBD5E1;font-size:12px;cursor:grab" title="드래그하여 순서 변경">⠿⠿</span>
          <div style="font-size:13px;font-weight:${isActive ? 900 : 600};color:${isActive ? "#1D4ED8" : "#374151"};flex:1">${t.name}</div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;padding-left:18px">
          <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:${pc.bg};color:${pc.text}">${pc.label}</span>
          <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:#F3F4F6;color:#6B7280">${(t.tree?.hqs || t.tree?.centers || []).length}개 조직</span>
        </div>
      </div>`;
              })
              .join("")
          : `
      <div style="padding:30px 14px;text-align:center;color:#9CA3AF">
        <div style="font-size:28px;margin-bottom:8px">📋</div>
        <div style="font-size:12px;font-weight:700">등록된 제도그룹이 없습니다</div>
        <div style="font-size:11px;margin-top:4px">상단 '+ 생성' 버튼으로 추가하세요</div>
      </div>`
      }
    </div>
  </div>

  <!-- ═══ 우측: 탭 기반 상세 관리 ═══ -->
  <div style="flex:1;overflow-y:auto">
    ${
      curTpl
        ? `
    <!-- 탭 헤더 -->
    <div style="padding:16px 24px 0;border-bottom:1.5px solid #E5E7EB;background:#fff;position:sticky;top:0;z-index:10">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <h2 style="font-size:18px;font-weight:900;margin:0;color:#111827">${curTpl.name}</h2>
        <span style="font-size:10px;padding:3px 10px;border-radius:6px;font-weight:700;background:${(purposeColors[purpose] || purposeColors.edu_support).bg};color:${(purposeColors[purpose] || purposeColors.edu_support).text}">${(purposeColors[purpose] || purposeColors.edu_support).label}</span>
        <button onclick="voOpenEditTemplate('${curTpl.id}')" style="margin-left:auto;padding:5px 12px;border:1.5px solid #E5E7EB;border-radius:7px;background:#fff;font-size:11px;font-weight:700;cursor:pointer;color:#6B7280">⚙ 설정 수정</button>
      </div>
      <div id="vu-tab-buttons" style="display:flex;gap:0">
        ${tabs
          .map(
            (tab, i) => `
        <button onclick="_vuSwitchTab(${i})"
          style="padding:10px 18px;font-size:12px;font-weight:${_vuActiveTab === i ? 900 : 600};
                 color:${_vuActiveTab === i ? "#1D4ED8" : "#6B7280"};
                 border:none;background:none;cursor:pointer;position:relative;
                 border-bottom:${_vuActiveTab === i ? "3px solid #1D4ED8" : "3px solid transparent"};
                 transition:all .15s">${tab.icon} ${tab.label}</button>`,
          )
          .join("")}
      </div>
    </div>
    <!-- 탭 콘텐츠 -->
    <div id="vu-tab-content" style="padding:20px 24px">
      ${_vuRenderTabContent(tabs[_vuActiveTab]?.key, curTpl)}
    </div>
    `
        : `
    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CA3AF">
      <div style="text-align:center">
        <div style="font-size:48px;margin-bottom:12px">🏗️</div>
        <div style="font-size:15px;font-weight:700">좌측에서 제도그룹을 선택하세요</div>
        <div style="font-size:12px;margin-top:6px">또는 '+ 생성' 버튼으로 새 제도그룹을 만드세요</div>
      </div>
    </div>`
    }
  </div>
</div>

<!-- 신규 생성 모달 -->
${_vuCreateModal()}
${_vuEditModal()}
${_vuOrgPickerModal()}
${_vuUserPickerModal()}
`;
}

// ── 제도그룹 선택·탭 전환 ────────────────────────────────────────────────────
function _vuSelectTpl(tplId) {
  _vuTplId = tplId;
  _vuActiveTab = 0;
  renderVirtualOrgUnified();
}

function _vuSwitchTab(idx) {
  _vuActiveTab = idx;
  const curTpl = _vuTplList.find((t) => t.id === _vuTplId);
  if (!curTpl) return;
  const tabs = _vuGetTabs(curTpl.purpose);
  const el = document.getElementById("vu-tab-content");
  if (el) el.innerHTML = _vuRenderTabContent(tabs[idx]?.key, curTpl);

  // 탭 버튼 밑줄 UI 갱신
  const tabContainer = document.getElementById("vu-tab-buttons");
  if (tabContainer) {
    const btns = tabContainer.querySelectorAll("button");
    btns.forEach((btn, i) => {
      btn.style.fontWeight = i === idx ? "900" : "600";
      btn.style.color = i === idx ? "#1D4ED8" : "#6B7280";
      btn.style.borderBottom =
        i === idx ? "3px solid #1D4ED8" : "3px solid transparent";
    });
  }

  // 탭 버튼 스타일만 갱신
  const btns = document.querySelectorAll("[data-vu-tab-btn]");
  btns.forEach((btn, i) => {
    btn.style.fontWeight = i === idx ? 900 : 600;
    btn.style.color = i === idx ? "#1D4ED8" : "#6B7280";
    btn.style.borderBottom =
      i === idx ? "3px solid #1D4ED8" : "3px solid transparent";
  });
}

// ── 탭 콘텐츠 렌더 ─────────────────────────────────────────────────────────
function _vuRenderTabContent(tabKey, tpl) {
  if (!tpl) return "";
  switch (tabKey) {
    case "info":
      return _vuTabInfo(tpl);
    case "org":
      return _vuTabOrg(tpl);
    case "coop":
      return _vuTabCoop(tpl);
    case "mgr":
      return _vuTabManager(tpl);
    default:
      return '<div style="padding:40px;text-align:center;color:#9CA3AF">준비 중입니다</div>';
  }
}

// ═══ 탭①: 기본정보 ═══════════════════════════════════════════════════════════
function _vuTabInfo(tpl) {
  const purposeLabels = {
    edu_support: "교육지원",
    language: "어학",
    cert: "자격증",
    badge: "배지",
    교육지원: "교육지원",
  };
  const types = tpl.serviceTypes || [tpl.purpose];
  const roleIds = tpl.ownerRoleIds || [];
  const headRole = tpl.headManagerRole || null;
  // 복수 총괄담당자 지원: headManagerUsers(array) 우선, 없으면 headManagerUser(단일) 호환
  const headUsers = Array.isArray(tpl.headManagerUsers)
    ? tpl.headManagerUsers
    : tpl.headManagerUser
      ? [tpl.headManagerUser]
      : [];
  return `
<div style="max-width:640px">
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 16px">📋 기본정보</h3>
  <div class="bo-card" style="padding:20px">
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">제도그룹 명칭</label>
      <div style="font-size:15px;font-weight:800;color:#111827;padding:8px 0">${tpl.name}</div>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:8px">용도 (제도유형)</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${types
          .map((t) => {
            const colors = {
              edu_support: "#1D4ED8",
              language: "#059669",
              cert: "#C2410C",
              badge: "#7C3AED",
            };
            const bgs = {
              edu_support: "#EFF6FF",
              language: "#F0FDF4",
              cert: "#FFF7ED",
              badge: "#F5F3FF",
            };
            return `<span style="padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;background:${bgs[t] || "#F3F4F6"};color:${colors[t] || "#374151"};border:1.5px solid ${colors[t] || "#E5E7EB"}30">${purposeLabels[t] || t}</span>`;
          })
          .join("")}
      </div>
    </div>
    <div style="margin-bottom:0">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:4px">맵핑 역할</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 0">
        ${roleIds.length ? roleIds.map((r) => `<code style="background:#F3F4F6;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700">${r}</code>`).join("") : '<span style="color:#9CA3AF;font-size:12px">미설정</span>'}
      </div>
    </div>
  </div>

  <!-- ── 총괄담당자 설정 ── -->
  <div class="bo-card" style="padding:20px;margin-top:12px;border-left:4px solid #C2410C">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span style="font-size:13px;font-weight:800;color:#C2410C">👑 총괄담당자 설정</span>
      <button onclick="_vuOpenHeadManagerSelector('${tpl.id}')" style="padding:5px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:#C2410C">${headUsers.length ? "+ 추가/변경" : "+ 설정"}</button>
    </div>
    ${
      headRole
        ? `
    <div style="margin-bottom:10px">
      <span style="font-size:10px;font-weight:700;color:#9CA3AF;display:block;margin-bottom:4px">담당 역할</span>
      <code style="background:#FFF7ED;border:1px solid #FED7AA;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;color:#C2410C">${headRole.name} (${headRole.code})</code>
    </div>`
        : ""
    }
    ${
      headUsers.length
        ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${headUsers
        .map(
          (u, idx) => `
      <span style="padding:7px 14px;background:#fff;border:1.5px solid #C2410C;border-radius:8px;font-size:13px;font-weight:700;color:#C2410C;display:flex;align-items:center;gap:6px">
        👑 ${u.name} <span style="font-size:10px;color:#9CA3AF">${u.dept || ""}</span>
        ${u.start_date || u.end_date ? `<span style="font-size:9px;color:#94A3B8;font-weight:400">${u.start_date || ""} ~ ${u.end_date || ""}</span>` : ""}
        <button onclick="_vuRemoveOneHeadManager('${tpl.id}', ${idx})" style="border:none;background:none;color:#C2410C;cursor:pointer;font-size:11px;padding:0 2px" title="이 담당자 해제">✕</button>
      </span>`,
        )
        .join("")}
    </div>`
        : '<span style="font-size:12px;color:#9CA3AF">총괄담당자가 설정되지 않았습니다.<br><small>💡 총괄담당자 설정 후 ③ 담당자 탭에서 운영담당자를 추가할 수 있습니다.</small></span>'
    }
  </div>

  <div style="margin-top:12px;text-align:right">
    <button onclick="voOpenEditTemplate('${tpl.id}')" class="bo-btn-secondary bo-btn-sm">⚙ 설정 수정</button>
  </div>
</div>`;
}

// ═══ 탭②: 교육조직 구성 (트리 체크박스 뷰) ═══════════════════════════════════
// 전역 캐시: 조직도 트리 (탭 진입 시 한 번 로드)
let _vuOrgTreeCache = null;
let _vuOrgFlatCache = {};

async function _vuEnsureOrgTree() {
  if (_vuOrgTreeCache) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const { data } = await sb
      .from("organizations")
      .select("id,name,parent_id,type,tenant_id,org_type,org_code")
      .eq("tenant_id", _vuTenantId)
      .order("name");
    if (!data || !data.length) return;
    _vuOrgFlatCache = {};
    data.forEach((o) => {
      _vuOrgFlatCache[o.id] = { ...o, children: [] };
    });
    const roots = [];
    data.forEach((o) => {
      if (o.parent_id && _vuOrgFlatCache[o.parent_id]) {
        _vuOrgFlatCache[o.parent_id].children.push(_vuOrgFlatCache[o.id]);
      } else {
        roots.push(_vuOrgFlatCache[o.id]);
      }
    });
    _vuOrgTreeCache = roots;
  } catch (e) {
    console.warn("조직도 로드 실패:", e.message);
  }
}

function _vuCountLeafs(nodes) {
  let arr = [];
  nodes.forEach((n) => {
    if (!n.children || !n.children.length) arr.push(n);
    else arr.push(..._vuCountLeafs(n.children));
  });
  return arr;
}

function _vuTabOrg(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  if (!_vuOrgTreeCache) {
    _vuEnsureOrgTree().then(() => {
      const tabEl = document.getElementById("vu-tab-content");
      if (tabEl) tabEl.innerHTML = _vuTabOrg(tpl);
    });
    return `<div style="padding:30px;text-align:center;color:#9CA3AF;font-size:12px">🔄 조직도 로딩 중...</div>`;
  }
  const allLeafs = _vuCountLeafs(_vuOrgTreeCache);
  const totalLeafCount = allLeafs.length;

  // 전체 VOrg 에서 맵핑된 팀 ID 수집 (중복 방지용)
  const globalMapped = _vuGetGlobalMappedTeams(null, -1);

  return `
<div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0">🏗️ 교육조직 구성</h3>
    <div style="display:flex;gap:8px">
      <button onclick="_vuCleanupDuplicateMappings('${tpl.id}')" class="bo-btn-secondary bo-btn-sm" style="color:#D97706;border-color:#FDE68A;font-size:10px" title="여러 교육조직에 중복 맵핑된 팀을 자동 정리합니다">🔧 중복 정리</button>
      <button onclick="_vuAddGroup('${tpl.id}')" class="bo-btn-primary bo-btn-sm">+ 가상 본부 추가</button>
    </div>
  </div>

  ${
    groups.length
      ? groups
          .map((g, gi) => {
            const teams = g.teams || [];
            const mappedCount = teams.length;
            const pct =
              totalLeafCount > 0
                ? Math.round((mappedCount / totalLeafCount) * 100)
                : 0;

            // breadcrumb 경로 계산 (org ID -> ancestors)
            const teamCards = teams.map((t) => {
              const orgNode = _vuOrgFlatCache[t.id];
              const isDeprecated = orgNode?.status === "deprecated";
              // 상위경로 breadcrumb
              const breadcrumb = _vuBuildBreadcrumb(t.id);

              if (isDeprecated) {
                return {
                  deprecated: true,
                  html: `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
                    background:#FFF7ED;border:1.5px solid #FDE68A;margin-bottom:6px">
          <span style="font-size:13px">⚠️</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:#D97706;font-weight:700;margin-bottom:2px">미사용 조직 (조직개편)</div>
            <div style="font-size:11px;color:#9CA3AF;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${breadcrumb}</div>
            <div style="font-size:12px;font-weight:700;color:#92400E">${t.name}</div>
          </div>
          <button onclick="_vuRemoveTeamWithCheck('${tpl.id}',${gi},'${t.id}')" style="padding:3px 8px;font-size:10px;border:1px solid #FDE68A;border-radius:5px;background:#FFFBEB;color:#D97706;cursor:pointer;flex-shrink:0">이관 후 해제</button>
        </div>`,
                };
              }
              return {
                deprecated: false,
                html: `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
                  background:#F0FDF4;border:1.5px solid #A7F3D0;margin-bottom:6px">
        <span style="font-size:13px">✅</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:10px;color:#6B7280;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${breadcrumb}</div>
          <div style="font-size:12px;font-weight:700;color:#065F46">${t.name}${orgNode?.org_type === "general" ? ' <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:#EDE9FE;color:#7C3AED;border:1px solid #DDD6FE">🔗 총괄</span>' : ""}</div>
        </div>
        <button onclick="_vuRemoveTeamWithCheck('${tpl.id}',${gi},'${t.id}')" style="padding:3px 8px;font-size:10px;border:1px solid #D1D5DB;border-radius:5px;background:#fff;color:#6B7280;cursor:pointer;flex-shrink:0" title="맵핑 해제">✕ 해제</button>
      </div>`,
              };
            });

            const normalCards = teamCards
              .filter((c) => !c.deprecated)
              .map((c) => c.html)
              .join("");
            const deprecatedCards = teamCards
              .filter((c) => c.deprecated)
              .map((c) => c.html)
              .join("");

            return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:14px;border-left:4px solid #1D4ED8">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px">🏢</span>
        <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${mappedCount}팀</span>
        ${g.managers ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">담당자 ${g.managers.length}명</span>` : ""}
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="_vuMapTeams('${tpl.id}',${gi})" style="padding:5px 12px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:#1D4ED8">+ 팀 맵핑</button>
        <button onclick="_vuEditGroup('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm">수정</button>
        <button onclick="_vuDeleteGroup('${tpl.id}',${gi})" class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#FCA5A5">삭제</button>
      </div>
    </div>

    <!-- 맵핑된 팀 목록 -->
    <div style="padding:4px 0">
      ${
        normalCards ||
        `<div style="padding:20px;text-align:center;background:#F9FAFB;border:1.5px dashed #E5E7EB;border-radius:10px;color:#9CA3AF;font-size:12px">
        맵핑된 팀이 없습니다. <br><span style="font-size:11px">위 [+ 팀 맵핑] 버튼으로 팀을 추가하세요</span></div>`
      }
      ${
        deprecatedCards
          ? `
      <div style="margin-top:10px;padding:10px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px">
        <div style="font-size:10px;font-weight:800;color:#D97706;margin-bottom:8px">⚠️ 조직개편 대상 (폐지된 팀)</div>
        ${deprecatedCards}
      </div>`
          : ""
      }
    </div>
  </div>`;
          })
          .join("")
      : `
  <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
    <div style="font-size:32px;margin-bottom:8px">🏗️</div>
    <div style="font-size:13px;font-weight:700;color:#6B7280">교육조직이 없습니다</div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:4px">+ 가상 본부 추가 버튼으로 조직을 구성하세요</div>
  </div>`
  }
</div>`;
}

// 조직 ID -> 상위 경로 breadcrumb 문자열 생성
function _vuBuildBreadcrumb(orgId) {
  const parts = [];
  let cur = _vuOrgFlatCache[orgId];
  // 현재 노드 제외하고 상위만 탐색
  if (cur && cur.parent_id) {
    let p = _vuOrgFlatCache[cur.parent_id];
    while (p) {
      parts.unshift(p.name);
      p = p.parent_id ? _vuOrgFlatCache[p.parent_id] : null;
    }
  }
  return parts.length ? parts.join(" > ") : "";
}

// 같은 제도그룹(템플릿) 내에서 다른 교육조직(HQ)에 맵핑된 팀만 수집
// → 다른 제도그룹 간 중복 맵핑은 허용 (비즈니스 규칙)
function _vuGetGlobalMappedTeams(excludeTplId, excludeGi) {
  const mapped = {}; // { teamId: "제도그룹 명칭 > 그룹명" }
  const tpl = _vuTplList.find((t) => t.id === excludeTplId);
  if (!tpl) return mapped;
  (tpl.tree?.hqs || []).forEach((group, gi) => {
    if (gi === excludeGi) return; // 현재 편집 중인 HQ 제외
    (group.teams || []).forEach((team) => {
      mapped[team.id] = `${tpl.name} > ${group.name}`;
    });
  });
  return mapped;
}

// 중복 맵핑 자동 정리: 같은 팀이 여러 VOrg에 맵핑된 경우 나중 것은 제거
async function _vuCleanupDuplicateMappings(tplId) {
  const seenIds = {}; // teamId -> "tplName > groupName"
  let removedCount = 0;
  const toSave = [];

  // 전체 제도그룹 순회, 먼저 나오는 쪽을 우선 유지
  _vuTplList.forEach((tpl) => {
    const hqs = tpl.tree?.hqs || [];
    let tplModified = false;
    hqs.forEach((g) => {
      const before = (g.teams || []).length;
      g.teams = (g.teams || []).filter((team) => {
        if (seenIds[team.id]) {
          removedCount++;
          tplModified = true;
          console.log(
            `[중복제거] ${team.name} : ${seenIds[team.id]} 에서 이미 맵핑됨 -> ${tpl.name} > ${g.name} 에서 제거`,
          );
          return false;
        }
        seenIds[team.id] = `${tpl.name} > ${g.name}`;
        return true;
      });
    });
    if (tplModified) toSave.push(tpl);
  });

  if (removedCount === 0) {
    alert("중복 맵핑된 팀이 없습니다.");
    return;
  }

  // 수정된 제도그룹 저장
  for (const tpl of toSave) {
    await _vuAutoSave(tpl);
  }
  alert(`✅ ${removedCount}건의 중복 맵핑이 정리되었습니다.`);
  _vuSwitchTab(_vuActiveTab);
}

// 팀 해제 시 통장 잔액/동결 체크 후 처리
async function _vuRemoveTeamWithCheck(tplId, gi, teamId) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const team = (g.teams || []).find((t) => t.id === teamId);
  if (!team) return;

  // 통장 잔액/동결 조회
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data: bbs } = await sb
        .from("org_budget_bankbooks")
        .select("id,org_name")
        .eq("org_id", teamId)
        .eq("template_id", tplId)
        .eq("status", "active");

      if (bbs && bbs.length > 0) {
        const bbIds = bbs.map((b) => b.id);
        const { data: allocs } = await sb
          .from("budget_allocations")
          .select("bankbook_id,allocated_amount,used_amount,frozen_amount")
          .in("bankbook_id", bbIds);

        let totalFrozen = 0,
          totalBalance = 0;
        (allocs || []).forEach((a) => {
          const alloc = Number(a.allocated_amount || 0);
          const used = Number(a.used_amount || 0);
          const frozen = Number(a.frozen_amount || 0);
          totalFrozen += frozen;
          totalBalance += alloc - used - frozen;
        });
        const fmt = (n) => Number(n).toLocaleString();

        if (totalFrozen > 0) {
          alert(
            `⛔ "${team.name}" 통장에 동결 예산 ${fmt(totalFrozen)}원이 있습니다.\n→ 진행 중인 교육이 완료될 때까지 해제할 수 없습니다.`,
          );
          return;
        }
        if (totalBalance > 0) {
          const ok = confirm(
            `⚠️ "${team.name}" 통장에 잔액 ${fmt(totalBalance)}원이 있습니다.\n\n예산 배정 현황에서 다른 조직으로 이관 후 해제하시겠습니까?\n\n[확인]: 이관 처리 없이 강제 해제 (잔액 회수됨)\n[취소]: 취소`,
          );
          if (!ok) return;
          // 잔액 강제 회수 + 통장 비활성화
          for (const bb of bbs) {
            const alloc = (allocs || []).find((a) => a.bankbook_id === bb.id);
            if (alloc) {
              const allocated = Number(alloc.allocated_amount || 0);
              await sb
                .from("budget_allocations")
                .update({ allocated_amount: 0 })
                .eq("bankbook_id", bb.id);
              await sb.from("budget_allocation_log").insert({
                allocation_id: (
                  await sb
                    .from("budget_allocations")
                    .select("id")
                    .eq("bankbook_id", bb.id)
                    .single()
                ).data?.id,
                action: "adjust",
                amount: -allocated,
                prev_balance: allocated,
                new_balance: 0,
                reason: "교육조직 팀 해제 - 잔액 회수",
                performed_by: boCurrentPersona?.name || "",
              });
            }
            await sb
              .from("org_budget_bankbooks")
              .update({ status: "inactive" })
              .eq("id", bb.id);
          }
        } else {
          // 잔액 없음: 통장만 비활성화
          for (const bb of bbs) {
            await sb
              .from("org_budget_bankbooks")
              .update({ status: "inactive" })
              .eq("id", bb.id);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[팀 해제] 통장 처리 실패:", e.message);
  }

  // tree_data에서 팀 제거
  g.teams = (g.teams || []).filter((t) => t.id !== teamId);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuToggleTreeCollapse(id, headerEl) {
  const el = document.getElementById(id);
  if (!el) return;
  const arrow = headerEl.querySelector(".vu-collapse-arrow");
  if (el.style.display === "none") {
    el.style.display = "";
    if (arrow) arrow.style.transform = "";
  } else {
    el.style.display = "none";
    if (arrow) arrow.style.transform = "rotate(-90deg)";
  }
}

// ═══ 탭④: 협조처 ════════════════════════════════════════════════════════════
function _vuTabCoop(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  return `
<div>
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 4px">🤝 협조처 관리</h3>
  <p style="font-size:11px;color:#6B7280;margin:0 0 6px">각 교육조직(본부)별 결재 시 협조가 필요한 팀을 지정합니다.</p>
  <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;padding:3px 10px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-weight:700;border:1px solid #BFDBFE">\ud83d\udcda \uad50\uc721\ud611\uc870\ucc98</span></div>
    <div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;padding:3px 10px;border-radius:6px;background:#FFFBEB;color:#92400E;font-weight:700;border:1px solid #FDE68A">\ud83d\udcb0 \uc7ac\uacbd\ud611\uc870\ud300</span></div>
    <div style="display:flex;align-items:center;gap:3px"><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FEF2F2;color:#EF4444;font-weight:700;border:1px solid #FECACA">\ud83d\udd34 \ud544\uc218</span><span style="font-size:10px;color:#9CA3AF">\ud56d\uc0c1 \ud611\uc870\ucc98</span></div>
    <div style="display:flex;align-items:center;gap:3px"><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#3B82F6;font-weight:700;border:1px solid #DBEAFE">\ud83d\udd35 \uc870\uac74\ubd80</span><span style="font-size:10px;color:#9CA3AF">\ud611\uc870/\ucc38\uc870 \uc804\ud658</span></div>
  </div>
  ${
    groups.length
      ? groups
          .map((g, gi) => {
            const coopTeams = g.coopTeams || [];
            return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:16px">🏢</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
      <span style="font-size:10px;color:#9CA3AF">${tpl.name}</span>
      <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">${coopTeams.length}개</span>
      <button onclick="_vuOpenCoopAddModal('${tpl.id}',${gi})" style="margin-left:auto;padding:4px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;color:#D97706">+ 협조처 추가</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${
        coopTeams.length
          ? coopTeams
              .map((ct, ci) => {
                const cType = ct.coopType || "\uad50\uc721\ud611\uc870\ucc98";
                const isJK =
                  cType === "\uc7ac\uacbd\ud611\uc870\ud300" ||
                  cType === "\uc7ac\uacbd\ud611\uc870\ucc98";
                const tc = isJK
                  ? {
                      bg: "#FFFBEB",
                      bdr: "#FDE68A",
                      txt: "#92400E",
                      icn: "\ud83d\udcb0",
                    }
                  : {
                      bg: "#EFF6FF",
                      bdr: "#BFDBFE",
                      txt: "#1D4ED8",
                      icn: "\ud83d\udcda",
                    };
                const rq = ct.required === "\ud544\uc218";
                const rqIsConditional = ct.required === "\uc870\uac74\ubd80";
                return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${tc.bg};border:1px solid ${tc.bdr};border-radius:10px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1">
          <span style="font-weight:800;font-size:13px;color:#111827">${ct.name || ct.teamName || ct}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${tc.bdr};color:${tc.txt};font-weight:700">${tc.icn} ${cType}</span>
          <span style="font-size:10px;padding:2px 8px;border-radius:6px;color:${rq ? "#EF4444" : rqIsConditional ? "#3B82F6" : "#6B7280"};font-weight:700;background:${rq ? "#FEF2F2" : rqIsConditional ? "#EFF6FF" : "#F3F4F6"};border:1px solid ${rq ? "#FECACA" : rqIsConditional ? "#DBEAFE" : "#E5E7EB"}">${rq ? "\ud83d\udd34 \ud544\uc218\ud611\uc870\ucc98" : rqIsConditional ? "\ud83d\udd35 \uc870\uac74\ubd80" : "\u26aa \uc120\ud0dd"}</span>
          ${ct.role && ct.role !== "\ud611\uc870" ? '<span style="font-size:10px;color:#6B7280">' + ct.role + "</span>" : ""}
        </div>
        <button onclick="_vuRemoveCoop('${tpl.id}',${gi},${ci})" style="border:none;background:none;color:#D1D5DB;cursor:pointer;font-size:14px;flex-shrink:0">\u2715</button>
      </div>`;
              })
              .join("")
          : '<div style="padding:20px;text-align:center;background:#F9FAFB;border:1.5px dashed #E5E7EB;border-radius:10px;color:#9CA3AF;font-size:12px">\ub4f1\ub85d\ub41c \ud611\uc870\ucc98\uac00 \uc5c6\uc2b5\ub2c8\ub2e4</div>'
      }
    </div>
  </div>`;
          })
          .join("")
      : '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:700">② 교육조직 구성 탭에서 조직을 먼저 추가하세요</div>'
  }
</div>`;
}

// ═══ 탭④: 담당자 ════════════════════════════════════════════════════════════
function _vuTabManager(tpl) {
  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  const headUser = tpl.headManagerUser || null;
  const headRole = tpl.headManagerRole || null;
  return `
<div>
  <h3 style="font-size:14px;font-weight:900;color:#111827;margin:0 0 4px">👤 담당자 관리</h3>
  ${headRole ? `<p style="font-size:11px;color:#6B7280;margin:0 0 16px">총괄담당자 역할: <code style="background:#FFF7ED;color:#C2410C;padding:2px 8px;border-radius:4px;font-size:10px">${headRole.name}</code> ${headUser ? "· 담당자: <b>" + headUser.name + "</b>" : ""}</p>` : '<p style="font-size:11px;color:#EF4444;margin:0 0 16px">⚠ 기본정보 탭에서 총괄담당자를 먼저 설정하세요</p>'}
  ${
    groups.length
      ? groups
          .map((g, gi) => {
            const managers = g.managers || [];
            const hasHeadRole = !!headRole;
            return `
  <div class="bo-card" style="padding:16px 20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:16px">🏢</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
      <span style="font-size:10px;color:#9CA3AF">${tpl.name}</span>
    </div>
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:11px;font-weight:800;color:#059669">👤 운영담당자</span>
        <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#D1FAE5;color:#065F46;font-weight:700">${managers.length}명</span>
        ${hasHeadRole ? `<button onclick="_vuAddManager('${tpl.id}',${gi})" style="margin-left:auto;padding:4px 10px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:6px;font-size:10px;font-weight:700;cursor:pointer;color:#059669">+ 운영담당자 추가</button>` : '<span style="margin-left:auto;font-size:10px;color:#9CA3AF">기본정보에서 총괄담당자 설정 필요</span>'}
      </div>
      ${hasHeadRole ? '<div style="font-size:10px;color:#6B7280;margin-bottom:6px;padding-left:2px">💡 총괄담당자 역할의 하위 운영 권한을 가진 사용자를 선택합니다</div>' : ""}
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${
          managers
            .map(
              (m, mi) => `
        <span style="padding:5px 10px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:7px;font-size:11px;font-weight:600;color:#065F46;display:flex;align-items:center;gap:4px">
          ${m.name || m} ${m.dept ? '<span style="font-size:9px;color:#9CA3AF">' + m.dept + "</span>" : ""}
          <button onclick="_vuRemoveManager('${tpl.id}',${gi},${mi})" style="border:none;background:none;color:#059669;cursor:pointer;font-size:10px;padding:0">✕</button>
        </span>`,
            )
            .join("") ||
          '<span style="font-size:11px;color:#9CA3AF">등록된 운영담당자가 없습니다</span>'
        }
      </div>
    </div>
  </div>`;
          })
          .join("")
      : '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:700">② 교육조직 구성 탭에서 조직을 먼저 추가하세요</div>'
  }
</div>`;
}

// ── 조직 관리 액션 함수들 (stub → 기존 함수 연동) ───────────────────────────
function _vuAddGroup(tplId) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const name = prompt("가상 본부 이름을 입력하세요:");
  if (!name) return;
  if (!tpl.tree.hqs) tpl.tree.hqs = [];
  tpl.tree.hqs.push({
    id: "VG-" + Date.now(),
    name,
    teams: [],
    coopTeams: [],
    managers: [],
  });
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuEditGroup(tplId, gi) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const newName = prompt("조직 이름 수정:", g.name);
  if (!newName) return;
  g.name = newName;
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuDeleteGroup(tplId, gi) {
  if (!confirm("이 교육조직을 삭제하시겠습니까?")) return;
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl || !tpl.tree?.hqs) return;
  tpl.tree.hqs.splice(gi, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

function _vuMapTeams(tplId, gi) {
  window._vuPickerTplId = tplId;
  window._vuPickerGi = gi;
  window._vuPickerMode = "team";
  _vuShowOrgPicker("팀 매핑 - 조직도에서 선택");
}

function _vuRemoveTeam(tplId, gi, teamId) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.teams) return;
  g.teams = g.teams.filter((t) => t.id !== teamId);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// ── 협조처·담당자 액션 ──────────────────────────────────────────────────────
// 협조처 추가: 조직 피커를 열면서 상단에 유형/구분 인라인 표시
function _vuOpenCoopAddModal(tplId, gi) {
  window._vuPickerTplId = tplId;
  window._vuPickerGi = gi;
  window._vuPickerMode = "coop";
  // 기본값 세팅
  window._vuCoopType = "\uad50\uc721\ud611\uc870\ucc98";
  window._vuCoopRequired = "\ud544\uc218";
  _vuShowOrgPicker("\ud611\uc870\ucc98 \ucd94\uac00 - \ud300 \uc120\ud0dd");
}

// 기존 호환
function _vuAddCoop(tplId, gi) {
  _vuOpenCoopAddModal(tplId, gi);
}

function _vuRemoveCoop(tplId, gi, ci) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.coopTeams) return;
  g.coopTeams.splice(ci, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// 운영담당자 추가 - 기본정보의 총괄담당자 역할 하위 사용자만 필터링
function _vuAddManager(tplId, gi) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const headRole = tpl.headManagerRole;
  if (!headRole) {
    alert("기본정보 탭에서 총괄담당자를 먼저 설정해주세요.");
    return;
  }
  window._vuPickerTplId = tplId;
  window._vuPickerGi = gi;
  window._vuPickerMode = "manager";
  // 총괄담당자 역할 코드를 기준으로 하위 운영담당자 필터링
  window._vuHeadRoleCode = headRole.code;
  _vuShowUserPicker("운영담당자 추가", "op_manager");
}

// 기본정보 총괄담당자 전체 초기화
async function _vuClearHeadManagerInfo(tplId) {
  if (
    !confirm(
      "총괄담당자 설정을 전체 초기화하시겠습니까? (부여된 권한도 함께 회수됩니다)",
    )
  )
    return;
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;

  const headUsers = Array.isArray(tpl.headManagerUsers)
    ? tpl.headManagerUsers
    : tpl.headManagerUser
      ? [tpl.headManagerUser]
      : [];

  if (headUsers.length && tpl.headManagerRole) {
    try {
      if (_sb()) {
        for (const u of headUsers) {
          await _sb()
            .from("user_roles")
            .delete()
            .eq("user_id", u.id)
            .eq("role_code", tpl.headManagerRole.code)
            .eq("scope_id", tplId);
        }
      }
    } catch (e) {
      console.warn("총괄담당자 권한 회수 실패:", e.message);
    }
  }

  tpl.headManagerRole = null;
  tpl.headManagerUser = null;
  tpl.headManagerUsers = [];
  _vuAutoSaveTplMeta(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// 개별 총괄담당자 해제
async function _vuRemoveOneHeadManager(tplId, idx) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const headUsers = Array.isArray(tpl.headManagerUsers)
    ? tpl.headManagerUsers
    : tpl.headManagerUser
      ? [tpl.headManagerUser]
      : [];
  const target = headUsers[idx];
  if (!target) return;
  if (
    !confirm(
      `${target.name} 총괄담당자를 해제하시겠습니까? (권한도 함께 회수됩니다)`,
    )
  )
    return;

  if (tpl.headManagerRole) {
    try {
      if (_sb()) {
        await _sb()
          .from("user_roles")
          .delete()
          .eq("user_id", target.id)
          .eq("role_code", tpl.headManagerRole.code)
          .eq("scope_id", tplId);
      }
    } catch (e) {
      console.warn("개별 총괄담당자 권한 회수 실패:", e.message);
    }
  }

  headUsers.splice(idx, 1);
  tpl.headManagerUsers = headUsers;
  // 호환성: 단일 필드도 동기화
  tpl.headManagerUser = headUsers.length ? headUsers[0] : null;
  if (!headUsers.length) tpl.headManagerRole = null;
  _vuAutoSaveTplMeta(tpl);
  _vuSwitchTab(_vuActiveTab);
}

async function _vuRemoveManager(tplId, gi, mi) {
  if (
    !confirm("운영담당자를 삭제하시겠습니까? (부여된 권한도 함께 회수됩니다)")
  )
    return;
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.managers) return;

  const removedManager = g.managers[mi];

  if (removedManager && window._vuHeadRoleCode) {
    try {
      if (_sb()) {
        const { data: childRoles } = await _sb()
          .from("roles")
          .select("code")
          .eq("parent_role_id", window._vuHeadRoleCode);
        if (childRoles && childRoles.length > 0) {
          const opCode =
            childRoles.find((r) => r.role_level_type === "ops")?.code ||
            childRoles[0].code;
          await _sb()
            .from("user_roles")
            .delete()
            .eq("user_id", removedManager.id)
            .eq("role_code", opCode)
            .eq("scope_id", tplId);
        }
      }
    } catch (e) {
      console.warn("운영담당자 권한 회수 실패:", e.message);
    }
  }

  g.managers.splice(mi, 1);
  _vuAutoSave(tpl);
  _vuSwitchTab(_vuActiveTab);
}

// ── DB 자동저장 (tree_data) + 통장 자동 동기화 ──────────────────────────────
async function _vuAutoSave(tpl) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb || !tpl) return;
    await sb
      .from("virtual_org_templates")
      .update({
        tree_data: tpl.tree,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tpl.id);
    // ✅ 팀 추가/변경 후 자동 통장 동기화 (계정이 있을 때만)
    if (typeof window._syncBankbooksForTemplate === "function") {
      try {
        await window._syncBankbooksForTemplate(tpl.id, _vuTenantId);
      } catch (e) {
        console.warn("[통장 동기화]", e.message);
      }
    }
  } catch (e) {
    console.warn("[VOU] 자동저장 실패:", e.message);
  }
}

// ── DB 자동저장 (메타 필드: headManagerRole, headManagerUser) ──────────────
async function _vuAutoSaveTplMeta(tpl) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb || !tpl) return;
    await sb
      .from("virtual_org_templates")
      .update({
        head_manager_role: tpl.headManagerRole || null,
        head_manager_user: tpl.headManagerUser || null,
        head_manager_users: tpl.headManagerUsers || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", tpl.id);
  } catch (e) {
    console.warn("[VOU] 메타 저장 실패:", e.message);
  }
}

// ── 총괄담당자 선택 (1단계: 역할 → 2단계: 사용자) ─────────────────────────
const _purposeToServiceType = {
  edu_support: "edu_support",
  교육지원: "edu_support",
  cert: "cert",
  자격증: "cert",
  language: "language",
  어학: "language",
  badge: "badge",
  배지: "badge",
};
const _serviceColors = {
  edu_support: "#1D4ED8",
  cert: "#C2410C",
  language: "#059669",
  badge: "#7C3AED",
  all: "#6B7280",
};
const _serviceLabels = {
  edu_support: "교육지원",
  cert: "자격증",
  language: "어학",
  badge: "배지",
  all: "공통",
};

async function _vuOpenHeadManagerSelector(tplId) {
  window._vuHeadSelectorTplId = tplId;
  document.getElementById("vu-head-mgr-modal")?.remove();

  // 현재 제도그룹의 service_type 파악
  const tpl = _vuTplList.find((t) => t.id === tplId);
  const tplSvcType =
    _purposeToServiceType[tpl?.purpose] || tpl?.purpose || null;
  const purposeLabel = _serviceLabels[tplSvcType] || tplSvcType || "전체";
  const purposeColor = _serviceColors[tplSvcType] || "#6B7280";

  // 역할 목록 로드 - 제도그룹 service_type 또는 'all'인 역할만
  let roles = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("roles")
        .select("code,name,parent_role_id,service_type,level,role_level_type")
        .eq("tenant_id", _vuTenantId)
        .order("level");
      if (data) {
        roles = data.filter((r) => {
          // 총괄 역할만 필터링
          if (r.role_level_type !== "head") return false;
          if (!r.service_type || r.service_type === "all") return true;
          return r.service_type === tplSvcType;
        });
      }
    }
  } catch (e) {
    console.warn("역할 로드 실패:", e.message);
  }

  const rolesHtml = roles.length
    ? roles
        .map((r) => {
          const sc = _serviceColors[r.service_type] || "#6B7280";
          const sl = _serviceLabels[r.service_type] || r.service_type || "";
          return `
    <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer"
           onmouseover="this.style.borderColor='#FED7AA';this.style.background='#FFF7ED'" onmouseout="this.style.borderColor='#E5E7EB';this.style.background='#fff'">
      <input type="radio" name="vu-head-role" value="${r.code}" data-name="${r.name.replace(/'/g, "&#39;")}" style="accent-color:#C2410C;width:15px;height:15px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:#111827">${r.name}</div>
        <div style="font-size:10px;color:#9CA3AF;font-family:monospace">${r.code}</div>
      </div>
      ${sl ? `<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px;background:${sc}18;color:${sc};border:1px solid ${sc}40;white-space:nowrap">${sl}</span>` : ""}
    </label>`;
        })
        .join("")
    : `<div style="padding:30px;text-align:center;color:#9CA3AF;font-size:12px">💡 ${purposeLabel} 용도에 맞는 역할이 없습니다<br><small>역할 관리 화면에서 제도유형을 설정해주세요</small></div>`;

  const modal = document.createElement("div");
  modal.id = "vu-head-mgr-modal";
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9500;display:flex;align-items:center;justify-content:center";
  modal.innerHTML = `
  <div style="background:#fff;border-radius:16px;width:540px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:8px">
          <h3 style="font-size:14px;font-weight:800;margin:0;color:#C2410C">👑 총괄담당자 설정</h3>
          <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:${purposeColor}18;color:${purposeColor};border:1px solid ${purposeColor}40">${purposeLabel} 역할</span>
        </div>
        <button onclick="document.getElementById('vu-head-mgr-modal').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <p style="font-size:11px;color:#6B7280;margin:0">1단계: 총괄 역할 선택 → 2단계: 해당 역할의 담당자 선택</p>
    </div>
    <div id="vu-head-step" style="padding:16px 20px;overflow-y:auto;flex:1">
      <div style="font-size:11px;font-weight:700;color:#374151;margin-bottom:8px">관리자 역할 선택 (${purposeLabel} 관리 권한)</div>
      <div style="display:flex;flex-direction:column;gap:6px">${rolesHtml}</div>
    </div>
    <div style="padding:12px 24px;border-top:1px solid #E5E7EB;display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('vu-head-mgr-modal').remove()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="_vuConfirmHeadManagerRole()" style="background:#C2410C;border-color:#C2410C">다음: 담당자 선택 →</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}

async function _vuConfirmHeadManagerRole() {
  const sel = document.querySelector('input[name="vu-head-role"]:checked');
  if (!sel) {
    alert("역할을 선택하세요.");
    return;
  }
  const roleCode = sel.value;
  const roleName = sel.dataset.name;
  const tplId = window._vuHeadSelectorTplId;

  // 모든 테넌트 소속 사용자 조회 (기존의 특정 역할 필터 제거)
  let users = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data: us, error: usErr } = await sb
        .from("users")
        .select("id,name,emp_no,org_id")
        .eq("tenant_id", _vuTenantId);
      if (usErr) console.warn("사용자 조회 오류:", usErr.message);
      const orgIds = (us || []).map((u) => u.org_id).filter(Boolean);
      let orgMap = {};
      if (orgIds.length) {
        const { data: orgs } = await sb
          .from("organizations")
          .select("id,name")
          .in("id", orgIds);
        (orgs || []).forEach((o) => {
          orgMap[o.id] = o.name;
        });
      }
      users = (us || []).map((u) => ({ ...u, dept: orgMap[u.org_id] || "" }));
    }
  } catch (e) {
    console.warn("사용자 로드 실패:", e.message);
  }

  if (!users.length && typeof BO_PERSONAS !== "undefined") {
    Object.entries(BO_PERSONAS).forEach(([key, p]) => {
      if (p.tenantId === _vuTenantId || !p.tenantId) {
        users.push({ id: key, name: p.name, dept: p.dept, pos: p.pos });
      }
    });
  }

  // 2단계 UI로 교체 (검색 필터 추가 포함)
  const step = document.getElementById("vu-head-step");
  if (!step) return;

  // 전체 사용자 데이터를 window에 저장 (필터링 용도)
  window._vuHeadAllUsers = users;

  step.innerHTML = `
    <div style="margin-bottom:10px;padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:11px;color:#C2410C;font-weight:700">
      선택된 역할: ${roleName} (${roleCode})
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#374151">테넌트 내 담당자 선택 (전체 사용자)</div>
      <input type="text" placeholder="이름 검색..." oninput="_vuFilterHeadUsers(this.value)" style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:4px;font-size:11px;width:120px">
    </div>
    <div id="vu-head-user-list" style="display:flex;flex-direction:column;gap:6px">
      ${_vuBuildHeadUserList(users)}
    </div>`;

  const footer = step.nextElementSibling;
  if (footer)
    footer.innerHTML = `
    <button class="bo-btn-secondary bo-btn-sm" onclick="_vuOpenHeadManagerSelector('${tplId}')">← 이전</button>
    <button class="bo-btn-primary bo-btn-sm" onclick="_vuSaveHeadManager('${tplId}','${roleCode}','${roleName}')" style="background:#C2410C;border-color:#C2410C">저장</button>`;
}

function _vuFilterHeadUsers(keyword) {
  const listEl = document.getElementById("vu-head-user-list");
  if (!listEl) return;
  const kw = keyword.toLowerCase().trim();
  const users = window._vuHeadAllUsers || [];
  const filtered = kw
    ? users.filter((u) => (u.name || "").toLowerCase().includes(kw))
    : users;
  listEl.innerHTML = _vuBuildHeadUserList(filtered);
}

function _vuBuildHeadUserList(users) {
  if (!users.length)
    return '<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">결과가 없습니다</div>';
  return users
    .map(
      (u) => `
    <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer;"
           onmouseover="this.style.borderColor='#FED7AA'" onmouseout="this.style.borderColor='#E5E7EB'">
      <input type="checkbox" name="vu-head-user" value="${u.id}" data-name="${(u.name || "").replace(/'/g, "&#39;")}" data-dept="${u.dept || ""}" style="accent-color:#C2410C;width:15px;height:15px">
      <div>
        <div style="font-size:13px;font-weight:700;color:#111827">${u.name} <span style="font-size:10px;color:#9CA3AF">${u.pos || ""}</span></div>
        <div style="font-size:10px;color:#6B7280">${u.dept || ""} · ${u.emp_no || u.id || ""}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:auto;margin-right:10px">
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:9px;color:#94A3B8;width:30px">시작일</span>
          <input type="date" id="vu-hm-sd-${u.id}" style="font-size:10px;padding:2px;border:1px solid #CBD5E1;border-radius:4px" onclick="event.stopPropagation()">
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:9px;color:#94A3B8;width:30px">종료일*</span>
          <input type="date" id="vu-hm-ed-${u.id}" required style="font-size:10px;padding:2px;border:1px solid #CBD5E1;border-radius:4px" onclick="event.stopPropagation()">
        </div>
      </div>
    </label>`,
    )
    .join("");
}

async function _vuSaveHeadManager(tplId, roleCode, roleName) {
  const checked = [
    ...document.querySelectorAll('input[name="vu-head-user"]:checked'),
  ];
  if (!checked.length) {
    alert("담당자를 1명 이상 선택하세요.");
    return;
  }

  const newUsers = [];
  for (const chk of checked) {
    const userId = chk.value;
    const sdInput = document.getElementById("vu-hm-sd-" + userId);
    const edInput = document.getElementById("vu-hm-ed-" + userId);
    const startDate = sdInput ? sdInput.value : null;
    const endDate = edInput ? edInput.value : null;

    if (!endDate) {
      alert(`${chk.dataset.name}의 역할 사용 종료일을 필수로 지정해야 합니다.`);
      if (edInput) edInput.focus();
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      alert(`${chk.dataset.name}: 종료일이 시작일보다 빠를 수 없습니다.`);
      return;
    }
    newUsers.push({
      id: userId,
      name: chk.dataset.name,
      dept: chk.dataset.dept,
      start_date: startDate || null,
      end_date: endDate,
    });
  }

  // Reverse Sync: 선택된 모든 사용자를 user_roles에 Upsert
  try {
    if (_sb()) {
      for (const u of newUsers) {
        const { error } = await _sb()
          .from("user_roles")
          .upsert(
            {
              role_code: roleCode,
              user_id: u.id,
              scope_id: tplId,
              tenant_id: _vuTenantId,
              start_date: u.start_date,
              end_date: u.end_date,
            },
            { onConflict: "user_id,role_code,scope_id" },
          );
        if (error) throw error;
      }
    }
  } catch (e) {
    alert("역할 맵핑 동기화 실패: " + e.message);
    return;
  }

  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  tpl.headManagerRole = { code: roleCode, name: roleName };
  // 기존 목록에 중복 없이 追加 (이미 있으면 날짜 갱신)
  const existing = Array.isArray(tpl.headManagerUsers)
    ? tpl.headManagerUsers
    : [];
  for (const nu of newUsers) {
    const idx = existing.findIndex((e) => e.id === nu.id);
    if (idx >= 0) existing[idx] = nu;
    else existing.push(nu);
  }
  tpl.headManagerUsers = existing;
  tpl.headManagerUser = existing[0] || null; // 호환성 유지
  _vuAutoSaveTplMeta(tpl);
  document.getElementById("vu-head-mgr-modal")?.remove();
  _vuSwitchTab(_vuActiveTab);
}

// ── 신규 생성 모달 ──────────────────────────────────────────────────────────
function _vuCreateModal() {
  return `
<div id="vu-create-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="font-size:15px;font-weight:800;margin:0">🏗️ 새 제도그룹 생성</h3>
      <button onclick="document.getElementById('vu-create-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">제도그룹 명칭 *</label>
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
  document.getElementById("vu-create-modal").style.display = "flex";
}

async function _vuConfirmCreate() {
  const name = document.getElementById("vu-new-name")?.value.trim();
  if (!name) {
    alert("명칭을 입력하세요.");
    return;
  }
  const purpose =
    document.querySelector('input[name="vu-purpose"]:checked')?.value ||
    "edu_support";
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) {
      alert("DB 연결이 없습니다.");
      return;
    }
    const newId = "TPL-" + Date.now();
    const { error } = await sb.from("virtual_org_templates").insert({
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
    document.getElementById("vu-create-modal").style.display = "none";
    _vuTplId = newId;
    _vuActiveTab = 0;
    await renderVirtualOrgUnified();
  } catch (e) {
    alert("생성 실패: " + e.message);
  }
}

// ═══ 설정 수정 모달 ═════════════════════════════════════════════════════════
function _vuEditModal() {
  return `
<div id="vu-edit-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 style="font-size:15px;font-weight:800;margin:0">⚙ 제도그룹 설정 수정</h3>
      <button onclick="document.getElementById('vu-edit-modal').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">제도그룹 명칭</label>
      <input id="vu-edit-name" type="text" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">용도 선택</label>
      <div id="vu-edit-purpose-box" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('vu-edit-modal').style.display='none'">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="_vuConfirmEdit()">저장</button>
    </div>
  </div>
</div>`;
}

function _vuOpenEditModal(tplId) {
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  window._vuEditingTplId = tplId;
  document.getElementById("vu-edit-name").value = tpl.name;
  const purposeOpts = [
    { val: "edu_support", label: "📚 교육지원", color: "#1D4ED8" },
    { val: "language", label: "🌐 어학", color: "#059669" },
    { val: "cert", label: "📜 자격증", color: "#C2410C" },
    { val: "badge", label: "🏅 배지", color: "#7C3AED" },
  ];
  const curPurpose = tpl.purpose || "edu_support";
  document.getElementById("vu-edit-purpose-box").innerHTML = purposeOpts
    .map(
      (p) => `
    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1.5px solid ${curPurpose === p.val ? p.color : "#E5E7EB"};border-radius:8px;cursor:pointer;background:${curPurpose === p.val ? p.color + "10" : "#fff"}">
      <input type="radio" name="vu-edit-purpose" value="${p.val}" ${curPurpose === p.val ? "checked" : ""} style="accent-color:${p.color}">
      <span style="font-size:12px;font-weight:700">${p.label}</span>
    </label>`,
    )
    .join("");
  document.getElementById("vu-edit-modal").style.display = "flex";
}

async function _vuConfirmEdit() {
  const tplId = window._vuEditingTplId;
  const tpl = _vuTplList.find((t) => t.id === tplId);
  if (!tpl) return;
  const newName = document.getElementById("vu-edit-name")?.value.trim();
  if (!newName) {
    alert("명칭을 입력하세요.");
    return;
  }
  const newPurpose =
    document.querySelector('input[name="vu-edit-purpose"]:checked')?.value ||
    "edu_support";
  tpl.name = newName;
  tpl.purpose = newPurpose;
  tpl.serviceTypes = [newPurpose];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb
        .from("virtual_org_templates")
        .update({
          name: newName,
          service_type: newPurpose,
          purpose: newPurpose,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tplId);
    }
  } catch (e) {
    console.warn("수정 저장 실패:", e.message);
  }
  document.getElementById("vu-edit-modal").style.display = "none";
  _vuActiveTab = 0;
  await renderVirtualOrgUnified();
}

// voOpenEditTemplate: 통합 모달로 직접 연결
window.voOpenEditTemplate = function (tplId) {
  _vuOpenEditModal(tplId);
};

// ═══ 조직 피커 모달 (팀 매핑 / 협조처 추가) ═════════════════════════════════
function _vuOrgPickerModal() {
  return `
<div id="vu-org-picker" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:560px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="padding:20px 24px 12px;border-bottom:1px solid #E5E7EB">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 id="vu-org-picker-title" style="font-size:14px;font-weight:800;margin:0">\uc870\uc9c1 \uc120\ud0dd</h3>
        <button onclick="document.getElementById('vu-org-picker').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">\u2715</button>
      </div>
      <div id="vu-coop-inline-opts"></div>
      <input id="vu-org-search" type="text" placeholder="\ud300 \uc774\ub984 \uac80\uc0c9..." oninput="_vuFilterOrgs(this.value)"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
    </div>
    <div id="vu-org-list" style="padding:12px 20px;overflow-y:auto;max-height:50vh;min-height:200px"></div>
    <div style="padding:12px 24px;border-top:1px solid #E5E7EB;display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('vu-org-picker').style.display='none'">\ucde8\uc18c</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="_vuConfirmOrgPick()">\uc120\ud0dd \uc644\ub8cc</button>
    </div>
  </div>
</div>`;
}

let _vuOrgPickerData = [];
let _vuGlobalMappedOrgs = {}; // { orgId: "tplName > groupName" } - 다른 VOrg보에 이미 맵핑된 팀

async function _vuShowOrgPicker(title) {
  document.getElementById("vu-org-picker-title").textContent = title;
  document.getElementById("vu-org-search").value = "";
  const listEl = document.getElementById("vu-org-list");
  listEl.innerHTML =
    '<div style="padding:20px;text-align:center;color:#9CA3AF">\ub85c\ub529 \uc911...</div>';
  // coop 모드일 때 안내 표시, 버튼 텍스트 변경
  const coopOptsEl = document.getElementById("vu-coop-inline-opts");
  if (coopOptsEl) {
    if (window._vuPickerMode === "coop") {
      coopOptsEl.innerHTML =
        '<div style="font-size:11px;color:#6B7280;background:#F0F9FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:10px">\ud83d\udccc \ud611\uc870\ucc98\ub85c \ub4f1\ub85d\ud560 <b>\ud300 1\uac1c</b>\ub97c \uc120\ud0dd\ud558\uc138\uc694. \ub2e4\uc74c \ub2e8\uacc4\uc5d0\uc11c \uc720\ud615\uacfc \uad6c\ubd84\uc744 \uc124\uc815\ud569\ub2c8\ub2e4.</div>';
    } else {
      coopOptsEl.innerHTML = "";
    }
  }
  // coop 모드일 때 확인 버튼 텍스트 변경
  const confirmBtn = document.querySelector("#vu-org-picker .bo-btn-primary");
  if (confirmBtn) {
    confirmBtn.textContent =
      window._vuPickerMode === "coop"
        ? "\ub2e4\uc74c \u2192"
        : "\uc120\ud0dd \uc644\ub8cc";
  }
  document.getElementById("vu-org-picker").style.display = "flex";

  // 현재 그룹에 이미 매핑된 org ID 수집
  _vuMappedOrgIds = new Set();
  const _curTpl = _vuTplList.find((t) => t.id === window._vuPickerTplId);
  const _curGrp = _curTpl
    ? (_curTpl.tree?.hqs || [])[window._vuPickerGi]
    : null;
  if (_curGrp) {
    const existing =
      window._vuPickerMode === "coop"
        ? _curGrp.coopTeams || []
        : _curGrp.teams || [];
    existing.forEach((t) => _vuMappedOrgIds.add(t.id));
  }

  // 전체 VOrg 중 현재 tpl/gi 를 제외한 모든 맵핑 팀 ID 수집 (4가지 상태 구분용)
  if (window._vuPickerMode === "team") {
    _vuGlobalMappedOrgs = _vuGetGlobalMappedTeams(
      window._vuPickerTplId,
      window._vuPickerGi,
    );
  } else {
    _vuGlobalMappedOrgs = {};
  }

  // DB에서 조직 데이터 로드
  _vuOrgPickerData = [];
  let rawOrgs = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("organizations")
        .select("id,name,parent_id,type,tenant_id,status")
        .eq("tenant_id", _vuTenantId)
        .order("name");
      if (data) rawOrgs = data;
    }
  } catch (e) {
    console.warn("조직도 로드 실패:", e.message);
  }

  if (rawOrgs.length > 0) {
    const orgMap = {};
    rawOrgs.forEach((o) => {
      orgMap[o.id] = { ...o, children: [] };
    });
    const roots = [];
    rawOrgs.forEach((o) => {
      if (o.parent_id && orgMap[o.parent_id]) {
        orgMap[o.parent_id].children.push(orgMap[o.id]);
      } else {
        roots.push(orgMap[o.id]);
      }
    });
    _vuOrgPickerData = roots;
    // flat cache 동기화
    rawOrgs.forEach((o) => {
      _vuOrgFlatCache[o.id] = orgMap[o.id];
    });
  } else if (typeof BO_PERSONAS !== "undefined") {
    const deptSet = new Map();
    Object.values(BO_PERSONAS).forEach((p) => {
      if (p.tenantId === _vuTenantId && p.dept) {
        deptSet.set(p.dept, {
          id: "ORG-" + p.dept,
          name: p.dept,
          type: "team",
          parent_id: null,
          children: [],
        });
      }
    });
    _vuOrgPickerData = [...deptSet.values()];
  }

  _vuRenderOrgList("");
}

function _vuFilterOrgs(q) {
  _vuRenderOrgList(q);
}

let _vuMappedOrgIds = new Set(); // 현재 그룹에 이미 맵핑된 org IDs

function _vuBuildOrgTreeHtml(nodes, depth, q) {
  let html = "";
  nodes.forEach((node) => {
    const matchSelf = q === "" || node.name.toLowerCase().includes(q);
    let childHtml = "";
    if (node.children && node.children.length > 0) {
      childHtml = _vuBuildOrgTreeHtml(node.children, depth + 1, q);
    }
    if (!matchSelf && !childHtml) return;

    const st = {
      headquarters: {
        icon: "🏢",
        color: "#1E40AF",
        bg: "#EFF6FF",
        border: "#BFDBFE",
        label: "본부",
      },
      center: {
        icon: "🔬",
        color: "#6D28D9",
        bg: "#F5F3FF",
        border: "#DDD6FE",
        label: "센터",
      },
      office: {
        icon: "📋",
        color: "#065F46",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        label: "실",
      },
      division: {
        icon: "🏭",
        color: "#92400E",
        bg: "#FFFBEB",
        border: "#FDE68A",
        label: "사업부",
      },
      team: {
        icon: "👥",
        color: "#374151",
        bg: "#F9FAFB",
        border: "#E5E7EB",
        label: "팀",
      },
    }[node.type] || {
      icon: "👥",
      color: "#374151",
      bg: "#F9FAFB",
      border: "#E5E7EB",
      label: node.type || "팀",
    };

    const indent = depth * 20;
    const isMapped = _vuMappedOrgIds.has(node.id); // 현재 VOrg 이 그룹에 맵핑된
    const isOtherVorg = !!_vuGlobalMappedOrgs[node.id]; // 다른 VOrg에 맵핑된
    const isDeprecated = node.status === "deprecated"; // 폐지된 조직
    const hasChildren = node.children && node.children.length > 0;

    // 보여지는 상태에 따라 4가지 스타일
    let rowBg, rowBdr, checkboxDisabled, checkboxChecked, badgeHtml;
    if (isDeprecated) {
      // 폐지 조직: 회색에 기울기, 선택 불가
      rowBg = "#F9FAFB";
      rowBdr = "1px dashed #D1D5DB";
      checkboxDisabled = true;
      checkboxChecked = false;
      badgeHtml =
        '<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:#F3F4F6;color:#9CA3AF;white-space:nowrap">폐지</span>';
    } else if (isOtherVorg) {
      // 다른 VOrg에 이미 맵핑된: 주황에 선택 불가
      rowBg = "#FFFBEB";
      rowBdr = "1.5px solid #FDE68A";
      checkboxDisabled = false;
      checkboxChecked = false; // 선택 가능 (conflicts 경고 후 재맵핑)
      badgeHtml = `<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:#FEF3C7;color:#92400E;white-space:nowrap" title="다른 교육조직: ${_vuGlobalMappedOrgs[node.id]}">⚠️ ${_vuGlobalMappedOrgs[node.id].split(" > ")[1]}에서 맵핑 중</span>`;
    } else if (isMapped) {
      // 이미 현재 VOrg에 맵핑된: 녹색에 체크되어 있음
      rowBg = "#F0FDF4";
      rowBdr = "1.5px solid #6EE7B7";
      checkboxDisabled = true;
      checkboxChecked = true;
      badgeHtml =
        '<span style="font-size:9px;padding:2px 7px;border-radius:10px;background:#D1FAE5;color:#059669;white-space:nowrap">✓ 맵핑됨</span>';
    } else {
      // 미맵핑: 기본 흰색
      rowBg = "#fff";
      rowBdr = "1px solid #E5E7EB";
      checkboxDisabled = false;
      checkboxChecked = false;
      badgeHtml = "";
    }

    // 하위 선택용 data 속성 (상위 선택 시 하위 자동 체크)
    const childLeafIds = hasChildren ? _vuCollectLeafIds(node.children) : [];
    const childIdsAttr = childLeafIds.length
      ? `data-child-ids="${childLeafIds.join(",")}"`
      : "";

    html += `
    <div style="margin-bottom:5px" data-org-id="${node.id}">
      <label style="display:flex;align-items:center;gap:9px;padding:9px 14px;padding-left:${14 + indent}px;
             border-radius:9px;cursor:${checkboxDisabled ? "default" : "pointer"};background:${rowBg};border:${rowBdr};
             transition:all 0.15s;user-select:none" 
             ${!checkboxDisabled && !isMapped && !isOtherVorg ? `onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background='${rowBg}'"` : ""}>
        <input type="${window._vuPickerMode === "coop" ? "radio" : "checkbox"}" ${window._vuPickerMode === "coop" ? 'name="vu-coop-team"' : ""} class="vu-org-chk" value="${node.id}" data-name="${node.name}"
          ${checkboxChecked ? "checked" : ""}
          ${checkboxDisabled ? "disabled" : ""}
          ${childIdsAttr}
          onchange="${window._vuPickerMode === "coop" ? "" : "if(this.checked)_vuCheckChildren(this)"}"
          style="width:15px;height:15px;accent-color:#1D4ED8;margin:0;flex-shrink:0${checkboxDisabled ? ";opacity:0.5" : ""}"
          ${isOtherVorg ? `title="⚠️ 선택 시 ${_vuGlobalMappedOrgs[node.id]}에서 이관됩니다"` : ""}>
        <span style="font-size:14px">${isDeprecated ? "😶" : st.icon}</span>
        <span style="font-size:13px;font-weight:${isMapped ? "800" : isOtherVorg ? "600" : "600"};color:${isMapped ? "#059669" : isDeprecated ? "#9CA3AF" : isOtherVorg ? "#92400E" : "#374151"};flex:1">
          ${node.name}${node.org_type === "general" ? ' <span style="font-size:8px;font-weight:900;padding:1px 5px;border-radius:3px;background:#EDE9FE;color:#7C3AED">🔗총괄</span>' : ""}${hasChildren ? ` <span style="font-size:10px;color:#9CA3AF;font-weight:400">(${node.children.length}개 하위)</span>` : ""}
        </span>
        ${badgeHtml}
        <span style="font-size:10px;color:${st.color};background:${st.bg};border:1px solid ${st.border};
              padding:1px 7px;border-radius:5px;font-weight:700;white-space:nowrap">${st.label}</span>
      </label>
      ${childHtml ? `<div style="border-left:2px solid #E5E7EB;margin-left:${26 + indent}px;padding-left:4px">${childHtml}</div>` : ""}
    </div>`;
  });
  return html;
}

// 푸리 노드의 모든 leaf(team)의 ID 수집 (하위 전체 선택용)
function _vuCollectLeafIds(nodes) {
  const ids = [];
  nodes.forEach((n) => {
    const hasChildren = n.children && n.children.length > 0;
    if (!hasChildren) ids.push(n.id);
    else ids.push(..._vuCollectLeafIds(n.children));
  });
  return ids;
}

// 상위 체크박스 클릭 시 하위 모두 체크
function _vuCheckChildren(checkbox) {
  const childIds = checkbox.dataset.childIds;
  if (!childIds) return;
  childIds.split(",").forEach((id) => {
    const child = document.querySelector(`.vu-org-chk[value="${id}"]`);
    if (child && !child.disabled) child.checked = checkbox.checked;
  });
}

function _vuRenderOrgList(query) {
  const listEl = document.getElementById("vu-org-list");
  const q = query.toLowerCase().trim();

  const html = _vuBuildOrgTreeHtml(_vuOrgPickerData, 0, q);

  if (!html) {
    listEl.innerHTML =
      '<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">결과가 없습니다</div>';
    return;
  }
  listEl.innerHTML = html;
}

async function _vuConfirmOrgPick() {
  const newlyChecked = [
    ...document.querySelectorAll(".vu-org-chk:checked:not([disabled])"),
  ];
  if (!newlyChecked.length) {
    alert("\uc870\uc9c1\uc744 \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }

  const tpl = _vuTplList.find((t) => t.id === window._vuPickerTplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[window._vuPickerGi];
  if (!g) return;

  // coop 모드: Step 2로 전환
  if (window._vuPickerMode === "coop") {
    const sel = newlyChecked[0];
    window._vuCoopSelectedTeam = { id: sel.value, name: sel.dataset.name };
    document.getElementById("vu-org-picker").style.display = "none";
    _vuShowCoopStep2();
    return;
  }

  // team 모드: 기존 로직
  const conflicts = newlyChecked.filter(
    (chk) => _vuGlobalMappedOrgs[chk.value],
  );
  if (conflicts.length > 0) {
    const conflictList = conflicts
      .map((c) => `\u2022 ${c.dataset.name}: ${_vuGlobalMappedOrgs[c.value]}`)
      .join("\n");
    if (
      !confirm(
        `\u26a0\ufe0f \ub2e4\uc74c \ud300\uc740 \uac19\uc740 \uc81c\ub3c4\uadf8\ub8f9 \ub0b4 \ub2e4\ub978 \uad50\uc721\uc870\uc9c1\uc5d0 \ub9f5\ud551:\n${conflictList}\n\n\ud655\uc778 \uc2dc \uc7ac\ub9f5\ud551`,
      )
    )
      return;
    // 같은 템플릿 내 다른 HQ에서만 해당 팀 제거
    conflicts.forEach((chk) => {
      (tpl.tree?.hqs || []).forEach((group, gIdx) => {
        if (gIdx === window._vuPickerGi) return; // 현재 HQ 제외
        group.teams = (group.teams || []).filter((t) => t.id !== chk.value);
      });
    });
  }
  newlyChecked.forEach((chk) => {
    const item = { id: chk.value, name: chk.dataset.name };
    if (!g.teams) g.teams = [];
    if (!g.teams.find((t) => t.id === item.id)) g.teams.push(item);
  });
  _vuAutoSave(tpl);
  document.getElementById("vu-org-picker").style.display = "none";
  _vuSwitchTab(_vuActiveTab);
}

// ── Step 2: 협조처 유형·구분 선택 ─────────────────────────────────────────
function _vuShowCoopStep2() {
  const team = window._vuCoopSelectedTeam;
  if (!team) return;
  let modal = document.getElementById("vu-coop-step2");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "vu-coop-step2";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9100;display:flex;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:480px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;margin-bottom:18px">
      <h3 style="font-size:15px;font-weight:800;margin:0">\ud83e\udd1d \ud611\uc870\ucc98 \ub4f1\ub85d</h3>
      <button onclick="document.getElementById('vu-coop-step2').innerHTML=''" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">\u2715</button>
    </div>
    <div style="background:#F0F9FF;border:1.5px solid #BFDBFE;border-radius:10px;padding:14px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">\ud83c\udfe2</span>
      <div>
        <div style="font-size:13px;font-weight:800;color:#111827">${team.name}</div>
        <div style="font-size:10px;color:#6B7280">\uc120\ud0dd\ub41c \ud300</div>
      </div>
    </div>
    <div style="margin-bottom:18px">
      <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">\ud611\uc870\ucc98 \uc720\ud615 <span style="color:#EF4444">*</span></div>
      <div style="display:flex;gap:10px">
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:1.5px solid #BFDBFE;background:#EFF6FF">
          <input type="radio" name="vu-s2-type" value="\uad50\uc721\ud611\uc870\ucc98" checked style="accent-color:#1D4ED8;width:15px;height:15px">
          <div><div style="font-size:12px;font-weight:800;color:#1D4ED8">\ud83d\udcda \uad50\uc721\ud611\uc870\ucc98</div><div style="font-size:10px;color:#6B7280">\uad50\uc721\uc6b4\uc601 \uac80\ud1a0\u00b7\ud611\uc870</div></div>
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:1.5px solid #FDE68A;background:#FFFBEB">
          <input type="radio" name="vu-s2-type" value="\uc7ac\uacbd\ud611\uc870\ud300" style="accent-color:#D97706;width:15px;height:15px">
          <div><div style="font-size:12px;font-weight:800;color:#92400E">\ud83d\udcb0 \uc7ac\uacbd\ud611\uc870\ud300</div><div style="font-size:10px;color:#6B7280">\uc608\uc0b0\u00b7\uc7ac\ubb34 \uac80\ud1a0</div></div>
        </label>
      </div>
    </div>
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:8px">\ud611\uc870 \uad6c\ubd84 <span style="color:#EF4444">*</span></div>
      <div style="display:flex;gap:10px">
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:1.5px solid #FECACA;background:#FEF2F2">
          <input type="radio" name="vu-s2-req" value="\ud544\uc218" checked style="accent-color:#EF4444;width:15px;height:15px">
          <div><div style="font-size:12px;font-weight:700;color:#EF4444">\ud83d\udd34 \ud544\uc218 \ud611\uc870\ucc98</div><div style="font-size:10px;color:#6B7280">\ud56d\uc0c1 \uacb0\uc7ac\uc120\uc5d0 \ud3ec\ud568</div></div>
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:1.5px solid #DBEAFE;background:#EFF6FF">
          <input type="radio" name="vu-s2-req" value="\uc870\uac74\ubd80" style="accent-color:#3B82F6;width:15px;height:15px">
          <div><div style="font-size:12px;font-weight:700;color:#3B82F6">\ud83d\udd35 \uc870\uac74\ubd80</div><div style="font-size:10px;color:#6B7280">\uc870\uac74\uc5d0 \ub530\ub77c \ud611\uc870/\ucc38\uc870 \uc804\ud658</div></div>
        </label>
      </div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="document.getElementById('vu-coop-step2').innerHTML='';window._vuPickerMode='coop';_vuShowOrgPicker('\ud611\uc870\ucc98 \ucd94\uac00 - \ud300 \uc120\ud0dd')" style="padding:8px 16px;border:1.5px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;font-size:12px;font-weight:700;color:#6B7280">\u2190 \ub4a4\ub85c</button>
      <button onclick="_vuCoopStep2Confirm()" style="padding:8px 20px;border:none;border-radius:8px;background:#1D4ED8;color:white;cursor:pointer;font-size:12px;font-weight:800">\ub4f1\ub85d</button>
    </div>
  </div>
</div>`;
}

function _vuCoopStep2Confirm() {
  const team = window._vuCoopSelectedTeam;
  if (!team) return;
  const coopType =
    document.querySelector('input[name="vu-s2-type"]:checked')?.value ||
    "\uad50\uc721\ud611\uc870\ucc98";
  const required =
    document.querySelector('input[name="vu-s2-req"]:checked')?.value ||
    "\ud544\uc218";
  const tpl = _vuTplList.find((t) => t.id === window._vuPickerTplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[window._vuPickerGi];
  if (!g) return;
  if (!g.coopTeams) g.coopTeams = [];
  if (!g.coopTeams.find((t) => t.id === team.id)) {
    g.coopTeams.push({
      id: team.id,
      name: team.name,
      coopType,
      required,
      role: "\ud611\uc870",
    });
  }
  _vuAutoSave(tpl);
  document.getElementById("vu-coop-step2").innerHTML = "";
  _vuSwitchTab(_vuActiveTab);
}

// ═══ 사용자 피커 모달 (총괄담당자 / 운영담당자) ═════════════════════════════
function _vuUserPickerModal() {
  return `
<div id="vu-user-picker" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="padding:20px 24px 12px;border-bottom:1px solid #E5E7EB">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 id="vu-user-picker-title" style="font-size:14px;font-weight:800;margin:0">사용자 선택</h3>
        <button onclick="document.getElementById('vu-user-picker').style.display='none'" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <input id="vu-user-search" type="text" placeholder="이름 검색..." oninput="_vuFilterUsers(this.value)"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
    </div>
    <div id="vu-user-list" style="padding:12px 20px;overflow-y:auto;max-height:50vh;min-height:200px"></div>
    <div style="padding:12px 24px;border-top:1px solid #E5E7EB;display:flex;gap:8px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="document.getElementById('vu-user-picker').style.display='none'">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="_vuConfirmUserPick()">선택 완료</button>
    </div>
  </div>
</div>`;
}

let _vuUserPickerData = [];

async function _vuShowUserPicker(title, roleFilter) {
  document.getElementById("vu-user-picker-title").textContent = title;
  document.getElementById("vu-user-search").value = "";
  const listEl = document.getElementById("vu-user-list");
  listEl.innerHTML =
    '<div style="padding:20px;text-align:center;color:#9CA3AF">로딩 중...</div>';
  document.getElementById("vu-user-picker").style.display = "flex";

  _vuUserPickerData = [];

  // roleFilter에 관계없이 테넌트의 모든 사용자 조회
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data: us, error: usErr } = await sb
        .from("users")
        .select("id,name,emp_no,org_id")
        .eq("tenant_id", _vuTenantId);
      if (usErr) console.warn("사용자 조회 오류:", usErr.message);

      const orgIds = (us || []).map((u) => u.org_id).filter(Boolean);
      let orgMap = {};
      if (orgIds.length) {
        const { data: orgs } = await sb
          .from("organizations")
          .select("id,name")
          .in("id", orgIds);
        (orgs || []).forEach((o) => {
          orgMap[o.id] = o.name;
        });
      }
      _vuUserPickerData = (us || []).map((u) => ({
        key: u.id,
        name: u.name,
        dept: orgMap[u.org_id] || "",
        pos: u.emp_no,
        role: "",
      }));
    }
  } catch (e) {
    console.warn("사용자 로드 실패:", e.message);
  }

  // DB에 데이터가 없으면 BO_PERSONAS 폴백
  if (!_vuUserPickerData.length && typeof BO_PERSONAS !== "undefined") {
    Object.entries(BO_PERSONAS).forEach(([key, p]) => {
      if (p.tenantId === _vuTenantId || !p.tenantId) {
        _vuUserPickerData.push({
          key,
          name: p.name,
          dept: p.dept,
          pos: p.pos,
          role: p.role,
          roleTag: p.roleTag,
        });
      }
    });
  }

  _vuRenderUserList("");
}

function _vuFilterUsers(q) {
  _vuRenderUserList(q);
}

function _vuRenderUserList(query) {
  const listEl = document.getElementById("vu-user-list");
  const q = query.toLowerCase();
  const filtered = q
    ? _vuUserPickerData.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.dept || "").toLowerCase().includes(q),
      )
    : _vuUserPickerData;
  if (!filtered.length) {
    listEl.innerHTML =
      '<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">결과가 없습니다</div>';
    return;
  }

  // 현재 제도그룹 내 모든 교육조직에서 각 사용자의 기존 맵핑 조회
  const curTpl = _vuTplList.find((t) => t.id === _vuTplId);
  const hqs = curTpl?.tree?.hqs || curTpl?.tree?.centers || [];
  const currentGi = window._vuPickerGi;

  const mappingMap = {};
  hqs.forEach((g, gi) => {
    const managers = g.managers || [];
    managers.forEach((m) => {
      const uid = m.id || m.key;
      if (!mappingMap[uid]) mappingMap[uid] = [];
      if (gi !== currentGi) {
        mappingMap[uid].push({ orgName: g.name, orgIdx: gi });
      }
    });
  });

  const isSingle = window._vuPickerMode === "head_manager";
  listEl.innerHTML = filtered
    .map((u) => {
      const existing = mappingMap[u.key] || [];
      const mappingBadge = existing.length
        ? '<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:3px">' +
          existing
            .map(
              (e) =>
                '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#DBEAFE;color:#1E40AF;font-weight:600">📌 ' +
                e.orgName +
                "</span>",
            )
            .join("") +
          "</div>"
        : "";
      return `
    <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background .1s;border:1px solid ${existing.length ? "#BFDBFE" : "#F3F4F6"};margin-bottom:4px;background:${existing.length ? "#F8FAFF" : "#fff"}"
      onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='${existing.length ? "#F8FAFF" : "#fff"}'">
      <input type="${isSingle ? "radio" : "checkbox"}" name="vu-user-sel" class="vu-user-chk" value="${u.key}" data-name="${u.name}" data-dept="${u.dept || ""}" style="width:16px;height:16px;accent-color:#1D4ED8;margin-top:2px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:#111827">${u.name} <span style="font-size:10px;color:#9CA3AF">${u.pos || ""}</span></div>
        <div style="font-size:10px;color:#6B7280">${u.dept || ""}</div>
        ${mappingBadge}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:auto;margin-right:10px">
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:9px;color:#94A3B8;width:30px">시작일</span>
          <input type="date" id="vu-op-sd-${u.key}" style="font-size:10px;padding:2px;border:1px solid #CBD5E1;border-radius:4px" onclick="event.stopPropagation()">
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:9px;color:#94A3B8;width:30px">종료일*</span>
          <input type="date" id="vu-op-ed-${u.key}" required style="font-size:10px;padding:2px;border:1px solid #CBD5E1;border-radius:4px" onclick="event.stopPropagation()">
        </div>
      </div>
    </label>`;
    })
    .join("");
}

async function _vuConfirmUserPick() {
  const checked = [...document.querySelectorAll(".vu-user-chk:checked")];
  if (!checked.length) {
    alert("사용자를 선택하세요.");
    return;
  }
  const tpl = _vuTplList.find((t) => t.id === window._vuPickerTplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[window._vuPickerGi];
  if (!g) return;

  // 선택된 사용자들에 대해 시작/종료일 검증 (하나는 무조건 있어야 함)
  const userMaps = [];
  for (const chk of checked) {
    const userId = chk.value;
    const sdInput = document.getElementById("vu-op-sd-" + userId);
    const edInput = document.getElementById("vu-op-ed-" + userId);
    const startDate = sdInput ? sdInput.value : null;
    const endDate = edInput ? edInput.value : null;

    if (!endDate) {
      alert(chk.dataset.name + "의 역할 사용 종료일을 필수로 지정해야 합니다.");
      if (edInput) edInput.focus();
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      alert(chk.dataset.name + "의 종료일이 시작일보다 빠를 수 없습니다.");
      return;
    }
    userMaps.push({
      id: userId,
      name: chk.dataset.name,
      dept: chk.dataset.dept,
      start_date: startDate,
      end_date: endDate,
    });
  }

  // Reverse Sync
  if (window._vuPickerMode === "manager" && window._vuHeadRoleCode) {
    try {
      if (_sb()) {
        const { data: childRoles } = await _sb()
          .from("roles")
          .select("code, role_level_type")
          .eq("parent_role_id", window._vuHeadRoleCode);
        if (childRoles && childRoles.length > 0) {
          const opCode =
            childRoles.find((r) => r.role_level_type === "ops")?.code ||
            childRoles[0].code;
          for (const um of userMaps) {
            await _sb()
              .from("user_roles")
              .upsert(
                {
                  role_code: opCode,
                  user_id: um.id,
                  scope_id: window._vuPickerTplId,
                  tenant_id: _vuTenantId,
                  start_date: um.start_date || null,
                  end_date: um.end_date,
                },
                { onConflict: "user_id,role_code,scope_id" },
              );
          }
        } else {
          console.warn("할당할 하위(운영) 역할 코드가 없습니다.");
        }
      }
    } catch (e) {
      console.warn("운영담당자 역방향 동기화 실패:", e.message);
    }
  }

  if (window._vuPickerMode === "head_manager") {
    g.headManager = userMaps[0];
  } else {
    if (!g.managers) g.managers = [];
    userMaps.forEach((item) => {
      if (!g.managers.find((m) => m.id === item.id)) g.managers.push(item);
    });
  }

  _vuAutoSave(tpl);
  document.getElementById("vu-user-picker").style.display = "none";
  _vuSwitchTab(_vuActiveTab);
}

// ═══ 드래그앤드롭 - 제도그룹 목록 순서 변경 ═══════════════════════════════════

let _vuDragSrcId = null; // 드래그 시작한 제도그룹 ID
let _vuIsDragging = false; // 드래그 중 onclick 이벤트 차단용

function _vuDragStart(e, tplId) {
  _vuDragSrcId = tplId;
  _vuIsDragging = false; // 아직은 false, dragover에서 이동이 시작되면 true
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", tplId);
  // 드래그 중인 카드 시각 처리
  setTimeout(() => {
    const el = document.querySelector(`[data-tpl-id="${tplId}"]`);
    if (el) {
      el.style.opacity = "0.4";
      el.style.cursor = "grabbing";
    }
  }, 0);
}

function _vuDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "move";
  _vuIsDragging = true; // 실제로 드래그가 위치 이동 중임을 표시
  const el = e.currentTarget;
  // 드롭 대상 강조
  el.style.border = "1.5px dashed #1D4ED8";
  el.style.background = "#EFF6FF";
}

function _vuDragLeave(e) {
  const el = e.currentTarget;
  const tplId = el.dataset.tplId;
  const isActive = tplId === _vuTplId;
  el.style.border = `1.5px solid ${isActive ? "#BFDBFE" : "#F3F4F6"}`;
  el.style.background = isActive ? "#EFF6FF" : "#fff";
}

async function _vuDrop(e, targetId) {
  e.preventDefault();
  e.stopPropagation();

  // 원복처리 및 플래그 초기화는 setTimeout으로 onclick 이후에 실행
  const src = _vuDragSrcId;
  _vuDragSrcId = null;

  // 원래 카드 스타일 복원
  document.querySelectorAll("[data-tpl-id]").forEach((el) => {
    el.style.opacity = "1";
    el.style.cursor = "grab";
    const id = el.dataset.tplId;
    const isActive = id === _vuTplId;
    el.style.border = `1.5px solid ${isActive ? "#BFDBFE" : "#F3F4F6"}`;
    el.style.background = isActive ? "#EFF6FF" : "#fff";
  });

  if (!src || src === targetId) {
    setTimeout(() => {
      _vuIsDragging = false;
    }, 200);
    return;
  }

  // 배열 순서 변경
  const fromIdx = _vuTplList.findIndex((t) => t.id === src);
  const toIdx = _vuTplList.findIndex((t) => t.id === targetId);
  if (fromIdx === -1 || toIdx === -1) {
    setTimeout(() => {
      _vuIsDragging = false;
    }, 200);
    return;
  }

  const [moved] = _vuTplList.splice(fromIdx, 1);
  _vuTplList.splice(toIdx, 0, moved);

  // 리스트 DOM만 부분 갱신 (전체 리렌더링 하지 않음)
  _vuRenderTplListOnly();

  // onclick 이벤트가 끝난 후 플래그 해제
  setTimeout(() => {
    _vuIsDragging = false;
  }, 200);

  // DB에 sort_order 비동기 업데이트
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await Promise.all(
        _vuTplList.map((t, i) =>
          sb
            .from("virtual_org_templates")
            .update({ sort_order: i })
            .eq("id", t.id),
        ),
      );
    }
  } catch (err) {
    console.warn("순서 저장 실패:", err.message);
  }
}

// 리스트 컨테이너만 부분 갱신 (우측 상세 패널은 유지)
function _vuRenderTplListOnly() {
  const container = document.getElementById("vu-tpl-list-container");
  if (!container) {
    renderVirtualOrgUnified();
    return;
  }

  const purposeColors = {
    edu_support: { bg: "#EFF6FF", text: "#1D4ED8", label: "교육지원" },
    language: { bg: "#F0FDF4", text: "#059669", label: "어학" },
    cert: { bg: "#FFF7ED", text: "#C2410C", label: "자격증" },
    badge: { bg: "#F5F3FF", text: "#7C3AED", label: "배지" },
    교육지원: { bg: "#EFF6FF", text: "#1D4ED8", label: "교육지원" },
  };

  container.innerHTML = _vuTplList
    .map((t, idx) => {
      const pc = purposeColors[t.purpose] || purposeColors.edu_support;
      const isActive = t.id === _vuTplId;
      return `
    <div draggable="true"
      data-tpl-id="${t.id}"
      data-tpl-idx="${idx}"
      onclick="if(!_vuIsDragging)_vuSelectTpl('${t.id}')"
      ondragstart="_vuDragStart(event,'${t.id}')"
      ondragover="_vuDragOver(event)"
      ondragleave="_vuDragLeave(event)"
      ondrop="_vuDrop(event,'${t.id}')"
      style="padding:12px 14px;border-radius:10px;margin-bottom:6px;cursor:grab;transition:all .12s;
             background:${isActive ? "#EFF6FF" : "#fff"};
             border:1.5px solid ${isActive ? "#BFDBFE" : "#F3F4F6"};
             ${isActive ? "box-shadow:0 2px 8px rgba(29,78,216,.08)" : ""}
             user-select:none;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="color:#CBD5E1;font-size:12px;cursor:grab" title="드래그하여 순서 변경">⠿⠿</span>
        <div style="font-size:13px;font-weight:${isActive ? 900 : 600};color:${isActive ? "#1D4ED8" : "#374151"};flex:1">${t.name}</div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;padding-left:18px">
        <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:${pc.bg};color:${pc.text}">${pc.label}</span>
        <span style="font-size:9px;padding:2px 7px;border-radius:5px;font-weight:700;background:#F3F4F6;color:#6B7280">${(t.tree?.hqs || t.tree?.centers || []).length}개 조직</span>
      </div>
    </div>`;
    })
    .join("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── 독립 메뉴①: 교육조직 담당자 관리 (renderVorgManagerMgmt) ────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
let _vmgrFilterTenant = null;
let _vmgrFilterTplId = "";
let _vmgrFilterPurpose = "all";

async function renderVorgManagerMgmt() {
  const el = document.getElementById("bo-content");
  if (!el) return;

  const role = boCurrentPersona?.role;
  const isPlatform = role === "platform_admin";
  const tenants = typeof TENANTS !== "undefined" ? TENANTS.filter(t => t.id !== "SYSTEM") : [];

  if (!_vmgrFilterTenant) {
    _vmgrFilterTenant = isPlatform
      ? (tenants[0]?.id || "HMC")
      : (boCurrentPersona?.tenantId || "HMC");
  }

  let tplList = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("virtual_org_templates")
        .select("id,name,purpose,service_type,tree_data,tenant_id")
        .eq("tenant_id", _vmgrFilterTenant);
      if (data && data.length) {
        tplList = data.map(row => ({
          id: row.id, name: row.name,
          purpose: row.service_type || row.purpose || "edu_support",
          tree: row.tree_data || { hqs: [] },
        }));
      }
    }
  } catch(e) { console.warn("[VorgMgr] DB 로드 실패:", e.message); }

  const filteredTpls = _vmgrFilterPurpose === "all"
    ? tplList
    : tplList.filter(t => t.purpose === _vmgrFilterPurpose);

  const selTpl = _vmgrFilterTplId ? filteredTpls.find(t => t.id === _vmgrFilterTplId) : null;

  const _purposeLabel = (p) => ({ edu_support:"교육지원", cert:"자격증", badge:"뱃지", language:"어학" }[p] || p);

  const _renderMgrRows = (tpl) => {
    const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
    if (!groups.length) return `<div style="padding:30px;text-align:center;color:#9CA3AF;font-size:13px">교육조직이 없습니다. 제도그룹 관리 메뉴에서 먼저 구성하세요.</div>`;
    return groups.map((g, gi) => {
      const managers = g.managers || [];
      return `<div class="bo-card" style="padding:16px 20px;margin-bottom:12px;border-left:4px solid #059669">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:8px">
      <span>🏢</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
      <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#D1FAE5;color:#065F46;font-weight:700">${managers.length}명</span>
    </div>
    <button onclick="_vmgrAddManager('${tpl.id}',${gi})"
      style="padding:5px 12px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:#059669">+ 운영담당자 추가</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:6px">
    ${managers.length
      ? managers.map((m,mi) => `<span style="padding:6px 12px;background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:8px;font-size:12px;font-weight:600;color:#065F46;display:inline-flex;align-items:center;gap:6px">
        👤 ${m.name||m} ${m.dept?`<span style="font-size:10px;color:#9CA3AF">${m.dept}</span>`:""}
        ${m.start_date||m.end_date?`<span style="font-size:9px;color:#94A3B8">${m.start_date||""} ~ ${m.end_date||""}</span>`:""}
        <button onclick="_vmgrRemoveManager('${tpl.id}',${gi},${mi})" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:11px;padding:0">✕</button>
      </span>`).join("")
      : `<span style="font-size:12px;color:#9CA3AF">등록된 운영담당자가 없습니다</span>`}
  </div>
</div>`;
    }).join("");
  };

  const tenantsHtml = isPlatform
    ? `<div><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">테넌트(회사)</label>
      <select onchange="_vmgrFilterTenant=this.value;_vmgrFilterTplId='';renderVorgManagerMgmt()" style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        ${tenants.map(t=>`<option value="${t.id}" ${t.id===_vmgrFilterTenant?"selected":""}>${t.name} (${t.id})</option>`).join("")}
      </select></div>` : "";

  el.innerHTML = `<div class="bo-fade">
  <div style="margin-bottom:20px">
    <h2 style="font-size:18px;font-weight:900;color:#111827;margin:0 0 4px">👤 교육조직 담당자 관리</h2>
    <p style="font-size:12px;color:#6B7280;margin:0">제도그룹별 교육조직(본부)의 운영담당자를 일괄 조회·관리합니다. 탭 내 관리와 동일한 데이터를 공유합니다.</p>
  </div>
  <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:14px;padding:16px 20px;margin-bottom:22px">
    <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:12px">🔍 조회 조건</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      ${tenantsHtml}
      <div><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">용도(제도유형)</label>
        <select onchange="_vmgrFilterPurpose=this.value;_vmgrFilterTplId='';renderVorgManagerMgmt()" style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:130px">
          <option value="all" ${_vmgrFilterPurpose==="all"?"selected":""}>전체</option>
          <option value="edu_support" ${_vmgrFilterPurpose==="edu_support"?"selected":""}>📘 교육지원</option>
          <option value="cert" ${_vmgrFilterPurpose==="cert"?"selected":""}>📜 자격증</option>
          <option value="badge" ${_vmgrFilterPurpose==="badge"?"selected":""}>🎖️ 뱃지</option>
          <option value="language" ${_vmgrFilterPurpose==="language"?"selected":""}>🌐 어학</option>
        </select></div>
      <div style="flex:1;min-width:200px"><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">제도그룹</label>
        <select onchange="_vmgrFilterTplId=this.value;renderVorgManagerMgmt()" style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;width:100%">
          <option value="">-- 전체 제도그룹 --</option>
          ${filteredTpls.map(t=>`<option value="${t.id}" ${t.id===_vmgrFilterTplId?"selected":""}>${t.name}</option>`).join("")}
        </select></div>
      <div><button onclick="renderVorgManagerMgmt()" style="padding:8px 20px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button></div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:#9CA3AF">
      조회 결과: <b style="color:#374151">${filteredTpls.length}개</b> 제도그룹
      ${selTpl?` → <b style="color:#1D4ED8">${selTpl.name}</b> 상세 조회 중`:" (전체 표시)"}
    </div>
  </div>
  ${selTpl
    ? `<div><div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #E5E7EB">📋 ${selTpl.name} — 담당자 현황</div>${_renderMgrRows(selTpl)}</div>`
    : filteredTpls.length
      ? filteredTpls.map(tpl=>`<div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:10px;padding:8px 14px;background:#F3F4F6;border-radius:8px;display:flex;align-items:center;gap:8px">
            📋 ${tpl.name} <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${_purposeLabel(tpl.purpose)}</span>
          </div>${_renderMgrRows(tpl)}</div>`).join("")
      : `<div style="padding:60px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:14px"><div style="font-size:32px;margin-bottom:12px">👤</div><div style="font-size:13px;font-weight:700">조회 결과가 없습니다</div></div>`
  }
</div>`;
}

async function _vmgrAddManager(tplId, gi) {
  if (typeof _vuAddManager === "function") {
    _vuTplId = tplId;
    _vuAddManager(tplId, gi);
    setTimeout(() => renderVorgManagerMgmt(), 800);
  } else { alert("제도그룹 관리 메뉴에서 담당자를 추가해 주세요."); }
}

async function _vmgrRemoveManager(tplId, gi, mi) {
  if (!confirm("이 담당자를 해제하시겠습니까?")) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) { alert("DB 연결 실패"); return; }
    const { data: row } = await sb.from("virtual_org_templates").select("tree_data").eq("id", tplId).single();
    if (!row) return;
    const tree = row.tree_data || { hqs: [] };
    const g = (tree.hqs || [])[gi];
    if (!g) return;
    g.managers = (g.managers || []).filter((_, i) => i !== mi);
    await sb.from("virtual_org_templates").update({ tree_data: tree }).eq("id", tplId);
    renderVorgManagerMgmt();
  } catch(e) { alert("삭제 실패: " + e.message); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── 독립 메뉴②: 교육조직 협조처 관리 (renderVorgCoopMgmt) ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
let _vcoopFilterTenant = null;
let _vcoopFilterTplId = "";
let _vcoopFilterPurpose = "all";

async function renderVorgCoopMgmt() {
  const el = document.getElementById("bo-content");
  if (!el) return;

  const role = boCurrentPersona?.role;
  const isPlatform = role === "platform_admin";
  const tenants = typeof TENANTS !== "undefined" ? TENANTS.filter(t => t.id !== "SYSTEM") : [];

  if (!_vcoopFilterTenant) {
    _vcoopFilterTenant = isPlatform
      ? (tenants[0]?.id || "HMC")
      : (boCurrentPersona?.tenantId || "HMC");
  }

  let tplList = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("virtual_org_templates")
        .select("id,name,purpose,service_type,tree_data,tenant_id")
        .eq("tenant_id", _vcoopFilterTenant);
      if (data && data.length) {
        tplList = data.map(row => ({
          id: row.id, name: row.name,
          purpose: row.service_type || row.purpose || "edu_support",
          tree: row.tree_data || { hqs: [] },
        }));
      }
    }
  } catch(e) { console.warn("[VorgCoop] DB 로드 실패:", e.message); }

  const filteredTpls = _vcoopFilterPurpose === "all"
    ? tplList
    : tplList.filter(t => t.purpose === _vcoopFilterPurpose);

  const selTpl = _vcoopFilterTplId ? filteredTpls.find(t => t.id === _vcoopFilterTplId) : null;
  const _purposeLabel = (p) => ({ edu_support:"교육지원", cert:"자격증", badge:"뱃지", language:"어학" }[p] || p);

  const _renderCoopRows = (tpl) => {
    const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
    if (!groups.length) return `<div style="padding:30px;text-align:center;color:#9CA3AF;font-size:13px">교육조직이 없습니다.</div>`;
    return groups.map((g, gi) => {
      const coopTeams = g.coopTeams || [];
      return `<div class="bo-card" style="padding:16px 20px;margin-bottom:12px;border-left:4px solid #D97706">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:8px">
      <span>🏢</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${g.name}</span>
      <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">${coopTeams.length}개</span>
    </div>
    <button onclick="_vcoopOpenAddModal('${tpl.id}',${gi})"
      style="padding:5px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;color:#D97706">+ 협조처 추가</button>
  </div>
  <div style="display:flex;flex-direction:column;gap:6px">
    ${coopTeams.length
      ? coopTeams.map((ct,ci) => {
          const cType = ct.coopType || "교육협조처";
          const isJK = cType === "재경협조팀" || cType === "재경협조처";
          const tc = isJK ? {bg:"#FFFBEB",bdr:"#FDE68A",txt:"#92400E",icn:"💰"} : {bg:"#EFF6FF",bdr:"#BFDBFE",txt:"#1D4ED8",icn:"📚"};
          const rq = ct.required === "필수";
          const rqCond = ct.required === "조건부";
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:${tc.bg};border:1px solid ${tc.bdr};border-radius:10px">
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1">
    <span style="font-weight:800;font-size:13px;color:#111827">${ct.name||ct.teamName||ct}</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${tc.bdr};color:${tc.txt};font-weight:700">${tc.icn} ${cType}</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:6px;color:${rq?"#EF4444":rqCond?"#3B82F6":"#6B7280"};font-weight:700;background:${rq?"#FEF2F2":rqCond?"#EFF6FF":"#F3F4F6"};border:1px solid ${rq?"#FECACA":rqCond?"#DBEAFE":"#E5E7EB"}">
      ${rq?"🔴 필수협조처":rqCond?"🔵 조건부":"⚪ 선택"}
    </span>
    ${ct.role && ct.role!=="협조"?`<span style="font-size:10px;color:#6B7280">${ct.role}</span>`:""}
  </div>
  <button onclick="_vcoopRemove('${tpl.id}',${gi},${ci})" style="border:none;background:none;color:#D1D5DB;cursor:pointer;font-size:14px;flex-shrink:0">✕</button>
</div>`;
        }).join("")
      : `<div style="padding:16px;text-align:center;background:#F9FAFB;border:1.5px dashed #E5E7EB;border-radius:10px;color:#9CA3AF;font-size:12px">등록된 협조처가 없습니다</div>`
    }
  </div>
</div>`;
    }).join("");
  };

  const tenantsHtml = isPlatform
    ? `<div><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">테넌트(회사)</label>
      <select onchange="_vcoopFilterTenant=this.value;_vcoopFilterTplId='';renderVorgCoopMgmt()" style="padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px;color:#92400E">
        ${tenants.map(t=>`<option value="${t.id}" ${t.id===_vcoopFilterTenant?"selected":""}>${t.name} (${t.id})</option>`).join("")}
      </select></div>` : "";

  el.innerHTML = `<div class="bo-fade">
  <div style="margin-bottom:20px">
    <h2 style="font-size:18px;font-weight:900;color:#111827;margin:0 0 4px">🤝 교육조직 협조처 관리</h2>
    <p style="font-size:12px;color:#6B7280;margin:0">제도그룹별 교육조직(본부)의 협조처를 일괄 조회·관리합니다. 탭 내 관리와 동일한 데이터를 공유합니다.</p>
  </div>
  <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:14px;padding:16px 20px;margin-bottom:22px">
    <div style="font-size:11px;font-weight:800;color:#92400E;margin-bottom:12px">🔍 조회 조건</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      ${tenantsHtml}
      <div><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">용도(제도유형)</label>
        <select onchange="_vcoopFilterPurpose=this.value;_vcoopFilterTplId='';renderVorgCoopMgmt()" style="padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:130px">
          <option value="all" ${_vcoopFilterPurpose==="all"?"selected":""}>전체</option>
          <option value="edu_support" ${_vcoopFilterPurpose==="edu_support"?"selected":""}>📘 교육지원</option>
          <option value="cert" ${_vcoopFilterPurpose==="cert"?"selected":""}>📜 자격증</option>
          <option value="badge" ${_vcoopFilterPurpose==="badge"?"selected":""}>🎖️ 뱃지</option>
          <option value="language" ${_vcoopFilterPurpose==="language"?"selected":""}>🌐 어학</option>
        </select></div>
      <div style="flex:1;min-width:200px"><label style="display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">제도그룹</label>
        <select onchange="_vcoopFilterTplId=this.value;renderVorgCoopMgmt()" style="padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;width:100%">
          <option value="">-- 전체 제도그룹 --</option>
          ${filteredTpls.map(t=>`<option value="${t.id}" ${t.id===_vcoopFilterTplId?"selected":""}>${t.name}</option>`).join("")}
        </select></div>
      <div><button onclick="renderVorgCoopMgmt()" style="padding:8px 20px;background:#D97706;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button></div>
    </div>
    <div style="margin-top:10px;font-size:11px;color:#92400E">
      조회 결과: <b>${filteredTpls.length}개</b> 제도그룹
      ${selTpl?` → <b style="color:#D97706">${selTpl.name}</b> 상세 조회 중`:" (전체 표시)"}
    </div>
  </div>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
    <span style="font-size:10px;padding:3px 10px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-weight:700;border:1px solid #BFDBFE">📚 교육협조처</span>
    <span style="font-size:10px;padding:3px 10px;border-radius:6px;background:#FFFBEB;color:#92400E;font-weight:700;border:1px solid #FDE68A">💰 재경협조팀</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FEF2F2;color:#EF4444;font-weight:700;border:1px solid #FECACA">🔴 필수</span>
    <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#3B82F6;font-weight:700;border:1px solid #DBEAFE">🔵 조건부</span>
  </div>
  ${selTpl
    ? `<div><div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #E5E7EB">📋 ${selTpl.name} — 협조처 현황</div>${_renderCoopRows(selTpl)}</div>`
    : filteredTpls.length
      ? filteredTpls.map(tpl=>`<div style="margin-bottom:24px">
          <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:10px;padding:8px 14px;background:#FEF3C7;border-radius:8px;display:flex;align-items:center;gap:8px">📋 ${tpl.name}
            <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FFFBEB;color:#D97706;font-weight:700;border:1px solid #FDE68A">${_purposeLabel(tpl.purpose)}</span>
          </div>${_renderCoopRows(tpl)}</div>`).join("")
      : `<div style="padding:60px;text-align:center;color:#9CA3AF;background:#F9FAFB;border-radius:14px"><div style="font-size:32px;margin-bottom:12px">🤝</div><div style="font-size:13px;font-weight:700">조회 결과가 없습니다</div></div>`
  }
</div>`;
}

function _vcoopOpenAddModal(tplId, gi) {
  if (typeof _vuOpenCoopAddModal === "function") {
    _vuTplId = tplId;
    _vuOpenCoopAddModal(tplId, gi);
    setTimeout(() => renderVorgCoopMgmt(), 800);
  } else { alert("제도그룹 관리 메뉴에서 협조처를 추가해 주세요."); }
}

async function _vcoopRemove(tplId, gi, ci) {
  if (!confirm("이 협조처를 삭제하시겠습니까?")) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) { alert("DB 연결 실패"); return; }
    const { data: row } = await sb.from("virtual_org_templates").select("tree_data").eq("id", tplId).single();
    if (!row) return;
    const tree = row.tree_data || { hqs: [] };
    const g = (tree.hqs || [])[gi];
    if (!g) return;
    g.coopTeams = (g.coopTeams || []).filter((_, i) => i !== ci);
    await sb.from("virtual_org_templates").update({ tree_data: tree }).eq("id", tplId);
    renderVorgCoopMgmt();
  } catch(e) { alert("삭제 실패: " + e.message); }
}
