const fs = require('fs');
let app = fs.readFileSync('eco_law_bot/public/app.js', 'utf8');

const oldFunc = `// Handle section clicks
function openSection(sectionId) {
    // Send data back to the bot
    let command = \`menu_\${sectionId}\`; // e.g. menu_quizzes, menu_redbook
    
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
}`;

const newFunc = `// Handle section clicks
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
    let command = \`menu_\${sectionId}\`; // e.g. menu_quizzes, menu_redbook
    
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
}`;

if (app.includes(oldFunc)) {
    app = app.replace(oldFunc, newFunc);
    fs.writeFileSync('eco_law_bot/public/app.js', app);
    console.log("Successfully patched app.js");
} else {
    console.log("Could not find openSection to patch!");
}
