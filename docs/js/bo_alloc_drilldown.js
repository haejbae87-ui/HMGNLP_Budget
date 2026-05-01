// ─── 예산 배분 통합 드릴다운 엔진 ─────────────────────────────────────────────
// 의존: bo_allocation.js (_ddLevel, _ddAbId, _ddOrgId, _ddOrgName, _allocYear)
//       ACCOUNT_BUDGETS, TEAM_DIST, VIRTUAL_EDU_ORGS, ACCOUNT_MASTER
//       boFmt(), getDistributable(), getPersonaAccountBudgets(), boCurrentPersona

// ── 탭 1: 최초 예산 할당 (총괄 전용) ──────────────────────────────────────────
function renderInitialAlloc() {
  return typeof renderAllocEntry === 'function'
    ? renderAllocEntry()
    : '<div style="padding:40px;text-align:center;color:#9CA3AF">최초 할당 모듈을 불러올 수 없습니다.</div>';
}

// ── 탭 2: 예산 배분 진입점 ────────────────────────────────────────────────────
function renderBudgetDistribution() {
  if (_ddLevel === 1) return _renderDDLevel1();
  return _renderDDLevel0();
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
function _ddBreadcrumb(ab) {
  const acctName = ab
    ? (ACCOUNT_MASTER.find(a => a.code === ab.accountCode)?.name || ab.accountCode)
    : null;
  if (_ddLevel === 0) {
    return `<div style="margin-bottom:16px;font-size:12px;font-weight:700;color:#6B7280">📤 예산 배분</div>`;
  }
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;font-size:12px;font-weight:700">
    <button onclick="ddNavTo(0,'${_ddAbId}',null,null)"
      style="background:none;border:none;cursor:pointer;color:#059669;font-size:12px;font-weight:700;padding:0">
      📤 예산 배분
    </button>
    <span style="color:#D1D5DB">›</span>
    <span style="color:#374151">${acctName || '—'}</span>
    <span style="color:#D1D5DB">›</span>
    <span style="background:#EDE9FE;color:#5B21B6;padding:2px 8px;border-radius:6px">${_ddOrgName || '—'}</span>
  </div>`;
}

// ── Level 0: 계정선택 + 교육조직 배분 그리드 ─────────────────────────────────
function _renderDDLevel0() {
  const persona = boCurrentPersona;
  const myBudgets = getPersonaAccountBudgets(persona);
  if (!_ddAbId || !myBudgets.find(b => b.id === _ddAbId)) {
    _ddAbId = myBudgets[0]?.id || null;
  }
  const ab = _ddAbId ? ACCOUNT_BUDGETS.find(x => x.id === _ddAbId) : null;

  const acctCards = myBudgets.map(b => {
    const a = ACCOUNT_MASTER.find(x => x.code === b.accountCode);
    const isSel = b.id === _ddAbId;
    const distrib = getDistributable(b);
    const isSAP = b.sourceType === 'sap_if';
    return `<button onclick="ddSelectAccount('${b.id}')" style="padding:10px 14px;border-radius:10px;cursor:pointer;text-align:left;border:2px solid ${isSel?'#059669':'#E5E7EB'};background:${isSel?'#F0FDF4':'white'};box-shadow:${isSel?'0 0 0 3px #BBF7D0':'none'}">
      <div style="display:flex;align-items:center;gap:6px">
        <code style="font-size:10px;font-weight:900;padding:1px 6px;border-radius:5px;background:${isSAP?'#DBEAFE':'#FFEDD5'};color:${isSAP?'#1E40AF':'#9A3412'}">${b.accountCode}</code>
        ${isSel?'<span style="color:#059669">✓</span>':''}
      </div>
      <div style="font-size:11px;font-weight:700;color:#111;margin-top:2px">${a?.name||b.accountCode}</div>
      <div style="font-size:10px;color:${distrib>0?'#059669':'#9CA3AF'};font-weight:600">${distrib>0?'📦 '+boFmt(distrib)+'원':'완전 배분'}</div>
    </button>`;
  }).join('');

  if (!ab) return `<div>${_ddBreadcrumb(null)}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">${acctCards}</div><div style="padding:40px;text-align:center;color:#9CA3AF">계정을 선택하세요.</div></div>`;

  const totalBudget = ab.baseAmount + ab.totalAdded;
  const allDist = TEAM_DIST.filter(t => t.accountBudgetId === ab.id).reduce((s,t) => s+t.allocAmount, 0);
  const distributable = getDistributable(ab);
  const isRnd = ab.accountCode.includes('RND');
  const tpl = VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs));
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];

  let tableRows = '';
  let inputIdx = 0;
  const allRows = [];

  if (vGroups.length === 0) {
    tableRows = `<tr><td colspan="5" style="padding:30px;text-align:center;color:#9CA3AF;font-size:12px">교육조직이 설정되지 않았습니다.</td></tr>`;
  } else {
    vGroups.forEach(vg => {
      const inputId = `dd0-input-${inputIdx++}`;
      const existing = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === vg.name);
      const currentAlloc = existing?.allocAmount || 0;
      allRows.push({ name: vg.name, inputId, existing, currentAlloc, vgId: vg.id });
      tableRows += `<tr>
        <td style="padding:10px 14px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">${isRnd?'🔬':'🏢'}</span>
            <div>
              <div style="font-size:12px;font-weight:800;color:#111">${vg.name}</div>
              <div style="font-size:10px;color:#6B7280">${vg.manager||'—'} · ${(vg.teams||[]).length}개 팀</div>
            </div>
          </div>
        </td>
        <td style="text-align:right;font-size:12px;font-weight:700;color:${currentAlloc>0?'#1D4ED8':'#9CA3AF'}">${currentAlloc>0?boFmt(currentAlloc)+'원':'—'}</td>
        <td style="padding:6px 10px">
          <div style="position:relative">
            <input type="number" id="${inputId}" placeholder="0" oninput="calcDDRemain()" min="0"
              style="width:140px;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 36px 8px 10px;font-size:13px;font-weight:700;text-align:right"/>
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF">원</span>
          </div>
        </td>
        <td style="font-size:11px;color:#059669;font-weight:600;white-space:nowrap" id="${inputId}-preview"></td>
        <td style="text-align:center">
          ${currentAlloc>0
            ? `<button onclick="ddNavTo(1,'${ab.id}','${vg.id}','${vg.name}')" style="font-size:10px;padding:4px 10px;background:#EDE9FE;color:#5B21B6;border:none;border-radius:6px;cursor:pointer;font-weight:700">📂 팀배분 →</button>`
            : '<span style="font-size:10px;color:#D1D5DB">미배분</span>'}
        </td>
      </tr>`;
    });
  }

  const burnPct = totalBudget > 0 ? Math.min((allDist/totalBudget)*100, 100) : 0;

  return `<div>
  ${_ddBreadcrumb(ab)}
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">${acctCards}</div>
  <div id="dd-waterfall" style="padding:14px 18px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:10px">📊 배분 현황 — ${ACCOUNT_MASTER.find(a=>a.code===ab.accountCode)?.name||ab.accountCode}</div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">계정 총액</div><div style="font-weight:900;font-size:16px;color:#1D4ED8">${boFmt(totalBudget)}원</div></div>
      <div style="color:#9CA3AF;font-size:16px">−</div>
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">배분 완료</div><div style="font-weight:700;font-size:14px">${boFmt(allDist)}원</div></div>
      <div style="color:#9CA3AF;font-size:16px">−</div>
      <div style="text-align:center"><div style="font-size:10px;color:#374151">입력 합계</div><div id="dd-input-total" style="font-weight:700;font-size:14px;color:#374151">0원</div></div>
      <div style="color:#9CA3AF;font-size:16px">=</div>
      <div id="dd-remain-box" style="background:#D1FAE5;padding:8px 16px;border-radius:10px;border:2px solid #6EE7B7;text-align:center">
        <div style="font-size:10px;color:#059669">배분 후 잔액</div>
        <div id="dd-remain-val" style="font-weight:900;font-size:18px;color:#059669">${boFmt(distributable)}원</div>
      </div>
    </div>
    <div style="margin-top:10px;height:6px;background:#E2E8F0;border-radius:99px;overflow:hidden">
      <div id="dd-bar-fill" style="height:100%;background:#059669;border-radius:99px;width:${burnPct.toFixed(0)}%;transition:width .3s"></div>
    </div>
  </div>
  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 16px;background:#F9FAFB;border-bottom:1px solid #E5E7EB">
      <div style="font-size:11px;font-weight:800;color:#374151">📋 교육조직별 예산 배분</div>
      <div style="font-size:10px;color:#6B7280;margin-top:2px">각 교육조직에 배분할 금액을 입력 후 이관 확정하세요</div>
    </div>
    <table class="bo-table">
      <thead><tr><th>교육조직</th><th style="text-align:right">현재 배분</th><th style="text-align:right">추가 배분 입력</th><th>배분 후</th><th style="text-align:center">팀 배분</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:12px">
    ⚠️ 입력 합계가 배분 가능 재원을 초과할 수 없습니다. 배분 확정 후 수정 시 회수 기능을 이용하세요.
  </div>
  <button onclick="_showDistConfirmModal()" class="bo-btn-primary" style="width:100%;padding:14px;font-size:14px">📋 배분 내역 확인 및 이관 확정</button>
</div>
<script>(function(){
  window._ddRows = ${JSON.stringify(allRows)};
  window._ddAbId = '${ab.id}';
  window._ddMaxAmount = ${distributable};
  window._ddCurrentLevel = 0;
})();</script>`;
}

// ���� Level 1: �������� �� �� ��� �׸��� ��������������������������������������������������������������������������������
function _renderDDLevel1() {
  const ab = _ddAbId ? ACCOUNT_BUDGETS.find(x => x.id === _ddAbId) : null;
  if (!ab) return '<div style="padding:40px;text-align:center;color:#9CA3AF">���� ���� ����</div>';
  const isRnd = ab.accountCode.includes('RND');
  const tpl = VIRTUAL_EDU_ORGS.find(t => t.tenantId === ab.tenantId && (isRnd ? t.tree.centers : t.tree.hqs));
  const vGroups = tpl ? (isRnd ? tpl.tree.centers : tpl.tree.hqs) : [];
  const vg = vGroups.find(g => g.id === _ddOrgId);
  if (!vg) return '<div style="padding:40px;text-align:center;color:#9CA3AF">�������� ���� ����</div>';
  const teams = vg.teams || [];
  const orgTd = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === vg.name);
  const orgAlloc = orgTd?.allocAmount || 0;
  const teamsAllocated = teams.reduce((s,rt) => { const td = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === rt.name); return s + (td?.allocAmount||0); }, 0);
  const teamDistributable = orgAlloc - teamsAllocated;
  const acctName = ACCOUNT_MASTER.find(a => a.code === ab.accountCode)?.name || ab.accountCode;
  let tableRows = '', inputIdx = 0;
  const allRows = [];
  teams.forEach(rt => {
    const inputId = `dd1-input-${inputIdx++}`;
    const existing = TEAM_DIST.find(t => t.accountBudgetId === ab.id && t.teamName === rt.name);
    const currentAlloc = existing?.allocAmount || 0;
    allRows.push({ name: rt.name, inputId, existing, currentAlloc });
    tableRows += `<tr>
      <td style="padding:8px 14px"><div style="display:flex;align-items:center;gap:6px"><span style="color:#CBD5E1;font-size:11px">����</span><span style="font-size:12px;font-weight:700">${rt.name}</span><span style="font-size:10px;color:#9CA3AF">������</span></div></td>
      <td style="text-align:right;font-size:11px;color:#6B7280">${currentAlloc>0?'���� '+boFmt(currentAlloc)+'��':'�̹��'}</td>
      <td style="padding:6px 10px"><div style="position:relative"><input type="number" id="${inputId}" placeholder="0" oninput="calcDDRemain()" min="0" style="width:140px;border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 36px 8px 10px;font-size:13px;font-weight:700;text-align:right"/><span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF">��</span></div></td>
      <td style="font-size:11px;color:#059669;font-weight:600;white-space:nowrap" id="${inputId}-preview"></td>
    </tr>`;
  });
  if (!teams.length) tableRows = '<tr><td colspan="4" style="padding:30px;text-align:center;color:#9CA3AF;font-size:12px">��ϵ� ���� �����ϴ�.</td></tr>';
  return `<div>
  ${_ddBreadcrumb(ab)}
  <div style="padding:12px 16px;background:#EFF6FF;border:1.5px solid #BFDBFE;border-radius:12px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div style="display:flex;align-items:center;gap:10px"><span style="font-size:22px">${isRnd?'??':'??'}</span><div><div style="font-weight:900;font-size:15px;color:#1E40AF">${vg.name}</div><div style="font-size:11px;color:#3B82F6">${acctName} �� ${_allocYear||new Date().getFullYear()}��</div></div></div>
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">���� ��о�</div><div style="font-weight:900;font-size:16px;color:#1D4ED8">${boFmt(orgAlloc)}��</div></div>
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">�� ��� �Ϸ�</div><div style="font-weight:700;font-size:14px">${boFmt(teamsAllocated)}��</div></div>
      <div style="text-align:center"><div style="font-size:10px;color:${teamDistributable>0?'#059669':'#EF4444'}">�� ��� ����</div><div style="font-weight:900;font-size:16px;color:${teamDistributable>0?'#059669':'#EF4444'}">${boFmt(teamDistributable)}��</div></div>
      <button onclick="_showRecallModal('${ab.id}','${vg.id}','${vg.name}')" style="padding:6px 14px;background:#FEE2E2;color:#DC2626;border:1.5px solid #FECACA;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">?? ȸ��</button>
    </div>
  </div>
  <div id="dd-waterfall" style="padding:14px 18px;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:10px">?? �� ��� ��Ȳ</div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">���� ��о�</div><div style="font-weight:900;font-size:16px;color:#1D4ED8">${boFmt(orgAlloc)}��</div></div>
      <div style="color:#9CA3AF;font-size:16px">?</div>
      <div style="text-align:center"><div style="font-size:10px;color:#6B7280">�� ��� �Ϸ�</div><div style="font-weight:700;font-size:14px">${boFmt(teamsAllocated)}��</div></div>
      <div style="color:#9CA3AF;font-size:16px">?</div>
      <div style="text-align:center"><div style="font-size:10px;color:#374151">�Է� �հ�</div><div id="dd-input-total" style="font-weight:700;font-size:14px;color:#374151">0��</div></div>
      <div style="color:#9CA3AF;font-size:16px">=</div>
      <div id="dd-remain-box" style="background:#D1FAE5;padding:8px 16px;border-radius:10px;border:2px solid #6EE7B7;text-align:center">
        <div style="font-size:10px;color:#059669">��� �� �ܾ�</div>
        <div id="dd-remain-val" style="font-weight:900;font-size:18px;color:#059669">${boFmt(teamDistributable)}��</div>
      </div>
    </div>
  </div>
  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <div style="padding:10px 16px;background:#F9FAFB;border-bottom:1px solid #E5E7EB"><div style="font-size:11px;font-weight:800;color:#374151">?? ���� ���� ��� ? ${vg.name}</div></div>
    <table class="bo-table"><thead><tr><th>��</th><th style="text-align:right">���� ���</th><th style="text-align:right">�߰� ��� �Է�</th><th>��� ��</th></tr></thead><tbody>${tableRows}</tbody></table>
  </div>
  <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:12px">?? �Է� �հ谡 ���� ��� ���� ����� �ʰ��� �� �����ϴ�.</div>
  <button onclick="_showDistConfirmModal()" class="bo-btn-primary" style="width:100%;padding:14px;font-size:14px">?? ��� ���� Ȯ�� �� �̰� Ȯ��</button>
</div>
<script>(function(){
  window._ddRows = ${JSON.stringify(allRows)};
  window._ddAbId = '${ab.id}';
  window._ddMaxAmount = ${teamDistributable};
  window._ddCurrentLevel = 1;
})();</script>`;
}

// ���� ������ �ܾ� �ǽð� ��� ��������������������������������������������������������������������������������������������������������
function calcDDRemain() {
  const rows = window._ddRows || [];
  let total = 0;
  rows.forEach(r => { total += Number(document.getElementById(r.inputId)?.value || 0); });
  const remain = (window._ddMaxAmount || 0) - total;
  const el = document.getElementById('dd-input-total');
  const rv = document.getElementById('dd-remain-val');
  const rb = document.getElementById('dd-remain-box');
  if (el) el.textContent = boFmt(total) + '��';
  if (rv) { rv.textContent = boFmt(remain) + '��'; rv.style.color = remain < 0 ? '#EF4444' : '#059669'; }
  if (rb) { rb.style.background = remain < 0 ? '#FEE2E2' : '#D1FAE5'; rb.style.borderColor = remain < 0 ? '#FCA5A5' : '#6EE7B7'; }
  rows.forEach(r => {
    const v = Number(document.getElementById(r.inputId)?.value || 0);
    const pv = document.getElementById(r.inputId + '-preview');
    if (pv) pv.textContent = v > 0 ? '�� ' + boFmt((r.currentAlloc||0) + v) + '��' : '';
  });
}

// ���� Ȯ�� Ȯ�� ��� ��������������������������������������������������������������������������������������������������������������������������
function _showDistConfirmModal() {
  const rows = window._ddRows || [];
  const maxAmt = window._ddMaxAmount || 0;
  const abId = window._ddAbId;
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  let total = 0;
  const lines = [];
  rows.forEach(r => {
    const v = Number(document.getElementById(r.inputId)?.value || 0);
    if (v > 0) { total += v; lines.push({ name: r.name, v, after: (r.currentAlloc||0)+v }); }
  });
  if (total === 0) { alert('��� �ݾ��� 1�� �̻� �Է��ϼ���.'); return; }
  if (total > maxAmt) { alert(`�Է� �հ�(${boFmt(total)}��)�� ��� ���� ���(${boFmt(maxAmt)}��)�� �ʰ��մϴ�.`); return; }
  const acctName = ACCOUNT_MASTER.find(a => a.code === ab?.accountCode)?.name || ab?.accountCode || '';
  const lineHtml = lines.map(l => `<tr><td style="padding:6px 14px;font-size:12px;font-weight:700">${l.name}</td><td style="text-align:right;color:#059669;font-weight:700;font-size:12px">+${boFmt(l.v)}��</td><td style="text-align:right;font-size:12px;color:#1D4ED8;font-weight:900">${boFmt(l.after)}��</td></tr>`).join('');
  const overlay = document.createElement('div');
  overlay.id = 'dd-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:28px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <span style="font-size:24px">??</span>
      <div><div style="font-weight:900;font-size:16px">��� �̰� Ȯ��</div><div style="font-size:11px;color:#6B7280">����: ${acctName}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#F9FAFB"><th style="padding:6px 14px;text-align:left;font-size:11px;color:#6B7280">���</th><th style="text-align:right;font-size:11px;color:#6B7280">�߰� ���</th><th style="text-align:right;font-size:11px;color:#6B7280">��� �� �Ѿ�</th></tr></thead>
      <tbody>${lineHtml}</tbody>
      <tfoot><tr style="background:#F0FDF4;border-top:2px solid #BBF7D0"><td style="padding:8px 14px;font-weight:900;font-size:12px">�հ�</td><td style="text-align:right;font-weight:900;color:#059669;font-size:14px">+${boFmt(total)}��</td><td style="text-align:right;font-size:12px;color:#6B7280">�ܿ�: ${boFmt(maxAmt-total)}��</td></tr></tfoot>
    </table>
    <div style="background:#FEF3C7;border-radius:10px;padding:10px 14px;font-size:12px;color:#92400E;margin-bottom:16px">?? �̰� Ȯ�� �Ŀ��� ȸ�� ������θ� ���� �����մϴ�.</div>
    <div style="display:flex;gap:10px">
      <button onclick="document.getElementById('dd-confirm-overlay').remove()" style="flex:1;padding:12px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-weight:700;font-size:13px">���</button>
      <button onclick="_submitDDDist()" class="bo-btn-primary" style="flex:2;padding:12px;font-size:13px">? �̰� Ȯ��</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

// ���� DB ���� (submitBulkDist ���� ����) ����������������������������������������������������������������������������
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
      const { data: bankbooks } = await sb.from('org_budget_bankbooks').select('id,org_id,org_name,account_id').eq('tenant_id', ab.tenantId).or('bb_status.eq.active,bb_status.is.null');
      const { data: accts } = await sb.from('budget_accounts').select('id,code').eq('code', ab.accountCode).eq('tenant_id', ab.tenantId).eq('active', true).limit(1);
      const dbAccountId = accts?.[0]?.id;
      for (const r of rows) {
        const v = Number(document.getElementById(r.inputId)?.value || 0);
        if (v <= 0) continue;
        const bb = (bankbooks||[]).find(b => (b.org_name === r.name || b.org_name.includes(r.name) || r.name.includes(b.org_name)) && (dbAccountId ? b.account_id === dbAccountId : true));
        if (!bb) { errors.push(r.name); }
        else {
          const { data: existing } = await sb.from('budget_allocations').select('id,allocated_amount').eq('bankbook_id', bb.id).order('updated_at',{ascending:false}).limit(1);
          const ex = existing?.[0];
          if (ex) { await sb.from('budget_allocations').update({ allocated_amount: Number(ex.allocated_amount)+v, updated_at: new Date().toISOString() }).eq('id', ex.id); }
          else { await sb.from('budget_allocations').insert({ bankbook_id: bb.id, allocated_amount: v, used_amount: 0, frozen_amount: 0 }); }
        }
        const td = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === r.name);
        if (td) { td.allocAmount += v; } else { TEAM_DIST.push({ id: `TD${Date.now()}_${Math.random().toString(36).slice(2)}`, accountBudgetId: abId, teamName: r.name, allocAmount: v, spent: 0, reserved: 0 }); }
        lines.push(`${r.name}: +${boFmt(v)}��${bb?'':' (?DB�̹ݿ�)'}`);
      }
    } catch(e) { console.error('[DD���] DB����:', e.message); }
  } else {
    rows.forEach(r => {
      const v = Number(document.getElementById(r.inputId)?.value || 0);
      if (v <= 0) return;
      const td = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === r.name);
      if (td) { td.allocAmount += v; } else { TEAM_DIST.push({ id: `TD${Date.now()}`, accountBudgetId: abId, teamName: r.name, allocAmount: v, spent: 0, reserved: 0 }); }
      lines.push(`${r.name}: +${boFmt(v)}��`);
    });
  }
  let msg = `? ��� �Ϸ�!\n\n${lines.join('\n')}\n\n�� ���: ${boFmt(total)}��`;
  if (errors.length) msg += `\n\n? ���� �̸�Ī: ${errors.join(', ')}`;
  alert(msg);
  _ddLevel = 0;
  showAllocTabByIdx(0);
}

// ���� ȸ�� ��� ������������������������������������������������������������������������������������������������������������������������������������
function _showRecallModal(abId, orgId, orgName) {
  const ab = ACCOUNT_BUDGETS.find(x => x.id === abId);
  const orgTd = TEAM_DIST.find(t => t.accountBudgetId === abId && t.teamName === orgName);
  if (!orgTd || orgTd.allocAmount <= 0) { alert('ȸ���� ��� �ݾ��� �����ϴ�.'); return; }
  const minKeep = (orgTd.spent||0) + (orgTd.reserved||0);
  const maxRecall = orgTd.allocAmount - minKeep;
  if (maxRecall <= 0) { alert(`����/������ �ݾ�(${boFmt(minKeep)}��) �̻����� ȸ���� �� �����ϴ�.`); return; }
  const overlay = document.createElement('div');
  overlay.id = 'dd-recall-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px"><span style="font-size:24px">??</span><div><div style="font-weight:900;font-size:16px;color:#DC2626">���� ȸ��</div><div style="font-size:11px;color:#6B7280">${orgName}</div></div></div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:12px;color:#991B1B">
      <div>���� ���: <b>${boFmt(orgTd.allocAmount)}��</b></div>
      <div>����+������: <b>${boFmt(minKeep)}��</b> (ȸ�� �Ұ�)</div>
      <div style="margin-top:4px;font-weight:900">�ִ� ȸ�� ����: <span style="color:#DC2626">${boFmt(maxRecall)}��</span></div>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">ȸ�� �ݾ� *</label>
      <div style="position:relative"><input type="number" id="dd-recall-amt" placeholder="0" max="${maxRecall}" min="1" oninput="previewAmt('dd-recall-amt','dd-recall-preview')" style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:12px 40px 12px 14px;font-size:18px;font-weight:900"/><span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#9CA3AF;font-weight:700">��</span></div>
      <div id="dd-recall-preview" style="font-size:12px;color:#DC2626;font-weight:700;margin-top:4px;text-align:right"></div>
    </div>
    <div style="display:flex;gap:10px">
      <button onclick="document.getElementById('dd-recall-overlay').remove()" style="flex:1;padding:12px;border:1.5px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;font-weight:700">���</button>
      <button onclick="_submitDDRecall('${abId}','${orgName}',${maxRecall})" style="flex:2;padding:12px;background:#DC2626;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:900;font-size:13px">?? ȸ�� Ȯ��</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

async function _submitDDRecall(abId, orgName, maxRecall) {
  const amt = Number(document.getElementById('dd-recall-amt')?.value || 0);
  if (amt <= 0 || amt > maxRecall) { alert(`1�� �̻� ${boFmt(maxRecall)}�� ���Ϸ� �Է��ϼ���.`); return; }
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
      const bb = (bankbooks||[]).find(b => (b.org_name === orgName || b.org_name.includes(orgName) || orgName.includes(b.org_name)) && (dbAccountId ? b.account_id === dbAccountId : true));
      if (bb) {
        const { data: existing } = await sb.from('budget_allocations').select('id,allocated_amount').eq('bankbook_id', bb.id).order('updated_at',{ascending:false}).limit(1);
        const ex = existing?.[0];
        if (ex) await sb.from('budget_allocations').update({ allocated_amount: Math.max(0, Number(ex.allocated_amount)-amt), updated_at: new Date().toISOString() }).eq('id', ex.id);
      }
    } catch(e) { console.error('[DDȸ��] DB����:', e.message); }
      // Bug 2 Fix: account_budgets.balance 재계산
      const newTotal = ab.baseAmount + ab.totalAdded;
      await _syncBudgetAllocations(sb, ab, newTotal, ab.usedAmount || 0, ab.fiscalYear || new Date().getFullYear());
  }
  alert(`? ȸ�� �Ϸ�!\n${orgName}���� ${boFmt(amt)}�� ȸ����`);
  showAllocTabByIdx(2);
}

