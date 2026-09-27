import { demoDataset } from '../data/demo-dataset';
import { DEMO_REFERENCE_MATERIALS } from '../data/demo-projects';
import type { DemoDataset } from '../data/schema';
import type { DatasetReadiness } from '../domain/data-import';
import type { ProjectDataStatus, ProjectSummary, ReferenceMaterial } from '../domain/projects';
import { listManagedProjects } from '../data/admin-demo-store';

const PROJECT_STATUS_KEY = 'kpc-cx-project-status-v1';
const PROJECT_DATA_KEY_PREFIX = 'kpc-cx-project-aggregate-v1:';
const PROJECT_REFERENCES_KEY_PREFIX = 'kpc-cx-project-references-v1:';

export function listProjectSummaries(assignedProjectIds: string[]): ProjectSummary[] {
  const projects = listManagedProjects().filter((project) => assignedProjectIds.includes(project.id)).map((project) => ({ ...project }));
  const saved = readStatusMap();
  return projects.map((project) => ({ ...project, ...(saved[project.id] ?? {}) }))
    .sort((left, right) => projectSortOrder(left) - projectSortOrder(right) || right.updatedAt.localeCompare(left.updatedAt));
}

export function getProjectSummary(projectId: string): ProjectSummary | undefined {
  return listProjectSummaries(listManagedProjects().map((project) => project.id)).find((project) => project.id === projectId);
}

export function getProjectDataStatus(projectId: string): ProjectDataStatus | undefined {
  const project = getProjectSummary(projectId);
  if (!project) return undefined;
  return {
    projectId,
    status: project.dataStatus,
    readiness: project.readiness ?? null,
    activeDatasetId: getProjectDataset(projectId).id,
    updatedAt: project.updatedAt,
  };
}

export function saveProjectReadiness(projectId: string, readiness: DatasetReadiness): ProjectSummary | undefined {
  const project = listManagedProjects().find((item) => item.id === projectId);
  if (!project) return undefined;
  const dataStatus: ProjectSummary['dataStatus'] = readiness.status;
  const next: Partial<ProjectSummary> = { dataStatus, readiness, updatedAt: new Date().toISOString() };
  const saved = readStatusMap();
  saved[projectId] = { ...saved[projectId], ...next };
  safeSet(PROJECT_STATUS_KEY, JSON.stringify(saved));
  return { ...project, ...next };
}

export function saveProjectDataset(projectId: string, dataset: DemoDataset): void {
  const projectExists = listManagedProjects().some((project) => project.id === projectId);
  if (!projectExists) throw new Error('프로젝트 데이터 저장 범위를 확인할 수 없습니다.');
  if (!dataset.cells.length || dataset.sourceRowCount !== dataset.cells.reduce((sum, cell) => sum + cell.respondentCount, 0)) {
    throw new Error('집계 데이터 검증에 실패하여 프로젝트 데이터를 저장하지 않았습니다.');
  }
  safeSet(`${PROJECT_DATA_KEY_PREFIX}${projectId}`, JSON.stringify(dataset));
  window.dispatchEvent(new CustomEvent('cx:project-dataset-updated', { detail: { projectId } }));
}

export function getProjectDataset(projectId: string, fallback: DemoDataset = demoDataset): DemoDataset {
  try {
    const raw = window.localStorage.getItem(`${PROJECT_DATA_KEY_PREFIX}${projectId}`);
    if (!raw) return fallback;
    const dataset = JSON.parse(raw) as DemoDataset;
    if (!dataset || dataset.year !== 2022 || !Array.isArray(dataset.cells) || !Array.isArray(dataset.companies)) return fallback;
    const respondentCount = dataset.cells.reduce((sum, cell) => sum + cell.respondentCount, 0);
    if (respondentCount !== dataset.sourceRowCount) return fallback;
    return dataset;
  } catch {
    return fallback;
  }
}

export function getProjectReferences(projectId: string): ReferenceMaterial[] {
  try {
    const raw = window.localStorage.getItem(`${PROJECT_REFERENCES_KEY_PREFIX}${projectId}`);
    if (!raw) return DEMO_REFERENCE_MATERIALS.filter((item) => item.projectId === projectId);
    const references = JSON.parse(raw) as ReferenceMaterial[];
    return Array.isArray(references) ? references.filter((item) => item.projectId === projectId) : [];
  } catch {
    return [];
  }
}

export function saveProjectReferences(projectId: string, references: ReferenceMaterial[]): void {
  if (!listManagedProjects().some((project) => project.id === projectId)) throw new Error('프로젝트 참고자료 저장 범위를 확인할 수 없습니다.');
  const scoped = references.filter((item) => item.projectId === projectId);
  safeSet(`${PROJECT_REFERENCES_KEY_PREFIX}${projectId}`, JSON.stringify(scoped));
}

export function saveProjectReportStatus(projectId: string, reportStatus: ProjectSummary['reportStatus']): void {
  if (!listManagedProjects().some((project) => project.id === projectId)) throw new Error('프로젝트 보고서 상태 저장 범위를 확인할 수 없습니다.');
  const saved = readStatusMap();
  saved[projectId] = { ...saved[projectId], reportStatus, updatedAt: new Date().toISOString() };
  safeSet(PROJECT_STATUS_KEY, JSON.stringify(saved));
}

export function projectDatasetUpdatedEventName(): string {
  return 'cx:project-dataset-updated';
}

function readStatusMap(): Record<string, Partial<ProjectSummary>> {
  try {
    const raw = window.localStorage.getItem(PROJECT_STATUS_KEY);
    return raw ? JSON.parse(raw) as Record<string, Partial<ProjectSummary>> : {};
  } catch {
    return {};
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    throw new Error('브라우저 저장 공간에 기록하지 못했습니다. 기존 데이터는 유지했습니다.');
  }
}

function projectSortOrder(project: ProjectSummary): number {
  if (project.dataStatus === 'blocked') return 0;
  if (project.reportStatus === 'draft' || project.reportStatus === 'in-review') return 1;
  if (project.reportStatus === 'finalized') return 3;
  if (project.dataStatus === 'ready' || project.dataStatus === 'partial') return 2;
  return 4;
}
