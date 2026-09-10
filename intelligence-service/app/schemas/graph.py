from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from app.schemas.risk import TransactionInput

class GraphNode(BaseModel):
    id: str
    label: str
    type: str = Field("ACCOUNT", description="ACCOUNT or DEVICE")
    riskScore: float = 0.0
    riskLevel: str = "LOW"
    inflow: float = 0.0
    outflow: float = 0.0
    transactionCount: int = 0
    isRoot: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = Field("TRANSACTION", description="TRANSACTION or SHARED_DEVICE")
    amount: Optional[float] = None
    timestamp: Optional[datetime] = None
    transactionType: Optional[str] = None
    label: str
    isFlagged: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GraphMetrics(BaseModel):
    totalNodes: int
    totalEdges: int
    accountCount: int
    deviceCount: int
    density: float
    maxDegree: int
    rootAccountId: Optional[str] = None

class SubgraphRequest(BaseModel):
    rootAccountId: str
    transactions: List[TransactionInput]
    maxHops: int = Field(2, ge=1, le=4)
    maxNodes: int = Field(100, ge=10, le=500)
    includeDevices: bool = True

class SubgraphResponse(BaseModel):
    rootAccountId: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    metrics: GraphMetrics
