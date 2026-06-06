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
    markCargoInspectionAsLoaded,
    subscribeToAllCargoInspections,
    subscribeToUserCargoInspections,
    updateCargoInspection,
} from '@/services/cargoInspectionRepository';
import { areCargoInspectionListsEqual } from '@/utils/cargoInspectionListEqual';
import { resolveInspectionStatus } from '@/utils/cargoInspectionStatus';
import { isFirebaseConfigured } from '@/services/firebaseConfig';
import type {
  CargoInspection,
  NewCargoInspectionInput,
  UpdateCargoInspectionInput,
} from '@/types';

export type { CargoInspection, NewCargoInspectionInput, UpdateCargoInspectionInput };

type CargoInspectionsContextValue = {
  inspections: CargoInspection[];
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
  markInspectionAsLoaded: (inspectionId: string) => Promise<CargoInspection>;
  deleteInspectionById: (inspectionId: string) => Promise<void>;
};

const CargoInspectionsContext = createContext<CargoInspectionsContextValue | undefined>(
  undefined,
);

export function CargoInspectionsProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, profile, isLoading: authLoading } = useAuth();
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

    if (authLoading || !profile) {
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
      setInspections((previous) => {
        if (areCargoInspectionListsEqual(previous, nextInspections)) {
          return previous;
        }
        return nextInspections;
      });
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
  }, [user?.uid, isAdmin, profile?.docId, authLoading]);

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

      // Admins already subscribe to the full collection; a miss means no duplicate exists.
      if (isAdmin) {
        return null;
      }

      try {
        return await fetchCargoInspectionByUldId(uldId);
      } catch {
        return null;
      }
    },
    [inspections, isAdmin],
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
        const next = [inspection, ...withoutDuplicate].sort(
          (a, b) =>
            new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
        );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
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
        resolveInspectionStatus(existing),
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
        status: resolveInspectionStatus(existing),
        issueDescription: input.hasIssues ? input.issueDescription?.trim() : undefined,
        photoEvidence,
        videoEvidence,
        updatedAt: updatedAtIso,
      };

      setInspections((prev) => {
        const next = prev
          .map((item) => (item.id === inspectionId ? updated : item))
          .sort(
            (a, b) =>
              new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
      });

      return updated;
    },
    [user, inspections],
  );

  const markInspectionAsLoaded = useCallback(
    async (inspectionId: string): Promise<CargoInspection> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = inspections.find((item) => item.id === inspectionId);
      if (!existing) {
        throw new Error('Cargo inspection not found.');
      }

      const updatedAtIso = await markCargoInspectionAsLoaded(inspectionId);

      const updated: CargoInspection = {
        ...existing,
        status: 'loaded',
        updatedAt: updatedAtIso,
      };

      setInspections((prev) => {
        const next = prev
          .map((item) => (item.id === inspectionId ? updated : item))
          .sort(
            (a, b) =>
              new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          );
        if (areCargoInspectionListsEqual(prev, next)) {
          return prev;
        }
        return next;
      });

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
      isLoading,
      isRefreshing,
      error,
      findByUldId,
      lookupInspectionByUldId,
      refreshRecords,
      addInspection,
      updateInspectionById,
      markInspectionAsLoaded,
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
      markInspectionAsLoaded,
      deleteInspectionById,
    ],
  );

  return (
    <CargoInspectionsContext.Provider value={value}>{children}</CargoInspectionsContext.Provider>
  );
}

export function useCargoInspections(): CargoInspectionsContextValue {
  const context = useContext(CargoInspectionsContext);
  if (!context) {
    throw new Error('useCargoInspections must be used within a CargoInspectionsProvider');
  }
  return context;
}
