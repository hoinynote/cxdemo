import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useSession } from '../../../auth/SessionProvider';
import { demoDataset } from '../../../data/demo-dataset';
import type { ProjectSummary, ReferenceMaterial } from '../../../domain/projects';
import { DataUploadPanel } from '../components/DataUploadPanel';
import { ReferenceMaterialEditor } from '../components/ReferenceMaterialEditor';
import { useAnalysisContext } from '../../../state/AnalysisContext';
import { getProjectDataset, getProjectReferences, getProjectSummary, saveProjectReferences } from '../../../services/project-data-store';

export function ProjectWorkspacePage() {
  const { projectId = '' } = useParams();
  const { user } = useSession();
  const { setActiveProject } = useAnalysisContext();
  const assigned = user?.role === 'consultant' && user.projectIds.includes(projectId);
  const storedProject = assigned ? getProjectSummary(projectId) : undefined;
  const [project, setProject] = useState<ProjectSummary | undefined>(storedProject);
  const [references, setReferences] = useState<ReferenceMaterial[]>(() => assigned ? getProjectReferences(projectId) : []);
  const dataset = useMemo(() => assigned ? getProjectDataset(projectId) : demoDataset, [assigned, projectId, project?.updatedAt]);

  useEffect(() => {
    if (assigned) setActiveProject(projectId);
  }, [assigned, projectId, setActiveProject]);

  useEffect(() => {
    if (assigned) setProject(getProjectSummary(projectId));
  }, [assigned, projectId]);

  useEffect(() => {
    setReferences(assigned ? getProjectReferences(projectId) : []);
  }, [assigned, projectId]);

  if (!assigned || !storedProject || !project) return <Navigate to="/workspace/consulting/projects" replace />;
  const companyById = new Map(dataset.companies.map((company) => [company.id, company.label]));

  function changeReferences(next: ReferenceMaterial[]) {
    saveProjectReferences(projectId, next);
    setReferences(next);
  }

  return <div className="consultant-page project-workspace-page">
    <nav className="consultant-breadcrumb" aria-label="현재 위치"><Link to="/workspace/consulting/projects">컨설팅 프로젝트</Link><span aria-hidden="true">/</span><span>{project.name}</span></nav>
    <header className="consultant-page-heading project-heading"><div><p className="consultant-eyebrow">PROJECT WORKSPACE · {project.year}</p><h1>{project.name}</h1><p>프로젝트 범위와 데이터 준비 상태를 확인하고 참고자료를 관리합니다.</p></div><div className="project-heading-actions"><span className={`project-status is-${project.dataStatus}`}>{project.dataStatus === 'ready' ? '데이터 준비 완료' : project.dataStatus === 'partial' ? '일부 분석 제한' : project.dataStatus === 'blocked' ? 'NCSI 확인 필요' : '데이터 업로드 필요'}</span><Link to={`/workspace/consulting/projects/${project.id}/report`}>NCSI 진단보고서</Link></div></header>
    <section className="project-scope-panel"><div><span>진단 대상</span><strong>{companyById.get(project.subjectCompanyId) ?? '대상 데이터 없음'}</strong></div><div><span>비교 기업</span><strong>{project.comparisonCompanyIds.map((id) => companyById.get(id) ?? id).join(', ') || '비교 대상 없음'}</strong></div><div><span>데이터 원천</span><strong>{dataset.sourceFile}</strong></div><div><span>응답 수</span><strong>{dataset.sourceRowCount.toLocaleString()}명</strong></div></section>
    <p className="project-scope-readonly">대상·비교 기업과 담당자는 읽기 전용입니다. 새 검증이 성공하기 전까지 제공된 원천 집계 데이터가 유지됩니다.</p>
    {project && <DataUploadPanel project={project} onUpdated={setProject} />}
    <ReferenceMaterialEditor projectId={projectId} reviewer={user?.name ?? '컨설턴트'} materials={references} onChange={changeReferences} />
  </div>;
}
