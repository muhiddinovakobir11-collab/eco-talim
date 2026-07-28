$jsonText = [System.IO.File]::ReadAllText('./data/quiz.json')
$data = ConvertFrom-Json $jsonText

$puzzles = $data.puzzles
$images = @("./data/images/p1.jpg", "./data/images/p2.jpg", "./data/images/p3.jpg", "./data/images/p4.jpg", "./data/images/p5.jpg")

foreach ($puzzle in $puzzles) {
    # Oddiy kalit so'zlarga qarab rasmlarni taqsimlash
    $text = $puzzle.story.ToLower()
    $img = $images[0] # Default (O'rmon)

    if ($text -match "zavod|havo|tutun|zaharli") {
        $img = "./data/images/p2.jpg"
    } elseif ($text -match "suv|daryo|chiqindi|axlat|plastik") {
        $img = "./data/images/p3.jpg"
    } elseif ($text -match "ov|hayvon|qush|baliq|brakonyer") {
        $img = "./data/images/p4.jpg"
    } elseif ($text -match "olov|yong'in|yoqish") {
        $img = "./data/images/p5.jpg"
    } else {
        # Random assignment if no keyword match
        $img = $images[(Get-Random -Maximum 5)]
    }

    if (-not $puzzle.psobject.properties.Match('image').Count) {
        $puzzle | Add-Member -MemberType NoteProperty -Name "image" -Value $img -Force
    } else {
        $puzzle.image = $img
    }
}

$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('./data/quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)
Write-Host "JSON yangilandi: 166 ta savolga 5 ta sifatli rasm biriktirildi."
