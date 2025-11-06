import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from './guards/admin.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard, SuperAdminGuard],
  exports: [AuthService, AdminGuard, SuperAdminGuard],
})
export class AuthModule {}

