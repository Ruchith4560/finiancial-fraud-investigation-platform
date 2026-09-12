"""
FraudLens AI - Root Entry Point for ASGI / Uvicorn Cloud Deployment.
Enables running the Intelligence Service (FastAPI) directly from the repository root:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys
import importlib.util
import base64
import json
import hmac
import hashlib
import time
import uuid
import csv
import io
import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import Request, HTTPException, Depends, Header, UploadFile, File, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# 1. Add intelligence-service directory to sys.path so its internal modules (app.*) resolve cleanly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INTELLIGENCE_DIR = os.path.join(BASE_DIR, "intelligence-service")

if INTELLIGENCE_DIR not in sys.path:
    sys.path.insert(0, INTELLIGENCE_DIR)

# 2. Dynamically load app from intelligence-service/main.py to prevent name collision with root main.py
target_main_path = os.path.join(INTELLIGENCE_DIR, "main.py")
spec = importlib.util.spec_from_file_location("intelligence_service_main", target_main_path)
if spec is None or spec.loader is None:
    raise ImportError(f"Could not load intelligence service entrypoint from {target_main_path}")

intelligence_module = importlib.util.module_from_spec(spec)
sys.modules["intelligence_service_main"] = intelligence_module
spec.loader.exec_module(intelligence_module)

# Expose the FastAPI app instance for ASGI servers (uvicorn main:app, gunicorn, etc.)
app = intelligence_module.app

# Configure wide CORS support on the root app to allow local and Render frontends
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# In-Memory Authentication Engine & JWT Support for Full-Stack Cloud Deployment
# ==============================================================================
JWT_SECRET = os.environ.get("JWT_SECRET", "fraudlens-cloud-deployment-secret-2026")

def create_jwt(payload: dict) -> str:
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    p_enc = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), f"{header}.{p_enc}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{header}.{p_enc}.{sig}"

def verify_jwt(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected_sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(sig, expected_sig):
            return None
        padding = (4 - len(payload) % 4) % 4
        payload_padded = payload + "=" * padding
        return json.loads(base64.urlsafe_b64decode(payload_padded).decode())
    except Exception:
        return None

# Seeded default user accounts
MOCK_USERS: Dict[str, Dict[str, Any]] = {
    "investigator@fraudlens.internal": {
        "id": "usr_inv_001",
        "username": "investigator",
        "email": "investigator@fraudlens.internal",
        "password": "investigator123",
        "fullName": "Sarah Chen, CAMS",
        "role": "investigator"
    },
    "admin@fraudlens.internal": {
        "id": "usr_adm_001",
        "username": "admin",
        "email": "admin@fraudlens.internal",
        "password": "admin123",
        "fullName": "Marcus Vance",
        "role": "admin"
    }
}

class LoginDTO(BaseModel):
    email: str
    password: str

class RegisterDTO(BaseModel):
    fullName: str
    username: str
    email: str
    password: str
    role: Optional[str] = "investigator"

@app.post("/api/v1/auth/login")
async def auth_login(dto: LoginDTO):
    norm_email = dto.email.lower().strip()
    user = MOCK_USERS.get(norm_email)
    
    if not user or user["password"] != dto.password:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": {"message": "Invalid email or password", "code": "INVALID_CREDENTIALS"}}
        )
    
    payload = {
        "userId": user["id"],
        "email": user["email"],
        "role": user["role"],
        "fullName": user["fullName"],
        "exp": int(time.time()) + 86400 * 7
    }
    token = create_jwt(payload)
    
    return {
        "success": True,
        "data": {
            "token": token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "fullName": user["fullName"],
                "role": user["role"],
                "createdAt": "2026-09-12T12:00:00Z"
            }
        }
    }

@app.post("/api/v1/auth/register", status_code=201)
async def auth_register(dto: RegisterDTO):
    norm_email = dto.email.lower().strip()
    norm_username = dto.username.lower().strip()
    
    if norm_email in MOCK_USERS:
        raise HTTPException(
            status_code=409,
            detail={"success": False, "error": {"message": "An account with this email address already exists", "code": "EMAIL_EXISTS"}}
        )
        
    for u in MOCK_USERS.values():
        if u["username"].lower() == norm_username:
            raise HTTPException(
                status_code=409,
                detail={"success": False, "error": {"message": "An account with this username already exists", "code": "USERNAME_EXISTS"}}
            )
            
    if len(dto.password) < 8:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": {"message": "Password must be at least 8 characters long", "code": "VALIDATION_ERROR"}}
        )
        
    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    role = dto.role if dto.role in ["admin", "investigator"] else "investigator"
    
    new_user = {
        "id": user_id,
        "username": norm_username,
        "email": norm_email,
        "password": dto.password,
        "fullName": dto.fullName.strip(),
        "role": role,
        "createdAt": "2026-09-12T12:00:00Z"
    }
    MOCK_USERS[norm_email] = new_user
    
    payload = {
        "userId": user_id,
        "email": norm_email,
        "role": role,
        "fullName": new_user["fullName"],
        "exp": int(time.time()) + 86400 * 7
    }
    token = create_jwt(payload)
    
    return {
        "success": True,
        "data": {
            "token": token,
            "user": {
                "id": user_id,
                "username": new_user["username"],
                "email": norm_email,
                "fullName": new_user["fullName"],
                "role": role,
                "createdAt": "2026-09-12T12:00:00Z"
            }
        }
    }

@app.get("/api/v1/auth/me")
async def auth_get_me(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": {"message": "Missing authorization token", "code": "UNAUTHORIZED"}}
        )
    token = authorization.split(" ")[1]
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(
            status_code=401,
            detail={"success": False, "error": {"message": "Invalid or expired token", "code": "UNAUTHORIZED"}}
        )
    return {
        "success": True,
        "data": {
            "user": {
                "id": payload.get("userId"),
                "email": payload.get("email"),
                "fullName": payload.get("fullName"),
                "role": payload.get("role"),
                "createdAt": "2026-09-12T12:00:00Z"
            }
        }
    }

# ==============================================================================
# Transaction Ingestion, Batch Management & Enterprise Demo Dataset Engine
# ==============================================================================
MOCK_TRANSACTIONS: List[Dict[str, Any]] = []
MOCK_BATCHES: List[Dict[str, Any]] = []
MOCK_ALERTS: List[Dict[str, Any]] = []
MOCK_CASES: List[Dict[str, Any]] = []

def generate_enterprise_demo_data():
    base_time = datetime.datetime(2026, 9, 1, 8, 0, 0, tzinfo=datetime.timezone.utc)
    txs = []
    
    # 1. Rapid fund pass-through (Victim -> Mule -> Exit in 28 mins)
    t1 = base_time + datetime.timedelta(days=3, hours=14)
    txs.append({
        "_id": "tx_1001",
        "transactionId": "TX-1001",
        "senderAccountId": "ACC-VICTIM-10",
        "receiverAccountId": "ACC-MULE-ALPHA",
        "amount": 48500.0,
        "currency": "USD",
        "timestamp": t1.isoformat(),
        "transactionType": "TRANSFER",
        "deviceId": "DEV-VICTIM-MAC",
        "ipAddress": "198.51.100.12",
        "riskScore": 92,
        "riskLevel": "CRITICAL",
        "isFlagged": True,
        "riskFactors": [{"ruleId": "RULE-RAPID-MOVEMENT", "ruleName": "Rapid Fund Pass-through", "description": "Pass-through velocity under 30 minutes with >95% balance retention", "scoreContribution": 60}]
    })
    txs.append({
        "_id": "tx_1002",
        "transactionId": "TX-1002",
        "senderAccountId": "ACC-MULE-ALPHA",
        "receiverAccountId": "ACC-OFFSHORE-99",
        "amount": 47200.0,
        "currency": "USD",
        "timestamp": (t1 + datetime.timedelta(minutes=28)).isoformat(),
        "transactionType": "TRANSFER",
        "deviceId": "DEV-MULE-ANDROID",
        "ipAddress": "203.0.113.44",
        "riskScore": 94,
        "riskLevel": "CRITICAL",
        "isFlagged": True,
        "riskFactors": [{"ruleId": "RULE-RAPID-MOVEMENT", "ruleName": "Rapid Fund Pass-through", "description": "Pass-through velocity under 30 minutes with >95% balance retention", "scoreContribution": 60}]
    })

    # 2. Fan-in Smurfing (<$10,000 threshold)
    t2 = base_time + datetime.timedelta(days=5, hours=9)
    for i in range(6):
        txs.append({
            "_id": f"tx_{1003+i}",
            "transactionId": f"TX-{1003+i}",
            "senderAccountId": f"ACC-SMURF-0{i+1}",
            "receiverAccountId": "ACC-HUB-CENTRAL",
            "amount": 9850.0 + i * 25.0,
            "currency": "USD",
            "timestamp": (t2 + datetime.timedelta(minutes=i*55)).isoformat(),
            "transactionType": "TRANSFER",
            "deviceId": f"DEV-SMURF-PH0{i+1}",
            "ipAddress": f"192.0.2.{50+i}",
            "riskScore": 88,
            "riskLevel": "CRITICAL",
            "isFlagged": True,
            "riskFactors": [{"ruleId": "RULE-STRUCTURING", "ruleName": "Potential Structuring / Smurfing", "description": "Amount just below $10,000 BSA mandatory CTR threshold", "scoreContribution": 35}]
        })

    # 3. Fan-out Layering (Rapid Dispersion)
    t3 = t2 + datetime.timedelta(hours=12)
    for i in range(5):
        txs.append({
            "_id": f"tx_{1009+i}",
            "transactionId": f"TX-{1009+i}",
            "senderAccountId": "ACC-HUB-CENTRAL",
            "receiverAccountId": f"ACC-EXIT-0{i+1}",
            "amount": 8900.0,
            "currency": "USD",
            "timestamp": (t3 + datetime.timedelta(minutes=i*30)).isoformat(),
            "transactionType": "TRANSFER",
            "deviceId": "DEV-HUB-SERVER",
            "ipAddress": "198.51.100.88",
            "riskScore": 82,
            "riskLevel": "HIGH",
            "isFlagged": True,
            "riskFactors": [{"ruleId": "RULE-FAN-OUT", "ruleName": "Rapid Dispersion Layering", "description": "High out-degree dispersal following smurfing aggregation", "scoreContribution": 45}]
        })

    # 4. Circular Graph Cycle (4-hop loop)
    ring_nodes = ["ACC-RING-A", "ACC-RING-B", "ACC-RING-C", "ACC-RING-D"]
    t4 = base_time + datetime.timedelta(days=7, hours=10)
    for i in range(4):
        sender = ring_nodes[i]
        receiver = ring_nodes[(i + 1) % 4]
        txs.append({
            "_id": f"tx_{1014+i}",
            "transactionId": f"TX-{1014+i}",
            "senderAccountId": sender,
            "receiverAccountId": receiver,
            "amount": 15000.0,
            "currency": "USD",
            "timestamp": (t4 + datetime.timedelta(hours=i*6)).isoformat(),
            "transactionType": "TRANSFER",
            "deviceId": f"DEV-RING-{i+1}",
            "ipAddress": f"198.51.100.{100+i}",
            "riskScore": 85,
            "riskLevel": "HIGH",
            "isFlagged": True,
            "riskFactors": [{"ruleId": "RULE-CIRCULAR-TRANSFER", "ruleName": "Directed Graph Cycle", "description": "Closed 4-node transfer loop returning to source", "scoreContribution": 50}]
        })

    # 5. Shared Device Farm (Emulators)
    t5 = base_time + datetime.timedelta(days=8, hours=15)
    for i in range(4):
        txs.append({
            "_id": f"tx_{1018+i}",
            "transactionId": f"TX-{1018+i}",
            "senderAccountId": f"ACC-DEV-ACC-0{i+1}",
            "receiverAccountId": f"ACC-DEV-DEST-0{i+1}",
            "amount": 6200.0,
            "currency": "USD",
            "timestamp": (t5 + datetime.timedelta(minutes=i*20)).isoformat(),
            "transactionType": "TRANSFER",
            "deviceId": "DEV-EMULATOR-NOX-09",
            "ipAddress": "203.0.113.88",
            "riskScore": 78,
            "riskLevel": "HIGH",
            "isFlagged": True,
            "riskFactors": [{"ruleId": "RULE-SHARED-DEVICE", "ruleName": "Shared Hardware Fingerprint", "description": "Single emulator hardware identifier shared across unrelated accounts", "scoreContribution": 45}]
        })

    # Baseline legitimate retail transfers
    for i in range(1, 40):
        t_norm = base_time + datetime.timedelta(days=i % 10, hours=(i * 3) % 24)
        amt = round(45.0 + (i * 37.5) % 1200, 2)
        txs.append({
            "_id": f"tx_norm_{i}",
            "transactionId": f"TX-NORM-{1000+i}",
            "senderAccountId": f"ACC-USER-{100+i}",
            "receiverAccountId": f"ACC-MERCHANT-{(i % 8)+1}",
            "amount": amt,
            "currency": "USD",
            "timestamp": t_norm.isoformat(),
            "transactionType": "PAYMENT" if i % 2 == 0 else "TRANSFER",
            "deviceId": f"DEV-IPHONE-{i}",
            "ipAddress": f"198.51.100.{(i % 50) + 1}",
            "riskScore": 12,
            "riskLevel": "LOW",
            "isFlagged": False,
            "riskFactors": []
        })

    return txs

def seed_demo_data():
    global MOCK_TRANSACTIONS, MOCK_BATCHES, MOCK_ALERTS, MOCK_CASES
    demo_txs = generate_enterprise_demo_data()
    batch_id = "BATCH-DEMO-ENT-001"
    
    for tx in demo_txs:
        tx["ingestionBatchId"] = batch_id
        
    MOCK_TRANSACTIONS = demo_txs
    
    MOCK_BATCHES = [
        {
            "_id": f"batch_{batch_id}",
            "batchId": batch_id,
            "filename": "enterprise_mule_syndicate_v1.csv",
            "totalRecords": len(demo_txs),
            "validRecords": len(demo_txs),
            "invalidRecords": 0,
            "validationErrors": [],
            "status": "COMPLETED",
            "uploadedBy": "system.enterprise_demo",
            "createdAt": "2026-09-12T12:00:00Z",
            "completedAt": "2026-09-12T12:00:05Z"
        }
    ]
    
    # Generate Alerts from flagged transactions
    alerts = []
    alert_counter = 1
    for tx in demo_txs:
        if tx["isFlagged"]:
            alerts.append({
                "_id": f"alt_{alert_counter}",
                "alertId": f"ALT-2026-{1000+alert_counter}",
                "transactionId": tx["transactionId"],
                "severity": tx["riskLevel"],
                "status": "NEW" if alert_counter > 2 else "IN_REVIEW",
                "riskScore": tx["riskScore"],
                "accountId": tx["senderAccountId"],
                "receiverAccountId": tx["receiverAccountId"],
                "amount": tx["amount"],
                "ruleTriggers": [
                    {
                        "ruleId": f["ruleId"],
                        "ruleName": f["ruleName"],
                        "description": f["description"],
                        "severity": tx["riskLevel"],
                        "scoreContribution": f["scoreContribution"]
                    } for f in tx.get("riskFactors", [])
                ],
                "createdAt": tx["timestamp"]
            })
            alert_counter += 1
    MOCK_ALERTS = alerts

    # Generate 3 Priority Investigation Cases
    MOCK_CASES = [
        {
            "_id": "case_001",
            "caseId": "CASE-2026-001",
            "title": "Cross-Border Rapid Pass-Through Syndicate (Mule Alpha)",
            "priority": "CRITICAL",
            "status": "IN_INVESTIGATION",
            "riskScore": 93,
            "assignee": "Sarah Chen, CAMS",
            "summary": "Suspected mule account exhibiting high-velocity transit within 28 minutes. 97.3% balance retention outbound to offshore jurisdiction.",
            "transactions": [tx for tx in demo_txs if "ACC-MULE-ALPHA" in [tx["senderAccountId"], tx["receiverAccountId"]]],
            "createdAt": "2026-09-12T12:30:00Z"
        },
        {
            "_id": "case_002",
            "caseId": "CASE-2026-002",
            "title": "Structuring & Smurfing Hub Central Aggregation",
            "priority": "HIGH",
            "status": "OPEN",
            "riskScore": 88,
            "assignee": "Marcus Vance",
            "summary": "Coordinated structuring cluster depositing $9,850 to avoid FinCEN CTR limits followed by multi-account layering dispersal.",
            "transactions": [tx for tx in demo_txs if "ACC-HUB-CENTRAL" in [tx["senderAccountId"], tx["receiverAccountId"]]],
            "createdAt": "2026-09-12T13:15:00Z"
        },
        {
            "_id": "case_003",
            "caseId": "CASE-2026-003",
            "title": "4-Node Circular Capital Flight Loop",
            "priority": "HIGH",
            "status": "OPEN",
            "riskScore": 85,
            "assignee": "Sarah Chen, CAMS",
            "summary": "Closed directed graph cycle detected across accounts Ring-A through Ring-D with identical capital amounts.",
            "transactions": [tx for tx in demo_txs if tx["senderAccountId"].startswith("ACC-RING-")],
            "createdAt": "2026-09-12T14:00:00Z"
        }
    ]

# Seed demo data immediately on startup
seed_demo_data()

@app.post("/api/v1/transactions/demo-seed")
async def seed_demo_transactions():
    seed_demo_data()
    return {
        "success": True,
        "data": {
            "batchId": "BATCH-DEMO-ENT-001",
            "validCount": len(MOCK_TRANSACTIONS),
            "invalidCount": 0,
            "totalRecords": len(MOCK_TRANSACTIONS),
            "batch": MOCK_BATCHES[0] if MOCK_BATCHES else {}
        }
    }

@app.get("/api/v1/transactions/batches")
async def get_batches():
    return {
        "success": True,
        "data": {
            "batches": MOCK_BATCHES
        }
    }

@app.get("/api/v1/transactions/stats")
async def get_transaction_stats():
    total_count = len(MOCK_TRANSACTIONS)
    total_volume = sum(t.get("amount", 0) for t in MOCK_TRANSACTIONS)
    avg_amount = round(total_volume / total_count, 2) if total_count > 0 else 0
    critical_count = sum(1 for t in MOCK_TRANSACTIONS if t.get("riskLevel") == "CRITICAL" or t.get("riskScore", 0) >= 80)
    high_risk_count = sum(1 for t in MOCK_TRANSACTIONS if t.get("riskScore", 0) >= 50)
    flag_count = sum(1 for t in MOCK_TRANSACTIONS if t.get("isFlagged", False))
    stats_payload = {
        "totalTransactions": total_count,
        "totalVolume": round(total_volume, 2),
        "avgAmount": avg_amount,
        "criticalCount": critical_count,
        "highCount": high_risk_count,
        "flaggedCount": flag_count,
        "totalCount": total_count,
        "highRiskCount": high_risk_count,
        "flagCount": flag_count
    }
    return {
        "success": True,
        "data": {
            "stats": stats_payload,
            **stats_payload
        }
    }

@app.get("/api/v1/transactions")
async def get_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    search: Optional[str] = None,
    minRisk: Optional[int] = None,
    maxRisk: Optional[int] = None,
    riskLevel: Optional[str] = None,
    isFlagged: Optional[bool] = None,
    transactionType: Optional[str] = None,
    type: Optional[str] = None
):
    filtered = MOCK_TRANSACTIONS
    if search:
        s = search.lower()
        filtered = [
            t for t in filtered
            if s in t.get("transactionId", "").lower()
            or s in t.get("senderAccountId", "").lower()
            or s in t.get("receiverAccountId", "").lower()
        ]
    if minRisk is not None:
        filtered = [t for t in filtered if t.get("riskScore", 0) >= minRisk]
    if maxRisk is not None:
        filtered = [t for t in filtered if t.get("riskScore", 0) <= maxRisk]
    if riskLevel and riskLevel != "ALL":
        filtered = [t for t in filtered if t.get("riskLevel") == riskLevel]
    if isFlagged is not None:
        filtered = [t for t in filtered if t.get("isFlagged") == isFlagged]
    resolved_type = transactionType or type
    if resolved_type and resolved_type != "ALL":
        filtered = [t for t in filtered if t.get("transactionType", "").upper() == resolved_type.upper()]
        
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]
    total_pages = max(1, (total + limit - 1) // limit)
    
    return {
        "success": True,
        "data": {
            "transactions": paginated,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": total_pages,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "totalPages": total_pages
            }
        }
    }

@app.post("/api/v1/transactions/upload")
async def upload_transactions(file: UploadFile = File(...)):
    global MOCK_TRANSACTIONS, MOCK_BATCHES
    content_bytes = await file.read()
    
    # 250MB guardrail
    if len(content_bytes) > 250 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={"success": False, "error": {"message": "File exceeds maximum 250MB limit.", "code": "LIMIT_FILE_SIZE"}}
        )
        
    try:
        text_content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text_content = content_bytes.decode("latin-1")
        
    reader = csv.DictReader(io.StringIO(text_content))
    batch_id = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
    
    valid_txs = []
    errors = []
    row_num = 1
    
    for row in reader:
        row_num += 1
        # Normalize column keys
        clean_row = {k.strip().lower().replace("_", ""): v.strip() for k, v in row.items() if k}
        
        tx_id = clean_row.get("transactionid") or f"TX-{uuid.uuid4().hex[:8].upper()}"
        sender = clean_row.get("senderaccountid") or clean_row.get("sender") or clean_row.get("source")
        receiver = clean_row.get("receiveraccountid") or clean_row.get("receiver") or clean_row.get("destination")
        raw_amt = clean_row.get("amount") or "0"
        currency = clean_row.get("currency") or "USD"
        timestamp = clean_row.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat()
        tx_type = clean_row.get("transactiontype") or clean_row.get("type") or "TRANSFER"
        
        if not sender or not receiver:
            errors.append({"row": row_num, "column": "accounts", "message": "Missing sender or receiver account ID", "value": f"{sender}->{receiver}"})
            continue
            
        try:
            amt = float(raw_amt.replace("$", "").replace(",", ""))
            if amt <= 0:
                errors.append({"row": row_num, "column": "amount", "message": "Amount must be greater than zero", "value": raw_amt})
                continue
        except ValueError:
            errors.append({"row": row_num, "column": "amount", "message": "Amount must be a numeric value", "value": raw_amt})
            continue
            
        # Automated Risk Scoring
        risk_score = 15
        risk_factors = []
        if amt >= 9800 and amt < 10000:
            risk_score += 45
            risk_factors.append({"ruleId": "RULE-STRUCTURING", "ruleName": "Threshold Structuring (<$10k)", "description": "Amount near $10k mandatory CTR limit", "scoreContribution": 45})
        elif amt >= 10000:
            risk_score += 30
            risk_factors.append({"ruleId": "RULE-HIGH-VALUE", "ruleName": "Large Currency Report Threshold", "description": "Exceeds $10,000 threshold", "scoreContribution": 30})
            
        if sender.startswith("ACC-MULE") or receiver.startswith("ACC-MULE"):
            risk_score += 50
            risk_factors.append({"ruleId": "RULE-MULE-TAG", "ruleName": "Known Mule Account Activity", "description": "Involved identified mule account", "scoreContribution": 50})
            
        risk_score = min(100, risk_score)
        risk_level = "CRITICAL" if risk_score >= 75 else "HIGH" if risk_score >= 50 else "MEDIUM" if risk_score >= 25 else "LOW"
        
        valid_txs.append({
            "_id": f"tx_up_{uuid.uuid4().hex[:8]}",
            "transactionId": tx_id,
            "senderAccountId": sender,
            "receiverAccountId": receiver,
            "amount": amt,
            "currency": currency,
            "timestamp": timestamp,
            "transactionType": tx_type.upper(),
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "riskFactors": risk_factors,
            "isFlagged": risk_score >= 50,
            "ingestionBatchId": batch_id
        })

    # Prepend new valid transactions
    MOCK_TRANSACTIONS = valid_txs + MOCK_TRANSACTIONS
    
    new_batch = {
        "_id": f"batch_{batch_id}",
        "batchId": batch_id,
        "filename": file.filename or "uploaded_feed.csv",
        "totalRecords": len(valid_txs) + len(errors),
        "validRecords": len(valid_txs),
        "invalidRecords": len(errors),
        "validationErrors": errors[:50],
        "status": "COMPLETED" if len(valid_txs) > 0 else "FAILED",
        "uploadedBy": "investigator.active",
        "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    MOCK_BATCHES.insert(0, new_batch)
    
    return {
        "success": True,
        "data": {
            "batchId": batch_id,
            "validCount": len(valid_txs),
            "invalidCount": len(errors),
            "totalRecords": len(valid_txs) + len(errors),
            "errors": errors[:50],
            "batch": new_batch,
            "summary": {
                "totalTransactions": len(valid_txs) + len(errors),
                "processedTransactions": len(valid_txs),
                "flaggedCount": sum(1 for t in valid_txs if t.get("isFlagged")),
                "criticalCount": sum(1 for t in valid_txs if t.get("riskLevel") == "CRITICAL"),
            }
        }
    }

@app.get("/api/v1/alerts")
async def get_alerts():
    return {
        "success": True,
        "data": {
            "alerts": MOCK_ALERTS,
            "total": len(MOCK_ALERTS)
        }
    }

@app.get("/api/v1/alerts/stats")
async def get_alert_stats():
    return {
        "success": True,
        "data": {
            "total": len(MOCK_ALERTS),
            "critical": sum(1 for a in MOCK_ALERTS if a.get("severity") == "CRITICAL"),
            "high": sum(1 for a in MOCK_ALERTS if a.get("severity") == "HIGH"),
            "medium": sum(1 for a in MOCK_ALERTS if a.get("severity") == "MEDIUM"),
            "low": sum(1 for a in MOCK_ALERTS if a.get("severity") == "LOW")
        }
    }

@app.get("/api/v1/cases")
async def get_cases():
    return {
        "success": True,
        "data": {
            "cases": MOCK_CASES,
            "total": len(MOCK_CASES)
        }
    }

# ==============================================================================
# Visual Portal & Documentation Gateway
# ==============================================================================
LANDING_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FraudLens AI &mdash; Intelligence Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070a12;
      --card-bg: rgba(18, 24, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.25), transparent),
        radial-gradient(circle at 10% 80%, rgba(6, 182, 212, 0.12), transparent);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.25rem;
    }
    .container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.25);
      width: fit-content;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
    }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 1.25rem;
      padding: 2.25rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .header-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue), #8b5cf6);
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.0625rem;
      line-height: 1.6;
      max-width: 680px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.875rem;
      margin-top: 1.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.35rem;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #0284c7);
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .info-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .info-card h2 {
      font-size: 1.125rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .info-card p, .info-card li {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.55;
    }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #93c5fd;
    }
    .tip-box {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      font-size: 0.875rem;
      color: #bfdbfe;
      line-height: 1.5;
    }
    .tip-box strong { color: #ffffff; }
    footer {
      text-align: center;
      font-size: 0.8125rem;
      color: #6b7280;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="badge">
        <span class="badge-dot"></span>
        <span>Service Status: Operational</span>
      </div>
      <h1>FraudLens AI &mdash; Intelligence Engine</h1>
      <p class="subtitle">
        High-throughput machine learning microservice for automated risk scoring, NetworkX graph topology analysis, isolation forest anomaly detection, and grounded Suspicious Activity Report (SAR) synthesis.
      </p>
      <div class="actions">
        <a href="/api/v1/docs" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          Interactive Swagger Docs
        </a>
        <a href="/api/v1/health" class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health Check API
        </a>
        <a href="/api/v1/openapi.json" class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          OpenAPI Spec (JSON)
        </a>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <h2>
          <span>🧠</span> Active Engine Capabilities
        </h2>
        <p>This Python microservice provides the analytical brain and complete API gateway for FraudLens AI:</p>
        <div class="pill-row">
          <span class="pill">250MB Batch CSV Ingestion</span>
          <span class="pill">Enterprise Demo Seeding</span>
          <span class="pill">User Auth &amp; Registration</span>
          <span class="pill">Isolation Forest ML</span>
          <span class="pill">NetworkX Graph Analytics</span>
          <span class="pill">SAR Narrative Synthesis</span>
        </div>
      </div>

      <div class="info-card">
        <h2>
          <span>🖥️</span> Why am I seeing this page?
        </h2>
        <p>
          This URL is the <strong>FraudLens Intelligence &amp; API Gateway</strong> backend.
          The visual investigator web interface lives in the <code>frontend/</code> directory (built with React 19, Cytoscape.js, and Tailwind CSS).
        </p>
        <div class="tip-box">
          <strong>To view the visual web UI:</strong> Deploy the <code>frontend/</code> as a <em>Static Site</em> or use the included <em>Render Blueprint</em> (<code>render.yaml</code>) to run all 3 services together.
        </div>
      </div>
    </div>

    <footer>
      FraudLens AI &bull; Enterprise Financial Fraud Investigation Platform &bull; Built with FastAPI &amp; React 19
    </footer>
  </div>
</body>
</html>
"""

# Filter out existing root GET route if present
app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/"]

@app.get("/", include_in_schema=False)
async def custom_root_portal(request: Request):
    accept_header = request.headers.get("accept", "")
    if "text/html" in accept_header:
        return HTMLResponse(content=LANDING_HTML)
    return JSONResponse(
        content={
            "service": "FraudLens AI Intelligence Engine",
            "status": "healthy",
            "docs": "/api/v1/docs",
            "health": "/api/v1/health",
            "capabilities": [
                "authentication_and_registration",
                "high_capacity_csv_ingestion_250mb",
                "enterprise_demo_dataset_seeding",
                "deterministic_rule_engine",
                "isolation_forest_anomaly_scorer",
                "networkx_graph_analytics",
                "suspicious_pattern_detection",
                "grounded_ai_evidence_synthesizer"
            ]
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
