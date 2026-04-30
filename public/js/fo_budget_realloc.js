// ─── FO 예산 재배분 (팀 통장 한도 내 운영계획별 배정액 재조정) ─────────────
// Phase 3: 교육담당자가 팀 통장 한도 내에서 운영계획별 allocated_amount를 재조정
//
// 사용 전제:
//   - 팀 통장(org_budget_bankbooks)에 allocated_amount(배분액)이 존재
//   - 운영계획(plans)에 allocated_amount가 배정되어 있음
//   - 팀 통장 총 배분액을 초과할 수 없음

// ─── 재배분 모달 열기 ────────────────────────────────────────────────────
async function foOpenBudgetRealloc() {
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  const persona = typeof currentPersona !== "undefined" ? currentPersona : null;
  if (!persona) { alert("사용자 정보 없음"); return; }

  const accountCode = typeof _selectedAccountCode !== "undefined" ? _selectedAccountCode : null;
  const fiscalYear = typeof _planYear !== "undefined" ? _planYear : new Date().getFullYear();

  // 1. 내 팀의 운영계획 중 approved/saved 상태만 조회
  let query = sb.from("plans")
    .select("id, edu_name, amount, allocated_amount, status, plan_type, account_code, fiscal_year")
    .eq("tenant_id", persona.tenantId)
    .eq("fiscal_year", fiscalYear)
    .is("deleted_at", null)
    .in("status", ["approved", "saved", "submitted"])
    .in("plan_type", ["operation", "ongoing"])
    .order("edu_name");

  // 계정 필터
  if (accountCode) query = query.eq("account_code", accountCode);

  // 팀/조직 필터 (같은 부서 계획만)
  if (persona.orgId) query = query.eq("applicant_org_id", persona.orgId);
  if (persona.dept) query = query.eq("applicant_dept", persona.dept);

  const { data: plans, error: planErr } = await query;
  if (planErr) { alert("계획 조회 실패: " + planErr.message); return; }
  if (!plans || plans.length === 0) {
    alert("재배분할 운영계획이 없습니다.\n(승인/저장 상태의 운영계획이 필요합니다)");
    return;
  }

  // 2. 팀 통장 배분액 조회 (한도 확인용)
  let teamBudgetLimit = 0;
  try {
    const { data: bankbooks } = await sb.from("org_budget_bankbooks")
      .select("id")
      .eq("tenant_id", persona.tenantId)
      .eq("org_name", persona.dept || persona.teamName || "")
      .or("bb_status.eq.active,bb_status.is.null")
      .is("user_id", null);

    if (bankbooks && bankbooks.length > 0) {
      const bbIds = bankbooks.map(b => b.id);
      const { data: allocs } = await sb.from("budget_allocations")
        .select("allocated_amount")
        .in("bankbook_id", bbIds);
      teamBudgetLimit = (allocs || []).reduce((s, a) => s + Number(a.allocated_amount || 0), 0);
    }
  } catch (e) { console.warn("[Realloc] bankbook query error:", e.message); }

  // 통장 한도가 0이면 대체 계산: 현재 모든 계획의 allocated_amount 합계를 한도로 설정
  if (teamBudgetLimit === 0) {
    teamBudgetLimit = plans.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);
    if (teamBudgetLimit === 0) {
      teamBudgetLimit = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
    }
  }

  // 3. 재배분 모달 렌더링
  _foRenderReallocModal(plans, teamBudgetLimit, fiscalYear, accountCode);
}

// ─── 재배분 모달 UI ──────────────────────────────────────────────────────
function _foRenderReallocModal(plans, budgetLimit, fiscalYear, accountCode) {
  // 기존 모달 제거
  const existingModal = document.getElementById("fo-realloc-modal");
  if (existingModal) existingModal.remove();

  const totalCurrentAlloc = plans.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);

  const planRows = plans.map((p, i) => {
    const alloc = Number(p.allocated_amount || 0);
    const req = Number(p.amount || 0);
    const statusBadge = p.status === "approved"
      ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#D1FAE5;color:#065F46;font-weight:800">✅ 승인</span>'
      : '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#DBEAFE;color:#1D4ED8;font-weight:800">📝 저장</span>';

    return `<tr style="border-top:1px solid #F1F5F9">
      <td style="padding:10px 12px">
        <div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:2px">${p.edu_name || '(미정)'}</div>
        <div style="display:flex;align-items:center;gap:6px">
          ${statusBadge}
          <span style="font-size:10px;color:#9CA3AF">요청 ${_foReallocFmt(req)}원</span>
        </div>
      </td>
      <td style="text-align:right;padding:10px 8px;font-size:12px;font-weight:700;color:#6B7280">
        ${_foReallocFmt(alloc)}원
      </td>
      <td style="padding:10px 8px">
        <div style="position:relative">
          <input type="number" id="realloc-input-${i}" data-plan-id="${p.id}" data-current="${alloc}"
            value="${alloc}" min="0"
            oninput="_foCalcReallocRemain()"
            style="width:120px;border:1.5px solid #E5E7EB;border-radius:8px;padding:7px 30px 7px 10px;font-size:13px;font-weight:700;text-align:right" />
          <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:#9CA3AF">원</span>
        </div>
      </td>
      <td style="text-align:right;padding:10px 8px;font-size:11px;font-weight:600;color:#059669;white-space:nowrap" id="realloc-diff-${i}">—</td>
    </tr>`;
  }).join("");

  const modal = document.createElement("div");
  modal.id = "fo-realloc-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px)";
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:min(640px,94vw);max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.2)">
    <!-- 헤더 -->
    <div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:16px;font-weight:900;color:#111827">💰 운영계획 예산 재배분</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">${fiscalYear}년 · ${accountCode || '전체 계정'} · 팀 통장 한도 내 재조정</div>
      </div>
      <button onclick="document.getElementById('fo-realloc-modal').remove()"
        style="width:32px;height:32px;border-radius:8px;border:1px solid #E5E7EB;background:white;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <!-- 한도 표시 바 -->
    <div id="realloc-limit-bar" style="padding:16px 24px;background:#F0FDF4;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:12px">
      <div>
        <div style="font-size:10px;color:#6B7280;font-weight:700">팀 통장 한도</div>
        <div style="font-weight:900;font-size:18px;color:#1D4ED8">${_foReallocFmt(budgetLimit)}원</div>
      </div>
      <div style="color:#9CA3AF;font-size:18px">−</div>
      <div>
        <div style="font-size:10px;color:#6B7280;font-weight:700">배분 합계</div>
        <div id="realloc-total-val" style="font-weight:900;font-size:18px;color:#374151">${_foReallocFmt(totalCurrentAlloc)}원</div>
      </div>
      <div style="color:#9CA3AF;font-size:18px">=</div>
      <div id="realloc-remain-box" style="background:#D1FAE5;padding:6px 14px;border-radius:10px;border:2px solid #6EE7B7">
        <div style="font-size:10px;color:#059669;font-weight:700">잔여</div>
        <div id="realloc-remain-val" style="font-weight:900;font-size:18px;color:#059669">${_foReallocFmt(budgetLimit - totalCurrentAlloc)}원</div>
      </div>
    </div>

    <!-- 계획별 재배분 테이블 -->
    <div style="padding:0 24px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#F8FAFC">
            <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:800;color:#64748B">운영계획</th>
            <th style="text-align:right;padding:10px 8px;font-size:11px;font-weight:800;color:#64748B">현재 배정</th>
            <th style="text-align:right;padding:10px 8px;font-size:11px;font-weight:800;color:#64748B">변경 배정</th>
            <th style="text-align:right;padding:10px 8px;font-size:11px;font-weight:800;color:#64748B">변동</th>
          </tr>
        </thead>
        <tbody>${planRows}</tbody>
      </table>
    </div>

    <!-- 주의사항 + 확정 버튼 -->
    <div style="padding:16px 24px 20px;border-top:1px solid #E5E7EB">
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:11px;color:#92400E;margin-bottom:12px">
        ⚠️ 팀 통장 한도를 초과할 수 없습니다. 변경 사항은 즉시 반영됩니다.
      </div>
      <button onclick="_foSubmitRealloc(${budgetLimit})"
        style="width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#002C5F,#1D4ED8);color:white;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
        ✅ 재배분 확정
      </button>
    </div>
  </div>`;

  // 모달에 plans 데이터 저장
  modal.dataset.planCount = plans.length;
  modal.dataset.budgetLimit = budgetLimit;

  document.body.appendChild(modal);
  _foCalcReallocRemain();
}

// ─── 실시간 잔액 계산 ────────────────────────────────────────────────────
function _foCalcReallocRemain() {
  const modal = document.getElementById("fo-realloc-modal");
  if (!modal) return;

  const count = Number(modal.dataset.planCount || 0);
  const limit = Number(modal.dataset.budgetLimit || 0);
  let total = 0;

  for (let i = 0; i < count; i++) {
    const input = document.getElementById(`realloc-input-${i}`);
    if (!input) continue;
    const val = Number(input.value || 0);
    const cur = Number(input.dataset.current || 0);
    total += val;

    // 변동 표시
    const diffEl = document.getElementById(`realloc-diff-${i}`);
    if (diffEl) {
      const diff = val - cur;
      if (diff > 0) {
        diffEl.textContent = `+${_foReallocFmt(diff)}원`;
        diffEl.style.color = "#1D4ED8";
      } else if (diff < 0) {
        diffEl.textContent = `${_foReallocFmt(diff)}원`;
        diffEl.style.color = "#EF4444";
      } else {
        diffEl.textContent = "—";
        diffEl.style.color = "#9CA3AF";
      }
    }
  }

  const remain = limit - total;
  const totalEl = document.getElementById("realloc-total-val");
  const remainEl = document.getElementById("realloc-remain-val");
  const remainBox = document.getElementById("realloc-remain-box");

  if (totalEl) totalEl.textContent = _foReallocFmt(total) + "원";
  if (remainEl) {
    remainEl.textContent = _foReallocFmt(remain) + "원";
    remainEl.style.color = remain < 0 ? "#EF4444" : "#059669";
  }
  if (remainBox) {
    remainBox.style.background = remain < 0 ? "#FEE2E2" : "#D1FAE5";
    remainBox.style.borderColor = remain < 0 ? "#FCA5A5" : "#6EE7B7";
  }
}

// ─── 재배분 확정 저장 ────────────────────────────────────────────────────
async function _foSubmitRealloc(budgetLimit) {
  const modal = document.getElementById("fo-realloc-modal");
  if (!modal) return;

  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) { alert("DB 연결 실패"); return; }

  const count = Number(modal.dataset.planCount || 0);
  const now = new Date().toISOString();
  const updates = [];
  let total = 0;

  for (let i = 0; i < count; i++) {
    const input = document.getElementById(`realloc-input-${i}`);
    if (!input) continue;
    const val = Number(input.value || 0);
    const cur = Number(input.dataset.current || 0);
    total += val;

    if (val !== cur) {
      updates.push({ planId: input.dataset.planId, newAmount: val, oldAmount: cur });
    }
  }

  if (updates.length === 0) {
    alert("변경된 항목이 없습니다.");
    return;
  }

  if (total > budgetLimit) {
    alert(`배분 합계(${_foReallocFmt(total)}원)가 팀 통장 한도(${_foReallocFmt(budgetLimit)}원)를 초과합니다.`);
    return;
  }

  if (!confirm(`${updates.length}건의 배정액을 변경합니다.\n계속하시겠습니까?`)) return;

  // DB 업데이트
  let successCount = 0;
  let errors = [];

  for (const u of updates) {
    try {
      const { error } = await sb.from("plans").update({
        allocated_amount: u.newAmount,
        updated_at: now,
      }).eq("id", u.planId);

      if (error) throw error;
      successCount++;
    } catch (e) {
      errors.push(`${u.planId}: ${e.message}`);
    }
  }

  // 결과 알림
  if (errors.length > 0) {
    alert(`${successCount}건 성공, ${errors.length}건 실패\n\n실패 내역:\n${errors.join("\n")}`);
  } else {
    if (typeof showToast === "function") {
      showToast(`✅ ${successCount}건 재배분 완료`, "success");
    } else {
      alert(`✅ ${successCount}건 재배분 완료`);
    }
  }

  // 모달 닫기 + 목록 새로고침
  modal.remove();
  if (typeof renderPlans === "function") {
    // 캐시 초기화 후 재로드
    if (typeof _plansDbLoaded !== "undefined") _plansDbLoaded = false;
    if (typeof _dbMyPlans !== "undefined") _dbMyPlans = [];
    if (typeof _plansDbCache !== "undefined") _plansDbCache = [];
    renderPlans();
  }
}

// ─── 금액 포맷 유틸 ──────────────────────────────────────────────────────
function _foReallocFmt(val) {
  return Number(val || 0).toLocaleString("ko-KR");
}
