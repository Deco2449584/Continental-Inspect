import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { brand } from '@/theme/brand';
import type { Vehicle } from '@/types';
import { formatVehicleDate } from '@/utils/formatDate';
import { getTypeLabel } from '@/utils/vehicleLabels';

// Brand colours
const RED = '#E21F28';
const BLACK = '#0A0A0A';
const DARK = '#1A1A1A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const LIGHT_BG = '#F9FAFB';

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

function buildVehicleHtml(vehicle: Vehicle): string {
  const photoItems =
    vehicle.imagesUrls.length > 0
      ? vehicle.imagesUrls
          .map(
            (url, i) =>
              `<div class="photo-wrap">
                <img src="${escapeHtml(url)}" alt="Photo ${i + 1}" />
                <div class="photo-label">Photo ${i + 1} of ${vehicle.imagesUrls.length}</div>
              </div>`,
          )
          .join('')
      : '<p class="no-photos">No photos attached to this record.</p>';

  const commentsText = vehicle.comments.trim() || 'No comments recorded.';
  // Render comment sections separated by --- as distinct blocks
  const commentBlocks = commentsText
    .split(/\n\n---\n/)
    .map((block, i) =>
      `<div class="comment-block${i > 0 ? ' comment-block-append' : ''}">
        ${i > 0 ? '<div class="comment-block-badge">Update</div>' : ''}
        <p>${escapeHtml(block.trim()).replace(/\n/g, '<br/>')}</p>
      </div>`,
    )
    .join('');

  const updatedRow = vehicle.updatedAt
    ? field('Last updated', formatVehicleDate(vehicle.updatedAt))
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, Helvetica Neue, Arial, sans-serif;
      color: ${DARK};
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      background: ${BLACK};
      padding: 28px 36px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-left { display: flex; flex-direction: column; gap: 6px; }
    .header-brand {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
    }
    .header-brand span { color: ${RED}; }
    .header-tagline {
      font-size: 11px;
      color: #9CA3AF;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }
    .header-badge {
      background: ${RED};
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 20px;
    }

    /* ── Red accent bar ── */
    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, ${RED} 0%, #ff6b6b 100%);
    }

    /* ── Hero section ── */
    .hero {
      padding: 28px 36px 20px;
      border-bottom: 1px solid ${BORDER};
    }
    .hero-model {
      font-size: 28px;
      font-weight: 800;
      color: ${BLACK};
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .hero-vin {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: ${MUTED};
      letter-spacing: 1px;
      margin-bottom: 12px;
    }
    .hero-meta {
      font-size: 12px;
      color: ${MUTED};
    }
    .type-badge {
      display: inline-block;
      background: rgba(226,31,40,0.1);
      color: ${RED};
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid rgba(226,31,40,0.25);
      margin-top: 10px;
    }

    /* ── Content ── */
    .content { padding: 24px 36px; }

    /* ── Section ── */
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: ${RED};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${RED};
      display: inline-block;
    }

    /* ── Fields grid ── */
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 24px;
    }
    .field {}
    .field-label {
      font-size: 10px;
      font-weight: 600;
      color: ${MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 600;
      color: ${DARK};
    }

    /* ── Comments ── */
    .comment-block {
      background: ${LIGHT_BG};
      border-left: 3px solid ${BORDER};
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      margin-bottom: 10px;
    }
    .comment-block-append {
      border-left-color: ${RED};
    }
    .comment-block-badge {
      display: inline-block;
      background: rgba(226,31,40,0.1);
      color: ${RED};
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 10px;
      margin-bottom: 6px;
    }
    .comment-block p {
      font-size: 13px;
      color: ${DARK};
      line-height: 1.6;
    }
    .no-photos {
      font-size: 13px;
      color: ${MUTED};
      font-style: italic;
    }

    /* ── Photos ── */
    .photos-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .photo-wrap {
      width: 180px;
    }
    .photo-wrap img {
      width: 180px;
      height: 130px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid ${BORDER};
      display: block;
    }
    .photo-label {
      font-size: 10px;
      color: ${MUTED};
      text-align: center;
      margin-top: 4px;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 8px;
      padding: 16px 36px;
      background: ${LIGHT_BG};
      border-top: 1px solid ${BORDER};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-left {
      font-size: 10px;
      color: ${MUTED};
      line-height: 1.6;
    }
    .footer-right {
      font-size: 10px;
      color: ${MUTED};
      text-align: right;
    }
    .footer-brand {
      font-size: 11px;
      font-weight: 700;
      color: ${RED};
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="header-brand">Fine<span>Shine</span></div>
      <div class="header-tagline">${escapeHtml(brand.tagline)}</div>
    </div>
    <div class="header-badge">Inspection Report</div>
  </div>
  <div class="accent-bar"></div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-model">${escapeHtml(vehicle.model)}</div>
    <div class="hero-vin">VIN &nbsp;·&nbsp; ${escapeHtml(vehicle.vin)}</div>
    <div class="hero-meta">
      Registered ${escapeHtml(formatVehicleDate(vehicle.createdAt))}
      ${vehicle.updatedAt ? `&nbsp;·&nbsp; Updated ${escapeHtml(formatVehicleDate(vehicle.updatedAt))}` : ''}
    </div>
    <div class="type-badge">${escapeHtml(getTypeLabel(vehicle.type))}</div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Vehicle details -->
    <div class="section">
      <div class="section-title">Vehicle details</div>
      <div class="fields-grid">
        ${field('Model', vehicle.model)}
        ${field('Service type', getTypeLabel(vehicle.type))}
        ${field('Colour', vehicle.color)}
        ${field('Registered', formatVehicleDate(vehicle.createdAt))}
        ${updatedRow}
        ${field('Operator', vehicle.createdByEmail || '—')}
      </div>
    </div>

    <!-- Comments -->
    <div class="section">
      <div class="section-title">Inspection notes</div>
      ${commentBlocks}
    </div>

    <!-- Photos -->
    <div class="section">
      <div class="section-title">Photo evidence (${vehicle.imagesUrls.length})</div>
      <div class="photos-grid">${photoItems}</div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">Fine Shine</div>
      <div>${escapeHtml(brand.location)}</div>
      <div>${escapeHtml(brand.license)}</div>
    </div>
    <div class="footer-right">
      <div>Generated ${escapeHtml(new Date().toLocaleString())}</div>
      <div>${escapeHtml(brand.phone)}</div>
    </div>
  </div>

</body>
</html>`;
}

export async function shareVehiclePdf(vehicle: Vehicle): Promise<void> {
  const { uri } = await Print.printToFileAsync({
    html: buildVehicleHtml(vehicle),
    base64: false,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Report · ${vehicle.vin}`,
    UTI: 'com.adobe.pdf',
  });
}
