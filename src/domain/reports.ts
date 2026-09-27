import type { AnalysisFilters } from './filters';
import type { AiAnswer } from './ai';
import type { EvidenceRef, MetricValue, SeriesPoint } from './analytics';

export interface CustomerReportItem {
  id: string;
  type: 'metric' | 'chart' | 'ai-insight';
  title: string;
  annotation: string;
  payload: MetricValue | SeriesPoint[] | AiAnswer;
  evidence: EvidenceRef[];
}

export interface CustomerReportDraft {
  id: string;
  title: string;
  projectId: string;
  filters: AnalysisFilters;
  items: CustomerReportItem[];
  createdAt: string;
}

export interface DiagnosticReportInput {
  projectId: string;
  datasetId: string;
  templateId: string;
  templateVersion: string;
  filters: AnalysisFilters;
}

export interface DiagnosticDraft {
  id: string;
  input: DiagnosticReportInput;
  status: 'draft' | 'review' | 'finalized';
  createdAt: string;
  finalizedAt: string | null;
}

export interface ReportSnapshot {
  datasetId: string;
  sourceHash: string;
  filters: AnalysisFilters;
  calculationVersion: string;
  templateId: string;
  templateVersion: string;
  createdAt: string;
}

export type ExportFormat = 'pptx' | 'pdf';

export interface ReportEnginePort {
  exportCustomerReport(report: CustomerReportDraft, format: ExportFormat): Promise<Blob>;
  generateDiagnosticReport(input: DiagnosticReportInput): Promise<DiagnosticDraft>;
}
