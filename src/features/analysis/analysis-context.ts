import { useMemo } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { useAnalysisContext } from '../../state/AnalysisContext';
import { buildAnalysisViewModel } from './analysis-view-model';

export function useAnalysisScreen(title: string) {
  const { user } = useSession();
  const context = useAnalysisContext();
  const result = useMemo(() => context.analytics.analyze(context.filters), [context.analytics, context.filters]);
  const viewModel = useMemo(() => buildAnalysisViewModel(result, title, context.dataset), [result, title, context.dataset]);
  const subjectCompany = context.dataset.companies.find((company) => company.id === context.filters.subjectCompanyId);
  return { ...context, user, result, viewModel, subjectCompany };
}
