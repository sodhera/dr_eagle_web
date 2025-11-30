import * as admin from 'firebase-admin';

const serviceAccount = require('../audit-3a7ec-4313afabeaac.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function main() {
    const firestore = admin.firestore();

    console.log('Fetching recent search_web tool invocations with errors...\n');

    const logsRef = firestore.collection('logs');
    // Simplified query to avoid index requirement
    const snapshot = await logsRef
        .limit(100)
        .get();

    if (snapshot.empty) {
        console.log('No logs found.');
        return;
    }

    let foundCount = 0;
    snapshot.forEach(doc => {
        const data = doc.data();

        // Filter in memory
        if (data.type === 'mcp_tool_invocation' && data.toolName === 'search_web') {
            foundCount++;
            if (foundCount > 3) return;

            const timestamp = new Date(data.timestamp).toISOString();
            console.log(`\n=== [${timestamp}] ===`);
            console.log(`Tool: ${data.toolName}`);
            console.log(`Input:`, JSON.stringify(data.input, null, 2));
            console.log(`Success: ${data.result?.success || false}`);

            if (data.result?.error) {
                console.log(`\n**ERROR MESSAGE:**`);
                console.log(data.result.error);
            }

            if (data.result?.data) {
                console.log(`\nData (truncated):`, JSON.stringify(data.result.data, null, 2).substring(0, 300));
            }

            console.log('\n' + '='.repeat(60));
        }
    });
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
