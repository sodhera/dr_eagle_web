import { FirestoreUserAdapter } from "../../adapters/firestore/UserAdapter";
import { User } from "../../core/user/types";

export class UserService {
    constructor(private readonly userAdapter: FirestoreUserAdapter) { }

    async getUserMemory(userId: string): Promise<string> {
        const user = await this.userAdapter.getUser(userId);
        return user?.memory || "";
    }

    async updateMemory(userId: string, memory: string): Promise<void> {
        await this.userAdapter.updateUserMemory(userId, memory);
    }
}
