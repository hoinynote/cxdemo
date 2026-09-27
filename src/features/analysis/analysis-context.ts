import { useMemo } from 'react';
import { demoDataset } from '../../data/demo-dataset';
import { useSession } from '../../auth/SessionProvider';
import { useAnalysisContext } from '../../state/AnalysisContext';
import { createServiceContainer } from '../../services/container';
import { buildAnalysisViewModel } from './analysis-view-model';

const analytics = createServiceContainer().analytics;

export function useAnalysisScreen(title: string) {
  const { user } = useSession();
  const context = useAnalysisContext();
  const result = useMemo(() => analytics.analyze(context.filters), [context.filters]);
  const viewModel = useMemo(() => buildAnalysisViewModel(result, title), [result, title]);
  const subjectCompany = demoDataset.companies.find((company) => company.id === context.filters.subjectCompanyId);
  return { ...context, user, result, viewModel, subjectCompany };
}
