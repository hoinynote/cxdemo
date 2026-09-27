import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '../../../domain/analytics';
import type { AnalysisResult } from '../../../domain/analytics';
import type { AnalysisFilters } from '../../../domain/filters';
import { AddToReportButton } from './AddToReportButton';

function SegmentTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: SeriesPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.value === null) return null;
  return <div className="chart-tooltip"><strong>{point.label}</strong><b>{point.value.toFixed(2)}</b><span>필터 응답자 집계 · n={point.respondentCount.toLocaleString()} · 2022년</span></div>;
}

export function SegmentScoreChart({ points, dimensionLabel, filters, result, screenId }: { points: SeriesPoint[]; dimensionLabel: string; filters: AnalysisFilters; result: AnalysisResult; screenId: string }) {
  const rows = points.filter((point) => point.value !== null);
  return <section className="analysis-panel segment-chart-panel" aria-labelledby="segment-chart-title">
    <div className="analysis-panel-heading"><div><h2 id="segment-chart-title">{dimensionLabel}별 NCSI</h2><p>동일 기업의 응답자 집계 비교</p></div><AddToReportButton item={{ type: 'chart', title: `${dimensionLabel}별 NCSI`, annotation: '필터 응답자 집계', payload: rows, evidence: rows.map((point) => point.evidence).filter((item) => item !== null) }} filters={filters} result={result} screenId={screenId}>차트 담기</AddToReportButton></div>
    {rows.length === 0 ? <div className="analysis-empty">해당 조건의 데이터 없음</div> : <div className="segment-chart" role="img" aria-label={`${dimensionLabel}별 NCSI 응답자 집계 차트`}>
      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 54)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }} barCategoryGap={14}>
          <CartesianGrid stroke="#edf0f1" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#78838a', fontSize: 10 }} />
          <YAxis type="category" dataKey="label" width={140} tickLine={false} axisLine={false} tick={{ fill: '#49545b', fontSize: 11 }} />
          <Tooltip content={<SegmentTooltip />} cursor={{ fill: '#f6f7f8' }} />
          <Bar dataKey="value" fill="#739487" radius={[0, 3, 3, 0]} maxBarSize={23} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </section>;
}
