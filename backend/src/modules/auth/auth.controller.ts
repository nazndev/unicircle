import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RequestCodeDto, VerifyCodeDto, AlumniRegisterDto, AdminLoginDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request OTP code for student email verification' })
  async requestCode(@Body() dto: RequestCodeDto) {
    return this.authService.requestCode(dto.email);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code and login' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.email, dto.code);
  }

  @Post('alumni-register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register as alumni with document upload' })
  async alumniRegister(@Body() dto: AlumniRegisterDto) {
    return this.authService.alumniRegister(dto);
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
}

