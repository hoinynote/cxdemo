import { useMemo } from 'react';
import type { DiagnosticPage, DiagnosticTemplate } from '../../../domain/diagnostic-template';
import { ContainerScopeBadge } from './ContainerScopeBadge';
import './template-outline.css';
export function TemplateOutline({ template, activePage = 1, onSelectPage }: {
  template: DiagnosticTemplate; activePage?: number; onSelectPage?(page: DiagnosticPage): void;
}) {
  const sections = useMemo(() => template.pages.reduce<Record<string, DiagnosticPage[]>>((groups, page) => {
    (groups[page.sectionId] ??= []).push(page); return groups;
  }, {}), [template.pages]);
  return <nav className="template-outline" aria-label="\uc9c4\ub2e8\ubcf4\uace0\uc11c \ubaa9\ucc28">
    <header className="template-outline__header"><strong>\ubcf4\uace0\uc11c \uad6c\uc131</strong>
      <span>{template.pages.length} \ud398\uc774\uc9c0 / {template.pages.reduce((sum, page) => sum + page.containers.length, 0)} \ucee8\ud14c\uc774\ub108</span>
    </header>
    <ol className="template-outline__sections">
      {Object.entries(sections).map(([sectionId, pages]) => <li key={sectionId}>
        <details open={pages.some(page => page.number === activePage)}>
          <summary><span>{sectionId.replaceAll('-', ' ')}</span><small>{pages.length}p</small></summary>
          <ol className="template-outline__pages">{pages.map(page => <li key={page.number}>
            <button type="button" className={page.number === activePage ? 'is-active' : ''}
              aria-current={page.number === activePage ? 'page' : undefined} onClick={() => onSelectPage?.(page)}>
              <span className="template-outline__page-title"><small>{String(page.number).padStart(2, '0')}</small>{page.title}</span>
              <span className="template-outline__badges">{page.containers.map(container => <ContainerScopeBadge key={container.id} scope={container.scopes[0]} />)}</span>
            </button>
          </li>)}</ol>
        </details>
      </li>)}
    </ol>
  </nav>;
}
