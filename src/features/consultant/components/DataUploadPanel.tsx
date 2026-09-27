import { useRef, useState, type ChangeEvent } from 'react';
import { useSession } from '../../../auth/SessionProvider';
import type { DatasetReadiness } from '../../../domain/data-import';
import type { ProjectSummary } from '../../../domain/projects';
import { demoDataset } from '../../../data/demo-dataset';
import { createServiceContainer } from '../../../services/container';
import { saveProjectDataset, saveProjectReadiness } from '../../../services/project-data-store';
import { DemoImportRejectedError } from '../../../services/demo-import-validator';

const importValidator = createServiceContainer().importValidator;
const MUST_HAVE_FIELDS = ['YEAR', 'FIRM', 'INDUSTRY', 'SECTOR', 'NCSI', 'GENDER', 'AGE1', 'NATIONAL', 'B0101'];

export function DataUploadPanel({ project, onUpdated }: { project: ProjectSummary; onUpdated: (project: ProjectSummary) => void }) {
  const { user } = useSession();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [readiness, setReadiness] = useState<DatasetReadiness | null>(project.readiness ?? null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string | number | null>>>([]);
  const [savedAt, setSavedAt] = useState('');

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setReadiness(null);
    setPreviewRows([]);
    setSavedAt('');
    setBusy(true);
    try {
      if (!('parseAggregate' in importValidator) || typeof importValidator.parseAggregate !== 'function') {
        throw new Error('로컬 데이터 검증기를 사용할 수 없습니다.');
      }
      const parsed = await importValidator.parseAggregate(file);
      const requiredCompanyIds = [project.subjectCompanyId, ...project.comparisonCompanyIds];
      const includedCompanyIds = new Set(parsed.dataset.companies.map((company) => company.id));
      const missingCompanies = requiredCompanyIds.filter((id) => !includedCompanyIds.has(id));
      if (missingCompanies.length > 0) {
        const companyLabels = demoDataset.companies.filter((company) => missingCompanies.includes(company.id)).map((company) => company.label);
        const scopeIssue = {
          fieldId: 'FIRM',
          message: `고정된 프로젝트 대상/비교 기업이 포함되지 않았습니다: ${companyLabels.join(', ') || missingCompanies.join(', ')}`,
          severity: 'error' as const,
        };
        const blocked: DatasetReadiness = {
          ...parsed.readiness,
          status: 'blocked',
          issues: [...parsed.readiness.issues, scopeIssue],
          sections: { ...parsed.readiness.sections, ncsi: 'blocked' },
        };
        setReadiness(blocked);
        throw Object.assign(new Error(scopeIssue.message), { readiness: blocked, previewRows: parsed.previewRows });
      }
      saveProjectDataset(project.id, parsed.dataset);
      const updated = saveProjectReadiness(project.id, parsed.readiness);
      setReadiness(parsed.readiness);
      setPreviewRows(parsed.previewRows);
      setSavedAt(new Date().toLocaleString('ko-KR'));
      if (updated) onUpdated(updated);
    } catch (error) {
      const rejectedReadiness = error instanceof DemoImportRejectedError
        ? error.readiness
        : (error && typeof error === 'object' && 'readiness' in error ? error.readiness as DatasetReadiness : null);
      if (rejectedReadiness) {
        setReadiness(rejectedReadiness);
        if (error && typeof error === 'object' && 'previewRows' in error && Array.isArray(error.previewRows)) {
          setPreviewRows(error.previewRows as Array<Record<string, string | number | null>>);
        }
      }
      else setReadiness({
        status: 'blocked',
        issues: [{ fieldId: 'FILE', message: error instanceof Error ? error.message : String(error), severity: 'error' }],
        mappedFieldIds: [],
        sections: { ncsi: 'blocked', qualityFactors: 'blocked' },
      });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const mapped = readiness?.mappedFieldIds ?? [];
  const factorCount = mapped.filter((fieldId) => /^A\d{3}$/.test(fieldId)).length;
  const missing = MUST_HAVE_FIELDS.filter((fieldId) => !mapped.includes(fieldId));
  const visibleIssues = readiness?.issues.slice(0, 8) ?? [];

  return <section className="consultant-panel data-upload-panel" aria-labelledby="data-upload-title">
    <div className="consultant-panel-heading"><div><h2 id="data-upload-title">데이터 업로드 및 검증</h2><p>XLSX/CSV · 최대 20 MiB · 원본 응답은 브라우저 메모리에서만 확인합니다.</p></div><span className={`data-status-pill is-${readiness?.status ?? project.dataStatus}`}>{busy ? '검증 중' : statusLabel(readiness?.status ?? project.dataStatus)}</span></div>
    <div className="upload-controls"><input ref={fileInput} type="file" accept=".xlsx,.csv" onChange={handleFile} disabled={busy} aria-label="검증할 XLSX 또는 CSV 파일 선택"/><button type="button" className="secondary-action" onClick={() => fileInput.current?.click()} disabled={busy}>{busy ? '검증 중…' : '파일 선택'}</button><span>{fileName || '선택된 파일 없음'}</span></div>
    <div className="readiness-sections"><section><span>NCSI 분석</span><strong className={`section-state is-${readiness?.sections.ncsi ?? (project.dataStatus === 'ready' ? 'ready' : 'partial')}`}>{readiness?.sections.ncsi === 'blocked' ? '차단됨' : readiness?.sections.ncsi === 'partial' ? '일부 조건 제한' : '사용 가능'}</strong></section><section><span>CS 품질요인</span><strong className={`section-state is-${readiness?.sections.qualityFactors ?? (project.dataStatus === 'ready' ? 'ready' : 'partial')}`}>{readiness?.sections.qualityFactors === 'blocked' ? '데이터 없음' : readiness?.sections.qualityFactors === 'partial' ? '일부 요인 제한' : '사용 가능'}</strong></section></div>
    {readiness && <div className="field-map-summary"><span>필수·특성 열 매핑 {MUST_HAVE_FIELDS.length - missing.length}/{MUST_HAVE_FIELDS.length}</span><span>품질요인 {factorCount}/49</span>{missing.length > 0 && <span className="missing-field-list">확인 필요: {missing.join(', ')}</span>}</div>}
    {readiness && readiness.issues.length > 0 && <ul className="validation-issues" aria-label="파일 검증 결과">{visibleIssues.map((issue, index) => <li className={`is-${issue.severity}`} key={`${issue.fieldId}-${index}`}><strong>{issue.fieldId}</strong><span>{issue.message}</span></li>)}{readiness.issues.length > visibleIssues.length && <li>외 {readiness.issues.length - visibleIssues.length}건의 검증 항목</li>}</ul>}
    {previewRows.length > 0 && <div className="preview-table-wrap"><div className="preview-caption"><strong>응답 행 미리보기</strong><span>처음 {previewRows.length}행 · 화면 이동 후 원본 행은 유지되지 않음</span></div><div className="table-scroll"><table className="consultant-data-table"><thead><tr>{Object.keys(previewRows[0] ?? {}).map((fieldId) => <th key={fieldId}>{fieldId}</th>)}</tr></thead><tbody>{previewRows.map((row, index) => <tr key={index}>{Object.keys(previewRows[0] ?? {}).map((fieldId) => <td key={fieldId}>{row[fieldId] ?? '—'}</td>)}</tr>)}</tbody></table></div></div>}
    {savedAt && <p className="local-save-note" role="status">검증된 집계값만 이 프로젝트의 브라우저 저장소에 저장했습니다 · {savedAt}</p>}
    {!savedAt && project.dataStatus === 'ready' && <p className="local-save-note">현재 제공된 2022 원천 집계 데이터 사용 중 · 업로드 검증 실패 시에도 이 데이터는 교체되지 않습니다.</p>}
    {user?.role !== 'consultant' && <p className="local-save-note">업로드 검증은 배정된 컨설턴트 계정에서만 진행할 수 있습니다.</p>}
  </section>;
}

function statusLabel(status: string): string {
  return ({ ready: '준비 완료', partial: '일부 준비', blocked: 'NCSI 차단', 'not-uploaded': '업로드 필요', validating: '검증 중' } as Record<string, string>)[status] ?? status;
}
