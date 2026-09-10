import mongoose, { Schema, Document } from 'mongoose';

export type CaseStatus = 'NEW' | 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ICaseAuditEvent {
  timestamp: Date;
  userId: string;
  userName?: string;
  action: 'CASE_CREATED' | 'STATUS_UPDATED' | 'PRIORITY_CHANGED' | 'NOTE_ADDED' | 'SAR_ESCALATED' | 'DISPOSITION_SET';
  details: string;
}

export interface IEvidenceSnapshot {
  frozenAt: Date;
  frozenBy: string;
  transactionCount: number;
  totalAmountFlagged: number;
  riskFactorsRecorded: string[];
  graphTopologySnapshot: {
    nodes: { id: string; label: string; type: string }[];
    edges: { source: string; target: string; amount: number; timestamp?: string }[];
  };
  initialNotes?: string;
}

export interface ICase extends Document {
  caseId: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  primaryAccountId: string;
  assignedInvestigatorId?: string;
  assignedInvestigatorName?: string;
  linkedAlertIds: string[];
  entityIds: {
    accounts: string[];
    devices: string[];
  };
  transactionIds: string[];
  detectedPatternIds: string[];
  evidenceSnapshot?: IEvidenceSnapshot;
  auditEvents: ICaseAuditEvent[];
  aiSummary?: {
    content: string;
    sarNarrative?: string;
    observedFacts?: string[];
    systemInferences?: string[];
    recommendedActions?: string[];
    modelUsed: string;
    generatedAt: Date;
    version: number;
  };
  disposition?: {
    decision: string;
    reasoning: string;
    decidedBy: string;
    decidedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AuditEventSchema = new Schema<ICaseAuditEvent>(
  {
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    userName: { type: String, default: 'Investigator' },
    action: {
      type: String,
      enum: ['CASE_CREATED', 'STATUS_UPDATED', 'PRIORITY_CHANGED', 'NOTE_ADDED', 'SAR_ESCALATED', 'DISPOSITION_SET'],
      required: true,
    },
    details: { type: String, required: true },
  },
  { _id: false }
);

const EvidenceSnapshotSchema = new Schema<IEvidenceSnapshot>(
  {
    frozenAt: { type: Date, default: Date.now },
    frozenBy: { type: String, required: true },
    transactionCount: { type: Number, default: 0 },
    totalAmountFlagged: { type: Number, default: 0 },
    riskFactorsRecorded: [{ type: String }],
    graphTopologySnapshot: {
      nodes: [{ id: String, label: String, type: { type: String } }],
      edges: [{ source: String, target: String, amount: Number, timestamp: String }],
    },
    initialNotes: { type: String },
  },
  { _id: false }
);

const CaseSchema = new Schema<ICase>(
  {
    caseId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['NEW', 'OPEN', 'UNDER_REVIEW', 'ESCALATED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    primaryAccountId: { type: String, required: true, index: true },
    assignedInvestigatorId: { type: String },
    assignedInvestigatorName: { type: String, default: 'Unassigned' },
    linkedAlertIds: [{ type: String }],
    entityIds: {
      accounts: [{ type: String }],
      devices: [{ type: String }],
    },
    transactionIds: [{ type: String }],
    detectedPatternIds: [{ type: String }],
    evidenceSnapshot: { type: EvidenceSnapshotSchema },
    auditEvents: [AuditEventSchema],
    aiSummary: {
      content: { type: String },
      sarNarrative: { type: String },
      observedFacts: [{ type: String }],
      systemInferences: [{ type: String }],
      recommendedActions: [{ type: String }],
      modelUsed: { type: String },
      generatedAt: { type: Date },
      version: { type: Number, default: 0 },
    },
    disposition: {
      decision: { type: String },
      reasoning: { type: String },
      decidedBy: { type: String },
      decidedAt: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for case queue sorting and triage
CaseSchema.index({ status: 1, priority: 1, createdAt: -1 });
CaseSchema.index({ primaryAccountId: 1, createdAt: -1 });

export const Case = mongoose.model<ICase>('Case', CaseSchema);
