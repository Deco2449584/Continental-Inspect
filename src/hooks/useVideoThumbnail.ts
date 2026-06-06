import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';

export function useVideoThumbnail(videoUrl: string | null | undefined) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!videoUrl) {
      setThumbnailUri(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setThumbnailUri(null);

    VideoThumbnails.getThumbnailAsync(videoUrl, {
      time: 500,
      quality: 0.82,
    })
      .then(({ uri }) => {
        if (!cancelled) {
          setThumbnailUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThumbnailUri(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  return { thumbnailUri, isLoadingThumbnail: isLoading };
}
