import type { AnswerFeedback, FeedbackStore } from '../domain/ai';

const STORAGE_KEY = 'kpc-cx-ai-feedback-v1';

export const demoFeedbackStore: FeedbackStore = {
  list(): AnswerFeedback[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as AnswerFeedback[] : [];
    } catch {
      return [];
    }
  },
  add(value) {
    const records = demoFeedbackStore.list();
    records.push({ ...value });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
