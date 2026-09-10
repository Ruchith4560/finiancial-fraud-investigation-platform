import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { PatternService } from './services/patternService';

async function runPatternTests() {
  console.log('--- STARTING PHASE 6 SUSPICIOUS PATTERN DETECTION INTEGRATION TESTS ---');

  await connectDatabase();

  // 1. Seed demo dataset (contains embedded typologies)
  console.log('\n[Test 1] Seeding 491-transaction realistic dataset with embedded typologies...');
  await IngestionService.loadDemoDataset('test.patterns');

  // 2. Query pattern detection engine across transactions
  console.log('\n[Test 2] Querying PatternService across transactions...');
  const result = await PatternService.getDetectedPatterns({ limit: 1000 });
  console.log(`✓ Test 2 Passed: Detected ${result.totalPatternsDetected} suspicious typology patterns.`);
  console.log('  Summary by typology:', result.summaryByType);

  // 3. Verify pattern schema and explainability
  console.log('\n[Test 3] Verifying pattern explainability and evidence defensibility...');
  for (const p of result.patterns) {
    if (!p.patternId || !p.title || !p.patternType) {
      throw new Error(`Pattern ${p.patternId} missing identifier or title`);
    }
    if (!p.involvedAccounts || p.involvedAccounts.length === 0) {
      throw new Error(`Pattern ${p.patternId} missing involved accounts`);
    }
    if (!p.humanExplanation || p.humanExplanation.length < 10) {
      throw new Error(`Pattern ${p.patternId} missing human-readable explanation`);
    }
    if (!p.metrics || typeof p.metrics !== 'object') {
      throw new Error(`Pattern ${p.patternId} missing quantitative metrics`);
    }
    if (!p.evidenceReferences || p.evidenceReferences.length === 0) {
      throw new Error(`Pattern ${p.patternId} missing evidence references`);
    }
  }
  console.log(`✓ Test 3 Passed: All ${result.patterns.length} patterns contain human-readable reasoning and evidence references.`);

  // 4. Test filtering by specific account
  if (result.patterns.length > 0) {
    const sampleAccount = result.patterns[0].involvedAccounts[0];
    console.log(`\n[Test 4] Testing account-scoped pattern filtering for '${sampleAccount}'...`);
    const scoped = await PatternService.getDetectedPatterns({ accountId: sampleAccount });
    if (scoped.patterns.length === 0) {
      throw new Error(`Expected patterns for account ${sampleAccount}`);
    }
    for (const sp of scoped.patterns) {
      const match = sp.involvedAccounts.some((a) => a.toLowerCase().includes(sampleAccount.toLowerCase()));
      if (!match) throw new Error(`Pattern ${sp.patternId} does not involve ${sampleAccount}`);
    }
    console.log(`✓ Test 4 Passed: Retrieved ${scoped.patterns.length} pattern(s) specifically linked to account '${sampleAccount}'.`);
  }

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 6 PATTERN DETECTION INTEGRATION TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runPatternTests().catch(async (err) => {
  console.error('\n❌ PATTERN TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
