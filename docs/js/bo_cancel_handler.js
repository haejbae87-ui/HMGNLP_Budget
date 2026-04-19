// ─── bo_cancel_handler.js — GAP-1: 교육신청 취소 승인 (BO 측) ───────────────
// BO 운영담당자/총괄담당자가 FO 취소 요청을 승인하면:
//   1) applications.status      → 'cancelled'
//   2) applications.refund_status → 'approved'
//   3) bankbooks.frozen_amount  -= 취소 금액
//   4) bankbooks.current_balance += 취소 금액 (환원)
//   5) submission_documents(취소문서) → status: 'approved'
//
// 의존성: getSB(), boCurrentPersona, _boShowToast

/**
 * BO 취소 요청 목록 렌더링 (bo_approval.js 내 탭에 삽입)
 */
function renderBoCancelRequests() {
  const el = document.getElementById('alloc-content') || document.getElementById('bo-content');
  if (!el) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<div style="padding:40px;text-align:center;color:#9CA3AF">DB 연결 없음</div>'; return; }

  el.innerHTML = `<div style="padding:20px;text-align:center;color:#6B7280;font-size:13px">⌛ 취소 요청 목록 로딩 중...</div>`;

  sb.from('applications')
    .select('id,edu_name,amount,status,refund_status,cancel_reason,cancel_requested_at,applicant_name,dept,account_code,applicant_org_id')
    .eq('tenant_id', boCurrentPersona?.tenantId || 'HMC')
    .eq('refund_status', 'requested')
    .order('cancel_requested_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) { el.innerHTML = `<div style="padding:40px;text-align:center;color:#EF4444">${error.message}</div>`; return; }

      if (!data || data.length === 0) {
        el.innerHTML = `
          <div style="padding:60px 20px;text-align:center">
            <div style="font-size:40px;margin-bottom:12px">✅</div>
            <div style="font-weight:800;color:#374151;margin-bottom:6px">처리 대기 중인 취소 요청이 없습니다</div>
            <div style="font-size:12px;color:#9CA3AF">FO 학습자가 취소를 요청하면 이 화면에 표시됩니다</div>
          </div>`;
        return;
      }

      el.innerHTML = `
        <div class="bo-fade">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
            <span style="background:#DC2626;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">취소 승인</span>
            <h2 style="margin:0;font-size:16px;font-weight:900">교육신청 취소 요청 처리</h2>
            <span style="font-size:12px;color:#6B7280">— ${data.length}건 대기 중</span>
          </div>
          <div style="display:grid;gap:12px">
            ${data.map(app => _renderCancelCard(app)).join('')}
          </div>
        </div>`;
    });
}

function _renderCancelCard(app) {
  const safeId  = String(app.id).replace(/'/g, "\\'");
  const amount  = Number(app.amount || 0);
  const reqDate = app.cancel_requested_at
    ? new Date(app.cancel_requested_at).toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
    : '-';

  return `
  <div class="bo-card" style="padding:20px;border-left:4px solid #DC2626">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#FEF2F2;color:#DC2626">취소요청</span>
          <span style="font-size:11px;color:#9CA3AF">${reqDate}</span>
        </div>
        <div style="font-weight:900;font-size:14px;color:#111827;margin-bottom:4px">${app.edu_name || app.id}</div>
        <div style="font-size:12px;color:#6B7280;margin-bottom:8px">${app.applicant_name || '-'} · ${app.dept || '-'} · 계정: ${app.account_code || '-'}</div>
        <div style="font-size:13px;font-weight:900;color:#DC2626;margin-bottom:8px">환원 금액: ${amount.toLocaleString()}원</div>
        <div style="background:#F9FAFB;border-radius:8px;padding:8px 12px;font-size:12px;color:#374151">
          <span style="font-weight:700;color:#6B7280">취소 사유: </span>${app.cancel_reason || '-'}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
        <button onclick="boApproveCancelRequest('${safeId}',${amount})"
          style="padding:9px 20px;border-radius:10px;border:none;background:#059669;color:white;font-size:12px;font-weight:900;cursor:pointer;white-space:nowrap">
          ✅ 취소 승인 (예산 환원)
        </button>
        <button onclick="boRejectCancelRequest('${safeId}')"
          style="padding:9px 20px;border-radius:10px;border:1.5px solid #FECACA;background:white;color:#DC2626;font-size:12px;font-weight:700;cursor:pointer">
          ❌ 취소 거부
        </button>
      </div>
    </div>
  </div>`;
}

/**
 * BO: 취소 승인 — frozen_amount 환원 + current_balance 복구
 */
async function boApproveCancelRequest(appId, refundAmount) {
  if (!confirm(`취소를 승인하고 ${refundAmount.toLocaleString()}원을 예산에 환원하시겠습니까?`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    const now = new Date().toISOString();

    // 1) applications 정보 조회
    const { data: appData, error: appErr } = await sb.from('applications')
      .select('id,tenant_id,applicant_org_id,account_code,amount')
      .eq('id', appId).single();
    if (appErr || !appData) throw new Error('신청 정보 조회 실패');

    // 2) applications 상태 업데이트
    const { error: updErr } = await sb.from('applications').update({
      status:           'cancelled',
      refund_status:    'approved',
      cancelled_at:     now,
      cancel_approved_by: boCurrentPersona?.name || 'BO담당자',
      refund_amount:    refundAmount,
    }).eq('id', appId);
    if (updErr) throw updErr;

    // 3) bankbooks frozen_amount 감소 + current_balance 복구
    if (appData.applicant_org_id && refundAmount > 0) {
      const { data: bks } = await sb.from('bankbooks')
        .select('id,frozen_amount,current_balance')
        .eq('tenant_id', appData.tenant_id)
        .eq('org_id', appData.applicant_org_id)
        .eq('status', 'active')
        .limit(1);

      if (bks && bks.length > 0) {
        const bk = bks[0];
        const newFrozen  = Math.max(0, Number(bk.frozen_amount  || 0) - refundAmount);
        const newBalance = Number(bk.current_balance || 0) + refundAmount;

        const { error: bkErr } = await sb.from('bankbooks').update({
          frozen_amount:   newFrozen,
          current_balance: newBalance,
          updated_at:      now,
        }).eq('id', bk.id);
        if (bkErr) console.warn('[GAP-1] bankbook 환원 실패:', bkErr.message);
      }
    }

    // 4) 취소 submission_document 상태 업데이트
    await sb.from('submission_documents').update({
      status:      'approved',
      updated_at:  now,
    }).like('title', `%${appId}%`).eq('doc_type', 'cancel')
      .catch(e => console.warn('[GAP-1] 취소문서 업데이트 skip:', e.message));

    if (typeof _boShowToast === 'function') {
      _boShowToast(`✅ 취소 승인 완료 — ${refundAmount.toLocaleString()}원 예산 환원됨`, 'success');
    }
    renderBoCancelRequests();

  } catch (err) {
    alert('취소 승인 실패: ' + err.message);
  }
}

/**
 * BO: 취소 거부
 */
async function boRejectCancelRequest(appId) {
  const reason = prompt('취소 거부 사유를 입력하세요:');
  if (reason === null) return; // 취소

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;

  try {
    await sb.from('applications').update({
      refund_status: 'rejected',
      cancel_reason: (reason || '') + ' [거부됨]',
    }).eq('id', appId);

    if (typeof _boShowToast === 'function') {
      _boShowToast('취소 요청이 거부되었습니다.', 'error');
    }
    renderBoCancelRequests();
  } catch (err) {
    alert('처리 실패: ' + err.message);
  }
}
