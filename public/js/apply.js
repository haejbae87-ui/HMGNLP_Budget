// ─── APPLY (4-step stepper) ─────────────────────────────────────────────────

function renderApply() {
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

    <!-- 교육담당자 섹션 (고정 프로세스 페르소나는 숨김) -->
    ${!isFixedProcess ? `
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 tracking-wider">🛠 교육담당자</span>
        <span class="text-[11px] text-gray-400">교육과정을 기획·운영하는 담당자</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${getPersonaPurposes(currentPersona).filter(p => p.id !== 'external_personal').map(p => `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all hover:border-violet-400 ${s.purpose?.id === p.id ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-gray-200 bg-gray-50/50'}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${s.purpose?.id === p.id ? 'text-violet-600' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>` : ''}

    <div class="flex justify-end mt-6">
      <button onclick="applyNext()" ${!s.purpose ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? 'bg-brand text-white hover:bg-blue-900 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- Step 2: Budget -->
  <div class="card p-8 ${s.step === 2 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-2">02. 서비스 선택 및 예산</h2>

    <!-- 서비스 선택 -->
    <div class="mb-5">
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">어떤 서비스로 신청하시나요?</label>
      ${(() => {
        const svcs = (typeof SERVICE_DEFINITIONS !== 'undefined'
          ? SERVICE_DEFINITIONS.filter(sv => sv.tenantId === currentPersona.tenantId && sv.status === 'active')
          : []);
        const patternColor = { A:'#7C3AED', B:'#1D4ED8', C:'#059669' };
        const patternLabel = { A:'패턴A', B:'패턴B', C:'패턴C' };
        return `<div style="display:grid;gap:6px">
          ${svcs.map(sv => `
          <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;
                         border:2px solid ${s.serviceId===sv.id ? patternColor[sv.processPattern] : '#E5E7EB'};
                         background:${s.serviceId===sv.id ? patternColor[sv.processPattern]+'12' : 'white'};
                         cursor:pointer"
                 onclick="selectService('${sv.id}')">
            <input type="radio" ${s.serviceId===sv.id?'checked':''} style="margin:0;flex-shrink:0">
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-weight:800;font-size:12px;color:${s.serviceId===sv.id?patternColor[sv.processPattern]:'#374151'}">${sv.name}</span>
                <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;
                             background:${patternColor[sv.processPattern]}20;color:${patternColor[sv.processPattern]}">${patternLabel[sv.processPattern]}</span>
                ${sv.budgetLinked ? '<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#DBEAFE;color:#1E40AF;font-weight:700">💳 예산</span>'
                                  : '<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#F3F4F6;color:#6B7280;font-weight:700">📝 이력</span>'}
                ${sv.applyMode==='reimbursement' ? '<span style="font-size:9px;padding:1px 5px;border-radius:4px;background:#FEF3C7;color:#92400E;font-weight:700">🧾 후정산</span>' : ''}
              </div>
              <div style="font-size:11px;color:#9CA3AF;margin-top:1px">${sv.desc}</div>
            </div>
          </label>`).join('')}
        </div>`;
      })()}
    </div>

    <!-- 서비스 선택 후: 패턴별 분기 -->
    ${s.serviceId ? (() => {
      const svc = typeof SERVICE_DEFINITIONS !== 'undefined'
        ? SERVICE_DEFINITIONS.find(sv => sv.id === s.serviceId) : null;
      if (!svc) return '';

      // 패턴 A (계획-신청-결과, 홀딩형)
      if (svc.processPattern === 'A') {
        return `
        <div class="border-t border-dashed border-purple-200 pt-5 mt-2">
          <div class="flex items-center gap-2 mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200">
            <span class="text-lg">📊</span>
            <div>
              <div class="font-black text-sm text-purple-700">패턴 A: 계획 → 신청 → 결과</div>
              <div class="text-xs text-purple-500">사전에 수립된 교육계획을 선택하고 예산을 가점유합니다.</div>
            </div>
          </div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">예산 계정 선택</label>
          <select onchange="applyState.budgetId=this.value;applyState.planId='';renderApply()"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-accent bg-white">
            <option value="">-- 예산 계정 선택 --</option>
            ${(s.purpose ? getPersonaBudgets(currentPersona, s.purpose.accounts) : currentPersona.budgets)
              .map(b => `<option value="${b.id}" ${s.budgetId===b.id?'selected':''}>${b.name} · 잔액 ${fmt(b.balance-b.used)}원</option>`).join('')}
          </select>
          ${availBudgets.find(b=>b.id===s.budgetId) ? `
          <div class="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div class="text-xs font-black text-blue-600 mb-1">💡 교육계획 연동 (선택사항)</div>
            <select onchange="selectPlan(this.value)" class="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 font-bold text-sm">
              <option value="">-- 연계할 교육계획 선택 --</option>
              ${MOCK_PLANS.map(p=>`<option value="${p.id}" ${s.planId===p.id?'selected':''}>[${p.id}] ${p.title} (${fmt(p.amount)}원)</option>`).join('')}
            </select>
          </div>` : ''}
        </div>`;
      }

      // 패턴 B/C + 후정산형 (reimbursement)
      if (svc.budgetLinked && svc.applyMode === 'reimbursement') {
        return `
        <div class="border-t border-dashed border-yellow-200 pt-5 mt-2">
          <div class="flex items-center gap-2 mb-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
            <span class="text-lg">🧾</span>
            <div>
              <div class="font-black text-sm text-yellow-700">선지출 후정산형</div>
              <div class="text-xs text-yellow-600">학습자가 개인 선지불 후 영수증을 첨부하여 신청합니다.<br>승인 완료 즉시 예산이 차감되며 별도 결과 보고는 없습니다.</div>
            </div>
          </div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">예산 계정 선택</label>
          <select onchange="applyState.budgetId=this.value;renderApply()"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-accent bg-white">
            <option value="">-- 예산 계정 선택 --</option>
            ${currentPersona.budgets.map(b=>`<option value="${b.id}" ${s.budgetId===b.id?'selected':''}>${b.name} · 잔액 ${fmt(b.balance-b.used)}원</option>`).join('')}
          </select>
        </div>`;
      }

      // 패턴 B 홀딩형
      if (svc.budgetLinked && svc.applyMode === 'holding') {
        return `
        <div class="border-t border-dashed border-blue-200 pt-5 mt-2">
          <div class="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <span class="text-lg">💳</span>
            <div>
              <div class="font-black text-sm text-blue-700">패턴 B: 신청 → 결과 (가점유형)</div>
              <div class="text-xs text-blue-500">신청 승인 시 예산 가점유 → 교육 완료 후 결과 등록 시 정산합니다.</div>
            </div>
          </div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">예산 계정 선택</label>
          <select onchange="applyState.budgetId=this.value;renderApply()"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-accent bg-white">
            <option value="">-- 예산 계정 선택 --</option>
            ${currentPersona.budgets.map(b=>`<option value="${b.id}" ${s.budgetId===b.id?'selected':''}>${b.name} · 잔액 ${fmt(b.balance-b.used)}원</option>`).join('')}
          </select>
        </div>`;
      }

      // 무예산 이력 전용
      return `
      <div class="border-t border-dashed border-gray-200 pt-5 mt-2">
        <div class="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <span class="text-2xl">📝</span>
          <div>
            <div class="font-black text-sm text-gray-700">무예산 학습이력 등록</div>
            <div class="text-xs text-gray-500 mt-1">예산 집행 없이 학습 이력만 등록합니다.<br>자비 학습·무료 세미나 등에 활용하세요. 예산 잔액에 영향을 주지 않습니다.</div>
          </div>
        </div>
      </div>`;
    })() : ''}

    <div class="flex justify-between mt-6">
      <button onclick="applyPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <button onclick="applyNext()" ${!s.serviceId ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!s.serviceId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">
        다음 →
      </button>
    </div>
  </div>


  <!-- Step 3: 교육유형 선택 -->
  <div class="card p-8 ${s.step === 3 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육유형 선택</h2>
    ${s.purpose?.subtypes ? s.purpose.subtypes.map(g => `
    <div class="mb-7">
      <div class="mb-3">
        <div class="text-xs font-black text-gray-700 flex items-center gap-2 mb-0.5"><span class="w-1.5 h-1.5 bg-accent rounded-full inline-block"></span>${g.group}</div>
        ${g.desc ? `<div class="text-[11px] text-gray-400 pl-3.5">${g.desc}</div>` : ''}
      </div>
      <div class="grid ${g.items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-3">
        ${g.items.map(i => `
        <button onclick="applyState.subType='${i.id}';renderApply()" class="p-4 rounded-xl border-2 text-sm font-bold text-left leading-snug transition ${s.subType === i.id ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'border-gray-200 text-gray-700 hover:border-accent hover:text-accent'}">${i.label}</button>`).join('')}
      </div>
    </div>`).join('') : '<div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3"><span class="text-accent text-xl">✓</span> 표준 프로세스가 자동 적용됩니다.</div>'}
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

