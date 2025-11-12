import { Module } from '@nestjs/common';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BadgeModule } from '../badge/badge.module';

@Module({
  imports: [PrismaModule, BadgeModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}

