# Task: T10 Diagnostic Generation & Consultant Review

## Status: done

## Goal

프로젝트 고정 대상/경쟁군과 선택 데이터/템플릿으로 NCSI 보고서 초안을 구성하고, 검증 가능한 근거를 표시하며 컨설턴트가 서술을 검토·확정할 수 있게 한다.

## Decision Summary

- 수치/표/데이터 차트는 계산된 source binding으로 잠그고 텍스트 해석만 컨설턴트가 수정한다.
- 발행본은 최신 1개만 유지한다. template/data/calculation snapshot을 함께 보존한다.

## Implementation

### I01. 템플릿 바인딩/스냅샷/초안 생성

- Related Files:
  - `src/domain/diagnostic-report.ts` :: `DiagnosticReport`, `RenderedContainer`, `DiagnosticSnapshot`, `ReviewIssue` — generated report contract; new
  - `src/services/demo-diagnostic-report-engine.ts` :: `DemoDiagnosticReportEngine.generate`, `bindContainer`, `checkDraft` — local generator; new
  - `src/services/report-snapshot-store.ts` :: `ReportSnapshotStore.replaceLatest`, `getLatest` — one-current-final store; new
  - `src/features/diagnostic-report/pages/ConsultantReportReviewPage.tsx` :: `ConsultantReportReviewPage`; new
  - `src/features/diagnostic-report/components/ContainerEditor.tsx` :: `ContainerEditor`; new
  - `src/features/diagnostic-report/components/EvidenceDrawer.tsx` :: `EvidenceDrawer`; new
  - `src/services/container.ts` :: `generateDiagnosticReport` binding; modify

#### Details

- **Signatures & Types:**
  ```ts
  export interface DiagnosticSnapshot {
    projectId: string; datasetId: string; sourceHash: string; filters: AnalysisFilters;
    subjectCompanyId: string; comparisonCompanyIds: string[]; calculationVersion: string;
    templateId: string; templateVersion: string; generatedAt: string;
  }
  export interface RenderedContainer {
    containerId: string; kind: ContainerKind; scope: ContentScope[];
    value: string | MetricValue | SeriesPoint[]; editable: boolean;
    evidence: EvidenceRef[]; exampleLabel?: string; reviewState: 'ready'|'missing'|'overflow';
  }
  export interface DiagnosticReport { id: string; projectId: string; status: 'draft'|'in-review'|'finalized'; snapshot: DiagnosticSnapshot; pages: Array<{pageNumber:number; containers:RenderedContainer[]}>; finalizedAt:string|null }
  export interface DemoDiagnosticReportEngine { generate(input: DiagnosticReportInput): Promise<DiagnosticReport>; updateNarrative(reportId:string, containerId:string, text:string): DiagnosticReport; finalize(reportId:string, reviewerId:string): DiagnosticReport }
  ```
- **Generate:** require project, selected dataset readiness, project target/comparators, exact 2022 period/source, template version. Build every page/container from template order. Computed values call T03 analytics using explicit scope/company IDs. `ai-draft` may use only approved project reference items and analytical facts; deterministic local text adapter produces a draft, not an LLM. Static containers load fixed KPC/NCSI general copy. If source cannot supply the binding, output `missing` and preserve the container; broader approved context fallback is permitted only when template explicitly lists that scope, it must label the source scope, and NCSI target KPI slots may never fallback.
- **Locking:** `editable=false` for any MetricValue/SeriesPoint/table/charts/score; consultant cannot overwrite numeric payload. Narrative container is editable and validates required points/max characters. Evidence drawer shows field IDs, formula ID, dataset/hash, filters/scope/n. Edits do not mutate evidence.
- **Review:** page outline shows ready/missing/overflow statuses and allows jump to page/container. `최종 확정` disabled if required NCSI binding missing, number lacks EvidenceRef, scope absent, required point missing, or text exceeds max length. User can edit narrative and retry validation.
- **Snapshot/history:** keep one latest finalized report per project; re-finalizing corrected report replaces prior published artifact. Snapshot records dataset ID/version/hash, all filters/survey conditions, official calculation version and template version. Draft report and narrative review data stored in localStorage for demo only; company endpoint reads only finalized artifact.
- **Roles:** only assigned consultant may generate/review; company route can read only final report; admin can inspect status but not edit narrative.

## Acceptance Criteria

- [x] Generation creates all 104 ordered pages, with values only in configured template bindings.
- [x] Every KPI/chart/table numeric payload is non-editable and has traceable source evidence.
- [x] AI text/narrative can be reviewed and edited; missing required evidence or invalid text blocks finalization.
- [x] The published-report reader returns only the latest final; correction replaces the prior final; snapshots preserve source/config versions.

## Validation

- `npm.cmd run typecheck` — report domain/engine/review UI compile.
- `npm.cmd run build` — template and local report engine bundle.

## Commit Message

```text
feat(ncsi): add source bound generation and review workflow

Plan: 2026-09-27-kpc-cx-prototype
Phase: P03-diagnostic-report-and-admin
Task: T10-report-generation-and-review

- Generate the full report from versioned template and fixed project scope
- Lock numeric content to provenance and add consultant review/finalization
```

## Progress

- [x] Implementation complete: source-bound report generation, browser draft storage, final-only publication store, and assigned-consultant review UI.
- [x] Validation passed: `npm.cmd run typecheck`, `npm.cmd run build`.
- Required containers without an approved reference or supported respondent metric remain marked missing and block finalization; no sample scores are substituted.
- One source-map generation condition is absent in extracted text and is explicitly surfaced for consultant review.
- commit: 290967e

