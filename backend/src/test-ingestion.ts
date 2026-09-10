import { Readable } from 'stream';
import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { Transaction } from './models/Transaction';
import { IngestionBatch } from './models/IngestionBatch';

async function runIngestionTests() {
  console.log('--- STARTING PHASE 3 DATA INGESTION & INTELLIGENCE TESTS ---');

  await connectDatabase();

  // Test 1: Load Enterprise Demo Dataset
  console.log('\n[Test 1] Seeding Enterprise Demo Dataset (FinTech Mule Syndicate)...');
  const demoResult = await IngestionService.loadDemoDataset('test.investigator');

  if (demoResult.validCount < 400) {
    throw new Error(`Expected at least 400 transactions, got ${demoResult.validCount}`);
  }
  console.log(`✓ Test 1 Passed: Successfully ingested ${demoResult.validCount} transactions into batch '${demoResult.batch.batchId}'.`);

  // Test 2: Verify 5 Fraud Typologies
  console.log('\n[Test 2] Verifying presence of 5 embedded fraud typologies...');

  // Typology 1: Rapid movement
  const rapidTxs = await Transaction.find({
    $or: [{ senderAccountId: 'ACC-MULE-ALPHA' }, { receiverAccountId: 'ACC-MULE-ALPHA' }],
  });
  if (rapidTxs.length < 2) throw new Error('Rapid movement typology missing');
  console.log(`  ✓ Typology 1 Verified: Rapid Fund Movement (Mule Pass-through detected, ${rapidTxs.length} txs).`);

  // Typology 2: Fan-in
  const fanInTxs = await Transaction.find({ receiverAccountId: 'ACC-HUB-CENTRAL' });
  if (fanInTxs.length < 6) throw new Error('Fan-In smurfing typology missing');
  console.log(`  ✓ Typology 2 Verified: Fan-In Smurfing (${fanInTxs.length} feeder accounts detected).`);

  // Typology 3: Fan-out
  const fanOutTxs = await Transaction.find({ senderAccountId: 'ACC-HUB-CENTRAL' });
  if (fanOutTxs.length < 5) throw new Error('Fan-Out dispersion typology missing');
  console.log(`  ✓ Typology 3 Verified: Fan-Out Dispersion (${fanOutTxs.length} exit destinations detected).`);

  // Typology 4: Circular Ring
  const circularTxs = await Transaction.find({ senderAccountId: { $regex: /^ACC-RING-/ } });
  if (circularTxs.length < 4) throw new Error('Circular ring typology missing');
  console.log(`  ✓ Typology 4 Verified: Circular Transfers (${circularTxs.length} ring transactions detected).`);

  // Typology 5: Shared Device
  const sharedDevTxs = await Transaction.find({ deviceId: 'DEV-EMULATOR-NOX-09' });
  if (sharedDevTxs.length < 4) throw new Error('Shared device farm typology missing');
  console.log(`  ✓ Typology 5 Verified: Shared Device Farm (${sharedDevTxs.length} accounts sharing same hardware fingerprint).`);

  // Test 3: CSV Stream Parsing & Validation Pipeline
  console.log('\n[Test 3] Testing CSV stream validation with intentional errors...');
  const testCsvContent = `transaction_id,sender_account_id,receiver_account_id,amount,timestamp,transaction_type
TX-VALID-101,ACC-USER-A,ACC-USER-B,150.00,2026-09-01T10:00:00Z,TRANSFER
TX-INVALID-NO-SENDER,,ACC-USER-B,250.00,2026-09-01T10:05:00Z,TRANSFER
TX-INVALID-SELF,ACC-USER-C,ACC-USER-C,300.00,2026-09-01T10:10:00Z,TRANSFER
TX-INVALID-BAD-AMOUNT,ACC-USER-D,ACC-USER-E,-50.00,2026-09-01T10:15:00Z,TRANSFER
TX-VALID-102,ACC-USER-F,ACC-USER-G,12500.00,2026-09-01T10:20:00Z,TRANSFER
TX-VALID-102,ACC-USER-H,ACC-USER-I,50.00,2026-09-01T10:25:00Z,TRANSFER`;

  const stream = Readable.from(testCsvContent);
  const csvResult = await IngestionService.processCsvStream(stream, 'test_sample.csv', 'test.investigator');

  if (csvResult.validCount !== 2) {
    throw new Error(`Expected exactly 2 valid transactions, got ${csvResult.validCount}`);
  }
  if (csvResult.invalidCount < 4) {
    throw new Error(`Expected at least 4 validation errors, got ${csvResult.invalidCount}`);
  }
  console.log(`✓ Test 3 Passed: CSV Stream validated with error precision (Valid: ${csvResult.validCount}, Rejected: ${csvResult.invalidCount}).`);

  // Test 4: Batch Persistence
  console.log('\n[Test 4] Verifying IngestionBatch metadata and error persistence...');
  const savedBatch = await IngestionBatch.findOne({ batchId: csvResult.batch.batchId });
  if (!savedBatch) throw new Error('Batch record not found');
  if (savedBatch.validationErrors.length === 0) throw new Error('Validation errors not stored in batch');
  console.log(`✓ Test 4 Passed: Batch stored with ${savedBatch.validationErrors.length} detailed error reports.`);

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 3 INGESTION TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runIngestionTests().catch(async (err) => {
  console.error('\n❌ INGESTION TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
