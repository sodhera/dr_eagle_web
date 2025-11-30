import { promises as fs } from "node:fs";
import path from "node:path";
import { Firestore } from "firebase-admin/firestore";

export interface SyncOptions {
    baseDir: string;
    rootDocId?: string;
}

interface FileRecord {
    relativePath: string;
    content: string;
}

const DEFAULT_ROOT_DOC_ID = "developer_docs";
const EXCLUDED_EXTENSIONS = new Set([".py"]);
const BATCH_LIMIT = 450;

export async function syncSystemDocs(firestore: Firestore, options: SyncOptions): Promise<void> {
    const rootDocId = options.rootDocId ?? DEFAULT_ROOT_DOC_ID;
    const files = await collectFiles(options.baseDir);
    const baseDocRef = firestore.collection("system_docs").doc(rootDocId);
    const existing = await fetchExistingFiles(baseDocRef);

    const newMap = new Map<string, string>(files.map((f) => [normalizePath(f.relativePath), f.content]));
    const ops: Array<{ type: "set"; ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
    const deletes: FirebaseFirestore.DocumentReference[] = [];

    for (const file of files) {
        const normalizedPath = normalizePath(file.relativePath);
        const { fileRef, folderRefs } = resolveFileRef(baseDocRef, normalizedPath);
        const existingFile = existing.get(normalizedPath);

        for (const folder of folderRefs) {
            ops.push({
                type: "set",
                ref: folder.ref,
                data: { name: folder.name, path: folder.path, updatedAt: new Date() },
            });
        }

        if (!existingFile || existingFile.content !== file.content) {
            ops.push({
                type: "set",
                ref: fileRef,
                data: { path: normalizedPath, content: file.content, updatedAt: new Date() },
            });
        }
    }

    for (const [pathKey, existingFile] of existing.entries()) {
        if (!newMap.has(pathKey)) {
            deletes.push(existingFile.ref);
        }
    }

    await commitInBatches(firestore, ops, deletes);
}

async function collectFiles(baseDir: string): Promise<FileRecord[]> {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const records: FileRecord[] = [];

    for (const entry of entries) {
        const entryPath = path.join(baseDir, entry.name);
        const relativePath = path.relative(baseDir, entryPath);

        if (entry.isDirectory()) {
            const nested = await collectFiles(entryPath);
            records.push(...nested.map((item) => ({ ...item, relativePath: path.join(entry.name, item.relativePath) })));
            continue;
        }

        if (EXCLUDED_EXTENSIONS.has(path.extname(entry.name))) {
            continue;
        }

        const content = await fs.readFile(entryPath, "utf8");
        records.push({ relativePath, content });
    }

    return records;
}

function toDocId(relativePath: string): string {
    return relativePath.replace(/[^\w.-]/g, "_");
}

function resolveFileRef(baseDocRef: FirebaseFirestore.DocumentReference, relativePath: string): {
    fileRef: FirebaseFirestore.DocumentReference;
    folderRefs: Array<{ ref: FirebaseFirestore.DocumentReference; name: string; path: string }>;
} {
    const normalizedPath = normalizePath(relativePath);
    const segments = normalizedPath.split("/");
    const fileName = segments.pop();
    if (!fileName) {
        throw new Error(`Invalid relative path: ${relativePath}`);
    }

    let current = baseDocRef;
    const folders: Array<{ ref: FirebaseFirestore.DocumentReference; name: string; path: string }> = [];
    let prefix: string[] = [];

    for (const segment of segments) {
        prefix.push(segment);
        const folderPath = prefix.join("/");
        const folderRef = current.collection("folders").doc(toDocId(segment));
        folders.push({ ref: folderRef, name: segment, path: folderPath });
        current = folderRef;
    }

    const fileRef = current.collection("files").doc(toDocId(fileName));
    return { fileRef, folderRefs: folders };
}

function normalizePath(p: string): string {
    return p.split(path.sep).join("/");
}

interface ExistingFile {
    ref: FirebaseFirestore.DocumentReference;
    content: string | null;
}

async function fetchExistingFiles(
    baseDocRef: FirebaseFirestore.DocumentReference,
    prefix: string[] = []
): Promise<Map<string, ExistingFile>> {
    const results = new Map<string, ExistingFile>();

    const filesSnapshot = await baseDocRef.collection("files").get();
    for (const doc of filesSnapshot.docs) {
        const data = doc.data();
        const pathParts = [...prefix, data.path ?? doc.id];
        const fullPath = normalizePath(pathParts.join("/"));
        results.set(fullPath, { ref: doc.ref, content: typeof data.content === "string" ? data.content : null });
    }

    const foldersSnapshot = await baseDocRef.collection("folders").get();
    for (const folderDoc of foldersSnapshot.docs) {
        const data = folderDoc.data();
        const folderName = data.name ?? folderDoc.id;
        const nestedPrefix = [...prefix, folderName];
        const nested = await fetchExistingFiles(folderDoc.ref, nestedPrefix);
        nested.forEach((value, key) => results.set(key, value));
    }

    return results;
}

async function commitInBatches(
    firestore: Firestore,
    sets: Array<{ type: "set"; ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }>,
    deletes: FirebaseFirestore.DocumentReference[]
): Promise<void> {
    const chunks: Array<() => void> = [];
    let currentBatch = firestore.batch();
    let opCount = 0;

    const flush = () => {
        if (opCount === 0) return;
        const batchToCommit = currentBatch;
        chunks.push(() => batchToCommit.commit());
        currentBatch = firestore.batch();
        opCount = 0;
    };

    for (const op of sets) {
        currentBatch.set(op.ref, op.data, { merge: true });
        opCount += 1;
        if (opCount >= BATCH_LIMIT) flush();
    }

    for (const ref of deletes) {
        currentBatch.delete(ref);
        opCount += 1;
        if (opCount >= BATCH_LIMIT) flush();
    }

    flush();

    for (const commit of chunks) {
        await commit();
    }
}
