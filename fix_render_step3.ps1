
# 현재 디렉토리 기준 상대 경로로 JS 파일 접근
$src = ".\public\js\bo_budget_master.js"
Write-Host "Trying relative path: $src"
Write-Host "Exists: $(Test-Path $src)"

if (!(Test-Path $src)) {
  Write-Host "ERROR: File not found"
  exit 1
}

$sr = New-Object System.IO.StreamReader($src, [System.Text.Encoding]::UTF8)
$raw = $sr.ReadToEnd()
$sr.Close()
Write-Host "Read OK, length=$($raw.Length)"

$iStart = $raw.IndexOf("// [2.3]")
$iEnd   = $raw.IndexOf("function s3ChangeTenant")
Write-Host "iStart=$iStart  iEnd=$iEnd"

if ($iStart -lt 0 -or $iEnd -lt 0) { Write-Host "ERROR: markers not found"; exit 1 }

$before = $raw.Substring(0, $iStart)
$after  = $raw.Substring($iEnd)

$newSection = @'
// [2.3] 양식-예산 매핑 룰 빌더
// =============================================================================
let _s3Tenant = 'HMG';
let _s3EditingRuleId = null;
function _s3GetGroups(tid) { return _s2GetGroups(tid); }

function renderStep3() {
  const tenantId = boCurrentPersona.tenantId || _s3Tenant;
  _s3Tenant = tenantId;
  const rules    = FORM_BUDGET_RULES.filter(r => r.tenantId === tenantId);
  const accounts = getTenantAccounts(tenantId);
  const groups   = _s3GetGroups(tenantId);
  const tenantName = TENANTS.find(t => t.id === tenantId)?.name || tenantId;

  const ruleCards = rules.map(r => {
    const group    = groups.find(g => g.id === r.virtualGroupId) || { name: r.virtualGroupId };
    const form     = FORM_MASTER.find(f => f.id === r.formId) || { name: r.formId };
    const planForm = r.planFormId ? FORM_MASTER.find(f => f.id === r.planFormId) : null;
    const anyPlanReq = r.accountCodes.some(c => accounts.find(a => a.code === c)?.planRequired);
    const accNames = r.accountCodes.map(c => { const a = accounts.find(x => x.code === c); return a ? a.name : c; });
    const toggleHtml = '<label class="bo-toggle red" onclick="event.stopPropagation()"><input type="checkbox" '
      + (r.budgetRequired ? 'checked' : '')
      + ' onchange="s3ToggleBudgetRequired(\'' + r.id + '\')"><span class="bo-toggle-slider"></span></label>';
    const chips = accNames.map(n =>
      '<span style="background:#EFF6FF;color:#1D4ED8;padding:3px 10px;border-radius:8px;font-size:12px;font-weight:700">' + n + '</span>'
    ).join('');
    const planSection = anyPlanReq
      ? '<div style="margin-top:10px;padding:10px 14px;background:#EFF6FF;border-radius:8px;border-left:3px solid #1D4ED8;display:flex;align-items:center;gap:10px">'
        + '<span style="font-size:12px;font-weight:700;color:#1E40AF">계획 양식:</span>'
        + (planForm
          ? '<span style="background:#DBEAFE;color:#1E40AF;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700">' + planForm.name + '</span>'
          : '<span style="color:#EF4444;font-size:12px;font-weight:700">미연결</span>')
        + '</div>' : '';
    return '<div class="bo-rule-card">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">'
      + '<div style="flex:1">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
      + '<span class="bo-rule-label if-label">IF</span>'
      + '<span style="font-size:13px;font-weight:700;color:#111827">' + group.name + '</span>'
      + '<span style="color:#9CA3AF;font-size:13px">이 조직이</span>'
      + '<span style="font-size:13px;font-weight:700;padding:2px 10px;border-radius:8px;background:#F3F4F6;color:#374151">' + form.name + '</span>'
      + '<span style="color:#9CA3AF;font-size:13px">를 열면</span>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
      + '<span class="bo-rule-label then-label">THEN</span>'
      + '<label class="bo-toggle-wrap">' + toggleHtml
      + '<span style="font-size:12px;font-weight:700;color:' + (r.budgetRequired ? '#DC2626' : '#6B7280') + '">'
      + (r.budgetRequired ? '예산 사용 필수' : '예산 미사용 허용') + '</span></label>'
      + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
      + '<span style="font-size:12px;color:#6B7280;font-weight:600">사용 계정:</span>' + chips
      + '<button onclick="openEditRuleModal(\'' + r.id + '\')" style="border:1.5px dashed #D1D5DB;background:none;border-radius:8px;padding:3px 10px;font-size:12px;color:#9CA3AF;cursor:pointer">편집</button>'
      + '</div></div>' + planSection + '</div>'
      + '<button onclick="s3DeleteRule(\'' + r.id + '\')" style="border:none;background:none;cursor:pointer;color:#D1D5DB;font-size:16px;padding:2px;flex-shrink:0">X</button>'
      + '</div></div>';
  }).join('') || '<div style="text-align:center;padding:40px;color:#9CA3AF;font-size:13px">설정된 룰이 없습니다.</div>';

  const modal = '<div id="s3-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9000;align-items:center;justify-content:center">'
    + '<div style="background:#fff;border-radius:16px;width:520px;max-height:80vh;overflow-y:auto;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2)">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
    + '<h3 id="s3-modal-title" style="font-size:15px;font-weight:800;color:#111827;margin:0">룰 설정</h3>'
    + '<button onclick="s3CloseModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#9CA3AF">X</button>'
    + '</div><div id="s3-modal-body"></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">'
    + '<button class="bo-btn-secondary bo-btn-sm" onclick="s3CloseModal()">취소</button>'
    + '<button class="bo-btn-primary bo-btn-sm" onclick="s3SaveRule()">저장</button>'
    + '</div></div></div>';

  return '<div>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
    + '<div><div style="font-size:13px;font-weight:800;color:#111827">' + tenantName + ' - 양식/예산/계획 연결 룰</div>'
    + '<div style="font-size:12px;color:#6B7280">' + rules.length + '개 룰 설정됨</div></div>'
    + '<button class="bo-btn-primary bo-btn-sm" onclick="openAddRuleModal()">+ 룰 추가</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px">' + ruleCards + '</div>'
    + '<div class="bo-card" style="padding:12px 18px;margin-top:12px;background:#F5F3FF;border-color:#DDD6FE">'
    + '<span style="font-size:12px;font-weight:700;color:#5B21B6">이 룰은 Front-end에 실시간 반영됩니다.</span></div>'
    + '</div>' + modal;
}

'@

$newContent = $before + $newSection + $after
$sw = New-Object System.IO.StreamWriter($src, $false, [System.Text.Encoding]::UTF8)
$sw.Write($newContent)
$sw.Close()
Write-Host "Done. Total bytes: $($newContent.Length)"
