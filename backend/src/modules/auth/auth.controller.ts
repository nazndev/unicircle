import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestCodeDto, VerifyCodeDto, AlumniRegisterDto, TeacherRegisterDto, AdminLoginDto, SetPasswordDto, PasswordLoginDto, CheckUserDto, BindDeviceDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MobileApi } from '../../common/decorators/mobile-api.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP code for student email verification' })
  async requestCode(@Body() dto: RequestCodeDto) {
    try {
      return await this.authService.requestCode(dto.email);
    } catch (error: any) {
      // Re-throw known exceptions (BadRequestException, etc.)
      if (error.status && error.message) {
        throw error;
      }
      // Log unexpected errors with full details
      console.error('Unexpected error in requestCode:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new BadRequestException(
        error.message || 'An error occurred while processing your request. Please try again.'
      );
    }
  }

  @Public()
  @MobileApi()
  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and login (Mobile API only)' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.email, dto.code, dto.referralCode);
  }

  @Public()
  @MobileApi()
  @Post('alumni-register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as alumni with document upload (Mobile API only)' })
  async alumniRegister(@Body() dto: AlumniRegisterDto) {
    return this.authService.alumniRegister(dto);
  }

  @Public()
  @MobileApi()
  @Post('teacher-register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as teacher with document upload (Mobile API only)' })
  async teacherRegister(@Body() dto: TeacherRegisterDto) {
    return this.authService.teacherRegister(dto);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.userId);
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (client should remove token)' })
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (super admin only)' })
  async adminLogin(@Body() dto: AdminLoginDto) {
    console.log('[AUTH CONTROLLER] Admin login request received:', { 
      email: dto.email,
      hasPassword: !!dto.password 
    });
    const result = await this.authService.adminLogin(dto.email, dto.password);
    console.log('[AUTH CONTROLLER] Admin login result:', { 
      hasAccessToken: !!result.accessToken,
      userEmail: result.user?.email,
      userRole: result.user?.role 
    });
    return result;
  }

  @Public()
  @MobileApi()
  @Post('request-institution')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request to add a new institution (university or organization) (Mobile API only)' })
  async requestInstitution(@Body() dto: any) {
    return this.authService.requestInstitution(dto);
  }

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password/PIN after OTP verification' })
  async setPassword(@CurrentUser() user: any, @Body() dto: SetPasswordDto) {
    return this.authService.setPassword(user.userId, dto.password, dto.confirmPassword);
  }

  @Post('password-login')
  @Public()
  @MobileApi()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with password/PIN (Mobile API only)' })
  async passwordLogin(@Body() dto: PasswordLoginDto) {
    return this.authService.passwordLogin(dto.email, dto.password);
  }

  @Post('forget-password')
  @Public()
  @MobileApi()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset via email (Mobile API only)' })
  async forgetPassword(@Body() dto: { email: string }) {
    return this.authService.forgetPassword(dto.email);
  }

  @Get('check-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has password set' })
  async checkPassword(@CurrentUser() user: any) {
    return this.authService.checkPasswordSet(user.userId);
  }

  @Post('check-user')
  @Public()
  @MobileApi()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user exists and has password set (Mobile API only, for login UI)' })
  async checkUserStatus(@Body() dto: CheckUserDto) {
    return this.authService.checkUserStatus(dto.email);
  }

  @Get('check-device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if device is bound to user account' })
  async checkDevice(@CurrentUser() user: any) {
    return this.authService.checkDevice(user.userId);
  }

  @Post('bind-device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bind device to user account (after PIN setup)' })
  async bindDevice(@CurrentUser() user: any, @Body() dto: BindDeviceDto) {
    return this.authService.bindDevice(user.userId, dto.deviceId, dto.deviceName, dto.platform, dto.fcmToken);
  }
}

