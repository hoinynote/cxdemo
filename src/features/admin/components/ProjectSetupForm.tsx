import { useState, type FormEvent } from 'react';
import { demoDataset } from '../../../data/demo-dataset';
import { AdminDemoStore } from '../../../data/admin-demo-store';
import type { ProjectSetupInput } from '../../../domain/projects';

export function ProjectSetupForm({ onCreated }: { onCreated: () => void }) {
  const consultants = AdminDemoStore.listAccounts().filter((account) => account.role === 'consultant' && account.status === 'active');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState(demoDataset.companies[0]?.id ?? '');
  const [comparisons, setComparisons] = useState<string[]>(demoDataset.companies.slice(1, 2).map((item) => item.id));
  const [consultant, setConsultant] = useState(consultants[0]?.id ?? '');
  const [message, setMessage] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const id = `project-${Date.now()}`;
    const input: ProjectSetupInput = { id, name, subjectCompanyId: subject, comparisonCompanyIds: comparisons, consultantUserId: consultant, datasetId: demoDataset.id, year: 2022 };
    try { AdminDemoStore.createProject(input); setName(''); setMessage('2022 데이터셋에 연결된 프로젝트를 생성했습니다.'); onCreated(); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  }
  return <>
    <form className="admin-form" onSubmit={submit}>
      <label>프로젝트명<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="예: 2022 백화점 NCSI 진단" /></label>
      <label>대상 기업<select value={subject} onChange={(event) => { setSubject(event.target.value); setComparisons((items) => items.filter((id) => id !== event.target.value)); }}>{demoDataset.companies.map((company) => <option key={company.id} value={company.id}>{company.label}</option>)}</select></label>
      <div className="admin-checks" aria-label="비교 기업 선택">{demoDataset.companies.filter((company) => company.id !== subject).map((company) => <label key={company.id}><input type="checkbox" checked={comparisons.includes(company.id)} onChange={(event) => setComparisons((items) => event.target.checked ? [...items, company.id] : items.filter((id) => id !== company.id))} />{company.label}</label>)}</div>
      <label>담당 컨설턴트<select value={consultant} onChange={(event) => setConsultant(event.target.value)} required>{consultants.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>데이터셋<input value={`${demoDataset.sourceFile} · 2022 · 준비 완료`} readOnly /></label>
      <button type="submit" disabled={!consultants.length || !comparisons.length}>프로젝트 생성</button>
    </form>
    {message && <p className="admin-feedback" role="status">{message}</p>}
  </>;
}
