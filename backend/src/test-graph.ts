import { connectDatabase, disconnectDatabase } from './config/database';
import { IngestionService } from './services/ingestionService';
import { GraphService } from './services/graphService';

async function runGraphTests() {
  console.log('--- STARTING PHASE 7 GRAPH & RELATIONSHIP INTELLIGENCE INTEGRATION TESTS ---');

  await connectDatabase();

  // 1. Seed dataset
  console.log('\n[Test 1] Seeding 491-transaction dataset with embedded typologies...');
  await IngestionService.loadDemoDataset('test.graph');

  // 2. Query 2-hop ego-network around a known mule account
  const targetRoot = 'ACC-HUB-CENTRAL';
  console.log(`\n[Test 2] Extracting 2-hop ego-network around '${targetRoot}'...`);
  const graphData = await GraphService.getSubgraph({
    rootAccountId: targetRoot,
    hops: 2,
    includeDevices: true,
  });

  console.log(`✓ Test 2 Passed: Extracted graph with ${graphData.nodes.length} nodes and ${graphData.edges.length} edges.`);
  console.log('  Graph Metrics:', graphData.metrics);

  if (graphData.nodes.length < 5) throw new Error(`Expected at least 5 nodes, got ${graphData.nodes.length}`);
  if (graphData.edges.length < 5) throw new Error(`Expected at least 5 edges, got ${graphData.edges.length}`);

  // 3. Verify graph node invariants
  console.log('\n[Test 3] Verifying node invariants & root center...');
  const rootNode = graphData.nodes.find((n) => n.id === targetRoot);
  if (!rootNode) throw new Error(`Root node '${targetRoot}' not found in graph nodes`);
  if (!rootNode.isRoot) throw new Error(`Root node '${targetRoot}' is not marked as isRoot`);
  if (rootNode.type !== 'ACCOUNT') throw new Error(`Root node type is not ACCOUNT`);

  for (const node of graphData.nodes) {
    if (!node.id || !node.label || !node.type) {
      throw new Error(`Node ${node.id} missing basic properties`);
    }
    if (typeof node.riskScore !== 'number') {
      throw new Error(`Node ${node.id} missing risk score`);
    }
  }
  console.log(`✓ Test 3 Passed: Root node verified at center with valid forensic properties.`);

  // 4. Verify edge connectivity & directed transaction attributes
  console.log('\n[Test 4] Verifying edge connectivity and transaction volumes...');
  const nodeIds = new Set(graphData.nodes.map((n) => n.id));
  for (const edge of graphData.edges) {
    if (!nodeIds.has(edge.source)) throw new Error(`Edge source '${edge.source}' not in node list`);
    if (!nodeIds.has(edge.target)) throw new Error(`Edge target '${edge.target}' not in node list`);
    if (edge.type === 'TRANSACTION') {
      if (typeof edge.amount !== 'number' || edge.amount <= 0) {
        throw new Error(`Transaction edge ${edge.id} has invalid amount`);
      }
    }
  }
  console.log(`✓ Test 4 Passed: All ${graphData.edges.length} edges correctly connected within subgraph.`);

  await disconnectDatabase();
  console.log('\n--- ALL PHASE 7 GRAPH BACKEND INTEGRATION TESTS PASSED PERFECTLY ---');
  process.exit(0);
}

runGraphTests().catch(async (err) => {
  console.error('\n❌ GRAPH TEST FAILED:', err);
  await disconnectDatabase();
  process.exit(1);
});
