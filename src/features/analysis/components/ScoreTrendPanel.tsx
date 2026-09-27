import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalysisViewModel } from '../analysis-view-model';

function ScoreTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { label?: string; value?: number; respondentCount?: number } }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point || point.value === undefined) return null;
  return <div className="chart-tooltip"><strong>{point.label}</strong><b>{point.value.toFixed(2)}</b><span>응답 {point.respondentCount?.toLocaleString() ?? 0}명 · 2022년</span></div>;
}

export function ScoreTrendPanel({ viewModel, subjectLabel, filtered }: { viewModel: AnalysisViewModel; subjectLabel: string; filtered: boolean }) {
  const rows = [
    ...(viewModel.subjectScore.value === null ? [] : [{ id: 'subject', label: subjectLabel || '분석 기업', value: viewModel.subjectScore.value, respondentCount: viewModel.respondentCount, isSubject: true }]),
    ...viewModel.comparisons.filter((point) => point.value !== null).map((point) => ({
      id: point.id,
      label: point.label,
      value: point.value as number,
      respondentCount: point.respondentCount,
      isSubject: false,
    })),
  ];

  return (
    <section className="analysis-panel score-panel" aria-labelledby="score-panel-title">
      <div className="analysis-panel-heading"><div><h2 id="score-panel-title">NCSI 점수 비교</h2><p>{filtered ? '필터 응답자 집계' : '2022년 응답 전체 집계'}</p></div>
        {viewModel.scoreDelta !== null && <div className={`score-delta${viewModel.scoreDelta >= 0 ? ' is-positive' : ' is-negative'}`}><span>{viewModel.scoreDelta >= 0 ? '▲' : '▼'}</span> 비교 평균 대비 {Math.abs(viewModel.scoreDelta).toFixed(2)}점</div>}
      </div>
      {rows.length === 0 ? <div className="analysis-empty">{viewModel.emptyMessage ?? '해당 조건의 데이터 없음'}</div> : <div className="score-chart" role="img" aria-label="분석 기업과 비교 기업 NCSI 점수 막대 차트">
        <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 58)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 18, bottom: 0, left: 6 }} barCategoryGap={16}>
            <CartesianGrid stroke="#edf0f1" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: '#78838a', fontSize: 10 }} />
            <YAxis type="category" dataKey="label" width={116} tickLine={false} axisLine={false} tick={{ fill: '#49545b', fontSize: 11 }} />
            <Tooltip content={<ScoreTooltip />} cursor={{ fill: '#f6f7f8' }} />
            <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={24} fill="#84939a" fillOpacity={0.88} activeBar={{ fill: '#c65c38' }}>
              {rows.map((row) => <Cell key={row.id} fill={row.isSubject ? '#b84c2b' : '#84939a'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>}
      <p className="chart-caption">점수는 실제 원천 NCSI 합계를 응답 수로 나눈 값입니다. 비교 데이터가 없으면 차트에 포함하지 않습니다.</p>
    </section>
  );
}
