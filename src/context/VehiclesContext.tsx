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
import { isFirebaseConfigured } from '@/services/firebaseConfig';
import {
    appendToVehicle,
    createVehicle,
    fetchVehicleByVin,
    findVehicleByVin,
    subscribeToAllVehicles,
    subscribeToUserVehicles,
    updateVehicle,
} from '@/services/vehicleRepository';
import type { AppendVehicleInput, NewVehicleInput, UpdateVehicleInput, Vehicle } from '@/types';

export type { AppendVehicleInput, NewVehicleInput, UpdateVehicleInput };

type VehiclesContextValue = {
  vehicles: Vehicle[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  findByVin: (vin: string) => Vehicle | null;
  lookupVehicleByVin: (vin: string) => Promise<Vehicle | null>;
  refreshRecords: () => Promise<void>;
  addVehicle: (input: NewVehicleInput) => Promise<Vehicle>;
  updateVehicleById: (vehicleId: string, input: UpdateVehicleInput) => Promise<Vehicle>;
  appendVehicleById: (vehicleId: string, input: AppendVehicleInput) => Promise<Vehicle>;
};

const VehiclesContext = createContext<VehiclesContextValue | undefined>(undefined);

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      setVehicles([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setVehicles([]);
      setError('Firebase is not configured.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const onData = (nextVehicles: Vehicle[]) => {
      setVehicles(nextVehicles);
      setIsLoading(false);
      setError(null);
    };

    const onError = (subscriptionError: Error) => {
      setError(subscriptionError.message);
      setIsLoading(false);
    };

    const unsubscribe = isAdmin
      ? subscribeToAllVehicles(onData, onError)
      : subscribeToUserVehicles(user.uid, onData, onError);

    return unsubscribe;
  }, [user?.uid, isAdmin]);

  const refreshRecords = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsRefreshing(false);
  }, []);

  const findByVin = useCallback(
    (vin: string) => findVehicleByVin(vehicles, vin),
    [vehicles],
  );

  const lookupVehicleByVin = useCallback(
    async (vin: string): Promise<Vehicle | null> => {
      const local = findVehicleByVin(vehicles, vin);
      if (local) {
        return local;
      }
      try {
        return await fetchVehicleByVin(vin);
      } catch {
        return null;
      }
    },
    [vehicles],
  );

  const addVehicle = useCallback(
    async (input: NewVehicleInput): Promise<Vehicle> => {
      if (!user) {
        throw new Error('You must be signed in to save a record.');
      }

      const duplicate = findVehicleByVin(vehicles, input.vin);
      if (duplicate) {
        throw new Error('DUPLICATE_VIN');
      }

      const vehicle = await createVehicle(user.uid, input, user.email ?? '');

      setVehicles((prev) => {
        const withoutDuplicate = prev.filter((item) => item.id !== vehicle.id);
        return [vehicle, ...withoutDuplicate].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });

      return vehicle;
    },
    [user, vehicles],
  );

  const updateVehicleById = useCallback(
    async (vehicleId: string, input: UpdateVehicleInput): Promise<Vehicle> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = vehicles.find((vehicle) => vehicle.id === vehicleId);
      if (!existing) {
        throw new Error('Vehicle record not found.');
      }

      const { imageUrls, updatedAtIso } = await updateVehicle(user.uid, vehicleId, input);

      const updated: Vehicle = {
        ...existing,
        model: input.model,
        type: input.type,
        color: input.color,
        comments: input.comments.trim(),
        imagesUrls: imageUrls,
        updatedAt: updatedAtIso,
      };

      setVehicles((prev) =>
        prev
          .map((vehicle) => (vehicle.id === vehicleId ? updated : vehicle))
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );

      return updated;
    },
    [user, vehicles],
  );

  const appendVehicleById = useCallback(
    async (vehicleId: string, input: AppendVehicleInput): Promise<Vehicle> => {
      if (!user) {
        throw new Error('You must be signed in to update a record.');
      }

      const existing = vehicles.find((vehicle) => vehicle.id === vehicleId);
      if (!existing) {
        throw new Error('Vehicle record not found.');
      }

      const { imageUrls, comments, type, updatedAtIso } = await appendToVehicle(
        user.uid,
        vehicleId,
        input,
        existing.comments,
        existing.imagesUrls,
        existing.type,
      );

      const updated: Vehicle = {
        ...existing,
        type,
        comments,
        imagesUrls: imageUrls,
        updatedAt: updatedAtIso,
      };

      setVehicles((prev) =>
        prev
          .map((vehicle) => (vehicle.id === vehicleId ? updated : vehicle))
          .sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
      );

      return updated;
    },
    [user, vehicles],
  );

  const value = useMemo(
    () => ({
      vehicles,
      isLoading,
      isRefreshing,
      error,
      findByVin,
      lookupVehicleByVin,
      refreshRecords,
      addVehicle,
      updateVehicleById,
      appendVehicleById,
    }),
    [
      vehicles,
      isLoading,
      isRefreshing,
      error,
      findByVin,
      lookupVehicleByVin,
      refreshRecords,
      addVehicle,
      updateVehicleById,
      appendVehicleById,
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
