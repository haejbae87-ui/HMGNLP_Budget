// ─── fo_realtime.js — PRD#13: FO 배정액 실시간 동기 ──────────────────────────
// BO에서 plans.allocated_amount가 변경되면 FO에 알림 배너 + 자동 새로고침
// 의존성: getSB(), currentPersona, renderMyApplyList (fo_apply_list.js)

let _foRealtimeChannel = null;
let _foPlansRealtimeChannel = null;

// ── FO Realtime 구독 시작 ──────────────────────────────────────────────────
function foStartRealtime() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;

  // 중복 방지
  if (_foRealtimeChannel)    { sb.removeChannel(_foRealtimeChannel);    _foRealtimeChannel = null; }
  if (_foPlansRealtimeChannel) { sb.removeChannel(_foPlansRealtimeChannel); _foPlansRealtimeChannel = null; }

  const tenantId   = (typeof currentPersona !== 'undefined' && currentPersona?.tenantId) || 'HMC';
  const personaId  = (typeof currentPersona !== 'undefined' && currentPersona?.id) || null;

  // ── 채널 1: plans 배정액 변경 감지 (BO → FO 동기)
  _foPlansRealtimeChannel = sb
    .channel('fo-plans-alloc-' + tenantId)
    .on(
      'postgres_changes',
      {
        event:  'UPDATE',
        schema: 'public',
        table:  'plans',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const newRow = payload.new || {};
        const oldRow = payload.old || {};

        // allocated_amount 가 바뀐 경우만 처리
        const newAlloc = Number(newRow.allocated_amount ?? 0);
        const oldAlloc = Number(oldRow.allocated_amount ?? 0);
        if (newAlloc === oldAlloc) return;

        // 본인 계획인지 확인
        const isMyPlan = personaId && (
          newRow.applicant_id === personaId ||
          newRow.submitter_id === personaId
        );

        const diff     = newAlloc - oldAlloc;
        const diffFmt  = diff > 0
          ? `+${diff.toLocaleString()}원`
          : `-${Math.abs(diff).toLocaleString()}원`;
        const planName = newRow.edu_name || newRow.title || '교육계획';

        // 알림 배너 표시
        _foShowAllocBanner(planName, newAlloc, diffFmt, isMyPlan);

        // 본인 계획이면 내 신청목록 자동 갱신
        if (isMyPlan) {
          if (typeof _appsDbLoaded !== 'undefined') _appsDbLoaded = false;
          if (typeof renderMyApplyList === 'function') {
            setTimeout(renderMyApplyList, 300);
          }
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[PRD#13] FO Plans Realtime 구독 시작 — tenant:', tenantId);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[PRD#13] Plans Realtime 채널 오류');
      }
    });

  // ── 채널 2: applications 취소 상태 변경 감지 (GAP-1 연동)
  if (personaId) {
    _foRealtimeChannel = sb
      .channel('fo-apps-status-' + personaId)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'applications',
          filter: `applicant_id=eq.${personaId}`,
        },
        (payload) => {
          const newRow = payload.new || {};
          const oldRow = payload.old || {};

          // refund_status 또는 status 변경 감지
          if (newRow.refund_status !== oldRow.refund_status ||
              newRow.status !== oldRow.status) {

            const label = {
              cancelled: '취소 처리',
              approved:  '승인 완료',
              rejected:  '반려',
            }[newRow.status] || newRow.status;

            const name = newRow.edu_name || '신청 건';
            _foShowStatusBanner(name, label, newRow.status);

            // 내 신청목록 갱신
            if (typeof _appsDbLoaded !== 'undefined') _appsDbLoaded = false;
            if (typeof renderMyApplyList === 'function') {
              setTimeout(renderMyApplyList, 400);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[PRD#13] FO Applications Realtime 구독 — persona:', personaId);
        }
      });
  }
}

// ── FO 배정액 변경 배너 ──────────────────────────────────────────────────
function _foShowAllocBanner(planName, newAlloc, diffFmt, isMyPlan) {
  const id = 'fo-alloc-banner';
  const old = document.getElementById(id);
  if (old) old.remove();

  const bgColor = isMyPlan ? '#EFF6FF' : '#F0FDF4';
  const bdColor = isMyPlan ? '#BFDBFE' : '#BBF7D0';
  const txColor = isMyPlan ? '#1D4ED8' : '#059669';
  const icon    = isMyPlan ? '📬' : '📊';

  const banner = document.createElement('div');
  banner.id = id;
  banner.style.cssText = `
    position:fixed;top:16px;right:16px;z-index:99999;
    background:${bgColor};border:2px solid ${bdColor};border-radius:14px;
    padding:14px 20px;max-width:340px;
    box-shadow:0 8px 32px rgba(0,0,0,.12);
    animation:_foSlideIn .3s ease;
    display:flex;gap:12px;align-items:flex-start;
  `;
  banner.innerHTML = `
    <div style="font-size:22px;margin-top:2px">${icon}</div>
    <div style="flex:1">
      <div style="font-size:12px;font-weight:900;color:${txColor};margin-bottom:2px">
        ${isMyPlan ? '내 교육계획 배정액 변경' : '교육계획 배정액 갱신'}
      </div>
      <div style="font-size:11px;font-weight:700;color:#111827;margin-bottom:4px">${planName}</div>
      <div style="font-size:13px;font-weight:900;color:${txColor}">
        ${newAlloc.toLocaleString()}원
        <span style="font-size:10px;font-weight:700;color:#6B7280;margin-left:6px">(${diffFmt})</span>
      </div>
    </div>
    <button onclick="document.getElementById('fo-alloc-banner')?.remove()"
      style="border:none;background:none;cursor:pointer;color:#9CA3AF;font-size:16px;padding:0;line-height:1">×</button>
  `;
  document.body.appendChild(banner);

  // 애니메이션 CSS 주입 (중복 방지)
  if (!document.getElementById('_foRtStyle')) {
    const s = document.createElement('style');
    s.id = '_foRtStyle';
    s.textContent = `@keyframes _foSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}`;
    document.head.appendChild(s);
  }

  // 5초 후 자동 닫기
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.style.transition = 'opacity .4s';
      el.style.opacity = '0';
      setTimeout(() => el?.remove(), 420);
    }
  }, 5000);
}

// ── FO 상태 변경 배너 (취소/승인/반려) ──────────────────────────────────
function _foShowStatusBanner(planName, label, status) {
  const id = 'fo-status-banner';
  const old = document.getElementById(id);
  if (old) old.remove();

  const config = {
    cancelled: { bg: '#FFF7ED', bd: '#FED7AA', tx: '#C2410C', icon: '🚫' },
    approved:  { bg: '#F0FDF4', bd: '#BBF7D0', tx: '#059669', icon: '✅' },
    rejected:  { bg: '#FEF2F2', bd: '#FECACA', tx: '#DC2626', icon: '❌' },
  }[status] || { bg: '#F3F4F6', bd: '#E5E7EB', tx: '#374151', icon: '📋' };

  const banner = document.createElement('div');
  banner.id = id;
  banner.style.cssText = `
    position:fixed;top:76px;right:16px;z-index:99999;
    background:${config.bg};border:2px solid ${config.bd};border-radius:14px;
    padding:14px 20px;max-width:300px;
    box-shadow:0 8px 32px rgba(0,0,0,.12);
    animation:_foSlideIn .3s ease;
    display:flex;gap:10px;align-items:center;
  `;
  banner.innerHTML = `
    <div style="font-size:20px">${config.icon}</div>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:900;color:${config.tx}">${label}</div>
      <div style="font-size:11px;color:#374151;margin-top:2px">${planName}</div>
    </div>
    <button onclick="document.getElementById('fo-status-banner')?.remove()"
      style="border:none;background:none;cursor:pointer;color:#9CA3AF;font-size:16px;padding:0">×</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el?.remove(), 420); }
  }, 4000);
}

// ── 구독 해제 ──────────────────────────────────────────────────────────────
function foStopRealtime() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  if (_foPlansRealtimeChannel)   { sb.removeChannel(_foPlansRealtimeChannel);   _foPlansRealtimeChannel = null; }
  if (_foRealtimeChannel)        { sb.removeChannel(_foRealtimeChannel);         _foRealtimeChannel = null; }
  console.log('[PRD#13] FO Realtime 구독 해제');
}

// ── 자동 시작: Supabase + 페르소나 초기화 대기 후 구독 ──────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(foStartRealtime, 1200));
} else {
  setTimeout(foStartRealtime, 1200);
}
