/**
 * FO 동적 양식 연동 테스트 (fetch 기반)
 * BO form_templates → FO 계획/신청/결과 Step4에 올바르게 반영되는지 검증
 *
 * 실행: node tests/fo_dynamic_form.test.mjs
 */

const SB_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const SB_KEY = 'sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE';

let pass = 0, fail = 0;
function assert(cond, msg) {
    if (cond) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.log(`  ❌ FAIL: ${msg}`); }
}

// ─── Supabase REST fetch ────────────────────────────────────────────────────
async function sbFetch(table, params = '') {
    const url = `${SB_URL}/rest/v1/${table}?${params}`;
    const res = await fetch(url, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    return res.json();
}

// ─── 테스트 실행 ────────────────────────────────────────────────────────────
(async () => {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  FO 동적 양식 연동 테스트 (fo_dynamic_form.test.mjs)       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const policies = await sbFetch('service_policies', 'select=*');
    const templates = await sbFetch('form_templates', 'select=*&active=eq.true');
    const fieldDefs = await sbFetch('field_definitions', 'select=*&active=eq.true&order=sort_order');

    assert(policies.length > 0, `service_policies 로드 (${policies.length}건)`);
    assert(templates.length > 0, `form_templates 로드 (${templates.length}건)`);
    assert(fieldDefs.length > 0, `field_definitions 로드 (${fieldDefs.length}건)`);

    // ══ TC1: stage_form_ids → form_templates 참조무결성 ═══════════════════════
    console.log('\n── TC1: stage_form_ids → form_templates 참조무결성 ──');
    for (const pol of policies) {
        const sfi = pol.stage_form_ids || {};
        for (const stage of ['plan', 'apply', 'result']) {
            for (const fid of (sfi[stage] || [])) {
                const found = templates.find(t => t.id === fid);
                assert(!!found, `[${pol.name}] ${stage} → ${fid} 존재`);
                if (found) assert(found.type === stage, `  type='${found.type}' === '${stage}'`);
            }
        }
    }

    // ══ TC2: form_templates.fields → field_definitions 키 매핑 ════════════════
    console.log('\n── TC2: fields → field_definitions 키 매핑 ──');
    for (const tpl of templates) {
        for (const f of (tpl.fields || [])) {
            const def = fieldDefs.find(d => d.key === f.key);
            assert(!!def, `[${tpl.name}] '${f.key}' → field_def 존재`);
        }
    }

    // ══ TC3: scope=back 필드 FO 숨김 ══════════════════════════════════════════
    console.log('\n── TC3: scope=back 필드 FO 숨김 ──');
    for (const tpl of templates) {
        const fields = tpl.fields || [];
        const front = fields.filter(f => !f.scope || f.scope === 'front');
        const back = fields.filter(f => f.scope === 'back');
        if (back.length > 0) {
            console.log(`  📋 ${tpl.name}: front=${front.length}, back=${back.length}`);
            for (const bf of back) {
                assert(!front.some(ff => ff.key === bf.key), `  '${bf.key}'(back) not in front`);
            }
        }
    }

    // ══ TC4-1: 현대차-일반-운영-이러닝 (3단계 모두 양식) ══════════════════════
    console.log('\n── TC4: 정책별 양식 매칭 ──');
    const polOpsE = policies.find(p => p.name === '현대차-일반-운영-이러닝');
    if (polOpsE) {
        const sfi = polOpsE.stage_form_ids || {};
        assert(sfi.plan?.length > 0, `[운영-이러닝] plan 양식 있음`);
        assert(sfi.apply?.length > 0, `[운영-이러닝] apply 양식 있음`);
        assert(sfi.result?.length > 0, `[운영-이러닝] result 양식 있음`);
        const pt = templates.find(t => t.id === sfi.plan[0]);
        if (pt) {
            const fk = (pt.fields || []).filter(f => f.scope === 'front').map(f => f.key);
            assert(fk.includes('교육목적'), `  plan: '교육목적'`);
            assert(fk.includes('예상비용'), `  plan: '예상비용'`);
            assert(fk.includes('참여자명단'), `  plan: '참여자명단'`);
        }
        const at = templates.find(t => t.id === sfi.apply[0]);
        if (at) {
            const fk = (at.fields || []).filter(f => f.scope === 'front').map(f => f.key);
            assert(fk.includes('교육비'), `  apply: '교육비'`);
        }
    }

    // ══ TC4-2: 세미나 (3단계 양식 + 세부산출근거) ═════════════════════════════
    const polSem = policies.find(p => p.name === '현대 - 일반 - 운영 - 세미나');
    if (polSem) {
        const sfi = polSem.stage_form_ids || {};
        assert(sfi.plan?.length > 0, `[세미나] plan 양식 있음`);
        const pt = templates.find(t => t.id === sfi.plan[0]);
        if (pt) {
            const fk = (pt.fields || []).filter(f => f.scope === 'front').map(f => f.key);
            assert(fk.includes('세부산출근거'), `  plan: '세부산출근거'`);
            assert(fk.includes('교육기간'), `  plan: '교육기간'`);
        }
    }

    // ══ TC4-3: R&D 학습자 이러닝 (빈 stage_form_ids → fallback) ═══════════════
    const polRnd = policies.find(p => p.name === 'R&D 학습자 이러닝');
    if (polRnd) {
        const sfi = polRnd.stage_form_ids || {};
        assert(sfi.plan?.length > 0, `[R&D 학습자] plan stage_form_ids 연결됨`);
        assert(sfi.apply?.length > 0, `[R&D 학습자] apply stage_form_ids 연결됨`);
        assert(sfi.result?.length > 0, `[R&D 학습자] result stage_form_ids 연결됨`);
        const planTpl = templates.find(t => t.id === sfi.plan[0]);
        assert(planTpl?.name === 'R&D - 참가 - 계획 - 이러닝', `  plan: ${planTpl?.name}`);
        const applyTpl = templates.find(t => t.id === sfi.apply[0]);
        assert(applyTpl?.name === 'R&D - 참가 - 신청 - 이러닝', `  apply: ${applyTpl?.name}`);
        const resultTpl = templates.find(t => t.id === sfi.result[0]);
        assert(resultTpl?.name === 'R&D - 참가 - 결과 - 이러닝', `  result: ${resultTpl?.name}`);
    }

    // ══ TC5: field_type 렌더러 커버리지 ═══════════════════════════════════════
    console.log('\n── TC5: field_type 렌더러 커버리지 ──');
    const supported = new Set(['text', 'textarea', 'number', 'budget-linked', 'daterange', 'calc-grounds', 'file', 'user-search', 'rating', 'system']);
    const used = new Set();
    for (const t of templates)
        for (const f of (t.fields || [])) { const d = fieldDefs.find(x => x.key === f.key); if (d) used.add(d.field_type); }
    for (const t of used)
        assert(supported.has(t), `field_type '${t}' 렌더러`);

    // ══ TC6: 이O봉 계획 시나리오 ══════════════════════════════════════════════
    console.log('\n── TC6: 이O봉(R&D) 계획 수립 시나리오 ──');
    if (polRnd) {
        const sfi = polRnd.stage_form_ids || {};
        assert(sfi.plan?.length > 0, `[R&D 학습자] plan stage_form_ids 있음`);
        const t = templates.find(x => x.id === sfi.plan?.[0]);
        assert(t?.name === 'R&D - 참가 - 계획 - 이러닝', `양식: '${t?.name}'`);
        if (t) {
            const ff = (t.fields || []).filter(f => f.scope === 'front');
            assert(ff.length >= 1, `  front 필드 ${ff.length}개`);
            assert(ff.some(f => f.key === '교육목적'), `  '교육목적' 포함`);
            assert((t.fields || []).filter(f => f.scope === 'back').length === 0, `  back 필드 없음`);
        }
    }

    // ══ TC7: 운영 이러닝 신청 ═════════════════════════════════════════════════
    console.log('\n── TC7: 운영 이러닝 신청 양식 ──');
    if (polOpsE) {
        const t = templates.find(x => x.id === polOpsE.stage_form_ids?.apply?.[0]);
        assert(t?.name === '현대차-운영-신청-이러닝', `양식: '${t?.name}'`);
        if (t) {
            const ff = (t.fields || []).filter(f => f.scope === 'front');
            assert(ff.some(f => f.key === '예상비용'), `  '예상비용'`);
            const d = fieldDefs.find(x => x.key === '예상비용');
            assert(d?.field_type === 'budget-linked', `  type=budget-linked`);
        }
    }

    // ══ TC8: 세미나 결과 ══════════════════════════════════════════════════════
    console.log('\n── TC8: 세미나 결과 양식 ──');
    if (polSem) {
        const t = templates.find(x => x.id === polSem.stage_form_ids?.result?.[0]);
        assert(t?.name === '현대차-운영-결과-세미나', `양식: '${t?.name}'`);
        if (t) {
            const ff = (t.fields || []).filter(f => f.scope === 'front');
            assert(ff.some(f => f.key === '교육기간'), `  '교육기간' (daterange)`);
            assert(ff.some(f => f.key === '예상비용'), `  '예상비용' (budget-linked)`);
        }
    }

    // ══ TC9: R&D 신청 back 필드 숨김 ══════════════════════════════════════════
    console.log('\n── TC9: R&D 신청 back 필드 숨김 ──');
    const rndApply = templates.find(t => t.name === 'R&D - 참가 - 신청 - 이러닝');
    if (rndApply) {
        const back = (rndApply.fields || []).filter(f => f.scope === 'back');
        const front = (rndApply.fields || []).filter(f => !f.scope || f.scope === 'front');
        assert(back.length === 3, `back ${back.length}개`);
        assert(front.length === 4, `front ${front.length}개`);
        assert(back.some(f => f.key === 'ERP코드'), `  'ERP코드' back`);
        assert(back.some(f => f.key === '검토의견'), `  '검토의견' back`);
        assert(back.some(f => f.key === '관리자비고'), `  '관리자비고' back`);
    }

    // ══ TC10: 렌더 시뮬레이션 (세미나 계획) ═══════════════════════════════════
    console.log('\n── TC10: 렌더 시뮬레이션 ──');
    const semPlan = templates.find(t => t.name === '현대차-운영-계획-세미나');
    if (semPlan) {
        const fo = (semPlan.fields || []).filter(f => !f.scope || f.scope === 'front');
        assert(fo.length === 4, `FO 필드 ${fo.length}개`);
        for (const ff of fo) {
            const d = fieldDefs.find(x => x.key === ff.key);
            assert(!!d, `  '${ff.key}' → ${d?.field_type}`);
        }
        assert(fieldDefs.find(d => d.key === '교육목적')?.field_type === 'textarea', `  교육목적→textarea`);
        assert(fieldDefs.find(d => d.key === '교육기간')?.field_type === 'daterange', `  교육기간→daterange`);
        assert(fieldDefs.find(d => d.key === '예상비용')?.field_type === 'budget-linked', `  예상비용→budget-linked`);
        assert(fieldDefs.find(d => d.key === '세부산출근거')?.field_type === 'calc-grounds', `  세부산출근거→calc-grounds`);
    }

    // ═══ REPORT ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(62));
    console.log(`  TOTAL: ${pass + fail}  |  ✅ PASS: ${pass}  |  ❌ FAIL: ${fail}`);
    console.log('═'.repeat(62) + '\n');
    process.exit(fail > 0 ? 1 : 0);
})();
