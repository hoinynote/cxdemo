# Task: T01 React/TypeScript App Foundation

## Status: done

## Goal

작업공간에 CX 프로토타입을 개발·빌드할 수 있는 새 로컬 웹 앱 기반을 만들고, 이후 Task에서 동일한 실행/타입 검사 명령을 쓸 수 있게 한다.

## Decision Summary

- Vite + React + TypeScript, npm, React Router를 사용한다. UI kit은 추가하지 않고 KPC 업무용 색/간격/타이포그래피 토큰을 CSS로 정의한다.
- 실제 데이터와 사용자 선택값을 붙이기 전까지 화면의 NCSI 값을 꾸며내지 않는다. 장식용 gradient, 범용 AI UI를 추가하지 않는다.

## Implementation

### I01. 앱 뼈대 및 스크립트

- Related Files:
  - `package.json` :: scripts/dependencies — 앱 명령; new
  - `index.html` :: `#root` — 앱 진입 DOM; new
  - `vite.config.ts` :: `defineConfig` — Vite 설정; new
  - `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — strict TS 설정; new
  - `src/main.tsx` :: `createRoot` — React 마운트; new
  - `src/App.tsx` :: `App` — Router/전역 provider 슬롯; new
  - `src/styles/tokens.css`, `src/styles/global.css` — 시각 토큰 및 reset; new
  - `.gitignore` :: ignore entries — build/local source ignore; modify

#### Details

- **Package scripts:** `dev: vite --host 127.0.0.1`, `typecheck: tsc -b --pretty`, `build: tsc -b && vite build`. 의존성은 `react`, `react-dom`, `react-router-dom`; 개발 의존성은 `vite`, `typescript`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`이다. npm lockfile도 생성한다.
- **Compiler:** TypeScript strict, `noEmit`, target ES2022, moduleResolution `Bundler`, JSX `react-jsx`; `src`가 앱 root이다.
- **App:** `createBrowserRouter`는 후속 T04에서 붙이므로 이 Task에서 `App`은 `main`과 `<main id="app-root">`만 제공한다. `main.tsx`는 `StrictMode` 아래 `App`을 마운트한다.
- **Design tokens:** `--color-brand`, `--color-brand-strong`, `--color-ink`, `--color-muted`, `--color-border`, `--color-surface`, `--color-canvas`, `--color-success`, `--color-warning`, `--color-danger`, 4px 배수 spacing, 8px 기본 radius, 표준 focus outline을 정의한다. 기존 CX 캡처의 KPC 주황/흰 배경/짙은 텍스트를 참고하고 실제 로고 파일이 없는 경우 로고를 임의 제작하지 않는다.
- **Ignore:** `node_modules/`, `dist/`, `.local/`, `*.tsbuildinfo`. 원본 데이터 및 추출된 ZIP 파일은 `public/`에 두지 않는다.
- **Execution Flow:** `npm.cmd install` → 앱 scaffold → `npm.cmd run typecheck` → `npm.cmd run build` 순서로 통과시킨다.

## Acceptance Criteria

- [ ] `npm.cmd run dev`로 localhost 전용 개발 서버가 뜨고 초기 앱 화면이 렌더된다.
- [ ] strict typecheck와 production build가 성공하고 `dist/`에 앱 번들이 생성된다.
- [ ] `.local` 및 원본 XLSX를 공개 정적 경로로 복사하지 않도록 ignore 규칙이 있다.

## Validation

- `npm.cmd run typecheck` — TypeScript 오류 0개.
- `npm.cmd run build` — Vite production build 성공.

## Commit Message

```text
feat(app): scaffold KPC CX prototype

Plan: 2026-09-27-kpc-cx-prototype
Phase: P01-foundation-data-access
Task: T01-app-foundation

- Add React TypeScript Vite app and npm scripts
- Define KPC enterprise design tokens and local data ignore rules
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see git log
