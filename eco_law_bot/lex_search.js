const https = require('https');
const queries = [
  'Tabiatni muhofaza qilish to\'g\'risida',
  'O\'rmon to\'g\'risida',
  'Chiqindilar to\'g\'risida',
  'Hayvonot dunyosini muhofaza qilish va undan foydalanish to\'g\'risida',
  'Atmosfera havosini muhofaza qilish to\'g\'risida',
  'Suv va suvdan foydalanish to\'g\'risida',
  'O\'simlik dunyosini muhofaza qilish va undan foydalanish to\'g\'risida',
  'Ekologik ekspertiza to\'g\'risida',
  'Muhofaza etiladigan tabiiy hududlar to\'g\'risida',
  'Yer kodeksi'
];

async function search(q) {
  return new Promise((resolve) => {
    https.get('https://lex.uz/uz/search/natresults?text=' + encodeURIComponent(q), (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/href="\/uz\/docs\/(\d+)"/);
        resolve(match ? match[1] : null);
      });
    });
  });
}

(async () => {
  for (let q of queries) {
    let id = await search(q);
    console.log(q + ' -> ' + id);
  }
})();
