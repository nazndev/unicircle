# Secret Management for Mobile App

## ⚠️ CRITICAL: Secret Exposure Incident

**Date:** 2025-11-12  
**Issue:** Mobile API key was committed to git in `app.json`  
**Action Taken:** Removed hardcoded secret, moved to environment variables

## Current Status

✅ **Fixed:** Secret removed from `app.json`  
✅ **Fixed:** Using `app.config.js` for environment variables  
✅ **Fixed:** Added `.env.example` template  
⚠️ **Action Required:** Rotate the exposed API key on backend

## Setup Instructions

### 1. Create Environment File

```bash
cd mobile
cp .env.example .env
```

### 2. Add Your Secrets

Edit `mobile/.env`:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api
EXPO_PUBLIC_MOBILE_API_KEY=your_new_api_key_here
```

### 3. Generate New API Key

**IMPORTANT:** Since the old key was exposed, generate a new one:

1. Go to backend admin panel
2. Generate a new mobile API key
3. Update backend configuration
4. Update `mobile/.env` with the new key

### 4. Build with Environment Variables

The `app.config.js` file reads from environment variables:

```bash
# Development
expo start

# Production build (EAS)
eas build --profile production
```

EAS will automatically use environment variables from your EAS secrets.

## Security Best Practices

### ✅ DO:
- Use `app.config.js` instead of `app.json` for secrets
- Store secrets in `.env` file (gitignored)
- Use EAS secrets for production builds
- Rotate keys if exposed
- Use request signing for additional security

### ❌ DON'T:
- Commit secrets to git
- Hardcode API keys in source code
- Store secrets in `app.json`
- Share `.env` files
- Use the same key for dev and production

## EAS Build Configuration

For production builds, configure secrets in EAS:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_MOBILE_API_KEY --value your_key_here
```

## Request Signing (Recommended)

For production, enable request signing which requires:
- API Key (can be in app bundle - it's public)
- API Secret (NEVER in app bundle - use proxy server)

See `SECURITY_NOTES.md` for details.

