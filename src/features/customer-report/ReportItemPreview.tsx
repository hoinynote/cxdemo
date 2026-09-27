import type { AiAnswer } from '../../domain/ai';
import type { MetricValue, SeriesPoint } from '../../domain/analytics';
import type { CustomerReportDraft, CustomerReportItem } from '../../domain/reports';
import { describeReportFilters } from './report-item';

function isAiAnswer(value: CustomerReportItem['payload']): value is AiAnswer {
  return !Array.isArray(value) && 'headline' in value;
}

function isMetricValue(value: CustomerReportItem['payload']): value is MetricValue {
  return !Array.isArray(value) && !('headline' in value);
}

function itemPoints(item: CustomerReportItem): SeriesPoint[] {
  if (Array.isArray(item.payload)) return item.payload;
  if (isAiAnswer(item.payload)) return item.payload.visualization.data;
  const metric = item.payload;
  return [{ id: item.id, label: item.title, value: metric.value, respondentCount: metric.evidence?.respondentCount ?? 0, evidence: metric.evidence }];
}

function sourceYear(item: CustomerReportItem, report: CustomerReportDraft): number {
  return item.evidence[0]?.year ?? (isAiAnswer(item.payload) ? Number(item.payload.sourcePeriod) : report.filters.year);
}

export function ReportItemPreview({ report, item, index }: { report: CustomerReportDraft; item: CustomerReportItem; index: number }) {
  const points = itemPoints(item).filter((point) => point.value !== null);
  const answer = isAiAnswer(item.payload) ? item.payload : null;
  const metric = isMetricValue(item.payload) ? item.payload : null;
  const max = Math.max(1, ...points.map((point) => point.value ?? 0));
  return (
    <article className="report-page" data-report-page>
      <div className="report-page-kicker">KPC CX · {report.scopeLabel}</div>
      <div className="report-page-number">{String(index + 1).padStart(2, '0')}</div>
      <div className="report-page-content">
        <p className="report-item-type">{item.type === 'ai-insight' ? 'AI 분석 결과' : item.type === 'chart' ? '분석 차트' : '핵심 지표'}</p>
        <h2>{item.title}</h2>
        {answer && <><h3>{answer.headline}</h3><p className="report-answer-text">{answer.text}</p></>}
        {metric && <div className="report-metric-value">{metric.value === null ? '데이터 없음' : `${metric.value.toFixed(2)}점`}</div>}
        {points.length > 0 && <div className="report-chart" aria-label={`${item.title} 수치`}>
          {points.map((point) => <div className="report-chart-row" key={point.id}>
            <div className="report-chart-label"><span>{point.label}</span><strong>{point.value!.toFixed(2)}점</strong></div>
            <div className="report-chart-track"><span style={{ width: `${Math.max(2, ((point.value ?? 0) / max) * 100)}%` }} /></div>
            <small>응답 {point.respondentCount.toLocaleString()}명</small>
          </div>)}
        </div>}
        {!answer && metric?.value === null && <p className="report-answer-text">{metric.unavailableReason ?? '해당 조건의 데이터가 없습니다.'}</p>}
        {item.annotation && <p className="report-annotation">{item.annotation}</p>}
      </div>
      <footer className="report-source-note">출처: {sourceYear(item, report)}년 NCSI 원천 응답 · {describeReportFilters(item.evidence[0]?.filters ?? report.filters.dimensions)} · 응답 수는 항목별 수치에 표시</footer>
    </article>
  );
}

export function ReportDocument({ report }: { report: CustomerReportDraft }) {
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(report.createdAt));
  return <div className="report-document" data-report-document>
    <section className="report-page report-cover" data-report-page>
      <div className="report-cover-brand">KPC <span>CX</span></div>
      <div className="report-cover-main"><p>고객경험 분석 리포트</p><h1>{report.title}</h1><span>{report.scopeLabel} · {report.filters.year}년 분석</span></div>
      <div className="report-cover-footer"><span>작성일 {date}</span><span>한국생산성본부 KPC</span></div>
    </section>
    {report.items.map((item, index) => <ReportItemPreview key={item.id} report={report} item={item} index={index} />)}
  </div>;
}
