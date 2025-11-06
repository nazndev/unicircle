import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, isBlocked: true },
    });

    if (!dbUser || dbUser.isBlocked) {
      throw new ForbiddenException('Account not found or blocked');
    }

    if (dbUser.role !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }

    return true;
  }
}

