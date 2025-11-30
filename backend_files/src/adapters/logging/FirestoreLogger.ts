import { Firestore } from 'firebase-admin/firestore';
import { Logger, LogEntry } from '../../core/logging/types';

export interface FirestoreLoggerConfig {
    firestore: Firestore;
    collectionName?: string; // Default: 'logs'
    retentionDays: number; // TTL in days
}

/**
 * Remove undefined values from an object recursively.
 * Firestore doesn't allow undefined values.
 */
function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }

    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }

    return obj;
}

/**
 * Firestore logger adapter for writing structured logs.
 * Logs are stored in a single collection with an auto-expiration field.
 */
export function createFirestoreLogger(config: FirestoreLoggerConfig): Logger {
    const collectionName = config.collectionName || 'logs';
    const collection = config.firestore.collection(collectionName);

    return {
        async log(entry: LogEntry): Promise<void> {
            try {
                // Calculate expiration timestamp (TTL)
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + config.retentionDays);

                // Add log entry with TTL field, removing undefined values
                const docData = removeUndefined({
                    ...entry,
                    expiresAt: expiresAt.toISOString(),
                    createdAt: new Date(entry.timestamp).toISOString(),
                });

                await collection.add(docData);
            } catch (error) {
                // Log to Cloud Logging but don't throw (logging failures should not break app)
                console.error('[FirestoreLogger] Failed to write log:', error);
                console.error('[FirestoreLogger] Log entry:', JSON.stringify(entry));
            }
        }
    };
}
