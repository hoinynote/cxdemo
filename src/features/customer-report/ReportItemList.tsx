import type { CustomerReportItem } from '../../domain/reports';

export function ReportItemList({ items, setAnnotation, moveItem, removeItem }: {
  items: CustomerReportItem[];
  setAnnotation(itemId: string, annotation: string): void;
  moveItem(itemId: string, direction: -1 | 1): void;
  removeItem(itemId: string): void;
}) {
  if (items.length === 0) return <div className="report-empty"><strong>리포트에 담긴 내용이 없습니다.</strong><span>분석 화면에서 KPI, 차트 또는 AI 결과를 리포트에 담아주세요.</span></div>;
  return <ol className="report-item-list">{items.map((item, index) => <li key={item.id}>
    <div className="report-item-list-heading"><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.title}</strong><div>
      <button type="button" aria-label={`${item.title} 위로 이동`} disabled={index === 0} onClick={() => moveItem(item.id, -1)}>↑</button>
      <button type="button" aria-label={`${item.title} 아래로 이동`} disabled={index === items.length - 1} onClick={() => moveItem(item.id, 1)}>↓</button>
      <button type="button" aria-label={`${item.title} 제거`} onClick={() => removeItem(item.id)}>삭제</button>
    </div></div>
    <label><span>설명 메모 <small>{item.annotation.length}/240</small></span><textarea value={item.annotation} onChange={(event) => setAnnotation(item.id, event.target.value)} maxLength={240} rows={2} placeholder="보고서에 표시할 설명을 입력하세요." /></label>
  </li>)}</ol>;
}
