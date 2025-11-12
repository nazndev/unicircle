import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MOBILE_API_KEY } from '../decorators/mobile-api.decorator';
import * as crypto from 'crypto';

@Injectable()
export class MobileApiGuard implements CanActivate {
  private readonly logger = new Logger(MobileApiGuard.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly enableRequestSigning: boolean;

  constructor(private reflector: Reflector, private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('MOBILE_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('MOBILE_API_SECRET') || '';
    // Parse boolean correctly - env vars are strings, so "false" needs to be converted
    const signingEnabled = this.configService.get<string>('MOBILE_ENABLE_REQUEST_SIGNING');
    this.enableRequestSigning = signingEnabled === 'true';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'MOBILE_API_KEY or MOBILE_API_SECRET not set. Mobile API guard will reject all requests.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isMobileApi = this.reflector.getAllAndOverride<boolean>(MOBILE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If not a mobile API endpoint, allow through
    if (!isMobileApi) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Allow if request has valid JWT token (admin portal, authenticated users)
    // This allows admin portal and other JWT-authenticated clients to access these endpoints
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT token present - let JwtAuthGuard handle authentication
      // This allows admin portal to access these endpoints with JWT tokens
      return true;
    }

    // For mobile app (no JWT token), require API key
    // Check both lowercase and original case (Express normalizes headers to lowercase)
    const apiKey = request.headers['x-api-key'] || request.headers['x-mobile-api-key'] || 
                   request.headers['X-API-Key'] || request.headers['X-Mobile-API-Key'];
    const timestamp = request.headers['x-timestamp'] || request.headers['X-Timestamp'];
    const signature = request.headers['x-signature'] || request.headers['X-Signature'];

    // Debug: Log what we received (remove in production)
    if (!apiKey) {
      this.logger.warn(`Missing API key from ${request.ip}. Available headers: ${Object.keys(request.headers).filter(h => h.toLowerCase().includes('api') || h.toLowerCase().includes('key')).join(', ')}`);
    }

    // Validate API key
    if (!apiKey || apiKey !== this.apiKey) {
      this.logger.warn(`Invalid API key from ${request.ip}. Received: "${apiKey}", Expected: "${this.apiKey}", Match: ${apiKey === this.apiKey}`);
      throw new UnauthorizedException({
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    // If request signing is enabled, validate signature
    if (this.enableRequestSigning) {
      if (!timestamp || !signature) {
        this.logger.warn(`Missing timestamp or signature from ${request.ip}`);
        throw new UnauthorizedException({
          message: 'Missing request signature',
          code: 'MISSING_SIGNATURE',
        });
      }

      // Check timestamp (prevent replay attacks - allow 5 minute window)
      const requestTime = parseInt(timestamp, 10);
      const currentTime = Date.now();
      const timeDiff = Math.abs(currentTime - requestTime);

      if (timeDiff > 5 * 60 * 1000) {
        // 5 minutes
        this.logger.warn(`Request timestamp too old or too far in future from ${request.ip}`);
        throw new UnauthorizedException({
          message: 'Request timestamp expired',
          code: 'TIMESTAMP_EXPIRED',
        });
      }

      // Validate signature
      const method = request.method.toUpperCase();
      const path = request.url.split('?')[0]; // Remove query string for signature
      const body = request.body ? JSON.stringify(request.body) : '';
      const queryString = request.url.includes('?') ? request.url.split('?')[1] : '';

      // Create signature string: method + path + queryString + body + timestamp
      const signatureString = `${method}${path}${queryString}${body}${timestamp}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(signatureString)
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn(`Invalid signature from ${request.ip}`);
        throw new UnauthorizedException({
          message: 'Invalid request signature',
          code: 'INVALID_SIGNATURE',
        });
      }
    }

    return true;
  }
}

