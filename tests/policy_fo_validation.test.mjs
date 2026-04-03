/**
 * policy_fo_validation.test.mjs
 * BO 서비스 정책 → FO UI 노출 검증 자동화 테스트
 *
 * 설계 원칙:
 *   - 정책(service_policies)이 "어떤 교육을 할 수 있는가"를 결정
 *   - 통장(bankbook)은 "예산을 어디서 차감"하는 도구 (정책 노출 기준 아님)
 *
 * 실행: node tests/policy_fo_validation.test.mjs
 */

import assert from 'node:assert/strict';

// ─── 테스트 유틸 ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        results.push({ name, ok: true });
        console.log(`  ✅ ${name}`);
    } catch (e) {
        failed++;
        results.push({ name, ok: false, msg: e.message });
        console.log(`  ❌ ${name}`);
        console.log(`     → ${e.message}`);
    }
}

// ─── 핵심 상수 (utils.js에서 추출) ──────────────────────────────────────────

const ACCOUNT_TYPE_MAP = {
    'HMC-OPS': '운영', 'HMC-PART': '참가', 'HMC-ETC': '기타', 'HMC-RND': '연구투자',
    'KIA-OPS': '운영', 'KIA-PART': '참가',
    'COMMON-FREE': null,
};

const _BO_TO_FO_PURPOSE = {
    'internal_edu': 'internal_edu',
    'external_personal': 'external_personal',
    'external_group': 'external_group',
    'misc_ops': 'misc_ops',
};
const _FO_TO_BO_PURPOSE = {};
Object.entries(_BO_TO_FO_PURPOSE).forEach(([bo, fo]) => {
    if (!_FO_TO_BO_PURPOSE[fo]) _FO_TO_BO_PURPOSE[fo] = [];
    _FO_TO_BO_PURPOSE[fo].push(bo);
});

// ─── 픽스처: 서비스 정책 3개 ─────────────────────────────────────────────────

const FIXTURE_POLICIES = [
    {
        id: 'POL-A',
        status: 'active',
        tenant_id: 'HMC',
        domainId: 'VORG-RND',          // policy.domainId = persona.vorgId와 일치 기준
        purpose: 'external_personal',
        account_codes: ['HMC-RND'],
        targetType: 'learner',
        eduTypes: ['elearning'],
        selectedEduItem: { subId: 'elearning' },
    },
    {
        id: 'POL-B',
        status: 'active',
        tenant_id: 'HMC',
        domainId: 'VORG-GEN',
        purpose: 'external_group',
        account_codes: ['HMC-PART'],
        targetType: 'learner',
        eduTypes: ['regular'],
        selectedEduItem: null,
    },
    {
        id: 'POL-C',
        status: 'active',
        tenant_id: 'HMC',
        domainId: 'VORG-GEN',
        purpose: 'internal_edu',
        account_codes: ['HMC-OPS'],
        targetType: 'operator',
        eduTypes: ['class', 'live'],
        selectedEduItem: null,
    },
];

// ─── 픽스처: 페르소나 3종 ────────────────────────────────────────────────────

const PERSONA_RND = {
    name: '이O봉 (R&D)',
    tenantId: 'HMC',
    vorgId: 'VORG-RND',                       // R&D VOrg 소속
    allowedAccounts: ['HMC-RND'],             // 통장: R&D만
    budgets: [
        { id: 'BB-RND', name: '내구기술팀 R&D-통합계정', account: '연구투자', accountCode: 'HMC-RND' },
    ],
};

const PERSONA_GEN = {
    name: '일반직원',
    tenantId: 'HMC',
    vorgId: 'VORG-GEN',                       // 일반 VOrg 소속
    allowedAccounts: ['HMC-PART'],            // 통장: 참가계정만
    budgets: [
        { id: 'BB-PART', name: '내구기술팀 일반-참가계정', account: '참가', accountCode: 'HMC-PART' },
    ],
};

// 핵심 엣지케이스: vorgId=RND인데 HMC-PART 통장도 보유
const PERSONA_MULTI_BANKBOOK = {
    name: '복합통장 (RND+PART)',
    tenantId: 'HMC',
    vorgId: 'VORG-RND',                       // R&D VOrg 소속 (정책 기준)
    allowedAccounts: ['HMC-RND', 'HMC-PART'], // 통장: 두 계정 모두 보유
    budgets: [
        { id: 'BB-RND', name: '내구기술팀 R&D-통합계정', account: '연구투자', accountCode: 'HMC-RND' },
        { id: 'BB-PART', name: '내구기술팀 일반-참가계정', account: '참가', accountCode: 'HMC-PART' },
    ],
};

// ─── 테스트 대상 함수 (utils.js 로직 이식) ───────────────────────────────────

/**
 * _resolveVorgId: persona.vorgId → VORG_TEMPLATES에서 id 탐색
 * 테스트에서는 vorgId 직접 사용 (코드 직접 일치)
 */
function _resolveVorgId(persona, vorgTemplates = []) {
    if (!vorgTemplates.length) return persona.vorgId || null;
    const found = vorgTemplates.find(g => g.code === persona.vorgId || g.id === persona.vorgId);
    return found?.id || persona.vorgId || null;
}

/**
 * _getActivePolicies: 현재 버전 (통장 기반 교차매칭 우선)
 */
function _getActivePolicies_CURRENT(persona, policies) {
    if (!policies || policies.length === 0) return null;
    const vorgId = _resolveVorgId(persona);
    const allowedAcctCodes = new Set(persona.allowedAccounts || []);

    const matched = policies.filter(p => {
        const pStatus = p.status;
        const pTenantId = p.tenant_id || p.tenantId;
        const pDomainId = p.vorg_template_id || p.domainId;
        const pAcctCodes = p.account_codes || p.accountCodes || [];

        if (pStatus && pStatus !== 'active') return false;
        if (pTenantId && pTenantId !== persona.tenantId) return false;

        // ① allowedAccounts 교차매칭 (현재: 통장 기반, 우선순위)
        if (pAcctCodes.length > 0 && pAcctCodes.some(c => allowedAcctCodes.has(c))) return true;
        // ② vorgId 매칭
        if (vorgId && pDomainId && pDomainId === vorgId) return true;
        // ④ VOrg/account 미설정 정책
        if (!pDomainId && pAcctCodes.length === 0) return true;
        return false;
    });
    return matched.length > 0 ? { source: 'db', policies: matched } : null;
}

/**
 * _getActivePolicies: 수정 버전 (vorgId 기반 매칭 우선)
 */
function _getActivePolicies_FIXED(persona, policies) {
    if (!policies || policies.length === 0) return null;
    const vorgId = _resolveVorgId(persona);
    const allowedAcctCodes = new Set(persona.allowedAccounts || []);

    const matched = policies.filter(p => {
        const pStatus = p.status;
        const pTenantId = p.tenant_id || p.tenantId;
        const pDomainId = p.vorg_template_id || p.domainId;
        const pAcctCodes = p.account_codes || p.accountCodes || [];

        if (pStatus && pStatus !== 'active') return false;
        if (pTenantId && pTenantId !== persona.tenantId) return false;

        // ① vorgId 기반 매칭 (정책의 주 기준)
        if (vorgId && pDomainId && pDomainId === vorgId) return true;
        // ② allowedAccounts 교차매칭은 vorgId 미해석 시에만 폴백
        if (!vorgId && pAcctCodes.length > 0 && pAcctCodes.some(c => allowedAcctCodes.has(c))) return true;
        // ③ VOrg/account 미설정 정책 = 테넌트 전체 허용
        if (!pDomainId && pAcctCodes.length === 0) return true;
        return false;
    });
    return matched.length > 0 ? { source: 'db', policies: matched } : null;
}

/**
 * getPersonaBudgets: 정책 기반 예산 목록 반환
 */
function getPersonaBudgets(persona, purposeId, policies, implVersion = 'current') {
    const fn = implVersion === 'fixed' ? _getActivePolicies_FIXED : _getActivePolicies_CURRENT;
    const result = fn(persona, policies);
    if (result) {
        const { policies: matchedPolicies } = result;
        const boPurposeKeys = _FO_TO_BO_PURPOSE[purposeId] || [purposeId];
        const filtered = purposeId
            ? matchedPolicies.filter(p => boPurposeKeys.includes(p.purpose))
            : matchedPolicies;
        const allCodes = [...new Set(filtered.flatMap(p => p.account_codes || p.accountCodes || []))];
        // 수정 버전: !acctType 조건 제거
        return persona.budgets.filter(b =>
            allCodes.some(code => {
                const acctType = ACCOUNT_TYPE_MAP[code];
                return (acctType && acctType === b.account) || code === b.accountCode;
            })
        );
    }
    // Fallback
    const allowed = persona.allowedAccounts || [];
    if (allowed.includes('*')) return persona.budgets;
    const allowedTypes = allowed.map(code => ACCOUNT_TYPE_MAP[code]).filter(Boolean);
    return persona.budgets.filter(b => allowedTypes.includes(b.account));
}

/**
 * getPersonaPurposes: 정책 기반 교육 목적 반환
 */
function getPersonaPurposes(persona, policies, implVersion = 'current') {
    const fn = implVersion === 'fixed' ? _getActivePolicies_FIXED : _getActivePolicies_CURRENT;
    const result = fn(persona, policies);
    if (result) {
        const foPurposeIds = [...new Set(
            result.policies.map(p => _BO_TO_FO_PURPOSE[p.purpose] || p.purpose).filter(Boolean)
        )];
        return foPurposeIds;
    }
    return [];
}

/**
 * getPolicyEduTypes: 정책 기반 교육유형 반환
 */
function getPolicyEduTypes(persona, purposeId, budgetAccountType, policies, implVersion = 'current') {
    const fn = implVersion === 'fixed' ? _getActivePolicies_FIXED : _getActivePolicies_CURRENT;
    const result = fn(persona, policies);
    if (result && purposeId) {
        const boPurposeKeys = _FO_TO_BO_PURPOSE[purposeId] || [purposeId];
        const acctCodeForType = Object.entries(ACCOUNT_TYPE_MAP)
            .find(([, v]) => v === budgetAccountType)?.[0] || null;
        const matched = result.policies.filter(p => {
            if (!boPurposeKeys.includes(p.purpose)) return false;
            const pAcctCodes = p.account_codes || p.accountCodes || [];
            if (acctCodeForType && pAcctCodes.length && !pAcctCodes.includes(acctCodeForType)) return false;
            return true;
        });
        if (matched.length > 0) {
            const types = [];
            matched.forEach(p => {
                if (p.selectedEduItem?.subId) types.push(p.selectedEduItem.subId);
                else if (p.selectedEduItem?.typeId) types.push(p.selectedEduItem.typeId);
                else (p.eduTypes || []).forEach(t => types.push(t));
            });
            return [...new Set(types)];
        }
    }
    return [];
}

// ═══════════════════════════════════════════════════════════════════
// 모듈 1: _getActivePolicies — 정책 매칭 기준 검증
// ═══════════════════════════════════════════════════════════════════

console.log('\n📦 모듈 1: _getActivePolicies — 정책 매칭 기준\n');

test('TC-01 R&D 페르소나 → POL-A만 매칭 [both]', () => {
    const currentResult = _getActivePolicies_CURRENT(PERSONA_RND, FIXTURE_POLICIES);
    const fixedResult = _getActivePolicies_FIXED(PERSONA_RND, FIXTURE_POLICIES);
    assert.ok(currentResult, '현재: 매칭 결과 없음');
    assert.ok(fixedResult, '수정: 매칭 결과 없음');
    const currentIds = currentResult.policies.map(p => p.id).sort();
    const fixedIds = fixedResult.policies.map(p => p.id).sort();
    assert.deepEqual(currentIds, ['POL-A'], `현재: ${currentIds}`);
    assert.deepEqual(fixedIds, ['POL-A'], `수정: ${fixedIds}`);
});

test('TC-02 일반 페르소나 → POL-B + POL-C만 매칭 [both]', () => {
    const currentResult = _getActivePolicies_CURRENT(PERSONA_GEN, FIXTURE_POLICIES);
    const fixedResult = _getActivePolicies_FIXED(PERSONA_GEN, FIXTURE_POLICIES);
    assert.ok(currentResult && fixedResult, '매칭 결과 없음');
    const currentIds = currentResult.policies.map(p => p.id).sort();
    const fixedIds = fixedResult.policies.map(p => p.id).sort();
    assert.deepEqual(currentIds, ['POL-B', 'POL-C'], `현재: ${JSON.stringify(currentIds)}`);
    assert.deepEqual(fixedIds, ['POL-B', 'POL-C'], `수정: ${JSON.stringify(fixedIds)}`);
});

test('TC-03 복합통장 페르소나 → vorgId 기준 POL-A만 매칭 [FIXED ONLY]', () => {
    // 현재 버전은 이 테스트를 실패해야 함 (POL-A + POL-B 반환)
    const currentResult = _getActivePolicies_CURRENT(PERSONA_MULTI_BANKBOOK, FIXTURE_POLICIES);
    const currentIds = currentResult?.policies.map(p => p.id).sort() || [];
    // 현재 버전이 POL-B도 포함하면 버그 확인
    const currentHasBug = currentIds.includes('POL-B');

    const fixedResult = _getActivePolicies_FIXED(PERSONA_MULTI_BANKBOOK, FIXTURE_POLICIES);
    const fixedIds = fixedResult?.policies.map(p => p.id).sort() || [];
    assert.deepEqual(fixedIds, ['POL-A'], `수정버전: ${JSON.stringify(fixedIds)}`);
    if (currentHasBug) console.log(`     ⚠️  현재버전 버그 확인됨: ${JSON.stringify(currentIds)} (POL-B 포함)`);
});

test('TC-04 SERVICE_POLICIES 비어있으면 null 반환', () => {
    const result = _getActivePolicies_FIXED(PERSONA_RND, []);
    assert.equal(result, null);
});

test('TC-05 타 테넌트 정책은 매칭 안됨', () => {
    const otherTenantPolicy = [{ ...FIXTURE_POLICIES[0], tenant_id: 'KIA' }];
    const result = _getActivePolicies_FIXED(PERSONA_RND, otherTenantPolicy);
    assert.equal(result, null);
});

// ═══════════════════════════════════════════════════════════════════
// 모듈 2: getPersonaPurposes — 교육 목적 노출 검증
// ═══════════════════════════════════════════════════════════════════

console.log('\n📦 모듈 2: getPersonaPurposes — 교육 목적 노출\n');

test('TC-06 R&D 페르소나 → external_personal만 노출', () => {
    const purposes = getPersonaPurposes(PERSONA_RND, FIXTURE_POLICIES, 'fixed');
    assert.ok(purposes.includes('external_personal'), `external_personal 없음: ${purposes}`);
    assert.ok(!purposes.includes('external_group'), `external_group 있어선 안됨: ${purposes}`);
    assert.ok(!purposes.includes('internal_edu'), `internal_edu 있어선 안됨: ${purposes}`);
});

test('TC-07 일반 페르소나 → external_group + internal_edu 노출', () => {
    const purposes = getPersonaPurposes(PERSONA_GEN, FIXTURE_POLICIES, 'fixed');
    assert.ok(purposes.includes('external_group'), `external_group 없음: ${purposes}`);
    assert.ok(purposes.includes('internal_edu'), `internal_edu 없음: ${purposes}`);
    assert.ok(!purposes.includes('external_personal'), `external_personal 있어선 안됨: ${purposes}`);
});

test('TC-08 복합통장 페르소나 → vorgId 기준 external_personal만 노출 [FIXED ONLY]', () => {
    // 현재 버전 버그 확인
    const currentPurposes = getPersonaPurposes(PERSONA_MULTI_BANKBOOK, FIXTURE_POLICIES, 'current');
    const currentHasBug = currentPurposes.includes('external_group');

    const fixedPurposes = getPersonaPurposes(PERSONA_MULTI_BANKBOOK, FIXTURE_POLICIES, 'fixed');
    assert.ok(fixedPurposes.includes('external_personal'), `외부개인 없음: ${fixedPurposes}`);
    assert.ok(!fixedPurposes.includes('external_group'), `외부단체 있어선 안됨: ${fixedPurposes}`);
    if (currentHasBug) console.log(`     ⚠️  현재버전 버그 확인됨: external_group도 노출됨`);
});

// ═══════════════════════════════════════════════════════════════════
// 모듈 3: getPersonaBudgets — 예산계정 노출 검증
// ═══════════════════════════════════════════════════════════════════

console.log('\n📦 모듈 3: getPersonaBudgets — 예산계정 노출\n');

test('TC-09 R&D 페르소나 + external_personal → R&D 통장만', () => {
    const budgets = getPersonaBudgets(PERSONA_RND, 'external_personal', FIXTURE_POLICIES, 'fixed');
    assert.equal(budgets.length, 1, `예산 개수: ${budgets.length}`);
    assert.equal(budgets[0].accountCode, 'HMC-RND');
});

test('TC-10 R&D 페르소나 + external_personal → 참가계정 미포함', () => {
    const budgets = getPersonaBudgets(PERSONA_RND, 'external_personal', FIXTURE_POLICIES, 'fixed');
    const hasPart = budgets.some(b => b.accountCode === 'HMC-PART');
    assert.ok(!hasPart, `참가계정이 포함됨: ${JSON.stringify(budgets.map(b => b.accountCode))}`);
});

test('TC-11 일반 페르소나 + external_group → 참가계정만', () => {
    const budgets = getPersonaBudgets(PERSONA_GEN, 'external_group', FIXTURE_POLICIES, 'fixed');
    assert.equal(budgets.length, 1);
    assert.equal(budgets[0].accountCode, 'HMC-PART');
});

test('TC-12 복합통장 + external_personal → R&D 통장만 [FIXED ONLY]', () => {
    // 현재 버전 버그 확인
    const currentBudgets = getPersonaBudgets(PERSONA_MULTI_BANKBOOK, 'external_personal', FIXTURE_POLICIES, 'current');
    const currentHasBug = currentBudgets.some(b => b.accountCode === 'HMC-PART');

    const fixedBudgets = getPersonaBudgets(PERSONA_MULTI_BANKBOOK, 'external_personal', FIXTURE_POLICIES, 'fixed');
    assert.equal(fixedBudgets.length, 1, `예산 개수: ${fixedBudgets.length}`);
    assert.equal(fixedBudgets[0].accountCode, 'HMC-RND', `계정코드: ${fixedBudgets[0]?.accountCode}`);
    if (currentHasBug) console.log(`     ⚠️  현재버전 버그 확인됨: HMC-PART도 포함됨`);
});

// ═══════════════════════════════════════════════════════════════════
// 모듈 4: getPolicyEduTypes — 교육유형 노출 검증
// ═══════════════════════════════════════════════════════════════════

console.log('\n📦 모듈 4: getPolicyEduTypes — 교육유형 노출\n');

test('TC-13 R&D + external_personal + 연구투자 → elearning만', () => {
    const types = getPolicyEduTypes(PERSONA_RND, 'external_personal', '연구투자', FIXTURE_POLICIES, 'fixed');
    assert.deepEqual([...types].sort(), ['elearning'], `유형: ${types}`);
});

test('TC-14 일반 + external_group + 참가 → regular 하위(elearning/class/live)', () => {
    const types = getPolicyEduTypes(PERSONA_GEN, 'external_group', '참가', FIXTURE_POLICIES, 'fixed');
    // POL-B는 selectedEduItem 없고 eduTypes=['regular'] → regular 반환
    assert.ok(types.includes('regular'), `regular 없음: ${types}`);
});

test('TC-15 복합통장 + external_personal + 참가계정 선택 → 빈 배열 [정책-계정 불일치 차단]', () => {
    // VORG-RND 정책(POL-A)의 account_codes=['HMC-RND']
    // 참가계정('참가')으로 POL-A 필터링하면 매칭 없음 → 빈 배열
    const types = getPolicyEduTypes(PERSONA_MULTI_BANKBOOK, 'external_personal', '참가', FIXTURE_POLICIES, 'fixed');
    assert.equal(types.length, 0, `교육유형이 있어선 안됨: ${types}`);
});

test('TC-16 정책 없는 페르소나 → Fallback 빈 배열', () => {
    const noVorgPersona = { ...PERSONA_RND, vorgId: 'VORG-UNKNOWN', allowedAccounts: ['HMC-RND'] };
    const types = getPolicyEduTypes(noVorgPersona, 'external_personal', '연구투자', FIXTURE_POLICIES, 'fixed');
    // VORG-UNKNOWN과 매칭되는 정책 없고, allowedAccounts 폴백 없음(fixed) → 빈 배열
    assert.equal(types.length, 0, `예상치 못한 유형: ${types}`);
});

// ─── 결과 요약 ───────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(60));
console.log(`\n🔬 테스트 결과: ${passed}/${passed + failed} 통과\n`);

if (failed > 0) {
    console.log('❌ 실패한 테스트:');
    results.filter(r => !r.ok).forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.msg}`);
    });
    console.log('');
    process.exit(1);
} else {
    console.log('🎉 모든 테스트 통과!\n');
}
