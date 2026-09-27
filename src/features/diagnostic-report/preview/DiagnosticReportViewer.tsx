import { useState } from 'react';
import type { DiagnosticReport } from '../../../domain/diagnostic-report';
import type { DiagnosticTemplate } from '../../../domain/diagnostic-template';
import { DiagnosticReportExporter } from '../../../services/report-exporter';
import { DiagnosticPageCanvas } from './DiagnosticPageCanvas';
import { ReportPageNavigation } from './ReportPageNavigation';
import './report-preview.css';

const exporter = new DiagnosticReportExporter();

export function DiagnosticReportViewer({ report, mode, template }: { report: DiagnosticReport; mode: 'review' | 'final'; template: DiagnosticTemplate }) {
  const [activePage, setActivePage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (mode === 'final' && report.status !== 'finalized') return <section className="diagnostic-viewer-denied">확정된 NCSI 보고서가 없습니다.</section>;
  const page = template.pages[activePage - 1]!;
  const content = report.pages[activePage - 1]!;

  async function download(format: 'pdf' | 'pptx') {
    setBusy(true); setMessage('');
    try {
      const audience = mode === 'final' ? 'company' : 'consultant';
      const blob = format === 'pdf' ? await exporter.exportPdf(report, template, audience) : await exporter.exportPptx(report, template, audience);
      const filename = exporter.filename(report, template, audience, format);
      downloadBlob(blob, filename);
      setMessage(`${filename} 다운로드를 시작했습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return <section className={`diagnostic-report-viewer is-${mode}`}>
    <header className="diagnostic-viewer-toolbar"><ReportPageNavigation pages={template.pages} activePage={activePage} onChange={setActivePage} />
      <div><button type="button" disabled={busy} onClick={() => download('pdf')}>{busy ? '준비 중…' : 'PDF 다운로드'}</button><button type="button" disabled={busy} onClick={() => download('pptx')}>PPTX 다운로드</button></div>
    </header>
    {message && <p className="diagnostic-export-message" role="status">{message}</p>}
    <div className="diagnostic-preview-stage"><DiagnosticPageCanvas page={page} content={content} audienceRole={mode === 'final' ? 'company' : 'consultant'} watermark={mode === 'review' && report.status !== 'finalized'} period={report.snapshot.filters.year} /></div>
  </section>;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
