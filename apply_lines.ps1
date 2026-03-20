$lines = [System.IO.File]::ReadAllLines(".\public\js\bo_budget_master.js", [System.Text.Encoding]::UTF8)
$startIdx = -1
$endIdx = -1
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($startIdx -eq -1 -and $lines[$i] -match "\[2\.3\]") { $startIdx = $i }
    if ($startIdx -ne -1 -and $lines[$i] -match "가상 조직 관리") { $endIdx = $i; break }
}

if ($startIdx -ge 0 -and $endIdx -ge 0) {
    $before = $lines[0..($startIdx - 1)]
    $after = $lines[($endIdx - 1)..($lines.Length - 1)]
    $newJS = [System.IO.File]::ReadAllLines(".\new_step3.js", [System.Text.Encoding]::UTF8)
   
    $final = [System.Collections.Generic.List[string]]::new()
    $final.AddRange($before)
    $final.AddRange($newJS)
    $final.AddRange($after)
   
    [System.IO.File]::WriteAllLines(".\public\js\bo_budget_master.js", $final, [System.Text.Encoding]::UTF8)
    Write-Host "Successfully replaced lines $startIdx to $endIdx"
}
else {
    Write-Host "Could not find markers! start=$startIdx end=$endIdx"
}
