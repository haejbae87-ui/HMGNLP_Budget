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

// 현재 페르소나 계정 코드→account(계정 유형명) 매핑 테이블
const ACCOUNT_TYPE_MAP = {
  'HMC-OPS': '운영', 'HMC-PART': '참가', 'HMC-ETC': '기타', 'HMC-RND': '연구투자',
  'KIA-OPS': '운영', 'KIA-PART': '참가',
  'HAE-OPS': '운영', 'HAE-PART': '참가', 'HAE-CERT': '자격증',
  'COMMON-FREE': null
};

// 현재 페르소나의 allowedAccounts 기준으로 예산 목록 필터링
function getPersonaBudgets(persona, purposeAccounts) {
  const allowed = persona.allowedAccounts || [];
  if (allowed.includes('*')) return persona.budgets;
  const allowedTypes = allowed.map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
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
// - HAE 고정 프로세스: external_personal 만 허용
// - 그 외: allowedAccounts에 매핑되는 계정 账유형을 포함하는 목적만 표시
function getPersonaPurposes(persona) {
  if (isFixedPlanProcess(persona)) {
    return PURPOSES.filter(p => p.id === 'external_personal');
  }
  if (!persona.allowedAccounts || persona.allowedAccounts.includes('*')) return PURPOSES;
  const allowedTypes = (persona.allowedAccounts || [])
    .map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
  return PURPOSES.filter(p =>
    !p.accounts || p.accounts.some(acc => allowedTypes.includes(acc))
  );
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
