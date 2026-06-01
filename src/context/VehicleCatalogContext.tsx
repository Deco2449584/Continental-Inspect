import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  DEFAULT_VEHICLE_CATALOG,
  fetchVehicleCatalog,
  subscribeToVehicleCatalog,
} from '@/services/catalogRepository';
import type { CatalogTypeOption, VehicleCatalog } from '@/types/catalog';

type VehicleCatalogContextValue = {
  catalog: VehicleCatalog;
  isLoading: boolean;
  getTypeLabel: (value: string) => string;
};

const VehicleCatalogContext = createContext<VehicleCatalogContextValue | undefined>(
  undefined,
);

export function VehicleCatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<VehicleCatalog>(DEFAULT_VEHICLE_CATALOG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const initial = await fetchVehicleCatalog();
      if (!cancelled) {
        setCatalog(initial);
        setIsLoading(false);
      }
    })();

    const unsubscribe = subscribeToVehicleCatalog(
      (nextCatalog) => {
        setCatalog(nextCatalog);
        setIsLoading(false);
      },
      () => {
        if (!cancelled) setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const typeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog.types.forEach((type) => map.set(type.value, type.label));
    return map;
  }, [catalog.types]);

  const getTypeLabel = (value: string) => typeLabelMap.get(value) ?? value;

  const value = useMemo(
    () => ({ catalog, isLoading, getTypeLabel }),
    [catalog, isLoading, getTypeLabel],
  );

  return (
    <VehicleCatalogContext.Provider value={value}>{children}</VehicleCatalogContext.Provider>
  );
}

export function useVehicleCatalog(): VehicleCatalogContextValue {
  const context = useContext(VehicleCatalogContext);
  if (!context) {
    throw new Error('useVehicleCatalog must be used within VehicleCatalogProvider');
  }
  return context;
}

export type { CatalogTypeOption, VehicleCatalog };
