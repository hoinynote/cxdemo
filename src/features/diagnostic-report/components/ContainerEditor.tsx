import type { RenderedContainer, ReviewIssue } from '../../../domain/diagnostic-report';
import type { MetricValue, SeriesPoint } from '../../../domain/analytics';
import { ContainerScopeBadge } from '../template/ContainerScopeBadge';
import { EvidenceDrawer } from './EvidenceDrawer';

export function ContainerEditor({ container, issues, readOnly = false, onTextChange, onPointChange }: {
  container: RenderedContainer;
  issues: ReviewIssue[];
  readOnly?: boolean;
  onTextChange(containerId: string, text: string): void;
  onPointChange(containerId: string, point: string, checked: boolean): void;
}) {
  const points = Array.isArray(container.value) ? container.value as SeriesPoint[] : null;
  const metric = isMetric(container.value) ? container.value : null;
  const narrative = typeof container.value === 'string' ? container.value : '';
  return <article className={`diagnostic-container is-${container.reviewState}`} id={`container-${container.containerId}`}>
    <header className="diagnostic-container__header">
      <div><small>p.{String(container.pageNumber).padStart(2, '0')} · {container.sourceContainerId}</small><h3>{container.title}</h3></div>
      <span className={`diagnostic-state is-${container.reviewState}`}>{stateLabel(container.reviewState)}</span>
    </header>
    <div className="diagnostic-container__scopes">{container.scope.map(scope => <ContainerScopeBadge key={scope} scope={scope} />)}</div>
    {points ? <div className="diagnostic-values-wrap"><table className="diagnostic-values"><thead><tr><th>대상</th><th>값</th><th>응답 수</th><th>근거</th></tr></thead><tbody>
      {points.map(point => <tr key={point.id}><th scope="row">{point.label}</th><td>{point.value === null ? '데이터 없음' : formatValue(point.value)}</td><td>{point.respondentCount.toLocaleString()}</td><td>{point.evidence ? point.evidence.calculationId : '미연결'}</td></tr>)}
    </tbody></table></div> : metric ? <p className="diagnostic-numeric-value">{metric.value === null ? metric.unavailableReason ?? '데이터 없음' : formatValue(metric.value)}</p> : container.editable && !readOnly
      ? <label className="diagnostic-narrative"><span>검토 문안 <small>{narrative.length}/{container.maxCharacters ?? '제한 없음'}</small></span>
        <textarea value={narrative} maxLength={container.maxCharacters ?? undefined} rows={4} onChange={event => onTextChange(container.containerId, event.target.value)} />
      </label>
      : <p className="diagnostic-static-copy">{narrative || '연결된 기준정보가 없습니다.'}</p>}
    {container.editable && !readOnly && container.requiredPoints.length > 0 && <fieldset className="diagnostic-review-points">
      <legend>검토 항목</legend>
      {container.requiredPoints.map(point => <label key={point}><input type="checkbox" checked={container.checkedPoints.includes(point)} onChange={event => onPointChange(container.containerId, point, event.target.checked)} />{point}</label>)}
    </fieldset>}
    {container.exampleLabel && <p className="diagnostic-example-note">{container.exampleLabel}</p>}
    {issues.length > 0 && <ul className="diagnostic-issues">{issues.map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul>}
    <EvidenceDrawer evidence={container.evidence} />
  </article>;
}

function isMetric(value: RenderedContainer['value']): value is MetricValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'unit' in value;
}

function formatValue(value: number): string { return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 }); }
function stateLabel(state: RenderedContainer['reviewState']): string { return state === 'ready' ? '근거 연결' : state === 'overflow' ? '분량 초과' : '확인 필요'; }
