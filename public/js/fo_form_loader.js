// ─── FO DYNAMIC FORM LOADER ──────────────────────────────────────────────────
// BO form_templates + field_definitions를 로드하여 FO Step4에 동적 필드를 렌더링합니다.
// 하드코딩 필드(계획명, 시작일, 종료일, 예산액, 상세내용)를 제거하고
// BO 양식 빌더에서 설정한 대로 화면에 표시합니다.

'use strict';

// ─── 전역 캐시 (TTL 기반 — BO 양식 수정 즉시 반영) ─────────────────────────
let _FIELD_DEF_CACHE = null;   // field_definitions 전체
let _FIELD_DEF_LOADED_AT = 0;  // 타임스탬프
let _FORM_TPL_CACHE = {};     // { formId: { data, loadedAt } }
const _CACHE_TTL_MS = 60_000; // 60초 TTL — BO 수정 후 최대 1분 내 반영

// 캐시 무효화 (Step 이동 시 또는 수동 호출용)
function invalidateFormCache() {
    _FIELD_DEF_CACHE = null;
    _FIELD_DEF_LOADED_AT = 0;
    _FORM_TPL_CACHE = {};
    console.log('[fo_form_loader] 양식 캐시 무효화 완료');
}
window.invalidateFormCache = invalidateFormCache;

// ─── 1. field_definitions 로드 (TTL 만료 시 재조회) ──────────────────────────
async function _loadFieldDefs() {
    if (_FIELD_DEF_CACHE && (Date.now() - _FIELD_DEF_LOADED_AT < _CACHE_TTL_MS)) return _FIELD_DEF_CACHE;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) { _FIELD_DEF_CACHE = []; return []; }
    const { data, error } = await sb.from('field_definitions')
        .select('*').eq('active', true).order('sort_order');
    if (error) { console.warn('[fo_form_loader] field_defs load error:', error.message); _FIELD_DEF_CACHE = []; return []; }
    _FIELD_DEF_CACHE = data || [];
    _FIELD_DEF_LOADED_AT = Date.now();
    return _FIELD_DEF_CACHE;
}

// ─── 2. 단일 form_template 로드 (TTL 만료 시 DB 재조회) ─────────────────────
async function _loadFormTemplate(formId) {
    const cached = _FORM_TPL_CACHE[formId];
    if (cached && cached.data && (Date.now() - cached.loadedAt < _CACHE_TTL_MS)) return cached.data;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) return null;
    const { data, error } = await sb.from('form_templates')
        .select('*').eq('id', formId).eq('status', 'published').maybeSingle();
    if (error || !data) { console.warn('[fo_form_loader] template load error:', formId, error?.message); return null; }
    _FORM_TPL_CACHE[formId] = { data, loadedAt: Date.now() };
    return data;
}

// ─── 3. vorg + account + stage + eduType 자동 매칭 (fallback, TTL 적용) ──────
async function _loadFormTemplateByContext(vorgTemplateId, accountCode, stage, eduType) {
    const cacheKey = `${vorgTemplateId}|${accountCode}|${stage}|${eduType || ''}`;
    const cached = _FORM_TPL_CACHE[cacheKey];
    if (cached && cached.data && (Date.now() - cached.loadedAt < _CACHE_TTL_MS)) return cached.data;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) return null;

    // 1순위: vorg + account + stage + edu_type 정확 매칭
    if (eduType) {
        let q1 = sb.from('form_templates').select('*').eq('status', 'published').eq('type', stage);
        if (vorgTemplateId) q1 = q1.eq('virtual_org_template_id', vorgTemplateId);
        if (accountCode) q1 = q1.eq('account_code', accountCode);
        q1 = q1.eq('edu_type', eduType);
        const { data: d1 } = await q1.limit(1).maybeSingle();
        if (d1) {
            _FORM_TPL_CACHE[cacheKey] = { data: d1, loadedAt: Date.now() };
            console.log(`[fo_form_loader] 양식 정확 매칭: ${d1.name} (eduType=${eduType})`);
            return d1;
        }
    }

    // 2순위: vorg + account + stage (eduType 없이)
    // ★ P1-2: 복수 양식 존재 시 랜덤 반환 방지 → null
    let q2 = sb.from('form_templates').select('*').eq('status', 'published').eq('type', stage);
    if (vorgTemplateId) q2 = q2.eq('virtual_org_template_id', vorgTemplateId);
    if (accountCode) q2 = q2.eq('account_code', accountCode);
    const { data: d2arr, error } = await q2.limit(5);
    if (error || !d2arr || d2arr.length === 0) return null;
    // edu_type이 다른 양식이 복수이면 불확실 → null 반환
    if (d2arr.length > 1) {
        console.warn(`[fo_form_loader] 양식 복수(${d2arr.length}건) 발견, eduType 미지정 → null 반환 (잘못된 양식 방지)`);
        return null;
    }
    _FORM_TPL_CACHE[cacheKey] = { data: d2arr[0], loadedAt: Date.now() };
    console.log(`[fo_form_loader] 양식 폴백 매칭 (단일): ${d2arr[0].name}`);
    return d2arr[0];
}

// ─── 4. 정책에서 해당 단계 양식 해석 ─────────────────────────────────────────
// stage: 'plan' | 'apply' | 'result', eduType: 선택된 교육유형 (optional)
async function getFoFormTemplate(policy, stage, eduType) {
    if (!policy) return null;
    await _loadFieldDefs(); // field_defs 사전 로드

    // 1순위: stage_form_ids에서 eduType 매칭
    const formIds = policy?.stage_form_ids?.[stage] || [];
    if (formIds.length > 0) {
        // 복수 양식이 있으면 eduType으로 최적 선택
        if (formIds.length > 1 && eduType) {
            for (const fid of formIds) {
                const tpl = await _loadFormTemplate(fid);
                if (tpl && tpl.edu_type === eduType) return tpl;
            }
        }
        // 단일 양식 또는 eduType 매칭 실패 시 첫 번째
        const tpl = await _loadFormTemplate(formIds[0]);
        if (tpl) return tpl;
    }

    // 2순위: vorg_template_id + account_code + eduType 자동 매칭
    const vorgId = policy.vorg_template_id || policy.vorgTemplateId;
    const accCode = (policy.account_codes || policy.accountCodes || [])[0];
    if (vorgId || accCode) {
        return await _loadFormTemplateByContext(vorgId, accCode, stage, eduType);
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

    // FO 표시 대상 필드: front + provide (미입력 provide는 숨김)
    const foFields = formFields.filter(f => !f.scope || f.scope === 'front' || f.scope === 'provide');
    if (!foFields.length) return '';

    const html = foFields.map(fieldRef => {
        const key = fieldRef.key;
        const def = fieldDefs.find(d => d.key === key);
        if (!def) return '';

        // provide scope: 미입력 시 숨김, 입력되어 있으면 읽기전용 카드
        if (fieldRef.scope === 'provide') {
            return _renderProvideField(def, formState, prefix);
        }

        return _renderOneField(def, formState, prefix);
    }).filter(Boolean).join('');

    return html;
}
window.renderDynamicFormFields = renderDynamicFormFields;

// ─── provide 필드 읽기전용 렌더링 (미입력 시 숨김) ───────────────────────────────
function _renderProvideField(def, s, prefix) {
    const { key, field_type, icon, hint } = def;
    const stateKey = _toStateKey(key);
    // provide 데이터는 detail._provide 네임스페이스 또는 state 직접 참조
    const provideData = s?._provide || {};
    const val = provideData[stateKey] ?? s?.[stateKey] ?? '';

    // 미입력 시 숨김
    if (!val && val !== 0) return '';

    // select 타입: value → label 변환
    let displayVal = val;
    if (field_type === 'select' && def.options) {
        const opt = def.options.find(o => o.value === val);
        if (opt) displayVal = opt.label;
    }

    const label = `${icon || ''} ${key}`;
    return `<div style="margin-bottom:16px">
      <div style="padding:14px 18px;background:linear-gradient(135deg,#EFF6FF,#F0F9FF);border:1.5px solid #BFDBFE;border-radius:12px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:9px;font-weight:800;color:#1D4ED8;background:#DBEAFE;padding:2px 8px;border-radius:4px">📢 관리자 제공</span>
          <label style="font-size:12px;font-weight:800;color:#1E40AF">${label}</label>
        </div>
        <div style="font-size:14px;font-weight:600;color:#111827;white-space:pre-wrap;line-height:1.5">${_esc(String(displayVal))}</div>
      </div>
    </div>`;
}

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
                const result = _renderCalcGroundsSection(s, curBudget);
                if (result) { inputHtml = result; break; }
            }
            // 폴백: 항목 데이터가 없어도 기본 + 항목 추가 테이블 표시
            inputHtml = `<div style="background:#F0F9FF;border:2px dashed #93C5FD;border-radius:12px;padding:20px;text-align:center">
              <div style="font-size:24px;margin-bottom:8px">📐</div>
              <div style="font-size:12px;font-weight:700;color:#1D4ED8;margin-bottom:4px">세부 산출 근거 테이블</div>
              <div style="font-size:11px;color:#6B7280;margin-bottom:12px">이 예산 계정에 등록된 세부산출근거 항목이 없습니다.<br>BO 관리자가 해당 가상교육조직에 산출근거 항목을 등록하면 여기에 테이블이 표시됩니다.</div>
              <div style="font-size:10px;color:#9CA3AF">관리 경로: BO → 세부산출근거 관리 → 항목 추가</div>
            </div>`;
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

        case 'course-session': {
            // 다과정·다차수 부분 선택 필드
            const links = (Array.isArray(val) ? val : []);
            const linksTable = links.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px">
                <thead><tr style="border-bottom:2px solid #E5E7EB">
                  <th style="text-align:left;padding:6px 8px;font-weight:800;color:#374151">과정명</th>
                  <th style="text-align:left;padding:6px 8px;font-weight:800;color:#374151">차수</th>
                  <th style="text-align:center;padding:6px 8px;width:40px"></th>
                </tr></thead>
                <tbody>${links.map((lnk, li) => `
                  <tr style="border-bottom:1px solid #F3F4F6">
                    <td style="padding:6px 8px;font-weight:700;color:#1D4ED8">
                      <div>📺 ${lnk.channelName || ''}</div>
                      <div style="font-weight:800;color:#111827">📚 ${lnk.courseName || lnk.courseId}</div>
                    </td>
                    <td style="padding:6px 8px">${(lnk.sessions || []).map(ss => `
                      <span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:#D1FAE5;color:#065F46;border-radius:6px;font-size:10px;font-weight:700">
                        ${ss.no}차 ${ss.name || ''}${ss.period ? ' (' + ss.period + ')' : ''}
                        <span onclick="_csRemoveSession('${prefix}','${stateKey}',${li},'${ss.id}')" style="cursor:pointer;color:#DC2626;margin-left:4px">✕</span>
                      </span>`).join('')}
                    </td>
                    <td style="text-align:center;padding:6px 8px">
                      <button onclick="_csRemoveCourse('${prefix}','${stateKey}',${li})" style="border:none;background:none;color:#DC2626;cursor:pointer;font-size:14px;font-weight:900" title="과정 전체 삭제">🗑</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>` : '';
            inputHtml = `<div style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:14px 16px">
              ${linksTable}
              <button type="button" onclick="_csOpenModal('${prefix}','${stateKey}')"
                style="font-size:12px;font-weight:700;color:#1D4ED8;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:8px;padding:8px 16px;cursor:pointer">📺 과정 추가</button>
              ${links.length === 0 ? '<span style="font-size:11px;color:#9CA3AF;margin-left:8px">채널의 과정/차수를 선택하여 예산 근거로 사용</span>' : `<span style="font-size:10px;color:#059669;margin-left:8px;font-weight:700">${links.length}개 과정 · ${links.reduce((s, l) => (s + (l.sessions || []).length), 0)}개 차수 선택됨</span>`}
            </div>`;
            break;
        }

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
    '교육대상': 'targetAudience',
    '과정시간(차수별)': 'courseHoursPerSession',
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
    '과정-차수연결': 'courseSessionLinks',
    // provide 필드
    '안내사항': 'announcement',
    '준비물': 'preparation',
    '확정 교육장소': 'confirmedVenue',
    '확정 강사': 'confirmedInstructor',
    '합격/수료 여부': 'passStatus',
    '관리자 피드백': 'managerFeedback',
    // back 필드
    'ERP코드': 'erpCode',
    '검토의견': 'reviewComment',
    '관리자비고': 'adminNote',
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

// ─── 7. 필수 필드 검증 (FO 상신 시 호출) ──────────────────────────────────────
// formTemplate: form_templates 레코드 (fields 배열 포함)
// state: planState | applyState (현재 입력 상태)
// 반환: { valid: boolean, errors: string[] }
function validateRequiredFields(formTemplate, state) {
    const errors = [];
    if (!formTemplate || !formTemplate.fields || !formTemplate.fields.length) {
        return { valid: true, errors }; // 동적 양식 없으면 패스
    }

    const fieldDefs = _FIELD_DEF_CACHE || [];
    const foFields = formTemplate.fields.filter(f => !f.scope || f.scope === 'front');

    for (const fieldRef of foFields) {
        const key = fieldRef.key;
        const def = fieldDefs.find(d => d.key === key);
        if (!def) continue;

        // 필수 여부 판단: 양식별 오버라이드(fieldRef.required) > 필드 정의(def.required)
        const isRequired = fieldRef.required !== undefined ? fieldRef.required : def.required;
        if (!isRequired) continue;

        const stateKey = _toStateKey(key);
        const val = state?.[stateKey];

        // 타입별 빈 값 체크
        let isEmpty = false;
        switch (def.field_type) {
            case 'daterange': {
                const startKey = stateKey + 'Start';
                const endKey = stateKey + 'End';
                const sVal = state?.[startKey] ?? state?.startDate ?? '';
                const eVal = state?.[endKey] ?? state?.endDate ?? '';
                isEmpty = !sVal || !eVal;
                break;
            }
            case 'number':
            case 'budget-linked':
                isEmpty = val === undefined || val === null || val === '' || Number(val) === 0;
                break;
            case 'rating':
                isEmpty = !val || Number(val) === 0;
                break;
            case 'course-session':
                isEmpty = !Array.isArray(val) || val.length === 0;
                break;
            case 'file':
                isEmpty = !val;
                break;
            default:
                isEmpty = !val || String(val).trim() === '';
        }

        if (isEmpty) {
            const label = (def.icon || '') + ' ' + key;
            errors.push(label.trim());
        }
    }

    return { valid: errors.length === 0, errors };
}
window.validateRequiredFields = validateRequiredFields;

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

// ─── 과정-차수 연결 필드 전역 함수 ────────────────────────────────────────────
let _csPrefix = '';
let _csStateKey = '';
let _csCourses = [];  // 모달 캐시
let _csChMap = {};    // 채널 이름 캐시

function _csOpenModal(prefix, stateKey) {
    _csPrefix = prefix;
    _csStateKey = stateKey;
    // 모달이 이미 DOM에 있으면 재사용
    let modal = document.getElementById('cs-picker-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cs-picker-modal';
        document.body.appendChild(modal);
    }
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `<div style="background:#fff;border-radius:16px;width:620px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden">
      <div style="padding:20px 24px;border-bottom:1px solid #F3F4F6">
        <h3 style="font-size:15px;font-weight:800;margin:0">📺 과정-차수 선택</h3>
        <p style="font-size:12px;color:#6B7280;margin:4px 0 0">채널의 교육과정을 선택하고 차수를 체크하세요</p>
      </div>
      <div id="cs-picker-body" style="flex:1;overflow-y:auto;padding:16px 24px"><div style="padding:20px;text-align:center;color:#9CA3AF">⏳ 로딩 중...</div></div>
      <div style="padding:14px 24px;border-top:1px solid #F3F4F6;text-align:right">
        <button onclick="document.getElementById('cs-picker-modal').style.display='none'"
          style="padding:8px 20px;border:1.5px solid #E5E7EB;border-radius:8px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">닫기</button>
      </div>
    </div>`;
    _csLoadCourses();
}
window._csOpenModal = _csOpenModal;

async function _csLoadCourses() {
    const body = document.getElementById('cs-picker-body');
    if (!body) return;
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) { body.innerHTML = '<p style="color:#EF4444">DB 연결 없음</p>'; return; }
    const persona = typeof currentPersona !== 'undefined' ? currentPersona : {};
    const tenantId = persona.tenantId || 'HMC';

    // 채널 담당자 여부
    let channelFilter = null;
    try {
        const { data: myRoles } = await sb.from('user_roles').select('role_code')
            .eq('user_id', persona.id).eq('tenant_id', tenantId);
        const chRoles = (myRoles || []).filter(r => r.role_code.includes('_ch_mgr_'));
        if (chRoles.length > 0) {
            const { data: channels } = await sb.from('edu_channels').select('id,name')
                .in('role_code', chRoles.map(r => r.role_code));
            channelFilter = (channels || []).map(c => c.id);
        }
    } catch (e) { }

    let courses = [];
    try {
        let q = sb.from('edu_courses').select('id,title,channel_id,edu_type,status')
            .eq('tenant_id', tenantId);
        if (channelFilter && channelFilter.length > 0) q = q.in('channel_id', channelFilter);
        else q = q.eq('status', 'active');
        const { data } = await q.order('title');
        courses = data || [];
    } catch (e) { courses = []; }
    _csCourses = courses;

    if (courses.length === 0) {
        body.innerHTML = '<div style="padding:30px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">📚</div>선택 가능한 교육과정이 없습니다</div>';
        return;
    }

    const chIds = [...new Set(courses.map(c => c.channel_id))];
    try {
        const { data } = await sb.from('edu_channels').select('id,name').in('id', chIds);
        _csChMap = {};
        (data || []).forEach(c => _csChMap[c.id] = c.name);
    } catch (e) { }

    const statusLabel = { draft: '초안', active: '운영중', closed: '종료' };
    body.innerHTML = courses.map(c => `<div style="border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 16px;margin-bottom:10px;cursor:pointer;transition:all .15s"
      onmouseover="this.style.borderColor='#93C5FD';this.style.background='#F0F9FF'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.background='#fff'"
      onclick="_csLoadSessions('${c.id}','${(c.title || '').replace(/'/g, "\\\'")}','${c.channel_id}')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:#6B7280">채널: ${_csChMap[c.channel_id] || '-'}</div>
          <div style="font-size:13px;font-weight:800;color:#374151">📚 ${c.title}</div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${c.status === 'active' ? '#059669' : '#D97706'};background:${c.status === 'active' ? '#D1FAE5' : '#FEF3C7'};padding:2px 8px;border-radius:6px">${statusLabel[c.status] || c.status}</span>
      </div>
    </div>`).join('');
}

async function _csLoadSessions(courseId, courseTitle, channelId) {
    const body = document.getElementById('cs-picker-body');
    if (!body) return;
    body.innerHTML = '<div style="padding:20px;text-align:center;color:#9CA3AF">⏳ 차수 로딩 중...</div>';
    const sb = typeof getSB === 'function' ? getSB() : null;
    if (!sb) return;
    const persona = typeof currentPersona !== 'undefined' ? currentPersona : {};
    const tenantId = persona.tenantId || 'HMC';

    let sessions = [];
    try {
        const { data } = await sb.from('edu_sessions').select('id,session_no,name,start_date,end_date,status,capacity')
            .eq('course_id', courseId).eq('tenant_id', tenantId)
            .in('status', ['planned', 'open', 'in_progress'])
            .order('session_no');
        sessions = data || [];
    } catch (e) { sessions = []; }

    const backBtn = `<button onclick="_csLoadCourses()" style="font-size:11px;color:#1D4ED8;background:none;border:none;cursor:pointer;font-weight:700;margin-bottom:10px">← 과정 목록으로</button>`;
    const header = `<div style="font-size:14px;font-weight:800;color:#374151;margin-bottom:12px">📚 ${courseTitle}</div>`;

    if (sessions.length === 0) {
        body.innerHTML = backBtn + header + '<div style="padding:20px;text-align:center;color:#9CA3AF">등록된 차수가 없습니다</div>';
        return;
    }

    // 이미 선택된 차수 표시를 위해 현재 상태 참조
    const stateRef = _csPrefix === 'planState' ? (typeof planState !== 'undefined' ? planState : {})
        : _csPrefix === 'applyState' ? (typeof applyState !== 'undefined' ? applyState : {})
            : (typeof _resultState !== 'undefined' ? _resultState : {});
    const existing = (stateRef[_csStateKey] || []).find(l => l.courseId === courseId);
    const existingIds = new Set((existing?.sessions || []).map(s => s.id));

    const statusLabel = { planned: '계획', open: '모집중', in_progress: '진행중' };
    const statusColor = { planned: '#6B7280', open: '#059669', in_progress: '#1D4ED8' };

    body.innerHTML = backBtn + header + `
    <div style="margin-bottom:12px;font-size:11px;color:#6B7280">차수를 체크한 후 아래 "선택 추가" 버튼을 클릭하세요</div>
    <div id="cs-session-list">
    ${sessions.map(s => {
        const alreadySelected = existingIds.has(s.id);
        return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid ${alreadySelected ? '#BBF7D0' : '#E5E7EB'};border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .12s;background:${alreadySelected ? '#F0FDF4' : '#fff'}"
          onmouseover="this.style.borderColor='#6EE7B7'" onmouseout="this.style.borderColor='${alreadySelected ? '#BBF7D0' : '#E5E7EB'}'">
          <input type="checkbox" value="${s.id}" data-no="${s.session_no}" data-name="${(s.name || '').replace(/"/g, '&quot;')}" data-start="${s.start_date || ''}" data-end="${s.end_date || ''}" ${alreadySelected ? 'checked disabled' : ''}
            style="accent-color:#059669;width:16px;height:16px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:800;color:#374151">🗓️ ${s.session_no}차 — ${s.name || ''}</div>
            <div style="font-size:11px;color:#6B7280">${s.start_date || '-'} ~ ${s.end_date || '-'} · 정원 ${s.capacity || '-'}명</div>
          </div>
          <span style="font-size:10px;font-weight:700;color:${statusColor[s.status] || '#6B7280'}">${statusLabel[s.status] || s.status}</span>
          ${alreadySelected ? '<span style="font-size:9px;color:#059669;font-weight:700">선택됨</span>' : ''}
        </label>`;
    }).join('')}
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
      <button onclick="_csLoadCourses()" style="padding:8px 18px;border:1.5px solid #E5E7EB;border-radius:8px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
      <button onclick="_csConfirmSessions('${courseId}','${courseTitle.replace(/'/g, "\\\'")}','${channelId}')" style="padding:8px 22px;background:#059669;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">✅ 선택 추가</button>
    </div>`;
}
window._csLoadSessions = _csLoadSessions;
window._csLoadCourses = _csLoadCourses;

function _csConfirmSessions(courseId, courseTitle, channelId) {
    const checks = document.querySelectorAll('#cs-session-list input[type=checkbox]:checked:not([disabled])');
    if (checks.length === 0) { alert('추가할 차수를 1개 이상 선택하세요.'); return; }

    const stateRef = _csPrefix === 'planState' ? (typeof planState !== 'undefined' ? planState : null)
        : _csPrefix === 'applyState' ? (typeof applyState !== 'undefined' ? applyState : null)
            : (typeof _resultState !== 'undefined' ? _resultState : null);
    if (!stateRef) return;
    if (!Array.isArray(stateRef[_csStateKey])) stateRef[_csStateKey] = [];

    const newSessions = Array.from(checks).map(cb => ({
        id: cb.value,
        no: parseInt(cb.dataset.no) || 0,
        name: cb.dataset.name || '',
        period: (cb.dataset.start && cb.dataset.end) ? `${cb.dataset.start}~${cb.dataset.end}` : ''
    }));

    // 같은 과정이 이미 있으면 차수 병합
    const existing = stateRef[_csStateKey].find(l => l.courseId === courseId);
    if (existing) {
        const existingIds = new Set(existing.sessions.map(s => s.id));
        newSessions.forEach(ns => { if (!existingIds.has(ns.id)) existing.sessions.push(ns); });
        existing.sessions.sort((a, b) => a.no - b.no);
    } else {
        stateRef[_csStateKey].push({
            channelId: channelId,
            channelName: _csChMap[channelId] || '',
            courseId: courseId,
            courseName: courseTitle,
            sessions: newSessions.sort((a, b) => a.no - b.no)
        });
    }

    // 모달 닫기 + 폼 재렌더
    document.getElementById('cs-picker-modal').style.display = 'none';
    _reRenderForm(_csPrefix);
}
window._csConfirmSessions = _csConfirmSessions;

function _csRemoveCourse(prefix, stateKey, idx) {
    const stateRef = prefix === 'planState' ? (typeof planState !== 'undefined' ? planState : null)
        : prefix === 'applyState' ? (typeof applyState !== 'undefined' ? applyState : null)
            : (typeof _resultState !== 'undefined' ? _resultState : null);
    if (!stateRef || !Array.isArray(stateRef[stateKey])) return;
    stateRef[stateKey].splice(idx, 1);
    _reRenderForm(prefix);
}
window._csRemoveCourse = _csRemoveCourse;

function _csRemoveSession(prefix, stateKey, courseIdx, sessionId) {
    const stateRef = prefix === 'planState' ? (typeof planState !== 'undefined' ? planState : null)
        : prefix === 'applyState' ? (typeof applyState !== 'undefined' ? applyState : null)
            : (typeof _resultState !== 'undefined' ? _resultState : null);
    if (!stateRef || !Array.isArray(stateRef[stateKey])) return;
    const course = stateRef[stateKey][courseIdx];
    if (!course) return;
    course.sessions = course.sessions.filter(s => s.id !== sessionId);
    if (course.sessions.length === 0) stateRef[stateKey].splice(courseIdx, 1);
    _reRenderForm(prefix);
}
window._csRemoveSession = _csRemoveSession;
