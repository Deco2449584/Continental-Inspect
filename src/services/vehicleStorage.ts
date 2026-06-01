import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/services/firebaseConfig';

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.(jpe?g|png|webp|heic)(\?|$)/i);
  return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
}

function isRemoteUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read image file (${response.status}).`);
  }
  return response.blob();
}

export async function uploadVehicleImages(
  userId: string,
  vehicleId: string,
  localUris: string[],
): Promise<string[]> {
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const downloadUrls: string[] = [];

  for (let index = 0; index < localUris.length; index += 1) {
    const uri = localUris[index];

    if (isRemoteUrl(uri)) {
      downloadUrls.push(uri);
      continue;
    }

    const ext = extensionFromUri(uri);
    const objectPath = `vehicles/${userId}/${vehicleId}/${Date.now()}-${index}.${ext}`;
    const objectRef = ref(storage, objectPath);
    const blob = await uriToBlob(uri);

    await uploadBytes(objectRef, blob, {
      contentType: blob.type || `image/${ext === 'png' ? 'png' : 'jpeg'}`,
    });

    downloadUrls.push(await getDownloadURL(objectRef));
  }

  return downloadUrls;
}
