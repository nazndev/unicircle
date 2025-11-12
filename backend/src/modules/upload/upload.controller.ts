import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  Query,
  Res,
  Req,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MobileApi } from '../../common/decorators/mobile-api.decorator';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Response, Request } from 'express';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('alumni-document')
  @Public()
  @MobileApi() // Allow mobile app access for registration (users not logged in yet)
  @ApiOperation({ summary: 'Upload alumni verification document (Mobile API only, for registration)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Temporary location - will be moved to proper structure by service
        destination: (req, file, cb) => {
          const tempDir = join(process.cwd(), 'temp-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `alumni-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadAlumniDocument(@UploadedFile() file: Express.Multer.File, @CurrentUser() user?: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // If user is authenticated, use their userId; otherwise, use null for temp storage
    const userId = user?.userId || null;
    return this.uploadService.uploadAlumniDocument(file, userId);
  }

  @Post('name-verification-document')
  @ApiOperation({ summary: 'Upload name verification document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tempDir = join(process.cwd(), 'temp-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `name-verification-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and PDF files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadNameVerificationDocument(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!user?.userId) {
      throw new BadRequestException('User must be authenticated');
    }
    try {
      return await this.uploadService.uploadAlumniDocument(file, user.userId);
    } catch (error: any) {
      console.error('[UPLOAD] Error uploading name verification document:', error);
      throw new BadRequestException(error.message || 'Failed to upload document');
    }
  }

  @Post('marketplace-image')
  @ApiOperation({ summary: 'Upload marketplace listing image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Temporary location - will be moved to proper structure by service
        destination: (req, file, cb) => {
          const tempDir = join(process.cwd(), 'temp-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `marketplace-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadMarketplaceImage(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadMarketplaceImage(file, user.userId);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        // Temporary location - will be moved to proper structure by service
        destination: (req, file, cb) => {
          const tempDir = join(process.cwd(), 'temp-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB (increased from 2MB for modern phone cameras)
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.uploadService.uploadAvatar(file, user.userId);
  }

  /**
   * Secure file download endpoint
   * Supports both authenticated access and signed URLs
   * - Authenticated: Requires JWT token and verifies file ownership/permissions
   * - Signed URL: No authentication required, but signature must be valid and not expired
   * - Public: Avatars and marketplace images are public (no auth required)
   */
  @Get('file/:type/:countryCode/:universityId/:userId/:filename')
  @Public() // Allow optional authentication (token validated if present)
  @ApiOperation({ summary: 'Download file securely' })
  async downloadFile(
    @Param('type') type: string,
    @Param('countryCode') countryCode: string,
    @Param('universityId') universityId: string,
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Query('expires') expires: string,
    @Query('signature') signature: string,
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Check if this is a signed URL request
    if (expires && signature) {
      // Verify signed URL (no authentication required)
      const isValid = this.uploadService.verifySignedUrl(
        type,
        countryCode,
        universityId,
        userId,
        filename,
        expires,
        signature,
      );

      if (!isValid) {
        throw new ForbiddenException('Invalid or expired signed URL');
      }
    } else {
      // For avatars and marketplace images, allow public access (no auth required)
      // Documents still require authentication
      if (type === 'avatars' || type === 'marketplace') {
        // Public access - no authentication required for avatars and marketplace images
        // File existence will be checked below
      } else {
        // Documents require authentication
        if (!user || !user.userId) {
          throw new ForbiddenException('Authentication required to access this file');
        }

        // Check if user is admin (admins can access all documents)
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        if (!isAdmin) {
          // For non-admins, verify user has access (owner check)
          const hasAccess = await this.uploadService.verifyFileAccess(
            type,
            countryCode,
            universityId,
            userId,
            filename,
            user.userId,
            user.profileMode || 'student',
          );

          if (!hasAccess) {
            throw new ForbiddenException('You do not have permission to access this file');
          }
        }
        // Admins can access all documents, so we skip the access check
      }
    }

    // Get file path and serve
    const filePath = await this.uploadService.getFilePath(
      type,
      countryCode,
      universityId,
      userId,
      filename,
    );

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Set secure headers
    const mimeType = this.uploadService.getMimeType(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Optimized caching strategy:
    // - Avatars and marketplace images: public cache (can be cached by CDN)
    // - Documents: private cache (only browser cache, no CDN)
    if (type === 'avatars' || type === 'marketplace') {
      // Public images: long cache with immutable flag for better performance
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Private documents: shorter cache, no public caching
      res.setHeader('Cache-Control', 'private, max-age=3600');
    }
    
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Add ETag for better caching (check if client has cached version)
    const stats = fs.statSync(filePath);
    const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version (304 Not Modified)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    return res.sendFile(filePath);
  }

  /**
   * Generate signed URL for file access (with expiration)
   */
  @Get('signed-url/:type/:countryCode/:universityId/:userId/:filename')
  @ApiOperation({ summary: 'Get signed URL for file access' })
  async getSignedUrl(
    @Param('type') type: string,
    @Param('countryCode') countryCode: string,
    @Param('universityId') universityId: string,
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @CurrentUser() user: any,
  ) {
    // Verify user has access
    const hasAccess = await this.uploadService.verifyFileAccess(
      type,
      countryCode,
      universityId,
      userId,
      filename,
      user.userId,
      user.profileMode,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    // Generate signed URL with expiration (1 hour default)
    const signedUrl = await this.uploadService.generateSignedUrl(
      type,
      countryCode,
      universityId,
      userId,
      filename,
      3600, // 1 hour expiration
    );

    return { url: signedUrl, expiresIn: 3600 };
  }
}
