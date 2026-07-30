const https = require('https');
https.get('https://eco-talim.onrender.com/index.html', (res) => {
    console.log(res.statusCode);
}).on('error', (e) => {
    console.log('ERROR:', e.message);
});
