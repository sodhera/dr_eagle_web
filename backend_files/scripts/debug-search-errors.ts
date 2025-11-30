import { Firestore } from '@google-cloud/firestore';

async function main() {
    const firestore = new Firestore();

    console.log('Querying recent search_web tool invocations...\n');

    const logsRef = firestore.collection('logs');
    const snapshot = await logsRef
        .where('type', '==', 'mcp_tool_invocation')
        .where('toolName', '==', 'search_web')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

    if (snapshot.empty) {
        console.log('No search_web invocations found.');
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`[${new Date(data.timestamp).toISOString()}]`);
        console.log(`  Tool: ${data.toolName}`);
        console.log(`  Args:`, JSON.stringify(data.input, null, 2));
        console.log(`  Success: ${data.result?.success}`);
        if (data.result?.error) {
            console.log(`  Error: ${data.result.error}`);
        }
        if (data.result?.data) {
            console.log(`  Data:`, JSON.stringify(data.result.data, null, 2).substring(0, 200));
        }
        console.log('---\n');
    });
}

main().catch(console.error);
