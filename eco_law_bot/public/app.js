const tg = window.Telegram.WebApp;

// Expand Web App to full screen
tg.expand();

// Set WebApp Header color
tg.setHeaderColor('#0f172a');
tg.setBackgroundColor('#0f172a');

document.addEventListener("DOMContentLoaded", () => {
    // Populate user info if available from Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        let displayName = user.first_name;
        document.getElementById('userName').innerText = displayName;
        
        let avatarEl = document.getElementById('userAvatar');
        if (avatarEl) {
            if (user.photo_url) {
                avatarEl.src = user.photo_url;
            } else {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName.replace('@', ''))}&background=0D8ABC&color=fff`;
            }
        }
        
        // Load initial data from backend if needed
        // For now, we will simulate loading data
        loadUserData(user.id);
    } else {
        // Fallback for testing in browser
        document.getElementById('userName').innerText = "Test Foydalanuvchi";
    }

    // Ready signal to Telegram
    tg.ready();
});

function loadUserData(userId) {
    // Fetch stats from bot server
    fetch(`/api/user/${userId}`)
        .then(res => res.json())
        .then(data => {
            if(data) {
                document.getElementById('userScore').innerText = data.score || 0;
                // Calculate solved count based on data arrays
                let solved = 0;
                ['quizzes', 'puzzles', 'terms', 'penalties', 'truefalse'].forEach(type => {
                    if(data[type]) solved += data[type].length;
                });
                
                document.getElementById('solvedCount').innerText = solved;
                
                // Update progress bar
                let total = parseInt(document.getElementById('totalCount').innerText) || 1220;
                let percent = Math.min((solved / total) * 100, 100);
                document.querySelector('.progress-bar').style.width = percent + '%';
            }
        })
        .catch(err => console.error("Error loading user data:", err));
}

function switchPage(page) {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('leaderboardPage').style.display = 'none';
    document.getElementById('reportPage').style.display = 'none';
    
    document.getElementById('nav-home').classList.remove('active');
    document.getElementById('nav-leaderboard').classList.remove('active');
    
    if (page === 'home') {
        document.getElementById('homePage').style.display = 'block';
        document.getElementById('nav-home').classList.add('active');
    } else if (page === 'leaderboard') {
        document.getElementById('leaderboardPage').style.display = 'block';
        document.getElementById('nav-leaderboard').classList.add('active');
        loadLeaderboard();
    } else if (page === 'report') {
        document.getElementById('reportPage').style.display = 'block';
        // Auto-fill name if available
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            document.getElementById('repName').value = tg.initDataUnsafe.user.first_name + (tg.initDataUnsafe.user.last_name ? ' ' + tg.initDataUnsafe.user.last_name : '');
        }
    }
}

function submitReport(e) {
    e.preventDefault();
    const name = document.getElementById('repName').value;
    const loc = document.getElementById('repLoc').value;
    const desc = document.getElementById('repDesc').value;
    
    tg.sendData(JSON.stringify({
        action: 'submit_report',
        name: name,
        location: loc,
        description: desc
    }));
}


function loadLeaderboard() {
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(data => {
            let html = '';
            data.forEach((user, index) => {
                let medal = '';
                if(index === 0) medal = '🥇';
                else if(index === 1) medal = '🥈';
                else if(index === 2) medal = '🥉';
                else medal = `<span style="color: var(--text-secondary); width: 20px; display: inline-block;">${index+1}</span>`;
                
                let isMe = (tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id === user.id);
                let bgStyle = isMe ? 'background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3);' : '';
                
                html += `
                <div class="glass-card list-item" style="padding: 12px 16px; ${bgStyle}">
                    <div style="font-size: 1.2rem; margin-right: 10px;">${medal}</div>
                    <div class="list-text">
                        <h3 style="font-size: 1rem;">${user.first_name} ${isMe ? '(Siz)' : ''}</h3>
                    </div>
                    <div style="font-weight: bold; color: var(--accent-orange);">${user.score} ball</div>
                </div>`;
            });
            document.getElementById('leaderboardList').innerHTML = html;
        })
        .catch(err => {
            document.getElementById('leaderboardList').innerHTML = '<div style="text-align: center; color: var(--accent-red);">Xatolik yuz berdi</div>';
        });
}

// Handle section clicks
function openSection(sectionId) {
    // Send data back to the bot
    let command = `menu_${sectionId}`; // e.g. menu_quizzes, menu_redbook
    
    // Some visual feedback
    tg.HapticFeedback.impactOccurred('light');
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: tg.initDataUnsafe.user.id,
                action: command
            })
        }).then(() => {
            tg.close();
        }).catch(() => {
            tg.sendData(command); 
        });
    } else {
        console.log("Triggered section:", sectionId);
    }
}



// --- Online Count Logic ---
function updateOnlineCount() {
    let uid = 'unknown-' + Math.random();
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        uid = window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    fetch('/api/ping?userId=' + uid)
        .then(r => r.json())
        .then(data => {
            const el = document.getElementById('onlineCount');
            if (el) el.innerText = data.online;
            setTimeout(updateOnlineCount, 10000);
        })
        .catch(e => {
            console.error(e);
            setTimeout(updateOnlineCount, 10000);
        });
}
updateOnlineCount();

