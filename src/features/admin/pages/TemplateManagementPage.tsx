import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DiagnosticTemplate } from '../../../domain/diagnostic-template';
import { TemplateDemoStore, validateDiagnosticTemplate } from '../../../data/template-demo-store';
import { TemplateVersionPanel } from '../components/TemplateVersionPanel';
import '../admin.css';

export function TemplateManagementPage() {
  const inputRef = useRef<HTMLInputElement>(null); const [, refresh] = useState(0); const [message, setMessage] = useState('');
  const versions = TemplateDemoStore.list(); const active = versions.find((item) => item.active);
  async function load(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const template = JSON.parse(await file.text()) as DiagnosticTemplate;
      validateDiagnosticTemplate(template); TemplateDemoStore.register(template);
      setMessage(`${template.version} 버전을 등록하고 향후 생성용 템플릿으로 지정했습니다.`); refresh((n) => n + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : '템플릿 파일을 읽을 수 없습니다.'); }
    finally { event.target.value = ''; }
  }
  return <div className="admin-page"><p className="admin-eyebrow">REPORT TEMPLATE</p><h1>보고서 템플릿</h1><p className="admin-intro">등록 버전은 불변으로 보관되며, 새 버전은 이후 생성되는 보고서에만 적용됩니다.</p><div className="admin-table-panel"><div className="admin-inline"><span>향후 생성 적용 버전</span><strong>{active?.template.version ?? '없음'}</strong><button type="button" onClick={() => inputRef.current?.click()}>JSON 템플릿 버전 등록</button><input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={load} /></div>{message && <p className="admin-feedback" role="status">{message}</p>}<TemplateVersionPanel versions={versions} /><small className="admin-muted">등록 규칙: 104페이지, 페이지 순서, 고유 컨테이너 ID, 데이터·콘텐츠 바인딩 검증</small></div></div>;
}
