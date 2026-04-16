// ─── 플랫폼 관리 메뉴: 테넌트/조직/사용자/역할 ─────────────────────────────
// Supabase에서 실시간 데이터 로드, 실패 시 mock fallback

// ── 공통 헬퍼 ──────────────────────────────────────────────────────────────
function _sb() {
  return typeof getSB === "function" ? getSB() : null;
}

async function _sbGet(table, filters = {}) {
  if (!_sb()) return null;
  try {
    let q = _sb().from(table).select("*");
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("[SB]", table, e.message);
    return null;
  }
}

async function _sbUpsert(table, row, conflict = "id") {
  if (!_sb()) return null;
  try {
    const { data, error } = await _sb()
      .from(table)
      .upsert(row, { onConflict: conflict })
      .select();
    if (error) throw error;
    return data?.[0];
  } catch (e) {
    console.error("[SB upsert]", table, e.message);
    throw e;
  }
}

async function _sbDelete(table, id) {
  if (!_sb()) return;
  const { error } = await _sb().from(table).delete().eq("id", id);
  if (error) throw error;
}

function _roleColor(code) {
  return (
    {
      learner: "#6B7280",
      platform_admin: "#4F46E5",
      tenant_admin: "#2563EB",
      budget_admin: "#9333EA",
      budget_ops: "#16A34A",
    }[code] || "#6B7280"
  );
}
function _roleBg(code) {
  return (
    {
      learner: "#F3F4F6",
      platform_admin: "#EEF2FF",
      tenant_admin: "#DBEAFE",
      budget_admin: "#F3E8FF",
      budget_ops: "#DCFCE7",
    }[code] || "#F3F4F6"
  );
}
function _roleName(code) {
  return (
    {
      learner: "학습자",
      platform_admin: "플랫폼총괄관리자",
      tenant_admin: "테넌트총괄관리자",
      budget_admin: "예산총괄관리자",
      budget_ops: "예산운영담당자",
    }[code] || code
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ① 테넌트/회사 관리
// ══════════════════════════════════════════════════════════════════════════════
async function renderTenantMgmt() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const tenants = (await _sbGet("tenants")) || TENANTS || [];
  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🏢 테넌트/회사 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">플랫폼에 등록된 회사를 관리합니다.</p>
    </div>
    <button onclick="_openTenantModal()" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 회사 등록</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
    ${tenants
      .map(
        (t) => `
    <div style="background:white;border:1.5px solid #E5E7EB;border-radius:14px;padding:18px 20px;position:relative">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:18px;font-weight:900;color:#111827">${t.short_name || t.id}</span>
        <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;background:${t.active ? "#D1FAE5" : "#F3F4F6"};color:${t.active ? "#065F46" : "#6B7280"}">${t.active ? "활성" : "비활성"}</span>
      </div>
      <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">${t.name}</div>
      <div style="display:flex;gap:8px">
        <button onclick="_openTenantModal('${t.id}')" style="flex:1;padding:6px;border:1.5px solid #E5E7EB;border-radius:7px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
        <button onclick="_toggleTenantStatus('${t.id}',${!t.active})" style="flex:1;padding:6px;border:1.5px solid ${t.active ? "#FEE2E2" : "#D1FAE5"};border-radius:7px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:${t.active ? "#DC2626" : "#16A34A"}">${t.active ? "비활성화" : "활성화"}</button>
      </div>
    </div>`,
      )
      .join("")}
  </div>
</div>

<!-- 테넌트 모달 -->
<div id="tenant-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:420px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 20px;color:#111827" id="tenant-modal-title">회사 등록</h2>
    <input type="hidden" id="tenant-edit-id"/>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">회사명 *</label>
        <input id="tenant-name" type="text" placeholder="예: 현대트랜시스" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">단축명(ID) *</label>
        <input id="tenant-id-input" type="text" placeholder="예: HTS" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">상태</label>
        <select id="tenant-active" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveTenant()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="_closeTenantModal()" style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

window._openTenantModal = function (id) {
  const m = document.getElementById("tenant-modal");
  document.getElementById("tenant-modal-title").textContent = id
    ? "회사 수정"
    : "회사 등록";
  document.getElementById("tenant-edit-id").value = id || "";
  if (id) {
    const t = (TENANTS || []).find((x) => x.id === id) || {};
    document.getElementById("tenant-name").value = t.name || "";
    document.getElementById("tenant-id-input").value = t.id || "";
    document.getElementById("tenant-active").value = String(t.active !== false);
  } else {
    document.getElementById("tenant-name").value = "";
    document.getElementById("tenant-id-input").value = "";
    document.getElementById("tenant-active").value = "true";
  }
  m.style.display = "flex";
};
window._closeTenantModal = function () {
  document.getElementById("tenant-modal").style.display = "none";
};
window._saveTenant = async function () {
  const id = document
    .getElementById("tenant-id-input")
    .value.trim()
    .toUpperCase();
  const name = document.getElementById("tenant-name").value.trim();
  if (!id || !name) {
    alert("ID와 회사명을 입력해주세요");
    return;
  }
  try {
    await _sbUpsert(
      "tenants",
      {
        id,
        name,
        short_name: id,
        active: document.getElementById("tenant-active").value === "true",
      },
      "id",
    );
    _closeTenantModal();
    renderTenantMgmt();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};
window._toggleTenantStatus = async function (id, active) {
  try {
    await _sb().from("tenants").update({ active }).eq("id", id);
    renderTenantMgmt();
  } catch (e) {
    alert("변경 실패: " + e.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ② 조직 관리
// ══════════════════════════════════════════════════════════════════════════════
let _orgSelectedTenant = "";

// 조직 유형 정의
const ORG_TYPES = {
  headquarters: { label: "본부", icon: "🏛️", color: "#1D4ED8", bg: "#DBEAFE" },
  center: { label: "센터", icon: "🔬", color: "#7C3AED", bg: "#EDE9FE" },
  division: { label: "사업부", icon: "🏭", color: "#059669", bg: "#D1FAE5" },
  office: { label: "실", icon: "🗂️", color: "#D97706", bg: "#FEF3C7" },
  team: { label: "팀", icon: "👥", color: "#374151", bg: "#F3F4F6" },
  group: { label: "그룹", icon: "📎", color: "#6B7280", bg: "#F9FAFB" },
};

async function renderOrgMgmt() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const tenants = ((await _sbGet("tenants")) || TENANTS || []).filter(
    (t) => t.id !== "SYSTEM",
  );
  if (!_orgSelectedTenant && tenants.length) _orgSelectedTenant = tenants[0].id;
  const selectedTenant = tenants.find((t) => t.id === _orgSelectedTenant) || {};
  const orgs = _orgSelectedTenant
    ? (await _sbGet("organizations", { tenant_id: _orgSelectedTenant })) || []
    : [];

  // 드래그앤드롭 상태
  window._dndDragId = null;
  window._dndAllOrgs = orgs;

  // 순환 참조 방지: targetId가 dragId의 자손인지 확인
  function isDescendant(items, dragId, targetId) {
    if (dragId === targetId) return true;
    const children = items.filter((o) => o.parent_id === dragId);
    return children.some((c) => isDescendant(items, c.id, targetId));
  }

  // 트리 재귀 빌드 (depth 0 = 회사 하위 1레벨)
  function buildTree(items, parentId, depth) {
    const children = items
      .filter((o) => o.parent_id === parentId)
      .sort((a, b) => a.order_seq - b.order_seq);
    if (!children.length) return "";
    return children
      .map((o) => {
        const ot = ORG_TYPES[o.type] || ORG_TYPES.team;
        const hasChildren = items.some((x) => x.parent_id === o.id);
        const indent = depth * 24;
        const isDeprecated = o.status === "deprecated";
        const depStyle = isDeprecated ? "opacity:.55;" : "";
        const nameStyle = isDeprecated
          ? "text-decoration:line-through;color:#9CA3AF"
          : "color:#111827";
        const depIcon = isDeprecated ? "🚫 " : "";
        const depBadge = isDeprecated
          ? `<span style="padding:1px 5px;background:#FEE2E2;color:#DC2626;border-radius:4px;font-size:9px;font-weight:800;margin-left:4px">미사용</span>`
          : "";
        return `
      <div data-org-drop="${o.id}" style="margin-bottom:3px">
        <div class="org-drop-before" data-before="${o.id}"
             style="height:4px;border-radius:2px;margin-bottom:2px;transition:all .15s"></div>
        <div data-org-row="${o.id}"
             draggable="true"
             ondragover="window._orgDragOver(event,'${o.id}')"
             ondragleave="window._orgDragLeave(event,'${o.id}')"
             ondrop="window._orgDrop(event,'${o.id}')"
             ondragstart="window._orgDragStart(event,'${o.id}')"
             ondragend="window._orgDragEnd(event)"
             style="display:flex;align-items:center;gap:8px;padding:9px 12px 9px ${12 + indent}px;
                    background:${isDeprecated ? "#FAFAFA" : "white"};border:1px solid ${isDeprecated ? "#E5E7EB" : "#F3F4F6"};border-radius:8px;
                    border-left:3px solid ${isDeprecated ? "#D1D5DB" : ot.color};cursor:grab;transition:opacity .15s,background .15s;${depStyle}">
          <span style="font-size:11px;color:#CBD5E1;margin-right:2px;cursor:grab" title="드래그하여 이동">⠿</span>
          <span style="font-size:13px">${depIcon}${ot.icon}</span>
          <span style="font-size:13px;font-weight:700;${nameStyle};flex:1">${o.name}${depBadge}</span>
          <span style="padding:2px 7px;background:${ot.bg};color:${ot.color};border-radius:5px;font-size:10px;font-weight:800">${ot.label}</span>
          <div style="display:flex;gap:5px;margin-left:4px">
            <button onclick="_openOrgModal('${o.id}','${_orgSelectedTenant}')"
              style="padding:3px 9px;border:1px solid #E5E7EB;border-radius:5px;background:white;font-size:10px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
            ${
              !isDeprecated
                ? `<button onclick="_openOrgModal(null,'${_orgSelectedTenant}','${o.id}')"
              style="padding:3px 9px;border:1px solid #DBEAFE;border-radius:5px;background:#EFF6FF;font-size:10px;font-weight:700;cursor:pointer;color:#1D4ED8">+ 하위</button>`
                : ""
            }
            ${
              isDeprecated
                ? `<button onclick="_reactivateOrg('${o.id}','${o.name.replace(/'/g, "\\'")}')" style="padding:3px 9px;border:1px solid #D1FAE5;border-radius:5px;background:#ECFDF5;font-size:10px;font-weight:700;cursor:pointer;color:#059669">♻️ 재활성</button>`
                : `<button onclick="_deprecateOrg('${o.id}','${o.name.replace(/'/g, "\\'")}')" style="padding:3px 9px;border:1px solid #FDE68A;border-radius:5px;background:#FFFBEB;font-size:10px;font-weight:700;cursor:pointer;color:#92400E">🚫 폐지</button>`
            }
            <button onclick="_deleteOrg('${o.id}','${o.name}',${hasChildren})"
              style="padding:3px 9px;border:1px solid #FEE2E2;border-radius:5px;background:#FFF5F5;font-size:10px;font-weight:700;cursor:pointer;color:#DC2626">🗑️</button>
          </div>
        </div>
        <div style="margin-left:${indent + 16}px;border-left:2px dashed ${isDeprecated ? "#E5E7EB" : "#CBD5E1"};padding-left:8px;margin-top:3px">
          ${buildTree(items, o.id, depth + 1)}
        </div>
      </div>`;
      })
      .join("");
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:980px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">🗂️ 조직 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사를 최상위(0레벨)로 조직 계층 구조를 관리합니다.</p>
    </div>
    <button onclick="_openOrgModal(null,'${_orgSelectedTenant}')"
      style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">
      + 조직 추가
    </button>
  </div>

  <!-- 회사 선택 -->
  <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
    <label style="font-size:12px;font-weight:700;color:#374151">회사 선택</label>
    <select onchange="window._orgChangeTenant(this.value)"
      style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px;font-size:13px;min-width:160px">
      ${tenants.map((t) => `<option value="${t.id}" ${t.id === _orgSelectedTenant ? "selected" : ""}>${t.name}</option>`).join("")}
    </select>
    <span style="font-size:12px;color:#6B7280">총 ${orgs.length}개 조직</span>
  </div>

  <!-- 트리 -->
  <div style="background:#F9FAFB;border-radius:14px;padding:16px;min-height:240px">

    <!-- 레벨 0: 회사 (루트 노드) -->
    <div style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
                  background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:10px;color:white">
        <span style="font-size:18px">🏢</span>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:900">${selectedTenant.name || _orgSelectedTenant}</div>
          <div style="font-size:10px;opacity:.7">회사 (레벨 0 · 루트)</div>
        </div>
        <span style="padding:3px 10px;background:rgba(255,255,255,.2);border-radius:6px;font-size:10px;font-weight:800">${selectedTenant.id || ""}</span>
      </div>

      <!-- 레벨 1+ 조직 트리 + 루트 드롭존 -->
      <div id="org-root-dropzone"
           ondragover="window._orgRootDragOver(event)"
           ondragleave="window._orgRootDragLeave(event)"
           ondrop="window._orgDropToRoot(event)"
           style="margin-top:6px;margin-left:16px;border-left:2px dashed #CBD5E1;padding-left:8px;
                  min-height:40px;border-radius:6px;transition:outline .15s">
        ${
          orgs.length
            ? buildTree(orgs, null, 0)
            : "<p style=\"text-align:center;color:#9CA3AF;font-size:12px;padding:32px 0\">등록된 조직이 없습니다.<br/>상단 '+ 조직 추가' 버튼으로 최상위 조직을 추가하세요.</p>"
        }
      </div>
    </div>

    <!-- 범례 -->
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #E5E7EB;display:flex;gap:10px;flex-wrap:wrap">
      ${Object.entries(ORG_TYPES)
        .map(
          ([k, v]) => `
        <span style="display:flex;align-items:center;gap:4px;padding:4px 10px;background:${v.bg};border-radius:6px;font-size:10px;font-weight:800;color:${v.color}">
          ${v.icon} ${v.label}
        </span>`,
        )
        .join("")}
    </div>
  </div>
</div>

<!-- 조직 추가/수정 모달 -->
<div id="org-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:440px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 6px" id="org-modal-title">조직 추가</h2>
    <p id="org-modal-parent-label" style="font-size:11px;color:#6B7280;margin:0 0 18px"></p>
    <input type="hidden" id="org-edit-id"/>
    <input type="hidden" id="org-tenant-id"/>
    <input type="hidden" id="org-parent-id"/>
    <div style="display:grid;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">조직명 *</label>
        <input id="org-name" type="text" placeholder="예: 인재개발부문"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">조직 유형</label>
        <select id="org-type" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="headquarters">🏛️ 본부</option>
          <option value="center">🔬 센터</option>
          <option value="division">🏭 사업부</option>
          <option value="office">🗂️ 실</option>
          <option value="team" selected>👥 팀</option>
          <option value="group">📎 그룹</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:4px">표시 순서</label>
        <input id="org-order" type="number" value="0" min="0"
          style="width:100px;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px"/>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveOrg()"
        style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('org-modal').style.display='none'"
        style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

window._orgChangeTenant = function (id) {
  _orgSelectedTenant = id;
  renderOrgMgmt();
};

window._openOrgModal = async function (editId, tenantId, parentId) {
  document.getElementById("org-edit-id").value = editId || "";
  document.getElementById("org-tenant-id").value = tenantId || "";
  document.getElementById("org-parent-id").value = parentId || "";
  document.getElementById("org-modal-title").textContent = editId
    ? "조직 수정"
    : "조직 추가";

  // 상위 조직 이름 표시
  let parentLabel = "";
  if (parentId && !editId) {
    const orgs = (await _sbGet("organizations", { tenant_id: tenantId })) || [];
    const p = orgs.find((o) => o.id === parentId);
    if (p)
      parentLabel = `상위 조직: ${(ORG_TYPES[p.type] || {}).label || p.type} · ${p.name}`;
  } else if (!editId && !parentId) {
    const tenants = (await _sbGet("tenants")) || TENANTS || [];
    const t = tenants.find((x) => x.id === tenantId);
    parentLabel = `상위: 회사(루트) · ${t ? t.name : tenantId}`;
  }
  document.getElementById("org-modal-parent-label").textContent = parentLabel;

  if (editId) {
    const orgs = (await _sbGet("organizations", { tenant_id: tenantId })) || [];
    const o = orgs.find((x) => x.id === editId) || {};
    document.getElementById("org-name").value = o.name || "";
    document.getElementById("org-type").value = o.type || "team";
    document.getElementById("org-order").value = o.order_seq || 0;
    // ✅ 핵심 버그 수정: 수정 시 기존 parent_id를 hidden 필드에 세팅
    document.getElementById("org-parent-id").value = o.parent_id || "";

    // 상위 조직 레이블 표시
    if (o.parent_id) {
      const p = orgs.find((x) => x.id === o.parent_id);
      if (p)
        document.getElementById("org-modal-parent-label").textContent =
          `상위 조직: ${(ORG_TYPES[p.type] || {}).label || p.type} · ${p.name}`;
    } else {
      const tenantList = (await _sbGet("tenants")) || TENANTS || [];
      const t = tenantList.find((x) => x.id === tenantId);
      document.getElementById("org-modal-parent-label").textContent =
        `상위: 회사(루트) · ${t ? t.name : tenantId}`;
    }
  } else {
    document.getElementById("org-name").value = "";
    document.getElementById("org-type").value = "team";
    document.getElementById("org-order").value = 0;
  }
  document.getElementById("org-modal").style.display = "flex";
};

window._saveOrg = async function () {
  const name = document.getElementById("org-name").value.trim();
  if (!name) {
    alert("조직명을 입력하세요");
    return;
  }
  const editId = document.getElementById("org-edit-id").value;
  const row = {
    tenant_id: document.getElementById("org-tenant-id").value,
    parent_id: document.getElementById("org-parent-id").value || null,
    name,
    type: document.getElementById("org-type").value,
    order_seq: parseInt(document.getElementById("org-order").value) || 0,
  };
  if (editId) row.id = editId;
  try {
    await _sbUpsert("organizations", row, "id");
    document.getElementById("org-modal").style.display = "none";
    renderOrgMgmt();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};

window._deleteOrg = async function (orgId, orgName, hasChildren) {
  if (hasChildren) {
    alert(
      `"${orgName}"에 하위 조직이 있습니다.\n하위 조직을 먼저 삭제한 후 진행해주세요.`,
    );
    return;
  }
  if (!confirm(`"${orgName}" 조직을 삭제하시겠습니까?`)) return;
  try {
    await _sbDelete("organizations", orgId);
    renderOrgMgmt();
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
};

// ── 조직 폐지 (부모만, 하위 연쇄 없음) ──
window._deprecateOrg = async function (orgId, orgName) {
  if (!_sb()) return;
  // 소속 직원 확인
  try {
    const { data: users } = await _sb()
      .from("users")
      .select("id,name")
      .eq("org_id", orgId)
      .eq("status", "active");
    if (users && users.length > 0) {
      const names = users
        .slice(0, 5)
        .map((u) => u.name)
        .join(", ");
      const more = users.length > 5 ? ` 외 ${users.length - 5}명` : "";
      if (
        !confirm(
          `⚠️ "${orgName}"에 활성 직원 ${users.length}명이 소속되어 있습니다.\n(${names}${more})\n\n폐지 후 해당 직원의 소속 조직을 변경하세요.\n계속 진행하시겠습니까?`,
        )
      )
        return;
    }
  } catch (e) {
    /* ignore */
  }
  const reason = prompt(
    `"${orgName}" 조직을 폐지합니다.\n\n폐지 사유를 입력하세요:\n(예: 조직개편, 합병, 업무 이관 등)`,
  );
  if (reason === null) return;
  try {
    await _sb()
      .from("organizations")
      .update({
        status: "deprecated",
        deprecated_at: new Date().toISOString(),
        deprecated_reason: reason || "사유 미입력",
      })
      .eq("id", orgId);
    alert(
      `✅ "${orgName}" 조직이 폐지(미사용) 처리되었습니다.\n\n💡 하위 조직은 영향 없이 유지됩니다.`,
    );
    await renderOrgMgmt();
  } catch (e) {
    alert("폐지 실패: " + e.message);
  }
};

// ── 조직 재활성화 ──
window._reactivateOrg = async function (orgId, orgName) {
  if (!confirm(`"${orgName}" 조직을 재활성화하시겠습니까?`)) return;
  if (!_sb()) return;
  try {
    await _sb()
      .from("organizations")
      .update({
        status: "active",
        deprecated_at: null,
        deprecated_reason: null,
      })
      .eq("id", orgId);
    alert(`✅ "${orgName}" 조직이 재활성화되었습니다.`);
    await renderOrgMgmt();
  } catch (e) {
    alert("재활성화 실패: " + e.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════

// ── DnD 핸들러 ──────────────────────────────────────────────────────────────

function _isOrgDescendant(items, dragId, targetId) {
  if (dragId === targetId) return true;
  const children = items.filter((o) => o.parent_id === dragId);
  return children.some((c) => _isOrgDescendant(items, c.id, targetId));
}

window._orgDragStart = function (e, orgId) {
  window._dndDragId = orgId;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", orgId);
  setTimeout(() => {
    const row = document.querySelector(`[data-org-row="${orgId}"]`);
    if (row) row.style.opacity = "0.35";
  }, 0);
};

window._orgDragEnd = function () {
  document.querySelectorAll("[data-org-row]").forEach((el) => {
    el.style.opacity = "1";
    el.style.background = "";
  });
  document.querySelectorAll("[data-org-drop]").forEach((el) => {
    el.style.outline = "";
    el.style.background = "";
  });
  const rootZone = document.getElementById("org-root-dropzone");
  if (rootZone) {
    rootZone.style.background = "";
    rootZone.style.outline = "";
  }
};

window._orgDragOver = function (e, targetId) {
  e.preventDefault();
  e.stopPropagation();
  if (!window._dndDragId || window._dndDragId === targetId) return;
  if (_isOrgDescendant(window._dndAllOrgs || [], window._dndDragId, targetId))
    return;
  e.dataTransfer.dropEffect = "move";
  const dropWrap = document.querySelector(`[data-org-drop="${targetId}"]`);
  if (dropWrap) dropWrap.style.outline = "2px dashed #4F46E5";
};

window._orgDragLeave = function (e, targetId) {
  const dropWrap = document.querySelector(`[data-org-drop="${targetId}"]`);
  if (dropWrap && !dropWrap.contains(e.relatedTarget))
    dropWrap.style.outline = "";
};

window._orgDrop = async function (e, targetId) {
  e.preventDefault();
  e.stopPropagation();
  const dragId = window._dndDragId;
  window._orgDragEnd();
  if (!dragId || dragId === targetId) return;
  const orgs = window._dndAllOrgs || [];
  if (_isOrgDescendant(orgs, dragId, targetId)) {
    alert("자신의 하위 조직 안으로는 이동할 수 없습니다.");
    return;
  }
  const dragged = orgs.find((o) => o.id === dragId);
  if (dragged && dragged.parent_id === targetId) return;
  try {
    if (typeof getSB === "function" && getSB())
      await getSB()
        .from("organizations")
        .update({ parent_id: targetId })
        .eq("id", dragId);
    window._dndDragId = null;
    await renderOrgMgmt();
  } catch (err) {
    alert("이동 실패: " + err.message);
  }
};

window._orgDropToRoot = async function (e) {
  e.preventDefault();
  e.stopPropagation();
  const dragId = window._dndDragId;
  window._orgDragEnd();
  if (!dragId) return;
  const orgs = window._dndAllOrgs || [];
  const dragged = orgs.find((o) => o.id === dragId);
  if (!dragged || dragged.parent_id === null) return;
  try {
    if (typeof getSB === "function" && getSB())
      await getSB()
        .from("organizations")
        .update({ parent_id: null })
        .eq("id", dragId);
    window._dndDragId = null;
    await renderOrgMgmt();
  } catch (err) {
    alert("이동 실패: " + err.message);
  }
};

window._orgRootDragOver = function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "move";
  const z = document.getElementById("org-root-dropzone");
  if (z) z.style.outline = "2px dashed #4F46E5";
};
window._orgRootDragLeave = function (e) {
  const z = document.getElementById("org-root-dropzone");
  if (z) z.style.outline = "";
};
// ③ 사용자 관리
// ══════════════════════════════════════════════════════════════════════════════
let _userFilterTenant = "";
let _userSearch = "";

// 직군 정의 (단일 선택)
window.JOB_TYPES = {
  general: { label: "일반직", color: "#374151", bg: "#F3F4F6" },
  research: { label: "연구직", color: "#7C3AED", bg: "#EDE9FE" },
  production: { label: "생산직", color: "#059669", bg: "#D1FAE5" },
  technical: { label: "기술직", color: "#1D4ED8", bg: "#DBEAFE" },
  executive: { label: "임원", color: "#B45309", bg: "#FEF3C7" },
};
function _jobLabel(code) {
  return (window.JOB_TYPES[code] || window.JOB_TYPES.general).label;
}
function _jobBg(code) {
  return (window.JOB_TYPES[code] || window.JOB_TYPES.general).bg;
}
function _jobColor(code) {
  return (window.JOB_TYPES[code] || window.JOB_TYPES.general).color;
}

async function renderUserMgmt() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const allTenants = (await _sbGet("tenants")) || TENANTS || [];
  const tenants = allTenants.filter((t) => t.id !== "SYSTEM");
  if (!_userFilterTenant && tenants.length) _userFilterTenant = tenants[0].id;

  let users =
    (await _sbGet(
      "users",
      _userFilterTenant ? { tenant_id: _userFilterTenant } : {},
    )) || [];
  if (_userSearch)
    users = users.filter(
      (u) =>
        u.name.includes(_userSearch) || (u.emp_no || "").includes(_userSearch),
    );

  // 역할 로드
  const userRoles =
    users.length && _sb()
      ? (() => {
          const ids = users.map((u) => u.id);
          return _sb()
            .from("user_roles")
            .select("*")
            .in("user_id", ids)
            .then((r) => r.data || []);
        })()
      : Promise.resolve([]);

  // 조직 로드 (현재 선택 회사)
  const orgsPromise = _userFilterTenant
    ? _sbGet("organizations", { tenant_id: _userFilterTenant })
    : Promise.resolve([]);

  const [roleData, orgData] = await Promise.all([userRoles, orgsPromise]);
  const allOrgs = orgData || [];

  function getRoles(userId) {
    return roleData.filter((r) => r.user_id === userId);
  }
  function getOrgName(orgId) {
    if (!orgId) return "-";
    const o = allOrgs.find((x) => x.id === orgId);
    return o ? o.name : orgId;
  }

  el.innerHTML = `
<div class="bo-fade" style="max-width:1080px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:20px;font-weight:900;color:#111827;margin:0">👤 사용자 관리</h1>
      <p style="font-size:12px;color:#6B7280;margin:4px 0 0">회사별 사용자 등록 및 조직·역할을 관리합니다.</p>
    </div>
    <button onclick="_openUserModal()" style="padding:10px 18px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer">+ 사용자 등록</button>
  </div>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <select onchange="_userFilterTenant=this.value;renderUserMgmt()" style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px;font-size:13px">
      <option value="">전체 회사</option>
      ${tenants.map((t) => `<option value="${t.id}" ${t.id === _userFilterTenant ? "selected" : ""}>${t.name}</option>`).join("")}
    </select>
    <div style="position:relative">
      <input type="text" placeholder="이름/사번 검색" value="${_userSearch}"
        oninput="_userSearch=this.value;renderUserMgmt()"
        style="border:1.5px solid #E5E7EB;border-radius:8px;padding:6px 12px 6px 32px;font-size:13px;width:180px"/>
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9CA3AF;font-size:12px">🔍</span>
    </div>
    <span style="font-size:12px;color:#6B7280">총 ${users.length}명</span>
  </div>
  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F9FAFB;border-bottom:1.5px solid #E5E7EB">
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">이름</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">사번</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">조직</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">직군</th>
        <th style="padding:10px 14px;text-align:left;font-weight:900;color:#374151">역할</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">상태</th>
        <th style="padding:10px 14px;text-align:center;font-weight:900;color:#374151">관리</th>
      </tr></thead>
      <tbody>
        ${
          users.length
            ? users
                .map(
                  (u, i) => `
        <tr style="border-bottom:1px solid #F3F4F6;background:${i % 2 ? "#FAFAFA" : "white"}">
          <td style="padding:10px 14px;font-weight:700;color:#111827">${u.name}</td>
          <td style="padding:10px 14px;color:#6B7280">${u.emp_no || "-"}</td>
          <td style="padding:10px 14px;color:#374151;font-size:11px">${getOrgName(u.org_id)}</td>
          <td style="padding:10px 14px">
            <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;
              background:${_jobBg(u.job_type)};color:${_jobColor(u.job_type)}">${_jobLabel(u.job_type)}</span>
          </td>
          <td style="padding:10px 14px">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${getRoles(u.id)
                .map(
                  (r) =>
                    `<span style="padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800;background:${_roleBg(r.role_code)};color:${_roleColor(r.role_code)}">${_roleName(r.role_code)}</span>`,
                )
                .join("")}
              ${getRoles(u.id).length === 0 ? '<span style="font-size:11px;color:#9CA3AF">-</span>' : ""}
            </div>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;
              background:${u.status === "active" ? "#D1FAE5" : "#F3F4F6"};color:${u.status === "active" ? "#065F46" : "#6B7280"}">${u.status === "active" ? "활성" : "비활성"}</span>
          </td>
          <td style="padding:10px 14px;text-align:center">
            <button onclick="_openUserModal('${u.id}')"
              style="padding:4px 10px;border:1.5px solid #E5E7EB;border-radius:6px;background:white;font-size:11px;font-weight:700;cursor:pointer;color:#374151">✏️ 수정</button>
          </td>
        </tr>`,
                )
                .join("")
            : `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9CA3AF;font-size:12px">등록된 사용자가 없습니다.</td></tr>`
        }
      </tbody>
    </table>
  </div>
</div>

<div id="user-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;align-items:center;justify-content:center">
  <div style="background:white;border-radius:16px;padding:28px;width:500px;max-width:92vw;max-height:88vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <h2 style="font-size:16px;font-weight:900;margin:0 0 18px" id="user-modal-title">사용자 등록</h2>
    <input type="hidden" id="user-edit-id"/>
    <div style="display:grid;gap:12px">
      <!-- 이름 / 사번 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이름 *</label>
          <input id="user-name" type="text" placeholder="홍길동"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">사번</label>
          <input id="user-empno" type="text" placeholder="12345"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      </div>
      <!-- 이메일 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">이메일</label>
        <input id="user-email" type="email" placeholder="hong@hmg.com"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;box-sizing:border-box"/></div>
      <!-- 회사 / 직군 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">회사 *</label>
          <select id="user-tenant" onchange="_loadUserOrgOptions(this.value); window._loadUserRoleOptions(this.value)"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            ${tenants.map((t) => `<option value="${t.id}">${t.name}</option>`).join("")}
          </select></div>
        <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">직군 *</label>
          <select id="user-jobtype"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
            ${Object.entries(window.JOB_TYPES)
              .map(([v, t]) => `<option value="${v}">${t.label}</option>`)
              .join("")}
          </select></div>
      </div>
      <!-- 조직 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">소속 조직</label>
        <select id="user-org"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="">-- 조직 미지정 --</option>
        </select></div>
      <!-- 역할 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:6px">역할 부여
        <span style="font-weight:400;color:#6B7280">(학습자는 기본 부여)</span></label>
        <div id="user-role-container" style="display:grid;gap:6px">
          <!-- 역할 목록이 동적 로드됩니다. -->
        </div>
      </div>
      <!-- 상태 -->
      <div><label style="font-size:11px;font-weight:800;color:#374151;display:block;margin-bottom:3px">상태</label>
        <select id="user-status" style="width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px">
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
        </select></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:20px">
      <button onclick="_saveUser()" style="flex:1;padding:10px;background:#4F46E5;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">저장</button>
      <button onclick="document.getElementById('user-modal').style.display='none'"
        style="flex:1;padding:10px;background:#F3F4F6;color:#374151;border:none;border-radius:8px;font-size:13px;cursor:pointer">취소</button>
    </div>
  </div>
</div>`;
}

// 회사 변경 시 조직 드롭다운을 동적 로드
window._loadUserOrgOptions = async function (tenantId, selectedOrgId) {
  const sel = document.getElementById("user-org");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- 조직 미지정 --</option>';
  if (!tenantId || !_sb()) return;
  const orgs = (await _sbGet("organizations", { tenant_id: tenantId })) || [];

  // 트리 순서로 정렬 (부모 먼저)
  function flatOrgs(items, parentId, depth) {
    return items
      .filter((o) => o.parent_id === parentId)
      .sort((a, b) => a.order_seq - b.order_seq)
      .flatMap((o) => [
        { ...o, _depth: depth },
        ...flatOrgs(items, o.id, depth + 1),
      ]);
  }
  const flat = flatOrgs(orgs, null, 0);
  flat.forEach((o) => {
    const ot =
      typeof ORG_TYPES !== "undefined" && ORG_TYPES[o.type]
        ? ORG_TYPES[o.type]
        : { label: o.type, icon: "" };
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent =
      "　".repeat(o._depth) +
      (ot.icon || "") +
      " " +
      o.name +
      " (" +
      ot.label +
      ")";
    if (o.id === selectedOrgId) opt.selected = true;
    sel.appendChild(opt);
  });
};

// 회사 변경 시 역할 체크박스를 동적 로드
window._loadUserRoleOptions = async function (
  tenantId,
  selectedRoleCodes = [],
) {
  const container = document.getElementById("user-role-container");
  if (!container) return;
  container.innerHTML =
    '<span style="font-size:12px;color:#9CA3AF">역할을 불러오는 중...</span>';
  if (!tenantId || !_sb()) return;

  const roles = (await _sbGet("roles", { tenant_id: tenantId })) || [];
  // 학습자 권한(_learner로 끝나거나 '학습자' 포함)은 숨김 처리 (기본 부여)
  const selectableRoles = roles.filter(
    (r) => !r.code.endsWith("_learner") && !r.name.includes("학습자"),
  );

  if (!selectableRoles.length) {
    container.innerHTML =
      '<span style="font-size:12px;color:#9CA3AF">선택 가능한 역할이 없습니다.</span>';
    return;
  }

  container.innerHTML = selectableRoles
    .map(
      (r) => `
    <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;cursor:pointer">
      <input type="checkbox" name="user-role" value="${r.code}" ${selectedRoleCodes.includes(r.code) ? "checked" : ""} style="width:14px;height:14px;accent-color:#4F46E5"/>
      <div>
        <span style="font-size:12px;font-weight:800;color:#111827;display:block">${r.name}</span>
        ${r.description ? `<span style="font-size:10px;color:#6B7280;display:block">${r.description}</span>` : ""}
      </div>
    </label>
  `,
    )
    .join("");
};

window._openUserModal = async function (userId) {
  document.getElementById("user-edit-id").value = userId || "";
  document.getElementById("user-modal-title").textContent = userId
    ? "사용자 수정"
    : "사용자 등록";
  document
    .querySelectorAll('[name="user-role"]')
    .forEach((cb) => (cb.checked = false));

  const tenantSel = document.getElementById("user-tenant");
  const defaultTenant = tenantSel ? tenantSel.options[0]?.value : "";

  if (userId) {
    const u =
      ((await _sbGet("users")) || []).find((x) => x.id === userId) || {};
    document.getElementById("user-name").value = u.name || "";
    document.getElementById("user-empno").value = u.emp_no || "";
    document.getElementById("user-email").value = u.email || "";
    if (tenantSel) tenantSel.value = u.tenant_id || defaultTenant;
    document.getElementById("user-jobtype").value = u.job_type || "general";
    document.getElementById("user-status").value = u.status || "active";
    // 조직 옵션 로드 후 선택
    await window._loadUserOrgOptions(u.tenant_id, u.org_id);
    // 역할 체크
    const roles = (await _sbGet("user_roles", { user_id: userId })) || [];
    const roleCodes = roles.map((r) => r.role_code);
    await window._loadUserRoleOptions(u.tenant_id, roleCodes);
  } else {
    document.getElementById("user-name").value = "";
    document.getElementById("user-email").value = "";
    if (tenantSel) tenantSel.value = _userFilterTenant || defaultTenant;
    document.getElementById("user-jobtype").value = "general";
    document.getElementById("user-status").value = "active";
    // 사번 자동채번: 현재 테넌트에서 가장 큰 사번 숫자+1
    const autoTenantId = _userFilterTenant || defaultTenant;
    let nextEmpNo = "";
    if (_sb()) {
      try {
        const { data: empData } = await _sb()
          .from("users")
          .select("emp_no")
          .eq("tenant_id", autoTenantId);
        const nums = (empData || [])
          .map((u) => parseInt((u.emp_no || "").replace(/\D/g, "")))
          .filter((n) => !isNaN(n) && n > 0);
        const maxNum = nums.length ? Math.max(...nums) : 0;
        // 접두어: 기존 사번에서 추출 (없으면 'P')
        const sample = (empData || []).find((u) =>
          /[A-Za-z]/.test(u.emp_no || ""),
        );
        const prefix = sample ? (sample.emp_no || "").replace(/\d+$/, "") : "P";
        nextEmpNo = prefix + String(maxNum + 1).padStart(3, "0");
      } catch (e) {
        nextEmpNo = "P" + String(Date.now()).slice(-4);
      }
    }
    document.getElementById("user-empno").value = nextEmpNo;
    await window._loadUserOrgOptions(autoTenantId, null);
    await window._loadUserRoleOptions(autoTenantId, []);
  }

  document.getElementById("user-modal").style.display = "flex";
};

window._saveUser = async function () {
  const name = document.getElementById("user-name").value.trim();
  const tenantId = document.getElementById("user-tenant").value;
  if (!name || !tenantId) {
    alert("이름과 회사를 입력해주세요");
    return;
  }
  const editId = document.getElementById("user-edit-id").value;
  const id = editId || "USR-" + Date.now();
  const orgId = document.getElementById("user-org").value || null;
  try {
    await _sbUpsert(
      "users",
      {
        id,
        tenant_id: tenantId,
        name,
        emp_no: document.getElementById("user-empno").value,
        email: document.getElementById("user-email").value,
        job_type: document.getElementById("user-jobtype").value,
        org_id: orgId,
        status: document.getElementById("user-status").value,
      },
      "id",
    );
    if (_sb()) await _sb().from("user_roles").delete().eq("user_id", id);

    // 테넌트 고유 학습자 권한 찾기 (fallback으로 tenantId_learner)
    const allRoles = (await _sbGet("roles", { tenant_id: tenantId })) || [];
    const learnerRole = allRoles.find(
      (r) => r.code.endsWith("_learner") || r.name.includes("학습자"),
    );
    const learnerRoleCode = learnerRole
      ? learnerRole.code
      : tenantId + "_learner";

    const rolesToSave = [
      {
        user_id: id,
        role_code: learnerRoleCode,
        tenant_id: tenantId,
        scope_id: null,
      },
    ];
    document.querySelectorAll('[name="user-role"]:checked').forEach((cb) => {
      rolesToSave.push({
        user_id: id,
        role_code: cb.value,
        tenant_id: tenantId,
        scope_id: null,
      });
    });
    if (_sb()) await _sb().from("user_roles").insert(rolesToSave);
    document.getElementById("user-modal").style.display = "none";
    renderUserMgmt();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};

// ④ 역할 관리
// ══════════════════════════════════════════════════════════════════════════════
async function renderRoleMgmt() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const persona = boCurrentPersona;
  const isPlatform = persona.role === "platform_admin";
  const tenants =
    typeof TENANTS !== "undefined"
      ? TENANTS.filter((t) => t.id !== "SYSTEM")
      : [];

  // 현재 테넌트 필터 결정
  if (!window._rmFilterTenant) {
    window._rmFilterTenant = isPlatform
      ? tenants[0]?.id || ""
      : persona.tenantId || "";
  }
  const selTenantId = window._rmFilterTenant;

  // 해당 테넌트 역할만 조회
  const allRoles = (await _sbGet("roles")) || [
    // fallback mock
    {
      id: "platform_admin",
      code: "platform_admin",
      name: "플랫폼총괄관리자",
      description: "전체 플랫폼 설정·권한 관리",
      parent_role_id: null,
      tenant_id: null,
      is_system: true,
    },
    {
      id: "hmc_tenant_admin",
      code: "hmc_tenant_admin",
      name: "HMC 테넌트총괄관리자",
      description: "HMC 소속 회사 전체 관리",
      parent_role_id: null,
      tenant_id: "HMC",
      is_system: false,
    },
    {
      id: "hmc_budget_admin",
      code: "hmc_budget_admin",
      name: "HMC 예산총괄관리자(일반)",
      description: "HMC 일반예산 총괄",
      parent_role_id: "hmc_tenant_admin",
      tenant_id: "HMC",
      is_system: false,
    },
    {
      id: "hmc_budget_rnd",
      code: "hmc_budget_rnd",
      name: "HMC 예산총괄관리자(R&D)",
      description: "HMC R&D예산 총괄",
      parent_role_id: "hmc_tenant_admin",
      tenant_id: "HMC",
      is_system: false,
    },
    {
      id: "hmc_budget_ops1",
      code: "hmc_budget_ops1",
      name: "HMC 예산운영담당자(A팀)",
      description: "일반예산 A팀 운영",
      parent_role_id: "hmc_budget_admin",
      tenant_id: "HMC",
      is_system: false,
    },
    {
      id: "hmc_budget_ops2",
      code: "hmc_budget_ops2",
      name: "HMC 예산운영담당자(B팀)",
      description: "일반예산 B팀 운영",
      parent_role_id: "hmc_budget_admin",
      tenant_id: "HMC",
      is_system: false,
    },
  ];

  const tenantRoles = allRoles.filter((r) => r.tenant_id === selTenantId);
  const allUserRoles = (await _sbGet("user_roles")) || [];

  function countByRole(id) {
    return new Set(
      allUserRoles
        .filter((r) => r.role_id === id || r.role_code === id)
        .map((r) => r.user_id),
    ).size;
  }

  // 역할 트리 재귀 렌더링 (들여쓰기 포함)
  const renderedIds = new Set();
  function buildTree(parentId, depth = 0) {
    const children = tenantRoles.filter(
      (r) => (r.parent_role_id || null) === parentId,
    );
    if (!children.length) return "";
    let html = "";
    const levelColors = ["#4F46E5", "#0369A1", "#059669", "#D97706", "#7C3AED"];
    children.forEach((r) => {
      renderedIds.add(r.id);
      const color = levelColors[Math.min(depth, levelColors.length - 1)];
      const indent = depth * 28;
      const cnt = countByRole(r.id);
      html += `
      <div style="display:flex;align-items:center;gap:0;border-bottom:1px solid #F1F5F9">
        ${indent > 0 ? `<div style="width:${indent}px;flex-shrink:0;border-left:2px solid #E2E8F0;margin-left:12px;border-bottom:1px solid #E2E8F0;height:24px"></div>` : ""}
        <div style="flex:1;display:flex;align-items:center;gap:16px;padding:14px 18px;background:${depth === 0 ? "#F8FAFC" : "#fff"}">
          <div style="padding:8px 14px;border-radius:8px;background:${color}18;border:1px solid ${color}30;min-width:110px;text-align:center">
            <div style="font-size:12px;font-weight:800;color:${color}">${r.name}</div>
            <div style="font-size:10px;color:${color};opacity:.7;margin-top:1px">${r.code}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;color:#6B7280">${r.description || "설명 없음"}</div>
          </div>
          <div style="text-align:center;min-width:56px">
            <div style="font-size:20px;font-weight:900;color:#111827">${cnt}</div>
            <div style="font-size:10px;color:#9CA3AF">배정 인원</div>
          </div>
          <button onclick="_viewRoleUsers('${r.id}')"
            style="padding:6px 12px;border:1px solid #E2E8F0;border-radius:6px;background:#fff;font-size:11px;font-weight:700;cursor:pointer;color:#374151">
            사용자 조회
          </button>
        </div>
      </div>`;
      html += buildTree(r.id, depth + 1);
    });
    return html;
  }

  let treeHtml = buildTree(null, 0);
  // 부모가 현재 테넌트 외부인 경우도 추가
  tenantRoles.forEach((r) => {
    if (!renderedIds.has(r.id)) treeHtml += buildTree(r.parent_role_id, 0);
  });

  if (!treeHtml)
    treeHtml = `<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px">이 테넌트에 등록된 역할이 없습니다.</div>`;

  const tenantSelect = isPlatform
    ? `
    <select onchange="window._rmFilterTenant=this.value;renderRoleMgmt()"
      style="padding:6px 12px;border:1.5px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;color:#1E293B;cursor:pointer">
      ${tenants.map((t) => `<option value="${t.id}" ${t.id === selTenantId ? "selected" : ""}>${t.name || t.id}</option>`).join("")}
    </select>`
    : `<span style="font-size:13px;font-weight:800;color:#1E293B">${selTenantId} 역할 현황</span>`;

  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <h1 style="font-size:18px;font-weight:800;color:#0F172A;margin:0">🔐 역할 관리</h1>
      <p style="font-size:12px;color:#64748B;margin:4px 0 0">테넌트별 독립 역할 계층 구조를 관리합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      ${tenantSelect}
      <button onclick="_openRoleModal()"
        style="padding:8px 16px;background:#0B132B;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
        + 역할 추가
      </button>
    </div>
  </div>
  <div style="background:white;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden">
    <div style="display:flex;align-items:center;gap:16px;padding:10px 18px;background:#F8FAFC;border-bottom:2px solid #334155">
      <div style="min-width:110px;font-size:11px;font-weight:800;color:#334155">역할명 / 코드</div>
      <div style="flex:1;font-size:11px;font-weight:800;color:#334155">설명</div>
      <div style="min-width:56px;font-size:11px;font-weight:800;color:#334155;text-align:center">배정인원</div>
      <div style="width:80px"></div>
    </div>
    ${treeHtml}
  </div>
  <div id="role-users-panel" style="display:none;margin-top:16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px"></div>
</div>`;
}

window._viewRoleUsers = async function (roleCode) {
  const panel = document.getElementById("role-users-panel");
  panel.style.display = "block";
  panel.innerHTML = '<p style="color:#9CA3AF;font-size:12px">조회 중...</p>';
  if (!_sb()) {
    panel.innerHTML =
      '<p style="color:#9CA3AF;font-size:12px">DB 연결이 필요합니다.</p>';
    return;
  }
  const { data: urList } = await _sb()
    .from("user_roles")
    .select("*")
    .eq("role_code", roleCode);
  if (!urList?.length) {
    panel.innerHTML = `<p style="color:#9CA3AF;font-size:12px;text-align:center;padding:20px">배정된 사용자가 없습니다.</p>`;
    return;
  }
  const ids = urList.map((r) => r.user_id);
  const { data: users } = await _sb().from("users").select("*").in("id", ids);
  panel.innerHTML = `<h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 12px">${_roleName(roleCode)} 배정 사용자 (${urList.length}명)</h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${(users || []).map((u) => `<span style="padding:6px 12px;background:white;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;color:#374151">${u.name} <span style="color:#9CA3AF;font-weight:400">(${u.tenant_id})</span></span>`).join("")}
  </div>`;
};

// ════════════════════════════════════════════════════════════════════════════
// ⑤ 역할별 메뉴 권한 관리 (테넌트별 분리 버전)
// ════════════════════════════════════════════════════════════════════════════

// 메뉴 정의 목록 (bo_layout.js PLATFORM_MENUS와 동기화)
const ALL_MENUS = [
  { id: "dashboard", label: "대시보드", depth1: "공통" },
  { id: "platform-monitor", label: "전사 예산 모니터링", depth1: "플랫폼" },
  { id: "tenant-mgmt", label: "테넌트/회사 관리", depth1: "플랫폼" },
  { id: "platform-roles", label: "관리자 권한 매핑", depth1: "플랫폼" },
  { id: "org-mgmt", label: "조직 관리", depth1: "테넌트" },
  { id: "user-mgmt", label: "사용자 관리", depth1: "테넌트" },
  { id: "role-mgmt", label: "역할 관리", depth1: "테넌트" },
  { id: "role-menu-perms", label: "역할별 메뉴 권한", depth1: "테넌트" },
  { id: "isolation-groups", label: "교육지원도메인 관리", depth1: "테넌트" },
  { id: "virtual-org", label: "제도그룹 관리", depth1: "교육제도" },
  { id: "budget-account", label: "예산 계정 관리", depth1: "교육제도" },
  { id: "calc-grounds", label: "산정기준 관리", depth1: "교육제도" },
  { id: "form-builder", label: "교육양식마법사", depth1: "교육제도" },
  { id: "field-mgmt", label: "입력 필드 관리", depth1: "교육제도" },
  { id: "service-policy", label: "교육지원 운영 규칙", depth1: "교육제도" },
  { id: "plan-mgmt", label: "교육계획 관리", depth1: "교육제도" },
  { id: "allocation", label: "예산 배정 및 관리", depth1: "교육제도" },
  { id: "my-operations", label: "나의 운영 업무", depth1: "교육제도" },
  { id: "org-budget", label: "조직 예산 현황", depth1: "교육제도" },
  { id: "approval-routing", label: "결재 라우팅", depth1: "교육제도" },
  { id: "reports", label: "통계 및 리포트", depth1: "현황/통계" },
  { id: "manual", label: "서비스 매뉴얼", depth1: "기타" },
];

// 역할 컬럼 색상 (계층별)
const ROLE_LEVEL_COLORS = [
  "#7C3AED",
  "#4F46E5",
  "#0369A1",
  "#059669",
  "#D97706",
  "#BE123C",
];

async function renderRoleMenuPerms() {
  const el = document.getElementById("bo-content");
  el.innerHTML =
    '<div class="bo-fade" style="padding:20px"><p style="color:#9CA3AF">로딩 중...</p></div>';

  const persona = boCurrentPersona;
  const isPlatform = persona.role === "platform_admin";
  const tenants =
    typeof TENANTS !== "undefined"
      ? TENANTS.filter((t) => t.id !== "SYSTEM")
      : [];

  // 테넌트 필터 (역할관리 화면과 동기화)
  if (!window._rmpFilterTenant) {
    window._rmpFilterTenant = isPlatform
      ? tenants[0]?.id || "HMC"
      : persona.tenantId || "HMC";
  }
  const selTenantId = window._rmpFilterTenant;

  // 해당 테넌트 역할 목록 DB 조회
  let tenantRoles = [];
  try {
    tenantRoles = (await _sbGet("roles", { tenant_id: selTenantId })) || [];
  } catch (e) {
    tenantRoles = [];
  }
  // fallback mock
  if (!tenantRoles.length && typeof TENANT_ROLES_MOCK !== "undefined") {
    tenantRoles = TENANT_ROLES_MOCK.filter((r) => r.tenant_id === selTenantId);
  }
  // 계층 정렬 (level 오름차순, 없으면 부모→자식)
  tenantRoles.sort((a, b) => (a.level || 99) - (b.level || 99));

  // 현재 권한 로드
  let currentPerms = {};
  if (_sb()) {
    const roleCodes = tenantRoles.map((r) => r.code);
    if (roleCodes.length) {
      try {
        const { data } = await _sb()
          .from("role_menu_permissions")
          .select("role_code, menu_id")
          .in("role_code", roleCodes);
        (data || []).forEach(({ role_code, menu_id }) => {
          if (!currentPerms[role_code]) currentPerms[role_code] = new Set();
          currentPerms[role_code].add(menu_id);
        });
      } catch (e) {}
    }
  }

  function isChecked(roleCode, menuId) {
    return currentPerms[roleCode]?.has(menuId) ? "checked" : "";
  }

  const tenantCtrl = isPlatform
    ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-weight:700;color:#64748B">테넌트 선택</span>
      <select onchange="window._rmpFilterTenant=this.value;renderRoleMenuPerms()"
        style="padding:6px 12px;border:1.5px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;color:#1E293B;cursor:pointer;background:#fff">
        ${tenants.map((t) => `<option value="${t.id}" ${t.id === selTenantId ? "selected" : ""}>${t.name || t.id}</option>`).join("")}
      </select>
    </div>`
    : `<span style="font-size:12px;font-weight:700;color:#1D4ED8">🏢 ${tenants.find((t) => t.id === selTenantId)?.name || selTenantId}</span>`;

  // 역할 헤더 컬럼 (현재 선택 테넌트 역할만)
  const roleHeaders = tenantRoles
    .map((r, i) => {
      const color =
        ROLE_LEVEL_COLORS[Math.min(i, ROLE_LEVEL_COLORS.length - 1)];
      return `<th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:800;color:${color};min-width:100px;white-space:nowrap">${r.name}</th>`;
    })
    .join("");

  const roleCheckboxes = (menuId) =>
    tenantRoles
      .map((r, i) => {
        const color =
          ROLE_LEVEL_COLORS[Math.min(i, ROLE_LEVEL_COLORS.length - 1)];
        return `<td style="padding:8px;text-align:center">
      <input type="checkbox" data-role="${r.code}" data-menu="${menuId}"
        ${isChecked(r.code, menuId)}
        style="width:15px;height:15px;cursor:pointer;accent-color:${color}"
        onchange="_onPermChange(this)"/>
    </td>`;
      })
      .join("");

  el.innerHTML = `
<div class="bo-fade" style="max-width:1200px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
    <div>
      <h1 style="font-size:18px;font-weight:800;color:#0F172A;margin:0">🔑 역할별 메뉴 권한 관리</h1>
      <p style="font-size:12px;color:#64748B;margin:4px 0 0">테넌트별 역할에 대한 메뉴 접근 권한을 설정합니다.</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      ${tenantCtrl}
      <button onclick="_saveRoleMenuPerms()"
        style="padding:8px 18px;background:#0B132B;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
        💾 변경사항 저장
      </button>
    </div>
  </div>

  ${
    tenantRoles.length === 0
      ? `
    <div style="padding:60px;text-align:center;color:#94A3B8;background:white;border-radius:10px;border:1px solid #E2E8F0">
      <div style="font-size:32px;margin-bottom:12px">🔑</div>
      <div style="font-size:14px;font-weight:700">이 테넌트에 역할이 없습니다</div>
      <div style="font-size:12px;margin-top:6px">역할 관리 메뉴에서 먼저 역할을 생성하세요</div>
    </div>`
      : `
  <div style="background:white;border:1px solid #E2E8F0;border-radius:10px;overflow:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#1E293B">
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:800;color:#94A3B8;width:100px;white-space:nowrap">1Depth 카테고리</th>
          <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:800;color:#94A3B8;min-width:160px">2Depth 메뉴</th>
          ${roleHeaders}
        </tr>
      </thead>
      <tbody>
        ${ALL_MENUS.map(
          (m, i) => `
        <tr style="border-bottom:1px solid #F1F5F9;background:${i % 2 ? "#F8FAFC" : "white"}">
          <td style="padding:8px 12px;font-size:11px;font-weight:700;color:#64748B">${m.depth1}</td>
          <td style="padding:8px 16px;font-weight:600;color:#374151">
            ${m.label}
            <span style="font-size:9px;color:#CBD5E1;margin-left:4px;font-family:monospace">${m.id}</span>
          </td>
          ${roleCheckboxes(m.id)}
        </tr>`,
        ).join("")}
      </tbody>
    </table>
  </div>`
  }
  <p id="perm-save-msg" style="margin-top:12px;font-size:12px;color:#059669;display:none;text-align:center;font-weight:700"></p>
</div>`;
}

// 체크박스 변경 즉시 메모리 반영
window._onPermChange = function (cb) {
  if (!window._pendingPermChanges) window._pendingPermChanges = [];
  window._pendingPermChanges.push({
    role: cb.dataset.role,
    menu: cb.dataset.menu,
    checked: cb.checked,
  });
  document.getElementById("perm-save-msg").style.display = "none";
};

// 저장: 현재 테넌트 역할의 체크 상태 전체 재저장
window._saveRoleMenuPerms = async function () {
  if (!_sb()) {
    alert("DB 연결이 필요합니다.");
    return;
  }
  const checks = document.querySelectorAll("[data-role][data-menu]");
  if (!checks.length) return;

  const toInsert = [];
  const roleCodes = new Set();
  checks.forEach((cb) => {
    roleCodes.add(cb.dataset.role);
    if (cb.checked)
      toInsert.push({ role_code: cb.dataset.role, menu_id: cb.dataset.menu });
  });

  try {
    await _sb()
      .from("role_menu_permissions")
      .delete()
      .in("role_code", [...roleCodes]);
    if (toInsert.length) {
      const { error } = await _sb()
        .from("role_menu_permissions")
        .insert(toInsert);
      if (error) throw error;
    }
    window._pendingPermChanges = [];
    if (typeof sbLoadRoleMenuPerms === "function") {
      await sbLoadRoleMenuPerms();
      if (typeof renderBoSidebar === "function") renderBoSidebar();
    }
    const msg = document.getElementById("perm-save-msg");
    if (msg) {
      msg.textContent = `✅ ${toInsert.length}건 권한 저장 완료`;
      msg.style.display = "block";
    }
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
};
