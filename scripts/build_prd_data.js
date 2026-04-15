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
  'edu_result': {
    title: '교육결과 등록',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-09',
    tags: ['FO', '교육결과', '등록'],
    summary: '교육결과 등록 독립 화면 신규 구축. 교육계획/신청과 분리된 결과 등록 프로세스.',
  },
  'service_policy': {
    title: '서비스 정책 관리',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-08',
    tags: ['BO', '정책', '교육유형'],
    summary: '서비스 정책 생성 위저드, 교육유형 필터링, VOrg 기반 정책 할당 체계.',
  },
  'learning_apply': {
    title: '교육 신청 프로세스',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-09',
    tags: ['FO', '교육신청', '교육계획'],
    summary: '통합 교육계획 선택 팝업, R&D/교육운영 패턴별 신청 프로세스.',
  },
  'badge_system': {
    title: '뱃지 제도',
    version: 'v1.0',
    status: '구현 완료',
    date: '2026-04-08',
    tags: ['뱃지', '성장제도', 'BO'],
    summary: '뱃지 그룹 관리, 뱃지 기준 설정, 취득 조건 빌더, 심사/발급 프로세스.',
  },
  'form_field_governance': {
    title: '교육양식 필드 거버넌스',
    version: 'v1.0',
    status: '완료',
    date: '2026-04-13',
    tags: ['BO', '양식', '필드', '거버넌스', 'L1/L2'],
    summary: '3계층 필드 거버넌스(L1 표준/L2 확장/L3 금지), select 옵션값 관리, 양식별 필수/선택 토글, 선후행 의존성 규칙 엔진.',
  },
  'form_deploy_workflow': {
    title: '양식 배포 분리 및 버전 관리',
    version: 'v1.0',
    status: '완료',
    date: '2026-04-14',
    tags: ['BO', '양식', '배포', '버전', 'Draft', 'Deploy'],
    summary: '양식 저장=즉시배포 구조를 Draft→Preview→Deploy 3단계로 분리. 양식 상태머신(draft/published/archived), 배포 시 필드 삭제 경고, 제출 데이터에 양식 스냅샷 저장으로 엑셀 추출 대비.',
  },
  'approval_line_design': {
    title: '결재라인 고도화 (3단계×2축)',
    version: 'v2.0',
    status: '구현 중',
    date: '2026-04-15',
    tags: ['BO', '결재', '협조처', 'VOrg', '에스컬레이션'],
    summary: '3단계 결재방식(외부/자체/통합) × 2축 에스컬레이션(총액→승인자레벨, soft초과→협조처활성화). 계정별 결재방식 혼용. 노드기반 결재선. 조건 룰빌더 UI.',
  },
  'PRD_calc_grounds_vorg_management': {
    title: '세부산출근거 VOrg 단위 관리',
    version: 'v1.0',
    status: '설계 검토',
    date: '2026-04-14',
    tags: ['BO', '세부산출근거', 'VOrg', '단가관리'],
    summary: 'VOrg 템플릿 단위로 세부산출근거 항목을 관리하고, 교육장소별 단가 마스터를 운영하는 체계.',
  },
};

function _extractTitleFromMd(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function buildPrdData() {
  if (!fs.existsSync(PRD_DIR)) {
    console.error('PRD 디렉토리 없음:', PRD_DIR);
    process.exit(1);
  }

  // README.md 제외
  const files = fs.readdirSync(PRD_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
  console.log(`[PRD Build] ${files.length}개 .md 파일 발견`);

  const entries = [];
  for (const file of files) {
    const id = file.replace('.md', '');
    const content = fs.readFileSync(path.join(PRD_DIR, file), 'utf8');
    const meta = PRD_META[id] || {
      title: _extractTitleFromMd(content) || id.replace(/_/g, ' '),
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
