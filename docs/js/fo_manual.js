// ─── 프론트오피스: 서비스 매뉴얼 ─────────────────────────────────────────────
// LXP 학습자 및 팀담당자를 위한 기능 안내.
// 서비스 기획자·개발자가 FO 흐름 전체를 이해하는 데 활용합니다.

function renderFoManual() {
  const el = document.getElementById('page-fo-manual');
  if (!el) return;
  el.innerHTML = `
<div style="max-width:900px;margin:0 auto">

  <!-- 헤더 -->
  <div style="background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.1em">MANUAL</span>
      <h1 style="font-size:20px;font-weight:900;margin:0">프론트오피스 서비스 매뉴얼</h1>
    </div>
    <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
      LXP 교육담당자(팀담당자)·학습자를 위한 교육예산 활용 안내서입니다.<br>
      서비스 기획자·개발자가 학습자 화면의 흐름을 파악하는 데 활용하세요. | v1.0
    </p>
  </div>

  <!-- 탭 -->
  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0">
    ${[
      { id: 'fo-overview',  label: '① 프론트 개요' },
      { id: 'fo-personas',  label: '② 페르소나별 업무' },
      { id: 'fo-menus',     label: '③ 메뉴 상세' },
      { id: 'fo-calc',      label: '④ 세부산출근거 활용' },
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
    const isActive = b.id === `fomtab-${id}`;
    b.style.color       = isActive ? '#002C5F' : '#6B7280';
    b.style.borderColor = isActive ? '#002C5F' : 'transparent';
    b.style.fontWeight  = isActive ? '800' : '700';
  });
  const c = document.getElementById('fo-manual-content');
  if (!c) return;
  if (id === 'fo-overview')  c.innerHTML = _foManOverview();
  if (id === 'fo-personas')  c.innerHTML = _foManPersonas();
  if (id === 'fo-menus')     c.innerHTML = _foManMenus();
  if (id === 'fo-calc')      c.innerHTML = _foManCalc();
}

/* ─── ① 프론트 개요 ─────────────────────────────────────────────────────────── */
function _foManOverview() {
  return `
<div style="display:flex;flex-direction:column;gap:18px">

  <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:800;color:#1D4ED8;margin:0 0 8px">프론트오피스(LXP) 역할</h2>
    <p style="font-size:13px;color:#374151;line-height:1.8;margin:0">
      LXP(Learning Experience Platform) 프론트오피스는 <strong>교육담당자(팀담당자)</strong>와 <strong>일반 학습자</strong>가
      교육계획을 수립하고, 교육을 신청하며, 예산을 집행하는 <strong>실사용자 화면</strong>입니다.
      백오피스에서 관리자가 설정한 마스터 데이터(산출근거, 결재라인, 가상조직 등)를 기반으로
      동적으로 화면이 구성됩니다.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">👤 사용 페르소나</div>
      ${[
        { role: '팀담당자', key:'hmc_team_mgr', desc: '팀 단위 교육계획 수립 + 팀전체 신청', color:'#002C5F' },
        { role: '일반 학습자', key:'hmc_learner',  desc: '개인 교육신청 + 이력 조회', color:'#1D4ED8'   },
        { role: 'KIA 학습자',  key:'kia_learner',  desc: '기아 계정 기반 신청', color:'#059669'         },
        { role: 'HAE 학습자',  key:'hae_learner',  desc: '계획→신청→정산 고정 프로세스', color:'#7C3AED' },
      ].map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#F9FAFB;margin-bottom:6px">
        <span style="background:${p.color};color:#fff;font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${p.role}</span>
        <span style="font-size:11px;color:#6B7280">${p.desc}</span>
      </div>`).join('')}
    </div>

    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">📄 주요 페이지</div>
      ${[
        { page:'대시보드', desc:'교육이력·예산 현황 요약', icon:'🏠' },
        { page:'교육계획', desc:'계획서 수립·상신·이력 조회', icon:'📋' },
        { page:'교육신청', desc:'신청서 제출·상태 추적', icon:'📝' },
        { page:'서비스 매뉴얼', desc:'이 화면 (기획·개발 참고)', icon:'📖' },
      ].map(p => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:16px">${p.icon}</span>
        <div>
          <span style="font-size:12px;font-weight:700;color:#374151">${p.page}</span>
          <span style="font-size:11px;color:#9CA3AF;margin-left:6px">${p.desc}</span>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#F0FDF4;border-radius:12px;padding:16px;border:1px solid #A7F3D0">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">🔄 핵심 프로세스: 계획 → 신청 → 결과</div>
    <div style="display:flex;align-items:center;gap:0;overflow-x:auto">
      ${[
        { label: '교육계획 수립', sub: '4단계 위저드', color: '#059669' },
        { label: '→', sub: '', color: '#9CA3AF' },
        { label: '계획 승인', sub: 'BO 결재선 통과', color: '#059669' },
        { label: '→', sub: '', color: '#9CA3AF' },
        { label: '교육 신청', sub: '가용예산 확인', color: '#D97706' },
        { label: '→', sub: '', color: '#9CA3AF' },
        { label: '신청 결재', sub: '금액별 결재선', color: '#7C3AED' },
        { label: '→', sub: '', color: '#9CA3AF' },
        { label: '결과 정산', sub: '실지출 입력', color: '#DC2626' },
      ].map(s => s.label === '→'
        ? `<span style="color:${s.color};font-size:18px;padding:0 6px;flex-shrink:0">→</span>`
        : `<div style="text-align:center;padding:10px 12px;background:#fff;border-radius:8px;border:1.5px solid ${s.color}30;flex-shrink:0">
            <div style="font-size:11px;font-weight:800;color:${s.color}">${s.label}</div>
            <div style="font-size:10px;color:#9CA3AF;margin-top:2px">${s.sub}</div>
           </div>`
      ).join('')}
    </div>
  </div>
</div>`;
}

/* ─── ② 페르소나별 업무 ──────────────────────────────────────────────────────── */
function _foManPersonas() {
  const personas = [
    {
      name: '조인성 (HMC 팀담당자 / team_general)',
      badge: '#002C5F',
      desc: '팀 단위 교육 예산을 운영합니다. 팀 전체 교육계획을 수립하고, 팀원의 교육 신청을 대행하며 결과를 정산합니다.',
      steps: [
        { icon: '📋', title: '교육계획 수립 (4단계 위저드)',
          desc: `Step1 기본정보(교육명·일정·인원) → Step2 가상조직 선택 → Step3 예산 계정 선택 → Step4 세부산출근거 입력.
                 각 항목별 수량×단가 = 소계, 전체 합계가 '계획 예산액'으로 자동 집계됩니다.
                 Soft Limit 초과 시 경고+사유 입력 요구, Hard Limit 초과 시 저장 차단.` },
        { icon: '📤', title: '계획 상신',
          desc: '계획서를 상신하면 결재라인이 자동 構成됩니다. 승인 결과는 "증빙 근거"로 확정되며, 이후 신청 시 연결됩니다. 승인 = 예산 배분이 아님.' },
        { icon: '📝', title: '교육 신청',
          desc: '승인된 계획을 선택하거나, 즉시 신청(계획 없이)을 선택합니다. 팀 가용 예산 범위 내에서 집행 금액을 확정하고 신청서를 제출합니다.' },
        { icon: '✅', title: '결과 정산',
          desc: '교육 완료 후 실지출 내역을 입력하고 증빙을 첨부합니다. 신청액 vs 실지출 차액은 자동으로 예산 복구 또는 추가 승인 프로세스가 발동합니다.' },
      ],
    },
    {
      name: '이상봉 (HMC 일반 학습자 / learner)',
      badge: '#1D4ED8',
      desc: '개인 단위 교육을 신청합니다. 계획 수립 권한은 없으며, 배정받은 예산 보유 범위 내에서 신청이 가능합니다.',
      steps: [
        { icon: '📝', title: '교육 신청',
          desc: '교육 목적(직무역량/리더십 등) 선택 → 예산 계정 자동 매핑 → 신청서 작성 → 비용 내역(세부산출근거) 입력 → 제출.' },
        { icon: '📊', title: '신청 현황 조회',
          desc: '나의 신청 목록에서 상태(심사중/승인/반려) 확인. 반려 시 사유 확인 후 수정 재신청.' },
        { icon: '🏠', title: '대시보드 조회',
          desc: '개인 예산 잔액, 이번 연도 교육 이력, 미완료 신청 건을 한눈에 확인합니다.' },
      ],
    },
    {
      name: '최다혜 (HAE 학습자 / plan-apply-result 고정 프로세스)',
      badge: '#7C3AED',
      desc: '현대오토에버 학습자는 "계획 수립 → 신청 → 결과" 3단계 고정 프로세스를 따릅니다. 계획 없이 즉시 신청은 불가능합니다.',
      steps: [
        { icon: '📋', title: '교육계획 수립 (필수)',
          desc: 'HAE는 process="plan-apply-result"로 설정된 페르소나입니다. 교육 신청 전 반드시 계획서를 먼저 상신하고 승인을 받아야 합니다.' },
        { icon: '📝', title: '신청 (계획 연결 필수)',
          desc: '승인된 계획 목록에서 선택하여 신청서를 작성합니다. 계획 없이 신청 버튼은 비활성화됩니다.' },
        { icon: '✅', title: '결과 정산',
          desc: '교육 완료 후 실지출 및 증빙을 등록합니다.' },
      ],
    },
  ];

  return `
<div style="display:flex;flex-direction:column;gap:18px">
  ${personas.map(p => `
  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:14px;overflow:hidden">
    <div style="padding:14px 20px;background:${p.badge}10;border-bottom:1.5px solid ${p.badge}20;display:flex;align-items:flex-start;gap:12px">
      <div style="background:${p.badge};color:#fff;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:900;white-space:nowrap;flex-shrink:0">FO</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:#111827">${p.name}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:3px">${p.desc}</div>
      </div>
    </div>
    <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
      ${p.steps.map((s, i) => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:#F9FAFB;border-radius:10px">
        <span style="font-size:16px;flex-shrink:0">${s.icon}</span>
        <div>
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:3px">
            <span style="color:#9CA3AF;font-weight:500;margin-right:5px">Step ${i+1}</span>${s.title}
          </div>
          <div style="font-size:11px;color:#6B7280;line-height:1.7">${s.desc}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>`).join('')}
</div>`;
}

/* ─── ③ 메뉴 상세 ──────────────────────────────────────────────────────────── */
function _foManMenus() {
  const menus = [
    {
      icon: '🏠', name: '대시보드 (통합교육이력관리)',
      desc: `현재 학습자의 <strong>예산 잔액, 집행률, 진행중 신청, 교육 이력</strong>을 한눈에 보여줍니다.<br>
             예산 계정별 잔액 (HMC-OPS, HMC-ETC 등) 및 계정별 소진율 차트가 포함됩니다.<br>
             우측 floating-budget 위젯에서 실시간 잔액을 확인할 수 있습니다.`,
      impl: 'currentPersona.budgets 배열에서 balance-used 계산. 실제로는 ERP 잔액 API 실시간 조회.',
    },
    {
      icon: '📋', name: '교육계획 (4단계 위저드)',
      desc: `교육 실행 전 예산을 사전 계획하고 승인 받는 프로세스입니다.<br>
             <strong>Step 1.</strong> 기본정보: 교육명, 일정, 대상인원, 교육 유형(국내/해외), 학습유형 선택<br>
             <strong>Step 2.</strong> 가상조직: 교육 대상 팀/조직 선택 (VOrg 템플릿 기준)<br>
             <strong>Step 3.</strong> 예산 계정: 교육 목적 연동 자동 계정 매핑<br>
             <strong>Step 4.</strong> 세부산출근거: 항목 선택 → 수량·단가 입력 → 소계 합산 → 자동 결재선 미리보기<br>
             ⚠ 계획 승인은 "예산을 배분"하지 않습니다. 신청 시 가용예산 내에서 실제 집행이 확정됩니다.`,
      impl: 'planState 객체로 4단계 상태 관리. 세부산출근거는 CALC_GROUNDS_MASTER에서 usageScope===plan && visibleFor 필터 후 표시.',
    },
    {
      icon: '📝', name: '교육신청',
      desc: `학습자가 특정 교육 과정에 대한 <strong>예산 집행을 신청</strong>하는 화면입니다.<br>
             신청 방식은 2가지: ① 승인된 계획 연결 신청, ② 즉시 신청(계획 없이, 페르소나 설정에 따라 허용/불허)<br>
             비용 내역(세부산출근거, usageScope===apply)을 입력하고 총액을 확정합니다.<br>
             제출 시 APPROVAL_ROUTING에서 금액 구간 조회 → 결재선 자동 생성 → 결재 요청 발송.<br>
             가용예산 부족 시 신청 차단 (잔액 < 신청액).`,
      impl: '신청 제출 시 예산 홀딩(가점유) 처리. 결재 완료 후 집행 확정. 반려 시 홀딩 해제.',
    },
    {
      icon: '📖', name: '서비스 매뉴얼',
      desc: '현재 화면입니다. 시스템 기획·개발 참고용 문서입니다.',
      impl: '별도 DB 불필요. 정적 콘텐츠로 관리하거나 CMS 연동.',
    },
  ];

  return `
<div style="display:flex;flex-direction:column;gap:14px">
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

/* ─── ④ 세부산출근거 활용 (FO 관점) ─────────────────────────────────────────── */
function _foManCalc() {
  return `
<div style="display:flex;flex-direction:column;gap:18px">

  <div style="background:#F0FDF4;border-radius:12px;padding:18px;border:1px solid #A7F3D0">
    <h3 style="font-size:13px;font-weight:800;color:#065F46;margin:0 0 12px">세부산출근거란?</h3>
    <p style="font-size:12px;color:#374151;line-height:1.8;margin:0">
      교육 예산을 지출하는 각 비목(항목)을 표준화한 목록입니다.
      백오피스에서 관리자가 설정한 항목만 학습자 화면에 노출됩니다.
      교육계획 수립, 교육 신청, 결과 정산 각 단계에서 사용 단계(usageScope)가 맞는 항목만 표시됩니다.
    </p>
  </div>

  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:18px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 12px">노출 필터링 로직</h3>
    <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
      ${[
        { cond: '계획 수립 화면',  filter: 'usageScope.includes("plan") = true인 항목만 표시' },
        { cond: '교육 신청 화면',  filter: 'usageScope.includes("apply") = true인 항목만 표시' },
        { cond: '결과 정산 화면',  filter: 'usageScope.includes("settle") = true인 항목만 표시' },
        { cond: '국내 교육',       filter: 'visibleFor === "both" || visibleFor === "domestic" 항목 표시' },
        { cond: '해외 교육',       filter: 'visibleFor === "both" || visibleFor === "overseas" 항목 표시' },
        { cond: '운영계정 선택 시', filter: 'accountTypes.includes("ops") 항목만 (21종 기준)' },
        { cond: '기타계정 선택 시', filter: 'accountTypes.includes("etc") 항목만 (7종 기준)' },
      ].map(r => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:8px 12px;background:#F9FAFB;border-radius:8px">
        <span style="font-size:11px;font-weight:800;color:#374151;white-space:nowrap;min-width:130px">${r.cond}</span>
        <span style="font-size:11px;color:#6B7280;font-family:monospace">${r.filter}</span>
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:18px">
    <h3 style="font-size:13px;font-weight:800;color:#111827;margin:0 0 12px">상한액(Ceiling) 동작 방식</h3>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${[
        { type: '제한없음', color: '#059669', bg: '#F0FDF4', desc: '금액 제한 없이 자유롭게 입력 가능합니다.' },
        { type: '⚠ Soft Limit', color: '#D97706', bg: '#FFFBEB', desc: 'softLimit을 초과하면 경고 메시지가 표시되며, 사유를 입력하면 진행될 수 있습니다. 관리자 설정에 따라 추가 승인이 필요할 수 있습니다.' },
        { type: '🚫 Hard Limit', color: '#DC2626', bg: '#FEF2F2', desc: 'hardLimit을 초과하는 금액을 입력하면 계획 저장 및 신청 제출이 시스템적으로 차단됩니다. 항목 금액을 한도 이하로 조정해야 합니다.' },
      ].map(l => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:${l.bg};border-radius:10px;border:1px solid ${l.color}20">
        <span style="font-size:12px;font-weight:800;color:${l.color};white-space:nowrap;min-width:80px">${l.type}</span>
        <span style="font-size:12px;color:#374151;line-height:1.6">${l.desc}</span>
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#FFFBEB;border-radius:12px;padding:18px;border:1px solid #FDE68A">
    <h3 style="font-size:13px;font-weight:800;color:#92400E;margin:0 0 12px">💡 향후 확장: 해외 교육 대응</h3>
    <p style="font-size:12px;color:#374151;line-height:1.8;margin:0">
      현재 프로토타입에는 국내 교육 항목(식비, 강의장, 사외강사료 등)이 주로 포함되어 있습니다.<br>
      <strong>해외 교육 지원을 추가할 때</strong>는 백오피스 세부산출근거 관리에서 '항공료', '해외 숙박비', '비자 발급비', '해외 강사료' 등을
      <code style="background:#FEF3C7;padding:1px 5px;border-radius:3px">visibleFor: "overseas"</code>로 등록하면,
      학습자가 교육계획 수립 시 국내/해외를 선택함에 따라 해당 항목이 자동으로 추가 노출됩니다.
    </p>
  </div>

</div>`;
}
