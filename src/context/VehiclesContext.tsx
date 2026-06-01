import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  createCargoInspection,
  deleteCargoInspection,
  fetchCargoInspectionByUldId,
  findCargoInspectionByUldId,
  subscribeToAllCargoInspections,
  subscribeToUserCargoInspections,
  updateCargoInspection,
} from '@/services/cargoInspectionRepository';
import { isFirebaseConfigured } from '@/services/firebaseConfig';
import type {
  CargoInspection,
  NewCargoInspectionInput,
  UpdateCargoInspectionInput,
} from '@/types';

export type { CargoInspection, NewCargoInspectionInput, UpdateCargoInspectionInput };

type VehiclesContextValue = {
  /** Cargo inspections loaded from Firestore. */
  inspections: CargoInspection[];
  /** @deprecated Prefer `inspections` — kept for gradual UI migration. */
  vehicles: CargoInspection[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  findByUldId: (uldId: string) => CargoInspection | null;
  lookupInspectionByUldId: (uldId: string) => Promise<CargoInspection | null>;
  refreshRecords: () => Promise<void>;
  addInspection: (input: NewCargoInspectionInput) => Promise<CargoInspection>;
  updateInspectionById: (
    inspectionId: string,
    input: UpdateCargoInspectionInput,
  ) => Promise<CargoInspection>;
  deleteInspectionById: (inspectionId: string) => Promise<void>;
};

const VehiclesContext = createContext<VehiclesContextValue | undefined>(undefined);

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [inspections, setInspections] = useState<CargoInspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      setInspections([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setInspections([]);
      setError('Firebase is not configured.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const onData = (nextInspections: CargoInspection[]) => {
      setInspections(nextInspections);
      setIsLoading(false);
      setError(null);
    };

    const onError = (subscriptionError: Error) => {
      setError(subscriptionError.message);
      setIsLoading(false);
    };

    const unsubscribe = isAdmin
      ? subscribeToAllCargoInspections(onData, onError)
      : subscribeToUserCargoInspections(user.uid, onData, onError);

    return unsubscribe;
  }, [user?.uid, isAdmin]);

  const refreshRecords = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsRefreshing(false);
  }, []);

  const findByUldId = useCallback(
    (uldId: string) => findCargoInspectionByUldId(inspections, uldId),
    [inspections],
  );

  const lookupInspectionByUldId = useCallback(
    async (uldId: string): Promise<CargoInspection | null> => {
      const local = findCargoInspectionByUldId(inspections, uldId);
      if (local) {
        return local;
      }
      try {
        return await fetchCargoInspectionByUldId(uldId);
      } catch {
        return null;
      }
    },
    [inspections],
  );

  const addInspection = useCallback(
    async (input: NewCargoInspectionInput): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to save a record.');
      }

      const duplicate = findCargoInspectionByUldId(inspections, input.uldId);
      if (duplicate) {
        throw new Error('DUPLICATE_ULD');
      }

      const inspection = await createCargoInspection(
        user.uid,
        input,
        user.email ?? '',
      );

      setInspections((prev) => {
        const withoutDuplicate = prev.filter((item) => item.id !== inspection.id);
        return [inspection, ...withoutDuplicate].sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
        );
      });

      return inspection;
    },
    [user, inspections],
  );

  const updateInspectionById = useCallback(
    async (
      inspectionId: string,
      input: UpdateCargoInspectionInput,
    ): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = inspections.find((item) => item.id === inspectionId);
      if (!existing) {
        throw new Error('Cargo inspection not found.');
      }

      const { photoEvidence, videoEvidence, updatedAtIso } = await updateCargoInspection(
        user.uid,
        inspectionId,
        input,
        user.email ?? existing.createdBy,
      );

      const updated: CargoInspection = {
        ...existing,
        uldId: input.uldId,
        awbNumber: input.awbNumber.trim(),
        conservationType: input.conservationType,
        foodType: input.foodType.trim(),
        weightKg: input.weightKg,
        boxCount: input.boxCount,
        hasIssues: input.hasIssues,
        issueDescription: input.hasIssues ? input.issueDescription?.trim() : undefined,
        photoEvidence,
        videoEvidence,
        updatedAt: updatedAtIso,
      };

      setInspections((prev) =>
        prev
          .map((item) => (item.id === inspectionId ? updated : item))
          .sort(
            (a, b) =>
              new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          ),
      );

      return updated;
    },
    [user, inspections],
  );

  const deleteInspectionById = useCallback(
    async (inspectionId: string): Promise<void> => {
      if (!user) {
        throw new Error('You must be signed in to delete a record.');
      }

      await deleteCargoInspection(inspectionId);
      setInspections((prev) => prev.filter((item) => item.id !== inspectionId));
    },
    [user],
  );

  const value = useMemo(
    () => ({
      inspections,
      vehicles: inspections,
      isLoading,
      isRefreshing,
      error,
      findByUldId,
      lookupInspectionByUldId,
      refreshRecords,
      addInspection,
      updateInspectionById,
      deleteInspectionById,
    }),
    [
      inspections,
      isLoading,
      isRefreshing,
      error,
      findByUldId,
      lookupInspectionByUldId,
      refreshRecords,
      addInspection,
      updateInspectionById,
      deleteInspectionById,
    ],
  );

  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>;
}

export function useVehicles(): VehiclesContextValue {
  const context = useContext(VehiclesContext);
  if (!context) {
    throw new Error('useVehicles must be used within a VehiclesProvider');
  }
  return context;
}

/** Preferred hook name for cargo inspection data. */
export const useCargoInspections = useVehicles;
