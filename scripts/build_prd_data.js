/**
 * PRD .md → JS 데이터 변환 빌드 스크립트
 * docs/PRD/*.md 파일을 읽어 public/js/prd_data.js로 변환
 * 
 * 실행: node scripts/build_prd_data.js
 */
const fs = require('fs');
const path = require('path');

const PRD_DIR = path.join(__dirname, '..', 'docs', 'PRD');
const OUT_FILE = path.join(__dirname, '..', 'public', 'js', 'prd_data.js');

// PRD_INDEX (bo_prd_viewer.js에서도 공유하는 메타 데이터)
const PRD_META = {
  'personal_bankbook': {
    title: '개인별 분리 통장',
    version: 'v1.1',
    status: '정책 확정',
    date: '2026-04-10',
    tags: ['예산', '통장', '개인별'],
    summary: '팀 통장 외에 개인별 분리 통장(성장지원금) 정책 추가. 자동 생성, 퇴사자 처리, 인사이동 정책 포함.',
  },
  'cross_tenant_linked_teams': {
    title: '크로스 테넌트 총괄부서 연동',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-10',
    tags: ['크로스테넌트', '총괄부서', '결재'],
    summary: 'HMC↔KIA 총괄부서 간 교육계획/신청/결재 크로스 테넌트 연동 아키텍처.',
  },
};

function buildPrdData() {
  if (!fs.existsSync(PRD_DIR)) {
    console.error('PRD 디렉토리 없음:', PRD_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(PRD_DIR).filter(f => f.endsWith('.md'));
  console.log(`[PRD Build] ${files.length}개 .md 파일 발견`);

  const entries = [];
  for (const file of files) {
    const id = file.replace('.md', '');
    const content = fs.readFileSync(path.join(PRD_DIR, file), 'utf8');
    const meta = PRD_META[id] || {
      title: id.replace(/_/g, ' '),
      version: 'v1.0',
      status: '작성 중',
      date: new Date().toISOString().slice(0, 10),
      tags: [],
      summary: '',
    };

    entries.push({
      id,
      file,
      ...meta,
      content, // 원본 마크다운
    });
    console.log(`  ✓ ${file} (${content.length} chars)`);
  }

  // JS 파일 생성
  const jsContent = `// ─── PRD 데이터 (자동 생성 — scripts/build_prd_data.js) ───
// 최종 빌드: ${new Date().toISOString()}
// 수동 편집하지 마세요. docs/PRD/*.md 수정 후 node scripts/build_prd_data.js 실행
const PRD_DATA = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(OUT_FILE, jsContent, 'utf8');
  console.log(`[PRD Build] → ${OUT_FILE} 생성 완료 (${entries.length}건)`);
}

buildPrdData();
