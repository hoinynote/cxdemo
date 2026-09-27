import { AnalysisProvider } from '../state/AnalysisContext';
import { WorkspaceLayout } from './WorkspaceLayout';

export default function WorkspaceShell() {
  return <AnalysisProvider><WorkspaceLayout /></AnalysisProvider>;
}
