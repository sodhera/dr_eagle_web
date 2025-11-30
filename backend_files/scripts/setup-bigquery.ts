#!/usr/bin/env tsx
/**
 * Script to set up BigQuery dataset and table for logging.
 * Run this once before deploying the logging system.
 */

import { BigQuery } from '@google-cloud/bigquery';

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID || process.env.GCP_PROJECT;
const DATASET_ID = process.env.BIGQUERY_DATASET_ID || 'logs';
const TABLE_ID = process.env.BIGQUERY_TABLE_ID || 'activity';

async function setupBigQuery() {
    if (!PROJECT_ID) {
        console.error('Error: BIGQUERY_PROJECT_ID or GCP_PROJECT environment variable not set');
        process.exit(1);
    }

    console.log(`Setting up BigQuery for project: ${PROJECT_ID}`);
    const bigquery = new BigQuery({ projectId: PROJECT_ID });

    // Create dataset if it doesn't exist
    console.log(`\nChecking dataset: ${DATASET_ID}...`);
    const [datasets] = await bigquery.getDatasets();
    const datasetExists = datasets.some(ds => ds.id === DATASET_ID);

    if (!datasetExists) {
        console.log(`Creating dataset: ${DATASET_ID}...`);
        await bigquery.createDataset(DATASET_ID, {
            location: 'US',
        });
        console.log(`✓ Dataset created: ${DATASET_ID}`);
    } else {
        console.log(`✓ Dataset already exists: ${DATASET_ID}`);
    }

    const dataset = bigquery.dataset(DATASET_ID);

    // Create table if it doesn't exist
    console.log(`\nChecking table: ${TABLE_ID}...`);
    const [tables] = await dataset.getTables();
    const tableExists = tables.some(t => t.id === TABLE_ID);

    if (!tableExists) {
        console.log(`Creating table: ${TABLE_ID}...`);

        const schema = [
            // Common fields
            { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            { name: 'userId', type: 'STRING', mode: 'REQUIRED' },
            { name: 'sessionId', type: 'STRING', mode: 'REQUIRED' },
            { name: 'logType', type: 'STRING', mode: 'REQUIRED' },
            { name: 'level', type: 'STRING', mode: 'REQUIRED' },
            { name: 'environment', type: 'STRING', mode: 'REQUIRED' },
            { name: 'version', type: 'STRING', mode: 'REQUIRED' },
            { name: 'metadata', type: 'STRING', mode: 'NULLABLE' },

            // Chat-specific fields
            { name: 'chat_role', type: 'STRING', mode: 'NULLABLE' },
            { name: 'chat_content', type: 'STRING', mode: 'NULLABLE' },
            { name: 'chat_messageId', type: 'STRING', mode: 'NULLABLE' },
            { name: 'chat_toolCalls', type: 'STRING', mode: 'NULLABLE' },
            { name: 'chat_toolCallId', type: 'STRING', mode: 'NULLABLE' },

            // MCP-specific fields
            { name: 'mcp_toolName', type: 'STRING', mode: 'NULLABLE' },
            { name: 'mcp_arguments', type: 'STRING', mode: 'NULLABLE' },
            { name: 'mcp_result', type: 'STRING', mode: 'NULLABLE' },
            { name: 'mcp_error', type: 'STRING', mode: 'NULLABLE' },
            { name: 'mcp_durationMs', type: 'INTEGER', mode: 'NULLABLE' },
            { name: 'mcp_success', type: 'BOOLEAN', mode: 'NULLABLE' },

            // Python-specific fields
            { name: 'python_code', type: 'STRING', mode: 'NULLABLE' },
            { name: 'python_inputData', type: 'STRING', mode: 'NULLABLE' },
            { name: 'python_output', type: 'STRING', mode: 'NULLABLE' },
            { name: 'python_error', type: 'STRING', mode: 'NULLABLE' },
            { name: 'python_durationMs', type: 'INTEGER', mode: 'NULLABLE' },
            { name: 'python_success', type: 'BOOLEAN', mode: 'NULLABLE' },

            // Agent-specific fields
            { name: 'agent_action', type: 'STRING', mode: 'NULLABLE' },
            { name: 'agent_details', type: 'STRING', mode: 'NULLABLE' },

            // Session-specific fields
            { name: 'session_customInstructions', type: 'STRING', mode: 'NULLABLE' },
            { name: 'session_totalMessages', type: 'INTEGER', mode: 'NULLABLE' },
            { name: 'session_totalTools', type: 'INTEGER', mode: 'NULLABLE' },
        ];

        await dataset.createTable(TABLE_ID, {
            schema,
            timePartitioning: {
                type: 'DAY',
                field: 'timestamp',
                // No automatic expiration (keep forever) - expirationMs is optional
            },
        });

        console.log(`✓ Table created: ${TABLE_ID}`);
        console.log(`  - Partitioned by timestamp (daily)`);
        console.log(`  - No automatic expiration (permanent storage)`);
    } else {
        console.log(`✓ Table already exists: ${TABLE_ID}`);
    }

    console.log(`\n✅ BigQuery setup complete!`);
    console.log(`\nNext steps:`);
    console.log(`1. Grant BigQuery permissions to your Firebase service account:`);
    console.log(`   gcloud projects add-iam-policy-binding ${PROJECT_ID} \\`);
    console.log(`     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@${PROJECT_ID}.iam.gserviceaccount.com" \\`);
    console.log(`     --role="roles/bigquery.dataEditor"`);
    console.log(`\n2. Add environment variables to .env.local:`);
    console.log(`   BIGQUERY_PROJECT_ID=${PROJECT_ID}`);
    console.log(`   BIGQUERY_DATASET_ID=${DATASET_ID}`);
    console.log(`   BIGQUERY_TABLE_ID=${TABLE_ID}`);
    console.log(`\n3. Deploy your functions with logging enabled`);
}

setupBigQuery().catch(error => {
    console.error('Error setting up BigQuery:', error);
    process.exit(1);
});
