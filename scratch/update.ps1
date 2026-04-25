$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PWD.Path).ShortPath
$g = "C:\Program Files\Git\cmd\git.exe"
& $g -C $shortRepo add -A
& $g -C $shortRepo commit -m "fix: deploy updates"
& $g -C $shortRepo pull --rebase origin main
& $g -C $shortRepo push origin main
& $g -C $shortRepo log --oneline -3
