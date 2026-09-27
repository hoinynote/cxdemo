import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../../../auth/SessionProvider';
import { demoDataset } from '../../../data/demo-dataset';
import type { DiagnosticReport } from '../../../domain/diagnostic-report';
import { createServiceContainer } from '../../../services/container';
import { getProjectDataset, getProjectReferences, getProjectSummary } from '../../../services/project-data-store';
import { DiagnosticReportViewer } from '../preview/DiagnosticReportViewer';
import './diagnostic-report.css';

export function ConsultantReportPreviewPage() {
  const { projectId = '' } = useParams();
  const { user } = useSession();
  const assigned = user?.role === 'consultant' && user.projectIds.includes(projectId);
  const project = assigned ? getProjectSummary(projectId) : undefined;
  const dataset = useMemo(() => projectId ? getProjectDataset(projectId) : demoDataset, [projectId]);
  const references = useMemo(() => projectId ? getProjectReferences(projectId) : [], [projectId]);
  const services = useMemo(() => createServiceContainer(dataset, references), [dataset, references]);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  useEffect(() => {
    setReport(projectId ? services.diagnostics.getDraft(projectId) ?? services.diagnostics.getLatestFinalized(projectId) : null);
  }, [projectId, services]);

  if (!assigned || !project) return <Navigate to="/workspace/diagnostics" replace />;
  return <div className="consultant-page">
    <nav className="consultant-breadcrumb" aria-label="현재 위치"><Link to="/workspace/diagnostics">진단보고서 검토</Link><span aria-hidden="true">/</span><Link to={`/workspace/diagnostics/${project.id}`}>{project.name}</Link><span aria-hidden="true">/</span><span>전체 미리보기</span></nav>
    <header className="consultant-page-heading"><div><p className="consultant-eyebrow">NCSI DIAGNOSTIC · {project.year}</p><h1>{project.name}</h1><p>원본 비율과 104페이지 순서를 유지한 보고서 미리보기입니다.</p></div><Link className="diagnostic-preview-back" to={`/workspace/diagnostics/${project.id}`}>검토 화면</Link></header>
    {report ? <DiagnosticReportViewer report={report} mode="review" /> : <div className="diagnostic-empty"><Link to={`/workspace/diagnostics/${project.id}`}>먼저 보고서 초안을 생성해 주세요.</Link></div>}
  </div>;
}
