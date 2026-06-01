export type ConservationType = 'Frozen' | 'Refrigerated' | 'Ambient';

export const CONSERVATION_TYPES: readonly ConservationType[] = [
  'Frozen',
  'Refrigerated',
  'Ambient',
] as const;

const LEGACY_CONSERVATION_MAP: Record<string, ConservationType> = {
  Congelado: 'Frozen',
  Refrigerado: 'Refrigerated',
  Ambiente: 'Ambient',
  Frozen: 'Frozen',
  Refrigerated: 'Refrigerated',
  Ambient: 'Ambient',
};

/** Maps Firestore values (including legacy Spanish) to current English enums. */
export function normalizeConservationType(value: string | undefined): ConservationType {
  if (!value) return 'Ambient';
  const trimmed = value.trim();
  return LEGACY_CONSERVATION_MAP[trimmed] ?? 'Ambient';
}

export interface CargoInspection {
  id: string;
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType;
  foodType: string;
  weightKg: number;
  boxCount: number;
  hasIssues: boolean;
  issueDescription?: string;
  photoEvidence: string[];
  videoEvidence: string[];
  registeredAt: Date | string;
  updatedAt?: Date | string;
  createdBy: string;
}

export type NewCargoInspectionInput = Omit<
  CargoInspection,
  'id' | 'registeredAt' | 'updatedAt' | 'createdBy'
>;

export type UpdateCargoInspectionInput = NewCargoInspectionInput;

/** Default form / draft values for a new cargo inspection. */
export const EMPTY_CARGO_INSPECTION_INPUT: NewCargoInspectionInput = {
  uldId: '',
  awbNumber: '',
  conservationType: 'Ambient',
  foodType: '',
  weightKg: 0,
  boxCount: 0,
  hasIssues: false,
  issueDescription: '',
  photoEvidence: [],
  videoEvidence: [],
};
