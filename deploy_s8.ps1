# S-8 배포 전용 (비대화형)
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PSScriptRoot).ShortPath
$git = "C:\Program Files\Git\cmd\git.exe"
$msg = "feat: S-8 BO 결재화면 상신문서 기반 전환 완료"

Write-Host "[ add ]" -ForegroundColor Cyan
& $git -C $shortRepo add -A 2>&1

Write-Host "[ commit ]" -ForegroundColor Cyan
& $git -C $shortRepo commit -m $msg 2>&1

Write-Host "[ pull rebase ]" -ForegroundColor Cyan
& $git -C $shortRepo pull --rebase origin main 2>&1

Write-Host "[ push ]" -ForegroundColor Cyan
& $git -C $shortRepo push origin main 2>&1

Write-Host "[ log ]" -ForegroundColor Cyan
& $git -C $shortRepo log --oneline -3 2>&1
Write-Host "Done!" -ForegroundColor Green
