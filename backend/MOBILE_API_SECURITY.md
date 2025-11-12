# Mobile API Security

This document explains how to secure public APIs that are called from the mobile app.

## Overview

The mobile app uses an API key and optional request signing to authenticate requests to public endpoints. This prevents unauthorized clients from accessing mobile-specific endpoints.

## Configuration

Add the following environment variables to your `.env.local` or `.env.prod` file:

```env
# Mobile API Key (required)
MOBILE_API_KEY=your-unique-api-key-here

# Mobile API Secret (required for request signing)
MOBILE_API_SECRET=your-secret-key-here

# Enable request signing (optional, default: false)
# When enabled, requests must include a signature header
MOBILE_ENABLE_REQUEST_SIGNING=false
```

### Generating Secure Keys

You can generate secure keys using:

```bash
# Generate API Key (32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Generate API Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Usage in Mobile App

### Basic API Key Authentication

For basic API key authentication (when `MOBILE_ENABLE_REQUEST_SIGNING=false`), include the API key in the request headers:

```typescript
// Example: React Native / Expo
const response = await fetch('http://localhost:3000/api/settings/account-types', {
  method: 'GET',
  headers: {
    'x-api-key': 'your-unique-api-key-here',
    'Content-Type': 'application/json',
  },
});
```

### Request Signing (Advanced)

When `MOBILE_ENABLE_REQUEST_SIGNING=true`, you must also include:

1. **Timestamp** (`x-timestamp`): Current Unix timestamp in milliseconds
2. **Signature** (`x-signature`): HMAC-SHA256 signature of the request

#### Signature Generation

The signature is calculated as:

```
signature = HMAC-SHA256(apiSecret, method + path + queryString + body + timestamp)
```

**Example (JavaScript/TypeScript):**

```typescript
import * as crypto from 'crypto';

function generateSignature(
  method: string,
  path: string,
  queryString: string,
  body: string,
  timestamp: string,
  apiSecret: string
): string {
  const signatureString = `${method}${path}${queryString}${body}${timestamp}`;
  return crypto
    .createHmac('sha256', apiSecret)
    .update(signatureString)
    .digest('hex');
}

// Example usage
const method = 'GET';
const path = '/api/settings/account-types';
const queryString = ''; // No query params
const body = ''; // GET request has no body
const timestamp = Date.now().toString();
const apiSecret = 'your-secret-key-here';

const signature = generateSignature(
  method,
  path,
  queryString,
  body,
  timestamp,
  apiSecret
);

const response = await fetch('http://localhost:3000/api/settings/account-types', {
  method: 'GET',
  headers: {
    'x-api-key': 'your-unique-api-key-here',
    'x-timestamp': timestamp,
    'x-signature': signature,
    'Content-Type': 'application/json',
  },
});
```

**Example (POST request with body):**

```typescript
const method = 'POST';
const path = '/api/auth/request-code';
const queryString = ''; // No query params
const body = JSON.stringify({ email: 'user@example.com' });
const timestamp = Date.now().toString();
const apiSecret = 'your-secret-key-here';

const signature = generateSignature(
  method,
  path,
  queryString,
  body,
  timestamp,
  apiSecret
);

const response = await fetch('http://localhost:3000/api/auth/request-code', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-unique-api-key-here',
    'x-timestamp': timestamp,
    'x-signature': signature,
    'Content-Type': 'application/json',
  },
  body: body,
});
```

## Protected Endpoints

The following endpoints require the `@MobileApi()` decorator and will validate the API key:

- `GET /api/settings/account-types`
- `GET /api/settings/registration-requirements`
- `GET /api/university`
- `GET /api/university/countries`
- `GET /api/university/check-domain`
- `GET /api/organization`
- `GET /api/organization/check-domain`
- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/alumni-register`
- `POST /api/auth/teacher-register`
- `POST /api/auth/password-login`
- `POST /api/auth/check-user`
- `POST /api/auth/request-university`
- `POST /api/upload/alumni-document`

## Security Features

1. **API Key Validation**: All requests must include a valid API key
2. **Request Signing** (optional): HMAC-SHA256 signatures prevent request tampering
3. **Timestamp Validation**: Prevents replay attacks (5-minute window)
4. **Rate Limiting**: Already implemented via ThrottlerModule

## Error Responses

### Invalid API Key

```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```

### Missing Signature (when signing enabled)

```json
{
  "statusCode": 401,
  "message": "Missing request signature",
  "code": "MISSING_SIGNATURE"
}
```

### Timestamp Expired

```json
{
  "statusCode": 401,
  "message": "Request timestamp expired",
  "code": "TIMESTAMP_EXPIRED"
}
```

### Invalid Signature

```json
{
  "statusCode": 401,
  "message": "Invalid request signature",
  "code": "INVALID_SIGNATURE"
}
```

## Best Practices

1. **Store keys securely**: Use environment variables or secure storage (e.g., Expo SecureStore)
2. **Rotate keys regularly**: Change API keys periodically for better security
3. **Use request signing in production**: Enable `MOBILE_ENABLE_REQUEST_SIGNING=true` for production
4. **Monitor API usage**: Track API key usage to detect anomalies
5. **Obfuscate keys in app**: Consider code obfuscation to make reverse engineering harder

## Testing

You can test the API key validation using curl:

```bash
# Basic API key (without signing)
curl -X GET http://localhost:3000/api/settings/account-types \
  -H "x-api-key: your-unique-api-key-here"

# With request signing
TIMESTAMP=$(date +%s)000
SIGNATURE=$(echo -n "GET/api/settings/account-types${TIMESTAMP}" | openssl dgst -sha256 -hmac "your-secret-key-here" | cut -d' ' -f2)

curl -X GET http://localhost:3000/api/settings/account-types \
  -H "x-api-key: your-unique-api-key-here" \
  -H "x-timestamp: $TIMESTAMP" \
  -H "x-signature: $SIGNATURE"
```

## Notes

- The API key is validated on all endpoints marked with `@MobileApi()`
- The guard runs globally, so it checks all requests
- If `MOBILE_API_KEY` or `MOBILE_API_SECRET` are not set, the guard will reject all requests
- Request signing is optional but recommended for production environments

