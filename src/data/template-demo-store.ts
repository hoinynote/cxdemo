import type { DiagnosticTemplate } from '../domain/diagnostic-template';
import { NCSI_2022_V1 } from '../report-templates/ncsi-2022-v1';

const STORAGE_KEY = 'kpc-cx-template-versions-v1';
interface TemplateVersion { template: DiagnosticTemplate; createdAt: string; active: boolean }
function read(): TemplateVersion[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [{ template: NCSI_2022_V1, createdAt: '2026-09-27T00:00:00.000Z', active: true }];
    const entries = JSON.parse(raw) as TemplateVersion[];
    return Array.isArray(entries) && entries.length ? entries : [{ template: NCSI_2022_V1, createdAt: '2026-09-27T00:00:00.000Z', active: true }];
  } catch { return [{ template: NCSI_2022_V1, createdAt: '2026-09-27T00:00:00.000Z', active: true }]; }
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export const TemplateDemoStore = {
  list(): TemplateVersion[] { return clone(read()).sort((a, b) => a.template.version.localeCompare(b.template.version)); },
  getActive(): DiagnosticTemplate { return clone(read().find((entry) => entry.active)?.template ?? NCSI_2022_V1); },
  get(id: string, version: string): DiagnosticTemplate | undefined {
    const entry = read().find((item) => item.template.id === id && item.template.version === version);
    return entry ? clone(entry.template) : undefined;
  },
  register(template: DiagnosticTemplate): void {
    validateDiagnosticTemplate(template);
    const entries = read();
    const versions = entries.filter((entry) => entry.template.id === template.id).map((entry) => entry.template.version);
    const latest = versions.sort((left, right) => versionNumber(left) - versionNumber(right)).at(-1) ?? '';
    if (template.id !== NCSI_2022_V1.id || versionNumber(template.version) !== versionNumber(latest) + 1) throw new Error('기존 템플릿 ID를 유지하고 다음 버전으로 등록해 주세요.');
    const next = [...entries.map((entry) => ({ ...entry, active: false })), { template: clone(template), createdAt: new Date().toISOString(), active: true }];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
};

function versionNumber(version: string): number { return Number(/^2022-v(\d+)$/.exec(version)?.[1] ?? 0); }
export function validateDiagnosticTemplate(template: DiagnosticTemplate): void {
  if (!template || template.id !== NCSI_2022_V1.id || !Array.isArray(template.pages) || template.pages.length !== 104) throw new Error('NCSI 템플릿은 104페이지여야 합니다.');
  const ids = new Set<string>();
  template.pages.forEach((page, index) => {
    if (page.number !== index + 1 || !Array.isArray(page.containers)) throw new Error('페이지 번호 또는 컨테이너 구조가 올바르지 않습니다.');
    page.containers.forEach((container) => {
      if (!container.id || ids.has(container.id)) throw new Error(`컨테이너 ID가 없거나 중복됩니다: ${container.id}`);
      ids.add(container.id);
      if (!container.sourceContainerId || !container.kind || !container.dataBinding || !Array.isArray(container.sourceFieldIds) || !Array.isArray(container.scopes)) throw new Error(`필수 바인딩이 누락되었습니다: ${container.id}`);
      if (container.kind === 'computed' && (!container.sourceFieldIds.length || !container.calculationId)) throw new Error(`정량 컨테이너 데이터 바인딩을 확인해 주세요: ${container.id}`);
    });
  });
}
