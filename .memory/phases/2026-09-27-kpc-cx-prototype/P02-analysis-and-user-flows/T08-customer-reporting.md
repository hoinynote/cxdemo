# Task: T08 Customer Reporting

## Status: done

## Goal

기업 고객이 대시보드의 데이터 시각화/KPI와 AI 분석 결과를 골라 한 번의 업무용 보고서로 정리하고 PPTX 또는 PDF로 내보낼 수 있게 한다.

## Decision Summary

- 메뉴 기반 보고서 라이브러리/저장 이력은 없다. 분석 화면의 `리포트에 담기`로 시작하는 일회 구성이다.
- 사용자는 요소 순서와 짧은 설명만 조정하며 원천 KPI·차트 수치는 편집할 수 없다.

## Implementation

### I01. 보고서 작성 세션과 미리보기

- Related Files:
  - `src/domain/reports.ts` :: `CustomerReportDraft`, `CustomerReportItem` — reuse T03 wire schema; modify
  - `src/features/customer-report/report-item.ts` :: `createReportItem` — evidence-preserving factory; new
  - `src/state/CustomerReportProvider.tsx` :: `CustomerReportProvider`, `useCustomerReport` — in-memory draft; new
  - `src/features/customer-report/CustomerReportComposer.tsx` :: `CustomerReportComposer` — editor page; new
  - `src/features/customer-report/ReportItemList.tsx` :: `ReportItemList` — reorder/remove; new
  - `src/features/customer-report/ReportItemPreview.tsx` :: `ReportItemPreview` — content preview; new
  - `src/features/analysis/components/AddToReportButton.tsx` :: `AddToReportButton`; new
  - `src/services/customer-report-exporter.ts` :: `CustomerReportExporter.export` — file generation contract; new
  - `src/services/container.ts` :: `ReportEnginePort` binding; modify
  - `package.json` :: `pptxgenjs`, `jspdf`, `html2canvas` dependencies; modify

#### Details

- **Signatures & Types:**
  ```ts
  export interface CustomerReportDraft {
    id: string; title: string; projectId: string; scopeLabel: string; filters: AnalysisFilters;
    items: CustomerReportItem[]; createdAt: string;
  }
  export type CustomerReportItemType = 'metric'|'chart'|'ai-insight';
  export interface CustomerReportItem {
    id: string; type: CustomerReportItemType; title: string; annotation: string;
    payload: MetricValue | SeriesPoint[] | AiAnswer; evidence: EvidenceRef[];
  }
  export interface CustomerReportExporter { export(report: CustomerReportDraft, format: 'pptx'|'pdf'): Promise<Blob> }
  export function createReportItem(input: {type: CustomerReportItemType; title: string; payload: CustomerReportItem['payload']; evidence: EvidenceRef[]}): CustomerReportItem;
  ```
- Reuse T03's equivalent domain types; do not duplicate divergent wire shapes. Provider state lives in memory only. Closing browser/session discards the draft. There is no history page or report draft persistence.
- `AddToReportButton` captures only the active view model or AI answer and its existing evidence; it cannot accept raw data. Start a composer session with current company/project title/filter snapshot on first add. Show a small confirmation that the content was added.
- Composer lets user change title, reorder/remove elements and edit one plain-text annotation per element (max 240 characters). No free-layout canvas, formula edit, invented data input, font/theme chooser, or saved template library. Display human-readable source/year only; internal evidence IDs and source variables remain in the data model and are not rendered to company users.
- Provide a simple preview with title, report date, project scope, numbered elements and page breaks. Empty report gives a single call to return to analysis; export buttons disabled until at least one element exists.
- **PPTX export:** `pptxgenjs` creates 16:9 slides; title cover plus one item per slide, KPC token colors, text, annotation, source note, data label and chart/KPI. Never rasterize respondent rows.
- **PDF export:** render the same preview DOM to page canvases with `html2canvas` and `jsPDF` using 16:9 page aspect; wait for all fonts/SVG charts before capture. Export is client-side and returns a downloadable blob.
- File naming: `CX-Report-{companySlug}-{YYYYMMDD}.{pptx|pdf}`. Revoke blob URLs after download.

## Acceptance Criteria

- [x] `리포트에 담기` carries selected chart or AI result and its source evidence into one in-memory composition.
- [x] User can reorder/remove items and edit short explanatory text, but not metric values.
- [x] PPTX and PDF exports contain matching report items, current values, scope and source notes.
- [x] Refreshing/closing clears the one-time report; no menu or persisted report library appears.

## Validation

- `npm.cmd run typecheck` — report composer and exporter contracts compile.
- `npm.cmd run build` — export dependencies bundle for local browser execution.

## Commit Message

```text
feat(reporting): add one time customer report composer

Plan: 2026-09-27-kpc-cx-prototype
Phase: P02-analysis-and-user-flows
Task: T08-customer-reporting

- Compose dashboard and AI results with fixed source evidence
- Export the one time customer report as PPTX or PDF
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: `2698576`
