$ErrorActionPreference = "Stop"
$path = "public\js\bo_approval.js"
$content = Get-Content $path -Raw -Encoding UTF8

# 1. Global Set
$content = $content -replace 'let _boSubDocs           = \[\];          // 내가 처리해야 할 상신 문서 목록', "let _boSubDocs           = [];          // 내가 처리해야 할 상신 문서 목록`nlet _boSelectedForecasts = new Set();"

# 2. Add Floating Bar inside renderMyOperations
$floatingBar = @'
    // P13: 교육조직 묶음 생성 플로팅 바 (운영담당자 전용)
    const isOpManager = typeof boIsOpManager === "function" && boIsOpManager();
    const canBundle = isOpManager && _boApprovalTab === "pending" && _boApprovalDocFilter === "forecast";
    const bundleBarHtml = canBundle && _boSelectedForecasts.size > 0 ? `
      <div style="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:99;
        background:#1F2937;color:white;padding:16px 32px;border-radius:99px;box-shadow:0 10px 25px rgba(0,0,0,0.3);
        display:flex;align-items:center;gap:20px">
        <div style="font-size:14px;font-weight:700">📦 선택한 팀 묶음 <span style="color:#FBBF24;font-size:18px;margin:0 4px">${_boSelectedForecasts.size}</span>건</div>
        <button onclick="boOrgForecastModal()" style="padding:10px 24px;border-radius:99px;background:#D97706;color:white;border:none;font-weight:900;cursor:pointer">
          교육조직 묶음 생성 및 상신 →
        </button>
      </div>` : "";
'@
$content = $content -replace 'const cards = currentDocs\.length === 0', "$floatingBar`n`n    const cards = currentDocs.length === 0"
$content = $content -replace '<div style="display:flex;flex-direction:column;gap:12px">\$\{cards\}</div>', '<div style="display:flex;flex-direction:column;gap:12px">${cards}</div>`n      ${bundleBarHtml}'

# 3. Add Checkbox to Card
$checkboxLogic = @'
  // P13: 체크박스 렌더링 (운영담당자 + team_forecast + pending)
  const isOpManager = typeof boIsOpManager === "function" && boIsOpManager();
  const showCheckbox = isOpManager && isPending && doc.submission_type === "team_forecast";
  const isChecked = _boSelectedForecasts.has(doc.id);
  const chkHtml = showCheckbox ? `
    <div style="margin-right:12px;display:flex;align-items:center">
      <input type="checkbox" ${isChecked?"checked":""} onchange="boToggleForecastBundle('${doc.id}', this.checked)"
        style="width:20px;height:20px;cursor:pointer;accent-color:#D97706">
    </div>
  ` : "";

  return `<div class="bo-card" style="padding:20px;${!isPending?"opacity:0.75":""};display:flex">
    ${chkHtml}
    <div style="flex:1">
'@

$content = $content -replace 'return `<div class="bo-card" style="padding:20px;\$\{\!isPending\?"opacity:0\.75":""\}">', $checkboxLogic
$content = $content -replace '<\/div>`;\n\}', '</div></div>`;`n}'

# Save back
Set-Content $path $content -Encoding UTF8
Write-Host "bo_approval.js updated with floating bar and checkboxes."
