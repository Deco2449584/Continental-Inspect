export type ConservationType = 'Congelado' | 'Refrigerado' | 'Ambiente';

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
  conservationType: 'Ambiente',
  foodType: '',
  weightKg: 0,
  boxCount: 0,
  hasIssues: false,
  issueDescription: '',
  photoEvidence: [],
  videoEvidence: [],
};
