import mongoose, { Document, Schema } from 'mongoose';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'IN_REVIEW' | 'CASE_CREATED' | 'DISMISSED';

export interface IRuleTrigger {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: string;
  scoreContribution: number;
}

export interface IAlert extends Document {
  _id: mongoose.Types.ObjectId;
  alertId: string;
  transactionId: string;
  primaryAccountId: string;
  relatedAccountIds: string[];
  riskScore: number;
  severity: AlertSeverity;
  status: AlertStatus;
  ruleTriggers: IRuleTrigger[];
  mlScore: number;
  detectedPatterns: string[];
  assignedTo?: mongoose.Types.ObjectId;
  caseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RuleTriggerSchema = new Schema<IRuleTrigger>(
  {
    ruleId: { type: String, required: true },
    ruleName: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, required: true },
    scoreContribution: { type: Number, required: true },
  },
  { _id: false }
);

const AlertSchema = new Schema<IAlert>(
  {
    alertId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    transactionId: {
      type: String,
      required: true,
      index: true,
    },
    primaryAccountId: {
      type: String,
      required: true,
      index: true,
    },
    relatedAccountIds: {
      type: [String],
      default: [],
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['NEW', 'IN_REVIEW', 'CASE_CREATED', 'DISMISSED'],
      default: 'NEW',
      index: true,
    },
    ruleTriggers: {
      type: [RuleTriggerSchema],
      default: [],
    },
    mlScore: {
      type: Number,
      default: 0.0,
    },
    detectedPatterns: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    caseId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for alert triage queue queries
AlertSchema.index({ status: 1, severity: 1, riskScore: -1 });
AlertSchema.index({ primaryAccountId: 1, createdAt: -1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
