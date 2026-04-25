$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder('c:\Users\jbae\OneDrive\바탕 화면\HMGNLP_Budget').ShortPath
$git = "C:\Program Files\Git\cmd\git.exe"
& $git -C $shortRepo status --short
& $git -C $shortRepo add -A
& $git -C $shortRepo commit -m "fix: redeploy frontoffice loader"
& $git -C $shortRepo pull --rebase origin main
& $git -C $shortRepo push origin main
& $git -C $shortRepo log --oneline -3
