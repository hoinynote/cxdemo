# Task: T04 Role Shell & Analysis Context

## Status: done

## Goal

대표 계정 선택으로 실패 없이 역할을 전환하고, 기업 고객·컨설턴트 공통 포털과 별도 관리자 포털을 역할별 메뉴/데이터 범위로 보호한다.

## Decision Summary

- 데모 인증은 로컬 선택 화면이며 외부 인증/SSO는 연결하지 않는다.
- 기업 고객과 컨설턴트만 CX 분석 공통 셸을 공유하고, 관리자는 별도 셸/라우트로 분리한다.

## Implementation

### I01. 데모 계정 및 접근 정책

- Related Files:
  - `src/domain/auth.ts` :: `UserRole`, `DemoUser`, `AccessScope` — 역할 계약; new
  - `src/auth/demo-users.ts` :: `DEMO_USERS`, `getHomePath` — 세 대표 계정; new
  - `src/auth/SessionProvider.tsx` :: `SessionProvider`, `useSession` — 세션 상태; new
  - `src/auth/RequireRole.tsx` :: `RequireRole` — 역할 경로 보호; new
  - `src/pages/SignInPage.tsx` :: `SignInPage` — 선택 후 로그인; new
  - `src/App.tsx` :: `App` — role-aware routes; modify

#### Details

- **Signatures & Types:**
  ```ts
  export type UserRole = 'company' | 'consultant' | 'admin';
  export interface DemoUser { id: string; name: string; role: UserRole; companyId?: string; projectIds: string[] }
  export interface AccessScope { role: UserRole; visibleCompanyIds: string[]; visibleProjectIds: string[] }
  export interface SessionContextValue { user: DemoUser | null; signIn(userId: string): void; signOut(): void }
  export function RequireRole(props: {allow: UserRole[]; children: React.ReactNode}): JSX.Element;
  ```
- **Demo users:** one representative Company account bound to its project/company, one Consultant account with assigned projects, and one Admin. `signIn` always succeeds for listed accounts, sets sessionStorage-backed demo session, then navigates to role-specific home. Invalid local ID returns to account choices with inline message; do not simulate password failure.
- **Access:** `RequireRole` redirects anonymous session to `/login`; role mismatch redirects to `getHomePath(user.role)`. Company queries are constrained to own company; consultants see assigned `projectIds`; admins see admin routes only. Navigation items use the same role matrix as route guards.

### I02. Shared shell, persistent filters and responsive navigation

- Related Files:
  - `src/layouts/WorkspaceLayout.tsx` :: `WorkspaceLayout` — company/consultant shell; new
  - `src/layouts/AdminLayout.tsx` :: `AdminLayout` — isolated admin shell; new
  - `src/state/AnalysisContext.tsx` :: `AnalysisProvider`, `useAnalysisContext` — filter state; new
  - `src/navigation/menu.ts` :: `workspaceMenu`, `adminMenu` — menu config; new
  - `src/styles/layout.css` — sidebar/header/mobile behavior; new

#### Details

- **State:** `AnalysisFilters` starts at 2022 and assigned project/company defaults. Filter changes use reducer actions `setYear`, `setIndustry`, `setSubjectCompany`, `setComparisons`, `setDimension`, `resetFilters`. Persist only active filters to sessionStorage; switching workspace pages retains context.
- **Company/consultant menu hierarchy:** `전체 수준 분석` → `전체 수준 분석`, `산업별 수준 분석`, `기업별 수준 분석`; `CS 품질요인` → `기업별 수준 분석`, `고객군별 수준 분석`, `업종별 기업 비교 분석`. Exclude `기업별 VOC 분석`. The role controls company/project choices and additional consultant work queue/report controls; no standalone AI menu and no NCSI report menu.
- **Workspace header:** organization label, current project/company scope, role/account dropdown, top header button to latest finalized NCSI report (company only; disabled with `확정 보고서 없음` when no finalized report). Consultant has project switcher restricted to assigned IDs.
- **Admin shell:** visibly separate `/admin` layout and nav, using restrained ESG reference style while sharing CSS tokens; do not inherit analysis menus.
- **Responsive:** desktop left navigation collapses to drawer under 900px. Dashboard/AI/report reader fit smaller width; edit-heavy/report-container screens may scroll horizontally. Keep focus order and `:focus-visible` outline.

## Acceptance Criteria

- [ ] Three role options log in, and each reaches only its allowed route family.
- [ ] Company cannot select another company's data; consultant cannot access unassigned project; admin cannot land in the analysis shell by menu.
- [ ] Filter state survives navigation between workspace pages; administrator has a distinct shell.
- [ ] On narrow view, workspace navigation remains reachable and header controls do not overlap.

## Validation

- `npm.cmd run typecheck` — auth/layout/context types compile.
- `npm.cmd run build` — route tree and layouts bundle successfully.

## Commit Message

```text
feat(auth): add role based prototype portals

Plan: 2026-09-27-kpc-cx-prototype
Phase: P01-foundation-data-access
Task: T04-role-shell-and-context

- Add representative demo account selection and role guards
- Build shared analysis workspace and separate CX admin shell
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: `feat(auth): add role based prototype portals`
