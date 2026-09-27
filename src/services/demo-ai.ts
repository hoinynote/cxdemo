import { APPROVED_ANSWER_RULES } from '../data/approved-content/answer-rules';
import type { DemoAnalyticsService } from './demo-analytics';
import type { AiAnalysisPort, AiAnswer, AiQuestion, AnswerFeedback, FeedbackStore } from '../domain/ai';
import type { EvidenceRef, SeriesPoint } from '../domain/analytics';
import type { ReferenceMaterial } from '../domain/projects';

type Intent = 'period' | 'references' | 'factors' | 'comparison' | 'subgroup' | 'subject' | 'unsupported';

let answerSequence = 0;

export class DemoAiAnalysisService implements AiAnalysisPort {
  private readonly approvedReferences: ReferenceMaterial[];

  constructor(
    private readonly analytics: DemoAnalyticsService,
    refs: ReferenceMaterial[],
    private readonly feedbackStore: FeedbackStore,
  ) {
    this.approvedReferences = refs.filter((reference) => reference.status === 'approved');
  }

  async ask(input: AiQuestion): Promise<AiAnswer> {
    const result = this.analytics.analyze(input.filters);
    let intent = classifyIntent(input.text, input.filters.dimensions);
    const requestedYear = [...input.text.matchAll(/20\d{2}/g)].map(([year]) => Number(year)).find((year) => year !== input.filters.year);
    if (requestedYear !== undefined) intent = 'period';
    const selectedComparisons = result.comparisonSeries.filter((point) =>
      point.value !== null && (!input.text.trim() || input.text.toLocaleLowerCase('ko').includes(point.label.toLocaleLowerCase('ko')) || hasComparisonRequest(input.text)),
    );
    let headline = '답변 가능한 분석 범위';
    let text: string = APPROVED_ANSWER_RULES.unsupportedMessage;
    let visualization: AiAnswer['visualization'] = { type: 'none', title: '', data: [] };
    let evidence: EvidenceRef[] = [];
    let referenceIds: string[] = [];

    if (intent === 'period') {
      const year = requestedYear ?? extractYear(input.text) ?? input.filters.year;
      const available = this.analytics.getDatasetStatus().year;
      headline = '데이터 제공 기간';
      text = year === available
        ? `${available}년 원천 응답 데이터가 연결되어 있습니다. 다른 연도의 비교 수치는 현재 자료에서 확인할 수 없습니다.`
        : `${year}년 원천 데이터는 제공되지 않습니다. 현재 확인 가능한 기간은 ${available}년입니다.`;
    } else if (intent === 'references') {
      headline = '승인된 프로젝트 참고자료';
      if (this.approvedReferences.length === 0) {
        text = '이 프로젝트에 검토 완료된 참고자료가 없어 해석이나 제언을 제공할 수 없습니다. 참고자료를 등록하고 검토 완료한 뒤 다시 질문해 주세요.';
      } else {
        const metric = result.subjectNCSI;
        const sourceSummary = metric.value === null
          ? APPROVED_ANSWER_RULES.noDataMessage
          : `선택 조건의 ${metric.value.toFixed(2)}점, 응답 ${metric.evidence?.respondentCount ?? 0}명 결과를 기준으로 검토했습니다.`;
        text = `${sourceSummary}\n\n${this.approvedReferences.map((reference) => `「${reference.title}」: ${reference.body}`).join('\n\n')}`;
        evidence = metric.evidence ? [metric.evidence] : [];
        referenceIds = this.approvedReferences.map((reference) => reference.id);
        visualization = metric.value === null ? visualization : { type: 'table', title: '현재 조건 NCSI', data: [metricPoint(metric.value, metric.evidence?.respondentCount ?? 0, metric.evidence)] };
      }
    } else if (intent === 'factors') {
      const ranked = result.factorScores.filter((point) => point.value !== null).sort((left, right) => (right.value ?? 0) - (left.value ?? 0));
      headline = 'CS 품질요인 분석';
      if (ranked.length === 0) text = APPROVED_ANSWER_RULES.noDataMessage;
      else {
        const best = ranked[0]!;
        const lowest = ranked[ranked.length - 1]!;
        text = `현재 조건의 ${APPROVED_ANSWER_RULES.subgroupLabel}에서 높은 품질요인은 ${best.label} ${best.value!.toFixed(2)}점(n=${best.respondentCount.toLocaleString()}), 낮은 품질요인은 ${lowest.label} ${lowest.value!.toFixed(2)}점(n=${lowest.respondentCount.toLocaleString()})입니다.`;
        evidence = [best.evidence, lowest.evidence].filter((item): item is EvidenceRef => item !== null);
        visualization = { type: 'factors', title: '품질요인 점수', data: ranked.slice(0, 10) };
      }
    } else if (intent === 'comparison') {
      headline = '기업별 NCSI 비교';
      const namedCompanies = result.comparisonSeries.filter((point) => input.text.toLocaleLowerCase('ko').includes(point.label.toLocaleLowerCase('ko')));
      const comparison = namedCompanies.length > 0 ? namedCompanies : selectedComparisons;
      if (comparison.length === 0) {
        text = '질문에 언급한 기업이 현재 선택된 프로젝트 비교 범위에 없습니다. 분석 조건에서 비교 기업을 선택한 뒤 다시 질문해 주세요.';
      } else if (result.subjectNCSI.value === null) {
        text = result.subjectNCSI.unavailableReason ?? APPROVED_ANSWER_RULES.noDataMessage;
      } else {
        const companyId = result.subjectNCSI.evidence?.companyId ?? '';
        const companyName = this.analytics.getFilterOptions().find((option) => option.id === companyId)?.label ?? '분석 기업';
        const comparisons = comparison.filter((point) => point.value !== null);
        text = `${companyName} NCSI는 ${result.subjectNCSI.value.toFixed(2)}점(n=${result.respondentCount.toLocaleString()})입니다. ${comparisons.map((point) => `${point.label} ${point.value!.toFixed(2)}점(n=${point.respondentCount.toLocaleString()})`).join(', ')}`;
        evidence = [result.subjectNCSI.evidence, ...comparisons.map((point) => point.evidence)].filter((item): item is EvidenceRef => item !== null);
        visualization = { type: 'comparison', title: '선택 기업 비교', data: comparisons };
      }
    } else if (intent === 'subgroup') {
      headline = '고객군 필터 결과';
      if (result.subjectNCSI.value === null) text = result.subjectNCSI.unavailableReason ?? APPROVED_ANSWER_RULES.noDataMessage;
      else {
        const groups = Object.entries(input.filters.dimensions).filter(([, value]) => Boolean(value)).map(([key, value]) => `${dimensionName(key)} ${value}`).join(', ');
        text = `${groups || '선택된 고객군'}의 NCSI는 ${result.subjectNCSI.value.toFixed(2)}점입니다. 이는 전체 공식 점수와 구분되는 ${APPROVED_ANSWER_RULES.subgroupLabel}이며, 응답 ${result.respondentCount.toLocaleString()}명 기준입니다.`;
        evidence = result.subjectNCSI.evidence ? [result.subjectNCSI.evidence] : [];
        visualization = { type: 'table', title: '고객군 집계', data: [metricPoint(result.subjectNCSI.value, result.respondentCount, result.subjectNCSI.evidence)] };
      }
    } else if (intent === 'subject') {
      headline = '현재 기업 NCSI';
      if (result.subjectNCSI.value === null) text = result.subjectNCSI.unavailableReason ?? APPROVED_ANSWER_RULES.noDataMessage;
      else {
        text = `현재 선택 기업의 2022년 NCSI는 ${result.subjectNCSI.value.toFixed(2)}점입니다. 응답 ${result.respondentCount.toLocaleString()}명 원천값을 합산해 계산했습니다.`;
        evidence = result.subjectNCSI.evidence ? [result.subjectNCSI.evidence] : [];
        visualization = { type: 'table', title: '현재 기업 NCSI', data: [metricPoint(result.subjectNCSI.value, result.respondentCount, result.subjectNCSI.evidence)] };
      }
    }

    const id = `answer-${Date.now()}-${++answerSequence}`;
    const deterministicKey = stableKey(JSON.stringify({ intent, filters: input.filters }));
    return {
      id,
      headline,
      text,
      result,
      evidence,
      visualization,
      referenceIds,
      sourcePeriod: String(result.filters.year),
      followUpSuggestions: [...APPROVED_ANSWER_RULES.suggestions],
      deterministicKey,
    };
  }

  async submitFeedback(input: AnswerFeedback): Promise<void> {
    this.feedbackStore.add(input);
  }
}

function classifyIntent(text: string, dimensions: Record<string, string | undefined>): Intent {
  const normalized = text.toLocaleLowerCase('ko');
  if (/(연도|기간|작년|지난해|추이|시계열|데이터 제공)/.test(normalized)) return 'period';
  if (/(제언|추천|해석|개선|왜|이유|근거 자료|참고자료)/.test(normalized)) return 'references';
  if (/(품질요인|요인|높은 점수|낮은 점수|상위|하위|최고|최저)/.test(normalized)) return 'factors';
  if (hasComparisonRequest(normalized)) return 'comparison';
  if (Object.values(dimensions).some(Boolean) || /(고객군|고객 집단|성별|연령|국적|지점)/.test(normalized)) return 'subgroup';
  if (/(ncsi|점수|만족도|우리 기업|현재 기업)/i.test(normalized)) return 'subject';
  return 'unsupported';
}

function hasComparisonRequest(text: string): boolean {
  return /(비교|경쟁|대비|보다|차이|vs\.?)/i.test(text);
}

function extractYear(text: string): number | null {
  const year = text.match(/20\d{2}/)?.[0];
  return year ? Number(year) : null;
}

function dimensionName(key: string): string {
  return ({ gender: '성별', ageGroup: '연령대', nationality: '국적', branch: '지점' } as Record<string, string>)[key] ?? key;
}

function metricPoint(value: number, respondentCount: number, evidence: EvidenceRef | null): SeriesPoint {
  return { id: 'subject', label: '선택 기업', value, respondentCount, evidence };
}

function stableKey(value: string): string {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
