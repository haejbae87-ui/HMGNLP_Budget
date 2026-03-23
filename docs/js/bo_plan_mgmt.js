// ─── 3 Depth: 교육계획 관리 ──────────────────────────────────────────────────

function renderBoPlanMgmt() {
  const p = boCurrentPersona;
  const el = document.getElementById('bo-content');

  // 역할에 따라 보이는 계획 필터링
  let plans = MOCK_BO_PLANS;
  if (p.budgetGroup === 'general' && p.role !== 'total_general') {
    plans = plans.filter(pl => pl.group === 'general');
  } else if (p.budgetGroup === 'rnd') {
    plans = plans.filter(pl => pl.group === 'rnd');
  }

  const canApprove = ['total_general','total_rnd','hq_general','center_rnd'].includes(p.role);
  const canSubmit  = ['team_general'].includes(p.role);

  el.innerHTML = `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">교육계획 관리</h1>
      <p class="bo-page-sub">${canApprove ? '교육계획 검토 및 승인' : '교육계획 수립 및 상신'}</p>
    </div>
    ${canSubmit ? `<button class="bo-btn-primary" onclick="alert('교육계획 수립은 프론트(LXP)에서 작성 가능합니다.')">+ 계획 수립</button>` : ''}
  </div>

  <!-- 필터 바 -->
  <div class="bo-card" style="padding:12px 16px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
    <select style="border:1px solid #E5E7EB;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:700;color:#374151">
      <option>전체 계정</option><option>운영계정</option><option>기타계정</option><option>통합(R&D)</option>
    </select>
    <select style="border:1px solid #E5E7EB;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:700;color:#374151">
      <option>전체 상태</option><option>승인 대기</option><option>승인 완료</option><option>반려</option>
    </select>
    <input type="text" placeholder="🔍 계획명 또는 팀 검색..." style="border:1px solid #E5E7EB;border-radius:8px;padding:7px 16px;font-size:13px;flex:1;min-width:200px"/>
  </div>

  <!-- 계획 목록 -->
  <div class="bo-card" style="overflow:hidden;margin-bottom:20px">
    <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between">
      <span class="bo-section-title">교육계획 목록 (${plans.length}건)</span>
      <span style="font-size:12px;color:#9CA3AF">승인 대기: <strong style="color:#1D4ED8">${plans.filter(pl=>pl.status.startsWith('pending')).length}건</strong></span>
    </div>
    <table class="bo-table">
      <thead><tr>
        <th>계획ID</th><th>제출팀</th><th>계획명</th><th>계정</th><th>예산그룹</th>
        <th style="text-align:right">계획액</th><th>제출일</th><th>결재 상태</th>
        ${canApprove ? '<th style="text-align:center">처리</th>' : ''}
      </tr></thead>
      <tbody>
        ${plans.map(pl=>`
        <tr>
          <td><code style="font-size:11px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${pl.id}</code></td>
          <td>
            <div style="font-weight:700;font-size:13px">${pl.team}</div>
            <div style="font-size:11px;color:#9CA3AF">${pl.hq||pl.center||''}</div>
          </td>
          <td>
            <div style="font-weight:700">${pl.title}</div>
            <div style="font-size:11px;color:#9CA3AF">상신자: ${pl.submitter}</div>
            ${pl.rejectReason ? `<div style="font-size:11px;color:#EF4444;margin-top:2px">⚠️ ${pl.rejectReason}</div>` : ''}
          </td>
          <td>${boAccountBadge(pl.account)}</td>
          <td>${boGroupBadge(pl.group)}</td>
          <td style="text-align:right;font-weight:900">${boFmt(pl.amount)}원</td>
          <td style="font-size:12px;color:#6B7280">${pl.submittedAt}</td>
          <td>${boPlanStatusBadge(pl.status)}</td>
          ${canApprove ? `
          <td style="text-align:center">
            <div style="display:flex;gap:6px;justify-content:center">
              ${pl.status.startsWith('pending') ? `
              <button onclick="approvePlan('${pl.id}')" class="bo-btn-accent bo-btn-sm">승인</button>
              <button onclick="rejectPlan('${pl.id}')" class="bo-btn-sm" style="border:1px solid #EF4444;color:#EF4444;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">반려</button>
              ` : `<span style="font-size:12px;color:#9CA3AF">처리완료</span>`}
            </div>
          </td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- 결재 타임라인 -->
  <div class="bo-card" style="padding:20px">
    <div class="bo-section-title" style="margin-bottom:16px">결재 흐름 (BP26-101 예시)</div>
    <div style="display:flex;gap:0;align-items:center">
      ${[
        { step:'팀 상신', who:'조O성 책임', status:'done', date:'2026-01-10' },
        { step:'본부 검토', who:'이O현 매니저', status:'pending', date:'—' },
        { step:'총괄 최종승인', who:'신O남 매니저', status:'wait', date:'—' },
      ].map((s,i,arr)=>`
      <div style="display:flex;align-items:center;flex:1">
        <div style="text-align:center;flex:1">
          <div class="approval-dot ${s.status}" style="margin:0 auto 6px">${s.status==='done'?'✓':i+1}</div>
          <div style="font-size:12px;font-weight:900;color:${s.status==='done'?'#002C5F':s.status==='pending'?'#B45309':'#9CA3AF'}">${s.step}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${s.who}</div>
          <div style="font-size:10px;color:#D1D5DB">${s.date}</div>
        </div>
        ${i<arr.length-1?`<div style="flex:1;height:2px;background:${s.status==='done'?'#007AFF':'#E5E7EB'};max-width:60px;margin:0 4px"></div>`:''}
      </div>`).join('')}
    </div>
  </div>
</div>`;
}

function approvePlan(id) {
  const plan = MOCK_BO_PLANS.find(p => p.id === id);
  if (plan) { plan.status = 'approved'; renderBoPlanMgmt(); }
}
function rejectPlan(id) {
  const reason = prompt('반려 사유를 입력하세요:');
  if (reason) {
    const plan = MOCK_BO_PLANS.find(p => p.id === id);
    if (plan) { plan.status = 'rejected'; plan.rejectReason = reason; renderBoPlanMgmt(); }
  }
}
