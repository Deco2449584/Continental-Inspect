import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/services/firebaseConfig';

function extensionFromUri(uri: string, kind: 'photo' | 'video'): string {
  if (kind === 'video') {
    const match = uri.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
    return match?.[1]?.toLowerCase() ?? 'mp4';
  }
  const match = uri.match(/\.(jpe?g|png|webp|heic)(\?|$)/i);
  return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
}

function isRemoteUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read media file (${response.status}).`);
  }
  return response.blob();
}

async function uploadMediaUris(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  localUris: string[],
): Promise<string[]> {
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const downloadUrls: string[] = [];
  const kind = folder === 'videos' ? 'video' : 'photo';

  for (let index = 0; index < localUris.length; index += 1) {
    const uri = localUris[index];

    if (isRemoteUrl(uri)) {
      downloadUrls.push(uri);
      continue;
    }

    const ext = extensionFromUri(uri, kind);
    const objectPath = `cargo_inspections/${userId}/${inspectionId}/${folder}/${Date.now()}-${index}.${ext}`;
    const objectRef = ref(storage, objectPath);
    const blob = await uriToBlob(uri);

    const defaultType =
      kind === 'video'
        ? `video/${ext === 'mov' ? 'quicktime' : ext}`
        : `image/${ext === 'png' ? 'png' : 'jpeg'}`;

    await uploadBytes(objectRef, blob, {
      contentType: blob.type || defaultType,
    });

    downloadUrls.push(await getDownloadURL(objectRef));
  }

  return downloadUrls;
}

function splitLocalAndRemote(uris: string[]): { local: string[]; remote: string[] } {
  const local: string[] = [];
  const remote: string[] = [];
  for (const uri of uris) {
    if (isRemoteUrl(uri)) {
      remote.push(uri);
    } else {
      local.push(uri);
    }
  }
  return { local, remote };
}

export async function uploadCargoInspectionPhotos(
  userId: string,
  inspectionId: string,
  uris: string[],
): Promise<string[]> {
  const { local, remote } = splitLocalAndRemote(uris);
  const uploaded = local.length > 0 ? await uploadMediaUris(userId, inspectionId, 'photos', local) : [];
  return [...remote, ...uploaded];
}

export async function uploadCargoInspectionVideos(
  userId: string,
  inspectionId: string,
  uris: string[],
): Promise<string[]> {
  const { local, remote } = splitLocalAndRemote(uris);
  const uploaded = local.length > 0 ? await uploadMediaUris(userId, inspectionId, 'videos', local) : [];
  return [...remote, ...uploaded];
}
