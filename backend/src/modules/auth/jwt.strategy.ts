import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        university: {
          include: {
            country: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException();
    }

    // Check if user's country is active
    if (user.university?.country && !user.university.country.active) {
      throw new UnauthorizedException({
        message: 'Your country has been deactivated. Please contact support for assistance.',
        code: 'COUNTRY_INACTIVE',
        country: user.university.country.name,
      });
    }

    return { 
      userId: user.id, 
      email: user.email, 
      profileMode: user.profileMode,
      role: user.role, // Include role for admin access checks
    };
  }
}

