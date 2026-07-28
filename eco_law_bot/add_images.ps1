$json = Get-Content -Raw './data/quiz.json' -Encoding UTF8
$data = ConvertFrom-Json $json

for ($i = 0; $i -lt 5; $i++) {
    $imgNum = $i + 1
    $data.puzzles[$i] | Add-Member -MemberType NoteProperty -Name "image" -Value "./data/images/p$imgNum.jpg" -Force
}

$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('./data/quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)
