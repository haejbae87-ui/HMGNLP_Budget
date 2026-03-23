// ─── 플랫폼 총괄 영역: 전사 모니터링 + 관리자 권한 매핑 ──────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// [플랫폼] 전사 예산 계정 모니터링
// ═══════════════════════════════════════════════════════════════════════════════
function renderPlatformMonitor() {
  const el = document.getElementById('bo-content');

  // 전사 계정 통계 집계
  const tenantStats = TENANTS.map(t => {
    const accs = getTenantAccounts(t.id);
    const forms = FORM_MASTER.filter(f=>f.tenantId===t.id);
    const rules = FORM_BUDGET_RULES.filter(r=>r.tenantId===t.id);
    return { ...t, accCount: accs.length, formCount: forms.length, ruleCount: rules.length, accs };
  });

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#F59E0B;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">PLATFORM ADMIN</span>
      <h1 class="bo-page-title" style="margin:0">전사 예산 계정 모니터링</h1>
    </div>
    <p class="bo-page-sub">각 테넌트(회사)의 예산 계정, 양식, 룰 설정 현황을 모니터링합니다. 플랫폼 총괄은 직접 계정을 생성하지 않으며, 각 사 담당자의 설정을 지원합니다.</p>
  </div>

  <!-- 요약 카드 -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    ${[
      ['🏢','테넌트 수',TENANTS.length+'개','#002C5F','#EFF6FF'],
      ['💳','총 계정 수',ACCOUNT_MASTER.length+'개','#059669','#F0FDF4'],
      ['📄','총 양식 수',FORM_MASTER.length+'개','#7C3AED','#F5F3FF'],
      ['⚡','룰 수',FORM_BUDGET_RULES.length+'개','#D97706','#FFF7ED'],
    ].map(([icon,label,val,color,bg])=>`
    <div class="bo-card" style="padding:16px 18px;background:${bg};border-color:${color}20">
      <div style="font-size:22px;margin-bottom:4px">${icon}</div>
      <div style="font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em">${label}</div>
      <div style="font-size:22px;font-weight:900;color:${color}">${val}</div>
    </div>`).join('')}
  </div>

  <!-- 테넌트별 상세 -->
  ${tenantStats.map(t=>`
  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;align-items:center;gap:12px">
      <span style="width:10px;height:10px;background:${t.color};border-radius:50%;display:inline-block"></span>
      <span style="font-weight:800;font-size:14px;color:#111827">${t.name}</span>
      <div style="display:flex;gap:8px;margin-left:8px">
        <span class="bo-badge bo-badge-blue">💳 계정 ${t.accCount}개</span>
        <span class="bo-badge bo-badge-purple">📄 양식 ${t.formCount}개</span>
        <span class="bo-badge bo-badge-orange">⚡ 룰 ${t.ruleCount}개</span>
      </div>
    </div>
    <table class="bo-table">
      <thead><tr>
        <th>계정코드</th><th>구분</th><th>계정명</th>
        <th style="text-align:center">사전계획 필수</th>
        <th style="text-align:center">이월</th>
        <th>용도</th><th>상태</th>
      </tr></thead>
      <tbody>
        ${t.accs.map(a=>`
        <tr>
          <td><code style="background:#F3F4F6;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">${a.code}</code></td>
          <td>${boGroupBadge(a.group==='R&D'?'rnd':'general')}</td>
          <td style="font-weight:700">${a.name}</td>
          <td style="text-align:center"><span class="bo-badge ${a.planRequired?'bo-badge-blue':'bo-badge-gray'}">${a.planRequired?'✅ 필수':'❌ 불필요'}</span></td>
          <td style="text-align:center"><span class="bo-badge ${a.carryover?'bo-badge-green':'bo-badge-gray'}">${a.carryover?'허용':'불가'}</span></td>
          <td style="font-size:12px;color:#6B7280">${a.desc}</td>
          <td><span class="bo-badge ${a.active?'bo-badge-green':'bo-badge-gray'}">${a.active?'활성':'비활성'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`).join('')}

  <div class="bo-card" style="padding:14px 20px;background:#FFF7ED;border-color:#FED7AA">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <span style="font-size:18px">ℹ️</span>
      <div>
        <div style="font-size:12px;font-weight:800;color:#B45309;margin-bottom:4px">플랫폼 총괄 역할 안내</div>
        <div style="font-size:12px;color:#92400E;line-height:1.7">
          예산 계정의 신규 생성·편집은 <strong>각 사 총괄 담당자(신O남, 류O령 등)</strong>가 직접 수행합니다.<br>
          플랫폼 총괄은 전사 현황 모니터링, 시스템 오류 대응, 관리자 권한 부여를 담당합니다.
        </div>
      </div>
    </div>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// [플랫폼] 관리자 권한 매핑
// ═══════════════════════════════════════════════════════════════════════════════
function renderPlatformRoles() {
  const el = document.getElementById('bo-content');
  const personas = Object.values(BO_PERSONAS);

  el.innerHTML = `
<div class="bo-fade">
  <div style="margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="background:#F59E0B;color:#fff;font-size:9px;font-weight:900;padding:3px 8px;border-radius:6px;letter-spacing:.08em">PLATFORM ADMIN</span>
      <h1 class="bo-page-title" style="margin:0">관리자 권한 매핑</h1>
    </div>
    <p class="bo-page-sub">플랫폼 총괄이 각 사 담당자에게 Tenant Admin / Budget Admin 권한을 부여합니다.</p>
  </div>

  <div class="bo-card" style="overflow:hidden;margin-bottom:16px">
    <div style="padding:14px 20px;border-bottom:1px solid #F3F4F6;display:flex;justify-content:space-between;align-items:center">
      <span class="bo-section-title">전체 관리자 현황 (${personas.length}명)</span>
      <button class="bo-btn-primary bo-btn-sm">+ 관리자 추가</button>
    </div>
    <table class="bo-table">
      <thead><tr>
        <th>성명</th><th>소속</th><th>직급</th><th>역할</th><th>테넌트</th>
        <th>접근 가능 메뉴</th><th>상태</th><th>관리</th>
      </tr></thead>
      <tbody>
        ${personas.map(p=>`
        <tr>
          <td style="font-weight:700">${p.name}</td>
          <td style="font-size:12px;color:#6B7280">${p.dept}</td>
          <td style="font-size:12px">${p.pos}</td>
          <td><span class="role-tag ${p.roleClass}">${p.roleLabel}</span></td>
          <td>
            ${p.tenantId ? `<span class="bo-badge bo-badge-blue">${TENANTS.find(t=>t.id===p.tenantId)?.name||p.tenantId}</span>` : '<span class="bo-badge bo-badge-orange">플랫폼 전체</span>'}
          </td>
          <td style="font-size:11px;color:#6B7280;max-width:200px">${p.accessMenus.join(' · ')}</td>
          <td><span class="bo-badge bo-badge-green">활성</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="bo-btn-secondary bo-btn-sm">수정</button>
              <button class="bo-btn-secondary bo-btn-sm" style="color:#EF4444;border-color:#EF4444">회수</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- 역할 설명 -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
    ${[
      ['🌐','플랫폼 총괄 Admin','전사 모니터링, 시스템 관리, 관리자 권한 부여','#F59E0B','#FFF7ED'],
      ['⚙️','테넌트 오너 Admin','예산 계정 생성, 양식 빌더, 조직 매핑, 룰 빌더','#1D4ED8','#EFF6FF'],
      ['📋','본부/센터 담당자','계획 관리, 배정, 집행 결재','#7C3AED','#F5F3FF'],
    ].map(([icon,title,desc,color,bg])=>`
    <div class="bo-card" style="padding:16px;background:${bg};border-color:${color}30">
      <div style="font-size:20px;margin-bottom:6px">${icon}</div>
      <div style="font-size:12px;font-weight:800;color:${color};margin-bottom:4px">${title}</div>
      <div style="font-size:11px;color:#6B7280;line-height:1.6">${desc}</div>
    </div>`).join('')}
  </div>
</div>`;
}
