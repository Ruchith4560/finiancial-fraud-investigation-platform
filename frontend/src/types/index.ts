export type UserRole = 'admin' | 'investigator';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TransactionType = 'TRANSFER' | 'PAYMENT' | 'CASH_OUT' | 'DEPOSIT';

export interface RiskFactor {
  ruleId: string;
  ruleName: string;
  description: string;
  scoreContribution: number;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  currency: string;
  timestamp: string;
  transactionType: TransactionType;
  deviceId?: string;
  ipAddress?: string;
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  isFlagged: boolean;
  ingestionBatchId?: string;
}

export interface BatchError {
  row: number;
  column: string;
  message: string;
  value?: any;
}

export interface IngestionBatch {
  _id: string;
  batchId: string;
  filename: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationErrors: BatchError[];
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadedBy: string;
  createdAt: string;
  completedAt?: string;
}

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'IN_REVIEW' | 'CASE_CREATED' | 'DISMISSED';

export interface AlertRuleTrigger {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: string;
  scoreContribution: number;
}

export type IRuleTrigger = AlertRuleTrigger;

export interface Alert {
  _id: string;
  alertId: string;
  transactionId: string;
  primaryAccountId: string;
  relatedAccountIds: string[];
  riskScore: number;
  severity: AlertSeverity;
  status: AlertStatus;
  ruleTriggers: AlertRuleTrigger[];
  mlScore: number;
  detectedPatterns: string[];
  caseId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatternType =
  | 'RAPID_MOVEMENT'
  | 'FAN_IN'
  | 'FAN_OUT'
  | 'CIRCULAR_TRANSFER'
  | 'SHARED_IDENTIFIER';

export interface SuspiciousPattern {
  _id: string;
  patternId: string;
  patternType: PatternType;
  title: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  involvedAccounts: string[];
  involvedDevices: string[];
  involvedTransactions: string[];
  timeWindow: {
    start: string;
    end: string;
    durationHours: number;
  };
  metrics: Record<string, any>;
  humanExplanation: string;
  evidenceReferences: string[];
  createdAt: string;
}

export type CaseStatus = 'NEW' | 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLOSED';
export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CaseRecord {
  _id: string;
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
  evidenceSnapshot?: {
    frozenAt: string;
    frozenBy: string;
    transactionCount: number;
    totalAmountFlagged: number;
    riskFactorsRecorded: string[];
    graphTopologySnapshot: {
      nodes: { id: string; label: string; type: string }[];
      edges: { source: string; target: string; amount: number; timestamp: string }[];
    };
  };
  aiSummary?: {
    content: string;
    modelUsed: string;
    generatedAt: string;
    version: number;
  };
  disposition?: {
    decision: string;
    reasoning: string;
    decidedBy: string;
    decidedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
    [key: string]: any;
  };
}
