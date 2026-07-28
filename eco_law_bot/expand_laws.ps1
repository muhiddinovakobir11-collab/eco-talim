$ErrorActionPreference = "Stop"

$apiKey = $env:GEMINI_API_KEY
if (-not $apiKey) {
    $apiKey = "AQ.Ab8RN6Ij-ITyOZy09qfVaeBuoCqfbBsSTyhAABlYMMU0OQsA8w"
}

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=$apiKey"

$lawsDataJson = [System.IO.File]::ReadAllText('./data/laws.json')
$lawsData = ConvertFrom-Json $lawsDataJson

$expanded = @()

foreach ($cat in $lawsData) {
    Write-Host "Generating 10 rules for: $($cat.title)..."
    
    $prompt = @"
Siz O'zbekiston ekologiya qonunchiligi bo'yicha yurist-ekspertsiz.
Quyidagi yo'nalish bo'yicha 10 ta eng muhim qonun qoidalari / moddalarini yaratib bering:
Yo'nalish: "$($cat.title)"
Yo'nalish mazmuni: "$($cat.desc)"

Siz qaytaradigan javob FAQAT JSON array formatida bo'lsin ( \`\`\`json ... \`\`\` kabi belgilarsiz, faqat toza [ ] qavslar ichida):
[
  {
    "title": "Qoida nomi",
    "desc": "Qoidaning qisqacha mazmuni",
    "key_articles": "Modda: (tegishli modda nomi)",
    "punishment": "MJtKning tegishli moddasi: (Jarima miqdori va turi)"
  }
]
Jami 10 ta ob'ekt bo'lishi shart. Ma'lumotlar haqiqiy O'zbekiston qonunchiligi asosida (yoki unga eng yaqin mantiqiy) bo'lsin.
"@

    $body = @{
        contents = @(
            @{
                parts = @(
                    @{ text = $prompt }
                )
            }
        )
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Method Post -Uri $url -ContentType "application/json" -Body $body
        $text = $response.candidates[0].content.parts[0].text
        
        $startIndex = $text.IndexOf('[')
        $endIndex = $text.LastIndexOf(']')
        if ($startIndex -eq -1 -or $endIndex -eq -1) {
            throw "JSON array topilmadi"
        }
        
        $jsonStr = $text.Substring($startIndex, $endIndex - $startIndex + 1)
        $rules = ConvertFrom-Json $jsonStr
        
        $expandedItem = @{
            id = $cat.id
            category_title = $cat.title
            rules = $rules
        }
        $expanded += $expandedItem
        
        Write-Host "Success! Generated $($rules.Count) rules."
    } catch {
        Write-Host "Error for $($cat.title): $_"
    }
    
    Start-Sleep -Seconds 2
}

$finalJson = ConvertTo-Json $expanded -Depth 10
[System.IO.File]::WriteAllText('./data/laws_expanded.json', $finalJson, [System.Text.Encoding]::UTF8)
Write-Host "Barcha qonunlar muvaffaqiyatli kengaytirildi va laws_expanded.json ga saqlandi!"
