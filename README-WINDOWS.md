## Generar instalador MSI (Windows) para Ganado AI

Requisitos (el script intentará instalarlos si faltan):
- Microsoft Visual Studio 2022 Build Tools (Desktop development with C++)
- Microsoft Edge WebView2 Runtime
- Node.js LTS (20+)
- Rust (stable)
- Bun (opcional)

### Paso a paso
1. Descarga o clona el repositorio en tu PC con Windows.
2. Abre el explorador de archivos y navega a:
   `scripts/windows/`
3. Haz doble clic en `build_installer.cmd` y acepta la elevación de privilegios.
4. El script instalará dependencias, restaurará paquetes y ejecutará el build:
   - Prisma generate
   - Tauri build
5. Al finalizar, encontrarás el MSI en:
   `src-tauri/target/release/bundle/msi/`

Comparte el archivo `.msi` de esa carpeta para instalar Ganado AI en otros equipos Windows.


