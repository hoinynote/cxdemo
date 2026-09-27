# Plan: KPC CX Interactive Prototype

## Goal

새 React/TypeScript 웹 프로토타입으로 기업 고객·컨설턴트 공통 CX 분석 포털과 별도 시스템 관리자 포털을 제공한다. 제공된 2022 NCSI 엑셀을 실제 계산에 사용하고, 출처가 추적되는 분석·AI 응답·기업 리포트 및 샘플과 같은 104페이지 NCSI 진단보고서 생성/검토 흐름을 확인할 수 있게 한다. 실제 운영 DB, LLM, API 연동은 대체 가능한 인터페이스까지만 준비한다.

## Decision Source

- [확정 결정사항](../decisions/2026-09-27-kpc-cx-prototype.md)
- 작업공간에는 CX 앱 코드가 없으며 Project Memory Starter Kit만 있다. 따라서 P01-T01에서 앱 골격을 새로 만든다.
- 원본 입력: `C:\Users\유호인\Desktop\KPC\cxgrillme.zip` 내부의 실제 데이터 `22Q4_면세점_분석용_변환.xlsx`와 104페이지 NCSI 샘플 PPTX/PDF. 원시 응답 행은 브라우저 배포 파일에 넣지 않는다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | 새 앱 기반, 데이터 모델/집계, 교체 가능한 서비스 경계, 역할 포털 공통 셸 구축 | [P01](../phases/2026-09-27-kpc-cx-prototype/P01-foundation-data-access/phase.md) |
| P02 | `done ✅` | 공통 대시보드/분석, 컨설턴트 프로젝트 작업, CX AI Agent, 기업 고객 리포팅 UX 구현 | [P02](../phases/2026-09-27-kpc-cx-prototype/P02-analysis-and-user-flows/phase.md) |
| P03 | `done ✅` | NCSI 보고서 컨테이너 템플릿·검토·출력 및 별도 CX 관리자 포털 구현 | [P03](../phases/2026-09-27-kpc-cx-prototype/P03-diagnostic-report-and-admin/phase.md) |

## Validation Policy

Task 검증은 `npm run typecheck`와 `npm run build`를 사용한다. 이번 계획은 테스트 코드 추가나 테스트 실행을 작업 범위로 넣지 않는다.

## Scope Boundaries

- 모든 NCSI 숫자는 원천 데이터 및 고정 공식에서 계산하며 누락 기간/기업의 수치를 만들지 않는다.
- 기업 UI는 집계치만 받는다. 원시 응답 행은 별도 컨설턴트 내부 작업에서만 사용하고 프런트엔드 public 정적 폴더에 두지 않는다.
- VOC 분석, 실시간 LLM, 운영 DB/API, SSO, 플랫폼 전역 모델/프롬프트/토큰 관리, 고급 통계/네트워크 분석은 제외한다.
- 화면 구성 및 비계산 예시 콘텐츠는 결정 문서에 기록된 104페이지 보고서 구조와 역할 기반 접근 경계를 따른다.
