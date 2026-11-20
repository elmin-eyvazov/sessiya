// Копирует собранный сайт (index.html, data/, icons/ …) в native/www — приложение работает и без интернета для встроенных банков.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'og.png', 'data', 'icons'])
  fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log('www готов:', out);
