try {
    $text = [System.IO.File]::ReadAllText('./data/quiz.json')
    $data = ConvertFrom-Json $text
    $data.puzzles | Select-Object -First 5 | ConvertTo-Json
} catch {
    Write-Host $_.Exception.Message
}
