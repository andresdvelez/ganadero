# 🚀 Ganado AI - Complete Setup Guide

## 📋 Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **Bun**: v1.0.0 or higher
- **RAM**: Minimum 4GB (8GB recommended for AI models)
- **Storage**: 10GB free space (for AI models and offline data)
- **OS**: macOS, Linux, or Windows 10+

### Supported Browsers

- Chrome 90+ (recommended)
- Safari 14+
- Firefox 88+
- Edge 90+

---

## 🔧 Step-by-Step Setup

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd ganado-ai-app

# Install dependencies with Bun
bun install

# Alternative: Use npm
npm install
```

### Step 2: Database Setup

#### Local Development (SQLite)

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npx prisma db seed
```

#### Production (PostgreSQL)

1. Create a PostgreSQL database on [Neon.tech](https://neon.tech) or your preferred provider
2. Get your connection string (format: `postgresql://user:password@host:5432/database`)

---

## 🔑 API Keys & External Services Configuration

### 1. Clerk Authentication (REQUIRED)

**Purpose**: User authentication and management

1. Go to [clerk.com](https://clerk.com)
2. Create a new application
3. Select "Next.js" as your framework
4. Get your keys from Dashboard → API Keys

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
```

**Configuration in Clerk Dashboard:**

- Allowed origins: `http://localhost:3000`, `https://yourdomain.com`
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in URL: `/`
- After sign-up URL: `/`

### 2. Ollama for Local AI (REQUIRED for AI features)

**Purpose**: Local AI inference with DeepSeek R1

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# For macOS
brew install ollama

# Start Ollama service
ollama serve

# Download DeepSeek R1 model (or alternative)
ollama pull deepseek-r1:latest

# Alternative lighter models
ollama pull llama3.2:3b
ollama pull gemma2:2b
```

```env
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. OpenAI API (OPTIONAL - Cloud AI fallback)

**Purpose**: Fallback when local AI is unavailable

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key in Settings → API Keys

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

### 4. Database Providers

#### Neon.tech (PostgreSQL) - REQUIRED for production

1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

#### Local SQLite (Development)

```env
DATABASE_URL="file:./dev.db"
```

### 5. Cloud Storage (OPTIONAL - for media sync)

#### AWS S3 / Cloudflare R2

```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
S3_BUCKET=ganado-media
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # For R2
```

### 6. Email Service (OPTIONAL)

**Purpose**: Notifications and alerts

#### Resend

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

#### SendGrid

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

### 7. Push Notifications (OPTIONAL)

#### OneSignal

```env
ONESIGNAL_APP_ID=xxxxx-xxxx-xxxx
ONESIGNAL_REST_API_KEY=xxxxxxxxxxxxx
```

---

## 📝 Complete .env.local File

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"  # Development
# DATABASE_URL="postgresql://user:pass@host:5432/ganado_ai"  # Production

# Clerk Authentication (REQUIRED)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# AI Configuration
NEXT_PUBLIC_OLLAMA_HOST=http://localhost:11434
OPENAI_API_KEY=sk-xxxxxxxxxxxxx  # Optional fallback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional Services
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
S3_BUCKET=
RESEND_API_KEY=
```

---

## 🚀 Running the Application

### Development Mode

```bash
# Start development server
bun dev
# or
npm run dev

# Access at http://localhost:3000
```

### Production Build

```bash
# Build for production
bun run build

# Start production server
bun start
```

### Testing

```bash
# Run all tests
bun test

# Run specific test suite
bun test integration

# Run E2E tests
bunx playwright test
```

---

## 📱 PWA Installation

### Desktop (Chrome/Edge)

1. Open the app in browser
2. Click install icon in address bar (⊕)
3. Confirm installation

### Mobile (Android)

1. Open in Chrome
2. Tap menu (⋮) → "Add to Home screen"
3. Confirm installation

### iOS

1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. Confirm installation

---

## 🔒 Security Configuration

### 1. Enable Encryption at Rest

```javascript
// In your app initialization
import { getEncryptionKey } from "@/services/encryption/crypto";

// Set encryption key on login
const key = await generateKeyFromUserAuth();
sessionStorage.setItem("_session_key", key);
```

### 2. Configure CORS (Production)

```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "https://yourdomain.com",
          },
        ],
      },
    ];
  },
};
```

### 3. Environment Variables Security

- Never commit `.env.local` to git
- Use different keys for development/production
- Rotate API keys regularly

---

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --only=production
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Self-Hosted

1. Set up reverse proxy (Nginx/Apache)
2. Configure SSL with Let's Encrypt
3. Set up process manager (PM2)
4. Configure PostgreSQL database

---

## 🧪 Testing Your Setup

### 1. Verify Database Connection

```bash
npx prisma studio
# Should open Prisma Studio at http://localhost:5555
```

### 2. Test Clerk Authentication

1. Navigate to `/sign-up`
2. Create test account
3. Should redirect to dashboard

### 3. Test AI Integration

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Should return list of installed models
```

### 4. Test Offline Functionality

1. Open DevTools → Network → Offline
2. Navigate through app
3. Should work without internet

### 5. Test PWA Installation

1. Check for install prompt
2. Install app
3. Launch from desktop/home screen

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Clerk Authentication Errors

```
Error: Missing publishable key
```

**Solution**: Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set

#### 2. Database Connection Failed

```
Error: Can't reach database server
```

**Solution**: Check DATABASE_URL and database service status

#### 3. AI Not Responding

```
Error: Failed to connect to Ollama
```

**Solution**:

```bash
# Start Ollama service
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

#### 4. PWA Not Installing

**Solution**:

- Ensure HTTPS in production
- Check manifest.json is accessible
- Verify service worker registration

#### 5. Sync Not Working

**Solution**:

- Check network connectivity
- Verify API endpoints
- Check browser IndexedDB storage

---

## 📊 Performance Optimization

### 1. Enable Compression

```bash
bun add compression
```

### 2. Optimize Images

```javascript
// Use Next.js Image component
import Image from "next/image";
```

### 3. Enable Caching

```javascript
// In API routes
res.setHeader("Cache-Control", "s-maxage=3600");
```

### 4. Database Indexes

```sql
-- Add indexes for common queries
CREATE INDEX idx_animals_userid ON animals(userId);
CREATE INDEX idx_animals_status ON animals(status);
```

---

## 📞 Support & Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Ollama Docs](https://ollama.com/docs)

### Community

- GitHub Issues: Report bugs
- Discord: Join community chat
- Email: support@ganado-ai.com

### Monitoring (Production)

- [Vercel Analytics](https://vercel.com/analytics)
- [Sentry](https://sentry.io) for error tracking
- [LogRocket](https://logrocket.com) for session replay

---

## ✅ Setup Checklist

- [ ] Node.js/Bun installed
- [ ] Dependencies installed (`bun install`)
- [ ] Database configured (SQLite/PostgreSQL)
- [ ] Prisma migrations run
- [ ] Clerk account created and keys added
- [ ] Ollama installed and model downloaded
- [ ] Environment variables configured
- [ ] Development server running
- [ ] Authentication working
- [ ] AI assistant responding
- [ ] Offline mode tested
- [ ] PWA installation tested
- [ ] All tests passing

---

## 🎉 Ready to Go!

Once all items are checked, your Ganado AI platform is fully configured and ready for use!

### Quick Start Commands

```bash
# Development
bun dev

# Testing
bun test

# Production build
bun run build && bun start
```

**Access your app at:** http://localhost:3000

---

_Last Updated: Current Session_
_Version: 1.0.0_
