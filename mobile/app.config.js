// app.config.js - Use this instead of app.json for environment variables
// This file can read from process.env without exposing secrets in git

module.exports = {
  expo: {
    name: "UniCircle",
    slug: "unicircle",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#2358D6"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.unicircle.app",
      infoPlist: {
        NSPhotoLibraryUsageDescription: "UniCircle needs access to your photos to upload profile pictures and marketplace listings.",
        NSCameraUsageDescription: "UniCircle needs access to your camera to take photos for marketplace listings."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#2358D6"
      },
      package: "com.unicircle.app",
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "DETECT_SCREEN_CAPTURE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      "expo-notifications",
      "expo-image-picker",
      "expo-font"
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000/api",
      // API key from environment variable - NEVER commit this to git
      mobileApiKey: process.env.EXPO_PUBLIC_MOBILE_API_KEY || "",
    }
  }
};

