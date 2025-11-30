import { Firestore } from "@google-cloud/firestore";
import { User } from "../../core/user/types";

export class FirestoreUserAdapter {
    private readonly collection = "users";

    constructor(private readonly firestore: Firestore) { }

    async getUser(userId: string): Promise<User | null> {
        const doc = await this.firestore.collection(this.collection).doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data() as User;
    }

    async updateUserMemory(userId: string, memory: string): Promise<void> {
        const userRef = this.firestore.collection(this.collection).doc(userId);
        await userRef.set({
            memory,
            updatedAt: Date.now()
        }, { merge: true });
    }
}
