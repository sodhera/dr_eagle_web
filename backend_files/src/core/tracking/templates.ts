
export const PYTHON_TEMPLATES: Record<string, string> = {
    'basic_threshold': `
# Basic Threshold Analysis
# Input: items (list of dicts), changes (list of dicts)
# Output: print JSON with triggered, summary, footnote

import json

items = locals().get('items', [])
changes = locals().get('changes', [])

triggered = False
summary = "No significant changes."

if len(changes) > 0:
    triggered = True
    summary = f"Detected {len(changes)} changes."

print(json.dumps({
    "triggered": triggered,
    "summary": summary,
    "footnote": "Basic Threshold Analysis"
}))
`,
    'price_movement': `
# Price Movement Analysis
# Detects if price moved by more than X%
import json

items = locals().get('items', [])
changes = locals().get('changes', [])

triggered = False
summary = "Price stable."

# Example logic (assuming items have 'price' field)
# This is a placeholder for actual logic
if len(changes) > 0:
    triggered = True
    summary = "Price changed."

print(json.dumps({
    "triggered": triggered,
    "summary": summary,
    "footnote": "Price Movement Analysis"
}))
`
};

export const PROMPT_TEMPLATES: Record<string, string> = {
    'default_persona': `
You are a Tracker AI. Analyze the following data changes for a tracker.
Tracker Target: {{TARGET}}
Current Items: {{ITEMS}}
Changes: {{CHANGES}}

Determine if this is noteworthy based on the user's persona.
Return a JSON object: { "triggered": boolean, "summary": "string", "footnote": "string" }
`,
    'crypto_trader': `
You are a Crypto Trading Assistant. Analyze the market data changes.
Focus on volatility, volume spikes, and price breakouts.
Tracker Target: {{TARGET}}
Current Items: {{ITEMS}}
Changes: {{CHANGES}}

Return a JSON object: { "triggered": boolean, "summary": "string", "footnote": "string" }
`
};
