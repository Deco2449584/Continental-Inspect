import { Video } from 'react-native-compressor';

/** Max long edge in px — keeps detail readable on warehouse evidence clips. */
const VIDEO_MAX_DIMENSION = 1280;

/** Target bitrate (~2.5 Mbps) for 720p–1080p evidence without heavy files. */
const VIDEO_TARGET_BITRATE = 2_500_000;

export type CompressVideoProgress = (progress: number) => void;

/**
 * Compresses a local video URI before upload. Returns the compressed file URI.
 * Falls back to the source URI if compression yields nothing.
 */
export async function compressVideoEvidenceUri(
  sourceUri: string,
  onProgress?: CompressVideoProgress,
): Promise<string> {
  const compressedUri = await Video.compress(
    sourceUri,
    {
      compressionMethod: 'manual',
      maxSize: VIDEO_MAX_DIMENSION,
      bitrate: VIDEO_TARGET_BITRATE,
    },
    (progress) => {
      onProgress?.(progress);
    },
  );

  return compressedUri || sourceUri;
}
