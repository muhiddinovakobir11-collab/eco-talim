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
                if (data.isAdmin) {
                    document.getElementById('adminBadge').style.display = 'inline-block';
                    document.getElementById('adminSubscribers').innerText = data.totalUsers || 0;
                }
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
    if(document.getElementById('reportPage')) document.getElementById('reportPage').style.display = 'none';
    if(document.getElementById('feedPage')) document.getElementById('feedPage').style.display = 'none';
    
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
    const btn = document.getElementById('repSubmitBtn');
    const originalBtnHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yuborilmoqda...';

    const name = document.getElementById('repName').value;
    const loc = document.getElementById('repLoc').value;
    const desc = document.getElementById('repDesc').value;
    const fileInput = document.getElementById('repImage');
    
    if (fileInput.files && fileInput.files[0]) {
        resizeImage(fileInput.files[0], 800, function(base64Img) {
            let userId = 0;
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                userId = tg.initDataUnsafe.user.id;
            }
            
            fetch('/api/submit_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    name: name,
                    location: loc,
                    description: desc,
                    image: base64Img
                })
            })
            .then(res => res.json())
            .then(data => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Yuborildi!';
                if (tg.showAlert) tg.showAlert("Murojaatingiz qabul qilindi. Rahmat!");
                else alert("Murojaatingiz qabul qilindi. Rahmat!");
                document.getElementById('reportForm').reset();
                setTimeout(() => {
                    btn.innerHTML = originalBtnHTML;
                    switchPage('home');
                }, 2000);
            })
            .catch(err => {
                btn.disabled = false;
                btn.innerHTML = originalBtnHTML;
                if (tg.showAlert) tg.showAlert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
                else alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
            });
        });
    } else {
        btn.disabled = false;
        btn.innerHTML = originalBtnHTML;
        if (tg.showAlert) tg.showAlert("Iltimos, rasm yuklang!");
        else alert("Iltimos, rasm yuklang!");
    }
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
    if (sectionId === 'report' || sectionId === 'feed') {
        // Local navigation
        document.getElementById('homePage').style.display = 'none';
        if(document.getElementById('reportPage')) document.getElementById('reportPage').style.display = 'none';
        if(document.getElementById('feedPage')) document.getElementById('feedPage').style.display = 'none';
        
        document.getElementById(sectionId + 'Page').style.display = 'block';
        
        if (sectionId === 'feed') {
            loadFeed();
        }
        return;
    }

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

function loadFeed() {
    const container = document.getElementById('feedContainer');
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Yuklanmoqda...</p>';
    
    fetch('/api/reports')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Hozircha hech qanday hisobot yo\\'q.</p>';
                return;
            }
            
            container.innerHTML = '';
            // Reverse to show newest first
            data.reverse().forEach(report => {
                const card = document.createElement('div');
                card.className = 'glass-card';
                card.style.marginBottom = '20px';
                card.style.padding = '15px';
                
                const header = document.createElement('div');
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                header.style.marginBottom = '10px';
                header.innerHTML = `<strong style="color: #00d2ff;"><i class="fa-solid fa-user"></i> ${report.name || 'Foydalanuvchi'}</strong> <span style="font-size: 0.8rem; color: var(--text-secondary);">${report.time}</span>`;
                
                const loc = document.createElement('div');
                loc.style.fontSize = '0.85rem';
                loc.style.color = '#ff6b81';
                loc.style.marginBottom = '10px';
                loc.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${report.loc}`;
                
                const img = document.createElement('img');
                img.src = report.image;
                img.style.width = '100%';
                img.style.borderRadius = '10px';
                img.style.marginBottom = '10px';
                img.style.objectFit = 'cover';
                
                const desc = document.createElement('p');
                desc.style.fontSize = '0.9rem';
                desc.style.lineHeight = '1.4';
                desc.innerText = report.desc;
                
                card.appendChild(header);
                card.appendChild(loc);
                card.appendChild(img);
                card.appendChild(desc);
                container.appendChild(card);
            });
        }).catch(() => {
            container.innerHTML = '<p style="text-align: center; color: #ff4757;">Xatolik yuz berdi!</p>';
        });
}


function resizeImage(file, maxWidth, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function getLocation() {
    if (navigator.geolocation) {
        tg.HapticFeedback.impactOccurred('medium');
        document.getElementById('repLoc').value = "Joylashuv aniqlanmoqda...";
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('repLoc').value = `https://maps.google.com/?q=${lat},${lon}`;
                tg.HapticFeedback.notificationOccurred('success');
            },
            function(error) {
                alert("Joylashuvni aniqlab bo'lmadi. Iltimos, manzilni qo'lda yozing.");
                document.getElementById('repLoc').value = "";
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Sizning qurilmangiz joylashuvni aniqlashni qo'llab-quvvatlamaydi.");
    }
}
