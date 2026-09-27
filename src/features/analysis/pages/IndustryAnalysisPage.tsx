import { AnalysisPageFrame } from '../components/AnalysisPageFrame';
import { BreakdownTable } from '../components/BreakdownTable';
import { ScoreTrendPanel } from '../components/ScoreTrendPanel';
import { useAnalysisScreen } from '../analysis-context';
import { demoDataset } from '../../../data/demo-dataset';

export function IndustryAnalysisPage() {
  const { user, filters, result, viewModel, subjectCompany } = useAnalysisScreen('산업별 수준 분석');
  const filtered = Object.values(filters.dimensions).some(Boolean);
  return <AnalysisPageFrame title="산업별 수준 분석" screenId="overview-industry">
    <section className="industry-scope-note"><span>선택 업종</span><strong>{demoDataset.industryLabel} · {demoDataset.sectorLabel}</strong><p>현재 연결된 원천은 2022년 면세점 업종 응답 자료입니다.</p></section>
    <ScoreTrendPanel viewModel={viewModel} subjectLabel={subjectCompany?.label ?? ''} filtered={filtered} filters={filters} result={result} screenId="overview-industry" />
    <BreakdownTable subjectLabel={subjectCompany?.label ?? ''} subject={viewModel.subjectScore} comparisons={viewModel.comparisons} consultant={user?.role === 'consultant'} />
  </AnalysisPageFrame>;
}
