import type { VehicleStatus } from '@/types';

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  pendiente: 'Pending',
  en_proceso: 'In Progress',
  completado: 'Completed',
  entregado: 'Delivered',
};

/** @deprecated Prefer useVehicleCatalog().getTypeLabel */
export const TYPE_LABELS: Record<string, string> = {
  nuevo: 'New',
  usado: 'Used',
  redetailing: 'Redetailing',
};

export const STATUS_COLORS: Record<VehicleStatus, { bg: string; text: string }> = {
  pendiente: { bg: '#FEF3C7', text: '#92400E' },
  en_proceso: { bg: '#DBEAFE', text: '#1E40AF' },
  completado: { bg: '#D1FAE5', text: '#065F46' },
  entregado: { bg: '#E5E7EB', text: '#374151' },
};

const DEFAULT_TYPE_COLOR = { bg: '#E5E7EB', text: '#374151' };

export const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  nuevo: { bg: '#E0F2FE', text: '#0369A1' },
  usado: { bg: '#F3E8FF', text: '#6B21A8' },
  redetailing: { bg: '#FFEDD5', text: '#9A3412' },
};

export function getTypeColor(type: string): { bg: string; text: string } {
  return TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;
}

export function getTypeLabel(type: string, catalogLabel?: string): string {
  return catalogLabel ?? TYPE_LABELS[type] ?? type;
}
