import OpenAI from 'openai';
import { Agent, AgentStreamEvent } from '../../core/agent/Agent';
import { ChatSession, Message, ToolRegistry, ToolCall } from '../../core/agent/types';
import { LoggingService } from '../../app/logging/LoggingService';

export class OpenAIAdapter implements Agent {
    private client: OpenAI;
    private model: string;
    private loggingService?: LoggingService;

    constructor(apiKey: string, model: string = 'gpt-4.1-nano', loggingService?: LoggingService) {
        this.client = new OpenAI({ apiKey });
        this.model = model;
        this.loggingService = loggingService;
    }

    async processMessage(
        session: ChatSession,
        userMessage: string,
        toolRegistry: ToolRegistry
    ): Promise<ChatSession> {
        // 1. Prepare messages
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: this.buildSystemPrompt(session) },
            ...session.messages.map(m => this.mapToOpenAIMessage(m)),
            { role: 'user', content: userMessage }
        ];

        // Add the new user message to the session immediately (optimistic/tracking)
        const newUserMsg: Message = {
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        const updatedSession = {
            ...session,
            messages: [...session.messages, newUserMsg],
            updatedAt: Date.now()
        };

        // Log user message
        await this.loggingService?.logChatMessage(
            session.userId,
            session.id,
            'user',
            userMessage
        );

        // 2. Tool definitions
        const tools = [
            ...toolRegistry.getTools().map(t => ({
                type: 'function' as const,
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            })),
            {
                type: 'function' as const,
                function: {
                    name: RENDER_WIDGET_TOOL.name,
                    description: RENDER_WIDGET_TOOL.description,
                    parameters: RENDER_WIDGET_TOOL.parameters
                }
            }
        ];

        let currentMessages = [...messages];
        let turnCount = 0;
        const MAX_TURNS = 10; // Prevent infinite loops

        while (turnCount < MAX_TURNS) {
            turnCount++;

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
            });

            const choice = response.choices[0];
            const message = choice.message;

            // Add assistant message to our tracking array
            currentMessages.push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
                // Handle tool calls - filter for 'function' type to satisfy TS
                const functionToolCalls = message.tool_calls.filter(tc => tc.type === 'function');

                if (functionToolCalls.length > 0) {
                    const toolCalls: ToolCall[] = functionToolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments
                        }
                    }));

                    // Add assistant message with tool calls to session
                    updatedSession.messages.push({
                        role: 'assistant',
                        content: message.content || '',
                        toolCalls: toolCalls,
                        timestamp: Date.now()
                    });

                    // Log assistant message with tool calls
                    await this.loggingService?.logChatMessage(
                        session.userId,
                        session.id,
                        'assistant',
                        message.content || '',
                        {
                            toolCalls: toolCalls.map(tc => ({
                                id: tc.id,
                                toolName: tc.function.name,
                                arguments: tc.function.arguments,
                            })),
                        }
                    );

                    // Execute tools
                    for (const tc of functionToolCalls) {
                        const tool = toolRegistry.getTool(tc.function.name);
                        let result = 'Error: Tool not found';
                        const startTime = Date.now();
                        let toolSuccess = false;
                        let toolError: string | undefined;

                        if (tc.function.name === 'render_polymarket_widget') {
                            // Mock execution for frontend widget tool
                            result = JSON.stringify({ status: "success", message: "Widget data sent to frontend" });
                            toolSuccess = true;
                        } else if (tool) {
                            try {
                                const args = JSON.parse(tc.function.arguments);
                                const output = await tool.execute(args, { userId: session.userId });
                                result = JSON.stringify(output);
                                toolSuccess = true;
                            } catch (e: any) {
                                result = `Error executing tool: ${e.message}`;
                                toolError = e.message;
                            }
                        } else {
                            toolError = 'Tool not found';
                        }

                        const durationMs = Date.now() - startTime;

                        // Log MCP tool invocation
                        await this.loggingService?.logMcpInvocation(
                            session.userId,
                            session.id,
                            tc.function.name,
                            JSON.parse(tc.function.arguments || '{}'),
                            {
                                success: toolSuccess,
                                data: toolSuccess ? JSON.parse(result) : undefined,
                                error: toolError,
                                durationMs,
                            }
                        );

                        // Add tool result to OpenAI messages
                        currentMessages.push({
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: result
                        });

                        // Add tool result to session
                        updatedSession.messages.push({
                            role: 'tool',
                            content: result,
                            toolCallId: tc.id,
                            timestamp: Date.now()
                        });
                    }
                } else {
                    // If no function calls (e.g. only custom tools we don't handle), just treat as text response
                    updatedSession.messages.push({
                        role: 'assistant',
                        content: message.content || '',
                        timestamp: Date.now()
                    });

                    // Log assistant message
                    await this.loggingService?.logChatMessage(
                        session.userId,
                        session.id,
                        'assistant',
                        message.content || ''
                    );

                    return updatedSession;
                }
            } else {
                // Final response
                updatedSession.messages.push({
                    role: 'assistant',
                    content: message.content || '',
                    timestamp: Date.now()
                });

                // Log final assistant response
                await this.loggingService?.logChatMessage(
                    session.userId,
                    session.id,
                    'assistant',
                    message.content || ''
                );

                return updatedSession;
            }
        }

        throw new Error('Max turns exceeded');
    }

    async *processMessageStream(
        session: ChatSession,
        userMessage: string,
        toolRegistry: ToolRegistry
    ): AsyncGenerator<AgentStreamEvent, ChatSession, unknown> {
        // 1. Prepare messages
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: this.buildSystemPrompt(session) },
            ...session.messages.map(m => this.mapToOpenAIMessage(m)),
            { role: 'user', content: userMessage }
        ];

        // Optimistic session update
        const newUserMsg: Message = {
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        const updatedSession = {
            ...session,
            messages: [...session.messages, newUserMsg],
            updatedAt: Date.now()
        };

        // Log user message
        await this.loggingService?.logChatMessage(session.userId, session.id, 'user', userMessage);

        // 2. Tool definitions
        const tools = [
            ...toolRegistry.getTools().map(t => ({
                type: 'function' as const,
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters
                }
            })),
            {
                type: 'function' as const,
                function: {
                    name: RENDER_WIDGET_TOOL.name,
                    description: RENDER_WIDGET_TOOL.description,
                    parameters: RENDER_WIDGET_TOOL.parameters
                }
            }
        ];

        let currentMessages = [...messages];
        let turnCount = 0;
        const MAX_TURNS = 10;

        while (turnCount < MAX_TURNS) {
            turnCount++;

            const stream = await this.client.chat.completions.create({
                model: this.model,
                messages: currentMessages,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
            });

            let accumulatedContent = '';
            let accumulatedToolCalls: Record<number, { name: string; args: string; id: string }> = {};

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                // Handle Content
                if (delta.content) {
                    accumulatedContent += delta.content;
                    yield { type: 'content', delta: delta.content };
                }

                // Handle Tool Calls
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const index = tc.index;
                        if (!accumulatedToolCalls[index]) {
                            accumulatedToolCalls[index] = { name: '', args: '', id: '' };
                        }
                        if (tc.id) accumulatedToolCalls[index].id = tc.id;
                        if (tc.function?.name) accumulatedToolCalls[index].name = tc.function.name;
                        if (tc.function?.arguments) accumulatedToolCalls[index].args += tc.function.arguments;
                    }
                }
            }

            // End of stream for this turn
            const toolCalls = Object.values(accumulatedToolCalls);

            if (toolCalls.length > 0) {
                // We have tool calls
                const toolCallObjects: ToolCall[] = toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: { name: tc.name, arguments: tc.args }
                }));

                // Add assistant message with tool calls
                currentMessages.push({
                    role: 'assistant',
                    content: accumulatedContent || null,
                    tool_calls: toolCalls.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: tc.args }
                    }))
                });

                updatedSession.messages.push({
                    role: 'assistant',
                    content: accumulatedContent,
                    toolCalls: toolCallObjects,
                    timestamp: Date.now()
                });

                // Execute tools
                for (const tc of toolCalls) {
                    yield { type: 'tool_start', toolCallId: tc.id, name: tc.name };

                    const tool = toolRegistry.getTool(tc.name);
                    let result = 'Error: Tool not found';

                    if (tc.name === 'render_polymarket_widget') {
                        result = JSON.stringify({ status: "success", message: "Widget data sent to frontend" });
                    } else if (tool) {
                        try {
                            const args = JSON.parse(tc.args);
                            const output = await tool.execute(args, { userId: session.userId });
                            result = JSON.stringify(output);
                        } catch (e: any) {
                            result = `Error executing tool: ${e.message}`;
                        }
                    }

                    yield { type: 'tool_end', toolCallId: tc.id, result };

                    // Add tool result to messages
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: tc.id,
                        content: result
                    });

                    updatedSession.messages.push({
                        role: 'tool',
                        content: result,
                        toolCallId: tc.id,
                        timestamp: Date.now()
                    });
                }
            } else {
                // Final response
                updatedSession.messages.push({
                    role: 'assistant',
                    content: accumulatedContent,
                    timestamp: Date.now()
                });

                // Log final response
                await this.loggingService?.logChatMessage(
                    session.userId,
                    session.id,
                    'assistant',
                    accumulatedContent
                );

                yield { type: 'done', session: updatedSession };
                return updatedSession;
            }
        }

        throw new Error('Max turns exceeded');
    }

    async complete(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
        });
        return response.choices[0].message.content || '';
    }

    private buildSystemPrompt(session: ChatSession): string {
        const basePrompt = `You are a helpful AI assistant for the DREAGLE platform.
You have access to real-time market data and tools.
Always use the provided tools to answer questions about markets, prices, or user data.
Do not hallucinate market data.

# TOOL USAGE GUIDELINES:
- **Polymarket/Market Data**: Use \`polymarket\` tools (search_markets, list_events, etc.) for anything related to prediction markets, odds, betting, or crypto prices.
- **Web Search**: Use \`web_search\` for general knowledge, current events, news, or context NOT related to specific Polymarket markets.
  - Example: "What happened in the debate today?" -> \`web_search\`
  - Example: "Who is leading the election market?" -> \`polymarket\` tools
  - Example: "Find markets about AI" -> \`polymarket\` tools

# CRITICAL INSTRUCTION: RICH WIDGETS
You possess a special tool called \`render_polymarket_widget\`.
You MUST use this tool whenever the user asks for:
- Market odds or probabilities
- Event details or status
- Predictions for a specific event
- "Show me the market for X"

## RULES FOR USING render_polymarket_widget:
1. **MANDATORY USAGE**: If the user query implies looking at a market, you MUST call this tool. Do not just describe the odds in text.
2. **NO RAW JSON IN TEXT**: Never output the widget JSON in your text response. Only use the tool call.
3. **EXACT SCHEMA**: You must populate the tool arguments exactly as defined in the schema.
   - Ensure \`instrument.metrics\` and \`outcomes\` are populated with real data from your other tools or context.
   - If exact historical data for the chart is missing, provide a reasonable estimate or a single point.
4. **SCENARIO**:
   - User: "What are the odds for the US Election?"
   - You: Call \`render_polymarket_widget\` with the election data. Text response: "Here is the latest data for the US Election."

Failure to call this tool when market data is requested is a critical failure.`;

        if (session.customInstructions) {
            return `${basePrompt}\n\nUser Custom Instructions:\n${session.customInstructions}`;
        }
        return basePrompt;
    }

    private mapToOpenAIMessage(m: Message): OpenAI.Chat.Completions.ChatCompletionMessageParam {
        if (m.role === 'tool') {
            return {
                role: 'tool',
                tool_call_id: m.toolCallId!,
                content: m.content
            };
        }

        if (m.role === 'user') {
            return { role: 'user', content: m.content };
        }

        if (m.role === 'assistant') {
            const msg: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
                role: 'assistant',
                content: m.content || null
            };
            if (m.toolCalls && m.toolCalls.length > 0) {
                msg.tool_calls = m.toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                    }
                }));
            }
            return msg;
        }

        return { role: 'system', content: m.content };
    }
}

const RENDER_WIDGET_TOOL = {
    name: "render_polymarket_widget",
    description: "Renders a rich interactive widget for a Polymarket event. Use this tool whenever the user asks for market data, odds, or predictions for a specific event. Do not output raw JSON in the text response; use this tool instead.",
    parameters: {
        "type": "object",
        "properties": {
            "schema_version": { "type": "string", "enum": ["1.0"] },
            "widget_type": { "type": "string", "enum": ["polymarket_instrument_chart"] },
            "instrument": {
                "type": "object",
                "properties": {
                    "entity_type": { "type": "string" },
                    "id": { "type": "string" },
                    "slug": { "type": "string" },
                    "title": { "type": "string" },
                    "url": { "type": "string" },
                    "category": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "status": { "type": "string" },
                    "created_at": { "type": "string" },
                    "end_time": { "type": "string" },
                    "resolution": {
                        "type": "object",
                        "properties": {
                            "resolved": { "type": "boolean" },
                            "resolution_time": { "type": ["string", "null"] },
                            "winning_outcome_id": { "type": ["string", "null"] },
                            "source": { "type": ["string", "null"] }
                        }
                    },
                    "metrics": {
                        "type": "object",
                        "properties": {
                            "base_currency": { "type": "string" },
                            "total_volume_usd": { "type": "number" },
                            "open_interest_usd": { "type": "number" },
                            "liquidity_usd": { "type": "number" },
                            "num_traders": { "type": "number" }
                        }
                    }
                },
                "required": ["title", "metrics"]
            },
            "chart": {
                "type": "object",
                "properties": {
                    "granularity": { "type": "string" },
                    "from": { "type": "string" },
                    "to": { "type": "string" },
                    "timezone": { "type": "string" }
                }
            },
            "outcomes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "outcome_id": { "type": "string" },
                        "label": { "type": "string" },
                        "token_address": { "type": "string" },
                        "color_hint": { "type": "integer" },
                        "current_price": { "type": "number" },
                        "current_probability": { "type": "number" },
                        "price_24h_ago": { "type": "number" },
                        "price_24h_change_abs": { "type": "number" },
                        "price_24h_change_pct": { "type": "number" },
                        "volume_24h_usd": { "type": "number" },
                        "is_winner": { "type": "boolean" },
                        "is_tradable": { "type": "boolean" }
                    },
                    "required": ["outcome_id", "label", "current_price", "current_probability"]
                }
            },
            "series": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "outcome_id": { "type": "string" },
                        "points": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "t": { "type": "number", "description": "Timestamp in ms" },
                                    "p": { "type": "number", "description": "Probability (0-1)" },
                                    "v": { "type": "number", "description": "Volume" }
                                },
                                "required": ["t", "p"]
                            }
                        }
                    },
                    "required": ["outcome_id", "points"]
                }
            }
        },
        "required": ["schema_version", "widget_type", "instrument", "outcomes", "series"]
    }
};
