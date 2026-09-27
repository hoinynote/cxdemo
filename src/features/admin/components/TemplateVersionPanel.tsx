import type { DiagnosticTemplate } from '../../../domain/diagnostic-template';

export interface TemplateVersionEntry { template: DiagnosticTemplate; createdAt: string; active: boolean }
export function TemplateVersionPanel({ versions }: { versions: TemplateVersionEntry[] }) {
  return <table><thead><tr><th>템플릿 ID</th><th>버전</th><th>상태</th><th>페이지</th><th>등록일</th></tr></thead><tbody>{versions.map((entry) => <tr key={entry.template.version}><td>{entry.template.id}</td><td>{entry.template.version}</td><td>{entry.active ? '향후 생성 적용' : '기존 보고서용'}</td><td>{entry.template.pages.length}</td><td>{new Date(entry.createdAt).toLocaleDateString('ko-KR')}</td></tr>)}</tbody></table>;
}
