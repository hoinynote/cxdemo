import type { EvidenceRef, MetricValue, SeriesPoint } from './analytics';
import type { AnalysisFilters } from './filters';
import type { ContentScope, DiagnosticContainer } from './diagnostic-template';

export interface ReferenceEvidence {
  kind: 'reference';
  referenceId: string;
  title: string;
  sourceScope: ContentScope;
  reviewedBy: string;
  updatedAt: string;
}

export interface ProjectScopeEvidence {
  kind: 'project-scope';
  projectId: string;
  title: string;
  sourceScope: 'customer-specific';
  updatedAt: string;
}

export type DiagnosticEvidence = EvidenceRef | ReferenceEvidence | ProjectScopeEvidence;
export type DiagnosticValue = string | MetricValue | SeriesPoint[];
export type ReviewState = 'ready' | 'missing' | 'overflow';

export interface DiagnosticSnapshot {
  projectId: string;
  datasetId: string;
  datasetVersion: string;
  sourceHash: string;
  filters: AnalysisFilters;
  subjectCompanyId: string;
  comparisonCompanyIds: string[];
  calculationVersion: string;
  templateId: string;
  templateVersion: string;
  approvedReferenceIds: string[];
  generatedAt: string;
}

export interface RenderedContainer {
  containerId: string;
  sourceContainerId: string;
  pageNumber: number;
  title: string;
  kind: DiagnosticContainer['kind'];
  scope: ContentScope[];
  value: DiagnosticValue;
  editable: boolean;
  evidence: DiagnosticEvidence[];
  requiredPoints: string[];
  checkedPoints: string[];
  maxCharacters: number | null;
  required: boolean;
  reviewState: ReviewState;
  exampleLabel?: string;
}

export interface DiagnosticReport {
  id: string;
  projectId: string;
  status: 'draft' | 'in-review' | 'finalized';
  snapshot: DiagnosticSnapshot;
  pages: Array<{ pageNumber: number; title: string; sectionId: string; containers: RenderedContainer[] }>;
  generatedBy: string;
  reviewerId: string | null;
  finalizedAt: string | null;
}

export interface ReviewIssue {
  containerId: string;
  pageNumber: number;
  code: 'missing' | 'evidence' | 'scope' | 'required-point' | 'overflow';
  message: string;
}

export interface DiagnosticReportEnginePort {
  generate(input: import('./reports').DiagnosticReportInput, generatedBy: string): Promise<DiagnosticReport>;
  updateNarrative(reportId: string, containerId: string, text: string): DiagnosticReport;
  setRequiredPoint(reportId: string, containerId: string, point: string, checked: boolean): DiagnosticReport;
  submitForReview(reportId: string): DiagnosticReport;
  checkDraft(report: DiagnosticReport): ReviewIssue[];
  finalize(reportId: string, reviewerId: string): DiagnosticReport;
}
