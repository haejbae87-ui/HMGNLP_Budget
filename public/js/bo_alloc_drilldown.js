// ─── 예산 배분 통합 드릴다운 엔진 v2 (프리미엄 UI) ────────────────────────────
// 의존: bo_allocation.js (_ddLevel, _ddAbId, _ddOrgId, _ddOrgName, _allocYear)
//       ACCOUNT_BUDGETS, TEAM_DIST, VIRTUAL_EDU_ORGS, ACCOUNT_MASTER
//       boFmt(), getDistributable(), getPersonaAccountBudgets(), boCurrentPersona

// ── (제거됨) 최초 예산 할당 탭 → 예산계정 마스터로 완전 이전 ─────────────────
// renderInitialAlloc() 함수 삭제: 기초/추가 배정 기능은 bo_budget_master.js에서 관리

// ── 탭: 예산 배분 진입점 ────────────────────────────────────────────────────
function renderBudgetDistribution() {
  if (_ddLevel === 2) return _renderDDLevel2Individual(); // P2: individual policy
  if (_ddLevel === 1) return _renderDDLevel1();
  return _renderDDLevel0();
}

// P2: bankbook creation policy helper
// mode: 'bulk' = org only | 'team' = team drilldown | 'individual' = direct to person
function _getDDPolicy(ab) {
  if (!ab) return { bankbook_mode: 'team' };
  const cache = window._baPolicyCache || {};
  const policy = cache[ab.accountCode];
  if (policy) return policy;
  const m = ab.bankbook_mode || 'team';
  return { bankbook_mode: m === 'individual' ? 'individual' : (m === 'bulk' ? 'bulk' : 'team') };
}

// ── 내비게이션 ────────────────────────────────────────────────────────────────
function ddNavTo(level, abId, orgId, orgName) {
  _ddLevel = level;
  if (abId !== null) _ddAbId = abId;
  if (orgId !== null) _ddOrgId = orgId;
  if (orgName !== null) _ddOrgName = orgName;
  document.getElementById('alloc-content').innerHTML = renderBudgetDistribution();
}

function ddSelectAccount(abId) {
  _ddAbId = abId;
  document.getElementById('alloc-content').innerHTML = _renderDDLevel0();
}

// ── 브레드크럼 ────────────────────────────────────────────────────────────────
function _ddBreadcrumb(ab, extra) {
  const acctName = ab ? (ACCOUNT_MASTER.find(a => a.code === ab.accountCode)?.name || ab.accountCode) : null;
  const base = `<span style="font-size:18px;margin-right:4px">🏛️</span>
    <button onclick="ddNavTo(0,'${_ddAbId}',null,null)"
      style="background:none;border:none;cursor:pointer;color:#059669;font-size:13px;font-weight:700;padding:0">
      예산 배분
    </button>`;
  if (_ddLevel === 0 || !acctName) {
    return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;font-size:13px;font-weight:700">${base}</div>`;
  }
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:20px;font-size:13px;font-weight:700">
    ${base}
    <span style="color:#D1D5DB;font-size:16px">›</span>
    <span style="color:#374151">${acctName}</span>
    ${extra ? `<span style="color:#D1D5DB;font-size:16px">›</span><span style="background:#EDE9FE;color:#5B21B6;padding:3px 10px;border-radius:8px;font-size:12px">${extra}</span>` : ''}
  </div>`;
}

// ── Level 0: Master Bankbook Dashboard ────────────────────────────────────────
function _renderDDLevel0() {
  if (typeof _allocFilterAccountCode === 'undefined' || !_allocFilterAccountCode) {
    return `
      <div style="padding:60px 20px;text-align:center;color:#6B7280;background:white;border-radius:12px;border:1.5px dashed #E5E7EB;margin-top:16px">
        <div style="font-size:40px;margin-bottom:12px">🎯</div>
        <div style="font-size:16px;font-weight:800;color:#374151;margin-bottom:8px">예산 계정을 선택해주세요</div>
        <div style="font-size:13px">상단 데이터 범위 필터에서 조회를 원하는 <b>예산 계정</b>을 선택해야 예산 배분을 진행할 수 있습니다.</div>
      </div>
    `;
  }
  const persona = boCurrentPersona;
  let myBudgets = getPersonaAccountBudgets(persona);
  
  // 상단 필터 연동 (테넌트, 연도, 계정코드)
  if (typeof _allocFilterTenant !== 'undefined' && _allocFilterTenant) {
    myBudgets = myBudgets.filter(b => b.tenantId === _allocFilterTenant);
  }
  if (typeof _allocYear !== 'undefined' && _allocYear) {
    myBudgets = myBudgets.filter(b => b.fiscalYear === _allocYear);
  }
  if (typeof _allocFilterAccountCode !== 'undefined' && _allocFilterAccountCode) {
    myBudgets = myBudgets.filter(b => b.accountCode === _allocFilterAccountCode);
  }
  if (!_ddAbId || !myBudgets.find(b => b.id === _ddAbId)) {
    _ddAbId = myBudgets[0]?.id || null;
  }
  const ab = _ddAbId ? ACCOUNT_BUDGETS.find(x => x.id === _ddAbId) : null;

  // 계정 선택 탭 (상단)
  const acctTabs = myBudgets.map(b => {
    const a = ACCOUNT_MASTER.find(x => x.code === b.accountCode);
    const isSel = b.id === _ddAbId;
    const distrib = getDistributable(b);
    const isSAP = b.sourceType === 'sap_if';
    return `<button onclick="ddSelectAccount('${b.id}')" style="
      padding:10px 16px;border-radius:10px;cursor:pointer;text-align:left;
      border:2px solid ${isSel ? '#059669' : '#E5E7EB'};
      background:${isSel ? '#F0FDF4' : 'white'};
      box-shadow:${isSel ? '0 0 0 3px #BBF7D0' : 'none'};min-width:140px">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
        <code style="font-size:9px;font-weight:900;padding:1px 5px;border-radius:4px;
          background:${isSAP ? '#DBEAFE' : '#FFEDD5'};color:${isSAP ? '#1E40AF' : '#9A3412'}">${b.accountCode}</code>
        ${isSel ? '<span style="color:#059669;font-size:12px">✓</span>' : ''}
      </div>
      <div style="font-size:12px;font-weight:800;color:${isSel ? '#059669' : '#374151'}">${a?.name || b.accountCode}</div>
      <div style="font-size:10px;color:${distrib > 0 ? '#059669' : '#9CA3AF'};margin-top:1px">
        ${distrib > 0 ? '📦 ' + boFmt(distrib) + '원' : '완전 배분'}
      </div>
    </button>`;
  }).join('');

  if (!ab) return `<div>
    ${_ddBreadcrumb(null)}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">${acctTabs}</div>
    <div style="padding:60px;text-align:center;color:#9CA3AF;font-size:14px">계정을 선택하세요.</div>
  </div>`;

  const acct = ACCOUNT_MASTER.find(a => a.code === ab.accountCode);
  const totalBudget = ab.baseAmount + ab.totalAdded;
  const allDist = TEAM_DIST.filter(t => t.accountBudgetId === ab.id).reduce((s, t) => s + t.allocAmount, 0);
  const distributable = getDistributable(ab);
  const burnPct = totalBudget > 0 ? Math.min((allDist / totalBudget) * 100, 100) : 0;
  const isSAP = ab.sourceType === 'sap_if';
  const isRnd = ab.accountCode.includes('RND');
  // 수정: (1) ab.templateId 우선, (2) 필터에서 선택된 _allocFilterTplId 보조 fallback (타이밍 문제 방어)
  // (3) tenantId + 비어있지 않은 tree 기반 마지막 fallback
  const _tplIdToUse = ab.templateId || (typeof _allocFilterTplId !== 'undefined' ? _allocFilterTplId : null);
  const tpl = (_tplIdToUse ? VIRTUAL_EDU_ORGS.find(t => t.id === _tplIdToUse) : null)
    || VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (t.tree?.hqs?.length > 0 || t.tree?.centers?.length > 0));
  const vGroups = tpl ? (tpl.tree?.hqs || tpl.tree?.centers || []) : [];
  // 디버그: 테널릿 매칭 결과 로깅
  if (window._ddDebug) console.log('[DDLevel0] tplIdToUse:', _tplIdToUse, '| tpl:', tpl?.id, '| vGroups:', vGroups.length);

  // 교육조직 테이블 행
  let tableRows = '';
  let inputIdx = 0;
  const allRows = [];

  if (vGroups.length === 0) {
    tableRows = `<tr><td colspan="6" style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px">
      교육조직이 설정되지 않았습니다. 가상조직 관리에서 교육조직을 추가하세요.
    </td></tr>`;
  } else {
    vGroups.forEach(vg => {
      const inputId = `dd0-input-${inputIdx++}`;
      // VOrg 자신 및 산하 모든 팀의 이름을 수집하여 합산 (대시보드와 정합성 일치)
      const validNames = [vg.name, vg.name + '_IND'];
      if (vg.teams) {
        vg.teams.forEach(t => {
          const tName = typeof t === 'object' ? t.name : t;
          validNames.push(tName);
          validNames.push(tName + '_IND');
        });
      }
      
      const existings = TEAM_DIST.filter(t => t.accountBudgetId === ab.id && validNames.includes(t.teamName));
      // 입력창과 연결되는 기존 직접 배분 데이터는 VOrg 직접 매칭분만 유지
      const directExistings = TEAM_DIST.filter(t => t.accountBudgetId === ab.id && t.teamName === vg.name);
      const existing = directExistings.length > 0 ? directExistings[0] : null; 
      
      const currentAlloc = existings.reduce((s, t) => s + (t.allocAmount || 0), 0);
      const orgSpent = existings.reduce((s, t) => s + (t.spent || 0), 0);
      const orgReserved = existings.reduce((s, t) => s + (t.reserved || 0), 0);
      const orgBurnPct = currentAlloc > 0 ? Math.min(((orgSpent + orgReserved) / currentAlloc) * 100, 100) : 0;
      const orgBurnColor = orgBurnPct >= 90 ? '#EF4444' : orgBurnPct >= 70 ? '#F59E0B' : '#059669';
      allRows.push({ name: vg.name, inputId, existing, currentAlloc, vgId: vg.id });
      tableRows += `<tr style="border-bottom:1px solid #F3F4F6;transition:background .15s" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
        <td style="padding:14px 16px">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;background:${isRnd ? '#EDE9FE' : '#EFF6FF'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${isRnd ? '🔬' : '🏢'}</div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#111">${vg.name}</div>
              <div style="font-size:11px;color:#9CA3AF">${(vg.teams || []).length}개 팀 · ${(vg.managers && vg.managers.length > 0) ? vg.managers.map(m => typeof m === 'object' ? m.name : m).join(', ') : '담당자 미지정'}</div>
            </div>
          </div>
        </td>
        <td style="text-align:right;padding:14px 16px;font-size:13px;font-weight:700;color:${currentAlloc > 0 ? '#1D4ED8' : '#9CA3AF'}">
          ${currentAlloc > 0 ? boFmt(currentAlloc) + '원' : '—'}
        </td>
        <td style="padding:10px 12px">
          <div style="position:relative">
            <input type="number" id="${inputId}" placeholder="0" oninput="calcDDRemain()" min="0"
              style="width:130px;border:1.5px solid #E5E7EB;border-radius:8px;
                     padding:9px 32px 9px 12px;font-size:13px;font-weight:700;text-align:right;
                     background:#FAFAFA;transition:border-color .2s"
              onfocus="this.style.borderColor='#059669';this.style.background='white'"
              onblur="this.style.borderColor='#E5E7EB';this.style.background='#FAFAFA'"/>
            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF;font-weight:600">원</span>
          </div>
        </td>
        <td style="padding:14px 12px;font-size:12px;color:#059669;font-weight:700;white-space:nowrap" id="${inputId}-preview"></td>
        <td style="padding:14px 16px;text-align:center;min-width:110px">
          ${currentAlloc > 0 ? `
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:5px;background:#F3F4F6;border-radius:99px;overflow:hidden">
              <div style="height:100%;background:${orgBurnColor};width:${orgBurnPct.toFixed(0)}%;border-radius:99px"></div>
            </div>
            <span style="font-size:11px;font-weight:800;color:${orgBurnColor};white-space:nowrap">${orgBurnPct.toFixed(0)}%</span>
          </div>` : '<span style="font-size:11px;color:#D1D5DB">—</span>'}
        </td>
        <td style="padding:10px 16px;text-align:center">
          ${(() => {
            const pol = _getDDPolicy(ab);
            const mode = pol?.bankbook_mode || pol?.bankbook_level || 'team';

            if (mode === 'bulk') {
              // bulk: 교육조직까지만 배분, 드릴다운 없음
              return `<span style="font-size:10px;padding:3px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;font-weight:700">🏦 교육조직 통장</span>`;
            } else if (mode === 'individual') {
              // individual: 교육조직 → 개인 직접
              return `<button onclick="ddNavTo(2,'${ab.id}','${vg.id}','${vg.name}')"
                style="padding:7px 14px;background:white;color:#7C3AED;border:1.5px solid #7C3AED;
                       border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
                       transition:all .15s;white-space:nowrap"
                onmouseover="this.style.background='#7C3AED';this.style.color='white'"
                onmouseout="this.style.background='white';this.style.color='#7C3AED'">
                → 개인배분
              </button>`;
            } else {
              // team (기본): 팀 드릴다운
              return `<button onclick="ddNavTo(1,'${ab.id}','${vg.id}','${vg.name}')"
                style="padding:7px 14px;background:white;color:#059669;border:1.5px solid #059669;
                       border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;
                       transition:all .15s;white-space:nowrap"
                onmouseover="this.style.background='#059669';this.style.color='white'"
                onmouseout="this.style.background='white';this.style.color='#059669'">
                → 드릴다운
              </button>`;
            }
          })()}
        </td>
      </tr>`;
    });
  }

  const html_l0 = `<div>
  ${_ddBreadcrumb(ab)}
  <!-- 계정 선택 탭 -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">${acctTabs}</div>

  <!-- Master Bankbook Dashboard 카드 -->
  <div style="background:linear-gradient(135deg,#1E3A5F 0%,#0F2744 60%,#0A1E36 100%);
              border-radius:16px;padding:24px 28px;margin-bottom:20px;color:white;
              box-shadow:0 8px 32px rgba(15,39,68,.35)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <span style="font-size:22px">🏛️</span>
      <div>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.5);letter-spacing:.1em;text-transform:uppercase">Master Bankbook Dashboard</div>
        <div style="font-size:18px;font-weight:900;color:white">${acct?.name || ab.accountCode}</div>
      </div>
      <div style="margin-left:auto">
        <span style="padding:4px 10px;border-radius:8px;font-size:10px;font-weight:800;
          background:${isSAP ? 'rgba(59,130,246,.3)' : 'rgba(245,158,11,.3)'};
          color:${isSAP ? '#93C5FD' : '#FCD34D'}">
          ${isSAP ? '🔗 SAP I/F' : '✏️ 자체관리'}
        </span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:20px">
      <div style="background:rgba(255,255,255,.07);border-radius:12px;padding:14px 16px">
        <div style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700;margin-bottom:4px">계정 코드</div>
        <div style="font-size:15px;font-weight:900;color:white">${ab.accountCode}</div>
      </div>
      <div style="background:rgba(255,255,255,.07);border-radius:12px;padding:14px 16px">
        <div style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700;margin-bottom:4px">총 배정예산</div>
        <div style="font-size:15px;font-weight:900;color:#60A5FA">${boFmt(totalBudget)}원</div>
      </div>
      <div style="background:rgba(255,255,255,.07);border-radius:12px;padding:14px 16px">
        <div style="font-size:10px;color:rgba(255,255,255,.5);font-weight:700;margin-bottom:4px">배분 가능 예산</div>
        <div style="font-size:15px;font-weight:900;color:${distributable > 0 ? '#34D399' : '#F87171'}">${boFmt(distributable)}원</div>
      </div>
    </div>
    <!-- 배분 현황 바 -->
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:11px;color:rgba(255,255,255,.6)">
        <span>이미 배분된 금액: <b style="color:white">${boFmt(allDist)}원</b></span>
        <span style="font-weight:800;color:${burnPct >= 90 ? '#F87171' : '#34D399'}">${burnPct.toFixed(0)}%</span>
      </div>
      <div style="height:10px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden">
        <div style="height:100%;background:linear-gradient(90deg,#34D399,#059669);
                    width:${burnPct.toFixed(0)}%;border-radius:99px;transition:width .5s ease"></div>
      </div>
    </div>
  </div>

  <!-- 교육조직별 배분 테이블 -->
  <div style="background:white;border-radius:16px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
    <div style="padding:16px 20px;border-bottom:1.5px solid #F3F4F6;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">🏦</span>
      <div>
        <div style="font-size:14px;font-weight:900;color:#111">교육조직별 배분</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:1px">각 교육조직에 추가 배분할 금액을 입력하세요</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">교육조직</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">현재 배정</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">추가 배분</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">배분 후</th>
          <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">소진율</th>
          <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">드릴다운</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <!-- 하단 마스터 잔액 상태바 -->
  <div id="dd-bottom-bar" style="padding:14px 20px;background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;margin-bottom:16px;
       display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;font-weight:700;color:#065F46">
    <span>📊 마스터 잔액: <b>${boFmt(distributable)}원</b></span>
    <span style="color:#9CA3AF">→</span>
    <span>배분 후 잔액: <b id="dd-remain-disp">${boFmt(distributable)}원</b></span>
    <span style="color:#9CA3AF;font-size:12px">(배분 중: <span id="dd-input-disp" style="color:#374151">0원</span>)</span>
  </div>

  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 16px;font-size:12px;color:#92400E;margin-bottom:12px">
    ⚠️ 입력 합계가 배분 가능 재원을 초과할 수 없습니다. 배분 확정 후 수정 시 회수 기능을 이용하세요.
  </div>
  ${(typeof boIsOpManager === 'function' && boIsOpManager())
    ? `<div style="padding:16px;background:#FEF2F2;border:2px solid #FECACA;border-radius:12px;text-align:center">
        <div style="font-size:14px;font-weight:900;color:#DC2626;margin-bottom:4px">🔒 교육조직 총액 변경 불가</div>
        <div style="font-size:12px;color:#991B1B">운영담당자는 교육조직 총액을 변경할 수 없습니다. 위 테이블에서 관할 교육조직으로 드릴다운하여 팀 간 재배분을 진행하세요.</div>
      </div>`
    : `<button onclick="_showDistConfirmModal()" class="bo-btn-primary"
        style="width:100%;padding:16px;font-size:14px;font-weight:800;border-radius:12px;
               display:flex;align-items:center;justify-content:center;gap:8px">
        📋 배분 내역 확인 및 이관 확정
      </button>`
  }
</div>
`;
  // Bug1 Fix: innerHTML <script> 미실행 방지 → return 직전 직접 할당
  window._ddRows = allRows;
  window._ddAbId = ab.id;
  window._ddMaxAmount = distributable;
  window._ddCurrentLevel = 0;
  return html_l0;
}

// ── Level 1: Organization Bankbook + 팀별 배분 ───────────────────────────────
function _renderDDLevel1() {
  const persona = boCurrentPersona;
  const ab = _ddAbId ? ACCOUNT_BUDGETS.find(x => x.id === _ddAbId) : null;
  if (!ab) return '<div style="padding:40px;text-align:center;color:#9CA3AF">계정 정보를 찾을 수 없습니다.</div>';
  const isRnd = ab.accountCode.includes('RND');
  // 수정: (1) ab.templateId 우선, (2) _allocFilterTplId 보조 fallback
  const _tplIdToUse2 = ab.templateId || (typeof _allocFilterTplId !== 'undefined' ? _allocFilterTplId : null);
  const tpl = (_tplIdToUse2 ? VIRTUAL_EDU_ORGS.find(t => t.id === _tplIdToUse2) : null)
    || VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (t.tree?.hqs?.length > 0 || t.tree?.centers?.length > 0));
  const vGroups = tpl ? (tpl.tree?.hqs || tpl.tree?.centers || []) : [];
  // Bug2 Fix: vg ID 타입 불일치 방어 - String() 변환 + name fallback
  const vg = vGroups.find(g => String(g.id) === String(_ddOrgId))
    || vGroups.find(g => g.name === _ddOrgName);
  if (!vg) {
    console.warn('[DD Level1] vg 조회 실패: _ddOrgId=', _ddOrgId, '_ddOrgName=', _ddOrgName, 'vGroups:', vGroups.map(g=>g.id+'/'+g.name));
    return '<div style="padding:40px;text-align:center;color:#9CA3AF">교육조직 정보를 찾을 수 없습니다. (vg ID 불일치 — console 확인)</div>';
  }

  const teams = vg.teams || [];
  const orgTds = TEAM_DIST.filter(t => t.accountBudgetId === ab.id && t.teamName === vg.name);
  const orgAlloc = orgTds.reduce((s, t) => s + (t.allocAmount || 0), 0);
  const orgSpent = orgTds.reduce((s, t) => s + (t.spent || 0), 0);
  const orgReserved = orgTds.reduce((s, t) => s + (t.reserved || 0), 0);
  const orgBurnPct = orgAlloc > 0 ? Math.min(((orgSpent + orgReserved) / orgAlloc) * 100, 100) : 0;
  const orgBurnColor = orgBurnPct >= 90 ? '#EF4444' : orgBurnPct >= 70 ? '#F59E0B' : '#10B981';
  const teamsAllocated = teams.reduce((s, rt) => {
    const tds = TEAM_DIST.filter(t => t.accountBudgetId === ab.id && t.teamName === rt.name);
    return s + tds.reduce((ss, tt) => ss + (tt.allocAmount || 0), 0);
  }, 0);
  const teamDistributable = Math.max(0, orgAlloc - teamsAllocated);

  // 팀 행
  let tableRows = '';
  let inputIdx = 0;
  const allRows = [];
  teams.forEach(rt => {
    const inputId = `dd1-input-${inputIdx++}`;
    const existings = TEAM_DIST.filter(t => t.accountBudgetId === ab.id && t.teamName === rt.name);
    const existing = existings.length > 0 ? existings[0] : null;
    const currentAlloc = existings.reduce((s, t) => s + (t.allocAmount || 0), 0);
    const reserved = existings.reduce((s, t) => s + (t.reserved || 0), 0);
    const spent = existings.reduce((s, t) => s + (t.spent || 0), 0);
    const avail = currentAlloc - reserved - spent;
    allRows.push({ name: rt.name, inputId, existing, currentAlloc });
    tableRows += `<tr style="border-bottom:1px solid #F3F4F6;transition:background .15s" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
      <td style="padding:12px 16px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="color:#CBD5E1;font-size:13px;font-weight:900">└─</span>
          <div>
            <div style="font-size:13px;font-weight:800;color:#374151">${rt.name}</div>
            <div style="font-size:10px;color:#9CA3AF">실제팀</div>
          </div>
        </div>
      </td>
      <td style="text-align:right;padding:12px 16px;font-size:13px;font-weight:700;color:${currentAlloc > 0 ? '#1D4ED8' : '#9CA3AF'}">
        ${currentAlloc > 0 ? boFmt(currentAlloc) + '원' : '—'}
      </td>
      <td style="padding:8px 10px">
        <div style="position:relative">
          <input type="number" id="${inputId}" placeholder="0" oninput="calcDDRemain()" min="0"
            style="width:120px;border:1.5px solid #E5E7EB;border-radius:8px;
                   padding:8px 28px 8px 10px;font-size:13px;font-weight:800;text-align:right;
                   background:#FFFBEB;transition:all .2s"
            onfocus="this.style.borderColor='#F59E0B';this.style.background='#FFFBEB';this.style.boxShadow='0 0 0 3px #FDE68A'"
            onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none'"/>
          <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:#9CA3AF;font-weight:600">원</span>
        </div>
      </td>
      <td style="padding:12px 10px;font-size:12px;color:#059669;font-weight:700;white-space:nowrap" id="${inputId}-preview"></td>
      <td style="text-align:right;padding:12px 16px;font-size:12px;color:#B45309;font-weight:600">${reserved > 0 ? boFmt(reserved) : '—'}</td>
      <td style="text-align:right;padding:12px 16px;font-size:12px;color:#EF4444;font-weight:600">${spent > 0 ? boFmt(spent) : '—'}</td>
      <td style="text-align:right;padding:12px 16px;font-size:12px;font-weight:800;color:${avail > 0 ? '#059669' : avail < 0 ? '#EF4444' : '#9CA3AF'}">
        ${currentAlloc > 0 ? boFmt(avail) : '—'}
      </td>
      <td style="padding:8px 12px;text-align:center">
        ${currentAlloc > 0
          ? `<button onclick="_showRecallModal('${ab.id}','${vg.id}','${rt.name}')"
              style="padding:5px 10px;background:#FEE2E2;color:#DC2626;border:1.5px solid #FECACA;
                     border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;
                     transition:all .15s"
              onmouseover="this.style.background='#DC2626';this.style.color='white'"
              onmouseout="this.style.background='#FEE2E2';this.style.color='#DC2626'">
              ↩ 회수
            </button>`
          : '<span style="font-size:10px;color:#D1D5DB">—</span>'}
      </td>
    </tr>`;
  });
  if (!teams.length) tableRows = `<tr><td colspan="8" style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px">이 교육조직에 등록된 팀이 없습니다.</td></tr>`;

  // 3색 세그먼트 워터폴 바 계산
  const totalBarWidth = orgAlloc > 0 ? orgAlloc : 1;
  const distributedPct = Math.min((teamsAllocated / totalBarWidth) * 100, 100);
  const inputPct = 0; // 초기 0, calcDDRemain으로 동적 업데이트
  const remainPct = Math.max(0, 100 - distributedPct - inputPct);

  const html_l1 = `<div>
  ${_ddBreadcrumb(ab, vg.name)}

  <!-- Organization Bankbook 카드 -->
  <div style="background:linear-gradient(135deg,#059669,#047857);border-radius:16px;padding:22px 24px;margin-bottom:20px;color:white;box-shadow:0 8px 24px rgba(5,150,105,.3)">
    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px">Organization Bankbook</div>
    <div style="font-size:20px;font-weight:900;margin-bottom:16px">${vg.name}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:rgba(255,255,255,.6);margin-bottom:4px">배정 받은 예산</div>
        <div style="font-size:16px;font-weight:900">${boFmt(orgAlloc)}원</div>
      </div>
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:rgba(255,255,255,.6);margin-bottom:4px">이미 배분</div>
        <div style="font-size:16px;font-weight:900">${boFmt(teamsAllocated)}원</div>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:12px;border:1.5px solid rgba(255,255,255,.3)">
        <div style="font-size:10px;color:rgba(255,255,255,.7);margin-bottom:4px;font-weight:700">배분 가능</div>
        <div style="font-size:16px;font-weight:900">${boFmt(teamDistributable)}원</div>
      </div>
    </div>
    <div>
      <div style="height:8px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden">
        <div style="height:100%;background:rgba(255,255,255,.8);width:${orgBurnPct.toFixed(0)}%;border-radius:99px;transition:width .4s"></div>
      </div>
      <div style="text-align:right;font-size:11px;color:rgba(255,255,255,.7);margin-top:4px;font-weight:700">${orgBurnPct.toFixed(0)}%</div>
    </div>
  </div>

  <!-- 팀별 배분 테이블 -->
  <div style="background:white;border-radius:16px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
    <div style="padding:16px 20px;border-bottom:1.5px solid #F3F4F6;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">🏅</span>
      <div>
        <div style="font-size:14px;font-weight:900;color:#111">하위 팀별 배분</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:1px">추가 배분 입력 → 배분 확정</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase">팀</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6B7280">현재 배정</th>
          <th style="padding:10px 10px;text-align:right;font-size:11px;font-weight:700;color:#6B7280">추가 배분</th>
          <th style="padding:10px 10px;font-size:11px;font-weight:700;color:#6B7280">배분 후</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#B45309">약정</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#EF4444">집행</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#059669">가용</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6B7280">회수</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <!-- 3색 워터폴 잔액 바 -->
  <div style="margin-bottom:16px">
    <div style="font-size:11px;color:#6B7280;font-weight:700;margin-bottom:8px">
      ● 교육조직 잔액: <b style="color:#111">${boFmt(teamDistributable)}원</b>
      <span id="dd-input-summary" style="color:#F59E0B"> — 배분 중: <b>0원</b></span>
      = 배분 후 잔액: <b id="dd-remain-disp" style="color:#059669">${boFmt(teamDistributable)}원</b>
    </div>
    <div style="height:32px;border-radius:10px;overflow:hidden;display:flex;background:#F3F4F6">
      <div id="dd-bar-green" style="background:linear-gradient(90deg,#059669,#34D399);height:100%;
           width:${distributedPct.toFixed(0)}%;transition:width .3s;display:flex;align-items:center;justify-content:center;
           font-size:11px;font-weight:800;color:white;min-width:${distributedPct > 5 ? '0' : '0'}px">
        ${distributedPct > 8 ? boFmt(teamsAllocated) : ''}
      </div>
      <div id="dd-bar-yellow" style="background:linear-gradient(90deg,#F59E0B,#FBBF24);height:100%;
           width:0%;transition:width .3s;display:flex;align-items:center;justify-content:center;
           font-size:11px;font-weight:800;color:white;overflow:hidden">
        <span id="dd-bar-yellow-label"></span>
      </div>
      <div id="dd-bar-white" style="background:#E5E7EB;height:100%;flex:1;
           display:flex;align-items:center;justify-content:center;
           font-size:11px;font-weight:800;color:#9CA3AF">
        <span id="dd-bar-remain-label">${boFmt(teamDistributable)}</span>
      </div>
    </div>
  </div>

  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 16px;font-size:12px;color:#92400E;margin-bottom:12px">
    ⚠️ 입력 합계가 조직 배분 가능 재원을 초과할 수 없습니다.
  </div>
  <button onclick="_showDistConfirmModal()" class="bo-btn-primary"
    style="width:100%;padding:16px;font-size:14px;font-weight:800;border-radius:12px;
           display:flex;align-items:center;justify-content:center;gap:8px">
    📋 배분 내역 확인 및 이관 확정
  </button>
</div>
`;
  // Bug1 Fix: innerHTML <script> 미실행 방지 → return 직전 직접 할당
  window._ddRows = allRows;
  window._ddAbId = ab.id;
  window._ddMaxAmount = teamDistributable;
  window._ddCurrentLevel = 1;
  window._ddOrgAlloc = orgAlloc;
  window._ddTeamsAllocated = teamsAllocated;
  return html_l1;
}

// ── 워터폴 실시간 계산 ────────────────────────────────────────────────────────
function calcDDRemain() {
  const rows = window._ddRows || [];
  let total = 0;
  rows.forEach(r => { total += Number(document.getElementById(r.inputId)?.value || 0); });
  const remain = (window._ddMaxAmount || 0) - total;

  // 상단 표시 업데이트 (Level 0)
  const remainDisp = document.getElementById('dd-remain-disp');
  const inputDisp = document.getElementById('dd-input-disp');
  const bottomBar = document.getElementById('dd-bottom-bar');

  if (remainDisp) remainDisp.textContent = boFmt(remain) + '원';
  if (remainDisp) remainDisp.style.color = remain < 0 ? '#EF4444' : '#059669';
  if (inputDisp) inputDisp.textContent = boFmt(total) + '원';

  // 3색 세그먼트 바 업데이트 (Level 1)
  const orgAlloc = window._ddOrgAlloc || 0;
  const teamsAllocated = window._ddTeamsAllocated || 0;
  if (orgAlloc > 0) {
    const greenPct = Math.min((teamsAllocated / orgAlloc) * 100, 100);
    const yellowPct = Math.min((total / orgAlloc) * 100, Math.max(0, 100 - greenPct));
    const whitePct = Math.max(0, 100 - greenPct - yellowPct);
    const gEl = document.getElementById('dd-bar-green');
    const yEl = document.getElementById('dd-bar-yellow');
    const wEl = document.getElementById('dd-bar-white');
    const yLabel = document.getElementById('dd-bar-yellow-label');
    const rLabel = document.getElementById('dd-bar-remain-label');
    if (gEl) gEl.style.width = greenPct.toFixed(1) + '%';
    if (yEl) { yEl.style.width = yellowPct.toFixed(1) + '%'; }
    if (yLabel) yLabel.textContent = total > 0 ? boFmt(total) : '';
    if (wEl) wEl.style.flex = whitePct > 0 ? '1' : '0';
    if (rLabel) rLabel.textContent = remain >= 0 ? boFmt(remain) : '초과!';
    if (wEl) wEl.style.color = remain < 0 ? '#EF4444' : '#9CA3AF';
  }

  // 입력 요약 업데이트 (Level 1)
  const inputSummary = document.getElementById('dd-input-summary');
  if (inputSummary) {
    inputSummary.innerHTML = total > 0
      ? ` — 배분 중: <b style="color:#F59E0B">${boFmt(total)}원</b>`
      : ' — 배분 중: <b>0원</b>';
  }

  // 개별 행 미리보기
  rows.forEach(r => {
    const v = Number(document.getElementById(r.inputId)?.value || 0);
    const pv = document.getElementById(r.inputId + '-preview');
    if (pv) pv.textContent = v > 0 ? '→ ' + boFmt((r.currentAlloc || 0) + v) + '원' : '';
  });
}

// ── 배분 확정 확인 모달 (출금통장 카드 UI) ────────────────────────────────────
function _showDistConfirmModal() {
  const rows = window._ddRows || [];
  const maxAmt = window._ddMaxAmount || 0;
  const abId = window._ddAbId;
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  const isL1 = window._ddCurrentLevel === 1;

  // ── F-151: 운영담당자 Δ=0 제약 (해석 B: orgAlloc 초과 차단) ──
  // 운영담당자는 Level 0(교육조직 총액)을 변경할 수 없고, Level 1(팀간 재배분)만 가능
  const isOp = typeof boIsOpManager === 'function' && boIsOpManager();
  if (isOp && !isL1) {
    alert('⚠️ 운영담당자는 교육조직 총액을 변경할 수 없습니다.\n\n관할 교육조직으로 드릴다운하여 팀 간 재배분만 가능합니다.\n교육조직 총액 변경은 총괄담당자에게 요청하세요.');
    return;
  }

  // ── F-151 (Level 1 추가 검증): 운영담당자 팀 배분 시 orgAlloc 초과 차단 ──
  // 해석 B: orgAlloc 범위 내 자유 배분 허용, 단 총액(orgAlloc) 초과 불가
  if (isOp && isL1) {
    const inputTotal = rows.reduce((s, r) => s + Number(document.getElementById(r.inputId)?.value || 0), 0);
    const orgAlloc = window._ddOrgAlloc || 0;
    const teamsAllocated = window._ddTeamsAllocated || 0;
    const newTeamsTotal = teamsAllocated + inputTotal;
    if (newTeamsTotal > orgAlloc) {
      alert(`⚠️ F-151 정책 위반\n\n운영담당자는 교육조직 배분 총액을 초과하여 팀에 배분할 수 없습니다.\n\n교육조직 배분 총액: ${boFmt(orgAlloc)}원\n이미 배분된 금액: ${boFmt(teamsAllocated)}원\n추가 입력 합계: ${boFmt(inputTotal)}원\n배분 후 합계: ${boFmt(newTeamsTotal)}원 (초과 ${boFmt(newTeamsTotal - orgAlloc)}원)\n\n배분 가능 잔액(${boFmt(orgAlloc - teamsAllocated)}원) 이내로 입력하세요.`);
      return;
    }
  }

  let total = 0;
  const lines = [];
  rows.forEach(r => {
    const v = Number(document.getElementById(r.inputId)?.value || 0);
    if (v > 0) { total += v; lines.push({ name: r.name, v, after: (r.currentAlloc || 0) + v }); }
  });
  if (total === 0) { alert('배분 금액을 1개 이상 입력하세요.'); return; }
  if (total > maxAmt) { alert(`입력 합계(${boFmt(total)}원)가 배분 가능 재원(${boFmt(maxAmt)}원)을 초과합니다.`); return; }
  const acctName = ACCOUNT_MASTER.find(a => a.code === ab?.accountCode)?.name || ab?.accountCode || '';
  const srcName = isL1 ? (_ddOrgName || '교육조직') : acctName;
  const srcBalance = isL1 ? maxAmt : getDistributable(ab);

  const lineHtml = lines.map(l => `
    <tr style="border-bottom:1px solid #F3F4F6">
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#374151">${l.name}</td>
      <td style="padding:10px 16px;text-align:right;font-size:12px;color:#6B7280">${boFmt((lines.find(x=>x.name===l.name)?.after||0)-l.v)}원</td>
      <td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:800;color:#059669">+${boFmt(l.v)}원</td>
      <td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:900;color:#1D4ED8">${boFmt(l.after)}원</td>
    </tr>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'dd-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
  <div style="background:white;border-radius:20px;width:100%;max-width:500px;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden">
    <!-- 모달 헤더 -->
    <div style="padding:20px 24px 16px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;background:#F0FDF4;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">📋</div>
      <div>
        <div style="font-size:16px;font-weight:900;color:#111">배분 확정 확인</div>
        <div style="font-size:12px;color:#6B7280">확정 후에는 회수 기능을 통해서만 변경 가능</div>
      </div>
    </div>

    <div style="padding:20px 24px">
      <!-- 출금 통장 카드 -->
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">출금 통장</div>
      <div style="border:1.5px solid #E5E7EB;border-radius:12px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;background:#EFF6FF;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏦</div>
        <div>
          <div style="font-size:14px;font-weight:900;color:#111">${srcName} 통장</div>
          <div style="font-size:12px;color:#6B7280">현재 잔액: <b style="color:#059669">${boFmt(srcBalance)}원</b></div>
        </div>
      </div>

      <!-- 화살표 -->
      <div style="text-align:center;font-size:20px;color:#9CA3AF;margin:4px 0">↓</div>

      <!-- 배분 대상 테이블 -->
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em">▼ 배분 대상</div>
      <div style="border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#F9FAFB">
              <th style="padding:8px 16px;text-align:left;font-size:11px;color:#9CA3AF;font-weight:700">대상</th>
              <th style="padding:8px 16px;text-align:right;font-size:11px;color:#9CA3AF;font-weight:700">현재</th>
              <th style="padding:8px 16px;text-align:right;font-size:11px;color:#059669;font-weight:700">추가 배분</th>
              <th style="padding:8px 16px;text-align:right;font-size:11px;color:#1D4ED8;font-weight:700">배분 후</th>
            </tr>
          </thead>
          <tbody>${lineHtml}
            <tr style="background:#F0FDF4;border-top:2px solid #BBF7D0">
              <td style="padding:10px 16px;font-size:13px;font-weight:900;color:#111">합계</td>
              <td style="padding:10px 16px;text-align:right;font-size:12px;color:#6B7280">—</td>
              <td style="padding:10px 16px;text-align:right;font-size:14px;font-weight:900;color:#059669">+${boFmt(total)}원</td>
              <td style="padding:10px 16px;text-align:right;font-size:13px;font-weight:900;color:#1D4ED8">${boFmt(lines.reduce((s,l)=>s+l.after,0))}원</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 배분 후 잔액 -->
      <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:12px;padding:12px 16px;text-align:center;margin-bottom:16px">
        <div style="font-size:12px;color:#059669;font-weight:700;margin-bottom:2px">배분 후 잔액</div>
        <div style="font-size:20px;font-weight:900;color:#059669">${boFmt(srcBalance - total)}원</div>
      </div>

      <!-- 경고 -->
      <div style="background:#FEF3C7;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:16px">
        ⚠️ 확정 후에는 회수 기능을 통해서만 변경할 수 있습니다.
      </div>

      <!-- 버튼 -->
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('dd-confirm-overlay').remove()"
          style="flex:1;padding:13px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-weight:700;font-size:13px;color:#374151;transition:all .15s"
          onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">취소</button>
        <button onclick="_submitDDDist()" class="bo-btn-primary"
          style="flex:2;padding:13px;font-size:13px;font-weight:800;border-radius:10px">
          ✓ 이관 확정
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ── DB 저장 ────────────────────────────────────────────────────────────────────
async function _submitDDDist() {
  const overlay = document.getElementById('dd-confirm-overlay');
  if (overlay) overlay.remove();
  const rows = window._ddRows || [];
  const abId = window._ddAbId;
  const maxAmt = window._ddMaxAmount || 0;
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  let total = 0;
  rows.forEach(r => { total += Number(document.getElementById(r.inputId)?.value || 0); });
  if (total === 0 || total > maxAmt) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  const lines = [], errors = [];
  if (sb && ab) {
    try {
      // user_id IS NULL 필터 제거: 교육조직 통장도 user_id가 있을 수 있음
      // accountCode 포함 여부로 account_id 필터링하여 해당 계정 통장만 조회
      const { data: bankbooks } = await sb.from('org_budget_bankbooks')
        .select('id,org_id,org_name,account_id,template_id')
        .eq('tenant_id', ab.tenantId)
        .or('bb_status.eq.active,bb_status.is.null');

      // DB에서 budget_accounts.id (UUID) 조회 - account_id와 정확 비교에 사용
      const { data: accts } = await sb.from('budget_accounts').select('id,code').eq('code', ab.accountCode).eq('tenant_id', ab.tenantId).limit(1);
      const dbAccountId = accts?.[0]?.id;
      console.log('[DD배분] dbAccountId:', dbAccountId, '| accountCode:', ab.accountCode, '| templateId:', ab.templateId);
      console.log('[DD배분] bankbooks 수:', (bankbooks||[]).length, (bankbooks||[]).map(b=>b.org_name+'|'+b.account_id).join(', '));
      for (const r of rows) {
        const v = Number(document.getElementById(r.inputId)?.value || 0);
        if (v <= 0) continue;
        // Fix: account_id(UUID) 정확 비교 우선 → template_id 비교 → org_name 매칭으로 보완
        // r.vgId: Level0 allRows에 담긴 vg.id (교육조직 ID)
        const bb = (bankbooks || []).find(b => {
          // 1순위: org_id ↔ vgId 매칭 (가장 정확)
          const orgMatch = (r.vgId && b.org_id && (String(b.org_id) === String(r.vgId)))
            || b.org_name === r.name
            || b.org_name?.includes(r.name)
            || r.name?.includes(b.org_name);
          // 2순위: account_id 정확 비교 (budget_accounts.id가 복합키인 경우 포함) → template_id 폴백
          const acctMatch = (dbAccountId && b.account_id === dbAccountId)
            || (ab.accountCode && b.account_id?.includes(ab.accountCode))
            || (ab.templateId && b.template_id === ab.templateId)
            || (!dbAccountId && !ab.templateId && !ab.accountCode); // 모두 없으면 org 매칭만으로 허용
          return orgMatch && acctMatch;
        });
        console.log(`[DD배분] '${r.name}' → bb: ${bb ? bb.id + '|' + bb.org_name : 'NOT FOUND → 자동생성 시도'}`);
        let activeBb = bb;
        if (!activeBb) {
          // 방향 A: 교육조직 bankbook이 없으면 자동 생성
          // dbAccountId: budget_accounts.id (복합키 or UUID)
          const autoAccountId = dbAccountId || (ab.templateId ? `BA-${ab.accountCode}-${ab.templateId}` : null);
          if (autoAccountId && ab.tenantId) {
            try {
              const { data: newBb, error: bbCreateErr } = await sb.from('org_budget_bankbooks').insert({
                tenant_id: ab.tenantId,
                org_id: r.vgId || '',
                org_name: r.name,
                account_id: autoAccountId,
                template_id: ab.templateId || '',
                vorg_group_id: r.vgId || ab.templateId || '',
                bb_status: 'active',
                status: 'active',
                is_org_level: true,  // 교육조직 단위 통장 (NOT NULL)
                user_id: null,
              }).select('id,org_name').single();
              if (bbCreateErr) {
                console.error('[DD배분] bankbook 자동생성 실패:', bbCreateErr.message, '| code:', bbCreateErr.code, '| details:', bbCreateErr.details, '| hint:', bbCreateErr.hint);
                errors.push(r.name);
              } else {
                activeBb = newBb;
                console.log(`[DD배분] '${r.name}' bankbook 자동생성 완료:`, newBb.id);
              }
            } catch (createErr) {
              console.error('[DD배분] bankbook 자동생성 예외:', createErr.message);
              errors.push(r.name);
            }
          } else {
            console.warn(`[DD배분] '${r.name}' 자동생성 불가 - accountId/tenantId 없음`);
            errors.push(r.name);
          }
        }
        if (activeBb) {
          const { data: existing } = await sb.from('budget_allocations').select('id,allocated_amount').eq('bankbook_id', activeBb.id).order('updated_at', { ascending: false }).limit(1);
          const ex = existing?.[0];
          if (ex) { await sb.from('budget_allocations').update({ allocated_amount: Number(ex.allocated_amount) + v, updated_at: new Date().toISOString() }).eq('id', ex.id); }
          // budget_allocations 테이블에는 tenant_id 컬럼이 없음 (bankbook_id를 통해 식별)
          else { await sb.from('budget_allocations').insert({ bankbook_id: activeBb.id, allocated_amount: v, used_amount: 0, frozen_amount: 0 }); }
        }
        const td = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === r.name);
        const afterAmt = (td ? td.allocAmount : 0) + v;
        if (td) { td.allocAmount += v; } else { TEAM_DIST.push({ id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`, accountBudgetId: abId, teamName: r.name, allocAmount: v, spent: 0, reserved: 0 }); }
        lines.push({ name: r.name, v, after: afterAmt, dbMatched: !!activeBb });
      }
    } catch (e) { console.error('[DD배분] DB오류:', e.message, e); }
  } else {
    // DB 미연결 (오프라인) 모드: 인메모리 TEAM_DIST만 업데이트
    rows.forEach(r => {
      const v = Number(document.getElementById(r.inputId)?.value || 0);
      if (v <= 0) return;
      const td = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === r.name);
      const afterAmt = (td ? td.allocAmount : 0) + v;
      if (td) { td.allocAmount += v; } else { TEAM_DIST.push({ id: `TD${Date.now()}`, accountBudgetId: abId, teamName: r.name, allocAmount: v, spent: 0, reserved: 0 }); }
      // Bug Fix: 오프라인 모드도 객체 push
      lines.push({ name: r.name, v, after: afterAmt, dbMatched: false });
    });
  }
  // ── Audit Trail: account_budget_adjustments 기록 (마스터 일원화) ──
  if (sb && ab) {
    try {
      const isL1 = window._ddCurrentLevel === 1;
      const actorName = boCurrentPersona?.name || 'BO담당자';
      const auditTenantId = boCurrentPersona?.tenantId || ab.tenantId || null;
      // Bug Fix: lines 중 dbMatched=true인 항목만 Audit Trail 기록 (bb 미매칭은 DB 저장 안됐으므로 제외)
      const dbMatchedLines = lines.filter(l => l.dbMatched);
      for (const l of dbMatchedLines) {
        await sb.from('account_budget_adjustments').insert({
          account_code: ab.accountCode,
          fiscal_year: ab.fiscalYear || new Date().getFullYear(),
          type: '추가배정',
          amount: l.v,
          reason: `[${isL1 ? '팀 배분' : '조직 배분'}] ${l.name}에게 ${boFmt(l.v)}원 배분 (배분 후 ${boFmt(l.after)}원)`,
          performed_by: actorName,
          ...(auditTenantId ? { tenant_id: auditTenantId } : {})
        });
      }
    } catch(logErr) { console.warn('[DD배분] Audit 로그 skip:', logErr.message); }
  }

  // Bug Fix: lines가 객체 배열이므로 map으로 문자열 변환
  let msg = `✅ 배분 완료!\n\n${lines.map(l => `${l.name}: +${boFmt(l.v)}원${l.dbMatched ? '' : ' (⚠DB미반영)'}`).join('\n')}\n\n총 배분: ${boFmt(total)}원`;
  if (errors.length) msg += `\n\n⚠ 통장 미매칭 (DB 미반영): ${errors.join(', ')}`;
  alert(msg);
  // 배분 완료 후 Level 0(계정 선택)으로 복귀하여 전체 현황 확인
  _ddLevel = 0;
  showAllocTabByIdx(0);
}

// ── 회수 모달 ─────────────────────────────────────────────────────────────────
function _showRecallModal(abId, orgId, orgName) {
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  const orgTd = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === orgName);
  if (!orgTd || orgTd.allocAmount <= 0) { alert('회수할 배분 금액이 없습니다.'); return; }
  const minKeep = (orgTd.spent || 0) + (orgTd.reserved || 0);
  const maxRecall = orgTd.allocAmount - minKeep;
  if (maxRecall <= 0) { alert(`집행/약정 금액(${boFmt(minKeep)}원) 이상으로 회수할 수 없습니다.`); return; }
  const overlay = document.createElement('div');
  overlay.id = 'dd-recall-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
  <div style="background:white;border-radius:20px;width:100%;max-width:420px;box-shadow:0 24px 80px rgba(0,0,0,.25);overflow:hidden">
    <div style="padding:20px 24px 16px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:10px">
      <div style="width:40px;height:40px;background:#FEF2F2;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px">↩️</div>
      <div>
        <div style="font-size:16px;font-weight:900;color:#DC2626">예산 회수</div>
        <div style="font-size:12px;color:#6B7280">${orgName}</div>
      </div>
    </div>
    <div style="padding:20px 24px">
      <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#9CA3AF;margin-bottom:2px">현재 배분액</div><div style="font-size:14px;font-weight:900;color:#374151">${boFmt(orgTd.allocAmount)}원</div></div>
          <div><div style="font-size:10px;color:#9CA3AF;margin-bottom:2px">집행+약정 (보호)</div><div style="font-size:14px;font-weight:700;color:#B45309">${boFmt(minKeep)}원</div></div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #FECACA;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;font-weight:700;color:#991B1B">최대 회수 가능</span>
          <span style="font-size:16px;font-weight:900;color:#DC2626">${boFmt(maxRecall)}원</span>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:8px">회수 금액</label>
        <div style="position:relative">
          <input type="number" id="dd-recall-amt" placeholder="0" max="${maxRecall}" min="1"
            style="width:100%;border:1.5px solid #FECACA;border-radius:12px;padding:14px 44px 14px 16px;
                   font-size:20px;font-weight:900;background:#FFF5F5;box-sizing:border-box"
            onfocus="this.style.borderColor='#DC2626';this.style.boxShadow='0 0 0 3px #FECACA'"
            onblur="this.style.borderColor='#FECACA';this.style.boxShadow='none'"
            oninput="(function(v,m){const n=Number(v);const el=document.getElementById('dd-recall-preview');if(el){el.textContent=n>0?'회수 후: '+boFmt(Math.max(0,${orgTd.allocAmount}-n))+'원':'';el.style.color=n>m?'#EF4444':'#059669';}})( this.value, ${maxRecall})"/>
          <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:14px;color:#9CA3AF;font-weight:700">원</span>
        </div>
        <div id="dd-recall-preview" style="font-size:13px;font-weight:700;margin-top:6px;text-align:right;min-height:20px"></div>
      </div>
      <div style="display:flex;gap:10px">
        <button onclick="document.getElementById('dd-recall-overlay').remove()"
          style="flex:1;padding:13px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-weight:700;font-size:13px"
          onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">취소</button>
        <button onclick="_submitDDRecall('${abId}','${orgName}',${maxRecall})"
          style="flex:2;padding:13px;background:#DC2626;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:900;font-size:13px">
          ↩ 회수 확정
        </button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function _submitDDRecall(abId, orgName, maxRecall) {
  const amt = Number(document.getElementById('dd-recall-amt')?.value || 0);
  if (amt <= 0 || amt > maxRecall) { alert(`1원 이상 ${boFmt(maxRecall)}원 이하로 입력하세요.`); return; }
  const overlay = document.getElementById('dd-recall-overlay');
  if (overlay) overlay.remove();
  const td = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === orgName);
  if (td) td.allocAmount -= amt;
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (sb && ab) {
    try {
      const { data: bankbooks } = await sb.from('org_budget_bankbooks').select('id,org_name,account_id').eq('tenant_id', ab.tenantId).or('bb_status.eq.active,bb_status.is.null');
      const { data: accts } = await sb.from('budget_accounts').select('id,code').eq('code', ab.accountCode).eq('tenant_id', ab.tenantId).eq('active', true).limit(1);
      const dbAccountId = accts?.[0]?.id;
      const bb = (bankbooks || []).find(b => (b.org_name === orgName || b.org_name?.includes(orgName) || orgName?.includes(b.org_name)) && (dbAccountId ? b.account_id === dbAccountId : true));
      if (bb) {
        const { data: existing } = await sb.from('budget_allocations').select('id,allocated_amount').eq('bankbook_id', bb.id).order('updated_at', { ascending: false }).limit(1);
        const ex = existing?.[0];
        if (ex) await sb.from('budget_allocations').update({ allocated_amount: Math.max(0, Number(ex.allocated_amount) - amt), updated_at: new Date().toISOString() }).eq('id', ex.id);
      }
      // Bug 2 Fix: account_budgets.balance 재계산
      const newTotal = ab.baseAmount + ab.totalAdded;
      await _syncBudgetAllocations(sb, ab, newTotal, ab.usedAmount || 0, ab.fiscalYear || new Date().getFullYear());
    } catch (e) { console.error('[DD회수] DB오류:', e.message); }
  }
  // ── Audit Trail: budget_usage_log 기록 (회수) ──
  if (sb && ab) {
    try {
      const actorName = boCurrentPersona?.name || 'BO담당자';
      const actorId = boCurrentPersona?.id || 'system';
      const acctName = ACCOUNT_MASTER.find(a => a.code === ab.accountCode)?.name || ab.accountCode;
      const afterAmt = td ? td.allocAmount : 0;
      await sb.from('account_budget_adjustments').insert({
        account_code: ab.accountCode,
        fiscal_year: ab.fiscalYear || new Date().getFullYear(),
        type: '회수',
        amount: amt,
        reason: `[배분 회수] ${orgName}에서 ${boFmt(amt)}원 회수 (회수 후 ${boFmt(afterAmt)}원)`,
        performed_by: actorName,
        tenant_id: ab.tenantId || ''
      });
    } catch(logErr) { console.warn('[DD회수] Audit 로그 skip:', logErr.message); }
  }

  alert(`✅ 회수 완료!\n${orgName}에서 ${boFmt(amt)}원 회수됨`);
  // Bug Fix: 회수 후 Level 0으로 날리지 않고 Level 1(같은 교육조직)으로 복귀
  // _ddOrgId, _ddOrgName, _ddAbId 상태는 회수 전과 동일하므로 그대로 renderBudgetDistribution 재호출
  _ddLevel = 1;
  const contentEl = document.getElementById('alloc-content');
  if (contentEl) contentEl.innerHTML = renderBudgetDistribution();
}

// ── P2: Level 2 — 교육조직 → 개인 직접 배분 (individual 정책) ─────────────────
function _renderDDLevel2Individual() {
  const persona = boCurrentPersona;
  const ab = _ddAbId ? ACCOUNT_BUDGETS.find(x => x.id === _ddAbId) : null;
  if (!ab) return '<div style="padding:40px;text-align:center;color:#9CA3AF">계정 정보를 찾을 수 없습니다.</div>';

  const _tplId = ab.templateId || (typeof _allocFilterTplId !== 'undefined' ? _allocFilterTplId : null);
  const tpl = (_tplId ? VIRTUAL_EDU_ORGS.find(t => t.id === _tplId) : null)
    || VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (t.tree?.hqs?.length > 0 || t.tree?.centers?.length > 0));
  const vGroups = tpl ? (tpl.tree?.hqs || tpl.tree?.centers || []) : [];
  // Bug2 Fix: vg ID 타입 불일치 방어
  const vg = vGroups.find(g => String(g.id) === String(_ddOrgId))
    || vGroups.find(g => g.name === _ddOrgName);
  if (!vg) return '<div style="padding:40px;text-align:center;color:#9CA3AF">교육조직 정보를 찾을 수 없습니다.</div>';

  // 교육조직 통장 배분액
  const orgTd = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === vg.name);
  const orgAlloc = orgTd?.allocAmount || 0;

  // 교육조직 소속 팀 멤버 목록 (tree.hqs[n].teams 내 members)
  const allMembers = [];
  (vg.teams || []).forEach(team => {
    (team.members || []).forEach(m => {
      allMembers.push({ ...m, teamName: team.name });
    });
  });

  // 이미 개인에게 배분된 금액 합계
  const memberDisted = allMembers.reduce((s, m) => {
    const td = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === m.name + '_IND');
    return s + (td?.allocAmount || 0);
  }, 0);
  const distributable = Math.max(0, orgAlloc - memberDisted);

  let tableRows = '';
  let inputIdx = 0;
  const allRows = [];

  if (!allMembers.length) {
    tableRows = `<tr><td colspan="7" style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px">
      이 교육조직에 등록된 구성원이 없습니다. 가상조직 관리에서 팀 멤버를 추가하세요.
    </td></tr>`;
  } else {
    allMembers.forEach(m => {
      const inputId = `dd2-input-${inputIdx++}`;
      const existing = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === m.name + '_IND');
      const currentAlloc = existing?.allocAmount || 0;
      const spent = existing?.spent || 0;
      allRows.push({ name: m.name + '_IND', displayName: m.name, teamName: m.teamName, inputId, currentAlloc });
      tableRows += `<tr style="border-bottom:1px solid #F3F4F6;transition:background .15s" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
        <td style="padding:12px 16px">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:32px;height:32px;background:#EDE9FE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">👤</div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#374151">${m.name}</div>
              <div style="font-size:10px;color:#9CA3AF">${m.teamName} · ${m.position || '구성원'}</div>
            </div>
          </div>
        </td>
        <td style="text-align:right;padding:12px 16px;font-size:13px;font-weight:700;color:${currentAlloc > 0 ? '#1D4ED8' : '#9CA3AF'}">
          ${currentAlloc > 0 ? boFmt(currentAlloc) + '원' : '—'}
        </td>
        <td style="padding:8px 10px">
          <div style="position:relative">
            <input type="number" id="${inputId}" placeholder="0" oninput="calcDDRemain()" min="0"
              style="width:120px;border:1.5px solid #E5E7EB;border-radius:8px;
                     padding:8px 28px 8px 10px;font-size:13px;font-weight:800;text-align:right;
                     background:#F5F3FF;transition:all .2s"
              onfocus="this.style.borderColor='#7C3AED';this.style.boxShadow='0 0 0 3px #DDD6FE'"
              onblur="this.style.borderColor='#E5E7EB';this.style.boxShadow='none'"/>
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:#9CA3AF;font-weight:600">원</span>
          </div>
        </td>
        <td style="padding:12px 10px;font-size:12px;color:#7C3AED;font-weight:700;white-space:nowrap" id="${inputId}-preview"></td>
        <td style="text-align:right;padding:12px 16px;font-size:12px;color:#EF4444;font-weight:600">${spent > 0 ? boFmt(spent) : '—'}</td>
        <td style="padding:8px 12px;text-align:center">
          ${currentAlloc > 0
            ? `<button onclick="_showRecallModal('${ab.id}','${vg.id}','${m.name}_IND')"
                style="padding:5px 10px;background:#FEE2E2;color:#DC2626;border:1.5px solid #FECACA;
                       border-radius:7px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;
                       transition:all .15s"
                onmouseover="this.style.background='#DC2626';this.style.color='white'"
                onmouseout="this.style.background='#FEE2E2';this.style.color='#DC2626'">
                ↩ 회수
              </button>`
            : '<span style="font-size:10px;color:#D1D5DB">—</span>'}
        </td>
      </tr>`;
    });
  }

  const html_l2 = `<div>
  ${_ddBreadcrumb(ab, vg.name + ' · 개인배분')}

  <!-- 교육조직 카드 (개인배분 정책) -->
  <div style="background:linear-gradient(135deg,#7C3AED,#5B21B6);border-radius:16px;padding:20px 24px;margin-bottom:20px;color:white;box-shadow:0 8px 24px rgba(124,58,237,.3)">
    <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px">Individual Bankbook Policy</div>
    <div style="font-size:18px;font-weight:900;margin-bottom:12px">${vg.name} — 👤 개인 통장 배분</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:rgba(255,255,255,.6);margin-bottom:4px">교육조직 배정액</div>
        <div style="font-size:16px;font-weight:900">${boFmt(orgAlloc)}원</div>
      </div>
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:12px">
        <div style="font-size:10px;color:rgba(255,255,255,.6);margin-bottom:4px">개인 배분 합계</div>
        <div style="font-size:16px;font-weight:900">${boFmt(memberDisted)}원</div>
      </div>
      <div style="background:rgba(255,255,255,.15);border-radius:10px;padding:12px;border:1.5px solid rgba(255,255,255,.3)">
        <div style="font-size:10px;color:rgba(255,255,255,.7);margin-bottom:4px;font-weight:700">배분 가능</div>
        <div style="font-size:16px;font-weight:900">${boFmt(distributable)}원</div>
      </div>
    </div>
  </div>

  <!-- 구성원 배분 테이블 -->
  <div style="background:white;border-radius:16px;border:1.5px solid #E5E7EB;overflow:hidden;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.04)">
    <div style="padding:14px 20px;border-bottom:1.5px solid #F3F4F6;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">👥</span>
      <div>
        <div style="font-size:14px;font-weight:900;color:#111">구성원별 개인 통장 배분</div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:1px">교육조직 → 개인 직접 배분 (팀 단계 없음)</div>
      </div>
      <span style="margin-left:auto;font-size:10px;padding:3px 10px;border-radius:20px;background:#EDE9FE;color:#7C3AED;font-weight:800">👤 개인배분 정책</span>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6B7280">구성원</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#6B7280">현재 배정</th>
          <th style="padding:10px 10px;text-align:right;font-size:11px;font-weight:700;color:#6B7280">추가 배분</th>
          <th style="padding:10px 10px;font-size:11px;font-weight:700;color:#6B7280">배분 후</th>
          <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#EF4444">집행</th>
          <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#6B7280">회수</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:10px 16px;font-size:12px;color:#5B21B6;margin-bottom:12px">
    👤 개인 통장 정책: 팀 단계 없이 교육조직에서 구성원 개인에게 직접 예산 배분합니다.
    배분 합계가 교육조직 배분액(${boFmt(orgAlloc)}원)을 초과할 수 없습니다.
  </div>
  <div id="dd-remain-disp" style="text-align:right;font-size:13px;font-weight:800;color:#059669;margin-bottom:8px">배분 가능: ${boFmt(distributable)}원</div>
  <button onclick="_showDistConfirmModal()" class="bo-btn-primary"
    style="width:100%;padding:16px;font-size:14px;font-weight:800;border-radius:12px;
           display:flex;align-items:center;justify-content:center;gap:8px">
    📋 개인 배분 내역 확인 및 확정
  </button>
</div>
`;
  // Bug1 Fix: innerHTML <script> 미실행 방지 → return 직전 직접 할당
  window._ddRows = allRows;
  window._ddAbId = ab.id;
  window._ddMaxAmount = distributable;
  window._ddCurrentLevel = 2;
  window._ddOrgAlloc = orgAlloc;
  window._ddTeamsAllocated = memberDisted;
  return html_l2;
}
