# Delta Móvil · Reporte de turno

App móvil (PWA instalable, funciona sin conexión) para generar el reporte de turno de un Delta Móvil y enviarlo por WhatsApp.

## Qué incluye
- Chofer de turno, kilometraje inicial/final (recorrido automático), recargas de combustible.
- Panel de actividades configurable: se marcan con un toque y se agregan nuevas al momento.
- Incidencias del vehículo con gravedad y detalle, también configurables.
- Historial: editar, reenviar y borrar reportes. Respaldo (exportar/importar JSON).
- Ahorro de pasos: km inicial y chofer se autocompletan desde el último reporte, el borrador se guarda solo y WhatsApp se abre con el mensaje listo.

## Publicar en GitHub Pages
1. Sube todo el contenido de esta carpeta a la raíz del repositorio.
2. En *Settings → Pages*, elige la rama `main` y la carpeta `/ (root)`.
3. Abre la URL en el teléfono y usa *Agregar a pantalla de inicio*.

## Pruebas
```
node tests/core.test.js     # lógica (18 pruebas)
python3 tests/e2e.py        # flujo completo en navegador (requiere playwright)
```
Los datos se guardan solo en el dispositivo (localStorage). Usa Exportar historial para respaldarlos.

## Generar el APK (Android)
La app se empaqueta con [Capacitor](https://capacitorjs.com). En el APK, PNG y PDF se comparten con el menú nativo de Android (WhatsApp, Archivos, etc.).

**Opción 1 · En GitHub (recomendada, no instalas nada)**
1. Sube el proyecto al repositorio (rama `main`). El workflow `.github/workflows/build-apk.yml` corre solo; también puedes lanzarlo en *Actions → Generar APK → Run workflow*.
2. Al terminar, descarga `DeltaMovil-APK` desde *Artifacts*.
3. Para publicar una versión: crea una etiqueta (`git tag v1.0.0 && git push --tags`) y el APK queda adjunto en *Releases*.

**Opción 2 · En tu PC**
Requisitos: Node 20+, JDK 17 y Android SDK (`ANDROID_HOME`).
```
npm install
npm run build:apk
```
Resultado: `android/app/build/outputs/apk/debug/app-debug.apk`.

Instalación: copia el APK al teléfono y permite *instalar apps de origen desconocido*. Es un APK de depuración, firmado con la clave debug de Android: sirve para instalar y usar. Para Play Store hay que generar un build *release* con tu propia clave.
