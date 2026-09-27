import { useMemo } from 'react';
import { demoFeedbackStore } from '../../../data/demo-feedback-store';
import { demoUsageStore } from '../../../data/demo-usage-store';
import { AdminDemoStore } from '../../../data/admin-demo-store';
import { AiFeedbackTable } from '../components/AiFeedbackTable';
import '../admin.css';

export function AiQualityPage() {
  const usage = demoUsageStore.list(); const feedback = demoFeedbackStore.list(); const projects = AdminDemoStore.listProjects();
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    usage.forEach((event) => { const key = `${event.role}:${event.projectId}`; map.set(key, (map.get(key) ?? 0) + 1); });
    return [...map.entries()];
  }, [usage]);
  return <div className="admin-page"><p className="admin-eyebrow">AI SERVICE QUALITY</p><h1>AI 사용 및 품질</h1><p className="admin-intro">이 브라우저에 저장된 사용 집계와 답변 평가를 확인합니다. 질문 본문이나 모델 설정은 표시하지 않습니다.</p>
    <div className="admin-summary"><section><span>자연어 질의</span><strong>{usage.length}</strong><small>저장된 사용 이벤트</small></section><section><span>도움됨</span><strong>{feedback.filter((item) => item.value === 'helpful').length}</strong><small>사용자 평가</small></section><section><span>개선 필요</span><strong>{feedback.filter((item) => item.value === 'not-helpful').length}</strong><small>사용자 평가</small></section></div>
    <section className="admin-table-panel"><h2>역할·프로젝트별 사용</h2><table><thead><tr><th>역할</th><th>프로젝트</th><th>질의 수</th></tr></thead><tbody>{grouped.map(([key, count]) => { const [role, projectId] = key.split(':'); return <tr key={key}><td>{role === 'company' ? '기업 고객' : '컨설턴트'}</td><td>{projects.find((item) => item.id === projectId)?.name ?? projectId}</td><td>{count}</td></tr>; })}{!grouped.length && <tr><td colSpan={3}>아직 집계된 질의가 없습니다.</td></tr>}</tbody></table></section>
    <section className="admin-table-panel"><h2>답변 평가</h2><AiFeedbackTable feedback={feedback} projects={projects} /></section></div>;
}
