import http, { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import { z } from "zod";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import {
  createHttpClient,
  HttpRequestError,
} from "../adapters";
import { AuthError, AccessDeniedError, DomainError } from "../core";
import { AuthService, parseBearerToken } from "../app/auth";

import { loadConfig } from "../config";
import { createWebSearchServer } from "../mcp/web-search";
import { Firestore } from "@google-cloud/firestore";
import { FirestoreUserAdapter } from "../adapters/firestore/UserAdapter";
import { UserService } from "../app/user/UserService";

const config = loadConfig();
const httpClient = createHttpClient();
const authService = new AuthService(config.auth);
const webSearchServer = createWebSearchServer(authService, config.openai.apiKey);

// Initialize Firestore and UserService
const firestore = new Firestore();
const userAdapter = new FirestoreUserAdapter(firestore);
const userService = new UserService(userAdapter);

const port = config.port;

const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { status: "ok", uptime: process.uptime() });
    }

    if (req.method === "POST" && url.pathname === "/oauth/token") {
      const body = await readJsonBody(req);
      const parsed = tokenRequestSchema.parse(body);
      const issued = authService.issueToken(parsed);
      return sendJson(res, 200, { token: issued.token, claims: issued.claims });
    }

    // Web Search MCP Endpoints
    if (req.method === "GET" && url.pathname === "/mcp/web-search/tools") {
      return sendJson(res, 200, await webSearchServer.tools.get_search_capabilities.handler({ token: parseBearerToken(req.headers.authorization) }));
    }

    if (req.method === "POST" && url.pathname === "/mcp/web-search/run") {
      const body = await readJsonBody(req) as any;
      const toolName = body.tool;
      const args = body.args || {};
      args.token = parseBearerToken(req.headers.authorization);

      if (toolName === "web_search") {
        return sendJson(res, 200, await webSearchServer.tools.search_web.handler(args));
      }

      if (toolName === "get_search_capabilities") {
        return sendJson(res, 200, await webSearchServer.tools.get_search_capabilities.handler(args));
      }

      return sendJson(res, 400, { error: `Unknown tool: ${toolName}` });
    }



    // Memory Feature Endpoints
    // GET /users/:userId/memory
    if (req.method === "GET" && url.pathname.match(/^\/users\/[^/]+\/memory$/)) {
      const userId = url.pathname.split("/")[2];
      // Auth check
      const token = parseBearerToken(req.headers.authorization);
      const context = authService.authenticate(token);
      if (context.claims.userId !== userId && context.claims.role !== "admin") {
        return sendJson(res, 403, { error: "Access denied" });
      }

      const memory = await userService.getUserMemory(userId);
      return sendJson(res, 200, { memory });
    }

    // POST /users/:userId/memory
    if (req.method === "POST" && url.pathname.match(/^\/users\/[^/]+\/memory$/)) {
      const userId = url.pathname.split("/")[2];
      const token = parseBearerToken(req.headers.authorization);
      const context = authService.authenticate(token);

      if (context.claims.userId !== userId && context.claims.role !== "admin") {
        return sendJson(res, 403, { error: "Access denied" });
      }

      const body = await readJsonBody(req) as { memory: string };
      if (typeof body.memory !== 'string') {
        return sendJson(res, 400, { error: "Invalid body: memory must be a string" });
      }

      await userService.updateMemory(userId, body.memory);
      return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    handleError(error, res);
  }
});

server.listen(port, () => {
  console.log(`HTTP server listening on port ${port}`);
});

const tokenRequestSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  userId: z.string(),
  role: z.enum(["user", "admin"]).optional(),
  tier: z.enum(["free", "paid"]).optional(),
  scopes: z.array(z.string()).optional(),
});



async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new DomainError("Invalid JSON body", { cause: error });
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}



function handleError(error: unknown, res: ServerResponse): void {
  if (error instanceof AuthError) {
    return sendJson(res, 401, { error: error.message });
  }
  if (error instanceof AccessDeniedError) {
    return sendJson(res, 403, { error: error.message });
  }
  if (error instanceof DomainError) {
    return sendJson(res, 400, { error: error.message });
  }
  if (error instanceof HttpRequestError) {
    return sendJson(res, error.status ?? 502, { error: error.message, upstreamStatus: error.status });
  }

  console.error("Unhandled error", error);
  return sendJson(res, 500, { error: "Internal server error" });
}
