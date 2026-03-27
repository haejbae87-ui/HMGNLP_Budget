// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString('ko-KR');
}

function statusBadge(s) {
  const m = {
    완료: 'bg-green-100 text-green-700',
    진행중: 'bg-blue-100 text-blue-700',
    신청중: 'bg-yellow-100 text-yellow-700',
    반려: 'bg-red-100 text-red-700'
  };
  return `<span class="badge ${m[s] || 'bg-gray-100 text-gray-600'}">${s}</span>`;
}

// ─── 페르소나 보안 헬퍼 (LXP) ─────────────────────────────────────────────────

// ─── 페르소나 보안 헬퍼 (LXP) ─────────────────────────────────────────────────

// 현재 페르소나 계정 코드→account(계정 유형명) 매핑 테이블
const ACCOUNT_TYPE_MAP = {
  'HMC-OPS': '운영', 'HMC-PART': '참가', 'HMC-ETC': '기타', 'HMC-RND': '연구투자',
  'KIA-OPS': '운영', 'KIA-PART': '참가',
  'HAE-OPS': '운영', 'HAE-PART': '참가', 'HAE-CERT': '자격증',
  'HAE-EDU': '전사교육', 'HAE-TEAM': '팀/프로젝트',
  'HSC-OPS': '운영', 'HSC-EXT': '사외교육',
  'COMMON-FREE': null
};

// ─── SERVICE_POLICIES_FO 기반 헬퍼 ────────────────────────────────────────────

// 페르소나의 격리그룹+테넌트에 해당하는 활성 정책 목록
function _getActivePolicies(persona) {
  if (typeof SERVICE_POLICIES_FO === 'undefined') return null;
  const policies = SERVICE_POLICIES_FO.filter(p =>
    p.tenantId === persona.tenantId &&
    p.isolationGroup === persona.isolationGroup &&
    p.status === 'active'
  );
  return policies.length > 0 ? policies : null;
}

// 현재 페르소나의 allowedAccounts 기준으로 예산 목록 필터링
// SERVICE_POLICIES_FO가 있으면 정책 기반, 없으면 기존 allowedAccounts 방식 fallback
function getPersonaBudgets(persona, purposeId) {
  const policies = _getActivePolicies(persona);

  if (policies) {
    // 정책 기반: 선택된 목적(foPurpose)의 정책에서 허용된 accountType만 추출
    const purposeFilter = purposeId
      ? p => p.foPurpose === purposeId
      : () => true;
    const allowedAccountTypes = [...new Set(
      policies.filter(purposeFilter).map(p => p.accountType)
    )];
    return persona.budgets.filter(b => allowedAccountTypes.includes(b.account));
  }

  // Fallback: 기존 allowedAccounts 방식
  const allowed = persona.allowedAccounts || [];
  if (allowed.includes('*')) return persona.budgets;
  const allowedTypes = allowed.map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
  // purposeId가 PURPOSES.id일 수도, accounts 배열일 수도 있어서 둘 다 처리
  const purposeAccounts = Array.isArray(purposeId) ? purposeId : null;
  return persona.budgets.filter(b =>
    (!purposeAccounts || purposeAccounts.includes(b.account)) &&
    allowedTypes.includes(b.account)
  );
}

// HAE 학습자처럼 고정 프로세스(계획 필수) 페르소나 여부
function isFixedPlanProcess(persona) {
  return persona.process === 'plan-apply-result';
}

// 현재 페르소나가 사용 가능한 교육 목적 필터링
// SERVICE_POLICIES_FO 기반: 정책이 있으면 해당 목적만, 없으면 기존 방식 fallback
function getPersonaPurposes(persona) {
  if (isFixedPlanProcess(persona)) {
    return PURPOSES.filter(p => p.id === 'external_personal');
  }

  const policies = _getActivePolicies(persona);
  if (policies) {
    // 정책 기반: 해당 격리그룹에 활성 정책이 있는 foPurpose만 표시
    const activePurposeIds = [...new Set(policies.map(p => p.foPurpose))];
    return PURPOSES.filter(p => activePurposeIds.includes(p.id));
  }

  // Fallback: 기존 allowedAccounts 방식
  if (!persona.allowedAccounts || persona.allowedAccounts.includes('*')) return PURPOSES;
  const allowedTypes = (persona.allowedAccounts || [])
    .map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
  return PURPOSES.filter(p =>
    !p.accounts || p.accounts.some(acc => allowedTypes.includes(acc))
  );
}

// 선택된 목적 + 예산 계정에 허용된 교육유형 목록 반환 (Step3용)
// SERVICE_POLICIES_FO 기반, 없으면 SERVICE_DEFINITIONS.eduTypes fallback
function getPolicyEduTypes(persona, purposeId, budgetAccountType) {
  const policies = _getActivePolicies(persona);
  if (policies && purposeId && budgetAccountType) {
    const matched = policies.filter(p =>
      p.foPurpose === purposeId && p.accountType === budgetAccountType
    );
    if (matched.length > 0) {
      return [...new Set(matched.flatMap(p => p.allowedEduTypes || []))];
    }
  }

  // Fallback: SERVICE_DEFINITIONS.eduTypes (기존 방식)
  if (typeof SERVICE_DEFINITIONS !== 'undefined') {
    const acctCode = Object.entries(ACCOUNT_TYPE_MAP).find(([, v]) => v === budgetAccountType)?.[0];
    const linked = SERVICE_DEFINITIONS.filter(sv =>
      sv.tenantId === persona.tenantId &&
      sv.status === 'active' &&
      (!acctCode || sv.linkedAccounts.includes(acctCode))
    );
    if (linked.length > 0) {
      return [...new Set(linked.flatMap(sv => sv.eduTypes || []))];
    }
  }
  return [];
}



// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.top-nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) { pg.classList.add('active'); pg.classList.add('fade-in'); }
  const activeNav = page === 'apply' ? 'history' : page;
  const ni = document.getElementById('nav-' + activeNav);
  if (ni) ni.classList.add('active');
  if (page === 'dashboard') renderDashboard();
  if (page === 'plans') renderPlans();
  if (page === 'history') renderHistory();
  if (page === 'budget') renderBudget();
  if (page === 'apply') { applyViewMode = 'list'; renderApply(); }
  if (page === 'mypage') renderMypage();
  if (page === 'fo-manual') renderFoManual();
}
