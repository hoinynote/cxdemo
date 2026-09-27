import type { ContentScope } from '../../../domain/diagnostic-template';
const labels: Record<ContentScope, string> = {
  'customer-specific': '\uace0\uac1d\uc0ac \ud2b9\ud654',
  'industry-general': '\uc5c5\uc885 \uc77c\ubc18',
  'sector-general': '\uc0b0\uc5c5 \uc77c\ubc18',
  'overall-general': '\uc804\uccb4 \uc77c\ubc18',
};
export function ContainerScopeBadge({ scope }: { scope: ContentScope }) {
  return <span className={`template-scope-badge template-scope-badge--${scope}`} aria-label={`\ucf58\ud150\uce20 \ubc94\uc704: ${labels[scope]}`}>{labels[scope]}</span>;
}
