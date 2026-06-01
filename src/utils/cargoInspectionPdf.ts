import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ACCENT } from '@/theme/accent';
import { brand } from '@/theme/brand';
import type { CargoInspection } from '@/types';
import { formatVehicleDate } from '@/utils/formatDate';
import { getConservationLabel } from '@/utils/vehicleLabels';

const BRAND_ACCENT = ACCENT;
const BLACK = '#0A0A0A';
const DARK = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function field(label: string, value: string): string {
  return `
    <div class="field">
      <div class="field-label">${escapeHtml(label)}</div>
      <div class="field-value">${escapeHtml(value)}</div>
    </div>`;
}

function buildInspectionHtml(inspection: CargoInspection): string {
  const photoItems =
    inspection.photoEvidence.length > 0
      ? inspection.photoEvidence
          .map(
            (url, i) =>
              `<div class="photo-wrap">
                <img src="${escapeHtml(url)}" alt="Photo ${i + 1}" />
                <div class="photo-label">Photo ${i + 1} of ${inspection.photoEvidence.length}</div>
              </div>`,
          )
          .join('')
      : '<p class="no-photos">No photos attached.</p>';

  const videoSection =
    inspection.videoEvidence.length > 0
      ? `<p>${inspection.videoEvidence.length} video file(s) on record (view in app).</p>`
      : '<p class="no-photos">No videos attached.</p>';

  const statusLabel = inspection.hasIssues ? 'REQUIRES ATTENTION' : 'LOADED';
  const issueBlock = inspection.hasIssues
    ? field('Issue description', inspection.issueDescription?.trim() || '—')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, Arial, sans-serif; color: ${DARK}; font-size: 13px; line-height: 1.5; }
    .header { background: ${BLACK}; color: #fff; padding: 24px 32px; }
    .header-brand { font-size: 20px; font-weight: 800; }
    .header-brand span { color: ${BRAND_ACCENT}; }
    .accent-bar { height: 4px; background: ${BRAND_ACCENT}; }
    .hero { padding: 24px 32px; border-bottom: 1px solid ${BORDER}; }
    .hero-title { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .hero-sub { color: ${MUTED}; font-size: 14px; }
    .section { padding: 20px 32px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    .field-label { font-size: 10px; text-transform: uppercase; color: ${MUTED}; letter-spacing: 0.4px; }
    .field-value { font-size: 15px; font-weight: 600; margin-top: 2px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${BRAND_ACCENT}22; color: ${BRAND_ACCENT}; }
    .photo-wrap { margin-bottom: 16px; }
    .photo-wrap img { max-width: 100%; border-radius: 8px; border: 1px solid ${BORDER}; }
    .photo-label { font-size: 11px; color: ${MUTED}; margin-top: 4px; }
    .footer { padding: 20px 32px; font-size: 11px; color: ${MUTED}; text-align: center; border-top: 1px solid ${BORDER}; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">${escapeHtml(brand.name)} <span>Inspect</span></div>
    <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">Cargo inspection report</div>
  </div>
  <div class="accent-bar"></div>
  <div class="hero">
    <div class="hero-title">${escapeHtml(inspection.uldId)}</div>
    <div class="hero-sub">AWB ${escapeHtml(inspection.awbNumber)}</div>
    <p style="margin-top:12px;"><span class="status">${escapeHtml(statusLabel)}</span></p>
    <p style="margin-top:8px;font-size:12px;color:${MUTED};">
      Registered ${escapeHtml(formatVehicleDate(inspection.registeredAt))}
      ${inspection.updatedAt ? ` · Updated ${escapeHtml(formatVehicleDate(inspection.updatedAt))}` : ''}
    </p>
  </div>
  <div class="section">
    <div class="section-title">Cargo details</div>
    <div class="grid">
      ${field('Conservation', getConservationLabel(inspection.conservationType))}
      ${field('Food type', inspection.foodType)}
      ${field('Weight', `${inspection.weightKg} kg`)}
      ${field('Boxes', String(inspection.boxCount))}
      ${field('Operator', inspection.createdBy)}
      ${issueBlock}
    </div>
  </div>
  <div class="section">
    <div class="section-title">Photo evidence</div>
    ${photoItems}
  </div>
  <div class="section">
    <div class="section-title">Video evidence</div>
    ${videoSection}
  </div>
  <div class="footer">
    <div>${escapeHtml(brand.name)}</div>
    <div>${escapeHtml(brand.location)}</div>
    <div>${escapeHtml(brand.license)}</div>
  </div>
</body>
</html>`;
}

export async function shareCargoInspectionPdf(inspection: CargoInspection): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: buildInspectionHtml(inspection),
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Inspection ${inspection.uldId}`,
  });
}
