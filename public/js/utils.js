// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

function fmt(n) {
  return Number(n).toLocaleString("ko-KR");
}

function statusBadge(s) {
  const m = {
    완료: "bg-green-100 text-green-700",
    진행중: "bg-blue-100 text-blue-700",
    신청중: "bg-yellow-100 text-yellow-700",
    반려: "bg-red-100 text-red-700",
  };
  return `<span class="badge ${m[s] || "bg-gray-100 text-gray-600"}">${s}</span>`;
}

// ─── 페르소나 보안 헬퍼 (LXP) ─────────────────────────────────────────────────

// ─── 페르소나 보안 헬퍼 (LXP) ─────────────────────────────────────────────────

// 현재 페르소나 계정 코드→account(계정 유형명) 매핑 테이블
const ACCOUNT_TYPE_MAP = {
  "HMC-OPS": "운영",
  "HMC-PART": "참가",
  "HMC-ETC": "기타",
  "HMC-RND": "연구투자",
  "KIA-OPS": "운영",
  "KIA-PART": "참가",
  "HAE-OPS": "운영",
  "HAE-PART": "참가",
  "HAE-CERT": "자격증",
  "HAE-EDU": "전사교육",
  "HAE-TEAM": "팀/프로젝트",
  "HSC-OPS": "운영",
  "HSC-EXT": "사외교육",
  "COMMON-FREE": null,
};

// ─── SERVICE_POLICIES (BO DB 로드) 기반 FO 헬퍼 ─────────────────────────────
//
// BO에서 저장한 교육지원 운영 규칙(service_policies 테이블)이 SERVICE_POLICIES 배열에
// 로드됐을 때 FO 위저드의 목적·예산·교육유형 필터링에 그대로 사용합니다.
//
// BO purpose key → FO PURPOSES.id 매핑 테이블
const _BO_TO_FO_PURPOSE = {
  elearning_class: "internal_edu", // 구버전 코드 호환
  internal_edu: "internal_edu", // 이러닝/집합(비대면) 운영
  conf_seminar: "conf_seminar", // 워크샵/세미나/콘퍼런스 운영
  workshop: "conf_seminar", // 구버전 코드 호환
  misc_ops: "misc_ops", // 기타운영
  etc: "misc_ops", // 구버전 코드 호환
  external_personal: "external_personal", // 개인직무 사외학습
  external_group: "external_personal", // 그룹 사외학습 → 학습자는 개인직무로 접근
};
// FO purpose → BO purpose (역매핑, 복수 가능)
const _FO_TO_BO_PURPOSE = {};
Object.entries(_BO_TO_FO_PURPOSE).forEach(([bo, fo]) => {
  if (!_FO_TO_BO_PURPOSE[fo]) _FO_TO_BO_PURPOSE[fo] = [];
  _FO_TO_BO_PURPOSE[fo].push(bo);
});

// ── 교육유형 라벨 매핑 (BO raw key → 한글 라벨) ──
const EDU_TYPE_LABELS = {
  // ── 직접학습(learner) 세부항목 — l_ 접두어로 교육운영과 ID 충돌 방지 ──
  l_elearning: "이러닝",
  l_class: "집합",
  l_seminar: "세미나",
  l_team_build: "팀빌딩",
  // ── 공통 ──
  regular: "정규교육",
  elearning: "이러닝",
  class: "집합",
  live: "라이브",
  academic: "학술 및 연구활동",
  conf: "학회/컨퍼런스",
  seminar: "세미나",
  acad_present: "학회 직접 발표",
  acad_study: "연수",
  knowledge: "지식자원 학습",
  book: "도서구입",
  online: "온라인콘텐츠",
  journal: "논문/저널",
  tech_resource: "기술자료(DB구독·자료구매)",
  competency: "역량개발지원",
  lang: "어학학습비 지원",
  cert: "자격증 취득지원",
  assoc: "학협회비",
  etc: "기타",
  teach: "교육출강(사/내외)",
  team_build: "팀빌딩",
  conference: "콘퍼런스",
  teambuilding: "팀빌딩",
  cert_maintain: "자격유지",
  system_link: "제도연계",
  course_dev: "과정개발",
  material_dev: "교안개발",
  video_prod: "영상제작",
  facility: "교육시설운영",
};
function getEduTypeLabel(key) {
  return EDU_TYPE_LABELS[key] || key;
}

// ── 직접학습용 교육유형 → 세부항목 매핑 ──
// 직접학습 정책에서 교육유형이 상위 카테고리(예: regular)인 경우 세부항목을 선택하도록 합니다.
// 교육운영 정책은 이미 세부 레벨(elearning, class 등)이므로 서브타입 불필요.
const EDU_TYPE_SUBTYPES = {
  regular: [
    { key: "elearning", label: "이러닝" },
    { key: "class", label: "집합" },
    { key: "live", label: "라이브" },
  ],
  academic: [
    { key: "conf", label: "학회/세미나/컨퍼런스" },
    { key: "acad_present", label: "학회 직접 발표" },
    { key: "acad_study", label: "연수" },
  ],
  knowledge: [
    { key: "book", label: "도서" },
    { key: "journal", label: "논문/저널" },
    { key: "tech_resource", label: "기술자료(DB구독·자료구매)" },
  ],
  competency: [
    { key: "lang", label: "어학학습비 지원" },
    { key: "cert", label: "자격증 취득지원" },
    { key: "assoc", label: "학협회비" },
  ],
  etc: [
    { key: "teach", label: "교육출강(사/내외)" },
    { key: "team_build", label: "팀빌딩" },
  ],
};

// 교육유형 UI 판별: 선택한 목적+예산의 정책이 학습자형(세부항목 선택 포함) UI인지 여부
// ※ 이 함수는 learner/operator 접근 제어가 아닌, Step3 교육유형 UI 렌더링 방식 결정용
//    - true  → 학습자 스타일 UI (세부항목 트리, 개인학습 중심)
//    - false → 운영자 스타일 UI (과정명 직접 입력, 운영 중심)
// vorg 기반 정책이 있으면 정책의 target_type으로 판별, 없으면 기본(true) 반환

// Step3 교육유형 UI 방식 결정: 선택한 목적의 정책이 학습자형 UI인지 판별
// (접근 제어 아님 — 모든 사용자는 vorg 기반 정책의 모든 목적에 접근 가능)
function isLearnerTargetType(persona, purposeId) {
  // B방향: _FO_EDU_TREE에서 직접 판별 (신규 purpose ID 대응)
  if (typeof _FO_EDU_TREE !== "undefined") {
    for (const group of _FO_EDU_TREE) {
      if (group.categories.some(c => c.id === purposeId)) {
        return group.group === 'learner';
      }
    }
  }
  // 레거시: service_policies 기반 판별
  const result = _getActivePolicies(persona);
  if (!result) return true; // 정책 없으면 학습자형 기본 UI
  const { policies } = result;
  const boPurposeKeys =
    typeof _FO_TO_BO_PURPOSE !== "undefined"
      ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
      : [purposeId];
  const matched = policies.filter((p) => boPurposeKeys.includes(p.purpose));
  if (matched.length === 0) return true;
  // target_type='learner'이면 학습자형 UI, 'operator'이면 운영자형 UI
  return matched.some(
    (p) => (p.target_type || p.targetType) === "learner" || !p.targetType,
  );
}

// 페르소나 vorgId 코드 → VORG_TEMPLATES(EDU_SUPPORT_DOMAINS) id 변환
function _resolveVorgId(persona) {
  const domains =
    typeof VORG_TEMPLATES !== "undefined"
      ? VORG_TEMPLATES
      : typeof EDU_SUPPORT_DOMAINS !== "undefined"
        ? EDU_SUPPORT_DOMAINS
        : [];
  if (!persona.vorgId) return null;
  if (!domains.length) {
    // VORG_TEMPLATES 미로드: persona.vorgId가 이미 DB TPL id 형식이면 그대로 반환
    return persona.vorgId;
  }
  // code 또는 id로 매칭
  const byCode = domains.find(
    (g) => g.code === persona.vorgId || g.id === persona.vorgId, // persona.vorgId가 이미 TPL id인 경우 직접 매칭
  );
  // 매칭 없으면 persona.vorgId를 그대로 사용 (TPL id를 직접 설정한 경우)
  return byCode?.id || persona.vorgId;
}

// 계정코드 퍼지 매칭: 단축코드(HMC-ETC) ↔ 풀코드(BA-HMC-ETC-TPL_...) 상호 호환
function _accountMatch(pAcctCodes, allowedSet) {
  return pAcctCodes.some((pc) => {
    if (allowedSet.has(pc)) return true; // 완전 일치
    for (const ac of allowedSet) {
      // 부분 매칭: HMC-ETC가 BA-HMC-ETC-TPL_xxx에 포함되는지
      if (ac.includes(pc) || pc.includes(ac)) return true;
    }
    return false;
  });
}

// 페르소나의 VOrg + 테넌트에 해당하는 활성 정책 목록 (SERVICE_POLICIES DB 기반 전용)
// ※ DB 직접 로드 시 snake_case(tenant_id, vorg_template_id, account_codes),
//    mock 데이터는 camelCase(tenantId, domainId, accountCodes) — 둘 다 처리
function _getActivePolicies(persona) {
  if (typeof SERVICE_POLICIES === "undefined" || SERVICE_POLICIES.length === 0)
    return null;
  const vorgId = _resolveVorgId(persona);
  const allowedAcctCodes = new Set(persona.allowedAccounts || []);

  const matched = SERVICE_POLICIES.filter((p) => {
    // snake_case(DB) + camelCase(mock) 호환
    const pStatus = p.status;
    const pTenantId = p.tenant_id || p.tenantId;
    const pDomainId = p.vorg_template_id || p.domainId; // DB: vorg_template_id, mock: domainId
    const pAcctCodes = p.account_codes || p.accountCodes || [];

    if (pStatus && pStatus !== "active") return false;
    if (pTenantId && pTenantId !== persona.tenantId) return false;

    // ① vorgId/vorgIds 기반 매칭 (정책 매칭의 주 기준)
    const vorgIds = persona.vorgIds || (vorgId ? [vorgId] : []);
    if (pDomainId && vorgIds.length > 0 && vorgIds.includes(pDomainId))
      return true;
    if (vorgId && pDomainId && pDomainId === vorgId) return true;

    // ② allowedAccounts 퍼지 매칭 (vorgId 미해석 시 폴백)
    if (
      !vorgId &&
      vorgIds.length === 0 &&
      pAcctCodes.length > 0 &&
      _accountMatch(pAcctCodes, allowedAcctCodes)
    )
      return true;

    // ③ VOrg/account 미설정 정책 → accountCodes 퍼지 매칭
    if (
      !vorgId &&
      !pDomainId &&
      pAcctCodes.length > 0 &&
      _accountMatch(pAcctCodes, allowedAcctCodes)
    )
      return true;

    return false;
  });
  if (matched.length > 0) {
    console.log(
      `[_getActivePolicies] ${persona.name}: ${matched.length}건 매칭 → ${matched.map((p) => p.name || p.purpose).join(", ")}`,
    );
  }
  return matched.length > 0 ? { source: "db", policies: matched } : null;
}

// 현재 페르소나에 오픈된 정책 기반 예산 목록 반환
// ★ vorg(교육조직) 기반 정책 매칭 → 해당 vorg 정책의 purpose로 필터
// ★ target_type 기반 접근 제어 없음: 모든 사용자는 자신의 vorg 정책의 모든 예산에 접근 가능
function getPersonaBudgets(persona, purposeId) {
  // B방향: _FO_EDU_TREE 카테고리 ID인 경우 eduTypes 교차 필터
  if (purposeId && typeof _FO_EDU_TREE !== "undefined") {
    let catTypes = null;
    for (const group of _FO_EDU_TREE) {
      const cat = group.categories.find(c => c.id === purposeId);
      if (cat) { catTypes = cat.types; break; }
    }
    if (catTypes) {
      return (persona.budgets || []).filter(b => {
        const bTypes = b.eduTypes || [];
        return bTypes.some(t => catTypes.includes(t));
      });
    }
  }

  // 레거시: service_policies 기반 예산 필터링
  const result = _getActivePolicies(persona);
  if (result) {
    const { source, policies } = result;
    if (source === "db") {
      // purpose 필터만 적용 (target_type 필터 없음)
      const boPurposeKeys = purposeId
        ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
        : null;
      const filtered = boPurposeKeys
        ? policies.filter((p) => boPurposeKeys.includes(p.purpose))
        : policies;
      // 허용된 accountCodes로 persona.budgets 필터
      const allCodes = [
        ...new Set(
          filtered.flatMap((p) => p.accountCodes || p.account_codes || []),
        ),
      ];
      return (persona.budgets || []).filter((b) =>
        allCodes.some((code) => {
          const acctType = ACCOUNT_TYPE_MAP[code];
          return (acctType && acctType === b.account) || code === b.accountCode;
        }),
      );
    }
    // FO legacy
    const purposeFilter = purposeId
      ? (p) => p.foPurpose === purposeId
      : () => true;
    const allowedAccountTypes = [
      ...new Set(policies.filter(purposeFilter).map((p) => p.accountType)),
    ];
    return (persona.budgets || []).filter((b) =>
      allowedAccountTypes.includes(b.account),
    );
  }
  // Fallback
  const allowed = persona.allowedAccounts || [];
  if (allowed.includes("*")) return persona.budgets || [];
  const allowedTypes = allowed
    .map((code) => ACCOUNT_TYPE_MAP[code])
    .filter(Boolean);
  const purposeAccounts = Array.isArray(purposeId) ? purposeId : null;
  return (persona.budgets || []).filter(
    (b) =>
      (!purposeAccounts || purposeAccounts.includes(b.account)) &&
      allowedTypes.includes(b.account),
  );
}

// 정책 기반 계획 필수 여부 판단 (Policy-First: persona.process 하드코딩 대신 정책 패턴으로 결정)
function isFixedPlanProcess(persona) {
  // 기존 mock 호환
  if (persona.process === "plan-apply-result") return true;
  // DB 정책 기반: 매칭 정책 중 패턴A가 있으면 계획 필수
  const result = _getActivePolicies(persona);
  if (result && result.source === "db") {
    return result.policies.some(
      (p) => (p.process_pattern || p.processPattern) === "A",
    );
  }
  return false;
}

// ── 개선1: 프로세스 패턴 안내 정보 반환 ───────────────────────────────────────
// 선택된 목적+예산코드에 해당하는 정책의 process_pattern을 기반으로
// Step 2에서 사용자에게 프로세스 흐름을 시각적으로 안내하기 위한 데이터 반환
function getProcessPatternInfo(persona, purposeId, accountCode) {
  const result = _getActivePolicies(persona);
  if (!result || result.source !== "db") return null;

  const boPurposeKeys = purposeId
    ? _FO_TO_BO_PURPOSE[purposeId] || [purposeId]
    : null;
  let matched = result.policies;
  if (boPurposeKeys)
    matched = matched.filter((p) => boPurposeKeys.includes(p.purpose));
  if (accountCode)
    matched = matched.filter((p) =>
      (p.account_codes || p.accountCodes || []).includes(accountCode),
    );
  if (matched.length === 0 && boPurposeKeys) {
    // accountCode 못 찾으면 purpose만으로 재시도
    matched = result.policies.filter((p) => boPurposeKeys.includes(p.purpose));
  }
  if (matched.length === 0) return null;

  // 복수 매칭 시 가장 엄격한 패턴(A>E>B>C>D) 선정
  const _PRIORITY = { A: 1, E: 2, B: 3, C: 4, D: 5 };
  const sorted = [...matched].sort(
    (a, b) =>
      (_PRIORITY[a.process_pattern || "B"] || 9) -
      (_PRIORITY[b.process_pattern || "B"] || 9),
  );
  const pattern = sorted[0].process_pattern || sorted[0].processPattern || "B";
  const policyName = sorted[0].name || "";

  const PATTERNS = {
    A: {
      label: "계획 → 신청 → 결과",
      steps: [
        { icon: "📋", name: "교육계획", hint: "승인 필요" },
        { icon: "✏️", name: "교육신청", hint: "계획 기반" },
        { icon: "📝", name: "결과보고", hint: "이수 후" },
      ],
      hint: "교육계획 승인 후 신청이 가능합니다.",
    },
    B: {
      label: "신청 → 결과",
      steps: [
        { icon: "✏️", name: "교육신청", hint: "바로 신청" },
        { icon: "📝", name: "결과보고", hint: "이수 후" },
      ],
      hint: "교육계획 없이 바로 신청할 수 있습니다.",
    },
    C: {
      label: "결과 등록 (후정산)",
      steps: [
        { icon: "📝", name: "결과등록", hint: "수료 후" },
        { icon: "💰", name: "정산", hint: "사후 처리" },
      ],
      hint: "교육 이수 후 결과를 등록하면 정산됩니다.",
    },
    D: {
      label: "결과 등록 (간편)",
      steps: [{ icon: "📝", name: "결과등록", hint: "수료 후" }],
      hint: "교육 이수 후 결과만 등록합니다.",
    },
    E: {
      label: "자유 선택",
      steps: [
        { icon: "📋", name: "교육계획", hint: "선택" },
        { icon: "✏️", name: "교육신청", hint: "선택" },
        { icon: "📝", name: "결과보고", hint: "선택" },
      ],
      hint: "계획·신청·결과를 자유롭게 선택할 수 있습니다.",
    },
  };
  const info = PATTERNS[pattern] || PATTERNS["B"];
  return { pattern, policyName, ...info };
}

// ── 개선3: 행위 기반 카테고리 분류 매핑 ──────────────────────────────────────
// FO purpose ID → 행위 카테고리
const _PURPOSE_CATEGORY = {
  // 기존 (레거시 호환)
  external_personal: "self-learning", // 직접 학습
  internal_edu: "edu-operation", // 교육 운영
  conf_seminar: "edu-operation", // 교육 운영
  misc_ops: "edu-operation", // 교육 운영
  // 신규 (B방향 개별 카드 — _FO_EDU_TREE 기반)
  regular: "self-learning",
  academic: "self-learning",
  knowledge: "self-learning",
  competency: "self-learning",
  etc: "self-learning",
  elearning_class: "edu-operation",
};
const _CATEGORY_META = {
  "self-learning": {
    icon: "📚",
    label: "직접 학습",
    desc: "본인이 직접 참여하는 교육",
  },
  "edu-operation": {
    icon: "🎯",
    label: "교육 운영",
    desc: "교육과정을 기획하거나 운영하는 경우",
  },
  "result-only": {
    icon: "📝",
    label: "결과만 등록",
    desc: "이미 수료한 교육의 결과를 등록",
  },
};

// ── BO _BAM_EDU_TREE와 1:1 대응하는 FO 공유 교육유형 트리 ──
// edu_types 배열에서 목적 카테고리를 역매핑하고, 하위 세부유형을 필터링하는 데 사용
const _FO_EDU_TREE = [
  { group: 'learner', icon: '📚', label: '직접 학습', color: '#7C3AED',
    categories: [
      { id: 'regular', label: '정규교육', icon: '📚',
        types: ['l_elearning','l_class','live'] },
      { id: 'academic', label: '학술 및 연구활동', icon: '🎓',
        types: ['conf','l_seminar','acad_study'] },
      { id: 'knowledge', label: '지식자원 학습', icon: '📖',
        types: ['book','journal','tech_resource'] },
      { id: 'competency', label: '역량개발지원', icon: '🏆',
        types: ['lang','cert','assoc'] },
      { id: 'etc', label: '기타', icon: '📌',
        types: ['teach','l_team_build'] },
    ]},
  { group: 'operator', icon: '🎯', label: '교육 운영', color: '#1D4ED8',
    categories: [
      { id: 'elearning_class', label: '이러닝/집합(비대면) 운영', icon: '🖥',
        types: ['elearning','class'] },
      { id: 'conf_seminar', label: '워크샵/세미나/콘퍼런스 운영', icon: '👥',
        types: ['conference','seminar','teambuilding','cert_maintain','system_link'] },
      { id: 'misc_ops', label: '기타 운영', icon: '📌',
        types: ['course_dev','material_dev','video_prod','facility'] },
    ]},
];

// 정책 기반 교육 목적 목록 반환
// ★ 1순위: budget_accounts.edu_types → _FO_EDU_TREE 역매핑 (B방향: 개별 카드)
// ★ 2순위: service_policies (레거시 호환)
function getPersonaPurposes(persona) {
  // ── 1순위: budget_accounts.edu_types → _FO_EDU_TREE 역매핑 ──
  const budgets = persona.budgets || [];
  const allEduTypes = new Set();
  budgets.forEach(b => (b.eduTypes || []).forEach(t => allEduTypes.add(t)));
  const hasEduTypes = allEduTypes.size > 0;

  if (hasEduTypes) {
    const purposes = [];
    _FO_EDU_TREE.forEach(group => {
      group.categories.forEach(cat => {
        // 이 카테고리의 세부유형 중 하나라도 budget의 eduTypes에 포함되면 활성
        const activeTypes = cat.types.filter(t => allEduTypes.has(t));
        if (activeTypes.length > 0) {
          purposes.push({
            id: cat.id,
            label: cat.label,
            icon: cat.icon,
            desc: cat.desc,
            subtypes: [], // Step3에서 동적 생성
            accounts: [],
            category: group.group === 'learner' ? 'self-learning' : 'edu-operation',
            _activeTypes: activeTypes, // 활성 세부유형 (Step3 필터링용)
            _groupLabel: group.label,
          });
        }
      });
    });
    if (purposes.length > 0) {
      console.log(`[getPersonaPurposes] edu_types 기반 ${purposes.length}건 목적 로드 (B방향)`);
      return purposes;
    }
  }

  // ── 2순위: service_policies (레거시 호환) ──
  const result = _getActivePolicies(persona);
  if (result) {
    const { source, policies } = result;
    if (source === "db") {
      console.log(
        `[getPersonaPurposes] ${persona.name}: vorg 매칭 정책 ${policies.length}건 (legacy)`,
      );
      const foPurposeIds = [
        ...new Set(
          policies
            .map((p) => _BO_TO_FO_PURPOSE[p.purpose] || p.purpose)
            .filter(Boolean),
        ),
      ];
      const purposes = PURPOSES.filter((p) => foPurposeIds.includes(p.id)).map(
        (p) => ({
          ...p,
          category: _PURPOSE_CATEGORY[p.id] || "edu-operation",
        }),
      );
      foPurposeIds.forEach((pid) => {
        if (!purposes.find((p) => p.id === pid)) {
          const dbPurpose =
            (typeof EDU_PURPOSE_MAP !== "undefined" && EDU_PURPOSE_MAP[pid]) ||
            (typeof EDU_PURPOSE_GROUPS !== "undefined" &&
              Array.isArray(EDU_PURPOSE_GROUPS) &&
              EDU_PURPOSE_GROUPS.find((g) => g.id === pid));
          if (dbPurpose) {
            purposes.push({
              id: dbPurpose.id, label: dbPurpose.label, icon: dbPurpose.icon || "📌",
              desc: dbPurpose.description || "", subtypes: dbPurpose.subtypes || [], accounts: [],
              category: _PURPOSE_CATEGORY[pid] || "edu-operation",
            });
          }
        }
      });
      return purposes;
    }
    const activePurposeIds = [...new Set(policies.map((p) => p.foPurpose))];
    return PURPOSES.filter((p) => activePurposeIds.includes(p.id)).map((p) => ({
      ...p,
      category: _PURPOSE_CATEGORY[p.id] || "edu-operation",
    }));
  }
  // Fallback: 빈 배열 (budget_accounts에 purpose_types 미설정, service_policies도 없음)
  if ((typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length > 0) || hasPurposeTypes === false) {
    console.warn("[getPersonaPurposes] 매칭 0건 → 빈 배열");
    return [];
  }
  const base = (() => {
    if (!persona.allowedAccounts || persona.allowedAccounts.includes("*"))
      return PURPOSES;
    const allowedTypes = (persona.allowedAccounts || [])
      .map((code) => ACCOUNT_TYPE_MAP[code])
      .filter(Boolean);
    return PURPOSES.filter(
      (p) =>
        !p.accounts || p.accounts.some((acc) => allowedTypes.includes(acc)),
    );
  })();
  return base
    .filter((p) => p.id !== "misc_ops" && p.id !== "_result_only")
    .map((p) => ({
      ...p,
      category: _PURPOSE_CATEGORY[p.id] || "edu-operation",
    }));
}

// 선택된 목적 + 예산 계정에 허용된 교육유형 목록 반환 (Step3용)
// ★ 1순위: budget.eduTypes + _FO_EDU_TREE 카테고리 교차 필터 (B방향)
// ★ 2순위: service_policies (레거시 호환)
function getPolicyEduTypes(persona, purposeId, budgetAccountType) {
  // ── 1순위: budget.eduTypes + _FO_EDU_TREE 역매핑 ──
  const budgets = persona.budgets || [];
  let targetBudget = null;
  if (budgetAccountType) {
    targetBudget = budgets.find(b => {
      if (/^[A-Z]+-/.test(budgetAccountType)) return b.accountCode === budgetAccountType;
      return b.account === budgetAccountType;
    });
  }
  // targetBudget이 없으면 모든 budgets의 eduTypes 합산
  const budgetEduTypes = targetBudget
    ? new Set(targetBudget.eduTypes || [])
    : (() => { const s = new Set(); budgets.forEach(b => (b.eduTypes || []).forEach(t => s.add(t))); return s; })();

  if (budgetEduTypes.size > 0 && purposeId) {
    // _FO_EDU_TREE에서 purposeId에 해당하는 카테고리 찾기
    let catTypes = null;
    for (const group of _FO_EDU_TREE) {
      const cat = group.categories.find(c => c.id === purposeId);
      if (cat) { catTypes = cat.types; break; }
    }
    if (catTypes) {
      // 카테고리의 types와 budget의 eduTypes 교차
      const intersection = catTypes.filter(t => budgetEduTypes.has(t));
      if (intersection.length > 0) {
        console.log(`[getPolicyEduTypes] edu_types+_FO_EDU_TREE 기반: ${purposeId}+${budgetAccountType} → ${intersection.join(',')}`);
        return intersection;
      }
    }
    // purposeId가 레거시 코드(external_personal 등)인 경우 — 레거시 매핑 시도
    const legacyPurposeKeys = _FO_TO_BO_PURPOSE[purposeId] || [purposeId];
    for (const group of _FO_EDU_TREE) {
      for (const cat of group.categories) {
        if (legacyPurposeKeys.includes(cat.id)) {
          const intersection = cat.types.filter(t => budgetEduTypes.has(t));
          if (intersection.length > 0) return intersection;
        }
      }
    }
  }

  // ── 2순위: service_policies (레거시 호환) ──
  const result = _getActivePolicies(persona);
  if (result && purposeId) {
    const { source, policies } = result;
    if (source === "db") {
      const boPurposeKeys = _FO_TO_BO_PURPOSE[purposeId] || [purposeId];
      let acctCodeForType = null;
      if (budgetAccountType && /^[A-Z]+-/.test(budgetAccountType)) {
        acctCodeForType = budgetAccountType;
      } else if (budgetAccountType) {
        const directBudget = budgets.find((b) => b.account === budgetAccountType);
        acctCodeForType =
          directBudget?.accountCode ||
          Object.entries(ACCOUNT_TYPE_MAP).find(([, v]) => v === budgetAccountType)?.[0] || null;
      }
      const matched = policies.filter((p) => {
        if (!boPurposeKeys.includes(p.purpose)) return false;
        const pAcctCodes = p.account_codes || p.accountCodes || [];
        if (acctCodeForType && pAcctCodes.length && !pAcctCodes.includes(acctCodeForType)) return false;
        return true;
      });
      if (matched.length > 0) {
        const types = [];
        matched.forEach((p) => {
          const sei = p.selected_edu_item || p.selectedEduItem;
          if (sei?.subId) { types.push(sei.subId); }
          else if (sei?.typeId) { types.push(sei.typeId); }
          else { (p.edu_types || p.eduTypes || []).forEach((t) => types.push(t)); }
        });
        console.log(`[getPolicyEduTypes] service_policies 기반 (legacy): ${purposeId}+${budgetAccountType} → ${types.join(',')}`);
        return [...new Set(types)];
      }
      return [];
    } else {
      const matched = policies.filter(
        (p) => p.foPurpose === purposeId && p.accountType === budgetAccountType,
      );
      if (matched.length > 0)
        return [...new Set(matched.flatMap((p) => p.allowedEduTypes || []))];
    }
  }
  return [];
}

// ── 교육유형 트리 반환 (Step3 트리 렌더링용) ──
// 반환값: [{ id, label, subs: [{key, label}] }]
// subs가 비어 있으면 해당 eduType이 리프 노드 (교육운영용)
// subs가 있으면 세부유형 선택 필요 (직접학습용)
function getPolicyEduTree(persona, purposeId, budgetAccountType) {
  const eduTypes = getPolicyEduTypes(persona, purposeId, budgetAccountType);
  if (eduTypes.length === 0) return [];

  return eduTypes.map((t) => {
    const label =
      (typeof EDU_TYPE_LABELS !== "undefined" && EDU_TYPE_LABELS[t]) || t;
    // 세부항목 레벨 키(elearning, class 등)이면 상위 subtypes 확장 불필요 → 리프 노드
    const parentSubs =
      (typeof EDU_TYPE_SUBTYPES !== "undefined" && EDU_TYPE_SUBTYPES[t]) || [];
    // 이미 세부 레벨 키인지 확인: EDU_TYPE_SUBTYPES에 상위로 존재하지 않으면 리프
    const isLeafKey = parentSubs.length === 0;
    return {
      id: t,
      label,
      subs: isLeafKey
        ? []
        : parentSubs.map((s) => ({ key: s.key, label: s.label })),
    };
  });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────

function navigate(page) {
  currentPage = page;
  // URL hash에 현재 페이지 저장 → 새로고침 시 복원
  if (typeof window !== "undefined") window.location.hash = page;
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".top-nav-item")
    .forEach((n) => n.classList.remove("active"));
  const pg = document.getElementById("page-" + page);
  if (pg) {
    pg.classList.add("active");
    pg.classList.add("fade-in");
  }
  const activeNav = page === "apply" ? "history" : page;
  const ni = document.getElementById("nav-" + activeNav);
  if (ni) ni.classList.add("active");
  if (page === "dashboard") renderDashboard();
  if (page === "plans") renderPlans();
  if (page === "history") renderHistory();
  if (page === "budget") renderBudget();
  if (page === "apply") {
    applyViewMode = "list";
    renderApply();
  }
  if (page === "result") {
    if (typeof renderResult === "function") renderResult();
  }
  if (page === "mypage") renderMypage();
  if (page === "fo-manual") renderFoManual();
  if (page === "approval-member") renderApprovalMember();
  if (page === "approval-leader") renderApprovalLeader();
  renderGNB();
}

// 새로고침 시 hash 복원
function _restorePageFromHash() {
  const hash = (window.location.hash || "").replace("#", "");
  if (hash && document.getElementById("page-" + hash)) return hash;
  return "dashboard";
}

// ─── BO 역할 판별 유틸 (E-1: edu_support_operations_role_design.md 기반) ──────
//
// 역할 체계:
//   총괄담당자 (Global Admin)  : 전체 교육조직 관할, 최종 승인권
//   운영담당자 (Op Manager)    : 담당 교육조직만 관할, 1차 검토/상신
//   플랫폼 어드민              : 시스템 전체 권한 (총괄담당자 상위)
//
// 판별 기준: boCurrentPersona.role 또는 persona.role
// 가능한 role 값: 'platform_admin' | 'budget_global_admin' | 'budget_op_manager' | 'tenant_admin'

/**
 * 총괄담당자 여부 판별
 * - platform_admin, tenant_admin, budget_global_admin → true
 * - budget_op_manager → false
 * @param {object} persona - BO 페르소나 (boCurrentPersona)
 * @returns {boolean}
 */
function isGlobalAdmin(persona) {
  if (!persona) return false;
  const role = persona.role || persona.boRole || '';
  // platform_admin / tenant_admin 은 총괄담당자 이상
  if (['platform_admin', 'tenant_admin', 'budget_global_admin'].includes(role)) return true;
  // ownedAccounts가 있으면 총괄담당자(계정 오너 = 총괄)
  if ((persona.ownedAccounts || []).length > 0) return true;
  return false;
}

/**
 * 운영담당자(VOrg Manager) 여부 판별
 * - budget_op_manager 또는 managedVorgId가 있는 경우 → true
 * - 총괄담당자이면서 managedVorgId도 있는 경우 → true (겸직 허용)
 * @param {object} persona - BO 페르소나
 * @returns {boolean}
 */
function isOpManager(persona) {
  if (!persona) return false;
  const role = persona.role || persona.boRole || '';
  if (role === 'budget_op_manager') return true;
  // managedVorgId가 있으면 VOrg 담당자 (isVorgManager와 동일)
  if (persona.managedVorgId) return true;
  return false;
}

/**
 * 역할 기반 관할 필터 적용
 * 운영담당자이면 자신의 managedVorgId에 해당하는 항목만 반환,
 * 총괄담당자이면 전체 반환.
 *
 * @param {Array} items     - 필터링할 배열 (plan, application, result 등)
 * @param {object} persona  - BO 페르소나
 * @param {string} orgField - items의 어떤 필드로 교육조직 매칭할지 (기본: 'vorg_id' | 'vorgId')
 * @param {Array}  vorgTeamNames - 운영담당자 관할 VOrg의 팀명 목록 (applyRoleFilter 내에서 자동 계산)
 * @returns {Array} - 필터링된 배열
 */
function applyRoleFilter(items, persona, orgField) {
  if (!items || !items.length) return items;

  // 총괄담당자면 전체 반환
  if (isGlobalAdmin(persona) && !isOpManager(persona)) return items;

  // 운영담당자 관할 VOrg 확인
  const managedVorgId = persona.managedVorgId || persona.scope_vorg_id;
  if (!managedVorgId) return items; // 관할 없으면 전체 (안전 폴백)

  // VIRTUAL_EDU_ORGS에서 관할 VOrg의 팀명 목록 추출
  let teamNames = null;
  if (typeof VIRTUAL_EDU_ORGS !== 'undefined') {
    const vorg = VIRTUAL_EDU_ORGS
      .flatMap(t => [
        ...(t.tree?.hqs || []),
        ...(t.tree?.centers || []),
      ])
      .find(vg => vg.id === managedVorgId);
    if (vorg) {
      teamNames = (vorg.teams || []).map(t => t.name);
    }
  }

  if (!teamNames) return items; // VOrg 정보 없으면 전체 폴백

  // orgField로 팀명 매칭
  const field = orgField || 'org_name';
  return items.filter(item => {
    const orgName = item[field] || item['org_name'] || item['orgName'] || item['team_name'] || '';
    return teamNames.some(tn =>
      orgName.includes(tn) || tn.includes(orgName)
    );
  });
}

/**
 * 역할 표시 라벨 반환 (UI용)
 * @param {object} persona
 * @returns {string}
 */
function getRoleLabel(persona) {
  if (!persona) return '—';
  const role = persona.role || persona.boRole || '';
  if (role === 'platform_admin') return '플랫폼 관리자';
  if (role === 'tenant_admin') return '테넌트 관리자';
  if (role === 'budget_global_admin' || isGlobalAdmin(persona)) return '총괄담당자';
  if (role === 'budget_op_manager' || isOpManager(persona)) return '운영담당자';
  return role || '—';
}

