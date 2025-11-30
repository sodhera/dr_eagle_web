import path from "node:path";
import admin from "firebase-admin";
import { syncSystemDocs } from "../firebase/systemDocsSync";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

async function main(): Promise<void> {
  const projectId = requireEnv("FIREBASE_PROJECT_ID", "audit-3a7ec");
  const baseDir = path.resolve(process.cwd(), "Polymarket_dev_docs");

  admin.initializeApp({ projectId });

  await syncSystemDocs(admin.firestore(), { baseDir });
  console.log(`Synced system_docs/developer_docs from ${baseDir} into project ${projectId}`);
}

main().catch((error) => {
  console.error("Failed to sync system_docs", error);
  process.exit(1);
});
