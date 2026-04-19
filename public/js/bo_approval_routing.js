// ─── 백오피스: 계정별 금액별 결재라인 설정 (Approval Routing by Account) ──────
// 3단계 결재방식(external/platform/integrated) × 2축 에스컬레이션 모델
// 축1: 총액 → 승인자 레벨 상승  |  축2: soft 초과 → 조건부 협조처 활성화

let _arEditId = null; // 현재 편집 중인 라우팅 ID
let _arModal = false;

// 노드 타입별 스타일
const NODE_TYPE_STYLES = {
  draft: { bg: "#EFF6FF", color: "#1D4ED8", icon: "📝", label: "기안" },
  approval: { bg: "#FEF3C7", color: "#92400E", icon: "✅", label: "승인" },
  coop: { bg: "#FDE8E8", color: "#991B1B", icon: "🤝", label: "협조" },
  reference: { bg: "#F3F4F6", color: "#6B7280", icon: "📋", label: "참조" },
};

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderApprovalRouting() {
  const tenantId = boCurrentPersona.tenantId || "HMC";
  const tenantName = TENANTS.find((t) => t.id === tenantId)?.name || tenantId;
  const accounts = ACCOUNT_MASTER.filter((a) => a.tenantId === tenantId);
  const el = document.getElementById("bo-content");

  el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#D97706;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">결재라인</span>
      <h1 class="bo-page-title" style="margin:0">계정별 금액별 결재라인 설정</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">
      교육 신청 시 사용되는 예산 계정별로, 신청 총액(세부산출근거 합계) 기준의 결재 단계와 결재권자를 설정합니다.
    </p>
    <div style="margin-top:8px;padding:9px 14px;background:#FFFBEB;border-radius:8px;border:1px solid #FDE68A;font-size:11px;color:#92400E;font-weight:600">
      📐 <strong>2축 에스컬레이션</strong>:
      <strong>축1</strong> 신청 총액 → 승인자 레벨 상승 (자체+통합 공통)
      &nbsp;|&nbsp;
      <strong>축2</strong> soft 상한 초과 → 조건부 협조처 활성화 (통합결재 전용)
    </div>
    <div style="margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:10px;font-weight:700;color:#6B7280">결재방식:</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#F0FDF4;color:#059669;font-weight:700">⚡ 자체결재 (platform · 축1)</span>
      <span style="font-size:10px;padding:3px 8px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:700">🔗 통합결재 (integrated · 축1+축2)</span>
      <span style="font-size:10px;color:#9CA3AF">※ 외부결재(external) 타입 폐지 — 2개 체계만 운영</span>
    </div>
  </div>

  <div id="ar-content">${_renderArContent(tenantId)}</div>

  <!-- 라우팅 편집 모달 -->
  <div id="ar-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:720px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
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

  <!-- 룰 빌더 모달 -->
  <div id="ar-rule-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:560px;max-height:75vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 id="ar-rule-title" style="font-size:14px;font-weight:800;color:#111827;margin:0">조건 룰 설정</h3>
        <button onclick="arCloseRuleModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="ar-rule-body"></div>
    </div>
  </div>
</div>`;
}

// ─── 결재라인 목록 렌더 ──────────────────────────────────────────────────────
function _renderArContent(tenantId) {
  const routings = APPROVAL_ROUTING.filter((r) => r.tenantId === tenantId);

  return `
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div>
      <span style="font-size:12px;color:#6B7280">설정된 결재라인: ${routings.length}개</span>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="arOpenNewModal()">+ 결재라인 추가</button>
  </div>

  ${routings
    .map(
      (r) => `
  <div class="bo-card" style="margin-bottom:14px;padding:20px 24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:14px;border-bottom:1.5px solid #F3F4F6">
      <div>
        <div style="font-size:14px;font-weight:800;color:#92400E;margin-bottom:4px">${r.name}</div>
        <!-- 계정 성격별 색상 코드 + 결재방식 배지 -->
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px">
          ${r.accountCodes
            .map((c) => {
              const acct =
                typeof ACCOUNT_MASTER !== "undefined"
                  ? ACCOUNT_MASTER.find((a) => a.code === c)
                  : null;
              const sys = acct?.approvalSystem || "platform";
              const sysBadge =
                sys === "integrated"
                  ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#FEF3C7;color:#92400E;font-weight:800;margin-left:3px">통합</span>'
                  : sys === "platform"
                    ? '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#F0FDF4;color:#059669;font-weight:800;margin-left:3px">자체</span>'
                    : '<span style="font-size:8px;padding:1px 5px;border-radius:3px;background:#EFF6FF;color:#1D4ED8;font-weight:800;margin-left:3px">외부</span>';
              return (
                `<code style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700">${c}</code>${sysBadge}` +
                (acct
                  ? `<span style="font-size:10px;color:#6B7280">${acct.name}</span>`
                  : "")
              );
            })
            .join(" ")}
        </div>
      </div>
      <button class="bo-btn-secondary bo-btn-sm" onclick="arOpenEditModal('${r.id}')">편집</button>
    </div>

    <!-- 구간별 노드 플로우 -->
    <div style="display:flex;flex-direction:column;gap:6px">
      ${r.ranges
        .map((range, i) => {
          const nodes = range.nodes || [];
          const approvalNodes = nodes.filter((n) => n.type === "approval");
          const coopNodes = nodes.filter((n) => n.type === "coop");
          const nodeCount = approvalNodes.length + coopNodes.length;
          return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${i % 2 === 0 ? "#FAFAFA" : "#FFF"};border-radius:10px;border:1px solid #F3F4F6">
        <div style="min-width:180px;font-size:11px;font-weight:700;color:#92400E">${range.label}</div>
        <div style="display:flex;align-items:center;gap:4px;flex:1;flex-wrap:wrap">
          ${nodes
            .filter((n) => n.type !== "draft")
            .map((n, j, arr) => {
              const st = NODE_TYPE_STYLES[n.type] || NODE_TYPE_STYLES.approval;
              const isConditional = n.activation === "conditional";
              const condLabel = isConditional
                ? ' <span style="font-size:8px;color:#DC2626">(조건)</span>'
                : "";
              return `
            <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:16px;font-size:11px;font-weight:700;white-space:nowrap;${isConditional ? "border:1px dashed " + st.color : ""}">
              ${st.icon} ${n.label}${condLabel}
            </span>
            ${j < arr.length - 1 ? '<span style="color:#D97706;font-size:12px">→</span>' : ""}`;
            })
            .join("")}
        </div>
        <span style="font-size:11px;font-weight:800;flex-shrink:0;padding:3px 10px;border-radius:6px;
          background:${nodeCount <= 1 ? "#F0FDF4" : nodeCount <= 2 ? "#FFFBEB" : "#FEF2F2"};
          color:${nodeCount <= 1 ? "#059669" : nodeCount <= 2 ? "#D97706" : "#DC2626"}">
          ${approvalNodes.length}+${coopNodes.length}단계
        </span>
      </div>`;
        })
        .join("")}
    </div>
  </div>`,
    )
    .join("")}

  ${
    routings.length === 0
      ? `
  <div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:14px;margin-bottom:4px">이 테넌트의 결재라인이 설정되지 않았습니다.</div>
    <div style="font-size:12px">'+ 결재라인 추가' 버튼으로 새 결재라인을 등록하세요.</div>
  </div>`
      : ""
  }

  <div class="bo-card" style="padding:12px 18px;background:#FFFBEB;border-color:#FDE68A;margin-top:4px">
    <span style="font-size:12px;font-weight:700;color:#92400E">
      📋 <strong>적용 시점</strong>: 교육 신청서 제출 시, 세부산출근거로 계산된 합계 금액 기준으로 해당 계정의 결재라인이 자동 구성됩니다.
      🤝 <strong>협조처</strong>: 통합결재(integrated) 계정에서만 조건부 협조 노드가 활성화됩니다.
    </span>
  </div>
</div>`;
}

// ─── 모달 오픈/클로즈 ─────────────────────────────────────────────────────────
function arOpenEditModal(routingId) {
  _arEditId = routingId;
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r) return;
  document.getElementById("ar-modal-title").textContent =
    `결재라인 편집 — ${r.name}`;
  document.getElementById("ar-modal-body").innerHTML = _renderArEditor(r);
  document.getElementById("ar-modal").style.display = "flex";
}

function arOpenNewModal() {
  const tenantId = boCurrentPersona.tenantId || "HMC";
  const newId = "AR" + String(Date.now()).slice(-6);
  const newRouting = {
    id: newId,
    tenantId,
    name: "새 결재라인",
    accountCodes: [],
    ranges: [
      {
        max: 1000000,
        label: "100만원 미만",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          {
            type: "approval",
            label: "팀장",
            role: "팀장",
            final: true,
            order: 2,
          },
        ],
      },
      {
        max: null,
        label: "100만원 이상",
        nodes: [
          { type: "draft", label: "기안자", order: 1 },
          { type: "approval", label: "팀장", role: "팀장", order: 2 },
          {
            type: "approval",
            label: "실장",
            role: "실장",
            final: true,
            order: 3,
          },
        ],
      },
    ],
  };
  APPROVAL_ROUTING.push(newRouting);
  _arEditId = newId;
  document.getElementById("ar-modal-title").textContent = "결재라인 추가";
  document.getElementById("ar-modal-body").innerHTML =
    _renderArEditor(newRouting);
  document.getElementById("ar-modal").style.display = "flex";
}

function arCloseModal() {
  document.getElementById("ar-modal").style.display = "none";
  // 통합 계정관리 화면에서 열린 경우 ba-content 갱신
  const modal = document.getElementById("ar-modal");
  if (modal?._onClose) {
    modal._onClose();
    modal._onClose = null;
    return;
  }
  // 기존 approval-routing 단독 화면인 경우
  const arContent = document.getElementById("ar-content");
  if (arContent) {
    const tenantId = boCurrentPersona.tenantId || "HMC";
    arContent.innerHTML = _renderArContent(tenantId);
  }
}

// ─── 결재라인 편집기 ─────────────────────────────────────────────────────────
function _renderArEditor(r) {
  const tenantId = boCurrentPersona.tenantId || "HMC";
  const accounts =
    typeof ACCOUNT_MASTER !== "undefined"
      ? ACCOUNT_MASTER.filter((a) => a.tenantId === tenantId)
      : [];

  return `
<div style="display:flex;flex-direction:column;gap:16px">
  <!-- 라우팅명 -->
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">결재라인 명칭 <span style="color:#EF4444">*</span></label>
    <input id="ar-name" type="text" value="${r.name}"
      oninput="arUpdateField('${r.id}','name',this.value)"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
  </div>

  <!-- 적용 계정 선택 -->
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">적용 예산 계정 <span style="font-size:10px;color:#6B7280;font-weight:500">(복수 선택 가능)</span></label>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${accounts
        .map((a) => {
          const sys = a.approvalSystem || "platform";
          const sysIcon =
            sys === "integrated" ? "🔗" : sys === "platform" ? "⚡" : "🏢";
          return `
      <label style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${r.accountCodes.includes(a.code) ? "#D97706" : "#E5E7EB"};background:${r.accountCodes.includes(a.code) ? "#FFFBEB" : "#fff"}">
        <input type="checkbox" value="${a.code}" ${r.accountCodes.includes(a.code) ? "checked" : ""}
          onchange="arToggleAccount('${r.id}','${a.code}',this.checked)"
          style="accent-color:#D97706">
        <span style="font-size:11px;font-weight:700;color:${r.accountCodes.includes(a.code) ? "#92400E" : "#374151"}">${sysIcon} ${a.code}</span>
        <span style="font-size:10px;color:#6B7280">${a.name}</span>
      </label>`;
        })
        .join("")}
    </div>
    ${accounts.length === 0 ? '<div style="font-size:11px;color:#9CA3AF">이 테넌트에 등록된 계정이 없습니다.</div>' : ""}
  </div>

  <!-- 금액 구간별 노드 -->
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:12px;font-weight:800;color:#374151">금액 구간별 결재 노드</div>
      <div style="display:flex;gap:5px">
        ${Object.entries(NODE_TYPE_STYLES)
          .map(
            ([k, v]) =>
              `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:${v.bg};color:${v.color};font-weight:700">${v.icon} ${v.label}</span>`,
          )
          .join("")}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px" id="ar-ranges-${r.id}">
      ${r.ranges.map((range, i) => _renderArRangeRow(r.id, i, range)).join("")}
    </div>
    <button onclick="arAddRange('${r.id}')"
      style="margin-top:10px;width:100%;padding:9px;border:1.5px dashed #E5E7EB;border-radius:10px;background:#FAFAFA;color:#6B7280;font-size:12px;font-weight:700;cursor:pointer">
      + 구간 추가
    </button>
  </div>
</div>`;
}

function _renderArRangeRow(routingId, idx, range) {
  const nodes = range.nodes || [];
  return `
<div style="padding:14px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB">
  <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:10px">
    <div>
      <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">구간명</label>
      <input type="text" value="${range.label}"
        oninput="arUpdateRange('${routingId}',${idx},'label',this.value)"
        style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px">
    </div>
    <div>
      <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">상한 금액 (비워두면 무제한)</label>
      <input type="number" value="${range.max ?? ""}" placeholder="비워두면 상한 없음"
        oninput="arUpdateRange('${routingId}',${idx},'max',this.value === '' ? null : Number(this.value))"
        style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px">
    </div>
    <button onclick="arDeleteRange('${routingId}',${idx})"
      style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:18px;padding:4px;flex-shrink:0;align-self:end;margin-bottom:4px">🗑️</button>
  </div>

  <!-- 노드 플로우 -->
  <div style="font-size:10px;font-weight:700;color:#6B7280;margin-bottom:5px">결재 노드</div>
  <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:8px">
    ${nodes
      .map((n, j) => {
        const st = NODE_TYPE_STYLES[n.type] || NODE_TYPE_STYLES.approval;
        const isConditional = n.activation === "conditional";
        return `
      <div style="display:inline-flex;align-items:center;gap:3px;background:${st.bg};color:${st.color};padding:4px 10px;border-radius:16px;font-size:11px;font-weight:700;${isConditional ? "border:1px dashed " + st.color : ""}">
        ${st.icon} ${n.label}${n.final ? " ✓" : ""}
        ${isConditional ? `<button onclick="arOpenRuleEditor('${n.conditionRuleId}')" style="border:none;background:none;font-size:10px;cursor:pointer;padding:0 2px;color:${st.color}" title="조건 편집">⚙️</button>` : ""}
        <button onclick="arRemoveNode('${routingId}',${idx},${j})" style="border:none;background:none;font-size:10px;cursor:pointer;padding:0 2px;color:#9CA3AF" title="노드 삭제">✕</button>
      </div>
      ${j < nodes.length - 1 ? '<span style="color:#D97706;font-size:12px">→</span>' : ""}`;
      })
      .join("")}
  </div>

  <!-- 노드 추가 -->
  <div style="display:flex;gap:4px">
    <button onclick="arAddNode('${routingId}',${idx},'approval')" class="bo-btn-secondary" style="padding:3px 8px;font-size:10px;border-radius:5px">+ 승인</button>
    <button onclick="arAddNode('${routingId}',${idx},'coop')" class="bo-btn-secondary" style="padding:3px 8px;font-size:10px;border-radius:5px">+ 협조</button>
    <button onclick="arAddNode('${routingId}',${idx},'reference')" class="bo-btn-secondary" style="padding:3px 8px;font-size:10px;border-radius:5px">+ 참조</button>
  </div>
</div>`;
}

// ─── CRUD 헬퍼 ───────────────────────────────────────────────────────────────
function arUpdateField(routingId, field, value) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (r) r[field] = value;
}

function arToggleAccount(routingId, code, checked) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r) return;
  if (checked) {
    if (!r.accountCodes.includes(code)) r.accountCodes.push(code);
  } else {
    r.accountCodes = r.accountCodes.filter((c) => c !== code);
  }
  document.getElementById("ar-modal-body").innerHTML = _renderArEditor(r);
}

function arUpdateRange(routingId, idx, field, value) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (r && r.ranges[idx]) r.ranges[idx][field] = value;
}

function arAddRange(routingId) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r) return;
  r.ranges.push({
    max: null,
    label: "새 구간",
    nodes: [
      { type: "draft", label: "기안자", order: 1 },
      { type: "approval", label: "팀장", role: "팀장", final: true, order: 2 },
    ],
  });
  document.getElementById(`ar-ranges-${routingId}`).innerHTML = r.ranges
    .map((range, i) => _renderArRangeRow(routingId, i, range))
    .join("");
}

function arDeleteRange(routingId, idx) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r || r.ranges.length <= 1) {
    alert("최소 1개 구간은 필요합니다.");
    return;
  }
  r.ranges.splice(idx, 1);
  document.getElementById(`ar-ranges-${routingId}`).innerHTML = r.ranges
    .map((range, i) => _renderArRangeRow(routingId, i, range))
    .join("");
}

// ─── 노드 추가/삭제 ──────────────────────────────────────────────────────────
function arAddNode(routingId, rangeIdx, nodeType) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r || !r.ranges[rangeIdx]) return;
  const nodes = r.ranges[rangeIdx].nodes;
  const maxOrder = nodes.reduce((m, n) => Math.max(m, n.order || 0), 0);
  const label = prompt(
    `${NODE_TYPE_STYLES[nodeType]?.label || nodeType} 노드의 이름을 입력하세요:`,
    "",
  );
  if (!label) return;

  const newNode = { type: nodeType, label, order: maxOrder + 1 };
  if (nodeType === "approval") {
    newNode.role = label;
  } else if (nodeType === "coop") {
    newNode.coopType = label;
    newNode.activation = "conditional";
    newNode.requiresIntegrated = true;
    // 기존 룰 중 같은 테넌트에서 사용 가능한 룰 선택 또는 새로 생성
    const tenantId = r.tenantId;
    const existingRules = (
      typeof APPROVAL_COOP_RULES !== "undefined" ? APPROVAL_COOP_RULES : []
    ).filter((rule) => rule.tenantId === tenantId);
    if (existingRules.length > 0) {
      const ruleOptions = existingRules
        .map((rl, i) => `${i + 1}. ${rl.name}`)
        .join("\n");
      const choice = prompt(
        `조건 룰을 선택하세요:\n${ruleOptions}\n\n0. 새 룰 생성`,
        "1",
      );
      if (choice === "0" || !choice) {
        const newRuleId = "RULE-" + tenantId + "-" + Date.now();
        APPROVAL_COOP_RULES.push({
          id: newRuleId,
          name: label + " 활성화 조건",
          tenantId,
          operator: "OR",
          conditions: [{ field: "soft_limit_exceeded", op: "eq", value: true }],
        });
        newNode.conditionRuleId = newRuleId;
      } else {
        const selIdx = parseInt(choice) - 1;
        if (existingRules[selIdx])
          newNode.conditionRuleId = existingRules[selIdx].id;
      }
    } else {
      const newRuleId = "RULE-" + tenantId + "-" + Date.now();
      APPROVAL_COOP_RULES.push({
        id: newRuleId,
        name: label + " 활성화 조건",
        tenantId,
        operator: "OR",
        conditions: [{ field: "soft_limit_exceeded", op: "eq", value: true }],
      });
      newNode.conditionRuleId = newRuleId;
    }
  }

  nodes.push(newNode);
  document.getElementById(`ar-ranges-${routingId}`).innerHTML = r.ranges
    .map((range, i) => _renderArRangeRow(routingId, i, range))
    .join("");
}

function arRemoveNode(routingId, rangeIdx, nodeIdx) {
  const r = APPROVAL_ROUTING.find((x) => x.id === routingId);
  if (!r || !r.ranges[rangeIdx]) return;
  const nodes = r.ranges[rangeIdx].nodes;
  if (nodes[nodeIdx]?.type === "draft") {
    alert("기안 노드는 삭제할 수 없습니다.");
    return;
  }
  if (
    nodes.filter((n) => n.type === "approval").length <= 1 &&
    nodes[nodeIdx]?.type === "approval"
  ) {
    alert("최소 1개 승인 노드는 필요합니다.");
    return;
  }
  nodes.splice(nodeIdx, 1);
  document.getElementById(`ar-ranges-${routingId}`).innerHTML = r.ranges
    .map((range, i) => _renderArRangeRow(routingId, i, range))
    .join("");
}

// ─── 룰 빌더 모달 ────────────────────────────────────────────────────────────
const RULE_FIELDS = [
  {
    value: "soft_limit_exceeded",
    label: "세부산출근거 soft 초과",
    type: "boolean",
  },
  { value: "edu_type", label: "교육유형", type: "select" },
  { value: "total_amount", label: "신청 총액", type: "number" },
  { value: "edu_days", label: "교육기간(일)", type: "number" },
  { value: "is_overseas", label: "해외교육 여부", type: "boolean" },
];

function arOpenRuleEditor(ruleId) {
  const rule = (
    typeof APPROVAL_COOP_RULES !== "undefined" ? APPROVAL_COOP_RULES : []
  ).find((r) => r.id === ruleId);
  if (!rule) {
    alert("룰을 찾을 수 없습니다: " + ruleId);
    return;
  }
  document.getElementById("ar-rule-title").textContent = `📋 ${rule.name}`;
  document.getElementById("ar-rule-body").innerHTML = _renderRuleEditor(rule);
  document.getElementById("ar-rule-modal").style.display = "flex";
}

function arCloseRuleModal() {
  document.getElementById("ar-rule-modal").style.display = "none";
  // 결재라인 편집기 리프레시
  if (_arEditId) {
    const r = APPROVAL_ROUTING.find((x) => x.id === _arEditId);
    if (r)
      document.getElementById("ar-modal-body").innerHTML = _renderArEditor(r);
  }
}

function _renderRuleEditor(rule) {
  return `
<div style="display:flex;flex-direction:column;gap:14px">
  <!-- 연산자 -->
  <div style="display:flex;gap:10px;align-items:center">
    <span style="font-size:12px;font-weight:700;color:#374151">조건 연산:</span>
    <label style="font-size:12px;cursor:pointer">
      <input type="radio" name="rule-op-${rule.id}" value="OR" ${rule.operator === "OR" ? "checked" : ""}
        onchange="arUpdateRuleOp('${rule.id}','OR')"> OR (하나라도 만족)
    </label>
    <label style="font-size:12px;cursor:pointer">
      <input type="radio" name="rule-op-${rule.id}" value="AND" ${rule.operator === "AND" ? "checked" : ""}
        onchange="arUpdateRuleOp('${rule.id}','AND')"> AND (모두 만족)
    </label>
  </div>

  <!-- 조건 목록 -->
  ${rule.conditions
    .map(
      (c, i) => `
  <div style="display:flex;gap:6px;align-items:center;padding:8px 12px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB">
    <select onchange="arUpdateCondField('${rule.id}',${i},this.value)" style="padding:5px 8px;border:1px solid #E5E7EB;border-radius:5px;font-size:11px;flex:1">
      ${RULE_FIELDS.map((f) => `<option value="${f.value}" ${f.value === c.field ? "selected" : ""}>${f.label}</option>`).join("")}
    </select>
    <select onchange="arUpdateCondOp('${rule.id}',${i},this.value)" style="padding:5px 6px;border:1px solid #E5E7EB;border-radius:5px;font-size:11px;width:55px">
      ${["eq", "in", "gte", "gt", "lte", "lt"].map((op) => `<option value="${op}" ${op === c.op ? "selected" : ""}>${op}</option>`).join("")}
    </select>
    <input type="text" value="${Array.isArray(c.value) ? c.value.join(", ") : c.value}"
      onchange="arUpdateCondVal('${rule.id}',${i},this.value)"
      style="flex:1;padding:5px 8px;border:1px solid #E5E7EB;border-radius:5px;font-size:11px">
    <button onclick="arRemoveCond('${rule.id}',${i})" style="border:none;background:none;cursor:pointer;color:#9CA3AF;font-size:14px">✕</button>
  </div>`,
    )
    .join("")}

  <button onclick="arAddCond('${rule.id}')"
    style="padding:7px;border:1.5px dashed #E5E7EB;border-radius:8px;background:#FAFAFA;color:#6B7280;font-size:11px;font-weight:700;cursor:pointer">
    + 조건 추가
  </button>

  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="bo-btn-primary bo-btn-sm" onclick="arCloseRuleModal()">확인</button>
  </div>
</div>`;
}

function arUpdateRuleOp(ruleId, op) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (rule) rule.operator = op;
}

function arUpdateCondField(ruleId, idx, val) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (rule && rule.conditions[idx]) rule.conditions[idx].field = val;
}

function arUpdateCondOp(ruleId, idx, val) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (rule && rule.conditions[idx]) rule.conditions[idx].op = val;
}

function arUpdateCondVal(ruleId, idx, val) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (!rule || !rule.conditions[idx]) return;
  // 타입 자동 변환
  if (val === "true") rule.conditions[idx].value = true;
  else if (val === "false") rule.conditions[idx].value = false;
  else if (!isNaN(Number(val)) && val.trim() !== "")
    rule.conditions[idx].value = Number(val);
  else if (val.includes(","))
    rule.conditions[idx].value = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  else rule.conditions[idx].value = val;
}

function arAddCond(ruleId) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (!rule) return;
  rule.conditions.push({ field: "soft_limit_exceeded", op: "eq", value: true });
  document.getElementById("ar-rule-body").innerHTML = _renderRuleEditor(rule);
}

function arRemoveCond(ruleId, idx) {
  const rule = APPROVAL_COOP_RULES.find((r) => r.id === ruleId);
  if (!rule || rule.conditions.length <= 1) {
    alert("최소 1개 조건은 필요합니다.");
    return;
  }
  rule.conditions.splice(idx, 1);
  document.getElementById("ar-rule-body").innerHTML = _renderRuleEditor(rule);
}
