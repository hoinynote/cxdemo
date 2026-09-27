import { demoDataset } from '../data/demo-dataset';
import type { DemoDataset } from '../data/schema';
import type { ReportEnginePort } from '../domain/reports';
import type { ReferenceMaterial } from '../domain/projects';
import { DemoAnalyticsService } from './demo-analytics';
import { DemoAiAnalysisService } from './demo-ai';
import { DemoImportValidator } from './demo-import-validator';
import { demoFeedbackStore } from '../data/demo-feedback-store';
import { CustomerReportExporter } from './customer-report-exporter';

export class ServiceNotConfiguredError extends Error {
  constructor(serviceName: string) {
    super(`${serviceName} 서비스는 아직 구성되지 않았습니다.`);
    this.name = 'ServiceNotConfiguredError';
  }
}

const importValidator = new DemoImportValidator();
const customerReportExporter: ReportEnginePort = new CustomerReportExporter();

export function createServiceContainer(dataset: DemoDataset = demoDataset, references: ReferenceMaterial[] = []) {
  const analytics = new DemoAnalyticsService(dataset);
  return {
    analytics,
    ai: new DemoAiAnalysisService(analytics, references, demoFeedbackStore),
    reports: customerReportExporter,
    importValidator,
  };
}
