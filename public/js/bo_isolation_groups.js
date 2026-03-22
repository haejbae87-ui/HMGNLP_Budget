// ─── 격리 그룹 관리 (테넌트 총괄 전용) ─────────────────────────────────────
// 역할: tenant_global_admin (최O영, 고O현, 안O기)

let _igModal = false;
let _igNewData = {};

function renderIsolationGroups() {
  const persona = boCurrentPersona;
  const el = document.getElementById('bo-content');
  const myGroups = ISOLATION_GROUPS.filter(g => g.tenantId === persona.tenantId);

  const roleColor = { budget_global_admin: '#7C3AED', budget_op_manager: '#1D4ED8', tenant_global_admin: '#D97706' };

  function _personaCard(key) {
    const p = BO_PERSONAS[key];
    if (!p) return `<span style="color:#9CA3AF;font-size:11px">${key}</span>`;
    const rc = roleColor[p.role] || '#6B7280';
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;
      background:${rc}15;border:1px solid ${rc}40;font-size:11px;font-weight:700;color:${rc}">
      ${p.name} <span style="font-size:9px;opacity:.7">${p.dept}</span>
    </span>`;
  }

  const cards = myGroups.map(g => {
    const admin = BO_PERSONAS[g.globalAdminKey];
    const ops   = g.opManagerKeys.map(k => BO_PERSONAS[k]).filter(Boolean);
    const accts = (g.ownedAccounts || []).map(a =>
      typeof ACCOUNT_MASTER !== 'undefined' ? (ACCOUNT_MASTER.find(ac => ac.code === a)?.name || a) : a
    );
    return `
<div class="bo-card" style="padding:22px;margin-bottom:16px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:16px">🛡️</span>
        <span style="font-weight:900;font-size:15px;color:#111827">${g.name}</span>
        <span style="font-size:9px;font-weight:900;padding:2px 8px;border-radius:10px;
          background:${g.status==='active'?'#D1FAE5':'#F3F4F6'};
          color:${g.status==='active'?'#065F46':'#9CA3AF'}">${g.status==='active'?'✅ 운영중':'⏸️ 중지'}</span>
      </div>
      <div style="font-size:12px;color:#6B7280;margin-bottom:12px">${g.desc}</div>

      <!-- 예산 총괄 -->
      <div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:900;color:#7C3AED;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">
          🔑 예산 총괄 (Budget Global Admin)
        </div>
        <div>${_personaCard(g.globalAdminKey)}</div>
      </div>

      <!-- 예산 운영 담당자 -->
      <div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:900;color:#1D4ED8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">
          👤 예산 운영 담당자 (Budget Op Manager)
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${g.opManagerKeys.map(k => _personaCard(k)).join('')}
          <button onclick="alert('운영 담당자 추가 기능 (실제 구현 시 가상조직 노드별 배정 UI로 확장됩니다)')"
            style="font-size:10px;padding:3px 10px;border-radius:20px;border:1px dashed #9CA3AF;
                   background:white;cursor:pointer;color:#6B7280;font-weight:700">+ 추가</button>
        </div>
      </div>

      <!-- 소속 예산 계정 -->
      <div>
        <div style="font-size:10px;font-weight:900;color:#059669;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">
          💳 소속 예산 계정
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${accts.map(a => `<span style="font-size:11px;padding:2px 8px;border-radius:6px;
            background:#F0FDF4;border:1px solid #86EFAC;color:#065F46;font-weight:700">${a}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- 우측 메타 -->
    <div style="text-align:right;flex-shrink:0;min-width:120px">
      <div style="font-size:10px;color:#9CA3AF;margin-bottom:4px">그룹 ID: ${g.id}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-bottom:12px">생성일: ${g.createdAt}</div>
      <button onclick="alert('격리 그룹 설정 수정 (총괄 변경, 계정 추가 등)')"
        style="font-size:11px;padding:6px 12px;border-radius:8px;border:1.5px solid #E5E7EB;
               background:white;cursor:pointer;font-weight:700">✏️ 수정</button>
    </div>
  </div>
</div>`;
  }).join('');

  // 새 그룹 생성 모달
  const modalHtml = _igModal ? `
<div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;width:540px;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h3 style="font-weight:900;font-size:17px;margin:0">🛡️ 새 격리 그룹 만들기</h3>
      <button onclick="_igModal=false;renderIsolationGroups()" style="border:none;background:none;cursor:pointer;font-size:20px;color:#6B7280">✕</button>
    </div>
    <div style="display:grid;gap:14px">
      <div>
        <label class="bo-label">그룹명 <span style="color:#EF4444">*</span></label>
        <input id="ig-name" type="text" placeholder='예: "HMC 글로벌교육 그룹"'
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;box-sizing:border-box"/>
      </div>
      <div>
        <label class="bo-label">그룹 설명</label>
        <textarea id="ig-desc" rows="2" placeholder="이 격리 그룹의 관리 범위를 설명하세요."
          style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
      </div>
      <div>
        <label class="bo-label">예산 총괄 담당자 선임 <span style="color:#EF4444">*</span></label>
        <select id="ig-admin" style="width:100%;border:1.5px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700">
          <option value="">— 선택 —</option>
          ${Object.entries(BO_PERSONAS)
            .filter(([k,p]) => p.tenantId === persona.tenantId && (p.role === 'budget_global_admin' || p.role === 'tenant_global_admin'))
            .map(([k,p]) => `<option value="${k}">${p.name} (${p.dept} · ${p.roleLabel})</option>`).join('')}
        </select>
        <div style="font-size:10px;color:#6B7280;margin-top:4px">💡 선임된 담당자는 이 그룹의 예산 계정·가상조직·정책을 독립적으로 관리하게 됩니다.</div>
      </div>
      <div style="padding:12px;background:#FEF3C7;border-radius:10px;border:1px solid #FDE68A">
        <div style="font-size:11px;font-weight:900;color:#92400E;margin-bottom:4px">⚠️ 격리 그룹 생성 후 주의사항</div>
        <div style="font-size:11px;color:#78350F;line-height:1.5">
          • 그룹 생성 후 예산 계정은 "예산 계정 관리" 메뉴에서 총괄이 직접 추가합니다.<br>
          • 서로 다른 그룹의 데이터는 상호 열람이 불가합니다.<br>
          • 그룹 삭제 시 소속 예산 계정·정책 데이터가 모두 초기화됩니다.
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:20px">
      <button onclick="_igModal=false;renderIsolationGroups()"
        style="padding:10px 20px;border-radius:10px;border:1.5px solid #E5E7EB;background:white;font-weight:700;cursor:pointer">취소</button>
      <button onclick="_saveNewIsolationGroup()" class="bo-btn-primary" style="padding:10px 24px">
        ✅ 격리 그룹 생성
      </button>
    </div>
  </div>
</div>` : '';

  el.innerHTML = `
<div class="bo-fade">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      <h1 class="bo-page-title">🛡️ 격리 그룹 관리</h1>
      <p class="bo-page-sub">테넌트 내 독립적인 예산 관리 샌드박스를 생성하고 예산 총괄 담당자를 선임합니다</p>
    </div>
    <button onclick="_igModal=true;renderIsolationGroups()" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      <span style="font-size:16px">+</span> 새 격리 그룹 만들기
    </button>
  </div>

  <!-- 3계층 안내 배너 -->
  <div style="display:flex;gap:0;margin-bottom:24px;border-radius:14px;overflow:hidden;border:1px solid #E5E7EB">
    <div style="flex:1;padding:14px 18px;background:#FEF3C7;border-right:1px solid #FDE68A">
      <div style="font-size:10px;font-weight:900;color:#92400E;margin-bottom:4px">① 테넌트 총괄 <span style="background:#D97706;color:white;padding:1px 6px;border-radius:4px">[테넌트]</span></div>
      <div style="font-size:11px;color:#78350F">격리 그룹 생성 및<br>예산 총괄 선임 권한</div>
    </div>
    <div style="padding:14px 4px;display:flex;align-items:center;background:#fafafa;color:#9CA3AF;font-size:16px">→</div>
    <div style="flex:1;padding:14px 18px;background:#F5F3FF;border-right:1px solid #DDD6FE">
      <div style="font-size:10px;font-weight:900;color:#5B21B6;margin-bottom:4px">② 예산 총괄 <span style="background:#7C3AED;color:white;padding:1px 6px;border-radius:4px">[총괄]</span></div>
      <div style="font-size:11px;color:#4C1D95">그룹 내 계정·조직·<br>정책 독립 설계</div>
    </div>
    <div style="padding:14px 4px;display:flex;align-items:center;background:#fafafa;color:#9CA3AF;font-size:16px">→</div>
    <div style="flex:1;padding:14px 18px;background:#EFF6FF">
      <div style="font-size:10px;font-weight:900;color:#1E40AF;margin-bottom:4px">③ 예산 운영 <span style="background:#1D4ED8;color:white;padding:1px 6px;border-radius:4px">[운영]</span></div>
      <div style="font-size:11px;color:#1e3a8a">본부·센터 단위<br>예산 집행 승인</div>
    </div>
  </div>

  <!-- 격리 그룹 목록 -->
  <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">
    격리 그룹 목록 (${myGroups.length}개)
  </div>
  ${cards || '<div style="padding:40px;text-align:center;color:#9CA3AF">생성된 격리 그룹이 없습니다.</div>'}
</div>
${modalHtml}`;
}

function _saveNewIsolationGroup() {
  const name = document.getElementById('ig-name')?.value?.trim();
  const desc = document.getElementById('ig-desc')?.value?.trim();
  const adminKey = document.getElementById('ig-admin')?.value;
  if (!name) { alert('그룹명을 입력하세요.'); return; }
  if (!adminKey) { alert('예산 총괄 담당자를 선임하세요.'); return; }
  const admin = BO_PERSONAS[adminKey];
  const newGroup = {
    id: 'IG-' + boCurrentPersona.tenantId + '-' + Date.now().toString().slice(-4),
    tenantId: boCurrentPersona.tenantId,
    name, desc: desc || '',
    globalAdminKey: adminKey,
    opManagerKeys: [],
    ownedAccounts: [],
    createdBy: Object.keys(BO_PERSONAS).find(k => BO_PERSONAS[k] === boCurrentPersona),
    status: 'active',
    createdAt: new Date().toISOString().slice(0,10)
  };
  ISOLATION_GROUPS.push(newGroup);
  _igModal = false;
  alert(`✅ 격리 그룹 생성 완료!\n\n🛡️ ${name}\n👤 예산 총괄: ${admin?.name}(${admin?.dept})\n\n이제 ${admin?.name}님이 그룹 내 예산 계정·가상조직·서비스 정책을 독립적으로 구성할 수 있습니다.`);
  renderIsolationGroups();
}
