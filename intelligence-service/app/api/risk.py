from fastapi import APIRouter, HTTPException
from app.schemas.risk import RiskAnalysisRequest, RiskAnalysisResponse
from app.rules.aggregator import RiskAggregator

router = APIRouter(prefix="/analyze", tags=["Risk Analysis"])

@router.post("/risk", response_model=RiskAnalysisResponse)
def analyze_risk(payload: RiskAnalysisRequest):
    """
    Executes Layer 1 (Rules) + Layer 2 (Isolation Forest ML) + Layer 3 (Aggregation).
    Returns scored transactions, explainability reasons, and a prioritized alert queue.
    """
    if not payload.transactions:
        raise HTTPException(status_code=400, detail="Transactions list cannot be empty")

    scored_transactions, alerts, summary = RiskAggregator.analyze(payload.transactions)

    return RiskAnalysisResponse(
        transactions=scored_transactions,
        alerts=alerts,
        summary=summary
    )
