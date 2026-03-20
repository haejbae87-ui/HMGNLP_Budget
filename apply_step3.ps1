$src = ".\public\js\bo_budget_master.js"
$jsSrc = ".\new_step3.js"
$sr = New-Object System.IO.StreamReader($src, [System.Text.Encoding]::UTF8)
$raw = $sr.ReadToEnd()
$sr.Close()

$jSr = New-Object System.IO.StreamReader($jsSrc, [System.Text.Encoding]::UTF8)
$newSection = $jSr.ReadToEnd()
$jSr.Close()

$startMarker = "// [2.3]"
$endMarker = "// 가상 조직 관리"

$iStart = $raw.IndexOf($startMarker)
$iEnd = $raw.IndexOf($endMarker)

if ($iStart -lt 0 -or $iEnd -lt 0) { Write-Host "Markers not found!"; exit 1; }

$before = $raw.Substring(0, $iStart)
$after = $raw.Substring($iEnd)

$newContent = $before + $newSection + "`n`n// ═════════════════════════════════════════════════════════════════════════════`n" + $after

$sw = New-Object System.IO.StreamWriter($src, $false, [System.Text.Encoding]::UTF8)
$sw.Write($newContent)
$sw.Close()
Write-Host "Replaced successfully!"
