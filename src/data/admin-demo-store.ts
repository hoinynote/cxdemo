import { demoDataset } from './demo-dataset';
import { DEMO_PROJECTS } from './demo-projects';
import { DEMO_USERS } from './demo-users';
import type { DemoUser, ManagedAccount } from '../domain/auth';
import type { DataStatus, ProjectSetupInput, ProjectSummary } from '../domain/projects';
import { demoFeedbackStore } from './demo-feedback-store';
import { demoUsageStore } from './demo-usage-store';

const STORAGE_KEY = 'kpc-cx-admin-demo-v1';
interface AdminState { accounts: ManagedAccount[]; projects: ProjectSummary[] }

const emails: Record<string, string> = {
  'company-lotte': 'cx@lotte.example',
  'consultant-dutyfree': 'consultant@kpc.example',
  'admin-kpc': 'admin@kpc.example',
};
const seedState = (): AdminState => ({
  accounts: DEMO_USERS.map((user) => ({ ...user, email: emails[user.id] ?? `${user.id}@kpc.example`, status: 'active', companyId: user.companyId ?? null, assignedProjectIds: [...user.projectIds] })),
  projects: DEMO_PROJECTS.map((project) => ({ ...project })),
});

function readState(): AdminState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const value = JSON.parse(raw) as Partial<AdminState>;
    const seed = seedState();
    return {
      accounts: Array.isArray(value.accounts) ? value.accounts : seed.accounts,
      projects: Array.isArray(value.projects) ? value.projects : seed.projects,
    };
  } catch { return seedState(); }
}
function writeState(state: AdminState): void { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export const AdminDemoStore = {
  listAccounts(): ManagedAccount[] { return copy(readState().accounts); },
  getAccount(id: string): ManagedAccount | undefined { return this.listAccounts().find((item) => item.id === id); },
  updateAccount(id: string, patch: Partial<Pick<ManagedAccount, 'status' | 'companyId' | 'assignedProjectIds'>>): void {
    const state = readState();
    const index = state.accounts.findIndex((item) => item.id === id);
    if (index < 0) throw new Error('계정을 찾을 수 없습니다.');
    const account = state.accounts[index]!;
    if (account.role === 'company' && patch.companyId !== undefined && patch.companyId !== null && !demoDataset.companies.some((item) => item.id === patch.companyId)) throw new Error('등록된 기업을 선택해 주세요.');
    if (account.role === 'consultant' && patch.assignedProjectIds) patch.assignedProjectIds = [...new Set(patch.assignedProjectIds)].filter((projectId) => state.projects.some((project) => project.id === projectId));
    const companyProjectIds = account.role === 'company' && patch.companyId !== undefined
      ? state.projects.filter((project) => project.subjectCompanyId === patch.companyId).map((project) => project.id)
      : undefined;
    state.accounts[index] = { ...account, ...patch, assignedProjectIds: companyProjectIds ?? patch.assignedProjectIds ?? account.assignedProjectIds, projectIds: companyProjectIds ?? patch.assignedProjectIds ?? account.projectIds };
    writeState(state);
  },
  listProjects(): ProjectSummary[] { return copy(readState().projects); },
  createProject(input: ProjectSetupInput): ProjectSummary {
    const state = readState();
    if (input.year !== 2022 || input.datasetId !== demoDataset.id) throw new Error('현재 등록된 2022년 데이터셋만 사용할 수 있습니다.');
    if (!input.id.trim() || !input.name.trim() || state.projects.some((project) => project.id === input.id)) throw new Error('프로젝트 ID와 이름을 확인해 주세요.');
    const companyIds = new Set(demoDataset.companies.map((company) => company.id));
    const comparisons = [...new Set(input.comparisonCompanyIds)];
    if (!companyIds.has(input.subjectCompanyId) || !comparisons.length || comparisons.includes(input.subjectCompanyId) || comparisons.some((id) => !companyIds.has(id))) throw new Error('대상 기업과 비교 기업 범위를 확인해 주세요.');
    const consultant = state.accounts.find((account) => account.id === input.consultantUserId && account.role === 'consultant' && account.status === 'active');
    if (!consultant) throw new Error('활성 컨설턴트를 선택해 주세요.');
    const project: ProjectSummary = { id: input.id.trim(), name: input.name.trim(), subjectCompanyId: input.subjectCompanyId, comparisonCompanyIds: comparisons, consultantUserId: input.consultantUserId, year: 2022, dataStatus: 'ready', reportStatus: 'not-started', updatedAt: demoDataset.importedAt };
    state.projects.push(project);
    consultant.assignedProjectIds = [...new Set([...consultant.assignedProjectIds, project.id])];
    consultant.projectIds = consultant.assignedProjectIds;
    const company = state.accounts.find((account) => account.role === 'company' && account.companyId === project.subjectCompanyId);
    if (company) { company.assignedProjectIds = [...new Set([...company.assignedProjectIds, project.id])]; company.projectIds = company.assignedProjectIds; }
    writeState(state);
    return copy(project);
  },
  updateDataStatus(projectId: string, status: DataStatus): void {
    const state = readState();
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');
    project.dataStatus = status;
    project.updatedAt = new Date().toISOString();
    writeState(state);
  },
  reset(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('kpc-cx-template-versions-v1');
    window.localStorage.removeItem('kpc-cx-project-status-v1');
    demoFeedbackStore.clear(); demoUsageStore.clear();
    window.dispatchEvent(new CustomEvent('cx:admin-demo-reset'));
  },
};

export function listManagedProjects(): ProjectSummary[] { return AdminDemoStore.listProjects(); }
export function listEnabledDemoUsers(): DemoUser[] {
  return AdminDemoStore.listAccounts().filter((account) => account.status === 'active').map(({ id, name, role, companyId, projectIds }) => ({ id, name, role, ...(companyId ? { companyId } : {}), projectIds }));
}
