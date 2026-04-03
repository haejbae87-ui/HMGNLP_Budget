// ─── FO 임시저장/작성확인/취소 기능 테스트 ───────────────────────────────────
// node tests/fo_draft_confirm.test.mjs

const SUPABASE_URL = 'https://wihsojhucgmcdfpufonf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaHNvamh1Y2dtY2RmcHVmb25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2OTkxMjYsImV4cCI6MjA1NzI3NTEyNn0.sEJFswVsZnRBIFo3dddWKomMcLMeMlzfMiHp_Ycwx84';

let pass = 0, fail = 0, total = 0;
function assert(c, m) { total++; if (c) { pass++; console.log(`  ✅ ${m}`) } else { fail++; console.log(`  ❌ ${m}`) } }

async function main() {
    const fs = await import('fs');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  FO 임시저장/작성확인/취소 기능 테스트                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ── TC1: plans.js 소스 검증 ─────────────────────────────────────────────
    console.log('── TC1: plans.js 핵심 함수 존재 ──');
    const planSrc = fs.readFileSync('public/js/plans.js', 'utf8');
    assert(planSrc.includes('function savePlanDraft'), `savePlanDraft 함수 존재`);
    assert(planSrc.includes('function renderPlanConfirm'), `renderPlanConfirm 함수 존재`);
    assert(planSrc.includes('function confirmPlan'), `confirmPlan 함수 존재`);
    assert(planSrc.includes('function cancelPlan'), `cancelPlan 함수 존재`);
    assert(planSrc.includes('function resumePlanDraft'), `resumePlanDraft 함수 존재`);
    assert(planSrc.includes('function deletePlanDraft'), `deletePlanDraft 함수 존재`);
    assert(planSrc.includes("status: 'draft'"), `plans.js: draft status 사용`);
    assert(planSrc.includes('confirmMode'), `plans.js: confirmMode 상태 사용`);
    assert(planSrc.includes('editId'), `plans.js: editId 상태 사용`);

    // ── TC2: apply.js 소스 검증 ─────────────────────────────────────────────
    console.log('\n── TC2: apply.js 핵심 함수 존재 ──');
    const applySrc = fs.readFileSync('public/js/apply.js', 'utf8');
    assert(applySrc.includes('function saveApplyDraft'), `saveApplyDraft 함수 존재`);
    assert(applySrc.includes('function _renderApplyConfirm'), `_renderApplyConfirm 함수 존재`);
    assert(applySrc.includes('function confirmApply'), `confirmApply 함수 존재`);
    assert(applySrc.includes('function cancelApply'), `cancelApply 함수 존재`);
    assert(applySrc.includes('function resumeApplyDraft'), `resumeApplyDraft 함수 존재`);
    assert(applySrc.includes('function deleteApplyDraft'), `deleteApplyDraft 함수 존재`);
    assert(applySrc.includes('function _mapAppDbStatus'), `_mapAppDbStatus 함수 존재`);
    assert(applySrc.includes("status: 'draft'"), `apply.js: draft status 사용`);
    assert(applySrc.includes('confirmMode'), `apply.js: confirmMode 상태 사용`);

    // ── TC3: data.js resetApplyState 검증 ──────────────────────────────────
    console.log('\n── TC3: data.js resetApplyState의 editId/confirmMode ──');
    const dataSrc = fs.readFileSync('public/js/data.js', 'utf8');
    assert(dataSrc.includes('editId'), `data.js: editId 속성 존재`);
    assert(dataSrc.includes('confirmMode'), `data.js: confirmMode 속성 존재`);

    // ── TC4: 상태 매핑 검증 ────────────────────────────────────────────────
    console.log('\n── TC4: 상태 매핑 검증 ──');
    assert(planSrc.includes("draft: '작성중'"), `plans.js: _mapDbStatus에 draft 추가`);
    assert(planSrc.includes("cancelled: '취소'"), `plans.js: _mapDbStatus에 cancelled 추가`);
    assert(applySrc.includes("draft: '작성중'"), `apply.js: _mapAppDbStatus에 draft 매핑`);
    assert(applySrc.includes("cancelled: '취소'"), `apply.js: _mapAppDbStatus에 cancelled 매핑`);

    // ── TC5: UI 요소 검증 ────────────────────────────────────────────────────
    console.log('\n── TC5: UI 요소 검증 ──');
    assert(planSrc.includes('💾 임시저장'), `plans.js: 임시저장 버튼 UI`);
    assert(planSrc.includes('제출 →'), `plans.js: 제출 버튼 라벨 변경`);
    assert(planSrc.includes('✅ 확정 제출'), `plans.js: 확정 제출 버튼`);
    assert(planSrc.includes('← 수정하기'), `plans.js: 수정하기 버튼`);
    assert(planSrc.includes('이어쓰기'), `plans.js: 이어쓰기 버튼`);
    assert(planSrc.includes('취소 요청'), `plans.js: 취소 요청 버튼`);
    assert(applySrc.includes('saveApplyDraft()'), `apply.js: 임시저장 버튼 연결`);
    assert(applySrc.includes('✅ 확정 제출'), `apply.js: 확정 제출 버튼`);

    // ── TC6: upsert 패턴 검증 ──────────────────────────────────────────────
    console.log('\n── TC6: upsert 패턴 검증 (중복 방지) ──');
    assert(planSrc.includes("upsert(row, { onConflict: 'id' })"), `plans.js: upsert 사용`);
    assert(applySrc.includes("upsert(row, { onConflict: 'id' })"), `apply.js: upsert 사용`);

    // ── TC7: 취소 시 승인 상태 체크 ─────────────────────────────────────────
    console.log('\n── TC7: 취소 로직 - 승인 체크 ──');
    assert(planSrc.includes("status === 'approved'"), `plans.js: cancelPlan 승인 체크`);
    assert(applySrc.includes("status === 'approved'"), `apply.js: cancelApply 승인 체크`);
    assert(planSrc.includes("status: 'cancelled'"), `plans.js: cancelled 상태 업데이트`);
    assert(applySrc.includes("status: 'cancelled'"), `apply.js: cancelled 상태 업데이트`);

    // ── TC8: docs/ 동기화 ──────────────────────────────────────────────────
    console.log('\n── TC8: docs/ 배포 파일 동기화 ──');
    assert(fs.existsSync('docs/js/plans.js'), `docs/js/plans.js 존재`);
    assert(fs.existsSync('docs/js/apply.js'), `docs/js/apply.js 존재`);
    assert(fs.existsSync('docs/js/data.js'), `docs/js/data.js 존재`);

    // 결과
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`  TOTAL: ${total}  |  ✅ PASS: ${pass}  |  ❌ FAIL: ${fail}`);
    console.log('══════════════════════════════════════════════════════════════\n');
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error('💥 에러:', err); process.exit(1); });
