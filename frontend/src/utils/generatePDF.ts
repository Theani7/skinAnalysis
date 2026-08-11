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
  const cloud   = [241, 245, 249];
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

  // ── Logo wordmark (Skin + AI in different weights) ──
  font('bold', 32);
  color(white);
  doc.text('Skin', margin, 32);
  const skinWidth = doc.getTextWidth('Skin');

  doc.setFillColor(brandLight[0], brandLight[1], brandLight[2]);
  // "AI" in brand highlight color
  doc.setTextColor(255, 200, 210); // soft rose-white
  font('bold', 32);
  doc.text('AI', margin + skinWidth, 32);

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
  const metaCols = [
    { label: 'SESSION ID', value: `#${sessionId}` },
    { label: 'GENERATED ON', value: dateStr },
    { label: 'TIME', value: timeStr },
    { label: 'ANALYSIS TYPE', value: 'AI Skin Analysis' },
  ];

  metaCols.forEach((col, i) => {
    const cx = margin + i * (contentWidth / 4);
    font('bold', 6.5);
    color(ghost);
    doc.text(col.label, cx, 64);
    font('bold', 8.5);
    color(white);
    doc.text(col.value, cx, 71);
  });

  // ── User info section (if available) ──
  if (userInfo?.name || userInfo?.email) {
    ln(margin, 78, pageWidth - margin, [80, 40, 50], 0.3);
    font('bold', 6.5);
    color(ghost);
    doc.text('PREPARED FOR', margin, 85);
    font('bold', 10);
    color(white);
    doc.text(userInfo.name || 'User', margin, 92);
    if (userInfo.email) {
      font('normal', 7.5);
      color(ghost);
      doc.text(userInfo.email, margin, 98);
    }
  }

  // ── Score ring (top right) ──
  const ringCx = pageWidth - 38;
  const ringCy = 58;
  const ringR  = 24;
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

  // Score text
  font('bold', 20);
  color(white);
  const scoreStr = `${overallScore}`;
  doc.text(scoreStr, ringCx - doc.getTextWidth(scoreStr) / 2, ringCy + 3);
  font('normal', 6);
  color(ghost);
  doc.text('/ 100', ringCx - 5, ringCy + 9);
  font('bold', 6);
  color(ghost);
  doc.text('SCORE', ringCx - 6, ringCy + 15);

  // ── Severity badge on light background ──
  y = 116;
  const sevColor = result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald;
  const sevBg    = result.severity === 'Severe' ? roseLight : result.severity === 'Moderate' ? amberLight : emeraldLight;

  fillRect(margin, y, contentWidth, 20, snow, 3);
  strokeRect(margin, y, contentWidth, 20, silver, 3);

  fillRect(margin + 4, y + 4, 20, 12, sevColor, 2);
  font('bold', 7);
  color(white);
  doc.text(result.severity.toUpperCase(), margin + 6, y + 11.5);

  font('bold', 11);
  color(ink);
  doc.text(`Severity: ${result.severity}`, margin + 30, y + 9);
  font('normal', 8);
  color(muted);
  doc.text(`${result.acne_count} acne lesion(s) detected. Confidence: ${overallScore}%`, margin + 30, y + 15);

  y = 145;

  // ═══════════════════════════════════════════════════════
  //  EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════

  y = sectionHeader('Executive Summary', y);

  fillRect(margin, y, contentWidth, 28, brandTint, 3);
  strokeRect(margin, y, contentWidth, 28, [200, 150, 160], 3);
  // Left brand stripe
  fillRect(margin, y, 4, 28, brandMid, 0);
  fillRect(margin, y, 4, 4, brandMid, 0);
  fillRect(margin, y + 24, 4, 4, brandMid, 0);

  font('normal', 8.5);
  color(slate);
  const summary = doc.splitTextToSize(
    `This AI-powered analysis detected ${result.acne_count} acne lesion(s) with ${result.severity.toLowerCase()} severity across the facial region. ` +
    `Pigmentation clarity: ${result.pigmentation_data?.clarity_score ?? 0}% with ${result.pigmentation_data?.spots_count ?? 0} spots in a ${result.pigmentation_data?.spatial_pattern ?? 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage ?? 0}%. ` +
    `Hydration: ${result.dryness_data?.hydration_score ?? 0}% — Roughness: ${result.dryness_data?.roughness_score ?? 0}%. ` +
    `Overall skin health score: ${overallScore}/100.`,
    contentWidth - 16
  );
  doc.text(summary, margin + 10, y + 8);
  y += 35;

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
  metrics.forEach((m, i) => {
    const cx = margin + i * (cardW + 4);
    fillRect(cx, y, cardW, 36, white, 3);
    strokeRect(cx, y, cardW, 36, silver, 3);

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
    doc.text(m.value, cx + 4, y + 31);

    font('normal', 6);
    color(ghost);
    doc.text(m.sub, cx + 4, y + 36);
  });

  y += 44;

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
      fillRect(margin, y, contentWidth, 8, rowBg, 0);
      font('normal', 8); color(muted);
      doc.text(s.label, margin + 5, y + 5.5);
      font('bold', 8); color(s.status === 'warn' ? amber : ink);
      doc.text(s.value, margin + 80, y + 5.5);
      // Status badge
      const sc = s.status === 'warn' ? amber : emerald;
      fillRect(margin + contentWidth - 22, y + 1.5, 18, 5, s.status === 'warn' ? amberLight : emeraldLight, 2);
      font('bold', 5.5); color(sc);
      doc.text(s.status === 'warn' ? 'ATTENTION' : 'NORMAL', margin + contentWidth - 20, y + 5.2);
      y += 8;
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
        fillRect(bx, y, cw, barH, typeColors[type] || ghost, 0);
        bx += cw;
      });
      y += barH + 5;
      let lx = margin + 5;
      font('normal', 6.5);
      Object.entries(types).forEach(([type, count]) => {
        const c = typeColors[type] || ghost;
        fillRect(lx, y - 2.5, 4, 4, c, 1.5);
        color(muted);
        doc.text(`${type.replace('_', ' ')} (${count})`, lx + 6, y);
        lx += doc.getTextWidth(`${type.replace('_', ' ')} (${count})`) + 14;
      });
      y += 8;
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
      fillRect(margin, y, contentWidth, 9, rowBg, 0);
      font('normal', 8); color(ink);
      doc.text(type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '), margin + 5, y + 6);
      font('bold', 8); color(brandMid);
      doc.text(String(count), margin + 70, y + 6);
      const pct = totalSpots > 0 ? Math.round((count / totalSpots) * 100) : 0;
      font('normal', 8); color(muted);
      doc.text(`${pct}%`, margin + 95, y + 6);
      const bw = 55; const fw = (count / maxCount) * bw;
      fillRect(margin + 115, y + 2.5, bw, 4, silver, 1.5);
      fillRect(margin + 115, y + 2.5, fw, 4, brandMid, 1.5);
      y += 9;
    });
    y += 8;
  }

  // ═══════════════════════════════════════════════════════
  //  DAILY ROUTINE
  // ═══════════════════════════════════════════════════════

  if (result.routine) {
    checkPage(80);
    y = sectionHeader('Your Daily Skincare Routine', y);

    // AM header
    fillRect(margin, y, contentWidth / 2 - 3, 10, amberLight, 3);
    doc.setDrawColor(amber[0], amber[1], amber[2]); doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth / 2 - 3, 10, 3, 3, 'S');
    font('bold', 9); color(amber);
    doc.text('☀  MORNING ROUTINE', margin + 5, y + 6.5);

    // PM header
    const pmX0 = margin + contentWidth / 2 + 3;
    fillRect(pmX0, y, contentWidth / 2 - 3, 10, brandTint, 3);
    doc.setDrawColor(brandMid[0], brandMid[1], brandMid[2]); doc.setLineWidth(0.4);
    doc.roundedRect(pmX0, y, contentWidth / 2 - 3, 10, 3, 3, 'S');
    font('bold', 9); color(brandMid);
    doc.text('🌙  EVENING ROUTINE', pmX0 + 5, y + 6.5);
    y += 14;

    const halfW = (contentWidth - 4) / 2;

    let amY = y;
    result.routine.morning.forEach((step, idx) => {
      checkPage(14);
      fillRect(margin, amY, halfW, 12, idx % 2 === 0 ? snow : white, 2);
      fillRect(margin, amY, 4, 12, amberLight, 0);
      // Step number
      fillRect(margin + 7, amY + 2, 7, 7, amber, 3.5);
      font('bold', 7); color(white);
      doc.text(`${step.step}`, margin + 9, amY + 7.5);
      font('bold', 8); color(ink);
      doc.text(step.product, margin + 17, amY + 5);
      font('normal', 7); color(muted);
      const aLines = doc.splitTextToSize(step.action, halfW - 20);
      doc.text(aLines[0] || '', margin + 17, amY + 9.5);
      amY += 13;
    });

    let pmY = y;
    result.routine.evening.forEach((step, idx) => {
      checkPage(14);
      fillRect(pmX0, pmY, halfW, 12, idx % 2 === 0 ? snow : white, 2);
      fillRect(pmX0, pmY, 4, 12, brandTint, 0);
      fillRect(pmX0 + 7, pmY + 2, 7, 7, brandMid, 3.5);
      font('bold', 7); color(white);
      doc.text(`${step.step}`, pmX0 + 9, pmY + 7.5);
      font('bold', 8); color(ink);
      doc.text(step.product, pmX0 + 17, pmY + 5);
      font('normal', 7); color(muted);
      const aLines = doc.splitTextToSize(step.action, halfW - 20);
      doc.text(aLines[0] || '', pmX0 + 17, pmY + 9.5);
      pmY += 13;
    });

    y = Math.max(amY, pmY) + 4;

    // Tips
    if (result.routine.tips.length > 0) {
      checkPage(12 + result.routine.tips.length * 7);
      fillRect(margin, y, contentWidth, 8, brandDeep, 2);
      font('bold', 8); color(white);
      doc.text('PRO TIPS & LIFESTYLE', margin + 5, y + 5.5);
      y += 10;
      result.routine.tips.forEach((tip) => {
        checkPage(10);
        fillRect(margin, y, 4, 7, brandMid, 0);
        font('normal', 7.5); color(slate);
        const tipLines = doc.splitTextToSize(tip, contentWidth - 12);
        doc.text(tipLines[0] || '', margin + 8, y + 5);
        y += tipLines.length > 1 ? 12 : 9;
      });
      y += 4;
    }
    y += 6;
  }

  // ═══════════════════════════════════════════════════════
  //  RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════

  if (result.recommendations && result.recommendations.length > 0) {
    checkPage(35);
    y = sectionHeader('Personalized Recommendations', y);

    result.recommendations.forEach((rec, i) => {
      checkPage(30);
      const priorityColor = rec.priority === 'high' ? rose : rec.priority === 'medium' ? amber : emerald;
      const priorityBg    = rec.priority === 'high' ? roseLight : rec.priority === 'medium' ? amberLight : emeraldLight;

      card(margin, y, contentWidth, 26);
      fillRect(margin, y, 5, 26, priorityColor, 0);
      fillRect(margin, y, 5, 3, priorityColor, 0);
      fillRect(margin, y + 23, 5, 3, priorityColor, 0);

      // Number
      fillRect(margin + 9, y + 3, 9, 9, priorityColor, 4.5);
      font('bold', 9); color(white);
      doc.text(`${i + 1}`, margin + 12, y + 10);

      // Priority + category badges
      fillRect(margin + 22, y + 3.5, 18, 5, priorityBg, 2);
      font('bold', 6); color(priorityColor);
      doc.text(rec.priority.toUpperCase(), margin + 24, y + 7.2);
      font('normal', 6); color(ghost);
      doc.text(rec.category.toUpperCase(), margin + 44, y + 7.2);

      // Title
      font('bold', 10); color(ink);
      doc.text(rec.title, margin + 22, y + 15);

      // Description
      font('normal', 7.5); color(muted);
      const descLines = doc.splitTextToSize(rec.description, contentWidth - 32);
      doc.text(descLines[0] || '', margin + 22, y + 20.5);

      // Why strip
      if (rec.why) {
        fillRect(margin + 22, y + 22, contentWidth - 30, 3, brandTint, 1);
        font('bold', 5.5); color(brandMid);
        doc.text('WHY: ', margin + 24, y + 24.5);
        font('normal', 5.5); color(brandMid);
        doc.text(rec.why.substring(0, 80), margin + 33, y + 24.5);
      }
      y += 28;
    });
  }

  // ═══════════════════════════════════════════════════════
  //  CLINICAL INTERPRETATION
  // ═══════════════════════════════════════════════════════

  checkPage(60);
  y += 4;
  y = sectionHeader('Clinical Interpretation', y);

  card(margin, y, contentWidth, 48);
  fillRect(margin, y, 5, 48, brandMid, 0);
  fillRect(margin, y, 5, 3, brandMid, 0);
  fillRect(margin, y + 45, 5, 3, brandMid, 0);

  font('normal', 8.5); color(slate);
  const interpText = doc.splitTextToSize(
    `Primary findings indicate ${result.severity.toLowerCase()} inflammatory activity and ` +
    `${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'significant trans-epidermal moisture loss' : 'stable barrier function'}. ` +
    `Multi-spectral analysis identifies ${result.pigmentation_data?.spots_count ?? 0} pigment clusters in a ${result.pigmentation_data?.spatial_pattern ?? 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage ?? 0}%. ` +
    `Sebaceous activity is ${result.acne_count > 5 ? 'elevated — targeted sebum-regulating ingredients are recommended' : 'within optimal parameters'}. ` +
    `Melanin distribution clarity at ${result.pigmentation_data?.clarity_score ?? 0}%. ` +
    `Overall skin health score: ${overallScore}/100.`,
    contentWidth - 20
  );
  doc.text(interpText, margin + 10, y + 8);
  let interY = y + 8 + interpText.length * 4.5;

  font('bold', 9); color(brandDeep);
  doc.text('Priority Action Items', margin + 10, interY);
  interY += 6;

  const actions = [
    `Acne: ${result.acne_count > 10 ? 'Seek professional dermatological consultation immediately' : result.acne_count > 0 ? 'Apply targeted topical treatments (Niacinamide, Salicylic Acid)' : 'Maintain current routine — skin appears clear'}`,
    `Pigmentation: ${result.pigmentation_data && result.pigmentation_data.clarity_score < 70 ? 'Introduce retinol-based treatments and SPF 50+ daily' : 'Apply Vitamin C serum and maintain daily sunscreen use'}`,
    `Hydration: ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'Prioritize ceramide-based moisturizers and hyaluronic acid serums' : 'Maintain current hydration routine — levels appear healthy'}`,
  ];

  actions.forEach((a, i) => {
    checkPage(10);
    fillRect(margin + 10, interY - 1, 5, 5, brandMid, 2.5);
    font('bold', 7); color(white);
    doc.text(`${i + 1}`, margin + 11.5, interY + 2.5);
    font('normal', 7.5); color(slate);
    const aLines = doc.splitTextToSize(a, contentWidth - 25);
    doc.text(aLines, margin + 18, interY + 2.5);
    interY += aLines.length * 4 + 4;
  });
  y += 52;

  // ═══════════════════════════════════════════════════════
  //  FOOTER — Branded on every page
  // ═══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer background strip
    fillRect(0, pageHeight - 22, pageWidth, 22, brandDeep);

    // SkinAI logo wordmark
    font('bold', 9); color(white);
    doc.text('Skin', margin, pageHeight - 10);
    const sw = doc.getTextWidth('Skin');
    doc.setTextColor(255, 180, 190);
    font('bold', 9);
    doc.text('AI', margin + sw, pageHeight - 10);

    // Tagline
    font('normal', 6); color(ghost);
    doc.text('AI-Powered Dermatological Analysis', margin + sw + doc.getTextWidth('AI') + 4, pageHeight - 10);

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
  const filename = `SkinAI_Report_${sessionId}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
