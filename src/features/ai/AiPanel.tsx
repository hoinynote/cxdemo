import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useSession } from '../../auth/SessionProvider';
import { demoUsageStore } from '../../data/demo-usage-store';
import type { AiAnswer, AiQuestion, FeedbackValue } from '../../domain/ai';
import type { CustomerReportItem } from '../../domain/reports';
import { useAnalysisContext } from '../../state/AnalysisContext';
import { createServiceContainer } from '../../services/container';
import { getProjectReferences } from '../../services/project-data-store';
import { AnswerEvidence } from './components/AnswerEvidence';
import { FeedbackControl } from './components/FeedbackControl';

interface Message { id: string; role: 'user' | 'assistant'; text: string; answer?: AiAnswer }

export function AiPanel({ screenId, onClose }: { screenId: string; onClose: () => void }) {
  const { user } = useSession();
  const { dataset, activeProjectId, filters } = useAnalysisContext();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const role = user?.role === 'consultant' ? 'consultant' : 'company';
  const service = useMemo(() => createServiceContainer(dataset, getProjectReferences(activeProjectId)).ai, [dataset, activeProjectId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  async function ask(text: string) {
    const cleanText = text.trim();
    if (!cleanText || busy || !user) return;
    const history = messages.slice(-6).map(({ role: messageRole, text: messageText }) => ({ role: messageRole, text: messageText }));
    setMessages((current) => [...current, { id: `question-${Date.now()}`, role: 'user', text: cleanText }]);
    setQuestion('');
    setBusy(true);
    setError('');
    try {
      const input: AiQuestion = { text: cleanText, filters, screenId, history };
      const answer = await service.ask(input);
      setMessages((current) => [...current, { id: answer.id, role: 'assistant', text: answer.text, answer }]);
      demoUsageStore.add({ id: answer.id, role, projectId: activeProjectId, screenId, createdAt: new Date().toISOString() });
    } catch {
      setError('분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  async function recordFeedback(answer: AiAnswer, value: FeedbackValue, comment?: string) {
    await service.submitFeedback({ answerId: answer.id, role, projectId: activeProjectId, value, comment, createdAt: new Date().toISOString() });
  }

  function addToReport(answer: AiAnswer) {
    const item: CustomerReportItem = {
      id: `ai-${answer.id}`,
      type: 'ai-insight',
      title: answer.headline,
      annotation: `${answer.sourcePeriod}년 분석 · 현재 선택 조건`,
      payload: answer,
      evidence: answer.evidence,
    };
    window.dispatchEvent(new CustomEvent('cx:add-report-item', { detail: { item, context: { screenId, filters: answer.result.filters, result: answer.result } } }));
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void ask(question); }

  return (
    <div className="ai-panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="ai-panel" role="dialog" aria-modal="true" aria-labelledby="ai-panel-title">
        <header className="ai-panel-heading">
          <div><p>CX ANALYSIS</p><h2 id="ai-panel-title">CX AI 분석</h2><span>현재 페이지와 선택한 분석 조건을 기준으로 답변합니다.</span></div>
          <button type="button" className="ai-panel-close" onClick={onClose} aria-label="AI 패널 닫기">×</button>
        </header>
        <div className="ai-filter-context"><span>분석 기준</span><strong>{filters.year}년 · 선택 기업 및 현재 필터</strong></div>
        <div className="ai-conversation" ref={scrollRef} aria-live="polite">
          {messages.length === 0 && <div className="ai-welcome"><strong>무엇을 확인할까요?</strong><p>연결된 분석 데이터와 검토 완료 참고자료에 근거해 답변합니다.</p><div>{['현재 기업의 NCSI와 비교 기업을 알려줘', '선택한 고객군의 NCSI는 얼마야?', '점수가 높은 품질요인과 낮은 품질요인은?'].map((suggestion) => <button type="button" key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}</button>)}</div></div>}
          {messages.map((message) => <article key={message.id} className={`ai-message is-${message.role}`}>
            <span className="ai-message-role">{message.role === 'user' ? '질문' : '분석 결과'}</span>
            {message.answer ? <>
              <h3>{message.answer.headline}</h3><p className="ai-answer-text">{message.answer.text}</p>
              <AnswerVisualization answer={message.answer} />
              <AnswerEvidence answer={message.answer} role={role} />
              <div className="ai-answer-actions"><button type="button" onClick={() => addToReport(message.answer!)}>리포트에 담기</button></div>
              <FeedbackControl onSubmit={(value, comment) => recordFeedback(message.answer!, value, comment)} />
            </> : <p>{message.text}</p>}
          </article>)}
          {busy && <p className="ai-loading" role="status">선택 조건의 데이터를 분석하고 있습니다…</p>}
          {error && <p className="ai-error" role="alert">{error}</p>}
        </div>
        <form className="ai-question-form" onSubmit={submit}>
          <label htmlFor="ai-question">CX/NCSI 데이터에 질문</label>
          <div><input id="ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="예: 현재 기업에서 낮은 품질요인은?" disabled={busy} /><button type="submit" disabled={busy || !question.trim()}>질문</button></div>
          <p>질문 내용은 이 화면을 닫으면 저장되지 않습니다.</p>
        </form>
      </aside>
    </div>
  );
}

function AnswerVisualization({ answer }: { answer: AiAnswer }) {
  const data = answer.visualization.data.filter((point) => point.value !== null);
  if (answer.visualization.type === 'none' || data.length === 0) return null;
  const maximum = Math.max(...data.map((point) => point.value ?? 0), 1);
  return (
    <section className="ai-visualization" aria-label={answer.visualization.title}>
      <h4>{answer.visualization.title}</h4>
      {answer.visualization.type === 'comparison' || answer.visualization.type === 'factors' ? <ul className="ai-bar-list">{data.map((point) => <li key={point.id}><div><span>{point.label}</span><strong>{point.value!.toFixed(2)}</strong></div><span className="ai-bar-track"><span style={{ width: `${Math.max(3, (point.value! / maximum) * 100)}%` }} /></span></li>)}</ul> : <div className="ai-value-table"><span>{data[0]!.label}</span><strong>{data[0]!.value!.toFixed(2)}점</strong><small>응답 {data[0]!.respondentCount.toLocaleString()}명</small></div>}
    </section>
  );
}
