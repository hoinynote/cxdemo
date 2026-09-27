import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../auth/SessionProvider';
import { useAnalysisContext } from '../state/AnalysisContext';
import { workspaceMenu } from '../navigation/menu';
import { useCustomerReport } from '../state/CustomerReportProvider';
import { ReportSnapshotStore } from '../services/report-snapshot-store';
import { DiagnosticReportExporter } from '../services/report-exporter';
import { TemplateDemoStore } from '../data/template-demo-store';

const roleName = { company: '기업 고객', consultant: '컨설턴트', admin: '시스템 관리자' } as const;

export function WorkspaceLayout() {
  const { user, signOut } = useSession();
  const { projects, activeProjectId, setActiveProject, filters, visibleCompanies } = useAnalysisContext();
  const { draft, notice, clearNotice } = useCustomerReport();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const companyProjectId = user?.role === 'company' ? user.projectIds[0] ?? '' : '';
  const [hasFinalDiagnostic, setHasFinalDiagnostic] = useState(false);
  const [diagnosticDownloadBusy, setDiagnosticDownloadBusy] = useState(false);
  const [diagnosticMessage, setDiagnosticMessage] = useState('');
  useEffect(() => {
    setHasFinalDiagnostic(Boolean(companyProjectId && new ReportSnapshotStore().getLatestFinal(companyProjectId)));
  }, [companyProjectId]);
  if (!user) return null;
  const projectLabel = projects.find((project) => project.id === activeProjectId)?.label ?? '프로젝트 미지정';

  function logout() {
    signOut();
    navigate('/login', { replace: true });
  }

  async function downloadDiagnosticReport() {
    if (!user || user.role !== 'company' || !companyProjectId) return;
    const report = new ReportSnapshotStore().getLatestFinal(companyProjectId);
    if (!report) { setHasFinalDiagnostic(false); return; }
    setDiagnosticDownloadBusy(true); setDiagnosticMessage('');
    try {
      const exporter = new DiagnosticReportExporter();
      const template = TemplateDemoStore.get(report.snapshot.templateId, report.snapshot.templateVersion);
      if (!template) throw new Error('보고서 생성에 사용된 템플릿 버전을 찾을 수 없습니다. 관리자에게 확인해 주세요.');
      const blob = await exporter.exportPdf(report, template, 'company');
      const filename = exporter.filename(report, template, 'company', 'pdf');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDiagnosticMessage('NCSI 진단보고서 다운로드를 시작했습니다.');
    } catch (error) { setDiagnosticMessage(error instanceof Error ? error.message : String(error)); }
    finally { setDiagnosticDownloadBusy(false); }
  }

  return (
    <div className="workspace-shell">
      <header className="workspace-header">
        <button className="mobile-nav-toggle" type="button" aria-expanded={navOpen} aria-controls="workspace-navigation" onClick={() => setNavOpen(!navOpen)}>
          <span aria-hidden="true">☰</span><span className="sr-only">메뉴</span>
        </button>
        <NavLink className="workspace-brand" to="/workspace/overview/all" aria-label="KPC CX 홈">
          <span className="brand-mark">KPC</span><span className="workspace-brand__product">CX</span>
        </NavLink>
        <div className="workspace-context">
          <span className="context-label">{user.role === 'company' ? '기업' : '현재 프로젝트'}</span>
          {user.role === 'consultant' && projects.length > 0 ? (
            <select aria-label="프로젝트 선택" value={activeProjectId} onChange={(event) => setActiveProject(event.target.value)}>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.label}</option>)}
            </select>
          ) : <strong>{user.role === 'company' ? visibleCompanies[0]?.label ?? '배정 기업 없음' : projectLabel}</strong>}
        </div>
        <button className="report-download" type="button" disabled={user.role !== 'company' || !hasFinalDiagnostic || diagnosticDownloadBusy} onClick={downloadDiagnosticReport} title={user.role === 'company' && !hasFinalDiagnostic ? '확정 보고서가 없습니다.' : undefined}>
          <span aria-hidden="true">↓</span> NCSI 진단보고서
          {user.role === 'company' && <small>{diagnosticDownloadBusy ? '파일 생성 중' : hasFinalDiagnostic ? '확정본 PDF 다운로드' : '확정 보고서 없음'}</small>}
        </button>
        {draft && draft.items.length > 0 && <NavLink className="report-compose-link" to="/workspace/report">리포트 구성 <span>{draft.items.length}</span></NavLink>}
        <details className="account-menu">
          <summary><span className="account-avatar" aria-hidden="true">{user.name.slice(0, 1)}</span><span><strong>{user.name}</strong><small>{roleName[user.role]}</small></span></summary>
          <div className="account-menu__panel"><button type="button" onClick={logout}>로그아웃</button></div>
        </details>
      </header>
      {(notice || diagnosticMessage) && <div className="report-add-notice" role="status">{diagnosticMessage || notice}<button type="button" aria-label="알림 닫기" onClick={() => { clearNotice(); setDiagnosticMessage(''); }}>×</button></div>}
      <div className="workspace-body">
        <aside id="workspace-navigation" className={`workspace-sidebar${navOpen ? ' is-open' : ''}`} aria-label="주 메뉴">
          <div className="sidebar-heading">분석 서비스</div>
          <nav>
            {workspaceMenu.filter((item) => item.roles.includes(user.role)).map((section) => (
              <div className="menu-section" key={section.path}>
                {section.children ? <p className="menu-section__label">{section.label}</p> : null}
                {section.children ? section.children.map((item) => (
                  <NavLink key={item.path} to={item.path} onClick={() => setNavOpen(false)} className={({ isActive }) => `menu-link${isActive ? ' is-active' : ''}`} aria-current={location.pathname === item.path ? 'page' : undefined}>
                    {item.label}
                  </NavLink>
                )) : <NavLink to={section.path} onClick={() => setNavOpen(false)} className={({ isActive }) => `menu-link menu-link--single${isActive ? ' is-active' : ''}`}>{section.label}</NavLink>}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer"><span className="status-dot" />2022 NCSI 데이터 연결</div>
        </aside>
        {navOpen && <button className="sidebar-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setNavOpen(false)} />}
        <main className="workspace-main"><Outlet /></main>
      </div>
      <span className="sr-only" aria-live="polite">현재 분석 대상: {filters.subjectCompanyId || '미선택'}</span>
    </div>
  );
}
