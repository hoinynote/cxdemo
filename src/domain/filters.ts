import type { DimensionValues } from '../data/schema';

export interface AnalysisFilters {
  year: 2022;
  industryId: string;
  subjectCompanyId: string;
  comparisonCompanyIds: string[];
  dimensions: DimensionValues;
}

export interface FilterOption {
  id: string;
  label: string;
  group: 'year' | 'industry' | 'company' | 'dimension';
  dimensionKey?: keyof DimensionValues;
  enabled: boolean;
}

export const DEFAULT_FILTERS: AnalysisFilters = {
  year: 2022,
  industryId: '',
  subjectCompanyId: '',
  comparisonCompanyIds: [],
  dimensions: {},
};
