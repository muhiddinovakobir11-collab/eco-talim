const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Env-dan yoki bot.js dagi kalitdan foydalanamiz
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Ij-ITyOZy09qfVaeBuoCqfbBsSTyhAABlYMMU0OQsA8w";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const lawsData = JSON.parse(fs.readFileSync('./data/laws.json', 'utf8').replace(/^\uFEFF/, ''));

async function expand() {
    let expanded = [];
    
    for (let i = 0; i < lawsData.length; i++) {
        let cat = lawsData[i];
        console.log(`Generating 10 rules for: ${cat.title}...`);
        
        const prompt = `Siz O'zbekiston ekologiya qonunchiligi bo'yicha yurist-ekspertsiz.
Quyidagi yo'nalish bo'yicha 10 ta eng muhim qonun qoidalari / moddalarini yaratib bering:
Yo'nalish: "${cat.title}"
Yo'nalish mazmuni: "${cat.desc}"

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
`;

        try {
            const result = await model.generateContent(prompt);
            let text = result.response.text();
            
            // JSON formatini tozalash
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start === -1 || end === -1) throw new Error("JSON array topilmadi");
            
            const jsonStr = text.substring(start, end + 1);
            const rules = JSON.parse(jsonStr);
            
            expanded.push({
                id: cat.id,
                category_title: cat.title,
                rules: rules
            });
            console.log(`Success! Generated ${rules.length} rules.`);
        } catch (e) {
            console.error(`Error for ${cat.title}:`, e);
        }
        
        // 2 soniya kutamiz (API limitlariga tushmaslik uchun)
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    fs.writeFileSync('./data/laws_expanded.json', JSON.stringify(expanded, null, 2), 'utf8');
    console.log("Barcha qonunlar muvaffaqiyatli kengaytirildi va laws_expanded.json ga saqlandi!");
}

expand();
