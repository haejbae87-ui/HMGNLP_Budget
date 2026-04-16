// ─── 수요예측기간 관리 (독립 메뉴) ─────────────────────────────────────────
// 교육계획 관리에서 분리된 독립 메뉴
// 제도그룹 단위로 수요예측 기간을 설정/관리한다

let _fpTenantId = null;
let _fpVorgId = null;      // 선택된 제도그룹 ID
let _fpVorgList = [];      // 로드된 제도그룹 목록
let _fpFiscalYear = new Date().getFullYear() + 1; // 기본: 내년
let _fpDeadline = null;    // 현재 제도그룹의 기간 레코드

// ── 진입점 ─────────────────────────────────────────────────────────────────
async function renderForecastPeriodMgmt() {
  const el = document.getElementById('bo-content');
  if (!el) return;

  el.innerHTML = `
    <div style="padding:24px;max-width:1100px;margin:0 auto">
      <h2 style="font-size:20px;font-weight:900;color:#111827;margin-bottom:20px">📅 수요예측기간 관리</h2>
      <div id="fp-filter-area" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:13px;font-weight:700;color:#475569">조회 조건 로딩 중...</span>
      </div>
      <div id="fp-main-area">
        <div style="padding:40px;text-align:center;color:#9CA3AF">상단 필터에서 제도그룹과 연도를 선택해주세요.</div>
      </div>
    </div>
  `;

  await _fpLoadVorgList();
  _fpRenderFilterArea();
}

// ── 제도그룹 목록 로드 ──────────────────────────────────────────────────────
async function _fpLoadVorgList() {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;

  const persona = boCurrentPersona;
  const role = persona?.role || '';
  const tenantId = _fpTenantId || persona?.tenantId || 'HMC';
  _fpTenantId = tenantId;

  try {
    let query = sb.from('virtual_org_templates')
      .select('id,name,purpose,service_type,tenant_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    _fpVorgList = (data || []).filter(t => {
      const p = t.service_type || t.purpose || '';
      return p.includes('edu_support') || p.includes('교육지원');
    });

    if (!_fpVorgId && _fpVorgList.length > 0) {
      _fpVorgId = _fpVorgList[0].id;
    }
  } catch (e) {
    console.error('[FP] 제도그룹 로드 실패:', e.message);
  }
}

// ── 필터바 렌더링 ───────────────────────────────────────────────────────────
function _fpRenderFilterArea() {
  const persona = boCurrentPersona;
  const role = persona?.role || '';
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS.filter(t => t.id !== 'SYSTEM') : [];
  const isPlatform = role === 'platform_admin';

  // 테넌트 선택
  const tenantHtml = isPlatform
    ? `<div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <select onchange="_fpTenantId=this.value;_fpVorgId=null;_fpDeadline=null;_fpLoadVorgList().then(_fpRenderFilterArea)"
          style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600">
          ${tenants.map(t => `<option value="${t.id}" ${t.id === _fpTenantId ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
        </select>
      </div>`
    : `<div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#475569">테넌트(회사)</label>
        <div style="padding:6px 12px;background:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;font-weight:700;color:#334155">
          ${tenants.find(t => t.id === _fpTenantId)?.name || _fpTenantId || ''}
        </div>
      </div>`;

  // 제도그룹 선택
  const vorgHtml = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;border-left:1px solid #CBD5E1;padding-left:20px">
      <label style="font-size:12px;font-weight:700;color:#475569">제도그룹</label>
      <select onchange="_fpVorgId=this.value;_fpDeadline=null;_fpRenderContent()"
        style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600;min-width:200px">
        ${_fpVorgList.length === 0
          ? '<option value="">조회된 제도그룹 없음</option>'
          : _fpVorgList.map(t => `<option value="${t.id}" ${t.id === _fpVorgId ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>`;

  // 연도 선택
  const curY = new Date().getFullYear();
  const yearHtml = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;border-left:1px solid #CBD5E1;padding-left:20px">
      <label style="font-size:12px;font-weight:700;color:#475569">회계연도</label>
      <select onchange="_fpFiscalYear=Number(this.value);_fpDeadline=null;_fpRenderContent()"
        style="padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:600">
        ${[curY + 1, curY, curY - 1].map(y => `<option value="${y}" ${_fpFiscalYear === y ? 'selected' : ''}>${y}년</option>`).join('')}
      </select>
    </div>`;

  // 새로고침 버튼
  const refreshBtn = `
    <button onclick="_fpDeadline=null;_fpRenderContent()"
      style="margin-left:auto;padding:7px 14px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;font-weight:700;background:#fff;color:#475569;cursor:pointer">
      🔄 새로고침
    </button>`;

  document.getElementById('fp-filter-area').innerHTML = tenantHtml + vorgHtml + yearHtml + refreshBtn;

  _fpRenderContent();
}

// ── 기간 상태 판별 ──────────────────────────────────────────────────────────
function _fpGetStatus(dl) {
  if (!dl) return { status: 'none', badge: '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#FEF3C7;color:#B45309">⚠ 기간 미설정</span>' };
  if (dl.is_closed) return { status: 'closed', badge: '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#FEE2E2;color:#DC2626">🔒 수동마감</span>' };
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = dl.recruit_start ? new Date(dl.recruit_start) : null;
  const end = dl.recruit_end ? new Date(dl.recruit_end) : null;
  if (start && now < start) {
    const d = Math.ceil((start - now) / 86400000);
    return { status: 'not_started', badge: `<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#FEF3C7;color:#B45309">⏳ 접수전 (D-${d})</span>` };
  }
  if (end && now > end) return { status: 'expired', badge: '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#FEE2E2;color:#DC2626">🔴 기간만료</span>' };
  if (start || end) {
    const d = end ? Math.ceil((end - now) / 86400000) : null;
    return { status: 'open', badge: `<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#D1FAE5;color:#059669">🟢 접수중${d !== null ? ` (D-${d})` : ''}</span>` };
  }
  return { status: 'open', badge: '<span style="font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px;background:#D1FAE5;color:#059669">🟢 접수중</span>' };
}

// ── 본문 렌더링 (기간 카드) ─────────────────────────────────────────────────
async function _fpRenderContent() {
  const mainEl = document.getElementById('fp-main-area');
  if (!mainEl) return;

  if (!_fpVorgId) {
    mainEl.innerHTML = `<div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-size:13px;font-weight:700;color:#6B7280">제도그룹을 선택해주세요.</div>
    </div>`;
    return;
  }

  mainEl.innerHTML = `<div style="padding:20px;text-align:center;color:#9CA3AF">⏳ 기간 정보 조회 중...</div>`;

  // DB 조회
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const { data } = await sb.from('forecast_deadlines')
        .select('*')
        .eq('tenant_id', _fpTenantId)
        .eq('fiscal_year', _fpFiscalYear)
        .eq('vorg_template_id', _fpVorgId)
        .maybeSingle();
      _fpDeadline = data || null;
    }
  } catch (e) {
    console.warn('[FP] 기간 조회 실패:', e.message);
    _fpDeadline = null;
  }

  const dl = _fpDeadline;
  const vorg = _fpVorgList.find(v => v.id === _fpVorgId);
  const { status, badge } = _fpGetStatus(dl);

  const canAdmin = (() => {
    const r = boCurrentPersona?.role || '';
    return ['platform_admin', 'tenant_global_admin', 'total_general', 'total_rnd'].includes(r)
      || /admin|total|ops/i.test(r);
  })();

  mainEl.innerHTML = `
  <div class="bo-card" style="padding:28px">
    <!-- 헤더 -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1.5px solid #F1F5F9">
      <div>
        <h3 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 4px">${vorg?.name || ''}의 수요예측 접수기간</h3>
        <p style="font-size:12px;color:#64748B;margin:0">${_fpFiscalYear}년도 수요예측 기간 현황</p>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
        ${badge}
      </div>
    </div>

    <!-- 기간 설정 카드 -->
    <div style="background:linear-gradient(135deg,#EFF6FF,#F0F9FF);border:1.5px solid #BFDBFE;border-radius:14px;padding:24px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:900;color:#1D4ED8;margin-bottom:16px">📌 ${_fpFiscalYear}년 수요예측 접수기간</div>
      <div style="display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap">
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">접수 시작일</label>
          <input type="date" id="fp-start-input" value="${dl?.recruit_start || ''}"
            ${!canAdmin ? 'disabled' : ''}
            style="padding:9px 14px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;font-weight:700;background:${canAdmin ? '#fff' : '#F9FAFB'};color:#111827">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#374151;display:block;margin-bottom:6px">접수 마감일</label>
          <input type="date" id="fp-end-input" value="${dl?.recruit_end || ''}"
            ${!canAdmin ? 'disabled' : ''}
            style="padding:9px 14px;border:1.5px solid #BFDBFE;border-radius:8px;font-size:13px;font-weight:700;background:${canAdmin ? '#fff' : '#F9FAFB'};color:#111827">
        </div>
        ${canAdmin ? `
        <div style="display:flex;gap:8px;padding-bottom:1px">
          <button onclick="_fpSavePeriod()"
            style="padding:9px 20px;border-radius:10px;border:none;background:#1D4ED8;color:white;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 4px 12px rgba(29,78,216,.25)">
            💾 저장
          </button>
          ${dl && !dl.is_closed ? `
          <button onclick="_fpClosePeriod()"
            style="padding:9px 14px;border-radius:10px;border:1.5px solid #FECACA;background:white;color:#DC2626;font-size:12px;font-weight:800;cursor:pointer">
            🔒 즉시 마감
          </button>` : ''}
          ${dl?.is_closed ? `
          <button onclick="_fpReopenPeriod()"
            style="padding:9px 14px;border-radius:10px;border:1.5px solid #BBF7D0;background:white;color:#059669;font-size:12px;font-weight:800;cursor:pointer">
            🔓 마감 해제
          </button>` : ''}
        </div>` : ''}
      </div>
    </div>

    <!-- 현재 수요예측 계획 건수 요약 -->
    <div id="fp-stats-area">
      <div style="font-size:12px;color:#9CA3AF">📊 해당 기간의 수요예측 계획 건수 조회 중...</div>
    </div>
  </div>

  <!-- 안내 배너 -->
  <div style="margin-top:16px;padding:14px 18px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E;font-weight:600">
    💡 수요예측 기간이 설정된 제도그룹의 예산 계정에서만 FO 사용자가 수요예측 교육계획을 수립할 수 있습니다.
  </div>`;

  // 관련 계획 건수 비동기 로드
  _fpLoadPlanStats();
}

// ── 계획 건수 통계 ──────────────────────────────────────────────────────────
async function _fpLoadPlanStats() {
  const el = document.getElementById('fp-stats-area');
  if (!el) return;
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (!sb) { el.innerHTML = ''; return; }

    // 해당 제도그룹의 계정 코드 조회
    const { data: accounts } = await sb.from('budget_accounts')
      .select('id,name,code')
      .eq('virtual_org_template_id', _fpVorgId);

    const accountIds = (accounts || []).map(a => a.id);
    if (!accountIds.length) { el.innerHTML = ''; return; }

    // 해당 계정 + 연도의 수요예측 계획 조회
    const { data: plans } = await sb.from('plans')
      .select('id,status,account_code')
      .eq('tenant_id', _fpTenantId)
      .eq('fiscal_year', _fpFiscalYear)
      .eq('plan_type', 'forecast')
      .is('deleted_at', null)
      .in('account_code', accountIds);

    const total = (plans || []).length;
    const pending = (plans || []).filter(p => p.status === 'pending' || p.status === 'pending_approval').length;
    const approved = (plans || []).filter(p => p.status === 'approved').length;

    el.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:12px 18px">
        <div style="font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px">📋 전체 수요예측</div>
        <div style="font-size:22px;font-weight:900;color:#111827">${total}건</div>
      </div>
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px 18px">
        <div style="font-size:11px;font-weight:700;color:#B45309;margin-bottom:4px">⏳ 검토 대기</div>
        <div style="font-size:22px;font-weight:900;color:#D97706">${pending}건</div>
      </div>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:12px 18px">
        <div style="font-size:11px;font-weight:700;color:#059669;margin-bottom:4px">✅ 승인 완료</div>
        <div style="font-size:22px;font-weight:900;color:#059669">${approved}건</div>
      </div>
      ${accounts?.length ? `<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:12px 18px">
        <div style="font-size:11px;font-weight:700;color:#1D4ED8;margin-bottom:4px">💳 연결 계정</div>
        <div style="font-size:22px;font-weight:900;color:#1D4ED8">${accounts.length}개</div>
      </div>` : ''}
    </div>`;
  } catch (e) {
    el.innerHTML = '';
  }
}

// ── 기간 저장 ───────────────────────────────────────────────────────────────
async function _fpSavePeriod() {
  const startVal = document.getElementById('fp-start-input')?.value || null;
  const endVal = document.getElementById('fp-end-input')?.value || null;

  if (startVal && endVal && startVal > endVal) {
    alert('⚠ 종료일은 시작일 이후여야 합니다.');
    return;
  }
  if (!startVal && !endVal) {
    if (!confirm('시작일과 종료일이 모두 비어있습니다.\n기간을 삭제(초기화)하시겠습니까?')) return;
  }

  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  try {
    const payload = {
      tenant_id: _fpTenantId,
      fiscal_year: _fpFiscalYear,
      vorg_template_id: _fpVorgId,
      account_code: '__VORG__', // 제도그룹 단위 식별자
      recruit_start: startVal,
      recruit_end: endVal,
      is_closed: false,
      closed_at: null,
      closed_by: null,
    };

    // 기존 레코드 삭제 후 삽입 (upsert 대안)
    await sb.from('forecast_deadlines')
      .delete()
      .eq('tenant_id', _fpTenantId)
      .eq('fiscal_year', _fpFiscalYear)
      .eq('vorg_template_id', _fpVorgId);

    if (startVal || endVal) {
      const { error } = await sb.from('forecast_deadlines').insert(payload);
      if (error) throw error;
    }

    alert(`✅ ${_fpFiscalYear}년도 수요예측 접수기간이 저장되었습니다.`);
    _fpDeadline = null;
    _fpRenderContent();
  } catch (e) {
    alert('❌ 저장 실패: ' + e.message);
  }
}

// ── 즉시 마감 ───────────────────────────────────────────────────────────────
async function _fpClosePeriod() {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  // 진행 중인 계획 확인
  try {
    const { data: accounts } = await sb.from('budget_accounts')
      .select('id').eq('virtual_org_template_id', _fpVorgId);
    const accountIds = (accounts || []).map(a => a.id);

    let pendingCount = 0;
    if (accountIds.length) {
      const { count } = await sb.from('plans')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', _fpTenantId)
        .eq('fiscal_year', _fpFiscalYear)
        .eq('plan_type', 'forecast')
        .in('status', ['pending', 'pending_approval'])
        .is('deleted_at', null)
        .in('account_code', accountIds);
      pendingCount = count || 0;
    }

    const msg = pendingCount > 0
      ? `⚠ 현재 ${pendingCount}건의 수요예측 계획이 검토 대기 중입니다.\n마감 시 추가 접수가 불가해집니다.\n\n즉시 마감하시겠습니까?`
      : `${_fpFiscalYear}년도 수요예측 기간을 즉시 마감하시겠습니까?\n마감 후 FO 사용자의 수요예측 계획 수립이 불가합니다.`;

    if (!confirm(msg)) return;

    if (_fpDeadline?.id) {
      await sb.from('forecast_deadlines')
        .update({ is_closed: true, closed_at: new Date().toISOString(), closed_by: boCurrentPersona?.name || 'admin' })
        .eq('id', _fpDeadline.id);
    } else {
      await sb.from('forecast_deadlines').insert({
        tenant_id: _fpTenantId,
        fiscal_year: _fpFiscalYear,
        vorg_template_id: _fpVorgId,
        account_code: '__VORG__',
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: boCurrentPersona?.name || 'admin',
      });
    }

    alert('✅ 수요예측 기간이 즉시 마감되었습니다.');
    _fpDeadline = null;
    _fpRenderContent();
  } catch (e) {
    alert('❌ 마감 실패: ' + e.message);
  }
}

// ── 마감 해제 ───────────────────────────────────────────────────────────────
async function _fpReopenPeriod() {
  if (!confirm(`${_fpFiscalYear}년도 수요예측 마감을 해제하시겠습니까?\n해제 후 FO에서 다시 수요예측 계획 수립이 가능합니다.`)) return;
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb || !_fpDeadline?.id) { alert('오류: 기간 레코드를 찾을 수 없습니다.'); return; }
  try {
    await sb.from('forecast_deadlines')
      .update({ is_closed: false, closed_at: null, closed_by: null })
      .eq('id', _fpDeadline.id);
    alert('✅ 마감이 해제되었습니다.');
    _fpDeadline = null;
    _fpRenderContent();
  } catch (e) {
    alert('❌ 마감 해제 실패: ' + e.message);
  }
}
