// ─── 3 Depth: 교육계획 관리 (DB 연동) ──────────────────────────────────────
let _boPlanMgmtData = null;
let _boPlanDetailView = null;  // 상세 보기 대상 계획

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

  // 상세 뷰 모드
  if (_boPlanDetailView) {
    _renderBoPlanDetail(el, _boPlanDetailView);
    return;
  }

  try {
    const plans = _boApplyEduFilter(_boPlanMgmtData);
    const canApprove = ['platform_admin', 'tenant_global_admin', 'total_general', 'total_rnd', 'hq_general', 'center_rnd'].includes(boCurrentPersona.role);

    const rows = plans.map((pl, idx) => {
      const amt = Number(pl.amount || pl.planAmount || 0);
      const status = pl.status || 'pending';
      const statusBadge = typeof boPlanStatusBadge === 'function' ? boPlanStatusBadge(status) :
        `<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:${status === 'approved' ? '#D1FAE5' : status === 'rejected' ? '#FEE2E2' : '#FEF3C7'};color:${status === 'approved' ? '#059669' : status === 'rejected' ? '#DC2626' : '#B45309'};font-weight:800">${status === 'approved' ? '승인' : status === 'rejected' ? '반려' : status === 'draft' ? '임시저장' : '대기'}</span>`;
      const safeId = String(pl.id || '').replace(/'/g, "\\'");
      return `
      <tr onclick="_openBoPlanDetail('${safeId}')" style="cursor:pointer;transition:background .12s"
          onmouseover="this.style.background='#F0F9FF'" onmouseout="this.style.background=''">
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
        <td style="text-align:center" onclick="event.stopPropagation()">
          ${status === 'pending' || status === 'pending_approval' ? `
          <div style="display:flex;gap:6px;justify-content:center">
            <button onclick="boPlanApprove('${safeId}')" class="bo-btn-accent bo-btn-sm">승인</button>
            <button onclick="boPlanReject('${safeId}')" class="bo-btn-sm" style="border:1px solid #EF4444;color:#EF4444;background:#fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer">반려</button>
          </div>` : status === 'draft' ? '<span style="font-size:12px;color:#9CA3AF">—</span>' : '<span style="font-size:12px;color:#9CA3AF">처리완료</span>'}
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

// ─── 상세 뷰 ──────────────────────────────────────────────────────────────
function _openBoPlanDetail(planId) {
  const plan = (_boPlanMgmtData || []).find(p => p.id === planId);
  if (!plan) return;
  _boPlanDetailView = plan;
  renderBoPlanMgmt();
}

function _renderBoPlanDetail(el, plan) {
  const d = plan.detail || {};
  const amt = Number(plan.amount || plan.planAmount || 0);
  const status = plan.status || 'pending';
  const statusLabel = { draft: '임시저장', pending: '결재대기', approved: '승인완료', rejected: '반려', cancelled: '취소', completed: '완료' };
  const statusColor = { draft: '#0369A1', pending: '#D97706', approved: '#059669', rejected: '#DC2626', cancelled: '#9CA3AF', completed: '#059669' };
  const stLabel = statusLabel[status] || status;
  const stColor = statusColor[status] || '#6B7280';
  const canApprove = ['platform_admin', 'tenant_global_admin', 'total_general', 'total_rnd', 'hq_general', 'center_rnd'].includes(boCurrentPersona.role);
  const safeId = String(plan.id || '').replace(/'/g, "\\'");

  el.innerHTML = `
  <div class="bo-fade">
    <div style="margin-bottom:16px">
      <button onclick="_boPlanDetailView=null;renderBoPlanMgmt()" style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">
        ← 목록으로
      </button>
    </div>

    <div class="bo-card" style="overflow:hidden">
      <!-- 헤더 -->
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:${stColor}40;color:white">${stLabel}</span>
          <code style="font-size:10px;background:rgba(255,255,255,.15);color:white;padding:2px 8px;border-radius:4px">${plan.id}</code>
        </div>
        <h2 style="margin:0;font-size:20px;font-weight:900">${plan.title || plan.edu_name || plan.name || '-'}</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">${plan.applicant_name || plan.submitter || ''} · ${plan.team || plan.dept || ''}</p>
      </div>

      <!-- 상세 정보 -->
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:140px">계획명</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${plan.title || plan.edu_name || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상신자</td>
            <td style="padding:12px 0;color:#374151">${plan.applicant_name || plan.submitter || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">소속</td>
            <td style="padding:12px 0;color:#374151">${plan.team || plan.dept || '-'} / ${plan.hq || plan.center || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육목적</td>
            <td style="padding:12px 0;color:#374151">${d.purpose || plan.purpose || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육유형</td>
            <td style="padding:12px 0;color:#374151">${plan.edu_type || d.eduType || '-'} ${d.eduSubType ? '› ' + d.eduSubType : ''}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">예산계정</td>
            <td style="padding:12px 0;color:#374151">${plan.account_code || plan.account || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">계획액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${amt.toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">기간</td>
            <td style="padding:12px 0;color:#374151">${d.startDate || '-'} ~ ${d.endDate || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">제출일</td>
            <td style="padding:12px 0;color:#374151">${(plan.created_at || plan.submittedAt || '').slice(0, 10) || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">상태</td>
            <td style="padding:12px 0">
              <span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:${stColor}15;color:${stColor}">${stLabel}</span>
            </td>
          </tr>
          ${plan.reject_reason ? `
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#DC2626">반려 사유</td>
            <td style="padding:12px 0;color:#DC2626;font-weight:700">${plan.reject_reason}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:12px 0;font-weight:800;color:#6B7280;vertical-align:top">상세 내용</td>
            <td style="padding:12px 0;color:#374151;white-space:pre-wrap">${d.content || plan.content || '-'}</td>
          </tr>
        </table>
      </div>

      <!-- 결재/검토 진행현황 -->
      ${typeof renderApprovalStepper === 'function' ? renderApprovalStepper(status, 'plan') : ''}

      <!-- 산출근거 -->
      ${d.calcGrounds && d.calcGrounds.length > 0 ? `
      <div style="padding:0 28px 24px">
        <h3 style="font-size:13px;font-weight:900;color:#374151;margin-bottom:10px">📐 세부산출근거</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:8px 12px;text-align:left;font-weight:800;color:#6B7280">항목</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">단가</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">수량</th>
              <th style="padding:8px 12px;text-align:right;font-weight:800;color:#6B7280">소계</th>
            </tr>
          </thead>
          <tbody>
            ${d.calcGrounds.map(cg => `
            <tr style="border-top:1px solid #F3F4F6">
              <td style="padding:8px 12px;font-weight:700">${cg.type || cg.label || '-'}</td>
              <td style="padding:8px 12px;text-align:right">${Number(cg.price || 0).toLocaleString()}원</td>
              <td style="padding:8px 12px;text-align:right">${cg.qty || 1}</td>
              <td style="padding:8px 12px;text-align:right;font-weight:900">${(Number(cg.price || 0) * Number(cg.qty || 1)).toLocaleString()}원</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <!-- 액션 -->
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="_boPlanDetailView=null;renderBoPlanMgmt()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 목록으로</button>
        ${canApprove && (status === 'pending' || status === 'pending_approval') ? `
        <button onclick="boPlanReject('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:1.5px solid #FECACA;background:white;color:#DC2626;cursor:pointer">❌ 반려</button>
        <button onclick="boPlanApprove('${safeId}')" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#059669;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,.3)">✅ 승인</button>
        ` : ''}
      </div>
    </div>
  </div>`;
}

async function boPlanApprove(id) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    await sb.from('plans').update({ status: 'approved' }).eq('id', id);
  }
  _boPlanMgmtData = null;
  _boPlanDetailView = null;
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
  _boPlanDetailView = null;
  renderBoPlanMgmt();
}
