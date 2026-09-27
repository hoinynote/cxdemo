import type { AnswerFeedback } from '../../../domain/ai';
import type { ProjectSummary } from '../../../domain/projects';

export function AiFeedbackTable({ feedback, projects }: { feedback: AnswerFeedback[]; projects: ProjectSummary[] }) {
  return <table><thead><tr><th>일시</th><th>역할</th><th>프로젝트</th><th>평가</th><th>의견</th></tr></thead><tbody>{feedback.slice().reverse().map((item, index) => <tr key={`${item.answerId}-${index}`}><td>{new Date(item.createdAt).toLocaleString('ko-KR')}</td><td>{item.role === 'company' ? '기업 고객' : '컨설턴트'}</td><td>{projects.find((project) => project.id === item.projectId)?.name ?? item.projectId}</td><td>{item.value === 'helpful' ? '도움됨' : '개선 필요'}</td><td>{item.comment || '—'}</td></tr>)}{!feedback.length && <tr><td colSpan={5}>아직 등록된 답변 평가가 없습니다.</td></tr>}</tbody></table>;
}
