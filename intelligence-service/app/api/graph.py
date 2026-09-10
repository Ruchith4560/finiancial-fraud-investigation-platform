from fastapi import APIRouter, HTTPException
from app.schemas.graph import SubgraphRequest, SubgraphResponse
from app.graph.subgraph import SubgraphExtractor

router = APIRouter(prefix="/graph", tags=["Graph & Relationship Intelligence"])

@router.post("/subgraph", response_model=SubgraphResponse)
def extract_subgraph(payload: SubgraphRequest):
    """
    Extracts k-hop ego-network around rootAccountId with node risk scoring,
    flow aggregation, and device bipartite mapping.
    """
    if not payload.transactions:
        raise HTTPException(status_code=400, detail="Transactions list cannot be empty")
    if not payload.rootAccountId:
        raise HTTPException(status_code=400, detail="rootAccountId is required")

    subgraph = SubgraphExtractor.extract_ego_network(
        root_account_id=payload.rootAccountId,
        transactions=payload.transactions,
        max_hops=payload.maxHops,
        max_nodes=payload.maxNodes,
        include_devices=payload.includeDevices
    )

    return subgraph
