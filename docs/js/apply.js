// ─── APPLY (교육신청) — 목록 ↔ 신청폼 ↔ 결과폼 전환 허브 ────────────────────

let _resultState = null;
function _resetResultState() {
  return {
    step: 1, purpose: null, budgetId: '', useBudget: false, title: '', date: '', endDate: '',
    hours: '', provider: '', resultText: '', expenses: [{ item: '수강료', price: '', qty: 1 }], attachments: []
  };
}

function renderApply() {
  if (typeof applyViewMode === 'undefined') applyViewMode = 'list';
  if (applyState && applyState.confirmMode) {
    _renderApplyConfirm();
  } else if (applyViewMode === 'form') {
    _renderApplyForm();
  } else if (applyViewMode === 'resultForm') {
    _renderResultForm();
  } else {
    _renderApplyList();
  }
}

// ─── 정책 기반 스마트 버튼 ─────────────────────────────────────────────────
// 패턴 A·B·E → 교육 신청 버튼 / 패턴 C·D → 교육결과 등록 버튼
function _applySmartButtons() {
  // SERVICE_POLICIES에서 현재 페르소나의 정책 확인
  let hasApplyPatterns = false;      // A, B, E
  let hasResultOnlyPatterns = false;  // C, D

  if (typeof SERVICE_POLICIES !== 'undefined' && SERVICE_POLICIES.length > 0) {
    const policies = SERVICE_POLICIES.filter(p => {
      if (p.status && p.status !== 'active') return false;
      const pTenantId = p.tenant_id || p.tenantId;
      if (pTenantId && pTenantId !== currentPersona.tenantId) return false;
      return true;
    });
    policies.forEach(p => {
      const pattern = p.process_pattern || p.processPattern || '';
      if (['A', 'B', 'E'].includes(pattern)) hasApplyPatterns = true;
      if (['C', 'D'].includes(pattern)) hasResultOnlyPatterns = true;
      // flow 기반 fallback
      if (!pattern) {
        if (['plan-apply-result', 'apply-result'].includes(p.flow)) hasApplyPatterns = true;
        if (p.flow === 'result-only') hasResultOnlyPatterns = true;
      }
    });
  }

  // 정책이 전혀 없으면 기본: 신청 버튼만 표시 (결과등록은 C/D 정책 있을 때만)
  if (!hasApplyPatterns && !hasResultOnlyPatterns) {
    hasApplyPatterns = true;
  }

  let btns = '';
  if (hasApplyPatterns) {
    btns += `<button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(0,44,95,.3);transition:all .15s"
      onmouseover="this.style.background='#0050A8'" onmouseout="this.style.background='#002C5F'">
      ✏️ 교육 신청
    </button>`;
  }
  if (hasResultOnlyPatterns) {
    btns += `<button onclick="applyViewMode='resultForm';_resultState=_resetResultState();renderApply()"
      style="display:flex;align-items:center;gap:8px;padding:12px 22px;border-radius:12px;
             background:#D97706;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;
             box-shadow:0 4px 16px rgba(217,119,6,.3);transition:all .15s"
      onmouseover="this.style.background='#B45309'" onmouseout="this.style.background='#D97706'">
      📝 교육결과 등록
    </button>`;
  }
  return btns;
}

// ─── 결과 전용 위저드 (패턴 C·D) ─────────────────────────────────────────────
function _renderResultForm() {
  const s = _resultState || _resetResultState();
  _resultState = s;

  const stepLabels = ['교육 정보', '비용 정보', '결과 작성'];
  const stepper = stepLabels.map((label, i) => {
    const n = i + 1;
    return `<div class="step-item flex items-center gap-2 ${s.step > n ? 'done' : s.step === n ? 'active' : ''}">
      <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all">${s.step > n ? '✓' : n}</div>
      <span class="text-xs font-bold ${s.step === n ? 'text-brand' : 'text-gray-400'} hidden sm:block">${label}</span>
      ${n < 3 ? '<div class="h-px flex-1 bg-gray-200 mx-2 w-8"></div>' : ''}
    </div>`;
  }).join('');

  let body = '';

  // Step 1: 교육 정보
  if (s.step === 1) {
    // BO form_templates 다이나믹 렌더링 시도
    const dyHtml = (s.formTemplate && s.formTemplate.fields && s.formTemplate.fields.length > 0
      && typeof renderDynamicFormFields === 'function')
      ? renderDynamicFormFields(s.formTemplate.fields, s, '_resultState') : '';

    if (dyHtml) {
      const tplBadge = s.formTemplate.name
        ? `<div style="margin-bottom:14px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>` : '';
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>${tplBadge}${dyHtml}`;
    } else if (s.formTemplateLoading) {
      body = `<h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>
        <div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
    } else {
      body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">01. 교육 정보 입력</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육과정명 *</label>
        <input id="rf-title" value="${s.title}" onchange="_resultState.title=this.value"
          style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px"
          placeholder="예: AWS 솔루션스 아키텍트 자격증 과정">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 시작일 *</label>
          <input id="rf-date" type="date" value="${s.date}" onchange="_resultState.date=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육 종료일 *</label>
          <input id="rf-enddate" type="date" value="${s.endDate}" onchange="_resultState.endDate=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">학습 시간(H)</label>
          <input id="rf-hours" type="number" value="${s.hours}" onchange="_resultState.hours=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="8">
        </div>
        <div>
          <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육기관</label>
          <input id="rf-provider" value="${s.provider}" onchange="_resultState.provider=this.value"
            style="width:100%;padding:10px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px" placeholder="교육기관명">
        </div>
      </div>
    </div>`;
    }
  }

  // Step 2: 비용 정보 (후정산 여부 선택)
  if (s.step === 2) {
    const expRows = s.expenses.map((e, i) => `
    <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;align-items:center">
      <input value="${e.item}" onchange="_resultState.expenses[${i}].item=this.value" placeholder="항목명"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.price}" onchange="_resultState.expenses[${i}].price=this.value" placeholder="단가"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <input type="number" value="${e.qty}" onchange="_resultState.expenses[${i}].qty=this.value" min="1"
        style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <span style="font-size:12px;font-weight:700;color:#374151">${((Number(e.price) || 0) * (Number(e.qty) || 1)).toLocaleString()}원</span>
      <button onclick="_resultState.expenses.splice(${i},1);renderApply()" style="border:none;background:none;cursor:pointer;font-size:14px;color:#DC2626"
        title="삭제">✕</button>
    </div>`).join('');
    const total = s.expenses.reduce((sum, e) => sum + (Number(e.price) || 0) * (Number(e.qty) || 1), 0);

    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">02. 비용 정보</h2>
    <div style="margin-bottom:16px">
      <div style="display:flex;gap:10px">
        <button onclick="_resultState.useBudget=true;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === true ? '#D97706' : '#E5E7EB'};
                 background:${s.useBudget === true ? '#FFFBEB' : 'white'};color:${s.useBudget === true ? '#D97706' : '#6B7280'}">
          🧾 후정산 (예산 사용)
        </button>
        <button onclick="_resultState.useBudget=false;renderApply()"
          style="flex:1;padding:14px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;transition:all .15s;
                 border:2px solid ${s.useBudget === false ? '#059669' : '#E5E7EB'};
                 background:${s.useBudget === false ? '#F0FDF4' : 'white'};color:${s.useBudget === false ? '#059669' : '#6B7280'}">
          📋 이력만 등록 (예산 미사용)
        </button>
      </div>
    </div>
    ${s.useBudget ? `
    <div style="margin-bottom:12px">
      <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:6px;display:block">예산 계정 선택</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${currentPersona.budgets.map(b => `
        <button onclick="_resultState.budgetId='${b.id}';renderApply()"
          style="padding:8px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;
                 border:2px solid ${s.budgetId === b.id ? '#D97706' : '#E5E7EB'};
                 background:${s.budgetId === b.id ? '#FFFBEB' : 'white'};color:${s.budgetId === b.id ? '#D97706' : '#6B7280'}">${b.account}</button>`).join('')}
      </div>
    </div>
    <div style="margin-bottom:8px">
      <div style="display:grid;grid-template-columns:2fr 1fr 60px 1fr 40px;gap:8px;margin-bottom:6px">
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">항목</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">단가</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">수량</span>
        <span style="font-size:10px;font-weight:800;color:#9CA3AF">소계</span>
        <span></span>
      </div>
      ${expRows}
      <button onclick="_resultState.expenses.push({item:'',price:'',qty:1});renderApply()"
        style="margin-top:8px;font-size:11px;font-weight:800;color:#D97706;background:none;border:1.5px dashed #FDE68A;
               padding:8px 14px;border-radius:8px;cursor:pointer;width:100%">+ 비용 항목 추가</button>
    </div>
    <div style="text-align:right;font-size:14px;font-weight:900;color:#D97706;padding:8px 0">
      정산 합계: ${total.toLocaleString()}원
    </div>` : `
    <div style="padding:24px;text-align:center;background:#F0FDF4;border-radius:12px;border:1.5px dashed #BBF7D0;margin-top:12px">
      <div style="font-size:13px;font-weight:800;color:#059669">✅ 예산 미사용 — 교육이력만 등록됩니다</div>
      <div style="font-size:11px;color:#6B7280;margin-top:4px">비용 정산 없이 학습 이력만 기록합니다.</div>
    </div>`}`;
  }

  // Step 3: 결과 작성
  if (s.step === 3) {
    body = `
    <h2 style="font-size:15px;font-weight:900;margin-bottom:16px">03. 교육 결과 작성</h2>
    <div style="display:grid;gap:14px">
      <div>
        <label style="font-size:11px;font-weight:800;color:#374151;margin-bottom:4px;display:block">교육결과 요약 *</label>
        <textarea id="rf-result" rows="5" onchange="_resultState.resultText=this.value"
          style="width:100%;padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;resize:vertical"
          placeholder="교육 수료 후 학습한 내용, 업무 적용 계획 등을 작성해 주세요.">${s.resultText}</textarea>
      </div>
      <div style="padding:20px;background:#F9FAFB;border-radius:12px;border:1.5px dashed #D1D5DB">
        <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">📎 첨부파일 (수료증, 영수증 등)</div>
        <div style="font-size:11px;color:#9CA3AF">파일 업로드 기능은 추후 제공 예정입니다.</div>
      </div>

      <!-- 요약 카드 -->
      <div style="padding:16px 20px;background:#EFF6FF;border-radius:12px;border:1.5px solid #BFDBFE">
        <div style="font-size:12px;font-weight:900;color:#1D4ED8;margin-bottom:8px">📋 등록 요약</div>
        <div style="font-size:12px;color:#374151;display:grid;gap:4px">
          <div>📚 ${s.title || '-'}</div>
          <div>📅 ${s.date || '-'} ~ ${s.endDate || '-'}</div>
          <div>⏱ ${s.hours || '-'}시간 · 🏢 ${s.provider || '-'}</div>
          <div>${s.useBudget ? '🧾 후정산 · ' + s.expenses.reduce((sum, e) => (sum + (Number(e.price) || 0) * (Number(e.qty) || 1)), 0).toLocaleString() + '원' : '📋 이력만 등록 (예산 미사용)'}</div>
        </div>
      </div>
    </div>`;
  }

  // 네비게이션
  const canNext1 = s.title && s.date && s.endDate;
  const canNext2 = s.useBudget !== null && (!s.useBudget || s.budgetId);

  document.getElementById('page-apply').innerHTML = `
<div class="max-w-4xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <button onclick="applyViewMode='list';renderApply()"
        style="font-size:11px;font-weight:800;color:#6B7280;background:none;border:none;cursor:pointer;padding:0;margin-bottom:6px;display:flex;align-items:center;gap:4px"
        onmouseover="this.style.color='#D97706'" onmouseout="this.style.color='#6B7280'">
        ← 목록으로
      </button>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육결과 등록</div>
      <h1 class="text-3xl font-black tracking-tight" style="color:#D97706">교육결과 등록</h1>
      <p style="font-size:11px;color:#9CA3AF;margin-top:2px">이미 수료한 교육의 결과를 등록합니다. 후정산 또는 이력만 기록할 수 있습니다.</p>
    </div>
  </div>

  <!-- Stepper -->
  <div class="card p-6">
    <div class="flex items-center gap-2">${stepper}</div>
  </div>

  <!-- Body -->
  <div class="card p-6">${body}</div>

  <!-- Nav -->
  <div style="display:flex;justify-content:space-between">
    ${s.step > 1 ? `<button onclick="_resultState.step--;renderApply()"
      style="padding:10px 20px;border-radius:10px;background:white;border:1.5px solid #E5E7EB;font-size:12px;font-weight:800;cursor:pointer;color:#374151">← 이전</button>` : '<div></div>'}
    ${s.step < 3 ? `<button onclick="_resultState.step++;renderApply()"
      ${(s.step === 1 && !canNext1) || (s.step === 2 && !canNext2) ? 'disabled' : ''}
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:${(s.step === 1 && canNext1) || (s.step === 2 && canNext2) ? '#D97706' : '#D1D5DB'};color:white;
             transition:all .15s">다음→</button>` : `
    <button onclick="alert('교육결과가 등록되었습니다.');applyViewMode='list';renderApply()"
      style="padding:10px 28px;border-radius:10px;font-size:12px;font-weight:900;border:none;cursor:pointer;
             background:#059669;color:white;transition:all .15s">
      ✅ 결과 등록 완료
    </button>`}
  </div>
</div>`;
}

// ─── 교육신청 목록 뷰 ──────────────────────────────────────────────────────────
// 신청 목록 탭 상태
let _applyListTab = 'mine'; // 'mine' | 'team'
let _applyYear = new Date().getFullYear(); // 연도 필터


// ─── 결과 등록 제출 (패턴 C/D) → DB 저장 ───────────────────────────────────
async function submitResult() {
  const rs = _resultState || {};
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      const appId = `RES-${Date.now()}`;
      const row = {
        id: appId, tenant_id: currentPersona.tenantId,
        plan_id: null, account_code: rs.accountCode || '',
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || '',
        edu_name: rs.eduName || '교육결과',
        edu_type: rs.eduType || null,
        amount: Number(rs.amount || 0), status: 'completed',
        policy_id: rs.policyId || null,
        detail: {
          purpose: rs.purpose || null, resultType: 'direct',
          completionDate: rs.completionDate || null,
          score: rs.score || null, notes: rs.notes || null,
        },
      };
      const { error } = await sb.from('applications').insert(row);
      if (error) throw error;
      console.log(`[submitResult] DB 저장 성공: ${appId}`);
    } catch (err) {
      console.error('[submitResult] DB 저장 실패:', err.message);
    }
  }
  alert('✅ 교육결과가 성공적으로 등록되었습니다.\n\n관리자 확인 후 이력에 반영됩니다.');
  _resultState = _resetResultState();
  applyViewMode = 'list';
  renderApply();
}

let _dbMyApps = [];
let _appsDbLoaded = false;

function _renderApplyList() {
  const STATUS_CFG = {
    '승인완료': { color: '#059669', bg: '#F0FDF4', border: '#BBF7D0', icon: '✅' },
    '반려': { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: '❌' },
    '결재진행중': { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '⏳' },
    '승인대기': { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', icon: '🕐' },
    '작성중': { color: '#0369A1', bg: '#EFF6FF', border: '#BFDBFE', icon: '📝' },
    '취소': { color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', icon: '🚫' },
  };

  const teamViewEnabled = currentPersona.teamViewEnabled ?? currentPersona.team_view_enabled ?? false;

  // DB 실시간 조회
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && !_appsDbLoaded) {
    _appsDbLoaded = true;
    sb.from('applications').select('*')
      .eq('applicant_id', currentPersona.id)
      .eq('tenant_id', currentPersona.tenantId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          _dbMyApps = data.map(d => ({
            id: d.id, title: d.edu_name, type: d.edu_type || '교육',
            date: d.created_at?.slice(0, 10) || '', endDate: d.created_at?.slice(0, 10) || '',
            hours: 0, amount: Number(d.amount || 0),
            budget: d.account_code || '', applyStatus: _mapAppDbStatus(d.status),
            resultDone: d.status === 'completed', author: d.applicant_name,
            rawStatus: d.status,
          }));
        }
        _renderApplyList();
      });
    return;
  }
  const myHistory = _dbMyApps;
  const teamHistory = teamViewEnabled ? _getSampleTeamHistory() : [];
  const history = _applyListTab === 'mine' ? myHistory : teamHistory;

  // 통계
  const statCounts = {
    total: history.length,
    approved: history.filter(h => h.applyStatus === '승인완료').length,
    inProgress: history.filter(h => h.applyStatus === '결재진행중').length,
    rejected: history.filter(h => h.applyStatus === '반려').length,
    pending: history.filter(h => h.applyStatus === '승인대기').length,
  };

  // Segmented tab
  const tabBar = teamViewEnabled ? `
  <div style="display:flex;gap:4px;background:#F3F4F6;padding:4px;border-radius:14px;margin-bottom:20px;width:fit-content">
    <button onclick="_applyListTab='mine';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === 'mine' ? '#fff' : 'transparent'};
      color:${_applyListTab === 'mine' ? '#002C5F' : '#6B7280'};
      box-shadow:${_applyListTab === 'mine' ? '0 1px 4px rgba(0,0,0,.12)' : 'none'}">
      👤 내 신청
    </button>
    <button onclick="_applyListTab='team';_renderApplyList()" style="
      padding:8px 20px;border-radius:10px;border:none;font-size:13px;font-weight:800;cursor:pointer;transition:all .15s;
      background:${_applyListTab === 'team' ? '#fff' : 'transparent'};
      color:${_applyListTab === 'team' ? '#002C5F' : '#6B7280'};
      box-shadow:${_applyListTab === 'team' ? '0 1px 4px rgba(0,0,0,.12)' : 'none'}">
      👥 팀 신청
    </button>
  </div>` : '';

  // 통계 카드
  const statsBar = `
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${[
      { label: '승인완료', val: statCounts.approved, color: '#059669', bg: '#F0FDF4', icon: '✅' },
      { label: '진행중', val: statCounts.inProgress, color: '#D97706', bg: '#FFFBEB', icon: '⏳' },
      { label: '반려', val: statCounts.rejected, color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
      { label: '승인대기', val: statCounts.pending, color: '#6B7280', bg: '#F9FAFB', icon: '🕐' },
    ].map(s => `
    <div style="background:${s.bg};border-radius:14px;padding:14px 16px;border:1.5px solid ${s.color}20">
      <div style="font-size:11px;font-weight:700;color:${s.color};margin-bottom:6px">${s.icon} ${s.label}</div>
      <div style="font-size:24px;font-weight:900;color:${s.color}">${s.val}<span style="font-size:13px;margin-left:2px">건</span></div>
    </div>`).join('')}
  </div>`;

  // 목록 행
  const rows = history.map(h => {
    const cfg = STATUS_CFG[h.applyStatus] || STATUS_CFG['승인대기'];
    const canResult = h.applyStatus === '승인완료';
    const authorBadge = h.author ? `<span style="font-size:10px;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:10px;margin-left:6px">👤 ${h.author}</span>` : '';
    return `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:18px 20px;border-radius:14px;
                border:1.5px solid ${cfg.border};background:${cfg.bg};transition:all .15s">
      <div style="font-size:24px;flex-shrink:0;margin-top:2px">${cfg.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:900;color:#111827">${h.title}</span>
          <span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:${cfg.color}20;color:${cfg.color}">${h.applyStatus}</span>
          ${h.resultDone ? '<span style="font-size:9px;font-weight:900;padding:2px 7px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">📋 결과작성완료</span>' : ''}
          ${authorBadge}
        </div>
        <div style="font-size:11px;color:#6B7280;display:flex;gap:12px;flex-wrap:wrap">
          <span>📅 ${h.date} ~ ${h.endDate}</span>
          <span>📚 ${h.type}</span>
          <span>💰 ${h.budget} · ${(h.amount || 0).toLocaleString()}원</span>
          <span>⏱ ${h.hours}H</span>
        </div>
        ${h.applyStatus === '반려' ? `
        <div style="margin-top:8px;padding:8px 12px;border-radius:8px;background:#FEE2E2;border:1px solid #FECACA;font-size:11px;color:#DC2626;font-weight:700">
          ⚠️ 반려 사유: 예산 잔액 부족으로 반려되었습니다. 예산 계획 수립 후 재신청 바랍니다.
        </div>` : ''}
      </div>
      <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${h.applyStatus === '작성중' ? `
        <button onclick="resumeApplyDraft('${h.id.replace(/'/g, "\\\'")}')" style="padding:8px 14px;border-radius:8px;background:#0369A1;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">✏️ 이어쓰기</button>
        <button onclick="deleteApplyDraft('${h.id.replace(/'/g, "\\\'")}')" style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">🗑 삭제</button>` : ''}
        ${(h.applyStatus === '승인대기' || h.applyStatus === '결재진행중') ? `
        <button onclick="cancelApply('${h.id.replace(/'/g, "\\\'")}')" style="padding:8px 14px;border-radius:8px;background:white;color:#DC2626;font-size:11px;font-weight:800;border:1.5px solid #FECACA;cursor:pointer;white-space:nowrap">취소 요청</button>` : ''}
        ${canResult && !h.resultDone ? `
        <button onclick="alert('교육결과 작성 기능 준비 중입니다.')"
          style="padding:8px 14px;border-radius:8px;background:#002C5F;color:white;font-size:11px;font-weight:800;border:none;cursor:pointer;white-space:nowrap">
          📝 결과 작성
        </button>` : ''}
        ${canResult && h.resultDone ? `
        <button style="padding:8px 14px;border-radius:8px;background:#F3F4F6;color:#9CA3AF;font-size:11px;font-weight:800;border:none;cursor:default;white-space:nowrap">
          ✅ 결과 제출 완료
        </button>` : ''}
      </div>
    </div>`;
  }).join('');

  const emptyMsg = `<div style="padding:60px 20px;text-align:center;border-radius:14px;background:#F9FAFB;border:1.5px dashed #D1D5DB">
    <div style="font-size:48px;margin-bottom:16px">📭</div>
    <div style="font-size:15px;font-weight:900;color:#374151;margin-bottom:6px">${_applyYear}년 교육신청 이력이 없습니다</div>
    <div style="font-size:12px;color:#9CA3AF;margin-bottom:20px;line-height:1.6">
      교육 신청을 하면 결재 진행 상황과 결과를 이 화면에서 확인할 수 있습니다.<br>
      위의 "교육 신청" 버튼으로 첫 신청을 시작해보세요.
    </div>
    <button onclick="applyViewMode='form';applyState=resetApplyState();renderApply()"
      style="padding:12px 28px;border-radius:12px;background:#002C5F;color:white;font-size:13px;font-weight:900;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">
      ✏️ 교육 신청하기
    </button>
  </div>`;

  // 연도 선택
  const curY = new Date().getFullYear();
  const yearSelector = `
  <select onchange="_applyYear=Number(this.value);_renderApplyList()"
    style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:13px;font-weight:800;color:#002C5F;background:white;cursor:pointer;appearance:auto">
    ${[curY + 1, curY, curY - 1, curY - 2].map(y => `<option value="${y}" ${_applyYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
  </select>`;

  document.getElementById('page-apply').innerHTML = `
<div class="max-w-4xl mx-auto space-y-4">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Home › 교육 신청</div>
      <h1 class="text-3xl font-black text-brand tracking-tight">교육신청 현황</h1>
      <p style="font-size:12px;color:#9CA3AF;margin-top:4px">${currentPersona.name} · ${currentPersona.dept}</p>
    </div>
    <div style="display:flex;gap:10px;align-items:center">
      ${yearSelector}
      ${_applySmartButtons()}
    </div>
  </div>
  ${tabBar}
  ${statsBar}
  <div class="card p-6">
    ${history.length === 0 ? emptyMsg : `<div style="display:flex;flex-direction:column;gap:10px">${rows}</div>`}
  </div>
</div>`;
}

// 팀 신청 샘플 (실제에서는 DB 조회)
function _getSampleTeamHistory() {
  return [
    { id: 'TH001', title: '팀원 A - SDV 세미나', type: '세미나', date: '2026-03-01', endDate: '2026-03-01', hours: 8, amount: 300000, budget: '운영', applyStatus: '승인완료', resultDone: false, author: '김O수' },
    { id: 'TH002', title: '팀원 B - 이러닝 과정', type: '이러닝', date: '2026-03-10', endDate: '2026-03-31', hours: 20, amount: 150000, budget: '운영', applyStatus: '결재진행중', resultDone: false, author: '이O진' },
  ];
}

// ─── 스텝 선택 내용 배너 (교육계획 위저드와 동일한 스타일) ────────────────────
function _applySelectionBanner(s, currentStep) {
  if (currentStep <= 1) return ''; // Step 1은 배너 불필요

  const items = [];

  // ① 목적 (Step 2+)
  if (s.purpose) {
    const purposeLabel = s.purpose.label || s.purpose.id || '';
    items.push({ num: '①', key: '목적', value: purposeLabel, color: '#002C5F' });
  }

  // ② 예산 (Step 3+)
  if (currentStep >= 3) {
    let budgetLabel = '';
    if (s.purpose?.id === 'external_personal') {
      // 개인직무 사외학습: budgetChoice 레이블
      const bcMap = {
        'general': '일반교육예산 참가계정',
        'rnd': 'R&D교육예산 계정',
        'hae-edu': '전사교육예산',
        'hae-team': '팀/프로젝트 할당예산',
        'none': '예산 미사용',
      };
      budgetLabel = s.budgetChoice ? (bcMap[s.budgetChoice] || s.budgetChoice) : '';
    } else {
      // 교육담당자: 선택한 예산 계정명
      const availBudgets = s.purpose ? getPersonaBudgets(currentPersona, s.purpose.id) : [];
      const chosen = availBudgets.find(b => b.id === s.budgetId);
      budgetLabel = chosen ? chosen.name : (s.budgetId || '');
    }
    if (budgetLabel) {
      items.push({ num: '②', key: '예산', value: budgetLabel, color: '#0369A1' });
    }
  }

  if (items.length === 0) return '';

  const itemsHtml = items.map(it => `
    <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:#374151">
      <span style="font-size:10px;color:#6B7280;font-weight:700">${it.num} ${it.key}</span>
      <span style="font-weight:900;padding:2px 8px;border-radius:6px;background:${it.color}14;color:${it.color};max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.value}</span>
    </span>`).join('<span style="color:#D1D5DB;margin:0 2px">|</span>');

  return `
    <div style="background:#F0F9FF;border:1.5px solid #BAE6FD;border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span style="font-size:10px;font-weight:900;color:#0369A1;white-space:nowrap">📌 선택 내용</span>
    <span style="color:#BAE6FD;font-size:12px">|</span>
    ${itemsHtml}
  </div > `;
}

// ─── 교육신청 폼 뷰 (기존 renderApply 로직) ──────────────────────────────────
function _renderApplyForm() {
  const s = applyState;

  // 정책 우선: 역할이 아닌 매칭 정책으로 UI 결정
  const policyResult = typeof _getActivePolicies !== 'undefined' ? _getActivePolicies(currentPersona) : null;
  const matchedPolicies = policyResult ? policyResult.policies : [];
  const allPurposes = getPersonaPurposes(currentPersona);
  const learnerPurposes = allPurposes.filter(p => p.id === 'external_personal');
  const operatorPurposes = allPurposes.filter(p => p.id !== 'external_personal');

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
    ${s.planId ? `
<div style="margin-bottom:16px;padding:12px 18px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;display:flex;align-items:center;gap:10px">
  <span style="font-size:20px">🔗</span>
  <div>
    <div style="font-size:12px;font-weight:900;color:#1D4ED8">교육계획 기반 신청</div>
    <div style="font-size:11px;color:#3B82F6;margin-top:2px">${(MOCK_PLANS.find(p => p.id === s.planId) || {}).title || s.planId} · 예산계정이 자동 연동되었습니다</div>
  </div>
</div>` : ''}
  </div>

  <!--Stepper indicator-->
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

  <!--Step 1: Purpose (정책 기반)-->
  <div class="card p-8 ${s.step === 1 ? '' : 'hidden'}">
    <h2 class="text-lg font-black text-gray-800 mb-6">01. 교육 목적 선택</h2>

    ${learnerPurposes.length > 0 ? `
    <!-- 👤 학습자 섹션 (정책 기반) -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-600 tracking-wider">👤 학습자</span>
        <span class="text-[11px] text-gray-400">본인이 직접 학습에 참여하는 경우</span>
      </div>
      <div class="grid grid-cols-1 gap-4">
        ${learnerPurposes.map(p => `
        <button onclick="selectPurpose('${p.id}')" class="p-6 rounded-2xl border-2 text-left transition-all hover:border-accent ${s.purpose?.id === p.id ? 'border-accent bg-blue-50 shadow-lg' : 'border-gray-200 bg-white'}">
          <div class="text-3xl mb-3">${p.icon}</div>
          <div class="font-black text-gray-900 text-sm mb-1 ${s.purpose?.id === p.id ? 'text-accent' : ''}">${p.label}</div>
          <div class="text-xs text-gray-500">${p.desc}</div>
        </button>`).join('')}
      </div>
    </div>` : ''}

    <!-- 🛠 교육담당자 섹션 (정책 기반) -->
    ${(() => {
      if (operatorPurposes.length === 0) return '';
      return `
    <div>
      <div class="flex items-center gap-2 mb-3">
        <span class="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 tracking-wider">🛠 교육담당자</span>
        <span class="text-[11px] text-gray-400">교육과정을 기획·운영하는 담당자</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${operatorPurposes.map(p => `
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

  <!--Step 2: Budget-->
  <div class="card p-8 ${s.step === 2 ? '' : 'hidden'}">
    ${_applySelectionBanner(s, 2)}
    <h2 class="text-lg font-black text-gray-800 mb-2">02. 예산 선택</h2>

    ${(() => {
      const isIndividual = s.purpose?.id === 'external_personal';
      if (isIndividual) {
        // ── 개인직무 사외학습: 페르소나별 동적 예산 옵션 카드 ──────────────────
        const allowed = currentPersona.allowedAccounts || [];
        const hasRnd = allowed.some(a => a.includes('RND'));
        const hasHscExt = allowed.includes('HSC-EXT');
        const hasHaeEdu = allowed.includes('HAE-EDU');
        const hasHaeTeam = allowed.includes('HAE-TEAM');
        const hasPart = allowed.some(a => a.includes('-PART') || a.includes('-OPS') || a.includes('-ETC'));
        const hasFree = allowed.includes('COMMON-FREE'); // 예산 미사용 정책 여부

        // ── 일반계정 카드 태그: 서비스 정책 process_pattern 기반 동적 결정 ──────
        // Pattern B: 신청→결과(즉시 예산 차감), Pattern C/D: 후정산, A/E: 신청→결과
        function _getGeneralCardTag() {
          if (typeof SERVICE_POLICIES !== 'undefined') {
            const pol = SERVICE_POLICIES.find(p =>
              p.status !== 'inactive' &&
              (p.account_codes || []).some(c => allowed.includes(c)) &&
              (p.purpose === 'external_personal' || p.purpose === '개인직무 사외학습')
            );
            if (pol) {
              const pt = pol.process_pattern || pol.processPattern || '';
              if (pt === 'B') return { tag: '패턴 B (신청→결과)', tagColor: '#B45309', tagBg: '#FFFBEB' };
              if (pt === 'C' || pt === 'D') return { tag: '후정산형', tagColor: '#D97706', tagBg: '#FEF3C7' };
              if (pt === 'A' || pt === 'E') return { tag: '신청→결과', tagColor: '#059669', tagBg: '#F0FDF4' };
            }
          }
          // DB에서 정책 못 읽으면 → 현재 테넌트 기본값
          return { tag: '패턴 B (신청→결과)', tagColor: '#B45309', tagBg: '#FFFBEB' };
        }
        const generalTag = _getGeneralCardTag();

        const CHOICES = [
          // ── HAE 전사교육예산 ──────────────────────────────────────────────────
          ...(hasHaeEdu ? [{
            id: 'hae-edu', icon: '🏫',
            title: '전사교육예산',
            desc: '현대오토에버 전사 공통 교육예산에서 교육비를 지원받습니다. 신청 승인 후 교육 이수 결과를 작성합니다.',
            tag: '신청→결과', tagColor: '#7C3AED', tagBg: '#F5F3FF',
            next: '교육유형 선택 → 세부정보', nextColor: '#7C3AED',
          }] : []),
          // ── HAE 팀/프로젝트 할당예산 ─────────────────────────────────────────
          ...(hasHaeTeam ? [{
            id: 'hae-team', icon: '👥',
            title: '팀/프로젝트 할당예산',
            desc: '팀 및 프로젝트 단위로 배정된 교육예산에서 교육비를 지원받습니다. 신청 승인 후 교육 이수 결과를 작성합니다.',
            tag: '신청→결과', tagColor: '#059669', tagBg: '#F0FDF4',
            next: '교육유형 선택 → 세부정보', nextColor: '#059669',
          }] : []),
          // ── HSC 사외교육 계정 ───────────────────────────────────────────────
          ...(hasHscExt ? [{
            id: 'general', icon: '🏭',
            title: '현대제철-사외교육 계정',
            desc: '현대제철 사외교육 예산에서 교육비를 지원받습니다. 신청 후 승인 시 예산이 차감되며, 이후 교육 결과를 작성합니다. (패턴 B: 신청 → 결과)',
            tag: '신청→결과', tagColor: '#BE123C', tagBg: '#FFF1F2',
            next: '교육유형 선택 → 세부정보', nextColor: '#BE123C',
          }] : []),
          // ── 일반 참가계정 (HMC/KIA 등) — 정책 패턴 태그 동적 표시 ─────────
          ...(!hasHscExt && !hasHaeEdu && hasPart ? [{
            id: 'general', icon: '💳',
            title: '일반교육예산 참가계정',
            desc: '일반 교육예산에서 참가비를 지원받습니다. 서비스 정책에 따라 신청 → 결과 또는 후정산 방식으로 처리됩니다.',
            tag: generalTag.tag, tagColor: generalTag.tagColor, tagBg: generalTag.tagBg,
            next: '교육유형 선택 → 세부정보', nextColor: '#059669',
          }] : []),
          ...(hasRnd ? [{
            id: 'rnd', icon: '🔬',
            title: 'R&D교육예산 계정',
            desc: '사전에 승인받은 R&D 교육계획과 연동하여 신청합니다. 교육계획 없이는 이 경로를 이용할 수 없습니다.',
            tag: '계획 연동 필수', tagColor: '#7C3AED', tagBg: '#F5F3FF',
            next: '교육계획 선택 → 세부정보', nextColor: '#7C3AED',
          }] : []),
          // ── 예산 미사용 — COMMON-FREE 정책 계정이 있을 때만 노출 ────────────
          ...(hasFree ? [{
            id: 'none', icon: '📝',
            title: '예산 미사용 (이력만 등록)',
            desc: '자비 학습·무료 강의 등 예산 사용 없이 학습 이력만 등록합니다. 예산 잔액에 영향을 주지 않습니다.',
            tag: '예산 미사용', tagColor: '#6B7280', tagBg: '#F3F4F6',
            next: '교육유형 선택 → 세부정보', nextColor: '#374151',
          }] : []),
        ];
        const bc = s.budgetChoice;
        return `<p class="text-sm text-gray-400 mb-5">이번 교육 신청에 어떤 예산을 사용하시겠습니까?</p>
<div style="display:grid;gap:10px;margin-bottom:4px">
${CHOICES.map(ch => {
          const active = bc === ch.id;
          const activeColor = ch.id === 'rnd' ? '#7C3AED' : ch.id === 'hae-edu' ? '#7C3AED' : ch.id === 'hae-team' ? '#059669' : ch.id === 'general' ? (hasHscExt ? '#BE123C' : '#059669') : '#9CA3AF';
          const col = active ? activeColor : '#E5E7EB';
          return `<button onclick="selectBudgetChoice('${ch.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${col};
         background:${active ? col + '12' : 'white'};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:flex-start;gap:14px">
    <div style="font-size:26px;flex-shrink:0;margin-top:2px">${ch.icon}</div>
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
        }).join('')}
</div>
${bc === 'rnd' ? _renderRndPlanPicker(s) : ''}`;
      }

      // ── 교육담당자 목적: DB 정책 기반 예산 계정 목록 ────────────────────────
      const policyBudgets = getPersonaBudgets(currentPersona, s.purpose?.id);
      if (policyBudgets.length === 0) {
        return `<p class="text-sm text-gray-500 mb-4 font-bold"><span class="text-orange-500">⚠️</span> 이 교육 목적에 사용 가능한 예산 계정이 없습니다.<br><span class="text-xs text-gray-400">담당자에게 문의하세요.</span></p>`;
      }
      return `<p class="text-sm text-gray-400 mb-5">이번 교육에 사용할 예산 계정을 선택하세요.</p>
<div style="display:grid;gap:8px">
${policyBudgets.map(b => {
        const active = s.budgetId === b.id;
        const acctTypeLabel = b.account === '운영' ? '운영 계정' : b.account === '참가' ? '참가 계정' : b.account + ' 계정';
        return `<button onclick="selectApplyBudget('${b.id}')"
  style="text-align:left;padding:18px 20px;border-radius:14px;border:2px solid ${active ? '#002C5F' : '#E5E7EB'};
         background:${active ? '#EFF6FF' : 'white'};cursor:pointer;width:100%;transition:all .15s">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:14px;font-weight:900;color:${active ? '#002C5F' : '#111827'}">${b.name}</div>
      <div style="font-size:11px;color:#9CA3AF;margin-top:3px">${acctTypeLabel}</div>
    </div>
    ${active ? '<span style="font-size:11px;font-weight:900;padding:3px 10px;border-radius:6px;background:#DBEAFE;color:#1D4ED8">선택됨</span>' : ''}
  </div>
</button>`;
      }).join('')}
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


  <!--Step 3: 교육유형 선택-->
  <div class="card p-8 ${s.step === 3 ? '' : 'hidden'}">
    ${_applySelectionBanner(s, 3)}
    <h2 class="text-lg font-black text-gray-800 mb-6">03. 교육유형 선택</h2>
    ${(() => {
      // 정책 기반 교육유형 트리 우선 사용
      const tree = typeof getPolicyEduTree !== 'undefined' && curBudget
        ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account)
        : [];

      if (tree.length > 0) {
        // ── 정책 기반 트리 렌더링 ──
        return tree.map(node => {
          const isLeaf = !node.subs || node.subs.length === 0;
          const isSelected = s.eduType === node.id;
          if (isLeaf) {
            const leafSelected = isSelected && !s.subType;
            return `
        <div class="mb-3">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 rounded-xl border-2 text-sm font-bold text-left transition
                   ${leafSelected ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'border-gray-200 text-gray-700 hover:border-accent hover:text-accent'}">${node.label}</button>
        </div>`;
          } else {
            return `
        <div class="mb-3 rounded-xl border-2 overflow-hidden ${isSelected ? 'border-gray-900' : 'border-gray-200'}">
          <button onclick="applyState.eduType='${node.id}';applyState.subType='';renderApply()"
            class="w-full p-4 text-sm font-bold text-left transition flex items-center justify-between
                   ${isSelected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}">
            <span>${node.label}</span>
            <span class="text-xs ${isSelected ? 'text-gray-300' : 'text-gray-400'}">${isSelected ? '▼' : '▶'} ${node.subs.length}개 세부유형</span>
          </button>
          ${isSelected ? `
          <div class="p-4 bg-gray-50 border-t border-gray-200">
            <div class="text-xs font-black text-blue-500 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
              세부 교육유형을 선택하세요
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${node.subs.map(st => `
              <button onclick="applyState.subType='${st.key}';renderApply()"
                class="p-3 rounded-xl border-2 text-sm font-bold text-left transition
                       ${s.subType === st.key ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50'}">${st.label}</button>
              `).join('')}
            </div>
          </div>` : ''}
        </div>`;
          }
        }).join('');
      }

      // ── Fallback: PURPOSES subtypes 기반 (기존 방식) ──
      const subtypes = s.purpose?.subtypes || null;
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
      ${(() => {
      const tree2 = typeof getPolicyEduTree !== 'undefined' && curBudget
        ? getPolicyEduTree(currentPersona, s.purpose?.id, curBudget.account) : [];
      if (tree2.length > 0) {
        const selNode = tree2.find(n => n.id === s.eduType);
        const isLeaf = selNode && (!selNode.subs || selNode.subs.length === 0);
        const canNext = s.eduType && (isLeaf || s.subType);
        return `<button onclick="applyNext()" ${!canNext ? 'disabled' : ''}
            class="px-8 py-3 rounded-xl font-black text-sm transition ${!canNext ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">다음 →</button>`;
      }
      const dis = s.purpose?.subtypes && !s.subType;
      return `<button onclick="applyNext()" ${dis ? 'disabled' : ''}
          class="px-8 py-3 rounded-xl font-black text-sm transition ${dis ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-blue-900 shadow-lg'}">다음 →</button>`;
    })()}
    </div>
  </div>

  <!--Step 4: Detail-->
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
        ${(() => {
      // BO 양식이 로드된 경우 → 동적 렌더링
      if (s.formTemplate && s.formTemplate.fields && s.formTemplate.fields.length > 0) {
        const dynamicHtml = (typeof renderDynamicFormFields === 'function')
          ? renderDynamicFormFields(s.formTemplate.fields, s, 'applyState') : '';
        if (dynamicHtml) {
          const tplBadge = s.formTemplate.name
            ? `<div style="margin-bottom:16px;padding:8px 14px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;font-size:11px;font-weight:700;color:#1D4ED8">📋 양식: ${s.formTemplate.name}</div>` : '';
          return tplBadge + dynamicHtml;
        }
      }
      if (s.formTemplateLoading) {
        return `<div style="padding:32px;text-align:center;color:#6B7280;font-size:14px;font-weight:600"><div style="font-size:28px;margin-bottom:8px">⌛</div>양식 로딩 중...</div>`;
      }
      // ── Fallback: 양식 미설정 ──
      return `
        <!-- Region toggle -->
        <div class="inline-flex bg-gray-100 rounded-xl p-1">
          <button onclick="applyState.region='domestic';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'domestic' ? 'bg-white text-accent shadow' : ' text-gray-500'}">🗺 국내</button>
          <button onclick="applyState.region='overseas';renderApply()" class="px-5 py-2 rounded-lg text-sm font-bold transition ${s.region === 'overseas' ? 'bg-white text-accent shadow' : 'text-gray-500'}">🌏 해외</button>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">과정명 <span class="text-red-500">*</span></label>
          <input type="text" value="${s.title}" oninput="applyState.title=this.value" placeholder="교육/세미나/자격증 등 공식 명칭" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">시작일</label>
            <input type="date" value="${s.startDate}" oninput="applyState.startDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
          <div>
            <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">종료일</label>
            <input type="date" value="${s.endDate}" oninput="applyState.endDate=this.value;renderApply()" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">총 학습시간 (H)</label>
          <input type="number" value="${s.hours}" oninput="applyState.hours=this.value" placeholder="0" class="w-40 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition" />
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">학습 내용 <span class="text-red-500">*</span></label>
          <textarea oninput="applyState.content=this.value" rows="3" placeholder="학습 목표, 주요 커리큘럼 및 활용 방안을 입력하세요." class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content}</textarea>
        </div>`;
    })()}

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
          <button onclick="saveApplyDraft()" class="px-6 py-3 rounded-xl font-black text-sm border-2 border-blue-200 text-blue-700 hover:bg-blue-50 transition">💾 임시저장</button>
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
  </div>` : ''
    }
</div > `;
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
async function submitApply() {
  if (!applyState.eduName && !applyState.title) { alert('교육명을 입력해주세요.'); return; }
  applyState.confirmMode = true;
  renderApply();
}

// ─── 신청 작성확인 화면 ──────────────────────────────────────────
function _renderApplyConfirm() {
  const s = applyState;
  const totalExp = s.expenses.reduce((sum, e) => sum + Number(e.price) * Number(e.qty), 0);
  const curBudget = s.budgetId
    ? (currentPersona.budgets || []).find(b => b.id === s.budgetId) : null;
  const accountCode = curBudget?.accountCode || '';

  document.getElementById('page-apply').innerHTML = `
  <div class="max-w-3xl mx-auto">
    <div style="background:white;border-radius:20px;border:1.5px solid #E5E7EB;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08)">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#002C5F,#0369A1);color:white">
        <div style="font-size:11px;font-weight:700;opacity:.7;margin-bottom:4px">✅ 작성 확인</div>
        <h2 style="margin:0;font-size:20px;font-weight:900">교육신청 제출 전 확인</h2>
        <p style="margin:6px 0 0;font-size:12px;opacity:.8">아래 내용을 확인한 후 확정하면 결재라인으로 전달됩니다.</p>
      </div>
      <div style="padding:24px 28px">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280;width:120px">교육명</td>
            <td style="padding:12px 0;font-weight:900;color:#111827">${s.eduName || s.title || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">예산계정</td>
            <td style="padding:12px 0;color:#374151">${accountCode || '-'}</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">신청 금액</td>
            <td style="padding:12px 0;font-weight:900;color:#002C5F;font-size:16px">${totalExp.toLocaleString()}원</td>
          </tr>
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:12px 0;font-weight:800;color:#6B7280">교육등록비 내역</td>
            <td style="padding:12px 0;color:#374151">${s.expenses.map(e => e.type + ' ' + Number(e.price).toLocaleString() + '원 x' + e.qty).join(', ') || '-'}</td>
          </tr>
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#FEF3C7;border-radius:10px;border:1.5px solid #FDE68A;font-size:12px;color:#92400E">
          ⚠️ 제출 후에는 결재라인이 자동 구성되며, 상위 승인자가 취소하기 전까지 취소가 불가합니다.
        </div>
      </div>
      <div style="padding:16px 28px 24px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #F3F4F6">
        <button onclick="applyState.confirmMode=false;renderApply()" style="padding:10px 24px;border-radius:12px;font-size:13px;font-weight:800;border:1.5px solid #E5E7EB;background:white;color:#6B7280;cursor:pointer">← 수정하기</button>
        <button onclick="confirmApply()" style="padding:10px 28px;border-radius:12px;font-size:13px;font-weight:900;border:none;background:#002C5F;color:white;cursor:pointer;box-shadow:0 4px 16px rgba(0,44,95,.3)">✅ 확정 제출</button>
      </div>
    </div>
  </div>`;
}

// ─── 신청 확정 제출 ────────────────────────────────────────────
async function confirmApply() {
  const svc = typeof SERVICE_DEFINITIONS !== 'undefined' && applyState.serviceId
    ? SERVICE_DEFINITIONS.find(sv => sv.id === applyState.serviceId) : null;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      const curBudget = applyState.budgetId
        ? (currentPersona.budgets || []).find(b => b.id === applyState.budgetId) : null;
      const totalExp = applyState.expenses.reduce((sum, e) => sum + Number(e.price) * Number(e.qty), 0);
      const appId = applyState.editId || `APP-${Date.now()}`;
      const row = {
        id: appId, tenant_id: currentPersona.tenantId,
        plan_id: applyState.planId || null,
        account_code: curBudget?.accountCode || '',
        applicant_id: currentPersona.id,
        applicant_name: currentPersona.name,
        dept: currentPersona.dept || '',
        edu_name: applyState.eduName || applyState.title || '교육신청',
        edu_type: applyState.eduType || applyState.eduSubType || null,
        amount: totalExp, status: 'pending',
        policy_id: applyState.policyId || null,
        detail: {
          purpose: applyState.purpose?.id || null,
          budgetId: applyState.budgetId || null,
          expenses: applyState.expenses,
          serviceId: applyState.serviceId || null,
          applyMode: svc?.applyMode || null,
        },
      };
      const { error } = await sb.from('applications').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      console.log(`[confirmApply] DB 제출 성공: ${appId}`);
    } catch (err) {
      alert('제출 실패: ' + err.message);
      return;
    }
  }
  alert('✅ 교육신청서가 성공적으로 제출되었습니다.\n\n담당자 검토 후 알림이 발송됩니다.');
  applyState = resetApplyState();
  applyViewMode = 'list';
  _appsDbLoaded = false;
  navigate('history');
}

// ─── 신청 임시저장 ──────────────────────────────────────────────
async function saveApplyDraft() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 실패'); return; }
  try {
    const curBudget = applyState.budgetId
      ? (currentPersona.budgets || []).find(b => b.id === applyState.budgetId) : null;
    const totalExp = applyState.expenses.reduce((sum, e) => sum + Number(e.price) * Number(e.qty), 0);
    const appId = applyState.editId || `DRAFT-APP-${Date.now()}`;
    const row = {
      id: appId, tenant_id: currentPersona.tenantId,
      plan_id: applyState.planId || null,
      account_code: curBudget?.accountCode || '',
      applicant_id: currentPersona.id,
      applicant_name: currentPersona.name,
      dept: currentPersona.dept || '',
      edu_name: applyState.eduName || applyState.title || '교육신청',
      edu_type: applyState.eduType || applyState.eduSubType || null,
      amount: totalExp, status: 'draft',
      policy_id: applyState.policyId || null,
      detail: {
        purpose: applyState.purpose?.id || null,
        budgetId: applyState.budgetId || null,
        expenses: applyState.expenses,
      },
    };
    const { error } = await sb.from('applications').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    applyState.editId = appId;
    alert('💾 임시저장되었습니다.');
  } catch (err) {
    alert('임시저장 실패: ' + err.message);
  }
}

// ─── 신청 취소 ────────────────────────────────────────────────────
async function cancelApply(appId) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try {
      const { data } = await sb.from('applications').select('status').eq('id', appId).single();
      if (data?.status === 'approved') {
        alert('⚠️ 이미 승인된 신청은 상위 승인자가 취소해야 합니다.');
        return;
      }
    } catch (e) { /* pass */ }
  }
  if (!confirm('이 교육신청을 취소하시겠습니까?')) return;
  if (sb) {
    try {
      await sb.from('applications').update({ status: 'cancelled' }).eq('id', appId);
      alert('교육신청이 취소되었습니다.');
    } catch (err) { alert('취소 실패: ' + err.message); return; }
  }
  _appsDbLoaded = false;
  _renderApplyList();
}

// ─── 신청 임시저장 이어쓰기/삭제 ────────────────────────────────────
async function resumeApplyDraft(appId) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb.from('applications').select('*').eq('id', appId).single();
    if (error || !data) { alert('임시저장 건을 불러올 수 없습니다.'); return; }
    applyState = resetApplyState();
    applyState.editId = data.id;
    applyState.eduName = data.edu_name || '';
    applyState.title = data.edu_name || '';
    applyState.eduType = data.edu_type || '';
    applyState.budgetId = data.detail?.budgetId || '';
    applyState.expenses = data.detail?.expenses || [{ id: 1, type: '교육비/등록비', price: 0, qty: 1 }];
    applyState.policyId = data.policy_id || null;
    if (data.detail?.purpose) applyState.purpose = { id: data.detail.purpose };
    applyState.step = 3;
    applyViewMode = 'form';
    renderApply();
  } catch (err) { alert('불러오기 실패: ' + err.message); }
}

async function deleteApplyDraft(appId) {
  if (!confirm('임시저장된 신청을 삭제하시겠습니까?')) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb) {
    try { await sb.from('applications').delete().eq('id', appId).eq('status', 'draft'); }
    catch (err) { console.error('[deleteApplyDraft]', err.message); }
  }
  _appsDbLoaded = false;
  _renderApplyList();
}

// ─── DB 상태 매핑 ────────────────────────────────────────────────────
function _mapAppDbStatus(s) {
  const m = { draft: '작성중', pending: '승인대기', approved: '승인완료', completed: '승인완료', rejected: '반려', cancelled: '취소' };
  return m[s] || s || '승인대기';
}

function selectService(id) {
  const svc = typeof SERVICE_DEFINITIONS !== 'undefined'
    ? SERVICE_DEFINITIONS.find(sv => sv.id === id) : null;
  applyState.serviceId = id;
  applyState.applyMode = svc ? svc.applyMode : null;
  applyState.useBudget = svc ? svc.budgetLinked : null;
  applyState.budgetId = '';
  applyState.planId = '';
  applyState.planIds = [];
  renderApply();
}

// ── 교육담당자 예산 계정 선택 (apply.js) ────────────────────────────────────
function selectApplyBudget(budgetId) {
  applyState.budgetId = budgetId;
  applyState.useBudget = true;
  applyState.planId = '';
  applyState.planIds = [];
  const b = (currentPersona.budgets || []).find(b => b.id === budgetId);
  applyState.applyMode = 'holding'; // 운영계정 = 계획 선신청
  renderApply();
}

// ─── 개인직무 사외학습 전용: 예산 선택 ─────────────────────────────────────────
function selectBudgetChoice(choice) {
  applyState.budgetChoice = choice;
  applyState.budgetId = '';
  applyState.planId = '';
  applyState.planIds = [];
  applyState.serviceId = '';

  // 정책 기반: 선택한 예산에 매칭되는 정책의 apply_mode로 결정
  const budgets = currentPersona.budgets || [];
  if (choice === 'none') {
    applyState.applyMode = null;
    applyState.useBudget = false;
  } else if (choice === 'rnd') {
    applyState.applyMode = 'holding';
    applyState.useBudget = true;
    const b = budgets.find(b => (b.accountCode || '').includes('RND') || b.account === '연구투자');
    if (b) applyState.budgetId = b.id;
  } else if (choice === 'general') {
    // 정책에서 applyMode 확인, 기본 reimbursement
    const policyResult = typeof _getActivePolicies !== 'undefined' ? _getActivePolicies(currentPersona) : null;
    const policies = policyResult ? policyResult.policies : [];
    const matchedPolicy = policies.find(p =>
      (p.purpose === 'external_personal' || p.purpose === 'personal_external') &&
      !((p.account_codes || p.accountCodes || []).some(c => c.includes('RND')))
    );
    applyState.applyMode = matchedPolicy?.apply_mode || matchedPolicy?.applyMode || 'reimbursement';
    applyState.useBudget = true;
    if (budgets.length >= 1) applyState.budgetId = budgets[0].id;
  } else {
    // 기타 선택지: 예산 목록에서 account name 매칭
    applyState.applyMode = 'holding';
    applyState.useBudget = true;
    const b = budgets.find(b => b.id === choice || b.account === choice);
    if (b) applyState.budgetId = b.id;
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
  const rndPlans = MOCK_PLANS.filter(p => p.account === '연구투자' || (p.budgetId || '').includes('RND'));
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
      + '<div style="font-size:10px;color:#9CA3AF;margin-top:2px">예산: ' + (p.amount || 0).toLocaleString() + '원 &nbsp;·&nbsp; 잔액: ' + ((p.amount || 0) - (p.used || 0)).toLocaleString() + '원</div>'
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
  const s = applyState;
  // Step 2: R&D 선택시 교육계획 없으면 진행 차단
  if (s.step === 2 && s.budgetChoice === 'rnd' && !s.planId) {
    const picker = document.getElementById('rnd-plan-picker-alert');
    if (picker) {
      picker.style.animation = 'none';
      requestAnimationFrame(() => { picker.style.animation = 'shake .3s ease'; });
    } else {
      alert('❗ R&D 교육예산을 사용하려면 승인된 R&D 교육계획을 먼저 선택해주세요.');
    }
    return;
  }
  if (s.step === 2 && s.budgetChoice === 'rnd') {
    s.step = 4; // R&D: 교육유형 건너뜀 → 바로 세부정보
  } else {
    s.step = Math.min(s.step + 1, 4);
  }
  // Step4 진입 시 BO form_template 비동기 로드
  const nextStep = s.step;
  if (nextStep === 4 && !s.formTemplate) {
    s.formTemplateLoading = true;
    renderApply();
    const policies = (typeof _getActivePolicies === 'function')
      ? (_getActivePolicies(currentPersona)?.policies || []) : [];
    const purposeId = s.purpose?.id;
    const accCode = (() => {
      const budgets = currentPersona?.budgets || [];
      const b = budgets.find(x => x.id === s.budgetId);
      return b?.accountCode || b?.account_code || null;
    })();
    const matched = policies.find(p => {
      const acc = p.account_codes || p.accountCodes || [];
      return (!purposeId || p.purpose === purposeId) && (!accCode || acc.includes(accCode));
    }) || policies.find(p => (p.account_codes || p.accountCodes || []).includes(accCode))
      || policies[0] || null;
    (async () => {
      let tpl = null;
      if (matched && typeof getFoFormTemplate === 'function') {
        tpl = await getFoFormTemplate(matched, 'apply');
      }
      s.formTemplate = tpl || null;
      s.formTemplateLoading = false;
      renderApply();
    })();
    return;
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

