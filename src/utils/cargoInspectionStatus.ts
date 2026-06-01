import type { CargoInspection, CargoInspectionStatus } from '@/types';
import { filterInspectionsToday } from '@/utils/filterInspections';

export function normalizeInspectionStatus(
  value: string | undefined,
): CargoInspectionStatus {
  const raw = value?.trim().toLowerCase();
  if (raw === 'new' || raw === 'loaded') {
    return raw;
  }
  return 'loaded';
}

export function resolveInspectionStatus(inspection: CargoInspection): CargoInspectionStatus {
  return normalizeInspectionStatus(inspection.status);
}

export type TodayDashboardMetrics = {
  newCargo: number;
  loaded: number;
  requiresAttention: number;
};

export function countTodayDashboardMetrics(
  inspections: CargoInspection[],
): TodayDashboardMetrics {
  const today = filterInspectionsToday(inspections);

  let newCargo = 0;
  let loaded = 0;
  let requiresAttention = 0;

  for (const inspection of today) {
    const status = resolveInspectionStatus(inspection);
    if (status === 'new') {
      newCargo += 1;
    }
    if (status === 'loaded') {
      loaded += 1;
    }
    if (inspection.hasIssues) {
      requiresAttention += 1;
    }
  }

  return { newCargo, loaded, requiresAttention };
}
