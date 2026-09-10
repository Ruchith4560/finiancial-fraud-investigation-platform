import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { GraphService } from './services/graphService';
import { InvestigationService } from './services/investigationService';
import { CaseService } from './services/caseService';
import { PythonClient } from './services/pythonClient';
import { AppError } from './middleware/errorHandler';

async function runResilienceSuite() {
  console.log('======================================================================');
  console.log('🛡️ FRAUDLENS AI: SYSTEM RESILIENCE & FAULT TOLERANCE VERIFICATION SUITE');
  console.log('======================================================================');

  await connectDatabase();

  // =========================================================================
  // TEST 1: NON-EXISTENT ENTITY QUERIES (Zero-crash graceful degradation)
  // =========================================================================
  console.log('\n[Test 1] Querying non-existent entity accounts in graph & dossier services...');
  const emptyGraph = await GraphService.getSubgraph({ rootAccountId: 'ACC-DOES-NOT-EXIST-404', hops: 2 });
  if (emptyGraph.edges.length !== 0) {
    throw new Error('Expected 0 edges for non-existent account graph query');
  }
  console.log(`✓ Graph Service handled non-existent account gracefully (${emptyGraph.nodes.length} nodes, ${emptyGraph.edges.length} edges).`);

  const emptyDossier = await InvestigationService.getDossier('ACC-DOES-NOT-EXIST-404');
  if (emptyDossier.timeline.length !== 0) {
    throw new Error('Expected 0 timeline events for non-existent account');
  }
  if (emptyDossier.summary.riskScore !== 0) {
    throw new Error('Expected 0 risk score for clean unrecorded account');
  }
  console.log(`✓ Dossier Service returned clean zero-state dossier without throwing unhandled exceptions.`);

  // =========================================================================
  // TEST 2: INGESTION VALIDATION & CORRUPT DATA QUARANTINE
  // =========================================================================
  console.log('\n[Test 2] Submitting malformed and corrupted transactions to ingestion engine...');
  const corruptBatch = [
    {
      transactionId: 'TX-CORRUPT-NEGATIVE',
      senderAccountId: 'ACC-A',
      receiverAccountId: 'ACC-B',
      amount: -500.0, // Negative amount
      currency: 'USD',
      timestamp: new Date(),
    },
    {
      transactionId: '', // Empty ID
      senderAccountId: 'ACC-A',
      receiverAccountId: 'ACC-B',
      amount: 1000.0,
      currency: 'USD',
      timestamp: new Date(),
    },
    {
      transactionId: 'TX-CORRUPT-SELF',
      senderAccountId: 'ACC-SAME',
      receiverAccountId: 'ACC-SAME', // Self-transfer
      amount: 1000.0,
      currency: 'USD',
      timestamp: new Date(),
    },
  ];

  const ingestReport = await IngestionService.ingestTransactionBatch(corruptBatch as any, 'resilience.test');
  console.log(`✓ Ingestion Quarantine Verified:`);
  console.log(`   - Submitted: ${ingestReport.totalProcessed}`);
  console.log(`   - Rejected / Quarantined: ${ingestReport.invalidCount}`);
  console.log(`   - Valid Inserted: ${ingestReport.validCount}`);

  if (ingestReport.invalidCount !== 3) {
    throw new Error(`Expected all 3 corrupt transactions to be quarantined, but got ${ingestReport.invalidCount}`);
  }

  // =========================================================================
  // TEST 3: CASE STATE MACHINE & INVALID TRANSITION DEFENSES
  // =========================================================================
  console.log('\n[Test 3] Testing Case state machine constraints & non-existent case lookups...');
  try {
    await CaseService.getCaseById('CASE-DOES-NOT-EXIST');
    throw new Error('Expected 404 for non-existent case lookup');
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 404) {
      console.log(`✓ Correctly returned 404 CASE_NOT_FOUND for non-existent case.`);
    } else {
      throw err;
    }
  }

  try {
    // Attempting status update without required reason
    const dummyCase = await CaseService.createCase({
      title: 'Resilience Test Case',
      primaryAccountId: 'ACC-TEST',
      priority: 'LOW',
    });
    await CaseService.updateStatus(dummyCase.caseId, 'CLOSED', '   '); // Empty reason
    throw new Error('Expected error when transitioning case status without justification reason');
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 400) {
      console.log(`✓ State machine rejected status transition with blank justification reason.`);
    } else {
      throw err;
    }
  }

  // =========================================================================
  // TEST 4: LOCAL DETERMINISTIC FALLBACK VERIFICATION
  // =========================================================================
  console.log('\n[Test 4] Verifying 100% offline local fallback execution for AI synthesis...');
  const fallbackSummary = PythonClient.localSummaryFallback({
    targetAccountId: 'ACC-RESILIENCE-01',
    transactions: [
      {
        transactionId: 'TX-FB-01',
        senderAccountId: 'ACC-SMURF-A',
        receiverAccountId: 'ACC-RESILIENCE-01',
        amount: 9800.0,
        timestamp: new Date().toISOString(),
        deviceId: 'DEV-OFFLINE-01',
      },
    ],
    detectedPatterns: [],
    riskFactors: [],
    mlAnomalyScore: 0.72,
  });

  if (fallbackSummary.guardrailStatus !== 'PASSED_ZERO_HALLUCINATION_CHECKS') {
    throw new Error('Fallback summary failed guardrail status check');
  }
  if (!fallbackSummary.sarNarrative.fullNarrativeText.includes('PART I:')) {
    throw new Error('Fallback summary missing Part I SAR header');
  }
  console.log(`✓ Offline Local Fallback Synthesized full 4-part SAR narrative (${fallbackSummary.observedFacts.length} facts, ${fallbackSummary.systemInferences.length} inferences).`);

  await disconnectDatabase();
  console.log('\n======================================================================');
  console.log('🎉 ALL SYSTEM RESILIENCE & FAULT TOLERANCE TESTS PASSED PERFECTLY!');
  console.log('======================================================================\n');
}

runResilienceSuite().catch(async (err) => {
  console.error('\n❌ RESILIENCE SUITE FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
