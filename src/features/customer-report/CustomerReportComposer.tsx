import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerReport } from '../../state/CustomerReportProvider';
import { createServiceContainer } from '../../services/container';
import { ReportDocument } from './ReportItemPreview';
import { ReportItemList } from './ReportItemList';
import './customer-report.css';

export function CustomerReportComposer() {
  const { draft, setTitle, setAnnotation, moveItem, removeItem, clearDraft } = useCustomerReport();
  const [exporting, setExporting] = useState<'pptx' | 'pdf' | null>(null);
  const [error, setError] = useState('');

  async function exportReport(format: 'pptx' | 'pdf') {
    if (!draft || draft.items.length === 0 || exporting) return;
    setExporting(format);
    setError('');
    try {
      const blob = await createServiceContainer().reports.exportCustomerReport(draft, format);
      const date = new Date(draft.createdAt);
      const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const scopeSlug = draft.scopeLabel.normalize('NFC').replace(/[^a-zA-Z0-9가-힣-]+/g, '-').replace(/^-|-$/g, '') || 'CX';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CX-Report-${scopeSlug}-${datePart}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('파일을 만들지 못했습니다. 다시 시도해 주세요.');
    } finally { setExporting(null); }
  }

  if (!draft) return <main className="customer-report-page"><div className="report-empty-state">
    <p>KPC CX · 리포트</p><h1>구성 중인 리포트가 없습니다.</h1><span>분석 화면으로 돌아가 KPI, 차트 또는 AI 결과를 담아 시작하세요.</span><Link to="/workspace/overview/all">분석 화면으로 돌아가기</Link>
  </div></main>;

  return <main className="customer-report-page">
    <header className="customer-report-heading"><div><p>KPC CX · ONE-TIME REPORT</p><h1>리포트 구성</h1><span>{draft.scopeLabel} · {draft.filters.year}년 분석</span></div><div><Link className="report-return-link" to="/workspace/overview/all">분석 계속하기</Link><button type="button" className="report-discard-button" onClick={clearDraft}>리포트 비우기</button></div></header>
    <div className="customer-report-grid">
      <section className="report-editor-panel" aria-labelledby="report-editor-title">
        <div className="report-section-heading"><div><h2 id="report-editor-title">포함할 내용</h2><p>{draft.items.length}개 항목 · 항목별 수치와 출처는 변경할 수 없습니다.</p></div></div>
        <label className="report-title-field"><span>보고서 제목</span><input value={draft.title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
        <ReportItemList items={draft.items} setAnnotation={setAnnotation} moveItem={moveItem} removeItem={removeItem} />
        <div className="report-export-actions">
          <button type="button" disabled={draft.items.length === 0 || exporting !== null} onClick={() => void exportReport('pptx')}>{exporting === 'pptx' ? 'PPTX 생성 중…' : 'PPTX 다운로드'}</button>
          <button type="button" disabled={draft.items.length === 0 || exporting !== null} onClick={() => void exportReport('pdf')}>{exporting === 'pdf' ? 'PDF 생성 중…' : 'PDF 다운로드'}</button>
        </div>
        <p className="report-source-guard">표와 정량 수치는 분석 결과에 연결된 원천 데이터와 근거를 유지합니다.</p>
        {error && <p role="alert" className="report-export-error">{error}</p>}
      </section>
      <section className="report-preview-panel" aria-labelledby="report-preview-title">
        <div className="report-section-heading"><div><h2 id="report-preview-title">미리보기</h2><p>16:9 페이지 · {draft.items.length + 1}장</p></div></div>
        <ReportDocument report={draft} />
      </section>
    </div>
  </main>;
}
