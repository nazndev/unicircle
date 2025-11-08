import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface ImageSizes {
  thumbnail: { width: number; height: number; quality: number };
  medium: { width: number; height: number; quality: number };
  full: { width: number; height: number; quality: number };
}

export interface OptimizedImageResult {
  original: {
    path: string;
    size: number;
    url: string;
  };
  thumbnail?: {
    path: string;
    size: number;
    url: string;
  };
  medium?: {
    path: string;
    size: number;
    url: string;
  };
  full?: {
    path: string;
    size: number;
    url: string;
  };
  format: string; // webp, jpeg, png
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  // Image size presets
  private readonly imageSizes: ImageSizes = {
    thumbnail: { width: 150, height: 150, quality: 80 },
    medium: { width: 512, height: 512, quality: 85 },
    full: { width: 1920, height: 1920, quality: 90 },
  };

  /**
   * Optimize and resize image with multiple sizes
   */
  async optimizeImage(
    inputPath: string,
    outputDir: string,
    baseFilename: string,
    generateSizes: { thumbnail?: boolean; medium?: boolean; full?: boolean } = {
      thumbnail: true,
      medium: true,
      full: true,
    },
  ): Promise<OptimizedImageResult> {
    try {
      // Get original file size
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      // Determine best format (prefer WebP for better compression)
      const metadata = await sharp(inputPath).metadata();
      const format = this.determineBestFormat(metadata.format);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const results: OptimizedImageResult = {
        original: { path: '', size: 0, url: '' },
        format,
        originalSize,
        optimizedSize: 0,
        compressionRatio: 0,
      };

      let totalOptimizedSize = 0;

      // Generate thumbnail (150x150)
      if (generateSizes.thumbnail) {
        const thumbPath = path.join(outputDir, `${baseFilename}_thumb.${format}`);
        await sharp(inputPath)
          .resize(this.imageSizes.thumbnail.width, this.imageSizes.thumbnail.height, {
            fit: 'cover',
            position: 'center',
          })
          .toFormat(format as any, { quality: this.imageSizes.thumbnail.quality })
          .toFile(thumbPath);

        const thumbStats = fs.statSync(thumbPath);
        results.thumbnail = {
          path: thumbPath,
          size: thumbStats.size,
          url: thumbPath, // Will be replaced with actual URL
        };
        totalOptimizedSize += thumbStats.size;
      }

      // Generate medium size (512x512)
      if (generateSizes.medium) {
        const mediumPath = path.join(outputDir, `${baseFilename}_medium.${format}`);
        await sharp(inputPath)
          .resize(this.imageSizes.medium.width, this.imageSizes.medium.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(format as any, { quality: this.imageSizes.medium.quality })
          .toFile(mediumPath);

        const mediumStats = fs.statSync(mediumPath);
        results.medium = {
          path: mediumPath,
          size: mediumStats.size,
          url: mediumPath, // Will be replaced with actual URL
        };
        totalOptimizedSize += mediumStats.size;
      }

      // Generate full size (max 1920x1920, optimized)
      if (generateSizes.full) {
        const fullPath = path.join(outputDir, `${baseFilename}_full.${format}`);
        await sharp(inputPath)
          .resize(this.imageSizes.full.width, this.imageSizes.full.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(format as any, { quality: this.imageSizes.full.quality })
          .toFile(fullPath);

        const fullStats = fs.statSync(fullPath);
        results.full = {
          path: fullPath,
          size: fullStats.size,
          url: fullPath, // Will be replaced with actual URL
        };
        totalOptimizedSize += fullStats.size;
      }

      // Store original (compressed if possible)
      const originalPath = path.join(outputDir, `${baseFilename}_original.${format}`);
      await sharp(inputPath)
        .toFormat(format as any, { quality: 90 })
        .toFile(originalPath);

      const originalStatsNew = fs.statSync(originalPath);
      results.original = {
        path: originalPath,
        size: originalStatsNew.size,
        url: originalPath,
      };
      totalOptimizedSize += originalStatsNew.size;

      results.optimizedSize = totalOptimizedSize;
      results.compressionRatio = ((originalSize - totalOptimizedSize) / originalSize) * 100;

      this.logger.log(
        `Image optimized: ${(originalSize / 1024).toFixed(2)}KB -> ${(totalOptimizedSize / 1024).toFixed(2)}KB (${results.compressionRatio.toFixed(1)}% reduction)`,
      );

      return results;
    } catch (error) {
      this.logger.error(`Failed to optimize image: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Optimize single image (for avatars - square crop)
   */
  async optimizeAvatar(
    inputPath: string,
    outputDir: string,
    baseFilename: string,
  ): Promise<OptimizedImageResult> {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      const metadata = await sharp(inputPath).metadata();
      const format = 'webp'; // Always use WebP for avatars

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Avatar sizes: 150x150 (thumbnail), 300x300 (medium), 600x600 (full)
      const avatarSizes = [
        { name: 'thumb', size: 150, quality: 80 },
        { name: 'medium', size: 300, quality: 85 },
        { name: 'full', size: 600, quality: 90 },
      ];

      const results: OptimizedImageResult = {
        original: { path: '', size: 0, url: '' },
        format,
        originalSize,
        optimizedSize: 0,
        compressionRatio: 0,
      };

      let totalOptimizedSize = 0;

      // Generate all avatar sizes
      for (const sizeConfig of avatarSizes) {
        const outputPath = path.join(outputDir, `${baseFilename}_${sizeConfig.name}.${format}`);
        
        await sharp(inputPath)
          .resize(sizeConfig.size, sizeConfig.size, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: sizeConfig.quality })
          .toFile(outputPath);

        const stats = fs.statSync(outputPath);
        
        if (sizeConfig.name === 'thumb') {
          results.thumbnail = { path: outputPath, size: stats.size, url: outputPath };
        } else if (sizeConfig.name === 'medium') {
          results.medium = { path: outputPath, size: stats.size, url: outputPath };
        } else if (sizeConfig.name === 'full') {
          results.full = { path: outputPath, size: stats.size, url: outputPath };
        }

        totalOptimizedSize += stats.size;
      }

      // Store optimized original (use full size as original)
      const originalPath = path.join(outputDir, `${baseFilename}.${format}`);
      // Copy the full size as the original
      if (results.full) {
        fs.copyFileSync(results.full.path, originalPath);
        const originalStatsNew = fs.statSync(originalPath);
        results.original = {
          path: originalPath,
          size: originalStatsNew.size,
          url: originalPath,
        };
      } else {
        // Fallback: create optimized version
        await sharp(inputPath)
          .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 90 })
          .toFile(originalPath);
        const originalStatsNew = fs.statSync(originalPath);
        results.original = {
          path: originalPath,
          size: originalStatsNew.size,
          url: originalPath,
        };
        totalOptimizedSize += originalStatsNew.size;
      }

      results.optimizedSize = totalOptimizedSize;
      results.compressionRatio = ((originalSize - totalOptimizedSize) / originalSize) * 100;

      this.logger.log(
        `Avatar optimized: ${(originalSize / 1024).toFixed(2)}KB -> ${(totalOptimizedSize / 1024).toFixed(2)}KB (${results.compressionRatio.toFixed(1)}% reduction)`,
      );

      return results;
    } catch (error) {
      this.logger.error(`Failed to optimize avatar: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Determine best format for output
   */
  private determineBestFormat(inputFormat?: string): string {
    // Prefer WebP for better compression, fallback to JPEG
    if (inputFormat === 'png' && this.supportsWebP()) {
      return 'webp';
    }
    return 'webp'; // Always use WebP for modern browsers
  }

  /**
   * Check if WebP is supported (always true for server-side)
   */
  private supportsWebP(): boolean {
    return true; // Sharp supports WebP
  }

  /**
   * Get file size in human-readable format
   */
  getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.debug(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
    }
  }
}

