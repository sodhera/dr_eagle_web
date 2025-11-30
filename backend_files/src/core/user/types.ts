export interface User {
    id: string;
    email: string;
    memory: string; // "Personal instructions"
    createdAt: number;
    updatedAt: number;
}

export interface UpdateMemoryRequest {
    memory: string;
}
