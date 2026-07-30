const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');

// Render platformasida Web Service sifatida ishlashi uchun soxta (dummy) server yaratamiz.
// Bu Render "Port topilmadi" degan xatoni bermasligi uchun kerak.
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Eco Law Bot is running!\n');
    res.end();
}).listen(port, () => {
    console.log(`Web server portda ishga tushdi: ${port}`);
});

// Render'da tekin server uxlab qolmasligi uchun bot o'ziga-o'zi har 14 daqiqada so'rov yuboradi
setInterval(() => {
    http.get('https://eco-talim.onrender.com').on('error', (err) => {
        console.error("Ping xatosi:", err.message);
    });
    console.log("Ping yuborildi: Bot 24/7 ishlashi ta'minlanmoqda...");
}, 14 * 60 * 1000);

// Load Data
const quizData = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8').replace(/^\uFEFF/, ''));
let questData = [];
try {
    questData = JSON.parse(fs.readFileSync('./data/quest.json', 'utf8').replace(/^\uFEFF/, ''));
} catch(e) {}

let redbookData = [];
try {
    redbookData = JSON.parse(fs.readFileSync('./data/redbook.json', 'utf8').replace(/^\uFEFF/, ''));
} catch(e) {}

let lawsData = [];
try {
    lawsData = JSON.parse(fs.readFileSync('./data/laws.json', 'utf8').replace(/^\uFEFF/, ''));
} catch(e) {}

let usersData = [];
try {
    const rawData = JSON.parse(fs.readFileSync('./data/users.json', 'utf8').replace(/^\uFEFF/, ''));
    // Eski raqamli ID'larni yangi obyekt formatiga o'tkazish
    usersData = rawData.map(u => typeof u === 'number' ? { id: u, first_name: 'Foydalanuvchi', username: '', is_blocked: false, score: 0 } : u);
    usersData.forEach(u => { if (u.score === undefined) u.score = 0; });
} catch (e) {
    usersData = [];
}

// Environment Variables (Maxfiy kalitlar)
const token = process.env.TELEGRAM_TOKEN || "8816258838:AAEUKvrASp9XfwfapeEG-ibsFgvTeY24Bw8";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Ij-ITyOZy09qfVaeBuoCqfbBsSTyhAABlYMMU0OQsA8w";

const ADMIN_ID = 1860069506; // Sizning Telegram ID raqamingiz
let isBroadcasting = false; // Xabar tarqatish holati

if (!token) {
    console.warn("DIQQAT: TELEGRAM_TOKEN yoki GEMINI_API_KEY topilmadi!");
}

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
            truefalse: [],
            attempts: { quizzes: 0, puzzles: 0, terms: 0, penalties: 0, truefalse: 0 }
        };
    }
    // Eski sessiyalar xatosi oldini olish uchun
    if (!userSessions[chatId].attempts) {
        userSessions[chatId].attempts = { quizzes: 0, puzzles: 0, terms: 0, penalties: 0, truefalse: 0 };
    }
    return userSessions[chatId];
}

// Bosh menyu klaviaturasi
const mainMenuOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📝 Ekologiya Quiz", callback_data: "menu_quizzes" }],
            [{ text: "🧩 Jumboqli Vaziyatlar", callback_data: "menu_puzzles" }],
            [{ text: "🦸‍♂️ Eko-Qahramon", callback_data: "menu_hero" }],
            [{ text: "📜 Qizil Kitob", callback_data: "menu_redbook" }],
            [{ text: "🔤 Ekologik Atamalar", callback_data: "menu_terms" }],
            [{ text: "⚖️ Jazolar va Jarimalar", callback_data: "menu_penalties" }],
            [{ text: "✅ To'g'ri / Noto'g'ri", callback_data: "menu_truefalse" }],
            [{ text: "🏆 Liderlar Reytingi", callback_data: "menu_leaderboard" }],
            [{ text: "👨‍💻 Admin", url: "https://t.me/akoshprod" }]
        ]
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    // Sessiyani tozalash (yangi start berilganda boshidan boshlashi uchun)
    userSessions[chatId] = { quizzes: [], puzzles: [], terms: [], penalties: [], truefalse: [] };
    
    // Tarqatish holatini bekor qilish (agar yoqilgan bo'lsa)
    if (chatId === ADMIN_ID) isBroadcasting = false;

    // Yangi foydalanuvchini bazaga qo'shish
    let existingUser = usersData.find(u => u.id === chatId);
    if (!existingUser) {
        usersData.push({
            id: chatId,
            first_name: msg.from.first_name || 'Foydalanuvchi',
            username: msg.from.username || '',
            is_blocked: false,
            score: 0
        });
        fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
        
        // Adminga xabar yuborish
        if (chatId !== ADMIN_ID) {
            let userLink = `[${msg.from.first_name || 'Foydalanuvchi'}](tg://user?id=${chatId})`;
            let username = msg.from.username ? ` (@${msg.from.username})` : '';
            bot.sendMessage(ADMIN_ID, `🆕 **Yangi obunachi qo'shildi!**\n👤 Profil: ${userLink}${username}`, { parse_mode: 'Markdown' });
        }
    } else if (existingUser.is_blocked) {
        // Agar avval bloklagan bo'lsa va yana start bossa, blokni olib tashlaymiz
        existingUser.is_blocked = false;
        fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
    }
    
    const introText = "🌱 Assalomu alaykum! Eco Law Botga xush kelibsiz.\nBu yerda siz O'zbekistonning ekologiyaga doir qonunlarini qiziqarli tarzda o'rganishingiz mumkin.\n\n📞 Murojaat uchun: @akoshprod";
    const videoPath = './data/intro.mp4';
    
    if (fs.existsSync(videoPath)) {
        bot.sendVideo(chatId, videoPath, {
            caption: introText,
            reply_markup: mainMenuOptions.reply_markup
        });
    } else {
        bot.sendMessage(chatId, introText, mainMenuOptions);
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data === 'menu_learn') {
        let keyboard = [];
        for (let i = 0; i < lawsData.length; i += 2) {
            let row = [];
            row.push({ text: "🏛 " + lawsData[i].category_title, callback_data: `law_cat_${lawsData[i].id}` });
            if (i + 1 < lawsData.length) {
                row.push({ text: "🏛 " + lawsData[i+1].category_title, callback_data: `law_cat_${lawsData[i+1].id}` });
            }
            keyboard.push(row);
        }
        keyboard.push([{ text: "⬅️ Orqaga", callback_data: "menu_back" }]);
        
        bot.sendMessage(chatId, "📚 **O'rganish uchun kerakli yo'nalishni tanlang:**", {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    }
    
    if (data.startsWith('law_cat_') || data.startsWith('law_page_')) {
        let catId, pageIdx;
        
        if (data.startsWith('law_cat_')) {
            catId = data.replace('law_cat_', '');
            pageIdx = 0;
        } else {
            const parts = data.split('_');
            catId = parts[2];
            pageIdx = parseInt(parts[3]);
        }
        
        const cat = lawsData.find(c => c.id === catId);
        
        if (cat && cat.rules.length > 0) {
            const total = cat.rules.length;
            const rule = cat.rules[pageIdx];
            
            let msgText = `🏛 **${cat.category_title}** yo'nalishi:\n\n`;
            msgText += `🔹 ${pageIdx + 1}. ${rule.title}\n`;
            msgText += `📝 _Mazmuni:_ ${rule.desc}\n`;
            msgText += `📌 _Asosiy moddalar:_ ${rule.key_articles}\n`;
            msgText += `⚖️ _Javobgarlik:_ ${rule.punishment}\n`;
            
            let navRow = [];
            
            if (pageIdx > 0) {
                navRow.push({ text: "⬅️ Oldingi", callback_data: `law_page_${catId}_${pageIdx - 1}` });
            }
            
            navRow.push({ text: `${pageIdx + 1}/${total}`, callback_data: "ignore" });
            
            if (pageIdx < total - 1) {
                navRow.push({ text: "Keyingi ➡️", callback_data: `law_page_${catId}_${pageIdx + 1}` });
            }
            
            const keyboard = [
                navRow,
                [{ text: "⬅️ Yo'nalishlarga qaytish", callback_data: "menu_learn" }]
            ];
            
            if (data.startsWith('law_page_')) {
                // Edit existing message for smooth pagination
                bot.editMessageText(msgText, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                }).catch(e => console.log(e));
            } else {
                // Send new message when coming from menu
                bot.sendMessage(chatId, msgText, {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: keyboard }
                });
            }
        }
    }
    
    // Test va savollar bo'limlari uchun umumiy tutib oluvchi
    if (data.startsWith('menu_') && data !== 'menu_learn' && data !== 'menu_back' && data !== 'menu_hero' && data !== 'menu_leaderboard' && data !== 'menu_redbook') {
        const type = data.replace('menu_', ''); // quizzes, puzzles, terms, penalties, truefalse bo'ladi
        sendRandomQuestion(chatId, type);
    }
    
    // Qizil Kitob
    if (data === 'menu_redbook') {
        if (redbookData.length === 0) {
            return bot.sendMessage(chatId, "Hozircha Qizil Kitob ma'lumotlari yuklanmoqda... Birozdan so'ng qayta urinib ko'ring.");
        }
        sendRedbookPage(chatId, 0);
    }
    
    if (data.startsWith('redbook_page_')) {
        const pageIdx = parseInt(data.replace('redbook_page_', ''));
        sendRedbookPage(chatId, pageIdx, query.message.message_id);
    }
    
    // Eko-Qahramon boshlash
    if (data === 'menu_hero') {
        sendQuestNode(chatId, 'intro');
    }
    
    // Eko-Qahramon davomi
    if (data.startsWith('hero_')) {
        const nodeId = data.replace('hero_', '');
        sendQuestNode(chatId, nodeId);
    }
    
    // Liderlar reytingi
    if (data === 'menu_leaderboard') {
        let sortedUsers = [...usersData].sort((a, b) => (b.score || 0) - (a.score || 0));
        let top10 = sortedUsers.slice(0, 10);
        
        let msg = `🏆 **Eko-Bilimdonlar Top-10 Reytingi:**\n\n`;
        top10.forEach((u, i) => {
            let medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔹";
            msg += `${medal} ${i+1}. [${u.first_name}](tg://user?id=${u.id}) - **${u.score || 0} ball**\n`;
        });
        
        // O'zining o'rni
        let myIndex = sortedUsers.findIndex(u => u.id === chatId);
        let myScore = sortedUsers[myIndex]?.score || 0;
        msg += `\n🎯 SIZNING O'RNINGIZ: **${myIndex + 1}-o'rin** (${myScore} ball)\n`;
        msg += `_To'g'ri javob berib, ballingizni oshiring!_`;
        
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', ...mainMenuOptions });
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
        const session = getUserSession(chatId);
        
        // Urinishlar sonini oshirish
        session.attempts[type]++;
        
        if (selectedIndex === questionData.answer_index) {
            bot.sendMessage(chatId, `✅ **To'g'ri javob!**\n\n${questionData.explanation}`, { parse_mode: 'Markdown' });
            
            // Foydalanuvchi buni to'g'ri topdi, endi sessiyaga yozib qo'yamiz
            if (!session[type].includes(qIndex)) {
                session[type].push(qIndex);
            }
            
            // Ball qoshish
            let userObj = usersData.find(u => u.id === chatId);
            if(userObj) {
                userObj.score = (userObj.score || 0) + 2;
                fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
            }
            
            // Boshqa tasodifiy savolni yuboramiz
            sendRandomQuestion(chatId, type);
        } else {
            bot.sendMessage(chatId, `❌ **Noto'g'ri!** Keyingi savolga o'tamiz...`);
            
            // Xato qilsa ham keyingi savolga o'tkazamiz. 
            sendRandomQuestion(chatId, type);
        }
    }
    
    // Testni o'z xohishi bilan tugatish (Tugatish tugmasi)
    if (data.startsWith('finish_')) {
        const type = data.replace('finish_', '');
        const session = getUserSession(chatId);
        
        const correct = session[type].length;
        const totalAttempts = session.attempts[type];
        const wrong = totalAttempts - correct;
        
        let msg = `🏁 **Test yakunlandi!**\n\n`;
        msg += `📊 Jami ishlangan: **${totalAttempts}** ta\n`;
        msg += `✅ To'g'ri javoblar: **${correct}** ta\n`;
        msg += `❌ Xato javoblar: **${wrong}** ta\n\n`;
        msg += `_Yana o'ynash uchun menyudan tanlang._`;
        
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', ...mainMenuOptions });
        
        // Progressni tozalash
        session[type] = [];
        session.attempts[type] = 0;
    }
    
    // ----- ADMIN FUNKSIYALARI TUGMALARI -----
    if (data === 'admin_stats') {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        bot.sendMessage(chatId, "⏳ Statistika hisoblanmoqda... Kuting.");
        
        // Barcha foydalanuvchilarni tekshirib chiqish (bloklaganlarni aniqlash uchun)
        let activeCount = 0;
        let blockedCount = 0;
        let usersList = "";
        let blockedList = "";

        (async () => {
            for (let i = 0; i < usersData.length; i++) {
                let user = usersData[i];
                let userLink = `[${user.first_name || 'Foydalanuvchi'}](tg://user?id=${user.id})`;
                let username = user.username ? ` (@${user.username})` : '';
                let fullName = `${userLink}${username}`;

                try {
                    // Chat action orqali bot bloklangan yoki yo'qligini bilib olamiz
                    await bot.sendChatAction(user.id, 'typing');
                    user.is_blocked = false;
                    activeCount++;
                    usersList += `✅ ${fullName}\n`;
                } catch (err) {
                    user.is_blocked = true;
                    blockedCount++;
                    blockedList += `❌ ${fullName}\n`;
                }
            }
            
            // O'zgarishlarni saqlab qo'yamiz
            fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
            
            let statsText = `📊 **To'liq Statistika:**\n\n`;
            statsText += `👥 Jami obunachilar: **${usersData.length}** ta\n`;
            statsText += `✅ Faol foydalanuvchilar: **${activeCount}** ta\n`;
            statsText += `❌ Botni bloklaganlar: **${blockedCount}** ta\n\n`;
            
            statsText += `📜 **Faol foydalanuvchilar:**\n${usersList || "Yo'q"}\n\n`;
            statsText += `🚫 **Bloklaganlar:**\n${blockedList || "Yo'q"}`;
            
            // Agar text juda uzun bo'lib ketsa (Telegram 4096 belgi limiti) kesib tashlaymiz
            if (statsText.length > 4000) {
                statsText = statsText.substring(0, 4000) + "\n... (Ro'yxat juda uzun)";
            }
            
            bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        })();
    }
    
    if (data === 'admin_broadcast') {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        isBroadcasting = true;
        bot.sendMessage(chatId, "✉️ **Xabar tarqatish:**\n\nEndi botga tarqatmoqchi bo'lgan xabaringizni yuboring. (Rasm, video, audio yoki oddiy matn bo'lishi mumkin).\n\n_Bekor qilish uchun /start ni bosing._", { parse_mode: 'Markdown' });
    }
    
    bot.answerCallbackQuery(query.id);
});

// Tasodifiy, takrorlanmas savol yuborish funksiyasi
function sendRandomQuestion(chatId, type) {
    const session = getUserSession(chatId);
    const allQuestions = quizData[type];
    const SESSION_LIMIT = 20; // Har bir o'yin uchun savollar limiti
    
    // Hali foydalanuvchi yechmagan savollar indeksini ajratib olamiz
    const unansweredIndexes = [];
    allQuestions.forEach((q, idx) => {
        if (!session[type].includes(idx)) {
            unansweredIndexes.push(idx);
        }
    });
    
    // Agar hamma savollarni tugatgan bo'lsa yoki limitga (20 taga) yetgan bo'lsa
    if (unansweredIndexes.length === 0 || session.attempts[type] >= SESSION_LIMIT) {
        const correct = session[type].length;
        const totalAttempts = session.attempts[type];
        const wrong = totalAttempts - correct;
        
        let msg = `🎉 **Qoyil! Siz ushbu bo'limdagi ${totalAttempts} ta savolni yakunladingiz!**\n\n`;
        msg += `✅ To'g'ri: **${correct}** ta\n`;
        msg += `❌ Xato: **${wrong}** ta\n\n`;
        msg += `🔄 Yana ishlash uchun tegishli bo'limni tanlang.`;
        
        bot.sendMessage(chatId, msg, mainMenuOptions);
        
        // Keyingi safar yana yangi 20 ta savol o'ynashi uchun progressni tozalaymiz
        session[type] = []; 
        session.attempts[type] = 0;
        return;
    }
    
    // Yechilmaganlari orasidan bittasini tasodifiy tanlaymiz
    const randomPos = Math.floor(Math.random() * unansweredIndexes.length);
    const qIndex = unansweredIndexes[randomPos];
    
    // Tanlangan savolni ekranga chiqaramiz
    sendSpecificQuestion(chatId, type, qIndex, SESSION_LIMIT);
}

// Aniq bitta savolni ekranga chiqarish funksiyasi
function sendSpecificQuestion(chatId, type, qIndex, limit = 20) {
    const questionObj = quizData[type][qIndex];
    const session = getUserSession(chatId);
    const attemptsCount = session.attempts[type];
    
    // Ekranda ko'rsatiladigan maksimal savollar soni
    const totalCount = Math.min(quizData[type].length, limit);
    
    let text = `📊 **Savol: ${attemptsCount + 1} / ${totalCount}**\n\n`;
    text += type === 'puzzles' ? `🧩 **Vaziyat:** ${questionObj.story}\n\n❓ ${questionObj.question}` : `📝 **Savol:** ${questionObj.question}`;
    
    let keyboard = [];
    questionObj.options.forEach((opt, idx) => {
        keyboard.push([{ text: opt, callback_data: `ans_${type}_${idx}_${qIndex}` }]);
    });
    
    keyboard.push([
        { text: "⬅️ Menyuga", callback_data: "menu_back" },
        { text: "🛑 Tugatish", callback_data: `finish_${type}` }
    ]);
    
    let imagePath = null;
    let dynamicImagePath = questionObj.id ? `./data/images/${questionObj.id}.jpg` : null;
    
    if (questionObj.image && fs.existsSync(questionObj.image)) {
        imagePath = questionObj.image;
    } else if (dynamicImagePath && fs.existsSync(dynamicImagePath)) {
        imagePath = dynamicImagePath;
    } else if (type === 'puzzles' && fs.existsSync('./data/puzzle_bg.jpg')) {
        imagePath = './data/puzzle_bg.jpg';
    }
    
    if (imagePath) {
        bot.sendPhoto(chatId, imagePath, {
            caption: text,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'Markdown' });
    }
}

// ==========================================
// ADMIN PANEL BO'LIMI
// ==========================================
const adminMenuOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: "📊 Statistika", callback_data: "admin_stats" }],
            [{ text: "✉️ Hammaga xabar yuborish", callback_data: "admin_broadcast" }]
        ]
    }
};

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== ADMIN_ID) return; // Faqat adminga ruxsat
    
    bot.sendMessage(chatId, "🛠 **Admin Panelga xush kelibsiz!**\n\nQuyidagi menyudan kerakli bo'limni tanlang:", { parse_mode: 'Markdown', ...adminMenuOptions });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    // Agar xabar tarqatish yoqilgan bo'lsa va bu admin bo'lsa
    if (chatId === ADMIN_ID && isBroadcasting && !msg.text?.startsWith('/')) {
        isBroadcasting = false;
        bot.sendMessage(chatId, "⏳ Xabar tarqatish boshlandi... Iltimos kuting.");
        
        let successCount = 0;
        let failCount = 0;
        
        usersData.forEach((userObj, index) => {
            const uId = userObj.id || userObj;
            setTimeout(() => {
                bot.copyMessage(uId, chatId, msg.message_id)
                    .then(() => { successCount++; })
                    .catch(() => { failCount++; })
                    .finally(() => {
                        // Oxirgi odamga yuborilganda hisobot berish
                        if (index === usersData.length - 1) {
                            bot.sendMessage(chatId, `✅ **Xabar tarqatish yakunlandi!**\n\nYetib bordi: ${successCount} ta\nYetib bormadi (bloklaganlar): ${failCount} ta`, { parse_mode: 'Markdown' });
                        }
                    });
            }, index * 50); // Telegram limitiga tushmaslik uchun 50ms kechikish
        });
        
        return; // Tarqatish paytida pastdagi xato xabari chiqmasligi uchun funksiyani to'xtatamiz
    }
    
    // Boshqa har qanday (buyruq bo'lmagan) xabarlar uchun
    if (msg.text && !msg.text.startsWith('/')) {
        bot.sendMessage(chatId, "⚠️ Botdan foydalanish uchun /start buyrug'ini bosing yoki bot menyusidan foydalaning.");
    }
});

// Eko-Qahramon tugunini yuborish
function sendQuestNode(chatId, nodeId) {
    const node = questData.find(n => n.id === nodeId);
    if (!node) return;
    
    let keyboard = [];
    node.options.forEach(opt => {
        keyboard.push([{ text: opt.text, callback_data: `hero_${opt.next}` }]);
    });
    
    if (keyboard.length === 0) {
        // O'yin tugadi, menyuga qaytish tugmasi
        keyboard.push([{ text: "⬅️ Bosh menyuga", callback_data: "menu_back" }]);
    }
    
    // Ball qoshish (agar score_delta bo'lsa)
    if (node.score_delta) {
        let userObj = usersData.find(u => u.id === chatId);
        if(userObj) {
            userObj.score = (userObj.score || 0) + node.score_delta;
            fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
        }
    }
    
    let imagePath = null;
    if (node.image && fs.existsSync(node.image)) {
        imagePath = node.image;
    } else if (fs.existsSync('./data/puzzle_bg.jpg')) {
        imagePath = './data/puzzle_bg.jpg';
    }
    
    if (imagePath) {
        bot.sendPhoto(chatId, imagePath, { caption: node.story, parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } }).catch(err => {
            bot.sendMessage(chatId, node.story, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
        });
    } else {
        bot.sendMessage(chatId, node.story, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: keyboard } });
    }
}

// Qizil Kitob sahifasini yuborish
function sendRedbookPage(chatId, pageIdx, messageId = null) {
    if (pageIdx < 0 || pageIdx >= redbookData.length) return;
    
    const animal = redbookData[pageIdx];
    let msg = `📜 **QIZIL KITOB (O'zbekiston)**\n\n`;
    msg += `🐾 **Nomi:** ${animal.name}\n`;
    msg += `⚠️ **Holati:** ${animal.status}\n\n`;
    if (animal.tarqalishi) msg += `🌍 **Tarqalishi:** ${animal.tarqalishi}\n`;
    if (animal.yashash_joyi) msg += `🏞 **Yashash joyi:** ${animal.yashash_joyi}\n`;
    if (animal.soni) msg += `🔢 **Soni:** ${animal.soni}\n`;
    if (animal.yashash_tarzi) msg += `🔄 **Yashash tarzi:** ${animal.yashash_tarzi}\n`;
    if (animal.cheklovchi_omillar) msg += `❗ **Cheklovchi omillar:** ${animal.cheklovchi_omillar}\n`;
    if (animal.kopaytirish) msg += `🐣 **Ko'paytirish:** ${animal.kopaytirish}\n`;
    if (animal.muhofaza) msg += `🛡 **Muhofaza choralari:** ${animal.muhofaza}\n`;
    if (animal.desc) msg += `📝 **Ma'lumot:** ${animal.desc}\n`;
    
    // Telegram caption limit is 1024 characters
    if (msg.length > 1020) {
        msg = msg.substring(0, 1020) + "...";
    }
    
    let navRow = [];
    if (pageIdx > 0) navRow.push({ text: "⬅️ Oldingi", callback_data: `redbook_page_${pageIdx - 1}` });
    navRow.push({ text: `${pageIdx + 1} / ${redbookData.length}`, callback_data: "ignore" });
    if (pageIdx < redbookData.length - 1) navRow.push({ text: "Keyingi ➡️", callback_data: `redbook_page_${pageIdx + 1}` });
    
    let keyboard = { inline_keyboard: [ navRow, [{ text: "⬅️ Bosh menyuga", callback_data: "menu_back" }] ] };
    
    let imagePath = null;
    if (animal.image && fs.existsSync('./data/images/' + animal.image)) {
        imagePath = './data/images/' + animal.image;
    }
    
    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(e => {});
    }
    
    if (imagePath) {
        bot.sendPhoto(chatId, imagePath, { caption: msg, parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
}
