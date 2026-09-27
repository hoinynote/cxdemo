# Task: T12 CX Admin Portal

## Status: done

## Goal

관리자가 ESG 참고 톤의 별도 CX 관리자 포털에서 계정, 회사/컨설턴트, 프로젝트 지정, 데이터 준비 상태, 템플릿 버전, AI 사용량/사용자 품질 피드백을 관리할 수 있게 한다.

## Decision Summary

- CX 업무만 운영한다. 플랫폼 전역 LLM/프롬프트/토큰 설정은 포함하지 않는다.
- 사용자별 커스텀 권한은 없고 역할과 회사/프로젝트 할당으로 메뉴 및 데이터 범위가 정해진다.

## Implementation

### I01. 계정/프로젝트/데이터 운영 화면

- Related Files:
  - `src/features/admin/routes.tsx` :: `adminRoutes`; new
  - `src/features/admin/pages/AdminHomePage.tsx` :: `AdminHomePage` — initial account/company list; new
  - `src/features/admin/pages/UserManagementPage.tsx` :: `UserManagementPage`; new
  - `src/features/admin/pages/ProjectManagementPage.tsx` :: `ProjectManagementPage`; new
  - `src/features/admin/components/ProjectSetupForm.tsx` :: `ProjectSetupForm` — fixed subject/comparators/consultant; new
  - `src/features/admin/pages/DataStatusPage.tsx` :: `DataStatusPage`; new
  - `src/data/admin-demo-store.ts` :: `AdminDemoStore` — local admin state; new
  - `src/layouts/AdminLayout.tsx` :: admin navigation; modify
  - `src/domain/projects.ts`, `src/domain/auth.ts` — management actions/types; modify

#### Details

- **Signatures & Types:**
  ```ts
  export type AccountStatus = 'active'|'inactive';
  export interface ManagedAccount { id:string; name:string; email:string; role:UserRole; companyId:string|null; status:AccountStatus; assignedProjectIds:string[] }
  export interface ProjectSetupInput { id:string; name:string; subjectCompanyId:string; comparisonCompanyIds:string[]; consultantUserId:string; datasetId:string; year:2022 }
  export interface AdminDemoStore {
    listAccounts(): ManagedAccount[]; updateAccount(id:string, patch:Partial<Pick<ManagedAccount,'status'|'companyId'|'assignedProjectIds'>>):void;
    listProjects():ProjectSummary[]; createProject(input:ProjectSetupInput):ProjectSummary; updateDataStatus(projectId:string,status:DataStatus):void;
  }
  ```
- **Initial home:** account/company table with active status, role, assigned company/project and CX data status summary; concise counts, no card wall.
- **Accounts:** activate/deactivate, set company for company role, assign projects to consultants. Role is predefined and cannot be changed into arbitrary permission combinations. Saving updates localStorage for the prototype only.
- **Project creation:** select available named firms from actual data, choose one fixed subject and one or more non-subject comparison firms, select assigned consultant, existing ready dataset/year. Enforce 2022 and dataset availability. Project target/comparison become read-only to consultant and report UI.
- **Data status:** list project dataset ready/blocked/partial state, source file/hash, last validation and report readiness. No raw row viewer or synthetic status. Changes are local demo operations.

### I02. Template version/AI quality operations

- Related Files:
  - `src/features/admin/pages/TemplateManagementPage.tsx` :: `TemplateManagementPage` — version list/publish; new
  - `src/features/admin/pages/AiQualityPage.tsx` :: `AiQualityPage` — usage/feedback summary; new
  - `src/features/admin/components/TemplateVersionPanel.tsx` :: `TemplateVersionPanel`; new
  - `src/features/admin/components/AiFeedbackTable.tsx` :: `AiFeedbackTable`; new
  - `src/data/demo-feedback-store.ts` :: `readFeedback` — T07 feedback store; read-only
  - `src/data/demo-usage-store.ts` :: `listUsage` — T07 usage counter; read-only
  - `src/report-templates/ncsi-2022-v1.ts` :: current version metadata; read-only

#### Details

- Template page lists ID/version/status/page count/created date. Admin can register a cloned next version from a valid `DiagnosticTemplate` JSON file and set it active for future generation. Existing reports remain pinned to their template snapshot. The editor does not mutate page contents in old versions. Validate ID, monotonically increasing version, 104 pages, unique IDs and all required container bindings before publish.
- AI page shows local-session usage count, role/project breakdown, helpful/not-helpful totals and optional feedback text. No question transcript, prompt config, model choice, token limits, or global C-ON settings are shown.
- Use restrained ESG-like typography/table/list treatment with CX colors. Admin pages use their own route family, no workspace analysis nav.
- Persist demo changes in localStorage behind `AdminDemoStore`; include a reset-demo-data action that restores source-backed initial records and clears feedback.

## Acceptance Criteria

- [x] Admin can enable/disable accounts, assign company/project and create fixed-scope projects.
- [x] Consultants/company users see those assignments after navigation/reload and remain within their route/data scope.
- [x] Dataset readiness and NCSI report eligibility are visible, with no raw response browsing.
- [x] Template version registration validates all 104 pages and new version only applies to future reports.
- [x] AI quality shows user feedback and usage counts but has no model/prompt/global settings.

## Validation

- `npm.cmd run typecheck` — admin store/forms/pages compile.
- `npm.cmd run build` — separate admin route family bundles.

## Commit Message

```text
feat(admin): add separate CX operations portal

Plan: 2026-09-27-kpc-cx-prototype
Phase: P03-diagnostic-report-and-admin
Task: T12-admin-portal

- Manage CX accounts, fixed-scope projects and dataset readiness
- Track template versions and AI use/answer feedback without model settings
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: pending
