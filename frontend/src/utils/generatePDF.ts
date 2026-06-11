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

  // ── Colors ──
  const primary = [30, 58, 138];
  const dark = [15, 23, 42];
  const muted = [100, 116, 139];
  const light = [241, 245, 249];
  const border = [226, 232, 240];
  const rose = [244, 63, 94];
  const amber = [245, 158, 11];
  const emerald = [16, 185, 129];
  const white = [255, 255, 255];

  // ── Helper Functions ──
  function setFont(style: 'normal' | 'bold' = 'normal', size: number = 10) {
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
    doc.setFontSize(size);
  }

  function setColor(color: number[]) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function drawRect(x: number, yy: number, w: number, h: number, color: number[], radius: number = 2) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, yy, w, h, radius, radius, 'F');
  }

  function drawLine(x1: number, yy1: number, x2: number, yy2: number, color: number[] = border, width: number = 0.3) {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(x1, yy1, x2, yy2);
  }

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════
  // HEADER / TITLE PAGE
  // ═══════════════════════════════════════════

  // Top accent bar
  drawRect(0, 0, pageWidth, 4, primary);

  // Header
  y = 18;
  setFont('bold', 22);
  setColor(primary);
  doc.text('SkinAI Clinical Report', margin, y);

  setFont('normal', 9);
  setColor(muted);
  y += 7;
  doc.text('AI-Powered Dermatological Analysis', margin, y);

  // Session info box
  y += 10;
  drawRect(margin, y, contentWidth, 28, light, 3);
  y += 8;

  setFont('bold', 8);
  setColor(muted);
  doc.text('SESSION ID', margin + 5, y);
  doc.text('DATE', margin + 55, y);
  doc.text('TIME', margin + 100, y);
  doc.text('OVERALL SCORE', margin + 140, y);

  y += 5;
  setFont('bold', 11);
  setColor(dark);
  doc.text(`#AI-${sessionId}`, margin + 5, y);
  doc.text(dateStr, margin + 55, y);
  doc.text(timeStr, margin + 100, y);

  // Score in box
  const scoreColor = overallScore >= 80 ? emerald : overallScore >= 50 ? amber : rose;
  drawRect(margin + 140, y - 5, 30, 10, scoreColor, 2);
  setFont('bold', 12);
  setColor(white);
  doc.text(`${overallScore}`, margin + 148, y + 0.5);
  setFont('normal', 6);
  doc.text('%', margin + 163, y - 1);

  y += 18;
  drawLine(margin, y, pageWidth - margin, y);
  y += 8;

  // ═══════════════════════════════════════════
  // EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════

  setFont('bold', 13);
  setColor(primary);
  doc.text('Executive Summary', margin, y);
  y += 3;
  drawLine(margin, y, margin + 40, y, primary, 0.8);
  y += 8;

  // Severity badge
  const severityColor = result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald;
  drawRect(margin, y, 30, 8, severityColor, 2);
  setFont('bold', 9);
  setColor(white);
  doc.text(result.severity.toUpperCase(), margin + 5, y + 5.5);

  setFont('normal', 10);
  setColor(dark);
  doc.text(`Severity Classification: ${result.severity}`, margin + 35, y + 5.5);
  y += 14;

  // Summary text
  setFont('normal', 10);
  setColor(dark);
  const summaryLines = doc.splitTextToSize(
    `This clinical analysis detected ${result.acne_count} acne lesion(s) across the facial region with ${result.severity.toLowerCase()} severity. ` +
    `Pigmentation clarity measured at ${result.pigmentation_data?.clarity_score || 0}% with ${result.pigmentation_data?.spots_count || 0} localized spots. ` +
    `Skin hydration levels at ${result.dryness_data?.hydration_score || 0}% with a roughness index of ${result.dryness_data?.roughness_score || 0}%. ` +
    `The AI confidence score for this analysis is ${overallScore}%.`,
    contentWidth
  );
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  // ═══════════════════════════════════════════
  // KEY METRICS
  // ═══════════════════════════════════════════

  checkPageBreak(60);
  setFont('bold', 13);
  setColor(primary);
  doc.text('Key Metrics', margin, y);
  y += 3;
  drawLine(margin, y, margin + 40, y, primary, 0.8);
  y += 8;

  const metricsData = [
    {
      label: 'Acne Detection',
      value: `${result.acne_count} spots`,
      severity: result.severity,
      detail: `${result.acne_count === 0 ? 'No acne detected' : result.acne_count <= 5 ? 'Mild — isolated spots' : result.acne_count <= 15 ? 'Moderate — multiple zones' : 'Severe — widespread lesions'}`,
      color: result.severity === 'Severe' ? rose : result.severity === 'Moderate' ? amber : emerald,
    },
    {
      label: 'Pigmentation',
      value: `${result.pigmentation_data?.clarity_score || 0}% clarity`,
      severity: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'Moderate' : 'Good',
      detail: `${result.pigmentation_data?.spots_count || 0} spots detected — ${(result.pigmentation_data?.type_distribution?.localized || 0)}% localized`,
      color: (result.pigmentation_data?.clarity_score || 100) < 85 ? amber : emerald,
    },
    {
      label: 'Hydration',
      value: `${result.dryness_data?.hydration_score || 0}%`,
      severity: (result.dryness_data?.hydration_score || 100) < 60 ? 'Low' : 'Healthy',
      detail: `Roughness: ${result.dryness_data?.roughness_score || 0}% — Flakes: ${result.dryness_data?.flakes_count || 0}`,
      color: (result.dryness_data?.hydration_score || 100) < 60 ? rose : emerald,
    },
    {
      label: 'Texture',
      value: `${result.dryness_data?.roughness_score || 0}% roughness`,
      severity: (result.dryness_data?.roughness_score || 0) > 5 ? 'Rough' : 'Smooth',
      detail: (result.dryness_data?.roughness_score || 0) > 5 ? 'Elevated texture irregularity detected' : 'Surface texture within normal range',
      color: (result.dryness_data?.roughness_score || 0) > 5 ? amber : emerald,
    },
  ];

  const colWidth = (contentWidth - 8) / 2;
  metricsData.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = margin + col * (colWidth + 8);
    const my = y + row * 28;

    drawRect(mx, my, colWidth, 24, white, 3);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, my, colWidth, 24, 3, 3, 'S');

    // Color indicator
    drawRect(mx + 4, my + 4, 3, 16, m.color, 1);

    setFont('bold', 8);
    setColor(muted);
    doc.text(m.label.toUpperCase(), mx + 12, my + 7);

    setFont('bold', 13);
    setColor(dark);
    doc.text(m.value, mx + 12, my + 14);

    setFont('normal', 7);
    setColor(muted);
    doc.text(m.detail, mx + 12, my + 19);
  });

  y += 60;

  // ═══════════════════════════════════════════
  // SPOT TYPE DISTRIBUTION
  // ═══════════════════════════════════════════

  if (result.spot_types && Object.keys(result.spot_types).length > 0) {
    checkPageBreak(50);
    setFont('bold', 13);
    setColor(primary);
    doc.text('Acne Classification', margin, y);
    y += 3;
    drawLine(margin, y, margin + 40, y, primary, 0.8);
    y += 8;

    // Table header
    drawRect(margin, y, contentWidth, 8, primary, 2);
    setFont('bold', 8);
    setColor(white);
    doc.text('SPOT TYPE', margin + 5, y + 5.5);
    doc.text('COUNT', margin + 80, y + 5.5);
    doc.text('PERCENTAGE', margin + 110, y + 5.5);
    doc.text('SEVERITY', margin + 150, y + 5.5);
    y += 10;

    const totalSpots = Object.values(result.spot_types).reduce((a, b) => a + b, 0);
    const maxCount = Math.max(...Object.values(result.spot_types));
    Object.entries(result.spot_types).forEach(([type, count], i) => {
      const bgColor = i % 2 === 0 ? light : white;
      drawRect(margin, y, contentWidth, 8, bgColor, 0);

      setFont('normal', 9);
      setColor(dark);
      doc.text(type.charAt(0).toUpperCase() + type.slice(1), margin + 5, y + 5.5);
      doc.text(String(count), margin + 80, y + 5.5);

      const pct = totalSpots > 0 ? Math.round((count / totalSpots) * 100) : 0;
      doc.text(`${pct}%`, margin + 110, y + 5.5);

      // Mini bar
      const barWidth = 30;
      const fillWidth = (count / maxCount) * barWidth;
      drawRect(margin + 150, y + 2, barWidth, 4, border, 1);
      drawRect(margin + 150, y + 2, fillWidth, 4, primary, 1);

      y += 8;
    });

    y += 8;
  }

  // ═══════════════════════════════════════════
  // CONFLICT WARNINGS
  // ═══════════════════════════════════════════

  if (result.conflicts && result.conflicts.length > 0) {
    checkPageBreak(20 + result.conflicts.length * 12);
    setFont('bold', 13);
    setColor(amber);
    doc.text('Important Warnings', margin, y);
    y += 3;
    drawLine(margin, y, margin + 40, y, amber, 0.8);
    y += 8;

    result.conflicts.forEach((conflict) => {
      drawRect(margin, y, contentWidth, 10, [255, 251, 235], 2);
      doc.setDrawColor(amber[0], amber[1], amber[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'S');

      setFont('bold', 9);
      setColor(amber);
      doc.text('!', margin + 4, y + 6.5);

      setFont('normal', 9);
      setColor(dark);
      const warningText = doc.splitTextToSize(conflict.message, contentWidth - 15);
      doc.text(warningText[0], margin + 12, y + 6.5);
      y += 12;
    });

    y += 4;
  }

  // ═══════════════════════════════════════════
  // DAILY ROUTINE
  // ═══════════════════════════════════════════

  if (result.routine) {
    checkPageBreak(80);
    setFont('bold', 13);
    setColor(primary);
    doc.text('Your Daily Skincare Routine', margin, y);
    y += 3;
    drawLine(margin, y, margin + 40, y, primary, 0.8);
    y += 8;

    // Morning routine
    drawRect(margin, y, contentWidth, 8, [255, 251, 235], 2);
    setFont('bold', 10);
    setColor(amber);
    doc.text('MORNING ROUTINE', margin + 5, y + 5.5);
    y += 10;

    result.routine.morning.forEach((step) => {
      checkPageBreak(10);
      setFont('bold', 8);
      setColor(primary);
      doc.text(`${step.step}`, margin + 5, y + 4);

      setFont('bold', 9);
      setColor(dark);
      doc.text(step.product, margin + 12, y + 4);

      setFont('normal', 8);
      setColor(muted);
      const actionText = doc.splitTextToSize(step.action, contentWidth - 20);
      doc.text(actionText[0], margin + 12, y + 9);
      y += 12;
    });

    y += 4;

    // Evening routine
    checkPageBreak(20);
    drawRect(margin, y, contentWidth, 8, [238, 242, 255], 2);
    setFont('bold', 10);
    setColor(primary);
    doc.text('EVENING ROUTINE', margin + 5, y + 5.5);
    y += 10;

    result.routine.evening.forEach((step) => {
      checkPageBreak(10);
      setFont('bold', 8);
      setColor(primary);
      doc.text(`${step.step}`, margin + 5, y + 4);

      setFont('bold', 9);
      setColor(dark);
      doc.text(step.product, margin + 12, y + 4);

      setFont('normal', 8);
      setColor(muted);
      const actionText = doc.splitTextToSize(step.action, contentWidth - 20);
      doc.text(actionText[0], margin + 12, y + 9);
      y += 12;
    });

    // Tips
    if (result.routine.tips.length > 0) {
      y += 4;
      checkPageBreak(10 + result.routine.tips.length * 6);
      drawRect(margin, y, contentWidth, 8, primary, 2);
      setFont('bold', 9);
      setColor(white);
      doc.text('PRO TIPS', margin + 5, y + 5.5);
      y += 10;

      result.routine.tips.forEach((tip) => {
      setFont('normal', 8);
      setColor(muted);
      const tipLines = doc.splitTextToSize(`• ${tip}`, contentWidth - 10);
      tipLines.forEach((line: string) => {
        doc.text(line, margin + 5, y + 3);
        y += 4;
      });
        y += 1;
      });
    }

    y += 6;
  }

  // ═══════════════════════════════════════════
  // PERSONALIZED RECOMMENDATIONS
  // ═══════════════════════════════════════════

  if (result.recommendations && result.recommendations.length > 0) {
    checkPageBreak(40);
    setFont('bold', 13);
    setColor(primary);
    doc.text('Personalized Recommendations', margin, y);
    y += 3;
    drawLine(margin, y, margin + 40, y, primary, 0.8);
    y += 8;

    result.recommendations.forEach((rec) => {
      checkPageBreak(28);

      const priorityColor = rec.priority === 'high' ? rose : rec.priority === 'medium' ? amber : emerald;

      drawRect(margin, y, contentWidth, 24, white, 3);
      doc.setDrawColor(border[0], border[1], border[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'S');

      // Priority indicator
      drawRect(margin + 3, y + 3, 3, 18, priorityColor, 1);

      // Priority badge
      drawRect(margin + 10, y + 3, 16, 5, priorityColor, 2);
      setFont('bold', 6);
      setColor(white);
      doc.text(rec.priority.toUpperCase(), margin + 13, y + 6.5);

      // Category
      setFont('normal', 7);
      setColor(muted);
      doc.text(rec.category.toUpperCase(), margin + 30, y + 6.5);

      // Title
      setFont('bold', 10);
      setColor(dark);
      doc.text(rec.title, margin + 10, y + 13);

      // Description
      setFont('normal', 8);
      setColor(muted);
      const descLines = doc.splitTextToSize(rec.description, contentWidth - 15);
      doc.text(descLines[0], margin + 10, y + 18);

      // Why section
      if (rec.why) {
        drawRect(margin + 10, y + 19.5, contentWidth - 15, 4, [239, 246, 255], 1);
        setFont('bold', 6);
        setColor(primary);
        doc.text('WHY THIS IS FOR YOU:', margin + 12, y + 22.5);
        setFont('normal', 6);
        setColor(primary);
        doc.text(rec.why.substring(0, 70), margin + 48, y + 22.5);
      }

      y += 26;
    });
  }

  // ═══════════════════════════════════════════
  // CLINICAL INTERPRETATION
  // ═══════════════════════════════════════════

  checkPageBreak(50);
  y += 4;
  setFont('bold', 13);
  setColor(primary);
  doc.text('Clinical Interpretation', margin, y);
  y += 3;
  drawLine(margin, y, margin + 40, y, primary, 0.8);
  y += 8;

  drawRect(margin, y, contentWidth, 36, light, 3);

  setFont('normal', 9);
  setColor(dark);
  const interpText = doc.splitTextToSize(
    `"Primary findings indicate ${result.severity.toLowerCase()} inflammatory activity and ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'significant trans-epidermal moisture loss' : 'stable barrier function'}. Multi-spectral analysis identifies ${result.pigmentation_data?.spots_count || 0} localized pigment clusters. Sebaceous activity index is ${result.acne_count > 5 ? 'elevated' : 'within optimal parameters'}. Melanin distribution clarity measured at ${result.pigmentation_data?.clarity_score || 0}%."`,
    contentWidth - 16
  );
  doc.text(interpText, margin + 8, y + 6);

  y += 8 + interpText.length * 4;

  setFont('bold', 9);
  setColor(dark);
  doc.text('Priority Actions:', margin + 8, y + 3);
  y += 7;

  setFont('normal', 8);
  setColor(muted);
  const actions = [
    `• Acne management: ${result.acne_count > 10 ? 'Seek professional dermatological consultation' : result.acne_count > 0 ? 'Apply targeted topical treatments' : 'Maintain current routine'}`,
    `• Pigmentation: ${result.pigmentation_data && result.pigmentation_data.clarity_score < 70 ? 'Use retinol-based treatments and SPF 50+' : 'Apply Vitamin C serum and daily sunscreen'}`,
    `• Hydration: ${result.dryness_data && result.dryness_data.hydration_score < 60 ? 'Prioritize ceramide-based moisturizers' : 'Maintain current hydration routine'}`,
  ];

  actions.forEach((action) => {
    const lines = doc.splitTextToSize(action, contentWidth - 16);
    lines.forEach((line: string) => {
      doc.text(line, margin + 12, y + 3);
      y += 4;
    });
    y += 1;
  });

  // ═══════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    drawLine(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18, border, 0.3);

    setFont('normal', 7);
    setColor(muted);
    doc.text('SkinAI Clinical Systems — AI-Powered Dermatological Analysis', margin, pageHeight - 13);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 13);

    setFont('normal', 6);
    doc.text('This report is for informational purposes only and does not replace professional medical diagnosis.', margin, pageHeight - 8);
    doc.text(`Generated: ${dateStr} at ${timeStr}`, pageWidth - margin - 40, pageHeight - 8);
  }

  // ═══════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════

  const filename = `SkinAI_Clinical_Report_${sessionId}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
