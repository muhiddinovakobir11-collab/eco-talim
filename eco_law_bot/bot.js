const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');
const activeAppUsers = new Map();
const pendingReports = {};
const userStates = {};
const PORTFOLIO_CHANNEL = process.env.PORTFOLIO_CHANNEL || '@eco_talim_admin_ruxsati';

let approvalsData = {};
if (fs.existsSync('./data/approvals.json')) {
    approvalsData = JSON.parse(fs.readFileSync('./data/approvals.json', 'utf-8'));
}

let feedData = [];
if (fs.existsSync('./data/feed.json')) {
    feedData = JSON.parse(fs.readFileSync('./data/feed.json', 'utf-8'));
}

let broadcastsData = [];
if (fs.existsSync('./data/broadcasts.json')) {
    broadcastsData = JSON.parse(fs.readFileSync('./data/broadcasts.json', 'utf-8'));
}

// Render platformasida Web Service sifatida ishlashi uchun soxta (dummy) server yaratamiz.
// Bu Render "Port topilmadi" degan xatoni bermasligi uchun kerak.
const port = process.env.PORT || 3000;
const path = require('path');

http.createServer((req, res) => {
    // API endpoint for real online users
    if (req.url.startsWith('/api/ping')) {
        const query = req.url.split('?')[1] || '';
        let userId = 'anon-' + Math.random();
        if (query.includes('userId=')) {
            userId = query.split('userId=')[1].split('&')[0];
        }
        activeAppUsers.set(userId, Date.now());
        
        // cleanup
        const now = Date.now();
        for (const [id, time] of activeAppUsers.entries()) {
            if (now - time > 20000) {
                activeAppUsers.delete(id);
            }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.write(JSON.stringify({ online: activeAppUsers.size }));
        return res.end();
    }

    // API endpoint to get user data
    if (req.url.startsWith('/api/user/')) {
        const userId = parseInt(req.url.split('/').pop());
        const userObj = usersData.find(u => u.id === userId);
        const session = userSessions[userId] || {};
        
        let resData = {
            id: userId,
            needsRegistration: !userObj || !userObj.phone,
            score: userObj ? userObj.score : 0,
            isAdmin: userId === ADMIN_ID,
            totalUsers: usersData.filter(u => !u.is_blocked).length,
            quizzes: session.quizzes || [],
            puzzles: session.puzzles || [],
            terms: session.terms || [],
            penalties: session.penalties || [],
            truefalse: session.truefalse || []
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(resData));
        return res.end();
    }
    
    // API endpoint for leaderboard
    if (req.url === '/api/leaderboard') {
        let sortedUsers = [...usersData].sort((a, b) => (b.score || 0) - (a.score || 0));
        let topUsers = sortedUsers.slice(0, 100).map(u => ({
            id: u.id,
            first_name: u.first_name,
            score: u.score || 0
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(topUsers));
        return res.end();
    }
    
    // API endpoint to trigger bot action
    if (req.url === '/api/trigger' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                let data = JSON.parse(body);
                let userId = data.userId;
                let action = data.action;
                let query = {
                    id: Math.random().toString(),
                    data: action,
                    message: { chat: { id: userId }, message_id: 0 }
                };
                bot.emit('callback_query', query);
                res.writeHead(200);
                res.end('OK');
            } catch(e) {
                res.writeHead(400);
                res.end('Error');
            }
        });
        return;
    }

    // API endpoint for submitting report with image
    if (req.url === '/api/submit_report' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                let data = JSON.parse(body);
                const caption = `🚨 <b>YANGI EKO-MUAMMO KELIB TUSHDI!</b>\n\n👤 <b>Yuboruvchi:</b> ${data.name}\n📍 <b>Manzil:</b> ${data.location}\n📝 <b>Tavsif:</b> ${data.description}\n\n🔗 <b>Telegram Profili:</b> <a href="tg://user?id=${data.userId}">Profilga o'tish</a>`;
                
                let base64Data = data.image.replace(/^data:image\/\w+;base64,/, "");
                let buffer = Buffer.from(base64Data, 'base64');
                
                bot.sendPhoto(ADMIN_ID, buffer, { caption: caption, parse_mode: 'HTML' })
                    .then(() => {
                        if (data.userId) {
                            bot.sendMessage(data.userId, "🎉 <b>Rahmat!</b> Murojaatingiz Adminga muvaffaqiyatli yuborildi. Ekologiyaga qo'shayotgan hissangiz uchun tashakkur!", { parse_mode: 'HTML' }).catch(()=>{});
                        }
                    }).catch(e => console.log(e));
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                console.log(e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // Oddiy so'rovlar uchun doim 200 OK qaytaramiz (UptimeRobot uchun)
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running and alive!', 'utf-8');

}).listen(port, () => {
    console.log(`Web server portda ishga tushdi: ${port}`);
});

// Render'da tekin server uxlab qolmasligi uchun bot o'ziga-o'zi har 14 daqiqada so'rov yuboradi
setInterval(() => {
    http.get('https://eco-talim.onrender.com').on('error', (err) => {
        console.error("Ping xatosi:", err.message);
    });
}, 14 * 60 * 1000);

// Load Data
let quizData = JSON.parse(fs.readFileSync('./data/quiz.json', 'utf8').replace(/^\uFEFF/, ''));
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
    usersData = rawData.map(u => typeof u === 'number' ? { id: u, first_name: 'Foydalanuvchi', username: '', is_blocked: false, score: 0, progress: {} } : u);
    usersData.forEach(u => { 
        if (u.score === undefined) u.score = 0; 
        if (!u.progress) u.progress = {};
    });
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
function getMainMenuOptions(chatId) {
    let keyboard = [
        [{ text: "📸 Eko-Nazorat", callback_data: "menu_report" }],
        [{ text: "🎯 Ekologiya Quiz", callback_data: "menu_quizzes" }],
        [{ text: "🔮 Jumboqli Vaziyatlar", callback_data: "menu_puzzles" }],
        [{ text: "🦸‍♂️ Eko-Qahramon", callback_data: "menu_hero" }],
        [{ text: "📕 Qizil Kitob", callback_data: "menu_redbook" }],
        [{ text: "💡 Ekologik Atamalar", callback_data: "menu_terms" }],
        [{ text: "🚨 Jazolar va Jarimalar", callback_data: "menu_penalties" }],
        [{ text: "🟢 To'g'ri / 🔴 Noto'g'ri", callback_data: "menu_truefalse" }],
        [{ text: "👑 Liderlar Reytingi", callback_data: "menu_leaderboard" }]
    ];
    
    // Faqat Adminga "Boshqaruv Paneli" tugmasi chiqadi
    if (chatId === ADMIN_ID) {
        keyboard.push([{ text: "⚙️ Boshqaruv Paneli", callback_data: "admin_panel" }]);
    }
    
    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    // setChatMenuButton olib tashlandi
    // Sessiyani tozalash (yangi start berilganda boshidan boshlashi uchun)
    if (!userSessions[chatId]) userSessions[chatId] = { quizzes: [], puzzles: [], terms: [], penalties: [], truefalse: [], attempts: { quizzes: 0, puzzles: 0, terms: 0, penalties: 0, truefalse: 0 } };
    
    // Tarqatish holatini bekor qilish (agar yoqilgan bo'lsa)
    if (chatId === ADMIN_ID) isBroadcasting = false;

    // Foydalanuvchini bazaga qo'shish (agar yo'q bo'lsa)
    let userObj = usersData.find(u => u.id === chatId);
    if (!userObj) {
        userObj = {
            id: chatId,
            first_name: msg.chat.first_name || '',
            username: msg.chat.username || '',
            is_blocked: false,
            score: 0,
            progress: {}
        };
        usersData.push(userObj);
        fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
    } else {
        // Ism yoki username o'zgargan bo'lsa yangilaymiz
        let changed = false;
        if (userObj.first_name !== msg.chat.first_name) { userObj.first_name = msg.chat.first_name; changed = true; }
        if (userObj.username !== msg.chat.username) { userObj.username = msg.chat.username; changed = true; }
        if (!userObj.progress) { userObj.progress = {}; changed = true; }
        if (changed) fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
    }
    
    const introText = `🌟 <b>Assalomu alaykum! Eco Law Botga xush kelibsiz.</b>\n<blockquote>Bu yerda siz O'zbekistonning ekologiyaga doir qonunlarini qiziqarli tarzda o'rganishingiz mumkin! Quyidagi menyulardan birini tanlab boshlang.</blockquote>\n\n📲 <b>Murojaat uchun:</b> @akoshprod`;
    const videoPath = './data/intro.mp4';
    
    if (fs.existsSync(videoPath)) {
        bot.sendVideo(chatId, videoPath, {
            caption: introText,
            reply_markup: getMainMenuOptions(chatId).reply_markup,
            parse_mode: 'HTML'
        });
    } else {
        bot.sendMessage(chatId, introText, { ...getMainMenuOptions(chatId), parse_mode: 'HTML' });
    }
});

bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    if (data.startsWith('approve_appr_')) {
        const approvalId = data.replace('approve_', '');
        if (approvalsData[approvalId]) {
            const report = approvalsData[approvalId];
            // Push to feed array
            feedData.unshift({
                id: approvalId,
                photo: report.mediaGroup[0].media,
                caption: report.mediaGroup[0].caption || "Eco-Nazorat murojaati",
                date: new Date().toLocaleDateString('uz-UZ')
            });
            fs.writeFileSync('./data/feed.json', JSON.stringify(feedData, null, 2));

            bot.editMessageText(`✅ <b>Tasdiqlandi va Eko-Lentaga qo'shildi!</b>\nMurojaat-ID: ${approvalId}`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            });
            bot.sendMessage(report.userId, "✅ <b>Tabriklaymiz!</b> Sizning murojaatingiz tasdiqlandi va bot ichidagi Murojaatlar Lentasiga joylandi. Rahmat!", { parse_mode: 'HTML' }).catch(()=>{});
            
            // Xabar tarqatish (Broadcast) barcha foydalanuvchilarga
            let successCount = 0;
            usersData.forEach((userObj, idx) => {
                const uId = userObj.id || userObj;
                setTimeout(() => {
                    bot.sendMessage(uId, "🚨 <b>YANGI EKO-MUAMMO KELIB TUSHDI!</b>\n\nTabiatga befarq bo'lmagan fuqaro tomonidan yangi muammo xabar qilindi. Uni ko'rish uchun pastdagi tugmani bosing:", {
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "👀 Ko'rish", callback_data: `report_view_${approvalId}` }]
                            ]
                        }
                    }).catch(() => {});
                }, idx * 50);
            });

            delete approvalsData[approvalId];
            fs.writeFileSync('./data/approvals.json', JSON.stringify(approvalsData, null, 2));
        } else {
            bot.answerCallbackQuery(query.id, { text: "Bu murojaat allaqachon ko'rib chiqilgan yoki topilmadi.", show_alert: true });
        }
        return;
    }

    if (data.startsWith('reject_appr_')) {
        const approvalId = data.replace('reject_', '');
        if (approvalsData[approvalId]) {
            const report = approvalsData[approvalId];
            bot.editMessageText(`❌ <b>Rad etildi!</b>\nMurojaat-ID: ${approvalId}`, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: 'HTML'
            });
            bot.sendMessage(report.userId, "❌ Sizning murojaatingiz admin tomonidan rad etildi (talablarga mos kelmagan bo'lishi mumkin).", { parse_mode: 'HTML' }).catch(()=>{});
            delete approvalsData[approvalId];
            fs.writeFileSync('./data/approvals.json', JSON.stringify(approvalsData, null, 2));
        } else {
            bot.answerCallbackQuery(query.id, { text: "Bu murojaat allaqachon ko'rib chiqilgan yoki topilmadi.", show_alert: true });
        }
        return;
    }

    
    if (data === 'menu_report') {
        bot.sendMessage(chatId, "📸 <b>Eko-Nazorat</b> bo'limi:\nIltimos, kerakli amalni tanlang:", {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "➕ Yangi muammo yuborish", callback_data: "report_new" }],
                    [{ text: "🌍 Murojaatlar lentasi", callback_data: "report_view_latest" }],
                    [{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]
                ]
            }
        });
        return;
    }

    if (data === 'report_new') {
        userStates[chatId] = { step: 'awaiting_photos', photos: [] };
        let msgText = `➕ <b>Yangi Eko-Muammo</b>\n\nIltimos, ekologik muammo yuz bergan joyning rasmlarini yuboring (6 tagacha qabul qilinadi).\n\nRasm yuborish uchun pastdagi 📎 (qisqich) belgisini bosib kameradan yoki galereyadan tanlang. Barcha rasmlarni yuborib bo'lgach, quyidagi <b>"Davom etish ➡️"</b> tugmasini bosing.`;
        bot.sendMessage(chatId, msgText, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Davom etish ➡️", callback_data: "report_continue" }],
                    [{ text: "🏠 Bekor qilish", callback_data: "menu_back" }]
                ]
            }
        });
        return;
    }
    
    if (data.startsWith('report_view_')) {
        if (feedData.length === 0) {
            bot.sendMessage(chatId, "Hozircha murojaatlar lentasi bo'sh. Birinchi bo'lib muammo yuboring!");
            return;
        }
        
        let index = 0;
        const id = data.replace('report_view_', '');
        if (id !== 'latest') {
            index = feedData.findIndex(r => r.id === id);
            if (index === -1) {
                bot.answerCallbackQuery(query.id, { text: "Bu murojaat topilmadi yoki o'chirilgan.", show_alert: true });
                return;
            }
        }
        
        const report = feedData[index];
        
        let keyboard = [];
        let navigationRow = [];
        if (index > 0) {
            navigationRow.push({ text: "⬅️ Oldingi", callback_data: `report_view_${feedData[index - 1].id}` });
        }
        navigationRow.push({ text: `${index + 1} / ${feedData.length}`, callback_data: "dummy" });
        if (index < feedData.length - 1) {
            navigationRow.push({ text: "Keyingi ➡️", callback_data: `report_view_${feedData[index + 1].id}` });
        }
        keyboard.push(navigationRow);
        keyboard.push([{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]);
        
        const photoId = report.photo;
        let captionText = report.caption + `\n\n📅 Sana: ${report.date}`;
        if (report.solved) {
            captionText = `✅ <b>HAL QILINDI</b>\n\n` + captionText;
        }
        if (query.message.photo) {
            bot.editMessageMedia({
                type: 'photo',
                media: photoId,
                caption: captionText,
                parse_mode: 'HTML'
            }, {
                chat_id: chatId,
                message_id: query.message.message_id,
                reply_markup: { inline_keyboard: keyboard }
            }).catch(() => {});
        } else {
            bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
            bot.sendPhoto(chatId, photoId, {
                caption: captionText,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
        
        bot.answerCallbackQuery(query.id).catch(()=>{});
        return;
    }
    
    if (data === 'report_continue') {
        if (!userStates[chatId] || !userStates[chatId].photos || userStates[chatId].photos.length === 0) {
            bot.sendMessage(chatId, "Iltimos, avval kamida 1 ta rasm yuboring.");
            return;
        }
        userStates[chatId].step = 'awaiting_location';
        bot.sendMessage(chatId, `📍 <b>Zo'r! Endi manzilni yuboring.</b>\n\nIltimos, pastdagi klaviaturadagi "📍 Lokatsiyani jo'natish" tugmasini bosing yoki xaritadan manzilni belgilab yuboring.`, {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    [{ text: "📍 Lokatsiyani jo'natish", request_location: true }],
                    [{ text: "Bekor qilish" }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        return;
    }

    
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
        keyboard.push([{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]);
        
        bot.sendMessage(chatId, "<tg-emoji emoji-id=\"5330558871129836783\">📚</tg-emoji> <b>O'rganish uchun kerakli yo'nalishni tanlang:</b>", {
            parse_mode: 'HTML',
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
            
            let msgText = `<tg-emoji emoji-id="5202058805457740493">📂</tg-emoji> <b>${cat.category_title}</b> yo'nalishi:\n\n`;
            msgText += `<tg-emoji emoji-id="5463297803235113601">📑</tg-emoji> <b>${pageIdx + 1}. ${rule.title}</b>\n`;
            msgText += `<i>Mazmuni:</i>\n<blockquote>${rule.desc}</blockquote>\n`;
            msgText += `<i>Asosiy moddalar:</i>\n<blockquote>${rule.key_articles}</blockquote>\n`;
            msgText += `<i>Javobgarlik:</i>\n<blockquote>${rule.punishment}</blockquote>\n`;
            
            let navRow = [];
            let keyboard = [];
            
            if (pageIdx > 0) {
                navRow.push({ text: "⏪ Oldingi", callback_data: `law_page_${catId}_${pageIdx - 1}` });
            }
            
            navRow.push({ text: `📄 ${pageIdx + 1} / ${total}`, callback_data: "ignore" });
            
            if (pageIdx < total - 1) {
                navRow.push({ text: "Keyingi ⏩", callback_data: `law_page_${catId}_${pageIdx + 1}` });
            }
            
            keyboard.push(navRow);
            keyboard.push(
                [{ text: "📂 Yo'nalishlar", callback_data: "menu_learn" }]
            );
            
            if (data.startsWith('law_page_')) {
                // Edit existing message for smooth pagination
                bot.editMessageText(msgText, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                }).catch(e => console.log(e));
            } else {
                // Send new message when coming from menu
                bot.sendMessage(chatId, msgText, {
                    parse_mode: 'HTML',
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
        let msg = `<tg-emoji emoji-id="5242628160297641831">📕</tg-emoji> <b>Qizil Kitob</b> bo'limiga xush kelibsiz.\n\nQaysi yo'nalish bo'yicha ma'lumot olmoqchisiz?`;
        let keyboard = {
            inline_keyboard: [
                [{ text: "🐅 Hayvonot olami", callback_data: "redbook_start_animals" }],
                [{ text: "🌿 O'simliklar dunyosi", callback_data: "redbook_start_plants" }],
                [{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]
            ]
        };
        
        bot.editMessageText(msg, {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: 'HTML',
            reply_markup: keyboard
        }).catch(e => {
            bot.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard });
        });
        return;
    }
    
    if (data.startsWith('redbook_start_')) {
        const category = data.replace('redbook_start_', '');
        
        let targetData = category === 'plants' 
            ? redbookData.filter(i => i.name.includes("(O'simlik)"))
            : redbookData.filter(i => !i.name.includes("(O'simlik)"));
            
        if (targetData.length === 0) {
            return bot.answerCallbackQuery(query.id, { text: "Hozircha ma'lumot kiritilmagan", show_alert: true });
        }
        const randomPage = Math.floor(Math.random() * targetData.length);
        sendRedbookPage(chatId, randomPage, query.message.message_id, category);
        return;
    }
    
    if (data.startsWith('redbook_page_')) {
        // format: redbook_page_2_animals or redbook_page_2 (old)
        let parts = data.replace('redbook_page_', '').split('_');
        let pageIdx = parseInt(parts[0]);
        let category = parts[1] || 'animals';
        
        sendRedbookPage(chatId, pageIdx, query.message.message_id, category);
        return;
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
        
        let msg = `<tg-emoji emoji-id="5330558871129836783">🏆</tg-emoji> <b>Eko-Bilimdonlar Top-10 Reytingi:</b>\n\n`;
        top10.forEach((u, i) => {
            let medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔹";
            msg += `${medal} ${i+1}. <a href="tg://user?id=${u.id}">${u.first_name}</a> - <b>${u.score || 0} ball</b>\n`;
        });
        
        // O'zining o'rni
        let myIndex = sortedUsers.findIndex(u => u.id === chatId);
        let myScore = sortedUsers[myIndex]?.score || 0;
        msg += `\n<tg-emoji emoji-id="5463297803235113601">📍</tg-emoji> SIZNING O'RNINGIZ: <b>${myIndex + 1}-o'rin</b> (${myScore} ball)\n`;
        msg += `<i>To'g'ri javob berib, ballingizni oshiring!</i>`;
        
        bot.sendMessage(chatId, msg, { parse_mode: 'HTML', ...getMainMenuOptions(chatId) });
        return;
    }
    
    if (data === 'menu_back') {
        bot.sendMessage(chatId, "Bosh menyu:", getMainMenuOptions(chatId));
        return;
    }// Javobni tekshirish (ans_type_selectedIndex_qIndex formatida keladi)
    if (data.startsWith('ans_')) {
        const parts = data.split('_');
        const type = parts[1]; // quizzes, puzzles ...
        const selectedIndex = parseInt(parts[2]);
        const qIndex = parseInt(parts[3]);
        
        let questionData = quizData[type][qIndex];
        
        let userObj = usersData.find(u => u.id === chatId);
        
        if (selectedIndex === questionData.answer_index) {
            // Delete old question
            bot.deleteMessage(chatId, query.message.message_id).catch(e => console.log(e));
            
            // Show alert for correct answer
            bot.answerCallbackQuery(query.id, { 
                text: `✅ To'g'ri javob! (+2 ball)\n${questionData.explanation || ''}`.substring(0, 190), 
                show_alert: false 
            }).catch(e => console.log(e));
            
            // Foydalanuvchi buni to'g'ri topdi, endi progressga yozib qo'yamiz
            if (userObj) {
                if (!userObj.progress) userObj.progress = {};
                if (!userObj.progress[type]) userObj.progress[type] = [];
                
                if (!userObj.progress[type].includes(qIndex)) {
                    userObj.progress[type].push(qIndex);
                }
                userObj.score = (userObj.score || 0) + 2;
                fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
            }
            
            // Boshqa tasodifiy savolni yuboramiz
            sendRandomQuestion(chatId, type);
        } else {
            // Delete old question
            bot.deleteMessage(chatId, query.message.message_id).catch(e => console.log(e));
            
            // Show toast for incorrect answer
            bot.answerCallbackQuery(query.id, { 
                text: `❌ Noto'g'ri javob!`, 
                show_alert: false 
            }).catch(e => console.log(e));
            
            // Xato qilsa ham keyingi savolga o'tkazamiz. 
            sendRandomQuestion(chatId, type);
        }
    }
    
    // Testni o'z xohishi bilan tugatish (Tugatish tugmasi)
    if (data.startsWith('finish_')) {
        const type = data.replace('finish_', '');
        
        let userObj = usersData.find(u => u.id === chatId);
        const correct = userObj && userObj.progress && userObj.progress[type] ? userObj.progress[type].length : 0;
        
        let msg = `<tg-emoji emoji-id="5330558871129836783">🏁</tg-emoji> <b>Test yakunlandi!</b>\n\n`;
        msg += `<tg-emoji emoji-id="5373299568161087824">✅</tg-emoji> Jami to'g'ri topilganlar: <b>${correct}</b> ta\n\n`;
        msg += `<i>Yana davom ettirish uchun menyudan tanlang.</i>`;
        
        bot.sendMessage(chatId, msg, { parse_mode: 'HTML', ...getMainMenuOptions(chatId) });
    }
    
    if (data === 'admin_panel') {
        if (chatId !== ADMIN_ID) return;
        bot.sendMessage(chatId, "⚙️ <b>Boshqaruv Paneli</b>\n\nQuyidagi amallardan birini tanlang:", {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📸 Eko-Nazorat Murojaatlari", callback_data: "admin_rep_view_0" }],
                    [{ text: "📊 Statistika va Foydalanuvchilar", callback_data: "admin_stats" }],
                    [{ text: "📢 Xabar tarqatish (Broadcast)", callback_data: "admin_broadcast" }],
                    [{ text: "📜 Tarqatilgan xabarlar tarixi", callback_data: "admin_bcast_hist_0" }],
                    [{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]
                ]
            }
        });
        return;
    }
    
    if (data.startsWith('admin_rep_view_')) {
        if (chatId !== ADMIN_ID) return;
        if (feedData.length === 0) {
            bot.answerCallbackQuery(query.id, { text: "Murojaatlar bazasi bo'sh.", show_alert: true });
            return;
        }
        const index = parseInt(data.replace('admin_rep_view_', ''));
        sendAdminReportMsg(chatId, index, query.message.message_id);
        return;
    }
    
    if (data.startsWith('admin_rep_solve_')) {
        if (chatId !== ADMIN_ID) return;
        const id = data.replace('admin_rep_solve_', '');
        const index = feedData.findIndex(r => r.id === id);
        if (index !== -1) {
            feedData[index].solved = true;
            fs.writeFileSync('./data/feed.json', JSON.stringify(feedData, null, 2));
            bot.answerCallbackQuery(query.id, { text: "✅ Hal qilindi deb belgilandi!", show_alert: false });
            sendAdminReportMsg(chatId, index, query.message.message_id);
        }
        return;
    }
    
    if (data.startsWith('admin_rep_del_')) {
        if (chatId !== ADMIN_ID) return;
        const id = data.replace('admin_rep_del_', '');
        const index = feedData.findIndex(r => r.id === id);
        if (index !== -1) {
            feedData.splice(index, 1);
            fs.writeFileSync('./data/feed.json', JSON.stringify(feedData, null, 2));
            bot.answerCallbackQuery(query.id, { text: "🗑 Murojaat o'chirildi!", show_alert: false });
            if (feedData.length === 0) {
                bot.editMessageCaption("Barcha murojaatlar o'chirildi.", { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: "🔙 Orqaga", callback_data: "admin_panel" }]] } });
            } else {
                sendAdminReportMsg(chatId, index >= feedData.length ? feedData.length - 1 : index, query.message.message_id);
            }
        }
        return;
    }
    
    if (data.startsWith('admin_rep_comments_')) {
        if (chatId !== ADMIN_ID) return;
        const id = data.replace('admin_rep_comments_', '');
        const report = feedData.find(r => r.id === id);
        if (!report) return bot.answerCallbackQuery(query.id, { text: "Murojaat topilmadi", show_alert: true });
        
        let msgText = `💬 <b>Murojaat izohlari (Boshqaruv):</b>\n\n`;
        let kb = [];
        if (!report.comments || report.comments.length === 0) {
            msgText += "<i>Hozircha hech qanday izoh yo'q.</i>";
        } else {
            report.comments.forEach((c, i) => {
                msgText += `<b>${i+1}. ${c.name}:</b> ${c.text}\n`;
                kb.push([{ text: `🗑 ${i+1}-izohni o'chirish`, callback_data: `admin_rep_cdel_${id}_${c.id}` }]);
            });
        }
        kb.push([{ text: "🔙 Orqaga", callback_data: `admin_rep_view_${feedData.findIndex(r=>r.id===id)}` }]);
        
        bot.deleteMessage(chatId, query.message.message_id).catch(()=>{});
        bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
        return bot.answerCallbackQuery(query.id);
    }
    
    if (data.startsWith('admin_rep_cdel_')) {
        if (chatId !== ADMIN_ID) return;
        const parts = data.split('_');
        const commentId = parts.pop();
        const reportId = parts.slice(3).join('_');
        const report = feedData.find(r => r.id === reportId);
        if (report && report.comments) {
            report.comments = report.comments.filter(c => c.id !== commentId);
            fs.writeFileSync('./data/feed.json', JSON.stringify(feedData, null, 2));
            bot.answerCallbackQuery(query.id, { text: "Izoh o'chirildi!", show_alert: false });
            
            let msgText = `💬 <b>Murojaat izohlari (Boshqaruv):</b>\n\n`;
            let kb = [];
            if (report.comments.length === 0) {
                msgText += "<i>Hozircha hech qanday izoh yo'q.</i>";
            } else {
                report.comments.forEach((c, i) => {
                    msgText += `<b>${i+1}. ${c.name}:</b> ${c.text}\n`;
                    kb.push([{ text: `🗑 ${i+1}-izohni o'chirish`, callback_data: `admin_rep_cdel_${reportId}_${c.id}` }]);
                });
            }
            kb.push([{ text: "🔙 Orqaga", callback_data: `admin_rep_view_${feedData.findIndex(r=>r.id===reportId)}` }]);
            bot.editMessageText(msgText, { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
        }
        return;
    }

    if (data.startsWith('restart_all_')) {
        const type = data.replace('restart_all_', '');
        let userObj = usersData.find(u => u.id === chatId);
        if (userObj) {
            if (!userObj.progress) userObj.progress = {};
            userObj.progress[type] = [];
            fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
        }
        
        bot.deleteMessage(chatId, query.message.message_id).catch(() => {});
        bot.answerCallbackQuery(query.id, { text: "Tarix tozalandi! Savollar noldan boshlanadi." });
        sendRandomQuestion(chatId, type);
    }
    
    if (data.startsWith('request_more_')) {
        const type = data.replace('request_more_', '');
        bot.answerCallbackQuery(query.id, { text: "So'rovingiz adminga yuborildi. Rahmat!", show_alert: true });
        bot.sendMessage(ADMIN_ID, `⚠️ <b>Yangi savollar so'rovi:</b>\n<a href="tg://user?id=${chatId}">${query.from.first_name || 'Foydalanuvchi'}</a> (${chatId}) foydalanuvchisi <b>${type}</b> bo'limini to'liq yakunladi va yangi ma'lumotlar/savollar qo'shishingizni so'rayapti!`, { parse_mode: 'HTML' });
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
                let userLink = `<a href="tg://user?id=${user.id}">${user.first_name || 'Foydalanuvchi'}</a>`;
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
            
            let statsText = `<tg-emoji emoji-id="5469891106315446822">📊</tg-emoji> <b>To'liq Statistika:</b>\n\n`;
            statsText += `👥 Jami obunachilar: <b>${usersData.length}</b> ta\n`;
            statsText += `✅ Faol foydalanuvchilar: <b>${activeCount}</b> ta\n`;
            statsText += `❌ Botni bloklaganlar: <b>${blockedCount}</b> ta\n`;
            
            let keyboard = {
                inline_keyboard: [
                    [{ text: "✅ Faollarni ko'rish", callback_data: "admin_list_active" }],
                    [{ text: "❌ Bloklaganlarni ko'rish", callback_data: "admin_list_blocked" }],
                    [{ text: "🔙 Orqaga", callback_data: "admin_panel" }]
                ]
            };
            
            bot.sendMessage(chatId, statsText, { parse_mode: 'HTML', reply_markup: keyboard });
        })();
    }
    
    if (data === 'admin_list_active') {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        let activeUsers = usersData.filter(u => !u.is_blocked);
        let listText = "✅ <b>Faol foydalanuvchilar ro'yxati:</b>\n\n";
        activeUsers.forEach((user, i) => {
            listText += `${i + 1}. <a href="tg://user?id=${user.id}">${user.first_name || 'Foydalanuvchi'}</a> ${user.username ? '(@' + user.username + ')' : ''}\n`;
        });
        
        // Agar ro'yxat juda uzun bo'lsa, uni bo'lib yuborish kerak (Telegram limiti 4096 belgi)
        if (listText.length > 4000) {
            listText = listText.substring(0, 4000) + "...\n(Ro'yxat juda uzun)";
        }
        
        bot.sendMessage(chatId, listText, { parse_mode: 'HTML' });
    }
    
    if (data === 'admin_list_blocked') {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        let blockedUsers = usersData.filter(u => u.is_blocked);
        if (blockedUsers.length === 0) {
            return bot.sendMessage(chatId, "❌ Botni bloklagan foydalanuvchilar yo'q.");
        }
        let listText = "❌ <b>Botni bloklagan foydalanuvchilar:</b>\n\n";
        blockedUsers.forEach((user, i) => {
            listText += `${i + 1}. <a href="tg://user?id=${user.id}">${user.first_name || 'Foydalanuvchi'}</a> ${user.username ? '(@' + user.username + ')' : ''}\n`;
        });
        bot.sendMessage(chatId, listText, { parse_mode: 'HTML' });
    }
    
    if (data === 'admin_broadcast') {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        isBroadcasting = true;
        bot.sendMessage(chatId, "📝 <b>Xabar tarqatish rejimi:</b>\n\nTarqatmoqchi bo'lgan xabaringizni yuboring (Rasm, video yoki matn bo'lishi mumkin). Bekor qilish uchun /cancel deb yozing.", { parse_mode: 'HTML' });
    }
    
    if (data.startsWith('admin_bcast_hist_')) {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        if (broadcastsData.length === 0) {
            bot.answerCallbackQuery(query.id, { text: "Hozircha hech qanday xabar tarqatilmagan.", show_alert: true });
            return;
        }
        const index = parseInt(data.replace('admin_bcast_hist_', ''));
        sendAdminBroadcastHistMsg(chatId, index, query.message.message_id);
    }
    
    if (data.startsWith('admin_bcast_del_')) {
        if (chatId !== ADMIN_ID) return bot.answerCallbackQuery(query.id);
        const id = data.replace('admin_bcast_del_', '');
        const index = broadcastsData.findIndex(b => b.id === id);
        
        if (index !== -1) {
            const broadcast = broadcastsData[index];
            bot.answerCallbackQuery(query.id, { text: "⏳ O'chirish jarayoni boshlandi... Bu biroz vaqt olishi mumkin.", show_alert: true });
            
            let delSuccess = 0;
            let delFail = 0;
            
            broadcast.sent_messages.forEach((msgInfo, idx) => {
                setTimeout(() => {
                    bot.deleteMessage(msgInfo.chat_id, msgInfo.message_id)
                        .then(() => { delSuccess++; })
                        .catch(() => { delFail++; })
                        .finally(() => {
                            if (idx === broadcast.sent_messages.length - 1) {
                                broadcastsData.splice(index, 1);
                                fs.writeFileSync('./data/broadcasts.json', JSON.stringify(broadcastsData, null, 2));
                                
                                bot.sendMessage(chatId, `✅ <b>O'chirish yakunlandi!</b>\n\nMuvaffaqiyatli o'chirildi: ${delSuccess}\nO'chirib bo'lmadi (eski xabar bo'lishi mumkin): ${delFail}`, { parse_mode: 'HTML' });
                                
                                if (broadcastsData.length === 0) {
                                    bot.editMessageText("Barcha tarqatilgan xabarlar o'chirib bo'lingan.", { chat_id: chatId, message_id: query.message.message_id, reply_markup: { inline_keyboard: [[{ text: "🔙 Orqaga", callback_data: "admin_panel" }]] } });
                                } else {
                                    sendAdminBroadcastHistMsg(chatId, index >= broadcastsData.length ? broadcastsData.length - 1 : index, query.message.message_id);
                                }
                            }
                        });
                }, idx * 50);
            });
        }
    }
    
    bot.answerCallbackQuery(query.id);
});

// Tasodifiy, takrorlanmas savol yuborish funksiyasi
function sendRandomQuestion(chatId, type) {
    const allQuestions = quizData[type];
    
    let userObj = usersData.find(u => u.id === chatId);
    if (!userObj) return;
    if (!userObj.progress) userObj.progress = {};
    if (!userObj.progress[type]) userObj.progress[type] = [];
    
    // Qaysi savollar yechilmaganini topamiz
    let unansweredIndexes = [];
    for (let i = 0; i < allQuestions.length; i++) {
        if (!userObj.progress[type].includes(i)) {
            unansweredIndexes.push(i);
        }
    }
    
    // Agar hamma savollar yechib bo'lingan bo'lsa
    if (unansweredIndexes.length === 0) {
        let text = `<tg-emoji emoji-id="5330558871129836783">🏆</tg-emoji> <b>Barakalla!</b>\n\nSiz ushbu bo'limdagi barcha (jami ${allQuestions.length} ta) savollarni yechib bo'ldingiz! Ayni paytda yangi savollar qolmadi.`;
        let keyboard = {
            inline_keyboard: [
                [{ text: "🔄 Qayta hammasini boshlash", callback_data: `restart_all_${type}` }],
                [{ text: "👨‍💻 Adminga murojaat (Yangi manba qo'shish)", callback_data: `request_more_${type}` }],
                [{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]
            ]
        };
        bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
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
    let userObj = usersData.find(u => u.id === chatId);
    const answeredCount = userObj && userObj.progress && userObj.progress[type] ? userObj.progress[type].length : 0;
    
    const dbTotal = quizData[type].length;
    const qolgan = dbTotal - answeredCount;
    
    let text = `<tg-emoji emoji-id="5469891106315446822">📊</tg-emoji> <b>Qolgan savollar: ${qolgan} / ${dbTotal}</b>\n\n`;
    text += type === 'puzzles' ? `<tg-emoji emoji-id="5330558871129836783">🎭</tg-emoji> <b>Vaziyat:</b>\n<blockquote>${questionObj.story}</blockquote>\n\n<tg-emoji emoji-id="5463297803235113601">❓</tg-emoji> <b>${questionObj.question}</b>` : `<tg-emoji emoji-id="5463297803235113601">❓</tg-emoji> <b>Savol:</b>\n<blockquote>${questionObj.question}</blockquote>\n`;
    
    let optionsWithIndex = questionObj.options.map((opt, idx) => ({ text: opt, originalIdx: idx }));
    // Variantlarni tasodifiy aralashtirish
    optionsWithIndex.sort(() => Math.random() - 0.5);
    
    let keyboard = [];
    optionsWithIndex.forEach(optObj => {
        keyboard.push([{ text: optObj.text, callback_data: `ans_${type}_${optObj.originalIdx}_${qIndex}` }]);
    });
    
    keyboard.push([
        { text: "🏠 Bosh menyu", callback_data: "menu_back" },
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
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
    } else {
        bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' });
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

function sendAdminReportMsg(chatId, index, messageId) {
    if (index < 0 || index >= feedData.length) return;
    const report = feedData[index];
    
    let keyboard = [];
    
    if (!report.solved) {
        keyboard.push([{ text: "✅ Hal qilinganligini belgilash", callback_data: `admin_rep_solve_${report.id}` }]);
    } else {
        keyboard.push([{ text: "✅ HAL QILINDI", callback_data: "dummy" }]);
    }
    
    keyboard.push([{ text: `💬 Izohlarni boshqarish (${report.comments ? report.comments.length : 0})`, callback_data: `admin_rep_comments_${report.id}` }]);
    keyboard.push([{ text: "🗑 Bazadan o'chirish", callback_data: `admin_rep_del_${report.id}` }]);
    
    let nav = [];
    if (index > 0) nav.push({ text: "⬅️ Oldingi", callback_data: `admin_rep_view_${index - 1}` });
    nav.push({ text: `${index + 1} / ${feedData.length}`, callback_data: "dummy" });
    if (index < feedData.length - 1) nav.push({ text: "Keyingi ➡️", callback_data: `admin_rep_view_${index + 1}` });
    keyboard.push(nav);
    
    keyboard.push([{ text: "🔙 Orqaga", callback_data: "admin_panel" }]);
    
    let statusText = report.solved ? "✅ <b>HAL QILINDI</b>\n\n" : "";
    let msgText = `📸 <b>Eko-Nazorat Murojaati</b>\n\n${statusText}ID: <code>${report.id}</code>\nSana: ${report.date || ''}\n\nMatn: ${report.caption || 'Yo\'q'}`;
    
    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(() => {});
    }
    bot.sendPhoto(chatId, report.photo, { parse_mode: 'HTML', caption: msgText, reply_markup: { inline_keyboard: keyboard } });
}

function sendAdminBroadcastHistMsg(chatId, index, messageId) {
    if (index < 0 || index >= broadcastsData.length) return;
    const broadcast = broadcastsData[index];
    
    let keyboard = [];
    keyboard.push([{ text: "🗑 Barchadan o'chirish (Recall)", callback_data: `admin_bcast_del_${broadcast.id}` }]);
    
    let nav = [];
    if (index > 0) nav.push({ text: "⬅️ Oldingi", callback_data: `admin_bcast_hist_${index - 1}` });
    nav.push({ text: `${index + 1} / ${broadcastsData.length}`, callback_data: "dummy" });
    if (index < broadcastsData.length - 1) nav.push({ text: "Keyingi ➡️", callback_data: `admin_bcast_hist_${index + 1}` });
    keyboard.push(nav);
    
    keyboard.push([{ text: "🔙 Orqaga", callback_data: "admin_panel" }]);
    
    let msgText = `📜 <b>Tarqatilgan Xabar</b>\n\nSana: ${broadcast.date}\nQamrov: ${broadcast.sent_messages.length} ta foydalanuvchiga yuborilgan\n\nMatn (qisqacha):\n<i>${broadcast.preview}</i>`;
    
    if (messageId) {
        bot.editMessageText(msgText, { chat_id: chatId, message_id: messageId, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }).catch(() => {
            bot.deleteMessage(chatId, messageId).catch(() => {});
            bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
        });
    } else {
        bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
}

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId !== ADMIN_ID) return; // Faqat adminga ruxsat
    
    bot.sendMessage(chatId, "⚙️ <b>Admin Panelga xush kelibsiz!</b>\n\nQuyidagi menyudan kerakli bo'limni tanlang:", { parse_mode: 'HTML', ...adminMenuOptions });
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Eko-Nazorat State Machine Logic
    if (userStates[chatId]) {
        const state = userStates[chatId].step;
        
        if (state === 'awaiting_photos') {
            if (msg.photo) {
                const fileId = msg.photo[msg.photo.length - 1].file_id;
                if (userStates[chatId].photos.length < 6) {
                    userStates[chatId].photos.push(fileId);
                    
                    // Don't send multiple confirmations for media group
                    if (!msg.media_group_id || !userStates[chatId].lastMediaGroup) {
                        userStates[chatId].lastMediaGroup = msg.media_group_id;
                        bot.sendMessage(chatId, "✅ <b>Rasm qabul qilindi.</b> Yana rasm yuborishingiz yoki quyidagi <b>'Davom etish ➡️'</b> tugmasini bosishingiz mumkin.", {
                            parse_mode: 'HTML',
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Davom etish ➡️", callback_data: "report_continue" }]
                                ]
                            }
                        });
                    }
                }
                return;
            } else if (msg.text === 'Bekor qilish') {
                delete userStates[chatId];
                bot.sendMessage(chatId, "Amal bekor qilindi.", { reply_markup: { remove_keyboard: true } });
                return;
            } else if (msg.text && !msg.text.startsWith('/')) {
                bot.sendMessage(chatId, "Iltimos, avval rasmlarni yuboring yoki amalni bekor qiling.");
                return;
            }
        }

        if (state === 'awaiting_public_comment') {
            if (msg.text === '/cancel' || msg.text === 'Bekor qilish') {
                const reportId = userStates[chatId].reportId;
                delete userStates[chatId];
                bot.sendMessage(chatId, "Izoh yozish bekor qilindi.", { reply_markup: { inline_keyboard: [[{ text: "🔙 Orqaga", callback_data: `report_view_${reportId}` }]] } });
                return;
            }
            if (msg.text && !msg.text.startsWith('/')) {
                const reportId = userStates[chatId].reportId;
                const report = feedData.find(r => r.id === reportId);
                if (report) {
                    if (!report.comments) report.comments = [];
                    report.comments.push({
                        id: Date.now().toString(),
                        userId: chatId,
                        name: msg.from.first_name || 'Foydalanuvchi',
                        text: msg.text,
                        date: new Date().toLocaleDateString('uz-UZ')
                    });
                    fs.writeFileSync('./data/feed.json', JSON.stringify(feedData, null, 2));
                    
                    let msgText = `✅ Izohingiz qo'shildi!\n\n💬 <b>Murojaat izohlari:</b>\n\n`;
                    report.comments.forEach((c, i) => {
                        msgText += `<b>${i+1}. ${c.name}:</b> ${c.text}\n`;
                    });
                    let kb = [
                        [{ text: "📝 Izoh yozish", callback_data: `report_add_comment_${reportId}` }],
                        [{ text: "🔙 Orqaga (Rasmga qaytish)", callback_data: `report_view_${reportId}` }]
                    ];
                    bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
                }
                delete userStates[chatId];
                return;
            }
        }

        if (state === 'awaiting_location') {
            if (msg.location) {
                userStates[chatId].location = msg.location;
                userStates[chatId].step = 'awaiting_comment';
                bot.sendMessage(chatId, "📝 <b>Juda yaxshi. Endi muammo haqida qisqacha izoh yozing.</b>\n\n(Nima muammo borligini tushuntiring)", {
                    parse_mode: 'HTML',
                    reply_markup: { remove_keyboard: true }
                });
                return;
            } else if (msg.text === 'Bekor qilish') {
                delete userStates[chatId];
                bot.sendMessage(chatId, "Amal bekor qilindi.", { reply_markup: { remove_keyboard: true } });
                return;
            } else if (msg.text && !msg.text.startsWith('/')) {
                bot.sendMessage(chatId, "Iltimos, pastdagi klaviaturadan foydalanib lokatsiyani yuboring.");
                return;
            }
        }

        if (state === 'awaiting_comment') {
            if (msg.text && !msg.text.startsWith('/')) {
                userStates[chatId].comment = msg.text;
                
                const rep = userStates[chatId];
                const name = msg.from.first_name + (msg.from.username ? ` (@${msg.from.username})` : '');
                const locUrl = `https://www.google.com/maps?q=${rep.location.latitude},${rep.location.longitude}`;
                const caption = `🚨 <b>YANGI EKO-MUAMMO KELIB TUSHDI!</b>\n\n👤 <b>Yuboruvchi:</b> <a href="tg://user?id=${chatId}">${name}</a>\n📍 <b>Manzil:</b> <a href="${locUrl}">Xaritada ko'rish</a>\n📝 <b>Tavsif:</b> ${rep.comment}`;
                
                const mediaGroup = rep.photos.map((photoId, index) => ({
                    type: 'photo',
                    media: photoId,
                    caption: index === 0 ? caption : '',
                    parse_mode: 'HTML'
                }));
                
                bot.sendMediaGroup(ADMIN_ID, mediaGroup).then(() => {
                    const approvalId = 'appr_' + Date.now();
                    approvalsData[approvalId] = {
                        userId: chatId,
                        mediaGroup: mediaGroup
                    };
                    fs.writeFileSync('./data/approvals.json', JSON.stringify(approvalsData, null, 2));
                    
                    bot.sendMessage(ADMIN_ID, `Murojaat-ID: ${approvalId}\nUshbu murojaatni botning "Eko-Lentasi"ga chiqarasizmi?`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "✅ Lentaga chiqarish", callback_data: `approve_${approvalId}` }],
                                [{ text: "❌ Rad etish", callback_data: `reject_${approvalId}` }]
                            ]
                        }
                    });
                    
                    bot.sendMessage(chatId, "🎉 <b>Rahmat!</b> Murojaatingiz Adminga tasdiqlash uchun yuborildi. Tasdiqlangach, botning Eko-Lentasiga joylanadi!", { parse_mode: 'HTML' });
                }).catch(err => {
                    console.log("Error sending report:", err);
                    bot.sendMessage(chatId, "❌ Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.");
                });
                
                delete userStates[chatId];
                return;
            }
        }
    }

    
    // Agar xabar tarqatish yoqilgan bo'lsa va bu admin bo'lsa
    if (chatId === ADMIN_ID && isBroadcasting && !msg.text?.startsWith('/')) {
        isBroadcasting = false;
        bot.sendMessage(chatId, "⏳ Xabar tarqatish boshlandi... Iltimos kuting.");
        
        let successCount = 0;
        let failCount = 0;
        
        let newBroadcast = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('uz-UZ') + ' ' + new Date().toLocaleTimeString('uz-UZ'),
            preview: msg.text ? msg.text.substring(0, 30) + '...' : (msg.caption ? msg.caption.substring(0, 30) + '...' : 'Media xabar'),
            sent_messages: []
        };
        
        usersData.forEach((userObj, index) => {
            const uId = userObj.id || userObj;
            setTimeout(() => {
                bot.copyMessage(uId, chatId, msg.message_id)
                    .then((sentMsg) => { 
                        successCount++; 
                        // message_id returned by copyMessage
                        newBroadcast.sent_messages.push({ chat_id: uId, message_id: sentMsg.message_id });
                    })
                    .catch(() => { failCount++; })
                    .finally(() => {
                        // Oxirgi odamga yuborilganda hisobot berish
                        if (index === usersData.length - 1) {
                            broadcastsData.unshift(newBroadcast);
                            fs.writeFileSync('./data/broadcasts.json', JSON.stringify(broadcastsData, null, 2));
                            bot.sendMessage(chatId, `✅ <b>Xabar tarqatish yakunlandi!</b>\n\nYetib bordi: ${successCount} ta\nYetib bormadi (bloklaganlar): ${failCount} ta`, { parse_mode: 'HTML' });
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
        keyboard.push([{ text: "🏠 Bosh menyu", callback_data: "menu_back" }]);
    } else {
        // O'yin jarayonida orqaga (bosh menyuga) qaytish tugmasi
        keyboard.push([{ text: "⬅️ Orqaga", callback_data: "menu_back" }]);
    }
    
    // Ball qoshish (agar score_delta bo'lsa)
    if (node.score_delta) {
        let userObj = usersData.find(u => u.id === chatId);
        if(userObj) {
            userObj.score = (userObj.score || 0) + node.score_delta;
            fs.writeFileSync('./data/users.json', JSON.stringify(usersData, null, 2));
        }
        
        // Matnga qo'shish
        let sign = node.score_delta > 0 ? '+' : '';
        node.text = `<i>(${sign}${node.score_delta} ball)</i>\n\n` + node.text;
    }
    
    let imagePath = null;
    if (node.image && fs.existsSync(node.image)) {
        imagePath = node.image;
    } else if (fs.existsSync('./data/puzzle_bg.jpg')) {
        imagePath = './data/puzzle_bg.jpg';
    }
    
    let text = `<tg-emoji emoji-id="5330558871129836783">🎭</tg-emoji> <b>Eko-Qahramon Sarguzashti</b> <i>(Jami bazada: ${questData.length} ta vaziyat)</i>:\n<blockquote>${node.story}</blockquote>\n`;
    
    if (imagePath) {
        bot.sendPhoto(chatId, imagePath, { caption: text, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } }).catch(err => {
            bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
        });
    } else {
        bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
}

// Qizil Kitob sahifasini yuborish
function sendRedbookPage(chatId, pageIdx, messageId = null, category = 'animals') {
    let targetData = category === 'plants' 
        ? redbookData.filter(i => i.name.includes("(O'simlik)"))
        : redbookData.filter(i => !i.name.includes("(O'simlik)"));
        
    if (pageIdx < 0 || pageIdx >= targetData.length) return;
    
    const animal = targetData[pageIdx];
    let msg = `<tg-emoji emoji-id="5242628160297641831">📕</tg-emoji> <b>QIZIL KITOB (O'zbekiston)</b> - ${category === 'plants' ? "O'simliklar" : "Hayvonot"} olami\n\n`;
    msg += `<tg-emoji emoji-id="5465540480538254161">🏷️</tg-emoji> <b>Nomi:</b> ${animal.name}\n`;
    msg += `<tg-emoji emoji-id="5370930189322688800">📌</tg-emoji> <b>Holati:</b> ${animal.status}\n\n`;
    
    if (animal.tarqalishi) msg += `<tg-emoji emoji-id="5386541175672953432">🗺️</tg-emoji> <b>Tarqalishi:</b>\n<blockquote>${animal.tarqalishi}</blockquote>\n`;
    if (animal.yashash_joyi) msg += `<tg-emoji emoji-id="5339098060683222770">🏔️</tg-emoji> <b>Yashash joyi:</b>\n<blockquote>${animal.yashash_joyi}</blockquote>\n`;
    if (animal.soni) msg += `<tg-emoji emoji-id="5469891106315446822">📊</tg-emoji> <b>Soni:</b>\n<blockquote>${animal.soni}</blockquote>\n`;
    if (animal.yashash_tarzi) msg += `<tg-emoji emoji-id="5249490306855878586">🐾</tg-emoji> <b>Yashash tarzi:</b>\n<blockquote>${animal.yashash_tarzi}</blockquote>\n`;
    if (animal.cheklovchi_omillar) msg += `<tg-emoji emoji-id="5809782942536306227">⚠️</tg-emoji> <b>Cheklovchi omillar:</b>\n<blockquote>${animal.cheklovchi_omillar}</blockquote>\n`;
    if (animal.kopaytirish) msg += `<tg-emoji emoji-id="5373299568161087824">✅</tg-emoji> <b>Ko'paytirish:</b>\n<blockquote>${animal.kopaytirish}</blockquote>\n`;
    if (animal.muhofaza) msg += `<tg-emoji emoji-id="5810150084930702668">🛡️</tg-emoji> <b>Muhofaza choralari:</b>\n<blockquote>${animal.muhofaza}</blockquote>\n`;
    if (animal.desc) msg += `<tg-emoji emoji-id="5372951800364163934">📝</tg-emoji> <b>Ma'lumot:</b>\n<blockquote>${animal.desc}</blockquote>\n`;
    
    let navRow = [];
    if (pageIdx > 0) navRow.push({ text: "⏪ Oldingi", callback_data: `redbook_page_${pageIdx - 1}_${category}` });
    navRow.push({ text: `📄 ${pageIdx + 1} / ${targetData.length}`, callback_data: "ignore" });
    if (pageIdx < targetData.length - 1) navRow.push({ text: "Keyingi ⏩", callback_data: `redbook_page_${pageIdx + 1}_${category}` });
    
    let keyboard = { inline_keyboard: [ navRow, [{ text: "🏠 Bosh menyu", callback_data: "menu_back" }] ] };
    
    let imagePath = null;
    if (animal.image && fs.existsSync('./data/images/' + animal.image)) {
        imagePath = './data/images/' + animal.image;
    }
    
    if (messageId) {
        if (imagePath) {
            bot.editMessageMedia({
                type: 'photo',
                media: fs.createReadStream(imagePath),
                caption: msg,
                parse_mode: 'HTML'
            }, {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: keyboard
            }).catch(e => {
                bot.deleteMessage(chatId, messageId).catch(() => {});
                bot.sendPhoto(chatId, imagePath, { caption: msg, parse_mode: 'HTML', reply_markup: keyboard });
            });
        } else {
            bot.editMessageText(msg, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: keyboard
            }).catch(e => {
                bot.deleteMessage(chatId, messageId).catch(() => {});
                bot.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard });
            });
        }
    } else {
        if (imagePath) {
            bot.sendPhoto(chatId, imagePath, { caption: msg, parse_mode: 'HTML', reply_markup: keyboard });
        } else {
            bot.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard });
        }
    }
}
