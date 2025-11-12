import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BadgeModule } from '../badge/badge.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [PrismaModule, BadgeModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

