import { demoDataset } from './demo-dataset';
import type { ProjectSummary, ReferenceMaterial } from '../domain/projects';

export const DEMO_PROJECTS: ProjectSummary[] = [
  {
    id: 'project-dutyfree-2022',
    name: '2022 면세점 NCSI 진단',
    subjectCompanyId: demoDataset.companies[0]?.id ?? '',
    comparisonCompanyIds: demoDataset.companies.slice(1).map((company) => company.id),
    consultantUserId: 'consultant-dutyfree',
    year: 2022,
    dataStatus: 'ready',
    reportStatus: 'not-started',
    updatedAt: demoDataset.importedAt,
  },
];

export const DEMO_REFERENCE_MATERIALS: ReferenceMaterial[] = [];
