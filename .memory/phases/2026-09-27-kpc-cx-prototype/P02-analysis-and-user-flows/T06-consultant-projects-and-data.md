# Task: T06 Consultant Projects & Data Preparation

## Status: done

## Goal

컨설턴트가 배정된 프로젝트의 데이터 준비/검증 상태를 보고 엑셀 파일 검증 결과와 승인 참고자료를 관리할 수 있게 한다.

## Decision Summary

- 컨설턴트는 배정된 프로젝트만 본다. 프로젝트 생성·기업·비교군·담당자 설정은 관리자 책임이다.
- 파일 수용은 XLSX/CSV이며 NCSI 필수 변수 누락/오류 시 해당 데이터의 NCSI 분석/보고서만 차단한다.

## Implementation

### I01. 프로젝트 대기열 및 데이터 유효성 확인

- Related Files:
  - `src/domain/projects.ts` :: `ProjectSummary`, `ProjectDataStatus`, `ReferenceMaterial` — 프로젝트 업무 모델; new
  - `src/data/demo-projects.ts` :: `DEMO_PROJECTS` — 앱 구동용 지정 프로젝트; new
  - `src/features/consultant/pages/ConsultantQueuePage.tsx` :: `ConsultantQueuePage` — 상태 목록; new
  - `src/features/consultant/pages/ProjectWorkspacePage.tsx` :: `ProjectWorkspacePage` — 선택 프로젝트; new
  - `src/features/consultant/components/DataUploadPanel.tsx` :: `DataUploadPanel` — 파일 선택/검증 결과; new
- `src/services/demo-import-validator.ts` :: `DemoImportValidator.validate`, `parseAggregate` — XLSX/CSV 요구 컬럼 매핑/검증 및 집계; new
  - `src/features/consultant/components/ReferenceMaterialEditor.tsx` :: `ReferenceMaterialEditor` — 프로젝트 승인자료; new
  - `src/features/consultant/routes.tsx` :: `consultantRoutes` — consultant paths; new

#### Details

- **Signatures & Types:**
  ```ts
  export type DataStatus = 'not-uploaded' | 'validating' | 'ready' | 'blocked' | 'partial';
  export interface ProjectSummary {
    id: string; name: string; subjectCompanyId: string; comparisonCompanyIds: string[];
    consultantUserId: string; year: number; dataStatus: DataStatus;
    reportStatus: 'not-started' | 'draft' | 'in-review' | 'finalized'; updatedAt: string;
  }
  export interface ReferenceMaterial { id: string; projectId: string; title: string; kind: 'method'|'prior-case'|'industry'; body: string; status: 'draft'|'approved'; reviewedBy: string|null; updatedAt: string }
  export interface DemoImportValidator {
    validate(file: File): Promise<DatasetReadiness>;
    parseAggregate(file: File): Promise<{dataset:DemoDataset; readiness:DatasetReadiness}>;
  }
  ```
- **Queue:** project rows sorted by status (data blocked → data ready/report draft → finalized), display target/comparison firms and year, data status and report status. Consultant sees only `projectIds` assigned in session. Project page uses fixed target/comparator IDs and cannot edit them.
- **Upload:** accept `.xlsx,.csv`; use SheetJS in browser to validate file type, size ≤ 20 MiB, headers, required `YEAR/FIRM/NCSI`, dimensions `GENDER/AGE1/NATIONAL/B0101`, and recognized `A001`–`A049` fields. Preview first 10 rows in consultant memory only; do not persist or upload raw rows. Show required/mapped/missing fields and actionable issues. If required NCSI variables fail, set NCSI `blocked`; unaffected sections can remain `partial`. On valid upload, call the same pure aggregate mapper as T02, attach source hash/import metadata, and store only `DemoDataset` aggregates in project-scoped localStorage so dashboard/report can use that selected dataset. Invalid files never replace the current ready dataset.
- **Reference content:** consultant can add/edit title, kind, source note, body and mark `검토 완료`. An approved item is immediately available only inside its assigned project and excluded from unrelated projects. No global reference approval/admin queue.
- **No synthetic data:** example project list uses same actual 2022 dataset and explicitly shows its source; no upload success claims unless local validation ran.

## Acceptance Criteria

- [ ] Consultant queue excludes unassigned project IDs; target/comparison firms are read-only.
- [ ] XLSX/CSV valid/invalid files show column-level validation and do not claim server persistence.
- [ ] Missing mandatory NCSI fields mark NCSI blocked; unaffected section availability stays distinct.
- [ ] Valid file stores only aggregate cells in the selected project and updates the corresponding analysis readiness.
- [ ] Approved references are scoped to the project and usable by T07 only after marked reviewed.

## Validation

- `npm.cmd run typecheck` — project/import/reference model compiles.
- `npm.cmd run build` — consultant routes and parser adapter bundle.

## Commit Message

```text
feat(consultant): add assigned project preparation flow

Plan: 2026-09-27-kpc-cx-prototype
Phase: P02-analysis-and-user-flows
Task: T06-consultant-projects-and-data

- Add assigned project queue and local XLSX/CSV validation feedback
- Add project-scoped curated references for CX analysis
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: `feat(consultant): add assigned project preparation flow`
- note: XLSX parser is lazy-loaded for upload; its standalone build chunk is 500.06 KB (163.12 KB gzip), producing a non-blocking Vite size warning.
