// [2.3] 예산-조직-양식 통합 매핑 룰 빌더 (Top-down)
// =============================================================================
let _s3Tenant = 'HMG';
let _s3EditingRuleId = null;
function _s3GetGroups(tid) { return _s2GetGroups(tid); }

function renderStep3() {
    const tenantId = boCurrentPersona.tenantId || _s3Tenant;
    _s3Tenant = tenantId;
    const rules = FORM_BUDGET_RULES.filter(r => r.tenantId === tenantId);
    const accounts = getTenantAccounts(tenantId);
    const groups = _s3GetGroups(tenantId);
    const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;

    // 예산 단위로 그룹핑
    const accGrouped = {};
    rules.forEach(r => {
        if (!accGrouped[r.accountCode]) accGrouped[r.accountCode] = [];
        accGrouped[r.accountCode].push(r);
    });

    const ruleCards = Object.keys(accGrouped).map(code => {
        const acc = accounts.find(a => a.code === code);
        if (!acc) return '';
        const accCards = accGrouped[code].map(r => {
            const group = groups.find(g => g.id === r.virtualGroupId) || { name: r.virtualGroupId };
            const applyForm = FORM_MASTER.find(f => f.id === r.formId) || { name: r.formId };
            const planForm = r.planFormId ? FORM_MASTER.find(f => f.id === r.planFormId) : null;

            const ltHtml = r.learningTypes && r.learningTypes.length ? r.learningTypes.map(lt =>
                `<span style="background:#F5F3FF;color:#6D28D9;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700">${lt}</span>`
            ).join('') : '<span style="font-size:11px;color:#9CA3AF">모든 유형</span>';

            const planSection = acc.planRequired
                ? `<div style="margin-top:10px;padding:10px 14px;background:#EFF6FF;border-radius:8px;border-left:3px solid #1D4ED8;display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;font-weight:700;color:#1E40AF">&#128203; 강제 계획 연동:</span>
            ${planForm ? `<span style="background:#DBEAFE;color:#1E40AF;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700">${planForm.name}</span>` : '<span style="color:#EF4444;font-size:12px;font-weight:700">&#9888; 미연결</span>'}
            ${r.multiPlanAllowed ? '<span style="background:#ECFDF5;color:#059669;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:800;margin-left:auto">복수 계획 선택 허용</span>' : ''}
          </div>` : '';

            return `<div style="padding:12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px;background:#fff">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="bo-rule-label if-label">조직</span>
              <span style="font-size:13px;font-weight:700;color:#111827">${group.name}</span>
              <span style="color:#9CA3AF;font-size:13px">&#10145;</span>
              <span class="bo-rule-label then-label">양식</span>
              <span style="font-size:13px;font-weight:700;padding:2px 10px;border-radius:8px;background:#F3F4F6;color:#374151">&#128196; ${applyForm.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:12px;color:#6B7280;font-weight:600">허용 학습유형:</span>
              ${ltHtml}
            </div>
            ${planSection}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="openEditRuleModal('${r.id}')" style="border:1.5px dashed #D1D5DB;background:none;border-radius:8px;padding:4px 10px;font-size:12px;color:#9CA3AF;cursor:pointer">편집</button>
            <button onclick="s3DeleteRule('${r.id}')" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:16px;padding:4px">X</button>
          </div>
        </div>
      </div>`;
        }).join('');

        return `
    <div class="bo-rule-card" style="margin-bottom:14px;padding:20px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid #F3F4F6">
        <span style="font-size:16px">&#128179;</span>
        <span style="font-size:15px;font-weight:800;color:#1E40AF">${acc.name}</span>
        <code style="background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${acc.code}</code>
        <span style="font-size:11px;color:#6B7280;margin-left:auto">${acc.planRequired ? '사전계획 필수' : '계획 불필요'} 계정</span>
      </div>
      ${accCards}
    </div>`;
    }).join('');

    const modalHtml = `
  <div id="s3-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:600px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 id="s3-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">정책 상세 설정</h3>
        <button onclick="s3CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">X</button>
      </div>
      <div id="s3-modal-body"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:24px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="s3CloseModal()">취소</button>
        <button class="bo-btn-primary bo-btn-sm" onclick="s3SaveRule()">저장</button>
      </div>
    </div>
  </div>`;

    return `
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:13px;font-weight:800;color:#111827">${tenantName} - 예산 ↔ 가상조직 ↔ 양식/학습유형 통합 정책 (Top-down)</div>
        <div style="font-size:12px;color:#6B7280">${rules.length}개의 통합 매핑 정책이 설정됨</div>
      </div>
      <button class="bo-btn-primary bo-btn-sm" onclick="openAddRuleModal()">+ 새 정책 추가</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">${ruleCards || '<div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">설정된 정책이 없습니다.</div>'}</div>
  </div>${modalHtml}`;
}

function s3ChangeTenant(tid) { _s3Tenant = tid; document.getElementById('bm-content').innerHTML = renderStep3(); }

function s3DeleteRule(ruleId) {
    if (!confirm('이 정책을 삭제하시겠습니까?')) return;
    const idx = FORM_BUDGET_RULES.findIndex(x => x.id === ruleId);
    if (idx > -1) FORM_BUDGET_RULES.splice(idx, 1);
    document.getElementById('bm-content').innerHTML = renderStep3();
}

function _s3ModalBody(rule) {
    const tenantId = boCurrentPersona.tenantId || _s3Tenant;
    const groups = _s3GetGroups(tenantId);
    const accounts = getTenantAccounts(tenantId);
    const applyForms = getTenantForms(tenantId, 'apply');
    const planForms = getTenantForms(tenantId, 'plan');

    const accVal = rule?.accountCode || '';
    const gVal = rule?.virtualGroupId || '';
    const fVal = rule?.formId || '';
    const planFmVal = rule?.planFormId || '';
    const selLt = rule?.learningTypes || [];
    const multi = rule?.multiPlanAllowed || false;

    const selAcc = accounts.find(a => a.code === accVal);
    const planReq = selAcc?.planRequired || false;

    const ltHtml = LEARNING_TYPES.map(cat => `
    <div style="margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">${cat.category}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${cat.items.map(item => `
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer">
          <input type="checkbox" class="s3-lt-cb" value="${item}" ${selLt.includes(item) ? 'checked' : ''} style="accent-color:#6D28D9"> ${item}
        </label>`).join('')}
      </div>
    </div>
  `).join('');

    return `
  <div style="margin-bottom:14px;padding:12px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#1E40AF;display:block;margin-bottom:5px">1. 예산 선택 (Budget)</label>
    <select id="s3-account" onchange="s3UpdateModalDynamic()" style="width:100%;padding:9px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;background:#EFF6FF;font-weight:700">
      <option value="">— 예산 계정 선택 —</option>
      ${accounts.map(a => `<option value="${a.code}" ${accVal === a.code ? 'selected' : ''} data-plan="${a.planRequired}">${a.name} (${a.code}) - ${a.planRequired ? '사전계획 필수' : '계획 불필요'}</option>`).join('')}
    </select>
  </div>
  
  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">2. 대상 조직 할당 (Organization)</label>
    <select id="s3-group" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
      <option value="">— 가상 조직 선택 —</option>
      ${groups.map(g => `<option value="${g.id}" ${gVal === g.id ? 'selected' : ''}>${g.name}</option>`).join('')}
    </select>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:5px">3-1. 허용 양식 설정 (Forms)</label>
    <div style="margin-bottom:8px">
      <span style="font-size:11px;color:#6B7280;margin-bottom:2px;display:block">신청 양식 (학습자 화면 진입점)</span>
      <select id="s3-apply-form" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        <option value="">— 신청 양식 선택 —</option>
        ${applyForms.map(f => `<option value="${f.id}" ${fVal === f.id ? 'selected' : ''}>&#128196; ${f.name}</option>`).join('')}
      </select>
    </div>
    <div id="s3-plan-div" style="display:${planReq ? 'block' : 'none'};background:#F5F3FF;padding:10px;border-radius:8px;border:1px solid #DDD6FE">
      <span style="font-size:11px;font-weight:700;color:#5B21B6;margin-bottom:4px;display:block">미리 세워둔 사전 계획 양식 (선택된 예산이 '계획 필수'이므로 강제 노출)</span>
      <select id="s3-plan-form" style="width:100%;padding:9px 12px;border:1.5px solid #C4B5FD;border-radius:8px;font-size:13px;background:#fff;margin-bottom:10px">
        <option value="">— 계획 양식 선택 —</option>
        ${planForms.map(f => `<option value="${f.id}" ${planFmVal === f.id ? 'selected' : ''}>&#128203; ${f.name}</option>`).join('')}
      </select>
      <label class="bo-toggle-wrap" style="gap:10px">
        <label class="bo-toggle green"><input type="checkbox" id="s3-multi" ${multi ? 'checked' : ''}><span class="bo-toggle-slider"></span></label>
        <div>
          <div style="font-size:11px;font-weight:700;color:#059669">복수 교육계획 선택 허용 (Multi-select)</div>
          <div style="font-size:10px;color:#6B7280">운영 단위 담당자가 한 번에 여러 건의 승인된 계획을 합쳐 신청할 때 사용</div>
        </div>
      </label>
    </div>
  </div>

  <div style="margin-bottom:14px;padding:12px;background:#FAFAFA;border:1px solid #E5E7EB;border-radius:8px">
    <label style="font-size:12px;font-weight:800;color:#111827;display:block;margin-bottom:8px">3-2. 허용 학습유형 제어 (Learning Types)</label>
    <div style="font-size:11px;color:#6B7280;margin-bottom:10px">이 정책 하에서 허용할 세부 교육 항목을 체크해 주세요.</div>
    <div style="padding:12px;background:#fff;border:1px solid #E5E7EB;border-radius:8px">
      ${ltHtml}
    </div>
  </div>`;
}

function s3UpdateModalDynamic() {
    const accSelect = document.getElementById('s3-account');
    const opt = accSelect.options[accSelect.selectedIndex];
    const isPlanReq = opt && opt.dataset.plan === 'true';
    const planDiv = document.getElementById('s3-plan-div');
    if (planDiv) planDiv.style.display = isPlanReq ? 'block' : 'none';
}

function openAddRuleModal() {
    _s3EditingRuleId = null;
    document.getElementById('s3-modal-title').textContent = '새 통합 정책 추가';
    document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(null);
    const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function openEditRuleModal(ruleId) {
    _s3EditingRuleId = ruleId;
    const rule = FORM_BUDGET_RULES.find(r => r.id === ruleId);
    document.getElementById('s3-modal-title').textContent = '통합 정책 편집';
    document.getElementById('s3-modal-body').innerHTML = _s3ModalBody(rule);
    const m = document.getElementById('s3-modal'); m.style.display = 'flex';
}

function s3SaveRule() {
    const acc = document.getElementById('s3-account').value;
    const gid = document.getElementById('s3-group').value;
    const fid = document.getElementById('s3-apply-form').value;
    const planFmEl = document.getElementById('s3-plan-form');
    const multiEl = document.getElementById('s3-multi');
    const isPlanReq = document.getElementById('s3-account').options[document.getElementById('s3-account').selectedIndex]?.dataset.plan === 'true';

    const planFormId = (isPlanReq && planFmEl) ? (planFmEl.value || null) : null;
    const multiPlanAllowed = (isPlanReq && multiEl) ? multiEl.checked : false;

    const ltCbs = [...document.querySelectorAll('.s3-lt-cb:checked')];
    const learningTypes = ltCbs.map(cb => cb.value);

    if (!acc || !gid || !fid) { alert('예산, 대상 조직, 신청 양식을 모두 선택해주세요.'); return; }
    if (isPlanReq && !planFormId) { alert('이 예산은 사전계획이 필수입니다. 계획 양식을 연결해주세요.'); return; }

    if (_s3EditingRuleId) {
        const r = FORM_BUDGET_RULES.find(x => x.id === _s3EditingRuleId);
        if (r) {
            r.accountCode = acc; r.virtualGroupId = gid; r.formId = fid;
            r.planFormId = planFormId; r.multiPlanAllowed = multiPlanAllowed;
            r.learningTypes = learningTypes;
        }
    } else {
        FORM_BUDGET_RULES.push({
            id: 'R' + (Date.now()), tenantId: boCurrentPersona.tenantId || _s3Tenant,
            accountCode: acc, virtualGroupId: gid, formId: fid,
            planFormId, multiPlanAllowed, learningTypes
        });
    }
    s3CloseModal();
    document.getElementById('bm-content').innerHTML = renderStep3();
}

function s3CloseModal() { document.getElementById('s3-modal').style.display = 'none'; }
