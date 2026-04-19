// ─── P16: 역할 기반 뷰 모드 헬퍼 ─────────────────────────────────────────────
// PRD: budget_lifecycle.md §3.6 Phase 16 (F-150 ~ F-156)
// 사용처: bo_plan_mgmt.js, bo_allocation.js, bo_budget_history.js, bo_budget_demand.js

// ══════════════════════════════════════════════════════════════════════════════
// F-150: 역할 판별 유틸
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 현재 페르소나의 역할 분류
 * @returns {'global_admin'|'op_manager'|'platform'|'tenant_admin'|'other'}
 */
function boGetRoleClass() {
  const role = boCurrentPersona?.role || '';
  if (['platform_admin'].includes(role)) return 'platform';
  if (['tenant_global_admin'].includes(role)) return 'tenant_admin';
  if (['budget_global_admin', 'total_general', 'total_rnd'].includes(role)) return 'global_admin';
  if (['budget_op_manager', 'hq_general', 'center_rnd'].includes(role)) return 'op_manager';
  return 'other';
}

/** 총괄담당자 이상인지 여부 */
function boIsGlobalAdmin() {
  const rc = boGetRoleClass();
  return ['platform', 'tenant_admin', 'global_admin'].includes(rc);
}

/** 운영담당자 전용인지 여부 */
function boIsOpManager() {
  return boGetRoleClass() === 'op_manager';
}

// ══════════════════════════════════════════════════════════════════════════════
// F-150: 관할 조직 데이터 스코핑
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 관할 조직 필터 목록 반환
 * - 총괄/플랫폼: [] (전체 — 필터 없음)
 * - 운영담당자: persona.vorgIds 기반 관할 그룹 ID 목록
 * @returns {string[]} 허용 그룹 ID 목록 (빈 배열이면 전체)
 */
function boGetMyOrgIds() {
  if (boIsGlobalAdmin()) return []; // 전체
  const groups = boGetMyGroups();
  return groups.map(g => g.id).filter(Boolean);
}

/**
 * Supabase 쿼리에 관할 필터 적용
 * 운영담당자: managedGroups 기반 그룹 ID 필터
 * 총괄/플랫폼: 필터 없음
 *
 * @param {object} query  - Supabase query builder
 * @param {string} field  - 필터 대상 필드명 (예: 'vorg_group_id', 'org_id')
 * @returns {object} 필터 적용된 query
 */
function boApplyOrgScopeFilter(query, field) {
  if (boIsGlobalAdmin()) return query; // 전체 조회
  const myIds = boGetMyOrgIds();
  if (!myIds.length) return query; // 관할 없음 — 빈 결과 방지
  return query.in(field, myIds);
}

/**
 * plans 배열을 관할 조직 기준으로 클라이언트 사이드 필터
 * @param {Array} plans
 * @param {string} [orgField='hq'] - 팀/조직 매칭 필드
 * @returns {Array}
 */
function boFilterPlansByScope(plans, orgField) {
  if (boIsGlobalAdmin()) return plans;
  const myGroups = boGetMyGroups();
  if (!myGroups.length) return [];

  // 관할 그룹의 팀 이름 목록 수집
  const myTeamNames = new Set();
  myGroups.forEach(g => {
    (g.teams || []).forEach(t => {
      if (t.name) myTeamNames.add(t.name);
    });
    if (g.name) myTeamNames.add(g.name);
  });

  return plans.filter(p => {
    const dept = p.detail?.dept || p.team || p.hq || p.center || p.applicant_name || '';
    return [...myTeamNames].some(tn =>
      dept.includes(tn) || tn.includes(dept) || dept === tn
    );
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// F-151: 배정 편집 권한 분기
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 배정액 편집 가능 여부
 * - 총괄: ✅ 전체 편집 가능
 * - 운영: 관할 교육조직 내 팀간 재배분만 가능 (총액 변경 불가)
 */
function boCanEditAllocation() {
  return boIsGlobalAdmin(); // 총괄만 교육조직 총액 변경 가능
}

/**
 * 운영담당자 관할 내 팀간 재배분 가능 여부
 * - 총액 변경은 불가, Δ=0 범위 내 재배분만 가능
 */
function boCanRebalanceInScope() {
  return boIsOpManager();
}

// ══════════════════════════════════════════════════════════════════════════════
// F-152: 시뮬레이션 단계 분기
// ══════════════════════════════════════════════════════════════════════════════

/** 시뮬레이션 최종 확정 권한 (총괄만) */
function boCanSimulate() {
  return boIsGlobalAdmin();
}

/** 1차 조정 버튼 표시 여부 (운영담당자) */
function boCanFirstAdjust() {
  return boIsOpManager();
}

/** 기초·추가 배정 탭 접근 가능 여부 */
function boCanBaseAllocate() {
  return boIsGlobalAdmin();
}

// ══════════════════════════════════════════════════════════════════════════════
// F-153: 검토 대기 탭 — 운영담당자 전용
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 운영담당자 검토 대기 탭 표시 여부
 */
function boShowReviewPendingTab() {
  return boIsOpManager();
}

// ══════════════════════════════════════════════════════════════════════════════
// F-154: 액션 버튼 역할 분기
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 역할에 따라 승인 버튼 라벨/액션 반환
 * @param {'plan'|'application'|'result'} docType
 * @returns {{label: string, newStatus: string, color: string}}
 */
function boGetApproveAction(docType) {
  if (boIsGlobalAdmin()) {
    if (docType === 'result') return { label: '✅ 최종 정산 승인', newStatus: 'approved', color: '#059669' };
    return { label: '✅ 최종 승인', newStatus: 'approved', color: '#059669' };
  }
  // 운영담당자: 1차 검토 완료
  if (docType === 'result') return { label: '📤 정산 검토 완료', newStatus: 'reviewed', color: '#1D4ED8' };
  return { label: '📤 1차 검토 완료', newStatus: 'reviewed', color: '#1D4ED8' };
}

// ══════════════════════════════════════════════════════════════════════════════
// F-155: 역할 뱃지 표시
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 역할 뱃지 HTML (화면 상단 삽입용)
 */
function boRoleModeBadge() {
  const rc = boGetRoleClass();
  const map = {
    platform:     { label: '🖥️ 플랫폼 총괄',  bg: '#7C3AED', c: 'white' },
    tenant_admin: { label: '🏢 테넌트 총괄',  bg: '#1D4ED8', c: 'white' },
    global_admin: { label: '📊 예산 총괄',    bg: '#059669', c: 'white' },
    op_manager:   { label: '🔍 운영 담당',    bg: '#D97706', c: 'white' },
    other:        { label: '👤 일반',         bg: '#6B7280', c: 'white' },
  };
  const m = map[rc] || map.other;
  return `<span class="bo-role-badge" style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;
    background:${m.bg};color:${m.c};font-size:10px;font-weight:900;letter-spacing:.3px">${m.label}</span>`;
}

/**
 * 운영담당자 스코프 배너 (어떤 교육조직 담당인지 표시)
 * bo_plan_mgmt, bo_budget_demand 상단에 표시
 */
function boOpScopeBanner() {
  if (!boIsOpManager()) return '';
  const myGroups = boGetMyGroups();
  if (!myGroups.length) return `
    <div style="padding:10px 16px;background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;margin-bottom:16px;font-size:12px;color:#DC2626;font-weight:700">
      ⚠️ 관할 교육조직이 설정되지 않았습니다. 관리자에게 문의하세요.
    </div>`;

  const groupBadges = myGroups.map(g =>
    `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
      background:${g.color || '#D97706'}18;border:1.5px solid ${g.color || '#D97706'}40;
      color:${g.color || '#92400E'}">${g.name}</span>`
  ).join('');

  return `
    <div style="padding:10px 16px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;
                margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;font-weight:900;color:#92400E;white-space:nowrap">🔍 관할 범위</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${groupBadges}</div>
      <span style="font-size:10px;color:#9CA3AF;margin-left:auto">관할 교육조직 데이터만 표시됩니다</span>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// F-156: 운영담당자 전용 대시보드 위젯
// ══════════════════════════════════════════════════════════════════════════════

/**
 * 운영담당자 전용 대시보드 위젯 렌더링
 * 관할 교육조직의 총예산/팀별 예산/남은예산/쓴예산 + 교육계획→신청→결과 추적
 * @param {string} containerId - 렌더 대상 container ID
 */
async function boRenderOpDashboard(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!boIsOpManager()) {
    el.innerHTML = '';
    return;
  }

  const myGroups = boGetMyGroups();
  if (!myGroups.length) {
    el.innerHTML = `
      <div style="padding:16px;background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:800;color:#DC2626">⚠️ 관할 교육조직 미설정</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">관리자에게 교육조직 담당 설정을 요청하세요.</div>
      </div>`;
    return;
  }

  el.innerHTML = `<div style="padding:16px;background:#FFFBEB;border-radius:12px;margin-bottom:16px;font-size:12px;color:#92400E">
    ⏳ 운영담당자 대시보드 로딩 중...</div>`;

  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) {
    el.innerHTML = '';
    return;
  }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const year = new Date().getFullYear();

  // 관할 그룹 팀 이름 목록
  const myTeamNames = [];
  myGroups.forEach(g => {
    (g.teams || []).forEach(t => { if (t.name) myTeamNames.push(t.name); });
  });

  try {
    // 1. plans 집계 (관할 팀 기준)
    let plans = [];
    const { data: allPlans } = await sb.from('plans')
      .select('amount,allocated_amount,actual_amount,status,team,hq,applicant_name')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', year)
      .is('deleted_at', null);
    plans = (allPlans || []).filter(p => {
      const dept = p.team || p.hq || p.applicant_name || '';
      return myTeamNames.some(tn => dept.includes(tn) || tn.includes(dept));
    });

    // 2. applications 집계
    let apps = [];
    const { data: allApps } = await sb.from('applications')
      .select('amount,status,plan_id')
      .eq('tenant_id', tenantId);
    apps = allApps || [];

    const planTotal   = plans.reduce((s, p) => s + Number(p.amount || 0), 0);
    const allocTotal  = plans.reduce((s, p) => s + Number(p.allocated_amount || 0), 0);
    const actualTotal = plans.reduce((s, p) => s + Number(p.actual_amount || 0), 0);
    const pendingCnt  = plans.filter(p => ['pending','pending_approval','in_review'].includes(p.status)).length;
    const approvedCnt = plans.filter(p => p.status === 'approved').length;

    const appPlanIds = new Set(plans.map(p => p.id));
    const myApps = apps.filter(a => appPlanIds.has(a.plan_id));
    const appTotal     = myApps.reduce((s, a) => s + Number(a.amount || 0), 0);
    const approvedApps = myApps.filter(a => ['approved','completed'].includes(a.status))
                               .reduce((s, a) => s + Number(a.amount || 0), 0);

    const fmt = n => {
      if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + '억';
      if (Math.abs(n) >= 10000) return (n / 10000).toFixed(0) + '만원';
      return n.toLocaleString() + '원';
    };

    const remainBudget = allocTotal - actualTotal;
    const execRate = allocTotal > 0 ? Math.round((actualTotal / allocTotal) * 100) : 0;
    const execColor = execRate >= 90 ? '#DC2626' : execRate >= 70 ? '#D97706' : '#059669';

    const groupNames = myGroups.map(g => g.name).join(', ');

    el.innerHTML = `
    <div style="border:2px solid #FDE68A;border-radius:16px;overflow:hidden;margin-bottom:20px">
      <!-- 헤더 -->
      <div style="padding:14px 20px;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);border-bottom:1px solid #FDE68A;
                  display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:13px;font-weight:900;color:#92400E">🔍 내 관할 예산 현황</div>
          <div style="font-size:11px;color:#B45309;margin-top:2px">${groupNames} · ${year}년</div>
        </div>
        <span style="font-size:10px;padding:3px 10px;border-radius:20px;background:#F59E0B;color:white;font-weight:800">운영담당자 전용</span>
      </div>

      <!-- KPI 카드 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0;background:#FFFBEB">
        <div style="padding:14px 16px;text-align:center;border-right:1px solid #FDE68A">
          <div style="font-size:10px;font-weight:700;color:#B45309;margin-bottom:4px">📝 계획액</div>
          <div style="font-size:18px;font-weight:900;color:#92400E">${fmt(planTotal)}</div>
          <div style="font-size:10px;color:#9CA3AF">${plans.length}건</div>
        </div>
        <div style="padding:14px 16px;text-align:center;border-right:1px solid #FDE68A">
          <div style="font-size:10px;font-weight:700;color:#1D4ED8;margin-bottom:4px">💰 배정액</div>
          <div style="font-size:18px;font-weight:900;color:#1D4ED8">${fmt(allocTotal)}</div>
          <div style="font-size:10px;color:#9CA3AF">검토 대기 ${pendingCnt}건</div>
        </div>
        <div style="padding:14px 16px;text-align:center;border-right:1px solid #FDE68A">
          <div style="font-size:10px;font-weight:700;color:#D97706;margin-bottom:4px">💳 실사용액</div>
          <div style="font-size:18px;font-weight:900;color:#D97706">${fmt(actualTotal)}</div>
          <div style="font-size:10px;color:${execColor};font-weight:700">집행률 ${execRate}%</div>
        </div>
        <div style="padding:14px 16px;text-align:center">
          <div style="font-size:10px;font-weight:700;color:${remainBudget >= 0 ? '#059669' : '#DC2626'};margin-bottom:4px">📦 잔액</div>
          <div style="font-size:18px;font-weight:900;color:${remainBudget >= 0 ? '#059669' : '#DC2626'}">${fmt(remainBudget)}</div>
          <div style="font-size:10px;color:#9CA3AF">승인 ${approvedCnt}건</div>
        </div>
      </div>

      <!-- 진행 바 -->
      <div style="padding:10px 20px;background:white;border-top:1px solid #FDE68A">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap">배정 대비 집행률</span>
          <div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden">
            <div style="width:${Math.min(execRate, 100)}%;height:100%;background:${execColor};border-radius:3px;transition:width .5s"></div>
          </div>
          <span style="font-size:11px;font-weight:900;color:${execColor};white-space:nowrap">${execRate}%</span>
        </div>
      </div>

      <!-- 교육신청 현황 -->
      <div style="padding:10px 20px;background:#F9FAFB;border-top:1px solid #FDE68A;display:flex;gap:16px;font-size:11px;flex-wrap:wrap">
        <span style="color:#374151">📋 교육신청 총액 <strong>${fmt(appTotal)}</strong></span>
        <span style="color:#059669">✅ 승인 교육신청 <strong>${fmt(approvedApps)}</strong></span>
        <span style="color:#D97706">⏳ 검토 대기 <strong>${pendingCnt}건</strong></span>
      </div>
    </div>`;
  } catch (err) {
    console.error('[boRenderOpDashboard]', err);
    el.innerHTML = '';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 승인/반려 공통 액션 (역할 기반)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * P16 — 역할별 plans/applications 상태 업데이트
 */
async function boRoleApprove(itemId, docType) {
  const table = docType === 'plan' ? 'plans' : 'applications';
  const act = boGetApproveAction(docType);
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return alert('DB 연결 필요');

  const confirmed = confirm(`${act.label} 처리하시겠습니까?`);
  if (!confirmed) return;

  try {
    const now = new Date().toISOString();
    const { error } = await sb.from(table)
      .update({ status: act.newStatus, updated_at: now })
      .eq('id', itemId);
    if (error) throw error;

    // 총괄 최종 승인 시 allocated_amount 자동 설정
    if (act.newStatus === 'approved' && docType === 'plan') {
      const { data: plan } = await sb.from('plans')
        .select('amount,allocated_amount').eq('id', itemId).single();
      if (plan && (!plan.allocated_amount || Number(plan.allocated_amount) === 0)) {
        await sb.from('plans').update({
          allocated_amount: plan.amount, updated_at: now
        }).eq('id', itemId);
      }
    }

    alert(`✅ ${act.label} 완료`);
    if (typeof boNavigate === 'function') boNavigate(boCurrentMenu);
  } catch(err) {
    alert('❌ 처리 실패: ' + err.message);
  }
}

async function boRoleReject(itemId, docType) {
  const reason = prompt('반려 사유를 입력하세요 (필수):');
  if (!reason || !reason.trim()) return;
  const table = docType === 'plan' ? 'plans' : 'applications';
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return alert('DB 연결 필요');

  try {
    await sb.from(table).update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    }).eq('id', itemId);
    alert('반려 처리 완료');
    if (typeof boNavigate === 'function') boNavigate(boCurrentMenu);
  } catch(err) {
    alert('❌ 처리 실패: ' + err.message);
  }
}

/**
 * P16 — 역할별 승인 버튼 HTML 생성
 */
function boRenderRoleActionButtons(itemId, currentStatus, docType) {
  const isPending  = ['pending', 'submitted', 'in_review'].includes(currentStatus);
  const isReviewed = currentStatus === 'reviewed';
  const safeId = String(itemId).replace(/'/g, "\\'");

  if (!isPending && !isReviewed) return '';

  const approveAct = boGetApproveAction(docType);

  // 운영담당자: pending 건만 처리 (reviewed 건은 총괄 몫)
  if (boIsOpManager() && !isPending) return `
    <span style="font-size:11px;color:#059669;font-weight:700">✅ 1차 검토 완료 — 총괄 승인 대기</span>`;

  return `
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button onclick="boRoleApprove('${safeId}','${docType}')"
        style="padding:7px 16px;border-radius:8px;border:none;background:${approveAct.color};
               color:white;font-size:12px;font-weight:900;cursor:pointer">
        ${approveAct.label}
      </button>
      <button onclick="boRoleReject('${safeId}','${docType}')"
        style="padding:7px 14px;border-radius:8px;border:1.5px solid #EF4444;
               color:#EF4444;background:white;font-size:12px;font-weight:700;cursor:pointer">
        ❌ 반려
      </button>
    </div>`;
}