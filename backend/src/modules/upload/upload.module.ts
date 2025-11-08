import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ImageOptimizationService } from './image-optimization.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, ImageOptimizationService],
  exports: [UploadService, ImageOptimizationService],
})
export class UploadModule {}

