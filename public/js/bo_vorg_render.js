// ─── bo_vorg_render.js — VOrg 통합화면 렌더/탭/조직트리 (REFACTOR-3) ───
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