$url = "https://haejbae87-ui.github.io/HMGNLP_Budget/js/fo_form_loader.js"
$fso = New-Object -ComObject Scripting.FileSystemObject
$shortRepo = $fso.GetFolder($PWD.Path).ShortPath
$out = "$shortRepo\scratch\remote_loader.js"
Invoke-WebRequest -Uri $url -OutFile $out
