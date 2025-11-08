import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BindDeviceDto {
  @ApiProperty({ description: 'Unique device identifier' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Device name/model', required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiProperty({ description: 'Platform: ios or android' })
  @IsString()
  platform: string;

  @ApiProperty({ description: 'FCM token for push notifications', required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;
}

