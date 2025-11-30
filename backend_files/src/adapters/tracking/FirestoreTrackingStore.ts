import * as admin from 'firebase-admin';
import { Tracker, Subscription, Snapshot, TrackerRun, TrackerId, UserId, NotificationRecord } from '../../core/tracking/types';

export class FirestoreTrackingStore {
    private trackersColl = 'trackers';
    private runsColl = 'tracker_runs'; // Subcollection or root? Plan says /trackers/{id}/runs/{runId}
    private notificationsColl = 'tracker_notifications';

    constructor(private db: admin.firestore.Firestore) { }

    getFirestore(): admin.firestore.Firestore {
        return this.db;
    }

    // --- Trackers ---

    async createTracker(tracker: Tracker): Promise<void> {
        await this.db.collection(this.trackersColl).doc(tracker.id).set(tracker);
    }

    async getTracker(trackerId: TrackerId): Promise<Tracker | null> {
        const doc = await this.db.collection(this.trackersColl).doc(trackerId).get();
        if (!doc.exists) return null;
        return doc.data() as Tracker;
    }

    async updateTracker(tracker: Tracker): Promise<void> {
        await this.db.collection(this.trackersColl).doc(tracker.id).set(tracker, { merge: true });
    }

    async listTrackers(userId: UserId): Promise<Tracker[]> {
        // Find trackers where user is owner OR has a subscription
        // For Session 1, let's just query by ownerId for simplicity, 
        // and maybe a separate query for subscriptions if needed.
        const ownerQuery = await this.db.collection(this.trackersColl)
            .where('ownerId', '==', userId)
            .get();

        const trackers = ownerQuery.docs.map(d => d.data() as Tracker);

        // TODO: Add shared trackers via subscription lookup
        return trackers;
    }

    async listAllActiveTrackers(): Promise<Tracker[]> {
        const snap = await this.db.collection(this.trackersColl)
            .where('status', '==', 'active')
            .get();
        return snap.docs.map(d => d.data() as Tracker);
    }

    // --- Subscriptions ---

    async addSubscription(sub: Subscription): Promise<void> {
        await this.db.collection(this.trackersColl).doc(sub.trackerId)
            .collection('subscriptions').doc(sub.userId).set(sub);
    }

    async getSubscription(trackerId: TrackerId, userId: UserId): Promise<Subscription | null> {
        const doc = await this.db.collection(this.trackersColl).doc(trackerId)
            .collection('subscriptions').doc(userId).get();
        if (!doc.exists) return null;
        return doc.data() as Subscription;
    }

    async listSubscriptions(trackerId: TrackerId): Promise<Subscription[]> {
        const snap = await this.db.collection(this.trackersColl).doc(trackerId)
            .collection('subscriptions').get();
        return snap.docs.map(d => d.data() as Subscription);
    }

    // --- Runs & Snapshots ---

    async saveRun(run: TrackerRun): Promise<void> {
        await this.db.collection(this.trackersColl).doc(run.trackerId)
            .collection('runs').doc(run.id).set(run);
    }

    async getLastRun(trackerId: TrackerId): Promise<TrackerRun | null> {
        const snap = await this.db.collection(this.trackersColl).doc(trackerId)
            .collection('runs')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snap.empty) return null;
        return snap.docs[0].data() as TrackerRun;
    }

    async saveSnapshot(snapshot: Snapshot): Promise<void> {
        // Snapshots might be large, maybe store in a separate root collection or subcollection
        // Plan says: /trackers/{trackerId}/runs/{runId} has snapshot hash.
        // We probably want to store the full snapshot somewhere.
        // Let's store it in a root 'tracker_snapshots' collection for now to avoid deep nesting issues if we want to query.
        // Or just subcollection 'snapshots'.
        await this.db.collection(this.trackersColl).doc(snapshot.trackerId)
            .collection('snapshots').doc(snapshot.timestamp.toString()).set(snapshot);
    }

    async getLastSnapshot(trackerId: TrackerId): Promise<Snapshot | null> {
        const snap = await this.db.collection(this.trackersColl).doc(trackerId)
            .collection('snapshots')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (snap.empty) return null;
        return snap.docs[0].data() as Snapshot;
    }

    // --- Notifications ---

    async saveNotificationRecord(record: NotificationRecord): Promise<void> {
        await this.db.collection(this.notificationsColl).doc(record.id).set(record);
    }
}
