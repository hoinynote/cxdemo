import { aggregateResponses, createStableId } from '../data/aggregate';
import { demoDataset } from '../data/demo-dataset';
import type { CompanyRecord, DemoDataset, QualityFactorRecord, SourceMapping } from '../data/schema';
import type { DatasetReadiness, ParsedDemoImport, ValidationIssue } from '../domain/data-import';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const REQUIRED_SOURCE_FIELDS = ['YEAR', 'FIRM', 'INDUSTRY', 'SECTOR', 'NCSI'] as const;
const DIMENSION_FIELDS = ['GENDER', 'AGE1', 'NATIONAL', 'B0101'] as const;
const EXPECTED_FACTORS = Array.from({ length: 49 }, (_, index) => `A${String(index + 1).padStart(3, '0')}`);
const MAPPING: SourceMapping = {
  companyId: 'FIRM', year: 'YEAR', industryId: 'INDUSTRY', sectorId: 'SECTOR', gender: 'GENDER',
  ageGroup: 'AGE1', nationality: 'NATIONAL', branch: 'B0101', ncsi: 'NCSI', qualityFactors: [],
};

interface ParsedRows {
  sheetName: string;
  fieldIds: string[];
  duplicateFieldIds: string[];
  dataRows: Array<{ rowNumber: number; values: Record<string, unknown> }>;
  previewRows: Array<Record<string, string | number | null>>;
  issues: ValidationIssue[];
}

export class DemoImportRejectedError extends Error {
  constructor(readonly readiness: DatasetReadiness, readonly previewRows: ParsedRows['previewRows'] = []) {
    super('NCSI 분석에 필요한 필드 또는 값이 유효하지 않습니다. 기존 프로젝트 데이터는 유지했습니다.');
    this.name = 'DemoImportRejectedError';
  }
}

export class DemoImportValidator {
  async validate(file: File): Promise<DatasetReadiness> {
    const outcome = await this.inspect(file);
    return outcome.readiness;
  }

  async parseAggregate(file: File): Promise<ParsedDemoImport> {
    const outcome = await this.inspect(file);
    if (!outcome.dataset || outcome.readiness.sections.ncsi === 'blocked') {
      throw new DemoImportRejectedError(outcome.readiness, outcome.previewRows);
    }
    return { dataset: outcome.dataset, readiness: outcome.readiness, previewRows: outcome.previewRows };
  }

  private async inspect(file: File): Promise<{ dataset: DemoDataset | null; readiness: DatasetReadiness; previewRows: ParsedRows['previewRows'] }> {
    const issues: ValidationIssue[] = [];
    const extension = file.name.split('.').pop()?.toLocaleLowerCase('en');
    if (extension !== 'xlsx' && extension !== 'csv') {
      return failedOutcome('FILE', 'XLSX 또는 CSV 파일만 선택할 수 있습니다.');
    }
    if (file.size === 0) return failedOutcome('FILE', '파일이 비어 있습니다.');
    if (file.size > MAX_FILE_BYTES) return failedOutcome('FILE', '파일 크기는 20 MiB 이하여야 합니다.');

    let parsed: ParsedRows;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true, cellDates: false });
      if (workbook.SheetNames.length === 0) return failedOutcome('FILE', '읽을 수 있는 시트가 없습니다.');
      const sheetName = workbook.SheetNames.find((name) => name === '데이터_라벨') ?? workbook.SheetNames[0]!;
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]!, {
        header: 1, raw: true, defval: null, blankrows: false,
      }) as unknown[][];
      parsed = parseMatrix(matrix, sheetName);
    } catch (error) {
      return failedOutcome('FILE', `파일을 읽지 못했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
    issues.push(...parsed.issues);

    const fieldSet = new Set(parsed.fieldIds);
    const duplicateFieldSet = new Set(parsed.duplicateFieldIds);
    for (const fieldId of REQUIRED_SOURCE_FIELDS) {
      if (!fieldSet.has(fieldId)) issues.push({ fieldId, message: `${fieldId} 필수 열이 없습니다.`, severity: 'error' });
    }
    for (const fieldId of DIMENSION_FIELDS) {
      if (!fieldSet.has(fieldId) || duplicateFieldSet.has(fieldId)) issues.push({ fieldId, message: `${fieldId} 고객 특성 열을 하나로 확정할 수 없습니다. 해당 세부 필터 결과는 '미기재'로 집계됩니다.`, severity: 'warning' });
    }
    const qualityFactors = EXPECTED_FACTORS.filter((id) => fieldSet.has(id) && !duplicateFieldSet.has(id));
    if (qualityFactors.length === 0) {
      issues.push({ fieldId: 'A001-A049', message: '인식된 CS 품질요인(A001–A049) 열이 없습니다.', severity: 'warning' });
    } else if (qualityFactors.length < EXPECTED_FACTORS.length) {
      const absent = EXPECTED_FACTORS.filter((id) => !fieldSet.has(id));
      issues.push({ fieldId: 'A001-A049', message: `품질요인 열 ${qualityFactors.length}/49개를 확인했습니다. 누락: ${absent.join(', ')}`, severity: 'warning' });
    }
    const mapping: SourceMapping = { ...MAPPING, qualityFactors };

    if (parsed.dataRows.length === 0) {
      issues.push({ fieldId: 'ROWS', message: '유효한 응답 행을 찾을 수 없습니다.', severity: 'error' });
    }
    const rowErrors = validateRows(parsed.dataRows, fieldSet, qualityFactors);
    issues.push(...rowErrors);

    const requiredErrors = issues.some((issue) => issue.severity === 'error'
      && (REQUIRED_SOURCE_FIELDS.includes(issue.fieldId as typeof REQUIRED_SOURCE_FIELDS[number]) || issue.fieldId === 'ROWS'));
    const industryValues = uniqueValues(parsed.dataRows, 'INDUSTRY');
    const sectorValues = uniqueValues(parsed.dataRows, 'SECTOR');
    if (industryValues.length > 1) issues.push({ fieldId: 'INDUSTRY', message: '현재 프로젝트 데이터는 한 업종 범위여야 합니다.', severity: 'error' });
    if (sectorValues.length > 1) issues.push({ fieldId: 'SECTOR', message: '현재 프로젝트 데이터는 한 산업 범위여야 합니다.', severity: 'error' });
    if (industryValues.length === 0) issues.push({ fieldId: 'INDUSTRY', message: '업종 값을 확인할 수 없습니다.', severity: 'error' });
    if (sectorValues.length === 0) issues.push({ fieldId: 'SECTOR', message: '산업 값을 확인할 수 없습니다.', severity: 'error' });
    const scopeErrors = issues.some((issue) => issue.severity === 'error' && ['YEAR', 'FIRM', 'INDUSTRY', 'SECTOR', 'NCSI', 'ROWS'].includes(issue.fieldId));
    const ncsiBlocked = requiredErrors || scopeErrors;
    const missingDimensions = DIMENSION_FIELDS.some((id) => !fieldSet.has(id));
    const factorIssues = issues.some((issue) => issue.fieldId.startsWith('A') || issue.fieldId === 'A001-A049');
    const qualityFactorStatus = qualityFactors.length === 0
      ? 'blocked'
      : (factorIssues || qualityFactors.length < EXPECTED_FACTORS.length || missingDimensions ? 'partial' : 'ready');
    const sections: DatasetReadiness['sections'] = {
      ncsi: ncsiBlocked ? 'blocked' : (missingDimensions ? 'partial' : 'ready'),
      qualityFactors: qualityFactorStatus,
    };
    const status: DatasetReadiness['status'] = ncsiBlocked
      ? 'blocked'
      : (issues.length > 0 || sections.qualityFactors !== 'ready' ? 'partial' : 'ready');
    const mappedFieldIds = parsed.fieldIds.filter((fieldId) =>
      REQUIRED_SOURCE_FIELDS.includes(fieldId as typeof REQUIRED_SOURCE_FIELDS[number])
      || DIMENSION_FIELDS.includes(fieldId as typeof DIMENSION_FIELDS[number])
      || EXPECTED_FACTORS.includes(fieldId),
    );
    const readiness: DatasetReadiness = { status, issues, mappedFieldIds, sections };
    if (ncsiBlocked) return { dataset: null, readiness, previewRows: parsed.previewRows };

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourceHash = await sha256(sourceBytes);
      const sourceRows = parsed.dataRows.map((row) => sanitizeFactorRows(row, qualityFactors, parsed.duplicateFieldIds));
      const aggregate = aggregateResponses(sourceRows, mapping);
      const companies = uniqueValues(parsed.dataRows, 'FIRM').map((label): CompanyRecord => ({
        id: createStableId('company', label), label,
        industryId: createStableId('industry', industryValues[0]!),
        sectorId: createStableId('sector', sectorValues[0]!),
      })).sort((left, right) => left.label.localeCompare(right.label, 'ko'));
      const factorLabels = new Map(demoDataset.factors.map((factor) => [factor.id, factor.label]));
      const factors: QualityFactorRecord[] = qualityFactors.map((id, index) => ({ id, label: factorLabels.get(id) ?? id, order: index + 1 }));
      const dataset: DemoDataset = {
        id: `project-import-${sourceHash.slice(0, 16)}`,
        sourceFile: file.name,
        sourceSheets: [parsed.sheetName],
        sourceHash,
        importedAt: new Date().toISOString(),
        mappingVersion: 'ncsi-browser-import-v1',
        sourceRowCount: parsed.dataRows.length,
        fieldIds: mapping,
        missingValueCounts: aggregate.missingValueCounts,
        year: 2022,
        industryId: createStableId('industry', industryValues[0]!),
        industryLabel: industryValues[0]!,
        sectorId: createStableId('sector', sectorValues[0]!),
        sectorLabel: sectorValues[0]!,
        companies,
        factors,
        cells: aggregate.cells,
      };
      return { dataset, readiness, previewRows: parsed.previewRows };
    } catch (error) {
      const issue: ValidationIssue = { fieldId: 'AGGREGATE', message: `집계를 완료하지 못했습니다: ${error instanceof Error ? error.message : String(error)}`, severity: 'error' };
      return { dataset: null, readiness: { ...readiness, status: 'blocked', issues: [...issues, issue], sections: { ...sections, ncsi: 'blocked' } }, previewRows: parsed.previewRows };
    }
  }
}

function parseMatrix(matrix: unknown[][], sheetName: string): ParsedRows {
  const headerValues = matrix[0] ?? [];
  const fieldIds = headerValues.map((value) => text(value).toUpperCase());
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  const duplicateFieldIds = new Set<string>();
  fieldIds.forEach((fieldId) => {
    if (!fieldId) return;
    if (seen.has(fieldId)) {
      duplicateFieldIds.add(fieldId);
      issues.push({ fieldId, message: `${fieldId} 열이 중복되어 있습니다.`, severity: 'error' });
    }
    seen.add(fieldId);
  });
  const header = new Map(fieldIds.map((fieldId, index) => [fieldId, index]));
  const firstDataIndex = matrix.findIndex((row, index) => index > 0 && yearValue(row[header.get('YEAR') ?? -1]) !== null && text(row[header.get('FIRM') ?? -1]) !== '');
  const rows = firstDataIndex === -1 ? [] : matrix.slice(firstDataIndex);
  const dataRows = rows.map((row, offset) => {
    const values: Record<string, unknown> = {};
    for (const [fieldId, index] of header) if (fieldId) values[fieldId] = row[index] ?? null;
    return { rowNumber: firstDataIndex + offset + 1, values };
  }).filter(({ values }) => Object.values(values).some((value) => text(value) !== ''));
  const previewRows = dataRows.slice(0, 10).map(({ values }) => Object.fromEntries(
    ['YEAR', 'FIRM', 'NCSI', ...DIMENSION_FIELDS].filter((id) => fieldIds.includes(id) && !duplicateFieldIds.has(id)).map((id) => [id, previewValue(values[id])]),
  ));
  return { sheetName, fieldIds: [...seen].filter((fieldId) => !duplicateFieldIds.has(fieldId)), duplicateFieldIds: [...duplicateFieldIds], dataRows, previewRows, issues };
}

function validateRows(rows: ParsedRows['dataRows'], fieldSet: Set<string>, qualityFactors: string[]): ValidationIssue[] {
  const issueCounts = new Map<string, { count: number; firstRow: number; severity: ValidationIssue['severity']; message: string }>();
  const add = (fieldId: string, rowNumber: number, message: string, severity: ValidationIssue['severity']) => {
    const current = issueCounts.get(fieldId);
    issueCounts.set(fieldId, current
      ? { ...current, count: current.count + 1 }
      : { count: 1, firstRow: rowNumber, severity, message });
  };
  rows.forEach(({ rowNumber, values }) => {
    const year = yearValue(values.YEAR);
    if (year !== 2022) add('YEAR', rowNumber, '현재 프로토타입은 2022년 데이터만 집계할 수 있습니다.', 'error');
    for (const fieldId of ['FIRM', 'INDUSTRY', 'SECTOR'] as const) {
      if (!text(values[fieldId])) add(fieldId, rowNumber, `${fieldId} 값이 비어 있습니다.`, 'error');
    }
    if (numeric(values.NCSI) === null) add('NCSI', rowNumber, 'NCSI 값은 숫자여야 합니다.', 'error');
    for (const fieldId of DIMENSION_FIELDS) {
      if (fieldSet.has(fieldId) && !text(values[fieldId])) add(fieldId, rowNumber, `${fieldId} 값이 비어 있어 '미기재'로 집계됩니다.`, 'warning');
    }
    for (const fieldId of qualityFactors) {
      if (values[fieldId] !== null && text(values[fieldId]) && numeric(values[fieldId]) === null) {
        add(fieldId, rowNumber, '숫자가 아닌 품질요인 값은 결측으로 처리됩니다.', 'warning');
      }
    }
  });
  return [...issueCounts.entries()].map(([fieldId, entry]) => ({
    fieldId,
    message: `행 ${entry.firstRow}${entry.count > 1 ? ` 외 ${entry.count - 1}건` : ''}: ${entry.message}`,
    severity: entry.severity,
  }));
}

function sanitizeFactorRows(row: ParsedRows['dataRows'][number], qualityFactors: string[], duplicateFieldIds: string[]): Record<string, unknown> {
  const values: Record<string, unknown> = { ...row.values, __sourceRow: row.rowNumber };
  for (const fieldId of duplicateFieldIds) values[fieldId] = null;
  for (const fieldId of qualityFactors) if (numeric(values[fieldId]) === null) values[fieldId] = null;
  return values;
}

function uniqueValues(rows: ParsedRows['dataRows'], fieldId: string): string[] {
  return [...new Set(rows.map(({ values }) => text(values[fieldId])).filter(Boolean))];
}

function yearValue(value: unknown): number | null {
  const found = text(value).match(/\d{4}/)?.[0];
  const parsed = found ? Number(found) : Number.NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function previewValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  return typeof value === 'number' ? value : String(value);
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function failedOutcome(fieldId: string, message: string) {
  return {
    dataset: null,
    previewRows: [] as ParsedRows['previewRows'],
    readiness: {
      status: 'blocked',
      issues: [{ fieldId, message, severity: 'error' }],
      mappedFieldIds: [],
      sections: { ncsi: 'blocked', qualityFactors: 'blocked' },
    } satisfies DatasetReadiness,
  };
}
