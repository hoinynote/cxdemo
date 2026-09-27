import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '../../../domain/analytics';
import type { AnalysisResult } from '../../../domain/analytics';
import type { AnalysisFilters } from '../../../domain/filters';
import { AddToReportButton } from './AddToReportButton';

function FactorTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: SeriesPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.value === null) return null;
  return <div className="chart-tooltip"><strong>{point.label}</strong><b>{point.value.toFixed(2)}</b><span>유효 응답 {point.respondentCount.toLocaleString()}명 · 2022년</span></div>;
}

export function FactorRankingChart({ factors, filters, result, screenId }: { factors: SeriesPoint[]; filters: AnalysisFilters; result: AnalysisResult; screenId: string }) {
  const [showAll, setShowAll] = useState(false);
  const available = factors.filter((factor) => factor.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const rows = showAll ? available : available.slice(0, 10);

  return <section className="analysis-panel factor-chart-panel" aria-labelledby="factor-chart-title">
    <div className="analysis-panel-heading"><div><h2 id="factor-chart-title">CS 품질요인 점수</h2><p>49개 품질요인 · 유효 응답 수 기준</p></div><div className="report-chart-actions"><AddToReportButton item={{ type: 'chart', title: 'CS 품질요인 점수', annotation: showAll ? '전체 품질요인' : '상위 10개 품질요인', payload: rows, evidence: rows.map((point) => point.evidence).filter((item) => item !== null) }} filters={filters} result={result} screenId={screenId}>차트 담기</AddToReportButton>
      {available.length > 10 && <button className="subtle-button" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? '상위 10개만' : `전체 ${available.length}개 보기`}</button>}
    </div></div>
    {rows.length === 0 ? <div className="analysis-empty">해당 조건의 데이터 없음</div> : <div className={`factor-chart${showAll ? ' is-expanded' : ''}`}>
      <ResponsiveContainer width="100%" height={Math.max(300, rows.length * 31)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 18, bottom: 2, left: 0 }} barCategoryGap={7}>
          <CartesianGrid stroke="#edf0f1" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#78838a', fontSize: 10 }} />
          <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={{ fill: '#49545b', fontSize: 10 }} />
          <Tooltip content={<FactorTooltip />} cursor={{ fill: '#f6f7f8' }} />
          <Bar dataKey="value" fill="#739487" radius={[0, 3, 3, 0]} maxBarSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </section>;
}
