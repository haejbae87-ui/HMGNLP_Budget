// ─── BO 교육유형 관리 (플랫폼 총괄) ─────────────────────────────────────────
// 교육 목적군 / 유형 그룹 / 세부 유형을 트리 구조로 CRUD 관리

let _eduMgr = {
  purposes: [], // edu_purpose_groups
  groups: [], // edu_type_groups
  items: [], // edu_type_items
  expanded: {}, // 트리 펼침 상태 (purposeId/groupId)
  editMode: null, // { type:'purpose'|'group'|'item', id, data }
  filter: "all", // 'all'|'learner'|'admin'
};

// ─── 진입점 ───────────────────────────────────────────────────────────────────
async function renderEduTypeMgmt() {
  // bo-content에 직접 마운트 포인트 삽입
  const boContent = document.getElementById("bo-content");
  if (boContent) {
    boContent.innerHTML = `<div id="content-edu-type-mgmt"></div>
<div id="edu-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;align-items:center;justify-content:center">
  <div id="edu-modal-box" style="background:white;border-radius:16px;padding:28px 28px 24px;min-width:340px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.25)"></div>
</div>`;
  }
  const el = document.getElementById("content-edu-type-mgmt");
  if (!el) return;

  el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#9CA3AF;font-size:13px">⏳ 로딩 중...</div>`;

  try {
    const sb = getSB();
    if (!sb) throw new Error("Supabase not ready");

    const [pr, gr, ir] = await Promise.all([
      sb.from("edu_purpose_groups").select("*").order("sort_order"),
      sb.from("edu_type_groups").select("*").order("sort_order"),
      sb.from("edu_type_items").select("*").order("sort_order"),
    ]);
    _eduMgr.purposes = pr.data || [];
    _eduMgr.groups = gr.data || [];
    _eduMgr.items = ir.data || [];
  } catch (e) {
    // DB 로드 실패 시 전역 캐시 사용
    if (window.EDU_TYPES_RAW) {
      _eduMgr.purposes = window.EDU_TYPES_RAW.purposes || [];
      _eduMgr.groups = window.EDU_TYPES_RAW.groups || [];
      _eduMgr.items = window.EDU_TYPES_RAW.items || [];
    }
  }

  _renderEduTypeMgmtUI();
}

function _renderEduTypeMgmtUI() {
  const el = document.getElementById("content-edu-type-mgmt");
  if (!el) return;

  const filtered =
    _eduMgr.filter === "all"
      ? _eduMgr.purposes
      : _eduMgr.purposes.filter((p) => p.audience === _eduMgr.filter);

  // 필터 탭
  const filterBar = `
  <div style="display:flex;gap:4px;background:#F3F4F6;padding:4px;border-radius:12px;width:fit-content;margin-bottom:20px">
    ${[
      ["all", "전체"],
      ["learner", "학습자"],
      ["admin", "교육담당자"],
    ]
      .map(
        ([v, l]) => `
    <button onclick="_eduMgr.filter='${v}';_renderEduTypeMgmtUI()" style="
      padding:6px 16px;border-radius:8px;border:none;font-size:12px;font-weight:800;cursor:pointer;
      background:${_eduMgr.filter === v ? "#fff" : "transparent"};
      color:${_eduMgr.filter === v ? "#002C5F" : "#6B7280"};
      box-shadow:${_eduMgr.filter === v ? "0 1px 4px rgba(0,0,0,.1)" : "none"}">${l}</button>`,
      )
      .join("")}
  </div>`;

  // 목적군 트리
  const treeHtml = filtered.map((p) => _renderPurposeNode(p)).join("");

  el.innerHTML = `
<div style="max-width:900px">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px">
    <div>
      <h2 style="font-size:20px;font-weight:900;color:#002C5F;margin:0">교육유형 관리</h2>
      <p style="font-size:12px;color:#9CA3AF;margin:4px 0 0">교육 목적군 · 유형 그룹 · 세부 유형을 계층적으로 관리합니다.</p>
    </div>
    <button onclick="_eduAddPurpose()" style="
      padding:9px 18px;border-radius:10px;background:#002C5F;color:white;
      border:none;font-size:12px;font-weight:900;cursor:pointer">
      + 목적군 추가
    </button>
  </div>
  ${filterBar}
  <div style="display:flex;flex-direction:column;gap:10px">${treeHtml}</div>
</div>

<!-- 인라인 편집 모달 -->
<div id="edu-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center">
  <div id="edu-modal-box" style="background:white;border-radius:16px;padding:28px 28px 24px;min-width:340px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.25)"></div>
</div>`;
}

function _renderPurposeNode(p) {
  const isOpen = !!_eduMgr.expanded[p.id];
  const myGroups = _eduMgr.groups.filter((g) => g.purpose_id === p.id);
  const audienceBadge =
    p.audience === "learner"
      ? `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#EFF6FF;color:#1D4ED8">학습자</span>`
      : `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#F0FDF4;color:#059669">교육담당자</span>`;
  const activeBadge = !p.is_active
    ? `<span style="font-size:9px;padding:2px 7px;border-radius:6px;background:#F3F4F6;color:#9CA3AF">비활성</span>`
    : "";

  return `
<div style="border:1.5px solid #E5E7EB;border-radius:14px;overflow:hidden;opacity:${p.is_active ? 1 : 0.6}">
  <!-- 목적군 헤더 -->
  <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;background:#F9FAFB;cursor:pointer"
    onclick="_eduMgr.expanded['${p.id}']=!_eduMgr.expanded['${p.id}'];_renderEduTypeMgmtUI()">
    <span style="font-size:18px">${p.icon || "📚"}</span>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;font-weight:900;color:#111827">${p.label}</span>
        ${audienceBadge} ${activeBadge}
        <span style="font-size:10px;color:#9CA3AF">ID: ${p.id}</span>
      </div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${p.description || ""} · 그룹 ${myGroups.length}개</div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0" onclick="event.stopPropagation()">
      <button onclick="_eduEditPurpose('${p.id}')" style="padding:4px 10px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;border:none;font-size:11px;font-weight:700;cursor:pointer">편집</button>
      <button onclick="_eduToggleActive('purpose','${p.id}',${!p.is_active})" style="padding:4px 10px;border-radius:6px;background:${p.is_active ? "#FEF2F2" : "#F0FDF4"};color:${p.is_active ? "#DC2626" : "#059669"};border:none;font-size:11px;font-weight:700;cursor:pointer">${p.is_active ? "비활성화" : "활성화"}</button>
    </div>
    <span style="font-size:12px;color:#9CA3AF;margin-left:4px">${isOpen ? "▲" : "▼"}</span>
  </div>
  ${
    isOpen
      ? `
  <!-- 그룹 목록 -->
  <div style="padding:10px 18px 14px;border-top:1px solid #F3F4F6;background:white">
    ${myGroups.map((g) => _renderGroupNode(p, g)).join("")}
    <button onclick="_eduAddGroup('${p.id}')" style="
      margin-top:8px;padding:6px 14px;border-radius:8px;border:1.5px dashed #CBD5E1;
      background:white;color:#6B7280;font-size:11px;font-weight:700;cursor:pointer;width:100%">
      + 유형 그룹 추가
    </button>
  </div>`
      : ""
  }
</div>`;
}

function _renderGroupNode(p, g) {
  const myItems = _eduMgr.items.filter((i) => i.group_id === g.id);
  const isOpen = !!_eduMgr.expanded[g.id];
  return `
<div style="margin-bottom:6px;border:1px solid #F3F4F6;border-radius:10px;overflow:hidden">
  <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#FAFAFA;cursor:pointer"
    onclick="_eduMgr.expanded['${g.id}']=!_eduMgr.expanded['${g.id}'];_renderEduTypeMgmtUI()">
    <span style="font-size:14px">📂</span>
    <div style="flex:1">
      <span style="font-size:12px;font-weight:900;color:#374151">${g.label}</span>
      <span style="font-size:10px;color:#9CA3AF;margin-left:8px">ID: ${g.id} · 유형 ${myItems.length}개</span>
    </div>
    <div style="display:flex;gap:4px" onclick="event.stopPropagation()">
      <button onclick="_eduEditGroup('${g.id}')" style="padding:3px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;border:none;font-size:10px;font-weight:700;cursor:pointer">편집</button>
    </div>
    <span style="font-size:11px;color:#9CA3AF">${isOpen ? "▲" : "▼"}</span>
  </div>
  ${
    isOpen
      ? `
  <div style="padding:8px 14px 10px;border-top:1px solid #F3F4F6">
    ${myItems.map((i) => _renderItemNode(i)).join("")}
    <button onclick="_eduAddItem('${g.id}','${p.id}')" style="
      margin-top:6px;padding:5px 12px;border-radius:7px;border:1.5px dashed #E2E8F0;
      background:white;color:#9CA3AF;font-size:10px;font-weight:700;cursor:pointer;width:100%">
      + 세부 유형 추가
    </button>
  </div>`
      : ""
  }
</div>`;
}

function _renderItemNode(i) {
  return `
<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:3px;background:${i.is_active ? "white" : "#F9FAFB"}">
  <span style="font-size:10px;color:#D1D5DB">•</span>
  <span style="font-size:12px;font-weight:700;color:${i.is_active ? "#111827" : "#9CA3AF"};flex:1">${i.label}</span>
  <span style="font-size:9px;color:#CBD5E1;mr:4px">${i.id}</span>
  <button onclick="_eduEditItem('${i.id}')" style="padding:2px 7px;border-radius:4px;background:#F3F4F6;color:#374151;border:none;font-size:10px;font-weight:700;cursor:pointer">편집</button>
  <button onclick="_eduToggleActive('item','${i.id}',${!i.is_active})" style="padding:2px 7px;border-radius:4px;background:${i.is_active ? "#FEF2F2" : "#F0FDF4"};color:${i.is_active ? "#DC2626" : "#059669"};border:none;font-size:10px;font-weight:700;cursor:pointer">${i.is_active ? "비활성" : "활성화"}</button>
</div>`;
}

// ─── 모달 헬퍼 ────────────────────────────────────────────────────────────────
function _eduShowModal(html) {
  const modal = document.getElementById("edu-modal");
  const box = document.getElementById("edu-modal-box");
  if (!modal || !box) return;
  box.innerHTML = html;
  modal.style.display = "flex";
}
function _eduCloseModal() {
  const modal = document.getElementById("edu-modal");
  if (modal) modal.style.display = "none";
}

// ─── 목적군 편집/추가 ─────────────────────────────────────────────────────────
function _eduAddPurpose() {
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">목적군 추가</h3>
    <div style="display:grid;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#374151">ID (코드) *</label>
        <input id="em-id" placeholder="예: external_personal" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
        <input id="em-label" placeholder="예: 개인직무 사외학습" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">대상</label>
        <select id="em-audience" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          <option value="learner">학습자</option><option value="admin">교육담당자</option></select></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">아이콘</label>
        <input id="em-icon" placeholder="💼" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">설명</label>
        <input id="em-desc" placeholder="설명" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSavePurpose(null)" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

function _eduEditPurpose(id) {
  const p = _eduMgr.purposes.find((x) => x.id === id);
  if (!p) return;
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">목적군 편집: ${p.id}</h3>
    <div style="display:grid;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
        <input id="em-label" value="${p.label}" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">아이콘</label>
        <input id="em-icon" value="${p.icon || ""}" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">설명</label>
        <input id="em-desc" value="${p.description || ""}" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSavePurpose('${id}')" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

async function _eduSavePurpose(existingId) {
  const sb = getSB();
  if (!sb) return;
  const label = document.getElementById("em-label")?.value?.trim();
  if (!label) {
    alert("레이블을 입력하세요.");
    return;
  }

  try {
    if (existingId) {
      // 업데이트
      const { error } = await sb
        .from("edu_purpose_groups")
        .update({
          label,
          icon: document.getElementById("em-icon")?.value || "📚",
          description: document.getElementById("em-desc")?.value || "",
        })
        .eq("id", existingId);
      if (error) throw error;
    } else {
      // 신규
      const id = document.getElementById("em-id")?.value?.trim();
      if (!id) {
        alert("ID를 입력하세요.");
        return;
      }
      const { error } = await sb.from("edu_purpose_groups").insert({
        id,
        label,
        audience: document.getElementById("em-audience")?.value || "learner",
        icon: document.getElementById("em-icon")?.value || "📚",
        description: document.getElementById("em-desc")?.value || "",
        sort_order: _eduMgr.purposes.length + 1,
        is_active: true,
      });
      if (error) throw error;
    }
    _eduCloseModal();
    renderEduTypeMgmt(); // 재로드
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ─── 그룹 편집/추가 ──────────────────────────────────────────────────────────
function _eduAddGroup(purposeId) {
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">유형 그룹 추가</h3>
    <div style="display:grid;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#374151">ID (코드) *</label>
        <input id="em-id" placeholder="예: regular_edu" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
        <input id="em-label" placeholder="예: 정규교육" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSaveGroup(null,'${purposeId}')" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

function _eduEditGroup(id) {
  const g = _eduMgr.groups.find((x) => x.id === id);
  if (!g) return;
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">그룹 편집: ${g.id}</h3>
    <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
      <input id="em-label" value="${g.label}" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSaveGroup('${id}',null)" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

async function _eduSaveGroup(existingId, purposeId) {
  const sb = getSB();
  if (!sb) return;
  const label = document.getElementById("em-label")?.value?.trim();
  if (!label) {
    alert("레이블을 입력하세요.");
    return;
  }
  try {
    if (existingId) {
      const { error } = await sb
        .from("edu_type_groups")
        .update({ label })
        .eq("id", existingId);
      if (error) throw error;
    } else {
      const id = document.getElementById("em-id")?.value?.trim();
      if (!id) {
        alert("ID를 입력하세요.");
        return;
      }
      const { error } = await sb.from("edu_type_groups").insert({
        id,
        label,
        purpose_id: purposeId,
        sort_order:
          _eduMgr.groups.filter((g) => g.purpose_id === purposeId).length + 1,
        is_active: true,
      });
      if (error) throw error;
    }
    _eduCloseModal();
    renderEduTypeMgmt();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ─── 세부유형 편집/추가 ───────────────────────────────────────────────────────
function _eduAddItem(groupId, purposeId) {
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">세부 유형 추가</h3>
    <div style="display:grid;gap:10px">
      <div><label style="font-size:11px;font-weight:700;color:#374151">ID (코드) *</label>
        <input id="em-id" placeholder="예: edu_elearning" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
      <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
        <input id="em-label" placeholder="예: 이러닝" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSaveItem(null,'${groupId}','${purposeId}')" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

function _eduEditItem(id) {
  const i = _eduMgr.items.find((x) => x.id === id);
  if (!i) return;
  _eduShowModal(`
    <h3 style="font-size:15px;font-weight:900;margin:0 0 16px">세부 유형 편집: ${i.id}</h3>
    <div><label style="font-size:11px;font-weight:700;color:#374151">레이블 *</label>
      <input id="em-label" value="${i.label}" style="width:100%;margin-top:4px;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;box-sizing:border-box"></div>
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
      <button onclick="_eduCloseModal()" style="padding:8px 16px;border-radius:8px;background:#F3F4F6;border:none;font-size:12px;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_eduSaveItem('${id}',null,null)" style="padding:8px 16px;border-radius:8px;background:#002C5F;color:white;border:none;font-size:12px;font-weight:900;cursor:pointer">저장</button>
    </div>`);
}

async function _eduSaveItem(existingId, groupId, purposeId) {
  const sb = getSB();
  if (!sb) return;
  const label = document.getElementById("em-label")?.value?.trim();
  if (!label) {
    alert("레이블을 입력하세요.");
    return;
  }
  try {
    if (existingId) {
      const { error } = await sb
        .from("edu_type_items")
        .update({ label })
        .eq("id", existingId);
      if (error) throw error;
    } else {
      const id = document.getElementById("em-id")?.value?.trim();
      if (!id) {
        alert("ID를 입력하세요.");
        return;
      }
      const { error } = await sb.from("edu_type_items").insert({
        id,
        label,
        group_id: groupId,
        purpose_id: purposeId,
        sort_order:
          _eduMgr.items.filter((x) => x.group_id === groupId).length + 1,
        is_active: true,
      });
      if (error) throw error;
    }
    _eduCloseModal();
    renderEduTypeMgmt();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ─── 활성/비활성 토글 ─────────────────────────────────────────────────────────
async function _eduToggleActive(type, id, newVal) {
  const sb = getSB();
  if (!sb) return;
  const tableMap = {
    purpose: "edu_purpose_groups",
    group: "edu_type_groups",
    item: "edu_type_items",
  };
  const table = tableMap[type];
  if (!table) return;
  try {
    const { error } = await sb
      .from(table)
      .update({ is_active: newVal })
      .eq("id", id);
    if (error) throw error;
    renderEduTypeMgmt();
  } catch (e) {
    alert("변경 실패: " + e.message);
  }
}
