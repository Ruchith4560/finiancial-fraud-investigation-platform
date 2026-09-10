import { ValidatedTransaction } from '../services/validationService';

export interface ScenarioDefinition {
  id: string;
  name: string;
  typology: 'FAN_IN' | 'RAPID_MOVEMENT' | 'CIRCULAR_TRANSFER' | 'SHARED_IDENTIFIER';
  targetAccountId: string;
  expectedInflowMin: number;
  expectedOutflowMin: number;
  expectedMinTransactions: number;
  expectedSeverity: 'HIGH' | 'CRITICAL';
  keyCounterparties: string[];
  keyDeviceIds: string[];
  transactions: ValidatedTransaction[];
}

export function generateScenarios(): {
  scenarios: Record<string, ScenarioDefinition>;
  allTransactions: ValidatedTransaction[];
} {
  const baseDate = new Date('2026-09-01T10:00:00Z');
  let idCounter = 5000;
  const nextId = () => `TX-SCEN-${++idCounter}`;

  const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60 * 1000);
  const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600 * 1000);

  // =========================================================================
  // SCENARIO 1: FAN-IN SMURFING RING (Deposit Aggregation Under CTR Threshold)
  // Target: ACC-HUB-CENTRAL
  // 4 smurf feeders deposit ~$9,500 each into ACC-HUB-CENTRAL within 2 hours
  // =========================================================================
  const s1Date = addHours(baseDate, 12);
  const s1Feeders = ['ACC-SMURF-01', 'ACC-SMURF-02', 'ACC-SMURF-03', 'ACC-SMURF-04'];
  const s1Txs: ValidatedTransaction[] = s1Feeders.map((feeder, idx) => ({
    transactionId: nextId(),
    senderAccountId: feeder,
    receiverAccountId: 'ACC-HUB-CENTRAL',
    amount: 9500.0 + idx * 100, // 9500, 9600, 9700, 9800 (Structuring band)
    currency: 'USD',
    timestamp: addMinutes(s1Date, idx * 25),
    transactionType: 'TRANSFER',
    deviceId: `DEV-SMURF-FEEDER-${idx + 1}`,
    ipAddress: `198.51.100.${20 + idx}`,
  }));

  const scenario1: ScenarioDefinition = {
    id: 'SCENARIO-FAN-IN',
    name: 'Operation Blue Cyclone: Fan-In Smurfing Ring',
    typology: 'FAN_IN',
    targetAccountId: 'ACC-HUB-CENTRAL',
    expectedInflowMin: 38000.0,
    expectedOutflowMin: 0.0,
    expectedMinTransactions: 4,
    expectedSeverity: 'HIGH',
    keyCounterparties: s1Feeders,
    keyDeviceIds: s1Txs.map((t) => t.deviceId!),
    transactions: s1Txs,
  };

  // =========================================================================
  // SCENARIO 2: RAPID FUND MOVEMENT & MULE PASS-THROUGH
  // Target: ACC-MULE-ALPHA
  // Inflow of $35,000 followed by outflow of $34,000 (97.1%) within 35 minutes
  // =========================================================================
  const s2Date = addHours(baseDate, 36);
  const s2Txs: ValidatedTransaction[] = [
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-VICTIM-CORP',
      receiverAccountId: 'ACC-MULE-ALPHA',
      amount: 35000.0,
      currency: 'USD',
      timestamp: s2Date,
      transactionType: 'TRANSFER',
      deviceId: 'DEV-VICTIM-WORKSTATION',
      ipAddress: '192.0.2.10',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-MULE-ALPHA',
      receiverAccountId: 'ACC-OFFSHORE-SAFE',
      amount: 34000.0,
      currency: 'USD',
      timestamp: addMinutes(s2Date, 35),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-MULE-MOBILE',
      ipAddress: '198.51.100.88',
    },
  ];

  const scenario2: ScenarioDefinition = {
    id: 'SCENARIO-RAPID-MOVEMENT',
    name: 'Layering Mule Pass-Through Network',
    typology: 'RAPID_MOVEMENT',
    targetAccountId: 'ACC-MULE-ALPHA',
    expectedInflowMin: 35000.0,
    expectedOutflowMin: 34000.0,
    expectedMinTransactions: 2,
    expectedSeverity: 'HIGH',
    keyCounterparties: ['ACC-VICTIM-CORP', 'ACC-OFFSHORE-SAFE'],
    keyDeviceIds: ['DEV-MULE-MOBILE'],
    transactions: s2Txs,
  };

  // =========================================================================
  // SCENARIO 3: CIRCULAR WASH-TRADING SYNDICATE
  // Target: ACC-RING-A -> ACC-RING-B -> ACC-RING-C -> ACC-RING-A
  // 3 sequential hops within 90 minutes
  // =========================================================================
  const s3Date = addHours(baseDate, 60);
  const s3Txs: ValidatedTransaction[] = [
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-A',
      receiverAccountId: 'ACC-RING-B',
      amount: 22000.0,
      currency: 'USD',
      timestamp: s3Date,
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-DEVICE-1',
      ipAddress: '203.0.113.101',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-B',
      receiverAccountId: 'ACC-RING-C',
      amount: 21500.0,
      currency: 'USD',
      timestamp: addMinutes(s3Date, 25),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-DEVICE-2',
      ipAddress: '203.0.113.102',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-C',
      receiverAccountId: 'ACC-RING-A',
      amount: 21000.0,
      currency: 'USD',
      timestamp: addMinutes(s3Date, 55),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-DEVICE-3',
      ipAddress: '203.0.113.103',
    },
  ];

  const scenario3: ScenarioDefinition = {
    id: 'SCENARIO-CIRCULAR',
    name: 'Circular Wash-Trading Syndicate',
    typology: 'CIRCULAR_TRANSFER',
    targetAccountId: 'ACC-RING-A',
    expectedInflowMin: 21000.0,
    expectedOutflowMin: 22000.0,
    expectedMinTransactions: 3,
    expectedSeverity: 'CRITICAL',
    keyCounterparties: ['ACC-RING-B', 'ACC-RING-C'],
    keyDeviceIds: ['DEV-RING-DEVICE-1'],
    transactions: s3Txs,
  };

  // =========================================================================
  // SCENARIO 4: SHARED DEVICE FARM COLLUSION
  // 3 distinct accounts operating from the same hardware IMEI: DEV-FARM-X9
  // =========================================================================
  const s4Date = addHours(baseDate, 84);
  const sharedDev = 'DEV-FARM-EMULATOR-X9';
  const s4Accounts = ['ACC-BOT-01', 'ACC-BOT-02', 'ACC-BOT-03'];
  const s4Txs: ValidatedTransaction[] = [
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-BOT-01',
      receiverAccountId: 'ACC-EXTERNAL-MERCHANT',
      amount: 4500.0,
      currency: 'USD',
      timestamp: s4Date,
      transactionType: 'PAYMENT',
      deviceId: sharedDev,
      ipAddress: '198.51.100.99',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-BOT-02',
      receiverAccountId: 'ACC-EXTERNAL-MERCHANT',
      amount: 4800.0,
      currency: 'USD',
      timestamp: addMinutes(s4Date, 15),
      transactionType: 'PAYMENT',
      deviceId: sharedDev,
      ipAddress: '198.51.100.99',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-BOT-03',
      receiverAccountId: 'ACC-EXTERNAL-MERCHANT',
      amount: 4900.0,
      currency: 'USD',
      timestamp: addMinutes(s4Date, 30),
      transactionType: 'PAYMENT',
      deviceId: sharedDev,
      ipAddress: '198.51.100.99',
    },
  ];

  const scenario4: ScenarioDefinition = {
    id: 'SCENARIO-SHARED-DEVICE',
    name: 'Hardware Emulation Device Farm',
    typology: 'SHARED_IDENTIFIER',
    targetAccountId: 'ACC-BOT-01',
    expectedInflowMin: 0.0,
    expectedOutflowMin: 4500.0,
    expectedMinTransactions: 1,
    expectedSeverity: 'HIGH',
    keyCounterparties: ['ACC-EXTERNAL-MERCHANT'],
    keyDeviceIds: [sharedDev],
    transactions: s4Txs,
  };

  // =========================================================================
  // BENIGN BACKGROUND TRAFFIC (Non-suspicious noise for baseline comparison)
  // =========================================================================
  const benignTxs: ValidatedTransaction[] = [
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-PAYROLL-CORP',
      receiverAccountId: 'ACC-EMPLOYEE-01',
      amount: 3200.0,
      currency: 'USD',
      timestamp: addHours(baseDate, 1),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-CORP-PAYROLL',
      ipAddress: '10.0.0.1',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-EMPLOYEE-01',
      receiverAccountId: 'ACC-SUPERMARKET',
      amount: 145.5,
      currency: 'USD',
      timestamp: addHours(baseDate, 5),
      transactionType: 'PAYMENT',
      deviceId: 'DEV-MOBILE-USER',
      ipAddress: '172.16.0.5',
    },
  ];

  const allTransactions = [
    ...s1Txs,
    ...s2Txs,
    ...s3Txs,
    ...s4Txs,
    ...benignTxs,
  ];

  return {
    scenarios: {
      FAN_IN: scenario1,
      RAPID_MOVEMENT: scenario2,
      CIRCULAR: scenario3,
      SHARED_DEVICE: scenario4,
    },
    allTransactions,
  };
}
