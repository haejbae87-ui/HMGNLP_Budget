---
description: 변경사항을 git add, commit, pull --rebase, push 하는 워크플로우
---

// turbo-all

1. 스테이징 되지 않은 변경 파일을 확인한다
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" status
```

2. 변경된 전체 파일을 스테이징한다
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" add -A
```

3. 커밋 메시지와 함께 커밋한다 (커밋 메시지는 작업 내용에 맞게 작성)
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" commit -m "작업 내용 요약"
```

4. 원격 저장소 변경사항을 rebase로 가져온다
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" pull --rebase origin main
```

5. 원격 저장소에 push한다
```
& "C:\Program Files\Git\cmd\git.exe" -C "c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget" push origin main
```
