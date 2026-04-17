// ─── 백오피스: 세부 산출 근거 관리 (리팩토링 v4) ────────────────────────────
// 단가관리 탭 제거 → 단일 뷰 + 상세 페이지 전환
// pricing_type: simple(단순형) / composite(복합형)
// SAP 코드 관리 추가
// ─────────────────────────────────────────────────────────────────────────────

let _cgActiveTab = null;
let _cgEditId = null;
let _cgFilterTenant = null;
let _cgFilterGroup = null;
let _cgUsageTypeFilter = "all";
let _cgDetailView = null; // null=리스트, {id:'xxx'}=수정, {id:null}=신규

// ─── DB 로드 ───────────────────────────────────────────────────────────────
let _cgDbLoaded = false;
let _cgTplList = [];
let _cgAccountList = [];

async function _cgLoadFromDb() {
  if (typeof _sb !== "function" || !_sb()) return;
  try {
    const p1 = _sb().from("calc_grounds").select("*").order("sort_order");
    const p2 = _sb()
      .from("virtual_org_templates")
      .select("id,name,tenant_id,service_type")
      .eq("service_type", "edu_support");
    const p3 = _sb()
      .from("budget_accounts")
      .select("code,name,virtual_org_template_id,tenant_id");

    const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

    if (!res1.error && res1.data && res1.data.length > 0) {
      CALC_GROUNDS_MASTER = res1.data.map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        domainId: r.virtual_org_template_id || r.isolation_group_id || null,
        accountCode: r.account_code || null,
        sharedAccountCodes: r.shared_account_codes || [],
        name: r.name,
        desc: r.description || "",
        unitPrice: r.unit_price || 0,
        softLimit: r.soft_limit || 0,
        hardLimit: r.hard_limit || 0,
        limitType: r.limit_type || "none",
        active: r.active !== false,
        usageScope: r.usage_scope || ["plan", "apply", "settle"],
        visibleFor: r.visible_for || "both",
        sortOrder: r.sort_order || 99,
        usageType: r.usage_type || "edu_operation",
        hasRounds: r.has_rounds === true,
        hasQty2: r.has_qty2 === true,
        qty2Type: r.qty2_type || "박",
        isOverseas: r.is_overseas === true,
        // v4 신규
        sapCode: r.sap_code || "",
        pricingType: r.pricing_type || "simple",
        dimensionCategory: r.dimension_category || null,
      }));
      _cgDbLoaded = true;
      console.log("[CalcGrounds] DB에서", res1.data.length, "건 로드 완료");
    }
    if (res2.data) _cgTplList = res2.data;
    if (res3.data) _cgAccountList = res3.data;
  } catch (e) {
    console.warn("[CalcGrounds] DB 로드 실패:", e);
  }
}

// ─── 항목 조회 ─────────────────────────────────────────────────────────────
function _cgGetItems(tenantId, groupId) {
  return CALC_GROUNDS_MASTER.filter((g) => {
    if (g.tenantId && g.tenantId !== tenantId) return false;
    if (g.domainId && g.domainId !== groupId) return false;
    return true;
  });
}

// ─── 유형 메타 ─────────────────────────────────────────────────────────────
const _CG_USAGE_TYPE_META = {
  self_learning: { label: "📚 직접학습용", color: "#059669", bg: "#D1FAE5", borderColor: "#6EE7B7" },
  edu_operation: { label: "🎯 교육운영용", color: "#1D4ED8", bg: "#DBEAFE", borderColor: "#93C5FD" },
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── 메인 렌더 ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
async function renderCalcGrounds() {
  await _cgLoadFromDb();
  // 상세 페이지 모드
  if (_cgDetailView !== null) {
    _renderCgDetailPage();
    return;
  }
  _renderCgListPage();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── 리스트 페이지 ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function _renderCgListPage() {
  const persona = boCurrentPersona;
  const role = persona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";
  const isBudgetOp = role === "budget_op_manager" || role === "budget_hq";
  const isBudgetAdmin = role === "budget_global_admin";

  const activeTenantId = isPlatform ? _cgFilterTenant || "" : persona.tenantId || "";
  const pbVorgId = isBudgetOp || isBudgetAdmin ? persona.domainId || _cgFilterGroup || "" : _cgFilterGroup || "";

  const TENANTS_LIST = typeof TENANTS !== "undefined"
    ? TENANTS
    : [...new Set(_cgTplList.map((t) => t.tenant_id))].map((id) => ({ id, name: id }));
  const tenantName = TENANTS_LIST.find((t) => t.id === activeTenantId)?.name || activeTenantId || "소속 회사";

  const availVorgs = _cgTplList.filter((t) => t.service_type === "edu_support" && (!activeTenantId || t.tenant_id === activeTenantId));
  const vorgName = availVorgs.find((g) => g.id === pbVorgId)?.name || pbVorgId || "선택된 조직";

  // 필터바
  const filterBar = `
  <div class="bo-filter-bar">
    ${isPlatform ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
      <select onchange="_cgFilterTenant=this.value;_cgFilterGroup='';renderCalcGrounds()" class="bo-filter-select" style="min-width:140px">
        <option value="">전체 회사</option>
        ${TENANTS_LIST.map((t) => `<option value="${t.id}" ${activeTenantId === t.id ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>
    </div>
    <div style="width:1px;height:28px;background:#E5E7EB"></div>` : isTenant ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">회사</span>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #BFDBFE;border-radius:10px;background:#EFF6FF;min-width:120px">
        <span style="font-size:12px">🏢</span>
        <span style="font-size:13px;font-weight:800;color:#1D4ED8">${tenantName}</span>
      </div>
    </div>
    <div style="width:1px;height:28px;background:#E5E7EB"></div>` : ""}

    ${isBudgetOp || isBudgetAdmin ? `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">제도그룹</span>
      <div style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px solid #C4B5FD;border-radius:10px;background:#F5F3FF;min-width:140px">
        <span style="font-size:12px">🔒</span>
        <span style="font-size:13px;font-weight:800;color:#7C3AED">${vorgName}</span>
      </div>
    </div>` : `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151;white-space:nowrap">제도그룹</span>
      <select onchange="_cgFilterGroup=this.value;renderCalcGrounds()" class="bo-filter-select" style="min-width:160px">
        <option value="">전체 조직</option>
        ${availVorgs.map((g) => `<option value="${g.id}" ${pbVorgId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
      </select>
    </div>`}

    <button onclick="renderCalcGrounds()" class="bo-filter-btn-search" style="margin-left:auto">● 조회</button>
    <button onclick="_cgFilterTenant='';_cgFilterGroup='';renderCalcGrounds()" class="bo-filter-btn-reset">초기화</button>
  </div>`;

  // 항목 목록
  let items = _cgGetItems(activeTenantId, pbVorgId);
  if (_cgUsageTypeFilter !== "all") items = items.filter((g) => (g.usageType || "edu_operation") === _cgUsageTypeFilter);
  const allItems = _cgGetItems(activeTenantId, pbVorgId);
  const slCount = allItems.filter((g) => (g.usageType || "edu_operation") === "self_learning").length;
  const opCount = allItems.filter((g) => (g.usageType || "edu_operation") === "edu_operation").length;

  const el = document.getElementById("bo-content");
  el.innerHTML = `
<div class="bo-fade" style="padding:24px">
  ${typeof boVorgBanner === "function" ? boVorgBanner() : typeof boIsolationGroupBanner === "function" ? boIsolationGroupBanner() : ""}

  <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="background:#059669;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">세부산출근거</span>
        <h1 class="bo-page-title" style="margin:0">세부 산출 근거 관리</h1>
      </div>
      <p class="bo-page-sub">제도그룹 단위로 세부 산출근거를 관리합니다. 같은 제도그룹 하위 계정이 공유합니다.</p>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="_cgOpenDetail(null)" style="white-space:nowrap">+ 항목 추가</button>
  </div>

  <!-- 필터바 -->
  ${filterBar}

  <!-- 유형 필터 -->
  <div style="display:flex;gap:6px;margin-bottom:12px;align-items:center">
    ${[{k:"all",l:`전체 (${allItems.length})`},{k:"self_learning",l:`📚 직접학습용 (${slCount})`},{k:"edu_operation",l:`🎯 교육운영용 (${opCount})`}]
      .map(t => `<button onclick="_cgUsageTypeFilter='${t.k}';renderCalcGrounds()"
        style="padding:7px 14px;border-radius:8px;border:1.5px solid ${_cgUsageTypeFilter===t.k?'#1D4ED8':'#E5E7EB'};background:${_cgUsageTypeFilter===t.k?'#1D4ED8':'white'};color:${_cgUsageTypeFilter===t.k?'white':'#374151'};font-size:12px;font-weight:700;cursor:pointer">${t.l}</button>`).join('')}
  </div>

  <!-- 테이블 -->
  <div class="bo-list-count">세부 산출 근거 목록 (${items.filter(g=>g.active!==false).length}개 / 전체 ${items.length}개)</div>
  <div class="bo-table-container">
    <table class="bo-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center">NO.</th>
          <th>유형</th>
          <th>항목명</th>
          <th>SAP코드</th>
          <th>가이드 설명</th>
          <th style="text-align:right">기준단가</th>
          <th style="text-align:center">상한액</th>
          <th style="text-align:center">상태</th>
          <th style="text-align:center">관리</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? `
        <tr><td colspan="9" style="text-align:center;padding:48px;color:#9CA3AF;font-size:13px">
          이 범위에서 조회된 항목이 없습니다.<br>
          <button onclick="_cgOpenDetail(null)" class="bo-btn-primary bo-btn-sm" style="margin-top:10px;display:inline-flex;padding:6px 14px;font-size:12px;border-radius:8px">+ 첫 항목 추가</button>
        </td></tr>` : items.map((g,i) => {
          const ut = g.usageType || "edu_operation";
          const utMeta = _CG_USAGE_TYPE_META[ut] || _CG_USAGE_TYPE_META.edu_operation;
          const ptLabel = g.pricingType === "composite"
            ? '<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#FEF3C7;color:#92400E;font-weight:800">복합형</span>'
            : '<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:#F3F4F6;color:#6B7280;font-weight:800">단순형</span>';
          const badges = [];
          if (g.hasRounds) badges.push('<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#EDE9FE;color:#7C3AED;font-weight:800">차수</span>');
          if (g.hasQty2) badges.push('<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FEF3C7;color:#D97706;font-weight:800">' + (g.qty2Type||'박') + '</span>');
          if (g.isOverseas) badges.push('<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:#FEE2E2;color:#DC2626;font-weight:800">해외</span>');
          return `
        <tr style="${g.active === false ? 'opacity:.5;' : ''}">
          <td style="text-align:center;color:#9CA3AF;font-size:12px">${i+1}</td>
          <td>
            <div style="display:flex;flex-direction:column;gap:3px">
              <span style="font-size:10px;font-weight:800;padding:2px 7px;border-radius:5px;background:${utMeta.bg};color:${utMeta.color};display:inline-block;width:fit-content">${utMeta.label}</span>
              ${ptLabel}
            </div>
          </td>
          <td>
            <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:2px">${g.name}</div>
            <div style="display:flex;gap:3px;align-items:center">
              <span style="font-size:10px;color:#9CA3AF">${g.id}</span>
              ${badges.join('')}
            </div>
          </td>
          <td style="font-size:12px;color:#6B7280;font-weight:600">${g.sapCode || '<span style="color:#D1D5DB">—</span>'}</td>
          <td style="font-size:12px;color:#374151;max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.desc || "—"}</td>
          <td style="text-align:right;font-weight:700;font-size:12px;color:#374151">${g.pricingType === 'composite' ? '<span style="color:#9CA3AF;font-size:11px">차원별 단가</span>' : g.unitPrice > 0 ? (typeof boFmt === "function" ? boFmt(g.unitPrice) : g.unitPrice.toLocaleString()) + "원" : '<span style="color:#9CA3AF">—</span>'}</td>
          <td style="text-align:center;font-size:11px">
            ${g.limitType === "none" ? '<span style="color:#9CA3AF">제한없음</span>'
              : g.limitType === "soft" ? '<span style="background:#FFFBEB;color:#D97706;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">⚠ Soft</span>'
              : '<span style="background:#FEF2F2;color:#DC2626;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:800">🚫 Hard</span>'}
          </td>
          <td style="text-align:center">
            <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:${g.active !== false ? '#D1FAE5' : '#F3F4F6'};color:${g.active !== false ? '#065F46' : '#9CA3AF'}">${g.active !== false ? "활성" : "비활성"}</span>
          </td>
          <td style="text-align:center">
            <div style="display:flex;gap:5px;justify-content:center">
              <button onclick="_cgOpenDetail('${g.id}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151">✏️ ${g.pricingType === 'composite' ? '상세' : '수정'}</button>
              <button onclick="_cgToggleActive('${g.id}')" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid ${g.active !== false ? '#FDE68A' : '#A7F3D0'};background:${g.active !== false ? '#FFFBEB' : '#ECFDF5'};color:${g.active !== false ? '#D97706' : '#059669'};cursor:pointer;font-weight:700">
                ${g.active !== false ? "비활성" : "활성화"}
              </button>
            </div>
          </td>
        </tr>`;}).join("")}
      </tbody>
    </table>
  </div>

  <!-- 범례 -->
  <div class="bo-card" style="padding:12px 18px;margin-top:10px;background:#F8FAFC;border-color:#E2E8F0">
    <div style="font-size:11px;color:#374151;font-weight:600;display:flex;flex-wrap:wrap;gap:16px">
      <span>⚠️ <b>Soft Limit</b>: 상한액 초과 시 <b>사유 입력</b> 후 진행 가능</span>
      <span>🚫 <b>Hard Limit</b>: 상한액 초과 시 <b>절대 차단</b></span>
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── 상세 페이지 ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function _cgOpenDetail(id) {
  _cgDetailView = { id: id || null };
  renderCalcGrounds();
}
function _cgBackToList() {
  _cgDetailView = null;
  renderCalcGrounds();
}

let _cgDetailUnitPrices = []; // 복합형 세부항목 로컬 상태
let _cgDetailDimValues = []; // 차원값 목록 로컬

async function _renderCgDetailPage() {
  const id = _cgDetailView?.id;
  const item = id ? CALC_GROUNDS_MASTER.find((g) => g.id === id) : null;
  const isNew = !item;
  const tenantId = _cgFilterTenant || boCurrentPersona.tenantId || "HMC";
  const myGroups = _cgTplList.filter((t) => t.service_type === "edu_support" && t.tenant_id === tenantId);

  // 복합형 세부항목 로드
  _cgDetailUnitPrices = [];
  if (!isNew && item.pricingType === "composite") {
    await _cgLoadDetailUnitPrices(item.id, item.name);
  }

  // 차원값 로드
  await _cgLoadDimValues(tenantId);

  const usageType = item?.usageType || "edu_operation";
  const pricingType = item?.pricingType || "simple";
  const lType = item?.limitType || "none";
  const dimCat = item?.dimensionCategory || "venue";

  const groupOpts = myGroups.map((g) => `<option value="${g.id}" ${item?.domainId === g.id ? "selected" : ""}>${g.name}</option>`).join("");

  const el = document.getElementById("bo-content");
  el.innerHTML = `
<div class="bo-fade" style="padding:24px;max-width:900px;margin:0 auto">

  <!-- 상단 네비 -->
  <div style="margin-bottom:20px;display:flex;align-items:center;gap:12px">
    <button onclick="_cgBackToList()" style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-size:13px;font-weight:700;color:#374151;display:flex;align-items:center;gap:6px">
      ◀ 목록으로
    </button>
    <div>
      <h1 class="bo-page-title" style="margin:0">${isNew ? "세부산출근거 추가" : `세부산출근거 수정 — ${item.name}`}</h1>
      <p class="bo-page-sub" style="margin:4px 0 0">${isNew ? "새로운 세부산출근거 항목을 등록합니다." : "항목의 기본정보와 단가를 관리합니다."}</p>
    </div>
  </div>

  <!-- ① 세부산출근거 유형 -->
  <div class="bo-card" style="padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:800;color:#065F46;margin-bottom:12px">🏷️ 세부산출근거 유형 <span style="color:#EF4444">*</span></div>
    <div style="display:flex;gap:10px">
      ${["self_learning", "edu_operation"].map(v => {
        const m = _CG_USAGE_TYPE_META[v];
        const isSel = usageType === v;
        return `<label style="flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;cursor:pointer;border:2px solid ${isSel ? m.borderColor : '#E5E7EB'};background:${isSel ? m.bg : '#fff'}" onclick="_cgDtSelectUsageType('${v}')">
          <input type="radio" name="cg-usage-type" value="${v}" ${isSel ? 'checked' : ''} style="accent-color:${m.color}">
          <div><div style="font-size:12px;font-weight:800;color:${m.color}">${m.label}</div>
          <div style="font-size:10px;color:#6B7280">${v === 'self_learning' ? '단가 × 인원 (2중 승산)' : '단가 × 인원 × qty2 × 차수 (3중 승산)'}</div></div>
        </label>`;
      }).join('')}
    </div>
    <div id="cg-dt-op-options" style="margin-top:12px;display:${usageType === 'edu_operation' ? 'flex' : 'none'};gap:12px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;cursor:pointer">
        <input type="checkbox" id="cg-dt-has-rounds" ${item?.hasRounds ? 'checked' : ''} style="accent-color:#7C3AED"> 차수(qty3) 컬럼 활성화
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;cursor:pointer">
        <input type="checkbox" id="cg-dt-has-qty2" ${item?.hasQty2 ? 'checked' : ''} onchange="document.getElementById('cg-dt-qty2-type-wrap').style.display=this.checked?'flex':'none'" style="accent-color:#D97706"> 박/일/회(qty2) 컬럼 활성화
      </label>
      <div id="cg-dt-qty2-type-wrap" style="display:${item?.hasQty2 ? 'flex' : 'none'};align-items:center;gap:6px">
        <span style="font-size:11px;color:#6B7280">단위:</span>
        <select id="cg-dt-qty2-type" style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px">
          ${['박','일','회'].map(u => `<option value="${u}" ${(item?.qty2Type||'박')===u?'selected':''}>${u}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-top:8px">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;cursor:pointer">
        <input type="checkbox" id="cg-dt-is-overseas" ${item?.isOverseas ? 'checked' : ''} style="accent-color:#DC2626"> ✈️ 해외 전용 항목
      </label>
    </div>
  </div>

  <!-- ② 기본정보 -->
  <div class="bo-card" style="padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:800;color:#1D4ED8;margin-bottom:14px">📋 기본정보</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div style="grid-column:1/-1">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">항목명 <span style="color:#EF4444">*</span></label>
        <input id="cg-dt-name" type="text" value="${item?.name || ''}" placeholder="예) 숙박비"
          style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">SAP 코드 <span style="font-size:10px;color:#6B7280">(선택)</span></label>
        <input id="cg-dt-sap-code" type="text" value="${item?.sapCode || ''}" placeholder="예) SAP-ACC-001"
          style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
      </div>
      <div>
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">정렬 순서</label>
        <input id="cg-dt-order" type="number" value="${item?.sortOrder ?? 99}" placeholder="99"
          style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
      </div>
      <div style="grid-column:1/-1">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">가이드 설명 <span style="font-size:10px;color:#6B7280">(학습자 화면 노출)</span></label>
        <textarea id="cg-dt-desc" rows="2" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;resize:none">${item?.desc || ''}</textarea>
      </div>
      <div style="grid-column:1/-1">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">제도그룹 <span style="font-size:10px;color:#6B7280">(미선택 = 테넌트 전체 공유)</span></label>
        <select id="cg-dt-grp" style="width:100%;padding:8px 10px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px">
          <option value="">— 테넌트 전체 공유 —</option>
          ${groupOpts}
        </select>
        <div style="margin-top:4px;font-size:10px;color:#1D4ED8">💡 같은 제도그룹 하위의 모든 예산계정에서 이 항목을 공유합니다.</div>
      </div>
    </div>
  </div>

  <!-- ③ 가격 유형 선택 -->
  <div class="bo-card" style="padding:18px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:800;color:#374151;margin-bottom:14px">💰 가격 유형</div>
    <div style="display:flex;gap:10px;margin-bottom:16px">
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:2px solid ${pricingType === 'simple' ? '#059669' : '#E5E7EB'};background:${pricingType === 'simple' ? '#F0FDF4' : '#fff'}" onclick="_cgDtSelectPricingType('simple')">
        <input type="radio" name="cg-pricing-type" value="simple" ${pricingType === 'simple' ? 'checked' : ''} style="accent-color:#059669">
        <div>
          <div style="font-size:13px;font-weight:800;color:#065F46">단순형</div>
          <div style="font-size:10px;color:#6B7280">기준단가 하나로 설정 (예: 문구비 5,000원)</div>
        </div>
      </label>
      <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px 14px;border-radius:10px;cursor:pointer;border:2px solid ${pricingType === 'composite' ? '#D97706' : '#E5E7EB'};background:${pricingType === 'composite' ? '#FFFBEB' : '#fff'}" onclick="_cgDtSelectPricingType('composite')">
        <input type="radio" name="cg-pricing-type" value="composite" ${pricingType === 'composite' ? 'checked' : ''} style="accent-color:#D97706">
        <div>
          <div style="font-size:13px;font-weight:800;color:#92400E">복합형</div>
          <div style="font-size:10px;color:#6B7280">차원(교육장소 등) × 세부항목별 단가 매트릭스</div>
        </div>
      </label>
    </div>

    <!-- 단순형: 기준단가 + 상한액 -->
    <div id="cg-dt-simple-section" style="display:${pricingType === 'simple' ? 'block' : 'none'}">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">기준단가 (원)</label>
          <input id="cg-dt-unit-price" type="number" value="${item?.unitPrice ?? ''}" placeholder="0 = 직접 입력"
            style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        </div>
      </div>
      ${_cgRenderLimitSection(lType, item)}
    </div>

    <!-- 복합형: 차원 카테고리 + 매트릭스 -->
    <div id="cg-dt-composite-section" style="display:${pricingType === 'composite' ? 'block' : 'none'}">
      <div style="margin-bottom:14px">
        <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">차원 카테고리</label>
        <select id="cg-dt-dim-cat" style="padding:8px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;min-width:200px">
          <option value="venue" ${dimCat === 'venue' ? 'selected' : ''}>🏢 교육장소</option>
        </select>
        <div style="margin-top:4px;font-size:10px;color:#6B7280">💡 선택한 차원 카테고리의 값별로 세부항목과 단가를 설정합니다.</div>
      </div>

      <!-- 차원값별 매트릭스 -->
      <div id="cg-dt-matrix">
        ${_cgRenderMatrix()}
      </div>

      <button onclick="_cgDtAddDimValue()" style="margin-top:12px;padding:8px 16px;border:1.5px dashed #D97706;border-radius:8px;background:#FFFBEB;color:#92400E;font-size:12px;font-weight:700;cursor:pointer;width:100%">
        + 차원값(교육장소) 추가
      </button>
    </div>
  </div>

  <!-- ④ 하단 액션 바 -->
  <div style="display:flex;gap:10px;justify-content:flex-end;padding:16px 0;border-top:2px solid #E5E7EB">
    ${!isNew ? `<button onclick="_cgDeleteItem('${item.id}')" style="padding:10px 20px;border:1.5px solid #FECACA;border-radius:10px;background:#FEF2F2;color:#DC2626;font-size:13px;font-weight:700;cursor:pointer;margin-right:auto">🗑️ 삭제</button>` : ''}
    <button onclick="_cgBackToList()" style="padding:10px 24px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;font-size:13px;font-weight:700;cursor:pointer;color:#6B7280">취소</button>
    <button onclick="_cgSaveDetail()" style="padding:10px 28px;border:none;border-radius:10px;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.35)">💾 저장</button>
  </div>
</div>`;
}

// ─── 상한액 섹션 렌더 ─────────────────────────────────────────────────────
function _cgRenderLimitSection(lType, item) {
  return `
  <div style="background:#F9FAFB;border-radius:10px;padding:14px;border:1.5px solid #E5E7EB">
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:10px">🔒 상한액 설정</div>
    <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      ${["none", "soft", "hard"].map((v) => `
      <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;
                    border:1.5px solid ${lType === v ? (v === "none" ? "#10B981" : v === "soft" ? "#D97706" : "#DC2626") : "#E5E7EB"};
                    background:${lType === v ? (v === "none" ? "#F0FDF4" : v === "soft" ? "#FFFBEB" : "#FEF2F2") : "#fff"}"
             onclick="_cgDtSelectLimitType('${v}')">
        <input type="radio" name="cg-limit-type" value="${v}" ${lType === v ? "checked" : ""}
          style="accent-color:${v === "none" ? "#10B981" : v === "soft" ? "#D97706" : "#DC2626"}">
        <span style="font-size:12px;font-weight:700">
          ${v === "none" ? "✅ 제한없음" : v === "soft" ? "⚠ Soft (초과 가능)" : "🚫 Hard (초과 차단)"}
        </span>
      </label>`).join("")}
    </div>
    <div id="cg-dt-limit-fields" style="display:${lType === "none" ? "none" : "grid"};grid-template-columns:1fr 1fr;gap:12px">
      <div>
        <label style="font-size:11px;font-weight:700;color:#D97706;display:block;margin-bottom:4px">⚠ Soft Limit (원)</label>
        <input id="cg-dt-soft-limit" type="number" value="${item?.softLimit || ''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FDE68A;border-radius:8px;font-size:13px">
      </div>
      <div>
        <label style="font-size:11px;font-weight:700;color:#DC2626;display:block;margin-bottom:4px">🚫 Hard Limit (원)</label>
        <input id="cg-dt-hard-limit" type="number" value="${item?.hardLimit || ''}" placeholder="0=미설정"
          style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #FECACA;border-radius:8px;font-size:13px">
      </div>
    </div>
  </div>`;
}

// ─── 복합형 매트릭스 렌더 ─────────────────────────────────────────────────
function _cgRenderMatrix() {
  // 차원값별 그룹핑
  const byDim = {};
  _cgDetailUnitPrices.forEach((p) => {
    const key = p.venue_name || p.dimension_value || "—";
    if (!byDim[key]) byDim[key] = [];
    byDim[key].push(p);
  });
  const dimKeys = Object.keys(byDim);
  if (dimKeys.length === 0) {
    return `<div style="text-align:center;padding:24px;background:#FFFBEB;border:1.5px dashed #FDE68A;border-radius:10px;color:#92400E;font-size:12px">
      아직 등록된 차원값이 없습니다. 아래 버튼으로 교육장소를 추가하세요.
    </div>`;
  }
  return dimKeys.map((dimVal, di) => {
    const items = byDim[dimVal];
    return `
    <div style="background:#FAFAFA;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;padding:3px 10px;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-weight:800">🏢 ${dimVal}</span>
          <span style="font-size:10px;color:#6B7280">${items.length}개 세부항목</span>
        </div>
        <button onclick="_cgDtRemoveDimValue('${dimVal.replace(/'/g,"\\'")}')" style="font-size:11px;padding:4px 10px;border:1px solid #FECACA;border-radius:6px;background:#FEF2F2;color:#DC2626;cursor:pointer;font-weight:700">✕ 제거</button>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#F3F4F6">
          <th style="padding:6px 10px;text-align:left;font-weight:800;color:#374151">세부항목명</th>
          <th style="padding:6px 10px;text-align:right;font-weight:800;color:#374151;width:120px">단가 (원)</th>
          <th style="padding:6px 10px;text-align:center;font-weight:800;color:#374151;width:80px">qty2 기본값</th>
          <th style="padding:6px 10px;text-align:center;width:50px"></th>
        </tr></thead>
        <tbody>
          ${items.map((p, pi) => `
          <tr style="border-bottom:1px solid #E5E7EB">
            <td style="padding:6px 10px"><input type="text" value="${p.preset_name || p.detail_name || ''}" onchange="_cgDtUpdateSubItem(${di},${pi},'name',this.value)" style="width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px"></td>
            <td style="padding:6px 10px"><input type="number" value="${p.unit_price || 0}" onchange="_cgDtUpdateSubItem(${di},${pi},'price',this.value)" style="width:100%;box-sizing:border-box;padding:5px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px;text-align:right"></td>
            <td style="padding:6px 10px"><input type="number" value="${p.qty2_value || 1}" onchange="_cgDtUpdateSubItem(${di},${pi},'qty2',this.value)" style="width:60px;padding:5px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:12px;text-align:center"></td>
            <td style="padding:6px 10px;text-align:center"><button onclick="_cgDtRemoveSubItem(${di},${pi})" style="border:none;background:none;color:#EF4444;cursor:pointer;font-size:14px">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <button onclick="_cgDtAddSubItem('${dimVal.replace(/'/g,"\\'")}')" style="margin-top:8px;padding:5px 12px;border:1px dashed #93C5FD;border-radius:6px;background:#EFF6FF;color:#1D4ED8;font-size:11px;font-weight:700;cursor:pointer">+ 세부항목 추가</button>
    </div>`;
  }).join('');
}

// ─── 매트릭스 조작 ─────────────────────────────────────────────────────────
function _cgDtAddDimValue() {
  const dimValues = _cgDetailDimValues.filter(d => d.active !== false).map(d => d.name);
  const existing = [...new Set(_cgDetailUnitPrices.map(p => p.venue_name))];
  const available = dimValues.filter(v => !existing.includes(v));

  if (available.length === 0) {
    const custom = prompt("추가할 교육장소명을 입력하세요:");
    if (!custom || !custom.trim()) return;
    _cgDetailUnitPrices.push({ venue_name: custom.trim(), preset_name: "", detail_name: "", unit_price: 0, qty2_value: 1 });
  } else {
    const list = available.map((v,i) => `${i+1}. ${v}`).join('\n');
    const choice = prompt(`추가할 교육장소를 선택하세요 (번호 입력):\n${list}\n\n직접 입력하려면 이름을 입력하세요:`);
    if (!choice || !choice.trim()) return;
    const num = parseInt(choice);
    const name = (num > 0 && num <= available.length) ? available[num-1] : choice.trim();
    _cgDetailUnitPrices.push({ venue_name: name, preset_name: "", detail_name: "", unit_price: 0, qty2_value: 1 });
  }
  document.getElementById("cg-dt-matrix").innerHTML = _cgRenderMatrix();
}

function _cgDtRemoveDimValue(dimVal) {
  if (!confirm(`"${dimVal}" 교육장소의 모든 세부항목을 제거할까요?`)) return;
  _cgDetailUnitPrices = _cgDetailUnitPrices.filter(p => (p.venue_name || p.dimension_value) !== dimVal);
  document.getElementById("cg-dt-matrix").innerHTML = _cgRenderMatrix();
}

function _cgDtAddSubItem(dimVal) {
  _cgDetailUnitPrices.push({ venue_name: dimVal, preset_name: "", detail_name: "", unit_price: 0, qty2_value: 1 });
  document.getElementById("cg-dt-matrix").innerHTML = _cgRenderMatrix();
}

function _cgDtRemoveSubItem(dimIdx, itemIdx) {
  const byDim = {};
  _cgDetailUnitPrices.forEach((p) => {
    const key = p.venue_name || "—";
    if (!byDim[key]) byDim[key] = [];
    byDim[key].push(p);
  });
  const dimKeys = Object.keys(byDim);
  const dimVal = dimKeys[dimIdx];
  const items = byDim[dimVal];
  const target = items[itemIdx];
  _cgDetailUnitPrices = _cgDetailUnitPrices.filter(p => p !== target);
  document.getElementById("cg-dt-matrix").innerHTML = _cgRenderMatrix();
}

function _cgDtUpdateSubItem(dimIdx, itemIdx, field, value) {
  const byDim = {};
  _cgDetailUnitPrices.forEach((p) => {
    const key = p.venue_name || "—";
    if (!byDim[key]) byDim[key] = [];
    byDim[key].push(p);
  });
  const dimKeys = Object.keys(byDim);
  const items = byDim[dimKeys[dimIdx]];
  if (!items || !items[itemIdx]) return;
  if (field === 'name') { items[itemIdx].preset_name = value; items[itemIdx].detail_name = value; }
  else if (field === 'price') items[itemIdx].unit_price = Number(value) || 0;
  else if (field === 'qty2') items[itemIdx].qty2_value = Number(value) || 1;
}

// ─── 차원값 로드 ─────────────────────────────────────────────────────────
async function _cgLoadDimValues(tenantId) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const { data } = await sb.from("pricing_dimensions").select("*").eq("tenant_id", tenantId).order("sort_order");
    if (data) _cgDetailDimValues = data;
  } catch (e) {
    console.warn("[PricingDim] 로드 실패:", e);
  }
}

async function _cgLoadDetailUnitPrices(itemId, itemName) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const { data } = await sb.from("calc_ground_unit_prices").select("*")
      .or(`calc_ground_id.eq.${itemId},calc_ground_name.eq.${itemName}`)
      .order("sort_order");
    if (data) _cgDetailUnitPrices = data;
  } catch (e) {
    console.warn("[UnitPrices] 로드 실패:", e);
    _cgDetailUnitPrices = [];
  }
}

// ─── UI 인터랙션 핸들러 ───────────────────────────────────────────────────
function _cgDtSelectUsageType(val) {
  document.querySelectorAll('input[name="cg-usage-type"]').forEach((r) => {
    r.checked = r.value === val;
    const lbl = r.closest("label");
    if (!lbl) return;
    const m = _CG_USAGE_TYPE_META[r.value] || _CG_USAGE_TYPE_META.edu_operation;
    lbl.style.borderColor = r.checked ? m.borderColor : "#E5E7EB";
    lbl.style.background = r.checked ? m.bg : "#fff";
  });
  const opOpts = document.getElementById("cg-dt-op-options");
  if (opOpts) opOpts.style.display = val === "edu_operation" ? "flex" : "none";
}

function _cgDtSelectPricingType(val) {
  document.querySelectorAll('input[name="cg-pricing-type"]').forEach((r) => {
    r.checked = r.value === val;
    const lbl = r.closest("label");
    if (!lbl) return;
    if (r.value === 'simple') {
      lbl.style.borderColor = r.checked ? '#059669' : '#E5E7EB';
      lbl.style.background = r.checked ? '#F0FDF4' : '#fff';
    } else {
      lbl.style.borderColor = r.checked ? '#D97706' : '#E5E7EB';
      lbl.style.background = r.checked ? '#FFFBEB' : '#fff';
    }
  });
  const simple = document.getElementById("cg-dt-simple-section");
  const composite = document.getElementById("cg-dt-composite-section");
  if (simple) simple.style.display = val === 'simple' ? 'block' : 'none';
  if (composite) composite.style.display = val === 'composite' ? 'block' : 'none';
}

function _cgDtSelectLimitType(val) {
  document.querySelectorAll('input[name="cg-limit-type"]').forEach((r) => (r.checked = r.value === val));
  const f = document.getElementById("cg-dt-limit-fields");
  if (f) f.style.display = val === "none" ? "none" : "grid";
}

// ─── 저장 ─────────────────────────────────────────────────────────────────
async function _cgSaveDetail() {
  const name = document.getElementById("cg-dt-name")?.value.trim();
  if (!name) { alert("항목명은 필수입니다."); return; }
  const usageType = document.querySelector('input[name="cg-usage-type"]:checked')?.value;
  if (!usageType) { alert("세부산출근거 유형을 선택하세요."); return; }

  const pricingType = document.querySelector('input[name="cg-pricing-type"]:checked')?.value || "simple";
  const tenantId = _cgFilterTenant || boCurrentPersona.tenantId || "HMC";
  const groupId = document.getElementById("cg-dt-grp")?.value || null;
  const hasRounds = usageType === "edu_operation" && document.getElementById("cg-dt-has-rounds")?.checked === true;
  const hasQty2 = usageType === "edu_operation" && document.getElementById("cg-dt-has-qty2")?.checked === true;
  const qty2Type = hasQty2 ? (document.getElementById("cg-dt-qty2-type")?.value || "박") : "박";
  const isOverseas = document.getElementById("cg-dt-is-overseas")?.checked === true;

  const dbPayload = {
    name,
    description: document.getElementById("cg-dt-desc")?.value.trim() || null,
    sap_code: document.getElementById("cg-dt-sap-code")?.value.trim() || null,
    unit_price: pricingType === 'simple' ? (Number(document.getElementById("cg-dt-unit-price")?.value) || 0) : 0,
    limit_type: pricingType === 'simple' ? (document.querySelector('input[name="cg-limit-type"]:checked')?.value || "none") : "none",
    soft_limit: pricingType === 'simple' ? (Number(document.getElementById("cg-dt-soft-limit")?.value) || 0) : 0,
    hard_limit: pricingType === 'simple' ? (Number(document.getElementById("cg-dt-hard-limit")?.value) || 0) : 0,
    active: true,
    tenant_id: tenantId,
    virtual_org_template_id: groupId || null,
    sort_order: Number(document.getElementById("cg-dt-order")?.value) || 99,
    usage_type: usageType,
    has_rounds: hasRounds,
    has_qty2: hasQty2,
    qty2_type: qty2Type,
    is_overseas: isOverseas,
    pricing_type: pricingType,
    dimension_category: pricingType === 'composite' ? (document.getElementById("cg-dt-dim-cat")?.value || 'venue') : null,
  };

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) throw new Error("Supabase 미연결");
    let itemId = _cgDetailView?.id;

    if (itemId) {
      await sb.from("calc_grounds").update(dbPayload).eq("id", itemId);
    } else {
      itemId = "CG-" + Date.now();
      await sb.from("calc_grounds").insert({ id: itemId, ...dbPayload });
    }

    // 복합형: 세부항목 저장 (기존 삭제 후 재삽입)
    if (pricingType === 'composite' && _cgDetailUnitPrices.length > 0) {
      await sb.from("calc_ground_unit_prices").delete().or(`calc_ground_id.eq.${itemId},calc_ground_name.eq.${name}`);
      const rows = _cgDetailUnitPrices
        .filter(p => p.preset_name || p.detail_name)
        .map((p, i) => ({
          tenant_id: tenantId,
          virtual_org_template_id: groupId || null,
          venue_name: p.venue_name,
          calc_ground_id: itemId,
          calc_ground_name: name,
          preset_name: p.preset_name || p.detail_name,
          detail_name: p.detail_name || p.preset_name,
          unit_price: p.unit_price || 0,
          qty2_value: p.qty2_value || 1,
          sort_order: i + 1,
          active: true,
        }));
      if (rows.length > 0) await sb.from("calc_ground_unit_prices").insert(rows);
    }

    alert("✅ 저장되었습니다.");
    _cgDbLoaded = false; // 리로드
    _cgBackToList();
  } catch (e) {
    console.error("[CalcGrounds] 저장 실패:", e);
    alert("저장 실패: " + e.message);
  }
}

// ─── 삭제 ─────────────────────────────────────────────────────────────────
async function _cgDeleteItem(id) {
  if (!confirm("이 세부산출근거 항목을 삭제할까요?\n하위 단가 데이터도 함께 비활성화됩니다.")) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb.from("calc_grounds").update({ active: false }).eq("id", id);
      await sb.from("calc_ground_unit_prices").update({ active: false }).eq("calc_ground_id", id);
    }
    const item = CALC_GROUNDS_MASTER.find((g) => g.id === id);
    if (item) item.active = false;
    _cgBackToList();
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
}

// ─── 활성/비활성 토글 ─────────────────────────────────────────────────────
async function _cgToggleActive(id) {
  const item = CALC_GROUNDS_MASTER.find((g) => g.id === id);
  if (!item) return;
  const newActive = item.active === false;
  item.active = newActive;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) await sb.from("calc_grounds").update({ active: newActive }).eq("id", id);
  } catch (e) {
    console.warn("[CalcGrounds] 토글 실패:", e);
  }
  renderCalcGrounds();
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── 단가차원 관리 페이지 ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
let _pdList = [];
let _pdLoaded = false;
let _pdFilterCategory = "";

async function renderPricingDimensions() {
  const tenantId = boCurrentPersona.tenantId || "HMC";
  if (!_pdLoaded) {
    try {
      const sb = typeof _sb === "function" ? _sb() : null;
      if (sb) {
        const { data } = await sb.from("pricing_dimensions").select("*").order("sort_order");
        if (data) { _pdList = data; _pdLoaded = true; }
      }
    } catch (e) { console.warn("[PricingDim]", e); }
  }

  // 카테고리 목록 추출
  const categories = [...new Set(_pdList.map(d => d.category))];
  const catLabels = {};
  _pdList.forEach(d => { catLabels[d.category] = d.category_label; });

  const filtered = _pdFilterCategory
    ? _pdList.filter(d => d.category === _pdFilterCategory)
    : _pdList;
  const activeItems = filtered.filter(d => d.active !== false);
  const inactiveItems = filtered.filter(d => d.active === false);

  const el = document.getElementById("bo-content");
  el.innerHTML = `
<div class="bo-fade" style="padding:24px">
  <div style="margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">차원관리</span>
        <h1 class="bo-page-title" style="margin:0">단가 차원 관리</h1>
      </div>
      <p class="bo-page-sub">세부산출근거 복합형에서 사용하는 차원 카테고리와 값을 관리합니다. (예: 교육장소 → 마북캠퍼스, 경주캠퍼스 등)</p>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="_pdAddValue()" style="white-space:nowrap">+ 값 추가</button>
  </div>

  <!-- 카테고리 필터 -->
  <div class="bo-filter-bar">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:12px;font-weight:800;color:#374151">카테고리</span>
      <select onchange="_pdFilterCategory=this.value;renderPricingDimensions()" class="bo-filter-select" style="min-width:160px">
        <option value="">전체</option>
        ${categories.map(c => `<option value="${c}" ${_pdFilterCategory === c ? 'selected' : ''}>${catLabels[c] || c}</option>`).join('')}
      </select>
    </div>
    <button onclick="_pdAddCategory()" style="margin-left:auto;padding:7px 14px;border:1.5px solid #C4B5FD;border-radius:8px;background:#F5F3FF;color:#7C3AED;font-size:12px;font-weight:700;cursor:pointer">+ 카테고리 추가</button>
  </div>

  <!-- 목록 -->
  <div class="bo-list-count" style="margin-top:12px">차원값 목록 (${activeItems.length}개 활성 / 전체 ${filtered.length}개)</div>
  <div class="bo-table-container">
    <table class="bo-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center">NO.</th>
          <th>카테고리</th>
          <th>차원값</th>
          <th style="text-align:center">정렬</th>
          <th style="text-align:center">상태</th>
          <th style="text-align:center">관리</th>
        </tr>
      </thead>
      <tbody>
        ${activeItems.length === 0 ? `
        <tr><td colspan="6" style="text-align:center;padding:48px;color:#9CA3AF;font-size:13px">등록된 차원값이 없습니다.</td></tr>
        ` : activeItems.map((d,i) => `
        <tr>
          <td style="text-align:center;font-size:12px;color:#9CA3AF">${i+1}</td>
          <td><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F5F3FF;color:#7C3AED;font-weight:800">${d.category_label || d.category}</span></td>
          <td style="font-weight:700;font-size:13px;color:#111827">${d.name}</td>
          <td style="text-align:center;font-size:12px;color:#6B7280">${d.sort_order}</td>
          <td style="text-align:center"><span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:#D1FAE5;color:#065F46">활성</span></td>
          <td style="text-align:center">
            <div style="display:flex;gap:5px;justify-content:center">
              <button onclick="_pdEditValue(${d.id})" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151">수정</button>
              <button onclick="_pdToggleActive(${d.id},false)" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #FDE68A;background:#FFFBEB;color:#D97706;cursor:pointer;font-weight:700">비활성</button>
            </div>
          </td>
        </tr>`).join('')}
        ${inactiveItems.length > 0 ? inactiveItems.map(d => `
        <tr style="opacity:.5">
          <td style="text-align:center;font-size:12px;color:#9CA3AF">—</td>
          <td><span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F3F4F6;color:#9CA3AF;font-weight:800">${d.category_label || d.category}</span></td>
          <td style="font-weight:700;font-size:13px;color:#9CA3AF">${d.name}</td>
          <td style="text-align:center;font-size:12px;color:#9CA3AF">${d.sort_order}</td>
          <td style="text-align:center"><span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:#F3F4F6;color:#9CA3AF">비활성</span></td>
          <td style="text-align:center">
            <button onclick="_pdToggleActive(${d.id},true)" style="font-size:11px;padding:5px 11px;border-radius:7px;border:1.5px solid #A7F3D0;background:#ECFDF5;color:#059669;cursor:pointer;font-weight:700">활성화</button>
          </td>
        </tr>`).join('') : ''}
      </tbody>
    </table>
  </div>
</div>`;
}

async function _pdAddCategory() {
  const code = prompt("새 카테고리 코드를 입력하세요 (영문, 예: course_type):");
  if (!code || !code.trim()) return;
  const label = prompt("카테고리 표시명을 입력하세요 (예: 과정유형):");
  if (!label || !label.trim()) return;
  const name = prompt("첫 번째 차원값을 입력하세요 (예: 리더십):");
  if (!name || !name.trim()) return;
  const tenantId = boCurrentPersona.tenantId || "HMC";
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb.from("pricing_dimensions").insert({ category: code.trim(), category_label: label.trim(), name: name.trim(), tenant_id: tenantId, sort_order: 1 });
    }
    _pdLoaded = false;
    renderPricingDimensions();
  } catch (e) { alert("등록 실패: " + e.message); }
}

async function _pdAddValue() {
  const categories = [...new Set(_pdList.map(d => d.category))];
  const catLabels = {};
  _pdList.forEach(d => { catLabels[d.category] = d.category_label; });

  let category = _pdFilterCategory;
  if (!category) {
    if (categories.length === 0) { alert("먼저 카테고리를 추가하세요."); return; }
    const catList = categories.map((c,i) => `${i+1}. ${catLabels[c] || c}`).join('\n');
    const choice = prompt(`카테고리를 선택하세요:\n${catList}`);
    if (!choice) return;
    const num = parseInt(choice);
    category = (num > 0 && num <= categories.length) ? categories[num-1] : null;
    if (!category) return;
  }

  const name = prompt(`"${catLabels[category] || category}" 카테고리에 추가할 값을 입력하세요:`);
  if (!name || !name.trim()) return;
  const tenantId = boCurrentPersona.tenantId || "HMC";
  const maxOrder = _pdList.filter(d => d.category === category).reduce((m, d) => Math.max(m, d.sort_order || 0), 0);
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      await sb.from("pricing_dimensions").insert({
        category,
        category_label: catLabels[category] || category,
        name: name.trim(),
        tenant_id: tenantId,
        sort_order: maxOrder + 1,
      });
    }
    _pdLoaded = false;
    renderPricingDimensions();
  } catch (e) { alert("등록 실패: " + e.message); }
}

async function _pdEditValue(id) {
  const item = _pdList.find(d => d.id === id);
  if (!item) return;
  const newName = prompt("차원값 이름:", item.name);
  if (!newName || !newName.trim()) return;
  const newOrder = prompt("정렬 순서:", item.sort_order);
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) await sb.from("pricing_dimensions").update({ name: newName.trim(), sort_order: Number(newOrder) || item.sort_order }).eq("id", id);
    _pdLoaded = false;
    renderPricingDimensions();
  } catch (e) { alert("수정 실패: " + e.message); }
}

async function _pdToggleActive(id, active) {
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) await sb.from("pricing_dimensions").update({ active }).eq("id", id);
    _pdLoaded = false;
    renderPricingDimensions();
  } catch (e) { alert("변경 실패: " + e.message); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ─── FO 공통 유틸 함수 (plans.js / apply.js에서 사용) ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function sbGetCalcGroundsForForm(tenantId, groupId, accountCode) {
  return CALC_GROUNDS_MASTER.filter((g) => {
    if (g.active === false) return false;
    if (g.tenantId && g.tenantId !== tenantId) return false;
    if (g.domainId && g.domainId !== groupId) return false;
    if (accountCode && g.sharedAccountCodes && g.sharedAccountCodes.length > 0) {
      if (!g.sharedAccountCodes.includes(accountCode)) return false;
    }
    return true;
  });
}
window.sbGetCalcGroundsForForm = sbGetCalcGroundsForForm;

function getCalcGroundsForVorg(vorgTemplateId, accountCode) {
  return CALC_GROUNDS_MASTER.filter((g) => {
    if (g.active === false) return false;
    if (g.domainId && vorgTemplateId && g.domainId !== vorgTemplateId) return false;
    if (accountCode && g.sharedAccountCodes && g.sharedAccountCodes.length > 0) {
      if (!g.sharedAccountCodes.includes(accountCode)) return false;
    }
    return true;
  });
}
window.getCalcGroundsForVorg = getCalcGroundsForVorg;

window._getCalcGroundsType = function(purposeId, formTargetType) {
  if (purposeId === "external_personal") return "self_learning";
  if (["internal_edu","conf_seminar","misc_ops","elearning_class"].includes(purposeId)) return "edu_operation";
  if (formTargetType === "learner") return "self_learning";
  return "edu_operation";
};

window._getCalcGroundsForType = function(type, vorgId, isOverseas) {
  return (CALC_GROUNDS_MASTER || []).filter((g) => {
    if (g.active === false) return false;
    if ((g.usageType || "edu_operation") !== type) return false;
    if (g.domainId && vorgId && g.domainId !== vorgId) return false;
    if (g.isOverseas && !isOverseas) return false;
    return true;
  }).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
};

window._loadUnitPricesForItem = async function(itemId, tenantId) {
  if (!itemId) return [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) {
      return (typeof _cgDetailUnitPrices !== "undefined" ? _cgDetailUnitPrices : [])
        .filter((p) => p.active !== false && (p.calc_ground_id === itemId || p.calc_ground_name === CALC_GROUNDS_MASTER.find(g=>g.id===itemId)?.name))
        .sort((a, b) => (a.sort_order||99) - (b.sort_order||99));
    }
    const { data } = await sb
      .from("calc_ground_unit_prices")
      .select("venue_name,preset_name,detail_name,unit_price,qty2_value,sort_order")
      .or(`calc_ground_id.eq.${itemId},calc_ground_name.eq.${(CALC_GROUNDS_MASTER||[]).find(g=>g.id===itemId)?.name||'__none__'}`)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    return data || [];
  } catch (e) {
    console.warn("[UnitPrices] 로드 실패:", e);
    return [];
  }
};

window._calcGroundTotal = function(row) {
  return (row.unitPrice || 0) * (row.qty1 || 1) * (row.qty2 || 1) * (row.qty3 || 1);
};
