import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { Vehicle } from '@/types';
import type { CatalogTypeOption } from '@/types/catalog';
import { formatVehicleDate } from '@/utils/formatDate';

function buildTypeLabelMap(types: CatalogTypeOption[]): Map<string, string> {
  return new Map(types.map((type) => [type.value, type.label]));
}

const CSV_HEADERS = [
  'VIN',
  'Model',
  'Type',
  'Colour',
  'Comments',
  'Photos',
  'Operator',
  'Created',
  'Updated',
] as const;

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}

function vehicleToRow(vehicle: Vehicle, typeLabels: Map<string, string>): string[] {
  return [
    vehicle.vin,
    vehicle.model,
    typeLabels.get(vehicle.type) ?? vehicle.type,
    vehicle.color,
    vehicle.comments,
    String(vehicle.imagesUrls.length),
    vehicle.createdByEmail || vehicle.userId,
    formatVehicleDate(vehicle.createdAt),
    vehicle.updatedAt ? formatVehicleDate(vehicle.updatedAt) : '',
  ];
}

export function vehiclesToCsv(
  vehicles: Vehicle[],
  catalogTypes: CatalogTypeOption[] = [],
): string {
  const typeLabels = buildTypeLabelMap(catalogTypes);
  const header = CSV_HEADERS.map(escapeCsvCell).join(',');
  const rows = vehicles.map((vehicle) =>
    vehicleToRow(vehicle, typeLabels).map(escapeCsvCell).join(','),
  );
  return `\uFEFF${[header, ...rows].join('\n')}`;
}

async function writeAndShare(content: string, filename: string, mimeType: string): Promise<void> {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: 'Export vehicle records',
    UTI: mimeType,
  });
}

export async function shareVehiclesAsCsv(
  vehicles: Vehicle[],
  catalogTypes: CatalogTypeOption[] = [],
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  await writeAndShare(
    vehiclesToCsv(vehicles, catalogTypes),
    `fineshine-records-${timestamp}.csv`,
    'text/csv',
  );
}

/** Excel opens UTF-8 CSV saved with .xls extension on mobile share sheets. */
export async function shareVehiclesAsExcel(
  vehicles: Vehicle[],
  catalogTypes: CatalogTypeOption[] = [],
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  await writeAndShare(
    vehiclesToCsv(vehicles, catalogTypes),
    `fineshine-records-${timestamp}.xls`,
    'application/vnd.ms-excel',
  );
}
