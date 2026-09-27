import { useMemo, useState } from 'react';
import { AnalysisPageFrame } from '../components/AnalysisPageFrame';
import { SegmentScoreChart } from '../components/SegmentScoreChart';
import { useAnalysisScreen } from '../analysis-context';
import type { DimensionKey } from '../../../data/schema';
import type { SeriesPoint } from '../../../domain/analytics';

const segmentOptions: Array<{ key: DimensionKey; label: string }> = [
  { key: 'gender', label: '성별' },
  { key: 'ageGroup', label: '연령대' },
  { key: 'nationality', label: '국적' },
  { key: 'branch', label: '지점' },
];

export function CustomerSegmentsPage() {
  const { filters, user, subjectCompany, analytics } = useAnalysisScreen('고객군별 수준 분석');
  const [segmentKey, setSegmentKey] = useState<DimensionKey>('gender');
  const segmentLabel = segmentOptions.find((option) => option.key === segmentKey)?.label ?? '고객군';
  const points = useMemo<SeriesPoint[]>(() => {
    const options = analytics.getFilterOptions().filter((option) => option.group === 'dimension' && option.dimensionKey === segmentKey);
    const baseDimensions = { ...filters.dimensions };
    delete baseDimensions[segmentKey];
    return options.map((option) => {
      const result = analytics.analyze({
        ...filters,
        dimensions: { ...baseDimensions, [segmentKey]: option.id },
      });
      const metric = result.subjectNCSI;
      return {
        id: option.id,
        label: option.label,
        value: metric.value,
        respondentCount: metric.evidence?.respondentCount ?? 0,
        evidence: metric.evidence,
        ...(metric.value === null ? { unavailableReason: metric.unavailableReason } : {}),
      };
    });
  }, [analytics, filters, segmentKey]);

  return <AnalysisPageFrame title="고객군별 수준 분석" screenId="factors-customer-segments">
    <section className="segment-control-row"><div><strong>{subjectCompany?.label ?? '분석 기업'}</strong><span>고객 특성별 점수와 표본을 비교합니다.</span></div><label className="analysis-filter-field"><span>분석 기준</span><select value={segmentKey} onChange={(event) => setSegmentKey(event.target.value as DimensionKey)}>{segmentOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label></section>
    <SegmentScoreChart points={points} dimensionLabel={segmentLabel} />
    <section className="analysis-panel segment-table-panel"><div className="analysis-panel-heading"><div><h2>{segmentLabel}별 집계</h2><p>필터 응답자 집계 · {user?.role === 'consultant' ? '출처 근거는 표의 n 값과 분석 필터에서 확인할 수 있습니다.' : '원천 응답을 기준으로 계산했습니다.'}</p></div></div>
      <div className="table-scroll"><table className="breakdown-table"><thead><tr><th scope="col">{segmentLabel}</th><th scope="col">NCSI</th><th scope="col">유효 응답 수</th><th scope="col">기준 연도</th></tr></thead><tbody>{points.map((point) => <tr key={point.id}><th scope="row">{point.label}</th><td>{point.value === null ? <span className="unavailable-label">해당 조건의 데이터 없음</span> : point.value.toFixed(2)}</td><td>{point.value === null ? '—' : point.respondentCount.toLocaleString()}</td><td>2022</td></tr>)}</tbody></table></div>
    </section>
  </AnalysisPageFrame>;
}
