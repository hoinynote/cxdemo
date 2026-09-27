import type { AnalysisResult, EvidenceRef } from './analytics';
import type { AnalysisFilters } from './filters';

export interface AiQuestion {
  text: string;
  filters: AnalysisFilters;
  screenId: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
}

export interface AiAnswer {
  text: string;
  result: AnalysisResult;
  evidence: EvidenceRef[];
  followUpSuggestions: string[];
  deterministicKey: string;
}

export interface AnswerFeedback {
  answerId: string;
  role: 'company' | 'consultant';
  projectId: string;
  value: 'helpful' | 'not-helpful';
  comment?: string;
  createdAt: string;
}

export interface AiAnalysisPort {
  ask(question: AiQuestion): Promise<AiAnswer>;
  submitFeedback(input: AnswerFeedback): Promise<void>;
}
