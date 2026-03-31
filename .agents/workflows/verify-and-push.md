---
description: 코드 변경 완료 후 반드시 실행하는 검증 + 깃 배포 워크플로우. 로컬 수정 후 항상 이 워크플로우를 실행해야 한다.
---

// turbo-all

## 필수 실행 순서: 검증 → git push → GitHub Pages 배포 확인

### 1. 변경된 파일 목록 확인
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" status
```

### 2. 핵심 변경 파일에 문법 오류가 없는지 확인
(수정된 .js 파일을 node로 문법 체크)
```
node --check "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget\public\js\bo_virtual_org_unified.js"
```
> 오류 없으면 다음 단계 진행. 오류 있으면 수정 후 재실행.

### 3. 전체 스테이징
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" add -A
```

### 4. 커밋 (메시지는 실제 작업 내용으로 작성)
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" commit -m "작업 내용 요약"
```

### 5. 원격 최신 코드 rebase 후 push
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" pull --rebase origin main
```
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" push origin main
```

### 6. GitHub에 push된 커밋이 로컬과 일치하는지 확인
로컬 최신 커밋 SHA와 원격 origin/main 커밋 SHA를 비교한다.
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" log --oneline -3
```
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" ls-remote origin main
```
두 커밋 SHA의 앞 7자리가 일치하면 push 성공. 불일치 시 5단계 재실행.

### 7. GitHub Commits API로 최신 커밋 확인 (인증 불필요)
```powershell
(Invoke-RestMethod -Uri "https://api.github.com/repos/haejbae87-ui/HMGNLP_Budget/commits/main" -Headers @{Accept="application/vnd.github+json"}).sha.Substring(0,7)
```
출력된 7자리 SHA가 6단계의 로컬 커밋 SHA와 일치하면 GitHub에 push 완료.
GitHub Pages 배포는 통상 push 후 1~2분 내 자동 완료된다.

> ⚠️ 절대 금지: 로컬 파일만 확인하고 "배포/반영 완료"로 보고하는 행위
> ⚠️ read_url_content 도구는 JS 파일을 마크다운으로 변환하여 내용이 누락될 수 있으므로 배포 확인에 사용 금지
