$text = Get-Content -Raw -Path 'data\laws.json'
$text = $text.Replace(',"Count":10', '')
Set-Content -NoNewline -Path 'data\laws.json' -Value $text
