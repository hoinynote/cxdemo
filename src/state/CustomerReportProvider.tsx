import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSession } from '../auth/SessionProvider';
import type { CustomerReportDraft, CustomerReportItem } from '../domain/reports';
import { useAnalysisContext } from './AnalysisContext';
import { createReportItem } from '../features/customer-report/report-item';

interface AddReportItemDetail {
  item: CustomerReportItem;
  context: { screenId: string; filters: CustomerReportDraft['filters']; result: { filters: CustomerReportDraft['filters'] } };
}

interface CustomerReportContextValue {
  draft: CustomerReportDraft | null;
  notice: string;
  addItem(item: CustomerReportItem, filters: CustomerReportDraft['filters']): void;
  setTitle(title: string): void;
  setAnnotation(itemId: string, annotation: string): void;
  moveItem(itemId: string, direction: -1 | 1): void;
  removeItem(itemId: string): void;
  clearDraft(): void;
  clearNotice(): void;
}

const CustomerReportContext = createContext<CustomerReportContextValue | null>(null);

export function CustomerReportProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { activeProjectId, projects, visibleCompanies } = useAnalysisContext();
  const [draft, setDraft] = useState<CustomerReportDraft | null>(null);
  const [notice, setNotice] = useState('');

  const addItem = useCallback((item: CustomerReportItem, snapshot: CustomerReportDraft['filters']) => {
    const itemCopy = createReportItem({ type: item.type, title: item.title, payload: item.payload, evidence: item.evidence });
    itemCopy.annotation = item.annotation.slice(0, 240);
    setDraft((current) => {
      const projectId = activeProjectId || user?.projectIds[0] || '';
      const projectName = projects.find((project) => project.id === projectId)?.label;
      const companyName = visibleCompanies.find((company) => company.id === snapshot.subjectCompanyId)?.label;
      const scopeLabel = companyName ?? projectName ?? 'CX 분석';
      const firstDraft: CustomerReportDraft = current?.projectId === projectId ? current : {
        id: `customer-report-${Date.now()}`,
        title: `${scopeLabel} CX 리포트`,
        projectId,
        scopeLabel,
        filters: snapshot,
        items: [],
        createdAt: new Date().toISOString(),
      };
      return { ...firstDraft, items: [...firstDraft.items, itemCopy] };
    });
    setNotice(`“${item.title}”을(를) 리포트에 담았습니다.`);
  }, [activeProjectId, projects, user?.projectIds, visibleCompanies]);

  useEffect(() => {
    const handleAdd = (event: Event) => {
      const detail = (event as CustomEvent<AddReportItemDetail>).detail;
      if (!detail?.item || !detail.context?.filters) return;
      addItem(detail.item, detail.context.filters);
    };
    window.addEventListener('cx:add-report-item', handleAdd);
    return () => window.removeEventListener('cx:add-report-item', handleAdd);
  }, [addItem]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<CustomerReportContextValue>(() => ({
    draft,
    notice,
    addItem,
    setTitle(title) { setDraft((current) => current ? { ...current, title: title.slice(0, 100) } : current); },
    setAnnotation(itemId, annotation) {
      setDraft((current) => current ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, annotation: annotation.slice(0, 240) } : item) } : current);
    },
    moveItem(itemId, direction) {
      setDraft((current) => {
        if (!current) return current;
        const from = current.items.findIndex((item) => item.id === itemId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= current.items.length) return current;
        const items = [...current.items];
        [items[from], items[to]] = [items[to]!, items[from]!];
        return { ...current, items };
      });
    },
    removeItem(itemId) { setDraft((current) => current ? { ...current, items: current.items.filter((item) => item.id !== itemId) } : current); },
    clearDraft() { setDraft(null); },
    clearNotice() { setNotice(''); },
  }), [draft, notice, addItem]);

  return <CustomerReportContext.Provider value={value}>{children}</CustomerReportContext.Provider>;
}

export function useCustomerReport(): CustomerReportContextValue {
  const value = useContext(CustomerReportContext);
  if (!value) throw new Error('useCustomerReport must be used inside CustomerReportProvider.');
  return value;
}
