// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ P7: 통장 간 이관 + P8: 조직개편 이관
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 예산배정 화면에 이관 버튼 자동 삽입 ──
(function() {
  const _origRender = typeof renderBoAllocation === 'function' ? renderBoAllocation : null;
  if (!_origRender) return;

  const _patchedRender = async function() {
    await _origRender();
    // 기존 렌더 완료 후 이관 버튼 삽입
    setTimeout(() => {
      const tabs = document.getElementById('alloc-tabs');
      if (!tabs || document.getElementById('alloc-transfer-btns')) return;

      const btnWrap = document.createElement('div');
      btnWrap.id = 'alloc-transfer-btns';
      btnWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:16px';
      btnWrap.innerHTML = `
        <button onclick="_allocShowTransferModal()" style="padding:8px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:white;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.2);transition:transform .15s"
          onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
          🔄 통장 간 이관
        </button>
        <button onclick="_allocShowOrgTransferModal()" style="padding:8px 18px;border-radius:10px;border:1.5px solid #DC2626;background:#FEF2F2;color:#DC2626;font-size:12px;font-weight:900;cursor:pointer;transition:transform .15s"
          onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
          🏢 조직개편 이관
        </button>`;
      tabs.parentElement.insertBefore(btnWrap, tabs);
    }, 100);
  };

  // 전역 함수 덮어쓰기
  window.renderBoAllocation = _patchedRender;
})();

// ── P7: 통장 이관 모달 ──
function _allocShowTransferModal() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const existing = document.getElementById('alloc-transfer-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'alloc-transfer-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:560px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2)">
    <div style="padding:24px 28px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#111827">🔄 통장 간 예산 이관</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#6B7280">같은 예산계정 내에서만 이관 가능 · 전액/부분 이관 지원</p>
      </div>
      <button onclick="document.getElementById('alloc-transfer-modal').remove()" style="width:32px;height:32px;border-radius:8px;border:1px solid #E5E7EB;background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <div style="padding:24px 28px" id="alloc-transfer-body">
      <div style="padding:40px;text-align:center;color:#9CA3AF">
        <div style="font-size:32px;margin-bottom:8px">⏳</div>
        통장 목록 로딩 중...
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  _allocLoadTransferBankbooks();
}

async function _allocLoadTransferBankbooks() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const body = document.getElementById('alloc-transfer-body');
  if (!body) return;

  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  try {
    const { data: bankbooks } = await sb
      .from('org_budget_bankbooks')
      .select('id,org_name,org_id,account_id,vorg_group_id,balance,status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('org_name');

    const { data: accounts } = await sb
      .from('budget_accounts')
      .select('id,name,code')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    const acctMap = {};
    (accounts || []).forEach(a => { acctMap[a.id] = a; });

    const bbs = (bankbooks || []).filter(b => Number(b.balance || 0) >= 0);
    const options = bbs.map(b => {
      const acct = acctMap[b.account_id] || {};
      return `<option value="${b.id}" data-account="${b.account_id}" data-balance="${b.balance || 0}">${b.org_name} — ${acct.name || ''} (잔액: ${Number(b.balance || 0).toLocaleString()}원)</option>`;
    }).join('');

    body.innerHTML = `
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📤 출금 통장 (From)</label>
      <select id="tf-from" onchange="_allocTransferCheckAccount()" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px">
        <option value="">선택하세요</option>
        ${options}
      </select>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📥 입금 통장 (To)</label>
      <select id="tf-to" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px">
        <option value="">선택하세요</option>
        ${options}
      </select>
    </div>
    <div id="tf-account-warn" style="display:none;margin-bottom:12px;padding:8px 14px;border-radius:8px;background:#FEE2E2;color:#DC2626;font-size:11px;font-weight:700">
      ⚠️ 같은 예산계정 내에서만 이관 가능합니다.
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">💰 이관 금액</label>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="number" id="tf-amount" min="0" placeholder="이관할 금액 입력" style="flex:1;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:14px;font-weight:800;text-align:right">
        <button onclick="_allocTransferFull()" style="padding:8px 14px;border-radius:8px;border:1.5px solid #7C3AED;background:#F5F3FF;color:#7C3AED;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap">전액 이관</button>
      </div>
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📝 이관 사유</label>
      <input type="text" id="tf-reason" placeholder="이관 사유 입력" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;box-sizing:border-box">
    </div>
    <button onclick="_allocExecuteTransfer()" style="width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:white;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(124,58,237,.3)">
      🔄 이관 실행
    </button>`;
  } catch (err) {
    body.innerHTML = `<div style="padding:20px;color:#EF4444;text-align:center">❌ 로드 실패: ${err.message}</div>`;
  }
}

function _allocTransferCheckAccount() {
  const from = document.getElementById('tf-from');
  const to = document.getElementById('tf-to');
  const warn = document.getElementById('tf-account-warn');
  if (!from || !to || !warn) return;
  const fromAcct = from.selectedOptions[0]?.dataset?.account;
  const toAcct = to.selectedOptions[0]?.dataset?.account;
  if (fromAcct && toAcct && fromAcct !== toAcct) {
    warn.style.display = 'block';
  } else {
    warn.style.display = 'none';
  }
}

function _allocTransferFull() {
  const from = document.getElementById('tf-from');
  const amtInput = document.getElementById('tf-amount');
  if (!from || !amtInput) return;
  const bal = Number(from.selectedOptions[0]?.dataset?.balance || 0);
  amtInput.value = bal;
}

async function _allocExecuteTransfer() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const fromId = document.getElementById('tf-from')?.value;
  const toId = document.getElementById('tf-to')?.value;
  const amount = parseInt(document.getElementById('tf-amount')?.value || 0);
  const reason = document.getElementById('tf-reason')?.value || '';

  if (!fromId || !toId) { alert('출금/입금 통장을 모두 선택하세요.'); return; }
  if (fromId === toId) { alert('같은 통장으로는 이관할 수 없습니다.'); return; }
  if (amount <= 0) { alert('이관 금액을 입력하세요.'); return; }

  // 같은 계정 체크
  const fromAcct = document.getElementById('tf-from')?.selectedOptions[0]?.dataset?.account;
  const toAcct = document.getElementById('tf-to')?.selectedOptions[0]?.dataset?.account;
  if (fromAcct !== toAcct) { alert('⚠️ 같은 예산계정 내에서만 이관할 수 있습니다.'); return; }

  const fromBal = Number(document.getElementById('tf-from')?.selectedOptions[0]?.dataset?.balance || 0);
  if (amount > fromBal) { alert(`⚠️ 출금 통장 잔액(${fromBal.toLocaleString()}원)을 초과합니다.`); return; }

  const fromName = document.getElementById('tf-from')?.selectedOptions[0]?.text || '';
  const toName = document.getElementById('tf-to')?.selectedOptions[0]?.text || '';
  if (!confirm(`통장 이관 확인\n\n📤 출금: ${fromName}\n📥 입금: ${toName}\n💰 금액: ${amount.toLocaleString()}원\n📝 사유: ${reason}\n\n실행하시겠습니까?`)) return;

  try {
    // 1. 출금 통장 잔액 차감
    const { data: fromBB } = await sb.from('org_budget_bankbooks').select('balance').eq('id', fromId).single();
    const newFromBal = Number(fromBB.balance) - amount;
    await sb.from('org_budget_bankbooks').update({ balance: newFromBal, updated_at: new Date().toISOString() }).eq('id', fromId);

    // 2. 입금 통장 잔액 증가
    const { data: toBB } = await sb.from('org_budget_bankbooks').select('balance').eq('id', toId).single();
    const newToBal = Number(toBB.balance) + amount;
    await sb.from('org_budget_bankbooks').update({ balance: newToBal, updated_at: new Date().toISOString() }).eq('id', toId);

    // 3. 이관 로그 기록
    const tenantId = boCurrentPersona?.tenantId || 'HMC';
    const performer = boCurrentPersona?.name || 'admin';
    await sb.from('budget_usage_log').insert([
      { tenant_id: tenantId, bankbook_id: fromId, action: 'transfer_out', amount: -amount, prev_balance: Number(fromBB.balance), new_balance: newFromBal, reason: `이관(출): ${reason}`, performed_by: performer },
      { tenant_id: tenantId, bankbook_id: toId, action: 'transfer_in', amount: amount, prev_balance: Number(toBB.balance), new_balance: newToBal, reason: `이관(입): ${reason}`, performed_by: performer },
    ]);

    alert(`✅ 이관 완료!\n📤 ${fromName}: ${newFromBal.toLocaleString()}원\n📥 ${toName}: ${newToBal.toLocaleString()}원`);
    document.getElementById('alloc-transfer-modal')?.remove();
    if (typeof renderBoAllocation === 'function') renderBoAllocation();
  } catch (err) {
    alert('❌ 이관 실패: ' + err.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ★ P8: 조직개편 이관
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function _allocShowOrgTransferModal() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const existing = document.getElementById('alloc-org-transfer-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'alloc-org-transfer-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
  <div style="background:white;border-radius:20px;width:620px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.2)">
    <div style="padding:24px 28px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#111827">🏢 조직개편 예산 이관</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#6B7280">해체/통합 조직의 예산을 다른 조직으로 이관 · 이력 자동 기록</p>
      </div>
      <button onclick="document.getElementById('alloc-org-transfer-modal').remove()" style="width:32px;height:32px;border-radius:8px;border:1px solid #E5E7EB;background:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
    </div>

    <div style="padding:24px 28px" id="alloc-org-transfer-body">
      <div style="padding:40px;text-align:center;color:#9CA3AF">
        <div style="font-size:32px;margin-bottom:8px">⏳</div>
        조직 목록 로딩 중...
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  _allocLoadOrgTransferData();
}

async function _allocLoadOrgTransferData() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const body = document.getElementById('alloc-org-transfer-body');
  if (!body) return;

  const tenantId = boCurrentPersona?.tenantId || 'HMC';

  try {
    // 통장 목록 (조직별)
    const { data: bankbooks } = await sb
      .from('org_budget_bankbooks')
      .select('id,org_name,org_id,account_id,vorg_group_id,balance,status')
      .eq('tenant_id', tenantId)
      .order('org_name');

    const { data: accounts } = await sb
      .from('budget_accounts')
      .select('id,name,code')
      .eq('tenant_id', tenantId);

    const acctMap = {};
    (accounts || []).forEach(a => { acctMap[a.id] = a; });

    // 조직별 그룹핑
    const orgMap = {};
    (bankbooks || []).forEach(b => {
      const key = b.org_name || b.org_id;
      if (!orgMap[key]) orgMap[key] = { org_name: b.org_name, org_id: b.org_id, bankbooks: [] };
      orgMap[key].bankbooks.push(b);
    });

    const orgList = Object.values(orgMap).sort((a, b) => (a.org_name || '').localeCompare(b.org_name || ''));
    const fromOptions = orgList.map(o => {
      const totalBal = o.bankbooks.reduce((s, b) => s + Number(b.balance || 0), 0);
      return `<option value="${o.org_id}" data-name="${o.org_name}">${o.org_name} (통장 ${o.bankbooks.length}개, 잔액 ${totalBal.toLocaleString()}원)</option>`;
    }).join('');
    const toOptions = orgList.map(o => `<option value="${o.org_id}" data-name="${o.org_name}">${o.org_name}</option>`).join('');

    // 이관 이력 로드
    let historyHtml = '';
    try {
      const { data: logs } = await sb.from('org_transfer_log').select('*')
        .eq('tenant_id', tenantId).order('transferred_at', { ascending: false }).limit(10);
      if (logs && logs.length > 0) {
        const logRows = logs.map(l => `
          <tr style="border-bottom:1px solid #F3F4F6">
            <td style="padding:6px 8px;font-size:10px;color:#6B7280">${new Date(l.transferred_at).toLocaleString('ko-KR')}</td>
            <td style="padding:6px 8px;font-size:11px;font-weight:700">${l.from_org_name || ''} → ${l.to_org_name || ''}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:right;font-weight:800;color:#7C3AED">${Number(l.amount || 0).toLocaleString()}원</td>
            <td style="padding:6px 8px;font-size:10px;color:#9CA3AF">${l.performed_by || ''}</td>
          </tr>`).join('');
        historyHtml = `
        <div style="margin-top:20px">
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">📋 최근 이관 이력</div>
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead><tr style="background:#F9FAFB">
              <th style="padding:6px 8px;text-align:left;font-weight:800;color:#6B7280">일시</th>
              <th style="padding:6px 8px;text-align:left;font-weight:800;color:#6B7280">이관</th>
              <th style="padding:6px 8px;text-align:right;font-weight:800;color:#6B7280">금액</th>
              <th style="padding:6px 8px;text-align:left;font-weight:800;color:#6B7280">처리자</th>
            </tr></thead>
            <tbody>${logRows}</tbody>
          </table>
        </div>`;
      }
    } catch {}

    body.innerHTML = `
    <div style="margin-bottom:12px;padding:10px 16px;border-radius:10px;background:#FEF3C7;border:1.5px solid #FCD34D;font-size:12px;color:#92400E;font-weight:700">
      ⚠️ 조직개편 이관은 해당 조직의 <strong>모든 통장 잔액</strong>을 목적 조직으로 이관합니다.<br>
      이관 후 원본 통장은 <strong>비활성화</strong>됩니다.
    </div>

    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📤 출발 조직 (해체/통합 대상)</label>
      <select id="ot-from" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px">
        <option value="">선택하세요</option>
        ${fromOptions}
      </select>
    </div>
    <div style="margin-bottom:16px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📥 목적 조직 (인수 조직)</label>
      <select id="ot-to" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px">
        <option value="">선택하세요</option>
        ${toOptions}
      </select>
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:12px;font-weight:800;color:#374151;display:block;margin-bottom:6px">📝 이관 사유</label>
      <input type="text" id="ot-reason" placeholder="예: 2026년 상반기 조직개편에 따른 이관" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;box-sizing:border-box">
    </div>
    <button onclick="_allocExecuteOrgTransfer()" style="width:100%;padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg,#DC2626,#B91C1C);color:white;font-size:14px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(220,38,38,.3)">
      🏢 조직개편 이관 실행
    </button>
    ${historyHtml}`;
  } catch (err) {
    body.innerHTML = `<div style="padding:20px;color:#EF4444;text-align:center">❌ 로드 실패: ${err.message}</div>`;
  }
}

async function _allocExecuteOrgTransfer() {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const fromOrgId = document.getElementById('ot-from')?.value;
  const toOrgId = document.getElementById('ot-to')?.value;
  const reason = document.getElementById('ot-reason')?.value || '';
  const fromName = document.getElementById('ot-from')?.selectedOptions[0]?.dataset?.name || '';
  const toName = document.getElementById('ot-to')?.selectedOptions[0]?.dataset?.name || '';

  if (!fromOrgId || !toOrgId) { alert('출발/목적 조직을 모두 선택하세요.'); return; }
  if (fromOrgId === toOrgId) { alert('같은 조직으로는 이관할 수 없습니다.'); return; }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const performer = boCurrentPersona?.name || 'admin';

  try {
    // 1. 출발 조직의 모든 활성 통장 조회
    const { data: fromBBs } = await sb.from('org_budget_bankbooks')
      .select('*').eq('tenant_id', tenantId).eq('org_id', fromOrgId).eq('status', 'active');

    if (!fromBBs || fromBBs.length === 0) {
      alert('⚠️ 출발 조직에 활성 통장이 없습니다.');
      return;
    }

    const totalAmount = fromBBs.reduce((s, b) => s + Number(b.balance || 0), 0);

    if (!confirm(`🏢 조직개편 이관 확인\n\n📤 출발: ${fromName} (통장 ${fromBBs.length}개)\n📥 목적: ${toName}\n💰 총 이관액: ${totalAmount.toLocaleString()}원\n📝 사유: ${reason}\n\n⚠️ 출발 조직의 모든 통장이 비활성화됩니다.\n실행하시겠습니까?`)) return;

    // 2. 계정별로 이관 처리
    for (const fromBB of fromBBs) {
      const bal = Number(fromBB.balance || 0);
      if (bal <= 0) continue;

      // 목적 조직의 같은 계정 통장 찾기/생성
      let { data: toBBs } = await sb.from('org_budget_bankbooks')
        .select('*').eq('tenant_id', tenantId).eq('org_id', toOrgId)
        .eq('account_id', fromBB.account_id).eq('status', 'active');

      let toBB = toBBs?.[0];
      if (!toBB) {
        // 통장 자동 생성
        const { data: newBB } = await sb.from('org_budget_bankbooks').insert({
          tenant_id: tenantId, org_id: toOrgId, org_name: toName,
          account_id: fromBB.account_id, vorg_group_id: fromBB.vorg_group_id,
          template_id: fromBB.template_id, balance: 0, status: 'active',
        }).select().single();
        toBB = newBB;
      }

      // 잔액 이관
      const newToBal = Number(toBB.balance || 0) + bal;
      await sb.from('org_budget_bankbooks').update({
        balance: newToBal, updated_at: new Date().toISOString()
      }).eq('id', toBB.id);

      // 출발 통장 비활성화
      await sb.from('org_budget_bankbooks').update({
        balance: 0, status: 'inactive', updated_at: new Date().toISOString()
      }).eq('id', fromBB.id);

      // 사용 로그
      await sb.from('budget_usage_log').insert([
        { tenant_id: tenantId, bankbook_id: fromBB.id, action: 'transfer_out', amount: -bal, prev_balance: bal, new_balance: 0, reason: `조직개편 이관(출): ${fromName}→${toName} ${reason}`, performed_by: performer },
        { tenant_id: tenantId, bankbook_id: toBB.id, action: 'transfer_in', amount: bal, prev_balance: Number(toBB.balance || 0), new_balance: newToBal, reason: `조직개편 이관(입): ${fromName}→${toName} ${reason}`, performed_by: performer },
      ]);
    }

    // 3. org_transfer_log 이력
    await sb.from('org_transfer_log').insert({
      tenant_id: tenantId,
      from_org_id: fromOrgId, from_org_name: fromName,
      to_org_id: toOrgId, to_org_name: toName,
      amount: totalAmount,
      reason: reason,
      performed_by: performer,
      transferred_at: new Date().toISOString(),
    });

    // 4. 교육계획 이관 (plans.transferred_from_org 기록)
    await sb.from('plans').update({
      transferred_from_org: fromName,
      transferred_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('tenant_id', tenantId).eq('org_id', fromOrgId).is('deleted_at', null);

    alert(`✅ 조직개편 이관 완료!\n\n${fromName} → ${toName}\n이관 통장: ${fromBBs.length}개\n총 이관액: ${totalAmount.toLocaleString()}원\n\n출발 조직 통장은 비활성화되었습니다.`);
    document.getElementById('alloc-org-transfer-modal')?.remove();
    if (typeof renderBoAllocation === 'function') renderBoAllocation();
  } catch (err) {
    alert('❌ 조직개편 이관 실패: ' + err.message);
  }
}
