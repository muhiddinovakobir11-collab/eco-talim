$jsonText = [System.IO.File]::ReadAllText('./data/quiz.json')
$data = ConvertFrom-Json $jsonText
$data.puzzles | Select-Object -First 40 | Select-Object id, story | ConvertTo-Json
