import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express from "express";
import { ChatService } from "../app/agent/ChatService";
import { OpenAIAdapter } from "../adapters/openai/OpenAIAdapter";
import { FirestoreChatRepository } from "../adapters/firestore/ChatRepository";
import { InternalToolRegistry } from "../adapters/mcp/InternalToolRegistry";
import { AuthService, parseBearerToken } from "../app/auth";
import { loadConfig } from "../config";
import { LoggingService } from "../app/logging/LoggingService";
import { createFirestoreLogger } from "../adapters/logging/FirestoreLogger";
import { createBigQueryLogger } from "../adapters/logging/BigQueryLogger";
import { FirestoreTrackingStore } from "../adapters/tracking/FirestoreTrackingStore";
import { TrackingService } from "../app/tracking/TrackingService";
import { createTrackingMcpServer } from "../mcp/tracking";

// Initialize admin if not already
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const config = loadConfig();
const authService = new AuthService(config.auth);

// Initialize Logging Service
const loggers = [
    createFirestoreLogger({
        firestore: admin.firestore(),
        retentionDays: config.logging.retentionDays,
    }),
];

// Add BigQuery logger if configured
if (config.logging.bigQueryProjectId) {
    loggers.push(createBigQueryLogger({
        projectId: config.logging.bigQueryProjectId,
        datasetId: config.logging.bigQueryDatasetId,
        tableId: config.logging.bigQueryTableId,
    }));
}

const loggingService = new LoggingService({
    loggers,
    environment: config.logging.environment,
    version: config.logging.version,
    minLogLevel: config.logging.logLevel,
});

// Dependencies - now with logging
const openAIAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY || "", "gpt-4.1-nano", loggingService);
const chatRepo = new FirestoreChatRepository(admin.firestore());
const toolRegistry = new InternalToolRegistry();

// Tracking System
import { createHttpClient } from "../adapters/http/httpClient";
import { TrackingDataFetcher } from "../adapters/tracking/TrackingDataFetcher";

import { createGoogleNewsRssServer } from "../mcp/google-news-rss";

// Tracking System
const trackingStore = new FirestoreTrackingStore(admin.firestore());
const httpClient = createHttpClient();
const trackingFetcher = new TrackingDataFetcher(httpClient);
const trackingService = new TrackingService(trackingStore, trackingFetcher, loggingService, openAIAdapter);
const trackingMcp = createTrackingMcpServer({ authService, trackingService });
const googleNewsMcp = createGoogleNewsRssServer(authService);

// Register Tracking Tools
Object.entries(trackingMcp.tools).forEach(([name, tool]) => {
    toolRegistry.registerTool({
        name,
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args, context) => {
            return tool.handler({ ...args, token: `mock_token_${context.userId}` });
        }
    });
});

// Register Google News Tools
Object.entries(googleNewsMcp.tools).forEach(([name, tool]) => {
    toolRegistry.registerTool({
        name,
        description: tool.description,
        parameters: tool.inputSchema,
        execute: async (args, context) => {
            return tool.handler({ ...args, token: `mock_token_${context.userId}` });
        }
    });
});

// Web Search System - Lazy initialization
import { createWebSearchServer } from "../mcp/web-search";

// Register Web Search Tools with lazy initialization
// Web search server is created at runtime (when tools are first executed)
// to ensure OPENAI_API_KEY is available from Firebase secrets
let webSearchMcpInstance: ReturnType<typeof createWebSearchServer> | null = null;

function getWebSearchMcp() {
    if (!webSearchMcpInstance) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY not available at runtime');
        }
        webSearchMcpInstance = createWebSearchServer(authService, apiKey);
    }
    return webSearchMcpInstance;
}

// Register tools with lazy execution
toolRegistry.registerTool({
    name: 'search_web',
    description: "Search the web using OpenAI's search capabilities.",
    parameters: {
        type: "object",
        properties: {
            query: { type: "string" },
            maxResults: { type: "number" },
            freshnessHours: { type: "number" },
            region: { type: "string" },
            includeAnswers: { type: "boolean" }
        },
        required: ["query"]
    },
    execute: async (args, context) => {
        const webSearchMcp = getWebSearchMcp();

        // Issue a valid internal token for the tool execution
        const { token } = authService.issueToken({
            clientId: config.auth.clientId,
            clientSecret: config.auth.clientSecret,
            userId: context.userId,
            role: 'user'
        });

        return webSearchMcp.tools.search_web.handler({ ...args, token });
    }
});

toolRegistry.registerTool({
    name: 'get_search_capabilities',
    description: "Get the capabilities and configuration of the search tool.",
    parameters: {
        type: "object",
        properties: {}
    },
    execute: async (args, context) => {
        const webSearchMcp = getWebSearchMcp();

        // Issue a valid internal token for the tool execution
        const { token } = authService.issueToken({
            clientId: config.auth.clientId,
            clientSecret: config.auth.clientSecret,
            userId: context.userId,
            role: 'user'
        });

        return webSearchMcp.tools.get_search_capabilities.handler({ ...args, token });
    }
});

const chatService = new ChatService(openAIAdapter, chatRepo, toolRegistry, loggingService);

const app = express();
app.use(express.json());

// Auth Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const token = parseBearerToken(req.headers.authorization);
        const context = authService.authenticate(token);
        (req as any).user = context.claims;
        next();
    } catch (error: any) {
        res.status(401).json({ error: error.message || "Unauthorized" });
    }
};

app.use(authenticate);

// POST /chat
// Body: { message: string, sessionId?: string }
app.post("/chat", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { message, sessionId } = req.body;

        if (!message && !sessionId) {
            // If just starting a chat without a message
            const session = await chatService.startChat(userId);
            res.json(session);
            return;
        }

        if (sessionId) {
            // Continue existing chat
            const session = await chatService.sendMessage(sessionId, userId, message || "");
            res.json(session);
        } else {
            // Start new chat with message
            const session = await chatService.startChat(userId, message);
            res.json(session);
        }
    } catch (error: any) {
        console.error("Error in POST /chat:", error);
        res.status(500).json({ error: error.message });
    }
});

// POST /chat/stream
// Body: { message: string, sessionId?: string }
app.post("/chat/stream", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { message, sessionId } = req.body;

        if (!message) {
            res.status(400).json({ error: "Message is required for streaming" });
            return;
        }

        let targetSessionId = sessionId;
        if (!targetSessionId) {
            // Create new session if none provided
            const session = await chatService.startChat(userId);
            targetSessionId = session.id;
            // Send initial session ID event
            res.write(`data: ${JSON.stringify({ type: 'session_start', sessionId: targetSessionId })}\n\n`);
        }

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const event of chatService.streamMessage(targetSessionId, userId, message)) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        res.end();
    } catch (error: any) {
        console.error("Error in POST /chat/stream:", error);
        // If headers sent, write error event
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// GET /sessions
app.get("/sessions", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

        const sessions = await chatService.listUserSessions(userId, limit);
        res.json(sessions);
    } catch (error: any) {
        console.error("Error in GET /sessions:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /chat/:sessionId
app.get("/chat/:sessionId", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { sessionId } = req.params;

        const session = await chatService.getChat(sessionId, userId);
        res.json(session);
    } catch (error: any) {
        console.error("Error in GET /chat/:sessionId:", error);
        res.status(404).json({ error: error.message }); // Assuming 404 if not found/auth error
    }
});

// DELETE /chat/:sessionId
app.delete("/chat/:sessionId", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { sessionId } = req.params;
        await chatService.deleteSession(sessionId, userId);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Error in DELETE /chat/:sessionId:", error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /chat/:sessionId
app.patch("/chat/:sessionId", async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { sessionId } = req.params;
        const { title } = req.body;
        if (!title) {
            res.status(400).json({ error: "Title is required" });
            return;
        }
        const session = await chatService.renameSession(sessionId, userId, title);
        res.json(session);
    } catch (error: any) {
        console.error("Error in PATCH /chat/:sessionId:", error);
        res.status(500).json({ error: error.message });
    }
});

export const agent = onRequest({
    secrets: ["OPENAI_API_KEY"],
    cors: true
}, app);
