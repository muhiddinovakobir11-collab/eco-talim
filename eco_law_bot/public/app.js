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
        document.getElementById('userName').innerText = user.first_name;
        
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

// Handle section clicks
function openSection(sectionId) {
    // We can either open a new HTML page, or send data back to the bot
    // For now, let's send data back to the bot to trigger a message in chat
    // closing the WebApp automatically.
    
    // Send data back to the bot
    let command = `menu_${sectionId}`; // e.g. menu_quiz, menu_redbook
    
    // Some visual feedback
    tg.HapticFeedback.impactOccurred('light');
    
    // Use sendData (only works if WebApp was opened via Keyboard button)
    // For Inline/Menu buttons, we need to use a custom backend API or Deep Links.
    // Let's send a request to our backend
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
