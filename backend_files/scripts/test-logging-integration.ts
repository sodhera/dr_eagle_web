#!/usr/bin/env tsx
/**
 * Integration test for the logging system.
 * Tests both Firestore and BigQuery writes.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { loadConfig } from '../src/config/env';
import { LoggingService } from '../src/app/logging/LoggingService';
import { createFirestoreLogger } from '../src/adapters/logging/FirestoreLogger';
import { createBigQueryLogger } from '../src/adapters/logging/BigQueryLogger';
import { BigQuery } from '@google-cloud/bigquery';

async function runTests() {
    console.log('🧪 Logging System Integration Test\n');

    // Initialize Firebase
    console.log('Initializing Firebase...');
    const serviceAccount = require('../audit-3a7ec-4313afabeaac.json');
    initializeApp({
        credential: cert(serviceAccount),
    });
    const firestore = getFirestore();
    console.log('✓ Firebase initialized\n');

    // Load config
    const config = loadConfig();
    console.log('Configuration:');
    console.log('  - Environment:', config.logging.environment);
    console.log('  - Version:', config.logging.version);
    console.log('  - Log Level:', config.logging.logLevel);
    console.log('  - Retention Days:', config.logging.retentionDays);
    console.log('  - BigQuery Project:', config.logging.bigQueryProjectId || '(not configured)');
    console.log('');

    // Initialize loggers
    const loggers = [
        createFirestoreLogger({
            firestore,
            retentionDays: config.logging.retentionDays,
        }),
    ];

    if (config.logging.bigQueryProjectId) {
        console.log('✓ BigQuery enabled');
        loggers.push(createBigQueryLogger({
            projectId: config.logging.bigQueryProjectId,
            datasetId: config.logging.bigQueryDatasetId,
            tableId: config.logging.bigQueryTableId,
        }));
    } else {
        console.log('⚠ BigQuery not configured (skipping BigQuery writes)');
    }

    const loggingService = new LoggingService({
        loggers,
        environment: config.logging.environment,
        version: config.logging.version,
        minLogLevel: config.logging.logLevel,
    });

    console.log('\n📝 Writing test logs...\n');

    const testUserId = 'test-user-' + Date.now();
    const testSessionId = 'test-session-' + Date.now();

    // Test 1: Session Start
    console.log('1. Testing session start log...');
    await loggingService.logSessionStart(testUserId, testSessionId, 'Test custom instructions');
    console.log('   ✓ Session start logged');

    // Test 2: Chat Message (User)
    console.log('2. Testing user message log...');
    await loggingService.logChatMessage(
        testUserId,
        testSessionId,
        'user',
        'What are the current Polymarket odds?'
    );
    console.log('   ✓ User message logged');

    // Test 3: MCP Invocation
    console.log('3. Testing MCP invocation log...');
    await loggingService.logMcpInvocation(
        testUserId,
        testSessionId,
        'get_market_odds',
        { marketId: 'test-market' },
        {
            success: true,
            data: { odds: 0.52 },
            durationMs: 123,
        }
    );
    console.log('   ✓ MCP invocation logged');

    // Test 4: Python Execution
    console.log('4. Testing Python execution log...');
    await loggingService.logPythonExecution(
        testUserId,
        testSessionId,
        'print("Hello, World!")',
        {
            success: true,
            output: 'Hello, World!',
            durationMs: 45,
        }
    );
    console.log('   ✓ Python execution logged');

    // Test 5: Chat Message (Assistant)
    console.log('5. Testing assistant message log...');
    await loggingService.logChatMessage(
        testUserId,
        testSessionId,
        'assistant',
        'The current odds are 52%',
        {
            toolCalls: [{
                id: 'call_123',
                toolName: 'get_market_odds',
                arguments: '{"marketId":"test-market"}',
            }],
        }
    );
    console.log('   ✓ Assistant message logged');

    // Test 6: Agent Action
    console.log('6. Testing agent action log...');
    await loggingService.logAgentAction(
        testUserId,
        testSessionId,
        'thinking',
        { thought: 'Analyzing market data' },
        'debug'
    );
    console.log('   ✓ Agent action logged');

    // Test 7: Session End
    console.log('7. Testing session end log...');
    await loggingService.logSessionEnd(testUserId, testSessionId, {
        totalMessages: 5,
        totalTools: 2,
    });
    console.log('   ✓ Session end logged');

    console.log('\n✅ All logs written successfully!\n');

    // Wait a bit then verify
    console.log('⏳ Waiting 3 seconds for writes to complete...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify Firestore
    console.log('🔍 Verifying Firestore writes...');
    const firestoreLogs = await firestore.collection('logs')
        .where('sessionId', '==', testSessionId)
        .orderBy('timestamp', 'asc')
        .get();

    console.log(`   Found ${firestoreLogs.size} logs in Firestore`);

    if (firestoreLogs.size > 0) {
        console.log('   Log types:');
        const logTypes = new Set<string>();
        firestoreLogs.forEach(doc => {
            logTypes.add(doc.data().logType);
        });
        logTypes.forEach(type => {
            const count = firestoreLogs.docs.filter(d => d.data().logType === type).length;
            console.log(`     - ${type}: ${count}`);
        });
        console.log('   ✓ Firestore verification passed');
    } else {
        console.error('   ✗ No logs found in Firestore!');
    }

    // Verify BigQuery
    if (config.logging.bigQueryProjectId) {
        console.log('\n🔍 Verifying BigQuery writes...');
        console.log('   ⏳ Waiting 10 seconds for BigQuery streaming buffer...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const bigquery = new BigQuery({ projectId: config.logging.bigQueryProjectId });
        const query = `
            SELECT logType, COUNT(*) as count
            FROM \`${config.logging.bigQueryProjectId}.${config.logging.bigQueryDatasetId}.${config.logging.bigQueryTableId}\`
            WHERE sessionId = @sessionId
            GROUP BY logType
            ORDER BY logType
        `;

        const [rows] = await bigquery.query({
            query,
            params: { sessionId: testSessionId },
        });

        if (rows.length > 0) {
            console.log(`   Found ${rows.length} log types in BigQuery:`);
            rows.forEach((row: any) => {
                console.log(`     - ${row.logType}: ${row.count}`);
            });
            console.log('   ✓ BigQuery verification passed');
        } else {
            console.error('   ✗ No logs found in BigQuery!');
            console.error('   Note: Streaming inserts can take up to 90 seconds to become queryable');
        }
    }

    console.log('\n✅ Integration test complete!\n');
    console.log('Test data:');
    console.log(`  - User ID: ${testUserId}`);
    console.log(`  - Session ID: ${testSessionId}`);
    console.log('\nYou can query these logs in Firebase Console or BigQuery.');

    process.exit(0);
}

runTests().catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
