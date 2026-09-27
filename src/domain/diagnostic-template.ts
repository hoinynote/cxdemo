export type ContentScope = 'customer-specific' | 'industry-general' | 'sector-general' | 'overall-general';
export type DataBindingKind = 'ncsi' | 'quality-factor' | 'respondent-behavior' | 'reference' | 'none';
export interface PageArea { x: number; y: number; width: number; height: number }
interface ContainerBase {
  id: string; sourceContainerId: string; title: string; scopes: ContentScope[]; pageArea: PageArea;
  requiredPoints: string[]; required: boolean; contentFormat: string; sourceDescription: string;
  generationCondition: string; exampleLabel?: string;
}
export interface StaticContainer extends ContainerBase {
  kind: 'static'; dataBinding: 'reference' | 'none' | 'respondent-behavior';
  sourceFieldIds: []; calculationId: null; maxCharacters: null;
}
export interface ComputedContainer extends ContainerBase {
  kind: 'computed'; dataBinding: 'ncsi' | 'quality-factor' | 'respondent-behavior';
  sourceFieldIds: [string, ...string[]]; calculationId: string; maxCharacters: null;
}
export interface AiDraftContainer extends ContainerBase {
  kind: 'ai-draft'; dataBinding: 'reference'; sourceFieldIds: []; calculationId: null; maxCharacters: number;
}
export type DiagnosticContainer = StaticContainer | ComputedContainer | AiDraftContainer;
export interface DiagnosticPage { number: number; sectionId: string; title: string; layoutId: string; containers: DiagnosticContainer[] }
export interface DiagnosticTemplate {
  id: 'ncsi-diagnostic'; version: string;
  pageSize: { width: number; height: number; unit: 'in'; coordinateScale: 1000 };
  pages: DiagnosticPage[];
}
