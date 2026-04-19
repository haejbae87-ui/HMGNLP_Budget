// ─── bo_budget_carryover.js — P7: 조직 간 예산 이월 ──────────────────────────
// 기능 1: 팀 간 예산 이관 (bankbooks 직접 참조)
// 기능 2: 연도 말 잔액 이월 (carryover to next fiscal year)
// 기능 3: 이관/이월 이력 → submission_documents 영구 저장

// ── 이관 화면 렌더링 ──────────────────────────────────────────────────────────
async function renderBudgetCarryover() {
  const el = document.getElementById('bo-content');
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const year = new Date().getFullYear();

  el.innerHTML = '<div style="padding:40px;text-align:center;color:#9CA3AF"><div style="font-size:32px">⏳</div>로딩 중...</div>';

  // 활성 bankbooks 로드
  let bks = [];
  try {
    const { data } = await sb.from('bankbooks')
      .select('id,org_id,org_name,account_code,fiscal_year,current_balance,frozen_amount,status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('org_name');
    bks = data || [];
  } catch(e) { bks = []; }

  // 이관 이력 로드 (최근 20건)
  let logs = [];
  try {
    const { data } = await sb.from('submission_documents')
      .select('id,doc_type,submitter_name,org_name,submitted_at,metadata')
      .eq('tenant_id', tenantId)
      .in('doc_type', ['budget_transfer', 'budget_carryover'])
      .order('submitted_at', { ascending: false })
      .limit(20);
    logs = data || [];
  } catch(e) { logs = []; }

  const acctCodes = [...new Set(bks.map(b => b.account_code))];
  const orgNames  = [...new Set(bks.map(b => b.org_name).filter(Boolean))];

  const acctOpts = acctCodes.map(c => `<option value="${c}">${c}</option>`).join('');
  const orgOpts  = orgNames.map(n => `<option value="${n}">${n}</option>`).join('');

  const logRows = logs.map(l => {
    const m = l.metadata || {};
    const isTransfer = l.doc_type === 'budget_transfer';
    return `<tr>
      <td><span style="font-size:10px;font-weight:900;padding:2px 8px;border-radius:6px;
        background:${isTransfer ? '#DBEAFE' : '#FEF3C7'};
        color:${isTransfer ? '#1E40AF' : '#92400E'}">${isTransfer ? '이관' : '이월'}</span></td>
      <td style="font-size:11px">${(l.submitted_at||'').slice(0,10)}</td>
      <td style="font-size:11px">${l.submitter_name||'-'}</td>
      <td style="font-size:11px">${m.from_org||'-'} → ${m.to_org||'-'}</td>
      <td style="text-align:right;font-weight:800">${(m.amount||0).toLocaleString()}원</td>
      <td style="font-size:11px;color:#6B7280">${m.reason||'-'}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
  <div class="bo-fade">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
      <div>
        <h1 class="bo-page-title">↔ 조직 간 예산 이관/이월</h1>
        <p class="bo-page-sub">팀 간 잔액 이관 및 연도 말 잔액 이월 처리</p>
      </div>
    </div>

    <!-- 탭 -->
    <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid #E5E7EB">
      <button id="p7-tab-transfer" onclick="_p7ShowTab('transfer')"
        style="padding:10px 20px;border:none;background:none;font-size:13px;font-weight:900;
               color:#7C3AED;border-bottom:2.5px solid #7C3AED;cursor:pointer">↔ 팀 간 이관</button>
      <button id="p7-tab-carryover" onclick="_p7ShowTab('carryover')"
        style="padding:10px 20px;border:none;background:none;font-size:13px;font-weight:700;
               color:#6B7280;border-bottom:2.5px solid transparent;cursor:pointer">📅 연도 이월</button>
    </div>

    <!-- 팀 간 이관 패널 -->
    <div id="p7-panel-transfer">
      <div class="bo-card" style="padding:24px;max-width:700px;margin-bottom:20px">
        <div style="font-size:14px;font-weight:900;color:#374151;margin-bottom:16px">↔ 팀 간 잔액 이관</div>
        <div style="display:grid;gap:14px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">계정 코드 *</label>
            <select id="p7-acct" onchange="_p7UpdateOrgs()" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
              <option value="">— 계정 선택 —</option>${acctOpts}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center">
            <div>
              <label style="font-size:11px;font-weight:700;color:#EF4444;display:block;margin-bottom:6px">From (출처 팀) *</label>
              <select id="p7-from" style="width:100%;border:1.5px solid #FECACA;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700">
                <option>— 계정 먼저 선택 —</option>
              </select>
              <div id="p7-from-bal" style="font-size:10px;color:#6B7280;margin-top:4px"></div>
            </div>
            <div style="font-size:24px;color:#9CA3AF;text-align:center;margin-top:18px">→</div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#059669;display:block;margin-bottom:6px">To (수신 팀) *</label>
              <select id="p7-to" style="width:100%;border:1.5px solid #BBF7D0;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:700">
                <option>— 계정 먼저 선택 —</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">이관 금액 *</label>
            <div style="position:relative">
              <input type="number" id="p7-amount" min="0" placeholder="0"
                style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:12px 50px 12px 16px;font-size:18px;font-weight:900"/>
              <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:13px;font-weight:700;color:#9CA3AF">원</span>
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">이관 사유 *</label>
            <textarea id="p7-reason" rows="3" placeholder="조직 개편, 예산 부족, 사업 계획 변경 등"
              style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
          </div>
          <button onclick="_p7SubmitTransfer()"
            style="padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#7C3AED,#4F46E5);
                   color:white;font-size:13px;font-weight:900;cursor:pointer">↔ 이관 처리</button>
        </div>
      </div>
    </div>

    <!-- 연도 이월 패널 -->
    <div id="p7-panel-carryover" style="display:none">
      <div class="bo-card" style="padding:24px;max-width:700px;margin-bottom:20px">
        <div style="font-size:14px;font-weight:900;color:#374151;margin-bottom:8px">📅 연도 말 잔액 이월</div>
        <p style="font-size:12px;color:#6B7280;margin-bottom:16px">
          ${year}년 잔여 예산을 ${year+1}년 통장으로 이월합니다.<br>
          이월 시 기존 통장은 <code style="background:#F3F4F6;padding:2px 6px;border-radius:4px">closed</code>로 전환되고, 신규 통장이 생성됩니다.
        </p>
        <div style="display:grid;gap:14px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">이월 대상 계정</label>
            <select id="p7-cy-acct" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
              <option value="">전체 계정</option>${acctOpts}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">이월 팀</label>
            <select id="p7-cy-org" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
              <option value="">전체 팀</option>${orgOpts}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#6B7280;display:block;margin-bottom:6px">이월 사유</label>
            <textarea id="p7-cy-reason" rows="2" placeholder="${year}년 잔여예산 ${year+1}년 이월"
              style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;resize:none;font-family:inherit"></textarea>
          </div>

          <!-- 이월 대상 미리보기 -->
          <div id="p7-cy-preview" style="background:#F9FAFB;border-radius:10px;padding:14px">
            <div style="font-size:12px;font-weight:900;color:#374151;margin-bottom:8px">이월 대상 미리보기</div>
            <table class="bo-table" style="font-size:11px">
              <thead><tr>
                <th>팀</th><th>계정</th>
                <th style="text-align:right">현재 잔액</th>
                <th style="text-align:right">동결</th>
                <th style="text-align:right">이월 가능액</th>
              </tr></thead>
              <tbody>
                ${bks.filter(b => Number(b.current_balance) > 0).map(b => {
                  const avail = Math.max(0, Number(b.current_balance) - Number(b.frozen_amount||0));
                  return `<tr>
                    <td>${b.org_name||'-'}</td>
                    <td><code style="font-size:9px;background:#E5E7EB;padding:1px 5px;border-radius:3px">${b.account_code}</code></td>
                    <td style="text-align:right">${Number(b.current_balance).toLocaleString()}원</td>
                    <td style="text-align:right;color:#D97706">${Number(b.frozen_amount||0).toLocaleString()}원</td>
                    <td style="text-align:right;font-weight:800;color:#059669">${avail.toLocaleString()}원</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
          <button onclick="_p7SubmitCarryover()"
            style="padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#059669,#047857);
                   color:white;font-size:13px;font-weight:900;cursor:pointer">📅 이월 실행</button>
        </div>
      </div>
    </div>

    <!-- 이관/이월 이력 -->
    <div class="bo-card" style="overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6">
        <span style="font-size:14px;font-weight:900;color:#374151">📋 이관/이월 이력 (최근 20건)</span>
      </div>
      ${logs.length > 0 ? `
      <table class="bo-table" style="font-size:12px">
        <thead><tr>
          <th>유형</th><th>일자</th><th>처리자</th><th>경로</th>
          <th style="text-align:right">금액</th><th>사유</th>
        </tr></thead>
        <tbody>${logRows}</tbody>
      </table>` : `<div style="padding:40px;text-align:center;color:#9CA3AF">이관/이월 이력이 없습니다</div>`}
    </div>
  </div>`;

  // bankbooks를 window에 캐시
  window._p7Bankbooks = bks;
}

// ── 탭 전환 ──────────────────────────────────────────────────────────────────
function _p7ShowTab(tab) {
  ['transfer','carryover'].forEach(t => {
    document.getElementById(`p7-panel-${t}`).style.display = t === tab ? '' : 'none';
    const btn = document.getElementById(`p7-tab-${t}`);
    if (btn) {
      btn.style.color       = t === tab ? '#7C3AED' : '#6B7280';
      btn.style.fontWeight  = t === tab ? '900' : '700';
      btn.style.borderBottom = t === tab ? '2.5px solid #7C3AED' : '2.5px solid transparent';
    }
  });
}

// ── 계정 선택 시 팀 드롭다운 갱신 ───────────────────────────────────────────
function _p7UpdateOrgs() {
  const acct = document.getElementById('p7-acct')?.value;
  const bks  = (window._p7Bankbooks || []).filter(b => !acct || b.account_code === acct);
  const opts = '<option value="">— 팀 선택 —</option>' +
    bks.map(b => `<option value="${b.id}" data-bal="${b.current_balance}" data-frz="${b.frozen_amount||0}">
      ${b.org_name} (잔액: ${Number(b.current_balance).toLocaleString()}원)</option>`).join('');
  const frm = document.getElementById('p7-from');
  const to  = document.getElementById('p7-to');
  if (frm) { frm.innerHTML = opts; frm.onchange = _p7ShowFromBal; }
  if (to)    to.innerHTML  = opts;
}

function _p7ShowFromBal() {
  const sel = document.getElementById('p7-from');
  const opt = sel?.options[sel.selectedIndex];
  const bal = Number(opt?.dataset.bal || 0);
  const frz = Number(opt?.dataset.frz || 0);
  const avail = Math.max(0, bal - frz);
  const el = document.getElementById('p7-from-bal');
  if (el) el.textContent = `잔액 ${bal.toLocaleString()}원 | 동결 ${frz.toLocaleString()}원 | 이관 가능 ${avail.toLocaleString()}원`;
}

// ── 팀 간 이관 실행 ──────────────────────────────────────────────────────────
async function _p7SubmitTransfer() {
  const fromId = document.getElementById('p7-from')?.value;
  const toId   = document.getElementById('p7-to')?.value;
  const amount = Number(document.getElementById('p7-amount')?.value || 0);
  const reason = (document.getElementById('p7-reason')?.value || '').trim();
  const sb = typeof getSB === 'function' ? getSB() : null;

  if (!fromId || !toId || !amount || !reason) { alert('모든 항목을 입력하세요.'); return; }
  if (fromId === toId) { alert('출처와 수신 팀이 같습니다.'); return; }
  if (!sb) { alert('DB 연결 필요'); return; }

  const bks = window._p7Bankbooks || [];
  const fromBk = bks.find(b => b.id === fromId);
  const toBk   = bks.find(b => b.id === toId);
  if (!fromBk || !toBk) { alert('통장 정보를 찾을 수 없습니다.'); return; }

  const avail = Math.max(0, Number(fromBk.current_balance) - Number(fromBk.frozen_amount||0));
  if (amount > avail) { alert(`이관 가능 금액은 ${avail.toLocaleString()}원입니다.`); return; }

  if (!confirm(`↔ 이관 확인\n\n출처: ${fromBk.org_name}\n수신: ${toBk.org_name}\n금액: ${amount.toLocaleString()}원\n사유: ${reason}\n\n실행하시겠습니까?`)) return;

  const btn = document.querySelector('#p7-panel-transfer button');
  if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }

  try {
    // 1. From: current_balance 차감
    const { error: e1 } = await sb.from('bankbooks')
      .update({ current_balance: Number(fromBk.current_balance) - amount, updated_at: new Date().toISOString() })
      .eq('id', fromId);
    if (e1) throw e1;

    // 2. To: current_balance 증가
    const { error: e2 } = await sb.from('bankbooks')
      .update({ current_balance: Number(toBk.current_balance) + amount, updated_at: new Date().toISOString() })
      .eq('id', toId);
    if (e2) throw e2;

    // 3. 이력 기록
    await sb.from('submission_documents').insert({
      tenant_id: boCurrentPersona?.tenantId || 'HMC',
      doc_type: 'budget_transfer',
      submitter_name: boCurrentPersona?.name || 'admin',
      org_name: fromBk.org_name,
      submitted_at: new Date().toISOString(),
      metadata: {
        from_org: fromBk.org_name, from_bk_id: fromId,
        to_org: toBk.org_name,   to_bk_id: toId,
        account_code: fromBk.account_code,
        amount, reason,
        fiscal_year: fromBk.fiscal_year,
      },
    });

    if (typeof _boShowToast === 'function') _boShowToast(`✅ 이관 완료: ${fromBk.org_name} → ${toBk.org_name} ${amount.toLocaleString()}원`, 'success');
    alert(`✅ 이관 완료\n${fromBk.org_name} → ${toBk.org_name}\n${amount.toLocaleString()}원`);
    renderBudgetCarryover();
  } catch(err) {
    alert('❌ 이관 실패: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '↔ 이관 처리'; }
  }
}

// ── 연도 이월 실행 ────────────────────────────────────────────────────────────
async function _p7SubmitCarryover() {
  const acct   = document.getElementById('p7-cy-acct')?.value;
  const orgFilter = document.getElementById('p7-cy-org')?.value;
  const reason = (document.getElementById('p7-cy-reason')?.value || '').trim() ||
    `${new Date().getFullYear()}년 잔여예산 ${new Date().getFullYear()+1}년 이월`;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  const year = new Date().getFullYear();
  let targets = (window._p7Bankbooks || []).filter(b => {
    const avail = Math.max(0, Number(b.current_balance) - Number(b.frozen_amount||0));
    return avail > 0;
  });
  if (acct)      targets = targets.filter(b => b.account_code === acct);
  if (orgFilter) targets = targets.filter(b => b.org_name === orgFilter);

  if (targets.length === 0) { alert('이월 대상 잔액이 없습니다.'); return; }

  const totalAmt = targets.reduce((s, b) => s + Math.max(0, Number(b.current_balance) - Number(b.frozen_amount||0)), 0);
  if (!confirm(`📅 연도 이월 확인\n\n대상: ${targets.length}개 통장\n이월 총액: ${totalAmt.toLocaleString()}원\n${year}년 → ${year+1}년\n\n실행하시겠습니까?`)) return;

  const btn = document.querySelector('#p7-panel-carryover button');
  if (btn) { btn.disabled = true; btn.textContent = `처리 중 (0/${targets.length})...`; }

  let done = 0;
  const errors = [];

  for (const bk of targets) {
    const avail = Math.max(0, Number(bk.current_balance) - Number(bk.frozen_amount||0));
    try {
      // 1. 기존 통장 closed
      await sb.from('bankbooks').update({
        status: 'closed', current_balance: 0, updated_at: new Date().toISOString()
      }).eq('id', bk.id);

      // 2. 신규 통장 생성 (next year)
      const { error: insErr } = await sb.from('bankbooks').insert({
        tenant_id: bk.tenant_id || boCurrentPersona?.tenantId,
        account_code: bk.account_code,
        org_id: bk.org_id,
        org_name: bk.org_name,
        template_id: bk.template_id,
        group_id: bk.group_id,
        fiscal_year: year + 1,
        initial_amount: avail,
        current_balance: avail,
        frozen_amount: 0,
        used_amount: 0,
        status: 'active',
      });
      if (insErr) throw insErr;

      // 3. 이력 기록
      await sb.from('submission_documents').insert({
        tenant_id: bk.tenant_id || boCurrentPersona?.tenantId,
        doc_type: 'budget_carryover',
        submitter_name: boCurrentPersona?.name || 'admin',
        org_name: bk.org_name,
        submitted_at: new Date().toISOString(),
        metadata: {
          from_org: bk.org_name, to_org: bk.org_name,
          account_code: bk.account_code,
          amount: avail, reason,
          from_year: year, to_year: year + 1,
          from_bk_id: bk.id,
        },
      }).catch(e => console.warn('[P7] carryover log skip:', e.message));

      done++;
      if (btn) btn.textContent = `처리 중 (${done}/${targets.length})...`;
    } catch(err) {
      errors.push(`${bk.org_name}: ${err.message}`);
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = '📅 이월 실행'; }
  if (errors.length > 0) {
    alert(`⚠️ 일부 실패 (${done}/${targets.length} 성공)\n\n${errors.slice(0,5).join('\n')}`);
  } else {
    if (typeof _boShowToast === 'function') _boShowToast(`✅ ${done}건 이월 완료 (${totalAmt.toLocaleString()}원 → ${year+1}년)`, 'success');
    alert(`✅ ${done}건 이월 완료\n${totalAmt.toLocaleString()}원 → ${year+1}년`);
  }
  renderBudgetCarryover();
}
