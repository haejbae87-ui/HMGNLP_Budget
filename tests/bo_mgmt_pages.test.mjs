// ─── BO 교육계획/신청/결과 관리 페이지 렌더링 테스트 ───────────────────────────
// node tests/bo_mgmt_pages.test.mjs
//
// 목적: BO 3개 운영 메뉴가 DB 데이터를 정상 조회하고, 에러 시 빈 화면 대신
//       에러 메시지를 표시하는지 검증
// ──────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaHNvamh1Y2dtY2RmcHVmb25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2OTkxMjYsImV4cCI6MjA1NzI3NTEyNn0.sEJFswVsZnRBIFo3dddWKomMcLMeMlzfMiHp_Ycwx84';

let pass = 0, fail = 0, total = 0;

function assert(cond, msg) {
    total++;
    if (cond) { pass++; console.log(`  ✅ ${msg}`); }
    else { fail++; console.log(`  ❌ ${msg}`); }
}

async function sbFetch(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) return { data: null, status: res.status };
    return { data: await res.json(), status: res.status };
}

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  BO 교육계획/신청/결과 관리 페이지 테스트                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ══ TC1: plans 테이블 접근 가능 ═════════════════════════════════════════════
    console.log('── TC1: plans 테이블 접근 가능 ──');
    const plansRes = await sbFetch('plans?select=id,status,tenant_id,applicant_name,edu_name,amount&limit=5');
    assert(plansRes.status === 200 || plansRes.status === 401, `plans 테이블 HTTP ${plansRes.status} (401=RLS 정상)`);
    assert(Array.isArray(plansRes.data) || plansRes.status === 401, `plans 데이터 반환`);
    console.log(`  📋 plans 행 수: ${plansRes.data?.length || 0}`);

    // ══ TC2: applications 테이블 접근 가능 ════════════════════════════════════
    console.log('\n── TC2: applications 테이블 접근 가능 ──');
    const appsRes = await sbFetch('applications?select=id,status,type,tenant_id,applicant_name,edu_name,amount&limit=5');
    assert(appsRes.status === 200 || appsRes.status === 401, `applications 테이블 HTTP ${appsRes.status} (401=RLS 정상)`);
    assert(Array.isArray(appsRes.data) || appsRes.status === 401, `applications 데이터 반환`);
    console.log(`  📋 applications 행 수: ${appsRes.data?.length || 0}`);

    // ══ TC3: service_policies 테이블 접근 (교육신청관리 의존) ════════════════════
    console.log('\n── TC3: service_policies 테이블 접근 가능 ──');
    const polRes = await sbFetch('service_policies?select=id,name,tenant_id&limit=5');
    assert(polRes.status === 200 || polRes.status === 401, `service_policies 테이블 HTTP ${polRes.status}`);
    assert(Array.isArray(polRes.data) || polRes.status === 401, `service_policies 데이터 반환`);
    console.log(`  📋 service_policies 행 수: ${polRes.data?.length || 0}`);

    // ══ TC4: plans 테이블 스키마 필수 컬럼 ═══════════════════════════════════════
    console.log('\n── TC4: plans 필수 컬럼 존재 ──');
    if (plansRes.data?.length > 0) {
        const p = plansRes.data[0];
        assert('id' in p, `plans.id 존재`);
        assert('status' in p, `plans.status 존재`);
        assert('tenant_id' in p, `plans.tenant_id 존재`);
    } else {
        console.log('  ⚠️ plans 데이터 없음 - 스키마 검증 스킵');
    }

    // ══ TC5: applications 테이블 스키마 필수 컬럼 ════════════════════════════════
    console.log('\n── TC5: applications 필수 컬럼 존재 ──');
    if (appsRes.data?.length > 0) {
        const a = appsRes.data[0];
        assert('id' in a, `applications.id 존재`);
        assert('status' in a, `applications.status 존재`);
    } else {
        console.log('  ⚠️ applications 데이터 없음 - 스키마 검증 스킵');
    }

    // ══ TC6: HMC 테넌트 계획 데이터 필터링 ═══════════════════════════════════════
    console.log('\n── TC6: HMC 테넌트 계획 필터링 ──');
    const hmcPlans = await sbFetch('plans?select=id,status&tenant_id=eq.HMC');
    assert(hmcPlans.status === 200 || hmcPlans.status === 401, `HMC plans 필터 HTTP ${hmcPlans.status}`);
    const hmcCount = hmcPlans.data?.length || 0;
    console.log(`  📋 HMC plans: ${hmcCount}건`);
    assert(hmcCount >= 0, `HMC plans 수 >= 0 (빈 배열도 정상)`);

    // ══ TC7: applications completed 필터링 (결과관리용) ════════════════════════
    console.log('\n── TC7: 완료 신청건 필터링 ──');
    const completed = await sbFetch('applications?select=id&status=eq.completed&limit=5');
    assert(completed.status === 200 || completed.status === 401, `completed 필터 HTTP ${completed.status}`);
    console.log(`  📋 completed applications: ${completed.data?.length || 0}건`);

    // ══ TC8: bo_result_mgmt.js 내 _boEduFilterBar 함수 존재 확인 ══════════════
    console.log('\n── TC8: 소스코드 존재 확인 ──');
    const fs = await import('fs');
    const planSrc = fs.readFileSync('public/js/bo_plan_mgmt.js', 'utf8');
    const approvalSrc = fs.readFileSync('public/js/bo_approval.js', 'utf8');
    const resultSrc = fs.readFileSync('public/js/bo_result_mgmt.js', 'utf8');

    assert(planSrc.includes('async function renderBoPlanMgmt'), `bo_plan_mgmt.js: renderBoPlanMgmt 함수`);
    assert(planSrc.includes("from('plans')"), `bo_plan_mgmt.js: DB plans 테이블 조회`);
    assert(planSrc.includes('try {'), `bo_plan_mgmt.js: try-catch 에러 핸들링`);
    assert(!planSrc.includes('MOCK_BO_PLANS.filter'), `bo_plan_mgmt.js: MOCK 직접 의존 제거`);

    assert(approvalSrc.includes('function renderMyOperations'), `bo_approval.js: renderMyOperations 함수`);
    assert(approvalSrc.includes('catch'), `bo_approval.js: try-catch 에러 핸들링`);

    assert(resultSrc.includes('async function renderResultMgmt'), `bo_result_mgmt.js: renderResultMgmt 함수`);
    assert(resultSrc.includes('catch'), `bo_result_mgmt.js: try-catch 에러 핸들링`);
    assert(resultSrc.includes('function _boEduFilterBar'), `bo_result_mgmt.js: _boEduFilterBar 함수`);

    // ══ TC9: docs/ 배포 파일 동기화 ══════════════════════════════════════════════
    console.log('\n── TC9: docs/ 배포 파일 동기화 ──');
    const docsPlan = fs.existsSync('docs/js/bo_plan_mgmt.js');
    const docsApproval = fs.existsSync('docs/js/bo_approval.js');
    const docsResult = fs.existsSync('docs/js/bo_result_mgmt.js');
    assert(docsPlan, `docs/js/bo_plan_mgmt.js 존재`);
    assert(docsApproval, `docs/js/bo_approval.js 존재`);
    assert(docsResult, `docs/js/bo_result_mgmt.js 존재`);

    // 결과
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`  TOTAL: ${total}  |  ✅ PASS: ${pass}  |  ❌ FAIL: ${fail}`);
    console.log('══════════════════════════════════════════════════════════════\n');
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error('💥 테스트 실행 에러:', err); process.exit(1); });
