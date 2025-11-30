# Python Code Execution Function

This directory contains a Python Cloud Function for executing arbitrary Python code in a sandboxed environment.

## Files

- `main.py` - Cloud Function HTTP endpoint
- `sandbox.py` - Sandboxing utilities (import restrictions, safe environment)
- `requirements.txt` - Python dependencies

## Security Model

### Import Restrictions
Only whitelisted modules can be imported:
- `json`, `math`, `datetime`, `statistics`, `itertools`, `functools`, `collections`, `re`, `string`, `random`

Blacklisted modules that raise `ImportError`:
- `os`, `subprocess`, `socket`, `sys`, `importlib`, File system and network modules

### Execution Environment
- No file system access
- No network access  
- Restricted builtins (no `eval`, `exec`, `compile`, `open`)
- Timeout: 30 seconds (Cloud Function config)
- Memory limit: 512MB

### Audit Logging
All executions logged to Cloud Functions logs with:
- Timestamp
- Execution result (success/failure)
- Execution time

## Deployment

### Prerequisites
```bash
# Install Google Cloud CLI
# Configure Firebase project
firebase login
```

### Deploy Function
```bash
cd python-functions
gcloud functions deploy execute-python-code \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --timeout 30s \
  --memory 512MB \
  --entry-point execute_python_code \
  --source .
```

### Get Function URL
```bash
gcloud functions describe execute-python-code --format='value(httpsTrigger.url)'
```

### Configure MCP Server
Add the function URL to your environment:
```bash
# .env.local
PYTHON_EXECUTION_FUNCTION_URL=https://us-central1-your-project.cloudfunctions.net/execute-python-code
```

## Testing Locally

### Install Dependencies
```bash
cd python-functions
pip install -r requirements.txt
```

### Run Locally
```bash
functions-framework --target=execute_python_code --debug
```

### Test Request
```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Python!\")\nprint(sum([1,2,3,4,5]))",
    "input_data": {}
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello from Python!\n15\n",
  "error": null,
  "execution_time_ms": 12
}
```

## Usage via MCP

Once deployed and configured, use the `execute-python-code` MCP tool:

```typescript
{
  "tool": "execute-python-code",
  "arguments": {
    "token": "<auth-token>",
    "code": "result = sum(range(100))\nprint(f'Sum: {result}')",
    "input_data": {}
  }
}
```

## Rate Limiting

Executions are rate limited per user:
- **Default**: 10 executions per hour
- **Admin**: No limit (bypasses rate limiter)

## Cost Estimation

- **Per execution**: ~$0.0000004 (400GB-seconds @ $0.0000025/GB-s)
- **1000 executions/day**: ~$0.012/day = **$0.36/month**
- **10,000 executions/day**: ~$0.12/day = **$3.60/month**

Note: Costs vary based on execution time. 30s timeout is worst case.
