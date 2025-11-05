export interface CachedImageProps {
  source: { uri: string } | string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

