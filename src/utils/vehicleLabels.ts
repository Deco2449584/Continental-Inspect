import type { ConservationType } from '@/types';

export const CONSERVATION_LABELS: Record<ConservationType, string> = {
  Congelado: 'Frozen',
  Refrigerado: 'Chilled',
  Ambiente: 'Ambient',
};

export const CONSERVATION_COLORS: Record<ConservationType, { bg: string; text: string }> = {
  Congelado: { bg: '#DBEAFE', text: '#1E40AF' },
  Refrigerado: { bg: '#E0F2FE', text: '#0369A1' },
  Ambiente: { bg: '#F3F4F6', text: '#374151' },
};

export function getConservationLabel(type: ConservationType): string {
  return CONSERVATION_LABELS[type] ?? type;
}
