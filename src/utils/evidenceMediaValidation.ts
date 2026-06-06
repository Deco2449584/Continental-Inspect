import type { ImagePickerAsset } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';

export const MAX_VIDEO_DURATION_SEC = 30;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/** Expo reports video `duration` in milliseconds (see ImagePickerAsset). */
export function videoDurationSeconds(duration: number | null | undefined): number | null {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  // Primary unit per Expo: milliseconds.
  if (duration >= 1000) {
    return duration / 1000;
  }

  // Fallback when a provider returns whole seconds (e.g. 25 or 360).
  return duration;
}

export function isVideoDurationAllowed(duration: number | null | undefined): boolean {
  const seconds = videoDurationSeconds(duration);
  if (seconds == null) {
    return false;
  }
  return seconds <= MAX_VIDEO_DURATION_SEC;
}

export async function resolveAssetFileSizeBytes(
  uri: string,
  assetFileSize?: number,
): Promise<number | null> {
  if (assetFileSize != null && assetFileSize > 0) {
    return assetFileSize;
  }

  try {
    const file = new File(uri);
    if (file.exists && file.size > 0) {
      return file.size;
    }
  } catch {
    // Fall through to legacy API (content:// URIs on Android, etc.).
  }

  try {
    const info = await getInfoAsync(uri, { size: true });
    if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch {
    // Size unavailable.
  }

  return null;
}

export async function isPhotoSizeAllowed(
  uri: string,
  assetFileSize?: number,
): Promise<boolean> {
  const bytes = await resolveAssetFileSizeBytes(uri, assetFileSize);
  if (bytes == null) {
    return false;
  }
  return bytes <= MAX_PHOTO_BYTES;
}

export async function validatePhotoAsset(asset: ImagePickerAsset): Promise<boolean> {
  if (!asset.uri) return false;
  return isPhotoSizeAllowed(asset.uri, asset.fileSize);
}

export function validateVideoAsset(asset: ImagePickerAsset): boolean {
  if (!asset.uri) return false;
  return isVideoDurationAllowed(asset.duration);
}

export const PHOTO_TOO_LARGE_MODAL = {
  title: 'Image Too Large',
  message:
    'Even after WebP optimization the photo exceeds 3 MB. Try a closer shot or lower resolution.',
  icon: 'image-outline' as const,
};

export const VIDEO_TOO_LONG_MODAL = {
  title: 'Video Too Long',
  message:
    'The video exceeds the 30-second limit. Please record a shorter clip to save bandwidth.',
  icon: 'videocam-outline' as const,
};

export const MAX_PHOTOS_MODAL = {
  title: 'Maximum 3 photos allowed',
  message: 'You can only attach up to 3 photos per inspection. Remove one to add another.',
  icon: 'images-outline' as const,
};
