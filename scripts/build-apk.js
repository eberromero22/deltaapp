// Genera el APK de depuración: node scripts/build-apk.js  (o: npm run build:apk)
const { execSync } = require('child_process'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), win = process.platform === 'win32';
const run = (cmd, cwd) => { console.log('\n> ' + cmd); execSync(cmd, { cwd: cwd || root, stdio: 'inherit' }); };
try { execSync('java -version', { stdio: 'ignore' }); } catch (e) { console.error('Falta Java JDK 17. Instálalo y vuelve a intentar.'); process.exit(1); }
if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) { console.error('Falta ANDROID_HOME (Android SDK). Instala Android Studio o las command-line tools.'); process.exit(1); }
if (!fs.existsSync(path.join(root, 'node_modules'))) run('npm install');
run('node scripts/prepare-www.js');
if (!fs.existsSync(path.join(root, 'android'))) run('npx cap add android');
run('npx cap sync android');
run(win ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug', path.join(root, 'android'));
const apk = path.join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
console.log('\nAPK listo: ' + apk);
