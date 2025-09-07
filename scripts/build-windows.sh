#!/bin/bash
set -e

echo "🏗️  Building Ganado AI for Windows..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Change to project root
cd "$(dirname "$0")/.."

print_status "Current directory: $(pwd)"

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    exit 1
fi

if ! command -v rustc &> /dev/null; then
    print_error "Rust is not installed!"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    print_warning "Bun not found, using npm instead"
    USE_NPM=true
else
    USE_NPM=false
fi

# Check if Windows target is installed
if ! rustup target list --installed | grep -q "x86_64-pc-windows-msvc"; then
    print_status "Installing Windows target for Rust..."
    rustup target add x86_64-pc-windows-msvc
fi

print_success "Prerequisites check complete"

# Install dependencies
print_status "Installing dependencies..."
if [ "$USE_NPM" = true ]; then
    npm ci
else
    bun install
fi

# Generate Prisma client
print_status "Generating Prisma client..."
if [ "$USE_NPM" = true ]; then
    npx prisma generate
else
    bunx prisma generate
fi

# Set environment variables for build
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application
print_status "Building Next.js application..."
if [ "$USE_NPM" = true ]; then
    npm run build:tauri
else
    bun run build:tauri
fi

# Check if Next.js build was successful
if [ ! -d ".next" ]; then
    print_error "Next.js build failed - .next directory not found"
    exit 1
fi

print_success "Next.js build completed"

# Build Tauri app for Windows
print_status "Building Tauri application for Windows..."
if [ "$USE_NPM" = true ]; then
    npx tauri build --target x86_64-pc-windows-msvc
else
    bunx tauri build --target x86_64-pc-windows-msvc
fi

# Check if build was successful
MSI_DIR="src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi"
NSIS_DIR="src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis"

if [ -d "$MSI_DIR" ] && [ "$(ls -A $MSI_DIR)" ]; then
    print_success "Windows MSI installer generated successfully!"
    echo "📦 MSI files:"
    ls -la "$MSI_DIR"/*.msi
elif [ -d "$NSIS_DIR" ] && [ "$(ls -A $NSIS_DIR)" ]; then
    print_success "Windows NSIS installer generated successfully!"
    echo "📦 NSIS files:"
    ls -la "$NSIS_DIR"/*.exe
else
    print_error "Build completed but no installer found in expected locations:"
    echo "  - $MSI_DIR"
    echo "  - $NSIS_DIR"
    
    # Try to find any built executables
    find "src-tauri/target/x86_64-pc-windows-msvc/release" -name "*.exe" -o -name "*.msi" 2>/dev/null | head -10
    exit 1
fi

# Create build info
BUILD_INFO_FILE="build-info.txt"
echo "Ganado AI Windows Build Information" > "$BUILD_INFO_FILE"
echo "====================================" >> "$BUILD_INFO_FILE"
echo "Build Date: $(date)" >> "$BUILD_INFO_FILE"
echo "Built On: $(uname -a)" >> "$BUILD_INFO_FILE"
echo "Node Version: $(node --version)" >> "$BUILD_INFO_FILE"
echo "Rust Version: $(rustc --version)" >> "$BUILD_INFO_FILE"
if [ "$USE_NPM" = false ]; then
    echo "Bun Version: $(bun --version)" >> "$BUILD_INFO_FILE"
fi
echo "Target: x86_64-pc-windows-msvc" >> "$BUILD_INFO_FILE"
echo "" >> "$BUILD_INFO_FILE"
echo "Generated Files:" >> "$BUILD_INFO_FILE"
if [ -d "$MSI_DIR" ] && [ "$(ls -A $MSI_DIR)" ]; then
    ls -la "$MSI_DIR"/*.msi >> "$BUILD_INFO_FILE" 2>/dev/null || true
fi
if [ -d "$NSIS_DIR" ] && [ "$(ls -A $NSIS_DIR)" ]; then
    ls -la "$NSIS_DIR"/*.exe >> "$BUILD_INFO_FILE" 2>/dev/null || true
fi

print_success "Build completed successfully! 🎉"
echo ""
echo "📋 Build summary:"
echo "  - Target: Windows x64 (x86_64-pc-windows-msvc)"
echo "  - Build info: $BUILD_INFO_FILE"
if [ -d "$MSI_DIR" ] && [ "$(ls -A $MSI_DIR)" ]; then
    echo "  - MSI installer: $MSI_DIR/"
fi
if [ -d "$NSIS_DIR" ] && [ "$(ls -A $NSIS_DIR)" ]; then
    echo "  - NSIS installer: $NSIS_DIR/"
fi
echo ""
echo "🚀 The Windows executable is ready for distribution!"