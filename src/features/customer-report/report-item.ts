import type { CustomerReportItem, CustomerReportItemType } from '../../domain/reports';
import type { EvidenceRef } from '../../domain/analytics';
import type { DimensionValues } from '../../data/schema';

export function createReportItem(input: {
  type: CustomerReportItemType;
  title: string;
  payload: CustomerReportItem['payload'];
  evidence: EvidenceRef[];
}): CustomerReportItem {
  return {
    id: `report-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    title: input.title,
    annotation: '',
    payload: input.payload,
    evidence: input.evidence.map((evidence) => ({ ...evidence, fieldIds: [...evidence.fieldIds], filters: { ...evidence.filters } })),
  };
}

export function describeReportFilters(filters: DimensionValues): string {
  const labels: Record<string, string> = { gender: '성별', ageGroup: '연령대', nationality: '국적', branch: '지점' };
  const active = Object.entries(filters).filter(([, value]) => Boolean(value));
  return active.length === 0 ? '전체 응답' : active.map(([key, value]) => `${labels[key] ?? key} ${value}`).join(' · ');
}
