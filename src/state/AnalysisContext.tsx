import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { demoDataset } from '../data/demo-dataset';
import type { DemoDataset } from '../data/schema';
import type { AnalysisFilters, FilterOption } from '../domain/filters';
import type { DemoUser } from '../domain/auth';
import { useSession } from '../auth/SessionProvider';
import { DEFAULT_FILTERS } from '../domain/filters';
import { DEMO_PROJECTS } from '../data/demo-projects';
import { DemoAnalyticsService } from '../services/demo-analytics';
import { getProjectDataset, listProjectSummaries, projectDatasetUpdatedEventName } from '../services/project-data-store';

type AnalysisAction =
  | { type: 'setYear'; value: 2022 }
  | { type: 'setIndustry'; value: string }
  | { type: 'setSubjectCompany'; value: string }
  | { type: 'setComparisons'; value: string[] }
  | { type: 'setDimension'; key: keyof AnalysisFilters['dimensions']; value: string }
  | { type: 'loadProject'; value: AnalysisFilters }
  | { type: 'resetFilters' };

interface AnalysisContextValue {
  filters: AnalysisFilters;
  filterOptions: FilterOption[];
  visibleCompanies: DemoDataset['companies'];
  dataset: DemoDataset;
  analytics: DemoAnalyticsService;
  projects: Array<{ id: string; label: string }>;
  activeProjectId: string;
  setActiveProject(id: string): void;
  dispatch: (action: AnalysisAction) => void;
}

const STORAGE_KEY = 'kpc-cx-analysis-context';
const AnalysisContext = createContext<AnalysisContextValue | null>(null);

function initialFilters(user: DemoUser, dataset: DemoDataset, projectId: string): AnalysisFilters {
  const project = DEMO_PROJECTS.find((candidate) => candidate.id === projectId);
  const companyId = user.role === 'company' ? user.companyId ?? '' : project?.subjectCompanyId ?? dataset.companies[0]?.id ?? '';
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_KEY}:${user.id}:${projectId}`);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<AnalysisFilters>;
      const visibleProjectCompanyIds = new Set(project ? [project.subjectCompanyId, ...project.comparisonCompanyIds] : dataset.companies.map((company) => company.id));
      const knownCompanyIds = new Set(dataset.companies.map((company) => company.id).filter((id) => visibleProjectCompanyIds.has(id)));
      const subjectCompanyId = user.role === 'company'
        ? companyId
        : (stored.subjectCompanyId && knownCompanyIds.has(stored.subjectCompanyId) ? stored.subjectCompanyId : companyId);
      return {
        ...DEFAULT_FILTERS,
        year: 2022,
        industryId: dataset.industryId,
        subjectCompanyId,
        comparisonCompanyIds: user.role === 'consultant'
          ? (stored.comparisonCompanyIds ?? project?.comparisonCompanyIds ?? []).filter((id) => knownCompanyIds.has(id) && id !== subjectCompanyId)
          : [],
        dimensions: stored.dimensions ?? {},
      };
    }
  } catch {
    // Fall back to the role-scoped defaults if storage is unavailable or malformed.
  }
  return {
    ...DEFAULT_FILTERS,
    industryId: dataset.industryId,
    subjectCompanyId: companyId,
    comparisonCompanyIds: user.role === 'consultant' ? project?.comparisonCompanyIds ?? [] : [],
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
    case 'loadProject': return action.value;
    case 'resetFilters': return { ...state, dimensions: {}, comparisonCompanyIds: [] };
  }
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  if (!user || user.role === 'admin') throw new Error('AnalysisProvider requires a company or consultant session.');
  const assignedProjects = listProjectSummaries(user.projectIds);
  const [activeProjectId, setActiveProjectId] = useState(assignedProjects[0]?.id ?? '');
  const [datasetRevision, setDatasetRevision] = useState(0);
  const dataset = useMemo(() => getProjectDataset(activeProjectId, demoDataset), [activeProjectId, datasetRevision]);
  const analytics = useMemo(() => new DemoAnalyticsService(dataset), [dataset]);
  const [filters, dispatch] = useReducer(filterReducer, { user, dataset, activeProjectId }, ({ user: currentUser, dataset: currentDataset, activeProjectId: projectId }) => initialFilters(currentUser, currentDataset, projectId));
  const previousProjectId = useRef(activeProjectId);
  const allowedProjects = assignedProjects.map((project) => ({ id: project.id, label: project.name }));
  const visibleCompanies = useMemo(() => {
    if (user.role === 'company') return dataset.companies.filter((company) => company.id === user.companyId);
    const project = DEMO_PROJECTS.find((item) => item.id === activeProjectId);
    const companyIds = new Set(project ? [project.subjectCompanyId, ...project.comparisonCompanyIds] : []);
    return allowedProjects.length > 0 ? dataset.companies.filter((company) => companyIds.has(company.id)) : [];
  }, [activeProjectId, allowedProjects.length, dataset.companies, user]);
  const filterOptions = useMemo(() => analytics.getFilterOptions(), [analytics]);

  useEffect(() => {
    const updateDataset = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (detail?.projectId === activeProjectId) setDatasetRevision((revision) => revision + 1);
    };
    const eventName = projectDatasetUpdatedEventName();
    window.addEventListener(eventName, updateDataset);
    return () => window.removeEventListener(eventName, updateDataset);
  }, [activeProjectId]);

  useEffect(() => {
    if (previousProjectId.current !== activeProjectId) {
      previousProjectId.current = activeProjectId;
      dispatch({ type: 'loadProject', value: initialFilters(user, dataset, activeProjectId) });
    }
  }, [activeProjectId, dataset, user]);

  useEffect(() => {
    if (!visibleCompanies.some((company) => company.id === filters.subjectCompanyId)) {
      dispatch({ type: 'setSubjectCompany', value: visibleCompanies[0]?.id ?? '' });
    }
  }, [filters.subjectCompanyId, visibleCompanies]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(`${STORAGE_KEY}:${user.id}:${activeProjectId}`, JSON.stringify(filters));
    } catch {
      // Keep the active context in memory when storage is unavailable.
    }
  }, [filters, user.id, activeProjectId]);

  const value = useMemo<AnalysisContextValue>(() => ({
    filters,
    filterOptions,
    visibleCompanies,
    dataset,
    analytics,
    projects: allowedProjects,
    activeProjectId,
    setActiveProject(id) {
      if (allowedProjects.some((project) => project.id === id)) setActiveProjectId(id);
    },
    dispatch,
  }), [filters, filterOptions, visibleCompanies, dataset, analytics, allowedProjects, activeProjectId]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysisContext(): AnalysisContextValue {
  const value = useContext(AnalysisContext);
  if (!value) throw new Error('useAnalysisContext must be used inside AnalysisProvider.');
  return value;
}
