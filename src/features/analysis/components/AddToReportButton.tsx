import type { AnalysisResult, EvidenceRef } from '../../../domain/analytics';
import type { AnalysisFilters } from '../../../domain/filters';
import type { CustomerReportItem } from '../../../domain/reports';
import { createReportItem } from '../../customer-report/report-item';

export function AddToReportButton({ item, filters, result, screenId, children, className = 'subtle-button' }: {
  item: Omit<CustomerReportItem, 'id'>;
  filters: AnalysisFilters;
  result: AnalysisResult;
  screenId: string;
  children: string;
  className?: string;
}) {
  function add() {
    const evidence: EvidenceRef[] = item.evidence;
    const reportItem = { ...createReportItem({ type: item.type, title: item.title, payload: item.payload, evidence }), annotation: item.annotation };
    window.dispatchEvent(new CustomEvent('cx:add-report-item', { detail: { item: reportItem, context: { screenId, filters, result } } }));
  }

  return <button type="button" className={className} onClick={add}>{children}</button>;
}
