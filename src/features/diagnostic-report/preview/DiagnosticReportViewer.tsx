import { useState } from 'react';
import type { DiagnosticReport } from '../../../domain/diagnostic-report';
import { NCSI_2022_V1 } from '../../../report-templates/ncsi-2022-v1';
import { DiagnosticReportExporter } from '../../../services/report-exporter';
import { DiagnosticPageCanvas } from './DiagnosticPageCanvas';
import { ReportPageNavigation } from './ReportPageNavigation';
import './report-preview.css';

const exporter = new DiagnosticReportExporter();

export function DiagnosticReportViewer({ report, mode }: { report: DiagnosticReport; mode: 'review' | 'final' }) {
  const [activePage, setActivePage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (mode === 'final' && report.status !== 'finalized') return <section className="diagnostic-viewer-denied">확정된 NCSI 보고서가 없습니다.</section>;
  const page = NCSI_2022_V1.pages[activePage - 1]!;
  const content = report.pages[activePage - 1]!;

  async function download(format: 'pdf' | 'pptx') {
    setBusy(true); setMessage('');
    try {
      const audience = mode === 'final' ? 'company' : 'consultant';
      const blob = format === 'pdf' ? await exporter.exportPdf(report, NCSI_2022_V1, audience) : await exporter.exportPptx(report, NCSI_2022_V1, audience);
      const filename = exporter.filename(report, NCSI_2022_V1, audience, format);
      downloadBlob(blob, filename);
      setMessage(`${filename} 다운로드를 시작했습니다.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return <section className={`diagnostic-report-viewer is-${mode}`}>
    <header className="diagnostic-viewer-toolbar"><ReportPageNavigation pages={NCSI_2022_V1.pages} activePage={activePage} onChange={setActivePage} />
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
