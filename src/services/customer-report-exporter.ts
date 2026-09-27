import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { AiAnswer } from '../domain/ai';
import type { SeriesPoint } from '../domain/analytics';
import type { CustomerReportDraft, CustomerReportItem, DiagnosticDraft, DiagnosticReportInput, ExportFormat, ReportEnginePort } from '../domain/reports';
import { describeReportFilters } from '../features/customer-report/report-item';

const BRAND = 'A94B2F';
const INK = '2D3940';
const MUTED = '738087';
const FONT = 'Malgun Gothic';

export class CustomerReportExporter implements ReportEnginePort {
  async exportCustomerReport(report: CustomerReportDraft, format: ExportFormat): Promise<Blob> {
    return this.export(report, format);
  }

  async export(report: CustomerReportDraft, format: ExportFormat): Promise<Blob> {
    return format === 'pptx' ? this.exportPptx(report) : this.exportPdf(report);
  }

  async generateDiagnosticReport(_input: DiagnosticReportInput): Promise<DiagnosticDraft> {
    throw new Error('NCSI 진단보고서 생성 엔진은 다음 단계에서 연결됩니다.');
  }

  private async exportPptx(report: CustomerReportDraft): Promise<Blob> {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'KPC CX';
    pptx.subject = `${report.scopeLabel} 고객경험 분석`;
    pptx.title = report.title;
    pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };
    const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(report.createdAt));
    const cover = pptx.addSlide();
    cover.background = { color: 'F6F7F8' };
    cover.addShape(pptx.ShapeType.rect, { x: 0.72, y: 0.85, w: 0.09, h: 1.1, line: { color: BRAND, transparency: 100 }, fill: { color: BRAND } });
    cover.addText('KPC CX', { x: 1.02, y: 0.88, w: 4.5, h: 0.35, fontFace: FONT, fontSize: 15, bold: true, color: BRAND, margin: 0 });
    cover.addText('고객경험 분석 리포트', { x: 1.02, y: 2.22, w: 10.8, h: 0.35, fontFace: FONT, fontSize: 16, color: MUTED, margin: 0 });
    cover.addText(report.title, { x: 1.02, y: 2.72, w: 11.1, h: 0.8, fontFace: FONT, fontSize: 28, bold: true, color: INK, breakLine: false, fit: 'shrink', margin: 0 });
    cover.addText(`${report.scopeLabel} · ${report.filters.year}년 분석`, { x: 1.02, y: 3.65, w: 10, h: 0.35, fontFace: FONT, fontSize: 13, color: MUTED, margin: 0 });
    cover.addText(`${date}   |   한국생산성본부 KPC`, { x: 1.02, y: 6.55, w: 10, h: 0.25, fontFace: FONT, fontSize: 9, color: MUTED, margin: 0 });

    report.items.forEach((item, index) => this.addItemSlide(pptx, report, item, index));
    const blob = await pptx.write({ outputType: 'blob' });
    if (blob instanceof Blob) return blob;
    if (blob instanceof ArrayBuffer) return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    throw new Error('PPTX 파일을 생성하지 못했습니다.');
  }

  private addItemSlide(pptx: InstanceType<typeof import('pptxgenjs').default>, report: CustomerReportDraft, item: CustomerReportItem, index: number) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addText(`KPC CX  /  ${report.scopeLabel}`, { x: 0.58, y: 0.35, w: 9.5, h: 0.22, fontFace: FONT, fontSize: 9, bold: true, color: BRAND, margin: 0 });
    slide.addShape(pptx.ShapeType.line, { x: 0.58, y: 0.73, w: 12.15, h: 0, line: { color: 'E3E7E8', width: 0.8 } });
    slide.addText(item.title, { x: 0.62, y: 0.98, w: 11.8, h: 0.55, fontFace: FONT, fontSize: 23, bold: true, color: INK, fit: 'shrink', margin: 0 });
    if (item.annotation) slide.addText(item.annotation, { x: 0.64, y: 1.65, w: 11.8, h: 0.42, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0 });

    let chartPoints = getPoints(item);
    let bodyY = item.annotation ? 2.18 : 1.82;
    const answer = isAnswer(item.payload) ? item.payload : null;
    if (answer) {
      slide.addText(answer.headline, { x: 0.64, y: bodyY, w: 11.5, h: 0.34, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0 });
      bodyY += 0.46;
      slide.addText(answer.text, { x: 0.64, y: bodyY, w: 11.7, h: 1.1, fontFace: FONT, fontSize: 11, color: INK, breakLine: false, fit: 'shrink', valign: 'top', margin: 0.03, paraSpaceAfter: 5 });
      bodyY += 1.28;
    } else if (!isAnswer(item.payload) && !Array.isArray(item.payload)) {
      const value = item.payload.value;
      slide.addText(value === null ? '데이터 없음' : `${value.toFixed(2)}점`, { x: 0.68, y: bodyY + 0.08, w: 8.8, h: 0.74, fontFace: FONT, fontSize: 34, bold: true, color: value === null ? MUTED : BRAND, margin: 0 });
      bodyY += 0.98;
    }

    chartPoints = chartPoints.filter((point) => point.value !== null).slice(0, 12);
    if (chartPoints.length > 0) {
      const rowHeight = Math.min(0.32, Math.max(0.16, (6.5 - bodyY) / chartPoints.length));
      const max = Math.max(1, ...chartPoints.map((point) => point.value ?? 0));
      chartPoints.forEach((point, pointIndex) => {
        const y = bodyY + pointIndex * rowHeight;
        const fillWidth = Math.max(0.05, 5.25 * ((point.value ?? 0) / max));
        slide.addText(point.label, { x: 0.7, y, w: 2.75, h: 0.25, fontFace: FONT, fontSize: 9, color: INK, margin: 0 });
        slide.addShape(pptx.ShapeType.rect, { x: 3.55, y: y + 0.02, w: 5.35, h: 0.14, line: { color: 'E8ECEC', transparency: 100 }, fill: { color: 'E8ECEC' } });
        slide.addShape(pptx.ShapeType.rect, { x: 3.55, y: y + 0.02, w: fillWidth, h: 0.14, line: { color: BRAND, transparency: 100 }, fill: { color: BRAND } });
        slide.addText(`${point.value!.toFixed(2)}점`, { x: 9.12, y: y - 0.02, w: 0.9, h: 0.24, fontFace: FONT, fontSize: 9, bold: true, color: INK, margin: 0 });
        slide.addText(`n=${point.respondentCount.toLocaleString()}`, { x: 10.18, y: y - 0.02, w: 1.4, h: 0.24, fontFace: FONT, fontSize: 8, color: MUTED, margin: 0 });
      });
    } else if (!answer || !answer.text) {
      slide.addText('선택한 조건에서 표시할 수치가 없습니다.', { x: 0.68, y: bodyY + 0.1, w: 9.5, h: 0.35, fontFace: FONT, fontSize: 12, color: MUTED, margin: 0 });
    }

    const year = item.evidence[0]?.year ?? (answer ? Number(answer.sourcePeriod) : report.filters.year);
    slide.addShape(pptx.ShapeType.line, { x: 0.58, y: 6.78, w: 12.15, h: 0, line: { color: 'E3E7E8', width: 0.8 } });
    const dimensions = item.evidence[0]?.filters ?? report.filters.dimensions;
    slide.addText(`출처: ${year}년 NCSI 원천 응답 · ${describeReportFilters(dimensions)} · 응답 수는 항목별 수치에 표시   |   ${index + 1}`, { x: 0.64, y: 6.91, w: 11.9, h: 0.18, fontFace: FONT, fontSize: 8, color: MUTED, margin: 0 });
  }

  private async exportPdf(report: CustomerReportDraft): Promise<Blob> {
    const [{ jsPDF }, html2canvas, { ReportDocument }] = await Promise.all([
      import('jspdf'),
      import('html2canvas').then((module) => module.default),
      import('../features/customer-report/ReportItemPreview'),
    ]);
    const container = document.createElement('div');
    container.className = 'report-export-host';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;z-index:-1;';
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      flushSync(() => root.render(createElement(ReportDocument, { report })));
      await document.fonts.ready;
      const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-report-page]'));
      if (pages.length === 0) throw new Error('PDF 미리보기 페이지를 찾을 수 없습니다.');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [960, 540], compress: true });
      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', width: 960, height: 540, windowWidth: 960 });
        if (index > 0) pdf.addPage([960, 540], 'landscape');
        pdf.addImage(canvas, 'PNG', 0, 0, 960, 540, undefined, 'FAST');
      }
      return pdf.output('blob');
    } finally {
      root.unmount();
      container.remove();
    }
  }
}

function isAnswer(payload: CustomerReportItem['payload']): payload is AiAnswer {
  return !Array.isArray(payload) && 'headline' in payload;
}

function getPoints(item: CustomerReportItem): SeriesPoint[] {
  if (Array.isArray(item.payload)) return item.payload;
  if (isAnswer(item.payload)) return item.payload.visualization.data;
  const metric = item.payload;
  return [{ id: item.id, label: item.title, value: metric.value, respondentCount: metric.evidence?.respondentCount ?? 0, evidence: metric.evidence }];
}
