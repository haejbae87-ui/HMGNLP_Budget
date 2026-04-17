// bo_badge_mgmt.js — 뱃지 교육지원 운영 규칙 (Step 위저드: 선행조건→취득조건→갱신조건)

let mgmtBadgeGroups = [],
  allBadges = [],
  _bmAllTenants = [],
  _bmVorgTemplates = [];
let _bmFilterTenantId = "",
  _bmFilterVorgId = "",
  _bmFilterGroupId = "";
let _bmWizardBadgeId = null,
  _bmWizardBadge = null,
  _bmWizardStep = 1;
let _bmConditionNodes = [],
  _bmReturnGroupId = null;

// ── 메인 목록 ──────────────────────────────────────────────────────────────
async function renderBadgeMgmt() {
  _bmWizardBadgeId = null;
  _bmWizardStep = 1;
  const isSA = boCurrentPersona?.role === "platform_admin";
  const myT = boCurrentPersona?.tenantId || "HMC";
  _bmFilterTenantId = myT;
  document.getElementById("bo-content").innerHTML = `
    <div class="bo-fade">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <h1 class="bo-page-title">🏷️ 뱃지 교육지원 운영 규칙</h1>
          <p class="bo-page-sub">뱃지별 선행조건·취득조건·갱신조건을 Step으로 설정합니다</p>
        </div>
      </div>
      
      <div class="bo-filter-bar">
        <span style="font-size:12px;font-weight:800;color:#6B7280;margin-right:8px">🔍 조회</span>
        
        <div style="display:flex;align-items:center;gap:8px">
          <span class="bo-filter-label">회사</span>
          ${isSA ? `<select id="bm-filter-tenant" class="bo-filter-select" onchange="onBmTenantChange()"><option value="">전체 회사</option></select>` : `<span style="font-size:13px;font-weight:700;padding:8px 12px;background:#F1F5F9;border-radius:10px;color:#374151">${myT}</span>`}
        </div>

        <div class="bo-filter-divider"></div>

        <div style="display:flex;align-items:center;gap:8px">
          <span class="bo-filter-label">제도그룹</span>
          <select id="bm-filter-vorg" class="bo-filter-select" onchange="onBmVorgChange()">
            <option value="">전체 교육조직</option>
          </select>
        </div>

        <div class="bo-filter-divider"></div>

        <div style="display:flex;align-items:center;gap:8px">
          <span class="bo-filter-label">뱃지그룹</span>
          <select id="bm-filter-group" class="bo-filter-select" onchange="_bmFilterGroupId=this.value;loadBadgeMgmtData()">
            <option value="">전체 그룹</option>
          </select>
        </div>

        <button onclick="loadBadgeMgmtData()" class="bo-filter-btn-search">
          ● 조회
        </button>
      </div>

      <div>
        <div class="bo-list-count">등록된 뱃지 목록</div>
        <div class="bo-table-container">
          <table class="bo-table" style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">뱃지명</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">그룹</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">레벨</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">선행조건</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">취득조건</th>
                <th style="padding:10px 14px;text-align:left;font-size:11px;font-weight:800;color:#6B7280">갱신조건</th>
                <th style="padding:10px 14px;text-align:center;font-size:11px;font-weight:800;color:#6B7280">정책 설정</th>
              </tr>
            </thead>
            <tbody id="badges-body">
              <tr><td colspan="7" style="text-align:center;padding:24px;color:#9CA3AF">조회 조건을 선택해주세요.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  await _bmLoadTenants(isSA, myT);
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}

// ── 필터 로더 ───────────────────────────────────────────────────────────────
async function _bmLoadTenants(isSA, myT) {
  if (!isSA) return;
  const { data } = await _sb().from("tenants").select("id,name").order("name");
  _bmAllTenants = data || [];
  const s = document.getElementById("bm-filter-tenant");
  if (!s) return;
  s.innerHTML =
    `<option value="">전체 회사</option>` +
    _bmAllTenants
      .map(
        (t) =>
          `<option value="${t.id}"${t.id === myT ? " selected" : ""}>${t.name}(${t.id})</option>`,
      )
      .join("");
  _bmFilterTenantId = myT;
  s.value = myT;
}
async function _bmLoadVorgs(tenantId) {
  let q = _sb()
    .from("virtual_org_templates")
    .select("id,name")
    .eq("service_type", "badge")
    .order("name");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data } = await q;
  _bmVorgTemplates = data || [];
  const s = document.getElementById("bm-filter-vorg");
  if (!s) return;
  s.innerHTML =
    `<option value="">전체 교육조직</option>` +
    _bmVorgTemplates
      .map((v) => `<option value="${v.id}">${v.name}</option>`)
      .join("");
  _bmFilterVorgId = "";
  const g = document.getElementById("bm-filter-group");
  if (g) g.innerHTML = `<option value="">전체 그룹</option>`;
  _bmFilterGroupId = "";
}
async function _bmLoadGroups(vorgId) {
  const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || "HMC";
  let q = _sb()
    .from("badge_groups")
    .select("id,name")
    .eq("tenant_id", tenantId);
  if (vorgId) q = q.eq("vorg_template_id", vorgId);
  const { data } = await q.order("name");
  mgmtBadgeGroups = data || [];
  const g = document.getElementById("bm-filter-group");
  if (!g) return;
  g.innerHTML =
    `<option value="">전체 그룹</option>` +
    mgmtBadgeGroups
      .map((g) => `<option value="${g.id}">${g.name}</option>`)
      .join("");
  _bmFilterGroupId = "";
}
async function onBmTenantChange() {
  const s = document.getElementById("bm-filter-tenant");
  _bmFilterTenantId = s ? s.value : "";
  _bmFilterVorgId = "";
  _bmFilterGroupId = "";
  await _bmLoadVorgs(_bmFilterTenantId);
  await loadBadgeMgmtData();
}
async function onBmVorgChange() {
  const s = document.getElementById("bm-filter-vorg");
  _bmFilterVorgId = s ? s.value : "";
  _bmFilterGroupId = "";
  await _bmLoadGroups(_bmFilterVorgId);
  await loadBadgeMgmtData();
}

async function loadBadgeMgmtData() {
  const tenantId = _bmFilterTenantId || boCurrentPersona?.tenantId || "HMC";
  const tb = document.getElementById("badges-body");
  if (tb)
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#9CA3AF">불러오는 중...</td></tr>`;
  try {
    if (!mgmtBadgeGroups.length) {
      let gq = _sb()
        .from("badge_groups")
        .select("id,name")
        .eq("tenant_id", tenantId);
      if (_bmFilterVorgId) gq = gq.eq("vorg_template_id", _bmFilterVorgId);
      const { data: gd } = await gq;
      mgmtBadgeGroups = gd || [];
    }
    let gIds = _bmFilterGroupId
      ? [_bmFilterGroupId]
      : mgmtBadgeGroups.map((g) => g.id);
    if (!gIds.length) {
      allBadges = [];
      renderBadgesList();
      return;
    }
    const { data, error } = await _sb()
      .from("badges")
      .select("*")
      .in("group_id", gIds)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    allBadges = data || [];
    renderBadgesList();
  } catch (e) {
    const tb = document.getElementById("badges-body");
    if (tb)
      tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#EF4444">⚠️ ${e.message}</td></tr>`;
  }
}

function renderBadgesList() {
  const tb = document.getElementById("badges-body");
  if (!tb) return;
  if (!allBadges.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#9CA3AF">뱃지가 없습니다. 뱃지 그룹 관리에서 뱃지를 먼저 생성하세요.</td></tr>`;
    return;
  }
  tb.innerHTML = allBadges
    .map((b) => {
      const gName =
        mgmtBadgeGroups.find((g) => g.id === b.group_id)?.name || "-";
      const hasPrereq =
        b.prerequisite_badge_id || (b.equivalent_badge_ids || []).length;
      const hasCond = (b.condition_rules?.nodes || []).length > 0;
      const hasRenew =
        b.renewal_rules && Object.keys(b.renewal_rules).length > 0;
      const badge = (v, label) =>
        v
          ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#ECFDF5;color:#059669;font-weight:700">✅ ${label}</span>`
          : `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#FEF2F2;color:#DC2626;font-weight:700">미설정</span>`;
      return `<tr style="border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .12s" onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''" onclick="openBadgePolicy('${b.id}')">
      <td style="padding:12px 14px;font-weight:700;color:#1D4ED8">${b.name}</td>
      <td style="padding:12px 14px;color:#6B7280;font-size:12px">${gName}</td>
      <td style="padding:12px 14px;font-weight:800;color:#374151">${b.level || "-"}</td>
      <td style="padding:12px 14px">${badge(hasPrereq, "설정됨")}</td>
      <td style="padding:12px 14px">${badge(hasCond, (b.condition_rules?.nodes || []).length + "개")}</td>
      <td style="padding:12px 14px">${badge(hasRenew, "설정됨")}</td>
      <td style="padding:12px 14px;text-align:center">
        <button onclick="event.stopPropagation();openBadgePolicy('${b.id}')" class="bo-btn-accent bo-btn-sm" style="display:inline-flex;align-items:center;gap:4px">
          ⚙️ 정책 설정
        </button>
      </td></tr>`;
    })
    .join("");
}

// ── 정책 위저드 진입 ────────────────────────────────────────────────────────
async function openBadgePolicy(badgeId, returnGroupId = null) {
  const b = allBadges.find((x) => x.id === badgeId);
  if (!b) {
    alert("뱃지 정보를 찾을 수 없습니다.");
    return;
  }
  _bmWizardBadgeId = badgeId;
  _bmWizardBadge = JSON.parse(JSON.stringify(b));
  _bmWizardStep = 1;
  _bmReturnGroupId = returnGroupId;
  _bmConditionNodes = Array.isArray(b.condition_rules?.nodes)
    ? JSON.parse(JSON.stringify(b.condition_rules.nodes))
    : [];
  _bmRenderWizard();
}

function _bmRenderWizard() {
  const b = _bmWizardBadge;
  const gName = mgmtBadgeGroups.find((g) => g.id === b.group_id)?.name || "";
  const steps = [
    { n: 1, label: "선행 조건" },
    { n: 2, label: "취득 조건" },
    { n: 3, label: "갱신 조건" },
  ];
  const stepNav = steps
    .map((s) => {
      const active = s.n === _bmWizardStep,
        done = s.n < _bmWizardStep;
      return `<div onclick="_bmGoToStep(${s.n})" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;cursor:pointer;margin-bottom:6px;background:${active ? "linear-gradient(135deg,#1D4ED8,#2563EB)" : done ? "#F0FDF4" : "#F9FAFB"};border:1.5px solid ${active ? "transparent" : done ? "#A7F3D0" : "#E5E7EB"}">
      <span style="width:24px;height:24px;border-radius:50%;background:${active ? "rgba(255,255,255,.25)" : done ? "#059669" : "#E5E7EB"};color:${active || done ? "#fff" : "#6B7280"};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">${done ? "✓" : s.n}</span>
      <span style="font-size:12px;font-weight:800;color:${active ? "#fff" : done ? "#059669" : "#374151"}">${s.label}</span>
    </div>`;
    })
    .join("");
  document.getElementById("bo-content").innerHTML = `
    <div class="bo-fade">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
      <button onclick="${_bmReturnGroupId ? `_bgOpenGroupDetail('${_bmReturnGroupId}')` : "renderBadgeMgmt()"}" style="padding:6px 14px;border:1.5px solid #E5E7EB;border-radius:7px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">← 목록</button>
      <span style="color:#9CA3AF">/</span>
      <span style="font-size:14px;font-weight:900;color:#111827">🏷️ ${b.name}</span>
      <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-weight:700">${gName} ${b.level || ""}</span>
    </div>
    <div style="display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start">
      <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
        <div style="font-size:11px;font-weight:800;color:#6B7280;margin-bottom:12px">진행 단계</div>
        ${stepNav}
      </div>
      <div id="bm-step-content">${_bmGetStepHtml()}</div>
    </div></div>`;
}

function _bmGetStepHtml() {
  if (_bmWizardStep === 1) return _bmRenderStep1();
  if (_bmWizardStep === 2) return _bmRenderStep2();
  return _bmRenderStep3();
}

function _bmRenderStep1() {
  const b = _bmWizardBadge;
  const prereqOpts = allBadges
    .filter((x) => x.id !== _bmWizardBadgeId)
    .map(
      (x) =>
        `<option value="${x.id}"${b.prerequisite_badge_id === x.id ? " selected" : ""}>${x.name}</option>`,
    )
    .join("");
  const eqVal = JSON.stringify(b.equivalent_badge_ids || [], null, 2);
  return `<div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:28px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:22px">🔗</span><span style="font-size:16px;font-weight:900;color:#111827">Step 1. 선행 조건</span></div>
    <p style="font-size:12px;color:#9CA3AF;margin:0 0 24px">이 뱃지를 취득하기 전에 반드시 갖춰야 할 전제 조건을 설정합니다.</p>
    <div style="margin-bottom:20px">
      <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:4px">선수 뱃지 (강등 낙하 지점)</label>
      <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px">이 뱃지 취득 전 보유 필수. 유효기간 만료 시 이 뱃지로 강등됩니다.</p>
      <select id="bm-prereq" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        <option value="">선수 뱃지 없음 (독립 취득)</option>${prereqOpts}
      </select>
    </div>
    <div style="margin-bottom:28px">
      <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:4px">타사 상호 인정 뱃지 ID (JSON 배열)</label>
      <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px">이 UUID를 가진 뱃지 보유자는 이 뱃지도 보유한 것으로 자동 인정됩니다.</p>
      <div style="background:#F8FAFC;border:1.5px solid #E5E7EB;border-radius:8px;padding:12px">
        <textarea id="bm-equivalent" rows="4" style="width:100%;background:transparent;border:none;outline:none;font-family:monospace;font-size:12px;resize:none;box-sizing:border-box;color:#374151">${eqVal}</textarea>
      </div>
    </div>
    ${_bmStepButtons(1)}</div>`;
}

function _bmRenderStep2() {
  const b = _bmWizardBadge;
  const op = b.condition_rules?.operator || "AND";
  const nodesHtml =
    _bmConditionNodes.length === 0
      ? `<div style="padding:20px;text-align:center;background:#F8FAFC;border-radius:8px;border:1.5px dashed #E5E7EB;color:#9CA3AF;font-size:12px">조건 없음. 아래 버튼으로 추가하세요.</div>`
      : _bmConditionNodes
          .map((node, idx) => _bmRenderConditionNode(node, idx))
          .join("");
  return `<div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:28px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">🎯</span><span style="font-size:16px;font-weight:900;color:#111827">Step 2. 취득 조건</span></div>
      <select id="bmd-operator" style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700">
        <option value="AND" ${op === "AND" ? "selected" : ""}>AND (모두 충족)</option>
        <option value="OR" ${op === "OR" ? "selected" : ""}>OR (하나 이상)</option>
      </select>
    </div>
    <p style="font-size:12px;color:#9CA3AF;margin:0 0 16px">뱃지를 처음 취득하기 위해 충족해야 할 학습/시험/자격증 조건을 설정합니다.</p>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px;background:#F8FAFC;border-radius:8px">
      <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#FEE2E2;color:#B91C1C;font-weight:700">📌 path: 순서 이수</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#DBEAFE;color:#1D4ED8;font-weight:700">🎲 pool: N개 선택</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#FEF3C7;color:#92400E;font-weight:700">📝 exam: 시험</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#EDE9FE;color:#7C3AED;font-weight:700">📜 certification: 자격증</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#EEF2FF;color:#4338CA;font-weight:700">🔀 group: 복합</span>
    </div>
    <div id="bmd-condition-nodes" style="margin-bottom:14px">${nodesHtml}</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;padding-top:12px;border-top:1px dashed #E5E7EB;margin-bottom:24px">
      <button onclick="_bmAddConditionNode('course_path')" style="padding:7px 12px;border:1.5px solid #EF4444;border-radius:7px;background:#FEF2F2;color:#DC2626;font-size:11px;font-weight:700;cursor:pointer">+ 순서형 과정</button>
      <button onclick="_bmAddConditionNode('course_pool')" style="padding:7px 12px;border:1.5px solid #3B82F6;border-radius:7px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700;cursor:pointer">+ 선택형 과정</button>
      <button onclick="_bmAddConditionNode('exam')" style="padding:7px 12px;border:1.5px solid #F59E0B;border-radius:7px;background:#FFFBEB;color:#92400E;font-size:11px;font-weight:700;cursor:pointer">+ 시험</button>
      <button onclick="_bmAddConditionNode('certification')" style="padding:7px 12px;border:1.5px solid #8B5CF6;border-radius:7px;background:#F5F3FF;color:#7C3AED;font-size:11px;font-weight:700;cursor:pointer">+ 자격증 조건</button>
      <button onclick="_bmAddConditionNode('group')" style="padding:7px 12px;border:1.5px solid #6366F1;border-radius:7px;background:#EEF2FF;color:#4338CA;font-size:11px;font-weight:700;cursor:pointer">+ 복합 그룹</button>
    </div>
    ${_bmStepButtons(2)}</div>`;
}

function _bmRenderStep3() {
  const b = _bmWizardBadge;
  const isCustom = b.renewal_rules && Object.keys(b.renewal_rules).length > 0;
  const rVal = JSON.stringify(b.renewal_rules || {}, null, 2);
  return `<div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:28px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:22px">🔄</span><span style="font-size:16px;font-weight:900;color:#111827">Step 3. 갱신 조건</span></div>
    <p style="font-size:12px;color:#9CA3AF;margin:0 0 24px">유효기간이 있는 뱃지의 재취득(갱신) 조건을 설정합니다. 비워두면 취득 조건과 동일하게 적용됩니다.</p>
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 16px;border:1.5px solid ${!isCustom ? "#1D4ED8" : "#E5E7EB"};border-radius:8px;cursor:pointer;background:${!isCustom ? "#EFF6FF" : "#fff"}">
        <input type="radio" name="renewal-type" value="same" ${!isCustom ? "checked" : ""} onchange="document.getElementById('renewal-custom').style.display='none';" style="accent-color:#1D4ED8">
        <div><div style="font-size:12px;font-weight:700">취득 조건과 동일</div><div style="font-size:10px;color:#9CA3AF">별도 설정 없이 동일 조건 적용</div></div>
      </label>
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 16px;border:1.5px solid ${isCustom ? "#059669" : "#E5E7EB"};border-radius:8px;cursor:pointer;background:${isCustom ? "#F0FDF4" : "#fff"}">
        <input type="radio" name="renewal-type" value="custom" ${isCustom ? "checked" : ""} onchange="document.getElementById('renewal-custom').style.display='block';" style="accent-color:#059669">
        <div><div style="font-size:12px;font-weight:700">별도 갱신 조건</div><div style="font-size:10px;color:#9CA3AF">갱신 시 다른 조건 적용</div></div>
      </label>
    </div>
    <div id="renewal-custom" style="display:${isCustom ? "block" : "none"};margin-bottom:20px">
      <label style="display:block;font-size:11px;font-weight:800;color:#374151;margin-bottom:6px">갱신 조건 (JSON)</label>
      <div style="background:#F0FDF4;border:1.5px solid #A7F3D0;border-radius:8px;padding:12px">
        <textarea id="bm-renewal" rows="8" style="width:100%;background:transparent;color:#065F46;border:none;outline:none;font-family:monospace;font-size:12px;resize:vertical;box-sizing:border-box">${rVal}</textarea>
      </div>
      <div style="font-size:10px;color:#6B7280;margin-top:4px">💡 취득 조건과 동일한 JSON 구조 사용. {} = 취득 조건 동일 적용</div>
    </div>
    <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:8px;padding:12px;margin-bottom:20px;font-size:11px;color:#92400E">
      ⚠️ 유효기간(valid_months)이 설정된 뱃지에만 갱신 조건이 적용됩니다. 현재 뱃지 유효기간: <b>${_bmWizardBadge.valid_months ? _bmWizardBadge.valid_months + "개월" : "영구 (갱신 없음)"}</b>
    </div>
    ${_bmStepButtons(3)}</div>`;
}

function _bmStepButtons(step) {
  const prev =
    step > 1
      ? `<button onclick="_bmGoToStep(${step - 1})" style="padding:10px 20px;background:#F3F4F6;color:#6B7280;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">← 이전</button>`
      : "";
  const next =
    step < 3
      ? `<button onclick="_bmGoToStep(${step + 1})" style="padding:10px 24px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">다음 →</button>`
      : `<button onclick="saveBadgePolicy()" style="padding:10px 24px;background:linear-gradient(135deg,#059669,#10B981);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer">💾 정책 저장 완료</button>`;
  return `<div style="display:flex;justify-content:space-between;padding-top:16px;border-top:1.5px solid #E5E7EB">${prev}<div style="display:flex;gap:8px">${next}</div></div>`;
}

async function _bmGoToStep(n) {
  // 현재 스텝 데이터 수집
  if (_bmWizardStep === 1) {
    _bmWizardBadge.prerequisite_badge_id =
      document.getElementById("bm-prereq")?.value || null;
    try {
      _bmWizardBadge.equivalent_badge_ids = JSON.parse(
        document.getElementById("bm-equivalent")?.value || "[]",
      );
    } catch {
      return alert("JSON 형식 오류: 타사 인정 뱃지 ID를 확인해주세요.");
    }
  }
  if (_bmWizardStep === 2) {
    const op = document.getElementById("bmd-operator")?.value || "AND";
    _bmWizardBadge.condition_rules = { operator: op, nodes: _bmConditionNodes };
  }
  if (_bmWizardStep === 3) {
    const isSame =
      document.querySelector('input[name="renewal-type"]:checked')?.value ===
      "same";
    _bmWizardBadge.renewal_rules = isSame
      ? {}
      : (() => {
          try {
            return JSON.parse(
              document.getElementById("bm-renewal")?.value || "{}",
            );
          } catch {
            alert("갱신 조건 JSON 오류");
            return null;
          }
        })();
    if (_bmWizardBadge.renewal_rules === null) return;
  }
  _bmWizardStep = n;
  _bmRenderWizard();
}

async function saveBadgePolicy() {
  // Step3 데이터 수집
  const isSame =
    document.querySelector('input[name="renewal-type"]:checked')?.value ===
    "same";
  let renewal_rules = {};
  if (!isSame) {
    try {
      renewal_rules = JSON.parse(
        document.getElementById("bm-renewal")?.value || "{}",
      );
    } catch {
      return alert("갱신 조건 JSON 오류");
    }
  }
  const b = _bmWizardBadge;
  const payload = {
    prerequisite_badge_id: b.prerequisite_badge_id || null,
    equivalent_badge_ids: b.equivalent_badge_ids || [],
    condition_rules: b.condition_rules || { operator: "AND", nodes: [] },
    renewal_rules,
    updated_at: new Date().toISOString(),
  };
  const { error } = await _sb()
    .from("badges")
    .update(payload)
    .eq("id", _bmWizardBadgeId);
  if (error) return alert("저장 오류: " + error.message);
  // 로컬 캐시 업데이트
  const idx = allBadges.findIndex((x) => x.id === _bmWizardBadgeId);
  if (idx >= 0) allBadges[idx] = { ...allBadges[idx], ...payload };
  alert("✅ 정책이 저장되었습니다.");
  if (_bmReturnGroupId) {
    await _bgOpenGroupDetail(_bmReturnGroupId);
  } else {
    renderBadgeMgmt();
  }
}

// ── 룰 빌더 ────────────────────────────────────────────────────────────────
function _bmAddConditionNode(type) {
  if (type === "course_path")
    _bmConditionNodes.push({ type: "course_group", mode: "path", items: [] });
  else if (type === "course_pool")
    _bmConditionNodes.push({
      type: "course_group",
      mode: "pool",
      required_count: 1,
      items: [],
    });
  else if (type === "exam")
    _bmConditionNodes.push({ type: "exam", exam_id: "", pass_score: 80 });
  else if (type === "certification")
    _bmConditionNodes.push({
      type: "certification",
      cert_names: [],
      require_count: 1,
    });
  else if (type === "group")
    _bmConditionNodes.push({ type: "group", operator: "OR", nodes: [] });
  _refreshConditionNodes();
}
function _bmRemoveConditionNode(idx) {
  _bmConditionNodes.splice(idx, 1);
  _refreshConditionNodes();
}
function _bmAddConditionItem(i) {
  if (!_bmConditionNodes[i].items) _bmConditionNodes[i].items = [];
  _bmConditionNodes[i].items.push("");
  _refreshConditionNodes();
}
function _bmRemoveConditionItem(i, ii) {
  _bmConditionNodes[i].items.splice(ii, 1);
  _refreshConditionNodes();
}
function _bmUpdateConditionItem(i, ii, v) {
  _bmConditionNodes[i].items[ii] = v;
}
function _bmUpdateConditionProp(i, p, v) {
  _bmConditionNodes[i][p] = v;
}
function _bmUpdateCertNames(i, v) {
  _bmConditionNodes[i].cert_names = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function _bmAddChildNode(gi, type) {
  if (!_bmConditionNodes[gi].nodes) _bmConditionNodes[gi].nodes = [];
  if (type === "course_path")
    _bmConditionNodes[gi].nodes.push({
      type: "course_group",
      mode: "path",
      items: [],
    });
  else if (type === "course_pool")
    _bmConditionNodes[gi].nodes.push({
      type: "course_group",
      mode: "pool",
      required_count: 1,
      items: [],
    });
  else if (type === "exam")
    _bmConditionNodes[gi].nodes.push({
      type: "exam",
      exam_id: "",
      pass_score: 80,
    });
  else if (type === "certification")
    _bmConditionNodes[gi].nodes.push({
      type: "certification",
      cert_names: [],
      require_count: 1,
    });
  _refreshConditionNodes();
}
function _bmRemoveChildNode(gi, ci) {
  _bmConditionNodes[gi].nodes.splice(ci, 1);
  _refreshConditionNodes();
}
function _bmUpdateChildProp(gi, ci, p, v) {
  _bmConditionNodes[gi].nodes[ci][p] = v;
}
function _bmUpdateChildCertNames(gi, ci, v) {
  _bmConditionNodes[gi].nodes[ci].cert_names = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function _bmAddChildItem(gi, ci) {
  if (!_bmConditionNodes[gi].nodes[ci].items)
    _bmConditionNodes[gi].nodes[ci].items = [];
  _bmConditionNodes[gi].nodes[ci].items.push("");
  _refreshConditionNodes();
}
function _bmRemoveChildItem(gi, ci, ii) {
  _bmConditionNodes[gi].nodes[ci].items.splice(ii, 1);
  _refreshConditionNodes();
}
function _bmUpdateChildItem(gi, ci, ii, v) {
  _bmConditionNodes[gi].nodes[ci].items[ii] = v;
}

function _refreshConditionNodes() {
  const c = document.getElementById("bmd-condition-nodes");
  if (!c) return;
  c.innerHTML =
    _bmConditionNodes.length === 0
      ? `<div style="padding:20px;text-align:center;background:#F8FAFC;border-radius:8px;border:1.5px dashed #E5E7EB;color:#9CA3AF;font-size:12px">조건 없음.</div>`
      : _bmConditionNodes.map((n, i) => _bmRenderConditionNode(n, i)).join("");
}

function _bmRenderConditionNode(node, idx) {
  if (node.type === "certification")
    return `<div style="border:1.5px solid #8B5CF6;border-radius:10px;padding:14px;margin-bottom:10px;background:#F5F3FF"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:12px;font-weight:800;color:#7C3AED">📜 자격증 조건</span><button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#EDE9FE;color:#7C3AED;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button></div><div style="margin-bottom:8px"><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:4px">자격증 목록 (쉼표 구분)</label><input type="text" value="${(node.cert_names || []).join(", ")}" onchange="_bmUpdateCertNames(${idx},this.value)" placeholder="정보처리기사, SQLD ..." style="width:100%;padding:8px 10px;border:1.5px solid #DDD6FE;border-radius:6px;font-size:12px;box-sizing:border-box"></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;color:#374151;font-weight:700">위 목록 중</span><input type="number" value="${node.require_count || 1}" min="1" onchange="_bmUpdateConditionProp(${idx},'require_count',Number(this.value))" style="width:55px;padding:6px;border:1.5px solid #DDD6FE;border-radius:6px;font-size:12px;text-align:center"><span style="font-size:11px;color:#374151;font-weight:700">개 이상 취득 시 충족</span></div></div>`;
  if (node.type === "group") {
    const ch =
      (node.nodes || [])
        .map((c, ci) => _bmRenderChildNode(c, idx, ci))
        .join("") ||
      `<div style="padding:8px;font-size:11px;color:#9CA3AF;text-align:center;border:1px dashed #C7D2FE;border-radius:6px">조건 없음</div>`;
    return `<div style="border:1.5px solid #6366F1;border-radius:10px;padding:14px;margin-bottom:10px;background:#EEF2FF"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;font-weight:800;color:#4338CA">🔀 복합 조건 그룹</span><select onchange="_bmUpdateConditionProp(${idx},'operator',this.value)" style="padding:4px 8px;border:1.5px solid #A5B4FC;border-radius:6px;font-size:11px;font-weight:700;background:#EEF2FF;color:#4338CA"><option value="OR" ${(node.operator || "OR") === "OR" ? "selected" : ""}>OR</option><option value="AND" ${(node.operator || "OR") === "AND" ? "selected" : ""}>AND</option></select></div><button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#C7D2FE;color:#4338CA;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button></div><div style="margin-bottom:8px">${ch}</div><div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;border-top:1px dashed #C7D2FE"><button onclick="_bmAddChildNode(${idx},'course_path')" style="padding:4px 8px;border:1.5px solid #FCA5A5;border-radius:5px;background:#FFF5F5;color:#DC2626;font-size:10px;font-weight:700;cursor:pointer">+과정(path)</button><button onclick="_bmAddChildNode(${idx},'course_pool')" style="padding:4px 8px;border:1.5px solid #93C5FD;border-radius:5px;background:#EFF6FF;color:#1D4ED8;font-size:10px;font-weight:700;cursor:pointer">+과정(pool)</button><button onclick="_bmAddChildNode(${idx},'exam')" style="padding:4px 8px;border:1.5px solid #FCD34D;border-radius:5px;background:#FFFBEB;color:#92400E;font-size:10px;font-weight:700;cursor:pointer">+시험</button><button onclick="_bmAddChildNode(${idx},'certification')" style="padding:4px 8px;border:1.5px solid #C4B5FD;border-radius:5px;background:#F5F3FF;color:#7C3AED;font-size:10px;font-weight:700;cursor:pointer">+자격증</button></div></div>`;
  }
  if (node.type === "exam")
    return `<div style="border:1.5px solid #FDE68A;border-radius:10px;padding:14px;margin-bottom:10px;background:#FFFBEB"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:12px;font-weight:800;color:#92400E">📝 시험 합격 조건</span><button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:#FDE68A;color:#92400E;border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button></div><div style="display:flex;gap:10px"><div style="flex:2"><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">시험 ID</label><input type="text" value="${node.exam_id || ""}" placeholder="exam_uuid" onchange="_bmUpdateConditionProp(${idx},'exam_id',this.value)" style="width:100%;padding:7px 10px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;box-sizing:border-box"></div><div style="flex:1"><label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">합격 기준(%)</label><input type="number" value="${node.pass_score || 80}" min="0" max="100" onchange="_bmUpdateConditionProp(${idx},'pass_score',Number(this.value))" style="width:100%;padding:7px;border:1.5px solid #FDE68A;border-radius:6px;font-size:12px;text-align:center;box-sizing:border-box"></div></div></div>`;
  // course_group
  const mode = node.mode || "path",
    isPath = mode === "path";
  const clr = isPath ? "#FCA5A5" : "#93C5FD",
    bg = isPath ? "#FFF5F5" : "#EFF6FF",
    tc = isPath ? "#DC2626" : "#1D4ED8";
  const items = (node.items || [])
    .map(
      (it, ii) =>
        `<div style="display:flex;gap:6px;margin-bottom:4px"><span style="font-size:10px;color:#9CA3AF;width:16px;text-align:right">${ii + 1}.</span><input type="text" value="${it}" placeholder="과정 ID" onchange="_bmUpdateConditionItem(${idx},${ii},this.value)" style="flex:1;padding:6px 10px;border:1.5px solid ${clr};border-radius:6px;font-size:12px;font-family:monospace"><button onclick="_bmRemoveConditionItem(${idx},${ii})" style="border:none;background:none;color:#EF4444;cursor:pointer;font-size:14px">✕</button></div>`,
    )
    .join("");
  return `<div style="border:1.5px solid ${clr};border-radius:10px;padding:14px;margin-bottom:10px;background:${bg}"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:800;color:${tc}">${isPath ? "📌 순서형 과정 이수 (path)" : "🎲 선택형 과정 이수 (pool)"}</span><button onclick="_bmRemoveConditionNode(${idx})" style="border:none;background:rgba(0,0,0,.06);color:${tc};border-radius:5px;padding:3px 8px;font-size:10px;font-weight:700;cursor:pointer">삭제</button></div>${!isPath ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:11px;color:#374151;font-weight:700">아래 과정 중</span><input type="number" value="${node.required_count || 1}" min="1" onchange="_bmUpdateConditionProp(${idx},'required_count',Number(this.value))" style="width:50px;padding:5px 8px;border:1.5px solid ${clr};border-radius:6px;font-size:12px;font-weight:700;text-align:center"><span style="font-size:11px;color:#374151;font-weight:700">개 이상 이수하면 합격</span></div>` : ""}<div>${items || `<div style="font-size:11px;color:#9CA3AF;padding:4px">과정 ID를 추가하세요</div>`}</div><button onclick="_bmAddConditionItem(${idx})" style="margin-top:6px;padding:4px 10px;border:1.5px dashed ${clr};border-radius:6px;background:none;color:${tc};font-size:11px;font-weight:700;cursor:pointer">+ 과정 추가</button></div>`;
}

function _bmRenderChildNode(child, gi, ci) {
  if (child.type === "certification")
    return `<div style="border:1px solid #DDD6FE;border-radius:7px;padding:8px;margin-bottom:5px;background:#FAF5FF"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:10px;font-weight:700;color:#7C3AED">📜 자격증</span><button onclick="_bmRemoveChildNode(${gi},${ci})" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:11px">✕</button></div><input type="text" value="${(child.cert_names || []).join(", ")}" onchange="_bmUpdateChildCertNames(${gi},${ci},this.value)" placeholder="자격증명" style="width:100%;padding:5px 8px;border:1px solid #DDD6FE;border-radius:5px;font-size:11px;box-sizing:border-box;margin-bottom:4px"><div style="display:flex;align-items:center;gap:5px"><span style="font-size:10px;color:#6B7280">최소</span><input type="number" value="${child.require_count || 1}" min="1" onchange="_bmUpdateChildProp(${gi},${ci},'require_count',Number(this.value))" style="width:36px;padding:3px;border:1px solid #DDD6FE;border-radius:4px;font-size:10px;text-align:center"><span style="font-size:10px;color:#6B7280">개</span></div></div>`;
  if (child.type === "exam")
    return `<div style="border:1px solid #FDE68A;border-radius:7px;padding:8px;margin-bottom:5px;background:#FFFDF0"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:10px;font-weight:700;color:#92400E">📝 시험</span><button onclick="_bmRemoveChildNode(${gi},${ci})" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:11px">✕</button></div><div style="display:flex;gap:6px"><input type="text" value="${child.exam_id || ""}" placeholder="시험ID" onchange="_bmUpdateChildProp(${gi},${ci},'exam_id',this.value)" style="flex:2;padding:5px 8px;border:1px solid #FDE68A;border-radius:5px;font-size:11px"><input type="number" value="${child.pass_score || 80}" onchange="_bmUpdateChildProp(${gi},${ci},'pass_score',Number(this.value))" style="width:48px;padding:5px;border:1px solid #FDE68A;border-radius:5px;font-size:11px;text-align:center"></div></div>`;
  const m = child.mode || "path",
    ip = m === "path",
    cl = ip ? "#FCA5A5" : "#93C5FD",
    bg = ip ? "#FFF5F5" : "#EFF6FF",
    tc = ip ? "#DC2626" : "#1D4ED8";
  const it = (child.items || [])
    .map(
      (v, ii) =>
        `<div style="display:flex;gap:4px;margin-bottom:3px"><input type="text" value="${v}" onchange="_bmUpdateChildItem(${gi},${ci},${ii},this.value)" style="flex:1;padding:4px 7px;border:1px solid ${cl};border-radius:4px;font-size:10px"><button onclick="_bmRemoveChildItem(${gi},${ci},${ii})" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:10px">✕</button></div>`,
    )
    .join("");
  return `<div style="border:1px solid ${cl};border-radius:7px;padding:8px;margin-bottom:5px;background:${bg}"><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:10px;font-weight:700;color:${tc}">${ip ? "📌 순서형" : "🎲 선택형"} 과정</span><button onclick="_bmRemoveChildNode(${gi},${ci})" style="border:none;background:none;color:#9CA3AF;cursor:pointer;font-size:11px">✕</button></div>${!ip ? `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><span style="font-size:10px;color:#6B7280">최소</span><input type="number" value="${child.required_count || 1}" onchange="_bmUpdateChildProp(${gi},${ci},'required_count',Number(this.value))" style="width:36px;padding:3px;border:1px solid ${cl};border-radius:4px;font-size:10px;text-align:center"><span style="font-size:10px;color:#6B7280">개</span></div>` : ""}<div>${it}</div><button onclick="_bmAddChildItem(${gi},${ci})" style="margin-top:4px;padding:3px 7px;border:1px dashed ${cl};border-radius:4px;background:none;color:${tc};font-size:10px;font-weight:700;cursor:pointer">+추가</button></div>`;
}

// ── 레거시 호환 ──────────────────────────────────────────────────────────────
function openBadgeMgmtModal() {
  renderBadgeMgmt();
}
function openBadgeMgmtDetail(id, gid) {
  if (id) {
    const b = allBadges.find((x) => x.id === id);
    if (b) {
      _bmReturnGroupId = gid || null;
      openBadgePolicy(id, gid);
    } else renderBadgeMgmt();
  } else renderBadgeMgmt();
}
function editBadge(id) {
  openBadgePolicy(id);
}
function deleteBadge(id) {
  if (!confirm("삭제하시겠습니까?")) return;
  _sb()
    .from("badges")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) alert("삭제 실패: " + error.message);
      else loadBadgeMgmtData();
    });
}
