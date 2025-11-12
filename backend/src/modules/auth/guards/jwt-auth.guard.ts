import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { MOBILE_API_KEY } from '../../../common/decorators/mobile-api.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isMobileApi = this.reflector.getAllAndOverride<boolean>(MOBILE_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      // For public endpoints, try to authenticate if token is present (optional auth)
      // This allows endpoints to access user info if token is provided, but doesn't require it
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers?.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Token is present, try to validate it (but don't fail if invalid)
        try {
          const result = await super.canActivate(context);
          // If validation succeeds, user object will be set
          return result as boolean;
        } catch (error) {
          // If validation fails, allow request to proceed (public endpoint)
          // User object will be undefined, which is fine for public endpoints
          // Note: MobileApiGuard will handle API key validation separately
          return true;
        }
      }
      
      // No token, allow public access
      // Note: If isMobileApi is true, MobileApiGuard will validate the API key
      return true;
    }
    
    return super.canActivate(context) as Promise<boolean>;
  }
}

