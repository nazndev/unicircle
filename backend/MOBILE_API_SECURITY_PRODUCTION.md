# Mobile API Security - Production Recommendations

## ⚠️ Critical Security Consideration

**The mobile API key CAN be extracted from APK/IPA files.** This is a known limitation of client-side security.

## Current Implementation

### Development Mode
- API key is in `app.json` (can be extracted)
- Request signing is **disabled** (`__DEV__ === true`)
- Suitable for development and testing

### Production Mode (When Request Signing Enabled)
- API key is still in `app.json` (can be extracted)
- Request signing is **enabled** (`__DEV__ === false`)
- **BUT**: API secret should NOT be in the app bundle

## 🚨 Production Security Issue

**Current Problem:** If we put `MOBILE_API_SECRET` in `app.json`, it can also be extracted, making request signing useless.

## ✅ Recommended Solutions

### Solution 1: Proxy Server (BEST for Production)

**Architecture:**
```
Mobile App → Your Proxy Server → Backend API
```

**Implementation:**
1. Create a lightweight proxy server (Node.js/Express)
2. Mobile app calls proxy (no API secret needed)
3. Proxy adds request signature using server-side secret
4. Proxy forwards request to backend

**Benefits:**
- API secret never leaves your server
- Can add additional security layers (rate limiting, IP filtering)
- Can implement request transformation/validation
- Easier to rotate secrets

**Example Proxy:**
```javascript
// proxy-server.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const MOBILE_API_SECRET = process.env.MOBILE_API_SECRET; // Server-side only

app.use(express.json());

app.all('/api/*', async (req, res) => {
  const timestamp = Date.now().toString();
  const method = req.method;
  const path = req.path;
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const body = JSON.stringify(req.body || {});
  
  const signatureString = `${method}${path}${queryString}${body}${timestamp}`;
  const signature = crypto
    .createHmac('sha256', MOBILE_API_SECRET)
    .update(signatureString)
    .digest('hex');
  
  // Forward to backend with signature
  const response = await axios({
    method,
    url: `http://backend:3000${req.path}${req.url.includes('?') ? '?' + queryString : ''}`,
    data: req.body,
    headers: {
      'x-api-key': process.env.MOBILE_API_KEY,
      'x-timestamp': timestamp,
      'x-signature': signature,
      ...req.headers,
    },
  });
  
  res.json(response.data);
});

app.listen(3001);
```

**Mobile App Configuration:**
```json
{
  "extra": {
    "apiBaseUrl": "https://api-proxy.yourdomain.com/api"
  }
}
```

### Solution 2: Certificate Pinning + Server-Side Secret Derivation

**Architecture:**
```
Mobile App (with cert pinning) → Backend API
Backend derives per-device secret based on device fingerprint
```

**Implementation:**
1. Mobile app sends device fingerprint (device ID, app version, etc.)
2. Backend derives a per-device secret using server-side master secret
3. Mobile app uses derived secret for request signing
4. Certificate pinning ensures requests go to your server

**Benefits:**
- Secret is derived, not stored
- Different secret per device
- Certificate pinning prevents MITM

**Drawbacks:**
- More complex implementation
- Requires device fingerprinting
- Secret derivation logic must be secure

### Solution 3: OAuth2 Client Credentials Flow

**Architecture:**
```
Mobile App → Auth Server (get token) → Backend API (with token)
```

**Implementation:**
1. Mobile app authenticates with auth server using client credentials
2. Auth server returns short-lived access token
3. Mobile app uses token for API requests
4. Tokens expire quickly (15-60 minutes)

**Benefits:**
- Industry standard approach
- Tokens expire automatically
- Can revoke tokens server-side

**Drawbacks:**
- Requires additional auth server
- More complex flow
- Client credentials still need to be in app (but tokens expire)

## 🔒 Immediate Actions for Production

### Option A: Use Proxy Server (Recommended)

1. **Set up proxy server** (see example above)
2. **Update mobile app** to point to proxy URL
3. **Keep API secret** only on proxy server
4. **Enable request signing** in backend: `MOBILE_ENABLE_REQUEST_SIGNING=true`

### Option B: Accept the Risk (For MVP/Testing)

1. **Understand the limitation**: API key can be extracted
2. **Rely on other protections**:
   - Rate limiting (already implemented)
   - JWT tokens for authenticated endpoints
   - Monitoring and alerting
   - IP-based blocking
3. **Monitor for abuse** and respond quickly
4. **Plan to implement proxy** before public launch

## 📊 Security Assessment

**With API Key Only (Current):**
- **Risk**: Medium
- **Protection**: Prevents casual abuse
- **Bypass**: Easy if key is extracted
- **Suitable for**: Development, MVP, limited user base

**With Request Signing + Proxy Server:**
- **Risk**: Low-Medium
- **Protection**: Strong - requires server-side secret
- **Bypass**: Very difficult (would need to compromise proxy server)
- **Suitable for**: Production, public launch

## 🎯 Recommendation

**For Production:**
1. ✅ **Implement proxy server** (Solution 1)
2. ✅ **Enable request signing** in backend
3. ✅ **Keep API secret** only on proxy server
4. ✅ **Use certificate pinning** in mobile app
5. ✅ **Monitor and alert** on unusual patterns
6. ✅ **Implement rate limiting** per device/IP

**For Development:**
- Current implementation is fine
- API key in app.json is acceptable
- Request signing can be disabled

## 📝 Implementation Checklist

- [ ] Set up proxy server
- [ ] Move API secret to proxy server environment variables
- [ ] Update mobile app to use proxy URL
- [ ] Enable `MOBILE_ENABLE_REQUEST_SIGNING=true` in backend
- [ ] Remove `mobileApiSecret` from `app.json` (or leave empty)
- [ ] Test request signing flow
- [ ] Set up monitoring for API key usage
- [ ] Document proxy server deployment
- [ ] Set up alerts for unusual API usage patterns

