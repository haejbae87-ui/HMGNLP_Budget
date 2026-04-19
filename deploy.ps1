# ================================================================
#  deploy.ps1 — HMGNLP_Budget One-Click Deploy Script
#  Usage: Run .\deploy.ps1 from the project root terminal
# ================================================================

# UTF-8 encoding
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Convert Korean path to 8.3 short path so git can handle it
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PSScriptRoot).ShortPath
$git = "C:\Program Files\Git\cmd\git.exe"

Clear-Host
Write-Host "==========================================" -ForegroundColor DarkCyan
Write-Host "   HMGNLP_Budget  Deploy Script" -ForegroundColor Cyan
Write-Host "   Path: $($PSScriptRoot)" -ForegroundColor DarkGray
Write-Host "==========================================`n" -ForegroundColor DarkCyan

# ── 1. Check for changes ──────────────────────────────────────
Write-Host "[ 1/5 ] Checking changed files..." -ForegroundColor Cyan
$status = & $git -C $shortRepo status --short 2>&1
if (-not $status) {
    Write-Host "  [OK] Nothing to deploy. Already up to date." -ForegroundColor Green
    Write-Host ""
    & $git -C $shortRepo log --oneline -3
    Write-Host "`nPress any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host "  Changed files:" -ForegroundColor White
$status | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
Write-Host ""

# ── 2. Commit message ─────────────────────────────────────────
Write-Host "[ 2/5 ] Enter commit message" -ForegroundColor Cyan
Write-Host "  (e.g. feat: ..., fix: ..., P16: ...)" -ForegroundColor DarkGray
$msg = Read-Host "  > Message"
if (-not $msg.Trim()) {
    Write-Host "  [WARN] Empty message, using 'chore: update'" -ForegroundColor Yellow
    $msg = "chore: update"
}
Write-Host ""

# ── 3. git add -A ─────────────────────────────────────────────
Write-Host "[ 3/5 ] Staging all (git add -A)..." -ForegroundColor Cyan
& $git -C $shortRepo add -A 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-Host ""

# ── 4. git commit ─────────────────────────────────────────────
Write-Host "[ 4/5 ] Committing..." -ForegroundColor Cyan
& $git -C $shortRepo commit -m $msg 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n  [ERROR] Commit failed." -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host ""

# ── 5. pull --rebase + push ───────────────────────────────────
Write-Host "[ 5/5 ] Syncing and pushing..." -ForegroundColor Cyan
& $git -C $shortRepo pull --rebase origin main 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n  [ERROR] Pull failed (conflict?)." -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

& $git -C $shortRepo push origin main 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n  [ERROR] Push failed." -ForegroundColor Red
    Write-Host "`nPress any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host "   [OK] Deploy complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Recent commits:" -ForegroundColor Cyan
& $git -C $shortRepo log --oneline -3 | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
Write-Host ""
Write-Host "  Note: GitHub Actions may add 1 extra sync commit after push." -ForegroundColor Yellow
Write-Host "        SHA difference of 1 commit is normal." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
