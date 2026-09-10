import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'TRANSFER' | 'PAYMENT' | 'CASH_OUT' | 'DEPOSIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IRiskFactor {
  ruleId: string;
  ruleName: string;
  description: string;
  scoreContribution: number;
}

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  transactionId: string;
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  currency: string;
  timestamp: Date;
  transactionType: TransactionType;
  deviceId?: string;
  ipAddress?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: IRiskFactor[];
  isFlagged: boolean;
  ingestionBatchId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const RiskFactorSchema = new Schema<IRiskFactor>(
  {
    ruleId: { type: String, required: true },
    ruleName: { type: String, required: true },
    description: { type: String, required: true },
    scoreContribution: { type: Number, required: true },
  },
  { _id: false }
);

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    senderAccountId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    receiverAccountId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      index: true,
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['TRANSFER', 'PAYMENT', 'CASH_OUT', 'DEPOSIT'],
      default: 'TRANSFER',
      required: true,
    },
    deviceId: {
      type: String,
      trim: true,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    riskFactors: {
      type: [RiskFactorSchema],
      default: [],
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    ingestionBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'IngestionBatch',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-frequency queries
TransactionSchema.index({ senderAccountId: 1, timestamp: -1 });
TransactionSchema.index({ receiverAccountId: 1, timestamp: -1 });
TransactionSchema.index({ isFlagged: 1, riskScore: -1 });
TransactionSchema.index({ deviceId: 1, timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);
