// ─── 예산 배정 및 관리 ────────────────────────────────────────────────────────
// 계층 구조:  계정 총액 (ACCOUNT_BUDGETS)
//              └─ 팀 배분 (TEAM_DIST)
//
// 추가 배정 = 계정에 예산 추가 (계정 총액 증가)
// 팀 배분   = 계정 잔여 재원을 팀으로 분배

let _allocTab = 0;

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderBoAllocation() {
  const el = document.getElementById("bo-content");
  const persona = boCurrentPersona;
  const tenantName =
    TENANTS.find((t) => t.id === persona.tenantId)?.name || "전체";

  // ── E-2: 역할 판별 ────────────────────────────────────────────────────
  const isGlobal = typeof isGlobalAdmin === 'function' ? isGlobalAdmin(persona) : (persona.ownedAccounts || []).length > 0;
  const isOp = typeof isOpManager === 'function' ? isOpManager(persona) : false;
  // 운영담당자 = 정의된 역할이 budget_op_manager이거나 managedVorgId만 있고 ownedAccounts는 없는 사람
  const isOpOnly = isOp && !isGlobal;

  // 탭 목록: 운영담당자 차단 탭 (ⓗ 기초·추가배정)
  const allTabs = [
    { label: "📊 계정 예산 현황", fn: "renderAllocOverview", idx: 0 },
    { label: "➕ 기초·추가 배정", fn: "renderAllocEntry", idx: 1, globalOnly: true },
    { label: "📋 팀 배분", fn: "renderTeamDist", idx: 2 },
    { label: "↔ 이관", fn: "renderAllocTransfer", idx: 3, globalOnly: true },
    { label: "📜 변경 이력", fn: "renderAllocHistory", idx: 4 },
  ];
  const visibleTabs = isOpOnly ? allTabs.filter(t => !t.globalOnly) : allTabs;

  // 역할 라벨
  const roleLabel = typeof getRoleLabel === 'function' ? getRoleLabel(persona) : (isOpOnly ? '운영담당자' : '총괄담당자');
  const roleBadge = isOpOnly
    ? `<span style="background:#DBEAFE;color:#1D4ED8;font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px">👤 ${roleLabel} — 조회전용</span>`
    : `<span style="background:#D1FAE5;color:#065F46;font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px">📊 ${roleLabel} — 전체 관리</span>`;

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">예산 배정</span>
      <h1 class="bo-page-title" style="margin:0">예산 배정 현황 관리</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
      ${roleBadge}
    </div>
    <p class="bo-page-sub">예산 흐름: 계정 총액 관리 → 팀 배분 → 실시간 원장 조회</p>
  </div>

  <!-- 예산 흐름 안내 -->
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;padding:10px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;font-size:12px;color:#065F46;font-weight:600;flex-wrap:wrap">
    <span>📌 예산 흐름:</span>
    <span style="background:#DBEAFE;color:#1E40AF;padding:2px 8px;border-radius:6px">ⓘ 기초 예산 등록</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px">ⓙ 계정 추가 배정 (연중 증액)</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:6px">ⓚ 팀 배분 (배분가능 재원 → 팀)</span>
    <span style="color:#9CA3AF">→</span>
    <span style="background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:6px">ⓛ 팀별 집행 관리</span>
  </div>

  ${isOpOnly ? `
  <!-- 운영담당자 권한 안내 배너 -->
  <div style="padding:10px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:10px;margin-bottom:16px;font-size:12px;color:#1E40AF;font-weight:600;display:flex;align-items:center;gap:8px">
    <span style="font-size:16px">🔒</span>
    <div>
      <div style="font-weight:800">운영담당자 모드: 계정 배정 탭은 조회전용입니다</div>
      <div style="font-size:11px;color:#3B82F6">기초/추가 배정, 이관은 총괄담당자 권한입니다. 팀 배분 요청은 팀 배분 탭에서 가능합니다.</div>
    </div>
  </div>` : ''}

  <!-- 탭 -->
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:24px" id="alloc-tabs">
    ${visibleTabs.map((t, i) => `
    <button onclick="showAllocTabByIdx(${t.idx})" id="alloc-tab-${t.idx}"
      style="padding:10px 18px;font-size:12px;font-weight:700;border:none;background:transparent;cursor:pointer;
             color:${t.idx === _allocTab ? '#059669' : '#9CA3AF'};border-bottom:${t.idx === _allocTab ? '3px solid #059669' : '3px solid transparent'};
             margin-bottom:-2px;transition:all .15s;white-space:nowrap">
      ${t.label}
    </button>`).join('')}
  </div>
  <div id="alloc-content">${renderAllocOverview()}</div>
</div>`;

  // DB에서 배정 데이터 동기화 (비동기 — 화면 렌더 후 백그라운드)
  _syncAllocFromDB(persona).then(() => {
    const contentEl = document.getElementById("alloc-content");
    if (contentEl && _allocTab === 0) {
      contentEl.innerHTML = renderAllocOverview();
    }
  });
}

function showAllocTab(idx) {
  showAllocTabByIdx(idx);
}

// E-2: idx 기반 탭 전환 (역할 서리 주치대상)
function showAllocTabByIdx(idx) {
  const persona = typeof boCurrentPersona !== 'undefined' ? boCurrentPersona : null;
  const isGlobal = typeof isGlobalAdmin === 'function' ? isGlobalAdmin(persona) : true;
  const isOp = typeof isOpManager === 'function' ? isOpManager(persona) : false;
  const isOpOnly = isOp && !isGlobal;

  // 운영담당자가 globalOnly 탭(탭1: 기초/추가배정, 탭3: 이관) 접근 시돈 경우 차단
  const globalOnlyIdxs = [1, 3];
  if (isOpOnly && globalOnlyIdxs.includes(idx)) {
    alert('총괄담당자만 사용할 수 있는 메뉴입니다.\n\n기초 및 추가 배정은 총괄담당자에게 요청하세요.');
    return;
  }

  _allocTab = idx;
  // 탭 스타일 업데이트 (0~4 모두)
  [0, 1, 2, 3, 4].forEach((i) => {
    const t = document.getElementById(`alloc-tab-${i}`);
    if (!t) return;
    t.style.color = i === idx ? "#059669" : "#9CA3AF";
    t.style.borderBottom =
      i === idx ? "3px solid #059669" : "3px solid transparent";
  });
  const fns = [
    renderAllocOverview,
    renderAllocEntry,
    renderTeamDist,
    renderAllocTransfer,
    renderAllocHistory,
  ];
  document.getElementById("alloc-content").innerHTML = fns[idx]();
}

// ─── 탭 1: 계정 예산 현황 (연도별 + 계정 선택 탭 + 교육조직 그룹핑) ──────────────
let _allocYear = new Date().getFullYear();
let _allocSelectedAbId = null;

function renderAllocOverview(year) {
  if (year !== undefined) _allocYear = year;
  const persona = boCurrentPersona;

  // ── vorg manager : 계정 총액·타 VOrg 비공개, 관할 VOrg만 표시 ─────────────
  if (typeof isVorgManager === "function" && isVorgManager(persona)) {
    return renderVorgManagerOverview();
  }

  const allBudgets = getPersonaAccountBudgets(persona);
  const availableYears = [
    ...new Set(allBudgets.map((ab) => ab.fiscalYear || 2026)),
  ].sort((a, b) => b - a);
  const myBudgets = allBudgets.filter(
    (ab) => (ab.fiscalYear || 2026) === _allocYear,
  );

  // 선택 계정 초기값: 첫 번째 계정
  if (
    !_allocSelectedAbId ||
    !myBudgets.find((ab) => ab.id === _allocSelectedAbId)
  ) {
    _allocSelectedAbId = myBudgets[0]?.id || null;
  }
  const ab = myBudgets.find((x) => x.id === _allocSelectedAbId);

  // ── 연도 선택 + 계정 선택 패널 ──────────────────────────────────────────────
  const topBarHtml = `
<div style="margin-bottom:16px">
  <!-- 연도 선택 -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <span style="font-size:11px;font-weight:700;color:#6B7280">📅 연도:</span>
    ${availableYears
      .map(
        (y) => `<button onclick="switchAllocYear(${y})"
      style="padding:4px 14px;border-radius:8px;border:2px solid ${y === _allocYear ? "#059669" : "#E5E7EB"};
      background:${y === _allocYear ? "#059669" : "white"};color:${y === _allocYear ? "white" : "#374151"};
      font-weight:700;font-size:12px;cursor:pointer">${y}년</button>`,
      )
      .join("")}
  </div>
  <!-- 계정 선택 카드 패널 -->
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    ${myBudgets
      .map((b) => {
        const a = ACCOUNT_MASTER.find((x) => x.code === b.accountCode);
        const isSel = b.id === _allocSelectedAbId;
        const isSAP = b.sourceType === "sap_if";
        const tot = b.baseAmount + b.totalAdded;
        const dist = TEAM_DIST.filter((t) => t.accountBudgetId === b.id).reduce(
          (s, t) => s + t.allocAmount,
          0,
        );
        const distrib = tot - dist;
        return `<button onclick="selectAllocAb('${b.id}')" style="
        display:flex;flex-direction:column;align-items:flex-start;gap:2px;
        padding:10px 14px;border-radius:10px;cursor:pointer;
        border:2px solid ${isSel ? "#059669" : "#E5E7EB"};
        background:${isSel ? "#F0FDF4" : "white"};
        box-shadow:${isSel ? "0 0 0 3px #BBF7D0" : "none"}">
        <div style="display:flex;align-items:center;gap:6px">
          <code style="font-size:10px;font-weight:900;padding:1px 6px;border-radius:5px;background:${isSAP ? "#DBEAFE" : "#FFEDD5"};color:${isSAP ? "#1E40AF" : "#9A3412"}">${b.accountCode}</code>
          ${isSel ? '<span style="color:#059669;font-size:11px">✓</span>' : ""}
        </div>
        <div style="font-size:11px;font-weight:700;color:#111;white-space:nowrap">${a?.name || b.accountCode}</div>
        <div style="font-size:10px;color:${distrib > 0 ? "#059669" : "#9CA3AF"};font-weight:600">${distrib > 0 ? "📦 " + boFmt(distrib) + "원 배분가능" : "완전 배분"}</div>
      </button>`;
      })
      .join("")}
  </div>
</div>`;

  if (!ab)
    return (
      topBarHtml +
      `<div style="padding:40px;text-align:center;color:#9CA3AF">계정을 선택하세요.</div>`
    );

  return topBarHtml + renderAbDetail(ab);
}

function selectAllocAb(abId) {
  _allocSelectedAbId = abId;
  document.getElementById("alloc-content").innerHTML = renderAllocOverview();
}

function switchAllocYear(year) {
  _allocYear = year;
  _allocSelectedAbId = null;
  document.getElementById("alloc-content").innerHTML = renderAllocOverview();
}

// === VOrg Manager 전용 예산 현황 뷰 (계정 총액·타 VOrg 비공개) ===================
function renderVorgManagerOverview() {
  const persona = boCurrentPersona;
  const myBudgets = getPersonaAccountBudgets(persona).filter(
    (ab) => (ab.fiscalYear || 2026) === _allocYear,
  );
  const vorg = getPersonaManagedVorg(persona);
  if (!vorg)
    return '<div style="padding:40px;text-align:center;color:#9CA3AF">관할 교육조직 정보가 없습니다.</div>';
  const isRnd = persona.budgetGroup === "rnd";
  const orgIcon = isRnd ? "🔬" : "🏢";

  // 연도 선택기
  const availableYears = [
    ...new Set(
      getPersonaAccountBudgets(persona).map((ab) => ab.fiscalYear || 2026),
    ),
  ].sort((a, b) => b - a);
  const yearSel = availableYears
    .map(
      (y) =>
        '<button onclick="switchAllocYear(' +
        y +
        ')" style="padding:4px 14px;border-radius:8px;border:2px solid ' +
        (y === _allocYear ? "#059669" : "#E5E7EB") +
        ";background:" +
        (y === _allocYear ? "#059669" : "white") +
        ";color:" +
        (y === _allocYear ? "white" : "#374151") +
        ';font-weight:700;font-size:12px;cursor:pointer">' +
        y +
        "년</button>",
    )
    .join("");

  const acctCards = myBudgets
    .map((ab) => {
      const acct = ACCOUNT_MASTER.find((x) => x.code === ab.accountCode);
      const isSAP = ab.sourceType === "sap_if";
      // VOrg에 배분된 TEAM_DIST 항목 (vorg name으로 매칭)
      const td = TEAM_DIST.find(
        (t) =>
          t.accountBudgetId === ab.id &&
          (t.teamName === vorg.name ||
            t.teamName.includes(vorg.name) ||
            vorg.name.includes(t.teamName)),
      );
      if (!td) {
        return (
          '<div class="bo-card" style="overflow:hidden;margin-bottom:16px">' +
          '<div style="padding:12px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:14px">' +
          orgIcon +
          "</span>" +
          '<span style="font-weight:800;font-size:14px">' +
          vorg.name +
          "</span>" +
          '<code style="background:white;padding:1px 8px;border-radius:5px;font-size:10px;font-weight:900;border:1.5px solid ' +
          (isSAP ? "#93C5FD" : "#FED7AA") +
          ";color:" +
          (isSAP ? "#1D4ED8" : "#C2410C") +
          '">' +
          ab.accountCode +
          "</code>" +
          '<span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;font-weight:700">⏳ 배분 대기 중</span>' +
          '</div><div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">총괄 담당자가 아직 이 조직에 예산을 배분하지 않았습니다.</div></div>'
        );
      }
      const allocated = td.allocAmount,
        spent = td.spent,
        reserved = td.reserved;
      const balance = allocated - spent - reserved;
      const pct =
        allocated > 0
          ? Math.min(((spent + reserved) / allocated) * 100, 100)
          : 0;
      const pctColor =
        pct >= 95 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#059669";

      // 하위 팀 현황 (VIRTUAL_EDU_ORGS teams)
      const subTeams = vorg.teams || [];
      const teamRows = subTeams
        .map((rt) => {
          const rb = rt.budget || {},
            ra = rb.allocated || 0,
            rs = rb.deducted || 0,
            rr = rb.holding || 0;
          const rBal = ra - rs - rr,
            rPct = ra > 0 ? Math.min(((rs + rr) / ra) * 100, 100) : 0;
          const rC =
            rPct >= 95 ? "#EF4444" : rPct >= 80 ? "#F59E0B" : "#059669";
          const rBar = ra
            ? '<div style="height:5px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:60px;margin:0 auto 2px"><div style="height:100%;background:' +
              rC +
              ";width:" +
              rPct.toFixed(0) +
              '%"></div></div><span style="font-size:10px;color:' +
              rC +
              '">' +
              rPct.toFixed(0) +
              "%</span>"
            : '<span style="font-size:10px;color:#D1D5DB">—</span>';
          return (
            '<tr style="background:white;border-top:1px solid #F1F5F9"><td style="padding:8px 16px 8px 40px"><div style="display:flex;align-items:center;gap:5px"><span style="color:#CBD5E1;font-size:11px">└─</span><span style="font-size:12px;font-weight:700;color:#374151">' +
            rt.name +
            '</span><span style="font-size:10px;color:#9CA3AF">실제팀</span></div></td>' +
            '<td style="text-align:right;font-size:12px">' +
            (ra ? boFmt(ra) : "—") +
            "</td>" +
            '<td style="text-align:right;color:#EF4444;font-size:12px">' +
            (rs ? boFmt(rs) : "—") +
            "</td>" +
            '<td style="text-align:right;color:#B45309;font-size:12px">' +
            (rr ? boFmt(rr) : "—") +
            "</td>" +
            '<td style="text-align:right;font-size:12px;color:' +
            rC +
            '">' +
            (ra ? boFmt(rBal) : "—") +
            "</td>" +
            '<td style="text-align:center">' +
            rBar +
            "</td></tr>"
          );
        })
        .join("");

      return (
        '<div class="bo-card" style="overflow:hidden;margin-bottom:16px">' +
        '<div style="padding:14px 20px;background:' +
        (isRnd ? "#F5F3FF" : "#EFF6FF") +
        ';border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:18px">' +
        orgIcon +
        "</span>" +
        '<div><div style="font-weight:900;font-size:15px">' +
        vorg.name +
        '</div><div style="font-size:10px;color:#6B7280">관할 가상' +
        (isRnd ? "센터" : "본부") +
        " · " +
        _allocYear +
        "년</div></div>" +
        '<code style="background:white;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:900;border:1.5px solid ' +
        (isSAP ? "#93C5FD" : "#FED7AA") +
        ";color:" +
        (isSAP ? "#1D4ED8" : "#C2410C") +
        '">' +
        ab.accountCode +
        "</code>" +
        '</div><span style="font-size:11px;font-weight:900;color:' +
        pctColor +
        '">소진율 ' +
        pct.toFixed(0) +
        "% " +
        (pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢") +
        "</span>" +
        "</div>" +
        // 배분 현황 요약 (계정 총액 비공개, 배분받은 금액만)
        '<div style="padding:14px 20px;background:#F9FAFB;border-bottom:2px solid #CBD5E1">' +
        '<div style="font-size:10px;color:#6B7280;font-weight:700;margin-bottom:8px;text-transform:uppercase">조직 배분 현황</div>' +
        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<div style="text-align:center;background:#EFF6FF;padding:8px 16px;border-radius:10px"><div style="font-size:10px;color:#1D4ED8;font-weight:700">배분 받은 예산</div><div style="font-weight:900;font-size:18px;color:#1D4ED8">' +
        boFmt(allocated) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">−</div>' +
        '<div style="text-align:center"><div style="font-size:10px;color:#EF4444;font-weight:700">집행</div><div style="font-weight:700;font-size:14px;color:#EF4444">' +
        boFmt(spent) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">−</div>' +
        '<div style="text-align:center"><div style="font-size:10px;color:#B45309;font-weight:700">가점유</div><div style="font-weight:700;font-size:14px;color:#B45309">' +
        boFmt(reserved) +
        "</div></div>" +
        '<div style="color:#9CA3AF;font-size:14px">=</div>' +
        '<div style="text-align:center;background:' +
        (balance > 0 ? "#F0FDF4" : "#FEF2F2") +
        ";padding:8px 16px;border-radius:10px;border:2px solid " +
        (balance > 0 ? "#BBF7D0" : "#FECACA") +
        '">' +
        '<div style="font-size:10px;color:' +
        (balance > 0 ? "#059669" : "#EF4444") +
        ';font-weight:700">잔 액</div>' +
        '<div style="font-weight:900;font-size:18px;color:' +
        (balance > 0 ? "#059669" : "#EF4444") +
        '">' +
        boFmt(balance) +
        "</div></div>" +
        "</div>" +
        '<div style="margin-top:10px;height:8px;background:#E2E8F0;border-radius:99px;overflow:hidden"><div style="height:100%;background:' +
        pctColor +
        ";width:" +
        pct.toFixed(0) +
        '%;border-radius:99px"></div></div>' +
        "</div>" +
        // 하위 팀 테이블
        '<div style="padding:8px 20px 4px"><div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase">하위 팀 예산 현황</div></div>' +
        '<table class="bo-table"><thead><tr><th>팀</th><th style="text-align:right">배분액</th><th style="text-align:right">실지출</th><th style="text-align:right">가점유</th><th style="text-align:right">잔액</th><th style="text-align:center">소진율</th></tr></thead>' +
        "<tbody>" +
        (teamRows ||
          '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9CA3AF;font-size:12px">하위 팀 데이터가 없습니다</td></tr>') +
        "</tbody></table>" +
        "</div>"
      );
    })
    .join("");

  return (
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px"><span style="font-size:11px;font-weight:700;color:#6B7280">📅 연도:</span>' +
    yearSel +
    "</div>" +
    '<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:16px;font-size:12px;color:#92400E;font-weight:600">👤 <b>' +
    persona.name +
    " " +
    persona.roleLabel +
    "</b> — 관할 조직(<b>" +
    vorg.name +
    "</b>)의 예산 현황만 표시합니다.</div>" +
    acctCards
  );
}
function renderAbDetail(ab) {
  const dummy_ab = ab;
  const acct = ACCOUNT_MASTER.find((a) => a.code === ab.accountCode);
  const isSAP = ab.sourceType === "sap_if";
  const totalBudget = ab.baseAmount + ab.totalAdded;
  const flatTeams = TEAM_DIST.filter((t) => t.accountBudgetId === ab.id);
  const distributed = flatTeams.reduce((s, t) => s + t.allocAmount, 0);
  const distributable = totalBudget - distributed;
  const totalSpent = flatTeams.reduce((s, t) => s + t.spent, 0);
  const totalReserved = flatTeams.reduce((s, t) => s + t.reserved, 0);
  const pct =
    totalBudget > 0
      ? Math.min(((totalSpent + totalReserved) / totalBudget) * 100, 100)
      : 0;
  const alertColor = pct >= 95 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#059669";

  const isRnd = ab.accountCode.includes("RND");
  const tpl = VIRTUAL_EDU_ORGS.find(
    (t) => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs),
  );
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];
  const groupedRows = [];
  const usedTdIds = new Set();

  // vorg manager이면 자신의 VOrg만 표시
  const _isVorgMgr =
    typeof isVorgManager === "function" &&
    isVorgManager(ab._persona || boCurrentPersona);
  const _myVorgId = _isVorgMgr ? boCurrentPersona.managedVorgId : null;
  const _filteredGroups = _myVorgId
    ? vGroups.filter((vg) => vg.id === _myVorgId)
    : vGroups;
  _filteredGroups.forEach((vg) => {
    const matchedTds = flatTeams.filter(
      (td) => td.teamName.includes(vg.name) || vg.name.includes(td.teamName),
    );
    if (!matchedTds.length) return;
    matchedTds.forEach((td) => usedTdIds.add(td.id));
    const vgAlloc = matchedTds.reduce((s, t) => s + t.allocAmount, 0);
    const vgSpent = matchedTds.reduce((s, t) => s + t.spent, 0);
    const vgRes = matchedTds.reduce((s, t) => s + t.reserved, 0);
    const vgBal = vgAlloc - vgSpent - vgRes;
    const vgPct =
      vgAlloc > 0 ? Math.min(((vgSpent + vgRes) / vgAlloc) * 100, 100) : 0;
    const vgC = vgPct >= 95 ? "#EF4444" : vgPct >= 80 ? "#F59E0B" : "#059669";
    groupedRows.push(`
    <tr style="background:#F1F5F9;border-top:2px solid #CBD5E1">
      <td style="padding:10px 16px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">${isRnd ? "🔬" : "🏢"}</span>
          <div><div style="font-weight:900;font-size:13px">${vg.name}</div><div style="font-size:10px;color:#64748B">교육조직 소계 · ${vg.manager || "—"}</div></div>
        </div>
      </td>
      <td style="text-align:right;font-weight:900;font-size:13px;color:#1D4ED8">${boFmt(vgAlloc)}</td>
      <td style="text-align:right;color:#EF4444;font-weight:700">${boFmt(vgSpent)}</td>
      <td style="text-align:right;color:#B45309;font-weight:700">${boFmt(vgRes)}</td>
      <td style="text-align:right;font-weight:900;color:${vgC};font-size:13px">${boFmt(vgBal)}</td>
      <td style="text-align:center">
        <div style="height:7px;background:#E2E8F0;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:${vgC};width:${vgPct.toFixed(0)}%"></div></div>
        <span style="font-size:10px;color:${vgC};font-weight:700">${vgPct.toFixed(0)}%</span>
      </td>
    </tr>`);
    vg.teams.forEach((rt) => {
      const rb = rt.budget || {};
      const ra = rb.allocated || 0,
        rs = rb.deducted || 0,
        rr = rb.holding || 0;
      const rBal = ra - rs - rr,
        rPct = ra > 0 ? Math.min(((rs + rr) / ra) * 100, 100) : 0;
      const rC = rPct >= 95 ? "#EF4444" : rPct >= 80 ? "#F59E0B" : "#059669";
      const rtPctBar = ra
        ? '<div style="height:5px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:60px;margin:0 auto 2px"><div style="height:100%;background:' +
          rC +
          ";width:" +
          rPct.toFixed(0) +
          '%"></div></div><span style="font-size:10px;color:' +
          rC +
          '">' +
          rPct.toFixed(0) +
          "%</span>"
        : '<span style="font-size:10px;color:#D1D5DB">—</span>';
      groupedRows.push(`
      <tr style="background:white;border-top:1px solid #F1F5F9">
        <td style="padding:8px 16px 8px 40px">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="color:#CBD5E1;font-size:11px">└─</span>
            <span style="font-size:12px;font-weight:700;color:#374151">${rt.name}</span>
            <span style="font-size:10px;color:#9CA3AF">실제팀</span>
          </div>
        </td>
        <td style="text-align:right;font-size:12px">${ra ? boFmt(ra) : "—"}</td>
        <td style="text-align:right;color:#EF4444;font-size:12px">${rs ? boFmt(rs) : "—"}</td>
        <td style="text-align:right;color:#B45309;font-size:12px">${rr ? boFmt(rr) : "—"}</td>
        <td style="text-align:right;font-size:12px;color:${rC}">${ra ? boFmt(rBal) : "—"}</td>
        <td style="text-align:center">${rtPctBar}</td>
      </tr>`);
    });
  });
  flatTeams
    .filter((td) => !usedTdIds.has(td.id))
    .forEach((td) => {
      const b = td.allocAmount - td.spent - td.reserved,
        p =
          td.allocAmount > 0
            ? Math.min(((td.spent + td.reserved) / td.allocAmount) * 100, 100)
            : 0,
        c = p >= 95 ? "#EF4444" : p >= 80 ? "#F59E0B" : "#059669";
      groupedRows.push(
        `<tr><td style="font-weight:700">${td.teamName}</td><td style="text-align:right;font-weight:700">${boFmt(td.allocAmount)}</td><td style="text-align:right;color:#EF4444">${boFmt(td.spent)}</td><td style="text-align:right;color:#B45309">${boFmt(td.reserved)}</td><td style="text-align:right;font-weight:900;color:${c}">${boFmt(b)}</td><td style="text-align:center"><div style="height:6px;background:#E5E7EB;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:${c};width:${p.toFixed(0)}%"></div></div><span style="font-size:10px;color:${c};font-weight:700">${p.toFixed(0)}%</span></td></tr>`,
      );
    });

  const _distribRow =
    distributable > 0
      ? '<div style="margin-top:8px;display:flex;gap:8px"><button onclick="showAllocTab(2)" style="font-size:11px;padding:4px 12px;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700">📋 팀 배분하기 →</button><span style="font-size:11px;color:#059669;font-weight:600;align-self:center">미배분 ' +
        boFmt(distributable) +
        "원 배분 가능</span></div>"
      : "";
  const _emptyRow =
    groupedRows.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#9CA3AF;font-size:12px">아직 배분된 조직이 없습니다 — 팀 배분 탭에서 배분하세요</td></tr>'
      : groupedRows.join("");
  const _footHtml =
    flatTeams.length > 0
      ? '<tfoot style="background:#F1F5F9;border-top:2px solid #CBD5E1"><tr>' +
        '<td style="padding:10px 16px;font-weight:900">전체 합계</td>' +
        '<td style="text-align:right;font-weight:900;padding:10px 16px;color:#1D4ED8">' +
        boFmt(distributed) +
        "</td>" +
        '<td style="text-align:right;color:#EF4444;padding:10px 16px">' +
        boFmt(totalSpent) +
        "</td>" +
        '<td style="text-align:right;color:#B45309;padding:10px 16px">' +
        boFmt(totalReserved) +
        "</td>" +
        '<td style="text-align:right;font-weight:900;padding:10px 16px;color:' +
        alertColor +
        '">' +
        boFmt(distributed - totalSpent - totalReserved) +
        "</td>" +
        '<td style="text-align:center;padding:10px 16px"><div style="height:7px;background:#E2E8F0;border-radius:99px;overflow:hidden;width:70px;margin:0 auto 2px"><div style="height:100%;background:' +
        alertColor +
        ";border-radius:99px;width:" +
        pct.toFixed(0) +
        '%"></div></div><span style="font-size:10px;color:' +
        alertColor +
        ';font-weight:700">' +
        pct.toFixed(0) +
        "%</span></td>" +
        "</tr></tfoot>"
      : "";
  return `
<div class="bo-card" style="overflow:hidden">
  <!-- 계정 헤더 -->
  <div style="padding:14px 20px;background:${isSAP ? "#EFF6FF" : "#FFF7ED"};border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:10px">
      <code style="background:white;padding:2px 10px;border-radius:6px;font-size:11px;font-weight:900;border:1.5px solid ${isSAP ? "#93C5FD" : "#FED7AA"};color:${isSAP ? "#1D4ED8" : "#C2410C"}">${ab.accountCode}</code>
      <span style="font-weight:800;font-size:14px">${acct?.name || ab.accountCode}</span>
      <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:${isSAP ? "#DBEAFE" : "#FFEDD5"};color:${isSAP ? "#1E40AF" : "#9A3412"}">${isSAP ? "🔗 SAP I/F" : "✏️ 자체 관리"}</span>
      <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:#F3F4F6;color:#6B7280">${_allocYear}년</span>
    </div>
    <span style="font-size:11px;font-weight:900;color:${alertColor}">소진율 ${pct.toFixed(0)}% ${pct >= 95 ? "🔴" : pct >= 80 ? "🟡" : "🟢"}</span>
  </div>
  <!-- 계정 총액 요약 -->
  <div style="padding:14px 20px;background:#F9FAFB;border-bottom:2px solid #CBD5E1">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">기초 배정</div><div style="font-weight:900;font-size:14px">${boFmt(ab.baseAmount)}</div></div>
      <div style="color:#059669;font-weight:900;font-size:16px">+</div>
      <div style="text-align:center"><div style="font-size:10px;color:#059669">추가 배정</div><div style="font-weight:900;font-size:14px;color:#059669">+${boFmt(ab.totalAdded)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">=</div>
      <div style="text-align:center;background:#EFF6FF;padding:5px 12px;border-radius:10px"><div style="font-size:10px;color:#1D4ED8;font-weight:700">계정 총액</div><div style="font-weight:900;font-size:16px;color:#1D4ED8">${boFmt(totalBudget)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">−</div>
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">배분 완료</div><div style="font-weight:900;font-size:14px">${boFmt(distributed)}</div></div>
      <div style="color:#374151;font-weight:900;font-size:16px">=</div>
      <div style="text-align:center;background:${distributable <= 0 ? "#FEF2F2" : "#F0FDF4"};padding:5px 12px;border-radius:10px;border:2px solid ${distributable <= 0 ? "#FECACA" : "#BBF7D0"}">
        <div style="font-size:10px;color:${distributable <= 0 ? "#EF4444" : "#059669"};font-weight:700">📦 배분 가능</div>
        <div style="font-weight:900;font-size:16px;color:${distributable <= 0 ? "#EF4444" : "#059669"}">${boFmt(distributable)}</div>
      </div>
    </div>
    ${_distribRow}
  </div>
  <!-- 교육조직+팀 테이블 -->
  <div style="padding:10px 20px 4px"><div style="font-size:10px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.05em">조직별 배분 현황 (교육조직 → 실제팀)</div></div>
  <table class="bo-table">
    <thead><tr><th>조직</th><th style="text-align:right">배분액</th><th style="text-align:right">실지출</th><th style="text-align:right">가점유</th><th style="text-align:right">잔액</th><th style="text-align:center">소진율</th></tr></thead>
    <tbody>${_emptyRow}</tbody>
    ${_footHtml}
  </table>
</div>`;
}

// ─── 탭 2: 기초 예산 등록 + 추가 배정 (계정에 돈 넣기) ────────────────────────
function renderAllocEntry() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  if (!isOwner)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">계정 오너만 사용 가능합니다</div></div>`;

  const myBudgets = getPersonaAccountBudgets(persona);
  const platformBudgets = myBudgets.filter(
    (ab) => ab.sourceType === "platform",
  );

  return `
<div style="display:grid;gap:20px;max-width:700px">

  <!-- 기초 예산 등록 (플랫폼 자체관리형, baseAmount=0) -->
  ${
    platformBudgets.filter((ab) => ab.baseAmount === 0).length > 0
      ? `
  <div class="bo-card" style="padding:24px;border:2px solid #FED7AA">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:#C2410C;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">초기 설정</span>
      <div class="bo-section-title" style="margin:0;color:#C2410C">기초 예산 등록 — 연간 총액 최초 입력</div>
    </div>
    <div style="background:#FFF7ED;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:16px">
      ✏️ <b>자체관리형 계정(HMC-RND, HAE-)만</b> 여기서 최초 금액을 입력합니다.<br>
      🔗 SAP 연동형(HMC-OPS/PART/ETC, KIA-)은 SAP에서 자동 수신됩니다.
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">대상 계정 <span style="color:#EF4444">*</span></label>
        <select id="init-ab" style="width:100%;border:1.5px solid #FED7AA;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
          <option value="">— 계정 선택 —</option>
          ${platformBudgets
            .filter((ab) => ab.baseAmount === 0)
            .map(
              (ab) =>
                `<option value="${ab.id}">${ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name || ab.accountCode}</option>`,
            )
            .join("")}
        </select>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">연간 기초 예산 총액 <span style="color:#EF4444">*</span></label>
        <div style="position:relative">
          <input type="number" id="init-amount" placeholder="예) 10000000 (1천만원)" oninput="previewAmt('init-amount','init-preview')"
            style="width:100%;border:1.5px solid #FED7AA;border-radius:10px;padding:14px 50px 14px 16px;font-size:18px;font-weight:900"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
        </div>
        <div id="init-preview" style="font-size:12px;color:#059669;font-weight:700;margin-top:4px;text-align:right"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">비고</label>
        <input type="text" id="init-note" placeholder="예) 2026년 연간 운영계정 기초 예산 확정"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px"/>
      </div>
      <div style="background:#D1FAE5;border-radius:10px;padding:10px 14px;font-size:12px;color:#065F46;font-weight:600">
        ✅ 등록 즉시 <b>계정 예산 현황</b>에 반영 → 이후 <b>팀 배분</b>에서 금액을 팀에 나눠주세요
      </div>
      <button onclick="submitInitBudget()" class="bo-btn-primary" style="padding:14px;background:#C2410C;border-color:#C2410C">📋 기초 예산 등록 확정</button>
    </div>
  </div>`
      : `
  <div style="padding:14px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">✅</span>
    <div><div style="font-weight:800;color:#065F46">모든 자체관리형 계정의 기초 예산이 등록됐습니다</div><div style="font-size:11px;color:#6B7280">연중 증액이 필요하다면 아래 추가 배정을 이용하세요.</div></div>
  </div>`
  }

  <!-- 추가 배정 (계정에 예산 더 넣기) -->
  <div class="bo-card" style="padding:24px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:#059669;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">연중 증액</span>
      <div class="bo-section-title" style="margin:0">추가 배정 — 계정에 예산 추가</div>
    </div>
    <p style="font-size:12px;color:#6B7280;margin-bottom:16px">
      SAP I/F 계정은 SAP에서 증액 후 I/F 재수신, 자체관리형은 직접 금액 추가<br>
      <b>추가 배정 완료 후 → 팀 배분 탭에서 팀에 배분하세요</b>
    </p>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">추가 배정 계정 <span style="color:#EF4444">*</span></label>
        <select id="add-ab" onchange="showAddSrcBadge()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
          <option value="">— 계정 선택 —</option>
          ${myBudgets
            .map((ab) => {
              const acct = ACCOUNT_MASTER.find(
                (a) => a.code === ab.accountCode,
              );
              const total = ab.baseAmount + ab.totalAdded;
              return `<option value="${ab.id}" data-src="${ab.sourceType}">${acct?.name || ab.accountCode} (현재 총액: ${boFmt(total)}원)</option>`;
            })
            .join("")}
        </select>
        <div id="add-src-badge" style="margin-top:6px"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">추가할 금액 <span style="color:#EF4444">*</span></label>
        <div style="position:relative">
          <input type="number" id="add-amount" placeholder="예) 5000000 (500만원)" oninput="previewAmt('add-amount','add-preview')"
            style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
        </div>
        <div id="add-preview" style="font-size:12px;color:#059669;font-weight:700;margin-top:4px;text-align:right"></div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">변경 사유 (Audit Trail 필수) <span style="color:#EF4444">*</span></label>
        <textarea id="add-reason" rows="3" placeholder="예) 26년 중반 예산 소진 — 2분기 외부 교육 증가로 500만원 추가"
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
      </div>
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;font-weight:600">
        ⚠️ 추가 배정 확정 후에는 취소 불가 — 배분 가능 재원이 증가하며, 팀 배분 탭에서 팀에 나눠주세요
      </div>
      <button onclick="submitAddBudget()" class="bo-btn-primary" style="padding:14px">✅ 추가 배정 확정 (계정에 예산 추가)</button>
    </div>
  </div>
</div>`;
}

function previewAmt(inputId, previewId) {
  const v = Number(document.getElementById(inputId)?.value || 0);
  const el = document.getElementById(previewId);
  if (el)
    el.textContent =
      v > 0
        ? `= ${boFmt(v)}원 (${(v / 10000).toLocaleString("ko-KR")}만원)`
        : "";
}

function showAddSrcBadge() {
  const sel = document.getElementById("add-ab");
  const src = sel.options[sel.selectedIndex]?.dataset?.src || "";
  const badge = document.getElementById("add-src-badge");
  if (badge && src)
    badge.innerHTML = `<div style="padding:8px 12px;border-radius:8px;font-size:11px;font-weight:700;background:${src === "sap_if" ? "#EFF6FF" : "#FFF7ED"};color:${src === "sap_if" ? "#1D4ED8" : "#C2410C"};border:1px solid ${src === "sap_if" ? "#BFDBFE" : "#FED7AA"}">
    ${src === "sap_if" ? "🔗 SAP I/F 연동 계정 — 추가 배정이 계정 총액에 가산됩니다." : "✏️ 자체관리 계정 — 입력 즉시 계정 총액에 반영되어 팀 배분 가능 재원이 증가합니다."}
  </div>`;
}

async function submitInitBudget() {
  const abId = document.getElementById("init-ab")?.value;
  const amount = Number(document.getElementById("init-amount")?.value);
  const note =
    document.getElementById("init-note")?.value || "연간 기초 예산 최초 등록";
  if (!abId || !amount) {
    alert("계정과 금액을 입력하세요.");
    return;
  }
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  if (!ab) return;
  if (ab.baseAmount > 0) {
    alert("이미 기초 예산이 등록된 계정입니다. 증액은 추가 배정을 이용하세요.");
    return;
  }

  // ── 인메모리 업데이트 ────────────────────────────────────────────────────
  ab.baseAmount = amount;
  ab.status = "confirmed";
  ab.enteredBy = boCurrentPersona.name;
  ab.enteredAt = new Date().toISOString().slice(0, 10);
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}`,
    accountBudgetId: abId,
    date: new Date().toISOString().slice(0, 10),
    type: "기초입력",
    amount,
    note,
    by: boCurrentPersona.name,
  });

  // ── Supabase DB 저장 (account_budgets upsert) ────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const { error } = await sb.from("account_budgets").upsert({
        account_code: ab.accountCode,
        fiscal_year: _allocYear || new Date().getFullYear(),
        total_budget: amount,
        deducted: 0,
        holding: 0,
        tenant_id: ab.tenantId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_code,fiscal_year,tenant_id' });
      if (error) throw error;
      console.log(`[BO] initBudget saved: ${ab.accountCode} ${amount}`);
      // #13-P2: sync budget_allocations so FO balance reflects new total
      await _syncBudgetAllocations(sb, ab, amount, 0, _allocYear || new Date().getFullYear());
    } catch (e) {
      console.error("[BO initBudget] DB error:", e.message);
      alert(`\u26a0 \uc778\uba54\ubaa8\ub9ac\uc5d0\ub294 \ubc18\uc601\ub410\uc73c\ub098 DB \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4: ${e.message}`);
    }
  }


  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name ||
    ab.accountCode;
  alert(
    `✅ 기초 예산 등록 완료!\n\n계정: ${acctName}\n금액: ${boFmt(amount)}원\n(DB 저장 완료)\n\n이제 [팀 배분] 탭에서 팀에 배분하세요.`,
  );
  showAllocTab(0);
}

async function submitAddBudget() {
  const abId = document.getElementById("add-ab")?.value;
  const amount = Number(document.getElementById("add-amount")?.value);
  const reason = document.getElementById("add-reason")?.value;
  if (!abId || !amount || !reason) {
    alert("모든 항목을 입력하세요.");
    return;
  }
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  if (!ab) return;

  // ── 인메모리 업데이트 ────────────────────────────────────────────────────
  ab.totalAdded += amount;
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}`,
    accountBudgetId: abId,
    date: new Date().toISOString().slice(0, 10),
    type: "추가배정",
    amount,
    note: reason,
    by: boCurrentPersona.name,
  });

  // ── Supabase DB 저장 (account_budgets upsert) ────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      const newTotal = ab.baseAmount + ab.totalAdded;
      const { error } = await sb.from("account_budgets").upsert({
        account_code: ab.accountCode,
        fiscal_year: _allocYear || new Date().getFullYear(),
        total_budget: newTotal,
        tenant_id: ab.tenantId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'account_code,fiscal_year,tenant_id' });
      if (error) throw error;
      console.log(`[BO] addBudget saved: ${ab.accountCode} +${amount}, total=${newTotal}`);
      // #13-P2: sync budget_allocations so FO balance reflects new total
      await _syncBudgetAllocations(sb, ab, newTotal, ab.usedAmount || 0, _allocYear || new Date().getFullYear());
    } catch (e) {
      console.error("[BO addBudget] DB error:", e.message);
      alert(`\u26a0 \uc778\uba54\ubaa8\ub9ac\uc5d0\ub294 \ubc18\uc601\ub410\uc73c\ub098 DB \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4: ${e.message}`);
    }
  }

  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name ||
    ab.accountCode;
  const newTotal = ab.baseAmount + ab.totalAdded;
  alert(
    `✅ 추가 배정 완료!\n\n계정: ${acctName}\n+${boFmt(amount)}원 추가\n새 계정 총액: ${boFmt(newTotal)}원 (DB 저장 완료)\n\n[팀 배분] 탭에서 배분 가능 재원을 팀에 배분하세요.`,
  );
  showAllocTab(0);
}

// ─── 탭 3: 팀 배분 (계정 재원 → 팀) ─────────────────────────────────────────
// ─── 탭 3: 팀 일괄 배분 ──────────────────────────────────────────────────────
let _distAbId = null;

function renderTeamDist() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  const canDist =
    isOwner || (typeof isVorgManager === "function" && isVorgManager(persona));
  if (!canDist)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">팀 배분은 계정 오너 또는 본부/센터 담당자만 가능합니다</div></div>`;

  // vorg manager 안내 배너
  const vmBanner =
    !isOwner && isVorgManager(persona)
      ? `<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:12px;font-size:12px;color:#92400E;font-weight:600">
        👤 <b>${persona.scope}</b> 담당자 — 관할 조직(${getPersonaManagedVorg(persona)?.name || persona.scope})의 하위 팀에만 배분 가능합니다.
       </div>`
      : "";

  const myBudgets = getPersonaAccountBudgets(persona);
  if (!_distAbId) _distAbId = myBudgets[0]?.id || null;
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === _distAbId);
  const distributable = ab ? getDistributable(ab) : 0;

  const acctSelectHtml = `
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
  ${myBudgets
    .map((b) => {
      const a = ACCOUNT_MASTER.find((x) => x.code === b.accountCode);
      const isSel = b.id === _distAbId;
      const d = getDistributable(b);
      return `<button onclick="selectDistAb('${b.id}')" style="padding:8px 14px;border-radius:10px;cursor:pointer;border:2px solid ${isSel ? "#059669" : "#E5E7EB"};background:${isSel ? "#F0FDF4" : "white"};font-weight:700;font-size:11px">
      <div style="color:${isSel ? "#059669" : "#374151"}">${a?.name || b.accountCode}</div>
      <div style="font-size:10px;color:${d > 0 ? "#059669" : "#9CA3AF"};margin-top:2px">${d > 0 ? "📦 " + boFmt(d) + "원" : "완전 배분"}</div>
    </button>`;
    })
    .join("")}
</div>`;

  if (!ab)
    return (
      acctSelectHtml +
      `<div style="padding:30px;text-align:center;color:#9CA3AF">계정을 선택하세요.</div>`
    );

  const isRnd = ab.accountCode.includes("RND");
  const tpl = VIRTUAL_EDU_ORGS.find(
    (t) => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs),
  );
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];

  // 배분 테이블 행 (교육조직 헤더 + 실제팀 입력행)
  let tableRows = "";
  let inputIdx = 0;
  const allTeams = []; // {vgName, teamName, inputId, existing, currentAlloc}

  // vorg manager이면 자신의 VOrg만 표시
  const _isVorgMgr =
    typeof isVorgManager === "function" &&
    isVorgManager(ab._persona || boCurrentPersona);
  const _myVorgId = _isVorgMgr ? boCurrentPersona.managedVorgId : null;
  const _filteredGroups = _myVorgId
    ? vGroups.filter((vg) => vg.id === _myVorgId)
    : vGroups;
  _filteredGroups.forEach((vg) => {
    tableRows += `<tr style="background:#F1F5F9;border-top:2px solid #CBD5E1">
      <td style="padding:9px 14px" colspan="2">
        <div style="display:flex;align-items:center;gap:6px">
          <span>${isRnd ? "🔬" : "🏢"}</span>
          <span style="font-weight:900;font-size:12px">${vg.name}</span>
          <span style="font-size:10px;color:#64748B">교육조직</span>
        </div>
      </td>
      <td colspan="2"></td>
    </tr>`;
    vg.teams.forEach((rt) => {
      const inputId = `dist-input-${inputIdx++}`;
      const existing = TEAM_DIST.find(
        (t) => t.accountBudgetId === ab.id && t.teamName === rt.name,
      );
      allTeams.push({
        vgName: vg.name,
        teamName: rt.name,
        inputId,
        existing,
        currentAlloc: existing?.allocAmount || 0,
      });
      tableRows += `<tr>
        <td style="padding:8px 14px 8px 32px">
          <div style="display:flex;align-items:center;gap:5px">
            <span style="color:#CBD5E1;font-size:11px">└─</span>
            <span style="font-size:12px;font-weight:700">${rt.name}</span>
          </div>
        </td>
        <td style="text-align:right;font-size:11px;color:#6B7280">${existing ? "현재 " + boFmt(existing.allocAmount) + "원" : "미배분"}</td>
        <td style="padding:6px 10px">
          <div style="position:relative">
            <input type="number" id="${inputId}" placeholder="0" oninput="calcDistRemain()"
              style="width:130px;border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 36px 7px 10px;font-size:13px;font-weight:700;text-align:right"/>
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF">원</span>
          </div>
        </td>
        <td style="font-size:11px;color:#059669;font-weight:600;white-space:nowrap" id="${inputId}-preview"></td>
      </tr>`;
    });
  });

  return `
<div style="max-width:800px">
  ${vmBanner}
  <div style="padding:10px 16px;background:#EDE9FE;border:1px solid #C4B5FD;border-radius:10px;margin-bottom:16px;font-size:12px;color:#5B21B6;font-weight:600">
    📋 <b>일괄 배분</b> — 계정의 배분 가능 재원을 팀에 한 번에 나눠줍니다.
  </div>
  ${acctSelectHtml}
  <!-- 배분 가능 재원 표시 -->
  <div id="dist-remain-bar" style="padding:12px 16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
    <div><div style="font-size:10px;color:#6B7280">배분 가능 재원</div><div style="font-weight:900;font-size:18px;color:#1D4ED8">${boFmt(distributable)}원</div></div>
    <div style="color:#9CA3AF;font-size:18px;font-weight:300">−</div>
    <div><div style="font-size:10px;color:#6B7280">입력 합계</div><div id="dist-input-total" style="font-weight:900;font-size:18px;color:#374151">0원</div></div>
    <div style="color:#9CA3AF;font-size:18px;font-weight:300">=</div>
    <div id="dist-remain-box" style="background:#D1FAE5;padding:6px 14px;border-radius:10px;border:2px solid #6EE7B7">
      <div style="font-size:10px;color:#059669">배분 후 잔액</div>
      <div id="dist-remain-val" style="font-weight:900;font-size:18px;color:#059669">${boFmt(distributable)}원</div>
    </div>
  </div>
  <!-- 일괄 배분 테이블 -->
  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <table class="bo-table">
      <thead><tr>
        <th>팀</th><th style="text-align:right">현재 배분</th>
        <th style="text-align:right">추가 배분 금액 입력</th><th>적용 후</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:12px">
    ⚠️ 배분 확정 후 취소 불가 · 입력 금액의 합계가 배분 가능 재원을 초과할 수 없습니다
  </div>
  <button onclick="submitBulkDist()" class="bo-btn-primary" style="width:100%;padding:14px;font-size:14px">✅ 일괄 배분 확정</button>
</div>
<script>
(function(){
  // allTeams 데이터를 window에 저장
  window._distAllTeams = ${JSON.stringify(allTeams)};
  window._distAbId = '${ab.id}';
  window._distMaxAmount = ${distributable};
})();
</script>`;
}

function selectDistAb(abId) {
  _distAbId = abId;
  document.getElementById("alloc-content").innerHTML = renderTeamDist();
}

function calcDistRemain() {
  const teams = window._distAllTeams || [];
  let total = 0;
  teams.forEach((t) => {
    total += Number(document.getElementById(t.inputId)?.value || 0);
  });
  const remain = (window._distMaxAmount || 0) - total;
  const el = document.getElementById("dist-input-total");
  const rv = document.getElementById("dist-remain-val");
  const rb = document.getElementById("dist-remain-box");
  if (el) el.textContent = boFmt(total) + "원";
  if (rv) {
    rv.textContent = boFmt(remain) + "원";
    rv.style.color = remain < 0 ? "#EF4444" : "#059669";
  }
  if (rb) {
    rb.style.background = remain < 0 ? "#FEE2E2" : "#D1FAE5";
    rb.style.borderColor = remain < 0 ? "#FCA5A5" : "#6EE7B7";
  }
  // 개별 팀 미리보기
  teams.forEach((t) => {
    const v = Number(document.getElementById(t.inputId)?.value || 0);
    const pv = document.getElementById(t.inputId + "-preview");
    if (pv)
      pv.textContent =
        v > 0 ? "→ " + boFmt((t.currentAlloc || 0) + v) + "원" : "";
  });
}

async function submitBulkDist() {
  const teams = window._distAllTeams || [];
  const abId = window._distAbId;
  const maxAmt = window._distMaxAmount || 0;
  const ab = ACCOUNT_BUDGETS.find((x) => x.id === abId);
  let total = 0;
  teams.forEach((t) => {
    total += Number(document.getElementById(t.inputId)?.value || 0);
  });
  if (total === 0) {
    alert("배분 금액을 1개 이상 입력하세요.");
    return;
  }
  if (total > maxAmt) {
    alert(
      `입력 합계(${boFmt(total)}원)가 배분 가능 재원(${boFmt(maxAmt)}원)을 초과합니다.`,
    );
    return;
  }

  // ── Supabase DB 저장 ────────────────────────────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  const lines = [];
  const errors = [];

  if (sb && ab) {
    try {
      // 1. 해당 계정의 org_budget_bankbooks 조회 (팀명 → bankbook_id 매핑)
      const { data: bankbooks, error: bbErr } = await sb
        .from("org_budget_bankbooks")
        .select("id, org_id, org_name, account_id")
        .eq("tenant_id", ab.tenantId)
        .or("bb_status.eq.active,bb_status.is.null");
      if (bbErr) throw bbErr;

      // 2. budget_accounts에서 accountCode → DB id 조회
      const { data: accts } = await sb
        .from("budget_accounts")
        .select("id, code")
        .eq("code", ab.accountCode)
        .eq("tenant_id", ab.tenantId)
        .eq("active", true)
        .limit(1);
      const dbAccountId = accts?.[0]?.id;

      // 3. 각 팀 배분 처리
      for (const t of teams) {
        const v = Number(document.getElementById(t.inputId)?.value || 0);
        if (v <= 0) continue;

        // bankbook 매칭: 팀명 + 계정ID
        const bb = (bankbooks || []).find(
          (b) =>
            (b.org_name === t.teamName ||
              b.org_name.includes(t.teamName) ||
              t.teamName.includes(b.org_name)) &&
            (dbAccountId ? b.account_id === dbAccountId : true),
        );

        if (!bb) {
          errors.push(t.teamName);
          // 인메모리는 그래도 업데이트 (화면 표시 유지)
          const ex = TEAM_DIST.find(
            (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
          );
          if (ex) ex.allocAmount += v;
          else
            TEAM_DIST.push({
              id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`,
              accountBudgetId: abId,
              teamName: t.teamName,
              allocAmount: v,
              spent: 0,
              reserved: 0,
            });
          lines.push(`  ${t.teamName}: +${boFmt(v)}원 (⚠ DB 저장 제외)`);
          continue;
        }

        // budget_allocations 조회 및 upsert
        const { data: existing } = await sb
          .from("budget_allocations")
          .select("id, allocated_amount")
          .eq("bankbook_id", bb.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        const existingRow = existing?.[0];
        if (existingRow) {
          await sb
            .from("budget_allocations")
            .update({
              allocated_amount:
                Number(existingRow.allocated_amount) + v,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRow.id);
        } else {
          await sb.from("budget_allocations").insert({
            bankbook_id: bb.id,
            allocated_amount: v,
            used_amount: 0,
            frozen_amount: 0,
          });
        }

        // 인메모리 동기화 (화면 리렌더용)
        const ex = TEAM_DIST.find(
          (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
        );
        if (ex) {
          ex.allocAmount += v;
        } else {
          TEAM_DIST.push({
            id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`,
            accountBudgetId: abId,
            teamName: t.teamName,
            allocAmount: v,
            spent: 0,
            reserved: 0,
          });
        }
        lines.push(`  ${t.teamName}: +${boFmt(v)}원 ✅`);
      }
    } catch (e) {
      console.error("[BO 팀배분] DB 저장 오류:", e.message);
      alert(`DB 저장 중 오류가 발생했습니다: ${e.message}\n인메모리에만 반영됩니다.`);
      // 오류 시 인메모리 폴백 처리
      teams.forEach((t) => {
        const v = Number(document.getElementById(t.inputId)?.value || 0);
        if (v <= 0) return;
        const ex = TEAM_DIST.find(
          (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
        );
        if (ex) ex.allocAmount += v;
        else
          TEAM_DIST.push({
            id: `TD${Date.now()}`,
            accountBudgetId: abId,
            teamName: t.teamName,
            allocAmount: v,
            spent: 0,
            reserved: 0,
          });
        lines.push(`  ${t.teamName}: +${boFmt(v)}원`);
      });
    }
  } else {
    // Supabase 없음: 인메모리 전용 폴백
    teams.forEach((t) => {
      const v = Number(document.getElementById(t.inputId)?.value || 0);
      if (v <= 0) return;
      const ex = TEAM_DIST.find(
        (td) => td.accountBudgetId === abId && td.teamName === t.teamName,
      );
      if (ex) ex.allocAmount += v;
      else
        TEAM_DIST.push({
          id: `TD${Date.now()}`,
          accountBudgetId: abId,
          teamName: t.teamName,
          allocAmount: v,
          spent: 0,
          reserved: 0,
        });
      lines.push(`  ${t.teamName}: +${boFmt(v)}원`);
    });
  }

  const acctName =
    ACCOUNT_MASTER.find((a) => a.code === ab?.accountCode)?.name ||
    ab?.accountCode || "";
  let msg = `✅ 일괄 배분 완료!\n\n계정: ${acctName}\n배분 내역:\n${lines.join("\n")}\n\n총 배분: ${boFmt(total)}원\n잔여 배분 가능: ${boFmt(maxAmt - total)}원`;
  if (errors.length > 0) {
    msg += `\n\n⚠ 통장 미매칭 팀 (DB 미반영): ${errors.join(", ")}`;
  }
  alert(msg);
  _distAbId = abId;
  showAllocTab(0);
}

// ─── 탭 4: 예산 이관 ─────────────────────────────────────────────────────────
function renderAllocTransfer() {
  const persona = boCurrentPersona;
  const isOwner = (persona.ownedAccounts || []).length > 0;
  const canTransfer =
    isOwner || (typeof isVorgManager === "function" && isVorgManager(persona));
  if (!canTransfer)
    return `<div style="padding:40px;text-align:center"><div style="font-size:40px">🔒</div><div style="font-weight:900;color:#374151">이관은 계정 오너 또는 본부/센터 담당자만 가능합니다</div></div>`;

  const myBudgets = getPersonaAccountBudgets(persona);
  const isVM = typeof isVorgManager === "function" && isVorgManager(persona);
  const vmVorg = isVM ? getPersonaManagedVorg(persona) : null;
  const vmTeamNames = vmVorg ? (vmVorg.teams || []).map((t) => t.name) : null;

  // vorg manager이면 자신 VOrg 팀의 TEAM_DIST만
  const eligibleTeams = myBudgets.flatMap((ab) =>
    TEAM_DIST.filter(
      (t) =>
        t.accountBudgetId === ab.id &&
        (!vmTeamNames ||
          vmTeamNames.some(
            (tn) => t.teamName.includes(tn) || tn.includes(t.teamName),
          )),
    ),
  );

  const vmBannerTr = isVM
    ? `<div style="padding:10px 16px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:12px;font-size:12px;color:#92400E;font-weight:600">
        👤 <b>${persona.scope}</b> 담당자 — 관할 조직(${vmVorg?.name || persona.scope}) 하위 팀 간 이관만 가능합니다.
       </div>`
    : "";

  return `
<div class="bo-card" style="padding:24px;max-width:680px">
  ${vmBannerTr}
  <div class="bo-section-title" style="margin-bottom:4px">예산 이관 — 팀 간 잔액 이동</div>
  <p style="font-size:12px;color:#6B7280;margin-bottom:16px">동일 계정 내에서 A팀의 잔여 배분액을 B팀으로 이동 — 사유 필수</p>
  <div style="display:grid;gap:14px">
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 계정 <span style="color:#EF4444">*</span></label>
      <select id="tr-ab" onchange="updateTrTeams()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
        <option value="">— 계정 선택 —</option>
        ${myBudgets.map((ab) => `<option value="${ab.id}">${ACCOUNT_MASTER.find((a) => a.code === ab.accountCode)?.name || ab.accountCode}</option>`).join("")}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
      <div>
        <label style="font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;display:block;margin-bottom:6px">From (이관 출처)</label>
        <select id="tr-from" style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700"><option>— 계정 먼저 선택 —</option></select>
      </div>
      <div style="font-size:22px;color:#9CA3AF;text-align:center;margin-top:18px">→</div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;display:block;margin-bottom:6px">To (이관 대상)</label>
        <select id="tr-to" style="width:100%;border:1.5px solid #BBF7D0;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700"><option>— 계정 먼저 선택 —</option></select>
      </div>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 금액</label>
      <div style="position:relative">
        <input type="number" id="tr-amount" placeholder="0" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
      </div>
    </div>
    <div>
      <label style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:6px">이관 사유 (필수)</label>
      <textarea id="tr-reason" rows="3" placeholder="조직 개편, 예산 부족, 사업 계획 변경 등"
        style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
    </div>
    <button onclick="submitTransfer()" class="bo-btn-primary" style="padding:14px">↔ 이관 처리</button>
  </div>
</div>
<script>window._trVmTeamNames=${JSON.stringify(vmTeamNames)};</script>`;
}

function updateTrTeams() {
  const abId = document.getElementById("tr-ab")?.value;
  const vmTeams = window._trVmTeamNames; // null이면 전체, array이면 해당 팀만
  let teams = TEAM_DIST.filter((t) => t.accountBudgetId === abId);
  if (vmTeams) {
    teams = teams.filter((t) =>
      vmTeams.some((tn) => t.teamName.includes(tn) || tn.includes(t.teamName)),
    );
  }
  const opts =
    `<option value="">— 팀 선택 —</option>` +
    teams
      .map(
        (t) =>
          `<option value="${t.id}">${t.teamName} (잔액: ${boFmt(t.allocAmount - t.spent - t.reserved)}원)</option>`,
      )
      .join("");
  const frm = document.getElementById("tr-from");
  const to = document.getElementById("tr-to");
  if (frm) frm.innerHTML = opts;
  if (to) to.innerHTML = opts;
}

async function submitTransfer() {
  const fromId = document.getElementById("tr-from")?.value;
  const toId = document.getElementById("tr-to")?.value;
  const amount = Number(document.getElementById("tr-amount")?.value);
  const reason = document.getElementById("tr-reason")?.value;
  if (!fromId || !toId || !amount || !reason || fromId === toId) {
    alert("모든 항목을 올바르게 입력하세요.");
    return;
  }
  const from = TEAM_DIST.find((x) => x.id === fromId);
  const to = TEAM_DIST.find((x) => x.id === toId);
  const bal = from.allocAmount - from.spent - from.reserved;
  if (amount > bal) {
    alert(`잔액 부족: ${boFmt(bal)}원만 이관 가능합니다.`);
    return;
  }

  // ── Supabase DB 저장 ────────────────────────────────────────────────────
  const sb = typeof getSB === "function" ? getSB() : null;
  if (sb) {
    try {
      // From team bankbook 찾기 (teamName 기반)
      const { data: bankbooks } = await sb
        .from("org_budget_bankbooks")
        .select("id, org_name, account_id")
        .eq("tenant_id", boCurrentPersona.tenantId)
        .or("bb_status.eq.active,bb_status.is.null");

      // AB의 accountCode로 DB account id 매핑
      const fromAbCode = ACCOUNT_BUDGETS.find(x => x.id === from.accountBudgetId)?.accountCode;
      const toAbCode = ACCOUNT_BUDGETS.find(x => x.id === to.accountBudgetId)?.accountCode;

      const { data: accts } = await sb
        .from("budget_accounts")
        .select("id, code")
        .in("code", [fromAbCode, toAbCode].filter(Boolean))
        .eq("tenant_id", boCurrentPersona.tenantId)
        .eq("active", true);
      const acctCodeIdMap = {};
      (accts || []).forEach(a => { acctCodeIdMap[a.code] = a.id; });

      const fromBb = (bankbooks || []).find(b =>
        (b.org_name === from.teamName || b.org_name.includes(from.teamName) || from.teamName.includes(b.org_name)) &&
        (acctCodeIdMap[fromAbCode] ? b.account_id === acctCodeIdMap[fromAbCode] : true)
      );
      const toBb = (bankbooks || []).find(b =>
        (b.org_name === to.teamName || b.org_name.includes(to.teamName) || to.teamName.includes(b.org_name)) &&
        (acctCodeIdMap[toAbCode] ? b.account_id === acctCodeIdMap[toAbCode] : true)
      );

      if (fromBb && toBb) {
        // From: allocated_amount 차감
        const { data: fromAlloc } = await sb
          .from("budget_allocations").select("id, allocated_amount")
          .eq("bankbook_id", fromBb.id).order("updated_at", { ascending: false }).limit(1);
        if (fromAlloc?.[0]) {
          await sb.from("budget_allocations")
            .update({ allocated_amount: Number(fromAlloc[0].allocated_amount) - amount, updated_at: new Date().toISOString() })
            .eq("id", fromAlloc[0].id);
        }
        // To: allocated_amount 증가
        const { data: toAlloc } = await sb
          .from("budget_allocations").select("id, allocated_amount")
          .eq("bankbook_id", toBb.id).order("updated_at", { ascending: false }).limit(1);
        if (toAlloc?.[0]) {
          await sb.from("budget_allocations")
            .update({ allocated_amount: Number(toAlloc[0].allocated_amount) + amount, updated_at: new Date().toISOString() })
            .eq("id", toAlloc[0].id);
        } else {
          await sb.from("budget_allocations").insert({ bankbook_id: toBb.id, allocated_amount: amount, used_amount: 0, frozen_amount: 0 });
        }
      } else {
        console.warn("[BO 이관] 일부 팀 bankbook 미매칭 — 인메모리만 업데이트");
      }
    } catch (e) {
      console.error("[BO 이관] DB 저장 오류:", e.message);
    }
  }

  // 인메모리 업데이트
  from.allocAmount -= amount;
  to.allocAmount += amount;
  const now = new Date().toISOString().slice(0, 10);
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}a`,
    accountBudgetId: from.accountBudgetId,
    date: now,
    type: "이관출처",
    amount: -amount,
    note: `→ ${to.teamName}: ${reason}`,
    by: boCurrentPersona.name,
  });
  ACCOUNT_ADJUST_HISTORY.push({
    id: `AH${Date.now()}b`,
    accountBudgetId: to.accountBudgetId,
    date: now,
    type: "이관수신",
    amount: +amount,
    note: `← ${from.teamName}: ${reason}`,
    by: boCurrentPersona.name,
  });
  alert(`✅ 이관 완료\n${from.teamName} → ${to.teamName}\n${boFmt(amount)}원`);
  showAllocTab(0);
}

// ─── 탭 5: 변경 이력 (Audit Trail) ───────────────────────────────────────────
function renderAllocHistory() {
  const persona = boCurrentPersona;
  const myAbIds = getPersonaAccountBudgets(persona).map((ab) => ab.id);
  const history = ACCOUNT_ADJUST_HISTORY.filter((h) =>
    myAbIds.includes(h.accountBudgetId),
  ).sort((a, b) => b.date.localeCompare(a.date));

  const typeStyle = {
    SAP_IF: { bg: "#DBEAFE", c: "#1E40AF" },
    기초입력: { bg: "#E0E7FF", c: "#4338CA" },
    확정: { bg: "#D1FAE5", c: "#065F46" },
    추가배정: { bg: "#FEF3C7", c: "#92400E" },
    이관출처: { bg: "#FEE2E2", c: "#991B1B" },
    이관수신: { bg: "#F0FDF4", c: "#166534" },
  };

  return `
<div class="bo-card" style="overflow:hidden">
  <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;font-weight:800;font-size:13px">변경 이력 — Audit Trail</div>
  <table class="bo-table">
    <thead><tr><th>일자</th><th>계정</th><th style="text-align:center">유형</th><th style="text-align:right">금액</th><th>내용</th><th>처리자</th></tr></thead>
    <tbody>
      ${history
        .map((h) => {
          const ab = ACCOUNT_BUDGETS.find((x) => x.id === h.accountBudgetId);
          const s = typeStyle[h.type] || { bg: "#F3F4F6", c: "#374151" };
          const ac =
            h.amount > 0 ? "#059669" : h.amount < 0 ? "#EF4444" : "#9CA3AF";
          return `<tr>
          <td style="font-size:12px;color:#6B7280;white-space:nowrap">${h.date}</td>
          <td><code style="background:#F3F4F6;padding:1px 7px;border-radius:5px;font-size:11px;font-weight:700">${ab?.accountCode || "—"}</code></td>
          <td style="text-align:center"><span style="font-size:10px;font-weight:900;background:${s.bg};color:${s.c};padding:2px 8px;border-radius:6px">${h.type}</span></td>
          <td style="text-align:right;font-weight:900;color:${ac}">${h.amount !== 0 ? (h.amount > 0 ? "+" : "") + boFmt(h.amount) + "원" : "—"}</td>
          <td style="font-size:12px;color:#374151">${h.note}</td>
          <td style="font-size:11px;color:#9CA3AF">${h.by}</td>
        </tr>`;
        })
        .join("")}
    </tbody>
  </table>
</div>`;
}

// ������ DB ���� ������ ����ȭ ��������������������������������������������������������������������������������������������������������
/**
 * Supabase budget_allocations �� TEAM_DIST ����ȭ
 * BO ȭ�� ���� �� ȣ���Ͽ� �θ޸� ����� DB ���� �����ͷ� ����
 */
async function _syncAllocFromDB(persona) {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;

  try {
    const tenantId = persona?.tenantId;
    if (!tenantId) return;

    // 1. �ش� �׳�Ʈ�� �� ���� + allocation ���� ��ȸ
    const { data: bankbooks, error: bbErr } = await sb
      .from("org_budget_bankbooks")
      .select("id, org_name, account_id, tenant_id")
      .eq("tenant_id", tenantId)
      .or("bb_status.eq.active,bb_status.is.null")
      .is("user_id", null);
    if (bbErr) throw bbErr;

    if (!bankbooks || bankbooks.length === 0) return;

    const bbIds = bankbooks.map((b) => b.id);
    // 2. �ش� ������� budget_allocations ��ȸ
    const { data: allocs, error: allocErr } = await sb
      .from("budget_allocations")
      .select("id, bankbook_id, allocated_amount, used_amount, frozen_amount, updated_at")
      .in("bankbook_id", bbIds);
    if (allocErr) throw allocErr;

    // 3. budget_accounts �ڵ� ��
    const acctIds = [...new Set(bankbooks.map((b) => b.account_id))];
    const { data: accts } = await sb
      .from("budget_accounts")
      .select("id, code, uses_budget")
      .in("id", acctIds);
    const acctMap = {};
    (accts || []).forEach((a) => { acctMap[a.id] = a; });

    // 4. bankbook_id �� �ֽ� allocation ��
    const allocMap = {};
    (allocs || []).forEach((a) => {
      if (!allocMap[a.bankbook_id] ||
          (a.updated_at || "") > (allocMap[a.bankbook_id].updated_at || "")) {
        allocMap[a.bankbook_id] = a;
      }
    });

    // 5. TEAM_DIST ����
    let syncCount = 0;
    for (const bb of bankbooks) {
      const acct = acctMap[bb.account_id];
      if (!acct || !acct.uses_budget) continue;

      const alloc = allocMap[bb.id];
      if (!alloc) continue;

      const ab = ACCOUNT_BUDGETS.find(
        (x) => x.accountCode === acct.code && x.tenantId === tenantId
      );
      if (!ab) continue;

      const existingIdx = TEAM_DIST.findIndex(
        (td) => td.accountBudgetId === ab.id && td.teamName === bb.org_name
      );

      const newAmt = Number(alloc.allocated_amount || 0);
      const newSpent = Number(alloc.used_amount || 0);
      const newFrozen = Number(alloc.frozen_amount || 0);

      if (existingIdx >= 0) {
        TEAM_DIST[existingIdx].allocAmount = newAmt;
        TEAM_DIST[existingIdx].spent = newSpent;
        TEAM_DIST[existingIdx].reserved = newFrozen;
        TEAM_DIST[existingIdx]._bbId = bb.id;
        TEAM_DIST[existingIdx]._allocId = alloc.id;
      } else if (newAmt > 0) {
        TEAM_DIST.push({
          id: "TD_DB_" + bb.id,
          accountBudgetId: ab.id,
          teamName: bb.org_name,
          allocAmount: newAmt,
          spent: newSpent,
          reserved: newFrozen,
          _bbId: bb.id,
          _allocId: alloc.id,
        });
      }
      syncCount++;
    }

    console.log("[BO Alloc Sync] " + tenantId + " ���� DB ����ȭ �Ϸ� (" + syncCount + "��)");
  } catch (e) {
    console.warn("[BO Alloc Sync] DB error (non-critical):", e.message);
  }
}

// ─── #13-P2: budget_allocations 연쇄 동기화 헬퍼 ───────────────────────────
// 기초/추가 배정 후 budget_allocations 테이블의 잔액(balance)을 최신 총액에 맞게 갱신
// @param sb           Supabase 클라이언트
// @param ab           ACCOUNT_BUDGETS 항목
// @param totalBudget  새 계정 총 예산
// @param usedAmount   이미 사용된 금액 (승인된 교육계획/신청 합계)
// @param fiscalYear   회계연도
async function _syncBudgetAllocations(sb, ab, totalBudget, usedAmount, fiscalYear) {
  if (!sb || !ab) return;
  try {
    const balance = Math.max(0, totalBudget - usedAmount);

    // 1. account_budgets 보조 컬럼 갱신 (잔액, 사용액)
    const { error: abErr } = await sb.from('account_budgets').update({
      balance: balance,
      used: usedAmount,
      updated_at: new Date().toISOString(),
    }).eq('account_code', ab.accountCode)
      .eq('fiscal_year', fiscalYear)
      .eq('tenant_id', ab.tenantId);
    if (abErr) console.warn('[_syncBudgetAllocations] account_budgets update:', abErr.message);

    // 2. org_budget_bankbooks 테이블이 있으면 동기화
    const { data: bankbooks, error: bbErr } = await sb.from('org_budget_bankbooks')
      .select('id, org_id')
      .eq('account_code', ab.accountCode)
      .eq('fiscal_year', fiscalYear)
      .eq('tenant_id', ab.tenantId);

    if (!bbErr && bankbooks && bankbooks.length > 0) {
      // 각 통장의 allocated_amount를 합산하여 배분 비율로 잔액 재계산
      const totalAllocated = bankbooks.reduce((s, b) => s + (b.allocated_amount || 0), 0);
      for (const bb of bankbooks) {
        const ratio = totalAllocated > 0 ? (bb.allocated_amount || 0) / totalAllocated : 1 / bankbooks.length;
        const newBalance = Math.round(balance * ratio);
        await sb.from('org_budget_bankbooks').update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        }).eq('id', bb.id);
      }
      console.log(`[_syncBudgetAllocations] ${bankbooks.length}개 bankbook 잔액 갱신 완료`);
    }

    console.log(`[_syncBudgetAllocations] ${ab.accountCode} FY${fiscalYear} total=${totalBudget} balance=${balance}`);
  } catch (e) {
    // 비치명적 오류 — 인메모리/account_budgets 저장은 이미 완료된 상태
    console.warn('[_syncBudgetAllocations] non-critical error:', e.message);
  }
}

