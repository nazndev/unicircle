# Mobile API Security - Important Notes

## ⚠️ Security Limitation: API Key Extraction

**Yes, the API key CAN be extracted from APK/IPA files.** This is a fundamental limitation of client-side security.

### Can Someone Bypass the API Key?

**Short Answer:** Yes, if they extract it from the app bundle.

**However:**
1. **It requires reverse engineering** - Not trivial for casual users
2. **Request signing makes it much harder** - Even with the key, they need the secret to generate valid signatures
3. **Rate limiting still applies** - Even with the key, abuse is limited
4. **JWT tokens are the real security** - Authenticated endpoints require user login
5. **Monitoring can detect abuse** - Unusual patterns can be flagged and blocked

### Why This Happens

1. **APK/IPA files are decompilable**: Android APKs and iOS IPAs can be reverse-engineered
2. **JavaScript is readable**: React Native/Expo apps bundle JavaScript that can be extracted
3. **Config values are visible**: Values in `app.json` or environment variables are embedded in the bundle

### Current Protection Level

**Basic API Key Only (Current Implementation):**
- ✅ Prevents casual scraping/bot access
- ✅ Requires knowledge of the API key
- ❌ Can be bypassed if someone extracts the key from the app
- ❌ Anyone with the key can make unlimited requests

**With Request Signing (Recommended for Production):**
- ✅ API key alone is not enough
- ✅ Requires API secret (NOT in app bundle) to generate valid signatures
- ✅ Each request needs a valid HMAC-SHA256 signature
- ✅ Timestamp validation prevents replay attacks
- ⚠️ Still vulnerable if both key AND secret extraction method is found

## 🛡️ Recommended Security Measures

### 1. Enable Request Signing (CRITICAL for Production)

**Backend Configuration:**
```env
MOBILE_ENABLE_REQUEST_SIGNING=true
```

**Important:** The API secret (`MOBILE_API_SECRET`) should NEVER be in the mobile app bundle. Options:

**Option A: Proxy Server (Recommended)**
- Mobile app calls your proxy server
- Proxy server adds the signature using the secret
- Mobile app never has the secret

**Option B: Certificate Pinning + Server-Side Secret Derivation**
- Use certificate pinning to ensure requests go to your server
- Server derives a per-device secret based on device fingerprint
- More complex but more secure

**Option C: OAuth2 Client Credentials Flow**
- Mobile app gets temporary tokens from auth server
- Tokens expire quickly
- Requires user authentication

### 2. Additional Security Layers

**Rate Limiting (Already Implemented)**
- Limits requests per IP/device
- Prevents abuse even if key is extracted

**Device Fingerprinting**
- Track device IDs, IP addresses
- Detect unusual patterns
- Block suspicious devices

**Request Monitoring**
- Log all API key usage
- Alert on unusual patterns
- Track request frequency per key

**IP Whitelisting (Optional)**
- Only allow requests from known IP ranges
- Not practical for mobile apps (IPs change)

**Certificate Pinning**
- Ensure requests only go to your server
- Prevents MITM attacks
- Makes it harder to intercept requests

**Code Obfuscation**
- Makes reverse engineering harder
- Doesn't prevent extraction, just makes it more difficult
- Use tools like ProGuard (Android) or obfuscation tools

### 3. What the API Key Protects

The mobile API key protects **public endpoints** that don't require user authentication:
- `/settings/account-types`
- `/settings/registration-requirements`
- `/university` (list)
- `/organization` (list)
- `/auth/request-code`
- `/auth/verify-code`

**These endpoints are intentionally public** - they're needed for user registration. The API key prevents:
- Random bots/scrapers from accessing them
- Unauthorized third-party apps from using your API
- Basic abuse and rate limit bypass

**For authenticated endpoints**, JWT tokens provide the real security.

## 🔒 Production Security Checklist

- [ ] Enable `MOBILE_ENABLE_REQUEST_SIGNING=true` in production
- [ ] **DO NOT** include `MOBILE_API_SECRET` in the mobile app bundle
- [ ] Implement proxy server or secure secret management
- [ ] Enable rate limiting on all endpoints
- [ ] Set up monitoring and alerting for API key usage
- [ ] Implement device fingerprinting and anomaly detection
- [ ] Use certificate pinning
- [ ] Enable code obfuscation in production builds
- [ ] Rotate API keys periodically
- [ ] Monitor for unusual API usage patterns
- [ ] Set up IP-based rate limiting per API key

## 📊 Security Assessment

**Current Risk Level (with API key only):**
- **Low-Medium**: Protects against casual abuse, but can be bypassed by determined attackers
- **Mitigation**: Request signing makes it significantly harder

**With Request Signing Enabled:**
- **Medium**: Much harder to bypass, but still possible if secret is compromised
- **Mitigation**: Use proxy server or secure secret management

**Best Practice:**
- Use API key + request signing as a **first layer**
- Rely on JWT tokens for **real authentication**
- Implement monitoring and rate limiting as **detection layer**
- Use certificate pinning and obfuscation as **defense in depth**

## 🎯 Bottom Line

**The API key is NOT meant to be unbreakable security.** It's a **rate limiting and abuse prevention mechanism** for public endpoints. The real security comes from:

1. **JWT tokens** for authenticated endpoints
2. **Request signing** (when enabled) for public endpoints
3. **Rate limiting** to prevent abuse
4. **Monitoring** to detect and respond to attacks

Think of the API key like a "membership card" - it shows you're using the official app, but it's not a guarantee of identity. Real identity comes from JWT tokens after user authentication.

