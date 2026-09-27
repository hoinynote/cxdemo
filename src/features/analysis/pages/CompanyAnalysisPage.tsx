import { AnalysisPageFrame } from '../components/AnalysisPageFrame';
import { BreakdownTable } from '../components/BreakdownTable';
import { FactorRankingChart } from '../components/FactorRankingChart';
import { ScoreTrendPanel } from '../components/ScoreTrendPanel';
import { useAnalysisScreen } from '../analysis-context';

export function CompanyAnalysisPage() {
  const { user, filters, viewModel, subjectCompany } = useAnalysisScreen('기업별 수준 분석');
  const filtered = Object.values(filters.dimensions).some(Boolean);
  return <AnalysisPageFrame title="기업별 수준 분석" screenId="overview-company">
    <ScoreTrendPanel viewModel={viewModel} subjectLabel={subjectCompany?.label ?? ''} filtered={filtered} />
    <FactorRankingChart factors={viewModel.factors} />
    <BreakdownTable subjectLabel={subjectCompany?.label ?? ''} subject={viewModel.subjectScore} comparisons={viewModel.comparisons} consultant={user?.role === 'consultant'} />
  </AnalysisPageFrame>;
}
