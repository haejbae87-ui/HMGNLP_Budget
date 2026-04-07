// ─── 프론트오피스: 서비스 매뉴얼 (v6.0) ─────────────────────────────────────
// 대상: 차세대학습플랫폼 서비스 기획자 및 학습자
// 최종 업데이트: 2026-04-07 (FO 4단계 위저드 유지보수 검증, BO 정책 마법사 5단계 축소 동기화 검증 완료)

function renderFoManual() {
  const el = document.getElementById('page-fo-manual');
  if (!el) return;
  el.innerHTML = `
<div style="max-width:940px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.1em">FRONT-OFFICE MANUAL v6.0</span>
    </div>
    <h1 style="font-size:20px;font-weight:900;margin:0 0 8px">프론트오피스 서비스 매뉴얼</h1>
    <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
      LXP 학습자·팀담당자를 위한 교육예산 활용 안내서<br>
      차세대학습플랫폼 기획자·개발자가 학습자 화면 흐름을 파악하는 데도 활용하세요. | 2026-04-07 v6.0
    </p>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0;overflow-x:auto">
    ${[
      { id: 'fo-overview', label: '① 프론트 개요' },
      { id: 'fo-scenarios', label: '② 신청 시나리오' },
      { id: 'fo-menus', label: '③ 메뉴 상세' },
      { id: 'fo-calc', label: '④ 세부산출근거' },
      { id: 'fo-ia', label: '⑤ IA·화면구조' },
      { id: 'fo-process', label: '⑥ 프로세스 흐름도' },
    ].map(t => `
    <button onclick="_foManSetTab('${t.id}')" id="fomtab-${t.id}"
      style="padding:10px 16px;font-size:12px;font-weight:700;border:none;border-bottom:3px solid transparent;
             background:none;cursor:pointer;color:#6B7280;transition:all .15s;white-space:nowrap">
      ${t.label}
    </button>`).join('')}
  </div>
  <div id="fo-manual-content"></div>
</div>`;
  setTimeout(() => _foManSetTab('fo-overview'), 0);
}

let _foManActiveTab = 'fo-overview';
function _foManSetTab(id) {
  _foManActiveTab = id;
  document.querySelectorAll('[id^="fomtab-"]').forEach(b => {
    const a = b.id === `fomtab-${id}`;
    b.style.color = a ? '#002C5F' : '#6B7280';
    b.style.borderColor = a ? '#002C5F' : 'transparent';
    b.style.fontWeight = a ? '800' : '700';
  });
  const c = document.getElementById('fo-manual-content');
  if (!c) return;
  const map = {
    'fo-overview': _foManOverview, 'fo-scenarios': _foManScenarios,
    'fo-menus': _foManMenus, 'fo-calc': _foManCalc,
    'fo-ia': _foManIA, 'fo-process': _foManProcess
  };
  if (map[id]) c.innerHTML = map[id]();
}

/* ① 프론트 개요 */
function _foManOverview() {
  return `<div style="display:flex;flex-direction:column;gap:18px">

  <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:800;color:#1D4ED8;margin:0 0 8px">프론트오피스(LXP) 역할</h2>
    <p style="font-size:13px;color:#374151;line-height:1.8;margin:0">
      백오피스에서 설정한 <strong>서비스 정책(패턴A~E)</strong>에 따라 학습자 화면이 동적으로 구성됩니다.<br>
      학습자 소속팀의 <strong>가상교육조직(VOrg)</strong>에 연결된 정책만 노출되어 정책 외 항목(기타운영 등)은 자동 차단됩니다.<br>
      Step 1에서 <strong>행위 기반 카테고리(📚직접학습 / 🎯교육운영 / 📝결과등록)</strong>로 목적을 선택하고, Step 2에서 <strong>VOrg 레이블 + 프로세스 패턴 안내</strong>를 확인하며 자연스럽게 진행합니다.<br>
      ⚠ <strong>Mock→DB 전환 완료</strong>: PURPOSES 배열은 DB <code>edu_purpose_groups</code> 테이블에서 동적 로드. 기타운영(misc_ops)은 Mock 폴백에서 제거됨. DB에 등록 시에만 노출됩니다.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">🏢 VOrg 기반 정책 연동</div>
      ${[
      { role: '일반교육예산', desc: '일반교육 VOrg에 속한 팀 — 참가·운영 계정 사용', color: '#1D4ED8' },
      { role: 'R&D교육예산', desc: 'R&D VOrg에 속한 팀 — 통합 계정, 계획 필수(패턴A)', color: '#7C3AED' },
      { role: '복합 VOrg', desc: 'HMC 내구기술팀처럼 일반+R&D 양쪽 VOrg 소속 가능', color: '#002C5F' },
      { role: 'KIA 학습자', desc: '기아 일반교육 VOrg 기반 참가 신청', color: '#059669' },
      { role: 'HAE 학습자', desc: '현대오토에버 VOrg — 전사·팀프로젝트 계정', color: '#BE123C' },
    ].map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#F9FAFB;margin-bottom:6px">
        <span style="background:${p.color};color:#fff;font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${p.role}</span>
        <span style="font-size:11px;color:#6B7280">${p.desc}</span>
      </div>`).join('')}
    </div>
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">📱 GNB 메뉴 구조</div>
      <div style="padding:10px;background:#002C5F;border-radius:8px;color:#fff;font-size:12px;font-weight:700;margin-bottom:8px">
        Next Learning &nbsp;|&nbsp; 🌟 성장 ▾ &nbsp;|&nbsp; 📋 결재 ▾ &nbsp;|&nbsp; 📖 매뉴얼
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:4px">▼ 성장 드롭다운:</div>
      ${[
      { m: '📊 교육계획', s: '교육계획 수립·검토·이력', active: true },
      { m: '📝 교육신청', s: '신청서 제출·상태 추적', active: true },
      { m: '📚 교육이력등록', s: '준비 중', active: false },
    ].map(m => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:${m.active ? '#EFF6FF' : '#F9FAFB'};margin-bottom:4px;opacity:${m.active ? 1 : 0.6}">
        <span style="font-size:12px">${m.m}</span>
        <span style="font-size:10px;color:#9CA3AF;flex:1">${m.s}</span>
        ${!m.active ? '<span style="font-size:9px;background:#F3F4F6;color:#9CA3AF;padding:1px 5px;border-radius:3px;font-weight:700">준비중</span>' : ''}
      </div>`).join('')}
      <div style="font-size:11px;color:#6B7280;margin-top:8px;margin-bottom:4px">▼ 결재 드롭다운:</div>
      ${[
      { m: '✅ 팀원용 결재함', s: '내가 상신한 결재 내역', active: true },
      { m: '👔 리더용 결재함', s: '팀장·실장·센터장 전용', active: true },
    ].map(m => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#EFF6FF;margin-bottom:4px">
        <span style="font-size:12px">${m.m}</span>
        <span style="font-size:10px;color:#9CA3AF;flex:1">${m.s}</span>
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#F0FDF4;border-radius:12px;padding:16px;border:1px solid #A7F3D0">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">🔄 Step 1 행위 기반 카테고리 → 프로세스 패턴 안내</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${[
      { t: '📚 직접 학습', flow: '개인직무 사외학습 등 본인 참여형. VOrg에 따라 일반/R&D 예산카드 + 프로세스 안내 표시', color: '#1D4ED8', pat: '패턴A·B' },
      { t: '🎯 교육 운영', flow: '이러닝/집합·워크샵/세미나 등 운영계정 기반. Step 2에서 VOrg 레이블 확인', color: '#7C3AED', pat: '패턴A·B' },
      { t: '📝 결과만 등록', flow: '이미 수료한 교육 이력 등록. 예산 차감 없이 학습이력만 기록', color: '#6B7280', pat: '패턴C·D' },
    ].map(s => `
      <div style="background:#fff;border:1.5px solid ${s.color}30;border-radius:10px;padding:12px">
        <div style="font-size:12px;font-weight:800;color:${s.color};margin-bottom:4px">${s.t}</div>
        <div style="font-size:10px;color:#6B7280;line-height:1.5">${s.flow}</div>
        <div style="margin-top:6px"><span style="background:${s.color}18;color:${s.color};font-size:9px;font-weight:900;padding:1px 6px;border-radius:3px">${s.pat}</span></div>
      </div>`).join('')}
    </div>
  </div>
</div>`;
}

/* ② 신청 시나리오 */
function _foManScenarios() {
  const scenarios = [
    {
      title: '시나리오 1: 일반교육예산 참가계정 사용',
      persona: '이O봉 책임 (HMC 학습자)', badge: '#1D4ED8',
      pattern: '패턴 B: 신청 → 결과',
      steps: [
        { n: '1', t: '📚 직접학습 카테고리 선택', d: '행위 기반 카테고리에서 "📚 직접 학습" → "개인 직무 사외학습" 선택' },
        { n: '2', t: '예산 선택 + VOrg 레이블·프로세스 안내 확인', d: 'VOrg 레이블(일반교육예산 등) 부착된 예산카드에서 참가계정 선택. 하단에 프로세스 패턴 안내 표시.' },
        { n: '3', t: '교육유형 선택', d: '정책 기반 허용 교육유형(이러닝·집합·세미나 등)에서 직접 선택' },
        { n: '4', t: '세부정보 입력 및 상신', d: '교육명·일정·금액·세부산출근거 입력 후 제출. 서비스 정책 기반 결재선 자동 생성.' },
        { n: '5', t: '결과보고 작성', d: '수강 완료 후 수료증 첨부 및 실지출 입력. 승인 시 실 차감 확정.' },
      ],
    },
    {
      title: '시나리오 2: R&D 교육예산 사용',
      persona: '이O봉 책임 (HMC 학습자)', badge: '#7C3AED',
      pattern: '패턴 A: 계획 → 신청 → 결과',
      steps: [
        { n: '1', t: '📚 직접학습 카테고리 선택', d: '행위 기반 카테고리에서 "📚 직접 학습" → "개인 직무 사외학습" 선택' },
        { n: '2', t: '예산 선택: R&D교육예산 계정', d: 'VOrg 레이블(R&D교육예산) 부착된 통합계정 또는 참가계정 선택. 프로세스 안내로 "계획→신청→결과" 흐름 표시.' },
        { n: '3', t: '교육계획 선택 (교육유형 자동 세팅)', d: '사전 승인된 R&D 교육계획 목록에서 선택. 교육유형 자동 세팅. Step 3 Skip.' },
        { n: '4', t: '세부정보 입력 및 상신', d: '계획 데이터 기반으로 정보가 일부 자동 채워짐. 추가 정보 입력 후 제출.' },
        { n: '5', t: '결과보고 작성', d: '수강 완료 후 결과 입력. 승인 시 R&D예산 실차감 확정.' },
      ],
    },
    {
      title: '시나리오 3: 회사 비용 미사용 (이력 등록)',
      persona: '이O봉 책임 (HMC 학습자)', badge: '#6B7280',
      pattern: '패턴 D: 신청 단독 (이력관리형)',
      steps: [
        { n: '1', t: '개인직무 사외학습 목적 선택', d: '신청 목적 선택 화면에서 "개인직무 사외학습" 선택' },
        { n: '2', t: '예산 선택: 예산 미사용', d: '3가지 예산 카드 중 "📝 예산 미사용(이력만 등록)" 선택' },
        { n: '3', t: '교육유형 선택', d: '자체 세미나·무료 강의·동영상 학습 등 유형 선택' },
        { n: '4', t: '학습내용 입력', d: '금액 입력 없이 학습명·내용·증빙 위주로 입력. 예산 잔액에 영향 없음.' },
        { n: '✅', t: '승인 즉시 이력 적재', d: '별도 결과보고 없이 승인 완료 시 학습이력 DB에 즉시 저장.' },
      ],
    },
    {
      title: '시나리오 4: 팀담당자의 집합교육 계획 수립',
      persona: '조O성 책임 (HMC 팀담당자)', badge: '#002C5F',
      pattern: '패턴 A: 계획 → 신청 → 결과',
      steps: [
        { n: '1', t: '교육계획 수립 (4단계 위저드)', d: 'Step1 목적선택 → Step2 예산선택 → Step3 교육유형 → Step4 세부정보 입력' },
        { n: '2', t: '계획 상신', d: '계획서 상신 시 결재라인 자동 구성. 승인 결과가 "증빙 근거"로 확정.' },
        { n: '3', t: '교육 신청', d: '승인된 계획을 선택하여 팀 가용예산 범위 내에서 신청서 제출' },
        { n: '4', t: '결과 정산', d: '교육 완료 후 실지출 입력·증빙 첨부. 신청액 vs 실지출 차액 자동 처리.' },
      ],
    },
  ];

  return `<div style="display:flex;flex-direction:column;gap:20px">
  <div style="padding:12px 16px;background:#F0FDF4;border-radius:8px;border:1px solid #A7F3D0;font-size:12px;color:#065F46;font-weight:600">
    💡 모든 시나리오는 프로토타입에서 페르소나를 전환하여 직접 체험할 수 있습니다.
  </div>
  ${scenarios.map(s => `
  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:14px;overflow:hidden">
    <div style="padding:14px 20px;background:${s.badge}10;border-bottom:1.5px solid ${s.badge}20;display:flex;align-items:flex-start;gap:12px">
      <div style="background:${s.badge};color:#fff;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;white-space:nowrap;flex-shrink:0">${s.pattern}</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:#111827">${s.title}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">페르소나: ${s.persona}</div>
      </div>
    </div>
    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:8px">
      ${s.steps.map(st => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        <div style="width:22px;height:22px;border-radius:50%;background:${s.badge};color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${st.n}</div>
        <div>
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:2px">${st.t}</div>
          <div style="font-size:11px;color:#6B7280;line-height:1.6">${st.d}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}
</div>`;
}

/* ③ 메뉴 상세 */
function _foManMenus() {
  const menus = [
    {
      icon: '🏠', name: '대시보드 (통합교육이력관리)',
      desc: `학습자의 <strong>예산 잔액·집행률·진행중 신청·교육이력</strong>을 한눈에 표시합니다.<br>
             계정별 잔액(일반참가·운영·R&D 등) 및 소진율 차트 포함.<br>
             우측 floating-budget 위젯에서 실시간 잔액 확인 가능.`,
      impl: 'DB org_budget_bankbooks 테이블에서 페르소나 orgId 기반 잔액 조회. DB 로드 실패 시 data.js mock budgets 폴백. MOCK_HISTORY는 tenantId 필터로 격리.',
    },
    {
      icon: '📊', name: '교육계획 (4단계 위저드)',
      desc: `교육 실행 전 예산 사전 계획 및 승인 프로세스입니다.<br>
             <strong>Step1.</strong> 목적 선택: 📚직접학습 / 🎯교육운영 행위 기반 카테고리로 정책 기반 자동 필터<br>
             <strong>Step2.</strong> 예산 선택: VOrg 레이블(일반교육예산/R&D교육예산) 부착 카드 + 프로세스 패턴 안내<br>
             <strong>Step3.</strong> 교육유형 선택: DB edu_type_items 기반<br>
             <strong>Step4.</strong> 세부산출근거: 항목 선택 → 수량·단가 → 소계 합산 → 결재선 미리보기<br>
             ⚠ 정책에 없는 목적(기타운영 등)은 자동 차단. 계획 승인 = 예산 배분이 아님.`,
      impl: 'planState 관리. getPersonaPurposes()가 SERVICE_POLICIES(DB)에서 정책 기반 목적 필터링. PURPOSES.find() 대신 정책기반 탐색 + PURPOSES 폴백.',
    },
    {
      icon: '📝', name: '교육신청',
      desc: `학습자가 교육 과정에 대한 <strong>예산 집행을 신청</strong>하는 화면입니다.<br>
             <strong>Step1.</strong> 📚직접학습 / 🎯교육운영 / 📝결과등록 행위 기반 카테고리 선택<br>
             <strong>Step2.</strong> VOrg 레이블 부착 예산카드 선택 + 프로세스 패턴 안내(계획→신청→결과 등)<br>
             R&D 계정 선택 시 승인된 교육계획 선택 → 교육유형 자동 세팅(Step 3 Skip).<br>
             제출 시 서비스 정책 → 금액 구간 → 결재자 자동 라우팅.`,
      impl: '_loadFoPolicies() 게이트로 DB SERVICE_POLICIES 로딩 보장. selectPurpose()에서 정책기반 목적 탐색 + PURPOSES 폴백. misc_ops는 Mock에서 제거됨.',
    },
    {
      icon: '✅', name: '팀원용 결재함',
      desc: `내가 상신한 교육계획·교육신청의 결재 현황을 확인합니다.<br>
             <strong>전체 학습자</strong>에게 노출. 결재 단계·승인자·코멘트 이력 표시.`,
      impl: 'approvals 테이블 기반. 상신자 본인 기준 필터링.',
    },
    {
      icon: '👔', name: '리더용 결재함',
      desc: `팀의 교육신청·계획을 결재하는 화면입니다.<br>
             <strong>팀장·실장·센터장·사업부장·본부장 역할</strong>을 가진 사용자만 노출.<br>
             미결·완료·반려 탭 분리. 코멘트 입력 후 승인/반려 처리.`,
      impl: 'persona.role에서 리더 역할 코드 확인. approvals 테이블 결재자 기준 필터링.',
    },
    {
      icon: '📚', name: '교육이력등록 (준비 중)',
      desc: `수료·이수 이력을 직접 등록합니다. 현재 GNB 메뉴 구성만 완료된 상태입니다.`,
      impl: '미기획. 추후 외부 교육 이력 연동(LMS 데이터, 자격증 API 등) 설계 필요.',
    },
  ];

  return `<div style="display:flex;flex-direction:column;gap:12px">
  ${menus.map(m => `
  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:18px 20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:20px">${m.icon}</span>
      <span style="font-size:14px;font-weight:800;color:#111827">${m.name}</span>
    </div>
    <div style="font-size:12px;color:#374151;line-height:1.8;margin-bottom:10px">${m.desc}</div>
    <div style="padding:8px 12px;background:#FFFBEB;border-radius:8px;border-left:3px solid #F59E0B">
      <span style="font-size:10px;font-weight:800;color:#92400E">⚙ 구현 참고: </span>
      <span style="font-size:11px;color:#92400E">${m.impl}</span>
    </div>
  </div>`).join('')}
</div>`;
}

/* ④ 세부산출근거 */
function _foManCalc() {
  return `<div style="display:flex;flex-direction:column;gap:18px">

  <div style="background:#F0FDF4;border-radius:12px;padding:18px;border:1px solid #A7F3D0">
    <h3 style="font-size:13px;font-weight:800;color:#065F46;margin:0 0 12px">세부산출근거란?</h3>
    <p style="font-size:12px;color:#374151;line-height:1.8;margin:0">
      교육 예산을 지출하는 각 비목(항목)을 <strong>표준화한 목록</strong>입니다.<br>
      백오피스에서 관리자가 설정한 항목만 학습자 화면에 노출됩니다.<br>
      교육계획 수립·교육신청·결과 정산 각 단계에서 <strong>사용 단계(usageScope</strong>)가 맞는 항목만 표시됩니다.
    </p>
  </div>

  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:18px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 12px">노출 필터링 로직</h3>
    <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
      ${[
      { cond: '계획 수립 화면', filter: 'usageScope.includes("plan") = true인 항목만 표시' },
      { cond: '교육 신청 화면', filter: 'usageScope.includes("apply") = true인 항목만 표시' },
      { cond: '결과 정산 화면', filter: 'usageScope.includes("settle") = true인 항목만 표시' },
      { cond: '국내 교육', filter: 'visibleFor === "both" || visibleFor === "domestic"' },
      { cond: '해외 교육', filter: 'visibleFor === "both" || visibleFor === "overseas"' },
    ].map(r => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 12px;background:#F9FAFB;border-radius:8px">
        <span style="font-size:11px;font-weight:800;color:#374151;white-space:nowrap;min-width:130px">${r.cond}</span>
        <code style="font-size:11px;color:#6B7280">${r.filter}</code>
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:18px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 12px">상한액(Ceiling) 동작 방식</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[
      { type: '제한없음', color: '#059669', bg: '#F0FDF4', desc: '금액 제한 없이 자유롭게 입력 가능합니다.' },
      { type: '⚠ Soft Limit', color: '#D97706', bg: '#FFFBEB', desc: 'softLimit 초과 시 경고 메시지 표시. 사유 입력 후 진행 가능. 관리자 설정에 따라 추가 승인 필요 가능.' },
      { type: '🚫 Hard Limit', color: '#DC2626', bg: '#FEF2F2', desc: 'hardLimit 초과 금액 입력 시 저장·제출이 시스템적으로 차단됩니다. 금액을 한도 이하로 조정해야 합니다.' },
    ].map(l => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:${l.bg};border-radius:10px;border:1px solid ${l.color}20">
        <span style="font-size:12px;font-weight:800;color:${l.color};white-space:nowrap;min-width:80px">${l.type}</span>
        <span style="font-size:12px;color:#374151;line-height:1.6">${l.desc}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}

/* ⑤ IA · 화면 구조 */
function _foManIA() {
  const screens = [
    { area: '공통', menu: '로그인/인증', screen: '로그인 화면', type: '화면', diff: '★☆☆', note: 'SSO 연동' },
    { area: '공통', menu: '내비게이션', screen: 'GNB/LNB (글로벌 메뉴)', type: '컴포넌트', diff: '★☆☆', note: '역할별 메뉴 표시' },
    { area: '대시보드', menu: '메인 대시보드', screen: '교육예산 현황 카드 목록', type: '화면', diff: '★☆☆', note: '신청·결과 대기 배지' },
    { area: '대시보드', menu: '신청 상세', screen: '신청 카드 상세 모달', type: '모달', diff: '★☆☆', note: '상태·결재라인 표시' },
    { area: '교육계획', menu: '교육계획 목록', screen: '내 계획·팀 계획 탭 목록', type: '화면', diff: '★★☆', note: 'team_view_enabled 탭 분기' },
    { area: '교육계획', menu: '계획 수립 위저드', screen: 'Step 1 행위기반 목적 선택', type: '화면', diff: '★★☆', note: '📚/🎯/📝 카테고리 그룹핑 + 정책필터' },
    { area: '교육계획', menu: '계획 수립 위저드', screen: 'Step 2 예산 선택 + VOrg·프로세스', type: '화면', diff: '★★★', note: 'VOrg 레이블 + 프로세스 패턴 안내' },
    { area: '교육계획', menu: '계획 수립 위저드', screen: 'Step 3 교육유형 선택', type: '화면', diff: '★★☆', note: 'DB edu_type_items 기반' },
    { area: '교육계획', menu: '계획 수립 위저드', screen: 'Step 4 세부정보 입력', type: '화면', diff: '★★★', note: '양식 필드 + 세부산출근거' },
    { area: '교육계획', menu: '계획 상세', screen: '계획 상세·수정 모달', type: '모달', diff: '★★☆', note: '상태별 편집 가능 분기' },
    { area: '교육신청', menu: '교육신청 목록', screen: '내 신청·팀 신청 탭 목록', type: '화면', diff: '★★☆', note: 'team_view_enabled 탭 분기' },
    { area: '교육신청', menu: '신청 위저드', screen: 'Step 1 행위기반 목적 선택', type: '화면', diff: '★★☆', note: '📚/🎯/📝 카테고리 (교육계획 동일)' },
    { area: '교육신청', menu: '신청 위저드', screen: 'Step 2 예산 + VOrg·프로세스 안내', type: '화면', diff: '★★★', note: 'VOrg 레이블 + 프로세스 패턴 안내' },
    { area: '교육신청', menu: '신청 위저드', screen: 'Step 3 교육유형 선택', type: '화면', diff: '★★☆', note: 'R&D 계획 연동 시 Skip' },
    { area: '교육신청', menu: '신청 위저드', screen: 'Step 4 세부정보 입력', type: '화면', diff: '★★★', note: '양식 필드 + 세부산출근거' },
    { area: '교육신청', menu: '신청 완료', screen: '신청 완료 & 결재라인 미리보기', type: '화면', diff: '★☆☆', note: '' },
    { area: '결과보고', menu: '결과 입력', screen: '교육 결과 입력 (패턴B/E)', type: '화면', diff: '★★☆', note: '실지출 입력 + 증빙 첨부' },
    { area: '결과보고', menu: '결과 완료', screen: '결과 완료 확인', type: '화면', diff: '★☆☆', note: '' },
    { area: '결재', menu: '팀원용 결재함', screen: '내가 상신한 결재 목록', type: '화면', diff: '★★☆', note: '전체 학습자 공통 노출' },
    { area: '결재', menu: '리더용 결재함', screen: '팀/조직 결재 대기·처리 목록', type: '화면', diff: '★★★', note: '리더 역할(팀장~본부장)만 노출' },
    { area: '매뉴얼', menu: '서비스 매뉴얼', screen: 'FO 서비스 매뉴얼', type: '화면', diff: '★☆☆', note: '' },
  ];

  const screenCount = screens.filter(s => s.type === '화면').length;
  const modalCount = screens.filter(s => s.type === '모달').length;
  const compCount = screens.filter(s => s.type === '컴포넌트').length;

  const tree = [
    { label: '프론트오피스 (LXP)', indent: 0, icon: '🏠', bold: true },
    { label: '로그인 / 인증', indent: 1, icon: '🔐', bold: false },
    { label: '메인 대시보드', indent: 1, icon: '📊', bold: true },
    { label: '예산 현황 카드 목록', indent: 2, icon: '└', bold: false },
    { label: '신청 카드 상세 (모달)', indent: 2, icon: '└', bold: false },
    { label: '성장 메뉴 ▾', indent: 1, icon: '🌟', bold: true },
    { label: '교육계획', indent: 2, icon: '└', bold: true },
    { label: '내 계획 / 팀 계획 탭 목록', indent: 3, icon: '△', bold: false },
    { label: '계획 수립 4단계 위저드', indent: 3, icon: '△', bold: false },
    { label: 'Step 1 목적 → Step 2 예산 → Step 3 유형 → Step 4 세부정보', indent: 4, icon: '·', bold: false },
    { label: '계획 상세 (모달)', indent: 3, icon: '△', bold: false },
    { label: '교육신청', indent: 2, icon: '└', bold: true },
    { label: '내 신청 / 팀 신청 탭 목록', indent: 3, icon: '△', bold: false },
    { label: '신청 4단계 위저드 + 완료 화면', indent: 3, icon: '△', bold: false },
    { label: '결과보고 (패턴B/E)', indent: 2, icon: '└', bold: false },
    { label: '결재 메뉴 ▾', indent: 1, icon: '📋', bold: true },
    { label: '팀원용 결재함 (전체 학습자)', indent: 2, icon: '└', bold: false },
    { label: '리더용 결재함 (리더 역할만)', indent: 2, icon: '└', bold: false },
    { label: '서비스 매뉴얼', indent: 1, icon: '📖', bold: false },
  ];

  return `<div style="display:flex;flex-direction:column;gap:22px">
  <div style="padding:14px 18px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:900;color:#1D4ED8;margin:0 0 4px">⑤ IA · 화면 구조</h2>
    <p style="font-size:12px;color:#374151;margin:0">학습자가 접근하는 프론트오피스(LXP) 전체 메뉴 계층과 화면 구성입니다.</p>
  </div>
  <div>
    <h3 style="font-size:13px;font-weight:900;color:#374151;margin:0 0 10px">📐 메뉴 구조도 (IA Tree)</h3>
    <div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px 20px">
      ${tree.map(n => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;padding-left:${n.indent * 20}px">
        <span style="font-size:12px">${n.icon}</span>
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
    <div style="margin-bottom:8px;font-size:11px;color:#6B7280">
      <span style="color:#DC2626;font-weight:700">★★★</span> 복잡 &nbsp; <span style="color:#D97706;font-weight:700">★★☆</span> 보통 &nbsp; <span style="color:#6B7280;font-weight:700">★☆☆</span> 쉬움
    </div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:#F3F4F6">
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">영역</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">메뉴</th>
        <th style="padding:8px 12px;text-align:left;border:1px solid #E5E7EB;font-weight:900">화면명</th>
        <th style="padding:8px 12px;text-align:center;border:1px solid #E5E7EB;font-weight:900">유형</th>
        <th style="padding:8px 12px;text-align:center;border:1px solid #E5E7EB;font-weight:900">난이도</th>
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
        <td style="padding:7px 12px;border:1px solid #E5E7EB;color:#6B7280;font-size:11px">${s.note}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>
</div>`;
}

/* ⑥ 프로세스 흐름도 */
function _foManProcess() {
  function flowBox(label, color = '#1D4ED8', bg = '#DBEAFE', w = '120px') {
    return `<div style="min-width:${w};padding:8px 12px;background:${bg};border:2px solid ${color};border-radius:10px;font-size:11px;font-weight:800;color:${color};text-align:center;white-space:nowrap">${label}</div>`;
  }
  function arrow(label = '') {
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:0 4px">
      <div style="font-size:9px;color:#9CA3AF;font-weight:600">${label}</div>
      <div style="font-size:18px;color:#9CA3AF;line-height:1">→</div>
    </div>`;
  }
  function arrowDown(label = '') {
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0">
      <div style="font-size:9px;color:#9CA3AF;font-weight:600">${label}</div>
      <div style="font-size:18px;color:#9CA3AF;line-height:1">↓</div>
    </div>`;
  }
  function sectionTitle(icon, title, color) {
    return `<div style="font-size:13px;font-weight:900;color:${color};margin:24px 0 10px;display:flex;align-items:center;gap:6px">${icon} ${title}</div>`;
  }
  function flowRow(...items) {
    return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;padding:10px 14px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB">${items.join('')}</div>`;
  }
  function diamond(label, color = '#D97706') {
    return `<div style="padding:6px 10px;background:#FFFBEB;border:2px dashed ${color};border-radius:8px;font-size:10px;font-weight:800;color:${color};text-align:center;white-space:nowrap">${label}</div>`;
  }

  return `<div style="display:flex;flex-direction:column;gap:8px">
  <div style="padding:14px 18px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:900;color:#1D4ED8;margin:0 0 4px">⑥ 전체 화면 프로세스 흐름도</h2>
    <p style="font-size:12px;color:#374151;margin:0">FO·BO 각 화면 간 데이터 흐름 및 분기 조건을 시각화합니다.</p>
  </div>

  ${sectionTitle('🔐', '로그인 / 인증', '#374151')}
  ${flowRow(
    flowBox('로그인 화면', '#374151', '#F3F4F6'),
    arrow('인증'),
    diamond('역할 확인'),
    arrow('BO'),
    flowBox('BO 대시보드', '#002C5F', '#EFF6FF'),
    arrow('FO'),
    flowBox('FO 대시보드', '#1D4ED8', '#DBEAFE')
  )}

  ${sectionTitle('📊', '교육계획 수립 (패턴A)', '#059669')}
  ${flowRow(
    flowBox('교육계획 목록', '#059669', '#F0FDF4'),
    arrow(),
    flowBox('Step 1\n목적 선택', '#059669', '#F0FDF4'),
    arrow('정책필터'),
    flowBox('Step 2\n예산 선택', '#059669', '#F0FDF4'),
    arrow('목적연동'),
    flowBox('Step 3\n교육유형', '#059669', '#F0FDF4'),
    arrow('DB유형'),
    flowBox('Step 4\n세부정보', '#059669', '#F0FDF4'),
    arrow('상신'),
    flowBox('리더용\n결재함', '#059669', '#F0FDF4')
  )}
  <div style="padding:8px 14px;background:#ECFDF5;border-radius:8px;font-size:11px;color:#065F46;margin-top:4px">
    ℹ 승인된 계획은 교육신청 Step 2에서 참조 가능 (R&D 패턴)
  </div>

  ${sectionTitle('📝', '교육신청 — 패턴별 분기', '#1D4ED8')}
  ${flowRow(
    flowBox('신청 목록', '#1D4ED8', '#DBEAFE'),
    arrow(),
    flowBox('Step 1\n목적 선택', '#1D4ED8', '#DBEAFE'),
    arrow(),
    flowBox('Step 2\n예산 선택', '#1D4ED8', '#DBEAFE'),
    arrow(),
    diamond('예산 유형?', '#1D4ED8')
  )}
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:4px 0">
    <div style="background:#EDE9FE;border-radius:10px;padding:10px 12px">
      <div style="font-size:10px;font-weight:900;color:#7C3AED;margin-bottom:6px">🔬 R&D 교육예산</div>
      ${flowRow(
    flowBox('계획 선택', '#7C3AED', '#EDE9FE', '90px'),
    arrowDown('유형자동'),
    flowBox('Step 4\n세부정보', '#7C3AED', '#EDE9FE', '90px')
  )}
      <div style="font-size:10px;color:#7C3AED;margin-top:6px;font-weight:700">⚡ Step 3 Skip</div>
    </div>
    <div style="background:#DBEAFE;border-radius:10px;padding:10px 12px">
      <div style="font-size:10px;font-weight:900;color:#1D4ED8;margin-bottom:6px">💳 일반교육예산</div>
      ${flowRow(
    flowBox('Step 3\n교육유형', '#1D4ED8', '#DBEAFE', '90px'),
    arrowDown(),
    flowBox('Step 4\n세부정보', '#1D4ED8', '#DBEAFE', '90px')
  )}
    </div>
    <div style="background:#F3F4F6;border-radius:10px;padding:10px 12px">
      <div style="font-size:10px;font-weight:900;color:#6B7280;margin-bottom:6px">📝 예산 미사용</div>
      ${flowRow(
    flowBox('Step 3\n교육유형', '#6B7280', '#F3F4F6', '90px'),
    arrowDown(),
    flowBox('이력등록\n(즉시)', '#6B7280', '#F3F4F6', '90px')
  )}
      <div style="font-size:10px;color:#6B7280;margin-top:6px;font-weight:700">⚡ 결과보고 없음</div>
    </div>
  </div>
  ${flowRow(
    flowBox('신청 완료\n& 결재 미리보기', '#1D4ED8', '#DBEAFE'),
    arrow('상신'),
    flowBox('팀원용 결재함', '#374151', '#F3F4F6'),
    arrow('결재자'),
    flowBox('리더용 결재함', '#002C5F', '#EFF6FF'),
    arrow('승인 시'),
    flowBox('결과보고 입력', '#059669', '#F0FDF4')
  )}

  ${sectionTitle('📋', '결재 흐름', '#374151')}
  ${flowRow(
    diamond('상신자 역할?', '#374151'),
    arrow('모든 학습자'),
    flowBox('팀원용 결재함', '#374151', '#F3F4F6'),
    arrow('  '),
    flowBox('결재 상태 확인\n(미결/완료/반려)', '#374151', '#F3F4F6')
  )}
  ${flowRow(
    diamond('리더 역할?', '#002C5F'),
    arrow('팀장~본부장'),
    flowBox('리더용 결재함', '#002C5F', '#EFF6FF'),
    arrow('  '),
    flowBox('승인 / 반려\n+ 코멘트', '#002C5F', '#EFF6FF'),
    arrow('승인'),
    flowBox('결과보고\n단계 활성화', '#059669', '#F0FDF4')
  )}
  <div style="padding:8px 14px;background:#FEF3C7;border-radius:8px;font-size:11px;color:#B45309;margin-top:4px">
    ⚠ 리더용 결재함: persona.role이 team_leader/dept_head/center_head/hq_head 중 하나인 경우만 GNB 메뉴 노출
  </div>

  ${sectionTitle('✅', '결과보고', '#059669')}
  ${flowRow(
    flowBox('교육 완료 후', '#059669', '#F0FDF4'),
    arrow(),
    flowBox('결과입력 화면', '#059669', '#F0FDF4'),
    arrow('실지출\n입력'),
    flowBox('증빙 첨부', '#059669', '#F0FDF4'),
    arrow('제출'),
    flowBox('리더용\n결재함', '#059669', '#F0FDF4'),
    arrow('최종승인'),
    flowBox('원장 차감\n확정', '#065F46', '#D1FAE5')
  )}

  ${sectionTitle('⚙️', '백오피스 운영 프로세스 (셋업 순서)', '#374151')}
  ${flowRow(
    flowBox('① 테넌트 생성', '#374151', '#F3F4F6', '100px'),
    arrow(),
    flowBox('② 격리그룹 설정', '#374151', '#F3F4F6', '110px'),
    arrow(),
    flowBox('③ VOrg 템플릿', '#374151', '#F3F4F6', '100px'),
    arrow(),
    flowBox('④ 예산계정 등록', '#374151', '#F3F4F6', '110px'),
    arrow(),
    flowBox('⑤ 양식 빌더', '#374151', '#F3F4F6', '90px'),
    arrow(),
    flowBox('⑥ 서비스 정책', '#002C5F', '#EFF6FF', '100px')
  )}
  ${flowRow(
    flowBox('⑦ 교육유형 등록\n(edu_type)', '#7C3AED', '#EDE9FE', '120px'),
    arrow(),
    flowBox('⑧ FO 정책 로드', '#1D4ED8', '#DBEAFE', '110px'),
    arrow(),
    flowBox('⑨ 학습자 화면\n동적 구성', '#059669', '#F0FDF4', '110px'),
    arrow(),
    flowBox('⑩ 예산 집행\n원장 기록', '#065F46', '#D1FAE5', '110px')
  )}

</div>`;
}
