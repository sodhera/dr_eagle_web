import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";
import { z } from "zod";
import { AuthError, AccessDeniedError, DomainError } from "../../src/core";
import {
  HttpRequestError,
  createHttpClient,
} from "../../src/adapters";
import { AuthService } from "../../src/app/auth";

import { loadConfig } from "../../src/config";

import { InMemorySecureVault, VaultService } from "../../src/app/security";
import { resolveMcpScopes } from "../../src/app/security/mcpScopes";
import { maybeHandleCorsOptions, setCors } from "./cors";

export { polymarketReadMcp } from "./polymarketMcp";
export { webSearchMcp } from "./webSearchMcp";
export { agent } from "../../src/entrypoints/agent";

admin.initializeApp();
setGlobalOptions({
  region: "us-central1",
  serviceAccount: "audit-3a7ec@appspot.gserviceaccount.com",
  memory: "512MiB",
  timeoutSeconds: 120,
});

const appConfig = loadConfig();
const sharedHttpClient = createHttpClient();
const authService = new AuthService(appConfig.auth);
const vaultService = new VaultService(new InMemorySecureVault());


// Removed polymarketScrapeDaily - keeping only issueMcpToken and polymarketReadMcp

const tokenRequestSchema = z.object({
  idToken: z.string().min(1),
  scopes: z.array(z.string().min(1)).optional(),
});

export const issueMcpToken = onRequest({ region: "us-central1" }, async (req, res) => {
  setCors(res);
  if (maybeHandleCorsOptions(req, res)) return;

  try {
    if (req.method !== "POST") {
      res.set("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const parsed = tokenRequestSchema.parse(parseRequestBody(req.body));
    const decoded = await admin
      .auth()
      .verifyIdToken(parsed.idToken)
      .catch((error) => {
        throw new AuthError("Invalid Firebase ID token", { cause: error });
      });

    const role = appConfig.auth.adminUserIds.has(decoded.uid) ? "admin" : "user";
    const scopes = resolveMcpScopes(parsed.scopes, role);
    const issued = authService.issueToken({
      clientId: appConfig.auth.clientId,
      clientSecret: appConfig.auth.clientSecret,
      userId: decoded.uid,
      role,
      scopes,
    });

    return res.status(200).json({ token: issued.token, claims: issued.claims });
  } catch (error) {
    return handleHttpsError(res, error);
  }
});



function parseRequestBody(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new DomainError("Invalid JSON body", { cause: error });
    }
  }
  if (body === undefined || body === null) {
    return {};
  }
  return body;
}

function handleHttpsError(res: any, error: unknown) {
  if (error instanceof AuthError) {
    return res.status(401).json({ error: error.message });
  }
  if (error instanceof AccessDeniedError) {
    return res.status(403).json({ error: error.message });
  }
  if (error instanceof DomainError) {
    return res.status(400).json({ error: error.message });
  }
  if (error instanceof HttpRequestError) {
    return res.status(error.status ?? 502).json({ error: error.message, upstreamStatus: error.status });
  }
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid request", issues: error.issues });
  }

  logger.error("Unhandled error in issueMcpToken", { error });
  return res.status(500).json({ error: "Internal server error" });
}
