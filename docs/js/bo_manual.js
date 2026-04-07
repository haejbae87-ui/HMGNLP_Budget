// ─── 백오피스: 서비스 매뉴얼 (v8.0) ────────────────────────────────────────────
// 대상: 차세대학습플랫폼 서비스 기획자 및 개발자
// 내용: 멀티테넌트 교육예산 관리 시스템의 전체 구조·역할·메뉴·데이터 흐름 안내
// 최종 업데이트: 2026-04-07 (서비스 정책 설정 5단계 위저드 간소화, 폼빌더 isolation_group_id·account_code 추가 반영)

function renderBoManual() {
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="background:linear-gradient(135deg,#312E81,#6366F1);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.1em">BACK-OFFICE MANUAL v8.0</span>
    </div>
    <h1 style="font-size:22px;font-weight:900;margin:0 0 8px">백오피스 서비스 매뉴얼</h1>
    <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
      차세대학습플랫폼(NLP) 서비스 기획자·개발자를 위한 멀티테넌트 교육예산 관리 시스템 안내서<br>
      예산 정책 설계부터 결재 자동 라우팅까지 전체 흐름을 다룹니다. | 2026-04-07 v8.0
    </p>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0;overflow-x:auto">
    ${[
      { id: 'overview', label: '① 시스템 개요' },
      { id: 'personas', label: '② 페르소나·역할' },
      { id: 'menus', label: '③ 메뉴 상세' },
      { id: 'patterns', label: '④ 프로세스 패턴' },
      { id: 'data-flow', label: '⑤ 데이터 흐름' },
      { id: 'tech', label: '⑥ 기술 구조' },
      { id: 'ia', label: '⑦ IA·화면구조' },
      { id: 'db', label: '⑧ DB 구조' },
    ].map(t => `
    <button onclick="_manSetTab('${t.id}')" id="mbtab-${t.id}"
      style="padding:10px 16px;font-size:12px;font-weight:700;border:none;border-bottom:3px solid transparent;
             background:none;cursor:pointer;color:#6B7280;transition:all .15s;white-space:nowrap">
      ${t.label}
    </button>`).join('')}
  </div>
  <div id="manual-content"></div>
</div>`;
  setTimeout(() => _manSetTab('overview'), 0);
}

let _manActiveTab = 'overview';
function _manSetTab(id) {
  _manActiveTab = id;
  document.querySelectorAll('[id^="mbtab-"]').forEach(b => {
    const a = b.id === `mbtab-${id}`;
    b.style.color = a ? '#6366F1' : '#6B7280';
    b.style.borderColor = a ? '#6366F1' : 'transparent';
    b.style.fontWeight = a ? '800' : '700';
  });
  const c = document.getElementById('manual-content');
  if (!c) return;
  const map = { overview: _manOverview, personas: _manPersonas, menus: _manMenus, patterns: _manPatterns, 'data-flow': _manDataFlow, tech: _manTech, devplan: _manDevPlan, ia: _manIA, db: _manDbSchema };
  if (map[id]) c.innerHTML = map[id]();
}

/* ① 시스템 개요 */
function _manOverview() {
  return `<div style="display:flex;flex-direction:column;gap:18px">

  <div class="bo-card" style="padding:20px;background:linear-gradient(135deg,#EEF2FF,#F5F3FF)">
    <h2 style="font-size:15px;font-weight:800;color:#4338CA;margin:0 0 10px">시스템 목적</h2>
    <p style="font-size:13px;color:#374151;line-height:1.8;margin:0">
      현대차그룹 계열사(HMC·KIA·HAE 등)가 <strong>일반교육예산</strong>과 <strong>R&D 교육예산</strong>을 통합 관리하는 <strong>멀티테넌트 예산관리 플랫폼</strong>입니다.<br>
      예산계정 설정 → 서비스 정책 설계 → 교육계획 수립 → 신청·결재 → 결과 정산의 전체 흐름을 지원합니다.<br>
      <strong>백오피스(BO)</strong>는 예산 총괄·운영 담당자가 사용하고, <strong>프론트오피스(FO/LXP)</strong>는 학습자가 사용합니다.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="bo-card" style="padding:18px">
      <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🏢 현재 운영 테넌트</div>
      ${[
      { id: 'HMC', name: '현대자동차', accs: 'OPS·PART·ETC·RND (4계정, 통장22)', color: '#1D4ED8' },
      { id: 'KIA', name: '기아', accs: 'OPS·PART·ETC (3계정)', color: '#059669' },
      { id: 'HAE', name: '현대오토에버', accs: 'OPS·PART·CERT·EDU·TEAM (5계정)', color: '#7C3AED' },
      { id: 'HSC', name: '현대제철', accs: 'GEN·TECH (2계정)', color: '#B45309' },
      { id: 'ROTEM+7', name: '현대로템 외 6개사', accs: '(추후 설정)', color: '#6B7280' },
    ].map(t => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#F9FAFB;margin-bottom:6px">
        <span style="background:${t.color};color:#fff;font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${t.id}</span>
        <div><div style="font-weight:700;font-size:12px;color:#374151">${t.name}</div>
             <div style="font-size:10px;color:#9CA3AF">${t.accs}</div></div>
      </div>`).join('')}
    </div>
    <div class="bo-card" style="padding:18px">
      <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🎭 역할 체계</div>
      ${[
      { role: 'platform_admin', label: '플랫폼 총괄', color: '#374151' },
      { role: 'tenant_global_admin', label: '테넌트 총괄', color: '#1D4ED8' },
      { role: 'budget_global_admin', label: '예산 총괄', color: '#7C3AED' },
      { role: 'budget_op_manager', label: '예산 운영 담당', color: '#D97706' },
      { role: 'learner (FO)', label: '학습자 (DB users 기반)', color: '#059669' },
      { role: 'team_leader', label: '팀장·실장·본부장 (리더)', color: '#0369A1' },
    ].map(r => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="background:${r.color}18;border:1px solid ${r.color}40;color:${r.color};font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${r.role}</span>
        <span style="font-size:11px;font-weight:700;color:#374151">${r.label}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:18px">
    <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🔄 전체 업무 흐름 (7단계)</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${[
      { n: '1', t: '마스터 설정', s: '계정·산출근거·통장정책·가상조직', c: '#6366F1' },
      { n: '2', t: '서비스 정책', s: '패턴A/B/C/D + 금액별 결재라인', c: '#7C3AED' },
      { n: '3', t: '통장 동기화', s: '조직별 통장 자동생성(isolated/shared)', c: '#0369A1' },
      { n: '4', t: '예산 배정', s: '총괄→본부→팀 분배', c: '#2563EB' },
      { n: '5', t: '교육계획(FO)', s: '계획수립·상신·승인', c: '#059669' },
      { n: '6', t: '교육신청(FO)', s: '신청·가점유·결재', c: '#D97706' },
      { n: '7', t: '결과정산', s: '실지출·증빙·차감 확정', c: '#DC2626' },
    ].map((s, i, a) => `
      <div style="text-align:center;padding:10px 14px;background:#fff;border-radius:10px;border:1.5px solid ${s.c}30">
        <div style="width:24px;height:24px;border-radius:50%;background:${s.c};color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 5px">${s.n}</div>
        <div style="font-size:11px;font-weight:800;color:${s.c}">${s.t}</div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${s.s}</div>
      </div>
      ${i < a.length - 1 ? '<span style="color:#D1D5DB;font-size:18px">→</span>' : ''}`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:18px;background:#F0FDF4;border:1.5px solid #A7F3D0">
    <div style="font-size:13px;font-weight:800;color:#065F46;margin-bottom:8px">🔄 v8.0 주요 변경사항 (2026-04-07)</div>
    <div style="font-size:12px;color:#374151;line-height:1.8">
      <strong>1. 서비스 정책 5단계 위저드:</strong> 7~8단계로 복잡했던 정책 생성 과정을 "정책 정의 → 정책 범위 → 패턴 → 양식 → 결재라인" 5단계로 대폭 간소화 설계 적용.<br>
      <strong>2. 양식 빌더 DB 동기화:</strong> form_templates 테이블에 isolation_group_id와 account_code를 추가하여, 정책 생성 시 양식 선택 과정에서 완벽한 권한·데이터 격리 구현.<br>
      <strong>3. 매뉴얼 동기화 누락 수정:</strong> 파일 수정 중 끊긴 부분 복구 및 최신화 완료. FO 카테고리 (책/과정 등 행위기반) 구조와 BO 운영 동기화.<br>
    </div>
  </div>
</div>`;
}

/* ② 페르소나·역할 */
function _manPersonas() {
  const ps = [
    {
      name: '장O준 (플랫폼 총괄)', role: 'platform_admin', badge: '#374151',
      desc: '시스템 전체 모니터링. 테넌트 간 데이터는 열람하지 않음. 관리자 역할 매핑과 전사 현황 확인 전담.',
      steps: [
        { i: '🔐', t: '관리자 권한 매핑', d: '테넌트별 총괄 담당자에게 역할 부여. 역할 변경 시 메뉴 자동 연동.' },
        { i: '🖥️', t: '전사 모니터링', d: '테넌트별 예산 집행률·잔액·계획·신청 건수 실시간 확인.' },
      ],
      menus: ['대시보드', '플랫폼 모니터링', '관리자 권한 매핑', '리포트'],
    },
    {
      name: '신O남 (HMC 일반예산 총괄)', role: 'budget_global_admin', badge: '#1D4ED8',
      desc: 'HMC 일반예산(HMC-OPS·PART·ETC) 소유. 마스터 설정·서비스 정책·배정·계획 검토가 주요 업무.',
      steps: [
        { i: '💳', t: '예산 계정 설정 (6단계 위저드)', d: '기본정보→가상조직→학습유형→산출근거→역할권한→기간상태' },
        { i: '🔧', t: '서비스 정책 설정 (5단계 위저드)', d: '정책정의→정책범위→패턴선택→양식연결→결재라인. 패턴A/B/C/D/E 선택.' },
        { i: '🏢', t: '가상조직 관리', d: '본부/팀 구조를 VOrg 템플릿으로 정의. 관리자·협력팀·직무유형 설정.' },
        { i: '📐', t: '세부산출근거 관리', d: '운영(21종)/기타(7종) 항목별 기준단가·Soft/Hard Limit·사용단계 설정.' },
        { i: '📊', t: '결재라인 설정', d: '계정별 금액 구간→결재자 자동 라우팅. 예: 100만↓팀장전결 / 초과→본부장승인.' },
        { i: '📥', t: '나의 운영 업무', d: '[계획 승인 대기] / [신청 승인 대기] / [결과 정산 대기] 3탭 단계별 승인함.' },
      ],
      menus: ['대시보드', '내 격리그룹관리', '예산계정관리', '가상조직', '교육신청양식마법사', '세부산출근거', '결재라인', '서비스정책', '교육계획관리', '예산배정', '나의운영업무', '리포트'],
    },
    {
      name: '류O령 (HMC R&D예산 총괄)', role: 'budget_global_admin', badge: '#DC2626',
      desc: 'HMC-RND 계정 전속 소유. 일반예산과 완전 격리. R&D 교육 전용 산출근거·결재라인 별도 운영.',
      steps: [
        { i: '💳', t: 'R&D 계정 설정', d: 'HMC-RND 전용 6단계 설정. 패턴A(계획→신청→결과) 고통제 방식.' },
        { i: '🔧', t: '서비스 정책 패턴A', d: 'R&D교육예산 서비스: 계획 필수 → 계획 기반 신청 → 결과 정산 고정 흐름.' },
      ],
      menus: ['대시보드', '내 격리그룹관리', '예산계정관리(R&D)', '가상조직', '세부산출근거(운영탭)', '결재라인', '서비스정책', '교육계획관리', '나의운영업무', '리포트'],
    },
    {
      name: '최O영 (HMC 테넌트 총괄)', role: 'tenant_global_admin', badge: '#6B7280',
      desc: '테넌트 전체 격리그룹 생성·관리 권한 보유. 예산 실무 설정은 불가하며 구조 설계 역할.',
      steps: [
        { i: '🏗️', t: '격리그룹 관리', d: '테넌트 내 일반예산/R&D예산 격리그룹 생성 및 총괄담당자 지정.' },
      ],
      menus: ['대시보드', '격리그룹관리', '리포트', '매뉴얼'],
    },
    {
      name: '고O현 (KIA 예산 총괄)', role: 'budget_global_admin', badge: '#059669',
      desc: 'KIA-OPS·KIA-PART 관리. KIA는 기타계정 없음. 테넌트 격리그룹도 담당(중소테넌트 겸임 구조).',
      steps: [
        { i: '💳', t: 'KIA 계정 설정', d: '운영(OPS)·참가(PART) 2개 계정. HMC 데이터와 isolationGroup으로 완전 격리.' },
        { i: '🔧', t: '서비스 정책', d: '패턴B(신청→결과) 주요 사용. 참가비는 패턴C(후정산) 적용.' },
      ],
      menus: ['대시보드', '내 격리그룹관리', '예산계정관리', '가상조직', '세부산출근거', '결재라인', '서비스정책', '교육계획관리', '예산배정', '나의운영업무', '리포트'],
    },
    {
      name: '이O현·장O범·김O늘 (본부/운영담당)', role: 'budget_op_manager', badge: '#D97706',
      desc: '총괄로부터 위임받은 본부 범위 예산 운영. 마스터 설정 권한 없음. 나의 운영 업무 중심으로 업무 처리.',
      steps: [
        { i: '📥', t: '나의 운영 업무', d: '계획 승인 대기·신청 승인 대기·결과 정산 대기 3탭. 내 담당 정책 건만 자동 표시.' },
        { i: '💰', t: '조직예산 현황', d: '본부 배정 잔액·집행률 확인.' },
      ],
      menus: ['대시보드', '나의운영업무', '조직예산현황', '리포트'],
    },
  ];

  return `<div style="display:flex;flex-direction:column;gap:18px">
  <div style="padding:12px 16px;background:#F0FDF4;border-radius:8px;border:1px solid #A7F3D0;font-size:12px;color:#065F46;font-weight:600">
    💡 아래 페르소나는 백오피스 헤더의 페르소나 전환 버튼으로 각 역할의 화면을 직접 체험할 수 있습니다.
  </div>
  ${ps.map(p => `
  <div class="bo-card" style="padding:0;overflow:hidden">
    <div style="padding:14px 20px;background:${p.badge}12;border-bottom:1.5px solid ${p.badge}20;display:flex;align-items:flex-start;gap:12px">
      <div style="background:${p.badge};color:#fff;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;white-space:nowrap;flex-shrink:0">${p.role}</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:#111827">${p.name}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px;line-height:1.5">${p.desc}</div>
      </div>
    </div>
    <div style="padding:14px 20px">
      <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:.05em">주요 업무</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${p.steps.map((s, i) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px">
          <span style="font-size:16px;flex-shrink:0">${s.i}</span>
          <div>
            <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:2px">
              <span style="color:#9CA3AF;font-weight:500;margin-right:5px">Step ${i + 1}</span>${s.t}
            </div>
            <div style="font-size:11px;color:#6B7280;line-height:1.6">${s.d}</div>
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:10px">
        <span style="font-size:11px;color:#6B7280;font-weight:700">접근 메뉴: </span>
        ${p.menus.map(m => `<span style="background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;margin:2px;display:inline-block">${m}</span>`).join('')}
      </div>
    </div>
  </div>`).join('')}
</div>`;
}

/* ③ 메뉴 상세 */
function _manMenus() {
  const menus = [
    {
      icon: '🔧', id: 'service-policy', name: '서비스 정책 설정 ★',
      roles: 'platform_admin(회사+그룹 필터) / tenant_global_admin(그룹 필터) / budget_op_manager(그룹 자동 고정)',
      desc: `<strong>핵심 메뉴</strong>: 학습자 시나리오 기반으로 예산·조직·양식·프로세스를 하나의 정책으로 통합 설계합니다.<br>
            <strong>5단계 위저드</strong>: Step0 정책 정의(이름+대상자+목적+유형) → Step1 정책 범위(회사+조직+계정) → Step2 프로세스 패턴 → Step3 양식 연결 → Step4 결재라인<br>
            <strong>조회 필터</strong>: 플랫폼 총괄은 회사+격리그룹 선택, 테넌트 총괄은 격리그룹 선택, 예산운영담당자는 본인 격리그룹 자동 고정(🔒배지).<br>
            <strong>정책 카드</strong>: 플랫폼 총괄 조회 시 테넌트ID 배지 추가 표시.`,
      impl: '_pbTenantFilter/_pbGroupFilter 상태변수로 필터링. isBudgetOp 분기로 격리그룹 자동 고정. approvalThresholds[] 배열로 구간 관리.',
    },
    {
      icon: '💳', id: 'budget-account', name: '예산 계정 관리',
      roles: 'budget_global_admin',
      desc: `6단계 위저드로 예산 계정을 설정합니다.<br>
            Step1 기본정보 → Step2 가상조직 → Step3 학습유형 → Step4 산출근거 → Step5 역할·권한 → Step6 기간·상태<br>
            테넌트별 isolationGroup으로 타사 데이터 완전 차단.`,
      impl: '계정 생성 시 UUID 발급. isolationGroup은 DB 쿼리 필터로 구현.',
    },
    {
      icon: '🏢', id: 'virtual-org', name: '가상교육조직 관리',
      roles: 'budget_global_admin',
      desc: `실제 조직도와 독립된 <strong>예산 집행용 가상 조직</strong>을 템플릿으로 정의합니다.<br>
            VOrg 관리자·협력팀·직무유형 제한(생산직/사무직) 설정 가능. 격리그룹별로 독립 관리.`,
      impl: '관리자 지정 시 persona FK 참조. 직무 유형은 HR 시스템 동기화 필요.',
    },
    {
      icon: '🧙', id: 'form-builder', name: '교육신청양식마법사',
      roles: 'budget_global_admin / tenant_global_admin',
      desc: `3탭 구조: 📚 양식 라이브러리 | 🔗 서비스 통합 매핑<br>
            양식 빌더 모달: 사용대상(학습자용/교육담당자용) → 단계+목적 → 교육유형·세부유형 → 필드 구성 → <strong>공지사항</strong>(신청화면 상단 표시) + <strong>필수 첨부파일 목록</strong>(+ 추가/× 삭제)<br>
            FO(학습자 입력)·BO(승인자 보완)·시스템 필드 구분 설정 가능.`,
      impl: 'fbSaveForm()에서 noticeText, attachments[] FORM_MASTER에 저장. fbAddAttach/fbRemoveAttach DOM 직접 조작.',
    },
    {
      icon: '📐', id: 'calc-grounds', name: '세부산출근거 관리',
      roles: 'budget_global_admin',
      desc: `교육 예산 지출 항목 표준 풀(Pool)을 계정별로 관리합니다.<br>
            설정: 기준단가 / Soft Limit(경고+사유입력) / Hard Limit(저장차단) / 사용단계(계획·신청·결과) / 교육유형(국내·해외).`,
      impl: 'usageScope[], visibleFor 필드로 저장. 프론트에서 컨텍스트 전달 시 필터링.',
    },
    {
      icon: '📊', id: 'approval-routing', name: '계정별 결재라인 설정',
      roles: 'budget_global_admin',
      desc: `계정 단위 금액 구간별 결재선을 설정합니다.<br>
            신청 총액(세부산출근거 합계) 기준으로 결재선 자동 생성.<br>
            ※ 서비스 정책의 금액별 결재라인과 함께 동작합니다.`,
      impl: 'getApprovalRoute() 함수로 평가. 실제는 결재 워크플로우 엔진(Camunda 등) 연동.',
    },
    {
      icon: '📥', id: 'my-operations', name: '나의 운영 업무',
      roles: '전체 (자신이 승인자인 정책 건만 자동 표시)',
      desc: `<strong>3탭 단계별 승인함</strong>: [📊 계획 승인 대기] / [📝 신청 승인 대기] / [📄 결과 정산 대기]<br>
            정책 기반 결재 자동 라우팅: 학습자 신청 → 정책 판별 → 금액 구간 확인 → 담당 결재자에게 자동 배달.<br>
            금액별 결재라인의 담당 구간도 표시됩니다(예: 🔑 100만원 구간 담당).`,
      impl: 'SERVICE_POLICIES.approverPersonaKey + approvalThresholds로 결재자 판별.',
    },
    {
      icon: '📋', id: 'plan-mgmt', name: '교육계획 관리',
      roles: '전체 (본인 관할)',
      desc: `FO에서 상신된 교육계획서 검토·승인·반려.<br>
            ⚠ 계획 승인은 예산 배분이 아닙니다. 신청 시 가용예산 범위 내에서 실제 집행이 확정됩니다.`,
      impl: '상태 머신: draft→reviewing→approved/rejected.',
    },
  ];

  return `<div style="display:flex;flex-direction:column;gap:12px">
  ${menus.map(m => `
  <div class="bo-card" style="padding:16px 20px">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <span style="font-size:20px;flex-shrink:0">${m.icon}</span>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:800;color:#111827">${m.name}</span>
          <code style="background:#F3F4F6;color:#374151;padding:1px 8px;border-radius:4px;font-size:10px">${m.id}</code>
          <span style="background:#EFF6FF;color:#1D4ED8;padding:1px 8px;border-radius:4px;font-size:10px;font-weight:700">권한: ${m.roles}</span>
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.8;margin-bottom:8px">${m.desc}</div>
        <div style="padding:8px 12px;background:#FFFBEB;border-radius:8px;border-left:3px solid #F59E0B">
          <span style="font-size:10px;font-weight:800;color:#92400E">⚙ 구현 참고: </span>
          <span style="font-size:11px;color:#92400E">${m.impl}</span>
        </div>
      </div>
    </div>
  </div>`).join('')}
</div>`;
}

/* ④ 프로세스 패턴 */
function _manPatterns() {
  const patterns = [
    {
      id: 'A', name: '패턴 A: Full-Cycle (고통제형)', color: '#7C3AED',
      flow: '교육계획 → 교육신청 → 교육결과',
      budget: '예산 가점유(Holding) → 결과 시 실차감',
      usecase: 'HMC R&D 교육예산, 대규모 집합교육 운영',
      foFlow: `1. 📚직접학습 카테고리 선택 → 2. VOrg레이블(R&D교육예산) 예산카드 + 프로세스안내 → 3. 승인된 계획 선택 → 4. 세부정보 → 5. 결과보고`,
      note: 'FO에서 R&D예산 선택 시 Step 3 Skip. 프로세스 안내로 "계획→신청→결과" 흐름 표시.',
    },
    {
      id: 'B', name: '패턴 B: Standard (자율신청형)', color: '#1D4ED8',
      flow: '교육신청 → 교육결과',
      budget: '신청 승인 시 예산 가점유 → 결과 시 실차감',
      usecase: '일반교육예산 참가계정, 사외 집합교육 참가비',
      foFlow: `1. 📚직접학습 카테고리 선택 → 2. VOrg레이블(일반교육예산) 예산카드 + 프로세스안내 → 3. 교육유형 선택 → 4. 세부정보 → 5. 결과보고`,
      note: '가장 일반적인 흐름. Step 2에서 VOrg 레이블과 프로세스 패턴 안내 표시.',
    },
    {
      id: 'C', name: '패턴 C: Reimbursement (정산특화형)', color: '#D97706',
      flow: '교육신청 단독',
      budget: '신청 승인 즉시 실차감(가점유·결과 단계 생략)',
      usecase: '개인 카드 결제 후 영수증 청구, 자격증 응시료',
      foFlow: `1. 예산 선택 → 2. 교육유형 선택 → 3. 비용·증빙 입력 → 4. 제출 즉시 정산`,
      note: '신청서에 비용 정산 및 증빙 필드 포함. 결과 단계 없음.',
    },
    {
      id: 'D', name: '패턴 D: History-Only (이력관리형)', color: '#6B7280',
      flow: '교육신청 단독',
      budget: '예산 차감 없음. 승인 시 즉시 이력 DB 적재.',
      usecase: '무료 웨비나, 자체 세미나, 개인 독서 이력 등록',
      foFlow: `1. 예산 미사용 선택 → 2. 교육유형 선택 → 3. 학습내용 입력 → 4. 제출 즉시 이력 적재`,
      note: '예산 계정 연결 불필요. FO에서 "예산 미사용" 선택 시 해당 패턴 서비스로 연결.',
    },
  ];

  return `<div style="display:flex;flex-direction:column;gap:16px">
  <div style="padding:14px 18px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px">
    <div style="font-size:12px;font-weight:900;color:#5B21B6;margin-bottom:6px">💡 서비스 정책 패턴이란?</div>
    <div style="font-size:12px;color:#374151;line-height:1.7">
      백오피스 <strong>[서비스 정책 설정]</strong>에서 A/B/C/D 패턴을 선택하면, 프론트오피스 학습자의 신청 흐름이 자동으로 구성됩니다.<br>
      이상봉 책임(HMC 학습자)이 "개인직무 사외학습"을 선택했을 때 어떤 예산을 고르느냐에 따라 3가지 경로가 자동 분기됩니다.
    </div>
  </div>
  ${patterns.map(p => `
  <div class="bo-card" style="padding:18px;border-left:4px solid ${p.color}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="background:${p.color};color:#fff;font-size:12px;font-weight:900;padding:3px 10px;border-radius:6px">패턴 ${p.id}</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${p.name}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div style="background:#F9FAFB;border-radius:8px;padding:10px">
        <div style="font-size:10px;font-weight:800;color:#6B7280;margin-bottom:4px">BO 업무 흐름</div>
        <div style="font-size:12px;font-weight:700;color:${p.color}">${p.flow}</div>
      </div>
      <div style="background:#F9FAFB;border-radius:8px;padding:10px">
        <div style="font-size:10px;font-weight:800;color:#6B7280;margin-bottom:4px">예산 제어 방식</div>
        <div style="font-size:11px;color:#374151">${p.budget}</div>
      </div>
    </div>
    <div style="background:#F5F3FF;border-radius:8px;padding:10px;margin-bottom:8px">
      <div style="font-size:10px;font-weight:800;color:#7C3AED;margin-bottom:4px">📱 FO 학습자 경험</div>
      <div style="font-size:11px;color:#374151">${p.foFlow}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <div><span style="font-size:10px;font-weight:800;color:#6B7280">적용 사례: </span><span style="font-size:11px;color:#374151">${p.usecase}</span></div>
    </div>
    ${p.note ? `<div style="margin-top:8px;padding:6px 10px;background:#FFFBEB;border-radius:6px;font-size:11px;color:#92400E">⚠ ${p.note}</div>` : ''}
  </div>`).join('')}
</div>`;
}

/* ⑤ 데이터 흐름 */
function _manDataFlow() {
  return `<div style="display:flex;flex-direction:column;gap:20px">

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">예산 잔액 계산 공식</h3>
    <div style="padding:16px;background:#F0F9FF;border-radius:10px;border:1px solid #BAE6FD;font-family:monospace;font-size:12px;color:#0C4A6E;line-height:2.2">
      <strong>배정 예산 (Allocated)</strong> = 총괄 배정액<br>
      <strong>홀딩 (Holding)</strong>      = Σ 신청 제출 후 결재 미완료 금액<br>
      <strong>집행 (Executed)</strong>      = Σ 정산 완료 실지출액<br>
      <strong>가용 잔액</strong>             = 배정 − 홀딩 − 집행<br><br>
      ⚠ 신청액 &gt; 실지출 → 차액 <strong>자동 복구</strong> (가용 잔액 증가)<br>
      ⚠ 신청액 &lt; 실지출 → <strong>추가 예산 승인</strong> 또는 이관 프로세스 필요
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">결재 자동 라우팅 흐름</h3>
    <div style="padding:14px;background:#FFFBEB;border-radius:10px;border:1px solid #FDE68A;font-size:12px;color:#92400E;line-height:2">
      학습자 신청 제출<br>
      → 세부산출근거 합계 계산 (Σ 항목별 수량 × 단가)<br>
      → 서비스 정책 판별 (어떤 policyId인가?)<br>
      → approvalThresholds에서 금액 구간 검색<br>
      → 구간 담당 결재자에게 자동 배달 ([나의 운영 업무] 신청 승인 대기 탭)<br>
      → 최종 승인 후 예산 가점유 확정<br>
      → 교육 완료 → 결과보고 제출 → [결과 정산 대기] 탭 → 실차감 확정
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">데이터 격리(isolationGroup) 구조</h3>
    <div style="font-size:12px;color:#374151;line-height:1.8">
      각 페르소나는 <code style="background:#F3F4F6;padding:1px 5px;border-radius:3px">isolationGroup</code> 속성을 보유합니다.<br>
      동일 isolationGroup의 페르소나만 같은 계획·신청·예산 데이터에 접근할 수 있습니다.<br><br>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
      ${[
      { g: 'HMC-GENERAL', who: '신O남·이O현(HMC 일반)', color: '#1D4ED8' },
      { g: 'HMC-RND', who: '류O령·이O하(HMC R&D)', color: '#DC2626' },
      { g: 'KIA-GENERAL', who: '고O현·장O범(KIA)', color: '#059669' },
      { g: 'HAE-ALL', who: '안O기·김O늘(HAE)', color: '#7C3AED' },
    ].map(g => `
      <div style="background:#F9FAFB;border:1.5px solid ${g.color}30;border-radius:8px;padding:10px">
        <code style="font-size:10px;color:${g.color};font-weight:900">${g.g}</code>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">${g.who}</div>
      </div>`).join('')}
    </div>
  </div>
</div>`;
}

/* ⑥ 기술 구조 */
function _manTech() {
  return `<div style="display:flex;flex-direction:column;gap:20px">

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">📁 파일 구조 (프로토타입)</h3>
    <div style="font-family:monospace;font-size:12px;color:#374151;background:#F9FAFB;padding:16px;border-radius:10px;line-height:1.9">
      public/<br>
      ├── <strong>index.html</strong>              — 프론트오피스 엔트리<br>
      ├── <strong>backoffice.html</strong>         — 백오피스 엔트리<br>
      └── js/<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#DC2626">supabase_client.js</span>    — ★ Supabase DB 연동 (tenants, accounts, policies, users 로드)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#DC2626">fo_persona_loader.js</span>  — ★ FO 학습자 DB 로더 (users+user_roles → 페르소나 초기화)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">data.js</span>               — FO Mock 폴백 데이터 (PERSONAS, PURPOSES[※misc_ops 제거됨], MOCK_HISTORY[tenantId필터])<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">bo_data.js</span>            — BO Mock (BO_PERSONAS, ACCOUNT_MASTER, CALC_GROUNDS_MASTER 등)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_layout.js</span>          — 사이드바·헤더·페르소나전환·boNavigate()<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#7C3AED">bo_policy_builder.js</span>  — ★ 서비스 정책 설정 (5단계 위저드·패턴A/B/C/D/E·결재라인)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#7C3AED">bo_approval.js</span>        — ★ 나의 운영 업무 (3탭 단계별 승인함)<br>
      &nbsp;&nbsp;&nbsp;├── bo_budget_master.js    — 예산 계정 관리 (통장정책 UI 포함)<br>
      &nbsp;&nbsp;&nbsp;├── bo_virtual_org.js      — 가상조직 템플릿<br>
      &nbsp;&nbsp;&nbsp;├── bo_form_builder.js     — 교육신청양식마법사 (3탭)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_calc_grounds.js</span>    — 세부산출근거 관리<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_approval_routing.js</span> — 계정별 결재라인 설정<br>
      &nbsp;&nbsp;&nbsp;├── bo_plan_mgmt.js        — 교육계획 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_allocation.js       — 예산 배정 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_reports.js          — 통계·리포트<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#D97706">bo_manual.js</span>          — 📌 이 파일<br>
      &nbsp;&nbsp;&nbsp;├── gnb.js                 — FO GNB (성장 드롭다운 + 페르소나 스위처 DB연동)<br>
      &nbsp;&nbsp;&nbsp;├── main.js                — FO 엔트리 (_loadAllEmployees → _resolveCurrentPersona → navigate)<br>
      &nbsp;&nbsp;&nbsp;├── plans.js               — FO 교육계획 수립 (행위기반카테고리+VOrg레이블+프로세스안내)<br>
      &nbsp;&nbsp;&nbsp;├── apply.js               — FO 교육신청 (행위기반카테고리+VOrg레이블+policy게이트)<br>
      &nbsp;&nbsp;&nbsp;└── utils.js               — 공통 유틸 (_getActivePolicies, getPersonaPurposes, getProcessPatternInfo)
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">🔑 핵심 데이터 구조</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
      { name: 'SERVICE_POLICIES', file: 'service_policies (DB)', desc: '서비스 정책: tenant_id, purpose, target_type, account_codes[], vorg_template_id, process_pattern, approval_config' },
      { name: 'budget_accounts', file: 'DB 테이블', desc: '예산 계정: code, name, tenant_id, uses_budget, virtual_org_template_id' },
      { name: 'budget_account_org_policy', file: 'DB 테이블', desc: '통장 정책: bankbook_mode(isolated/shared), bankbook_level, vorg_template_id' },
      { name: 'org_budget_bankbooks', file: 'DB 테이블', desc: '조직별 통장: org_id, account_id, vorg_group_id, template_id' },
      { name: 'users + user_roles', file: 'DB 테이블', desc: 'FO 학습자: id, name, org_id, job_type + role_code(learner, team_leader 등)' },
      { name: 'currentPersona', file: 'fo_persona_loader.js', desc: 'FO 페르소나 객체: id, name, tenantId, orgId, roles[], allowedAccounts[], budgets[]' },
      { name: 'BO_PERSONAS', file: 'bo_data.js + DB', desc: 'BO 페르소나: role, tenantId, ownedAccounts, isolationGroup, accessMenus' },
      { name: 'CALC_GROUNDS_MASTER', file: 'bo_data.js', desc: '산출근거: usageScope[], visibleFor, softLimit, hardLimit, unitPrice' },
    ].map(d => `
      <div style="background:#F9FAFB;border-radius:8px;padding:12px;border:1px solid #E5E7EB">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <code style="background:#E0E7FF;color:#3730A3;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800">${d.name}</code>
          <span style="font-size:10px;color:#9CA3AF">${d.file}</span>
        </div>
        <div style="font-size:11px;color:#374151;line-height:1.5">${d.desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">🚀 실제 구현 시 필요 연동</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[
      { item: 'SAP ERP', desc: '예산 잔액 실시간 동기화, 정산 결과 송신 (RFC/API Gateway)' },
      { item: '결재 워크플로우', desc: 'Camunda 또는 사내 전자결재 연동 (BPMN 프로세스 정의)' },
      { item: 'SSO / IAM', desc: '현대차그룹 통합 계정 (OAuth2/SAML). 역할 자동 매핑' },
      { item: '알림 서비스', desc: '이메일·SMS·슬랙 알림 (미결건, 결재완료, 잔액경보)' },
      { item: '파일 스토리지', desc: '정산 증빙 업로드 (S3/Object Storage + CDN)' },
      { item: 'Excel 추출', desc: '리포트 다운로드 (서버사이드 ExcelJS / Apache POI)' },
    ].map(d => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;border:1px solid #F3F4F6">
        <span style="color:#6366F1;font-weight:800;font-size:12px;white-space:nowrap;min-width:100px">${d.item}</span>
        <span style="font-size:11px;color:#6B7280">${d.desc}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}

/* ⑦ 개발 일정 (풀스택 개발자용) */
function _manDevPlan() {
  const phases = [
    {
      phase: 'Phase 1', title: '기반 인프라 & 인증', weeks: '1~2주', color: '#6366F1',
      items: [
        { task: 'SSO/IAM 연동 (OAuth2/SAML)', detail: '현대차그룹 통합계정 연동, 역할 자동 매핑', days: 5 },
        { task: '멀티테넌트 DB 스키마 설계', detail: 'domainId 기반 Row-Level Security 설정', days: 5 },
        { task: 'API Gateway 기본 구조', detail: '테넌트 컨텍스트 헤더 주입, 권한 미들웨어', days: 3 },
      ]
    },
    {
      phase: 'Phase 2', title: '백오피스 마스터 데이터 관리', weeks: '3~5주', color: '#7C3AED',
      items: [
        { task: '예산 계정 관리 API', detail: 'CRUD + 6단계 위저드 데이터 저장, isolationGroup 필터', days: 5 },
        { task: '가상조직 템플릿 API', detail: 'VOrg 트리 구조 저장·조회, 관리자/협력팀/직무유형', days: 4 },
        { task: '세부산출근거 API', detail: '항목 CRUD, usageScope/visibleFor/softLimit/hardLimit', days: 3 },
        { task: '양식 빌더 API', detail: 'Form Schema JSON 저장·버전관리, 공지사항/첨부파일 포함', days: 4 },
        { task: '서비스 정책 API', detail: '5단계 위저드 저장, 패턴A~E, approvalConfig{}', days: 5 },
      ]
    },
    {
      phase: 'Phase 3', title: '결재 라우팅 & 워크플로우', weeks: '6~8주', color: '#1D4ED8',
      items: [
        { task: '결재 워크플로우 엔진 연동', detail: 'Camunda/사내 전자결재 BPMN 프로세스 정의', days: 7 },
        { task: '금액 구간별 결재자 자동 라우팅', detail: 'approvalThresholds 평가 로직, 담당 결재자 배달', days: 4 },
        { task: '나의 운영 업무 API', detail: '계획/신청/결과 3탭 미결건 조회, 역할별 필터', days: 4 },
        { task: '알림 서비스', detail: '이메일/슬랙 미결건 알림, 결재완료 알림, 잔액경보', days: 3 },
      ]
    },
    {
      phase: 'Phase 4', title: '프론트오피스 (LXP) 개발', weeks: '9~12주', color: '#059669',
      items: [
        { task: '교육신청 목록 화면 (리스트 우선)', detail: '상태 뱃지(결재진행중/승인/반려), 결과작성 버튼', days: 4 },
        { task: '교육신청 위저드 (목적→예산→유형→정보)', detail: 'HAE/HSC/HMC/KIA 페르소나별 예산카드 분기', days: 6 },
        { task: '교육계획 위저드 (4단계)', detail: '가상조직 선택, 세부산출근거 입력, 계획 상신', days: 5 },
        { task: '결과보고 화면', detail: '실지출 입력, 증빙 첨부, 패턴별 결과 흐름', days: 4 },
        { task: '대시보드 & 예산 위젯', detail: '잔액·집행률·진행중 신청 실시간 표시', days: 3 },
      ]
    },
    {
      phase: 'Phase 5', title: 'ERP 연동 & 정산', weeks: '13~15주', color: '#D97706',
      items: [
        { task: 'SAP ERP 예산 잔액 동기화', detail: 'RFC/API Gateway, 가점유·실차감 이벤트 송신', days: 7 },
        { task: '파일 스토리지 연동', detail: 'S3/Object Storage 증빙 업로드, CDN 서명 URL', days: 3 },
        { task: 'Excel 리포트 추출', detail: 'ExcelJS/Apache POI 서버사이드 생성', days: 3 },
      ]
    },
    {
      phase: 'Phase 6', title: 'QA & 안정화', weeks: '16~18주', color: '#DC2626',
      items: [
        { task: '테넌트 격리 검증 (Pen Test)', detail: 'Cross-tenant 데이터 접근 차단 검증', days: 3 },
        { task: '성능 테스트', detail: '동시 결재 처리, ERP 동기화 지연 케이스', days: 3 },
        { task: 'UAT (사용자 수락 테스트)', detail: '페르소나별 시나리오 검증, 기획자 확인', days: 5 },
        { task: '운영 이관 & 문서화', detail: '배포 파이프라인 구성, 운영 매뉴얼 작성', days: 4 },
      ]
    },
  ];

  const totalWeeks = 18;
  const totalDays = phases.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.days, 0), 0);

  return `<div style="display:flex;flex-direction:column;gap:20px">

  <div style="padding:16px 20px;background:linear-gradient(135deg,#312E81,#4F46E5);border-radius:12px;color:#fff">
    <div style="font-size:13px;font-weight:900;margin-bottom:6px">🗓️ 프론트·백오피스 풀스택 개발 예상 일정</div>
    <div style="font-size:12px;opacity:.85;line-height:1.6">
      인원 기준: 시니어 풀스택 개발자 2명 + 퍼블리셔 1명 기준<br>
      총 예상 기간: <strong>${totalWeeks}주 (약 4~5개월)</strong> · 총 작업량: 약 ${totalDays} 인일(man-day)
    </div>
  </div>

  ${phases.map((p, pi) => `
  <div class="bo-card" style="padding:18px 20px;border-left:4px solid ${p.color}">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <span style="background:${p.color};color:#fff;font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px">${p.phase}</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${p.title}</span>
      <span style="margin-left:auto;font-size:11px;font-weight:700;color:${p.color};background:${p.color}15;padding:2px 10px;border-radius:6px">⏱ ${p.weeks}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${p.items.map((item, ii) => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        <div style="width:20px;height:20px;border-radius:50%;background:${p.color}20;color:${p.color};font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${pi + 1}.${ii + 1}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:2px">${item.task}</div>
          <div style="font-size:11px;color:#6B7280">${item.detail}</div>
        </div>
        <div style="font-size:10px;font-weight:700;color:#9CA3AF;white-space:nowrap">${item.days}일</div>
      </div>`).join('')}
    </div>
  </div>`).join('')}

  <div class="bo-card" style="padding:16px 20px;background:#F0FDF4;border:1.5px solid #A7F3D0">
    <div style="font-size:12px;font-weight:900;color:#065F46;margin-bottom:8px">💡 개발 우선순위 가이드</div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:#374151">
      ${[
      { p: 'P0 · 즉시', t: '메뉴 접근권한 + HAE 예산카드 + 서비스 정책 필터', c: '#DC2626' },
      { p: 'P1 · 2주내', t: '신청 리스트 화면 + 결과보고 버튼 + 양식 공지사항/첨부파일', c: '#D97706' },
      { p: 'P2 · 1달내', t: '결재 라우팅 실 연동 + SAP ERP 잔액 동기화', c: '#1D4ED8' },
      { p: 'P3 · 분기내', t: 'Excel 리포트, 어학/자격증 메뉴, 알림 서비스', c: '#6B7280' },
    ].map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:7px 12px;background:#fff;border-radius:8px">
        <span style="background:${r.c}18;color:${r.c};font-size:10px;font-weight:900;padding:2px 8px;border-radius:4px;white-space:nowrap">${r.p}</span>
        <span>${r.t}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}

/* ⑦ IA · 화면 구조 */
function _manIA() {
  const screens = [
    // ── 공통 ──
    { area: '공통', menu: '로그인/인증', screen: 'BO 로그인', type: '화면', role: '전체', diff: '★☆☆', note: 'SSO/역할 분기' },
    { area: '공통', menu: '레이아웃', screen: '사이드바·헤더·GNB', type: '컴포넌트', role: '전체', diff: '★☆☆', note: '접근권한 기반 메뉴 표시' },
    // ── 대시보드 ──
    { area: '대시보드', menu: '메인 대시보드', screen: '예산 현황 요약', type: '화면', role: '전체', diff: '★☆☆', note: '역할별 데이터 범위' },
    // ── 플랫폼 총괄 ──
    { area: '플랫폼총괄', menu: '사용자 관리', screen: '사용자 목록·편집', type: '화면', role: '플랫폼관리자', diff: '★★☆', note: '' },
    { area: '플랫폼총괄', menu: '역할 관리', screen: '역할 목록·메뉴권한', type: '화면', role: '플랫폼관리자', diff: '★★☆', note: '' },
    { area: '플랫폼총괄', menu: '역할별 메뉴관한', screen: '메뉴별 체크박스 권한표', type: '화면', role: '플랫폼관리자', diff: '★★★', note: 'role_menu_permissions 연동' },
    { area: '플랫폼총괄', menu: '격리그룹 관리', screen: '격리그룹 목록·설정', type: '화면', role: '플랫폼·테넌트', diff: '★★☆', note: '' },
    { area: '플랫폼총괄', menu: '양식 빌더', screen: '양식 목록', type: '화면', role: '전체', diff: '★☆☆', note: '' },
    { area: '플랫폼총괄', menu: '양식 빌더', screen: '양식 설계 에디터', type: '화면', role: '전체', diff: '★★★', note: 'fields jsonb 편집' },
    { area: '플랫폼총괄', menu: '입력 필드 관리', screen: '커스텀 필드 목록·생성', type: '화면', role: '플랫폼관리자', diff: '★★☆', note: 'form_templates.fields 연동' },
    { area: '플랫폼총괄', menu: '교육유형 관리', screen: '교육 목적군·유형·세부유형 트리', type: '화면', role: '플랫폼관리자', diff: '★★★', note: 'edu_type CRUD DB 연동' },
    // ── 테넌트 운영 ──
    { area: '테넌트운영', menu: '예산계정 관리', screen: '계정 목록·상세', type: '화면', role: '플랫폼·테넌트', diff: '★★☆', note: '' },
    { area: '테넌트운영', menu: '예산계정 편집', screen: '계정 생성/수정 모달', type: '모달', role: '플랫폼·테넌트', diff: '★☆☆', note: '' },
    { area: '테넌트운영', menu: '가상조직 템플릿', screen: 'VOrg 템플릿 목록', type: '화면', role: '테넌트', diff: '★★☆', note: '' },
    { area: '테넌트운영', menu: 'VOrg 템플릿 편집', screen: 'VOrg 트리 편집', type: '화면', role: '테넌트', diff: '★★★', note: 'tree jsonb + allowedJobTypes' },
    { area: '테넌트운영', menu: '산정기준 관리', screen: '산정기준 목록·편집', type: '화면', role: '테넌트', diff: '★★☆', note: '' },
    { area: '테넌트운영', menu: '서비스 정책', screen: '정책 목록 (필터 포함)', type: '화면', role: '플랫폼·테넌트·예산운영', diff: '★★★', note: '' },
    { area: '테넌트운영', menu: '서비스 정책', screen: '정책 생성 위저드 (Step 0~4)', type: '화면', role: '전체', diff: '★★★', note: '5단계 멀티스텝 위저드' },
    { area: '테넌트운영', menu: '결제 라우팅', screen: '결재선 설정', type: '화면', role: '테넌트', diff: '★★★', note: '' },
    // ── 운영 업무 ──
    { area: '운영업무', menu: '계획 관리', screen: '교육계획 목록·상세', type: '화면', role: '예산운영', diff: '★★☆', note: '' },
    { area: '운영업무', menu: '예산 배정', screen: '배정 현황·배정 모달', type: '화면', role: '예산운영', diff: '★★★', note: '' },
    { area: '운영업무', menu: '내 업무', screen: '내 운영 현황', type: '화면', role: '예산운영', diff: '★☆☆', note: '' },
    { area: '운영업무', menu: '조직 예산현황', screen: '계층별 예산 집행현황', type: '화면', role: '예산운영', diff: '★★☆', note: '' },
    // ── 분석/기타 ──
    { area: '분석', menu: '통계 및 리포트', screen: '예산 집행 리포트', type: '화면', role: '테넌트·플랫폼', diff: '★★☆', note: '' },
    { area: '기타', menu: '서비스 매뉴얼', screen: 'BO 서비스 매뉴얼', type: '화면', role: '전체', diff: '★☆☆', note: '' },
  ];
  const screenCount = screens.filter(s => s.type === '화면').length;
  const modalCount = screens.filter(s => s.type === '모달').length;
  const compCount = screens.filter(s => s.type === '컴포넌트').length;

  const tree = [
    { label: '백오피스 (BO)', indent: 0, icon: '⚙️', bold: true },
    { label: '로그인 / 인증', indent: 1, icon: '🔐', bold: false },
    { label: '대시보드', indent: 1, icon: '📊', bold: true },
    { label: '플랫폼 총괄', indent: 1, icon: '🌐', bold: true },
    { label: '사용자 관리 (목록·편집)', indent: 2, icon: '└', bold: false },
    { label: '역할 관리 / 역할별 메뉴권한', indent: 2, icon: '└', bold: false },
    { label: '격리그룹 관리 (목록·설정)', indent: 2, icon: '└', bold: false },
    { label: '양식 빌더 (목록·에디터)', indent: 2, icon: '└', bold: false },
    { label: '입력 필드 관리', indent: 2, icon: '└', bold: false },
    { label: '교육유형 관리 (트리)', indent: 2, icon: '└', bold: false },
    { label: '테넌트 운영', indent: 1, icon: '🏢', bold: true },
    { label: '예산계정 관리 (목록·편집)', indent: 2, icon: '└', bold: false },
    { label: '가상조직(VOrg) 템플릿 관리', indent: 2, icon: '└', bold: false },
    { label: '산정기준 관리', indent: 2, icon: '└', bold: false },
    { label: '서비스 정책 관리', indent: 1, icon: '🔧', bold: true },
    { label: '정책 목록 (격리그룹·계정 필터)', indent: 2, icon: '└', bold: false },
    { label: '정책 생성 위저드 (5단계)', indent: 2, icon: '└', bold: false },
    { label: 'Step 0 정책 정의 ~ Step 4 결재라인', indent: 3, icon: '△', bold: false },
    { label: '결제 라우팅 설정', indent: 2, icon: '└', bold: false },
    { label: '운영 업무', indent: 1, icon: '📋', bold: true },
    { label: '계획 관리·상세', indent: 2, icon: '└', bold: false },
    { label: '예산 배정 현황·모달', indent: 2, icon: '└', bold: false },
    { label: '내 업무', indent: 2, icon: '└', bold: false },
    { label: '조직 예산현황', indent: 2, icon: '└', bold: false },
    { label: '분석', indent: 1, icon: '📈', bold: true },
    { label: '통계 및 리포트', indent: 2, icon: '└', bold: false },
    { label: '서비스 매뉴얼', indent: 1, icon: '📖', bold: false },
  ];

  return `<div style="display:flex;flex-direction:column;gap:22px">
  <div style="padding:14px 18px;background:#EDE9FE;border-radius:12px;border:1px solid #C4B5FD">
    <h2 style="font-size:14px;font-weight:900;color:#6D28D9;margin:0 0 4px">⑦ IA (Information Architecture) · 화면 구조</h2>
    <p style="font-size:12px;color:#374151;margin:0">백오피스 전체 메뉴 계층, 화면 구성 및 접근 역할을 정의합니다.</p>
  </div>
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">📐 메뉴 구조도 (IA Tree)</h3>
    <div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px 20px">
      ${tree.map(n => `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;padding-left:${n.indent * 22}px">
        <span style="font-size:11px;color:#9CA3AF">${n.icon}</span>
        <span style="font-size:${n.bold ? '13px' : '12px'};font-weight:${n.bold ? '900' : '600'};color:${n.bold ? '#111827' : '#374151'}">${n.label}</span>
      </div>`).join('')}
    </div>
  </div>
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">📋 화면 본수 목록</h3>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <div style="padding:10px 20px;background:#DBEAFE;border-radius:10px;font-size:12px;font-weight:800;color:#1D4ED8">화면 <span style="font-size:18px;margin-left:6px">${screenCount}</span> 본</div>
      <div style="padding:10px 20px;background:#EDE9FE;border-radius:10px;font-size:12px;font-weight:800;color:#7C3AED">모달 <span style="font-size:18px;margin-left:6px">${modalCount}</span> 본</div>
      <div style="padding:10px 20px;background:#F3F4F6;border-radius:10px;font-size:12px;font-weight:800;color:#374151">컴포넌트 <span style="font-size:18px;margin-left:6px">${compCount}</span></div>
      <div style="padding:10px 20px;background:#D1FAE5;border-radius:10px;font-size:12px;font-weight:800;color:#065F46">전체 <span style="font-size:18px;margin-left:6px">${screenCount + modalCount}</span> 본</div>
    </div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F3F4F6">
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">영역</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">메뉴</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">화면명</th>
        <th style="padding:8px 12px;text-align:center;border:1px solid #E5E7EB;font-weight:900">유형</th>
        <th style="padding:8px 12px;text-align:center;border:1px solid #E5E7EB;font-weight:900">난이도</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">접근역할</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">비고</th>
      </tr></thead>
      <tbody>${screens.map((s, i) => `<tr style="background:${i % 2 === 0 ? 'white' : '#FAFAFA'}">
        <td style="padding:7px 12px;border:1px solid #E5E7EB;color:#374151">${s.area}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-weight:700;color:#111827">${s.menu}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;color:#374151">${s.screen}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;text-align:center">
          <span style="padding:2px 8px;border-radius:5px;font-weight:800;background:${s.type === '화면' ? '#DBEAFE' : s.type === '모달' ? '#EDE9FE' : '#F3F4F6'};color:${s.type === '화면' ? '#1D4ED8' : s.type === '모달' ? '#7C3AED' : '#6B7280'}">${s.type}</span>
        </td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;text-align:center;font-size:12px;color:${s.diff === '★★★' ? '#DC2626' : s.diff === '★★☆' ? '#D97706' : '#6B7280'}">${s.diff || '—'}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-size:11px;color:#6B7280">${s.role}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-size:11px;color:#9CA3AF">${s.note}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
</div>`;
}

/* ⑧ DB 구조 */
function _manDbSchema() {
  const tables = [
    { name: 'tenants', layer: 'L1 테넌트', color: '#1D4ED8', bg: '#DBEAFE', desc: '회사·법인 단위. 모든 데이터의 최상위 격리 기준', cols: ['id PK', 'name', 'short_name', 'active', 'created_at'] },
    { name: 'isolation_groups', layer: 'L2 격리그룹', color: '#16A34A', bg: '#D1FAE5', desc: '테넌트 내 예산계정 격리 그룹 (일반교육예산, R&D 등)', cols: ['id PK', 'tenant_id FK', 'name', 'status', 'created_at'] },
    { name: 'organizations', layer: 'L3 조직', color: '#B45309', bg: '#FEF3C7', desc: 'HR 조직 트리 (본부>센터>실>팀). parent_id 자기참조', cols: ['id PK', 'tenant_id FK', 'parent_id FK(self)', 'name', 'type', 'order_seq'] },
    { name: 'users', layer: 'L4 사용자', color: '#7C3AED', bg: '#EDE9FE', desc: '시스템 사용자. 조직 소속 + 직군(job_type) 구분. FO 학습자의 원천', cols: ['id PK', 'tenant_id FK', 'emp_no', 'name', 'email', 'org_id FK', 'job_type', 'status'] },
    { name: 'roles', layer: 'L4 역할', color: '#7C3AED', bg: '#EDE9FE', desc: '역할 정의 (platform_admin, learner, team_leader 등)', cols: ['code PK', 'name', 'descr', 'level'] },
    { name: 'user_roles', layer: 'L4 역할', color: '#7C3AED', bg: '#EDE9FE', desc: '사용자-역할 N:M 매핑. scope_id로 적용 범위 제한. start_date/end_date로 권한 기간 설정.', cols: ['id PK', 'user_id FK', 'role_code FK', 'tenant_id FK', 'scope_id', 'start_date', 'end_date'] },
    { name: 'role_menu_permissions', layer: 'L4 역할', color: '#7C3AED', bg: '#EDE9FE', desc: '역할별 접근 가능 메뉴 ID 목록', cols: ['role_code FK', 'menu_id'] },
    { name: 'budget_accounts', layer: 'L5 예산설정', color: '#0369A1', bg: '#E0F2FE', desc: '예산 계정. 테넌트별 OPS/PART/RND/CERT 등 계정 정의', cols: ['id PK', 'code', 'name', 'tenant_id FK', 'uses_budget', 'active', 'virtual_org_template_id FK'] },
    { name: 'budget_account_org_policy', layer: 'L5 예산설정', color: '#0369A1', bg: '#E0F2FE', desc: '통장 생성 정책. 계정별 bankbook_mode(isolated/shared) 설정', cols: ['id PK', 'budget_account_id FK', 'vorg_template_id FK', 'bankbook_mode', 'bankbook_level'] },
    { name: 'org_budget_bankbooks', layer: 'L5 예산설정', color: '#0369A1', bg: '#E0F2FE', desc: '조직별 예산 통장. 각 팀/본부의 계정별 금고 역할', cols: ['id PK', 'org_id', 'org_name', 'tenant_id', 'account_id FK', 'template_id FK', 'vorg_group_id'] },
    { name: 'virtual_org_templates', layer: 'L5 예산설정', color: '#0369A1', bg: '#E0F2FE', desc: '가상조직 템플릿. tree jsonb에 본부/센터/실/팀 저장', cols: ['id PK', 'tenant_id FK', 'isolation_group_id FK', 'name', 'tree jsonb'] },
    { name: 'service_policies', layer: 'L6 서비스구성', color: '#9D174D', bg: '#FCE7F3', desc: '서비스 정책. 예산계정·양식·가상조직·결재선을 묶는 허브', cols: ['id PK', 'tenant_id FK', 'isolation_group_id FK', 'name', 'target_type', 'purpose', 'account_codes[]', 'vorg_template_id FK', 'edu_types[]', 'process_pattern', 'approval_config jsonb', 'status'] },
    { name: 'form_templates', layer: 'L6 서비스구성', color: '#9D174D', bg: '#FCE7F3', desc: '교육신청 양식. fields jsonb에 입력 필드 구성', cols: ['id PK', 'tenant_id FK', 'isolation_group_id FK', 'account_code', 'name', 'type', 'purpose', 'target_user', 'fields jsonb', 'attachments jsonb', 'active'] },
    { name: 'plans', layer: 'L7 예산실행', color: '#DC2626', bg: '#FEE2E2', desc: '교육계획. 정책 기반으로 생성. status: draft→submitted→approved', cols: ['id PK', 'tenant_id FK', 'account_code', 'policy_id FK', 'edu_name', 'amount', 'status', 'detail jsonb'] },
    { name: 'applications', layer: 'L7 예산실행', color: '#DC2626', bg: '#FEE2E2', desc: '교육신청. 학습자 신청서 데이터 저장', cols: ['id PK', 'tenant_id FK', 'policy_id FK', 'plan_id FK', 'amount', 'status', 'detail jsonb'] },
    { name: 'ledger', layer: 'L7 예산실행', color: '#DC2626', bg: '#FEE2E2', desc: '예산 원장. 모든 예산 변동을 tx_type으로 순차 기록', cols: ['id PK', 'tenant_id FK', 'account_code', 'application_id FK', 'tx_type', 'amount', 'balance_after', 'memo'] },
  ];

  const fkRows = [
    ['edu_support_domains', 'tenant_id', 'tenants.id', '격리그룹 → 회사'],
    ['organizations', 'tenant_id', 'tenants.id', '조직 → 회사'],
    ['organizations', 'parent_id', 'organizations.id', '상위조직 (자기참조)'],
    ['users', 'tenant_id', 'tenants.id', '사용자 → 회사'],
    ['users', 'org_id', 'organizations.id', '사용자 → 소속조직'],
    ['user_roles', 'user_id', 'users.id', '사용자 역할 매핑'],
    ['user_roles', 'role_code', 'roles.code', '역할 코드 참조'],
    ['role_menu_permissions', 'role_code', 'roles.code', '역할 → 메뉴권한'],
    ['service_policies', 'tenant_id', 'tenants.id', '정책 → 회사'],
    ['service_policies', 'isolation_group_id', 'isolation_groups.id', '정책 → 격리그룹'],
    ['service_policies', 'vorg_template_id', 'virtual_org_templates.id', '정책 → 가상조직'],
    ['virtual_org_templates', 'isolation_group_id', 'isolation_groups.id', '가상조직 → 격리그룹'],
    ['form_templates', 'tenant_id', 'tenants.id', '양식 → 회사'],
    ['plans', 'tenant_id', 'tenants.id', '계획 → 회사'],
    ['plans', 'policy_id', 'service_policies.id', '계획 → 서비스 정책'],
    ['ledger', 'tenant_id', 'tenants.id', '원장 → 회사'],
    ['ledger', 'application_id', 'applications.id', '원장 → 신청'],
  ];

  const jsonbRows = [
    ['virtual_org_templates', 'tree', '본부/센터/실/팀 계층 + allowedJobTypes + budget'],
    ['service_policies', 'approval_config', '단계별 결재선 (임계금액·결재자 키)'],
    ['form_templates', 'fields', '입력 필드 목록 [{key, scope, required}]'],
    ['form_templates', 'attachments', '필수 첨부파일 목록'],
    ['plans', 'detail', '교육 상세 정보 (자유형식)'],
    ['applications', 'detail', '교육 신청 상세 정보'],
  ];

  const layerGroups = [...new Set(tables.map(t => t.layer))];

  return `<div style="display:flex;flex-direction:column;gap:22px">
  <div style="padding:14px 18px;background:#DBEAFE;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:900;color:#1D4ED8;margin:0 0 4px">⑨ DB 구조 관계도</h2>
    <p style="font-size:12px;color:#374151;margin:0">Supabase PostgreSQL 기반 ${tables.length}개 테이블 구조와 FK 관계를 정의합니다. (2026-04-02 현재)</p>
  </div>

  <!-- ERD 이미지 -->
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">📊 ERD 전체 관계도</h3>
    <div style="text-align:center;background:#0F172A;border-radius:14px;padding:16px;overflow:hidden">
      <img src="images/erd_diagram.png" alt="ERD Diagram" style="width:100%;max-width:900px;border-radius:10px">
    </div>
    <p style="font-size:11px;color:#9CA3AF;text-align:center;margin-top:6px">클릭하여 원본 크기로 확인하세요 (2026-03-25 기준)</p>
  </div>

  <!-- 레이어별 테이블 카드 -->
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 12px">📦 테이블 레이어 구조</h3>
    ${layerGroups.map(layer => {
    const layerTables = tables.filter(t => t.layer === layer);
    const c = layerTables[0].color;
    const bg = layerTables[0].bg;
    return `<div style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:900;color:${c};background:${bg};border-radius:8px;padding:6px 14px;margin-bottom:8px;display:inline-block">${layer}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
          ${layerTables.map(t => `
          <div style="background:white;border:1.5px solid ${c}30;border-left:4px solid ${c};border-radius:10px;padding:12px 14px">
            <div style="font-size:13px;font-weight:900;color:#111827;margin-bottom:4px;font-family:monospace">${t.name}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:8px">${t.desc}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${t.cols.map(col => {
      const isPK = col.includes('PK');
      const isFK = col.includes('FK');
      const isJson = col.includes('jsonb');
      const isArr = col.includes('[]');
      const bg2 = isPK ? '#FEF3C7' : isFK ? '#EDE9FE' : isJson ? '#E0F2FE' : isArr ? '#D1FAE5' : '#F3F4F6';
      const col2 = isPK ? '#B45309' : isFK ? '#7C3AED' : isJson ? '#0369A1' : isArr ? '#16A34A' : '#374151';
      return `<span style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:5px;background:${bg2};color:${col2}">${col}</span>`;
    }).join('')}
            </div>
          </div>`).join('')}
        </div>
      </div>`;
  }).join('')}
  </div>

  <!-- 범례 -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB">
    <span style="font-size:11px;font-weight:700;color:#374151">컬럼 유형 범례:</span>
    <span style="font-size:10px;background:#FEF3C7;color:#B45309;padding:2px 8px;border-radius:5px;font-weight:800">PK = 기본키</span>
    <span style="font-size:10px;background:#EDE9FE;color:#7C3AED;padding:2px 8px;border-radius:5px;font-weight:800">FK = 외래키</span>
    <span style="font-size:10px;background:#E0F2FE;color:#0369A1;padding:2px 8px;border-radius:5px;font-weight:800">jsonb = JSON객체</span>
    <span style="font-size:10px;background:#D1FAE5;color:#16A34A;padding:2px 8px;border-radius:5px;font-weight:800">[] = 배열</span>
  </div>

  <!-- FK 관계 테이블 -->
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">🔗 주요 FK 관계 (${fkRows.length}개)</h3>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F3F4F6">
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">테이블</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">컬럼</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">참조</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">설명</th>
      </tr></thead>
      <tbody>${fkRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? 'white' : '#FAFAFA'}">
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-family:monospace;font-size:11px;color:#111827">${r[0]}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-family:monospace;font-size:11px;color:#7C3AED">${r[1]}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-family:monospace;font-size:11px;color:#0369A1">${r[2]}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-size:11px;color:#6B7280">${r[3]}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>

  <!-- JSONB 구조 -->
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">🗃️ JSONB 필드 구조 (${jsonbRows.length}개)</h3>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F3F4F6">
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">테이블</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">컬럼</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">저장 내용</th>
      </tr></thead>
      <tbody>${jsonbRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? 'white' : '#FAFAFA'}">
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-family:monospace;font-size:11px;color:#111827">${r[0]}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-family:monospace;font-size:11px;color:#0369A1">${r[1]}</td>
        <td style="padding:7px 12px;border:1px solid #E5E7EB;font-size:11px;color:#374151">${r[2]}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>

  <!-- 데이터 흐름 요약 -->
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">🔄 데이터 생성 순서 (관리자 기준)</h3>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">
      ${['tenants', 'edu_support_domains', 'organizations', 'users + user_roles', 'virtual_edu_orgs', 'form_templates', 'service_policies', 'plans', 'ledger'].map((step, i, arr) => `
      <div style="text-align:center">
        <div style="background:#EFF6FF;border:1.5px solid #93C5FD;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:800;color:#1D4ED8;white-space:nowrap">${step}</div>
      </div>
      ${i < arr.length - 1 ? '<span style="font-size:16px;color:#93C5FD;font-weight:900">→</span>' : ''}
      `).join('')}
    </div>
  </div>
</div>`;
}
