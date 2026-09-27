# Task: T03 Domain Models & Service Ports

## Status: done

## Goal

앱 화면이 원천 파싱·계산 코드에 직접 의존하지 않도록 필터, 분석결과, 근거, AI, 업로드 검증, 보고서 서비스 계약을 정의하고 실데이터 계산 어댑터를 만든다.

## Decision Summary

- 이 프로토타입의 구현체는 로컬 `DemoDataset`을 읽지만 화면은 인터페이스만 호출한다.
- 필터 결과는 원천 NCSI/품질요인 집계를 이용하고 범위 밖 수치는 `null`로 표현한다. 고급 통계 모델은 구현하지 않는다.

## Implementation

### I01. 도메인 모델 및 서비스 인터페이스

- Related Files:
  - `src/domain/filters.ts` :: `AnalysisFilters`, `FilterOption`, `DEFAULT_FILTERS` — 공통 검색 조건; new
  - `src/domain/analytics.ts` :: `MetricValue`, `AnalysisResult`, `EvidenceRef`, `SeriesPoint` — 계산 응답 계약; new
  - `src/domain/reports.ts` :: `ReportEnginePort`, `ReportSnapshot`, `ExportFormat` — 보고서 경계; new
  - `src/domain/ai.ts` :: `AiAnalysisPort`, `AiQuestion`, `AiAnswer`, `AnswerFeedback` — AI 경계; new
  - `src/domain/data-import.ts` :: `ImportValidationPort`, `ValidationIssue`, `DatasetReadiness` — 업로드 검증 경계; new
  - `src/data/schema.ts` :: `DemoDataset.industryLabel`, `sectorLabel` — source-backed filter labels; modify
  - `scripts/build-demo-data.ts` :: include labels in generated dataset; modify
  - `src/data/generated/ncsi-2022.json` :: regenerated typed dataset with labels; generated
  - `src/services/demo-analytics.ts` :: `DemoAnalyticsService` — local aggregate implementation; new
  - `src/services/container.ts` :: `createServiceContainer` — 구현체 등록; new
  - `src/data/generated/ncsi-2022.json` :: `DemoDataset` — T02 generated data; read-only

#### Details

- **Signatures & Types:**
  ```ts
  export interface AnalysisFilters {
    year: 2022; industryId: string; subjectCompanyId: string;
    comparisonCompanyIds: string[]; dimensions: DimensionValues;
  }
  export const DEFAULT_FILTERS: AnalysisFilters;
  export interface FilterOption { id: string; label: string; group: 'year'|'industry'|'company'|'dimension'; dimensionKey?: DimensionKey; enabled: boolean }
  export interface EvidenceRef {
    datasetId: string; sourceHash: string; fieldIds: string[]; companyId: string;
    year: number; filters: DimensionValues; respondentCount: number | null;
    calculationId: 'ncsi-source-mean' | 'factor-source-mean';
  }
  export interface MetricValue { value: number | null; unit: 'score' | 'percent' | 'count'; evidence: EvidenceRef | null; unavailableReason?: string }
  export interface SeriesPoint { id: string; label: string; value: number | null; respondentCount: number; evidence: EvidenceRef | null; unavailableReason?: string }
  export interface AnalysisResult { subjectNCSI: MetricValue; comparisonSeries: SeriesPoint[]; factorScores: SeriesPoint[]; respondentCount: number; filters: AnalysisFilters }
  export interface CustomerReportItem {
    id: string; type: 'metric'|'chart'|'ai-insight'; title: string; annotation: string;
    payload: MetricValue | SeriesPoint[] | AiAnswer; evidence: EvidenceRef[];
  }
  export interface CustomerReportDraft { id: string; title: string; projectId: string; filters: AnalysisFilters; items: CustomerReportItem[]; createdAt: string }
  export interface DiagnosticReportInput { projectId: string; datasetId: string; templateId: string; templateVersion: string; filters: AnalysisFilters }
  export interface DiagnosticDraft { id: string; input: DiagnosticReportInput; status: 'draft'|'review'|'finalized'; createdAt: string; finalizedAt: string|null }
  export interface ReportSnapshot { datasetId: string; sourceHash: string; filters: AnalysisFilters; calculationVersion: string; templateId: string; templateVersion: string; createdAt: string }
  export interface ValidationIssue { fieldId:string; message:string; severity:'error'|'warning' }
  export interface DatasetReadiness { status: 'ready'|'blocked'|'partial'; issues: ValidationIssue[]; mappedFieldIds: string[] }
  export type ExportFormat = 'pptx'|'pdf';
  export interface AiQuestion { text: string; filters: AnalysisFilters; screenId: string; history: Array<{role:'user'|'assistant'; text:string}> }
  export interface AiAnswer { text: string; result: AnalysisResult; evidence: EvidenceRef[]; followUpSuggestions: string[]; deterministicKey: string }
  export interface AnswerFeedback { answerId:string; role:'company'|'consultant'; projectId:string; value:'helpful'|'not-helpful'; comment?:string; createdAt:string }
  export interface AiAnalysisPort { ask(question: AiQuestion): Promise<AiAnswer>; submitFeedback(input: AnswerFeedback): Promise<void> }
  export interface ReportEnginePort { exportCustomerReport(report: CustomerReportDraft, format: ExportFormat): Promise<Blob>; generateDiagnosticReport(input: DiagnosticReportInput): Promise<DiagnosticDraft> }
  export interface ImportValidationPort { validate(file: File): Promise<DatasetReadiness> }
  export class DemoAnalyticsService {
    constructor(dataset: DemoDataset);
    analyze(filters: AnalysisFilters): AnalysisResult;
    getFilterOptions(): FilterOption[];
    getDatasetStatus(): {year: 2022; sourceHash: string; rowCount: number; ready: boolean};
  }
  ```
- **Aggregation logic:** match company, exact year, exact industry and every non-empty dimension filter against aggregate cells, then sum `respondentCount`, `ncsiSum`, `factorSums`, and `factorCounts`. NCSI value = `ncsiSum / respondentCount`; factor value = `factorSums[factorId] / factorCounts[factorId]` to handle source nulls. Preserve full precision until formatting. Official subject score and comparator series are separate values. `subjectCompanyId` is never folded into competitor labels.
- **Validation:** require available `year=2022`, known industry, known subject company, distinct existing comparisons excluding subject. Empty filter fields mean all respondents. Unknown period/company yields a typed unavailable state, never fallback to another scope.
- **Evidence:** every metric includes dataset ID/hash, field IDs, target company, year, active dimensions, `n`, and formula identifier. No raw respondent record can be returned from `DemoAnalyticsService`.
- **Service container:** return `{analytics, ai, reports, importValidator}`; initially analytics is local implementation. AI and report ports are wired in their phase tasks. Missing implementation is a typed `ServiceNotConfiguredError`, not hard-coded UI data.
- **Source labels:** add `industryLabel` and `sectorLabel` to `DemoDataset` and populate from the validated workbook values (`면세점`, `도매 및 소매업(G)`) so filter options never reconstruct names from IDs.

## Acceptance Criteria

- [ ] Screens can request subject and competitor metrics using only the service contracts.
- [ ] Selecting dimensions recalculates NCSI from grouped source sums and displays n/evidence.
- [ ] An unavailable metric has an explicit reason and cannot silently reuse a broader NCSI score.

## Validation

- `npm.cmd run typecheck` — domain and adapter signatures compile.
- `npm.cmd run build` — generated dataset and container import successfully.

## Commit Message

```text
feat(domain): define CX service ports and source-backed analytics

Plan: 2026-09-27-kpc-cx-prototype
Phase: P01-foundation-data-access
Task: T03-domain-and-service-ports

- Define filter, evidence, AI, import and report contracts
- Add a local aggregate analytics adapter with explicit missing states
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`, 집계/필터 smoke check)
- commit: `feat(domain): define CX service ports and source-backed analytics`
