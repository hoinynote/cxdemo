import { createElement, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { DiagnosticReport } from '../domain/diagnostic-report';
import type { DiagnosticTemplate } from '../domain/diagnostic-template';
import { DiagnosticPageCanvas } from '../features/diagnostic-report/preview/DiagnosticPageCanvas';

export type DiagnosticAudienceRole = 'company' | 'consultant';
export type DiagnosticExportFormat = 'pdf' | 'pptx';

export class DiagnosticReportExporter {
  async exportPptx(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole: DiagnosticAudienceRole): Promise<Blob> {
    this.assertAudience(report, audienceRole);
    const images = await this.renderPages(report, template, audienceRole);
    const [{ default: PptxGenJS }] = await Promise.all([import('pptxgenjs')]);
    const pptx = new PptxGenJS();
    const { width, height } = template.pageSize;
    pptx.defineLayout({ name: 'NCSI_SOURCE_RATIO', width, height });
    pptx.layout = 'NCSI_SOURCE_RATIO';
    pptx.author = 'KPC CX';
    pptx.subject = 'NCSI Diagnostic Report';
    pptx.title = `NCSI ${this.companyName(report)} ${report.snapshot.filters.year}`;
    pptx.theme = { headFontFace: 'Malgun Gothic', bodyFontFace: 'Malgun Gothic' };
    images.forEach((data) => {
      const slide = pptx.addSlide();
      slide.addImage({ data, x: 0, y: 0, w: width, h: height });
    });
    const output = await pptx.write({ outputType: 'blob' });
    if (output instanceof Blob) return output;
    if (output instanceof ArrayBuffer) return new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    throw new Error('PPTX 파일을 생성하지 못했습니다.');
  }

  async exportPdf(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole: DiagnosticAudienceRole): Promise<Blob> {
    this.assertAudience(report, audienceRole);
    const images = await this.renderPages(report, template, audienceRole);
    const { jsPDF } = await import('jspdf');
    const width = template.pageSize.width * 72;
    const height = template.pageSize.height * 72;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [width, height], compress: true });
    images.forEach((image, index) => {
      if (index > 0) pdf.addPage([width, height], 'landscape');
      pdf.addImage(image, 'PNG', 0, 0, width, height, undefined, 'FAST');
    });
    return pdf.output('blob');
  }

  filename(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole: DiagnosticAudienceRole, format: DiagnosticExportFormat): string {
    this.assertAudience(report, audienceRole);
    if (template.id !== report.snapshot.templateId || template.version !== report.snapshot.templateVersion) throw new Error('보고서 스냅샷과 출력 템플릿 버전이 일치하지 않습니다.');
    const slug = this.companyName(report).normalize('NFC').trim().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'company';
    const year = report.snapshot.filters.year;
    const date = new Date(report.finalizedAt ?? report.snapshot.generatedAt).toISOString().slice(0, 10).replaceAll('-', '');
    const suffix = report.status === 'finalized' ? 'final' : 'review';
    return `NCSI-${slug}-${year}-${suffix}-${date}.${format}`;
  }

  private async renderPages(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole: DiagnosticAudienceRole): Promise<string[]> {
    const html2canvas = (await import('html2canvas')).default;
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-12000px;top:0;width:1000px;z-index:-1;background:#fff;';
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      flushSync(() => root.render(createElement(ExportDocument, { report, template, audienceRole })));
      await document.fonts.ready;
      await Promise.all([...host.querySelectorAll('img')].map(image => image.decode().catch(() => undefined)));
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const pages = [...host.querySelectorAll<HTMLElement>('[data-diagnostic-page]')];
      if (pages.length !== template.pages.length || pages.length !== report.pages.length) throw new Error('보고서 페이지 구조가 템플릿과 일치하지 않습니다.');
      const output: string[] = [];
      for (const page of pages) {
        const canvas = await html2canvas(page, { scale: 1.5, backgroundColor: '#ffffff', width: 1000, height: 1000 * template.pageSize.height / template.pageSize.width, windowWidth: 1000, useCORS: true });
        output.push(canvas.toDataURL('image/png'));
        canvas.width = 0; canvas.height = 0;
      }
      return output;
    } finally {
      root.unmount();
      host.remove();
    }
  }

  private assertAudience(report: DiagnosticReport, audienceRole: DiagnosticAudienceRole): void {
    if (audienceRole === 'company' && report.status !== 'finalized') throw new Error('기업 고객은 최신 확정 보고서만 다운로드할 수 있습니다.');
  }

  private companyName(report: DiagnosticReport): string {
    const cover = report.pages.flatMap(page => page.containers).find(item => item.sourceContainerId === '1-1');
    const value = typeof cover?.value === 'string' ? cover.value : '';
    return value.split('·')[2]?.trim() || report.snapshot.subjectCompanyId;
  }
}

function ExportDocument({ report, template, audienceRole }: { report: DiagnosticReport; template: DiagnosticTemplate; audienceRole: DiagnosticAudienceRole }): ReactElement {
  const watermark = audienceRole === 'consultant' && report.status !== 'finalized';
  return createElement('div', { className: 'diagnostic-export-document' }, ...template.pages.map((page, index) => createElement(DiagnosticPageCanvas, { key: page.number, page, content: report.pages[index]!, audienceRole, watermark, period: report.snapshot.filters.year })));
}
