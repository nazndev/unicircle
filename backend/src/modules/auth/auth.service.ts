import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RequestCodeDto, VerifyCodeDto, AlumniRegisterDto } from './dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async requestCode(email: string) {
    // Validate email domain and find university
    const emailDomain = email.split('@')[1];
    const university = await this.prisma.university.findFirst({
      where: { domain: emailDomain, active: true },
    });

    if (!university) {
      throw new BadRequestException('Email domain not recognized. Please use your university email.');
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          universityId: university.id,
          registrationSource: 'student_email',
          verificationStatus: 'pending',
        },
      });
    }

    // Create or update verification code
    const existing = await this.prisma.emailVerification.findFirst({
      where: { userId: user.id, consumed: false },
    });

    if (existing) {
      await this.prisma.emailVerification.update({
        where: { id: existing.id },
        data: {
          code,
          expiresAt,
          consumed: false,
        },
      });
    } else {
      await this.prisma.emailVerification.create({
        data: {
          userId: user.id,
          code,
          expiresAt,
        },
      });
    }

    // Send email
    await this.mailService.sendVerificationCode(email, code);

    return { message: 'Verification code sent to your email' };
  }

  async verifyCode(email: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        code,
        consumed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    // Mark as consumed and verify user
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { consumed: true },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationStatus: 'approved',
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileMode: user.profileMode,
        verificationStatus: 'approved',
      },
    };
  }

  async alumniRegister(dto: AlumniRegisterDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.personalEmail },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Create user with pending status
    const user = await this.prisma.user.create({
      data: {
        email: dto.personalEmail,
        name: dto.fullName,
        universityId: dto.universityId,
        registrationSource: 'alumni_manual',
        verificationStatus: 'pending',
        documents: dto.documents || [],
      },
    });

    // Create alumni approval request
    await this.prisma.alumniApproval.create({
      data: {
        userId: user.id,
        documents: dto.documents || [],
        status: 'pending',
      },
    });

    return {
      message: 'Registration submitted. Your account will be reviewed within 24 hours.',
      userId: user.id,
    };
  }

  async refreshToken(userId: string) {
    return this.generateTokens(userId);
  }

  async adminLogin(email: string, password: string) {
    console.log('[AUTH] Admin login attempt:', { email, passwordLength: password?.length });
    
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    console.log('[AUTH] User found:', { 
      found: !!user, 
      userId: user?.id, 
      role: user?.role,
      hasPasswordHash: !!user?.passwordHash,
      isBlocked: user?.isBlocked 
    });

    if (!user) {
      console.log('[AUTH] Login failed: User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is admin or super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      console.log('[AUTH] Login failed: Invalid role', { role: user.role });
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }

    // Check password (for admin, we use password instead of OTP)
    if (!user.passwordHash) {
      console.log('[AUTH] Login failed: No password hash');
      throw new UnauthorizedException('Admin account not properly configured');
    }

    console.log('[AUTH] Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('[AUTH] Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('[AUTH] Login failed: Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      console.log('[AUTH] Login failed: Account blocked');
      throw new ForbiddenException('Account is blocked');
    }

    // Generate tokens
    console.log('[AUTH] Generating tokens...');
    const tokens = await this.generateTokens(user.id);
    console.log('[AUTH] Login successful:', { 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      hasAccessToken: !!tokens.accessToken 
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }
}

