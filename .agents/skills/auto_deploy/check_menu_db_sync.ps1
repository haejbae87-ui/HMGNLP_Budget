param([switch]$AutoFix = $false)
$URL  = "https://wihsojhucgmcdfpufonf.supabase.co"
$ANON = "sb_publishable_xjFJV_1SDi0k43su5KtMPQ_sdnTyJkE"
$ROLES= @("platform_admin","tenant_admin","budget_admin")

# bo_layout.js 경로 자동 탐지 (스크립트 위치 기반)
$root = Split-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot)))
$JS   = Join-Path $root "public\js\bo_layout.js"
if (-not (Test-Path $JS)) { Write-Host "ERROR: bo_layout.js not found at $JS"; exit 1 }

Write-Host "=== [1/3] Parse menu IDs from bo_layout.js ==="
$ids = Select-String -Path $JS -Pattern "id:\s+`"([^`"]+)`"" |
    ForEach-Object { if ($_.Line -match "id:\s+`"([^`"]+)`"") { $Matches[1] } } |
    Where-Object { $_ } | Sort-Object -Unique
Write-Host "      Found: $($ids.Count) menu IDs: $($ids -join ", ")"

Write-Host "=== [2/3] Query Supabase DB ==="
$h = @{ apikey=$ANON; Authorization="Bearer $ANON"; "Content-Type"="application/json" }
try {
    $res = Invoke-RestMethod -Uri "$URL/rest/v1/role_menu_permissions?select=menu_id" -Headers $h
    $db  = $res | Select-Object -ExpandProperty menu_id | Sort-Object -Unique
    Write-Host "      DB: $($db.Count) menu IDs registered"
} catch { Write-Host "ERROR querying DB: $_"; exit 1 }

Write-Host "=== [3/3] Compare ==="
$miss = $ids | Where-Object { $db -notcontains $_ }
if ($miss.Count -eq 0) { Write-Host "OK - All $($ids.Count) menus are in DB."; exit 0 }
Write-Host "MISSING $($miss.Count): $($miss -join ", ")"
if (-not $AutoFix) { Write-Host "Re-run with -AutoFix to insert. FAIL."; exit 1 }

Write-Host "AutoFix: Inserting..."
$rows= @(); foreach ($m in $miss) { foreach ($r in $ROLES) { $rows += [PSCustomObject]@{role_code=$r;menu_id=$m} } }
$body= ConvertTo-Json $rows -Depth 5; if ($rows.Count -eq 1) { $body="[$body]" }
$hi  = @{ apikey=$ANON; Authorization="Bearer $ANON"; "Content-Type"="application/json"; Prefer="resolution=ignore-duplicates,return=minimal" }
try {
    Invoke-RestMethod -Uri "$URL/rest/v1/role_menu_permissions" -Headers $hi -Method POST -Body $body | Out-Null
    Write-Host "INSERT OK: $($rows.Count) rows | menus: $($miss -join ", ")"
} catch { Write-Host "INSERT FAILED: $_"; exit 1 }
Write-Host "Done."; exit 0
