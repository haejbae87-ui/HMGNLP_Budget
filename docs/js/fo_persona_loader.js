// ─── FO Persona Loader — DB 기반 학습자 정보 동적 로드 ────────────────────────
// data.js의 PERSONAS 슬림 식별자 + DB org_budget_bankbooks → allowedAccounts + budgets 동적 구성

const _FO_SUPABASE_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const _FO_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaHNvamh1Y2dtY2RmcHVmb25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDYwMzYsImV4cCI6MjA4OTk4MjAzNn0.bMm4x7evqtapkBgnn4xeIwDkV574eu2hBoBtXMTQdq4';

/** Supabase 클라이언트 (FO 전용, _sb()와 독립) */
function _foSb() {
    if (typeof supabase !== 'undefined') {
        return supabase.createClient(_FO_SUPABASE_URL, _FO_SUPABASE_KEY);
    }
    return null;
}

/**
 * DB에서 학습자의 조직 기반 allowedAccounts + budgets 동적 로드
 * @param {object} persona - data.js의 슬림 페르소나 {orgId, tenantId, ...}
 * @returns {object} allowedAccounts, budgets 가 채워진 persona
 */
async function _initCurrentPersona(persona) {
    if (!persona.orgId || !persona.tenantId) {
        console.warn('[FO Persona Loader] orgId 없음 → mock 데이터 유지:', persona.persona_key || persona.id);
        return persona;
    }

    const sb = _foSb();
    if (!sb) {
        console.warn('[FO Persona Loader] Supabase 클라이언트 없음');
        return persona;
    }

    try {
        // 1. 내 팀 직접 통장 조회
        const { data: directBbs, error: e1 } = await sb
            .from('org_budget_bankbooks')
            .select(`
        id, org_name, org_type, parent_org_id,
        account_id, template_id, vorg_group_id
      `)
            .eq('org_id', persona.orgId)
            .eq('tenant_id', persona.tenantId);
        if (e1) throw e1;

        // 2. 계정 코드 + 정책 조회
        const accountIds = [...new Set((directBbs || []).map(bb => bb.account_id))];
        let accountMap = {}, policyMap = {};
        if (accountIds.length > 0) {
            const { data: accts } = await sb.from('budget_accounts')
                .select('id, code, name, uses_budget, active')
                .in('id', accountIds)
                .eq('active', true);
            (accts || []).forEach(a => { accountMap[a.id] = a; });

            const { data: policies } = await sb.from('budget_account_org_policy')
                .select('budget_account_id, bankbook_mode, bankbook_level')
                .in('budget_account_id', accountIds);
            (policies || []).forEach(p => { policyMap[p.budget_account_id] = p; });
        }

        // 3. 현재 기간 예산 배정 조회
        const bbIds = (directBbs || []).map(bb => bb.id);
        let allocMap = {};
        if (bbIds.length > 0) {
            const { data: allocs } = await sb.from('budget_allocations')
                .select('bankbook_id, allocated_amount, used_amount, frozen_amount')
                .in('bankbook_id', bbIds)
                .order('created_at', { ascending: false });
            // 통장별 최신 배정만 사용
            (allocs || []).forEach(a => {
                if (!allocMap[a.bankbook_id]) allocMap[a.bankbook_id] = a;
            });
        }

        // 4. allowedAccounts + budgets 구성
        const allowedAccounts = [];
        const budgets = [];

        for (const bb of (directBbs || [])) {
            const acct = accountMap[bb.account_id];
            if (!acct || !acct.uses_budget) continue;  // 미사용 계정 제외
            if (allowedAccounts.includes(acct.code)) continue;

            const policy = policyMap[bb.account_id];
            const alloc = allocMap[bb.id];
            const balance = Number(alloc?.allocated_amount || 0);
            const used = Number(alloc?.used_amount || 0);
            const frozen = Number(alloc?.frozen_amount || 0);
            const mode = policy?.bankbook_mode || 'isolated';

            allowedAccounts.push(acct.code);
            budgets.push({
                id: bb.id,
                name: `${bb.org_name} ${acct.name}`,
                account: acct.name.replace('일반-', '').replace('계정', '').trim(),
                balance,
                used,
                frozen,
                bankbookMode: mode,
                parentOrgName: mode === 'shared' ? bb.org_name : null,
            });
        }

        // 5. shared 모드: 내 통장 없는 계정은 상위 조직 통장에서 탐색
        if (persona.orgHqId && persona.orgHqId !== persona.orgId) {
            const { data: hqBbs } = await sb
                .from('org_budget_bankbooks')
                .select('id, org_name, account_id')
                .eq('org_id', persona.orgHqId)
                .eq('tenant_id', persona.tenantId);
            const { data: hqPolicies } = await sb.from('budget_account_org_policy')
                .select('budget_account_id, bankbook_mode')
                .in('budget_account_id', (hqBbs || []).map(b => b.account_id));
            const hqPolicyMap = {};
            (hqPolicies || []).forEach(p => { hqPolicyMap[p.budget_account_id] = p; });

            for (const bb of (hqBbs || [])) {
                const acct = accountMap[bb.account_id] || await _fetchAccount(sb, bb.account_id);
                if (!acct || !acct.uses_budget) continue;
                if (allowedAccounts.includes(acct.code)) continue;
                const mode = hqPolicyMap[bb.account_id]?.bankbook_mode || 'isolated';
                if (mode !== 'shared') continue; // shared만 하위 팀이 사용 가능
                const alloc = allocMap[bb.id];
                allowedAccounts.push(acct.code);
                budgets.push({
                    id: bb.id,
                    name: `${bb.org_name} ${acct.name}`,
                    account: acct.name.replace('일반-', '').replace('계정', '').trim(),
                    balance: Number(alloc?.allocated_amount || 0),
                    used: Number(alloc?.used_amount || 0),
                    frozen: Number(alloc?.frozen_amount || 0),
                    bankbookMode: 'shared',
                    parentOrgName: bb.org_name,
                });
            }
        }

        // 6. 예산 미사용 계정 조회 (uses_budget = false인 활성 계정 존재 시 COMMON-FREE 부여)
        const { data: freeAcct } = await sb.from('budget_accounts')
            .select('id')
            .eq('tenant_id', persona.tenantId)
            .eq('uses_budget', false)
            .eq('active', true)
            .limit(1);
        if (freeAcct && freeAcct.length > 0) {
            allowedAccounts.push('COMMON-FREE');
        }

        console.log(`[FO Persona Loader] ${persona.name} → 계정: ${allowedAccounts.join(', ')}`);
        return { ...persona, allowedAccounts, budgets };

    } catch (err) {
        console.error('[FO Persona Loader] 오류 → mock 폴백', err.message);
        return persona;
    }
}

/** 단일 계정 조회 헬퍼 */
async function _fetchAccount(sb, accountId) {
    const { data } = await sb.from('budget_accounts')
        .select('id, code, name, uses_budget, active')
        .eq('id', accountId).single();
    return data;
}

/**
 * 페르소나 전환 시 호출 — currentPersona 갱신 후 화면 재렌더링
 * @param {string} personaKey - PERSONAS 키 (예: 'hmc_learner')
 */
async function switchPersonaAndReload(personaKey) {
    if (!PERSONAS[personaKey]) return;
    // 로딩 표시
    const widget = document.getElementById('floating-budget');
    if (widget) widget.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 0;color:#9CA3AF;font-size:11px;font-weight:700">
      <div style="width:14px;height:14px;border:2px solid #D1D5DB;border-top-color:#007AFF;border-radius:50%;animation:spin .6s linear infinite"></div>
      예산 정보 로딩 중...
    </div>`;
    // DB에서 persona 정보 로드
    currentPersona = await _initCurrentPersona(PERSONAS[personaKey]);
    sessionStorage.setItem('currentPersona', personaKey);
    // 화면 갱신
    if (typeof renderGNB === 'function') renderGNB();
    if (typeof renderFloatingBudget === 'function') renderFloatingBudget();
    if (typeof navigate === 'function') navigate(currentPage || 'dashboard');
}

/** CSS 스피너 애니메이션 주입 */
(function () {
    if (!document.getElementById('fo-loader-style')) {
        const s = document.createElement('style');
        s.id = 'fo-loader-style';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }
})();
