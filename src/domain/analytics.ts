import type { DimensionValues } from '../data/schema';
import type { AnalysisFilters } from './filters';

export interface EvidenceRef {
  datasetId: string;
  sourceHash: string;
  fieldIds: string[];
  companyId: string;
  year: number;
  filters: DimensionValues;
  respondentCount: number | null;
  calculationId: 'ncsi-source-mean' | 'factor-source-mean' | 'respondent-distribution';
}

export interface MetricValue {
  value: number | null;
  unit: 'score' | 'percent' | 'count';
  evidence: EvidenceRef | null;
  unavailableReason?: string;
}

export interface SeriesPoint {
  id: string;
  label: string;
  value: number | null;
  respondentCount: number;
  evidence: EvidenceRef | null;
  unavailableReason?: string;
}

export interface AnalysisResult {
  subjectNCSI: MetricValue;
  comparisonSeries: SeriesPoint[];
  factorScores: SeriesPoint[];
  respondentCount: number;
  filters: AnalysisFilters;
}
