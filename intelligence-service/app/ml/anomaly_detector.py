import numpy as np
from typing import List, Dict
from datetime import timedelta
from sklearn.ensemble import IsolationForest
from app.schemas.risk import TransactionInput

class AnomalyDetector:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100
        )

    def extract_features(self, transactions: List[TransactionInput]) -> np.ndarray:
        """
        Extracts multi-dimensional features for unsupervised anomaly scoring:
        1. log_amount: Log-transformed transaction amount
        2. hour_ratio: Normalized hour of day [0, 1]
        3. is_weekend: Binary weekend indicator
        4. sender_velocity: Number of transactions from sender in preceding 1 hour
        5. is_transfer: Binary indicator if type is TRANSFER
        """
        sorted_txs = sorted(transactions, key=lambda x: x.timestamp)
        sender_history = {}
        features = []

        for tx in sorted_txs:
            sender = tx.senderAccountId
            ts = tx.timestamp

            # Track 1-hour velocity
            if sender not in sender_history:
                sender_history[sender] = []
            sender_history[sender] = [t for t in sender_history[sender] if ts - t <= timedelta(hours=1)]
            velocity_1h = len(sender_history[sender])
            sender_history[sender].append(ts)

            log_amount = float(np.log1p(max(tx.amount, 0.01)))
            hour_ratio = float(ts.hour / 24.0)
            is_weekend = 1.0 if ts.weekday() >= 5 else 0.0
            is_transfer = 1.0 if tx.transactionType == "TRANSFER" else 0.0

            features.append([log_amount, hour_ratio, is_weekend, float(velocity_1h), is_transfer])

        return np.array(features, dtype=np.float32)

    def score(self, transactions: List[TransactionInput]) -> Dict[str, float]:
        """
        Scores transactions and returns a dict mapping transactionId to an anomaly probability [0.0, 1.0].
        Higher score = more anomalous.
        """
        if len(transactions) < 10:
            # Fallback for very small batches
            return {tx.transactionId: 0.1 for tx in transactions}

        X = self.extract_features(transactions)
        
        # Fit Isolation Forest and compute anomaly scores
        self.model.fit(X)
        raw_scores = self.model.score_samples(X) # lower score = more anomalous

        # Invert and normalize to [0.0, 1.0] where 1.0 is highest anomaly
        min_score = np.min(raw_scores)
        max_score = np.max(raw_scores)
        denom = max_score - min_score if (max_score - min_score) > 1e-6 else 1.0

        anomaly_probs = 1.0 - ((raw_scores - min_score) / denom)

        # Sort order matches sorted_txs
        sorted_txs = sorted(transactions, key=lambda x: x.timestamp)
        return {tx.transactionId: float(round(anomaly_probs[i], 3)) for i, tx in enumerate(sorted_txs)}
