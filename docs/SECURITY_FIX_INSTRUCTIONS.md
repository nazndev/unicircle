# Security Fix: API Key Rotation

## ⚠️ CRITICAL: Secret Exposure Incident

**Date:** 2025-11-12  
**Exposed Key:** `b55371dcdf9faf4235f83cfe385ad47c`  
**Status:** ✅ Removed from code, ⚠️ Still in git history

## ✅ What Was Fixed

1. Removed hardcoded API key from `mobile/app.json`
2. Created `mobile/app.config.js` for environment variables
3. Created `mobile/.env` file (gitignored)
4. Generated new secure API key: `e7593d1c9174435273587b2669add558`

## 🔧 Required Actions

### 1. Update Backend Environment

Add/update in `backend/.env.local` or `backend/.env`:

```env
# Mobile API Key (must match mobile app)
MOBILE_API_KEY=e7593d1c9174435273587b2669add558

# Mobile API Secret (for request signing - optional)
MOBILE_API_SECRET=your_secret_here

# Enable request signing (optional, default: false)
MOBILE_ENABLE_REQUEST_SIGNING=false
```

### 2. Verify Mobile App Configuration

The `mobile/.env` file is already configured with:
```env
EXPO_PUBLIC_MOBILE_API_KEY=e7593d1c9174435273587b2669add558
```

### 3. Restart Services

```bash
# Backend
cd backend
npm run start:dev

# Mobile (if running)
cd mobile
expo start --clear
```

## 🔒 Security Notes

1. **The old key is still in git history** - Consider:
   - Making repository private (if public)
   - Using `git-secrets` to prevent future commits
   - Rotating keys periodically

2. **For Production:**
   - Enable request signing (`MOBILE_ENABLE_REQUEST_SIGNING=true`)
   - Use EAS secrets for mobile builds
   - Never commit `.env` files

3. **Key Matching:**
   - `backend/.env`: `MOBILE_API_KEY=...`
   - `mobile/.env`: `EXPO_PUBLIC_MOBILE_API_KEY=...`
   - **These must match!**

## ✅ Verification

After updating both files, test the mobile app:
1. Start backend server
2. Start mobile app
3. Try a public endpoint (e.g., `/settings/account-types`)
4. Should work without errors

## 📝 Files Changed

- ✅ `mobile/app.json` - Removed hardcoded key
- ✅ `mobile/app.config.js` - New file for env vars
- ✅ `mobile/.env` - Local config (gitignored)
- ✅ `mobile/.env.example` - Template
- ✅ `mobile/src/api/client.ts` - Updated to use env vars
- ⚠️ `backend/.env.local` - **YOU NEED TO UPDATE THIS**

