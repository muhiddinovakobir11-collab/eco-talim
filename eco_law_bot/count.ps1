$json = Get-Content -Raw './data/quiz.json'
$data = ConvertFrom-Json $json
$total = 0
foreach ($prop in $data.psobject.properties) {
    $count = $prop.Value.Length
    Write-Host ($prop.Name + ': ' + $count)
    $total += $count
}
Write-Host "Total: $total"
