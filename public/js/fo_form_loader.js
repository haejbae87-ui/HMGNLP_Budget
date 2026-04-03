// ─── FO DYNAMIC FORM LOADER ──────────────────────────────────────────────────
// BO form_templates + field_definitions를 로드하여 FO Step4에 동적 필드를 렌더링합니다.
// 하드코딩 필드(계획명, 시작일, 종료일, 예산액, 상세내용)를 제거하고
// BO 양식 빌더에서 설정한 대로 화면에 표시합니다.

'use strict';

// ─── 전역 캐시 ────────────────────────────────────────────────────────────────
let _FIELD_DEF_CACHE = null;   // field_definitions 전체
let _FORM_TPL_CACHE = {};     // { formId: formTemplate }

// ─── 1. field_definitions 로드 (한 번만) ─────────────────────────────────────
async function _loadFieldDefs() {
    if (_FIELD_DEF_CACHE) return _FIELD_DEF_CACHE;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) { _FIELD_DEF_CACHE = []; return []; }
    const { data, error } = await sb.from('field_definitions')
        .select('*').eq('active', true).order('sort_order');
    if (error) { console.warn('[fo_form_loader] field_defs load error:', error.message); _FIELD_DEF_CACHE = []; return []; }
    _FIELD_DEF_CACHE = data || [];
    return _FIELD_DEF_CACHE;
}

// ─── 2. 단일 form_template 로드 (캐싱) ───────────────────────────────────────
async function _loadFormTemplate(formId) {
    if (_FORM_TPL_CACHE[formId]) return _FORM_TPL_CACHE[formId];
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) return null;
    const { data, error } = await sb.from('form_templates')
        .select('*').eq('id', formId).eq('active', true).maybeSingle();
    if (error || !data) { console.warn('[fo_form_loader] template load error:', formId, error?.message); return null; }
    _FORM_TPL_CACHE[formId] = data;
    return data;
}

// ─── 3. vorg + account + stage 자동 매칭 (fallback) ──────────────────────────
async function _loadFormTemplateByContext(vorgTemplateId, accountCode, stage) {
    const cacheKey = `${vorgTemplateId}|${accountCode}|${stage}`;
    if (_FORM_TPL_CACHE[cacheKey]) return _FORM_TPL_CACHE[cacheKey];
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) return null;
    let q = sb.from('form_templates').select('*').eq('active', true).eq('type', stage);
    if (vorgTemplateId) q = q.eq('virtual_org_template_id', vorgTemplateId);
    if (accountCode) q = q.eq('account_code', accountCode);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error || !data) return null;
    _FORM_TPL_CACHE[cacheKey] = data;
    return data;
}

// ─── 4. 정책에서 해당 단계 양식 해석 ─────────────────────────────────────────
// stage: 'plan' | 'apply' | 'result'
async function getFoFormTemplate(policy, stage) {
    if (!policy) return null;
    await _loadFieldDefs(); // field_defs 사전 로드
    // 1순위: stage_form_ids
    const formIds = policy?.stage_form_ids?.[stage] || [];
    if (formIds.length > 0) {
        const tpl = await _loadFormTemplate(formIds[0]);
        if (tpl) return tpl;
    }
    // 2순위: vorg_template_id + account_code 자동 매칭
    const vorgId = policy.vorg_template_id || policy.vorgTemplateId;
    const accCode = (policy.account_codes || policy.accountCodes || [])[0];
    if (vorgId || accCode) {
        return await _loadFormTemplateByContext(vorgId, accCode, stage);
    }
    return null;
}
window.getFoFormTemplate = getFoFormTemplate;

// ─── 5. fields 배열 → HTML 렌더링 ────────────────────────────────────────────
// formFields: form_templates.fields (배열, [{key, scope}])
// formState: planState | applyState | resultState
// prefix: 상태 변수 접두사 ('planState' | 'applyState')
function renderDynamicFormFields(formFields, formState, prefix) {
    if (!formFields || !formFields.length) return '';
    const fieldDefs = _FIELD_DEF_CACHE || [];

    // FO 표시 대상 필드만 필터 (scope='front' 또는 scope 없음)
    const foFields = formFields.filter(f => !f.scope || f.scope === 'front');
    if (!foFields.length) return '';

    const html = foFields.map(fieldRef => {
        const key = fieldRef.key;
        const def = fieldDefs.find(d => d.key === key);
        if (!def) return '';
        return _renderOneField(def, formState, prefix);
    }).filter(Boolean).join('');

    return html;
}
window.renderDynamicFormFields = renderDynamicFormFields;

// ─── 개별 필드 렌더링 ─────────────────────────────────────────────────────────
function _renderOneField(def, s, prefix) {
    const { key, field_type, icon, hint, required } = def;
    const label = `${icon || ''} ${key}`;
    const reqMark = required ? '<span style="color:#EF4444">*</span>' : '';
    const stateKey = _toStateKey(key);       // '교육기간' → 'eduPeriod' 매핑
    const val = s?.[stateKey] ?? '';

    const labelHtml = `<label style="display:block;font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">${label} ${reqMark}</label>`;
    const hintHtml = hint ? `<div style="font-size:11px;color:#9CA3AF;margin-top:4px">${hint}</div>` : '';

    let inputHtml = '';

    switch (field_type) {
        case 'text':
            inputHtml = `<input type="text" value="${_esc(val)}"
        oninput="${prefix}.${stateKey}=this.value"
        placeholder="${_esc(hint || key)}"
        style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-weight:600;font-size:14px;color:#111827;transition:border-color .15s;box-sizing:border-box"
        onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'"/>`;
            break;

        case 'textarea':
            inputHtml = `<textarea rows="3"
        oninput="${prefix}.${stateKey}=this.value"
        placeholder="${_esc(hint || key)}"
        style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:500;color:#374151;resize:none;transition:border-color .15s;box-sizing:border-box"
        onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'">${_esc(val)}</textarea>`;
            break;

        case 'number':
        case 'budget-linked': {
            // budget-linked 타입: 예산 잔액 연동 숫자 필드
            const isBudget = field_type === 'budget-linked';
            inputHtml = `<div style="position:relative;max-width:340px">
        <input type="number" value="${_esc(val)}"
          oninput="${prefix}.${stateKey}=+this.value${isBudget ? `;${prefix}.amount=+this.value` : ''}"
          placeholder="0"
          style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 48px 12px 16px;font-weight:700;font-size:16px;color:#111827;box-sizing:border-box"/>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
      </div>`;
            break;
        }

        case 'daterange': {
            // 시작일 + 종료일 쌍
            const startKey = stateKey + 'Start';
            const endKey = stateKey + 'End';
            const sVal = s?.[startKey] ?? s?.startDate ?? '';
            const eVal = s?.[endKey] ?? s?.endDate ?? '';
            inputHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">시작일</div>
          <input type="date" value="${_esc(sVal)}"
            oninput="${prefix}.${startKey}=this.value;${prefix}.startDate=this.value"
            style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:10px 14px;font-weight:600;box-sizing:border-box"/>
        </div>
        <div>
          <div style="font-size:11px;color:#9CA3AF;margin-bottom:4px">종료일</div>
          <input type="date" value="${_esc(eVal)}"
            oninput="${prefix}.${endKey}=this.value;${prefix}.endDate=this.value"
            style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:10px 14px;font-weight:600;box-sizing:border-box"/>
        </div>
      </div>`;
            break;
        }

        case 'calc-grounds':
            // 기존 세부산출근거 컴포넌트 재사용
            if (typeof _renderCalcGroundsSection === 'function') {
                const curBudget = _resolveCurrentBudget(s, prefix);
                inputHtml = _renderCalcGroundsSection(s, curBudget);
            }
            break;

        case 'file':
            inputHtml = `<label style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:#F9FAFB;border:2px dashed #D1D5DB;border-radius:12px;cursor:pointer;font-size:13px;font-weight:600;color:#6B7280">
        <span style="font-size:22px">📎</span>
        <span>${key} 파일 첨부<br><span style="font-size:11px;font-weight:400">${hint || '파일을 선택하세요'}</span></span>
        <input type="file" style="display:none" onchange="_handleFileAttach(event,'${_esc(stateKey)}','${prefix}')"/>
      </label>`;
            break;

        case 'user-search':
            inputHtml = `<div style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-size:13px;color:#6B7280">
        👤 ${key} 검색 기능 (추후 사용자 검색 연동 예정)
      </div>`;
            break;

        case 'rating':
            inputHtml = `<div style="display:flex;gap:8px;align-items:center">
        ${[1, 2, 3, 4, 5].map(n => `
          <button type="button" onclick="${prefix}.${stateKey}=${n};_reRenderForm('${prefix}')"
            style="width:40px;height:40px;border-radius:50%;border:2px solid ${(val >= n) ? '#FBBF24' : '#E5E7EB'};background:${(val >= n) ? '#FFFBEB' : '#F9FAFB'};font-size:20px;cursor:pointer">⭐</button>`
            ).join('')}
        <span style="margin-left:8px;font-size:13px;font-weight:700;color:#6B7280">${val || 0}점</span>
      </div>`;
            break;

        default:
            // unknown field_type → text로 fallback
            inputHtml = `<input type="text" value="${_esc(val)}"
        oninput="${prefix}.${stateKey}=this.value"
        placeholder="${_esc(hint || key)}"
        style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-weight:600;font-size:14px;box-sizing:border-box"/>`;
    }

    return `<div style="margin-bottom:20px">
    ${labelHtml}
    ${inputHtml}
    ${hintHtml}
  </div>`;
}

// ─── 키 매핑 (한글 → camelCase 상태 키) ───────────────────────────────────────
const _KEY_MAP = {
    '교육목적': 'purpose_text',
    '교육기간': 'eduPeriod',
    '교육기간시작': 'startDate',
    '교육기간종료': 'endDate',
    '교육기관': 'institution',
    '과정명': 'title',
    '장소': 'location',
    '기대효과': 'expectedEffect',
    '예상비용': 'amount',
    '교육비': 'tuitionFee',
    '참가비': 'participationFee',
    '강사료': 'instructorFee',
    '대관비': 'venueFee',
    '식대/용차': 'mealTransportFee',
    '실지출액': 'actualCost',
    '세부산출근거': 'calcGrounds_render',
    '수강인원': 'headcount',
    '정원': 'capacity',
    '참여자명단': 'participantList',
    '강사정보': 'instructorInfo',
    '교육결과요약': 'resultSummary',
    '수료생명단': 'completionList',
    '학습만족도': 'satisfaction',
    '첨부파일': 'attachments',
    '강사이력서': 'instructorResume',
    '보안서약서': 'securityPledge',
    '영수증': 'receipt',
    '수료증': 'completionCert',
    '대관확정서': 'venueConfirm',
    '납품확인서': 'deliveryConfirm',
};

function _toStateKey(key) {
    return _KEY_MAP[key] || key.replace(/[^a-z0-9가-힣]/gi, '_');
}

function _esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// budget resolve 헬퍼
function _resolveCurrentBudget(s, prefix) {
    if (!s) return null;
    const budgets = currentPersona?.budgets || [];
    return budgets.find(b => b.id === s.budgetId) || null;
}

// 파일 첨부 핸들러
function _handleFileAttach(event, stateKey, prefix) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const stateRef = prefix === 'planState' ? planState
        : prefix === 'applyState' ? applyState : null;
    if (stateRef) { stateRef[stateKey] = file.name; }
}

// 별점 재렌더를 위한 글로벌 트리거 (간이 구현)
function _reRenderForm(prefix) {
    if (prefix === 'planState' && typeof renderPlanWizard === 'function') renderPlanWizard();
    else if (prefix === 'applyState' && typeof renderApplyWizard === 'function') renderApplyWizard();
}

// ─── 6. 대표 정책 추출 헬퍼 (선택된 budgetId + purpose 기준) ──────────────────
// plans.js/apply.js에서 호출: getMatchedPolicyForStage(currentPersona, purpose, budgetAccountCode, stage)
async function getMatchedPolicyForStage(persona, purposeId, accountCode, stage) {
    let policies = [];
    if (typeof SERVICE_POLICIES !== 'undefined' && SERVICE_POLICIES.length) {
        policies = SERVICE_POLICIES;
    } else if (typeof _getActivePolicies !== 'undefined') {
        const r = _getActivePolicies(persona);
        policies = r?.policies || [];
    }
    // purpose + accountCode로 필터
    const matched = policies.find(p => {
        const pPurpose = p.purpose || '';
        const pAccounts = p.account_codes || p.accountCodes || [];
        const purposeOk = !purposeId || pPurpose === purposeId;
        const accountOk = !accountCode || pAccounts.includes(accountCode);
        return purposeOk && accountOk;
    }) || policies[0] || null;
    if (!matched) return null;
    return await getFoFormTemplate(matched, stage);
}
window.getMatchedPolicyForStage = getMatchedPolicyForStage;
