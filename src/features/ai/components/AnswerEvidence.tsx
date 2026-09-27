import type { AiAnswer } from '../../../domain/ai';

export function AnswerEvidence({ answer, role }: { answer: AiAnswer; role: 'company' | 'consultant' }) {
  const respondentCount = answer.result.respondentCount;
  return (
    <section className="ai-answer-source" aria-label="분석 근거">
      <p>원천 기간 <strong>{answer.sourcePeriod}년</strong><span>응답 {respondentCount.toLocaleString()}명</span></p>
      {role === 'consultant' && answer.evidence.length > 0 && (
        <details>
          <summary>근거 및 계산 정보 {answer.evidence.length}건</summary>
          <ul>{answer.evidence.map((item, index) => (
            <li key={`${item.datasetId}-${item.companyId}-${item.calculationId}-${index}`}>
              <strong>{item.calculationId}</strong>
              <span>데이터셋 {item.datasetId} · 회사 {item.companyId} · {item.year}년 · n={item.respondentCount ?? 0}</span>
              <code>{item.fieldIds.join(', ')}</code>
            </li>
          ))}</ul>
        </details>
      )}
      {answer.referenceIds.length > 0 && <p className="ai-reference-line">검토 완료 참고자료 {answer.referenceIds.length}건을 반영했습니다.</p>}
    </section>
  );
}
