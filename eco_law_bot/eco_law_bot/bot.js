const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Load Data
const lawsData = JSON.parse(fs.readFileSync('./data/laws.json', 'utf8'));
const quizData = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8'));

const token = '8816258838:AAEUKvrASp9XfwfapeEG-ibsFgvTeY24Bw8';

const bot = new TelegramBot(token, { polling: true });

console.log('Eco Law Bot ishga tushdi...');

// Foydalanuvchilar sessiyasini saqlash xotirasi (random va takrorlanmaslik uchun)
const userSessions = {};

function getUserSession(chatId) {
    if (!userSessions[chatId]) {
        userSessions[chatId] = {
            quizzes: [],
            puzzles: [],
            terms: [],
            penalties: [],
            truefalse: []
        };
    }
    return userSessions[chatId];
}

// Bosh menyu klaviaturasi
const mainMenuOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📖 Qonunlarni o'rganish", callback_data: "menu_learn" }],
            [{ text: "📝 Ekologiya Quiz", callback_data: "menu_quizzes" }],
            [{ text: "🧩 Jumboqli Vaziyatlar", callback_data: "menu_puzzles" }],
            [{ text: "🔤 Ekologik Atamalar", callback_data: "menu_terms" }],
            [{ text: "⚖️ Jazolar va Jarimalar", callback_data: "menu_penalties" }],
            [{ text: "✅ To'g'ri / Noto'g'ri", callback_data: "menu_truefalse" }]
        ]
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    // Sessiyani tozalash (yangi start berilganda boshidan boshlashi uchun)
    userSessions[chatId] = { quizzes: [], puzzles: [], terms: [], penalties: [], truefalse: [] };
    
    bot.sendMessage(chatId, "🌱 Assalomu alaykum! Eco Law Botga xush kelibsiz.\nBu yerda siz O'zbekistonning ekologiyaga doir qonunlarini qiziqarli tarzda o'rganishingiz mumkin.", mainMenuOptions);
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data === 'menu_learn') {
        let text1 = "📚 **Asosiy Ekologik Qonunlar (1-qism):**\n\n";
        let text2 = "📚 **Asosiy Ekologik Qonunlar (2-qism):**\n\n";
        
        lawsData.forEach((law, idx) => {
            let lawText = `🔹 ${idx + 1}. [${law.title}](${law.url})\n`;
            lawText += `📝 _Mazmuni:_ ${law.desc}\n`;
            lawText += `📌 _Asosiy moddalar:_ ${law.key_articles}\n`;
            lawText += `⚖️ _Javobgarlik:_ ${law.punishment}\n\n`;
            
            if (idx < 5) {
                text1 += lawText;
            } else {
                text2 += lawText;
            }
        });
        
        bot.sendMessage(chatId, text1, { parse_mode: 'Markdown', disable_web_page_preview: true }).then(() => {
            bot.sendMessage(chatId, text2, { parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: { inline_keyboard: [[{ text: "⬅️ Orqaga", callback_data: "menu_back" }]] } });
        });
    }
    
    // Test va savollar bo'limlari uchun umumiy tutib oluvchi
    if (data.startsWith('menu_') && data !== 'menu_learn' && data !== 'menu_back') {
        const type = data.replace('menu_', ''); // quizzes, puzzles, terms, penalties, truefalse bo'ladi
        sendRandomQuestion(chatId, type);
    }
    
    // Orqaga qaytish
    if (data === 'menu_back') {
        bot.sendMessage(chatId, "Bosh menyu:", mainMenuOptions);
    }
    
    // Javobni tekshirish (ans_type_selectedIndex_qIndex formatida keladi)
    if (data.startsWith('ans_')) {
        const parts = data.split('_');
        const type = parts[1]; // quizzes, puzzles ...
        const selectedIndex = parseInt(parts[2]);
        const qIndex = parseInt(parts[3]);
        
        let questionData = quizData[type][qIndex];
        
        if (selectedIndex === questionData.answer_index) {
            bot.sendMessage(chatId, `✅ **To'g'ri javob!**\n\n${questionData.explanation}`, { parse_mode: 'Markdown' });
            
            // Foydalanuvchi buni to'g'ri topdi, endi sessiyaga yozib qo'yamiz
            const session = getUserSession(chatId);
            if (!session[type].includes(qIndex)) {
                session[type].push(qIndex);
            }
            
            // Boshqa tasodifiy savolni yuboramiz
            sendRandomQuestion(chatId, type);
        } else {
            bot.sendMessage(chatId, `❌ **Notog'ri.** Qayta urinib ko'ring yoki to'g'ri qonunni topishga harakat qiling.`);
            // Xato bo'lsa, o'sha savolni o'zini qayta yuboramiz to to'g'ri topmaguncha
            sendSpecificQuestion(chatId, type, qIndex);
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

// Tasodifiy, takrorlanmas savol yuborish funksiyasi
function sendRandomQuestion(chatId, type) {
    const session = getUserSession(chatId);
    const allQuestions = quizData[type];
    
    // Hali foydalanuvchi yechmagan savollar indeksini ajratib olamiz
    const unansweredIndexes = [];
    allQuestions.forEach((q, idx) => {
        if (!session[type].includes(idx)) {
            unansweredIndexes.push(idx);
        }
    });
    
    // Agar hamma savollarni tugatgan bo'lsa
    if (unansweredIndexes.length === 0) {
        bot.sendMessage(chatId, `🎉 Qoyil! Siz ushbu bo'limdagi barcha savollarni muvaffaqiyatli yakunladingiz!`, mainMenuOptions);
        return;
    }
    
    // Yechilmaganlari orasidan bittasini tasodifiy tanlaymiz
    const randomPos = Math.floor(Math.random() * unansweredIndexes.length);
    const qIndex = unansweredIndexes[randomPos];
    
    // Tanlangan savolni ekranga chiqaramiz
    sendSpecificQuestion(chatId, type, qIndex);
}

// Aniq bitta savolni ekranga chiqarish funksiyasi
function sendSpecificQuestion(chatId, type, qIndex) {
    const questionObj = quizData[type][qIndex];
    const session = getUserSession(chatId);
    const answeredCount = session[type].length;
    const totalCount = quizData[type].length;
    
    let text = `📊 **Natija: ${answeredCount + 1} / ${totalCount}**\n\n`;
    text += type === 'puzzles' ? `🧩 **Vaziyat:** ${questionObj.story}\n\n❓ ${questionObj.question}` : `📝 **Savol:** ${questionObj.question}`;
    
    let keyboard = [];
    questionObj.options.forEach((opt, idx) => {
        keyboard.push([{ text: opt, callback_data: `ans_${type}_${idx}_${qIndex}` }]);
    });
    
    keyboard.push([{ text: "⬅️ Menyuga qaytish", callback_data: "menu_back" }]);
    
    bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
}
