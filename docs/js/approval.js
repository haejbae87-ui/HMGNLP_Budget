// ─── FO 결재 페이지 (DB 연동) ────────────────────────────────────────────────
// 팀원용 결재함 / 리더용 결재함

// 리더 역할 판별 (pos 기반)
function _isLeaderPersona() {
  const leaderTitles = ['팀장', '실장', '센터장', '본부장', '사업부장'];
  return leaderTitles.some(t => (currentPersona.pos || '').includes(t));
}

// ─── 한글 라벨 변환 ──────────────────────────────────────────────────────────
const _APR_PURPOSE_KR = {
  external_personal: '개인직무 사외학습',
  elearning_class: '이러닝/집합(비대면) 운영',
  conf_seminar: '워크샵/세미나/콘퍼런스 등 운영',
  misc_ops: '기타 운영',
};
const _APR_EDU_TYPE_KR = {
  regular: '정규교육', elearning: '이러닝', class: '집합', live: '라이브',
  academic: '학술 및 연구활동', conf: '학회/컨퍼런스', seminar: '세미나',
  knowledge: '지식자원 학습', book: '도서구입', online: '온라인콘텐츠',
  competency: '역량개발지원', lang: '어학학습비 지원', cert: '자격증 취득지원',
};
function _aprPurpose(k) { return _APR_PURPOSE_KR[k] || k || '-'; }
function _aprEduType(k) { return _APR_EDU_TYPE_KR[k] || k || '-'; }

// ─── 상태 매핑 ───────────────────────────────────────────────────────────────
function _aprStatusLabel(s) {
  const m = {
    draft: '작성중', pending: '결재대기', pending_approval: '결재대기',
    approved: '승인완료', rejected: '반려', cancelled: '취소', completed: '완료',
  };
  return m[s] || s || '결재대기';
}

// ─── DB 캐시 ─────────────────────────────────────────────────────────────────
let _aprMemberLoaded = false;
let _aprMemberData = [];   // plans + applications (내가 신청한 것)
let _aprLeaderLoaded = false;
let _aprLeaderData = [];   // plans + applications (결재대기, 남이 신청한 것)

// ─── 팀원용 결재함 ────────────────────────────────────────────────────────────
// 내가 신청한 교육의 결재 상태 확인 (DB 실시간)

async function renderApprovalMember() {
  const el = document.getElementById('page-approval-member');
  const sb = typeof getSB === 'function' ? getSB() : null;

  // DB 조회 (최초 1회)
  if (sb && !_aprMemberLoaded) {
    _aprMemberLoaded = true;
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;

      // plans 조회 (draft 제외 — 결재함에는 상신된 것만)
      const { data: plans, error: pe } = await sb.from('plans').select('*')
        .eq('applicant_id', pid).eq('tenant_id', tid)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      if (pe) throw pe;

      // applications 조회
      const { data: apps, error: ae } = await sb.from('applications').select('*')
        .eq('applicant_id', pid).eq('tenant_id', tid)
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      if (ae) throw ae;

      // 통합
      _aprMemberData = [
        ...(plans || []).map(p => ({
          _type: 'plan', id: p.id, title: p.edu_name || p.title || '-',
          type: _aprEduType(p.edu_type), purpose: _aprPurpose(p.detail?.purpose),
          amount: Number(p.amount || 0), status: p.status,
          date: (p.created_at || '').slice(0, 10),
          rejectReason: p.reject_reason || null,
        })),
        ...(apps || []).map(a => ({
          _type: 'app', id: a.id, title: a.edu_name || '-',
          type: _aprEduType(a.edu_type), purpose: _aprPurpose(a.detail?.purpose),
          amount: Number(a.amount || 0), status: a.status,
          date: (a.created_at || '').slice(0, 10),
          rejectReason: a.reject_reason || null,
        })),
      ];
    } catch (err) {
      console.error('[renderApprovalMember] DB 조회 실패:', err.message);
      _aprMemberData = [];
    }
  }

  const data = _aprMemberData;

  // 상태별 통계
  const stats = {
    total: data.length,
    approved: data.filter(d => d.status === 'approved').length,
    inProgress: data.filter(d => d.status === 'pending' || d.status === 'pending_approval').length,
    rejected: data.filter(d => d.status === 'rejected').length,
  };

  const STATUS_FINAL = {
    approved: { label: '승인완료', color: '#059669', bg: '#F0FDF4', icon: '✅' },
    pending: { label: '결재대기', color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
    pending_approval: { label: '결재대기', color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
    rejected: { label: '반려', color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
    cancelled: { label: '취소', color: '#9CA3AF', bg: '#F9FAFB', icon: '🚫' },
    completed: { label: '완료', color: '#059669', bg: '#F0FDF4', icon: '✅' },
  };

  const cards = data.map(item => {
    const fc = STATUS_FINAL[item.status] || { label: _aprStatusLabel(item.status), color: '#6B7280', bg: '#F9FAFB', icon: '🕐' };
    const typeBadge = item._type === 'plan'
      ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-left:4px">📋 교육계획</span>'
      : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309;margin-left:4px">📝 교육신청</span>';

    return `
    <div style="border-radius:14px;border:1.5px solid ${fc.color}30;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>
            ${typeBadge}
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 신청 ${item.date}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${item.amount.toLocaleString()}원</span>
            ${item.purpose !== '-' ? `<span>🎯 ${item.purpose}</span>` : ''}
          </div>
        </div>
        <span style="flex-shrink:0;font-size:11px;font-weight:900;padding:4px 12px;border-radius:10px;
                     background:${fc.bg};color:${fc.color}">${fc.icon} ${fc.label}</span>
      </div>
      ${item.rejectReason ? `
      <div style="margin-top:8px;padding:10px 14px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
        ⚠️ 반려 사유: ${item.rejectReason}
      </div>` : ''}
    </div>`;
  }).join('');

  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">결재 내역이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF">교육계획 또는 교육신청을 제출하면 결재 현황을 이 화면에서 확인할 수 있습니다.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 팀원용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">팀원용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept} — 내 교육신청의 결재 현황</p>
    </div>
    <button onclick="_aprMemberLoaded=false;_aprMemberData=[];renderApprovalMember()"
      style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">🔄 새로고침</button>
  </div>

  <!-- 통계 카드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[
      { label: '전체', val: stats.total, color: '#002C5F', bg: '#EFF6FF', icon: '📋' },
      { label: '승인완료', val: stats.approved, color: '#059669', bg: '#F0FDF4', icon: '✅' },
      { label: '결재대기', val: stats.inProgress, color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
      { label: '반려', val: stats.rejected, color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
    ].map(s => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`).join('')}
  </div>

  <!-- 결재 목록 -->
  <div>${data.length === 0 ? emptyMsg : cards}</div>
</div>`;
}

// ─── 리더용 결재함 ────────────────────────────────────────────────────────────
// 같은 테넌트 내 결재대기 문서 (본인 제외) 조회 + 승인/반려 처리

async function renderApprovalLeader() {
  const el = document.getElementById('page-approval-leader');

  // 권한 체크
  if (!_isLeaderPersona()) {
    el.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="card p-16 text-center">
        <div style="font-size:48px;margin-bottom:16px">🔒</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">접근 권한이 없습니다</div>
        <div style="font-size:12px;color:#9CA3AF">리더용 결재함은 팀장·실장·센터장·본부장·사업부장만 접근할 수 있습니다.</div>
      </div>
    </div>`;
    return;
  }

  const sb = typeof getSB === 'function' ? getSB() : null;

  // DB 조회 (최초 1회)
  if (sb && !_aprLeaderLoaded) {
    _aprLeaderLoaded = true;
    try {
      const pid = currentPersona.id;
      const tid = currentPersona.tenantId;
      // 크로스 테넌트: 총괄부서 팀장이면 양쪽 회사 pending 문서 조회
      const ctInfo = typeof getCrossTenantInfo === 'function' ? await getCrossTenantInfo(currentPersona) : null;
      const filterTids = ctInfo?.linkedTids || [tid];

      // plans: pending 상태 + 본인이 아닌 문서
      let plansQ = sb.from('plans').select('*')
        .eq('status', 'pending')
        .neq('applicant_id', pid)
        .order('created_at', { ascending: false });
      if (filterTids.length > 1) plansQ = plansQ.in('tenant_id', filterTids);
      else plansQ = plansQ.eq('tenant_id', tid);
      const { data: plans, error: pe } = await plansQ;
      if (pe) throw pe;

      // applications: pending 상태 + 본인이 아닌 문서
      let appsQ = sb.from('applications').select('*')
        .eq('status', 'pending')
        .neq('applicant_id', pid)
        .order('created_at', { ascending: false });
      if (filterTids.length > 1) appsQ = appsQ.in('tenant_id', filterTids);
      else appsQ = appsQ.eq('tenant_id', tid);
      const { data: apps, error: ae } = await appsQ;
      if (ae) throw ae;

      _aprLeaderData = [
        ...(plans || []).map(p => ({
          _type: 'plan', _table: 'plans', id: p.id,
          applicant: p.applicant_name || '-',
          dept: p.detail?.dept || p.dept || '-',
          title: p.edu_name || p.title || '-',
          type: _aprEduType(p.edu_type),
          purpose: _aprPurpose(p.detail?.purpose),
          amount: Number(p.amount || 0),
          date: (p.created_at || '').slice(0, 10),
          account_code: p.account_code || '',
          tenantId: p.tenant_id || '',
        })),
        ...(apps || []).map(a => ({
          _type: 'app', _table: 'applications', id: a.id,
          applicant: a.applicant_name || '-',
          dept: a.dept || a.detail?.dept || '-',
          title: a.edu_name || '-',
          type: _aprEduType(a.edu_type),
          purpose: _aprPurpose(a.detail?.purpose),
          amount: Number(a.amount || 0),
          date: (a.created_at || '').slice(0, 10),
          account_code: a.account_code || a.detail?.account_code || '',
          tenantId: a.tenant_id || '',
        })),
      ];

      // 결재라인 매칭 필터 — 정책(SERVICE_POLICIES) approvalConfig 기반
      if (typeof SERVICE_POLICIES !== 'undefined' && SERVICE_POLICIES.length > 0) {
        const myPos = currentPersona.pos || '';
        const posToKey = { '팀장': 'team_leader', '실장': 'director', '사업부장': 'division_head', '센터장': 'center_head', '본부장': 'hq_head' };
        const myKey = Object.entries(posToKey).find(([k]) => myPos.includes(k))?.[1] || '';
        _aprLeaderData = _aprLeaderData.filter(item => {
          // 매칭 정책 찾기
          const policy = SERVICE_POLICIES.find(p =>
            p.tenantId === item.tenantId && (p.accountCodes || []).some(c => item.account_code.includes(c))
          );
          if (!policy || !policy.approvalConfig) return true; // 정책 미설정 → 기본 표시
          // 신청 단계 결재라인 확인 (apply 기본)
          const stage = item._type === 'plan' ? 'plan' : 'apply';
          const cfg = policy.approvalConfig[stage];
          if (!cfg || !cfg.thresholds || cfg.thresholds.length === 0) return true; // 구간 미설정 → 기본 표시
          // 금액에 맞는 구간 결재자 매칭
          const sorted = [...cfg.thresholds].sort((a, b) => (a.maxAmt || Infinity) - (b.maxAmt || Infinity));
          const matched = sorted.find(t => t.maxAmt && item.amount <= t.maxAmt) || sorted[sorted.length - 1];
          if (!matched || !matched.approverKey) return true;
          return matched.approverKey === myKey;
        });
      }
    } catch (err) {
      console.error('[renderApprovalLeader] DB 조회 실패:', err.message);
      _aprLeaderData = [];
    }
  }

  const pending = _aprLeaderData;

  const cards = pending.map(item => {
    const typeBadge = item._type === 'plan'
      ? '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#DBEAFE;color:#1D4ED8">📋 교육계획</span>'
      : '<span style="font-size:9px;font-weight:900;padding:2px 6px;border-radius:5px;background:#FEF3C7;color:#B45309">📝 교육신청</span>';
    const tenantBadge = typeof getTenantBadgeHtml === 'function' ? getTenantBadgeHtml(item.tenantId, currentPersona.tenantId) : '';
    const safeId = String(item.id).replace(/'/g, "\\'");
    const safeTable = item._table;

    return `
    <div style="border-radius:14px;border:1.5px solid #E5E7EB;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#1D4ED8;flex-shrink:0">
              ${item.applicant.charAt(0)}
            </div>
            <div>
              <div style="font-size:13px;font-weight:900;color:#374151">${item.applicant}</div>
              <div style="font-size:11px;color:#9CA3AF">${item.dept}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
            <span style="font-size:14px;font-weight:900;color:#111827">${item.title}</span>
            ${typeBadge}${tenantBadge}
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 신청 ${item.date}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${item.amount.toLocaleString()}원</span>
            ${item.purpose !== '-' ? `<span>🎯 ${item.purpose}</span>` : ''}
          </div>
        </div>
        <div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#FFF7ED;color:#C2410C">
          🕐 결재 대기
        </div>
      </div>
      <!-- 결재 액션 -->
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1">
          <textarea id="comment-${safeId}" placeholder="결재 의견 입력 (선택사항)" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalAction('${safeId}','${safeTable}','approve')"
            style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;white-space:nowrap;min-width:80px"
            onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
            ✅ 승인
          </button>
          <button onclick="_approvalAction('${safeId}','${safeTable}','reject')"
            style="padding:8px 20px;border-radius:8px;background:white;color:#DC2626;font-size:12px;font-weight:900;border:1.5px solid #DC2626;cursor:pointer;white-space:nowrap;min-width:80px"
            onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='white'">
            ❌ 반려
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  const emptyMsg = `<div class="card p-16 text-center">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">결재 대기 건이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF">팀원의 교육계획 또는 교육신청이 접수되면 여기서 결재할 수 있습니다.</div>
  </div>`;

  el.innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 리더용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">리더용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} ${currentPersona.pos} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      <button onclick="_aprLeaderLoaded=false;_aprLeaderData=[];renderApprovalLeader()"
        style="padding:8px 16px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">🔄 새로고침</button>
      <div style="background:#EFF6FF;border-radius:12px;padding:10px 18px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px">결재 대기</div>
        <div style="font-size:28px;font-weight:900;color:#002C5F">${pending.length}<span style="font-size:14px">건</span></div>
      </div>
    </div>
  </div>

  <div>${pending.length === 0 ? emptyMsg : cards}</div>
</div>`;
}

// ─── 결재 액션 (승인/반려) — DB 실반영 ───────────────────────────────────────
async function _approvalAction(id, table, action) {
  const comment = document.getElementById('comment-' + id)?.value || '';
  const actionLabel = action === 'approve' ? '승인' : '반려';

  if (action === 'reject' && !comment.trim()) {
    alert('반려 시 의견을 입력해주세요.');
    return;
  }

  if (!confirm(`이 문서를 ${actionLabel} 처리하시겠습니까?`)) return;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  try {
    // 결재 이력 기록 (detail.approval_logs)
    const logEntry = {
      actor: currentPersona.name,
      actor_pos: currentPersona.pos,
      action: action,
      comment: comment || null,
      timestamp: new Date().toISOString(),
    };
    // 기존 detail 조회 후 approval_logs 배열에 추가
    const { data: existing } = await sb.from(table).select('detail').eq('id', id).single();
    const prevDetail = existing?.detail || {};
    const prevLogs = prevDetail.approval_logs || [];
    prevLogs.push(logEntry);

    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      detail: { ...prevDetail, approval_logs: prevLogs },
    };
    if (action === 'reject') {
      updateData.reject_reason = comment;
    }

    const { error } = await sb.from(table).update(updateData).eq('id', id);
    if (error) throw error;

    // 항목 7: 승인 시 예산 차감
    if (action === 'approve') {
      try {
        const { data: doc } = await sb.from(table).select('amount, account_code, tenant_id, applicant_id').eq('id', id).single();
        if (doc && doc.amount && doc.account_code) {
          // 신청자의 org_id 조회
          const { data: user } = await sb.from('users').select('org_id').eq('id', doc.applicant_id).single();
          if (user?.org_id) {
            // bankbook 조회
            const { data: bbs } = await sb.from('org_budget_bankbooks')
              .select('id').eq('org_id', user.org_id).eq('tenant_id', doc.tenant_id);
            // account_id 매칭
            if (bbs && bbs.length > 0) {
              for (const bb of bbs) {
                const { data: alloc } = await sb.from('budget_allocations')
                  .select('id, used_amount').eq('bankbook_id', bb.id).order('created_at', { ascending: false }).limit(1).single();
                if (alloc) {
                  await sb.from('budget_allocations').update({
                    used_amount: Number(alloc.used_amount || 0) + Number(doc.amount),
                  }).eq('id', alloc.id);
                  console.log(`[예산차감] ${doc.amount}원 차감 완료 (alloc ${alloc.id})`);
                  break; // 첫 매칭 bankbook만 차감
                }
              }
            }
          }
        }
      } catch (budgetErr) {
        console.warn('[예산차감] 예산 자동 차감 실패 (비치명적):', budgetErr.message);
      }
    }

    alert(`✅ ${actionLabel} 처리가 완료되었습니다.${comment ? '\n의견: ' + comment : ''}`);

    // 목록 갱신
    _aprLeaderLoaded = false;
    _aprLeaderData = [];
    renderApprovalLeader();

    // 팀원 목록도 갱신 (다른 탭에서 볼 때 반영)
    _aprMemberLoaded = false;
    _aprMemberData = [];

  } catch (err) {
    alert('처리 실패: ' + err.message);
    console.error('[_approvalAction]', err.message);
  }
}
