import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('../audit-3a7ec-4313afabeaac.json');
initializeApp({ credential: cert(serviceAccount) });

const firestore = getFirestore();

async function checkRecentLogs() {
    const now = Date.now();
    const thirtyMinutesAgo = now - (30 * 60 * 1000);

    console.log(`Checking logs since ${new Date(thirtyMinutesAgo).toISOString()}...`);

    const snapshot = await firestore.collection('logs')
        .where('timestamp', '>=', thirtyMinutesAgo)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    console.log(`Found ${snapshot.size} logs.\n`);

    snapshot.forEach(doc => {
        const data = doc.data();
        const time = new Date(data.timestamp).toISOString();

        if (data.logType === 'mcpInvocation') {
            console.log(`[${time}] MCP: ${data.toolName}`);
            console.log(`  Args: ${JSON.stringify(data.arguments)}`);
            console.log(`  Success: ${data.success}`);
            if (data.error) {
                console.log(`  Error: ${data.error}`);
            }
            console.log('');
        } else if (data.logType === 'chat' && data.role === 'user') {
            console.log(`[${time}] USER: ${data.content}`);
            console.log('');
        }
    });
}

checkRecentLogs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
