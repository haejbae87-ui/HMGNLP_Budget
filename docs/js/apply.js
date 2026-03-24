// ─── APPLY (교육신청) — 목록 ↔ 신청폼 전환 허브 ────────────────────────────────

function renderApply() {
  if (typeof applyViewMode === 'undefined') applyViewMode = 'list';
  if (applyViewMode === 'form') {
    _renderApplyForm();
  } else {
    _renderApplyList();
  }
}

// ─── 교육신청 목록 뷰 ──────────────────────────────────────────────────────────
function _renderApplyList() {
  const STATUS_CFG = {
    '승인완료':   { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅', label: '승인완료'   },
    '반려':       { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌', label: '반려'       },
    '결재진행중': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⏳', label: '결재진행중' },
    '승인대기':   { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: '🕐', label: '승인대기'   },
  };

  const rows = MOCK_HISTORY.map(h => {
    const cfg = STATUS_CFG[h.applyStatus] || STATUS_CFG['승인대기'];
    const canResult = h.applyStatus === '승인완료';
    return `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s">
      <!-- 상태 아이콘 -->
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
      <!-- 본문 -->
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:900;color:#111827">${h.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;
                background:${cfg.color}20;color:${cfg.color}">${cfg.label}</span>
          ${h.resultDone ? '<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">📋 결과작성완료</span>' : ''}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          <span>📅 ${h.date} ~ ${h.endDate}</span>
          <span>📚 ${h.type}</span>
          <span>💰 ${h.budget} · ${(h.amount||0).toLocaleString()}원</span>
          <span>⏱ ${h.hours}H</span>
        </div>
        ${h.applyStatus === '반려' ? `
        <div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
          ⚠️ 반려 사유: 예산 잔액 부족으로 반려되었습니다. 예산 계획 수립 후 재신청 바랍니다.
        </div>` : ''}
      </div>
      <!-- 액션 버튼 -->
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${canResult && !h.resultDone ? `
        <button onclick="alert('교육결과 작성 기능 준비 중입니다.')"
          style="padding:8px 14px;border-radius:8px;background:#002C5F;color:white;font-size:11px;
                 font-weight:800;border:none;cursor:pointer;white-space:nowrap">
          📝 결과 작성
        </button>` : ''}
        ${canResult && h.resultDone ? `
        <button style="padding:8px 14px;border-radius:8px;background:#F3F4F6;color:#9CA3AF;
                       font-size:11px;font-weight:800;border:none;cursor:default;white-space:nowrap">
          ✅ 결과 제출 완료
        </button>` : ''}
      </div>
    </div>`;
  }).join('');

  document.getElementById('page-apply').innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <!-- 헤더 -->
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육 신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">내 교육신청 현황</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept}</p>
    </div>
    <button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(0,44,95,.3);transition:all .15s"
      onmouseover="this.style.background='#0050A8'"
      onmouseout="this.style.background='#002C5F'">
      ✏️ 교육 신청하기
    </button>
  </div>

  <!-- 요약 뱃지 -->
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    ${Object.entries({'승인완료':'#059669','결재진행중':'#D97706','반려':'#DC2626','승인대기':'#6B7280'}).map(([k,c]) => {
      const cnt = MOCK_HISTORY.filter(h => h.applyStatus === k).length;
      return `<div style="padding:6px 14px;border-radius:8px;background:${c}15;border:1.5px solid ${c}40;font-size:11px;font-weight:900;color:${c}">${k} ${cnt}건</div>`;
    }).join('')}
  </div>

  <!-- 목록 -->
  <div class="card p-6">
    ${MOCK_HISTORY.length === 0
      ? '<div style="padding:60px 20px;text-align:center;color:#9CA3AF;font-weight:700">📭 신청 이력이 없습니다.<br><span style="font-size:12px">위의 "교육 신청하기" 버튼으로 신청해보세요.</span></div>'
      : `<div style="display:flex;flex-direction:column;gap:10px">${rows}</div>`
    }
  </div>
</div>`;
}

// ─── 교육신청 폼 뷰 (기존 renderApply 로직) ──────────────────────────────────
function _renderApplyForm() {
  const s = applyState;
  const isFixedProcess = isFixedPlanProcess(currentPersona);
  const isRndPersona = currentPersona.role === 'learner' && (currentPersona.allowedAccounts || []).includes('HMC-RND');
  const availBudgets = s.purpose ? getPersonaBudgets(currentPersona, s.purpose.accounts) : [];
  const curBudget = availBudgets.find(b => b.id === s.budgetId) || null;
  const isRndBudget = curBudget?.account === '연구투자';
  const isOperBudget = curBudget?.account === '운영';
  // R&D 예산 계정에 연계된 교육계획 목록
  const rndPlans = MOCK_PLANS.filter(p => p.account === '연구투자');
  const hasRndPlans = rndPlans.length > 0;
  // 운영 예산 계정에 연계된 교육계획 목록
  const operPlans = MOCK_PLANS.filter(p => p.budgetId === curBudget?.id);
  const hasOperPlans = operPlans.length > 0;
  // 다음 버튼 활성 조건
  const step2Blocked = s.useBudget === true && ((isRndBudget && !hasRndPlans) || (isOperBudget && !hasOperPlans));
  const step2NeedPlan = s.useBudget === true && ((isRndBudget && hasRndPlans) || (isOperBudget && hasOperPlans));
  const step2CanNext = s.useBudget !== null && (
    s.useBudget === false ||
    (!isRndBudget && !isOperBudget && s.budgetId) ||
    (isRndBudget && s.planId) ||
    (isOperBudget && s.planIds?.length > 0)
  ) && !step2Blocked;
  const totalExp = s.expenses.reduce((sum, e) => sum + Number(e.price) * Number(e.qty), 0);
  const totalAmt = isRndBudget ? Number(s.rndTotal) : totalExp;
  const over = curBudget && totalAmt > (curBudget.balance - curBudget.used);

  document.getElementById('page-apply').innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#002C5F'" onmouseout="this.style.color='#6B7280'">
        ← 신청 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육 신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육 신청서 작성</h1>
    </div>
    ${s.planId ? '<span class="text-xs font-black text-accent bg-blue-50 border border-blue-200 px-4 py-2 rounded-full animate-pulse">🔗 사업계획 연동됨</span>' : ''}
  </div>

  <!-- Stepper indicator -->
  <div class="card p-6">
    <div class="flex items-center gap-2">
      ${[1, 2, 3, 4].map(n => `
      <div class="step-item flex items-center gap-2 ${s.step > n ? 'done' : s.step === n ? 'active' : ''}">
        <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? '✓' : n}</div>
        <span class="text-xs font-bold ${s.step === n ? 'text-brand' : 'text-gray-400'} hidden sm:block">${['목적 선택', '예산 선택', '교육유형 선택', '세부 정보'][n - 1]}</span>
        ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ''}
      </div>`).join('')}
    </div>
  </div>

  <!-- Step 1: Purpose -->
  <div class="card p-8 ${s.step === 1 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-6">01. 교육 목적 선택</h2>

    ${isFixedProcess ? `
    <!-- HAE 고정 프로세스 안내 -->
    <div class="mb-5 p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">🔒</span>
      <div>
        <div class="font-black text-purple-700 text-sm mb-1">${currentPersona.company} 고정 프로세스</div>
        <p class="text-xs text-purple-500 leading-relaxed">${currentPersona.desc}</p>
        <p class="text-xs text-purple-400 mt-1">⚠️ 신청 전 반드시 교육계획을 먼저 수립해야 합니다.</p>
      </div>
    </div>` : ''}

    <!-- 학습자 섹션 -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 tracking-wider">👤 학습자</span>
        <span class="text-[11px] text-gray-400">본인이 직접 학습에 참여하는 경우</span>
      </div>
      <div class="grid grid-cols-1 gap-4">
        ${getPersonaPurposes(currentPersona).filter(p => p.id === 'external_personal').map(p => `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all hover:border-accent ${s.purpose?.id === p.id ? 'border-accent bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${s.purpose?.id === p.id ? 'text-accent' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>

    <!-- 교육담당자 섹션: 표시할 목적 버튼이 있을 때만 렌더링 -->
    ${(() => {
      const operPurposes = !isFixedProcess ? getPersonaPurposes(currentPersona).filter(p => p.id !== 'external_personal') : [];
      if (operPurposes.length === 0) return '';
      return `
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 tracking-wider">🛠 교육담당자</span>
        <span class="text-[11px] text-gray-400">교육과정을 기획·운영하는 담당자</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${operPurposes.map(p => `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all hover:border-violet-400 ${s.purpose?.id === p.id ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-gray-200 bg-gray-50/50'}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${s.purpose?.id === p.id ? 'text-violet-600' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>`;
    })()}

    <div class="flex justify-end mt-6">
      <button onclick="applyNext()" ${!s.purpose ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? 'bg-brand text-white hover:bg-blue-900 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- Step 2: Budget -->
  <div class="card p-8 ${s.step === 2 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-2">02. 예산 선택</h2>

    ${(() => {
      const isIndividual = s.purpose?.id === 'external_personal';
      if (isIndividual) {
        // ── 개인직무 사외학습: 페르소나별 동적 예산 옵션 카드 ──────────────────
        const hasRnd    = (currentPersona.allowedAccounts || []).some(a => a.includes('RND'));
        const hasHscExt = (currentPersona.allowedAccounts || []).includes('HSC-EXT');
        const CHOICES = [
          ...(!hasHscExt ? [{
            id:'general', icon:'💳',
            title:'일반교육예산 참가계정',
            desc:'일반 교육예산에서 참가비를 지원받습니다. 개인 선지출 후 영수증을 첨부하여 신청합니다.',
            tag:'후정산형', tagColor:'#D97706', tagBg:'#FEF3C7',
            next:'교육유형 선택 → 세부정보', nextColor:'#059669',
          }] : []),
          ...(hasHscExt ? [{
            id:'general', icon:'🏭',
            title:'현대제철-사외교육 계정',
            desc:'현대제철 사외교육 예산에서 교육비를 지원받습니다. 신청 후 승인 시 예산이 차감되며, 이후 교육 결과를 작성합니다. (패턴 B: 신청 → 결과)',
            tag:'패턴B · 신청→결과', tagColor:'#BE123C', tagBg:'#FFF1F2',
            next:'교육유형 선택 → 세부정보', nextColor:'#BE123C',
          }] : []),
          ...(hasRnd ? [{
            id:'rnd', icon:'🔬',
            title:'R&D교육예산 계정',
            desc:'사전에 승인받은 R&D 교육계획과 연동하여 신청합니다. 교육계획 없이는 이 경로를 이용할 수 없습니다.',
            tag:'계획 연동 필수', tagColor:'#7C3AED', tagBg:'#F5F3FF',
            next:'교육계획 선택 → 세부정보', nextColor:'#7C3AED',
          }] : []),
          {
            id:'none', icon:'📝',
            title:'예산 미사용 (이력만 등록)',
            desc:'자비 학습·무료 강의 등 예산 사용 없이 학습 이력만 등록합니다. 예산 잔액에 영향을 주지 않습니다.',
            tag:'예산 미사용', tagColor:'#6B7280', tagBg:'#F3F4F6',
            next:'교육유형 선택 → 세부정보', nextColor:'#374151',
          },
        ];
        const bc = s.budgetChoice;
        return `<p class="text-sm text-gray-400 mb-5">이번 교육 신청에 어떤 예산을 사용하시겠습니까?</p>
<div style="display:grid;gap:10px;margin-bottom:4px">
${CHOICES.map(ch => {
  const active = bc === ch.id;
  const activeColor = ch.id==='rnd'?'#7C3AED':ch.id==='hae-edu'?'#7C3AED':ch.id==='hae-team'?'#059669':ch.id==='general'?(hasHscExt?'#BE123C':'#059669'):'#9CA3AF';
  const col = active ? activeColor : '#E5E7EB';
  return `<button onclick="selectBudgetChoice('${ch.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${col};
         background:${active?col+'12':'white'};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="font-size:26px;flex-shrink:0;margin-top:2px">${ch.icon}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
        <span style="font-size:14px;font-weight:900;color:${active?col:'#111827'}">${ch.title}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${ch.tagBg};color:${ch.tagColor}">${ch.tag}</span>
      </div>
      <p style="font-size:12px;color:#6B7280;line-height:1.55;margin:0 0 8px">${ch.desc}</p>
      <div style="font-size:10px;font-weight:800;color:${ch.nextColor}">다음 단계: ${ch.next} →</div>
    </div>
    <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${col};background:${active?col:'white'};flex-shrink:0;margin-top:4px;display:flex;align-items:center;justify-content:center">
      ${active ? '<span style="color:white;font-size:11px;font-weight:900">✓</span>' : ''}
    </div>
  </div>
</button>`;
}).join('')}
</div>
${bc === 'rnd' ? _renderRndPlanPicker(s) : ''}`;
      }

      // ── 개인직무 외: 기존 서비스 목록 유지 ───────────────────────────────────
      const svcs = (typeof SERVICE_DEFINITIONS !== 'undefined'
        ? SERVICE_DEFINITIONS.filter(sv => sv.tenantId === currentPersona.tenantId && sv.status === 'active')
        : []);
      const PC = { A:'#7C3AED', B:'#1D4ED8', C:'#059669' };
      const PL = { A:'패턴A', B:'패턴B', C:'패턴C' };
      return `<p class="text-sm text-gray-500 mb-4">어떤 서비스로 신청하시나요?</p>
<div style="display:grid;gap:6px">
${svcs.map(sv => `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
   border:2px solid ${s.serviceId===sv.id?PC[sv.processPattern]:'#E5E7EB'};
   background:${s.serviceId===sv.id?PC[sv.processPattern]+'12':'white'};cursor:pointer"
   onclick="selectService('${sv.id}')">
  <input type="radio" ${s.serviceId===sv.id?'checked':''} style="margin:0;flex-shrink:0">
  <div style="flex:1">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span style="font-weight:800;font-size:12px">${sv.name}</span>
      <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:${PC[sv.processPattern]}20;color:${PC[sv.processPattern]}">${PL[sv.processPattern]}</span>
      ${sv.budgetLinked?'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#DBEAFE;color:#1E40AF;font-weight:700">💳 예산</span>':'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#F3F4F6;color:#6B7280;font-weight:700">📝 이력</span>'}
      ${sv.applyMode==='reimbursement'?'<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#FEF3C7;color:#92400E;font-weight:700">🧾 후정산</span>':''}
    </div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:1px">${sv.desc}</div>
  </div>
</label>`).join('')}
</div>`;
    })()}

    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      ${(() => {
        const isInd = s.purpose?.id === 'external_personal';
        const ok = isInd
          ? (s.budgetChoice && (s.budgetChoice !== 'rnd' || s.planId))
          : !!s.serviceId;
        return `<button onclick="applyNext()" ${!ok ? 'disabled' : ''}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${!ok ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">
          다음 →
        </button>`;
      })()}
    </div>
  </div>


  <!-- Step 3: 교육유형 선택 -->
  <div class="card p-8 ${s.step === 3 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육유형 선택</h2>
    ${(() => {
      // 예산별 허용 교육유형 ID 맵
      const SUBTYPE_FILTER_MAP = {
        'hae-edu':  ['edu_elearning','edu_class','edu_live','acad_conf','dev_lang','dev_cert'],
        'hae-team': ['edu_elearning','edu_class','edu_live','acad_conf','dev_lang','dev_cert'],
        'none-hae': ['edu_elearning','edu_class','edu_live','acad_conf','etc_team'],
      };
      const hasHaeEdu2 = (currentPersona.allowedAccounts || []).includes('HAE-EDU');
      const isHscExtBudget = (currentPersona.allowedAccounts || []).includes('HSC-EXT') && s.budgetChoice === 'general';
      const HSC_EXT_ALLOWED = ['edu_elearning','edu_class','edu_live','acad_conf'];

      // 필터 키 결정
      let filterKey = null;
      if (s.budgetChoice === 'hae-edu') filterKey = 'hae-edu';
      else if (s.budgetChoice === 'hae-team') filterKey = 'hae-team';
      else if (s.budgetChoice === 'none' && hasHaeEdu2) filterKey = 'none-hae';
      else if (isHscExtBudget) filterKey = 'hsc-ext';

      const allowedIds = filterKey === 'hsc-ext' ? HSC_EXT_ALLOWED : SUBTYPE_FILTER_MAP[filterKey] || null;

      const subtypes = s.purpose?.subtypes
        ? (allowedIds
            ? s.purpose.subtypes
                .map(g => ({ ...g, items: g.items.filter(i => allowedIds.includes(i.id)) }))
                .filter(g => g.items.length > 0)
            : s.purpose.subtypes)
        : null;
      if (!subtypes) return '<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3"><span class="text-accent text-xl">✓</span> 표준 프로세스가 자동 적용됩니다.</div>';
      return subtypes.map(g => `
    <div class="mb-7">
      <div class="mb-3">
        <div class="text-xs font-black text-gray-700 flex items-center gap-2 mb-0.5"><span class="w-1.5 h-1.5 bg-accent rounded-full inline-block"></span>${g.group}</div>
        ${g.desc ? `<div class="text-[11px] text-gray-400 pl-3.5">${g.desc}</div>` : ''}
      </div>
      <div class="grid ${g.items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3">
        ${g.items.map(i => `
        <button onclick="applyState.subType='${i.id}';renderApply()" class="p-4 rounded-xl border-2 text-sm font-bold text-left leading-snug transition ${s.subType === i.id ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'border-gray-200 text-gray-700 hover:border-accent hover:text-accent'}">${i.label}</button>`).join('')}
      </div>
    </div>`).join('');
    })()}
    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <button onclick="applyNext()" ${s.purpose?.subtypes && !s.subType ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose?.subtypes && !s.subType ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- Step 4: Detail -->
  <div class="card p-8 ${s.step === 4 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-4">04. 세부 정보 입력</h2>

    <!-- 이전 단계 선택 요약 배너 -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> 신청 요약
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Step 1 요약 -->
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">① 교육 목적</div>
          <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ''} ${s.purpose?.label || '—'}</div>
          ${s.subType ? (() => { const g = s.purpose?.subtypes?.flatMap(g => g.items).find(i => i.id === s.subType); return g ? `<div class="text-[11px] text-gray-500 mt-0.5">└ ${g.label}</div>` : ''; })() : ''}
        </div>
        <!-- Step 2 요약 -->
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">② 예산</div>
          ${s.useBudget === false
      ? '<div class="font-black text-sm text-gray-500">📝 단순 이력 등록</div>'
      : `<div class="font-black text-sm text-gray-900">${curBudget ? curBudget.name : '—'}</div>
               ${s.planId ? `<div class="text-[11px] text-blue-500 mt-0.5">🔗 단일 계획 연동됨</div>` : ''}
               ${s.planIds?.length ? `<div class="text-[11px] text-violet-500 mt-0.5">🔗 복수 계획 연동됨 (${s.planIds.length}건)</div>` : ''}`
    }
        </div>
        <!-- Step 3 요약 -->
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">③ 교육유형</div>
          ${s.subType
      ? (() => { const item = s.purpose?.subtypes?.flatMap(g => g.items).find(i => i.id === s.subType); const grp = s.purpose?.subtypes?.find(g => g.items.some(i => i.id === s.subType)); return `<div class="font-black text-sm text-gray-900">${item?.label || '—'}</div><div class="text-[11px] text-gray-400 mt-0.5">${grp?.group || ''}</div>`; })()
      : '<div class="text-sm text-gray-400">—</div>'
    }
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <!-- Region toggle -->
      <div class="inline-flex bg-gray-100 rounded-xl p-1">
        <button onclick="applyState.region='domestic';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'domestic' ? 'bg-white text-accent shadow' : ' text-gray-500'}">🗺 국내</button>
        <button onclick="applyState.region='overseas';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'overseas' ? 'bg-white text-accent shadow' : 'text-gray-500'}">🌏 해외</button>
      </div>
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">과정명 <span class="text-red-500">*</span></label>
        <input type="text" value="${s.title}" oninput="applyState.title=this.value" placeholder="교육/세미나/자격증 등 공식 명칭" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>
      <div class="grid grid-cols-2 gap-5">
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">시작일</label>
          <input type="date" value="${s.startDate}" oninput="applyState.startDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">종료일</label>
          <input type="date" value="${s.endDate}" oninput="applyState.endDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
      </div>
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">총 학습시간 (H)</label>
        <input type="number" value="${s.hours}" oninput="applyState.hours=this.value" placeholder="0" class="w-40 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">학습 내용 <span class="text-red-500">*</span></label>
        <textarea oninput="applyState.content=this.value" rows="3" placeholder="학습 목표, 주요 커리큘럼 및 활용 방안을 입력하세요." class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
      </div>

      <!-- Cost section -->
      ${s.useBudget === true ? `
      <div class="border-t border-gray-100 pt-5">
        ${curBudget?.account === '연구투자' ? `
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">R&D 총 투자금액</label>
        <div class="relative max-w-sm">
          <input type="number" value="${s.rndTotal}" oninput="applyState.rndTotal=this.value;renderApply()" class="w-full bg-blue-50 border-2 border-blue-200 rounded-xl px-5 py-5 font-black text-2xl text-brand focus:border-accent focus:bg-white transition pr-16"/>
          <span class="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-accent">원</span>
        </div>` : `
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-black text-gray-700 uppercase tracking-wide">📋 세부산출근거</h4>
          <button onclick="addExpRow()" class="text-xs font-black text-accent border-2 border-accent px-4 py-2 rounded-xl hover:bg-blue-50 transition">+ 항목 추가</button>
        </div>
        <div class="rounded-2xl border border-gray-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50"><tr class="text-xs font-black text-gray-500 uppercase">
              <th class="px-4 py-3 text-left">항목</th><th class="px-4 py-3 text-right">단가</th><th class="px-4 py-3 text-center w-20">수량</th><th class="px-4 py-3 text-right">소계</th><th class="px-4 py-3 text-left">비고</th><th class="px-4 py-3 w-10"></th>
            </tr></thead>
            <tbody class="divide-y divide-gray-100">
              ${s.expenses.map((e, i) => `
              <tr>
                <td class="px-4 py-3"><select onchange="s.expenses[${i}].type=this.value" class="bg-transparent text-sm font-bold text-gray-700 outline-none"><option ${e.type === '교육비/등록비' ? 'selected' : ''}>교육비/등록비</option><option ${e.type === '교보재비' ? 'selected' : ''}>교보재비</option><option ${e.type === '시험응시료' ? 'selected' : ''}>시험응시료</option>${s.region === 'overseas' ? '<option>항공료</option><option>숙박비</option>' : ''}</select></td>
                <td class="px-4 py-3"><input type="number" value="${e.price}" oninput="applyState.expenses[${i}].price=this.value;renderApply()" class="w-full text-right bg-transparent font-black text-gray-900 outline-none text-base"/></td>
                <td class="px-4 py-3"><input type="number" value="${e.qty}" oninput="applyState.expenses[${i}].qty=this.value;renderApply()" class="w-16 text-center bg-gray-50 border border-gray-200 rounded-lg py-1 font-black text-accent outline-none"/></td>
                <td class="px-4 py-3 text-right font-black text-gray-900">${fmt(Number(e.price) * Number(e.qty))}</td>
                <td class="px-4 py-3"><input type="text" value="${e.note || ''}" oninput="applyState.expenses[${i}].note=this.value" placeholder="비고" class="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-accent transition min-w-[120px]"/></td>
                <td class="px-4 py-3 text-center"><button onclick="removeExpRow(${i})" class="text-gray-300 hover:text-red-500 transition text-lg">✕</button></td>
              </tr>`).join('')}
            </tbody>
            <tfoot class="bg-brand/5 border-t-2 border-brand">
              <tr><td colspan="4" class="px-4 py-3 font-black text-gray-500 text-xs uppercase">합계</td><td class="px-4 py-3 text-right font-black text-2xl text-accent">${fmt(totalExp)}원</td><td></td></tr>
            </tfoot>
          </table>
        </div>`}
      </div>

      <!-- Final summary card -->
      <div class="mt-6 bg-gray-950 rounded-3xl p-8 text-white relative overflow-hidden">
        <div class="absolute top-0 right-0 text-8xl opacity-5 translate-x-6 -translate-y-3">🎓</div>
        <div class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">${s.region === 'overseas' ? '🌏 해외' : '🗺 국내'} 최종 집행 금액</div>
        <div class="text-5xl font-black tracking-tight mb-4">${fmt(totalAmt)}<span class="text-lg text-gray-500 ml-2 font-normal">원</span></div>
        ${curBudget ? `
        <div class="flex items-center gap-3 ${over ? 'text-red-400' : 'text-green-400'}">
          <span class="text-lg">${over ? '⚠️' : '✅'}</span>
          <span class="text-sm font-black">${over ? '잔액 부족 – 집행 불가' : '잔액 내 집행 가능'}</span>
        </div>
        <div class="text-xs text-gray-500 mt-1">${curBudget.name} 잔액: ${fmt(curBudget.balance - curBudget.used)}원</div>` : ''}
      </div>` : ''}
    </div>

    <div class="flex justify-between mt-8 border-t border-gray-100 pt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <div class="flex gap-3">
        <button class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">임시저장</button>
        <button onclick="submitApply()" ${over ? 'disabled' : ''}
          class="px-10 py-3 rounded-xl font-black text-sm transition shadow-lg ${over ? 'bg-gray-300 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900'}">
          신청서 제출 →
        </button>
      </div>
    </div>
  </div>
  
  ${s.showMultiPlanModal ? `
  <div class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center fade-in">
    <div class="bg-white rounded-2xl w-[500px] shadow-2xl p-6">
      <h3 class="text-lg font-black mb-4">운영 예산: 복수 계획 선택</h3>
      <div class="space-y-2 max-h-[300px] overflow-y-auto mb-4 p-1">
        ${operPlans.map(p => `
        <label class="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition ${s.planIds?.includes(p.id) ? 'border-violet-500 bg-violet-50' : 'border-gray-200'}">
          <input type="checkbox" value="${p.id}" ${s.planIds?.includes(p.id) ? 'checked' : ''} onchange="toggleOperPlan('${p.id}')" class="w-4 h-4 text-violet-600 rounded">
          <div>
            <div class="font-bold text-sm text-gray-900">[${p.id}] ${p.title}</div>
            <div class="text-xs text-gray-500">예산 편성금액: ${fmt(p.amount)}원</div>
          </div>
        </label>
        `).join('')}
      </div>
      <div class="flex justify-end gap-2">
        <button onclick="applyState.showMultiPlanModal=false;renderApply()" class="px-6 py-2 bg-brand text-white font-bold rounded-xl hover:bg-blue-900 transition">확인</button>
      </div>
    </div>
  </div>` : ''}
</div>`;
}

// ─── APPLY FORM HELPERS ─────────────────────────────────────────────────────

function selectPurpose(id) {
  applyState.purpose = PURPOSES.find(p => p.id === id);
  applyState.subType = '';
  applyState.budgetId = '';
  applyState.planId = '';
  applyState.planIds = [];
  applyState.useBudget = null;
  applyState.hasPlan = null;
  renderApply();
}
function setUseBudget(v) { applyState.useBudget = v; applyState.budgetId = ''; applyState.planId = ''; applyState.planIds = []; applyState.hasPlan = null; renderApply(); }
function setHasPlan(v) { applyState.hasPlan = v; applyState.planId = ''; applyState.planIds = []; applyState.budgetId = ''; renderApply(); }
function selectPlan(id) { applyState.planId = id; const pl = MOCK_PLANS.find(p => p.id === id); if (pl) { applyState.budgetId = pl.budgetId; } renderApply(); }
function toggleOperPlan(id) {
  if (!applyState.planIds) applyState.planIds = [];
  const idx = applyState.planIds.indexOf(id);
  if (idx > -1) applyState.planIds.splice(idx, 1);
  else applyState.planIds.push(id);
  renderApply();
}
function applyNext() { applyState.step = Math.min(applyState.step + 1, 4); renderApply(); }
function applyPrev() { applyState.step = Math.max(applyState.step - 1, 1); renderApply(); }
function addExpRow() { applyState.expenses.push({ id: Date.now(), type: '교육비/등록비', price: 0, qty: 1 }); renderApply(); }
function removeExpRow(i) { applyState.expenses.splice(i, 1); renderApply(); }
function submitApply() {
  const svc = typeof SERVICE_DEFINITIONS !== 'undefined' && applyState.serviceId
    ? SERVICE_DEFINITIONS.find(sv => sv.id === applyState.serviceId) : null;
  const modeLabel = svc?.applyMode === 'reimbursement' ? '후정산형 신청' : '교육 신청';
  const budgetNote = svc?.budgetLinked === false ? '\n\n📝 무예산 이력 등록으로 예산 잔액에는 영향을 주지 않습니다.'
    : svc?.applyMode === 'reimbursement' ? '\n\n🧾 후정산 신청이 승인되면 예산에서 즉시 차감됩니다.'
    : '\n\n💳 승인 시 예산이 가점유 처리됩니다.';
  alert(`✅ ${modeLabel}서가 성공적으로 제출되었습니다.${budgetNote}\n\n담당자 검토 후 알림이 발송됩니다.`);
  applyState = resetApplyState();
  navigate('history');
}

function selectService(id) {
  const svc = typeof SERVICE_DEFINITIONS !== 'undefined'
    ? SERVICE_DEFINITIONS.find(sv => sv.id === id) : null;
  applyState.serviceId = id;
  applyState.applyMode = svc ? svc.applyMode : null;
  applyState.useBudget = svc ? svc.budgetLinked : null;
  applyState.budgetId  = '';
  applyState.planId    = '';
  applyState.planIds   = [];
  renderApply();
}

// ─── 개인직무 사외학습 전용: 예산 선택 ─────────────────────────────────────────
function selectBudgetChoice(choice) {
  applyState.budgetChoice = choice;
  applyState.budgetId  = '';
  applyState.planId    = '';
  applyState.planIds   = [];
  applyState.serviceId = '';
  // applyMode 결정: HAE-EDU/TEAM → holding(신청→결과), HSC-EXT → holding, 일반 general → reimbursement(후정산)
  const isHscExtMode = (currentPersona.allowedAccounts || []).includes('HSC-EXT');
  const isHaeMode    = ['hae-edu','hae-team'].includes(choice);
  applyState.applyMode = choice === 'none' ? null
    : (choice === 'rnd' || isHscExtMode || isHaeMode) ? 'holding' : 'reimbursement';
  applyState.useBudget = choice !== 'none';
  // budgetId 자동 연결 (HAE-EDU → b_hae01, HAE-TEAM → b_hae02, 단일 예산 → [0])
  if (choice === 'hae-edu') {
    const b = (currentPersona.budgets||[]).find(b => b.account === '전사교육');
    if (b) applyState.budgetId = b.id;
  } else if (choice === 'hae-team') {
    const b = (currentPersona.budgets||[]).find(b => b.account === '팀/프로젝트');
    if (b) applyState.budgetId = b.id;
  } else if (choice === 'general' && (currentPersona.budgets || []).length >= 1) {
    applyState.budgetId = currentPersona.budgets[0].id;
  }
  renderApply();
}

function selectRndPlan(id) {
  applyState.planId = id;
  const pl = MOCK_PLANS.find(p => p.id === id);
  if (pl) applyState.budgetId = pl.budgetId;
  renderApply();
}

// R&D 교육계획 선택 UI (Picker)
function _renderRndPlanPicker(s) {
  const rndPlans = MOCK_PLANS.filter(p => p.account === '연구투자' || (p.budgetId||'').includes('RND'));
  if (rndPlans.length === 0) {
    return '<div style="margin-top:16px;padding:16px 20px;border-radius:12px;background:#FEF2F2;border:1.5px solid #FECACA">'
      + '<div style="font-size:13px;font-weight:900;color:#EF4444;margin-bottom:4px">⚠️ 연동 가능한 R&D 교육계획이 없습니다</div>'
      + '<div style="font-size:12px;color:#9CA3AF">R&D 교육예산을 사용하려면 사전에 교육계획을 수립하고 승인을 받아야 합니다.</div>'
      + '<div style="margin-top:10px"><a href="#" onclick="navigate(\'plans\');return false" style="font-size:12px;font-weight:900;color:#7C3AED;text-decoration:underline">→ 교육계획 수립 바로가기</a></div>'
      + '</div>';
  }
  let html = '<div style="margin-top:16px;padding:16px 20px;border-radius:12px;background:#F5F3FF;border:1.5px solid #DDD6FE">'
    + '<div style="font-size:12px;font-weight:900;color:#7C3AED;margin-bottom:10px">🔬 승인된 R&D 교육계획 선택</div>'
    + '<div style="display:grid;gap:8px">';
  rndPlans.forEach(p => {
    const active = s.planId === p.id;
    html += '<label onclick="selectRndPlan(\'' + p.id + '\')" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;'
      + 'border:1.5px solid ' + (active ? '#7C3AED' : '#E5E7EB') + ';background:' + (active ? '#F5F3FF' : 'white') + ';cursor:pointer">'
      + '<input type="radio" ' + (active ? 'checked' : '') + ' style="flex-shrink:0">'
      + '<div style="flex:1">'
      + '<div style="font-size:12px;font-weight:800;color:' + (active ? '#7C3AED' : '#111827') + '">' + p.title + '</div>'
      + '<div style="font-size:10px;color:#9CA3AF;margin-top:2px">예산: ' + (p.amount||0).toLocaleString() + '원 &nbsp;·&nbsp; 잔액: ' + ((p.amount||0)-(p.used||0)).toLocaleString() + '원</div>'
      + '</div>'
      + (active ? '<span style="font-size:14px;color:#7C3AED;font-weight:900">✓</span>' : '')
      + '</label>';
  });
  html += '</div>'
    + '<div style="margin-top:10px;padding:10px 14px;background:#EDE9FE;border-radius:8px;font-size:11px;color:#5B21B6;font-weight:700">'
    + '💡 교육계획에 이미 교육 유형이 포함되어 있어 다음 단계에서 유형을 별도로 선택하지 않아도 됩니다.'
    + '</div></div>';
  return html;
}

// ─── Step 이동 (R&D 시 교육유형 단계 건너뜀) ──────────────────────────────────
function applyNext() {
  if (applyState.step === 2 && applyState.budgetChoice === 'rnd') {
    applyState.step = 4; // R&D: 교육유형 건너뜀 → 바로 세부정보
  } else {
    applyState.step = Math.min(applyState.step + 1, 4);
  }
  renderApply();
}
function applyPrev() {
  if (applyState.step === 4 && applyState.budgetChoice === 'rnd') {
    applyState.step = 2; // R&D에서 뒤로 → Step2로 복귀
  } else {
    applyState.step = Math.max(applyState.step - 1, 1);
  }
  renderApply();
}

