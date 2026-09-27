import { AnalysisPageFrame } from '../components/AnalysisPageFrame';
import { BreakdownTable } from '../components/BreakdownTable';
import { ScoreTrendPanel } from '../components/ScoreTrendPanel';
import { useAnalysisScreen } from '../analysis-context';
import { demoDataset } from '../../../data/demo-dataset';

export function IndustryCompanyComparisonPage() {
  const { user, filters, viewModel, subjectCompany } = useAnalysisScreen('업종별 기업 비교 분석');
  const filtered = Object.values(filters.dimensions).some(Boolean);
  return <AnalysisPageFrame title="업종별 기업 비교 분석" screenId="factors-industry-company-comparison">
    <section className="industry-scope-note"><span>비교 업종</span><strong>{demoDataset.industryLabel}</strong><p>비교 기업은 선택한 프로젝트의 접근 범위에서만 표시됩니다.</p></section>
    <ScoreTrendPanel viewModel={viewModel} subjectLabel={subjectCompany?.label ?? ''} filtered={filtered} />
    <BreakdownTable subjectLabel={subjectCompany?.label ?? ''} subject={viewModel.subjectScore} comparisons={viewModel.comparisons} consultant={user?.role === 'consultant'} />
  </AnalysisPageFrame>;
}
