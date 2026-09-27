import type { DiagnosticPage } from '../../../domain/diagnostic-template';

export function ReportPageNavigation({ pages, activePage, onChange }: { pages: DiagnosticPage[]; activePage: number; onChange(page: number): void }) {
  return <div className="diagnostic-report-navigation" aria-label="보고서 페이지 이동">
    <button type="button" onClick={() => onChange(Math.max(1, activePage - 1))} disabled={activePage <= 1}>이전</button>
    <label><span>페이지</span><select value={activePage} onChange={event => onChange(Number(event.target.value))}>
      {pages.map(page => <option value={page.number} key={page.number}>{String(page.number).padStart(3, '0')} · {page.title}</option>)}
    </select></label>
    <span>{activePage} / {pages.length}</span>
    <button type="button" onClick={() => onChange(Math.min(pages.length, activePage + 1))} disabled={activePage >= pages.length}>다음</button>
  </div>;
}
