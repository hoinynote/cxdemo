import type { SeriesPoint } from '../../../domain/analytics';
import type { DiagnosticReport } from '../../../domain/diagnostic-report';
import type { DiagnosticPage } from '../../../domain/diagnostic-template';
import { ContainerScopeBadge } from '../template/ContainerScopeBadge';
import { ReportChart } from './ReportChart';
import { ReportTable } from './ReportTable';

export function DiagnosticPageCanvas({ page, content, audienceRole = 'company', watermark = false, period = 2022 }: {
  page: DiagnosticPage;
  content: DiagnosticReport['pages'][number];
  audienceRole?: 'company' | 'consultant';
  watermark?: boolean;
  period?: number;
}) {
  const renderedById = new Map(content.containers.map(item => [item.containerId, item]));
  const internal = audienceRole === 'consultant';
  const section = sectionLabel(page.sectionId);
  return <article className="diagnostic-page-canvas" data-diagnostic-page={page.number}>
    <header className="diagnostic-page-canvas__header"><span className="diagnostic-page-canvas__brand">KPC <i>CX</i></span><span>{section} · NCSI · {period}년</span></header>
    <h1 className="diagnostic-page-canvas__title">{page.title}</h1>
    {page.containers.map(config => {
      const item = renderedById.get(config.id);
      const box = config.pageArea;
      const points = item && Array.isArray(item.value) ? item.value as SeriesPoint[] : null;
      const tableLike = ['표', 'table', 'matrix'].includes(config.contentFormat) || !points;
      const firstEvidence = item?.evidence[0];
      const evidenceLabel = firstEvidence
        ? 'calculationId' in firstEvidence ? firstEvidence.calculationId : firstEvidence.title
        : '프로젝트 설정';
      return <section key={config.id} className={`diagnostic-page-container is-${item?.reviewState ?? 'missing'}`} style={{ left: `${box.x / 10}%`, top: `${box.y / 10}%`, width: `${box.width / 10}%`, height: `${box.height / 10}%` }}>
        <div className="diagnostic-page-container__heading"><h2>{config.title}</h2><div>{config.scopes.map(scope => <ContainerScopeBadge key={scope} scope={scope} />)}</div></div>
        {!item || item.reviewState === 'missing' ? <p className="diagnostic-report-missing">{item?.exampleLabel ?? (item && typeof item.value === 'string' && item.value ? item.value : '이 영역에 사용할 수 있는 확정 데이터가 없습니다.')}</p>
          : points && !tableLike ? <ReportChart points={points} />
          : <ReportTable value={item.value} internal={internal} />}
        {item?.exampleLabel && <p className="diagnostic-report-example">{item.exampleLabel}</p>}
        {internal && item?.evidence.length ? <small className="diagnostic-internal-evidence">근거 {item.evidence.length}건 · {evidenceLabel}</small> : null}
      </section>;
    })}
    <footer className="diagnostic-page-canvas__footer"><span>{content.containers.flatMap(item => item.scope).filter((scope, index, all) => all.indexOf(scope) === index).map(scopeLabel).join(' · ')}</span><span>{period}년 · {content.pageNumber} / 104</span></footer>
    {watermark && <div className="diagnostic-page-canvas__watermark" aria-hidden="true">검토용</div>}
  </article>;
}

function sectionLabel(sectionId: string): string {
  const labels: Record<string, string> = {
    cover: '표지', contents: '목차', 'part-1': '제1부', 'ncsi-introduction': 'NCSI 소개', 'part-2': '제2부',
    'diagnostic-analysis': '진단 분석', 'part-3': '제3부', 'improvement-diagnosis': '개선 진단',
    'improvement-strategy': '개선 전략', 'conclusion-divider': '결언', conclusion: '결언',
    'appendix-divider': '별첨', 'kpc-introduction': 'KPC 소개', 'methodology-divider': '측정 방법론', methodology: '측정 방법론', closing: '마침',
  };
  return labels[sectionId] ?? sectionId.replaceAll('-', ' ');
}

function scopeLabel(scope: string): string {
  const labels: Record<string, string> = { 'customer-specific': '고객사 특화', 'industry-general': '업종 일반', 'sector-general': '산업 일반', 'overall-general': '전체 일반' };
  return labels[scope] ?? scope;
}
