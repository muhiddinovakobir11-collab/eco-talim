$prompts = @(
    "Cinematic 3D illustration dark premium aesthetic, businessman cutting old trees in forest",
    "Cinematic 3D illustration dark premium aesthetic, tractor illegally destroying a dense green forest",
    "Cinematic 3D illustration dark premium aesthetic, chainsaw left on a massive cut tree stump",
    "Cinematic 3D illustration dark premium aesthetic, illegal logging trucks in a foggy forest at night",
    "Cinematic 3D illustration dark premium aesthetic, a single dead tree standing in a deforested wasteland",
    "Cinematic 3D illustration dark premium aesthetic, rich man selling illegal rare wood logs",
    "Cinematic 3D illustration dark premium aesthetic, construction workers bulldozing nature trees",
    "Cinematic 3D illustration dark premium aesthetic, a glowing magical tree being chopped down",
    "Cinematic 3D illustration dark premium aesthetic, illegal lumberjack camp in the woods",
    "Cinematic 3D illustration dark premium aesthetic, sad animals watching their forest being destroyed",
    
    "Cinematic 3D illustration dark premium aesthetic, toxic glowing green waste spilling into a beautiful river",
    "Cinematic 3D illustration dark premium aesthetic, dead fish floating in dark polluted water",
    "Cinematic 3D illustration dark premium aesthetic, plastic bottles and trash floating in ocean waves",
    "Cinematic 3D illustration dark premium aesthetic, a dark pipe pouring black chemicals into a lake",
    "Cinematic 3D illustration dark premium aesthetic, a factory by the river polluting the clean water",
    "Cinematic 3D illustration dark premium aesthetic, a turtle trapped in a plastic net underwater",
    "Cinematic 3D illustration dark premium aesthetic, toxic oil spill on a dark beach",
    "Cinematic 3D illustration dark premium aesthetic, a glass of water filled with microplastics and dirt",
    "Cinematic 3D illustration dark premium aesthetic, a beautiful waterfall turning into black sludge",
    "Cinematic 3D illustration dark premium aesthetic, heavy machinery dumping trash into a canal",
    
    "Cinematic 3D illustration dark premium aesthetic, massive factory emitting thick black toxic smoke into the night sky",
    "Cinematic 3D illustration dark premium aesthetic, a dark city covered in heavy smog and pollution",
    "Cinematic 3D illustration dark premium aesthetic, cars stuck in traffic emitting heavy exhaust fumes",
    "Cinematic 3D illustration dark premium aesthetic, burning garbage dump releasing toxic gas",
    "Cinematic 3D illustration dark premium aesthetic, industrial chimneys glowing red and polluting the air",
    "Cinematic 3D illustration dark premium aesthetic, a person wearing a gas mask in a polluted city",
    "Cinematic 3D illustration dark premium aesthetic, airplanes leaving dark chemical trails in the sky",
    "Cinematic 3D illustration dark premium aesthetic, a power plant destroying the clean atmosphere",
    "Cinematic 3D illustration dark premium aesthetic, toxic acid rain falling on a dying forest",
    "Cinematic 3D illustration dark premium aesthetic, huge fires burning in a coal mine at night",
    
    "Cinematic 3D illustration dark premium aesthetic, mysterious poacher silhouette with a hunting rifle in foggy forest",
    "Cinematic 3D illustration dark premium aesthetic, illegal animal traps hidden in dark grass",
    "Cinematic 3D illustration dark premium aesthetic, a sad tiger trapped in a metal cage",
    "Cinematic 3D illustration dark premium aesthetic, a hunter holding a flashlight hunting at night",
    "Cinematic 3D illustration dark premium aesthetic, rare birds being caught in an illegal net",
    "Cinematic 3D illustration dark premium aesthetic, a sniper rifle aiming at a deer in the woods",
    "Cinematic 3D illustration dark premium aesthetic, an illegal wildlife trade market in the shadows",
    "Cinematic 3D illustration dark premium aesthetic, poachers driving a jeep in the savanna at night",
    "Cinematic 3D illustration dark premium aesthetic, an elephant without tusks in a gloomy landscape",
    "Cinematic 3D illustration dark premium aesthetic, electric shock fishing equipment in a river",
    
    "Cinematic 3D illustration dark premium aesthetic, huge pile of garbage and plastic bags in a beautiful meadow",
    "Cinematic 3D illustration dark premium aesthetic, toxic waste barrels leaking glowing green liquid",
    "Cinematic 3D illustration dark premium aesthetic, a person throwing a plastic bag out of a car window",
    "Cinematic 3D illustration dark premium aesthetic, illegal trash dump in the middle of a forest",
    "Cinematic 3D illustration dark premium aesthetic, broken glass and garbage left behind by tourists at a campsite",
    "Cinematic 3D illustration dark premium aesthetic, a burning pile of old tires creating black smoke",
    "Cinematic 3D illustration dark premium aesthetic, medical waste illegally dumped near a hospital",
    "Cinematic 3D illustration dark premium aesthetic, a truck illegally unloading trash into a ravine",
    "Cinematic 3D illustration dark premium aesthetic, agriculture field on fire spreading to trees",
    "Cinematic 3D illustration dark premium aesthetic, a farmer burning wheat stubble at night causing damage"
)

if (-not (Test-Path -Path "./data/images")) {
    New-Item -ItemType Directory -Force -Path "./data/images" | Out-Null
}

$ErrorActionPreference = "Continue"

for ($i = 0; $i -lt $prompts.Length; $i++) {
    $imgName = "img$($i + 1).jpg"
    $imgPath = "./data/images/$imgName"
    
    $encodedPrompt = [System.Uri]::EscapeDataString($prompts[$i])
    $url = "https://image.pollinations.ai/prompt/$encodedPrompt?width=800&height=600&nologo=true&seed=42"
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $imgPath -UseBasicParsing
        Write-Host "Yuklandi: $imgName"
    } catch {
        Write-Host "Xato: $imgName -> $_"
    }
    
    Start-Sleep -Seconds 1
}

# Now map them to quiz.json
$jsonText = [System.IO.File]::ReadAllText('./data/quiz.json')
$data = ConvertFrom-Json $jsonText
$puzzles = $data.puzzles

# First 50 puzzles get exactly img1 to img50
for ($j = 0; $j -lt 50; $j++) {
    if ($j -lt $puzzles.Length) {
        $imgPath = "./data/images/img$($j + 1).jpg"
        if (-not $puzzles[$j].psobject.properties.Match('image').Count) {
            $puzzles[$j] | Add-Member -MemberType NoteProperty -Name "image" -Value $imgPath -Force
        } else {
            $puzzles[$j].image = $imgPath
        }
    }
}

# The remaining 116 puzzles get a random image from the 50
for ($j = 50; $j -lt $puzzles.Length; $j++) {
    $randomImgNum = Get-Random -Minimum 1 -Maximum 51
    $imgPath = "./data/images/img$randomImgNum.jpg"
    if (-not $puzzles[$j].psobject.properties.Match('image').Count) {
        $puzzles[$j] | Add-Member -MemberType NoteProperty -Name "image" -Value $imgPath -Force
    } else {
        $puzzles[$j].image = $imgPath
    }
}

$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('./data/quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)

# Delete old p*.jpg and bp*.jpg images just to be clean
Get-ChildItem -Path './data/images' -Filter 'p*.jpg' | Remove-Item -Force
Get-ChildItem -Path './data/images' -Filter 'bp*.jpg' | Remove-Item -Force

Write-Host "50 ta rasm yaratildi va barcha savollarga tarqatildi!"
