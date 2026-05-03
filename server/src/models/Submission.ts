import mongoose, { Document, Schema } from 'mongoose';

export interface IHint {
  level: number;
  content: string;
  unlockedAt: Date;
}

export interface IASTInsight {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  line?: number;
  description: string;
  fix: string;
}

export interface ISubmission extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  language: string;
  analysis: {
    conceptualGap: string;
    analogy: string;
    leadingQuestion: string;
    summary: string;
  };
  hints: IHint[];
  errorCategories: string[];
  // New fields
  astInsights: IASTInsight[];
  mermaidDiagram: string;
  attemptNumber: number;       // which submission attempt for this user
  struggleScore: number;       // 0–100 how much the user is struggling
  compilerError?: string;      // optional error message pasted by user
  lineNumbers?: number[];      // lines flagged by compiler
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code:     { type: String, required: true },
  language: { type: String, required: true },
  analysis: {
    conceptualGap:   { type: String, default: '' },
    analogy:         { type: String, default: '' },
    leadingQuestion: { type: String, default: '' },
    summary:         { type: String, default: '' },
  },
  hints: [{
    level:      { type: Number, required: true },
    content:    { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  }],
  errorCategories: [{ type: String }],
  astInsights: [{
    type:        { type: String },
    severity:    { type: String, enum: ['critical', 'warning', 'info'] },
    line:        { type: Number },
    description: { type: String },
    fix:         { type: String },
  }],
  mermaidDiagram: { type: String, default: '' },
  attemptNumber:  { type: Number, default: 1 },
  struggleScore:  { type: Number, default: 0 },
  compilerError:  { type: String },
  lineNumbers:    [{ type: Number }],
  createdAt: { type: Date, default: Date.now },
});

// Index for user history queries
SubmissionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
