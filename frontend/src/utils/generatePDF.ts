import jsPDF from 'jspdf';
import { AnalysisResponse } from '../services/api';

export function generateClinicalReportPDF(result: AnalysisResponse): void {
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
  const overallScore = Math.round(result.confidence * 100);

  // ── Premium Color Palette ──
  const ink = [15, 23, 42];
  const slate = [51, 65, 85];
  const muted = [100, 116, 139];
  const ghost = [148, 163, 184];
  const silver = [226, 232, 240];
  const cloud = [241, 245, 249];
  const snow = [248, 250, 252];
  const white = [255, 255, 255];
  const navy = [30, 41, 59];
  const accent = [79, 70, 229];
  const accentLight = [238, 242, 255];
  const rose = [225, 29, 72];
  const roseLight = [255, 241, 242];
  const amber = [217, 119, 6];
  const amberLight = [255, 251, 235];
  const emerald = [5, 150, 105];
  const emeraldLight = [236, 253, 245];

  // ── Helpers ──
  function font(style: 'normal' | 'bold' = 'normal', size: number = 10) {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(size);
  }

  function color(c: number[]) {
    doc.setTextColor(c[0], c[1], c[2]);
  }

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

  function line(x1: number, yy: number, x2: number, c: number[] = silver, w: number = 0.3) {
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(w);
    doc.line(x1, yy, x2, yy);
  }

  function sectionHeader(title: string, yy: number, icon?: string) {
    font('bold', 11);
    color(navy);
    doc.text(icon ? `${icon}  ${title}` : title, margin, yy);
    line(margin, yy + 2, margin + 35, accent, 0.7);
    return yy + 8;
  }

  function card(x: number, yy: number, w: number, h: number) {
    fillRect(x, yy, w, h, white, 3);
    strokeRect(x, yy, w, h, silver, 3);
  }

  function checkPage(needed: number) {
    if (y + needed > pageHeight - 25) { doc.addPage(); y = margin; }
  }

  // ═══════════════════════════════════════════════════════
  //  COVER PAGE — Dark Header + Score Ring
  // ═══════════════════════════════════════════════════════

  // Full-width dark header
  fillRect(0, 0, pageWidth, 100, navy);

  // Branding
  font('bold', 26);
  color(white);
  doc.text('SkinAI', margin, 28);

  font('normal', 10);
  color(ghost);
  doc.text('Clinical Analysis Report', margin, 36);

  // Thin accent line
  line(margin, 42, margin + 40, accent, 1.2);

  // Session metadata
  font('bold', 7);
  color(ghost);
  doc.text('SESSION', margin, 52);
  doc.text('GENERATED', margin + 50, 52);
  doc.text('ANALYSIS TYPE', margin + 110, 52);

  font('bold', 9);
  color(white);
  doc.text(`#${sessionId}`, margin, 58);
  doc.text(`${dateStr}  ${timeStr}`, margin + 50, 58);
  doc.text('Multi-Spectral Dermatological', margin + 110, 58);

  // Score ring (centered in header)
  const ringCx = pageWidth - 42;
  const ringCy = 55;
  const ringR = 28;
  const ringStroke = 5;

  // Background circle
  doc.setDrawColor(60, 71, 90);
  doc.setLineWidth(ringStroke);
  doc.setLineCap('round');
  const steps = 60;
  const scoreAngle = (overallScore / 100) * 2 * Math.PI - Math.PI / 2;
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + (i / steps) * 2 * Math.PI;
    const a2 = -Math.PI / 2 + ((i + 1) / steps) * 2 * Math.PI;
    if (a2 <= scoreAngle) {
      doc.setDrawColor(accent[0], accent[1], accent[2]);
    } else if (a1 < scoreAngle && a2 > scoreAngle) {
      doc.setDrawColor(accent[0], accent[1], accent[2]);
    } else {
      doc.setDrawColor(60, 71, 90);
    }
    const x1 = ringCx + ringR * Math.cos(a1);
    const y1 = ringCy + ringR * Math.sin(a1);
    const x2 = ringCx + ringR * Math.cos(a2);
    const y2 = ringCy + ringR * Math.sin(a2);
    doc.line(x1, y1, x2, y2);
  }

  // Score text
  font('bold', 22);
  color(white);
  doc.text(`${overallScore}`, ringCx - 8, ringCy + 2);
  font('normal', 7);
  color(ghost);
  doc.text('SCORE', ringCx - 7, ringCy + 8);

  // Severity badge below header
  const sevColor = result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald;
  fillRect(margin, 108, 32, 9, sevColor, 3);
  font('bold', 8);
  color(white);
  doc.text(result.severity.toUpperCase(), margin + 5, 114);

  font('normal', 9);
  color(slate);
  doc.text(`Severity Classification: ${result.severity}`, margin + 38, 114);

  y = 126;

  // ═══════════════════════════════════════════════════════
  //  EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════

  y = sectionHeader('Executive Summary', y);

  card(margin, y, contentWidth, 24);
  font('normal', 9);
  color(slate);
  const summary = doc.splitTextToSize(
    `This AI-powered analysis detected ${result.acne_count} acne lesion(s) with ${result.severity.toLowerCase()} severity across the facial region. ` +
    `Pigmentation clarity: ${result.pigmentation_data?.clarity_score || 0}% with ${result.pigmentation_data?.spots_count || 0} spots in a ${result.pigmentation_data?.spatial_pattern || 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage || 0}%. ` +
    `Hydration: ${result.dryness_data?.hydration_score || 0}% — Roughness: ${result.dryness_data?.roughness_score || 0}%. ` +
    `Confidence: ${overallScore}%.`,
    contentWidth - 12
  );
  doc.text(summary, margin + 6, y + 6);
  y += 30;

  // ═══════════════════════════════════════════════════════
  //  KEY METRICS — 4 Premium Cards
  // ═══════════════════════════════════════════════════════

  checkPage(65);
  y = sectionHeader('Key Metrics', y);

  const metrics = [
    { label: 'ACNE', value: `${result.acne_count}`, sub: 'spots detected', color: result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald, bg: result.severity === 'Severe' ? roseLight : result.severity === 'Moderate' ? amberLight : emeraldLight },
    { label: 'PIGMENTATION', value: `${result.pigmentation_data?.clarity_score || 0}`, sub: 'clarity score', color: (result.pigmentation_data?.clarity_score || 100) < 85 ? amber : emerald, bg: (result.pigmentation_data?.clarity_score || 100) < 85 ? amberLight : emeraldLight },
    { label: 'HYDRATION', value: `${result.dryness_data?.hydration_score || 0}`, sub: 'moisture level', color: (result.dryness_data?.hydration_score || 100) < 60 ? rose : emerald, bg: (result.dryness_data?.hydration_score || 100) < 60 ? roseLight : emeraldLight },
    { label: 'TEXTURE', value: `${result.dryness_data?.roughness_score || 0}`, sub: 'roughness index', color: (result.dryness_data?.roughness_score || 0) > 5 ? amber : emerald, bg: (result.dryness_data?.roughness_score || 0) > 5 ? amberLight : emeraldLight },
  ];

  const cardW = (contentWidth - 12) / 4;
  metrics.forEach((m, i) => {
    const cx = margin + i * (cardW + 4);
    card(cx, y, cardW, 30);
    // Top color bar
    fillRect(cx, y, cardW, 3, m.color, 0);
    // Rounded corners fix
    fillRect(cx, y, 3, 3, m.color, 0);
    fillRect(cx + cardW - 3, y, 3, 3, m.color, 0);

    font('bold', 7);
    color(muted);
    doc.text(m.label, cx + 5, y + 10);

    font('bold', 18);
    color(m.color);
    doc.text(m.value, cx + 5, y + 19);

    font('normal', 7);
    color(ghost);
    doc.text(m.sub, cx + 5, y + 25);
  });

  y += 38;

  // ═══════════════════════════════════════════════════════
  //  PIGMENTATION DETAIL
  // ═══════════════════════════════════════════════════════

  if (result.pigmentation_data) {
    checkPage(45);
    y = sectionHeader('Pigmentation Analysis', y);

    const pd = result.pigmentation_data;

    // Stat rows
    const stats = [
      { label: 'Clarity Score', value: `${pd.clarity_score}%`, status: pd.clarity_score < 70 ? 'warn' : 'ok' },
      { label: 'Spots Detected', value: `${pd.spots_count}`, status: pd.spots_count > 10 ? 'warn' : 'ok' },
      { label: 'Normalized Coverage', value: `${pd.normalized_coverage}%`, status: pd.normalized_coverage > 3 ? 'warn' : 'ok' },
      { label: 'Intensity', value: pd.intensity, status: pd.intensity === 'High' ? 'warn' : 'ok' },
      { label: 'Spatial Pattern', value: pd.spatial_pattern, status: 'ok' },
    ];

    stats.forEach((s, i) => {
      const sy = y + i * 7;
      const bg = i % 2 === 0 ? snow : white;
      fillRect(margin, sy, contentWidth, 7, bg, 0);
      font('normal', 8);
      color(muted);
      doc.text(s.label, margin + 5, sy + 5);
      font('bold', 8);
      color(s.status === 'warn' ? amber : ink);
      doc.text(s.value, margin + 75, sy + 5);
      // Status dot
      doc.setFillColor(s.status === 'warn' ? amber[0] : emerald[0], s.status === 'warn' ? amber[1] : emerald[1], s.status === 'warn' ? amber[2] : emerald[2]);
      doc.circle(margin + contentWidth - 5, sy + 3.5, 1.5, 'F');
    });
    y += stats.length * 7 + 4;

    // Type distribution bar
    const types = pd.type_distribution || {};
    const total = Object.values(types).reduce((a, b) => a + (b as number), 0) as number;
    if (total > 0) {
      const typeColors: Record<string, number[]> = {
        freckle: accent, melasma: amber, pih: rose, sun_spot: [217, 119, 6], unknown: ghost,
      };
      const barY = y;
      const barH = 5;
      const barX = margin + 50;
      const barW = contentWidth - 70;

      font('normal', 8);
      color(muted);
      doc.text('Type Breakdown', margin + 5, barY + 4);

      fillRect(barX, barY, barW, barH, silver, 2);
      let bx = barX;
      Object.entries(types).forEach(([type, count]) => {
        const cw = ((count as number) / total) * barW;
        fillRect(bx, barY, cw, barH, typeColors[type] || ghost, 0);
        bx += cw;
      });

      // Legend
      y = barY + barH + 6;
      font('normal', 7);
      let lx = margin + 5;
      Object.entries(types).forEach(([type, count]) => {
        const c = typeColors[type] || ghost;
        fillRect(lx, y - 2, 3, 3, c, 1);
        color(muted);
        doc.text(`${type.replace('_', ' ')} (${count})`, lx + 5, y);
        lx += doc.getTextWidth(`${type.replace('_', ' ')} (${count})`) + 12;
      });
      y += 8;
    }

    y += 6;
  }

  // ═══════════════════════════════════════════════════════
  //  ACNE CLASSIFICATION TABLE
  // ═══════════════════════════════════════════════════════

  if (result.spot_types && Object.keys(result.spot_types).length > 0) {
    checkPage(50);
    y = sectionHeader('Acne Classification', y);

    const totalSpots = Object.values(result.spot_types).reduce((a, b) => a + b, 0);
    const maxCount = Math.max(...Object.values(result.spot_types));

    // Table header
    fillRect(margin, y, contentWidth, 8, navy, 2);
    font('bold', 7);
    color(white);
    doc.text('SPOT TYPE', margin + 5, y + 5.5);
    doc.text('COUNT', margin + 70, y + 5.5);
    doc.text('%', margin + 95, y + 5.5);
    doc.text('DISTRIBUTION', margin + 110, y + 5.5);
    y += 9;

    Object.entries(result.spot_types).forEach(([type, count], i) => {
      const rowBg = i % 2 === 0 ? snow : white;
      fillRect(margin, y, contentWidth, 8, rowBg, 0);

      font('normal', 8);
      color(ink);
      doc.text(type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' '), margin + 5, y + 5.5);

      font('bold', 8);
      color(slate);
      doc.text(String(count), margin + 70, y + 5.5);

      const pct = totalSpots > 0 ? Math.round((count / totalSpots) * 100) : 0;
      font('normal', 8);
      color(muted);
      doc.text(`${pct}%`, margin + 95, y + 5.5);

      // Mini bar
      const bw = 50;
      const fw = (count / maxCount) * bw;
      fillRect(margin + 110, y + 2.5, bw, 3, silver, 1);
      fillRect(margin + 110, y + 2.5, fw, 3, accent, 1);

      y += 8;
    });

    y += 8;
  }

  // ═══════════════════════════════════════════════════════
  //  CONFLICT WARNINGS
  // ═══════════════════════════════════════════════════════

  if (result.conflicts && result.conflicts.length > 0) {
    checkPage(15 + result.conflicts.length * 12);
    y = sectionHeader('Important Warnings', y);

    result.conflicts.forEach((conflict) => {
      fillRect(margin, y, contentWidth, 10, amberLight, 2);
      doc.setDrawColor(amber[0], amber[1], amber[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'S');

      font('bold', 10);
      color(amber);
      doc.text('!', margin + 4, y + 7);

      font('normal', 8);
      color(ink);
      const warningText = doc.splitTextToSize(conflict.message, contentWidth - 15);
      doc.text(warningText[0], margin + 12, y + 7);
      y += 12;
    });
    y += 4;
  }

  // ═══════════════════════════════════════════════════════
  //  DAILY ROUTINE — Premium Card Layout
  // ═══════════════════════════════════════════════════════

  if (result.routine) {
    checkPage(80);
    y = sectionHeader('Your Daily Routine', y);

    // Morning card
    fillRect(margin, y, contentWidth / 2 - 3, 8, amberLight, 2);
    font('bold', 9);
    color(amber);
    doc.text('AM  MORNING', margin + 5, y + 5.5);

    fillRect(margin + contentWidth / 2 + 3, y, contentWidth / 2 - 3, 8, accentLight, 2);
    font('bold', 9);
    color(accent);
    doc.text('PM  EVENING', margin + contentWidth / 2 + 8, y + 5.5);
    y += 11;

    const halfW = (contentWidth - 4) / 2;

    // Morning steps
    let amY = y;
    result.routine.morning.forEach((step) => {
      checkPage(10);
      // Step number circle
      fillRect(margin + 2, amY, 6, 6, navy, 3);
      font('bold', 7);
      color(white);
      doc.text(`${step.step}`, margin + 3.5, amY + 4.5);

      font('bold', 8);
      color(ink);
      doc.text(step.product, margin + 11, amY + 3);

      font('normal', 7);
      color(muted);
      const actionLines = doc.splitTextToSize(step.action, halfW - 12);
      doc.text(actionLines[0], margin + 11, amY + 7);
      amY += 12;
    });

    // Evening steps
    let pmY = y;
    const pmX = margin + halfW + 4;
    result.routine.evening.forEach((step) => {
      checkPage(10);
      fillRect(pmX + 2, pmY, 6, 6, accent, 3);
      font('bold', 7);
      color(white);
      doc.text(`${step.step}`, pmX + 3.5, pmY + 4.5);

      font('bold', 8);
      color(ink);
      doc.text(step.product, pmX + 11, pmY + 3);

      font('normal', 7);
      color(muted);
      const actionLines = doc.splitTextToSize(step.action, halfW - 12);
      doc.text(actionLines[0], pmX + 11, pmY + 7);
      pmY += 12;
    });

    y = Math.max(amY, pmY) + 4;

    // Tips
    if (result.routine.tips.length > 0) {
      checkPage(10 + result.routine.tips.length * 6);
      fillRect(margin, y, contentWidth, 7, cloud, 2);
      font('bold', 8);
      color(navy);
      doc.text('PRO TIPS', margin + 5, y + 5);
      y += 9;

      result.routine.tips.forEach((tip) => {
        font('normal', 7);
        color(muted);
        const tipLines = doc.splitTextToSize(`\u2022  ${tip}`, contentWidth - 10);
        tipLines.forEach((line: string) => {
          doc.text(line, margin + 5, y + 3);
          y += 4;
        });
        y += 1;
      });
    }

    y += 6;
  }

  // ═══════════════════════════════════════════════════════
  //  RECOMMENDATIONS — Numbered Priority Cards
  // ═══════════════════════════════════════════════════════

  if (result.recommendations && result.recommendations.length > 0) {
    checkPage(30);
    y = sectionHeader('Personalized Recommendations', y);

    result.recommendations.forEach((rec, i) => {
      checkPage(28);
      const priorityColor = rec.priority === 'high' ? rose : rec.priority === 'medium' ? amber : emerald;
      const priorityBg = rec.priority === 'high' ? roseLight : rec.priority === 'medium' ? amberLight : emeraldLight;

      // Card
      card(margin, y, contentWidth, 24);

      // Left accent bar
      fillRect(margin, y, 4, 24, priorityColor, 0);

      // Number circle
      fillRect(margin + 8, y + 3, 8, 8, priorityColor, 4);
      font('bold', 9);
      color(white);
      doc.text(`${i + 1}`, margin + 11, y + 9);

      // Priority badge
      fillRect(margin + 20, y + 4, 14, 4, priorityBg, 2);
      font('bold', 6);
      color(priorityColor);
      doc.text(rec.priority.toUpperCase(), margin + 22, y + 7);

      // Category
      font('normal', 6);
      color(ghost);
      doc.text(rec.category.toUpperCase(), margin + 38, y + 7);

      // Title
      font('bold', 10);
      color(ink);
      doc.text(rec.title, margin + 20, y + 15);

      // Description
      font('normal', 8);
      color(muted);
      const descLines = doc.splitTextToSize(rec.description, contentWidth - 28);
      doc.text(descLines[0], margin + 20, y + 20);

      // Why
      if (rec.why) {
        fillRect(margin + 20, y + 21, contentWidth - 28, 2.5, accentLight, 1);
        font('bold', 5.5);
        color(accent);
        doc.text('WHY: ', margin + 22, y + 22.8);
        font('normal', 5.5);
        color(accent);
        doc.text(rec.why.substring(0, 75), margin + 30, y + 22.8);
      }

      y += 26;
    });
  }

  // ═══════════════════════════════════════════════════════
  //  CLINICAL INTERPRETATION — Elegant Card
  // ═══════════════════════════════════════════════════════

  checkPage(55);
  y += 4;
  y = sectionHeader('Clinical Interpretation', y);

  card(margin, y, contentWidth, 40);
  fillRect(margin, y, 4, 40, accent, 0);

  font('normal', 8);
  color(slate);
  const interpText = doc.splitTextToSize(
    `Primary findings indicate ${result.severity.toLowerCase()} inflammatory activity and ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'significant trans-epidermal moisture loss' : 'stable barrier function'}. ` +
    `Multi-spectral analysis identifies ${result.pigmentation_data?.spots_count || 0} pigment clusters in a ${result.pigmentation_data?.spatial_pattern || 'N/A'} pattern. ` +
    `Coverage: ${result.pigmentation_data?.normalized_coverage || 0}%. ` +
    `Sebaceous activity index is ${result.acne_count > 5 ? 'elevated' : 'within optimal parameters'}. ` +
    `Melanin distribution clarity at ${result.pigmentation_data?.clarity_score || 0}%.`,
    contentWidth - 18
  );
  doc.text(interpText, margin + 10, y + 6);

  y += 6 + interpText.length * 3.8;

  font('bold', 8);
  color(navy);
  doc.text('Priority Actions', margin + 10, y + 2);
  y += 6;

  font('normal', 7);
  color(muted);
  const actions = [
    `Acne: ${result.acne_count > 10 ? 'Seek professional dermatological consultation' : result.acne_count > 0 ? 'Apply targeted topical treatments' : 'Maintain current routine'}`,
    `Pigmentation: ${result.pigmentation_data && result.pigmentation_data.clarity_score < 70 ? 'Use retinol-based treatments and SPF 50+' : 'Apply Vitamin C serum and daily sunscreen'}`,
    `Hydration: ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'Prioritize ceramide-based moisturizers' : 'Maintain current hydration routine'}`,
  ];

  actions.forEach((a, i) => {
    const aLines = doc.splitTextToSize(`${i + 1}. ${a}`, contentWidth - 20);
    aLines.forEach((l: string) => {
      doc.text(l, margin + 14, y + 2);
      y += 3.5;
    });
    y += 1;
  });

  y += 4;

  // ═══════════════════════════════════════════════════════
  //  FOOTER — Premium branding
  // ═══════════════════════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    line(margin, pageHeight - 20, pageWidth - margin, silver, 0.3);

    // Left: branding
    font('bold', 7);
    color(navy);
    doc.text('SkinAI', margin, pageHeight - 14);
    font('normal', 6);
    color(ghost);
    doc.text('AI-Powered Dermatological Analysis', margin + 14, pageHeight - 14);

    // Center: disclaimer
    font('normal', 5.5);
    color(ghost);
    doc.text('This report is for informational purposes only and does not replace professional medical diagnosis.', margin, pageHeight - 9);

    // Right: page + timestamp
    font('bold', 7);
    color(navy);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 14);
    font('normal', 5.5);
    color(ghost);
    doc.text(`${dateStr}  ${timeStr}`, pageWidth - margin - 35, pageHeight - 9);
  }

  // ═══════════════════════════════════════════════════════
  //  SAVE
  // ═══════════════════════════════════════════════════════

  const filename = `SkinAI_Report_${sessionId}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
