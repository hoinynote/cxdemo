import type { DatasetReadiness } from './data-import';

export type DataStatus = 'not-uploaded' | 'validating' | 'ready' | 'blocked' | 'partial';

export interface ProjectSummary {
  id: string;
  name: string;
  subjectCompanyId: string;
  comparisonCompanyIds: string[];
  consultantUserId: string;
  year: number;
  dataStatus: DataStatus;
  reportStatus: 'not-started' | 'draft' | 'in-review' | 'finalized';
  updatedAt: string;
  readiness?: DatasetReadiness;
}

export interface ProjectDataStatus {
  projectId: string;
  status: DataStatus;
  readiness: DatasetReadiness | null;
  activeDatasetId: string | null;
  updatedAt: string;
}

export interface ReferenceMaterial {
  id: string;
  projectId: string;
  title: string;
  kind: 'method' | 'prior-case' | 'industry';
  body: string;
  status: 'draft' | 'approved';
  reviewedBy: string | null;
  updatedAt: string;
}
