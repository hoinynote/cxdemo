export interface ValidationIssue {
  fieldId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DatasetReadiness {
  status: 'ready' | 'blocked' | 'partial';
  issues: ValidationIssue[];
  mappedFieldIds: string[];
}

export interface ImportValidationPort {
  validate(file: File): Promise<DatasetReadiness>;
}
