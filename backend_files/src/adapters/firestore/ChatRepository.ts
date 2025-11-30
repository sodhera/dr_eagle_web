import * as admin from 'firebase-admin';
import { ChatSession } from '../../core/agent/types';

export class FirestoreChatRepository {
    private collection = 'agent_chats';

    constructor(private db: admin.firestore.Firestore) { }

    async createSession(userId: string): Promise<ChatSession> {
        const ref = this.db.collection(this.collection).doc();
        const session: ChatSession = {
            id: ref.id,
            userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            customInstructions: '',
            widgets: {}
        };
        await ref.set(session);
        return session;
    }

    async getSession(sessionId: string): Promise<ChatSession | null> {
        const doc = await this.db.collection(this.collection).doc(sessionId).get();
        if (!doc.exists) return null;
        return doc.data() as ChatSession;
    }

    async updateSession(session: ChatSession): Promise<void> {
        await this.db.collection(this.collection).doc(session.id).set(session);
    }

    async getUserSessions(userId: string, limit: number = 20): Promise<ChatSession[]> {
        // Note: This query requires a composite index on [userId, updatedAt DESC] in Firestore.
        // If the index is missing, this will throw an error with a link to create it.
        const snapshot = await this.db.collection(this.collection)
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => doc.data() as ChatSession);
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.db.collection(this.collection).doc(sessionId).delete();
    }
}
