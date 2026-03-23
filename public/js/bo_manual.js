// ─── 백오피스: 서비스 매뉴얼 (v2.0) ────────────────────────────────────────────
// 대상: 차세대학습플랫폼 서비스 기획자 및 개발자
// 내용: 멀티테넌트 교육예산 관리 시스템의 전체 구조·역할·메뉴·데이터 흐름 안내

function renderBoManual() {
  const el = document.getElementById('bo-content');
  el.innerHTML = `
<div class="bo-fade" style="max-width:960px">
  <div style="background:linear-gradient(135deg,#312E81,#6366F1);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.1em">BACK-OFFICE MANUAL v2.0</span>
    </div>
    <h1 style="font-size:22px;font-weight:900;margin:0 0 8px">백오피스 서비스 매뉴얼</h1>
    <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
      차세대학습플랫폼(NLP) 서비스 기획자·개발자를 위한 멀티테넌트 교육예산 관리 시스템 안내서<br>
      예산 정책 설계부터 결재 자동 라우팅까지 전체 흐름을 다룹니다. | 2026-03-23
    </p>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0;overflow-x:auto">
    ${[
      { id:'overview',    label:'① 시스템 개요' },
      { id:'personas',    label:'② 페르소나·역할' },
      { id:'menus',       label:'③ 메뉴 상세' },
      { id:'patterns',    label:'④ 프로세스 패턴' },
      { id:'data-flow',   label:'⑤ 데이터 흐름' },
      { id:'tech',        label:'⑥ 기술 구조' },
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
  const map = { overview:_manOverview, personas:_manPersonas, menus:_manMenus, patterns:_manPatterns, 'data-flow':_manDataFlow, tech:_manTech };
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
        { id:'HMC', name:'현대자동차', accs:'OPS·PART·ETC·RND', color:'#1D4ED8' },
        { id:'KIA', name:'기아',       accs:'OPS·PART',          color:'#059669' },
        { id:'HAE', name:'현대오토에버', accs:'OPS·PART·CERT',  color:'#7C3AED' },
        { id:'ROTEM+8', name:'현대로템 외 7개사', accs:'OPS·PART', color:'#6B7280' },
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
        { role:'platform_admin',    label:'플랫폼 총괄',   color:'#374151' },
        { role:'tenant_global_admin', label:'테넌트 총괄', color:'#1D4ED8' },
        { role:'budget_global_admin', label:'예산 총괄',   color:'#7C3AED' },
        { role:'budget_op_manager', label:'예산 운영 담당', color:'#D97706' },
        { role:'team_general / learner', label:'LXP 학습자', color:'#059669' },
      ].map(r => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="background:${r.color}18;border:1px solid ${r.color}40;color:${r.color};font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${r.role}</span>
        <span style="font-size:11px;font-weight:700;color:#374151">${r.label}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="bo-card" style="padding:18px">
    <div style="font-size:13px;font-weight:800;color:#111827;margin-bottom:12px">🔄 전체 업무 흐름 (6단계)</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      ${[
        { n:'1', t:'마스터 설정', s:'계정·산출근거·결재라인·가상조직', c:'#6366F1' },
        { n:'2', t:'서비스 정책', s:'패턴A/B/C/D + 금액별 결재라인', c:'#7C3AED' },
        { n:'3', t:'예산 배정', s:'총괄→본부→팀 분배', c:'#2563EB' },
        { n:'4', t:'교육계획(FO)', s:'계획수립·상신·승인', c:'#059669' },
        { n:'5', t:'교육신청(FO)', s:'신청·가점유·결재', c:'#D97706' },
        { n:'6', t:'결과정산', s:'실지출·증빙·차감 확정', c:'#DC2626' },
      ].map((s,i,a) => `
      <div style="text-align:center;padding:10px 14px;background:#fff;border-radius:10px;border:1.5px solid ${s.c}30">
        <div style="width:24px;height:24px;border-radius:50%;background:${s.c};color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 5px">${s.n}</div>
        <div style="font-size:11px;font-weight:800;color:${s.c}">${s.t}</div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${s.s}</div>
      </div>
      ${i<a.length-1?'<span style="color:#D1D5DB;font-size:18px">→</span>':''}`).join('')}
    </div>
  </div>
</div>`;
}

/* ② 페르소나·역할 */
function _manPersonas() {
  const ps = [
    {
      name:'장O준 (플랫폼 총괄)', role:'platform_admin', badge:'#374151',
      desc:'시스템 전체 모니터링. 테넌트 간 데이터는 열람하지 않음. 관리자 역할 매핑과 전사 현황 확인 전담.',
      steps:[
        { i:'🔐', t:'관리자 권한 매핑', d:'테넌트별 총괄 담당자에게 역할 부여. 역할 변경 시 메뉴 자동 연동.' },
        { i:'🖥️', t:'전사 모니터링', d:'테넌트별 예산 집행률·잔액·계획·신청 건수 실시간 확인.' },
      ],
      menus:['대시보드','플랫폼 모니터링','관리자 권한 매핑','리포트'],
    },
    {
      name:'신O남 (HMC 일반예산 총괄)', role:'budget_global_admin', badge:'#1D4ED8',
      desc:'HMC 일반예산(HMC-OPS·PART·ETC) 소유. 마스터 설정·서비스 정책·배정·계획 검토가 주요 업무.',
      steps:[
        { i:'💳', t:'예산 계정 설정 (6단계 위저드)', d:'기본정보→가상조직→학습유형→산출근거→역할권한→기간상태' },
        { i:'🔧', t:'서비스 정책 설정 (6단계)', d:'서비스명→예산연동→결재라인→대상조직→양식유형→결재권한. 패턴A/B/C/D 선택.' },
        { i:'🏢', t:'가상조직 관리', d:'본부/팀 구조를 VOrg 템플릿으로 정의. 관리자·협력팀·직무유형 설정.' },
        { i:'📐', t:'세부산출근거 관리', d:'운영(21종)/기타(7종) 항목별 기준단가·Soft/Hard Limit·사용단계 설정.' },
        { i:'📊', t:'결재라인 설정', d:'계정별 금액 구간→결재자 자동 라우팅. 예: 100만↓팀장전결 / 초과→본부장승인.' },
        { i:'📥', t:'나의 운영 업무', d:'[계획 승인 대기] / [신청 승인 대기] / [결과 정산 대기] 3탭 단계별 승인함.' },
      ],
      menus:['대시보드','내 격리그룹관리','예산계정관리','가상조직','교육신청양식마법사','세부산출근거','결재라인','서비스정책','교육계획관리','예산배정','나의운영업무','리포트'],
    },
    {
      name:'류O령 (HMC R&D예산 총괄)', role:'budget_global_admin', badge:'#DC2626',
      desc:'HMC-RND 계정 전속 소유. 일반예산과 완전 격리. R&D 교육 전용 산출근거·결재라인 별도 운영.',
      steps:[
        { i:'💳', t:'R&D 계정 설정', d:'HMC-RND 전용 6단계 설정. 패턴A(계획→신청→결과) 고통제 방식.' },
        { i:'🔧', t:'서비스 정책 패턴A', d:'R&D교육예산 서비스: 계획 필수 → 계획 기반 신청 → 결과 정산 고정 흐름.' },
      ],
      menus:['대시보드','내 격리그룹관리','예산계정관리(R&D)','가상조직','세부산출근거(운영탭)','결재라인','서비스정책','교육계획관리','나의운영업무','리포트'],
    },
    {
      name:'최O영 (HMC 테넌트 총괄)', role:'tenant_global_admin', badge:'#6B7280',
      desc:'테넌트 전체 격리그룹 생성·관리 권한 보유. 예산 실무 설정은 불가하며 구조 설계 역할.',
      steps:[
        { i:'🏗️', t:'격리그룹 관리', d:'테넌트 내 일반예산/R&D예산 격리그룹 생성 및 총괄담당자 지정.' },
      ],
      menus:['대시보드','격리그룹관리','리포트','매뉴얼'],
    },
    {
      name:'고O현 (KIA 예산 총괄)', role:'budget_global_admin', badge:'#059669',
      desc:'KIA-OPS·KIA-PART 관리. KIA는 기타계정 없음. 테넌트 격리그룹도 담당(중소테넌트 겸임 구조).',
      steps:[
        { i:'💳', t:'KIA 계정 설정', d:'운영(OPS)·참가(PART) 2개 계정. HMC 데이터와 isolationGroup으로 완전 격리.' },
        { i:'🔧', t:'서비스 정책', d:'패턴B(신청→결과) 주요 사용. 참가비는 패턴C(후정산) 적용.' },
      ],
      menus:['대시보드','내 격리그룹관리','예산계정관리','가상조직','세부산출근거','결재라인','서비스정책','교육계획관리','예산배정','나의운영업무','리포트'],
    },
    {
      name:'이O현·장O범·김O늘 (본부/운영담당)', role:'budget_op_manager', badge:'#D97706',
      desc:'총괄로부터 위임받은 본부 범위 예산 운영. 마스터 설정 권한 없음. 나의 운영 업무 중심으로 업무 처리.',
      steps:[
        { i:'📥', t:'나의 운영 업무', d:'계획 승인 대기·신청 승인 대기·결과 정산 대기 3탭. 내 담당 정책 건만 자동 표시.' },
        { i:'💰', t:'조직예산 현황', d:'본부 배정 잔액·집행률 확인.' },
      ],
      menus:['대시보드','나의운영업무','조직예산현황','리포트'],
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
        ${p.steps.map((s,i) => `
        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px">
          <span style="font-size:16px;flex-shrink:0">${s.i}</span>
          <div>
            <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:2px">
              <span style="color:#9CA3AF;font-weight:500;margin-right:5px">Step ${i+1}</span>${s.t}
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
      icon:'🔧', id:'service-policy', name:'서비스 정책 설정 ★',
      roles:'budget_global_admin',
      desc:`<strong>핵심 메뉴</strong>: 학습자 시나리오 기반으로 예산·조직·양식·프로세스를 하나의 정책으로 통합 설계합니다.<br>
            <strong>6단계 위저드</strong>: Step1 기본정보(서비스명+패턴A/B/C/D) → Step2 예산연동 → Step3 금액별 결재라인 → Step4 대상조직 → Step5 양식·유형 → Step6 결재권한<br>
            <strong>금액별 결재라인</strong>: 구간별 결재자를 동적으로 설정(예: 100만↓팀장, 100만↑본부장). 최종 결재자 지정 시 라우팅 미리보기 제공.`,
      impl:'패턴D(무예산 이력) 선택 시 Step2 자동 스킵. approvalThresholds[] 배열로 구간 관리.',
    },
    {
      icon:'💳', id:'budget-account', name:'예산 계정 관리',
      roles:'budget_global_admin',
      desc:`6단계 위저드로 예산 계정을 설정합니다.<br>
            Step1 기본정보 → Step2 가상조직 → Step3 학습유형 → Step4 산출근거 → Step5 역할·권한 → Step6 기간·상태<br>
            테넌트별 isolationGroup으로 타사 데이터 완전 차단.`,
      impl:'계정 생성 시 UUID 발급. isolationGroup은 DB 쿼리 필터로 구현.',
    },
    {
      icon:'🏢', id:'virtual-org', name:'가상조직 템플릿 관리',
      roles:'budget_global_admin',
      desc:`실제 조직도와 독립된 <strong>예산 집행용 가상 조직</strong>을 템플릿으로 정의합니다.<br>
            VOrg 관리자·협력팀·직무유형 제한(생산직/사무직) 설정 가능. 격리그룹별로 독립 관리.`,
      impl:'관리자 지정 시 persona FK 참조. 직무 유형은 HR 시스템 동기화 필요.',
    },
    {
      icon:'🧙', id:'form-builder', name:'교육신청양식마법사',
      roles:'budget_global_admin',
      desc:`3탭 구조: 📚 양식 라이브러리 | 🔧 양식 빌더(FO/BO/시스템 필드 구분) | 🔗 서비스 통합 매핑<br>
            패턴별 양식 구성: A=계획+신청+결과(3종) / B=신청+결과(2종) / C·D=신청(1종)<br>
            FO(학습자 입력)와 BO(승인자 보완) 필드 구분 설정 가능.`,
      impl:'Form Schema를 JSON으로 저장. 조건부 노출은 rule 엔진 필요.',
    },
    {
      icon:'📐', id:'calc-grounds', name:'세부산출근거 관리',
      roles:'budget_global_admin',
      desc:`교육 예산 지출 항목 표준 풀(Pool)을 계정별로 관리합니다.<br>
            설정: 기준단가 / Soft Limit(경고+사유입력) / Hard Limit(저장차단) / 사용단계(계획·신청·결과) / 교육유형(국내·해외).`,
      impl:'usageScope[], visibleFor 필드로 저장. 프론트에서 컨텍스트 전달 시 필터링.',
    },
    {
      icon:'📊', id:'approval-routing', name:'계정별 결재라인 설정',
      roles:'budget_global_admin',
      desc:`계정 단위 금액 구간별 결재선을 설정합니다.<br>
            신청 총액(세부산출근거 합계) 기준으로 결재선 자동 생성.<br>
            ※ 서비스 정책의 금액별 결재라인과 함께 동작합니다.`,
      impl:'getApprovalRoute() 함수로 평가. 실제는 결재 워크플로우 엔진(Camunda 등) 연동.',
    },
    {
      icon:'📥', id:'my-operations', name:'나의 운영 업무',
      roles:'전체 (자신이 승인자인 정책 건만 자동 표시)',
      desc:`<strong>3탭 단계별 승인함</strong>: [📊 계획 승인 대기] / [📝 신청 승인 대기] / [📄 결과 정산 대기]<br>
            정책 기반 결재 자동 라우팅: 학습자 신청 → 정책 판별 → 금액 구간 확인 → 담당 결재자에게 자동 배달.<br>
            금액별 결재라인의 담당 구간도 표시됩니다(예: 🔑 100만원 구간 담당).`,
      impl:'SERVICE_POLICIES.approverPersonaKey + approvalThresholds로 결재자 판별.',
    },
    {
      icon:'📋', id:'plan-mgmt', name:'교육계획 관리',
      roles:'전체 (본인 관할)',
      desc:`FO에서 상신된 교육계획서 검토·승인·반려.<br>
            ⚠ 계획 승인은 예산 배분이 아닙니다. 신청 시 가용예산 범위 내에서 실제 집행이 확정됩니다.`,
      impl:'상태 머신: draft→reviewing→approved/rejected.',
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
      id:'A', name:'패턴 A: Full-Cycle (고통제형)', color:'#7C3AED',
      flow:'교육계획 → 교육신청 → 교육결과',
      budget:'예산 가점유(Holding) → 결과 시 실차감',
      usecase:'HMC R&D 교육예산, 대규모 집합교육 운영',
      foFlow:`1. R&D교육예산 선택 → 2. 승인된 교육계획 선택(교육유형 자동 세팅) → 3. 세부정보 입력 → 4. 결과보고`,
      note:'FO에서 R&D예산 선택 시 교육유형 선택 단계 Skip(계획에서 이미 설정).',
    },
    {
      id:'B', name:'패턴 B: Standard (자율신청형)', color:'#1D4ED8',
      flow:'교육신청 → 교육결과',
      budget:'신청 승인 시 예산 가점유 → 결과 시 실차감',
      usecase:'일반교육예산 참가계정, 사외 집합교육 참가비',
      foFlow:`1. 일반교육예산 선택 → 2. 교육유형 선택 → 3. 세부정보 입력 → 4. 결과보고`,
      note:'가장 일반적인 흐름. 선지출-후정산(Reimbursement) 모드도 선택 가능.',
    },
    {
      id:'C', name:'패턴 C: Reimbursement (정산특화형)', color:'#D97706',
      flow:'교육신청 단독',
      budget:'신청 승인 즉시 실차감(가점유·결과 단계 생략)',
      usecase:'개인 카드 결제 후 영수증 청구, 자격증 응시료',
      foFlow:`1. 예산 선택 → 2. 교육유형 선택 → 3. 비용·증빙 입력 → 4. 제출 즉시 정산`,
      note:'신청서에 비용 정산 및 증빙 필드 포함. 결과 단계 없음.',
    },
    {
      id:'D', name:'패턴 D: History-Only (이력관리형)', color:'#6B7280',
      flow:'교육신청 단독',
      budget:'예산 차감 없음. 승인 시 즉시 이력 DB 적재.',
      usecase:'무료 웨비나, 자체 세미나, 개인 독서 이력 등록',
      foFlow:`1. 예산 미사용 선택 → 2. 교육유형 선택 → 3. 학습내용 입력 → 4. 제출 즉시 이력 적재`,
      note:'예산 계정 연결 불필요. FO에서 "예산 미사용" 선택 시 해당 패턴 서비스로 연결.',
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
        { g:'HMC-GENERAL', who:'신O남·이O현(HMC 일반)', color:'#1D4ED8' },
        { g:'HMC-RND',     who:'류O령·이O하(HMC R&D)', color:'#DC2626' },
        { g:'KIA-GENERAL', who:'고O현·장O범(KIA)',      color:'#059669' },
        { g:'HAE-ALL',     who:'안O기·김O늘(HAE)',      color:'#7C3AED' },
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
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">data.js</span>               — FO 페르소나·예산·계획·신청 Mock<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#1D4ED8">bo_data.js</span>            — BO 전체 Mock (BO_PERSONAS, ACCOUNT_MASTER, CALC_GROUNDS_MASTER 등)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_layout.js</span>          — 사이드바·헤더·페르소나전환·boNavigate()<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#7C3AED">bo_policy_builder.js</span>  — ★ 서비스 정책 설정 (6단계·패턴A/B/C/D·금액결재라인)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#7C3AED">bo_approval.js</span>        — ★ 나의 운영 업무 (3탭 단계별 승인함)<br>
      &nbsp;&nbsp;&nbsp;├── bo_budget_master.js    — 예산 계정 관리 (6단계)<br>
      &nbsp;&nbsp;&nbsp;├── bo_virtual_org.js      — 가상조직 템플릿<br>
      &nbsp;&nbsp;&nbsp;├── bo_form_builder.js     — 교육신청양식마법사 (3탭)<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_calc_grounds.js</span>    — 세부산출근거 관리<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#059669">bo_approval_routing.js</span> — 계정별 결재라인 설정<br>
      &nbsp;&nbsp;&nbsp;├── bo_plan_mgmt.js        — 교육계획 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_allocation.js       — 예산 배정 관리<br>
      &nbsp;&nbsp;&nbsp;├── bo_reports.js          — 통계·리포트<br>
      &nbsp;&nbsp;&nbsp;├── <span style="color:#D97706">bo_manual.js</span>          — 📌 이 파일<br>
      &nbsp;&nbsp;&nbsp;├── gnb.js                 — FO GNB (성장 드롭다운 메뉴)<br>
      &nbsp;&nbsp;&nbsp;├── plans.js               — FO 교육계획 수립 위저드<br>
      &nbsp;&nbsp;&nbsp;├── apply.js               — FO 교육신청 (예산선택3경로·R&D플랜피커)<br>
      &nbsp;&nbsp;&nbsp;└── utils.js               — 공통 유틸 (fmt, boFmt 등)
    </div>
  </div>

  <div class="bo-card" style="padding:20px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 14px">🔑 핵심 데이터 구조</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[
        { name:'BO_PERSONAS',          file:'bo_data.js', desc:'페르소나: id, role, tenantId, ownedAccounts, isolationGroup, accessMenus' },
        { name:'SERVICE_POLICIES',     file:'bo_data.js', desc:'서비스 정책: processPattern(A/B/C/D), budgetLinked, approvalThresholds[], approverPersonaKey' },
        { name:'ACCOUNT_MASTER',       file:'bo_data.js', desc:'예산 계정: code, name, tenantId, type(ops/etc/rnd), 6단계 설정' },
        { name:'CALC_GROUNDS_MASTER',  file:'bo_data.js', desc:'산출근거: usageScope[], visibleFor, softLimit, hardLimit, unitPrice' },
        { name:'APPROVAL_ROUTING',     file:'bo_data.js', desc:'계정별 결재라인: tenantId, accountCodes[], ranges[]{max,approvers[]}' },
        { name:'VIRTUAL_ORG_TEMPLATES',file:'bo_data.js', desc:'가상조직: tree(hqs/centers/teams), manager, cooperators, jobTypes' },
        { name:'applyState',           file:'apply.js',   desc:'FO신청 상태: step, budgetChoice(general/rnd/none), planId, serviceId' },
        { name:'planState',            file:'plans.js',   desc:'FO계획 상태: step, type, account, calcGrounds[], hardLimitViolated' },
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
        { item:'SAP ERP',       desc:'예산 잔액 실시간 동기화, 정산 결과 송신 (RFC/API Gateway)' },
        { item:'결재 워크플로우', desc:'Camunda 또는 사내 전자결재 연동 (BPMN 프로세스 정의)' },
        { item:'SSO / IAM',     desc:'현대차그룹 통합 계정 (OAuth2/SAML). 역할 자동 매핑' },
        { item:'알림 서비스',    desc:'이메일·SMS·슬랙 알림 (미결건, 결재완료, 잔액경보)' },
        { item:'파일 스토리지',  desc:'정산 증빙 업로드 (S3/Object Storage + CDN)' },
        { item:'Excel 추출',    desc:'리포트 다운로드 (서버사이드 ExcelJS / Apache POI)' },
      ].map(d => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:8px;border:1px solid #F3F4F6">
        <span style="color:#6366F1;font-weight:800;font-size:12px;white-space:nowrap;min-width:100px">${d.item}</span>
        <span style="font-size:11px;color:#6B7280">${d.desc}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}
