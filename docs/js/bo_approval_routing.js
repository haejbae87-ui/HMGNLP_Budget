// ─── 백오피스: 계정별 금액별 결재라인 설정 (Approval Routing by Account) ──────
// 교육 신청 시 사용되는 예산 계정의 성격에 따라
// 신청 총액 기준 결재 단계와 결재권자를 자동 매핑합니다.

let _arEditId = null;   // 현재 편집 중인 라우팅 ID
let _arModal  = false;

// ─── 진입점 ──────────────────────────────────────────────────────────────────
function renderApprovalRouting() {
  const tenantId    = boCurrentPersona.tenantId || 'HMC';
  const tenantName  = TENANTS.find(t => t.id === tenantId)?.name || tenantId;
  const accounts    = ACCOUNT_MASTER.filter(a => a.tenantId === tenantId);
  const el          = document.getElementById('bo-content');

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#D97706;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">결재라인</span>
      <h1 class="bo-page-title" style="margin:0">계정별 금액별 결재라인 설정</h1>
      <span style="font-size:13px;color:#6B7280">— ${tenantName}</span>
    </div>
    <p class="bo-page-sub">
      교육 신청 시 사용되는 예산 계정별로, 신청 총액(세부산출근거 합계) 기준의 결재 단계와 결재권자를 설정합니다.
    </p>
    <div style="margin-top:8px;padding:9px 14px;background:#FFFBEB;border-radius:8px;border:1px solid #FDE68A;font-size:11px;color:#92400E;font-weight:600">
      📐 <strong>로직</strong>: 신청 총액이 산출되면 해당 예산 계정에 설정된 금액별 결재 정책을 조회 → 결재선 자동 생성
      &nbsp;|&nbsp; 계정 성격별 차등 적용 가능 (예: 운영계정은 100만원 미만 팀장 전결, 기타계정은 0원부터 실장 승인)
    </div>
  </div>

  <div id="ar-content">${_renderArContent(tenantId)}</div>

  <!-- 라우팅 편집 모달 -->
  <div id="ar-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">
    <div style="background:#fff;border-radius:16px;width:620px;max-height:85vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h3 id="ar-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">결재라인 편집</h3>
        <button onclick="arCloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
      </div>
      <div id="ar-modal-body"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
        <button class="bo-btn-secondary bo-btn-sm" onclick="arCloseModal()">닫기</button>
      </div>
    </div>
  </div>
</div>`;
}

// ─── 결재라인 목록 렌더 ──────────────────────────────────────────────────────
function _renderArContent(tenantId) {
  const routings = APPROVAL_ROUTING.filter(r => r.tenantId === tenantId);

  return `
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div>
      <span style="font-size:12px;color:#6B7280">설정된 결재라인: ${routings.length}개</span>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="arOpenNewModal()">+ 결재라인 추가</button>
  </div>

  ${routings.map(r => `
  <div class="bo-card" style="margin-bottom:14px;padding:20px 24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;padding-bottom:14px;border-bottom:1.5px solid #F3F4F6">
      <div>
        <div style="font-size:14px;font-weight:800;color:#92400E;margin-bottom:4px">${r.name}</div>
        <!-- 계정 성격별 색상 코드 -->
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px">
          ${r.accountCodes.map(c => {
            const acct = typeof ACCOUNT_MASTER !== 'undefined' ? ACCOUNT_MASTER.find(a => a.code === c) : null;
            return `<code style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700">${c}</code>` +
              (acct ? `<span style="font-size:10px;color:#6B7280">${acct.name}</span>` : '');
          }).join(' ')}
        </div>
        <div style="font-size:11px;color:#9CA3AF">
          계정 성격: ${r.accountCodes.some(c => c.includes('OPS')) ? '<span style="color:#1D4ED8;font-weight:700">운영계정</span>' : ''}
                     ${r.accountCodes.some(c => c.includes('ETC') || c.includes('CERT')) ? '<span style="color:#7C3AED;font-weight:700">기타계정</span>' : ''}
                     ${r.accountCodes.some(c => c.includes('PART')) ? '<span style="color:#059669;font-weight:700">참가계정</span>' : ''}
                     ${r.accountCodes.some(c => c.includes('RND')) ? '<span style="color:#DC2626;font-weight:700">R&D계정</span>' : ''}
        </div>
      </div>
      <button class="bo-btn-secondary bo-btn-sm" onclick="arOpenEditModal('${r.id}')">편집</button>
    </div>

    <!-- 구간별 결재 테이블 -->
    <div style="display:flex;flex-direction:column;gap:6px">
      ${r.ranges.map((range, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${i % 2 === 0 ? '#FAFAFA' : '#FFF'};border-radius:10px;border:1px solid #F3F4F6">
        <div style="min-width:180px;font-size:11px;font-weight:700;color:#92400E">${range.label}</div>
        <div style="display:flex;align-items:center;gap:6px;flex:1;flex-wrap:wrap">
          ${range.approvers.map((a, j) => `
          <span style="background:#FEF3C7;color:#92400E;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800">${a}</span>
          ${j < range.approvers.length - 1 ? '<span style="color:#D97706;font-size:14px">→</span>' : ''}
          `).join('')}
        </div>
        <span style="font-size:11px;font-weight:800;flex-shrink:0;padding:3px 10px;border-radius:6px;
          background:${range.approvers.length === 1 ? '#F0FDF4' : range.approvers.length === 2 ? '#FFFBEB' : '#FEF2F2'};
          color:${range.approvers.length === 1 ? '#059669' : range.approvers.length === 2 ? '#D97706' : '#DC2626'}">
          ${range.approvers.length}단계
        </span>
      </div>`).join('')}
    </div>
  </div>`).join('')}

  ${routings.length === 0 ? `
  <div class="bo-card" style="padding:40px;text-align:center;color:#9CA3AF">
    <div style="font-size:14px;margin-bottom:4px">이 테넌트의 결재라인이 설정되지 않았습니다.</div>
    <div style="font-size:12px">'+ 결재라인 추가' 버튼으로 새 결재라인을 등록하세요.</div>
  </div>` : ''}

  <div class="bo-card" style="padding:12px 18px;background:#FFFBEB;border-color:#FDE68A;margin-top:4px">
    <span style="font-size:12px;font-weight:700;color:#92400E">
      📋 <strong>적용 시점</strong>: 교육 신청서 제출 시, 세부산출근거로 계산된 합계 금액 기준으로 해당 계정의 결재라인이 자동 구성됩니다.
      가용 예산 범위 내에서 실제 집행 금액을 확정하는 신청 단계에서 동작합니다.
    </span>
  </div>
</div>`;
}

// ─── 모달 오픈/클로즈 ─────────────────────────────────────────────────────────
function arOpenEditModal(routingId) {
  _arEditId = routingId;
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (!r) return;
  document.getElementById('ar-modal-title').textContent = `결재라인 편집 — ${r.name}`;
  document.getElementById('ar-modal-body').innerHTML = _renderArEditor(r);
  document.getElementById('ar-modal').style.display = 'flex';
}

function arOpenNewModal() {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const newId = 'AR' + String(Date.now()).slice(-6);
  const newRouting = {
    id: newId, tenantId,
    name: '새 결재라인', accountCodes: [],
    ranges: [
      { max: 1000000, label: '100만원 미만', approvers: ['팀장 전결'] },
      { max: null,    label: '100만원 이상', approvers: ['팀장', '실장'] },
    ]
  };
  APPROVAL_ROUTING.push(newRouting);
  _arEditId = newId;
  document.getElementById('ar-modal-title').textContent = '결재라인 추가';
  document.getElementById('ar-modal-body').innerHTML = _renderArEditor(newRouting);
  document.getElementById('ar-modal').style.display = 'flex';
}

function arCloseModal() {
  document.getElementById('ar-modal').style.display = 'none';
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  document.getElementById('ar-content').innerHTML = _renderArContent(tenantId);
}

// ─── 결재라인 편집기 ─────────────────────────────────────────────────────────
function _renderArEditor(r) {
  const tenantId = boCurrentPersona.tenantId || 'HMC';
  const accounts = typeof ACCOUNT_MASTER !== 'undefined'
    ? ACCOUNT_MASTER.filter(a => a.tenantId === tenantId) : [];

  return `
<div style="display:flex;flex-direction:column;gap:16px">
  <!-- 라우팅명 -->
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">결재라인 명칭 <span style="color:#EF4444">*</span></label>
    <input id="ar-name" type="text" value="${r.name}"
      oninput="arUpdateField('${r.id}','name',this.value)"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px;outline:none">
  </div>

  <!-- 적용 계정 선택 -->
  <div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">적용 예산 계정 <span style="font-size:10px;color:#6B7280;font-weight:500">(복수 선택 가능)</span></label>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${accounts.map(a => `
      <label style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${r.accountCodes.includes(a.code) ? '#D97706' : '#E5E7EB'};background:${r.accountCodes.includes(a.code) ? '#FFFBEB' : '#fff'}">
        <input type="checkbox" value="${a.code}" ${r.accountCodes.includes(a.code) ? 'checked' : ''}
          onchange="arToggleAccount('${r.id}','${a.code}',this.checked)"
          style="accent-color:#D97706">
        <span style="font-size:11px;font-weight:700;color:${r.accountCodes.includes(a.code) ? '#92400E' : '#374151'}">${a.code}</span>
        <span style="font-size:10px;color:#6B7280">${a.name}</span>
      </label>`).join('')}
    </div>
    ${accounts.length === 0 ? '<div style="font-size:11px;color:#9CA3AF">이 테넌트에 등록된 계정이 없습니다.</div>' : ''}
  </div>

  <!-- 금액 구간별 결재선 -->
  <div>
    <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px">금액 구간별 결재 단계</div>
    <div style="display:flex;flex-direction:column;gap:10px" id="ar-ranges-${r.id}">
      ${r.ranges.map((range, i) => _renderArRangeRow(r.id, i, range)).join('')}
    </div>
    <button onclick="arAddRange('${r.id}')"
      style="margin-top:10px;width:100%;padding:9px;border:1.5px dashed #E5E7EB;border-radius:10px;background:#FAFAFA;color:#6B7280;font-size:12px;font-weight:700;cursor:pointer">
      + 구간 추가
    </button>
  </div>
</div>`;
}

function _renderArRangeRow(routingId, idx, range) {
  return `
<div style="display:flex;align-items:flex-start;gap:10px;padding:12px;background:#F9FAFB;border-radius:10px;border:1px solid #E5E7EB">
  <div style="flex:1">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">구간명</label>
        <input type="text" value="${range.label}"
          oninput="arUpdateRange('${routingId}',${idx},'label',this.value)"
          style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px">
      </div>
      <div>
        <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">상한 금액 (원, 비워두면 무제한)</label>
        <input type="number" value="${range.max ?? ''}" placeholder="비워두면 상한 없음"
          oninput="arUpdateRange('${routingId}',${idx},'max',this.value === '' ? null : Number(this.value))"
          style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px">
      </div>
    </div>
    <div>
      <label style="font-size:10px;font-weight:700;color:#6B7280;display:block;margin-bottom:3px">결재자 (쉼표로 구분)</label>
      <input type="text" value="${range.approvers.join(', ')}"
        oninput="arUpdateRange('${routingId}',${idx},'approvers',this.value.split(',').map(s=>s.trim()).filter(Boolean))"
        style="width:100%;box-sizing:border-box;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:6px;font-size:12px"
        placeholder="예) 팀장, 실장, 본부장">
    </div>
  </div>
  <button onclick="arDeleteRange('${routingId}',${idx})"
    style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:18px;padding:4px;flex-shrink:0">🗑️</button>
</div>`;
}

// ─── CRUD 헬퍼 ───────────────────────────────────────────────────────────────
function arUpdateField(routingId, field, value) {
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (r) r[field] = value;
}

function arToggleAccount(routingId, code, checked) {
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (!r) return;
  if (checked) { if (!r.accountCodes.includes(code)) r.accountCodes.push(code); }
  else          { r.accountCodes = r.accountCodes.filter(c => c !== code); }
  document.getElementById('ar-modal-body').innerHTML = _renderArEditor(r);
}

function arUpdateRange(routingId, idx, field, value) {
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (r && r.ranges[idx]) r.ranges[idx][field] = value;
}

function arAddRange(routingId) {
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (!r) return;
  r.ranges.push({ max: null, label: '새 구간', approvers: ['팀장'] });
  document.getElementById(`ar-ranges-${routingId}`).innerHTML =
    r.ranges.map((range, i) => _renderArRangeRow(routingId, i, range)).join('');
}

function arDeleteRange(routingId, idx) {
  const r = APPROVAL_ROUTING.find(x => x.id === routingId);
  if (!r || r.ranges.length <= 1) { alert('최소 1개 구간은 필요합니다.'); return; }
  r.ranges.splice(idx, 1);
  document.getElementById(`ar-ranges-${routingId}`).innerHTML =
    r.ranges.map((range, i) => _renderArRangeRow(routingId, i, range)).join('');
}
