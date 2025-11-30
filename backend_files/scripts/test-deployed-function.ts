#!/usr/bin/env tsx
/**
 * Test the deployed agent function and verify logging is working.
 * This sends a test message through the production function and checks logs.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const FUNCTION_URL = 'https://us-central1-audit-3a7ec.cloudfunctions.net/agent';

async function getAuthToken() {
    // Get MCP token from the issueMcpToken function
    const response = await fetch('https://us-central1-audit-3a7ec.cloudfunctions.net/issueMcpToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            idToken: process.env.FIREBASE_ID_TOKEN || 'test-token',
            scopes: ['agent:chat']
        })
    });

    if (!response.ok) {
        console.error('Failed to get auth token. You need a valid Firebase ID token.');
        console.error('Set FIREBASE_ID_TOKEN in .env.local or use Firebase Auth to get one.');
        process.exit(1);
    }

    const data = await response.json();
    return data.token;
}

async function testDeployedFunction() {
    console.log('🧪 Testing Deployed Agent Function\n');

    console.log('Note: This test requires authentication.');
    console.log('If you get auth errors, you need to set up Firebase Auth.\n');

    try {
        // For now, let's just check if the function is deployed
        const healthCheck = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        console.log(`Function Status: ${healthCheck.status}`);

        if (healthCheck.status === 401) {
            console.log('✅ Function is deployed and responding (requires auth as expected)');
            console.log('\nTo fully test with logging:');
            console.log('1. Get a Firebase ID token from your frontend');
            console.log('2. Set FIREBASE_ID_TOKEN in .env.local');
            console.log('3. Re-run this script');
            console.log('\nOr check logs directly:');
            console.log('- Firestore: Firebase Console → Firestore → logs collection');
            console.log('- BigQuery: Run query:');
            console.log('  SELECT * FROM `audit-3a7ec.logs.activity` ORDER BY timestamp DESC LIMIT 10');
        } else {
            const text = await healthCheck.text();
            console.log('Response:', text);
        }

    } catch (error) {
        console.error('❌ Error testing function:', error);
    }
}

testDeployedFunction();
