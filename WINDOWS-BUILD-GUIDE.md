# Windows Build Guide for Ganado AI

This document provides comprehensive instructions for building Ganado AI as a Windows executable using Tauri.

## Overview

Ganado AI is a Next.js application packaged as a desktop app using Tauri. The build process creates a native Windows executable (.exe) and installer (.msi).

## Prerequisites

### Required Tools

1. **Node.js 20+**: Required for Next.js build process
2. **Rust**: Required for Tauri native application wrapper
3. **Bun** (recommended) or **npm**: Package manager
4. **Windows Build Tools**: Required for Windows-specific compilation

### For Windows Development (Direct Build)

On Windows, use the provided `scripts/windows/build_installer.cmd` which automatically installs:

- Microsoft Edge WebView2 Runtime
- Microsoft Visual Studio 2022 Build Tools (C++ desktop workload)
- Node.js LTS
- Rust (rustup)
- Bun package manager

### For Cross-Platform Development (Linux/macOS → Windows)

For cross-compilation from Linux to Windows, additional tools are needed:

- MinGW-w64 cross-compiler: `gcc-mingw-w64-x86-64`
- Proper Rust Windows target: `x86_64-pc-windows-msvc`

## Build Process

### Step 1: Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm ci
```

### Step 2: Generate Prisma Client

```bash
# Using Bun
bunx prisma generate

# Or using npm
npx prisma generate
```

### Step 3: Build Next.js Application

```bash
# Set environment variables
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build the Next.js app in standalone mode
bun run build:tauri
# Or: npm run build:tauri
```

This creates:
- `.next/standalone/`: Standalone Next.js server
- `.next/static/`: Static assets
- `src-tauri/.next/`: Assets copied for Tauri bundling

### Step 4: Build Tauri Application

#### On Windows (Direct)
```cmd
# Run the automated build script
scripts\windows\build_installer.cmd
```

#### Cross-Platform (Linux/macOS)
```bash
# Install Windows Rust target
rustup target add x86_64-pc-windows-msvc

# Build for Windows target
bunx tauri build --target x86_64-pc-windows-msvc
# Or: npx tauri build --target x86_64-pc-windows-msvc
```

## Configuration Files

### Tauri Configuration (`src-tauri/tauri.conf.json`)

Key configuration settings:

```json
{
  "package": {
    "productName": "Ganado AI",
    "version": "0.1.1"
  },
  "build": {
    "beforeBuildCommand": "bash ./scripts/tauri-build.sh",
    "distDir": "dist"
  },
  "bundle": {
    "identifier": "ai.ganado.app",
    "targets": "all",
    "windows": {
      "certificateThumbprint": "${WINDOWS_CERTIFICATE_THUMBPRINT}",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### Next.js Configuration (`next.config.mjs`)

Important settings for Tauri builds:

```javascript
const nextConfig = {
  output: "standalone",           // Creates standalone server
  eslint: {
    ignoreDuringBuilds: true     // Skip ESLint for production builds
  },
  images: {
    unoptimized: true           // Required for Tauri
  }
};
```

## Build Outputs

### Successful Build Creates:

1. **MSI Installer**: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi`
2. **NSIS Installer**: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe` (if configured)
3. **Executable**: `src-tauri/target/x86_64-pc-windows-msvc/release/ganado-ai-app.exe`

### File Structure:
```
src-tauri/target/x86_64-pc-windows-msvc/release/
├── bundle/
│   ├── msi/
│   │   └── Ganado AI_0.1.1_x64_en-US.msi
│   └── nsis/
│       └── Ganado AI_0.1.1_x64-setup.exe
└── ganado-ai-app.exe
```

## Troubleshooting

### Common Issues

1. **ESLint Build Failures**
   - Solution: Set `eslint.ignoreDuringBuilds: true` in `next.config.mjs`

2. **TypeScript Errors with Next.js 15**
   - Solution: Update dynamic route pages to use async params:
   ```typescript
   interface PageProps {
     params: Promise<{ id: string }>;
   }
   
   export default async function Page({ params }: PageProps) {
     const { id } = await params;
     // ...
   }
   ```

3. **Cross-Compilation Issues (Linux → Windows)**
   - Install MinGW-w64: `sudo apt install gcc-mingw-w64-x86-64`
   - Configure Rust linker in `.cargo/config.toml`:
   ```toml
   [target.x86_64-pc-windows-msvc]
   linker = "x86_64-w64-mingw32-gcc"
   ```

4. **WebView2 Runtime Missing**
   - Automatically handled by `build_installer.cmd`
   - Manual install: https://go.microsoft.com/fwlink/p/?LinkId=2124703

5. **Node Version Issues**
   - Ensure Node.js 20+ is installed
   - Use nvm to manage versions if needed

## Build Scripts

### Automated Windows Build (`scripts/windows/build_installer.cmd`)

Features:
- Automatic prerequisite installation
- Administrator privilege elevation
- Comprehensive error handling
- Build artifact verification

### Cross-Platform Build (`scripts/build-windows.sh`)

Features:
- Linux/macOS compatibility
- Dependency checking
- Colored output
- Build information generation

## Code Signing (Optional)

For production releases, configure code signing:

1. Set environment variable: `WINDOWS_CERTIFICATE_THUMBPRINT`
2. Configure in `tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "${WINDOWS_CERTIFICATE_THUMBPRINT}",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

## Distribution

### System Requirements
- Windows 10/11 (x64)
- Microsoft Edge WebView2 Runtime
- .NET Framework (if required by dependencies)

### Installation Methods
1. **MSI Installer**: Standard Windows installer package
2. **NSIS Installer**: Custom installer with more control
3. **Portable Executable**: Direct .exe execution (requires manual WebView2 setup)

## Development Workflow

### Quick Development Build
```bash
# Start development server
bun run dev

# Build and test locally
bun run build:tauri
bunx tauri dev
```

### Production Release Build
```bash
# On Windows
scripts\windows\build_installer.cmd

# Cross-platform
./scripts/build-windows.sh
```

## Environment Variables

### Required for Build
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `TAURI=1` (set automatically by scripts)

### Optional Configuration
- `WINDOWS_CERTIFICATE_THUMBPRINT`: For code signing
- `PUBLIC_APP_URL`: Remote app URL fallback
- `PREFER_REMOTE`: Prefer remote over local server

## Build Performance Tips

1. **Use Bun**: Faster package installation and builds
2. **Parallel Builds**: Leverage multi-core systems
3. **Cache Dependencies**: Reuse downloaded crates and node_modules
4. **Skip Linting**: Use `eslint.ignoreDuringBuilds` for faster builds
5. **Optimize Images**: Use `unoptimized: true` for Tauri

## Version Management

Update versions in:
1. `package.json`: `"version": "0.1.1"`
2. `src-tauri/tauri.conf.json`: `"version": "0.1.1"`
3. `src-tauri/Cargo.toml`: `version = "0.1.1"`

## Security Considerations

1. **Code Signing**: Always sign production releases
2. **Update Verification**: Use Tauri updater with signature verification
3. **CSP Configuration**: Properly configure Content Security Policy
4. **API Security**: Secure all API endpoints

## Support and Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Rust Cross-compilation Guide](https://rust-lang.github.io/rustup/cross-compilation.html)
- [Project Repository Issues](https://github.com/your-repo/issues)

---

*Last updated: $(date)*
*Build system: Tauri v1.x + Next.js 15.x*