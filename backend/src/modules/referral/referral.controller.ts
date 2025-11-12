import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get('me/code')
  @ApiOperation({ summary: 'Get my referral code' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the user\'s unique referral code',
    schema: {
      type: 'object',
      properties: {
        referralCode: {
          type: 'string',
          example: 'ABC123XYZ',
          description: 'Unique referral code for this user'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyReferralCode(@CurrentUser() user: any) {
    return {
      referralCode: await this.referralService.getReferralCode(user.userId),
    };
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my referral statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns referral statistics including total referrals, verified referrals, and points',
    schema: {
      type: 'object',
      properties: {
        referralCode: {
          type: 'string',
          example: 'ABC123XYZ'
        },
        totalPoints: {
          type: 'number',
          example: 35,
          description: 'Total points earned from referrals'
        },
        totalReferrals: {
          type: 'number',
          example: 5,
          description: 'Total number of users referred'
        },
        verifiedReferrals: {
          type: 'number',
          example: 3,
          description: 'Number of referred users who have verified their account'
        },
        pendingReferrals: {
          type: 'number',
          example: 2,
          description: 'Number of referred users who have not yet verified'
        },
        referrals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              isVerified: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              university: { type: 'object', nullable: true },
              organization: { type: 'object', nullable: true }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyReferralStats(@CurrentUser() user: any) {
    return this.referralService.getReferralStats(user.userId);
  }
}

