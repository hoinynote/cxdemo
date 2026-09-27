import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { useAnalysisContext } from '../state/AnalysisContext';
import { createServiceContainer } from '../services/container';
import { adminMenu, workspaceMenu } from '../navigation/menu';

const analytics = createServiceContainer().analytics;
const dimensionLabels = { gender: '성별', ageGroup: '연령대', nationality: '국적', branch: '지점' } as const;

function titleForPath(path: string): string {
  const menuItems = [...workspaceMenu, ...workspaceMenu.flatMap((item) => item.children ?? []), ...adminMenu];
  return menuItems.find((item) => item.path === path)?.label ?? '운영 현황';
}

export function WorkspacePage() {
  const location = useLocation();
  const { user } = useSession();
  const { filters, dispatch, visibleCompanies, filterOptions } = useAnalysisContext();
  const result = useMemo(() => analytics.analyze(filters), [filters]);
  if (!user) return null;

  const comparisonOptions = visibleCompanies.filter((company) => company.id !== filters.subjectCompanyId);
  const factorPage = location.pathname.startsWith('/workspace/factors');
  const pageTitle = titleForPath(location.pathname);

  return (
    <div className="page-content">
      <div className="page-heading">
        <div><p className="eyebrow">{factorPage ? 'CS QUALITY FACTORS' : 'NCSI ANALYSIS'}</p><h1>{pageTitle}</h1></div>
        <span className="data-period">2022년 기준 · 원천 응답 {result.respondentCount.toLocaleString()}명</span>
      </div>
      <section className="filter-panel" aria-label="분석 조건">
        <label className="field-control"><span>분석 기업</span><select value={filters.subjectCompanyId} disabled={user.role === 'company'} onChange={(event) => dispatch({ type: 'setSubjectCompany', value: event.target.value })}>
          {visibleCompanies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
        </select></label>
        <label className="field-control"><span>비교 기업</span><select multiple value={filters.comparisonCompanyIds} disabled={user.role === 'company'} onChange={(event) => dispatch({ type: 'setComparisons', value: [...event.target.selectedOptions].map((option) => option.value) })}>
          {comparisonOptions.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}
        </select></label>
        <label className="field-control"><span>고객군 · 성별</span><select value={filters.dimensions.gender ?? ''} onChange={(event) => dispatch({ type: 'setDimension', key: 'gender', value: event.target.value })}>
          <option value="">전체</option>{filterOptions.filter((option) => option.group === 'dimension' && option.dimensionKey === 'gender').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select></label>
        <button className="text-button" type="button" onClick={() => dispatch({ type: 'resetFilters' })}>조건 초기화</button>
      </section>
      <section className="analysis-overview" aria-label="분석 결과">
        <article className="metric-panel"><span className="metric-panel__label">{factorPage ? '선택 기업' : 'NCSI 점수'}</span><strong className="metric-panel__value">{result.subjectNCSI.value === null ? '—' : result.subjectNCSI.value.toFixed(2)}</strong><span className="metric-panel__note">{result.subjectNCSI.evidence ? `응답 ${result.subjectNCSI.evidence.respondentCount?.toLocaleString()}명 기준` : result.subjectNCSI.unavailableReason}</span></article>
        <div className="result-panel"><div className="result-panel__heading"><h2>{factorPage ? '품질요인 분석' : '기업별 NCSI 비교'}</h2><span>선택 조건 기준</span></div>
          {factorPage ? <div className="factor-preview">{result.factorScores.slice(0, 5).map((factor) => <div className="factor-row" key={factor.id}><span>{factor.label}</span><strong>{factor.value === null ? '—' : factor.value.toFixed(2)}</strong></div>)}</div> : <div className="comparison-list">{result.comparisonSeries.length === 0 ? <p className="empty-state">비교 기업을 선택하면 결과가 표시됩니다.</p> : result.comparisonSeries.map((point) => <div className="comparison-row" key={point.id}><span>{point.label}</span><strong>{point.value === null ? '—' : point.value.toFixed(2)}</strong><small>{point.value === null ? point.unavailableReason : `응답 ${point.respondentCount.toLocaleString()}명`}</small></div>)}</div>}
        </div>
      </section>
      <section className="analysis-context-note"><div><strong>분석 근거</strong><span>실제 집계 데이터 기반</span></div><p>{result.subjectNCSI.evidence ? `데이터셋 ${result.subjectNCSI.evidence.datasetId} · 산식 NCSI 원천 평균 · ${result.subjectNCSI.evidence.sourceHash.slice(0, 12)}…` : result.subjectNCSI.unavailableReason}</p></section>
      <p className="scope-caption">{dimensionLabels.gender}: {filters.dimensions.gender ?? '전체'} · 화면 이동 후에도 분석 조건은 유지됩니다.</p>
    </div>
  );
}

export function AdminPage() {
  const location = useLocation();
  const title = titleForPath(location.pathname);
  const readiness = analytics.getDatasetStatus();
  return <div className="admin-page"><p className="admin-eyebrow">KPC CX ADMINISTRATION</p><h1>{title}</h1><p className="admin-intro">CX 서비스 운영을 위한 관리 포털입니다.</p>
    {location.pathname === '/admin' ? <div className="admin-summary"><section><span>등록된 사용자 영역</span><strong>3</strong><small>기업 고객 · 컨설턴트 · 관리자</small></section><section><span>데이터셋 상태</span><strong>{readiness.ready ? '정상' : '확인 필요'}</strong><small>{readiness.rowCount}개 응답 · 2022 NCSI</small></section><section><span>운영 프로젝트</span><strong>1</strong><small>2022 면세점 NCSI 진단</small></section></div> : <section className="admin-table-panel"><div className="admin-table-heading"><h2>{title}</h2><span>프로토타입 운영 정보</span></div><table><thead><tr><th>항목</th><th>상태</th><th>설명</th></tr></thead><tbody><tr><td>{title}</td><td><span className="admin-status">준비됨</span></td><td>실제 운영 연동 전 프로토타입 화면</td></tr><tr><td>2022 면세점 NCSI 진단</td><td><span className="admin-status">사용 중</span></td><td>검증된 집계 데이터 기반</td></tr></tbody></table></section>}
  </div>;
}
