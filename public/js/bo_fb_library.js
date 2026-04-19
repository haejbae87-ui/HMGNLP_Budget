// ─── bo_fb_library.js — 폼빌더 목록/라이브러리 UI (REFACTOR-1) ───
  const role = boCurrentPersona.role;
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";

  // 테넌트 초기화
  if (!_fbTenantId) {
    _fbTenantId = isPlatform
      ? tenants[0]?.id || "HMC"
      : boCurrentPersona.tenantId || "HMC";
  }
  // 데이터 로드
  await _fbLoadDbData();

  // 제도그룹 초기화
  if (!_fbGroupId) {
    _fbGroupId = _fbTplList[0]?.id || null;
  }
  // 계정 초기화 (가상교육조직 하위 예산계정)
  if (!_fbAccountCode && _fbGroupId) {
    const accs = _fbAccountList.filter(
      (a) => a.virtual_org_template_id === _fbGroupId,
    );
    _fbAccountCode = accs[0]?.code || null;
  }

  document.getElementById("bo-content").innerHTML = _fbRenderPage();
}

function _fbRenderPage() {
  const role = boCurrentPersona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";
  const tenants = typeof TENANTS !== "undefined" ? TENANTS : [];
  const tenantName =
    tenants.find((t) => t.id === _fbTenantId)?.name || _fbTenantId || "";

  // 제도그룹 목록
  const groups = _fbTplList;
  // 선택된 가상교육조직의 예산 계정
  const selGroup = groups.find((g) => g.id === _fbGroupId);
  const accounts = _fbGroupId
    ? _fbAccountList
        .filter((a) => a.virtual_org_template_id === _fbGroupId)
        .map((a) => ({ code: a.code, name: a.name || a.code }))
    : [];

  // ── 필터바 ── 교육지원 운영 규칙관리와 동일 스타일
  // 행 1: 데이터 범위 필터 (tenant/group/account)
  const filterBar =
    isPlatform || isTenant
      ? `
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 20px;
              background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px 12px 0 0;margin-bottom:0">
    ${
      isPlatform
        ? `
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">회사</label>
      <select onchange="_fbTenantId=this.value;_fbGroupId=null;_fbAccountCode=null;_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer">
        ${tenants.map((t) => `<option value="${t.id}" ${t.id === _fbTenantId ? "selected" : ""}>${t.name}</option>`).join("")}
      </select>
    </div>`
        : `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:12px;font-weight:700;color:#374151">회사</span>
      <span style="font-size:12px;font-weight:800;color:#111827">${tenantName}</span>
    </div>`
    }
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">제도그룹</label>
      <select onchange="_fbGroupId=this.value;_fbAccountCode=null;_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        <option value="">전체 조직</option>
        ${groups.map((g) => `<option value="${g.id}" ${g.id === _fbGroupId ? "selected" : ""}>${g.name}</option>`).join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">예산계정</label>
      <select onchange="_fbAccountCode=this.value;_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px">
        <option value="">전체 계정</option>
        ${accounts.map((a) => `<option value="${a.code}" ${a.code === _fbAccountCode ? "selected" : ""}>${a.name}</option>`).join("")}
      </select>
    </div>
  </div>`
      : "";

  // 행 2: 서비스유형/목적/교육유형/세부유형/조회/초기화
  const eduTypesForPurpose = _fbPurposeFilter
    ? FORM_EDU_TYPES[_fbPurposeFilter] || []
    : [];
  const filterBar2 = `
  <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px 20px;
              background:#F9FAFB;border:1.5px solid #E5E7EB;border-top:${isPlatform || isTenant ? "1px dashed #D1D5DB" : "none"};
              border-radius:${isPlatform || isTenant ? "0 0 12px 12px" : "12px"};margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">서비스 유형</label>
      <select onchange="_fbServiceTypeFilter=this.value;_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:120px">
        <option value="">전체 유형</option>
        ${Object.entries(FORM_TARGET_TYPES)
          .map(
            ([k, v]) =>
              `<option value="${k}" ${_fbServiceTypeFilter === k ? "selected" : ""}>${v.label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">목적</label>
      <select onchange="_fbPurposeFilter=this.value;_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:170px"
        ${!_fbServiceTypeFilter ? "" : ""}>
        <option value="">전체 목적</option>
        ${Object.entries(FORM_PURPOSE_TYPES)
          .filter(
            ([k, v]) =>
              !_fbServiceTypeFilter ||
              v.targetUser ===
                (_fbServiceTypeFilter === "learner" ? "learner" : "admin"),
          )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${_fbPurposeFilter === k ? "selected" : ""}>${v.icon} ${v.label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">교육유형</label>
      <select onchange="_fbEduTypeFilter=this.value;_fbEduSubTypeFilter='';renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:160px"
        ${!_fbPurposeFilter ? "disabled" : ""}>
        <option value="">전체 교육유형</option>
        ${eduTypesForPurpose
          .map(
            (t) =>
              `<option value="${t.type}" ${_fbEduTypeFilter === t.type ? "selected" : ""}>${t.type}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <label style="font-size:12px;font-weight:700;color:#374151;white-space:nowrap">세부유형</label>
      <select onchange="_fbEduSubTypeFilter=this.value;renderFormBuilderMenu()"
        style="padding:7px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;background:#fff;cursor:pointer;min-width:140px"
        ${!_fbEduTypeFilter ? "disabled" : ""}>
        <option value="">전체 세부유형</option>
        ${(
          eduTypesForPurpose.find((t) => t.type === _fbEduTypeFilter)?.sub || []
        )
          .map(
            (s) =>
              `<option value="${s}" ${_fbEduSubTypeFilter === s ? "selected" : ""}>${s}</option>`,
          )
          .join("")}
      </select>
    </div>
    <button onclick="renderFormBuilderMenu()"
      style="padding:8px 18px;background:#1D4ED8;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">🔍 조회</button>
    <button onclick="_fbServiceTypeFilter='';_fbPurposeFilter='';_fbEduTypeFilter='';_fbEduSubTypeFilter='';renderFormBuilderMenu()"
      style="padding:8px 14px;background:#fff;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">초기화</button>
  </div>`;

  return `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#7C3AED;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px">양식 관리</span>
      <h1 class="bo-page-title" style="margin:0">🧙 교육신청양식마법사</h1>
    </div>
    <p class="bo-page-sub">교육 서비스에 사용할 양식을 제작하고, 프로세스 패턴과 연결합니다.</p>
  </div>

  ${filterBar}
  ${filterBar2}

  <!-- 탭 네비게이션 -->
  <div style="display:flex;gap:0;border-bottom:2px solid #E5E7EB;margin-bottom:24px">
    ${_fbTabBtn("library", "📚 양식 라이브러리")}
    ${_fbTabBtn("field_catalog", "📌 입력 필드 관리")}
  </div>

  <!-- 탭 콘텐츠 -->
  <div id="fb-tab-content">
    ${_fbCurrentTab === "field_catalog" ? _fbRenderFieldCatalog() : _fbRenderLibrary()}
  </div>
</div>`;
}

function _fbTabBtn(id, label) {
  const active = _fbCurrentTab === id;
  return `<button onclick="_fbSwitchTab('${id}')" style="
    padding:10px 20px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:${active ? "900" : "600"};
    color:${active ? "#7C3AED" : "#6B7280"};border-bottom:${active ? "3px solid #7C3AED" : "3px solid transparent"};
    margin-bottom:-2px;transition:all .15s">${label}</button>`;
}

function _fbSwitchTab(tab) {
  _fbCurrentTab = tab;
  if (tab === "field_catalog") {
    // 필드 카탈로그 탭은 DB 로드 필요
    _fbLoadFieldCatalog()
      .then(() => {
        document.getElementById("bo-content").innerHTML = _fbRenderPage();
      })
      .catch(() => {
        document.getElementById("bo-content").innerHTML = _fbRenderPage();
      });
  } else {
    document.getElementById("bo-content").innerHTML = _fbRenderPage();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① 양식 라이브러리 탭 - 목적→교육유형→세부유형→단계 계층 구조
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function _fbRenderLibrary() {
  const role = boCurrentPersona.role;
  const isPlatform = role === "platform_admin";
  const isTenant = role === "tenant_global_admin";

  // 필터 기준 테넌트 결정
  const tenantId =
    isPlatform || isTenant
      ? _fbTenantId || boCurrentPersona.tenantId
      : boCurrentPersona.tenantId || "HMC";
  let allForms = FORM_MASTER.filter((f) => f.tenantId === tenantId);

  // 가상교육조직 필터 (virtual_org_template_id 없는 양식은 하위호환으로 표시)
  if (_fbGroupId) {
    allForms = allForms.filter((f) => !f.domainId || f.domainId === _fbGroupId);
  }
  // 예산계정 필터 (엄격 모드: accountCode 없는 양식은 계정 선택 시 제외)
  if (_fbAccountCode) {
    allForms = allForms.filter((f) => f.accountCode === _fbAccountCode);
  }

  // 서비스 유형 (목적 필드 기반으로 targetUser 매칭)
  if (_fbServiceTypeFilter) {
    allForms = allForms.filter((f) => {
      const p = FORM_PURPOSE_TYPES[f.purpose];
      return (
        p &&
        p.targetUser ===
          (_fbServiceTypeFilter === "learner" ? "learner" : "admin")
      );
    });
  }

  // 목적 필터 적용
  if (_fbPurposeFilter) {
    allForms = allForms.filter((f) => f.purpose === _fbPurposeFilter);
  }
  // 교육유형 필터 적용
  if (_fbEduTypeFilter) {
    allForms = allForms.filter((f) => f.eduType === _fbEduTypeFilter);
  }

  // 교육 세부유형 필터
  if (_fbEduSubTypeFilter) {
    allForms = allForms.filter((f) => f.eduSubType === _fbEduSubTypeFilter);
  }

  // 상단 버튼
  const addBtn = `
<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
  <button class="bo-btn-primary" onclick="fbOpenBuilderModal()"
    style="display:flex;align-items:center;gap:6px;padding:9px 18px">＋ 새 양식 만들기</button>
</div>`;

  // 전체 요약 배지
  const totalByStage = (stage) =>
    allForms.filter((f) => f.type === stage).length;
  const summaryBar = `
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
  ${Object.entries(FORM_STAGE_TYPES)
    .map(
      ([k, v]) => `
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:${v.bg};
              border-radius:20px;border:1.5px solid ${v.color}20">
    <span style="font-size:13px">${v.icon}</span>
    <span style="font-size:11px;font-weight:800;color:${v.color}">${v.label.split("(")[0].trim()}</span>
    <span style="font-size:11px;font-weight:900;color:${v.color}">${totalByStage(k)}개</span>
  </div>`,
    )
    .join("")}
  <div style="display:flex;align-items:center;gap:6px;padding:6px 14px;background:#F9FAFB;
              border-radius:20px;border:1.5px solid #E5E7EB">
    <span style="font-size:11px;font-weight:700;color:#374151">전체</span>
    <span style="font-size:11px;font-weight:900;color:#111827">${allForms.length}개</span>
  </div>
</div>`;

  // ── 테이블 렌더링 ──
  const headerStyle =
    "padding:10px 14px;font-size:11px;font-weight:800;color:#6B7280;text-align:left;border-bottom:2px solid #E5E7EB;white-space:nowrap";
  const tableHeader = `
<tr>
  <th style="${headerStyle};text-align:center;width:44px">NO.</th>
  <th style="${headerStyle}">양식명</th>
  <th style="${headerStyle};width:80px">단계</th>
  <th style="${headerStyle}">목적 / 교육유형</th>
  <th style="${headerStyle};width:60px;text-align:center">필드수</th>
  <th style="${headerStyle};width:60px;text-align:center">상태</th>
  <th style="${headerStyle};width:280px;text-align:center">관리</th>
</tr>`;

  const formRows = allForms
    .map((f, idx) => {
      const s = FORM_STAGE_TYPES[f.type] || FORM_STAGE_TYPES.apply;
      const fields = f.fields || [];
      const purposeLabel =
        FORM_PURPOSE_TYPES[f.purpose]?.label || f.purpose || "—";
      const eduTypeLabel = f.eduType || "—";
      const _fStatus = f.status || (f.active ? "published" : "draft");
      const _statusMap = {
        draft: { bg: "#F3F4F6", color: "#6B7280", label: "📝 초안" },
        published: {
          bg: "#D1FAE5",
          color: "#065F46",
          label: `✅ 배포중 v${f.version || 1}`,
        },
        archived: { bg: "#FEF3C7", color: "#92400E", label: "📦 보관" },
      };
      const _sm = _statusMap[_fStatus] || _statusMap.draft;
      const statusBg = _sm.bg;
      const statusColor = _sm.color;
      const statusLabel = _sm.label;
      const safeId = String(f.id || "").replace(/'/g, "\\'");
      const safeName = String(f.name || "").replace(/'/g, "\\'");

      // 교육지원 운영 규칙 연결 여부
      const mappedPolicy =
        typeof SERVICE_POLICIES !== "undefined"
          ? SERVICE_POLICIES.find((p) => {
              const list1 = p.formIds || [];
              const list2 = p.stage_form_ids
                ? Object.values(p.stage_form_ids)
                : [];
              const list3 = p.formSets ? Object.values(p.formSets) : [];
              const list4 = p.stageFormIds ? Object.values(p.stageFormIds) : [];
              return [...list1, ...list2, ...list3, ...list4].includes(f.id);
            })
          : null;
      const isMapped = !!mappedPolicy;

      return `
<tr style="border-bottom:1px solid #F3F4F6;cursor:pointer;transition:background .12s"
    onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''"
    onclick="event.stopPropagation();fbOpenBuilderModal('${safeId}')">
  <td style="padding:11px 14px;text-align:center;color:#9CA3AF;font-size:12px">${idx + 1}</td>
  <td style="padding:11px 14px;max-width:200px">
    <div style="font-weight:800;font-size:13px;color:#111827;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.name}">${f.name}</div>
    ${f.desc ? `<div style="font-size:10px;color:#9CA3AF;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.desc}</div>` : ""}
    ${isMapped ? `<span style="font-size:9px;color:#059669;background:#ecfdf5;padding:1px 6px;border-radius:4px">🔒 ${mappedPolicy.name}</span>` : ""}
  </td>
  <td style="padding:11px 14px">
    <span style="font-size:10px;font-weight:900;padding:3px 8px;border-radius:6px;background:${s.bg};color:${s.color};white-space:nowrap">${s.icon} ${s.label.split("(")[0].trim()}</span>
  </td>
  <td style="padding:11px 14px;font-size:11px;color:#374151">
    <div style="font-weight:700">${purposeLabel}</div>
    ${f.eduType ? `<div style="color:#9CA3AF;font-size:10px;margin-top:2px">${f.eduType}${f.eduSubType ? " / " + f.eduSubType : ""}</div>` : ""}
  </td>
  <td style="padding:11px 14px;text-align:center;font-size:11px;color:#6B7280">📋 ${fields.length}</td>
  <td style="padding:11px 14px;text-align:center">
    <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:${statusBg};color:${statusColor}">${statusLabel}</span>
  </td>
  <td style="padding:8px 10px;text-align:center">
    <div style="display:flex;gap:3px;justify-content:center;align-items:center;flex-wrap:nowrap">
      <button onclick="event.stopPropagation();fbPreviewForm('${safeId}')" title="미리보기"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151;white-space:nowrap">🔍 미리보기</button>
      <button onclick="event.stopPropagation();fbOpenBuilderModal('${safeId}')" title="수정"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #D1D5DB;background:white;cursor:pointer;font-weight:700;color:#374151;white-space:nowrap">✏️ 수정</button>
      <button onclick="event.stopPropagation();fbCopyForm('${safeId}')" title="복사"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #DDD6FE;background:#F5F3FF;cursor:pointer;font-weight:700;color:#7C3AED;white-space:nowrap">📋 복사</button>
      ${
        _fStatus !== "published"
          ? `<button onclick="event.stopPropagation();fbDeployForm('${safeId}')" title="배포하기"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid #059669;background:#F0FDF4;cursor:pointer;font-weight:700;color:#059669;white-space:nowrap">🚀 배포</button>`
          : ""
      }
      <button onclick="event.stopPropagation();fbToggleActive('${safeId}')" title="${_fStatus === "published" ? "보관하기" : _fStatus === "archived" ? "초안으로 복원" : ""}"
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid ${_fStatus === "published" ? "#F59E0B" : "#059669"};background:white;cursor:pointer;font-weight:700;color:${_fStatus === "published" ? "#F59E0B" : "#059669"};white-space:nowrap">${_fStatus === "published" ? "📦 보관" : _fStatus === "archived" ? "📝 복원" : ""}</button>
      <button ${isMapped ? `disabled title="${mappedPolicy.name} 정책 연결 중"` : `onclick="event.stopPropagation();fbDeleteForm('${safeId}')"`}
        style="font-size:10px;padding:4px 7px;border-radius:6px;border:1.5px solid ${isMapped ? "#E5E7EB" : "#FECACA"};background:${isMapped ? "#F9FAFB" : "#FEF2F2"};color:${isMapped ? "#9CA3AF" : "#DC2626"};cursor:${isMapped ? "not-allowed" : "pointer"};font-weight:700">🗑️</button>
    </div>
  </td>
</tr>`;
    })
    .join("");

  const tableHtml =
    allForms.length > 0
      ? `
<div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:8px">양식 목록 (${allForms.length}개)</div>
<div style="overflow-x:auto;border:1px solid #E5E7EB;border-radius:12px;background:#fff">
  <table style="width:100%;border-collapse:collapse">
    <thead>${tableHeader}</thead>
    <tbody>${formRows}</tbody>
  </table>
</div>`
      : `
<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:16px;border:1px dashed #D1D5DB">
  <div style="font-size:32px;margin-bottom:8px">📭</div>
  <div style="font-size:14px;font-weight:700;color:#374151">등록된 양식이 없습니다</div>
  <div style="font-size:12px;color:#9CA3AF;margin-top:4px">새 양식 만들기 버튼으로 첫 양식을 추가하세요</div>
</div>`;

  return addBtn + summaryBar + tableHtml;
}

// 단계별 미니 배지 세트 (계획N / 신청N / 결과N)
function _fbStageMiniSet(forms) {
  return Object.entries(FORM_STAGE_TYPES)
    .map(([k, v]) => {
      const cnt = forms.filter((f) => f.type === k).length;
      if (cnt === 0) return "";
      return `<span style="font-size:9px;padding:2px 7px;border-radius:8px;background:${v.bg};color:${v.color};font-weight:800;border:1px solid ${v.color}30">${v.icon.trim()} ${v.label.split("(")[0].replace("교육", "").trim()} ${cnt}</span>`;
    })
    .join(" ");
}

function _fbFormCard(f) {
  const s = FORM_STAGE_TYPES[f.type] || FORM_STAGE_TYPES.apply;
  const fields = f.fields || [];
  const fieldNames = fields
    .map((fld) => (typeof fld === "object" ? fld.key : fld))
    .join(", ");

  // 교육지원 운영 규칙 및 구버전 서비스 매핑 확인
  const mappedPolicy =
    typeof SERVICE_POLICIES !== "undefined"
      ? SERVICE_POLICIES.find((p) => {
          const list1 = p.formIds || [];
          const list2 = p.stage_form_ids ? Object.values(p.stage_form_ids) : [];
          const list3 = p.formSets ? Object.values(p.formSets) : [];
          const list4 = p.stageFormIds ? Object.values(p.stageFormIds) : [];
          return [...list1, ...list2, ...list3, ...list4].includes(f.id);
        })
      : null;
  const isMapped = !!mappedPolicy;
  const mapName = mappedPolicy ? mappedPolicy.name : "";

  return `
<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;
            border-left:3px solid ${s.color};background:#fff;border-radius:8px;
            margin-bottom:5px;border:1px solid #F3F4F6;border-left-width:3px;
            transition:background .1s" 
     onmouseover="this.style.background='${s.bg}'" 
     onmouseout="this.style.background='#fff'">
  <!-- 단계 뱃지 -->
  <span style="flex-shrink:0;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;
               background:${s.bg};color:${s.color};min-width:48px;text-align:center">
    ${s.icon} ${s.label.split("(")[0].trim()}
  </span>
  <!-- 양식명 -->
  <span style="flex:1;font-size:12px;font-weight:800;color:#111827;overflow:hidden;
               text-overflow:ellipsis;white-space:nowrap;cursor:default"
        title="${f.name}${f.desc ? " — " + f.desc : ""}">
    ${f.name}
    ${isMapped ? ` <span style="font-size:10px;color:#059669;background:#ecfdf5;padding:2px 6px;border-radius:4px;vertical-align:middle;margin-left:6px" title="이 양식은 [${mapName}] 정책에 연동되어 있습니다.">[🔒 ${mapName} 연결됨]</span>` : ""}
  </span>
  <!-- 필드 수 -->
  <span title="포함 필드: ${fieldNames}"
        style="flex-shrink:0;font-size:10px;color:#6B7280;background:#F3F4F6;
               padding:2px 8px;border-radius:10px;cursor:default;white-space:nowrap">
    📋 ${fields.length}개 필드
  </span>
  <!-- 활성 상태 -->
  <span class="bo-badge ${f.active ? "bo-badge-green" : "bo-badge-gray"}" style="flex-shrink:0">
    ${f.active ? "활성" : "비활성"}
  </span>
  <!-- 액션 버튼 -->
  <div style="display:flex;gap:4px;flex-shrink:0">
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbPreviewForm('${f.id}')">🔍 미리보기</button>
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbOpenBuilderModal('${f.id}')">✏️ 수정</button>
    <button class="bo-btn-secondary bo-btn-sm" onclick="fbCopyForm('${f.id}')" style="color:#7C3AED;border-color:#DDD6FE">📋 복사</button>
    <button onclick="fbToggleActive('${f.id}')"
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${f.active ? "#F59E0B" : "#059669"};
             background:#fff;color:${f.active ? "#F59E0B" : "#059669"};font-size:10px;font-weight:800;cursor:pointer">
      ${f.active ? "비활성화" : "활성화"}
    </button>
    <button ${isMapped ? `disabled title="${mapName} 정책에 연결되어 삭제할 수 없습니다."` : `onclick="fbDeleteForm('${f.id}')"`}
      style="padding:4px 8px;border-radius:6px;border:1.5px solid ${isMapped ? "#E5E7EB" : "#EF4444"};
             background:#fff;color:${isMapped ? "#9CA3AF" : "#EF4444"};font-size:10px;font-weight:800;cursor:${isMapped ? "not-allowed" : "pointer"}">
      삭제
    </button>
  </div>
</div>`;
}

async function fbDeleteForm(formId) {
  if (!confirm("정말로 이 양식을 삭제하시겠습니까? (삭제 후 복구 불가)"))
    return;

  // 1) 메모리 삭제
  if (typeof FORM_MASTER !== "undefined") {
    const idx = FORM_MASTER.findIndex((x) => x.id === formId);
    if (idx > -1) FORM_MASTER.splice(idx, 1);
  }

  // 2) DB 삭제
  if (typeof sbDeleteFormTemplate === "function") {
    const ok = await sbDeleteFormTemplate(formId);
    if (!ok) {
      console.warn("[FormBuilder] DB 삭제 실패 - 메모리에서만 삭제되었습니다.");
    }
  }

  // 3) UI 갱신
  renderFormBuilderMenu();
}

// ── 빌더 상세페이지 ──────────────────────────────────────────────────────────
let _fbDragIdx = -1; // DnD 상태

function fbOpenBuilderModal(formId) {
  _fbEditId = formId || null;
  const form = formId ? FORM_MASTER.find((f) => f.id === formId) : null;
  _fbTempFields = form
    ? (form.fields || []).map((f) => {
        if (typeof f === "object")
          return {
            key: f.key,
            scope: f.scope || "front",
            required: f.required === true,
          };
        return { key: f, scope: "front", required: false };
      })
    : [];
  // DB에서 필드 카탈로그 로드 (비동기)
  _fbLoadFieldCatalog()
    .then(() => {
      document.getElementById("bo-content").innerHTML = _fbEditorPage(form);
    })
    .catch(() => {
      document.getElementById("bo-content").innerHTML = _fbEditorPage(form);
    });
}

function fbCloseEditor() {
  renderFormBuilderMenu();
}

function _fbEditorPage(form) {
  const nameVal = form?.name || "";
  const typeVal = form?.type || "apply";
  const descVal = form?.desc || "";
  const purposeVal = form?.purpose || "";
  const eduTypeVal = form?.eduType || "";
  const eduSubVal = form?.eduSubType || "";

  // 목적 연동 교육유형 목록
  const eduTypesMap = purposeVal ? FORM_EDU_TYPES[purposeVal] || [] : [];
  const selEduType = eduTypesMap.find((t) => t.type === eduTypeVal) || null;
  // 사용대상: 기존 form.purpose에서 유추하거나 form.targetUser에서 읽음
  const targetUser =
    form?.targetUser ||
    (purposeVal ? FORM_PURPOSE_TYPES[purposeVal]?.targetUser || "" : "");

  // 카테고리별 필드 그룹 (L1 + L2 통합)
  const allFields = _fbAllFields();
  const categories = [...new Set(allFields.map((f) => f.category))];

  const titleText = form ? `'${form.name}' 편집` : "새 양식 만들기";
  return `
<div class="bo-fade">
<!-- 상단 헤더 -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
  <div style="display:flex;align-items:center;gap:10px">
    <button onclick="fbCloseEditor()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#6B7280" title="목록으로">←</button>
    <h2 style="margin:0;font-size:18px;font-weight:900;color:#111827">${titleText}</h2>
  </div>
  <div style="display:flex;gap:8px">
    <button class="bo-btn-secondary" onclick="fbCloseEditor()" style="padding:8px 18px;font-size:13px">취소</button>
    <button class="bo-btn-primary" onclick="fbSaveForm()" style="padding:8px 22px;font-size:13px">💾 임시저장</button>
    <button onclick="fbSaveAndDeploy()" style="padding:8px 22px;font-size:13px;border:none;border-radius:8px;background:linear-gradient(135deg,#059669,#047857);color:white;font-weight:900;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.3)">🚀 배포하기</button>
  </div>
</div>
<!-- 범위 배지 -->
${
  _fbGroupId || _fbAccountCode
    ? `
<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;background:#F5F3FF;border:1.5px solid #DDD6FE;border-radius:10px;margin-bottom:14px">
  <span style="font-size:10px;font-weight:900;color:#5B21B6">📌 분류 범위</span>
  ${
    _fbGroupId
      ? (() => {
          const g = _fbTplList.find((x) => x.id === _fbGroupId);
          return `<span style="font-size:11px;font-weight:700;background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:6px">🏢 ${g?.name || _fbGroupId}</span>`;
        })()
      : ""
  }
  ${
    _fbAccountCode
      ? (() => {
          const a = _fbAccountList.find((x) => x.code === _fbAccountCode);
          return `<span style="font-size:11px;font-weight:700;background:#DBEAFE;color:#1E40AF;padding:2px 8px;border-radius:6px">💳 ${a?.name || _fbAccountCode}</span>`;
        })()
      : ""
  }
</div>`
    : ""
}
<!-- 서비스 유형 선택 (직접학습 / 교육운영) -->
<div style="margin-bottom:12px">
  <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px;color:#374151">서비스 유형 *</label>
  <div style="display:flex;gap:8px">
    <label id="fb-target-learner-lbl" onclick="_fbOnTargetUserChange('learner')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser === "learner" ? "#059669" : "#E5E7EB"};
             background:${targetUser === "learner" ? "#F0FDF4" : "#F9FAFB"}">
      <input type="radio" name="fb-target-user" value="learner" ${targetUser === "learner" ? "checked" : ""}
             style="accent-color:#059669;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser === "learner" ? "#059669" : "#6B7280"}">📚 직접학습</span>
      <span style="font-size:10px;color:#9CA3AF">(개인 신청)</span>
    </label>
    <label id="fb-target-admin-lbl" onclick="_fbOnTargetUserChange('admin')"
      style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:8px;cursor:pointer;
             border:2px solid ${targetUser === "admin" ? "#7C3AED" : "#E5E7EB"};
             background:${targetUser === "admin" ? "#F5F3FF" : "#F9FAFB"}">
      <input type="radio" name="fb-target-user" value="admin" ${targetUser === "admin" ? "checked" : ""}
             style="accent-color:#7C3AED;width:14px;height:14px">
      <span style="font-size:12px;font-weight:800;color:${targetUser === "admin" ? "#7C3AED" : "#6B7280"}">🎯 교육운영</span>
      <span style="font-size:10px;color:#9CA3AF">(운영 관리)</span>
    </label>
  </div>
</div>
<!-- 행 1: 단계 + 목적 -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">단계 *</label>
    <select id="fb-type" style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      ${Object.entries(FORM_STAGE_TYPES)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${typeVal === k ? "selected" : ""}>${v.icon} ${v.label.split(" ")[0]}</option>`,
        )
        .join("")}
    </select>
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">목적</label>
    <select id="fb-purpose" onchange="_fbOnPurposeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${Object.entries(FORM_PURPOSE_TYPES)
        .filter(([k, v]) => !targetUser || v.targetUser === targetUser)
        .map(
          ([k, v]) =>
            `<option value="${k}" ${purposeVal === k ? "selected" : ""}>${v.icon} ${v.label}</option>`,
        )
        .join("")}
    </select>
  </div>
</div>
<!-- 행 2: 교육유형 + 세부유형 (목적 선택 시 표시) -->
<div id="fb-edutypes-row" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;${purposeVal && eduTypesMap.length > 0 ? "" : "display:none"}"
  class="${purposeVal && eduTypesMap.length > 0 ? "" : "d-none"}">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">교육유형</label>
    <select id="fb-edu-type" onchange="_fbOnEduTypeChange(this.value)"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${eduTypesMap.map((t) => `<option value="${t.type}" ${eduTypeVal === t.type ? "selected" : ""}>${t.type}</option>`).join("")}
    </select>
  </div>
  <div id="fb-sub-col">
    ${
      selEduType && selEduType.sub.length > 0
        ? `
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">세부유형</label>
    <select id="fb-edu-sub"
      style="width:100%;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
      <option value="">— 선택 —</option>
      ${selEduType.sub.map((s) => `<option value="${s}" ${eduSubVal === s ? "selected" : ""}>${s}</option>`).join("")}
    </select>`
        : "<div></div>"
    }
  </div>
</div>
<!-- 행 3: 양식명 + 설명 -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">양식명 *</label>
    <input id="fb-name" value="${nameVal}" type="text" placeholder="예) R&D 사외교육 신청서"
      style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:5px;color:#374151">설명</label>
    <input id="fb-desc" value="${descVal}" type="text" placeholder="이 양식의 용도"
      style="width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
  </div>
</div>

<!-- 입력 주체 범례 -->
<div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap">
  <span style="font-size:10px;font-weight:700;color:#374151">📌 필드 입력 주체:</span>
  <span style="font-size:10px;background:#F3F4F6;color:#374151;padding:2px 8px;border-radius:6px;border:1px solid #E5E7EB">🔓 프론트 공개 (학습자/담당자 입력)</span>
  <span style="font-size:10px;background:#FDF2F8;color:#9D174D;padding:2px 8px;border-radius:6px;border:1px solid #FBB6CE">🔒 백오피스 전용 (승인자만 입력)</span>
  <span style="font-size:10px;background:#EFF6FF;color:#0369A1;padding:2px 8px;border-radius:6px;border:1px solid #BFDBFE">⚙️ 시스템 자동</span>
</div>

<!-- 필드 빌더 영역 (2패널: 팔레트 40% / 선택 60%) -->
<div style="border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden">
  <div style="background:#F9FAFB;padding:10px 16px;border-bottom:1px solid #E5E7EB;font-size:13px;font-weight:800;color:#374151;display:flex;align-items:center;gap:6px">
    📋 입력 필드 구성 <span style="font-size:10px;color:#9CA3AF;font-weight:500">(클릭으로 추가, 드래그로 순서 변경)</span>
  </div>
  <div style="display:grid;grid-template-columns:2fr 3fr;min-height:320px">
    <!-- 좌: 필드 팔레트 -->
    <div style="padding:16px;border-right:1px solid #E5E7EB;overflow-y:auto;max-height:520px">
      <div style="font-size:10px;color:#6B7280;font-weight:800;margin-bottom:8px">사용 가능 필드 (카테고리별)</div>
      ${categories
        .map((cat) => {
          const catFields = allFields.filter((f) => f.category === cat);
          const catColor = cat.includes("승인")
            ? "#9D174D"
            : cat === "시스템"
              ? "#0369A1"
              : "#374151";
          return `<div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:900;color:${catColor};text-transform:uppercase;margin-bottom:6px;letter-spacing:.05em">${cat}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${catFields
              .map((f) => {
                const isSelected = _fbTempFields.some(
                  (tf) => (typeof tf === "object" ? tf.key : tf) === f.key,
                );
                const scopeStyle =
                  f.scope === "provide"
                    ? "border:1.5px dashed #93C5FD;color:#1D4ED8;background:#EFF6FF"
                    : f.scope === "back"
                      ? "border:1.5px dashed #FBB6CE;color:#9D174D;background:#FDF2F8"
                      : f.scope === "system"
                        ? "border:1.5px dashed #BFDBFE;color:#0369A1;background:#EFF6FF"
                        : "border:1.5px solid #E5E7EB;color:#374151;background:white";
                const layerBadge =
                  f.layer === "L2"
                    ? '<span style="font-size:7px;vertical-align:super;color:#D97706;font-weight:900">L2</span>'
                    : "";
                const selectBadge =
                  f.fieldType === "select" || f.fieldType === "multi_select"
                    ? '<span style="font-size:7px;vertical-align:super;color:#7C3AED">▼</span>'
                    : "";
                return `<span onclick="fbToggleField('${f.key}')" id="fbf-${f.key}"
                title="${f.hint || ""} ${f.budget ? "💰예산연동" : ""} ${f.fieldType === "select" ? "(셀렉트)" : ""} ${f.predecessors?.length ? "⚡선행:" + f.predecessors.join(",") : ""}"
                class="fb-field-chip ${isSelected ? "selected" : ""}"
                style="${scopeStyle};${isSelected ? "opacity:.45;text-decoration:line-through;" : ""}">
                ${f.icon} ${f.key}${f.required ? "<sup style=color:#EF4444>*</sup>" : ""}${layerBadge}${selectBadge}
                ${f.budget ? '<span style="font-size:7px;vertical-align:super;color:#D97706">💰</span>' : ""}
              </span>`;
              })
              .join("")}
          </div>
        </div>`;
        })
        .join("")}
    </div>
    <!-- 우: 선택된 필드 목록 -->
    <div style="padding:16px;overflow-y:auto;max-height:520px;background:#FAFAFA">
      <div style="font-size:11px;color:#6B7280;font-weight:800;margin-bottom:10px">
        선택된 필드 (${_fbTempFields.length}개) <span style="font-size:9px;font-weight:400;color:#9CA3AF">⠿ 드래그하여 순서 변경 | 필수/선택 토글</span>
      </div>
      <div id="fb-preview">${_fbPreviewHTML()}</div>
    </div>
  </div>
</div>
</div>`;
}

function _fbPreviewHTML() {
  if (!_fbTempFields.length)
    return '<div style="text-align:center;color:#D1D5DB;padding:40px;font-size:13px">← 왼쪽에서 필드를 클릭하여 추가</div>';
  const allFields = _fbAllFields();
  return _fbTempFields
    .map((f, i) => {
      const key = typeof f === "object" ? f.key : f;
      const scope = typeof f === "object" ? f.scope : "front";
      const isReq = typeof f === "object" ? f.required === true : false;
      const meta = allFields.find((a) => a.key === key) || { icon: "📝" };
      const scopeLabel =
        scope === "provide"
          ? "📢 BO제공"
          : scope === "back"
            ? "🔒 백오피스"
            : scope === "system"
              ? "⚙️ 시스템"
              : "🔓 프론트";
      const scopeColor =
        scope === "provide"
          ? "#1D4ED8"
          : scope === "back"
            ? "#9D174D"
            : scope === "system"
              ? "#0369A1"
              : "#374151";
      const reqColor = isReq ? "#DC2626" : "#9CA3AF";
      const reqLabel = isReq ? "필수" : "선택";
      const reqBg = isReq ? "#FEF2F2" : "#F9FAFB";
      const typeTag =
        meta.fieldType === "select" || meta.fieldType === "multi_select"
          ? `<span style="font-size:8px;color:#7C3AED;background:#F5F3FF;padding:1px 5px;border-radius:3px;margin-left:2px">▼${(meta.options || []).length}개</span>`
          : "";
      const layerTag =
        meta.layer === "L2"
          ? '<span style="font-size:8px;color:#D97706;background:#FFFBEB;padding:1px 5px;border-radius:3px;margin-left:2px">L2</span>'
          : "";
      const depTag = meta.predecessors?.length
        ? '<span style="font-size:8px;color:#059669;background:#ECFDF5;padding:1px 5px;border-radius:3px;margin-left:2px">⚡</span>'
        : "";
      return `<div draggable="true"
      ondragstart="_fbDragStart(${i},event)" ondragover="_fbDragOver(${i},event)" ondrop="_fbDrop(${i},event)" ondragend="_fbDragEnd()"
      style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:6px;border:1.5px solid #E5E7EB;cursor:grab;transition:all .15s;user-select:none"
      onmouseover="this.style.borderColor='#93C5FD'" onmouseout="this.style.borderColor='#E5E7EB'">
      <span style="color:#9CA3AF;font-size:14px;cursor:grab;line-height:1" title="드래그하여 순서 변경">⠿</span>
      <span style="color:#9CA3AF;font-weight:700;font-size:11px;min-width:18px">${i + 1}</span>
      <span style="font-size:13px;font-weight:700;flex:1;color:#111827">${meta.icon} ${key}${typeTag}${layerTag}${depTag}</span>
      <span onclick="event.stopPropagation();fbToggleRequired(${i})" style="font-size:9px;font-weight:800;color:${reqColor};background:${reqBg};padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap;border:1px solid ${reqColor}30" title="클릭하여 필수/선택 전환">${reqLabel}</span>
      <span style="font-size:9px;font-weight:700;color:${scopeColor};background:${scopeColor}15;padding:2px 8px;border-radius:5px;cursor:pointer;white-space:nowrap"
        onclick="event.stopPropagation();fbCycleScope(${i})" title="클릭하여 입력 주체 변경">${scopeLabel}</span>
      <span onclick="event.stopPropagation();fbRemoveField('${key}')" style="cursor:pointer;color:#EF4444;font-size:16px;line-height:1;font-weight:700" title="삭제">×</span>
    </div>`;
    })
    .join("");
}