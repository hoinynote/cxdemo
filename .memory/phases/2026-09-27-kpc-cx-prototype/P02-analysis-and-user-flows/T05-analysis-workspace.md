# Task: T05 Analysis Workspace

## Status: done

## Goal

기존 CX 분석 메뉴의 VOC 제외 구조를 갖는 반응형 대시보드와 품질요인 분석 화면을 제공하고, 사용자가 필터를 바꾸면 실제 2022 NCSI 수치/차트/응답자 수가 함께 바뀌게 한다.

## Decision Summary

- 그래프는 Recharts; 모든 KPI와 그래프 입력은 `DemoAnalyticsService` 결과로 만든다.
- 데이터 없는 기간/컨테이너는 빈 상태로 표시한다. 카드 과다 배치와 장식용 지표/버튼을 피한다.

## Implementation

### I01. 분석 화면과 데이터 뷰 모델

- Related Files:
  - `package.json` :: `recharts` dependency — 차트; modify
  - `src/features/analysis/routes.tsx` :: `analysisRoutes` — 화면 라우트; new
  - `src/features/analysis/analysis-view-model.ts` :: `buildAnalysisViewModel` — 서비스 응답을 차트 모델로 매핑; new
  - `src/features/analysis/components/GlobalFilterBar.tsx` :: `GlobalFilterBar` — 연도/기업/비교군/응답자 조건; new
  - `src/features/analysis/components/ScoreTrendPanel.tsx` :: `ScoreTrendPanel` — NCSI/비교 점수; new
  - `src/features/analysis/components/FactorRankingChart.tsx` :: `FactorRankingChart` — 49 품질요인; new
  - `src/features/analysis/components/BreakdownTable.tsx` :: `BreakdownTable` — 집계/n/출처; new
  - `src/features/analysis/pages/OverallAnalysisPage.tsx` :: `OverallAnalysisPage`; new
  - `src/features/analysis/pages/IndustryAnalysisPage.tsx` :: `IndustryAnalysisPage`; new
  - `src/features/analysis/pages/CompanyAnalysisPage.tsx` :: `CompanyAnalysisPage`; new
  - `src/features/analysis/pages/CustomerSegmentsPage.tsx` :: `CustomerSegmentsPage`; new
  - `src/features/analysis/pages/IndustryCompanyComparisonPage.tsx` :: `IndustryCompanyComparisonPage`; new
  - `src/features/analysis/styles.css` — 차트/필터/테이블 반응형 스타일; new

#### Details

- **Signatures & Types:**
  ```ts
  export interface AnalysisViewModel {
    title: string; subjectLabel: string; subjectScore: MetricValue;
    respondentCount: number; comparisons: SeriesPoint[]; factors: SeriesPoint[];
    evidence: EvidenceRef[]; emptyMessage: string | null;
  }
  export function buildAnalysisViewModel(result: AnalysisResult, title: string): AnalysisViewModel;
  export function GlobalFilterBar(): JSX.Element;
  export function OverallAnalysisPage(): JSX.Element;
  ```
- **Routes:** `/workspace/overview/all`, `/workspace/overview/industry`, `/workspace/overview/company`, `/workspace/factors/company`, `/workspace/factors/customers`, `/workspace/factors/industry-comparison`. Keep page heading aligned with existing menu. VOC route must not exist.
- **Filter controls:** year shows only available 2022; company/competitor select use project access scope; dimension controls use gender/age/nationality/branch values from dataset. The customer/company/industry page selects respective analysis composition without silently changing user selected comparison project.
- **Display:** main score and delta first; one comparison visual, one factor chart, compact table/evidence drawer as applicable. Every score shows source period and `n`; segment score label is `필터 응답자 집계`. Chart tooltip shows firm, value, sample count and source period. Company sees values/interpretation and human-readable source period only; consultant additionally sees evidence ID, source field IDs and calculation details. Formatting to two decimals only at view layer.
- **Empty handling:** a query with no source records renders `해당 조건의 데이터 없음` and does not draw zero bars. Never substitute industry/overall numbers for company NCSI. Competitors are separate labeled series.
- **Interactions:** filter changes recompute service result and update all visual elements; `AI에게 질문` opens T07 panel with current page/filter context; `리포트에 담기` emits selected chart/KPI as a typed content item for T08.

## Acceptance Criteria

- [ ] Each AS-IS non-VOC analysis menu item loads the corresponding screen and changes data when filters change.
- [ ] Subgroup page labels respondent aggregate and displays n; competitor names remain readable.
- [ ] Screens show only real 2022 numbers, and no-data state contains no fabricated score.
- [ ] Dashboard visual hierarchy uses a small number of useful panels, not a repeated card grid.

## Validation

- `npm.cmd run typecheck` — page/series contracts compile.
- `npm.cmd run build` — all routes and Recharts views bundle successfully.

## Commit Message

```text
feat(analysis): add filter driven CX dashboards

Plan: 2026-09-27-kpc-cx-prototype
Phase: P02-analysis-and-user-flows
Task: T05-analysis-workspace

- Add the existing non-VOC analysis hierarchy with source-backed charts
- Carry shared filters into analysis results and contextual actions
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: `feat(analysis): add filter driven CX dashboards`
