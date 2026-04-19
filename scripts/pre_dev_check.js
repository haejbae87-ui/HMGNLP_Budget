#!/usr/bin/env node
// ─── pre_dev_check.js ──────────────────────────────────────────────────────
// 개발 시작 전 자동 사전 체크
// 실행: node scripts/pre_dev_check.js [파일명...]
//
// 체크 항목:
//  1) 수정 대상 JS 파일 크기 → 100KB 초과 시 REFACTOR 경고
//  2) 전체 JS 파일 중 100KB 초과 목록 (리팩토링 후보)
//  3) 관련 PRD 키워드 매칭
//  4) dev_progress.md 최근 10줄 (현재 진행 맥락)
//  5) 스킬/워크플로우 가이드 리마인더
// ───────────────────────────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

// Windows PowerShell ANSI/UTF-8 호환 설정
if (process.stdout.setEncoding) process.stdout.setEncoding('utf8');
const USE_ANSI = process.env.NO_COLOR === undefined && (process.platform !== 'win32' || process.env.FORCE_COLOR || process.env.WT_SESSION || process.env.TERM_PROGRAM);

const ROOT      = path.resolve(__dirname, '..');
const JS_DIR    = path.join(ROOT, 'public', 'js');
const PRD_DIR   = path.join(ROOT, 'docs', 'PRD');
const PROGRESS  = path.join(ROOT, 'dev_progress.md');
const TASK_FILE = path.join(ROOT, 'docs', 'task.md');

const REFACTOR_THRESHOLD_KB = 100; // 이 이상이면 리팩토링 권장
const WARN_THRESHOLD_KB     = 70;  // 이 이상이면 주의 표시

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
};

function c(color, text) { return USE_ANSI ? (ANSI[color] + text + ANSI.reset) : text; }
function hr(n = 60) { return '='.repeat(n); }
function kb(bytes) { return Math.round(bytes / 1024); }

console.log('');
console.log(c('cyan', '================================================'));
console.log(c('cyan', '  [pre_dev_check]  HMGNLP_Budget  사전 체크'));
console.log(c('cyan', '================================================') + '\n');

// 1) 수정 대상 파일 체크
const targets = process.argv.slice(2);
if (targets.length > 0) {
  console.log(c('bold', '[1] 수정 대상 파일 크기 체크'));
  console.log(c('gray', hr()));
  let needRefactor = false;
  targets.forEach(t => {
    const p = path.isAbsolute(t) ? t : path.join(JS_DIR, t);
    if (!fs.existsSync(p)) {
      console.log(c('yellow', `  WARNING: 파일 없음: ${t}  (신규 생성 예정)`));
      return;
    }
    const size = kb(fs.statSync(p).size);
    let icon = 'OK ';
    let col  = 'green';
    if (size >= REFACTOR_THRESHOLD_KB) { icon = 'REFACTOR 필요'; col = 'red'; needRefactor = true; }
    else if (size >= WARN_THRESHOLD_KB) { icon = '주의'; col = 'yellow'; }
    console.log(`  [${c(col, icon)}]  ${path.basename(t)}  ${c('bold', size + 'KB')}`);
  });
  if (needRefactor) {
    console.log('\n' + c('red', '  STOP: 100KB 초과 파일이 있습니다. 개발 전 모듈 분리 후 진행하세요.'));
    console.log(c('gray', '     예시: PowerShell 분리 스크립트로 경계 줄을 기준으로 파일 분할'));
  }
  console.log();
}

// 2) 전체 JS 리팩토링 후보
console.log(c('bold', '[2] 전체 JS 파일 크기 현황 (상위 15개)'));
console.log(c('gray', hr()));
const jsFiles = fs.readdirSync(JS_DIR)
  .filter(f => f.endsWith('.js'))
  .map(f => ({ name: f, size: kb(fs.statSync(path.join(JS_DIR, f)).size) }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 15);

jsFiles.forEach(f => {
  const barLen = Math.min(Math.round(f.size / 10), 20);
  const bar = '#'.repeat(barLen).padEnd(20, '.');
  let col = f.size >= REFACTOR_THRESHOLD_KB ? 'red' : f.size >= WARN_THRESHOLD_KB ? 'yellow' : 'green';
  const flag = f.size >= REFACTOR_THRESHOLD_KB ? ' [REFACTOR]' : '';
  console.log(`  ${c(col, bar)}  ${f.size.toString().padStart(4)}KB  ${f.name}${c('red', flag)}`);
});
console.log();

// 3) PRD 키워드 매칭
const keywords = targets.map(t =>
  path.basename(t, '.js')
    .replace(/^bo_|^fo_/, '')
    .replace(/_/g, '|')
).join('|');

if (keywords && fs.existsSync(PRD_DIR)) {
  console.log(c('bold', '[3] 관련 PRD 파일'));
  console.log(c('gray', hr()));
  const prdFiles = fs.readdirSync(PRD_DIR).filter(f => f.endsWith('.md'));
  const regex = new RegExp(keywords, 'i');
  const matched = prdFiles.filter(f => regex.test(f));
  if (matched.length > 0) {
    matched.forEach(f => console.log(`  >> docs/PRD/${f}`));
  } else {
    console.log(c('gray', '  (키워드 매칭 PRD 없음 - 전체 목록에서 수동 확인 필요)'));
    prdFiles.forEach(f => console.log(c('gray', `    - ${f}`)));
  }
  console.log();
}

// 4) dev_progress.md 최근 맥락
if (fs.existsSync(PROGRESS)) {
  const lines = fs.readFileSync(PROGRESS, 'utf8').split('\n').filter(l => l.trim());
  const recent = lines.slice(-12);
  console.log(c('bold', '[4] dev_progress.md 최근 컨텍스트'));
  console.log(c('gray', hr()));
  recent.forEach(l => console.log(c('gray', '  ' + l)));
  console.log();
}

// 5) 스킬 & 워크플로우 리마인더
console.log(c('bold', '[5] 스킬 & 워크플로우 가이드'));
console.log(c('gray', hr()));
const reminders = [
  ['PRD 업데이트',  '/PRD Manager   -> .agents/skills/prd_manager/SKILL.md'],
  ['역추적 PRD',    '/PRD Engineer  -> .agents/skills/prd_engineer/SKILL.md'],
  ['BO UI 표준',    '/bo_ui_std     -> .agents/skills/bo_ui_standard/SKILL.md'],
  ['배포',          '/verify-and-push -> .agents/workflows/verify-and-push.md'],
  ['네비 검증',     '/nav_verify    -> .agents/skills/nav_verify/SKILL.md'],
];
reminders.forEach(([k, v]) => console.log(`  ${c('magenta', k.padEnd(14))}  ${c('gray', v)}`));
console.log();

// 6) 리팩토링 대상 요약
const refactorCandidates = jsFiles.filter(f => f.size >= REFACTOR_THRESHOLD_KB);
if (refactorCandidates.length > 0) {
  console.log(c('bold', c('red', '[6] 즉시 리팩토링 필요 파일 목록')));
  console.log(c('gray', hr()));
  refactorCandidates.forEach(f => {
    console.log(`  [REFACTOR]  ${f.name.padEnd(40)} ${f.size}KB`);
  });
  console.log();
}

console.log(c('green', '  [DONE] 사전 체크 완료. 개발을 진행하세요!\n'));

