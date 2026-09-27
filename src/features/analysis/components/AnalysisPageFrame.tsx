import { GlobalFilterBar } from './GlobalFilterBar';
import { useAnalysisScreen } from '../analysis-context';
import type { ReactNode } from 'react';
import type { AnalysisResult } from '../../../domain/analytics';
import type { AnalysisFilters } from '../../../domain/filters';
import type { CustomerReportItem } from '../../../domain/reports';
import { useEffect, useState } from 'react';
import { AiPanel } from '../../ai/AiPanel';
import { AddToReportButton } from './AddToReportButton';

export interface AnalysisActionContext {
  screenId: string;
  filters: AnalysisFilters;
  result: AnalysisResult;
}

export function AnalysisPageFrame({ title, screenId, children }: { title: string; screenId: string; children: ReactNode }) {
  const { user, result, viewModel, filters } = useAnalysisScreen(title);
  const [aiOpen, setAiOpen] = useState(false);
  const filtered = Object.values(filters.dimensions).some(Boolean);
  const actionContext: AnalysisActionContext = { screenId, filters, result };

  function askAi() {
    window.dispatchEvent(new CustomEvent<AnalysisActionContext>('cx:open-ai', { detail: actionContext }));
  }

  useEffect(() => {
    const openPanel = () => setAiOpen(true);
    window.addEventListener('cx:open-ai', openPanel);
    return () => window.removeEventListener('cx:open-ai', openPanel);
  }, []);

  const evidence = result.subjectNCSI.evidence ? [result.subjectNCSI.evidence] : [];
  const kpiItem: Omit<CustomerReportItem, 'id'> = {
      type: 'metric',
      title: `${title} NCSI`,
      annotation: filtered ? '필터 응답자 집계' : '2022 원천 응답 전체 집계',
      payload: result.subjectNCSI,
      evidence,
  };

  return (
    <div className="analysis-page">
      <header className="analysis-page-heading">
        <div><p className="analysis-eyebrow">KPC CUSTOMER EXPERIENCE</p><h1>{title}</h1><p className="analysis-page-subtitle">2022년 {filtered ? '필터 응답자 집계' : '전체 응답 집계'} · {viewModel.respondentCount.toLocaleString()}명</p></div>
        <div className="analysis-page-actions"><button type="button" className="secondary-action" onClick={askAi}>AI에게 질문</button><AddToReportButton item={kpiItem} filters={filters} result={result} screenId={screenId} className="primary-action">리포트에 담기</AddToReportButton></div>
      </header>
      <GlobalFilterBar />
      {user?.role === 'consultant' && viewModel.evidence.length > 0 && <p className="consultant-evidence-count">근거 확인 가능 · {viewModel.evidence.length}개 출처 레코드</p>}
      {children}
      {aiOpen && <AiPanel screenId={screenId} onClose={() => setAiOpen(false)} />}
    </div>
  );
}
