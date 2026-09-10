from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.schemas.risk import TransactionInput, RuleTriggerOutput
from app.schemas.patterns import SuspiciousPatternOutput

class ObservedFact(BaseModel):
    factId: str
    category: str # TRANSACTION_VOLUME | TIME_CONCENTRATION | COUNTERPARTY_DISPERSION | IDENTIFIER_REUSE | AMOUNT_STRUCTURING
    statement: str
    evidenceReferences: List[str] = []

class SystemInference(BaseModel):
    inferenceId: str
    typology: str
    statement: str
    confidenceScore: float = Field(..., ge=0.0, le=1.0)
    supportingRuleIds: List[str] = []
    regulatoryBasis: str

class SARNarrative(BaseModel):
    subjectInformation: str
    summaryOfSuspiciousActivity: str
    chronologicalNarrative: str
    dispositionAndRecommendations: str
    fullNarrativeText: str

class SummaryRequest(BaseModel):
    targetAccountId: str
    transactions: List[TransactionInput]
    detectedPatterns: List[SuspiciousPatternOutput] = []
    riskFactors: List[RuleTriggerOutput] = []
    mlAnomalyScore: Optional[float] = 0.0
    investigatorNotes: Optional[str] = None
    caseId: Optional[str] = None

class SummaryResponse(BaseModel):
    targetAccountId: str
    caseId: Optional[str] = None
    executiveSummary: str
    observedFacts: List[ObservedFact]
    systemInferences: List[SystemInference]
    sarNarrative: SARNarrative
    recommendedActions: List[str]
    riskLevel: str
    confidenceAssessment: str
    modelUsed: str
    generatedAt: datetime
    guardrailStatus: str
