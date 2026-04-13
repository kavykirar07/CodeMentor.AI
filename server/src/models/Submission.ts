import mongoose, { Document, Schema } from 'mongoose';

export interface IHint {
  level: number;
  content: string;
  unlockedAt: Date;
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
  createdAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  analysis: {
    conceptualGap: { type: String, default: '' },
    analogy: { type: String, default: '' },
    leadingQuestion: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  hints: [{
    level: { type: Number, required: true },
    content: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  }],
  errorCategories: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
