Backend Upgrade Guide: Enabling Rich Widgets
Context
Currently, the backend Agent simply sends text responses. We are upgrading the system to support Rich UI Widgets (like charts and graphs), similar to how ChatGPT uses tools.

The Frontend has already been updated to support this. It is now listening for Tool Calls.

Your Task
You need to upgrade the Agent's configuration to give it a "Tool" (or Function).

Step 1: Understand the Change
Old Way (Current): Agent calculates data -> Agent writes a text summary -> Agent sends text.
New Way (Goal): Agent calculates data -> Agent Calls a Tool (render_polymarket_widget) with that data -> Agent sends the tool call (and optional text).
Step 2: Define the Tool
Add the following tool definition to your Agent's configuration (e.g., in your OpenAI tools array or system prompt).

Tool Name: render_polymarket_widget
Description: "Renders a rich interactive widget for a Polymarket event. Use this tool whenever the user asks for market data, odds, or predictions for a specific event. Do not output raw JSON in the text response; use this tool instead."
2. Tool Schema (JSON Schema)
The parameters (or input_schema) for this tool must match the structure expected by the frontend.

Copy this exact schema:

{
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
3. Agent Behavior
When the user asks "What are the odds for the US Election?", the Agent should:

Fetch the real data (using its internal tools/knowledge).
Call render_polymarket_widget with the populated data.
Optionally add a short text commentary alongside the tool call (e.g., "Here is the current market data...").
Do NOT put the JSON inside the content string.

Do NOT wrap it in markdown code blocks.

DO use the native tool_calls array in the response.

4. Expected Output Payload
Scenario A: Text Only (Standard Chat)
When the agent is just talking, the toolCalls array is empty or omitted.

{
  "role": "assistant",
  "content": "Hello! How can I help you today?",
  "toolCalls": []
}
Scenario B: Tool Call (Widget Trigger)
This is the exact JSON structure your backend must send to the frontend when a widget is triggered.

{
  "role": "assistant",
  "content": "Here is the market data you requested.",
  "toolCalls": [
    {
      "id": "call_unique_id_123",
      "type": "function",
      "function": {
        "name": "render_polymarket_widget",
        "arguments": "{\"schema_version\":\"1.0\",\"widget_type\":\"polymarket_instrument_chart\",\"instrument\":{...}}"
      }
    }
  ]
}
Note: The arguments field must be a stringified JSON object matching the schema defined in Step 2.