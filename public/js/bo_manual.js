// ─── 백오피스: 서비스 매뉴얼 ────────────────────────────────────────────────
// 목적: 서비스 기획자 및 개발자가 현대/기아/HAE 교육예산관리 시스템을
//       이해하고 실제 구현에 활용할 수 있도록 페르소나별 업무 흐름과
//       각 메뉴·기능을 상세히 설명합니다.

function renderBoManual() {
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">

  <!-- 헤더 -->
  <div style="margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="background:#6366F1;color:#fff;font-size:9px;font-weight:900;padding:3px 10px;border-radius:6px;letter-spacing:.1em">MANUAL</span>
      <h1 class="bo-page-title" style="margin:0">백오피스 서비스 매뉴얼</h1>
    </div>
    <p style="font-size:13px;color:#6B7280;margin:0">
      서비스 기획자 및 개발자를 위한 현대차/기아/HAE 일반교육예산 관리 시스템 안내서입니다.<br>
      작성일: 2026-03-20 &nbsp;|&nbsp; 프로토타입 버전 v1.0
    </p>
  </div>

  <!-- 탭 네비게이션 -->
  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0">
    ${[
      { id: 'overview',   label: '① 시스템 개요' },
      { id: 'personas',   label: '② 페르소나별 업무' },
      { id: 'menus',      label: '③ 메뉴 상세' },
      { id: 'data-flow',  label: '④ 데이터 흐름' },
      { id: 'tech',       label: '⑤ 기술 구조' },
    ].map(t => `
    <button onclick="_manSetTab('${t.id}')" id="mbtab-${t.id}"
      style="padding:10px 18px;font-size:12px;font-weight:700;border:none;border-bottom:3px solid transparent;
             background:none;cursor:pointer;color:#6B7280;transition:all .15s;white-space:nowrap">
      ${t.label}
    </button>`).join('')}
  </div>

  <div id="manual-content">${_renderManOverview()}</div>
</div>`;

  // 첫 탭 활성화
  setTimeout(() => _manSetTab('overview'), 0);
}

let _manActiveTab = 'overview';
function _manSetTab(id) {
  _manActiveTab = id;
  document.querySelectorAll('[id^="mbtab-"]').forEach(b => {
    const isActive = b.id === `mbtab-${id}`;
    b.style.color       = isActive ? '#6366F1' : '#6B7280';
    b.style.borderColor = isActive ? '#6366F1' : 'transparent';
    b.style.fontWeight  = isActive ? '800' : '700';
  });
  const content = document.getElementById('manual-content');
  if (!content) return;
  if (id === 'overview')  content.innerHTML = _renderManOverview();
  if (id === 'personas')  content.innerHTML = _renderManPersonas();
  if (id === 'menus')     content.innerHTML = _renderManMenus();
  if (id === 'data-flow') content.innerHTML = _renderManDataFlow();
  if (id === 'tech')      content.innerHTML = _renderManTech();
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ① 시스템 개요                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function _renderManOverview() {
  return `
<div style="display:flex;flex-direction:column;gap:20px">

  <div class="bo-card" style="padding:22px;background:linear-gradient(135deg,#EEF2FF,#F5F3FF)">
    <h2 style="font-size:16px;font-weight:800;color:#4338CA;margin:0 0 10px">시스템 목적</h2>
    <p style="font-size:13px;color:#374151;line-height:1.8;margin:0">
      현대자동차, 기아, 현대오토에버 등 그룹사가 교육 운영 및 과정 개발에 사용하는
      <strong>일반교육예산(운영계정/기타계정)</strong>과 <strong>R&D 교육예산</strong>을 통합 관리하는
      멀티 테넌트 예산관리 플랫폼입니다.
      예산 계획 수립 → 교육 신청 → 결과 정산의 전체 흐름을 지원하며,
      표준화된 산출 근거, 상한액(Ceiling) 통제, 금액별 동적 결재선을 제공합니다.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="bo-card" style="padding:18px">
      <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🏢 테넌트 구성</div>
      ${[
        { id: 'HMC', name: '현대자동차', accounts: 'HMC-OPS · HMC-PART · HMC-ETC · HMC-RND', color: '#1D4ED8' },
        { id: 'KIA', name: '기아',       accounts: 'KIA-OPS · KIA-PART', color: '#059669' },
        { id: 'HAE', name: '현대오토에버', accounts: 'HAE-OPS · HAE-PART · HAE-CERT', color: '#7C3AED' },
      ].map(t => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-radius:8px;background:#F9FAFB;margin-bottom:8px">
        <span style="background:${t.color};color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:4px;white-space:nowrap">${t.id}</span>
        <div>
          <div style="font-weight:700;font-size:13px;color:#374151">${t.name}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">${t.accounts}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="bo-card" style="padding:18px">
      <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🔄 주요 업무 흐름</div>
      ${[
        { step: '1', label: '예산 마스터 설정', desc: '계정·항목·결재라인·가상조직 설정 (총괄)', color: '#6366F1' },
        { step: '2', label: '예산 배정',         desc: '본부·팀별 예산 분배 (총괄→본부→팀)', color: '#2563EB' },
        { step: '3', label: '교육계획 수립',      desc: '세부산출근거 기반 계획서 상신·승인', color: '#059669' },
        { step: '4', label: '교육 신청',          desc: '승인 계획 + 가용예산 매핑 → 신청', color: '#D97706' },
        { step: '5', label: '결과 정산',          desc: '실지출 입력·증빙등록·차액처리', color: '#DC2626' },
      ].map(s => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="background:${s.color};color:#fff;font-size:10px;font-weight:900;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">${s.step}</span>
        <div>
          <span style="font-size:12px;font-weight:700;color:#374151">${s.label}</span>
          <span style="font-size:11px;color:#6B7280;margin-left:6px">${s.desc}</span>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:18px">
    <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🎭 역할(Role) 체계</div>
    <div style="overflow:auto">
      <table class="bo-table">
        <thead><tr>
          <th>역할 코드</th><th>역할명</th><th>주요 권한</th><th>예시 페르소나</th>
        </tr></thead>
        <tbody>
          ${[
            ['platform_admin', '플랫폼 총괄', '전사 모니터링, 관리자 권한 매핑, 테넌트 간 현황', '장민준'],
            ['total_general',  '일반예산 총괄', '예산계정/산출근거/결재라인/가상조직 설정 + 배정 + 보고', '신승남(HMC), 고범현(KIA), 안슬기(HAE)'],
            ['total_rnd',      'R&D예산 총괄', 'R&D계정 설정 + 배정 + 보고', '류해령(HMC)'],
            ['hq_general',     '일반예산 본부', '위임된 본부 예산 배정 + 교육계획 검토', '이채현(HMC), 장성범(KIA), 김하늘(HAE)'],
            ['center_rnd',     'R&D 센터',     '센터 단위 R&D 예산 배정', '이상하(HMC)'],
            ['team_general',   '팀 담당자',    'LXP 교육계획 수립 + 교육신청', '조인성(HMC)'],
            ['learner',        '일반 학습자',  'LXP 교육신청', '이상봉(HMC)'],
          ].map(([code, name, perm, ex]) => `
          <tr>
            <td><code style="background:#F3F4F6;padding:2px 6px;border-radius:4px;font-size:11px">${code}</code></td>
            <td style="font-weight:700;font-size:12px">${name}</td>
            <td style="font-size:11px;color:#6B7280">${perm}</td>
            <td style="font-size:11px;color:#374151">${ex}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ② 페르소나별 업무 흐름                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function _renderManPersonas() {
  const personas = [
    {
      name: '장민준 (플랫폼 총괄 Admin)',
      role: 'platform_admin', badge: '#374151',
      desc: '시스템 전체를 관리하는 플랫폼 운영팀입니다. 테넌트 간 데이터는 열람하지 않으며, 관리자 역할 매핑과 전사 예산 현황 모니터링에 집중합니다.',
      steps: [
        { icon: '🔐', title: '관리자 권한 매핑', desc: '각 테넌트별 총괄 담당자(전이)에 역할을 부여합니다. 역할 변경 시 활성 메뉴도 자동 연동됩니다.' },
        { icon: '🖥️', title: '전사 예산 모니터링', desc: '테넌트별 예산 집행률, 잔액, 계획·신청 건수를 실시간으로 확인합니다. (SAP ERP 연동 데이터 기반)' },
        { icon: '📈', title: '통계 및 리포트', desc: '산출근거별 지출 통계, 테넌트별 집행 비교, 전사 예산 소진율 리포트를 Excel로 추출합니다.' },
      ],
      menus: ['대시보드', '전사 예산 모니터링', '관리자 권한 매핑', '통계 및 리포트'],
    },
    {
      name: '신승남 (HMC 일반예산 총괄)',
      role: 'total_general', badge: '#1D4ED8',
      desc: '현대자동차 일반예산(HMC-OPS, HMC-PART, HMC-ETC) 3개 계정을 전속 소유하며, 마스터 데이터 전반을 설정합니다. 예산 배정, 계획 검토, 결재라인 관리가 주 업무입니다.',
      steps: [
        { icon: '💳', title: '예산 계정 설정 (6단계)', desc: '① 계정 기본정보 → ② 가상조직 연결 → ③ 양식 연결 → ④ 산출근거 연결 → ⑤ 역할·권한 설정 → ⑥ 기간·상태 설정 순서로 계정을 구성합니다.' },
        { icon: '🏢', title: '가상조직 템플릿 관리', desc: '본부/팀 구조를 VOrg 템플릿으로 정의합니다. 관리자 지정, 협력 팀 지정, 직무 유형 제한(생산직/사무직) 등을 설정합니다.' },
        { icon: '📐', title: '세부산출근거 관리', desc: '운영계정(21종), 기타계정(7종) 항목을 계정별로 독립 관리합니다. 항목별 기준단가, Soft/Hard Limit, 사용 단계(계획·신청·결과), 교육 유형(국내/해외) 설정이 가능합니다.' },
        { icon: '📊', title: '계정별 결재라인 설정', desc: '계정 성격에 따라 금액 구간별 결재 단계를 설정합니다. 예: 운영계정 100만 미만→팀장전결, 기타계정 0원부터→실장 승인 필수.' },
        { icon: '📝', title: '교육 양식 & 학습유형', desc: '교육신청서 양식을 No-code Form Builder로 구성합니다. 학습 유형(집합/이러닝/워크샵 등)별 필수 필드와 선택 필드를 설정합니다.' },
        { icon: '💰', title: '예산 배정 및 관리', desc: '전체 예산을 본부·팀별로 분배합니다. 추가 배정, 이관, 잔액 모니터링이 포함됩니다.' },
        { icon: '📋', title: '교육계획 관리', desc: '팀 담당자가 상신한 교육계획을 검토·승인·반려합니다. 세부산출근거와 결재선이 자동 구성되어 표시됩니다.' },
      ],
      menus: ['대시보드', '예산 계정 관리', '가상조직 템플릿', '교육 양식 & 학습유형', '세부산출근거 관리', '계정별 결재라인 설정', '서비스 정책 관리', '교육계획 관리', '예산 배정 및 관리', '나의 운영 업무', '통계 및 리포트'],
    },
    {
      name: '류해령 (HMC R&D예산 총괄)',
      role: 'total_rnd', badge: '#DC2626',
      desc: 'HMC-RND 계정을 전속 소유합니다. 일반예산 데이터와 완전히 격리(isolationGroup)되며, R&D 교육에 특화된 세부산출근거와 결재라인을 별도로 운영합니다.',
      steps: [
        { icon: '💳', title: 'R&D 계정 설정', desc: 'HMC-RND 계정에 대한 마스터 설정. 일반예산 총괄과 동일한 6단계 프로세스를 따르되, 대상 계정이 R&D 계정만 표시됩니다.' },
        { icon: '📐', title: '세부산출근거 (R&D 전용)', desc: 'HMC-RND 계정은 accountType=ops로 매핑되어 운영계정 항목 풀만 표시됩니다. 기타계정 탭은 노출되지 않습니다.' },
        { icon: '📊', title: '결재라인 설정', desc: 'R&D 예산은 고액 집행이 많아 0원부터 실장 승인이 필요한 경우가 많습니다. 별도 결재 정책을 설정합니다.' },
      ],
      menus: ['대시보드', '예산 계정 관리 (R&D)', '가상조직 템플릿', '교육 양식', '세부산출근거 관리 (운영탭만)', '계정별 결재라인 설정', '예산 배정 및 관리', '교육계획 관리', '통계 및 리포트'],
    },
    {
      name: '고범현 (KIA 일반예산 총괄)',
      role: 'total_general', badge: '#059669',
      desc: 'KIA-OPS, KIA-PART 2개 계정을 관리합니다. KIA는 기타계정이 없어 세부산출근거에서 운영계정 탭만 표시됩니다. HMC 데이터와 완전 격리됩니다.',
      steps: [
        { icon: '💳', title: 'KIA 예산 계정 설정', desc: 'KIA-OPS(운영), KIA-PART(참가비) 계정 설정. HMC 계정과 격리그룹(isolationGroup)이 달라 교차 접근 불가.' },
        { icon: '📐', title: '세부산출근거 (운영계정만)', desc: 'KIA는 기타계정이 없어 운영계정 항목 풀만 관리합니다. KIA-PART는 교육참가비(CG017) 항목만 활성화됩니다.' },
      ],
      menus: ['대시보드', '예산 계정 관리', '가상조직 템플릿', '세부산출근거 관리 (운영탭만)', '계정별 결재라인 설정', '교육계획 관리', '예산 배정 및 관리', '통계 및 리포트'],
    },
    {
      name: '안슬기 (HAE 예산 총괄)',
      role: 'total_general', badge: '#7C3AED',
      desc: '현대오토에버의 HAE-OPS, HAE-PART, HAE-CERT 3개 계정을 관리합니다. HAE-CERT(자격증 지원)는 기타계정 유형으로 가입비·기타 2종 항목만 노출됩니다.',
      steps: [
        { icon: '💳', title: 'HAE 계정 설정', desc: 'canAssignOwnership=true 속성으로 계정 소유권을 위임할 수 있는 특수 권한이 있습니다.' },
        { icon: '📐', title: '세부산출근거 (운영+기타 2종)', desc: '운영계정 탭 (HAE-OPS, HAE-PART): 전체 21종 | 기타계정 탭 (HAE-CERT): CG104 가입비, CG107 기타 2种만 노출. enabledItemIds 제한 적용.' },
      ],
      menus: ['대시보드', '예산 계정 관리', '가상조직 템플릿', '세부산출근거 관리 (운영+기타)', '계정별 결재라인 설정', '예산 배정 및 관리', '교육계획 관리', '통계 및 리포트'],
    },
    {
      name: '이채현 / 장성범 / 김하늘 (본부 담당자)',
      role: 'hq_general', badge: '#92400E',
      desc: '총괄로부터 위임받은 본부 범위 내 예산을 운영합니다. 마스터 설정 권한은 없으며, 교육계획 검토·배정·현황 관리가 주 업무입니다.',
      steps: [
        { icon: '💰', title: '본부 예산 배정 수령', desc: '총괄에서 배정받은 예산을 하위 팀에 재분배합니다.' },
        { icon: '📋', title: '교육계획 검토', desc: '팀 담당자가 제출한 교육계획서를 1차 검토하고 의견을 달아 최종 결재권자에게 전달합니다.' },
        { icon: '📥', title: '나의 운영 업무', desc: '미결 승인 건, 반려 처리, 본부 집행 현황을 확인합니다.' },
      ],
      menus: ['대시보드', '예산 배정 및 관리', '나의 운영 업무', '통계 및 리포트'],
    },
  ];

  return `
<div style="display:flex;flex-direction:column;gap:20px">
  <div style="padding:12px 16px;background:#F0FDF4;border-radius:8px;border:1px solid #A7F3D0;font-size:12px;color:#065F46;font-weight:600">
    💡 아래 페르소나는 프로토타입에서 헤더 드롭다운으로 전환하여 각 역할의 화면을 확인할 수 있습니다.
    실제 구현 시에는 로그인 권한에 따라 자동 적용됩니다.
  </div>

  ${personas.map(p => `
  <div class="bo-card" style="padding:0;overflow:hidden">
    <!-- 페르소나 헤더 -->
    <div style="padding:16px 20px;background:${p.badge}12;border-bottom:1.5px solid ${p.badge}20;display:flex;align-items:flex-start;gap:14px">
      <div style="background:${p.badge};color:#fff;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:900;white-space:nowrap;flex-shrink:0">
        ${p.role}
      </div>
      <div>
        <div style="font-size:15px;font-weight:800;color:#111827">${p.name}</div>
        <div style="font-size:12px;color:#6B7280;margin-top:3px;line-height:1.5">${p.desc}</div>
      </div>
    </div>

    <!-- 업무 단계 -->
    <div style="padding:16px 20px">
      <div style="font-size:11px;font-weight:800;color:#374151;margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">업무 단계</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${p.steps.map((s, i) => `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:#F9FAFB;border-radius:10px;border:1px solid #F3F4F6">
          <span style="font-size:18px;flex-shrink:0;margin-top:-1px">${s.icon}</span>
          <div>
            <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:2px">
              <span style="color:#9CA3AF;font-weight:600;margin-right:6px">Step ${i+1}</span>${s.title}
            </div>
            <div style="font-size:11px;color:#6B7280;line-height:1.6">${s.desc}</div>
          </div>
        </div>`).join('')}
      </div>
      <!-- 접근 가능 메뉴 -->
      <div style="margin-top:12px">
        <span style="font-size:11px;color:#6B7280;font-weight:700">접근 메뉴: </span>
        ${p.menus.map(m => `<span style="background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;margin:2px;display:inline-block">${m}</span>`).join('')}
      </div>
    </div>
  </div>`).join('')}
</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ③ 메뉴 상세                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function _renderManMenus() {
  const sections = [
    {
      section: '예산·설정 (마스터 관리)',
      color: '#1D4ED8',
      menus: [
        {
          icon: '📊', id: 'dashboard', name: '대시보드',
          roles: '전체',
          desc: 'KPI 카드(예산 총액·집행·잔액·계획·신청·승인), 긴급 처리 건, 예산 소진률 차트, 최근 활동 피드를 표시합니다.',
          impl: '현재는 Mock 데이터로 렌더링. 실제 구현 시 SAP ERP API + 내부 DB 집계 필요.',
        },
        {
          icon: '💳', id: 'budget-account', name: '예산 계정 관리',
          roles: 'total_general, total_rnd',
          desc: `<strong>6단계 위저드</strong>로 예산 계정을 설정합니다.<br>
            Step1 계정 기본정보→ Step2 가상조직 연결→ Step3 학습유형 연결→ Step4 산출근거 연결→ Step5 역할·권한→ Step6 기간·상태.<br>
            테넌트별 isolationGroup으로 타사 데이터 완전 차단. canAssignOwnership=true인 경우 소유권 위임 가능.`,
          impl: '계정 생성 시 UUID 발급. isolationGroup은 DB 쿼리 필터로 구현. Step 저장은 각 단계별 PATCH API.',
        },
        {
          icon: '🏢', id: 'virtual-org', name: '가상조직 템플릿 관리',
          roles: 'total_general, total_rnd',
          desc: `실제 조직도와 독립된 <strong>예산 집행용 가상 조직</strong>을 템플릿으로 정의합니다.<br>
            VOrg 관리자 지정, 협력팀 연결, 직무 유형 제한(생산직/사무직 분리) 설정이 가능합니다.<br>
            이 템플릿은 예산 계정 설정 Step2에서 선택 연결됩니다.`,
          impl: '관리자 지정 시 persona FK 참조. 직무 유형은 HR 시스템과 동기화 필요.',
        },
        {
          icon: '📝', id: 'form-builder', name: '교육 양식 & 학습유형',
          roles: 'total_general, total_rnd',
          desc: `No-code <strong>Form Builder</strong>로 교육신청서 양식을 구성합니다.<br>
            집합교육·이러닝·워크샵 등 학습 유형별 전용 필드를 드래그앤드롭으로 설정합니다.<br>
            필수/선택 여부, 노출 조건(국내/해외, 직무 유형)을 설정할 수 있습니다.`,
          impl: 'Form Schema를 JSON으로 저장. 프론트에서 동적 폼 렌더링. 조건부 노출은 rule 엔진 필요.',
        },
        {
          icon: '📐', id: 'calc-grounds', name: '세부 산출 근거 관리',
          roles: 'total_general, total_rnd',
          desc: `교육담당자가 예산 계획·신청 시 선택하는 <strong>표준 항목 풀(Pool)</strong>을 계정별로 관리합니다.<br>
            <strong>주요 설정</strong>: 항목명·가이드·기준단가 / Soft Limit(경고) · Hard Limit(차단) / <strong>사용 단계</strong>(계획·신청·결과 각각 활성화) / <strong>교육 유형</strong>(국내·해외·모두).<br>
            동일 테넌트 내 운영계정/기타계정별 항목 풀이 완전 분리됩니다.`,
          impl: '사용단계·교육유형은 usageScope[], visibleFor 필드로 저장. 프론트에서 컨텍스트(stage, eduType) 전달 시 필터링.',
        },
        {
          icon: '📊', id: 'approval-routing', name: '계정별 결재라인 설정',
          roles: 'total_general, total_rnd',
          desc: `교육 신청 시 동작하는 <strong>금액 기반 자동 결재선</strong>을 계정별로 설정합니다.<br>
            설정 단위: 테넌트 > 예산 계정 > 금액 구간.<br>
            예: 운영계정 100만 미만→팀장 전결 / 기타계정 0원부터→팀장+실장.<br>
            신청 총액(세부산출근거 합계) 기준으로 결재선이 자동 생성됩니다.`,
          impl: '결재선 평가 로직은 getApprovalRoute() 함수. 실제로는 결재 워크플로우 엔진(ex. Camunda) 연동 필요.',
        },
        {
          icon: '🔧', id: 'service-policy', name: '서비스 정책 관리',
          roles: 'total_general, total_rnd',
          desc: '잔액 경고 임계치, 홀딩 기간, 미정산 자동 알림 주기 등 운영 정책을 설정합니다.',
          impl: '테넌트별 policy 테이블 관리. 알림은 배치 잡 + 알림 서비스 연동.',
        },
      ],
    },
    {
      section: '운영 메뉴',
      color: '#059669',
      menus: [
        {
          icon: '📋', id: 'plan-mgmt', name: '교육계획 관리',
          roles: '전체 (본인 관할 범위)',
          desc: `<strong>프론트오피스에서 상신된 교육계획서</strong>를 검토·승인·반려합니다.<br>
            목록에서 상태(임시저장·검토중·승인완료·반려)별 필터링, 세부산출근거 내역, 결재선 확인이 가능합니다.<br>
            <strong>승인 완료된 계획</strong>은 '교육 실행의 증빙 근거'로 확정되며, 이후 교육 신청 시 연결됩니다.<br>
            ⚠ 계획 승인은 예산을 할당하지 않습니다. 예산 배정은 별도 분배 절차입니다.`,
          impl: '계획 상태 머신: draft→reviewing→approved/rejected. 결재선은 APPROVAL_ROUTING 조회 후 동적 생성.',
        },
        {
          icon: '💰', id: 'allocation', name: '예산 배정 및 관리',
          roles: '총괄, 본부',
          desc: '전체 예산을 본부·팀별로 분배합니다. 추가 배정, 이관, 회수가 가능하며, 각 단위별 잔액·집행률을 실시간으로 확인합니다.',
          impl: '배정 트리 구조(ROOT→본부→팀). 예산 홀딩(가점유) 상태 필요. 잔액 = 배정-홀딩-집행.',
        },
        {
          icon: '📥', id: 'my-operations', name: '나의 운영 업무',
          roles: '전체',
          desc: '내가 처리해야 할 미결 건(계획 승인, 신청 결재, 정산 확인), 최근 완료 건, 알림 목록을 보여줍니다.',
          impl: '푸시 알림 / 이메일 알림 + 대시보드 배지 숫자 연동.',
        },
        {
          icon: '📈', id: 'reports', name: '통계 및 리포트',
          roles: 'total_general, total_rnd, hq_general',
          desc: '산출근거별 지출 비중, 본부/팀별 집행률, 연간 예산 vs 실집행 추이, 미사용 예산 현황을 차트 및 Excel로 제공합니다.',
          impl: 'Excel 추출은 서버사이드 POI/ExcelJS. 대용량 데이터는 비동기 작업큐 처리.',
        },
      ],
    },
  ];

  return `
<div style="display:flex;flex-direction:column;gap:24px">
  ${sections.map(s => `
  <div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:4px;height:18px;background:${s.color};border-radius:2px"></div>
      <span style="font-size:14px;font-weight:800;color:${s.color}">${s.section}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${s.menus.map(m => `
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
    </div>
  </div>`).join('')}
</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ④ 데이터 흐름                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
function _renderManDataFlow() {
  return `
<div style="display:flex;flex-direction:column;gap:20px">

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">예산 생애주기 (Budget Lifecycle)</h3>
    <div style="display:flex;flex-direction:column;gap:0">
      ${[
        { step: 'A', title: '마스터 설정', who: 'total_general / total_rnd', detail: '예산 계정 → 가상조직 → 결재라인 → 세부산출근거 → 서비스정책 설정', color: '#6366F1' },
        { step: 'B', title: '예산 배정', who: 'total_general → hq_general → 팀', detail: '총괄이 본부에 배정 → 본부가 팀에 재분배 → 팀 가용예산 확정', color: '#2563EB' },
        { step: 'C', title: '교육계획 수립 (LXP)', who: 'team_general / learner', detail: '프론트오피스에서 세부산출근거 선택·입력 → 상신 → 승인 → "증빙 근거" 확정', color: '#059669' },
        { step: 'D', title: '교육 신청 (LXP)', who: 'team_general / learner', detail: '승인 계획 선택 + 팀 가용예산 범위 내 집행금액 확정 → 신청금액 홀딩(가점유)', color: '#D97706' },
        { step: 'E', title: '결재 처리', who: '결재 라인 자동 구성', detail: '신청 총액 기준 account-routing 조회 → 팀장→실장→본부장 순차 결재', color: '#7C3AED' },
        { step: 'F', title: '결과 정산', who: 'team_general', detail: '실지출 입력 + 증빙 업로드 → 신청액 vs 실지출 차액 처리 → 홀딩 해제 + 예산 복구/소진 확정', color: '#DC2626' },
      ].map((s, i, arr) => `
      <div style="display:flex;gap:0">
        <div style="display:flex;flex-direction:column;align-items:center;width:40px;flex-shrink:0">
          <div style="width:32px;height:32px;border-radius:50%;background:${s.color};color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${s.step}</div>
          ${i < arr.length-1 ? `<div style="width:2px;flex:1;background:#E5E7EB;min-height:20px;margin:2px 0"></div>` : ''}
        </div>
        <div style="padding:0 0 ${i < arr.length-1 ? '16px' : '0'} 14px;flex:1">
          <div style="font-size:13px;font-weight:800;color:#111827">${s.title}</div>
          <div style="font-size:11px;color:#6B7280;margin-bottom:3px">담당: ${s.who}</div>
          <div style="font-size:11px;color:#374151;background:#F9FAFB;padding:8px 12px;border-radius:8px;border:1px solid #F3F4F6">${s.detail}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">예산 잔액 계산 공식</h3>
    <div style="padding:16px;background:#F0F9FF;border-radius:10px;border:1px solid #BAE6FD;font-family:monospace;font-size:12px;color:#0C4A6E;line-height:2">
      <strong>배정 예산 (Allocated)</strong> = 총괄 배정액<br>
      <strong>홀딩 (Holding)</strong>      = Σ 신청서 제출 후 결재 미완료 금액<br>
      <strong>집행 (Executed)</strong>      = Σ 정산 완료 실지출액<br>
      <strong>가용 잔액</strong>             = 배정 − 홀딩 − 집행<br>
      <br>
      ⚠ 신청액 &gt; 실지출 → 차액은 <strong>자동 복구</strong> (가용 잔액 증가)<br>
      ⚠ 신청액 &lt; 실지출 → <strong>추가 예산 승인</strong> 또는 이관 프로세스 필요
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">세부산출근거 → 결재선 자동 생성 흐름</h3>
    <div style="padding:14px;background:#FFFBEB;border-radius:10px;border:1px solid #FDE68A;font-size:12px;color:#92400E;line-height:2">
      교육신청 제출<br>
      → 세부산출근거 합계 계산 (Σ 항목별 수량 × 단가)<br>
      → getApprovalRoute(tenantId, accountCode, totalAmount) 호출<br>
      → APPROVAL_ROUTING에서 해당 금액 구간 range 검색<br>
      → range.approvers 배열을 결재선으로 자동 매핑<br>
      → 결재 요청 발송 (팀장 → 실장 → 본부장 순)
    </div>
  </div>

</div>`;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  ⑤ 기술 구조                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
function _renderManTech() {
  return `
<div style="display:flex;flex-direction:column;gap:20px">

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">📁 파일 구조 (프로토타입)</h3>
    <div style="font-family:monospace;font-size:12px;color:#374151;background:#F9FAFB;padding:16px;border-radius:10px;line-height:1.8">
      public/<br>
      ├── <strong>index.html</strong>         &nbsp;— 프론트오피스 엔트리<br>
      ├── <strong>backoffice.html</strong>    &nbsp;— 백오피스 엔트리<br>
      └── js/<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">data.js</span>             &nbsp;— 프론트 Mock 데이터 (페르소나, 예산, 계획, 신청)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">bo_data.js</span>          &nbsp;— 백오피스 Mock 데이터 (BO_PERSONAS, ACCOUNT_MASTER, CALC_GROUNDS_MASTER, APPROVAL_ROUTING 등)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_layout.js</span>        &nbsp;— 사이드바, 헤더, 페르소나 전환, boNavigate()<br>
      &nbsp;&nbsp;&nbsp;├── bo_dashboard.js     &nbsp;— 대시보드<br>
      &nbsp;&nbsp;&nbsp;├── bo_budget_master.js &nbsp;— 예산 계정 관리 (6단계 위저드)<br>
      &nbsp;&nbsp;&nbsp;├── bo_virtual_org.js   &nbsp;— 가상조직 템플릿<br>
      &nbsp;&nbsp;&nbsp;├── bo_form_builder.js  &nbsp;— 교육 양식 Form Builder<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_calc_grounds.js</span>  &nbsp;— 세부산출근거 관리 (사용단계·교육유형 포함)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_approval_routing.js</span>&nbsp;— 계정별 결재라인 설정<br>
      &nbsp;&nbsp;&nbsp;├── bo_plan_mgmt.js     &nbsp;— 교육계획 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_allocation.js    &nbsp;— 예산 배정 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_reports.js       &nbsp;— 통계·리포트<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#D97706">bo_manual.js</span>        &nbsp;— 📌 이 파일 (서비스 매뉴얼)<br>
      &nbsp;&nbsp;&nbsp;├── plans.js            &nbsp;— 프론트 교육계획 수립 위저드 (세부산출근거 통합)<br>
      &nbsp;&nbsp;&nbsp;├── apply.js            &nbsp;— 프론트 교육 신청<br>
      &nbsp;&nbsp;&nbsp;├── gnb.js              &nbsp;— 프론트 GNB 네비게이션<br>
      &nbsp;&nbsp;&nbsp;└── utils.js            &nbsp;— 공통 유틸 (fmt, boFmt 등)
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">🔑 핵심 데이터 구조</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${[
        { name: 'BO_PERSONAS', file: 'bo_data.js', desc: '페르소나 정의. id, role, tenantId, ownedAccounts, allowedAccounts, isolationGroup, accessMenus 포함.' },
        { name: 'ACCOUNT_MASTER', file: 'bo_data.js', desc: '예산 계정 마스터. code, name, tenantId, type(ops/etc/rnd), 6단계 설정 데이터.' },
        { name: 'CALC_GROUNDS_MASTER', file: 'bo_data.js', desc: '산출근거 항목. id, accountTypes, name, desc, unitPrice, softLimit, hardLimit, limitType, usageScope[], visibleFor, active.' },
        { name: 'CALC_ACCOUNT_GROUNDS', file: 'bo_data.js', desc: '계정코드 → {accountType, enabledItemIds[]} 매핑. 빈 배열=전체 허용, 항목ID 지정=제한.' },
        { name: 'APPROVAL_ROUTING', file: 'bo_data.js', desc: '결재라인 설정. tenantId, accountCodes[], ranges[]{max, label, approvers[]}.' },
        { name: 'planState', file: 'plans.js', desc: '프론트 교육계획 위저드 상태. step, type, account, amount, calcGrounds[], hardLimitViolated.' },
      ].map(d => `
      <div style="background:#F9FAFB;border-radius:10px;padding:14px;border:1px solid #E5E7EB">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <code style="background:#E0E7FF;color:#3730A3;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800">${d.name}</code>
          <span style="font-size:10px;color:#9CA3AF">${d.file}</span>
        </div>
        <div style="font-size:11px;color:#374151;line-height:1.6">${d.desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">🚀 실제 구현 시 필요한 연동 목록</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[
        { item: 'SAP ERP 연동',      desc: '예산 잔액 실시간 동기화, 정산 결과 송신 (RFC/API Gateway)' },
        { item: '결재 워크플로우',     desc: 'Camunda 또는 사내 전자결재 시스템 연동 (BPMN 프로세스 정의)' },
        { item: 'SSO / IAM',         desc: '현대차그룹 통합 계정 연동 (OAuth2/SAML). 역할 매핑 자동화' },
        { item: '알림 서비스',        desc: '이메일·SMS·슬랙 알림 (미결 건, 결재 완료, 잔액 경보)' },
        { item: '파일 스토리지',      desc: '정산 증빙 파일 업로드 (S3/Object Storage + CDN)' },
        { item: 'Excel 추출',         desc: '리포트 다운로드 (서버사이드 ExcelJS / Apache POI)' },
        { item: '모바일 대응',        desc: '결재자 모바일 결재 지원 (PWA 또는 네이티브 앱)' },
      ].map(d => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;border:1px solid #F3F4F6">
        <span style="color:#6366F1;font-weight:800;font-size:12px;white-space:nowrap;min-width:110px">${d.item}</span>
        <span style="font-size:11px;color:#6B7280">${d.desc}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}
