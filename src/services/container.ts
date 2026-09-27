import { demoDataset } from '../data/demo-dataset';
import type { DemoDataset } from '../data/schema';
import type { ReportEnginePort } from '../domain/reports';
import type { ReferenceMaterial } from '../domain/projects';
import { DemoAnalyticsService } from './demo-analytics';
import { DemoAiAnalysisService } from './demo-ai';
import { DemoImportValidator } from './demo-import-validator';
import { demoFeedbackStore } from '../data/demo-feedback-store';

export class ServiceNotConfiguredError extends Error {
  constructor(serviceName: string) {
    super(`${serviceName} 서비스는 아직 구성되지 않았습니다.`);
    this.name = 'ServiceNotConfiguredError';
  }
}

const unconfiguredReports: ReportEnginePort = {
  async exportCustomerReport() {
    throw new ServiceNotConfiguredError('고객 리포트');
  },
  async generateDiagnosticReport() {
    throw new ServiceNotConfiguredError('진단 보고서');
  },
};

const importValidator = new DemoImportValidator();

export function createServiceContainer(dataset: DemoDataset = demoDataset, references: ReferenceMaterial[] = []) {
  const analytics = new DemoAnalyticsService(dataset);
  return {
    analytics,
    ai: new DemoAiAnalysisService(analytics, references, demoFeedbackStore),
    reports: unconfiguredReports,
    importValidator,
  };
}
