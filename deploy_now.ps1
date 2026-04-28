$git = "C:\Program Files\Git\cmd\git.exe"
$repo = Get-Location

Write-Host "=== [1] 변경 파일 확인 ===" -ForegroundColor Cyan
& $git -C $repo status

Write-Host "`n=== [2] 문법 검사 ===" -ForegroundColor Cyan
node --check "public\js\bo_forecast_period.js"
if ($LASTEXITCODE -eq 0) { Write-Host "bo_forecast_period.js OK" -ForegroundColor Green }
node --check "public\js\fo_plans_list.js"
if ($LASTEXITCODE -eq 0) { Write-Host "fo_plans_list.js OK" -ForegroundColor Green }
node --check "public\js\fo_apply_list.js"
if ($LASTEXITCODE -eq 0) { Write-Host "fo_apply_list.js OK" -ForegroundColor Green }

Write-Host "`n=== [3] 스테이징 ===" -ForegroundColor Cyan
& $git -C $repo add -A

Write-Host "`n=== [4] 커밋 ===" -ForegroundColor Cyan
& $git -C $repo commit -m "feat: 수요예측 캠페인 대상 사업연도 필드 추가 + FO 사업계획 연도 자동 연동"

Write-Host "`n=== [5] Pull Rebase ===" -ForegroundColor Cyan
& $git -C $repo pull --rebase origin main

Write-Host "`n=== [6] Push ===" -ForegroundColor Cyan
& $git -C $repo push origin main

Write-Host "`n=== [7] 최종 커밋 확인 ===" -ForegroundColor Cyan
& $git -C $repo log --oneline -3

Write-Host "`n✅ 배포 완료!" -ForegroundColor Green
