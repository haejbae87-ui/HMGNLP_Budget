// ─── P16: 역할 기반 뷰 모드 헬퍼 ─────────────────────────────────────────────
// PRD: edu_support_operations_role_design.md §3
// 사용처: bo_plan_mgmt.js, bo_approval.js, bo_allocation.js, bo_budget_history.js, bo_budget_demand.js

/**
 * 현재 페르소나의 역할 분류
 * @returns {'global_admin'|'op_manager'|'platform'|'tenant_admin'|'other'}
 */
function boGetRoleClass() {
  const role = boCurrentPersona?.role || '';
  if (['platform_admin'].includes(role)) return 'platform';
  if (['tenant_global_admin'].includes(role)) return 'tenant_admin';
  if (['budget_global_admin'].includes(role)) return 'global_admin';
  if (['budget_op_manager'].includes(role)) return 'op_manager';
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

/**
 * 관할 조직 필터 SQL 조건 생성
 * - 총괄: 필터 없음 (전체 조회)
 * - 운영: persona.vorgIds의 org_id만
 * @returns {string[]} 허용 org_id 목록 (빈 배열이면 전체)
 */
function boGetMyOrgIds() {
  if (boIsGlobalAdmin()) return []; // 전체
  const groups = boGetMyGroups();
  // VOrg 그룹 내 소속 조직 ID 수집
  const domains = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES : [];
  const myGroup = groups[0]; // 단일 그룹 기준 (다중 그룹은 루프)
  if (!myGroup) return [];
  // groups 배열의 id 목록 반환 (Supabase에서 .in('org_id', myOrgIds) 로 사용)
  return groups.map(g => g.id);
}

/**
 * 배정액 편집 가능 여부
 * - 총괄: ✅ / 운영: 🚫
 */
function boCanEditAllocation() {
  return boIsGlobalAdmin();
}

/**
 * 시뮬레이션 버튼 표시 여부
 * - 총괄: ✅ / 운영: 🚫
 */
function boCanSimulate() {
  return boIsGlobalAdmin();
}

/**
 * 기초·추가 배정 탭 표시 여부
 * - 총괄: ✅ / 운영: 🚫
 */
function boCanBaseAllocate() {
  return boIsGlobalAdmin();
}

/**
 * 역할 뱃지 HTML
 */
function boRoleModeBadge() {
  const rc = boGetRoleClass();
  const map = {
    platform:     { label: '플랫폼 총괄', bg: '#7C3AED', c: 'white' },
    tenant_admin: { label: '테넌트 총괄', bg: '#1D4ED8', c: 'white' },
    global_admin: { label: '예산 총괄',   bg: '#059669', c: 'white' },
    op_manager:   { label: '운영 담당',   bg: '#D97706', c: 'white' },
    other:        { label: '일반',        bg: '#6B7280', c: 'white' },
  };
  const m = map[rc] || map.other;
  return `<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;
    background:${m.bg};color:${m.c};font-size:10px;font-weight:900;letter-spacing:.3px">${m.label}</span>`;
}

/**
 * P16 — bo_plan_mgmt.js 연동용: 역할별 승인 버튼 HTML 생성
 * @param {string} itemId
 * @param {string} currentStatus
 * @param {'plan'|'application'|'result'} docType
 */
function boRenderRoleActionButtons(itemId, currentStatus, docType) {
  const isPending   = ['pending', 'submitted', 'in_review'].includes(currentStatus);
  const isReviewed  = currentStatus === 'reviewed';
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

/**
 * P16 — 역할별 plans/applications 상태 업데이트
 * bo_plan_mgmt, bo_result_mgmt 에서 호출
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

    // 총괄 최종 승인 시 추가 처리
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
    // 현재 열린 메뉴 새로고침
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