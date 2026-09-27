import { useState } from 'react';
import { AdminDemoStore } from '../../../data/admin-demo-store';
import { demoDataset } from '../../../data/demo-dataset';
import '../admin.css';

export function DataStatusPage() {
  const [, refresh] = useState(0); const projects = AdminDemoStore.listProjects();
  return <div className="admin-page"><p className="admin-eyebrow">DATA READINESS</p><h1>데이터 관리</h1><p className="admin-intro">집계 데이터의 출처와 보고서 생성 가능 상태를 확인합니다. 원천 응답 행은 이 화면에서 열람하지 않습니다.</p><section className="admin-table-panel"><table><thead><tr><th>프로젝트</th><th>데이터셋 / 연도</th><th>출처와 해시</th><th>검증</th><th>보고서 생성</th><th>상태 조정</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td>{project.name}</td><td>{demoDataset.id} · {project.year}</td><td>{demoDataset.sourceFile}<br /><code>{demoDataset.sourceHash.slice(0, 16)}…</code></td><td>{project.dataStatus === 'ready' ? new Date(demoDataset.importedAt).toLocaleDateString('ko-KR') : '재확인 필요'}</td><td>{project.dataStatus === 'ready' ? '가능' : '보류'}</td><td><select aria-label={`${project.name} 데이터 상태`} value={project.dataStatus} onChange={(event) => { AdminDemoStore.updateDataStatus(project.id, event.target.value as typeof project.dataStatus); refresh((n) => n + 1); }}><option value="ready">준비 완료</option><option value="partial">부분 준비</option><option value="blocked">차단</option><option value="validating">검증 중</option><option value="not-uploaded">미등록</option></select></td></tr>)}</tbody></table></section></div>;
}
