// ─── PLANS (교육계획) ──────────────────────────────────────────────────────

// 교육계획 수립 상태
let planState = null;

function resetPlanState() {
  return {
    step: 1,
    purpose: null,
    subType: '',
    budgetId: '',
    region: 'domestic',
    title: '',
    startDate: '',
    endDate: '',
    amount: '',
    content: '',
    calcGrounds: [],          // [{ itemId, qty, unitPrice, total, limitOverrideReason }]
    hardLimitViolated: false,
  };
}

function renderPlans() {
  document.getElementById('page-plans').innerHTML = `
<div class="max-w-5xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육계획</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육계획</h1>
      <p class="text-gray-500 text-sm mt-1">교육 신청 전 교육계획을 먼저 수립하세요.</p>
    </div>
    <button onclick="startPlanWizard()" class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
      ＋ 교육계획 수립
    </button>
  </div>

  <!-- 계획 수립 위저드 (숨김 상태) -->
  <div id="plan-wizard" class="hidden"></div>

  <!-- Existing plans list -->
  <div class="card overflow-hidden">
    <div class="p-6 border-b border-gray-100 flex items-center justify-between">
      <h3 class="font-black text-sm text-gray-700 uppercase tracking-wider">등록된 교육계획</h3>
      <span class="text-xs text-gray-400 font-bold">${MOCK_PLANS.length}건</span>
    </div>
    <table class="w-full text-sm">
      <thead class="bg-gray-50"><tr class="text-xs font-black text-gray-500 uppercase">
        <th class="px-6 py-3 text-left">계획명</th>
        <th class="px-4 py-3 text-left">예산 계정</th>
        <th class="px-4 py-3 text-right">계획액</th>
        <th class="px-4 py-3 text-center">교육신청</th>
        <th class="px-4 py-3 text-center">상태</th>
      </tr></thead>
      <tbody class="divide-y divide-gray-50">
        ${MOCK_PLANS.map(p => `
        <tr class="hover:bg-gray-50 transition">
          <td class="px-6 py-4">
            <div class="font-bold text-gray-900">${p.title}</div>
            <div class="text-[10px] text-gray-400">${p.id}</div>
          </td>
          <td class="px-4 py-4"><span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">${p.account}</span></td>
          <td class="px-4 py-4 text-right font-black text-gray-900">${fmt(p.amount)}원</td>
          <td class="px-4 py-4 text-center">
            <button onclick="startApplyFromPlan('${p.id}')" class="text-xs font-black text-white bg-accent px-4 py-1.5 rounded-lg hover:bg-blue-600 transition">교육신청 →</button>
          </td>
          <td class="px-4 py-4 text-center"><span class="badge bg-green-100 text-green-700">승인완료</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

// ─── PLAN WIZARD ─────────────────────────────────────────────────────────────

function startPlanWizard() {
  planState = resetPlanState();
  renderPlanWizard();
  const wizard = document.getElementById('plan-wizard');
  wizard.classList.remove('hidden');
  setTimeout(() => wizard.scrollIntoView({ behavior: 'smooth' }), 50);
}

function closePlanWizard() {
  planState = null;
  document.getElementById('plan-wizard').classList.add('hidden');
}

function renderPlanWizard() {
  const s = planState;
  if (!s) return;

  const isFixedProcess = isFixedPlanProcess(currentPersona);
  const isRndPersona = currentPersona.role === 'learner' && (currentPersona.allowedAccounts || []).includes('HMC-RND');

  const availBudgets = s.purpose
    ? getPersonaBudgets(currentPersona, s.purpose.accounts)
    : [];
  const curBudget = availBudgets.find(b => b.id === s.budgetId) || null;

  // Step 3 다음 버튼 조건
  const step3CanNext = s.budgetId !== '';

  document.getElementById('plan-wizard').innerHTML = `
<div class="card p-8 fade-in">
  <!-- 헤더 -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">교육계획 수립</div>
      <h2 class="text-xl font-black text-gray-900">새 교육계획 작성</h2>
    </div>
    <button onclick="closePlanWizard()" class="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none transition">✕</button>
  </div>

  <!-- Stepper -->
  <div class="flex items-center gap-2 mb-8 pb-6 border-b border-gray-100">
    ${[1, 2, 3, 4].map(n => `
    <div class="step-item flex items-center gap-2 ${s.step > n ? 'done' : s.step === n ? 'active' : ''}">
      <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? '✓' : n}</div>
      <span class="text-xs font-bold ${s.step === n ? 'text-brand' : 'text-gray-400'} hidden sm:block">${['목적 선택', '예산 선택', '교육유형', '세부 정보'][n - 1]}</span>
      ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ''}
    </div>`).join('')}
  </div>

  <!-- ── Step 1: 교육 목적 ── -->
  <div class="${s.step === 1 ? '' : 'hidden'}">
    <h3 class="text-base font-black text-gray-800 mb-5">01. 교육 목적 선택</h3>

    ${isFixedProcess ? `
    <!-- HAE 고정 프로세스 안내 -->
    <div class="mb-5 p-4 bg-purple-50 border-2 border-purple-200 rounded-2xl flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">🔒</span>
      <div>
        <div class="font-black text-purple-700 text-sm mb-1">${currentPersona.company} 고정 프로세스 계획 수립</div>
        <p class="text-xs text-purple-500 leading-relaxed">개인직무 사외학습 한정: 참가계정 및 자격증계정에 한하여 계획 수립 후 신청하세요.</p>
      </div>
    </div>` : ''}

    ${isRndPersona ? `
    <!-- 연구직군만: 학습자(개인 직무 사외학습) 섹션 -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 tracking-wider">👤 학습자</span>
        <span class="text-[11px] text-gray-400">본인이 직접 학습에 참여하는 경우</span>
      </div>
      <div class="grid grid-cols-1 gap-3">
        ${PURPOSES.filter(p => p.id === 'external_personal').map(p => `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all hover:border-accent ${s.purpose?.id === p.id ? 'border-accent bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${s.purpose?.id === p.id ? 'text-accent' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>` : isFixedProcess ? `
    <!-- HAE 고정 프로세스: external_personal 전용 -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-100 text-purple-600 tracking-wider">👤 개인직무 학습자</span>
        <span class="text-[11px] text-gray-400">개인직무 사외학습에 한정된 계획을 수립합니다</span>
      </div>
      <div class="grid grid-cols-1 gap-3">
        ${getPersonaPurposes(currentPersona).map(p => `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all hover:border-purple-400 ${s.purpose?.id === p.id ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-gray-200 bg-white'}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${s.purpose?.id === p.id ? 'text-purple-600' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>` : ''}

    ${!isRndPersona && !isFixedProcess ? `
    <!-- 일반 학습자/실무자: 전체 목적 표시 -->
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 tracking-wider">🛠 교육담당자</span>
        <span class="text-[11px] text-gray-400">교육과정을 기획·운영하는 담당자</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        ${getPersonaPurposes(currentPersona).filter(p => p.id !== 'external_personal').map(p => `
        <button onclick="selectPlanPurpose('${p.id}')" class="p-5 rounded-2xl border-2 text-left transition-all hover:border-violet-400 ${s.purpose?.id === p.id ? 'border-violet-500 bg-violet-50 shadow-lg' : 'border-gray-200 bg-gray-50/50'}">
          <div class="text-2xl mb-2">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-0.5 ${s.purpose?.id === p.id ? 'text-violet-600' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>` : ''}

    <div class="flex justify-end mt-6 pt-4 border-t border-gray-100">
      <button onclick="planNext()" ${!s.purpose ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${s.purpose ? 'bg-brand text-white hover:bg-blue-900 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- ── Step 2: 예산 선택 ── -->
  <div class="${s.step === 2 ? '' : 'hidden'}">
    <h3 class="text-base font-black text-gray-800 mb-5">02. 예산 계정 선택</h3>
    <div class="space-y-4">
      ${availBudgets.length > 0 ? availBudgets.map(b => `
      <button onclick="planSelectBudget('${b.id}')" class="w-full p-5 rounded-2xl border-2 text-left transition-all hover:border-accent ${s.budgetId === b.id ? 'border-accent bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'}">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-black text-gray-900 text-sm ${s.budgetId === b.id ? 'text-accent' : ''}">${b.name}</div>
            <div class="text-xs text-gray-400 mt-0.5">${b.account} 계정</div>
          </div>
          <div class="text-right">
            <div class="font-black text-base ${b.account === '연구투자' ? 'text-orange-500' : 'text-accent'}">${fmt(b.balance - b.used)}원</div>
            <div class="text-[10px] text-gray-400">잔액</div>
          </div>
        </div>
        ${s.budgetId === b.id ? `
        <div class="h-1.5 bg-gray-200 rounded-full mt-3 overflow-hidden">
          <div class="h-full rounded-full ${b.account === '연구투자' ? 'bg-orange-400' : 'bg-accent'}" style="width:${Math.min((b.used/b.balance)*100,100).toFixed(0)}%"></div>
        </div>
        <div class="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>집행 ${fmt(b.used)}원</span><span>총 ${fmt(b.balance)}원</span>
        </div>` : ''}
      </button>`).join('') : `
      <div class="p-5 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-sm font-bold text-yellow-700">
        ⚠️ 선택한 교육 목적에 사용 가능한 예산 계정이 없습니다.
      </div>`}
    </div>
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <button onclick="planNext()" ${!s.budgetId ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!s.budgetId ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- ── Step 3: 교육유형 선택 ── -->
  <div class="${s.step === 3 ? '' : 'hidden'}">
    <h3 class="text-base font-black text-gray-800 mb-5">03. 교육유형 선택</h3>
    ${(() => {
      // 선택된 예산 계정과 연결된 SERVICE_DEFINITIONS의 eduTypes 수집
      const linked = typeof SERVICE_DEFINITIONS !== 'undefined'
        ? SERVICE_DEFINITIONS.filter(sv =>
            sv.tenantId === currentPersona.tenantId &&
            sv.status === 'active' &&
            sv.linkedAccounts.some(a => curBudget && (a === curBudget.code || a === curBudget.accountCode || a === (curBudget.account === '운영' ? 'HMC-OPS' : curBudget.account === '연구투자' ? 'HMC-RND' : curBudget.account === '참가' ? 'HMC-PART' : '')))
          )
        : [];
      // eduTypes 합집합 (중복 제거)
      const eduTypes = linked.length > 0
        ? [...new Set(linked.flatMap(sv => sv.eduTypes || []))]
        : [...new Set((SERVICE_DEFINITIONS || []).filter(sv => sv.tenantId === currentPersona.tenantId && sv.status === 'active').flatMap(sv => sv.eduTypes || []))];

      if (eduTypes.length === 0) return `
      <div class="p-5 bg-gray-50 rounded-2xl text-sm font-bold text-gray-500 flex items-center gap-3">
        <span class="text-accent text-xl">✓</span> 이 예산 계정은 모든 교육유형에 사용 가능합니다.
      </div>`;

      return `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        ${eduTypes.map(t => `
        <button onclick="planState.eduType='${t}';renderPlanWizard()"
          class="p-4 rounded-xl border-2 text-sm font-bold text-left transition
                 ${s.eduType === t ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'border-gray-200 text-gray-700 hover:border-accent hover:text-accent'}">${t}</button>
        `).join('')}
      </div>`;
    })()}
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <button onclick="planNext()" ${!s.eduType ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!s.eduType ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">
        다음 →
      </button>
    </div>
  </div>

  <!-- ── Step 4: 세부 정보 ── -->
  <div class="${s.step === 4 ? '' : 'hidden'}">
    <h3 class="text-base font-black text-gray-800 mb-5">04. 세부 정보 입력</h3>

    <!-- 선택 요약 배너 -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6">
      <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block"></span> 계획 요약
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">① 교육 목적</div>
          <div class="font-black text-sm text-gray-900">${s.purpose?.icon || ''} ${s.purpose?.label || '—'}</div>
        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">② 예산 계정</div>
          <div class="font-black text-sm ${curBudget?.account === '연구투자' ? 'text-orange-500' : 'text-accent'}">${curBudget?.name || '—'}</div>
          ${curBudget ? `<div class="text-[11px] text-gray-400 mt-0.5">잔액 ${fmt(curBudget.balance - curBudget.used)}원</div>` : ''}
        </div>
        <div class="bg-white rounded-xl px-4 py-3 border border-blue-100">
          <div class="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">③ 교육유형</div>
          <div class="font-black text-sm text-gray-900">${s.eduType || '—'}</div>
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <!-- 국내/해외 -->
      <div class="inline-flex bg-gray-100 rounded-xl p-1">
        <button onclick="planState.region='domestic';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'domestic' ? 'bg-white text-accent shadow' : 'text-gray-500'}">🗺 국내</button>
        <button onclick="planState.region='overseas';renderPlanWizard()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'overseas' ? 'bg-white text-accent shadow' : 'text-gray-500'}">🌏 해외</button>
      </div>

      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획명 <span class="text-red-500">*</span></label>
        <input type="text" value="${s.title}" oninput="planState.title=this.value" placeholder="예) 26년 AI 탐구형 학습 계획" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>
      <div class="grid grid-cols-2 gap-5">
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 시작일</label>
          <input type="date" value="${s.startDate}" oninput="planState.startDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 종료일</label>
          <input type="date" value="${s.endDate}" oninput="planState.endDate=this.value" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
      </div>

      <!-- ── 세부 산출 근거 섹션 ── -->
      ${_renderCalcGroundsSection(s, curBudget)}

      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">예산 계획액
          ${s.calcGrounds && s.calcGrounds.length > 0 ? '<span class="text-xs font-medium text-blue-500 ml-2">(세부 산출 근거 합계 자동 반영)</span>' : ''}
        </label>
        <div class="relative max-w-xs">
          <input type="number" value="${s.amount}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
            class="w-full bg-gray-50 border-2 ${s.hardLimitViolated ? 'border-red-400 bg-red-50' : 'border-gray-100'} rounded-xl px-5 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition pr-12"/>
          <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
        </div>
        ${curBudget && s.amount && Number(s.amount) > (curBudget.balance - curBudget.used)
          ? `<div class="mt-1.5 text-xs font-black text-red-500">⚠️ 예산 잔액(${fmt(curBudget.balance - curBudget.used)}원)을 초과합니다</div>`
          : ''}
        ${s.hardLimitViolated ? `<div class="mt-1.5 text-xs font-black text-red-600">🚫 Hard Limit 초과 항목이 있어 계획을 저장할 수 없습니다. 항목 금액을 수정해주세요.</div>` : ''}
        ${_renderApprovalRouteInfo(s, curBudget)}
      </div>

      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">계획 상세 내용</label>
        <textarea oninput="planState.content=this.value" rows="3" placeholder="업무 활용 방안, 학습 목표 등을 입력하세요." class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
      </div>
    </div>

    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="planPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      <div class="flex gap-3">
        <button onclick="closePlanWizard()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">취소</button>
        <button onclick="savePlan()" ${(!s.title || s.hardLimitViolated) ? 'disabled' : ''}
          class="px-10 py-3 rounded-xl font-black text-sm transition shadow-lg ${(!s.title || s.hardLimitViolated) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900'}">
          계획 저장 ✓
        </button>
      </div>
    </div>
  </div>
</div>`;
}

// ─── PLAN WIZARD HELPERS ─────────────────────────────────────────────────────

function selectPlanPurpose(id) {
  planState.purpose = PURPOSES.find(p => p.id === id);
  planState.subType = '';
  planState.budgetId = '';
  planState.eduType = '';  // 예산 변경 시 교육유형 리 셋
  renderPlanWizard();
}

// 예산 선택 時 교육유형 리셋
function planSelectBudget(id) {
  planState.budgetId = id;
  planState.eduType = '';  // 예산상 달라지면 교육유형도 다시 선택
  renderPlanWizard();
}

function planNext() {
  planState.step = Math.min(planState.step + 1, 4);
  renderPlanWizard();
}

function planPrev() {
  planState.step = Math.max(planState.step - 1, 1);
  renderPlanWizard();
}

function savePlan() {
  const total = _calcGroundsTotal();
  const budgetStr = fmt(total || Number(planState.amount || 0));
  alert(`✅ 교육계획이 상신되었습니다.\n\n계획액: ${budgetStr}원\n\n` +
    `📋 승인 완료 시 이 계획은 '교육 실행의 증빙 근거'로 확정됩니다.\n` +
    `⚠ 예산 할당(본부/팀별 분배)은 별도의 관리자 배분 절차를 통해 진행됩니다.\n\n` +
    `담당자 검토 후 결재선이 자동 구성됩니다.`);
  closePlanWizard();
  renderPlans();
}

// ─── 교육계획 기반 교육신청 연동 ─────────────────────────────────────────────
function startApplyFromPlan(planId) {
  const plan = MOCK_PLANS.find(p => p.id === planId);
  if (!plan) { navigate('apply'); return; }

  // applyState 초기화 후 계획 정보 셋팅
  applyState = resetApplyState();
  applyState.planId = planId;

  // 예산계정 자동 선택
  if (plan.budgetId) applyState.budgetId = plan.budgetId;

  // 목적: 계획에 purpose 없으면 internal_edu(운영) 기본
  const purposeId = plan.purpose || 'internal_edu';
  applyState.purpose = PURPOSES.find(p => p.id === purposeId) || null;

  // 교육신청 페이지로 이동 (폼 모드 직접)
  applyViewMode = 'form';
  // 목적이 설정되었으면 Step 2(예산 선택)로 바로 이동
  if (applyState.purpose) applyState.step = 2;
  navigate('apply');
}

// ─── 세부 산출 근거 (Calculation Grounds) 헬퍼 ──────────────────────────────

// 현재 선택한 예산 계정의 accountCode를 반환
function _getPlanAccountCode(curBudget) {
  if (!curBudget) return null;
  // data.js의 budgets: account 필드로 계정 이름 매핑
  const acctMap = { '참가': 'HMC-PART', '운영': 'HMC-OPS', '연구투자': 'HMC-RND', '기타': 'HMC-ETC' };
  // tenantId 기반으로 매핑
  const tenantId = currentPersona.tenantId || 'HMC';
  const prefixed = {
    'HMC': { '참가': 'HMC-PART', '운영': 'HMC-OPS', '연구투자': 'HMC-RND', '기타': 'HMC-ETC' },
    'KIA': { '참가': 'KIA-PART', '운영': 'KIA-OPS' },
    'HAE': { '참가': 'HAE-PART', '자격증': 'HAE-CERT', '운영': 'HAE-OPS' },
  };
  return (prefixed[tenantId] || acctMap)[curBudget.account] || null;
}

// 세부산출근거 합계 계산
function _calcGroundsTotal() {
  if (!planState.calcGrounds || planState.calcGrounds.length === 0) return 0;
  return planState.calcGrounds.reduce((sum, row) => sum + (row.total || 0), 0);
}

// 세부산출근거 합계를 계획액 필드에 자동 반영 + Hard Limit 체크
function _syncCalcToAmount() {
  const total = _calcGroundsTotal();
  if (total > 0) planState.amount = total;
  _checkHardLimits();
}

// Hard Limit 체크
function _checkHardLimits() {
  let violated = false;
  (planState.calcGrounds || []).forEach(row => {
    const item = typeof CALC_GROUNDS_MASTER !== 'undefined'
      ? CALC_GROUNDS_MASTER.find(g => g.id === row.itemId) : null;
    if (item && item.hardLimit > 0 && row.total > item.hardLimit) violated = true;
  });
  planState.hardLimitViolated = violated;
}

// 세부산출근거 섹션 렌더
function _renderCalcGroundsSection(s, curBudget) {
  // CALC_GROUNDS_MASTER가 없는 경우(bo_data.js 미로드) 무시
  if (typeof CALC_GROUNDS_MASTER === 'undefined' || typeof getCalcGroundsForAccount === 'undefined') return '';

  const accountCode = _getPlanAccountCode(curBudget);
  const items = accountCode ? getCalcGroundsForAccount(accountCode) : [];

  if (items.length === 0) return '';  // 해당 계정에 산출근거 항목 없으면 숨김

  const rows = s.calcGrounds || [];
  const subtotal = rows.reduce((sum, r) => sum + (r.total || 0), 0);

  // Hard Limit 여부 다시 체크
  let hasHard = false;
  rows.forEach(r => {
    const item = items.find(g => g.id === r.itemId);
    if (item && item.hardLimit > 0 && r.total > item.hardLimit) hasHard = true;
  });

  return `
<div class="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
  <div class="flex items-center justify-between mb-4">
    <div>
      <div class="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">📐 세부 산출 근거</div>
      <div class="text-[11px] text-gray-500">항목을 선택하고 수량·단가를 입력하면 합계가 자동 계산됩니다.</div>
    </div>
    <button onclick="_cgAddRow()"
      class="text-xs font-black text-white bg-accent px-4 py-2 rounded-xl hover:bg-blue-600 transition shadow">
      + 항목 추가
    </button>
  </div>

  ${rows.length > 0 ? `
  <!-- 항목 행 테이블 -->
  <div class="bg-white rounded-xl overflow-hidden border border-blue-100 mb-3">
    <table class="w-full text-xs">
      <thead class="bg-blue-50">
        <tr class="text-[10px] font-black text-blue-500 uppercase tracking-wider">
          <th class="px-3 py-2 text-left">항목</th>
          <th class="px-3 py-2 text-right w-16">수량</th>
          <th class="px-3 py-2 text-right w-28">단가 (원)</th>
          <th class="px-3 py-2 text-right w-28">소계 (원)</th>
          <th class="px-3 py-2 text-center w-8"></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, idx) => {
          const item = items.find(g => g.id === row.itemId);
          const isSoftOver = item && item.softLimit > 0 && row.total > item.softLimit;
          const isHardOver = item && item.hardLimit > 0 && row.total > item.hardLimit;
          const rowBg = isHardOver ? '#FEF2F2' : isSoftOver ? '#FFFBEB' : '#fff';
          return `
          <tr style="background:${rowBg};border-top:1px solid #F3F4F6">
            <td class="px-3 py-2">
              <select onchange="_cgUpdateItemId(${idx}, this.value)"
                style="font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px;background:#fff;max-width:180px">
                <option value="">-- 항목 선택 --</option>
                ${items.map(g => `<option value="${g.id}" ${row.itemId === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
              </select>
              ${item ? `<div class="text-[10px] text-gray-400 mt-0.5 pl-1">${item.desc}</div>` : ''}
              ${isSoftOver && !isHardOver ? `
              <div class="mt-1">
                <span style="color:#D97706;font-size:10px;font-weight:800">⚠ Soft Limit(${fmt(item.softLimit)}원) 초과</span>
                <input type="text" placeholder="초과 사유 입력 (필수)"
                  value="${row.limitOverrideReason || ''}"
                  oninput="_cgUpdateReason(${idx}, this.value)"
                  style="display:block;margin-top:2px;font-size:10px;border:1px solid #FDE68A;border-radius:4px;padding:2px 6px;width:100%;box-sizing:border-box">
              </div>` : ''}
              ${isHardOver ? `<span style="color:#DC2626;font-size:10px;font-weight:800;display:block;margin-top:2px">🚫 Hard Limit(${fmt(item.hardLimit)}원) 초과 — 저장 불가</span>` : ''}
            </td>
            <td class="px-3 py-2">
              <input type="number" value="${row.qty}" min="1"
                oninput="_cgUpdateQty(${idx}, this.value)"
                style="width:52px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
            </td>
            <td class="px-3 py-2">
              <input type="number" value="${row.unitPrice}"
                oninput="_cgUpdateUnitPrice(${idx}, this.value)"
                style="width:90px;text-align:right;font-size:11px;font-weight:700;border:1.5px solid #E5E7EB;border-radius:6px;padding:4px 6px">
            </td>
            <td class="px-3 py-2 text-right font-black" style="color:${isHardOver ? '#DC2626' : isSoftOver ? '#D97706' : '#111827'}">
              ${fmt(row.total)}
            </td>
            <td class="px-3 py-2 text-center">
              <button onclick="_cgRemoveRow(${idx})" style="color:#D1D5DB;font-size:14px;border:none;background:none;cursor:pointer">✕</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>

  <!-- 합계 & 결재라인 미리보기 -->
  <div class="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-blue-100">
    <div class="text-xs font-black text-gray-500">세부 산출 합계</div>
    <div class="font-black text-lg ${hasHard ? 'text-red-600' : 'text-accent'}">${fmt(subtotal)}원</div>
  </div>` : `
  <div class="bg-white rounded-xl px-4 py-6 text-center text-sm text-gray-400 border border-dashed border-blue-200">
    위의 '+ 항목 추가' 버튼을 눌러 산출 근거 항목을 입력하세요.
  </div>`}
</div>`;
}

// 결재라인 정보 표시
function _renderApprovalRouteInfo(s, curBudget) {
  if (typeof getApprovalRoute === 'undefined' || !curBudget) return '';
  const accountCode = _getPlanAccountCode(curBudget);
  if (!accountCode) return '';
  const amount = Number(s.amount) || _calcGroundsTotal();
  if (!amount) return '';
  const route = getApprovalRoute(accountCode, amount);
  if (!route) return '';
  return `
<div class="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
  <span class="text-amber-500 text-sm">📋</span>
  <span class="text-xs font-bold text-amber-800">${route.range.label}: ${route.range.approvers.join(' → ')}</span>
  <span class="text-[10px] text-amber-600 ml-1">(예상 결재라인)</span>
</div>`;
}

// ─── Calc Grounds 행 조작 함수 ───────────────────────────────────────────────

function _cgAddRow() {
  if (!planState.calcGrounds) planState.calcGrounds = [];
  const curBudget = (() => {
    const s = planState;
    const availBudgets = s.purpose ? getPersonaBudgets(currentPersona, s.purpose.accounts) : [];
    return availBudgets.find(b => b.id === s.budgetId) || null;
  })();
  const accountCode = _getPlanAccountCode(curBudget);
  const items = accountCode && typeof getCalcGroundsForAccount !== 'undefined'
    ? getCalcGroundsForAccount(accountCode) : [];
  const firstItem = items[0];
  planState.calcGrounds.push({
    itemId: firstItem?.id || '',
    qty: 1,
    unitPrice: firstItem?.unitPrice || 0,
    total: firstItem?.unitPrice || 0,
    limitOverrideReason: '',
  });
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgRemoveRow(idx) {
  planState.calcGrounds.splice(idx, 1);
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgUpdateItemId(idx, itemId) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  const item = typeof CALC_GROUNDS_MASTER !== 'undefined'
    ? CALC_GROUNDS_MASTER.find(g => g.id === itemId) : null;
  row.itemId = itemId;
  row.unitPrice = item?.unitPrice || 0;
  row.total = row.qty * row.unitPrice;
  row.limitOverrideReason = '';
  _syncCalcToAmount();
  renderPlanWizard();
}

function _cgUpdateQty(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.qty = Math.max(1, Number(val) || 1);
  row.total = row.qty * row.unitPrice;
  _syncCalcToAmount();
  // 합계만 업데이트 (전체 재렌더 없이 숫자만 갱신)
  _cgRefreshTotals();
}

function _cgUpdateUnitPrice(idx, val) {
  const row = planState.calcGrounds[idx];
  if (!row) return;
  row.unitPrice = Number(val) || 0;
  row.total = row.qty * row.unitPrice;
  _syncCalcToAmount();
  _cgRefreshTotals();
}

function _cgUpdateReason(idx, val) {
  const row = planState.calcGrounds[idx];
  if (row) row.limitOverrideReason = val;
}

// 소계만 텍스트 업데이트 (전체 렌더 최소화)
function _cgRefreshTotals() {
  // Step 4에 있을 때만 재렌더
  if (planState.step === 4) renderPlanWizard();
}
