export type DimensionKey = 'gender' | 'ageGroup' | 'nationality' | 'branch';

export type DimensionValues = Partial<Record<DimensionKey, string>>;

export interface CompanyRecord {
  id: string;
  label: string;
  industryId: string;
  sectorId: string;
}

export interface QualityFactorRecord {
  id: string;
  label: string;
  order: number;
}

export interface AggregateCell {
  companyId: string;
  year: 2022;
  dimensions: DimensionValues;
  respondentCount: number;
  ncsiSum: number;
  factorSums: Record<string, number>;
  factorCounts: Record<string, number>;
}

export interface SourceMapping {
  companyId: 'FIRM';
  year: 'YEAR';
  industryId: 'INDUSTRY';
  sectorId: 'SECTOR';
  gender: 'GENDER';
  ageGroup: 'AGE1';
  nationality: 'NATIONAL';
  branch: 'B0101';
  ncsi: 'NCSI';
  qualityFactors: string[];
}

export interface DemoDataset {
  id: string;
  sourceFile: string;
  sourceSheets: string[];
  sourceHash: string;
  importedAt: string;
  mappingVersion: string;
  sourceRowCount: number;
  fieldIds: SourceMapping;
  missingValueCounts: Record<string, number>;
  year: 2022;
  industryId: string;
  industryLabel: string;
  sectorId: string;
  sectorLabel: string;
  companies: CompanyRecord[];
  factors: QualityFactorRecord[];
  cells: AggregateCell[];
}
