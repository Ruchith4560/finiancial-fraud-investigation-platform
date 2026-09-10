import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { AlertService } from './services/alertService';
import { Alert } from './models/Alert';

async function runAlertTests() {
  console.log('--- STARTING PHASE 5 RISK & ALERT INTELLIGENCE INTEGRATION TESTS ---');

  await connectDatabase();

  // 1. Ensure dataset exists
  console.log('\n[Test 1] Seeding dataset...');
  await IngestionService.loadDemoDataset('test.alerts');

  // 2. Sync alerts via Risk Engine
  console.log('\n[Test 2] Synchronizing alerts via Layer 1/2/3 Risk Engine...');
  const syncResult = await AlertService.syncAlerts(500);
  console.log(`✓ Test 2 Passed: Evaluated ${syncResult.totalAnalyzed} transactions, synchronized ${syncResult.syncedAlerts} prioritized alerts.`);

  if (syncResult.syncedAlerts === 0) {
    throw new Error('Expected at least 1 alert to be generated');
  }

  // 3. Verify Alert Explainability (NO unexplained scores!)
  console.log('\n[Test 3] Verifying zero-unexplained-risk invariant...');
  const alerts = await Alert.find().lean();
  for (const alt of alerts) {
    if (!alt.riskScore || alt.riskScore < 50) {
      throw new Error(`Alert ${alt.alertId} has sub-threshold risk score: ${alt.riskScore}`);
    }
    if (!alt.ruleTriggers || alt.ruleTriggers.length === 0) {
      throw new Error(`CRITICAL COMPLIANCE FAILURE: Alert ${alt.alertId} has NO supporting rule triggers!`);
    }
    for (const trig of alt.ruleTriggers) {
      if (!trig.ruleId || !trig.ruleName || !trig.description) {
        throw new Error(`Alert ${alt.alertId} has incomplete rule trigger metadata`);
      }
    }
  }
  console.log(`✓ Test 3 Passed: Verified ${alerts.length} alerts adhere strictly to explainability invariants.`);

  // 4. Test Prioritized Queue Retrieval
  console.log('\n[Test 4] Testing prioritized alert queue sorting and counterparty enrichment...');
  const queueResult = await AlertService.getAlertQueue({
    limit: 10,
    sortBy: 'riskScore',
    sortOrder: 'desc',
  });

  const topAlert = queueResult.alerts[0];
  if (!topAlert) throw new Error('Queue is empty');
  if (!topAlert.transaction) throw new Error('Alert not enriched with linked transaction data');
  console.log(`✓ Test 4 Passed: Top alert retrieved: ${topAlert.alertId} (Score: ${topAlert.riskScore}, Severity: ${topAlert.severity}, TxAmount: $${topAlert.transaction.amount.toLocaleString()}).`);

  // 5. Test Status Transition
  console.log('\n[Test 5] Testing alert status update (NEW -> IN_REVIEW)...');
  const updated = await AlertService.updateStatus(topAlert.alertId, 'IN_REVIEW');
  if (updated.status !== 'IN_REVIEW') throw new Error('Status update failed');
  console.log(`✓ Test 5 Passed: Alert ${topAlert.alertId} transitioned to IN_REVIEW.`);

  // 6. Test Alert Stats
  console.log('\n[Test 6] Testing global alert counters & severity distribution...');
  const stats = await AlertService.getAlertStats();
  if (stats.totalAlerts === 0) throw new Error('Stats totalAlerts is 0');
  console.log(`✓ Test 6 Passed: Global stats verified: Total: ${stats.totalAlerts} (Critical: ${stats.severities.CRITICAL}, High: ${stats.severities.HIGH}, InReview: ${stats.statuses.IN_REVIEW}).`);

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 5 RISK & ALERT TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runAlertTests().catch(async (err) => {
  console.error('\n❌ ALERT TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
