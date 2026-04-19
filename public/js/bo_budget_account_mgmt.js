// ─── bo_budget_account_mgmt.js — 예산계정 관리 (REFACTOR-1: bo_budget_master.js 분리) ───
// ─── Tenant Admin: 예산 기초 관리 (7탭) ──────────────────────────────────────
// Step1:계정마스터CRUD  Step2:조직-계정매핑  Step3:양식빌더(FORM_MASTER)
// Step4:양식접근권한    Step5:양식-예산-계획룰  Step6:공지관리  +교육조직+권한

const BM_TABS = [
  { label: "[Step1] 계정 마스터 관리" },
  { label: "[Step2] 교육조직 제도그룹 관리" },
  { label: "[Step3] 양식 및 유형 마스터" },
  { label: "[Step4] 통합 정책 매핑 설정" },
  { label: "[Step5] 신청 양식별 공지 관리" },
];

let _bmActiveTab = 0;

// ─── 실제 인사 조직 트리 (ERP 연동 가정) ─────────────────────────────────────
const REAL_ORG_TREE = {
  general: [
    {
      id: "RHQ01",
      name: "HMGOOOO본부",
      type: "hq",
      children: [
        {
          id: "RT01",
          name: "피플OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT02",
          name: "역량OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT03",
          name: "성과OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT04",
          name: "인재OO팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
        {
          id: "RT05",
          name: "교육기획팀",
          type: "team",
          parentName: "HMGOOOO본부",
        },
      ],
    },
    {
      id: "RHQ02",
      name: "SDVOOOO본부",
      type: "hq",
      children: [
        {
          id: "RT06",
          name: "SDV기술팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
        {
          id: "RT07",
          name: "아키텍처팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
        {
          id: "RT08",
          name: "플랫폼팀",
          type: "team",
          parentName: "SDVOOOO본부",
        },
      ],
    },
  ],
  rnd: [
    {
      id: "RC01",
      name: "모빌리티OOOO센터",
      type: "center",
      children: [
        {
          id: "RT20",
          name: "내구OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT21",
          name: "구동OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT22",
          name: "전장OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
        {
          id: "RT23",
          name: "샤시OO팀",
          type: "team",
          parentName: "모빌리티OOOO센터",
        },
      ],
    },
    {
      id: "RC02",
      name: "전동화OOOO센터",
      type: "center",
      children: [
        {
          id: "RT24",
          name: "배터리OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
        {
          id: "RT25",
          name: "인버터OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
        {
          id: "RT26",
          name: "충전OO팀",
          type: "team",
          parentName: "전동화OOOO센터",
        },
      ],
    },
  ],
};

let virtualOrgState = JSON.parse(JSON.stringify(VIRTUAL_ORG));

// ── 상태 변수 ─────────────────────────────────────────────────────────────────
let _baTenantId = null; // 플랫폼총괄: 선택된 테넌트
let _baGroupId = null; // 선택된 격리그룹 ID
let _baExpandedAR = {}; // 결재라인 펼침 상태 { accountCode: bool }

// ─── DB: account_master + edu_support_domains 로드 후 ACCOUNT_MASTER 갱신 ───────
async function _baLoadAccountsFromDB() {
  if (typeof _sb !== "function" || !_sb()) return;
  try {
    const [{ data: accts }, { data: igs }] = await Promise.all([
      _sb().from("account_master").select("*"),
      _sb()
        .from("edu_support_domains")
        .select(
          "id,name,tenant_id,owned_accounts,global_admin_key,op_manager_keys",
        ),
    ]);
    // ACCOUNT_MASTER 동기화
    if (accts && typeof ACCOUNT_MASTER !== "undefined") {
      accts.forEach((row) => {
        const mapped = {
          code: row.code,
          tenantId: row.tenant_id,
          group: row.grp || "일반",
          name: row.name,
          desc: row.descr || "",
          active: row.active !== false,
          planRequired: row.plan_required !== false,
          carryover: row.carryover === true,
          isSystem: row.is_system === true,
        };
        const idx = ACCOUNT_MASTER.findIndex((a) => a.code === mapped.code);
        if (idx >= 0)
          ACCOUNT_MASTER[idx] = { ...ACCOUNT_MASTER[idx], ...mapped };
        else ACCOUNT_MASTER.push(mapped);
      });
    }
    // VORG_TEMPLATES / EDU_SUPPORT_DOMAINS 동기화
    if (igs) {
      const tpl =
        typeof VORG_TEMPLATES !== "undefined"
          ? VORG_TEMPLATES
          : typeof EDU_SUPPORT_DOMAINS !== "undefined"
            ? EDU_SUPPORT_DOMAINS
            : null;
      if (tpl) {
        igs.forEach((row) => {
          const idx = tpl.findIndex((g) => g.id === row.id);
          const mapped = {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            ownedAccounts: row.owned_accounts || [],
            globalAdminKeys: row.global_admin_key
              ? [row.global_admin_key]
              : row.op_manager_keys || [],
          };
          if (idx >= 0) tpl[idx] = { ...tpl[idx], ...mapped };
          else tpl.push(mapped);
        });
      }
    }
  } catch (e) {
    console.warn("[BudgetAccount] DB 로드 실패:", e.message);
  }
}

// ─── 진입점: 예산 계정 관리 (제도그룹 종속) ──────────────────────────
var _baTplId = null; // 선택된 virtual_org_template id (var: window 접근 호환)
var _baTplList = []; // 로드된 제도그룹 목록 캐시
var _baAccountList = []; // 로드된 계정 목록 캐시

async function renderBudgetAccount() {
  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const el = document.getElementById("bo-content");

  if (!_baTenantId) {
    _baTenantId =
      role === "platform_admin"
        ? tenants[0]?.id || "HMC"
        : boCurrentPersona.tenantId || "HMC";
  }
  const tenantName =
    tenants.find((t) => t.id === _baTenantId)?.name || _baTenantId;
  const isPlatform =
    role === "platform_admin" || role === "tenant_global_admin";

  // ── 1. 제도그룹 목록 로드 ──
  _baTplList = [];
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (sb) {
      const { data } = await sb
        .from("virtual_org_templates")
        .select("id,name,service_type,purpose")
        .eq("tenant_id", _baTenantId);
      if (data)
        _baTplList = data.filter(
          (t) =>
            (t.purpose || t.service_type || "edu_support") === "edu_support",
        );
    }
  } catch (e) {
    console.warn("[BudgetAccount] 제도그룹 로드 실패:", e.message);
  }

  if (!_baTplId || !_baTplList.find((t) => t.id === _baTplId)) {
    _baTplId = _baTplList[0]?.id || null;
  }

  // ── 2. 계정 목록 로드 ──
  _baAccountList = [];
  if (_baTplId) {
    try {
      const sb = typeof _sb === "function" ? _sb() : null;
      if (sb) {
        const { data } = await sb
          .from("budget_accounts")
          .select("*")
          .eq("virtual_org_template_id", _baTplId)
          .eq("tenant_id", _baTenantId);
        if (data) _baAccountList = data;
      }
    } catch (e) {
      console.warn("[BudgetAccount] 계정 로드 실패:", e.message);
    }
  }

  // ── 3. 필터 바 HTML (이미지3 스타일) ──
  const canEdit = [
    "platform_admin",
    "tenant_global_admin",
    "budget_global_admin",
  ].includes(role);
  const curTpl = _baTplList.find((t) => t.id === _baTplId);
  const totalCount = _baAccountList.length;

  // 선택된 계정 초기값 (첫 번째 행)
  if (!_baSelectedId && _baAccountList.length > 0) {
    _baSelectedId = _baAccountList[0].id;
  }
  // 선택된 계정 객체
  const selAcct = _baAccountList.find((a) => a.id === _baSelectedId) || null;

  // 페이지네이션 계산
  const pageSize = _baPageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (_baCurrentPage > totalPages) _baCurrentPage = totalPages;
  const startIdx = (_baCurrentPage - 1) * pageSize;
  const pageItems = _baAccountList.slice(startIdx, startIdx + pageSize);

  // ── 테이블 행 HTML ──
  const tableRows = pageItems.length
    ? pageItems
        .map((a, i) => {
          const rowNum = startIdx + i + 1;
          const isSelected = a.id === _baSelectedId;
          const intLabel =
            !a.account_type || a.account_type === "sap"
              ? "SAP 연동"
              : "자체관리";
          const budgetLabel = a.uses_budget === false ? "미사용" : "사용";
          const statusLabel = a.active ? "활성" : "비활성";
          return `<tr onclick="_baSelectRow('${a.id}')" style="cursor:pointer;${isSelected ? "background:#EFF6FF;" : ""}border-bottom:1px solid #F3F4F6"
      onmouseenter="if(!${isSelected})this.style.background='#F9FAFB'" onmouseleave="if(!${isSelected})this.style.background=''">
      <td style="padding:10px 14px;font-size:12px;color:#9CA3AF;text-align:center">${rowNum}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6B7280">${a.tenant_id || _baTenantId}</td>
      <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#111827">${a.code}</td>
      <td style="padding:10px 14px;font-size:12px;color:#1D4ED8;font-weight:600;cursor:pointer;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${a.name}">${a.name}</td>
      <td style="padding:10px 14px;font-size:11px;color:#6B7280">${intLabel}</td>
      <td style="padding:10px 14px;font-size:11px;color:#6B7280">${budgetLabel}</td>
      <td style="padding:10px 14px;text-align:center">
        <span style="font-size:10px;padding:2px 8px;border-radius:5px;font-weight:700;${a.active ? "background:#D1FAE5;color:#065F46" : "background:#F3F4F6;color:#9CA3AF"}">${statusLabel}</span>
      </td>
    </tr>`;
        })
        .join("")
    : `<tr><td colspan="7" style="padding:40px;text-align:center;font-size:13px;color:#9CA3AF">등록된 계정이 없습니다</td></tr>`;

  // ── 페이지네이션 HTML ──
  const paginationHtml =
    totalPages > 1
      ? `
  <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:12px 0;border-top:1px solid #F3F4F6">
    <select onchange="_baPageSize=Number(this.value);_baCurrentPage=1;_baRefreshList()" style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;margin-right:12px">
      ${[10, 20, 50].map((n) => `<option value="${n}" ${pageSize === n ? "selected" : ""}>${n}</option>`).join("")}
    </select>
    <button onclick="_baGoPage(1)" ${_baCurrentPage <= 1 ? "disabled" : ""} style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;background:white;cursor:pointer">&laquo;</button>
    <button onclick="_baGoPage(_baCurrentPage-1)" ${_baCurrentPage <= 1 ? "disabled" : ""} style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;background:white;cursor:pointer">&lsaquo;</button>
    ${(() => {
      let pages = [];
      const maxVisible = 10;
      let startP = Math.max(1, _baCurrentPage - Math.floor(maxVisible / 2));
      let endP = Math.min(totalPages, startP + maxVisible - 1);
      if (endP - startP < maxVisible - 1)
        startP = Math.max(1, endP - maxVisible + 1);
      for (let p = startP; p <= endP; p++) {
        pages.push(
          `<button onclick="_baGoPage(${p})" style="padding:4px 10px;border:${p === _baCurrentPage ? "1.5px solid #1D4ED8" : "1px solid #E5E7EB"};border-radius:6px;font-size:11px;font-weight:${p === _baCurrentPage ? "800" : "500"};background:${p === _baCurrentPage ? "#1D4ED8" : "white"};color:${p === _baCurrentPage ? "white" : "#374151"};cursor:pointer">${p}</button>`,
        );
      }
      return pages.join("");
    })()}
    <button onclick="_baGoPage(_baCurrentPage+1)" ${_baCurrentPage >= totalPages ? "disabled" : ""} style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;background:white;cursor:pointer">&rsaquo;</button>
    <button onclick="_baGoPage(${totalPages})" ${_baCurrentPage >= totalPages ? "disabled" : ""} style="padding:4px 8px;border:1px solid #E5E7EB;border-radius:6px;font-size:11px;background:white;cursor:pointer">&raquo;</button>
    <span style="font-size:11px;color:#9CA3AF;margin-left:8px">/ ${totalPages}</span>
  </div>`
      : "";

  // ── 우측 상세 패널 HTML ──
  const detailPanel = selAcct
    ? _baRenderDetailPanel(selAcct, canEdit)
    : `
  <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9CA3AF;font-size:13px;padding:60px 20px;text-align:center">
    <div>
      <div style="font-size:40px;margin-bottom:12px">📋</div>
      좌측 목록에서 계정을 선택하면<br>상세 정보가 표시됩니다.
    </div>
  </div>`;

  el.innerHTML = `
<div class="bo-fade" style="padding:24px">
  <!-- 페이지 타이틀 -->
  <div style="margin-bottom:16px">
    <h1 style="font-size:18px;font-weight:900;color:#111827;margin:0 0 4px 0">예산계정 관리 ☆</h1>
  </div>

  <!-- 상단 필터 바 -->
  <div style="background:white;border:1.5px solid #E5E7EB;border-radius:10px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">회사 *</label>
      ${
        isPlatform
          ? `
      <select onchange="_baTenantId=this.value;_baTplId=null;_baSelectedId=null;_baCurrentPage=1;renderBudgetAccount()"
        style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:600;color:#111827;background:white;cursor:pointer;min-width:180px">
        ${tenants.map((t) => `<option value="${t.id}" ${t.id === _baTenantId ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>`
          : `
      <input type="text" value="${tenantName}" readonly style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:600;color:#374151;background:#F9FAFB;min-width:180px">`
      }
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">제도그룹 *</label>
      ${
        _baTplList.length
          ? `
      <select onchange="_baTplId=this.value;_baSelectedId=null;_baCurrentPage=1;renderBudgetAccount()"
        style="padding:8px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:600;color:#111827;background:white;cursor:pointer;min-width:240px">
        ${_baTplList.map((t) => `<option value="${t.id}" ${t.id === _baTplId ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>`
          : `<span style="font-size:12px;color:#9CA3AF;padding:8px 0">없음</span>`
      }
    </div>
    <div style="margin-left:auto;display:flex;gap:8px">
      <button onclick="_baSelectedId=null;_baCurrentPage=1;renderBudgetAccount()" style="padding:8px 16px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:600;background:white;cursor:pointer;color:#6B7280;display:flex;align-items:center;gap:4px">↻</button>
      <button onclick="_baSelectedId=null;_baCurrentPage=1;renderBudgetAccount()" style="padding:8px 20px;border:1.5px solid #1D4ED8;border-radius:8px;font-size:12px;font-weight:700;background:#1D4ED8;color:white;cursor:pointer">🔍 조회</button>
    </div>
  </div>

  <!-- 좌우 분할 레이아웃 -->
  <div style="display:grid;grid-template-columns:1fr 380px;gap:0;min-height:520px;border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;background:white">
    
    <!-- 좌측: 테이블 목록 -->
    <div style="border-right:1.5px solid #E5E7EB;display:flex;flex-direction:column">
      <div style="padding:14px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;background:#FAFBFC">
        <div>
          <span style="font-size:14px;font-weight:800;color:#111827">예산계정 목록</span>
          <span style="font-size:12px;color:#6B7280;margin-left:6px">전체</span>
          <span style="font-size:12px;font-weight:800;color:#1D4ED8;margin-left:2px">${totalCount}</span>
        </div>
        ${canEdit ? `<button onclick="openS1Modal()" style="padding:6px 16px;border:1.5px solid #1D4ED8;border-radius:8px;font-size:12px;font-weight:700;background:white;color:#1D4ED8;cursor:pointer">+ 추가</button>` : ""}
      </div>
      <div style="flex:1;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#F8FAFC;border-bottom:1.5px solid #E5E7EB;position:sticky;top:0;z-index:1">
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:center;width:42px">NO.</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:left">테넌트 ⇅</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:left">계정 코드 ⇅</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:left">계정명 ⇅</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:left">연동</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:left">예산</th>
              <th style="padding:10px 14px;font-size:11px;color:#64748B;font-weight:700;text-align:center">계정</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>

    <!-- 우측: 상세 패널 -->
    <div id="ba-detail-panel" style="display:flex;flex-direction:column;overflow-y:auto;background:#FAFBFC">
      ${detailPanel}
    </div>

  </div>
</div>

<!-- 계정 등록/수정 모달 (신규 등록 전용) -->
<div id="s1-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:16px;width:500px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="s1-modal-title" style="font-size:15px;font-weight:800;margin:0">예산 계정 신규 등록</h3>
      <button onclick="s1CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="s1-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="s1CloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="s1SaveAccount()">저장</button>
    </div>
  </div>
</div>`;
}

// ── 새 상태 변수 ─────────────────────────────────────────────────────────────
var _baSelectedId = null; // 좌측 테이블에서 선택된 계정 id
var _baCurrentPage = 1;
var _baPageSize = 10;

// ── 행 선택 ──────────────────────────────────────────────────────────────────
function _baSelectRow(id) {
  _baSelectedId = id;
  const a = _baAccountList.find((x) => x.id === id) || null;
  const canEdit = [
    "platform_admin",
    "tenant_global_admin",
    "budget_global_admin",
  ].includes(boCurrentPersona.role);
  // 우측 패널만 갱신
  const panel = document.getElementById("ba-detail-panel");
  if (panel) panel.innerHTML = a ? _baRenderDetailPanel(a, canEdit) : "";
  // 테이블 행 하이라이트 갱신
  document.querySelectorAll("#bo-content table tbody tr").forEach((tr) => {
    const onclick = tr.getAttribute("onclick") || "";
    const isThis = onclick.includes(`'${id}'`);
    tr.style.background = isThis ? "#EFF6FF" : "";
  });
}

// ── 페이지 이동 ──────────────────────────────────────────────────────────────
function _baGoPage(p) {
  _baCurrentPage = p;
  _baRefreshList();
}
async function _baRefreshList() {
  await renderBudgetAccount();
}

// ── 우측 상세 패널 렌더 ─────────────────────────────────────────────────────
function _baRenderDetailPanel(a, canEdit) {
  const nameLen = (a.name || "").length;
  const descLen = (a.description || "").length;
  const isSap = !a.account_type || a.account_type === "sap";
  const usesBudget = a.uses_budget !== false;
  // bankbook_mode는 비동기 로드 필요하므로 기본값
  const bbMode = a._bankbook_mode || "isolated";

  return `
  <div style="padding:20px;display:flex;flex-direction:column;gap:0">
    <!-- 헤더 -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid #E5E7EB;margin-bottom:16px">
      <span style="font-size:15px;font-weight:800;color:#111827">계정 상세</span>
      <div style="display:flex;gap:6px">
        ${canEdit ? `<button onclick="_baDeleteAccount('${a.id}')" style="padding:5px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:11px;font-weight:600;background:white;color:#DC2626;cursor:pointer">삭제</button>` : ""}
        ${canEdit ? `<button onclick="_baInlineSave('${a.id}')" style="padding:5px 14px;border:1.5px solid #1D4ED8;border-radius:8px;font-size:11px;font-weight:700;background:#1D4ED8;color:white;cursor:pointer">저장</button>` : ""}
      </div>
    </div>

    <!-- 계정명/코드 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:flex;align-items:center;gap:4px;margin-bottom:5px">
        계정명/코드 <span style="color:#DC2626">*</span>
      </label>
      <input id="ba-d-name" type="text" value="${a.name || ""}" ${canEdit ? "" : "readonly"}
        maxlength="10" oninput="document.getElementById('ba-d-name-cnt').textContent=this.value.length+'/10'"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;font-weight:600;${canEdit ? "" : "background:#F9FAFB;color:#6B7280"}">
      <div style="display:flex;justify-content:space-between;margin-top:3px">
        <span style="font-size:10px;color:#9CA3AF">코드: ${a.code}</span>
        <span id="ba-d-name-cnt" style="font-size:10px;color:#9CA3AF">${nameLen}/10</span>
      </div>
    </div>

    <!-- 계정 용도 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:5px">계정 용도</label>
      <textarea id="ba-d-desc" rows="2" maxlength="50" ${canEdit ? "" : "readonly"}
        oninput="document.getElementById('ba-d-desc-cnt').textContent=this.value.length+'/50'"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:none;${canEdit ? "" : "background:#F9FAFB;color:#6B7280"}">${a.description || ""}</textarea>
      <div style="text-align:right;margin-top:2px">
        <span id="ba-d-desc-cnt" style="font-size:10px;color:#9CA3AF">${descLen}/50</span>
      </div>
    </div>

    <!-- 예산 사용 여부 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:flex;align-items:center;gap:4px;margin-bottom:6px">
        예산 사용 여부 <span style="font-size:10px;color:#9CA3AF;cursor:help" title="예산을 사용하는 계정인지 여부">ⓘ</span>
      </label>
      <div style="display:flex;gap:8px">
        <button id="ba-d-budget-yes" onclick="_baDToggle('budget',true)" style="padding:7px 16px;border:1.5px solid ${usesBudget ? "#059669" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${usesBudget ? "#F0FDF4" : "white"};color:${usesBudget ? "#059669" : "#9CA3AF"};cursor:pointer">● 사용</button>
        <button id="ba-d-budget-no" onclick="_baDToggle('budget',false)" style="padding:7px 16px;border:1.5px solid ${!usesBudget ? "#DC2626" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${!usesBudget ? "#FEF2F2" : "white"};color:${!usesBudget ? "#DC2626" : "#9CA3AF"};cursor:pointer">● 미사용</button>
      </div>
    </div>

    <!-- 연동 방식 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:flex;align-items:center;gap:4px;margin-bottom:6px">
        연동 방식 <span style="font-size:10px;color:#9CA3AF;cursor:help" title="SAP ERP 연동 또는 자체관리">ⓘ</span>
      </label>
      <div style="display:flex;gap:8px">
        <button id="ba-d-int-sap" onclick="_baDToggle('int','sap')" style="padding:7px 16px;border:1.5px solid ${isSap ? "#1D4ED8" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${isSap ? "#EFF6FF" : "white"};color:${isSap ? "#1D4ED8" : "#9CA3AF"};cursor:pointer">● SAP 연동</button>
        <button id="ba-d-int-sa" onclick="_baDToggle('int','standalone')" style="padding:7px 16px;border:1.5px solid ${!isSap ? "#059669" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${!isSap ? "#F0FDF4" : "white"};color:${!isSap ? "#059669" : "#9CA3AF"};cursor:pointer">● 자체관리 (미연동)</button>
      </div>
      <div id="ba-d-sap-code-wrap" style="margin-top:8px;${isSap ? "" : "display:none"}">
        <label style="font-size:11px;font-weight:600;color:#1D4ED8;display:block;margin-bottom:3px">SAP 연동 코드</label>
        <input id="ba-d-sap-code" type="text" value="${a.sap_code || ""}" placeholder="예) S12345"
          style="width:100%;box-sizing:border-box;padding:7px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:12px;font-weight:600">
      </div>
    </div>

    <!-- 통장 생성 정책 -->
    <div style="margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#374151;display:flex;align-items:center;gap:4px;margin-bottom:6px">
        통장 생성 정책 <span style="font-size:10px;color:#9CA3AF;cursor:help" title="조직 매핑 시 통장 생성 방식">ⓘ</span>
      </label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="ba-d-bb-iso" onclick="_baDToggle('bb','isolated')" style="padding:7px 14px;border:1.5px solid ${bbMode === "isolated" ? "#7C3AED" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${bbMode === "isolated" ? "#F5F3FF" : "white"};color:${bbMode === "isolated" ? "#7C3AED" : "#9CA3AF"};cursor:pointer">● 팀 분리 통장</button>
        <button id="ba-d-bb-sh" onclick="_baDToggle('bb','shared')" style="padding:7px 14px;border:1.5px solid ${bbMode === "shared" ? "#D97706" : "#E5E7EB"};border-radius:8px;font-size:11px;font-weight:700;background:${bbMode === "shared" ? "#FFFBEB" : "white"};color:${bbMode === "shared" ? "#D97706" : "#9CA3AF"};cursor:pointer">● 상위 조직 공유</button>
      </div>
    </div>

    <!-- 통장 생성 정책 안내 -->
    <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:12px 14px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:#0369A1;margin-bottom:6px">ⓘ 통장 생성 정책</div>
      <ul style="font-size:10px;color:#475569;margin:0;padding-left:16px;line-height:1.8">
        <li><b>팀 분리 통장</b> : 하위 팀마다 개별 통장 (예) 내구기술팀 통장, 전동화설계팀 통장</li>
        <li><b>상위 조직 공유</b> : 본부단위 통장 1개, 하위 팀이 공유. 소진 시 하위 팀 전체 영향 (예) 연구개발본부 단일 통장</li>
      </ul>
    </div>
  </div>`;
}

// ── 상세 패널 토글 헬퍼 ─────────────────────────────────────────────────────
function _baDToggle(type, val) {
  if (type === "budget") {
    const y = document.getElementById("ba-d-budget-yes");
    const n = document.getElementById("ba-d-budget-no");
    if (y && n) {
      y.style.borderColor = val ? "#059669" : "#E5E7EB";
      y.style.background = val ? "#F0FDF4" : "white";
      y.style.color = val ? "#059669" : "#9CA3AF";
      n.style.borderColor = !val ? "#DC2626" : "#E5E7EB";
      n.style.background = !val ? "#FEF2F2" : "white";
      n.style.color = !val ? "#DC2626" : "#9CA3AF";
    }
    y?.setAttribute("data-val", val ? "yes" : "no");
    n?.setAttribute("data-val", !val ? "yes" : "no");
  }
  if (type === "int") {
    const s = document.getElementById("ba-d-int-sap");
    const a = document.getElementById("ba-d-int-sa");
    const isSap = val === "sap";
    if (s) {
      s.style.borderColor = isSap ? "#1D4ED8" : "#E5E7EB";
      s.style.background = isSap ? "#EFF6FF" : "white";
      s.style.color = isSap ? "#1D4ED8" : "#9CA3AF";
    }
    if (a) {
      a.style.borderColor = !isSap ? "#059669" : "#E5E7EB";
      a.style.background = !isSap ? "#F0FDF4" : "white";
      a.style.color = !isSap ? "#059669" : "#9CA3AF";
    }
    const w = document.getElementById("ba-d-sap-code-wrap");
    if (w) w.style.display = isSap ? "" : "none";
  }
  if (type === "bb") {
    const iso = document.getElementById("ba-d-bb-iso");
    const sh = document.getElementById("ba-d-bb-sh");
    if (iso) {
      iso.style.borderColor = val === "isolated" ? "#7C3AED" : "#E5E7EB";
      iso.style.background = val === "isolated" ? "#F5F3FF" : "white";
      iso.style.color = val === "isolated" ? "#7C3AED" : "#9CA3AF";
    }
    if (sh) {
      sh.style.borderColor = val === "shared" ? "#D97706" : "#E5E7EB";
      sh.style.background = val === "shared" ? "#FFFBEB" : "white";
      sh.style.color = val === "shared" ? "#D97706" : "#9CA3AF";
    }
  }
}

// ── 인라인 저장 ──────────────────────────────────────────────────────────────
async function _baInlineSave(id) {
  const a = _baAccountList.find((x) => x.id === id);
  if (!a) return;
  const name = document.getElementById("ba-d-name")?.value.trim();
  if (!name) {
    alert("계정명은 필수입니다.");
    return;
  }
  const desc = document.getElementById("ba-d-desc")?.value.trim();
  const isSap =
    document
      .getElementById("ba-d-int-sap")
      ?.style.borderColor?.includes("30") ||
    document.getElementById("ba-d-int-sap")?.style.color?.includes("30");
  const intType = document
    .getElementById("ba-d-int-sa")
    ?.style.color?.includes("059669")
    ? "standalone"
    : "sap";
  const sapCode =
    intType === "sap"
      ? document.getElementById("ba-d-sap-code")?.value.trim()
      : null;
  const usesBudget = document
    .getElementById("ba-d-budget-yes")
    ?.style.color?.includes("059669");
  const bbMode = document
    .getElementById("ba-d-bb-sh")
    ?.style.color?.includes("D97706")
    ? "shared"
    : "isolated";

  const payload = {
    name,
    description: desc,
    account_type: intType,
    sap_code: sapCode,
    uses_budget: usesBudget,
    updated_at: new Date().toISOString(),
  };
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) {
      alert("DB 연결이 없습니다.");
      return;
    }
    const { error } = await sb
      .from("budget_accounts")
      .update(payload)
      .eq("id", id);
    if (error) throw error;
    // 통장 정책 upsert
    if (_baTplId) {
      await sb.from("budget_account_org_policy").upsert(
        {
          budget_account_id: id,
          vorg_template_id: _baTplId,
          bankbook_mode: bbMode,
          bankbook_level: "team",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "budget_account_id,vorg_template_id" },
      );
    }
    await renderBudgetAccount();
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────
async function _baDeleteAccount(id) {
  if (!confirm("이 계정을 삭제하시겠습니까?")) return;
  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) return;
    const { error } = await sb.from("budget_accounts").delete().eq("id", id);
    if (error) throw error;
    _baSelectedId = null;
    await renderBudgetAccount();
  } catch (e) {
    alert("삭제 실패: " + e.message);
  }
}

// ── 계정 목록 + 결재라인 통합 렌더 (구버전 - 하위 호환용 stub) ─────────────────
function _baRenderContent() {
  return document.getElementById("ba-content")?.innerHTML || "";
}
// ─────────────────────────────────────────────────────────────────────────────
// 예산 계정 CRUD (budget_accounts 테이블 기반)
// ─────────────────────────────────────────────────────────────────────────────
let _s1EditId = null; // 수정 시 budget_accounts.id

function _s1GenCode() {
  const seq = String(Date.now()).slice(-4);
  const tenantId = boCurrentPersona?.tenantId || "HMC";
  return tenantId + "-" + seq;
}

async function openS1Modal(id) {
  _s1EditId = id || null;
  const list =
    window._baAccountList && window._baAccountList.length > 0
      ? window._baAccountList
      : typeof _baAccountList !== "undefined"
        ? _baAccountList
        : [];
  const a = id ? list.find((x) => x.id === id) || null : null;
  const autoCode = a?.code || _s1GenCode();

  // budget_account_org_policy 로드 (기존 bankbook_mode 값 반영)
  let policy = null;
  if (id && _baTplId) {
    try {
      const sb = typeof _sb === "function" ? _sb() : getSB?.();
      if (sb) {
        const { data } = await sb
          .from("budget_account_org_policy")
          .select("bankbook_mode, bankbook_level, individual_limit")
          .eq("budget_account_id", id)
          .eq("vorg_template_id", _baTplId)
          .maybeSingle();
        policy = data;
      }
    } catch (e) {
      console.warn("[s1Modal] policy 로드 실패:", e.message);
    }
  }

  document.getElementById("s1-modal-title").textContent = id
    ? "예산 계정 수정"
    : "예산 계정 신규 등록";
  document.getElementById("s1-modal-body").innerHTML = `
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정코드 (자동채번)</label>
    <input id="s1-code" type="text" value="${autoCode}" readonly
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;background:#F9FAFB;color:#6B7280">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">계정명 *</label>
    <input id="s1-name" type="text" placeholder="예) 교육훈련비" value="${a?.name || ""}"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">용도 설명</label>
    <input id="s1-desc" type="text" placeholder="예) 사내 집합/이러닝 운영비" value="${a?.description || ""}"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="margin-bottom:12px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">예산 사용 여부</label>
    <div style="display:flex;gap:12px">
      <label id="s1-uses-yes-label" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${a?.uses_budget !== false ? "#059669" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${a?.uses_budget !== false ? "#F0FDF4" : "#fff"};flex:1" onclick="_s1ToggleUsesBudget(true)">
        <input type="radio" name="s1-uses-budget" value="yes" ${a?.uses_budget !== false ? "checked" : ""} style="accent-color:#059669">
        <div>
          <div style="font-size:12px;font-weight:800;color:#059669">✅ 사용</div>
          <div style="font-size:10px;color:#6B7280">조직별 통장 생성 및 예산 배정 허용</div>
        </div>
      </label>
      <label id="s1-uses-no-label" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${a?.uses_budget === false ? "#DC2626" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${a?.uses_budget === false ? "#FEF2F2" : "#fff"};flex:1" onclick="_s1ToggleUsesBudget(false)">
        <input type="radio" name="s1-uses-budget" value="no" ${a?.uses_budget === false ? "checked" : ""} style="accent-color:#DC2626">
        <div>
          <div style="font-size:12px;font-weight:800;color:#DC2626">⛔ 미사용</div>
          <div style="font-size:10px;color:#6B7280">통장 생성 안 함, 조회만 가능</div>
        </div>
      </label>
    </div>
  </div>
  <div id="s1-integration-section" style="margin-bottom:12px;${a?.uses_budget === false ? "display:none" : ""}">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:8px">연동 방식</label>
    <div style="display:flex;gap:12px">
      <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${!a?.integration_type || a?.integration_type === "sap" ? "#1D4ED8" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${!a?.integration_type || a?.integration_type === "sap" ? "#EFF6FF" : "#fff"};flex:1">
        <input type="radio" name="s1-integration" value="sap" ${!a?.integration_type || a?.integration_type === "sap" ? "checked" : ""} onchange="_s1ToggleIntegration()" style="accent-color:#1D4ED8">
        <div>
          <div style="font-size:12px;font-weight:800;color:#1D4ED8">🔗 SAP 연동</div>
          <div style="font-size:10px;color:#6B7280">ERP 예산관리와 실시간 연동</div>
        </div>
      </label>
      <label style="display:flex;align-items:center;gap:8px;padding:10px 16px;border:1.5px solid ${a?.integration_type === "standalone" ? "#059669" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${a?.integration_type === "standalone" ? "#F0FDF4" : "#fff"};flex:1">
        <input type="radio" name="s1-integration" value="standalone" ${a?.integration_type === "standalone" ? "checked" : ""} onchange="_s1ToggleIntegration()" style="accent-color:#059669">
        <div>
          <div style="font-size:12px;font-weight:800;color:#059669">📋 자체관리 (미연동)</div>
          <div style="font-size:10px;color:#6B7280">시스템 내 독립 예산 관리</div>
        </div>
      </label>
    </div>
    <div id="s1-sap-code-section" style="margin-top:10px;${!a?.integration_type || a?.integration_type === "sap" ? "" : "display:none"}">
      <label style="font-size:11px;font-weight:700;color:#1D4ED8;display:block;margin-bottom:4px">🔗 SAP 연동 코드</label>
      <input id="s1-sap-code" type="text" placeholder="예) S12345 (SAP 시스템 연동키)" value="${a?.sap_code || ""}"
        style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;font-weight:700">
    </div>
  </div>
  <div id="s1-bankbook-mode-section" style="margin-bottom:4px;${a?.uses_budget === false ? "display:none" : ""}">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">통장 생성 정책</label>
    <div style="font-size:10px;color:#9CA3AF;margin-bottom:8px">가상교육조직에 상위 조직(본부)을 맵핑했을 때 통장을 어떻게 만들지 결정합니다.</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <label id="s1-mode-isolated-label" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border:1.5px solid ${(policy?.bankbook_mode || "isolated") === "isolated" ? "#7C3AED" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${(policy?.bankbook_mode || "isolated") === "isolated" ? "#F5F3FF" : "#fff"};flex:1;min-width:130px" onclick="_s1ToggleBankbookMode('isolated')">
        <input type="radio" name="s1-bankbook-mode" value="isolated" ${(policy?.bankbook_mode || "isolated") === "isolated" ? "checked" : ""} style="accent-color:#7C3AED;margin-top:2px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#7C3AED">팀별 분리 통장</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">하위 팀마다 개별 통장<br>예) 내구기술팀 통장</div>
        </div>
      </label>
      <label id="s1-mode-shared-label" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border:1.5px solid ${policy?.bankbook_mode === "shared" ? "#D97706" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${policy?.bankbook_mode === "shared" ? "#FFFBEB" : "#fff"};flex:1;min-width:130px" onclick="_s1ToggleBankbookMode('shared')">
        <input type="radio" name="s1-bankbook-mode" value="shared" ${policy?.bankbook_mode === "shared" ? "checked" : ""} style="accent-color:#D97706;margin-top:2px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#D97706">상위 조직 공유 통장</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">본부단위 통장 1개, 하위 팀 공유</div>
          <div style="font-size:10px;color:#D97706;margin-top:4px;font-weight:700">⚠️ 패더 소진 시 하위 팀 전체 영향</div>
        </div>
      </label>
      <label id="s1-mode-individual-label" style="display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border:1.5px solid ${policy?.bankbook_mode === "individual" ? "#059669" : "#E5E7EB"};border-radius:10px;cursor:pointer;background:${policy?.bankbook_mode === "individual" ? "#ECFDF5" : "#fff"};flex:1;min-width:130px" onclick="_s1ToggleBankbookMode('individual')">
        <input type="radio" name="s1-bankbook-mode" value="individual" ${policy?.bankbook_mode === "individual" ? "checked" : ""} style="accent-color:#059669;margin-top:2px">
        <div>
          <div style="font-size:11px;font-weight:800;color:#059669">👤 개인별 분리 통장</div>
          <div style="font-size:10px;color:#6B7280;margin-top:2px">팀원 1인당 개별 통장<br>예) 홍길동 참가통장</div>
          <div style="font-size:10px;color:#059669;margin-top:4px;font-weight:700">💰 성장지원금 · 한도 엄격</div>
        </div>
      </label>
    </div>
    <div id="s1-individual-limit-section" style="margin-top:10px;${policy?.bankbook_mode === "individual" ? "" : "display:none"}">
      <label style="font-size:11px;font-weight:700;color:#059669;display:block;margin-bottom:4px">💰 1인당 기본 한도 (원)</label>
      <input id="s1-individual-limit" type="number" min="0" step="10000" placeholder="예) 500000" value="${policy?.individual_limit || ""}"
        style="width:200px;padding:8px 12px;border:1.5px solid #A7F3D0;border-radius:8px;font-size:13px;font-weight:700">
      <span style="font-size:10px;color:#6B7280;margin-left:8px">FO 첫 로그인 시 자동 생성 + 이 금액 배정</span>
    </div>
  </div>`;
  document.getElementById("s1-modal").style.display = "flex";
}

function _s1ToggleIntegration() {
  const radios = document.querySelectorAll('input[name="s1-integration"]');
  let isSap = false;
  radios.forEach((r) => {
    const label = r.closest("label");
    if (r.checked) {
      if (r.value === "sap") isSap = true;
      label.style.borderColor = r.value === "sap" ? "#1D4ED8" : "#059669";
      label.style.background = r.value === "sap" ? "#EFF6FF" : "#F0FDF4";
    } else {
      label.style.borderColor = "#E5E7EB";
      label.style.background = "#fff";
    }
  });
  const sapSection = document.getElementById("s1-sap-code-section");
  if (sapSection) sapSection.style.display = isSap ? "" : "none";
}

function s1CloseModal() {
  document.getElementById("s1-modal").style.display = "none";
}

// 예산 사용 여부 토글
function _s1ToggleUsesBudget(val) {
  const yesLabel = document.getElementById("s1-uses-yes-label");
  const noLabel = document.getElementById("s1-uses-no-label");
  if (!yesLabel || !noLabel) return;
  const yesR = yesLabel.querySelector("input");
  const noR = noLabel.querySelector("input");
  yesR.checked = val;
  noR.checked = !val;
  yesLabel.style.borderColor = val ? "#059669" : "#E5E7EB";
  yesLabel.style.background = val ? "#F0FDF4" : "#fff";
  noLabel.style.borderColor = !val ? "#DC2626" : "#E5E7EB";
  noLabel.style.background = !val ? "#FEF2F2" : "#fff";
  // 미사용이면 연동 방식 + 통장 생성 정책 모두 숨김
  const intSection = document.getElementById("s1-integration-section");
  const modeSection = document.getElementById("s1-bankbook-mode-section");
  if (intSection) intSection.style.display = val ? "" : "none";
  if (modeSection) modeSection.style.display = val ? "" : "none";
}

// 통장 생성 정책 토글
function _s1ToggleBankbookMode(mode) {
  const isoLabel = document.getElementById("s1-mode-isolated-label");
  const sharedLabel = document.getElementById("s1-mode-shared-label");
  const indLabel = document.getElementById("s1-mode-individual-label");
  const limitSection = document.getElementById("s1-individual-limit-section");
  if (!isoLabel || !sharedLabel) return;
  isoLabel.querySelector("input").checked = mode === "isolated";
  sharedLabel.querySelector("input").checked = mode === "shared";
  if (indLabel) indLabel.querySelector("input").checked = mode === "individual";
  isoLabel.style.borderColor = mode === "isolated" ? "#7C3AED" : "#E5E7EB";
  isoLabel.style.background = mode === "isolated" ? "#F5F3FF" : "#fff";
  sharedLabel.style.borderColor = mode === "shared" ? "#D97706" : "#E5E7EB";
  sharedLabel.style.background = mode === "shared" ? "#FFFBEB" : "#fff";
  if (indLabel) {
    indLabel.style.borderColor = mode === "individual" ? "#059669" : "#E5E7EB";
    indLabel.style.background = mode === "individual" ? "#ECFDF5" : "#fff";
  }
  if (limitSection)
    limitSection.style.display = mode === "individual" ? "" : "none";
}

async function s1SaveAccount() {
  const code = document.getElementById("s1-code").value.trim();
  const name = document.getElementById("s1-name").value.trim();
  if (!code || !name) {
    alert("계정명은 필수입니다.");
    return;
  }
  if (!_baTplId) {
    alert("제도그룹을 먼저 선택하세요.");
    return;
  }

  const role = boCurrentPersona.role;
  const tenantId =
    role === "platform_admin"
      ? _baTenantId || "HMC"
      : boCurrentPersona.tenantId || "HMC";
  const integration =
    document.querySelector('input[name="s1-integration"]:checked')?.value ||
    "sap";
  const sapCode =
    integration === "sap"
      ? document.getElementById("s1-sap-code")?.value.trim()
      : null;
  const usesBudget =
    document.querySelector('input[name="s1-uses-budget"]:checked')?.value !==
    "no";
  const bankbookMode =
    document.querySelector('input[name="s1-bankbook-mode"]:checked')?.value ||
    "isolated";
  const payload = {
    tenant_id: tenantId,
    virtual_org_template_id: _baTplId,
    code,
    name,
    account_type: integration,
    sap_code: sapCode,
    description: document.getElementById("s1-desc").value.trim(),
    active: true, // uses_budget=false여도 active는 true 유지 (비활성≠예산미사용)
    uses_budget: usesBudget,
    updated_at: new Date().toISOString(),
  };

  try {
    const sb = typeof _sb === "function" ? _sb() : null;
    if (!sb) {
      alert("DB 연결이 없습니다.");
      return;
    }
    if (_s1EditId) {
      const { error } = await sb
        .from("budget_accounts")
        .update(payload)
        .eq("id", _s1EditId);
      if (error) throw error;
      // 통장 생성 정책 upsert
      const policyPayload = {
        budget_account_id: _s1EditId,
        vorg_template_id: _baTplId,
        bankbook_mode: bankbookMode,
        bankbook_level: "team",
        updated_at: new Date().toISOString(),
      };
      if (bankbookMode === "individual") {
        const limitVal = document.getElementById("s1-individual-limit")?.value;
        policyPayload.individual_limit = limitVal ? Number(limitVal) : null;
      } else {
        policyPayload.individual_limit = null;
      }
      await sb
        .from("budget_account_org_policy")
        .upsert(policyPayload, {
          onConflict: "budget_account_id,vorg_template_id",
        });
    } else {
      payload.id = "BA-" + Date.now();
      const { error } = await sb.from("budget_accounts").insert(payload);
      if (error) throw error;
      // 통장 생성 정책 insert
      const newPolicyPayload = {
        budget_account_id: payload.id,
        vorg_template_id: _baTplId,
        bankbook_mode: bankbookMode,
        bankbook_level: "team",
      };
      if (bankbookMode === "individual") {
        const limitVal = document.getElementById("s1-individual-limit")?.value;
        newPolicyPayload.individual_limit = limitVal ? Number(limitVal) : null;
      }
      await sb.from("budget_account_org_policy").insert(newPolicyPayload);
      // ✅ 신규 계정 생성 시 → 자동 통장 동기화
      try {
        await _syncBankbooksForTemplate(_baTplId, payload.tenant_id);
      } catch (e) {
        console.warn("[통장 동기화]", e.message);
      }
    }
    s1CloseModal();
    // 독립 메뉴(bo_budget_account.js)에서 호출된 경우
    if (
      typeof _bamLoadBudgetAccountsList === "function" &&
      window._bamSelectedTplId
    ) {
      _bamLoadBudgetAccountsList(window._bamSelectedTplId);
    } else {
      await renderBudgetAccount();
    }
  } catch (e) {
    alert("저장 실패: " + e.message);
  }
}

// ── 결재라인 펼침 토글 (하위 호환 stub) ───────────────────────────────────
function _baToggleAR(code) {
  _baExpandedAR[code] = !(_baExpandedAR[code] || false);
}

// ── 특정 계정으로 결재라인 추가 모달 열기 ────────────────────────────────────
function arOpenNewModalForAccount(accountCode) {
  const tenantId =
    boCurrentPersona.tenantId ||
    (boCurrentPersona.role === "platform_admin" ? _baTenantId : "HMC");
  const newId = "AR" + String(Date.now()).slice(-6);
  const newRouting = {
    id: newId,
    tenantId,
    name: accountCode + " 결재라인",
    accountCodes: [accountCode],
    ranges: [
      { max: 1000000, label: "100만원 미만", approvers: ["팀장 전결"] },
      { max: null, label: "100만원 이상", approvers: ["팀장", "실장"] },
    ],
  };
  APPROVAL_ROUTING.push(newRouting);
  // 기존 모달 재활용
  const modal = document.getElementById("ar-modal");
  if (modal) {
    document.getElementById("ar-modal-title").textContent =
      `결재라인 추가 — ${accountCode}`;
    document.getElementById("ar-modal-body").innerHTML =
      _renderArEditor(newRouting);
    modal.style.display = "flex";
    // 모달 닫을 때 ba-content 갱신
    modal._onClose = () => {
      document.getElementById("ba-content").innerHTML = _baRenderContent();
    };
  }
}
