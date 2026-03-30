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

// ─── SERVICE_POLICIES (BO DB 로드) 기반 FO 헬퍼 ─────────────────────────────
//
// BO에서 저장한 서비스 정책(service_policies 테이블)이 SERVICE_POLICIES 배열에
// 로드됐을 때 FO 위저드의 목적·예산·교육유형 필터링에 그대로 사용합니다.
//
// BO purpose key → FO PURPOSES.id 매핑 테이블
const _BO_TO_FO_PURPOSE = {
  'elearning_class':    'internal_edu',     // 구버전 코드 호환
  'internal_edu':       'internal_edu',     // 이러닝/집합(비대면) 운영
  'conf_seminar':       'conf_seminar',     // 워크샵/세미나/콘퍼런스 운영
  'workshop':           'conf_seminar',     // 구버전 코드 호환
  'misc_ops':           'misc_ops',         // 기타운영
  'etc':                'misc_ops',         // 구버전 코드 호환
  'external_personal':  'external_personal',// 개인직무 사외학습
};
// FO purpose → BO purpose (역매핑, 복수 가능)
const _FO_TO_BO_PURPOSE = {};
Object.entries(_BO_TO_FO_PURPOSE).forEach(([bo, fo]) => {
  if (!_FO_TO_BO_PURPOSE[fo]) _FO_TO_BO_PURPOSE[fo] = [];
  _FO_TO_BO_PURPOSE[fo].push(bo);
});

// 페르소나 isolationGroup 코드 → EDU_SUPPORT_DOMAINS id 변환 (HMC-GENERAL → IG-HMC-GEN 등)
function _resolveIsoGroupId(persona) {
  if (typeof EDU_SUPPORT_DOMAINS === 'undefined') return null;
  const byCode = EDU_SUPPORT_DOMAINS.find(g =>
    g.code === persona.isolationGroup ||
    g.id   === persona.isolationGroup
  );
  return byCode?.id || null;
}

// 페르소나의 격리그룹 + 테넌트에 해당하는 활성 정책 목록 (SERVICE_POLICIES DB 기반 전용)
function _getActivePolicies(persona) {
  if (typeof SERVICE_POLICIES === 'undefined' || SERVICE_POLICIES.length === 0) return null;
  const isoGroupId = _resolveIsoGroupId(persona);
  // persona.allowedAccounts로 추가 매칭할 수 있는 격리그룹 ID 집합
  const allowedAcctCodes = new Set(persona.allowedAccounts || []);

  const matched = SERVICE_POLICIES.filter(p => {
    if (p.status && p.status !== 'active') return false;
    if (p.tenantId && p.tenantId !== persona.tenantId) return false;
    // 격리그룹 매칭:
    // ① 페르소나의 주 격리그룹 ID와 일치하거나
    if (isoGroupId && p.domainId && p.domainId === isoGroupId) return true;
    // ② 정책의 accountCodes가 persona.allowedAccounts와 교차하면 포함
    //    (이상봉처럼 여러 격리그룹 계정을 가진 겸임 케이스)
    if (p.accountCodes && p.accountCodes.some(c => allowedAcctCodes.has(c))) {
      // 테넌트 범위 확인만 하고 OK
      return true;
    }
    // ③ isoGroupId 미해석 + 직접 비교
    if (!isoGroupId && p.domainId) {
      if (persona.isolationGroup && p.domainId !== persona.isolationGroup) return false;
    }
    // ④ 격리그룹 미설정 정책은 테넌트 내 전체 허용
    if (!p.domainId) return true;
    return false;
  });
  return matched.length > 0 ? { source: 'db', policies: matched } : null;
}

// 현재 페르소나가 사용 가능한 교육 목적 필터링
function getPersonaBudgets(persona, purposeId) {
  const result = _getActivePolicies(persona);
  if (result) {
    const { source, policies } = result;
    if (source === 'db') {
      // target_type 필터 (team_general/team_leader는 learner + operator 모두)
      const LEARNER_ROLES = ['learner', 'team_general', 'team_leader'];
      const isLearnerRole = LEARNER_ROLES.includes(persona.role);
      const isOperatorRole = !isLearnerRole || ['team_general', 'team_leader'].includes(persona.role);
      const byTarget = policies.filter(p => {
        if (!p.targetType) return true;
        if (isLearnerRole  && p.targetType === 'learner')  return true;
        if (isOperatorRole && p.targetType === 'operator') return true;
        return false;
      });
      // BO DB: purposeId (FO) → BO purpose keys로 변환
      const boPurposeKeys = purposeId ? (_FO_TO_BO_PURPOSE[purposeId] || [purposeId]) : null;
      const filtered = boPurposeKeys
        ? byTarget.filter(p => boPurposeKeys.includes(p.purpose))
        : byTarget;
      // 허용된 accountCodes로 persona.budgets 필터
      const allCodes = [...new Set(filtered.flatMap(p => p.accountCodes || []))];
      return persona.budgets.filter(b =>
        allCodes.some(code => {
          const acctType = ACCOUNT_TYPE_MAP[code] || null;
          return !acctType || acctType === b.account || code === b.accountCode;
        })
      );
    }
    // FO legacy
    const purposeFilter = purposeId ? p => p.foPurpose === purposeId : () => true;
    const allowedAccountTypes = [...new Set(policies.filter(purposeFilter).map(p => p.accountType))];
    return persona.budgets.filter(b => allowedAccountTypes.includes(b.account));
  }
  // Fallback
  const allowed = persona.allowedAccounts || [];
  if (allowed.includes('*')) return persona.budgets;
  const allowedTypes = allowed.map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
  const purposeAccounts = Array.isArray(purposeId) ? purposeId : null;
  return persona.budgets.filter(b =>
    (!purposeAccounts || purposeAccounts.includes(b.account)) &&
    allowedTypes.includes(b.account)
  );
}

function isFixedPlanProcess(persona) {
  return persona.process === 'plan-apply-result';
}

// 현재 페르소나가 사용 가능한 교육 목적 필터링
function getPersonaPurposes(persona) {
  if (isFixedPlanProcess(persona)) {
    return PURPOSES.filter(p => p.id === 'external_personal');
  }
  const result = _getActivePolicies(persona);
  if (result) {
    const { source, policies } = result;
    if (source === 'db') {
      // persona role → DB target_type 매핑
      // team_general / team_leader 등 겸임 역할은 learner + operator 정책 모두 적용
      const LEARNER_ROLES = ['learner', 'team_general', 'team_leader'];
      const isLearnerRole = LEARNER_ROLES.includes(persona.role);
      const isOperatorRole = !isLearnerRole || ['team_general', 'team_leader'].includes(persona.role);
      const filtered = policies.filter(p => {
        if (!p.targetType) return true; // target_type 미설정 = 전체 허용
        if (isLearnerRole  && p.targetType === 'learner')   return true;
        if (isOperatorRole && p.targetType === 'operator')  return true;
        return false;
      });
      // BO purpose keys → FO PURPOSES.id 변환
      const foPurposeIds = [...new Set(
        filtered.map(p => _BO_TO_FO_PURPOSE[p.purpose] || p.purpose).filter(Boolean)
      )];
      return PURPOSES.filter(p => foPurposeIds.includes(p.id));
    }
    const activePurposeIds = [...new Set(policies.map(p => p.foPurpose))];
    return PURPOSES.filter(p => activePurposeIds.includes(p.id));
  }
  // Fallback
  if (!persona.allowedAccounts || persona.allowedAccounts.includes('*')) return PURPOSES;
  const allowedTypes = (persona.allowedAccounts || []).map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
  return PURPOSES.filter(p =>
    !p.accounts || p.accounts.some(acc => allowedTypes.includes(acc))
  );
}

// 선택된 목적 + 예산 계정에 허용된 교육유형 목록 반환 (Step3용)
function getPolicyEduTypes(persona, purposeId, budgetAccountType) {
  const result = _getActivePolicies(persona);
  if (result && purposeId) {
    const { source, policies } = result;
    if (source === 'db') {
      const boPurposeKeys = _FO_TO_BO_PURPOSE[purposeId] || [purposeId];
      // budgetAccountType → accountCode 역매핑
      const acctCodeForType = Object.entries(ACCOUNT_TYPE_MAP).find(([, v]) => v === budgetAccountType)?.[0] || null;
      const matched = policies.filter(p => {
        if (!boPurposeKeys.includes(p.purpose)) return false;
        if (acctCodeForType && p.accountCodes?.length && !p.accountCodes.includes(acctCodeForType)) return false;
        return true;
      });
      if (matched.length > 0) {
        return [...new Set(matched.flatMap(p => p.eduTypes || []))];
      }
    } else {
      const matched = policies.filter(p =>
        p.foPurpose === purposeId && p.accountType === budgetAccountType
      );
      if (matched.length > 0) return [...new Set(matched.flatMap(p => p.allowedEduTypes || []))];
    }
  }
  // Fallback
  if (typeof SERVICE_DEFINITIONS !== 'undefined') {
    const acctCode = Object.entries(ACCOUNT_TYPE_MAP).find(([, v]) => v === budgetAccountType)?.[0];
    const linked = SERVICE_DEFINITIONS.filter(sv =>
      sv.tenantId === persona.tenantId && sv.status === 'active' &&
      (!acctCode || sv.linkedAccounts.includes(acctCode))
    );
    if (linked.length > 0) return [...new Set(linked.flatMap(sv => sv.eduTypes || []))];
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
  if (page === 'approval-member') renderApprovalMember();
  if (page === 'approval-leader') renderApprovalLeader();
  renderGNB();
}

