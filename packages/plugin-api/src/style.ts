/**
 * Each policy is an intentionally open, serializable bag of settings; the
 * actual composition logic they configure belongs to a Composer/Arranger/
 * Expression plugin, not to the style itself (PRD UPDATE_PRD.md §7.2).
 */
export interface HarmonyPolicy {
  [key: string]: unknown;
}
export interface RhythmPolicy {
  [key: string]: unknown;
}
export interface FormPolicy {
  [key: string]: unknown;
}
export interface OrchestrationPolicy {
  [key: string]: unknown;
}
export interface ExpressionPolicy {
  [key: string]: unknown;
}

export interface StyleDefinition {
  id: string;
  name: string;
  harmony?: HarmonyPolicy;
  rhythm?: RhythmPolicy;
  form?: FormPolicy;
  orchestration?: OrchestrationPolicy;
  expression?: ExpressionPolicy;
  defaultInstruments?: string[];
}
