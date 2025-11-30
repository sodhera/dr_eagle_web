import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { maybeHandleCorsOptions, setCors } from "./cors";
import { createWebSearchServer } from "../../src/mcp/web-search";
import { AuthService } from "../../src/app/auth";
import { loadConfig } from "../../src/config";
import { DomainError } from "../../src/core";

const appConfig = loadConfig();
const authService = new AuthService(appConfig.auth);

const toolCallSchema = z.object({
    tool: z.string(),
    input: z.record(z.unknown()),
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

export const webSearchMcp = onRequest({
    region: "us-central1",
    secrets: ["OPENAI_API_KEY"]
}, async (req, res) => {
    logger.info("webSearchMcp called", { method: req.method, path: req.path, url: req.url });

    setCors(res);
    if (maybeHandleCorsOptions(req, res)) return;

    try {
        // Initialize server with API key from secret
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            logger.error("OPENAI_API_KEY secret not found");
            res.status(500).json({ error: "Configuration error" });
            return;
        }

        const server = createWebSearchServer(authService, openaiApiKey);
        const tools = Object.entries(server.tools).map(([name, tool]) => ({
            name,
            ...tool
        }));

        // Handle GET - list available tools
        if (req.method === "GET") {
            logger.info("Returning tools list");
            res.status(200).json({
                tools: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                })),
            });
            return;
        }

        // Handle POST - invoke a tool
        if (req.method === "POST") {
            logger.info("Handling POST request");
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ error: "Unauthorized: Bearer token required" });
                return;
            }

            const parsed = toolCallSchema.parse(parseRequestBody(req.body));
            const tool = tools.find((t) => t.name === parsed.tool);

            if (!tool) {
                res.status(404).json({ error: `Tool not found: ${parsed.tool}` });
                return;
            }

            // Pass the token in args for the handler to verify
            const args = { ...parsed.input, token: authHeader.split(" ")[1] };
            const result = await tool.handler(args);

            res.status(200).json(result);
            return;
        }

        // Unsupported method
        logger.warn("Unsupported method", { method: req.method });
        res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        logger.error("webSearchMcp error", { error, path: req.path, method: req.method });

        if (error instanceof z.ZodError) {
            res.status(400).json({ error: "Invalid request", issues: error.issues });
            return;
        }

        if (error instanceof DomainError) {
            res.status(400).json({ error: error.message });
            return;
        }

        res.status(500).json({ error: "Internal server error" });
    }
});
