$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PWD.Path).ShortPath
$git = "C:\Program Files\Git\cmd\git.exe"
& $git -C $shortRepo add -A
& $git -C $shortRepo commit -m "fix: deploy"
& $git -C $shortRepo pull --rebase origin main
& $git -C $shortRepo push origin main
& $git -C $shortRepo log --oneline -3
