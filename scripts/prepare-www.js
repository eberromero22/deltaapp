// Copia solo los archivos web de la app a /www (carpeta que empaqueta Capacitor).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const files = ['index.html', 'styles.css', 'core.js', 'report.js', 'app.js', 'manifest.webmanifest', 'sw.js', 'icons'];
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
files.forEach((f) => fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true }));
console.log('www/ listo (' + files.length + ' elementos)');
