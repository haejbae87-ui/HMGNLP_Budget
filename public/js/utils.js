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
  'elearning_class': 'internal_edu',     // 구버전 코드 호환
  'internal_edu': 'internal_edu',     // 이러닝/집합(비대면) 운영
  'conf_seminar': 'conf_seminar',     // 워크샵/세미나/콘퍼런스 운영
  'workshop': 'conf_seminar',     // 구버전 코드 호환
  'misc_ops': 'misc_ops',         // 기타운영
  'etc': 'misc_ops',         // 구버전 코드 호환
  'external_personal': 'external_personal',// 개인직무 사외학습
};
// FO purpose → BO purpose (역매핑, 복수 가능)
const _FO_TO_BO_PURPOSE = {};
Object.entries(_BO_TO_FO_PURPOSE).forEach(([bo, fo]) => {
  if (!_FO_TO_BO_PURPOSE[fo]) _FO_TO_BO_PURPOSE[fo] = [];
  _FO_TO_BO_PURPOSE[fo].push(bo);
});

// ── 교육유형 라벨 매핑 (BO raw key → 한글 라벨) ──
const EDU_TYPE_LABELS = {
  regular: '정규교육', elearning: '이러닝', class: '집합', live: '라이브',
  academic: '학술 및 연구활동', conf: '학회/컨퍼런스', seminar: '세미나',
  knowledge: '지식자원 학습', book: '도서구입', online: '온라인콘텐츠',
  competency: '역량개발지원', lang: '어학학습비 지원', cert: '자격증 취득지원',
  etc: '기타', team_build: '팀빌딩',
  conference: '콘퍼런스', teambuilding: '팀빌딩', cert_maintain: '자격유지',
  system_link: '제도연계',
  course_dev: '과정개발', material_dev: '교안개발', video_prod: '영상제작', facility: '교육시설운영',
};
function getEduTypeLabel(key) {
  return EDU_TYPE_LABELS[key] || key;
}

// ── 학습자용 교육유형 → 세부항목 매핑 ──
// 학습자 정책에서 교육유형이 상위 카테고리(예: regular)인 경우 세부항목을 선택하도록 합니다.
// 교육담당자 정책은 이미 세부 레벨(elearning, class 등)이므로 서브타입 불필요.
const EDU_TYPE_SUBTYPES = {
  regular: [{ key: 'elearning', label: '이러닝' }, { key: 'class', label: '집합' }, { key: 'live', label: '라이브' }],
  academic: [{ key: 'conf', label: '학회/세미나/컨퍼런스' }, { key: 'acad_present', label: '학회 직접 발표' }, { key: 'acad_study', label: '연수' }],
  knowledge: [{ key: 'book', label: '도서' }, { key: 'journal', label: '논문/저널' }, { key: 'tech_resource', label: '기술자료(DB구독·자료구매)' }],
  competency: [{ key: 'lang', label: '어학학습비 지원' }, { key: 'cert', label: '자격증 취득지원' }, { key: 'assoc', label: '학협회비' }],
  etc: [{ key: 'teach', label: '교육출강(사/내외)' }, { key: 'team_build', label: '팀빌딩' }],
};

// 현재 페르소나의 활성 정책이 학습자 대상인지 판별
function isLearnerTargetType(persona, purposeId) {
  const result = _getActivePolicies(persona);
  if (!result) return true; // 정책 없으면 학습자 기본
  const { policies } = result;
  const boPurposeKeys = typeof _FO_TO_BO_PURPOSE !== 'undefined'
    ? (_FO_TO_BO_PURPOSE[purposeId] || [purposeId]) : [purposeId];
  const matched = policies.filter(p => boPurposeKeys.includes(p.purpose));
  if (matched.length === 0) return true;
  // targetType이 'learner'이면 학습자, 아니면 교육담당자
  return matched.some(p => p.targetType === 'learner' || !p.targetType);
}

// 페르소나 vorgId 코드 → VORG_TEMPLATES(EDU_SUPPORT_DOMAINS) id 변환
function _resolveVorgId(persona) {
  const domains = typeof VORG_TEMPLATES !== 'undefined' ? VORG_TEMPLATES
    : typeof EDU_SUPPORT_DOMAINS !== 'undefined' ? EDU_SUPPORT_DOMAINS : [];
  if (!domains.length) return null;
  const byCode = domains.find(g =>
    g.code === persona.vorgId ||
    g.id === persona.vorgId
  );
  return byCode?.id || null;
}

// 페르소나의 VOrg + 테넌트에 해당하는 활성 정책 목록 (SERVICE_POLICIES DB 기반 전용)
// ※ DB 직접 로드 시 snake_case(tenant_id, vorg_template_id, account_codes),
//    mock 데이터는 camelCase(tenantId, domainId, accountCodes) — 둘 다 처리
function _getActivePolicies(persona) {
  if (typeof SERVICE_POLICIES === 'undefined' || SERVICE_POLICIES.length === 0) return null;
  const vorgId = _resolveVorgId(persona);
  const allowedAcctCodes = new Set(persona.allowedAccounts || []);

  const matched = SERVICE_POLICIES.filter(p => {
    // snake_case(DB) + camelCase(mock) 호환
    const pStatus = p.status;
    const pTenantId = p.tenant_id || p.tenantId;
    const pDomainId = p.vorg_template_id || p.domainId;  // DB: vorg_template_id, mock: domainId
    const pAcctCodes = p.account_codes || p.accountCodes || [];

    if (pStatus && pStatus !== 'active') return false;
    if (pTenantId && pTenantId !== persona.tenantId) return false;

    // ① persona.allowedAccounts와 정책 account_codes 교차 매칭 (가장 신뢰도 높음)
    if (pAcctCodes.length > 0 && pAcctCodes.some(c => allowedAcctCodes.has(c))) return true;

    // ② 페르소나의 VOrg ID와 정책 VOrg(vorg_template_id) 일치
    if (vorgId && pDomainId && pDomainId === vorgId) return true;

    // ③ vorgId 미해석 + 직접 비교
    if (!vorgId && pDomainId) {
      if (persona.vorgId && pDomainId !== persona.vorgId) return false;
    }

    // ④ VOrg/account 미설정 정책은 테넌트 내 전체 허용
    if (!pDomainId && pAcctCodes.length === 0) return true;

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
        if (isLearnerRole && p.targetType === 'learner') return true;
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
      // 같은 VOrg에 소속된 정책은 targetType 구분 없이 모두 보여줌
      // (learner/operator 모두 본인 VOrg에 할당된 정책의 목적을 볼 수 있어야 함)
      const foPurposeIds = [...new Set(
        policies.map(p => _BO_TO_FO_PURPOSE[p.purpose] || p.purpose).filter(Boolean)
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

// ── 교육유형 트리 반환 (Step3 트리 렌더링용) ──
// 반환값: [{ id, label, subs: [{key, label}] }]
// subs가 비어 있으면 해당 eduType이 리프 노드 (교육담당자용)
// subs가 있으면 세부유형 선택 필요 (학습자용)
function getPolicyEduTree(persona, purposeId, budgetAccountType) {
  const eduTypes = getPolicyEduTypes(persona, purposeId, budgetAccountType);
  if (eduTypes.length === 0) return [];

  return eduTypes.map(t => {
    const label = (typeof EDU_TYPE_LABELS !== 'undefined' && EDU_TYPE_LABELS[t]) || t;
    const subs = (typeof EDU_TYPE_SUBTYPES !== 'undefined' && EDU_TYPE_SUBTYPES[t]) || [];
    return { id: t, label, subs: subs.map(s => ({ key: s.key, label: s.label })) };
  });
}





// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function navigate(page) {
  currentPage = page;
  // URL hash에 현재 페이지 저장 → 새로고침 시 복원
  if (typeof window !== 'undefined') window.location.hash = page;
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

// 새로고침 시 hash 복원
function _restorePageFromHash() {
  const hash = (window.location.hash || '').replace('#', '');
  if (hash && document.getElementById('page-' + hash)) return hash;
  return 'dashboard';
}

