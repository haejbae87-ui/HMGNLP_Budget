// ─── bo_budget_carryover.js — F-G01: 회계연도 마감/이월/개시 ──────────────
// bankbook_fiscal_periods 테이블 기반 연도 전환 프로세스
// 1. 연도 마감 (status: open → closed)
// 2. 잔액 이월 (carried_forward → 신규 fiscal period)
// 3. 신년도 개시 (opening_balance 자동 설정)

// ── 메인 렌더 ──────────────────────────────────────────────────────────────
async function renderBudgetCarryover() {
  const el = document.getElementById('bo-content');
  if (!el) return;
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) { el.innerHTML = '<p style="padding:20px;color:#EF4444">DB 연결 없음</p>'; return; }

  const tenantId = boCurrentPersona?.tenantId || 'HMC';
  const year = new Date().getFullYear();
  const groupBar = typeof boRenderGroupContextBar === 'function' ? boRenderGroupContextBar() : '';

  el.innerHTML = `${groupBar}<div style="padding:60px;text-align:center;color:#9CA3AF"><div style="font-size:32px">⏳</div>회계연도 데이터 로딩 중...</div>`;

  try {
    // 1. 활성 통장 목록
    const { data: bankbooks } = await sb.from('org_budget_bankbooks')
      .select('id,tenant_id,org_name,org_id,account_id,template_id,status,is_org_level,user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('org_name');

    // 2. 회계연도 기간 (현재연도 + 전년도)
    const { data: fiscals } = await sb.from('bankbook_fiscal_periods')
      .select('*')
      .in('fiscal_year', [year, year - 1])
      .order('fiscal_year', { ascending: false });

    // 3. 예산계정 정보
    const { data: accounts } = await sb.from('budget_accounts')
      .select('id,name,code')
      .eq('tenant_id', tenantId);

    const acctMap = {};
    (accounts || []).forEach(a => { acctMap[a.id] = a; });

    // 현재연도/전년도 fiscal periods 매핑
    const currentFiscals = (fiscals || []).filter(f => f.fiscal_year === year);
    const prevFiscals = (fiscals || []).filter(f => f.fiscal_year === year - 1);
    const bbs = bankbooks || [];

    // 현재연도 fiscal period가 있는 통장
    const currentMap = {};
    currentFiscals.forEach(f => { currentMap[f.bankbook_id] = f; });

    // 전년도 fiscal period가 있는 통장
    const prevMap = {};
    prevFiscals.forEach(f => { prevMap[f.bankbook_id] = f; });

    // 통계
    const openCount = currentFiscals.filter(f => f.status === 'open').length;
    const closedCount = currentFiscals.filter(f => f.status === 'closed').length;
    const totalBalance = currentFiscals.reduce((s, f) => s + Number(f.current_balance || 0), 0);
    const totalUsed = currentFiscals.reduce((s, f) => s + Number(f.total_used || 0), 0);
    const noFiscalCount = bbs.filter(b => !currentMap[b.id]).length;
    const _fmt = v => Number(v || 0).toLocaleString('ko-KR');

    // 통장 상세 테이블 행
    const detailRows = bbs.map(bb => {
      const fp = currentMap[bb.id];
      const acct = acctMap[bb.account_id] || {};
      const prevFp = prevMap[bb.id];
      if (!fp) {
        return `<tr style="border-top:1px solid #F1F5F9;background:#FFFBEB">
          <td style="padding:8px 10px;font-weight:700">${bb.org_name || '-'}</td>
          <td style="padding:8px 6px;font-size:11px">${acct.name || bb.account_id || ''}</td>
          <td style="text-align:center"><span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FEF3C7;color:#92400E;font-weight:800">미등록</span></td>
          <td colspan="4" style="text-align:center;font-size:11px;color:#92400E;padding:8px">
            <button onclick="_fgInitFiscalPeriod('${bb.id}',${year})" style="padding:4px 12px;border-radius:6px;border:1px solid #D97706;background:#FFFBEB;color:#D97706;font-size:10px;font-weight:800;cursor:pointer">📋 ${year}년 개시</button>
          </td>
        </tr>`;
      }
      const statusBadge = fp.status === 'open'
        ? '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#DCFCE7;color:#166534;font-weight:800">🟢 운영중</span>'
        : '<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FEE2E2;color:#991B1B;font-weight:800">🔴 마감</span>';
      const burnRate = fp.burn_rate != null ? `${Number(fp.burn_rate).toFixed(1)}%` : '-';
      return `<tr style="border-top:1px solid #F1F5F9">
        <td style="padding:8px 10px;font-weight:700">${bb.org_name || '-'}</td>
        <td style="padding:8px 6px;font-size:11px">${acct.name || ''}</td>
        <td style="text-align:center">${statusBadge}</td>
        <td style="text-align:right;padding:8px 6px;font-size:11px">${_fmt(fp.opening_balance)}원</td>
        <td style="text-align:right;padding:8px 6px;font-size:11px;color:#DC2626">${_fmt(fp.total_used)}원</td>
        <td style="text-align:right;padding:8px 6px;font-weight:800;color:#7C3AED">${_fmt(fp.current_balance)}원</td>
        <td style="text-align:center;font-size:11px;font-weight:700">${burnRate}</td>
      </tr>`;
    }).join('');

    el.innerHTML = `
    ${groupBar}
    <div style="max-width:1100px;margin:0 auto">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px">
        <div>
          <div class="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">예산 운영 › 회계연도 관리</div>
          <h1 class="text-3xl font-black text-brand tracking-tight">📅 회계연도 마감/이월</h1>
          <p class="text-gray-500 text-sm mt-1">${year}년 회계연도 운영 현황 및 마감·이월 처리</p>
        </div>
      </div>

      <!-- 요약 카드 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        <div style="background:linear-gradient(135deg,#DCFCE7,#BBF7D0);border-radius:16px;padding:16px;border:1.5px solid #86EFAC;position:relative;overflow:hidden">
          <div style="position:absolute;top:10px;right:12px;font-size:18px;opacity:.4">🟢</div>
          <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">운영중</div>
          <div style="font-size:26px;font-weight:900;color:#166534;line-height:1">${openCount}<span style="font-size:11px;margin-left:2px">건</span></div>
        </div>
        <div style="background:linear-gradient(135deg,#FEE2E2,#FECACA);border-radius:16px;padding:16px;border:1.5px solid #FCA5A5;position:relative;overflow:hidden">
          <div style="position:absolute;top:10px;right:12px;font-size:18px;opacity:.4">🔴</div>
          <div style="font-size:10px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">마감완료</div>
          <div style="font-size:26px;font-weight:900;color:#991B1B;line-height:1">${closedCount}<span style="font-size:11px;margin-left:2px">건</span></div>
        </div>
        <div style="background:linear-gradient(135deg,#F3E8FF,#DDD6FE);border-radius:16px;padding:16px;border:1.5px solid #C4B5FD;position:relative;overflow:hidden">
          <div style="position:absolute;top:10px;right:12px;font-size:18px;opacity:.4">💰</div>
          <div style="font-size:10px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">잔액 합계</div>
          <div style="font-size:22px;font-weight:900;color:#7C3AED;line-height:1">${_fmt(totalBalance)}<span style="font-size:10px;margin-left:2px">원</span></div>
        </div>
        <div style="background:linear-gradient(135deg,#FFF7ED,#FED7AA);border-radius:16px;padding:16px;border:1.5px solid #FED7AA;position:relative;overflow:hidden">
          <div style="position:absolute;top:10px;right:12px;font-size:18px;opacity:.4">⚠️</div>
          <div style="font-size:10px;font-weight:700;color:#C2410C;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">미등록</div>
          <div style="font-size:26px;font-weight:900;color:#C2410C;line-height:1">${noFiscalCount}<span style="font-size:11px;margin-left:2px">건</span></div>
        </div>
      </div>

      <!-- 일괄 처리 액션 -->
      <div class="bo-card" style="padding:16px 20px;margin-bottom:20px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span style="font-size:12px;font-weight:900;color:#374151;margin-right:auto">⚡ 일괄 처리</span>
        ${noFiscalCount > 0 ? `<button onclick="_fgBatchInitFiscal(${year})" style="padding:8px 16px;border-radius:10px;border:1.5px solid #D97706;background:#FFFBEB;color:#D97706;font-size:11px;font-weight:800;cursor:pointer">📋 미등록 ${noFiscalCount}건 일괄 개시</button>` : ''}
        ${openCount > 0 ? `<button onclick="_fgBatchClose(${year})" style="padding:8px 16px;border-radius:10px;border:1.5px solid #DC2626;background:#FEF2F2;color:#DC2626;font-size:11px;font-weight:800;cursor:pointer">🔒 ${year}년 일괄 마감</button>` : ''}
        <button onclick="_fgBatchCarryover(${year})" style="padding:8px 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#059669,#047857);color:white;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(5,150,105,.3)">📅 ${year+1}년 이월 실행</button>
      </div>

      <!-- 상세 테이블 -->
      <div class="bo-card" style="padding:0;overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;gap:8px">
          <span style="background:#374151;color:white;font-size:10px;font-weight:900;padding:3px 10px;border-radius:6px">${year}년</span>
          <div style="font-size:14px;font-weight:900;color:#374151">통장별 회계연도 현황</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:#F8FAFC">
              <th style="text-align:left;padding:10px;font-weight:800;color:#64748B">조직/팀</th>
              <th style="text-align:left;padding:10px 6px;font-weight:800;color:#64748B">계정</th>
              <th style="text-align:center;padding:10px 6px;font-weight:800;color:#64748B">상태</th>
              <th style="text-align:right;padding:10px 6px;font-weight:800;color:#64748B">개시잔액</th>
              <th style="text-align:right;padding:10px 6px;font-weight:800;color:#64748B">사용액</th>
              <th style="text-align:right;padding:10px 6px;font-weight:800;color:#64748B">현재잔액</th>
              <th style="text-align:center;padding:10px 6px;font-weight:800;color:#64748B">소진율</th>
            </tr>
          </thead>
          <tbody>${detailRows || '<tr><td colspan="7" style="padding:40px;text-align:center;color:#9CA3AF">활성 통장이 없습니다</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;

    // 캐시
    window._fgBankbooks = bbs;
    window._fgCurrentFiscals = currentFiscals;
    window._fgCurrentMap = currentMap;
    window._fgAcctMap = acctMap;
  } catch (err) {
    el.innerHTML = `${groupBar}<div style="padding:40px;text-align:center;color:#EF4444">❌ 로드 실패: ${err.message}</div>`;
  }
}

// ── 개별 통장 fiscal period 개시 ─────────────────────────────────────────────
async function _fgInitFiscalPeriod(bankbookId, year) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  if (!confirm(`${year}년 회계연도를 개시하시겠습니까?`)) return;

  try {
    await sb.from('bankbook_fiscal_periods').insert({
      bankbook_id: bankbookId,
      fiscal_year: year,
      opening_balance: 0,
      carried_forward: 0,
      total_allocated: 0,
      total_distributed: 0,
      total_used: 0,
      total_frozen: 0,
      current_balance: 0,
      burn_rate: 0,
      status: 'open',
    });
    alert(`✅ ${year}년 회계연도 개시 완료`);
    renderBudgetCarryover();
  } catch (err) {
    alert('❌ 개시 실패: ' + err.message);
  }
}

// ── 미등록 통장 일괄 개시 ────────────────────────────────────────────────────
async function _fgBatchInitFiscal(year) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const bbs = window._fgBankbooks || [];
  const currentMap = window._fgCurrentMap || {};
  const targets = bbs.filter(b => !currentMap[b.id]);

  if (targets.length === 0) { alert('미등록 통장이 없습니다.'); return; }
  if (!confirm(`${targets.length}개 통장의 ${year}년 회계연도를 일괄 개시하시겠습니까?`)) return;

  try {
    const rows = targets.map(b => ({
      bankbook_id: b.id,
      fiscal_year: year,
      opening_balance: 0,
      carried_forward: 0,
      total_allocated: 0,
      total_distributed: 0,
      total_used: 0,
      total_frozen: 0,
      current_balance: 0,
      burn_rate: 0,
      status: 'open',
    }));
    await sb.from('bankbook_fiscal_periods').insert(rows);
    alert(`✅ ${targets.length}건 일괄 개시 완료`);
    renderBudgetCarryover();
  } catch (err) {
    alert('❌ 일괄 개시 실패: ' + err.message);
  }
}

// ── 연도 일괄 마감 ───────────────────────────────────────────────────────────
async function _fgBatchClose(year) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const fiscals = (window._fgCurrentFiscals || []).filter(f => f.status === 'open');

  if (fiscals.length === 0) { alert('마감 대상이 없습니다.'); return; }

  const totalBal = fiscals.reduce((s, f) => s + Number(f.current_balance || 0), 0);
  const totalFrz = fiscals.reduce((s, f) => s + Number(f.total_frozen || 0), 0);
  const _fmt = v => Number(v || 0).toLocaleString('ko-KR');

  if (totalFrz > 0) {
    if (!confirm(`⚠️ 동결 예산 ${_fmt(totalFrz)}원이 존재합니다.\n동결 해제 없이 마감하면 동결액은 소멸됩니다.\n\n계속하시겠습니까?`)) return;
  }

  if (!confirm(`🔒 ${year}년 일괄 마감 확인\n\n대상: ${fiscals.length}건\n잔액 합계: ${_fmt(totalBal)}원\n\n마감 후 해당 연도의 예산 사용이 차단됩니다.\n실행하시겠습니까?`)) return;

  try {
    const now = new Date().toISOString();
    for (const fp of fiscals) {
      const used = Number(fp.total_used || 0);
      const alloc = Number(fp.total_allocated || 0) + Number(fp.opening_balance || 0);
      const burnRate = alloc > 0 ? ((used / alloc) * 100) : 0;

      await sb.from('bankbook_fiscal_periods').update({
        status: 'closed',
        closed_at: now,
        burn_rate: Math.round(burnRate * 10) / 10,
        updated_at: now,
      }).eq('id', fp.id);
    }

    // 마감 로그
    await sb.from('budget_usage_log').insert({
      tenant_id: boCurrentPersona?.tenantId || 'HMC',
      bankbook_id: fiscals[0]?.bankbook_id,
      action: 'fiscal_close',
      amount: 0,
      prev_balance: totalBal,
      new_balance: totalBal,
      reason: `${year}년 회계연도 일괄 마감 (${fiscals.length}건)`,
      performed_by: boCurrentPersona?.name || 'admin',
    }).catch(() => {});

    alert(`✅ ${year}년 일괄 마감 완료 (${fiscals.length}건)`);
    renderBudgetCarryover();
  } catch (err) {
    alert('❌ 마감 실패: ' + err.message);
  }
}

// ── 이월 실행 (마감된 연도 → 신년도) ─────────────────────────────────────────
async function _fgBatchCarryover(fromYear) {
  const sb = typeof getSB === 'function' ? getSB() : null;
  if (!sb) return;
  const toYear = fromYear + 1;
  const fiscals = (window._fgCurrentFiscals || []).filter(f => f.status === 'closed');

  if (fiscals.length === 0) {
    alert(`⚠️ ${fromYear}년 마감 완료된 통장이 없습니다.\n먼저 [${fromYear}년 일괄 마감]을 실행하세요.`);
    return;
  }

  // 이월 가능 잔액 계산 (current_balance - total_frozen)
  const carryTargets = fiscals.filter(f => Number(f.current_balance || 0) > 0);
  const totalCarry = carryTargets.reduce((s, f) => s + Number(f.current_balance || 0), 0);
  const _fmt = v => Number(v || 0).toLocaleString('ko-KR');

  if (carryTargets.length === 0) {
    alert('이월 대상 잔액이 없습니다.');
    return;
  }

  if (!confirm(`📅 이월 확인\n\n${fromYear}년 → ${toYear}년\n대상: ${carryTargets.length}건\n이월 총액: ${_fmt(totalCarry)}원\n\n신년도 통장에 이월 잔액이 개시됩니다.\n실행하시겠습니까?`)) return;

  let done = 0;
  const errors = [];

  for (const fp of carryTargets) {
    const carryAmount = Number(fp.current_balance || 0);
    try {
      // 기존 신년도 fiscal period 확인
      const { data: existing } = await sb.from('bankbook_fiscal_periods')
        .select('id,opening_balance,carried_forward,current_balance')
        .eq('bankbook_id', fp.bankbook_id)
        .eq('fiscal_year', toYear)
        .maybeSingle();

      if (existing) {
        // 이미 존재 → carried_forward, opening_balance 업데이트
        await sb.from('bankbook_fiscal_periods').update({
          carried_forward: Number(existing.carried_forward || 0) + carryAmount,
          opening_balance: Number(existing.opening_balance || 0) + carryAmount,
          current_balance: Number(existing.current_balance || 0) + carryAmount,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        // 신규 생성
        await sb.from('bankbook_fiscal_periods').insert({
          bankbook_id: fp.bankbook_id,
          fiscal_year: toYear,
          opening_balance: carryAmount,
          carried_forward: carryAmount,
          total_allocated: 0,
          total_distributed: 0,
          total_used: 0,
          total_frozen: 0,
          current_balance: carryAmount,
          burn_rate: 0,
          status: 'open',
        });
      }
      done++;
    } catch (err) {
      errors.push(err.message);
    }
  }

  // 이월 로그
  await sb.from('budget_usage_log').insert({
    tenant_id: boCurrentPersona?.tenantId || 'HMC',
    bankbook_id: carryTargets[0]?.bankbook_id,
    action: 'fiscal_carryover',
    amount: totalCarry,
    prev_balance: 0,
    new_balance: totalCarry,
    reason: `${fromYear}→${toYear}년 이월 (${done}건, ${_fmt(totalCarry)}원)`,
    performed_by: boCurrentPersona?.name || 'admin',
  }).catch(() => {});

  if (errors.length > 0) {
    alert(`⚠️ 일부 실패 (${done}/${carryTargets.length})\n${errors.slice(0, 3).join('\n')}`);
  } else {
    alert(`✅ 이월 완료!\n\n${fromYear}→${toYear}년\n${done}건, ${_fmt(totalCarry)}원 이월`);
  }
  renderBudgetCarryover();
}
