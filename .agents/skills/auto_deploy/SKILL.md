---
name: auto_deploy
description: 코드 개발 완료 후 자동 검증, 커밋 및 GitHub 배포를 수행하고 에러 발생 시 스스로 대처하는 지능형 스킬
---

# 자동 배포(Auto Deploy) 스킬 가이드

본 스킬은 사용자가 **"개발해줘", "배포해줘", "푸시해줘", "작업 완료했어"** 등의 요청을 하거나, 하나의 큰 기능 개발이 완료된 후 사용자가 배포를 승인했을 때 실행되는 핵심 훅(Hook) 스킬입니다.
**"개발해줘"**라는 키워드가 들어올 경우, 실질적인 코드 기능 개발 완료 후 즉시 이어서 **자동 배포(Auto Deploy)까지 한 큐에 알아서 연계 처리**해야 합니다.
단순히 명령어 스크립트를 도는 것을 넘어, 중간 단계에서 에러가 발생하면 파악하고 스스로 대처할 수 있도록 설계되었습니다.

## 실행 프로세스 및 기본 지침
아래 7단계를 순서대로 수행하되, 각 단계의 결과를 바탕으로 능동적인 피드백 루프를 가집니다.

### 0. 완료된 작업 상태 영구 저장 (docs/TASKS/active_tasks.md)
배포 명령어(`git status` 등)를 치기 직전에, 방금 진행한 개발 작업이 무엇인지 파악하여 `docs/TASKS/active_tasks.md` 파일 내의 할 일 목록(To-Do)에 `[x]` 처리를 하고 히스토리에 기록을 자동 업데이트합니다.

### 1. 변경된 파일 목록 확인 (Status)
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" status
```
- 확인 후 변경사항이 없으면 "배포할 변경사항이 없습니다"라고 사용자에게 알리고 종료합니다.

### 2. 문법/코드 필수 검증 (Verify)
변경된 핵심 `.js` 파일에 대해 문법적 오류가 없는지 `node --check`를 실행합니다.
```powershell
# 예시: 가장 최근에 작업한 핵심 js 파일들 점검
node --check "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget\public\js\bo_virtual_org_unified.js"
node --check "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget\public\js\bo_policy_builder.js"
```
**[⚠️ 예외 처리]**
- 여기서 `SyntaxError` 등 오류가 발견되면 스킬 진행을 중단하지 않습니다.
- 오류 로그를 읽어 스스로 스크립트를 열어(ex: `multi_replace_file_content` 도구 활용) 오타나 괄호 매칭 에러 등을 수정한 후, **2단계를 재실행**하여 검증을 통과해야 3단계로 넘어갑니다.

### 2.5. 메뉴 DB 동기화 검증 (Menu-DB Sync Check) ⚠️ 필수
> **신규 메뉴 추가 작업이 포함된 경우 반드시 실행합니다.**
> `bo_layout.js`의 모든 메뉴 ID가 Supabase `role_menu_permissions` 테이블에 등록되어 있는지 자동 비교합니다.
> 누락 항목이 있으면 `-AutoFix` 플래그로 자동 INSERT합니다.

```powershell
# [Dry-run] 누락 항목 감지만 (INSERT 없음)
node ".agents\skills\auto_deploy\check_menu_db_sync.js"

# [AutoFix] 누락 항목 자동 INSERT 포함
node ".agents\skills\auto_deploy\check_menu_db_sync.js" --fix
```

**[⚠️ 예외 처리]**
- 스크립트가 `❌ 검증 실패`를 출력하면 `-AutoFix`로 재실행하거나, Supabase MCP 도구로 직접 INSERT합니다.
- INSERT 대상 기본 역할: `platform_admin`, `tenant_admin`, `budget_admin`
- 특정 역할만 접근해야 하는 메뉴는 수동으로 추가 검토합니다.
- `bo_layout.js` 수정 없이 코드만 변경된 경우(렌더 함수 수정 등)엔 이 단계를 건너뜁니다.



### 3. 전체 스테이징 (Add)
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" add -A
```

### 4. 커밋 생성 (Commit)
- 사용자가 별도로 요청한 커밋 메시지가 없다면, 앞선 작업 내역을 바탕으로 가장 적절한 형태의 `feat: ...`, `fix: ...` 커밋 메시지를 생성합니다.
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" commit -m "작업 내용 요약"
```

### 5. 원격 저장소 동기화 (Pull Rebase)
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" pull --rebase origin main
```
**[⚠️ 예외 처리]**
- Rebase 과정에서 **Merge Conflict(충돌)** 가 발생한 경우:
  1. `git status`로 충돌 파일을 확인합니다.
  2. 스스로 충돌 내용을 분석해 안전하게 수정이 가능하면 수정하여 `git add`, `git rebase --continue`로 해결합니다.
  3. 판단이 어렵거나 기획적 의사결정이 필요하면 임시로 작업을 멈추고 사용자에게 충돌 부분 해결(선택)을 요청(`notify_user`)합니다.

### 6. 원격 저장소 푸시 (Push)
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" push origin main
```

### 7. 배포 완료 및 최종 SHA 검증 (Validate)
로컬에 반영된 최종 커밋 해시(SHA)와 원격 최신 해시를 대조해 푸시가 완벽히 성공했는지 더블 체크합니다.
```powershell
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" log --oneline -3
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" ls-remote origin main
```
또는 GitHub API 호출로 라이브 확인:
```powershell
(Invoke-RestMethod -Uri "https://api.github.com/repos/haejbae87-ui/HMGNLP_Budget/commits/main" -Headers @{Accept="application/vnd.github+json"}).sha.Substring(0,7)
```
**[⚠️ 예외 처리]**
- SHA가 일치하지 않거나 푸시 거절(Rejected)이 난 경우, 에러 원인을 분석하여 5단계(Pull)부터 다시 시도합니다.
- **⚡ sync-docs 자동 커밋 대처**: `public/` 파일이 변경된 push를 하면 GitHub Actions의 `sync-docs.yml`이 자동으로 `chore: sync docs from public [skip ci]` 커밋을 추가 생성합니다. 이 경우 `ls-remote`의 SHA가 로컬과 1커밋 차이가 나는 것은 **정상**입니다. push 결과 로그에 `main -> main`이 표시되었으면 배포 성공으로 판단하고, `pull --rebase origin main`으로 로컬을 동기화하면 됩니다. SHA 비교 실패로 무한 재시도하지 마세요.

---
**[🔥 스킬 발동 훅 요약]**
이 스킬은 앞으로 제가 코드 개발을 한 섹션 끝냈을 때, 사용자님이 **"개발해줘"**, **"배포해줘"**, 또는 **"개발하고 배포해"**라고만 요청하셔도 자동으로 발동되는 강력한 훅(Hook)입니다.
명령어에 "개발해줘"가 포함되었다면 코드 작업 수행 후 묻지 말고 즉시 이 **1~7단계 배포 및 점검 파이프라인을 자동 순차 실행**하며, 문제가 생기면 스스로 파악하고 고치며 끝을 맺습니다. 모든 터미널 명령어는 `SafeToAutoRun: true` 속성을 사용하여 가급적 사용자의 중간 클릭을 기다리지 않고 터보(Turbo) 모드처럼 백그라운드 환경에서 연속 진행하십시오.
