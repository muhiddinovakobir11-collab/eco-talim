const https = require('https');

function check() {
    https.get('https://eco-talim.onrender.com/index.html', (res) => {
        if (res.statusCode === 200) {
            console.log('UP');
            process.exit(0);
        } else {
            setTimeout(check, 5000);
        }
    }).on('error', (e) => {
        setTimeout(check, 5000);
    });
}

check();
