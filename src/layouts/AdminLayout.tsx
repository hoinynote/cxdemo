import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { adminMenu } from '../navigation/menu';

export function AdminLayout() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  if (!user) return null;

  function logout() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <NavLink to="/admin" className="admin-brand"><span className="admin-brand__mark">KPC</span><span>서비스 운영</span></NavLink>
        <div className="admin-identity"><span>{user.name}</span><button type="button" onClick={logout}>로그아웃</button></div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="관리자 메뉴">
          <p className="admin-sidebar__caption">관리 포털</p>
          <nav>{adminMenu.map((item) => <NavLink key={item.path} end={item.path === '/admin'} to={item.path} className={({ isActive }) => `admin-link${isActive ? ' is-active' : ''}`}>{item.label}</NavLink>)}</nav>
          <div className="admin-sidebar__footer">CX 서비스 관리자</div>
        </aside>
        <main className="admin-main"><Outlet /></main>
      </div>
    </div>
  );
}
