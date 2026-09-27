import type { DemoDataset, DimensionKey, DimensionValues } from '../data/schema';
import type { AnalysisResult, EvidenceRef, MetricValue, SeriesPoint } from '../domain/analytics';
import type { AnalysisFilters, FilterOption } from '../domain/filters';

const DIMENSION_KEYS: DimensionKey[] = ['gender', 'ageGroup', 'nationality', 'branch'];

interface AggregatedValues {
  respondentCount: number;
  ncsiSum: number;
  factorSums: Record<string, number>;
  factorCounts: Record<string, number>;
}

export class InvalidAnalysisFiltersError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnalysisFiltersError';
  }
}

export class DemoAnalyticsService {
  constructor(private readonly dataset: DemoDataset) {}

  analyze(filters: AnalysisFilters): AnalysisResult {
    this.validateComparisonSelection(filters);

    const subject = this.dataset.companies.find((company) => company.id === filters.subjectCompanyId);
    const commonScopeAvailable = filters.year === this.dataset.year && filters.industryId === this.dataset.industryId;
    const subjectAggregate = subject && commonScopeAvailable
      ? this.aggregateCompany(subject.id, filters)
      : emptyAggregate();

    const subjectNCSI = this.toNCSIMetric(subject, subjectAggregate, filters, commonScopeAvailable);
    const comparisonSeries = filters.comparisonCompanyIds.map((companyId) => {
      const company = this.dataset.companies.find((candidate) => candidate.id === companyId);
      const values = company && commonScopeAvailable
        ? this.aggregateCompany(company.id, filters)
        : emptyAggregate();
      return this.toComparisonPoint(companyId, company?.label ?? companyId, values, filters, commonScopeAvailable);
    });

    const factorScores = subject
      ? this.dataset.factors.map((factor) => {
          const validCount = subjectAggregate.factorCounts[factor.id] ?? 0;
          const value = validCount > 0 ? (subjectAggregate.factorSums[factor.id] ?? 0) / validCount : null;
          const evidence = validCount > 0
            ? this.createEvidence(subject.id, [factor.id], filters.dimensions, validCount, 'factor-source-mean')
            : null;
          return {
            id: factor.id,
            label: factor.label,
            value,
            respondentCount: validCount,
            evidence,
            ...(value === null ? { unavailableReason: '해당 조건의 품질요인 원천값이 없습니다.' } : {}),
          };
        })
      : [];

    return {
      subjectNCSI,
      comparisonSeries,
      factorScores,
      respondentCount: subjectAggregate.respondentCount,
      filters: cloneFilters(filters),
    };
  }

  getFilterOptions(): FilterOption[] {
    const options: FilterOption[] = [
      { id: String(this.dataset.year), label: String(this.dataset.year), group: 'year', enabled: true },
      { id: this.dataset.industryId, label: this.dataset.industryLabel, group: 'industry', enabled: true },
      ...this.dataset.companies.map((company) => ({
        id: company.id,
        label: company.label,
        group: 'company' as const,
        enabled: true,
      })),
    ];

    for (const key of DIMENSION_KEYS) {
      const values = new Set<string>();
      for (const cell of this.dataset.cells) {
        const value = cell.dimensions[key];
        if (value) values.add(value);
      }
      options.push(...[...values].sort((left, right) => left.localeCompare(right, 'ko')).map((value) => ({
        id: value,
        label: value,
        group: 'dimension' as const,
        dimensionKey: key,
        enabled: true,
      })));
    }

    return options;
  }

  getDatasetStatus(): { year: 2022; sourceHash: string; rowCount: number; ready: boolean } {
    const rowCount = this.dataset.cells.reduce((sum, cell) => sum + cell.respondentCount, 0);
    const ready = this.dataset.year === 2022
      && this.dataset.sourceRowCount === rowCount
      && this.dataset.companies.length === 3
      && this.dataset.factors.length === 49
      && /^[\da-f]{64}$/i.test(this.dataset.sourceHash);
    return { year: 2022, sourceHash: this.dataset.sourceHash, rowCount, ready };
  }

  private aggregateCompany(companyId: string, filters: AnalysisFilters): AggregatedValues {
    const matchingCells = this.dataset.cells.filter((cell) =>
      cell.companyId === companyId
      && cell.year === filters.year
      && matchesDimensions(cell.dimensions, filters.dimensions),
    );
    return matchingCells.reduce<AggregatedValues>((total, cell) => {
      total.respondentCount += cell.respondentCount;
      total.ncsiSum += cell.ncsiSum;
      for (const factor of this.dataset.factors) {
        total.factorSums[factor.id] += cell.factorSums[factor.id] ?? 0;
        total.factorCounts[factor.id] += cell.factorCounts[factor.id] ?? 0;
      }
      return total;
    }, emptyAggregate(this.dataset.factors.map((factor) => factor.id)));
  }

  private toNCSIMetric(
    company: DemoDataset['companies'][number] | undefined,
    values: AggregatedValues,
    filters: AnalysisFilters,
    commonScopeAvailable: boolean,
  ): MetricValue {
    if (!company) return unavailableMetric('대상 기업을 선택하거나 확인할 수 없습니다.');
    if (!commonScopeAvailable) return unavailableMetric('선택한 연도 또는 업종의 실제 원천 데이터가 없습니다.');
    if (values.respondentCount === 0) return unavailableMetric('해당 조건의 NCSI 원천 데이터가 없습니다.');

    return {
      value: values.ncsiSum / values.respondentCount,
      unit: 'score',
      evidence: this.createEvidence(company.id, [this.dataset.fieldIds.ncsi], filters.dimensions, values.respondentCount, 'ncsi-source-mean'),
    };
  }

  private toComparisonPoint(
    companyId: string,
    label: string,
    values: AggregatedValues,
    filters: AnalysisFilters,
    commonScopeAvailable: boolean,
  ): SeriesPoint {
    if (!commonScopeAvailable) return unavailablePoint(companyId, label, '선택한 연도 또는 업종의 실제 원천 데이터가 없습니다.');
    if (values.respondentCount === 0) return unavailablePoint(companyId, label, '해당 조건의 비교 기업 원천 데이터가 없습니다.');

    return {
      id: companyId,
      label,
      value: values.ncsiSum / values.respondentCount,
      respondentCount: values.respondentCount,
      evidence: this.createEvidence(companyId, [this.dataset.fieldIds.ncsi], filters.dimensions, values.respondentCount, 'ncsi-source-mean'),
    };
  }

  private createEvidence(
    companyId: string,
    fieldIds: string[],
    filters: DimensionValues,
    respondentCount: number,
    calculationId: EvidenceRef['calculationId'],
  ): EvidenceRef {
    return {
      datasetId: this.dataset.id,
      sourceHash: this.dataset.sourceHash,
      fieldIds,
      companyId,
      year: this.dataset.year,
      filters: activeDimensions(filters),
      respondentCount,
      calculationId,
    };
  }

  private validateComparisonSelection(filters: AnalysisFilters): void {
    const uniqueIds = new Set(filters.comparisonCompanyIds);
    if (uniqueIds.size !== filters.comparisonCompanyIds.length) {
      throw new InvalidAnalysisFiltersError('비교 기업은 중복 선택할 수 없습니다.');
    }
    if (filters.subjectCompanyId && filters.comparisonCompanyIds.includes(filters.subjectCompanyId)) {
      throw new InvalidAnalysisFiltersError('대상 기업은 비교 기업 목록에서 제외해야 합니다.');
    }
    const knownCompanies = new Set(this.dataset.companies.map((company) => company.id));
    const unknownIds = filters.comparisonCompanyIds.filter((companyId) => !knownCompanies.has(companyId));
    if (unknownIds.length > 0) {
      throw new InvalidAnalysisFiltersError(`알 수 없는 비교 기업이 포함되어 있습니다: ${unknownIds.join(', ')}`);
    }
  }
}

function matchesDimensions(cellDimensions: DimensionValues, selected: DimensionValues): boolean {
  return DIMENSION_KEYS.every((key) => {
    const value = selected[key];
    return value === undefined || value === '' || cellDimensions[key] === value;
  });
}

function activeDimensions(dimensions: DimensionValues): DimensionValues {
  return Object.fromEntries(Object.entries(dimensions).filter(([, value]) => value !== undefined && value !== '')) as DimensionValues;
}

function emptyAggregate(factorIds: string[] = []): AggregatedValues {
  return {
    respondentCount: 0,
    ncsiSum: 0,
    factorSums: Object.fromEntries(factorIds.map((id) => [id, 0])),
    factorCounts: Object.fromEntries(factorIds.map((id) => [id, 0])),
  };
}

function unavailableMetric(reason: string): MetricValue {
  return { value: null, unit: 'score', evidence: null, unavailableReason: reason };
}

function unavailablePoint(id: string, label: string, reason: string): SeriesPoint {
  return { id, label, value: null, respondentCount: 0, evidence: null, unavailableReason: reason };
}

function cloneFilters(filters: AnalysisFilters): AnalysisFilters {
  return {
    ...filters,
    comparisonCompanyIds: [...filters.comparisonCompanyIds],
    dimensions: { ...filters.dimensions },
  };
}
