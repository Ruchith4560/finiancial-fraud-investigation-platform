import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { AlertService } from './services/alertService';
import { CaseService } from './services/caseService';
import { AIService } from './services/aiService';
import { Case } from './models/Case';

async function runAISummaryTests() {
  console.log('--- STARTING PHASE 10 AI INVESTIGATION SUMMARY & SAR CO-PILOT TESTS ---');

  await connectDatabase();

  // 1. Seed dataset
  console.log('\n[Test 1] Seeding realistic transaction dataset...');
  await IngestionService.loadDemoDataset('test.ai-summary');

  // 2. Synchronize alerts for scoring
  console.log('\n[Test 2] Synchronizing alerts for risk factors...');
  await AlertService.syncAlerts(500);

  // 3. Generate on-demand AI investigation summary for ACC-HUB-CENTRAL
  const targetAccount = 'ACC-HUB-CENTRAL';
  console.log(`\n[Test 3] Generating AI Investigation Summary & SAR Narrative for '${targetAccount}'...`);
  const summary = await AIService.generateSummary(targetAccount);

  console.log(`✓ Test 3 Passed: Summary synthesized successfully.`);
  console.log(`  Model Used: ${summary.modelUsed}`);
  console.log(`  Guardrail Status: ${summary.guardrailStatus}`);
  console.log(`  Observed Facts Count: ${summary.observedFacts.length}`);
  console.log(`  System Inferences Count: ${summary.systemInferences.length}`);
  console.log(`  Recommended Actions: ${summary.recommendedActions.length}`);
  console.log(`  Executive Briefing snippet: "${summary.executiveSummary.substring(0, 100)}..."`);

  if (!summary.observedFacts || summary.observedFacts.length < 2) {
    throw new Error('Observed facts count must be at least 2');
  }
  if (!summary.systemInferences || summary.systemInferences.length < 1) {
    throw new Error('System inferences count must be at least 1');
  }
  if (!summary.sarNarrative || !summary.sarNarrative.fullNarrativeText.includes('PART I:')) {
    throw new Error('SAR narrative missing Part I header');
  }
  if (!summary.sarNarrative.fullNarrativeText.includes('PART IV:')) {
    throw new Error('SAR narrative missing Part IV header');
  }

  // 4. Test Case creation and AI Summary attachment
  console.log(`\n[Test 4] Opening case and attaching AI summary to formal case record...`);
  const createdCase = await CaseService.createCase({
    title: 'Syndicate Smurfing Hub Investigation',
    primaryAccountId: targetAccount,
    priority: 'CRITICAL',
    assignedInvestigatorName: 'Sarah Jenkins',
    initialNotes: 'Referral received from automated surveillance for structured layering.',
  });

  const attachedSummary = await AIService.generateSummary(
    targetAccount,
    createdCase.caseId,
    'Confidential informant report corroborates high-frequency pass-through activity.'
  );

  const updatedCase = await Case.findOne({ caseId: createdCase.caseId });
  if (!updatedCase) throw new Error('Case not found');
  if (!updatedCase.aiSummary) throw new Error('Case aiSummary not attached');

  console.log(`✓ Test 4 Passed: AI summary bound to Case ${createdCase.caseId}`);
  console.log(`  Case AI Summary Version: ${updatedCase.aiSummary.version}`);
  console.log(`  Observed Facts in Case: ${updatedCase.aiSummary.observedFacts?.length}`);
  console.log(`  System Inferences in Case: ${updatedCase.aiSummary.systemInferences?.length}`);
  console.log(`  SAR Narrative length: ${updatedCase.aiSummary.sarNarrative?.length} chars`);

  const auditLog = updatedCase.auditEvents.find((e) => e.details.includes('AI Forensic Summary'));
  if (!auditLog) throw new Error('Audit log missing entry for AI summary');
  console.log(`  Audit Log Entry: "${auditLog.details}" by ${auditLog.userName}`);

  // 5. Test version bump upon regeneration
  console.log(`\n[Test 5] Testing regeneration and version bumping...`);
  await AIService.generateSummary(targetAccount, createdCase.caseId, 'Updated notes after interview.');
  const reloadedCase = await Case.findOne({ caseId: createdCase.caseId });
  if (reloadedCase?.aiSummary?.version !== 2) {
    throw new Error(`Expected AI summary version 2, got ${reloadedCase?.aiSummary?.version}`);
  }
  console.log(`✓ Test 5 Passed: AI summary successfully bumped to version ${reloadedCase.aiSummary.version}`);

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 10 AI SUMMARY INTEGRATION TESTS PASSED PERFECTLY ---\n');
}

runAISummaryTests().catch(async (err) => {
  console.error('\n❌ PHASE 10 TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
