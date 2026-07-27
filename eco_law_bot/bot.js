const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Load Data
const lawsData = JSON.parse(fs.readFileSync('./data/laws.json', 'utf8'));
const quizData = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));

const token = '8816258838:AAEUKvrASp9XfwfapeEG-ibsFgvTeY24Bw8';

const bot = new TelegramBot(token, { polling: true });

console.log('Eco Law Bot ishga tushdi...');

// Bosh menyu klaviaturasi
const mainMenuOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "🌐 Veb-saytga kirish", web_app: { url: "https://verdant-creponne-6d4742.netlify.app" } }],
            [{ text: "📖 Qonunlarni o'rganish", callback_data: "menu_learn" }],
            [{ text: "📝 Ekologiya Quiz", callback_data: "menu_quiz" }],
            [{ text: "🧩 Jumboqli Vaziyatlar", callback_data: "menu_puzzle" }]
        ]
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🌱 Assalomu alaykum! Eco Law Botga xush kelibsiz.\nBu yerda siz O'zbekistonning ekologiyaga doir qonunlarini qiziqarli tarzda o'rganishingiz mumkin.", mainMenuOptions);
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    // Qonunlarni o'rganish bo'limi
    if (data === 'menu_learn') {
        let text = "📚 **Asosiy Ekologik Qonunlar:**\n\n";
        lawsData.forEach((law, idx) => {
            text += `🔹 **${idx + 1}. [${law.title}](${law.url})**\n`;
            text += `📝 _Mazmuni:_ ${law.desc}\n`;
            text += `📌 _Asosiy moddalar:_ ${law.key_articles}\n`;
            text += `⚖️ _Javobgarlik:_ ${law.punishment}\n\n`;
        });
        
        bot.sendMessage(chatId, text, { parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "⬅️ Orqaga", callback_data: "menu_back" }]] } });
    }
    
    // Quiz bo'limi
    if (data === 'menu_quiz') {
        sendQuestion(chatId, quizData.quizzes[0], 0, 'quiz');
    }
    
    // Jumboq bo'limi
    if (data === 'menu_puzzle') {
        sendQuestion(chatId, quizData.puzzles[0], 0, 'puzzle');
    }
    
    // Orqaga qaytish
    if (data === 'menu_back') {
        bot.sendMessage(chatId, "Bosh menyu:", mainMenuOptions);
    }
    
    // Javobni tekshirish (Answer_Type_Index_QuestionId)
    if (data.startsWith('ans_')) {
        const parts = data.split('_');
        const type = parts[1]; // quiz yoki puzzle
        const selectedIndex = parseInt(parts[2]);
        const qIndex = parseInt(parts[3]);
        
        let questionData = type === 'quiz' ? quizData.quizzes[qIndex] : quizData.puzzles[qIndex];
        
        if (selectedIndex === questionData.answer_index) {
            bot.sendMessage(chatId, `✅ **To'g'ri javob!**\n\n${questionData.explanation}`, { parse_mode: 'Markdown' });
            
            // Keyingi savolga o'tish
            const nextIndex = qIndex + 1;
            const sourceArray = type === 'quiz' ? quizData.quizzes : quizData.puzzles;
            
            if (nextIndex < sourceArray.length) {
                sendQuestion(chatId, sourceArray[nextIndex], nextIndex, type);
            } else {
                bot.sendMessage(chatId, `🎉 Siz barcha ${type} savollarini yakunladingiz!`, mainMenuOptions);
            }
        } else {
            bot.sendMessage(chatId, `❌ **Notog'ri.** Qayta urinib ko'ring yoki to'g'ri qonunni topishga harakat qiling.`);
            // Savolni qayta yuborish
            sendQuestion(chatId, questionData, qIndex, type);
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

function sendQuestion(chatId, questionObj, qIndex, type) {
    let text = type === 'puzzle' ? `🧩 **Vaziyat:** ${questionObj.story}\n\n❓ ${questionObj.question}` : `📝 **Savol:** ${questionObj.question}`;
    
    let keyboard = [];
    questionObj.options.forEach((opt, idx) => {
        keyboard.push([{ text: opt, callback_data: `ans_${type}_${idx}_${qIndex}` }]);
    });
    
    keyboard.push([{ text: "⬅️ Menyuga qaytish", callback_data: "menu_back" }]);
    
    bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
}
