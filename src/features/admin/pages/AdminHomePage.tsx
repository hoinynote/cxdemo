import { useState } from 'react';
import { AdminDemoStore } from '../../../data/admin-demo-store';
import { demoDataset } from '../../../data/demo-dataset';
import { demoFeedbackStore } from '../../../data/demo-feedback-store';
import { demoUsageStore } from '../../../data/demo-usage-store';
import '../admin.css';

export function AdminHomePage() {
  const [, refresh] = useState(0);
  const accounts = AdminDemoStore.listAccounts(); const projects = AdminDemoStore.listProjects();
  function reset() { if (window.confirm('프로토타입의 관리자 변경사항과 AI 피드백·사용량을 초기화할까요?')) { AdminDemoStore.reset(); refresh((value) => value + 1); } }
  return <div className="admin-page"><p className="admin-eyebrow">CX OPERATIONS</p><h1>운영 현황</h1><p className="admin-intro">계정·프로젝트·원천 데이터 운영 상태를 확인합니다.</p>
    <div className="admin-summary"><section><span>활성 계정</span><strong>{accounts.filter((item) => item.status === 'active').length}</strong><small>전체 {accounts.length}개</small></section><section><span>운영 프로젝트</span><strong>{projects.length}</strong><small>담당자와 데이터 범위 기준</small></section><section><span>AI 사용 / 피드백</span><strong>{demoUsageStore.list().length} / {demoFeedbackStore.list().length}</strong><small>이 브라우저에 저장된 데모 기록</small></section></div>
    <section className="admin-table-panel"><h2>계정 및 프로젝트</h2><table><thead><tr><th>사용자</th><th>역할</th><th>기업 / 프로젝트</th><th>계정</th><th>데이터 상태</th></tr></thead><tbody>{accounts.map((account) => <tr key={account.id}><td>{account.name}</td><td>{roleLabel(account.role)}</td><td>{account.companyId ?? (account.assignedProjectIds.map((id) => projects.find((p) => p.id === id)?.name).filter(Boolean).join(', ') || '—')}</td><td>{account.status === 'active' ? '활성' : '중지'}</td><td>{account.assignedProjectIds.map((id) => projects.find((p) => p.id === id)?.dataStatus).filter(Boolean).join(', ') || '—'}</td></tr>)}</tbody></table></section>
    <section className="admin-table-panel"><h2>원천 데이터</h2><table><tbody><tr><th>데이터셋</th><td>{demoDataset.id} · {demoDataset.year}</td><th>원천 파일</th><td>{demoDataset.sourceFile}</td></tr><tr><th>원천 해시</th><td colSpan={3}><code>{demoDataset.sourceHash}</code></td></tr></tbody></table></section>
    <button className="admin-action admin-reset" type="button" onClick={reset}>데모 변경사항 초기화</button>
  </div>;
}
function roleLabel(role: string) { return role === 'company' ? '기업 고객' : role === 'consultant' ? '컨설턴트' : '시스템 관리자'; }
