import type { AggregateCell, DimensionValues, SourceMapping } from './schema';

export interface AggregateResult {
  cells: AggregateCell[];
  missingValueCounts: Record<string, number>;
}

const DIMENSION_FIELDS: Array<[keyof DimensionValues, keyof SourceMapping]> = [
  ['gender', 'gender'],
  ['ageGroup', 'ageGroup'],
  ['nationality', 'nationality'],
  ['branch', 'branch'],
];

export function aggregateResponses(
  rows: Record<string, unknown>[],
  mapping: SourceMapping,
): AggregateResult {
  const groups = new Map<string, AggregateCell>();
  const missingValueCounts = Object.fromEntries(mapping.qualityFactors.map((id) => [id, 0]));

  for (const [index, row] of rows.entries()) {
    const physicalRow = typeof row.__sourceRow === 'number' ? row.__sourceRow : index + 2;
    const companyLabel = requiredText(row[mapping.companyId], mapping.companyId, physicalRow);
    requiredText(row[mapping.industryId], mapping.industryId, physicalRow);
    requiredText(row[mapping.sectorId], mapping.sectorId, physicalRow);
    const year = parseYear(row[mapping.year], physicalRow);
    if (year !== 2022) {
      throw new Error(`행 ${physicalRow} ${mapping.year}: 2022년 데이터만 허용됩니다 (값: ${String(row[mapping.year])}).`);
    }

    const ncsiValue = numericValue(row[mapping.ncsi]);
    if (ncsiValue === null) {
      throw new Error(`행 ${physicalRow} ${mapping.ncsi}: NCSI 값이 숫자가 아니거나 비어 있습니다.`);
    }

    const dimensions: DimensionValues = {};
    for (const [dimensionKey, mappingKey] of DIMENSION_FIELDS) {
      const fieldId = mapping[mappingKey] as string;
      dimensions[dimensionKey] = textValue(row[fieldId]) || '미기재';
    }

    const companyId = createStableId('company', companyLabel);
    const key = JSON.stringify([companyId, year, dimensions.gender, dimensions.ageGroup, dimensions.nationality, dimensions.branch]);
    let cell = groups.get(key);
    if (!cell) {
      cell = {
        companyId,
        year: 2022,
        dimensions,
        respondentCount: 0,
        ncsiSum: 0,
        factorSums: Object.fromEntries(mapping.qualityFactors.map((id) => [id, 0])),
        factorCounts: Object.fromEntries(mapping.qualityFactors.map((id) => [id, 0])),
      };
      groups.set(key, cell);
    }

    cell.respondentCount += 1;
    cell.ncsiSum += ncsiValue;
    for (const factorId of mapping.qualityFactors) {
      const rawFactor = row[factorId];
      if (rawFactor === null || rawFactor === undefined || textValue(rawFactor) === '') {
        missingValueCounts[factorId] += 1;
        continue;
      }

      const factorValue = numericValue(rawFactor);
      if (factorValue === null) {
        throw new Error(`행 ${physicalRow} ${factorId}: 숫자가 아닌 값 '${String(rawFactor)}'입니다.`);
      }
      cell.factorSums[factorId] += factorValue;
      cell.factorCounts[factorId] += 1;
    }

  }

  return { cells: [...groups.values()], missingValueCounts };
}

export function createStableId(prefix: string, label: string): string {
  const slug = label.normalize('NFKC').trim().toLocaleLowerCase('ko')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${prefix}-${slug}`;
}

function requiredText(value: unknown, fieldId: string, physicalRow: number): string {
  const text = textValue(value);
  if (!text) throw new Error(`행 ${physicalRow} ${fieldId}: 필수 텍스트 값이 비어 있습니다.`);
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
  if (!Number.isInteger(year)) throw new Error(`행 ${physicalRow}: 연도를 해석할 수 없습니다.`);
  return year;
}
