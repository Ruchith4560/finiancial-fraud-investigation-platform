import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { AlertService } from './services/alertService';
import { CaseService } from './services/caseService';
import { Alert } from './models/Alert';

async function runCaseTests() {
  console.log('--- STARTING PHASE 9 CASE MANAGEMENT & EVIDENCE FREEZE TESTS ---');

  await connectDatabase();

  // 1. Seed dataset
  console.log('\n[Test 1] Seeding realistic transaction dataset...');
  await IngestionService.loadDemoDataset('test.cases');

  // 2. Sync alerts
  console.log('\n[Test 2] Synchronizing alerts...');
  await AlertService.syncAlerts(500);

  // 3. Create Case with Evidence Snapshot
  const targetAccount = 'ACC-HUB-CENTRAL';
  console.log(`\n[Test 3] Creating Case and freezing immutable evidence snapshot for '${targetAccount}'...`);
  const createdCase = await CaseService.createCase({
    title: 'Operation Blue Cyclone: Multi-Account Smurfing Hub',
    description: 'Suspicious deposit aggregation from multiple smurf feeder accounts followed by structured rapid dispersion.',
    primaryAccountId: targetAccount,
    priority: 'CRITICAL',
    assignedInvestigatorName: 'Sarah Jenkins',
    initialNotes: 'Initial review indicates structured smurfing under BSA thresholds.',
    userId: 'investigator-01',
    userName: 'Sarah Jenkins',
  });

  console.log(`✓ Test 3 Passed: Case created with ID: ${createdCase.caseId}`);
  console.log('  Evidence Snapshot:');
  console.log(`    Frozen At: ${createdCase.evidenceSnapshot?.frozenAt}`);
  console.log(`    Frozen By: ${createdCase.evidenceSnapshot?.frozenBy}`);
  console.log(`    Transaction Count: ${createdCase.evidenceSnapshot?.transactionCount}`);
  console.log(`    Total Flagged Volume: $${createdCase.evidenceSnapshot?.totalAmountFlagged?.toLocaleString()}`);
  console.log(`    Graph Nodes: ${createdCase.evidenceSnapshot?.graphTopologySnapshot.nodes.length}`);
  console.log(`    Graph Edges: ${createdCase.evidenceSnapshot?.graphTopologySnapshot.edges.length}`);

  if (!createdCase.evidenceSnapshot) throw new Error('Evidence snapshot was not frozen');
  if (createdCase.evidenceSnapshot.transactionCount === 0) throw new Error('Snapshot transaction count is 0');
  if (createdCase.auditEvents.length !== 1) throw new Error('Initial audit event missing');

  // 4. Verify linked alerts updated to CASE_CREATED
  console.log('\n[Test 4] Verifying linked alerts updated to CASE_CREATED...');
  const updatedAlerts = await Alert.find({ primaryAccountId: targetAccount }).lean();
  const allUpdated = updatedAlerts.every((a) => a.status === 'CASE_CREATED');
  if (!allUpdated) throw new Error('Not all alerts were updated to CASE_CREATED');
  console.log(`✓ Test 4 Passed: Verified ${updatedAlerts.length} alerts linked and transitioned to CASE_CREATED.`);

  // 5. Update Status & Audit Trail
  console.log('\n[Test 5] Testing status transition and audit logging...');
  const updatedCase = await CaseService.updateStatus(
    createdCase.caseId,
    'ESCALATED',
    'Escalated to FinCEN SAR filing due to multi-hop wash trading ring.',
    'investigator-01',
    'Sarah Jenkins'
  );

  if (updatedCase.status !== 'ESCALATED') throw new Error('Status update failed');
  if (updatedCase.auditEvents.length !== 2) throw new Error('Audit trail should have 2 events');
  console.log(`✓ Test 5 Passed: Case transitioned to ESCALATED with audit log entry: "${updatedCase.auditEvents[1].details}".`);

  // 6. Assign Investigator
  console.log('\n[Test 6] Testing investigator assignment & audit trail...');
  const reassignedCase = await CaseService.assignInvestigator(
    createdCase.caseId,
    'user-02',
    'Michael Chang',
    'admin-01',
    'Compliance Director'
  );

  if (reassignedCase.assignedInvestigatorName !== 'Michael Chang') throw new Error('Assignment failed');
  if (reassignedCase.auditEvents.length !== 3) throw new Error('Audit trail should have 3 events');
  console.log(`✓ Test 6 Passed: Case assigned to Michael Chang with audit log.`);

  // 7. Case Query & Stats
  console.log('\n[Test 7] Testing case list pagination and global counters...');
  const caseList = await CaseService.getCases({ limit: 10 });
  if (caseList.cases.length === 0) throw new Error('Case list is empty');

  const stats = await CaseService.getCaseStats();
  console.log('  Case Stats:', stats);
  if (stats.totalCases === 0) throw new Error('Total cases is 0');
  console.log(`✓ Test 7 Passed: Successfully retrieved paginated cases and global stats.`);

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 9 CASE MANAGEMENT INTEGRATION TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runCaseTests().catch(async (err) => {
  console.error('\n❌ CASE TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
