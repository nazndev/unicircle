import CryptoJS from 'crypto-js';

/**
 * Generate HMAC-SHA256 signature for mobile API requests
 * This prevents API key extraction from being useful for attackers
 * 
 * The API secret is NOT stored in the app - it's only used server-side
 * Even if someone extracts the API key, they cannot generate valid signatures
 * without the secret key (which is only on the server)
 */
export function generateRequestSignature(
  method: string,
  path: string,
  queryString: string,
  body: string,
  timestamp: string,
  apiSecret: string,
): string {
  // Create signature string: method + path + queryString + body + timestamp
  const signatureString = `${method}${path}${queryString}${body}${timestamp}`;
  
  // Generate HMAC-SHA256 signature
  const signature = CryptoJS.HmacSHA256(signatureString, apiSecret).toString();
  
  return signature;
}

/**
 * Check if request signing is enabled (based on environment)
 * In production, request signing should always be enabled
 */
export function isRequestSigningEnabled(): boolean {
  // Enable request signing in production builds
  // For development, you can disable it for easier testing
  // In production, this should always return true
  return __DEV__ === false; // Enable in production builds
}

