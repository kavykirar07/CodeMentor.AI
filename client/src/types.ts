// Shared frontend types that mirror server interfaces

export interface IASTInsight {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  line?: number;
  description: string;
  fix: string;
}

export interface IAnalysis {
  conceptualGap: string;
  analogy: string;
  leadingQuestion: string;
  summary: string;
}
