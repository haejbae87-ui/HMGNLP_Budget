// ─── FO 결재 페이지 ────────────────────────────────────────────────────────────
// 팀원용 결재함 / 리더용 결재함

// 리더 역할 판별 (pos 기반)
function _isLeaderPersona() {
  const leaderTitles = ['팀장', '실장', '센터장', '본부장', '사업부장'];
  return leaderTitles.some(t => (currentPersona.pos || '').includes(t));
}

// ─── 팀원용 결재함 ────────────────────────────────────────────────────────────
// 내가 신청한 교육의 결재 단계·상태 확인

const _MEMBER_APPROVAL_SAMPLE = [
  {
    id: 'APR-2026-001', title: 'AWS 클라우드 아키텍처 전문가 과정',
    applyDate: '2026-03-15', amount: 1500000, type: '사외교육',
    steps: [
      { role: '팀장', name: '김O훈', status: '승인', date: '2026-03-16' },
      { role: '실장', name: '이O민', status: '승인', date: '2026-03-17' },
      { role: '예산담당', name: '박O영', status: '승인', date: '2026-03-18' },
    ],
    finalStatus: '승인완료',
  },
  {
    id: 'APR-2026-002', title: 'SDV 소프트웨어 개발 세미나',
    applyDate: '2026-03-20', amount: 300000, type: '세미나',
    steps: [
      { role: '팀장', name: '김O훈', status: '승인', date: '2026-03-21' },
      { role: '실장', name: '이O민', status: '대기중', date: null },
      { role: '예산담당', name: '박O영', status: '대기중', date: null },
    ],
    finalStatus: '결재진행중',
  },
  {
    id: 'APR-2026-003', title: '에자일 PM 자격증 취득',
    applyDate: '2026-03-22', amount: 450000, type: '자격증',
    steps: [
      { role: '팀장', name: '김O훈', status: '반려', date: '2026-03-23' },
    ],
    finalStatus: '반려',
    rejectReason: '예산 분기 초과로 반려. 다음 분기에 재신청 바랍니다.',
  },
  {
    id: 'APR-2026-004', title: 'AI/ML 실무 활용 강의',
    applyDate: '2026-03-25', amount: 800000, type: '사외교육',
    steps: [
      { role: '팀장', name: '김O훈', status: '대기중', date: null },
      { role: '실장', name: '이O민', status: '대기중', date: null },
      { role: '예산담당', name: '박O영', status: '대기중', date: null },
    ],
    finalStatus: '승인대기',
  },
];

function renderApprovalMember() {
  const STATUS_FINAL = {
    '승인완료':   { color: '#059669', bg: '#F0FDF4', icon: '✅' },
    '결재진행중': { color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
    '반려':       { color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
    '승인대기':   { color: '#6B7280', bg: '#F9FAFB', icon: '🕐' },
  };
  const STEP_STATUS = {
    '승인':   { color: '#059669', bg: '#DCFCE7', icon: '✓' },
    '반려':   { color: '#DC2626', bg: '#FEE2E2', icon: '✕' },
    '대기중': { color: '#9CA3AF', bg: '#F3F4F6', icon: '·' },
  };

  const data = _MEMBER_APPROVAL_SAMPLE;
  const stats = {
    total: data.length,
    approved: data.filter(d => d.finalStatus === '승인완료').length,
    inProgress: data.filter(d => d.finalStatus === '결재진행중' || d.finalStatus === '승인대기').length,
    rejected: data.filter(d => d.finalStatus === '반려').length,
  };

  const cards = data.map(item => {
    const fc = STATUS_FINAL[item.finalStatus] || STATUS_FINAL['승인대기'];
    const stepHtml = item.steps.map((s, i) => {
      const sc = STEP_STATUS[s.status] || STEP_STATUS['대기중'];
      return `
      <div style="display:flex;align-items:center;gap:0">
        ${i > 0 ? `<div style="width:28px;height:1.5px;background:${s.status !== '대기중' ? sc.color : '#E5E7EB'}"></div>` : ''}
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="width:28px;height:28px;border-radius:50%;background:${sc.bg};border:2px solid ${sc.color};
                      display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:${sc.color}">
            ${sc.icon}
          </div>
          <div style="font-size:9px;font-weight:700;color:#6B7280;white-space:nowrap">${s.role}</div>
          <div style="font-size:9px;color:#9CA3AF;white-space:nowrap">${s.name}</div>
          ${s.date ? `<div style="font-size:8px;color:#D1D5DB">${s.date.slice(5)}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return `
    <div style="border-radius:14px;border:1.5px solid ${fc.color}30;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:900;color:#111827;margin-bottom:4px">${item.title}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px">
            <span>📅 신청 ${item.applyDate}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${(item.amount).toLocaleString()}원</span>
          </div>
        </div>
        <span style="flex-shrink:0;font-size:11px;font-weight:900;padding:4px 12px;border-radius:10px;
                     background:${fc.bg};color:${fc.color}">${fc.icon} ${item.finalStatus}</span>
      </div>
      <!-- 결재 단계 -->
      <div style="background:#F9FAFB;border-radius:10px;padding:14px 16px">
        <div style="font-size:10px;font-weight:800;color:#9CA3AF;margin-bottom:10px">결재 단계</div>
        <div style="display:flex;align-items:flex-start;gap:0">${stepHtml}</div>
      </div>
      ${item.rejectReason ? `
      <div style="margin-top:10px;padding:10px 14px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
        ⚠️ 반려 사유: ${item.rejectReason}
      </div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('page-approval-member').innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 팀원용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">팀원용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept} — 내 교육신청의 결재 현황</p>
    </div>
  </div>

  <!-- 통계 카드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
    ${[
      { label:'전체',   val: stats.total,      color:'#002C5F', bg:'#EFF6FF', icon:'📋' },
      { label:'승인완료', val: stats.approved,  color:'#059669', bg:'#F0FDF4', icon:'✅' },
      { label:'진행중', val: stats.inProgress,  color:'#D97706', bg:'#FFFBEB', icon:'⏳' },
      { label:'반려',   val: stats.rejected,    color:'#DC2626', bg:'#FEF2F2', icon:'❌' },
    ].map(s => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`).join('')}
  </div>

  <!-- 결재 목록 -->
  <div>${cards}</div>
</div>`;
}

// ─── 리더용 결재함 ────────────────────────────────────────────────────────────
// 팀원의 교육신청 결재 처리

const _LEADER_PENDING_SAMPLE = [
  {
    id: 'APR-2026-010', applicant: '김O수', dept: '역량혁신팀', pos: '책임',
    title: '리더십 코칭 프로그램 참가',
    applyDate: '2026-03-24', amount: 1200000, type: '사외교육',
    purpose: '개인 직무 사외학습',
    myRole: '팀장 결재',
    urgency: 'normal',
  },
  {
    id: 'APR-2026-011', applicant: '이O진', dept: '역량혁신팀', pos: '매니저',
    title: 'UX 디자인 사고 워크숍',
    applyDate: '2026-03-25', amount: 450000, type: '워크샵',
    purpose: '집합/이러닝 운영',
    myRole: '팀장 결재',
    urgency: 'urgent',
  },
  {
    id: 'APR-2026-012', applicant: '박O연', dept: '역량혁신팀', pos: '책임',
    title: 'AI 프롬프트 엔지니어링 세미나',
    applyDate: '2026-03-26', amount: 300000, type: '세미나',
    purpose: '워크샵/세미나/콘퍼런스 등 운영',
    myRole: '팀장 결재',
    urgency: 'normal',
  },
];

function renderApprovalLeader() {
  // 권한 체크
  if (!_isLeaderPersona()) {
    document.getElementById('page-approval-leader').innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="card p-16 text-center">
        <div style="font-size:48px;margin-bottom:16px">🔒</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">접근 권한이 없습니다</div>
        <div style="font-size:12px;color:#9CA3AF">리더용 결재함은 팀장·실장·센터장·본부장·사업부장만 접근할 수 있습니다.</div>
      </div>
    </div>`;
    return;
  }

  const pending = _LEADER_PENDING_SAMPLE;

  const cards = pending.map(item => {
    const urgBadge = item.urgency === 'urgent'
      ? `<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#FEE2E2;color:#DC2626;margin-left:6px">⚡ 긴급</span>`
      : '';
    return `
    <div style="border-radius:14px;border:1.5px solid #E5E7EB;background:white;padding:18px 20px;margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#1D4ED8;flex-shrink:0">
              ${item.applicant.charAt(0)}
            </div>
            <div>
              <div style="font-size:13px;font-weight:900;color:#374151">${item.applicant} <span style="font-weight:600;color:#9CA3AF">${item.pos}</span></div>
              <div style="font-size:11px;color:#9CA3AF">${item.dept}</div>
            </div>
          </div>
          <div style="font-size:14px;font-weight:900;color:#111827;margin-bottom:4px">${item.title}${urgBadge}</div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:10px;flex-wrap:wrap">
            <span>📅 신청 ${item.applyDate}</span>
            <span>📚 ${item.type}</span>
            <span>💰 ${item.amount.toLocaleString()}원</span>
            <span>🎯 ${item.purpose}</span>
          </div>
        </div>
        <div style="flex-shrink:0;font-size:11px;font-weight:800;padding:4px 12px;border-radius:10px;background:#FFF7ED;color:#C2410C">
          🕐 결재 대기
        </div>
      </div>
      <!-- 결재 액션 -->
      <div style="display:flex;gap:10px;padding-top:14px;border-top:1px solid #F3F4F6">
        <div style="flex:1">
          <textarea id="comment-${item.id}" placeholder="결재 의견 입력 (선택사항)" rows="2"
            style="width:100%;padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <button onclick="_approvalAction('${item.id}','approve')"
            style="padding:8px 20px;border-radius:8px;background:#059669;color:white;font-size:12px;font-weight:900;border:none;cursor:pointer;white-space:nowrap;min-width:80px"
            onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
            ✅ 승인
          </button>
          <button onclick="_approvalAction('${item.id}','reject')"
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
    <div style="font-size:12px;color:#9CA3AF">팀원의 교육신청이 접수되면 여기서 결재할 수 있습니다.</div>
  </div>`;

  document.getElementById('page-approval-leader').innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 결재 › 리더용</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">리더용 결재함</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} ${currentPersona.pos} · ${currentPersona.dept}</p>
    </div>
    <div style="background:#EFF6FF;border-radius:12px;padding:10px 18px;text-align:center">
      <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:2px">결재 대기</div>
      <div style="font-size:28px;font-weight:900;color:#002C5F">${pending.length}<span style="font-size:14px">건</span></div>
    </div>
  </div>

  <div>${pending.length === 0 ? emptyMsg : cards}</div>
</div>`;
}

// 결재 액션 (승인/반려)
function _approvalAction(id, action) {
  const comment = document.getElementById('comment-' + id)?.value || '';
  const actionLabel = action === 'approve' ? '승인' : '반려';
  if (action === 'reject' && !comment.trim()) {
    alert('반려 시 의견을 입력해주세요.');
    return;
  }
  // TODO: 실제 DB 업데이트 연동
  alert(`${actionLabel} 처리 완료\n${comment ? '의견: ' + comment : ''}\n(실제 DB 연동 후 반영됩니다)`);
  renderApprovalLeader();
}
