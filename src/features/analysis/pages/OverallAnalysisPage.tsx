import { AnalysisPageFrame } from '../components/AnalysisPageFrame';
import { BreakdownTable } from '../components/BreakdownTable';
import { FactorRankingChart } from '../components/FactorRankingChart';
import { ScoreTrendPanel } from '../components/ScoreTrendPanel';
import { useAnalysisScreen } from '../analysis-context';

export function OverallAnalysisPage() {
  const { user, filters, result, viewModel, subjectCompany } = useAnalysisScreen('전체 수준 분석');
  const filtered = Object.values(filters.dimensions).some(Boolean);
  return <AnalysisPageFrame title="전체 수준 분석" screenId="overview-all">
    <div className="analysis-grid analysis-grid--overview">
      <ScoreTrendPanel viewModel={viewModel} subjectLabel={subjectCompany?.label ?? ''} filtered={filtered} filters={filters} result={result} screenId="overview-all" />
      <FactorRankingChart factors={viewModel.factors} filters={filters} result={result} screenId="overview-all" />
    </div>
    <BreakdownTable subjectLabel={subjectCompany?.label ?? ''} subject={viewModel.subjectScore} comparisons={viewModel.comparisons} consultant={user?.role === 'consultant'} />
  </AnalysisPageFrame>;
}
