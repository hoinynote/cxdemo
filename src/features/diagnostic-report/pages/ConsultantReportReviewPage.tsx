import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../../../auth/SessionProvider';
import { demoDataset } from '../../../data/demo-dataset';
import type { DiagnosticReport, ReviewIssue } from '../../../domain/diagnostic-report';
import { NCSI_2022_V1 } from '../../../report-templates/ncsi-2022-v1';
import { createServiceContainer } from '../../../services/container';
import { getProjectDataset, getProjectReferences, getProjectSummary, listProjectSummaries } from '../../../services/project-data-store';
import { ContainerEditor } from '../components/ContainerEditor';
import { TemplateOutline } from '../template/TemplateOutline';
import './diagnostic-report.css';

export function ConsultantReportReviewPage() {
  const { projectId = '' } = useParams();
  const { user } = useSession();
  const assignedProjects = useMemo(() => listProjectSummaries(user?.role === 'consultant' ? user.projectIds : []), [user]);
  const assigned = user?.role === 'consultant' && user.projectIds.includes(projectId);
  const project = assigned ? getProjectSummary(projectId) : undefined;
  const dataset = useMemo(() => projectId ? getProjectDataset(projectId) : demoDataset, [projectId]);
  const references = useMemo(() => projectId ? getProjectReferences(projectId) : [], [projectId]);
  const services = useMemo(() => createServiceContainer(dataset, references), [dataset, references]);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setReport(projectId ? services.diagnostics.getDraft(projectId) ?? services.diagnostics.getLatestFinalized(projectId) : null);
  }, [projectId, services]);

  if (!user || user.role !== 'consultant') return <Navigate to="/workspace" replace />;
  if (!projectId) return <div className="consultant-page diagnostic-project-list">
    <header className="consultant-page-heading"><div><p className="consultant-eyebrow">DIAGNOSTIC REPORTS</p><h1>진단보고서 검토</h1><p>배정된 프로젝트의 NCSI 보고서를 생성하고 검토합니다.</p></div></header>
    {assignedProjects.length ? <div className="diagnostic-project-links">{assignedProjects.map(item => <Link key={item.id} to={`/workspace/diagnostics/${item.id}`}>
      <span>{item.name}<small>대상 {item.subjectCompanyId} · {item.year}</small></span><strong>{reportStatusLabel(item.reportStatus)}</strong>
    </Link>)}</div> : <p className="consultant-empty">현재 계정에 배정된 프로젝트가 없습니다.</p>}
  </div>;
  if (!project || !user.projectIds.includes(projectId)) return <Navigate to="/workspace/diagnostics" replace />;
  const activeProject = project;
  const reviewerUser = user;

  const pages = report?.pages ?? [];
  const currentPage = NCSI_2022_V1.pages.find(page => page.number === activePage) ?? NCSI_2022_V1.pages[0]!;
  const renderedPage = pages.find(page => page.pageNumber === activePage);
  const allContainers = pages.flatMap(page => page.containers);
  const issues = report ? services.diagnostics.checkDraft(report) : [];
  const issueByContainer = groupIssues(issues);
  const pageStates = Object.fromEntries(pages.map(page => [page.pageNumber, summarizeState(page.containers.map(item => {
    const hasOverflow = issues.some(issue => issue.pageNumber === page.pageNumber && issue.code === 'overflow');
    const hasReviewIssue = issues.some(issue => issue.pageNumber === page.pageNumber);
    return hasOverflow ? 'overflow' : hasReviewIssue ? 'missing' : item.reviewState;
  }))]));
  const readyCount = allContainers.filter(item => item.reviewState === 'ready').length;
  const missingCount = allContainers.filter(item => item.reviewState === 'missing').length;
  const finalized = report?.status === 'finalized';

  async function generateReport() {
    setBusy(true); setMessage('');
    try {
      const generated = await services.diagnostics.generate({
        projectId: activeProject.id,
        datasetId: dataset.id,
        templateId: NCSI_2022_V1.id,
        templateVersion: NCSI_2022_V1.version,
        filters: { year: 2022, industryId: dataset.industryId, subjectCompanyId: activeProject.subjectCompanyId, comparisonCompanyIds: [...activeProject.comparisonCompanyIds], dimensions: {} },
      }, reviewerUser.name);
      setReport(generated); setActivePage(1); setMessage('104페이지 초안을 생성했습니다. 수치 근거와 서술 검토를 진행해 주세요.');
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  function updateText(containerId: string, text: string) {
    try { setReport(services.diagnostics.updateNarrative(report!.id, containerId, text)); setMessage('검토 문안을 저장했습니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }

  function updatePoint(containerId: string, point: string, checked: boolean) {
    try { setReport(services.diagnostics.setRequiredPoint(report!.id, containerId, point, checked)); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }

  function submitForReview() {
    try { setReport(services.diagnostics.submitForReview(report!.id)); setMessage('보고서를 검토 상태로 전환했습니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }

  function finalizeReport() {
    try { setReport(services.diagnostics.finalize(report!.id, reviewerUser.id)); setMessage('최종본을 확정했습니다. 기업 포털에는 이 버전만 제공됩니다.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }

  return <div className="consultant-page diagnostic-review-page">
    <nav className="consultant-breadcrumb" aria-label="현재 위치"><Link to="/workspace/diagnostics">진단보고서 검토</Link><span aria-hidden="true">/</span><span>{project.name}</span></nav>
    <header className="consultant-page-heading"><div><p className="consultant-eyebrow">NCSI DIAGNOSTIC · {project.year}</p><h1>{project.name}</h1><p>원천 수치는 잠금 상태로 유지되며, 서술 컨테이너만 검토·수정할 수 있습니다.</p></div>
      <div className="diagnostic-actions"><Link to={`/workspace/consulting/projects/${project.id}`}>프로젝트 자료</Link>
        {!report || finalized ? <button type="button" disabled={busy || project.dataStatus !== 'ready'} onClick={generateReport}>{busy ? '생성 중…' : finalized ? '수정 초안 생성' : '보고서 초안 생성'}</button> : <span className={`diagnostic-report-status is-${report.status}`}>{reportStatusLabel(report.status)}</span>}
      </div>
    </header>
    {report && <section className="diagnostic-snapshot" aria-label="생성 기준">
      <span>데이터셋 <strong>{report.snapshot.datasetId}</strong></span><span>버전 <strong>{report.snapshot.datasetVersion}</strong></span><span>원천 해시 <code>{report.snapshot.sourceHash.slice(0, 12)}</code></span><span>계산식 <strong>{report.snapshot.calculationVersion}</strong></span><span>템플릿 <strong>{report.snapshot.templateVersion}</strong></span><span>생성 {new Date(report.snapshot.generatedAt).toLocaleString('ko-KR')}</span>
    </section>}
    {report && <section className="diagnostic-progress" aria-label="보고서 상태">
      <span><strong>{readyCount}</strong> 근거 연결</span><span><strong>{missingCount}</strong> 확인 필요</span><span><strong>{issues.length}</strong> 검토 이슈</span>
      {report.status !== 'finalized' && <div><button type="button" className="diagnostic-secondary-action" onClick={submitForReview} disabled={report.status === 'in-review'}>검토 요청</button><button type="button" className="diagnostic-finalize-action" onClick={finalizeReport} disabled={issues.length > 0}>최종 확정</button></div>}
      {finalized && <strong className="diagnostic-finalized-note">최신 발행본 · {report.reviewerId}</strong>}
    </section>}
    {message && <p className="diagnostic-message" role="status">{message}</p>}
    {issues.length > 0 && report && <section className="diagnostic-issue-summary"><strong>확정 전 해결할 항목 {issues.length}건</strong><ul>{issues.slice(0, 6).map((item, index) => <li key={`${item.containerId}-${index}`}><button type="button" onClick={() => setActivePage(item.pageNumber)}>p.{item.pageNumber} · {item.message}</button></li>)}</ul>{issues.length > 6 && <small>나머지 {issues.length - 6}건은 페이지별 목록에서 확인할 수 있습니다.</small>}</section>}
    <div className="diagnostic-review-layout">
      <aside className="diagnostic-outline-panel"><TemplateOutline template={NCSI_2022_V1} activePage={activePage} pageStates={pageStates} onSelectPage={page => setActivePage(page.number)} /></aside>
      <main className="diagnostic-page-editor">
        <header><div><small>PAGE {String(currentPage.number).padStart(3, '0')} / 104 · {currentPage.sectionId}</small><h2>{currentPage.title}</h2></div><span>{renderedPage?.containers.length ?? currentPage.containers.length}개 컨테이너</span></header>
        {!report ? <div className="diagnostic-empty">보고서 초안을 생성하면 원천 근거와 검토 항목이 여기에 표시됩니다.</div>
          : renderedPage?.containers.map(container => <ContainerEditor key={container.containerId} container={container} issues={issueByContainer.get(container.containerId) ?? []} readOnly={finalized} onTextChange={updateText} onPointChange={updatePoint} />)}
      </main>
    </div>
  </div>;
}

function groupIssues(issues: ReviewIssue[]): Map<string, ReviewIssue[]> {
  const groups = new Map<string, ReviewIssue[]>();
  for (const issue of issues) groups.set(issue.containerId, [...(groups.get(issue.containerId) ?? []), issue]);
  return groups;
}

function summarizeState(states: Array<'ready' | 'missing' | 'overflow'>): 'ready' | 'missing' | 'overflow' {
  if (states.includes('overflow')) return 'overflow';
  return states.every(state => state === 'ready') ? 'ready' : 'missing';
}

function reportStatusLabel(status: string): string {
  return status === 'finalized' ? '최종 확정' : status === 'in-review' ? '검토 중' : status === 'draft' ? '초안' : '미착수';
}
