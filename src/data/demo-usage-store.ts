import type { AiUsageEvent, UsageStore } from '../domain/ai';

const STORAGE_KEY = 'kpc-cx-ai-usage-v1';

export const demoUsageStore: UsageStore = {
  list(): AiUsageEvent[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as AiUsageEvent[] : [];
    } catch {
      return [];
    }
  },
  add(event) {
    const events = demoUsageStore.list();
    events.push({ ...event });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  },
  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
