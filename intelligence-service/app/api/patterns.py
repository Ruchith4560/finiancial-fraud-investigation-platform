from fastapi import APIRouter, HTTPException
from app.schemas.patterns import PatternAnalysisRequest, PatternAnalysisResponse
from app.graph.pattern_engine import SuspiciousPatternEngine

router = APIRouter(prefix="/analyze", tags=["Pattern Detection"])

@router.post("/patterns", response_model=PatternAnalysisResponse)
def detect_patterns(payload: PatternAnalysisRequest):
    """
    Executes all 5 Suspicious Pattern Detection graph algorithms on the provided transactions:
    1. Rapid Fund Movement
    2. Fan-In Smurfing
    3. Fan-Out Dispersion
    4. Circular Transfers
    5. Shared Identifier Networks
    """
    if not payload.transactions:
        raise HTTPException(status_code=400, detail="Transactions list cannot be empty")

    patterns, summary = SuspiciousPatternEngine.detect_all(payload.transactions)

    return PatternAnalysisResponse(
        totalPatternsDetected=len(patterns),
        patterns=patterns,
        summaryByType=summary
    )
