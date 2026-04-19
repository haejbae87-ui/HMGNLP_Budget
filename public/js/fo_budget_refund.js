// ─── S-11: 승인 후 배정액 축소 + 예산 환불 (fo_budget_refund.js) ──────────────
// PRD: fo_submission_approval.md §3.1, §9.6 / SC-001
// 적용: FO 교육계획 상세에서 approved 상태인 계획의 배정액 하향 조정

/**
 * 배정액 축소 모달 열기
 * @param {string} planId
 */
async function foOpenReduceAllocation(planId) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  // 1) 현재 plan 조회
  const { data: plan, error: planErr } = await sb.from('plans')
    .select('id,title,amount,allocated_amount,account_code,status,submitter_id')
    .eq('id', planId).single();
  if (planErr || !plan) { alert('계획 정보를 불러올 수 없습니다.'); return; }
  if (plan.status !== 'approved') { alert('승인 완료된 계획만 배정액 축소가 가능합니다.'); return; }

  const currentAlloc = Number(plan.allocated_amount || 0);

  // 2) 이미 신청 연결된 금액 확인 (최솟값 제약)
  let usedByApps = 0;
  try {
    const { data: apps } = await sb.from('applications')
      .select('amount')
      .eq('plan_id', planId)
      .in('status', ['saved', 'submitted', 'in_review', 'approved']);
    usedByApps = (apps || []).reduce((s, a) => s + Number(a.amount || 0), 0);
  } catch (e) { console.warn('[S-11] app amount check failed:', e.message); }

  // 3) 모달 생성
  const modal = document.createElement('div');
  modal.id = 'fo-reduce-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML = `
    <div style="background:white;border-radius:20px;width:480px;max-width:100%;padding:32px;box-shadow:0 24px 60px rgba(0,0,0,.25)">
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:900;color:#D97706;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📉 배정액 축소</div>
        <h2 style="font-size:18px;font-weight:900;color:#111827;margin:0 0 4px">${plan.title || '교육계획'}</h2>
        <p style="font-size:12px;color:#9CA3AF;margin:0">승인된 배정액을 하향 조정합니다. 내용은 변경할 수 없습니다.</p>
      </div>

      <div style="background:#F9FAFB;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
          <span style="color:#6B7280;font-weight:700">현재 배정액</span>
          <span style="font-weight:900;color:#002C5F">${currentAlloc.toLocaleString()}원</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
          <span style="color:#6B7280;font-weight:700">신청 연결 금액 (최솟값)</span>
          <span style="font-weight:800;color:${usedByApps > 0 ? '#DC2626' : '#9CA3AF'}">${usedByApps.toLocaleString()}원</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span style="color:#9CA3AF">계획액</span>
          <span style="color:#9CA3AF">${Number(plan.amount||0).toLocaleString()}원</span>
        </div>
      </div>

      <div style="margin-bottom:20px">
        <label style="display:block;font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">새 배정액 (원)</label>
        <input id="fo-reduce-input" type="number" min="${usedByApps}" max="${currentAlloc - 1}"
          value="${usedByApps}" step="10000"
          style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:10px;font-size:16px;font-weight:900;color:#111827;box-sizing:border-box;outline:none"
          oninput="foUpdateReducePreview(${currentAlloc})"
          onfocus="this.style.borderColor='#002C5F'" onblur="this.style.borderColor='#E5E7EB'">
        <div id="fo-reduce-preview" style="margin-top:8px;font-size:12px;color:#059669;font-weight:700"></div>
        ${usedByApps > 0 ? `<div style="margin-top:6px;font-size:11px;color:#DC2626">⚠️ 연결된 신청 금액(${usedByApps.toLocaleString()}원) 미만으로 축소할 수 없습니다.</div>` : ''}
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('fo-reduce-modal').remove()"
          style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:700;color:#6B7280;cursor:pointer">
          취소
        </button>
        <button onclick="foConfirmReduceAllocation('${planId}', ${currentAlloc}, ${usedByApps})"
          style="padding:10px 24px;border-radius:10px;border:none;background:linear-gradient(135deg,#D97706,#B45309);color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(180,83,9,.3)">
          📉 축소 확정
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  foUpdateReducePreview(currentAlloc);
}

/**
 * 입력값 실시간 미리보기
 */
function foUpdateReducePreview(currentAlloc) {
  const input = document.getElementById('fo-reduce-input');
  const preview = document.getElementById('fo-reduce-preview');
  if (!input || !preview) return;
  const newVal = Number(input.value || 0);
  const diff = currentAlloc - newVal;
  if (diff <= 0) {
    preview.textContent = '';
    preview.style.color = '#9CA3AF';
    return;
  }
  preview.textContent = `💰 통장으로 ${diff.toLocaleString()}원 환불 예정`;
  preview.style.color = '#059669';
}

/**
 * 배정액 축소 확정 처리
 */
async function foConfirmReduceAllocation(planId, currentAlloc, usedByApps) {
  const input = document.getElementById('fo-reduce-input');
  if (!input) return;
  const newAlloc = Number(input.value || 0);

  // 검증
  if (isNaN(newAlloc) || newAlloc < 0) { alert('유효한 금액을 입력하세요.'); return; }
  if (newAlloc >= currentAlloc) { alert('새 배정액은 현재 배정액보다 낮아야 합니다.'); return; }
  if (newAlloc < usedByApps) {
    alert(`❌ 이미 신청에 연결된 금액(${usedByApps.toLocaleString()}원)보다 낮게 축소할 수 없습니다.`);
    return;
  }

  const diff = currentAlloc - newAlloc;
  if (!confirm(`배정액을 ${currentAlloc.toLocaleString()}원 → ${newAlloc.toLocaleString()}원으로 축소합니다.\n${diff.toLocaleString()}원이 통장으로 환불됩니다.\n계속하시겠습니까?`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  try {
    const now = new Date().toISOString();

    // 1) plans.allocated_amount 업데이트
    const { error: planErr } = await sb.from('plans')
      .update({ allocated_amount: newAlloc, updated_at: now })
      .eq('id', planId);
    if (planErr) throw planErr;

    // 2) 통장 환불: bankbooks.used_amount -= diff
    const { data: plan } = await sb.from('plans')
      .select('account_code,submitter_id').eq('id', planId).single();
    if (plan && plan.account_code) {
      const tenantId = typeof currentPersona !== 'undefined' ? currentPersona.tenantId : 'HMC';
      const { data: bk } = await sb.from('bankbooks')
        .select('id,used_amount,current_balance')
        .eq('tenant_id', tenantId)
        .eq('account_code', plan.account_code)
        .eq('status', 'active')
        .order('current_balance', { ascending: false })
        .limit(1).single();
      if (bk) {
        await sb.from('bankbooks').update({
          used_amount: Math.max(0, Number(bk.used_amount || 0) - diff),
          updated_at: now
        }).eq('id', bk.id);
      }
    }

    // 3) 모달 닫기 + UI 갱신
    document.getElementById('fo-reduce-modal')?.remove();
    alert(`✅ 배정액이 ${newAlloc.toLocaleString()}원으로 축소되었습니다.\n${diff.toLocaleString()}원이 통장에 환불되었습니다.`);

    // 계획 상세 갱신
    if (typeof viewPlanDetail === 'function') {
      viewPlanDetail(planId);
    } else if (typeof renderPlans === 'function') {
      renderPlans();
    }
  } catch (err) {
    alert('❌ 처리 실패: ' + err.message);
    console.error('[S-11] foConfirmReduceAllocation 실패:', err);
  }
}