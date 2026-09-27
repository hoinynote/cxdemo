# Task: T02 Source Data Pipeline

## Status: done

## Goal

첨부 실제 XLSX에서 타입이 검증된 2022 면세점 NCSI 집계 데이터를 만들고, 프런트엔드는 응답 원시 행이 아닌 계산용 집계 자료만 소비하게 한다.

## Decision Summary

- 원천 경로는 ZIP 추출 후 `.local/source/22Q4_면세점_분석용_변환.xlsx`이다. 원천 XLSX는 로컬 전용이며 정적 번들에 포함하지 않는다.
- 450개 응답, 2022년 값만 이용한다. 임의 NCSI 값/기간은 생성하지 않는다. 기업명은 Excel 라벨에서 그대로 읽되 A/B/C 대응을 추정하지 않는다.

## Implementation

### I01. XLSX 검증 및 aggregate 생성

- Related Files:
  - `package.json` :: `data:build` script, `xlsx` dependency — 집계기 실행/파싱; modify
  - `scripts/build-demo-data.ts` :: `buildDemoData`, `readWorkbook`, `validateWorkbook`, `aggregateResponses` — 원천 파싱 및 build-time 변환; new
  - `src/data/aggregate.ts` :: `aggregateResponses`, `createStableId` — 화면 업로드에서도 공유할 순수 집계기; new
  - `src/data/demo-dataset.ts` :: `demoDataset` — generated JSON typed import; new
  - `src/data/schema.ts` :: `DemoDataset`, `CompanyRecord`, `DimensionValues`, `AggregateCell`, `QualityFactorRecord` — 출력 계약; new
  - `src/data/generated/ncsi-2022.json` :: `DemoDataset` — 생성된 집계값; generated
  - `docs/data-source.md` — 로컬 원천 파일 준비/보호 안내; new
  - `.gitignore` — `.local/source/` ignore 규칙; modify
  - `tsconfig.app.json` :: `resolveJsonModule` — 생성된 JSON 데이터 import 지원; modify
  - `tsconfig.node.json` :: Node types와 `scripts/**/*.ts` include — 집계 CLI strict typecheck; modify
  - `src/App.tsx`, `src/styles/global.css` — 집계 데이터 로드 상태를 시작 화면에 표시; modify

#### Details

- **Signatures & Types:**
  ```ts
  export type DimensionKey = 'gender' | 'ageGroup' | 'nationality' | 'branch';
  export type DimensionValues = Partial<Record<DimensionKey, string>>;
  export interface CompanyRecord { id: string; label: string; industryId: string; sectorId: string }
  export interface QualityFactorRecord { id: string; label: string; order: number }
  export interface AggregateCell {
    companyId: string; year: 2022; dimensions: DimensionValues; respondentCount: number;
    ncsiSum: number; factorSums: Record<string, number>; factorCounts: Record<string, number>;
  }
  export interface DemoDataset {
    id: string; sourceFile: string; sourceSheets: string[]; sourceHash: string;
    importedAt: string; mappingVersion: string; sourceRowCount: number;
    fieldIds: SourceMapping; missingValueCounts: Record<string, number>;
    year: 2022; industryId: string; sectorId: string; companies: CompanyRecord[];
    factors: QualityFactorRecord[]; cells: AggregateCell[];
  }
  export interface SourceMapping {
    companyId:'FIRM'; year:'YEAR'; industryId:'INDUSTRY'; sectorId:'SECTOR';
    gender:'GENDER'; ageGroup:'AGE1'; nationality:'NATIONAL'; branch:'B0101';
    ncsi:'NCSI'; qualityFactors:string[];
  }
  export function buildDemoData(xlsxPath: string, outputPath: string): Promise<DemoDataset>;
  export function validateWorkbook(workbook: XLSX.WorkBook): void;
  export function aggregateResponses(rows: Record<string, unknown>[], mapping: SourceMapping): AggregateCell[];
  ```
- **Source preparation:** `docs/data-source.md`에 로컬 준비 방법을 기록한다. ZIP에서 `cxgrillme/22Q4_면세점_분석용_변환.xlsx` 항목만 `.local/source/22Q4_면세점_분석용_변환.xlsx`로 추출한다. `.local/`은 통째로 ignore한다. XLSX 파일이 정해진 위치에 없으면 스크립트는 기대 경로와 파일명을 오류로 출력하고 종료한다.
- **Workbook mapping:** 시트명은 `데이터_라벨`, `데이터_원본`, `변수정보`, `파일정보`로 검증한다. 확정 field IDs: `YEAR`(연도), `FIRM`(기업명 라벨), `INDUSTRY`(업종), `SECTOR`(산업), `GENDER`, `AGE1`(연령대), `NATIONAL`, `B0101`(지점/이용 지점 라벨), `NCSI`, 품질요인 `A001`–`A049`. `데이터_라벨` 첫 행은 field ID, 둘째 행은 설명 행이므로 응답 parsing에서 설명 행을 제외한다. 변수명/표시 라벨은 `변수정보`에서 field ID로 가져온다. `INDUSTRY=면세점`, `SECTOR=도매 및 소매업(G)`을 구분한다. 응답은 450건, 기업별 150건, 모두 `YEAR=2022년`; `NCSI`는 모든 행에 숫자값이 있어야 한다. 누락/중복 필수 변수, 숫자 아닌 NCSI/요인값은 물리적 시트 행 번호와 변수 ID를 포함해 실패시킨다. 요인값 null은 허용하고 요인별 valid count를 따로 집계한다.
- **Dependency security:** npm registry의 `xlsx@0.18.5`는 알려진 고위험 취약점 때문에 사용하지 않는다. SheetJS 공식 설치문서가 권하는 공식 CDN tarball `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`를 dependency로 설치하고 npm audit가 취약점 0건인지 확인한다. Script runner는 `tsx` devDependency다.
- **Aggregation:** Group by company + year + all four supported dimensions; emit only grouped `respondentCount`, `ncsiSum`, and each factor's `factorSums` and `factorCounts`. Do not copy respondent IDs, names, free-text answers, or raw coded rows. Summing grouped cells after filter matching supports any combination of supported dimensions without shipping original records. NCSI field must be numeric for every included respondent, so its mean denominator equals respondent count. Factor mean denominator is that factor's valid count, not total respondent count.
- **Provenance:** include source filename/sheets, workbook SHA-256, import time, mapping version, 450 row count, dimension field IDs, quality factor IDs and missing factor counts as generated metadata in JSON. JSON contains no invented values or raw records.
- **Commands:** `npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` and `npm install -D tsx`; `data:build` invokes `tsx scripts/build-demo-data.ts`. PowerShell launch: `$env:CX_NCSI_SOURCE='.local/source/22Q4_면세점_분석용_변환.xlsx'; npm.cmd run data:build`.

## Acceptance Criteria

- [ ] Generated JSON contains 2022 and the three named firms, 49 labeled factors and aggregate cells only.
- [ ] JSON has reproducible source hash/mapping metadata, and no response identifier or raw respondent record.
- [ ] Missing/malformed workbook, sheet, field or numeric input produces an actionable error; no synthetic NCSI number is substituted.

## Validation

- `npm.cmd run typecheck` — import/aggregation types compile.
- `$env:CX_NCSI_SOURCE='.local/source/22Q4_면세점_분석용_변환.xlsx'; npm.cmd run data:build` — writes JSON and prints workbook hash plus validated 450 response count.
- `npm.cmd run build` — generated JSON can be bundled.
- `npm.cmd audit --audit-level=high` — dependency tree reports zero high/critical vulnerabilities.

## Commit Message

```text
feat(data): add source-validated NCSI demo aggregates

Plan: 2026-09-27-kpc-cx-prototype
Phase: P01-foundation-data-access
Task: T02-source-data-pipeline

- Parse the supplied 2022 workbook into grouped NCSI aggregates
- Keep respondent rows and the source workbook out of public assets
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see git log
