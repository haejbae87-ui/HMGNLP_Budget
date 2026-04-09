// ─── RESULT (교육결과 등록) — 교육신청과 통일된 4단계 위저드 ────────────────────
// Step 1: 교육 목적 선택
// Step 2: 예산 계정 선택 (패턴 감지: A/B=신청기반, C/D=직접등록)
// Step 3: 교육유형 선택
// Step 4: 세부정보 + 결과 작성

// ─── 상태 관리 ─────────────────────────────────────────────────────────────
let _resultWizardState = null;
let _resultViewMode = 'list'; // 'list' | 'wizard'
let _resultDbLoaded = false;
let _resultDbRows = [];
let _resultYear = new Date().getFullYear();
let _resultApprovedApps = [];
let _resultApprovedAppsLoaded = false;

function _resetResultWizardState() {
  return {
    step: 1,
    // Step 1: 교육 목적
    purpose: null,
    // Step 2: 예산 계정
    budgetId: '',
    budgetChoice: '',    // 개인직무: 'general' | 'rnd' | 'none'
    useBudget: null,
    processPattern: null,  // 감지된 패턴
    mode: null,            // 'from_application' | 'direct'
    // Step 2: 신청 기반
    selectedAppId: null,
    selectedApp: null,
    planIds: [],
    planId: '',
    // Step 3: 교육유형
    eduType: null,
    eduSubType: null,
    learningType: '',
    // Step 4: 세부정보 + 결과
    title: '',
    date: '',
    endDate: '',
    hours: '',
    provider: '',
    expenses: [{ item: '수강료', price: '', qty: 1 }],
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

  const allPurposes = typeof getPersonaPurposes === 'function' ? getPersonaPurposes(currentPersona) : [];
  const _catMeta = typeof _CATEGORY_META !== 'undefined' ? _CATEGORY_META : {
    'self-learning': { icon: '📚', label: '직접 학습', desc: '본인이 직접 참여하는 교육' },
    'edu-operation': { icon: '🎯', label: '교육 운영', desc: '교육과정을 기획하거나 운영하는 경우' },
  };
  const _catColors = {
    'self-learning': { badge: 'bg-blue-100 text-blue-600', border: 'border-accent', bgActive: 'bg-blue-50', textActive: 'text-accent' },
    'edu-operation': { badge: 'bg-violet-100 text-violet-600', border: 'border-violet-500', bgActive: 'bg-violet-50', textActive: 'text-violet-600' },
  };
  const categorized = {};
  allPurposes.forEach(p => {
    const cat = p.category || 'edu-operation';
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(p);
  });

  // 예산 계정 정보
  const availBudgets = s.purpose ? (typeof getPersonaBudgets === 'function' ? getPersonaBudgets(currentPersona, s.purpose.id) : []) : [];
  const curBudget = availBudgets.find(b => b.id === s.budgetId) || null;

  // 패턴 감지
  const _processInfo = curBudget && s.purpose
    ? (typeof getProcessPatternInfo !== 'undefined' ? getProcessPatternInfo(currentPersona, s.purpose.id, curBudget.accountCode) : null)
    : null;
  const detectedPattern = _processInfo?.pattern || null;

  // Step 라벨
  const stepLabels = ['목적 선택', '예산 선택', '교육유형 선택', '결과 등록'];
  const stepper = [1, 2, 3, 4].map(n => `
  <div class="step-item flex items-center gap-2 ${s.step > n ? 'done' : s.step === n ? 'active' : ''}">
    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? '✓' : n}</div>
    <span class="text-xs font-bold ${s.step === n ? 'text-brand' : 'text-gray-400'} hidden sm:block">${stepLabels[n - 1]}</span>
    ${n < 4 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ''}
  </div>`).join('');

  let bodyHtml = '';

  // ═══════════════════════════════════════════════════════════════════
  // Step 1: 교육 목적 선택 (교육신청과 동일)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 1) {
    bodyHtml = `
    <h3 class="text-base font-black text-gray-800 mb-5">01. 교육 목적 선택</h3>
    <p class="text-sm text-gray-400 mb-5">결과를 등록할 교육의 목적을 선택하세요.</p>
    ${['self-learning', 'edu-operation'].map(catKey => {
      const items = categorized[catKey] || [];
      if (items.length === 0) return '';
      const meta = _catMeta[catKey] || _catMeta['edu-operation'];
      const colors = _catColors[catKey] || _catColors['edu-operation'];
      return `
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-3">
          <span class="px-3 py-1 rounded-full text-xs font-black ${colors.badge}">${meta.icon} ${meta.label}</span>
          <span class="text-xs text-gray-400">${meta.desc}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-${Math.min(items.length, 3)} gap-3">
          ${items.map(p => {
            const active = s.purpose?.id === p.id;
            return `
          <button onclick="_resultSelectPurpose('${p.id}')"
            class="text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${active ? colors.border + ' ' + colors.bgActive + ' shadow-lg' : 'border-gray-200 bg-white hover:' + colors.border}">
            <div class="text-2xl mb-2">${p.icon || '📋'}</div>
            <div class="font-black text-sm ${active ? colors.textActive : 'text-gray-900'}">${p.label}</div>
            <div class="text-xs text-gray-500 mt-1">${p.desc || ''}</div>
          </button>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 2: 예산 계정 선택 (교육신청과 동일한 구조)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 2) {
    const isInd = s.purpose?.id === 'external_personal';

    if (isInd) {
      // 개인직무 사외학습: 일반/R&D/무예산 분기 (교육신청과 동일)
      bodyHtml = `
      <div style="padding:12px 16px;border-radius:12px;background:#EFF6FF;border:1.5px solid #BFDBFE;margin-bottom:20px">
        <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-right:6px">🔖 선택 내용</span>
        <span style="font-size:10px;font-weight:800;color:#6B7280">| 목적</span>
        <span style="font-size:11px;font-weight:900;color:#1E40AF;margin-left:4px">${s.purpose.label}</span>
      </div>
      <h3 class="text-base font-black text-gray-800 mb-2">02. 예산 선택</h3>
      <p class="text-sm text-gray-400 mb-5">이번 결과 등록에 연관된 예산을 선택하세요.</p>
      <div style="display:grid;gap:8px">
        ${_renderResultBudgetChoices(s)}
      </div>`;
    } else {
      // 교육운영: 정책 기반 예산 계정 목록
      const policyBudgets = typeof getPersonaBudgets === 'function' ? getPersonaBudgets(currentPersona, s.purpose?.id) : [];
      bodyHtml = `
      <div style="padding:12px 16px;border-radius:12px;background:#EFF6FF;border:1.5px solid #BFDBFE;margin-bottom:20px">
        <span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:5px;background:#DBEAFE;color:#1D4ED8;margin-right:6px">🔖 선택 내용</span>
        <span style="font-size:10px;font-weight:800;color:#6B7280">| 목적</span>
        <span style="font-size:11px;font-weight:900;color:#1E40AF;margin-left:4px">${s.purpose.label}</span>
      </div>
      <h3 class="text-base font-black text-gray-800 mb-2">02. 예산 선택</h3>
      <p class="text-sm text-gray-400 mb-5">결과를 등록할 예산 계정을 선택하세요.</p>
      ${policyBudgets.length === 0
        ? `<p class="text-sm text-gray-500 mb-4 font-bold"><span class="text-orange-500">⚠️</span> 이 교육 목적에 사용 가능한 예산 계정이 없습니다.</p>`
        : `<div style="display:grid;gap:8px">
        ${policyBudgets.map(b => {
          const active = s.budgetId === b.id;
          const acctTypeLabel = b.account === '운영' ? '운영 계정' : b.account === '참가' ? '참가 계정' : b.account + ' 계정';
          return `<button onclick="_resultSelectBudget('${b.id}')"
    style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${active ? '#002C5F' : '#E5E7EB'};
           background:${active ? '#EFF6FF' : 'white'};cursor:pointer;width:100%;transition:all .15s">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <span style="font-size:14px;font-weight:900;color:${active ? '#002C5F' : '#111827'}">${b.name}</span>
        <div style="font-size:11px;color:#9CA3AF;margin-top:3px">${acctTypeLabel}</div>
      </div>
      ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ''}
    </div>
  </button>`;
        }).join('')}
      </div>`}
      ${_processInfo ? `
      <div style="margin-top:16px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:16px 18px">
        <div style="font-size:10px;font-weight:900;color:#15803D;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <span style="width:5px;height:5px;background:#22C55E;border-radius:50%;display:inline-block"></span>
          이 교육의 프로세스 패턴: ${_processInfo.pattern}
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:10px;flex-wrap:wrap">
          ${_processInfo.steps.map((st, i) => `
          <div style="display:flex;align-items:center;gap:4px">
            <div style="text-align:center">
              <div style="font-size:18px;margin-bottom:2px">${st.icon}</div>
              <div style="font-size:11px;font-weight:900;color:#111827">${st.name}</div>
              <div style="font-size:9px;color:#6B7280;font-weight:700">${st.hint}</div>
            </div>
            ${i < _processInfo.steps.length - 1 ? '<span style="color:#D1D5DB;font-size:16px;margin:0 6px;font-weight:bold">→</span>' : ''}
          </div>`).join('')}
        </div>
        <div style="font-size:11px;color:#15803D;display:flex;align-items:flex-start;gap:5px">
          <span style="font-size:12px;flex-shrink:0">ⓘ</span>
          <span>${_processInfo.hint}</span>
        </div>
      </div>` : ''}
      ${(() => {
        // 패턴 A/B: 신청 기반 결과 등록 → 신청 선택 영역
        if (detectedPattern && ['A', 'B'].includes(detectedPattern) && s.budgetId) {
          return _renderResultAppBasedSection(s);
        }
        return '';
      })()}`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 3: 교육유형 선택 (교육신청과 동일)
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 3) {
    const eduTree = typeof getPolicyEduTree === 'function' && s.purpose
      ? getPolicyEduTree(currentPersona, s.purpose.id, curBudget?.accountCode)
      : [];
    bodyHtml = `
    <h3 class="text-base font-black text-gray-800 mb-2">03. 교육유형 선택</h3>
    <p class="text-sm text-gray-400 mb-5">결과를 등록할 교육의 유형을 선택하세요.</p>
    ${eduTree.length > 0 ? `
    <div style="display:grid;gap:12px">
      ${eduTree.map(cat => `
      <div>
        <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:8px;display:flex;align-items:center;gap:6px">
          <span style="font-size:14px">${cat.icon || '📂'}</span> ${cat.label}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
          ${cat.children.map(lt => {
            const active = s.learningType === lt.value;
            return `
          <button onclick="_resultSelectEduType('${lt.value}','${cat.value}')"
            style="padding:14px 12px;border-radius:12px;border:2px solid ${active ? '#002C5F' : '#E5E7EB'};
                   background:${active ? '#EFF6FF' : 'white'};text-align:center;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:4px">${lt.icon || '📘'}</div>
            <div style="font-size:12px;font-weight:${active ? 900 : 700};color:${active ? '#002C5F' : '#374151'}">${lt.label}</div>
          </button>`;
          }).join('')}
        </div>
      </div>`).join('')}
    </div>` : `
    <div style="padding:40px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
      <div style="font-size:36px;margin-bottom:12px">📭</div>
      <div style="font-size:14px;font-weight:900;color:#374151">이 교육 목적에 사용 가능한 교육유형이 없습니다</div>
    </div>`}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Step 4: 세부정보 + 결과 작성
  // ═══════════════════════════════════════════════════════════════════
  if (s.step === 4) {
    const isAppBased = s.mode === 'from_application' && s.selectedApp;
    const selectedInfo = `
    <div style="margin-bottom:20px;padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F5F3FF);border:1.5px solid #BFDBFE;border-radius:12px">
      <div style="font-size:10px;font-weight:900;color:#1D4ED8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📋 선택 정보</div>
      <div style="font-size:12px;color:#6B7280;line-height:1.8">
        <strong>목적:</strong> ${s.purpose?.label || '-'} &nbsp;
        <strong>유형:</strong> ${s.learningType || '-'} &nbsp;
        ${isAppBased ? `<strong>연계 신청:</strong> ${s.selectedApp.title}` : ''}
      </div>
    </div>`;

    if (isAppBased) {
      // 패턴 A/B: 신청 기반 → 결과만 작성
      bodyHtml = `
      <h3 class="text-base font-black text-gray-800 mb-4">04. 교육 결과 작성</h3>
      ${selectedInfo}
      ${_renderStep4ResultForm(s)}`;
    } else {
      // 패턴 C/D: 직접 입력 → 교육정보 + 결과 작성
      bodyHtml = `
      <h3 class="text-base font-black text-gray-800 mb-4">04. 교육 정보 및 결과 작성</h3>
      ${selectedInfo}
      ${_renderStep4DirectInfo(s)}
      <div style="margin:24px 0;border-top:2px solid #E5E7EB"></div>
      <h3 class="text-base font-black text-gray-800 mb-4">교육 결과</h3>
      ${_renderStep4ResultForm(s)}`;
    }
  }

  // 다음 버튼 활성 조건
  const canNext = (() => {
    if (s.step === 1) return !!s.purpose;
    if (s.step === 2) {
      if (s.purpose?.id === 'external_personal') {
        return !!s.budgetChoice;
      }
      if (s.mode === 'from_application') return !!s.selectedAppId;
      return !!s.budgetId;
    }
    if (s.step === 3) return !!s.learningType;
    return true;
  })();

  document.getElementById('page-result').innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="_resultWizardState=null;renderResult()" style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#002C5F'" onmouseout="this.style.color='#6B7280'">
        ← 결과 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육결과 등록</h1>
    </div>
  </div>

  <div class="card p-5">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <div class="card p-8">
    ${bodyHtml}

    <div class="flex justify-between mt-6 pt-4 border-t border-gray-100">
      ${s.step > 1 ? `<button onclick="_resultPrev()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-gray-200 text-gray-600 hover:bg-gray-50">← 이전</button>` : '<div></div>'}
      ${s.step < 4 ? `<button onclick="_resultNext()" ${!canNext ? 'disabled' : ''}
        class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">다음 →</button>` : ''}
      ${s.step === 4 ? `<button onclick="_submitResultRegistration()"
        class="px-10 py-3 rounded-xl font-black text-sm bg-brand text-white hover:bg-blue-900 shadow-lg transition">📤 결과 제출</button>` : ''}
    </div>
  </div>
</div>`;
}

// ─── 개인직무 예산 선택 카드 (페르소나 allowedAccounts 기반 동적 필터링) ──────
function _renderResultBudgetChoices(s) {
  const allowed = currentPersona.allowedAccounts || [];
  const hasRnd = allowed.some(a => a.includes('RND'));
  const hasHscExt = allowed.includes('HSC-EXT');
  const hasHaeEdu = allowed.includes('HAE-EDU');
  const hasHaeTeam = allowed.includes('HAE-TEAM');
  const hasPart = allowed.some(a => a.includes('-PART') || a.includes('-OPS') || a.includes('-ETC'));
  const hasFree = allowed.includes('COMMON-FREE');

  const choices = [
    // HAE 전사교육예산
    ...(hasHaeEdu ? [{
      key: 'general', icon: '🏢', title: '전사교육예산',
      desc: '전사교육예산에서 지원합니다.',
      tag: '예산 사용', tagBg: '#EDE9FE', tagColor: '#7C3AED', nextColor: '#7C3AED',
      next: '교육유형 선택 → 결과 등록',
    }] : []),
    // HAE 팀/프로젝트 할당예산
    ...(hasHaeTeam ? [{
      key: 'general', icon: '👥', title: '팀/프로젝트 할당예산',
      desc: '팀 및 프로젝트 단위로 배정된 교육예산에서 결과를 등록합니다.',
      tag: '예산 사용', tagBg: '#F0FDF4', tagColor: '#059669', nextColor: '#059669',
      next: '교육유형 선택 → 결과 등록',
    }] : []),
    // HSC 사외교육 계정
    ...(hasHscExt ? [{
      key: 'general', icon: '🏭', title: '현대제철-사외교육 계정',
      desc: '현대제철 사외교육 예산으로 결과를 등록합니다.',
      tag: '예산 사용', tagBg: '#FFF1F2', tagColor: '#BE123C', nextColor: '#BE123C',
      next: '교육유형 선택 → 결과 등록',
    }] : []),
    // 일반 참가계정 (HMC/KIA 등 — HAE, HSC 아닌 경우)
    ...(!hasHscExt && !hasHaeEdu && hasPart ? [{
      key: 'general', icon: '💳', title: '일반교육예산',
      desc: '일반 교육예산에서 지원합니다.',
      tag: '예산 사용', tagBg: '#DBEAFE', tagColor: '#1D4ED8', nextColor: '#1D4ED8',
      next: '교육유형 선택 → 결과 등록',
    }] : []),
    // R&D 교육예산 (R&D VOrg 소속 팀만)
    ...(hasRnd ? [{
      key: 'rnd', icon: '🔬', title: 'R&D교육예산',
      desc: '사전 승인받은 R&D 교육계획과 연동합니다.',
      tag: '계획 연동 필수', tagBg: '#EDE9FE', tagColor: '#7C3AED', nextColor: '#7C3AED',
      next: '교육계획 선택 → 결과 등록',
    }] : []),
    // 예산 미사용 (COMMON-FREE 정책 계정이 있을 때만)
    ...(hasFree ? [{
      key: 'none', icon: '📝', title: '예산 미사용',
      desc: '예산 차감 없이 교육 이력만 등록합니다.',
      tag: '무예산', tagBg: '#F0FDF4', tagColor: '#15803D', nextColor: '#15803D',
      next: '교육유형 선택 → 결과 등록',
    }] : []),
  ];

  if (choices.length === 0) {
    return `<div style="padding:24px;text-align:center;border-radius:14px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:36px;margin-bottom:8px">⚠️</div>
      <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">사용 가능한 예산 계정이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF">백오피스 관리자에게 문의하세요.</div>
    </div>`;
  }

  return choices.map(ch => {
    const active = s.budgetChoice === ch.key;
    const col = ch.key === 'rnd' ? '#7C3AED' : ch.key === 'none' ? '#15803D' : ch.tagColor || '#1D4ED8';
    return `
  <button onclick="_resultSelectBudgetChoice('${ch.key}')"
    style="text-align:left;padding:20px;border-radius:16px;border:2px solid ${active ? col : '#E5E7EB'};
           background:${active ? col + '08' : 'white'};cursor:pointer;width:100%;transition:all .15s">
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:24px;flex-shrink:0">${ch.icon}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:900;color:${active ? col : '#111827'}">${ch.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${ch.tagBg};color:${ch.tagColor}">${ch.tag}</span>
        </div>
        <p style="font-size:12px;color:#6B7280;line-height:1.55;margin:0 0 8px">${ch.desc}</p>
        <div style="font-size:10px;font-weight:800;color:${ch.nextColor}">다음 단계: ${ch.next} →</div>
      </div>
      <div style="width:20px;height:20px;border-radius:50%;border:2px solid ${col};background:${active ? col : 'white'};flex-shrink:0;margin-top:4px;display:flex;align-items:center;justify-content:center">
        ${active ? '<span style="color:white;font-size:11px;font-weight:900">✓</span>' : ''}
      </div>
    </div>
  </button>`;
  }).join('');
}

// ─── 패턴 A/B: 승인된 교육신청 선택 ────────────────────────────────────────
function _renderResultAppBasedSection(s) {
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
    return `<div style="margin-top:16px;padding:20px;text-align:center;color:#6B7280"><div style="font-size:28px;margin-bottom:8px">⌛</div>승인된 교육신청 로딩 중...</div>`;
  }

  const apps = _resultApprovedApps.filter(a => !a.hasResult);
  if (apps.length === 0) {
    return `
    <div style="margin-top:16px;padding:24px;text-align:center;border-radius:14px;background:#FEF2F2;border:1.5px solid #FECACA">
      <div style="font-size:36px;margin-bottom:8px">📭</div>
      <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">결과를 등록할 교육신청이 없습니다</div>
      <div style="font-size:12px;color:#9CA3AF">승인완료된 교육신청이 있어야 결과를 등록할 수 있습니다.</div>
    </div>`;
  }

  return `
  <div style="margin-top:16px">
    <div style="font-size:13px;font-weight:900;color:#1D4ED8;margin-bottom:10px">📋 결과를 등록할 교육신청 선택</div>
    <div style="display:grid;gap:8px">
      ${apps.map(a => {
        const active = s.selectedAppId === a.id;
        return `
      <button onclick="_resultSelectApp('${a.id.replace(/'/g, "\\'")}', ${JSON.stringify(a).replace(/"/g, '&quot;')})"
        style="text-align:left;padding:16px 18px;border-radius:12px;border:2px solid ${active ? '#002C5F' : '#E5E7EB'};background:${active ? '#EFF6FF' : 'white'};cursor:pointer;width:100%;transition:all .15s">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:13px;font-weight:900;color:${active ? '#002C5F' : '#111827'}">${a.title}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:3px">📅 ${a.date} · 💰 ${a.amount.toLocaleString()}원</div>
          </div>
          ${active ? '<span style="font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ''}
        </div>
      </button>`;
      }).join('')}
    </div>
  </div>`;
}

// ─── Step 4: 직접 입력 교육정보 ──────────────────────────────────────────
function _renderStep4DirectInfo(s) {
  return `
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
  </div>`;
}

// ─── Step 4: 결과 작성 폼 ────────────────────────────────────────────────
function _renderStep4ResultForm(s) {
  return `
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

// ─── 이벤트 핸들러 ────────────────────────────────────────────────────────
function _resultSelectPurpose(id) {
  const policyPurposes = typeof getPersonaPurposes === 'function' ? getPersonaPurposes(currentPersona) : [];
  _resultWizardState.purpose = policyPurposes.find(p => p.id === id) || null;
  _resultWizardState.budgetId = '';
  _resultWizardState.budgetChoice = '';
  _resultWizardState.useBudget = null;
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultWizardState.learningType = '';
  _resultWizardState.mode = null;
  _resultWizardState.processPattern = null;
  _resultApprovedAppsLoaded = false;
  renderResult();
}

function _resultSelectBudget(budgetId) {
  _resultWizardState.budgetId = budgetId;
  _resultWizardState.useBudget = true;
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultApprovedAppsLoaded = false;

  // 패턴 감지 → mode 결정
  const avail = typeof getPersonaBudgets === 'function' ? getPersonaBudgets(currentPersona, _resultWizardState.purpose?.id) : [];
  const b = avail.find(x => x.id === budgetId);
  const pi = b && typeof getProcessPatternInfo !== 'undefined'
    ? getProcessPatternInfo(currentPersona, _resultWizardState.purpose?.id, b.accountCode)
    : null;
  _resultWizardState.processPattern = pi?.pattern || null;
  if (pi && ['A', 'B'].includes(pi.pattern)) {
    _resultWizardState.mode = 'from_application';
  } else {
    _resultWizardState.mode = 'direct';
  }
  renderResult();
}

function _resultSelectBudgetChoice(choice) {
  _resultWizardState.budgetChoice = choice;
  _resultWizardState.budgetId = '';
  _resultWizardState.selectedAppId = null;
  _resultWizardState.selectedApp = null;
  _resultWizardState.learningType = '';
  _resultApprovedAppsLoaded = false;

  if (choice === 'none') {
    _resultWizardState.useBudget = false;
    _resultWizardState.mode = 'direct';
  } else {
    _resultWizardState.useBudget = true;
    // 자동 매칭
    const budgets = typeof getPersonaBudgets === 'function' ? getPersonaBudgets(currentPersona, _resultWizardState.purpose?.id) : [];
    if (choice === 'general') {
      const b = budgets.find(x => x.account === '참가') || budgets[0];
      if (b) {
        _resultWizardState.budgetId = b.id;
        const pi = typeof getProcessPatternInfo !== 'undefined' ? getProcessPatternInfo(currentPersona, _resultWizardState.purpose?.id, b.accountCode) : null;
        _resultWizardState.processPattern = pi?.pattern || 'B';
        _resultWizardState.mode = ['A', 'B'].includes(pi?.pattern) ? 'from_application' : 'direct';
      }
    } else if (choice === 'rnd') {
      _resultWizardState.mode = 'from_application';
      _resultWizardState.processPattern = 'A';
    }
  }
  renderResult();
}

function _resultSelectApp(id, appData) {
  _resultWizardState.selectedAppId = id;
  _resultWizardState.selectedApp = typeof appData === 'string' ? JSON.parse(appData) : appData;
  _resultWizardState.mode = 'from_application';
  renderResult();
}

function _resultSelectEduType(value, parentValue) {
  _resultWizardState.learningType = value;
  _resultWizardState.eduType = parentValue;
  renderResult();
}

function _resultNext() {
  const s = _resultWizardState;
  // Step 2 → Step 3: 패턴 A/B에서 신청 미선택 차단
  if (s.step === 2 && s.mode === 'from_application' && !s.selectedAppId) {
    if (s.budgetChoice !== 'rnd' && s.purpose?.id === 'external_personal') {
      // 일반예산은 mode가 바뀔 수 있으므로 pass
    } else {
      alert('❗ 결과를 등록할 교육신청을 선택해주세요.');
      return;
    }
  }
  // Step 2 → Step 3: A/B 패턴 + 신청 선택 완료 → Step 3 건너뛰고 Step 4
  if (s.step === 2 && s.mode === 'from_application' && s.selectedAppId) {
    s.step = 4; // 신청 기반: 교육유형 이미 정해져 있으므로 건너뜀
    renderResult();
    return;
  }
  s.step = Math.min(s.step + 1, 4);
  renderResult();
}

function _resultPrev() {
  const s = _resultWizardState;
  // Step 4에서 이전: 신청 기반이면 Step 2로
  if (s.step === 4 && s.mode === 'from_application') {
    s.step = 2;
  } else {
    s.step = Math.max(s.step - 1, 1);
  }
  renderResult();
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
        edu_type: s.learningType || null,
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
          purpose: s.purpose?.id,
          learningType: s.learningType,
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
