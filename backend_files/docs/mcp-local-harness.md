# Local MCP test harness

Purpose: a disposable, **untracked** static page for manual Polymarket MCP testing (auth + tool calls) without touching the backend. Lives at `local-mcp-harness/` in the repo root and should stay out of git.

Usage
- Make sure you have Firebase Auth test users ready.
- One-command run with local + cloud logs in the same terminal:  
  - `./local-mcp-harness/run-with-logs.sh` (uses `PORT=5011`, `PROJECT=audit-3a7ec`, `REGION=us-central1`; override via env vars). This starts the harness server and streams `issueMcpToken` + `polymarketReadMcp` logs from both Cloud Run revisions and Cloud Function resources; output includes resource/service/function and full JSON entries. It auto-installs `gcloud beta` tail if missing, auto-detects service names, and runs both live tail (`[cloud-tail]`) and 10s polling (`[cloud-poll]`) so logs always appear even if tailing is silent.
- In the page (defaults prefilled for `audit-3a7ec` project + functions base URL):
  1) Enter Firebase config (apiKey, authDomain, projectId, appId) for the desired environment (prefilled for prod).
  2) Set/confirm `Functions Base URL` (defaults to `https://us-central1-audit-3a7ec.cloudfunctions.net`; you can swap in the Cloud Run URL).
  3) Sign in with email/password or Google (Firebase Auth).
  4) Click “Issue MCP token” (pick scopes); the harness logs request/response to both the UI and the server terminal via `/client-log`.
  5) Click “Fetch tools”, select a tool, provide JSON input (token auto-injected), and run the call; results/errors appear in the UI and terminal logs (cloud function logs stream with `[cloud:*]` prefixes).

Security/constraints
- Do **not** commit this folder; it is for local/manual testing only.
- Never paste secrets other than Firebase public config and your own credentials; MCP token issuance still requires a real Firebase ID token.
- Keep rate limits in mind; the harness sends direct MCP requests to production unless you point it at the emulator.
