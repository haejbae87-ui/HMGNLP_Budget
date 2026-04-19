// ─── fo_cancel.js — GAP-1: 교육신청 취소 요청 (FO 측) ────────────────────────
// 2-step 취소 플로우:
//   1) FO 학습자: 취소 요청 (refund_status = 'requested')
//   2) BO 운영담당자: 취소 승인 → frozen_amount 환원, current_balance 복구
//
// 의존성: getSB(), currentPersona (frontoffice.html 전역)

/**
 * FO 취소 요청 모달 표시
 * @param {string} appId - applications.id
 * @param {string} eduName - 교육명
 * @param {number} amount - 신청 금액
 */
function foRequestCancel(appId, eduName, amount) {
  const existing = document.getElementById('fo-cancel-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'fo-cancel-modal';
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;
    display:flex;align-items:center;justify-content:center;padding:20px
  `;
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="padding:24px 28px;background:linear-gradient(135deg,#7F1D1D,#DC2626);color:white">
      <div style="font-size:10px;font-weight:700;opacity:.8;margin-bottom:4px">⚠️ 취소 요청</div>
      <h3 style="margin:0;font-size:18px;font-weight:900">교육신청 취소 요청</h3>
      <p style="margin:6px 0 0;font-size:12px;opacity:.8">취소 요청 후 운영담당자 승인 시 예산이 환원됩니다</p>
    </div>
    <div style="padding:24px 28px">
      <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;padding:14px 18px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:800;color:#991B1B;margin-bottom:6px">취소 대상</div>
        <div style="font-size:14px;font-weight:900;color:#111827">${eduName || appId}</div>
        <div style="font-size:13px;color:#DC2626;font-weight:700;margin-top:4px">신청 금액: ${(amount||0).toLocaleString()}원</div>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;display:block;margin-bottom:8px">취소 사유 <span style="color:#EF4444">*</span></label>
        <textarea id="fo-cancel-reason" rows="3" placeholder="예) 일정 변경으로 인한 교육 참가 불가..."
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 14px;font-size:13px;resize:none;font-family:inherit;box-sizing:border-box"></textarea>
      </div>
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400E;margin-bottom:20px">
        ℹ️ 취소 요청 후 <strong>운영담당자가 승인</strong>하면 예산(${(amount||0).toLocaleString()}원)이 자동 환원됩니다.<br>
        승인 전까지 취소 요청을 철회할 수 있습니다.
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="document.getElementById('fo-cancel-modal').remove()"
          style="padding:10px 24px;border-radius:12px;border:1.5px solid #E5E7EB;background:white;font-size:13px;font-weight:800;color:#6B7280;cursor:pointer">
          닫기
        </button>
        <button onclick="foSubmitCancelRequest('${appId}',${amount})"
          style="padding:10px 28px;border-radius:12px;border:none;background:#DC2626;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(220,38,38,.3)">
          ⚠️ 취소 요청 확정
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  // 배경 클릭 닫기
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

/**
 * 취소 요청 DB 저장
 */
async function foSubmitCancelRequest(appId, amount) {
  const reason = document.getElementById('fo-cancel-reason')?.value?.trim();
  if (!reason) {
    alert('취소 사유를 입력해주세요.');
    return;
  }

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    const now = new Date().toISOString();
    const { error } = await sb.from('applications').update({
      refund_status:       'requested',
      cancel_reason:       reason,
      cancel_requested_at: now,
    }).eq('id', appId);

    if (error) throw error;

    // submission_documents에도 취소요청 상태 기록 (BO 결재함에 표시용)
    const { data: existingDoc } = await sb.from('submission_documents')
      .select('id')
      .eq('tenant_id', currentPersona?.tenantId || 'HMC')
      .like('title', `%${appId}%`)
      .limit(1);

    const cancelDocId = `CANCEL-${Date.now()}`;
    await sb.from('submission_documents').insert({
      id:               cancelDocId,
      tenant_id:        currentPersona?.tenantId || 'HMC',
      submission_type:  'fo_cancel_request',
      submitter_id:     currentPersona?.id || '',
      submitter_name:   currentPersona?.name || '',
      submitter_org_id: currentPersona?.orgId || null,
      title:            `[취소요청] ${currentPersona?.name || ''} — ${appId}`,
      doc_type:         'cancel',
      total_amount:     amount,
      status:           'pending',
      submitted_at:     now,
      detail: {
        app_id:       appId,
        cancel_reason: reason,
        refund_amount: amount,
      },
    }).catch(e => console.warn('[fo_cancel] 취소문서 생성 skip:', e.message));

    document.getElementById('fo-cancel-modal')?.remove();
    alert('✅ 취소 요청이 접수되었습니다.\n운영담당자 승인 후 예산이 자동 환원됩니다.');

    // 목록 새로고침
    if (typeof _appsDbLoaded !== 'undefined') _appsDbLoaded = false;
    if (typeof renderApply === 'function') renderApply();

  } catch (err) {
    alert('취소 요청 실패: ' + err.message);
  }
}

/**
 * 취소 요청 철회 (BO 승인 전에만 가능)
 */
async function foWithdrawCancelRequest(appId) {
  if (!confirm('취소 요청을 철회하시겠습니까?')) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  try {
    await sb.from('applications').update({
      refund_status:       null,
      cancel_reason:       null,
      cancel_requested_at: null,
    }).eq('id', appId).eq('refund_status', 'requested');
    alert('취소 요청이 철회되었습니다.');
    if (typeof _appsDbLoaded !== 'undefined') _appsDbLoaded = false;
    if (typeof renderApply === 'function') renderApply();
  } catch (err) {
    alert('철회 실패: ' + err.message);
  }
}

/**
 * 신청 카드에 표시할 취소/철회 버튼 HTML 반환
 * @param {object} app - applications row
 */
function foRenderCancelBtn(app) {
  const status      = app.status || '';
  const refundSt    = app.refund_status || null;
  const amount      = Number(app.amount || 0);
  const eduName     = app.edu_name || app.id;
  const safeId      = String(app.id).replace(/'/g, "\\'");
  const safeEduName = (eduName).replace(/'/g, "\\'");

  // 이미 취소됨
  if (status === 'cancelled') {
    return `<span style="font-size:11px;font-weight:700;color:#9CA3AF">✗ 취소완료</span>`;
  }
  // 취소 요청 대기 중
  if (refundSt === 'requested') {
    return `
      <span style="font-size:11px;font-weight:700;color:#D97706;background:#FEF3C7;padding:3px 8px;border-radius:6px">⏳ 취소 승인 대기</span>
      <button onclick="foWithdrawCancelRequest('${safeId}')"
        style="font-size:11px;padding:4px 12px;border-radius:8px;border:1.5px solid #FECACA;background:white;color:#DC2626;cursor:pointer;font-weight:700;margin-left:6px">
        철회
      </button>`;
  }
  // 취소 거부됨
  if (refundSt === 'rejected') {
    return `<span style="font-size:11px;font-weight:700;color:#DC2626;background:#FEF2F2;padding:3px 8px;border-radius:6px">✗ 취소 거부됨</span>`;
  }
  // approved 상태 → 취소 요청 가능
  if (status === 'approved' || status === 'completed' || status === '승인완료') {
    return `
      <button onclick="foRequestCancel('${safeId}','${safeEduName}',${amount})"
        style="font-size:11px;padding:5px 14px;border-radius:8px;border:1.5px solid #FECACA;background:#FEF2F2;color:#DC2626;cursor:pointer;font-weight:800">
        ⚠️ 취소 요청
      </button>`;
  }
  return '';
}
