export interface GraphNodeData {
  id: string;
  label: string;
  type: 'ACCOUNT' | 'DEVICE';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  inflow: number;
  outflow: number;
  transactionCount: number;
  isRoot: boolean;
  metadata?: Record<string, any>;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: 'TRANSACTION' | 'SHARED_DEVICE';
  amount?: number;
  timestamp?: string;
  transactionType?: string;
  label: string;
  isFlagged: boolean;
  metadata?: Record<string, any>;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  accountCount: number;
  deviceCount: number;
  density: number;
  maxDegree: number;
  rootAccountId?: string;
}

export interface SubgraphResponse {
  rootAccountId: string;
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  metrics: GraphMetrics;
}
