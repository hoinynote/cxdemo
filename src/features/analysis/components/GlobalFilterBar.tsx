import { useAnalysisContext } from '../../../state/AnalysisContext';
import { useSession } from '../../../auth/SessionProvider';
import type { DimensionKey } from '../../../data/schema';

const dimensions: Array<{ key: DimensionKey; label: string }> = [
  { key: 'gender', label: '성별' },
  { key: 'ageGroup', label: '연령대' },
  { key: 'nationality', label: '국적' },
  { key: 'branch', label: '지점' },
];

export function GlobalFilterBar() {
  const { user } = useSession();
  const { filters, dispatch, visibleCompanies, filterOptions } = useAnalysisContext();
  const comparisonCompanies = visibleCompanies.filter((company) => company.id !== filters.subjectCompanyId);

  function toggleComparison(companyId: string, checked: boolean) {
    const next = checked
      ? [...filters.comparisonCompanyIds, companyId]
      : filters.comparisonCompanyIds.filter((id) => id !== companyId);
    dispatch({ type: 'setComparisons', value: next });
  }

  return (
    <section className="analysis-filter-bar" aria-label="공통 분석 조건">
      <label className="analysis-filter-field"><span>연도</span><select value={String(filters.year)} onChange={(event) => dispatch({ type: 'setYear', value: Number(event.target.value) as 2022 })}>
        {filterOptions.filter((option) => option.group === 'year').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label className="analysis-filter-field"><span>업종</span><select value={filters.industryId} onChange={(event) => dispatch({ type: 'setIndustry', value: event.target.value })}>
        {filterOptions.filter((option) => option.group === 'industry').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label className="analysis-filter-field"><span>분석 기업</span><select value={filters.subjectCompanyId} disabled={user?.role === 'company'} onChange={(event) => dispatch({ type: 'setSubjectCompany', value: event.target.value })}>
        {visibleCompanies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
      </select></label>
      <fieldset className="comparison-filter-field" disabled={user?.role === 'company' || comparisonCompanies.length === 0}>
        <legend>비교 기업</legend>
        {comparisonCompanies.length > 0 ? <div className="comparison-options">{comparisonCompanies.map((company) => <label key={company.id}>
          <input type="checkbox" checked={filters.comparisonCompanyIds.includes(company.id)} onChange={(event) => toggleComparison(company.id, event.target.checked)} />{company.label}
        </label>)}</div> : <p>배정 데이터 범위에 비교 기업 없음</p>}
      </fieldset>
      {dimensions.map(({ key, label }) => {
        const values = filterOptions.filter((option) => option.group === 'dimension' && option.dimensionKey === key);
        return <label className="analysis-filter-field" key={key}><span>{label}</span><select value={filters.dimensions[key] ?? ''} onChange={(event) => dispatch({ type: 'setDimension', key, value: event.target.value })}>
          <option value="">전체</option>{values.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select></label>;
      })}
      <button className="filter-reset" type="button" onClick={() => dispatch({ type: 'resetFilters' })}>조건 초기화</button>
    </section>
  );
}
