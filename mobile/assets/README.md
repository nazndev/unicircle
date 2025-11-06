# Mobile App Assets

## Required Assets

All required assets are present and configured in `app.json`:

### ✅ Current Assets

1. **icon.png** (1024x1024)
   - App icon for iOS and Android
   - Referenced in: `app.json` → `icon`

2. **adaptive-icon.png** (1024x1024)
   - Android adaptive icon foreground
   - Referenced in: `app.json` → `android.adaptiveIcon.foregroundImage`

3. **splash.png** (1242x2436 recommended)
   - Splash screen image
   - Referenced in: `app.json` → `splash.image`
   - Background color: `#5C7AEA` (UniCircle purple)

4. **favicon.png** (48x48 or 64x64)
   - Web favicon
   - Referenced in: `app.json` → `web.favicon`

## Asset Specifications

### Icon Requirements
- **Format**: PNG
- **Size**: 1024x1024 pixels
- **Background**: Transparent (for icon.png)
- **Content**: Should be centered with padding

### Splash Screen Requirements
- **Format**: PNG
- **Size**: 1242x2436 pixels (iPhone X/11/12/13/14)
- **Background**: Will use `#5C7AEA` as fallback
- **Content**: Should be centered

### Adaptive Icon (Android)
- **Format**: PNG
- **Size**: 1024x1024 pixels
- **Safe Zone**: Keep important content within 512x512 center area
- **Background**: `#5C7AEA` (configured in app.json)

## Asset Generation

To regenerate assets with proper sizes:

```bash
# Using Expo tools
npx expo install @expo/image-utils
npx expo-asset-generator

# Or use online tools:
# - https://www.appicon.co/
# - https://www.favicon-generator.org/
```

## Notes

- All assets are included in the build via `assetBundlePatterns: ["**/*"]`
- Assets are optimized automatically by Expo during build
- For production builds, ensure assets are high quality and properly sized

