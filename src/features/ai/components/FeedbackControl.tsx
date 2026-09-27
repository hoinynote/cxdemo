import { useState } from 'react';
import type { FeedbackValue } from '../../../domain/ai';

export function FeedbackControl({ onSubmit }: { onSubmit: (value: FeedbackValue, comment?: string) => Promise<void> }) {
  const [selected, setSelected] = useState<FeedbackValue | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!selected) return;
    await onSubmit(selected, comment.trim() || undefined);
    setSubmitted(true);
  }

  return (
    <div className="ai-feedback">
      {submitted ? <span role="status">의견을 저장했습니다.</span> : <>
        <span>이 답변이 도움이 되었나요?</span>
        <div>
          <button type="button" aria-pressed={selected === 'helpful'} onClick={() => setSelected('helpful')}>도움이 됨</button>
          <button type="button" aria-pressed={selected === 'not-helpful'} onClick={() => setSelected('not-helpful')}>아쉬움</button>
        </div>
        {selected && <><label className="ai-feedback-comment"><span className="sr-only">선택 의견 (선택)</span><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="의견 (선택)" maxLength={300} /></label><button type="button" onClick={() => void submit()}>보내기</button></>}
      </>}
    </div>
  );
}
