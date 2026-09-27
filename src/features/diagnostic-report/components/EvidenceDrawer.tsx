import type { DiagnosticEvidence } from '../../../domain/diagnostic-report';

export function EvidenceDrawer({ evidence }: { evidence: DiagnosticEvidence[] }) {
  return <details className="diagnostic-evidence">
    <summary>근거 {evidence.length}건</summary>
    {evidence.length === 0 ? <p>연결된 근거가 없습니다.</p> : <ul>
      {evidence.map((item, index) => 'kind' in item
        ? <li key={`${item.kind}-${index}`}>
            <strong>{item.title}</strong>
            <span>{item.kind === 'reference' ? `승인 참고자료 · ${item.sourceScope} · ${item.reviewedBy}` : `프로젝트 설정 · ${item.projectId}`}</span>
          </li>
        : <li key={`${item.datasetId}-${item.companyId}-${item.calculationId}-${index}`}>
            <strong>{item.calculationId}</strong>
            <span>회사 {item.companyId} · {item.year}년 · 응답 {item.respondentCount ?? 0}명</span>
            <code>데이터셋 {item.datasetId} · {item.fieldIds.join(', ')} · {item.sourceHash.slice(0, 12)}</code>
            {Object.keys(item.filters).length > 0 && <code>필터 {Object.entries(item.filters).map(([key, value]) => `${key}:${value}`).join(' · ')}</code>}
          </li>)}
    </ul>}
  </details>;
}
