// bo_cert_mapping.js
// 자격증 맵핑 관리 독립 메뉴 화면 (기존 통합 화면의 4번 탭에서 분리)

let _cmTemplates = []; // 로드된 자격증 템플릿 목록
let _cmSelectedTenant = null;
let _cmSelectedTplId = null;

// 메뉴 진입점
async function renderCertMappingMenu() {
  document.getElementById('bo-content').innerHTML = `
    <div style="padding:24px;max-width:1200px;margin:0 auto">
      <h2 style="font-size:20px;font-weight:900;color:#111827;margin-bottom:20px">📜 자격증 맵핑 관리</h2>
      
      <!-- 상단 권한 조회 필터 영역 -->
      <div id="cm-filter-area" style="background:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:700;color:#9A3412">조회 조건 로딩 중...</span>
      </div>
      
      <!-- 메인 영역 -->
      <div id="cm-main-area">
        <div style="padding:40px;text-align:center;color:#9CA3AF">상단 필터에서 템플릿을 선택해주세요.</div>
      </div>
    </div>
  `;

  await _cmLoadTemplates();
  _cmRenderFilterArea();
}

// 템플릿 목록 로드 (purpose = 'cert' 또는 '자격증')
async function _cmLoadTemplates() {
  const sb = typeof _sb === 'function' ? _sb() : null;
  if (!sb) return;
  try {
    const { data, error } = await sb.from('virtual_org_templates')
      .select('*')
      .in('purpose', ['cert', '자격증'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    // tree 필드를 파싱해야 내부 가상조직에 접근 가능
    _cmTemplates = (data || []).map(t => {
      if (typeof t.tree === 'string') {
        try { t.tree = JSON.parse(t.tree); } catch(e){ t.tree = {}; }
      }
      return t;
    });
  } catch (err) {
    console.error('자격증 템플릿 로드 실패:', err);
  }
}

function _cmRenderFilterArea() {
  const persona = boCurrentPersona;
  const role = persona?.role;
  const tenants = typeof TENANTS !== 'undefined' ? TENANTS : [];
  
  let tenantOptions = '';
  let targetTenantId = null;
  
  if (role === 'platform_admin') {
    targetTenantId = _cmSelectedTenant || (tenants[0]?.id || '');
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#9A3412">테넌트(회사)</label>
        <select onchange="_cmOnChangeTenant(this.value)" style="padding:6px 10px;border:1px solid #FDBA74;border-radius:6px;font-size:13px;font-weight:600;color:#9A3412;outline:none">
          ${tenants.map(t => `<option value="${t.id}" ${t.id === targetTenantId ? 'selected' : ''}>${t.name} (${t.id})</option>`).join('')}
        </select>
      </div>
    `;
  } else {
    targetTenantId = persona.tenantId || '';
    tenantOptions = `
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:12px;font-weight:700;color:#9A3412">테넌트(회사)</label>
        <div style="padding:6px 12px;background:#FFEDD5;border:1px solid #FDC086;border-radius:6px;font-size:13px;font-weight:700;color:#7C2D12">
          ${tenants.find(t=>t.id === targetTenantId)?.name || targetTenantId}
        </div>
      </div>
    `;
  }
  
  _cmSelectedTenant = targetTenantId;

  // 템플릿 필터링
  let filteredTpls = _cmTemplates.filter(t => t.tenant_id === _cmSelectedTenant);
  
  if (role !== 'platform_admin' && role !== 'tenant_global_admin') {
    const userRoleCodes = (persona.roles || [persona.role]).map(r => r.code || r);
    filteredTpls = filteredTpls.filter(t => {
      const ownerIds = t.owner_role_ids || t.ownerRoleIds || [];
      const headCode = t.head_manager_role?.code || t.headManagerRole?.code;
      return userRoleCodes.some(ur => ownerIds.includes(ur) || ur === headCode);
    });
  }

  if (!_cmSelectedTplId && filteredTpls.length > 0) {
    _cmSelectedTplId = filteredTpls[0].id;
  }
  if (_cmSelectedTplId && !filteredTpls.find(t => t.id === _cmSelectedTplId)) {
    _cmSelectedTplId = filteredTpls[0] ? filteredTpls[0].id : null;
  }

  const tplOptions = `
    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;border-left:1px solid #FDBA74;padding-left:20px">
      <label style="font-size:12px;font-weight:700;color:#9A3412">자격증 가상조직(템플릿)</label>
      <select onchange="_cmOnChangeTpl(this.value)" style="padding:6px 10px;border:1px solid #FDBA74;border-radius:6px;font-size:13px;font-weight:600;min-width:200px;color:#9A3412;outline:none">
        ${filteredTpls.length === 0 ? '<option value="">조회된 조직이 없습니다</option>' : ''}
        ${filteredTpls.map(t => `<option value="${t.id}" ${t.id === _cmSelectedTplId ? 'selected' : ''}>${t.name}</option>`).join('')}
      </select>
    </div>
  `;

  document.getElementById('cm-filter-area').innerHTML = tenantOptions + tplOptions;

  _cmRenderContent(filteredTpls.find(t => t.id === _cmSelectedTplId));
}

function _cmOnChangeTenant(tenantId) {
  _cmSelectedTenant = tenantId;
  _cmSelectedTplId = null;
  _cmRenderFilterArea();
}

function _cmOnChangeTpl(tplId) {
  _cmSelectedTplId = tplId;
  _cmRenderFilterArea();
}

// 본문 렌더링 (기존 _vuTabCert 로직)
function _cmRenderContent(tpl) {
  const mainEl = document.getElementById('cm-main-area');
  
  if (!tpl) {
    mainEl.innerHTML = `
      <div style="padding:40px;text-align:center;background:#F9FAFB;border-radius:14px;border:1px dashed #D1D5DB">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-size:13px;font-weight:700;color:#6B7280">선택할 수 있는 자격증 템플릿이 없습니다.</div>
      </div>
    `;
    return;
  }

  const groups = tpl.tree?.hqs || tpl.tree?.centers || [];
  
  mainEl.innerHTML = `
    <div class="bo-card" style="padding:24px">
      <div style="margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #F1F5F9">
        <h3 style="font-size:16px;font-weight:900;color:#111827;margin:0 0 4px">📜 자격증 맵핑 (템플릿: ${tpl.name})</h3>
        <p style="font-size:12px;color:#64748B;margin:0">가상조직 단위로 지원 대상 자격증을 등록합니다.</p>
      </div>
      
      ${groups.length ? groups.map((g, gi) => {
        const certs = g.certMappings || [];
        return \`
        <div style="padding:16px 20px;margin-bottom:12px;border:1px solid #E5E7EB;border-radius:12px;background:#FAFAFA">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">🏢</span>
              <span style="font-size:14px;font-weight:800;color:#111827">\${g.name}</span>
              <span style="font-size:10px;padding:2px 8px;border-radius:5px;background:#FFF7ED;color:#C2410C;font-weight:700">\${certs.length}개 자격증</span>
            </div>
            <button onclick="_cmAddCert('\${tpl.id}',\${gi})" class="bo-btn-secondary bo-btn-sm" style="color:#C2410C;border-color:#FED7AA;background:#FFF">+ 자격증 추가</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            \${certs.map((c,ci) => \`
            <span style="padding:5px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:11px;font-weight:600;color:#C2410C;display:flex;align-items:center;gap:4px;box-shadow:0 1px 2px rgba(194,65,12,.05)">
              📜 \${c.name || c}
              <button onclick="_cmRemoveCert('\${tpl.id}',\${gi},\${ci})" style="border:none;background:none;color:#C2410C;cursor:pointer;font-size:10px;padding:0;margin-left:4px;opacity:0.6" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">✕</button>
            </span>\`).join('') || '<span style="font-size:11px;color:#9CA3AF;padding:4px 0">맵핑된 자격증이 없습니다. 위 버튼을 눌러 추가하세요.</span>'}
          </div>
        </div>\`;
      }).join('') : '<div style="padding:40px;text-align:center;color:#9CA3AF;font-size:13px;font-weight:700;background:#F9FAFB;border-radius:8px;border:1px dashed #E5E7EB">가상조직이 등록되지 않았습니다.<br><small style="font-weight:400;margin-top:4px;display:block">가상 교육 조직 관리 메뉴에서 조직을 먼저 구성하세요.</small></div>'}
    </div>
  `;
}

// ── 자격증 맵핑 액션 ────────────────────────────────────────────────────────
function _cmAddCert(tplId, gi) {
  const tpl = _cmTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g) return;
  const name = prompt('추가할 자격증 이름을 입력하세요:');
  if (!name || !name.trim()) return;
  if (!g.certMappings) g.certMappings = [];
  g.certMappings.push({ id: 'CE-' + Date.now(), name: name.trim() });
  
  _cmAutoSave(tpl);
}

function _cmRemoveCert(tplId, gi, ci) {
  if (!confirm('이 자격증 맵핑을 삭제하시겠습니까?')) return;
  const tpl = _cmTemplates.find(t => t.id === tplId);
  if (!tpl) return;
  const g = (tpl.tree?.hqs || [])[gi];
  if (!g || !g.certMappings) return;
  g.certMappings.splice(ci, 1);
  
  _cmAutoSave(tpl);
}

// ── DB 자동저장 및 렌더링 갱신 ────────────────────────────────────────────────
async function _cmAutoSave(tpl) {
  try {
    const sb = typeof _sb === 'function' ? _sb() : null;
    if (sb) {
      const treeJson = JSON.parse(JSON.stringify(tpl.tree));
      const { error } = await sb.from('virtual_org_templates')
        .update({ tree: treeJson, updated_at: new Date().toISOString() })
        .eq('id', tpl.id);
      if (error) throw error;
    }
  } catch(e) {
    console.error('자동저장 실패:', e);
    alert('맵핑 저장 중 오류가 발생했습니다: ' + e.message);
  }
  _cmRenderContent(tpl); // 저장 후 화면 다시 그리기
}
