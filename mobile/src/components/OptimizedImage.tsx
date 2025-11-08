import React, { useState, useEffect } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, ImageStyle, ViewStyle } from 'react-native';

interface OptimizedImageProps {
  source: string | { uri: string } | { sizes?: { thumbnail?: string; medium?: string; full?: string }; url: string };
  style?: ImageStyle | ImageStyle[];
  size?: 'thumbnail' | 'medium' | 'full';
  placeholder?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * OptimizedImage component with lazy loading and progressive loading
 * Automatically selects appropriate image size based on display size
 */
export default function OptimizedImage({
  source,
  style,
  size,
  placeholder,
  resizeMode = 'cover',
  onLoadStart,
  onLoadEnd,
  onError,
}: OptimizedImageProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [source, size]);

  const loadImage = () => {
    setLoading(true);
    setError(false);

    try {
      let uri: string | null = null;

      if (typeof source === 'string') {
        uri = source;
      } else if (source && typeof source === 'object') {
        if ('uri' in source) {
          uri = source.uri;
        } else if ('sizes' in source && source.sizes) {
          // Use size-specific URL if available
          if (size === 'thumbnail' && source.sizes.thumbnail) {
            uri = source.sizes.thumbnail;
          } else if (size === 'medium' && source.sizes.medium) {
            uri = source.sizes.medium;
          } else if (size === 'full' && source.sizes.full) {
            uri = source.sizes.full;
          } else {
            // Fallback to default URL or best available size
            uri = source.sizes.medium || source.sizes.thumbnail || source.sizes.full || source.url;
          }
        } else if ('url' in source) {
          uri = source.url;
        }
      }

      console.log('[OptimizedImage] Loading image:', { uri, size, hasSource: !!source });
      
      if (uri) {
        setImageUri(uri);
      } else {
        console.warn('[OptimizedImage] No URI found for source:', source);
        setError(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('[OptimizedImage] Error loading image:', err);
      setError(true);
      setLoading(false);
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  const handleError = (err: any) => {
    console.error('[OptimizedImage] Image load error:', {
      uri: imageUri,
      error: err,
      source: source,
    });
    setError(true);
    setLoading(false);
    onError?.(err);
  };

  if (error || !imageUri) {
    return (
      <View style={[styles.container, style]}>
        {placeholder || <View style={styles.placeholder} />}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, style]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          {placeholder || <ActivityIndicator size="small" color="#5C7AEA" />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
});

