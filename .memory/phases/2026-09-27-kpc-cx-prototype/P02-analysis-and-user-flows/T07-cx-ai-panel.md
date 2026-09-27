# Task: T07 CX AI Analysis Panel

## Status: done

## Goal

기업 고객과 컨설턴트가 현재 분석 조건으로 자연어 질의를 하고, 실제 계산 결과·근거·승인 참고자료를 연결한 답변을 받아 화면을 떠나지 않고 확인/피드백할 수 있게 한다.

## Decision Summary

- 실시간 LLM은 연결하지 않는다. deterministic local adapter가 공식 계산/승인자료를 이용하고 향후 교체할 port를 구현한다.
- 질의는 현재 화면의 프로젝트/필터 문맥을 유지하며 대화는 세션 밖에 보존하지 않는다.

## Implementation

### I01. 승인된 규칙 기반 응답 서비스 및 피드백 집계

- Related Files:
  - `src/data/approved-content/answer-rules.ts` :: `APPROVED_ANSWER_RULES` — 지원 질문/해석 규칙; new
  - `src/services/demo-ai.ts` :: `DemoAiAnalysisService.ask`, `submitFeedback` — local AI port; new
  - `src/domain/ai.ts` :: `AiAnswer`, `AnswerFeedback` — T03 contract; modify
  - `src/data/demo-feedback-store.ts` :: `readFeedback`, `writeFeedback` — browser-local admin metric; new
  - `src/data/demo-usage-store.ts` :: `recordUsage`, `listUsage`, `clearUsage` — anonymous local usage counts; new
  - `src/features/ai/AiPanel.tsx` :: `AiPanel` — panel UI; new
  - `src/features/ai/components/AnswerEvidence.tsx` :: `AnswerEvidence`; new
  - `src/features/ai/components/FeedbackControl.tsx` :: `FeedbackControl`; new
  - `src/services/container.ts` :: `createServiceContainer` — wire AI adapter; modify

#### Details

- **Signatures & Types:**
  ```ts
  export type FeedbackValue = 'helpful' | 'not-helpful';
  export interface AnswerFeedback { answerId: string; role: 'company'|'consultant'; projectId: string; value: FeedbackValue; comment?: string; createdAt: string }
  export interface FeedbackStore { list(): AnswerFeedback[]; add(value: AnswerFeedback): void; clear(): void }
  export interface AiUsageEvent { id:string; role:'company'|'consultant'; projectId:string; screenId:string; createdAt:string }
  export interface UsageStore { list():AiUsageEvent[]; add(event:AiUsageEvent):void; clear():void }
  export class DemoAiAnalysisService implements AiAnalysisPort {
    constructor(analytics: DemoAnalyticsService, refs: ReferenceMaterial[], feedbackStore: FeedbackStore);
    ask(input: AiQuestion): Promise<AiAnswer>;
    submitFeedback(input: AnswerFeedback): Promise<void>;
  }
  ```
- **Supported intents:** subject NCSI, named competitor comparison, filter subgroup result, low/high quality factors, period availability, and grounded interpretation/recommendation from approved project references. Parse firm labels and intent via fixed keyword/rule map. Unsupported asks return a clear limitation and suggested supported question, without making up a value.
- **Answer contract:** internal answer contains text, headline result, inline chart/table data, exact filters, NCSI `n`, evidence IDs/source fields, source date, approved reference IDs and deterministic key. Do not cite any number not returned by analytics. Clearly label subgroup vs official score. Company renderer exposes values, interpretation, source period and sample count only; consultant renderer may expose evidence IDs, source fields and calculation details. No inferred identification mapping A/B/C.
- **Panel UX:** right-side drawer at desktop and full-height sheet on mobile; preserves underlying dashboard. Question input plus enter/submit, 3 contextual suggestion prompts, answer, role-filtered evidence disclosure, `리포트에 담기`, helpful/not helpful + optional comment. After answer, follow-up sends only current in-memory conversation context. Close/navigation clears chat transcript; changing current filter updates next query context.
- **Quality and usage signals:** localStorage feedback records are minimized to answer ID, role, project, vote and optional comment; separate usage records contain only role/project/screen/timestamp, not question text. Admin aggregate is implemented in T12. No user question transcript is retained after session.

## Acceptance Criteria

- [x] Supported questions return actual values consistent with the active filters and show evidence/sample count.
- [x] Unsupported questions return no invented data and do not trigger a hidden generic answer.
- [x] Panel preserves current analysis page, and its answer can be added into T08 report composition.
- [x] Helpful/not-helpful feedback appears in local admin aggregate source without saving question history.

## Validation

- `npm.cmd run typecheck` — AI service/answer panels compile.
- `npm.cmd run build` — AI adapter and panel bundle.

## Commit Message

```text
feat(ai): add evidence grounded CX question panel

Plan: 2026-09-27-kpc-cx-prototype
Phase: P02-analysis-and-user-flows
Task: T07-cx-ai-panel

- Add replaceable local CX analysis adapter with approved content grounding
- Show evidence in contextual panel and collect answer feedback
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm.cmd run typecheck`, `npm.cmd run build`)
- commit: `edbd875`
