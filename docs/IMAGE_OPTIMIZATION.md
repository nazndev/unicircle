# Image Optimization Strategy

## Overview
This document outlines the comprehensive image optimization strategy implemented for UniCircle to handle large image uploads efficiently, optimize storage, and improve loading performance.

## Backend Implementation

### 1. Image Processing with Sharp
- **Library**: `sharp` - High-performance image processing library
- **Features**:
  - Automatic format conversion to WebP (better compression)
  - Multiple size generation
  - Quality optimization
  - Square crop for avatars

### 2. Multiple Image Sizes

#### Avatars
- **Thumbnail**: 150x150px (80% quality) - For lists and small displays
- **Medium**: 300x300px (85% quality) - Default for profile screens
- **Full**: 600x600px (90% quality) - High-quality display

#### Marketplace Images
- **Thumbnail**: 150x150px (80% quality) - Grid views
- **Medium**: 512x512px (85% quality) - Default for listings
- **Full**: 1920x1920px (90% quality) - Full-size view

### 3. Storage Structure
```
storage/
  ├── avatars/
  │   └── {countryCode}/
  │       └── {universityId}/
  │           └── {userId}/
  │               ├── {filename}_thumb.webp
  │               ├── {filename}_medium.webp
  │               ├── {filename}_full.webp
  │               └── {filename}.webp
  └── marketplace/
      └── {countryCode}/
          └── {universityId}/
              └── {userId}/
                  ├── {filename}_thumb.webp
                  ├── {filename}_medium.webp
                  ├── {filename}_full.webp
                  └── {filename}.webp
```

### 4. API Response Format
```json
{
  "url": "https://api.unicircle.pro/api/upload/file/avatars/BD/NSU/user123/avatar_medium.webp",
  "filename": "avatar_medium.webp",
  "size": 45678,
  "mimetype": "image/webp",
  "sizes": {
    "thumbnail": "https://api.unicircle.pro/api/upload/file/avatars/BD/NSU/user123/avatar_thumb.webp",
    "medium": "https://api.unicircle.pro/api/upload/file/avatars/BD/NSU/user123/avatar_medium.webp",
    "full": "https://api.unicircle.pro/api/upload/file/avatars/BD/NSU/user123/avatar_full.webp"
  },
  "optimization": {
    "originalSize": 2048576,
    "optimizedSize": 234567,
    "compressionRatio": 88.5
  }
}
```

## Mobile App Implementation

### 1. OptimizedImage Component
- **Location**: `mobile/src/components/OptimizedImage.tsx`
- **Features**:
  - Automatic size selection based on display context
  - Lazy loading support
  - Progressive loading with placeholder
  - Error handling with fallback

### 2. Usage Example
```tsx
<OptimizedImage
  source={user.avatarSizes ? { url: user.avatarUrl, sizes: user.avatarSizes } : user.avatarUrl}
  style={styles.avatar}
  size="medium" // or "thumbnail" | "full"
  resizeMode="cover"
  placeholder={<ActivityIndicator />}
/>
```

### 3. Size Selection Strategy
- **Thumbnail**: Used in lists, feeds, comments
- **Medium**: Default for profile pictures, marketplace listings
- **Full**: Used when user taps to view full image

## Performance Benefits

### 1. Upload Optimization
- **Before**: 2-5MB original images
- **After**: 50-200KB optimized images (88-95% reduction)
- **Result**: Faster uploads, reduced bandwidth

### 2. Storage Optimization
- **WebP Format**: 25-35% smaller than JPEG
- **Multiple Sizes**: Only load what's needed
- **Result**: 70-90% storage savings

### 3. Loading Performance
- **Lazy Loading**: Images load only when visible
- **Progressive Loading**: Show placeholder → thumbnail → full
- **Result**: Faster page loads, better UX

## Configuration

### Environment Variables
```env
STORAGE_PATH=/path/to/storage  # Optional, defaults to project root/storage
API_BASE_URL=https://api.unicircle.pro
```

### Upload Limits
- **Avatar**: 5MB (increased from 2MB)
- **Marketplace**: 10MB
- **Body Parser**: 10MB

## Best Practices

### 1. Client-Side Compression
- Mobile app compresses images before upload (quality: 0.7)
- Square aspect ratio for avatars
- Reduces upload time and server processing

### 2. Server-Side Optimization
- Always generate multiple sizes
- Use WebP format for better compression
- Maintain original for future reprocessing

### 3. CDN Integration (Future)
- Store optimized images on CDN
- Use CDN URLs in API responses
- Enable edge caching for faster delivery

## Monitoring

### Metrics to Track
1. **Average file size reduction**
2. **Upload success rate**
3. **Image load times**
4. **Storage usage**
5. **Bandwidth consumption**

### Logging
- Image optimization logs include:
  - Original size
  - Optimized size
  - Compression ratio
  - Processing time

## Future Enhancements

1. **CDN Integration**: Move images to CloudFront/Cloudflare
2. **Image CDN**: Use services like Cloudinary or Imgix
3. **Progressive JPEG**: For better perceived performance
4. **Lazy Loading**: Implement intersection observer for web
5. **Image Caching**: Implement aggressive caching strategy
6. **Auto Cleanup**: Remove unused image sizes periodically

## Troubleshooting

### Issue: Images not optimizing
- Check Sharp installation
- Verify file permissions
- Check storage path configuration

### Issue: Large uploads still failing
- Verify body parser limits
- Check multer file size limits
- Ensure client-side compression is enabled

### Issue: Slow image loading
- Check network conditions
- Verify CDN configuration (if used)
- Ensure correct size is being requested

