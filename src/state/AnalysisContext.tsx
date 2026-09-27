import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { demoDataset } from '../data/demo-dataset';
import type { AnalysisFilters, FilterOption } from '../domain/filters';
import type { DemoUser } from '../domain/auth';
import { DEMO_PROJECTS } from '../auth/demo-users';
import { useSession } from '../auth/SessionProvider';
import { DEFAULT_FILTERS } from '../domain/filters';
import { createServiceContainer } from '../services/container';

type AnalysisAction =
  | { type: 'setYear'; value: 2022 }
  | { type: 'setIndustry'; value: string }
  | { type: 'setSubjectCompany'; value: string }
  | { type: 'setComparisons'; value: string[] }
  | { type: 'setDimension'; key: keyof AnalysisFilters['dimensions']; value: string }
  | { type: 'resetFilters' };

interface AnalysisContextValue {
  filters: AnalysisFilters;
  filterOptions: FilterOption[];
  visibleCompanies: typeof demoDataset.companies;
  projects: Array<{ id: string; label: string }>;
  activeProjectId: string;
  setActiveProject(id: string): void;
  dispatch: (action: AnalysisAction) => void;
}

const STORAGE_KEY = 'kpc-cx-analysis-context';
const AnalysisContext = createContext<AnalysisContextValue | null>(null);
const analytics = createServiceContainer().analytics;

function initialFilters(user: DemoUser): AnalysisFilters {
  const companyId = user.role === 'company' ? user.companyId ?? '' : demoDataset.companies[0]?.id ?? '';
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_KEY}:${user.id}`);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<AnalysisFilters>;
      const knownCompanyIds = new Set(demoDataset.companies.map((company) => company.id));
      const subjectCompanyId = user.role === 'company'
        ? companyId
        : (stored.subjectCompanyId && knownCompanyIds.has(stored.subjectCompanyId) ? stored.subjectCompanyId : companyId);
      return {
        ...DEFAULT_FILTERS,
        year: 2022,
        industryId: demoDataset.industryId,
        subjectCompanyId,
        comparisonCompanyIds: user.role === 'consultant'
          ? (stored.comparisonCompanyIds ?? []).filter((id) => knownCompanyIds.has(id) && id !== subjectCompanyId)
          : [],
        dimensions: stored.dimensions ?? {},
      };
    }
  } catch {
    // Fall back to the role-scoped defaults if storage is unavailable or malformed.
  }
  return {
    ...DEFAULT_FILTERS,
    industryId: demoDataset.industryId,
    subjectCompanyId: companyId,
  };
}

function filterReducer(state: AnalysisFilters, action: AnalysisAction): AnalysisFilters {
  switch (action.type) {
    case 'setYear': return { ...state, year: action.value };
    case 'setIndustry': return { ...state, industryId: action.value };
    case 'setSubjectCompany': return {
      ...state,
      subjectCompanyId: action.value,
      comparisonCompanyIds: state.comparisonCompanyIds.filter((id) => id !== action.value),
    };
    case 'setComparisons': return {
      ...state,
      comparisonCompanyIds: [...new Set(action.value)].filter((id) => id !== state.subjectCompanyId),
    };
    case 'setDimension': return {
      ...state,
      dimensions: { ...state.dimensions, [action.key]: action.value || undefined },
    };
    case 'resetFilters': return { ...state, dimensions: {}, comparisonCompanyIds: [] };
  }
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (!user || user.role === 'admin') throw new Error('AnalysisProvider requires a company or consultant session.');
  const [filters, dispatch] = useReducer(filterReducer, user, initialFilters);
  const allowedProjects = DEMO_PROJECTS.filter((project) => user.projectIds.includes(project.id));
  const [activeProjectId, setActiveProjectId] = useReducer((_current: string, next: string) => next, allowedProjects[0]?.id ?? '');
  const visibleCompanies = useMemo(() => {
    if (user.role === 'company') return demoDataset.companies.filter((company) => company.id === user.companyId);
    return allowedProjects.length > 0 ? demoDataset.companies : [];
  }, [allowedProjects.length, user]);
  const filterOptions = useMemo(() => analytics.getFilterOptions(), []);

  useEffect(() => {
    if (!visibleCompanies.some((company) => company.id === filters.subjectCompanyId)) {
      dispatch({ type: 'setSubjectCompany', value: visibleCompanies[0]?.id ?? '' });
    }
  }, [filters.subjectCompanyId, visibleCompanies]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify(filters));
    } catch {
      // Keep the active context in memory when storage is unavailable.
    }
  }, [filters, user.id]);

  const value = useMemo<AnalysisContextValue>(() => ({
    filters,
    filterOptions,
    visibleCompanies,
    projects: allowedProjects,
    activeProjectId,
    setActiveProject(id) {
      if (allowedProjects.some((project) => project.id === id)) setActiveProjectId(id);
    },
    dispatch,
  }), [filters, filterOptions, visibleCompanies, allowedProjects, activeProjectId]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisContext(): AnalysisContextValue {
  const value = useContext(AnalysisContext);
  if (!value) throw new Error('useAnalysisContext must be used inside AnalysisProvider.');
  return value;
}
