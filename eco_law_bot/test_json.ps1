try {
    $text = [System.IO.File]::ReadAllText('./data/quiz.json')
    $data = ConvertFrom-Json $text
    Write-Host "JSON parsed successfully! Quizzes count: " $data.quizzes.Count
} catch {
    Write-Host "Error parsing JSON:"
    Write-Host $_.Exception.Message
}
