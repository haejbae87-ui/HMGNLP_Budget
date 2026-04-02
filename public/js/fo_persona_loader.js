// ─── FO Persona Loader — DB 기반 학습자 정보 동적 로드 ────────────────────────
// 소스: users + user_roles + tenants + org_budget_bankbooks + budget_allocations

const _FO_SUPABASE_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const _FO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaHNvamh1Y2dtY2RmcHVmb25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDYwMzYsImV4cCI6MjA4OTk4MjAzNn0.bMm4x7evqtapkBgnn4xeIwDkV574eu2hBoBtXMTQdq4';

/** Supabase 클라이언트 (FO 전용) */
function _foSb() {
    if (typeof supabase !== 'undefined') {
        return supabase.createClient(_FO_SUPABASE_URL, _FO_SUPABASE_KEY);
    }
    return null;
}

// ─── GNB 스위처 / 페르소나 캐시 ────────────────────────────────────────────

/** DB에서 로드된 전체 학습자 캐시 */
let _FO_EMPLOYEES = [];

/** 테넌트 ID → 회사 이름 맵 */
let _FO_TENANT_MAP = {};

// ─── 직위 추론 (role_code + job_type 기반) ──────────────────────────────────

function _inferFOPos(roles, jobType) {
    if (roles.some(r => r.includes('hq_leader'))) return '본부장';
    if (roles.some(r => r.includes('division_leader'))) return '사업부장';
    if (roles.some(r => r.includes('center_leader'))) return '센터장';
    if (roles.some(r => r.includes('office_leader'))) return '실장';
    if (roles.some(r => r.includes('team_leader'))) return '팀장';
    if (jobType === 'research') return '연구원';
    return '팀원';
}

// ─── 전체 학습자 DB 로드 ────────────────────────────────────────────────────

/**
 * BO users + user_roles + tenants 에서 학습자 목록 로드
 * 학습자 기준: user_roles.role_code LIKE '%learner%'
 */
async function _loadAllEmployees() {
    const sb = _foSb();

    // 테넌트 맵 초기 구성 (PERSONAS mock 폴백)
    if (typeof PERSONAS !== 'undefined') {
        Object.values(PERSONAS).forEach(p => {
            if (p.tenantId && p.company) _FO_TENANT_MAP[p.tenantId] = p.company;
        });
    }

    if (!sb) {
        _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
        console.warn('[FO Loader] Supabase 없음 → PERSONAS mock 사용');
        return;
    }

    try {
        // 1. tenants 로드 → _FO_TENANT_MAP 갱신
        const { data: tenants } = await sb.from('tenants')
            .select('id, name').eq('active', true);
        (tenants || []).forEach(t => { _FO_TENANT_MAP[t.id] = t.name; });

        // 2. learner role 보유 user_id 수집
        const { data: learnerRoles, error: lrErr } = await sb.from('user_roles')
            .select('user_id, role_code, tenant_id')
            .or('role_code.like.%learner%,role_code.eq.learner');
        if (lrErr) throw lrErr;

        const learnerUserIds = [...new Set((learnerRoles || []).map(r => r.user_id))];
        if (learnerUserIds.length === 0) {
            _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
            return;
        }

        // 3. 해당 유저의 전체 역할 조회 (리더 판단 포함)
        const { data: allRoleRows } = await sb.from('user_roles')
            .select('user_id, role_code')
            .in('user_id', learnerUserIds);
        const fullRoleMap = {};
        (allRoleRows || []).forEach(r => {
            if (!fullRoleMap[r.user_id]) fullRoleMap[r.user_id] = [];
            fullRoleMap[r.user_id].push(r.role_code);
        });

        // 4. users 조회
        const { data: users, error: uErr } = await sb.from('users')
            .select('id, tenant_id, emp_no, name, org_id, job_type, status')
            .in('id', learnerUserIds)
            .eq('status', 'active')
            .order('tenant_id').order('name');
        if (uErr) throw uErr;

        // 5. organizations 이름 맵
        const orgIds = [...new Set((users || []).map(u => u.org_id).filter(Boolean))];
        let orgMap = {};
        if (orgIds.length > 0) {
            const { data: orgs } = await sb.from('organizations')
                .select('id, name').in('id', orgIds);
            (orgs || []).forEach(o => { orgMap[o.id] = o.name; });
        }

        // 6. _FO_EMPLOYEES 구성
        _FO_EMPLOYEES = (users || []).map(u => {
            const roles = fullRoleMap[u.id] || [];
            const isLeader = roles.some(r => r.includes('leader'));
            return {
                id: u.id,
                tenant_id: u.tenant_id,
                emp_no: u.emp_no,
                name: u.name,
                dept: orgMap[u.org_id] || '',
                pos: _inferFOPos(roles, u.job_type),
                job_type: u.job_type,
                org_id: u.org_id,
                persona_key: u.id,  // users.id = GNB 선택 키
                is_active: true,
                roles,
                is_leader: isLeader,
            };
        });

        console.log(`[FO Loader] ${_FO_EMPLOYEES.length}명 학습자 로드 완료 (DB users 기반)`);

    } catch (err) {
        console.error('[FO Loader] _loadAllEmployees 오류 → mock 폴백', err.message);
        _FO_EMPLOYEES = _mockEmployeesFromPERSONAS();
    }
}

/** PERSONAS mock → _FO_EMPLOYEES 형식 변환 (폴백용) */
function _mockEmployeesFromPERSONAS() {
    return Object.entries(PERSONAS || {}).map(([key, p]) => ({
        id: key, tenant_id: p.tenantId, emp_no: key,
        name: p.name, dept: p.dept || '', pos: p.pos || '팀원',
        job_type: p.jobType, org_id: p.orgId || null,
        persona_key: key, is_active: true, roles: [], is_leader: false,
    }));
}

// ─── 페르소나 초기화 ────────────────────────────────────────────────────────

/**
 * sessionStorage 저장된 키(users.id 또는 PERSONAS key)를 기반으로
 * currentPersona 초기화. main.js DOMContentLoaded에서 호출.
 */
async function _resolveCurrentPersona() {
    const savedKey = sessionStorage.getItem('currentPersona');

    // 1. PERSONAS mock 키인 경우
    if (savedKey && PERSONAS && PERSONAS[savedKey]) {
        return await _initCurrentPersona(PERSONAS[savedKey]);
    }

    // 2. users.id 기반 (DB users)
    if (savedKey && _FO_EMPLOYEES.length > 0) {
        const emp = _FO_EMPLOYEES.find(e => e.id === savedKey || e.persona_key === savedKey);
        if (emp) return await _buildPersonaFromEmployee(emp);
    }

    // 3. 기본값: 첫 번째 HMC 학습자 또는 첫 번째 PERSONAS
    const firstEmp = _FO_EMPLOYEES.find(e => e.tenant_id === 'HMC') || _FO_EMPLOYEES[0];
    if (firstEmp) {
        sessionStorage.setItem('currentPersona', firstEmp.id);
        return await _buildPersonaFromEmployee(firstEmp);
    }

    // 4. 최후 폴백: PERSONAS 첫 번째
    const firstPersona = PERSONAS && Object.values(PERSONAS)[0];
    return firstPersona || { name: '게스트', tenantId: 'HMC', allowedAccounts: [], budgets: [] };
}

/**
 * _FO_EMPLOYEES 항목 → currentPersona 기본 객체 구성 후 DB로 bankbooks 로드
 */
async function _buildPersonaFromEmployee(emp) {
    const base = {
        id: emp.id,
        name: emp.name,
        dept: emp.dept,
        pos: emp.pos || '',
        tenantId: emp.tenant_id,
        company: _FO_TENANT_MAP[emp.tenant_id] || emp.tenant_id,
        orgId: emp.org_id,
        orgHqId: null,  // 필요 시 조직 계층에서 추론
        jobType: emp.job_type,
        roles: emp.roles || [],
        isLeader: emp.is_leader || false,
        allowedAccounts: [],
        budgets: [],
    };
    // bankbooks + allocations로 allowedAccounts/budgets 로드
    return await _initCurrentPersona(base);
}

/**
 * 페르소나 전환: users.id 또는 PERSONAS key 모두 처리
 */
async function switchPersonaAndReload(key) {
    // 로딩 표시
    const widget = document.getElementById('floating-budget');
    if (widget) widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 0;color:#9CA3AF;font-size:11px;font-weight:700">
      <div style="width:14px;height:14px;border:2px solid #D1D5DB;border-top-color:#007AFF;border-radius:50%;animation:spin .6s linear infinite"></div>
      예산 정보 로딩 중...
    </div>`;

    // PERSONAS mock 우선
    if (PERSONAS && PERSONAS[key]) {
        currentPersona = await _initCurrentPersona(PERSONAS[key]);
        sessionStorage.setItem('currentPersona', key);
    } else {
        // DB users 기반
        const emp = _FO_EMPLOYEES.find(e => e.id === key || e.persona_key === key);
        if (!emp) {
            console.warn('[FO Loader] 페르소나 없음:', key);
            return;
        }
        sessionStorage.setItem('currentPersona', key);
        currentPersona = await _buildPersonaFromEmployee(emp);
    }

    if (typeof renderGNB === 'function') renderGNB();
    if (typeof renderFloatingBudget === 'function') renderFloatingBudget();
    if (typeof navigate === 'function') navigate(currentPage || 'dashboard');
}

// ─── org_budget_bankbooks 기반 allowedAccounts + budgets 로드 ───────────────

async function _initCurrentPersona(persona) {
    if (!persona.orgId || !persona.tenantId) {
        console.warn('[FO Loader] orgId 없음 → mock 유지:', persona.name);
        return persona;
    }
    const sb = _foSb();
    if (!sb) return persona;

    try {
        // 1. 내 팀 직접 통장 조회
        const { data: directBbs, error: e1 } = await sb
            .from('org_budget_bankbooks')
            .select('id, org_name, org_type, parent_org_id, account_id, template_id, vorg_group_id')
            .eq('org_id', persona.orgId)
            .eq('tenant_id', persona.tenantId);
        if (e1) throw e1;

        // 2. 계정 코드 + 정책 조회
        const accountIds = [...new Set((directBbs || []).map(bb => bb.account_id))];
        let accountMap = {}, policyMap = {};
        if (accountIds.length > 0) {
            const { data: accts } = await sb.from('budget_accounts')
                .select('id, code, name, uses_budget, active').in('id', accountIds).eq('active', true);
            (accts || []).forEach(a => { accountMap[a.id] = a; });

            const { data: policies } = await sb.from('budget_account_org_policy')
                .select('budget_account_id, bankbook_mode').in('budget_account_id', accountIds);
            (policies || []).forEach(p => { policyMap[p.budget_account_id] = p; });
        }

        // 3. 예산 배정 조회
        const bbIds = (directBbs || []).map(bb => bb.id);
        let allocMap = {};
        if (bbIds.length > 0) {
            const { data: allocs } = await sb.from('budget_allocations')
                .select('bankbook_id, allocated_amount, used_amount, frozen_amount')
                .in('bankbook_id', bbIds).order('created_at', { ascending: false });
            (allocs || []).forEach(a => { if (!allocMap[a.bankbook_id]) allocMap[a.bankbook_id] = a; });
        }

        // 4. allowedAccounts + budgets 구성
        //    예산 사용 계정 → allowedAccounts + budgets
        //    예산 미사용 계정 → allowedAccounts만 (정책 매칭용, 잔액 관리 불필요)
        const allowedAccounts = [];
        const budgets = [];
        for (const bb of (directBbs || [])) {
            const acct = accountMap[bb.account_id];
            if (!acct) continue;
            if (allowedAccounts.includes(acct.code)) continue;
            allowedAccounts.push(acct.code);
            if (!acct.uses_budget) continue; // 예산 미사용: 코드만 등록, budgets 스킵
            const policy = policyMap[bb.account_id];
            const alloc = allocMap[bb.id];
            const mode = policy?.bankbook_mode || 'isolated';
            budgets.push({
                id: bb.id,
                name: `${bb.org_name} ${acct.name}`,
                account: acct.name.replace('일반-', '').replace('계정', '').trim(),
                accountCode: acct.code,
                balance: Number(alloc?.allocated_amount || 0),
                used: Number(alloc?.used_amount || 0),
                frozen: Number(alloc?.frozen_amount || 0),
                bankbookMode: mode,
                parentOrgName: mode === 'shared' ? bb.org_name : null,
            });
        }

        // 5. 상위 조직 shared 통장 탐색
        if (persona.orgHqId && persona.orgHqId !== persona.orgId) {
            const { data: hqBbs } = await sb.from('org_budget_bankbooks')
                .select('id, org_name, account_id')
                .eq('org_id', persona.orgHqId).eq('tenant_id', persona.tenantId);
            const { data: hqPolicies } = await sb.from('budget_account_org_policy')
                .select('budget_account_id, bankbook_mode')
                .in('budget_account_id', (hqBbs || []).map(b => b.account_id));
            const hqPolicyMap = {};
            (hqPolicies || []).forEach(p => { hqPolicyMap[p.budget_account_id] = p; });

            for (const bb of (hqBbs || [])) {
                const acct = accountMap[bb.account_id] || await _fetchAccount(sb, bb.account_id);
                if (!acct) continue;
                if (allowedAccounts.includes(acct.code)) continue;
                if (!acct.uses_budget) {
                    // 예산 미사용 상위 계정: 코드만 등록
                    allowedAccounts.push(acct.code);
                    continue;
                }
                if (hqPolicyMap[bb.account_id]?.bankbook_mode !== 'shared') continue;
                allowedAccounts.push(acct.code);
                budgets.push({
                    id: bb.id, name: `${bb.org_name} ${acct.name}`,
                    account: acct.name.replace('일반-', '').replace('계정', '').trim(),
                    accountCode: acct.code,
                    balance: 0, used: 0, frozen: 0,
                    bankbookMode: 'shared', parentOrgName: bb.org_name,
                });
            }
        }

        // 6. 테넌트 전체 예산 미사용 계정 코드 추가 (통장 없이 정책 매칭용)
        const { data: freeAccts } = await sb.from('budget_accounts')
            .select('id, code').eq('tenant_id', persona.tenantId)
            .eq('uses_budget', false).eq('active', true);
        for (const fa of (freeAccts || [])) {
            if (!allowedAccounts.includes(fa.code)) allowedAccounts.push(fa.code);
        }

        console.log(`[FO Loader] ${persona.name} → 계정: ${allowedAccounts.join(', ')}`);
        return { ...persona, allowedAccounts, budgets };

    } catch (err) {
        console.error('[FO Loader] _initCurrentPersona 오류 → mock 폴백', err.message);
        return persona;
    }
}

/** 단일 계정 조회 헬퍼 */
async function _fetchAccount(sb, accountId) {
    const { data } = await sb.from('budget_accounts')
        .select('id, code, name, uses_budget, active').eq('id', accountId).single();
    return data;
}

// ─── CSS 스피너 ─────────────────────────────────────────────────────────────
(function () {
    if (!document.getElementById('fo-loader-style')) {
        const s = document.createElement('style');
        s.id = 'fo-loader-style';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }
})();
