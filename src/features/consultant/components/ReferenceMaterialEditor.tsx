import { useState, type FormEvent } from 'react';
import type { ReferenceMaterial } from '../../../domain/projects';

const kindLabels: Record<ReferenceMaterial['kind'], string> = { method: '분석 방법', 'prior-case': '선행 사례', industry: '산업 참고' };

function ReferenceItem({ material, reviewer, onSave }: {
  material: ReferenceMaterial;
  reviewer: string;
  onSave: (next: ReferenceMaterial) => void;
}) {
  const [title, setTitle] = useState(material.title);
  const [kind, setKind] = useState(material.kind);
  const [body, setBody] = useState(material.body);

  function save(status: ReferenceMaterial['status']) {
    onSave({ ...material, title: title.trim(), kind, body: body.trim(), status, reviewedBy: status === 'approved' ? reviewer : null, updatedAt: new Date().toISOString() });
  }

  return <article className="reference-item">
    <div className="reference-item-heading"><div><strong>{material.title}</strong><span>{kindLabels[material.kind]}</span></div><span className={`reference-status is-${material.status}`}>{material.status === 'approved' ? '검토 완료' : '초안'}</span></div>
    <label className="reference-field"><span>제목</span><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
    <label className="reference-field"><span>유형</span><select value={kind} onChange={(event) => setKind(event.target.value as ReferenceMaterial['kind'])}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="reference-field"><span>참고 내용</span><textarea value={body} rows={3} maxLength={4000} onChange={(event) => setBody(event.target.value)} /></label>
    <div className="reference-item-footer">{material.reviewedBy && <span>검토자: {material.reviewedBy}</span>}<div><button type="button" className="reference-save" onClick={() => save('draft')}>초안 저장</button><button type="button" className="reference-approve" disabled={!title.trim() || !body.trim()} onClick={() => save('approved')}>검토 완료</button></div></div>
  </article>;
}

export function ReferenceMaterialEditor({ projectId, reviewer, materials, onChange }: {
  projectId: string;
  reviewer: string;
  materials: ReferenceMaterial[];
  onChange: (materials: ReferenceMaterial[]) => void;
}) {
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<ReferenceMaterial['kind']>('industry');
  const [newBody, setNewBody] = useState('');
  const [message, setMessage] = useState('');

  function updateMaterial(next: ReferenceMaterial) {
    const updated = materials.map((item) => item.id === next.id ? next : item);
    try {
      onChange(updated);
      setMessage(next.status === 'approved' ? '검토 완료 자료를 이 프로젝트에 저장했습니다.' : '초안 내용을 이 프로젝트에 저장했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) return;
    const next: ReferenceMaterial = {
      id: `reference-${Date.now()}`,
      projectId,
      title,
      kind: newKind,
      body,
      status: 'draft',
      reviewedBy: null,
      updatedAt: new Date().toISOString(),
    };
    try {
      onChange([...materials, next]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    setNewTitle('');
    setNewBody('');
    setMessage('프로젝트 참고자료 초안을 저장했습니다.');
  }

  return <section className="consultant-panel reference-editor" aria-labelledby="reference-editor-title">
    <div className="consultant-panel-heading"><div><h2 id="reference-editor-title">승인 참고자료</h2><p>검토 완료한 자료만 현재 프로젝트의 AI 분석 근거로 전달할 수 있습니다.</p></div><span>{materials.filter((item) => item.status === 'approved').length}건 승인</span></div>
    <form className="new-reference-form" onSubmit={addMaterial}>
      <label className="reference-field"><span>새 참고자료 제목</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={120} placeholder="예: 업종 지표 해석 기준" /></label>
      <label className="reference-field"><span>유형</span><select value={newKind} onChange={(event) => setNewKind(event.target.value as ReferenceMaterial['kind'])}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="reference-field new-reference-body"><span>출처 또는 참고 내용</span><textarea value={newBody} onChange={(event) => setNewBody(event.target.value)} rows={2} maxLength={4000} placeholder="출처와 분석에 참고할 내용을 기록합니다." /></label>
      <button type="submit" className="reference-save" disabled={!newTitle.trim() || !newBody.trim()}>참고자료 추가</button>
    </form>
    {materials.length === 0 ? <p className="reference-empty">이 프로젝트에 등록된 참고자료가 없습니다.</p> : <div className="reference-list">{materials.map((material) => <ReferenceItem key={material.id} material={material} reviewer={reviewer} onSave={updateMaterial} />)}</div>}
    <p className="reference-local-note" role="status">{message || '자료는 이 프로젝트의 브라우저 저장소에만 보관됩니다.'} 프로젝트 간 공유는 되지 않습니다.</p>
  </section>;
}
