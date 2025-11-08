import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageOptimizationService } from './image-optimization.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Injectable()
export class UploadService {
  private readonly storageBasePath: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private imageOptimization: ImageOptimizationService,
  ) {
    // Get storage path from environment variable, fallback to default location
    const envStoragePath = this.configService.get<string>('STORAGE_PATH');
    if (envStoragePath) {
      // Use absolute path from env if provided
      this.storageBasePath = path.isAbsolute(envStoragePath) 
        ? envStoragePath 
        : path.resolve(process.cwd(), envStoragePath);
    } else {
      // Default: storage folder outside backend (at project root)
      this.storageBasePath = path.resolve(__dirname, '../../../storage');
    }
    
    // Ensure storage directories exist
    this.ensureStorageDirectories();
  }

  private ensureStorageDirectories() {
    const baseDirs = ['avatars', 'documents', 'marketplace'];
    baseDirs.forEach(dir => {
      const fullPath = path.join(this.storageBasePath, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * Get user's country and university info for folder structure
   */
  private async getUserPathInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        universityId: true,
      },
    });

    let countryCode = 'unknown';
    let universityId = 'unknown';

    if (user?.universityId) {
      const university = await this.prisma.university.findUnique({
        where: { id: user.universityId },
      }) as any;

      if (university) {
        universityId = university.id;
        
        if (university.countryId) {
          const country = await (this.prisma as any).country.findUnique({
            where: { id: university.countryId },
          });
          
          if (country?.code) {
            countryCode = country.code.toLowerCase();
          }
        }
      }
    }
    
    return {
      countryCode: countryCode.replace(/[^a-z0-9]/g, '_'), // Sanitize for filesystem
      universityId: universityId.replace(/[^a-z0-9-]/g, '_'), // Sanitize for filesystem
      userId: userId.replace(/[^a-z0-9-]/g, '_'), // Sanitize for filesystem
    };
  }

  /**
   * Create directory structure: storage/{type}/{countryCode}/{universityId}/{userId}/
   */
  private async createUserDirectory(type: string, userId: string): Promise<string> {
    const { countryCode, universityId, userId: sanitizedUserId } = await this.getUserPathInfo(userId);
    const userDir = path.join(
      this.storageBasePath,
      type,
      countryCode,
      universityId,
      sanitizedUserId
    );

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    return userDir;
  }


  async uploadAlumniDocument(file: Express.Multer.File, userId: string | null) {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    
    // If no userId (registration flow), store in temp and return temp URL
    if (!userId) {
      // Keep file in temp-uploads directory
      // Return a temp URL that will be moved to user folder after registration
      const tempUrl = `${baseUrl}/api/upload/temp/${file.filename}`;
      
      return {
        url: tempUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        temp: true, // Flag to indicate this is a temp file
        tempPath: file.path, // Store the temp path for later moving
      };
    }

    // If userId exists (authenticated user), move to user directory
    const userDir = await this.createUserDirectory('documents', userId);
    const newPath = path.join(userDir, file.filename);
    
    // Move file from temp location to user directory
    if (fs.existsSync(file.path)) {
      fs.renameSync(file.path, newPath);
    }

    const { countryCode, universityId, userId: sanitizedUserId } = await this.getUserPathInfo(userId);
    // Use secure endpoint instead of direct /storage access
    const fileUrl = `${baseUrl}/api/upload/file/documents/${countryCode}/${universityId}/${sanitizedUserId}/${file.filename}`;

    return {
      url: fileUrl,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async uploadMarketplaceImage(file: Express.Multer.File, userId: string) {
    const userDir = await this.createUserDirectory('marketplace', userId);
    const { countryCode, universityId, userId: sanitizedUserId } = await this.getUserPathInfo(userId);
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');

    // Extract base filename without extension
    const fileExt = path.extname(file.filename);
    const baseFilename = path.basename(file.filename, fileExt);

    try {
      // Optimize marketplace image with multiple sizes
      const optimized = await this.imageOptimization.optimizeImage(
        file.path,
        userDir,
        baseFilename,
        { thumbnail: true, medium: true, full: true },
      );

      // Clean up original temp file
      await this.imageOptimization.cleanupTempFile(file.path);

      // Use medium size as default for marketplace listings
      const defaultSize = optimized.medium || optimized.full || optimized.thumbnail;
      if (!defaultSize) {
        throw new Error('Failed to generate optimized image');
      }

      // Generate URL for the optimized image
      const relativePath = path.relative(this.storageBasePath, defaultSize.path);
      const pathParts = relativePath.split(path.sep);
      const fileUrl = `${baseUrl}/api/upload/file/${pathParts.join('/')}`;

      return {
        url: fileUrl,
        filename: path.basename(defaultSize.path),
        size: defaultSize.size,
        mimetype: `image/${optimized.format}`,
        sizes: {
          thumbnail: optimized.thumbnail
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.thumbnail.path).split(path.sep).join('/')}`
            : undefined,
          medium: optimized.medium
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.medium.path).split(path.sep).join('/')}`
            : undefined,
          full: optimized.full
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.full.path).split(path.sep).join('/')}`
            : undefined,
        },
        optimization: {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio,
        },
      };
    } catch (error) {
      // Fallback to original file if optimization fails
      const newPath = path.join(userDir, file.filename);
      if (fs.existsSync(file.path)) {
        fs.renameSync(file.path, newPath);
      }

      const fileUrl = `${baseUrl}/api/upload/file/marketplace/${countryCode}/${universityId}/${sanitizedUserId}/${file.filename}`;

      return {
        url: fileUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    const userDir = await this.createUserDirectory('avatars', userId);
    const { countryCode, universityId, userId: sanitizedUserId } = await this.getUserPathInfo(userId);
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');

    // Extract base filename without extension
    const fileExt = path.extname(file.filename);
    const baseFilename = path.basename(file.filename, fileExt);

    try {
      // Optimize avatar with multiple sizes
      const optimized = await this.imageOptimization.optimizeAvatar(
        file.path,
        userDir,
        baseFilename,
      );

      // Clean up original temp file
      await this.imageOptimization.cleanupTempFile(file.path);

      // Use medium size as default (300x300) for avatars
      const defaultSize = optimized.medium || optimized.full || optimized.thumbnail;
      if (!defaultSize) {
        throw new Error('Failed to generate optimized avatar');
      }

      // Generate URL for the optimized image
      const relativePath = path.relative(this.storageBasePath, defaultSize.path);
      const pathParts = relativePath.split(path.sep);
      const fileUrl = `${baseUrl}/api/upload/file/${pathParts.join('/')}`;

      // Update user avatar with optimized URL
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: fileUrl },
      });

      return {
        url: fileUrl,
        filename: path.basename(defaultSize.path),
        size: defaultSize.size,
        mimetype: `image/${optimized.format}`,
        sizes: {
          thumbnail: optimized.thumbnail
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.thumbnail.path).split(path.sep).join('/')}`
            : undefined,
          medium: optimized.medium
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.medium.path).split(path.sep).join('/')}`
            : undefined,
          full: optimized.full
            ? `${baseUrl}/api/upload/file/${path.relative(this.storageBasePath, optimized.full.path).split(path.sep).join('/')}`
            : undefined,
        },
        optimization: {
          originalSize: optimized.originalSize,
          optimizedSize: optimized.optimizedSize,
          compressionRatio: optimized.compressionRatio,
        },
      };
    } catch (error) {
      // Fallback to original file if optimization fails
      const newPath = path.join(userDir, file.filename);
      if (fs.existsSync(file.path)) {
        fs.renameSync(file.path, newPath);
      }

      const fileUrl = `${baseUrl}/api/upload/file/avatars/${countryCode}/${universityId}/${sanitizedUserId}/${file.filename}`;

      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: fileUrl },
      });

      return {
        url: fileUrl,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
      };
    }
  }

  /**
   * Verify if user has access to a file
   */
  async verifyFileAccess(
    type: string,
    countryCode: string,
    universityId: string,
    userId: string,
    filename: string,
    requestingUserId: string,
    requestingUserProfileMode: string,
  ): Promise<boolean> {
    // Sanitize inputs to prevent path traversal
    const sanitizedType = this.sanitizePathSegment(type);
    const sanitizedCountryCode = this.sanitizePathSegment(countryCode);
    const sanitizedUniversityId = this.sanitizePathSegment(universityId);
    const sanitizedUserId = this.sanitizePathSegment(userId);
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Validate type
    if (!['avatars', 'documents', 'marketplace'].includes(sanitizedType)) {
      return false;
    }

    // Check if file exists
    const filePath = path.join(
      this.storageBasePath,
      sanitizedType,
      sanitizedCountryCode,
      sanitizedUniversityId,
      sanitizedUserId,
      sanitizedFilename,
    );

    // Prevent path traversal - ensure resolved path is within storage base
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.storageBasePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return false;
    }

    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Access control rules:
    // 1. Users can always access their own files
    const requestingUserInfo = await this.getUserPathInfo(requestingUserId);
    const fileOwnerInfo = {
      countryCode: sanitizedCountryCode,
      universityId: sanitizedUniversityId,
      userId: sanitizedUserId,
    };

    // Check if requesting user owns the file
    if (
      requestingUserInfo.countryCode === fileOwnerInfo.countryCode &&
      requestingUserInfo.universityId === fileOwnerInfo.universityId &&
      requestingUserInfo.userId === fileOwnerInfo.userId
    ) {
      return true;
    }

    // 2. Avatars are public (anyone can view)
    if (sanitizedType === 'avatars') {
      return true;
    }

    // 3. Marketplace images are public
    if (sanitizedType === 'marketplace') {
      return true;
    }

    // 4. Documents are private (only owner or admin can access)
    if (sanitizedType === 'documents') {
      // Check if user is admin
      const user = await this.prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { role: true },
      });
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Get file path safely (with path traversal protection)
   */
  async getFilePath(
    type: string,
    countryCode: string,
    universityId: string,
    userId: string,
    filename: string,
  ): Promise<string | null> {
    // Sanitize all inputs
    const sanitizedType = this.sanitizePathSegment(type);
    const sanitizedCountryCode = this.sanitizePathSegment(countryCode);
    const sanitizedUniversityId = this.sanitizePathSegment(universityId);
    const sanitizedUserId = this.sanitizePathSegment(userId);
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Validate type
    if (!['avatars', 'documents', 'marketplace'].includes(sanitizedType)) {
      return null;
    }

    const filePath = path.join(
      this.storageBasePath,
      sanitizedType,
      sanitizedCountryCode,
      sanitizedUniversityId,
      sanitizedUserId,
      sanitizedFilename,
    );

    // Prevent path traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.storageBasePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return null;
    }

    return filePath;
  }

  /**
   * Generate signed URL with expiration
   */
  async generateSignedUrl(
    type: string,
    countryCode: string,
    universityId: string,
    userId: string,
    filename: string,
    expiresIn: number = 3600, // Default 1 hour
  ): Promise<string> {
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    
    // Create signature payload
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `${type}/${countryCode}/${universityId}/${userId}/${filename}:${expiresAt}`;
    
    // Generate HMAC signature
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Return signed URL
    const signedUrl = `${baseUrl}/api/upload/file/${type}/${countryCode}/${universityId}/${userId}/${filename}?expires=${expiresAt}&signature=${signature}`;
    return signedUrl;
  }

  /**
   * Verify signed URL signature
   */
  verifySignedUrl(
    type: string,
    countryCode: string,
    universityId: string,
    userId: string,
    filename: string,
    expires: string,
    signature: string,
  ): boolean {
    const secret = this.configService.get<string>('JWT_SECRET') || 'default-secret';
    
    // Check expiration
    const expiresAt = parseInt(expires, 10);
    if (Date.now() / 1000 > expiresAt) {
      return false;
    }

    // Verify signature
    const payload = `${type}/${countryCode}/${universityId}/${userId}/${filename}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Get MIME type from filename
   */
  getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.gif': 'image/gif',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Sanitize path segment to prevent path traversal
   */
  private sanitizePathSegment(segment: string): string {
    return segment.replace(/[^a-z0-9_-]/gi, '_').replace(/\.\./g, '');
  }

  /**
   * Move temp files to user's folder after registration
   * @param userId The user ID
   * @param documentUrls Array of document URLs (may include temp URLs)
   * @returns Array of final document URLs
   */
  async moveTempFilesToUserFolder(userId: string, documentUrls: string[]): Promise<string[]> {
    const baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    const tempDir = path.join(process.cwd(), 'temp-uploads');
    const finalUrls: string[] = [];

    console.log('[UPLOAD SERVICE] Moving temp files to user folder:', {
      userId,
      documentCount: documentUrls.length,
      tempDir,
      urls: documentUrls,
    });

    for (const url of documentUrls) {
      // Check if this is a temp URL
      if (url.includes('/api/upload/temp/')) {
        // Extract filename from temp URL
        const filename = url.split('/api/upload/temp/')[1];
        const tempFilePath = path.join(tempDir, filename);

        console.log('[UPLOAD SERVICE] Processing temp file:', {
          url,
          filename,
          tempFilePath,
          exists: fs.existsSync(tempFilePath),
        });

        // Check if temp file exists
        if (fs.existsSync(tempFilePath)) {
          // Move to user's documents folder
          const userDir = await this.createUserDirectory('documents', userId);
          const { countryCode, universityId, userId: sanitizedUserId } = await this.getUserPathInfo(userId);
          const finalPath = path.join(userDir, filename);

          console.log('[UPLOAD SERVICE] Moving file:', {
            from: tempFilePath,
            to: finalPath,
            userDir,
            countryCode,
            universityId,
            sanitizedUserId,
          });

          // Move file
          fs.renameSync(tempFilePath, finalPath);

          // Verify file was moved
          if (fs.existsSync(finalPath)) {
            console.log('[UPLOAD SERVICE] File successfully moved to:', finalPath);
          } else {
            console.error('[UPLOAD SERVICE] File move failed - destination does not exist:', finalPath);
          }

          // Generate final URL
          const finalUrl = `${baseUrl}/api/upload/file/documents/${countryCode}/${universityId}/${sanitizedUserId}/${filename}`;
          finalUrls.push(finalUrl);
        } else {
          // Temp file not found, keep original URL (might be from a previous registration attempt)
          console.warn(`[UPLOAD SERVICE] Temp file not found: ${tempFilePath}, keeping original URL: ${url}`);
          finalUrls.push(url);
        }
      } else {
        // Not a temp URL, keep as is
        console.log('[UPLOAD SERVICE] Not a temp URL, keeping as is:', url);
        finalUrls.push(url);
      }
    }

    console.log('[UPLOAD SERVICE] Final document URLs:', finalUrls);
    return finalUrls;
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  private sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    return filename
      .replace(/[\/\\]/g, '_')
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '_')
      .trim();
  }
}

