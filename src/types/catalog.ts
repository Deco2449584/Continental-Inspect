export type CatalogTypeOption = {
  value: string;
  label: string;
};

export type VehicleCatalog = {
  models: string[];
  colors: string[];
  types: CatalogTypeOption[];
};
