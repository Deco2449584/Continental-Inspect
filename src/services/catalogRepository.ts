import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';

import { db } from '@/services/firebaseConfig';
import type { CatalogTypeOption, VehicleCatalog } from '@/types/catalog';

const CONFIG_COLLECTION = 'config';
const CATALOG_DOC_ID = 'vehicle-catalog';

export const DEFAULT_VEHICLE_CATALOG: VehicleCatalog = {
  models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'],
  colors: [
    'Pearl White Multi-Coat',
    'Solid Black',
    'Deep Blue Metallic',
    'Stealth Grey',
    'Ultra Red',
    'Quicksilver',
    'Otro',
  ],
  types: [
    { value: 'nuevo', label: 'New' },
    { value: 'usado', label: 'Used' },
    { value: 'redetailing', label: 'Redetailing' },
  ],
};

function parseTypeOption(entry: unknown): CatalogTypeOption | null {
  if (typeof entry === 'string') {
    return { value: entry, label: entry };
  }
  if (entry && typeof entry === 'object') {
    const row = entry as { value?: string; label?: string; id?: string };
    const value = row.value ?? row.id;
    if (typeof value === 'string' && value.length > 0) {
      return { value, label: typeof row.label === 'string' ? row.label : value };
    }
  }
  return null;
}

function parseCatalog(data: Record<string, unknown>): VehicleCatalog {
  const models = Array.isArray(data.models)
    ? data.models.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : DEFAULT_VEHICLE_CATALOG.models;

  const colors = Array.isArray(data.colors)
    ? data.colors.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : DEFAULT_VEHICLE_CATALOG.colors;

  const types = Array.isArray(data.types)
    ? data.types
        .map(parseTypeOption)
        .filter((item): item is CatalogTypeOption => item !== null)
    : DEFAULT_VEHICLE_CATALOG.types;

  return {
    models: models.length > 0 ? models : DEFAULT_VEHICLE_CATALOG.models,
    colors: colors.length > 0 ? colors : DEFAULT_VEHICLE_CATALOG.colors,
    types: types.length > 0 ? types : DEFAULT_VEHICLE_CATALOG.types,
  };
}

export async function fetchVehicleCatalog(): Promise<VehicleCatalog> {
  if (!db) return DEFAULT_VEHICLE_CATALOG;

  try {
    const snapshot = await getDoc(doc(db, CONFIG_COLLECTION, CATALOG_DOC_ID));
    if (!snapshot.exists()) return DEFAULT_VEHICLE_CATALOG;
    return parseCatalog(snapshot.data() as Record<string, unknown>);
  } catch {
    return DEFAULT_VEHICLE_CATALOG;
  }
}

export function subscribeToVehicleCatalog(
  onData: (catalog: VehicleCatalog) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onData(DEFAULT_VEHICLE_CATALOG);
    return () => {};
  }

  return onSnapshot(
    doc(db, CONFIG_COLLECTION, CATALOG_DOC_ID),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(DEFAULT_VEHICLE_CATALOG);
        return;
      }
      onData(parseCatalog(snapshot.data() as Record<string, unknown>));
    },
    (error) => onError(error),
  );
}

/** Seeds catalog in Firestore when missing (requires write permission on config). */
export async function seedVehicleCatalogIfMissing(): Promise<void> {
  if (!db) return;

  const ref = doc(db, CONFIG_COLLECTION, CATALOG_DOC_ID);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(ref, DEFAULT_VEHICLE_CATALOG);
}
