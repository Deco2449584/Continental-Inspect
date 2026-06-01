import {
    Timestamp,
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/services/firebaseConfig';
import { uploadVehicleImages } from '@/services/vehicleStorage';
import type {
    AppendVehicleInput,
    NewVehicleInput,
    UpdateVehicleInput,
    Vehicle,
    VehicleStatus,
} from '@/types';
import { mergeComments } from '@/utils/mergeComments';
import { normalizeVin } from '@/utils/vin';

const VEHICLES_COLLECTION = 'vehicles';

export type VehicleDocument = {
  userId: string;
  createdByEmail?: string;
  vin: string;
  model: string;
  type: string;
  status: VehicleStatus;
  color: string;
  comments: string;
  imagesUrls: string[];
  createdAt: Timestamp | string;
  createdAtIso?: string;
  updatedAt?: Timestamp | string;
  updatedAtIso?: string;
};

function timestampToIso(value: Timestamp | string | undefined): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function toDisplayIso(
  primary?: Timestamp | string,
  fallbackIso?: string,
): string {
  const fromPrimary = timestampToIso(primary);
  if (fromPrimary) return fromPrimary;
  if (fallbackIso) return fallbackIso;
  return new Date(0).toISOString();
}

function sortByNewest(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mapDocumentToVehicle(id: string, data: VehicleDocument): Vehicle {
  return {
    id,
    userId: data.userId,
    createdByEmail: data.createdByEmail ?? '',
    vin: data.vin,
    model: data.model,
    type: data.type,
    status: data.status,
    color: data.color,
    comments: data.comments ?? '',
    imagesUrls: data.imagesUrls ?? [],
    createdAt: toDisplayIso(data.createdAt, data.createdAtIso),
    updatedAt: timestampToIso(data.updatedAt) ?? data.updatedAtIso,
  };
}

export function findVehicleByVin(vehicles: Vehicle[], vin: string): Vehicle | null {
  const key = normalizeVin(vin);
  return vehicles.find((vehicle) => normalizeVin(vehicle.vin) === key) ?? null;
}

/** Firestore lookup (respects security rules: own records, or any if admin). */
export async function fetchVehicleByVin(vin: string): Promise<Vehicle | null> {
  if (!db) {
    return null;
  }

  const normalized = normalizeVin(vin);
  const snapshot = await getDocs(
    query(
      collection(db, VEHICLES_COLLECTION),
      where('vin', '==', normalized),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];
  return mapDocumentToVehicle(document.id, document.data() as VehicleDocument);
}

export function subscribeToAllVehicles(
  onData: (vehicles: Vehicle[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  return onSnapshot(
    collection(db, VEHICLES_COLLECTION),
    (snapshot) => {
      const vehicles = sortByNewest(
        snapshot.docs.map((document) =>
          mapDocumentToVehicle(document.id, document.data() as VehicleDocument),
        ),
      );
      onData(vehicles);
    },
    (error) => onError(error),
  );
}

export function subscribeToUserVehicles(
  userId: string,
  onData: (vehicles: Vehicle[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  const vehiclesQuery = query(
    collection(db, VEHICLES_COLLECTION),
    where('userId', '==', userId),
  );

  return onSnapshot(
    vehiclesQuery,
    (snapshot) => {
      const vehicles = sortByNewest(
        snapshot.docs.map((document) =>
          mapDocumentToVehicle(document.id, document.data() as VehicleDocument),
        ),
      );
      onData(vehicles);
    },
    (error) => onError(error),
  );
}

export async function createVehicle(
  userId: string,
  input: NewVehicleInput,
  createdByEmail: string,
): Promise<Vehicle> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const vehicleRef = doc(collection(db, VEHICLES_COLLECTION));
  const imageUrls =
    input.imagesUrls.length > 0
      ? await uploadVehicleImages(userId, vehicleRef.id, input.imagesUrls)
      : [];

  const createdAtIso = new Date().toISOString();

  await setDoc(vehicleRef, {
    userId,
    createdByEmail,
    vin: normalizeVin(input.vin),
    model: input.model,
    type: input.type,
    status: 'pendiente',
    color: input.color,
    comments: input.comments.trim(),
    imagesUrls: imageUrls,
    createdAt: serverTimestamp(),
    createdAtIso,
  });

  return {
    id: vehicleRef.id,
    userId,
    createdByEmail,
    vin: normalizeVin(input.vin),
    model: input.model,
    type: input.type,
    status: 'pendiente',
    color: input.color,
    comments: input.comments.trim(),
    imagesUrls: imageUrls,
    createdAt: createdAtIso,
  };
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<{ imageUrls: string[]; updatedAtIso: string }> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const localUris = input.imagesUrls.filter(
    (uri) => !uri.startsWith('http://') && !uri.startsWith('https://'),
  );
  const keptRemoteUrls = input.imagesUrls.filter(
    (uri) => uri.startsWith('http://') || uri.startsWith('https://'),
  );

  const uploadedUrls =
    localUris.length > 0 ? await uploadVehicleImages(userId, vehicleId, localUris) : [];

  const imageUrls = [...keptRemoteUrls, ...uploadedUrls];
  const updatedAtIso = new Date().toISOString();

  await updateDoc(doc(db, VEHICLES_COLLECTION, vehicleId), {
    model: input.model,
    type: input.type,
    color: input.color,
    comments: input.comments.trim(),
    imagesUrls: imageUrls,
    updatedAt: serverTimestamp(),
    updatedAtIso,
  });

  return { imageUrls, updatedAtIso };
}

export async function appendToVehicle(
  userId: string,
  vehicleId: string,
  input: AppendVehicleInput,
  existingComments: string,
  existingImageUrls: string[],
  existingType: string,
): Promise<{ imageUrls: string[]; comments: string; type: string; updatedAtIso: string }> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const localUris = input.imagesUrls.filter(
    (uri) => !uri.startsWith('http://') && !uri.startsWith('https://'),
  );

  const uploadedUrls =
    localUris.length > 0 ? await uploadVehicleImages(userId, vehicleId, localUris) : [];

  // Always keep photos already on the record; append only uploads new local files.
  const imageUrls = [...existingImageUrls, ...uploadedUrls];
  const comments = mergeComments(existingComments, input.additionalComments);
  const updatedAtIso = new Date().toISOString();

  // Build type history chain: "nuevo + redetailing + ..."
  const type =
    input.newType && input.newType !== existingType
      ? `${existingType} + ${input.newType}`
      : existingType;

  const updatePayload: Record<string, unknown> = {
    comments,
    imagesUrls: imageUrls,
    type,
    updatedAt: serverTimestamp(),
    updatedAtIso,
  };

  await updateDoc(doc(db, VEHICLES_COLLECTION, vehicleId), updatePayload);

  return { imageUrls, comments, type, updatedAtIso };
}
