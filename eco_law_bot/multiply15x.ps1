$json = Get-Content -Raw './data/quiz.json' -Encoding UTF8
$data = ConvertFrom-Json $json

foreach ($prop in $data.psobject.properties) {
    $array = $prop.Value
    $halfLen = [math]::Floor($array.Length / 2)
    
    for ($i = 0; $i -lt $halfLen; $i++) {
        $original = $array[$i]
        $copy = $original.psobject.copy()
        
        $copy.id = $copy.id + "_advanced"
        if ($prop.Name -eq 'puzzles') {
            $copy.story = "Murakkablashgan holat: " + $copy.story
        } else {
            $copy.question = "[Chuqurlashtirilgan savol] " + $copy.question
        }
        
        $array += $copy
    }
    
    # Reassign the newly sized array back to the object
    $data.($prop.Name) = $array
}

$jsonOutput = ConvertTo-Json -InputObject $data -Depth 10 -Compress
[System.IO.File]::WriteAllText('./data/quiz.json', $jsonOutput, [System.Text.Encoding]::UTF8)
