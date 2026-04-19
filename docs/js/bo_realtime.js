// ─── bo_realtime.js — S-13: BO Realtime 상신 알림 ───────────────────────────
// FO에서 submission_documents에 상신 문서가 INSERT되면 BO에 토스트 알림 표시
// 의존성: getSB(), boCurrentPersona, _boShowToast (bo_plan_mgmt.js), boCurrentMenu

let _boRealtimeChannel = null;

/**
 * Supabase Realtime 구독 시작
 * - tenant_id 기준으로 자기 회사 상신 문서만 수신
 * - 페르소나 전환 시 _boStartRealtimeAlerts() 재호출로 채널 재구독
 */
function _boStartRealtimeAlerts() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { console.warn('[S-13] Supabase 클라이언트 없음 — Realtime 구독 건너뜀'); return; }

  // 중복 구독 방지
  if (_boRealtimeChannel) {
    sb.removeChannel(_boRealtimeChannel);
    _boRealtimeChannel = null;
  }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  _boRealtimeChannel = sb
    .channel('bo-submission-alerts-' + tenantId)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'submission_documents',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const doc = payload.new || {};
        if (!doc.id) return;

        // 문서 타입 한국어 레이블
        const typeLabel = {
          plan:        '교육계획',
          application: '교육신청',
          result:      '결과보고',
        }[doc.doc_type] || doc.doc_type || '문서';

        const submitter  = doc.submitter_name || doc.submitted_by || '학습자';
        const orgName    = doc.org_name || doc.account_code || '';
        const orgSuffix  = orgName ? ` (${orgName})` : '';
        const msg        = `[신규 상신] ${typeLabel} \u2014 ${submitter}${orgSuffix}`;

        // 토스트 표시 (_boShowToast: bo_plan_mgmt.js에 정의)
        if (typeof _boShowToast === 'function') {
          _boShowToast(msg, 'info');
        } else {
          console.info('[S-13 Realtime]', msg);
        }

        // 현재 결재 화면이면 자동 새로고침
        if (typeof boCurrentMenu !== 'undefined' && boCurrentMenu === 'my-operations') {
          if (typeof _boApprovalLoaded !== 'undefined') _boApprovalLoaded = false;
          if (typeof renderMyOperations === 'function') {
            setTimeout(renderMyOperations, 300);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[S-13] BO Realtime 구독 시작 — tenant:', tenantId);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[S-13] Realtime 채널 오류 — Realtime이 활성화되어 있는지 확인하세요.');
      }
    });
}

/** 구독 해제 (페이지 전환 또는 페르소나 전환 시 활용) */
function _boStopRealtimeAlerts() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && _boRealtimeChannel) {
    sb.removeChannel(_boRealtimeChannel);
    _boRealtimeChannel = null;
    console.log('[S-13] BO Realtime 구독 해제');
  }
}

// ── 자동 시작: DOMContentLoaded 이후 1000ms 지연 (Supabase + 페르소나 초기화 대기) ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_boStartRealtimeAlerts, 1000));
} else {
  setTimeout(_boStartRealtimeAlerts, 1000);
}
