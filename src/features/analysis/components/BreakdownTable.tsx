import type { EvidenceRef, MetricValue, SeriesPoint } from '../../../domain/analytics';

interface BreakdownRow {
  id: string;
  label: string;
  metric: MetricValue | SeriesPoint;
  evidence: EvidenceRef | null;
}

export function BreakdownTable({ subjectLabel, subject, comparisons, consultant }: {
  subjectLabel: string;
  subject: MetricValue;
  comparisons: SeriesPoint[];
  consultant: boolean;
}) {
  const rows: BreakdownRow[] = [
    { id: 'subject', label: subjectLabel || '분석 기업', metric: subject, evidence: subject.evidence },
    ...comparisons.map((point) => ({ id: point.id, label: point.label, metric: point, evidence: point.evidence })),
  ];

  return <section className="analysis-panel breakdown-panel" aria-labelledby="breakdown-title">
    <div className="analysis-panel-heading"><div><h2 id="breakdown-title">데이터 요약 및 출처</h2><p>점수의 기준과 표본을 확인할 수 있습니다.</p></div></div>
    <div className="table-scroll"><table className="breakdown-table"><thead><tr><th scope="col">기업</th><th scope="col">NCSI</th><th scope="col">응답 수</th><th scope="col">기준 연도</th>{consultant && <th scope="col">산출 근거</th>}</tr></thead>
      <tbody>{rows.map(({ id, label, metric, evidence }) => {
        const value = metric.value;
        const respondentCount = 'respondentCount' in metric ? metric.respondentCount : evidence?.respondentCount ?? null;
        return <tr key={id}><th scope="row">{label}</th><td>{value === null ? <span className="unavailable-label">해당 조건의 데이터 없음</span> : value.toFixed(2)}</td><td>{respondentCount === null || value === null ? '—' : respondentCount.toLocaleString()}</td><td>{evidence ? evidence.year : '2022'}</td>{consultant && <td>{evidence ? <details className="evidence-details"><summary>출처 확인</summary><div><span>데이터셋: {evidence.datasetId}</span><span>필드: {evidence.fieldIds.join(', ')}</span><span>산식: {evidence.calculationId}</span><span>SHA-256: {evidence.sourceHash}</span></div></details> : '—'}</td>}</tr>;
      })}</tbody>
    </table></div>
  </section>;
}
