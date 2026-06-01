import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export type DownloadVideoEvidenceResult =
  | { ok: true }
  | { ok: false; reason: 'permission_denied' | 'download_failed' };

function extensionFromUrl(url: string): string {
  const match = url.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
  return match?.[1]?.toLowerCase() ?? 'mp4';
}

export async function ensureMediaLibrarySavePermission(): Promise<boolean> {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await MediaLibrary.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Downloads a Firebase Storage video URL to cache, then saves it to the device gallery.
 */
export async function downloadVideoEvidenceToGallery(
  remoteUrl: string,
  index: number,
): Promise<DownloadVideoEvidenceResult> {
  const permitted = await ensureMediaLibrarySavePermission();
  if (!permitted) {
    return { ok: false, reason: 'permission_denied' };
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return { ok: false, reason: 'download_failed' };
  }

  const ext = extensionFromUrl(remoteUrl);
  const localUri = `${cacheDir}cargo-evidence-${Date.now()}-${index}.${ext}`;

  try {
    const download = await FileSystem.downloadAsync(remoteUrl, localUri);
    await MediaLibrary.saveToLibraryAsync(download.uri);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'download_failed' };
  }
}
