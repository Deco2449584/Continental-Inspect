import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { CargoInspection } from '@/types';
import { formatVehicleDate } from '@/utils/formatDate';
import { getConservationLabel } from '@/utils/vehicleLabels';

const CSV_HEADERS = [
  'ULD ID',
  'AWB',
  'Conservation',
  'Food type',
  'Weight (kg)',
  'Boxes',
  'Issues',
  'Issue description',
  'Registered',
  'Updated',
  'Operator',
] as const;

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function inspectionToRow(inspection: CargoInspection): string[] {
  return [
    inspection.uldId,
    inspection.awbNumber,
    getConservationLabel(inspection.conservationType),
    inspection.foodType,
    String(inspection.weightKg),
    String(inspection.boxCount),
    inspection.hasIssues ? 'Yes' : 'No',
    inspection.issueDescription ?? '',
    formatVehicleDate(inspection.registeredAt),
    inspection.updatedAt ? formatVehicleDate(inspection.updatedAt) : '',
    inspection.createdBy,
  ];
}

function buildCsvContent(inspections: CargoInspection[]): string {
  const rows = inspections.map((item) =>
    inspectionToRow(item).map(escapeCsv).join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

function buildExcelHtml(inspections: CargoInspection[]): string {
  const headerCells = CSV_HEADERS.map((h) => `<th>${h}</th>`).join('');
  const bodyRows = inspections
    .map((item) => {
      const cells = inspectionToRow(item)
        .map((v) => `<td>${v.replace(/</g, '&lt;')}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
}

async function shareTextFile(
  filename: string,
  content: string,
  mimeType: string,
): Promise<void> {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export records' });
}

export async function shareInspectionsAsCsv(
  inspections: CargoInspection[],
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  await shareTextFile(
    `continental-inspect-records-${timestamp}.csv`,
    buildCsvContent(inspections),
    'text/csv',
  );
}

export async function shareInspectionsAsExcel(
  inspections: CargoInspection[],
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  await shareTextFile(
    `continental-inspect-records-${timestamp}.xls`,
    buildExcelHtml(inspections),
    'application/vnd.ms-excel',
  );
}

/** @deprecated Use shareInspectionsAsCsv */
export const shareVehiclesAsCsv = shareInspectionsAsCsv;

/** @deprecated Use shareInspectionsAsExcel */
export const shareVehiclesAsExcel = shareInspectionsAsExcel;
