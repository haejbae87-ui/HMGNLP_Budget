$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PSScriptRoot).ShortPath
$git = "C:\Program Files\Git\cmd\git.exe"
$msg = "feat: P12 FO 수요예측 묶음 상신 UI (HMC/KIA 전용)"

# 임시 파일 정리
Remove-Item (Join-Path $PSScriptRoot "append_p12.ps1") -Force -ErrorAction SilentlyContinue

Write-Host "[ add ]" -ForegroundColor Cyan
& $git -C $shortRepo add -A 2>&1

Write-Host "[ commit ]" -ForegroundColor Cyan
& $git -C $shortRepo commit -m $msg 2>&1

Write-Host "[ pull rebase ]" -ForegroundColor Cyan
& $git -C $shortRepo pull --rebase origin main 2>&1

Write-Host "[ push ]" -ForegroundColor Cyan
& $git -C $shortRepo push origin main 2>&1

Write-Host "[ log ]" -ForegroundColor Cyan
& $git -C $shortRepo log --oneline -4 2>&1
Write-Host "Done!" -ForegroundColor Green
