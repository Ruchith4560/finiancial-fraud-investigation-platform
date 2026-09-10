import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { Transaction } from './models/Transaction';

async function runExplorerTests() {
  console.log('--- STARTING PHASE 4 TRANSACTION EXPLORER INTEGRATION TESTS ---');

  await connectDatabase();

  // 1. Seed demo dataset if needed
  console.log('\n[Test 1] Ensuring dataset is populated...');
  await IngestionService.loadDemoDataset('test.explorer');
  const total = await Transaction.countDocuments();
  console.log(`✓ Test 1 Passed: Dataset ready with ${total} transactions.`);

  // 2. Test Aggregation Stats
  console.log('\n[Test 2] Testing global transaction aggregation stats...');
  const stats = await Transaction.aggregate([
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: '$amount' },
        flaggedCount: { $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] } },
        criticalCount: { $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] } },
      },
    },
  ]);
  const s = stats[0];
  if (!s || s.totalTransactions < 400 || s.flaggedCount === 0 || s.criticalCount === 0) {
    throw new Error('Stats aggregation verification failed');
  }
  console.log(`✓ Test 2 Passed: Stats verified (Total: ${s.totalTransactions}, Volume: $${Math.round(s.totalVolume).toLocaleString()}, Flagged: ${s.flaggedCount}, Critical: ${s.criticalCount}).`);

  // 3. Test Search Filter
  console.log('\n[Test 3] Testing search by account ID...');
  const muleTxs = await Transaction.find({
    $or: [
      { senderAccountId: { $regex: 'ACC-MULE-ALPHA', $options: 'i' } },
      { receiverAccountId: { $regex: 'ACC-MULE-ALPHA', $options: 'i' } },
    ],
  });
  if (muleTxs.length < 2) throw new Error('Search for mule transactions failed');
  console.log(`✓ Test 3 Passed: Search located ${muleTxs.length} mule transactions.`);

  // 4. Test Amount Range Filtering
  console.log('\n[Test 4] Testing high-value amount filtering (amount >= 30,000)...');
  const highValTxs = await Transaction.find({ amount: { $gte: 30000 } });
  if (highValTxs.length < 5) throw new Error('High value amount filter failed');
  console.log(`✓ Test 4 Passed: Amount range query retrieved ${highValTxs.length} high-value transactions.`);

  // 5. Test Risk Level Filtering
  console.log('\n[Test 5] Testing risk level filtering (riskLevel = CRITICAL)...');
  const criticalTxs = await Transaction.find({ riskLevel: 'CRITICAL' });
  if (criticalTxs.length === 0) throw new Error('Critical filter returned 0');
  console.log(`✓ Test 5 Passed: Critical filter retrieved ${criticalTxs.length} transactions with explainable risk factors.`);

  // 6. Test Single Transaction Detail with Explanations
  console.log('\n[Test 6] Testing single transaction detail & explainability breakdown...');
  const single = await Transaction.findOne({ isFlagged: true });
  if (!single || single.riskFactors.length === 0) throw new Error('Single flagged transaction missing risk factors');
  console.log(`✓ Test 6 Passed: Retrieved ${single.transactionId} with ${single.riskFactors.length} explainable rule factor(s):`);
  single.riskFactors.forEach((rf) => console.log(`    → [${rf.ruleId}] ${rf.ruleName}: +${rf.scoreContribution} pts (${rf.description})`));

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 4 EXPLORER TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runExplorerTests().catch(async (err) => {
  console.error('\n❌ EXPLORER TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
