# Task: T11 Diagnostic Preview & Export

## Status: done

## Goal

컨설턴트/기업 고객이 같은 104페이지 보고서 레이아웃을 미리보고, 확정 후 PPTX와 PDF를 원본 수치/근거와 함께 내려받게 한다.

## Decision Summary

- 미리보기는 T09의 104페이지 버전 템플릿과 T10 렌더 데이터로 화면을 구성한다.
- 기업 고객은 헤더의 NCSI 다운로드 버튼에서 최신 확정본을 바로 받는다. 컨설턴트는 초안/검토본도 볼 수 있다.

## Implementation

### I01. 페이지 렌더링과 전체 보고서 탐색

- Related Files:
  - `src/features/diagnostic-report/preview/DiagnosticReportViewer.tsx` :: `DiagnosticReportViewer` — role-aware report reader; new
  - `src/features/diagnostic-report/preview/DiagnosticPageCanvas.tsx` :: `DiagnosticPageCanvas` — source-ratio container renderer; new
  - `src/features/diagnostic-report/preview/ReportTable.tsx` :: `ReportTable` — evidence-linked table; new
  - `src/features/diagnostic-report/preview/ReportChart.tsx` :: `ReportChart` — source-linked chart; new
  - `src/features/diagnostic-report/preview/ReportPageNavigation.tsx` :: `ReportPageNavigation` — outline/page jump; new
  - `src/features/diagnostic-report/preview/report-preview.css` — print/page layout; new
  - `src/services/report-exporter.ts` :: `DiagnosticReportExporter.exportPptx`, `exportPdf`; new
  - `src/services/customer-report-exporter.ts` :: share download utilities/adapter; modify
  - `src/layouts/WorkspaceLayout.tsx` :: latest NCSI download action; modify

#### Details

- **Signatures & Types:**
  ```ts
  export interface DiagnosticReportExporter {
    exportPptx(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole:'company'|'consultant'): Promise<Blob>;
    exportPdf(report: DiagnosticReport, template: DiagnosticTemplate, audienceRole:'company'|'consultant'): Promise<Blob>;
  }
  export function DiagnosticReportViewer(props: {report: DiagnosticReport; mode:'review'|'final'}): JSX.Element;
  export function DiagnosticPageCanvas(props: {page: DiagnosticPage; content: DiagnosticReport['pages'][number]}): JSX.Element;
  ```
- **Viewer:** render exact page count/order, the source PPTX ratio (10.8333 × 7.5 inches; 13:9), section headings, content containers at configured normalized coordinates. Show page chooser/outline, current page/104, zoom fit, and scope badges. Numeric cells must use stored report payload and preserve display precision; charts use project series. Company view shows final values and interpretation with human-readable scope/period only; consultant view additionally shows internal evidence details. Example-only/missing data state stays labeled on the page and never displays a fabricated value.
- **Export reuse:** same `DiagnosticPageCanvas` templates feed PDF and PPTX so layout/content do not diverge. Use the source page size for a custom `pptxgenjs` layout; use `html2canvas` + `jspdf` to capture each page canvas into correctly ordered PDF pages with the same 13:9 ratio. Wait for fonts/SVG to complete. Include human-readable period/scope footer, sample/example labels and page numbers; omit internal field IDs/calculation diagnostics from company exports. PDF/PPTX file names `NCSI-{companySlug}-{year}-final-{YYYYMMDD}.{pdf|pptx}`.
- **Final download:** WorkspaceLayout company header action calls `ReportSnapshotStore.getLatestFinal(projectId)`, requests selected canonical export and downloads immediately. It must not open a report menu. If no report is finalized, disabled button has short `확정 보고서 없음` explanation. Consultant review route can export a draft with visible `검토용` watermark; company route cannot read draft.
- **Reissue:** T10's replaceLatest behavior means only current finalized report is offered to the company. Do not expose prior final revision selector/history.
- **Fidelity constraint:** the supplied PPTX is 10.8333 × 7.5 inches (13:9), not 16:9. Preserve its actual ratio and geometry. No sample slide image with embedded A/B/C numeric results can be reused as a dynamic live page background. Use sample as exact layout/color/type reference and render dynamic content containers.

## Acceptance Criteria

- [x] Full report preview supports all 104 pages in exact order/layout with page navigation.
- [x] Source-linked numbers/charts, scope tags, examples and missing states are consistent between preview and both exports.
- [x] Company can download latest finalized report immediately; draft is inaccessible to company role.
- [x] PPTX and PDF use the source page ratio/order and contain no sample slide backgrounds.

## Validation

- [x] `npm.cmd run typecheck` — renderer/export interfaces compile.
- [x] `npm.cmd run build` — report viewers and export adapters bundle.

## Commit Message

```text
feat(ncsi): add full report preview and export

Plan: 2026-09-27-kpc-cx-prototype
Phase: P03-diagnostic-report-and-admin
Task: T11-report-preview-and-export

- Render the 104 page report from versioned containers
- Export matching PPTX/PDF and latest finalized company download
```

## Progress

- [x] Implementation complete: 104-page viewer/navigation, consultant draft export, latest-final-only company PDF button, PDF/PPTX output.
- [x] Validation passed: `npm.cmd run typecheck`, `npm.cmd run build`.
- The report sample is 10.8333 × 7.5 inches (13:9); output preserves this ratio instead of the earlier 16:9 plan assumption.
- PPTX pages are rasterized from the shared page canvas to keep preview/PDF/PPTX composition aligned; exported slides are visually faithful but not individually editable text/shapes.
- Missing source content remains labeled in the report. No sample numeric background is included.
- commit: pending
- commit: pending
