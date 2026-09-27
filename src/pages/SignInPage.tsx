import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { findDemoUser, getHomePath, listSignInUsers } from '../auth/demo-users';
import { useSession } from '../auth/SessionProvider';

const roleLabel = { company: '기업 고객', consultant: '컨설턴트', admin: '시스템 관리자' } as const;

export function SignInPage() {
  const { user, signIn } = useSession();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  if (user) return <Navigate to={getHomePath(user.role)} replace />;

  function chooseAccount(userId: string) {
    const selected = findDemoUser(userId);
    if (!selected) {
      setMessage('계정을 확인할 수 없습니다. 아래 대표 계정을 선택해 주세요.');
      return;
    }
    signIn(userId);
    navigate(getHomePath(selected.role), { replace: true });
  }

  return (
    <main className="signin-page">
      <header className="signin-brand"><span className="brand-mark">KPC</span><span>CX</span></header>
      <section className="signin-panel" aria-labelledby="signin-title">
        <p className="eyebrow">CUSTOMER EXPERIENCE</p>
        <h1 id="signin-title">CX 서비스에 오신 것을 환영합니다</h1>
        <p className="signin-description">사용자 영역을 선택하면 해당 포털로 이동합니다.</p>
        <div className="account-list" aria-label="로그인할 대표 계정">
          {listSignInUsers().map((account) => (
            <button className="account-option" type="button" key={account.id} onClick={() => chooseAccount(account.id)}>
              <span className="account-option__text"><strong>{account.name}</strong><small>{roleLabel[account.role]}</small></span>
              <span className="account-option__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <p className="signin-note">프로토타입 계정 선택 · 비밀번호 입력 없이 이용</p>
        {message && <p className="form-message" role="alert">{message}</p>}
      </section>
    </main>
  );
}
