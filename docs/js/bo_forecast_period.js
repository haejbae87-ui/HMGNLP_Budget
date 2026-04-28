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
// ── 본문 렌더링 (다중 캠페인 목록) ─────────────────────────────────────────────────
let _fpAccounts = []; // 현재 VOrg에 매핑된 계정들
let _fpDeadlines = []; // 조회된 캠페인 목록

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

  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      // 1. 해당 제도그룹의 예산 계정 조회
      const { data: accounts } = await sb.from('budget_accounts')
        .select('id,name,code')
        .eq('virtual_org_template_id', _fpVorgId);
      _fpAccounts = accounts || [];

      // 2. 해당 연도, 제도그룹의 캠페인(수요예측 기간) 다건 조회
      const { data: campaigns } = await sb.from('forecast_deadlines')
        .select('*')
        .eq('tenant_id', _fpTenantId)
        .eq('fiscal_year', _fpFiscalYear)
        .eq('vorg_template_id', _fpVorgId)
        .order('created_at', { ascending: false });
      _fpDeadlines = campaigns || [];
    }
  } catch (e) {
    console.warn('[FP] 기간 조회 실패:', e.message);
    _fpDeadlines = [];
    _fpAccounts = [];
  }

  const vorg = _fpVorgList.find(v => v.id === _fpVorgId);
  const canAdmin = (() => {
    const r = boCurrentPersona?.role || '';
    return ['platform_admin', 'tenant_global_admin', 'total_general', 'total_rnd'].includes(r)
      || /admin|total|ops/i.test(r);
  })();

  // 캠페인 카드 HTML 생성
  const campaignsHtml = _fpDeadlines.length === 0
    ? `<div style="text-align:center;padding:40px 20px;color:#9CA3AF;font-size:13px;border:1px dashed #E5E7EB;border-radius:12px;background:#F9FAFB">
         등록된 수요예측 캠페인이 없습니다.<br>상단의 [캠페인 추가] 버튼을 눌러 신규 캠페인을 등록해주세요.
       </div>`
    : _fpDeadlines.map(c => {
        const { status, badge } = _fpGetStatus(c);
        const targetCodes = Array.isArray(c.target_accounts) ? c.target_accounts : [];
        const accountBadges = targetCodes.length > 0
          ? targetCodes.map(code => {
              const acc = _fpAccounts.find(a => a.code === code);
              return `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:#E0E7FF;color:#4338CA;font-size:11px;font-weight:700;margin-right:4px;margin-bottom:4px">💳 ${acc?.name || code}</span>`;
            }).join('')
          : `<span style="display:inline-block;padding:3px 8px;border-radius:6px;background:#F1F5F9;color:#64748B;font-size:11px;font-weight:700">전체 적용 (하위 호환)</span>`;

        return `
        <div style="background:white;border:1.5px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.02)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                ${badge}
                <h4 style="margin:0;font-size:15px;font-weight:900;color:#111827">${c.title || '제목 없음'}</h4>
              </div>
              <div style="font-size:12px;color:#6B7280;margin-top:8px;line-height:1.4">
                <strong>접수 기간:</strong> ${c.recruit_start || '미지정'} ~ ${c.recruit_end || '미지정'}
              </div>
            </div>
            ${canAdmin ? `
            <div style="display:flex;gap:6px">
              <button onclick="_fpOpenCampaignModal('${c.id}')" style="padding:6px 12px;border:1px solid #D1D5DB;background:white;border-radius:6px;font-size:12px;font-weight:700;color:#374151;cursor:pointer">수정</button>
              ${!c.is_closed ? `<button onclick="_fpToggleClose('${c.id}', true)" style="padding:6px 12px;border:1px solid #FECACA;background:#FEF2F2;border-radius:6px;font-size:12px;font-weight:700;color:#DC2626;cursor:pointer">즉시 마감</button>` 
                             : `<button onclick="_fpToggleClose('${c.id}', false)" style="padding:6px 12px;border:1px solid #BBF7D0;background:#F0FDF4;border-radius:6px;font-size:12px;font-weight:700;color:#059669;cursor:pointer">마감 해제</button>`}
              <button onclick="_fpDeleteCampaign('${c.id}')" style="padding:6px 12px;border:none;background:#F3F4F6;border-radius:6px;font-size:12px;font-weight:700;color:#6B7280;cursor:pointer">삭제</button>
            </div>` : ''}
          </div>
          <div style="border-top:1px dashed #E5E7EB;padding-top:12px;margin-top:12px">
            <div style="font-size:11px;font-weight:700;color:#9CA3AF;margin-bottom:6px">대상 예산 계정</div>
            <div>${accountBadges}</div>
          </div>
        </div>`;
      }).join('');

  mainEl.innerHTML = `
  <div class="bo-card" style="padding:28px;background:#F9FAFB">
    <!-- 헤더 -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1.5px solid #E5E7EB">
      <div>
        <h3 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 4px">${vorg?.name || ''} 수요예측 캠페인</h3>
        <p style="font-size:12px;color:#64748B;margin:0">${_fpFiscalYear}년도 등록된 다중 캠페인 현황</p>
      </div>
      ${canAdmin ? `
      <button onclick="_fpOpenCampaignModal(null)" style="padding:8px 16px;background:#1D4ED8;color:white;border:none;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 10px rgba(29,78,216,0.2)">
        ➕ 캠페인 추가
      </button>` : ''}
    </div>

    <!-- 캠페인 목록 -->
    <div>
      ${campaignsHtml}
    </div>
  </div>

  <!-- 안내 배너 -->
  <div style="margin-top:16px;padding:14px 18px;background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;font-size:12px;color:#92400E;font-weight:600">
    💡 하나의 제도그룹 안에서 여러 예산 계정에 대해 동시에 캠페인을 운영할 수 있습니다. 대상 계정들을 다중 선택하여 저장하세요.
  </div>`;
}

// ── 캠페인 모달 UI ──────────────────────────────────────────────────────────────
let _fpEditId = null;

function _fpOpenCampaignModal(id) {
  _fpEditId = id;
  const target = id ? _fpDeadlines.find(c => c.id === id) : null;
  const targetAccounts = target && Array.isArray(target.target_accounts) ? target.target_accounts : [];

  // 계정 체크박스 HTML 생성
  const accountsCheckboxes = _fpAccounts.length > 0 
    ? _fpAccounts.map(a => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer">
          <input type="checkbox" name="fp_account_cb" value="${a.code}" ${targetAccounts.includes(a.code) ? 'checked' : ''} style="width:16px;height:16px;accent-color:#1D4ED8">
          <span style="font-size:13px;font-weight:600;color:#374151">${a.name}</span>
        </label>
      `).join('')
    : `<div style="font-size:12px;color:#EF4444">이 제도그룹에 맵핑된 계정이 없습니다.</div>`;

  const modalHtml = `
  <div id="fp-campaign-modal" onclick="if(event.target===this)this.remove()" style="position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999">
    <div onclick="event.stopPropagation()" style="background:white;width:500px;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden">
      <div style="padding:20px 24px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:16px;font-weight:900;color:#1E293B">${id ? '캠페인 수정' : '신규 캠페인 등록'}</h3>
        <button onclick="document.getElementById('fp-campaign-modal').remove()" style="background:none;border:none;font-size:20px;color:#94A3B8;cursor:pointer">&times;</button>
      </div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:16px">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">캠페인 제목 <span style="color:#EF4444">*</span></label>
          <input type="text" id="fp-modal-title" value="${target?.title || ''}" placeholder="예: 2026년 상반기 수요예측 (일반/사외)" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">대상 예산 계정 (복수 선택) <span style="color:#EF4444">*</span></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid #E2E8F0">
            ${accountsCheckboxes}
          </div>
        </div>
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">접수 시작일 <span style="color:#EF4444">*</span></label>
            <input type="date" id="fp-modal-start" value="${target?.recruit_start || ''}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px">
          </div>
          <div style="flex:1">
            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">접수 마감일 <span style="color:#EF4444">*</span></label>
            <input type="date" id="fp-modal-end" value="${target?.recruit_end || ''}" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px">
          </div>
        </div>
      </div>
      <div style="padding:16px 24px;border-top:1px solid #E2E8F0;background:#F8FAFC;display:flex;justify-content:flex-end;gap:8px">
        <button onclick="document.getElementById('fp-campaign-modal').remove()" style="padding:8px 16px;border:1px solid #CBD5E1;background:white;border-radius:8px;font-size:13px;font-weight:700;color:#475569;cursor:pointer">취소</button>
        <button onclick="_fpSaveCampaign()" style="padding:8px 16px;border:none;background:#1D4ED8;color:white;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(29,78,216,.2)">저장</button>
      </div>
    </div>
  </div>`;
  
  // 기존 모달 제거 후 삽입 (중복 방지)
  const existing = document.getElementById('fp-campaign-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ── 캠페인 저장 ───────────────────────────────────────────────────────────────
async function _fpSaveCampaign() {
  const title = document.getElementById('fp-modal-title').value.trim();
  const start = document.getElementById('fp-modal-start').value;
  const end = document.getElementById('fp-modal-end').value;
  
  const checkboxes = document.querySelectorAll('input[name="fp_account_cb"]:checked');
  const targetAccounts = Array.from(checkboxes).map(cb => cb.value);

  if (!title) { alert('캠페인 제목을 입력하세요.'); return; }
  if (targetAccounts.length === 0) { alert('최소 1개의 대상 예산 계정을 선택하세요.'); return; }
  if (!start || !end) { alert('시작일과 종료일을 입력하세요.'); return; }
  if (start > end) { alert('종료일은 시작일 이후여야 합니다.'); return; }

  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) { alert('DB 연결 필요'); return; }

  try {
    const payload = {
      tenant_id: _fpTenantId,
      fiscal_year: _fpFiscalYear,
      vorg_template_id: _fpVorgId,
      title: title,
      target_accounts: targetAccounts,
      recruit_start: start,
      recruit_end: end
    };

    if (_fpEditId) {
      const { error } = await sb.from('forecast_deadlines').update(payload).eq('id', _fpEditId);
      if (error) throw error;
      alert('✅ 캠페인이 수정되었습니다.');
    } else {
      payload.is_closed = false;
      const { error } = await sb.from('forecast_deadlines').insert(payload);
      if (error) throw error;
      alert('✅ 신규 캠페인이 등록되었습니다.');
    }

    document.getElementById('fp-campaign-modal').remove();
    _fpRenderContent();
  } catch (e) {
    alert('❌ 저장 실패: ' + e.message);
  }
}

// ── 마감/마감해제 ───────────────────────────────────────────────────────────
async function _fpToggleClose(id, closeFlag) {
  if (!confirm(closeFlag ? '이 캠페인을 즉시 마감하시겠습니까?' : '마감을 해제하시겠습니까?')) return;
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;

  try {
    const { error } = await sb.from('forecast_deadlines').update({
      is_closed: closeFlag,
      closed_at: closeFlag ? new Date().toISOString() : null,
      closed_by: closeFlag ? (boCurrentPersona?.name || 'admin') : null
    }).eq('id', id);

    if (error) throw error;
    _fpRenderContent();
  } catch(e) {
    alert('❌ 상태 변경 실패: ' + e.message);
  }
}

// ── 삭제 ───────────────────────────────────────────────────────────
async function _fpDeleteCampaign(id) {
  if (!confirm('정말로 이 캠페인을 삭제하시겠습니까?\n복구할 수 없습니다.')) return;
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;

  try {
    const { error } = await sb.from('forecast_deadlines').delete().eq('id', id);
    if (error) throw error;
    _fpRenderContent();
  } catch(e) {
    alert('❌ 삭제 실패: ' + e.message);
  }
}

