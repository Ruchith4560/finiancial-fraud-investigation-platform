import type { Transaction, IngestionBatch, BatchError } from '../types';

export function generateClientDemoDataset(): { transactions: Transaction[]; batch: IngestionBatch } {
  const baseTime = new Date('2026-09-01T08:00:00Z');
  const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600 * 1000);
  const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60 * 1000);

  const txs: Transaction[] = [];
  const batchId = `BATCH-DEMO-ENT-001`;

  // 1. Rapid fund movement pass-through (Victim -> Mule -> Exit in 28 mins)
  const t1 = addHours(baseTime, 24 * 3 + 14);
  txs.push({
    _id: 'tx_1001',
    transactionId: 'TX-1001',
    senderAccountId: 'ACC-VICTIM-10',
    receiverAccountId: 'ACC-MULE-ALPHA',
    amount: 48500.0,
    currency: 'USD',
    timestamp: t1.toISOString(),
    transactionType: 'TRANSFER',
    deviceId: 'DEV-VICTIM-MAC',
    ipAddress: '198.51.100.12',
    riskScore: 92,
    riskLevel: 'CRITICAL',
    isFlagged: true,
    riskFactors: [
      {
        ruleId: 'RULE-RAPID-MOVEMENT',
        ruleName: 'Rapid Fund Pass-through',
        description: 'Pass-through velocity under 30 minutes with >95% balance retention',
        scoreContribution: 60,
      },
    ],
    ingestionBatchId: batchId,
  });

  txs.push({
    _id: 'tx_1002',
    transactionId: 'TX-1002',
    senderAccountId: 'ACC-MULE-ALPHA',
    receiverAccountId: 'ACC-OFFSHORE-99',
    amount: 47200.0,
    currency: 'USD',
    timestamp: addMinutes(t1, 28).toISOString(),
    transactionType: 'TRANSFER',
    deviceId: 'DEV-MULE-ANDROID',
    ipAddress: '203.0.113.44',
    riskScore: 94,
    riskLevel: 'CRITICAL',
    isFlagged: true,
    riskFactors: [
      {
        ruleId: 'RULE-RAPID-MOVEMENT',
        ruleName: 'Rapid Fund Pass-through',
        description: 'Pass-through velocity under 30 minutes with >95% balance retention',
        scoreContribution: 60,
      },
    ],
    ingestionBatchId: batchId,
  });

  // 2. Fan-in Smurfing (<$10,000 threshold)
  const t2 = addHours(baseTime, 24 * 5 + 9);
  for (let i = 0; i < 6; i++) {
    txs.push({
      _id: `tx_${1003 + i}`,
      transactionId: `TX-${1003 + i}`,
      senderAccountId: `ACC-SMURF-0${i + 1}`,
      receiverAccountId: 'ACC-HUB-CENTRAL',
      amount: 9850.0 + i * 25.0,
      currency: 'USD',
      timestamp: addMinutes(t2, i * 55).toISOString(),
      transactionType: 'TRANSFER',
      deviceId: `DEV-SMURF-PH0${i + 1}`,
      ipAddress: `192.0.2.${50 + i}`,
      riskScore: 88,
      riskLevel: 'CRITICAL',
      isFlagged: true,
      riskFactors: [
        {
          ruleId: 'RULE-STRUCTURING',
          ruleName: 'Potential Structuring / Smurfing',
          description: 'Amount just below $10,000 BSA mandatory CTR threshold',
          scoreContribution: 35,
        },
      ],
      ingestionBatchId: batchId,
    });
  }

  // 3. Fan-out Layering (Rapid Dispersion)
  const t3 = addHours(t2, 12);
  for (let i = 0; i < 5; i++) {
    txs.push({
      _id: `tx_${1009 + i}`,
      transactionId: `TX-${1009 + i}`,
      senderAccountId: 'ACC-HUB-CENTRAL',
      receiverAccountId: `ACC-EXIT-0${i + 1}`,
      amount: 8900.0,
      currency: 'USD',
      timestamp: addMinutes(t3, i * 30).toISOString(),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-HUB-SERVER',
      ipAddress: '198.51.100.88',
      riskScore: 82,
      riskLevel: 'HIGH',
      isFlagged: true,
      riskFactors: [
        {
          ruleId: 'RULE-FAN-OUT',
          ruleName: 'Rapid Dispersion Layering',
          description: 'High out-degree dispersal following smurfing aggregation',
          scoreContribution: 45,
        },
      ],
      ingestionBatchId: batchId,
    });
  }

  // 4. Circular Graph Cycle (4-hop loop)
  const ringNodes = ['ACC-RING-A', 'ACC-RING-B', 'ACC-RING-C', 'ACC-RING-D'];
  const t4 = addHours(baseTime, 24 * 7 + 10);
  for (let i = 0; i < 4; i++) {
    txs.push({
      _id: `tx_${1014 + i}`,
      transactionId: `TX-${1014 + i}`,
      senderAccountId: ringNodes[i],
      receiverAccountId: ringNodes[(i + 1) % 4],
      amount: 15000.0,
      currency: 'USD',
      timestamp: addHours(t4, i * 6).toISOString(),
      transactionType: 'TRANSFER',
      deviceId: `DEV-RING-${i + 1}`,
      ipAddress: `198.51.100.${100 + i}`,
      riskScore: 85,
      riskLevel: 'HIGH',
      isFlagged: true,
      riskFactors: [
        {
          ruleId: 'RULE-CIRCULAR-TRANSFER',
          ruleName: 'Directed Graph Cycle',
          description: 'Closed 4-node transfer loop returning to source',
          scoreContribution: 50,
        },
      ],
      ingestionBatchId: batchId,
    });
  }

  // 5. Shared Device Farm
  const t5 = addHours(baseTime, 24 * 8 + 15);
  for (let i = 0; i < 4; i++) {
    txs.push({
      _id: `tx_${1018 + i}`,
      transactionId: `TX-${1018 + i}`,
      senderAccountId: `ACC-DEV-ACC-0${i + 1}`,
      receiverAccountId: `ACC-DEV-DEST-0${i + 1}`,
      amount: 6200.0,
      currency: 'USD',
      timestamp: addMinutes(t5, i * 20).toISOString(),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-EMULATOR-NOX-09',
      ipAddress: '203.0.113.88',
      riskScore: 78,
      riskLevel: 'HIGH',
      isFlagged: true,
      riskFactors: [
        {
          ruleId: 'RULE-SHARED-DEVICE',
          ruleName: 'Shared Hardware Fingerprint',
          description: 'Single emulator hardware identifier shared across unrelated accounts',
          scoreContribution: 45,
        },
      ],
      ingestionBatchId: batchId,
    });
  }

  // Baseline legitimate retail transfers
  for (let i = 1; i <= 40; i++) {
    const tNorm = addHours(baseTime, (i % 10) * 24 + ((i * 3) % 24));
    const amt = Math.round((45.0 + ((i * 37.5) % 1200)) * 100) / 100;
    txs.push({
      _id: `tx_norm_${i}`,
      transactionId: `TX-NORM-${1000 + i}`,
      senderAccountId: `ACC-USER-${100 + i}`,
      receiverAccountId: `ACC-MERCHANT-${(i % 8) + 1}`,
      amount: amt,
      currency: 'USD',
      timestamp: tNorm.toISOString(),
      transactionType: i % 2 === 0 ? 'PAYMENT' : 'TRANSFER',
      deviceId: `DEV-IPHONE-${i}`,
      ipAddress: `198.51.100.${(i % 50) + 1}`,
      riskScore: 12,
      riskLevel: 'LOW',
      isFlagged: false,
      riskFactors: [],
      ingestionBatchId: batchId,
    });
  }

  const batch: IngestionBatch = {
    _id: `batch_${batchId}`,
    batchId,
    filename: 'enterprise_mule_syndicate_v1.csv',
    totalRecords: txs.length,
    validRecords: txs.length,
    invalidRecords: 0,
    validationErrors: [],
    status: 'COMPLETED',
    uploadedBy: 'system.enterprise_demo',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return { transactions: txs, batch };
}

export function parseCsvClientSide(
  csvText: string,
  filename: string
): { transactions: Transaction[]; batch: IngestionBatch } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or does not contain header row');
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["'_]/g, ''));
  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;
  const validTxs: Transaction[] = [];
  const errors: BatchError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length === 0 || (rawCols.length === 1 && !rawCols[0])) continue;

    const rowObj: Record<string, string> = {};
    header.forEach((h, idx) => {
      rowObj[h] = rawCols[idx] || '';
    });

    const txId = rowObj['transactionid'] || `TX-${Date.now().toString(36).toUpperCase()}-${i}`;
    const sender = rowObj['senderaccountid'] || rowObj['sender'] || rowObj['source'];
    const receiver = rowObj['receiveraccountid'] || rowObj['receiver'] || rowObj['destination'];
    const rawAmt = rowObj['amount'] || '0';
    const currency = rowObj['currency'] || 'USD';
    const timestamp = rowObj['timestamp'] || new Date().toISOString();
    const txType = (rowObj['transactiontype'] || rowObj['type'] || 'TRANSFER').toUpperCase() as any;

    if (!sender || !receiver) {
      errors.push({
        row: i + 1,
        column: 'accounts',
        message: 'Missing sender or receiver account ID',
        value: `${sender} -> ${receiver}`,
      });
      continue;
    }

    const amt = parseFloat(rawAmt.replace(/[$,]/g, ''));
    if (isNaN(amt) || amt <= 0) {
      errors.push({
        row: i + 1,
        column: 'amount',
        message: 'Amount must be a positive numeric value',
        value: rawAmt,
      });
      continue;
    }

    // Automated client-side scoring
    let riskScore = 15;
    const riskFactors = [];
    if (amt >= 9800 && amt < 10000) {
      riskScore += 45;
      riskFactors.push({
        ruleId: 'RULE-STRUCTURING',
        ruleName: 'Potential Structuring (<$10k)',
        description: 'Amount just below $10,000 threshold',
        scoreContribution: 45,
      });
    } else if (amt >= 10000) {
      riskScore += 30;
      riskFactors.push({
        ruleId: 'RULE-HIGH-VALUE',
        ruleName: 'Large Currency Transaction',
        description: 'Transaction exceeds $10,000 threshold',
        scoreContribution: 30,
      });
    }

    if (sender.toLowerCase().includes('mule') || receiver.toLowerCase().includes('mule')) {
      riskScore += 50;
      riskFactors.push({
        ruleId: 'RULE-MULE-TAG',
        ruleName: 'Known Mule Account Indicator',
        description: 'Account tagged with mule identifiers',
        scoreContribution: 50,
      });
    }

    riskScore = Math.min(100, riskScore);
    const riskLevel =
      riskScore >= 75 ? 'CRITICAL' : riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

    validTxs.push({
      _id: `tx_loc_${Date.now()}_${i}`,
      transactionId: txId,
      senderAccountId: sender,
      receiverAccountId: receiver,
      amount: amt,
      currency,
      timestamp,
      transactionType: txType,
      riskScore,
      riskLevel,
      riskFactors,
      isFlagged: riskScore >= 50,
      ingestionBatchId: batchId,
    });
  }

  const batch: IngestionBatch = {
    _id: `batch_${batchId}`,
    batchId,
    filename,
    totalRecords: validTxs.length + errors.length,
    validRecords: validTxs.length,
    invalidRecords: errors.length,
    validationErrors: errors.slice(0, 50),
    status: validTxs.length > 0 ? 'COMPLETED' : 'FAILED',
    uploadedBy: 'investigator.local',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return { transactions: validTxs, batch };
}

export function saveLocalBatch(batch: IngestionBatch, newTxs: Transaction[]) {
  if (typeof window === 'undefined') return;
  const existingBatches: IngestionBatch[] = JSON.parse(
    localStorage.getItem('fraudlens_local_batches') || '[]'
  );
  const updatedBatches = [batch, ...existingBatches.filter((b) => b.batchId !== batch.batchId)];
  localStorage.setItem('fraudlens_local_batches', JSON.stringify(updatedBatches.slice(0, 20)));

  const existingTxs: Transaction[] = JSON.parse(
    localStorage.getItem('fraudlens_local_transactions') || '[]'
  );
  const updatedTxs = [...newTxs, ...existingTxs.filter((t) => !newTxs.some((n) => n.transactionId === t.transactionId))];
  localStorage.setItem('fraudlens_local_transactions', JSON.stringify(updatedTxs.slice(0, 500)));
}

export function getLocalBatches(): IngestionBatch[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('fraudlens_local_batches') || '[]');
}

export function getLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('fraudlens_local_transactions') || '[]');
}
