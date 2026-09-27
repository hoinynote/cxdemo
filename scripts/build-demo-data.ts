import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { aggregateResponses, createStableId } from '../src/data/aggregate';
import type {
  CompanyRecord,
  DemoDataset,
  QualityFactorRecord,
  SourceMapping,
} from '../src/data/schema';

const EXPECTED_RESPONSE_COUNT = 450;
const EXPECTED_FIRM_COUNT = 3;
const EXPECTED_RESPONSES_PER_FIRM = 150;
const MAPPING_VERSION = 'ncsi-dutyfree-map-v1';
const SOURCE_FILE_NAME = '22Q4_면세점_분석용_변환.xlsx';
const REQUIRED_SHEETS = ['데이터_라벨', '데이터_원본', '변수정보', '파일정보'] as const;
const LABEL_SHEET = '데이터_라벨';
const VARIABLE_SHEET = '변수정보';

const SOURCE_MAPPING: SourceMapping = {
  companyId: 'FIRM',
  year: 'YEAR',
  industryId: 'INDUSTRY',
  sectorId: 'SECTOR',
  gender: 'GENDER',
  ageGroup: 'AGE1',
  nationality: 'NATIONAL',
  branch: 'B0101',
  ncsi: 'NCSI',
  qualityFactors: Array.from({ length: 49 }, (_, index) => `A${String(index + 1).padStart(3, '0')}`),
};

interface WorkbookSource {
  workbook: XLSX.WorkBook;
  sourceBytes: Buffer;
}

interface ResponseRow {
  physicalRow: number;
  values: Record<string, unknown>;
}

export async function buildDemoData(xlsxPath: string, outputPath: string): Promise<DemoDataset> {
  const { workbook, sourceBytes } = await readWorkbook(xlsxPath);
  validateWorkbook(workbook);

  const rows = getValidatedResponseRows(workbook);
  const variableLabels = getVariableLabels(workbook);
  const factors = SOURCE_MAPPING.qualityFactors.map((id, index): QualityFactorRecord => {
    const label = variableLabels.get(id);
    if (!label) {
      throw new Error(`변수정보 시트 ${id} 변수의 표시 라벨이 비어 있습니다.`);
    }

    return { id, label, order: index + 1 };
  });

  const { cells, missingValueCounts } = aggregateResponses(
    rows.map((row) => ({ ...row.values, __sourceRow: row.physicalRow })),
    SOURCE_MAPPING,
  );
  const companies = getCompanies(rows, SOURCE_MAPPING);
  const industryValues = uniqueTextValues(rows, SOURCE_MAPPING.industryId);
  const sectorValues = uniqueTextValues(rows, SOURCE_MAPPING.sectorId);

  if (industryValues.length !== 1 || industryValues[0] !== '면세점') {
    throw new Error(`업종 값이 첨부자료와 다릅니다: ${industryValues.join(', ') || '값 없음'}`);
  }
  if (sectorValues.length !== 1 || sectorValues[0] !== '도매 및 소매업(G)') {
    throw new Error(`산업 값이 첨부자료와 다릅니다: ${sectorValues.join(', ') || '값 없음'}`);
  }

  const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
  const dataset: DemoDataset = {
    id: `ncsi-dutyfree-2022-${sourceHash.slice(0, 12)}`,
    sourceFile: basename(xlsxPath),
    sourceSheets: [...REQUIRED_SHEETS],
    sourceHash,
    importedAt: new Date().toISOString(),
    mappingVersion: MAPPING_VERSION,
    sourceRowCount: rows.length,
    fieldIds: SOURCE_MAPPING,
    missingValueCounts,
    year: 2022,
    industryId: createStableId('industry', industryValues[0]),
    industryLabel: industryValues[0],
    sectorId: createStableId('sector', sectorValues[0]),
    sectorLabel: sectorValues[0],
    companies,
    factors,
    cells,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');

  const companySummary = companies.map((company) => {
    const companyCells = cells.filter((cell) => cell.companyId === company.id);
    const count = companyCells.reduce((sum, cell) => sum + cell.respondentCount, 0);
    const ncsiTotal = companyCells.reduce((sum, cell) => sum + cell.ncsiSum, 0);
    return `${company.label}: n=${count}, NCSI=${(ncsiTotal / count).toFixed(2)}`;
  });
  console.log(`Validated ${dataset.sourceRowCount} responses (${dataset.year}), SHA-256 ${sourceHash}`);
  console.log(companySummary.join('\n'));
  console.log(`Wrote ${cells.length} aggregate cells to ${resolve(outputPath)}`);

  return dataset;
}

export function validateWorkbook(workbook: XLSX.WorkBook): void {
  getRequiredWorksheets(workbook);
  getHeaderMap(workbook);
  getValidatedResponseRows(workbook);
  getVariableLabels(workbook);
}

async function readWorkbook(xlsxPath: string): Promise<WorkbookSource> {
  const inputPath = resolve(xlsxPath);
  let sourceBytes: Buffer;
  try {
    sourceBytes = await readFile(inputPath);
  } catch {
    throw new Error(`원천 XLSX를 찾을 수 없습니다: ${inputPath}\nZIP에서 ${SOURCE_FILE_NAME} 파일을 .local/source/에 추출한 뒤 다시 실행하세요.`);
  }

  try {
    const workbook = XLSX.read(sourceBytes, { type: 'buffer', cellDates: false, raw: true });
    return { workbook, sourceBytes };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`XLSX 파일을 읽지 못했습니다: ${reason}`);
  }
}

function getRequiredWorksheets(workbook: XLSX.WorkBook): Map<string, XLSX.WorkSheet> {
  const missing = REQUIRED_SHEETS.filter((name) => !workbook.SheetNames.includes(name));
  if (missing.length > 0) {
    throw new Error(`필수 워크시트가 없습니다: ${missing.join(', ')}. 발견된 시트: ${workbook.SheetNames.join(', ')}`);
  }
  return new Map(REQUIRED_SHEETS.map((name) => [name, workbook.Sheets[name]]));
}

function readRows(sheet: XLSX.WorkSheet, sheetName: string): unknown[][] {
  try {
    return XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    }) as unknown[][];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${sheetName} 시트 값을 읽지 못했습니다: ${reason}`);
  }
}

function getHeaderMap(workbook: XLSX.WorkBook): Map<string, number> {
  const sheet = workbook.Sheets[LABEL_SHEET];
  const rows = readRows(sheet, LABEL_SHEET);
  const header = rows[0];
  if (!header) {
    throw new Error(`${LABEL_SHEET} 시트의 field ID header 행이 없습니다.`);
  }

  const headerMap = new Map<string, number>();
  header.forEach((value, index) => {
    const id = textValue(value);
    if (id) headerMap.set(id, index);
  });
  const requiredFields = [
    SOURCE_MAPPING.companyId,
    SOURCE_MAPPING.year,
    SOURCE_MAPPING.industryId,
    SOURCE_MAPPING.sectorId,
    SOURCE_MAPPING.gender,
    SOURCE_MAPPING.ageGroup,
    SOURCE_MAPPING.nationality,
    SOURCE_MAPPING.branch,
    SOURCE_MAPPING.ncsi,
    ...SOURCE_MAPPING.qualityFactors,
  ];
  const missing = requiredFields.filter((id) => !headerMap.has(id));
  if (missing.length > 0) {
    throw new Error(`${LABEL_SHEET} 시트에 필수 변수가 없습니다: ${missing.join(', ')}`);
  }

  for (const id of requiredFields) {
    const occurrences = header.filter((value) => textValue(value) === id).length;
    if (occurrences !== 1) {
      throw new Error(`${LABEL_SHEET} 시트 ${id} 변수가 ${occurrences}회 나타납니다. 정확히 한 열이어야 합니다.`);
    }
  }

  return headerMap;
}

function getValidatedResponseRows(workbook: XLSX.WorkBook): ResponseRow[] {
  const sheet = workbook.Sheets[LABEL_SHEET];
  const rows = readRows(sheet, LABEL_SHEET);
  const headerMap = getHeaderMap(workbook);
  const responseRows = rows.slice(2)
    .map((values, offset) => ({ physicalRow: offset + 3, values }))
    .filter(({ values }) => values.some((value) => value !== null && value !== undefined && textValue(value) !== ''));

  if (responseRows.length !== EXPECTED_RESPONSE_COUNT) {
    throw new Error(`${LABEL_SHEET} 시트 응답 행 수가 다릅니다: ${responseRows.length}건 (기대값 ${EXPECTED_RESPONSE_COUNT}건). 설명 행을 제외한 응답만 확인하세요.`);
  }

  const requiredRowFields = [
    SOURCE_MAPPING.companyId,
    SOURCE_MAPPING.year,
    SOURCE_MAPPING.industryId,
    SOURCE_MAPPING.sectorId,
    SOURCE_MAPPING.ncsi,
  ];
  const mappedRows = responseRows.map(({ physicalRow, values }) => {
    const record: Record<string, unknown> = {};
    for (const [fieldId, columnIndex] of headerMap.entries()) {
      record[fieldId] = values[columnIndex] ?? null;
    }

    for (const fieldId of requiredRowFields) {
      if (record[fieldId] === null || record[fieldId] === undefined || textValue(record[fieldId]) === '') {
        throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 ${fieldId}: 필수값이 비어 있습니다.`);
      }
    }

    const year = parseYear(record[SOURCE_MAPPING.year], physicalRow);
    if (year !== 2022) {
      throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 YEAR: 2022년 값이 아닙니다.`);
    }
    if (numericValue(record[SOURCE_MAPPING.ncsi]) === null) {
      throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 ${SOURCE_MAPPING.ncsi}: NCSI 값이 숫자가 아니거나 비어 있습니다.`);
    }

    for (const factorId of SOURCE_MAPPING.qualityFactors) {
      const value = record[factorId];
      if (value !== null && value !== undefined && textValue(value) !== '' && numericValue(value) === null) {
        throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 ${factorId}: 숫자가 아닌 값 '${String(value)}'입니다.`);
      }
    }

    return { physicalRow, values: record };
  });

  const companies = new Map<string, number>();
  for (const row of mappedRows) {
    const company = requiredText(row.values[SOURCE_MAPPING.companyId], SOURCE_MAPPING.companyId, row.physicalRow);
    companies.set(company, (companies.get(company) ?? 0) + 1);
  }
  if (companies.size !== EXPECTED_FIRM_COUNT) {
    throw new Error(`기업 수가 다릅니다: ${companies.size}개 (기대값 ${EXPECTED_FIRM_COUNT}개).`);
  }
  for (const [company, count] of companies) {
    if (count !== EXPECTED_RESPONSES_PER_FIRM) {
      throw new Error(`${company} 응답 행 수가 ${count}건입니다 (기대값 ${EXPECTED_RESPONSES_PER_FIRM}건).`);
    }
  }

  return mappedRows;
}

function getVariableLabels(workbook: XLSX.WorkBook): Map<string, string> {
  const rows = readRows(workbook.Sheets[VARIABLE_SHEET], VARIABLE_SHEET);
  const header = rows[0]?.map(textValue) ?? [];
  const fieldIndex = header.indexOf('변수명');
  const labelIndex = header.indexOf('변수 라벨');
  if (fieldIndex === -1 || labelIndex === -1) {
    throw new Error(`${VARIABLE_SHEET} 시트에 '변수명' 및 '변수 라벨' 컬럼이 필요합니다.`);
  }

  const labels = new Map<string, string>();
  for (const row of rows.slice(1)) {
    const fieldId = textValue(row[fieldIndex]);
    const label = textValue(row[labelIndex]);
    if (fieldId && label) labels.set(fieldId, label);
  }
  return labels;
}

function getCompanies(rows: ResponseRow[], mapping: SourceMapping): CompanyRecord[] {
  const unique = new Map<string, CompanyRecord>();
  for (const row of rows) {
    const label = requiredText(row.values[mapping.companyId], mapping.companyId, row.physicalRow);
    const industry = requiredText(row.values[mapping.industryId], mapping.industryId, row.physicalRow);
    const sector = requiredText(row.values[mapping.sectorId], mapping.sectorId, row.physicalRow);
    unique.set(label, {
      id: createStableId('company', label),
      label,
      industryId: createStableId('industry', industry),
      sectorId: createStableId('sector', sector),
    });
  }
  return [...unique.values()].sort((left, right) => left.label.localeCompare(right.label, 'ko'));
}

function uniqueTextValues(rows: ResponseRow[], fieldId: string): string[] {
  return [...new Set(rows.map((row) => textValue(row.values[fieldId])).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
}

function requiredText(value: unknown, fieldId: string, physicalRow: number): string {
  const text = textValue(value);
  if (!text) {
    throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 ${fieldId}: 필수 텍스트 값이 비어 있습니다.`);
  }
  return text;
}

function textValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function numericValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseYear(value: unknown, physicalRow: number): number {
  const match = textValue(value).match(/\d{4}/);
  const year = match ? Number(match[0]) : Number.NaN;
  if (!Number.isInteger(year)) {
    throw new Error(`${LABEL_SHEET} 시트 ${physicalRow}행 ${SOURCE_MAPPING.year}: 연도를 해석할 수 없습니다.`);
  }
  return year;
}

async function run(): Promise<void> {
  const inputPath = process.env.CX_NCSI_SOURCE ?? resolve('.local/source', SOURCE_FILE_NAME);
  const outputPath = resolve('src/data/generated/ncsi-2022.json');
  await buildDemoData(inputPath, outputPath);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
