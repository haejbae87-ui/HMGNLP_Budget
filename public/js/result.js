// ─── RESULT (교육결과 등록) — 독립 화면 ────────────────────────────────────────
// 패턴 A/B: 승인완료 교육신청 기반 결과 등록
// 패턴 C/D: 교육 정보 직접 입력 결과 등록

// ─── 상태 관리 ─────────────────────────────────────────────────────────────
let _resultWizardState = null;
let _resultViewMode = 'list'; // 'list' | 'wizard'
let _resultDbLoaded = false;
let _resultDbRows = [];
let _resultYear = new Date().getFullYear();

function _resetResultWizardState() {
  return {
    step: 1,
    mode: null,           // 'from_application' | 'direct'
    // Step 2: 신청 기반
    selectedAppId: null,
    selectedApp: null,
    // Step 2: 직접 입력
    title: '',
    date: '',
    endDate: '',
    hours: '',
    provider: '',
    budgetId: '',
    useBudget: false,
    expenses: [{ item: '수강료', price: '', qty: 1 }],
    // Step 3: 결과
    completed: 'yes',
    actualHours: '',
    actualCost: 0,
    satisfaction: 5,
    feedback: '',
  };
}

// ─── 메인 렌더러 ──────────────────────────────────────────────────────────
function renderResult() {
  if (_resultWizardState) {
    _renderResultWizard();
  } else {
    _renderResultList();
  }
}

// ─── 결과 목록 ────────────────────────────────────────────────────────────
function _renderResultList() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && !_resultDbLoaded) {
    _resultDbLoaded = true;
    sb.from('applications').select('*')
      .eq('applicant_id', currentPersona.id)
      .eq('tenant_id', currentPersona.tenantId)
      .in('status', ['completed', 'result_pending'])
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          _resultDbRows = data.map(d => ({
            id: d.id,
            title: d.edu_name || '-',
            type: d.edu_type || '',
            date: d.created_at?.slice(0, 10) || '',
            amount: Number(d.amount || 0),
            status: d.status,
            resultType: d.detail?.resultType || (d.detail?.result ? 'from_application' : 'direct'),
            completed: d.detail?.result?.completed ?? true,
            satisfaction: d.detail?.result?.satisfaction || 0,
          }));
        }
        _renderResultList();
      });
    document.getElementById('page-result').innerHTML = `<div class="max-w-4xl mx-auto" style="padding:60px 20px;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">⌛</div>
      <div style="font-size:14px;font-weight:700;color:#6B7280">결과 데이터 로딩 중...</div>
    </div>`;
    return;
  }

  const results = _resultDbRows;
  const stats = {
    total: results.length,
    completed: results.filter(r => r.completed).length,
    pending: results.filter(r => r.status === 'result_pending').length,
  };

  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_resultYear=Number(this.value);_renderResultList()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map(y => `<option value="${y}" ${_resultYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
  </select>`;

  const STATUS_CFG = {
    completed: { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅', label: '등록완료' },
    result_pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⏳', label: '검토중' },
  };

  const listHtml = results.length > 0
    ? results.map(r => {
      const cfg = STATUS_CFG[r.status] || STATUS_CFG.completed;
      const typeLabel = r.resultType === 'from_application' ? '신청 기반' : '직접 등록';
      const typeBadgeBg = r.resultType === 'from_application' ? '#DBEAFE' : '#FEF3C7';
      const typeBadgeColor = r.resultType === 'from_application' ? '#1D4ED8' : '#D97706';
      return `
      <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                  border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s;margin-bottom:12px"
           onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)';this.style.transform='translateY(-1px)'"
           onmouseout="this.style.boxShadow='none';this.style.transform='none'">
        <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:14px;font-weight:900;color:#111827">${r.title}</span>
            <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${cfg.label}</span>
            <span style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;background:${typeBadgeBg};color:${typeBadgeColor}">${typeLabel}</span>
          </div>
          <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
            <span>📅 ${r.date}</span>
            <span>💰 ${(r.amount || 0).toLocaleString()}원</span>
            ${r.satisfaction ? `<span>⭐ ${r.satisfaction}/5</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('')
    : `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
        <div style="font-size:48px;margin-bottom:16px">📝</div>
        <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">
          ${_resultYear}년 교육결과가 아직 없습니다
        </div>
        <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
          교육 이수 후 결과를 등록하면 학습 이력이 기록됩니다.<br>
          아래 버튼으로 교육결과를 등록해 보세요.
        </div>
        <button onclick="_resultWizardState=_resetResultWizardState();renderResult()"
          style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
          + 교육결과 등록하기
        </button>
      </div>`;

  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
    ${[
      { label: '전체', val: stats.total, color: '#002C5F', bg: '#EFF6FF', icon: '📋' },
      { label: '등록완료', val: stats.completed, color: '#059669', bg: '#F0FDF4', icon: '✅' },
      { label: '검토중', val: stats.pending, color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
    ].map(s => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`).join('')}
  </div>`;

  document.getElementById('page-result').innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육결과 등록</h1>
      <p class="text-gray-500 text-sm mt-1">${currentPersona.name} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      <button onclick="_resultWizardState=_resetResultWizardState();renderResult()"
        class="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-900 transition shadow-lg">
        + 결과 등록
      </button>
    </div>
  </div>
  ${statsBar}
  <div id="result-list">${listHtml}</div>
</div>`;
}

// ─── 결과 등록 위저드 ─────────────────────────────────────────────────────
function _renderResultWizard() {
  const s = _resultWizardState;
  if (!s) return;

  // 정책 패턴 분석: 신청기반(A/B/E) vs 직접등록(C/D)
  const policyResult = typeof _getActivePolicies !== 'undefined' ? _getActivePolicies(currentPersona) : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  const hasApplicationBased = matchedPolicies.some(p => {
    const pt = p.process_pattern || p.processPattern || '';
    return ['A', 'B', 'E'].includes(pt);
  });
  const hasDirectEntry = matchedPolicies.some(p => {
    const pt = p.process_pattern || p.processPattern || '';
    return ['C', 'D'].includes(pt);
  });
  // 정책 없으면 기본: 양쪽 모두 허용
  const showAppBased = hasApplicationBased || (!hasApplicationBased && !hasDirectEntry);
  const showDirect = hasDirectEntry || (!hasApplicationBased && !hasDirectEntry);

  const stepLabels = ['등록 방식', '교육 정보', '결과 작성'];
  const stepper = [1, 2, 3].map(n => `
  <div class="step-item flex items-center gap-2 ${s.step > n ? 'done' : s.step === n ? 'active' : ''}">
    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? '✓' : n}</div>
    <span class="text-xs font-bold ${s.step === n ? 'text-brand' : 'text-gray-400'} hidden sm:block">${stepLabels[n - 1]}</span>
    ${n < 3 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ''}
  </div>`).join('');

  let bodyHtml = '';

  // ── Step 1: 등록 방식 선택 ──
  if (s.step === 1) {
    const cards = [];
    if (showAppBased) {
      cards.push(`
      <button onclick="_resultWizardState.mode='from_application';_resultWizardState.step=2;renderResult()"
        class="p-6 rounded-2xl border-2 text-left transition-all hover:border-accent ${s.mode === 'from_application' ? 'border-accent bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'}">
        <div class="text-3xl mb-3">📋</div>
        <div class="font-black text-gray-900 text-sm mb-1">신청 기반 결과 등록</div>
        <div class="text-xs text-gray-500">승인완료된 교육신청을 선택하여 결과를 등록합니다</div>
        <div class="mt-3 text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full inline-block">패턴 A · B</div>
      </button>`);
    }
    if (showDirect) {
      cards.push(`
      <button onclick="_resultWizardState.mode='direct';_resultWizardState.step=2;renderResult()"
        class="p-6 rounded-2xl border-2 text-left transition-all hover:border-amber-400 ${s.mode === 'direct' ? 'border-amber-500 bg-amber-50 shadow-lg' : 'border-gray-200 bg-white'}">
        <div class="text-3xl mb-3">✏️</div>
        <div class="font-black text-gray-900 text-sm mb-1">직접 결과 등록</div>
        <div class="text-xs text-gray-500">교육신청 없이 교육 정보를 직접 입력하여 결과를 등록합니다</div>
        <div class="mt-3 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block">패턴 C · D</div>
      </button>`);
    }
    const cols = cards.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2';
    bodyHtml = `
    <h3 class="text-base font-black text-gray-800 mb-5">01. 결과 등록 방식 선택</h3>
    <div class="grid ${cols} gap-4">${cards.join('')}</div>`;
  }

  // ── Step 2: 교육 정보 ──
  if (s.step === 2) {
    if (s.mode === 'from_application') {
      bodyHtml = _renderStep2ApplicationBased(s);
    } else {
      bodyHtml = _renderStep2DirectEntry(s);
    }
  }

  // ── Step 3: 결과 작성 ──
  if (s.step === 3) {
    bodyHtml = _renderStep3ResultForm(s);
  }

  // 네비게이션
  const canNext2App = s.mode === 'from_application' && s.selectedAppId;
  const canNext2Dir = s.mode === 'direct' && s.title && s.date && s.endDate;
  const canNext2 = s.mode === 'from_application' ? canNext2App : canNext2Dir;

  document.getElementById('page-result').innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육결과 등록</h1>
    </div>
    <button onclick="_resultWizardState=null;renderResult()" style="padding:8px 18px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151;cursor:pointer">← 목록으로</button>
  </div>

  <div class="card p-5">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <div class="card p-8">
    ${bodyHtml}

    ${s.step > 1 ? `
    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      <button onclick="_resultWizardState.step--;renderResult()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>
      ${s.step === 2 ? `<button onclick="_resultWizardState.step=3;renderResult()" ${!canNext2 ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext2 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">다음 →</button>` : ''}
      ${s.step === 3 ? `<button onclick="_submitResultRegistration()"
        class="px-10 py-3 rounded-xl font-black text-sm bg-brand text-white hover:bg-blue-900 shadow-lg transition">📤 결과 제출</button>` : ''}
    </div>` : ''}
  </div>
</div>`;
}

// ── Step 2A: 신청 기반 ─────────────────────────────────────────────────────
let _resultApprovedApps = [];
let _resultApprovedAppsLoaded = false;

function _renderStep2ApplicationBased(s) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && !_resultApprovedAppsLoaded) {
    _resultApprovedAppsLoaded = true;
    sb.from('applications').select('*')
      .eq('applicant_id', currentPersona.id)
      .eq('tenant_id', currentPersona.tenantId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        _resultApprovedApps = (data || []).map(d => ({
          id: d.id,
          title: d.edu_name || '-',
          type: d.edu_type || '',
          date: d.created_at?.slice(0, 10) || '',
          amount: Number(d.amount || 0),
          account: d.account_code || '',
          hasResult: !!(d.detail?.result),
        }));
        renderResult();
      });
    return `<h3 class="text-base font-black text-gray-800 mb-5">02. 교육신청 선택</h3>
      <div style="padding:32px;text-align:center;color:#6B7280"><div style="font-size:28px;margin-bottom:8px">⌛</div>승인된 교육신청 로딩 중...</div>`;
  }

  const apps = _resultApprovedApps.filter(a => !a.hasResult);

  return `
  <h3 class="text-base font-black text-gray-800 mb-2">02. 결과를 등록할 교육신청 선택</h3>
  <p class="text-xs text-gray-400 mb-5">승인완료된 교육신청 중 아직 결과가 등록되지 않은 항목입니다.</p>
  ${apps.length > 0 ? `<div class="space-y-3">
    ${apps.map(a => {
      const active = s.selectedAppId === a.id;
      return `
      <button onclick="_resultWizardState.selectedAppId='${a.id.replace(/'/g, "\\'")}';_resultWizardState.selectedApp=${JSON.stringify(a).replace(/"/g, '&quot;')};renderResult()"
        class="w-full text-left transition-all" style="padding:18px 20px;border-radius:14px;border:2px solid ${active ? '#002C5F' : '#E5E7EB'};background:${active ? '#EFF6FF' : 'white'};cursor:pointer">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:14px;font-weight:900;color:${active ? '#002C5F' : '#111827'}">${a.title}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:3px">📅 ${a.date} · 💰 ${a.amount.toLocaleString()}원 · 💳 ${a.account}</div>
          </div>
          ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ''}
        </div>
      </button>`;
    }).join('')}
  </div>` : `
  <div style="padding:40px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:36px;margin-bottom:12px">📭</div>
    <div style="font-size:14px;font-weight:900;color:#374151;margin-bottom:6px">결과를 등록할 교육신청이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF;line-height:1.6">
      승인완료된 교육신청이 있어야 결과를 등록할 수 있습니다.<br>
      "직접 결과 등록" 방식을 이용해 보세요.
    </div>
    <button onclick="_resultWizardState.mode='direct';_resultWizardState.step=2;renderResult()"
      style="margin-top:16px;padding:10px 24px;border-radius:12px;background:#D97706;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer">
      ✏️ 직접 결과 등록으로 전환
    </button>
  </div>`}`;
}

// ── Step 2B: 직접 입력 ─────────────────────────────────────────────────────
function _renderStep2DirectEntry(s) {
  // 후정산 여부 (C 패턴)
  const policyResult = typeof _getActivePolicies !== 'undefined' ? _getActivePolicies(currentPersona) : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  const hasCPattern = matchedPolicies.some(p => (p.process_pattern || p.processPattern) === 'C');

  return `
  <h3 class="text-base font-black text-gray-800 mb-2">02. 교육 정보 입력</h3>
  <p class="text-xs text-gray-400 mb-5">이수한 교육의 정보를 직접 입력해 주세요.</p>
  <div style="display:grid;gap:14px">
    <div>
      <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육과정명 <span style="color:#EF4444">*</span></label>
      <input value="${s.title}" onchange="_resultWizardState.title=this.value"
        style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box"
        placeholder="예: AWS 솔루션스 아키텍트 자격증 과정">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 시작일 <span style="color:#EF4444">*</span></label>
        <input type="date" value="${s.date}" onchange="_resultWizardState.date=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 종료일 <span style="color:#EF4444">*</span></label>
        <input type="date" value="${s.endDate}" onchange="_resultWizardState.endDate=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">학습 시간(H)</label>
        <input type="number" value="${s.hours}" onchange="_resultWizardState.hours=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box" placeholder="8">
      </div>
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육기관</label>
        <input value="${s.provider}" onchange="_resultWizardState.provider=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;box-sizing:border-box" placeholder="교육기관명">
      </div>
    </div>
    ${hasCPattern ? `
    <div style="margin-top:8px;padding:16px 20px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px">
      <div style="font-size:12px;font-weight:900;color:#D97706;margin-bottom:8px">🧾 후정산 비용 입력</div>
      <div style="display:grid;gap:8px">
        ${s.expenses.map((e, i) => `
        <div style="display:grid;grid-template-columns:2fr 1fr 60px auto;gap:8px;align-items:center">
          <input value="${e.item}" onchange="_resultWizardState.expenses[${i}].item=this.value" placeholder="항목명"
            style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          <input type="number" value="${e.price}" onchange="_resultWizardState.expenses[${i}].price=this.value" placeholder="단가"
            style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          <input type="number" value="${e.qty}" onchange="_resultWizardState.expenses[${i}].qty=this.value" min="1"
            style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
          <button onclick="_resultWizardState.expenses.splice(${i},1);renderResult()" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626">✕</button>
        </div>`).join('')}
        <button onclick="_resultWizardState.expenses.push({item:'',price:'',qty:1});renderResult()"
          style="margin-top:4px;font-size:11px;font-weight:800;color:#D97706;background:none;border:1.5px dashed #FDE68A;
                 padding:8px 14px;border-radius:8px;cursor:pointer;width:100%">+ 비용 항목 추가</button>
      </div>
      <div style="text-align:right;margin-top:8px;font-size:14px;font-weight:900;color:#D97706">
        정산 합계: ${s.expenses.reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0).toLocaleString()}원
      </div>
    </div>` : ''}
  </div>`;
}

// ── Step 3: 결과 작성 ──────────────────────────────────────────────────────
function _renderStep3ResultForm(s) {
  const infoSummary = s.mode === 'from_application' && s.selectedApp
    ? `<div style="margin-bottom:20px;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE;border-radius:12px">
        <div style="font-size:10px;font-weight:900;color:#1D4ED8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">🔗 연계된 교육신청</div>
        <div style="font-size:14px;font-weight:900;color:#111827">${s.selectedApp.title}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">📅 ${s.selectedApp.date} · 💰 ${(s.selectedApp.amount || 0).toLocaleString()}원</div>
       </div>`
    : s.mode === 'direct'
      ? `<div style="margin-bottom:20px;padding:14px 18px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:12px">
          <div style="font-size:10px;font-weight:900;color:#D97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">✏️ 직접 입력 교육</div>
          <div style="font-size:14px;font-weight:900;color:#111827">${s.title}</div>
          <div style="font-size:11px;color:#6B7280;margin-top:2px">📅 ${s.date} ~ ${s.endDate} · 🏢 ${s.provider || '-'}</div>
         </div>`
      : '';

  return `
  <h3 class="text-base font-black text-gray-800 mb-4">03. 교육 결과 작성</h3>
  ${infoSummary}

  <div style="display:grid;gap:20px">
    <!-- 수료여부 -->
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">수료여부 <span style="color:#EF4444">*</span></label>
      <div style="display:flex;gap:10px">
        ${['yes', 'no'].map(v => `
        <button onclick="_resultWizardState.completed='${v}';renderResult()"
          style="flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;
                 border:2px solid ${s.completed === v ? '#059669' : '#E5E7EB'};
                 background:${s.completed === v ? '#F0FDF4' : 'white'};
                 color:${s.completed === v ? '#059669' : '#6B7280'}">
          ${v === 'yes' ? '✅ 수료' : '❌ 미수료'}
        </button>`).join('')}
      </div>
    </div>

    <!-- 실참석시간 -->
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">실 참석시간 (시간)</label>
      <input type="number" value="${s.actualHours}" placeholder="예: 16"
        oninput="_resultWizardState.actualHours=this.value"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
    </div>

    <!-- 만족도 -->
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">만족도 (1~5)</label>
      <div style="display:flex;gap:8px">
        ${[1, 2, 3, 4, 5].map(v => `
        <button onclick="_resultWizardState.satisfaction=${v};renderResult()"
          style="width:44px;height:44px;border-radius:10px;font-size:18px;cursor:pointer;
                 border:2px solid ${s.satisfaction >= v ? '#F59E0B' : '#E5E7EB'};
                 background:${s.satisfaction >= v ? '#FFFBEB' : 'white'}">⭐</button>`).join('')}
      </div>
    </div>

    <!-- 소감 -->
    <div>
      <label style="font-size:13px;font-weight:800;color:#374151;display:block;margin-bottom:8px">교육 소감</label>
      <textarea oninput="_resultWizardState.feedback=this.value" rows="4"
        placeholder="교육의 유익한 점, 실무 적용 계획 등을 작성해주세요."
        style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical">${s.feedback}</textarea>
    </div>

    <!-- 첨부파일 -->
    <div style="padding:20px;background:#F9FAFB;border-radius:12px;border:1.5px dashed #D1D5DB">
      <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">📎 첨부파일 (수료증, 영수증 등)</div>
      <div style="font-size:11px;color:#9CA3AF">파일 업로드 기능은 추후 제공 예정입니다.</div>
    </div>
  </div>`;
}

// ── 결과 제출 (DB 저장) ────────────────────────────────────────────────────
async function _submitResultRegistration() {
  const s = _resultWizardState;
  if (!s) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }

  const resultData = {
    completed: s.completed === 'yes',
    actual_hours: Number(s.actualHours) || 0,
    actual_cost: Number(s.actualCost) || 0,
    satisfaction: s.satisfaction,
    feedback: s.feedback,
    submitted_at: new Date().toISOString(),
    submitted_by: currentPersona.name,
  };

  try {
    if (s.mode === 'from_application' && s.selectedAppId) {
      // 패턴 A/B: 기존 application 업데이트
      const { data: existing } = await sb.from('applications').select('detail').eq('id', s.selectedAppId).single();
      const prevDetail = existing?.detail || {};
      const { error } = await sb.from('applications').update({
        status: 'completed',
        detail: { ...prevDetail, result: resultData, resultType: 'from_application' },
      }).eq('id', s.selectedAppId);
      if (error) throw error;
    } else {
      // 패턴 C/D: 신규 application INSERT
      const appId = `RES-${Date.now()}`;
      const totalCost = s.expenses.reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0);
      const row = {
        id: appId,
        tenant_id: currentPersona.tenantId,
        plan_id: null,
        account_code: s.budgetId || null,
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || '',
        edu_name: s.title,
        edu_type: null,
        amount: totalCost,
        status: 'completed',
        policy_id: null,
        detail: {
          resultType: 'direct',
          result: resultData,
          startDate: s.date,
          endDate: s.endDate,
          hours: s.hours,
          provider: s.provider,
          expenses: s.expenses,
        },
      };
      const { error } = await sb.from('applications').insert(row);
      if (error) throw error;
    }

    alert('✅ 교육결과가 성공적으로 등록되었습니다.');
    _resultWizardState = null;
    _resultDbLoaded = false;
    _resultDbRows = [];
    _resultApprovedAppsLoaded = false;
    _resultApprovedApps = [];
    renderResult();
  } catch (err) {
    alert('제출 실패: ' + err.message);
    console.error('[_submitResultRegistration]', err.message);
  }
}
