import type { AnalysisResult, EvidenceRef, MetricValue, SeriesPoint } from '../../domain/analytics';
import { demoDataset } from '../../data/demo-dataset';
import type { DemoDataset } from '../../data/schema';

export interface AnalysisViewModel {
  title: string;
  subjectLabel: string;
  subjectScore: MetricValue;
  respondentCount: number;
  comparisons: SeriesPoint[];
  factors: SeriesPoint[];
  evidence: EvidenceRef[];
  scoreDelta: number | null;
  emptyMessage: string | null;
}

export function buildAnalysisViewModel(result: AnalysisResult, title: string, dataset: DemoDataset = demoDataset): AnalysisViewModel {
  const evidence = [
    result.subjectNCSI.evidence,
    ...result.comparisonSeries.map((point) => point.evidence),
    ...result.factorScores.map((point) => point.evidence),
  ].filter((item): item is EvidenceRef => item !== null);
  const availableComparisons = result.comparisonSeries.filter((point) => point.value !== null);
  const comparisonMean = availableComparisons.length > 0
    ? availableComparisons.reduce((sum, point) => sum + (point.value ?? 0), 0) / availableComparisons.length
    : null;
  const subjectCompany = dataset.companies.find((company) => company.id === result.subjectNCSI.evidence?.companyId);

  return {
    title,
    subjectLabel: subjectCompany?.label ?? '',
    subjectScore: result.subjectNCSI,
    respondentCount: result.respondentCount,
    comparisons: result.comparisonSeries,
    factors: result.factorScores,
    evidence,
    scoreDelta: result.subjectNCSI.value !== null && comparisonMean !== null
      ? result.subjectNCSI.value - comparisonMean
      : null,
    emptyMessage: result.subjectNCSI.value === null
      ? result.subjectNCSI.unavailableReason ?? '해당 조건의 데이터 없음'
      : null,
  };
}
