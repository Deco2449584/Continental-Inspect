import type { Vehicle } from '@/types';

export type DateFilterPreset = 'day' | 'week' | 'month' | 'custom';

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfWeek(reference: Date = new Date()): Date {
  const day = reference.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - diff);
  return startOfDay(monday);
}

export function endOfWeek(reference: Date = new Date()): Date {
  const monday = startOfWeek(reference);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return endOfDay(sunday);
}

export function startOfMonth(reference: Date = new Date()): Date {
  return startOfDay(new Date(reference.getFullYear(), reference.getMonth(), 1));
}

export function endOfMonth(reference: Date = new Date()): Date {
  return endOfDay(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));
}

export function getTodayRange(reference: Date = new Date()): { from: Date; to: Date } {
  return { from: startOfDay(reference), to: endOfDay(reference) };
}

export function getDateRangeForPreset(
  preset: DateFilterPreset,
  customFrom: Date | null,
  customTo: Date | null,
  reference: Date = new Date(),
): { from: Date | null; to: Date | null } {
  switch (preset) {
    case 'day':
      return getTodayRange(reference);
    case 'week':
      return { from: startOfWeek(reference), to: endOfWeek(reference) };
    case 'month':
      return { from: startOfMonth(reference), to: endOfMonth(reference) };
    case 'custom':
      return {
        from: customFrom ? startOfDay(customFrom) : null,
        to: customTo ? endOfDay(customTo) : null,
      };
    default:
      return { from: null, to: null };
  }
}

export function filterVehiclesBySearch(vehicles: Vehicle[], query: string): Vehicle[] {
  const term = query.trim().toLowerCase();
  if (!term) return vehicles;

  return vehicles.filter(
    (vehicle) =>
      vehicle.vin.toLowerCase().includes(term) ||
      vehicle.model.toLowerCase().includes(term),
  );
}

export function filterVehiclesByDateRange(
  vehicles: Vehicle[],
  fromDate: Date | null,
  toDate: Date | null,
): Vehicle[] {
  if (!fromDate && !toDate) return vehicles;

  return vehicles.filter((vehicle) => {
    const created = new Date(vehicle.createdAt);
    if (Number.isNaN(created.getTime())) return false;
    if (fromDate && created < fromDate) return false;
    if (toDate && created > toDate) return false;
    return true;
  });
}

export function filterVehiclesToday(
  vehicles: Vehicle[],
  reference: Date = new Date(),
): Vehicle[] {
  const { from, to } = getTodayRange(reference);
  return filterVehiclesByDateRange(vehicles, from, to);
}

export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatFilterDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
