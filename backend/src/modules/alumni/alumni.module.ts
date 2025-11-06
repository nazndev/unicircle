import { Module } from '@nestjs/common';
import { AlumniCleanupService } from './alumni-cleanup.service';

@Module({
  providers: [AlumniCleanupService],
})
export class AlumniModule {}

