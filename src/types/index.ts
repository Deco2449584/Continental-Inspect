export type VehicleType = string;

export type VehicleStatus = 'pendiente' | 'en_proceso' | 'completado' | 'entregado';

export type TeslaColor = string;

export type TeslaModel = string;

/** @deprecated Use catalog from Firebase via useVehicleCatalog() */
export const TESLA_MODELS: TeslaModel[] = [
  'Model 3',
  'Model Y',
  'Model S',
  'Model X',
  'Cybertruck',
];

/** @deprecated Use catalog from Firebase via useVehicleCatalog() */
export const TESLA_COLORS: TeslaColor[] = [
  'Pearl White Multi-Coat',
  'Solid Black',
  'Deep Blue Metallic',
  'Stealth Grey',
  'Ultra Red',
  'Quicksilver',
  'Otro',
];

export interface Vehicle {
  id: string;
  userId: string;
  createdByEmail: string;
  vin: string;
  model: string;
  type: VehicleType;
  status: VehicleStatus;
  color: string;
  comments: string;
  imagesUrls: string[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export type NewVehicleInput = {
  vin: string;
  model: string;
  type: VehicleType;
  color: string;
  comments: string;
  imagesUrls: string[];
};

export type UpdateVehicleInput = Omit<NewVehicleInput, 'vin'>;

/** Append-only update: new comments, photos, and optional type update (scan duplicate flow). */
export type AppendVehicleInput = {
  additionalComments: string;
  imagesUrls: string[];
  /** If provided, appended to the existing type chain: e.g. "nuevo + redetailing" */
  newType?: string;
};
