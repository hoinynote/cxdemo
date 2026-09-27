import type { DiagnosticReport } from '../domain/diagnostic-report';

const DRAFT_KEY = 'kpc-cx-diagnostic-draft-v1:';
const FINAL_KEY = 'kpc-cx-diagnostic-final-v1:';

export class ReportSnapshotStore {
  getDraft(projectId: string): DiagnosticReport | null {
    return this.read(`${DRAFT_KEY}${projectId}`);
  }

  getDraftById(reportId: string): DiagnosticReport | null {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (!key.startsWith(DRAFT_KEY)) continue;
        const report = this.read(key);
        if (report?.id === reportId) return report;
      }
      return null;
    } catch {
      return null;
    }
  }

  saveDraft(report: DiagnosticReport): void {
    if (report.status === 'finalized') throw new Error('확정 보고서는 초안 저장소에 저장할 수 없습니다.');
    this.write(`${DRAFT_KEY}${report.projectId}`, report);
  }

  replaceLatest(report: DiagnosticReport): void {
    if (report.status !== 'finalized' || !report.finalizedAt) throw new Error('확정된 보고서만 발행본으로 저장할 수 있습니다.');
    this.write(`${FINAL_KEY}${report.projectId}`, report);
    this.remove(`${DRAFT_KEY}${report.projectId}`);
  }

  getLatest(projectId: string): DiagnosticReport | null {
    const report = this.read(`${FINAL_KEY}${projectId}`);
    return report?.status === 'finalized' ? report : null;
  }

  private read(key: string): DiagnosticReport | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const report = JSON.parse(raw) as DiagnosticReport;
      return report && Array.isArray(report.pages) ? report : null;
    } catch {
      return null;
    }
  }

  private write(key: string, report: DiagnosticReport): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(report));
    } catch {
      throw new Error('브라우저 저장 공간에 보고서를 저장하지 못했습니다. 기존 데이터는 유지했습니다.');
    }
  }

  private remove(key: string): void {
    try { window.localStorage.removeItem(key); } catch { /* Keep the finalized artifact even if draft cleanup fails. */ }
  }
}
