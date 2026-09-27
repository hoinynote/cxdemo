import { useState } from 'react';
import { AdminDemoStore } from '../../../data/admin-demo-store';
import { demoDataset } from '../../../data/demo-dataset';
import { ProjectSetupForm } from '../components/ProjectSetupForm';
import '../admin.css';

export function ProjectManagementPage() {
  const [revision, refresh] = useState(0); const projects = AdminDemoStore.listProjects(); const accounts = AdminDemoStore.listAccounts();
  return <div className="admin-page"><p className="admin-eyebrow">PROJECTS</p><h1>프로젝트 관리</h1><p className="admin-intro">대상 기업과 비교 기업은 프로젝트 생성 후 분석 범위로 고정됩니다.</p><ProjectSetupForm onCreated={() => refresh((value) => value + 1)} /><section className="admin-table-panel"><h2>등록 프로젝트</h2><table><thead><tr><th>프로젝트</th><th>대상 / 비교 기업</th><th>담당 컨설턴트</th><th>데이터</th></tr></thead><tbody>{projects.map((project) => <tr key={`${revision}-${project.id}`}><td>{project.name}<small><br />{project.year} · {project.id}</small></td><td>{companyLabel(project.subjectCompanyId)} / {project.comparisonCompanyIds.map(companyLabel).join(', ')}</td><td>{accounts.find((account) => account.id === project.consultantUserId)?.name ?? project.consultantUserId}</td><td>{project.dataStatus}</td></tr>)}</tbody></table></section><p className="admin-muted">사용 데이터: {demoDataset.id} · {demoDataset.sourceFile}</p></div>;
}
function companyLabel(id: string) { return demoDataset.companies.find((item) => item.id === id)?.label ?? id; }
