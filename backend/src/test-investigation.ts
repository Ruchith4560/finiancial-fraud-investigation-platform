import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { AlertService } from './services/alertService';
import { InvestigationService } from './services/investigationService';

async function runInvestigationTests() {
  console.log('--- STARTING PHASE 8 UNIFIED INVESTIGATION WORKSPACE DOSSIER TESTS ---');

  await connectDatabase();

  // 1. Seed demo dataset
  console.log('\n[Test 1] Seeding dataset...');
  await IngestionService.loadDemoDataset('test.investigation');

  // 2. Sync alerts
  console.log('\n[Test 2] Synchronizing alerts...');
  await AlertService.syncAlerts(500);

  // 3. Assemble investigation dossier for smurfing & fan-out hub account
  const target = 'ACC-HUB-CENTRAL';
  console.log(`\n[Test 3] Assembling complete forensic dossier for '${target}'...`);
  const dossier = await InvestigationService.getDossier(target);

  console.log(`✓ Test 3 Passed: Successfully assembled forensic dossier:`);
  console.log('  Summary:', dossier.summary);
  console.log(`  Timeline events: ${dossier.timeline.length}`);
  console.log(`  Graph nodes: ${dossier.graph.nodes.length}, edges: ${dossier.graph.edges.length}`);
  console.log(`  Detected typologies: ${dossier.patterns.length}`);
  console.log(`  Why-flagged rule triggers: ${dossier.whyFlagged.ruleTriggers.length}`);

  // 4. Verify dossier integrity
  console.log('\n[Test 4] Verifying dossier invariants & evidence defensibility...');
  if (dossier.targetAccountId !== target) throw new Error('Target account mismatch');
  if (dossier.timeline.length === 0) throw new Error('Timeline is empty');
  if (dossier.summary.totalInflow <= 0) throw new Error('Inflow should be positive');
  if (dossier.summary.totalOutflow <= 0) throw new Error('Outflow should be positive');
  if (dossier.graph.nodes.length < 5) throw new Error('Ego graph should have at least 5 nodes');

  // Verify timeline contains both INCOMING and OUTGOING transfers
  const hasIncoming = dossier.timeline.some((t) => t.direction === 'INCOMING');
  const hasOutgoing = dossier.timeline.some((t) => t.direction === 'OUTGOING');
  if (!hasIncoming || !hasOutgoing) {
    throw new Error('Timeline should contain both INCOMING and OUTGOING flows for a hub account');
  }

  console.log('✓ Test 4 Passed: All dossier invariants verified.');

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 8 INVESTIGATION DOSSIER TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runInvestigationTests().catch(async (err) => {
  console.error('\n❌ INVESTIGATION TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
