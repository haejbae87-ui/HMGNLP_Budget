// ─── BO DASHBOARD ────────────────────────────────────────────────────────────

function renderBoDashboard() {
  const p = boCurrentPersona;
  const el = document.getElementById("bo-content");

  if (p.role === "total_general" || p.role === "total_rnd") {
    el.innerHTML = renderTotalDashboard(p);
  } else if (p.role === "hq_general" || p.role === "center_rnd") {
    el.innerHTML = renderHqDashboard(p);
  } else {
    el.innerHTML = renderTeamDashboard(p);
  }
}

// ─── 총괄 대시보드 ────────────────────────────────────────────────────────────

function renderTotalDashboard(p) {
  const isRnd = p.budgetGroup === "rnd";
  const orgs = isRnd ? VIRTUAL_ORG.rnd.centers : VIRTUAL_ORG.general.hqs;
  const topKey = isRnd ? "center" : "hq";

  const grandTotal = orgs.reduce((s, o) => s + o.budget.total, 0);
  const grandDeducted = orgs.reduce((s, o) => s + o.budget.deducted, 0);
  const grandHolding = orgs.reduce((s, o) => s + o.budget.holding, 0);
  const grandAvail = grandTotal - grandDeducted - grandHolding;
  const deductedPct = ((grandDeducted / grandTotal) * 100).toFixed(1);
  const holdingPct = ((grandHolding / grandTotal) * 100).toFixed(1);

  const pendingPlans = MOCK_BO_PLANS.filter(
    (pl) => pl.status === "pending_total" && pl.group === p.budgetGroup,
  ).length;
  const pendingApps = MOCK_BO_APPLICATIONS.filter(
    (a) => a.status === "pending_total" && a.group === p.budgetGroup,
  ).length;

  return `
<div class="bo-fade">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <div style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">
        ${isRnd ? "R&amp;D 교육예산" : "일반 교육예산"} › 총괄 대시보드
      </div>
      <h1 class="bo-page-title">예산 총괄 대시보드</h1>
      <p class="bo-page-sub">2026년 전사 교육예산 현황 · <strong>${p.name}</strong> ${p.roleLabel}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#9CA3AF">최종 갱신: 2026-03-13 18:00</div>
  </div>

  <!-- KPI 4종 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    ${[
      {
        label: "총 예산",
        val: boFmt(grandTotal) + "원",
        sub: "전사 배정 총액",
        icon: "🏦",
        color: "#002C5F",
        bg: "#EFF6FF",
      },
      {
        label: "실차감 금액",
        val: boFmt(grandDeducted) + "원",
        sub: `소진율 ${deductedPct}%`,
        icon: "📉",
        color: "#1D4ED8",
        bg: "#EFF6FF",
      },
      {
        label: "가점유 금액",
        val: boFmt(grandHolding) + "원",
        sub: `홀딩률 ${holdingPct}%`,
        icon: "⏳",
        color: "#B45309",
        bg: "#FFF7ED",
      },
      {
        label: "사용 가능 잔액",
        val: boFmt(grandAvail) + "원",
        sub: "즉시 집행 가능",
        icon: "✅",
        color: "#059669",
        bg: "#F0FDF4",
      },
    ]
      .map(
        (k) => `
    <div class="bo-kpi-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">${k.label}</div>
        <div style="width:32px;height:32px;border-radius:8px;background:${k.bg};display:flex;align-items:center;justify-content:center;font-size:16px">${k.icon}</div>
      </div>
      <div style="font-size:20px;font-weight:900;color:${k.color};letter-spacing:-0.5px">${k.val}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${k.sub}</div>
    </div>`,
      )
      .join("")}
  </div>

  <!-- 예산 상태바 -->
  <div class="bo-card" style="padding:20px 24px;margin-bottom:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span class="bo-section-title">전사 예산 집행 현황</span>
      <div style="display:flex;gap:16px;font-size:11px;font-weight:700">
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;background:#002C5F;border-radius:2px;display:inline-block"></span>실차감 ${deductedPct}%</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;background:#F59E0B;border-radius:2px;display:inline-block"></span>가점유 ${holdingPct}%</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:10px;height:10px;background:#E5E7EB;border-radius:2px;display:inline-block"></span>잔액</span>
      </div>
    </div>
    <div class="budget-bar-wrap" style="height:20px;border-radius:8px">
      <div class="budget-bar-deducted" style="width:${deductedPct}%"></div>
      <div class="budget-bar-holding" style="width:${holdingPct}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#9CA3AF;margin-top:8px">
      <span>0원</span><span>총 ${boFmt(grandTotal)}원</span>
    </div>
  </div>

  <!-- 조직별 현황 + 결재 대기 -->
  <div style="display:grid;grid-template-columns:1fr 340px;gap:20px">
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
        <span class="bo-section-title">${isRnd ? "센터" : "본부"}별 예산 집행 현황</span>
      </div>
      <table class="bo-table">
        <thead><tr>
          <th>${isRnd ? "센터" : "본부"}</th>
          <th>담당자</th>
          <th style="text-align:right">총 예산</th>
          <th style="text-align:right">실차감</th>
          <th style="text-align:right">가점유</th>
          <th style="min-width:120px">집행률</th>
        </tr></thead>
        <tbody>
          ${orgs
            .map((o) => {
              const pct = (
                ((o.budget.deducted + o.budget.holding) / o.budget.total) *
                100
              ).toFixed(0);
              return `<tr>
              <td><div style="font-weight:700">${o.name}</div></td>
              <td><span style="font-size:12px;color:#6B7280">${o.manager}</span></td>
              <td style="text-align:right;font-weight:900">${boFmt(o.budget.total)}원</td>
              <td style="text-align:right;color:#002C5F;font-weight:700">${boFmt(o.budget.deducted)}원</td>
              <td style="text-align:right;color:#B45309;font-weight:700">${boFmt(o.budget.holding)}원</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="flex:1;height:6px;background:#E5E7EB;border-radius:9999px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:9999px"></div>
                  </div>
                  <span style="font-size:11px;font-weight:700;color:#374151;width:28px">${pct}%</span>
                </div>
              </td>
            </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    <!-- 결재 대기 요약 -->
    <div class="bo-card" style="padding:20px">
      <div class="bo-section-title" style="margin-bottom:16px">결재 대기 현황</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          {
            label: "교육계획 승인 대기",
            count: pendingPlans,
            color: "#1D4ED8",
            icon: "📋",
            menu: "plan-mgmt",
          },
          {
            label: "교육신청 승인 대기",
            count: pendingApps,
            color: "#B45309",
            icon: "✅",
            menu: "approval",
          },
          {
            label: "결과보고 승인 대기",
            count: MOCK_BO_APPLICATIONS.filter(
              (a) =>
                a.type === "결과보고" &&
                a.status.startsWith("pending") &&
                a.group === p.budgetGroup,
            ).length,
            color: "#059669",
            icon: "📤",
            menu: "approval",
          },
        ]
          .map(
            (item) => `
        <div onclick="boNavigate('${item.menu}')" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#F9FAFB;border-radius:12px;cursor:pointer;transition:background .15s" onmouseover="this.style.background='#F3F4F6'" onmouseout="this.style.background='#F9FAFB'">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:18px">${item.icon}</span>
            <span style="font-size:13px;font-weight:700;color:#374151">${item.label}</span>
          </div>
          <span style="font-size:20px;font-weight:900;color:${item.count > 0 ? item.color : "#9CA3AF"}">${item.count}건</span>
        </div>`,
          )
          .join("")}
      </div>
    </div>
  </div>
</div>`;
}

// ─── 본부/센터 대시보드 ───────────────────────────────────────────────────────

function renderHqDashboard(p) {
  const isRnd = p.budgetGroup === "rnd";
  const orgList = isRnd ? VIRTUAL_ORG.rnd.centers : VIRTUAL_ORG.general.hqs;
  const org = orgList[0]; // scope에 맞는 첫 번째

  const avail = org.budget.total - org.budget.deducted - org.budget.holding;

  return `
<div class="bo-fade">
  <div style="margin-bottom:24px">
    <div style="font-size:11px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">
      ${p.scope || ""} › ${isRnd ? "센터" : "본부"} 대시보드
    </div>
    <h1 class="bo-page-title">${isRnd ? "센터" : "본부"} 예산 대시보드</h1>
    <p class="bo-page-sub"><strong>${p.name}</strong> ${p.roleLabel}</p>
  </div>

  <!-- KPI -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px">
    ${[
      {
        label: "총 배정액",
        val: boFmt(org.budget.total) + "원",
        icon: "🏦",
        color: "#002C5F",
      },
      {
        label: "실차감",
        val: boFmt(org.budget.deducted) + "원",
        icon: "📉",
        color: "#1D4ED8",
      },
      {
        label: "가점유",
        val: boFmt(org.budget.holding) + "원",
        icon: "⏳",
        color: "#B45309",
      },
      {
        label: "가용 잔액",
        val: boFmt(avail) + "원",
        icon: "✅",
        color: "#059669",
      },
    ]
      .map(
        (k) => `
    <div class="bo-kpi-card">
      <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${k.label}</div>
      <div style="font-size:18px;font-weight:900;color:${k.color}">${k.val}</div>
    </div>`,
      )
      .join("")}
  </div>

  <!-- 팀별 현황 -->
  <div class="bo-card" style="overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6">
      <span class="bo-section-title">하위 팀별 예산 집행 현황</span>
    </div>
    <table class="bo-table">
      <thead><tr>
        <th>팀명</th>
        <th style="text-align:right">배분액</th>
        <th style="text-align:right">실차감</th>
        <th style="text-align:right">가점유</th>
        <th style="text-align:right">가용 잔액</th>
        <th style="min-width:120px">집행률</th>
      </tr></thead>
      <tbody>
        ${org.teams
          .map((t) => {
            const avail =
              t.budget.allocated - t.budget.deducted - t.budget.holding;
            const pct = (
              ((t.budget.deducted + t.budget.holding) / t.budget.allocated) *
              100
            ).toFixed(0);
            return `<tr>
            <td style="font-weight:700">${t.name}</td>
            <td style="text-align:right;font-weight:900">${boFmt(t.budget.allocated)}원</td>
            <td style="text-align:right;color:#002C5F;font-weight:700">${boFmt(t.budget.deducted)}원</td>
            <td style="text-align:right;color:#B45309;font-weight:700">${boFmt(t.budget.holding)}원</td>
            <td style="text-align:right;color:#059669;font-weight:900">${boFmt(avail)}원</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;height:6px;background:#E5E7EB;border-radius:9999px;overflow:hidden">
                  <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:9999px"></div>
                </div>
                <span style="font-size:11px;font-weight:700;width:28px">${pct}%</span>
              </div>
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>
</div>`;
}

// ─── 팀 대시보드 ──────────────────────────────────────────────────────────────

function renderTeamDashboard(p) {
  const team = VIRTUAL_ORG.general.hqs[0].teams[1]; // 역량OO팀

  return `
<div class="bo-fade">
  <div style="margin-bottom:24px">
    <h1 class="bo-page-title">팀 예산 대시보드</h1>
    <p class="bo-page-sub">${p.dept} · <strong>${p.name}</strong> ${p.roleLabel}</p>
  </div>

  <!-- 계정별 예산 현황 -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px">
    ${[
      {
        label: "운영계정",
        allocated: (team.budget.allocated * 0.6) | 0,
        deducted: (team.budget.deducted * 0.6) | 0,
        holding: (team.budget.holding * 0.6) | 0,
        color: "#1D4ED8",
      },
      {
        label: "기타계정",
        allocated: (team.budget.allocated * 0.2) | 0,
        deducted: (team.budget.deducted * 0.2) | 0,
        holding: (team.budget.holding * 0.2) | 0,
        color: "#7C3AED",
      },
      {
        label: "참가계정",
        allocated: (team.budget.allocated * 0.2) | 0,
        deducted: (team.budget.deducted * 0.2) | 0,
        holding: 0,
        color: "#059669",
      },
    ]
      .map((b) => {
        const avail = b.allocated - b.deducted - b.holding;
        const dPct = ((b.deducted / b.allocated) * 100).toFixed(0);
        const hPct = ((b.holding / b.allocated) * 100).toFixed(0);
        return `
      <div class="bo-kpi-card">
        <div style="font-size:12px;font-weight:900;color:${b.color};margin-bottom:12px">${b.label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px">
          <div><div style="color:#9CA3AF;font-weight:700">배분</div><div style="font-weight:900">${boFmt(b.allocated)}원</div></div>
          <div><div style="color:#9CA3AF;font-weight:700">잔여 가용</div><div style="font-weight:900;color:#059669">${boFmt(avail)}원</div></div>
          <div><div style="color:#9CA3AF;font-weight:700">실차감</div><div style="font-weight:700;color:#002C5F">${boFmt(b.deducted)}원</div></div>
          <div><div style="color:#9CA3AF;font-weight:700">가점유</div><div style="font-weight:700;color:#B45309">${boFmt(b.holding)}원</div></div>
        </div>
        <div class="budget-bar-wrap">
          <div class="budget-bar-deducted" style="width:${dPct}%"></div>
          <div class="budget-bar-holding" style="width:${hPct}%"></div>
        </div>
      </div>`;
      })
      .join("")}
  </div>

  <!-- 진행 중 신청 -->
  <div class="bo-card" style="overflow:hidden">
    <div style="padding:16px 20px;border-bottom:1px solid #F3F4F6">
      <span class="bo-section-title">진행 중인 교육 신청</span>
    </div>
    <table class="bo-table">
      <thead><tr><th>과정명</th><th>계정</th><th style="text-align:right">신청액</th><th>유형</th><th>결재 상태</th></tr></thead>
      <tbody>
        ${MOCK_BO_APPLICATIONS.slice(0, 3)
          .map(
            (a) => `
        <tr>
          <td style="font-weight:700">${a.title}</td>
          <td>${boAccountBadge(a.account)}</td>
          <td style="text-align:right;font-weight:900">${boFmt(a.requestAmt)}원</td>
          <td><span class="bo-badge bo-badge-gray">${a.type}</span></td>
          <td>${boPlanStatusBadge(a.status)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>
</div>`;
}
