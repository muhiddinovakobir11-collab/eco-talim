$json = Get-Content -Raw -Path 'data\laws.json'
try {
    $obj = ConvertFrom-Json $json
    Write-Host "Success"
} catch {
    Write-Host $_.Exception.Message
}
