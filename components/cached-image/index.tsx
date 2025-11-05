import React, { useState, useEffect, FC } from 'react';
import { Image, ImageProps, ActivityIndicator, View, StyleSheet } from 'react-native';
import { imageCache } from '../../services/utils/image-cache';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

const CachedImage: FC<CachedImageProps> = ({
  source,
  placeholder,
  fallback,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...props
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const uri = typeof source === 'string' ? source : source.uri;

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!uri) {
        setLoading(false);
        setError(true);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        onLoadStart?.();

        // Check for synchronous cached version first
        const cachedUri = imageCache.getCachedImageUriSync(uri);
        
        if (cachedUri) {
          if (isMounted) {
            setImageUri(cachedUri);
            setLoading(false);
            onLoadEnd?.();
          }
          // Preload next time in background
          imageCache.preloadImage(uri).catch(() => {});
        } else {
          // Get or download image
          const localPath = await imageCache.getCachedImagePath(uri);
          
          if (isMounted) {
            if (localPath) {
              setImageUri(localPath);
              setLoading(false);
              onLoadEnd?.();
            } else {
              setError(true);
              setLoading(false);
              onError?.(new Error('Failed to load image'));
              onLoadEnd?.();
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
          onError?.(err);
          onLoadEnd?.();
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [uri]);

  // Show placeholder while loading
  if (loading && placeholder) {
    return <View style={style}>{placeholder}</View>;
  }

  // Show fallback on error
  if (error && fallback) {
    return <View style={style}>{fallback}</View>;
  }

  // Show loading indicator if no placeholder provided
  if (loading && !placeholder) {
    return (
      <View style={[style, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  // Show nothing if error and no fallback
  if (error && !fallback) {
    return <View style={style} />;
  }

  // Render image
  if (imageUri) {
    return (
      <Image
        {...props}
        source={{ uri: imageUri }}
        style={style}
        onLoadEnd={() => {
          setLoading(false);
          onLoadEnd?.();
        }}
        onError={(err) => {
          setError(true);
          setLoading(false);
          onError?.(err);
          onLoadEnd?.();
        }}
      />
    );
  }

  // Fallback to original URI if cache failed
  if (uri) {
    return (
      <Image
        {...props}
        source={{ uri }}
        style={style}
        onLoadEnd={onLoadEnd}
        onError={(err) => {
          setError(true);
          onError?.(err);
          onLoadEnd?.();
        }}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default CachedImage;

