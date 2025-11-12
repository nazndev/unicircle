import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UploadService } from '../upload/upload.service';
import { ReferralService } from '../referral/referral.service';
import { RequestCodeDto, VerifyCodeDto, AlumniRegisterDto, TeacherRegisterDto } from './dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private uploadService: UploadService,
    private referralService: ReferralService,
  ) {}

  async requestCode(email: string) {
    console.log('[AUTH] Request code for email:', email);
    
    // Check if student registration is enabled
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: { enableStudentRegistration: true } as any,
    }) as any;

    if (settings && !settings.enableStudentRegistration) {
      throw new ForbiddenException('Student registration is currently disabled. Please contact support for assistance.');
    }
    
    // Validate email format
    if (!email || !email.includes('@')) {
      console.error('[AUTH] Invalid email format:', email);
      throw new BadRequestException('Invalid email format');
    }

    // Validate email domain and find university or organization
    const emailDomain = email.split('@')[1];
    
    if (!emailDomain) {
      console.error('[AUTH] Invalid email domain:', email);
      throw new BadRequestException('Invalid email domain');
    }

    console.log('[AUTH] Looking for university or organization with domain:', emailDomain);

    // First check for university
    let university;
    let organization;
    try {
      university = await this.prisma.university.findFirst({
        where: {
          domain: emailDomain,
          active: true,
          country: {
            active: true, // Only allow universities from active countries
          },
        } as any,
        include: {
          country: true,
        } as any,
      }) as any;
      console.log('[AUTH] University found:', university ? university.name : 'NOT FOUND');
      
      // If no university, check for organization
      if (!university) {
        organization = await (this.prisma as any).organization.findFirst({
          where: {
            domain: emailDomain,
            active: true,
            country: {
              active: true, // Only allow organizations from active countries
            },
          },
          include: {
            country: true,
          },
        });
        console.log('[AUTH] Organization found:', organization ? organization.name : 'NOT FOUND');
      }
    } catch (error: any) {
      console.error('[AUTH] Database error while finding university/organization:', error);
      console.error('[AUTH] Error stack:', error?.stack);
      throw new BadRequestException('Unable to verify email domain. Please try again later.');
    }

    if (!university && !organization) {
      console.error('[AUTH] Neither university nor organization found for domain:', emailDomain);
      throw new BadRequestException('Email domain not recognized. Please use your university or organization email, or contact support.');
    }

    // Return institution name in response for UI display
    const response: any = { message: 'Verification code sent to your email' };
    if (university) {
      response.universityName = university.name;
      response.institutionType = 'university';
    } else if (organization) {
      response.organizationName = organization.name;
      response.institutionType = 'organization';
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user;
    let isReturningUser = false;
    try {
      console.log('[AUTH] Looking for existing user with email:', email);
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { 
          university: true,
          organization: true,
        } as any,
      }) as any;

      if (!user) {
        console.log('[AUTH] User not found, creating new user');
        // Create new user - determine if student or professional
        const userData: any = {
          email,
          registrationSource: university ? 'student_email' : 'professional_email',
          verificationStatus: 'pending',
          profileMode: university ? 'student' : 'professional',
          universityEmailVerified: university ? true : false,
          officeEmailVerified: organization ? true : false,
        };
        
        if (university) {
          userData.universityId = university.id;
        } else if (organization) {
          userData.organizationId = organization.id;
        }
        
        user = await this.prisma.user.create({
          data: userData,
          include: { 
            university: true,
            organization: true,
          } as any,
        }) as any;
        console.log('[AUTH] New user created:', user.id, 'profileMode:', user.profileMode);
      } else {
        console.log('[AUTH] User found:', user.id, 'universityId:', user.universityId, 'organizationId:', (user as any).organizationId, 'isVerified:', user.isVerified);
        // Check if this is a returning unverified user
        if (!user.isVerified) {
          isReturningUser = true;
          console.log('[AUTH] Returning unverified user detected');
        }
        // User exists - verify institution is still valid
        if (university) {
          if (!user.universityId || user.universityId !== university.id) {
            console.log('[AUTH] Updating user university from', user.universityId, 'to', university.id);
            user = await this.prisma.user.update({
              where: { id: user.id },
              data: {
                universityId: university.id,
                organizationId: null, // Clear organization if switching to university
                profileMode: 'student',
                universityEmailVerified: true,
                officeEmailVerified: false,
              } as any,
              include: { 
                university: true,
                organization: true,
              } as any,
            }) as any;
            console.log('[AUTH] User university updated');
          }
        } else if (organization) {
          if ((user as any).organizationId !== organization.id) {
            console.log('[AUTH] Updating user organization from', (user as any).organizationId, 'to', organization.id);
            user = await this.prisma.user.update({
              where: { id: user.id },
              data: {
                organizationId: organization.id,
                // DO NOT clear universityId - preserve original university affiliation
                profileMode: 'professional',
                officeEmailVerified: true,
                // Preserve universityEmailVerified if already set
              } as any,
              include: { 
                university: true,
                organization: true,
              } as any,
            }) as any;
            console.log('[AUTH] User organization updated');
          }
        }
      }
    } catch (error: any) {
      console.error('[AUTH] Database error while creating/finding user:', error);
      console.error('[AUTH] Error name:', error?.name);
      console.error('[AUTH] Error message:', error?.message);
      console.error('[AUTH] Error code:', error?.code);
      console.error('[AUTH] Error stack:', error?.stack);
      // Log the full error for debugging
      try {
        console.error('[AUTH] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error('[AUTH] Could not stringify error');
      }
      throw new BadRequestException('Unable to process request. Please try again later.');
    }

    // Create or update verification code
    try {
      console.log('[AUTH] Checking for existing verification code for user:', user.id);
      const existing = await this.prisma.emailVerification.findFirst({
        where: { userId: user.id, consumed: false },
      });

      if (existing) {
        console.log('[AUTH] Updating existing verification code:', existing.id);
        await this.prisma.emailVerification.update({
          where: { id: existing.id },
          data: {
            code,
            expiresAt,
            consumed: false,
          },
        });
        console.log('[AUTH] Verification code updated');
      } else {
        console.log('[AUTH] Creating new verification code');
        await this.prisma.emailVerification.create({
          data: {
            userId: user.id,
            code,
            expiresAt,
          },
        });
        console.log('[AUTH] Verification code created');
      }
    } catch (error: any) {
      console.error('[AUTH] Database error while creating verification code:', error);
      console.error('[AUTH] Error name:', error?.name);
      console.error('[AUTH] Error message:', error?.message);
      console.error('[AUTH] Error code:', error?.code);
      console.error('[AUTH] Error stack:', error?.stack);
      throw new BadRequestException('Unable to generate verification code. Please try again later.');
    }

    // Send email with error handling
    try {
      await this.mailService.sendVerificationCode(email, code);
    } catch (error: any) {
      // Log error but don't fail the request - user can request code again
      console.error(`Failed to send verification code to ${email}:`, error);
      // Still return success with university name, but log the email failure
      // User can retry requesting code
      response.message = 'Verification code request received. If you don\'t receive an email, please try again.';
    }

    // Add returning user flag to response
    if (isReturningUser) {
      response.isReturningUser = true;
      response.message = 'Welcome back! We\'ve sent a new verification code to your email.';
    }

    return response;
  }

  async verifyCode(email: string, code: string, referralCode?: string) {
    console.log('[AUTH] Verify code request:', { email, codeLength: code?.length });
    
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { email },
      });
      console.log('[AUTH] User lookup result:', { found: !!user, userId: user?.id, isVerified: user?.isVerified });
    } catch (error: any) {
      console.error('[AUTH] Database error finding user:', error);
      throw new UnauthorizedException('Unable to verify code. Please try again.');
    }

    if (!user) {
      console.error('[AUTH] User not found for email:', email);
      throw new UnauthorizedException('User not found');
    }

    console.log('[AUTH] Looking for verification code:', { userId: user.id, code });
    let verification;
    try {
      verification = await this.prisma.emailVerification.findFirst({
        where: {
          userId: user.id,
          code,
          consumed: false,
          expiresAt: { gt: new Date() },
        },
      });
      console.log('[AUTH] Verification lookup result:', { 
        found: !!verification, 
        verificationId: verification?.id,
        expiresAt: verification?.expiresAt,
        consumed: verification?.consumed 
      });
    } catch (error: any) {
      console.error('[AUTH] Database error finding verification:', error);
      throw new UnauthorizedException('Unable to verify code. Please try again.');
    }

    if (!verification) {
      console.error('[AUTH] Invalid or expired code for user:', user.id);
      // Check if there's an expired code
      const expiredVerification = await this.prisma.emailVerification.findFirst({
        where: {
          userId: user.id,
          code,
        },
      });
      if (expiredVerification) {
        console.log('[AUTH] Code found but expired or already consumed');
        throw new UnauthorizedException('Code has expired. Please request a new code.');
      }
      throw new UnauthorizedException('Invalid code. Please check and try again.');
    }

    try {
      // Check if user's country is active before completing verification
      const userWithCountry = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          university: {
            include: {
              country: true,
            } as any,
          },
        },
      }) as any;

      if (userWithCountry?.university?.country && !userWithCountry.university.country.active) {
        throw new ForbiddenException({
          message: 'Your country has been deactivated. Please contact support for assistance.',
          code: 'COUNTRY_INACTIVE',
          country: userWithCountry.university.country.name,
        });
      }

      // Mark as consumed and verify user
      console.log('[AUTH] Marking verification as consumed');
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { consumed: true },
      });

      console.log('[AUTH] Updating user verification status');
      // Determine if this is a university or organization email
      const emailDomain = email.split('@')[1];
      const isUniversityEmail = user.universityId && user.university;
      const isOrganizationEmail = (user as any).organizationId && (user as any).organization;
      
      // Handle referral code if provided
      let referrerId: string | null = null;
      if (referralCode) {
        referrerId = await this.referralService.validateReferralCode(referralCode);
        if (referrerId && referrerId !== user.id) {
          console.log('[AUTH] Valid referral code provided, referrer:', referrerId);
        } else {
          console.log('[AUTH] Invalid or self-referral code, ignoring');
          referrerId = null;
        }
      }
      
      const updateData: any = {
        isVerified: true,
        verificationStatus: 'approved',
        universityEmailVerified: isUniversityEmail ? true : undefined, // Only set if university email
        officeEmailVerified: isOrganizationEmail ? true : undefined, // Only set if organization email
      };
      
      // Set referredBy if valid referral code provided
      if (referrerId) {
        updateData.referredBy = referrerId;
      }
      
      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
      
      // Award referral points if this is a new signup with referral
      if (referrerId) {
        // Check if this is a new user (just created) or existing user
        const isNewUser = !user.isVerified;
        
        if (isNewUser) {
          // Award signup points
          await this.referralService.awardSignupPoints(referrerId, user.id);
          
          // Check for domain match bonus
          await this.referralService.awardDomainMatchBonus(referrerId, user.id);
        }
        
        // Award verification points
        await this.referralService.awardVerificationPoints(referrerId, user.id);
      }

      console.log('[AUTH] Generating tokens');
      const tokens = await this.generateTokens(user.id);
      console.log('[AUTH] Tokens generated:', { hasAccessToken: !!tokens.accessToken, hasRefreshToken: !!tokens.refreshToken });

      const response = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileMode: user.profileMode,
          verificationStatus: 'approved' as const,
          onboardingCompleted: user.onboardingCompleted || false,
        },
        hasPassword: !!user.passwordHash, // Include password status
      };
      
      console.log('[AUTH] Verification successful:', { userId: user.id, email: user.email, hasPassword: response.hasPassword });
      return response;
    } catch (error: any) {
      console.error('[AUTH] Error during verification process:', error);
      console.error('[AUTH] Error stack:', error?.stack);
      // Re-throw ForbiddenException for country inactive
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Unable to complete verification. Please try again.');
    }
  }

  async alumniRegister(dto: AlumniRegisterDto) {
    // Check if alumni registration is enabled
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: { enableAlumniRegistration: true } as any,
    }) as any;

    if (settings && !settings.enableAlumniRegistration) {
      throw new ForbiddenException('Alumni registration is currently disabled. Please contact support for assistance.');
    }

    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.personalEmail },
      include: {
        alumniApprovals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      // Check if user is already verified as alumni
      if (existing.profileMode === 'alumni' && existing.isVerified) {
        throw new BadRequestException('You are already registered as an alumni. Please log in to your account.');
      }

      // Check for existing alumni approval requests
      const latestApproval = existing.alumniApprovals?.[0];
      
      if (latestApproval) {
        if (latestApproval.status === 'pending') {
          throw new BadRequestException('You already have a pending alumni registration request. Please wait for admin approval or contact support if you need to update your application.');
        }
        
        if (latestApproval.status === 'approved') {
          throw new BadRequestException('Your alumni registration has already been approved. Please log in to your account.');
        }
        
        if (latestApproval.status === 'rejected') {
          // Allow re-registration for rejected users
          // Update user info and create new approval request
          const updatedUser = await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              name: dto.fullName,
              universityId: dto.universityId,
              verificationStatus: 'pending',
              profileMode: 'student', // Reset to student until approved
            },
          });

          // Validate university
          const university = await this.prisma.university.findUnique({
            where: { id: dto.universityId },
            include: {
              country: true,
            } as any,
          }) as any;

          if (!university || !university.active) {
            throw new BadRequestException('University not found or inactive');
          }

          // Check if country is active
          if (!university.country?.active) {
            throw new BadRequestException('University is not available in your region.');
          }

          // Move temp files to user's folder if any documents are temp URLs
          let finalDocuments = dto.documents || [];
          if (finalDocuments.length > 0) {
            finalDocuments = await this.uploadService.moveTempFilesToUserFolder(updatedUser.id, finalDocuments);
          }

          // Update user with final document URLs
          const user = await this.prisma.user.update({
            where: { id: updatedUser.id },
            data: {
              documents: finalDocuments,
            },
          });

          // Create new alumni approval request
          await this.prisma.alumniApproval.create({
            data: {
              userId: user.id,
              documents: finalDocuments,
              status: 'pending',
            },
          });

          return {
            message: 'Your registration has been resubmitted for review. We will review your updated application within 24 hours.',
            userId: user.id,
            resubmitted: true,
          };
        }
      }

      // User exists but no alumni approval history - might be a student trying to register as alumni
      // Update existing user and create approval request
      const university = await this.prisma.university.findUnique({
        where: { id: dto.universityId },
        include: {
          country: true,
        } as any,
      } as any) as any;

      if (!university || !university.active) {
        throw new BadRequestException('University not found or inactive');
      }

      if (!university.country?.active) {
        throw new BadRequestException('University is not available in your region.');
      }

      // Move temp files to user's folder if any documents are temp URLs
      let finalDocuments = dto.documents || [];
      if (finalDocuments.length > 0) {
        finalDocuments = await this.uploadService.moveTempFilesToUserFolder(existing.id, finalDocuments);
      }

      // Update existing user
      const user = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: dto.fullName,
          universityId: dto.universityId,
          registrationSource: 'alumni_manual',
          verificationStatus: 'pending',
          profileMode: 'student', // Keep as student until approved
          documents: finalDocuments,
        },
      });

      // Create alumni approval request
      await this.prisma.alumniApproval.create({
        data: {
          userId: user.id,
          documents: finalDocuments,
          status: 'pending',
        },
      });

      return {
        message: 'Registration submitted. Your account will be reviewed within 24 hours.',
        userId: user.id,
      };
    }

    // New user - create from scratch
    // Validate university
    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
      include: {
        country: true,
      } as any,
    }) as any;

    if (!university || !university.active) {
      throw new BadRequestException('University not found or inactive');
    }

    // Check if country is active
    if (!university.country?.active) {
      throw new BadRequestException('University is not available in your region.');
    }

    // Move temp files to user's folder if any documents are temp URLs
    let finalDocuments = dto.documents || [];
    if (finalDocuments.length > 0) {
      // Create user first (we need userId to move files)
      const tempUser = await this.prisma.user.create({
        data: {
          email: dto.personalEmail,
          name: dto.fullName,
          universityId: dto.universityId,
          registrationSource: 'alumni_manual',
          verificationStatus: 'pending',
          documents: finalDocuments, // Temporary, will be updated
        },
      });

      // Move temp files to user's folder
      finalDocuments = await this.uploadService.moveTempFilesToUserFolder(tempUser.id, finalDocuments);

      // Update user with final document URLs
      const user = await this.prisma.user.update({
        where: { id: tempUser.id },
        data: {
          documents: finalDocuments,
        },
      });

      // Create alumni approval request
      await this.prisma.alumniApproval.create({
        data: {
          userId: user.id,
          documents: finalDocuments,
          status: 'pending',
        },
      });

      return {
        message: 'Registration submitted. Your account will be reviewed within 24 hours.',
        userId: user.id,
      };
    }

    // No documents, create user normally
    const user = await this.prisma.user.create({
      data: {
        email: dto.personalEmail,
        name: dto.fullName,
        universityId: dto.universityId,
        registrationSource: 'alumni_manual',
        verificationStatus: 'pending',
        documents: [],
      },
    });

    // Create alumni approval request
    await this.prisma.alumniApproval.create({
      data: {
        userId: user.id,
        documents: [],
        status: 'pending',
      },
    });

    return {
      message: 'Registration submitted. Your account will be reviewed within 24 hours.',
      userId: user.id,
    };
  }

  async teacherRegister(dto: TeacherRegisterDto) {
    // Check if teacher registration is enabled
    const settings = await this.prisma.settings.findUnique({
      where: { id: 'platform' },
      select: { enableTeacherRegistration: true } as any,
    }) as any;

    if (settings && !settings.enableTeacherRegistration) {
      throw new ForbiddenException('Teacher registration is currently disabled. Please contact support for assistance.');
    }

    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Validate university
    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
      include: {
        country: true,
      } as any,
    }) as any;

    if (!university || !university.active) {
      throw new BadRequestException('University not found or inactive');
    }

    // Check if country is active
    if (!university.country?.active) {
      throw new BadRequestException('University is not available in your region.');
    }

    // Check if email domain matches university (if university email)
    const emailDomain = dto.email.split('@')[1];
    const isUniversityEmail = university && university.domain === emailDomain;
    
    // Determine verification status based on email type
    let verificationStatus = 'pending';
    let isVerified = false;
    
    if (isUniversityEmail) {
      // University email - immediate approval (trusted)
      verificationStatus = 'approved';
      isVerified = true;
    }

    // Move temp files to user's folder if any documents are temp URLs
    // Teacher is now a badge, not a profileMode
    // Set profileMode to 'student' (default) and isTeacher badge to true
    // If verified with university email, teacherVerified = true, otherwise pending approval
    const teacherVerified = isUniversityEmail;
    const teacherStatus = isUniversityEmail ? 'approved' : 'pending';

    let finalDocuments = dto.documents || [];
    if (finalDocuments.length > 0) {
      // Create user first (we need userId to move files)
      const tempUser = await this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.fullName,
          universityId: dto.universityId,
          department: dto.department,
          registrationSource: 'student_email', // Teachers register with university email
          profileMode: 'student', // Base profileMode
          isTeacher: true, // Teacher badge
          teacherVerified: teacherVerified, // Verified if university email
          isAlumni: true, // Teachers are alumni (they have university affiliation)
          alumniVerified: teacherVerified, // Verified if university email
          universityEmailVerified: isUniversityEmail,
          verificationStatus: teacherStatus,
          isVerified: isUniversityEmail,
          documents: finalDocuments, // Temporary, will be updated
        } as any,
      });

      // Move temp files to user's folder
      finalDocuments = await this.uploadService.moveTempFilesToUserFolder(tempUser.id, finalDocuments);

      // Update user with final document URLs
      const user = await this.prisma.user.update({
        where: { id: tempUser.id },
        data: {
          documents: finalDocuments,
        },
      } as any);

      // Only create teacher approval request if manual registration (not university email)
      if (!isUniversityEmail) {
        await (this.prisma as any).teacherApproval.create({
          data: {
            userId: user.id,
            documents: finalDocuments,
            status: 'pending',
          },
        });
      }

      return {
        message: 'Teacher registration submitted. Your account will be reviewed within 24 hours.',
        userId: user.id,
      };
    }

    // No documents, create user normally
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.fullName,
        universityId: dto.universityId,
        department: dto.department,
        registrationSource: 'student_email', // Teachers register with university email
        profileMode: 'student', // Base profileMode
        isTeacher: true, // Teacher badge
        teacherVerified: teacherVerified, // Verified if university email
        isAlumni: true, // Teachers are alumni (they have university affiliation)
        alumniVerified: teacherVerified, // Verified if university email
        universityEmailVerified: isUniversityEmail,
        verificationStatus: teacherStatus,
        isVerified: isUniversityEmail,
        documents: [],
      } as any,
    });

    // Only create teacher approval request if manual registration (not university email)
    if (!isUniversityEmail) {
      await (this.prisma as any).teacherApproval.create({
        data: {
          userId: user.id,
          documents: [],
          status: 'pending',
        },
      });
    }

    return {
      message: 'Teacher registration submitted. Your account will be reviewed within 24 hours.',
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

  async requestInstitution(data: { institutionName: string; countryId: string; studentEmail: string }) {
    // Validate email format
    if (!data.studentEmail.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    const domain = data.studentEmail.split('@')[1];

    // Check if institution (university or organization) already exists
    const existingUniversity = await this.prisma.university.findFirst({
      where: { domain, active: true },
    });

    const existingOrganization = await this.prisma.organization.findFirst({
      where: { domain, active: true },
    });

    if (existingUniversity || existingOrganization) {
      throw new BadRequestException('This institution already exists in our system');
    }

    // Check if request already exists
    const existingRequest = await (this.prisma as any).institutionRequest.findFirst({
      where: {
        domain,
        status: 'pending',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A request for this institution is already pending');
    }

    // Validate countryId exists and is active
    let countryId: string | null = null;
    if (data.countryId) {
      const country = await (this.prisma as any).country.findUnique({
        where: { id: data.countryId },
      });
      if (country) {
        if (!country.active) {
          throw new BadRequestException('Selected country is not active. Please select an active country.');
        }
        countryId = country.id;
      } else {
        throw new BadRequestException('Invalid country selected');
      }
    }

    // Create request (type will be set by admin when approving)
    const request = await (this.prisma as any).institutionRequest.create({
      data: {
        institutionName: data.institutionName,
        countryId: countryId,
        studentEmail: data.studentEmail,
        domain,
        institutionType: null, // Admin will decide when approving
      },
    });

    return {
      message: 'Institution request submitted successfully. We will review it and add your institution soon.',
      requestId: request.id,
    };
  }

  async setPassword(userId: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (password.length < 4) {
      throw new BadRequestException('Password must be at least 4 characters');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password set successfully' };
  }

  async passwordLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        university: {
          include: {
            country: true,
          } as any,
        },
      } as any,
    }) as any;

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Password not set. Please use OTP login to set your password first.');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Account not verified. Please verify your email first.');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Account is blocked');
    }

    // Check if user's country is active
    if (user.university?.country && !user.university.country.active) {
      throw new ForbiddenException({
        message: 'Your country has been deactivated. Please contact support for assistance.',
        code: 'COUNTRY_INACTIVE',
        country: user.university.country.name,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
        verificationStatus: user.verificationStatus,
        onboardingCompleted: (user as any).onboardingCompleted || false,
      },
    };
  }

  async checkPasswordSet(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    return { hasPassword: !!user?.passwordHash };
  }

  async checkUserStatus(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        profileMode: true,
        isVerified: true,
        passwordHash: true,
        isBlocked: true,
      },
    });

    if (!user) {
      return {
        exists: false,
        hasPassword: false,
        isVerified: false,
        profileMode: null,
      };
    }

    return {
      exists: true,
      hasPassword: !!user.passwordHash,
      isVerified: user.isVerified,
      isBlocked: user.isBlocked,
      profileMode: user.profileMode,
    };
  }

  async forgetPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If an account exists with this email, a password reset code has been sent.' };
    }

    if (!user.isVerified) {
      throw new BadRequestException('Account not verified. Please verify your email first.');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Account is blocked');
    }

    // Generate OTP code for password reset
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

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

    // Send password reset code via email
    try {
      await this.mailService.sendPasswordResetCode(email, code);
    } catch (error) {
      console.error(`Failed to send password reset code to ${email}:`, error);
      // Still return success - user can retry
    }

    return { 
      message: 'If an account exists with this email, a password reset code has been sent.',
      // Return code in development only (for testing)
      ...(process.env.NODE_ENV === 'development' ? { code } : {}),
    };
  }

  async checkDevice(userId: string) {
    // Check if user has any active device bindings
    const devices = await (this.prisma as any).device.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    return {
      isBound: devices.length > 0,
      deviceCount: devices.length,
    };
  }

  async bindDevice(userId: string, deviceId: string, deviceName: string | undefined, platform: string, fcmToken: string | undefined) {
    // Check if device already exists for this user
    const existingDevice = await (this.prisma as any).device.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (existingDevice) {
      // Update existing device
      await (this.prisma as any).device.update({
        where: { id: existingDevice.id },
        data: {
          deviceName,
          platform,
          fcmToken,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });
      return { message: 'Device updated successfully', deviceId: existingDevice.id };
    }

    // Create new device binding
    const device = await (this.prisma as any).device.create({
      data: {
        userId,
        deviceId,
        deviceName,
        platform,
        fcmToken,
        isActive: true,
      },
    });

    return { message: 'Device bound successfully', deviceId: device.id };
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
    };
  }
}

