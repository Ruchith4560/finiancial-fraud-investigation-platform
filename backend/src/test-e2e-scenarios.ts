import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { AlertService } from './services/alertService';
import { PatternService } from './services/patternService';
import { GraphService } from './services/graphService';
import { InvestigationService } from './services/investigationService';
import { CaseService } from './services/caseService';
import { AIService } from './services/aiService';
import { generateScenarios } from './utils/scenarioData';
import { Transaction } from './models/Transaction';
import { Alert } from './models/Alert';
import { Case } from './models/Case';

async function runEndToEndScenarioSuite() {
  console.log('======================================================================');
  console.log('🏁 FRAUDLENS AI: END-TO-END SCENARIO & REGRESSION VERIFICATION SUITE');
  console.log('======================================================================');

  await connectDatabase();

  const { scenarios, allTransactions } = generateScenarios();

  // =========================================================================
  // STAGE 1: INGESTION & IDEMPOTENCY
  // =========================================================================
  console.log('\n[Stage 1] Ingesting multi-scenario dataset & asserting idempotency...');
  const ingestBatch1 = await IngestionService.ingestTransactionBatch(allTransactions, 'e2e.scenario.stream');
  console.log(`✓ Ingested ${ingestBatch1.validCount} transactions (Batch ID: ${ingestBatch1.batch.batchId})`);

  if (ingestBatch1.validCount !== allTransactions.length) {
    throw new Error(`Expected ${allTransactions.length} ingested transactions, got ${ingestBatch1.validCount}`);
  }

  // Idempotency check: Re-ingest exact same transactions
  const ingestBatch2 = await IngestionService.ingestTransactionBatch(allTransactions, 'e2e.scenario.stream');
  console.log(`✓ Idempotency Verified: Duplicate batch processed with 0 duplicate transactions inserted.`);

  if (ingestBatch2.validCount !== 0) {
    throw new Error(`Expected 0 newly inserted transactions on duplicate batch, got ${ingestBatch2.validCount}`);
  }

  const dbTxCount = await Transaction.countDocuments();
  if (dbTxCount !== allTransactions.length) {
    throw new Error(`Database transaction count mismatch: expected ${allTransactions.length}, got ${dbTxCount}`);
  }

  // =========================================================================
  // STAGE 2: 3-LAYER RISK ENGINE (Rules + ML + Composite)
  // =========================================================================
  console.log('\n[Stage 2] Executing 3-Layer Risk Engine & Generating Alerts...');
  const riskResult = await AlertService.syncAlerts(500);
  console.log(`✓ Risk Engine Executed: Scored ${riskResult.totalAnalyzed} transactions, generated ${riskResult.syncedAlerts} alerts.`);

  const totalAlerts = await Alert.countDocuments();
  if (totalAlerts === 0) {
    throw new Error('Risk engine failed to generate alerts for suspicious scenario transactions.');
  }

  // Verify critical alerts
  const criticalAlerts = await Alert.find({ severity: 'CRITICAL' });
  console.log(`✓ Alerts Verified: Total ${totalAlerts} alerts (${criticalAlerts.length} Critical, ${totalAlerts - criticalAlerts.length} High/Medium).`);

  // =========================================================================
  // STAGE 3: ALERT QUEUE & TRIAGE LIFECYCLE
  // =========================================================================
  console.log('\n[Stage 3] Testing Alert Queue Triaging & State Transitions...');
  const activeAlerts = await AlertService.getAlertQueue({ status: 'NEW', limit: 5 });
  if (activeAlerts.alerts.length === 0) throw new Error('No NEW alerts found in triage queue');

  const firstAlert = activeAlerts.alerts[0];
  const triagedAlert = await AlertService.updateStatus(firstAlert.alertId, 'IN_REVIEW');
  if (triagedAlert.status !== 'IN_REVIEW') {
    throw new Error(`Failed to update alert status to IN_REVIEW, got: ${triagedAlert.status}`);
  }
  console.log(`✓ Alert ${firstAlert.alertId} transitioned from NEW -> IN_REVIEW.`);

  // =========================================================================
  // STAGE 4: MULTI-HOP GRAPH PATTERN DETECTION
  // =========================================================================
  console.log('\n[Stage 4] Validating Multi-Hop Graph Typology Detectors...');
  const patternResp = await PatternService.getDetectedPatterns();

  console.log(`✓ Pattern Engine detected ${patternResp.totalPatternsDetected} multi-hop typologies:`);
  for (const [typology, count] of Object.entries(patternResp.summaryByType)) {
    console.log(`   - ${typology}: ${count} instance(s)`);
  }

  // Assert all 4 core typologies are detected
  const detectedTypes = new Set(patternResp.patterns.map((p: any) => p.patternType));
  const expectedTypes = ['FAN_IN', 'RAPID_MOVEMENT', 'CIRCULAR_TRANSFER', 'SHARED_IDENTIFIER'];
  for (const exp of expectedTypes) {
    if (!detectedTypes.has(exp)) {
      throw new Error(`Expected pattern '${exp}' was NOT detected by the Pattern Engine!`);
    }
  }

  // =========================================================================
  // STAGE 5: GRAPH & RELATIONSHIP INTELLIGENCE (Ego-Networks)
  // =========================================================================
  console.log('\n[Stage 5] Extracting k-Hop Ego-Networks & Device Bipartite Mappings...');
  // 5a. Ego-network around ACC-HUB-CENTRAL
  const hubGraph = await GraphService.getSubgraph({ rootAccountId: 'ACC-HUB-CENTRAL', hops: 2 });
  console.log(`✓ ACC-HUB-CENTRAL Ego-Network: ${hubGraph.nodes.length} nodes, ${hubGraph.edges.length} edges.`);
  if (hubGraph.nodes.length < 5) throw new Error('ACC-HUB-CENTRAL ego-network has too few nodes');

  // 5b. Device Bipartite Network around ACC-BOT-01
  const botGraph = await GraphService.getSubgraph({ rootAccountId: 'ACC-BOT-01', hops: 2, includeDevices: true });
  const deviceNode = botGraph.nodes.find((n) => n.type === 'DEVICE');
  if (!deviceNode) throw new Error('Failed to map shared hardware device in bipartite projection');
  console.log(`✓ Bipartite Device Mapping Verified: Account ACC-BOT-01 linked to hardware ${deviceNode.id}.`);

  // =========================================================================
  // STAGE 6: UNIFIED INVESTIGATION DOSSIER ASSEMBLY
  // =========================================================================
  console.log('\n[Stage 6] Assembling Full Forensic Investigation Dossier...');
  const dossier = await InvestigationService.getDossier('ACC-HUB-CENTRAL');
  console.log(`✓ Dossier Assembled for 'ACC-HUB-CENTRAL':`);
  console.log(`   - Composite Risk Score: ${dossier.summary.riskScore}/100 (${dossier.summary.riskLevel})`);
  console.log(`   - Total Inflow Volume: $${dossier.summary.totalInflow.toLocaleString()}`);
  console.log(`   - Timeline Events: ${dossier.timeline.length} events`);
  console.log(`   - Triggered Rule Count: ${dossier.whyFlagged.ruleTriggers.length}`);
  console.log(`   - Detected Graph Typologies: ${dossier.patterns.length}`);

  if (dossier.timeline.length < scenarios.FAN_IN.expectedMinTransactions) {
    throw new Error(`Dossier timeline contains fewer transactions than expected for scenario`);
  }

  // =========================================================================
  // STAGE 7: CASE MANAGEMENT & IMMUTABLE EVIDENCE FREEZE
  // =========================================================================
  console.log('\n[Stage 7] Opening Case, Freezing Evidence & Verifying Immutability...');
  const formalCase = await CaseService.createCase({
    title: scenarios.FAN_IN.name,
    description: 'Automated referral from E2E verification scenario for deposit smurfing.',
    primaryAccountId: 'ACC-HUB-CENTRAL',
    priority: 'CRITICAL',
    assignedInvestigatorName: 'Special Agent Sarah Jenkins',
    initialNotes: 'Immediate escalation requested due to multiple structured feeder accounts.',
    userId: 'AGENT-SARAH',
    userName: 'Sarah Jenkins',
  });

  console.log(`✓ Case Created: ${formalCase.caseId} (Status: ${formalCase.status}, Priority: ${formalCase.priority})`);
  const initialFrozenTxCount = formalCase.evidenceSnapshot?.transactionCount || 0;
  const initialFrozenVolume = formalCase.evidenceSnapshot?.totalAmountFlagged || 0;
  console.log(`   - Frozen Snapshot: ${initialFrozenTxCount} txs totaling $${initialFrozenVolume.toLocaleString()}`);

  // Test Immutability: Mutate live database with a brand new transaction for ACC-HUB-CENTRAL
  await IngestionService.ingestTransactionBatch([
    {
      transactionId: 'TX-MUTATION-POST-FREEZE',
      senderAccountId: 'ACC-NEW-FEEDER',
      receiverAccountId: 'ACC-HUB-CENTRAL',
      amount: 50000.0,
      currency: 'USD',
      timestamp: new Date(),
      transactionType: 'TRANSFER',
    },
  ]);

  // Reload the case from database
  const reloadedCase = await CaseService.getCaseById(formalCase.caseId);
  if (reloadedCase.evidenceSnapshot?.transactionCount !== initialFrozenTxCount) {
    throw new Error('IMMUTABILITY BREACH: Live transaction insertion mutated frozen case snapshot!');
  }
  if (reloadedCase.evidenceSnapshot?.totalAmountFlagged !== initialFrozenVolume) {
    throw new Error('IMMUTABILITY BREACH: Frozen dollar volume mutated after case freeze!');
  }
  console.log('✓ Evidence Snapshot Immutability Verified: Post-case transactions did NOT mutate frozen baseline.');

  // =========================================================================
  // STAGE 8: AI REGULATORY CO-PILOT & FINCEN SAR NARRATIVE
  // =========================================================================
  console.log('\n[Stage 8] Generating AI Investigation Summary & FinCEN Form 111 SAR Narrative...');
  const aiSummary = await AIService.generateSummary(
    'ACC-HUB-CENTRAL',
    formalCase.caseId,
    'Investigator verified all feeder accounts were registered with invalid residential addresses.'
  );

  console.log(`✓ AI Summary Synthesized:`);
  console.log(`   - Model: ${aiSummary.modelUsed}`);
  console.log(`   - Guardrail Validation: ${aiSummary.guardrailStatus}`);
  console.log(`   - Observed Facts: ${aiSummary.observedFacts.length} verifiable data points`);
  console.log(`   - System Inferences: ${aiSummary.systemInferences.length} model derivations`);
  console.log(`   - Recommended Actions: ${aiSummary.recommendedActions.length} compliance steps`);

  // Assert Fact vs. Inference separation
  if (aiSummary.observedFacts.length < 3) throw new Error('AI summary missing expected observed facts');
  if (aiSummary.systemInferences.length < 1) throw new Error('AI summary missing expected system inferences');

  // Assert SAR Narrative 4-part structure
  const sar = aiSummary.sarNarrative;
  if (!sar.fullNarrativeText.includes('PART I:') || !sar.fullNarrativeText.includes('PART IV:')) {
    throw new Error('FinCEN SAR Narrative missing required statutory part headers');
  }

  // Verify Case record binding & audit event
  const finalizedCase = await Case.findOne({ caseId: formalCase.caseId });
  if (!finalizedCase?.aiSummary?.content) throw new Error('AI summary not bound to Case document');
  console.log(`✓ Case Evidence Bound: AI SAR Narrative successfully attached to ${formalCase.caseId} (v${finalizedCase.aiSummary.version}).`);

  await disconnectDatabase();
  console.log('\n======================================================================');
  console.log('🎉 ALL 8 END-TO-END INVESTIGATION LIFECYCLE STAGES PASSED FLAWLESSLY!');
  console.log('======================================================================\n');
}

runEndToEndScenarioSuite().catch(async (err) => {
  console.error('\n❌ E2E SCENARIO SUITE FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
