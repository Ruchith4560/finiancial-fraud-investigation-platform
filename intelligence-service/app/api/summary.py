from fastapi import APIRouter, HTTPException
from app.schemas.summary import SummaryRequest, SummaryResponse
from app.ai.synthesizer import synthesizer

router = APIRouter(prefix="/ai", tags=["AI Investigation Co-Pilot"])

@router.post("/summary", response_model=SummaryResponse)
def generate_investigation_summary(payload: SummaryRequest):
    """
    Generates a zero-hallucination, audit-defensible AI Investigation Summary
    and 4-part FinCEN SAR Narrative from transaction timelines, detected typologies,
    and rule factors.
    """
    if not payload.targetAccountId:
        raise HTTPException(status_code=400, detail="targetAccountId is required")

    try:
        response = synthesizer.synthesize(payload)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary synthesis failed: {str(e)}")
