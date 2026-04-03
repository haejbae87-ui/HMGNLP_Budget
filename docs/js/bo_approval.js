// ─── 📥 나의 운영 업무 (My Operations) ──────────────────────────────────────
// 정책 기반 결재 자동 라우팅 — 단계별 승인함: 계획승인대기 / 신청승인대기 / 결과정산대기

let _myOpsTab = 'plan';

function renderMyOperations() {
  const el = document.getElementById('bo-content');
  try {
    const persona = boCurrentPersona;
    const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';
    const activeGroupId = (typeof boGetActiveGroupId === 'function') ? boGetActiveGroupId() : null;

    // 자신이 승인자인 정책 (격리그룹 기준 필터 우선)
    const myPolicies = SERVICE_POLICIES.filter(p => {
      // 격리그룹 필터
      if (activeGroupId && p.domainId && p.domainId !== activeGroupId) return false;
      if (p.tenantId !== persona.tenantId) return false;
      if (p.approverPersonaKey === personaKey) return true;
      return (p.approvalThresholds || []).some(t => t.approverKey === personaKey);
    });
    const myPolicyIds = myPolicies.map(p => p.id);

    // 패턴별로 분류
    const patternA_PolicyIds = myPolicies.filter(p => (p.processPattern || 'B') === 'A').map(p => p.id);
    const patternAB_PolicyIds = myPolicies.filter(p => ['A', 'B'].includes(p.processPattern || 'B')).map(p => p.id);

    // DB에서 결재 건 조회 (비동기 → 캐시)
    if (!_boApprovalLoaded) {
      _boApprovalLoaded = true;
      _loadBoApprovalData().then(() => renderMyOperations());
      return;
    }
    const allApps = _boDbApps.filter(a => myPolicyIds.includes(a.policyId));
    const allPlans = _boDbPlans.filter(a =>
      patternA_PolicyIds.length > 0 || myPolicies.some(p => (p.flow || '').includes('plan'))
    );

    // 단계별 탭 데이터
    const planItems = _boDbPlans.filter(a => (a.status || '').startsWith('pending'));
    const applyItems = allApps.filter(a => a.type === '신청' || !a.type);
    const resultItems = allApps.filter(a => a.type === '결과보고');

    const pendingPlans = planItems.filter(a => a.status?.startsWith('pending')).length;
    const pendingApply = applyItems.filter(a => a.status?.startsWith('pending')).length;
    const pendingResult = resultItems.filter(a => a.status?.startsWith('pending')).length;
    const pendingAll = pendingPlans + pendingApply + pendingResult;

    const tabs = [
      {
        id: 'plan', icon: '📊', label: '계획 승인 대기', items: planItems, pending: pendingPlans,
        badge: '#059669', note: '패턴 A 서비스의 교육계획 검토 및 승인'
      },
      {
        id: 'apply', icon: '📝', label: '신청 승인 대기', items: applyItems, pending: pendingApply,
        badge: '#1D4ED8', note: '학습자 신청서 검토 및 예산 가점유/정산 승인'
      },
      {
        id: 'result', icon: '📄', label: '결과 정산 대기', items: resultItems, pending: pendingResult,
        badge: '#D97706', note: '교육 완료 후 결과보고 검토 및 실차감 정산'
      },
    ];

    const tabHtml = tabs.map(t => {
      const active = _myOpsTab === t.id;
      return `<div onclick="_myOpsTab='${t.id}';renderMyOperations()"
      style="padding:10px 16px;border-radius:10px;border:1.5px solid ${active ? t.badge : '#E5E7EB'};
        background:${active ? t.badge : 'white'};color:${active ? 'white' : '#6B7280'};
        font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap">
      ${t.icon} ${t.label}
      ${t.pending > 0 ? `<span style="background:${active ? 'rgba(255,255,255,.25)' : '#FEF2F2'};color:${active ? 'white' : '#DC2626'};
        padding:2px 7px;border-radius:99px;font-size:11px;font-weight:900">${t.pending}</span>` :
          `<span style="background:${active ? 'rgba(255,255,255,.2)' : '#F3F4F6'};padding:2px 7px;border-radius:99px;font-size:11px">${t.items.length}</span>`}
    </div>`;
    }).join('');

    const currentTab = tabs.find(t => t.id === _myOpsTab) || tabs[0];
    const currentItems = currentTab.items;

    // 내 담당 정책 배지
    const policyBadges = myPolicies.map(p => {
      const pat = p.processPattern || 'B';
      const PM = { A: '#7C3AED', B: '#1D4ED8', C: '#D97706', D: '#6B7280' };
      const thCnt = (p.approvalThresholds || []).length;
      return `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#F5F3FF;border-radius:8px;font-size:11px">
      <span style="font-weight:900;color:${PM[pat] || '#7C3AED'}">패턴${pat}</span>
      <span style="font-weight:700;color:#374151">${p.name}</span>
      ${thCnt > 0 ? `<span style="color:#9CA3AF">🔑 ${thCnt}구간</span>` : ''}
    </div>`;
    }).join('');

    // 결재 카드 렌더
    const typeStyle = {
      '신청': { bg: '#DBEAFE', c: '#1E40AF' },
      '결과보고': { bg: '#FEF3C7', c: '#92400E' },
      '교육계획': { bg: '#D1FAE5', c: '#065F46' },
    };

    function renderApprovalCard(a) {
      const isPending = a.status?.startsWith('pending');
      const isResult = a.type === '결과보고';
      const isPlan = a.type === '교육계획' || (!a.type && _myOpsTab === 'plan');
      const policy = SERVICE_POLICIES.find(p => p.id === a.policyId);
      const ts = typeStyle[a.type] || (_myOpsTab === 'plan' ? typeStyle['교육계획'] : typeStyle['신청']);

      // 금액별 결재라인 체크 (임계값 맞는 결재자인지)
      let thresholdInfo = '';
      if (policy && (policy.approvalThresholds || []).length > 0 && a.requestAmt) {
        const matched = policy.approvalThresholds.find(t =>
          t.approverKey === personaKey && t.maxAmt >= (a.requestAmt || 0)
        );
        if (matched) {
          thresholdInfo = `<span style="font-size:9px;padding:2px 7px;border-radius:4px;background:#EDE9FE;color:#7C3AED;font-weight:700">🔑 ${(matched.maxAmt / 10000)}만원 구간 담당</span>`;
        }
      }

      return `
<div class="bo-card" style="padding:20px;${!isPending ? 'opacity:0.65' : ''}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${ts.bg};color:${ts.c}">${a.type || (_myOpsTab === 'plan' ? '교육계획' : '신청')}</span>
        ${typeof boAccountBadge !== 'undefined' ? boAccountBadge(a.account) : ''}
        ${policy ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F5F3FF;color:#7C3AED;font-weight:700">⚡ ${policy.name}</span>` : ''}
        ${thresholdInfo}
        ${typeof boPlanStatusBadge !== 'undefined' ? boPlanStatusBadge(a.status) : ''}
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:2px">${a.title}</div>
      <div style="font-size:12px;color:#9CA3AF">${a.team || a.hq || ''} · 신청자: ${a.submitter || a.applicant || ''} · 제출일: ${a.submittedAt || ''}</div>
    </div>
    <div style="text-align:right;min-width:120px">
      ${a.requestAmt !== undefined ? `
      <div style="font-size:11px;color:#9CA3AF;font-weight:700;margin-bottom:2px">신청금액</div>
      <div style="font-size:18px;font-weight:900;color:#002C5F">${typeof boFmt !== 'undefined' ? boFmt(a.requestAmt || a.amount || 0) : ((a.requestAmt || 0).toLocaleString())}원</div>
      ${a.actualAmt !== null && a.actualAmt !== undefined ? `
      <div style="font-size:11px;color:#059669;font-weight:700;margin-top:4px">실 사용: ${typeof boFmt !== 'undefined' ? boFmt(a.actualAmt) : a.actualAmt.toLocaleString()}원</div>` : ''}` : ''}
    </div>
  </div>
  ${isPending ? `
  <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
    <button onclick="myOpsApprove('${a.id}')" class="bo-btn-accent">
      ${isResult ? '✅ 정산 승인 (실차감)' : isPlan ? '✅ 계획 승인' : '✅ 신청 승인'}
    </button>
    <button onclick="myOpsReject('${a.id}')" style="border:1.5px solid #EF4444;color:#EF4444;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">반려</button>
    ${!isResult && !isPlan ? `<button onclick="myOpsCancel('${a.id}')" style="border:1.5px solid #9CA3AF;color:#9CA3AF;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">환원</button>` : ''}
  </div>` : `<div style="margin-top:10px;font-size:12px;font-weight:700;color:#9CA3AF;text-align:right">처리 완료</div>`}
</div>`;
    }

    const appCards = currentItems.length === 0
      ? `<div style="padding:50px;text-align:center;color:#9CA3AF">
        <div style="font-size:36px;margin-bottom:8px">📭</div>
        <div style="font-weight:700;font-size:14px">${currentTab.label} 항목이 없습니다</div>
        <div style="font-size:12px;margin-top:6px;color:#D1D5DB">${currentTab.note}</div>
       </div>`
      : currentItems.map(renderApprovalCard).join('');

    el.innerHTML = `
<div class="bo-fade">
  ${typeof boIsolationGroupBanner === 'function' ? boIsolationGroupBanner() : ''}
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">📥 나의 운영 업무</h1>
      <p class="bo-page-sub">내가 승인자로 등록된 정책의 결재 대기건이 단계별로 자동 표시됩니다</p>
    </div>
    ${pendingAll > 0 ? `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:12px 18px;text-align:center">
      <div style="font-size:24px;font-weight:900;color:#B45309">${pendingAll}</div>
      <div style="font-size:11px;font-weight:700;color:#92400E">전체 대기</div>
    </div>` : ''}
  </div>

  <!-- 내 담당 정책 -->
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px">내 담당 정책 (${myPolicies.length}개)</div>
    ${myPolicies.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${policyBadges}</div>`
        : `<div style="padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-size:12px;color:#991B1B">
          현재 이 담당자가 승인자로 등록된 정책이 없습니다. 서비스 정책 관리에서 승인자를 지정해주세요.
         </div>`}
  </div>

  <!-- 단계별 탭 -->
  <div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap">${tabHtml}</div>
  <div style="margin-bottom:16px;padding:10px 14px;background:#F9FAFB;border-radius:8px;font-size:11px;color:#6B7280">
    💡 ${currentTab.note}
  </div>

  <!-- 결재 카드 리스트 -->
  <div style="display:flex;flex-direction:column;gap:12px">${appCards}</div>
</div>`;
  } catch (err) {
    console.error('[renderMyOperations] 렌더링 에러:', err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>📥 교육신청 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_boApprovalLoaded=false;renderMyOperations()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}

async function myOpsApprove(id) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  // 계획인지 신청인지 판별
  const isPlan = _boDbPlans.some(x => x.id === id);
  const item = isPlan
    ? _boDbPlans.find(x => x.id === id)
    : _boDbApps.find(x => x.id === id);
  if (!item) return;

  const isResult = item.type === '결과보고';
  const newStatus = isResult ? 'completed' : 'approved';
  item.status = newStatus;

  // DB 업데이트
  if (sb) {
    try {
      const table = isPlan ? 'plans' : 'applications';
      const { error } = await sb.from(table).update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      console.log(`[BO Approve] ${id} → ${newStatus}`);
    } catch (err) {
      console.error('[BO Approve] DB 업데이트 실패:', err.message);
    }
  }
  renderMyOperations();
}
async function myOpsReject(id) {
  const r = prompt('반려 사유를 입력하세요:');
  if (!r) return;
  const isPlan = _boDbPlans.some(x => x.id === id);
  const item = isPlan ? _boDbPlans.find(x => x.id === id) : _boDbApps.find(x => x.id === id);
  if (item) item.status = 'rejected';

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      const table = isPlan ? 'plans' : 'applications';
      const { error } = await sb.from(table).update({ status: 'rejected' }).eq('id', id);
      if (error) throw error;
      console.log(`[BO Reject] ${id} → rejected: ${r}`);
    } catch (err) {
      console.error('[BO Reject] DB 업데이트 실패:', err.message);
    }
  }
  renderMyOperations();
}
async function myOpsCancel(id) {
  if (!confirm('가점유 예산을 즉시 환원하시겠습니까?')) return;
  const item = _boDbApps.find(x => x.id === id);
  if (item) item.status = 'cancelled';

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      const { error } = await sb.from('applications').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      console.log(`[BO Cancel] ${id} → cancelled`);
    } catch (err) {
      console.error('[BO Cancel] DB 업데이트 실패:', err.message);
    }
  }
  renderMyOperations();
}
