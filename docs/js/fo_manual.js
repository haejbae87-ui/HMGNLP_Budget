// ─── 프론트오피스: 서비스 매뉴얼 (v2.0) ─────────────────────────────────────
// 대상: 차세대학습플랫폼 서비스 기획자 및 학습자

function renderFoManual() {
  const el = document.getElementById('page-fo-manual');
  if (!el) return;
  el.innerHTML = `
<div style="max-width:900px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#002C5F,#1D4ED8);border-radius:16px;padding:28px 32px;color:#fff;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.1em">FRONT-OFFICE MANUAL v2.0</span>
    </div>
    <h1 style="font-size:20px;font-weight:900;margin:0 0 8px">프론트오피스 서비스 매뉴얼</h1>
    <p style="font-size:13px;color:rgba(255,255,255,.8);margin:0;line-height:1.6">
      LXP 학습자·팀담당자를 위한 교육예산 활용 안내서<br>
      차세대학습플랫폼 기획자·개발자가 학습자 화면 흐름을 파악하는 데도 활용하세요. | 2026-03-24 v3.0
    </p>
  </div>

  <div style="display:flex;gap:6px;margin-bottom:24px;border-bottom:2px solid #E5E7EB;padding-bottom:0;overflow-x:auto">
    ${[
      { id:'fo-overview',  label:'① 프론트 개요' },
      { id:'fo-scenarios', label:'② 신청 시나리오' },
      { id:'fo-menus',     label:'③ 메뉴 상세' },
      { id:'fo-calc',      label:'④ 세부산출근거' },
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
  const map = { 'fo-overview':_foManOverview, 'fo-scenarios':_foManScenarios, 'fo-menus':_foManMenus, 'fo-calc':_foManCalc };
  if (map[id]) c.innerHTML = map[id]();
}

/* ① 프론트 개요 */
function _foManOverview() {
  return `<div style="display:flex;flex-direction:column;gap:18px">

  <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1px solid #BFDBFE">
    <h2 style="font-size:14px;font-weight:800;color:#1D4ED8;margin:0 0 8px">프론트오피스(LXP) 역할</h2>
    <p style="font-size:13px;color:#374151;line-height:1.8;margin:0">
      백오피스에서 설정한 <strong>서비스 정책(패턴A/B/C/D)</strong>에 따라 학습자 화면이 동적으로 구성됩니다.<br>
      학습자는 예산 정책을 알 필요 없이 <strong>신청 목적 → 예산 선택 → 정보 입력</strong>의 자연스러운 흐름으로 교육을 신청합니다.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">👤 학습자 유형</div>
      ${[
        { role:'팀담당자', desc:'팀 단위 교육계획 수립 + 구성원 신청 대행', color:'#002C5F' },
        { role:'HMC 학습자', desc:'일반예산·R&D예산 복합 사용 가능', color:'#1D4ED8' },
        { role:'KIA 학습자', desc:'기아 일반예산 기반 신청', color:'#059669' },
        { role:'HAE 학습자', desc:'전사교육예산·팀프로젝트할당예산·예산미사용 3가지 카드 선택', color:'#7C3AED' },
        { role:'HSC 학습자', desc:'현대제쳊 사외교육 계정(신청→결과 패턴B)', color:'#BE123C' },
      ].map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#F9FAFB;margin-bottom:6px">
        <span style="background:${p.color};color:#fff;font-size:9px;font-weight:900;padding:2px 7px;border-radius:4px;white-space:nowrap">${p.role}</span>
        <span style="font-size:11px;color:#6B7280">${p.desc}</span>
      </div>`).join('')}
    </div>
    <div style="background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;padding:16px">
      <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px">📱 GNB 메뉴 구조</div>
      <div style="padding:10px;background:#002C5F;border-radius:8px;color:#fff;font-size:12px;font-weight:700;margin-bottom:8px">
        Next Learning &nbsp;|&nbsp; 🌟 성장 ▾ &nbsp;|&nbsp; 📖 매뉴얼
      </div>
      <div style="font-size:11px;color:#6B7280;margin-bottom:6px">▼ 성장 드롭다운:</div>
      ${[
        { m:'📊 교육계획', s:'교육계획 수립·검토·이력', active:true },
        { m:'📝 교육신청', s:'신청서 제출·상태 추적', active:true },
        { m:'📚 교육이력등록', s:'준비 중', active:false },
        { m:'🌐 어학점수', s:'준비 중', active:false },
        { m:'🏅 자격증', s:'준비 중', active:false },
      ].map(m => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:${m.active?'#EFF6FF':'#F9FAFB'};margin-bottom:4px;opacity:${m.active?1:0.6}">
        <span style="font-size:12px">${m.m}</span>
        <span style="font-size:10px;color:#9CA3AF;flex:1">${m.s}</span>
        ${!m.active?'<span style="font-size:9px;background:#F3F4F6;color:#9CA3AF;padding:1px 5px;border-radius:3px;font-weight:700">준비중</span>':''}
      </div>`).join('')}
    </div>
  </div>

  <div style="background:#F0FDF4;border-radius:12px;padding:16px;border:1px solid #A7F3D0">
    <div style="font-size:12px;font-weight:800;color:#065F46;margin-bottom:10px">🔄 예산 유형별 신청 흐름 요약</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      ${[
        { t:'💳 일반교육예산', flow:'교육유형 선택 → 세부정보 → 결과보고', color:'#1D4ED8', pat:'패턴B' },
        { t:'🔬 R&D교육예산',  flow:'교육계획 선택(자동세팅) → 세부정보 → 결과보고', color:'#7C3AED', pat:'패턴A' },
        { t:'📝 예산 미사용',  flow:'교육유형 선택 → 학습내용 → 이력 즉시 적재', color:'#6B7280', pat:'패턴D' },
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

/* ② 신청 시나리오 (이O봉 책임 기준) */
function _foManScenarios() {
  const scenarios = [
    {
      title:'시나리오 1: 일반교육예산 참가계정 사용',
      persona:'이O봉 책임 (HMC 학습자)', badge:'#1D4ED8',
      pattern:'패턴 B: 신청 → 결과',
      steps:[
        { n:'1', t:'개인직무 사외학습 목적 선택', d:'신청 목적 선택 화면에서 "개인직무 사외학습" 선택' },
        { n:'2', t:'예산 선택: 일반교육예산 참가계정', d:'3가지 예산 카드 중 "💳 일반교육예산 참가계정(후정산형)" 선택' },
        { n:'3', t:'교육유형 선택', d:'집합·이러닝·세미나 등 학습 유형 직접 선택 (R&D와 달리 자유 선택 가능)' },
        { n:'4', t:'세부정보 입력 및 상신', d:'교육명·일정·금액·세부산출근거 입력 후 제출. 서비스 정책 기반 결재선 자동 생성.' },
        { n:'5', t:'결과보고 작성', d:'수강 완료 후 수료증 첨부 및 실지출 입력. 승인 시 실 차감 확정.' },
      ],
    },
    {
      title:'시나리오 2: R&D 교육예산 사용',
      persona:'이O봉 책임 (HMC 학습자)', badge:'#7C3AED',
      pattern:'패턴 A: 계획 → 신청 → 결과',
      steps:[
        { n:'1', t:'개인직무 사외학습 목적 선택', d:'신청 목적 선택 화면에서 "개인직무 사외학습" 선택' },
        { n:'2', t:'예산 선택: R&D교육예산 계정', d:'3가지 예산 카드 중 "🔬 R&D교육예산 계정(계획 연동 필수)" 선택' },
        { n:'3', t:'교육계획 선택 (교육유형 자동 세팅)', d:'사전 승인된 R&D 교육계획 목록에서 선택. 계획에 등록된 교육유형이 자동 세팅됨(데이터 일관성). 교육유형 선택 단계 Skip.' },
        { n:'4', t:'세부정보 입력 및 상신', d:'계획 데이터 기반으로 정보가 일부 자동 채워짐. 추가 정보 입력 후 제출.' },
        { n:'5', t:'결과보고 작성', d:'수강 완료 후 결과 입력. 승인 시 R&D예산 실차감 확정.' },
      ],
    },
    {
      title:'시나리오 3: 회사 비용 미사용 (이력 등록)',
      persona:'이O봉 책임 (HMC 학습자)', badge:'#6B7280',
      pattern:'패턴 D: 신청 단독 (이력관리형)',
      steps:[
        { n:'1', t:'개인직무 사외학습 목적 선택', d:'신청 목적 선택 화면에서 "개인직무 사외학습" 선택' },
        { n:'2', t:'예산 선택: 예산 미사용', d:'3가지 예산 카드 중 "📝 예산 미사용(이력만 등록)" 선택' },
        { n:'3', t:'교육유형 선택', d:'자체 세미나·무료 강의·동영상 학습 등 유형 선택' },
        { n:'4', t:'학습내용 입력', d:'금액 입력 없이 학습명·내용·증빙 위주로 입력. 예산 잔액에 영향 없음.' },
        { n:'✅', t:'승인 즉시 이력 적재', d:'별도 결과보고 없이 승인 완료 시 학습이력 DB에 즉시 저장.' },
      ],
    },
    {
      title:'시나리오 4: 팀담당자의 집합교육 계획 수립',
      persona:'조O성 책임 (HMC 팀담당자)', badge:'#002C5F',
      pattern:'패턴 A: 계획 → 신청 → 결과',
      steps:[
        { n:'1', t:'교육계획 수립 (4단계 위저드)', d:'Step1 기본정보(교육명·일정·인원) → Step2 가상조직 선택 → Step3 예산계정 선택 → Step4 세부산출근거 입력' },
        { n:'2', t:'계획 상신', d:'계획서 상신 시 결재라인 자동 구성. 승인 결과가 "증빙 근거"로 확정.' },
        { n:'3', t:'교육 신청', d:'승인된 계획을 선택하여 팀 가용예산 범위 내에서 신청서 제출' },
        { n:'4', t:'결과 정산', d:'교육 완료 후 실지출 입력·증빙 첨부. 신청액 vs 실지출 차액 자동 처리.' },
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
      icon:'🏠', name:'대시보드 (통합교육이력관리)',
      desc:`학습자의 <strong>예산 잔액·집행률·진행중 신청·교육이력</strong>을 한눈에 표시합니다.<br>
             계정별 잔액(일반참가·운영·R&D 등) 및 소진율 차트 포함.<br>
             우측 floating-budget 위젯에서 실시간 잔액 확인 가능.`,
      impl:'currentPersona.budgets 배열에서 balance-used 계산. 실제는 ERP 잔액 API 실시간 조회.',
    },
    {
      icon:'📊', name:'교육계획 (4단계 위저드)',
      desc:`교육 실행 전 예산 사전 계획 및 승인 프로세스입니다.<br>
             <strong>Step1.</strong> 기본정보: 교육명·일정·인원·학습유형<br>
             <strong>Step2.</strong> 가상조직: 교육 대상 팀/조직 선택<br>
             <strong>Step3.</strong> 예산계정: 교육 목적 연동 자동 매핑<br>
             <strong>Step4.</strong> 세부산출근거: 항목 선택 → 수량·단가 → 소계 합산 → 결재선 미리보기<br>
             ⚠ 계획 승인 = 예산 배분이 아님. 신청 시 가용예산 내 실제 집행 확정.`,
      impl:'planState 객체로 4단계 상태 관리. 세부산출근거는 usageScope===plan && visibleFor 필터 후 표시.',
    },
    {
      icon:'📝', name:'교육신청',
      desc:`학습자가 교육 과정에 대한 <strong>예산 집행을 신청</strong>하는 화면입니다.<br>
             <strong>3가지 예산 경로:</strong> 일반교육예산(패턴B) / R&D교육예산(패턴A, 계획선택) / 예산미사용(패턴D)<br>
             R&D 선택 시 교육유형 선택 단계 Skip → 계획에 종속된 세부 정보 입력.<br>
             제출 시 서비스 정책 → 금액 구간 → 결재자 자동 라우팅.`,
      impl:'applyState.budgetChoice(general/rnd/none)으로 분기. R&D 시 step2→4 점프.',
    },
    {
      icon:'📚', name:'교육이력등록 (준비 중)',
      desc:`수료·이수 이력을 직접 등록합니다. 현재 GNB 메뉴 구성만 완료된 상태입니다.`,
      impl:'미기획. 추후 외부 교육 이력 연동(LMS 데이터, 자격증 API 등) 설계 필요.',
    },
    {
      icon:'🌐', name:'어학점수 (준비 중)',
      desc:`TOEIC·OPIc 등 어학점수를 관리합니다. 현재 GNB 메뉴 구성만 완료된 상태입니다.`,
      impl:'미기획. HR 시스템 어학점수 데이터 연동 설계 필요.',
    },
    {
      icon:'🏅', name:'자격증 (준비 중)',
      desc:`자격증·면허 취득 이력을 관리합니다. 현재 GNB 메뉴 구성만 완료된 상태입니다.`,
      impl:'미기획. 국가자격증 DB 연동 및 자격증계정(HAE-CERT 등) 연계 설계 필요.',
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
        { cond:'계획 수립 화면', filter:'usageScope.includes("plan") = true인 항목만 표시' },
        { cond:'교육 신청 화면', filter:'usageScope.includes("apply") = true인 항목만 표시' },
        { cond:'결과 정산 화면', filter:'usageScope.includes("settle") = true인 항목만 표시' },
        { cond:'국내 교육',     filter:'visibleFor === "both" || visibleFor === "domestic"' },
        { cond:'해외 교육',     filter:'visibleFor === "both" || visibleFor === "overseas"' },
        { cond:'운영계정 선택', filter:'accountTypes.includes("ops") 항목만 (21종 기준)' },
        { cond:'기타계정 선택', filter:'accountTypes.includes("etc") 항목만 (7종 기준)' },
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
        { type:'제한없음', color:'#059669', bg:'#F0FDF4', desc:'금액 제한 없이 자유롭게 입력 가능합니다.' },
        { type:'⚠ Soft Limit', color:'#D97706', bg:'#FFFBEB', desc:'softLimit 초과 시 경고 메시지 표시. 사유 입력 후 진행 가능. 관리자 설정에 따라 추가 승인 필요 가능.' },
        { type:'🚫 Hard Limit', color:'#DC2626', bg:'#FEF2F2', desc:'hardLimit 초과 금액 입력 시 저장·제출이 시스템적으로 차단됩니다. 금액을 한도 이하로 조정해야 합니다.' },
      ].map(l => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:${l.bg};border-radius:10px;border:1px solid ${l.color}20">
        <span style="font-size:12px;font-weight:800;color:${l.color};white-space:nowrap;min-width:80px">${l.type}</span>
        <span style="font-size:12px;color:#374151;line-height:1.6">${l.desc}</span>
      </div>`).join('')}
    </div>
  </div>

</div>`;
}
