import type { DemoDataset, DimensionKey } from '../data/schema';
import type { AnalysisResult, EvidenceRef, SeriesPoint } from '../domain/analytics';
import type { ReferenceMaterial } from '../domain/projects';
import type { DiagnosticEvidence, DiagnosticReport, DiagnosticReportEnginePort, RenderedContainer, ReviewIssue } from '../domain/diagnostic-report';
import type { DiagnosticContainer, DiagnosticPage } from '../domain/diagnostic-template';
import type { DiagnosticReportInput } from '../domain/reports';
import { TemplateDemoStore } from '../data/template-demo-store';
import { getProjectReferences, getProjectSummary, saveProjectReportStatus } from './project-data-store';
import { ReportSnapshotStore } from './report-snapshot-store';
import { DemoAnalyticsService } from './demo-analytics';

const CALCULATION_VERSION = 'ncsi-demo-calculation-v1';
const DIMENSIONS: Array<{ key: DimensionKey; fieldId: string; label: string }> = [
  { key: 'gender', fieldId: 'GENDER', label: '성별' },
  { key: 'ageGroup', fieldId: 'AGE1', label: '연령대' },
  { key: 'branch', fieldId: 'B0101', label: '지점' },
  { key: 'nationality', fieldId: 'NATIONAL', label: '국적' },
];

export class DiagnosticReportInputError extends Error {
  constructor(message: string) { super(message); this.name = 'DiagnosticReportInputError'; }
}

export class DemoDiagnosticReportEngine implements DiagnosticReportEnginePort {
  private readonly analytics: DemoAnalyticsService;

  constructor(
    private readonly dataset: DemoDataset,
    private readonly store = new ReportSnapshotStore(),
  ) {
    this.analytics = new DemoAnalyticsService(dataset);
  }

  async generate(input: DiagnosticReportInput, generatedBy: string): Promise<DiagnosticReport> {
    const template = TemplateDemoStore.getActive();
    const project = getProjectSummary(input.projectId);
    if (!project) throw new DiagnosticReportInputError('프로젝트를 찾을 수 없습니다.');
    if (project.dataStatus !== 'ready') throw new DiagnosticReportInputError('NCSI 진단보고서 생성에는 준비 완료 상태의 데이터가 필요합니다.');
    if (input.datasetId !== this.dataset.id) throw new DiagnosticReportInputError('선택 프로젝트 데이터셋이 변경되었습니다. 화면을 새로고침한 뒤 다시 생성하세요.');
    if (input.templateId !== template.id || input.templateVersion !== template.version) throw new DiagnosticReportInputError('지원하지 않는 NCSI 템플릿 버전입니다. 화면을 새로고침한 뒤 다시 생성하세요.');
    if (project.year !== 2022 || input.filters.year !== project.year || this.dataset.year !== project.year) throw new DiagnosticReportInputError('현재 NCSI 데모 보고서는 2022년 데이터만 지원합니다.');
    if (input.filters.subjectCompanyId !== project.subjectCompanyId
      || !sameIds(input.filters.comparisonCompanyIds, project.comparisonCompanyIds)
      || input.filters.industryId !== this.dataset.industryId) {
      throw new DiagnosticReportInputError('대상 기업·비교 기업·업종은 프로젝트 범위와 일치해야 합니다.');
    }
    if (!generatedBy.trim()) throw new DiagnosticReportInputError('생성 담당자 정보를 확인할 수 없습니다.');

    const projectReferences = getProjectReferences(project.id);
    const approvedReferences = projectReferences.filter((reference) => reference.status === 'approved');
    const analysis = this.analytics.analyze(input.filters);
    const pages = template.pages.map((page) => ({
      pageNumber: page.number,
      title: page.title,
      sectionId: page.sectionId,
      containers: page.containers.map((container) => this.bindContainer(container, page, input, analysis, approvedReferences, project)),
    }));
    const report: DiagnosticReport = {
      id: createId('diagnostic'),
      projectId: project.id,
      status: 'draft',
      snapshot: {
        projectId: project.id,
        datasetId: this.dataset.id,
        datasetVersion: this.dataset.mappingVersion,
        sourceHash: this.dataset.sourceHash,
        filters: cloneFilters(input.filters),
        subjectCompanyId: project.subjectCompanyId,
        comparisonCompanyIds: [...project.comparisonCompanyIds],
        calculationVersion: CALCULATION_VERSION,
        templateId: template.id,
        templateVersion: template.version,
        approvedReferenceIds: [...new Set(pages.flatMap((page) => page.containers.flatMap((item) => item.evidence.flatMap((evidence) => isReferenceEvidence(evidence) ? [evidence.referenceId] : []))))],
        generatedAt: new Date().toISOString(),
      },
      pages,
      generatedBy,
      reviewerId: null,
      finalizedAt: null,
    };
    this.store.saveDraft(report);
    saveProjectReportStatus(project.id, 'draft');
    return report;
  }

  updateNarrative(reportId: string, containerId: string, text: string): DiagnosticReport {
    const report = this.requireDraft(reportId);
    const container = findContainer(report, containerId);
    if (!container.editable) throw new Error('수치·표·차트 영역은 원천 데이터에서 생성되므로 수정할 수 없습니다.');
    if (container.maxCharacters !== null && text.length > container.maxCharacters) throw new Error(`최대 ${container.maxCharacters}자까지 입력할 수 있습니다.`);
    const updated = replaceContainer(report, { ...container, value: text, reviewState: text.trim() ? 'ready' : 'missing' });
    this.store.saveDraft(updated);
    return updated;
  }

  setRequiredPoint(reportId: string, containerId: string, point: string, checked: boolean): DiagnosticReport {
    const report = this.requireDraft(reportId);
    const container = findContainer(report, containerId);
    if (!container.requiredPoints.includes(point)) throw new Error('템플릿에 정의되지 않은 검토 항목입니다.');
    const checkedPoints = checked
      ? [...new Set([...container.checkedPoints, point])]
      : container.checkedPoints.filter((item) => item !== point);
    const updated = replaceContainer(report, { ...container, checkedPoints });
    this.store.saveDraft(updated);
    return updated;
  }

  submitForReview(reportId: string): DiagnosticReport {
    const report = this.requireDraft(reportId);
    const next = { ...report, status: 'in-review' as const };
    this.store.saveDraft(next);
    saveProjectReportStatus(report.projectId, 'in-review');
    return next;
  }

  checkDraft(report: DiagnosticReport): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    for (const page of report.pages) for (const item of page.containers) {
      if (!item.scope.length) issues.push(issue(page, item, 'scope', '콘텐츠 범위가 지정되지 않았습니다.'));
      if (item.kind === 'computed') {
        const points = item.value as SeriesPoint[];
        if (points.some((point) => point.value !== null && !point.evidence)) issues.push(issue(page, item, 'evidence', '수치 근거가 누락되었습니다.'));
        if (item.required && (!points.length || points.some((point) => point.value === null || !point.evidence))) {
          issues.push(issue(page, item, 'missing', '필수 원천 수치 또는 근거가 없습니다.'));
        }
        continue;
      }
      if (!item.required) continue;
      if (item.kind === 'ai-draft' && item.reviewState !== 'ready') {
        issues.push(issue(page, item, 'missing', '필수 분석값 또는 검토 문안에 필요한 근거가 없습니다.'));
      }
      if (item.kind === 'ai-draft') {
        for (const point of item.requiredPoints) if (!item.checkedPoints.includes(point)) issues.push(issue(page, item, 'required-point', `검토 항목을 확인해 주세요: ${point}`));
        if (item.maxCharacters !== null && String(item.value).length > item.maxCharacters) issues.push(issue(page, item, 'overflow', `최대 ${item.maxCharacters}자를 초과했습니다.`));
      }
    }
    return issues;
  }

  finalize(reportId: string, reviewerId: string): DiagnosticReport {
    if (!reviewerId.trim()) throw new Error('최종 검토자를 확인할 수 없습니다.');
    const report = this.requireDraft(reportId);
    const issues = this.checkDraft(report);
    if (issues.length) throw new Error(`필수 검토 항목 ${issues.length}건을 해결해야 최종 확정할 수 있습니다.`);
    const finalized: DiagnosticReport = { ...report, status: 'finalized', reviewerId, finalizedAt: new Date().toISOString() };
    this.store.replaceLatest(finalized);
    saveProjectReportStatus(report.projectId, 'finalized');
    return finalized;
  }

  getDraft(projectId: string): DiagnosticReport | null { return this.store.getDraft(projectId); }
  getLatestFinalized(projectId: string): DiagnosticReport | null { return this.store.getLatest(projectId); }

  private requireDraft(reportId: string): DiagnosticReport {
    const report = this.store.getDraftById(reportId);
    if (report) return report;
    throw new Error('편집 가능한 진단보고서 초안을 찾을 수 없습니다. 새로 생성해 주세요.');
  }

  private bindContainer(
    config: DiagnosticContainer,
    page: DiagnosticPage,
    input: DiagnosticReportInput,
    analysis: AnalysisResult,
    references: ReferenceMaterial[],
    project: NonNullable<ReturnType<typeof getProjectSummary>>,
  ): RenderedContainer {
    const base = {
      containerId: config.id,
      sourceContainerId: config.sourceContainerId,
      pageNumber: page.number,
      title: config.title,
      kind: config.kind,
      scope: config.scopes,
      editable: config.kind === 'ai-draft',
      requiredPoints: config.requiredPoints,
      checkedPoints: [] as string[],
      maxCharacters: config.maxCharacters,
      required: config.required,
      exampleLabel: config.exampleLabel,
    };
    let value: RenderedContainer['value'];
    let evidence: DiagnosticEvidence[] = [];
    let reviewState: RenderedContainer['reviewState'] = 'ready';

    if (config.kind === 'computed') {
      if (config.dataBinding === 'ncsi') {
        const candidates = [analysis.subjectNCSI, ...analysis.comparisonSeries];
        value = candidates.map((candidate, index) => ({
          id: index === 0 ? input.filters.subjectCompanyId : analysis.comparisonSeries[index - 1]?.id ?? `company-${index}`,
          label: index === 0 ? '진단 대상' : analysis.comparisonSeries[index - 1]?.label ?? '비교 기업',
          value: candidate.value,
          respondentCount: index === 0 ? analysis.respondentCount : analysis.comparisonSeries[index - 1]?.respondentCount ?? 0,
          evidence: candidate.evidence,
          ...(candidate.unavailableReason ? { unavailableReason: candidate.unavailableReason } : {}),
        }));
      } else if (config.dataBinding === 'quality-factor') {
        value = analysis.factorScores;
      } else {
        value = this.distributionSeries(config, input);
      }
      evidence = (value as SeriesPoint[]).flatMap((point) => point.evidence ? [point.evidence] : []);
      reviewState = hasValidNumbers(value as SeriesPoint[]) ? 'ready' : 'missing';
    } else if (page.number === 1 && config.sourceContainerId === '1-1') {
      const subjectLabel = this.dataset.companies.find((company) => company.id === project.subjectCompanyId)?.label ?? '대상 기업 미확인';
      const comparisonLabels = project.comparisonCompanyIds.map((id) => this.dataset.companies.find((company) => company.id === id)?.label ?? '비교 기업 미확인');
      value = `${project.name} · ${project.year}년 · ${subjectLabel} · ${comparisonLabels.join(', ')}`;
      evidence = [{ kind: 'project-scope', projectId: project.id, title: project.name, sourceScope: 'customer-specific', updatedAt: project.updatedAt }];
    } else if (config.kind === 'ai-draft') {
      const refs = references.filter((item) => item.status === 'approved' && config.scopes.includes(scopeForReference(item)));
      evidence = [...analysisEvidence(analysis), ...refs.map((reference) => ({ kind: 'reference' as const, referenceId: reference.id, title: reference.title, sourceScope: scopeForReference(reference), reviewedBy: reference.reviewedBy ?? '', updatedAt: reference.updatedAt }))];
      value = buildDraftText(config, analysis, refs);
      reviewState = evidence.length ? 'ready' : 'missing';
    } else if (config.dataBinding === 'reference') {
      const matching = referencesForScope(references, config.scopes[0]);
      evidence = matching.map((reference) => ({ kind: 'reference', referenceId: reference.id, title: reference.title, sourceScope: config.scopes[0], reviewedBy: reference.reviewedBy ?? '', updatedAt: reference.updatedAt }));
      value = matching.map((reference) => `${reference.title}\n${reference.body}`).join('\n\n');
      reviewState = matching.length ? 'ready' : 'missing';
    } else if (config.dataBinding === 'respondent-behavior') {
      value = config.exampleLabel ?? '응답행동 원천 지표가 현재 데이터셋에 없습니다.';
      reviewState = 'missing';
    } else {
      value = config.title;
    }

    if (config.kind === 'ai-draft' && config.maxCharacters !== null && String(value).length > config.maxCharacters) {
      value = String(value).slice(0, config.maxCharacters);
      reviewState = 'overflow';
    }
    return { ...base, value, evidence, reviewState };
  }

  private distributionSeries(config: DiagnosticContainer, input: DiagnosticReportInput): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const sourceFieldIds: readonly string[] = config.sourceFieldIds;
    for (const dimension of DIMENSIONS.filter((item) => sourceFieldIds.includes(item.fieldId))) {
      const groups = new Map<string, number>();
      for (const cell of this.dataset.cells) {
        if (cell.companyId !== input.filters.subjectCompanyId || cell.year !== input.filters.year) continue;
        if (!matchesSelectedDimensions(cell.dimensions, input.filters.dimensions, dimension.key)) continue;
        const label = cell.dimensions[dimension.key] ?? '미분류';
        groups.set(label, (groups.get(label) ?? 0) + cell.respondentCount);
      }
      for (const [label, respondentCount] of groups) {
        const evidence: EvidenceRef = {
          datasetId: this.dataset.id,
          sourceHash: this.dataset.sourceHash,
          fieldIds: [dimension.fieldId],
          companyId: input.filters.subjectCompanyId,
          year: input.filters.year,
          filters: { ...input.filters.dimensions },
          respondentCount,
          calculationId: 'respondent-distribution',
        };
        points.push({ id: `${dimension.key}:${label}`, label: `${dimension.label} · ${label}`, value: respondentCount, respondentCount, evidence });
      }
    }
    return points;
  }
}

function referencesForScope(references: ReferenceMaterial[], scope: string): ReferenceMaterial[] {
  return references.filter((item) => item.status === 'approved' && scopeForReference(item) === scope);
}

function scopeForReference(reference: ReferenceMaterial): DiagnosticContainer['scopes'][number] {
  if (reference.kind === 'method') return 'overall-general';
  if (reference.kind === 'industry') return 'industry-general';
  return 'customer-specific';
}

function buildDraftText(config: DiagnosticContainer, analysis: AnalysisResult, references: ReferenceMaterial[]): string {
  const facts = analysis.subjectNCSI.value !== null || analysis.factorScores.some((item) => item.value !== null);
  const referenceTitles = references.map((item) => item.title).join(', ');
  const text = facts
    ? `검토용 초안입니다. ${config.title}은 연결된 분석 결과${referenceTitles ? `와 승인 참고자료(${referenceTitles})` : ''}를 근거로 해석을 보완해 주세요.`
    : `검토용 초안입니다. ${config.title}에 필요한 분석 결과와 근거 자료를 확인한 뒤 내용을 작성해 주세요.`;
  return config.maxCharacters === null ? text : text.slice(0, config.maxCharacters);
}

function analysisEvidence(analysis: AnalysisResult): EvidenceRef[] {
  return [analysis.subjectNCSI.evidence, ...analysis.comparisonSeries.map((item) => item.evidence), ...analysis.factorScores.map((item) => item.evidence)]
    .filter((item): item is EvidenceRef => item !== null);
}

function isReferenceEvidence(evidence: DiagnosticEvidence): evidence is Extract<DiagnosticEvidence, { kind: 'reference' }> {
  return 'referenceId' in evidence;
}

function hasValidNumbers(points: SeriesPoint[]): boolean {
  return points.length > 0 && points.every((point) => point.value !== null && point.evidence !== null);
}

function matchesSelectedDimensions(dimensions: DemoDataset['cells'][number]['dimensions'], selected: Record<string, string | undefined>, except: DimensionKey): boolean {
  return (Object.entries(selected) as Array<[DimensionKey, string | undefined]>).every(([key, value]) => key === except || !value || dimensions[key] === value);
}

function findContainer(report: DiagnosticReport, id: string): RenderedContainer {
  const container = report.pages.flatMap((page) => page.containers).find((item) => item.containerId === id);
  if (!container) throw new Error('보고서 컨테이너를 찾을 수 없습니다.');
  return container;
}

function replaceContainer(report: DiagnosticReport, updated: RenderedContainer): DiagnosticReport {
  return {
    ...report,
    pages: report.pages.map((page) => ({ ...page, containers: page.containers.map((item) => item.containerId === updated.containerId ? updated : item) })),
  };
}

function issue(page: DiagnosticReport['pages'][number], item: RenderedContainer, code: ReviewIssue['code'], message: string): ReviewIssue {
  return { containerId: item.containerId, pageNumber: page.pageNumber, code, message };
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function cloneFilters(filters: DiagnosticReportInput['filters']): DiagnosticReportInput['filters'] {
  return { ...filters, comparisonCompanyIds: [...filters.comparisonCompanyIds], dimensions: { ...filters.dimensions } };
}

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}
