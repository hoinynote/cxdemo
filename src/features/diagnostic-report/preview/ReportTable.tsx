import type { DiagnosticValue } from '../../../domain/diagnostic-report';
import type { MetricValue, SeriesPoint } from '../../../domain/analytics';

export function ReportTable({ value, internal = false }: { value: DiagnosticValue; internal?: boolean }) {
  if (Array.isArray(value)) {
    const rows = value as SeriesPoint[];
    return <div className="diagnostic-report-table-wrap"><table className="diagnostic-report-table"><thead><tr><th scope="col">구분</th><th scope="col">값</th><th scope="col">응답 수</th>{internal && <th scope="col">근거</th>}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th><td>{row.value === null ? '데이터 없음' : format(row.value)}</td><td>{row.respondentCount.toLocaleString()}</td>{internal && <td>{row.evidence?.calculationId ?? '미연결'}</td>}</tr>)}</tbody>
    </table></div>;
  }
  if (isMetric(value)) return <div className="diagnostic-report-metric">{value.value === null ? value.unavailableReason ?? '데이터 없음' : format(value.value)}</div>;
  return <p className="diagnostic-report-copy">{value || '콘텐츠가 아직 연결되지 않았습니다.'}</p>;
}

function isMetric(value: DiagnosticValue): value is MetricValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'unit' in value;
}
function format(value: number): string { return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 }); }
