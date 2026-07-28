$ErrorActionPreference = "Stop"

$jsonText = [System.IO.File]::ReadAllText('./data/quiz.json')
$data = ConvertFrom-Json $jsonText

$puzzles = $data.puzzles

Write-Host "Jami savollar: $($puzzles.Length)"

if (-not (Test-Path -Path "./data/images")) {
    New-Item -ItemType Directory -Force -Path "./data/images" | Out-Null
}

$count = 0

foreach ($puzzle in $puzzles) {
    # Dastlabki 5 ta savol uchun o'tkazib yuboramiz (ularni oldin qo'shganmiz)
    if ($puzzle.id -in @("p1", "p2", "p3", "p4", "p5")) {
        continue
    }

    $imgPath = "./data/images/$($puzzle.id).jpg"
    
    # Faqat rasmi yo'q bo'lsa yuklaymiz
    if (-not (Test-Path -Path $imgPath)) {
        # Promptni tayyorlash
        $rawPrompt = "Cinematic 3D illustration, dark premium aesthetic, nature ecology. " + $puzzle.story
        # URL encode
        $encodedPrompt = [System.Uri]::EscapeDataString($rawPrompt)
        
        $url = "https://image.pollinations.ai/prompt/$encodedPrompt?width=800&height=600&nologo=true"
        
        try {
            Invoke-WebRequest -Uri $url -OutFile $imgPath -UseBasicParsing
            Write-Host "Yaratildi: $($puzzle.id)"
        } catch {
            Write-Host "Xatolik yuz berdi: $($puzzle.id) -> $_"
        }
        
        # Pollinations API ni qiynamaslik uchun ozgina kutamiz
        Start-Sleep -Seconds 1
    }
    
    # JSON ga qo'shish (agar yo'q bo'lsa)
    if (-not $puzzle.psobject.properties.Match('image').Count) {
        $puzzle | Add-Member -MemberType NoteProperty -Name "image" -Value $imgPath -Force
    } else {
        $puzzle.image = $imgPath
    }
    
    $count++
    if ($count % 10 -eq 0) {
        Write-Host "$count ta rasm yakunlandi..."
    }
}

# Faylni saqlash
$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('./data/quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)

Write-Host "Barcha 166 ta rasm muvaffaqiyatli yuklandi va JSON yangilandi!"
