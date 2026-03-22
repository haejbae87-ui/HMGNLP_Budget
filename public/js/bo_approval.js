// ─── 📥 나의 운영 업무 (My Operations) ──────────────────────────────────────
// 정책 기반 결재 자동 라우팅 — 자신이 승인자인 정책의 건만 자동 표시

let _myOpsTab = 'all';

function renderMyOperations() {
  const el = document.getElementById('bo-content');
  const persona = boCurrentPersona;
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';

  // 자신이 승인자인 정책 목록
  const myPolicies = SERVICE_POLICIES.filter(p =>
    p.tenantId === persona.tenantId && p.approverPersonaKey === personaKey
  );
  const myPolicyIds = myPolicies.map(p => p.id);

  // 자신이 관련된 결재 건 필터링 (정책 기반)
  const allApps = MOCK_BO_APPLICATIONS.filter(a => myPolicyIds.includes(a.policyId));
  const plans   = MOCK_BO_PLANS.filter(a =>
    myPolicies.some(p => p.vorgTemplateId && a.group === (p.accountCodes[0]||'').includes('RND')?'rnd':'general')
  );

  // 탭 필터
  const tabs = [
    { id: 'all',    icon: '📋', label: '전체',     items: allApps },
    { id: 'plan',   icon: '📊', label: '교육계획',  items: MOCK_BO_PLANS.filter(a => myPolicies.some(p=>p.flow.includes('plan'))) },
    { id: 'apply',  icon: '📝', label: '교육신청',  items: allApps.filter(a=>a.type==='신청') },
    { id: 'result', icon: '📄', label: '교육결과',  items: allApps.filter(a=>a.type==='결과보고') },
  ];

  const pendingAll = allApps.filter(a=>a.status.startsWith('pending')).length;

  // 탭 헤더
  const tabHtml = tabs.map(t=>`
<div onclick="_myOpsTab='${t.id}';renderMyOperations()"
  style="padding:9px 16px;border-radius:10px;border:1.5px solid ${_myOpsTab===t.id?'#002C5F':'#E5E7EB'};
    background:${_myOpsTab===t.id?'#002C5F':'white'};color:${_myOpsTab===t.id?'white':'#6B7280'};
    font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px">
  ${t.icon} ${t.label}
  <span style="background:${_myOpsTab===t.id?'rgba(255,255,255,.2)':'#F3F4F6'};padding:1px 7px;border-radius:99px;font-size:11px">${t.items.length}</span>
</div>`).join('');

  // 현재 탭 아이템
  const currentTab = tabs.find(t=>t.id===_myOpsTab);
  const currentItems = currentTab?.items || [];

  // 내 정책 목록 배지
  const policyBadges = myPolicies.map(p=>`
<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#F5F3FF;border-radius:8px;font-size:11px">
  <span style="font-weight:900;color:#7C3AED">⚡</span>
  <span style="font-weight:700;color:#374151">${p.name}</span>
  <span style="color:#9CA3AF">→ 승인자: 나</span>
</div>`).join('');

  // 결재 카드
  const flowLabel = { 'result-only': '결과', 'apply-result': '신청/결과', 'plan-apply-result': '계획/신청/결과' };
  const typeStyle = { '신청': { bg:'#DBEAFE',c:'#1E40AF' }, '결과보고': { bg:'#FEF3C7',c:'#92400E' }, '교육계획': { bg:'#D1FAE5',c:'#065F46' } };

  const appCards = currentItems.length === 0
    ? `<div style="padding:50px;text-align:center;color:#9CA3AF">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-weight:700">현재 처리할 업무가 없습니다</div>
        <div style="font-size:12px;margin-top:4px">새 신청이 들어오면 이 메뉴에 자동으로 표시됩니다</div>
       </div>`
    : currentItems.map(a => {
        const isPending = a.status?.startsWith('pending');
        const isResult  = a.type === '결과보고';
        const policy = SERVICE_POLICIES.find(p=>p.id===a.policyId);
        const ts = typeStyle[a.type] || {bg:'#F3F4F6',c:'#374151'};
        return `
<div class="bo-card" style="padding:20px;${!isPending?'opacity:0.65':''}">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:900;padding:2px 9px;border-radius:6px;background:${ts.bg};color:${ts.c}">${a.type||'신청'}</span>
        ${boAccountBadge(a.account)}
        ${policy ? `<span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#F5F3FF;color:#7C3AED;font-weight:700">⚡ ${policy.name}</span>` : ''}
        ${boPlanStatusBadge(a.status)}
      </div>
      <div style="font-weight:900;font-size:15px;color:#111827;margin-bottom:2px">${a.title}</div>
      <div style="font-size:12px;color:#9CA3AF">${a.team||a.hq||''} · 신청자: ${a.submitter||a.applicant||''} · 제출일: ${a.submittedAt||''}</div>
    </div>
    <div style="text-align:right;min-width:120px">
      ${a.requestAmt !== undefined ? `
      <div style="font-size:11px;color:#9CA3AF;font-weight:700;margin-bottom:2px">신청금액</div>
      <div style="font-size:18px;font-weight:900;color:#002C5F">${boFmt(a.requestAmt||a.amount||0)}원</div>
      ${a.actualAmt !== null && a.actualAmt !== undefined ? `
      <div style="font-size:11px;color:#059669;font-weight:700;margin-top:4px">실 사용: ${boFmt(a.actualAmt)}원</div>` : ''}` : ''}
    </div>
  </div>
  ${isPending ? `
  <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
    <button onclick="myOpsApprove('${a.id}')" class="bo-btn-accent">
      ${isResult ? '✅ 정산 승인 (실차감)' : '✅ 승인'}
    </button>
    <button onclick="myOpsReject('${a.id}')" style="border:1.5px solid #EF4444;color:#EF4444;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">반려</button>
    ${!isResult ? `<button onclick="myOpsCancel('${a.id}')" style="border:1.5px solid #9CA3AF;color:#9CA3AF;background:#fff;padding:9px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer">환원</button>` : ''}
  </div>` : `<div style="margin-top:10px;font-size:12px;font-weight:700;color:#9CA3AF;text-align:right">처리 완료</div>`}
</div>`;
      }).join('');

  el.innerHTML = `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">📥 나의 운영 업무</h1>
      <p class="bo-page-sub">내가 승인자로 등록된 정책의 결재 대기건이 자동으로 표시됩니다</p>
    </div>
    ${pendingAll > 0 ? `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:10px 16px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:#B45309">${pendingAll}</div>
      <div style="font-size:11px;font-weight:700;color:#92400E">결재 대기</div>
    </div>` : ''}
  </div>

  <!-- 내 담당 정책 -->
  <div style="margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px">내 담당 정책 (${myPolicies.length}개)</div>
    ${myPolicies.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${policyBadges}</div>` 
      : `<div style="padding:12px 16px;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;font-size:12px;color:#991B1B">
          현재 이 담당자가 승인자로 등록된 정책이 없습니다. 서비스 정책 관리에서 승인자를 지정해주세요.
         </div>`}
  </div>

  <!-- 탭 -->
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">${tabHtml}</div>

  <!-- 결재 카드 리스트 -->
  <div style="display:flex;flex-direction:column;gap:12px">${appCards}</div>
</div>`;
}

function myOpsApprove(id) {
  const a = MOCK_BO_APPLICATIONS.find(x=>x.id===id) || MOCK_BO_PLANS.find(x=>x.id===id);
  if (a) { a.status = a.type==='결과보고' ? 'completed' : 'approved'; renderMyOperations(); }
}
function myOpsReject(id) {
  const r = prompt('반려 사유를 입력하세요:');
  if (r) { const a = MOCK_BO_APPLICATIONS.find(x=>x.id===id); if(a){a.status='rejected';renderMyOperations();} }
}
function myOpsCancel(id) {
  if (confirm('가점유 예산을 즉시 환원하시겠습니까?')) {
    const a = MOCK_BO_APPLICATIONS.find(x=>x.id===id);
    if(a){a.status='cancelled';renderMyOperations();}
  }
}

// ─── 📊 조직 예산 현황 (예산 운영 담당자 전용) ──────────────────────────────
function renderOrgBudget() {
  const el = document.getElementById('bo-content');
  const persona = boCurrentPersona;
  const personaKey = Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === persona) || '';

  // 담당 격리 그룹 찾기
  const myGroup = typeof ISOLATION_GROUPS !== 'undefined'
    ? ISOLATION_GROUPS.find(g => g.opManagerKeys.includes(personaKey)) : null;
  const globalAdmin = myGroup ? BO_PERSONAS[myGroup.globalAdminKey] : null;

  // 담당 가상조직 노드 찾기
  const myVorgId = persona.managedVorgId;
  const allTemplates = typeof VIRTUAL_ORG_TEMPLATES !== 'undefined' ? VIRTUAL_ORG_TEMPLATES : [];
  let myNode = null;
  let myTemplate = null;
  for (const tpl of allTemplates) {
    if (tpl.tenantId !== persona.tenantId) continue;
    const nodes = [...(tpl.tree?.hqs || []), ...(tpl.tree?.centers || [])];
    const found = nodes.find(n => n.id === myVorgId);
    if (found) { myNode = found; myTemplate = tpl; break; }
  }

  const fmt = v => (v||0).toLocaleString('ko-KR');
  const pct = (used, total) => total > 0 ? Math.round(used/total*100) : 0;

  const nodeCard = myNode ? (() => {
    const b = myNode.budget;
    const total   = b.total || 0;
    const deducted= b.deducted || 0;
    const holding = b.holding || 0;
    const avail   = total - deducted - holding;
    const usePct  = pct(deducted + holding, total);
    const teams   = myNode.teams || [];

    return `
    <div class="bo-card" style="padding:22px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <span style="font-size:20px">🏢</span>
        <div>
          <div style="font-weight:900;font-size:16px">${myNode.name}</div>
          <div style="font-size:11px;color:#6B7280">담당 가상조직 노드 · ${myTemplate?.name || ''}</div>
        </div>
      </div>
      <!-- 집계 현황 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${[
          { l:'총 배정예산', v:total,    c:'#374151',   bg:'#F9FAFB' },
          { l:'가점유(홀딩)', v:holding, c:'#D97706',   bg:'#FFFBEB' },
          { l:'실집행 완료', v:deducted, c:'#059669',   bg:'#F0FDF4' },
          { l:'가용 잔액',   v:avail,    c:'#1D4ED8',   bg:'#EFF6FF' },
        ].map(s=>`
        <div style="padding:14px;border-radius:10px;background:${s.bg};border:1px solid ${s.c}20;text-align:center">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;margin-bottom:4px">${s.l}</div>
          <div style="font-size:17px;font-weight:900;color:${s.c}">${fmt(s.v)}<span style="font-size:11px">원</span></div>
        </div>`).join('')}
      </div>
      <!-- 소진율 바 -->
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px">
          <span style="color:#6B7280">예산 소진율</span>
          <span style="color:${usePct>80?'#EF4444':usePct>60?'#D97706':'#059669'};font-weight:900">${usePct}%</span>
        </div>
        <div style="height:8px;border-radius:6px;background:#E5E7EB;overflow:hidden">
          <div style="height:100%;border-radius:6px;background:${usePct>80?'#EF4444':usePct>60?'#F59E0B':'#10B981'};width:${usePct}%;transition:width .4s"></div>
        </div>
      </div>
      <!-- 팀별 현황 -->
      ${teams.length > 0 ? `
      <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:8px">팀별 예산 현황</div>
      <div style="display:grid;gap:6px">
        ${teams.map(t => {
          const tb = t.budget;
          const tat = tb.allocated||0;
          const tdd = tb.deducted||0;
          const thd = tb.holding||0;
          const tp  = pct(tdd+thd, tat);
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:#F9FAFB;border:1px solid #F3F4F6">
            <div style="font-weight:700;font-size:12px;color:#374151;min-width:80px">${t.name}</div>
            <div style="flex:1;height:6px;border-radius:4px;background:#E5E7EB;overflow:hidden">
              <div style="height:100%;background:${tp>80?'#EF4444':tp>60?'#F59E0B':'#10B981'};width:${tp}%"></div>
            </div>
            <div style="font-size:11px;font-weight:900;color:${tp>80?'#EF4444':'#374151'};min-width:30px;text-align:right">${tp}%</div>
            <div style="font-size:11px;color:#9CA3AF;min-width:80px;text-align:right">잔액 ${fmt(tat-tdd-thd)}원</div>
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;
  })() : `<div style="padding:40px;text-align:center;background:#FEF2F2;border-radius:14px;color:#991B1B">
    <div style="font-size:32px">⚠️</div>
    <div style="font-weight:700;margin-top:8px">담당 가상조직 노드가 설정되지 않았습니다.</div>
    <div style="font-size:12px;margin-top:4px;color:#B91C1C">예산 총괄 담당자에게 가상조직 노드 배정을 요청하세요.</div>
  </div>`;

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:24px">
    <h1 class="bo-page-title">💰 조직 예산 현황</h1>
    <p class="bo-page-sub">내가 담당하는 가상조직의 실시간 예산 소진율과 잔액을 확인합니다</p>
  </div>

  <!-- 격리 그룹 소속 정보 -->
  ${myGroup ? `
  <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#F5F3FF;border-radius:12px;border:1px solid #DDD6FE;margin-bottom:20px">
    <span style="font-size:16px">🛡️</span>
    <div>
      <div style="font-size:11px;font-weight:900;color:#7C3AED">소속 격리 그룹: ${myGroup.name}</div>
      <div style="font-size:11px;color:#6B7280">예산 총괄: ${globalAdmin?.name||''} (${globalAdmin?.dept||''})</div>
    </div>
  </div>` : ''}

  ${nodeCard}
</div>`;
}
