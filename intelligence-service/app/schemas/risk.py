from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TransactionInput(BaseModel):
    transactionId: str
    senderAccountId: str
    receiverAccountId: str
    amount: float
    timestamp: datetime
    transactionType: str = "TRANSFER"
    deviceId: Optional[str] = None
    ipAddress: Optional[str] = None

class RuleTriggerOutput(BaseModel):
    ruleId: str
    ruleName: str
    description: str
    severity: str
    scoreContribution: float

class TransactionRiskOutput(BaseModel):
    transactionId: str
    riskScore: float
    riskLevel: str
    mlScore: float
    ruleTriggers: List[RuleTriggerOutput]
    isFlagged: bool

class AlertOutput(BaseModel):
    alertId: str
    transactionId: str
    primaryAccountId: str
    relatedAccountIds: List[str]
    riskScore: float
    severity: str
    ruleTriggers: List[RuleTriggerOutput]
    mlScore: float
    detectedPatterns: List[str] = []

class RiskAnalysisRequest(BaseModel):
    transactions: List[TransactionInput]

class RiskAnalysisResponse(BaseModel):
    transactions: List[TransactionRiskOutput]
    alerts: List[AlertOutput]
    summary: dict
