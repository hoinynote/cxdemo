import { Link } from 'react-router-dom';
import { useSession } from '../../../auth/SessionProvider';
import { demoDataset } from '../../../data/demo-dataset';
import { listProjectSummaries } from '../../../services/project-data-store';

const statusLabel: Record<string, string> = { ready: '데이터 준비 완료', partial: '일부 분석 제한', blocked: 'NCSI 데이터 확인 필요', 'not-uploaded': '데이터 업로드 필요' };
const reportLabel = { 'not-started': '미착수', draft: '초안', 'in-review': '검토 중', finalized: '확정' } as const;

export function ConsultantQueuePage() {
  const { user } = useSession();
  const projects = listProjectSummaries(user?.role === 'consultant' ? user.projectIds : []);
  const companyLabel = (companyId: string) => demoDataset.companies.find((company) => company.id === companyId)?.label ?? '기업 데이터 없음';

  return <div className="consultant-page consultant-queue-page">
    <header className="consultant-page-heading"><div><p className="consultant-eyebrow">CONSULTANT WORKSPACE</p><h1>컨설팅 프로젝트</h1><p>배정된 프로젝트의 데이터 준비와 진단 업무를 확인합니다.</p></div><span>{projects.length}개 프로젝트</span></header>
    {projects.length === 0 ? <section className="consultant-empty">현재 계정에 배정된 프로젝트가 없습니다.</section> : <div className="project-table-wrap"><table className="project-queue-table"><thead><tr><th scope="col">프로젝트</th><th scope="col">대상 기업</th><th scope="col">비교 기업</th><th scope="col">연도</th><th scope="col">데이터 상태</th><th scope="col">보고서</th><th scope="col"><span className="sr-only">상세</span></th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}>
      <th scope="row"><Link to={`/workspace/consulting/projects/${project.id}`}>{project.name}</Link><small>업데이트 {new Date(project.updatedAt).toLocaleDateString('ko-KR')}</small></th>
      <td>{companyLabel(project.subjectCompanyId)}</td>
      <td><span className="comparison-firms">{project.comparisonCompanyIds.map(companyLabel).join(', ') || '없음'}</span></td>
      <td>{project.year}</td>
      <td><span className={`project-status is-${project.dataStatus}`}>{statusLabel[project.dataStatus] ?? project.dataStatus}</span></td>
      <td>{reportLabel[project.reportStatus]}</td>
      <td><Link className="project-open-link" to={`/workspace/consulting/projects/${project.id}`}>열기</Link></td>
    </tr>)}</tbody></table></div>}
    <p className="consultant-scope-note">프로젝트 생성, 대상·비교 기업, 담당자 설정은 시스템 관리자 영역에서 관리합니다.</p>
  </div>;
}
