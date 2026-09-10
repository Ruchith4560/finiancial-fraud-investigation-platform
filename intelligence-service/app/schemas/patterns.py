from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.schemas.risk import TransactionInput

class TimeWindow(BaseModel):
    start: datetime
    end: datetime
    durationHours: float

class SuspiciousPatternOutput(BaseModel):
    patternId: str
    patternType: str # RAPID_MOVEMENT | FAN_IN | FAN_OUT | CIRCULAR_TRANSFER | SHARED_IDENTIFIER
    title: str
    severity: str # MEDIUM | HIGH | CRITICAL
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    involvedAccounts: List[str]
    involvedDevices: List[str] = []
    involvedTransactions: List[str]
    timeWindow: TimeWindow
    metrics: Dict[str, Any] = {}
    humanExplanation: str
    evidenceReferences: List[str] = []

class PatternAnalysisRequest(BaseModel):
    transactions: List[TransactionInput]

class PatternAnalysisResponse(BaseModel):
    totalPatternsDetected: int
    patterns: List[SuspiciousPatternOutput]
    summaryByType: Dict[str, int]
