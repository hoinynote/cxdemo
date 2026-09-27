import type { AnalysisResult, EvidenceRef, SeriesPoint } from './analytics';
import type { AnalysisFilters } from './filters';

export interface AiQuestion {
  text: string;
  filters: AnalysisFilters;
  screenId: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface AiAnswer {
  id: string;
  headline: string;
  text: string;
  result: AnalysisResult;
  evidence: EvidenceRef[];
  visualization: { type: 'comparison' | 'factors' | 'table' | 'none'; title: string; data: SeriesPoint[] };
  referenceIds: string[];
  sourcePeriod: string;
  followUpSuggestions: string[];
  deterministicKey: string;
}

export type FeedbackValue = 'helpful' | 'not-helpful';

export interface AnswerFeedback {
  answerId: string;
  role: 'company' | 'consultant';
  projectId: string;
  value: FeedbackValue;
  comment?: string;
  createdAt: string;
}

export interface AiAnalysisPort {
  ask(question: AiQuestion): Promise<AiAnswer>;
  submitFeedback(input: AnswerFeedback): Promise<void>;
}

export interface FeedbackStore {
  list(): AnswerFeedback[];
  add(value: AnswerFeedback): void;
  clear(): void;
}

export interface AiUsageEvent {
  id: string;
  role: 'company' | 'consultant';
  projectId: string;
  screenId: string;
  createdAt: string;
}

export interface UsageStore {
  list(): AiUsageEvent[];
  add(event: AiUsageEvent): void;
  clear(): void;
}
