import type { SeriesPoint } from '../../../domain/analytics';

export function ReportChart({ points }: { points: SeriesPoint[] }) {
  const max = Math.max(1, ...points.map(point => point.value ?? 0));
  if (!points.length) return <p className="diagnostic-report-empty-value">표시할 분석 값이 없습니다.</p>;
  return <div className="diagnostic-report-chart" role="img" aria-label="보고서 분석 차트">
    {points.map(point => <div className="diagnostic-report-chart__row" key={point.id}>
      <span title={point.label}>{point.label}</span>
      <div className="diagnostic-report-chart__track"><i style={{ width: `${point.value === null ? 0 : Math.max(1, point.value / max * 100)}%` }} /></div>
      <strong>{point.value === null ? '데이터 없음' : point.value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}</strong>
      <small>n={point.respondentCount.toLocaleString()}</small>
    </div>)}
  </div>;
}
