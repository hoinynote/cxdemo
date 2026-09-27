export interface ValidationIssue {
  fieldId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DatasetReadiness {
  status: 'ready' | 'blocked' | 'partial';
  issues: ValidationIssue[];
  mappedFieldIds: string[];
  sections: {
    ncsi: 'ready' | 'blocked' | 'partial';
    qualityFactors: 'ready' | 'blocked' | 'partial';
  };
}

export interface ImportValidationPort {
  validate(file: File): Promise<DatasetReadiness>;
}

export interface ParsedDemoImport {
  dataset: import('../data/schema').DemoDataset;
  readiness: DatasetReadiness;
  previewRows: Array<Record<string, string | number | null>>;
}
