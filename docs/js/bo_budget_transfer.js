// ─── bo_budget_transfer.js — GAP-4: 계획 간 예산 이전 (F-007) ────────────────
// approved 상태 계획 A의 allocated_amount 일부를 계획 B로 이전
// 이전 후: A.allocated_amount -= amount / B.allocated_amount += amount
//
// 의존성: getSB(), boCurrentPersona, _boShowToast, renderBoPlanMgmt

/**
 * 예산 이전 모달 열기
 * @param {string} fromPlanId - 이전 출처 계획 ID
 */
async function boOpenBudgetTransfer(fromPlanId) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  // 출처 계획 조회
  const { data: fromPlan, error: fromErr } = await sb.from('education_plans')
    .select('id,edu_name,allocated_amount,account_code,tenant_id')
    .eq('id', fromPlanId).single();
  if (fromErr || !fromPlan) { alert('계획 정보를 불러올 수 없습니다.'); return; }

  const fromAlloc = Number(fromPlan.allocated_amount || 0);
  if (fromAlloc <= 0) { alert('이전 가능한 배정액이 없습니다.'); return; }

  // 같은 테넌트 + 같은 계정의 approved 계획 목록 (출처 제외)
  const { data: targets } = await sb.from('education_plans')
    .select('id,edu_name,allocated_amount,account_code')
    .eq('tenant_id', fromPlan.tenant_id)
    .eq('status', 'approved')
    .eq('account_code', fromPlan.account_code)
    .neq('id', fromPlanId)
    .order('edu_name', { ascending: true });

  _boTransferModal({ fromPlan, fromAlloc, targets: targets || [] });
}

function _boTransferModal({ fromPlan, fromAlloc, targets }) {
  const existing = document.getElementById('bo-transfer-modal');
  if (existing) existing.remove();

  const targetOptions = targets.length > 0
    ? targets.map(t => `
        <option value="${t.id}" data-alloc="${Number(t.allocated_amount||0)}">
          ${t.edu_name || t.id} (현 배정: ${Number(t.allocated_amount||0).toLocaleString()}원)
        </option>`).join('')
    : '<option value="" disabled>이전 가능한 계획이 없습니다</option>';

  const modal = document.createElement('div');
  modal.id = 'bo-transfer-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;
    display:flex;align-items:center;justify-content:center;padding:20px
  `;
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:100%;max-width:500px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#1E3A5F,#0369A1);color:white">
      <div style="font-size:10px;font-weight:700;opacity:.8;margin-bottom:4px">💸 F-007 예산 이전</div>
      <h3 style="margin:0;font-size:18px;font-weight:900">계획 간 예산 이전</h3>
      <p style="margin:6px 0 0;font-size:12px;opacity:.8">배정액 일부를 다른 계획으로 이전합니다</p>
    </div>
    <div style="padding:24px 28px">

      <!-- 출처 계획 정보 -->
      <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;padding:14px 18px;margin-bottom:20px">
        <div style="font-size:11px;font-weight:800;color:#1D4ED8;margin-bottom:4px">📤 이전 출처 계획</div>
        <div style="font-size:14px;font-weight:900;color:#111827">${fromPlan.edu_name || fromPlan.id}</div>
        <div style="font-size:13px;color:#1D4ED8;font-weight:700;margin-top:4px">
          현재 배정액: <strong>${fromAlloc.toLocaleString()}원</strong> · 계정: ${fromPlan.account_code || '-'}
        </div>
      </div>

      <!-- 이전 대상 계획 선택 -->
      <div style="margin-bottom:16px">
        <label style="font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:8px">
          📥 이전 대상 계획 <span style="color:#EF4444">*</span>
        </label>
        <select id="bo-transfer-target"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:600"
          onchange="_boTransferUpdatePreview()">
          <option value="">— 이전할 계획을 선택하세요 —</option>
          ${targetOptions}
        </select>
      </div>

      <!-- 이전 금액 입력 -->
      <div style="margin-bottom:16px">
        <label style="font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:8px">
          이전 금액 <span style="color:#EF4444">*</span>
          <span style="font-size:10px;color:#9CA3AF;font-weight:500;margin-left:8px">최대 ${fromAlloc.toLocaleString()}원</span>
        </label>
        <div style="position:relative">
          <input type="number" id="bo-transfer-amount" min="1" max="${fromAlloc}" step="10000"
            placeholder="0"
            style="width:100%;padding:12px 50px 12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:15px;font-weight:800;box-sizing:border-box"
            oninput="_boTransferUpdatePreview()">
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#6B7280">원</span>
        </div>
      </div>

      <!-- 이전 후 미리보기 -->
      <div id="bo-transfer-preview" style="display:none;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12px">
        <div style="font-weight:800;color:#065F46;margin-bottom:8px">✅ 이전 후 예상</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <div style="color:#6B7280;font-size:11px">출처 계획 잔여 배정</div>
            <div id="bo-transfer-from-after" style="font-weight:900;color:#DC2626;font-size:13px">-</div>
          </div>
          <div>
            <div style="color:#6B7280;font-size:11px">대상 계획 배정 합계</div>
            <div id="bo-transfer-to-after" style="font-weight:900;color:#059669;font-size:13px">-</div>
          </div>
        </div>
      </div>

      <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:20px">
        ⚠️ 이전 후에는 <strong>되돌릴 수 없습니다.</strong> 이전 이력은 BO 감사 로그에 기록됩니다.
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('bo-transfer-modal').remove()"
          style="padding:10px 24px;border-radius:12px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:800;color:#6B7280;cursor:pointer">
          취소
        </button>
        <button id="bo-transfer-confirm-btn" onclick="boExecuteBudgetTransfer('${fromPlan.id}',${fromAlloc})"
          disabled
          style="padding:10px 28px;border-radius:12px;border:none;background:#D1D5DB;color:#9CA3AF;font-size:13px;font-weight:900;cursor:not-allowed">
          💸 이전 확정
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/** 미리보기 업데이트 */
function _boTransferUpdatePreview() {
  const targetSel = document.getElementById('bo-transfer-target');
  const amtInput  = document.getElementById('bo-transfer-amount');
  const preview   = document.getElementById('bo-transfer-preview');
  const fromAfterEl = document.getElementById('bo-transfer-from-after');
  const toAfterEl   = document.getElementById('bo-transfer-to-after');
  const confirmBtn  = document.getElementById('bo-transfer-confirm-btn');

  const targetOpt  = targetSel?.selectedOptions?.[0];
  const targetAlloc = Number(targetOpt?.dataset?.alloc || 0);
  const fromAlloc  = Number(amtInput?.max || 0);
  const transferAmt = Number(amtInput?.value || 0);

  if (!targetOpt?.value || transferAmt <= 0 || transferAmt > fromAlloc) {
    if (preview) preview.style.display = 'none';
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.background = '#D1D5DB'; confirmBtn.style.color = '#9CA3AF'; confirmBtn.style.cursor = 'not-allowed'; }
    return;
  }

  const fromAfter = fromAlloc - transferAmt;
  const toAfter   = targetAlloc + transferAmt;

  if (fromAfterEl) fromAfterEl.textContent = fromAfter.toLocaleString() + '원';
  if (toAfterEl)   toAfterEl.textContent   = toAfter.toLocaleString() + '원';
  if (preview)     preview.style.display   = 'block';
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.style.background = '#0369A1';
    confirmBtn.style.color = 'white';
    confirmBtn.style.cursor = 'pointer';
  }
}

/**
 * 예산 이전 실행
 */
async function boExecuteBudgetTransfer(fromPlanId, fromAlloc) {
  const targetId   = document.getElementById('bo-transfer-target')?.value;
  const transferAmt = Number(document.getElementById('bo-transfer-amount')?.value || 0);

  if (!targetId || transferAmt <= 0) { alert('대상 계획과 이전 금액을 입력해주세요.'); return; }
  if (transferAmt > fromAlloc) { alert(`이전 금액(${transferAmt.toLocaleString()}원)이 배정액(${fromAlloc.toLocaleString()}원)을 초과합니다.`); return; }

  if (!confirm(`${transferAmt.toLocaleString()}원을 선택한 계획으로 이전하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    const now = new Date().toISOString();

    // 1) 출처 계획 배정액 차감
    const { data: fromData } = await sb.from('education_plans')
      .select('allocated_amount').eq('id', fromPlanId).single();
    const newFromAlloc = Math.max(0, Number(fromData?.allocated_amount || 0) - transferAmt);

    const { error: fromErr } = await sb.from('education_plans')
      .update({ allocated_amount: newFromAlloc, updated_at: now }).eq('id', fromPlanId);
    if (fromErr) throw fromErr;

    // 2) 대상 계획 배정액 증가
    const { data: toData } = await sb.from('education_plans')
      .select('allocated_amount').eq('id', targetId).single();
    const newToAlloc = Number(toData?.allocated_amount || 0) + transferAmt;

    const { error: toErr } = await sb.from('education_plans')
      .update({ allocated_amount: newToAlloc, updated_at: now }).eq('id', targetId);
    if (toErr) throw toErr;

    // 3) 이전 이력 기록 (submission_documents 활용 — 감사 로그)
    await sb.from('submission_documents').insert({
      id:              `TRANSFER-${Date.now()}`,
      tenant_id:       boCurrentPersona?.tenantId || 'HMC',
      submission_type: 'bo_budget_transfer',
      submitter_id:    boCurrentPersona?.id || 'system',
      submitter_name:  boCurrentPersona?.name || 'BO담당자',
      title:           `[예산이전] ${fromPlanId} → ${targetId} : ${transferAmt.toLocaleString()}원`,
      doc_type:        'transfer',
      total_amount:    transferAmt,
      status:          'approved',
      submitted_at:    now,
      detail: {
        from_plan_id:    fromPlanId,
        to_plan_id:      targetId,
        transfer_amount: transferAmt,
        from_alloc_before: fromAlloc,
        from_alloc_after:  newFromAlloc,
        to_alloc_after:    newToAlloc,
      },
    }).catch(e => console.warn('[GAP-4] 이전이력 기록 skip:', e.message));

    document.getElementById('bo-transfer-modal')?.remove();

    if (typeof _boShowToast === 'function') {
      _boShowToast(`✅ 예산 이전 완료 — ${transferAmt.toLocaleString()}원 이전됨`, 'success');
    }

    // 계획 목록 새로고침
    if (typeof _boPlanMgmtData !== 'undefined') _boPlanMgmtData = null;
    if (typeof renderBoPlanMgmt === 'function') renderBoPlanMgmt();

  } catch (err) {
    alert('예산 이전 실패: ' + err.message);
  }
}
