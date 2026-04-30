// ─── GNB (Top Navigation) — LXP 프론트 오피스 ────────────────────────────────

// 페이지 새로고침 시 plansMode 상태 복원
if (typeof window !== 'undefined') {
  window.plansMode = sessionStorage.getItem('plansMode') || 'operation';
}

// 드롭다운 열림 상태
let _gnbDropdownOpen = null;
let _gnbListenerAttached = false;

// 외부 클릭 시 드롭다운 닫기 (최초 1회만 등록)
function initGNBListener() {
  if (_gnbListenerAttached) return;
  _gnbListenerAttached = true;
  document.addEventListener("click", function (e) {
    if (_gnbDropdownOpen && !e.target.closest("#gnb")) {
      _gnbDropdownOpen = null;
      renderGNB();
    }
  });
}

function renderGNB() {
  // 1depth 메뉴 정의: dropdown 포함 구조
  const topMenus = [
    {
      id: "growth",
      label: "성장",
      dropdown: [
        {
          id: "forecast",
          action: "window.plansMode='forecast';sessionStorage.setItem('plansMode', 'forecast');if(typeof _resetPlansCacheForModeSwitch==='function')_resetPlansCacheForModeSwitch();navigate('plans')",
          label: "사업계획 (수요예측)",
          icon: "📢",
          navigate: true,
          desc: "전사 사업계획 캠페인 및 목록",
        },
        {
          id: "plans",
          action: "window.plansMode='operation';sessionStorage.setItem('plansMode', 'operation');if(typeof _resetPlansCacheForModeSwitch==='function')_resetPlansCacheForModeSwitch();navigate('plans')",
          label: "운영계획 관리 (실행)",
          icon: "🛠",
          navigate: true,
          desc: "예산 집행을 위한 상시 운영계획",
        },
        {
          id: "apply",
          label: "교육신청",
          icon: "📝",
          navigate: true,
          desc: "개인직무·운영교육 신청",
        },
        {
          id: "result",
          label: "교육결과 등록",
          icon: "📄",
          navigate: true,
          desc: "교육 이수 후 결과 등록",
        },
        { divider: true },
        {
          id: "history-register",
          label: "교육이력등록",
          icon: "📚",
          navigate: false,
          desc: "수료·이수 이력 직접 등록",
          soon: true,
        },
        {
          id: "language-score",
          label: "어학점수",
          icon: "🌐",
          navigate: false,
          desc: "TOEIC·OPIC 등 어학점수 관리",
          soon: true,
        },
        {
          id: "certificate",
          label: "자격증",
          icon: "🏅",
          navigate: false,
          desc: "자격증·면허 취득 이력 관리",
          soon: true,
        },
      ],
    },
    // ── 결재 메뉴 ──────────────────────────────────────────────────────────
    {
      id: "approval",
      label: "결재",
      dropdown: (() => {
        // 리더 여부: pos에 팀장/실장/센터장/본부장/사업부장 포함 여부로 판단
        const _isLeader = ["팀장", "실장", "센터장", "본부장", "사업부장"].some(
          (t) => (currentPersona.pos || "").includes(t),
        );
        const items = [
          {
            id: "approval-member",
            label: "팀원용 결재함",
            icon: "📥",
            navigate: true,
            desc: "내가 신청한 교육의 결재 현황 확인",
          },
        ];
        if (_isLeader) {
          items.push({ divider: true });
          items.push({
            id: "approval-leader",
            label: "리더용 결재함",
            icon: "👔",
            navigate: true,
            desc: "팀원의 교육신청 결재 처리",
          });
        }
        return items;
      })(),
    },
    // ── 통합 결재 메뉴 (HMC, KIA 전용) ──────────────────────────────────────
    ...(currentPersona.tenantId === "HMC" || currentPersona.tenantId === "KIA"
      ? [
          {
            id: "integrated-approval",
            label: "통합 결재",
            dropdown: [
              {
                id: "approval-dept",
                label: "부서 결재함",
                icon: "🏢",
                navigate: false,
                desc: "부서의 통합 결재 현황 확인",
                soon: true,
              },
            ],
          },
        ]
      : []),
    { id: "fo-manual", label: "📖 매뉴얼", dropdown: null },
  ];

  // ── 회사→학습자 cascade 드롭다운 (DB employees 기반) ───────────────────────
  // _FO_EMPLOYEES: fo_persona_loader.js가 DB에서 로드 (없으면 PERSONAS mock 폴백)
  const _employees =
    typeof _FO_EMPLOYEES !== "undefined" && _FO_EMPLOYEES.length > 0
      ? _FO_EMPLOYEES
      : Object.entries(PERSONAS || {}).map(([key, p]) => ({
          id: key,
          tenant_id: p.tenantId,
          name: p.name,
          dept: p.dept,
          pos: p.pos,
          persona_key: key,
          is_active: true,
        }));

  // 테넌트 이름 맵: _FO_TENANT_MAP > PERSONAS > tenant_id 그대로
  const _tenantMap =
    typeof _FO_TENANT_MAP !== "undefined" ? _FO_TENANT_MAP : {};
  function _tenantLabel(tid) {
    if (_tenantMap[tid]) return _tenantMap[tid];
    const pm = Object.values(PERSONAS || {}).find((p) => p.tenantId === tid);
    return pm?.company || tid;
  }

  // 회사 목록 (중복 제거, 순서 유지)
  const _companyList = [...new Set(_employees.map((e) => e.tenant_id))].map(
    (tid) => ({ tenantId: tid, label: _tenantLabel(tid) }),
  );

  // 현재 선택된 회사
  const _currentTenantId = currentPersona.tenantId;

  // 현재 회사의 학습자 목록
  const _currentCompanyEmps = _employees.filter(
    (e) => e.tenant_id === _currentTenantId,
  );

  // 현재 선택된 학습자 키: sessionStorage 우선 (users.id or PERSONAS key 모두 처리)
  const _currentPersonaKey =
    sessionStorage.getItem("currentPersona") ||
    Object.keys(PERSONAS || {}).find((k) => PERSONAS[k] === currentPersona) ||
    "";

  const switcherHtml = `
<span style="font-size:10px;color:rgba(255,255,255,0.55);font-weight:700;white-space:nowrap">접속자:</span>
<div style="display:flex;align-items:center;gap:6px">
  <select id="gnb-company-select"
    onchange="gnbSwitchCompany(this.value)"
    style="height:30px;padding:0 28px 0 10px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.3);
           background:rgba(255,255,255,0.12);color:#fff;font-size:12px;font-weight:700;
           cursor:pointer;outline:none;appearance:none;
           background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M0 0l5 6 5-6z%22 fill=%22rgba(255,255,255,0.7)%22/></svg>');
           background-repeat:no-repeat;background-position:right 8px center">
    ${_companyList
      .map(
        (
          c,
        ) => `<option value="${c.tenantId}" ${c.tenantId === _currentTenantId ? "selected" : ""}
      style="background:#1E293B;color:#fff">${c.label}</option>`,
      )
      .join("")}
  </select>
  <select id="gnb-persona-select"
    onchange="switchPersonaTo(this.value)"
    style="height:30px;padding:0 28px 0 10px;border-radius:8px;border:1.5px solid rgba(255,255,255,0.4);
           background:rgba(255,255,255,0.18);color:#fff;font-size:12px;font-weight:800;
           cursor:pointer;outline:none;appearance:none;
           background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M0 0l5 6 5-6z%22 fill=%22rgba(255,255,255,0.7)%22/></svg>');
           background-repeat:no-repeat;background-position:right 8px center">
    ${
      _currentCompanyEmps.length === 0
        ? `<option style="background:#1E293B;color:#9CA3AF" disabled>학습자 없음</option>`
        : _currentCompanyEmps
            .map((e) => {
              const key = e.persona_key;
              // 조직명 · 이름 형식 (직위는 리더만 표시)
              const deptPart = e.dept ? `${e.dept} · ` : "";
              const posPart = e.is_leader && e.pos ? ` (${e.pos})` : "";
              const label = `${deptPart}${e.name}${posPart}`;
              const isSelected = key === _currentPersonaKey;
              // DB users는 동적으로 persona 빌드 가능 → disabled 없음
              return `<option value="${key || ""}" ${isSelected ? "selected" : ""}
            style="background:#1E293B;color:#fff">${label}</option>`;
            })
            .join("")
    }
  </select>
</div>`;

  // 1depth 활성 메뉴 판별 (드롭다운 자식 포함)
  function isMenuActive(menu) {
    if (!menu.dropdown) return currentPage === menu.id;
    return menu.dropdown.some((d) => {
      if (!d.id || !d.navigate) return false;
      if (currentPage === 'plans' && (d.id === 'forecast' || d.id === 'plans')) {
        const mode = typeof plansMode !== 'undefined' ? plansMode : 'operation';
        if (d.id === 'forecast') return mode === 'forecast';
        if (d.id === 'plans')    return mode !== 'forecast';
      }
      return currentPage === d.id;
    });
  }

  // 네비 HTML 생성
  const navHtml = topMenus
    .map((m) => {
      if (!m.dropdown) {
        // 단순 메뉴
        const active = currentPage === m.id;
        return `<div onclick="navigate('${m.id}');_gnbDropdownOpen=null;renderGNB()"
        style="display:flex;align-items:center;padding:0 14px;height:56px;font-size:13px;font-weight:600;cursor:pointer;
               border-bottom:2.5px solid ${active ? "#fff" : "transparent"};
               color:${active ? "#fff" : "rgba(255,255,255,0.7)"};transition:all .15s;white-space:nowrap">
        ${m.label}
      </div>`;
      }

      // 드롭다운 메뉴
      const active = isMenuActive(m);
      const isOpen = _gnbDropdownOpen === m.id;

      const dropdownItems = m.dropdown
        .map((d) => {
          if (d.divider)
            return `<div style="height:1px;background:#F3F4F6;margin:6px 0"></div>`;
          const isCurrent = (() => {
            if (!d.navigate) return false;
            if (currentPage !== d.id && !(d.id === 'forecast' && currentPage === 'plans') && !(d.id === 'plans' && currentPage === 'plans')) return false;
            // plans 페이지: plansMode로 구분
            if (currentPage === 'plans') {
              const mode = typeof plansMode !== 'undefined' ? plansMode : 'operation';
              if (d.id === 'forecast') return mode === 'forecast';
              if (d.id === 'plans')    return mode !== 'forecast';
            }
            return currentPage === d.id;
          })();
          if (!d.navigate) {
            // 미기획 항목 — 비활성 표시
            return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;opacity:0.5;cursor:default">
          <span style="font-size:18px;flex-shrink:0;margin-top:1px">${d.icon}</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#9CA3AF;display:flex;align-items:center;gap:6px">
              ${d.label}
              <span style="font-size:9px;font-weight:900;padding:1px 6px;border-radius:4px;background:#F3F4F6;color:#9CA3AF">준비 중</span>
            </div>
            <div style="font-size:11px;color:#D1D5DB;margin-top:1px">${d.desc}</div>
          </div>
        </div>`;
          }
          const clickAction = d.action || `navigate('${d.id}')`;
          return `<div onclick="${clickAction};_gnbDropdownOpen=null;renderGNB()"
        style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border-radius:8px;cursor:pointer;
               background:${isCurrent ? "#EFF6FF" : "transparent"};transition:all .12s"
        onmouseover="this.style.background='${isCurrent ? "#DBEAFE" : "#F9FAFB"}'"
        onmouseout="this.style.background='${isCurrent ? "#EFF6FF" : "transparent"}'">
        <span style="font-size:18px;flex-shrink:0;margin-top:1px">${d.icon}</span>
        <div>
          <div style="font-size:13px;font-weight:${isCurrent ? 900 : 700};color:${isCurrent ? "#1D4ED8" : "#111827"}">${d.label}</div>
          <div style="font-size:11px;color:#9CA3AF;margin-top:1px">${d.desc}</div>
        </div>
      </div>`;
        })
        .join("");

      return `<div style="position:relative;display:flex;align-items:center">
      <div
        style="display:flex;align-items:center;gap:5px;padding:0 14px;height:56px;font-size:13px;font-weight:700;cursor:pointer;
               border-bottom:2.5px solid ${active || isOpen ? "#fff" : "transparent"};
               color:${active || isOpen ? "#fff" : "rgba(255,255,255,0.7)"};transition:all .15s;white-space:nowrap;user-select:none"
        onclick="event.stopPropagation();_gnbDropdownOpen=_gnbDropdownOpen==='${m.id}'?null:'${m.id}';renderGNB()">
        ${m.label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="transition:transform .2s;transform:${isOpen ? "rotate(180deg)" : "rotate(0)"}">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${
        isOpen
          ? `
      <div style="position:absolute;top:56px;left:0;min-width:260px;background:white;border-radius:14px;
                  box-shadow:0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.08);
                  border:1px solid #E5E7EB;padding:8px;z-index:1000">
        ${dropdownItems}
      </div>`
          : ""
      }
    </div>`;
    })
    .join("");

  initGNBListener();

  // 데모 배너 (DEMO_MODE가 true일 때만)
  const demoBanner =
    typeof DEMO_MODE !== "undefined" && DEMO_MODE
      ? `
  <div style="background:linear-gradient(90deg,#D97706,#F59E0B);color:#fff;text-align:center;padding:3px 0;font-size:10px;font-weight:800;letter-spacing:.05em">
    ⚠️ 데모 환경 — Persona 자유 전환 가능 | 운영 배포 시 비활성화됩니다
  </div>`
      : "";

  document.getElementById("gnb").innerHTML = `
${demoBanner}
<div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:56px">
  <div style="display:flex;align-items:center;gap:12px">
    <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="navigate('dashboard');_gnbDropdownOpen=null;renderGNB()">
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:6px">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
        </svg>
      </div>
      <span style="font-weight:900;font-size:16px;letter-spacing:-.02em">Next Learning</span>
    </div>
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2)"></div>
    <nav style="display:flex;height:56px;align-items:center">
      ${navHtml}
    </nav>
  </div>

  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
    <!-- 회사 → 학습자 cascade 선택 -->
    ${switcherHtml}
    <div style="width:1px;height:20px;background:rgba(255,255,255,0.2);margin:0 4px"></div>
    <!-- 백오피스 이동 버튼 -->
    <a href="backoffice.html"
      style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);color:#fff;text-decoration:none;border-radius:8px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap"
      onmouseover="this.style.background='rgba(255,255,255,0.25)'"
      onmouseout="this.style.background='rgba(255,255,255,0.12)'"
      title="백오피스 관리자 화면으로 이동">
      ⚙️ 백오피스
    </a>
  </div>
</div>

`;
}

// 회사 변경 시 해당 회사 첫 번째 학습자로 전환 + 즉시 학습자 select 업데이트
function gnbSwitchCompany(tenantId) {
  const emps =
    typeof _FO_EMPLOYEES !== "undefined" && _FO_EMPLOYEES.length > 0
      ? _FO_EMPLOYEES
      : Object.entries(PERSONAS || {}).map(([key, p]) => ({
          tenant_id: p.tenantId,
          persona_key: key,
        }));

  // 해당 회사 직원 목록으로 즉시 persona select 업데이트
  const tenantEmps = emps.filter(
    (e) => e.tenant_id === tenantId && e.persona_key,
  );
  const personaSelect = document.getElementById("gnb-persona-select");
  if (personaSelect && tenantEmps.length > 0) {
    const tenantMap =
      typeof _FO_TENANT_MAP !== "undefined" ? _FO_TENANT_MAP : {};
    personaSelect.innerHTML = tenantEmps
      .map((e) => {
        const deptPart = e.dept ? `${e.dept} · ` : "";
        const posPart = e.is_leader && e.pos ? ` (${e.pos})` : "";
        return `<option value="${e.persona_key}" style="background:#1E293B;color:#fff">${deptPart}${e.name}${posPart}</option>`;
      })
      .join("");
  } else if (personaSelect) {
    personaSelect.innerHTML = `<option style="background:#1E293B;color:#9CA3AF" disabled>학습자 없음</option>`;
  }

  // 첫 번째 학습자로 전환
  const firstEmp = tenantEmps[0];
  if (firstEmp?.persona_key) {
    switchPersonaTo(firstEmp.persona_key);
  }
}

// 페르소나 전환 함수 (LXP 전용) — DB 기반 로더 사용
// ※ PERSONAS[key] 체크 제거: DB users.id(P402, USR-xxx)는 PERSONAS에 없으므로 skip되면 안 됨
function switchPersonaTo(key) {
  if (!key) return;
  if (typeof switchPersonaAndReload === "function") {
    switchPersonaAndReload(key); // fo_persona_loader.js: DB users.id 또는 PERSONAS key 모두 처리
  } else {
    // fallback: DB 로더 없으면 기존 방식
    sessionStorage.setItem("currentPersona", key);
    window.location.reload();
  }
}

// 레거시 switchPersona 호환 유지
function switchPersona() {
  const keys = Object.keys(PERSONAS);
  const currentKey =
    Object.keys(PERSONAS).find((k) => PERSONAS[k] === currentPersona) ||
    keys[0];
  const idx = keys.indexOf(currentKey);
  const nextKey = keys[(idx + 1) % keys.length];
  sessionStorage.setItem("currentPersona", nextKey);
  window.location.reload();
}

// ─── FLOATING BUDGET WIDGET ─────────────────────────────────────────────────

function renderFloatingBudget() {
  // 사용자의 요청으로 내 예산 잔액 플로팅 위젯 전체 주석 처리
  const el = document.getElementById("floating-budget");
  if (el) {
    el.style.display = "none";
  }
  return;
  /*
  const budgets = currentPersona.budgets || [];
  const totalUsed = budgets.reduce((s, b) => s + b.used, 0);
  const totalBalance = budgets.reduce((s, b) => s + b.balance, 0);
  const pct =
    totalBalance > 0
      ? Math.min((totalUsed / totalBalance) * 100, 100).toFixed(0)
      : 0;
  const noBudget = budgets.length === 0;
  const allZero = budgets.length > 0 && totalBalance === 0;

  document.getElementById("floating-budget").innerHTML = \`
<div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
  <span class="w-2 h-2 bg-accent rounded-full inline-block"></span> 내 예산 잔액
</div>
\${noBudget ? \`
  <div style="font-size:11px;color:#9CA3AF;font-weight:600;padding:6px 0">예산 계정이 없습니다</div>
\` : allZero ? \`
  <div class="text-2xl font-black text-gray-400 mb-1">0<span class="text-sm text-gray-400 font-normal ml-1">원</span></div>
  <div style="font-size:10px;color:#F59E0B;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:4px">
    <span>⏳</span> 예산 배정 대기 중
  </div>
\` : \`
  <div class="text-2xl font-black text-brand mb-2">\${fmt(totalBalance - totalUsed)}<span class="text-sm text-gray-400 font-normal ml-1">원</span></div>
  <div class="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
    <div class="h-full bg-accent rounded-full transition-all" style="width:\${pct}%"></div>
  </div>
  <div class="text-[10px] text-gray-400 mb-3">\${fmt(totalUsed)}원 집행 / \${fmt(totalBalance)}원 총 예산</div>
\`}
<div class="space-y-1.5 pt-2 border-t border-gray-100">
  \${budgets
    .map((b) => {
      const isShared = b.bankbookMode === "shared";
      const isUnallocated = b.balance === 0;
      const label = isShared
        ? \`\${b.parentOrgName || "상위조직"} 공유 통장\`
        : b.name;
      const sharedTag = isShared
        ? \`<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#FEF3C7;color:#D97706;font-weight:900;margin-left:4px">공유</span>\`
        : "";
      const unallocTag = isUnallocated
        ? \`<span style="font-size:8px;padding:1px 5px;border-radius:4px;background:#F3F4F6;color:#9CA3AF;font-weight:900;margin-left:3px">미배정</span>\`
        : "";
      return \`
  <div class="flex justify-between text-[11px] items-center">
    <span class="text-gray-500 truncate mr-2">\${label}\${sharedTag}\${unallocTag}</span>
    <span class="font-black \${b.account === "연구투자" ? "text-orange-500" : isUnallocated ? "text-gray-300" : "text-accent"}">\${fmt(b.balance - b.used)}원</span>
  </div>\`;
    })
    .join("")}
</div>\`;
  */
}
