import mongoose, { Document, Schema } from 'mongoose';

// ── Plan definitions ───────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free: { analysesPerMonth: 10, hintsPerMonth: 30 },
  pro:  { analysesPerMonth: Infinity, hintsPerMonth: Infinity },
} as const;

export type UserPlan = keyof typeof PLAN_LIMITS;

// ── Interface ──────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;

  // SaaS fields
  plan: UserPlan;
  stripeCustomerId: string;
  isVerified: boolean;

  // Usage metering (reset monthly)
  analysesUsedThisMonth: number;
  hintsUsedThisMonth: number;
  usageResetDate: Date;

  // Metadata
  lastLoginAt: Date;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const UserSchema = new Schema<IUser>({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name:         { type: String, required: true, trim: true },

  plan:             { type: String, enum: ['free', 'pro'], default: 'free' },
  stripeCustomerId: { type: String, default: '' },
  isVerified:       { type: Boolean, default: false },

  analysesUsedThisMonth: { type: Number, default: 0 },
  hintsUsedThisMonth:    { type: Number, default: 0 },
  usageResetDate:        { type: Date, default: () => nextResetDate() },

  lastLoginAt: { type: Date, default: Date.now },
  createdAt:   { type: Date, default: Date.now },
});

/** First day of next month at midnight UTC */
function nextResetDate(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}

export default mongoose.model<IUser>('User', UserSchema);
