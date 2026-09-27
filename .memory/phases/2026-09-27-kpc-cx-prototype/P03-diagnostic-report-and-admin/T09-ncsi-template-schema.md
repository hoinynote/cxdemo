# Task: T09 NCSI 104-page Template Schema

## Status: done

## Goal

제공된 진단보고서의 모든 104페이지 목차와 콘텐츠 위치를 의미 있는 버전형 데이터 구조로 표현하고, 실제 데이터/AI 초안/고정 문구의 위치와 범위를 명시한다.

## Decision Summary

- 첨부 PPTX를 구조/레이아웃 기준으로 사용하며 A/B/C 사례 수치를 기본 템플릿 값으로 복사하지 않는다.
- 콘텐츠 태그는 개별 컨테이너 단위다. NCSI 숫자는 source-bound이며 AI가 작성하지 않는다.

## Implementation

### I01. 타입 계약과 104페이지 템플릿 데이터

- Related Files:
  - `src/domain/diagnostic-template.ts` :: `DiagnosticTemplate`, `DiagnosticPage`, `DiagnosticContainer`, `ContentScope`, `ContainerKind` — template schema; new
  - `src/report-templates/ncsi-2022-v1.ts` :: `NCSI_2022_V1` — full ordered 104 page configs; new
  - `src/report-templates/ncsi-2022-v1.manifest.md` :: page-by-page source mapping rationale; new
  - `src/features/diagnostic-report/template/TemplateOutline.tsx` :: `TemplateOutline` — ordered page outline; new
  - `src/features/diagnostic-report/template/ContainerScopeBadge.tsx` :: `ContainerScopeBadge`; new

#### Details

- **Signatures & Types:**
  ```ts
  export type ContentScope = 'customer-specific'|'industry-general'|'sector-general'|'overall-general';
  export type ContainerKind = 'static'|'computed'|'ai-draft';
  export type DataBindingKind = 'ncsi'|'quality-factor'|'respondent-behavior'|'reference'|'none';
  export interface ReportContainer {
    id: string; title: string; kind: ContainerKind; scopes: ContentScope[];
    pageArea: {x: number; y: number; width: number; height: number};
    requiredPoints: string[]; maxCharacters: number|null; dataBinding: DataBindingKind;
    sourceFieldIds: string[]; calculationId: string|null; required: boolean;
    exampleLabel?: string;
  }
  export interface DiagnosticPage { number: number; sectionId: string; title: string; layoutId: string; containers: ReportContainer[] }
  export interface DiagnosticTemplate { id: 'ncsi-diagnostic'; version: string; pageSize: {width: number;height:number}; pages: DiagnosticPage[] }
  export const NCSI_2022_V1: DiagnosticTemplate;
  ```
- **Source:** use the provided 104-slide NCSI report PPTX as the layout/content reference (inside `.local/source` after extraction from `cxgrillme.zip`). Preserve exact slide order, section/page headings, content role and visual area in page-space coordinates. Do not use competitor A/B/C hard mapping. The A/B/C numeric report sample is reference-only; bind dynamic values through source field IDs and project selections.
- **All pages:** exactly 104 page entries, page number 1–104 once, each has 1+ containers. Keep NCSI overview; diagnostic results (metrics, main quality factors, customer behavior); improvement strategies (industry status, priorities, direction, action plans); KPC appendix; methodology appendix. `manifest.md` maps each page number to source slide title, stable container IDs, exact area/order, scope, content type, required points, source/calculation bindings, and whether a sample-specific value must display as `예시` in prototype.
- **Scopes:** map four scopes explicitly per container. `customer-specific`, `industry-general`, `sector-general`, `overall-general` mean company-specific, 업종별 일반사항, 산업별 일반사항, 전체 일반사항. One chart container may list multiple scopes only if each rendered series carries its own source/scope label.
- **Data bindings:** every computed container must list actual source field IDs and formula ID. NCSI values use only official source NCSI field / fixed source-backed rule. Bind no `ai-draft` to a numeric KPI/table cell. Text-only container has `requiredPoints`, `maxCharacters`, and approved-reference binding. Unsupported input has no fake data; keep the container and label its content as prototype example or data unavailable as appropriate.
- **Position model:** coordinates normalized to 0–1000 relative to the actual source PPTX canvas (10.8333 × 7.5 inches; 13:9), origin top-left. Container Map regions are translated into normalized page areas and need rendered-slide calibration before pixel-perfect export. Static image backgrounds must not include sample company/competitor numbers in live slots.

## Acceptance Criteria

- [x] Template contains ordered 104 pages and preserves the report's full section/content structure.
- [x] Every container has unique ID, content kind, scope, size, required content and source binding definition.
- [x] Numeric NCSI objects cannot be assigned to AI-generated containers; sample-only unsupported content is visibly marked.
- [x] Competitor identities come from project settings, not sample A/B/C inference.

## Validation

- [x] `npm.cmd run typecheck` — template schema compiles.
- [x] `npm.cmd run build` — 104-page config imports without runtime generation.

## Commit Message

```text
feat(ncsi): define versioned 104 page report template

Plan: 2026-09-27-kpc-cx-prototype
Phase: P03-diagnostic-report-and-admin
Task: T09-ncsi-template-schema

- Map report sample pages into scoped typed containers
- Bind every quantitative slot to source fields and formulas
```

## Progress

- [x] Implementation complete: 104 pages, 141 containers, unique IDs, scoped data bindings.
- [x] Validation passed: `npm.cmd run typecheck`, `npm.cmd run build`.
- Source text extraction provides 140 generation conditions for 141 containers. The unmatched condition is flagged for consultant review in the template.
- Container Map placements are normalized; pixel-perfect geometry still needs rendered-slide calibration.
- commit: 02baad0

