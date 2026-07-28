$imagesDir = '.\data\images'

# 1. Barcha rasmlarni tekshirib, p1.jpg dan p5.jpg gacha bo'lmaganlarini o'chiramiz
Get-ChildItem -Path $imagesDir -Filter '*.jpg' | ForEach-Object {
    $fileName = $_.Name
    if ($fileName -notin @('p1.jpg','p2.jpg','p3.jpg','p4.jpg','p5.jpg')) {
        Remove-Item -Path $_.FullName -Force
    }
}
Write-Host "Ortiqcha rasmlar o'chirildi."

# 2. Endi quiz.json ni o'qib chiqamiz
$jsonText = [System.IO.File]::ReadAllText('.\data\quiz.json')
$data = ConvertFrom-Json $jsonText
$puzzles = $data.puzzles

$images = @("./data/images/p1.jpg", "./data/images/p2.jpg", "./data/images/p3.jpg", "./data/images/p4.jpg", "./data/images/p5.jpg")

foreach ($puzzle in $puzzles) {
    # Oddiy kalit so'zlarga qarab rasmlarni taqsimlash
    $text = $puzzle.story.ToLower()
    $img = $images[0] # Default (O'rmon)

    if ($text -match "zavod|havo|tutun|zaharli|gaz") {
        $img = "./data/images/p2.jpg"
    } elseif ($text -match "suv|daryo|chiqindi|axlat|plastik|kanal") {
        $img = "./data/images/p3.jpg"
    } elseif ($text -match "ov|hayvon|qush|baliq|brakonyer|to'ng'iz") {
        $img = "./data/images/p4.jpg"
    } elseif ($text -match "olov|yong'in|yoqish|somon|dala") {
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

# 3. JSON faylni qayta saqlash
$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('.\data\quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)

Write-Host "JSON yangilandi: Barcha 166 ta savol bor-yo'g'i 5 ta sifatli rasmga biriktirildi."
