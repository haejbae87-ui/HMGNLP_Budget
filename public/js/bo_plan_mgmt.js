// ─── 3 Depth: 교육계획 관리 (DB 연동) ──────────────────────────────────────
let _boPlanMgmtData = null;

async function renderBoPlanMgmt() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  // DB에서 계획 조회 (plans 테이블)
  if (!_boPlanMgmtData && sb) {
    try {
      const { data, error } = await sb.from('plans').select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      _boPlanMgmtData = data || [];
    } catch (err) {
      console.error('[renderBoPlanMgmt] DB 조회 실패:', err.message);
      _boPlanMgmtData = [];
    }
  }

  // DB 미연결 시 MOCK 폴백
  if (!_boPlanMgmtData) {
    _boPlanMgmtData = typeof MOCK_BO_PLANS !== 'undefined' ? MOCK_BO_PLANS : [];
  }

  try {
    const plans = _boApplyEduFilter(_boPlanMgmtData);
    const canApprove = ['platform_admin', 'tenant_global_admin', 'total_general', 'total_rnd', 'hq_general', 'center_rnd'].includes(boCurrentPersona.role);

    const rows = plans.map((pl, idx) => {
      const amt = Number(pl.amount || pl.planAmount || 0);
      const status = pl.status || 'pending';
      const statusBadge = typeof boPlanStatusBadge === 'function' ? boPlanStatusBadge(status) :
        `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${status === 'approved' ? '#D1FAE5' : status === 'rejected' ? '#FEE2E2' : '#FEF3C7'};color:${status === 'approved' ? '#059669' : status === 'rejected' ? '#DC2626' : '#B45309'};font-weight:800">${status === 'approved' ? '승인' : status === 'rejected' ? '반려' : '대기'}</span>`;
      const safeId = String(pl.id || '').replace(/'/g, "\\'");
      return `
      <tr>
        <td><code style="font-size:11px;background:#F3F4F6;padding:2px 6px;border-radius:4px">${pl.id}</code></td>
        <td>
          <div style="font-weight:700;font-size:13px">${pl.team || pl.dept || pl.applicant_name || ''}</div>
          <div style="font-size:11px;color:#9CA3AF">${pl.hq || pl.center || ''}</div>
        </td>
        <td>
          <div style="font-weight:700">${pl.title || pl.edu_name || pl.name || ''}</div>
          <div style="font-size:11px;color:#9CA3AF">상신자: ${pl.submitter || pl.applicant_name || ''}</div>
        </td>
        <td>${typeof boAccountBadge === 'function' ? boAccountBadge(pl.account || pl.account_code || '') : (pl.account_code || '')}</td>
        <td style="text-align:right;font-weight:900">${amt.toLocaleString()}원</td>
        <td style="font-size:12px;color:#6B7280">${(pl.submittedAt || pl.created_at || '').slice(0, 10)}</td>
        <td>${statusBadge}</td>
        ${canApprove ? `
        <td style="text-align:center">
          ${status === 'pending' || status === 'pending_approval' ? `
          <div style="display:flex;gap:6px;justify-content:center">
            <button onclick="boPlanApprove('${safeId}')" class="bo-btn-accent bo-btn-sm">승인</button>
            <button onclick="boPlanReject('${safeId}')" class="bo-btn-sm" style="border:1px solid #EF4444;color:#EF4444;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">반려</button>
          </div>` : '<span style="font-size:12px;color:#9CA3AF">처리완료</span>'}
        </td>` : ''}
      </tr>`;
    }).join('');

    el.innerHTML = `
    <div class="bo-fade">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h1 class="bo-page-title">📋 교육계획 관리</h1>
          <p class="bo-page-sub">${canApprove ? '교육계획 검토 및 승인' : '교육계획 수립 및 상신'}</p>
        </div>
        <button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary">🔄 새로고침</button>
      </div>

      ${typeof _boEduFilterBar === 'function' ? _boEduFilterBar('renderBoPlanMgmt') : ''}

      <div class="bo-card" style="overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between">
          <span class="bo-section-title">교육계획 목록 (${plans.length}건)</span>
          <span style="font-size:12px;color:#9CA3AF">승인 대기: <strong style="color:#1D4ED8">${plans.filter(p => p.status === 'pending' || p.status === 'pending_approval').length}건</strong></span>
        </div>
        ${plans.length > 0 ? `
        <table class="bo-table">
          <thead><tr>
            <th>ID</th><th>제출팀</th><th>계획명</th><th>계정</th>
            <th style="text-align:right">계획액</th><th>제출일</th><th>상태</th>
            ${canApprove ? '<th style="text-align:center">처리</th>' : ''}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>` : `
        <div style="padding:60px;text-align:center;color:#9CA3AF">
          <div style="font-size:48px;margin-bottom:10px">📭</div>
          <div style="font-weight:700">교육계획 데이터가 없습니다</div>
          <div style="font-size:12px;margin-top:6px">프론트 오피스에서 교육계획을 수립하면 이 화면에서 조회할 수 있습니다.</div>
        </div>`}
      </div>
    </div>`;
  } catch (err) {
    console.error('[renderBoPlanMgmt] 렌더링 에러:', err);
    el.innerHTML = `<div class="bo-fade" style="padding:40px;text-align:center;color:#EF4444">
      <h2>교육계획 관리 로드 실패</h2>
      <p style="font-size:13px">${err.message}</p>
      <button onclick="_boPlanMgmtData=null;renderBoPlanMgmt()" class="bo-btn-primary" style="margin-top:12px">🔄 재시도</button>
    </div>`;
  }
}

async function boPlanApprove(id) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    await sb.from('plans').update({ status: 'approved' }).eq('id', id);
  }
  _boPlanMgmtData = null;
  renderBoPlanMgmt();
}

async function boPlanReject(id) {
  const reason = prompt('반려 사유를 입력해주세요:');
  if (!reason) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    await sb.from('plans').update({ status: 'rejected', reject_reason: reason }).eq('id', id);
  }
  _boPlanMgmtData = null;
  renderBoPlanMgmt();
}
