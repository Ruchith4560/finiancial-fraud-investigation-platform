import { ValidatedTransaction } from '../services/validationService';

export function generateDemoDataset(): ValidatedTransaction[] {
  const transactions: ValidatedTransaction[] = [];
  const baseDate = new Date('2026-09-01T08:00:00Z');

  let idCounter = 1000;
  const nextId = () => `TX-${++idCounter}`;

  // Helper to add hours
  const addHours = (d: Date, hours: number) => new Date(d.getTime() + hours * 3600 * 1000);
  const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60 * 1000);

  // =========================================================================
  // TYPOLOGY 1: RAPID FUND MOVEMENT (Layering Pass-through)
  // Victim -> Mule -> Exit within 28 minutes, 97.3% balance pass-through
  // =========================================================================
  const t1Date = addHours(baseDate, 24 * 3 + 14); // Day 4, 14:00
  transactions.push({
    transactionId: nextId(),
    senderAccountId: 'ACC-VICTIM-10',
    receiverAccountId: 'ACC-MULE-ALPHA',
    amount: 48500.0,
    currency: 'USD',
    timestamp: t1Date,
    transactionType: 'TRANSFER',
    deviceId: 'DEV-VICTIM-MAC',
    ipAddress: '198.51.100.12',
  });

  transactions.push({
    transactionId: nextId(),
    senderAccountId: 'ACC-MULE-ALPHA',
    receiverAccountId: 'ACC-OFFSHORE-99',
    amount: 47200.0,
    currency: 'USD',
    timestamp: addMinutes(t1Date, 28), // 28 minutes later!
    transactionType: 'TRANSFER',
    deviceId: 'DEV-MULE-ANDROID',
    ipAddress: '203.0.113.44',
  });

  // =========================================================================
  // TYPOLOGY 2: FAN-IN SMURFING (Deposit Aggregation Under CTR Threshold)
  // 6 distinct accounts send ~$9,850 each to ACC-HUB-CENTRAL within 8 hours
  // =========================================================================
  const t2Date = addHours(baseDate, 24 * 5 + 9); // Day 6, 09:00
  const smurfSenders = [
    'ACC-SMURF-01',
    'ACC-SMURF-02',
    'ACC-SMURF-03',
    'ACC-SMURF-04',
    'ACC-SMURF-05',
    'ACC-SMURF-06',
  ];

  smurfSenders.forEach((sender, idx) => {
    transactions.push({
      transactionId: nextId(),
      senderAccountId: sender,
      receiverAccountId: 'ACC-HUB-CENTRAL',
      amount: 9850.0 + idx * 25.0, // Just below $10,000 threshold
      currency: 'USD',
      timestamp: addMinutes(t2Date, idx * 55),
      transactionType: 'TRANSFER',
      deviceId: `DEV-SMURF-PH0${idx + 1}`,
      ipAddress: `192.0.2.${50 + idx}`,
    });
  });

  // =========================================================================
  // TYPOLOGY 3: FAN-OUT LAYERING (Rapid Dispersion)
  // ACC-HUB-CENTRAL disperses funds to 5 different recipient accounts
  // =========================================================================
  const t3Date = addHours(t2Date, 12); // Day 6, 21:00
  const fanOutReceivers = [
    'ACC-EXIT-01',
    'ACC-EXIT-02',
    'ACC-EXIT-03',
    'ACC-EXIT-04',
    'ACC-EXIT-05',
  ];

  fanOutReceivers.forEach((receiver, idx) => {
    transactions.push({
      transactionId: nextId(),
      senderAccountId: 'ACC-HUB-CENTRAL',
      receiverAccountId: receiver,
      amount: 8900.0,
      currency: 'USD',
      timestamp: addMinutes(t3Date, idx * 30),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-HUB-SERVER',
      ipAddress: '198.51.100.88',
    });
  });

  // =========================================================================
  // TYPOLOGY 4: CIRCULAR TRANSFERS (4-Hop Round-Trip Cycle)
  // RING-A -> RING-B -> RING-C -> RING-D -> RING-A within 48 hours
  // =========================================================================
  const t4Date = addHours(baseDate, 24 * 7 + 10); // Day 8, 10:00
  transactions.push(
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-ALPHA',
      receiverAccountId: 'ACC-RING-BETA',
      amount: 35000.0,
      currency: 'USD',
      timestamp: t4Date,
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-01',
      ipAddress: '203.0.113.101',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-BETA',
      receiverAccountId: 'ACC-RING-GAMMA',
      amount: 34200.0,
      currency: 'USD',
      timestamp: addHours(t4Date, 4),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-02',
      ipAddress: '203.0.113.102',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-GAMMA',
      receiverAccountId: 'ACC-RING-DELTA',
      amount: 33800.0,
      currency: 'USD',
      timestamp: addHours(t4Date, 10),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-03',
      ipAddress: '203.0.113.103',
    },
    {
      transactionId: nextId(),
      senderAccountId: 'ACC-RING-DELTA',
      receiverAccountId: 'ACC-RING-ALPHA',
      amount: 33000.0,
      currency: 'USD',
      timestamp: addHours(t4Date, 22),
      transactionType: 'TRANSFER',
      deviceId: 'DEV-RING-04',
      ipAddress: '203.0.113.104',
    }
  );

  // =========================================================================
  // TYPOLOGY 5: SHARED IDENTIFIER NETWORKS (Device Farm Collusion)
  // 4 accounts operating through identical physical emulator device
  // =========================================================================
  const t5Date = addHours(baseDate, 24 * 9 + 11);
  const farmAccounts = [
    'ACC-FARM-01',
    'ACC-FARM-02',
    'ACC-FARM-03',
    'ACC-FARM-04',
  ];

  farmAccounts.forEach((acc, idx) => {
    transactions.push({
      transactionId: nextId(),
      senderAccountId: acc,
      receiverAccountId: `ACC-MERCHANT-${idx + 1}`,
      amount: 4200.0 + idx * 150.0,
      currency: 'USD',
      timestamp: addHours(t5Date, idx * 2),
      transactionType: 'PAYMENT',
      deviceId: 'DEV-EMULATOR-NOX-09', // The exact same shared device!
      ipAddress: '198.51.100.250',
    });
  });

  // =========================================================================
  // BACKGROUND BENIGN FINANCIAL TRAFFIC (~480 normal transactions)
  // Normal payroll, retail payments, subscriptions, inter-account transfers
  // =========================================================================
  const benignAccounts = Array.from({ length: 40 }, (_, i) => `ACC-RETAIL-${100 + i}`);
  const benignMerchants = ['MCH-AMAZON-US', 'MCH-WALMART-PAY', 'MCH-NETFLIX', 'MCH-UBER-EATS', 'MCH-CHEVRON-GAS'];

  for (let i = 0; i < 470; i++) {
    const sender = benignAccounts[i % benignAccounts.length];
    const receiver = i % 3 === 0 
      ? benignMerchants[i % benignMerchants.length]
      : benignAccounts[(i + 7) % benignAccounts.length];

    const dayOffset = (i % 14);
    const hourOffset = 7 + (i % 15);
    const minuteOffset = (i * 13) % 60;
    const txDate = addMinutes(addHours(baseDate, dayOffset * 24 + hourOffset), minuteOffset);

    const amounts = [18.5, 45.99, 120.0, 250.0, 780.0, 1450.0, 2100.0];
    const amount = amounts[i % amounts.length] + Math.round(Math.random() * 20);

    transactions.push({
      transactionId: nextId(),
      senderAccountId: sender,
      receiverAccountId: receiver,
      amount,
      currency: 'USD',
      timestamp: txDate,
      transactionType: i % 4 === 0 ? 'PAYMENT' : 'TRANSFER',
      deviceId: `DEV-USER-${100 + (i % 35)}`,
      ipAddress: `192.168.1.${10 + (i % 50)}`,
    });
  }

  // Sort chronologically
  return transactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}
