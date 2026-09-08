import jsPDF from 'jspdf';
import { AnalysisResponse } from '../services/api';

export interface PDFUserInfo {
  name?: string;
  email?: string;
}

export function generateClinicalReportPDF(result: AnalysisResponse, userInfo?: PDFUserInfo): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const sessionId = result.result_image.split('_')[1]?.substring(0, 8).toUpperCase() || 'N/A';

  // Fallback health score calc
  let fallbackScore = 100;
  fallbackScore -= Math.min(30, (result.acne_count || 0) * 2);
  fallbackScore -= Math.max(0, 100 - (result.pigmentation_data?.clarity_score ?? 100)) * 0.3;
  fallbackScore -= Math.max(0, 100 - (result.dryness_data?.hydration_score ?? 100)) * 0.2;
  fallbackScore -= Math.min(20, (result.dryness_data?.roughness_score ?? 0) * 2);
  const overallScore = result.health_score ?? Math.max(0, Math.round(fallbackScore));

  // ── Brand Color Palette (matches website primary colors) ──
  const brandDeep   = [88,  13,  30];   // #580d1e – dark crimson
  const brandMid    = [136, 13,  30];   // #880d1e – primary-700
  const brandLight  = [173, 22,  57];   // #ad1639 – primary-600
  const brandTint   = [255, 240, 243];  // soft rose tint

  // Neutral palette
  const ink     = [15,  23,  42];
  const slate   = [51,  65,  85];
  const muted   = [100, 116, 139];
  const ghost   = [148, 163, 184];
  const silver  = [226, 232, 240];

  const snow    = [248, 250, 252];
  const white   = [255, 255, 255];
  const navy    = [15,  23,  42];

  // Status colors
  const rose        = [220, 38,  38];
  const roseLight   = [254, 242, 242];
  const amber       = [180, 83,  9];
  const amberLight  = [255, 251, 235];
  const emerald     = [5,   150, 105];
  const emeraldLight= [236, 253, 245];

  // ── Helpers ──
  function font(style: 'normal' | 'bold' = 'normal', size: number = 10) {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(size);
  }
  function color(c: number[]) { doc.setTextColor(c[0], c[1], c[2]); }
  function fillRect(x: number, yy: number, w: number, h: number, c: number[], r: number = 0) {
    doc.setFillColor(c[0], c[1], c[2]);
    if (r > 0) doc.roundedRect(x, yy, w, h, r, r, 'F');
    else doc.rect(x, yy, w, h, 'F');
  }
  function strokeRect(x: number, yy: number, w: number, h: number, c: number[] = silver, r: number = 2) {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, yy, w, h, r, r, 'S');
  }
  function ln(x1: number, yy: number, x2: number, c: number[] = silver, w: number = 0.3) {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
    doc.line(x1, yy, x2, yy);
  }
  function card(x: number, yy: number, w: number, h: number) {
    fillRect(x, yy, w, h, white, 3);
    strokeRect(x, yy, w, h, silver, 3);
  }
  function checkPage(needed: number) {
    if (y + needed > pageHeight - 25) { doc.addPage(); y = margin; }
  }
  function sectionHeader(title: string, yy: number) {
    font('bold', 11);
    color(brandDeep);
    doc.text(title, margin, yy);
    ln(margin, yy + 2, margin + doc.getTextWidth(title) + 4, brandMid, 1);
    return yy + 9;
  }
  /** Draw text horizontally centered on cx. */
  function textCenter(s: string, cx: number, yy: number) {
    doc.text(s, cx - doc.getTextWidth(s) / 2, yy);
  }
  /** Baseline y that vertically centers `size`-pt text inside box (boxY, boxH). */
  function vBaseline(boxY: number, boxH: number, size: number) {
    return boxY + boxH / 2 + size * 0.12;
  }

  // ═══════════════════════════════════════════════════════
  //  COVER PAGE — Full Brand Header
  // ═══════════════════════════════════════════════════════

  // Background gradient simulation (layered dark header)
  fillRect(0, 0, pageWidth, 110, brandDeep);
  fillRect(0, 90, pageWidth, 20, [55, 10, 22]); // darker base strip

  // Decorative corner elements
  doc.setFillColor(brandMid[0], brandMid[1], brandMid[2]);
  doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
  doc.circle(pageWidth - 10, 10, 40, 'F');
  doc.circle(10, 100, 25, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // ── Logo wordmark (Skin + Sense in different weights) ──
  font('bold', 32);
  color(white);
  doc.text('Skin', margin, 32);
  const skinWidth = doc.getTextWidth('Skin');

  // "Sense" in brand highlight color (same font/size as measured above)
  doc.setTextColor(255, 200, 210); // soft rose-white
  doc.text('Sense', margin + skinWidth, 32);

  // Subtitle tag
  font('normal', 9);
  color(ghost);
  doc.text('Clinical Skin Analysis Report', margin, 41);

  // Thin brand accent line under wordmark
  ln(margin, 46, margin + 60, brandLight, 1.5);

  // ── Divider ornament ──
  fillRect(margin, 50, 4, 4, brandLight, 2);
  fillRect(margin + 7, 50, 4, 4, brandLight, 2);
  fillRect(margin + 14, 50, 4, 4, brandLight, 2);

  // ── Report metadata grid ──
  // NOTE: Right side is reserved for the score ring, so metadata uses
  // only the left area to avoid overlap (see score ring below).
  const ringCx = pageWidth - 42;
  const ringCy = 46;
  const ringR  = 18;
  const ringReserved = (pageWidth - ringCx) + ringR + 8; // right zone kept clear
  const metaCols = [
    { label: 'SESSION ID', value: `#${sessionId}` },
    { label: 'GENERATED ON', value: dateStr },
    { label: 'TIME', value: timeStr },
  ];

  const metaAvailWidth = contentWidth - ringReserved;
  const metaColW = metaAvailWidth / metaCols.length;
  metaCols.forEach((col, i) => {
    const cx = margin + i * metaColW;
    font('bold', 6.5);
    color(ghost);
    doc.text(col.label, cx, 64);
    font('bold', 8.5);
    color(white);
    doc.text(col.value, cx, 71);
  });

  // ── User info section (if available) ──
  if (userInfo?.name || userInfo?.email) {
    ln(margin, 82, pageWidth - margin, [80, 40, 50], 0.3);
    font('bold', 6.5);
    color(ghost);
    doc.text('PREPARED FOR', margin, 89);
    font('bold', 10);
    color(white);
    doc.text(userInfo.name || 'User', margin, 96);
    if (userInfo.email) {
      font('normal', 7.5);
      color(ghost);
      doc.text(userInfo.email, margin, 102);
    }
  }

  // ── Score ring (top right, clear of metadata grid above) ──
  const ringStroke = 5;

  // Track circle
  doc.setDrawColor(55, 22, 30);
  doc.setLineWidth(ringStroke);
  doc.circle(ringCx, ringCy, ringR, 'S');

  // Score arc
  const scoreAngle = (overallScore / 100) * 2 * Math.PI;
  const steps = 80;
  doc.setLineWidth(ringStroke);
  doc.setLineCap('round');
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + (i / steps) * scoreAngle;
    const a2 = -Math.PI / 2 + ((i + 1) / steps) * scoreAngle;
    if ((i / steps) * 100 < overallScore) {
      const pct = i / steps;
      const r = Math.round(brandMid[0] + (255 - brandMid[0]) * pct * 0.3);
      const g = Math.round(brandMid[1] + (100 - brandMid[1]) * pct * 0.3);
      const b = Math.round(brandMid[2] + (50  - brandMid[2]) * pct * 0.3);
      doc.setDrawColor(r, g, b);
    } else {
      break;
    }
    const x1 = ringCx + ringR * Math.cos(a1);
    const y1 = ringCy + ringR * Math.sin(a1);
    const x2 = ringCx + ringR * Math.cos(a2);
    const y2 = ringCy + ringR * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }

  // Score text (horizontally centered in ring)
  font('bold', 20);
  color(white);
  const scoreStr = `${overallScore}`;
  textCenter(scoreStr, ringCx, ringCy + 3);
  font('normal', 6);
  color(ghost);
  textCenter('/ 100', ringCx, ringCy + 9);
  font('bold', 6);
  color(ghost);
  textCenter('SCORE', ringCx, ringCy + 15);

  // Analysis type caption centered below the ring (was 4th metadata
  // column, moved here to prevent overlap with the ring).
  const analysisLabel = 'ANALYSIS TYPE';
  const analysisValue = 'AI Skin Analysis';
  font('bold', 6.5);
  color(ghost);
  textCenter(analysisLabel, ringCx, ringCy + ringR + 7);
  font('bold', 8);
  color(white);
  textCenter(analysisValue, ringCx, ringCy + ringR + 12);

  // ── Severity badge on light background (auto-width, centered text) ──
  y = 116;
  const sevColor = result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald;

  fillRect(margin, y, contentWidth, 20, snow, 3);
  strokeRect(margin, y, contentWidth, 20, silver, 3);

  font('bold', 7);
  const sevText = result.severity.toUpperCase();
  const sevBadgeW = Math.max(20, doc.getTextWidth(sevText) + 8);
  const sevBadgeH = 12;
  fillRect(margin + 4, y + 4, sevBadgeW, sevBadgeH, sevColor, 2);
  color(white);
  textCenter(sevText, margin + 4 + sevBadgeW / 2, vBaseline(y + 4, sevBadgeH, 7));

  const sevTextX = margin + 4 + sevBadgeW + 6;
  font('bold', 11);
  color(ink);
  doc.text(`Severity: ${result.severity}`, sevTextX, y + 9);
  font('normal', 8);
  color(muted);
  doc.text(`${result.acne_count} acne lesion(s) detected. Confidence: ${overallScore}%`, sevTextX, y + 15);

  y = 145;

  // ═══════════════════════════════════════════════════════
  //  EXECUTIVE SUMMARY (dynamic height — never clips)
  // ═══════════════════════════════════════════════════════

  y = sectionHeader('Executive Summary', y);

  font('normal', 8.5);
  const summaryLines = doc.splitTextToSize(
    `This AI-powered analysis detected ${result.acne_count} acne lesion(s) with ${result.severity.toLowerCase()} severity across the facial region. ` +
    `Pigmentation clarity: ${result.pigmentation_data?.clarity_score ?? 0}% with ${result.pigmentation_data?.spots_count ?? 0} spots in a ${result.pigmentation_data?.spatial_pattern ?? 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage ?? 0}%. ` +
    `Hydration: ${result.dryness_data?.hydration_score ?? 0}% — Roughness: ${result.dryness_data?.roughness_score ?? 0}%. ` +
    `Overall skin health score: ${overallScore}/100.`,
    contentWidth - 20,
  ) as string[];
  const summaryLineH = 4.4;
  const summaryBoxH = Math.max(22, summaryLines.length * summaryLineH + 10);
  fillRect(margin, y, contentWidth, summaryBoxH, brandTint, 3);
  strokeRect(margin, y, contentWidth, summaryBoxH, [200, 150, 160], 3);
  // Left brand stripe
  fillRect(margin, y, 4, summaryBoxH, brandMid, 0);
  fillRect(margin, y, 4, 4, brandMid, 0);
  fillRect(margin, y + summaryBoxH - 4, 4, 4, brandMid, 0);

  color(slate);
  doc.text(summaryLines, margin + 10, y + 8);
  y += summaryBoxH + 7;

  // ═══════════════════════════════════════════════════════
  //  KEY METRICS — 4 Branded Cards
  // ═══════════════════════════════════════════════════════

  checkPage(65);
  y = sectionHeader('Key Metrics', y);

  const metrics = [
    { label: 'ACNE', value: `${result.acne_count}`, sub: 'spots detected',  color: result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald, bg: result.severity === 'Severe' ? roseLight : result.severity === 'Moderate' ? amberLight : emeraldLight },
    { label: 'PIGMENTATION', value: `${result.pigmentation_data?.clarity_score ?? 0}%`, sub: 'clarity score', color: (result.pigmentation_data?.clarity_score ?? 100) < 85 ? amber : emerald, bg: (result.pigmentation_data?.clarity_score ?? 100) < 85 ? amberLight : emeraldLight },
    { label: 'HYDRATION', value: `${result.dryness_data?.hydration_score ?? 0}%`, sub: 'moisture level', color: (result.dryness_data?.hydration_score ?? 100) < 60 ? rose : emerald, bg: (result.dryness_data?.hydration_score ?? 100) < 60 ? roseLight : emeraldLight },
    { label: 'TEXTURE', value: `${result.dryness_data?.roughness_score ?? 0}`, sub: 'roughness index', color: (result.dryness_data?.roughness_score ?? 0) > 5 ? amber : emerald, bg: (result.dryness_data?.roughness_score ?? 0) > 5 ? amberLight : emeraldLight },
  ];

  const cardW = (contentWidth - 12) / 4;
  const metricCardH = 36;
  metrics.forEach((m, i) => {
    const cx = margin + i * (cardW + 4);
    fillRect(cx, y, cardW, metricCardH, white, 3);
    strokeRect(cx, y, cardW, metricCardH, silver, 3);

    // Top color bar
    fillRect(cx, y, cardW, 4, m.color, 0);
    fillRect(cx, y, 3, 3, m.color, 0);
    fillRect(cx + cardW - 3, y, 3, 3, m.color, 0);

    // Icon circle
    fillRect(cx + 4, y + 8, 8, 8, m.bg, 4);
    doc.setFillColor(m.color[0], m.color[1], m.color[2]);
    doc.circle(cx + 8, y + 12, 2, 'F');

    font('bold', 6.5);
    color(muted);
    doc.text(m.label, cx + 4, y + 22);

    font('bold', 16);
    color(m.color);
    doc.text(m.value, cx + 4, y + 30);

    font('normal', 6);
    color(ghost);
    doc.text(m.sub, cx + 4, y + 33.5);
  });

  y += metricCardH + 8;

  // ═══════════════════════════════════════════════════════
  //  PIGMENTATION ANALYSIS
  // ═══════════════════════════════════════════════════════

  if (result.pigmentation_data) {
    checkPage(55);
    y = sectionHeader('Pigmentation Analysis', y);

    const pd = result.pigmentation_data;
    const stats = [
      { label: 'Clarity Score',        value: `${pd.clarity_score}%`,          status: pd.clarity_score < 70 ? 'warn' : 'ok' },
      { label: 'Spots Detected',       value: `${pd.spots_count}`,              status: pd.spots_count > 10 ? 'warn' : 'ok' },
      { label: 'Normalized Coverage',  value: `${pd.normalized_coverage}%`,    status: pd.normalized_coverage > 3 ? 'warn' : 'ok' },
      { label: 'Intensity',            value: pd.intensity,                     status: pd.intensity === 'High' ? 'warn' : 'ok' },
      { label: 'Spatial Pattern',      value: pd.spatial_pattern,              status: 'ok' },
    ];

    // Table header
    fillRect(margin, y, contentWidth, 8, brandDeep, 2);
    font('bold', 7); color(white);
    doc.text('METRIC', margin + 5, y + 5.5);
    doc.text('VALUE', margin + 80, y + 5.5);
    doc.text('STATUS', margin + contentWidth - 20, y + 5.5);
    y += 9;

    stats.forEach((s, i) => {
      const rowBg = i % 2 === 0 ? snow : white;
      const rowH = 8;
      fillRect(margin, y, contentWidth, rowH, rowBg, 0);
      font('normal', 8); color(muted);
      doc.text(s.label, margin + 5, y + 5.5);
      font('bold', 8); color(s.status === 'warn' ? amber : ink);
      doc.text(s.value, margin + 80, y + 5.5);
      // Status badge (text centered inside badge)
      const sc = s.status === 'warn' ? amber : emerald;
      const badgeX = margin + contentWidth - 22;
      const badgeW = 18;
      const badgeH = 5;
      const badgeY = y + 1.5;
      fillRect(badgeX, badgeY, badgeW, badgeH, s.status === 'warn' ? amberLight : emeraldLight, 2);
      const badgeText = s.status === 'warn' ? 'ATTENTION' : 'NORMAL';
      font('bold', 5.5); color(sc);
      textCenter(badgeText, badgeX + badgeW / 2, vBaseline(badgeY, badgeH, 5.5));
      y += rowH;
    });

    // Type distribution bar
    const types = pd.type_distribution || {};
    const total = Object.values(types).reduce((a, b) => a + (b as number), 0) as number;
    if (total > 0) {
      y += 4;
      const typeColors: Record<string, number[]> = {
        freckle: brandMid, melasma: amber, pih: rose, sun_spot: [217, 119, 6], unknown: ghost,
      };
      font('bold', 7); color(navy);
      doc.text('Pigmentation Type Breakdown', margin + 5, y + 4);
      const barX = margin + 70; const barW = contentWidth - 75; const barH = 6;
      fillRect(barX, y, barW, barH, silver, 3);
      let bx = barX;
      Object.entries(types).forEach(([type, count]) => {
        const cw = ((count as number) / total) * barW;
        if (cw > 0.5) fillRect(bx, y, cw, barH, typeColors[type] || ghost, 0);
        bx += cw;
      });
      y += barH + 5;
      // Legend (wraps to next line instead of overflowing the page)
      let lx = margin + 5;
      const legendTop = y;
      font('normal', 6.5);
      Object.entries(types).forEach(([type, count]) => {
        const c = typeColors[type] || ghost;
        const label = `${type.replace('_', ' ')} (${count})`;
        const itemW = 4 + 2 + doc.getTextWidth(label) + 14;
        if (lx + itemW > pageWidth - margin) {
          lx = margin + 5;
          y += 5;
        }
        fillRect(lx, y - 2.5, 4, 4, c, 1.5);
        color(muted);
        doc.text(label, lx + 6, y);
        lx += doc.getTextWidth(label) + 14;
      });
      y = Math.max(y + 8, legendTop + 8);
    }
    y += 6;
  }

  // ═══════════════════════════════════════════════════════
  //  ACNE CLASSIFICATION TABLE
  // ═══════════════════════════════════════════════════════

  if (result.spot_types && Object.keys(result.spot_types).length > 0) {
    checkPage(55);
    y = sectionHeader('Acne Classification', y);

    const totalSpots = Object.values(result.spot_types).reduce((a, b) => a + b, 0);
    const maxCount   = Math.max(...Object.values(result.spot_types));

    fillRect(margin, y, contentWidth, 8, brandDeep, 2);
    font('bold', 7); color(white);
    doc.text('SPOT TYPE', margin + 5, y + 5.5);
    doc.text('COUNT', margin + 70, y + 5.5);
    doc.text('SHARE', margin + 95, y + 5.5);
    doc.text('DISTRIBUTION BAR', margin + 115, y + 5.5);
    y += 9;

    Object.entries(result.spot_types).forEach(([type, count], i) => {
      const rowBg = i % 2 === 0 ? snow : white;
      const rowH = 9;
      fillRect(margin, y, contentWidth, rowH, rowBg, 0);
      font('normal', 8); color(ink);
      doc.text(type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '), margin + 5, y + 6);
      font('bold', 8); color(brandMid);
      doc.text(String(count), margin + 70, y + 6);
      const pct = totalSpots > 0 ? Math.round((count / totalSpots) * 100) : 0;
      font('normal', 8); color(muted);
      doc.text(`${pct}%`, margin + 95, y + 6);
      const bw = 55; const fw = maxCount > 0 ? (count / maxCount) * bw : 0;
      fillRect(margin + 115, y + 2.5, bw, 4, silver, 1.5);
      if (fw > 0.5) fillRect(margin + 115, y + 2.5, fw, 4, brandMid, 1.5);
      y += rowH;
    });
    y += 8;
  }

  // ═══════════════════════════════════════════════════════
  //  DAILY ROUTINE (wrapped text + dynamic row heights)
  // ═══════════════════════════════════════════════════════

  if (result.routine) {
    // Pre-compute wrapped rows so the whole two-column block fits / breaks cleanly.
    const halfW = (contentWidth - 4) / 2;
    const prodMaxW = halfW - 24;
    const actionMaxW = halfW - 24;
    type RoutineRow = { step: number; product: string; actionLines: string[]; h: number };
    const buildRows = (steps: Array<{ step: number; product: string; action: string }>): RoutineRow[] =>
      steps.map((step) => {
        font('normal', 7);
        const actionLines = doc.splitTextToSize(step.action || '', actionMaxW) as string[];
        const h = Math.max(12, 6 + actionLines.length * 3.6);
        return { step: step.step, product: step.product, actionLines, h };
      });
    const amRows = buildRows(result.routine.morning);
    const pmRows = buildRows(result.routine.evening);
    const amTotal = amRows.reduce((a, r) => a + r.h + 1, 0);
    const pmTotal = pmRows.reduce((a, r) => a + r.h + 1, 0);
    checkPage(24 + Math.max(amTotal, pmTotal) + (result.routine.tips.length > 0 ? 20 : 0));
    y = sectionHeader('Your Daily Skincare Routine', y);

    // AM header
    fillRect(margin, y, contentWidth / 2 - 3, 10, amberLight, 3);
    doc.setDrawColor(amber[0], amber[1], amber[2]); doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth / 2 - 3, 10, 3, 3, 'S');
    font('bold', 9); color(amber);
    doc.text('MORNING ROUTINE', margin + 5, y + 6.5);

    // PM header
    const pmX0 = margin + contentWidth / 2 + 3;
    fillRect(pmX0, y, contentWidth / 2 - 3, 10, brandTint, 3);
    doc.setDrawColor(brandMid[0], brandMid[1], brandMid[2]); doc.setLineWidth(0.4);
    doc.roundedRect(pmX0, y, contentWidth / 2 - 3, 10, 3, 3, 'S');
    font('bold', 9); color(brandMid);
    doc.text('EVENING ROUTINE', pmX0 + 5, y + 6.5);
    y += 14;

    const drawRoutineCol = (x0: number, rows: RoutineRow[], accent: number[], accentBg: number[]) => {
      let ry = y;
      rows.forEach((row, idx) => {
        fillRect(x0, ry, halfW, row.h, idx % 2 === 0 ? snow : white, 2);
        fillRect(x0, ry, 4, row.h, accentBg, 0);
        // Step number (centered in 7x7 circle, vertically centered in row)
        const numBoxY = ry + (row.h - 7) / 2;
        fillRect(x0 + 7, numBoxY, 7, 7, accent, 3.5);
        font('bold', 7); color(white);
        textCenter(`${row.step}`, x0 + 10.5, vBaseline(numBoxY, 7, 7));
        // Product (single line, clipped to column)
        font('bold', 8); color(ink);
        const prodLines = doc.splitTextToSize(row.product || '', prodMaxW) as string[];
        doc.text(prodLines[0] || '', x0 + 17, ry + 5.5);
        // Action (all wrapped lines, not just the first)
        font('normal', 7); color(muted);
        doc.text(row.actionLines, x0 + 17, ry + 10);
        ry += row.h + 1;
      });
      return ry;
    };

    const amEnd = drawRoutineCol(margin, amRows, amber, amberLight);
    const pmEnd = drawRoutineCol(pmX0, pmRows, brandMid, brandTint);
    y = Math.max(amEnd, pmEnd) + 4;

    // Tips (all lines rendered, bar grows with text)
    if (result.routine.tips.length > 0) {
      const tipBlocks = result.routine.tips.map((tip) => {
        font('normal', 7.5);
        const lines = doc.splitTextToSize(tip, contentWidth - 14) as string[];
        return { lines, h: lines.length * 4 + 5 };
      });
      const tipsNeeded = 12 + tipBlocks.reduce((a, b) => a + b.h + 2, 0);
      checkPage(tipsNeeded);
      fillRect(margin, y, contentWidth, 8, brandDeep, 2);
      font('bold', 8); color(white);
      doc.text('PRO TIPS & LIFESTYLE', margin + 5, y + 5.5);
      y += 10;
      tipBlocks.forEach((block) => {
        checkPage(block.h + 2);
        fillRect(margin, y, 4, block.h, brandMid, 0);
        font('normal', 7.5); color(slate);
        doc.text(block.lines, margin + 8, y + 5);
        y += block.h + 2;
      });
      y += 4;
    }
    y += 6;
  }

  // ═══════════════════════════════════════════════════════
  //  RECOMMENDATIONS (dynamic card heights, wrapped text)
  // ═══════════════════════════════════════════════════════

  if (result.recommendations && result.recommendations.length > 0) {
    checkPage(35);
    y = sectionHeader('Personalized Recommendations', y);

    result.recommendations.forEach((rec, i) => {
      font('bold', 10);
      const titleLines = doc.splitTextToSize(rec.title || '', contentWidth - 40) as string[];
      font('normal', 7.5);
      const descLines = doc.splitTextToSize(rec.description || '', contentWidth - 32) as string[];
      font('normal', 5.5);
      const whyLines = rec.why ? (doc.splitTextToSize(`WHY: ${rec.why}`, contentWidth - 36) as string[]) : [];
      const whyH = whyLines.length > 0 ? whyLines.length * 3.4 + 3 : 0;
      const cardH = Math.max(26, 10 + titleLines.length * 5 + descLines.length * 4 + whyH + 4);
      checkPage(cardH + 2);
      const priorityColor = rec.priority === 'high' ? rose : rec.priority === 'medium' ? amber : emerald;
      const priorityBg    = rec.priority === 'high' ? roseLight : rec.priority === 'medium' ? amberLight : emeraldLight;

      card(margin, y, contentWidth, cardH);
      fillRect(margin, y, 5, cardH, priorityColor, 0);
      fillRect(margin, y, 5, 3, priorityColor, 0);
      fillRect(margin, y + cardH - 3, 5, 3, priorityColor, 0);

      // Number (centered in 9x9 badge)
      const numBoxY = y + 3;
      fillRect(margin + 9, numBoxY, 9, 9, priorityColor, 4.5);
      font('bold', 9); color(white);
      textCenter(`${i + 1}`, margin + 13.5, vBaseline(numBoxY, 9, 9));

      // Priority badge (text centered)
      const priBadgeX = margin + 22;
      const priBadgeW = 18;
      const priBadgeH = 5;
      const priBadgeY = y + 3.5;
      fillRect(priBadgeX, priBadgeY, priBadgeW, priBadgeH, priorityBg, 2);
      font('bold', 6); color(priorityColor);
      textCenter(rec.priority.toUpperCase(), priBadgeX + priBadgeW / 2, vBaseline(priBadgeY, priBadgeH, 6));
      font('normal', 6); color(ghost);
      doc.text(rec.category.toUpperCase(), priBadgeX + priBadgeW + 4, y + 7.2);

      // Title (wrapped)
      font('bold', 10); color(ink);
      doc.text(titleLines, margin + 22, y + 15);

      // Description (all lines, not just the first)
      font('normal', 7.5); color(muted);
      const descY = y + 15 + titleLines.length * 5;
      doc.text(descLines, margin + 22, descY + 1.5);

      // Why strip (wrapped, grows with text)
      if (whyLines.length > 0) {
        const whyY = descY + 1.5 + descLines.length * 4 + 1;
        fillRect(margin + 22, whyY, contentWidth - 30, whyH, brandTint, 1);
        font('normal', 5.5); color(brandMid);
        doc.text(whyLines, margin + 24, whyY + 4);
      }
      y += cardH + 2;
    });
  }

  // ═══════════════════════════════════════════════════════
  //  CLINICAL INTERPRETATION (dynamic height — content never overflows card)
  // ═══════════════════════════════════════════════════════

  checkPage(60);
  y += 4;
  y = sectionHeader('Clinical Interpretation', y);

  font('normal', 8.5);
  const interpLines = doc.splitTextToSize(
    `Primary findings indicate ${result.severity.toLowerCase()} inflammatory activity and ` +
    `${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'significant trans-epidermal moisture loss' : 'stable barrier function'}. ` +
    `Multi-spectral analysis identifies ${result.pigmentation_data?.spots_count ?? 0} pigment clusters in a ${result.pigmentation_data?.spatial_pattern ?? 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage ?? 0}%. ` +
    `Sebaceous activity is ${result.acne_count > 5 ? 'elevated — targeted sebum-regulating ingredients are recommended' : 'within optimal parameters'}. ` +
    `Melanin distribution clarity at ${result.pigmentation_data?.clarity_score ?? 0}%. ` +
    `Overall skin health score: ${overallScore}/100.`,
    contentWidth - 20,
  ) as string[];
  const interpLineH = 4.5;

  font('bold', 9);
  const actionTitle = 'Priority Action Items';
  const actions = [
    `Acne: ${result.acne_count > 10 ? 'Seek professional dermatological consultation immediately' : result.acne_count > 0 ? 'Apply targeted topical treatments (Niacinamide, Salicylic Acid)' : 'Maintain current routine — skin appears clear'}`,
    `Pigmentation: ${result.pigmentation_data && result.pigmentation_data.clarity_score < 70 ? 'Introduce retinol-based treatments and SPF 50+ daily' : 'Apply Vitamin C serum and maintain daily sunscreen use'}`,
    `Hydration: ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'Prioritize ceramide-based moisturizers and hyaluronic acid serums' : 'Maintain current hydration routine — levels appear healthy'}`,
  ];
  font('normal', 7.5);
  const actionBlocks = actions.map((a) => doc.splitTextToSize(a, contentWidth - 28) as string[]);
  const actionsH = actionBlocks.reduce((acc, lines) => acc + lines.length * 4 + 4, 0);
  const interpBoxH = 8 + interpLines.length * interpLineH + 8 + 6 + actionsH + 6;
  checkPage(interpBoxH + 4);

  card(margin, y, contentWidth, interpBoxH);
  fillRect(margin, y, 5, interpBoxH, brandMid, 0);
  fillRect(margin, y, 5, 3, brandMid, 0);
  fillRect(margin, y + interpBoxH - 3, 5, 3, brandMid, 0);

  font('normal', 8.5); color(slate);
  doc.text(interpLines, margin + 10, y + 8);
  let interY = y + 8 + interpLines.length * interpLineH + 4;

  font('bold', 9); color(brandDeep);
  doc.text(actionTitle, margin + 10, interY);
  interY += 6;

  actionBlocks.forEach((aLines, i) => {
    const blockH = aLines.length * 4 + 4;
    checkPage(blockH + 2);
    const numY = interY - 1;
    fillRect(margin + 10, numY, 5, 5, brandMid, 2.5);
    font('bold', 7); color(white);
    textCenter(`${i + 1}`, margin + 12.5, vBaseline(numY, 5, 7));
    font('normal', 7.5); color(slate);
    doc.text(aLines, margin + 18, interY + 2.5);
    interY += blockH;
  });
  y += interpBoxH + 4;

  // ═══════════════════════════════════════════════════════
  //  FOOTER — Branded on every page
  // ═══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer background strip
    fillRect(0, pageHeight - 22, pageWidth, 22, brandDeep);

    // SkinSense logo wordmark (measure "Sense" BEFORE changing font for tagline)
    font('bold', 9); color(white);
    doc.text('Skin', margin, pageHeight - 10);
    const sw = doc.getTextWidth('Skin');
    doc.setTextColor(255, 180, 190);
    doc.text('Sense', margin + sw, pageHeight - 10);
    const senseW = doc.getTextWidth('Sense');

    // Tagline (uses cached 9pt width so it starts after the logo, not overlapped)
    font('normal', 6); color(ghost);
    doc.text('AI-Powered Dermatological Analysis', margin + sw + senseW + 4, pageHeight - 10);

    // Disclaimer
    font('normal', 5); color(ghost);
    doc.text('This report is for informational purposes only and does not replace professional medical advice.', margin, pageHeight - 5);

    // Page number (right)
    font('bold', 8); color(white);
    const pageLabel = `${i} / ${totalPages}`;
    doc.text(pageLabel, pageWidth - margin - doc.getTextWidth(pageLabel), pageHeight - 10);
    font('normal', 5.5); color(ghost);
    doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), pageHeight - 5);
  }

  // ── Save ──
  const filename = `SkinSense_Report_${sessionId}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
