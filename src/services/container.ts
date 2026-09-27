import { demoDataset } from '../data/demo-dataset';
import type { DemoDataset } from '../data/schema';
import type { AiAnalysisPort } from '../domain/ai';
import type { ReportEnginePort } from '../domain/reports';
import { DemoAnalyticsService } from './demo-analytics';
import { DemoImportValidator } from './demo-import-validator';

export class ServiceNotConfiguredError extends Error {
  constructor(serviceName: string) {
    super(`${serviceName} 서비스는 아직 구성되지 않았습니다.`);
    this.name = 'ServiceNotConfiguredError';
  }
}

const unconfiguredAi: AiAnalysisPort = {
  async ask() {
    throw new ServiceNotConfiguredError('CX AI');
  },
  async submitFeedback() {
    throw new ServiceNotConfiguredError('AI 피드백');
  },
};

const unconfiguredReports: ReportEnginePort = {
  async exportCustomerReport() {
    throw new ServiceNotConfiguredError('고객 리포트');
  },
  async generateDiagnosticReport() {
    throw new ServiceNotConfiguredError('진단 보고서');
  },
};

const importValidator = new DemoImportValidator();

export function createServiceContainer(dataset: DemoDataset = demoDataset) {
  return {
    analytics: new DemoAnalyticsService(dataset),
    ai: unconfiguredAi,
    reports: unconfiguredReports,
    importValidator,
  };
}
