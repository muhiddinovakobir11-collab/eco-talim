$ErrorActionPreference = "Stop"

$jsonFile = "C:\Users\Akobir\.gemini\antigravity\scratch\eco_law_bot\data\quiz.json"
$jsonStr = Get-Content -Raw -Path $jsonFile -Encoding UTF8
$jsonObj = ConvertFrom-Json -InputObject $jsonStr

$newQuizzesStr = @"
[
    { "id": "bq11", "question": "Yer yuzining tirik organizmlar yashaydigan qobig'i qanday ataladi?", "options": ["Litosfera", "Gidrosfera", "Biosfera", "Atmosfera"], "answer_index": 2, "explanation": "To'g'ri! Biosfera (hayot qobig'i) Yerning barcha tirik organizmlar yashaydigan qismini o'z ichiga oladi." },
    { "id": "bq12", "question": "Tabiatdagi barcha oziq zanjirlari nima bilan boshlanadi?", "options": ["Yirtqichlar", "O'txo'r hayvonlar", "Redutsentlar", "Produtsentlar (O'simliklar)"], "answer_index": 3, "explanation": "To'g'ri! Barcha oziq zanjirlari quyosh energiyasini o'zlashtiruvchi yashil o'simliklardan boshlanadi." },
    { "id": "bq13", "question": "Muhitning jonsiz omillari (harorat, yorug'lik, namlik) ilmiy tilda nima deyiladi?", "options": ["Abiotik omillar", "Biotik omillar", "Antropogen omillar", "Texnogen omillar"], "answer_index": 0, "explanation": "To'g'ri! Abiotik omillar - jonsiz tabiat elementlarining organizmga ta'siridir." },
    { "id": "bq14", "question": "O'lik organik moddalarni parchalab, ularni mineral moddalarga aylantiruvchi organizmlar nima deyiladi?", "options": ["Konsumentlar", "Produtsentlar", "Redutsentlar", "Avtotroflar"], "answer_index": 2, "explanation": "To'g'ri! Redutsentlar (bakteriya va zamburug'lar) tabiatda moddalar aylanishini yakunlab beradi." },
    { "id": "bq15", "question": "Atrof-muhitni muhofaza qilish butunjahon kuni qachon nishonlanadi?", "options": ["22-aprel", "5-iyun", "1-dekabr", "21-mart"], "answer_index": 1, "explanation": "To'g'ri! BMT tomonidan 1972-yilda 5-iyun Atrof-muhitni muhofaza qilish kuni deb e'lon qilingan." },
    { "id": "bq16", "question": "Dunyodagi eng katta oqmas ko'l qaysi?", "options": ["Baykal", "Viktoriya", "Kaspiy dengizi", "Orol dengizi"], "answer_index": 2, "explanation": "To'g'ri! Kaspiy dengizi aslida dunyodagi eng yirik oqmas ko'l hisoblanadi." },
    { "id": "bq17", "question": "Sanoat korxonalaridan havoga ko'tarilgan oltingugurt oksidlari qanday muammoni keltirib chiqaradi?", "options": ["Ozon tuynugi", "Kislotali yomg'irlar", "O'rmon yong'inlari", "Tuproq eroziyasi"], "answer_index": 1, "explanation": "To'g'ri! Ular havodagi suv bug'lari bilan birikib kislotali yomg'irlarni hosil qiladi." },
    { "id": "bq18", "question": "Qaysi gaz atmosferada «issiqxona effekti» (global isish) ni keltirib chiqaradi?", "options": ["Kislorod (O2)", "Azot (N2)", "Karbonat angidrid (CO2)", "Argon (Ar)"], "answer_index": 2, "explanation": "To'g'ri! CO2 Yer yuzasidan qaytayotgan issiqlikni ushlab qolib, sayyorani isitadi." },
    { "id": "bq19", "question": "Tuproqning unumdor qatlami shamol yoki suv ta'sirida yuvilib ketishi nima deyiladi?", "options": ["Eroziya", "Evtrofikatsiya", "Melioratsiya", "Suksessiya"], "answer_index": 0, "explanation": "To'g'ri! Tuproq eroziyasi uning unumdorligini pasaytiruvchi eng xavfli jarayonlardan biridir." },
    { "id": "bq20", "question": "O'zbekistonning qaysi viloyatida Ustyurt platosi joylashgan?", "options": ["Buxoro", "Navoiy", "Xorazm", "Qoraqalpog'iston Respublikasi"], "answer_index": 3, "explanation": "To'g'ri! Ustyurt platosi Qoraqalpog'iston hududida joylashgan bo'lib, o'ziga xos ekotizimga ega." }
]
"@

$newPuzzlesStr = @"
[
    { "id": "bp11", "story": "Daryo yuqorisida joylashgan zavod suvga issiq oqova suvlarni to'kmoqda.", "question": "Buning ekologik oqibati qanday bo'ladi?", "options": ["Zarar yo'q", "Suvda kislorod kamayadi va baliqlar o'ladi", "Baliqlar tezroq o'sadi"], "answer_index": 1, "explanation": "To'g'ri! Issiq suvda kislorod kam eriydi (Termal ifloslanish), natijada suv hayvonlari kislorod yetishmasligidan nobud bo'ladi." },
    { "id": "bp12", "story": "Fermer hosilni oshirish uchun dalaga 3 barobar ko'p azotli o'g'it soldi. Yomg'ir yuvib ko'lga tushdi.", "question": "Ko'lda nima yuz beradi?", "options": ["Ko'l tozalanadi", "Suv o'tlari keskin ko'payib, evtrofikatsiya yuz beradi", "Suv sathi pasayadi"], "answer_index": 1, "explanation": "To'g'ri! Azotli o'g'itlar ko'lga tushganda suv o'tlari tez ko'payib ketadi va kislorodni yutadi." },
    { "id": "bp13", "story": "O'rmonchilar barcha eski va quruq daraxtlarni kesib, tozalab tashlashdi.", "question": "Buning salbiy oqibati nima bo'lishi mumkin?", "options": ["O'rmon go'zallashadi", "Quruq daraxtlar kovagida yashovchi hasharot va qushlar yashash joyisiz qoladi", "Yangi daraxtlar o'smaydi"], "answer_index": 1, "explanation": "To'g'ri! Quruq daraxtlar ko'plab o'rmon jonivorlari uchun muhim yashash makoni hisoblanadi." },
    { "id": "bp14", "story": "Tog'li hududda dam oluvchilar eng baland ovozda musiqa qo'yishdi.", "question": "Bu tabiatga qanday zarar yetkazadi?", "options": ["Faqat odamlarga xalaqit beradi", "Kuchli shovqin qushlarning uya qurishi va ko'payishiga to'sqinlik qiladi", "Daraxtlar bargi to'kiladi"], "answer_index": 1, "explanation": "To'g'ri! Akustik ifloslanish hayvonlarning tabiiy ritmini buzadi." },
    { "id": "bp15", "story": "Dehqon doimiy ravishda ortiqcha suv sarflamoqda (dalani ko'llatib sug'ormoqda).", "question": "Bu usul tuproqqa qanday ta'sir qiladi?", "options": ["Tuproqning sho'rlanishiga yoki botqoqlanishiga olib keladi", "Unumdorligi oshadi", "Suv tejab qolinadi"], "answer_index": 0, "explanation": "To'g'ri! Ortiqcha sug'orish yer osti sizot suvlarini ko'tarib, tuproqni sho'rlatadi." },
    { "id": "bp16", "story": "Shaharda elektromobillar ko'paydi. Lekin elektr energiyasi ko'mir yoqish orqali olinmoqda.", "question": "Ekologik vaziyat to'liq yechildimi?", "options": ["Ha", "Yo'q, chunki zaharli gazlar endi elektr stansiyasidan chiqmoqda", "Ha, chunki ko'mir arzon"], "answer_index": 1, "explanation": "To'g'ri! Elektromobilning tozaligi u iste'mol qilayotgan energiya qanday olinganiga bog'liq." },
    { "id": "bp17", "story": "Ovchilar cho'l hududida yirtqich yilonlarni va kaltakesaklarni yoppasiga ovlay boshlashdi.", "question": "Qanday oqibat kelib chiqadi?", "options": ["Cho'lda o'simliklar ko'payadi", "Kemiruvchilar soni keskin oshib, ekinlarga zarar yetkazadi", "Cho'lda suv ko'payadi"], "answer_index": 1, "explanation": "To'g'ri! Ilonlar va kaltakesaklar kemiruvchilarning tabiiy kushandalari hisoblanadi." },
    { "id": "bp18", "story": "Shahar markazidagi katta bog' o'rniga savdo markazi qurildi.", "question": "Shaharning mikroiqlimida qanday o'zgarish bo'ladi?", "options": ["Havo tozalanadi", "Yozda harorat ko'tariladi, chang miqdori oshadi, kislorod kamayadi", "O'zgarish bo'lmaydi"], "answer_index": 1, "explanation": "To'g'ri! Daraxtlar shahar mikroiqlimini mo'tadillashtiruvchi asosiy \"filtr\" hisoblanadi." },
    { "id": "bp19", "story": "Baliqchilar portlovchi modda (dinamit) ishlatishdi.", "question": "Bu usulning ekologik xavfi nimada?", "options": ["Faqat katta baliqlar tutiladi", "Barcha tirik organizmlar va suv tubi ekotizimi butunlay yo'q qilinadi", "Suv isib ketadi"], "answer_index": 1, "explanation": "To'g'ri! Portlatish orqali baliq ovlash butun ekotizimni nobud qiladi." },
    { "id": "bp20", "story": "Fermer kimyoviy dorilardan voz kechib, zararli hasharotlarni yeydigan xonqizilarni dalaga qo'ydi.", "question": "Bu qanday kurash usuli deyiladi?", "options": ["Mexanik kurash", "Biologik kurash", "Kimyoviy kurash"], "answer_index": 1, "explanation": "To'g'ri! Zararkunandalarga qarshi tabiiy dushmanlardan foydalanish biologik usuldir." }
]
"@

$newTermsStr = @"
[
    { "id": "bt11", "question": "Biotsenoz nima?", "options": ["Faqat bir turdagi hayvonlar to'dasi", "Muayyan hududda yashovchi barcha tirik organizmlar majmuasi", "Jonsiz tabiat elementlari"], "answer_index": 1, "explanation": "To'g'ri! Biotsenoz - ma'lum hududdagi barcha tirik organizmlarning o'zaro bog'langan majmuasidir." },
    { "id": "bt12", "question": "Biotop nima?", "options": ["Hayvonlarning ozuqasi", "Biotsenoz yashaydigan jonsiz muhit (hudud, iqlim, tuproq)", "O'simliklar bargi"], "answer_index": 1, "explanation": "To'g'ri! Biotop - tirik organizmlar yashashi uchun kerak bo'lgan abiotik (jonsiz) sharoitlar yig'indisidir." },
    { "id": "bt13", "question": "Biogeotsenoz nima?", "options": ["Biotsenoz + Biotop", "Faqat suv ekotizimi", "Faqat tuproqdagi hayot"], "answer_index": 0, "explanation": "To'g'ri! Biogeotsenoz - tirik organizmlar va ular yashaydigan muhitning o'zaro ta'siri orqali shakllangan yaxlit tizim." },
    { "id": "bt14", "question": "Gidrobiontlar nima?", "options": ["Havoda uchuvchi hayvonlar", "Quruqlikda yashovchi hayvonlar", "Suv muhitiga moslashib yashovchi organizmlar"], "answer_index": 2, "explanation": "To'g'ri! Baliqlar, qisqichbaqalar, suv o'tlari kabi barcha suv organizmlari gidrobiontlar deyiladi." },
    { "id": "bt15", "question": "Ksenobiotiklar nima?", "options": ["Foydali bakteriyalar", "Tabiiy muhit uchun yot bo'lgan, inson tomonidan yaratilgan sun'iy va zaharli moddalar", "Noyob o'simliklar"], "answer_index": 1, "explanation": "To'g'ri! Plastiklar va ayrim pestisidlar tabiat uchun begona (ksenobiotik) bo'lib, asrlar davomida parchalanmaydi." },
    { "id": "bt16", "question": "Melioratsiya nima?", "options": ["Yerning unumdorligini oshirishga qaratilgan chora-tadbirlar (sug'orish, sho'rini yuvish)", "O'rmonlarni kesish", "Sanoat korxonalari qurish"], "answer_index": 0, "explanation": "To'g'ri! Melioratsiya tuproqning holatini yaxshilash tadbirlari hisoblanadi." },
    { "id": "bt17", "question": "Aerozol nima?", "options": ["Suyuq o'g'it", "Gazsimon muhitdagi muallaq qattiq yoki suyuq zarralar (tuman, chang, tutun)", "Ozon qatlami"], "answer_index": 1, "explanation": "To'g'ri! Havoning sanoat gazlari va tutunlar bilan ifloslanishi ko'pincha aerozollar shaklida namoyon bo'ladi." },
    { "id": "bt18", "question": "Flora va Fauna o'rtasidagi farq nima?", "options": ["Flora - hayvonlar, Fauna - o'simliklar", "Flora - o'simliklar olami, Fauna - hayvonot olami", "Ularning farqi yo'q"], "answer_index": 1, "explanation": "To'g'ri! Flora o'simliklarni, Fauna esa hayvonot olamini bildiradi." },
    { "id": "bt19", "question": "Rekultivatsiya nima?", "options": ["Foydali qazilmalar qazib olingan buzilgan yerlarni qayta tiklash", "Yangi konlar ochish", "Yovvoyi hayvonlarni ovlash"], "answer_index": 0, "explanation": "To'g'ri! Kon qazilgan kar'yerlarni tuproq bilan to'ldirib, o'rmon barpo etish rekultivatsiya deyiladi." },
    { "id": "bt20", "question": "Brakonyerlik bu...", "options": ["Daraxtlarni parvarishlash", "Taqiqlangan vaqt yoki usulda yovvoyi hayvonlarni noqonuniy ovlash", "Chiqindilarni saralash"], "answer_index": 1, "explanation": "To'g'ri! Brakonyerlik tabiatga va bioxilma-xillikka katta xavf tug'diruvchi jinoiy faoliyatdir." }
]
"@

$newPenaltiesStr = @"
[
    { "id": "bpn11", "question": "Aholi punktlarida xazonlarni yoqish qaysi modda bilan jazolanadi?", "options": ["MJtK 60-modda", "MJtK 88-3-moddasi", "MJtK 111-modda"], "answer_index": 1, "explanation": "To'g'ri! Aholi punktlarida xazon yoqish havoni zaharli tutun bilan ifloslantirgani uchun jarimaga sabab bo'ladi." },
    { "id": "bpn12", "question": "Suvni muhofaza qilish zonalarida avtomobillarni yuvish mumkinmi?", "options": ["Ha, toza suv bilan yuvsa", "Yo'q, qat'iyan taqiqlangan", "Ruxsat etilgan"], "answer_index": 1, "explanation": "To'g'ri! Suv ob'ektlarini moy va yonilg'i bilan ifloslantirish jiddiy zarar yetkazadi." },
    { "id": "bpn13", "question": "Daraxtni qasddan quritish (ildiziga zahar quyish) jazolanadimi?", "options": ["Yo'q", "Ha, daraxt kesgan kabi javobgarlikka tortiladi", "Faqat ogohlantiriladi"], "answer_index": 1, "explanation": "To'g'ri! Daraxtni qasddan quritish daraxt kesishga tenglashtiriladi." },
    { "id": "bpn14", "question": "Zavodlar havo ifloslantirish miqdorini doimiy hisobga olib borishi shartmi?", "options": ["Ixtiyoriy", "Ha, shart (Ekologik pasport)", "Faqat davlat korxonalari uchun"], "answer_index": 1, "explanation": "To'g'ri! Har bir yirik korxona o'zining atrof-muhitga ta'siri haqida hujjatlarga ega bo'lishi shart." },
    { "id": "bpn15", "question": "Milliy bog'da noqonuniy ov qilishning jazosi oddiy hududdagidan farq qiladimi?", "options": ["Farqi yo'q", "Ha, ancha og'irroq jazolanadi", "Jarima arzonroq"], "answer_index": 1, "explanation": "To'g'ri! Qo'riqxonalar tabiatning o'ta muhim qismi bo'lgani uchun u yerdagi har qanday ziyon og'ir jazolanadi." },
    { "id": "bpn16", "question": "Noqonuniy ov qilingan hayvonga yetkazilgan zarar qanday hisoblanadi?", "options": ["Go'shtining bozor narxida", "Maxsus tasdiqlangan taksalar (tariflar) asosida", "Zarar to'lanmaydi"], "answer_index": 1, "explanation": "To'g'ri! Zararni hisoblashda noyoblik darajasi hisobga olinadi va maxsus tariflar qo'llaniladi." },
    { "id": "bpn17", "question": "Elektr qarmoq yordamida baliq ovlash qonuniymi?", "options": ["Qonuniy", "Mutlaqo taqiqlangan va jinoiy javobgarlikka tortiladi", "Faqat qishda mumkin"], "answer_index": 1, "explanation": "To'g'ri! Elektr toki suvdagi barcha tirik jonzotlarni yoppasiga o'ldiradi." },
    { "id": "bpn18", "question": "Ekinzorlarda zaharlarni me'yordan ortiq qo'llab tuproqni yaroqsiz holga keltirish kimning javobgarligi?", "options": ["Do'konning", "Foydalangan yer egasining", "Hech kimning"], "answer_index": 1, "explanation": "To'g'ri! Yerdan oqilona foydalanish yer egasining to'g'ridan-to'g'ri majburiyatidir." },
    { "id": "bpn19", "question": "Qurilish chiqindilarini shahar chetidagi bo'sh yerlarga to'kish mumkinmi?", "options": ["Mumkin", "Qat'iyan taqiqlangan", "Faqat tunda ruxsat etiladi"], "answer_index": 1, "explanation": "To'g'ri! Barcha chiqindilar faqat maxsus poligonlarga tashlanishi shart." },
    { "id": "bpn20", "question": "Ruxsatnoma bilan daraxt kesilgandan so'ng nima qilish majburiy hisoblanadi?", "options": ["Tozalab qo'yish", "Kompensatsiya ekish (masalan 100 ta ko'chat ekish)", "O'tinni davlatga topshirish"], "answer_index": 1, "explanation": "To'g'ri! O'zbekiston qonunchiligiga ko'ra zarurat tufayli daraxt kesilganda uning o'rnini qoplash (ko'chat ekish) majburiyati yuklanadi." }
]
"@

$newTrueFalseStr = @"
[
    { "id": "btf11", "question": "Zavod trubasini juda baland qilish zaharli gazlarni butunlay yo'q qiladi.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Baland truba faqat zaharli gazlarni uzoqroq hududlarga yoyib yuboradi." },
    { "id": "btf12", "question": "Chiqindisiz texnologiya bu umuman hech qanday qoldiq chiqarmaydigan mukammal zavod.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Mutlaq chiqindisiz tizim bo'lishi mumkin emas. Bu qoldiqlarni maksimal qayta ishlashni anglatadi." },
    { "id": "btf13", "question": "Avtomobillardan ajralib chiqadigan tutun tarkibida is gazi va zaharli uglevodorodlar mavjud.", "options": ["Rost", "Yolg'on"], "answer_index": 0, "explanation": "Rost! Avtotransport havo ifloslanishining asosiy qismini tashkil qiladi." },
    { "id": "btf14", "question": "Orol dengizining qurishi asosan tabiiy iqlim o'zgarishi tufayli yuz berdi.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Orol dengizi asosan insonning xo'jalik faoliyati oqibatida quridi." },
    { "id": "btf15", "question": "Plastik idishlar qayta ishlashga (Recycling) yaroqli materiallar hisoblanadi.", "options": ["Rost", "Yolg'on"], "answer_index": 0, "explanation": "Rost! Ular saralanib qayta eritilsa, yangi mahsulotlar ishlab chiqarish mumkin." },
    { "id": "btf16", "question": "Ozon qatlami yupqalashishi Yer yuzasida haroratning pasayishiga olib keladi.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Ozonning yemirilishi zararli ultrabinafsha nurlar va issiqlikni oshiradi." },
    { "id": "btf17", "question": "O'simlik va hayvonot olami ham ehtiyotsizlik qilinsa butunlay yo'qolib ketishi mumkin.", "options": ["Rost", "Yolg'on"], "answer_index": 0, "explanation": "Rost! Tiklanish tezligidan ko'ra tezroq sarflash ularning yo'qolishiga olib keladi." },
    { "id": "bt18", "question": "Bir turdagi yirtqich hayvonni o'rmondan butunlay yo'q qilish foydalidir.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Yirtqichlarning yo'qolishi o'txo'r hayvonlarning nazoratsiz ko'payishiga olib keladi." },
    { "id": "bt19", "question": "Elektromobillarning tozaligi asosan elektr energiyasi qanday usulda olinganiga bog'liq.", "options": ["Rost", "Yolg'on"], "answer_index": 0, "explanation": "Rost! Agar elektr stansiyasi ko'mir yoqsa, zahar bari-bir havoga chiqadi." },
    { "id": "bt20", "question": "Barcha bakteriyalar faqat kasallik tarqatuvchi bo'lib, ularni yo'q qilish kerak.", "options": ["Rost", "Yolg'on"], "answer_index": 1, "explanation": "Yolg'on! Bakteriyalarning katta qismi tabiatda moddalar aylanishini ta'minlaydi." }
]
"@

$newQ = ConvertFrom-Json -InputObject $newQuizzesStr
$newP = ConvertFrom-Json -InputObject $newPuzzlesStr
$newT = ConvertFrom-Json -InputObject $newTermsStr
$newPn = ConvertFrom-Json -InputObject $newPenaltiesStr
$newTf = ConvertFrom-Json -InputObject $newTrueFalseStr

$jsonObj.quizzes += $newQ
$jsonObj.puzzles += $newP
$jsonObj.terms += $newT
$jsonObj.penalties += $newPn
$jsonObj.truefalse += $newTf

# Fix for powershell converting arrays poorly in deep nested JSON
$jsonObj | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonFile -Encoding UTF8
