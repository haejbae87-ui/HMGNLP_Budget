// ─── FO DYNAMIC FORM LOADER ──────────────────────────────────────────────────
// BO form_templates + field_definitions를 로드하여 FO Step4에 동적 필드를 렌더링합니다.
// 하드코딩 필드(계획명, 시작일, 종료일, 예산액, 상세내용)를 제거하고
// BO 양식 빌더에서 설정한 대로 화면에 표시합니다.

"use strict";

// ─── 전역 캐시 (TTL 기반 — BO 양식 수정 즉시 반영) ─────────────────────────
let _FIELD_DEF_CACHE = null; // field_definitions 전체
let _FIELD_DEF_LOADED_AT = 0; // 타임스탬프
let _FORM_TPL_CACHE = {}; // { formId: { data, loadedAt } }
const _CACHE_TTL_MS = 60_000; // 60초 TTL — BO 수정 후 최대 1분 내 반영

// ─── FO 전용: calc_grounds DB 경량 로더 (TTL 캐시) ─────────────────────────
let _FO_CG_CACHE = null;
let _FO_CG_LOADED_AT = 0;

async function _foLoadCalcGrounds() {
  if (_FO_CG_CACHE && Date.now() - _FO_CG_LOADED_AT < _CACHE_TTL_MS)
    return _FO_CG_CACHE;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    console.warn("[fo_form_loader] getSB 없음 — calc_grounds 로드 불가");
    return [];
  }
  try {
    const { data, error } = await sb
      .from("calc_grounds")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    _FO_CG_CACHE = (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      desc: r.description || "",
      tenantId: r.tenant_id,
      domainId: r.virtual_org_template_id || null,
      accountCode: r.account_code || null,
      sharedAccountCodes: r.shared_account_codes || [],
      unitPrice: r.unit_price || 0,
      softLimit: r.soft_limit || 0,
      hardLimit: r.hard_limit || 0,
      limitType: r.limit_type || "none",
      active: true,
      sortOrder: r.sort_order || 99,
      // ── 신규 컬럼 (calc_grounds_ux_redesign PRD 5.1) ──
      usageType: r.usage_type || "edu_operation", // 'self_learning' | 'edu_operation'
      hasRounds: r.has_rounds === true,           // 차수(qty3) 컬럼 활성 여부
      hasQty2: r.has_qty2 === true,              // 박/일/회(qty2) 컬럼 활성 여부
      qty2Type: r.qty2_type || "박",             // qty2 단위: '박' | '일' | '회'
      isOverseas: r.is_overseas === true,        // 해외 전용 항목 여부
      // Phase C: 조건부 산출근거 태깅
      applyConditions: r.apply_conditions || {},
    }));
    // CALC_GROUNDS_MASTER 동기화 (plans.js _renderCalcGroundsSection 재사용)
    if (typeof CALC_GROUNDS_MASTER !== "undefined") {
      CALC_GROUNDS_MASTER.length = 0;
      CALC_GROUNDS_MASTER.push(..._FO_CG_CACHE);
    }
    _FO_CG_LOADED_AT = Date.now();
    console.log(
      `[fo_form_loader] calc_grounds DB 로드: ${_FO_CG_CACHE.length}건`,
    );
  } catch (e) {
    console.warn("[fo_form_loader] calc_grounds 로드 실패:", e.message);
    _FO_CG_CACHE = [];
  }
  return _FO_CG_CACHE;
}
window._foLoadCalcGrounds = _foLoadCalcGrounds;

// 캐시 무효화 (Step 이동 시 또는 수동 호출용)
function invalidateFormCache() {
  _FIELD_DEF_CACHE = null;
  _FIELD_DEF_LOADED_AT = 0;
  _FORM_TPL_CACHE = {};
  console.log("[fo_form_loader] 양식 캐시 무효화 완료");
}
window.invalidateFormCache = invalidateFormCache;

// ─── 1. field_definitions 로드 (TTL 만료 시 재조회) ──────────────────────────
async function _loadFieldDefs() {
  if (_FIELD_DEF_CACHE && Date.now() - _FIELD_DEF_LOADED_AT < _CACHE_TTL_MS)
    return _FIELD_DEF_CACHE;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    _FIELD_DEF_CACHE = [];
    return [];
  }
  const { data, error } = await sb
    .from("field_definitions")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) {
    console.warn("[fo_form_loader] field_defs load error:", error.message);
    _FIELD_DEF_CACHE = [];
    return [];
  }
  _FIELD_DEF_CACHE = data || [];
  _FIELD_DEF_LOADED_AT = Date.now();
  return _FIELD_DEF_CACHE;
}

// ─── 2. 단일 form_template 로드 (TTL 만료 시 DB 재조회) ─────────────────────
async function _loadFormTemplate(formId) {
  const cached = _FORM_TPL_CACHE[formId];
  if (cached && cached.data && Date.now() - cached.loadedAt < _CACHE_TTL_MS)
    return cached.data;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return null;
  const { data, error } = await sb
    .from("form_templates")
    .select("*")
    .eq("id", formId)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) {
    console.warn(
      "[fo_form_loader] template load error:",
      formId,
      error?.message,
    );
    return null;
  }
  _FORM_TPL_CACHE[formId] = { data, loadedAt: Date.now() };
  return data;
}

// ─── 3. vorg + account + stage + eduType 자동 매칭 (fallback, TTL 적용) ──────
async function _loadFormTemplateByContext(
  vorgTemplateId,
  accountCode,
  stage,
  eduType,
) {
  const cacheKey = `${vorgTemplateId}|${accountCode}|${stage}|${eduType || ""}`;
  const cached = _FORM_TPL_CACHE[cacheKey];
  if (cached && cached.data && Date.now() - cached.loadedAt < _CACHE_TTL_MS)
    return cached.data;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return null;

  // 1순위: vorg + account + stage + edu_type 정확 매칭
  if (eduType) {
    let q1 = sb
      .from("form_templates")
      .select("*")
      .eq("status", "published")
      .eq("type", stage);
    if (vorgTemplateId) q1 = q1.eq("virtual_org_template_id", vorgTemplateId);
    if (accountCode) q1 = q1.eq("account_code", accountCode);
    q1 = q1.eq("edu_type", eduType);
    const { data: d1 } = await q1.limit(1).maybeSingle();
    if (d1) {
      _FORM_TPL_CACHE[cacheKey] = { data: d1, loadedAt: Date.now() };
      console.log(
        `[fo_form_loader] 양식 정확 매칭: ${d1.name} (eduType=${eduType})`,
      );
      return d1;
    }
  }

  // 2순위: vorg + account + stage (eduType 없이)
  // ★ P1-2: 복수 양식 존재 시 랜덤 반환 방지 → null
  let q2 = sb
    .from("form_templates")
    .select("*")
    .eq("status", "published")
    .eq("type", stage);
  if (vorgTemplateId) q2 = q2.eq("virtual_org_template_id", vorgTemplateId);
  if (accountCode) q2 = q2.eq("account_code", accountCode);
  const { data: d2arr, error } = await q2.limit(5);
  if (error || !d2arr || d2arr.length === 0) return null;
  // edu_type이 다른 양식이 복수이면 불확실 → null 반환
  if (d2arr.length > 1) {
    console.warn(
      `[fo_form_loader] 양식 복수(${d2arr.length}건) 발견, eduType 미지정 → null 반환 (잘못된 양식 방지)`,
    );
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

  // 1순위: Phase F - 인라인 폼 (stageFormFields)
  let inlineFieldsRaw = (policy.stage_form_fields && policy.stage_form_fields[stage])
                       || (policy.stageFormFields && policy.stageFormFields[stage]) 
                       || (policy.stage_form_ids && policy.stage_form_ids._fields && policy.stage_form_ids._fields[stage]);
                       
  // 하위 호환성 (Fallback): FO에서 'plan'을 요청했으나 BO에 'plan' 설정이 없고 레거시인 'ongoing'이나 'forecast'만 존재할 경우
  if (!inlineFieldsRaw && stage === 'plan') {
    inlineFieldsRaw = (policy.stage_form_fields && (policy.stage_form_fields['ongoing'] || policy.stage_form_fields['forecast']))
                   || (policy.stageFormFields && (policy.stageFormFields['ongoing'] || policy.stageFormFields['forecast']))
                   || (policy.stage_form_ids && policy.stage_form_ids._fields && (policy.stage_form_ids._fields['ongoing'] || policy.stage_form_ids._fields['forecast']));
  }
  
  if (inlineFieldsRaw) {
    const inlineFields = JSON.parse(JSON.stringify(inlineFieldsRaw)); // 불변성 유지
    // 무예산 정책(budgetLinked === false)일 경우 비용 필드 강제 Trim (보안 및 사이드이펙트 방지)
    if (policy.budgetLinked === false) {
      delete inlineFields['requested_budget'];
      delete inlineFields['calc_grounds'];
      delete inlineFields['reimbursement'];
      delete inlineFields['actual_cost'];
    }

    return {
      isInline: true,
      inlineFields: inlineFields,
      name: policy.name + ' 양식',
      // Legacy 렌더러(renderDynamicFormFields) 간섭 방지
      // Phase B 표준 렌더러는 inlineFields를 참조하므로 fields 배열은 비워둠
      fields: []
    };
  }

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
function renderDynamicFormFields(formFields, formState, prefix, curBudget) {
  if (!formFields || !formFields.length) return "";
  const fieldDefs = _FIELD_DEF_CACHE || [];

  // FO 표시 대상 필드: front + provide + is_bo_only (미입력 provide/bo_only는 숨김)
  let foFields = formFields.filter(
    (f) => !f.scope || f.scope === "front" || f.scope === "provide" || f.is_bo_only,
  );

  // [E-Learning 오버라이드] 이러닝, 실시간 화상 등 비대면/온라인 교육인 경우 오프라인 전용 필드 강제 숨김
  if (formState && (formState.eduType === '이러닝' || formState.eduType === '동영상' || formState.eduType === '실시간 화상')) {
    foFields = foFields.filter(f => !['장소', '강사정보', '대관비', '강사료'].includes(f.key));
  }

  if (!foFields.length) return "";

  // 어댑터: Dynamic fields 배열을 Phase B inlineFields 객체로 변환
  const inlineFields = {};
  
  // 키 매핑: BO 폼빌더의 한글 필드명 -> Phase B 표준 상태 키 매핑
  const keyMap = {
    "과정명": "course_name",
    "교육과정명": "course_name",
    "교육기간": "start_end_date",
    "장소": "venue_type",
    "예상비용": "requested_budget",
    "교육비": "requested_budget",
    "세부산출근거": "calc_grounds",
    "수강인원": "headcount",
    "정원": "headcount",
    "교육일수": "edu_days",
    "강사명": "instructor_name",
    "참가비": "participationFee",
    "강사료": "instructorFee",
    "대관비": "venueFee",
    "식대/용차": "mealTransportFee",
    "참여자명단": "participantList",
    "교육결과요약": "resultSummary",
    "수료생명단": "completionList",
    "학습만족도": "satisfaction",
    "첨부파일": "attachments"
  };

  const customFieldsToRender = [];

  foFields.forEach((fieldRef) => {
    const key = fieldRef.key;
    const def = fieldDefs.find((d) => d.key === key) || {};
    
    // is_bo_only 및 provide(값이 없는 경우) 필드 처리
    if (fieldRef.is_bo_only || def.is_bo_only) {
      if (!formState[key]) return; // 값이 없으면 렌더링 안함
    }
    if (fieldRef.scope === "provide") {
      if (!formState[key]) return;
    }

    const inlineKey = keyMap[key] || _toStateKey(key);
    
    // 만약 keyMap에 정의된 핵심 표준 필드라면 inlineFields에 등록
    if (keyMap[key] || ['course_name','start_end_date','venue_type','requested_budget','calc_grounds','headcount'].includes(inlineKey)) {
      inlineFields[inlineKey] = {
        label: fieldRef.label || def.key || key,
        required: fieldRef.required || def.required || false,
        type: fieldRef.fieldType || def.fieldType || 'text',
        originalKey: key
      };
    } else {
      // 그 외 커스텀 필드들은 기타 정보 등에 렌더링하기 위해 별도 수집
      customFieldsToRender.push({
        ref: fieldRef,
        def: def
      });
    }
  });

  inlineFields._customFields = customFieldsToRender;

  if (prefix === 'planState') {
    return window.foRenderStandardPlanForm(formState, curBudget, inlineFields);
  } else {
    return window.foRenderStandardApplyForm(formState, curBudget, inlineFields);
  }
}
window.renderDynamicFormFields = renderDynamicFormFields;

// ─── BO 전용 필드 읽기전용 렌더링 (FO에서 값 있을 때만 표시) ─────────────────
function _renderBoOnlyField(def, s, prefix) {
  const { key, field_type, icon, hint } = def;
  const stateKey = _toStateKey(key);
  // bo_only 데이터는 detail._bo 네임스페이스 또는 state 직접 참조
  const boData = s?._bo || {};
  const val = boData[stateKey] ?? s?.[stateKey] ?? "";

  // 미입력 시 숨김
  if (!val && val !== 0) return "";

  // select 타입: value → label 변환
  let displayVal = val;
  if (field_type === "select" && def.options) {
    const opt = def.options.find((o) => o.value === val);
    if (opt) displayVal = opt.label;
  }

  const label = `${icon || ""} ${key}`;
  return `<div style="margin-bottom:16px">
      <div style="padding:14px 18px;background:linear-gradient(135deg,#FFF7ED,#FFFBEB);border:1.5px solid #FED7AA;border-radius:12px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:9px;font-weight:800;color:#C2410C;background:#FEF3C7;padding:2px 8px;border-radius:4px">🛡️ 운영담당자 코멘트</span>
          <label style="font-size:12px;font-weight:800;color:#92400E">${label}</label>
        </div>
        <div style="font-size:14px;font-weight:600;color:#111827;white-space:pre-wrap;line-height:1.5">${_esc(String(displayVal))}</div>
        ${hint ? `<div style="font-size:11px;color:#B45309;margin-top:6px">${hint}</div>` : ""}
      </div>
    </div>`;
}

// ─── provide 필드 읽기전용 렌더링 (미입력 시 숨김) ───────────────────────────────
function _renderProvideField(def, s, prefix) {
  const { key, field_type, icon, hint } = def;
  const stateKey = _toStateKey(key);
  // provide 데이터는 detail._provide 네임스페이스 또는 state 직접 참조
  const provideData = s?._provide || {};
  const val = provideData[stateKey] ?? s?.[stateKey] ?? "";

  // 미입력 시 숨김
  if (!val && val !== 0) return "";

  // select 타입: value → label 변환
  let displayVal = val;
  if (field_type === "select" && def.options) {
    const opt = def.options.find((o) => o.value === val);
    if (opt) displayVal = opt.label;
  }

  const label = `${icon || ""} ${key}`;
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
  const label = `${icon || ""} ${key}`;
  const reqMark = required ? '<span style="color:#EF4444">*</span>' : "";
  const stateKey = _toStateKey(key); // '교육기간' → 'eduPeriod' 매핑
  const val = s?.[stateKey] ?? "";

  const labelHtml = `<label style="display:block;font-size:11px;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">${label} ${reqMark}</label>`;
  const hintHtml = hint
    ? `<div style="font-size:11px;color:#9CA3AF;margin-top:4px">${hint}</div>`
    : "";

  let inputHtml = "";

  switch (field_type) {
    case "text":
      inputHtml = `<input type="text" value="${_esc(val)}"
        oninput="${prefix}.${stateKey}=this.value"
        placeholder="${_esc(hint || key)}"
        style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-weight:600;font-size:14px;color:#111827;transition:border-color .15s;box-sizing:border-box"
        onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'"/>`;
      break;

    case "textarea":
      inputHtml = `<textarea rows="3"
        oninput="${prefix}.${stateKey}=this.value"
        placeholder="${_esc(hint || key)}"
        style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:500;color:#374151;resize:none;transition:border-color .15s;box-sizing:border-box"
        onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'">${_esc(val)}</textarea>`;
      break;

    case "number":
    case "budget-linked": {
      // budget-linked 타입: 예산 잔액 연동 숫자 필드
      const isBudget = field_type === "budget-linked";
      inputHtml = `<div style="position:relative;max-width:340px">
        <input type="number" value="${_esc(val)}"
          oninput="${prefix}.${stateKey}=+this.value${isBudget ? `;${prefix}.amount=+this.value` : ""}"
          placeholder="0"
          style="width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 48px 12px 16px;font-weight:700;font-size:16px;color:#111827;box-sizing:border-box"/>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
      </div>`;
      break;
    }

    case "daterange": {
      // 시작일 + 종료일 쌍
      const startKey = stateKey + "Start";
      const endKey = stateKey + "End";
      const sVal = s?.[startKey] ?? s?.startDate ?? "";
      const eVal = s?.[endKey] ?? s?.endDate ?? "";
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

    case "calc-grounds":
      // FO: DB에서 calc_grounds 로드 완료 후 기존 컴포넌트 재사용
      if (typeof _renderCalcGroundsSection === "function") {
        const curBudget = _resolveCurrentBudget(s, prefix);
        const result = _renderCalcGroundsSection(s, curBudget);
        if (result) {
          inputHtml = result;
          break;
        }
      }
      // 폴백: DB 로드되었으나 해당 계정 항목 없음
      inputHtml = `<div style="background:#F0F9FF;border:2px dashed #93C5FD;border-radius:12px;padding:20px;text-align:center">
              <div style="font-size:24px;margin-bottom:8px">📐</div>
              <div style="font-size:12px;font-weight:700;color:#1D4ED8;margin-bottom:4px">세부 산출 근거</div>
              <div style="font-size:11px;color:#6B7280;margin-bottom:12px">이 예산 계정/가상교육조직에 매핑된 세부산출근거 항목이 없습니다.<br>BO 관리자에게 확인하세요.</div>
            </div>`;
      break;

    case "file":
      inputHtml = `<label style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:#F9FAFB;border:2px dashed #D1D5DB;border-radius:12px;cursor:pointer;font-size:13px;font-weight:600;color:#6B7280">
        <span style="font-size:22px">📎</span>
        <span>${key} 파일 첨부<br><span style="font-size:11px;font-weight:400">${hint || "파일을 선택하세요"}</span></span>
        <input type="file" style="display:none" onchange="_handleFileAttach(event,'${_esc(stateKey)}','${prefix}')"/>
      </label>`;
      break;

    case "user-search":
      inputHtml = `<div style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;font-size:13px;color:#6B7280">
        👤 ${key} 검색 기능 (추후 사용자 검색 연동 예정)
      </div>`;
      break;

    case "rating":
      inputHtml = `<div style="display:flex;gap:8px;align-items:center">
        ${[1, 2, 3, 4, 5]
          .map(
            (n) => `
          <button type="button" onclick="${prefix}.${stateKey}=${n};_reRenderForm('${prefix}')"
            style="width:40px;height:40px;border-radius:50%;border:2px solid ${val >= n ? "#FBBF24" : "#E5E7EB"};background:${val >= n ? "#FFFBEB" : "#F9FAFB"};font-size:20px;cursor:pointer">⭐</button>`,
          )
          .join("")}
        <span style="margin-left:8px;font-size:13px;font-weight:700;color:#6B7280">${val || 0}점</span>
      </div>`;
      break;

    case "course-session": {
      // 다과정·다차수 부분 선택 필드
      const links = Array.isArray(val) ? val : [];
      const linksTable =
        links.length > 0
          ? `
              <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:12px">
                <thead><tr style="border-bottom:2px solid #E5E7EB">
                  <th style="text-align:left;padding:6px 8px;font-weight:800;color:#374151">과정명</th>
                  <th style="text-align:left;padding:6px 8px;font-weight:800;color:#374151">차수</th>
                  <th style="text-align:center;padding:6px 8px;width:40px"></th>
                </tr></thead>
                <tbody>${links
                  .map(
                    (lnk, li) => `
                  <tr style="border-bottom:1px solid #F3F4F6">
                    <td style="padding:6px 8px;font-weight:700;color:#1D4ED8">
                      <div>📺 ${lnk.channelName || ""}</div>
                      <div style="font-weight:800;color:#111827">📚 ${lnk.courseName || lnk.courseId}</div>
                    </td>
                    <td style="padding:6px 8px">${(lnk.sessions || [])
                      .map(
                        (ss) => `
                      <span style="display:inline-block;margin:2px 4px 2px 0;padding:2px 8px;background:#D1FAE5;color:#065F46;border-radius:6px;font-size:10px;font-weight:700">
                        ${ss.no}차 ${ss.name || ""}${ss.period ? " (" + ss.period + ")" : ""}
                        <span onclick="_csRemoveSession('${prefix}','${stateKey}',${li},'${ss.id}')" style="cursor:pointer;color:#DC2626;margin-left:4px">✕</span>
                      </span>`,
                      )
                      .join("")}
                    </td>
                    <td style="text-align:center;padding:6px 8px">
                      <button onclick="_csRemoveCourse('${prefix}','${stateKey}',${li})" style="border:none;background:none;color:#DC2626;cursor:pointer;font-size:14px;font-weight:900" title="과정 전체 삭제">🗑</button>
                    </td>
                  </tr>`,
                  )
                  .join("")}
                </tbody>
              </table>`
          : "";
      inputHtml = `<div style="background:#F9FAFB;border:2px solid #E5E7EB;border-radius:12px;padding:14px 16px">
              ${linksTable}
              <button type="button" onclick="_csOpenModal('${prefix}','${stateKey}')"
                style="font-size:12px;font-weight:700;color:#1D4ED8;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:8px;padding:8px 16px;cursor:pointer">📺 과정 추가</button>
              ${links.length === 0 ? '<span style="font-size:11px;color:#9CA3AF;margin-left:8px">채널의 과정/차수를 선택하여 예산 근거로 사용</span>' : `<span style="font-size:10px;color:#059669;margin-left:8px;font-weight:700">${links.length}개 과정 · ${links.reduce((s, l) => s + (l.sessions || []).length, 0)}개 차수 선택됨</span>`}
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

function _resolveStateRef(prefix) {
  if (!prefix) return null;
  if (prefix === "planState") return typeof planState !== "undefined" ? planState : null;
  if (prefix === "applyState") return typeof applyState !== "undefined" ? applyState : null;
  if (prefix === "_resultState") return typeof _resultState !== "undefined" ? _resultState : null;
  try { return eval(prefix); } catch(e) { return null; }
}

// ─── 키 매핑 (한글 → camelCase 상태 키) ───────────────────────────────────────
const _KEY_MAP = {
  교육목적: "purpose_text",
  교육기간: "eduPeriod",
  교육기간시작: "startDate",
  교육기간종료: "endDate",
  교육기관: "institution",
  과정명: "title",
  장소: "location",
  기대효과: "expectedEffect",
  예상비용: "amount",
  교육비: "tuitionFee",
  참가비: "participationFee",
  강사료: "instructorFee",
  대관비: "venueFee",
  "식대/용차": "mealTransportFee",
  실지출액: "actualCost",
  세부산출근거: "calcGrounds_render",
  교육대상: "targetAudience",
  "과정시간(차수별)": "courseHoursPerSession",
  수강인원: "headcount",
  정원: "capacity",
  참여자명단: "participantList",
  강사정보: "instructorInfo",
  교육결과요약: "resultSummary",
  수료생명단: "completionList",
  학습만족도: "satisfaction",
  첨부파일: "attachments",
  강사이력서: "instructorResume",
  보안서약서: "securityPledge",
  영수증: "receipt",
  수료증: "completionCert",
  대관확정서: "venueConfirm",
  납품확인서: "deliveryConfirm",
  "과정-차수연결": "courseSessionLinks",
  // provide 필드
  안내사항: "announcement",
  준비물: "preparation",
  "확정 교육장소": "confirmedVenue",
  "확정 강사": "confirmedInstructor",
  "합격/수료 여부": "passStatus",
  "관리자 피드백": "managerFeedback",
  // back 필드
  ERP코드: "erpCode",
  검토의견: "reviewComment",
  관리자비고: "adminNote",
};

function _toStateKey(key) {
  return _KEY_MAP[key] || key.replace(/[^a-z0-9가-힣]/gi, "_");
}

function _esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// budget resolve 헬퍼
function _resolveCurrentBudget(s, prefix) {
  if (!s) return null;
  const budgets = currentPersona?.budgets || [];
  return budgets.find((b) => b.id === s.budgetId) || null;
}

// 파일 첨부 핸들러
function _handleFileAttach(event, stateKey, prefix) {
  const file = event.target?.files?.[0];
  if (!file) return;
  const stateRef = _resolveStateRef(prefix);
  if (stateRef) {
    stateRef[stateKey] = file.name;
  }
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
  let foFields = formTemplate.fields.filter(
    (f) => !f.scope || f.scope === "front",
  );

  // [E-Learning 오버라이드] 렌더링 시 숨긴 필드들은 필수값 검증에서도 제외
  if (state && (state.eduType === '이러닝' || state.eduType === '동영상' || state.eduType === '실시간 화상')) {
    foFields = foFields.filter(f => !['장소', '강사정보', '대관비', '강사료'].includes(f.key));
  }

  for (const fieldRef of foFields) {
    const key = fieldRef.key;
    const def = fieldDefs.find((d) => d.key === key);
    if (!def) continue;

    // 필수 여부 판단: 양식별 오버라이드(fieldRef.required) > 필드 정의(def.required)
    const isRequired =
      fieldRef.required !== undefined ? fieldRef.required : def.required;
    if (!isRequired) continue;

    const stateKey = _toStateKey(key);
    const val = state?.[stateKey];

    // 타입별 빈 값 체크
    let isEmpty = false;
    switch (def.field_type) {
      case "daterange": {
        const startKey = stateKey + "Start";
        const endKey = stateKey + "End";
        const sVal = state?.[startKey] ?? state?.startDate ?? "";
        const eVal = state?.[endKey] ?? state?.endDate ?? "";
        isEmpty = !sVal || !eVal;
        break;
      }
      case "number":
      case "budget-linked":
        isEmpty =
          val === undefined || val === null || val === "" || Number(val) === 0;
        break;
      case "rating":
        isEmpty = !val || Number(val) === 0;
        break;
      case "course-session":
        isEmpty = !Array.isArray(val) || val.length === 0;
        break;
      case "file":
        isEmpty = !val;
        break;
      default:
        isEmpty = !val || String(val).trim() === "";
    }

    if (isEmpty) {
      const label = (def.icon || "") + " " + key;
      errors.push(label.trim());
    }
  }

  return { valid: errors.length === 0, errors };
}
window.validateRequiredFields = validateRequiredFields;

// 별점 재렌더를 위한 글로벌 트리거 (간이 구현)
function _reRenderForm(prefix) {
  if (prefix === "planState" && typeof renderPlanWizard === "function")
    renderPlanWizard();
  else if (prefix === "applyState" && typeof renderApplyWizard === "function")
    renderApplyWizard();
}

// ─── 6. 대표 정책 추출 헬퍼 (선택된 budgetId + purpose 기준) ──────────────────
// plans.js/apply.js에서 호출: getMatchedPolicyForStage(currentPersona, purpose, budgetAccountCode, stage)
async function getMatchedPolicyForStage(
  persona,
  purposeId,
  accountCode,
  stage,
) {
  let policies = [];
  if (typeof SERVICE_POLICIES !== "undefined" && SERVICE_POLICIES.length) {
    policies = SERVICE_POLICIES;
  } else if (typeof _getActivePolicies !== "undefined") {
    const r = _getActivePolicies(persona);
    policies = r?.policies || [];
  }
  // purpose + accountCode로 필터
  const matched =
    policies.find((p) => {
      const pPurpose = p.purpose || "";
      const pAccounts = p.account_codes || p.accountCodes || [];
      const purposeOk = !purposeId || pPurpose === purposeId;
      const accountOk = !accountCode || pAccounts.includes(accountCode);
      return purposeOk && accountOk;
    }) ||
    policies[0] ||
    null;
  if (!matched) return null;
  return await getFoFormTemplate(matched, stage);
}
window.getMatchedPolicyForStage = getMatchedPolicyForStage;

// ─── 과정-차수 연결 필드 전역 함수 ────────────────────────────────────────────
let _csPrefix = "";
let _csStateKey = "";
let _csCourses = []; // 모달 캐시
let _csChMap = {}; // 채널 이름 캐시

function _csOpenModal(prefix, stateKey) {
  _csPrefix = prefix;
  _csStateKey = stateKey;
  // 모달이 이미 DOM에 있으면 재사용
  let modal = document.getElementById("cs-picker-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cs-picker-modal";
    document.body.appendChild(modal);
  }
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;display:flex;align-items:center;justify-content:center";
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
  const body = document.getElementById("cs-picker-body");
  if (!body) return;
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) {
    body.innerHTML = '<p style="color:#EF4444">DB 연결 없음</p>';
    return;
  }
  const persona = typeof currentPersona !== "undefined" ? currentPersona : {};
  const tenantId = persona.tenantId || "HMC";

  // 채널 담당자 여부
  let channelFilter = null;
  try {
    const { data: myRoles } = await sb
      .from("user_roles")
      .select("role_code")
      .eq("user_id", persona.id)
      .eq("tenant_id", tenantId);
    const chRoles = (myRoles || []).filter((r) =>
      r.role_code.includes("_ch_mgr_"),
    );
    if (chRoles.length > 0) {
      const { data: channels } = await sb
        .from("edu_channels")
        .select("id,name")
        .in(
          "role_code",
          chRoles.map((r) => r.role_code),
        );
      channelFilter = (channels || []).map((c) => c.id);
    }
  } catch (e) {}

  let courses = [];
  try {
    let q = sb
      .from("edu_courses")
      .select("id,title,channel_id,edu_type,status")
      .eq("tenant_id", tenantId);
    if (channelFilter && channelFilter.length > 0)
      q = q.in("channel_id", channelFilter);
    else q = q.eq("status", "active");
    const { data } = await q.order("title");
    courses = data || [];
  } catch (e) {
    courses = [];
  }
  _csCourses = courses;

  if (courses.length === 0) {
    body.innerHTML =
      '<div style="padding:30px;text-align:center;color:#9CA3AF"><div style="font-size:32px;margin-bottom:8px">📚</div>선택 가능한 교육과정이 없습니다</div>';
    return;
  }

  const chIds = [...new Set(courses.map((c) => c.channel_id))];
  try {
    const { data } = await sb
      .from("edu_channels")
      .select("id,name")
      .in("id", chIds);
    _csChMap = {};
    (data || []).forEach((c) => (_csChMap[c.id] = c.name));
  } catch (e) {}

  const statusLabel = { draft: "초안", active: "운영중", closed: "종료" };
  body.innerHTML = courses
    .map(
      (
        c,
      ) => `<div style="border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 16px;margin-bottom:10px;cursor:pointer;transition:all .15s"
      onmouseover="this.style.borderColor='#93C5FD';this.style.background='#F0F9FF'"
      onmouseout="this.style.borderColor='#E5E7EB';this.style.background='#fff'"
      onclick="_csLoadSessions('${c.id}','${(c.title || "").replace(/'/g, "\\\'")}','${c.channel_id}')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:11px;color:#6B7280">채널: ${_csChMap[c.channel_id] || "-"}</div>
          <div style="font-size:13px;font-weight:800;color:#374151">📚 ${c.title}</div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${c.status === "active" ? "#059669" : "#D97706"};background:${c.status === "active" ? "#D1FAE5" : "#FEF3C7"};padding:2px 8px;border-radius:6px">${statusLabel[c.status] || c.status}</span>
      </div>
    </div>`,
    )
    .join("");
}

async function _csLoadSessions(courseId, courseTitle, channelId) {
  const body = document.getElementById("cs-picker-body");
  if (!body) return;
  body.innerHTML =
    '<div style="padding:20px;text-align:center;color:#9CA3AF">⏳ 차수 로딩 중...</div>';
  const sb = typeof getSB === "function" ? getSB() : null;
  if (!sb) return;
  const persona = typeof currentPersona !== "undefined" ? currentPersona : {};
  const tenantId = persona.tenantId || "HMC";

  let sessions = [];
  try {
    const { data } = await sb
      .from("edu_sessions")
      .select("id,session_no,name,start_date,end_date,status,capacity")
      .eq("course_id", courseId)
      .eq("tenant_id", tenantId)
      .in("status", ["planned", "open", "in_progress"])
      .order("session_no");
    sessions = data || [];
  } catch (e) {
    sessions = [];
  }

  const backBtn = `<button onclick="_csLoadCourses()" style="font-size:11px;color:#1D4ED8;background:none;border:none;cursor:pointer;font-weight:700;margin-bottom:10px">← 과정 목록으로</button>`;
  const header = `<div style="font-size:14px;font-weight:800;color:#374151;margin-bottom:12px">📚 ${courseTitle}</div>`;

  if (sessions.length === 0) {
    body.innerHTML =
      backBtn +
      header +
      '<div style="padding:20px;text-align:center;color:#9CA3AF">등록된 차수가 없습니다</div>';
    return;
  }

  // 이미 선택된 차수 표시를 위해 현재 상태 참조
  const stateRef = _resolveStateRef(_csPrefix);
  const existing = (stateRef[_csStateKey] || []).find(
    (l) => l.courseId === courseId,
  );
  const existingIds = new Set((existing?.sessions || []).map((s) => s.id));

  const statusLabel = {
    planned: "계획",
    open: "모집중",
    in_progress: "진행중",
  };
  const statusColor = {
    planned: "#6B7280",
    open: "#059669",
    in_progress: "#1D4ED8",
  };

  body.innerHTML =
    backBtn +
    header +
    `
    <div style="margin-bottom:12px;font-size:11px;color:#6B7280">차수를 체크한 후 아래 "선택 추가" 버튼을 클릭하세요</div>
    <div id="cs-session-list">
    ${sessions
      .map((s) => {
        const alreadySelected = existingIds.has(s.id);
        return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid ${alreadySelected ? "#BBF7D0" : "#E5E7EB"};border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .12s;background:${alreadySelected ? "#F0FDF4" : "#fff"}"
          onmouseover="this.style.borderColor='#6EE7B7'" onmouseout="this.style.borderColor='${alreadySelected ? "#BBF7D0" : "#E5E7EB"}'">
          <input type="checkbox" value="${s.id}" data-no="${s.session_no}" data-name="${(s.name || "").replace(/"/g, "&quot;")}" data-start="${s.start_date || ""}" data-end="${s.end_date || ""}" ${alreadySelected ? "checked disabled" : ""}
            style="accent-color:#059669;width:16px;height:16px">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:800;color:#374151">🗓️ ${s.session_no}차 — ${s.name || ""}</div>
            <div style="font-size:11px;color:#6B7280">${s.start_date || "-"} ~ ${s.end_date || "-"} · 정원 ${s.capacity || "-"}명</div>
          </div>
          <span style="font-size:10px;font-weight:700;color:${statusColor[s.status] || "#6B7280"}">${statusLabel[s.status] || s.status}</span>
          ${alreadySelected ? '<span style="font-size:9px;color:#059669;font-weight:700">선택됨</span>' : ""}
        </label>`;
      })
      .join("")}
    </div>
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
      <button onclick="_csLoadCourses()" style="padding:8px 18px;border:1.5px solid #E5E7EB;border-radius:8px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
      <button onclick="_csConfirmSessions('${courseId}','${courseTitle.replace(/'/g, "\\\'")}','${channelId}')" style="padding:8px 22px;background:#059669;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">✅ 선택 추가</button>
    </div>`;
}
window._csLoadSessions = _csLoadSessions;
window._csLoadCourses = _csLoadCourses;

function _csConfirmSessions(courseId, courseTitle, channelId) {
  const checks = document.querySelectorAll(
    "#cs-session-list input[type=checkbox]:checked:not([disabled])",
  );
  if (checks.length === 0) {
    alert("추가할 차수를 1개 이상 선택하세요.");
    return;
  }

  const stateRef = _resolveStateRef(_csPrefix);
  if (!stateRef) return;
  if (!Array.isArray(stateRef[_csStateKey])) stateRef[_csStateKey] = [];

  const newSessions = Array.from(checks).map((cb) => ({
    id: cb.value,
    no: parseInt(cb.dataset.no) || 0,
    name: cb.dataset.name || "",
    period:
      cb.dataset.start && cb.dataset.end
        ? `${cb.dataset.start}~${cb.dataset.end}`
        : "",
  }));

  // 같은 과정이 이미 있으면 차수 병합
  const existing = stateRef[_csStateKey].find((l) => l.courseId === courseId);
  if (existing) {
    const existingIds = new Set(existing.sessions.map((s) => s.id));
    newSessions.forEach((ns) => {
      if (!existingIds.has(ns.id)) existing.sessions.push(ns);
    });
    existing.sessions.sort((a, b) => a.no - b.no);
  } else {
    stateRef[_csStateKey].push({
      channelId: channelId,
      channelName: _csChMap[channelId] || "",
      courseId: courseId,
      courseName: courseTitle,
      sessions: newSessions.sort((a, b) => a.no - b.no),
    });
  }

  // 모달 닫기 + 폼 재렌더
  document.getElementById("cs-picker-modal").style.display = "none";
  _reRenderForm(_csPrefix);
}
window._csConfirmSessions = _csConfirmSessions;

function _csRemoveCourse(prefix, stateKey, idx) {
  const stateRef = _resolveStateRef(prefix);
  if (!stateRef || !Array.isArray(stateRef[stateKey])) return;
  stateRef[stateKey].splice(idx, 1);
  _reRenderForm(prefix);
}
window._csRemoveCourse = _csRemoveCourse;

function _csRemoveSession(prefix, stateKey, courseIdx, sessionId) {
  const stateRef = _resolveStateRef(prefix);
  if (!stateRef || !Array.isArray(stateRef[stateKey])) return;
  const course = stateRef[stateKey][courseIdx];
  if (!course) return;
  course.sessions = course.sessions.filter((s) => s.id !== sessionId);
  if (course.sessions.length === 0) stateRef[stateKey].splice(courseIdx, 1);
  _reRenderForm(prefix);
}
window._csRemoveSession = _csRemoveSession;

// ─── Phase C: FO 조건부 산출근거 필터링 ────────────────────────────────────
// plans.js / apply.js 에서 호출: foGetApplicableCalcGrounds(calcGroundsList, foContext)
// foContext = { isOverseas: bool, hasAccommodation: bool, venueType: 'internal'|'external'|'online' }
// 관대한 매칭(EC-05): 조건 키가 foContext에 없으면 항상 표시
window.foGetApplicableCalcGrounds = function(calcGroundsList, foContext) {
  if (!Array.isArray(calcGroundsList)) return [];
  if (typeof window.getApplicableCalcGrounds === 'function') {
    // bo_calc_grounds.js의 표준 필터 함수 재사용
    const sel = {
      is_overseas:      foContext?.isOverseas ?? undefined,
      has_accommodation: foContext?.hasAccommodation ?? undefined,
      venue_type:       foContext?.venueType ?? undefined,
    };
    // undefined 키 제거 (관대한 매칭 보장)
    Object.keys(sel).forEach(k => sel[k] === undefined && delete sel[k]);
    return window.getApplicableCalcGrounds(calcGroundsList, sel);
  }
  // 폴백: apply_conditions 없으면 모두 표시
  return calcGroundsList.filter(function(item) {
    const conds = item.applyConditions || item.apply_conditions || {};
    if (!Object.keys(conds).length) return true;
    if (foContext?.isOverseas !== undefined && 'is_overseas' in conds) {
      if (conds.is_overseas !== foContext.isOverseas) return false;
    }
    if (foContext?.hasAccommodation !== undefined && 'has_accommodation' in conds) {
      if (conds.has_accommodation !== foContext.hasAccommodation) return false;
    }
    if (foContext?.venueType !== undefined && 'venue_type' in conds) {
      const vt = conds.venue_type;
      const match = Array.isArray(vt) ? vt.includes(foContext.venueType) : vt === foContext.venueType;
      if (!match) return false;
    }
    return true;
  });
};

// FO에서 사용자 선택 변경 시 calc_grounds 섹션을 재렌더링하는 트리거 함수
window.refreshCalcGroundsByContext = function(foContext, prefix) {
  // foContext 저장
  if (prefix === 'planState' && typeof planState !== 'undefined') {
    planState._foContext = foContext;
  } else if (prefix === 'applyState' && typeof applyState !== 'undefined') {
    applyState._foContext = foContext;
  }
  // 페이지 재렌더링
  _reRenderForm(prefix);
};

// ─── Phase B: FO 표준 렌더러 ─────────────────────────────────────────────────
// BO form_templates 의존 없이 정규화 컬럼 기반으로 직접 입력 UI를 렌더링합니다.
// PRD form_simplification.md Phase B 기준 구현

/**
 * 교육계획 표준 입력 폼 렌더러 (Phase B)
 * @param {Object} s - planState
 * @param {Object} curBudget - 선택된 예산 객체
 * @returns {string} HTML string
 */
window.foRenderStandardPlanForm = function(s, curBudget, inlineFields) {
  const inline = inlineFields || {};
  // BO에서 명시적으로 필드를 설정한 경우(hasExplicitFields), 설정된 필드만 표시
  const inlineKeys = Object.keys(inline);
  const hasExplicitFields = inlineKeys.length > 0;

  const isOverseas   = s.is_overseas === true || s.region === 'overseas';
  const eduType      = s.eduType || '';
  const subType      = s.subType || '';
  const venueType    = s.venue_type || '';
  const isElearning  = ['이러닝', 'elearning'].includes(eduType) || subType.includes('elearning');

  const isNoBudget = curBudget?.account === '참가' || curBudget?.usesBudget === false || curBudget?.uses_budget === false;

  // BO 양식에 키가 있으면 표시, 명시적 false면 숨김, BO 양식이 없으면 기본 표시
  const _shouldShow = (key, defaultShow = true) => {
    if (inline[key] === false) return false;
    if (hasExplicitFields) return inline[key] !== undefined && inline[key] !== false;
    return defaultShow;
  };

  // 핵심 필드(계획명, 일정, 금액)는 BO에서 명시적 false가 아닌 한 항상 표시
  const showRegion = _shouldShow('is_overseas') && !isElearning;
  const showTitle = _shouldShow('edu_name') || _shouldShow('course_name');
  const showDates = _shouldShow('start_end_date');
  const showVenue = _shouldShow('venue_type') && !isElearning;
  const showHeadcount = _shouldShow('headcount') || _shouldShow('planned_headcount');
  const showAmount = _shouldShow('requested_budget') && !isNoBudget;
  const showCalc = _shouldShow('calc_grounds') && !isNoBudget;
  const showRounds = _shouldShow('planned_rounds') || _shouldShow('expected_count');
  
  const wrapSection = (title, icon, fieldsArray) => {
    const content = fieldsArray.filter(Boolean).join('\n');
    if (!content.trim()) return '';
    return `
      <div class="mb-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
          <span>${icon}</span> ${title}
        </div>
        <div class="p-5 grid gap-5">
          ${content}
        </div>
      </div>
    `;
  };

  const _field = (key, label, type, placeholder, stateObj = 'planState') => {
    // BO 인라인 필드 메타데이터 적용: label, placeholder, required 등 오버라이드
    const inlineMeta = (typeof inline[key] === 'object' && inline[key] !== null) ? inline[key] : null;
    if (inline[key] === false) return '';
    // BO에서 명시적으로 필드를 설정한 경우, 설정된 필드만 표시
    if (hasExplicitFields && inline[key] === undefined) return '';
    // BO 메타데이터로 label/placeholder 오버라이드
    if (inlineMeta) {
      label = inlineMeta.label || label;
      placeholder = inlineMeta.placeholder || placeholder;
      if (inlineMeta.type) type = inlineMeta.type;
    }
    const reqMark = (inlineMeta?.required) ? ' <span class="text-red-500">*</span>' : '';
    if (type === 'textarea') {
      return `
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
          <textarea oninput="${stateObj}.${key}=this.value" rows="3" placeholder="${placeholder}"
            class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s[key] || ''}</textarea>
        </div>`;
    }
    if (type === 'boolean') {
      return `
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
          <label class="flex items-center cursor-pointer gap-2">
            <input type="checkbox" onchange="${stateObj}.${key}=this.checked" ${s[key] ? 'checked' : ''} class="w-5 h-5 accent-accent">
            <span class="text-sm font-bold text-gray-700">선택 (Yes)</span>
          </label>
        </div>`;
    }
    return `
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
        <input type="${type}" value="${s[key] || ''}" oninput="${stateObj}.${key}=this.value" placeholder="${placeholder}"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>`;
  };

  const managerInfoField = (inline.manager_info !== false) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">👤 담당자 정보</label>
      <div class="flex gap-2">
        <input type="text" value="${s.manager_info || ''}" readonly placeholder="[검색] 버튼을 클릭하세요"
          class="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition cursor-not-allowed"/>
        <button type="button" onclick="_foOpenUserSearch('planState', 'manager_info')" class="bg-blue-100 text-blue-700 font-bold px-4 rounded-xl border border-blue-200">검색</button>
      </div>
    </div>` : '';

  const educationFormatField = (inline.education_format !== false) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💻 교육형태 <span class="text-red-500">*</span></label>
      <div class="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
        <button onclick="planState.education_format='오프라인';renderPlanWizard()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${s.education_format!=='온라인' ? 'bg-white text-accent shadow-sm' : 'bg-transparent text-gray-400'}">🏫 오프라인</button>
        <button onclick="planState.education_format='온라인';renderPlanWizard()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${s.education_format==='온라인' ? 'bg-accent text-white shadow-md' : 'bg-transparent text-gray-400'}">💻 온라인</button>
      </div>
    </div>` : '';

  const regionToggle = showRegion ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🌐 교육 지역 <span class="text-red-500">*</span></label>
      <div class="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
        <button onclick="planState.is_overseas=false;planState.region='domestic';renderPlanWizard()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${!isOverseas ? 'bg-white text-accent shadow-sm' : 'bg-transparent text-gray-400'}">🗺 국내</button>
        <button onclick="planState.is_overseas=true;planState.region='overseas';renderPlanWizard()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${isOverseas ? 'bg-accent text-white shadow-md' : 'bg-transparent text-gray-400'}">🌏 해외</button>
      </div>
    </div>` : '';

  const countryField = (showRegion && isOverseas) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🌐 교육 국가 <span class="text-red-500">*</span></label>
      <input type="text" value="${s.overseas_country || ''}" oninput="planState.overseas_country=this.value"
        placeholder="예) 미국, 일본, 독일" class="w-full bg-gray-50 border-2 border-blue-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
    </div>` : '';

  const titleField = showTitle ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">교육과정명 <span class="text-red-500">*</span></label>
      <input type="text" value="${s.title || ''}" oninput="planState.title=this.value"
        placeholder="예) 26년 AI 탐구형 학습 계획"
        class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
    </div>` : '';

  const datesField = showDates ? `
    <div class="grid grid-cols-2 gap-5">
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">시작일</label>
        <input type="date" value="${s.startDate || ''}" oninput="planState.startDate=this.value"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
      </div>
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">종료일</label>
        <input type="date" value="${s.endDate || ''}" oninput="planState.endDate=this.value"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
      </div>
    </div>` : '';

  const venueField = showVenue ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🏢 장소 유형</label>
      <div class="grid grid-cols-3 gap-2">
        ${[ {v:'internal', icon:'🏭', label:'사내'}, {v:'external', icon:'🏨', label:'외부 임차'}, {v:'online', icon:'💻', label:'온라인'} ].map(({v, icon, label}) => `
        <button onclick="planState.venue_type='${v}';renderPlanWizard()"
          class="py-2.5 px-3 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all ${venueType===v ? 'border-accent bg-blue-50 text-accent' : 'border-gray-200 bg-white text-gray-500'}">
          ${icon} ${label}
        </button>`).join('')}
      </div>
    </div>` : '';

  const headcountField = (showHeadcount || showRounds) ? `
    <div class="grid grid-cols-2 gap-5">
      ${showHeadcount ? `
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">👥 참가인원 (명)</label>
        <input type="number" value="${s.planned_headcount || ''}" oninput="planState.planned_headcount=Number(this.value)" placeholder="0" min="1"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>` : '<div></div>'}
      ${showRounds ? `
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🔄 예상 차수</label>
        <input type="number" value="${s.planned_rounds || 1}" oninput="planState.planned_rounds=Number(this.value)" placeholder="1" min="1"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>` : '<div></div>'}
    </div>` : '';

  const calcSection = showCalc ? (typeof window._renderCalcGroundsSection === 'function' ? window._renderCalcGroundsSection(s, curBudget) : `
    <div class="mt-5">
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">📐 세부산출근거</label>
      <div class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-400 text-center border-dashed">
        [세부산출근거 시스템 자동 렌더링 영역]
      </div>
    </div>`) : '';

  const locationSection = showVenue && typeof _renderLocationTagInput === 'function' ? _renderLocationTagInput(s) : '';

  const amountField = showAmount ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💰 예산 계획액</label>
      <div class="relative max-w-xs">
        <input type="number" value="${s.amount || 0}" oninput="planState.amount=this.value;_syncCalcToAmount()" placeholder="0"
          class="w-full bg-gray-50 border-2 ${s.hardLimitViolated ? 'border-red-400' : 'border-gray-100'} rounded-xl px-4 py-3 pr-12 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
      </div>
      ${s.hardLimitViolated ? '<div class="mt-1.5 text-xs font-black text-red-600">🚫 Hard Limit 초과 항목이 있어 계획을 저장할 수 없습니다.</div>' : ''}
      ${typeof _renderApprovalRouteInfo === 'function' ? _renderApprovalRouteInfo(s, curBudget) : ''}
    </div>` : '';

  const _readonly = (key, label, defaultText) => inline[key] === true ? `
    <div>
      <label class="block text-xs font-black text-blue-500 uppercase tracking-wider mb-2">${label} <span class="text-xs font-medium ml-2">(읽기전용)</span></label>
      <div class="w-full bg-blue-50 border-2 border-blue-100 rounded-xl px-5 py-3 font-medium text-blue-800 whitespace-pre-wrap">
        ${(s.extra_fields||{})[key] || defaultText}
      </div>
    </div>` : '';

  const eiRefundAmountField = (inline.ei_refund_amount !== false && s.is_ei_eligible) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💵 고용보험 환급 예상액</label>
      <div class="relative max-w-xs">
        <input type="number" value="${s.ei_refund_amount || 0}" oninput="planState.ei_refund_amount=Number(this.value)" placeholder="0"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 pr-12 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
      </div>
    </div>` : '';

  const basicFields = [
    _field('is_continuing', '전년도 계속 여부', 'boolean', ''),
    titleField,
    _field('learning_objective', '교육목표/내용/대상', 'textarea', '[교육목표]\\n\\n[교육내용]\\n\\n[교육대상]\\n\\n(내용을 작성해주세요)'),
    _field('edu_category', '📑 필수구분 (법정/핵심 등)', 'text', '예: 법정의무교육'),
    managerInfoField
  ];

  const scheduleFields = [
    datesField,
    _field('edu_days', '📆 교육일수', 'number', '0'),
    _field('has_accommodation', '숙박여부', 'boolean', ''),
    _field('lunch_provided', '중식제공여부', 'boolean', ''),
    _field('planned_rounds', '🔄 예상 차수', 'number', '1', 'planState'),
    _field('hours_per_round', '⏳ 차수별 학습시간', 'number', '0', 'planState')
  ];

  const targetFields = [
    _field('target_audience', '교육대상', 'text', '예: 3년차 이상 사원'),
    headcountField
  ];

  const venueFields = [
    regionToggle,
    countryField,
    venueField,
    locationSection,
    _field('edu_org', '🏫 교육기관', 'text', '교육기관명 입력'),
    inline.elearning_fields === true ? `
      <div class="grid grid-cols-2 gap-5">
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💻 이러닝 플랫폼</label>
          <input type="text" value="${(s.extra_fields||{}).elearning_platform || ''}" oninput="planState.extra_fields=Object.assign(planState.extra_fields||{},{elearning_platform:this.value})" placeholder="예) 클래스101" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🔗 URL</label>
          <input type="text" value="${(s.extra_fields||{}).elearning_url || ''}" oninput="planState.extra_fields=Object.assign(planState.extra_fields||{},{elearning_url:this.value})" placeholder="https://" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
      </div>` : '',
    educationFormatField
  ];

  // 커스텀 동적 필드 렌더링 (어댑터에서 넘겨준 필드들)
  const customFieldsHtml = (inline._customFields || []).map(cf => {
    // def, ref 합쳐서 단일 필드 렌더링 (기존 평면형 렌더러 로직 재활용)
    const { ref, def } = cf;
    if (ref.is_bo_only || def.is_bo_only) return _renderBoOnlyField(def, s, 'planState');
    if (ref.scope === "provide") return _renderProvideField(def, s, 'planState');
    
    // 필수값 오버라이드 적용
    const mergedDef = { ...def, required: ref.required !== undefined ? ref.required : def.required };
    return _renderOneField(mergedDef, s, 'planState');
  }).join('\n');

  const etcFields = [
    (!isElearning) ? _field('instructor_name', '👨‍🏫 강사명', 'text', '강사 이름 입력') : '',
    (!isElearning) ? _readonly('prov_instructor', '👨‍🏫 강사정보', '관리자가 확정한 강사 정보가 표시됩니다.') : '',
    customFieldsHtml
  ];

  const attachFields = [
    _field('supporting_docs', '📎 첨부파일', 'text', '첨부파일(URL 등)')
  ];

  const costFields = [
    _field('is_paid_education', '유료교육여부', 'boolean', ''),
    _field('is_ei_eligible', '고용보험 환급 여부', 'boolean', ''),
    eiRefundAmountField,
    amountField,
    calcSection
  ];

  const phaseBBadge = `
    <div class="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
      ✅ <span>표준 입력 양식 (Phase B) — 7단계 카테고리 적용</span>
    </div>`;

  return phaseBBadge + '\n' +
    wrapSection('기본정보', '📋', basicFields) +
    wrapSection('일정정보', '📅', scheduleFields) +
    wrapSection('대상자정보', '👥', targetFields) +
    wrapSection('장소정보', '🏛️', venueFields) +
    wrapSection('기타정보', '📝', etcFields) +
    wrapSection('첨부파일', '📎', attachFields) +
    wrapSection('비용정보', '💰', costFields);
};
window.foRenderStandardPlanForm = window.foRenderStandardPlanForm;



/**
 * 교육신청 표준 입력 폼 렌더러 (Phase B)
 * @param {Object} s - applyState
 * @param {Object} curBudget - 선택된 예산 객체
 * @returns {string} HTML string
 */
window.foRenderStandardApplyForm = function(s, curBudget, inlineFields) {
  const inline = inlineFields || {};
  // BO에서 명시적으로 필드를 설정한 경우(hasExplicitFields), 설정된 필드만 표시
  const inlineKeys = Object.keys(inline);
  const hasExplicitFields = inlineKeys.length > 0;

  const isOverseas   = s.is_overseas === true || s.region === 'overseas';
  const eduType      = s.eduType || '';
  const subType      = s.subType || '';
  const venueType    = s.venue_type || '';
  const isElearning  = ['이러닝', 'elearning'].includes(eduType) || subType.includes('elearning');

  const isNoBudget = curBudget?.account === '참가' || curBudget?.usesBudget === false || curBudget?.uses_budget === false;

  // BO 양식에 키가 있으면 표시, 명시적 false면 숨김, BO 양식이 없으면 기본 표시
  const _shouldShow = (key, defaultShow = true) => {
    if (inline[key] === false) return false;
    if (hasExplicitFields) return inline[key] !== undefined && inline[key] !== false;
    return defaultShow;
  };

  const showRegion = _shouldShow('is_overseas') && !isElearning;
  const showTitle = _shouldShow('edu_name') || _shouldShow('course_name');
  const showDates = _shouldShow('start_end_date');
  const showVenue = _shouldShow('venue_type') && !isElearning;
  const showAmount = _shouldShow('requested_budget') && !isNoBudget;
  const showCalc = _shouldShow('calc_grounds') && !isNoBudget;

  const wrapSection = (title, icon, fieldsArray) => {
    const content = fieldsArray.filter(Boolean).join('\n');
    if (!content.trim()) return '';
    return `
      <div class="mb-6 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
          <span>${icon}</span> ${title}
        </div>
        <div class="p-5 grid gap-5">
          ${content}
        </div>
      </div>
    `;
  };

  const _field = (key, label, type, placeholder, stateObj = 'applyState') => {
    // BO 인라인 필드 메타데이터 적용: label, placeholder, required 등 오버라이드
    const inlineMeta = (typeof inline[key] === 'object' && inline[key] !== null) ? inline[key] : null;
    if (inline[key] === false) return '';
    // BO에서 명시적으로 필드를 설정한 경우, 설정된 필드만 표시
    if (hasExplicitFields && inline[key] === undefined) return '';
    // BO 메타데이터로 label/placeholder 오버라이드
    if (inlineMeta) {
      label = inlineMeta.label || label;
      placeholder = inlineMeta.placeholder || placeholder;
      if (inlineMeta.type) type = inlineMeta.type;
    }
    const reqMark = (inlineMeta?.required) ? ' <span class="text-red-500">*</span>' : '';
    if (type === 'textarea') {
      return `
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
          <textarea oninput="${stateObj}.${key}=this.value" rows="3" placeholder="${placeholder}"
            class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s[key] || ''}</textarea>
        </div>`;
    }
    if (type === 'boolean') {
      return `
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
          <label class="flex items-center cursor-pointer gap-2">
            <input type="checkbox" onchange="${stateObj}.${key}=this.checked" ${s[key] ? 'checked' : ''} class="w-5 h-5 accent-accent">
            <span class="text-sm font-bold text-gray-700">선택 (Yes)</span>
          </label>
        </div>`;
    }
    return `
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">${label}${reqMark}</label>
        <input type="${type}" value="${s[key] || ''}" oninput="${stateObj}.${key}=this.value" placeholder="${placeholder}"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
      </div>`;
  };

  const managerInfoField = (inline.manager_info !== false) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">👤 담당자 정보</label>
      <div class="flex gap-2">
        <input type="text" value="${s.manager_info || ''}" readonly placeholder="[검색] 버튼을 클릭하세요"
          class="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition cursor-not-allowed"/>
        <button type="button" onclick="_foOpenUserSearch('applyState', 'manager_info')" class="bg-blue-100 text-blue-700 font-bold px-4 rounded-xl border border-blue-200">검색</button>
      </div>
    </div>` : '';

  const educationFormatField = (inline.education_format !== false) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💻 교육형태 <span class="text-red-500">*</span></label>
      <div class="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
        <button onclick="applyState.education_format='오프라인';renderApply()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${s.education_format!=='온라인' ? 'bg-white text-accent shadow-sm' : 'bg-transparent text-gray-400'}">🏫 오프라인</button>
        <button onclick="applyState.education_format='온라인';renderApply()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${s.education_format==='온라인' ? 'bg-accent text-white shadow-md' : 'bg-transparent text-gray-400'}">💻 온라인</button>
      </div>
    </div>` : '';

  const regionToggle = showRegion ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🌐 교육 지역 <span class="text-red-500">*</span></label>
      <div class="inline-flex bg-gray-100 rounded-xl p-1 gap-1">
        <button onclick="applyState.is_overseas=false;applyState.region='domestic';renderApply()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${!isOverseas ? 'bg-white text-accent shadow-sm' : 'bg-transparent text-gray-400'}">🗺 국내</button>
        <button onclick="applyState.is_overseas=true;applyState.region='overseas';renderApply()"
          class="px-5 py-2 rounded-lg text-sm font-bold border-none cursor-pointer transition-all ${isOverseas ? 'bg-accent text-white shadow-md' : 'bg-transparent text-gray-400'}">🌏 해외</button>
      </div>
    </div>` : '';

  const countryField = (showRegion && isOverseas) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🌐 교육 국가 <span class="text-red-500">*</span></label>
      <input type="text" value="${s.overseas_country || ''}" oninput="applyState.overseas_country=this.value"
        placeholder="예) 미국, 일본, 독일" class="w-full bg-gray-50 border-2 border-blue-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
    </div>` : '';

  const titleField = showTitle ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">교육과정명 <span class="text-red-500">*</span></label>
      <input type="text" value="${s.title || ''}" oninput="applyState.title=this.value"
        placeholder="교육/세미나/자격증 등 공식 명칭"
        class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-4 font-bold text-gray-900 focus:border-accent focus:bg-white transition"/>
    </div>` : '';

  const datesField = showDates ? `
    <div class="grid grid-cols-2 gap-5">
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">시작일</label>
        <input type="date" value="${s.startDate || ''}" oninput="applyState.startDate=this.value;renderApply()"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
      </div>
      <div>
        <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">종료일</label>
        <input type="date" value="${s.endDate || ''}" oninput="applyState.endDate=this.value;renderApply()"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
      </div>
    </div>` : '';

  const venueField = showVenue ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🏢 장소 유형</label>
      <div class="grid grid-cols-3 gap-2">
        ${[ {v:'internal', icon:'🏭', label:'사내'}, {v:'external', icon:'🏨', label:'외부 임차'}, {v:'online', icon:'💻', label:'온라인'} ].map(({v, icon, label}) => `
        <button onclick="applyState.venue_type='${v}';renderApply()"
          class="py-2.5 px-3 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all ${s.venue_type===v ? 'border-accent bg-blue-50 text-accent' : 'border-gray-200 bg-white text-gray-500'}">
          ${icon} ${label}
        </button>`).join('')}
      </div>
    </div>` : '';

  const calcSection = showCalc ? (typeof window._renderCalcGroundsSection === 'function' ? window._renderCalcGroundsSection(s, curBudget) : `
    <div class="mt-5">
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">📐 세부산출근거</label>
      <div class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-5 py-4 font-bold text-gray-400 text-center border-dashed">
        [세부산출근거 시스템 자동 렌더링 영역]
      </div>
    </div>`) : '';

  const amountField = showAmount ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💰 예산 신청액</label>
      <div class="relative max-w-xs">
        <input type="number" value="${s.amount || 0}" oninput="applyState.amount=this.value;_syncCalcToAmount()" placeholder="0"
          class="w-full bg-gray-50 border-2 ${s.hardLimitViolated ? 'border-red-400' : 'border-gray-100'} rounded-xl px-4 py-3 pr-12 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
      </div>
      ${s.hardLimitViolated ? '<div class="mt-1.5 text-xs font-black text-red-600">🚫 Hard Limit 초과 항목이 있어 신청할 수 없습니다.</div>' : ''}
    </div>` : '';

  const _readonly = (key, label, defaultText) => inline[key] === true ? `
    <div>
      <label class="block text-xs font-black text-blue-500 uppercase tracking-wider mb-2">${label} <span class="text-xs font-medium ml-2">(읽기전용)</span></label>
      <div class="w-full bg-blue-50 border-2 border-blue-100 rounded-xl px-5 py-3 font-medium text-blue-800 whitespace-pre-wrap">
        ${(s.extra_fields||{})[key] || defaultText}
      </div>
    </div>` : '';

  const eiRefundAmountField = (inline.ei_refund_amount !== false && s.is_ei_eligible) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💵 고용보험 환급 예상액</label>
      <div class="relative max-w-xs">
        <input type="number" value="${s.ei_refund_amount || 0}" oninput="applyState.ei_refund_amount=Number(this.value)" placeholder="0"
          class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 pr-12 font-black text-lg text-gray-900 focus:border-accent focus:bg-white transition"/>
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">원</span>
      </div>
    </div>` : '';

  const applyReasonField = (inline.apply_reason !== false) ? `
    <div>
      <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">신청사유 (학습 내용) <span class="text-red-500">*</span></label>
      <textarea oninput="applyState.content=this.value" rows="3" placeholder="학습 목표, 주요 커리큘럼 등을 입력하세요."
        class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-medium text-gray-700 focus:border-accent focus:bg-white transition resize-none">${s.content || ''}</textarea>
    </div>` : '';

  const basicFields = [
    _field('is_continuing', '전년도 계속 여부', 'boolean', ''),
    titleField,
    _field('learning_objective', '교육목표/내용/대상', 'textarea', '[교육목표]\\n\\n[교육내용]\\n\\n[교육대상]\\n\\n(내용을 작성해주세요)'),
    _field('edu_category', '📑 필수구분 (법정/핵심 등)', 'text', '예: 법정의무교육'),
    managerInfoField
  ];

  const scheduleFields = [
    datesField,
    _field('edu_days', '📆 교육일수', 'number', '0'),
    _field('has_accommodation', '숙박여부', 'boolean', ''),
    _field('lunch_provided', '중식제공여부', 'boolean', ''),
    _field('planned_rounds', '🔄 예상 차수', 'number', '1', 'applyState'),
    _field('hours_per_round', '⏳ 차수별 학습시간', 'number', '0', 'applyState')
  ];

  const targetFields = [
    _field('target_audience', '교육대상', 'text', '예: 3년차 이상 사원'),
    (inline.headcount !== false) ? _field('hours', '총 학습시간 (H)', 'number', '0') : ''
  ];

  const venueFields = [
    regionToggle,
    countryField,
    venueField,
    _field('education_region', '교육지역', 'text', '예: 서울, 제주'),
    _field('edu_org', '🏫 교육기관', 'text', '교육기관명 입력'),
    isElearning ? `
      <div class="grid grid-cols-2 gap-5">
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">💻 이러닝 플랫폼</label>
          <input type="text" value="${(s.extra_fields||{}).elearning_platform || ''}" oninput="applyState.extra_fields=Object.assign(applyState.extra_fields||{},{elearning_platform:this.value})" placeholder="예) 클래스101" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
        <div>
          <label class="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">🔗 URL</label>
          <input type="text" value="${(s.extra_fields||{}).elearning_url || ''}" oninput="applyState.extra_fields=Object.assign(applyState.extra_fields||{},{elearning_url:this.value})" placeholder="https://" class="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold focus:border-accent focus:bg-white transition"/>
        </div>
      </div>` : '',
    educationFormatField
  ];

  // 커스텀 동적 필드 렌더링 (어댑터에서 넘겨준 필드들)
  const customFieldsHtml = (inline._customFields || []).map(cf => {
    const { ref, def } = cf;
    if (ref.is_bo_only || def.is_bo_only) return _renderBoOnlyField(def, s, 'applyState');
    if (ref.scope === "provide") return _renderProvideField(def, s, 'applyState');
    const mergedDef = { ...def, required: ref.required !== undefined ? ref.required : def.required };
    return _renderOneField(mergedDef, s, 'applyState');
  }).join('\n');

  const etcFields = [
    (!isElearning) ? _field('instructor_name', '👨‍🏫 강사명', 'text', '강사 이름 입력') : '',
    (!isElearning) ? _readonly('prov_instructor', '👨‍🏫 강사정보', '관리자가 확정한 강사 정보가 표시됩니다.') : '',
    applyReasonField,
    customFieldsHtml
  ];

  const attachFields = [
    _field('supporting_docs', '📎 첨부파일', 'text', '첨부파일(URL 등)')
  ];

  const costFields = [
    _field('is_paid_education', '유료교육여부', 'boolean', ''),
    _field('is_ei_eligible', '고용보험 환급 여부', 'boolean', ''),
    eiRefundAmountField,
    amountField,
    calcSection
  ];

  const phaseBBadge = `
    <div class="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 flex items-center gap-2">
      ✅ <span>표준 입력 양식 (Phase B) — 7단계 카테고리 적용</span>
    </div>`;

  const multiPlanSection = (inline.multi_plan_link === true) ? `
    <div class="mb-6 bg-blue-50 border-2 border-blue-200 rounded-2xl overflow-hidden shadow-sm">
      <div class="px-5 py-3 bg-blue-100 border-b border-blue-200 font-bold text-blue-800 flex items-center justify-between">
        <div class="flex items-center gap-2"><span>🔗</span> 승인된 교육계획 선택 및 구성</div>
        <button type="button" class="px-3 py-1 bg-white text-blue-600 text-xs font-bold rounded-lg shadow-sm border border-blue-200 hover:bg-blue-50 transition">+ 교육계획 추가</button>
      </div>
      <div class="p-5 grid gap-3">
        <div class="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <div class="text-xs font-bold text-gray-500 mb-1">계획번호: PLN-2026-001</div>
            <div class="font-bold text-gray-800">파이썬 데이터 분석 기초</div>
            <div class="text-xs text-gray-500 mt-1">1차수 (20명) | H-교육 / 해당없음</div>
          </div>
          <div class="text-right">
            <div class="font-black text-blue-600">1,200,000 원</div>
            <button type="button" class="text-xs text-red-500 mt-2 font-bold hover:underline">삭제</button>
          </div>
        </div>
        <div class="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <div class="text-xs font-bold text-gray-500 mb-1">계획번호: PLN-2026-002</div>
            <div class="font-bold text-gray-800">사내 챗봇 활용 워크숍</div>
            <div class="text-xs text-gray-500 mt-1">1차수 (10명) | H-교육 / 해당없음</div>
          </div>
          <div class="text-right">
            <div class="font-black text-blue-600">500,000 원</div>
            <button type="button" class="text-xs text-red-500 mt-2 font-bold hover:underline">삭제</button>
          </div>
        </div>
      </div>
    </div>` : '';

  return phaseBBadge + '\n' +
    multiPlanSection + '\n' +
    wrapSection('기본정보', '📋', basicFields) +
    wrapSection('일정정보', '📅', scheduleFields) +
    wrapSection('대상자정보', '👥', targetFields) +
    wrapSection('장소정보', '🏛️', venueFields) +
    wrapSection('기타정보', '📝', etcFields) +
    wrapSection('첨부파일', '📎', attachFields) +
    wrapSection('비용정보', '💰', costFields);
};
window.foRenderStandardApplyForm = window.foRenderStandardApplyForm;

// 유저 검색 팝업 (모의 구현)
window._foOpenUserSearch = function(stateObjName, key) {
  // 간단한 prompt 기반 임시 검색 UI
  const result = prompt("직원 이름 또는 사번을 입력하세요 (예: 홍길동, 123456):");
  if (result) {
    if (stateObjName === 'planState' && typeof planState !== 'undefined') {
      planState[key] = result;
      if (typeof renderPlanWizard === 'function') renderPlanWizard();
    } else if (stateObjName === 'applyState' && typeof applyState !== 'undefined') {
      applyState[key] = result;
      if (typeof renderApply === 'function') renderApply();
    }
  }
};

console.log('[fo_form_loader] Phase B 표준 렌더러 로드됨 (foRenderStandardPlanForm, foRenderStandardApplyForm)');


// ─── Line Item 필드 설정 (Pattern A/D) ───────────────────────────
function getLineItemFieldConfig(eduType) {
  const fields = [];
  const etStr = eduType || "";
  if (etStr.includes("집합") || etStr.includes("이러닝") || ["group", "elearning"].includes(etStr)) {
    fields.push({ key: "과정-차수연결", field_type: "course-session", scope: "front" });
  }
  fields.push({ key: "세부산출근거", field_type: "calc-grounds", scope: "front" });
  return fields;
}
window.getLineItemFieldConfig = getLineItemFieldConfig;

// ─── 7단계 통합 읽기 전용 뷰 ─────────────────────────────────────────────
window.foRenderStandardReadOnlyForm = function (data, context = 'FO') {
  const isBO = context === 'BO';
  // 데이터 정규화: FO(planState) vs BO(DB Record)
  const d = data.detail || {};
  const ef = data.extra_fields || d.extra_fields || {};

  const title = data.title || data.edu_name || d.title || '-';
  const purpose = data.purpose?.label || data.purpose || d.purpose || '-';
  const eduType = data.eduType || data.edu_type || d.eduType || '';
  const eduSubType = data.eduSubType || data.edu_sub_type || d.eduSubType || '';
  const eduTypeStr = eduType + (eduSubType ? ' > ' + eduSubType : '');
  const eduCategory = data.edu_category || d.edu_category || '-';
  const learningObjective = data.learning_objective || d.learning_objective || '-';
  
  const isOverseas = String(data.is_overseas) === 'true';
  const region = isOverseas ? '해외' : '국내';
  const country = data.overseas_country || d.overseas_country || '';
  const venueType = data.venue_type || d.venue_type || '';
  const regionLabel = region + (isOverseas && country ? ` (${country})` : '');
  const venueTypeMap = { internal: '사내', external: '외부임차', online: '온라인/원격' };
  const venueLabel = venueTypeMap[venueType] || venueType || '-';
  const eduOrg = data.edu_org || d.edu_org || '-';
  const locations = data.locations || d.locations || [];

  const startDate = data.startDate || data.start_date || d.startDate || '-';
  const endDate = data.endDate || data.end_date || d.endDate || '-';
  const plannedRounds = data.planned_rounds ?? d.planned_rounds ?? '-';
  const plannedDays = data.planned_days ?? d.planned_days ?? '-';
  const hours = data.hours ?? d.hours ?? '-';
  const participantCount = data.participant_count ?? d.participantCount ?? '-';
  
  const institution = ef.institution || d.institution || '-';
  const elearningPlatform = ef.elearning_platform || d.elearningPlatform || '-';
  const elearningUrl = ef.elearning_url || d.elearningUrl || '';

  const expectedBenefit = data.expected_benefit || d.expected_benefit || '-';
  const content = data.content || d.content || '-';

  const amount = Number(data.amount || data.planAmount || 0);
  const accountCode = data.accountCode || data.account_code || '-';
  const calcGrounds = data.calcGrounds || d.calcGrounds || data.expenses || d.expenses || [];

  const customFields = ef._customFields || d._customFields || [];
  const attachments = data.attachments || d.attachments || [];

  // 카드 공통 스타일 래퍼
  const wrapSection = (title, icon, rows) => {
    if (!rows || rows.length === 0) return '';
    return `
      <div style="background:white;border-radius:12px;border:1px solid #E5E7EB;margin-bottom:16px;overflow:hidden">
        <div style="padding:12px 20px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">${icon}</span>
          <h3 style="margin:0;font-size:14px;font-weight:800;color:#111827">${title}</h3>
        </div>
        <div style="padding:16px 20px">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tbody>${rows.join('')}</tbody>
          </table>
        </div>
      </div>`;
  };

  const row = (label, value) => {
    if (!value || value === '-') return '';
    return `
      <tr style="border-bottom:1px solid #F3F4F6">
        <td style="padding:10px 0;width:140px;font-weight:700;color:#6B7280;vertical-align:top">${label}</td>
        <td style="padding:10px 0;color:#111827;font-weight:500;white-space:pre-wrap">${value}</td>
      </tr>`;
  };

  // 1. 기본 정보
  const basicRows = [
    row('계획명/과정명', `<strong style="color:#002C5F;font-size:14px">${title}</strong>`),
    row('교육목적', purpose),
    row('교육유형', eduTypeStr),
    row('필수구분', eduCategory),
    row('학습목표/대상', learningObjective),
  ].filter(Boolean);

  // 2. 비용 정보 & 산출근거
  let calcGroundsHtml = '';
  if (calcGrounds.length > 0) {
    calcGroundsHtml = `
      <div style="margin-top:16px;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:right">
          <thead style="background:#F3F4F6;color:#4B5563;font-weight:800">
            <tr>
              <th style="padding:8px 12px;text-align:left">항목</th>
              <th style="padding:8px 12px">단가</th>
              <th style="padding:8px 12px">수량</th>
              <th style="padding:8px 12px">소계</th>
            </tr>
          </thead>
          <tbody>
            ${calcGrounds.map(cg => `
              <tr style="border-top:1px solid #E5E7EB">
                <td style="padding:8px 12px;text-align:left;font-weight:700;color:#111827">${cg.type || cg.label || cg.name || '-'}</td>
                <td style="padding:8px 12px">${Number(cg.price || cg.unit_price || 0).toLocaleString()}원</td>
                <td style="padding:8px 12px">${cg.qty || cg.quantity || 1}</td>
                <td style="padding:8px 12px;font-weight:800;color:#1D4ED8">${(Number(cg.price || cg.unit_price || 0) * Number(cg.qty || cg.quantity || 1)).toLocaleString()}원</td>
              </tr>
            `).join('')}
            <tr style="background:#F9FAFB;border-top:2px solid #D1D5DB">
              <td colspan="3" style="padding:10px 12px;text-align:right;font-weight:900;color:#111827">합계</td>
              <td style="padding:10px 12px;font-weight:900;color:#002C5F;font-size:14px">
                ${calcGrounds.reduce((sum, cg) => sum + (Number(cg.price || cg.unit_price || 0) * Number(cg.qty || cg.quantity || 1)), 0).toLocaleString()}원
              </td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }
  
  const costRows = [
    row('예산계정', accountCode),
    row('신청/계획 금액', `<span style="font-size:16px;font-weight:900;color:#002C5F">${amount.toLocaleString()}원</span>`),
    calcGroundsHtml ? `<tr><td colspan="2">${calcGroundsHtml}</td></tr>` : ''
  ].filter(Boolean);

  // 3. 일정 및 장소
  const locHtml = locations.length > 0 
    ? `<div style="display:flex;gap:4px;flex-wrap:wrap">` + locations.map(l => `<span style="padding:2px 8px;border-radius:12px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700">${typeof l==='string'?l:(l.name||l.label)}</span>`).join('') + `</div>` 
    : '';

  const scheduleRows = [
    row('교육기간', `${startDate} ~ ${endDate}`),
    row('총 학습시간', hours !== '-' ? `${hours}H` : null),
    row('예상차수', plannedRounds !== '-' ? `${plannedRounds}회` : null),
    row('교육일수', plannedDays !== '-' ? `${plannedDays}일` : null),
    row('예상인원', participantCount !== '-' ? `${participantCount}명` : null),
    row('국내/해외', regionLabel),
    row('장소유형', venueLabel),
    row('교육기관', eduOrg),
    locHtml ? row('세부장소', locHtml) : ''
  ].filter(Boolean);

  // 4. 교육 기관
  const instRows = [
    row('위탁기관', institution),
    row('이러닝 플랫폼', elearningPlatform),
    elearningUrl ? row('URL', `<a href="${elearningUrl}" target="_blank" style="color:#2563EB;text-decoration:underline">${elearningUrl}</a>`) : ''
  ].filter(Boolean);

  // 5. 부가 정보
  const addRows = [
    row('기대효과', expectedBenefit),
    row('상세내용', content)
  ].filter(Boolean);

  // 6. 증빙 파일
  const attachRows = attachments.map(f => row(f.category || '첨부파일', `<a href="${f.url}" target="_blank" style="color:#2563EB;text-decoration:underline">${f.name || '파일 보기'}</a>`));

  // 7. 기타 정보 (Custom Fields)
  const customRows = customFields.map(f => row(f.label, f.value));

  return `
    <div class="fo-readonly-form" style="max-width:800px;margin:0 auto;text-align:left">
      ${wrapSection('1. 기본 정보', '📋', basicRows)}
      ${wrapSection('2. 비용 정보', '💰', costRows)}
      ${wrapSection('3. 일정 및 장소', '📅', scheduleRows)}
      ${instRows.length ? wrapSection('4. 교육 기관', '🏫', instRows) : ''}
      ${addRows.length ? wrapSection('5. 부가 정보', '💡', addRows) : ''}
      ${attachRows.length ? wrapSection('6. 증빙 파일', '📎', attachRows) : ''}
      ${customRows.length ? wrapSection('7. 기타 정보', '📝', customRows) : ''}
    </div>
  `;
};
