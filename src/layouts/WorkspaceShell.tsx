import { AnalysisProvider } from '../state/AnalysisContext';
import { CustomerReportProvider } from '../state/CustomerReportProvider';
import { WorkspaceLayout } from './WorkspaceLayout';

export default function WorkspaceShell() {
  return <AnalysisProvider><CustomerReportProvider><WorkspaceLayout /></CustomerReportProvider></AnalysisProvider>;
}
